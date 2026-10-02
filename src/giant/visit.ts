import * as THREE from 'three';
import { Spring } from '../mobs/parts';
import type { Want } from '../story/spirit';
import type { Story } from '../story/story';
import { CAB } from '../story/geometry';
import { PASTURE_D, PASTURE_W, pastureLocal, siteLocal, siteToLocal } from '../world/storySite';
import type { WorldGen } from '../world/worldgen';
import { Birds, GRIP } from './birds';
import type { Giant } from './giant';
import type { Trail } from './trail';

// The giant's visit (giant slice 1, step 4): once the hearth is lit it comes
// up the lane, half asleep, treading on the other spirits' houses (never
// yours). They hear it coming and run for the middle of the lane, where no
// foot falls, and huddle there as it wades over them: nobody is in a house
// when it goes. It stops by the yard; the birds that roost in the trees on
// its shoulders lift off, swoop down on the huddle and snatch them up, one
// each (there's a crow for every spirit). One swoops at the guide and misses. Then they
// wheel round its head, each with a small warm light, and it walks off.
// The camera is taken and input is off for the length of it: it rides down
// behind the first crow, sees it take its spirit and the next three take theirs, cuts away
// (the rest go unseen), shows the guide left behind, flies round with the flock, and draws back
// to where you're watching from.
//
// Where it treads is a pure function of the start site (`visitRoute`), so a
// reloaded save can put the prints and the wreckage back without replaying.

/** The giant's footfalls are this far either side of its line, and this far apart along it. */
const TRACK = 14.5, STEP = 21;
/** A print's middle is this far ahead of the ankle that made it (see Trail.stamp). */
const SOLE = 3.4;
/** Footfalls before the first house, and after the last. */
const LEAD_IN = 10, LEAD_OUT = 4;
/** Seconds per step during the visit. */
const STEP_TIME = 2.0;
/**
 * The snatching, in seconds from when it stops. The birds lift off; one (the
 * lead) goes down alone on the huddle, `leadDown` to get there; nothing for
 * `pause`; then the rest in a rush (one, `beat`, and the others `each` apart;
 * `down` to get there, `up` to get back: see `takeAt`). Only the first
 * `SEEN_TAKEN` are watched: the rest hold off for `gap`, until the camera
 * has gone, and then go `later` apart, heard faintly from wherever it is.
 * Then, lengths of what follows (see `cue`): one goes for the guide and
 * misses (`miss`, only if the guide is at home), the guide is left reaching
 * (`sad`; at the tower it's the shorter `GUIDE` instead), up among the flock
 * (`aloft`), and it goes as the camera draws back (`back`).
 */
const SNATCH = { lift: 0.5, lead: 2.4, leadDown: 4.2, pause: 1.5, beat: 0.6, each: 0.3, gap: 2.4, later: 0.8, down: 2.6, up: 2.8, miss: 2.8, sad: 5, aloft: 6.5, back: 4.5 };
/**
 * The camera on the lead crow: it cuts in behind it this long into its dive
 * and stays beside the huddle while the next few are taken, then cuts away
 * `after` the last of those it watches.
 */
const FILM = { cut: 0.45, after: 0.7 };
/**
 * The guide's shot when it's away at the tower with you: held `wide` (the
 * tower's foot, its little bike beside it: who this is, and where), a quick
 * `push` in to its face, held for `hold`; then back to the pasture for at
 * least `after`, the crows going up with what they took.
 */
const GUIDE = { wide: 1.1, push: 0.5, hold: 1.5, after: 1.8 };
/** How many are seen being taken: the lead's, then this many less one in quick succession. */
const SEEN_TAKEN = 4;
/** It comes up out of the lake (or the ground) over this long as it sets off. */
const RISE = 9;
/** The giant, for a crow to keep out of: half its width and depth (shoulders and arms; hump and belly). */
const BULK = { w: 44, d: 27 };
/**
 * The village, in the giant's steps: watched from the tower until `SEEN`,
 * then on a doorstep; they bolt at `FRIGHT` (just after a footfall) and
 * have `RUN` seconds to get clear; and how long their faces are watched
 * after the first house goes.
 */
const SEEN = 2.6, FRIGHT = 3.15, RUN = 13, REACT = [0.25, 1.5];
/** The camera runs with them for the first this many seconds of that, and then leaves them to it. */
const CHASE = 6;
/** A crow comes in level along the ground from this far short of its mark, and goes on level this far past it. */
const SKIM = 18;
/**
 * A mark in under the giant (the huddle can be right beside it, under a hand): there a crow comes in
 * across its front or along its side, never from over it, from this far off; and it's let off keeping
 * clear of the giant for this much of the dive (and as much of the climb away), which is what brings
 * it down outside the giant and in underneath.
 */
const UNDER = { skim: 80, ease: 0.6 };
/** The camera is never nearer the ground than this. */
const FLOOR = 0.6;
/** The camera's own field of view, and the tower head's (which it's handed back to). */
const FOV = 36, HEAD_FOV = 42;

export interface Footfall { x: number; z: number; yaw: number; house: number }
export interface VisitRoute { start: { x: number; z: number; heading: number }; falls: Footfall[]; firstHouse: number; lastHouse: number }

/**
 * Where the giant stands to begin with and every footfall from there to the
 * dungeon's ring, or null if the site has no village. After the village it
 * follows a way a bike could take (WorldGen.route: dry, gentle, open), past
 * the second tower, with a footfall every 21 m on alternate sides.
 */
