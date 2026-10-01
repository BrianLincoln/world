import * as THREE from 'three';
import { Beast, clamp, collarGeometry, lerp, saddleGeometry, type Anim, type BeastData, type LegSet } from './beast';
import type { PartBatch } from './parts';
import { colored, ellipsoid, lathe, limb, merge, mirrorX, sculpt, smooth, tube } from './shapes';
import type { Flock, Mob, MobCtx } from './types';

// The drakitten: a cat, mostly. A round, pony-sized kitten with a head as
// wide as its body, great glossy eyes, a curl of a tail, and a pair of
// small leathery dragon wings it can fly on perfectly well. Its real trick
// is at the other end: it rockets. A jet of fire (plasma, in the pink and
// dark ones) roars out of its behind and it streaks off faster than
// anything else in the sky, trailing puffs of smoke.
//
// Wild ones lounge on sunny open hillsides, sitting up like ornaments, and
// now and then take off to swoop about, looping round their spot in little
// rocket bursts. Rush them and they rocket away. Newcomers arrive in twos
// and threes from out of sight, streaking in high in formation, then flip
// butt-down and land on their rockets side by side like landing boosters;
// when a herd moves on, it hops to the new spot the same way. Ridden, it walks, flies on
// its wings, and Shift lights the rocket (see `fly.rocket` in movement.ts):
// it overheats after a few seconds and sputters until it has cooled.
//
// Coats: pink, dark (with gold eyes), marigold tabby, and a rare cream.
// Each has its own wing membrane and rocket colour.

const CREAM = '#fbf2e6';
const EAR = '#f09ea8';
const NOSE = '#e0848e';
const STRIPE = '#e0712c';
/** Wing bones: a shade deeper than the web (both take the coat's wing colour). */
const BONE = '#c2b6b6';

interface Coat {
  /** Wing membrane, rocket flame, whiskers. */
  wing: string;
  flame: string;
  whisker: string;
  /** Gold eyes instead of ink. */
  iris: boolean;
  tabby: boolean;
}
const COATS: Coat[] = [
  { wing: '#e891b0', flame: '#ff5fae', whisker: '#6a4541', iris: false, tabby: false }, // pink
  { wing: '#6a4b7e', flame: '#8c6bff', whisker: '#e6d8c8', iris: true, tabby: false }, // dark
  { wing: '#e0763a', flame: '#ff7a1e', whisker: '#6a4541', iris: false, tabby: true }, // marigold tabby
];
const RARE: Coat = { wing: '#95c3e4', flame: '#4fc8ff', whisker: '#6a4541', iris: false, tabby: false }; // cream

/** A round bean of a body, the rump a little fuller. */
function barrel(d: THREE.Vector3, out: THREE.Vector3) {
  const rear = smooth(-d.z, -0.2, 0.9);
  return out.set(d.x * 0.5 * (1 + 0.08 * rear), d.y * 0.45 * (1 + 0.05 * rear), d.z * 0.64);
}

/** Tabby dashes over the back: bands round the body's long axis, cut to the top and sides. */
function backStripes() {
  const g: THREE.BufferGeometry[] = [];
  const at: [number, number, number][] = [[0.55, 0.1, 0.8], [0.9, 0.12, 1.0], [1.25, 0.11, 1.05], [1.6, 0.1, 1.0], [1.95, 0.1, 0.85], [2.3, 0.09, 0.6]];
  for (const [th, w, half] of at) {
    const s = new THREE.SphereGeometry(1, 28, 3, Math.PI * 1.5 - half, half * 2, th, w).rotateX(Math.PI / 2);
    g.push(sculpt(s, barrel, 0.008));
  }
  return colored(merge(g.map((x) => x.toNonIndexed())), STRIPE, 0, false);
}

const CRANIUM = new THREE.Vector3(0, 0, 0);
/** Wide and round, the cheeks fuller than the crown (the kawaii head). */
function skull(d: THREE.Vector3, out: THREE.Vector3) {
  const low = smooth(-d.y, -0.4, 0.8);
  return out.set(d.x * 0.5 * (1 + 0.1 * low), d.y * 0.41 - 0.02 * low, d.z * 0.41 * (1 - 0.06 * low));
}

function headGeometry() {
  const head = sculpt(new THREE.SphereGeometry(1, 48, 34), skull);
  const nose = ellipsoid(0.045, 0.03, 0.025, 12, 8).translate(0, -0.075, 0.405);
  return merge([colored(head, '#ffffff', 1), colored(nose, NOSE, 0, false)]);
}

