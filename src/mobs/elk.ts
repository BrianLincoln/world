import * as THREE from 'three';
import type { MountSpec } from '../player/movement';
import type { WorldGen } from '../world/worldgen';
import { colored, furBall, lathe, merge, mirrorX, PartBatch, Spring } from './parts';
import type { Flock, Mob, MobCtx, Species } from './types';

// The elk: the big one. A storybook stag, long-legged and deep-chested, with
// a dark shaggy ruff, a cream rump and a great sweep of pale antlers. Herds
// of 2-5 graze in meadows and along forest edges, heads down in the grass,
// looking up now and then; get too close and they wheel away at a gallop.
// Lassoed and tamed, it's the fastest thing on legs, and at a full gallop it
// bowls trees over (see `Story.knockTree`). It never flies.

const INK_ANTLER = '#efe2c7';
const HOOF = '#4b3a3c';
const NOSE = '#4f3d40';
/** Multipliers on the coat tint: the neck and legs run darker. */
const NECK = '#ffffff';
const RUFF = '#f2ebe6';
const LEG = '#f4ede8';
const SADDLE = '#b8473a';
const TRIM = '#f1e6d2';
const ROPE = '#c9a26b';
const LEATHER = '#6e4a33';
const BRASS = '#d9b36a';
/** Coats: fawn, silver-grey, chestnut; and now and then a snow-white one. */
const COATS = ['#caa27a', '#b9ada2', '#a3735a'].map((h) => new THREE.Color(h));
const SNOW = new THREE.Color('#f3ede3');
const MAX = 24;
/** Herds keep clear of the story cabin's yard. */
const BASE_CLEAR = 80;
/** Keep off a beacon tower's hilltop: its stack, doorway and room are within ~35 m. */
const TOWER_CLEAR = 55;

/** Body frame: barrel centre at the origin, +z forward, y up. Root is the feet. */
const BODY_Y = 1.5;
const RX = 0.43, RY = 0.48, RZ = 0.9;
const NECK_BASE = new THREE.Vector3(0, 0.3, 0.6);
const NECK_L = 0.9;
/** Neck tilt from vertical (rad, forward) at rest, grazing, at a gallop. */
const TILT_UP = 0.36, TILT_GRAZE = 2.3, TILT_RUN = 0.95;
const FRONT = new THREE.Vector3(0.24, -0.18, 0.52);
const HIND = new THREE.Vector3(0.25, -0.05, -0.6);
const F_UP = 0.6, F_LO = 0.72;
const H_UP = 0.8, H_LO = 0.71, H_REST = 0.38;
/** Where the lasso rides on the neck (neck frame). */
const COLLAR_Y = 0.32;

// ---------------------------------------------------------------- shapes

const sv = new THREE.Vector3();
const sd = new THREE.Vector3();
const st1 = new THREE.Vector3();
const st2 = new THREE.Vector3();
const sa = new THREE.Vector3();
const sb = new THREE.Vector3();
const sc = new THREE.Vector3();
const sdd = new THREE.Vector3();

/**
 * Map a sphere (or a piece of one) through `fn` (unit direction -> surface
 * point), with normals from the mapped surface, pushed out by `off` along
 * them. Pieces cut from the same sphere (a rump patch, a saddle) land exactly
 * on the body with smooth edges.
 */
function sculpt(geo: THREE.BufferGeometry, fn: (d: THREE.Vector3, out: THREE.Vector3) => THREE.Vector3, off = 0) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
  const e = 1e-3;
  const at = (dir: THREE.Vector3, k1: number, k2: number, out: THREE.Vector3) =>
    fn(sv.copy(dir).addScaledVector(st1, k1).addScaledVector(st2, k2).normalize(), out);
  for (let i = 0; i < pos.count; i++) {
    sd.fromBufferAttribute(pos, i).normalize();
    st1.crossVectors(sd, Math.abs(sd.y) < 0.9 ? Y : X).normalize();
    st2.crossVectors(sd, st1);
    at(sd, e, 0, sa); at(sd, -e, 0, sb);
    sa.sub(sb);
    at(sd, 0, e, sc); at(sd, 0, -e, sdd);
    sc.sub(sdd);
    const n = sb.crossVectors(sa, sc).normalize();
    if (n.dot(sd) < 0) n.negate();
    fn(sd, sc);
    sc.addScaledVector(n, off);
    pos.setXYZ(i, sc.x, sc.y, sc.z);
    nrm.setXYZ(i, n.x, n.y, n.z);
  }
  return geo;
}
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

const smooth = THREE.MathUtils.smoothstep;

/**
 * The barrel, stag-shaped: a deep, powerful chest and high withers up front,
 * the back sloping down to a rounded rump, a neat tucked waist.
 */
function barrel(d: THREE.Vector3, out: THREE.Vector3) {
  const { x, y, z } = d;
  const front = smooth(z, -0.1, 0.8);
  const rear = smooth(-z, 0.2, 0.9);
  let X_ = x * RX * (1 + 0.13 * front - 0.06 * rear);
  let Y_ = y * RY;
  if (y < 0) {
    // The chest drops deep; the belly tucks up toward the flank.
    Y_ *= 1 + 0.34 * front;
    Y_ += 0.1 * Math.exp(-(((z + 0.3) / 0.4) ** 2)) * -y;
  } else {
    // Withers high over the shoulders, the back running down to the rump.
    Y_ += 0.2 * Math.exp(-(((z - 0.42) / 0.32) ** 2)) * y ** 1.3;
    Y_ *= 1 - 0.1 * rear;
  }
  // Haunches: round over the hips.
  X_ *= 1 + 0.07 * Math.exp(-(((z + 0.58) / 0.25) ** 2));
  return out.set(X_, Y_, z * RZ);
}

/** A tube along points, tapering r0 -> r1, with a rounded tip. */
function taper(pts: [number, number, number][], r0: number, r1: number, segs = 20, radial = 9) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const fr = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, p);
    const r = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.85));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      n.copy(fr.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      nrm.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  const end = curve.getPointAt(1);
  const tip = new THREE.SphereGeometry(r1, 10, 8).translate(end.x, end.y, end.z);
  return [g, tip];
}