export function visitRoute(gen: WorldGen): VisitRoute | null {
  const site = gen.story, ground = (x: number, z: number) => gen.height(x, z);
  const v = site.village;
  if (!v) return null;
  const lane = v.lane;
  const houses = v.plots.filter((p) => p.house);
  // Each house's place along the lane, and the way in (toward the yard) there.
  const at = houses.map((p) => {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < lane.length; i++) { const d = Math.hypot(lane[i].x - p.x, lane[i].z - p.z); if (d < bd) { bd = d; bi = i; } }
    const a = lane[Math.max(0, bi - 1)], b = lane[Math.min(lane.length - 1, bi + 1)];
    const yaw = Math.atan2(a.x - b.x, a.z - b.z);
    // Which side of a giant walking in: +1 is its right.
    const right = Math.sign((p.x - lane[bi].x) * Math.cos(yaw) - (p.z - lane[bi].z) * Math.sin(yaw)) || 1;
    return { p, i: bi, yaw, right, c: lane[bi] };
  });
  const order = at.map((_, i) => i).sort((a, b) => at[b].i - at[a].i); // furthest from the yard first
  const far = at[order[0]], near = at[order[order.length - 1]];
  const fall = (x: number, z: number, yaw: number, house: number): Footfall => ({ x: x - Math.sin(yaw) * SOLE, z: z - Math.cos(yaw) * SOLE, yaw, house });
  const falls: Footfall[] = [];
  // Odd prints are left feet: one more step on the way in if that's what puts the right foot on the first house.
  const lead = (LEAD_IN + 1) % 2 === (far.right > 0 ? 0 : 1) ? LEAD_IN : LEAD_IN + 1;
  const ox = -Math.sin(far.yaw), oz = -Math.cos(far.yaw); // back out along the lane
  for (let j = lead; j >= 1; j--) {
    const side = far.right * (j % 2 ? -1 : 1);
    falls.push(fall(far.c.x + ox * STEP * j + Math.cos(far.yaw) * side * TRACK, far.c.z + oz * STEP * j - Math.sin(far.yaw) * side * TRACK, far.yaw, -1));
  }
  const firstHouse = falls.length + 1;
  for (const k of order) falls.push(fall(at[k].p.x, at[k].p.z, at[k].yaw, k));
  const lastHouse = falls.length;

  const home = gen.towers.home;
  // On past the yard: it bears off just enough to tread on nothing of yours.
  const pa = site.pasture;
  const clear = (x: number, z: number) => {
    let c = Math.hypot(x - site.x, z - site.z) - 26;
    const door = siteLocal(site, -0.2, CAB.D / 2 + 2.2);
    c = Math.min(c, Math.hypot(x - door.x, z - door.z) - 22);
    if (pa) {
      const l = siteToLocal(pa, x, z);
      c = Math.min(c, Math.hypot(Math.max(0, Math.abs(l.x) - PASTURE_W / 2), Math.max(0, Math.abs(l.z) - PASTURE_D / 2)) - 14);
    }
    for (const t of site.trees) c = Math.min(c, Math.hypot(x - t.x, z - t.z) - 12);
    // Nor on the tower you're watching from (the guide is at its foot).
    c = Math.min(c, Math.hypot(x - home.x, z - home.z) - 80);
    return ground(x, z) < 1.5 ? -50 : c;
  };
  // Where it's bound: along the way worldgen found to the ring (by a tower, if there is one to go by).
  const dg = gen.dungeon;
  const tw = dg.tower >= 0 ? gen.towers.towers[dg.tower] : null;
  // It joins that way some 170 m out from the yard, once it is clear of the village.
  let join = 0;
  while (join < dg.way.length - 2 && Math.hypot(dg.way[join][0] - lane[0].x, dg.way[join][1] - lane[0].z) < 170) join++;
  const toward = { x: dg.way[join][0], z: dg.way[join][1] };
  let best: Footfall[] = [], bestScore = -Infinity, bestEnd = { x: near.c.x, z: near.c.z, h: near.yaw, side: near.right };
  for (const turn of [0, 0.2, -0.2, 0.35, -0.35, 0.5, -0.5, 0.7, -0.7]) {
    const out: Footfall[] = [];
    let cx = near.c.x, cz = near.c.z, h = near.yaw, side = near.right, worst = Infinity;
    for (let m = 1; m <= LEAD_OUT; m++) {
      h += turn;
      cx += Math.sin(h) * STEP; cz += Math.cos(h) * STEP;
      side = -side;
      const x = cx + Math.cos(h) * side * TRACK, z = cz - Math.sin(h) * side * TRACK;
      worst = Math.min(worst, clear(x, z));
      out.push(fall(x, z, h, -1));
    }
    // Clear of what's yours first; then the way that leaves it facing where it's going.
    let off = Math.atan2(toward.x - cx, toward.z - cz) - h;
    off = Math.abs(Math.atan2(Math.sin(off), Math.cos(off)));
    const score = Math.min(worst, 0) * 10 - off * 1.5 - Math.abs(turn) * 0.3;
    if (score > bestScore) { bestScore = score; best = out; bestEnd = { x: cx, z: cz, h, side }; }
  }
  falls.push(...best);

  // The long walk: on to that way, rounded off, then a footfall every STEP along it.
  // (The line starts a step behind where the village steps ended, so the turn on to it is rounded too.)
  // On dry ground, clear of the towers' rock and the ring: a foot that wouldn't be is drawn in toward the line.
  falls.push(...stride([[bestEnd.x - Math.sin(bestEnd.h) * STEP, bestEnd.z - Math.cos(bestEnd.h) * STEP], [bestEnd.x, bestEnd.z], ...dg.way.slice(join)], bestEnd.side,
    (x, z, sx, sz) => Math.min(ground(x, z), ground(sx, sz)) > 1.5 && (!tw || Math.hypot(sx - tw.x, sz - tw.z) > 55) && Math.hypot(sx - home.x, sz - home.z) > 55 && Math.hypot(sx - dg.x, sz - dg.z) > dg.r + 16));
  const j = lead + 1;
  return { start: { x: far.c.x + ox * STEP * (j - 0.5), z: far.c.z + oz * STEP * (j - 0.5), heading: far.yaw }, falls, firstHouse, lastHouse };
}

/**
 * Footfalls along a line (rounded off first), one every STEP on alternate
 * sides: the first on the other side from `side` (+1: its right), two steps
 * along from the line's second point. `ok(x, z, sx, sz)`: may an ankle come
 * down at (x, z), its sole's middle at (sx, sz)? One that may not is drawn in
 * toward the line.
 */
function stride(way: [number, number][], side: number, ok: (x: number, z: number, sx: number, sz: number) => boolean): Footfall[] {
  const falls: Footfall[] = [];
  let line = way;
  for (let pass = 0; pass < 3; pass++) {
    const sm: [number, number][] = [line[0]];
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i], b = line[i + 1];
      sm.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    sm.push(line[line.length - 1]);
    line = sm;
  }
  let need = STEP * 2, i = 0;
  while (i + 1 < line.length) {
    const a = line[i], b = line[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < need) { need -= l; i++; continue; }
    const t = need / l, cx = a[0] + (b[0] - a[0]) * t, cz = a[1] + (b[1] - a[1]) * t;
    const h = Math.atan2(b[0] - a[0], b[1] - a[1]);
    side = -side;
    let x = cx, z = cz;
    for (const k of [1, 0.6, 0.25, 0]) {
      x = cx + Math.cos(h) * side * TRACK * k; z = cz - Math.sin(h) * side * TRACK * k;
      if (ok(x, z, x - Math.sin(h) * SOLE, z - Math.cos(h) * SOLE)) break;
    }
    falls.push({ x: x - Math.sin(h) * SOLE, z: z - Math.cos(h) * SOLE, yaw: h, house: -1 });
    line[i] = [cx, cz];
    need = STEP;
  }
  return falls;
}

/** Where the giant comes to rest at the end of some footfalls: half way between the last two, facing as the last. */
export function restOf(falls: Footfall[]) {
  const a = falls[falls.length - 1], b = falls[falls.length - 2] ?? a;
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, heading: a.yaw };
}

/**
 * The giant's footfalls from where it lay (`from`) by one dungeon's ring on
 * to the next (`gen.dungeons[n]`, n >= 1): along the way worldgen found
 * (round the ring it is leaving, never through it), a footfall every 21 m,
 * the first with its left foot. A pure function of the seed, `from` and
 * `before` (which are too: the walk before this one), so a reloaded save can
 * lay the prints without the walk.
 *
 * `before`: the footfalls that brought it here. Often the only way on is
 * back the way it came for a while (a ring on a headland). There it turns
 * round and treads in its own prints, one after another, until the new way
 * leaves the old: two sets of prints along one line would cut into each
 * other (world/prints.ts keeps one print to a 12 m cell).
 */