/** Tabby marks on the head: three dashes on the brow, two on each cheek. */
function headStripes() {
  const g: THREE.BufferGeometry[] = [];
  for (const o of [-0.26, 0, 0.26]) {
    const s = new THREE.SphereGeometry(1, 4, 8, Math.PI / 2 + o - 0.05, 0.1, 0.22, o === 0 ? 0.42 : 0.34);
    g.push(sculpt(s, skull, 0.006));
  }
  const cheek: THREE.BufferGeometry[] = [];
  for (const th of [1.62, 1.84]) cheek.push(sculpt(new THREE.SphereGeometry(1, 6, 3, Math.PI - 0.12, 0.34, th, 0.075), skull, 0.006));
  const c = merge(cheek.map((x) => x.toNonIndexed()));
  return colored(merge([...g.map((x) => x.toNonIndexed()), c, mirrorX(c)]), STRIPE, 0, false);
}

function whiskerGeometry() {
  const w: THREE.BufferGeometry[] = [];
  for (const [y0, y1, z1] of [[-0.1, -0.06, 0.24], [-0.15, -0.19, 0.2]]) {
    w.push(tube([[0.36, y0, 0.26], [0.55, (y0 + y1) / 2 + 0.01, 0.26], [0.72, y1, z1]], 0.009, 0.005, '#ffffff', 0, true, 8, 4));
  }
  const g = merge(w);
  return merge([g, mirrorX(g)]);
}

function earGeometry() {
  // A soft rounded triangle, up +y, facing +z; pink inside.
  const prof: [number, number][] = [[0, 0.36], [0.03, 0.35], [0.08, 0.27], [0.14, 0.13], [0.18, 0.02], [0.17, -0.06], [0, -0.07]];
  const ear = lathe(prof, 18).scale(1, 1, 0.42);
  const inner = lathe(prof.map(([r, y]) => [r * 0.6, y * 0.72 + 0.04] as [number, number]), 14).scale(1, 1, 0.22).translate(0, 0, 0.04);
  return merge([colored(ear, '#ffffff'), colored(inner, EAR, 0, false)]);
}

function legGeometry(hind: boolean, upper: boolean) {
  if (upper) {
    return hind
      ? limb([[0, 0.16], [0.19, 0.08], [0.18, -0.1], [0.13, -0.24], [0, -0.3]], '#ffffff')
      : limb([[0, 0.12], [0.14, 0.06], [0.14, -0.1], [0.12, -0.23], [0, -0.3]], '#ffffff');
  }
  const L = 0.28;
  const paw = ellipsoid(0.12, 0.075, 0.14, 14, 10).translate(0, -L + 0.06, 0.03);
  return merge([limb([[0, 0.04], [0.11, 0.02], [0.105, -0.16], [0, -L + 0.08]], '#ffffff'), colored(paw, CREAM, 0, false)]);
}

// The tail: up from the rump and over into a hook (the second inspo cat).
const TAIL: [number, number, number][] = [[0, 0, 0], [0, 0.06, -0.16], [0, 0.26, -0.3], [0, 0.52, -0.32], [0, 0.72, -0.22], [0, 0.78, -0.06], [0, 0.7, 0.04]];
function tailGeometry() {
  return tube(TAIL, 0.085, 0.062, '#ffffff', 0, true, 32, 10);
}
function tailStripes() {
  const curve = new THREE.CatmullRomCurve3(TAIL.map((p) => new THREE.Vector3(...p)));
  const g: THREE.BufferGeometry[] = [];
  for (const t of [0.3, 0.48, 0.66, 0.84]) {
    const pts: [number, number, number][] = [0, 0.5, 1].map((k) => curve.getPointAt(t + k * 0.05).toArray() as [number, number, number]);
    const r = lerp(0.085, 0.062, t) * 1.07;
    g.push(tube(pts, r, r, STRIPE, 0, false, 6, 10));
  }
  return merge(g);
}

// Dragon wings in two pieces: the arm (root to wrist) and the hand (from the
// wrist: three fingers with a scalloped web between). Flat in xz, spanning
// +x, leading edge toward +z; the left wing (the right is mirrored).
const WRIST = new THREE.Vector2(0.6, 0.16);
function scallop(s: THREE.Shape, from: THREE.Vector2, to: THREE.Vector2, toward: THREE.Vector2, depth: number) {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const c = mid.clone().lerp(toward, depth);
  s.quadraticCurveTo(c.x, c.y, to.x, to.y);
  void from;
}

function armGeometry(mirror: boolean) {
  const s = new THREE.Shape();
  const hinge = new THREE.Vector2(0.5, -0.44);
  const root = new THREE.Vector2(0.02, -0.3);
  s.moveTo(0, 0.1);
  s.quadraticCurveTo(0.3, 0.2, WRIST.x, WRIST.y);
  s.lineTo(hinge.x, hinge.y);
  scallop(s, hinge, root, new THREE.Vector2(0.3, 0.1), 0.35);
  s.lineTo(0, 0.1);
  const web = new THREE.ShapeGeometry(s, 16).rotateX(Math.PI / 2);
  const bone = tube([[-0.04, 0, 0.08], [0.3, 0, 0.17], [WRIST.x, 0, WRIST.y]], 0.06, 0.042, BONE, 0, true, 14, 8);
  const g = merge([colored(web, '#ffffff', 0, true).toNonIndexed(), bone]);
  return mirror ? mirrorX(g) : g;
}

