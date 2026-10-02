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
// The floor is smooth (`ground`) but for three kinds of hard edge:
//   a shelf  a straight lip across a passage; past it the floor stands `h`
//            higher (and may fall away again behind as a ramp);
//   the pit  a round drop (and the tunnel that climbs back out of it);
//   a top    a flat-topped pillar standing in the pit (a `Solid`, `flat`).
//
// The plan is authored, a loop with one way round it:
//
//   well ── fork ──(the wrong way)── LEDGE ── sanctum, the warm light
//            │  ▲
//            │  └── balcony (a one-way drop) ── link ── den, the rockhopper
//            ▼                                           │ rockfall
//          cavern (pool, a side grotto) ── kink ── the hand ── PIT ── gallery
//
// Local frame: the origin is the middle of the well (where the ring's arms
// set you down), y = 0 is its floor, +x is the way on. `Dungeon` turns it to
// face a gap between two of the ring's stones. The seed picks which side it
// all winds to (`side`), the walls' wobble and the scatter.

/** A round room. */
export interface Room { x: number; z: number; r: number; floor: number; clear: number }
/** A passage: a capsule from a to b whose floor runs from `fa` to `fb` between `ta` and `tb` of its length. */
export interface Hall { ax: number; az: number; bx: number; bz: number; r: number; fa: number; fb: number; ta: number; tb: number; clear: number }
/** Something standing on the floor that you walk round. `flat`: a pillar, its top a place to stand, exactly `top` up and `r` across. */
export interface Solid { x: number; z: number; r: number; top: number; flat?: boolean; /** A pillar's top as a height of the plan (the floor under it may slope; its top doesn't). */ y?: number }
export interface Stone { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; seed: number; hex?: string }
export interface Spike { x: number; y: number; z: number; r: number; h: number; down: boolean }
export interface Cap { x: number; y: number; z: number; h: number; r: number; lean: number; dir: number }
/** A pool of light: within `r` of it surfaces that face it are a band lighter (two bands, near in). `lantern`: lit only once that lantern is. */
export interface Glow { x: number; y: number; z: number; r: number; warm: boolean; lantern?: number }
/**
 * A ledge: past the line through (x, z) across (dx, dz) the floor stands `h`
 * higher, between `w` either side. It holds for `back` m and then falls away
 * over `ramp` m (a wedge: a way up from behind, a drop in front).
 */
export interface Shelf { x: number; z: number; dx: number; dz: number; h: number; w: number; back: number; ramp: number }
/** A drop: a disc `depth` deep, and a tunnel from a (inside it) to b whose floor climbs back up to the level outside. */
export interface Pit { x: number; z: number; r: number; depth: number; ax: number; az: number; bx: number; bz: number; tr: number; t0: number; t1: number }
/** A spirit lantern on a wall: where it hangs, and which way it faces (into the room). */
export interface Lantern { x: number; y: number; z: number; nx: number; nz: number }

/** The well's radius, and its four columns'. */
export const WELL_R = 16, COLUMN_R = 13;
/** Stand inside this (m from the middle of the well) to be taken back up; step out past `ARM_R` first. */
export const LIFT_R = 2.4, ARM_R = 5;
/** How high a lantern hangs (m above the floor at the wall's foot), and how far its light reaches. */
export const LANTERN_Y = 2.7, LANTERN_R = 12.5;

const smin = (a: number, b: number, k: number) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
};
const turn = (x: number, z: number, a: number): [number, number] => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];

