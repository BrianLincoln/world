import { Simplex } from '../core/noise';
import { clamp, hash01, hashInt, lerp, mulberry32, smoothstep } from '../core/rng';
import { brookQuery, findStorySite, PASTURE_D, PASTURE_W, pasturePlane, RUIN_D, RUIN_W, siteToLocal, type StorySite } from './storySite';
import { buildTowerNet, HOME_VIEW, type Tower, type TowerNet } from './towers';

// The world is a pure function of (seed, x, z). Nothing here touches three.js
// so it runs identically inside chunk workers and on the main thread.

export const SEA_LEVEL = 0;
export const SNOW_LINE = 235;
export const TREE_LINE = 175;

const PEAK_CELL = 2300;
const POI_CELL = 420;

export interface Boulder {
  x: number; y: number; z: number;
  sx: number; sy: number; rot: number;
}

export interface Poi {
  kind: 'cabin' | 'circle' | 'erratic' | 'tower';
  x: number; z: number; y: number;
  rot: number;
  /** Clearing radius: trees and bushes keep out of this. */
  clear: number;
  boulders?: Boulder[];
  variant?: number;
  /** Story POIs: the broken start cabin (drawn by the story, not the chunks) and the next cabin. */
  story?: 'ruin' | 'far';
  /** Beacon towers: the tower's id in `WorldGen.towers`. */
  tower?: number;
}

export interface PathSeg { ax: number; az: number; bx: number; bz: number; /** Extra half-width (m): the journey's two-bike trails. */ wide?: number }

/** Phase 2's guided routes: polylines (x, z) and the tower they lead to second. */
export interface Journey { toHome: [number, number][]; toNext: [number, number][]; next: number }

interface Peak { x: number; z: number; h: number; r: number }

export class WorldGen {
  readonly seed: number;
  private nWarp: Simplex;
  private nCont: Simplex;
  private nHills: Simplex;
  private nHigh: Simplex;
  private nMound: Simplex;
  private nValley: Simplex;
  private nMask: Simplex;
  private nForest: Simplex;
  private nForest2: Simplex;
  private nRock: Simplex;
  private nMisc: Simplex;
  // The wild biomes (bog, glimmerwood, hollows). Seeded after the others so
  // adding them left every older noise field as it was.
  private nBog: Simplex;
  private nFen: Simplex;
  private nGlim: Simplex;
  private nHollow: Simplex;
  private nHollowMask: Simplex;
  private peakCache = new Map<number, Peak | null>();
  private poiCache = new Map<number, Poi[]>();
  private pathCache = new Map<number, PathSeg[]>();
  private _story: StorySite | null = null;
  private _journey: Journey | null = null;
  private journeyBox: [number, number, number, number] | null = null;
  private _towers: TowerNet | null = null;
  private towerCells: Map<number, number[]> | null = null;
  private bq = { d: 0, bed: 0, t: 0, i: 0 };

  constructor(seed: number) {
    this.seed = seed >>> 0;
    const r = mulberry32(this.seed);
    const s = () => Math.floor(r() * 4294967295);
    this.nWarp = new Simplex(s());
    this.nCont = new Simplex(s());
    this.nHills = new Simplex(s());
    this.nHigh = new Simplex(s());
    this.nMound = new Simplex(s());
    this.nValley = new Simplex(s());
    this.nMask = new Simplex(s());
    this.nForest = new Simplex(s());
    this.nForest2 = new Simplex(s());
    this.nRock = new Simplex(s());
    this.nMisc = new Simplex(s());
    this.nBog = new Simplex(s());
    this.nFen = new Simplex(s());
    this.nGlim = new Simplex(s());
    this.nHollow = new Simplex(s());
    this.nHollowMask = new Simplex(s());
  }

  /** The guaranteed start area (see storySite.ts). Lazily built from the base height field. */
  get story(): StorySite {
    return (this._story ??= findStorySite(this.seed, { base: (x, z) => this.baseHeight(x, z), forest: (x, z, h) => this.forestBase(x, z, h) }));
  }

  /** The beacon tower network (see towers.ts). Lazily built from the base height field. */
  get towers(): TowerNet {
    if (!this._towers) {
      this._towers = buildTowerNet(this.seed, { base: (x, z) => this.baseHeight(x, z), forest: (x, z, h) => this.forestBase(x, z, h) }, this.story);
      this.towerCells = new Map();
      for (const t of this._towers.towers) {
        const key = Math.floor(t.x / POI_CELL) * 73856093 + Math.floor(t.z / POI_CELL) * 19349663;
        const l = this.towerCells.get(key);
        if (l) l.push(t.id); else this.towerCells.set(key, [t.id]);
      }
    }
    return this._towers;
  }

