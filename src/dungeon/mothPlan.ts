import { clamp, hash01, lerp, mulberry32, smoothstep } from '../core/rng';
import { COLUMN_R, LANTERN_R, LANTERN_Y, Layout, WELL_R, type Cap, type Glow, type Hall, type Lantern, type Room, type Shelf, type Solid, type Spike, type Stone } from './layout';

// The third dungeon's plan: the Moon Hall, as a pure function of the seed.
// 2.5D like the other two (layout.ts says how: free space is `sdf < 0`, a
// floor under it, a clear height over it, walls that lean in to a vault).
//
//                                                (50 m up)
//   well ── way ── ante ── way ── THE HALL ◖PULPIT══LEDGE ── gallery ── loft, the dark light
//                               d1      d0  ▲
//                                  LAMP     └ the moth sleeps on its face, wings spread
//                               d2      d3
//
// The hall is one great round room, dark, and very tall (130 m: height is
// free, the walls are the same ten rows of triangles however high they
// stand; what costs is floor). In its middle stands a lamp, out. Let into the
// floor round it is a ring of eight pictures of the moon, the month in
// order: new, waxing crescent, first quarter, waxing gibbous, full, waning
// gibbous, third quarter, waning crescent. They never change: they are the
// answer. Out along the lines of four of them (new, the quarters, full)
// stand four turning stones (`dials`), each a square head with those four
// moons on its faces; the face turned to the lamp is the one that counts.
// Turn each stone to the moon pictured at its place in the ring, and it
// sends the lamp a beam; all four, and the lamp is lit. The moth comes down
// to it, and is yours.
//
// Here and there on the hall's walls and the gallery's grow glowcaps, small
// and few (`wallCaps`): points of light that give the dark its height.
//
// The way in is a long one, with a bend in it (a small room half way). The
// way on is a ledge 50 m up the far wall, no way up to it on foot, with a
// pulpit of rock standing out from it into the hall (a great flat-topped
// pillar, its top level with the ledge), and a gallery behind it to the loft
// where the dungeon's light is kept. The moth sleeps on the pulpit's face,
// where she is seen from anywhere in the hall. The lit lamp throws one more
// beam, up to a pale stone on the pulpit's top.
//
// Local frame: the origin is the middle of the well, y = 0 its floor, +x the
// way on. The seed picks which side the gallery bends to (`side`), the moons
// asked for, how the stones stand to begin with, the walls' wobble and the
// scatter.

/** A turning stone: where it stands, which way its counted face looks (to the lamp, unit), the face it wants and the one it starts on (0 new, 1 first quarter, 2 full, 3 third quarter). */
export interface Dial { x: number; z: number; nx: number; nz: number; want: number; start: number }
/** A glowcap growing out of a wall: where its middle is (on the wall's face), how big, and how it sits. */
export interface WallCap { x: number; y: number; z: number; r: number; dir: number; tilt: number }

/** How high the ledge stands over the hall's floor (m). */
export const LEDGE_H = 50;
/** How far off the pulpit's face the sleeping moth's middle is (m). */
const CLING = 0.34;
/** How high the great hall is, and the gallery over its own floor (m). */
export const HALL_H = 130, GALLERY_H = 46;
/** How far from the lamp the stones stand, and the moons in the floor lie (m). */
export const DIAL_R = 25, MOSAIC_R = 9.5, FLOOR_MOON_R = 1.9;
/** The pulpit's shape: its radius (of its top's) at each part of its height, foot to top. The mesh and the collision both read it. */
export const PULPIT: [number, number][] = [[0, 0.62], [0.1, 0.46], [0.45, 0.36], [0.74, 0.42], [0.88, 0.62], [0.95, 0.86], [0.985, 1], [1, 1]];
export function pulpitR(k: number) {
  for (let i = 1; i < PULPIT.length; i++) if (k <= PULPIT[i][0]) { const [a, ra] = PULPIT[i - 1], [b, rb] = PULPIT[i]; return ra + ((rb - ra) * (k - a)) / (b - a); }
  return 1;
}
/** A stone's head: how high its middle is over the floor, and half its width (m). */
export const DIAL_Y = 2.3, DIAL_HALF = 0.8;
/** The little moon on a stone's crown, the lamp's in small: how high its middle is over the head's middle, and its radius (m). */
export const DIAL_ORB_Y = DIAL_HALF + 0.22 + 0.5, DIAL_ORB_R = 0.4;
/** The lamp: how high its moon hangs over the floor, and how big it is (m). */
export const LAMP_Y = 6.4, LAMP_R = 1.9;

