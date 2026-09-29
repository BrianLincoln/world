import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/rng';
import { RUIN_D, RUIN_W } from '../world/storySite';

// Meshes for the story set, drawn with the prop shader (kinds index the
// shared palette, see PROP_FRAG): the broken start cabin in parts that can be
// swapped between broken / sketched / repaired, and the small props (axe,
// logs, stumps, stones). All geometry is local, y = 0 on the cabin pad.

export const K = { foliage: 0, trunk: 1, rock: 2, wall: 7, roof: 8, trim: 9, glass: 10, door: 11, stone: 12, wood: 13, cut: 17, steel: 18, soot: 19, ember: 20, boards: 21 } as const;

/** Cabin measurements (local): floor, wall top, ridge rise, eave overhangs. */
export const CAB = {
  W: RUIN_W, D: RUIN_D, floor: 0.3, wallTop: 2.8, rise: 2.2, over: 0.45, overXL: 0.35, overXR: 0.1, thick: 0.16,
  door: { x0: -1.4, x1: -0.4, y0: 0.3, y1: 2.35 },
  chimney: { x: RUIN_W / 2 + 0.62, z: -0.3, size: 0.9, top: 5.95, course: 0.28, broken: 5 },
  hearth: { x: RUIN_W / 2 - 0.16, z: -0.3 },
} as const;

function core(g: THREE.BufferGeometry, kind: number): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal') out.deleteAttribute(k);
  if (!out.getAttribute('normal')) out.computeVertexNormals();
  out.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(out.attributes.position.count).fill(kind), 1));
  return out;
}

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts.filter((p) => p.attributes.position.count > 0));
  if (!g) throw new Error('story geometry merge failed');
  g.computeBoundingSphere();
  return g;
}

const e = new THREE.Euler();
const m4 = new THREE.Matrix4();
/** Box of `kind` centred at (x, y, z), rotated (rx, ry, rz). */
export function kbox(w: number, h: number, d: number, x: number, y: number, z: number, kind: number, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx || ry || rz) g.applyMatrix4(m4.makeRotationFromEuler(e.set(rx, ry, rz)));
  g.translate(x, y, z);
  return core(g, kind);
}

function rbox(w: number, h: number, d: number, r: number, x: number, y: number, z: number, kind: number, ry = 0) {
  const g = new RoundedBoxGeometry(w, h, d, 2, r);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return core(g, kind);
}

// ---------------------------------------------------------------- walls

type Hole = [number, number, number, number]; // x0, x1, y0, y1 (wall-local)

/**
 * A wall panel along x (from -len/2 to len/2, y from 0 to h) with
 * rectangular openings, as a red clapboard skin outside (+z) and bare wood
 * inside. Solid regions are cut into boxes around the holes.
 */
function panel(len: number, h: number, holes: Hole[], thick: number): THREE.BufferGeometry[] {
  const xs = new Set<number>([-len / 2, len / 2]);
  for (const [x0, x1] of holes) { xs.add(x0); xs.add(x1); }
  const sx = [...xs].sort((a, b) => a - b);
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i + 1 < sx.length; i++) {
    const xa = sx[i], xb = sx[i + 1];
    if (xb - xa < 1e-4) continue;
    const cover = holes.filter(([x0, x1]) => x0 <= xa + 1e-4 && x1 >= xb - 1e-4).map(([, , y0, y1]) => [y0, y1]).sort((a, b) => a[0] - b[0]);
    let y = 0;
    const fill = (y0: number, y1: number) => {
      if (y1 - y0 < 1e-4) return;
      out.push(kbox(xb - xa, y1 - y0, thick / 2, (xa + xb) / 2, (y0 + y1) / 2, thick / 4, K.wall));
      out.push(kbox(xb - xa, y1 - y0, thick / 2, (xa + xb) / 2, (y0 + y1) / 2, -thick / 4, K.wood));
    };
    for (const [y0, y1] of cover) { fill(y, y0); y = Math.max(y, y1); }
    fill(y, h);
  }
  return out;
}

