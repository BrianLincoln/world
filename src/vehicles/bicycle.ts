import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { colored as tag, lathe, merge, PartBatch } from '../mobs/parts';

// A storybook bicycle: an upright step-through town bike with swept-back
// bars, a wicker basket, cream mudguards and a headlamp, chunky enough that
// its tubes read as shapes rather than as outline scribbles.
//
// Drawn like the creatures: each moving part is one instanced PartBatch
// (frame, steering, wheels, crank, pedals, kickstand), so every bicycle in the
// world costs six draw calls together. Each bicycle keeps a small Object3D
// skeleton (never in the scene) that `pose` sets up and `emit` copies out.
//
// Bike space: origin on the ground midway between the tyre contacts, +z
// forward, +y up, +x = the rider's left (the character's convention).

export const WHEEL_R = 0.315;
export const WHEELBASE = 1.0;
const AXLE_Y = WHEEL_R;
const REAR = new THREE.Vector3(0, AXLE_Y, -WHEELBASE / 2);
const FRONT = new THREE.Vector3(0, AXLE_Y, WHEELBASE / 2);
/** Bottom bracket (crank spindle). */
const BB = new THREE.Vector3(0, 0.27, -0.08);
const CRANK_LEN = 0.13;
const PEDAL_X = 0.15;
/** Steering axis: the head tube, from bottom to top. */
const HEAD_LO = new THREE.Vector3(0, 0.5, 0.385);
const HEAD_HI = new THREE.Vector3(0, 0.66, 0.33);
const STEER_AXIS = HEAD_HI.clone().sub(HEAD_LO).normalize();
/** Where the rider's hip joint sits, and where their mittens hold the grips. */
export const SEAT = new THREE.Vector3(0, 0.735, -0.27);
const GRIP = new THREE.Vector3(0.243, 0.868, 0.185);
const KICK_PIVOT = new THREE.Vector3(0.05, 0.265, -0.2);
const KICK_LEN = 0.3;
/** How far a parked bike leans onto its kickstand (toward +x). */
export const PARK_LEAN = 0.2;

/** Frame colours; the frame takes the per-bike tint, everything else is fixed. */
export const FRAME_TINTS = ['#b5493b', '#3f7a74', '#d19a3e', '#56699a', '#7d5a86'];
const C = {
  frame: '#ffffff',
  cream: '#eee3cf',
  tyre: '#4f3a35',
  metal: '#cfc6b8',
  dark: '#5a4a44',
  leather: '#74492f',
  wicker: '#c99b5e',
  wickerDark: '#8f693f',
  lamp: '#f3e8cc',
  apple: '#c2553f',
  bread: '#d9a760',
  leaf: '#6f7d47',
};

// ------------------------------------------------------------------ geometry

/** Flat colour for a part; only the frame colour takes the per-bike tint. `paint` 3 = lamp glass. */
function colored(g: THREE.BufferGeometry, hex: string, paint = 0) {
  return tag(g, hex, paint, hex === C.frame);
}

const up = new THREE.Vector3(0, 1, 0);

/** A round rod from a to b, with rounded ends. */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, hex: string, segs = 10, caps = true): THREE.BufferGeometry[] {
  const d = b.clone().sub(a);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, segs, 1, true);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
  g.translate(a.x, a.y, a.z);
  const out = [colored(g, hex)];
  if (caps) for (const p of [a, b]) out.push(colored(new THREE.SphereGeometry(r, segs, 6).translate(p.x, p.y, p.z), hex));
  return out;
}

/** A smooth tube through points (Catmull-Rom), with rounded ends. */
function tube(pts: THREE.Vector3[], r: number, hex: string, segs = 24): THREE.BufferGeometry[] {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const g = new THREE.TubeGeometry(curve, segs, r, 10, false);
  const out = [colored(g, hex)];
  for (const p of [pts[0], pts[pts.length - 1]]) out.push(colored(new THREE.SphereGeometry(r, 10, 6).translate(p.x, p.y, p.z), hex));
  return out;
}