/** Local origin at the wrist. */
const TIPS = [new THREE.Vector2(0.74, 0.02), new THREE.Vector2(0.58, -0.42), new THREE.Vector2(0.24, -0.66)];
function handGeometry(mirror: boolean) {
  const s = new THREE.Shape();
  const hinge = new THREE.Vector2(-0.1, -0.6);
  const hub = new THREE.Vector2(0.05, -0.05);
  s.moveTo(0, 0.02);
  s.quadraticCurveTo(0.4, 0.1, TIPS[0].x, TIPS[0].y);
  scallop(s, TIPS[0], TIPS[1], hub, 0.3);
  scallop(s, TIPS[1], TIPS[2], hub, 0.3);
  scallop(s, TIPS[2], hinge, hub, 0.25);
  s.lineTo(0, 0.02);
  const web = new THREE.ShapeGeometry(s, 16).rotateX(Math.PI / 2);
  const bones: THREE.BufferGeometry[] = [];
  for (const [i, t] of TIPS.entries()) {
    const bend = i === 0 ? 0.06 : -0.03;
    bones.push(tube([[0, 0, 0], [t.x * 0.5, 0, t.y * 0.5 + bend], [t.x, 0, t.y]], 0.04, 0.014, BONE, 0, true, 12, 6));
  }
  // A little claw at the wrist.
  const claw = tube([[0.0, 0, 0.02], [0.03, 0, 0.1], [-0.01, 0, 0.14]], 0.03, 0.008, CREAM, 0, false, 8, 5);
  const g = merge([colored(web, '#ffffff', 0, true).toNonIndexed(), ...bones, claw]);
  return mirror ? mirrorX(g) : g;
}

/** The rocket: a teardrop of fire streaming back (-z) from the root. Shaded hot-white in the middle (see paint tag 5). */
function flameGeometry() {
  const prof: [number, number][] = [[0, -0.06], [0.2, -0.02], [0.3, 0.12], [0.29, 0.3], [0.2, 0.56], [0.08, 0.84], [0, 1]];
  const outer = lathe(prof, 20).rotateX(-Math.PI / 2);
  return colored(outer, '#ffffff', 5, true);
}

const tv = new THREE.Vector3();

/**
 * Rocketing in to land: a fast, high cruise toward its pad, then it flips
 * butt-down and comes down on the rocket like a landing booster, falling
 * only as fast as it can still stop, burning hardest just above the ground.
 */
interface Landing {
  phase: 'cruise' | 'burn';
  /** Cruising height over the pad (m). */
  alt: number;
  /** The pad. */
  tx: number;
  tz: number;
  /** 0..1 how hard the rocket is burning. */
  thr: number;
}