/** Trimmed window: cream frame, dark glass (glows when lit), a cross mullion. */
function windowParts(w: number, h: number, thick: number): THREE.BufferGeometry[] {
  const t = 0.1;
  const z = thick / 2 + 0.02;
  return [
    kbox(w + t * 2, t, 0.06, 0, h / 2 + t / 2, z, K.trim),
    kbox(w + t * 2, t * 1.4, 0.09, 0, -h / 2 - t * 0.7, z + 0.02, K.trim),
    kbox(t, h, 0.06, -w / 2 - t / 2, 0, z, K.trim),
    kbox(t, h, 0.06, w / 2 + t / 2, 0, z, K.trim),
    kbox(w, h, 0.04, 0, 0, 0, K.glass),
    kbox(0.06, h, 0.07, 0, 0, 0.01, K.trim),
    kbox(w, 0.06, 0.07, 0, 0.02, 0.01, K.trim),
  ];
}

function place(parts: THREE.BufferGeometry[], ry: number, x: number, y: number, z: number): THREE.BufferGeometry[] {
  for (const p of parts) {
    if (ry) p.rotateY(ry);
    p.translate(x, y, z);
  }
  return parts;
}

function gable(len: number, rise: number, thick: number, kind: number, z: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0);
  s.lineTo(len / 2, 0);
  s.lineTo(0, rise);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.translate(0, 0, z);
  return core(g, kind);
}

export interface CabinParts {
  /** Always there: footing, floor, walls, trims, windows (by side for the cutaway). */
  front: THREE.BufferGeometry;
  back: THREE.BufferGeometry;
  left: THREE.BufferGeometry;
  right: THREE.BufferGeometry;
  /** Roof boards that survived, rafters, ridge, bargeboards. */
  roof: THREE.BufferGeometry;
  /** The missing boards (the roof repair). */
  roofPatch: THREE.BufferGeometry;
  /** Chimney: the crumbled stump, the missing stack (repair) and rubble on the ground. */
  chimneyBase: THREE.BufferGeometry;
  chimneyTop: THREE.BufferGeometry;
  rubble: THREE.BufferGeometry;
  /** Plain-box versions used for the dashed sketch outlines. */
  roofSketch: THREE.BufferGeometry;
  chimneySketch: THREE.BufferGeometry;
  hearth: THREE.BufferGeometry;
  coldAsh: THREE.BufferGeometry;
  /** Door leaf, pivot at its hinge edge (local x = 0 there, bottom y = 0). */
  door: THREE.BufferGeometry;
  doorSketch: THREE.BufferGeometry;
  debris: THREE.BufferGeometry;
}

