import * as THREE from 'three';
import { Beast, clamp, collarGeometry, saddleGeometry, type Anim, type BeastData } from './beast';
import type { PartBatch } from './parts';
import { colored, ellipsoid, furBall, merge, smooth, tube } from './shapes';
import type { Mob, MobCtx } from './types';

// The woolly wurm: a huge, friendly, fuzzy caterpillar, banded like a
// humbug, with a round smiling face and two bobbly feelers. Its body is a
// chain of fluffy segments that follows the head's path over the ground,
// humping along in an inchworm wave. It lives in the hollows and on steep
// rocky slopes. Ridden, it steers like a snake: quick, and straight onto
// the new line with no slide, the body following the head's exact path
// round every corner. And it clings to whatever it's on: up cliffs and
// ravine walls, over boulders, up a cabin wall, over the roof and down the
// other side, and never falls off a ledge.

const SEGS = [0.75, 0.72, 0.74, 0.72, 0.68, 0.62, 0.55, 0.47, 0.38];
const GAP = 0.82;
/** The segment the rider sits on. */
const SADDLE_SEG = 2;
const TRAIL_STEP = 0.12;

function segmentGeometry(band: boolean, seed: number) {
  const fur = furBall({ widthSegs: 34, heightSegs: 24, tufts: 60, amp: 0.14, sweep: 0.08, share: 0.55, seed, comb: (d, o) => o.set(0, 0, -1).addScaledVector(d, -d.dot(o)).normalize() });
  // Stubby legs underneath, a pair per segment.
  const legs: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) legs.push(colored(ellipsoid(0.16, 0.2, 0.16, 10, 8).translate(s * 0.45, -0.82, 0.05), '#d8c7b6'));
  return merge([colored(fur, band ? '#cbb7a6' : '#ffffff'), ...legs]);
}

const CRANIUM = new THREE.Vector3(0, 0, 0);
function headGeometry() {
  // A round face, smooth where the features are, fuzzy round the edge.
  const head = furBall({ widthSegs: 40, heightSegs: 30, tufts: 70, amp: 0.1, sweep: 0.06, share: 0.5, seed: 70, mask: (d) => smooth(-d.z, -0.8, -0.1) + 0.05 }).scale(0.78, 0.76, 0.76);
  const feelers: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    feelers.push(tube([[s * 0.25, 0.6, 0.1], [s * 0.38, 0.95, 0.2], [s * 0.5, 1.15, 0.12]], 0.05, 0.03, '#cbb7a6', 0, true, 10, 6));
    feelers.push(colored(furBall({ widthSegs: 16, heightSegs: 12, tufts: 14, amp: 0.25, seed: 9 }).scale(0.13, 0.13, 0.13).translate(s * 0.5, 1.18, 0.12), '#f4e9d8'));
  }
  const cheeks: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) cheeks.push(colored(ellipsoid(0.13, 0.08, 0.04, 12, 8).translate(s * 0.38, -0.12, 0.66), '#ef9c93', 0, false));
  return merge([colored(head, '#ffffff', 1), ...feelers, ...cheeks]);
}

const tv = new THREE.Vector3();

/** A woolly wurm in stone, curled round on itself with its head up (the shrine the fourth ring becomes): position and normal, on y = 0, facing +z. */
export function wurmStatue(): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [];
  const n3 = new THREE.Matrix3(), v = new THREE.Vector3(), q = new THREE.Quaternion(), one = new THREE.Vector3();
  const add = (g: THREE.BufferGeometry, at: THREE.Matrix4) => {
    const flat = g.index ? g.toNonIndexed() : g;
    const p = flat.getAttribute('position'), n = flat.getAttribute('normal');
    n3.getNormalMatrix(at);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(at);
      pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(n3).normalize();
      nor.push(v.x, v.y, v.z);
    }
  };
  // Half size: she is long. The head at the front, lifted; the body behind it in most of a ring.
  const S = 0.5, R = 0.95;
  add(headGeometry(), new THREE.Matrix4().compose(new THREE.Vector3(0, 1.05 * S + 0.42, R * 0.55), q.setFromEuler(new THREE.Euler(-0.35, 0, 0)), one.setScalar(S)));
  for (let k = 1; k < SEGS.length; k++) {
    const a = 0.5 + k * 0.62, s = SEGS[k] * S;
    add(segmentGeometry(k % 2 === 1, 70 + k), new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(a) * R, s * 0.95 + (k === 1 ? 0.2 : 0), Math.cos(a) * R * 0.9 - 0.1), q.setFromEuler(new THREE.Euler(0, a - Math.PI / 2, 0)), one.setScalar(s)));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.computeVertexNormals();
  return g;
}

