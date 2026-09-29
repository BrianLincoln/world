import { hash01, hashInt, mulberry32 } from '../core/rng';
import type { StorySite } from './storySite';

// Beacon towers: huge stacked-boulder cairns on high points, each crowned by
// a face boulder with a flame. They form a network of towers that can see
// each other, flame to flame. Like the story site, this is a pure function
// of the seed and the base height field, so chunk workers and the main
// thread agree exactly.
//
// The network is *grown* out from the home tower: a candidate high point
// joins only once some tower already in the network can see it. So every
// tower sees at least one other and the whole network is connected by
// construction. Candidates nothing can see are simply dropped.

/** How far one flame can be seen from another (m). */
export const TOWER_RANGE = 1500;
/** No two towers closer than this (m). */
export const TOWER_SPACING = 560;
/** The network covers a disc this big around the home tower (m). */
export const TOWER_REGION = 5200;
/** The home tower stands this far from the home cabin (m). */
export const HOME_MIN = 200;
export const HOME_MAX = 420;
/** ...or out to this, if nothing nearer can be seen from the yard (m). */
export const HOME_FAR = 600;
/** Trees are kept out of the sightline from the yard to the home tower for this far (m). */
export const HOME_VIEW = 90;
/** Terrain must pass this far under the flame-to-flame line (m). */
const LOS_CLEAR = 2;
/** One candidate high point per cell this size (m). */
const CAND_CELL = 400;
/** Flame height above the head boulder's centre, as a fraction of its height. */

export interface TowerBoulder { x: number; y: number; z: number; sx: number; sy: number; rot: number }

export interface Tower {
  id: number;
  x: number; z: number;
  /** Ground height at the centre. */
  y: number;
  /** Where the glow is seen from afar (inside the head): sight lines run between these. */
  flame: { x: number; y: number; z: number };
  /** The head boulder (the tower's spirit): its centre and radii. */
  head: TowerBoulder;
  /** Overall size (1 = the first draft's tower). */
  scale: number;
  /** The capstone under the head. */
  slab: TowerBoulder;
  /** Radius of the base boulder. */
  foot: number;
  /**
   * The doorway in the door boulder (`boulders[1]`): the opening's centre on
   * its surface, and the ground in front of it where walking in slurps you up.
   */
  door: { x: number; y: number; z: number; ground: { x: number; y: number; z: number } };
  /** Which way the face looks (radians; +z = 0, like body.heading). */
  yaw: number;
  home: boolean;
  /** Every boulder except the head (base to shoulder, plus loose ones round the foot). */
  boulders: TowerBoulder[];
  /** Towers whose flame this one can see. */
  links: number[];
  /** The tower it was first seen from while growing the network (-1 for home). */
  parent: number;
}

export interface TowerNet {
  towers: Tower[];
  home: Tower;
  /** How long building it took (ms), for the HUD. */
  ms: number;
  /** Line-of-sight tests run while building. */
  tests: number;
  /** Where the home tower is seen from in the yard (trees keep off the line from here toward it). */
  yard: { x: number; z: number };
}

interface Field {
  base(x: number, z: number): number;
  forest(x: number, z: number, h: number): number;
}

interface Cand { x: number; z: number; h: number; score: number }

function ringMean(f: Field, x: number, z: number, r: number, n = 8) {
  let s = 0;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    s += f.base(x + Math.cos(a) * r, z + Math.sin(a) * r);
  }
  return s / n;
}

function ringWorst(f: Field, x: number, z: number, h: number, r: number) {
  let w = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    w = Math.max(w, Math.abs(f.base(x + Math.cos(a) * r, z + Math.sin(a) * r) - h));
  }
  return w;
}

/** Walk uphill from (x, z) to the local summit (coarse to fine). */
function climb(f: Field, x: number, z: number, step: number, bound?: (x: number, z: number) => boolean): Cand {
  let h = f.base(x, z);
  let s = step;
  for (let it = 0; it < 60 && s > 3; it++) {
    let bx = x, bz = z, bh = h;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const px = x + Math.cos(a) * s, pz = z + Math.sin(a) * s;
      if (bound && !bound(px, pz)) continue;
      const ph = f.base(px, pz);
      if (ph > bh) { bh = ph; bx = px; bz = pz; }
    }
    if (bh > h) { x = bx; z = bz; h = bh; } else s *= 0.5;
  }
  return { x, z, h, score: 0 };
}