export function onwardRoute(gen: WorldGen, n: number, from: { x: number; z: number; heading: number }, before: Footfall[] = []): Footfall[] {
  const sites = gen.dungeons, dg = sites[n];
  if (!dg) return [];
  const ground = (x: number, z: number) => gen.height(x, z);
  const W = dg.way;
  // How far a point is from the new way, and how far along it that is.
  const onWay = (x: number, z: number) => {
    let best = Infinity, at = 0, run = 0;
    for (let i = 0; i + 1 < W.length; i++) {
      const ax = W[i][0], az = W[i][1], dx = W[i + 1][0] - ax, dz = W[i + 1][1] - az, l = Math.hypot(dx, dz) || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (l * l))), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
      if (d < best) { best = d; at = run + t * l; }
      run += l;
    }
    return { d: best, at };
  };
  // The middle of each old print, the side of the old line it's on (+1: its right, walking as it then was), and the line's own point there.
  const N = before.length;
  const mid = (f: Footfall) => ({ x: f.x + Math.sin(f.yaw) * SOLE, z: f.z + Math.cos(f.yaw) * SOLE });
  const sideOf = (i: number) => {
    const a = before[N - 1], b = before[N - 2];
    const s = Math.sign((a.x - b.x) * Math.cos(a.yaw) - (a.z - b.z) * Math.sin(a.yaw)) || 1;
    return (N - 1 - i) % 2 ? -s : s;
  };
  const centre = (i: number) => { const f = before[i], m = mid(f), s = sideOf(i); return { x: m.x - Math.cos(f.yaw) * s * TRACK, z: m.z + Math.sin(f.yaw) * s * TRACK }; };
  // Back along its own prints for as long as the new way runs along the old: from the last print that isn't
  // under it, each further along the new way than the one before.
  const back: number[] = [];
  if (N > 6) {
    let last = -1;
    for (let i = N - 3; i >= 0; i--) {
      const c = centre(i), w = onWay(c.x, c.z);
      if (w.d > 12 || w.at <= last || before[i].house >= 0) break;
      last = w.at;
      back.push(i);
    }
  }
  // It lies down well short of the ring, whichever way the way comes at it: not on it (it is 44 m across the shoulders).
  const short = (falls: Footfall[]) => {
    while (falls.length > 4) { const r = restOf(falls); if (Math.hypot(r.x - dg.x, r.z - dg.z) >= 58) break; falls.pop(); }
    return falls;
  };
  const dry = (x: number, z: number, sx: number, sz: number) => Math.min(ground(x, z), ground(sx, sz)) > 1.5 && gen.towerDist(sx, sz, 200) > 55 && sites.every((s) => Math.hypot(sx - s.x, sz - s.z) > s.r + 16);
  if (back.length < 3) {
    // It turns on to the way from where it stands: the way's first few points are nearly under it.
    const way = W.filter((p, i) => i === W.length - 1 || Math.hypot(p[0] - from.x, p[1] - from.z) > 45);
    return short(stride([[from.x - Math.sin(from.heading) * STEP, from.z - Math.cos(from.heading) * STEP], [from.x, from.z], ...way], 1, dry));
  }
  // Its first step is with its left foot: a print that was its right's, coming. (The one before `back[0]` if need be: it's stood half over it.)
  if (sideOf(back[0]) < 0) back.unshift(N - 2);
  const falls: Footfall[] = [];
  for (const [k, i] of back.entries()) {
    const f = before[i], m = mid(f);
    // It comes round over its first three steps: each print is trodden a little more the new way.
    let turn = f.yaw + Math.PI - from.heading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    const yaw = k < 2 ? from.heading + turn * ((k + 1) / 3) : f.yaw + Math.PI;
    falls.push({ x: m.x - Math.sin(yaw) * SOLE, z: m.z - Math.cos(yaw) * SOLE, yaw, house: -1 });
  }
  // And on, where the new way leaves the old: from the line's point at the last of those prints.
  const iLast = back[back.length - 1], c1 = centre(iLast), c0 = centre(Math.min(N - 1, iLast + 1)), far = onWay(c1.x, c1.z).at;
  const rest: [number, number][] = [];
  let run = 0;
  for (let i = 0; i < W.length; i++) {
    if (i) run += Math.hypot(W[i][0] - W[i - 1][0], W[i][1] - W[i - 1][1]);
    if (run > far + 12) rest.push(W[i]);
  }
  // (Its new side at that last print is the other from the old.) Never on what's left of the old prints near the fork.
  const old = before.filter((_, i) => i < iLast).map(mid);
  const clear = (x: number, z: number, sx: number, sz: number) => dry(x, z, sx, sz) && old.every((o) => Math.hypot(o.x - sx, o.z - sz) > 19);
  if (rest.length) falls.push(...stride([[c0.x, c0.z], [c1.x, c1.z], ...rest], -sideOf(iLast), clear));
  return short(falls);
}

export interface VisitDeps {
  story: Story;
  trail: Trail;
  summon(x: number, z: number, heading: number): Giant;
  gen: WorldGen;
  ground(x: number, z: number): number;
  dust(at: THREE.Vector3): void;
  sound(name: 'stomp' | 'smash' | 'squeak' | 'snatch' | 'whimper' | 'whoosh', level?: number): void;
  /** How far the nearest standing tree's trunk is from a point (Infinity if none within `max`): the camera keeps out of them. */
  tree(x: number, z: number, max: number): number;
  /** The dungeon's ring at the end of its walk: it sets the dark spirit free there. */
  ring(): { free(from: THREE.Vector3): void; setOpen(): void } | null;
  /** Is a point inside tower rock? The guide's close-up at the tower keeps out of it. */
  solid(p: THREE.Vector3): boolean;
  /** Stand the guide's own little bike here (beside it, for its shot at the tower). */
  bike(x: number, z: number, heading: number): void;
}

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();

export class Visit {
  readonly group = new THREE.Group();
  readonly route: VisitRoute | null;
  state: 'idle' | 'running' | 'gone' = 'idle';
  private giant: Giant | null = null;
  private birds: Birds | null = null;
  /** How many spirits there are to take: bird n takes spirit n, and bird 0 goes first. */
  private count = 0;
  /**
   * Where the village runs to and stands watching: the pasture (flat, open,
   * and the giant's route keeps well off it), or with no pasture, the spot
   * on the lane furthest from every footfall. `front` is the way they look
   * from there (toward where the giant stops); `laneTo` and `via`, how they
   * get there.
   */
  private gather = new THREE.Vector3();
  private front = { x: 0, z: 1 };
  private laneTo = 0;
  private via: THREE.Vector3[] = [];
  private fled = false;
  /** Who has furthest to run (the camera goes with it), which way it's going, and the camera that does. */
  private tail = 0;
  private runDir = new THREE.Vector3();
  private runWas = new THREE.Vector3();
  private runP = new THREE.Vector3();
  private runA = new THREE.Vector3();
  private running = false;
  private runT = 0;
  /** What the huddle is looking at. */
  private watch = new THREE.Vector3();
  private fallen = 0;
  /** Seconds since it stopped (-1: not yet). */
  private jt = -1;
  private dip = new Spring();
  private pos = new THREE.Vector3();
  private at = new THREE.Vector3();
  private guideHome = new THREE.Vector3();
  private hub = new THREE.Vector3();
  /** The moving shots (kept up by `film`): the camera and what it looks at, and whether it has cut in yet. */
  private camP = new THREE.Vector3();
  private camA = new THREE.Vector3();
  private filming = false;
  /** The way the lead crow comes in on the huddle, and the spot beside it the camera settles to. */
  private inDir = new THREE.Vector3(0, 0, 1);
  private beside = new THREE.Vector3();

