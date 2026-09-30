import { clamp, hash01, lerp, mulberry32 } from '../core/rng';

// The guaranteed start area for the story: a broken cabin, an axe on a stump,
// a small grove of trees to chop, a brook with stones on its bank and, far
// across the valley, the next cabin. It's a pure function of the seed and the
// base height field (no POIs, no three.js), so chunk workers and the main
// thread place it identically.

/** Story cabin footprint (local x = along the ridge, local +z = the door side). */
export const RUIN_W = 7.4;
export const RUIN_D = 5.6;

export interface SitePoint { x: number; z: number }
export interface StoryTree { x: number; z: number; sc: number; rot: number; lean: number; tone: number }
export interface BrookPt { x: number; z: number; bed: number }
export interface StoryStone { x: number; z: number; rot: number; sc: number }

/** The pasture's fenced rectangle (local x along its length, local +z toward the cabin, where the gate is). */
export const PASTURE_W = 34;
export const PASTURE_D = 24;

/**
 * The flat open ground by the cabin where the stable goes up (phase 3): a
 * fenced pasture with the stable across one end. The ground there is eased
 * onto a gentle plane (see WorldGen.height).
 */
export interface Pasture {
  x: number; z: number;
  /** Local +z (the gate side) faces the cabin. */
  rot: number;
  /** Plane height at the centre, and its slope along local x and z. */
  y: number; sx: number; sz: number;
  /** Which end the stable stands at (local x sign). */
  end: 1 | -1;
}

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
  /** Boulders to smash for stones: [0] has the hammer lying on it. */
  boulders: StoryStone[];
  /** Boulders marking the brook's spring. */
  spring: SitePoint;
  /** The next cabin, far across the valley (visible from here). */
  far: { x: number; z: number; y: number; rot: number };
  /** Where the far cabin's light is seen from at night (the doorstep, or a knoll nearby). */
  lookout: SitePoint;
  /** Short worn footpaths: door -> yard, yard -> brook bank, the approach, yard -> the pasture gate. */
  paths: { ax: number; az: number; bx: number; bz: number }[];
  /** Where the stable and its pasture go (phase 3). */
  pasture: Pasture | null;
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
  let bestView: { s: StorySite; m: number } | null = null;
  let tried = 0;
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

      // Grove: seven trees in a loose cluster behind the cabin (the far side
      // from the path you arrive by), so it isn't the first thing you see.
      const gc = L(-5, -RUIN_D / 2 - 22);
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

      const stump = L(-RUIN_W / 2 - 2.4, RUIN_D / 2 + 2.6);
      // The hammer's boulder and two more, behind the chimney end (away from
      // both the path you arrive by and the grove).
      const boulders: StoryStone[] = [];
      for (const [lx, lz, sc] of [[RUIN_W / 2 + 7, -RUIN_D / 2 - 6, 0.95], [RUIN_W / 2 + 10.5, -RUIN_D / 2 - 4.2, 0.8], [RUIN_W / 2 + 8.6, -RUIN_D / 2 - 9.8, 0.85]] as const) {
        const p = L(lx, lz);
        boulders.push({ x: p.x, z: p.z, rot: rnd() * 6.283, sc: sc * (0.95 + rnd() * 0.1) });
      }
      const door = L(-0.9, RUIN_D / 2 + 1.2);
      const yard = L(-0.6, RUIN_D / 2 + 9);
      const paths = [
        { ax: door.x, az: door.z, bx: yard.x, bz: yard.z },
        { ax: L(RUIN_W / 2 + 1.5, 0.5).x, az: L(RUIN_W / 2 + 1.5, 0.5).z, bx: bank.x, bz: bank.z },
      ];

      // The start: a small clearing in the woods 70-100 m out, joined to the
      // yard by a winding path, so the cabin is round a bend, out of sight.
      const approach = findApproach(f, rnd, s, yard, brook, trees);
      if (!approach && strict) continue;
      const route = approach ?? [yard, L(1, RUIN_D / 2 + 22)];
      for (let i = 0; i + 1 < route.length; i++) paths.push({ ax: route[i].x, az: route[i].z, bx: route[i + 1].x, bz: route[i + 1].z });
      const sp = route[route.length - 1];
      const ahead = route[Math.max(0, route.length - 4)];
      // The camera sits behind the explorer, looking up the path.
      const spawn = { x: sp.x, z: sp.z, yaw: Math.atan2(sp.x - ahead.x, sp.z - ahead.z) };

      // Somewhere for the pasture (kept clear of the far light's sightline below).
      let pasture = findPasture(f, s, yard, brook, trees, boulders, stump, paths, spawn, null, null);
      if (!pasture && strict) continue;

      // The far light: seen from the doorstep if possible, else from the best
      // open knoll within ~42 m (inside the spirit's yard) (the spirit walks you there at night).
      const ds = L(-0.4, RUIN_D / 2 + 2.2);
      let view = findFarCabin(seed, f, ds.x, ds.z, y, rot);
      let lookout: SitePoint = ds;
      if (view.margin < 4) {
        let bx = ds.x, bz = ds.z, bs = -Infinity;
        for (let ri = 0; ri < 5; ri++) for (let ai = 0; ai < 24; ai++) {
          const r = 18 + ri * 6, a = (ai / 20) * Math.PI * 2;
          const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
          const ph = f.base(px, pz);
          if (ph < 3 || f.forest(px, pz, ph) > 0.15 || flatness(f, px, pz, 3) > 1.6) continue;
          if (trees.some((t) => Math.hypot(t.x - px, t.z - pz) < 6)) continue;
          if (brook.some((b) => Math.hypot(b.x - px, b.z - pz) < 7)) continue;
          const sc = ph - r * 0.04;
          if (sc > bs) { bs = sc; bx = px; bz = pz; }
        }
        const alt = findFarCabin(seed, f, bx, bz, f.base(bx, bz), rot);
        if (alt.margin > view.margin + 1) { view = alt; lookout = { x: bx, z: bz }; }
      }
      const far = view.far;
      if (pasture && blocksView(pasture, lookout, far)) pasture = findPasture(f, s, yard, brook, trees, boulders, stump, paths, spawn, lookout, far);
      if (!pasture && strict) continue;
      if (pasture) {
        const gate = pastureLocal(pasture, 0, PASTURE_D / 2 + 1.5);
        paths.push({ ax: yard.x, az: yard.z, bx: gate.x, bz: gate.z });
      }
      let x0 = x - 30, z0 = z - 30, x1 = x + 30, z1 = z + 30;
      const fd = Math.hypot(far.x - lookout.x, far.z - lookout.z);
      const vEnd = { x: lookout.x + ((far.x - lookout.x) / fd) * 130, z: lookout.z + ((far.z - lookout.z) / fd) * 130 };
      const pc = pasture ? [-1, 1].flatMap((a) => [-1, 1].map((b) => pastureLocal(pasture, a * (PASTURE_W / 2 + 8), b * (PASTURE_D / 2 + 8)))) : [];
      for (const p of [...brook, ...trees, spring, lookout, vEnd, ...route, ...pc]) {
        x0 = Math.min(x0, p.x - 12); z0 = Math.min(z0, p.z - 12);
        x1 = Math.max(x1, p.x + 12); z1 = Math.max(z1, p.z + 12);
      }
      const site: StorySite = { x, z, y, rot, spawn, stump, trees, seat, brook, bank, stones, boulders, spring, far, lookout, paths, pasture, box: [x0, z0, x1, z1] };
      // Strict: the next cabin's light must be clearly visible from here.
      if (ok && (!strict || view.margin >= 4)) return site;
      if (ok && strict) {
        // Keep the best-seen view; give up looking after 30 good sites.
        tried++;
        if (!bestView || view.margin > bestView.m) bestView = { s: site, m: view.margin };
        if (tried >= 30) return bestView.s;
      }
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
    const bv = bestView as { s: StorySite; m: number } | null;
    if (bv) return bv.s;
    if (fallback) return fallback;
  }
  // Nothing anywhere (an all-sea seed?): build it at the origin regardless.
  const y = Math.max(f.base(0, 0), 4) + 0.05;
  return {
    x: 0, z: 0, y, rot: 0, spawn: { x: 1.4, z: 15, yaw: 0 }, stump: { x: -5.7, z: 5.1 }, trees: [], seat: { x: -20, z: 0 },
    brook: [], bank: { x: 36, z: 0 }, stones: [], boulders: [{ x: 10, z: -9, rot: 0, sc: 0.95 }], spring: { x: 36, z: -40 }, far: findFarCabin(seed, f, 0, 0, y, 0).far, lookout: { x: 0, z: 5 }, paths: [], pasture: null, box: [-40, -40, 40, 40],
  };
}

