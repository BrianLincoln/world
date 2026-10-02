import { hash01 } from '../core/rng';
import { segDist, WorldGen, TREE_LINE, type PathSeg, type Poi, type DungeonSite } from './worldgen';

// Builds everything one quadtree node needs, as flat typed arrays that can be
// transferred from a worker without copying.

export const CHUNK_RES = 32;
const TREE_GRID = 4;
const BUSH_GRID = 6;
const ROCK_GRID = 9;
const TUFT_GRID = 1.6;

export interface ChunkRequest {
  id: number;
  seed: number;
  x0: number;
  z0: number;
  size: number;
  /** Skip ground detail (tufts, flowers): used for main-thread colliders. */
  propsOnly?: boolean;
  /** The dungeon sites, found once on the main thread (the search is slow: see WorldGen.dungeons). */
  dungeons?: DungeonSite[] | null;
}

/** Instance layout (8 floats): x, y, z, scaleXZ, rotY, scaleY, lean, tone. */
export const INST_STRIDE = 8;

export interface ChunkResult {
  id: number;
  positions: Float32Array;
  normals: Float32Array;
  biome: Float32Array;
  minY: number;
  maxY: number;
  hasWater: boolean;
  trees: Float32Array;
  bushes: Float32Array;
  rocks: Float32Array;
  tufts: Float32Array;
  flowers: Float32Array;
  /** 8 floats per cabin: x, y, z, 1, rot, 1, variant, tone */
  cabins: Float32Array;
  ms: number;
}

function treeStep(size: number): number {
  if (size <= 128) return 1;
  if (size <= 256) return 2;
  if (size <= 512) return 3;
  if (size <= 1024) return 5;
  return 0;
}