  constructor(private d: VisitDeps) {
    this.route = visitRoute(d.gen);
    const v = d.story.village;
    if (!this.route || !v) return;
    this.count = v.spirits.length;
    const lane = d.story.site.village!.lane, mid = (lane.length - 1) / 2;
    let best = -Infinity;
    for (const [i, p] of lane.entries()) {
      let room = Infinity;
      for (const f of this.route.falls) room = Math.min(room, Math.hypot(f.x + Math.sin(f.yaw) * SOLE - p.x, f.z + Math.cos(f.yaw) * SOLE - p.z));
      const score = Math.min(room, 13) * 4 - Math.abs(i - mid);
      if (score > best) { best = score; this.laneTo = i; this.gather.set(p.x, d.ground(p.x, p.z), p.z); }
    }
    const pa = d.story.site.pasture;
    if (pa) {
      const gate = pastureLocal(pa, 0, PASTURE_D / 2 + 1.5);
      this.gather.set(pa.x, d.ground(pa.x, pa.z), pa.z);
      this.laneTo = 0;
      this.via = [new THREE.Vector3(gate.x, 0, gate.z)];
    }
    const a = this.route.falls[this.route.lastHouse - 1], b = this.route.falls[this.route.lastHouse];
    const fx = (a.x + b.x) / 2 - this.gather.x, fz = (a.z + b.z) / 2 - this.gather.z, fl = Math.hypot(fx, fz) || 1;
    this.front = { x: fx / fl, z: fz / fl };
  }

  /**
   * Keeps a flying crow (or the camera behind it) out of the giant: over
   * its head and shoulders, and down a slope off them, not through. (It has
   * no collision of its own until it's asleep.)
   */
  private clear = (p: THREE.Vector3) => {
    const g = this.giant;
    if (!g || g.dormant) return;
    const c = g.centre, k = this.bulk(p.x, p.z);
    const base = this.d.ground(c.x, c.z);
    p.y = Math.max(p.y, base + (this.hub.y + 5 - base) * (1 - THREE.MathUtils.smoothstep(k, 0.85, 2)));
  };

  /** How far out from the giant's middle a point is, in its own widths (1: at its edge; 2: where `clear` leaves off). */
  private bulk(x: number, z: number) {
    const g = this.giant!, c = g.centre, sn = Math.sin(g.facing), cs = Math.cos(g.facing), dx = x - c.x, dz = z - c.z;
    return Math.hypot((dx * cs - dz * sn) / BULK.w, (dx * sn + dz * cs) / BULK.d);
  }

  /** The camera is taken and input is off. */
  get busy() { return this.state === 'running' && !!this.giant && this.jt < this.cue().end; }

  /** When crow `i` has its spirit (seconds from when it stopped): the lead; a pause; one, a beat, and the rest hard on each other. */
  private takeAt(i: number) {
    const lead = SNATCH.lead + SNATCH.leadDown;
    if (i < 1) return lead;
    const seen = Math.min(i, SEEN_TAKEN - 1);
    return lead + SNATCH.pause + (seen > 1 ? SNATCH.beat + (seen - 2) * SNATCH.each : 0) + (i >= SEEN_TAKEN ? SNATCH.gap + (i - SEEN_TAKEN) * SNATCH.later : 0);
  }

  /** When the shots after the snatching begin (seconds from when it stopped). */
  private cue() {
    // The camera leaves once the few it watches are taken; the last of them all is up with the flock before it looks there.
    const took = (k: number) => this.takeAt(k - 1);
    const scene = took(Math.min(this.count, SEEN_TAKEN)) + FILM.after;
    const sad = scene + (this.vantage ? 0 : SNATCH.miss);
    // (`rise`: when it cuts back from the guide to the pasture. At home there's no such shot: it stays on the guide.)
    const rise = this.vantage ? sad + GUIDE.wide + GUIDE.push + GUIDE.hold : Infinity;
    const aloft = Math.max(this.vantage ? rise + GUIDE.after : sad + SNATCH.sad, took(this.count) + SNATCH.up + 1), back = aloft + SNATCH.aloft;
    return { scene, sad, rise: Math.min(rise, aloft), aloft, back, end: back + SNATCH.back };
  }

  /** A crow for every spirit, and no more (but `extra`: the one that goes for the guide, when it's at home). */
  private flock(g: Giant, extra = 0) {
    this.giant = g;
    g.stepTime = STEP_TIME;
    this.birds?.dispose();
    this.birds = new Birds(this.count + extra);
    this.birds.clear = this.clear;
    this.group.add(this.birds.group);
  }

  /** Watched from somewhere else (a tower's head): the guide is there with you, not in the yard. */
  private vantage: ((x: number, z: number) => THREE.Vector3) | null = null;
  private wasLent = false;
  /** The tower you're watching from, and where the guide stands by it for its close-up (see `placeGuide`). */
  private tower: { x: number; z: number; foot: number } | null = null;
  private stage: Want | null = null;

  /** Ahead of time (as you're drawn up into the tower): it's put where it will start, right under, so it's never seen arriving. */
  prepare() {
    const r = this.route;
    if (!r || this.state !== 'idle' || this.readied) return;
    this.readied = true;
    this.d.summon(r.start.x, r.start.z, r.start.heading).submerge();
  }
  private readied = false;

  /**
   * Begin: the giant sets off up the lane, its birds asleep in its trees.
   * `vantage`: you're watching from there (the home tower's head: where its
   * eyes are when it looks toward a point), with the guide beside you; without it, the guide is at home and comes out into
   * the yard. `tower`: the tower that is, which the guide is at the foot of.
   */
  start(vantage: ((x: number, z: number) => THREE.Vector3) | null = null, tower: { x: number; z: number; foot: number } | null = null) {
    const r = this.route;
    if (!r || this.state !== 'idle') return false;
    const g = this.d.summon(r.start.x, r.start.z, r.start.heading);
    this.flock(g, vantage ? 0 : 1);
    g.walkRoute(r.falls);
    g.emerge(RISE);
    // It stops a step past the last house, both feet down, by the yard.
    g.pauseAt = r.lastHouse + 1;
    this.state = 'running';
    this.fallen = 0;
    this.jt = -1;
    this.filming = false;
    this.fled = false;
    this.running = false;
    // The guide comes out into the yard, where it can see down the lane (the house leaves it alone meanwhile).
    const st = this.d.story;
    this.vantage = vantage;
    this.tower = vantage ? tower : null;
    this.stage = null;
    this.wasLent = st.lent;
    if (!vantage) {
      st.lent = true;
      const door = siteLocal(st.site, -0.2, CAB.D / 2 + 2.2);
      const yard = st.site.village!.lane[0];
      this.guideHome.set(door.x + (yard.x - door.x) * 0.75, 0, door.z + (yard.z - door.z) * 0.75);
      st.spirit.want = { at: this.guideHome.clone(), face: g.centre, pose: 'stand', icon: null, lead: false };
    }
    return true;
  }

