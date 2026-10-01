import { clamp, hash01, lerp, mulberry32, smoothstep } from '../core/rng';

// The first dungeon's plan: a cave, as a pure function of the seed.
//
// It is 2.5D. Free space is where `sdf(x, z) < 0` (a smooth union of round
// rooms and capsule passages, with the walls wobbled by noise); under it a
// floor height, over it a clear height. Walls stand on the zero contour and
// lean in as they rise, a quarter ellipse, to meet the ceiling as a vault
// (`lean`). The mesh (shell.ts), collision and the camera all read the same
// functions, so what you see is what you bump into.
//
// Local frame: the origin is the middle of the well (where the ring's arms
// set you down), y = 0 is its floor, +x is the way on. `Dungeon` turns it to
// face a gap between two of the ring's stones.

/** A round room. */
export interface Room { x: number; z: number; r: number; floor: number; clear: number }
/** A passage: a capsule from a to b whose floor runs from `fa` to `fb` between `ta` and `tb` of its length. */
export interface Hall { ax: number; az: number; bx: number; bz: number; r: number; fa: number; fb: number; ta: number; tb: number; clear: number }
/** Something standing on the floor that you walk round. */
export interface Solid { x: number; z: number; r: number; top: number }
export interface Stone { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; seed: number }
export interface Spike { x: number; y: number; z: number; r: number; h: number; down: boolean }
export interface Cap { x: number; y: number; z: number; h: number; r: number; lean: number; dir: number }
/** A pool of light: within `r` of it surfaces that face it are a band lighter (two bands, near in). */
export interface Glow { x: number; y: number; z: number; r: number; warm: boolean }

/** The well's radius, and its four columns'. */
export const WELL_R = 16, COLUMN_R = 13;
/** Stand inside this (m from the middle of the well) to be taken back up; step out past `ARM_R` first. */
export const LIFT_R = 2.4, ARM_R = 5;

const smin = (a: number, b: number, k: number) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
};

export class Layout {
  readonly rooms: Room[] = [];
  readonly halls: Hall[] = [];
  readonly solids: Solid[] = [];
  readonly stones: Stone[] = [];
  readonly spikes: Spike[] = [];
  readonly caps: Cap[] = [];
  readonly glows: Glow[] = [];
  /** The still pool in the great cavern: where, how wide, and its surface. */
  readonly pool: { x: number; z: number; r: number; y: number };
  /** The warm light at the far end. */
  readonly ember: { x: number; y: number; z: number };
  /** Bounds of everything, with a margin (m). */
  readonly box: [number, number, number, number];
  /**
   * The ledge before the warm light: past the line through (x, z) across
   * (dx, dz) the floor stands `h` m higher, a wall too tall to jump on foot.
   */
  readonly shelf: { x: number; z: number; dx: number; dz: number; h: number };
  /** The rockfall that shuts the grotto: boulders across its passage, to be smashed. They are in `solids` until they go. */
  readonly plug: { stone: Stone; solid: Solid }[] = [];
  /** Where the shut-in creature lives (the grotto), and where it comes out to once it's free. */
  readonly den: { x: number; z: number; outX: number; outZ: number };

  /** Which way (local, as atan2(z, x)) the passage leaves the well. */
  readonly door: number;

