import * as THREE from 'three';
import type { GallopState, MountSpec } from '../player/movement';
import type { WorldGen } from '../world/worldgen';
import { colored, merge, PartBatch, Spring } from './parts';
import type { Flock, Mob, MobCtx, Species, SpeciesName } from './types';

// The wilder creatures (mossbacks, glimmers, mudsnoots, moonmoths,
// rockhoppers, bog hags, bramblers, woolly wurms, stormbacks, lantern hares)
// share one brain and one body plan, the stelk's, made general: a herd
// finds a spot that suits its kind (bog, glimmerwood, crags, the hollows,
// open downs...), idles there (grazing, rooting, looking round), wanders on
// now and then and bolts when you rush it. Lassoed and tamed, it trots
// behind on its lead, waits where it's left, and is ridden through RideMode
// with its own MountTrait (movement.ts). Each species supplies its shapes,
// its skeleton and how it poses; everything else is here.

/** What a place looks like to a creature choosing where to be. */
export interface Site {
  x: number;
  z: number;
  h: number;
  /** Rise over 3 m (roughly: 0 flat, 1 = 18 deg, 3 = 45 deg). */
  slope: number;
  forest: number;
  bog: number;
  glimmer: number;
  hollow: number;
  rock: number;
  /** 0 day .. 1 night. */
  night: number;
}

/** A part of the body drawn through one of the species' batches. */
interface Draw {
  b: PartBatch;
  o: THREE.Object3D;
  /** Takes the coat tint (else drawn white = its own vertex colours). */
  tint: boolean;
  eye: boolean;
  /** 0 always, 1 only when tamed (saddle, bridle), 2 only on a rope (collar). */
  when: 0 | 1 | 2;
}

type Act = 'graze' | 'look' | 'step';

/** Per-frame animation inputs, worked out once for the species' `pose`. */
export interface Anim {
  t: number;
  dt: number;
  /** Speed along the heading (m/s, signed) and its size. */
  fwd: number;
  speed: number;
  /** 0..1 moving at all. */
  moving: number;
  /** Stride cycles so far, and this cycle's phase 0..1. */
  stride: number;
  cyc: number;
  /** Turning rate (rad/s), and the lean into it. */
  turn: number;
  bank: number;
  /** Ground pitch under the body (rad, + = nose up). */
  slope: number;
  /** 0..1 airborne (ridden leaps), wet (swimming), grazing / rooting. */
  air: number;
  wet: number;
  graze: number;
  /** Head yaw toward whatever it's watching (rad, relative), and whether it's watching. */
  lookYaw: number;
  alert: number;
  /** Just tamed (a happy hop / rear), and plunging on the rope. */
  joy: number;
  caught: boolean;
  /** The rider's mount state while ridden. */
  gs: GallopState | null;
  /** Vertical speed (m/s). */
  vy: number;
}

export interface BeastData {
  root: THREE.Object3D;
  body: THREE.Object3D;
  head: THREE.Object3D;
  seat: THREE.Object3D;
  collar: THREE.Object3D;
  n: Record<string, THREE.Object3D>;
  draws: Draw[];
  // brain
  act: Act;
  idle: number;
  goal: THREE.Vector3 | null;
  slot: THREE.Vector2;
  face: number | null;
  speed: number;
  /** Fliers: height over the ground they're keeping, and a drift phase. */
  alt: number;
  drift: number;
  rest: number;
  // anim
  a: Anim;
  prevHeading: number;
  pitch: Spring;
  bankS: Spring;
  headYaw: number;
  blinkAt: number;
  look: THREE.Vector2;
  lookAt: THREE.Vector3 | null;
  eye: THREE.Vector4;
  lift: number;
  /** Ridden: the mount's movement state (abilities), or null. */
  gs: GallopState | null;
  /** Hidden whole (underground). */
  hidden: boolean;
  /** Species scratch. */
  s: any;
}

export interface BeastConfig {
  name: SpeciesName;
  radius: number;
  centreY: number;
  flockSize: [number, number];
  mount: MountSpec;
  /** Wild gaits (m/s): stepping about while idling, moving the herd on, bolting. */
  amble: number;
  travel: number;
  flee: number;
  /** Scare distance walking / when you come fast. */
  wary: [number, number];
  /** Personal space in the herd, and how widely it spreads round its spot (m). */
  space: number;
  spread: number;
  /** Where it likes to be: lower = better, Infinity = never. */
  habitat(s: Site): number;
  /** A flier (hovers and drifts instead of walking). */
  flier?: { alt: [number, number]; rests?: boolean };
  /** Coats (tints), and a rare one with its chance. */
  coats: string[];
  rare?: [string, number];
  /** Stride length at a walk (m), for the leg cycle. */
  strideLen: number;
  /** How widely the rider's knees straddle it. */
  seatSpread: number;
  /** Wild herds kept around (x the manager's density) and seconds between newcomers. */
  herds: number;
  every: [number, number];
  /** Space on the prompt. */
  verb: string;
}

