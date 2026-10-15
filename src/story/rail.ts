import * as THREE from 'three';

// A line along the ground with arc length on it: the giant's trail from the
// village to the strait (the bridge quest's rides and the wagon's haul,
// story/bridgeQuest.ts), as the middle of its prints.

export class Rail {
  readonly pts: THREE.Vector2[];
  private cum: number[] = [0];
  readonly L: number;
  private hint = 0;

  constructor(pts: THREE.Vector2[]) {
    this.pts = pts;
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.L = this.cum[this.cum.length - 1] ?? 0;
  }

  /** The point `s` metres along (clamped to the ends), as (x, z). */
  at(s: number, out = new THREE.Vector2()) {
    s = THREE.MathUtils.clamp(s, 0, this.L);
    let i = 0, hi = this.cum.length - 2;
    // (Binary search: the haul asks every frame.)
    while (i < hi) { const m = (i + hi + 1) >> 1; if (this.cum[m] <= s) i = m; else hi = m - 1; }
    const a = this.pts[i], b = this.pts[Math.min(i + 1, this.pts.length - 1)], l = this.cum[i + 1] - this.cum[i] || 1;
    return out.lerpVectors(a, b, (s - this.cum[i]) / l);
  }

  /** The way it runs at `s`, as a heading (0 = +z), over `span` m either side. */
  heading(s: number, span = 4) {
    const a = this.at(s - span, va), b = this.at(s + span, vb);
    return Math.atan2(b.x - a.x, b.y - a.y);
  }

  /** `s` metres along and `side` metres to its left (looking along it; negative: its right), as (x, z). */
  beside(s: number, side: number, out = new THREE.Vector2()) {
    const h = this.heading(s);
    this.at(s, out);
    out.x += Math.cos(h) * side;
    out.y -= Math.sin(h) * side;
    return out;
  }

  /** The nearest point to (x, z): how far along, and how far to the side (+ left). Searched near the last answer unless `all`. */
  project(x: number, z: number, all = false): { s: number; off: number } {
    let best = this.hint, bd = Infinity, side = 0;
    const n = this.pts.length;
    const from = all ? 0 : Math.max(0, this.idx(this.hint) - 40), to = all ? n - 1 : Math.min(n - 1, this.idx(this.hint) + 40);
    for (let i = from; i < to; i++) {
      const a = this.pts[i], b = this.pts[i + 1];
      const vx = b.x - a.x, vz = b.y - a.y, l2 = vx * vx + vz * vz || 1;
      const t = THREE.MathUtils.clamp(((x - a.x) * vx + (z - a.y) * vz) / l2, 0, 1);
      const dx = x - a.x - vx * t, dz = z - a.y - vz * t, d = Math.hypot(dx, dz);
      if (d < bd) { bd = d; best = this.cum[i] + t * Math.sqrt(l2); side = Math.sign(dx * vz - dz * vx) * d; }
    }
    this.hint = best;
    return { s: best, off: side };
  }

  private idx(s: number) {
    let i = 0;
    while (i < this.cum.length - 2 && this.cum[i + 1] < s) i++;
    return i;
  }
}

const va = new THREE.Vector2(), vb = new THREE.Vector2();

/**
 * The middle of a run of footfalls (left, right, left...), from `start`:
 * half way between each two, smoothed, with any stretch that comes back on
 * itself cut out (the giant treads back along its own prints where its way
 * on leaves its way in), every 2 m. It stops where `stop` says (the water's
 * edge), or at the last footfall.
 */
export function trailRail(start: { x: number; z: number }, falls: { x: number; z: number }[], stop?: (x: number, z: number) => boolean): Rail {
  let mids: THREE.Vector2[] = [];
  for (let i = 0; i + 1 < falls.length; i++) mids.push(new THREE.Vector2((falls[i].x + falls[i + 1].x) / 2, (falls[i].z + falls[i + 1].z) / 2));
  // Loops out: from each point, on to the last one that comes back within reach of it.
  const cut: THREE.Vector2[] = [];
  for (let i = 0; i < mids.length;) {
    cut.push(mids[i]);
    let j = i + 1;
    for (let k = mids.length - 1; k > i + 1; k--) if (mids[k].distanceTo(mids[i]) < 14) { j = k; break; }
    i = j;
  }
  mids = cut;
  // From the start to the nearest middle point ahead of it.
  let first = 0, fd = Infinity;
  for (let i = 0; i < Math.min(mids.length, 12); i++) { const d = Math.hypot(mids[i].x - start.x, mids[i].y - start.z); if (d < fd) { fd = d; first = i; } }
  let pts = [new THREE.Vector2(start.x, start.z), ...mids.slice(first)];
  // Smoothed (the ends held).
  for (let pass = 0; pass < 4; pass++) pts = pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p.clone() : new THREE.Vector2((pts[i - 1].x + 2 * p.x + pts[i + 1].x) / 4, (pts[i - 1].y + 2 * p.y + pts[i + 1].y) / 4)));
  // Every 2 m, up to the stop.
  const raw = new Rail(pts), out: THREE.Vector2[] = [];
  for (let s = 0; s <= raw.L; s += 2) {
    const p = raw.at(s);
    if (stop && s > 20 && stop(p.x, p.y)) break;
    out.push(p);
  }
  return new Rail(out);
}
