import { clamp, hash01, lerp, mulberry32, smoothstep } from '../core/rng';
import { COLUMN_R, LANTERN_R, LANTERN_Y, Layout, WELL_R, type Cap, type Glow, type Hall, type Lantern, type Room, type Shelf, type Solid, type Spike, type Stone } from './layout';

// The second dungeon's plan: the Veil Cave, a pure function of the seed.
//
// One big cavern under a glimmerwood, cut into rooms like a honeycomb. It
// has two kinds of wall, and that difference is the whole dungeon:
//   rock   the cavern's outer wall and the great piers that stand at every
//          corner of the comb. Nothing passes it.
//   veils  thin sheets of pale stone hung from pier to pier. Light shows
//          through them, and a phasing glimmer passes them. Nothing else does.
//
// The comb is hexagons, `D` across. Three in a row down the middle are shut
// in by veils on all six sides; ten more make a ring round them, and each of
// those opens on to the next by a gap beside a short veil. So on foot the
// only way is round the ring, and riding it is straight down the middle:
//
//                      F                 the far end
//                W4  ╱ ┆ ╲  E4
//                    ╲ P ╱               the pocket (no way in on foot)
//                W3  ╱ ┆ ╲  E3           (stone columns)
//                    ╲ M1╱
//                W2  ╱ ┆ ╲  E2           (the grove)
//                    ╲ M2╱
//                W1  ╱ ┆ ╲  E1           (a pool)
//                      L1                the first cell
//                    ╱    ╲
//                well      S             S: the warm light, behind the amber veil
//                 ┆
//                out                     the way out, behind a veil in the well's wall
//
// Like dungeon 1's plan (layout.ts) it is 2.5D: free space is `sdf < 0`,
// a floor height under it and a clear height over it, walls leaning in to a
// vault. shell.ts builds the rock from the same functions; veilShell.ts
// hangs the veils. Local frame: the origin is the middle of the well, y = 0
// its floor. The seed picks which side it winds to (`side`: every z of the
// plan is times it), the walls' wobble and the scatter.

/** How far a phasing dash carries her (m): 0.42 s at 1.15 times her sprint (`gallopUpdate`). */
export const DASH = 10.7;
/** Half a veil's thickness, as a wall (m). Its folds are within this. */
export const VEIL_HALF = 0.5;
/** A cell of the comb: across the flats (centre to centre), centre to corner, and how far its floor reaches. */
const D = 46, H = D / Math.sqrt(3), CELL_R = 27.5;

/** A cell of the comb. `ring`: its place round the walking loop (-1: one of the shut middle ones). */
export interface Cell extends Room { id: string; ring: number }
/** A pier of rock, floor to ceiling, at a corner of the comb: part of the cavern's own wall. */
export interface Pier { x: number; z: number; r: number }
/** A slim column, floor to ceiling: at a short veil's free end, and standing about (they are in `solids` too). */
export interface Post { x: number; z: number; r: number }
/**
 * A veil, from a to b (both buried in rock). Its normal (nx, nz) points out
 * of `from` and into `to`. `kind`: 0 teal, 1 the amber one, 2 the way out.
 * `part`: a short one beside a walking gap (whose middle is `gap`).
 */
export interface Veil { id: string; ax: number; az: number; bx: number; bz: number; nx: number; nz: number; len: number; from: string; to: string; kind: 0 | 1 | 2; part: boolean; gap?: [number, number] }

const smin = (a: number, b: number, k: number) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
};

/** The shut cell she goes into last, where you can't follow (from the grove's cell, E2). */
export const HIDE = 'M1';
/** The walking loop, in order. */
export const RING = ['L1', 'E1', 'E2', 'E3', 'E4', 'F', 'W4', 'W3', 'W2', 'W1'];

export class VeilLayout {
  readonly rooms: Room[] = [];
  readonly halls: Hall[] = [];
  readonly cells: Cell[] = [];
  readonly piers: Pier[] = [];
  readonly posts: Post[] = [];
  readonly veils: Veil[] = [];
  readonly solids: Solid[] = [];
  readonly stones: Stone[] = [];
  readonly spikes: Spike[] = [];
  readonly caps: Cap[] = [];
  readonly glows: Glow[] = [];
  readonly lanterns: Lantern[] = [];
  /** No ledges and no pit here (shell.ts asks). */
  readonly shelves: Shelf[] = [];
  readonly side: number;
  readonly pool: { x: number; z: number; r: number; y: number };
  readonly ember: { x: number; y: number; z: number };
  readonly box: [number, number, number, number];
  /** Named places (plan x, z): every cell by its id, and what the story and the scripts stand on. */
  readonly at: Record<string, [number, number]> = {};
  /** Which way (local, as atan2(z, x)) the passage leaves the well. */
  readonly door: number;
  /** Which cells touch (the comb's own neighbours, and the well with the first cell), and where to cross between them. */
  private next = new Map<string, { to: string; via: [number, number]; walk: boolean }[]>();
  private byId = new Map<string, Cell>();

