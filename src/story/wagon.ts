// The wagon (the bridge quest, docs/NEXT-bridge.md): a four-wheeled plank
// wagon with a driver's bench and a pair of shafts for a stelk, built by the
// mill like the mill was (story/build.ts: logs for its wheels and running
// gear, logs for its bed, bench and shafts). Once it stands the villagers
// load it with the mill's boards, and you with whatever wood you bring; the
// load shows as boards stacked in its bed. Full, it's hauled down the
// giant's trail to the strait (story/bridgeQuest.ts drives it: `place`).
//
// Wagon-local: +z forward (toward the shafts), x across, y up from the
// ground under its wheels.

import * as THREE from 'three';
import { siteLocal, siteToLocal } from '../world/storySite';
import { fillPart, makePart, setPartBuilt, setPartFilled, tickPart, type Buildable, type Part, type PartId } from './build';
import { core, K, kbox, merge } from './geometry';
import { glintMat, propMesh } from './props';
import { makeSolidMaterial } from '../gfx/materials';
import type { Mob } from '../mobs/types';
import type { Stelk } from '../mobs/stelk';

export type WagonPartId = 'wheels' | 'bed';

/** Its measurements: wheel radius, axles fore and aft, track (half), the deck's top, its half length and width, the shafts' reach (to the stelk), how long they are (up past its flanks to just behind its shoulders; a short chain does the rest), and how far up their ends come. */
export const WAG = { R: 0.42, AX: 0.95, TR: 0.8, DECK: 0.86, HL: 1.35, HW: 0.68, SHAFT: 3.5, POLE: 3.45, RISE: 0.42 };
/** A shaft's end, where its chain hooks on (wagon-local; x is +-). */
const TIP = new THREE.Vector3(0.68, WAG.R + 0.36 + WAG.RISE, WAG.HL - 0.2 + WAG.POLE);
/** How many boards make a full load, and how many go in a course of them. */
export const LOAD = 21;
const ROW = 3;

function wheel(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const disc = new THREE.CylinderGeometry(WAG.R - 0.05, WAG.R - 0.05, 0.07, 18).rotateZ(Math.PI / 2);
  parts.push(core(disc, K.wood));
  const rim = new THREE.TorusGeometry(WAG.R - 0.03, 0.05, 6, 22).rotateY(Math.PI / 2);
  parts.push(core(rim, K.trunk));
  const hub = new THREE.CylinderGeometry(0.1, 0.12, 0.18, 10).rotateZ(Math.PI / 2);
  parts.push(core(hub, K.trunk));
  // Two planks' joins across the disc, a little proud of it.
  for (const s of [-1, 1]) parts.push(kbox(0.09, 0.03, (WAG.R - 0.08) * 1.7, s * 0.04, s * 0.13, 0, K.trunk, 0, 0, 0));
  return merge(parts);
}

export class Wagon implements Buildable {
  readonly root = new THREE.Group();
  /** Overlay-scene objects (sketches, slots). */
  readonly overlay = new THREE.Group();
  readonly mat = glintMat({ toneVar: 0 });
  readonly parts: Record<WagonPartId, Part>;
  /** Where it stands to be built and loaded: its middle on the ground, and the way it faces. */
  readonly home: { x: number; z: number; rot: number; y: number };
  /** Boards in its bed (0..LOAD). */
  load = 0;
  /** Which way it faces now and how far it has rolled (wheel turns). */
  private wheels: THREE.Object3D[] = [];
  private loadMesh: THREE.Mesh;
  private boardVerts = 0;
  private camRight = new THREE.Vector3(1, 0, 0);
  private t = 0;
  private roll = 0;
  private frame: { x: number; z: number; rot: number; y: number };
  /** The two chains from the shafts' ends to the stelk's yoke. */
  private chains = [new Chain(), new Chain()];