/** Pasture-local coordinates -> world. */
export function pastureLocal(p: Pasture, lx: number, lz: number): SitePoint {
  return siteLocal(p, lx, lz);
}

/** The pasture's eased ground plane at pasture-local (lx, lz). */
export function pasturePlane(p: Pasture, lx: number, lz: number): number {
  return p.y + p.sx * lx + p.sz * lz;
}

/** Would the pasture stand in the far light's sightline from the lookout? */
function blocksView(p: { x: number; z: number; rot: number }, lookout: SitePoint, far: SitePoint) {
  const dx = far.x - lookout.x, dz = far.z - lookout.z, dl = Math.hypot(dx, dz) || 1;
  for (let t = 0; t < 125; t += 3) {
    const l = siteToLocal(p, lookout.x + (dx / dl) * t, lookout.z + (dz / dl) * t);
    if (Math.abs(l.x) < PASTURE_W / 2 + 3 && Math.abs(l.z) < PASTURE_D / 2 + 3) return true;
  }
  return false;
}

/** Most the pasture's plane may tilt (rise per metre). */
const PASTURE_SLOPE = 0.05;

/**
 * The best spot for the pasture: 38-70 m from the cabin, all round it, its
 * gate side turned to the cabin. The ground must be dry and nearly flat (it
 * is eased onto a plane that tilts at most 1 in 20, and must lie within 2 m
 * of it), thinly wooded, and clear of the brook, the grove, the boulders,
 * every path and the start clearing. Null if nowhere fits.
 */