/** Is this summit a decent tower site? Returns its score, or -Infinity. */
function siteScore(f: Field, c: Cand): number {
  if (c.h < 14) return -Infinity; // shoreline and valley floors
  // The foot has to be standable: no knife-edge ridges.
  if (ringWorst(f, c.x, c.z, c.h, 10) > 5.5) return -Infinity;
  // A real hilltop: it stands proud of the ground around it.
  const prom = c.h - ringMean(f, c.x, c.z, 140);
  if (prom < 3) return -Infinity;
  // Not a cliff top: you can still walk up to it.
  if (ringWorst(f, c.x, c.z, c.h, 32) > 24) return -Infinity;
  // Bald tops read from afar; a tower lost in forest doesn't.
  const wood = (f.forest(c.x, c.z, c.h) + f.forest(c.x + 30, c.z, c.h) + f.forest(c.x - 30, c.z, c.h) + f.forest(c.x, c.z + 30, c.h) + f.forest(c.x, c.z - 30, c.h)) / 5;
  return c.h + Math.min(prom, 60) * 1.5 - wood * 90;
}

/** Every tower is this much bigger than the first draft (the owner asked for bigger). */
export const TOWER_SCALE = 1.45;
/** Head boulder radius and height, and how far it's set back on the capstone, per unit scale. */
const HEAD_R = 3.9, HEAD_Y = 3.8, HEAD_BACK = 2.9;
/** The glow (where sight lines meet) is this far above the head's centre, in head heights. */
const GLOW_OVER = 0.2;

/**
 * The stack's shape, from the ground up: a wide base half buried in the
 * hill; the big door boulder on it (you walk into its doorway once the lock
 * is off); 0-2 middles; a capstone; then the head. Every tower rolls its own
 * proportions. `rnd` = 0.5 always gives the nominal tower. Heights are
 * centre heights above the lowest ground under the base.
 */
function layout(scale: number, rnd: () => number) {
  const out: { r: number; sy: number; cy: number }[] = [];
  const baseR = (11 + rnd() * 3) * scale;
  const baseSy = baseR * (0.32 + rnd() * 0.1);
  // Mostly buried: a low rocky mound round the door boulder's foot. (Higher,
  // it rose up inside the door boulder's room as a wall you couldn't walk past.)
  out.push({ r: baseR, sy: baseSy, cy: -baseSy * 0.75 });
  const doorR = (8.6 + rnd() * 1.4) * scale;
  const doorSy = doorR * (0.8 + rnd() * 0.12);
  // The door boulder stands on the ground (its flattened bottom is at -0.55).
  let cy = doorSy * 0.53;
  out.push({ r: doorR, sy: doorSy, cy });
  cy += doorSy * 0.72;
  const mids = Math.floor(rnd() * 2.999);
  const shrink = 0.66 + rnd() * 0.16;
  let r = doorR;
  for (let k = 0; k < mids; k++) {
    r *= shrink;
    const sy = r * (0.8 + rnd() * 0.25);
    cy += sy * 0.85;
    out.push({ r, sy, cy });
    cy += sy * 0.7;
  }
  // The capstone: from a wide thin brim to a chunky block.
  const chunky = rnd();
  const capR = (5.2 + (1 - chunky) * 3.4 + rnd() * 0.8) * scale;
  const capSy = capR * (0.26 + chunky * 0.24);
  cy += capSy * 0.85;
  out.push({ r: capR, sy: capSy, cy });
  const slab = out[out.length - 1];
  const hs = 0.92 + rnd() * 0.16;
  const hy = HEAD_Y * scale * hs;
  const headY = slab.cy + slab.sy * 0.72 + hy * 0.58;
  return { out, headY, hr: HEAD_R * scale * hs, hy, flameY: headY + hy * GLOW_OVER };
}

