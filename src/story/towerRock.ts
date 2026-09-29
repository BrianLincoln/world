import type * as THREE from 'three';
import type { Tower, TowerBoulder } from '../world/towers';

// Beacon tower rock as solid shapes, for everything that has to stay out of
// it (the explorer on foot, mounts, bikes, dev flight, the camera, the
// spirit's arms).
//
// Each boulder mesh is rasterised once into a pair of height fields over its
// footprint: the top and bottom of the rock above each point, in the mesh's
// own unit space. Every boulder mesh is star-shaped round its vertical axis,
// so a vertical line through it meets the rock in one span, and these two
// fields are the exact drawn shape (not a fitted ellipsoid). A boulder in the
// world is one of these shapes, scaled and turned.

/** Grid resolution and half extent (unit mesh space) of the height fields. */
const N = 129;
const EXT = 1.6;
const CELL = (2 * EXT) / (N - 1);

export interface RockShape { top: Float32Array; bot: Float32Array }

/** Rasterise a mesh (unit space) into its top / bottom height fields. */
export function rockShape(g: THREE.BufferGeometry): RockShape {
  const top = new Float32Array(N * N).fill(-Infinity);
  const bot = new Float32Array(N * N).fill(Infinity);
  const p = g.attributes.position;
  const idx = g.index;
  const tris = idx ? idx.count / 3 : p.count / 3;
  const at = (k: number) => (idx ? idx.getX(k) : k);
  const put = (i: number, j: number, y: number) => {
    const k = j * N + i;
    if (y > top[k]) top[k] = y;
    if (y < bot[k]) bot[k] = y;
  };
  for (let t = 0; t < tris; t++) {
    const a = at(t * 3), b = at(t * 3 + 1), c = at(t * 3 + 2);
    const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a);
    const bx = p.getX(b), by = p.getY(b), bz = p.getZ(b);
    const cx = p.getX(c), cy = p.getY(c), cz = p.getZ(c);
    // The corners always count (thin, near-vertical triangles at the
    // silhouette cover no grid point, but their corners do).
    for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) put(Math.round((x + EXT) / CELL), Math.round((z + EXT) / CELL), y);
    const i0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) + EXT) / CELL));
    const i1 = Math.min(N - 1, Math.floor((Math.max(ax, bx, cx) + EXT) / CELL));
    const j0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) + EXT) / CELL));
    const j1 = Math.min(N - 1, Math.floor((Math.max(az, bz, cz) + EXT) / CELL));
    const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(den) < 1e-12) continue;
    for (let j = j0; j <= j1; j++) {
      const z = j * CELL - EXT;
      for (let i = i0; i <= i1; i++) {
        const x = i * CELL - EXT;
        const l0 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / den;
        const l1 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / den;
        const l2 = 1 - l0 - l1;
        if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
        put(i, j, l0 * ay + l1 * by + l2 * cy);
      }
    }
  }
  return { top, bot };
}

/** One boulder of a tower in the world: a shape, scaled and turned. */
export interface Rock {
  x: number; y: number; z: number;
  /** Horizontal scale (m per unit) and vertical scale (m per unit). */
  sx: number; sy: number;
  cos: number; sin: number;
  shape: RockShape;
  /** The door boulder: hollow (its walls collide as a shell, see Beacons). */
  hollow: boolean;
}

export function rock(b: TowerBoulder, shape: RockShape, hollow = false): Rock {
  return { x: b.x, y: b.y, z: b.z, sx: b.sx, sy: b.sy, cos: Math.cos(b.rot), sin: Math.sin(b.rot), shape, hollow };
}

/** Out-parameters of `span`: the rock's bottom and top (world y) over a point. */
export const SPAN = { bot: 0, top: 0, slope: 0 };

/** The unit-space footprint point of a world (x, z) under a rock. */
function local(r: Rock, x: number, z: number): [number, number] {
  const dx = x - r.x, dz = z - r.z;
  return [(r.cos * dx - r.sin * dz) / r.sx, (r.sin * dx + r.cos * dz) / r.sx];
}

/**
 * The rock over a world point: fills SPAN (world bottom, top, and the top's
 * slope as rise over run) and returns true, or false if (x, z) is off it.
 * Bilinear where the four grid corners are all rock, else the nearest one.
 */
export function span(r: Rock, x: number, z: number, slope = false): boolean {
  const [lx, lz] = local(r, x, z);
  if (!unitSpan(r.shape, lx, lz)) return false;
  const t = U.top, b = U.bot;
  SPAN.top = r.y + t * r.sy;
  SPAN.bot = r.y + b * r.sy;
  SPAN.slope = 0;
  if (slope) {
    // Finite differences over a cell either side, in world units.
    const h = CELL;
    const f = (u: number, v: number) => (unitSpan(r.shape, u, v) ? U.top : t);
    const gx = (f(lx + h, lz) - f(lx - h, lz)) / (2 * h);
    const gz = (f(lx, lz + h) - f(lx, lz - h)) / (2 * h);
    SPAN.slope = Math.hypot(gx, gz) * (r.sy / r.sx);
  }
  return true;
}

const U = { top: 0, bot: 0 };

function unitSpan(s: RockShape, lx: number, lz: number): boolean {
  const fx = (lx + EXT) / CELL, fz = (lz + EXT) / CELL;
  if (fx < 0 || fz < 0 || fx > N - 1 || fz > N - 1) return false;
  const i = Math.min(N - 2, Math.floor(fx)), j = Math.min(N - 2, Math.floor(fz));
  const u = fx - i, v = fz - j;
  const k = j * N + i;
  const T = s.top, B = s.bot;
  if (T[k] > -Infinity && T[k + 1] > -Infinity && T[k + N] > -Infinity && T[k + N + 1] > -Infinity) {
    U.top = (T[k] * (1 - u) + T[k + 1] * u) * (1 - v) + (T[k + N] * (1 - u) + T[k + N + 1] * u) * v;
    U.bot = (B[k] * (1 - u) + B[k + 1] * u) * (1 - v) + (B[k + N] * (1 - u) + B[k + N + 1] * u) * v;
    return true;
  }
  const n = Math.round(fz) * N + Math.round(fx);
  if (T[n] === -Infinity) return false;
  U.top = T[n];
  U.bot = B[n];
  return true;
}

/** Is a world point inside the rock (solid; a hollow door boulder counts as solid here)? */
export function inside(r: Rock, x: number, y: number, z: number): boolean {
  return span(r, x, z) && y > SPAN.bot && y < SPAN.top;
}

/** A tower's rocks (door boulder first-class, head last), built on demand and kept. */
export class TowerRocks {
  private cache = new Map<number, Rock[]>();
  constructor(private boulderShapes: RockShape[], private headShape: RockShape) {}

  clear() { this.cache.clear(); }

  of(t: Tower): Rock[] {
    let rs = this.cache.get(t.id);
    if (!rs) {
      // Matches Beacons.draw: which of the three boulder meshes each one uses.
      rs = t.boulders.map((b, i) => (i === 1 ? rock(b, this.headShape, true) : rock(b, this.boulderShapes[(i * 7 + t.id * 3) % 3])));
      rs.push(rock(t.head, this.headShape));
      this.cache.set(t.id, rs);
      if (this.cache.size > 16) this.cache.delete(this.cache.keys().next().value!);
    }
    return rs;
  }
}