export function buildRuin(): CabinParts {
  const { W, D, floor, wallTop, rise, over, overXL, overXR, thick } = CAB;
  const H = wallTop - floor;
  const dr = CAB.door;
  const rnd = mulberry32(4242);

  // --- walls, by side
  const front: THREE.BufferGeometry[] = [];
  const frontWin: Hole = [1.2, 2.2, 1.15 - floor, 2.1 - floor];
  front.push(...place(panel(W, H, [[dr.x0, dr.x1, 0, dr.y1 - floor], frontWin], thick), 0, 0, floor, D / 2 - thick / 2));
  front.push(...place(windowParts(1.0, 0.95, thick), 0, 1.7, (frontWin[2] + frontWin[3]) / 2 + floor, D / 2 - thick / 2));
  // Door frame and a stone step.
  const fz = D / 2 + 0.02;
  front.push(kbox(0.11, dr.y1 - floor + 0.1, 0.07, dr.x0 - 0.055, (dr.y1 + floor) / 2 + 0.05, fz, K.trim));
  front.push(kbox(0.11, dr.y1 - floor + 0.1, 0.07, dr.x1 + 0.055, (dr.y1 + floor) / 2 + 0.05, fz, K.trim));
  front.push(kbox(dr.x1 - dr.x0 + 0.34, 0.13, 0.1, (dr.x0 + dr.x1) / 2, dr.y1 + 0.1, fz + 0.01, K.trim));
  front.push(rbox(1.5, 0.22, 0.75, 0.06, (dr.x0 + dr.x1) / 2, 0.1, D / 2 + 0.45, K.stone));

  const back: THREE.BufferGeometry[] = [];
  const bw1: Hole = [-2.1, -1.1, 1.15 - floor, 2.1 - floor];
  const bw2: Hole = [0.9, 1.9, 1.15 - floor, 2.1 - floor];
  // Back wall: built facing +z then turned round, so its hole x is mirrored.
  back.push(...place([...panel(W, H, [[-bw2[1], -bw2[0], bw2[2], bw2[3]], [-bw1[1], -bw1[0], bw1[2], bw1[3]]], thick)], Math.PI, 0, floor, -D / 2 + thick / 2));
  back.push(...place(windowParts(1.0, 0.95, thick), Math.PI, -1.6, 1.625, -D / 2 + thick / 2));
  back.push(...place(windowParts(1.0, 0.95, thick), Math.PI, 1.4, 1.625, -D / 2 + thick / 2));

  const gl = D - thick * 2;
  const left: THREE.BufferGeometry[] = [];
  const lw: Hole = [-0.5, 0.5, 1.15 - floor, 2.1 - floor];
  left.push(...place(panel(gl, H, [lw], thick), -Math.PI / 2, -W / 2 + thick / 2, floor, 0));
  left.push(...place(windowParts(1.0, 0.95, thick), -Math.PI / 2, -W / 2 + thick / 2, 1.625, 0));
  left.push(...place([gable(D, rise, thick / 2, K.wall, 0), gable(D, rise, thick / 2, K.wood, -thick / 2)], -Math.PI / 2, -W / 2 + thick / 2, wallTop, 0));
  left.push(...place(windowParts(0.5, 0.5, thick), -Math.PI / 2, -W / 2 + thick / 2 - 0.01, wallTop + 0.75, 0));

  const right: THREE.BufferGeometry[] = [];
  right.push(...place(panel(gl, H, [], thick), Math.PI / 2, W / 2 - thick / 2, floor, 0));
  right.push(...place([gable(D, rise, thick / 2, K.wall, 0), gable(D, rise, thick / 2, K.wood, -thick / 2)], Math.PI / 2, W / 2 - thick / 2, wallTop, 0));

  // Corner trims, stone footing and the floor go with the side walls.
  for (const [sx, arr] of [[-1, left], [1, right]] as const) {
    for (const sz of [-1, 1]) arr.push(kbox(0.2, H + 0.05, 0.2, sx * (W / 2 + 0.02), floor + H / 2, sz * (D / 2 + 0.02), K.trim));
  }
  const footing = (arr: THREE.BufferGeometry[], w: number, d: number, x: number, z: number) => arr.push(kbox(w, 0.36, d, x, 0.12, z, K.stone));
  footing(front, W + 0.32, 0.3, 0, D / 2 + 0.01);
  footing(back, W + 0.32, 0.3, 0, -D / 2 - 0.01);
  footing(left, 0.3, D, -W / 2 - 0.01, 0);
  footing(right, 0.3, D, W / 2 + 0.01, 0);
  left.push(kbox(W - 0.1, 0.08, D - 0.1, 0, floor - 0.04, 0, K.wood));

  // --- roof: board courses parallel to the ridge on both slopes
  const theta = Math.atan2(rise, D / 2);
  const ct = Math.cos(theta), st = Math.sin(theta);
  const Ls = (D / 2 + over) / ct;
  const bw = 0.42;
  const courses = Math.ceil(Ls / bw);
  const x0 = -W / 2 - overXL, x1 = W / 2 + overXR;
  const roof: THREE.BufferGeometry[] = [];
  const patch: THREE.BufferGeometry[] = [];
  const sketch: THREE.BufferGeometry[] = [];
  // Missing boards: [slope (+1 front / -1 back), course from the eave, segment].
  const holes = new Set(['1:2:1', '1:3:1', '1:4:1', '1:3:2', '1:5:1', '1:4:0', '-1:3:0', '-1:4:0', '-1:5:0']);
  for (const sg of [1, -1]) {
    for (let c = 0; c < courses; c++) {
      const s = Ls - (c + 0.5) * bw; // along-slope distance from the ridge
      const cz = sg * s * ct + sg * st * 0.05;
      const cy = wallTop + rise - s * st + ct * 0.05;
      // Three boards per course, staggered.
      const a = x0 + (x1 - x0) * (0.3 + (rnd() - 0.5) * 0.12);
      const b = x0 + (x1 - x0) * (0.66 + (rnd() - 0.5) * 0.12);
      const cuts = [x0, a, b, x1];
      for (let k = 0; k < 3; k++) {
        const l = cuts[k + 1] - cuts[k] - 0.015;
        const mx = (cuts[k] + cuts[k + 1]) / 2;
        const tilt = (rnd() - 0.5) * 0.02;
        const lift = (rnd() - 0.5) * 0.012;
        const board = kbox(l, 0.075, bw + 0.05, mx, cy + lift, cz, K.boards, sg * theta, 0, tilt);
        if (holes.has(`${sg}:${c}:${k}`)) {
          patch.push(board);
          sketch.push(kbox(l, 0.075, bw + 0.02, mx, cy + 0.02, cz, K.boards, sg * theta));
        } else roof.push(board);
      }
    }
    // Rafters under the boards (seen through the holes and from inside).
    for (const rx of [-W / 2 + 0.25, -W / 6, W / 6, W / 2 - 0.25]) {
      roof.push(kbox(0.1, 0.15, Ls, rx, wallTop + rise - (Ls / 2) * st - ct * 0.09, sg * (Ls / 2) * ct - st * 0.09 * sg, K.wood, sg * theta));
    }
    // Bargeboards along the gable edges.
    for (const bx of [x0 - 0.02, x1 + 0.02]) {
      roof.push(kbox(0.06, 0.22, Ls + 0.05, bx, wallTop + rise - (Ls / 2) * st + 0.03, sg * (Ls / 2) * ct, K.trim, sg * theta));
    }
  }
  roof.push(kbox(x1 - x0 + 0.1, 0.13, 0.3, (x0 + x1) / 2, wallTop + rise + 0.1, 0, K.boards));
  roof.push(kbox(W - 0.3, 0.14, 0.14, 0, wallTop + rise - 0.12, 0, K.wood)); // ridge beam

  // --- chimney: courses of rounded stones on the +x gable, outside
  const ch = CAB.chimney;
  const base: THREE.BufferGeometry[] = [];
  const top: THREE.BufferGeometry[] = [];
  const csk: THREE.BufferGeometry[] = [];
  const nC = Math.ceil(ch.top / ch.course);
  for (let c = 0; c < nC; c++) {
    const y = c * ch.course + ch.course / 2;
    const s = c > nC - 6 ? ch.size * 0.88 : ch.size;
    const turn = c % 2 ? Math.PI / 2 : 0;
    for (let k = 0; k < 2; k++) {
      // The crumbled edge: the top surviving course has lost one stone.
      const missing = c >= ch.broken || (c === ch.broken - 1 && k === 1);
      const off = (k - 0.5) * (s / 2);
      const ox = turn ? off : 0, oz = turn ? 0 : off;
      const jit = () => (rnd() - 0.5) * 0.03;
      const kind = rnd() < 0.45 ? K.rock : K.stone;
      const w = s + jit() * 2, d = s / 2 - 0.02 + jit(), hh = ch.course * (0.92 + rnd() * 0.08);
      const stone = rbox(w, hh, d, 0.07, 0, 0, 0, kind, turn);
      stone.translate(ch.x + ox + jit(), y, ch.z + oz + jit());
      (missing ? top : base).push(stone);
      if (missing) csk.push(kbox(turn ? d : w, ch.course * 0.94, turn ? w : d, ch.x + ox, y, ch.z + oz, K.stone));
    }
  }
  // Cap slab and flue.
  top.push(rbox(ch.size + 0.16, 0.12, ch.size + 0.16, 0.04, ch.x, ch.top + 0.06, ch.z, K.stone));
  top.push(kbox(0.42, 0.04, 0.42, ch.x, ch.top + 0.12, ch.z, K.soot));
  csk.push(kbox(ch.size + 0.16, 0.12, ch.size + 0.16, ch.x, ch.top + 0.06, ch.z, K.stone));
  // Rubble at the foot of the chimney.
  const rubble: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI - Math.PI / 2;
    const r = 0.9 + rnd() * 0.9;
    const g = rbox(0.42 + rnd() * 0.15, 0.22, 0.3 + rnd() * 0.1, 0.07, 0, 0, 0, rnd() < 0.5 ? K.rock : K.stone, rnd() * 3);
    g.rotateZ((rnd() - 0.5) * 0.5);
    g.translate(ch.x + 0.3 + Math.cos(a) * r, 0.08, ch.z + Math.sin(a) * r);
    rubble.push(g);
  }

  // --- hearth inside against the +x wall: stone firebox, mantel, flue
  const hx = CAB.hearth.x, hz = CAB.hearth.z;
  const hearth: THREE.BufferGeometry[] = [];
  const hd = 0.72; // depth into the room
  const fx = hx - hd; // front face
  for (let c = 0; c < 4; c++) {
    const y = floor + 0.14 + c * 0.26;
    for (let k = 0; k < 3; k++) {
      const zz = hz + (k - 1) * 0.48 + (c % 2 ? 0.12 : -0.12);
      // Leave the firebox opening in the middle of the lower courses.
      if (c < 2 && k === 1) continue;
      hearth.push(rbox(hd, 0.25, 0.46, 0.06, hx - hd / 2, y, Math.max(hz - 0.72, Math.min(hz + 0.72, zz)), rnd() < 0.5 ? K.rock : K.stone));
    }
  }
  hearth.push(kbox(0.1, 0.5, 0.62, hx - 0.08, floor + 0.28, hz, K.soot)); // firebox back
  hearth.push(kbox(hd - 0.1, 0.04, 0.62, hx - hd / 2, floor + 0.02, hz, K.soot)); // firebox floor
  hearth.push(kbox(0.2, 0.16, 1.7, fx - 0.02, floor + 1.14, hz, K.wood)); // mantel
  hearth.push(rbox(0.7, 0.06, 1.8, 0.02, fx - 0.3, floor + 0.03, hz, K.stone)); // hearth stone
  // Flue hood up to the roof.
  for (let c = 0; c < 12; c++) {
    const y = floor + 1.36 + c * 0.26;
    hearth.push(rbox(0.48, 0.25, 0.92 - (c % 2) * 0.04, 0.05, hx - 0.26, y, hz, rnd() < 0.5 ? K.rock : K.stone));
  }
  const ash: THREE.BufferGeometry[] = [];
  const ashPile = new THREE.SphereGeometry(0.26, 14, 8);
  ashPile.scale(1, 0.25, 1.3);
  ashPile.translate(hx - 0.36, floor + 0.05, hz);
  ash.push(core(ashPile, K.stone));
  for (const [dz, r] of [[-0.1, 0.5], [0.12, -0.4]]) {
    const log = new THREE.CylinderGeometry(0.06, 0.07, 0.48, 8);
    log.rotateX(Math.PI / 2);
    log.rotateY(r);
    log.translate(hx - 0.36, floor + 0.1, hz + dz);
    ash.push(core(log, K.soot));
  }

  // --- door leaf: vertical boards, a cream Z-brace, iron hinges
  const dw = dr.x1 - dr.x0 - 0.02, dh = dr.y1 - dr.y0 - 0.02;
  const door: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) door.push(kbox(dw / 3 - 0.012, dh - (k === 1 ? 0 : 0.02), 0.07, dw * (k + 0.5) / 3, dh / 2, 0, K.door));
  door.push(kbox(dw - 0.1, 0.12, 0.04, dw / 2, dh * 0.2, 0.05, K.trim));
  door.push(kbox(dw - 0.1, 0.12, 0.04, dw / 2, dh * 0.8, 0.05, K.trim));
  const diag = Math.hypot(dw - 0.2, dh * 0.6);
  door.push(kbox(0.11, diag, 0.04, dw / 2, dh / 2, 0.05, K.trim, 0, 0, Math.atan2(dw - 0.2, dh * 0.6)));
  door.push(kbox(0.32, 0.06, 0.05, 0.14, dh * 0.2, 0.06, K.soot));
  door.push(kbox(0.32, 0.06, 0.05, 0.14, dh * 0.8, 0.06, K.soot));
  door.push(kbox(0.05, 0.05, 0.08, dw - 0.14, dh * 0.5, 0.07, K.soot));
  const doorSketch = merge([kbox(dw, dh, 0.07, dw / 2, dh / 2, 0, K.door), kbox(dw - 0.1, 0.12, 0.04, dw / 2, dh * 0.2, 0.05, K.trim), kbox(dw - 0.1, 0.12, 0.04, dw / 2, dh * 0.8, 0.05, K.trim)]);

  // Fallen boards lying in the grass by the front wall.
  const debris: THREE.BufferGeometry[] = [];
  debris.push(kbox(1.6, 0.07, 0.44, 2.4, 0.05, D / 2 + 1.1, K.boards, 0.05, 0.4, 0.03));
  debris.push(kbox(1.2, 0.07, 0.44, 1.2, 0.09, D / 2 + 1.5, K.boards, -0.12, -0.7, 0.1));

  return {
    front: merge(front), back: merge(back), left: merge(left), right: merge(right),
    roof: merge(roof), roofPatch: merge(patch), roofSketch: merge(sketch),
    chimneyBase: merge(base), chimneyTop: merge(top), chimneySketch: merge(csk), rubble: merge(rubble),
    hearth: merge(hearth), coldAsh: merge(ash), door: merge(door), doorSketch, debris: merge(debris),
  };
}

