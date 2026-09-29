import * as THREE from 'three';
import type { MountSpec } from '../player/movement';
import type { WorldGen } from '../world/worldgen';
import { colored, furBall, lathe, merge, mirrorX, PartBatch, Spring } from './parts';
import type { Flock, Mob, MobCtx, Species } from './types';

// The crow: a big storybook raven (big enough to ride). Deliberately between
// the floof's roundness and a real corvid: a plump egg body and a large round
// head with the same painted eyes, but the silhouette cues that say "crow" —
// a heavy hooked beak, shaggy throat, fingered wingtips, a fanned tail, and
// hopping. Flocks of 3–8 forage on open ground and take off in a clatter when
// you get close, circle, and land somewhere else.

const S = 1.4; // overall scale (a rider has to fit)
const INK = '#58536f';
const BEAK = '#8d8392';
const LEG = '#5a5058';
const ROPE = '#c9a26b';
const LEATHER = '#6e4a33';
const BRASS = '#d9b36a';
const TINTS = ['#ffffff', '#f4eef6', '#eef0f8', '#fbf2ec'].map((h) => new THREE.Color(h));
const MAX = 64;
/** Crows won't touch down within this many metres of the story cabin (they still fly over). */
const BASE_CLEAR = 80;
/** Keep off a beacon tower's hilltop: its stack, doorway and room are within ~35 m. */
const TOWER_CLEAR = 55;

/** Body frame: body centre at the origin, +z forward, y up. */
const BODY_Y = 0.78;
const NECK = new THREE.Vector3(0, 0.28, 0.4);
const HEAD_C = new THREE.Vector3(0, 0.16, 0.1);
const HEAD_R = 0.3;
const SHOULDER = new THREE.Vector3(0.3, 0.2, 0.18);
const HIP = new THREE.Vector3(0.14, -0.3, -0.02);

export const crowStyle = { plump: 0.4 };

function bodyGeometry(plump: number) {
  const rx = 0.42 + 0.14 * plump;
  const rz = 0.66 - 0.08 * plump;
  const back = new THREE.Vector3();
  const body = furBall({
    tufts: 70, amp: 0.05, sweep: 0.09, width: 1.1, seed: 5,
    comb: (d, out) => {
      back.set(0, -0.1, -1);
      return out.copy(back).addScaledVector(d, -d.dot(back)).normalize();
    },
  });
  // Egg: taper toward the tail.
  const pos = body.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const k = z < 0 ? 1 - 0.38 * Math.pow(-z, 1.5) : 1 + 0.04 * z;
    pos.setXYZ(i, pos.getX(i) * k * rx, pos.getY(i) * k * rx * 0.98, z * rz);
  }
  const parts = [colored(body, INK)];
  // Tail: a fan of five rounded feathers, tipped up a little.
  for (let k = -2; k <= 2; k++) {
    const len = 0.44 - Math.abs(k) * 0.03;
    const f = new THREE.SphereGeometry(1, 16, 10).scale(0.12, 0.03, len).translate(0, 0, -len * 0.85);
    f.rotateY(k * 0.19).rotateX(-0.22).translate(k * 0.025, 0.08 - Math.abs(k) * 0.012, -rz * 0.62);
    parts.push(colored(f, INK));
  }
  return merge(parts);
}

function headGeometry(plump: number) {
  const r = HEAD_R * (0.92 + 0.16 * plump);
  // Shaggy throat hackles; a smooth crown and face so the eyes stay clean.
  const head = furBall({
    widthSegs: 48, heightSegs: 36, tufts: 60, amp: 0.13, sweep: 0.12, width: 1.2, seed: 9,
    comb: (d, out) => out.set(0, -1, -0.3).addScaledVector(d, -d.dot(out)).normalize(),
    mask: (d) => THREE.MathUtils.smoothstep(-d.y, 0.05, 0.45) * THREE.MathUtils.smoothstep(d.z, -0.4, 0.2),
  }).scale(r, r * 0.97, r * 1.02);
  // Heavy beak: a flattened cone, hooked at the tip, with a ridge.
  const beak = lathe([[0.125, 0], [0.12, 0.08], [0.1, 0.2], [0.07, 0.32], [0.035, 0.42], [0, 0.47]], 20).rotateX(Math.PI / 2);
  const bp = beak.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) {
    const z = bp.getZ(i);
    const t = z / 0.47;
    bp.setXYZ(i, bp.getX(i) * 0.78, bp.getY(i) * (1 + 0.15 * (1 - t)) - 0.09 * t * t * t, z);
  }
  beak.computeVertexNormals();
  beak.translate(0, -0.03, r * 0.72);
  return merge([colored(head, INK, 1), colored(beak, BEAK)]);
}

/** Left wing (extends along +x), built open; +z forward, feathers trail to -z. */
function wingGeometry(outer: boolean) {
  const g: THREE.BufferGeometry[] = [];
  const ell = (cx: number, cz: number, rx: number, ry: number, rz: number, yaw = 0) =>
    g.push(colored(new THREE.SphereGeometry(1, 20, 10).scale(rx, ry, rz).rotateY(yaw).translate(cx, 0, cz), INK));
  if (!outer) {
    ell(0.4, -0.2, 0.46, 0.05, 0.3);
    for (let k = 0; k < 4; k++) ell(0.12 + k * 0.2, -0.42, 0.13, 0.03, 0.2, 0.1);
  } else {
    ell(0.26, -0.16, 0.32, 0.045, 0.26);
    // Fingered primaries: the crow's signature wingtip.
    for (let k = 0; k < 5; k++) {
      const a = -0.12 + k * 0.2;
      const len = 0.56 - Math.abs(k - 1.2) * 0.05;
      const rx = 0.42 + Math.cos(a) * len * 0.5;
      const rz = -0.04 - k * 0.075 - Math.sin(a) * len * 0.5;
      ell(rx, rz, len * 0.5, 0.025, 0.065, a);
    }
  }
  return merge(g);
}