  /**
   * Phase 2's journey (see story/journey.ts): the path the hearth spirit
   * leads you along from the cabin yard to the home tower's doorway, the
   * tower it takes you to next (a neighbour of home that looks back at it,
   * the nearest), and the path there. Real footpaths: drawn, and kept clear
   * of trees like any other.
   */
  get journey(): Journey {
    if (!this._journey) {
      const net = this.towers, home = net.home, st = this.story;
      const front = (t: Tower, d: number): [number, number] => [t.door.ground.x + Math.sin(t.yaw) * d, t.door.ground.z + Math.cos(t.yaw) * d];
      const yard: [number, number] = [st.x + Math.sin(st.rot) * 9, st.z + Math.cos(st.rot) * 9];
      const links = home.links.map((i) => net.towers[i]);
      const score = (t: Tower) => Math.hypot(t.x - home.x, t.z - home.z) * (t.parent === home.id ? 1 : 1.6);
      const next = links.sort((a, b) => score(a) - score(b))[0] ?? net.towers[1];
      const leg = (pts: [number, number][]) => {
        const out: [number, number][] = [];
        for (let i = 0; i + 1 < pts.length; i++) {
          const seg = this.route(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
          out.push(...(out.length ? seg.slice(1) : seg));
        }
        return out;
      };
      // The last stretch to each doorway runs straight in from the front.
      const toHome = [...leg([yard, front(home, 30)]), front(home, 0)];
      const toNext = [front(home, 0), ...leg([front(home, 26), front(next, 30)]), front(next, 0)];
      this._journey = { toHome, toNext, next: next.id };
    }
    return this._journey;
  }

  /**
   * A route for the journey's paths from a to b: A* over an 8 m grid that
   * never crosses water (the sea, lakes, the story brook) or goes through the
   * cabin, the story's trees and stones, other landmarks or any tower's rock,
   * and prefers gentle, open ground (a kid bikes it, beside the spirit). Then
   * pulled straight where the way is clear and rounded at the corners.
   */
  private route(ax: number, az: number, bx: number, bz: number): [number, number][] {
    const C = 8;
    const d = Math.hypot(bx - ax, bz - az);
    const pad = Math.max(120, d * 0.4);
    const x0 = Math.min(ax, bx) - pad, z0 = Math.min(az, bz) - pad;
    const W = Math.ceil((Math.max(ax, bx) + pad - x0) / C) + 1, H = Math.ceil((Math.max(az, bz) + pad - z0) / C) + 1;
    // Things to keep off: centres and radii.
    const avoid: number[] = [];
    const st = this.story;
    this.poiCellRange(x0, z0, x0 + W * C, z0 + H * C, (p) => {
      if (p.kind === 'tower') for (const b of p.boulders!) avoid.push(b.x, b.z, b.sx + 3);
      else if (p.kind === 'cabin') avoid.push(p.x, p.z, p.story === 'ruin' ? 7.5 : 9);
      else if (p.boulders) for (const b of p.boulders) avoid.push(b.x, b.z, b.sx + 2.5);
    });
    for (const t of st.trees) avoid.push(t.x, t.z, 4.5);
    const pa = st.pasture;
    const inPasture = (x: number, z: number) => {
      if (!pa) return false;
      const l = siteToLocal(pa, x, z);
      return Math.abs(l.x) < PASTURE_W / 2 + 5 && Math.abs(l.z) < PASTURE_D / 2 + 5;
    };
    for (const b of st.boulders) avoid.push(b.x, b.z, 3.5);
    avoid.push(st.stump.x, st.stump.z, 2.5);
    const wet = (x: number, z: number) => this.tameHeight(x, z) < 2.2 || this.brookDist(x, z) < 5.5;
    const blockedAt = (x: number, z: number) => {
      if (wet(x, z) || inPasture(x, z)) return true;
      for (let k = 0; k < avoid.length; k += 3) if (Math.hypot(x - avoid[k], z - avoid[k + 1]) < avoid[k + 2]) return true;
      return false;
    };
    const costs = new Float32Array(W * H).fill(-1);
    const cost = (i: number, j: number) => {
      const k = j * W + i;
      if (costs[k] >= 0) return costs[k];
      const x = x0 + i * C, z = z0 + j * C;
      let c: number;
      // Keep a bike's width of dry ground either side too.
      if (blockedAt(x, z) || wet(x + 4, z) || wet(x - 4, z) || wet(x, z + 4) || wet(x, z - 4)) c = Infinity;
      else {
        const h = this.tameHeight(x, z);
        const sl = Math.max(Math.abs(this.tameHeight(x + 4, z) - this.tameHeight(x - 4, z)), Math.abs(this.tameHeight(x, z + 4) - this.tameHeight(x, z - 4))) / 8;
        c = 1 + 14 * sl * sl + 1.2 * this.forestBase(x, z, h);
      }
      costs[k] = c;
      return c;
    };
    const cell = (x: number, z: number) => [Math.round((x - x0) / C), Math.round((z - z0) / C)];
    const [si, sj] = cell(ax, az), [ei, ej] = cell(bx, bz);
    const start = sj * W + si, goal = ej * W + ei;
    costs[start] = costs[goal] = 1;
    // A* with a binary heap.
    const g = new Float32Array(W * H).fill(Infinity);
    const from = new Int32Array(W * H).fill(-1);
    const heap: number[] = [], hf: number[] = [];
    const push = (n: number, f: number) => {
      heap.push(n); hf.push(f);
      let i = heap.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= hf[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hf[p], hf[i]] = [hf[i], hf[p]]; i = p; }
    };
    const pop = () => {
      const top = heap[0];
      const ln = heap.pop()!, lf = hf.pop()!;
      if (heap.length) {
        heap[0] = ln; hf[0] = lf;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && hf[l] < hf[m]) m = l;
          if (r < heap.length && hf[r] < hf[m]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]]; [hf[m], hf[i]] = [hf[i], hf[m]]; i = m;
        }
      }
      return top;
    };
    const hEst = (n: number) => Math.hypot((n % W) - ei, Math.floor(n / W) - ej);
    g[start] = 0;
    push(start, hEst(start));
    const closed = new Uint8Array(W * H);
    let found = false;
    for (let it = 0; heap.length && it < 400000; it++) {
      const n = pop();
      if (closed[n]) continue;
      closed[n] = 1;
      if (n === goal) { found = true; break; }
      const i = n % W, j = Math.floor(n / W);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const m = nj * W + ni;
        if (closed[m]) continue;
        const c = cost(ni, nj);
        if (c === Infinity) continue;
        const ng = g[n] + (di && dj ? 1.414 : 1) * (c + cost(i, j)) * 0.5;
        if (ng < g[m]) { g[m] = ng; from[m] = n; push(m, ng + hEst(m)); }
      }
    }
    if (!found) return [[ax, az], [bx, bz]];
    const cells: [number, number][] = [];
    for (let n = goal; n >= 0; n = from[n]) cells.push([x0 + (n % W) * C, z0 + Math.floor(n / W) * C]);
    cells.reverse();
    cells[0] = [ax, az];
    cells[cells.length - 1] = [bx, bz];
    // Pull it straight where the straight way is clear, in runs of up to 45 m.
    const clearLine = (p: [number, number], q: [number, number]) => {
      const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 3);
      for (let k = 1; k < n; k++) {
        const x = p[0] + (q[0] - p[0]) * (k / n), z = p[1] + (q[1] - p[1]) * (k / n);
        if (blockedAt(x, z)) return false;
      }
      return true;
    };
    const pulled: [number, number][] = [cells[0]];
    let i = 0;
    while (i < cells.length - 1) {
      let j = i + 1;
      for (let k = cells.length - 1; k > i + 1; k--) {
        if (Math.hypot(cells[k][0] - cells[i][0], cells[k][1] - cells[i][1]) <= 45 && clearLine(cells[i], cells[k])) { j = k; break; }
      }
      pulled.push(cells[j]);
      i = j;
    }
    // Round the corners (Chaikin, twice), keeping the ends.
    let line = pulled;
    for (let r = 0; r < 2; r++) {
      const out: [number, number][] = [line[0]];
      for (let k = 0; k + 1 < line.length; k++) {
        const [px, pz] = line[k], [qx, qz] = line[k + 1];
        const a: [number, number] = [px * 0.75 + qx * 0.25, pz * 0.75 + qz * 0.25], b: [number, number] = [px * 0.25 + qx * 0.75, pz * 0.25 + qz * 0.75];
        if (k > 0) out.push(blockedAt(a[0], a[1]) ? line[k] : a);
        if (k + 1 < line.length - 1) out.push(blockedAt(b[0], b[1]) ? line[k + 1] : b);
      }
      out.push(line[line.length - 1]);
      line = out;
    }
    return line;
  }

  /** Distance to the nearest beacon tower's centre (towers near (x, z) only; Infinity if none within `max`). */
  towerDist(x: number, z: number, max = 400): number {
    const net = this.towers;
    let d = Infinity;
    const cx = Math.floor(x / POI_CELL), cz = Math.floor(z / POI_CELL);
    const n = Math.ceil(max / POI_CELL);
    for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) {
      for (const id of this.towerCells!.get((cx + dx) * 73856093 + (cz + dz) * 19349663) ?? []) {
        const t = net.towers[id];
        d = Math.min(d, Math.hypot(t.x - x, t.z - z));
      }
    }
    return d;
  }

  // ---------------------------------------------------------------- terrain

  /** Land factor 0 (open sea) .. 1 (inland). */
  landAt(x: number, z: number): number {
    const c = this.nCont.fbm(x / 5600 + 3.1, z / 5600 - 1.7, 4);
    return smoothstep(-0.2, 0.1, c + 0.08);
  }

  /** Height without POI flattening. */
  baseHeight(x: number, z: number): number {
    const nw = this.nWarp;
    const wx = x + 220 * nw.fbm(x / 1500, z / 1500, 3);
    const wz = z + 220 * nw.fbm(x / 1500 + 41.3, z / 1500 - 17.9, 3);

    const land = this.landAt(wx, wz);
    let h = lerp(-34, 5, land);

    // Gently rolling hills everywhere on land, softer at sea.
    const hills = this.nHills.fbm(wx / 560, wz / 560, 4);
    h += hills * 30 * (0.3 + 0.7 * land);

    // Highland massifs: rounded mounds, squared for soft bases.
    const hlRaw = this.nHigh.fbm(wx / 3200 + 11, wz / 3200 - 7, 3);
    const hl = smoothstep(-0.02, 0.4, hlRaw) * land;
    const mound = this.nMound.fbm(wx / 1250, wz / 1250, 4) * 0.5 + 0.55;
    h += hl * mound * mound * 230;

    // Small undulation so near ground is never glassy-flat.
    h += this.nHills.fbm(wx / 120 + 5, wz / 120 + 9, 2) * 2.2;

    // A few dominant peaks (landmarks visible from far away).
    h += this.peaks(wx, wz) * (0.35 + 0.65 * land);

    // Valley network -> fjords in the highlands, rivers/lakes in lowlands.
    const vx = wx + 300 * nw.noise(wz / 2600, wx / 2600);
    const vz = wz + 300 * nw.noise(wx / 2600 + 9, wz / 2600 + 3);
    const v = Math.abs(this.nValley.fbm(vx / 2600, vz / 2600, 3));
    const mask = smoothstep(-0.12, 0.2, this.nMask.fbm(x / 5200 - 7, z / 5200 + 2, 2));
    const width = 0.035 + 0.035 * mask;
    // U profile: k = (1 - t^2)^2 -> flat floor, smooth rim, steepest mid-wall.
    const t = Math.min(1, v / (width * 3));
    const k = (1 - t * t) * (1 - t * t) * mask;
    if (k > 0) {
      const floor = -8 - 22 * hl;
      h = lerp(h, Math.min(h, floor), k);
    }
    return h;
  }

  private peakInCell(cx: number, cz: number): Peak | null {
    const key = cx * 73856093 + cz * 19349663;
    const cached = this.peakCache.get(key);
    if (cached !== undefined) return cached;
    let p: Peak | null = null;
    if (hash01(cx, cz, this.seed, 11) < 0.55) {
      p = {
        x: (cx + 0.2 + 0.6 * hash01(cx, cz, this.seed, 12)) * PEAK_CELL,
        z: (cz + 0.2 + 0.6 * hash01(cx, cz, this.seed, 13)) * PEAK_CELL,
        h: 230 + 360 * hash01(cx, cz, this.seed, 14),
        r: 650 + 450 * hash01(cx, cz, this.seed, 15),
      };
    }
    this.peakCache.set(key, p);
    return p;
  }

  private peaks(x: number, z: number): number {
    const cx = Math.floor(x / PEAK_CELL);
    const cz = Math.floor(z / PEAK_CELL);
    let sum = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const p = this.peakInCell(cx + dx, cz + dz);
        if (!p) continue;
        const ddx = x - p.x;
        const ddz = z - p.z;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 > p.r * p.r * 1.6) continue;
        // Irregular radius so peaks get ridges and shoulders, not cones.
        const ang = Math.atan2(ddz, ddx);
        const wob = 1 + 0.22 * Math.sin(ang * 3 + p.h) + 0.12 * Math.sin(ang * 5 + p.r);
        const d = Math.sqrt(d2);
        const s = d / (p.r * wob);
        // Concave flanks, softly rounded summit. Where the wobble pushes the
        // flank past the cull radius, taper the tail to zero rather than
        // clipping it: a hard cut left a sheer 20 m wall around the peak.
        const tail = 1 - smoothstep(0.7, 1, d / (p.r * 1.2649));
        sum += p.h * Math.exp(-Math.pow(s * 2.3, 1.45)) * tail;
      }
    }
    return sum;
  }

  /** Final ground height including flattened pads under cabins. */
  height(x: number, z: number): number {
    return this.heightOf(x, z, true);
  }

  /**
   * The ground without the wild biomes: what the journey's routes are planned
   * on (the bogs and hollows then keep clear of those routes, see wildRoom).
   */
  private tameHeight(x: number, z: number): number {
    return this.heightOf(x, z, false);
  }

  private heightOf(x: number, z: number, wild: boolean): number {
    let h = this.baseHeight(x, z);
    if (wild) h += this.wildCarve(x, z, h);
    const cx = Math.floor(x / POI_CELL);
    const cz = Math.floor(z / POI_CELL);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const pois = this.poisInCell(cx + dx, cz + dz);
        for (let i = 0; i < pois.length; i++) {
          const p = pois[i];
          if (p.kind !== 'cabin') continue;
          const ddx = x - p.x;
          const ddz = z - p.z;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 > 900) continue;
          const w = 1 - smoothstep(7, 24, Math.sqrt(d2));
          h = lerp(h, p.y, w);
        }
      }
    }
    const st = this.story;
    // The pasture: eased onto its gentle plane, blending out over 10 m.
    const pa = st.pasture;
    if (pa && Math.abs(x - pa.x) < 40 && Math.abs(z - pa.z) < 40) {
      const l = siteToLocal(pa, x, z);
      const e = Math.hypot(Math.max(0, Math.abs(l.x) - PASTURE_W / 2 - 2), Math.max(0, Math.abs(l.z) - PASTURE_D / 2 - 2));
      if (e < 10) h = lerp(h, pasturePlane(pa, l.x, l.z), 1 - smoothstep(0, 10, e));
    }
    // The story brook: a channel with sandy banks, carved into whatever is there.
    if (st.brook.length && x > st.box[0] && x < st.box[2] && z > st.box[1] && z < st.box[3]) {
      const q = brookQuery(st.brook, x, z, this.bq);
      if (q.d < 5.2) h = Math.min(h, q.bed + (h - q.bed) * smoothstep(1.2, 5.2, q.d));
    }
    return h;
  }

  /** Distance to the story set's own footpaths (the approach, the yard, the bank). */
  storyPathDist(x: number, z: number): number {
    const st = this.story;
    if (x < st.box[0] || x > st.box[2] || z < st.box[1] || z > st.box[3]) return Infinity;
    let d = Infinity;
    for (const p of st.paths) d = Math.min(d, segDist(x, z, p));
    return d;
  }

  /** Distance to the story brook's centre line (Infinity when far). */
  brookDist(x: number, z: number): number {
    const st = this.story;
    if (!st.brook.length || x < st.box[0] || x > st.box[2] || z < st.box[1] || z > st.box[3]) return Infinity;
    return brookQuery(st.brook, x, z, this.bq).d;
  }

  /**
   * Keeps world scatter out of the story set: the cabin and its yard, the
   * brook channel, the choppable trees, the axe stump and the spawn.
   * `kind`: 'tree' | 'bush' | 'rock' | 'tuft'. `r` = the prop's radius.
   */
  storyBlock(x: number, z: number, r: number, kind: 'tree' | 'bush' | 'rock' | 'tuft'): boolean {
    const st = this.story;
    // A view corridor from the yard to the home tower (see towers.ts).
    if (kind === 'tree' || kind === 'bush') {
      const net = this.towers, y = net.yard, h = net.home;
      const dx = h.x - y.x, dz = h.z - y.z, dl = Math.hypot(dx, dz);
      const t = ((x - y.x) * dx + (z - y.z) * dz) / dl;
      if (t > -2 && t < HOME_VIEW && Math.abs((x - y.x) * dz - (z - y.z) * dx) / dl < 4 + r + t * 0.05) return true;
    }
    if (x < st.box[0] || x > st.box[2] || z < st.box[1] || z > st.box[3]) return false;
    // The pasture is open grass: nothing else in it, and bare ground under the stable.
    const pa = st.pasture;
    if (pa) {
      const q = siteToLocal(pa, x, z);
      const m = kind === 'tuft' ? -0.6 : kind === 'rock' ? 4 : kind === 'tree' ? 5 : 3;
      if (Math.abs(q.x) < PASTURE_W / 2 + m + r && Math.abs(q.z) < PASTURE_D / 2 + m + r) {
        if (kind !== 'tuft') return true;
        if (q.x * pa.end > PASTURE_W / 2 - 7 && Math.abs(q.z) < 6) return true;
      }
    }
    const l = siteToLocal(st, x, z);
    const pad = kind === 'tuft' ? 0.4 : kind === 'rock' ? 3 : 1.5;
    if (Math.abs(l.x) < RUIN_W / 2 + pad + r + (kind === 'tuft' ? 0 : 1.2) && Math.abs(l.z) < RUIN_D / 2 + pad + r) return true;
    const bd = this.brookDist(x, z);
    if (bd < (kind === 'tuft' ? 2.7 : kind === 'rock' ? 5.5 : 4.6) + r) return true;
    if (kind === 'tuft') return this.storyPathDist(x, z) < 2.1;
    for (const t of st.trees) if (Math.hypot(t.x - x, t.z - z) < 3.4 + r) return true;
    if (Math.hypot(st.stump.x - x, st.stump.z - z) < 2.5 + r) return true;
    // The start clearing in the woods.
    if (Math.hypot(st.spawn.x - x, st.spawn.z - z) < (kind === 'rock' ? 6 : 9) + r) return true;
    if (Math.hypot(st.bank.x - x, st.bank.z - z) < 3.5 + r) return true;
    for (const b of st.boulders) if (Math.hypot(b.x - x, b.z - z) < 3.2 + r) return true;
    // The story's paths are wide, trodden and clear.
    const pd = this.storyPathDist(x, z);
    if (kind === 'tree' && pd < 5 + r) return true;
    if (kind === 'bush' && pd < 3.6 + r) return true;
    if (kind === 'rock' && pd < 2.6 + r) return true;
    // A view corridor from the lookout toward the far cabin's light.
    if (kind === 'tree' || kind === 'bush') {
      const lx = st.lookout.x, lz = st.lookout.z;
      const dx = st.far.x - lx, dz = st.far.z - lz, dl = Math.hypot(dx, dz);
      const t = ((x - lx) * dx + (z - lz) * dz) / dl;
      if (t > -2 && t < 125 && Math.abs((x - lx) * dz - (z - lz) * dx) / dl < 3.5 + r + t * 0.03) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- biomes

  /** 0..1 grove density. Clustered, with hard-ish edges and inner clearings. Bogs thin it out. */
  forestDensity(x: number, z: number, h: number): number {
    const d = this.forestBase(x, z, h);
    if (d <= 0) return d;
    return d * (1 - 0.85 * this.bog(x, z));
  }

  /** The forest field before the wild biomes (what the story, towers and POIs were placed on). */
  private forestBase(x: number, z: number, h: number): number {
    const f = this.nForest.fbm(x / 460, z / 460, 4) + 0.25 * this.nForest2.noise(x / 90, z / 90);
    let d = smoothstep(0.0, 0.16, f + 0.02);
    d *= 1 - smoothstep(TREE_LINE - 45, TREE_LINE, h);
    d *= smoothstep(1.8, 4.5, h);
    return d;
  }

  // ---------------------------------------------------------------- wild biomes
  //
  // Three biomes where the wilder creatures live, carved into the base height
  // (so the story site, the towers and the POIs, placed on the base, stay
  // where they were):
  //  - bogs: low wet fens eased down to a hair above the water, pocked with
  //    pools and meres, reeds instead of grass, few trees;
  //  - glimmerwood: patches of forest with teal moss and glowcaps that shine
  //    after dark;
  //  - the hollows: long, narrow, steep-walled ravines cut into the hills, a
  //    dim floor between rock walls.
  // None of them reaches the story site or a beacon tower's hill.

  /** 0..1: how far from the story set and the towers the wild biomes may reach. */
  private wildRoom(x: number, z: number): number {
    const b = this.story.box;
    const ds = Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - z, 0, z - b[3]));
    let k = smoothstep(40, 110, ds);
    if (k > 0) k *= smoothstep(110, 170, this.towerDist(x, z, 200));
    // Nor round the cabins, stone circles and erratics (placed on the base
    // height, so they'd float over a hollow or sink into a bog).
    if (k > 0) {
      const cx = Math.floor(x / POI_CELL), cz = Math.floor(z / POI_CELL);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        for (const p of this.poisInCell(cx + dx, cz + dz)) {
          if (p.kind === 'tower') continue;
          k *= smoothstep(p.clear + 8, p.clear + 45, Math.hypot(x - p.x, z - p.z));
        }
      }
    }
    // Nor the journey's guided routes (a kid bikes those beside the spirit).
    if (k > 0) {
      const j = this.journey;
      const bb = (this.journeyBox ??= journeyBox(j));
      if (x > bb[0] && x < bb[2] && z > bb[1] && z < bb[3]) {
        let d = Infinity;
        for (const line of [j.toHome, j.toNext]) for (let i = 0; i + 1 < line.length; i++) {
          d = Math.min(d, segDist(x, z, { ax: line[i][0], az: line[i][1], bx: line[i + 1][0], bz: line[i + 1][1] }));
        }
        k *= smoothstep(25, 70, d);
      }
    }
    return k;
  }

  /** Bog mask from the base height (0..1, before `wildRoom`). */
  private bogMask(x: number, z: number, hBase: number, m = this.bogNoise(x, z)): number {
    if (hBase < 0.6 || hBase > 34 || m <= 0.14) return 0;
    return smoothstep(0.14, 0.32, m) * smoothstep(0.6, 3, hBase) * (1 - smoothstep(14, 34, hBase));
  }

  private bogNoise(x: number, z: number): number {
    return this.nBog.fbm(x / 1100 - 3.3, z / 1100 + 8.1, 3);
  }

  /** Hollow depth factor from the base height (0..1 at the floor, before `wildRoom`), and the wall depth. */
  private hollowAt(x: number, z: number, hBase: number): number {
    if (hBase < 16 || hBase > 400) return 0;
    const mask = smoothstep(0.0, 0.18, this.nHollowMask.fbm(x / 2600 + 2.2, z / 2600 - 5.4, 2)) * smoothstep(16, 32, hBase) * (1 - smoothstep(320, 400, hBase));
    if (mask <= 0) return 0;
    const r = Math.abs(this.nHollow.fbm(x / 760, z / 760, 2));
    // A flat floor, then steep walls up to the rim.
    return mask * (1 - smoothstep(0.015, 0.1, r));
  }

  /** How much the wild biomes raise (+) or lower (-) the base height here (m). */
  private wildCarve(x: number, z: number, hBase: number): number {
    const bm = this.bogMask(x, z, hBase);
    const hm = this.hollowAt(x, z, hBase);
    if (bm <= 0 && hm <= 0) return 0;
    const room = this.wildRoom(x, z);
    if (room <= 0) return 0;
    let dh = 0;
    if (bm > 0) {
      // The fen: a hair above the water, with pools (small) and meres (big).
      const fen = 0.45 + 1.4 * this.nFen.fbm(x / 34, z / 34, 2) + 1.2 * this.nFen.noise(x / 170 + 9.7, z / 170 - 4.1);
      const k = bm * room;
      dh += (Math.min(fen, 1.4) - hBase) * smoothstep(0, 1, k);
    }
    if (hm > 0) {
      const depth = Math.min(22, hBase - 4);
      dh -= depth * smoothstep(0, 1, hm) * room;
    }
    return dh;
  }

  /** 0..1 bog wetland here (for scatter, colour and creatures). */
  bog(x: number, z: number): number {
    const n = this.bogNoise(x, z);
    if (n <= 0.14) return 0;
    const m = this.bogMask(x, z, this.baseHeight(x, z), n);
    return m > 0 ? m * this.wildRoom(x, z) : 0;
  }

  /** 0..1 glimmerwood: enchanted forest patches (given the forest density there). */
  glimmer(x: number, z: number, forest: number): number {
    if (forest < 0.2) return 0;
    return smoothstep(0.2, 0.36, this.nGlim.fbm(x / 820 + 1.9, z / 820 + 6.6, 2)) * smoothstep(0.2, 0.5, forest);
  }

  /** 0..1 inside a hollow (1 = on its floor). */
  hollow(x: number, z: number): number {
    if (this.nHollowMask.fbm(x / 2600 + 2.2, z / 2600 - 5.4, 2) <= 0) return 0;
    const hb = this.baseHeight(x, z);
    const m = this.hollowAt(x, z, hb);
    return m > 0 ? m * this.wildRoom(x, z) : 0;
  }

  /** 0..1 boulder field strength. */
  rockiness(x: number, z: number, h: number): number {
    const r = this.nRock.fbm(x / 300, z / 300, 3);
    return clamp(smoothstep(0.12, 0.45, r) + smoothstep(90, 200, h) * 0.6, 0, 1);
  }

  /** 0..1 meadow flower patches. */
  flowers(x: number, z: number): number {
    return smoothstep(0.25, 0.55, this.nMisc.noise(x / 70, z / 70));
  }

  // ---------------------------------------------------------------- POIs

  poisInCell(cx: number, cz: number): Poi[] {
    const key = cx * 73856093 + cz * 19349663;
    const cached = this.poiCache.get(key);
    if (cached) return cached;
    const out: Poi[] = [];
    this.poiCache.set(key, out); // set early: baseHeight never re-enters here
    const rnd = mulberry32(hashInt(cx, cz, this.seed, 101));
    const x0 = cx * POI_CELL;
    const z0 = cz * POI_CELL;
    const inCell = () => [x0 + 50 + rnd() * (POI_CELL - 100), z0 + 50 + rnd() * (POI_CELL - 100)];

    const flatEnough = (x: number, z: number, h: number, lim: number) => {
      const a = this.baseHeight(x + 7, z) - this.baseHeight(x - 7, z);
      const b = this.baseHeight(x, z + 7) - this.baseHeight(x, z - 7);
      const c = this.baseHeight(x + 5, z + 5) - h;
      return Math.abs(a) < lim && Math.abs(b) < lim && Math.abs(c) < lim;
    };

    // Cabins: on gentle ground above the shore, below the high moors.
    if (rnd() < 0.5) {
      for (let tries = 0; tries < 5; tries++) {
        const [x, z] = inCell();
        const h = this.baseHeight(x, z);
        if (h < 3 || h > 150 || !flatEnough(x, z, h, 3.2)) continue;
        // Meadow or a grove's edge, never deep forest.
        if (this.forestBase(x, z, h) > 0.45) continue;
        out.push({ kind: 'cabin', x, z, y: h + 0.05, rot: rnd() * Math.PI * 2, clear: 22, variant: Math.floor(rnd() * 3) });
        // Occasionally a neighbour: a tiny hamlet.
        if (rnd() < 0.3) {
          const a = rnd() * Math.PI * 2;
          const d = 24 + rnd() * 12;
          const x2 = x + Math.cos(a) * d;
          const z2 = z + Math.sin(a) * d;
          const h2 = this.baseHeight(x2, z2);
          if (h2 > 3 && Math.abs(h2 - h) < 5 && flatEnough(x2, z2, h2, 3.2)) {
            out.push({ kind: 'cabin', x: x2, z: z2, y: h2 + 0.05, rot: rnd() * Math.PI * 2, clear: 14, variant: Math.floor(rnd() * 3) });
          }
        }
        break;
      }
    }

    // Standing stone circles on open meadow.
    if (rnd() < 0.08) {
      const [x, z] = inCell();
      const h = this.baseHeight(x, z);
      if (h > 4 && h < 130 && flatEnough(x, z, h, 3) && this.forestBase(x, z, h) < 0.2) {
        const boulders: Boulder[] = [];
        const n = 7 + Math.floor(rnd() * 4);
        const R = 7 + rnd() * 3;
        for (let k = 0; k < n; k++) {
          if (rnd() < 0.12) continue; // a fallen gap
          const a = (k / n) * Math.PI * 2;
          const bx = x + Math.cos(a) * R;
          const bz = z + Math.sin(a) * R;
          const sy = 1.6 + rnd() * 1.2;
          boulders.push({ x: bx, y: this.baseHeight(bx, bz) + sy * 0.6, z: bz, sx: 0.75 + rnd() * 0.3, sy, rot: a });
        }
        out.push({ kind: 'circle', x, z, y: h, rot: 0, clear: R + 4, boulders });
      }
    }

    // Lone glacial erratics: one huge pebble in the open.
    if (rnd() < 0.18) {
      const [x, z] = inCell();
      const h = this.baseHeight(x, z);
      if (h > 3) {
        const r = 3.5 + rnd() * 4;
        out.push({
          kind: 'erratic', x, z, y: h, rot: 0, clear: r + 3,
          boulders: [{ x, y: h + r * 0.25, z, sx: r, sy: r * (0.6 + rnd() * 0.2), rot: rnd() * Math.PI }],
        });
      }
    }

    // The story set: nothing natural too close to it, plus its own POIs.
    const st = this.story;
    const keep = out.filter((p) => Math.hypot(p.x - st.x, p.z - st.z) > 110 && Math.hypot(p.x - st.far.x, p.z - st.far.z) > 45 &&
      !(p.x > st.box[0] - 20 && p.x < st.box[2] + 20 && p.z > st.box[1] - 20 && p.z < st.box[3] + 20));
    out.length = 0;
    // Nothing else crowds a beacon tower's hilltop.
    out.push(...keep.filter((p) => this.towerDist(p.x, p.z, 120) > 90));
    void this.towers;
    for (const id of this.towerCells!.get(key) ?? []) {
      const t = this.towers.towers[id];
      out.push({ kind: 'tower', tower: id, x: t.x, z: t.z, y: t.y, rot: t.yaw, clear: t.foot * 1.5 + 16, boulders: [...t.boulders, t.head] });
    }
    const inThis = (x: number, z: number) => Math.floor(x / POI_CELL) === cx && Math.floor(z / POI_CELL) === cz;
    if (inThis(st.x, st.z)) out.push({ kind: 'cabin', story: 'ruin', x: st.x, z: st.z, y: st.y, rot: st.rot, clear: 13, variant: 0 });
    if (inThis(st.far.x, st.far.z)) out.push({ kind: 'cabin', story: 'far', x: st.far.x, z: st.far.z, y: st.far.y, rot: st.far.rot, clear: 40, variant: 0 });
    if (inThis(st.spring.x, st.spring.z) && st.brook.length) {
      // A couple of mossy boulders where the brook wells up.
      const sx = st.spring.x, sz = st.spring.z;
      const bh = this.baseHeight(sx, sz);
      const dx = st.brook[1].x - st.brook[0].x, dz = st.brook[1].z - st.brook[0].z;
      const l = Math.hypot(dx, dz) || 1;
      out.push({
        kind: 'erratic', x: sx, z: sz, y: bh, rot: 0, clear: 0,
        boulders: [
          { x: sx - (dz / l) * 1.6, y: bh + 0.3, z: sz + (dx / l) * 1.6, sx: 1.7, sy: 1.25, rot: 0.4 },
          { x: sx + (dz / l) * 1.9, y: bh + 0.1, z: sz - (dx / l) * 1.9, sx: 1.25, sy: 0.9, rot: 1.9 },
          { x: sx - (dx / l) * 0.9, y: bh + 0.2, z: sz - (dz / l) * 0.9, sx: 1.1, sy: 0.85, rot: 2.7 },
        ],
      });
    }
    return out;
  }

  poiCellRange(x0: number, z0: number, x1: number, z1: number, cb: (p: Poi) => void) {
    const c0x = Math.floor(x0 / POI_CELL);
    const c0z = Math.floor(z0 / POI_CELL);
    const c1x = Math.floor(x1 / POI_CELL);
    const c1z = Math.floor(z1 / POI_CELL);
    for (let cz = c0z; cz <= c1z; cz++) for (let cx = c0x; cx <= c1x; cx++) {
      for (const p of this.poisInCell(cx, cz)) cb(p);
    }
  }

  // ---------------------------------------------------------------- paths

  /**
   * Footpaths join each cabin to its nearest neighbour cabin. Each cell owns
   * the paths leaving its own cabins, so the network is deterministic and
   * independent of which chunk asks first.
   */
  pathsFromCell(cx: number, cz: number): PathSeg[] {
    const key = cx * 73856093 + cz * 19349663;
    const cached = this.pathCache.get(key);
    if (cached) return cached;
    const segs: PathSeg[] = [];
    const mine = this.poisInCell(cx, cz).filter((p) => p.kind === 'cabin' && p.story !== 'ruin');
    for (const a of mine) {
      const cands: Poi[] = [];
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        for (const p of this.poisInCell(cx + dx, cz + dz)) {
          if (p !== a && p.story !== 'ruin' && (p.kind === 'cabin' || p.kind === 'circle' || p.kind === 'tower')) cands.push(p);
        }
      }
      cands.sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z));
      // Nearest two destinations: gives a loose network, not a tree of stubs.
      let made = 0;
      for (const b of cands) {
        if (made >= 2) break;
        const d = Math.hypot(b.x - a.x, b.z - a.z);
        if (d > 950 || d < 20) continue;
        const pts = this.tracePath(a.x, a.z, b.x, b.z);
        if (!pts) continue;
        for (let i = 0; i + 1 < pts.length; i++) {
          segs.push({ ax: pts[i][0], az: pts[i][1], bx: pts[i + 1][0], bz: pts[i + 1][1] });
        }
        made++;
      }
    }
    this.pathCache.set(key, segs);
    return segs;
  }

  /** Meandering polyline between two points, or null if it would cross water. */
  private tracePath(ax: number, az: number, bx: number, bz: number, wiggle = 0.12): [number, number][] | null {
    // Canonical direction so A->B and B->A trace the identical line.
    if (ax > bx || (ax === bx && az > bz)) {
      [ax, bx] = [bx, ax];
      [az, bz] = [bz, az];
    }
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.max(4, Math.ceil(d / 10));
    const px = -(bz - az) / d;
    const pz = (bx - ax) / d;
    const pts: [number, number][] = [];
    const amp = Math.min(40, d * wiggle);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const env = Math.sin(t * Math.PI);
      const wig = this.nMisc.noise(ax * 0.01 + t * d / 90, az * 0.01 + 3.3) * amp * env;
      const x = lerp(ax, bx, t) + px * wig;
      const z = lerp(az, bz, t) + pz * wig;
      if (i % 3 === 0) {
        const h = this.baseHeight(x, z);
        if (h < 1.2 || h > 190) return null;
      }
      pts.push([x, z]);
    }
    return pts;
  }

  pathsInRange(x0: number, z0: number, x1: number, z1: number, margin: number): PathSeg[] {
    const out: PathSeg[] = [];
    const c0x = Math.floor((x0 - 1000) / POI_CELL);
    const c0z = Math.floor((z0 - 1000) / POI_CELL);
    const c1x = Math.floor((x1 + 1000) / POI_CELL);
    const c1z = Math.floor((z1 + 1000) / POI_CELL);
    for (let cz = c0z; cz <= c1z; cz++) for (let cx = c0x; cx <= c1x; cx++) {
      for (const s of this.pathsFromCell(cx, cz)) {
        const minx = Math.min(s.ax, s.bx) - margin;
        const maxx = Math.max(s.ax, s.bx) + margin;
        const minz = Math.min(s.az, s.bz) - margin;
        const maxz = Math.max(s.az, s.bz) + margin;
        if (maxx < x0 || minx > x1 || maxz < z0 || minz > z1) continue;
        out.push(s);
      }
    }
    // The journey's paths (cabin -> home tower -> the next tower).
    const j = this.journey;
    for (const line of [j.toHome, j.toNext]) {
      for (let i = 0; i + 1 < line.length; i++) {
        const [ax, az] = line[i], [bx, bz] = line[i + 1];
        if (Math.max(ax, bx) + margin < x0 || Math.min(ax, bx) - margin > x1 || Math.max(az, bz) + margin < z0 || Math.min(az, bz) - margin > z1) continue;
        out.push({ ax, az, bx, bz, wide: 1.2 });
      }
    }
    // The story cabin's own little worn paths.
    for (const s of this.story.paths) {
      if (Math.max(s.ax, s.bx) + margin < x0 || Math.min(s.ax, s.bx) - margin > x1 || Math.max(s.az, s.bz) + margin < z0 || Math.min(s.az, s.bz) - margin > z1) continue;
      out.push(s);
    }
    return out;
  }
}

/** Bounding box of the journey's routes, padded by the wild biomes' reach. */
function journeyBox(j: Journey): [number, number, number, number] {
  const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const line of [j.toHome, j.toNext]) for (const [x, z] of line) {
    b[0] = Math.min(b[0], x - 80); b[1] = Math.min(b[1], z - 80);
    b[2] = Math.max(b[2], x + 80); b[3] = Math.max(b[3], z + 80);
  }
  return b;
}

export function segDist(x: number, z: number, s: PathSeg): number {
  const vx = s.bx - s.ax;
  const vz = s.bz - s.az;
  const wx = x - s.ax;
  const wz = z - s.az;
  const l2 = vx * vx + vz * vz;
  const t = l2 > 0 ? clamp((wx * vx + wz * vz) / l2, 0, 1) : 0;
  const dx = wx - vx * t;
  const dz = wz - vz * t;
  return Math.sqrt(dx * dx + dz * dz);
}