const smin = (a: number, b: number, k: number) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
};

export class MothLayout {
  readonly rooms: Room[] = [];
  readonly halls: Hall[] = [];
  readonly solids: Solid[] = [];
  readonly stones: Stone[] = [];
  readonly spikes: Spike[] = [];
  readonly caps: Cap[] = [];
  readonly glows: Glow[] = [];
  readonly lanterns: Lantern[] = [];
  readonly shelves: Shelf[] = [];
  readonly dials: Dial[] = [];
  readonly wallCaps: WallCap[] = [];
  /** The moon wanted by the first turning stone, as one of its faces (0..3): the seed's. The rest follow round the ring. */
  private shift = 0;
  /** Which way round the ring the month runs (+1: with the plan's angle), and the angle of the first turning stone. */
  readonly turnDir: number;
  readonly ringAt: number;
  /** Which side the gallery bends to (+1 or -1). */
  readonly side: number;
  /** The lamp in the middle of the hall (its foot). */
  readonly lamp: { x: number; z: number };
  /** The pulpit: a flat-topped pillar standing out from the ledge, its top (`y`, a height of the plan) level with it. */
  readonly pulpit: { x: number; z: number; r: number; y: number };
  /** The pale stone on the pulpit's top that the lit lamp points at. */
  readonly mark: { x: number; y: number; z: number };
  /** Where the moth sleeps: on the pulpit's face, head up, her back to the hall (`nx`, `nz`: into the rock; `lean`: how far the face overhangs there, rad). */
  readonly perch: { x: number; y: number; z: number; nx: number; nz: number; lean: number };
  /** The dungeon's light, in the loft. */
  readonly ember: { x: number; y: number; z: number };
  /** Which of `glows` is the lamp's own, and the first of the four stones' (they follow one another). */
  readonly lampGlow: number;
  readonly dialGlow: number;
  readonly box: [number, number, number, number];
  /** Named places (plan x, z), for the scripts and the dev hooks. */
  readonly at: Record<string, [number, number]> = {};
  /** Which way (local, as atan2(z, x)) the passage leaves the well. */
  readonly door = 0;

