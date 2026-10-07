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
// A flock running from the giant (`data.gone`) is seen going for much further than that: until it's a speck in the fog.
const GONE_R = 1100;
const GONE_DRAW_R = 1000;
/** Lasso reach (m). */
export const LASSO_RANGE = 24;
const LEAD_RANGE = 9;
const MOUNT_RANGE = 3.6;
const LEASH_LEN = 5.2;
const TAME_TIME = 1.8;
/** The walker's contact cylinder (m) for nudging creatures aside. */
const PLAYER_R = 0.4;
const PLAYER_H = 1.7;
/** How quickly overlap eases out (1/s), and the spring that keeps them clear. */
const NUDGE_RATE = 12;
const NUDGE_SPRING = 18;


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
    /** Stelk herds grazing within range, and seconds between newcomers. */
    stelkHerds: 2,
    stelkEvery: [20, 60] as [number, number],
    /** The wilder creatures (beast.ts): herds of each kept around, as a multiple of their own count. */
    beastHerds: 1,
    /** Seconds between crow fly-overs (a flock crossing over your head). */
    crowPassEvery: [45, 80] as [number, number],
    /** Debug: brains paused, animation runs. */
    freeze: false,
  };
  /**
   * `lasso`: you have one (in the story, only once the spirit has given it).
   * `stable`: a tamed creature is only yours (saddled, and it comes home)
   * once it's been brought to the stable (the story); otherwise that's as
   * soon as it's tamed. Either way it can be ridden straight away.
   */
  readonly rules = { lasso: true, stable: false };
  readonly flocks = new Map<string, Flock>();
  readonly tamed: Mob[] = [];
  private spawnT = 0;
  /** The giant is about (see `scare`): nothing new turns up. */
  private fright = false;
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
  /**
   * Set while you're down in a dungeon, to the context its creatures live by
   * (its floor, its walls). Then only they (`m.below`) think and are drawn,
   * and the world's creatures wait as they are; otherwise the dungeon's wait.
   */
  under: MobCtx | null = null;
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
    this.fright = false;
    this.session = (Math.random() * 4294967296) >>> 0;
    this.rnd = mulberry32(this.session);
    this.resetClock();
  }

  private resetClock() {
    this.age = 0;
    // The first floofs drift in shortly after you arrive.
    this.cooldown = { crow: 0, floof: 3 + this.rnd() * 12, stelk: 0, crowPass: 20 + this.rnd() * 20 };
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
      if (Math.hypot(f.centre.x - p.x, f.centre.z - p.z) < (f.data.gone ? GONE_R : DESPAWN_R)) continue;
      if (f.members.some((m) => m.state !== 'wild')) continue;
      this.flocks.delete(key);
    }
    if (this.fright) return;
    const initial = this.age < 1.5;
    // Habitat searches cost terrain lookups: only a couple of the wilder
    // kinds look for a place per tick.
    let searches = 2;
    for (const sp of this.species) {
      this.cooldown[sp.name] = (this.cooldown[sp.name] ?? 0) - dt;
      if (this.cooldown[sp.name] > 0) continue;
      if (sp.herds !== undefined) {
        if (searches <= 0) continue;
        const want = Math.round(sp.herds * this.settings.beastHerds * this.settings.density);
        let have = 0;
        for (const f of this.flocks.values()) if (f.species === sp && !f.data.debug && !f.data.gone) have++;
        if (have >= want) continue;
        searches--;
        const [lo, hi] = sp.every ?? [30, 60];
        // Nowhere that suits it near here: look again in a while.
        if (!this.launch(sp, ctx, initial)) this.cooldown[sp.name] = 4 + this.rnd() * 5;
        else this.cooldown[sp.name] = initial ? 0.5 : lo + this.rnd() * (hi - lo);
        continue;
      }
      const per = sp.name === 'crow' ? this.settings.crowFlocks : sp.name === 'stelk' ? this.settings.stelkHerds : this.settings.floofFlocks;
      const want = Math.round(per * this.settings.density);
      let have = 0;
      for (const f of this.flocks.values()) if (f.species === sp && !f.data.debug && !f.data.passing && !f.data.gone) have++;
      if (have >= want) continue;
      if (!this.launch(sp, ctx, initial)) {
        // Nowhere suitable out of view right now: try again shortly.
        this.cooldown[sp.name] = 1.5;
        continue;
      }
      if (sp.name === 'floof' || (sp.name === 'stelk' && !initial)) {
        const [lo, hi] = sp.name === 'floof' ? this.settings.floofEvery : this.settings.stelkEvery;
        this.cooldown[sp.name] = lo + this.rnd() * (hi - lo);
      } else if (sp.name === 'stelk') {
        this.cooldown.stelk = 0;
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
      for (const f of this.flocks.values()) if (f.species === crow && !f.data.debug && !f.data.gone) crows++;
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
      // Crows settle on the spot for a while; floofs barely drift; stelks graze.
      if (sp.name === 'crow') Object.assign(f.data, { mode: 'ground', spot: at.clone(), relocate: 60 + rnd() * 60 });
      if (sp.name === 'stelk') Object.assign(f.data, { mode: 'graze', spot: at.clone(), relocate: 90 + rnd() * 60 });
      if (sp.settle) { sp.settle(f, at, rnd); f.data.relocate = 90 + rnd() * 60; }
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
      state: 'wild', leashed: false, ridden: false, stabled: false, flock: f,
      rnd: mulberry32(hashInt(id.length, [...id].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261), this.gen.seed, 9)),
      tint: new THREE.Color(1, 1, 1), stay: new THREE.Vector3(), stateT: 0, happy: 0, data: null,
    };
  }

  /**
   * A creature that lives at the stable, back from a save: tamed, saddled
   * and standing at `at`, looking as it did (`tint`).
   */
  adopt(name: string, id: string, at: THREE.Vector3, tint: THREE.Color | null, ctx: MobCtx): Mob | null {
    const sp = this.species.find((s) => s.name === name);
    if (!sp) return null;
    const rnd = mulberry32(hashInt(id.length, id.charCodeAt(id.length - 1), this.session, 711));
    const f: Flock = { key: id, species: sp, home: at.clone(), centre: at.clone(), target: at.clone(), members: [], t: 0, data: { rnd, mode: 'ground', alt: 2 } };
    const m = this.newMob(id, sp, f);
    f.members.push(m);
    sp.initMob(m, 0, f, ctx);
    m.pos.copy(at);
    m.flock = null;
    if (tint) m.tint.copy(tint);
    m.state = 'tamed';
    m.stabled = true;
    this.tamed.push(m);
    sp.reset(m);
    return m;
  }

  /** Debug: drop a fresh flock of a species right here (crows land, floofs hover, stelks graze). */
  spawnFlockAt(name: string, x: number, z: number, ctx: MobCtx, n?: number): Flock | null {
    const sp = this.species.find((s) => s.name === name);
    return sp ? this.launch(sp, ctx, true, new THREE.Vector3(x, this.gen.height(x, z), z), n) : null;
  }

  /**
   * The giant is coming, from `from`: every wild flock about is off the other
   * way for good (Species.bolt), the fliers seen going until they're specks,
   * and nothing new turns up until `calm`. `flush`: this many more flocks of
   * birds go up off the land between `seen` (where it's watched from: you,
   * unless told) and it, so there is always something in the sky to see go.
   * (Yours stay: anything tamed, on a rope, or the lesson's.)
   */
  scare(from: THREE.Vector3, ctx: MobCtx, flush = 0, seen = ctx.player.pos) {
    this.fright = true;
    const crow = this.species.find((sp) => sp.name === 'crow');
    const p = seen, dx = from.x - p.x, dz = from.z - p.z, far = Math.hypot(dx, dz) || 1;
    for (let k = 0, tries = 0; crow && k < flush && tries < 60; tries++) {
      // Spread along the way to it and out to both sides of that, the nearest a little way off.
      const t = Math.max(0.18 + this.rnd() * 0.6, 60 / far), side = (this.rnd() - 0.5) * Math.min(far, 420) * 0.9 * (0.4 + t);
      const x = p.x + dx * t + (dz / far) * side, z = p.z + dz * t - (dx / far) * side, h = this.gen.height(x, z);
      // Out of the trees, for choice: they come up through the canopy, and aren't seen turning up on open ground.
      if (h < SEA_LEVEL + 1 || (tries < 40 && this.gen.forestDensity(x, z, h) < 0.2)) continue;
      this.launch(crow, ctx, true, new THREE.Vector3(x, h, z), 5 + Math.floor(this.rnd() * 5));
      k++;
    }
    for (const f of this.flocks.values()) {
      if (f.data.gone || f.data.calm || !f.species.bolt || f.members.some((m) => m.state !== 'wild')) continue;
      f.data.gone = true;
      f.species.bolt(f, from, ctx);
    }
  }

  /** It has been and gone: creatures turn up again as they always did (those that ran keep going). */
  calm() {
    this.fright = false;
  }

  // ------------------------------------------------------------ interaction

  /** The best mob to act on: near the camera's line of sight, in reach. */
  private pick(camera: THREE.Camera, player: THREE.Vector3): Aim | null {
    camera.getWorldDirection(fwd);
    let best: Aim | null = null;
    let bestScore = Infinity;
    for (const m of this.all()) {
      if (m.ridden || m.state === 'caught') continue;
      if (m.state === 'wild' && !this.rules.lasso) continue;
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
  mountable(p: THREE.Vector3, range = MOUNT_RANGE): Mob | null {
    let best: Mob | null = null;
    let bd = range;
    for (const m of this.tamed) {
      if (m.ridden || !!m.below !== !!this.under) continue;
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

  /**
   * A charging mount barrels into creatures: anything within `r` of `at`
   * and ahead of it is flung aside (and its herd takes fright).
   */
  shove(at: THREE.Vector3, dir: THREE.Vector3, r: number, speed: number, except?: Mob): number {
    let n = 0;
    for (const m of this.all()) {
      if (m === except || m.ridden) continue;
      const dx = m.pos.x - at.x, dz = m.pos.z - at.z;
      const d = Math.hypot(dx, dz);
      if (d > r + m.species.radius || Math.abs(m.pos.y - at.y) > 4) continue;
      if (dx * dir.x + dz * dir.z < -m.species.radius) continue;
      // Out to the side it's nearer, plus along the charge.
      const side = dx * dir.z - dz * dir.x;
      const s = side >= 0 ? 1 : -1;
      m.vel.x += (dir.z * s * 0.8 + dir.x * 0.5) * speed;
      m.vel.z += (-dir.x * s * 0.8 + dir.z * 0.5) * speed;
      m.pos.x += dir.z * s * 0.3;
      m.pos.z += -dir.x * s * 0.3;
      this.alarm(m);
      n++;
    }
    return n;
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
    const under = this.under;
    const live = (m: Mob) => !!m.below === !!under;
    if (under) ctx = under;
    if (this.spawnT <= 0 && !this.settings.freeze && !under) {
      this.populate(p, ctx, 0.5 - this.spawnT);
      this.spawnT = 0.5;
      // Tamed but never brought home, and left far behind: it wanders off wild again.
      for (let i = this.tamed.length - 1; i >= 0; i--) {
        const m = this.tamed[i];
        if (m.below || m.stabled || m.leashed || m.ridden || Math.hypot(m.pos.x - p.x, m.pos.z - p.z) < DESPAWN_R) continue;
        const r = this.ropes.get(m);
        if (r) { this.dropRope(r); this.ropes.delete(m); }
        this.tamed.splice(i, 1);
      }
    }

    // Brains.
    if (!this.settings.freeze && !under) for (const f of this.flocks.values()) {
      f.t += ctx.dt;
      f.species.thinkFlock(f, ctx);
    }
    let lead = 0;
    for (const m of this.all()) {
      if (this.settings.freeze) break;
      if (!live(m)) continue;
      m.stateT += ctx.dt;
      m.happy = Math.max(0, m.happy - ctx.dt);
      m.species.think(m, ctx, m.leashed ? lead++ : 0);
      if (m.state === 'caught' && m.stateT > TAME_TIME) this.tame(m, ctx);
    }
    if (!this.settings.freeze) this.nudge(ctx);

    // Draw.
    camera.updateMatrixWorld();
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    for (const s of this.species) for (const b of s.batches) b.begin();
    let n = 0, drawn = 0;
    const shadows: { m: Mob; d: number }[] = [];
    for (const m of this.all()) {
      n++;
      if (!live(m)) continue;
      const d = m.pos.distanceTo(camera.position);
      if (d > (m.flock?.data.gone ? GONE_DRAW_R : DRAW_R) && !m.ridden) continue;
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
      const s = under ? null : shadows[i];
      // (Not there to be seen, a glimmer mid-blink: no shadow either.)
      if (!s || s.m.data?.hidden) { U[i].set(0, -1e4, 0, 0); continue; }
      const m = s.m;
      const g = this.gen.height(m.pos.x, m.pos.z);
      const lift = m.pos.y - g;
      if (g < SEA_LEVEL || lift > 30) { U[i].set(0, -1e4, 0, 0); continue; }
      U[i].set(m.pos.x, g, m.pos.z, m.species.radius * 0.85 / (1 + Math.max(0, lift) * 0.1));
    }

    this.aim = canAct ? this.pick(camera, p) : null;
  }

  // ------------------------------------------------------------ contact

  /**
   * Soft bodies: you (or your mount, or your bike) shoulder creatures aside
   * instead of passing through them, and tamed ones don't stack up on each
   * other. Overlap is eased out over a few frames, not snapped, and the mob
   * gets a push along the contact so it drifts off rather than jitters.
   */
  private nudge(ctx: MobCtx) {
    const pl = ctx.player;
    const dt = ctx.dt;
    const k = 1 - Math.exp(-NUDGE_RATE * dt);
    const mount = pl.mode === 'ride' ? this.tamed.find((m) => m.ridden) : undefined;
    const pr = mount ? mount.species.radius : pl.mode === 'bike' ? 0.6 : PLAYER_R;
    const top = pl.pos.y + (mount ? mount.species.centreY + mount.species.radius + 1.2 : PLAYER_H);
    for (const m of this.all()) {
      if (m.ridden || !!m.below !== !!this.under) continue;
      const r = m.species.radius;
      const cy = m.pos.y + m.species.centreY;
      if (cy - r > top || cy + r < pl.pos.y) continue;
      const dx = m.pos.x - pl.pos.x, dz = m.pos.z - pl.pos.z;
      const reach = pr + r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= reach * reach) continue;
      const d = Math.sqrt(d2);
      // Dead centre (dropped on top of one): shove it out ahead of you.
      const nx = d > 1e-4 ? dx / d : Math.sin(pl.heading);
      const nz = d > 1e-4 ? dz / d : Math.cos(pl.heading);
      const pen = reach - d;
      m.pos.x += nx * pen * k;
      m.pos.z += nz * pen * k;
      // Match your speed into it, plus a little spring so it keeps clear.
      const closing = (pl.vel.x * nx + pl.vel.z * nz) - (m.vel.x * nx + m.vel.z * nz);
      const dv = Math.max(0, closing) + pen * NUDGE_SPRING * dt;
      m.vel.x += nx * dv;
      m.vel.z += nz * dv;
    }
    // Tamed creatures keep a little personal space from each other.
    const t = this.tamed;
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
      const a = t[i], b = t[j];
      const dy = (a.pos.y + a.species.centreY) - (b.pos.y + b.species.centreY);
      const reach = a.species.radius + b.species.radius;
      if (Math.abs(dy) > reach) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= reach * reach) continue;
      const d = Math.sqrt(d2);
      const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
      const push = (reach - d) * k;
      // A ridden mount is driven by you: the other one gives way entirely.
      const wa = a.ridden ? 0 : b.ridden ? 1 : 0.5;
      a.pos.x -= nx * push * wa; a.pos.z -= nz * push * wa;
      b.pos.x += nx * push * (1 - wa); b.pos.z += nz * push * (1 - wa);
    }
  }

  private tame(m: Mob, ctx: MobCtx) {
    m.state = 'tamed';
    m.stateT = 0;
    m.happy = 1.6;
    m.leashed = true;
    if (!this.rules.stable) m.stabled = true;
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