export class Layout {
  readonly rooms: Room[] = [];
  readonly halls: Hall[] = [];
  readonly solids: Solid[] = [];
  readonly stones: Stone[] = [];
  readonly spikes: Spike[] = [];
  readonly caps: Cap[] = [];
  readonly glows: Glow[] = [];
  readonly lanterns: Lantern[] = [];
  /** Which side the cave winds to (+1 or -1: every z of the plan is times this). */
  readonly side: number;
  /** The still pool in the great cavern: where, how wide, and its surface. */
  readonly pool: { x: number; z: number; r: number; y: number };
  /** The warm light at the far end. */
  readonly ember: { x: number; y: number; z: number };
  /** Bounds of everything, with a margin (m). */
  readonly box: [number, number, number, number];
  /** The ledges: [0] the one before the warm light (the wrong way, on foot), [1] the balcony the den's link drops off. */
  readonly shelves: Shelf[] = [];
  /** The drop under the stepping stones. */
  readonly pit: Pit;
  /** The stepping stones across it, in order from the near lip to the far one (they are in `solids` too). */
  readonly tops: Solid[] = [];
  /** The rockfall that shuts the den: boulders across its passage, to be smashed. They are in `solids` until they go. */
  readonly plug: { stone: Stone; solid: Solid }[] = [];
  /** Where the shut-in creature lives, and where it comes out to once it's free. */
  readonly den: { x: number; z: number; outX: number; outZ: number };
  /** The giant's hand, standing in its room: where, and which way its palm faces (about y). */
  hand!: { x: number; z: number; rot: number };
  /** Named places (plan x, z), for the scripts and the dev hooks. */
  readonly at: Record<string, [number, number]> = {};

  /** Which way (local, as atan2(z, x)) the passage leaves the well. */
  readonly door: number;

