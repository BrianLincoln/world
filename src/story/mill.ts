// The lumber mill: the village's first building that makes something by
// itself (owner, 2026-10-13: "more and more ways to expand the village").
// An open shed on the village's free plot nearest your cabin: stone pads,
// a timber frame with a plank back wall, a two-slope plank roof. Inside, a
// low sawhorse at the villagers' height; beside it a pile of logs and a
// stack of boards.
//
// It's built like the cabin and the stable (story/build.ts): the guide shows
// it as a sketch in phase 4 of the director (story/phase4.ts), and you bring
// stones for its footing and logs for its frame and roof. Once it stands the
// villagers work it for real (story/village.ts, `MillWorks`): they fell
// trees about the village, carry the logs in on their heads to the pile, saw
// them into boards at the sawhorse and stack the boards; while the wagon is
// being loaded (the bridge quest) they carry them out to it instead. What's
// on the stack is yours too: walk up to it and it's in your pack as wood.
//
// Saved: what's built is the director's; what's on the pile and the stack is
// `embla.mill.<seed>`.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { siteLocal, siteToLocal, type Plot } from '../world/storySite';
import type { Sfx } from './audio';
import { fillPart, makePart, setPartBuilt, setPartFilled, tickPart, type Buildable, type Part, type PartId } from './build';
import { core, K, kbox, merge } from './geometry';
import { glintMat, propMesh } from './props';
import { CUT_Z, HORSE_TOP } from './chores';

export type MillPartId = 'mfoot' | 'mframe' | 'mroof';

/** The shed (mill-local: x across its open front, +z out of the front toward the lane, y up from the pad). */
export const MILL = { W: 6.2, D: 3.6, eave: 2.45, ridge: 3.5, over: 0.5 };
/** How many logs the pile shows, and boards the stack holds. */
export const LOGS = 6, CAP = 30;
/** How near the stack you take from it (m), and how fast boards come to you (a second). */
const REACH = 2.6, RATE = 9;

/** A board on the stack: five to a course, each course across the one under it. */
const BOARD = { L: 1.5, T: 0.075, W: 0.26 };

const m4 = new THREE.Matrix4(), e1 = new THREE.Euler();
function stone(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.4);
  if (ry) g.applyMatrix4(m4.makeRotationFromEuler(e1.set(0, ry, 0)));
  g.translate(x, y, z);
  return core(g, K.stone);
}
function log(len: number, r: number, x: number, y: number, z: number, alongX: boolean) {
  const g = new THREE.CylinderGeometry(r, r * 1.04, len, 10);
  g.rotateX(Math.PI / 2);
  if (alongX) g.rotateY(Math.PI / 2);
  g.translate(x, y, z);
  return core(g, K.trunk);
}

export class Mill implements Buildable {
  readonly root = new THREE.Group();
  /** Overlay-scene objects (sketches, slots). */
  readonly overlay = new THREE.Group();
  readonly mat = glintMat({ toneVar: 0 });
  readonly parts: Record<MillPartId, Part>;
  /** Its frame in the world (the plot): centre, yaw, pad height. */
  readonly frame: { x: number; z: number; rot: number; y: number };
  /** The sawhorse the villagers saw at (its local z runs along the board), under the roof. */
  readonly horse = new THREE.Object3D();
  /** Where a log is put on the pile, and where boards are stacked (the near side of each, at the ground). */
  readonly pileAt = new THREE.Vector3();
  readonly stackAt = new THREE.Vector3();
  /** The middle of the front, out on the lane side (where the guide stands to run the job), and in front of that. */
  readonly base = new THREE.Vector3();
  readonly front = new THREE.Vector3();
  logs = 0;
  stock = 0;
  private pile: THREE.Mesh;
  private stack: THREE.Mesh;
  private pileVerts = 0;
  private boardVerts = 0;
  private camRight = new THREE.Vector3(1, 0, 0);
  private t = 0;
  private takeT = 0;
  private saveT = 0;
  private dirty = false;

