import type * as THREE from 'three';
import { buildChunk, INST_STRIDE } from './chunkBuilder';
import type { WorldGen } from './worldgen';
import { TREE_HEIGHT } from '../gfx/geometry';

// Solid props for the player. The scatter is a pure function of (seed, x, z),
// so the main thread rebuilds the same 64 m cells the renderer draws nearest
// the player (props only, no ground detail) and keeps simple shapes:
//   trees  - trunk cylinders (walk under the branches, never stand on them)
//   rocks  - domes: a walkable cap (<= 45 deg) on a steep flank that acts
//            as a wall. Pebbles whose cap is within a step are walked over;
//            bigger ones have to be jumped onto.
//   cabins - oriented boxes with a pitched roof you can land on
// Bushes, tufts and flowers stay walk-through.

const CELL = 64;
/** Largest distance a collider reaches beyond its cell (erratics, towers). */
const MARGIN = 10;
/** How far above the feet a surface can be and still be stepped onto. */
export const STEP = 0.5;
const MAX_CELLS = 36;

/** Boulder mesh extents per unit scale (buildBoulder seed 5): horizontal radius, dome height. */
const ROCK_R = 0.9;
const ROCK_H = 1.1;
const TRUNK_R = 0.34;
/** Bush footprint per unit scale (buildBush: a core blob plus side blobs). */
const BUSH_R = 1.9;
/** Anything this close above the feet on a steep flank doesn't block. */
const SKIN = 0.05;

/** The walkable cap of a dome (slope <= 45 deg): its radius and the height of its rim. */
function rockCap(R: number, cy: number, hy: number): [number, number] {
  const l = Math.hypot(R, hy);
  return [(R * R) / l, cy + (hy * hy) / l];
}

interface Cell {
  /** x, z, radius, top */
  trees: Float32Array;
  /** x, z, radius, centreY, domeHeight */
  rocks: Float32Array;
  /** x, z, cos, sin, halfW, halfD, baseY, rise */
  cabins: Float32Array;
  /** x, z, radius. Walk-through; only for keeping placed things out of them. */
  bushes: Float32Array;
  /** Full world-space instance rows (x, y, z, scale, rot, yScale, lean, tone), aligned with trees / rocks. */
  treeRows: Float32Array;
  rockRows: Float32Array;
  used: number;
}

/** A world prop found by `nearestTree` / `nearestRock`: its instance row (world space). */
export interface PropHit { row: Float32Array; x: number; z: number; radius: number; d: number }

export class Colliders {
  enabled = true;
  private cells = new Map<string, Cell>();
  private tick = 0;
  /** Props taken out of the world (felled, smashed or stood in for) are left out. */
  skip: ((kind: 'tree' | 'rock', x: number, z: number) => boolean) | null = null;
  /** Solid but not to be taken (a regrowing tree): `nearestTree` / `nearestRock` pass over it. */
  busy: ((kind: 'tree' | 'rock', x: number, z: number) => boolean) | null = null;