/** Points on an arc around `c` in the bike's y-z plane; angle 0 = forward, pi/2 = up. */
function arc(c: THREE.Vector3, R: number, a0: number, a1: number, n: number, x = 0): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(new THREE.Vector3(c.x + x, c.y + Math.sin(a) * R, c.z + Math.cos(a) * R));
  }
  return pts;
}

/** A mudguard: a wide, flattened arc over a wheel. */
function mudguard(c: THREE.Vector3, a0: number, a1: number): THREE.BufferGeometry[] {
  const R = WHEEL_R + 0.04;
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc(new THREE.Vector3(), R, a0, a1, 12)), 28, 0.03, 10, false);
  const out: THREE.BufferGeometry[] = [g];
  for (const a of [a0, a1]) out.push(new THREE.SphereGeometry(0.03, 10, 6).translate(0, Math.sin(a) * R, Math.cos(a) * R));
  return out.map((p) => colored(p.scale(1.9, 1, 1).translate(c.x, c.y, c.z), C.cream));
}

function frameGeometry(): THREE.BufferGeometry {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const T = 0.028;
  const g: THREE.BufferGeometry[] = [];
  // Twin swooping down tubes of a step-through: head tube to the bottom
  // bracket, and a second one to the seat tube.
  g.push(...tube([V(0, 0.52, 0.37), V(0, 0.38, 0.2), V(0, 0.29, 0.03), BB], T, C.frame, 24));
  g.push(...tube([V(0, 0.62, 0.345), V(0, 0.47, 0.16), V(0, 0.39, -0.02), V(0, 0.43, -0.15)], T * 0.85, C.frame, 24));
  // Head tube (a little fatter), seat tube, stays.
  g.push(...rod(HEAD_LO.clone().addScaledVector(STEER_AXIS, -0.02), HEAD_HI, 0.036, C.frame, 12));
  const seatTop = V(0, 0.575, -0.215);
  g.push(...rod(BB, seatTop, T, C.frame, 10));
  for (const s of [1, -1]) {
    const axle = V(0.055 * s, AXLE_Y, REAR.z);
    g.push(...rod(V(0.04 * s, BB.y, BB.z - 0.02), axle, 0.016, C.frame, 8));
    g.push(...rod(V(0.025 * s, 0.55, -0.225), axle, 0.015, C.frame, 8));
    // Rack struts.
    g.push(...rod(axle, V(0.075 * s, 0.6, -0.56), 0.009, C.metal, 6));
  }
  // Seat post and a sprung leather saddle.
  g.push(...rod(seatTop, V(0, 0.625, -0.232), 0.017, C.metal, 8));
  g.push(colored(new THREE.SphereGeometry(1, 20, 12).scale(0.095, 0.034, 0.105).translate(0, 0.645, -0.26), C.leather));
  g.push(colored(new THREE.SphereGeometry(1, 16, 10).scale(0.04, 0.028, 0.085).translate(0, 0.648, -0.17), C.leather));
  for (const s of [1, -1]) g.push(colored(new THREE.TorusGeometry(0.018, 0.006, 6, 10).rotateY(Math.PI / 2).translate(0.045 * s, 0.61, -0.29), C.metal));
  // Rear rack deck.
  g.push(colored(new RoundedBoxGeometry(0.17, 0.018, 0.26, 2, 0.008).translate(0, 0.6, -0.58), C.metal));
  g.push(...mudguard(REAR, Math.PI * 0.3, Math.PI * 1.12));
  // Chain guard over the drive side (-x), and the rear hub's sprocket.
  const cg = new RoundedBoxGeometry(0.016, 0.1, 0.5, 3, 0.007);
  cg.rotateX(Math.atan2(REAR.y - BB.y, BB.z - REAR.z));
  cg.translate(-0.075, (BB.y + REAR.y) / 2 + 0.025, (BB.z + REAR.z) / 2 - 0.02);
  g.push(colored(cg, C.cream));
  g.push(colored(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 14).rotateZ(Math.PI / 2).translate(-0.07, REAR.y, REAR.z), C.metal));
  return merge(g);
}