  constructor(at: { x: number; z: number; rot: number; y: number }, private key: string, private puffs: (at: THREE.Vector3, n: number, size: number, spread: number) => void) {
    this.home = { ...at };
    this.frame = { ...at };
    const { R, AX, TR, DECK, HL, HW, SHAFT } = WAG;

    // --- the running gear: two axles and a perch between them, and the four wheels (each its own, to roll).
    const gear: THREE.BufferGeometry[] = [], gSk: THREE.BufferGeometry[] = [];
    for (const z of [-AX, AX]) { gear.push(kbox(TR * 2 + 0.1, 0.12, 0.14, 0, R, z, K.trunk)); gSk.push(kbox(TR * 2 + 0.1, 0.12, 0.14, 0, R, z, K.trunk)); }
    gear.push(kbox(0.14, 0.12, AX * 2 + 0.3, 0, R + 0.08, 0, K.trunk));
    for (const x of [-TR, TR]) for (const z of [-AX, AX]) gSk.push(kbox(0.08, R * 2, R * 2, x, R, z, K.wood));
    // --- the bed: a plank deck, slatted sides and tailboard, the driver's bench up front, a footboard, and the shafts.
    const bed: THREE.BufferGeometry[] = [], bSk: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) bed.push(kbox(HW * 2 / 5 - 0.015, 0.07, HL * 2, -HW + (HW * 2 / 5) * (i + 0.5), DECK - 0.035, 0, K.boards));
    bSk.push(kbox(HW * 2, 0.07, HL * 2, 0, DECK - 0.035, 0, K.boards));
    for (const s of [-1, 1]) {
      for (const y of [DECK + 0.12, DECK + 0.3]) bed.push(kbox(0.06, 0.12, HL * 2, s * (HW + 0.03), y, 0, K.wood));
      bSk.push(kbox(0.06, 0.32, HL * 2, s * (HW + 0.03), DECK + 0.16, 0, K.wood));
      for (const z of [-HL + 0.05, 0, HL - 0.05]) bed.push(kbox(0.08, 0.42, 0.08, s * (HW + 0.03), DECK + 0.18, z, K.trunk));
    }
    for (const y of [DECK + 0.12, DECK + 0.3]) bed.push(kbox(HW * 2 + 0.1, 0.12, 0.06, 0, y, -HL - 0.03, K.wood));
    bSk.push(kbox(HW * 2 + 0.1, 0.32, 0.06, 0, DECK + 0.16, -HL - 0.03, K.wood));
    // The bench: on two uprights at the front of the bed, a backrest board, a footboard out over the front axle.
    bed.push(kbox(HW * 2 + 0.06, 0.08, 0.34, 0, DECK + 0.4, HL - 0.22, K.boards));
    for (const s of [-1, 1]) bed.push(kbox(0.08, 0.4, 0.3, s * (HW - 0.12), DECK + 0.2, HL - 0.22, K.trunk));
    bed.push(kbox(HW * 2, 0.22, 0.05, 0, DECK + 0.62, HL - 0.42, K.wood));
    bed.push(kbox(HW * 2 - 0.1, 0.05, 0.36, 0, DECK + 0.02, HL + 0.18, K.boards, -0.25));
    bSk.push(kbox(HW * 2 + 0.06, 0.48, 0.34, 0, DECK + 0.24, HL - 0.22, K.boards));
    // Shafts: from under the bed's front, up along the stelk's flanks to just short of its yoke; a ring at each end for its chain. A bar across.
    for (const s of [-1, 1]) {
      const len = WAG.POLE, mid = HL - 0.2 + len / 2, rise = WAG.RISE;
      bed.push(kbox(0.08, 0.08, Math.hypot(len, rise), s * TIP.x, R + 0.36 + rise / 2, mid, K.trunk, -Math.atan2(rise, len)));
      bSk.push(kbox(0.08, 0.08, len, s * TIP.x, R + 0.36 + rise / 2, mid, K.trunk));
      bed.push(core(new THREE.TorusGeometry(0.045, 0.014, 6, 12).rotateY(Math.PI / 2).translate(s * TIP.x, TIP.y - 0.06, TIP.z - 0.03), K.steel));
    }
    void SHAFT;
    bed.push(kbox(1.2, 0.07, 0.07, 0, R + 0.32, HL + 0.35, K.trunk));

