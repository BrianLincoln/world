import * as THREE from 'three';
import { hashInt, mulberry32 } from '../core/rng';
import { TERRAIN_U } from '../gfx/materials';
import { SEA_LEVEL, type WorldGen } from '../world/worldgen';
import { makeNoose, Rope } from './rope';
import type { Flock, Mob, MobCtx, PlayerView, Species } from './types';

// Keeps the sky and fields populated: a few crow flocks that roam between
// foraging spots, and floof flocks that pass by now and then. Flocks aren't
// tied to places; they come in from beyond view and are dropped once they
// wander far off. Runs their brains, draws them through the species' part
// batches, and owns the lasso and the leads. Creatures are ambient life, not
// world generation: they're random per session, not tied to the world seed.

// Just past draw range (460 m): flocks you've left behind drop out unseen and
// newcomers arrive wherever you are.
const DESPAWN_R = 500;
const DRAW_R = 460;
/** Lasso reach (m). */
export const LASSO_RANGE = 24;
const LEAD_RANGE = 9;
const MOUNT_RANGE = 3.6;
const LEASH_LEN = 5.2;
const TAME_TIME = 1.8;


export interface Aim {
  mob: Mob;
  action: 'lasso' | 'lead' | 'unlead';
}

interface Throw {
  mob: Mob;
  t: number;
  dur: number;
  rope: Rope;
}

export class Mobs {
  readonly group = new THREE.Group();
  readonly settings = {
    enabled: true,
    /** Multiplies how many flocks are around. */
    density: 1,
    /** Crow flocks kept within range. */
    crowFlocks: 3,
    /** Floof flocks at once, and seconds between arrivals. */
    floofFlocks: 2,
    floofEvery: [25, 80] as [number, number],
    /** Seconds between crow fly-overs (a flock crossing over your head). */
    crowPassEvery: [45, 80] as [number, number],
    /** Debug: brains paused, animation runs. */
    freeze: false,
  };
  readonly flocks = new Map<string, Flock>();
  readonly tamed: Mob[] = [];
  private spawnT = 0;
  private age = 0;
  private nextId = 0;
  private rnd: () => number;
  /** Seconds until each species may launch another flock. */
  private cooldown: Record<string, number> = {};
  private ropes = new Map<Mob, Rope>();
  private throwing: Throw | null = null;
  private noose = makeNoose();
  private frustum = new THREE.Frustum();
  private pm = new THREE.Matrix4();
  private sphere = new THREE.Sphere();
  aim: Aim | null = null;
  stats = { mobs: 0, drawn: 0, flocks: 0 };
  /** Mob that just became tamed this frame (for UI / sound hooks). */
  onTamed?: (m: Mob) => void;

  /** A fresh random stream each session (not the world seed). */
  private session = (Math.random() * 4294967296) >>> 0;

  constructor(private gen: WorldGen, readonly species: Species[]) {
    this.rnd = mulberry32(this.session);
    this.resetClock();
    for (const s of species) for (const b of s.batches) this.group.add(b.mesh);
    this.noose.visible = false;
    this.group.add(this.noose);
  }

  reset(gen: WorldGen) {
    this.gen = gen;
    for (const r of this.ropes.values()) this.dropRope(r);
    this.ropes.clear();
    if (this.throwing) this.dropRope(this.throwing.rope);
    this.throwing = null;
    this.noose.visible = false;
    this.flocks.clear();
    this.tamed.length = 0;
    this.spawnT = 0;
    this.session = (Math.random() * 4294967296) >>> 0;
    this.rnd = mulberry32(this.session);
    this.resetClock();
  }

  private resetClock() {
    this.age = 0;
    // The first floofs drift in shortly after you arrive.
    this.cooldown = { crow: 0, floof: 3 + this.rnd() * 12, crowPass: 20 + this.rnd() * 20 };
  }

  *all(): Generator<Mob> {
    for (const f of this.flocks.values()) yield* f.members;
    yield* this.tamed;
  }

  // ------------------------------------------------------------ spawning

