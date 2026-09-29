import { clamp, hash01, lerp, mulberry32, smoothstep } from '../core/rng';

// The guaranteed start area for the story: a broken cabin, an axe on a stump,
// a small grove of trees to chop, a brook with stones on its bank and, far
// across the valley, the next cabin. It's a pure function of the seed and the
// base height field (no POIs, no three.js), so chunk workers and the main
// thread place it identically.

/** Story cabin footprint (local x = along the ridge, local +z = the door side). */
export const RUIN_W = 6.6;
export const RUIN_D = 5.0;

export interface SitePoint { x: number; z: number }
export interface StoryTree { x: number; z: number; sc: number; rot: number; lean: number; tone: number }
export interface BrookPt { x: number; z: number; bed: number }
export interface StoryStone { x: number; z: number; rot: number; sc: number }

export interface StorySite {
  /** Cabin centre and floor-pad height. */
  x: number; z: number; y: number;
  /** Rotation (radians); the door faces (sin rot, cos rot). */
  rot: number;
  spawn: SitePoint & { yaw: number };
  stump: SitePoint;
  trees: StoryTree[];
  /** Where the spirit sits under a tree while you chop. */
  seat: SitePoint;
  brook: BrookPt[];
  /** Where the spirit waits on the brook bank. */
  bank: SitePoint;
  stones: StoryStone[];
  /** Boulders marking the brook's spring. */
  spring: SitePoint;
  /** The next cabin, far across the valley (visible from here). */
  far: { x: number; z: number; y: number; rot: number };
  /** Short worn footpaths: door -> yard, yard -> brook bank. */
  paths: { ax: number; az: number; bx: number; bz: number }[];
  /** Bounding box of everything above (quick rejects). */
  box: [number, number, number, number];
}

interface Field {
  base(x: number, z: number): number;
  forest(x: number, z: number, h: number): number;
}

/** Local cabin coordinates -> world. */
export function siteLocal(s: { x: number; z: number; rot: number }, lx: number, lz: number): SitePoint {
  const c = Math.cos(s.rot), sn = Math.sin(s.rot);
  return { x: s.x + c * lx + sn * lz, z: s.z - sn * lx + c * lz };
}

/** World -> local cabin coordinates. */
export function siteToLocal(s: { x: number; z: number; rot: number }, x: number, z: number): SitePoint {
  const c = Math.cos(s.rot), sn = Math.sin(s.rot);
  const dx = x - s.x, dz = z - s.z;
  return { x: c * dx - sn * dz, z: sn * dx + c * dz };
}

function flatness(f: Field, x: number, z: number, r: number): number {
  const h = f.base(x, z);
  let worst = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    worst = Math.max(worst, Math.abs(f.base(x + Math.cos(a) * r, z + Math.sin(a) * r) - h));
  }
  return worst;
}

function gradient(f: Field, x: number, z: number, e = 12): [number, number] {
  return [(f.base(x + e, z) - f.base(x - e, z)) / (2 * e), (f.base(x, z + e) - f.base(x, z - e)) / (2 * e)];
}

