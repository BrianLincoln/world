import { clamp, hash01, lerp, mulberry32, smoothstep } from '../core/rng';
import { COLUMN_R, LANTERN_R, LANTERN_Y, Layout, WELL_R, type Cap, type Glow, type Hall, type Lantern, type Room, type Shelf, type Solid, type Spike, type Stone } from './layout';

// The fourth dungeon's plan: the Drop, as a pure function of the seed.
// 2.5D like the other three (layout.ts says how: free space is `sdf < 0`, a
// floor under it, a clear height over it, walls that lean in to a vault).
//
//   from the side:                                        from above (the wurm's end):
//
//                 the lip                 the far lip                 den, the wurm
//   well ─ way ─ ante ─┐  p0                 ┌─ far way ─ loft            │
//                      │     p1              │ ▲                        burrow      (all 172 m down)
//                      │        p2           │ │ she climbs             ╔═╧═╗
//                      │     p3              │ │ this face              ║   ║ the ledge, along the
//                      │  p4                 │ │                        ║   ║ foot of the far face
//                      │      p5      ═══════╡ │                        ╚═══╝   ─── far way ─ loft, the light
//                      :   no floor  the ledge :                                    (up at the lips' level)
//
// One great round cavern, and its floor is gone: a pit straight across it
// from wall to wall, with no bottom to it (`pitSd`, the shell's own kind of
// drop; there is a floor 215 m down, for the pillars to stand on, and nobody
// ever sees it or reaches it). What is left is a crescent of floor either
// side: the lip you come out on, and the far lip, level with it, where the
// dungeon's light is, in a lit doorway. You can see it from the first lip,
// across 88 m of nothing.
//
// Up out of the dark stand six pillars with flat tops (`tops`), each lower
// than the last: the way down, on the parachute. The seventh landing is the
// ledge: a long shelf of stone 172 m under the lips, jutting out of the
// mouth of a burrow in the cavern's side wall and running along the foot of
// the far face to under the lit doorway. Each landing has a spirit lantern on
// a post (a big one, to be seen from the one before); the cave lights them
// one at a time.
//
// The burrow goes in to the den, where the woolly wurm sleeps, her head to
// the way out. She climbs the cavern itself: out along the ledge, a turn to
// the far face, and straight up it to the far lip and the light. There is no
// other way up.
//
// A wind blows up out of the dark the whole time. It is the cave's, not the
// plan's: see dropCave.ts.
//
// Local frame: the origin is the middle of the well, y = 0 its floor, +x the
// way on. The seed picks which side it all winds to (`side`: every z of the
// plan is times it), the walls' wobble and the scatter.

/**
 * A flat top: a place to land. `y` is its top, a height of the plan; `lantern` its own lantern (of `lanterns`).
 * `ledge`: no pillar under it: a shelf out of the wall, `hx` by `hz` either way from its middle (`r` is then only
 * how near its middle counts as on it for the lantern's reach).
 */
export interface Top { x: number; z: number; r: number; y: number; lantern: number; ledge?: boolean; hx?: number; hz?: number }
/** Is (x, z) over this top, with `pad` m to spare (negative: inside its edge by that much)? */
export function over(o: Top, x: number, z: number, pad = 0) {
  return o.hx !== undefined ? Math.abs(x - o.x) < o.hx + pad && Math.abs(z - o.z) < o.hz! + pad : Math.hypot(x - o.x, z - o.z) < o.r + pad;
}

/** How far down the pit's unseen floor is under the lips (m), the burrow's floor, and how high the cavern's roof is over the lips. */
export const PIT_DEPTH = 215, BURROW = 172, CAVERN_UP = 52;
/** Half the pit's width, lip to far lip (m), and the cavern's radius. */
export const PIT_HALF = 44, CAVERN_R = 58;
/** How big a top's lantern is, times an ordinary one, and how high its post stands. */
export const POST_S = 2.3, POST_H = 2.6;

const smin = (a: number, b: number, k: number) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
};