const tv = new THREE.Vector3();
const tv2 = new THREE.Vector3();
const seatPos = new THREE.Vector3();
const seatQuat = new THREE.Quaternion();
export const WHITE = new THREE.Color(1, 1, 1);
export const frac = (x: number) => x - Math.floor(x);
export const lerp = THREE.MathUtils.lerp;
export const clamp = THREE.MathUtils.clamp;

/** Keep off the story cabin's yard and the beacon towers' hilltops. */
const BASE_CLEAR = 80;
const TOWER_CLEAR = 55;

/**
 * One leg's swing for a stride phase: [upper, lower] angles. Planted for the
 * first `duty` of the cycle (sweeping back under the body), then lifted and
 * carried forward with the lower leg folding.
 */
export function swing(ph: number, duty: number, sweep: number, flex: number): [number, number] {
  if (ph < duty) return [lerp(-sweep, sweep, ph / duty), 0];
  const u = (ph - duty) / (1 - duty);
  const s = u * u * (3 - 2 * u);
  return [lerp(sweep, -sweep * 1.1, s), Math.sin(u * Math.PI) * flex];
}

/** A soft cap blanket for the back: part of an ellipsoid, with a pad. Local origin = the ellipsoid's centre. */
export function saddleGeometry(rx: number, ry: number, rz: number, cloth: string, trim: string, pad = '#7a4a36', reach = 0.5) {
  const blanket = new THREE.SphereGeometry(1, 36, 8, 0, Math.PI * 2, 0, reach).scale(rx * 1.04, ry * 1.04, rz * 1.04);
  const hem = new THREE.TorusGeometry(1, 0.035 / Math.max(rx, rz), 5, 40).rotateX(Math.PI / 2);
  hem.scale(rx * 1.05 * Math.sin(reach), 1, rz * 1.05 * Math.sin(reach)).translate(0, ry * 1.04 * Math.cos(reach), 0);
  const seat = new THREE.SphereGeometry(1, 20, 6, 0, Math.PI * 2, 0, 0.3).scale(rx * 1.08, ry * 1.1, rz * 0.9);
  return merge([colored(blanket, cloth), colored(hem, trim), colored(seat, pad)]);
}

/** A rope loop for the lasso. */
export function collarGeometry(r: number) {
  return colored(new THREE.TorusGeometry(r, 0.035, 6, 28).rotateX(Math.PI / 2), '#c9a26b');
}

/** Four legs: where they hang from the body, their segment lengths and the hind hock's fold. */
export interface LegSpec {
  front: THREE.Vector3;
  hind: THREE.Vector3;
  fu: number;
  fl: number;
  hu: number;
  hl: number;
  /** Rest bend at the hind hock (rad). */
  fold: number;
}

export interface LegSet {
  up: THREE.Object3D[];
  lo: THREE.Object3D[];
  spec: LegSpec;
}

/** Leg order: left fore, right fore, left hind, right hind. */
export const LEG4: { hind: boolean; s: number }[] = [{ hind: false, s: 1 }, { hind: false, s: -1 }, { hind: true, s: 1 }, { hind: true, s: -1 }];
/** Footfall phase offsets per leg. */
export const GAIT = {
  walk: [0.25, 0.75, 0, 0.5],
  trot: [0, 0.5, 0.5, 0],
  gallop: [0.48, 0.6, 0.0, 0.1],
  /** Rabbits: the forefeet land together, then the hind feet pass them. */
  bound: [0.5, 0.56, 0.0, 0.04],
  /** All four at once (a goat's springing pronk). */
  pronk: [0, 0.02, 0.04, 0.06],
};

/** Blend gait offsets. */
export function mixGait(a: number[], b: number[], k: number) {
  return a.map((v, i) => lerp(v, b[i], k));
}

export abstract class Beast implements Species {
  readonly name: SpeciesName;
  readonly radius: number;
  readonly centreY: number;
  readonly flockSize: [number, number];
  readonly mount: MountSpec;
  readonly batches: PartBatch[] = [];
  readonly herds: number;
  readonly every: [number, number];
  readonly verb: string;
  protected cfg: BeastConfig;
  private coats: THREE.Color[];
  private rareCoat: THREE.Color | null;

  constructor(cfg: BeastConfig) {
    this.cfg = cfg;
    this.name = cfg.name;
    this.radius = cfg.radius;
    this.centreY = cfg.centreY;
    this.flockSize = cfg.flockSize;
    this.mount = cfg.mount;
    this.herds = cfg.herds;
    this.every = cfg.every;
    this.verb = cfg.verb;
    this.coats = cfg.coats.map((h) => new THREE.Color(h));
    this.rareCoat = cfg.rare ? new THREE.Color(cfg.rare[0]) : null;
  }

  /** Make a batch and remember it. */
  protected batch(geo: THREE.BufferGeometry, look: ConstructorParameters<typeof PartBatch>[1], per = 1, max = 16) {
    const b = new PartBatch(geo, look, max * per);
    this.batches.push(b);
    return b;
  }