/** Trace a meandering brook through `p0`, downhill both ways from its spring. */
function traceBrook(f: Field, x0: number, z0: number, fallback: [number, number], rnd: () => number): BrookPt[] | null {
  const walk = (sign: number, steps: number) => {
    const pts: SitePoint[] = [];
    let x = x0, z = z0;
    let [dx, dz] = fallback;
    if (sign < 0) { dx = -dx; dz = -dz; }
    const ph = rnd() * 6.28;
    for (let i = 0; i < steps; i++) {
      const [gx, gz] = gradient(f, x, z);
      const gl = Math.hypot(gx, gz);
      // Downstream follows the fall line (upstream climbs it); on near-flat
      // ground it keeps its heading. A slow sine gives the meander.
      if (gl > 0.004) {
        const tx = (-gx / gl) * sign, tz = (-gz / gl) * sign;
        const k = clamp(gl * 8, 0.15, 0.55);
        dx = lerp(dx, tx, k); dz = lerp(dz, tz, k);
      }
      const m = Math.sin(i * 0.55 + ph) * 0.32;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      const mx = dx - dz * m, mz = dz + dx * m;
      const ml = Math.hypot(mx, mz);
      x += (mx / ml) * 4;
      z += (mz / ml) * 4;
      pts.push({ x, z });
      if (sign > 0 && f.base(x, z) < 0.6) break; // reached the sea or a lake
    }
    return pts;
  };
  const down = walk(1, 38);
  const up = walk(-1, 16);
  const line = [...up.reverse(), { x: x0, z: z0 }, ...down];
  // Bed: never climbs going downstream, ~0.8 m under the banks.
  const out: BrookPt[] = [];
  let bed = Infinity;
  let deepest = 0;
  for (const p of line) {
    const h = f.base(p.x, p.z);
    bed = Math.min(bed - 0.035, h - 0.85);
    deepest = Math.max(deepest, h - bed);
    out.push({ x: p.x, z: p.z, bed });
  }
  if (deepest > 4.2) return null; // it would cut a gorge through a hump
  return out;
}