function bodyGeometry() {
  const body = sculpt(new THREE.SphereGeometry(1, 72, 44), barrel);
  // The cream rump, a patch lying on the body.
  // A shaggy ruff where the neck meets the chest.
  const ruff = furBall({
    widthSegs: 40, heightSegs: 30, tufts: 50, amp: 0.08, sweep: 0.1, width: 1.2, share: 0.35, seed: 17,
    comb: (d, out) => out.set(0, -1, 0.2).addScaledVector(d, -d.dot(out)).normalize(),
  }).scale(0.3, 0.4, 0.24).translate(0, -0.08, 0.7);
  // A short fluffy tail, tucked down.
  const tail = furBall({ widthSegs: 20, heightSegs: 14, tufts: 12, amp: 0.18, sweep: 0.12, seed: 4, comb: (d, out) => out.set(0, -1, -0.3).addScaledVector(d, -d.dot(out)).normalize() })
    .scale(0.1, 0.16, 0.08).rotateX(-0.5).translate(0, 0.12, -0.9);
  return merge([colored(body, '#ffffff'), colored(ruff, RUFF), colored(tail, '#ffffff')]);
}

function neckGeometry() {
  // Up the +y axis from the base (buried in the body) into the head.
  const prof: [number, number][] = [[0.0, 0.98], [0.09, 0.96], [0.145, 0.86], [0.18, 0.66], [0.23, 0.42], [0.3, 0.16], [0.36, -0.08], [0.32, -0.26], [0.0, -0.36]];
  const neck = lathe(prof.map(([r, y]) => [r, y] as [number, number]), 28).scale(0.8, 1, 1.12);
  // The throat mane: long shaggy hair hanging under the neck (+z is the throat side).
  const mane = furBall({
    widthSegs: 44, heightSegs: 36, tufts: 56, amp: 0.1, sweep: 0.14, width: 1.2, share: 0.4, seed: 23,
    comb: (d, out) => out.set(0, -0.8, 0.6).addScaledVector(d, -d.dot(out)).normalize(),
    mask: (d) => smooth(d.z, -0.3, 0.3),
  }).scale(0.18, 0.42, 0.17).translate(0, 0.3, 0.13);
  return merge([colored(neck, NECK), colored(mane, RUFF)]);
}

/** One antler (the left, +x), rooted at the origin, in head space. */
function antler() {
  const g: THREE.BufferGeometry[] = [];
  const add = (pts: [number, number, number][], r0: number, r1: number, segs = 16) => {
    for (const p of taper(pts, r0, r1, segs)) g.push(colored(p, INK_ANTLER, 0, false));
  };
  // Main beam: up and out, sweeping back, then curling forward at the crown.
  add([[0, -0.02, 0], [0.12, 0.1, -0.08], [0.3, 0.3, -0.2], [0.5, 0.52, -0.28], [0.64, 0.78, -0.22], [0.7, 1.0, -0.08], [0.68, 1.16, 0.08]], 0.066, 0.022, 30);
  // Brow tine: low, reaching forward over the face.
  add([[0.12, 0.1, -0.07], [0.2, 0.16, 0.1], [0.24, 0.26, 0.26], [0.25, 0.36, 0.34]], 0.042, 0.015);
  // Bez tine.
  add([[0.3, 0.3, -0.2], [0.36, 0.38, -0.02], [0.4, 0.5, 0.12]], 0.038, 0.014);
  // Royal tine: the long one, up and forward.
  add([[0.5, 0.52, -0.28], [0.56, 0.7, -0.12], [0.58, 0.86, 0.0], [0.57, 0.96, 0.06]], 0.036, 0.013);
  // Back tine off the crown.
  add([[0.66, 0.86, -0.2], [0.78, 0.94, -0.3], [0.86, 1.04, -0.32]], 0.03, 0.012);
  // Crown fork.
  add([[0.7, 1.0, -0.08], [0.8, 1.08, -0.06], [0.86, 1.2, -0.02]], 0.028, 0.011);
  // A knobbly burr at the base.
  g.push(colored(new THREE.TorusGeometry(0.066, 0.026, 6, 14).rotateX(Math.PI / 2 - 0.3).translate(0.004, 0.0, 0), INK_ANTLER, 0, false));
  // Wide and lyre-shaped, a crown rather than a pair of spikes.
  return merge(g).scale(1.12, 0.8, 0.88);
}

/** Head space: origin at the top of the neck, +z along the muzzle. */
const CRANIUM = new THREE.Vector3(0, 0.05, 0.02);
function headGeometry() {
  const cranium = new THREE.SphereGeometry(0.2, 40, 30).translate(CRANIUM.x, CRANIUM.y, CRANIUM.z);
  // Muzzle: long and soft, a touch Roman-nosed.
  const muzzle = sculpt(new THREE.SphereGeometry(1, 36, 26), (d, out) => {
    const t = d.z;
    // A long wedge tapering to a fine nose.
    const k = 1 - 0.45 * smooth(t, -0.1, 1);
    return out.set(d.x * 0.12 * k, d.y * 0.125 * k + 0.02 * Math.max(0, d.y) * (1 - t * t), d.z * 0.3);
  }).translate(0, -0.04, 0.27);
  const nose = new THREE.SphereGeometry(1, 20, 14).scale(0.052, 0.04, 0.02).translate(0, -0.035, 0.548);
  const a = antler();
  const L = a.clone().translate(0.08, 0.2, -0.03);
  const R = mirrorX(a);
  R.translate(-0.08, 0.2, -0.03);
  return merge([colored(cranium, '#ffffff', 1), colored(muzzle, '#ffffff'), colored(nose, NOSE, 0, false), L, R]);
}

function earGeometry() {
  // A soft leaf along +y from the root, the broad face forward.
  const prof: [number, number][] = [[0, 0.3], [0.03, 0.28], [0.065, 0.22], [0.08, 0.14], [0.07, 0.06], [0.045, 0.01], [0, -0.01]];
  const ear = lathe(prof, 18).scale(1, 1, 0.38);
  const inner = lathe(prof.map(([r, y]) => [r * 0.62, y * 0.8 + 0.03] as [number, number]), 14).scale(1, 1, 0.2).translate(0, 0, 0.012);
  return merge([colored(ear, '#ffffff'), colored(inner, '#e9ddd6')]);
}