function legGeometry() {
  const g: THREE.BufferGeometry[] = [];
  g.push(colored(new THREE.CylinderGeometry(0.035, 0.03, 0.46, 8).translate(0, -0.23, 0), LEG));
  // Feathered "trousers" at the top of the leg.
  g.push(colored(new THREE.SphereGeometry(1, 14, 10).scale(0.09, 0.14, 0.1).translate(0, -0.06, 0), INK));
  const toe = (yaw: number, len: number) => g.push(colored(new THREE.CapsuleGeometry(0.022, len, 3, 6).rotateX(Math.PI / 2).translate(0, 0, len / 2).rotateY(yaw).translate(0, -0.46, 0), LEG));
  toe(0, 0.16);
  toe(0.45, 0.13);
  toe(-0.45, 0.13);
  toe(Math.PI, 0.09);
  return merge(g);
}

/** A thin leather strap along a path (head space). */
function strap(pts: [number, number, number][], closed: boolean, r = 0.016) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed);
  return colored(new THREE.TubeGeometry(curve, closed ? 40 : 48, r, 6, closed), LEATHER);
}

/** On the head sphere (radius r, lifted a touch), from yaw/pitch. */
function onHead(r: number, yaw: number, pitch: number): [number, number, number] {
  return [Math.sin(yaw) * Math.cos(pitch) * r, Math.sin(pitch) * r, Math.cos(yaw) * Math.cos(pitch) * r];
}

/**
 * Tamed crows wear simple reins: a noseband round the base of the beak, a
 * crown strap behind the eyes, and a rein loop back to where a rider's hands
 * go, with brass rings. Built in head space.
 */
function reinsGeometry(plump: number) {
  const r = HEAD_R * (0.92 + 0.16 * plump) * 1.04;
  const nz = r * 0.72 / 1.04 + 0.07;
  const nose: [number, number, number][] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    nose.push([Math.cos(a) * 0.108, -0.03 + Math.sin(a) * 0.152, nz]);
  }
  // Along the jaw, up behind the eyes, over the back of the crown.
  const crown = [
    [0.108, -0.06, nz], onHead(r, 0.9, -0.38), onHead(r, 1.75, -0.1), onHead(r, 1.95, 0.45),
    [0, r * 0.9, -r * 0.42], onHead(r, -1.95, 0.45), onHead(r, -1.75, -0.1), onHead(r, -0.9, -0.38), [-0.108, -0.06, nz],
  ] as [number, number, number][];
  const loop: [number, number, number][] = [
    // Slack, lying on the neck and the top of the back where a rider holds them.
    [0.13, -0.06, nz], [0.3, -0.12, 0.1], [0.33, -0.08, -0.14], [0.22, 0.0, -0.36], [0, 0.03, -0.46],
    [-0.22, 0.0, -0.36], [-0.33, -0.08, -0.14], [-0.3, -0.12, 0.1], [-0.13, -0.06, nz],
  ];
  const ring = (x: number) => colored(new THREE.TorusGeometry(0.035, 0.012, 6, 14).rotateY(Math.PI / 2).translate(x, -0.06, nz), BRASS);
  return merge([strap(nose, true, 0.02), strap(crown, false), strap(loop, false, 0.018), ring(0.115), ring(-0.115)]);
}

function collarGeometry() {
  return colored(new THREE.TorusGeometry(0.26, 0.035, 6, 32).rotateX(Math.PI / 2 - 0.5), ROPE);
}

interface CrowData {
  root: THREE.Object3D;
  body: THREE.Object3D;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  wing: THREE.Object3D[];
  hand: THREE.Object3D[];
  legs: THREE.Object3D[];
  saddle: THREE.Object3D;
  collar: THREE.Object3D;
  seat: THREE.Object3D;
  // brain
  goal: THREE.Vector3 | null;
  idle: number;
  delay: number;
  slotA: number;
  slotR: number;
  alt: number;
  landing: boolean;
  /** Own touchdown point, scattered about the flock's landing spot. */
  land: THREE.Vector2;
  /** Foraging: what it's doing now; `idle` counts down to the next choice. */
  act: 'walk' | 'hop' | 'peck' | 'look';
  pecks: number;
  /** Walking (vs hopping) on the ground, and a heading to turn to when still. */
  walk: boolean;
  face: number | null;
  // anim
  t: number;
  hop: number;
  hopH: number;
  /** Walk-cycle phase (ridden on the ground). */
  stride: number;
  flap: number;
  open: Spring;
  flapAmp: Spring;
  pitch: Spring;
  bank: Spring;
  turn: number;
  prevHeading: number;
  prevVel: THREE.Vector3;
  headYaw: number;
  headYawT: number;
  headPitch: number;
  nextGlance: number;
  peck: number;
  squash: Spring;
  blinkAt: number;
  look: THREE.Vector2;
  lookAt: THREE.Vector3 | null;
  eye: THREE.Vector4;
  wasGrounded: boolean;
}

const tv = new THREE.Vector3();
const tv2 = new THREE.Vector3();
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const qc = new THREE.Quaternion();
const eu = new THREE.Euler();
const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);
const WHITE = new THREE.Color(1, 1, 1);
const seatPos = new THREE.Vector3();
const seatQuat = new THREE.Quaternion();