  // ------------------------------------------------------------ species hooks

  /** Build the skeleton under d.root / d.body and register what's drawn. */
  protected abstract build(d: BeastData, m: Mob): void;
  /** Pose the skeleton for this frame (base pose of root/body is already set). */
  protected abstract pose(m: Mob, d: BeastData, a: Anim, ctx: MobCtx): void;
  /** Feet (node, local tip) that must never sink into the ground. */
  protected feet(_d: BeastData): [THREE.Object3D, THREE.Vector3][] {
    return [];
  }

  /** Where the feet stand: the ground, or wading / swimming in deep water. */
  floor(ctx: MobCtx, x: number, z: number) {
    return Math.max(ctx.gen.height(x, z), ctx.surface(x, z) - 1.25);
  }

  // ------------------------------------------------------------ helpers for build

  protected draw(d: BeastData, b: PartBatch, o: THREE.Object3D, opts: { tint?: boolean; eye?: boolean; when?: 0 | 1 | 2 } = {}) {
    d.draws.push({ b, o, tint: opts.tint ?? true, eye: !!opts.eye, when: opts.when ?? 0 });
    return o;
  }

  protected node(d: BeastData, name: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    d.n[name] = o;
    return o;
  }

  /**
   * Walk / trot / run blended by speed (the stelk's scheme): footfall
   * offsets, how long a foot stays down, how far legs swing and fold, and
   * the body's bounce and rock for this frame.
   */
  protected gaitMix(d: BeastData, a: Anim, trotAt: number, runAt: number, run = GAIT.gallop) {
    const sp: Spring = (d.s.gait ??= new Spring(0));
    const g = sp.step(a.speed < trotAt ? 0 : a.speed < runAt ? 1 : 2, 30, 11, a.dt);
    const wT = clamp(1 - Math.abs(g - 1), 0, 1), wG = clamp(g - 1, 0, 1), wW = clamp(1 - g, 0, 1);
    const offs = GAIT.walk.map((v, i) => wW * v + wT * GAIT.trot[i] + wG * run[i]);
    const c = a.cyc * Math.PI * 2;
    return {
      offs, wW, wT, wG,
      duty: wW * 0.64 + wT * 0.46 + wG * 0.36,
      sweep: wW * 0.34 + wT * 0.44 + wG * 0.7,
      flex: wW * 0.75 + wT * 1.1 + wG * 1.4,
      bounce: (wW * Math.abs(Math.sin(c)) * 0.03 + wT * Math.abs(Math.sin(c)) * 0.07 + wG * (Math.sin(c - 0.4) * 0.5 + 0.5) * 0.14) * a.moving,
      rock: wG * a.moving * Math.sin(c + 0.9) * 0.1,
    };
  }

  /** Four legs from four batches (fore upper, fore lower, hind upper, hind lower). */
  protected makeLegs(d: BeastData, spec: LegSpec, b: PartBatch[], parent: THREE.Object3D = d.body): LegSet {
    const set: LegSet = { up: [], lo: [], spec };
    for (let k = 0; k < 4; k++) {
      const L = LEG4[k];
      const P = L.hind ? spec.hind : spec.front;
      const up = this.node(d, `up${k}`, parent, L.s * P.x, P.y, P.z);
      const lo = this.node(d, `lo${k}`, up, 0, -(L.hind ? spec.hu : spec.fu), 0);
      this.draw(d, b[L.hind ? 2 : 0], up);
      this.draw(d, b[L.hind ? 3 : 1], lo);
      set.up.push(up);
      set.lo.push(lo);
    }
    return set;
  }

  /** The feet of a leg set (lower-leg tips). */
  protected legFeet(set: LegSet): [THREE.Object3D, THREE.Vector3][] {
    return set.lo.map((o, k) => [o, new THREE.Vector3(0, -(LEG4[k].hind ? set.spec.hl : set.spec.fl), 0)]);
  }

  /**
   * Pose four legs for a stride: planted and sweeping back, then lifted and
   * carried forward; hind legs fold the other way at the hock. Tucked in the
   * air, paddling when swimming, and counter-rotated against the body pitch.
   */
  protected poseLegs(set: LegSet, a: Anim, offs: number[], duty: number, sweep: number, flex: number, pitch: number) {
    const fold = set.spec.fold;
    for (let k = 0; k < 4; k++) {
      const L = LEG4[k];
      const [up, lo] = swing(frac(a.stride + offs[k]), duty, sweep * a.moving, flex * a.moving);
      const u = set.up[k], l = set.lo[k];
      const p = up - pitch * 0.85;
      if (L.hind) {
        u.rotation.set(fold + p * 0.9 + lo * 0.25, 0, 0);
        l.rotation.set(-fold - lo * 0.9 - p * 0.2, 0, 0);
      } else {
        u.rotation.set(p - lo * 0.3, 0, 0);
        l.rotation.set(lo * 1.1, 0, 0);
      }
      if (a.air > 0.01) {
        u.rotation.x = lerp(u.rotation.x, L.hind ? 0.9 : -1.0, a.air);
        l.rotation.x = lerp(l.rotation.x, L.hind ? -0.2 : 1.8, a.air);
      }
      if (a.wet > 0.01) {
        const pp = Math.sin(a.t * 3.6 + offs[k] * Math.PI * 2);
        u.rotation.x = lerp(u.rotation.x, (L.hind ? fold : 0) + pp * 0.5, a.wet);
        l.rotation.x = lerp(l.rotation.x, (L.hind ? -fold - 0.4 : 0.6) + pp * 0.4, a.wet);
      }
      u.rotation.z = -L.s * a.bank * 0.3;
    }
  }