  constructor(readonly seed: number) {
    const rnd = mulberry32(seed ^ 0x2d1f3a7);
    // Which side the cave winds to.
    const s = rnd() < 0.5 ? -1 : 1;
    const well: Room = { x: 0, z: 0, r: WELL_R, floor: 0, clear: 15 };
    const grotto: Room = { x: 29, z: -15 * s, r: 7.5, floor: -2.2, clear: 6.5 };
    const cavern: Room = { x: 79, z: -4 * s, r: 23, floor: -6, clear: 19 };
    const cavern2: Room = { x: 95, z: 11 * s, r: 15, floor: -6, clear: 15 };
    const niche: Room = { x: 117, z: 23 * s, r: 8.5, floor: -6, clear: 13.5 };
    this.rooms.push(well, grotto, cavern, cavern2, niche);
    this.halls.push(
      { ax: 0, az: 0, bx: 34, bz: 9 * s, r: 4.6, fa: 0, fb: -3, ta: 0.5, tb: 0.95, clear: 7.5 },
      { ax: 34, az: 9 * s, bx: 57, bz: -3 * s, r: 5, fa: -3, fb: -6, ta: 0.05, tb: 0.75, clear: 8 },
      { ax: 27, az: 6 * s, bx: grotto.x, bz: grotto.z, r: 3.3, fa: -1.9, fb: -2.2, ta: 0.2, tb: 0.8, clear: 5 },
      { ax: 99, az: 13 * s, bx: niche.x, bz: niche.z, r: 4.2, fa: -6, fb: -6, ta: 0.15, tb: 0.8, clear: 13 },
    );
    {
      const h = this.halls[3], l = Math.hypot(h.bx - h.ax, h.bz - h.az), dx = (h.bx - h.ax) / l, dz = (h.bz - h.az) / l;
      this.shelf = { x: h.ax + dx * l * 0.5, z: h.az + dz * l * 0.5, dx, dz, h: 4.2 };
    }
    this.den = { x: grotto.x, z: grotto.z, outX: 27 + 2.5, outZ: (6 + 1) * s };
    this.pool = { x: 81, z: -9 * s, r: 12.5, y: -6.3 };
    this.box = [-WELL_R - 8, -42, 134, 42];

    // Four great columns, set about the passage's mouth so it stands in the middle of the gap
    // between the near two (and the far two leave room to watch you let down from across the well).
    this.door = Math.atan2(this.halls[0].bz, this.halls[0].bx);
    for (const a of [60, -60, 140, -140].map((d) => this.door + (d * Math.PI) / 180)) this.solids.push({ x: Math.cos(a) * COLUMN_R, z: Math.sin(a) * COLUMN_R, r: 2.3, top: 99 });

    // Light. The portal overhead lights the well's floor in one big disc.
    this.glows.push({ x: 0, y: well.clear - 0.5, z: 0, r: 31, warm: false });
    this.ember = { x: niche.x + 2.5, y: this.floor(niche.x + 2.5, niche.z + 1.5 * s) + 1.7, z: niche.z + 1.5 * s };

    // The rockfall: big boulders shoulder to shoulder across the grotto's passage, wall to wall.
    {
      const h = this.halls[2], l = Math.hypot(h.bx - h.ax, h.bz - h.az), dx = (h.bx - h.ax) / l, dz = (h.bz - h.az) / l;
      const qx = h.ax + dx * l * 0.5, qz = h.az + dz * l * 0.5;
      let u0 = 0, u1 = 0;
      while (u0 > -9 && this.sdf(qx - dz * u0, qz + dx * u0) < 0.3) u0 -= 0.25;
      while (u1 < 9 && this.sdf(qx - dz * u1, qz + dx * u1) < 0.3) u1 += 0.25;
      const n = Math.max(2, Math.ceil((u1 - u0) / 2.1) + 1);
      for (let i = 0; i < n; i++) {
        const u = lerp(u0, u1, i / (n - 1)), along = (i % 2 ? 0.5 : -0.4) + (rnd() - 0.5) * 0.4;
        const x = qx - dz * u + dx * along, z = qz + dx * u + dz * along;
        const sy = 2.0 + rnd() * 0.5;
        const stone: Stone = { x, y: this.floor(x, z) + sy * 0.25, z, sx: 1.45 + rnd() * 0.25, sy, sz: 1.4 + rnd() * 0.2, rot: rnd() * 6.28, seed: 3 + (i % 5) };
        const solid: Solid = { x, z, r: 1.4, top: 3.2 };
        this.plug.push({ stone, solid });
        this.solids.push(solid);
      }
    }
    this.glows.push({ ...this.ember, r: 14, warm: true });

    // Glowcaps in clumps: a garden of them in the grotto, a few to mark the way, more round the pool.
    const clumps: [number, number, number][] = [
      [grotto.x - 2.5, grotto.z - 2 * s, 6], [grotto.x + 3.4, grotto.z + 0.5 * s, 5], [grotto.x - 0.5, grotto.z - 4.8 * s, 4],
      [33, 12 * s, 4], [52, -5.2 * s, 3],
      [66, 8 * s, 5], [72, -21 * s, 5], [97, -12 * s, 6], [103, 20 * s, 3],
    ];
    clumps.forEach(([cx, cz, n], ci) => {
      // Drawn in from the wall if the wobble has put one there.
      let [x, z] = [cx, cz];
      for (let i = 0; i < 12 && this.sdf(x, z) > -1.6; i++) { const g = this.grad(x, z); x -= g[0] * 0.5; z -= g[1] * 0.5; }
      let tall = 0;
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 0.7 + rnd() * 1.5;
        const mx = x + Math.cos(a) * d, mz = z + Math.sin(a) * d;
        if (this.sdf(mx, mz) > -0.7) continue;
        const h = i === 0 ? 1.7 + rnd() * 1.1 : 0.45 + rnd() * 1.1;
        tall = Math.max(tall, h);
        this.caps.push({ x: mx, y: this.floor(mx, mz) - 0.05, z: mz, h, r: h * (0.32 + rnd() * 0.12), lean: 0.05 + rnd() * 0.12, dir: rnd() * Math.PI * 2 });
        if (h > 1) this.solids.push({ x: mx, z: mz, r: 0.2 + h * 0.07, top: h });
      }
      this.glows.push({ x, y: this.floor(x, z) + tall + 0.6, z, r: ci < 3 ? 6.5 : 8, warm: false });
    });