  constructor(readonly seed: number) {
    const rnd = mulberry32(seed ^ 0x51ce7a3);
    const s = (this.side = rnd() < 0.5 ? -1 : 1);
    const room = (x: number, z: number, r: number, floor: number, clear: number): Room => {
      const o = { x, z: z * s, r, floor, clear };
      this.rooms.push(o);
      return o;
    };
    // The first cell lies 64 m from the well, off to one side of straight on, so the warm light's room and
    // the well both fit behind it.
    const X0 = 52.4, Z0 = 36.7;
    const well = room(0, 0, WELL_R, 0, 15);
    const cell = (id: string, col: number, row: number, floor: number, clear: number) => {
      const c: Cell = { id, x: X0 + col * 1.5 * H, z: (Z0 + (row * D) / 2) * s, r: CELL_R, floor, clear, ring: RING.indexOf(id) };
      this.rooms.push(c);
      this.cells.push(c);
      this.byId.set(id, c);
      this.at[id] = [c.x, c.z];
      return c;
    };
    const L1 = cell('L1', 0, 0, -3, 16);
    cell('M2', 0, 2, -4, 19); cell('M1', 0, 4, -5, 20); cell('P', 0, 6, -4.5, 18);
    cell('F', 0, 8, -6, 17);
    cell('E1', 1, 1, -4, 15); cell('E2', 1, 3, -5.5, 17); cell('E3', 1, 5, -6.5, 16); cell('E4', 1, 7, -6, 15);
    cell('W1', -1, 1, -3.5, 15); cell('W2', -1, 3, -5, 16); cell('W3', -1, 5, -6, 17); cell('W4', -1, 7, -6.5, 15);
    // The warm light's room, behind the first cell; and the way out, behind the well.
    const SANCT = 38, OUT = 23;
    const sanctum = room(X0, Z0 - SANCT, 15, -2.4, 14);
    this.halls.push({ ax: 0, az: 0, bx: L1.x, bz: L1.z, r: 4.8, fa: 0, fb: L1.floor, ta: 0.3, tb: 0.72, clear: 8.5 });
    this.door = Math.atan2(L1.z, L1.x);
    const out = { x: -Math.cos(this.door) * OUT, z: -Math.sin(this.door) * OUT, r: 10, floor: 0, clear: 11 };
    this.rooms.push(out);
    Object.assign(this.at, { well: [0, 0], S: [sanctum.x, sanctum.z], out: [out.x, out.z], door: [Math.cos(this.door) * (WELL_R + 5), Math.sin(this.door) * (WELL_R + 5)] });

    // The comb's corners: a pier wherever two cells or more meet at one.
    const corner = new Map<string, { x: number; z: number; n: number }>();
    const key = (x: number, z: number) => `${Math.round(x * 4)},${Math.round(z * 4)}`;
    const corners = (c: Cell) => [[H, 0], [-H, 0], [H / 2, D / 2], [-H / 2, D / 2], [H / 2, -D / 2], [-H / 2, -D / 2]].map(([dx, dz]) => [c.x + dx, c.z + dz] as [number, number]);
    for (const c of this.cells) for (const [x, z] of corners(c)) {
      const k = key(x, z), o = corner.get(k);
      if (o) o.n++; else corner.set(k, { x, z, n: 1 });
    }
    for (const o of corner.values()) if (o.n >= 2) this.piers.push({ x: o.x, z: o.z, r: o.n >= 3 ? 4.2 : 5 });

    // The veils: one on every edge two cells share. Round the ring a short one, with a gap to walk through
    // beside it, at the inner pier and the outer one by turns, so the way round weaves; everywhere else pier to pier.
    const mid = this.byId.get('M1')!;
    // (`walk`: you can get from one to the other on foot, round the veil's end.)
    const link = (a: string, b: string, via: [number, number], walk = false) => { for (const [p, q] of [[a, b], [b, a]]) { if (!this.next.has(p)) this.next.set(p, []); this.next.get(p)!.push({ to: q, via, walk }); } };
    const hang = (id: string, from: Room, to: Room, a: [number, number], b: [number, number], kind: 0 | 1 | 2, part: boolean): Veil => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
      if ((to.x - from.x) * nx + (to.z - from.z) * nz < 0) { nx = -nx; nz = -nz; }
      const v: Veil = { id, ax: a[0], az: a[1], bx: b[0], bz: b[1], nx, nz, len, from: (from as Cell).id ?? '', to: (to as Cell).id ?? '', kind, part };
      this.veils.push(v);
      return v;
    };
    for (let i = 0; i < this.cells.length; i++) for (let j = i + 1; j < this.cells.length; j++) {
      const a = this.cells[i], b = this.cells[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) > D * 1.05) continue;
      const ka = corners(a).map(([x, z]) => key(x, z));
      let ends = corners(b).filter(([x, z]) => ka.includes(key(x, z)));
      const loop = a.ring >= 0 && b.ring >= 0 && (Math.abs(a.ring - b.ring) === 1 || Math.abs(a.ring - b.ring) === RING.length - 1);
      const id = `${a.id}-${b.id}`;
      if (!loop) {
        hang(id, a, b, ends[0], ends[1], 0, false);
        link(a.id, b.id, [(ends[0][0] + ends[1][0]) / 2, (ends[0][1] + ends[1][1]) / 2]);
        continue;
      }
      // (Inner first.)
      ends = ends.sort((p, q) => Math.hypot(p[0] - mid.x, p[1] - mid.z) - Math.hypot(q[0] - mid.x, q[1] - mid.z));
      const n = Math.min(a.ring, b.ring) === 0 && Math.max(a.ring, b.ring) === RING.length - 1 ? RING.length - 1 : Math.min(a.ring, b.ring);
      const [anchor, far] = n % 2 === 0 ? ends : [ends[1], ends[0]];
      const post: [number, number] = [lerp(anchor[0], far[0], 0.5), lerp(anchor[1], far[1], 0.5)];
      this.post(post[0], post[1], 1.3);
      // (From the lower of the two round the ring to the higher: `from` is the cell you come to first, going round by the east.)
      const [lo, hi] = (n === RING.length - 1 ? a.ring > b.ring : a.ring < b.ring) ? [a, b] : [b, a];
      const v = hang(`${lo.id}-${hi.id}`, lo, hi, anchor, post, 0, true);
      // The gap's middle: between the post and the pier at the far end, clear of both.
      const fl = Math.hypot(far[0] - post[0], far[1] - post[1]), g = (1.3 + fl - 5) / 2 / fl;
      v.gap = [lerp(post[0], far[0], g), lerp(post[1], far[1], g)];
      this.at[`${lo.id}>${hi.id}`] = this.at[`${hi.id}>${lo.id}`] = v.gap;
      // (She crosses through the middle of what shows of the veil, between its pier and its post.)
      link(a.id, b.id, [lerp(anchor[0], post[0], 0.62), lerp(anchor[1], post[1], 0.62)], true);
    }
    link('well', 'L1', [L1.x * 0.5, L1.z * 0.5], true);
    this.at.well = [0, 0];
    // The amber veil, across where the warm light's room opens off the first cell; and the way out, across the
    // alcove behind the well. Each from rock to rock, with a few metres to spare.
    const across = (id: string, a: Room, b: Room, kind: 1 | 2) => {
      const dl = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / dl, uz = (b.z - a.z) / dl;
      const t = (dl * dl + a.r * a.r - b.r * b.r) / (2 * dl), w = Math.sqrt(Math.max(0, a.r * a.r - t * t)) + 5;
      const cx = a.x + ux * t, cz = a.z + uz * t;
      return hang(id, a, b, [cx - uz * w, cz + ux * w], [cx + uz * w, cz - ux * w], kind, false);
    };
    const amber = across('amber', L1, sanctum, 1);
    amber.from = 'L1'; amber.to = 'S';
    const exit = across('out', well, out, 2);
    exit.from = 'well'; exit.to = 'out';

    {
      let [x0, z0, x1, z1] = [1e9, 1e9, -1e9, -1e9];
      for (const r of this.rooms) { x0 = Math.min(x0, r.x - r.r); z0 = Math.min(z0, r.z - r.r); x1 = Math.max(x1, r.x + r.r); z1 = Math.max(z1, r.z + r.r); }
      this.box = [Math.floor(x0 - 9), Math.floor(z0 - 9), Math.ceil(x1 + 9), Math.ceil(z1 + 9)];
    }
    // A still pool in the first cell round by the east, against its outer wall.
    {
      const c = this.byId.get('E1')!;
      this.pool = { x: c.x + 13, z: c.z - 2 * s, r: 11, y: c.floor - 0.3 };
      this.at.pool = [this.pool.x, this.pool.z];
    }

    // The well's four columns, as dungeon 1's: the way on between the near two, the way out between the far two.
    for (const a of [60, -60, 140, -140].map((d) => this.door + (d * Math.PI) / 180)) this.solids.push({ x: Math.cos(a) * COLUMN_R, z: Math.sin(a) * COLUMN_R, r: 2.3, top: 99 });

    // Light. The portal overhead; the warm light, 14 m past its veil (a dash through that stops short of it).
    this.glows.push({ x: 0, y: well.clear - 0.5, z: 0, r: 31, warm: false });
    {
      const x = amber.ax + (amber.bx - amber.ax) / 2 + amber.nx * 14, z = amber.az + (amber.bz - amber.az) / 2 + amber.nz * 14;
      this.ember = { x, y: this.floor(x, z) + 1.7, z };
      this.at.light = [x, z];
    }
    this.glows.push({ ...this.ember, r: 15, warm: true });
    // (Daylight, more or less, behind the way out: the brightest veil there is.)
    this.glows.push({ x: out.x, y: 4.5, z: out.z, r: 16, warm: false });

    // Where she hides. Round 1: just behind the short veil between the first cell and the next. Round 2: in
    // the grove. Round 3: in the pocket, behind its veil to the columns' cell.
    const behind = (id: string, back: number, toward: string): [number, number] => {
      const v = this.veil(id), c = this.byId.get(toward)!;
      const mx = (v.ax + v.bx) / 2, mz = (v.az + v.bz) / 2, sg = Math.sign((c.x - mx) * v.nx + (c.z - mz) * v.nz) || 1;
      return [mx + v.nx * sg * back, mz + v.nz * sg * back];
    };
    this.at.spot1 = behind('L1-E1', 3.6, 'E1');
    this.at.seen1 = behind('L1-E1', 7, 'L1');
    {
      const c = this.byId.get('E2')!;
      this.at.spot2 = [c.x + 9.5, c.z + 3 * s];
    }
    // (Round 3 was the far pocket, P, a third veil on: the owner couldn't tell where she had gone. It is the shut
    // cell beside the grove's now, so two veils' ends bring you to the room where she goes into the wall.)
    this.at.spot3 = behind('M1-E2', 4.5, HIDE);
    this.at.seen3 = behind('M1-E2', 6, 'E2');
    // Where a dash at each veil starts from and comes out: 'A|B' is 7 m short of the veil between A and B, on A's side.
    for (const v of this.veils) {
      if (v.kind) continue;
      this.at[`${v.from}|${v.to}`] = behind(v.id, 7, v.from);
      this.at[`${v.to}|${v.from}`] = behind(v.id, 7, v.to);
    }
    this.at['L1|S'] = [(amber.ax + amber.bx) / 2 - amber.nx * 7, (amber.az + amber.bz) / 2 - amber.nz * 7];
    this.at['S|L1'] = [(amber.ax + amber.bx) / 2 + amber.nx * 7, (amber.az + amber.bz) / 2 + amber.nz * 7];
    this.at['well|out'] = [(exit.ax + exit.bx) / 2 - exit.nx * 7, (exit.az + exit.bz) / 2 - exit.nz * 7];

    /** How near the nearest veil is (m), and whether a dash through it could come down here. */
    const veilNear = (x: number, z: number) => {
      let d = 1e9;
      for (const v of this.veils) d = Math.min(d, this.toVeil(v, x, z));
      return d;
    };
    /** Is this where nothing should stand: where a dash through a veil comes out, in a gap, on her ways, by where she hides? */
    const keepClear = (x: number, z: number, r: number) => {
      if (veilNear(x, z) < DASH + 2.5 + r) return true;
      for (const k of ['spot1', 'spot2', 'spot3', 'seen1', 'seen3', 'light', 'door']) if (Math.hypot(x - this.at[k][0], z - this.at[k][1]) < 4 + r) return true;
      for (const c of this.cells) if (Math.hypot(x - c.x, z - c.z) < 3 + r) return true;
      if (this.hallAt(this.halls[0], x, z)[0] < 1.5) return true;
      return Math.hypot(x, z) < WELL_R + 3 || Math.hypot(x - out.x, z - out.z) < out.r + 2 || Math.hypot(x - sanctum.x, z - sanctum.z) < sanctum.r + 2;
    };

    // Glowcaps. A clump a little way behind every veil, on both sides of it: that is what shows through it.
    const clump = (cx: number, cz: number, n: number, reach: number, spread = 1.5, tall = 1.7) => {
      let [x, z] = [cx, cz];
      for (let i = 0; i < 12 && this.sdf(x, z) > -1.6; i++) { const g = this.grad(x, z); x -= g[0] * 0.5; z -= g[1] * 0.5; }
      let top = 0;
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 0.7 + rnd() * spread;
        const mx = x + Math.cos(a) * d, mz = z + Math.sin(a) * d;
        if (this.sdf(mx, mz) > -0.7 || this.wet(mx, mz) > 0.02) continue;
        const h = i === 0 ? tall + rnd() * 1.1 : 0.45 + rnd() * 1.1;
        top = Math.max(top, h);
        this.caps.push({ x: mx, y: this.floor(mx, mz) - 0.05, z: mz, h, r: h * (0.32 + rnd() * 0.12), lean: 0.05 + rnd() * 0.12, dir: rnd() * Math.PI * 2 });
      }
      this.glows.push({ x, y: this.floor(x, z) + top + 0.6, z, r: reach, warm: false });
    };
    // On one side only, the far one: seen from the near side it is a glow in the stone, and nothing in front of
    // the veil lights it up to hide that. The far side is the shut cell's, where one of the two is shut; of two
    // shut cells, the one nearer the start (riding down the middle you see each veil lit from beyond it); and
    // round the ring, the cell further round from the first.
    const round = (id: string) => { const c = this.byId.get(id)!; return c.ring < 0 ? 99 : Math.min(c.ring, RING.length - c.ring); };
    for (const v of this.veils) {
      if (v.kind) continue;
      // (Off its middle, a different way each: the patches on the veils aren't all in one place.)
      const u = v.part ? 0.42 + rnd() * 0.16 : 0.3 + rnd() * 0.4, back = v.part ? 4.2 : 5 + rnd() * 1.5;
      const px = lerp(v.ax, v.bx, u), pz = lerp(v.az, v.bz, u);
      const a = this.byId.get(v.from)!, b = this.byId.get(v.to)!;
      const sg = a.ring < 0 && b.ring < 0 ? (Math.abs(a.z) < Math.abs(b.z) ? -1 : 1) : round(v.to) >= round(v.from) ? 1 : -1;
      const caps = this.caps.length, glows = this.glows.length;
      clump(px + v.nx * sg * back, pz + v.nz * sg * back, v.part ? 3 : 4, v.part ? 6.5 : 7.5);
      // (None behind the first short veil: that is where she first hides, and she stood in them, hard to make out.
      // Grown and taken away again, so the rest of the scatter is where it was.)
      if (v.id === 'L1-E1') { this.caps.length = caps; this.glows.length = glows; }
    }
    // (The great veil of the first cell is seen from both sides: from the first cell as you arrive, and from the
    // middle when you ride back down it. Its second light stands well back, in the first cell.)
    {
      const v = this.veil('L1-M2');
      clump(lerp(v.ax, v.bx, 0.68) - v.nx * 8.5, lerp(v.az, v.bz, 0.68) - v.nz * 8.5, 4, 9.5);
    }
    // The grove she hides in: a stand of them, some as tall as a tree, and her spot in the middle of it.
    {
      const [gx, gz] = this.at.spot2;
      for (const [dx, dz, n, tall] of [[3.2, 1.5, 5, 3.6], [-2.6, 2.8, 5, 2.6], [0.6, -3.4, 5, 4.4], [-3.4, -1.8, 4, 2.2], [4.6, -2.6, 4, 2.0]]) clump(gx + dx, gz + dz * s, n, 7, 2.2, tall);
    }
    // And a few on the way to the warm light, and by the way out.
    clump(sanctum.x - 8, sanctum.z + 2 * s, 3, 6);
    clump(sanctum.x + 8.5, sanctum.z - 1 * s, 3, 6);
    // Things to tell the cells apart by: stone columns in a stand (E3), one great glowcap (W2), a ring of them (W4).
    {
      const c = this.byId.get('E3')!;
      for (const [dx, dz, r] of [[15, -3, 1.1], [18.5, 2.5, 0.9], [13.5, 4.5, 0.8], [17, -8.5, 1.0], [20.5, -3.5, 0.75], [11.5, -7.5, 0.85]]) this.post(c.x + dx, c.z + dz * s, r);
      this.at.columns = [c.x + 16, c.z - 2 * s];
      const w2 = this.byId.get('W2')!;
      clump(w2.x - 14, w2.z, 6, 9, 2.6, 6.2);
      const w4 = this.byId.get('W4')!;
      for (let i = 0; i < 6; i++) clump(w4.x - 12 + Math.cos(i * 1.047) * 5, w4.z + Math.sin(i * 1.047) * 5, 2, 5.5, 0.9, 1.5);
    }

    // Spirit lanterns on the outer wall, cell by cell, and down the passage from the well.
    {
      const hangL = (px: number, pz: number, dx: number, dz: number, reach: number) => {
        let d = 0;
        for (; d < reach && this.sdf(px + dx * d, pz + dz * d) < -0.15; d += 0.25);
        if (d >= reach) return;
        const wx = px + dx * d, wz = pz + dz * d;
        if (this.lanterns.some((o) => Math.hypot(o.x - wx, o.z - wz) < 13) || this.piers.some((p) => Math.hypot(p.x - wx, p.z - wz) < p.r + 2.5) || veilNear(wx, wz) < 4) return;
        const [gx, gz] = this.grad(wx, wz);
        const f = this.floor(wx - gx * 0.8, wz - gz * 0.8), c = this.ceil(wx, wz) - f;
        if (c < LANTERN_Y + 1.6) return;
        const inn = Layout.lean(LANTERN_Y, c) + 0.1;
        this.lanterns.push({ x: wx - gx * inn, y: f + LANTERN_Y, z: wz - gz * inn, nx: -gx, nz: -gz });
      };
      for (const a of [0.42, -0.42]) hangL(0, 0, Math.cos(this.door + a), Math.sin(this.door + a), WELL_R + 4);
      {
        const h = this.halls[0], l = Math.hypot(h.bx, h.bz), dx = h.bx / l, dz = h.bz / l;
        for (const [d, sd] of [[26, 1], [38, -1]]) hangL(dx * d, dz * d, -dz * sd, dx * sd, h.r + 5);
      }
      for (const c of this.cells) {
        if (c.ring < 0) continue;
        const o = Math.atan2(c.z - mid.z, c.x - mid.x);
        for (const a of [-0.55, 0, 0.55]) hangL(c.x, c.z, Math.cos(o + a), Math.sin(o + a), c.r + 4);
      }
      this.lanterns.forEach((o, i) => this.glows.push({ x: o.x + o.nx * 0.7, y: o.y + 0.5, z: o.z + o.nz * 0.7, r: LANTERN_R, warm: false, lantern: i }));
    }

    // Pebble boulders along the outer wall (never where a dash comes out), and stalagmites and stalactites.
    const [bx0, bz0, bx1, bz1] = this.box;
    for (let i = 0, tries = 0; i < 150 && tries < 14000; tries++) {
      const x = lerp(bx0, bx1, rnd()), z = lerp(bz0, bz1, rnd());
      const big = rnd() < 0.3;
      const sx = big ? 1.4 + rnd() * 1.3 : 0.5 + rnd() * 0.7;
      const d = -this.sdf(x, z);
      if (d < sx * 0.35 || d > sx * 0.8 + 0.5) continue;
      if (this.wet(x, z) > 0.02 || keepClear(x, z, sx)) continue;
      if (this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + sx + 0.5) || this.lanterns.some((o) => Math.hypot(o.x - x, o.z - z) < sx + 2)) continue;
      const sy = sx * (0.55 + rnd() * 0.35);
      this.stones.push({ x, y: this.floor(x, z) + sy * 0.25, z, sx, sy, sz: sx * (0.8 + rnd() * 0.3), rot: rnd() * 6.28, seed: 3 + (i % 5) });
      this.solids.push({ x, z, r: sx * 0.92, top: sy * 1.2 });
      i++;
    }
    for (let i = 0, tries = 0; i < 170 && tries < 14000; tries++) {
      const x = lerp(bx0, bx1, rnd()), z = lerp(bz0, bz1, rnd());
      const d = -this.sdf(x, z);
      const down = rnd() < 0.7;
      if (Math.hypot(x, z) < WELL_R + 2) continue;
      // (Nothing hangs in a veil, nor stands where a dash comes out.)
      if (down ? d < 2.5 || veilNear(x, z) < 2.2 : d < 0.6 || d > 2.6 || this.wet(x, z) > 0.02 || keepClear(x, z, 1)) continue;
      const r = down ? 0.5 + rnd() * 0.7 : 0.4 + rnd() * 0.5;
      if (!down && this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r + 0.4)) continue;
      const h = down ? 1.6 + rnd() * Math.min(4.5, this.clear(x, z) * 0.3) : 1 + rnd() * 2.2;
      this.spikes.push({ x, y: down ? this.floor(x, z) + this.clear(x, z) + 0.3 : this.floor(x, z) - 0.2, z, r, h, down });
      if (!down) this.solids.push({ x, z, r: r * 0.8, top: h });
      i++;
    }
  }

  private post(x: number, z: number, r: number) {
    this.posts.push({ x, z, r });
    this.solids.push({ x, z, r, top: 99 });
  }

  veil(id: string): Veil {
    const v = this.veils.find((o) => o.id === id) ?? this.veils.find((o) => o.id === id.split('-').reverse().join('-'));
    if (!v) throw new Error(`no veil ${id}`);
    return v;
  }

  cell(id: string) { return this.byId.get(id) ?? null; }

  /** Which cell of the comb a point is in (the nearest middle), or 'well', 'S', 'out', 'hall' outside it. */
  cellAt(x: number, z: number): string {
    let best = '', bd = CELL_R;
    for (const c of this.cells) { const d = Math.hypot(x - c.x, z - c.z); if (d < bd) { bd = d; best = c.id; } }
    const a = this.veil('amber'), o = this.veil('out');
    if (this.signed(a, x, z) > 0 && Math.hypot(x - this.at.S[0], z - this.at.S[1]) < 20) return 'S';
    if (best) return best;
    if (this.signed(o, x, z) > 0 && Math.hypot(x - this.at.out[0], z - this.at.out[1]) < 14) return 'out';
    return Math.hypot(x, z) < WELL_R + 2 ? 'well' : 'hall';
  }

  /** How far a point is from a veil's own side: positive in the cell it leads `to`. */
  signed(v: Veil, x: number, z: number) { return (x - v.ax) * v.nx + (z - v.az) * v.nz; }

  /** Distance from a point to a veil (as a line from end to end). */
  toVeil(v: Veil, x: number, z: number) {
    const dx = v.bx - v.ax, dz = v.bz - v.az;
    const t = clamp(((x - v.ax) * dx + (z - v.az) * dz) / (v.len * v.len), 0, 1);
    return Math.hypot(x - v.ax - dx * t, z - v.az - dz * t);
  }

  /** Where the line from p to q crosses a veil, as a fraction of the way from p (or -1: it doesn't). `pad`: metres added to each end of the veil. */
  cross(v: Veil, px: number, pz: number, qx: number, qz: number, pad = 0): number {
    const a = this.signed(v, px, pz), b = this.signed(v, qx, qz);
    if (a * b > 0 || a === b) return -1;
    const t = a / (a - b), x = px + (qx - px) * t, z = pz + (qz - pz) * t;
    const u = ((x - v.ax) * (v.bx - v.ax) + (z - v.az) * (v.bz - v.az)) / v.len;
    return u < -pad || u > v.len + pad ? -1 : t;
  }

  /** The first veil the line from p to q crosses, and how far along. */
  firstVeil(px: number, pz: number, qx: number, qz: number): { v: Veil; t: number } | null {
    let best: { v: Veil; t: number } | null = null;
    for (const v of this.veils) { const t = this.cross(v, px, pz, qx, qz); if (t >= 0 && (!best || t < best.t)) best = { v, t }; }
    return best;
  }

  /** How far along a ray the rock begins (m; `max` if it doesn't). */
  rockAhead(x: number, z: number, dx: number, dz: number, max: number, pad = 0.4) {
    for (let d = 0.5; d <= max; d += 0.5) if (this.sdf(x + dx * d, z + dz * d) > -pad) return d - 0.5;
    return max;
  }

  /**
   * A way for her from one point to another: through the cells' middles,
   * crossing from one to the next through its veil (she phases; rock she
   * goes round). Points of the plan, the first being the start. `walk`: only
   * by cells you can follow her into on foot (round the ring, through its
   * short veils), if there is such a way.
   */
  route(fx: number, fz: number, tx: number, tz: number, walk = false): [number, number][] {
    const node = (x: number, z: number) => { const c = this.cellAt(x, z); return c === 'hall' ? (Math.hypot(x, z) < Math.hypot(x - this.at.L1[0], z - this.at.L1[1]) ? 'well' : 'L1') : c === 'out' ? 'well' : c === 'S' ? 'L1' : c; };
    const a = node(fx, fz), b = node(tx, tz);
    const out: [number, number][] = [[fx, fz]];
    if (a !== b) {
      const prev = new Map<string, { from: string; via: [number, number] }>(), q = [a];
      for (let h = 0; h < q.length && !prev.has(b); h++) for (const e of this.next.get(q[h]) ?? []) if (e.to !== a && !prev.has(e.to) && (e.walk || !walk)) { prev.set(e.to, { from: q[h], via: e.via }); q.push(e.to); }
      if (walk && !prev.has(b)) return this.route(fx, fz, tx, tz);
      const back: [number, number][] = [];
      for (let k = b; k !== a && prev.has(k); k = prev.get(k)!.from) { if (k !== b) back.push(this.at[k]); back.push(prev.get(k)!.via); }
      out.push(...back.reverse());
    }
    out.push([tx, tz]);
    return out;
  }

  private noise(x: number, z: number, salt: number) {
    const ix = Math.floor(x), iz = Math.floor(z);
    let u = x - ix, v = z - iz;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const h = (i: number, j: number) => hash01(i, j, this.seed, salt);
    return lerp(lerp(h(ix, iz), h(ix + 1, iz), u), lerp(h(ix, iz + 1), h(ix + 1, iz + 1), u), v);
  }

  private hallAt(h: Hall, x: number, z: number): [number, number] {
    const dx = h.bx - h.ax, dz = h.bz - h.az;
    const t = clamp(((x - h.ax) * dx + (z - h.az) * dz) / (dx * dx + dz * dz), 0, 1);
    return [Math.hypot(x - h.ax - dx * t, z - h.az - dz * t) - h.r, t];
  }

  /** Distance to the rock (m): negative in free space. The piers stand in it. */
  sdf(x: number, z: number): number {
    let d = 1e9;
    for (const r of this.rooms) d = smin(d, Math.hypot(x - r.x, z - r.z) - r.r, 3.5);
    for (const h of this.halls) d = smin(d, this.hallAt(h, x, z)[0], 3.5);
    const wild = smoothstep(WELL_R - 1, WELL_R + 10, Math.hypot(x, z));
    d += wild * ((this.noise(x * 0.085, z * 0.085, 11) - 0.5) * 2.8 + (this.noise(x * 0.24, z * 0.24, 12) - 0.5) * 1.0);
    // (A pier's foot runs into whatever wall it stands by.)
    for (const p of this.piers) {
      const q = p.r - Math.hypot(x - p.x, z - p.z);
      if (q > -3) d = -smin(-d, -q, 1.6);
    }
    return d;
  }

  grad(x: number, z: number): [number, number] {
    const e = 0.2;
    const gx = this.sdf(x + e, z) - this.sdf(x - e, z), gz = this.sdf(x, z + e) - this.sdf(x, z - e);
    const l = Math.hypot(gx, gz) || 1;
    return [gx / l, gz / l];
  }

  private blend(x: number, z: number, room: (r: Room) => number, hall: (h: Hall, t: number) => number) {
    let sum = 0, w = 0, near = 1e9;
    for (const r of this.rooms) {
      const d = Math.hypot(x - r.x, z - r.z) - r.r;
      near = Math.min(near, d);
      if (d > 9) continue;
      // (The cells overlap: each has its say from well inside its own edge, so the floor rolls from one to the next.)
      const k = Math.exp(-Math.max(0, d + 9) * 0.32);
      sum += room(r) * k; w += k;
    }
    const outK = 0.002 + smoothstep(-4, 0.5, near);
    for (const h of this.halls) {
      const [d, t] = this.hallAt(h, x, z);
      if (d > 9) continue;
      const k = Math.exp(-Math.max(0, d + 1.5) * 0.9) * outK;
      sum += hall(h, t) * k; w += k;
    }
    return w > 1e-9 ? sum / w : 0;
  }

  wet(x: number, z: number) {
    const p = this.pool;
    if (!p) return 0;
    const d = Math.hypot(x - p.x, z - p.z);
    if (d > p.r + 2) return 0;
    return 0.8 * smoothstep(p.r, p.r - 4.5, d + (this.noise(x * 0.2, z * 0.2, 13) - 0.5) * 3);
  }

  ground(x: number, z: number): number {
    return this.blend(x, z, (r) => r.floor, (h, t) => lerp(h.fa, h.fb, smoothstep(h.ta, h.tb, t))) - this.wet(x, z);
  }

  // (No pit, no ledges: these are here for shell.ts, which builds dungeon 1's too.)
  past(_k: Shelf, _x: number, _z: number) { return -1; }
  riseOf(_k: Shelf, _x: number, _z: number, _hard = false) { return 0; }
  pitSd(_x: number, _z: number) { return 1e9; }
  sinkOf(_x: number, _z: number) { return 0; }
  low(x: number, z: number) { return this.ground(x, z); }
  floor(x: number, z: number) { return this.ground(x, z); }

  ceil(x: number, z: number): number {
    const wild = smoothstep(WELL_R - 1, WELL_R + 10, Math.hypot(x, z));
    return this.ground(x, z) + this.blend(x, z, (r) => r.clear, (h) => h.clear) + this.wet(x, z) + wild * (this.noise(x * 0.11, z * 0.11, 14) - 0.5) * 2.4;
  }

  clear(x: number, z: number): number {
    return this.ceil(x, z) - this.floor(x, z);
  }

  /** Is (x, y, z) in free space, with `pad` m to spare all round? (Rock only: the veils are the camera's own business.) */
  free(x: number, y: number, z: number, pad: number): boolean {
    const f = this.floor(x, z), c = this.clear(x, z);
    if (y < f + pad * 0.7 || y > f + c - pad) return false;
    if (-this.sdf(x, z) < Layout.lean(y - f + pad, c) + pad) return false;
    for (const o of this.solids) if (o.top > 3 && y < f + o.top + pad && Math.hypot(x - o.x, z - o.z) < o.r + pad * 0.5) return false;
    return true;
  }
}