function findPasture(
  f: Field, s: { x: number; z: number; rot: number }, yard: SitePoint, brook: BrookPt[], trees: StoryTree[], boulders: StoryStone[],
  stump: SitePoint, paths: { ax: number; az: number; bx: number; bz: number }[], spawn: SitePoint, lookout: SitePoint | null, far: SitePoint | null,
): Pasture | null {
  const hw = PASTURE_W / 2, hd = PASTURE_D / 2;
  let best: Pasture | null = null, bestScore = -Infinity;
  const inRect = (p: { x: number; z: number; rot: number }, x: number, z: number, m: number) => {
    const l = siteToLocal(p, x, z);
    return Math.abs(l.x) < hw + m && Math.abs(l.z) < hd + m;
  };
  for (let ai = 0; ai < 28; ai++) {
    for (const r of [42, 52, 64]) {
      const a = (ai / 28) * Math.PI * 2;
      const cx = s.x + Math.cos(a) * r, cz = s.z + Math.sin(a) * r;
      for (const twist of [0, (ai % 2 ? 0.3 : -0.3)]) {
        const rot = Math.atan2(s.x - cx, s.z - cz) + twist;
        const p = { x: cx, z: cz, rot };
        // Clear of the cabin (and its yard pad) and of everything in the set.
        let ok = true;
        const cl = siteToLocal(p, s.x, s.z);
        if (Math.hypot(Math.max(0, Math.abs(cl.x) - hw), Math.max(0, Math.abs(cl.z) - hd)) < 22) continue;
        if (inRect(p, yard.x, yard.z, 14) || inRect(p, spawn.x, spawn.z, 16) || inRect(p, stump.x, stump.z, 4)) continue;
        for (const b of brook) if (inRect(p, b.x, b.z, 7)) { ok = false; break; }
        if (!ok) continue;
        for (const t of trees) if (inRect(p, t.x, t.z, 4.5)) { ok = false; break; }
        for (const b of boulders) if (inRect(p, b.x, b.z, 4.5)) { ok = false; break; }
        if (!ok) continue;
        for (const sg of paths) {
          const n = Math.ceil(Math.hypot(sg.bx - sg.ax, sg.bz - sg.az) / 2);
          for (let i = 0; i <= n && ok; i++) if (inRect(p, sg.ax + (sg.bx - sg.ax) * (i / n), sg.az + (sg.bz - sg.az) * (i / n), 4.5)) ok = false;
          if (!ok) break;
        }
        if (!ok) continue;
        // The cabin's front stays open: the far light's sightline from the lookout.
        if (lookout && far && blocksView(p, lookout, far)) continue;
        // A quick look at the corners first (most spots are far from flat).
        let lo = Infinity, hi = -Infinity;
        for (const [i, j] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const w = siteLocal(p, i * hw, j * hd);
          const h = f.base(w.x, w.z);
          lo = Math.min(lo, h); hi = Math.max(hi, h);
        }
        if (lo < 4 || hi - lo > PASTURE_SLOPE * 2 * (hw + hd) + 4.4) continue;
        // The ground: fit a plane, then see how far it strays from it.
        const pts: [number, number, number][] = [];
        let wood = 0, low = Infinity;
        for (let i = -4; i <= 4; i++) for (let j = -3; j <= 3; j++) {
          const lx = (i / 4) * (hw + 3), lz = (j / 3) * (hd + 3);
          const w = siteLocal(p, lx, lz);
          const h = f.base(w.x, w.z);
          low = Math.min(low, h);
          wood += f.forest(w.x, w.z, h);
          pts.push([lx, lz, h]);
        }
        if (low < 4) continue;
        wood /= pts.length;
        if (wood > 0.45) continue;
        let m = 0, sxx = 0, szz = 0, sxh = 0, szh = 0;
        for (const q of pts) m += q[2];
        m /= pts.length;
        for (const [lx, lz, h] of pts) { sxx += lx * lx; szz += lz * lz; sxh += lx * (h - m); szh += lz * (h - m); }
        const sx = Math.max(-PASTURE_SLOPE, Math.min(PASTURE_SLOPE, sxh / sxx));
        const sz = Math.max(-PASTURE_SLOPE, Math.min(PASTURE_SLOPE, szh / szz));
        let dev = 0;
        for (const [lx, lz, h] of pts) dev = Math.max(dev, Math.abs(h - (m + sx * lx + sz * lz)));
        if (dev > 2.2) continue;
        // The stable at the end away from the yard.
        const yl = siteToLocal(p, yard.x, yard.z);
        const end: 1 | -1 = yl.x > 0 ? -1 : 1;
        const score = -dev * 3 - wood * 8 - Math.abs(r - 47) * 0.08 - Math.abs(twist) * 2 - (Math.abs(sx) + Math.abs(sz)) * 20;
        if (score > bestScore) { bestScore = score; best = { x: cx, z: cz, rot, y: m, sx, sz, end }; }
      }
    }
  }
  return best;
}