  // ------------------------------------------------------------ places

  private nearBase(gen: WorldGen, x: number, z: number) {
    const s = gen.story;
    return Math.hypot(x - s.x, z - s.z) < BASE_CLEAR || gen.towerDist(x, z, 120) < TOWER_CLEAR;
  }

  site(gen: WorldGen, x: number, z: number, night: number): Site {
    const h = gen.height(x, z);
    const slope = Math.abs(gen.height(x + 3, z) - h) + Math.abs(gen.height(x, z + 3) - h);
    const forest = gen.forestDensity(x, z, h);
    return { x, z, h, slope, forest, bog: gen.bog(x, z), glimmer: gen.glimmer(x, z, forest), hollow: gen.hollow(x, z), rock: gen.rockiness(x, z, h), night };
  }

  private score(ctx: MobCtx, x: number, z: number) {
    if (this.nearBase(ctx.gen, x, z)) return Infinity;
    return this.cfg.habitat(this.site(ctx.gen, x, z, ctx.night ?? 0));
  }

  private findSpot(ctx: MobCtx, from: THREE.Vector3, away: THREE.Vector3 | null, rnd: () => number, out: THREE.Vector3, rMin: number, rMax: number, tries = 14) {
    let best = Infinity;
    const base = away ? Math.atan2(from.x - away.x, from.z - away.z) : rnd() * Math.PI * 2;
    for (let k = 0; k < tries; k++) {
      const a = base + (rnd() - 0.5) * (away ? 1.4 : Math.PI * 2);
      const r = rMin + rnd() * (rMax - rMin);
      const x = from.x + Math.sin(a) * r, z = from.z + Math.cos(a) * r;
      const s = this.score(ctx, x, z) + rnd() * 0.3;
      if (s < best) { best = s; out.set(x, ctx.gen.height(x, z), z); }
    }
    return best < 2;
  }

  launch(f: Flock, ctx: MobCtx, rnd: () => number, initial: boolean): boolean {
    const p = ctx.player.pos;
    const fd = f.data;
    fd.spot = new THREE.Vector3();
    for (let k = 0; k < 3; k++) {
      if (!this.findSpot(ctx, p, null, rnd, fd.spot, initial ? 60 : 130, initial ? 280 : 300)) continue;
      if (ctx.hidden && !ctx.hidden(fd.spot.x, fd.spot.y + 2, fd.spot.z, 10)) continue;
      this.settle(f, fd.spot, rnd);
      return true;
    }
    return false;
  }

  /** Start a herd idling at a spot (also the debug spawn). */
  settle(f: Flock, at: THREE.Vector3, rnd: () => number) {
    const fd = f.data;
    fd.spot = at.clone();
    fd.mode = 'graze';
    fd.relocate = 40 + rnd() * 80;
    fd.facing = rnd() * Math.PI * 2;
    f.centre.copy(at);
    f.target.copy(at);
  }

  initMob(m: Mob, _i: number, f: Flock, ctx: MobCtx) {
    const r = m.rnd;
    const o = () => new THREE.Object3D();
    const d: BeastData = {
      root: o(), body: o(), head: o(), seat: o(), collar: o(), n: {}, draws: [],
      act: 'graze', idle: r() * 4, goal: null, slot: new THREE.Vector2(), face: null, speed: 0,
      alt: 0, drift: r() * 10, rest: 0,
      a: { t: r() * 10, dt: 0, fwd: 0, speed: 0, moving: 0, stride: r(), cyc: 0, turn: 0, bank: 0, slope: 0, air: 0, wet: 0, graze: 0, lookYaw: 0, alert: 0, joy: 0, caught: false, gs: null, vy: 0 },
      prevHeading: 0, pitch: new Spring(), bankS: new Spring(), headYaw: 0, blinkAt: r() * 4,
      look: new THREE.Vector2(), lookAt: null, eye: new THREE.Vector4(0, 0, 1, 0), lift: 0, gs: null, hidden: false, s: {},
    };
    d.root.add(d.body);
    d.body.position.y = this.centreY;
    this.build(d, m);
    m.data = d;
    const a = r() * Math.PI * 2, rr = this.cfg.spread * (0.3 + Math.sqrt(r()) * 0.7);
    d.slot.set(Math.cos(a) * rr, Math.sin(a) * rr);
    const x = f.centre.x + d.slot.x, z = f.centre.z + d.slot.y;
    m.pos.set(x, this.floor(ctx, x, z), z);
    m.heading = (f.data.facing ?? 0) + (r() - 0.5) * 2.2;
    d.prevHeading = m.heading;
    m.grounded = true;
    const fl = this.cfg.flier;
    if (fl) {
      d.alt = fl.alt[0] + r() * (fl.alt[1] - fl.alt[0]);
      if (!(fl.rests && (ctx.night ?? 0) < 0.4)) { m.pos.y += d.alt; m.grounded = false; }
    }
    // A herd shares a coat, with the odd one out; now and then a rare one.
    f.data.coat ??= Math.floor((f.data.rnd as () => number)() * this.coats.length);
    const coat = r() < 0.75 ? f.data.coat : Math.floor(r() * this.coats.length);
    const rare = this.rareCoat && r() < this.cfg.rare![1];
    m.tint.copy(rare ? this.rareCoat! : this.coats[coat]).multiplyScalar(0.96 + r() * 0.08);
  }