export class DropLayout {
  readonly rooms: Room[] = [];
  readonly halls: Hall[] = [];
  readonly solids: Solid[] = [];
  readonly stones: Stone[] = [];
  readonly spikes: Spike[] = [];
  readonly caps: Cap[] = [];
  readonly glows: Glow[] = [];
  readonly lanterns: Lantern[] = [];
  /** (None: its hard edges are all the pit's.) */
  readonly shelves: Shelf[] = [];
  /** The way down, in order from the lip: six pillars' tops, and last the ledge. */
  readonly tops: Top[] = [];
  /** Which side it winds to (+1 or -1). */
  readonly side: number;
  /** The cavern: its middle, and the level of its two lips. */
  readonly cavern: { x: number; z: number; r: number; y: number };
  /** Where the way in meets the lip (on its edge), and the way off it (unit, out over the pit). */
  readonly lip: { x: number; z: number; dx: number; dz: number };
  /** The lanterns at the far lip that are alight from the start. */
  readonly beacons: number[] = [];
  /** The burrow, from the cavern's wall in to the den (its middle line), and the den. */
  readonly burrow: { ax: number; az: number; bx: number; bz: number; r: number };
  readonly den: { x: number; z: number; r: number };
  /** The ledge's other lanterns (of `lanterns`): they wake with it once you're down. */
  readonly ledgeLanterns: number[] = [];
  /** Where the wurm sleeps, in the den, and which way she lies (a heading of the plan: atan2(z, x)). */
  readonly wurm: { x: number; z: number; dir: number };
  /** The dungeon's light, in the loft. */
  readonly ember: { x: number; y: number; z: number };
  readonly box: [number, number, number, number];
  /** Named places (plan x, z), for the scripts and the dev hooks. */
  readonly at: Record<string, [number, number]> = {};
  /** Which way (local, as atan2(z, x)) the passage leaves the well. */
  readonly door = 0;