/**
 * A clearing in the woods 70-100 m from the cabin (roughly out its front)
 * and a winding path from the yard to it, returned yard -> clearing. The bend
 * keeps the cabin out of sight from the start; the path stays dry, off the
 * brook and clear of the grove. Null if nothing suitable.
 */
function findApproach(f: Field, rnd: () => number, s: { x: number; z: number; rot: number }, yard: SitePoint, brook: BrookPt[], trees: StoryTree[]): SitePoint[] | null {
  let best: SitePoint[] | null = null, bestScore = -Infinity;
  const fx = Math.sin(s.rot), fz = Math.cos(s.rot);
  for (let k = 0; k < 28; k++) {
    const a = (rnd() - 0.5) * 2.4; // within ~70 deg of the door direction
    const r = 70 + rnd() * 30;
    const ca = Math.cos(a), sa = Math.sin(a);
    const dx = fx * ca - fz * sa, dz = fz * ca + fx * sa;
    const ex = s.x + dx * r, ez = s.z + dz * r;
    const eh = f.base(ex, ez);
    if (eh < 4 || flatness(f, ex, ez, 5) > 1.8) continue;
    if (brook.some((b) => Math.hypot(b.x - ex, b.z - ez) < 14)) continue;
    // Bend: a quadratic curve through a control point off to one side.
    const bend = (rnd() < 0.5 ? -1 : 1) * (0.22 + rnd() * 0.18);
    const mx = (yard.x + ex) / 2, mz = (yard.z + ez) / 2;
    const L = Math.hypot(ex - yard.x, ez - yard.z);
    const cx = mx - ((ez - yard.z) / L) * L * bend, cz = mz + ((ex - yard.x) / L) * L * bend;
    const pts: SitePoint[] = [];
    let ok = true, climb = 0, prevH = f.base(yard.x, yard.z);
    const n = Math.ceil(L / 5);
    for (let i = 0; i <= n && ok; i++) {
      const t = i / n;
      const px = (1 - t) * (1 - t) * yard.x + 2 * (1 - t) * t * cx + t * t * ex;
      const pz = (1 - t) * (1 - t) * yard.z + 2 * (1 - t) * t * cz + t * t * ez;
      const h = f.base(px, pz);
      if (h < 2.5) ok = false;
      if (brook.some((b) => Math.hypot(b.x - px, b.z - pz) < 6)) ok = false;
      if (trees.some((tr) => Math.hypot(tr.x - px, tr.z - pz) < 4)) ok = false;
      climb = Math.max(climb, Math.abs(h - prevH));
      prevH = h;
      pts.push({ x: px, z: pz });
    }
    if (!ok || climb > 2.6) continue;
    // Wooded round the clearing (and along the way), so it feels like a walk
    // out of the forest; the cabin hidden behind the bend.
    let wood = 0;
    for (let j = 0; j < 8; j++) {
      const b = (j / 8) * Math.PI * 2;
      const wx = ex + Math.cos(b) * 20, wz = ez + Math.sin(b) * 20;
      wood += f.forest(wx, wz, f.base(wx, wz));
    }
    const mid = pts[Math.floor(pts.length / 2)];
    const side = f.forest(mid.x + (cx - mx) * 0.25, mid.z + (cz - mz) * 0.25, f.base(mid.x, mid.z));
    const score = wood + side * 3 - climb * 0.5;
    if (score > bestScore) { bestScore = score; best = pts; }
  }
  return best;
}