  constructor(readonly seed: number) {
    const rnd = mulberry32(seed ^ 0x51ed27);
    const s = (this.side = rnd() < 0.5 ? -1 : 1);
    const room = (x: number, z: number, r: number, floor: number, clear: number): Room => {
      const o = { x, z, r, floor, clear };
      this.rooms.push(o);
      return o;
    };
    const hall = (a: Room, b: Room, r: number, clear: number, ta = 0.25, tb = 0.75): Hall => {
      const h = { ax: a.x, az: a.z, bx: b.x, bz: b.z, r, fa: a.floor, fb: b.floor, ta, tb, clear };
      this.halls.push(h);
      return h;
    };
    const well = room(0, 0, WELL_R, 0, 15);
    const ante = room(66, -22 * s, 10, -2, 10);
    const great = room(206, 0, 56, -6, HALL_H);
    // (The loft's ground is the hall's: the ledge is what lifts it, and all of the gallery, 50 m.)
    // The gallery is long, tall and wide, with a bend half way: a place to fly down.
    const turn = room(350, 44 * s, 16, -6, LEDGE_H + GALLERY_H);
    const loft = room(452, -8 * s, 20, -6, LEDGE_H + GALLERY_H + 8);
    const way = hall(well, ante, 4.8, 9, 0.3, 0.7);
    const way2 = hall(ante, great, 5, 10, 0.2, 0.55);
    const up = hall(great, turn, 10, LEDGE_H + GALLERY_H);
    const up2 = hall(turn, loft, 10, LEDGE_H + GALLERY_H);
    const along = (h: Hall) => { const l = Math.hypot(h.bx - h.ax, h.bz - h.az); return { l, dx: (h.bx - h.ax) / l, dz: (h.bz - h.az) / l }; };

    // The ledge: across the gallery's mouth, just outside the hall's wall. Everything past it stands on it.
    const { dx: ux, dz: uz } = along(up);
    const lip = { x: great.x + ux * (great.r + 2.5), z: great.z + uz * (great.r + 2.5) };
    this.shelves.push({ x: lip.x, z: lip.z, dx: ux, dz: uz, h: LEDGE_H, w: 110, back: 420, ramp: 1 });
    // The pulpit, standing out from it into the hall: you walk straight out on to its top.
    this.pulpit = { x: lip.x - ux * 8, z: lip.z - uz * 8, r: 9.5, y: great.floor + LEDGE_H };
    this.solids.push({ x: this.pulpit.x, z: this.pulpit.z, r: this.pulpit.r, top: LEDGE_H, flat: true, y: this.pulpit.y });

    this.lamp = { x: great.x, z: great.z };
    // (Both it and the stones can be flown over, and stood on.)
    this.solids.push({ x: great.x, z: great.z, r: 2.1, top: LAMP_Y + LAMP_R, flat: true });
    // The four turning stones stand on the line from the door to the ledge and square across it; the ring's set
    // pictures lie between those lines. The seed picks where in the ring the month starts; no stone starts right:
    // the one nearest the way in is a single turn off (the easy first go), the others two or three.
    {
      const base = Math.atan2(uz, ux), shift = (this.shift = Math.floor(rnd() * 4));
      this.turnDir = s;
      this.ringAt = base;
      for (let k = 0; k < 4; k++) {
        const a = base + s * k * (Math.PI / 2), x = great.x + Math.cos(a) * DIAL_R, z = great.z + Math.sin(a) * DIAL_R, want = (k + shift) % 4;
        const off = 2 + Math.floor(rnd() * 2);
        this.dials.push({ x, z, nx: -Math.cos(a), nz: -Math.sin(a), want, start: (want - off + 4) % 4 });
        this.solids.push({ x, z, r: 1.15, top: DIAL_Y + DIAL_ORB_Y + DIAL_ORB_R, flat: true });
        this.at[`dial${k}`] = [x - Math.cos(a) * 2.6, z - Math.sin(a) * 2.6];
      }
      // (The way in is at the hall's -x end.)
      const near = this.dials.reduce((b, o) => (o.x < b.x ? o : b));
      near.start = (near.want + 3) % 4;
    }

    {
      let [x0, z0, x1, z1] = [1e9, 1e9, -1e9, -1e9];
      for (const r of this.rooms) { x0 = Math.min(x0, r.x - r.r); z0 = Math.min(z0, r.z - r.r); x1 = Math.max(x1, r.x + r.r); z1 = Math.max(z1, r.z + r.r); }
      this.box = [Math.floor(x0 - 9), Math.floor(z0 - 9), Math.ceil(x1 + 9), Math.ceil(z1 + 9)];
    }
    for (const a of [60, -60, 140, -140].map((d) => this.door + (d * Math.PI) / 180)) this.solids.push({ x: Math.cos(a) * COLUMN_R, z: Math.sin(a) * COLUMN_R, r: 2.3, top: 99 });

    // The pale stone on the pulpit's top, out by its rim; the moth on its face below.
    {
      const P = this.pulpit;
      this.mark = { x: P.x - ux * (P.r - 1.4), y: P.y + 1.5, z: P.z - uz * (P.r - 1.4) };
      // (The face overhangs there: she lies along it, her middle `CLING` off the rock, or her wings would be in it.)
      const R = (dy: number) => P.r * pulpitR(1 - (4.6 - 0.58 - dy) / LEDGE_H);
      const slope = (R(0.5) - R(-0.5)) / 1;
      const out = R(0) + CLING * Math.hypot(1, slope);
      this.perch = { x: P.x - ux * out, y: P.y - 4.6, z: P.z - uz * out, nx: ux, nz: uz, lean: Math.atan(slope) };
    }
    const { dx: vx, dz: vz } = along(up2);
    this.ember = { x: loft.x + vx * 4, y: this.floor(loft.x + vx * 4, loft.z + vz * 4) + 1.7, z: loft.z + vz * 4 };

    // Light. The portal overhead; the dungeon's own; then the lamp's and the four stones' (the cave sets how far each reaches).
    this.glows.push({ x: 0, y: well.clear - 0.5, z: 0, r: 31, warm: false });
    this.glows.push({ ...this.ember, r: 15, warm: true });
    this.lampGlow = this.glows.length;
    this.glows.push({ x: great.x, y: great.floor + LAMP_Y + 2, z: great.z, r: 0, warm: false });
    this.dialGlow = this.glows.length;
    for (const d of this.dials) this.glows.push({ x: d.x + d.nx * 1.6, y: great.floor + DIAL_Y + 0.6, z: d.z + d.nz * 1.6, r: 5.5, warm: false });
    // (And the floor's ring: a low pool of its own, so the pictures are found in the dark.)
    this.glows.push({ x: great.x, y: great.floor + 2.2, z: great.z, r: MOSAIC_R + 3.5, warm: false });

    Object.assign(this.at, {
      well: [0, 0], door: [WELL_R + 4, 0], ante: [ante.x, ante.z], hall: [great.x - great.r + 14, 0], lamp: [great.x - 6, 0],
      under: [this.pulpit.x - ux * 22, this.pulpit.z - uz * 22], pulpit: [this.pulpit.x, this.pulpit.z], ledge: [lip.x + ux * 5, lip.z + uz * 5], perch: [this.perch.x, this.perch.z],
      gallery: [lerp(lip.x, turn.x, 0.55), lerp(lip.z, turn.z, 0.55)], turn: [turn.x, turn.z], gallery2: [lerp(turn.x, loft.x, 0.5), lerp(turn.z, loft.z, 0.5)], loft: [loft.x - vx * 9, loft.z - vz * 9], light: [this.ember.x, this.ember.z],
    });

    /** Is this where nothing should stand: about the lamp and its stones, under and on the lip, in a narrow way? */
    const keepClear = (x: number, z: number, r: number) => {
      if (Math.hypot(x - great.x, z - great.z) < DIAL_R + 5 + r) return true;
      if (Math.hypot(x - lip.x, z - lip.z) < 24 + r) return true;
      for (const h of [way, way2, up, up2]) if (this.hallAt(h, x, z)[0] < 1.5) return true;
      return Math.hypot(x, z) < WELL_R + 3;
    };

    // Glowcaps: a few down the way in and either side of where it opens into the hall. (None further in: the hall is dark until its lamp is lit.)
    const clumps: [number, number, number, number][] = [
      [36, -8 * s, 4, 7], [ante.x + 2, ante.z - 6 * s, 5, 7], [ante.x - 5, ante.z + 5 * s, 3, 7], [lerp(ante.x, great.x, 0.3), lerp(ante.z, great.z, 0.3) + 4, 3, 7],
      [great.x - great.r + 5, 13, 5, 8], [great.x - great.r + 6, -14, 4, 8],
      [loft.x + vx * 12 - vz * 7, loft.z + vz * 12 + vx * 7, 5, 8], [loft.x + vx * 10 + vz * 9, loft.z + vz * 10 - vx * 9, 4, 8], [turn.x - 8, turn.z + 9 * s, 4, 8],
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

    // Spirit lanterns: either side of the way out of the well, down the way in, and along the gallery.
    {
      const hang = (px: number, pz: number, dx: number, dz: number, reach: number) => {
        let d = 0;
        for (; d < reach && this.sdf(px + dx * d, pz + dz * d) < -0.15; d += 0.25);
        if (d >= reach) return;
        const wx = px + dx * d, wz = pz + dz * d;
        if (this.lanterns.some((o) => Math.hypot(o.x - wx, o.z - wz) < 12)) return;
        if (this.shelves.some((k) => Math.abs(this.past(k, wx, wz)) < 2.5 && Math.hypot(wx - k.x, wz - k.z) < k.w)) return;
        const [gx, gz] = this.grad(wx, wz);
        const f = this.floor(wx - gx * 0.8, wz - gz * 0.8), c = this.ceil(wx, wz) - f;
        if (c < LANTERN_Y + 1.6) return;
        const inn = Layout.lean(LANTERN_Y + f - this.low(wx, wz), this.ceil(wx, wz) - this.low(wx, wz)) + 0.1;
        this.lanterns.push({ x: wx - gx * inn, y: f + LANTERN_Y, z: wz - gz * inn, nx: -gx, nz: -gz });
      };
      for (const a of [0.42, -0.42]) hang(0, 0, Math.cos(this.door + a), Math.sin(this.door + a), WELL_R + 4);
      for (const h of [way, way2, up, up2]) {
        const { l, dx, dz } = along(h);
        for (let d = 10, i = 0; d < l - 4; d += 15, i++) {
          const x = h.ax + dx * d, z = h.az + dz * d;
          if (Math.hypot(x - great.x, z - great.z) < great.r + 5 || Math.hypot(x - loft.x, z - loft.z) < loft.r + 1) continue;
          const sd = i % 2 ? 1 : -1;
          hang(x, z, -dz * sd, dx * sd, h.r + 7);
        }
      }
      this.lanterns.forEach((o, i) => this.glows.push({ x: o.x + o.nx * 0.7, y: o.y + 0.5, z: o.z + o.nz * 0.7, r: LANTERN_R, warm: false, lantern: i }));
    }

    // Boulders along the walls.
    const [bx0, bz0, bx1, bz1] = this.box;
    for (let i = 0, tries = 0; i < 150 && tries < 14000; tries++) {
      const x = lerp(bx0, bx1, rnd()), z = lerp(bz0, bz1, rnd());
      const big = rnd() < 0.3;
      const sx = big ? 1.4 + rnd() * 1.3 : 0.5 + rnd() * 0.7;
      const d = -this.sdf(x, z);
      if (d < sx * 0.35 || d > sx * 0.8 + 0.5 || keepClear(x, z, sx)) continue;
      if (this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + sx + 0.5) || this.lanterns.some((o) => Math.hypot(o.x - x, o.z - z) < sx + 2)) continue;
      const sy = sx * (0.55 + rnd() * 0.35);
      this.stones.push({ x, y: this.floor(x, z) + sy * 0.25, z, sx, sy, sz: sx * (0.8 + rnd() * 0.3), rot: rnd() * 6.28, seed: 3 + (i % 5) });
      this.solids.push({ x, z, r: sx * 0.92, top: sy * 1.2 });
      i++;
    }
    // Stalagmites by the walls and stalactites over them: rounded, never sharp. (None hang over the middle of the hall: that air is for flying in.)
    for (let i = 0, tries = 0; i < 170 && tries < 14000; tries++) {
      const x = lerp(bx0, bx1, rnd()), z = lerp(bz0, bz1, rnd());
      const d = -this.sdf(x, z);
      const down = rnd() < 0.55;
      if (Math.hypot(x, z) < WELL_R + 2) continue;
      if (down ? d < 2.5 || d > 9 : d < 0.6 || d > 2.6 || keepClear(x, z, 1)) continue;
      if (down && Math.hypot(x - lip.x, z - lip.z) < 34) continue;
      const r = down ? 0.5 + rnd() * 0.7 : 0.4 + rnd() * 0.5;
      if (!down && this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r + 0.4)) continue;
      const h = down ? 1.6 + rnd() * Math.min(4.5, this.clear(x, z) * 0.22) : 1 + rnd() * 2.2;
      this.spikes.push({ x, y: down ? this.floor(x, z) + this.clear(x, z) + 0.3 : this.floor(x, z) - 0.2, z, r, h, down });
      if (!down) this.solids.push({ x, z, r: r * 0.8, top: h });
      i++;
    }