    // Pebble boulders along the walls, and the odd one out on the floor of the cavern.
    for (let i = 0, tries = 0; i < 46 && tries < 900; tries++) {
      const x = lerp(this.box[0], this.box[2], rnd()), z = lerp(this.box[1], this.box[3], rnd());
      const big = rnd() < 0.3;
      const sx = big ? 1.4 + rnd() * 1.3 : 0.5 + rnd() * 0.7;
      const d = -this.sdf(x, z);
      const open = !big && Math.hypot(x - cavern.x, z - cavern.z) < 16 && rnd() < 0.25;
      // Nothing in the way of the first sight of the cavern: the pool, and the warm light beyond it.
      const [sx0, sz0] = [50, 0], ex = this.ember.x - sx0, ez = this.ember.z - sz0;
      const t = clamp(((x - sx0) * ex + (z - sz0) * ez) / (ex * ex + ez * ez), 0, 1);
      if (Math.hypot(x - sx0 - ex * t, z - sz0 - ez * t) < 4.5 + sx) continue;
      // Half sunk into the wall's foot, so the way through stays clear.
      if (d < sx * 0.35 || (d > sx * 0.8 + 0.5 && !open)) continue;
      if (Math.hypot(x, z) < WELL_R + 3 || this.wet(x, z) > 0.02) continue;
      // Nothing to climb by the ledge, and nothing but the rockfall in the grotto's passage.
      if (Math.hypot(x - this.shelf.x, z - this.shelf.z) < 9 || this.hallAt(this.halls[2], x, z)[0] < 1) continue;
      if (this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + sx + 0.5)) continue;
      const sy = sx * (0.55 + rnd() * 0.35);
      this.stones.push({ x, y: this.floor(x, z) + sy * 0.25, z, sx, sy, sz: sx * (0.8 + rnd() * 0.3), rot: rnd() * 6.28, seed: 3 + (i % 5) });
      this.solids.push({ x, z, r: sx * 0.92, top: sy * 1.2 });
      i++;
    }

    // Stalagmites by the walls and stalactites over them: rounded, never sharp.
    for (let i = 0, tries = 0; i < 34 && tries < 900; tries++) {
      const x = lerp(this.box[0], this.box[2], rnd()), z = lerp(this.box[1], this.box[3], rnd());
      const d = -this.sdf(x, z);
      const down = rnd() < 0.55;
      if (Math.hypot(x, z) < WELL_R + 2) continue;
      if (!down && (Math.hypot(x - this.shelf.x, z - this.shelf.z) < 9 || this.hallAt(this.halls[2], x, z)[0] < 1)) continue;
      if (down ? d < 2.5 : d < 0.6 || d > 2.6 || this.wet(x, z) > 0.02) continue;
      const r = down ? 0.5 + rnd() * 0.7 : 0.4 + rnd() * 0.5;
      if (!down && this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r + 0.4)) continue;
      const h = down ? 1.6 + rnd() * Math.min(4.5, this.clear(x, z) * 0.32) : 1 + rnd() * 2.2;
      this.spikes.push({ x, y: down ? this.floor(x, z) + this.clear(x, z) + 0.3 : this.floor(x, z) - 0.2, z, r, h, down });
      if (!down) this.solids.push({ x, z, r: r * 0.8, top: h });
      i++;
    }
  }

  /** Smooth value noise, 0..1. */
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

  /** Distance to the wall (m): negative in free space. */
  sdf(x: number, z: number): number {
    let d = 1e9;
    for (const r of this.rooms) d = smin(d, Math.hypot(x - r.x, z - r.z) - r.r, 3.5);
    for (const h of this.halls) d = smin(d, this.hallAt(h, x, z)[0], 3.5);
    // The well is built, and round; the rest is cave, and wanders.
    const wild = smoothstep(WELL_R - 1, WELL_R + 10, Math.hypot(x, z));
    return d + wild * ((this.noise(x * 0.085, z * 0.085, 11) - 0.5) * 3.4 + (this.noise(x * 0.24, z * 0.24, 12) - 0.5) * 1.1);
  }

  /** Which way the wall is (unit, pointing out of free space). */
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
      const k = Math.exp(-Math.max(0, d + 1.5) * 0.9);
      sum += room(r) * k; w += k;
      near = Math.min(near, d);
    }
    // A passage has no say inside the rooms it joins (it runs to their middles).
    const out = 0.002 + smoothstep(-4, 0.5, near);
    for (const h of this.halls) {
      const [d, t] = this.hallAt(h, x, z);
      const k = Math.exp(-Math.max(0, d + 1.5) * 0.9) * out;
      sum += hall(h, t) * k; w += k;
    }
    return sum / w;
  }

  /** How far under the pool's surface the floor is (m; 0 on the shore). */
  wet(x: number, z: number) {
    const p = this.pool;
    return 0.8 * smoothstep(p.r, p.r - 4.5, Math.hypot(x - p.x, z - p.z) + (this.noise(x * 0.2, z * 0.2, 13) - 0.5) * 3);
  }

  /** Floor height, the ledge apart. */
  ground(x: number, z: number): number {
    return this.blend(x, z, (r) => r.floor, (h, t) => lerp(h.fa, h.fb, smoothstep(h.ta, h.tb, t))) - this.wet(x, z);
  }

  /** How far past the ledge's line a point is (m; negative below it). */
  past(x: number, z: number): number {
    const k = this.shelf;
    return k ? (x - k.x) * k.dx + (z - k.z) * k.dz : -1;
  }

  /** Floor height. */
  floor(x: number, z: number): number {
    return this.ground(x, z) + (this.shelf ? this.shelf.h * smoothstep(0, 0.12, this.past(x, z)) : 0);
  }

  /** Ceiling height (it takes no notice of the ledge). */
  ceil(x: number, z: number): number {
    const wild = smoothstep(WELL_R - 1, WELL_R + 10, Math.hypot(x, z));
    return this.ground(x, z) + this.blend(x, z, (r) => r.clear, (h) => h.clear) + this.wet(x, z) + wild * (this.noise(x * 0.11, z * 0.11, 14) - 0.5) * 2.4;
  }

  /** Clear height from the floor to the ceiling. */
  clear(x: number, z: number): number {
    return this.ceil(x, z) - this.floor(x, z);
  }

  /** How far the wall has leaned in from its foot at `up` m above the floor, where the room is `clear` m high. */
  static lean(up: number, clear: number) {
    const s = clamp(up / clear, 0, 1);
    return Math.min(0.42 * clear, 5.5) * (1 - Math.sqrt(1 - s * s));
  }

  /** Is (x, y, z) in free space, with `pad` m to spare all round? */
  free(x: number, y: number, z: number, pad: number): boolean {
    const f = this.floor(x, z), c = this.clear(x, z);
    if (y < f + pad * 0.7 || y > f + c - pad) return false;
    if (-this.sdf(x, z) < Layout.lean(y - f + pad, c) + pad) return false;
    // Only what's tall stops the camera (the columns, a big stalagmite); it looks over the rest.
    for (const o of this.solids) if (o.top > 3 && y < f + o.top + pad && Math.hypot(x - o.x, z - o.z) < o.r + pad * 0.5) return false;
    return true;
  }
}