export class Wurm extends Beast {
  private headB: PartBatch; private segB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'wurm', radius: 0.9, centreY: 0.72, flockSize: [1, 1],
      mount: {
        name: 'wurm', radius: 0.7,
        walk: { speed: 6.5, sprint: 11.5, takeoff: 0 },
        swim: 0.5,
        // Snake steering, and it clings: straight up walls, over boulders, never falls.
        trait: { cling: true, snap: true, slopeDrag: 0, mudder: true },
      },
      amble: 0.5, travel: 0.7, flee: 1.8, wary: [5, 9], space: 3, spread: 4,
      habitat: (s) => {
        if (s.h < 2 || s.bog > 0.3) return Infinity;
        if (s.hollow > 0.3) return 0.2;
        // Cliffs and steep rocky ground.
        if (s.slope > 2.2 && s.rock > 0.2) return 0.7;
        return Infinity;
      },
      coats: ['#e9c98d', '#dc9d72', '#bca9d8'], rare: ['#f3efe6', 0.1],
      strideLen: 0.9, seatSpread: 0.95, herds: 1, every: [60, 120], verb: 'cling',
    });
    const look = { keep: 0.55, softCrease: 0.8 };
    this.headB = this.batch(headGeometry(), { ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.34, 0.14], eyeSize: [0.17, 0.2], pupil: [0.08, 0.11], lookRange: [0.1, 0.07], mouthW: [-0.22, 0.12, 0.8] }, 1, 6);
    this.segB = [this.batch(segmentGeometry(false, 71), look, 5, 6), this.batch(segmentGeometry(true, 72), look, 5, 6)];
    this.saddleB = this.batch(saddleGeometry(1, 1, 1, '#4f7a6a', '#efe4d2', '#6e4a33', 0.5), { keep: 0.75, doubleSide: true }, 1, 6);
    this.collarB = this.batch(collarGeometry(0.62), { keep: 0.6 }, 1, 6);
  }

  protected build(d: BeastData) {
    // The head is the body (the root's child); the rest trail behind in world space.
    this.draw(d, this.headB, d.body, { eye: true });
    d.body.add(d.head);
    d.body.add(d.collar);
    d.collar.position.set(0, -0.05, -0.35);
    d.collar.rotation.x = Math.PI / 2;
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    const segs: THREE.Object3D[] = [];
    for (let k = 1; k < SEGS.length; k++) {
      const o = new THREE.Object3D();
      o.scale.setScalar(SEGS[k]);
      segs.push(o);
      this.draw(d, this.segB[k % 2], o);
    }
    const saddle = segs[SADDLE_SEG - 1];
    const sd = this.node(d, 'saddle', saddle, 0, 0.02, 0);
    this.draw(d, this.saddleB, sd, { tint: false, when: 1 });
    saddle.add(d.seat);
    d.seat.position.set(0, 1.0, 0);
    d.s.segs = segs;
    d.s.trail = [] as THREE.Vector3[];
  }

  /** Lay the trail out straight behind (spawn, or after it moved while unseen). */
  private straighten(m: Mob, d: BeastData) {
    const trail: THREE.Vector3[] = d.s.trail;
    trail.length = 0;
    const n = Math.ceil((SEGS.length * GAP) / TRAIL_STEP) + 4;
    for (let i = 0; i < n; i++) trail.push(new THREE.Vector3(m.pos.x - Math.sin(m.heading) * i * TRAIL_STEP, m.pos.y, m.pos.z - Math.cos(m.heading) * i * TRAIL_STEP));
  }

  /** The point `s` metres back along the trail. */
  private along(trail: THREE.Vector3[], s: number, out: THREE.Vector3) {
    let acc = 0;
    for (let i = 0; i + 1 < trail.length; i++) {
      const l = trail[i].distanceTo(trail[i + 1]);
      if (acc + l >= s) return out.lerpVectors(trail[i], trail[i + 1], (s - acc) / Math.max(l, 1e-6));
      acc += l;
    }
    return out.copy(trail[trail.length - 1]);
  }

  protected pose(m: Mob, d: BeastData, a: Anim, ctx: MobCtx) {
    const t = a.t;
    const trail: THREE.Vector3[] = d.s.trail;
    if (!trail.length || trail[0].distanceTo(m.pos) > 3) this.straighten(m, d);
    // Ground under the ground-walking wild ones; wherever the ridden one clings.
    const feet = m.ridden ? m.pos.y : this.floor(ctx, m.pos.x, m.pos.z);
    // trail[0] is the head, live; behind it, points laid down every
    // TRAIL_STEP of the way it has come (measured from the last one laid, so
    // the path is kept however little it moves each frame).
    trail[0].set(m.pos.x, feet, m.pos.z);
    if (trail.length < 2 || trail[0].distanceTo(trail[1]) >= TRAIL_STEP) {
      trail.unshift(trail[0].clone());
      const n = Math.ceil((SEGS.length * GAP) / TRAIL_STEP) + 4;
      if (trail.length > n) trail.length = n;
    }
    // The inchworm wave: humps roll back down the body as it goes.
    const wave = (k: number) => Math.max(0, Math.sin(a.stride * Math.PI * 2 - k * 0.9)) * 0.22 * a.moving;
    // The head: pitched along its own path (all the way up a wall, or nose
    // down one), else with the ground; a friendly wobble.
    let lean = -a.slope;
    if (m.ridden) {
      this.along(trail, 0.5, tv);
      const dy = trail[0].y - tv.y, dxz = Math.hypot(trail[0].x - tv.x, trail[0].z - tv.z);
      if (dy * dy + dxz * dxz > 0.04) lean = -Math.atan2(dy, dxz);
    }
    const pitch = d.pitch.step(lean - a.joy * 0.3 + (a.caught ? Math.sin(m.stateT * 4) * 0.2 : 0), 60, 14, a.dt);
    d.body.position.y = SEGS[0] * 1.1 + wave(0) + a.joy * 0.3;
    d.body.rotation.set(pitch + a.graze * 0.2 + Math.sin(t * 0.8) * 0.04, a.lookYaw * 0.7, Math.sin(t * 1.1) * 0.06 + a.alert * Math.sin(t * 0.6) * 0.12);
    // The rest follow the trail, each looking toward the one in front.
    const segs: THREE.Object3D[] = d.s.segs;
    const prev = new THREE.Vector3(m.pos.x, feet + d.body.position.y, m.pos.z);
    for (let k = 1; k < SEGS.length; k++) {
      const o = segs[k - 1];
      this.along(trail, k * GAP, o.position);
      o.position.y += SEGS[k] * 0.9 + wave(k);
      tv.subVectors(prev, o.position);
      // Yaw and pitch toward the one in front (never a roll: it stays upright).
      if (tv.lengthSq() > 1e-6) {
        tv.normalize();
        // (Straight up or down a wall there's no way it's turned to read off the path: it's the head's, so its back is to the open air.)
        o.rotation.set(-Math.asin(clamp(tv.y, -1, 1)), Math.hypot(tv.x, tv.z) > 0.05 ? Math.atan2(tv.x, tv.z) : m.heading, 0, 'YXZ');
      }
      prev.copy(o.position);
      o.updateMatrixWorld(true);
    }
    // Up a wall the rider leans in to hug it rather than lying flat out.
    d.seat.rotation.x = -segs[SADDLE_SEG - 1].rotation.x * 0.55;
    d.seat.updateMatrixWorld(true);
    d.s.lids = a.graze > 0 ? 0.55 : undefined;
  }
}