    const piece = (geo: THREE.BufferGeometry, centre: THREE.Vector3) => {
      const pv = new THREE.Group();
      pv.position.copy(centre);
      const m = propMesh(geo, this.mat);
      m.position.copy(centre).negate();
      pv.add(m);
      this.root.add(pv);
      return pv;
    };
    const cGear = new THREE.Vector3(0, R, 0), cBed = new THREE.Vector3(0, DECK, 0.3);
    const pGear = piece(merge(gear), cGear);
    // The wheels go with the gear (its pop), each turning about its own hub.
    const wg = wheel();
    for (const x of [-TR, TR]) for (const z of [-AX, AX]) {
      const w = new THREE.Group();
      w.position.set(x, R, z).sub(cGear);
      w.add(propMesh(wg, this.mat));
      pGear.add(w);
      this.wheels.push(w);
    }
    const pBed = piece(merge(bed), cBed);
    // The load: boards along the bed, three to a course.
    const boards: THREE.BufferGeometry[] = [];
    for (let i = 0; i < LOAD; i++) {
      const course = Math.floor(i / ROW), k = i % ROW, j = (i * 7) % 5;
      // (Fresh-sawn, paler than the wagon, piled up past its sides: a load you can see.)
      boards.push(kbox(0.36, 0.09, HL * 2 - 0.35 - (j % 2) * 0.14, (k - (ROW - 1) / 2) * 0.4 * (1 - course * 0.06), DECK + 0.06 + course * 0.115, (j - 2) * 0.03, K.cut, 0, (j - 2) * 0.014));
    }
    this.boardVerts = boards[0].attributes.position.count;
    this.loadMesh = propMesh(merge(boards), this.mat);
    (this.loadMesh.geometry as THREE.InstancedBufferGeometry).index = null;
    pBed.add(this.loadMesh);
    this.loadMesh.position.sub(cBed);
    for (const c of this.chains) { c.mesh.visible = false; this.root.add(c.mesh); }
    this.place(at.x, at.z, at.rot, () => at.y);
    const M = this.root.matrixWorld.clone();
    const W = (v: THREE.Vector3) => this.root.localToWorld(v.clone());
    this.parts = {
      wheels: makePart('wheels', 'log', 5, pGear, [], merge(gSk), merge(gSk), M, this.overlay, new THREE.Vector3(0, 1.7, 0), W(cGear)),
      bed: makePart('bed', 'log', 7, pBed, [], merge(bSk), merge(bSk), M, this.overlay, new THREE.Vector3(0, 2.4, 0), W(cBed)),
    };
    try { this.load = Math.max(0, Math.min(LOAD, +(localStorage.getItem(this.key) ?? 0) | 0)); } catch { /* none */ }
    this.show();
  }

  get built() { return this.parts.wheels.state === 'built' && this.parts.bed.state === 'built'; }
  get full() { return this.load >= LOAD; }

  private show() { (this.loadMesh.geometry as THREE.InstancedBufferGeometry).setDrawRange(0, this.load * this.boardVerts); this.loadMesh.visible = this.load > 0; }
  /** Boards in (a villager's three, or your wood one at a time). */
  add(n: number) {
    this.load = Math.min(LOAD, this.load + n);
    this.show();
    try { localStorage.setItem(this.key, String(this.load)); } catch { /* ignore */ }
  }
  /** Dev: a load of `n`. */
  setLoad(n: number) { this.load = 0; this.add(n); }

  /** Wagon-local (x, z, up) in the world, as it stands now. */
  local(lx: number, lz: number, up = 0, out = new THREE.Vector3()) { return this.root.localToWorld(out.set(lx, up, lz)); }
  /** Where it stands, and which way it faces, now. */
  get pos() { return this.root.position; }
  get heading() { return this.frame.rot; }

  /**
   * Stand it at (x, z) facing `yaw`, on `ground` (pitched and rolled to it), its wheels turned for however far it has
   * come since it was last put somewhere.
   */
  place(x: number, z: number, yaw: number, ground: (x: number, z: number) => number) {
    const { AX, TR } = WAG;
    const moved = Math.hypot(x - this.frame.x, z - this.frame.z) * Math.sign(Math.sin(yaw) * (x - this.frame.x) + Math.cos(yaw) * (z - this.frame.z) || 1);
    this.frame.x = x; this.frame.z = z; this.frame.rot = yaw;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const hf = ground(x + fx * AX, z + fz * AX), hb = ground(x - fx * AX, z - fz * AX);
    const hl = ground(x + rx * TR, z + rz * TR), hr = ground(x - rx * TR, z - rz * TR);
    const y = Math.max((hf + hb) / 2, (hl + hr) / 2);
    this.frame.y = y;
    this.root.position.set(x, y, z);
    this.root.rotation.set(-Math.atan2(hf - hb, AX * 2), yaw, Math.atan2(hl - hr, TR * 2) * 0.6, 'YXZ');
    this.root.updateMatrixWorld(true);
    this.roll += moved / WAG.R;
    for (const w of this.wheels) w.rotation.x = this.roll;
  }

  /** The driver's seat: where your hips go, and which way you sit. */
  seat(out: { pos: THREE.Vector3; quat: THREE.Quaternion; spread: number }) {
    this.root.localToWorld(out.pos.set(0, WAG.DECK + 0.5, WAG.HL - 0.24));
    out.quat.copy(this.root.quaternion);
    out.spread = 0.14;
    return out;
  }

  /** Where the stelk's harness is: the end of the shafts (its chest goes there), in the world. */
  hitch(out: THREE.Vector3) { return this.root.localToWorld(out.set(0, 0, WAG.HL - 0.2 + WAG.SHAFT - 0.2)); }

  /**
   * The chains, each frame (after the wagon and the stelk are placed): `m` is the stelk if it's about. Standing in the
   * shafts it wears the yoke and the chains run to it, slack enough to swing as the wagon rocks; otherwise they hang
   * off the shafts' ends to the ground.
   */
  harness(m: Mob | null, dt: number) {
    const up = this.parts.bed.state === 'built';
    // Sticky: hooked on once it's stood in the shafts, off only once it's well away (a flicker would whip the chains loose).
    const off = m ? m.pos.distanceTo(this.hitch(hv)) : Infinity;
    const yoked = !!m && up && (m.yoked ? off < 3 : off < 0.6);
    if (m) m.yoked = yoked;
    for (const c of this.chains) c.mesh.visible = up;
    if (!up) return;
    this.root.updateMatrixWorld(true);
    hInv.copy(this.root.matrixWorld).invert();
    const down = hDown.set(0, -1, 0).applyQuaternion(hq.copy(this.root.quaternion).invert());
    if (yoked) (m!.species as Stelk).harness(m!, hooks);
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1, a = hA.set(s * TIP.x, TIP.y - 0.09, TIP.z - 0.03);
      const b = yoked ? hooks[k].applyMatrix4(hInv) : null;
      this.chains[k].step(a, b, down, Math.min(dt, 1 / 30));
    }
  }

  // ------------------------------------------------------------ Buildable

  slotPos(p: Part, i: number, out: THREE.Vector3) {
    const off = (i - (p.need - 1) / 2) * 0.72;
    this.root.localToWorld(out.copy(p.slotAt));
    return out.addScaledVector(this.camRight, off);
  }
  showSketch(id: PartId) { const p = this.parts[id as WagonPartId]; if (p.state === 'broken') p.state = 'sketch'; }
  fill(id: PartId) { return fillPart(this.parts[id as WagonPartId]); }
  setBuilt(id: PartId) { setPartBuilt(this.parts[id as WagonPartId]); }
  setFilled(id: PartId, n: number) { setPartFilled(this.parts[id as WagonPartId], n); }
  remaining(id: PartId) { const p = this.parts[id as WagonPartId]; return p.state === 'built' ? 0 : p.need - p.filled; }
  near(_parts: PartId[], pos: THREE.Vector3) {
    const l = siteToLocal(this.frame, pos.x, pos.z);
    return Math.abs(l.x) < WAG.HW + 4 && l.z > -WAG.HL - 4 && l.z < WAG.HL + WAG.SHAFT + 2;
  }
  /** Within reach to put wood in it. */
  reach(pos: THREE.Vector3) {
    const l = siteToLocal(this.frame, pos.x, pos.z);
    return Math.abs(l.x) < WAG.HW + 2.6 && Math.abs(l.z) < WAG.HL + 2.4 && Math.abs(pos.y - this.frame.y) < 2.5;
  }

  update(dt: number, cam: THREE.Vector3) {
    this.t += dt;
    const cx = cam.x - this.frame.x, cz = cam.z - this.frame.z, cl = Math.hypot(cx, cz) || 1;
    this.camRight.set(cz / cl, 0, -cx / cl);
    for (const p of Object.values(this.parts)) if (tickPart(p, dt, this.t, (i, out) => this.slotPos(p, i, out))) this.puffs(p.centre, 10, 0.25, 2.6);
  }

  /** Push a body circle out of it (once it's there). */
  push(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    if (this.parts.wheels.state !== 'built') return;
    const l = siteToLocal(this.frame, pos.x, pos.z), hx = WAG.TR + 0.1, hz = WAG.HL + 0.1;
    if (pos.y - this.frame.y > WAG.DECK + 0.5) return;
    const qx = Math.max(-hx, Math.min(hx, l.x)), qz = Math.max(-hz, Math.min(hz, l.z));
    let nx = l.x - qx, nz = l.z - qz;
    const d = Math.hypot(nx, nz);
    if (d >= r) return;
    let depth: number;
    if (d > 1e-4) { nx /= d; nz /= d; depth = r - d; }
    else { const px = hx - Math.abs(l.x), pz = hz - Math.abs(l.z); if (px < pz) { nx = Math.sign(l.x) || 1; nz = 0; depth = px + r; } else { nx = 0; nz = Math.sign(l.z) || 1; depth = pz + r; } }
    const w = siteLocal(this.frame, l.x + nx * depth, l.z + nz * depth);
    pos.x = w.x;
    pos.z = w.z;
    const c = Math.cos(this.frame.rot), s = Math.sin(this.frame.rot), wx = c * nx + s * nz, wz = -s * nx + c * nz;
    const vn = vel.x * wx + vel.z * wz;
    if (vn < 0) { vel.x -= wx * vn; vel.z -= wz * vn; }
  }

  dispose() { for (const c of this.chains) (c.mesh.material as THREE.Material).dispose(); this.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); }
}