/** Glow height above the ground for a tower of this scale (nominal `layout`). */
function flameOver(scale: number) {
  return layout(scale * TOWER_SCALE, () => 0.5).flameY;
}

/**
 * Can flame A see flame B? The straight line between them must clear the
 * terrain by LOS_CLEAR (trees don't count). The towers' own hilltops near
 * each end are skipped: the flame is up on the stack, not on the ground.
 */
function sees(f: Field, ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  const d = Math.hypot(bx - ax, bz - az);
  if (d > TOWER_RANGE) return false;
  const n = Math.ceil(d / 18);
  const skip = 16 / d;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (t < skip || t > 1 - skip) continue;
    const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    if (f.base(px, pz) > ay + (by - ay) * t - LOS_CLEAR) return false;
  }
  return true;
}

/** Build the boulder stack for a tower. Deterministic per tower position. */
function stack(seed: number, id: number, x: number, z: number, y: number, yaw: number, home: boolean, f: Field): Omit<Tower, 'links' | 'parent'> {
  const rnd = mulberry32(hashInt(Math.round(x), Math.round(z), seed, 977));
  const scale = TOWER_SCALE * (home ? 1.12 : 1) * (0.92 + rnd() * 0.12);
  const boulders: TowerBoulder[] = [];
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const L = layout(scale, rnd);
  // Stand the stack on the lowest ground under the base, so on a slope the
  // uphill side is buried rather than the downhill side floating.
  let ground = y;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ground = Math.min(ground, f.base(x + Math.cos(a) * L.out[0].r * 0.7, z + Math.sin(a) * L.out[0].r * 0.7));
  }
  // The door boulder sits forward on the base, toward the face side, so its
  // doorway comes down near the ground. Above it, some towers lean one way
  // the whole way up; the rest wobble.
  const lean = rnd() < 0.45 ? rnd() * Math.PI * 2 : -1;
  let ox = 0, oz = 0;
  L.out.forEach((b, k) => {
    if (k === 1) { ox = fx * L.out[0].r * 0.28; oz = fz * L.out[0].r * 0.28; }
    // The door faces the way the head looks.
    const rot = k === 1 ? yaw : rnd() * Math.PI;
    boulders.push({ x: x + ox, y: ground + b.cy, z: z + oz, sx: b.r, sy: b.sy, rot });
    if (k >= 1 && k < L.out.length - 1) {
      // Pull back over the base so the stack stays balanced.
      if (k === 1) { ox -= fx * b.r * 0.22; oz -= fz * b.r * 0.22; }
      if (lean >= 0) { ox += Math.cos(lean) * b.r * 0.22; oz += Math.sin(lean) * b.r * 0.22; }
      else { ox += (rnd() - 0.5) * b.r * 0.28; oz += (rnd() - 0.5) * b.r * 0.28; }
    }
  });
  const doorB = boulders[1];
  // The doorway, on the door boulder's face a little below its middle: the
  // opening's centre on the surface, and the spot on the ground in front of
  // it where walking in gets you slurped up.
  const DOOR_DIR_Y = -0.2;
  const dl = Math.hypot(DOOR_DIR_Y, 1);
  const doorC = { x: doorB.x + fx * doorB.sx / dl, y: doorB.y + DOOR_DIR_Y * doorB.sy / dl, z: doorB.z + fz * doorB.sx / dl };
  const sx = doorC.x + fx * 2.5, sz = doorC.z + fz * 2.5;
  const door = { ...doorC, ground: { x: sx, y: f.base(sx, sz), z: sz } };
  // Some stand beside a second boulder as big as the door's (never in front).
  if (rnd() < 0.3) {
    let a = rnd() * Math.PI * 2;
    if (Math.cos(a - (Math.PI / 2 - yaw)) > -0.2) a += Math.PI;
    const b0 = L.out[0];
    const r = b0.r * (0.55 + rnd() * 0.15);
    const bx = x + Math.cos(a) * b0.r * 0.7, bz = z + Math.sin(a) * b0.r * 0.7;
    const sy = r * (0.75 + rnd() * 0.2);
    boulders.push({ x: bx, y: Math.min(f.base(bx, bz), ground) + sy * 0.3, z: bz, sx: r, sy, rot: rnd() * Math.PI });
  }
  // Half of them have a smaller boulder or two leaning on the base.
  if (rnd() < 0.5) {
    const n = 1 + Math.floor(rnd() * 2);
    const a0 = rnd() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const a = a0 + k * (0.9 + rnd() * 0.6);
      if (Math.cos(a - (Math.PI / 2 - yaw)) > 0.4) continue;
      const r = L.out[0].r * (0.3 + rnd() * 0.15);
      const d = L.out[0].r * 0.95;
      const bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
      const sy = r * (0.7 + rnd() * 0.25);
      boulders.push({ x: bx, y: f.base(bx, bz) + sy * 0.3, z: bz, sx: r, sy, rot: rnd() * Math.PI });
    }
  }
  // The head sits toward the back of the capstone.
  const slabI = L.out.length - 1;
  const slab = boulders[slabI];
  const back = HEAD_BACK * scale * 0.5;
  const head: TowerBoulder = { x: slab.x - fx * back, y: ground + L.headY, z: slab.z - fz * back, sx: L.hr, sy: L.hy, rot: yaw };
  const flame = { x: head.x, y: ground + L.flameY, z: head.z };
  // Now and then a small stone perched on the capstone beside the head.
  if (rnd() < 0.4) {
    const side = rnd() < 0.5 ? -1 : 1;
    const rx = fz * side, rz = -fx * side;
    const r = (1.1 + rnd() * 0.7) * scale;
    const bx = slab.x + rx * slab.sx * 0.62 - fx * slab.sx * 0.2, bz = slab.z + rz * slab.sx * 0.62 - fz * slab.sx * 0.2;
    boulders.push({ x: bx, y: slab.y + slab.sy * 0.75 + r * 0.35, z: bz, sx: r, sy: r * 0.7, rot: rnd() * Math.PI });
  }
  // A few loose boulders round the foot, like rubble that rolled off
  // (kept clear of the doorway).
  const foot = L.out[0].r;
  const loose = 2 + Math.floor(rnd() * 4);
  for (let k = 0; k < loose; k++) {
    const a = rnd() * Math.PI * 2;
    if (Math.cos(a - (Math.PI / 2 - yaw)) > 0.55) continue;
    const d = foot + (3 + rnd() * 8) * scale;
    const bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
    const r = (1.2 + rnd() * 2.2) * scale;
    const sy = r * (0.55 + rnd() * 0.25);
    boulders.push({ x: bx, y: f.base(bx, bz) + sy * 0.25, z: bz, sx: r, sy, rot: rnd() * Math.PI });
  }
  return { id, x, z, y, scale, flame, head, slab, door, foot, yaw, home, boulders };
}

