import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mulberry32 } from '../core/rng';
import { PASTURE_D, PASTURE_W } from '../world/storySite';
import { core, gable, K, kbox, merge } from './geometry';

// Meshes for the stable and its pasture fence (phase 3), drawn with the prop
// shader like the cabin. The stable is a small open-fronted timber shed:
// three stalls under a deep-eaved turf roof, hay racks on the back wall, a
// stone trough out front and a tally board on the end wall that fills with
// a mark for every creature that comes to live here. Stable-local: x
// across the front, +z out of the open front, y = 0 on the ground at its
// centre. The fence is pasture-local (see storySite.ts: +z is the gate side).

/** Stable measurements (stable-local). */
export const STB = {
  W: 9, D: 5, sill: 0.28, eave: 2.7, rise: 1.8,
  /** Roof overhangs: front (over the stalls), back, gable ends. */
  overF: 1.05, overB: 0.45, overS: 0.45,
  /** Post lines across the front: the stall dividers are the inner two. */
  posts: [-4.5, -1.5, 1.5, 4.5],
  /** Where the trough stands, out in front of the right-hand stall. */
  trough: { x: 3.0, z: 4.35 },
} as const;

/** How many creatures the stable houses: the tally board's marks. */
export const TALLY = 20;
/** Vertices per tally mark (one box each). */
export const TALLY_VERTS = 36;

/** The gate: its half-width, centred on the pasture's +z side. */
export const GATE_HW = 1.6;

const e = new THREE.Euler();
const m4 = new THREE.Matrix4();

/** Rounded box of `kind`, rotated (rx, ry, rz), centred at (x, y, z). */
function rb(w: number, h: number, d: number, r: number, x: number, y: number, z: number, kind: number, rx = 0, ry = 0, rz = 0) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  if (rx || ry || rz) g.applyMatrix4(m4.makeRotationFromEuler(e.set(rx, ry, rz)));
  g.translate(x, y, z);
  return core(g, kind);
}

function blob(r: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, kind: number, ry = 0) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  g.scale(sx, sy, sz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return core(g, kind);
}

export interface StableGeo {
  footing: THREE.BufferGeometry;
  footingSketch: THREE.BufferGeometry;
  frame: THREE.BufferGeometry;
  frameSketch: THREE.BufferGeometry;
  roof: THREE.BufferGeometry;
  roofSketch: THREE.BufferGeometry;
  /** The tally board's carved grooves (always there once the frame is up). */
  tallyCarved: THREE.BufferGeometry;
  /** Its painted marks, in order: draw the first n. */
  tallyPaint: THREE.BufferGeometry;
}