  constructor(readonly seed: number) {
    const rnd = mulberry32(seed ^ 0x3f9a51);
    const s = (this.side = rnd() < 0.5 ? -1 : 1);
    const room = (x: number, z: number, r: number, floor: number, clear: number): Room => {
      const o = { x, z: z * s, r, floor, clear };
      this.rooms.push(o);
      return o;
    };
    const hall = (a: { x: number; z: number; floor: number }, b: { x: number; z: number; floor: number }, r: number, clear: number, ta = 0.25, tb = 0.75): Hall => {
      const h = { ax: a.x, az: a.z, bx: b.x, bz: b.z, r, fa: a.floor, fb: b.floor, ta, tb, clear };
      this.halls.push(h);
      return h;
    };
    const well = room(0, 0, WELL_R, 0, 15);
    const ante = room(62, -18, 10, -2, 10);
    const great = room(186, 0, CAVERN_R, -3, CAVERN_UP);
    const loft = room(great.x + CAVERN_R + 36, 0, 14, -3, 13);
    // (The burrow, the den and the ledge are set square to the plan: the wurm turns in right angles.)
    const den = room(226, 72, 12, -3, 12);
    this.cavern = { x: great.x, z: great.z, r: great.r, y: great.floor };
    this.den = { x: den.x, z: den.z, r: den.r };
    const way = hall(well, ante, 4.8, 9, 0.3, 0.7);
    const way2 = hall(ante, great, 5.2, 10, 0.2, 0.5);
    const far = hall(great, loft, 6, 12);
    // The burrow: straight in from the cavern's wall to the den. (Its floor, like the den's, is the pit's: `sinkOf`.)
    const mouth = { x: den.x, z: 40 * s, floor: -3 };
    const bur = hall(mouth, den, 5, 12);
    this.burrow = { ax: mouth.x, az: mouth.z, bx: den.x, bz: den.z, r: bur.r };
    const along = (h: Hall) => { const l = Math.hypot(h.bx - h.ax, h.bz - h.az); return { l, dx: (h.bx - h.ax) / l, dz: (h.bz - h.az) / l }; };

    // The lip: where the way in crosses the pit's edge.
    {
      const x = great.x - PIT_HALF, t = (x - ante.x) / (great.x - ante.x);
      this.lip = { x, z: lerp(ante.z, great.z, t), dx: 1, dz: 0 };
    }

    // The way down: six tops, each lower and a little smaller, scattered about the cavern (40 to 46 m apart, so each
    // is a flight and not a hop; the first 38 m out from the lip and only 12 m under it, where it's seen as you come
    // up to the edge: the owner found it too close under the cliff at 21 m out and hard to see); and the ledge.
    const down: [number, number, number, number, boolean?][] = [
      [180, -10, 7, 12], [158, 30, 6, 38], [198, 36, 5.5, 64], [214, -6, 5, 91], [180, -34, 4.5, 118], [192, 10, 4.5, 145], [den.x, 21.5, 9, BURROW, true],
    ];
    {
      let px = this.lip.x, pz = this.lip.z;
      for (const [x, z0, r, d, ledge] of down) {
        const z = z0 * s, l = Math.hypot(x - px, z - pz) || 1;
        const y = great.floor - d;
        if (ledge) {
          // The ledge: from inside the burrow's mouth out along the foot of the far face, to a little past the far
          // way's line. Its lantern stands at its outer edge half way along, looking out at you coming; and two smaller
          // ones, by the mouth and at its end (under the lit doorway: where to turn and climb).
          const y0 = y + 0.06;
          this.lanterns.push({ x: x - 3.3 + 0.5, y: y0 + POST_H, z, nx: -1, nz: 0, s: POST_S });
          this.tops.push({ x, z, r, y: y0, lantern: this.lanterns.length - 1, ledge, hx: 4, hz: 25.5 });
          for (const lz of [40 * s, -2.6 * s]) { this.lanterns.push({ x: x - 3.3 - 0.5, y: y0 + 1.7, z: lz, nx: 1, nz: 0, s: 1.5 }); this.ledgeLanterns.push(this.lanterns.length - 1); }
          continue;
        } else {
          // Its lantern stands at its far rim, looking back the way you come.
          const nx = (px - x) / l, nz = (pz - z) / l;
          this.lanterns.push({ x: x - nx * (r - 1.1) - nx * 0.5, y: y + POST_H, z: z - nz * (r - 1.1) - nz * 0.5, nx, nz, s: POST_S });
        }
        this.tops.push({ x, z, r, y, lantern: this.lanterns.length - 1, ledge });
        px = x; pz = z;
      }
    }
    // The wurm, in the den, lying square to the burrow with her head to the way out: she is found head on, and goes
    // straight out along the ledge.
    this.wurm = { x: den.x, z: den.z + 1 * s, dir: Math.atan2(-s, 0) };
    this.ember = { x: loft.x - 3, y: loft.floor + 1.7, z: loft.z };

    {
      let [x0, z0, x1, z1] = [1e9, 1e9, -1e9, -1e9];
      for (const r of this.rooms) { x0 = Math.min(x0, r.x - r.r); z0 = Math.min(z0, r.z - r.r); x1 = Math.max(x1, r.x + r.r); z1 = Math.max(z1, r.z + r.r); }
      this.box = [Math.floor(x0 - 9), Math.floor(z0 - 9), Math.ceil(x1 + 9), Math.ceil(z1 + 9)];
    }
    for (const a of [60, -60, 140, -140].map((d) => this.door + (d * Math.PI) / 180)) this.solids.push({ x: Math.cos(a) * COLUMN_R, z: Math.sin(a) * COLUMN_R, r: 2.3, top: 99 });

    // Light. The portal overhead; the dungeon's own; then the lanterns' (below).
    this.glows.push({ x: 0, y: well.clear - 0.5, z: 0, r: 31, warm: false });
    this.glows.push({ ...this.ember, r: 16, warm: true });

    const farLip = great.x + PIT_HALF, last = this.tops[this.tops.length - 1];
    Object.assign(this.at, {
      well: [0, 0], door: [WELL_R + 4, 0], ante: [ante.x, ante.z], edge: [this.lip.x - 4.5, this.lip.z - 0.4 * s], lip: [this.lip.x, this.lip.z],
      ledge: [last.x, last.z], burrow: [den.x, 52 * s], wurm: [this.wurm.x, this.wurm.z], end: [last.x, 0], foot: [farLip - 1.5, 0],
      farLip: [farLip + 4, 0], farWay: [great.x + CAVERN_R + 10, 0], loft: [loft.x - 9, 0], light: [this.ember.x, this.ember.z],
    });
    this.tops.forEach((o, i) => { if (!o.ledge) this.at[`p${i}`] = [o.x, o.z]; });
    void far;

    /** Is this where nothing should stand: a lip, the den, a narrow way? */
    const keepClear = (x: number, z: number, r: number) => {
      if (Math.abs(this.pitSd(x, z)) < 5 + r) return true;
      if (this.pitSd(x, z) > 0 && Math.hypot(x - great.x, z - great.z) < great.r + 4) return true;
      if (Math.hypot(x - den.x, z - den.z) < den.r + 3) return true;
      for (const h of [way, way2, far, bur]) if (this.hallAt(h, x, z)[0] < 1.5) return true;
      return Math.hypot(x, z) < WELL_R + 3;
    };

    // Glowcaps: a few down the way in and in the loft. (None in the cavern: below the lip it is dark but for the lanterns.)
    const clumps: [number, number, number, number][] = [
      [36, -7 * s, 4, 7], [ante.x + 2, ante.z - 6 * s, 5, 7], [ante.x - 5, ante.z + 5 * s, 3, 7],
      [loft.x + 6, 9 * s, 5, 8], [loft.x + 4, -10 * s, 4, 8],
    ];
    for (const [cx, cz, n, reach] of clumps) {
      let [x, z] = [cx, cz];
      for (let i = 0; i < 12 && this.sdf(x, z) > -1.6; i++) { const g = this.grad(x, z); x -= g[0] * 0.5; z -= g[1] * 0.5; }
      let tall = 0;
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 0.7 + rnd() * 1.5;
        const mx = x + Math.cos(a) * d, mz = z + Math.sin(a) * d;
        if (this.sdf(mx, mz) > -0.7) continue;
        const h = i === 0 ? 1.5 + rnd() * 1.0 : 0.45 + rnd() * 1.0;
        tall = Math.max(tall, h);
        this.caps.push({ x: mx, y: this.floor(mx, mz) - 0.05, z: mz, h, r: h * (0.32 + rnd() * 0.12), lean: 0.05 + rnd() * 0.12, dir: rnd() * Math.PI * 2 });
      }
      this.glows.push({ x, y: this.floor(x, z) + tall + 0.6, z, r: reach, warm: false });
    }

