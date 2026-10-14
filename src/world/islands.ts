// The one world's shape: an archipelago (owner, 2026-10-13; DESIGN.md "The
// shape of the world"). Each island is a line of points and a radius. Inside
// its shape the land is whatever the noise makes of it; outside, it sinks
// away, the faster the further out, so high ground reaches further into the
// sea than low and a coast follows its hills and isn't a drawn line.
//
// Pure functions of (x, z): the chunk workers and the main thread must agree.
// Only the one world has islands (`ONE_WORLD`): any other seed is the old
// endless land, kept for the dev scripts that still ask for one.

import { seedFromString } from '../core/rng';

/** The seed everyone plays. */
export const ONE_WORLD = seedFromString('hilda');

export interface Island { name: string; pts: [number, number][]; r: number }

/** `home` has the cabin and rings 1 and 2; `south`, across the strait, rings 3 to 5. The rest the story hasn't reached. */
export const ISLANDS: Island[] = [
  { name: 'home', pts: [[100, 500], [100, 1900]], r: 1500 },
  { name: 'south', pts: [[100, 5060], [-250, 6900]], r: 1000 },
  { name: 'east', pts: [[3600, -1700], [4900, -1200]], r: 1300 },
  { name: 'west', pts: [[-3300, -700], [-3900, 1000]], r: 1300 },
  { name: 'north', pts: [[-400, -3700], [900, -4200]], r: 1400 },
];

/** Where the dungeons' rings stand in the one world (found on the land before it had a sea, and kept). */
export const RINGS: [number, number][] = [[-203, 1748], [118, 3059], [89, 4408], [73, 5608], [-252, 6763]];

/**
 * A crossing: a way over the sea from one island to the next, as a line from
 * shore to shore. The path-finder treats it as dry level ground, so a way and
 * the giant's trail can go over it. (What stands there is the story's.)
 */
export interface Crossing { name: string; a: [number, number]; b: [number, number]; half: number }
export const CROSSINGS: Crossing[] = [
  { name: 'strait', a: [105, 3440], b: [95, 4080], half: 9 },
];

/**
 * Sea that is cut whatever the land does: a line and how far either side of
 * it. The strait between `home` and `south`, wide enough that its middle is
 * the deep, so nobody swims it.
 */
export const STRAITS: { a: [number, number]; b: [number, number]; r: number }[] = [
  { a: [-1100, 3770], b: [1300, 3770], r: 215 },
];

/** Water further than this from every shore is the deep (m). */
export const DEEP = 120;

/** How fast the land sinks outside a shape (m a metre, once it's going), and how far out it has all gone. */
const SLOPE = 0.3, EASE = 90, GONE = 260, FLOOR = -45;

/** A coast wanders either side of its shape by this (m): cheap, and the same wherever it's asked. */
function wander(x: number, z: number) {
  return 55 * Math.sin(x / 310 + 1.3 * Math.sin(z / 270)) + 40 * Math.sin(z / 190 + 1.7 * Math.sin(x / 230)) + 18 * Math.sin((x + z) / 71);
}

/** How far (x, z) is outside island `s`'s shape (negative: inside it). */
function outsideOf(s: Island, x: number, z: number) {
  let best = Infinity;
  for (let k = 0; k < Math.max(1, s.pts.length - 1); k++) {
    const a = s.pts[k], b = s.pts[Math.min(s.pts.length - 1, k + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return best - s.r;
}

/** How far outside every island (negative: inside one), its coast's wander included. */
export function outside(x: number, z: number) {
  let best = Infinity;
  for (const s of ISLANDS) best = Math.min(best, outsideOf(s, x, z));
  // (Well inside, nothing wanders: the land the story stands on is exactly what it was.)
  return best < -200 ? best : best + wander(x, z);
}

/** The island (x, z) belongs to (its index in `ISLANDS`), or -1 out at sea. */
export function islandAt(x: number, z: number) {
  let id = -1, best = 600;
  for (let i = 0; i < ISLANDS.length; i++) { const d = outsideOf(ISLANDS[i], x, z); if (d < best) { best = d; id = i; } }
  return id;
}

/** The land's height `h` at (x, z), sunk for the sea round the islands. */
export function sink(h: number, x: number, z: number) {
  for (const c of STRAITS) {
    const dx = c.b[0] - c.a[0], dz = c.b[1] - c.a[1];
    const t = Math.max(0, Math.min(1, ((x - c.a[0]) * dx + (z - c.a[1]) * dz) / (dx * dx + dz * dz)));
    const e = c.r + 0.5 * wander(z, x) - Math.hypot(x - c.a[0] - dx * t, z - c.a[1] - dz * t);
    if (e > 0) h = Math.max(Math.min(h, FLOOR), h - (0.6 * e * e) / (e + 50));
  }
  const d = outside(x, z);
  if (d <= 0) return h;
  // Eased in, so there's no crease along the shape's edge; then all of it, so no peak is left standing far out.
  const s = h - (SLOPE * d * d) / (d + EASE) - Math.max(0, d - GONE) * 1.4;
  return s < FLOOR ? Math.min(h, FLOOR) : s;
}

/** On a crossing's line (and within its half width)? */
export function onCrossing(x: number, z: number, more = 0) {
  for (const c of CROSSINGS) {
    const dx = c.b[0] - c.a[0], dz = c.b[1] - c.a[1];
    const t = Math.max(0, Math.min(1, ((x - c.a[0]) * dx + (z - c.a[1]) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(x - c.a[0] - dx * t, z - c.a[1] - dz * t) < c.half + more) return true;
  }
  return false;
}