/** `end`: which gable faces the pasture's gate side (+1: the stable's +x end). */
export function buildStable(end: 1 | -1): StableGeo {
  const { W, D, sill, eave, rise, overF, overB, overS } = STB;
  const hw = W / 2, hd = D / 2;
  const rnd = mulberry32(5150);

  // --- footing: rounded stones under the back and side walls, pads under
  // the front posts, and the stone trough out front.
  const footing: THREE.BufferGeometry[] = [];
  const fSketch: THREE.BufferGeometry[] = [];
  const stones = (x0: number, z0: number, x1: number, z1: number) => {
    const L = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(-(z1 - z0), x1 - x0);
    let s = 0;
    while (s < L - 0.05) {
      const l = Math.min(L - s, 0.5 + rnd() * 0.35);
      const t = (s + l / 2) / L;
      const kind = rnd() < 0.45 ? K.rock : K.stone;
      footing.push(rb(l - 0.03, 0.56 + rnd() * 0.06, 0.44 + rnd() * 0.06, 0.1, x0 + (x1 - x0) * t, sill - 0.29, z0 + (z1 - z0) * t, kind, 0, ry + (rnd() - 0.5) * 0.06));
      s += l;
    }
    fSketch.push(kbox(L, 0.56, 0.46, (x0 + x1) / 2, sill - 0.28, (z0 + z1) / 2, K.stone, 0, ry));
  };
  stones(-hw - 0.1, -hd, hw + 0.1, -hd);
  stones(-hw, -hd + 0.25, -hw, hd + 0.1);
  stones(hw, -hd + 0.25, hw, hd + 0.1);
  for (const x of STB.posts.slice(1, 3)) {
    footing.push(rb(0.5, 0.56, 0.5, 0.1, x, sill - 0.28, hd - 0.12, K.stone, 0, rnd()));
    fSketch.push(kbox(0.5, 0.56, 0.5, x, sill - 0.28, hd - 0.12, K.stone));
  }
  // The trough: a long stone basin with water in it.
  {
    const { x, z } = STB.trough;
    const tl = 1.9, tw = 0.78, th = 0.62, t = 0.16;
    footing.push(rb(tl, 0.2, tw, 0.06, x, 0.02, z, K.stone));
    footing.push(rb(tl, th, t, 0.06, x, th / 2 - 0.08, z - tw / 2 + t / 2, K.rock));
    footing.push(rb(tl, th, t, 0.06, x, th / 2 - 0.08, z + tw / 2 - t / 2, K.stone));
    footing.push(rb(t, th, tw - 0.1, 0.06, x - tl / 2 + t / 2, th / 2 - 0.08, z, K.stone));
    footing.push(rb(t, th, tw - 0.1, 0.06, x + tl / 2 - t / 2, th / 2 - 0.08, z, K.rock));
    footing.push(kbox(tl - t * 2, 0.04, tw - t * 2, x, th - 0.2, z, K.steel));
    fSketch.push(kbox(tl, th, tw, x, th / 2 - 0.08, z, K.stone));
  }

  // --- frame: posts, plates and tie beams, the back and gable walls, the
  // stall partitions, hay racks and straw.
  const frame: THREE.BufferGeometry[] = [];
  const kSketch: THREE.BufferGeometry[] = [];
  const H = eave - sill;
  for (const x of STB.posts) {
    for (const z of [hd - 0.12, -hd + 0.12]) {
      frame.push(rb(0.24, H, 0.24, 0.04, x, sill + H / 2, z, K.trunk, 0, (rnd() - 0.5) * 0.04));
      kSketch.push(kbox(0.24, H, 0.24, x, sill + H / 2, z, K.trunk));
    }
    frame.push(kbox(0.2, 0.2, D, x, eave - 0.1, 0, K.trunk)); // tie beam
  }
  for (const z of [hd - 0.12, -hd + 0.12]) frame.push(kbox(W + 0.3, 0.24, 0.26, 0, eave - 0.12, z, K.trunk));
  kSketch.push(kbox(W + 0.3, 0.24, 0.26, 0, eave - 0.12, hd - 0.12, K.trunk));
  // Board walls: the back and the two gable ends (with their triangles).
  const wh = eave - 0.24 - sill;
  frame.push(kbox(W - 0.2, wh, 0.1, 0, sill + wh / 2, -hd + 0.12, K.wood));
  kSketch.push(kbox(W, wh, 0.12, 0, sill + wh / 2, -hd + 0.12, K.wood));
  for (const sx of [-1, 1]) {
    frame.push(kbox(0.1, wh, D - 0.24, sx * (hw - 0.02), sill + wh / 2, 0, K.wood));
    kSketch.push(kbox(0.12, wh, D, sx * (hw - 0.02), sill + wh / 2, 0, K.wood));
    const g = gable(D + 0.1, rise, 0.1, K.wood, -0.05);
    g.rotateY(-Math.PI / 2);
    g.translate(sx * (hw - 0.02), eave, 0);
    frame.push(g);
    // A little heart cut in each gable, dark, like the cabin's attic vent.
    frame.push(blob(0.13, 1, 1.1, 0.35, sx * (hw + 0.035), eave + rise * 0.42, 0, K.soot, Math.PI / 2));
  }
  // Stall partitions: plank half-walls from the back wall, a rail on top.
  for (const x of STB.posts.slice(1, 3)) {
    const pl = D - 1.35;
    frame.push(kbox(0.08, 1.3, pl, x, sill + 0.65, -hd + pl / 2 + 0.1, K.wood));
    frame.push(kbox(0.13, 0.11, pl + 0.12, x, sill + 1.33, -hd + pl / 2 + 0.1, K.trunk));
    kSketch.push(kbox(0.1, 1.35, pl, x, sill + 0.66, -hd + pl / 2 + 0.1, K.wood));
  }
  // A hay rack on the back wall of each stall, and straw on the floor.
  for (const cx of [-3, 0, 3]) {
    frame.push(rb(1.7, 0.5, 0.5, 0.18, cx, 1.72, -hd + 0.44, K.cut, 0.15));
    for (let i = 0; i < 7; i++) frame.push(kbox(0.045, 0.62, 0.045, cx - 0.8 + i * (1.6 / 6), 1.7, -hd + 0.72, K.trunk, -0.15));
    frame.push(kbox(1.75, 0.07, 0.07, cx, 1.42, -hd + 0.62, K.trunk));
    frame.push(kbox(1.75, 0.07, 0.07, cx, 2.0, -hd + 0.78, K.trunk));
    for (let i = 0; i < 3; i++) frame.push(blob(0.5 + rnd() * 0.25, 1.4, 0.08, 1, cx + (rnd() - 0.5) * 1.4, 0.02, -hd + 0.9 + rnd() * 2.4, K.cut, rnd() * 3));
  }
  // The tally board on the gable end that faces the gate, at eye height.
  const tx = end * (hw + 0.1), ty = 1.55;
  frame.push(rb(0.07, 0.66, 2.3, 0.03, tx, ty, 0, K.trunk));
  for (const z of [-0.9, 0.9]) frame.push(kbox(0.03, 0.05, 0.05, tx + end * 0.04, ty + 0.24, z, K.soot));
  const carved: THREE.BufferGeometry[] = [];
  const paint: THREE.BufferGeometry[] = [];
  const xc = tx + end * 0.037, xp = tx + end * 0.042;
  for (let g = 0; g < TALLY / 5; g++) {
    // Read left to right from in front of the wall (that's -z when it faces +x).
    const gz = -0.96 + g * 0.52;
    for (let i = 0; i < 5; i++) {
      // Four uprights, then the fifth struck across them.
      const diag = i === 4;
      const z = -end * (diag ? gz + 0.12 : gz + i * 0.08);
      const rx = diag ? end * 1.05 : (rnd() - 0.5) * 0.08;
      const len = diag ? 0.4 : 0.32;
      carved.push(kbox(0.012, len, 0.03, xc, ty, z, K.soot, rx));
      paint.push(kbox(0.014, len, 0.046, xp, ty, z, K.trim, rx));
    }
  }

  // --- roof: rafters, a board deck and a thick turf on top, with crossed
  // bargeboards at the gables.
  const roof: THREE.BufferGeometry[] = [];
  const rSketch: THREE.BufferGeometry[] = [];
  const theta = Math.atan2(rise, hd);
  const ct = Math.cos(theta), st = Math.sin(theta);
  const ridgeY = eave + rise;
  const rw = W + overS * 2;
  for (const sg of [1, -1]) {
    const L = (hd + (sg > 0 ? overF : overB)) / ct;
    const along = (s: number, up: number) => [sg * (s * ct + up * st), ridgeY - s * st + up * ct] as const;
    // The deck, then the turf over it (thick, soft-edged, rolling a little over the eave).
    const [dz, dy] = along(L / 2, 0.04);
    roof.push(kbox(rw, 0.08, L, 0, dy, dz, K.boards, sg * theta));
    const [tz, ty] = along(L / 2 + 0.04, 0.24);
    roof.push(rb(rw + 0.12, 0.34, L + 0.14, 0.15, 0, ty, tz, K.moss, sg * theta));
    rSketch.push(kbox(rw, 0.4, L, 0, ty - 0.02, tz, K.moss, sg * theta));
    // Rafters under the deck (seen from inside the stalls).
    for (const x of [-hw + 0.3, -1.5, 1.5, hw - 0.3]) {
      const [az, ay] = along(L / 2, -0.08);
      roof.push(kbox(0.1, 0.16, L, x, ay, az, K.trunk, sg * theta));
    }
    // Bargeboards, running on past the ridge so the pair crosses there.
    for (const bx of [-rw / 2 - 0.03, rw / 2 + 0.03]) {
      const bl = L + 0.5;
      const [bz, byy] = along(L / 2 - 0.25, 0.3);
      roof.push(kbox(0.06, 0.24, bl, bx, byy, bz, K.trim, sg * theta));
    }
    // A few flowers growing in the turf.
    for (let i = 0; i < 5; i++) {
      const [pz, py] = along(0.6 + rnd() * (L - 1.2), 0.42);
      roof.push(blob(0.07, 1, 0.8, 1, (rnd() - 0.5) * (rw - 1), py, pz, 5));
    }
  }
  // The ridge: a rolled cap of turf.
  {
    const g = new THREE.CylinderGeometry(0.2, 0.2, rw + 0.1, 10);
    g.rotateZ(Math.PI / 2);
    g.scale(1, 0.75, 1);
    g.translate(0, ridgeY + 0.36, 0);
    roof.push(core(g, K.moss));
  }

  return {
    footing: merge(footing), footingSketch: merge(fSketch), frame: merge(frame), frameSketch: merge(kSketch),
    roof: merge(roof), roofSketch: merge(rSketch), tallyCarved: merge(carved), tallyPaint: merge(paint),
  };
}