  /** Rebuild the cell holding a point (after a prop there was taken or restored). */
  invalidate(x: number, z: number) {
    this.cells.delete(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
  }

  constructor(private gen: WorldGen) {}

  reset(gen: WorldGen) {
    this.gen = gen;
    this.cells.clear();
  }

  private cell(cx: number, cz: number): Cell {
    const key = `${cx},${cz}`;
    let c = this.cells.get(key);
    if (!c) {
      c = this.build(cx * CELL, cz * CELL);
      this.cells.set(key, c);
      if (this.cells.size > MAX_CELLS) {
        let oldest = '';
        let t = Infinity;
        for (const [k, v] of this.cells) if (v.used < t) { t = v.used; oldest = k; }
        this.cells.delete(oldest);
      }
    }
    c.used = this.tick;
    return c;
  }

  private build(x0: number, z0: number): Cell {
    const r = buildChunk(this.gen, { id: 0, seed: this.gen.seed, x0, z0, size: CELL, propsOnly: true });
    const S = INST_STRIDE;
    const keep = (data: Float32Array, kind: 'tree' | 'rock') => {
      const rows: number[] = [];
      for (let i = 0; i < data.length; i += S) {
        const x = x0 + data[i], z = z0 + data[i + 2];
        if (this.skip?.(kind, x, z) && !(kind === 'rock' && data[i + 6] > 5)) continue;
        // Beacon towers collide in story/beacons.ts (their exact shapes).
        if (kind === 'rock' && data[i + 6] > 7.5 && data[i + 6] < 8.5) continue;
        rows.push(x, data[i + 1], z, ...data.subarray(i + 3, i + 8));
      }
      return new Float32Array(rows);
    };
    const treeRows = keep(r.trees, 'tree');
    const rockRows = keep(r.rocks, 'rock');
    // From here on, positions are already world space.
    r.trees = treeRows.map((v, i) => (i % S === 0 ? v - x0 : i % S === 2 ? v - z0 : v));
    r.rocks = rockRows.map((v, i) => (i % S === 0 ? v - x0 : i % S === 2 ? v - z0 : v));
    const trees = new Float32Array((r.trees.length / S) * 4);
    for (let i = 0, k = 0; i < r.trees.length; i += S, k += 4) {
      const sc = r.trees[i + 3];
      trees[k] = x0 + r.trees[i];
      trees[k + 1] = z0 + r.trees[i + 2];
      trees[k + 2] = TRUNK_R * sc;
      trees[k + 3] = r.trees[i + 1] + TREE_HEIGHT * sc * r.trees[i + 5];
    }
    const rocks = new Float32Array((r.rocks.length / S) * 5);
    for (let i = 0, k = 0; i < r.rocks.length; i += S, k += 5) {
      const sc = r.rocks[i + 3];
      rocks[k] = x0 + r.rocks[i];
      rocks[k + 1] = z0 + r.rocks[i + 2];
      rocks[k + 2] = ROCK_R * sc;
      rocks[k + 3] = r.rocks[i + 1];
      rocks[k + 4] = ROCK_H * sc * r.rocks[i + 5];
    }
    const cabins = new Float32Array((r.cabins.length / S) * 8);
    for (let i = 0, k = 0; i < r.cabins.length; i += S, k += 8) {
      // Matches buildCabin: footing is (W + 0.3) x (D + 0.3); ridge runs along x.
      const v = Math.round(r.cabins[i + 6]) % 3;
      const rot = r.cabins[i + 4];
      cabins[k] = x0 + r.cabins[i];
      cabins[k + 1] = z0 + r.cabins[i + 2];
      cabins[k + 2] = Math.cos(rot);
      cabins[k + 3] = Math.sin(rot);
      cabins[k + 4] = (v === 1 ? 7 : 5.6) / 2 + 0.15;
      cabins[k + 5] = (v === 1 ? 4.6 : 4.2) / 2 + 0.15;
      cabins[k + 6] = r.cabins[i + 1];
      cabins[k + 7] = v === 2 ? 2.8 : 2.1;
    }
    const bushes = new Float32Array((r.bushes.length / S) * 3);
    for (let i = 0, k = 0; i < r.bushes.length; i += S, k += 3) {
      bushes[k] = x0 + r.bushes[i];
      bushes[k + 1] = z0 + r.bushes[i + 2];
      bushes[k + 2] = BUSH_R * r.bushes[i + 3];
    }
    return { trees, rocks, cabins, bushes, treeRows, rockRows, used: this.tick };
  }

  /** Nearest world tree trunk within `max` m of (x, z), measured to the bark. */
  nearestTree(x: number, z: number, max: number): PropHit | null {
    return this.nearest('tree', x, z, max, Infinity);
  }

  /** Every standing world tree within `r` m of (x, z), as instance rows (x, y, z, scale, rot, yScale, lean, tone). */
  treesNear(x: number, z: number, r: number): Float32Array[] {
    const out: Float32Array[] = [];
    this.forCells(x, z, r, (c) => {
      const R = c.treeRows;
      for (let i = 0; i < R.length; i += INST_STRIDE) {
        if (Math.hypot(R[i] - x, R[i + 2] - z) < r && !this.busy?.('tree', R[i], R[i + 2])) out.push(R.slice(i, i + INST_STRIDE));
      }
    });
    return out;
  }

  /** Nearest ordinary boulder (not a landmark) up to `maxScale` within `max` m. */
  nearestRock(x: number, z: number, max: number, maxScale: number): PropHit | null {
    return this.nearest('rock', x, z, max, maxScale);
  }

  private nearest(kind: 'tree' | 'rock', x: number, z: number, max: number, maxScale: number): PropHit | null {
    let best: PropHit | null = null;
    this.forCells(x, z, max, (c) => {
      const R = kind === 'tree' ? c.treeRows : c.rockRows;
      for (let i = 0; i < R.length; i += INST_STRIDE) {
        if (kind === 'rock' && (R[i + 6] > 5 || R[i + 3] > maxScale)) continue;
        if (this.busy?.(kind, R[i], R[i + 2])) continue;
        const radius = (kind === 'tree' ? TRUNK_R : ROCK_R) * R[i + 3];
        const d = Math.hypot(R[i] - x, R[i + 2] - z) - radius;
        if (d < max && (!best || d < best.d)) best = { row: R.slice(i, i + INST_STRIDE), x: R[i], z: R[i + 2], radius, d };
      }
    });
    return best;
  }

  /** Build at most one missing cell around a point per call, so walking never hitches. */
  prefetch(x: number, z: number) {
    this.tick++;
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${cx + dx},${cz + dz}`;
        const c = this.cells.get(key);
        if (c) c.used = this.tick;
        else { this.cell(cx + dx, cz + dz); return; }
      }
    }
  }

  private forCells(x: number, z: number, r: number, fn: (c: Cell) => void) {
    const cx0 = Math.floor((x - r - MARGIN) / CELL), cx1 = Math.floor((x + r + MARGIN) / CELL);
    const cz0 = Math.floor((z - r - MARGIN) / CELL), cz1 = Math.floor((z + r + MARGIN) / CELL);
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) fn(this.cell(cx, cz));
  }

  /**
   * Highest prop surface under a foot circle that is at most STEP above
   * `feetY` (so it can be stood on), or -Infinity.
   */
  surface(x: number, z: number, feetY: number, r: number): number {
    if (!this.enabled) return -Infinity;
    let best = -Infinity;
    const lim = feetY + STEP;
    this.forCells(x, z, r, (c) => {
      const R = c.rocks;
      for (let k = 0; k < R.length; k += 5) {
        // Only the cap is floor; the steep flank never is, or you'd climb it
        // a step at a time.
        const e = Math.max(0, Math.hypot(x - R[k], z - R[k + 1]) - r);
        if (e > rockCap(R[k + 2], R[k + 3], R[k + 4])[0]) continue;
        const q = e / R[k + 2];
        const h = R[k + 3] + R[k + 4] * Math.sqrt(1 - q * q);
        if (h <= lim && h > best) best = h;
      }
      const C = c.cabins;
      for (let k = 0; k < C.length; k += 8) {
        const h = cabinSurface(C, k, x, z, r);
        if (h <= lim && h > best) best = h;
      }
    });
    return best;
  }

  /**
   * Highest boulder surface under a circle, over the whole dome (not just the
   * walkable cap), for rocks standing at most `maxRise` m out of the ground:
   * what a fast bike rides up as a ramp. -Infinity if none.
   */
  ramp(x: number, z: number, r: number, maxRise: number): number {
    if (!this.enabled) return -Infinity;
    let best = -Infinity;
    this.forCells(x, z, r, (c) => {
      const R = c.rocks;
      for (let k = 0; k < R.length; k += 5) {
        if (rockRise(R, k) > maxRise) continue;
        const e = Math.max(0, Math.hypot(x - R[k], z - R[k + 1]) - r);
        if (e >= R[k + 2]) continue;
        const q = e / R[k + 2];
        const h = R[k + 3] + R[k + 4] * Math.sqrt(1 - q * q);
        if (h > best) best = h;
      }
    });
    return best;
  }

  /** Highest cabin (walls + roof) under a circle, however tall, or -Infinity: what a clinger climbs. */
  cabinTop(x: number, z: number, r: number): number {
    if (!this.enabled) return -Infinity;
    let best = -Infinity;
    this.forCells(x, z, r, (c) => {
      const C = c.cabins;
      for (let k = 0; k < C.length; k += 8) best = Math.max(best, cabinSurface(C, k, x, z, r));
    });
    return best;
  }

  /** Does a circle overlap a bush? (Bushes aren't solid; this is for placing things.) */
  inBush(x: number, z: number, r: number): boolean {
    let hit = false;
    this.forCells(x, z, r, (c) => {
      const B = c.bushes;
      for (let k = 0; k < B.length && !hit; k += 3) if (Math.hypot(x - B[k], z - B[k + 1]) < B[k + 2] + r) hit = true;
    });
    return hit;
  }

  /**
   * Push a body out of every prop too tall to step onto at its current feet
   * height, and remove the velocity going into them (so it slides along).
   * `noTrees`: trunks don't block (a brambler walks through the wood).
   */
  push(pos: THREE.Vector3, vel: THREE.Vector3, r: number, rampMax = 0, noTrees = false) {
    if (!this.enabled) return;
    const lim = pos.y + STEP;
    const out = (nx: number, nz: number, depth: number) => {
      pos.x += nx * depth;
      pos.z += nz * depth;
      const vn = vel.x * nx + vel.z * nz;
      if (vn < 0) { vel.x -= nx * vn; vel.z -= nz * vn; }
    };
    const circle = (cx: number, cz: number, rad: number) => {
      const dx = pos.x - cx, dz = pos.z - cz;
      const d = Math.hypot(dx, dz);
      const min = rad + r;
      if (d >= min) return;
      if (d < 1e-4) out(1, 0, min);
      else out(dx / d, dz / d, min - d);
    };
    // Two passes settle corners where a trunk sits next to a rock.
    for (let pass = 0; pass < 2; pass++) {
      this.forCells(pos.x, pos.z, r, (c) => {
        const T = c.trees;
        if (!noTrees) for (let k = 0; k < T.length; k += 4) if (pos.y < T[k + 3]) circle(T[k], T[k + 1], T[k + 2]);
        const R = c.rocks;
        for (let k = 0; k < R.length; k += 5) {
          // Cap within a step: walk (or land) onto it. Otherwise the flank is
          // a wall out to where the dome drops to the feet.
          if (rockCap(R[k + 2], R[k + 3], R[k + 4])[1] <= lim) continue;
          // Low enough to ride up (see `ramp`).
          if (rockRise(R, k) <= rampMax) continue;
          const f = (pos.y + SKIN - R[k + 3]) / R[k + 4];
          circle(R[k], R[k + 1], f <= 0 ? R[k + 2] : R[k + 2] * Math.sqrt(1 - f * f));
        }
        const C = c.cabins;
        for (let k = 0; k < C.length; k += 8) {
          if (cabinSurface(C, k, pos.x, pos.z, r) <= lim) continue;
          const co = C[k + 2], si = C[k + 3], hw = C[k + 4], hd = C[k + 5];
          const wx = pos.x - C[k], wz = pos.z - C[k + 1];
          // World -> cabin space (inverse of the prop shader's rotation).
          const lx = co * wx - si * wz;
          const lz = si * wx + co * wz;
          const qx = Math.max(-hw, Math.min(hw, lx));
          const qz = Math.max(-hd, Math.min(hd, lz));
          let nx = lx - qx, nz = lz - qz;
          let d = Math.hypot(nx, nz);
          let depth: number;
          if (d > 1e-4) {
            if (d >= r) continue;
            nx /= d; nz /= d;
            depth = r - d;
          } else {
            // Centre inside the footing: leave through the nearest wall.
            const px = hw - Math.abs(lx), pz = hd - Math.abs(lz);
            if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; depth = px + r; }
            else { nx = 0; nz = Math.sign(lz) || 1; depth = pz + r; }
          }
          // Cabin space -> world.
          out(co * nx + si * nz, -si * nx + co * nz, depth);
        }
      });
    }
  }
}

/** How far a boulder stands out of the ground (it's sunk by a quarter of its scale; R = 0.9 scale). */
function rockRise(R: Float32Array, k: number) {
  return R[k + 4] - 0.278 * R[k + 2];
}

/** Highest point of a cabin (walls + pitched roof) under a foot circle, or -Infinity. */
function cabinSurface(C: Float32Array, k: number, x: number, z: number, r: number): number {
  const co = C[k + 2], si = C[k + 3], hw = C[k + 4], hd = C[k + 5];
  const wx = x - C[k], wz = z - C[k + 1];
  const lx = co * wx - si * wz;
  const lz = si * wx + co * wz;
  const ox = Math.max(0, Math.abs(lx) - hw);
  const oz = Math.max(0, Math.abs(lz) - hd);
  if (ox * ox + oz * oz >= r * r) return -Infinity;
  // Ridge along x at 3.3 + rise, eaves at 3.3 (buildCabin: footing 0.4 + walls 2.9).
  const nearZ = Math.min(hd, Math.max(0, Math.abs(lz) - r));
  return C[k + 6] + 3.3 + C[k + 7] * (1 - nearZ / hd);
}