  /** A foot came down (main.ts has already left the print and the dust). */
  onStep(at: THREE.Vector3) {
    if (this.state !== 'running' || !this.route) return;
    const f = this.route.falls[this.fallen++];
    this.dip.v -= 2.2 + (f?.house >= 0 ? 2.4 : 0);
    this.d.sound('stomp');
    if (this.fallen >= 2) this.d.story.spirit.mood = 'scared';
    // The ground jumps under the village: they start, and stare.
    if (!this.fled && this.fallen >= 2) this.d.story.village!.flinch();
    if (!f || f.house < 0) return;
    // The house bursts (nobody's home: they ran). Out in the lane, they all start.
    const v = this.d.story.village!;
    v.smash(f.house, (x, z) => this.d.trail.height(x, z));
    v.flinch();
    this.d.dust(v1.set(v.houses[f.house].plot.x, at.y + 1, v.houses[f.house].plot.z));
    this.d.sound('smash');
    this.d.sound('squeak');
  }

  update(dt: number) {
    const g = this.giant, r = this.route, fl = this.birds;
    if (!g || !r || !fl || this.state === 'idle') return;
    this.dip.step(0, 60, 9, dt);
    g.crown(this.hub);
    // (Its hump and the trees on it stand higher than its head: the flock wheels over the lot.)
    for (let i = 0; i < fl.birds.length; i++) this.hub.y = Math.max(this.hub.y, g.perch(i, v1).y - 2);
    // They watch it, looking up at its head; once the crows come, round toward where they're seen from, so their faces are.
    this.watch.copy(this.hub);
    if (this.filming) this.watch.sub(this.gather).setY(0).normalize().add(v1.subVectors(this.beside, this.gather).setY(0).normalize()).multiplyScalar(30).add(this.gather).setY(this.hub.y);
    if (this.state === 'running') {
      const st = this.d.story, sp = st.spirit, v = st.village!;
      // They hear it: out of their doors and down the lane to the middle, as fast as they can go.
      if (!this.fled && g.steps >= FRIGHT) {
        this.fled = true;
        this.tail = v.panic(this.gather, this.watch, this.front, this.laneTo, this.via, RUN);
        this.d.sound('squeak');
      }
      if (this.fled && this.jt < 0) this.chase(dt);
      if (g.paused && this.jt < 0) { this.jt = 0; this.placeGuide(); }
      // (The journey has it by the doorway, facing in: for this it's out in the open, watching.)
      if (this.stage) sp.want = this.stage;
      if (this.jt >= 0) {
        const t0 = this.jt, t = (this.jt += dt);
        const passed = (k: number) => t0 < k && t >= k;
        const n = this.count, cue = this.cue();
        // Up out of its trees, all at once.
        if (passed(SNATCH.lift)) { for (const b of fl.birds) b.state = 'wheel'; this.d.sound('whoosh'); }
        const stoop = (i: number, to: THREE.Vector3, dur = SNATCH.down) => {
          const b = fl.birds[i];
          // Down off the wheel and levelling out: it comes in along the ground, the way it was already headed
          // (away from the giant, if it was right overhead). It waits at the mark until it's sent on.
          v3.set(to.x - b.pos.x, 0, to.z - b.pos.z);
          if (v3.lengthSq() < 100) v3.set(to.x - g.centre.x, 0, to.z - g.centre.z);
          v3.normalize();
          // (In under the giant: across it, from whichever side the crow is on, so the way in and the way on are both clear of it.)
          const under = this.bulk(to.x, to.z) < 2;
          if (under) {
            const ox = to.x - g.centre.x, oz = to.z - g.centre.z, s = (-oz * v3.x + ox * v3.z) < 0 ? -1 : 1;
            v3.set(-oz * s, 0, ox * s).normalize();
          }
          v2.copy(to).addScaledVector(v3, under ? -UNDER.skim : -SKIM);
          v2.y = Math.max(to.y, this.d.ground(v2.x, v2.z) + GRIP);
          fl.send(i, 'dive', v2, to, dur, 'dive', 0.1, under ? UNDER.ease : 0.1);
        };
        const lift = (i: number) => {
          const b = fl.birds[i];
          // On the way it was going, level, and then up and round to the others.
          v3.copy(b.dir).setY(0);
          if (v3.lengthSq() < 1e-4) v3.set(b.pos.x - g.centre.x, 0, b.pos.z - g.centre.z);
          v3.normalize();
          const under = this.bulk(b.pos.x, b.pos.z) < 2;
          v2.copy(b.pos).addScaledVector(v3, under ? UNDER.skim : SKIM);
          v2.y = Math.max(b.pos.y, this.d.ground(v2.x, v2.z) + GRIP) + 0.5;
          v3.copy(this.hub).setY(this.hub.y + 8);
          fl.send(i, 'climb', v2, v3, SNATCH.up + (i ? 0 : 0.8), 'wheel', under ? UNDER.ease : 0.1);
        };
        // One goes down alone (the camera goes with it); a pause once it has its spirit, and then the rest all but at once.
        for (let i = 0; i < n; i++) {
          const to = v.spirits[i].pos;
          const down = i ? SNATCH.down : SNATCH.leadDown, go = this.takeAt(i) - down;
          if (passed(go)) stoop(i, v1.copy(to).setY(to.y + GRIP), down);
          if (passed(go + down)) {
            // Snatched: off the ground and away under the bird, as itself.
            v.take(i, fl.birds[i].grip);
            this.d.sound('snatch', i < SEEN_TAKEN ? 1 : 0.2);
            lift(i);
          }
        }
        // And one for the guide, if it's at home. It ducks; the bird goes over, and up with nothing.
        // (Away at the tower with you, it's simply out of reach: it watches, and is left.)
        if (!this.vantage) {
          const at = cue.sad - SNATCH.down - 0.5;
          if (passed(at)) stoop(n, v1.copy(sp.pos).setY(sp.pos.y + 3));
          if (passed(at + SNATCH.down - 0.5)) { sp.want.pose = 'sit'; this.d.sound('squeak'); }
          if (passed(at + SNATCH.down)) lift(n);
        }
        if (passed(cue.sad)) { if (!this.vantage) sp.want.pose = 'stand'; sp.mood = 'sad'; this.d.sound('whimper'); }
        if (passed(cue.back)) g.resume();
        // It watches them go.
        if (!this.vantage) sp.want.face = t > cue.sad ? this.hub : g.centre;
      }
      if (!this.busy) {
        this.state = 'gone';
        st.lent = this.wasLent;
        this.stage = null;
        sp.mood = null;
        st.giantGone = true;
        st.save();
      }
    }
    // At the ring it gives up walking and settles into the ground: a hill
    // again, its crows back in its trees with their lights.
    if (g.arrived && !g.dormant && !this.settled) {
      this.settled = true;
      // First, what it came here to do: it lets a dark spirit go, down into the ring.
      this.d.ring()?.free(v3.copy(g.centre).setY(g.centre.y - 6));
      g.dormant = true;
      for (const [i, b] of fl.birds.entries()) { g.perch(i, v1); v2.copy(b.pos).lerp(v1, 0.5).setY(Math.max(b.pos.y, v1.y) + 6); fl.send(i, 'climb', v2, v1, 2.5 + (i % 4) * 0.4, 'roost'); }
    }
    fl.update(dt, (i, out) => g.perch(i, out), this.hub, g.facing);
    // Only once it's up among the flock, far off, is what a crow carries a light: it comes up round the spirit, which is then gone.
    for (let i = 0; i < this.count; i++) {
      const b = fl.birds[i], v = this.d.story.village!;
      if (!v.spirits[i].carried) continue;
      if (!b.light && b.state !== 'climb') fl.carry(i);
      else if (b.light && b.glow >= 1) v.drop(i);
    }
    if (this.state === 'running') this.film(dt);
  }