  // ------------------------------------------------------------ brains

  thinkFlock(f: Flock, ctx: MobCtx) {
    const fd = f.data;
    const rnd = fd.rnd as () => number;
    const { player, dt } = ctx;
    const M = f.members;
    const min = this.cfg.space;
    for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {
      const a = M[i], b = M[j];
      tv.subVectors(a.pos, b.pos).setY(0);
      const dd = tv.length();
      if (dd >= min) continue;
      if (dd < 1e-3) tv.set(1, 0, 0);
      tv.setLength(Math.min(min - dd, 2 * dt) * 0.5);
      a.pos.add(tv);
      b.pos.sub(tv);
    }
    let near = Infinity;
    for (const m of M) near = Math.min(near, Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z));
    const fast = Math.hypot(player.vel.x, player.vel.z) > 7 || player.mode === 'ride';
    const scare = fast ? this.cfg.wary[1] : this.cfg.wary[0];
    if (fd.alarm || near < scare) {
      if (fd.mode !== 'flee') {
        fd.mode = 'flee';
        if (!this.findSpot(ctx, f.centre, player.pos, rnd, f.target, 50, 100, 8)) {
          const a = Math.atan2(f.centre.x - player.pos.x, f.centre.z - player.pos.z);
          f.target.set(f.centre.x + Math.sin(a) * 60, 0, f.centre.z + Math.cos(a) * 60);
        }
      }
      fd.fleeT = 4 + rnd() * 3;
      fd.alarm = false;
    }
    if (fd.mode === 'flee') {
      fd.fleeT -= dt;
      tv.subVectors(f.target, f.centre).setY(0);
      const dist = tv.length();
      if (dist > 1) f.centre.addScaledVector(tv.normalize(), Math.min(dist, this.cfg.flee * dt));
      if (fd.fleeT < 0 && (dist < 6 || near > 45)) {
        fd.mode = 'graze';
        fd.spot.copy(f.centre);
        f.target.copy(f.centre);
        fd.relocate = 30 + rnd() * 60;
        for (const m of M) (m.data as BeastData).idle = 0.5 + rnd() * 2;
      }
      return;
    }
    if (fd.mode === 'walk') {
      tv.subVectors(f.target, f.centre).setY(0);
      const dist = tv.length();
      if (dist > 0.5) f.centre.addScaledVector(tv.normalize(), Math.min(dist, this.cfg.travel * 0.9 * dt));
      else {
        fd.mode = 'graze';
        fd.spot.copy(f.target);
        fd.relocate = 40 + rnd() * 80;
      }
      return;
    }
    fd.relocate -= dt;
    if (fd.relocate < 0) {
      if (this.findSpot(ctx, fd.spot, null, rnd, f.target, 25, 70, 8)) fd.mode = 'walk';
      fd.relocate = 40 + rnd() * 60;
    }
  }

  think(m: Mob, ctx: MobCtx, leashIndex: number) {
    const d = m.data as BeastData;
    if (m.ridden) return;
    const { dt, player } = ctx;
    d.lookAt = null;
    const toPlayer = Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z);
    const goal = tv;
    let speed = 0;
    let face: number | null = null;
    d.a.graze = 0;
    let wander: THREE.Vector3 | null = null;

    if (m.state === 'caught') {
      // Hauling against the rope.
      tv2.subVectors(m.pos, player.pos).setY(0).normalize();
      goal.copy(m.pos).addScaledVector(tv2, 3).add(tv2.set(Math.sin(m.stateT * 3) * 2, 0, Math.cos(m.stateT * 2.3) * 2));
      speed = Math.min(3.5, this.cfg.flee * 0.4);
      d.lookAt = player.pos;
    } else if (m.state === 'wild' && m.flock) {
      const f = m.flock;
      const fd = f.data;
      if (fd.mode === 'flee' || fd.mode === 'walk') {
        goal.set(f.centre.x + d.slot.x * 0.8, 0, f.centre.z + d.slot.y * 0.8);
        speed = fd.mode === 'flee' ? this.cfg.flee : this.cfg.travel;
        const lag = Math.hypot(goal.x - m.pos.x, goal.z - m.pos.z);
        if (lag > 6) speed *= fd.mode === 'flee' ? 1.25 : 2;
        d.act = 'look';
        if (fd.mode === 'flee' && toPlayer < 30) d.lookAt = player.pos;
      } else {
        wander = fd.spot as THREE.Vector3;
      }
    } else if (m.leashed) {
      // Trots along behind, fanned out if several.
      const back = 2.2 + this.radius * 2.4 + leashIndex * 2.4;
      const side = (leashIndex % 2 ? -1 : 1) * Math.ceil(leashIndex / 2) * 2.4;
      const sh = Math.sin(player.heading), ch = Math.cos(player.heading);
      goal.set(player.pos.x - sh * back + ch * side, 0, player.pos.z - ch * back - sh * side);
      const dist = Math.hypot(goal.x - m.pos.x, goal.z - m.pos.z);
      speed = Math.min(Math.max(this.cfg.flee, this.mount.walk?.sprint ?? this.mount.fly?.sprint ?? 10) * 1.1, dist * 1.6 + Math.hypot(player.vel.x, player.vel.z) * 0.8);
      if (dist < 1) speed = 0;
      if (toPlayer < 14) d.lookAt = player.pos;
    } else {
      wander = m.stay;
    }
    if (wander) {
      this.forage(m, wander, player.pos, dt);
      goal.copy(d.goal ?? m.pos);
      speed = d.act === 'step' ? this.cfg.amble : 0;
      if (d.act === 'look' && toPlayer < 40) d.lookAt = player.pos;
      if (m.state === 'tamed' && toPlayer < 12) { d.lookAt = player.pos; if (d.act === 'graze') d.act = 'look'; }
      if (d.act === 'graze') d.a.graze = 1;
      face = d.face;
    }
    if (this.cfg.flier) this.hover(m, ctx, goal, speed, !!wander);
    else this.move(m, ctx, goal, speed, face);
  }

  /** Idling: head down a while, a few steps on, a look round. */
  private forage(m: Mob, spot: THREE.Vector3, player: THREE.Vector3, dt: number) {
    const d = m.data as BeastData;
    const r = m.rnd;
    d.idle -= dt;
    if (d.goal && Math.hypot(d.goal.x - m.pos.x, d.goal.z - m.pos.z) < 0.5) { d.goal = null; d.idle = Math.min(d.idle, 0.3); }
    if (d.idle > 0) return;
    const x = r();
    d.face = null;
    if (x < 0.45) {
      d.act = 'graze';
      d.goal = null;
      d.idle = 3 + r() * 7;
    } else if (x < 0.75) {
      d.act = 'step';
      let a = m.heading + (r() - 0.5) * 1.8;
      const ox = m.pos.x - spot.x, oz = m.pos.z - spot.z;
      if (Math.hypot(ox, oz) > this.cfg.spread) a = Math.atan2(-ox, -oz) + (r() - 0.5);
      const px = player.x - m.pos.x, pz = player.z - m.pos.z, pd = Math.hypot(px, pz);
      if (pd < 20 && (Math.sin(a) * px + Math.cos(a) * pz) / pd > 0.3) a += Math.PI * (r() < 0.5 ? 0.6 : -0.6);
      const len = 1.5 + r() * 3.5;
      d.goal = new THREE.Vector3(m.pos.x + Math.sin(a) * len, 0, m.pos.z + Math.cos(a) * len);
      d.idle = 8;
    } else {
      d.act = 'look';
      d.goal = null;
      d.idle = 1.5 + r() * 3.5;
      if (r() < 0.4) d.face = m.heading + (r() - 0.5) * 1.5;
    }
  }

  /** Walk / run toward a goal: the heading carves round, the body follows it. */
  private move(m: Mob, ctx: MobCtx, goal: THREE.Vector3, speed: number, face: number | null) {
    const d = m.data as BeastData;
    const { dt } = ctx;
    const dx = goal.x - m.pos.x, dz = goal.z - m.pos.z;
    const dist = Math.hypot(dx, dz);
    let want = dist > 0.3 ? speed : 0;
    if (dist < 2.5 && speed < 3) want = Math.min(want, dist * 0.8);
    let target = m.heading;
    if (dist > 0.3 && speed > 0) target = Math.atan2(dx, dz);
    else if (face !== null) target = face;
    else if (d.lookAt && d.act !== 'graze') {
      const a = Math.atan2(d.lookAt.x - m.pos.x, d.lookAt.z - m.pos.z);
      const off = Math.atan2(Math.sin(a - m.heading), Math.cos(a - m.heading));
      if (Math.abs(off) > 1.4) target = a - Math.sign(off) * 1.0;
    }
    let dh = target - m.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    want *= 0.3 + 0.7 * Math.max(0, Math.cos(dh));
    const accel = want > d.speed ? (d.speed < 4 ? 4 : 7) : 9;
    d.speed += clamp(want - d.speed, -accel * dt, accel * dt);
    const rate = 3.4 / (1 + d.speed * 0.08);
    m.heading += clamp(dh, -1, 1) * rate * dt * (d.speed < 0.5 ? 0.7 : 1);
    // A shove (the explorer pushing past, a charge) drifts it; otherwise it goes where it faces.
    const sh = Math.sin(m.heading), ch = Math.cos(m.heading);
    const side = m.vel.x * ch - m.vel.z * sh;
    const slip = side * Math.exp(-6 * dt);
    m.vel.set(sh * d.speed + ch * slip, 0, ch * d.speed - sh * slip);
    m.pos.x += m.vel.x * dt;
    m.pos.z += m.vel.z * dt;
    if (ctx.collide && Math.hypot(m.pos.x - ctx.player.pos.x, m.pos.z - ctx.player.pos.z) < 70) ctx.collide(m.pos, m.vel, this.radius * 0.75);
    m.pos.y = this.floor(ctx, m.pos.x, m.pos.z);
    m.grounded = true;
  }

  /**
   * Fliers: drift in slow loops round where they'd be, rising and sinking;
   * by day the ones that rest settle on the ground with their wings shut.
   */
  private hover(m: Mob, ctx: MobCtx, goal: THREE.Vector3, speed: number, idling: boolean) {
    const d = m.data as BeastData;
    const { dt } = ctx;
    const fl = this.cfg.flier!;
    const ground = this.floor(ctx, m.pos.x, m.pos.z);
    const resting = idling && !!fl.rests && (ctx.night ?? 0) < 0.35 && m.state === 'wild' && m.flock?.data.mode === 'graze';
    d.drift += dt;
    let gx = goal.x, gz = goal.z, gy: number;
    if (idling) {
      // Lazy loops about the spot.
      const r = 2.5 + this.cfg.spread * 0.4;
      gx = goal.x + Math.sin(d.drift * 0.23 + m.id.length) * r;
      gz = goal.z + Math.cos(d.drift * 0.19) * r;
      speed = Math.max(speed, 1.6);
    }
    if (resting) {
      d.rest = Math.min(1, d.rest + dt * 0.5);
      gy = ground;
      if (m.pos.y - ground < 0.3) speed = 0;
    } else {
      d.rest = Math.max(0, d.rest - dt * 1.5);
      gy = ground + d.alt + Math.sin(d.drift * 0.7) * 0.8;
      if (m.leashed) gy = Math.max(ground + 1.5, ctx.player.pos.y + 1.5);
    }
    tv2.set(gx - m.pos.x, 0, gz - m.pos.z);
    const dist = tv2.length();
    const want = dist > 0.4 ? Math.min(speed, dist * 1.2) : 0;
    if (dist > 1e-3) tv2.multiplyScalar(want / dist);
    const k = 1 - Math.exp(-1.2 * dt);
    m.vel.x += (tv2.x - m.vel.x) * k;
    m.vel.z += (tv2.z - m.vel.z) * k;
    m.vel.y += ((gy - m.pos.y) * 1.2 - m.vel.y) * (1 - Math.exp(-2 * dt));
    m.pos.addScaledVector(m.vel, dt);
    if (m.pos.y < ground) { m.pos.y = ground; m.vel.y = Math.max(0, m.vel.y); }
    m.grounded = m.pos.y - ground < 0.05;
    const hs = Math.hypot(m.vel.x, m.vel.z);
    if (hs > 0.3) {
      let dh = Math.atan2(m.vel.x, m.vel.z) - m.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      m.heading += dh * (1 - Math.exp(-2 * dt));
    }
    d.speed = hs;
  }

  // ------------------------------------------------------------ animation

  animate(m: Mob, ctx: MobCtx) {
    const d = m.data as BeastData;
    const a = d.a;
    const dt = Math.max(ctx.dt, 1e-4);
    a.dt = dt;
    a.t += dt;
    const e = (k: number) => 1 - Math.exp(-k * dt);
    const sh = Math.sin(m.heading), ch = Math.cos(m.heading);
    a.fwd = m.vel.x * sh + m.vel.z * ch;
    a.speed = Math.abs(a.fwd);
    a.vy = m.vel.y;
    let dh = m.heading - d.prevHeading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    d.prevHeading = m.heading;
    a.turn += (dh / dt - a.turn) * e(6);
    a.gs = m.ridden ? d.gs : null;
    const wetNow = !this.cfg.flier && ctx.gen.height(m.pos.x, m.pos.z) < ctx.surface(m.pos.x, m.pos.z) - 1.25 ? 1 : 0;
    a.wet += (wetNow - a.wet) * e(4);
    const airborne = !m.grounded && (m.ridden || !!this.cfg.flier);
    a.air += ((airborne ? 1 : 0) - a.air) * e(airborne ? 12 : 8);
    a.moving = clamp(a.speed / 0.8, 0, 1);
    const L = this.cfg.strideLen * (1 + a.speed * 0.06);
    a.stride += (a.speed * dt) / L;
    a.cyc = frac(a.stride);
    // Ground pitch under the body.
    if (!this.cfg.flier || m.grounded) {
      const span = Math.max(1, this.radius * 1.4);
      const gA = this.floor(ctx, m.pos.x + sh * span, m.pos.z + ch * span);
      const gB = this.floor(ctx, m.pos.x - sh * span, m.pos.z - ch * span);
      a.slope = a.air > 0.5 ? 0 : Math.atan2(gA - gB, span * 2) * (1 - a.wet);
    } else a.slope = 0;
    a.bank = d.bankS.step(clamp(-a.turn * a.speed * 0.018, -0.25, 0.25), 40, 10, dt);
    a.caught = m.state === 'caught';
    a.joy = m.happy > 0.3 ? Math.sin(Math.min(1, (1.6 - m.happy) / 1.3) * Math.PI) : 0;
    // Looking about.
    let yawT = 0;
    if (d.lookAt) {
      tv.subVectors(d.lookAt, m.pos);
      yawT = clamp(Math.atan2(tv.x * ch - tv.z * sh, tv.x * sh + tv.z * ch), -1.2, 1.2);
    } else if (d.act === 'look' && m.state === 'wild') yawT = Math.sin(a.t * 0.37 + m.heading) * 0.6;
    const run = clamp((a.speed - 6) / 8, 0, 1);
    d.headYaw += (yawT * (1 - run) - d.headYaw) * e(3);
    a.lookYaw = d.headYaw;
    a.alert = d.lookAt ? 1 : 0;

    d.root.position.copy(m.pos);
    d.root.rotation.set(0, m.heading, 0);
    d.body.position.set(0, this.centreY, 0);
    d.body.rotation.set(0, 0, 0);
    d.hidden = false;
    this.pose(m, d, a, ctx);

    // Eyes.
    if (a.t > d.blinkAt + 0.13) d.blinkAt = a.t + 2 + m.rnd() * 5;
    const lids = m.happy > 0 ? -1 : a.t > d.blinkAt ? 0.05 : d.s.lids ?? (a.graze > 0 ? 0.6 : 0.95);
    let lx = 0, ly = 0;
    if (d.lookAt) {
      lx = clamp((yawT - d.headYaw) * 1.6, -1, 1);
      ly = 0.2;
    }
    d.look.x += (lx - d.look.x) * e(10);
    d.look.y += (ly - d.look.y) * e(10);
    d.eye.set(d.look.x, d.look.y, lids, 0);
    d.root.updateMatrixWorld(true);
    // Feet never sink into the ground: on a slope the body rides up by
    // however far the lowest foot would go under.
    const feet = this.feet(d);
    if (feet.length && a.wet < 0.5 && !d.hidden) {
      let pen = 0;
      for (const [o, tip] of feet) {
        tv.copy(tip).applyMatrix4(o.matrixWorld);
        pen = Math.max(pen, this.floor(ctx, tv.x, tv.z) - tv.y);
      }
      d.lift = Math.max(Math.min(pen, 0.8), d.lift * Math.exp(-6 * dt));
      if (d.lift > 1e-3) {
        d.body.position.y += d.lift;
        d.root.updateMatrixWorld(true);
      }
    }
  }

  emit(m: Mob, _dist: number) {
    const d = m.data as BeastData;
    if (d.hidden) return;
    const tamed = m.state === 'tamed';
    const lead = m.state === 'caught' || m.leashed;
    for (const w of d.draws) {
      if (!w.o.visible || (w.when === 1 && !tamed) || (w.when === 2 && !lead)) continue;
      w.b.push(w.o.matrixWorld, w.tint ? m.tint : WHITE, w.eye ? d.eye : undefined);
    }
  }

  attach(m: Mob, toward: THREE.Vector3, out: THREE.Vector3) {
    const d = m.data as BeastData;
    d.collar.getWorldPosition(out);
    tv.subVectors(toward, out).setY(0);
    if (tv.lengthSq() < 1e-4) tv.set(0, 0, 1);
    return out.addScaledVector(tv.normalize(), this.radius * 0.35);
  }

  seat(m: Mob) {
    const d = m.data as BeastData;
    d.seat.getWorldPosition(seatPos);
    d.seat.getWorldQuaternion(seatQuat);
    return { pos: seatPos, quat: seatQuat, spread: this.cfg.seatSpread };
  }

  reset(m: Mob) {
    const d = m.data as BeastData;
    d.goal = null;
    d.act = 'look';
    d.idle = 1 + m.rnd() * 2;
    d.speed = Math.hypot(m.vel.x, m.vel.z);
    d.gs = null;
    m.stay.copy(m.pos);
    // A flier left behind hovers low where it was let go.
    if (this.cfg.flier) d.alt = 1.2 + m.rnd() * 1.5;
  }
}