/**
 * The next cabin: 600-1400 m off, on flat dry ground, with a clear line of
 * sight from the story cabin so its lit window reads across the valley at
 * night. Preference goes to spots in front of the door.
 */
function findFarCabin(seed: number, f: Field, x: number, z: number, y: number, rot: number) {
  let best = { x: x + 900, z, y: f.base(x + 900, z) + 0.05, rot: 0 };
  let bestScore = -Infinity, bestMargin = -Infinity;
  // Seen by someone standing at (x, z) on ground height y.
  const eye = y + 1.6;
  const doorX = Math.sin(rot), doorZ = Math.cos(rot);
  const test = (a: number, r: number, jit: number) => {
    const cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
    const h = f.base(cx, cz);
    if (h < 6 || h > 170) return;
    if (flatness(f, cx, cz, 8) > 2.5) return;
    if (f.forest(cx, cz, h) > 0.4) return;
    // Line of sight: the worst clearance along the ray. Any woodland (even
    // sparse edge trees) counts as a 14 m wall, except inside the far
    // cabin's own 40 m clearing and the story cabin's yard.
    let margin = Infinity;
    const top = h + 2.0; // the window
    const dt = Math.min(0.0125, 14 / r);
    for (let t = 0.004; t < 0.99; t += dt) {
      if (margin < -2) break; // clearly blocked; don't bother
      const px = lerp(x, cx, t), pz = lerp(z, cz, t);
      const ly = lerp(eye, top, t);
      const g = f.base(px, pz);
      const d0 = t * r, d1 = (1 - t) * r;
      // Near the viewer a corridor is kept clear of trees (see storyBlock).
      const trees = d1 < 40 || d0 < 120 ? 0 : 14 * Math.min(1, f.forest(px, pz, g) / 0.1);
      margin = Math.min(margin, ly - g - trees);
    }
    const facing = (Math.cos(a) * doorX + Math.sin(a) * doorZ) * 0.5 + 0.5;
    // A clear sightline matters most; then in front of the door, across the
    // valley (higher than here) and neither too near nor too far.
    const score = (margin > 3 ? 80 : 0) + Math.min(margin, 25) * 2 + facing * 18 - Math.abs(r - 1100) * 0.008 + (h > y + 10 ? 6 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestMargin = margin;
      best = { x: cx, z: cz, y: h + 0.05, rot: Math.atan2(x - cx, z - cz) + (jit - 0.5) * 0.6 };
    }
  };
  for (let ai = 0; ai < 36; ai++) {
    for (let ri = 0; ri < 11; ri++) {
      test((ai / 36) * Math.PI * 2 + hash01(ai, ri, seed, 931) * 0.14, 480 + ri * 220, hash01(ai, ri, seed, 932));
    }
  }
  return { far: best, margin: bestMargin };
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