function legGeometry(hind: boolean, upper: boolean) {
  const g: THREE.BufferGeometry[] = [];
  if (upper) {
    const L = hind ? H_UP : F_UP;
    const prof: [number, number][] = hind
      ? [[0, 0.16], [0.19, 0.1], [0.25, -0.1], [0.22, -0.3], [0.14, -0.52], [0.09, -0.7], [0.08, -L], [0, -L - 0.08]]
      : [[0, 0.16], [0.17, 0.08], [0.2, -0.08], [0.16, -0.26], [0.1, -0.46], [0.078, -L], [0, -L - 0.08]];
    g.push(colored(lathe(prof, 16).scale(0.82, 1, 1), LEG));
  } else {
    const L = hind ? H_LO : F_LO;
    const prof: [number, number][] = [[0, 0.08], [0.075, 0.035], [0.07, -0.06], [0.05, -0.2], [0.047, -L + 0.2], [0.06, -L + 0.13], [0.053, -L + 0.08], [0, -L + 0.07]];
    g.push(colored(lathe(prof, 14).scale(0.9, 1, 1), LEG));
    // Hoof: a dark rounded wedge, flat underneath.
    const hoof = lathe([[0, -L + 0.1], [0.05, -L + 0.095], [0.07, -L + 0.03], [0.074, -L], [0, -L]], 14).scale(0.95, 1, 1.12).translate(0, 0, 0.012);
    g.push(colored(hoof, HOOF, 0, false));
  }
  return merge(g);
}

/** A knitted blanket over the back (sculpted onto the barrel), with a cream hem. */
function saddleGeometry() {
  const rows = 10, cols = 56;
  const tilt = new THREE.Quaternion().setFromAxisAngle(X, 0.12);
  const dir = new THREE.Vector3();
  const pt = (i: number, j: number) => {
    const th = (j / cols) * Math.PI * 2;
    const scallop = 1 + 0.06 * Math.abs(Math.sin(th * 6));
    const phi = (i / rows) * 0.42 * scallop * (1 + 1.3 * Math.cos(th) ** 2);
    return dir.set(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)).applyQuaternion(tilt).clone();
  };
  const pos: number[] = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = pt(i, j), b = pt(i + 1, j), c = pt(i, j + 1), d = pt(i + 1, j + 1);
    pos.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...c.toArray(), ...b.toArray(), ...d.toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.slice(), 3));
  sculpt(g, barrel, 0.03);
  const edge: THREE.Vector3[] = [];
  for (let j = 0; j < cols; j++) {
    const d0 = pt(rows, j);
    const p = barrel(d0, new THREE.Vector3());
    edge.push(p.addScaledVector(d0, 0.04));
  }
  const hem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge, true), 120, 0.03, 6, true);
  // A saddle pad on top where the rider sits.
  const pad = sculpt(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, 0.26).applyQuaternion(tilt), barrel, 0.075);
  return merge([colored(g, SADDLE), colored(hem, TRIM), colored(pad, '#7a4a36')]);
}

/** A halter in head space: noseband, crown strap behind the antlers, brass rings. */
function bridleGeometry() {
  const strap = (pts: [number, number, number][], closed: boolean, r = 0.017) =>
    colored(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed), closed ? 40 : 48, r, 6, closed), LEATHER);
  const nose: [number, number, number][] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    nose.push([Math.cos(a) * 0.126, -0.03 + Math.sin(a) * 0.134, 0.3]);
  }
  const crown: [number, number, number][] = [[0.124, -0.02, 0.3], [0.16, 0.03, 0.15], [0.2, 0.08, -0.03], [0.14, 0.19, -0.16], [0, 0.23, -0.19], [-0.14, 0.19, -0.16], [-0.2, 0.08, -0.03], [-0.16, 0.03, 0.15], [-0.124, -0.02, 0.3]];
  const ring = (x: number) => colored(new THREE.TorusGeometry(0.035, 0.012, 6, 14).rotateY(Math.PI / 2).translate(x, -0.05, 0.3), BRASS);
  return merge([strap(nose, true, 0.02), strap(crown, false), ring(0.13), ring(-0.13)]);
}

function collarGeometry() {
  return colored(new THREE.TorusGeometry(0.3, 0.035, 6, 32).rotateX(Math.PI / 2), ROPE);
}

// ---------------------------------------------------------------- brain + pose

type Act = 'graze' | 'look' | 'step';

interface ElkData {
  root: THREE.Object3D;
  body: THREE.Object3D;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  ears: THREE.Object3D[];
  upper: THREE.Object3D[];
  lower: THREE.Object3D[];
  saddle: THREE.Object3D;
  collar: THREE.Object3D;
  seat: THREE.Object3D;
  // brain
  act: Act;
  idle: number;
  goal: THREE.Vector3 | null;
  slot: THREE.Vector2;
  face: number | null;
  speed: number;
  // anim
  t: number;
  stride: number;
  gait: Spring;
  tilt: Spring;
  headX: Spring;
  pitch: Spring;
  bank: Spring;
  bounce: number;
  turn: number;
  prevHeading: number;
  headYaw: number;
  graze: number;
  chew: number;
  earT: number[];
  earFlick: number[];
  tail: number;
  blinkAt: number;
  look: THREE.Vector2;
  lookAt: THREE.Vector3 | null;
  eye: THREE.Vector4;
  /** Antler butt (s since it started; <0 = none), and rearing. */
  butt: number;
  rear: Spring;
  air: number;
  wet: number;
  /** Body raised to keep the hooves out of the ground (m). */
  lift: number;
}

const tv = new THREE.Vector3();
const tv2 = new THREE.Vector3();
const hip = new THREE.Vector3();
const WHITE = new THREE.Color(1, 1, 1);
const seatPos = new THREE.Vector3();
const seatQuat = new THREE.Quaternion();
const frac = (x: number) => x - Math.floor(x);
const lerp = THREE.MathUtils.lerp;

/** Leg order: left fore, right fore, left hind, right hind. */
const LEGS: { hind: boolean; s: number }[] = [{ hind: false, s: 1 }, { hind: false, s: -1 }, { hind: true, s: 1 }, { hind: true, s: -1 }];
/** Footfall phase per leg for the walk (lateral 4-beat), trot (diagonals), gallop (rotary). */
const WALK = [0.25, 0.75, 0, 0.5];
const TROT = [0, 0.5, 0.5, 0];
const GALLOP = [0.48, 0.6, 0.0, 0.1];

export class Elk implements Species {
  readonly name = 'elk' as const;
  readonly radius = 0.75;
  readonly centreY = BODY_Y;
  readonly flockSize: [number, number] = [2, 5];
  readonly mount: MountSpec = {
    name: 'elk',
    radius: 0.6,
    // Faster than anything else on legs: a canter, and a flat-out gallop
    // that takes a few seconds to build.
    walk: { speed: 10, sprint: 34, takeoff: 0 },
    leap: 9.5,
    swim: 0.45,
    gather: 2.6,
  };
  readonly bodyB: PartBatch;
  readonly neckB: PartBatch;
  readonly headB: PartBatch;
  readonly earB: PartBatch;
  readonly legB: PartBatch[];
  readonly saddleB: PartBatch;
  readonly bridleB: PartBatch;
  readonly collarB: PartBatch;
  readonly batches: PartBatch[];