  private populate(p: THREE.Vector3, ctx: MobCtx, dt: number) {
    // Species spawn things where you aren't looking (last frame's view).
    ctx.hidden = (x, y, z, r) => !this.frustum.intersectsSphere(this.sphere.set(v1.set(x, y, z), r));
    // Drop flocks that have wandered far off (they're replaced by newcomers).
    for (const [key, f] of this.flocks) {
      if (Math.hypot(f.centre.x - p.x, f.centre.z - p.z) < DESPAWN_R) continue;
      if (f.members.some((m) => m.state !== 'wild')) continue;
      this.flocks.delete(key);
    }
    const initial = this.age < 1.5;
    for (const sp of this.species) {
      this.cooldown[sp.name] = (this.cooldown[sp.name] ?? 0) - dt;
      if (this.cooldown[sp.name] > 0) continue;
      const want = Math.round((sp.name === 'crow' ? this.settings.crowFlocks : this.settings.floofFlocks) * this.settings.density);
      let have = 0;
      for (const f of this.flocks.values()) if (f.species === sp && !f.data.debug && !f.data.passing) have++;
      if (have >= want) continue;
      if (!this.launch(sp, ctx, initial)) {
        // Nowhere suitable out of view right now: try again shortly.
        this.cooldown[sp.name] = 1.5;
        continue;
      }
      if (sp.name === 'floof') {
        const [lo, hi] = this.settings.floofEvery;
        this.cooldown.floof = lo + this.rnd() * (hi - lo);
      } else {
        // Crows trickle in, except at the start when the world fills at once.
        this.cooldown.crow = initial ? 0 : 5 + this.rnd() * 15;
      }
    }
    // Fly-overs: every minute or so a crow flock crosses overhead, wherever
    // you are, on top of the ones that live around you.
    const crow = this.species.find((sp) => sp.name === 'crow');
    this.cooldown.crowPass -= dt;
    if (crow && this.cooldown.crowPass <= 0 && this.settings.density > 0) {
      let crows = 0;
      for (const f of this.flocks.values()) if (f.species === crow && !f.data.debug) crows++;
      if (crows >= this.settings.crowFlocks * this.settings.density + 2) {
        this.cooldown.crowPass = 5;
      } else if (this.launch(crow, ctx, false, undefined, undefined, true)) {
        const [lo, hi] = this.settings.crowPassEvery;
        this.cooldown.crowPass = lo + this.rnd() * (hi - lo);
      } else this.cooldown.crowPass = 1.5;
    }
  }

  private launch(sp: Species, ctx: MobCtx, initial: boolean, at?: THREE.Vector3, n?: number, pass = false): Flock | null {
    const id = this.nextId++;
    const key = `${sp.name}:${id}`;
    const rnd = mulberry32(hashInt(id, 3, this.session, 709));
    const f: Flock = { key, species: sp, home: new THREE.Vector3(), centre: new THREE.Vector3(), target: new THREE.Vector3(), members: [], t: 0, data: { rnd, pass } };
    if (at) {
      // Debug placement: settled right here.
      f.data.debug = true;
      f.centre.copy(at);
      f.target.copy(at);
      sp.launch(f, ctx, rnd, true);
      f.centre.copy(at);
      f.target.copy(at);
      // Crows settle on the spot for a while; floofs barely drift.
      if (sp.name === 'crow') Object.assign(f.data, { mode: 'ground', spot: at.clone(), relocate: 60 + rnd() * 60 });
      if (f.data.speed) f.data.speed = 0.4;
    } else if (!sp.launch(f, ctx, rnd, initial)) return null;
    f.home.copy(f.centre);
    const [lo, hi] = sp.flockSize;
    const count = n ?? lo + Math.floor(rnd() * (hi - lo + 1));
    for (let i = 0; i < count; i++) f.members.push(this.newMob(`${key}:${i}`, sp, f));
    f.members.forEach((m, i) => sp.initMob(m, i, f, ctx));
    this.flocks.set(key, f);
    return f;
  }