/** Fork, bars, basket, mudguard, lamp. Built in bike space, then moved so the pivot is the origin. */
function steerGeometry(): THREE.BufferGeometry {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const g: THREE.BufferGeometry[] = [];
  const crown = HEAD_LO.clone().addScaledVector(STEER_AXIS, -0.035);
  g.push(colored(new RoundedBoxGeometry(0.15, 0.04, 0.06, 2, 0.015).translate(crown.x, crown.y, crown.z), C.frame));
  for (const s of [1, -1]) {
    g.push(...tube([V(0.055 * s, crown.y, crown.z), V(0.057 * s, 0.41, 0.46), V(0.057 * s, FRONT.y, FRONT.z)], 0.017, C.frame, 12));
  }
  // Stem and swept-back bars.
  const stemTop = HEAD_HI.clone().addScaledVector(STEER_AXIS, 0.17);
  g.push(...rod(HEAD_HI, stemTop, 0.019, C.metal, 8));
  const clamp = V(0, stemTop.y + 0.01, stemTop.z + 0.035);
  g.push(...rod(stemTop, clamp, 0.019, C.metal, 8));
  for (const s of [1, -1]) {
    g.push(...tube([clamp, V(0.11 * s, clamp.y + 0.004, clamp.z + 0.002), V(0.2 * s, 0.858, 0.3), V(0.237 * s, 0.864, 0.24), V(GRIP.x * s, GRIP.y, 0.2)], 0.016, C.metal, 16));
    g.push(...rod(V(GRIP.x * s, GRIP.y, 0.235), V((GRIP.x + 0.004) * s, GRIP.y + 0.002, 0.13), 0.025, C.leather, 10));
  }
  // A bell on the left of the bars.
  g.push(colored(new THREE.SphereGeometry(0.026, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0.13, 0.875, 0.335), C.metal));
  // Wicker basket on a little front rack, with the day's shopping in it.
  const bc = V(0, 0.765, 0.56);
  g.push(...rod(V(0.08, crown.y - 0.02, crown.z + 0.02), V(0.1, bc.y - 0.1, bc.z - 0.05), 0.008, C.metal, 6));
  g.push(...rod(V(-0.08, crown.y - 0.02, crown.z + 0.02), V(-0.1, bc.y - 0.1, bc.z - 0.05), 0.008, C.metal, 6));
  g.push(colored(new RoundedBoxGeometry(0.34, 0.2, 0.25, 3, 0.04).translate(bc.x, bc.y, bc.z), C.wicker));
  g.push(colored(new THREE.TorusGeometry(1, 0.1, 6, 24).scale(0.16, 0.115, 0.14).rotateX(Math.PI / 2).translate(bc.x, bc.y + 0.1, bc.z), C.wickerDark));
  g.push(colored(new RoundedBoxGeometry(0.3, 0.02, 0.21, 2, 0.008).translate(bc.x, bc.y + 0.085, bc.z), C.wickerDark));
  g.push(colored(new THREE.CapsuleGeometry(0.045, 0.2, 4, 12).rotateX(0.9).rotateY(0.35).translate(bc.x + 0.07, bc.y + 0.15, bc.z - 0.01), C.bread));
  g.push(colored(new THREE.SphereGeometry(0.048, 14, 10).translate(bc.x - 0.075, bc.y + 0.115, bc.z + 0.04), C.apple));
  g.push(colored(new THREE.SphereGeometry(0.044, 14, 10).translate(bc.x - 0.02, bc.y + 0.11, bc.z + 0.07), C.apple));
  g.push(colored(new THREE.SphereGeometry(1, 8, 6).scale(0.025, 0.008, 0.04).rotateX(-0.5).translate(bc.x - 0.07, bc.y + 0.17, bc.z + 0.05), C.leaf));
  // Headlamp on the basket front: a cream cup with a lens that glows at night.
  const lamp = V(0, bc.y - 0.02, bc.z + 0.15);
  g.push(colored(lathe([[0.001, -0.05], [0.028, -0.045], [0.042, -0.01], [0.046, 0.02]], 16).rotateX(Math.PI / 2).translate(lamp.x, lamp.y, lamp.z), C.cream));
  g.push(colored(new THREE.SphereGeometry(0.043, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.35).rotateX(Math.PI / 2).translate(lamp.x, lamp.y, lamp.z + 0.005), C.lamp, 3));
  g.push(...mudguard(FRONT, -Math.PI * 0.08, Math.PI * 0.72));
  return merge(g).translate(-HEAD_LO.x, -HEAD_LO.y, -HEAD_LO.z);
}