  constructor(readonly seed: number) {
    const rnd = mulberry32(seed ^ 0x2d1f3a7);
    const s = (this.side = rnd() < 0.5 ? -1 : 1);
    const room = (x: number, z: number, r: number, floor: number, clear: number): Room => {
      const o = { x, z: z * s, r, floor, clear };
      this.rooms.push(o);
      return o;
    };
    /** A passage between two rooms' middles; its floor runs from one's to the other's. */
    const hall = (a: Room, b: Room, r: number, clear: number, ta = 0.25, tb = 0.75): Hall => {
      const h = { ax: a.x, az: a.z, bx: b.x, bz: b.z, r, fa: a.floor, fb: b.floor, ta, tb, clear };
      this.halls.push(h);
      return h;
    };
    const well = room(0, 0, WELL_R, 0, 15);
    const fork = room(60, 10, 18, -3, 14);
    const sanctum = room(128, 102, 13, -3, 15);
    const cavern = room(95, -91, 36, -8, 22);
    const grotto = room(33, -120, 10.5, -7, 7.5);
    const kink = room(157, -141, 12, -8, 10);
    const hand = room(221, -125, 30, -8, 19);
    const drop = room(308, -66, 27, -8, 17);
    // (The gallery lies 6 m lower than the hand's room: the stepping stones between them are a way down.)
    const gallery = room(291, 50, 26, -14, 17);
    const nook = room(242, 91, 10, -13.5, 7);
    const den = room(169, -2, 12, -6, 9);
    const way = hall(well, fork, 4.6, 8, 0.3, 0.7);
    const wrong = hall(fork, sanctum, 4.8, 14);
    hall(fork, cavern, 5, 9, 0.3, 0.7);
    hall(cavern, grotto, 3.4, 5.5);
    hall(cavern, kink, 4.6, 8.5);
    hall(kink, hand, 4.6, 8.5);
    hall(hand, drop, 5.2, 11);
    // (Down to the gallery's level before it reaches the pit's far lip.)
    hall(drop, gallery, 5, 12, 0.02, 0.2);
    hall(gallery, nook, 3.3, 5.5);
    const shut = hall(gallery, den, 4.2, 7.5, 0.3, 0.7);
    const link = hall(den, fork, 4.2, 12.5, 0.15, 0.6);
    const along = (h: Hall) => { const l = Math.hypot(h.bx - h.ax, h.bz - h.az); return { l, dx: (h.bx - h.ax) / l, dz: (h.bz - h.az) / l }; };

    // The ledge on the wrong way: three fifths of the way to the sanctum, and everything past it stands on it.
    // (3.4 m: on foot a jump and a step get you up 2.5, and it's low enough to see the light over from down the passage.)
    {
      const { l, dx, dz } = along(wrong);
      this.shelves.push({ x: wrong.ax + dx * l * 0.58, z: wrong.az + dz * l * 0.58, dx, dz, h: 3.4, w: 21, back: 70, ramp: 1 });
    }
    // The balcony: the den's link climbs a ramp and drops into the fork. One way, unless you can bound.
    {
      const { l, dx, dz } = along(link);
      const d = l - fork.r - 6.5;
      this.shelves.push({ x: link.ax + dx * d, z: link.az + dz * d, dx: -dx, dz: -dz, h: 5, w: 11.5, back: 4, ramp: 27 });
    }
    // The pit, and the tunnel back out of it to the room before (in the wall between the two lips, clear of the stones).
    const ex = (hand.x - drop.x) / Math.hypot(hand.x - drop.x, hand.z - drop.z), ez = (hand.z - drop.z) / Math.hypot(hand.x - drop.x, hand.z - drop.z);
    const ox = (gallery.x - drop.x) / Math.hypot(gallery.x - drop.x, gallery.z - drop.z), oz = (gallery.z - drop.z) / Math.hypot(gallery.x - drop.x, gallery.z - drop.z);
    {
      const sg = Math.sign(ex * oz - ez * ox) || 1;
      const [ux, uz] = turn(ex, ez, sg * 0.9), [vx, vz] = turn(-ex, -ez, -sg * 0.75);
      // (Well out past the room's walls, wobble and all: its edge shows only across the two passages' mouths.)
      const R = drop.r + 6;
      const p: Pit = { x: drop.x, z: drop.z, r: R, depth: 11, ax: drop.x + ux * drop.r * 0.8, az: drop.z + uz * drop.r * 0.8, bx: hand.x + vx * hand.r * 0.8, bz: hand.z + vz * hand.r * 0.8, tr: 6.6, t0: 0.3, t1: 0.86 };
      // Its floor starts to climb only once it's out from under the disc.
      for (let t = 0; t < 0.6; t += 0.01) if (Math.hypot(lerp(p.ax, p.bx, t) - p.x, lerp(p.az, p.bz, t) - p.z) < R + 1) p.t0 = Math.max(p.t0, t + 0.03);
      this.pit = p;
      this.halls.push({ ax: p.ax, az: p.az, bx: p.bx, bz: p.bz, r: 3.5, fa: drop.floor, fb: hand.floor, ta: 0.3, tb: 0.7, clear: 6.5 });
    }
    const tunnel = this.halls[this.halls.length - 1];

    this.den = { x: den.x, z: den.z, outX: 0, outZ: 0 };
    this.pool = { x: cavern.x + 4, z: cavern.z - 8 * s, r: 17, y: cavern.floor - 0.3 };
    {
      let [x0, z0, x1, z1] = [1e9, 1e9, -1e9, -1e9];
      for (const r of this.rooms) { x0 = Math.min(x0, r.x - r.r); z0 = Math.min(z0, r.z - r.r); x1 = Math.max(x1, r.x + r.r); z1 = Math.max(z1, r.z + r.r); }
      this.box = [Math.floor(x0 - 9), Math.floor(z0 - 9), Math.ceil(x1 + 9), Math.ceil(z1 + 9)];
    }

    // Four great columns, set about the passage's mouth so it stands in the middle of the gap
    // between the near two (and the far two leave room to watch you let down from across the well).
    this.door = Math.atan2(way.bz, way.bx);
    for (const a of [60, -60, 140, -140].map((d) => this.door + (d * Math.PI) / 180)) this.solids.push({ x: Math.cos(a) * COLUMN_R, z: Math.sin(a) * COLUMN_R, r: 2.3, top: 99 });

    // Light. The portal overhead lights the well's floor in one big disc.
    this.glows.push({ x: 0, y: well.clear - 0.5, z: 0, r: 31, warm: false });
    {
      const k = this.shelves[0], x = sanctum.x + k.dx * 1.5, z = sanctum.z + k.dz * 1.5;
      this.ember = { x, y: this.floor(x, z) + 1.7, z };
    }
    this.glows.push({ ...this.ember, r: 15, warm: true });

    // The stepping stones: flat tops across the pit, along a curve that bows away from both lips. The far
    // lip is 6 m lower than the near one, and the stones climb away from it: five short hops, 0.8 m up
    // each, to a high stone 4 m over the lip you left and 10 over the one you're going to. From there it
    // is one long fall: 21 m across to the far lip itself and the passage beyond it, nothing to hit but
    // the floor. No jump makes it (a sprint off the top comes down about 15 m out, in the pit). The
    // parachute does however it's used: held forward it floats you 40 m and more, well down the
    // passage; with Shift held (which spills air: a steeper, faster dive) about 27.
    // On foot a jump at a run clears about 3.5 m, less going up.
    // (The owner, of the first version, level stones and 9.5 m: "impossible... the parachute would need
    // a height difference"; of the second, 3.8 m down over 15: "too hard still... go up even more...
    // more fall-y". And a thing only the probe showed: the natural way to take a long gap is a sprint,
    // and Shift held on in the air is the parachute's dive, which fell well short of a stone sized for
    // floating. So there is no stone to land on now: the target is the whole far side.)
    {
      const P = this.pit, ml = Math.hypot(ex + ox, ez + oz), mx = -(ex + ox) / ml, mz = -(ez + oz) / ml;
      const gaps = [2.1, 2.0, 2.0, 2.0, 2.0], radii = [2.5, 2.6, 2.6, 2.6, 3.1], lift = [0.8, 1.6, 2.4, 3.2, 4.0];
      const lay = (bow: number) => {
        // (It leaves the near lip straight out along its passage and comes in to the far one the same way,
        // so the first and last stones stand square in front of the lips.)
        const p0 = [P.x + ex * P.r, P.z + ez * P.r], p3 = [P.x + ox * P.r, P.z + oz * P.r];
        const p1 = [p0[0] - ex * 13 + mx * bow, p0[1] - ez * 13 + mz * bow], p2 = [p3[0] - ox * 13 + mx * bow, p3[1] - oz * 13 + mz * bow];
        const at = (t: number): [number, number] => {
          const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
          return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
        };
        const out: [number, number][] = [];
        let t = 0;
        for (let i = 0; i < gaps.length; i++) {
          for (; t < 1; t += 0.0025) {
            const [x, z] = at(t);
            const d = i === 0 ? P.r - Math.hypot(x - P.x, z - P.z) - radii[0] : Math.hypot(x - out[i - 1][0], z - out[i - 1][1]) - radii[i] - radii[i - 1];
            if (d >= gaps[i]) break;
          }
          out.push(at(Math.min(t, 1)));
        }
        const last = out[out.length - 1];
        return { out, end: P.r - Math.hypot(last[0] - P.x, last[1] - P.z) - radii[radii.length - 1], short: t >= 1 };
      };
      // Bowed just far enough that the last hop, on to the far lip, is an easy one.
      let lo = -20, hi = 60;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2, r = lay(m); if (r.short || r.end < 21) lo = m; else hi = m; }
      lay(hi).out.forEach(([x, z], i) => {
        // (Heights are from the near lip's level, whatever the pit's floor is doing underneath.)
        const o: Solid = { x, z, r: radii[i], top: drop.floor + lift[i] - this.floor(x, z), flat: true, y: drop.floor + lift[i] };
        this.tops.push(o);
        this.solids.push(o);
      });
    }

