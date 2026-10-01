import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Simplex } from '../core/noise';
import { mulberry32 } from '../core/rng';
import { buildConifer, TREE_HEIGHT } from '../gfx/geometry';
import { makeGiantMaterial } from '../gfx/materials';
import { Spring } from '../mobs/parts';

// The giant: landscape that walks. About 80 m of pebble boulders in the cold
// spirit's ash blue, a turfed hump with whole conifers on it, snow on its
// head, and the towers' tall sleepy eyes. It is drawn in the terrain's look,
// not the creatures' (see GIANT_FRAG), and fogged as one flat card (uGiant in
// gfx/post.ts), which is what sells its size.
//
// A skeleton of Object3Ds is posed in code each frame (a procedural gait
// with the feet planted on the ground, two-bone IK for legs and arms) and
// the boulders are instanced onto it. Local +z is its front; a heading of h
// faces (sin h, cos h), like everything else that walks here.

/** Thigh and shin, upper arm and forearm (m). */
const L1 = 20, L2 = 19, A1 = 20, A2 = 19;
const LEG = L1 + L2;
/** Ankle joint above the sole. */
const ANKLE = 5.8;
/** Hip joints either side of the pelvis; how far apart it plants its feet. */
const HIP_W = 12.5, TRACK = 14.5;
/** How far it leans over its own belly (rad). */
const LEAN = 0.34;
/** Shoulder joints, in the torso's frame. */
const SHOULDER = new THREE.Vector3(27, 22, 1);
/** Share of each foot's cycle spent in the air, and how far ahead of the body a foot lands (in strides). */
const SWING = 0.45, LEAD = 0.55;

export const GIANT_HEIGHT = 82;
/** How far a dormant giant settles into the ground (m). */
const SINK = 43;
/** How far down it starts when it comes up out of the ground or the water (`emerge`): all of it (m). */
const DEEP = 100;
/** Asleep and solid: the rise a body steps up without being stopped, and how tall a body is (m). */
const STEP = 0.6, TALL = 1.7;
/** The pebble shapes' seeds; their lumps (see `pebbleRadius`) never reach past LUMP_MAX. */
const PEBBLE_SEEDS = [11, 23, 37];
const LUMP_MAX = 1.14;

interface Stone {
  inv: THREE.Matrix4;
  lumps: Simplex;
  /** Its middle and how far it reaches along x and z, to skip it quickly. */
  x: number; z: number; rx: number; rz: number;
}
const span = [0, 0];

interface PartDef {
  bone: THREE.Object3D;
  pos: [number, number, number];
  r: [number, number, number];
  rot?: [number, number, number];
  /** Cap lines, -1..1 up the boulder as it rests (see GIANT_VERT). */
  turf?: number;
  snow?: number;
  face?: boolean;
}

/** How far out a pebble's surface is along a unit direction: a sphere with slow lumps. */
function pebbleRadius(n: Simplex, x: number, y: number, z: number) {
  return 1 + 0.1 * n.noise(x * 1.1 + y * 0.5, z * 1.1 - y * 0.4) + 0.035 * n.noise(x * 2.6 + 3, z * 2.6 + y * 1.3);
}
const PEBBLE_NOISE = PEBBLE_SEEDS.map((s) => new Simplex(s));

/** A smooth river pebble: no flat base (limbs are strings of these). */
function buildPebble(seed: number, detail: number): THREE.BufferGeometry {
  const n = new Simplex(seed);
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(pebbleRadius(n, v.x, v.y, v.z));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  // Mostly the sphere's normals: the lumps show in the silhouette, and the
  // toon bands fall as clean curves instead of contouring every bump.
  const nr = g.getAttribute('normal') as THREE.BufferAttribute;
  const nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    nn.fromBufferAttribute(nr, i).lerp(v.fromBufferAttribute(p, i).normalize(), 0.7).normalize();
    nr.setXYZ(i, nn.x, nn.y, nn.z);
  }
  g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(p.count).fill(2), 1));
  return g;
}

const Y = new THREE.Vector3(0, 1, 0);
const m4 = new THREE.Matrix4();
const q1 = new THREE.Quaternion();
const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), vd = new THREE.Vector3();
const bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3();

/** Point a limb bone (local -y runs down the limb) from `a` to `b`, its front (+z) toward `pole`. */
function aim(bone: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, pole: THREE.Vector3) {
  by.subVectors(a, b).normalize();
  bz.copy(pole).addScaledVector(by, -pole.dot(by)).normalize();
  bx.crossVectors(by, bz);
  bone.position.copy(a);
  bone.quaternion.setFromRotationMatrix(m4.makeBasis(bx, by, bz));
}