    // Glowcaps on the walls, few and far between: little clumps at any height, more of them low down.
    {
      /** A clump where the line from (x, z) along (dx, dz) meets the wall, `up` m over the floor there. */
      const clump = (x: number, z: number, dx: number, dz: number, up: number, reach: number) => {
        const y = this.floor(x, z) + up;
        let d = 0;
        for (; d < reach && this.sdf(x + dx * d, z + dz * d) + this.leanAt(x + dx * d, y, z + dz * d) < 0; d += 0.25);
        if (d >= reach) return;
        const wx = x + dx * d, wz = z + dz * d, [gx, gz] = this.grad(wx, wz), n = 2 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
          const side = (rnd() - 0.5) * 2.6, r = i === 0 ? 0.7 + rnd() * 0.7 : 0.3 + rnd() * 0.5;
          this.wallCaps.push({ x: wx - gz * side + gx * 0.1, y: y + (rnd() - 0.5) * 2.2, z: wz + gx * side + gz * 0.1, r, dir: rnd() * 6.28, tilt: (rnd() - 0.5) * 0.3 });
        }
      };
      for (let i = 0; i < 46; i++) {
        const a = rnd() * Math.PI * 2, up = 2.5 + Math.pow(rnd(), 1.7) * 85;
        // (Not round the pulpit and its ledge, nor over the way in.)
        const off = (b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
        if (off(this.ringAt) < 0.45 || (off(Math.atan2(ante.z - great.z, ante.x - great.x)) < 0.2 && up < 14)) continue;
        clump(great.x + Math.cos(a) * (great.r - 14), great.z + Math.sin(a) * (great.r - 14), Math.cos(a), Math.sin(a), up, 30);
      }
      for (const h of [up, up2]) {
        const { l, dx, dz } = along(h);
        for (let d = 14; d < l - 8; d += 9 + rnd() * 14) {
          const sd = rnd() < 0.5 ? 1 : -1, x = h.ax + dx * d, z = h.az + dz * d;
          if (Math.hypot(x - great.x, z - great.z) < great.r + 8) continue;
          clump(x, z, -dz * sd, dx * sd, 5 + Math.pow(rnd(), 1.4) * 32, h.r + 8);
        }
      }
    }
  }

  /** The moon pictured at place `i` of the floor's ring (a phase of eight). */
  phaseAt(i: number) { return (i + 2 * this.shift) % 8; }

  /** One of the eight places of the floor's ring (0: on the first turning stone's line): where its middle is, and which way is out from the lamp (unit). */
  slot(i: number) {
    const a = this.ringAt + this.turnDir * i * (Math.PI / 4), ox = Math.cos(a), oz = Math.sin(a);
    return { x: this.lamp.x + ox * MOSAIC_R, z: this.lamp.z + oz * MOSAIC_R, ox, oz };
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

  /** The smooth floor: no ledge. */
  ground(x: number, z: number): number {
    return this.blend(x, z, (r) => r.floor, (h, t) => lerp(h.fa, h.fb, smoothstep(h.ta, h.tb, t)));
  }

  past(k: Shelf, x: number, z: number): number {
    return (x - k.x) * k.dx + (z - k.z) * k.dz;
  }

  riseOf(k: Shelf, x: number, z: number, hard = false): number {
    const p = this.past(k, x, z);
    if ((!hard && p <= 0) || p > k.back + k.ramp || Math.abs(-(x - k.x) * k.dz + (z - k.z) * k.dx) > k.w) return 0;
    return k.h * (1 - smoothstep(k.back, k.back + k.ramp, Math.max(0, p)));
  }

  /** (No pit down here: these are the shell's.) */
  pitSd(_x: number, _z: number) { return 1e9; }
  sinkOf(_x: number, _z: number) { return 0; }
  low(x: number, z: number) { return this.ground(x, z); }

  floor(x: number, z: number): number {
    let f = this.ground(x, z);
    for (const k of this.shelves) f += this.riseOf(k, x, z);
    return f;
  }

  ceil(x: number, z: number): number {
    const wild = smoothstep(WELL_R - 1, WELL_R + 10, Math.hypot(x, z));
    return this.ground(x, z) + this.blend(x, z, (r) => r.clear, (h) => h.clear) + wild * (this.noise(x * 0.11, z * 0.11, 14) - 0.5) * 2.4;
  }

  clear(x: number, z: number): number {
    return this.ceil(x, z) - this.floor(x, z);
  }

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
    for (const o of this.solids) if (o.top > 3 && y < f + o.top + pad && Math.hypot(x - o.x, z - o.z) < o.r + pad * 0.5) return false;
    return true;
  }
}
