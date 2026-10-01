import * as THREE from 'three';
import { U } from '../gfx/materials';
import type { Mobs } from '../mobs/manager';
import type { Mob, MobCtx } from '../mobs/types';
import type { Sfx } from './audio';
import type { Stable } from './stable';
import { TALLY } from './stableGeometry';
import type { Story } from './story';

// The creatures that live at the stable (phase 3). Lead a lassoed creature
// (or ride it) in through the gate and it's home: it hops, hearts float up,
// a saddle appears (it's yours now) and the tally board over the stalls gets
// another mark. From then on it lives in the pasture, wandering the grass
// and dozing in the stalls (more of them at night), and wherever you leave
// it, it's home again the next time you come back: quietly, never where you
// can see it go. Saved per seed.
//
// It also keeps the lasso lesson supplied: while the story wants you to
// catch your first creature, a calm stelk grazes a little way out from the
// gate (it turns up out of view), and that's the one the spirit shows you.

/** Coming within this of the pasture (m) brings everyone home who's out of sight. */
const HOME_R = 160;
/** A creature further than this from you counts as out of sight whatever the view (m). */
const UNSEEN_R = 90;
/** The lesson's stelk grazes this far out from the gate (m). */
const LESSON_R: [number, number] = [19, 28];

interface Resident { id: string; sp: string; tint: [number, number, number] }

export interface HerdDeps {
  mobs: Mobs;
  story: Story;
  sfx: Sfx;
  saveKey: string;
  camera: THREE.Camera;
  ctx: MobCtx;
  puffs(at: THREE.Vector3, n: number, size: number, spread: number): void;
}

export class Herd {
  private roster: Resident[] = [];
  private live = new Map<Mob, { id: string; t: number }>();
  private frustum = new THREE.Frustum();
  private pm = new THREE.Matrix4();
  private sphere = new THREE.Sphere();
  private rnd = Math.random;
  private nextId = 0;
  /** The lesson's creature (wild, calm), and the wait before looking for a place for another. */
  private lessonMob: Mob | null = null;
  private lessonT = 0;
  private lessonTries = 0;

  constructor(private d: HerdDeps) {
    this.load();
    const st = this.stable;
    if (!st) return;
    for (const r of this.roster) {
      const m = d.mobs.adopt(r.sp, r.id, st.spot(this.rnd, 1), new THREE.Color(...r.tint), d.ctx);
      if (m) this.live.set(m, { id: r.id, t: this.rnd() * 20 });
    }
    st.setTally(this.roster.length);
    d.story.leadingHome = () => d.mobs.tamed.some((m) => (m.leashed || m.ridden) && !m.stabled);
    d.story.quarry = () => this.quarry();
  }

  private get stable(): Stable | null { return this.d.story.stable; }

  get count() { return this.roster.length; }