/** Two-bone IK: where the middle joint goes, bending toward `pole`. Clamps `t` to what the limb can reach. */
function bend(a: THREE.Vector3, t: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3, mid: THREE.Vector3) {
  const d = va.subVectors(t, a);
  const len = THREE.MathUtils.clamp(d.length(), Math.abs(l1 - l2) + 0.1, (l1 + l2) * 0.999);
  d.normalize();
  const ca = (l1 * l1 + len * len - l2 * l2) / (2 * l1 * len);
  const perp = vb.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
  mid.copy(a).addScaledVector(d, l1 * ca).addScaledVector(perp, l1 * Math.sqrt(Math.max(0, 1 - ca * ca)));
  t.copy(a).addScaledVector(d, len);
}

interface Foot {
  /** The ankle joint, and where the sole meets the ground. */
  ankle: THREE.Vector3;
  pitch: number;
  yaw: number;
  /** The print it stands on (or last left). */
  n: number;
  air: boolean;
}

export interface GiantHost {
  ground: (x: number, z: number) => number;
  /** A foot comes down: the ground under its ankle, which foot, and the way it points. */
  onStep?: (at: THREE.Vector3, foot: number, yaw: number) => void;
  /** It breathes out: the mouth, and the way it faces. */
  onBreath?: (at: THREE.Vector3, dir: THREE.Vector3) => void;
}

export class Giant {
  readonly group = new THREE.Group();
  /** The middle of its chest: what the fog card and the camera take as "the giant". */
  readonly centre = new THREE.Vector3();
  /** Where it stands (or set out from), and the way it faces there. */
  readonly origin = new THREE.Vector3();
  heading = 0;
  /** Metres between one print and the next, seconds per step, and how the path bends (1 / radius). */
  stride = 42;
  stepTime = 2.3;
  curve = 0;
  walking = false;
  /** 0 = arms hanging and swinging, 1 = wrapped round itself. */
  hug = 0;
  private hugNow = 0;
  /**
   * Dormant: it gives up, wraps its arms round itself, shuts its eyes and
   * settles down into the ground until only its hump, shoulders and the top
   * of its head show: a hill with trees on it. (`settle()` is the same at once.)
   */
  dormant = false;
  private sink = 0;
  /** Stand still when it has taken this many steps (null: keep walking). `resume()` sets it off again. */
  pauseAt: number | null = null;
  /**
   * Footfalls to walk, in order, instead of its own straight line: where each
   * ankle comes down and the way that foot points. The first must be on its
   * left (odd prints are left feet). It stops on the last two.
   */
  private route: { x: number; z: number; yaw: number }[] | null = null;
  /** Steps taken (fractional). */
  private phi = 0;
  private walkT = 0;
  private time = 0;
  private readonly mat = makeGiantMaterial();
  private batches: { mesh: THREE.InstancedMesh; parts: PartDef[]; local: THREE.Matrix4[] }[] = [];
  private pelvis = new THREE.Object3D();
  private torso = new THREE.Object3D();
  private head = new THREE.Object3D();
  private thigh = [new THREE.Object3D(), new THREE.Object3D()];
  private shin = [new THREE.Object3D(), new THREE.Object3D()];
  private foot = [new THREE.Object3D(), new THREE.Object3D()];
  private upper = [new THREE.Object3D(), new THREE.Object3D()];
  private fore = [new THREE.Object3D(), new THREE.Object3D()];
  private hand = [new THREE.Object3D(), new THREE.Object3D()];
  private feet: Foot[] = [0, 1].map((i) => ({ ankle: new THREE.Vector3(), pitch: 0, yaw: 0, n: -i, air: false }));
  private hipY = new Spring();
  private trees: { mesh: THREE.Mesh; rest: THREE.Quaternion; sx: Spring; sz: Spring }[] = [];
  private lastTop = new THREE.Vector3();
  private topVel = new THREE.Vector3();
  private blinkT = 4;
  private breathT = 2;