    // Spirit lanterns on the walls: either side of the way out of the well, down the way in, in the den, and either side of the far way's mouth.
    {
      const hang = (px: number, pz: number, dx: number, dz: number, reach: number, gap = 12) => {
        let d = 0;
        for (; d < reach && this.sdf(px + dx * d, pz + dz * d) < -0.15; d += 0.25);
        if (d >= reach) return -1;
        const wx = px + dx * d, wz = pz + dz * d;
        if (this.lanterns.some((o) => !o.s && Math.hypot(o.x - wx, o.z - wz) < gap && Math.abs(o.y - this.floor(wx, wz)) < 20)) return -1;
        const [gx, gz] = this.grad(wx, wz);
        const f = this.floor(wx - gx * 0.8, wz - gz * 0.8), c = this.ceil(wx, wz) - f;
        if (c < LANTERN_Y + 1.6) return -1;
        const inn = Layout.lean(LANTERN_Y + f - this.low(wx, wz), this.ceil(wx, wz) - this.low(wx, wz)) + 0.1;
        this.lanterns.push({ x: wx - gx * inn, y: f + LANTERN_Y, z: wz - gz * inn, nx: -gx, nz: -gz });
        return this.lanterns.length - 1;
      };
      for (const a of [0.42, -0.42]) hang(0, 0, Math.cos(this.door + a), Math.sin(this.door + a), WELL_R + 4);
      for (const h of [way, way2]) {
        const { l, dx, dz } = along(h);
        for (let d = 10, i = 0; d < l - 4; d += 15, i++) {
          const x = h.ax + dx * d, z = h.az + dz * d;
          if (Math.hypot(x - great.x, z - great.z) < great.r + 2 || Math.hypot(x - den.x, z - den.z) < den.r) continue;
          const sd = i % 2 ? 1 : -1;
          hang(x, z, -dz * sd, dx * sd, h.r + 7);
        }
      }
      // The den's, either side of her.
      for (const sd of [1, -1]) hang(this.wurm.x, this.wurm.z + 2 * s, sd, 0, den.r + 6);
      // (The far way's are awake from the start: a lit doorway across the dark, and the light in it.)
      for (const sd of [1, -1]) { const i = hang(great.x + CAVERN_R + 4, 0, 0, sd, 14, 6); if (i >= 0) this.beacons.push(i); }
      for (const sd of [1, -1]) hang(loft.x - 2, 0, 0.3, sd, loft.r + 6);
    }
    this.lanterns.forEach((o, i) => this.glows.push({ x: o.x + o.nx * 0.7, y: o.y + 0.5, z: o.z + o.nz * 0.7, r: i === this.tops[this.tops.length - 1].lantern ? 21 : o.s ? 15 : LANTERN_R, warm: false, lantern: i }));