  update(dt: number) {
    const st = this.stable;
    if (!st) return;
    const d = this.d;
    const p = d.ctx.player.pos;
    this.d.camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.pm.multiplyMatrices((d.camera as THREE.PerspectiveCamera).projectionMatrix, d.camera.matrixWorldInverse));
    const open = st.parts.fence.state === 'built';
    const nearHome = Math.hypot(p.x - st.p.x, p.z - st.p.z) < HOME_R;
    const night = U.uNight.value as number;
    const gate: THREE.Vector3[] = [];
    for (const m of d.mobs.tamed) {
      if (m.leashed || (m.ridden && !m.stabled)) gate.push(m.pos);
      if (!m.stabled) {
        // Brought in through the gate: home.
        if (open && m.state === 'tamed' && st.inside(m.pos.x, m.pos.z, 0.5) && this.roster.length < TALLY) this.welcome(m);
        continue;
      }
      if (m.leashed || m.ridden) continue;
      const r = m.species.radius;
      let life = this.live.get(m);
      if (!life) this.live.set(m, (life = { id: m.id, t: 0 }));
      if (st.inside(m.pos.x, m.pos.z, -0.5)) {
        // Pasture life: a new spot every so often, sometimes in a stall
        // (more often after dark), and never out through the fence.
        life.t -= dt;
        if (life.t <= 0) {
          life.t = 14 + this.rnd() * 30;
          m.stay.copy(st.spot(this.rnd, r, this.rnd() < 0.2 + 0.5 * night));
        }
        if (open) st.keepIn(m.pos, m.vel, r + 0.3);
      } else if (nearHome && open && this.unseen(m)) {
        // Left somewhere else: it's home by the time you look.
        m.pos.copy(st.spot(this.rnd, r));
        m.vel.set(0, 0, 0);
        m.species.reset(m);
        life.t = 10 + this.rnd() * 20;
      }
    }
    d.story.gateFor = gate;
    st.setTally(this.roster.length);
    this.lesson(dt);
  }

  /** What the spirit should show you how to catch: one you let go of, or the lesson's. */
  private quarry(): THREE.Vector3 | null {
    const p = this.d.ctx.player.pos;
    let best: Mob | null = null, bd = 80;
    for (const m of this.d.mobs.tamed) {
      if (m.stabled || m.leashed || m.ridden) continue;
      const dd = Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
      if (dd < bd) { bd = dd; best = m; }
    }
    return (best ?? this.lessonMob)?.pos ?? null;
  }

  /**
   * Keep a calm stelk grazing out past the gate while there's a first
   * creature to catch: somewhere out of view, on open ground, not too far
   * for the spirit to go (it keeps to its yard).
   */
  private lesson(dt: number) {
    const d = this.d, story = d.story, st = this.stable!;
    const kind = story.phase.id === 'stable' ? story.step.kind : null;
    const want = (kind === 'catch' || kind === 'herd') && st.parts.fence.state === 'built';
    const m = this.lessonMob;
    if (m && (m.state !== 'wild' || !m.flock || !d.mobs.flocks.has(m.flock.key) || m.pos.distanceTo(st.gateOut) > 90)) this.lessonMob = null;
    if (!want) {
      // It's done its job (or isn't needed yet): an ordinary stelk from now on.
      if (this.lessonMob?.flock) this.lessonMob.flock.data.calm = false;
      this.lessonMob = null;
      return;
    }
    if (this.lessonMob || kind !== 'catch' || d.mobs.tamed.some((q) => !q.stabled)) return;
    this.lessonT -= dt;
    if (this.lessonT > 0) return;
    this.lessonT = 0.5;
    const gen = d.ctx.gen, home = story.spirit.home!;
    const out = st.gateOut.clone().sub(st.gate).setY(0).normalize();
    const base = Math.atan2(out.x, out.z);
    // Out of view if we can; after a few seconds of trying, anywhere.
    const hidden = this.lessonTries++ < 16;
    for (let k = 0; k < 24; k++) {
      const a = base + (this.rnd() - 0.5) * 2.5;
      const r = LESSON_R[0] + this.rnd() * (LESSON_R[1] - LESSON_R[0]);
      const x = st.gateOut.x + Math.sin(a) * r, z = st.gateOut.z + Math.cos(a) * r;
      const h = gen.height(x, z);
      if (h < 2.5 || Math.abs(gen.height(x + 2.5, z) - gen.height(x - 2.5, z)) > 1.1 || Math.abs(gen.height(x, z + 2.5) - gen.height(x, z - 2.5)) > 1.1) continue;
      if (st.inside(x, z, -6) || Math.hypot(x - home.x, z - home.z) < 14 || Math.hypot(x - home.x, z - home.z) > story.spirit.range + 6) continue;
      if (hidden && !this.unseenAt(x, h + 1.2, z, 3)) continue;
      const f = d.mobs.spawnFlockAt('stelk', x, z, d.ctx, 1);
      if (!f) return;
      f.data.calm = true;
      f.data.facing = Math.atan2(st.gateOut.x - x, st.gateOut.z - z);
      this.lessonMob = f.members[0];
      this.lessonMob.heading = f.data.facing;
      this.lessonTries = 0;
      return;
    }
  }

  private unseenAt(x: number, y: number, z: number, r: number) {
    this.sphere.center.set(x, y, z);
    this.sphere.radius = r;
    return !this.frustum.intersectsSphere(this.sphere);
  }

  private unseen(m: Mob) {
    const cam = this.d.camera.position;
    if (m.pos.distanceTo(cam) > UNSEEN_R) return true;
    this.sphere.center.copy(m.pos).setY(m.pos.y + m.species.centreY);
    this.sphere.radius = m.species.radius * 2.6;
    return !this.frustum.intersectsSphere(this.sphere);
  }

  /** A creature comes to live here. */
  private welcome(m: Mob) {
    const st = this.stable!;
    m.stabled = true;
    m.leashed = false;
    m.happy = 2.8;
    // It hops for joy and wanders off into its new home (ridden in, it waits
    // until you climb off: its brain is yours till then).
    if (!m.ridden) {
      m.species.reset(m);
      m.vel.y = Math.max(m.vel.y, 5);
      m.grounded = false;
      m.stay.copy(st.spot(this.rnd, m.species.radius));
    }
    const id = `home:${Date.now().toString(36)}:${this.nextId++}`;
    this.live.set(m, { id, t: 8 + this.rnd() * 8 });
    this.roster.push({ id, sp: m.species.name, tint: [m.tint.r, m.tint.g, m.tint.b] });
    const at = m.pos.clone().setY(m.pos.y + m.species.centreY + m.species.radius);
    this.d.puffs(at, 10, 0.24, 2.6);
    this.d.story.hearts(at);
    this.d.sfx.chirp(true);
    this.d.story.spirit.celebrate();
    st.setTally(this.roster.length);
    this.save();
  }

  // ------------------------------------------------------------ save

  private key() { return `fjellheim.herd.${this.d.saveKey}`; }
  private save() { try { localStorage.setItem(this.key(), JSON.stringify(this.roster)); } catch { /* private mode */ } }
  private load() {
    try {
      const raw = localStorage.getItem(this.key());
      const data = raw ? JSON.parse(raw) as Resident[] : [];
      if (Array.isArray(data)) this.roster = data.filter((r) => r && typeof r.sp === 'string' && Array.isArray(r.tint)).slice(0, TALLY);
    } catch { this.roster = []; }
  }
  reset() { try { localStorage.removeItem(this.key()); } catch { /* ignore */ } this.roster = []; }
}