/** A wheel around the origin, spinning about x. */
function wheelGeometry(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  g.push(colored(new THREE.TorusGeometry(WHEEL_R - 0.03, 0.03, 10, 48).rotateY(Math.PI / 2), C.tyre));
  g.push(colored(new THREE.TorusGeometry(WHEEL_R - 0.062, 0.011, 6, 48).rotateY(Math.PI / 2), C.metal));
  g.push(colored(new THREE.CylinderGeometry(0.028, 0.028, 0.1, 12).rotateZ(Math.PI / 2), C.metal));
  // A few chunky spokes read better than a realistic 36 at this scale.
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = i % 2 ? 1 : -1;
    const hub = new THREE.Vector3(0.035 * s, Math.sin(a) * 0.03, Math.cos(a) * 0.03);
    const rim = new THREE.Vector3(0.004 * s, Math.sin(a + 0.25) * (WHEEL_R - 0.07), Math.cos(a + 0.25) * (WHEEL_R - 0.07));
    g.push(...rod(hub, rim, 0.0055, C.metal, 5, false));
  }
  return merge(g);
}

/** Spindle, two crank arms (right one forward at angle 0) and the chainring. */
function crankGeometry(): THREE.BufferGeometry {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const g: THREE.BufferGeometry[] = [];
  g.push(...rod(V(-0.085, 0, 0), V(0.085, 0, 0), 0.02, C.dark, 8, false));
  g.push(...rod(V(-0.085, 0, 0), V(-0.085, 0, CRANK_LEN), 0.014, C.metal, 8));
  g.push(...rod(V(0.085, 0, 0), V(0.085, 0, -CRANK_LEN), 0.014, C.metal, 8));
  g.push(colored(new THREE.TorusGeometry(0.085, 0.012, 6, 28).rotateY(Math.PI / 2).translate(-0.07, 0, 0), C.metal));
  g.push(colored(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 14).rotateZ(Math.PI / 2).translate(-0.07, 0, 0), C.dark));
  return merge(g);
}

function pedalGeometry(): THREE.BufferGeometry {
  return merge([
    colored(new RoundedBoxGeometry(0.09, 0.026, 0.065, 2, 0.01), C.dark),
    colored(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 6).rotateZ(Math.PI / 2), C.metal),
  ]);
}

/** The kickstand, hanging from its pivot (-y), folded or down per pose. */
function kickGeometry(): THREE.BufferGeometry {
  const g = rod(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -KICK_LEN, 0), 0.011, C.metal, 6);
  g.push(colored(new RoundedBoxGeometry(0.035, 0.012, 0.05, 1, 0.005).translate(0, -KICK_LEN, 0), C.dark));
  return merge(g);
}

// ------------------------------------------------------------------ batches

let parts: {
  frame: PartBatch; steer: PartBatch; wheel: PartBatch; crank: PartBatch; pedal: PartBatch; kick: PartBatch; all: PartBatch[];
} | null = null;

/** The shared instanced batches for every bicycle (built on first use). */
export function bikeBatches(max = 24) {
  if (parts) return parts;
  const look = { keep: 0.72 };
  const frame = new PartBatch(frameGeometry(), look, max);
  const steer = new PartBatch(steerGeometry(), look, max);
  const wheel = new PartBatch(wheelGeometry(), look, max * 2);
  const crank = new PartBatch(crankGeometry(), look, max);
  const pedal = new PartBatch(pedalGeometry(), look, max * 2);
  const kick = new PartBatch(kickGeometry(), look, max);
  parts = { frame, steer, wheel, crank, pedal, kick, all: [frame, steer, wheel, crank, pedal, kick] };
  return parts;
}

// ------------------------------------------------------------------ skeleton