export interface FenceGeo {
  fence: THREE.BufferGeometry;
  sketch: THREE.BufferGeometry;
  /** The gate leaf, hinge at the origin, closed along +x. */
  gate: THREE.BufferGeometry;
  /** Where the gate hangs (pasture-local, on the ground). */
  hinge: THREE.Vector3;
  /** Marker stakes at the corners (there until the fence goes up). */
  stakes: THREE.BufferGeometry;
  /** Fence post positions (pasture-local), for dust when it goes up. */
  posts: THREE.Vector3[];
}

/**
 * The split-rail fence round the pasture, on its ground plane (`ground` gives
 * the height at pasture-local x, z relative to the centre), with a gap for
 * the gate on the +z side and none behind the stable (its back wall closes
 * that stretch).
 */
export function buildFence(ground: (lx: number, lz: number) => number, end: 1 | -1): FenceGeo {
  const hw = PASTURE_W / 2, hd = PASTURE_D / 2;
  const sw = STB.W / 2 + 0.05;
  const rnd = mulberry32(6262);
  const fence: THREE.BufferGeometry[] = [];
  const sketch: THREE.BufferGeometry[] = [];
  const posts: THREE.Vector3[] = [];
  const post = (x: number, z: number, big = false) => {
    const y = ground(x, z);
    const h = big ? 1.6 : 1.3;
    const g = new THREE.CylinderGeometry(big ? 0.1 : 0.07, big ? 0.12 : 0.09, h, 7);
    g.rotateY(rnd() * 3);
    g.rotateZ((rnd() - 0.5) * 0.05);
    g.translate(x, y + h / 2 - 0.2, z);
    fence.push(core(g, K.trunk));
    if (big) fence.push(kbox(0.3, 0.06, 0.3, x, y + h - 0.17, z, K.trunk));
    sketch.push(kbox(0.16, h, 0.16, x, y + h / 2 - 0.2, z, K.trunk));
    posts.push(new THREE.Vector3(x, y, z));
  };
  const rail = (ax: number, az: number, bx: number, bz: number, up: number) => {
    const ya = ground(ax, az) + up, yb = ground(bx, bz) + up;
    const L = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(-(bz - az), bx - ax);
    const rz = Math.atan2(yb - ya, L);
    const g = kbox(L + 0.22, 0.1, 0.07, 0, 0, 0, K.bare);
    g.rotateZ(rz + (rnd() - 0.5) * 0.03);
    g.rotateY(ry);
    g.translate((ax + bx) / 2, (ya + yb) / 2, (az + bz) / 2);
    fence.push(g);
    const s = kbox(L, 0.1, 0.08, 0, 0, 0, K.bare);
    s.rotateZ(rz);
    s.rotateY(ry);
    s.translate((ax + bx) / 2, (ya + yb) / 2, (az + bz) / 2);
    sketch.push(s);
  };
  /** A straight run of fence from a to b: posts at most 2.9 m apart, two rails. */
  const run = (ax: number, az: number, bx: number, bz: number, bigA = false, bigB = false) => {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.3) return;
    const n = Math.max(1, Math.ceil(L / 2.9));
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n;
      // Corners are shared by two runs: only the first puts a post there.
      if (i > 0 || !posts.some((p) => Math.hypot(p.x - x, p.z - z) < 0.1)) post(x, z, (i === 0 && bigA) || (i === n && bigB));
      if (i > 0) {
        const px = ax + ((bx - ax) * (i - 1)) / n, pz = az + ((bz - az) * (i - 1)) / n;
        rail(px, pz, x, z, 0.42);
        rail(px, pz, x, z, 0.86);
      }
    }
  };
  // The gate side (+z), the far end, the back (-z), the near end.
  run(-hw, hd, -GATE_HW, hd, false, true);
  run(GATE_HW, hd, hw, hd, true, false);
  const side = (x: number, s: 1 | -1) => {
    // Along x = const from +z to -z; behind the stable there's a gap.
    if (end === s) {
      run(x, hd, x, sw);
      run(x, -sw, x, -hd);
    } else run(x, hd, x, -hd);
  };
  side(hw, 1);
  run(hw, -hd, -hw, -hd);
  side(-hw, -1);

  // The gate leaf: two stiles, three rails and a brace, hung on the left post.
  const gl = GATE_HW * 2 - 0.2;
  const hinge = new THREE.Vector3(-GATE_HW + 0.1, ground(-GATE_HW + 0.1, hd), hd);
  const gate: THREE.BufferGeometry[] = [];
  for (const x of [0.06, gl - 0.06]) gate.push(kbox(0.1, 1.15, 0.08, x, 0.68, 0, K.trunk));
  for (const y of [0.3, 0.7, 1.1]) gate.push(kbox(gl, 0.1, 0.06, gl / 2, y, 0.02, K.bare));
  const dl = Math.hypot(gl - 0.2, 0.8);
  gate.push(kbox(dl, 0.09, 0.05, gl / 2, 0.7, -0.03, K.bare, 0, 0, Math.atan2(0.8, gl - 0.2)));

  // Marker stakes with a cream ribbon at each corner and either side of the
  // gate, and a builder's string run round between them.
  const stakes: THREE.BufferGeometry[] = [];
  const ring: [number, number][] = [[-hw, hd], [-GATE_HW, hd], [GATE_HW, hd], [hw, hd], [hw, -hd], [-hw, -hd]];
  for (const [x, z] of ring) {
    const y = ground(x, z);
    stakes.push(kbox(0.08, 1.3, 0.08, x, y + 0.45, z, K.bare, (rnd() - 0.5) * 0.1, 0, (rnd() - 0.5) * 0.1));
    stakes.push(kbox(0.03, 0.2, 0.34, x + 0.05, y + 0.96, z, K.trim, 0.3, rnd() * 3, 0.2));
  }
  for (let i = 0; i < ring.length; i++) {
    if (i === 1) continue; // the gate's opening
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
    const L = Math.hypot(bx - ax, bz - az);
    const ya = ground(ax, az) + 0.95, yb = ground(bx, bz) + 0.95;
    const g = kbox(L, 0.025, 0.025, 0, 0, 0, K.trim);
    g.rotateZ(Math.atan2(yb - ya, L));
    g.rotateY(Math.atan2(-(bz - az), bx - ax));
    g.translate((ax + bx) / 2, (ya + yb) / 2 - 0.04, (az + bz) / 2);
    stakes.push(g);
  }

  return { fence: merge(fence), sketch: merge(sketch), gate: merge(gate), hinge, stakes: merge(stakes), posts };
}

/** Plain-box outline of the gate leaf, for its sketch. */
export function gateSketch(): THREE.BufferGeometry {
  const gl = GATE_HW * 2 - 0.2;
  return merge([kbox(gl, 1.15, 0.08, gl / 2, 0.68, 0, K.bare)]);
}