/** The spot in the yard the home tower is framed from. */
function homeYard(site: StorySite) {
  return { x: site.x + Math.sin(site.rot) * 8, z: site.z + Math.cos(site.rot) * 8 };
}

/**
 * Where the home tower goes: the best hilltop 200-420 m from the cabin that
 * you can see from the yard, clear of the story set, and that can see at
 * least one other candidate (so the network has somewhere to grow).
 */
function homeSpot(seed: number, f: Field, site: StorySite, cands: Cand[], tests: { n: number }): Cand {
  const opts: Cand[] = [];
  const inRing = (x: number, z: number) => {
    const d = Math.hypot(x - site.x, z - site.z);
    return d >= HOME_MIN && d <= HOME_FAR;
  };
  const yard = homeYard(site);
  const eye = f.base(yard.x, yard.z) + 1.6;
  for (let ai = 0; ai < 20; ai++) {
    for (const r of [HOME_MIN + 30, (HOME_MIN + HOME_MAX) / 2, HOME_MAX - 30, (HOME_MAX + HOME_FAR) / 2, HOME_FAR - 30]) {
      const a = (ai / 20) * Math.PI * 2 + hash01(ai, Math.round(r), seed, 971) * 0.3;
      const c = climb(f, site.x + Math.cos(a) * r, site.z + Math.sin(a) * r, 24, inRing);
      if (opts.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < 30)) continue;
      // Keep off the story set: the approach path, the brook, the grove.
      if (c.x > site.box[0] - 25 && c.x < site.box[2] + 25 && c.z > site.box[1] - 25 && c.z < site.box[3] + 25) continue;
      if (c.h < 6 || ringWorst(f, c.x, c.z, c.h, 10) > 5) continue;
      // A kid bikes up here from the cabin: no cliffs round it, and a gentle
      // climb along the way (the worst 20 m of the straight line).
      if (ringWorst(f, c.x, c.z, c.h, 40) > 16) continue;
      const cd = Math.hypot(c.x - site.x, c.z - site.z);
      let steep = 0, prevH = f.base(site.x, site.z);
      for (let s2 = 20; s2 <= cd; s2 += 20) {
        const hh = f.base(site.x + ((c.x - site.x) / cd) * s2, site.z + ((c.z - site.z) / cd) * s2);
        steep = Math.max(steep, Math.abs(hh - prevH) / 20);
        if (hh < 1.5) steep = Infinity; // no water on the way
        prevH = hh;
      }
      if (steep > 0.42) continue;
      const wood = f.forest(c.x, c.z, c.h);
      const top = c.h + flameOver(1.12);
      // Seen from the yard: the flame (and most of the stack) over the terrain.
      const d = Math.hypot(c.x - yard.x, c.z - yard.z);
      // Trees count as a 14 m wall, except in the first stretch from the
      // yard (the story keeps a view corridor clear there) and in the
      // tower's own clearing.
      let clear = Infinity;
      for (let t = 0.05; t < 0.97; t += 10 / d) {
        const px = yard.x + (c.x - yard.x) * t, pz = yard.z + (c.z - yard.z) * t;
        const g = f.base(px, pz);
        const wood = t * d < HOME_VIEW || (1 - t) * d < 32 ? 0 : 14 * Math.min(1, f.forest(px, pz, g) / 0.1);
        clear = Math.min(clear, eye + (top - 14 - eye) * t - g - wood);
      }
      const prom = c.h - ringMean(f, c.x, c.z, 90);
      c.score = Math.min(c.h - site.y, 80) * 0.6 + Math.min(prom, 30) + (clear > 0 ? 70 : Math.max(-40, clear * 2)) - Math.abs(d - 300) * 0.03 - Math.max(0, d - HOME_MAX) * 0.15 - steep * 40 - wood * 40;
      opts.push(c);
    }
  }
  opts.sort((a, b) => b.score - a.score);
  // The best one that can see somewhere to go.
  for (const o of opts) {
    const top = o.h + flameOver(1.12);
    for (const c of cands) {
      const d = Math.hypot(c.x - o.x, c.z - o.z);
      if (d < TOWER_SPACING || d > TOWER_RANGE) continue;
      tests.n++;
      if (sees(f, o.x, top, o.z, c.x, c.h + flameOver(1), c.z)) return o;
    }
  }
  return opts[0] ?? { x: site.x + 300, z: site.z, h: f.base(site.x + 300, site.z), score: 0 };
}