export function findStorySite(seed: number, f: Field): StorySite {
  let fallback: StorySite | null = null;
  const tryAt = (x: number, z: number, strict: boolean): StorySite | null => {
    const h = f.base(x, z);
    if (h < 7 || h > 95) return null;
    if (flatness(f, x, z, 10) > (strict ? 1.6 : 3)) return null;
    if (f.forest(x, z, h) > (strict ? 0.2 : 0.5)) return null;
    // Keep off the shore: nothing low within 35 m.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      if (f.base(x + Math.cos(a) * 35, z + Math.sin(a) * 35) < 3) return null;
    }
    const rnd = mulberry32((seed ^ Math.imul(Math.round(x) + 7, 73856093) ^ Math.imul(Math.round(z) + 3, 19349663)) >>> 0);
    const [gx, gz] = gradient(f, x, z, 30);
    const gl = Math.hypot(gx, gz) || 1;
    const downX = -gx / gl, downZ = -gz / gl;
    for (const side of [1, -1]) {
      // The brook runs down the slope beside the cabin: the cabin's +x (the
      // chimney end) faces it, the grove is on the far side (-x).
      const bx = -downZ * side, bz = downX * side;
      const rot = Math.atan2(-bz, bx) + (rnd() - 0.5) * 0.3;
      const s = { x, z, rot };
      const L = (lx: number, lz: number) => siteLocal(s, lx, lz);
      const y = h + 0.05;

      // Grove: seven trees in a loose cluster off the cabin's -x end.
      const gc = L(-RUIN_W / 2 - 24, 5);
      const trees: StoryTree[] = [];
      for (let tries = 0; tries < 80 && trees.length < 7; tries++) {
        const a = rnd() * Math.PI * 2;
        const r = trees.length === 0 ? 0 : 2.5 + rnd() * 6.5;
        const tx = gc.x + Math.cos(a) * r, tz = gc.z + Math.sin(a) * r;
        if (trees.some((t) => Math.hypot(t.x - tx, t.z - tz) < 3.8)) continue;
        const th = f.base(tx, tz);
        if (th < 3 || flatness(f, tx, tz, 2.5) > 1.4) continue;
        if (Math.hypot(tx - x, tz - z) < 15) continue;
        trees.push({ x: tx, z: tz, sc: 0.78 + rnd() * 0.3, rot: rnd() * 6.283, lean: rnd() - 0.5, tone: rnd() });
      }
      if (trees.length < 6) continue;
      // The spirit sits under the tree nearest the cabin, on the cabin side.
      trees.sort((p, q) => Math.hypot(p.x - x, p.z - z) - Math.hypot(q.x - x, q.z - z));
      const t0 = trees[0];
      const tl = Math.hypot(x - t0.x, z - t0.z);
      const seat = { x: t0.x + ((x - t0.x) / tl) * 1.5, z: t0.z + ((z - t0.z) / tl) * 1.5 };

      // Brook: its centre passes ~33 m off the chimney end.
      const b0 = L(RUIN_W / 2 + 33, 1);
      const brook = traceBrook(f, b0.x, b0.z, [downX, downZ], rnd);
      if (!brook) continue;
      let ok = true;
      for (const p of brook) {
        if (Math.hypot(p.x - x, p.z - z) < 19) ok = false;
        for (const t of trees) if (Math.hypot(p.x - t.x, p.z - t.z) < 7) ok = false;
      }
      if (!ok && strict) continue;
      // Bank anchor and stones: on the cabin side of the brook, near b0.
      let bi = 0, bd = Infinity;
      for (let i = 0; i < brook.length; i++) {
        const d = Math.hypot(brook[i].x - b0.x, brook[i].z - b0.z);
        if (d < bd) { bd = d; bi = i; }
      }
      const i0 = Math.max(0, Math.min(brook.length - 2, bi));
      let tx = brook[i0 + 1].x - brook[i0].x, tz = brook[i0 + 1].z - brook[i0].z;
      const tlen = Math.hypot(tx, tz) || 1;
      tx /= tlen; tz /= tlen;
      // Normal toward the cabin.
      let nx = -tz, nz = tx;
      if (nx * (x - brook[i0].x) + nz * (z - brook[i0].z) < 0) { nx = -nx; nz = -nz; }
      const c0 = brook[i0];
      const bank = { x: c0.x + nx * 4.4, z: c0.z + nz * 4.4 };
      const stones: StoryStone[] = [];
      for (let k = 0; k < 7; k++) {
        const along = (k - 3) * 1.9 + (rnd() - 0.5) * 0.8;
        const out = 2.35 + rnd() * 0.7;
        stones.push({ x: c0.x + tx * along + nx * out, z: c0.z + tz * along + nz * out, rot: rnd() * 6.283, sc: 0.85 + rnd() * 0.3 });
      }
      const src = brook[0];
      const spring = { x: src.x - (brook[1].x - src.x) * 0.6, z: src.z - (brook[1].z - src.z) * 0.6 };

      // Spawn in front of the door, looking at the cabin with the axe in view.
      const sp = L(1.4, RUIN_D / 2 + 12.5);
      const look = L(-1.5, 0);
      const spawn = { x: sp.x, z: sp.z, yaw: Math.atan2(sp.x - look.x, sp.z - look.z) };
      const stump = L(-RUIN_W / 2 - 2.4, RUIN_D / 2 + 2.6);

      const door = L(-0.9, RUIN_D / 2 + 1.2);
      const yard = L(-0.6, RUIN_D / 2 + 9);
      const paths = [
        { ax: door.x, az: door.z, bx: yard.x, bz: yard.z },
        { ax: L(RUIN_W / 2 + 1.5, 0.5).x, az: L(RUIN_W / 2 + 1.5, 0.5).z, bx: bank.x, bz: bank.z },
      ];

      const far = findFarCabin(seed, f, x, z, y, rot);
      let x0 = x - 30, z0 = z - 30, x1 = x + 30, z1 = z + 30;
      for (const p of [...brook, ...trees, spring]) {
        x0 = Math.min(x0, p.x - 12); z0 = Math.min(z0, p.z - 12);
        x1 = Math.max(x1, p.x + 12); z1 = Math.max(z1, p.z + 12);
      }
      const site: StorySite = { x, z, y, rot, spawn, stump, trees, seat, brook, bank, stones, spring, far, paths, box: [x0, z0, x1, z1] };
      if (ok) return site;
      fallback ??= site;
    }
    return null;
  };
  // Spiral out from the origin; the first good spot wins.
  for (const strict of [true, false]) {
    for (let r = 0; r < 4200; r += 29) {
      const n = Math.max(1, Math.floor((r * Math.PI * 2) / 45));
      const a0 = hash01(r, 0, seed, 901) * 6.28;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const s = tryAt(Math.cos(a) * r, Math.sin(a) * r, strict);
        if (s) return s;
      }
    }
    if (fallback) return fallback;
  }
  // Nothing anywhere (an all-sea seed?): build it at the origin regardless.
  const y = Math.max(f.base(0, 0), 4) + 0.05;
  return {
    x: 0, z: 0, y, rot: 0, spawn: { x: 1.4, z: 15, yaw: 0 }, stump: { x: -5.7, z: 5.1 }, trees: [], seat: { x: -20, z: 0 },
    brook: [], bank: { x: 36, z: 0 }, stones: [], spring: { x: 36, z: -40 }, far: findFarCabin(seed, f, 0, 0, y, 0), paths: [], box: [-40, -40, 40, 40],
  };
}

