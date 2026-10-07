import { Simplex } from '../core/noise';
import { clamp, hash01, hashInt, lerp, mulberry32, smoothstep } from '../core/rng';
import { brookQuery, findStorySite, PASTURE_D, PASTURE_W, pasturePlane, PLOT_EASE, PLOT_R, RUIN_D, RUIN_W, siteToLocal, type StorySite } from './storySite';
import { buildTowerNet, HOME_VIEW, type Tower, type TowerNet } from './towers';

// The world is a pure function of (seed, x, z). Nothing here touches three.js
// so it runs identically inside chunk workers and on the main thread.

export const SEA_LEVEL = 0;
export const SNOW_LINE = 235;
export const TREE_LINE = 175;

const PEAK_CELL = 2300;
const POI_CELL = 420;
/** The giant's way to the first dungeon keeps this far (m) from the home tower. */
const HOME_CLEAR = 120;

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
/** A dungeon's place: a ring of tall stones where a leg of the giant's trail ends. `r` is the ring's radius. */
export interface DungeonSite { x: number; z: number; y: number; r: number; /** The tower the way there passes (-1: none). */ tower: number; /** The way there (the first: from the yard; each after: from where the giant lay by the one before): dry, never steep, a bike can take it. It stops short of the ring. */ way: [number, number][] }
/** The stones of a dungeon's ring stand this far out from its middle (m). */
const RING_R = 13;

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
  private _dungeons: DungeonSite[] | null = null;
  /** The search for the sites is running: `sites` is those found so far (routing reads the POIs, which ask for them). */
  private dungeonBusy = false;
  private sites: DungeonSite[] = [];
  /** Dev: how long the search for each site took, if it ran here (ms). */
  searchMs: number[] = [];
  private wayClear: { line: [number, number][]; box: [number, number, number, number] }[] = [];
  private journeyBox: [number, number, number, number] | null = null;
  private woodsBox: [number, number, number, number] | null = null;
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
   * Use dungeon sites found earlier (the search runs a path-finder over a
   * dozen or more candidates for each and takes seconds: the main thread does
   * it once per seed and hands the answer to the chunk workers and to later
   * loads).
   */
  presetDungeons(list: DungeonSite[]) {
    this._dungeons = list;
    this.know(list);
  }

  /** These are the sites there are (so far): their rings stand, and their ways are kept clear. */
  private know(list: DungeonSite[]) {
    this.sites = list;
    // For keeping the wild biomes off each way: a coarser line and its box.
    this.wayClear = list.map((d) => {
      const w = d.way.filter((_, i) => i % 4 === 0 || i === d.way.length - 1);
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const p of w) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); }
      return { line: w, box: [x0 - 80, z0 - 80, x1 + 80, z1 + 80] as [number, number, number, number] };
    });
    this.poiCache.clear();
    this.pathCache.clear();
  }

  /** The tower after the home tower: a neighbour of home that looks back at it, the nearest. */
  get nextTower(): Tower {
    const net = this.towers, home = net.home;
    const links = home.links.map((i) => net.towers[i]);
    const score = (t: Tower) => Math.hypot(t.x - home.x, t.z - home.z) * (t.parent === home.id ? 1 : 1.6);
    return links.sort((a, b) => score(a) - score(b))[0] ?? net.towers[1];
  }

  /**
   * Where the giant's trail ends and the first dungeon is: a ring of tall
   * stones on open, level, dry ground about 1.0-1.6 km from the village,
   * that a dry, bikeable way reaches (WorldGen.route), with a beacon tower
   * part of the way along if one can be had, and well clear of every tower
   * and of the start. A pure function of the seed, like the start site:
   * chunk workers stand the stones.
   */
  get dungeon(): DungeonSite { return this.dungeons[0]; }

  /**
   * Every dungeon's site, in the order the giant comes to them: the first
   * (above), and the ones it walks on to as each is done (`nextSite`): four so far.
   * Found one after another, each with the ones before it already standing,
   * so the first is exactly what it was when it was the only one.
   */
  get dungeons(): DungeonSite[] {
    if (!this._dungeons) {
      // Routing reads the POIs, which ask for the sites: only those found so far are there.
      this.dungeonBusy = true;
      this.know([]);
      const t0 = Date.now();
      const first = this.firstSite();
      // (Cells looked at meanwhile were made without the ring: `know` throws them away.)
      this.know([first]);
      const t1 = Date.now();
      const second = this.nextSite(first);
      this.know([first, second]);
      const t2 = Date.now();
      // The third: where it walks on to when the second is done.
      const third = this.nextSite(second, [first]);
      this.know([first, second, third]);
      const t3 = Date.now();
      // The fourth: where it walks on to when the third is done. (Nothing is under it yet: bare stones.)
      const fourth = this.nextSite(third, [first, second]);
      this.searchMs = [t1 - t0, t2 - t1, t3 - t2, Date.now() - t3];
      this.dungeonBusy = false;
      this.presetDungeons([first, second, third, fourth]);
    }
    return this._dungeons!;
  }

  /** Can a ring stand at (x, z)? Level (`lax`: how much less so will do), dry, not high, with dry ground about it and no tower near. */
  private ringFits(x: number, z: number, lax: number): DungeonSite | null {
    const R = RING_R, h = this.baseHeight(x, z);
    if (h < 6 || h > 140) return null;
    let rough = 0, low = Infinity;
    for (let k = 0; k < 8; k++) {
      const b = (k / 8) * Math.PI * 2;
      rough = Math.max(rough, Math.abs(this.baseHeight(x + Math.cos(b) * (R + 4), z + Math.sin(b) * (R + 4)) - h));
      low = Math.min(low, this.baseHeight(x + Math.cos(b) * 45, z + Math.sin(b) * 45));
    }
    if (rough > 2.6 * lax || low < 2.5) return null;
    if (this.towers.towers.some((t) => Math.hypot(t.x - x, t.z - z) < 160)) return null;
    return { x, z, y: h, r: R, tower: -1, way: [] };
  }

  /**
   * Where the giant goes when the dungeon at `prev` is done: another ring,
   * 0.9-1.5 km on, by a dry way a bike can take from where it lay (the end of
   * the way to `prev`), round `prev`'s ring and not through it. On, not back:
   * the further side of `prev` from the village is preferred, and nowhere
   * within 900 m of the yard will do. `older`: the rings before `prev`; it
   * goes nowhere near them either (700 m), and its way keeps off them.
   */
  private nextSite(prev: DungeonSite, older: DungeonSite[] = []): DungeonSite {
    const st = this.story;
    const yard = st.village?.lane[0] ?? { x: st.x, z: st.z };
    const from = prev.way[prev.way.length - 1] ?? [prev.x, prev.z];
    const ol = Math.hypot(prev.x - yard.x, prev.z - yard.z) || 1, ox = (prev.x - yard.x) / ol, oz = (prev.z - yard.z) / ol;
    const off = [prev.x, prev.z, prev.r + 30];
    for (const o of older) off.push(o.x, o.z, o.r + 30);
    // (Nor by a tower's feet: the giant treads 14 m either side of the line. Seen on `hildaz2` once the land moved.)
    for (const t of this.towers.towers) if (Math.hypot(t.x - prev.x, t.z - prev.z) < 2400) off.push(t.x, t.z, 75);
    const short = (c: DungeonSite): [number, number] => { const l = Math.hypot(c.x - from[0], c.z - from[1]) || 1; return [c.x - ((c.x - from[0]) / l) * 48, c.z - ((c.z - from[1]) / l) * 48]; };
    const sweep = (lax: number) => {
      const cands: { c: DungeonSite; score: number }[] = [];
      for (const r of [1200, 1050, 1350, 900, 1500]) for (let ai = 0; ai < 48; ai++) {
        const a = (ai / 48) * Math.PI * 2 + hash01(Math.round(r), 1, this.seed, 954);
        const x = prev.x + Math.cos(a) * r, z = prev.z + Math.sin(a) * r;
        if (Math.hypot(x - yard.x, z - yard.z) < 900 || older.some((o) => Math.hypot(x - o.x, z - o.z) < 700)) continue;
        const c = this.ringFits(x, z, lax);
        if (!c) continue;
        const on = (Math.cos(a) * ox + Math.sin(a) * oz);
        cands.push({ c, score: on * 8 - this.forestBase(x, z, c.y) * 6 - Math.abs(r - 1200) * 0.004 - c.y * 0.02 });
      }
      return cands.sort((p, q) => q.score - p.score);
    };
    // (Fewer goes at it than the first gets: every way that fails is a path-finder run to exhaustion.)
    for (const [lax, steep] of [[1, 0.34], [1.8, 0.5], [2.6, Infinity]]) {
      for (const k of sweep(lax).slice(0, 4)) {
        const end = short(k.c);
        const way = this.route(from[0], from[1], end[0], end[1], steep, off);
        if (way.length > 2) return { ...k.c, way };
      }
    }
    // No way reaches anywhere: the best place a ring can stand, and a straight line to short of it (as for the first).
    const pick = sweep(1)[0]?.c ?? sweep(2.6)[0]?.c;
    if (pick) {
      const end = short(pick), l = Math.hypot(end[0] - from[0], end[1] - from[1]), n = Math.max(1, Math.ceil(l / 40));
      for (let i = 0; i <= n; i++) pick.way.push([from[0] + (end[0] - from[0]) * (i / n), from[1] + (end[1] - from[1]) * (i / n)]);
      return pick;
    }
    // Last resort: 1.2 km straight on, wherever that is.
    const x = prev.x + ox * 1200, z = prev.z + oz * 1200;
    return { x, z, y: Math.max(this.baseHeight(x, z), 3), r: RING_R, tower: -1, way: [[from[0], from[1]], [x - ox * 48, z - oz * 48]] };
  }

  private firstSite(): DungeonSite {
    {
      const st = this.story, net = this.towers;
      const yard = st.village?.lane[0] ?? { x: st.x, z: st.z };
      const R = RING_R;
      // The tower nearest the straight way there, between a quarter and 85% of the way along.
      const towerBy = (x: number, z: number) => {
        const dx = x - yard.x, dz = z - yard.z, l2 = dx * dx + dz * dz;
        let id = -1, off = 260;
        for (const t of net.towers) {
          const k = ((t.x - yard.x) * dx + (t.z - yard.z) * dz) / l2;
          if (k < 0.25 || k > 0.85 || t.home) continue;
          const d = Math.abs((t.x - yard.x) * dz - (t.z - yard.z) * dx) / Math.sqrt(l2);
          if (d < off) { off = d; id = t.id; }
        }
        return { id, off };
      };
      let best: DungeonSite | null = null;
      /** No slope on the way steeper than `STEEP` (rise over run): gentle if it can be had, else a push. */
      let STEEP = 0.34;
      // The giant goes this way from the village while you watch from the home tower: never by it.
      const home = [net.home.x, net.home.z, HOME_CLEAR];
      const reach = (c: DungeonSite) => {
        // (A route that gave up comes back as one straight line.)
        const l0 = Math.hypot(c.x - yard.x, c.z - yard.z);
        const end: [number, number] = [c.x - ((c.x - yard.x) / l0) * 48, c.z - ((c.z - yard.z) / l0) * 48];
        const t = c.tower >= 0 ? net.towers[c.tower] : null;
        if (t) {
          // By the tower, 130 m off it (its hill is steep) on the side the straight way already leans to.
          const dx = c.x - yard.x, dz = c.z - yard.z;
          const sd = ((t.x - yard.x) * dz - (t.z - yard.z) * dx) / l0 > 0 ? -1 : 1;
          const wx = t.x + (dz / l0) * sd * 130, wz = t.z - (dx / l0) * sd * 130;
          const a = this.route(yard.x, yard.z, wx, wz, STEEP, home), b = this.route(wx, wz, end[0], end[1], STEEP, home);
          if (a.length > 2 && b.length > 2) { c.way = [...a, ...b.slice(1)]; return true; }
        }
        const way = this.route(yard.x, yard.z, end[0], end[1], STEEP, home);
        if (way.length <= 2) return false;
        c.tower = -1;
        c.way = way;
        return true;
      };
      // First, outward from a tower, so the way is sure to go by one: to a
      // point 130 m to one side of it (its hill is steep), then on 350-650 m
      // past it to the ring.
      const fit = (x: number, z: number, lax: number) => this.ringFits(x, z, lax);
      const near = net.towers.map((t) => ({ t, d: Math.hypot(t.x - yard.x, t.z - yard.z) })).filter((k) => !k.t.home && k.d > 300 && k.d < 1200).sort((p, q) => Math.abs(p.d - 700) - Math.abs(q.d - 700)).slice(0, 5);
      // (Clear of the home tower by less, or not at all, only if there's no way otherwise.)
      for (const hc of [HOME_CLEAR, 60, 0]) {
        home[2] = hc;
        for (const steep of [0.34, 0.5]) {
          for (const { t, d } of near) {
            const ux = (t.x - yard.x) / d, uz = (t.z - yard.z) / d;
            for (const sd of [1, -1]) {
              const wx = t.x + uz * sd * 130, wz = t.z - ux * sd * 130;
              // (Never closer to the tower than 75 m: its feet are 14 m either side of the line.)
              const off = [t.x, t.z, 75, ...home];
              const legA = this.route(yard.x, yard.z, wx, wz, steep, off);
              if (legA.length <= 2) continue;
              const cands: { c: DungeonSite; score: number }[] = [];
              for (const r of [500, 380, 620]) for (let ai = -4; ai <= 4; ai++) {
                const a = ai * 0.25, ca = Math.cos(a), sa = Math.sin(a);
                const x = t.x + (ux * ca - uz * sa) * r, z = t.z + (uz * ca + ux * sa) * r;
                const far = Math.hypot(x - yard.x, z - yard.z);
                if (far < 800 || far > 1900) continue;
                const c = fit(x, z, 1.8);
                if (c) cands.push({ c, score: -Math.abs(a) * 3 - this.forestBase(x, z, c.y) * 6 - Math.abs(far - 1300) * 0.004 });
              }
              cands.sort((p, q) => q.score - p.score);
              for (const k of cands.slice(0, 3)) {
                const l = Math.hypot(k.c.x - wx, k.c.z - wz) || 1;
                const legB = this.route(wx, wz, k.c.x - ((k.c.x - wx) / l) * 48, k.c.z - ((k.c.z - wz) / l) * 48, steep, off);
                if (legB.length <= 2) continue;
                best = { ...k.c, tower: t.id, way: [...legA, ...legB.slice(1)] };
                break;
              }
              if (best) break;
            }
            if (best) break;
          }
          if (best) break;
        }
        // Failing that, anywhere a way reaches, with or without a tower.
        for (const [lax, steep] of best ? [] : [[1, 0.34], [1.8, 0.34], [1.8, 0.5], [2.6, 0.7], [2.6, Infinity]]) {
          STEEP = steep;
          const cands: { c: DungeonSite; score: number }[] = [];
          for (const r of [1300, 1150, 1450, 1000, 1600, 850]) for (let ai = 0; ai < 48; ai++) {
            const a = (ai / 48) * Math.PI * 2 + hash01(Math.round(r), 0, this.seed, 953);
            const x = yard.x + Math.cos(a) * r, z = yard.z + Math.sin(a) * r;
            const h = this.baseHeight(x, z);
            // (High country only when nothing lower will do.)
            if (h < 6 || h > 140 * lax) continue;
            let rough = 0, low = Infinity;
            for (let k = 0; k < 8; k++) {
              const b = (k / 8) * Math.PI * 2;
              rough = Math.max(rough, Math.abs(this.baseHeight(x + Math.cos(b) * (R + 4), z + Math.sin(b) * (R + 4)) - h));
              low = Math.min(low, this.baseHeight(x + Math.cos(b) * 45, z + Math.sin(b) * 45));
            }
            if (rough > 2.6 * lax || low < 2.5) continue;
            if (net.towers.some((t) => Math.hypot(t.x - x, t.z - z) < 160)) continue;
            const tb = towerBy(x, z);
            const score = -rough * 2 - this.forestBase(x, z, h) * 6 - Math.abs(r - 1300) * 0.004 + (tb.id >= 0 ? 12 - tb.off * 0.03 : 0);
            cands.push({ c: { x, z, y: h, r: R, tower: tb.id, way: [] }, score });
          }
          cands.sort((p, q) => q.score - p.score);
          for (const k of cands.slice(0, 12)) if (reach(k.c)) { best = k.c; break; }
          if (best) break;
        }
        if (best) break;
      }
      if (!best) {
        // No way reaches anywhere. Then at least somewhere a ring can stand: the most level, open, dry spot
        // of the same sweep, and a straight line to 48 m short of it for a way (the giant doesn't mind what it
        // walks over; you may have to go round). Before this, such seeds got the last resort below, which
        // could be a mountainside, with the giant coming to rest on top of the ring.
        let pick: DungeonSite | null = null, top = -Infinity;
        for (const r of [1300, 1150, 1450, 1000, 1600, 850]) for (let ai = 0; ai < 48; ai++) {
          const a = (ai / 48) * Math.PI * 2 + hash01(Math.round(r), 0, this.seed, 953);
          const c = fit(yard.x + Math.cos(a) * r, yard.z + Math.sin(a) * r, 1);
          if (!c) continue;
          const score = -this.forestBase(c.x, c.z, c.y) * 6 - Math.abs(r - 1300) * 0.004 - c.y * 0.02;
          if (score > top) { top = score; pick = c; }
        }
        if (pick) {
          const l = Math.hypot(pick.x - yard.x, pick.z - yard.z), n = Math.ceil((l - 48) / 40);
          for (let i = 0; i <= n; i++) { const k = ((l - 48) / l) * (i / n); pick.way.push([yard.x + (pick.x - yard.x) * k, yard.z + (pick.z - yard.z) * k]); }
          best = pick;
        }
      }
      if (!best) {
        // Last resort: 1.2 km out toward the second tower, wherever that is.
        const nx = this.nextTower, dl = Math.hypot(nx.x - yard.x, nx.z - yard.z) || 1;
        const x = yard.x + ((nx.x - yard.x) / dl) * 1200, z = yard.z + ((nx.z - yard.z) / dl) * 1200;
        best = { x, z, y: Math.max(this.baseHeight(x, z), 3), r: R, tower: -1, way: [[yard.x, yard.z], [x, z]] };
      }
      return best;
    }
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
      const next = this.nextTower;
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
  route(ax: number, az: number, bx: number, bz: number, steep = Infinity, keepOff: number[] = []): [number, number][] {
    const C = 8;
    const d = Math.hypot(bx - ax, bz - az);
    const pad = Math.max(120, d * 0.4);
    const x0 = Math.min(ax, bx) - pad, z0 = Math.min(az, bz) - pad;
    const W = Math.ceil((Math.max(ax, bx) + pad - x0) / C) + 1, H = Math.ceil((Math.max(az, bz) + pad - z0) / C) + 1;
    // Things to keep off: centres and radii.
    // (`keepOff`: more places to stay clear of, as x, z, radius.)
    const avoid: number[] = [...keepOff];
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
    for (const p of st.village?.plots ?? []) avoid.push(p.x, p.z, PLOT_R + 1);
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
        // (`steep`: no way at all over ground steeper than this.)
        c = sl > steep ? Infinity : 1 + 14 * sl * sl + 1.2 * this.forestBase(x, z, h);
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
    // (Less water, 2026-10-02: the bias was 0.08, which left about 45% of the map under the sea.)
    return smoothstep(-0.2, 0.1, c + 0.26);
  }

  /** Height without POI flattening. */
  baseHeight(x: number, z: number): number {
    const nw = this.nWarp;
    const wx = x + 220 * nw.fbm(x / 1500, z / 1500, 3);
    const wz = z + 220 * nw.fbm(x / 1500 + 41.3, z / 1500 - 17.9, 3);

    const land = this.landAt(wx, wz);
    // (Inland ground used to sit at 5 m, and every hollow in the hills was a pond.)
    let h = lerp(-34, 13, land);

    // Gently rolling hills everywhere on land, softer at sea.
    const hills = this.nHills.fbm(wx / 560, wz / 560, 4);
    // Hollows are shallower than the hills are high: on full land they stay above the sea, so
    // lakes are made by the land mask and the valleys, not scattered by this.
    h += (hills < 0 ? hills * 0.4 : hills) * 30 * (0.3 + 0.7 * land);

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
    const width = (0.035 + 0.035 * mask) * 0.85;
    // U profile: k = (1 - t^2)^2 -> flat floor, smooth rim, steepest mid-wall.
    const t = Math.min(1, v / (width * 3));
    const k = (1 - t * t) * (1 - t * t) * mask;
    if (k > 0) {
      // Sills: along about a third of a lowland valley's length its floor comes up out of the
      // water (to 6 m), so a valley is a chain of lakes with dry ground between and not one
      // ribbon that cuts the map in two. Highland fjords keep their water.
      const sill = smoothstep(0.05, 0.3, this.nMask.noise(x / 1500 + 31.7, z / 1500 - 13.3)) * (1 - hl);
      const floor = -8 - 22 * hl + sill * 14;
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
    // The village's plots: level pads, eased back into the ground.
    const vi = st.village;
    if (vi && x > vi.box[0] && x < vi.box[2] && z > vi.box[1] && z < vi.box[3]) {
      for (const p of vi.plots) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < PLOT_R + PLOT_EASE) h = lerp(h, p.y, 1 - smoothstep(PLOT_R, PLOT_R + PLOT_EASE, d));
      }
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
    for (const p of st.paths) d = Math.min(d, segDist(x, z, p) - (p.wide ?? 0));
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
    // The giant's way to each dungeon is open ground, village to ring and ring to ring:
    // a clear swath wide enough for both its feet (and a bike).
    if (kind !== 'tuft') {
      if (!this.dungeonBusy) void this.dungeons;
      for (const wc of this.wayClear) {
        if (x > wc.box[0] && x < wc.box[2] && z > wc.box[1] && z < wc.box[3]) {
          const w = (kind === 'rock' ? 17 : 23) + r;
          for (let i = 0; i + 1 < wc.line.length; i++) if (segDist(x, z, { ax: wc.line[i][0], az: wc.line[i][1], bx: wc.line[i + 1][0], bz: wc.line[i + 1][1] }) < w) return true;
        }
      }
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
    // The village's plots are clear (a house's own ground is bare).
    const vi = st.village;
    if (vi && x > vi.box[0] && x < vi.box[2] && z > vi.box[1] && z < vi.box[3]) {
      for (const p of vi.plots) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (kind === 'tuft' ? p.house && d < 3 : d < PLOT_R + (kind === 'tree' ? 3.5 : 1.5) + r) return true;
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
    const d = Math.max(this.forestBase(x, z, h), this.startWoods(x, z) * smoothstep(1.8, 4.5, h));
    if (d <= 0) return d;
    return d * (1 - 0.85 * this.bog(x, z));
  }

  /**
   * 0..1: forest that grows wherever the land didn't put any, round the
   * start clearing and along the outer two-thirds of the way in from it, so
   * you always set out from the woods and the cabin opens up round the bend.
   * Not in `forestBase`: nothing is placed by it, it only grows trees (and
   * the scatter keeps them off the paths, the clearing and the village).
   */
  startWoods(x: number, z: number): number {
    const st = this.story, a = st.approach;
    if (a.length < 2) return 0;
    const bb = (this.woodsBox ??= (() => {
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const p of a) { x0 = Math.min(x0, p.x); z0 = Math.min(z0, p.z); x1 = Math.max(x1, p.x); z1 = Math.max(z1, p.z); }
      return [x0 - 36, z0 - 36, x1 + 36, z1 + 36] as [number, number, number, number];
    })());
    if (x < bb[0] || x > bb[2] || z < bb[1] || z > bb[3]) return 0;
    let w = 1 - smoothstep(26, 34, Math.hypot(x - st.spawn.x, z - st.spawn.z));
    let d = Infinity;
    for (let i = Math.floor((a.length - 1) * 0.3); i + 1 < a.length; i++) d = Math.min(d, segDist(x, z, { ax: a[i].x, az: a[i].z, bx: a[i + 1].x, bz: a[i + 1].z }));
    w = Math.max(w, 1 - smoothstep(15, 22, d));
    if (w <= 0) return 0;
    // The yard stays open, and so does the lane.
    w *= smoothstep(24, 36, Math.hypot(x - st.x, z - st.z));
    if (w > 0 && st.village) {
      let dl = Infinity;
      for (const p of st.village.lane) dl = Math.min(dl, Math.hypot(x - p.x, z - p.z));
      w *= smoothstep(10, 20, dl);
    }
    return w;
  }

  /** The forest field before the wild biomes (what the story, towers and POIs were placed on). */
  private forestBase(x: number, z: number, h: number): number {
    const f = this.nForest.fbm(x / 460, z / 460, 4) + 0.25 * this.nForest2.noise(x / 90, z / 90);
    // (Was `f + 0.02`. With less water there is half as much land again, and so half as many trees
    // again in view: thinned to about 29% of the land from 36% to pay some of that back.)
    let d = smoothstep(0.0, 0.16, f - 0.06);
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
    // Nor the giant's ways to the dungeons: you follow its prints on foot or by bike.
    if (k > 0) {
      if (!this.dungeonBusy) void this.dungeons;
      for (const wc of this.wayClear) {
        if (x > wc.box[0] && x < wc.box[2] && z > wc.box[1] && z < wc.box[3]) {
          let d = Infinity;
          for (let i = 0; i + 1 < wc.line.length; i++) d = Math.min(d, segDist(x, z, { ax: wc.line[i][0], az: wc.line[i][1], bx: wc.line[i + 1][0], bz: wc.line[i + 1][1] }));
          k *= smoothstep(30, 75, d);
        }
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
    const dgs = this.dungeonBusy ? this.sites : this.dungeons;
    const keep = out.filter((p) => Math.hypot(p.x - st.x, p.z - st.z) > 110 && Math.hypot(p.x - st.far.x, p.z - st.far.z) > 45 && dgs.every((dg) => Math.hypot(p.x - dg.x, p.z - dg.z) > 70) &&
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
    // A dungeon's ring: nine tall dark stones, none fallen.
    for (const [n, dg] of dgs.entries()) {
      if (!inThis(dg.x, dg.z)) continue;
      const boulders: Boulder[] = [];
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + 0.2;
        const bx = dg.x + Math.cos(a) * dg.r, bz = dg.z + Math.sin(a) * dg.r;
        const sy = 3.6 + hash01(k + n * 16, 1, this.seed, 951) * 1.6;
        boulders.push({ x: bx, y: this.baseHeight(bx, bz) + sy * 0.6, z: bz, sx: 1.25 + hash01(k + n * 16, 2, this.seed, 952) * 0.4, sy, rot: a });
      }
      out.push({ kind: 'circle', x: dg.x, z: dg.z, y: dg.y, rot: 0, clear: dg.r + 8, boulders });
    }
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