    // The rockfall: big boulders shoulder to shoulder across the den's passage, wall to wall.
    {
      const h = shut, { l, dx, dz } = along(h);
      const d = l - den.r - 9;
      const qx = h.ax + dx * d, qz = h.az + dz * d;
      this.den.outX = qx - dx * 5; this.den.outZ = qz - dz * 5;
      let u0 = 0, u1 = 0;
      while (u0 > -9 && this.sdf(qx - dz * u0, qz + dx * u0) < 0.3) u0 -= 0.25;
      while (u1 < 9 && this.sdf(qx - dz * u1, qz + dx * u1) < 0.3) u1 += 0.25;
      const n = Math.max(2, Math.ceil((u1 - u0) / 2.1) + 1);
      for (let i = 0; i < n; i++) {
        const u = lerp(u0, u1, i / (n - 1)), al = (i % 2 ? 0.5 : -0.4) + (rnd() - 0.5) * 0.4;
        const x = qx - dz * u + dx * al, z = qz + dx * u + dz * al;
        const sy = 2.0 + rnd() * 0.5;
        const stone: Stone = { x, y: this.floor(x, z) + sy * 0.25, z, sx: 1.45 + rnd() * 0.25, sy, sz: 1.4 + rnd() * 0.2, rot: rnd() * 6.28, seed: 3 + (i % 5) };
        const solid: Solid = { x, z, r: 1.4, top: 3.2 };
        this.plug.push({ stone, solid });
        this.solids.push(solid);
      }
      this.at.rockfall = [qx - dx * 2.7, qz - dz * 2.7];
    }