/**
 * The next cabin: 600-1400 m off, on flat dry ground, with a clear line of
 * sight from the story cabin so its lit window reads across the valley at
 * night. Preference goes to spots in front of the door.
 */
function findFarCabin(seed: number, f: Field, x: number, z: number, y: number, rot: number) {
  let best = { x: x + 900, z, y: f.base(x + 900, z) + 0.05, rot: 0 };
  let bestScore = -Infinity;
  const eye = y + 3.5;
  const doorX = Math.sin(rot), doorZ = Math.cos(rot);
  for (let ai = 0; ai < 24; ai++) {
    for (let ri = 0; ri < 6; ri++) {
      const a = (ai / 24) * Math.PI * 2 + hash01(ai, ri, seed, 931) * 0.2;
      const r = 600 + ri * 160;
      const cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
      const h = f.base(cx, cz);
      if (h < 6 || h > 170) continue;
      if (flatness(f, cx, cz, 8) > 2.5) continue;
      if (f.forest(cx, cz, h) > 0.4) continue;
      // Line of sight: the worst clearance along the ray.
      let margin = Infinity;
      const top = h + 3;
      for (let t = 0.03; t < 0.97; t += 0.02) {
        const px = lerp(x, cx, t), pz = lerp(z, cz, t);
        const ly = lerp(eye, top, t);
        const g = f.base(px, pz);
        margin = Math.min(margin, ly - g - 10 * f.forest(px, pz, g) * smoothstep(0.85, 0.97, t));
      }
      const facing = (Math.cos(a) * doorX + Math.sin(a) * doorZ) * 0.5 + 0.5;
      const score = Math.min(margin, 12) * 3 + facing * 14 - Math.abs(r - 950) * 0.01 + (h > y ? 4 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = { x: cx, z: cz, y: h + 0.05, rot: Math.atan2(x - cx, z - cz) + (hash01(ai, ri, seed, 932) - 0.5) * 0.6 };
      }
    }
  }
  return best;
}

/** Distance to the brook's centre line and the bed height there (d = Infinity if far). */
export function brookQuery(brook: BrookPt[], x: number, z: number, out: { d: number; bed: number; t: number; i: number }) {
  out.d = Infinity;
  out.bed = 0;
  for (let i = 0; i + 1 < brook.length; i++) {
    const a = brook[i], b = brook[i + 1];
    const vx = b.x - a.x, vz = b.z - a.z;
    const wx = x - a.x, wz = z - a.z;
    const l2 = vx * vx + vz * vz;
    const t = l2 > 0 ? clamp((wx * vx + wz * vz) / l2, 0, 1) : 0;
    const dx = wx - vx * t, dz = wz - vz * t;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < out.d) { out.d = d; out.bed = lerp(a.bed, b.bed, t); out.t = t; out.i = i; }
  }
  return out;
}