  /** Who the doorstep shot is of: the one with furthest to run (worked out before they've set off, too). */
  private tailFirst() {
    if (this.fled) return this.tail;
    const v = this.d.story.village!;
    let best = 0, far = -1;
    for (const [k, s] of v.spirits.entries()) { const l = Math.hypot(s.pos.x - this.gather.x, s.pos.z - this.gather.z); if (l > far) { far = l; best = k; } }
    return best;
  }

  /**
   * The camera that runs with the village: just ahead of the one with
   * furthest to go, low, looking back at it, so the others are caught up one
   * by one and what's behind them all fills the sky.
   */
  private chase(dt: number) {
    const sp = this.d.story.village!.spirits[this.tail];
    this.runT += dt;
    if (!this.running) { this.running = true; this.runT = 0; this.runWas.copy(sp.pos); this.runDir.set(0, 0, 0); this.runP.set(0, -1e4, 0); return; }
    v1.subVectors(sp.pos, this.runWas).setY(0);
    this.runWas.copy(sp.pos);
    if (v1.lengthSq() > 1e-6) this.runDir.lerp(v1.normalize(), 1 - Math.exp(-2.5 * dt)).normalize();
    const d = this.runDir;
    v2.set(sp.pos.x + d.x * 13 + d.z * 3, 0, sp.pos.z + d.z * 13 - d.x * 3);
    v2.y = Math.max(this.d.ground(v2.x, v2.z), sp.pos.y) + 1.3;
    // (Looking up past them: they're along the bottom of the frame, and it is over them.)
    v3.set(sp.pos.x - d.x * 6, sp.pos.y + 4, sp.pos.z - d.z * 6);
    if (this.runP.y < -1e3) { this.runP.copy(v2); this.runA.copy(v3); }
    this.runP.lerp(v2, 1 - Math.exp(-5 * dt));
    this.runA.lerp(v3, 1 - Math.exp(-8 * dt));
  }

  /**
   * The camera that goes with the lead crow: close behind it down the dive,
   * swinging out to one side of the huddle as it comes in. It stays there
   * while the first is taken and the next few come down for theirs; then
   * the visit cuts away (see `cue`).
   */
  private film(dt: number) {
    const fl = this.birds!, t = this.jt, cue = this.cue();
    if (t < SNATCH.lead + FILM.cut || t > cue.scene + 0.5) return;
    const b = fl.birds[0], m = this.gather;
    const gy = (x: number, z: number) => this.d.ground(x, z);
    const took = SNATCH.lead + SNATCH.leadDown;
    let k = 1;
    if (b.state === 'dive' && t < took) {
      if (!this.filming) { this.inDir.set(b.c.x - b.b.x, 0, b.c.z - b.b.z).normalize(); this.placeBeside(); }
      k = THREE.MathUtils.smoothstep(b.t, 0.45, 0.92);
    }
    // Behind and a little above it, the way it's flying (and no more through the giant than it is).
    v2.copy(b.pos).addScaledVector(b.dir, -15).setY(v2.y + 3.5);
    const y = v2.y;
    this.clear(v2);
    v2.y = THREE.MathUtils.lerp(y, v2.y, b.kept);
    v2.lerp(this.beside, k);
    v3.copy(b.pos).addScaledVector(b.dir, 4 * (1 - k));
    v1.copy(m).setY(m.y + 2.4);
    v3.lerp(v1, k);
    v2.y = Math.max(v2.y, gy(v2.x, v2.z) + 1.3);
    if (!this.filming) { this.filming = true; this.camP.copy(v2); this.camA.copy(v3); }
    // (A little give, so a turn of the crow isn't a jolt of the camera.)
    const ease = 1 - Math.exp(-(t < took ? 9 : 14) * dt);
    this.camP.lerp(v2, ease);
    this.camA.lerp(v3, ease);
  }

  /**
   * Where the camera settles for the snatching: beside the huddle, side on
   * to the way the crows come in, wherever round it there are no trees to
   * stand in or look through.
   */
  private placeBeside() {
    const m = this.gather, d = this.inDir;
    let best = -Infinity;
    // Angles from side-on (0), toward behind the crows (+) or round in front of them (-). Round behind is
    // best: the huddle is watching the giant, so that's where their faces are.
    for (const [turn, cost] of [[0.8, 0], [0.55, 0.2], [1.05, 0.4], [0.3, 0.8], [0, 1.4], [-0.4, 2.2]])
      for (const s of [1, -1])
        for (const far of [14, 12, 16.5]) {
          const a = Math.atan2(d.x, d.z) + s * (Math.PI / 2 + turn);
          const x = m.x + Math.sin(a) * far, z = m.z + Math.cos(a) * far;
          // Room for the camera itself, and a clear look in.
          let room = Math.min(this.d.tree(x, z, 12) - 2, 9);
          for (const u of [0.25, 0.5, 0.75]) room = Math.min(room, this.d.tree(x + (m.x - x) * u, z + (m.z - z) * u, 12));
          const score = Math.min(room, 8) * 2 - cost - Math.abs(far - 14) * 0.1;
          if (score > best) { best = score; this.beside.set(x, 0, z); }
        }
    this.beside.y = Math.max(this.d.ground(this.beside.x, this.beside.z) + 1.3, m.y + 3.2);
  }

  /** The guide's close-up: the camera is this far in front of it and this far to one side, this high. */
  private static readonly CLOSE = { d: 4.3, side: 1.1, up: 0.6 };
  /** And where that shot starts from at the tower, on the same line: far enough back for the tower's foot behind it. */
  private static readonly WIDE = { d: 17, side: 4.5, up: 3.4, at: 2.6 };