export function buildTowerNet(seed: number, f: Field, site: StorySite): TowerNet {
  const t0 = performance.now();
  const tests = { n: 0 };
  // 1. Candidate high points: one summit per cell, around the home cabin.
  const cands: Cand[] = [];
  const R = TOWER_REGION + TOWER_RANGE;
  const c0 = Math.floor((site.x - R) / CAND_CELL), c1 = Math.floor((site.x + R) / CAND_CELL);
  const r0 = Math.floor((site.z - R) / CAND_CELL), r1 = Math.floor((site.z + R) / CAND_CELL);
  for (let cj = r0; cj <= r1; cj++) {
    for (let ci = c0; ci <= c1; ci++) {
      const mx = (ci + 0.5) * CAND_CELL, mz = (cj + 0.5) * CAND_CELL;
      if (Math.hypot(mx - site.x, mz - site.z) > R) continue;
      // Highest of a few jittered samples, then climb to its summit.
      let bx = mx, bz = mz, bh = -Infinity;
      for (let k = 0; k < 9; k++) {
        const px = (ci + (k % 3 + hash01(ci * 3 + k, cj, seed, 961)) / 3) * CAND_CELL;
        const pz = (cj + (Math.floor(k / 3) + hash01(ci, cj * 3 + k, seed, 962)) / 3) * CAND_CELL;
        const h = f.base(px, pz);
        if (h > bh) { bh = h; bx = px; bz = pz; }
      }
      const c = climb(f, bx, bz, 40);
      if (Math.hypot(c.x - site.x, c.z - site.z) < HOME_MIN + 120) continue;
      if (cands.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < 60)) continue;
      c.score = siteScore(f, c);
      if (c.score > -Infinity) cands.push(c);
    }
  }

  // 2. The home tower, then grow the network from it: each round, of the
  // candidates some tower can already see (and far enough from them all),
  // take the best-placed one.
  const hs = homeSpot(seed, f, site, cands, tests);
  const yawTo = (ax: number, az: number, bx: number, bz: number) => Math.atan2(bx - ax, bz - az);
  const towers: Tower[] = [];
  const add = (c: Cand, home: boolean, parent: number, yaw: number) => {
    const t = stack(seed, towers.length, c.x, c.z, c.h, yaw, home, f) as Tower;
    t.links = [];
    t.parent = parent;
    towers.push(t);
    return t;
  };
  add(hs, true, -1, yawTo(hs.x, hs.z, site.x, site.z));

  interface Live { c: Cand; seen: number; dead: boolean }
  const live: Live[] = cands.map((c) => ({ c, seen: -1, dead: false }));
  const flameOf = (c: Cand) => c.h + flameOver(1);
  const onAdd = (t: Tower) => {
    for (const l of live) {
      if (l.dead) continue;
      const d = Math.hypot(l.c.x - t.x, l.c.z - t.z);
      if (d < TOWER_SPACING) { l.dead = true; continue; }
      if (l.seen >= 0 || d > TOWER_RANGE || Math.hypot(l.c.x - site.x, l.c.z - site.z) > TOWER_REGION + 400) continue;
      tests.n++;
      if (sees(f, t.flame.x, t.flame.y, t.flame.z, l.c.x, flameOf(l.c), l.c.z)) l.seen = t.id;
    }
  };
  onAdd(towers[0]);
  for (;;) {
    let best: Live | null = null;
    for (const l of live) if (!l.dead && l.seen >= 0 && (!best || l.c.score > best.c.score)) best = l;
    if (!best) break;
    best.dead = true;
    const p = towers[best.seen];
    // Every tower looks back toward the one it was seen from, so faces
    // across the network turn, loosely, toward home.
    const t = add(best.c, false, p.id, yawTo(best.c.x, best.c.z, p.x, p.z));
    onAdd(t);
  }

  // 3. Links: every pair in range that can see each other.
  for (let i = 0; i < towers.length; i++) {
    for (let j = i + 1; j < towers.length; j++) {
      const a = towers[i], b = towers[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) > TOWER_RANGE) continue;
      const known = b.parent === a.id || a.parent === b.id;
      if (!known) tests.n++;
      if (known || sees(f, a.flame.x, a.flame.y, a.flame.z, b.flame.x, b.flame.y, b.flame.z)) { a.links.push(b.id); b.links.push(a.id); }
    }
  }
  // The parent link was tested against the candidate's estimated flame; the
  // real stack is a little different, so make sure it's in.
  for (const t of towers) if (t.parent >= 0 && !t.links.includes(t.parent)) { t.links.push(t.parent); towers[t.parent].links.push(t.id); }

  return { towers, home: towers[0], ms: performance.now() - t0, tests: tests.n, yard: homeYard(site) };
}

/** Line of sight between two towers' flames (terrain only). For probes and the debug view. */
export function towersSee(f: Field, a: Tower, b: Tower) {
  return sees(f, a.flame.x, a.flame.y, a.flame.z, b.flame.x, b.flame.y, b.flame.z);
}