// ---------------------------------------------------------------- props

/** A felling axe: cut-wood handle with a curve, steel head, bright edge. Handle base at the origin, along +y. */
export function buildAxe(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const handle = new THREE.CylinderGeometry(0.028, 0.036, 0.82, 10, 4);
  handle.translate(0, 0.41, 0);
  parts.push(core(handle, K.cut));
  parts.push(core(new THREE.SphereGeometry(0.045, 10, 8).translate(0, 0.0, 0), K.cut));
  // Head: a wedge, blade toward +x.
  const s = new THREE.Shape();
  s.moveTo(-0.05, -0.05);
  s.lineTo(0.05, -0.04);
  s.quadraticCurveTo(0.14, -0.09, 0.2, -0.12);
  s.quadraticCurveTo(0.24, 0.0, 0.2, 0.12);
  s.quadraticCurveTo(0.14, 0.08, 0.05, 0.05);
  s.lineTo(-0.05, 0.05);
  s.closePath();
  const head = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 8 });
  head.translate(0, 0, -0.025);
  head.translate(0, 0.76, 0);
  parts.push(core(head, K.steel));
  return merge(parts);
}

/** A cut log: bark barrel with pale ringed ends. Centred, along x. */
export function buildLog(): THREE.BufferGeometry {
  const L = 1.0, r = 0.15;
  const bark = new THREE.CylinderGeometry(r, r * 1.05, L, 12, 1, true);
  bark.rotateZ(Math.PI / 2);
  const cap = (x: number) => {
    const c = new THREE.CircleGeometry(r * 0.98, 12);
    c.rotateY(x > 0 ? Math.PI / 2 : -Math.PI / 2);
    c.translate(x, 0, 0);
    return core(c, K.cut);
  };
  // A stub of a cut branch for character.
  const knot = new THREE.CylinderGeometry(0.035, 0.045, 0.1, 6);
  knot.rotateX(0.5);
  knot.translate(0.18, 0.02, 0.14);
  return merge([core(bark, K.trunk), cap(L / 2), cap(-L / 2), core(knot, K.trunk)]);
}