/** Everything that animates on one bicycle. */
export interface BikePose {
  /** Ground point between the tyres, and heading (0 = +z). */
  pos: THREE.Vector3;
  heading: number;
  /** Nose-up (rad), lean toward the rider's left (rad), bars (rad, + = left). */
  pitch: number;
  lean: number;
  steer: number;
  /** Wheel roll and crank angles (rad). */
  roll: number;
  crank: number;
  /** 0 = kickstand folded, 1 = down. */
  stand: number;
  /** Size (1 = a grown-up's bike; the hearth spirit's is little). */
  scale?: number;
}

export class BikeSkeleton {
  readonly root = new THREE.Object3D();
  private steer = new THREE.Object3D();
  private front = new THREE.Object3D();
  private rear = new THREE.Object3D();
  private crank = new THREE.Object3D();
  private pedalL = new THREE.Object3D();
  private pedalR = new THREE.Object3D();
  private kick = new THREE.Object3D();

  constructor() {
    const r = this.root;
    r.rotation.order = 'YXZ';
    this.steer.position.copy(HEAD_LO);
    this.front.position.copy(FRONT).sub(HEAD_LO);
    this.steer.add(this.front);
    this.rear.position.copy(REAR);
    this.crank.position.copy(BB);
    this.pedalL.position.set(PEDAL_X, 0, -CRANK_LEN);
    this.pedalR.position.set(-PEDAL_X, 0, CRANK_LEN);
    this.crank.add(this.pedalL, this.pedalR);
    this.kick.position.copy(KICK_PIVOT);
    r.add(this.steer, this.rear, this.crank, this.kick);
  }

  pose(p: BikePose) {
    this.root.position.copy(p.pos);
    this.root.rotation.set(-p.pitch, p.heading, -p.lean);
    this.root.scale.setScalar(p.scale ?? 1);
    this.steer.quaternion.setFromAxisAngle(STEER_AXIS, p.steer);
    this.front.rotation.x = p.roll;
    this.rear.rotation.x = p.roll;
    this.crank.rotation.x = p.crank;
    // Pedals stay level whatever the crank is doing.
    this.pedalL.rotation.x = this.pedalR.rotation.x = -p.crank;
    // Folded back along the chainstay, or swung down and out to the left.
    const s = p.stand;
    this.kick.rotation.set(THREE.MathUtils.lerp(1.42, 0.12, s), 0, THREE.MathUtils.lerp(0.02, PARK_LEAN + 0.24, s));
    this.root.updateMatrixWorld(true);
  }

  emit(b: ReturnType<typeof bikeBatches>, tint: THREE.Color) {
    b.frame.push(this.root.matrixWorld, tint);
    b.steer.push(this.steer.matrixWorld, tint);
    b.wheel.push(this.front.matrixWorld, tint);
    b.wheel.push(this.rear.matrixWorld, tint);
    b.crank.push(this.crank.matrixWorld, tint);
    b.pedal.push(this.pedalL.matrixWorld, tint);
    b.pedal.push(this.pedalR.matrixWorld, tint);
    b.kick.push(this.kick.matrixWorld, tint);
  }

  /** Top of a pedal (world), where the ball of the foot goes. */
  pedal(side: 'L' | 'R', out: THREE.Vector3) {
    return (side === 'L' ? this.pedalL : this.pedalR).localToWorld(out.set(0, 0.018, 0));
  }

  /** A grip (world), where the mitten closes. */
  grip(side: 'L' | 'R', out: THREE.Vector3) {
    out.set(side === 'L' ? GRIP.x : -GRIP.x, GRIP.y, GRIP.z).sub(HEAD_LO);
    return this.steer.localToWorld(out);
  }

  /** The rider's hip joint (world); the rider takes the bike's orientation (`root.quaternion`). */
  seat(out: THREE.Vector3) {
    return this.root.localToWorld(out.copy(SEAT));
  }

  /** A bike-space point to world. */
  toWorld(x: number, y: number, z: number, out: THREE.Vector3) {
    return this.root.localToWorld(out.set(x, y, z));
  }
}