  constructor(plot: Plot, private key: string, private puffs: (at: THREE.Vector3, n: number, size: number, spread: number) => void, private sfx?: Sfx) {
    this.frame = { x: plot.x, z: plot.z, rot: plot.rot, y: plot.y };
    this.root.position.set(plot.x, plot.y, plot.z);
    this.root.rotation.y = plot.rot;
    this.root.updateMatrixWorld(true);
    const { W, D, eave, ridge, over } = MILL, hw = W / 2, hd = D / 2;

    // --- footing: a stone pad under each post, and a low dry-stone sill along the back.
    const foot: THREE.BufferGeometry[] = [], fSk: THREE.BufferGeometry[] = [];
    const posts: [number, number][] = [];
    for (const x of [-hw, 0, hw]) for (const z of [-hd, hd]) posts.push([x, z]);
    for (const [x, z] of posts) { foot.push(stone(0.62, 0.32, 0.62, x, 0.1, z, x * 0.7 + z)); fSk.push(kbox(0.62, 0.32, 0.62, x, 0.1, z, K.stone)); }
    for (let i = 0; i < 7; i++) {
      const x = -hw + 0.55 + i * ((W - 1.1) / 6), s = 0.42 + ((i * 37) % 5) * 0.03;
      foot.push(stone(s * 1.2, s * 0.62, s, x, s * 0.25, -hd + 0.05, i * 0.9));
    }
    fSk.push(kbox(W - 0.6, 0.3, 0.42, 0, 0.12, -hd + 0.05, K.stone));

    // --- frame: six posts, beams all round under the eaves, a plank back wall half way up, a tie across the middle.
    const fr: THREE.BufferGeometry[] = [], kSk: THREE.BufferGeometry[] = [];
    const both = (g: () => THREE.BufferGeometry) => { fr.push(g()); kSk.push(g()); };
    for (const [x, z] of posts) both(() => kbox(0.24, eave - 0.2, 0.24, x, 0.2 + (eave - 0.2) / 2, z, K.trunk));
    for (const z of [-hd, hd]) both(() => kbox(W + 0.4, 0.24, 0.26, 0, eave - 0.05, z, K.trunk));
    for (const x of [-hw, hw]) both(() => kbox(0.26, 0.24, D, x, eave - 0.05, 0, K.trunk));
    both(() => kbox(0.2, 0.2, D, 0, eave - 0.05, 0, K.trunk));
    for (let r = 0; r < 5; r++) fr.push(kbox(W, 0.2, 0.08, 0, 0.42 + r * 0.21, -hd + 0.02, K.wood));
    kSk.push(kbox(W, 1.05, 0.08, 0, 0.84, -hd + 0.02, K.wood));
    // A brace in each back corner.
    for (const s of [-1, 1]) fr.push(kbox(0.12, 1.3, 0.12, s * (hw - 0.45), eave - 0.55, -hd + 0.1, K.trunk, 0, 0, s * 0.75));

    // --- roof: two plank slopes off a ridge along the shed, eaves out past the posts, a mossy ridge.
    const rf: THREE.BufferGeometry[] = [], rSk: THREE.BufferGeometry[] = [];
    const rise = ridge - eave - 0.1, run = hd + over, slope = Math.atan2(rise, hd), len = Math.hypot(run, rise * (run / hd));
    for (const sg of [-1, 1]) {
      const cz = sg * run / 2, cy = ridge - (rise * (run / hd)) / 2;
      for (let i = 0; i < 9; i++) {
        const w = (W + 2 * over) / 9, x = -hw - over + w * (i + 0.5);
        rf.push(kbox(w + 0.03, 0.09, len, x, cy + ((i * 13) % 3) * 0.012, cz, K.boards, sg * slope, 0, 0));
      }
      rSk.push(kbox(W + 2 * over, 0.12, len, 0, cy, cz, K.boards, sg * slope));
    }
    rf.push(kbox(W + 2 * over + 0.1, 0.16, 0.36, 0, ridge + 0.02, 0, K.moss));
    rSk.push(kbox(W + 2 * over + 0.1, 0.16, 0.36, 0, ridge + 0.02, 0, K.moss));

    const piece = (geo: THREE.BufferGeometry, centre: THREE.Vector3) => {
      const pv = new THREE.Group();
      pv.position.copy(centre);
      const m = propMesh(geo, this.mat);
      m.position.copy(centre).negate();
      pv.add(m);
      this.root.add(pv);
      return pv;
    };
    const cFoot = new THREE.Vector3(0, 0.15, 0), cFrame = new THREE.Vector3(0, 1.2, 0), cRoof = new THREE.Vector3(0, ridge - 0.5, 0);
    const pFoot = piece(merge(foot), cFoot), pFrame = piece(merge(fr), cFrame), pRoof = piece(merge(rf), cRoof);
    const M = this.root.matrixWorld.clone();
    const W2 = (v: THREE.Vector3) => this.root.localToWorld(v.clone());
    this.parts = {
      mfoot: makePart('mfoot', 'stone', 6, pFoot, [], merge(fSk), merge(fSk), M, this.overlay, new THREE.Vector3(0, 1.4, hd + 2.2), W2(cFoot)),
      mframe: makePart('mframe', 'log', 7, pFrame, [], merge(kSk), merge(kSk), M, this.overlay, new THREE.Vector3(0, 2.9, hd + 2.0), W2(cFrame)),
      mroof: makePart('mroof', 'log', 5, pRoof, [], merge(rSk), merge(rSk), M, this.overlay, new THREE.Vector3(0, ridge + 1.1, hd + 1.2), W2(cRoof)),
    };

    // The logs waiting, on the left outside, three, two and one, and the stack of boards on the right.
    const logs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < LOGS; i++) {
      const row = i < 3 ? 0 : i < 5 ? 1 : 2, k = i < 3 ? i : i < 5 ? i - 3 : 0, n = 3 - row;
      logs.push(log(2.1 - row * 0.1, 0.17, -hw - 1.1, 0.17 + row * 0.3, (k - (n - 1) / 2) * 0.36, false));
    }
    this.pileVerts = logs[0].attributes.position.count;
    this.pile = propMesh(merge(logs), this.mat);
    // (Its two bearers first: they're always there under it.)
    const boards: THREE.BufferGeometry[] = [kbox(0.12, 0.1, BOARD.L, hw + 0.7, 0.05, 0, K.trunk), kbox(0.12, 0.1, BOARD.L, hw + 1.7, 0.05, 0, K.trunk)];
    for (let i = 0; i < CAP; i++) {
      const course = Math.floor(i / 5), k = i % 5, across = course % 2 === 1;
      boards.push(kbox(across ? BOARD.L : BOARD.W, BOARD.T, across ? BOARD.W : BOARD.L, hw + 1.2 + (across ? 0 : (k - 2) * 0.29), 0.16 + course * BOARD.T, across ? (k - 2) * 0.29 : 0, K.wood));
    }
    this.boardVerts = boards[0].attributes.position.count;
    this.stack = propMesh(merge(boards), this.mat);
    // (Drawn as how many there are: non-indexed, every piece the same count.)
    for (const m of [this.pile, this.stack]) { (m.geometry as THREE.InstancedBufferGeometry).index = null; this.root.add(m); }
    // The sawhorse: under the roof, across the middle of the shed, its cut end toward the stack.
    this.horse.position.set(0.2, 0, 0.35);
    this.horse.rotation.y = Math.PI / 2;
    this.root.add(this.horse);
    this.root.updateMatrixWorld(true);
    this.horse.removeFromParent();
    this.horse.matrixWorld.decompose(this.horse.position, this.horse.quaternion, this.horse.scale);
    this.horse.updateMatrixWorld(true);
    this.pileAt.copy(this.local(-hw - 1.1, 1.55));
    this.stackAt.copy(this.local(hw + 1.2, 1.15));
    this.base.copy(this.local(-1.6, hd + 1.6));
    this.front.copy(this.local(0, hd + 3));
    try { const s = JSON.parse(localStorage.getItem(this.key) ?? 'null'); if (s) { this.logs = Math.min(LOGS, s.logs | 0); this.stock = Math.min(CAP, s.stock | 0); } } catch { /* a fresh mill */ }
    this.show();
  }

  /** Mill-local (x, z) in the world, on the pad. */
  local(lx: number, lz: number, up = 0) {
    const w = siteLocal(this.frame, lx, lz);
    return new THREE.Vector3(w.x, this.frame.y + up, w.z);
  }

  /** Where a sawn board lands, at the cut end of the sawhorse (the `n`th of a few). */
  boardOut(n: number, out: THREE.Vector3) {
    return this.horse.localToWorld(out.set(((n % 3) - 1) * 0.3, 0.05 + Math.floor(n / 3) * 0.08, CUT_Z + 0.5));
  }
  /** The top of the sawhorse's beam (where a log lies to be sawn). */
  get benchTop() { return HORSE_TOP; }

  get standing() { return Object.values(this.parts).every((p) => p.state === 'built'); }

  private show() {
    const built = this.standing;
    this.pile.visible = this.stack.visible = built;
    (this.stack.geometry as THREE.InstancedBufferGeometry).setDrawRange(0, (2 + this.stock) * this.boardVerts);
    (this.pile.geometry as THREE.InstancedBufferGeometry).setDrawRange(0, this.logs * this.pileVerts);
    this.pile.visible = built && this.logs > 0;
  }

  private save() { try { localStorage.setItem(this.key, JSON.stringify({ logs: this.logs, stock: this.stock })); } catch { /* ignore */ } }

  /** A log on the pile (from a villager's head), or one off it (to the sawhorse). */
  addLog() { this.logs = Math.min(LOGS, this.logs + 1); this.dirty = true; this.show(); }
  takeLog() { if (this.logs <= 0) return false; this.logs--; this.dirty = true; this.show(); return true; }
  /** Boards on to the stack (what doesn't fit is stacked by nobody: it's left out). */
  addBoards(n: number) { this.stock = Math.min(CAP, this.stock + n); this.dirty = true; this.show(); }
  takeBoards(n: number) { const k = Math.min(n, this.stock); this.stock -= k; this.dirty = true; this.show(); return k; }

  // ------------------------------------------------------------ Buildable

  slotPos(p: Part, i: number, out: THREE.Vector3) {
    const off = (i - (p.need - 1) / 2) * 0.72;
    this.root.localToWorld(out.copy(p.slotAt));
    return out.addScaledVector(this.camRight, off);
  }
  showSketch(id: PartId) { const p = this.parts[id as MillPartId]; if (p.state === 'broken') p.state = 'sketch'; }
  fill(id: PartId) { return fillPart(this.parts[id as MillPartId]); }
  setBuilt(id: PartId) { setPartBuilt(this.parts[id as MillPartId]); this.show(); }
  setFilled(id: PartId, n: number) { setPartFilled(this.parts[id as MillPartId], n); }
  remaining(id: PartId) { const p = this.parts[id as MillPartId]; return p.state === 'built' ? 0 : p.need - p.filled; }
  near(_parts: PartId[], pos: THREE.Vector3) {
    const l = siteToLocal(this.frame, pos.x, pos.z);
    return Math.abs(l.x) < MILL.W / 2 + 3.5 && l.z > -MILL.D / 2 - 2 && l.z < MILL.D / 2 + 6;
  }

  // ------------------------------------------------------------ frame

  /**
   * `pos`: where you are; `give(n)` puts wood in your pack (the stack is yours, unless it's `kept` for the wagon).
   * Returns how many boards it gave.
   */
  update(dt: number, cam: THREE.Vector3, pos: THREE.Vector3, kept: boolean, give: (n: number) => void) {
    this.t += dt;
    const cx = cam.x - this.frame.x, cz = cam.z - this.frame.z, cl = Math.hypot(cx, cz) || 1;
    this.camRight.set(cz / cl, 0, -cx / cl);
    for (const p of Object.values(this.parts)) if (tickPart(p, dt, this.t, (i, out) => this.slotPos(p, i, out))) this.burst(p);
    let gave = 0;
    if (this.standing && !kept && this.stock > 0 && Math.hypot(pos.x - this.stackAt.x, pos.z - this.stackAt.z) < REACH && Math.abs(pos.y - this.frame.y) < 3) {
      this.takeT += dt * RATE;
      while (this.takeT >= 1 && this.stock > 0) { this.takeT -= 1; this.stock--; gave++; }
      if (gave) { give(gave); this.sfx?.pickup(); this.dirty = true; this.show(); }
    } else this.takeT = 0;
    if (this.dirty && (this.saveT -= dt) <= 0) { this.saveT = 1; this.dirty = false; this.save(); }
    return gave;
  }

  /** Dust where a finished part snaps in; once the roof's on, the pile and the stack are there. */
  private burst(p: Part) {
    this.puffs(p.centre, 10, 0.3, 3.4);
    const v = new THREE.Vector3();
    for (let i = 0; i < 6; i++) { v.copy(p.centre).add(new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 3)); this.puffs(v, 3, 0.18, 1.6); }
    this.show();
  }

  // ------------------------------------------------------------ collision

  /** Push a body circle out of the posts, the back wall, the pile and the stack. */
  push(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    const l = siteToLocal(this.frame, pos.x, pos.z);
    const { W, D } = MILL, hw = W / 2, hd = D / 2;
    if (Math.abs(l.x) > hw + 4 || Math.abs(l.z) > hd + 3) return;
    if (pos.y - this.frame.y > 3) return;
    const boxes: [number, number, number, number][] = [];
    if (this.parts.mframe.state === 'built') {
      for (const x of [-hw, 0, hw]) boxes.push([x, hd, 0.16, 0.16]);
      boxes.push([0, -hd, hw + 0.15, 0.12]);
    }
    if (this.standing) { boxes.push([-hw - 1.1, 0, 1.05, 0.6], [hw + 1.2, 0, 0.8, 0.8]); }
    const c = Math.cos(this.frame.rot), s = Math.sin(this.frame.rot);
    for (const [bx, bz, hx, hz] of boxes) {
      const lx = l.x - bx, lz = l.z - bz;
      const qx = Math.max(-hx, Math.min(hx, lx)), qz = Math.max(-hz, Math.min(hz, lz));
      let nx = lx - qx, nz = lz - qz;
      const d = Math.hypot(nx, nz);
      if (d >= r) continue;
      let depth: number;
      if (d > 1e-4) { nx /= d; nz /= d; depth = r - d; }
      else { const px = hx - Math.abs(lx), pz = hz - Math.abs(lz); if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; depth = px + r; } else { nx = 0; nz = Math.sign(lz) || 1; depth = pz + r; } }
      l.x += nx * depth;
      l.z += nz * depth;
      const wx = c * nx + s * nz, wz = -s * nx + c * nz;
      const w = siteLocal(this.frame, l.x, l.z);
      pos.x = w.x;
      pos.z = w.z;
      const vn = vel.x * wx + vel.z * wz;
      if (vn < 0) { vel.x -= wx * vn; vel.z -= wz * vn; }
    }
  }

  dispose() { this.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); }
}