    // Places, for the scripts.
    {
      const k0 = this.shelves[0], k1 = this.shelves[1], P = this.pit;
      Object.assign(this.at, {
        well: [0, 0], fork: [fork.x, fork.z], sanctum: [sanctum.x, sanctum.z], cavern: [cavern.x, cavern.z], grotto: [grotto.x, grotto.z],
        kink: [kink.x, kink.z], hand: [hand.x, hand.z], drop: [drop.x, drop.z], gallery: [gallery.x, gallery.z], nook: [nook.x, nook.z], den: [den.x, den.z],
        ledge: [k0.x - k0.dx * 9, k0.z - k0.dz * 9], ledgeTop: [k0.x + k0.dx * 4, k0.z + k0.dz * 4],
        balcony: [k1.x + k1.dx * 3, k1.z + k1.dz * 3], underBalcony: [k1.x - k1.dx * 7, k1.z - k1.dz * 7],
        lip: [P.x + ex * (P.r + 2.5), P.z + ez * (P.r + 2.5)], overMouth: [hand.x - ex * (hand.r + 2), hand.z - ez * (hand.r + 2)], farLip: [P.x + ox * (P.r + 2.5), P.z + oz * (P.r + 2.5)],
        tunnel: [lerp(P.ax, P.bx, 0.12), lerp(P.az, P.bz, 0.12)], tunnelTop: [lerp(P.ax, P.bx, 0.92), lerp(P.az, P.bz, 0.92)],
        out: [this.den.outX, this.den.outZ], pool: [this.pool.x, this.pool.z],
      });
    }