const hv = new THREE.Vector3(), hA = new THREE.Vector3(), hDown = new THREE.Vector3(), hq = new THREE.Quaternion();
const hInv = new THREE.Matrix4();
const hooks: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(), new THREE.Vector3()];
const cv = new THREE.Vector3(), cv2 = new THREE.Vector3(), cX = new THREE.Vector3(), cY = new THREE.Vector3(), cZ = new THREE.Vector3();

/** Chain: a verlet line of points in wagon-local space, drawn as oval iron links, each turned a quarter from the last. */
const LINKS = 5, CHAIN = 0.5;
const LINK = new THREE.TorusGeometry(0.042, 0.015, 5, 10).scale(1, 1.5, 1);
class Chain {
  readonly mesh: THREE.Mesh;
  private p = Array.from({ length: LINKS + 1 }, () => new THREE.Vector3());
  private prev = Array.from({ length: LINKS + 1 }, () => new THREE.Vector3());
  private pos: THREE.BufferAttribute;
  private nrm: THREE.BufferAttribute;
  private primed = false;

  constructor() {
    const lp = LINK.attributes.position.array, ln = LINK.attributes.normal.array, li = LINK.index!.array, nv = lp.length / 3;
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(nv * LINKS * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.nrm = new THREE.BufferAttribute(new Float32Array(nv * LINKS * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const idx: number[] = [];
    for (let l = 0; l < LINKS; l++) for (let i = 0; i < li.length; i++) idx.push(li[i] + l * nv);
    geo.setAttribute('position', this.pos);
    geo.setAttribute('normal', this.nrm);
    geo.setIndex(idx);
    void ln;
    this.mesh = new THREE.Mesh(geo, makeSolidMaterial('#5d5866', 0, { keep: 0.75 }));
    this.mesh.frustumCulled = false;
  }

  /** Pinned at `a`, and at `b` if given (else the end hangs where it falls). */
  step(a: THREE.Vector3, b: THREE.Vector3 | null, down: THREE.Vector3, dt: number) {
    const p = this.p, n = LINKS;
    if (!this.primed) {
      for (let i = 0; i <= n; i++) { p[i].copy(a).addScaledVector(down, (i / n) * CHAIN * 0.5); this.prev[i].copy(p[i]); }
      this.primed = true;
    }
    const damp = Math.exp(-3 * dt), g = 14 * dt * dt, last = b ? n - 1 : n;
    for (let i = 1; i <= last; i++) {
      const v = cv.subVectors(p[i], this.prev[i]).multiplyScalar(damp);
      this.prev[i].copy(p[i]);
      p[i].add(v).addScaledVector(down, g);
    }
    const seg = Math.max(CHAIN, b ? a.distanceTo(b) * 1.001 : 0) / n;
    for (let it = 0; it < 10; it++) {
      p[0].copy(a);
      if (b) p[n].copy(b);
      for (let i = 0; i < n; i++) {
        const d = cv.subVectors(p[i + 1], p[i]), l = d.length();
        if (l < 1e-6) continue;
        const k = (l - seg) / l;
        const wa = i === 0 ? 0 : i + 1 === n && b ? 1 : 0.5, wb = i + 1 === n && b ? 0 : i === 0 ? 1 : 0.5;
        p[i].addScaledVector(d, k * wa);
        p[i + 1].addScaledVector(d, -k * wb);
      }
      for (let i = 1; i <= last; i++) {
        if (p[i].y < 0.03) p[i].y = 0.03;
      }
    }
    p[0].copy(a);
    if (b) p[n].copy(b);
    // Never off on its own: anything further from either end than the chain allows is put back on the line between them.
    for (let i = 1; i <= last; i++) {
      const far = (b ? Math.max(CHAIN, a.distanceTo(b)) : CHAIN) * 1.05;
      if (p[i].distanceTo(a) > far || (b && p[i].distanceTo(b) > far)) {
        if (b) p[i].lerpVectors(a, b, i / n); else p[i].copy(a).addScaledVector(down, (i / n) * CHAIN);
        this.prev[i].copy(p[i]);
      }
    }
    this.build(down);
  }

  private build(down: THREE.Vector3) {
    const lp = LINK.attributes.position.array, ln = LINK.attributes.normal.array, nv = lp.length / 3;
    const pos = this.pos.array as Float32Array, nrm = this.nrm.array as Float32Array;
    for (let l = 0; l < LINKS; l++) {
      const c = cv.addVectors(this.p[l], this.p[l + 1]).multiplyScalar(0.5);
      cY.subVectors(this.p[l + 1], this.p[l]).normalize();
      cX.crossVectors(cY, down);
      if (cX.lengthSq() < 1e-6) cX.set(1, 0, 0);
      cX.normalize();
      cZ.crossVectors(cX, cY);
      // Every other link a quarter turn round the chain.
      if (l & 1) { cv2.copy(cX); cX.copy(cZ); cZ.copy(cv2).negate(); }
      for (let i = 0; i < nv; i++) {
        const o = (l * nv + i) * 3, x = lp[i * 3], y = lp[i * 3 + 1], z = lp[i * 3 + 2], nx = ln[i * 3], ny = ln[i * 3 + 1], nz = ln[i * 3 + 2];
        pos[o] = c.x + cX.x * x + cY.x * y + cZ.x * z;
        pos[o + 1] = c.y + cX.y * x + cY.y * y + cZ.y * z;
        pos[o + 2] = c.z + cX.z * x + cY.z * y + cZ.z * z;
        nrm[o] = cX.x * nx + cY.x * ny + cZ.x * nz;
        nrm[o + 1] = cX.y * nx + cY.y * ny + cZ.y * nz;
        nrm[o + 2] = cX.z * nx + cY.z * ny + cZ.z * nz;
      }
    }
    this.pos.needsUpdate = true;
    this.nrm.needsUpdate = true;
  }
}