/** What's left after felling: a short trunk with a pale cut top. */
export function buildStump(): THREE.BufferGeometry {
  const bark = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 12, 1, true);
  bark.translate(0, 0.2, 0);
  const top = new THREE.CircleGeometry(0.3, 12);
  top.rotateX(-Math.PI / 2);
  top.translate(0, 0.45, 0);
  const roots: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.ConeGeometry(0.12, 0.5, 6);
    g.rotateZ(Math.PI / 2 - 0.35);
    g.translate(0.36, 0.02, 0);
    g.rotateY((i / 4) * Math.PI * 2 + 0.4);
    roots.push(core(g, K.trunk));
  }
  return merge([core(bark, K.trunk), core(top, K.cut), ...roots]);
}

/** The chopping stump by the cabin, a little wider, with an old cut-mark. */
export function buildBlock(): THREE.BufferGeometry {
  const bark = new THREE.CylinderGeometry(0.38, 0.45, 0.55, 14, 1, true);
  bark.translate(0, 0.275, 0);
  const top = new THREE.CircleGeometry(0.38, 14);
  top.rotateX(-Math.PI / 2);
  top.translate(0, 0.55, 0);
  const notch = kbox(0.4, 0.02, 0.03, 0.02, 0.555, 0.05, K.trunk, 0, 0.5, 0);
  return merge([core(bark, K.trunk), core(top, K.cut), notch]);
}

/** A river stone you can carry: a smooth pebble, flatter than the boulders. */
export function buildPebble(seed: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position as THREE.BufferAttribute;
  const sx = 0.26 + rnd() * 0.06, sy = 0.15 + rnd() * 0.04, sz = 0.2 + rnd() * 0.05;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const bump = 1 + 0.06 * Math.sin(v.x * 3.1 + v.z * 2.3 + seed);
    p.setXYZ(i, v.x * sx * bump, Math.max(v.y, -0.55) * sy, v.z * sz * bump);
  }
  g.computeVertexNormals();
  g.translate(0, sy * 0.5, 0);
  return core(g, K.stone);
}