export class Crow implements Species {
  readonly name = 'crow' as const;
  readonly radius = 0.62 * S;
  readonly centreY = BODY_Y * S;
  readonly flockSize: [number, number] = [3, 8];
  readonly mount: MountSpec = {
    name: 'crow',
    radius: 0.55 * S,
    walk: { speed: 8, sprint: 14, takeoff: 8 },
    // Mounts outpace the explorer's own flight (22 m/s).
    fly: { speed: 28, sprint: 44, climb: 10, sink: 1.8, hover: 0, turn: 2.6 },
  };
  readonly bodyB: PartBatch;
  readonly headB: PartBatch;
  readonly wingB: PartBatch[];
  readonly handB: PartBatch[];
  readonly legB: PartBatch;
  readonly saddleB: PartBatch;
  readonly collarB: PartBatch;
  readonly batches: PartBatch[];
  private plump = crowStyle.plump;

  constructor() {
    this.bodyB = new PartBatch(bodyGeometry(this.plump), { keep: 0.45 }, MAX);
    this.headB = new PartBatch(headGeometry(this.plump), {
      keep: 0.45, eyePos: [0.5, 0.2], eyeSize: [0.27, 0.3], pupil: [0.085, 0.11], lookRange: [0.16, 0.12], eyeTilt: 0.12,
    }, MAX);
    const w = wingGeometry(false), h = wingGeometry(true);
    this.wingB = [new PartBatch(w, { keep: 0.45 }, MAX), new PartBatch(mirrorX(w), { keep: 0.45 }, MAX)];
    this.handB = [new PartBatch(h, { keep: 0.45 }, MAX), new PartBatch(mirrorX(h), { keep: 0.45 }, MAX)];
    this.legB = new PartBatch(legGeometry(), { keep: 0.45 }, MAX * 2);
    this.saddleB = new PartBatch(reinsGeometry(this.plump), { keep: 0.7 }, 16);
    this.collarB = new PartBatch(collarGeometry(), { keep: 0.6 }, 16);
    this.batches = [this.bodyB, this.headB, ...this.wingB, ...this.handB, this.legB, this.saddleB, this.collarB];
  }

  /** Rebuild shapes after the plumpness slider moves (0 sleek .. 1 round). */
  setPlump(p: number) {
    this.plump = p;
    this.bodyB.setGeometry(bodyGeometry(p));
    this.headB.setGeometry(headGeometry(p));
    this.saddleB.setGeometry(reinsGeometry(p));
  }

  /** Inside the explorer's home patch (the story cabin and its yard) or at a beacon tower. */
  private nearBase(gen: WorldGen, x: number, z: number) {
    const st = gen.story;
    // Nor round a beacon tower's foot (or inside its doorway's room).
    return Math.hypot(x - st.x, z - st.z) < BASE_CLEAR || gen.towerDist(x, z, 120) < TOWER_CLEAR;
  }

  /** Lower = better landing ground. Infinity = unusable. */
  private groundScore(gen: WorldGen, x: number, z: number) {
    if (this.nearBase(gen, x, z)) return Infinity;
    const h = gen.height(x, z);
    if (h < 1.2 || h > 150) return Infinity;
    const slope = Math.abs(gen.height(x + 2, z) - h) + Math.abs(gen.height(x, z + 2) - h);
    if (slope > 1.4) return Infinity;
    return gen.forestDensity(x, z, h) * 6 + slope * 0.3 + h / 200;
  }

  /**
   * Good open ground `rMin`–`rMax` m from `from`; biased away from `away` if
   * given. Returns false if nothing suitable turned up.
   */
  private findSpot(gen: WorldGen, from: THREE.Vector3, away: THREE.Vector3 | null, rnd: () => number, out: THREE.Vector3, rMin = 35, rMax = 95) {
    let best = Infinity;
    const base = away ? Math.atan2(from.x - away.x, from.z - away.z) : rnd() * Math.PI * 2;
    for (let k = 0; k < 16; k++) {
      const a = base + (rnd() - 0.5) * (away ? 1.8 : Math.PI * 2);
      const r = rMin + rnd() * (rMax - rMin);
      const x = from.x + Math.sin(a) * r, z = from.z + Math.cos(a) * r;
      const sc = this.groundScore(gen, x, z) + rnd() * 0.3;
      if (sc < best) { best = sc; out.set(x, gen.height(x, z), z); }
    }
    return best < 2;
  }

  /**
   * Crows roam: most flocks arrive from beyond view, flying high, and settle
   * on open ground somewhere near you; some are just crossing over to a spot
   * on the far side. At load, some are already down foraging.
   */
  launch(f: Flock, ctx: MobCtx, rnd: () => number, initial: boolean): boolean {
    const p = ctx.player.pos;
    const fd = f.data;
    fd.alarm = false;
    fd.landAt = 0;
    fd.spot = new THREE.Vector3();
    if (initial && !fd.pass && rnd() < 0.6) {
      if (!this.findSpot(ctx.gen, p, null, rnd, fd.spot, 90, 380)) return false;
      fd.mode = 'ground';
      fd.relocate = 20 + rnd() * 100;
      f.centre.copy(fd.spot);
      f.target.copy(fd.spot);
      return true;
    }
    // Fly in from out of view, 220-320 m off.
    let placed = false;
    for (let k = 0; k < 16 && !placed; k++) {
      const a = rnd() * Math.PI * 2, out = 220 + rnd() * 100;
      const x = p.x + Math.sin(a) * out, z = p.z + Math.cos(a) * out;
      if (ctx.hidden && !ctx.hidden(x, ctx.surface(x, z) + 25, z, 15)) continue;
      f.centre.set(x, 0, z);
      placed = true;
    }
    if (!placed) return false;
    // Coming to hang out near you, or (fly-overs) crossing right over your
    // head to open ground on the far side.
    const passing = !!fd.pass;
    fd.passing = passing;
    let ok: boolean;
    if (passing) {
      const back = Math.atan2(p.x - f.centre.x, p.z - f.centre.z) + (rnd() - 0.5) * 0.4;
      const out = 260 + rnd() * 140;
      tv.set(p.x + Math.sin(back) * out, 0, p.z + Math.cos(back) * out);
      ok = this.findSpot(ctx.gen, tv, null, rnd, f.target, 0, 70);
    } else ok = this.findSpot(ctx.gen, p, null, rnd, f.target, 60, 300);
    if (!ok) return false;
    fd.mode = 'fly';
    fd.flyT = 0;
    fd.cruise = 18 + rnd() * 14;
    return true;
  }

