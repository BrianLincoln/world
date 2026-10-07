import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLUMN_R } from './layout';
import { buildStone, lathe, tint } from './shell';
import type { Veil, VeilLayout } from './veilPlan';

// The Veil Cave's own meshes (its rock shell is shell.ts's, from the same
// plan): the veils, and what stands in the cave.

/** How far apart a veil's columns of vertices are (m), and how many rows it has, hem to ceiling. */
const STEP = 0.4, ROWS = 14;

/** How far a veil's stone stands off its line at `u` m along it, `y` m up: its folds. Within `VEIL_HALF`. */
function fold(v: Veil, u: number, y: number) {
  const k = v.ax * 0.37 + v.az * 0.61;
  return 0.3 * Math.sin(u * 1.75 + k + y * 0.05) + 0.14 * Math.sin(u * 4.1 + k * 2.3 - y * 0.08);
}

/**
 * Every veil, as one mesh: a sheet from end to end of each (its ends are in
 * the rock), from under the floor to over the ceiling, folded like a hung
 * curtain. Its front face is the side its normal points to. `aBack` is
 * what shows through it from the other side (x: seen from the front, y:
 * from the back), baked from what glows steadily near it: glowcaps, the
 * warm light, the daylight behind the way out.
 */
export function buildVeils(L: VeilLayout): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], back: number[] = [], kind: number[] = [], plane: number[] = [], idx: number[] = [];
  // (Not the portal's light, and not the lanterns, which wake.)
  const lights = L.glows.filter((g, i) => i > 0 && g.lantern === undefined);
  for (const v of L.veils) {
    const dx = (v.bx - v.ax) / v.len, dz = (v.bz - v.az) / v.len;
    const cols = Math.ceil(v.len / STEP), first = pos.length / 3;
    // (The warm light carries: it is the one thing seen from the far side of the cave's first cell.)
    const far = (g: { r: number; warm: boolean }) => g.r * (g.warm ? 1.7 : 1.25);
    const near = lights.filter((g) => Math.abs(L.signed(v, g.x, g.z)) < far(g) && L.toVeil(v, g.x, g.z) < far(g) + 6);
    for (let i = 0; i <= cols; i++) {
      const u = (i / cols) * v.len, x = v.ax + dx * u, z = v.az + dz * u;
      const f = L.floor(x, z) - 0.6, c = L.ceil(x, z) + 1.2;
      for (let k = 0; k <= ROWS; k++) {
        const y = f + ((c - f) * k) / ROWS, w = fold(v, u, y), e = 0.05;
        const slope = (fold(v, u + e, y) - fold(v, u - e, y)) / (2 * e);
        pos.push(x + v.nx * w, y, z + v.nz * w);
        const nl = Math.hypot(1, slope);
        nrm.push((v.nx - dx * slope) / nl, 0, (v.nz - dz * slope) / nl);
        let bf = 0, bb = 0;
        for (const g of near) {
          const s = L.signed(v, g.x, g.z), dp = Math.abs(s), max = far(g);
          const along = (g.x - x) * dx + (g.z - z) * dz, up = g.y - y;
          const rp = 1.4 + 0.42 * dp, t = THREE.MathUtils.smoothstep(dp, 0.45 * max, max);
          const b = (1 - t) * Math.max(0, 1 - (along * along + up * up) / (rp * rp));
          // (A light on the far side from the front shows on the front.)
          if (s < 0) bf = Math.max(bf, b); else bb = Math.max(bb, b);
        }
        back.push(bf, bb);
        kind.push(v.kind);
        plane.push(v.nx, v.nz);
      }
    }
    // Wound so the front is the side the normal points to.
    const flip = -dz * v.nx + dx * v.nz < 0;
    for (let i = 0; i < cols; i++) for (let k = 0; k < ROWS; k++) {
      const a = first + i * (ROWS + 1) + k, b = a + ROWS + 1;
      if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aBack', new THREE.Float32BufferAttribute(back, 2));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  g.setAttribute('aPlane', new THREE.Float32BufferAttribute(plane, 2));
  g.setIndex(idx);
  return g;
}

/** Everything of rock that stands in the cave: the well's columns, the slim posts, boulders, stalagmites and stalactites, the lanterns' sconces, the light's plinth, the glowcaps' stalks. One mesh. */
export function buildVeilRock(L: VeilLayout): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const well = L.rooms[0];
  for (const o of L.solids) {
    if (Math.abs(Math.hypot(o.x, o.z) - COLUMN_R) > 0.01 || o.top < 50) continue;
    const H = well.clear + 0.6;
    parts.push(tint(lathe([[o.r * 1.5, -0.4], [o.r * 1.12, 0.5], [o.r * 0.92, 2.2], [o.r * 0.8, H * 0.5], [o.r * 0.9, H - 3.5], [o.r * 1.25, H - 1.2], [o.r * 2.1, H]], 20).translate(o.x, well.floor, o.z), '#44707c'));
  }
  // The posts: slim columns, waisted, splaying into floor and ceiling. A short veil hangs from each of some.
  for (const o of L.posts) {
    const f = L.floor(o.x, o.z), H = L.ceil(o.x, o.z) - f + 0.8;
    parts.push(tint(lathe([[o.r * 1.7, -0.5], [o.r * 1.15, 0.6], [o.r * 0.9, 2.4], [o.r * 0.78, H * 0.5], [o.r * 0.9, H - 3], [o.r * 1.3, H - 1.1], [o.r * 2.2, H]], 16).translate(o.x, f, o.z), '#8fbcbc'));
  }
  for (const s of L.stones) parts.push(buildStone(s, s.sx > 1.3 ? '#7ea9ad' : '#93bdbd'));
  for (const o of L.lanterns) {
    const yaw = Math.atan2(o.nx, o.nz);
    parts.push(tint(lathe([[0, -0.36], [0.2, -0.34], [0.44, -0.14], [0.52, 0.02], [0.46, 0.04], [0.3, -0.06], [0, -0.08]], 14).translate(o.x + o.nx * 0.5, o.y, o.z + o.nz * 0.5), '#a9d3d0'));
    parts.push(tint(new THREE.CylinderGeometry(0.13, 0.17, 0.9, 8).rotateX(Math.PI / 2).translate(0, -0.2, -0.05).rotateY(yaw).translate(o.x, o.y, o.z), '#8dbcba'));
  }
  for (const s of L.spikes) {
    const g = lathe([[s.r * 1.5, 0], [s.r, s.h * 0.12], [s.r * 0.62, s.h * 0.5], [s.r * 0.36, s.h * 0.85], [s.r * 0.2, s.h * 0.97], [0, s.h]], 12);
    if (s.down) g.rotateX(Math.PI);
    parts.push(tint(g.translate(s.x, s.y, s.z), s.down ? '#4f7e88' : '#74a3a6'));
  }
  const e = L.ember, fy = L.floor(e.x, e.z);
  parts.push(tint(lathe([[1.05, -0.3], [1.0, 0.15], [0.84, 0.5], [0.66, 0.74], [0.62, 0.9], [0.7, 1.04], [0.6, 1.1], [0.4, 1.02], [0, 0.98]], 24).translate(e.x, fy, e.z), '#a3cfcb'));
  for (const c of L.caps) {
    const g = lathe([[c.r * 0.34, 0], [c.r * 0.22, c.h * 0.35], [c.r * 0.17, c.h * 0.8], [c.r * 0.2, c.h]], 10);
    parts.push(tint(g.rotateZ(c.lean).rotateY(c.dir).translate(c.x, c.y, c.z), '#d4efe6'));
  }
  return mergeGeometries(parts)!;
}