export function buildChunk(gen: WorldGen, req: ChunkRequest): ChunkResult {
  const t0 = performance.now();
  const { x0, z0, size } = req;
  const R = CHUNK_RES;
  const s = size / R;
  const W = R + 3; // bordered grid for normals
  const H = new Float32Array(W * W);
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      H[j * W + i] = gen.height(x0 + (i - 1) * s, z0 + (j - 1) * s);
    }
  }
  // Stitch edges: odd edge vertices take the midpoint of their even
  // neighbours, so an edge matches a neighbour one LOD coarser (and still
  // matches a same-size neighbour, which does the same). No seams, no lines.
  const idx = (i: number, j: number) => (j + 1) * W + (i + 1);
  for (let k = 1; k < R; k += 2) {
    H[idx(k, 0)] = 0.5 * (H[idx(k - 1, 0)] + H[idx(k + 1, 0)]);
    H[idx(k, R)] = 0.5 * (H[idx(k - 1, R)] + H[idx(k + 1, R)]);
    H[idx(0, k)] = 0.5 * (H[idx(0, k - 1)] + H[idx(0, k + 1)]);
    H[idx(R, k)] = 0.5 * (H[idx(R, k - 1)] + H[idx(R, k + 1)]);
  }
  const hAt = (i: number, j: number) => H[(j + 1) * W + (i + 1)];

  const nv = (R + 1) * (R + 1);
  const nSkirt = 4 * (R + 1);
  const positions = new Float32Array((nv + nSkirt) * 3);
  const normals = new Float32Array((nv + nSkirt) * 3);
  const biome = new Float32Array((nv + nSkirt) * 4);

  // Path segments and POIs that could touch this node.
  const margin = 24;
  const paths: PathSeg[] = size <= 512 ? gen.pathsInRange(x0, z0, x0 + size, z0 + size, margin) : [];
  const pois: Poi[] = [];
  gen.poiCellRange(x0 - 40, z0 - 40, x0 + size + 40, z0 + size + 40, (p) => pois.push(p));

  const pathDist = (x: number, z: number) => {
    let d = 30;
    for (let k = 0; k < paths.length; k++) {
      const pd = segDist(x, z, paths[k]) - (paths[k].wide ?? 0);
      if (pd < d) d = pd;
    }
    return d;
  };

  let minY = Infinity;
  let maxY = -Infinity;
  let hasWater = false;
  for (let j = 0; j <= R; j++) {
    for (let i = 0; i <= R; i++) {
      const v = j * (R + 1) + i;
      const h = hAt(i, j);
      const wx = x0 + i * s;
      const wz = z0 + j * s;
      positions[v * 3] = i * s;
      positions[v * 3 + 1] = h;
      positions[v * 3 + 2] = j * s;
      let nx = hAt(i - 1, j) - hAt(i + 1, j);
      let ny = 2 * s;
      let nz = hAt(i, j - 1) - hAt(i, j + 1);
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      normals[v * 3] = nx;
      normals[v * 3 + 1] = ny;
      normals[v * 3 + 2] = nz;
      const fd = gen.forestDensity(wx, wz, h);
      biome[v * 4] = fd;
      biome[v * 4 + 1] = gen.rockiness(wx, wz, h);
      // Brook banks read as sand/shingle (the path colour) a couple of metres out.
      // The story's own paths are drawn about twice as wide as the world's.
      biome[v * 4 + 2] = Math.min(paths.length ? pathDist(wx, wz) : 30, gen.brookDist(wx, wz) - 2.6, gen.storyPathDist(wx, wz) - 1.05);
      // The wild biomes: + bog, - glimmerwood (they never overlap much:
      // bogs thin the forest out).
      biome[v * 4 + 3] = gen.bog(wx, wz) - gen.glimmer(wx, wz, fd);
      if (h < minY) minY = h;
      if (h > maxY) maxY = h;
      if (h < 0.5) hasWater = true;
    }
  }

  // Skirts hide LOD cracks: duplicate each edge vertex, pushed down.
  const skirtDepth = 1 + size * 0.012;
  let sv = nv;
  const edge = (i: number, j: number) => {
    const v = j * (R + 1) + i;
    positions[sv * 3] = positions[v * 3];
    positions[sv * 3 + 1] = positions[v * 3 + 1] - skirtDepth;
    positions[sv * 3 + 2] = positions[v * 3 + 2];
    for (let c = 0; c < 3; c++) normals[sv * 3 + c] = normals[v * 3 + c];
    for (let c = 0; c < 4; c++) biome[sv * 4 + c] = biome[v * 4 + c];
    sv++;
  };
  for (let i = 0; i <= R; i++) edge(i, 0);
  for (let i = 0; i <= R; i++) edge(i, R);
  for (let j = 0; j <= R; j++) edge(0, j);
  for (let j = 0; j <= R; j++) edge(R, j);

  // Exact height on the rendered triangle mesh (matches the shared index).
  const meshHeight = (lx: number, lz: number) => {
    const fx = lx / s;
    const fz = lz / s;
    const i = Math.min(R - 1, Math.max(0, Math.floor(fx)));
    const j = Math.min(R - 1, Math.max(0, Math.floor(fz)));
    const u = fx - i;
    const w = fz - j;
    const ha = hAt(i, j);
    const hb = hAt(i + 1, j);
    const hc = hAt(i, j + 1);
    const hd = hAt(i + 1, j + 1);
    if (u + w <= 1) return ha + (hb - ha) * u + (hc - ha) * w;
    return hd + (hc - hd) * (1 - u) + (hb - hd) * (1 - w);
  };
  const slopeY = (lx: number, lz: number) => {
    const i = Math.min(R, Math.max(0, Math.round(lx / s)));
    const j = Math.min(R, Math.max(0, Math.round(lz / s)));
    return normals[(j * (R + 1) + i) * 3 + 1];
  };
  const inClearing = (x: number, z: number, extra: number) => {
    for (let k = 0; k < pois.length; k++) {
      const p = pois[k];
      const dx = x - p.x;
      const dz = z - p.z;
      const r = p.clear + extra;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  };

  const seed = req.seed;
  const trees: number[] = [];
  const bushes: number[] = [];
  const rocks: number[] = [];
  const tufts: number[] = [];
  const flowers: number[] = [];

  // ---- trees: clustered groves with lone sentinels in the meadows
  const tStep = treeStep(size);
  if (tStep > 0) {
    const g0x = Math.ceil(x0 / TREE_GRID);
    const g0z = Math.ceil(z0 / TREE_GRID);
    const g1x = Math.floor((x0 + size - 0.001) / TREE_GRID);
    const g1z = Math.floor((z0 + size - 0.001) / TREE_GRID);
    const farScale = 1 + 0.13 * (tStep - 1);
    for (let gj = g0z; gj <= g1z; gj++) {
      if (((gj % tStep) + tStep) % tStep) continue;
      for (let gi = g0x; gi <= g1x; gi++) {
        if (((gi % tStep) + tStep) % tStep) continue;
        const x = (gi + 0.1 + 0.8 * hash01(gi, gj, seed, 1)) * TREE_GRID;
        const z = (gj + 0.1 + 0.8 * hash01(gi, gj, seed, 2)) * TREE_GRID;
        const lx = x - x0;
        const lz = z - z0;
        if (lx < 0 || lz < 0 || lx >= size || lz >= size) continue;
        const h = meshHeight(lx, lz);
        if (h < 1.6 || h > TREE_LINE) continue;
        if (slopeY(lx, lz) < 0.8) continue;
        const fd = gen.forestDensity(x, z, h);
        const p = fd * 0.78 + 0.008;
        if (hash01(gi, gj, seed, 3) > p) continue;
        const sc = (0.72 + 0.45 * hash01(gi, gj, seed, 4) + 0.25 * fd) * farScale;
        // Clear of the path by the whole canopy, not just the trunk.
        if (paths.length && pathDist(x, z) < 1.6 + 2.4 * sc) continue;
        if (inClearing(x, z, 2)) continue;
        if (gen.storyBlock(x, z, 1.2, 'tree')) continue;
        trees.push(lx, h - 0.4, lz, sc, hash01(gi, gj, seed, 5) * 6.283,
          0.88 + 0.3 * hash01(gi, gj, seed, 6), (hash01(gi, gj, seed, 7) - 0.5), hash01(gi, gj, seed, 8));
      }
    }
  }

  // ---- bushes on grove edges
  const bStep = size <= 64 ? 1 : size <= 128 ? 2 : size <= 256 ? 3 : 0;
  if (bStep) {
    const g0x = Math.ceil(x0 / BUSH_GRID), g1x = Math.floor((x0 + size - 0.001) / BUSH_GRID);
    const g0z = Math.ceil(z0 / BUSH_GRID), g1z = Math.floor((z0 + size - 0.001) / BUSH_GRID);
    for (let gj = g0z; gj <= g1z; gj++) {
      if (((gj % bStep) + bStep) % bStep) continue;
      for (let gi = g0x; gi <= g1x; gi++) {
        if (((gi % bStep) + bStep) % bStep) continue;
        const x = (gi + 0.1 + 0.8 * hash01(gi, gj, seed, 21)) * BUSH_GRID;
        const z = (gj + 0.1 + 0.8 * hash01(gi, gj, seed, 22)) * BUSH_GRID;
        const lx = x - x0, lz = z - z0;
        if (lx < 0 || lz < 0 || lx >= size || lz >= size) continue;
        const h = meshHeight(lx, lz);
        if (h < 1.5 || h > TREE_LINE + 20) continue;
        const fd = gen.forestDensity(x, z, h);
        const edgeness = fd * (1 - fd) * 4;
        const p = edgeness * 0.55 + 0.035;
        if (hash01(gi, gj, seed, 23) > p) continue;
        const sc = (0.7 + 0.8 * hash01(gi, gj, seed, 24)) * (bStep > 1 ? 1.2 : 1);
        if (paths.length && pathDist(x, z) < 1.4 + 1.5 * sc) continue;
        if (inClearing(x, z, -2)) continue;
        if (gen.storyBlock(x, z, 1.4, 'bush')) continue;
        bushes.push(lx, h - 0.15, lz, sc, hash01(gi, gj, seed, 25) * 6.283, 0.7 + 0.3 * hash01(gi, gj, seed, 26), 0, hash01(gi, gj, seed, 27));
      }
    }
  }

  // ---- loose boulders, denser in rock fields and on the moors
  const rStep = size <= 128 ? 1 : size <= 256 ? 2 : size <= 512 ? 4 : 0;
  if (rStep) {
    const g0x = Math.ceil(x0 / ROCK_GRID), g1x = Math.floor((x0 + size - 0.001) / ROCK_GRID);
    const g0z = Math.ceil(z0 / ROCK_GRID), g1z = Math.floor((z0 + size - 0.001) / ROCK_GRID);
    for (let gj = g0z; gj <= g1z; gj++) {
      if (((gj % rStep) + rStep) % rStep) continue;
      for (let gi = g0x; gi <= g1x; gi++) {
        if (((gi % rStep) + rStep) % rStep) continue;
        const x = (gi + 0.1 + 0.8 * hash01(gi, gj, seed, 31)) * ROCK_GRID;
        const z = (gj + 0.1 + 0.8 * hash01(gi, gj, seed, 32)) * ROCK_GRID;
        const lx = x - x0, lz = z - z0;
        if (lx < 0 || lz < 0 || lx >= size || lz >= size) continue;
        const h = meshHeight(lx, lz);
        if (h < -1) continue;
        const rk = gen.rockiness(x, z, h);
        const p = rk * 0.3 + 0.012;
        if (hash01(gi, gj, seed, 33) > p) continue;
        const big = hash01(gi, gj, seed, 34);
        const sc = (0.35 + 1.4 * big * big * big + rk * 0.6) * (rStep > 1 ? 1.4 : 1);
        if (paths.length && pathDist(x, z) < 2 + 1.1 * sc) continue;
        if (gen.storyBlock(x, z, sc * 0.9, 'rock')) continue;
        rocks.push(lx, h - sc * 0.25, lz, sc, hash01(gi, gj, seed, 35) * 6.283, 0.55 + 0.25 * hash01(gi, gj, seed, 36), 0, hash01(gi, gj, seed, 37));
      }
    }
  }

  // ---- ground detail near the camera: grass tufts and small white flowers
  if (size <= 64 && !req.propsOnly) {
    const g0x = Math.ceil(x0 / TUFT_GRID), g1x = Math.floor((x0 + size - 0.001) / TUFT_GRID);
    const g0z = Math.ceil(z0 / TUFT_GRID), g1z = Math.floor((z0 + size - 0.001) / TUFT_GRID);
    for (let gj = g0z; gj <= g1z; gj++) {
      for (let gi = g0x; gi <= g1x; gi++) {
        const x = (gi + hash01(gi, gj, seed, 41)) * TUFT_GRID;
        const z = (gj + hash01(gi, gj, seed, 42)) * TUFT_GRID;
        const lx = x - x0, lz = z - z0;
        if (lx < 0 || lz < 0 || lx >= size || lz >= size) continue;
        const h = meshHeight(lx, lz);
        // Paths stay clear of everything below: grass, flowers, reeds, glowcaps.
        if (paths.length && pathDist(x, z) < 1.4) continue;
        // Bogs: reeds in the shallows and round the pools, instead of grass.
        if (h < 1.7 && h > -0.5) {
          const bg = gen.bog(x, z);
          if (bg > 0.25) {
            if (hash01(gi, gj, seed, 61) < bg * (h < 1.05 ? 0.2 : 0.05) && !gen.storyBlock(x, z, 0, 'tuft')) {
              flowers.push(lx, h - 0.05, lz, 0.75 + 0.6 * hash01(gi, gj, seed, 62), hash01(gi, gj, seed, 63) * 6.283, 0.8 + 0.4 * hash01(gi, gj, seed, 64), 2, hash01(gi, gj, seed, 65));
            }
            continue;
          }
        }
        if (h < 1.2 || h > 200) continue;
        if (slopeY(lx, lz) < 0.82) continue;
        const r = hash01(gi, gj, seed, 43);
        // Glimmerwood: glowcaps scattered on the moss.
        if (hash01(gi, gj, seed, 66) < 0.05) {
          const gl = gen.glimmer(x, z, gen.forestDensity(x, z, h));
          if (gl > 0.3 && hash01(gi, gj, seed, 67) < gl && !gen.storyBlock(x, z, 0, 'tuft')) {
            flowers.push(lx, h - 0.02, lz, 0.8 + 0.8 * hash01(gi, gj, seed, 68), hash01(gi, gj, seed, 69) * 6.283, 0.8 + 0.4 * hash01(gi, gj, seed, 70), 3, hash01(gi, gj, seed, 71));
            continue;
          }
        }
        if (gen.storyBlock(x, z, 0, 'tuft')) continue;
        if (r < 0.32) {
          tufts.push(lx, h - 0.05, lz, 0.7 + 0.7 * hash01(gi, gj, seed, 47), hash01(gi, gj, seed, 48) * 6.283,
            0.7 + 0.6 * hash01(gi, gj, seed, 49), 0, hash01(gi, gj, seed, 50));
        }
        // Wildflowers grow among the grass: dense in patches, a few strays
        // elsewhere. Each ~10 m patch cell leans to one species, so colours
        // drift across a meadow instead of speckling.
        const fl = gen.flowers(x, z);
        if (hash01(gi, gj, seed, 51) < 0.02 + fl * 0.26) {
          const fx = lx + (hash01(gi, gj, seed, 52) - 0.5) * TUFT_GRID * 0.8;
          const fz = lz + (hash01(gi, gj, seed, 53) - 0.5) * TUFT_GRID * 0.8;
          if (fx >= 0 && fz >= 0 && fx < size && fz < size) {
            const px = Math.floor(x / 10), pz = Math.floor(z / 10);
            const sp = hash01(px, pz, seed, 54) * 0.75 + hash01(gi, gj, seed, 55) * 0.25;
            // 0 daisy (tone < 0.6), 1 harebell, else buttercup (tone > 0.6).
            const bell = sp > 0.4 && sp < 0.62 ? 1 : 0;
            const tone = sp < 0.4 ? 0.3 * hash01(gi, gj, seed, 46) : 0.65 + 0.35 * hash01(gi, gj, seed, 46);
            flowers.push(fx, meshHeight(fx, fz) - 0.02, fz, 0.8 + 0.5 * hash01(gi, gj, seed, 44), hash01(gi, gj, seed, 45) * 6.283,
              0.85 + 0.3 * hash01(gi, gj, seed, 56), bell, tone);
          }
        }
      }
    }
  }

  // ---- POIs whose centre lies in this node (so each is emitted exactly once)
  const cabins: number[] = [];
  if (size <= 2048) {
    for (const p of pois) {
      if (p.x < x0 || p.z < z0 || p.x >= x0 + size || p.z >= z0 + size) continue;
      if (p.kind === 'cabin') {
        if (p.story === 'ruin') continue; // drawn by the story (it has states)
        cabins.push(p.x - x0, p.y, p.z - z0, 1, p.rot, 1, p.variant ?? 0, 0.5);
      } else if (p.boulders) {
        // Beacon towers are drawn by story/beacons.ts (their own colours, any
        // distance); here they only collide and cast ground shadows: tone
        // + 2 hides an instance in PROP_VERT.
        const hide = p.kind === 'tower' ? 2 : 0;
        p.boulders.forEach((b) => {
          // lean = 9 tags POI boulders: never harvested (see world/harvest.ts).
          // Every boulder of a tower (8) collides in story/beacons.ts instead,
          // against its exact drawn shape: the prop colliders model a rock as a
          // column from the ground, which walled off the door boulder's room
          // and missed the stack overhead entirely.
          const lean = p.kind === 'tower' ? 8 : 9;
          rocks.push(b.x - x0, b.y, b.z - z0, b.sx, b.rot, b.sy / b.sx, lean, hide + 0.3 + 0.4 * ((b.x * 13.7 + b.z) % 1 + 1) % 1);
        });
      }
    }
  }

  return {
    id: req.id,
    positions, normals, biome, minY, maxY, hasWater,
    trees: new Float32Array(trees),
    bushes: new Float32Array(bushes),
    rocks: new Float32Array(rocks),
    tufts: new Float32Array(tufts),
    flowers: new Float32Array(flowers),
    cabins: new Float32Array(cabins),
    ms: performance.now() - t0,
  };
}