  constructor(private host: GiantHost) {
    const { pelvis, torso, head } = this;
    this.group.add(pelvis, ...this.thigh, ...this.shin, ...this.foot, ...this.upper, ...this.fore, ...this.hand);
    pelvis.add(torso);
    torso.add(head);
    torso.position.set(0, 5, 0);
    torso.rotation.x = LEAN;
    head.position.set(0, 26, 13.5);
    head.rotation.x = -LEAN * 0.7;
    pelvis.updateMatrixWorld(true);

    const P: PartDef[] = [
      { bone: pelvis, pos: [0, 1, -1], r: [20, 10.5, 14] },
      { bone: torso, pos: [0, 8, 3], r: [21, 14, 16], rot: [0, 0.4, 0] },
      { bone: torso, pos: [0, 20, 1], r: [24, 14, 16.5], rot: [0, 2.1, 0], turf: 0.5 },
      // The hump: the top of the hill it passes for.
      { bone: torso, pos: [0, 30, -8], r: [24, 13.5, 18], rot: [0, 0.2, 0], turf: -0.1, snow: 0.78 },
      { bone: torso, pos: [-13, 21, -15], r: [10, 9, 9], rot: [0.3, 0.5, 0], turf: 0.15 },
      { bone: torso, pos: [14, 14, -14], r: [9, 8, 8], rot: [0, 2.2, 0.4], turf: 0.3 },
      { bone: head, pos: [0, 4, 0], r: [9, 9.4, 8.8], turf: 9, snow: 0.4, face: true },
    ];
    for (const s of [1, -1]) {
      const i = s > 0 ? 0 : 1;
      P.push({ bone: torso, pos: [s * 25, 24, 0], r: [12, 10.5, 11.5], rot: [0, s * 0.8, 0], turf: 0.3, snow: 0.88 });
      P.push({ bone: this.upper[i], pos: [0, -5.5, 0], r: [7.2, 8.4, 7.2], rot: [0, s, 0.1] });
      P.push({ bone: this.upper[i], pos: [0, -14.5, 0], r: [6.4, 7.4, 6.4], rot: [0.1, s * 2, 0] });
      P.push({ bone: this.fore[i], pos: [0, -0.5, 0], r: [6, 6, 6], rot: [s, 0, 0] });
      P.push({ bone: this.fore[i], pos: [0, -7, 0], r: [6.5, 7.4, 6.5], rot: [0, s * 1.4, 0] });
      P.push({ bone: this.fore[i], pos: [0, -14, 0], r: [7.4, 7, 7.4], rot: [0, s * 0.3, 0.2] });
      P.push({ bone: this.hand[i], pos: [0, -5, 0], r: [7.4, 6.8, 5.8], rot: [0, s * 0.6, 0] });
      for (const fx of [-4.3, 0, 4.3]) P.push({ bone: this.hand[i], pos: [fx, -11.5, 1.4], r: [2.5, 4, 2.6], rot: [0.25, fx, 0] });
      P.push({ bone: this.hand[i], pos: [-s * 7, -6, 3], r: [2.5, 3.5, 2.5], rot: [0.3, 0, -s * 0.5] });
      P.push({ bone: this.thigh[i], pos: [0, -5.5, 0], r: [10.5, 10, 10.5], rot: [0, s * 0.7, 0] });
      P.push({ bone: this.thigh[i], pos: [0, -15, 0], r: [8.8, 8.5, 9], rot: [0, s * 2.4, 0.1] });
      P.push({ bone: this.shin[i], pos: [0, -0.5, 0.6], r: [7, 6.4, 7], rot: [s * 0.5, 0, 0] });
      P.push({ bone: this.shin[i], pos: [0, -8.5, -0.6], r: [9.6, 8.6, 9.8], rot: [0, s * 1.1, 0] });
      P.push({ bone: this.shin[i], pos: [0, -16.5, 0], r: [9.8, 7.4, 9.8], rot: [0, s * 2.9, 0] });
      // The sole: a slab about 22 x 14 m, the size of the prints it leaves,
      // its front edge three blunt blocks (stone, not toes).
      P.push({ bone: this.foot[i], pos: [0, -2, 3.4], r: [7, 4, 10.4] });
      for (const tx of [-4.2, 0, 4.2]) P.push({ bone: this.foot[i], pos: [tx, -3.1, 10.6], r: [3.3, 2.9, 4], rot: [0, tx, 0] });
    }

    // Three pebble shapes shared out among the parts.
    const geos = PEBBLE_SEEDS.map((s) => buildPebble(s, 10));
    const up = new THREE.Vector3();
    const e = new THREE.Euler();
    geos.forEach((geo, gi) => {
      const parts = P.filter((_, i) => i % geos.length === gi);
      const aPart = new Float32Array(parts.length * 4);
      const aUp = new Float32Array(parts.length * 3);
      const local = parts.map((p, i) => {
        const q = new THREE.Quaternion().setFromEuler(e.set(...(p.rot ?? [0, 0, 0])));
        // World up at rest, in the boulder's unit space: S * R^T * boneRest^T * Y.
        p.bone.getWorldQuaternion(q1);
        up.copy(Y).applyQuaternion(q1.multiply(q).invert()).multiply(va.set(...p.r));
        aUp.set([up.x, up.y, up.z], i * 3);
        aPart.set([(gi * 31 + i * 7.13) % 9, p.face ? 1 : 0, p.turf ?? 9, p.snow ?? 9], i * 4);
        return new THREE.Matrix4().compose(new THREE.Vector3(...p.pos), q, new THREE.Vector3(...p.r));
      });
      geo.setAttribute('aPart', new THREE.InstancedBufferAttribute(aPart, 4));
      geo.setAttribute('aUp', new THREE.InstancedBufferAttribute(aUp, 3));
      const mesh = new THREE.InstancedMesh(geo, this.mat, parts.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.batches.push({ mesh, parts, local });
    });

    // Whole conifers on the hump and shoulders, growing straight up as it
    // rests (so they tip with it when it leans).
    const rnd = mulberry32(4071);
    const upright = torso.getWorldQuaternion(new THREE.Quaternion()).invert();
    const treeGeos = [buildConifer(301, 1), buildConifer(302, 1)];
    const spots: [number, number, number, number][] = [
      [-3, 43, -9, 1.5], [9, 41, -5, 1.1], [-12, 40, -4, 1.2], [3, 40, -19, 1.0], [14, 37.5, -16, 0.85], [18, 38, -6, 0.8],
      [-16, 37, -15, 0.9], [-25, 34, -1, 1.0], [-31, 31.5, 2, 0.7], [26, 34, -2, 0.9],
    ];
    spots.forEach(([x, y, z, s], i) => {
      const mesh = new THREE.Mesh(treeGeos[i % 2], this.mat);
      mesh.position.set(x, y - 1.2 * s, z);
      mesh.scale.setScalar(s);
      const rest = upright.clone().multiply(q1.setFromEuler(e.set((rnd() - 0.5) * 0.16, rnd() * 6.3, (rnd() - 0.5) * 0.16)));
      mesh.quaternion.copy(rest);
      torso.add(mesh);
      this.trees.push({ mesh, rest, sx: new Spring(), sz: new Spring() });
    });
    this.place(0, 0, 0);
  }

  /** Stand it at (x, z), facing `heading`, feet together. */
  place(x: number, z: number, heading: number) {
    this.origin.set(x, 0, z);
    this.heading = heading;
    this.phi = 0;
    this.walkT = 0;
    this.walking = false;
    this.hugNow = this.hug;
    this.hipY.x = this.host.ground(x, z) + ANKLE + LEG * 0.87;
    this.hipY.v = 0;
    this.feet.forEach((f, i) => { f.n = -i; f.air = false; });
    this.pose(0);
    this.lastTop.copy(this.centre);
    this.topVel.set(0, 0, 0);
  }

  /** Walk these footfalls from where it stands (see `route`). */
  walkRoute(route: { x: number; z: number; yaw: number }[]) {
    this.route = route;
    this.phi = 0;
    this.walkT = 0;
    this.walking = true;
  }

  /** Steps taken so far (fractional), and whether a route has been walked to its end. */
  get steps() { return this.phi; }
  /** The way its body faces now (on a route, not the way it set out). */
  get facing() { return this.pelvis.rotation.y; }
  get arrived() { return !!this.route && this.phi >= this.route.length + 1; }

  /** It starts right under (the lake, or the ground) and comes up slowly, over `secs`, walking as it does. */
  emerge(secs: number) { this.under = 1; this.riseTime = secs; this.rising = true; this.pose(0); }
  /** Right under, and staying there until it's told to `emerge`. */
  submerge() { this.under = 1; this.rising = false; this.pose(0); }
  private under = 0;
  private rising = false;
  private riseTime = 1;

  settle() { this.dormant = true; this.sink = 1; this.hug = 1; this.hugNow = 1; this.pose(0); }

  /** Carry on after a pause. */
  resume() { this.pauseAt = null; this.walkT = 0; this.walking = true; }
  get paused() { return this.pauseAt !== null && !this.walking; }

  /** On a route, a print past the end is that foot's last one. */
  private last(n: number) {
    const len = this.route!.length;
    return n > len ? n - 2 * Math.ceil((n - len) / 2) : n;
  }

  /** On a route: the body after `phi` steps, half way between its last two footfalls. Returns its heading. */
  private routeBody(phi: number, out: THREE.Vector3) {
    const len = this.route!.length;
    const f = THREE.MathUtils.clamp(phi, 0, len);
    const k = Math.min(Math.floor(f), len - 1), u = f - k;
    const mid = (n: number, o: THREE.Vector3) => {
      if (n <= 0) { o.copy(this.origin); return this.heading; }
      const a = this.route![n - 1];
      // The first step: between it and where the right foot still stands.
      if (n === 1) { o.set((a.x + this.origin.x + Math.cos(this.heading) * TRACK) / 2, 0, (a.z + this.origin.z - Math.sin(this.heading) * TRACK) / 2); return a.yaw; }
      const b = this.route![n - 2];
      o.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
      return a.yaw;
    };
    const h0 = mid(k, va), h1 = mid(k + 1, vb);
    const e = u * u * (3 - 2 * u);
    out.lerpVectors(va, vb, k === 0 ? e : u);
    let dh = h1 - h0;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    return h0 + dh * u;
  }

  /** Treetop `i` on its shoulders and hump (where its birds roost), and the top of its head, in world space. */
  perch(i: number, out: THREE.Vector3) {
    const n = this.trees.length;
    if (i >= n) {
      // More birds than trees: the rest sit along the top of its hump.
      const k = i - n;
      return this.torso.localToWorld(out.set((k % 2 ? 1 : -1) * (5 + 4 * Math.floor(k / 2)), 43.2, -8 + (k % 3) * 2)).setY(out.y + 1.4);
    }
    // The very tip of the tree, wherever it leans, and a crow's legs above that.
    this.trees[i].mesh.localToWorld(out.set(0, TREE_HEIGHT - 0.5, 0));
    out.y += 1.5;
    return out;
  }

  // ------------------------------------------------------------ solid, once it's asleep

  /**
   * Its boulders as they're drawn: ellipsoids (inverse matrices) with the
   * pebbles' own lumps, kept while it lies still.
   */
  private solid: Stone[] | null = null;
  private shell() {
    if (!this.dormant || this.sink < 1) { this.solid = null; return null; }
    if (!this.solid) {
      this.solid = [];
      const fwd = new THREE.Matrix4();
      this.batches.forEach((b, gi) => b.parts.forEach((p, i) => {
        const f = fwd.multiplyMatrices(p.bone.matrixWorld, b.local[i]).elements;
        this.solid!.push({
          inv: fwd.clone().invert(), lumps: PEBBLE_NOISE[gi], x: f[12], z: f[14],
          rx: Math.hypot(f[0], f[4], f[8]) * LUMP_MAX, rz: Math.hypot(f[2], f[6], f[10]) * LUMP_MAX,
        });
      }));
    }
    return this.solid;
  }

  /** Where the vertical line through (x, z) goes into a boulder and comes out (into `span`); false if it misses. */
  private cut(st: Stone, x: number, z: number): boolean {
    if (Math.abs(x - st.x) > st.rx || Math.abs(z - st.z) > st.rz) return false;
    const e = st.inv.elements;
    // The line in the boulder's unit space: p + t d.
    const px = e[0] * x + e[8] * z + e[12], py = e[1] * x + e[9] * z + e[13], pz = e[2] * x + e[10] * z + e[14];
    const dx = e[4], dy = e[5], dz = e[6];
    const a = dx * dx + dy * dy + dz * dz, b = 2 * (px * dx + py * dy + pz * dz), pp = px * px + py * py + pz * pz;
    // Each end against the pebble's radius there (its lumps), found in two goes.
    for (let end = 0; end < 2; end++) {
      let rad = 1, y = 0;
      for (let n = 0; n < 3; n++) {
        const disc = b * b - 4 * a * (pp - rad * rad);
        if (disc < 0) { if (n === 0) { rad = LUMP_MAX; continue; } return false; }
        y = (-b + (end ? 1 : -1) * Math.sqrt(disc)) / (2 * a);
        const vx = px + dx * y, vy = py + dy * y, vz = pz + dz * y, l = Math.hypot(vx, vy, vz) || 1;
        rad = pebbleRadius(st.lumps, vx / l, vy / l, vz / l);
      }
      span[end] = y;
    }
    return span[1] > span[0];
  }

  /** Asleep, it's a hill you can land on and walk over: the top of its stone under (x, z), at most `step` above the feet. */
  surface(x: number, z: number, feetY: number, step: number): number {
    const sh = this.shell();
    if (!sh || Math.hypot(x - this.centre.x, z - this.centre.z) > 80) return -Infinity;
    let best = -Infinity;
    for (const st of sh) if (this.cut(st, x, z) && span[1] <= feetY + step && span[1] > best) best = span[1];
    return best;
  }

  /** Stone in the way of a body standing at (x, z): above what it steps up, below its head. */
  private wall(sh: Stone[], x: number, z: number, feetY: number) {
    for (const st of sh) if (this.cut(st, x, z) && span[1] > feetY + STEP && span[0] < feetY + TALL) return true;
    return false;
  }

  /**
   * And you can't walk into it: stone more than a step above a body's feet
   * is a wall, unless there's headroom under it (its sides overhang). Sides
   * steeper than about 45 degrees are walls too: a rise of more than a step
   * within a body's reach.
   */
  push(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    const sh = this.shell();
    if (!sh || Math.hypot(pos.x - this.centre.x, pos.z - this.centre.z) > 80) return;
    const out = (nx: number, nz: number, d: number) => {
      pos.x += nx * d;
      pos.z += nz * d;
      const vn = vel.x * nx + vel.z * nz;
      if (vn < 0) { vel.x -= nx * vn; vel.z -= nz * vn; }
    };
    // Right inside it (something fast, or it settled on top of you): out by the nearest way.
    if (this.wall(sh, pos.x, pos.z, pos.y)) {
      search: for (let d = 0.5; d < 80; d += 0.5) for (let k = 0; k < 16; k++) {
        const nx = Math.sin(k * 0.3927), nz = Math.cos(k * 0.3927);
        if (this.wall(sh, pos.x + nx * d, pos.z + nz * d, pos.y)) continue;
        out(nx, nz, d);
        break search;
      }
    }
    // Walls within reach: back off from each to arm's length.
    const reach = r + 0.25;
    for (let k = 0; k < 12; k++) {
      const nx = Math.sin(k * 0.5236), nz = Math.cos(k * 0.5236);
      if (!this.wall(sh, pos.x + nx * reach, pos.z + nz * reach, pos.y)) continue;
      // How far off it starts.
      let lo = 0, hi = reach;
      for (let n = 0; n < 5; n++) {
        const mid = (lo + hi) / 2;
        if (this.wall(sh, pos.x + nx * mid, pos.z + nz * mid, pos.y)) hi = mid; else lo = mid;
      }
      out(-nx, -nz, reach - lo);
    }
  }

  /** Flying: its sides stop you, and coming down on to it lands on it. */
  land(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    this.push(pos, vel, r);
    const y = this.surface(pos.x, pos.z, pos.y, STEP);
    if (y > pos.y) pos.y = y;
  }
  crown(out: THREE.Vector3) { return this.head.localToWorld(out.set(0, 13, 0)); }

  /** The eyelids: 0 = wide open, 1 = shut. */
  set lids(v: number) { this.mat.uniforms.uLid.value = v; }

  /** Distance along its path after `phi` steps: it eases off from standing. */
  private along(phi: number) {
    return this.stride * (phi < 1.5 ? 0.5 * Math.pow(Math.max(phi, 0) / 1.5, 3) : phi - 1);
  }

  /** The path `s` metres on: a straight line, or an arc if `curve` is set. */
  private path(s: number, side: number, out: THREE.Vector3) {
    const h0 = this.heading, k = this.curve;
    const h = h0 + s * k;
    if (Math.abs(k) < 1e-6) out.set(this.origin.x + Math.sin(h0) * s, 0, this.origin.z + Math.cos(h0) * s);
    else out.set(this.origin.x + (Math.cos(h0) - Math.cos(h)) / k, 0, this.origin.z + (Math.sin(h) - Math.sin(h0)) / k);
    out.x += Math.cos(h) * side;
    out.z -= Math.sin(h) * side;
    return h;
  }

  /** Print `n`: where that foot's sole comes down (y = the ground there). Prints 0 and -1 are where it stood. */
  print(n: number, out: THREE.Vector3) {
    if (this.route && n >= 1) {
      const p = this.route[this.last(n) - 1];
      out.set(p.x, this.host.ground(p.x, p.z), p.z);
      return p.yaw;
    }
    const side = (n % 2 === 0 ? 1 : -1) * TRACK;
    const h = this.path(n >= 1 ? this.stride * (n - 1 + LEAD) : 0, side, out);
    out.y = this.host.ground(out.x, out.z);
    return h;
  }

  update(dt: number) {
    this.time += dt;
    if (this.walking) {
      this.walkT += dt;
      this.phi += (dt / this.stepTime) * THREE.MathUtils.smoothstep(this.walkT, 0, 1.2);
      if (this.route && this.phi >= this.route.length + 1) { this.phi = this.route.length + 1; this.walking = false; }
      // A whole number of steps: both feet are down.
      if (this.pauseAt !== null && this.phi >= this.pauseAt) { this.phi = this.pauseAt; this.walking = false; }
    }

    if (this.under > 0 && this.rising) this.under = Math.max(0, this.under - dt / this.riseTime);
    if (this.dormant) { this.hug = 1; this.sink = Math.min(1, this.sink + dt / 9); }
    this.hugNow += (this.hug - this.hugNow) * (1 - Math.exp(-1.5 * dt));
    this.pose(dt);

    // Slow blinks, the way the spirit does; the lids never open far.
    this.blinkT -= dt;
    if (this.blinkT < -0.9) this.blinkT = 4 + 5 * Math.random(); // presentation only
    const blink = this.blinkT < 0 ? Math.sin((-this.blinkT / 0.9) * Math.PI) : 0;
    this.lids = this.dormant ? Math.min(1, 0.45 + this.sink * 3) : 0.45 + 0.55 * blink;

    this.breathT -= dt;
    if (this.breathT <= 0 && !this.dormant && this.under < 0.5) {
      this.breathT = 5.5;
      this.head.updateWorldMatrix(true, false);
      const at = this.head.localToWorld(va.set(0, 0.5, 9.5));
      this.host.onBreath?.(at, vb.set(Math.sin(this.pelvis.rotation.y), 0, Math.cos(this.pelvis.rotation.y)));
    }
  }

  private pose(dt: number) {
    const { pelvis, torso, head, feet } = this;
    const phi = this.phi;
    const t = this.time;
    const s = this.along(phi);
    const body = vc;
    const h = this.route ? this.routeBody(phi, body) : this.path(s, 0, body);
    const fwd = vd.set(Math.sin(h), 0, Math.cos(h));

    // Feet: each stands on its print, then swings two strides on to the next.
    let sway = 0;
    feet.forEach((f, i) => {
      const c = (phi - i) / 2;
      const k = Math.floor(c);
      const frac = c - k;
      const from = 2 * k + i;
      const a = va, b = vb;
      const side = i === 0 ? 1 : -1;
      if (frac < 1 - SWING || !this.walking && phi === 0) {
        if (f.air && dt > 0 && !(this.route && from > this.route.length)) {
          const yaw = this.print(from, a) + side * 0.14;
          this.host.onStep?.(a, i, yaw);
        }
        f.air = false;
        f.n = from;
        f.yaw = this.print(from, a);
        // The heel peels up just before it leaves the ground.
        f.pitch = 0.32 * THREE.MathUtils.smoothstep(frac, 1 - SWING - 0.13, 1 - SWING);
        f.ankle.set(a.x, a.y + ANKLE - 0.5 + Math.sin(f.pitch) * 11, a.z);
      } else {
        const u = (frac - (1 - SWING)) / SWING;
        const h0 = this.print(from, a), h1 = this.print(from + 2, b);
        const e = u * u * (3 - 2 * u);
        f.air = true;
        f.yaw = h0 + (h1 - h0) * e;
        f.pitch = 0.32 * (1 - u) * (1 - u) + 0.42 * Math.sin(u * Math.PI * 2) * (u < 0.5 ? 1 : 0.55);
        const lift = (5 + a.distanceTo(b) * 0.085) * Math.pow(Math.sin(u * Math.PI), 0.8);
        f.ankle.lerpVectors(a, b, e);
        f.ankle.y = Math.max(f.ankle.y + lift, this.host.ground(f.ankle.x, f.ankle.z) + 2) + ANKLE - 0.5;
        // Its weight goes over the foot that's down.
        sway -= side * Math.sin(u * Math.PI);
      }
    });

    // The pelvis rides as high as the shorter leg allows, knees never quite straight.
    const stepWave = Math.sin(phi * Math.PI);
    const twist = this.walking ? 0.13 * stepWave : 0;
    pelvis.rotation.set(0, h + twist, 0, 'YXZ');
    const px = body.x + Math.cos(h) * sway * 3.4, pz = body.z - Math.sin(h) * sway * 3.4;
    let top = this.host.ground(body.x, body.z) + ANKLE + LEG * 0.87;
    feet.forEach((f, i) => {
      const sd = (i === 0 ? 1 : -1) * HIP_W;
      const hx = px + Math.cos(h + twist) * sd, hz = pz - Math.sin(h + twist) * sd;
      const horiz = Math.hypot(f.ankle.x - hx, f.ankle.z - hz);
      const reach = LEG * 0.975;
      top = Math.min(top, f.ankle.y + Math.sqrt(Math.max(reach * reach - horiz * horiz, 25)));
    });
    if (dt > 0) this.hipY.step(top, 70, 15, dt);
    else this.hipY.x = top;
    const breathe = Math.sin(t * 1.14);
    pelvis.position.set(px, Math.min(this.hipY.x, top + 1.5), pz);
    pelvis.rotation.z = this.walking ? 0.05 * sway : 0;

    torso.rotation.set(LEAN + 0.035 * Math.sin(phi * Math.PI * 2) * (this.walking ? 1 : 0) + 0.012 * breathe, -twist * 1.5, -0.07 * sway);
    torso.scale.setScalar(1 + 0.008 * breathe);
    head.rotation.set(-LEAN * 0.7 - 0.02 * breathe, twist * 0.6, 0.03 * sway);
    pelvis.updateMatrixWorld(true);

    const pole = new THREE.Vector3();
    const knee = new THREE.Vector3(), hip = new THREE.Vector3(), tgt = new THREE.Vector3();
    feet.forEach((f, i) => {
      const side = i === 0 ? 1 : -1;
      pelvis.localToWorld(hip.set(side * HIP_W, 0, 0));
      tgt.copy(f.ankle);
      // Knees forward and a little out.
      pole.set(Math.sin(f.yaw) + Math.cos(h) * side * 0.25, 0.15, Math.cos(f.yaw) - Math.sin(h) * side * 0.25);
      bend(hip, tgt, L1, L2, pole, knee);
      aim(this.thigh[i], hip, knee, pole);
      aim(this.shin[i], knee, tgt, pole);
      const ft = this.foot[i];
      ft.position.copy(tgt);
      ft.rotation.set(f.pitch, f.yaw + side * 0.14, 0, 'YXZ');
    });

    // Arms: hanging and swinging against the legs, or wrapped round itself.
    const sh = new THREE.Vector3(), elbow = new THREE.Vector3(), hang = new THREE.Vector3();
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      const hg = this.hugNow;
      torso.localToWorld(sh.set(side * SHOULDER.x, SHOULDER.y, SHOULDER.z));
      const sw = this.walking ? side * 0.34 * stepWave : 0;
      const reach = (A1 + A2) * 0.95;
      hang.set(side * (SHOULDER.x + 5), 0, 0).applyAxisAngle(Y, h).add(pelvis.position);
      hang.y = sh.y - reach * Math.cos(sw);
      hang.addScaledVector(fwd, 5 + reach * Math.sin(sw));
      // Hands on the opposite arm, one above the other.
      torso.localToWorld(tgt.set(-side * 12, 14.5 + side * 3.4, 24.5 + side * 1.2));
      tgt.lerpVectors(hang, tgt, hg);
      pole.set(side * 0.5, -0.4 - 0.5 * hg, -1 + 2.3 * hg).applyAxisAngle(Y, h);
      bend(sh, tgt, A1, A2, pole, elbow);
      aim(this.upper[i], sh, elbow, pole);
      // The back of the hand faces out; hugging, the palm lies on its side.
      pole.set(side, 0.2, 0.4 + hg).applyAxisAngle(Y, h);
      aim(this.fore[i], elbow, tgt, pole);
      this.hand[i].position.copy(tgt);
      this.hand[i].quaternion.copy(this.fore[i].quaternion);
    }

    // The trees lag behind whatever its shoulders do.
    torso.localToWorld(this.centre.set(0, 14, 2));
    const topNow = torso.localToWorld(va.set(0, 34, -5));
    if (dt > 0) this.topVel.subVectors(topNow, this.lastTop).divideScalar(dt);
    this.lastTop.copy(topNow);
    for (const tr of this.trees) {
      if (dt > 0) {
        tr.sx.step(THREE.MathUtils.clamp(-this.topVel.dot(fwd) * 0.012 + this.topVel.y * 0.006, -0.3, 0.3), 26, 3.2, dt);
        tr.sz.step(THREE.MathUtils.clamp((this.topVel.x * Math.cos(h) - this.topVel.z * Math.sin(h)) * 0.014, -0.3, 0.3), 26, 3.2, dt);
      }
      tr.mesh.quaternion.copy(tr.rest).multiply(q1.setFromEuler(new THREE.Euler(tr.sx.x, 0, tr.sz.x)));
    }

    // Dormant, the whole of it goes down into the ground (slowly, then it's still).
    const sk = this.sink * this.sink * (3 - 2 * this.sink);
    this.group.position.y = -SINK * sk - DEEP * this.under * this.under * (3 - 2 * this.under);
    this.group.updateMatrixWorld(true);
    for (const b of this.batches) {
      // (The batches hang off the group, which has sunk; the bones' world matrices already have.)
      const gy = this.group.position.y;
      b.parts.forEach((p, i) => { m4.multiplyMatrices(p.bone.matrixWorld, b.local[i]); m4.elements[13] -= gy; b.mesh.setMatrixAt(i, m4); });
      b.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