  /** Take off for somewhere new (scared = away from the explorer, and sooner). */
  private depart(f: Flock, ctx: MobCtx, scared: boolean) {
    const fd = f.data;
    const rnd = fd.rnd as () => number;
    const ok = scared
      ? this.findSpot(ctx.gen, fd.spot, ctx.player.pos, rnd, f.target, 80, 250)
      : this.findSpot(ctx.gen, fd.spot, null, rnd, f.target, 150, 450);
    if (!ok) {
      f.target.copy(fd.spot).add(tv.set(rnd() * 400 - 200, 0, rnd() * 400 - 200));
      // Never fall back onto the home patch: push straight out past its edge.
      const st = ctx.gen.story;
      if (this.nearBase(ctx.gen, f.target.x, f.target.z)) {
        const a = Math.atan2(f.target.x - st.x, f.target.z - st.z);
        f.target.set(st.x + Math.sin(a) * BASE_CLEAR * 1.5, 0, st.z + Math.cos(a) * BASE_CLEAR * 1.5);
      }
    }
    fd.mode = 'fly';
    fd.flyT = 0;
    fd.landAt = 0;
    const dist = Math.hypot(f.target.x - fd.spot.x, f.target.z - fd.spot.z);
    // Short hops stay low; longer trips climb up into the sky.
    fd.cruise = dist > 140 ? 16 + rnd() * 14 : 6 + rnd() * 6;
    f.centre.copy(fd.spot);
    for (const m of f.members) {
      const d = m.data as CrowData;
      d.delay = scared ? rnd() * 0.35 : rnd() * 1.2;
      d.landing = false;
      d.alt = fd.cruise + (rnd() - 0.5) * 5;
    }
  }