  private newMob(id: string, sp: Species, f: Flock | null): Mob {
    return {
      id, species: sp, pos: new THREE.Vector3(), vel: new THREE.Vector3(), heading: 0, grounded: false,
      state: 'wild', leashed: false, ridden: false, flock: f,
      rnd: mulberry32(hashInt(id.length, [...id].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261), this.gen.seed, 9)),
      tint: new THREE.Color(1, 1, 1), stay: new THREE.Vector3(), stateT: 0, happy: 0, data: null,
    };
  }

  /** Debug: drop a fresh flock of a species right here (crows land, floofs hover). */
  spawnFlockAt(name: string, x: number, z: number, ctx: MobCtx, n?: number) {
    const sp = this.species.find((s) => s.name === name);
    if (sp) this.launch(sp, ctx, true, new THREE.Vector3(x, this.gen.height(x, z), z), n);
  }

  // ------------------------------------------------------------ interaction

  /** The best mob to act on: near the camera's line of sight, in reach. */
  private pick(camera: THREE.Camera, player: THREE.Vector3): Aim | null {
    camera.getWorldDirection(fwd);
    let best: Aim | null = null;
    let bestScore = Infinity;
    for (const m of this.all()) {
      if (m.ridden || m.state === 'caught') continue;
      centre(m, v1);
      const dist = v1.distanceTo(player);
      const reach = m.state === 'wild' ? LASSO_RANGE : LEAD_RANGE;
      if (dist > reach) continue;
      v2.subVectors(v1, camera.position);
      const ang = v2.angleTo(fwd);
      // Generous near the explorer (you're usually looking past them).
      const cone = 0.3 + Math.max(0, 1 - dist / 8) * 0.6;
      if (ang > cone) continue;
      const score = ang / cone + dist / reach * 0.6 + (m.state === 'wild' ? 0 : -0.3);
      if (score < bestScore) {
        bestScore = score;
        best = { mob: m, action: m.state === 'wild' ? 'lasso' : m.leashed ? 'unlead' : 'lead' };
      }
    }
    return best;
  }

  /** R / right-click. Returns 'throw' when the rig should play a throw. */
  act(): 'throw' | 'lead' | 'unlead' | null {
    const a = this.aim;
    if (!a || this.throwing) return null;
    if (a.action === 'lasso') {
      const rope = new Rope();
      this.group.add(rope.mesh);
      centre(a.mob, v1);
      this.throwing = { mob: a.mob, t: 0, dur: 0.18 + 0.022 * v1.distanceTo(this.lastHand), rope };
      this.alarm(a.mob);
      return 'throw';
    }
    if (a.action === 'lead') {
      a.mob.leashed = true;
      return 'lead';
    }
    a.mob.leashed = false;
    a.mob.species.reset(a.mob);
    return 'unlead';
  }

  private alarm(m: Mob) {
    if (m.flock) m.flock.data.alarm = true;
  }

  /** A tamed mob close enough to climb onto. */
  mountable(p: THREE.Vector3): Mob | null {
    let best: Mob | null = null;
    let bd = MOUNT_RANGE;
    for (const m of this.tamed) {
      if (m.ridden) continue;
      const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
      if (d < bd + m.species.radius && m.pos.y - p.y < 4.5 && p.y - m.pos.y < 2.5) { bd = d; best = m; }
    }
    return best;
  }

  mount(m: Mob) {
    m.ridden = true;
    m.leashed = false;
    const r = this.ropes.get(m);
    if (r) { this.dropRope(r); this.ropes.delete(m); }
  }

  dismount(m: Mob) {
    m.ridden = false;
    m.species.reset(m);
  }

  get leading(): boolean {
    return this.tamed.some((m) => m.leashed) || !!this.throwing || this.tamed.some((m) => m.state === 'caught');
  }

  private lastHand = new THREE.Vector3();

  // ------------------------------------------------------------ frame

  update(ctx: MobCtx, camera: THREE.PerspectiveCamera, hand: THREE.Vector3, canAct: boolean) {
    const p = ctx.player.pos;
    this.lastHand.copy(hand);
    if (!this.settings.enabled) {
      for (const s of this.species) for (const b of s.batches) { b.begin(); b.end(); }
      this.aim = null;
      return;
    }
    this.age += ctx.dt;
    this.spawnT -= ctx.dt;
    if (this.spawnT <= 0 && !this.settings.freeze) {
      this.populate(p, ctx, 0.5 - this.spawnT);
      this.spawnT = 0.5;
    }

    // Brains.
    if (!this.settings.freeze) for (const f of this.flocks.values()) {
      f.t += ctx.dt;
      f.species.thinkFlock(f, ctx);
    }
    let lead = 0;
    for (const m of this.all()) {
      if (this.settings.freeze) break;
      m.stateT += ctx.dt;
      m.happy = Math.max(0, m.happy - ctx.dt);
      m.species.think(m, ctx, m.leashed ? lead++ : 0);
      if (m.state === 'caught' && m.stateT > TAME_TIME) this.tame(m, ctx);
    }

    // Draw.
    camera.updateMatrixWorld();
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    for (const s of this.species) for (const b of s.batches) b.begin();
    let n = 0, drawn = 0;
    const shadows: { m: Mob; d: number }[] = [];
    for (const m of this.all()) {
      n++;
      const d = m.pos.distanceTo(camera.position);
      if (d > DRAW_R && !m.ridden) continue;
      centre(m, this.sphere.center);
      this.sphere.radius = m.species.radius * 2.6;
      if (!m.ridden && !this.frustum.intersectsSphere(this.sphere)) {
        // Off screen: still pose anything on a rope, so the rope ties on right.
        if (m.state !== 'wild') m.species.animate(m, ctx);
        if (d < 70) shadows.push({ m, d });
        continue;
      }
      m.species.animate(m, ctx);
      m.species.emit(m, d);
      drawn++;
      if (d < 90) shadows.push({ m, d });
    }
    for (const s of this.species) for (const b of s.batches) b.end();
    this.stats.mobs = n;
    this.stats.drawn = drawn;
    this.stats.flocks = this.flocks.size;

    // Contact shadows for the nearest few.
    shadows.sort((a, b) => a.d - b.d);
    const U = TERRAIN_U.uMobShadow.value;
    for (let i = 0; i < U.length; i++) {
      const s = shadows[i];
      if (!s) { U[i].set(0, -1e4, 0, 0); continue; }
      const m = s.m;
      const g = this.gen.height(m.pos.x, m.pos.z);
      const lift = m.pos.y - g;
      if (g < SEA_LEVEL || lift > 30) { U[i].set(0, -1e4, 0, 0); continue; }
      U[i].set(m.pos.x, g, m.pos.z, m.species.radius * 0.85 / (1 + Math.max(0, lift) * 0.1));
    }

    this.aim = canAct ? this.pick(camera, p) : null;
  }

  private tame(m: Mob, ctx: MobCtx) {
    m.state = 'tamed';
    m.stateT = 0;
    m.happy = 1.6;
    m.leashed = true;
    if (m.flock) {
      const f = m.flock;
      f.members.splice(f.members.indexOf(m), 1);
      if (!f.members.length) this.flocks.delete(f.key);
      m.flock = null;
    }
    this.tamed.push(m);
    m.species.reset(m);
    centre(m, v1);
    ctx.puff(v1.setY(v1.y + m.species.radius * 0.6), 8, 0.22, 2.4);
    this.onTamed?.(m);
  }

  /** Where the held rope pulls toward (the first caught / led mob), if any. */
  ropeTarget(out: THREE.Vector3): boolean {
    for (const m of this.ropes.keys()) {
      m.species.attach(m, this.lastHand, out);
      return true;
    }
    return false;
  }

  /** After the rig has posed: throw flight and ropes start from the hand. */
  updateRopes(ctx: MobCtx, hand: THREE.Vector3) {
    this.lastHand.copy(hand);
    if (!this.settings.enabled) return;
    this.updateLasso(ctx, hand);
  }

  private updateLasso(ctx: MobCtx, hand: THREE.Vector3) {
    const floor = (x: number, z: number) => ctx.surface(x, z);
    const th = this.throwing;
    if (th) {
      th.t += ctx.dt;
      const m = th.mob;
      // The loop flies a lob from the hand to the target, spinning flat.
      m.species.attach(m, hand, v1);
      const k = Math.min(1, th.t / th.dur);
      v2.lerpVectors(hand, v1, k);
      v2.y += Math.sin(k * Math.PI) * Math.min(2.5, hand.distanceTo(v1) * 0.18);
      this.noose.visible = true;
      this.noose.position.copy(v2);
      this.noose.rotation.set(Math.PI / 2 + Math.sin(th.t * 9) * 0.2, 0, th.t * 14);
      this.noose.scale.setScalar(0.6 + 0.4 * Math.min(1, th.t * 5));
      th.rope.line(hand, v2, 0.3 * k);
      if (k >= 1) {
        this.noose.visible = false;
        this.throwing = null;
        if (m.state === 'wild') {
          m.state = 'caught';
          m.stateT = 0;
          th.rope.length = Math.max(4, hand.distanceTo(v1));
          this.ropes.set(m, th.rope);
          ctx.puff(v1, 4, 0.12, 1.4);
        } else this.dropRope(th.rope);
      }
    }
    // Ropes to caught and led mobs.
    for (const m of this.all()) {
      const want = m.state === 'caught' || m.leashed;
      let r = this.ropes.get(m);
      if (!want) {
        if (r) { this.dropRope(r); this.ropes.delete(m); }
        continue;
      }
      if (!r) {
        r = new Rope();
        this.group.add(r.mesh);
        this.ropes.set(m, r);
      }
      if (m.state === 'tamed') r.length += (LEASH_LEN - r.length) * (1 - Math.exp(-2 * ctx.dt));
      // Hard limit: the rope is a rope. Measured from the body centre (the
      // skeleton is only posed later in the frame).
      centre(m, v1);
      const max = r.length * 1.08 + m.species.radius;
      const d = v1.distanceTo(hand);
      if (d > max) {
        v2.subVectors(hand, v1).setLength(d - max);
        m.pos.add(v2);
        const n = v2.normalize();
        const vn = m.vel.dot(n);
        if (vn < 0) m.vel.addScaledVector(n, -vn);
      }
      m.species.attach(m, hand, v1);
      r.update(hand, v1, ctx.dt, floor);
    }
  }

  private dropRope(r: Rope) {
    this.group.remove(r.mesh);
    r.dispose();
  }
}

/** Body centre, world space. */
function centre(m: Mob, out: THREE.Vector3) {
  return out.copy(m.pos).setY(m.pos.y + m.species.centreY);
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const fwd = new THREE.Vector3();
export type { PlayerView };