export class Drakitten extends Beast {
  private bodyB: PartBatch; private stripeB: PartBatch; private headB: PartBatch; private headStripeB: PartBatch;
  private whiskerB: PartBatch; private earB: PartBatch; private legB: PartBatch[]; private tailB: PartBatch; private tailStripeB: PartBatch;
  private armB: PartBatch[]; private handB: PartBatch[]; private flameB: PartBatch; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'drakitten', radius: 0.75, centreY: 0.8, flockSize: [1, 3],
      mount: {
        name: 'drakitten', radius: 0.6,
        walk: { speed: 4, sprint: 8, takeoff: 8 },
        // Middling on its wings; the rocket is the point.
        fly: { speed: 15, sprint: 15, climb: 9, sink: 0.8, hover: 0, turn: 2.6, ease: 1.8, rocket: { speed: 72, climb: 20, burn: 5, cool: 3.5 } },
      },
      amble: 1.5, travel: 4, flee: 24, wary: [8, 18], space: 2.4, spread: 7,
      // Sunny open hillsides and tors, up out of the woods and the wet.
      habitat: (s) => {
        if (s.h < 10 || s.h > 260 || s.bog > 0.3 || s.forest > 0.35 || s.hollow > 0.3) return Infinity;
        return 0.35 + s.forest * 2 + (1 - clamp(s.rock, 0, 1)) * 0.35 + Math.abs(s.slope - 0.8) * 0.25;
      },
      flier: { alt: [3, 7], rests: true },
      coats: ['#f7cdd0', '#3e3546', '#efac40'], rare: ['#f6eee2', 0.08],
      strideLen: 0.55, seatSpread: 0.78, herds: 1, every: [35, 75], verb: 'rocket',
    });
    const look = { keep: 0.6, softCrease: 0.7 };
    this.bodyB = this.batch(merge([colored(sculpt(new THREE.SphereGeometry(1, 48, 32), barrel), '#ffffff'), colored(sculpt(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), barrel, 0.008), CREAM, 0, false)]), look);
    this.stripeB = this.batch(backStripes(), look);
    this.headB = this.batch(headGeometry(), {
      ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.4, -0.02], eyeSize: [0.25, 0.27], pupil: [0.1, 0.16], lookRange: [0.06, 0.05],
      gloss: 1, iris: '#e6c64a', mouthW: [-0.26, 0.06, 7], blush: [0.66, -0.24, 0.15, 0.09], blushCol: '#f2929c',
    });
    this.headStripeB = this.batch(headStripes(), look);
    this.whiskerB = this.batch(whiskerGeometry(), { keep: 0.7 });
    this.earB = this.batch(earGeometry(), look, 2);
    this.legB = [this.batch(legGeometry(false, true), look, 2), this.batch(legGeometry(false, false), look, 2), this.batch(legGeometry(true, true), look, 2), this.batch(legGeometry(true, false), look, 2)];
    this.tailB = this.batch(tailGeometry(), look);
    this.tailStripeB = this.batch(tailStripes(), look);
    const wl = { ...look, doubleSide: true };
    this.armB = [this.batch(armGeometry(false), wl), this.batch(armGeometry(true), wl)];
    this.handB = [this.batch(handGeometry(false), wl), this.batch(handGeometry(true), wl)];
    this.flameB = this.batch(flameGeometry(), { keep: 0.9 });
    this.saddleB = this.batch(saddleGeometry(0.5, 0.45, 0.62, '#3f7f86', '#efe4d2', '#6e4a33', 0.45), { keep: 0.75, doubleSide: true }, 1, 8);
    this.collarB = this.batch(collarGeometry(0.3), { keep: 0.6 }, 1, 8);
  }

  protected build(d: BeastData) {
    const s = d.s;
    // Per-mob colours for the parts that aren't the coat (set once the coat is known).
    s.wing = new THREE.Color();
    s.flame = new THREE.Color();
    s.whisker = new THREE.Color();
    this.draw(d, this.bodyB, d.body);
    this.draw(d, this.stripeB, this.node(d, 'stripes', d.body));
    const neck = this.node(d, 'neck', d.body, 0, 0.26, 0.46);
    neck.add(d.head);
    d.head.position.set(0, 0.2, 0.14);
    this.draw(d, this.headB, d.head, { eye: true });
    this.draw(d, this.headStripeB, this.node(d, 'headStripes', d.head));
    this.draw(d, this.whiskerB, this.node(d, 'whiskers', d.head), { tint: s.whisker });
    for (let k = 0; k < 2; k++) this.draw(d, this.earB, this.node(d, `ear${k}`, d.head, (k ? -1 : 1) * 0.27, 0.27, -0.04));
    neck.add(d.collar);
    d.collar.position.set(0, 0.02, 0.02);
    d.collar.rotation.x = 0.35;
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    // Wings: the arm at the shoulder, the hand at the wrist.
    for (let k = 0; k < 2; k++) {
      const sx = k ? -1 : 1;
      const arm = this.node(d, `arm${k}`, d.body, sx * 0.3, 0.3, 0.14);
      // Sweep first (in the wing's own plane), then roll up about the body:
      // folded, that stands the wing on edge along the flank.
      arm.rotation.order = 'ZYX';
      this.draw(d, this.armB[k], arm, { tint: s.wing });
      this.draw(d, this.handB[k], this.node(d, `hand${k}`, arm, sx * WRIST.x, 0, WRIST.y), { tint: s.wing });
    }
    const tail = this.node(d, 'tail', d.body, 0, 0.14, -0.58);
    this.draw(d, this.tailB, tail);
    this.draw(d, this.tailStripeB, this.node(d, 'tailStripes', tail));
    this.draw(d, this.flameB, this.node(d, 'flame', d.body, 0, -0.06, -0.6), { tint: s.flame });
    this.draw(d, this.saddleB, this.node(d, 'saddle', d.body, 0, 0.01, -0.1), { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, 0.5, -0.14);
    s.legs = this.makeLegs(d, { front: new THREE.Vector3(0.25, -0.26, 0.34), hind: new THREE.Vector3(0.27, -0.22, -0.34), fu: 0.26, fl: 0.28, hu: 0.26, hl: 0.28, fold: 0.35 }, this.legB);
    s.thr = 0;
    s.zoom = 0;
    s.zoomDir = new THREE.Vector3();
    s.sit = 0;
  }

  /**
   * A new herd (not the ones already there as the world loads) picks a
   * spot it likes within sight of you, and rockets in to it from out of
   * sight, 260 m off.
   */
  launch(f: Flock, ctx: MobCtx, rnd: () => number, initial: boolean) {
    if (initial) return super.launch(f, ctx, rnd, initial);
    const p = ctx.player.pos;
    const spot = new THREE.Vector3();
    for (let k = 0; k < 4; k++) {
      if (!this.findSpot(ctx, p, null, rnd, spot, 50, 170)) continue;
      const from = this.approach(ctx, spot, p, rnd);
      if (!from) continue;
      this.settle(f, spot, rnd);
      f.data.mode = 'arrive';
      f.data.from = from;
      return true;
    }
    return false;
  }

  /** Where to come in from: 260 m out from the pad, mostly from beyond it, out of view. */
  private approach(ctx: MobCtx, spot: THREE.Vector3, player: THREE.Vector3, rnd: () => number) {
    const base = Math.atan2(spot.x - player.x, spot.z - player.z);
    for (let j = 0; j < 8; j++) {
      const a = base + (rnd() - 0.5) * (j < 4 ? 2 : 5);
      const x = spot.x + Math.sin(a) * 260, z = spot.z + Math.cos(a) * 260;
      const y = Math.max(ctx.surface(x, z), ctx.gen.height(spot.x, spot.z)) + 55;
      if (ctx.hidden && !ctx.hidden(x, y, z, 12)) continue;
      return new THREE.Vector3(x, y, z);
    }
    return null;
  }

  /** Debug / shots: send a herd that's sitting somewhere round to come in to land where it is. */
  arrive(f: Flock, ctx: MobCtx, dist = 220) {
    const fd = f.data;
    const from = this.approach(ctx, fd.spot, ctx.player.pos, Math.random) ?? new THREE.Vector3(fd.spot.x + dist, fd.spot.y + 55, fd.spot.z);
    fd.mode = 'arrive';
    for (const m of f.members) this.takeOff(m, f, ctx, from, 55);
  }

  /**
   * Off to land at the herd's spot. Pads are close together (the lead in
   * the middle, the others a couple of metres round it). `from` = start
   * there in formation (arriving from afar); otherwise it lifts off from
   * where it is (a hop).
   */
  private takeOff(m: Mob, f: Flock, ctx: MobCtx, from: THREE.Vector3 | null, alt: number) {
    const d = m.data as BeastData;
    const s = d.s;
    const i = Math.max(0, f.members.indexOf(m));
    const spot = f.data.spot as THREE.Vector3;
    const a = i * 2.3 + (f.data.facing ?? 0), r = i ? 2.4 : 0;
    const tx = spot.x + Math.sin(a) * r, tz = spot.z + Math.cos(a) * r;
    s.fl = { phase: 'cruise', alt: alt + i * 1.5, tx, tz, thr: 1 } as Landing;
    s.nap = false;
    s.zoom = 0;
    if (from) {
      // A loose V: the lead in front, the others back and to either side.
      const hx = tx - from.x, hz = tz - from.z, hl = Math.hypot(hx, hz) || 1;
      const fx = hx / hl, fz = hz / hl;
      const side = (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 4.5, back = Math.ceil(i / 2) * 6;
      m.pos.set(from.x - fx * back + fz * side, from.y + i * 1.5, from.z - fz * back - fx * side);
      m.vel.set(fx * 38, 0, fz * 38);
      m.heading = Math.atan2(fx, fz);
      d.prevHeading = m.heading;
      d.rest = 0;
      s.sit = 0;
    } else m.vel.y = Math.max(m.vel.y, 6);
    m.grounded = false;
  }

  /** The landing flight (see Landing). */
  private landing(m: Mob, ctx: MobCtx) {
    const d = m.data as BeastData;
    const s = d.s;
    const fl = s.fl as Landing;
    const dt = ctx.dt;
    const dx = fl.tx - m.pos.x, dz = fl.tz - m.pos.z;
    const dist = Math.hypot(dx, dz) || 1e-3;
    const ground = this.floor(ctx, m.pos.x, m.pos.z);
    const e = (k: number) => 1 - Math.exp(-k * dt);
    const hs = Math.hypot(m.vel.x, m.vel.z);
    if (fl.phase === 'cruise') {
      // Streak in high, easing off as the pad comes near.
      const sp = Math.min(40, 6 + dist * 0.6);
      const gy = Math.max(this.floor(ctx, fl.tx, fl.tz) + fl.alt * clamp(dist / 90, 0.45, 1), ground + 10);
      m.vel.x += ((dx / dist) * sp - m.vel.x) * e(1.6);
      m.vel.z += ((dz / dist) * sp - m.vel.z) * e(1.6);
      m.vel.y += (clamp((gy - m.pos.y) * 0.9, -12, 14) - m.vel.y) * e(2.5);
      fl.thr = 1;
      if (hs > 0.5) {
        const dh = Math.atan2(m.vel.x, m.vel.z) - m.heading;
        m.heading += Math.atan2(Math.sin(dh), Math.cos(dh)) * e(3);
      }
      // Over the pad (and slowed): flip and come down.
      if (dist < 6 + hs * 0.5) fl.phase = 'burn';
    } else {
      // Drift onto the pad, holding height until over it; then fall no
      // faster than it can stop (a 5 m/s2 burn), so the rocket roars
      // hardest in the last few metres.
      const h = Math.max(0, m.pos.y - ground);
      const vh = Math.min(dist * 1.1, 9);
      m.vel.x += ((dx / dist) * vh - m.vel.x) * e(2.2);
      m.vel.z += ((dz / dist) * vh - m.vel.z) * e(2.2);
      const over = clamp(1.4 - dist / 5, 0.15, 1);
      const vy = -clamp(Math.sqrt(2 * 5 * Math.max(0, h - 0.1)), 0.9, 24) * over;
      m.vel.y += (vy - m.vel.y) * e(3.5);
      fl.thr = lerp(0.35, 1, clamp(1 - (h - 1) / 10, 0, 1));
    }
    m.pos.addScaledVector(m.vel, dt);
    if (m.pos.y <= ground + 0.02 && fl.phase === 'burn') {
      // Touchdown: a ring of dust and a little squash, and it sits down to bask.
      m.pos.y = ground;
      m.vel.set(0, 0, 0);
      m.grounded = true;
      s.fl = null;
      s.nap = true;
      s.napT = 25 + m.rnd() * 30;
      s.landT = 0.5;
      d.rest = 1;
      tv.copy(m.pos).setY(ground + 0.1);
      ctx.puff(tv, 12, 0.3, 3.2);
      return;
    }
    if (m.pos.y < ground + 1) { m.pos.y = Math.max(m.pos.y, ground); if (fl.phase === 'cruise') m.vel.y = Math.max(m.vel.y, 2); }
    m.grounded = false;
    d.speed = Math.hypot(m.vel.x, m.vel.z);
  }

  /** A herd moving on hops to its new spot on its rockets; an arrival's done when all are down. */
  thinkFlock(f: Flock, ctx: MobCtx) {
    const fd = f.data;
    const was = fd.mode;
    super.thinkFlock(f, ctx);
    if (fd.mode === 'walk' && was !== 'walk') {
      fd.mode = 'arrive';
      fd.spot.copy(f.target);
      f.centre.copy(f.target);
      for (const m of f.members) if (m.state === 'wild') this.takeOff(m, f, ctx, null, 18 + (fd.rnd as () => number)() * 8);
    }
    if (fd.mode === 'arrive' && f.members.every((m) => !(m.data as BeastData).s.fl)) fd.mode = 'graze';
  }

  initMob(m: Mob, i: number, f: Flock, ctx: MobCtx) {
    super.initMob(m, i, f, ctx);
    const d = m.data as BeastData;
    d.s.zoomCd = 3 + m.rnd() * 6;
    this.paint(m);
    if (f.data.mode === 'arrive' && f.data.from) this.takeOff(m, f, ctx, f.data.from, 55);
    // A lounger or a flier to begin with.
    d.s.napT = 4 + m.rnd() * 20;
    d.s.nap = m.grounded;
  }

  /** Debug / shots: repaint a drakitten in coat `i` (0 pink, 1 dark, 2 tabby, -1 the rare cream). */
  setCoat(m: Mob, i: number) {
    const d = m.data as BeastData;
    d.s.coat = i;
    m.tint.set(i < 0 ? this.cfg.rare![0] : this.cfg.coats[i]);
    this.paint(m);
  }

  private paint(m: Mob) {
    const d = m.data as BeastData;
    const c = d.s.coat < 0 ? RARE : COATS[d.s.coat];
    d.s.wing.set(c.wing);
    d.s.flame.set(c.flame);
    d.s.whisker.set(c.whisker);
    d.s.iris = c.iris ? 1 : 0;
    for (const n of ['stripes', 'headStripes', 'tailStripes']) d.n[n].visible = c.tabby;
  }

  protected feet(d: BeastData) {
    return this.legFeet(d.s.legs as LegSet);
  }

  /**
   * Wild ones take turns: a long lounge on the ground, then up for a swoop
   * about the spot. Tamed ones left to wait sit down where they're left.
   */
  protected resting(m: Mob, ctx: MobCtx, idling: boolean) {
    if (!idling) return false;
    if (m.state === 'tamed') return true;
    const s = (m.data as BeastData).s;
    s.napT -= ctx.dt;
    if (s.napT < 0) {
      s.nap = !s.nap;
      s.napT = s.nap ? 18 + m.rnd() * 30 : 12 + m.rnd() * 18;
    }
    const mode = m.flock?.data.mode;
    return s.nap && (mode === 'graze' || mode === 'arrive');
  }

  think(m: Mob, ctx: MobCtx, leashIndex: number) {
    const d = m.data as BeastData;
    const s = d.s;
    const dt = ctx.dt;
    // Landing (lassoed, spooked or ridden, it's off).
    if (s.fl && (m.state !== 'wild' || m.ridden || m.flock?.data.mode !== 'arrive')) s.fl = null;
    if (s.fl) this.landing(m, ctx);
    else super.think(m, ctx, leashIndex);
    // A smoke trail behind anything going at a rocket's pace.
    if (s.thr > 0.3 && ctx.trail) {
      s.trailT = (s.trailT ?? 0) - dt;
      if (s.trailT <= 0) {
        s.trailT = 0.035;
        d.n.flame.getWorldPosition(tv);
        ctx.trail(tv.addScaledVector(m.vel, -0.03), 0.3 + 0.2 * s.thr);
      }
    }
    if (m.ridden) return;
    // Swooping about its spot: now and then a rocket burst, curving back
    // round toward the middle, so it loops rather than leaves.
    const free = m.state === 'wild' && !m.grounded && d.rest < 0.1 && m.flock?.data.mode === 'graze';
    s.zoomCd -= dt;
    if (s.zoom <= 0 && free && s.zoomCd < 0 && m.pos.y - ctx.gen.height(m.pos.x, m.pos.z) > 2) {
      s.zoom = 0.9 + m.rnd() * 1.1;
      s.zoomCd = 5 + m.rnd() * 9;
      s.zoomDir.set(Math.sin(m.heading), 0, Math.cos(m.heading));
    }
    if (s.zoom > 0) {
      s.zoom -= dt;
      const spot = m.flock?.data.spot as THREE.Vector3 | undefined;
      if (spot) {
        // Turn toward the spot at a fixed rate: a loop ~15 m across.
        const want = Math.atan2(spot.x - m.pos.x, spot.z - m.pos.z);
        const cur = Math.atan2(s.zoomDir.x, s.zoomDir.z);
        const dh = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        const a = cur + clamp(dh, -1.8 * dt, 1.8 * dt);
        s.zoomDir.set(Math.sin(a), 0, Math.cos(a));
      }
      m.vel.addScaledVector(s.zoomDir, 30 * dt);
      m.vel.y += 3 * dt;
      if (!free) s.zoom = 0;
    }
  }

  animate(m: Mob, ctx: MobCtx) {
    super.animate(m, ctx);
    const d = m.data as BeastData;
    d.eye.w = d.s.iris;
  }

  protected pose(m: Mob, d: BeastData, a: Anim) {
    const t = a.t;
    const s = d.s;
    const flying = !m.grounded;
    const gs = a.gs;
    // Rocket thrust: the rider's burn, or a wild one's burst / bolt.
    const fl = s.fl as Landing | null;
    const want = gs ? gs.rocket : fl ? fl.thr : s.zoom > 0 ? 1 : flying ? clamp((Math.hypot(m.vel.x, m.vel.z) - 10) / 6, 0, 1) : 0;
    // Stood on its tail for a rocket landing: butt (and flame) straight down.
    s.upr = (s.upr ?? 0) + ((fl?.phase === 'burn' ? 1 : 0) - (s.upr ?? 0)) * (1 - Math.exp(-3 * a.dt));
    const upr = s.upr as number;
    s.landT = Math.max(0, (s.landT ?? 0) - a.dt);
    s.thr += (want - s.thr) * (1 - Math.exp(-(want > s.thr ? 10 : 5) * a.dt));
    const thr = s.thr;
    // Sitting up (lounging, or waiting where it was left).
    const sitNow = !flying && !m.ridden && a.speed < 0.4 && (d.rest > 0.5 || m.state === 'tamed');
    s.sit += ((sitNow ? 1 : 0) - s.sit) * (1 - Math.exp(-4 * a.dt));
    const sit = s.sit;

    // Body: pitched into the climb, stretched out long in a rocket burst,
    // upright when sitting.
    const g = this.gaitMix(d, a, 3, 6);
    const fly = a.air;
    const climb = flying ? clamp(-a.vy * 0.04, -0.4, 0.4) : 0;
    const pitch = d.pitch.step(lerp(-a.slope * 0.8 + g.rock, climb * (1 - thr) + thr * 0.08, fly) - sit * 0.62 - a.joy * 0.25 + (a.caught ? Math.sin(m.stateT * 6) * 0.2 : 0), 45, 10, a.dt);
    d.body.position.y += g.bounce * (1 - fly) - sit * 0.1 + a.joy * 0.2 + (flying ? Math.sin(t * 2.2) * 0.04 * (1 - thr) : 0);
    d.body.position.z = -sit * 0.1;
    const bodyPitch = lerp(pitch, -1.45, upr);
    d.body.rotation.set(bodyPitch, 0, a.bank * (flying ? 1.8 : 1) * (1 - upr));
    // Squash on touchdown.
    const squash = Math.sin((s.landT / 0.5) * Math.PI) * 0.12;
    d.body.scale.set(1 - thr * 0.06 * (1 - upr) + squash, 1 - thr * 0.06 * (1 - upr) - squash, 1 + thr * 0.12 * (1 - upr));

    // Legs: trotting on the ground; tucked in the air, stretched out behind
    // in a burst; folded under when it sits.
    const legs = s.legs as LegSet;
    this.poseLegs(legs, a, g.offs, g.duty, g.sweep, g.flex, pitch);
    for (let k = 0; k < 4; k++) {
      const hind = k > 1;
      const u = legs.up[k], l = legs.lo[k];
      if (thr > 0.01 && flying) {
        u.rotation.x = lerp(u.rotation.x, hind ? 1.3 : -1.2, thr);
        l.rotation.x = lerp(l.rotation.x, hind ? 0.2 : 0.3, thr);
      }
      if (upr > 0.01) {
        // Landing legs: all four reaching down (the body's -z is down now), splayed.
        u.rotation.x = lerp(u.rotation.x, hind ? 1.45 : 1.15, upr);
        l.rotation.x = lerp(l.rotation.x, hind ? -0.1 : 0.15, upr);
        u.rotation.z = lerp(u.rotation.z, (k % 2 ? -1 : 1) * 0.35, upr);
      }
      if (sit > 0.01) {
        // Forelegs straight down under the chest, haunches folded flat.
        u.rotation.x = lerp(u.rotation.x, hind ? -1.3 + 0.62 : 0.62 - 0.05, sit);
        l.rotation.x = lerp(l.rotation.x, hind ? 1.6 : 0, sit);
      }
    }

    // Wings: folded on the back on the ground, beating in the air, swept
    // back tight as a dart when the rocket's lit.
    s.flap = (s.flap ?? 0) + a.dt * (flying ? 2.1 + Math.max(0, -climb) * 1.5 : 0);
    const beat = Math.sin(s.flap * Math.PI * 2);
    const lag = Math.sin(s.flap * Math.PI * 2 - 0.9);
    const wingUp = lerp(lerp(1.35, 0.15 + beat * 0.75, fly), 0.12, thr * fly);
    const sweep = lerp(lerp(1.4, -beat * 0.12, fly), 0.95, thr * fly);
    const fold = lerp(lerp(2.2, 0.1 - lag * 0.45, fly), 0.35, thr * fly);
    const joy = a.joy > 0 ? Math.sin(t * 14) * 0.4 * a.joy : 0;
    for (let k = 0; k < 2; k++) {
      const sx = k ? -1 : 1;
      // Landing: held out flat and steady, trimming like fins.
      const fin = Math.sin(t * 9 + k) * 0.05;
      d.n[`arm${k}`].rotation.set(0, sx * lerp(sweep, 0.25, upr), sx * (lerp(wingUp, 0.05 + fin, upr) + joy));
      d.n[`hand${k}`].rotation.set(0, sx * lerp(fold, 0.25, upr), sx * lerp(0, lag * 0.3, fly * (1 - thr)) * (1 - upr));
    }

    // Head: upright when sitting, level in flight; looks about; ears laid
    // back at speed.
    const run = Math.max(thr, clamp((a.speed - 6) / 10, 0, 1));
    d.n.neck.rotation.set(-bodyPitch * 0.9 + thr * 0.2 * (1 - upr), a.lookYaw * 0.4, 0);
    d.head.rotation.set(-0.05 - a.alert * 0.08 + Math.sin(a.stride * Math.PI * 4) * 0.04 * a.moving, a.lookYaw * 0.5, Math.sin(t * 0.7) * 0.08 * (1 - run) + a.bank * 0.4);
    for (let k = 0; k < 2; k++) {
      const sx = k ? -1 : 1;
      const twitch = Math.max(0, Math.sin(t * 1.3 + k * 2.1) - 0.93) * 6;
      d.n[`ear${k}`].rotation.set(-0.1 - run * 0.9 + twitch * 0.25, 0, -sx * (0.32 + run * 0.4 + twitch * 0.1));
    }

    // Tail: a lazy sway, streaming out behind in flight, curled round when sitting.
    const tail = d.n.tail;
    const sway = Math.sin(t * 1.6) * 0.25 * (1 - run);
    tail.rotation.set(lerp(lerp(0.05, 0.6, fly), 1.2, run) + sit * 0.5 + Math.sin(t * 2.3) * 0.05, sway, sway * 0.4 + sit * 0.3);

    // The rocket: roaring and flickering, longer the harder it burns.
    const flame = d.n.flame;
    flame.visible = thr > 0.03;
    if (flame.visible) {
      const fl = 1 + 0.18 * Math.sin(t * 43) + 0.12 * Math.sin(t * 71 + 1.3);
      const w = 0.6 + 0.5 * thr;
      flame.scale.set(w * (1 + 0.08 * Math.sin(t * 57)), w * (1 + 0.08 * Math.sin(t * 61)), thr * 1.5 * fl + 0.15);
    }
    s.lids = d.rest > 0.5 && sit > 0.8 ? 0.55 + Math.sin(t * 0.3) * 0.1 : undefined;
  }
}