  /**
   * At the tower, the guide is by the doorway facing the rock, and its
   * close-up is from in front of it: in the rock, or looking at it. So
   * while the camera is away it's put out at the foot of the tower on the
   * giant's side, facing the giant, where there's open, level ground for it
   * and for the camera in front of it (the tower is then behind it in the
   * shot). Wherever round that side is clearest of rock and trunks. Its
   * bike is stood beside it there: whose face this is.
   */
  private placeGuide() {
    const t = this.tower;
    if (!t) return;
    const gy = this.d.ground, C = Visit.CLOSE, W = Visit.WIDE;
    const to = Math.atan2(this.hub.x - t.x, this.hub.z - t.z);
    const spot = new THREE.Vector3();
    let best = -Infinity;
    for (const [turn, cost] of [[0, 0], [0.35, 0.3], [0.7, 0.8], [1.05, 1.5], [1.4, 2.4], [1.9, 3.6]])
      for (const s of turn ? [1, -1] : [1])
        for (const out of [5, 8, 12, 17]) {
          const a = to + s * turn, x = t.x + Math.sin(a) * (t.foot + out), z = t.z + Math.cos(a) * (t.foot + out), y = gy(x, z);
          const fl = Math.hypot(this.hub.x - x, this.hub.z - z) || 1, fx = (this.hub.x - x) / fl, fz = (this.hub.z - z) / fl;
          const cx = x + fx * C.d + fz * C.side, cz = z + fz * C.d - fx * C.side, cy = gy(cx, cz);
          // Room for the guide and the camera, and a clear look between them: trunks, then rock.
          let room = Math.min(this.d.tree(x, z, 12) - 1, this.d.tree(cx, cz, 12) - 2, 6);
          for (const u of [0.33, 0.66]) room = Math.min(room, this.d.tree(x + (cx - x) * u, z + (cz - z) * u, 12));
          for (const u of [0, 0.25, 0.5, 0.75, 1, 1.4])
            for (const up of [0.3, 0.9, 1.8])
              if (this.d.solid(v1.set(x + (cx - x) * u, y + (cy - y) * Math.min(u, 1) + up, z + (cz - z) * u))) room = -6;
          // Dry, and near enough level that neither is over a brow from the other.
          if (Math.min(y, cy) < 1.5) room = -6;
          // And from where the shot starts, further back: no trunk in the way, and not from inside a rock.
          const wx = x + fx * W.d + fz * W.side, wz = z + fz * W.d - fx * W.side, wy = Math.max(gy(wx, wz) + FLOOR, y + W.up);
          for (const u of [0.4, 0.6, 0.8, 1]) {
            room = Math.min(room, this.d.tree(x + (wx - x) * u, z + (wz - z) * u, 12) + 1);
            if (this.d.solid(v1.set(x + (wx - x) * u, y + (wy - y) * u + 0.8, z + (wz - z) * u))) room = -6;
          }
          const score = room * 2 - cost - out * 0.06 - Math.abs(cy - y) * 2.5;
          if (score > best) { best = score; spot.set(x, y, z); }
        }
    // (`settled`: it keeps its eyes on the giant, and doesn't turn to look for you, up in the tower behind it.)
    this.stage = { at: spot, face: this.hub, pose: 'stand', icon: null, lead: false, settled: true };
    this.d.story.spirit.teleport(spot);
    // Its bike: at its side away from the camera's, a little behind, side on to the shot.
    const fl = Math.hypot(this.hub.x - spot.x, this.hub.z - spot.z) || 1, fx = (this.hub.x - spot.x) / fl, fz = (this.hub.z - spot.z) / fl;
    this.d.bike(spot.x - fz * 1.25 - fx * 0.5, spot.z + fx * 1.25 - fz * 0.5, Math.atan2(fz, -fx) - 0.35);
  }

