import * as THREE from 'three';
import { U } from '../gfx/materials';
import type { Mobs } from '../mobs/manager';
import type { Mob, MobCtx } from '../mobs/types';
import type { Sfx } from './audio';
import type { Stable } from './stable';
import { TALLY } from './stableGeometry';
import type { Story } from './story';

// The creatures that live at the stable (phase 3). Lead a lassoed creature
// in through the gate and it's home: it hops, hearts float up, a saddle
// appears (it can be ridden now) and the tally board over the stalls gets
// another mark. From then on it lives in the pasture, wandering the grass
// and dozing in the stalls (more of them at night), and wherever you leave
// it, it's home again the next time you come back: quietly, never where you
// can see it go. Saved per seed.

/** Coming within this of the pasture (m) brings everyone home who's out of sight. */
const HOME_R = 160;
/** A creature further than this from you counts as out of sight whatever the view (m). */
const UNSEEN_R = 90;

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

  constructor(private d: HerdDeps) {
    this.load();
    const st = this.stable;
    if (!st) return;
    for (const r of this.roster) {
      const m = d.mobs.adopt(r.sp, r.id, st.spot(this.rnd, 1), new THREE.Color(...r.tint), d.ctx);
      if (m) this.live.set(m, { id: r.id, t: this.rnd() * 20 });
    }
    st.setTally(this.roster.length);
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
      if (m.leashed) gate.push(m.pos);
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
    m.species.reset(m);
    // It hops for joy, and wanders off into its new home.
    m.vel.y = Math.max(m.vel.y, 5);
    m.grounded = false;
    m.stay.copy(st.spot(this.rnd, m.species.radius));
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