    /** Is this where nothing should stand: by a lip (nothing to climb), on the stepping stones' line, in a narrow way? */
    const keepClear = (x: number, z: number, r: number) => {
      for (const k of this.shelves) if (Math.hypot(x - k.x, z - k.z) < 15 + r) return true;
      for (const k of ['lip', 'farLip']) if (Math.hypot(x - this.at[k][0], z - this.at[k][1]) < 14 + r) return true;
      if (this.tops.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 5 + r)) return true;
      for (const h of [shut, tunnel, link]) if (this.hallAt(h, x, z)[0] < 1.5) return true;
      // Nothing in the way of the warm light, seen from the fork up the wrong way.
      if (this.hallAt(wrong, x, z)[0] < 0.5 && this.past(this.shelves[0], x, z) < 0) return true;
      return Math.hypot(x, z) < WELL_R + 3;
    };

    // Glowcaps in clumps (each its own small light, always on): the side grotto's garden, the den's (so
    // the shut-in creature is seen among them), a few on the balcony (the way down, seen from the fork),
    // by the pool, across the pit at the far lip, and a trail over the pit's floor to the tunnel back up.
    const P = this.pit;
    const clumps: [number, number, number, number][] = [
      [grotto.x - 3, grotto.z - 2 * s, 6, 6.5], [grotto.x + 3.6, grotto.z + 1.5 * s, 5, 6.5], [grotto.x - 0.5, grotto.z - 5.5 * s, 4, 6.5], [grotto.x + 1, grotto.z + 5.5 * s, 4, 6.5],
      [den.x + 3, den.z - 4.5 * s, 6, 7], [den.x - 4.5, den.z + 3 * s, 5, 7], [den.x + 2, den.z + 6 * s, 4, 7],
      [this.at.balcony[0] + this.shelves[1].dz * 2.6, this.at.balcony[1] - this.shelves[1].dx * 2.6, 3, 7],
      [this.pool.x - 19, this.pool.z + 7 * s, 5, 8], [this.pool.x + 13, this.pool.z - 17 * s, 5, 8],
      [this.at.farLip[0] - oz * 2.8, this.at.farLip[1] + ox * 2.8, 4, 8],
      [lerp(P.x, P.ax, 0.25), lerp(P.z, P.az, 0.25), 3, 7], [lerp(P.x, P.ax, 0.72), lerp(P.z, P.az, 0.72), 4, 7], [lerp(P.ax, P.bx, 0.13), lerp(P.az, P.bz, 0.13), 3, 7],
      [nook.x, nook.z, 5, 6.5], [nook.x - 4, nook.z + 3 * s, 3, 6.5],
      [hand.x - 3.5, hand.z - 1 * s, 4, 9], [hand.x + 6.5, hand.z - 7.5 * s, 3, 9],
      // (The way on from the hand's room, marked: it has three ways out.)
      [hand.x - ex * (hand.r - 2) - ez * 3.4, hand.z - ez * (hand.r - 2) + ex * 3.4, 3, 8],
    ];
    for (const [cx, cz, n, reach] of clumps) {
      // Drawn in from the wall if the wobble has put one there.
      let [x, z] = [cx, cz];
      for (let i = 0; i < 12 && this.sdf(x, z) > -1.6; i++) { const g = this.grad(x, z); x -= g[0] * 0.5; z -= g[1] * 0.5; }
      let tall = 0;
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 0.7 + rnd() * 1.5;
        const mx = x + Math.cos(a) * d, mz = z + Math.sin(a) * d;
        if (this.sdf(mx, mz) > -0.7 || this.tops.some((o) => Math.hypot(mx - o.x, mz - o.z) < o.r + 0.8)) continue;
        const h = i === 0 ? 1.7 + rnd() * 1.1 : 0.45 + rnd() * 1.1;
        tall = Math.max(tall, h);
        this.caps.push({ x: mx, y: this.floor(mx, mz) - 0.05, z: mz, h, r: h * (0.32 + rnd() * 0.12), lean: 0.05 + rnd() * 0.12, dir: rnd() * Math.PI * 2 });
      }
      this.glows.push({ x, y: this.floor(x, z) + tall + 0.6, z, r: reach, warm: false });
    }

    // The hand: a giant's, of the giant's own stone, reaching up out of the floor of its room,
    // its palm to the way you come in by. (Its shape is shell.ts's; here it's something to walk round.)
    {
      const x = hand.x + 2, z = hand.z - 3 * s;
      this.hand = { x, z, rot: Math.atan2(kink.x - x, kink.z - z) };
      this.solids.push({ x, z, r: 3.1, top: 99 });
      this.at.palm = [x, z];
    }

    // Spirit lanterns on the walls: down each passage a side at a time, and round each room.
    {
      const hang = (px: number, pz: number, dx: number, dz: number, reach: number) => {
        let d = 0;
        for (; d < reach && this.sdf(px + dx * d, pz + dz * d) < -0.15; d += 0.25);
        if (d >= reach) return;
        const wx = px + dx * d, wz = pz + dz * d;
        if (this.lanterns.some((o) => Math.hypot(o.x - wx, o.z - wz) < 13)) return;
        // Not on a lip's face, nor where the floor is about to change under it.
        if (this.shelves.some((k) => Math.abs(this.past(k, wx, wz)) < 2.5 && Math.hypot(wx - k.x, wz - k.z) < k.w) || Math.abs(this.pitSd(wx, wz)) < 2.5) return;
        const [gx, gz] = this.grad(wx, wz);
        const f = this.floor(wx - gx * 0.8, wz - gz * 0.8), c = this.ceil(wx, wz) - f;
        if (c < LANTERN_Y + 1.6) return;
        const inn = Layout.lean(LANTERN_Y, c) + 0.1;
        this.lanterns.push({ x: wx - gx * inn, y: f + LANTERN_Y, z: wz - gz * inn, nx: -gx, nz: -gz });
      };
      // At the foot of each ledge, either side, so its face is lit when you get to it: a wall you can see.
      for (const k of this.shelves) for (const sd of [1, -1]) hang(k.x - k.dx * 5.5, k.z - k.dz * 5.5, -k.dz * sd, k.dx * sd, 14);
      // Either side of the way out of the well, so the first thing you do down here is wake one.
      for (const a of [0.42, -0.42]) hang(0, 0, Math.cos(this.door + a), Math.sin(this.door + a), WELL_R + 4);
      this.halls.forEach((h, hi) => {
        const { l, dx, dz } = along(h);
        for (let d = 10, i = 0; d < l - 6; d += 19, i++) {
          const x = h.ax + dx * d, z = h.az + dz * d;
          // (None past the ledge: up there the only light is the warm one.)
          if (this.rooms.some((r) => Math.hypot(x - r.x, z - r.z) < r.r + 2) || this.past(this.shelves[0], x, z) > -3 && h === wrong) continue;
          const sd = (i + hi) % 2 ? 1 : -1;
          hang(x, z, -dz * sd, dx * sd, h.r + 5);
        }
      });
      this.rooms.forEach((r, ri) => {
        if (ri === 0 || r === sanctum) return;
        const n = r.r > 20 ? 7 : r.r > 12.4 ? 5 : 2;
        for (let i = 0; i < n; i++) { const a = ((i + 0.5 + ri * 0.37) / n) * Math.PI * 2; hang(r.x, r.z, Math.cos(a), Math.sin(a), r.r + 3.2); }
      });
      this.lanterns.forEach((o, i) => this.glows.push({ x: o.x + o.nx * 0.7, y: o.y + 0.5, z: o.z + o.nz * 0.7, r: LANTERN_R, warm: false, lantern: i }));
    }

    // Pebble boulders along the walls, and the odd one out on the floor of the big rooms.
    const [bx0, bz0, bx1, bz1] = this.box;
    for (let i = 0, tries = 0; i < 230 && tries < 12000; tries++) {
      const x = lerp(bx0, bx1, rnd()), z = lerp(bz0, bz1, rnd());
      const big = rnd() < 0.3;
      const sx = big ? 1.4 + rnd() * 1.3 : 0.5 + rnd() * 0.7;
      const d = -this.sdf(x, z);
      const open = !big && rnd() < 0.2 && this.rooms.some((r) => r.r > 20 && Math.hypot(x - r.x, z - r.z) < r.r - 6);
      // Half sunk into the wall's foot, so the way through stays clear.
      if (d < sx * 0.35 || (d > sx * 0.8 + 0.5 && !open)) continue;
      if (this.wet(x, z) > 0.02 || keepClear(x, z, sx)) continue;
      if (this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + sx + 0.5) || this.lanterns.some((o) => Math.hypot(o.x - x, o.z - z) < sx + 2)) continue;
      const sy = sx * (0.55 + rnd() * 0.35);
      this.stones.push({ x, y: this.floor(x, z) + sy * 0.25, z, sx, sy, sz: sx * (0.8 + rnd() * 0.3), rot: rnd() * 6.28, seed: 3 + (i % 5) });
      this.solids.push({ x, z, r: sx * 0.92, top: sy * 1.2 });
      i++;
    }

    // Stalagmites by the walls and stalactites over them: rounded, never sharp.
    for (let i = 0, tries = 0; i < 180 && tries < 12000; tries++) {
      const x = lerp(bx0, bx1, rnd()), z = lerp(bz0, bz1, rnd());
      const d = -this.sdf(x, z);
      const down = rnd() < 0.55;
      if (Math.hypot(x, z) < WELL_R + 2) continue;
      if (down ? d < 2.5 : d < 0.6 || d > 2.6 || this.wet(x, z) > 0.02 || keepClear(x, z, 1)) continue;
      // Nothing hangs where a bound has to clear a lip.
      if (down && this.shelves.some((k) => Math.hypot(x - k.x, z - k.z) < 12)) continue;
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
      near = Math.min(near, d);
      if (d > 9) continue;
      const k = Math.exp(-Math.max(0, d + 1.5) * 0.9);
      sum += room(r) * k; w += k;
    }
    // A passage has no say inside the rooms it joins (it runs to their middles).
    const out = 0.002 + smoothstep(-4, 0.5, near);
    for (const h of this.halls) {
      const [d, t] = this.hallAt(h, x, z);
      if (d > 9) continue;
      const k = Math.exp(-Math.max(0, d + 1.5) * 0.9) * out;
      sum += hall(h, t) * k; w += k;
    }
    return w > 1e-9 ? sum / w : 0;
  }

  /** How far under the pool's surface the floor is (m; 0 on the shore). */
  wet(x: number, z: number) {
    const p = this.pool;
    const d = Math.hypot(x - p.x, z - p.z);
    if (d > p.r + 2) return 0;
    return 0.8 * smoothstep(p.r, p.r - 4.5, d + (this.noise(x * 0.2, z * 0.2, 13) - 0.5) * 3);
  }

  /** The smooth floor: no ledge, no pit. */
  ground(x: number, z: number): number {
    return this.blend(x, z, (r) => r.floor, (h, t) => lerp(h.fa, h.fb, smoothstep(h.ta, h.tb, t))) - this.wet(x, z);
  }

  /** How far past a ledge's line a point is (m; negative below it). */
  past(k: Shelf, x: number, z: number): number {
    return (x - k.x) * k.dx + (z - k.z) * k.dz;
  }

  /** How much higher a ledge makes the floor here. `hard`: as if its top ran on out over the lip (for the mesh). */
  riseOf(k: Shelf, x: number, z: number, hard = false): number {
    const p = this.past(k, x, z);
    if ((!hard && p <= 0) || p > k.back + k.ramp || Math.abs(-(x - k.x) * k.dz + (z - k.z) * k.dx) > k.w) return 0;
    // (A true step at the line: a short steep ramp there could be crept up, a foot's rise at a time.)
    return k.h * (1 - smoothstep(k.back, k.back + k.ramp, Math.max(0, p)));
  }

  /** Distance to the pit's edge (m): negative inside it (the disc, or its tunnel). */
  pitSd(x: number, z: number): number {
    const p = this.pit;
    if (!p) return 1e9;
    const dx = p.bx - p.ax, dz = p.bz - p.az;
    const t = clamp(((x - p.ax) * dx + (z - p.az) * dz) / (dx * dx + dz * dz), 0, 1);
    return Math.min(Math.hypot(x - p.x, z - p.z) - p.r, Math.hypot(x - p.ax - dx * t, z - p.az - dz * t) - p.tr);
  }

  /** How deep the pit is here, were this point in it: all of it under the disc, less and less up the tunnel. */
  sinkOf(x: number, z: number): number {
    const p = this.pit;
    if (Math.hypot(x - p.x, z - p.z) <= p.r) return p.depth;
    const dx = p.bx - p.ax, dz = p.bz - p.az;
    const t = clamp(((x - p.ax) * dx + (z - p.az) * dz) / (dx * dx + dz * dz), 0, 1);
    return p.depth * (1 - smoothstep(p.t0, p.t1, t));
  }

  /** The floor with the pit in it but no ledges: what the walls stand on. */
  low(x: number, z: number): number {
    return this.ground(x, z) - (this.pitSd(x, z) < 0 ? this.sinkOf(x, z) : 0);
  }

  /** Floor height (not counting what stands on it). */
  floor(x: number, z: number): number {
    let f = this.low(x, z);
    for (const k of this.shelves) f += this.riseOf(k, x, z);
    return f;
  }

  /** Ceiling height (it takes no notice of ledges or the pit). */
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
    // (The walls stand on the low floor and lean from there.)
    const lo = this.low(x, z);
    if (-this.sdf(x, z) < Layout.lean(y - lo + pad, c + f - lo) + pad) return false;
    // Only what's tall stops the camera (the columns, a big stalagmite, a pillar); it looks over the rest.
    for (const o of this.solids) if (o.top > 3 && y < f + o.top + pad && Math.hypot(x - o.x, z - o.z) < o.r + pad * 0.5) return false;
    return true;
  }
}