  /** The camera for this frame while the visit has it. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3; fov: number } | null {
    const g = this.giant, r = this.route;
    if (!this.busy || !g || !r) return null;
    const st = this.d.story, site = st.site, vil = st.village!, lane = site.village!.lane;
    const phi = g.steps, sp = st.spirit.pos, jt = this.jt;
    const yard = lane[0], end = lane[lane.length - 1];
    const ly = Math.atan2(end.x - yard.x, end.z - yard.z);
    const gy = (x: number, z: number) => this.d.ground(x, z);
    const wide = (back: number, up: number, lift = 30) => {
      // From well off to one side and above the trees: the whole of it and the whole lane, like a page of a picture book.
      const mid = lane[Math.floor(lane.length / 2)];
      const side = Math.cos(ly) * (site.x - mid.x) - Math.sin(ly) * (site.z - mid.z) > 0 ? -1 : 1;
      this.pos.set(mid.x + Math.cos(ly) * side * back, 0, mid.z - Math.sin(ly) * side * back);
      this.pos.y = Math.max(gy(this.pos.x, this.pos.z), gy(mid.x, mid.z)) + up;
      this.at.copy(g.centre);
      this.at.y = gy(g.centre.x, g.centre.z) + lift;
    };
    const n = Math.floor(phi + 0.5), f = r.falls[n - 1];
    const cue = this.cue();
    let fov = FOV;
    if (jt >= 0 && !this.filming) {
      // It has stopped. Up in its trees, the birds wake and lift off: from in front, level with its head.
      const h = g.facing + 0.42;
      this.pos.set(g.centre.x + Math.sin(h) * 125, this.hub.y - 8, g.centre.z + Math.cos(h) * 125);
      this.at.copy(this.hub).setY(this.hub.y - 9);
    } else if (jt >= 0 && jt < cue.scene) {
      // Down with the first of them, the snatching, and out (see `film`).
      this.pos.copy(this.camP);
      this.at.copy(this.camA);
    } else if (jt >= 0 && jt < cue.sad) {
      // One comes for the guide: from the side and back a bit, so the bird is seen coming in over it and going up empty.
      v3.set(this.hub.x - sp.x, 0, this.hub.z - sp.z).normalize();
      this.pos.set(sp.x + v3.z * 15 - v3.x * 3, sp.y + 2.2, sp.z - v3.x * 15 - v3.z * 3);
      this.at.set(sp.x + v3.x * 2, sp.y + 2.6, sp.z + v3.z * 2);
    } else if (jt >= 0 && jt < cue.rise) {
      // The guide, left behind: from in front and low, drifting in on it. At the tower, from further
      // back first (the tower's foot, its bike beside it) and quickly in.
      const sh = st.spirit.heading, C = Visit.CLOSE, W = Visit.WIDE;
      const w = this.tower ? 1 - THREE.MathUtils.smootherstep(jt, cue.sad + GUIDE.wide, cue.sad + GUIDE.wide + GUIDE.push) : 0;
      const d = C.d - 1.1 * THREE.MathUtils.smoothstep(jt, cue.sad, cue.rise) + (W.d - C.d) * w, side = C.side + (W.side - C.side) * w;
      v3.set(Math.sin(sh), 0, Math.cos(sh));
      this.pos.set(sp.x + v3.x * d + v3.z * side, sp.y + C.up + (W.up - C.up) * w, sp.z + v3.z * d - v3.x * side);
      this.at.set(sp.x, sp.y + 0.62 + (W.at - 0.62) * w, sp.z);
    } else if (jt >= 0 && jt < cue.aloft) {
      // Back to the pasture, from behind where they stood: empty now, and the crows going up to it with what they took.
      const m = this.gather, fr = this.front, k = THREE.MathUtils.smoothstep(jt, cue.rise, cue.aloft);
      this.pos.set(m.x - fr.x * 13 + fr.z * 1.5, m.y + 0.9, m.z - fr.z * 13 - fr.x * 1.5);
      this.at.copy(m).setY(m.y + 3).lerp(this.hub, 0.3 + 0.45 * k);
    } else if (jt >= 0) {
      // Up with the flock, going round its head with them and their lights;
      // then straight back from there to where you're watching from, as it
      // walks off. (The turn is timed to end on that side of its head, so
      // drawing back never goes through it.)
      if (this.vantage) v2.copy(this.vantage(g.centre.x, g.centre.z));
      else { wide(230, 38); v2.copy(this.pos); }
      const a = Math.atan2(v2.z - this.hub.z, v2.x - this.hub.x) - 0.3 * Math.max(0, cue.back - jt);
      const c = THREE.MathUtils.clamp((jt - cue.back) / SNATCH.back, 0, 1), e = c * c * c * (c * (c * 6 - 15) + 10);
      this.pos.set(this.hub.x + Math.cos(a) * 60, this.hub.y + 9, this.hub.z + Math.sin(a) * 60).lerp(v2, e);
      this.at.copy(this.hub).setY(this.hub.y - 5).lerp(v3.copy(g.centre).setY(g.centre.y - 10), e);
      if (this.vantage) fov = THREE.MathUtils.lerp(FOV, HEAD_FOV, e);
    } else if (phi < SEEN && this.vantage) {
      // From the tower's own eyes, turned to it: something very big, a long way off, coming to the village.
      this.pos.copy(this.vantage(g.centre.x, g.centre.z));
      this.at.copy(g.centre).setY(g.centre.y - 10);
      fov = HEAD_FOV;
    } else if (phi < 1.6) {
      // The ground thumps. The guide stops and turns.
      const k = phi / 1.6;
      this.pos.set(sp.x - Math.sin(ly) * (4.2 - k * 0.8) + Math.cos(ly) * 1.6, sp.y + 0.9, sp.z - Math.cos(ly) * (4.2 - k * 0.8) - Math.sin(ly) * 1.6);
      this.at.set(sp.x, sp.y + 0.5 + k * 0.5, sp.z);
    } else if (phi < r.firstHouse - 0.5 && !(this.running && this.runP.y > -1e3 && phi > FRIGHT + 0.3)) {
      // A doorstep at the far end of the lane: whoever lives there stops, stares, and bolts.
      const h = vil.houses[vil.home[this.tailFirst()]], p = h.plot, d = h.door;
      this.pos.set(d.x + Math.sin(p.rot) * 6 + Math.cos(p.rot) * 2.2, d.y + 0.75, d.z + Math.cos(p.rot) * 6 - Math.sin(p.rot) * 2.2);
      this.at.set(d.x + Math.cos(p.rot) * 0.7, d.y + 0.8, d.z - Math.sin(p.rot) * 0.7);
    } else if (phi < r.firstHouse - 0.5 && !vil.spirits[this.tail].arrived && this.runT < CHASE) {
      // They run for it, down the lane (see `chase`): the start of it, and then the wide view while they get where they're going.
      this.pos.copy(this.runP);
      this.at.copy(this.runA);
    } else if (phi < r.firstHouse - 0.5 && vil.spirits[this.tail].arrived) {
      // There, and turned to look: over their heads, what they're looking up at.
      const m = this.gather, fr = this.front;
      this.pos.set(m.x - fr.x * 11.5 + fr.z * 1.5, m.y + 0.9, m.z - fr.z * 11.5 - fr.x * 1.5);
      this.at.set(m.x + fr.x * 40, m.y + 11, m.z + fr.z * 40);
    } else if (phi >= r.firstHouse + REACT[0] && phi < r.firstHouse + REACT[1]) {
      // The first house has gone. Their faces: from in front of them and low (the next one goes behind the camera; they start again).
      const m = this.gather, fr = this.front;
      this.pos.set(m.x + fr.x * 9.5 + fr.z * 2, m.y + 1.7, m.z + fr.z * 9.5 - fr.x * 2);
      this.at.set(m.x, m.y + 0.6, m.z);
    } else if (f && f.house >= 0 && n !== r.firstHouse + 2) {
      // A house going under: from across the lane, down near its own height, boards flying.
      const h = vil.houses[f.house].plot;
      const side = Math.sign((h.x - yard.x) * Math.cos(f.yaw) - (h.z - yard.z) * Math.sin(f.yaw)) || 1;
      this.pos.set(h.x + Math.sin(f.yaw) * 26 - Math.cos(f.yaw) * side * 24, 0, h.z + Math.cos(f.yaw) * 26 + Math.sin(f.yaw) * side * 24);
      this.pos.y = gy(this.pos.x, this.pos.z) + 3.2;
      this.at.set(h.x, h.y + 6.5, h.z);
    } else {
      wide(250 - 30 * THREE.MathUtils.clamp((phi - r.firstHouse) / 5, 0, 1), 38);
    }
    this.pos.y += this.dip.x;
    // Never in the ground, nor skimming a rise between it and what it's looking at.
    v3.subVectors(this.at, this.pos).setY(0).setLength(1.5);
    this.pos.y = Math.max(this.pos.y, gy(this.pos.x, this.pos.z) + FLOOR, gy(this.pos.x + v3.x, this.pos.z + v3.z) + FLOOR * 0.5);
    return { pos: this.pos, at: this.at, fov };
  }

  /** It has got to the ring and lain down (once: when it gets up again and walks on, that's giant/homecoming.ts's). */
  private settled = false;
  /** Its crows, once there are any (bird n took spirit n, and roosts in its trees with that one's light). */
  get crows() { return this.birds; }
  /** How many spirits were taken. */
  get spirits() { return this.count; }

  /** A save from after the visit: the prints, the wreckage, and the giant where it ended up with its birds and their lights. Nothing is replayed. */
  restore() {
    const r = this.route;
    if (!r || this.state !== 'idle') return;
    this.state = 'gone';
    const v = this.d.story.village!;
    for (const f of r.falls) {
      this.d.trail.stamp(v1.set(f.x, 0, f.z), f.yaw);
      if (f.house >= 0) v.smash(f.house, (x, z) => this.d.trail.height(x, z), true);
    }
    const at = restOf(r.falls);
    const g = this.d.summon(at.x, at.z, at.heading);
    this.flock(g);
    g.settle();
    this.settled = true;
    this.d.ring()?.setOpen();
    for (const [i, bird] of this.birds!.birds.entries()) {
      bird.state = 'roost';
      this.birds!.carry(i, true);
    }
  }

  dispose() {
    this.birds?.dispose();
    this.group.removeFromParent();
  }
}