  constructor() {
    // One animal, not a jointed toy: the seams where parts meet don't ink.
    const look = { keep: 0.55, softCrease: 0.8 };
    this.bodyB = new PartBatch(bodyGeometry(), look, MAX);
    this.neckB = new PartBatch(neckGeometry(), look, MAX);
    // The same painted eyes as every creature (white, black pupil), kept
    // small and set to the sides so the face stays calm, not googly.
    this.headB = new PartBatch(headGeometry(), {
      ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.9, 0.2], eyeSize: [0.17, 0.19], pupil: [0.068, 0.088], lookRange: [0.1, 0.07], eyeTilt: 0.1,
    }, MAX);
    this.earB = new PartBatch(earGeometry(), look, MAX * 2);
    this.legB = [
      new PartBatch(legGeometry(false, true), look, MAX * 2),
      new PartBatch(legGeometry(false, false), look, MAX * 2),
      new PartBatch(legGeometry(true, true), look, MAX * 2),
      new PartBatch(legGeometry(true, false), look, MAX * 2),
    ];
    this.saddleB = new PartBatch(saddleGeometry(), { keep: 0.75, doubleSide: true }, 12);
    this.bridleB = new PartBatch(bridleGeometry(), { keep: 0.7 }, 12);
    this.collarB = new PartBatch(collarGeometry(), { keep: 0.6 }, 12);
    this.batches = [this.bodyB, this.neckB, this.headB, this.earB, ...this.legB, this.saddleB, this.bridleB, this.collarB];
  }

  // ------------------------------------------------------------ places

  private nearBase(gen: WorldGen, x: number, z: number) {
    const s = gen.story;
    // Nor round a beacon tower's foot (or inside its doorway's room).
    return Math.hypot(x - s.x, z - s.z) < BASE_CLEAR || gen.towerDist(x, z, 120) < TOWER_CLEAR;
  }

  /** Lower = better grazing. Infinity = unusable (water, cliffs, deep forest). */
  private groundScore(gen: WorldGen, x: number, z: number) {
    if (this.nearBase(gen, x, z)) return Infinity;
    const h = gen.height(x, z);
    if (h < 2 || h > 160) return Infinity;
    const slope = Math.abs(gen.height(x + 3, z) - h) + Math.abs(gen.height(x, z + 3) - h);
    if (slope > 1.6) return Infinity;
    const forest = gen.forestDensity(x, z, h);
    if (forest > 0.4) return Infinity;
    // Meadows, and the edges of woods, are best.
    return Math.abs(forest - 0.12) * 3 + slope * 0.4;
  }

  private findSpot(gen: WorldGen, from: THREE.Vector3, away: THREE.Vector3 | null, rnd: () => number, out: THREE.Vector3, rMin: number, rMax: number) {
    let best = Infinity;
    const base = away ? Math.atan2(from.x - away.x, from.z - away.z) : rnd() * Math.PI * 2;
    for (let k = 0; k < 20; k++) {
      const a = base + (rnd() - 0.5) * (away ? 1.4 : Math.PI * 2);
      const r = rMin + rnd() * (rMax - rMin);
      const x = from.x + Math.sin(a) * r, z = from.z + Math.cos(a) * r;
      const s = this.groundScore(gen, x, z) + rnd() * 0.3;
      if (s < best) { best = s; out.set(x, gen.height(x, z), z); }
    }
    return best < 2;
  }

  /** Herds are found grazing somewhere out of view: nearer at load, further off later. */
  launch(f: Flock, ctx: MobCtx, rnd: () => number, initial: boolean): boolean {
    const p = ctx.player.pos;
    const fd = f.data;
    fd.spot = new THREE.Vector3();
    for (let k = 0; k < 6; k++) {
      if (!this.findSpot(ctx.gen, p, null, rnd, fd.spot, initial ? 70 : 150, initial ? 300 : 320)) continue;
      if (ctx.hidden && !ctx.hidden(fd.spot.x, fd.spot.y + 2, fd.spot.z, 12)) continue;
      fd.mode = 'graze';
      fd.relocate = 40 + rnd() * 80;
      fd.facing = rnd() * Math.PI * 2;
      f.centre.copy(fd.spot);
      f.target.copy(fd.spot);
      return true;
    }
    return false;
  }

  initMob(m: Mob, i: number, f: Flock, ctx: MobCtx) {
    const r = m.rnd;
    const o = () => new THREE.Object3D();
    const d: ElkData = {
      root: o(), body: o(), neck: o(), head: o(), ears: [o(), o()], upper: [o(), o(), o(), o()], lower: [o(), o(), o(), o()], saddle: o(), collar: o(), seat: o(),
      act: 'graze', idle: r() * 4, goal: null, slot: new THREE.Vector2(), face: null, speed: 0,
      t: r() * 10, stride: r(), gait: new Spring(0), tilt: new Spring(TILT_GRAZE), headX: new Spring(-0.9), pitch: new Spring(), bank: new Spring(),
      bounce: 0, turn: 0, prevHeading: 0, headYaw: 0, graze: 1, chew: 0, earT: [r() * 3, r() * 3], earFlick: [0, 0], tail: 0,
      blinkAt: r() * 4, look: new THREE.Vector2(), lookAt: null, eye: new THREE.Vector4(0, 0, 1, 0), butt: -1, rear: new Spring(0), air: 0, wet: 0, lift: 0,
    };
    d.root.add(d.body);
    d.body.position.y = BODY_Y;
    d.body.add(d.neck);
    d.neck.position.copy(NECK_BASE);
    d.neck.rotation.order = 'YXZ';
    d.neck.add(d.head, d.collar);
    d.head.position.set(0, NECK_L, 0);
    d.head.scale.setScalar(1.2);
    d.collar.position.set(0, COLLAR_Y, 0.03);
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      d.ears[k].position.set(s * 0.15, 0.13, -0.08);
      d.head.add(d.ears[k]);
    }
    for (let k = 0; k < 4; k++) {
      const L = LEGS[k];
      const P = L.hind ? HIND : FRONT;
      d.upper[k].position.set(L.s * P.x, P.y, P.z);
      d.body.add(d.upper[k]);
      d.lower[k].position.set(0, -(L.hind ? H_UP : F_UP), 0);
      d.upper[k].add(d.lower[k]);
    }
    d.body.add(d.saddle);
    d.seat.position.set(0, 0.66, 0.06);
    d.body.add(d.seat);
    m.data = d;
    // Spread loosely over the grazing spot, most facing roughly one way.
    const a = r() * Math.PI * 2, rr = 2 + Math.sqrt(r()) * 8;
    d.slot.set(Math.cos(a) * rr, Math.sin(a) * rr);
    const x = f.centre.x + d.slot.x, z = f.centre.z + d.slot.y;
    m.pos.set(x, this.floor(ctx, x, z), z);
    m.heading = (f.data.facing ?? 0) + (r() - 0.5) * 2.2;
    d.prevHeading = m.heading;
    m.grounded = true;
    // A herd shares a coat, with the odd one out; once in a while a white one.
    f.data.coat ??= Math.floor((f.data.rnd as () => number)() * COATS.length);
    const coat = r() < 0.75 ? f.data.coat : Math.floor(r() * COATS.length);
    m.tint.copy(r() < 0.06 ? SNOW : COATS[coat]).multiplyScalar(0.96 + r() * 0.08);
  }

  /** Where the hooves stand: the ground, or wading / swimming in deep water. */
  private floor(ctx: MobCtx, x: number, z: number) {
    return Math.max(ctx.gen.height(x, z), ctx.surface(x, z) - 1.25);
  }

  thinkFlock(f: Flock, ctx: MobCtx) {
    const fd = f.data;
    const rnd = fd.rnd as () => number;
    const { player, dt } = ctx;
    // Personal space.
    const M = f.members;
    for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {
      const a = M[i], b = M[j];
      tv.subVectors(a.pos, b.pos).setY(0);
      const dd = tv.length();
      const min = 2.6;
      if (dd >= min) continue;
      if (dd < 1e-3) tv.set(1, 0, 0);
      tv.setLength(Math.min(min - dd, 2 * dt) * 0.5);
      a.pos.add(tv);
      b.pos.sub(tv);
    }
    let near = Infinity;
    for (const m of M) near = Math.min(near, Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z));
    const fast = Math.hypot(player.vel.x, player.vel.z) > 7 || player.mode === 'ride';
    // Wary, not skittish: they let you walk quite close, but not run up.
    const scare = fast ? 20 : 10;
    if (fd.alarm || near < scare) {
      if (fd.mode !== 'flee') {
        fd.mode = 'flee';
        // Away from you, onto good ground if there is some.
        if (!this.findSpot(ctx.gen, f.centre, player.pos, rnd, f.target, 60, 110)) {
          const a = Math.atan2(f.centre.x - player.pos.x, f.centre.z - player.pos.z);
          f.target.set(f.centre.x + Math.sin(a) * 70, 0, f.centre.z + Math.cos(a) * 70);
        }
      }
      fd.fleeT = 4 + rnd() * 3;
      fd.alarm = false;
    }
    if (fd.mode === 'flee') {
      fd.fleeT -= dt;
      tv.subVectors(f.target, f.centre).setY(0);
      const dist = tv.length();
      if (dist > 1) f.centre.addScaledVector(tv.normalize(), Math.min(dist, 13 * dt));
      if (fd.fleeT < 0 && (dist < 6 || near > 45)) {
        fd.mode = 'graze';
        fd.spot.copy(f.centre);
        f.target.copy(f.centre);
        fd.relocate = 30 + rnd() * 60;
        for (const m of M) (m.data as ElkData).idle = 0.5 + rnd() * 2;
      }
      return;
    }
    if (fd.mode === 'walk') {
      tv.subVectors(f.target, f.centre).setY(0);
      const dist = tv.length();
      if (dist > 0.5) f.centre.addScaledVector(tv.normalize(), Math.min(dist, 1.3 * dt));
      else {
        fd.mode = 'graze';
        fd.spot.copy(f.target);
        fd.relocate = 40 + rnd() * 80;
      }
      return;
    }
    fd.relocate -= dt;
    if (fd.relocate < 0) {
      // Wander on to fresh grass.
      if (this.findSpot(ctx.gen, fd.spot, null, rnd, f.target, 30, 90)) fd.mode = 'walk';
      fd.relocate = 40 + rnd() * 60;
    }
  }

  think(m: Mob, ctx: MobCtx, leashIndex: number) {
    const d = m.data as ElkData;
    if (m.ridden) return;
    const { dt, player } = ctx;
    d.lookAt = null;
    const toPlayer = Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z);
    const goal = tv;
    let speed = 0;
    let face: number | null = null;
    d.graze = 0;

    if (m.state === 'caught') {
      // Plunging and hauling against the rope.
      tv2.subVectors(m.pos, player.pos).setY(0).normalize();
      goal.copy(m.pos).addScaledVector(tv2, 3).add(tv2.set(Math.sin(m.stateT * 3) * 2, 0, Math.cos(m.stateT * 2.3) * 2));
      speed = 3.5;
      d.lookAt = player.pos;
    } else if (m.state === 'wild' && m.flock) {
      const f = m.flock;
      const fd = f.data;
      if (fd.mode === 'flee' || fd.mode === 'walk') {
        goal.set(f.centre.x + d.slot.x * 0.8, 0, f.centre.z + d.slot.y * 0.8);
        speed = fd.mode === 'flee' ? 13 + (m.rnd() - 0.5) * 0.3 : 1.5;
        // Catch up if it's fallen behind.
        const lag = Math.hypot(goal.x - m.pos.x, goal.z - m.pos.z);
        if (lag > 6) speed *= fd.mode === 'flee' ? 1.25 : 2.5;
        d.act = 'look';
        if (fd.mode === 'flee' && toPlayer < 30) d.lookAt = player.pos;
      } else {
        this.forage(m, fd.spot as THREE.Vector3, player.pos, dt);
        goal.copy(d.goal ?? m.pos);
        speed = d.act === 'step' ? 1.1 : 0;
        if (d.act === 'look' && toPlayer < 40) d.lookAt = player.pos;
        if (d.act === 'graze') d.graze = 1;
        face = d.face;
      }
    } else if (m.leashed) {
      // Trots along behind, fanned out if several.
      const back = 4.8 + leashIndex * 2.6;
      const side = (leashIndex % 2 ? -1 : 1) * Math.ceil(leashIndex / 2) * 2.4;
      const sh = Math.sin(player.heading), ch = Math.cos(player.heading);
      goal.set(player.pos.x - sh * back + ch * side, 0, player.pos.z - ch * back - sh * side);
      const dist = Math.hypot(goal.x - m.pos.x, goal.z - m.pos.z);
      speed = Math.min(36, dist * 1.6 + Math.hypot(player.vel.x, player.vel.z) * 0.8);
      if (dist < 1) speed = 0;
      if (toPlayer < 14) d.lookAt = player.pos;
    } else {
      // Waiting where you left it: grazing, looking up when you come by.
      this.forage(m, m.stay, player.pos, dt);
      goal.copy(d.goal ?? m.pos);
      speed = d.act === 'step' ? 1.1 : 0;
      if (toPlayer < 12 || d.act === 'look') { d.lookAt = player.pos; d.act = d.act === 'graze' ? 'look' : d.act; }
      if (d.act === 'graze') d.graze = 1;
      face = d.face;
    }
    this.move(m, ctx, goal, speed, face);
  }

  /** Grazing: head down a while, a few steps on, a look round. */
  private forage(m: Mob, spot: THREE.Vector3, player: THREE.Vector3, dt: number) {
    const d = m.data as ElkData;
    const r = m.rnd;
    d.idle -= dt;
    if (d.goal && Math.hypot(d.goal.x - m.pos.x, d.goal.z - m.pos.z) < 0.5) { d.goal = null; d.idle = Math.min(d.idle, 0.3); }
    if (d.idle > 0) return;
    const x = r();
    d.face = null;
    if (x < 0.5) {
      d.act = 'graze';
      d.goal = null;
      d.idle = 4 + r() * 8;
    } else if (x < 0.75) {
      d.act = 'step';
      let a = m.heading + (r() - 0.5) * 1.6;
      const ox = m.pos.x - spot.x, oz = m.pos.z - spot.z;
      if (Math.hypot(ox, oz) > 10) a = Math.atan2(-ox, -oz) + (r() - 0.5) * 1;
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

  /** Walk / run toward a goal: the heading carves round, the body follows it (no sidestepping). */
  private move(m: Mob, ctx: MobCtx, goal: THREE.Vector3, speed: number, face: number | null) {
    const d = m.data as ElkData;
    const { dt } = ctx;
    const dx = goal.x - m.pos.x, dz = goal.z - m.pos.z;
    const dist = Math.hypot(dx, dz);
    let want = dist > 0.3 ? speed : 0;
    if (dist < 2.5 && speed < 3) want = Math.min(want, dist * 0.8);
    let target = m.heading;
    if (dist > 0.3 && speed > 0) target = Math.atan2(dx, dz);
    else if (face !== null) target = face;
    else if (d.lookAt && d.act !== 'graze') {
      // Turn toward what it's watching only when it's well off to the side.
      const a = Math.atan2(d.lookAt.x - m.pos.x, d.lookAt.z - m.pos.z);
      const off = Math.atan2(Math.sin(a - m.heading), Math.cos(a - m.heading));
      if (Math.abs(off) > 1.4) target = a - Math.sign(off) * 1.0;
    }
    let dh = target - m.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    // Big animals can't spin on the spot: slow down into sharp turns.
    want *= 0.3 + 0.7 * Math.max(0, Math.cos(dh));
    const accel = want > d.speed ? (d.speed < 4 ? 4 : 7) : 9;
    d.speed += THREE.MathUtils.clamp(want - d.speed, -accel * dt, accel * dt);
    const rate = 3.2 / (1 + d.speed * 0.08);
    m.heading += THREE.MathUtils.clamp(dh, -1, 1) * rate * dt * (d.speed < 0.5 ? 0.7 : 1);
    // A shove (the explorer pushing past) drifts it; otherwise it goes where it faces.
    const sh = Math.sin(m.heading), ch = Math.cos(m.heading);
    const side = m.vel.x * ch - m.vel.z * sh;
    const slip = side * Math.exp(-6 * dt);
    m.vel.set(sh * d.speed + ch * slip, 0, ch * d.speed - sh * slip);
    m.pos.x += m.vel.x * dt;
    m.pos.z += m.vel.z * dt;
    if (ctx.collide && Math.hypot(m.pos.x - ctx.player.pos.x, m.pos.z - ctx.player.pos.z) < 70) {
      ctx.collide(m.pos, m.vel, 0.55);
    }
    m.pos.y = this.floor(ctx, m.pos.x, m.pos.z);
    m.grounded = true;
  }

  /** Lower the antlers and drive forward (ridden: knocking a tree down). */
  butt(m: Mob) {
    const d = m.data as ElkData;
    if (d.butt < 0 || d.butt > 0.5) d.butt = 0;
  }

  animate(m: Mob, ctx: MobCtx) {
    const d = m.data as ElkData;
    const dt = Math.max(ctx.dt, 1e-4);
    d.t += dt;
    const t = d.t;
    const e = (k: number) => 1 - Math.exp(-k * dt);
    const sh = Math.sin(m.heading), ch = Math.cos(m.heading);
    const fwd = m.vel.x * sh + m.vel.z * ch;
    const speed = Math.abs(fwd);
    let dh = m.heading - d.prevHeading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    d.prevHeading = m.heading;
    d.turn += (dh / dt - d.turn) * e(6);
    const wetNow = ctx.gen.height(m.pos.x, m.pos.z) < ctx.surface(m.pos.x, m.pos.z) - 1.25 ? 1 : 0;
    d.wet += (wetNow - d.wet) * e(4);
    const airborne = !m.grounded && m.ridden;
    d.air += ((airborne ? 1 : 0) - d.air) * e(airborne ? 12 : 8);

    // Gait: 0 walk, 1 trot, 2 gallop.
    const gaitT = speed < 3.2 ? 0 : speed < 7 ? 1 : 2;
    const g = d.gait.step(gaitT + (speed > 7 ? THREE.MathUtils.clamp((speed - 7) / 12, 0, 1) * 0.0 : 0), 30, 11, dt);
    const wTrot = THREE.MathUtils.clamp(1 - Math.abs(g - 1), 0, 1);
    const wGal = THREE.MathUtils.clamp(g - 1, 0, 1);
    const wWalk = THREE.MathUtils.clamp(1 - g, 0, 1);
    const freq = speed < 3.2 ? 0.45 + speed * 0.3 : speed < 7 ? 1.41 + (speed - 3.2) * 0.07 : Math.min(2.7, 1.68 + (speed - 7) * 0.04);
    const moving = THREE.MathUtils.clamp(speed / 1.0, 0, 1);
    d.stride += dt * freq * moving;
    const duty = wWalk * 0.64 + wTrot * 0.46 + wGal * 0.36;
    const sweep = (wWalk * 0.34 + wTrot * 0.44 + wGal * 0.72) * moving;
    const flex = (wWalk * 0.75 + wTrot * 1.1 + wGal * 1.45) * moving;
    const cyc = frac(d.stride);

    // Body: the walk nods, the trot bounces twice a stride, the gallop rocks.
    const bounceY = moving * (wWalk * Math.abs(Math.sin(cyc * Math.PI * 2)) * 0.035 + wTrot * Math.abs(Math.sin(cyc * Math.PI * 2)) * 0.08 + wGal * (Math.sin(cyc * Math.PI * 2 - 0.4) * 0.5 + 0.5) * 0.16);
    const rock = wGal * moving * Math.sin(cyc * Math.PI * 2 + 0.9) * 0.1;
    // Uphill / downhill.
    const gAhead = this.floor(ctx, m.pos.x + sh * 1.1, m.pos.z + ch * 1.1);
    const gBack = this.floor(ctx, m.pos.x - sh * 1.1, m.pos.z - ch * 1.1);
    const slope = d.air > 0.5 ? 0 : Math.atan2(gAhead - gBack, 2.2) * (1 - d.wet);
    // Rearing: when it's just been tamed, and plunging on the rope.
    const caught = m.state === 'caught';
    const rearT = (m.happy > 0.3 ? 0.62 * Math.sin(Math.min(1, (1.6 - m.happy) / 1.3) * Math.PI) : 0) + (caught ? Math.max(0, Math.sin(m.stateT * 4.5)) * 0.4 : 0);
    const rear = d.rear.step(rearT, 70, 12, dt);
    // Butting: antlers down (0-0.22 s), a drive forward (0.22-0.4), back up.
    let buttK = 0;
    if (d.butt >= 0) {
      d.butt += dt;
      const b = d.butt;
      buttK = b < 0.22 ? b / 0.22 : b < 0.4 ? 1 : Math.max(0, 1 - (b - 0.4) / 0.4);
      if (b > 0.8) d.butt = -1;
    }
    const lunge = d.butt >= 0 ? Math.max(0, Math.sin(THREE.MathUtils.clamp((d.butt - 0.18) / 0.3, 0, 1) * Math.PI)) : 0;
    const accel = 0;
    const pitch = d.pitch.step(-slope - rear + rock + buttK * 0.08 + d.graze * 0.07 + accel, 60, 12, dt) + (airborne ? THREE.MathUtils.clamp(-m.vel.y * 0.035, -0.3, 0.3) : 0);
    const bank = d.bank.step(THREE.MathUtils.clamp(-d.turn * speed * 0.018, -0.22, 0.22), 40, 10, dt);
    d.root.position.copy(m.pos);
    d.root.rotation.set(0, m.heading, 0);
    // Rear pivots about the hind feet: lift the body so the hips stay put.
    hip.set(0, HIND.y, HIND.z);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const hy = hip.y * cp - hip.z * sp, hz = hip.y * sp + hip.z * cp;
    const rearLift = rear > 0 ? (hip.y - hy) : 0;
    const rearShift = rear > 0 ? (hip.z - hz) : 0;
    d.body.position.set(0, BODY_Y + bounceY + rearLift + d.air * 0.05 - d.graze * 0.05 + lunge * 0.05, rearShift + lunge * 0.25);
    d.body.rotation.set(pitch, 0, bank);

    // Legs.
    const off = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) off[k] = wWalk * WALK[k] + wTrot * TROT[k] + wGal * GALLOP[k];
    for (let k = 0; k < 4; k++) {
      const L = LEGS[k];
      const ph = frac(d.stride + off[k]);
      let up = 0, lo = 0;
      if (ph < duty) {
        // Planted: the leg sweeps back under the body.
        const u = ph / duty;
        up = lerp(-sweep, sweep, u);
      } else {
        const u = (ph - duty) / (1 - duty);
        const s = u * u * (3 - 2 * u);
        up = lerp(sweep, -sweep * 1.1, s);
        lo = Math.sin(u * Math.PI) * flex;
      }
      // Standing still on a slope, or grazing: front legs a touch splayed.
      if (!L.hind) up -= d.graze * 0.12;
      // Counter the body's pitch so the legs stay under it.
      up -= pitch * 0.85;
      if (L.hind) {
        // The hind leg folds the other way at the hock.
        d.upper[k].rotation.set(H_REST + up * 0.9 + lo * 0.25, 0, 0);
        d.lower[k].rotation.set(-H_REST - lo * 0.9 - up * 0.2, 0, 0);
      } else {
        d.upper[k].rotation.set(up - lo * 0.3, 0, 0);
        d.lower[k].rotation.set(lo * 1.1, 0, 0);
      }
      // Airborne (a leap): forelegs folded up, hind legs trailing.
      if (d.air > 0.01) {
        const a = d.air;
        if (L.hind) {
          d.upper[k].rotation.x = lerp(d.upper[k].rotation.x, 0.9, a);
          d.lower[k].rotation.x = lerp(d.lower[k].rotation.x, -0.2, a);
        } else {
          d.upper[k].rotation.x = lerp(d.upper[k].rotation.x, -1.0, a);
          d.lower[k].rotation.x = lerp(d.lower[k].rotation.x, 1.9, a);
        }
      }
      // Rearing: forelegs paw the air.
      if (rear > 0.05 && !L.hind) {
        const paw = Math.sin(t * 7 + k * 1.7);
        d.upper[k].rotation.x = lerp(d.upper[k].rotation.x, -0.5 + paw * 0.4, Math.min(1, rear * 2));
        d.lower[k].rotation.x = lerp(d.lower[k].rotation.x, 1.4 + paw * 0.4, Math.min(1, rear * 2));
      }
      // Swimming: all four paddle, slow and deep.
      if (d.wet > 0.01) {
        const pp = Math.sin(t * 3.4 + off[k] * Math.PI * 2);
        d.upper[k].rotation.x = lerp(d.upper[k].rotation.x, (L.hind ? H_REST : 0) + pp * 0.5, d.wet);
        d.lower[k].rotation.x = lerp(d.lower[k].rotation.x, (L.hind ? -H_REST - 0.4 : 0.6) + pp * 0.4, d.wet);
      }
      d.upper[k].rotation.z = -L.s * bank * 0.3;
    }

    // Neck and head: grazing low, raised proud when alert, stretched out at a
    // gallop with the antlers laid back; the walk nods it.
    const alert = d.lookAt ? 1 : 0;
    const run = wGal * THREE.MathUtils.clamp((speed - 7) / 10, 0, 1);
    const tiltT = d.graze > 0 ? TILT_GRAZE : lerp(lerp(TILT_UP + 0.15 * (1 - alert), TILT_RUN, run), 0.2, Math.min(1, rear * 1.5)) + d.wet * 0.25 + buttK * 0.95;
    const tilt = d.tilt.step(tiltT - pitch, 26, 9, dt);
    // Head pitch in the world: nose down to the grass, level-ish otherwise.
    const worldHead = d.graze > 0 ? 1.35 : lerp(0.12, 0.5, run) - alert * 0.06 + buttK * 0.75;
    const hx = d.headX.step(worldHead - tiltT, 26, 9, dt);
    const nod = moving * (wWalk * Math.sin(cyc * Math.PI * 4) * 0.06 + wTrot * Math.sin(cyc * Math.PI * 4) * 0.03 + wGal * Math.sin(cyc * Math.PI * 2 + 2.2) * 0.12);
    // Chewing while grazing: little bobs of the head.
    d.chew += dt * (d.graze > 0 ? 7 : 0);
    const chew = d.graze > 0 ? Math.sin(d.chew) * 0.035 : 0;
    // Looking about.
    let yawT = 0;
    if (d.lookAt) {
      tv.subVectors(d.lookAt, m.pos);
      const lz = tv.x * sh + tv.z * ch;
      const lx = tv.x * ch - tv.z * sh;
      yawT = THREE.MathUtils.clamp(Math.atan2(lx, lz), -1.2, 1.2);
    } else if (d.act === 'look' && m.state === 'wild') yawT = Math.sin(t * 0.37 + m.heading) * 0.6;
    d.headYaw += (yawT * (1 - run) - d.headYaw) * e(3);
    d.neck.rotation.set(tilt + nod, d.headYaw * 0.6 - bank * 0.3, 0);
    d.head.rotation.set(hx - nod * 0.5 + chew, d.headYaw * 0.4, 0);

    // Ears: flick now and then, swivel toward you, pinned back running.
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      d.earT[k] -= dt;
      if (d.earT[k] < 0) { d.earT[k] = 1.5 + m.rnd() * 5; d.earFlick[k] = 1; }
      d.earFlick[k] = Math.max(0, d.earFlick[k] - dt * 5);
      const flick = Math.sin(d.earFlick[k] * Math.PI * 3) * d.earFlick[k] * 0.5;
      const back = Math.max(run, buttK, d.wet * 0.5);
      d.ears[k].rotation.set(-0.35 - back * 0.9 + flick * 0.5, s * (0.3 - back * 0.3 + d.headYaw * 0.3), -s * (1.05 - back * 0.35) + flick * s);
    }

    // Eyes.
    if (t > d.blinkAt + 0.13) d.blinkAt = t + 2 + m.rnd() * 5;
    const lids = m.happy > 0 ? -1 : t > d.blinkAt ? 0.05 : d.graze > 0 ? 0.6 : 0.9;
    let lx = 0, ly = 0;
    if (d.lookAt) {
      lx = THREE.MathUtils.clamp((yawT - d.headYaw) * 1.6, -1, 1);
      ly = 0.2;
    }
    d.look.x += (lx - d.look.x) * e(10);
    d.look.y += (ly - d.look.y) * e(10);
    d.eye.set(d.look.x, d.look.y, lids, 0);
    d.saddle.visible = m.state === 'tamed';
    d.root.updateMatrixWorld(true);
    // Hooves never sink into the ground: on a slope (or a crest at a gallop)
    // the body rides up by however far the lowest hoof would go under.
    if (d.wet < 0.5) {
      let pen = 0;
      for (let k = 0; k < 4; k++) {
        const L = LEGS[k].hind ? H_LO : F_LO;
        tv.set(0, -L, 0).applyMatrix4(d.lower[k].matrixWorld);
        pen = Math.max(pen, this.floor(ctx, tv.x, tv.z) - tv.y);
      }
      // Eased out, so a pothole under one foot doesn't make it hop.
      d.lift = Math.max(pen, d.lift * Math.exp(-6 * dt));
      if (d.lift > 1e-3) {
        d.body.position.y += Math.min(d.lift, 0.6);
        d.root.updateMatrixWorld(true);
      }
    }
  }

  emit(m: Mob, _dist: number) {
    const d = m.data as ElkData;
    this.bodyB.push(d.body.matrixWorld, m.tint);
    this.neckB.push(d.neck.matrixWorld, m.tint);
    this.headB.push(d.head.matrixWorld, m.tint, d.eye);
    for (const e of d.ears) this.earB.push(e.matrixWorld, m.tint);
    for (let k = 0; k < 4; k++) {
      const b = LEGS[k].hind ? 2 : 0;
      this.legB[b].push(d.upper[k].matrixWorld, m.tint);
      this.legB[b + 1].push(d.lower[k].matrixWorld, m.tint);
    }
    if (d.saddle.visible) {
      this.saddleB.push(d.saddle.matrixWorld, WHITE);
      this.bridleB.push(d.head.matrixWorld, WHITE);
    }
    if (m.state === 'caught' || m.leashed) this.collarB.push(d.collar.matrixWorld, WHITE);
  }

  attach(m: Mob, toward: THREE.Vector3, out: THREE.Vector3) {
    const d = m.data as ElkData;
    d.collar.getWorldPosition(out);
    tv.subVectors(toward, out).setY(0);
    if (tv.lengthSq() < 1e-4) tv.set(0, 0, 1);
    return out.addScaledVector(tv.normalize(), 0.3);
  }

  seat(m: Mob) {
    const d = m.data as ElkData;
    d.seat.getWorldPosition(seatPos);
    d.seat.getWorldQuaternion(seatQuat);
    return { pos: seatPos, quat: seatQuat, spread: 0.78 };
  }

  reset(m: Mob) {
    const d = m.data as ElkData;
    d.goal = null;
    d.act = 'look';
    d.idle = 1 + m.rnd() * 2;
    d.speed = Math.hypot(m.vel.x, m.vel.z);
    m.stay.copy(m.pos);
  }
}