  initMob(m: Mob, i: number, f: Flock, ctx: MobCtx) {
    const r = m.rnd;
    const o = () => new THREE.Object3D();
    const d: CrowData = {
      root: o(), body: o(), neck: o(), head: o(), wing: [o(), o()], hand: [o(), o()], legs: [o(), o()], saddle: o(), collar: o(), seat: o(),
      goal: null, idle: r() * 2, delay: 0, slotA: (i / Math.max(1, f.members.length)) * Math.PI * 2, slotR: 4 + r() * 6, alt: 7 + r() * 7, landing: false,
      land: new THREE.Vector2(), act: 'look', pecks: 0, walk: false, face: null,
      t: r() * 10, hop: 1, hopH: 0, stride: 0, flap: r() * 6, open: new Spring(0), flapAmp: new Spring(0), pitch: new Spring(-0.35), bank: new Spring(),
      turn: 0, prevHeading: 0, prevVel: new THREE.Vector3(), headYaw: 0, headYawT: 0, headPitch: 0, nextGlance: r() * 2, peck: 9,
      squash: new Spring(), blinkAt: r() * 4, look: new THREE.Vector2(), lookAt: null, eye: new THREE.Vector4(0, 0, 1, 0), wasGrounded: true,
    };
    d.root.scale.setScalar(S);
    d.root.add(d.body);
    d.body.position.y = BODY_Y;
    d.body.add(d.neck);
    d.neck.position.copy(NECK);
    d.neck.add(d.head, d.collar);
    d.head.add(d.saddle);
    d.head.position.copy(HEAD_C);
    d.collar.position.set(0, 0.02, 0.02);
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      d.wing[k].position.set(s * SHOULDER.x, SHOULDER.y, SHOULDER.z);
      d.body.add(d.wing[k]);
      d.hand[k].position.set(s * 0.8, 0, 0);
      d.wing[k].add(d.hand[k]);
      d.legs[k].position.set(s * HIP.x, HIP.y, HIP.z);
      d.body.add(d.legs[k]);
    }
    d.seat.position.set(0, 0.5, -0.14);
    d.body.add(d.seat);
    m.data = d;
    const a = r() * Math.PI * 2, rr = r() * 5;
    if (f.data.mode === 'fly') {
      // Arriving: already aloft in a loose group, wings out.
      d.alt = (f.data.cruise ?? 20) + (r() - 0.5) * 5;
      const x = f.centre.x + Math.cos(d.slotA) * d.slotR, z = f.centre.z + Math.sin(d.slotA) * d.slotR;
      m.pos.set(x, ctx.surface(x, z) + d.alt, z);
      m.grounded = false;
      d.wasGrounded = false;
      d.open.x = 1;
      m.heading = Math.atan2(f.target.x - x, f.target.z - z);
      m.vel.set(Math.sin(m.heading) * 10, 0, Math.cos(m.heading) * 10);
    } else {
      const x = f.centre.x + Math.cos(a) * rr, z = f.centre.z + Math.sin(a) * rr;
      m.pos.set(x, ctx.surface(x, z), z);
      m.grounded = true;
      m.heading = r() * Math.PI * 2;
    }
    m.tint.copy(TINTS[Math.floor(r() * TINTS.length)]);
  }

  thinkFlock(f: Flock, ctx: MobCtx) {
    const fd = f.data;
    // Personal space: on the ground a hop apart, in the air a wingspan.
    const M = f.members;
    for (let i = 0; i < M.length; i++) {
      for (let j = i + 1; j < M.length; j++) {
        const a = M[i], b = M[j];
        const min = a.grounded && b.grounded ? 1.6 * S : 3.2 * S;
        tv.subVectors(a.pos, b.pos);
        if (a.grounded && b.grounded) tv.y = 0;
        const dd = tv.length();
        if (dd >= min) continue;
        if (dd < 1e-3) tv.set(1, 0, 0);
        const push = Math.min(min - dd, 3 * ctx.dt) * 0.5;
        tv.setLength(push);
        a.pos.add(tv);
        b.pos.sub(tv);
      }
    }
    const rnd = fd.rnd as () => number;
    const { player, dt } = ctx;
    if (fd.mode === 'ground') {
      fd.spot ??= f.centre.clone();
      // Anyone too close (or a lasso in the air) and the whole flock is off.
      let near = Infinity;
      for (const m of f.members) near = Math.min(near, Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z));
      const fast = Math.hypot(player.vel.x, player.vel.z) > 7.5 || player.mode === 'ride';
      fd.relocate -= dt;
      if (fd.alarm || near < (fast ? 15 : 9) || fd.relocate < 0) {
        const scared = fd.alarm || near < 15;
        fd.alarm = false;
        this.depart(f, ctx, scared);
      }
    } else {
      fd.flyT += dt;
      fd.alarm = false;
      tv.subVectors(f.target, f.centre).setY(0);
      const dist = tv.length();
      if (dist > 1) f.centre.addScaledVector(tv.normalize(), Math.min(dist, 11 * dt));
      if (dist < 4 && fd.flyT > 4) {
        // Circle a little, then everyone lands.
        if (!fd.landAt) fd.landAt = fd.flyT + 1.5 + rnd() * 2;
        if (fd.flyT > fd.landAt) {
          for (const m of f.members) {
            const d = m.data as CrowData;
            if (!d.landing) {
              // A loose, uneven scatter, not a ring.
              const a = rnd() * Math.PI * 2, r = 1 + Math.sqrt(rnd()) * 6;
              d.land.set(f.target.x + Math.cos(a) * r, f.target.z + Math.sin(a) * r);
            }
            d.landing = true;
          }
          if (f.members.every((m) => m.grounded)) {
            fd.mode = 'ground';
            fd.spot.copy(f.target);
            // Hang out for half a minute to two minutes, then move on.
            fd.relocate = 30 + rnd() * 90;
            fd.landAt = 0;
          }
        }
      }
    }
  }

  think(m: Mob, ctx: MobCtx, leashIndex: number) {
    const d = m.data as CrowData;
    if (m.ridden) return;
    const { dt, player } = ctx;
    d.lookAt = null;
    d.walk = false;
    const face = d.face;
    d.face = null;
    const toPlayer = Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z);
    const f = m.flock;
    let fly = !m.grounded;
    const goal = tv;
    let speed = 3;

    if (m.state === 'caught') {
      // Flapping and hauling against the rope, low to the ground.
      tv2.subVectors(m.pos, player.pos).setY(0).normalize();
      goal.copy(m.pos).addScaledVector(tv2, 4).add(tv2.set(Math.sin(m.stateT * 5) * 2, 0, Math.cos(m.stateT * 4) * 2));
      goal.y = ctx.surface(goal.x, goal.z) + 1.5 + Math.sin(m.stateT * 9) * 0.8;
      fly = true;
      speed = 6;
      d.lookAt = player.pos;
    } else if (m.state === 'wild' && f) {
      const fd = f.data;
      if (fd.mode === 'fly' && !d.landing) {
        d.delay -= dt;
        if (d.delay > 0 && m.grounded) {
          d.lookAt = player.pos;
          goal.copy(m.pos);
          fly = false;
        } else {
          d.slotA += dt * 0.7;
          goal.set(f.centre.x + Math.cos(d.slotA) * d.slotR, 0, f.centre.z + Math.sin(d.slotA) * d.slotR);
          const g = ctx.surface(goal.x, goal.z);
          // Over forest they stay above the canopy; near the end of a trip they
          // come down to circle the landing spot.
          const near = Math.hypot(f.target.x - f.centre.x, f.target.z - f.centre.z);
          const alt = THREE.MathUtils.lerp(Math.min(d.alt, 10), d.alt, THREE.MathUtils.smoothstep(near, 20, 90));
          goal.y = g + alt + 12 * THREE.MathUtils.smoothstep(ctx.gen.forestDensity(goal.x, goal.z, g), 0.05, 0.4);
          fly = true;
          speed = 15;
        }
      } else if (fd.mode === 'fly' && d.landing) {
        // Drop onto its own patch of the landing spot. Aim a little below
        // the ground so uneven terrain can't leave it hovering over the grass.
        goal.set(d.land.x, 0, d.land.y);
        goal.y = Math.min(ctx.surface(goal.x, goal.z), ctx.surface(m.pos.x, m.pos.z)) - 0.5;
        fly = false;
        speed = 7;
        if (m.grounded) { d.goal = null; d.act = 'look'; d.idle = m.rnd() * 1.5; }
      } else {
        // Foraging: each bird on its own clock. Walk a few steps, peck, look
        // about, now and then a couple of hops.
        d.face = face;
        this.forage(m, fd.spot as THREE.Vector3, player.pos, dt);
        goal.copy(d.goal ?? m.pos);
        if (!m.grounded) goal.y = ctx.surface(goal.x, goal.z) - 0.5;
        fly = false;
        speed = d.act === 'hop' ? 2.4 : 1.1;
        if (d.act === 'look' && toPlayer < 14) d.lookAt = player.pos;
      }
    } else if (m.leashed) {
      const back = 3.2 + leashIndex * 1.4;
      const side = (leashIndex % 2 ? -1 : 1) * Math.ceil(leashIndex / 2) * 1.8;
      const sh = Math.sin(player.heading), ch = Math.cos(player.heading);
      goal.set(player.pos.x - sh * back + ch * side, 0, player.pos.z - ch * back - sh * side);
      const g = ctx.surface(goal.x, goal.z);
      const high = player.pos.y - ctx.surface(player.pos.x, player.pos.z) > 2.5;
      const wetGoal = ctx.gen.height(goal.x, goal.z) < 0.3;
      fly = high || wetGoal || toPlayer > 11 || (!m.grounded && toPlayer > 5);
      goal.y = fly ? Math.max(g + 1, player.pos.y + 0.5) : g;
      speed = fly ? 18 : 12;
      if (toPlayer < 14) d.lookAt = player.pos;
    } else {
      // Waiting by where you left it.
      goal.copy(m.stay);
      goal.y = ctx.surface(goal.x, goal.z);
      fly = !m.grounded && m.pos.y - goal.y > 0.5;
      speed = 2;
      if (toPlayer < 14) d.lookAt = player.pos;
    }

    this.move(m, ctx, goal, fly, speed);
  }

  /** Pick and run the next foraging activity. */
  private forage(m: Mob, spot: THREE.Vector3, player: THREE.Vector3, dt: number) {
    const d = m.data as CrowData;
    const r = m.rnd;
    d.idle -= dt;
    if (d.act === 'peck' && d.pecks > 0 && d.peck > 0.3 + r() * 0.4) {
      // A run of quick jabs at the same spot.
      d.pecks--;
      if (d.pecks > 0) d.peck = 0;
    }
    const arrived = d.goal && Math.hypot(d.goal.x - m.pos.x, d.goal.z - m.pos.z) < 0.45;
    if (arrived) { d.goal = null; if (d.act === 'walk' || d.act === 'hop') d.idle = Math.min(d.idle, 0); }
    if (d.idle < 0) {
      const x = r();
      if (x < 0.42) {
        // Stroll on, roughly the way it was facing; drift back if it strays.
        d.act = 'walk';
        let a = m.heading + (r() - 0.5) * 2.4;
        const ox = m.pos.x - spot.x, oz = m.pos.z - spot.z;
        if (Math.hypot(ox, oz) > 7) a = Math.atan2(-ox, -oz) + (r() - 0.5) * 1.2;
        // Wary: they don't wander up to the explorer.
        const px = player.x - m.pos.x, pz = player.z - m.pos.z, pd = Math.hypot(px, pz);
        if (pd < 18 && (Math.sin(a) * px + Math.cos(a) * pz) / pd > 0.2) a = Math.atan2(-px, -pz) + (r() - 0.5) * 2;
        const len = 0.8 + r() * 2.8;
        d.goal = new THREE.Vector3(m.pos.x + Math.sin(a) * len, 0, m.pos.z + Math.cos(a) * len);
        d.idle = 6;
      } else if (x < 0.75) {
        d.act = 'peck';
        d.goal = null;
        d.pecks = 1 + Math.floor(r() * 4);
        d.peck = 0;
        d.idle = 0.6 + d.pecks * 0.55 + r() * 0.8;
      } else if (x < 0.9) {
        d.act = 'look';
        d.goal = null;
        d.idle = 0.8 + r() * 2.2;
        if (r() < 0.6) d.face = m.heading + (r() - 0.5) * 3;
      } else {
        d.act = 'hop';
        const a = m.heading + (r() - 0.5) * 3;
        const len = 1.2 + r() * 2;
        d.goal = new THREE.Vector3(m.pos.x + Math.sin(a) * len, 0, m.pos.z + Math.cos(a) * len);
        d.idle = 4;
      }
    }
    if (d.act !== 'look') d.face = null;
    d.walk = d.act === 'walk';
  }

  private move(m: Mob, ctx: MobCtx, goal: THREE.Vector3, fly: boolean, speed: number) {
    const d = m.data as CrowData;
    const { dt } = ctx;
    const wet = ctx.gen.height(m.pos.x, m.pos.z) < 0;
    if (m.grounded && (fly || wet)) {
      // Take off: a hop and a big downbeat.
      m.grounded = false;
      m.vel.y = 5.5;
      d.squash.v += 2;
      ctx.puff(m.pos, 3, 0.1, 1.2);
    }
    if (m.grounded) {
      // Hopping: covers ground in bursts, the body arcing along.
      tv2.subVectors(goal, m.pos).setY(0);
      const dist = tv2.length();
      if (dist < 0.4) {
        m.vel.x *= Math.exp(-10 * dt);
        m.vel.z *= Math.exp(-10 * dt);
      } else {
        const want = Math.min(speed, dist * 1.5);
        tv2.multiplyScalar(want / dist);
        m.vel.x += (tv2.x - m.vel.x) * (1 - Math.exp(-6 * dt));
        m.vel.z += (tv2.z - m.vel.z) * (1 - Math.exp(-6 * dt));
      }
      m.vel.y = 0;
      m.pos.addScaledVector(m.vel, dt);
      m.pos.y = ctx.surface(m.pos.x, m.pos.z);
    } else {
      tv2.subVectors(goal, m.pos);
      const want = tv2.length() > 1e-3 ? tv2.multiplyScalar(Math.min(speed, tv2.length() * 1.2) / tv2.length()) : tv2;
      m.vel.lerp(want, 1 - Math.exp(-2.2 * dt));
      m.pos.addScaledVector(m.vel, dt);
      const g = ctx.surface(m.pos.x, m.pos.z);
      const dry = ctx.gen.height(m.pos.x, m.pos.z) > 0.3;
      if (m.pos.y <= g + 0.05 && m.vel.y <= 0.3 && dry && !fly) {
        m.pos.y = g;
        m.grounded = true;
        m.vel.y = 0;
        d.squash.v -= 2.5;
        ctx.puff(m.pos, 4, 0.1, 1.5);
      } else if (m.pos.y < g + (dry ? 0 : 0.4)) {
        m.pos.y = g + (dry ? 0 : 0.4);
        m.vel.y = Math.max(0, m.vel.y);
      }
    }
    const hs = Math.hypot(m.vel.x, m.vel.z);
    let target = m.heading;
    if (hs > 0.4) target = Math.atan2(m.vel.x, m.vel.z);
    else if (d.lookAt) target = Math.atan2(d.lookAt.x - m.pos.x, d.lookAt.z - m.pos.z);
    else if (d.face !== null) target = d.face;
    let dh = target - m.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    // Birds turn in quick snaps on the ground.
    m.heading += dh * (1 - Math.exp(-(m.grounded ? 9 : 3) * dt));
  }

  animate(m: Mob, ctx: MobCtx) {
    const d = m.data as CrowData;
    const dt = Math.max(ctx.dt, 1e-4);
    d.t += dt;
    const t = d.t;
    const e = (k: number) => 1 - Math.exp(-k * dt);
    const speed = Math.hypot(m.vel.x, m.vel.z);
    const flying = !m.grounded;
    let dh = m.heading - d.prevHeading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    d.prevHeading = m.heading;
    d.turn += (dh / dt - d.turn) * e(6);
    const climb = m.vel.y;
    tv.subVectors(m.vel, d.prevVel).divideScalar(dt);
    d.prevVel.copy(m.vel);
    if (m.grounded !== d.wasGrounded) {
      d.wasGrounded = m.grounded;
      d.hop = 1;
    }

    // Ridden (or hauled along on a lead at speed), they walk and run: legs
    // alternate, a slight waddle and the pigeon head-bob. Otherwise they hop.
    const walking = !flying && (m.ridden || (m.leashed && speed > 4) || d.walk);
    let hopY = 0;
    let legBend = 0;
    const legSwing = [0, 0];
    const legLift = [0, 0];
    let waddle = 0;
    let headBob = 0;
    const run = THREE.MathUtils.clamp((speed - 6) / 6, 0, 1);
    if (walking) {
      const L = (1.3 + 0.12 * speed) * S;
      d.stride += (speed * dt / L) * Math.PI * 2;
      if (speed < 0.3) d.stride += (Math.round(d.stride / Math.PI) * Math.PI - d.stride) * e(6);
      const A = THREE.MathUtils.clamp(speed / 2, 0, 1) * (0.42 + 0.3 * run);
      for (let k = 0; k < 2; k++) {
        const ph = d.stride + k * Math.PI;
        legSwing[k] = Math.sin(ph) * A;
        legLift[k] = Math.max(0, -Math.cos(ph)) * A;
      }
      const moving = THREE.MathUtils.clamp(speed / 2, 0, 1);
      hopY = Math.abs(Math.sin(d.stride)) * (0.03 + 0.05 * run) * moving;
      waddle = Math.sin(d.stride) * 0.08 * moving * (1 - 0.5 * run);
      headBob = Math.sin(d.stride * 2) * 0.035 * moving;
      d.hop = 1;
    } else if (!flying) {
      if (speed > 0.25 || d.hop < 1) {
        const rate = 2.6 + speed * 0.35;
        d.hop += dt * rate;
        if (d.hop >= 1) d.hop = speed > 0.25 ? d.hop % 1 : 1;
        const h = Math.min(0.5, 0.12 + speed * 0.045);
        hopY = Math.sin(Math.PI * Math.min(1, d.hop)) * h;
        legBend = Math.max(0, 1 - Math.min(1, d.hop) * 5) + Math.max(0, Math.min(1, d.hop) * 5 - 4);
      }
    }
    d.root.position.set(m.pos.x, m.pos.y + hopY * S, m.pos.z);
    d.root.rotation.set(0, m.heading, 0);

    // Wings: folded on the ground, flapping in the air; big beats climbing,
    // glides descending.
    const open = d.open.step(flying ? 1 : 0, flying ? 160 : 60, flying ? 18 : 12, dt);
    const working = flying ? THREE.MathUtils.clamp(0.35 + climb * 0.18 + (m.state === 'caught' ? 0.6 : 0) - Math.max(0, speed - 12) * 0.03, 0, 1) : 0;
    const gliding = flying && climb < -0.6 && speed > 5 && m.state !== 'caught';
    const amp = d.flapAmp.step(gliding ? 0.05 : 0.45 + working * 0.55, 20, 8, dt);
    d.flap += dt * (5.5 + working * 7);
    const beat = Math.sin(d.flap);
    const lag = Math.sin(d.flap - 0.9);
    // Pecks: a quick jab of the head, the body tipping in after it.
    const pk = !flying && d.peck < 0.32 ? Math.sin(Math.min(1, d.peck / 0.32) * Math.PI) : 0;
    const pitch = d.pitch.step(flying ? THREE.MathUtils.clamp(-climb * 0.05 + speed * 0.008, -0.35, 0.25) : -0.38 + (speed > 0.3 ? 0.12 : 0) + (walking ? 0.14 * run : 0) + pk * 0.22, 60, 12, dt);
    const bank = d.bank.step(flying ? THREE.MathUtils.clamp(-d.turn * speed * 0.06, -0.7, 0.7) : THREE.MathUtils.clamp(-d.turn * speed * 0.02, -0.2, 0.2), 40, 9, dt) + waddle;
    d.body.rotation.set(pitch, 0, bank);
    const sq = d.squash.step(0, 160, 12, dt);
    const sy = 1 + THREE.MathUtils.clamp(sq, -0.25, 0.25) + (flying ? beat * 0.03 * amp : 0);
    d.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    d.body.position.y = BODY_Y - legBend * 0.08;

    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      // Open: flap about the body's long axis, a slight backward sweep.
      qa.setFromAxisAngle(AZ, s * (beat * amp * 0.95 * open + 0.12 * (gliding ? 1 : 0)));
      qb.setFromAxisAngle(AY, s * (0.15 + 0.1 * beat * amp));
      qa.multiply(qb);
      // Folded: flat on the flank, swept back and tipped up so the
      // primaries cross over the tail.
      qb.setFromAxisAngle(AX, 0.42);
      qb.multiply(qc.setFromAxisAngle(AY, s * 1.66));
      qb.multiply(qc.setFromAxisAngle(AX, -1.35));
      qb.multiply(qc.setFromAxisAngle(AZ, s * -0.12));
      d.wing[k].quaternion.slerpQuaternions(qb, qa, open);
      // Folded wings lie on the flanks, outside the body.
      const flank = 0.4 + 0.14 * this.plump;
      d.wing[k].position.set(s * THREE.MathUtils.lerp(flank, SHOULDER.x, open), THREE.MathUtils.lerp(0.16, SHOULDER.y, open), THREE.MathUtils.lerp(0.26, SHOULDER.z, open));
      d.wing[k].scale.set(THREE.MathUtils.lerp(0.62, 1, open), 1, 1);
      // Hand: trails the beat; folded it lies straight back past the tail.
      eu.set(0, 0, s * (lag * amp * 0.6 - beat * amp * 0.25) * open);
      d.hand[k].rotation.copy(eu);
      d.hand[k].position.x = s * THREE.MathUtils.lerp(0.5, 0.8, open);
      // Closed, the fingered fan stacks up instead of spreading.
      d.hand[k].scale.set(THREE.MathUtils.lerp(0.82, 1, open) / THREE.MathUtils.lerp(0.62, 1, open), 1, THREE.MathUtils.lerp(0.5, 1, open));
    }

    // Legs: tucked back in flight, stepping and bending for hops.
    for (let k = 0; k < 2; k++) {
      const tuck = Math.min(1, open * 1.3);
      d.legs[k].rotation.set(-pitch + tuck * 1.25 + legSwing[k] + (flying && m.state === 'caught' ? Math.sin(t * 14 + k) * 0.3 : 0), 0, -bank * 0.8);
      d.legs[k].scale.set(1, 1 - legBend * 0.2 - legLift[k] * 0.35, 1);
    }

    // Head: level against the body pitch, quick glances, pecks.
    if (t > d.nextGlance) {
      d.headYawT = (m.rnd() - 0.5) * 1.6;
      d.nextGlance = t + 0.4 + m.rnd() * 1.6;
    }
    let yawT = d.headYawT * (flying ? 0.3 : 1);
    let pitchT = 0;
    if (d.lookAt) {
      tv.subVectors(d.lookAt, m.pos);
      const sh = Math.sin(m.heading), ch = Math.cos(m.heading);
      const lz = tv.x * sh + tv.z * ch;
      const lx = tv.x * ch - tv.z * sh;
      yawT = THREE.MathUtils.clamp(Math.atan2(lx, lz), -1.3, 1.3);
      pitchT = THREE.MathUtils.clamp(-Math.atan2(tv.y + 1.2 - BODY_Y * S, Math.hypot(lx, lz)) * 0.6, -0.5, 0.5);
    }
    // Birds move their heads in snaps, not sweeps.
    d.headYaw += (yawT - d.headYaw) * e(18);
    d.peck += dt;
    
    d.headPitch += (pitchT - d.headPitch) * e(12);
    d.neck.rotation.set(-pitch + d.headPitch + pk * 1.25 - (flying ? 0.25 : 0), d.headYaw * 0.8, -bank * 0.6);
    d.neck.position.set(0, NECK.y - pk * 0.08, NECK.z + pk * 0.05 + (flying ? 0.08 : 0) + headBob);

    // Eyes.
    if (t > d.blinkAt + 0.1) d.blinkAt = t + 1.5 + m.rnd() * 4;
    const lids = m.happy > 0 ? -1 : t > d.blinkAt ? 0.05 : 1;
    const lx = d.lookAt ? THREE.MathUtils.clamp((yawT - d.headYaw * 0.8) * 1.5, -1, 1) : 0;
    d.look.x += (lx - d.look.x) * e(12);
    d.look.y += ((d.lookAt ? pitchT - d.headPitch : 0) - d.look.y) * e(12);
    d.eye.set(d.look.x, -d.look.y, lids, 0);
    d.saddle.visible = m.state === 'tamed';
    d.root.updateMatrixWorld(true);
  }

  emit(m: Mob, _dist: number) {
    const d = m.data as CrowData;
    this.bodyB.push(d.body.matrixWorld, m.tint);
    this.headB.push(d.head.matrixWorld, m.tint, d.eye);
    for (let k = 0; k < 2; k++) {
      this.wingB[k].push(d.wing[k].matrixWorld, m.tint);
      this.handB[k].push(d.hand[k].matrixWorld, m.tint);
      this.legB.push(d.legs[k].matrixWorld, m.tint);
    }
    if (d.saddle.visible) this.saddleB.push(d.saddle.matrixWorld, WHITE);
    if (m.state === 'caught' || m.leashed) this.collarB.push(d.collar.matrixWorld, WHITE);
  }

  attach(m: Mob, toward: THREE.Vector3, out: THREE.Vector3) {
    const d = m.data as CrowData;
    d.collar.getWorldPosition(out);
    tv.subVectors(toward, out).setY(0);
    if (tv.lengthSq() < 1e-4) tv.set(0, 0, 1);
    return out.addScaledVector(tv.normalize(), 0.26 * S);
  }

  seat(m: Mob) {
    const d = m.data as CrowData;
    d.seat.getWorldPosition(seatPos);
    // Sit level-ish: take the body's yaw and bank but only some of its pitch.
    d.seat.getWorldQuaternion(seatQuat);
    return { pos: seatPos, quat: seatQuat, spread: 0.5 };
  }

  reset(m: Mob) {
    const d = m.data as CrowData;
    d.goal = null;
    d.landing = true;
    m.stay.copy(m.pos);
  }
}