    // Boulders along the walls. (None down in the pit: nothing is down there.)
    const [bx0, bz0, bx1, bz1] = this.box;
    for (let i = 0, tries = 0; i < 120 && tries < 14000; tries++) {
      const x = lerp(bx0, bx1, rnd()), z = lerp(bz0, bz1, rnd());
      const big = rnd() < 0.3;
      const sx = big ? 1.4 + rnd() * 1.3 : 0.5 + rnd() * 0.7;
      const d = -this.sdf(x, z);
      if (d < sx * 0.35 || d > sx * 0.8 + 0.5 || this.pitSd(x, z) < 0 || keepClear(x, z, sx)) continue;
      if (this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + sx + 0.5) || this.lanterns.some((o) => Math.hypot(o.x - x, o.z - z) < sx + 2)) continue;
      const sy = sx * (0.55 + rnd() * 0.35);
      this.stones.push({ x, y: this.floor(x, z) + sy * 0.25, z, sx, sy, sz: sx * (0.8 + rnd() * 0.3), rot: rnd() * 6.28, seed: 3 + (i % 5) });
      this.solids.push({ x, z, r: sx * 0.92, top: sy * 1.2 });
      i++;
    }
    // Stalagmites by the walls and stalactites over them: rounded, never sharp. (None in or over the pit.)
    for (let i = 0, tries = 0; i < 120 && tries < 14000; tries++) {
      const x = lerp(bx0, bx1, rnd()), z = lerp(bz0, bz1, rnd());
      const d = -this.sdf(x, z);
      const down = rnd() < 0.5;
      if (Math.hypot(x, z) < WELL_R + 2 || this.pitSd(x, z) < 4) continue;
      if (down ? d < 2.5 || d > 9 : d < 0.6 || d > 2.6 || keepClear(x, z, 1)) continue;
      const r = down ? 0.5 + rnd() * 0.7 : 0.4 + rnd() * 0.5;
      if (!down && this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r + 0.4)) continue;
      const h = down ? 1.6 + rnd() * Math.min(4.5, this.clear(x, z) * 0.22) : 1 + rnd() * 2.2;
      this.spikes.push({ x, y: down ? this.floor(x, z) + this.clear(x, z) + 0.3 : this.floor(x, z) - 0.2, z, r, h, down });
      if (!down) this.solids.push({ x, z, r: r * 0.8, top: h });
      i++;
    }
  }

  private noise(x: number, z: number, salt: number) {
    const ix = Math.floor(x), iz = Math.floor(z);
    let u = x - ix, v = z - iz;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const h = (i: number, j: number) => hash01(i, j, this.seed, salt);
    return lerp(lerp(h(ix, iz), h(ix + 1, iz), u), lerp(h(ix, iz + 1), h(ix + 1, iz + 1), u), v);
  }

  private hallAt(h: { ax: number; az: number; bx: number; bz: number; r: number }, x: number, z: number): [number, number] {
    const dx = h.bx - h.ax, dz = h.bz - h.az;
    const t = clamp(((x - h.ax) * dx + (z - h.az) * dz) / (dx * dx + dz * dz), 0, 1);
    return [Math.hypot(x - h.ax - dx * t, z - h.az - dz * t) - h.r, t];
  }

  /** Distance to the wall (m): negative in free space. */
  sdf(x: number, z: number): number {
    let d = 1e9;
    for (const r of this.rooms) d = smin(d, Math.hypot(x - r.x, z - r.z) - r.r, 3.5);
    for (const h of this.halls) d = smin(d, this.hallAt(h, x, z)[0], 3.5);
    const wild = smoothstep(WELL_R - 1, WELL_R + 10, Math.hypot(x, z));
    return d + wild * ((this.noise(x * 0.085, z * 0.085, 11) - 0.5) * 2.6 + (this.noise(x * 0.24, z * 0.24, 12) - 0.5) * 1.0);
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
      const k = Math.exp(-Math.max(0, d + 1.5) * 0.9);
      sum += room(r) * k; w += k;
    }
    const out = 0.002 + smoothstep(-4, 0.5, near);
    for (const h of this.halls) {
      const [d, t] = this.hallAt(h, x, z);
      if (d > 9) continue;
      const k = Math.exp(-Math.max(0, d + 1.5) * 0.9) * out;
      sum += hall(h, t) * k; w += k;
    }
    return w > 1e-9 ? sum / w : 0;
  }

  /** The smooth floor: the lips' level, going on across the pit as if it weren't there. */
  ground(x: number, z: number): number {
    return this.blend(x, z, (r) => r.floor, (h, t) => lerp(h.fa, h.fb, smoothstep(h.ta, h.tb, t)));
  }

  /** (No ledges down here: these are the shell's.) */
  past(k: Shelf, x: number, z: number): number { return (x - k.x) * k.dx + (z - k.z) * k.dz; }
  riseOf(_k: Shelf, _x: number, _z: number, _hard = false): number { return 0; }

  /** How far outside the cavern's round (x, z) is (m; negative inside). */
  private off(x: number, z: number) { return Math.hypot(x - this.cavern.x, z - this.cavern.z) - this.cavern.r; }

  /** In the cavern's own pit: over nothing. */
  inVoid(x: number, z: number) { return Math.abs(x - this.cavern.x) < PIT_HALF && this.off(x, z) < 1.5; }

  /**
   * The pit: negative inside it. A band straight across the cavern, lip to
   * far lip; and the burrow and the den, which are down at its level. Its
   * edge is only ever in the open along the two lips: the rest of it runs
   * through rock.
   */
  pitSd(x: number, z: number): number {
    const D = this.den;
    const a = Math.max(Math.abs(x - this.cavern.x) - PIT_HALF, this.off(x, z) - 5);
    const b = Math.min(this.hallAt(this.burrow, x, z)[0] - 4, Math.hypot(x - D.x, z - D.z) - D.r - 6);
    return Math.min(a, b);
  }
  /** How far down the pit's floor is here: all the way, in the cavern; the burrow's level, in the burrow and the den. */
  sinkOf(x: number, z: number): number { return this.inVoid(x, z) ? PIT_DEPTH : BURROW; }
  low(x: number, z: number): number { return this.ground(x, z) - (this.pitSd(x, z) < 0 ? this.sinkOf(x, z) : 0); }

  floor(x: number, z: number): number { return this.low(x, z); }

  /** In the burrow or the den (not the cavern): the roof is low, like the floor. */
  private inBurrow(x: number, z: number) { return this.pitSd(x, z) < 0 && !this.inVoid(x, z); }

  ceil(x: number, z: number): number {
    const wild = smoothstep(WELL_R - 1, WELL_R + 10, Math.hypot(x, z));
    // (The burrow's own height, whatever the cavern's roof is blended in at its mouth.)
    const up = this.inBurrow(x, z) ? 12 - BURROW : this.blend(x, z, (r) => r.clear, (h) => h.clear);
    return this.ground(x, z) + up + wild * (this.noise(x * 0.11, z * 0.11, 14) - 0.5) * 2.4;
  }

  clear(x: number, z: number): number { return this.ceil(x, z) - this.floor(x, z); }

  /** How far in from the wall's foot free space starts at height `y` of the plan (the wall leans in as it rises). */
  leanAt(x: number, y: number, z: number, pad = 0) {
    const lo = this.low(x, z);
    return Layout.lean(y - lo + pad, this.ceil(x, z) - lo);
  }

  /** Is (x, y, z) in free space, with `pad` m to spare all round? */
  free(x: number, y: number, z: number, pad: number): boolean {
    const f = this.floor(x, z), c = this.clear(x, z);
    if (y < f + pad * 0.7 || y > f + c - pad) return false;
    if (-this.sdf(x, z) < this.leanAt(x, y, z, pad) + pad) return false;
    // (No margin off the pit's faces: the wurm climbs them, and the camera must be able to look along one at her.)
    for (const o of this.solids) if (o.top > 3 && y < f + o.top + pad && Math.hypot(x - o.x, z - o.z) < o.r + pad * 0.5) return false;
    for (const o of this.tops) if (y < o.y + pad && (!o.ledge || y > o.y - 1.2) && over(o, x, z, pad * 0.5)) return false;
    return true;
  }
}
