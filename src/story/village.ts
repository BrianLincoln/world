import * as THREE from 'three';
import { SHADOW_LAYER } from '../gfx/groundShadow';
import { makeCasterMaterial } from '../gfx/materials';
import { Puffs } from '../gfx/puffs';
import { hash01 } from '../core/rng';
import { BIOME } from '../gfx/palette';
import { colored, PartBatch } from '../mobs/parts';
import type { Plot, VillageSite } from '../world/storySite';
import { gable, K, kbox, merge, rbox } from './geometry';
import { glintMat, propMesh } from './props';
import { Spirit } from './spirit';
import type { Gesture } from './spirit';

// The village: the other hearth spirits' houses, whole and lived in, down
// the lane from the guide's cabin (the plots are in world/storySite.ts).
// Each is about 4 m to the ridge, well under the cabin, with its spirit on
// the doorstep, a lit window and a wisp of smoke. The giant treads on them
// (`smash`): a house bursts into boards and stones that stay where they
// land, and its spirit is gone (giant/visit.ts carries it off).
//
// Until then (and for anyone who's home again) they mill about: in at the
// door and out again, a stroll along the lane, over to a neighbour to talk
// with their arms, a wave across the way or at you (`mill`).
//
// A spirit brought home (`comeHome`: giant/homecoming.ts, when a dungeon is
// done) is back among the wreckage, and that is all: step 0, nothing built.
// Its house is built again in five steps (`setStep`, `buildStage`), each a
// whole thing drawn from its number, never seen happening: the footing and
// a stack of its boards; low walls; walls and gables; a bare boarded roof;
// home. While it's part built, whoever lives there potters between the
// stack and the plot (`work`).

/** Hut scale: the door (1.2 m) is for a spirit, not for you. */
const S = 1.8;

interface HutSpec { w: number; d: number; h: number; rise: number; wall: number; roof: number }
const HUTS: HutSpec[] = [
  { w: 1.5, d: 1.3, h: 1.0, rise: 0.95, wall: K.wall, roof: K.roof },
  { w: 1.8, d: 1.4, h: 0.85, rise: 0.75, wall: K.wood, roof: K.moss },
  { w: 1.25, d: 1.2, h: 1.3, rise: 1.2, wall: K.wall, roof: K.roof },
];
const BASE = 0.18, OVER = 0.22;

/** A spirit's house: local +z is the door side, the ridge runs along x, y = 0 at the ground. */
function buildHut(v: number): { geo: THREE.BufferGeometry; leaf: THREE.BufferGeometry; hinge: THREE.Vector3; doorX: number; door: THREE.Vector3; chimney: THREE.Vector3 } {
  const { w, d, h, rise, wall, roof } = HUTS[v];
  const top = BASE + h, hd = d / 2;
  const parts: THREE.BufferGeometry[] = [];
  // Footing, sunk well in so a slope never shows daylight under it.
  parts.push(rbox(w + 0.2, 0.9, d + 0.2, 0.07, 0, BASE - 0.45, 0, K.stone));
  parts.push(rbox(w, h + 0.1, d, 0.05, 0, BASE + h / 2, 0, wall));
  for (const sx of [-1, 1]) {
    const g = gable(d, rise, 0.1, wall, -0.05);
    g.rotateY(Math.PI / 2);
    g.translate(sx * (w / 2 - 0.05), top, 0);
    parts.push(g);
  }
  // Roof: two thick slabs, well past the walls all round.
  const a = Math.atan2(rise, hd);
  const len = Math.hypot(hd, rise) * (1 + OVER / hd);
  for (const sz of [-1, 1]) {
    const cy = top + rise - Math.sin(a) * len / 2 + 0.07, cz = sz * Math.cos(a) * len / 2;
    parts.push(kbox(w + 0.5, 0.13, len, 0, cy, cz, roof, sz * a));
  }
  parts.push(kbox(w + 0.56, 0.1, 0.16, 0, top + rise + 0.1, 0, K.trim));
  // The door, a lintel, a step.
  const dx = -w * 0.17;
  // (The doorway is the dark inside; the door is its own mesh, hung
  // on its left edge, and swings in.)
  parts.push(kbox(0.42, 0.63, 0.024, dx, BASE + 0.335, hd + 0.01, K.soot));
  parts.push(kbox(0.56, 0.07, 0.09, dx, BASE + 0.7, hd + 0.03, K.trim));
  const leaf = merge([kbox(0.44, 0.64, 0.04, 0.22, BASE + 0.34, 0, K.door), kbox(0.05, 0.05, 0.05, 0.36, BASE + 0.32, 0.03, K.trim)]);
  leaf.scale(S, S, S);
  leaf.computeVertexNormals();
  leaf.computeBoundingSphere();
  parts.push(rbox(0.6, 0.14, 0.3, 0.05, dx, BASE - 0.06, hd + 0.16, K.stone));
  // A window by the door (a cross of glazing bars) and a small one in the gable.
  const wx = w * 0.24, wy = BASE + h * 0.58, ws = 0.24;
  parts.push(kbox(ws + 0.1, ws + 0.1, 0.05, wx, wy, hd + 0.01, K.trim));
  parts.push(kbox(ws, ws, 0.07, wx, wy, hd + 0.015, K.glass));
  parts.push(kbox(0.03, ws, 0.085, wx, wy, hd + 0.015, K.trim));
  parts.push(kbox(ws, 0.03, 0.085, wx, wy, hd + 0.015, K.trim));
  parts.push(kbox(ws + 0.14, 0.05, 0.1, wx, wy - ws / 2 - 0.06, hd + 0.03, K.trim));
  parts.push(kbox(0.05, 0.2, 0.2, -w / 2 - 0.01, top + rise * 0.3, 0, K.glass));
  // Chimney through the back slope.
  const cx = w * 0.24, cz = -d * 0.2, cTop = top + rise + 0.42;
  parts.push(kbox(0.26, 0.9, 0.26, cx, cTop - 0.45, cz, K.stone));
  parts.push(kbox(0.34, 0.07, 0.34, cx, cTop, cz, K.stone));
  const geo = merge(parts);
  geo.scale(S, S, S);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return { geo, leaf, hinge: new THREE.Vector3((dx - 0.22) * S, 0, (hd + 0.045) * S), doorX: dx * S, door: new THREE.Vector3(dx * S, 0, (hd + 0.62) * S), chimney: new THREE.Vector3(cx * S, (cTop + 0.1) * S, cz * S) };
}

/** A house whole again: the last of the steps (`Village.setStep`). */
export const HOME = 5;
/** How far up the walls are at step 2 (of their height). */
const LOW = 0.45;
/** How many of a house's boards are still in the stack, and of its stones still lying round the footing, at each step. */
const STACKED = [0, 26, 18, 10, 4, 0], LYING = [0, 8, 4, 0, 0, 0];

/**
 * A house being built again, at step 1 to 4 (0 is nothing at all, 5 is the
 * hut itself: `buildHut`). Every step is solid, something that has been
 * built, never a frame or an outline: this is not yours to build.
 *  1. the stone footing and the doorstep;
 *  2. board walls part way up, the doorway a gap in them, the chimney begun;
 *  3. walls to the eaves and both gables, a ridge beam across, the chimney
 *     whole; a doorway and window holes, dark; open to the sky;
 *  4. the roof boarded over, bare (not yet in its colour); the window has
 *     its bars. No door, no light, no smoke.
 */
function buildStage(v: number, step: number): THREE.BufferGeometry {
  const { w, d, h, rise, wall } = HUTS[v];
  const top = BASE + h, hd = d / 2, dx = -w * 0.17;
  const parts: THREE.BufferGeometry[] = [];
  parts.push(rbox(w + 0.2, 0.9, d + 0.2, 0.07, 0, BASE - 0.45, 0, K.stone));
  parts.push(rbox(0.6, 0.14, 0.3, 0.05, dx, BASE - 0.06, hd + 0.16, K.stone));
  const cx = w * 0.24, cz = -d * 0.2, cTop = top + rise + 0.42;
  if (step === 2) {
    const wh = h * LOW;
    parts.push(rbox(w, wh + 0.1, d, 0.05, 0, BASE + wh / 2, 0, wall));
    // (Looking down into it: the dark between the walls.)
    parts.push(kbox(w - 0.2, 0.02, d - 0.2, 0, BASE + wh + 0.052, 0, K.soot));
    parts.push(kbox(0.42, wh + 0.05, 0.13, dx, BASE + wh / 2 + 0.03, hd - 0.04, K.soot));
    parts.push(kbox(0.26, wh + 0.3, 0.26, cx, BASE + (wh + 0.3) / 2, cz, K.stone));
  }
  if (step >= 3) {
    parts.push(rbox(w, h + 0.1, d, 0.05, 0, BASE + h / 2, 0, wall));
    for (const sx of [-1, 1]) {
      const g = gable(d, rise, 0.1, wall, -0.05);
      g.rotateY(Math.PI / 2);
      g.translate(sx * (w / 2 - 0.05), top, 0);
      parts.push(g);
    }
    parts.push(kbox(0.42, 0.63, 0.024, dx, BASE + 0.335, hd + 0.01, K.soot));
    parts.push(kbox(0.56, 0.07, 0.09, dx, BASE + 0.7, hd + 0.03, K.trim));
    const wx = w * 0.24, wy = BASE + h * 0.58, ws = 0.24;
    parts.push(kbox(ws + 0.1, ws + 0.1, 0.05, wx, wy, hd + 0.01, K.trim));
    parts.push(kbox(ws, ws, 0.07, wx, wy, hd + 0.015, K.soot));
    parts.push(kbox(ws + 0.14, 0.05, 0.1, wx, wy - ws / 2 - 0.06, hd + 0.03, K.trim));
    parts.push(kbox(0.05, 0.2, 0.2, -w / 2 - 0.01, top + rise * 0.3, 0, K.soot));
    parts.push(kbox(0.26, 0.9, 0.26, cx, cTop - 0.45, cz, K.stone));
    parts.push(kbox(0.34, 0.07, 0.34, cx, cTop, cz, K.stone));
    if (step === 3) {
      parts.push(kbox(w - 0.2, 0.02, d - 0.2, 0, top + 0.052, 0, K.soot));
      parts.push(kbox(w + 0.1, 0.09, 0.09, 0, top + rise - 0.03, 0, K.wood));
    } else {
      const a = Math.atan2(rise, hd), len = Math.hypot(hd, rise) * (1 + OVER / hd);
      for (const sz of [-1, 1]) parts.push(kbox(w + 0.5, 0.11, len, 0, top + rise - Math.sin(a) * len / 2 + 0.06, sz * Math.cos(a) * len / 2, K.cut, sz * a));
      parts.push(kbox(0.03, ws, 0.085, wx, wy, hd + 0.015, K.trim));
      parts.push(kbox(ws, 0.03, 0.085, wx, wy, hd + 0.015, K.trim));
    }
  }
  const geo = merge(parts);
  geo.scale(S, S, S);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export interface House {
  plot: Plot; hw: number; hd: number; wallTop: number; rise: number; door: THREE.Vector3; chimney: THREE.Vector3;
  meshes: THREE.Object3D[]; smashed: boolean;
  /**
   * How far built it is (`Village.setStep`): `HOME` is whole (as is a house
   * never trodden on), 0 is a wreck with nothing done about it, 1 to 4 are
   * `buildStage`'s. And at 1 to 4: what's drawn of it, where its boards are
   * stacked, and how high its walls stand (above the plot).
   */
  step: number; stage?: THREE.Object3D[]; stack?: THREE.Vector3; high: number;
  /** The door: where it is along the front (house-local), its leaf, and how far it's swung in (0..1). */
  doorX: number; leaf: THREE.Object3D; ajar: number;
}

type Doing = 'home' | 'stroll' | 'look' | 'back' | 'meet' | 'chat' | 'part' | 'in' | 'inside' | 'out' | 'work';
/** What one of them is up to while nothing's wrong. */
interface Life {
  doing: Doing;
  /** Seconds left of it; on the way somewhere, seconds at it (to give up on). */
  t: number;
  /** Who it's meeting (-1: nobody). The lower of the two keeps the talk's clock: whose `turn`, and when the `next` is. */
  mate: number; turn: number; next: number;
  /** Its place by its door, and whether it sits there. */
  spot: THREE.Vector3; sits: boolean;
  /** What it looks at when it has nothing to say, and how long what it's saying has left. */
  face: THREE.Vector3; gt: number;
  /** Something to say in a moment (a wave back, a look where the other's pointing). */
  due: { t: number; g: Gesture | null; secs: number; face?: THREE.Vector3 } | null;
  /** Until it next hails a neighbour, and until it'll wave at you again. */
  hailT: number; greetT: number;
  /** Which side of the lane's middle it keeps to (m). */
  side: number;
}
/** Eye height (for looking one another in the face). */
const EYE = 0.34;

/** A board or a stone thrown out of a smashed house. */
interface Piece {
  stone: boolean; pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Euler; spin: THREE.Vector3; size: THREE.Vector3; tint: THREE.Color; rest: boolean;
  /** Whose house it was a piece of. */
  house: number;
  /** Where it came to rest when the house burst (kept once the house's step first moves it), and whether it has since gone back into the house. */
  lay?: { pos: THREE.Vector3; rot: THREE.Euler; size: THREE.Vector3 }; used?: boolean;
}
const BOARDS = 26, STONES = 8;
const WALL_TINT = [BIOME.cabinWall, BIOME.cabinWall2, BIOME.cabinWall];
const ROOF_TINT = [BIOME.cabinRoof, BIOME.moss, BIOME.cabinRoof];
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v1 = new THREE.Vector3();

export interface VillageDeps {
  seed: number;
  ground(x: number, z: number): number;
}

export class Village {
  readonly group = new THREE.Group();
  readonly houses: House[] = [];
  /** Everyone who lives here (some houses have two), the house each lives at, and whether it has been carried off. */
  readonly spirits: Spirit[] = [];
  readonly home: number[] = [];
  readonly taken: boolean[] = [];
  /** Where each one's door lets out on to the lane (an index into it), and the way it's going (null: straight there). */
  private laneAt: number[] = [];
  private way: (THREE.Vector3[] | null)[] = [];
  /** Nothing's wrong, and they're milling about (until the first `flinch`). */
  private calm = true;
  private life: Life[] = [];
  private eyes: THREE.Vector3[] = [];
  private mid = new THREE.Vector3();
  private gy: (x: number, z: number) => number;
  private smoke = new Puffs('#f3ebe0', 40, 0, 0.55);
  private smokeT: number[] = [];
  private mat = glintMat({ toneVar: 0 });
  private caster = makeCasterMaterial({});
  private pieces: Piece[] = [];
  private boards = new PartBatch(colored(new THREE.BoxGeometry(1, 1, 1), '#ffffff'), { keep: 0.5 }, 5 * BOARDS);
  private stones = new PartBatch(colored(new THREE.IcosahedronGeometry(0.5, 2), '#ffffff'), { keep: 0.3 }, 5 * STONES);
  private seed: number;

  constructor(readonly site: VillageSite, d: VillageDeps) {
    this.seed = d.seed;
    this.gy = d.ground;
    // Lit windows by day too: somebody's home.
    this.mat.uniforms.uWin.value = 1;
    const caster = this.caster;
    const lane = site.lane, mid = lane[Math.floor(lane.length / 2)];
    for (const [i, p] of site.plots.filter((q) => q.house).entries()) {
      const built = buildHut(p.variant);
      const mesh = propMesh(built.geo, this.mat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = p.rot;
      mesh.updateMatrixWorld();
      const shade = propMesh(built.geo, caster);
      shade.position.copy(mesh.position);
      shade.rotation.y = p.rot;
      shade.layers.set(SHADOW_LAYER);
      const leaf = propMesh(built.leaf, this.mat);
      leaf.position.copy(built.hinge).applyMatrix4(mesh.matrixWorld);
      leaf.rotation.y = p.rot;
      this.group.add(mesh, shade, leaf);
      const door = built.door.clone().applyMatrix4(mesh.matrixWorld);
      const chimney = built.chimney.clone().applyMatrix4(mesh.matrixWorld);
      const sp = HUTS[p.variant];
      this.smokeT.push(i * 0.17);

      // Its spirits (every other house has two): on the doorstep, watching
      // the lane (and you, when you pass). When they run, it's out to the
      // lane first and then along it, not through the neighbours' walls.
      let vi = 0, vd = Infinity;
      for (const [j, l] of lane.entries()) { const dl = Math.hypot(l.x - door.x, l.z - door.z); if (dl < vd) { vd = dl; vi = j; } }
      for (let k = 0; k < (i % 2 ? 1 : 2); k++) {
        const n = this.spirits.length;
        const at = door.clone();
        if (k) { at.x += Math.cos(p.rot) * 1.5; at.z -= Math.sin(p.rot) * 1.5; at.y = d.ground(at.x, at.z); }
        // (Its ground is the house's floor, once it's over the step.)
        const spirit = new Spirit({ ground: (x, z) => this.floor(i, x, z), route: (_a, b) => this.way[n]?.slice() ?? [b], sound: () => {}, sparkle: () => {} }, at);
        this.laneAt.push(vi);
        this.way.push(null);
        const sits = hash01(n, 1, d.seed, 979) < 0.4;
        spirit.want = { at: at.clone(), face: this.mid, pose: sits ? 'sit' : 'stand', icon: null, lead: false, settled: true };
        spirit.holdWarmth = 0.8 + hash01(n, 7, d.seed, 979) * 0.2;
        spirit.heading = p.rot;
        // A potter, not the guide's trot.
        spirit.haste = 1.6 + hash01(n, 3, d.seed, 979) * 0.5;
        this.life.push({
          doing: 'home', t: 1.5 + hash01(n, 4, d.seed, 979) * 10, mate: -1, turn: 0, next: 0, spot: at.clone(), sits, face: this.mid, gt: 0, due: null,
          hailT: 3 + hash01(n, 5, d.seed, 979) * 12, greetT: 0, side: (n % 2 ? 1 : -1) * (0.5 + hash01(n, 6, d.seed, 979) * 0.8),
        });
        this.eyes.push(at.clone().setY(at.y + EYE));
        this.spirits.push(spirit);
        this.home.push(i);
        this.taken.push(false);
        this.group.add(spirit.group);
      }
      this.houses.push({ plot: p, hw: (sp.w / 2) * S, hd: (sp.d / 2) * S, wallTop: (BASE + sp.h) * S, rise: sp.rise * S, door, chimney, meshes: [mesh, shade, leaf], smashed: false, step: HOME, high: (BASE + sp.h) * S, doorX: built.doorX, leaf, ajar: 0 });
    }
    this.mid.set(mid.x, d.ground(mid.x, mid.z) + EYE, mid.z);
    this.group.add(this.smoke.group, this.boards.mesh, this.stones.mesh);
  }

  /**
   * A foot comes down on house `i`: it bursts into boards and stones, which
   * fly out, land on `ground` and stay. `instant` lays them where they'd
   * have ended up (a restored save). Nobody is in it: they ran for the
   * middle of the lane when they heard it coming (`panic`). In a restored
   * save they're long gone.
   */
  smash(i: number, ground: (x: number, z: number) => number, instant = false) {
    const h = this.houses[i];
    if (h.smashed) return;
    h.smashed = true;
    h.step = 0;
    for (const m of h.meshes) m.visible = false;
    if (instant) for (const [k, s] of this.spirits.entries()) if (this.home[k] === i) { this.taken[k] = true; s.group.visible = false; }
    const v = h.plot.variant;
    for (let k = 0; k < BOARDS + STONES; k++) {
      const r = (n: number) => hash01(i * 40 + k, n, this.seed, 983);
      const stone = k >= BOARDS;
      // Out from under the edge of the sole, in a ring, high enough to be seen over it.
      const a = r(1) * 6.283, out = 7 + r(2) * 10, ring = 5 + r(6) * 4;
      const size = stone ? new THREE.Vector3(0.5 + r(3) * 0.5, 0.35 + r(4) * 0.3, 0.5 + r(5) * 0.4) : new THREE.Vector3(1.5 + r(3) * 1.9, 0.12, 0.4 + r(4) * 0.35);
      const p: Piece = {
        stone, size, rest: false, house: i,
        pos: new THREE.Vector3(h.plot.x + Math.cos(a) * ring, h.plot.y + 0.6 + r(7) * 2.5, h.plot.z + Math.sin(a) * ring),
        vel: new THREE.Vector3(Math.cos(a) * out, 11 + r(9) * 11, Math.sin(a) * out),
        rot: new THREE.Euler(r(10) * 6, r(11) * 6, r(12) * 6),
        spin: new THREE.Vector3((r(13) - 0.5) * 14, (r(14) - 0.5) * 8, (r(15) - 0.5) * 14),
        tint: new THREE.Color(stone ? BIOME.stone : k % 3 === 0 ? ROOF_TINT[v] : WALL_TINT[v]),
      };
      if (instant) {
        // Where it would have come down, more or less.
        const t = p.vel.y / 11;
        p.pos.x += p.vel.x * t; p.pos.z += p.vel.z * t;
        this.settle(p, ground);
      }
      this.pieces.push(p);
    }
    this.ground = ground;
    this.drawPieces();
  }

  /**
   * They've heard it: everyone runs for `to` and stands about there in a
   * few loose knots, shaking, looking up at `face` (which lies off toward
   * `front`, a unit vector). Out of the door to the lane, along it to its
   * point `laneTo`, by way of `via`, and there. The one with furthest to go
   * bolts at once; each of the others stands staring until the runners are
   * nearly on it and then goes with them, so they come down the lane as a
   * pack and get there together, in about `secs`. Returns who went first.
   */
  panic(to: THREE.Vector3, face: THREE.Vector3, front: { x: number; z: number }, laneTo: number, via: THREE.Vector3[], secs: number): number {
    const lane = this.site.lane;
    /** Where each stands, across the way they're looking and back from it: twos and threes, not a rank. */
    const SPOT = [[-4.7, 0.5], [-3.6, -1.7], [-2.6, 2.0], [-0.7, -0.4], [0.4, 2.7], [1.1, -2.3], [3.2, 1.0], [4.3, -1.3], [2.2, 3.4], [-1.9, 3.6]];
    this.still();
    let tail = 0, far = 0;
    const runs: { k: number; len: number; go: () => void }[] = [];
    for (const [k, s] of this.spirits.entries()) {
      if (this.taken[k]) continue;
      const r = (n: number) => hash01(k, n, this.seed, 991) - 0.5;
      const [across, back] = SPOT[k % SPOT.length].map((v, n) => v + r(n + 1) * 0.6);
      const at = new THREE.Vector3(to.x + front.z * across - front.x * back, 0, to.z - front.x * across - front.z * back);
      at.y = this.gy(at.x, at.z);
      // Each keeps to its own side of the way, so the pack is a pack and not a string.
      const off = r(3) * 4.4, path: THREE.Vector3[] = [];
      // (From wherever along the lane it had got to.)
      const from = this.nearest(s.pos);
      const step = laneTo < from ? -1 : 1;
      const side = (p: { x: number; z: number }, q: { x: number; z: number }) => { const l = Math.hypot(q.x - p.x, q.z - p.z) || 1; return new THREE.Vector3(p.x + ((q.z - p.z) / l) * off, 0, p.z - ((q.x - p.x) / l) * off); };
      for (let j = from; j !== laneTo; j += step) path.push(side(lane[j], lane[j + step]));
      const end = via[0] ?? at;
      path.push(side(lane[laneTo], end));
      for (const [n, w] of via.entries()) path.push(side(w, via[n + 1] ?? at).lerp(w, 0.6));
      path.push(at);
      let len = 0, p = s.pos;
      for (const q of path) { len += Math.hypot(q.x - p.x, q.z - p.z); p = q; }
      if (len > far) { far = len; tail = k; }
      s.mood = 'scared';
      s.want.face = face;
      s.want.pose = 'stand';
      runs.push({ k, len, go: () => { this.way[k] = path; s.teleport(s.pos); s.want = { at, face, pose: 'stand', icon: null, lead: false, settled: true }; } });
    }
    const speed = THREE.MathUtils.clamp(far / secs, 5, 11.5);
    this.fleeT = 0;
    this.waiting = runs.map((q) => {
      this.spirits[q.k].haste = speed * (q.k === tail ? 1 : 0.97 + 0.05 * hash01(q.k, 5, this.seed, 991));
      // (It goes when the first runner is a few strides short of its door.)
      return { at: q.k === tail ? 0 : Math.max(0.25, (far - q.len - 7) / speed), go: q.go };
    });
    return tail;
  }

  /**
   * Spirit `k` is home again: set down at `at` (or on its doorstep), itself
   * once more, and with a life to get on with among what's left. (`mill`
   * runs again for anyone who's here.)
   */
  comeHome(k: number, at?: THREE.Vector3) {
    const s = this.spirits[k], l = this.life[k];
    this.taken[k] = false;
    s.carried = null;
    s.mood = null;
    s.gesture = null;
    s.group.visible = true;
    s.haste = 1.6 + hash01(k, 3, this.seed, 979) * 0.5;
    this.way[k] = null;
    const p = (at ?? l.spot).clone();
    p.y = this.gy(p.x, p.z);
    s.teleport(p);
    l.doing = 'home';
    l.t = 6;
    l.mate = -1;
    l.gt = 0;
    l.due = null;
    l.face = this.mid;
    s.want = { at: p, face: this.mid, pose: 'stand', icon: null, lead: false, settled: true };
    this.calm = true;
  }

  /** Houses part built (step 1 to 4). */
  get mended(): number[] { return this.houses.map((_h, i) => i).filter((i) => this.houses[i].step > 0 && this.houses[i].step < HOME); }

  /**
   * House `i` is at step `n` of being built again (0 to `HOME`; see
   * `buildStage`), all at once and from whatever step it was at, so a save
   * can put any house at any step. Nothing is seen to happen. At 1 to 4 the
   * boards not yet used are in a stack beside the plot; at 1 and 2 some of
   * its stones still lie round the footing. From step 1 the ground under it
   * must be level: the caller fills the giant's print first (`Trail.fill`).
   * (A house still standing is knocked down first, its spirits left at
   * home: dev.)
   */
  setStep(i: number, n: number) {
    const h = this.houses[i];
    n = THREE.MathUtils.clamp(Math.round(n), 0, HOME);
    if (!h || n === h.step) return;
    const gy = this.ground ?? this.gy;
    if (!h.smashed) {
      this.smash(i, gy, true);
      for (const [k] of this.spirits.entries()) if (this.home[k] === i) this.comeHome(k);
    }
    h.step = n;
    h.smashed = n < HOME;
    for (const m of h.meshes) m.visible = n === HOME;
    for (const m of h.stage ?? []) { m.removeFromParent(); }
    if (h.stage) (h.stage[0] as THREE.Mesh).geometry.dispose();
    h.stage = undefined;
    h.stack = undefined;
    const p = h.plot, sp = HUTS[p.variant];
    h.high = (BASE + (n === 2 ? sp.h * LOW : sp.h) + 0.05) * S;
    const side = h.doorX > 0 ? -1 : 1;
    if (n > 0 && n < HOME) {
      const geo = buildStage(p.variant, n);
      const mesh = propMesh(geo, this.mat), shade = propMesh(geo, this.caster);
      for (const m of [mesh, shade]) { m.position.set(p.x, p.y, p.z); m.rotation.y = p.rot; }
      shade.layers.set(SHADOW_LAYER);
      this.group.add(mesh, shade);
      h.stage = [mesh, shade];
      // The stack: off the end of the house away from its door's side, boards lying along the house's depth.
      h.stack = this.world(h, side * (h.hw + 2.3), 0, new THREE.Vector3());
      h.stack.y = gy(h.stack.x, h.stack.z);
    }
    let nb = 0, ns = 0;
    for (const q of this.pieces) {
      if (q.house !== i) continue;
      q.lay ??= { pos: q.pos.clone(), rot: q.rot.clone(), size: q.size.clone() };
      q.rest = true;
      q.used = false;
      q.size.copy(q.lay.size);
      if (n === 0) {
        // As it fell.
        q.pos.copy(q.lay.pos);
        q.rot.copy(q.lay.rot);
        q.pos.y = gy(q.pos.x, q.pos.z) + (q.stone ? q.size.y * 0.3 : 0.07);
      } else if (q.stone) {
        if (ns >= LYING[n]) { q.used = true; continue; }
        // Round the footing: its four corners, and the middle of each side.
        const [cx, cz] = [[1, 1], [-1, 1], [-1, -1], [1, -1], [0, 1], [1, 0], [0, -1], [-1, 0]][ns++];
        this.world(h, cx * (h.hw + 0.55), cz * (h.hd + 0.55), q.pos);
        q.pos.y = gy(q.pos.x, q.pos.z) + q.size.y * 0.3;
        q.rot.set(0, p.rot + ns, 0);
      } else {
        if (nb >= STACKED[n]) { q.used = true; continue; }
        // Four across, layer on layer; each layer a hair askew, as stacked by hand.
        const layer = Math.floor(nb / 4), col = nb % 4;
        nb++;
        this.world(h, side * (h.hw + 2.3) + (col - 1.5) * 0.62, ((layer * 7 + col * 3) % 5 - 2) * 0.09, q.pos);
        q.pos.y = h.stack!.y + 0.08 + layer * 0.135;
        q.rot.set(0, p.rot + Math.PI / 2 + ((layer * 5 + col * 3) % 7 - 3) * 0.022, 0);
        // (Boards lie with their length along x: all cut to much the same, so the stack has square ends.)
        q.size.x = Math.min(q.size.x, 2.3) * 0.5 + 1.15;
        q.size.z = 0.56;
      }
    }
    this.drawPieces();
  }

  private fleeT = 0;
  private waiting: { at: number; go: () => void }[] = [];

  /** Something came down close by: they all start. */
  flinch() {
    this.still();
    for (const [k, s] of this.spirits.entries()) if (!this.taken[k]) s.flinch();
  }

  /** Spirit `k` is snatched up: from now on it hangs at `grip` (a crow's, which moves), kicking. */
  take(k: number, grip: THREE.Vector3) {
    this.taken[k] = true;
    this.spirits[k].carried = grip;
  }

  /** And it's gone from here (up at the giant's head, it is a light under its crow). */
  drop(k: number) {
    this.spirits[k].carried = null;
    this.spirits[k].group.visible = false;
  }

  private ground: ((x: number, z: number) => number) | null = null;

  private settle(p: Piece, ground: (x: number, z: number) => number) {
    p.rest = true;
    p.pos.y = ground(p.pos.x, p.pos.z) + (p.stone ? p.size.y * 0.3 : 0.07);
    // Boards lie flat, give or take.
    p.rot.set(p.stone ? p.rot.x : Math.sin(p.rot.x) * 0.12, p.rot.y, p.stone ? p.rot.z : Math.sin(p.rot.z) * 0.12);
  }

  private drawPieces() {
    this.boards.begin();
    this.stones.begin();
    for (const p of this.pieces) if (!p.used) (p.stone ? this.stones : this.boards).push(m4.compose(p.pos, q.setFromEuler(p.rot), p.size), p.tint);
    this.boards.end();
    this.stones.end();
  }

  update(dt: number, player: THREE.Vector3) {
    // Boards and stones in the air: they tumble, drop and stay where they land.
    let flying = false;
    for (const p of this.pieces) {
      if (p.rest || !this.ground) continue;
      flying = true;
      p.vel.y -= 22 * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += p.spin.x * dt; p.rot.y += p.spin.y * dt; p.rot.z += p.spin.z * dt;
      if (p.vel.y < 0 && p.pos.y <= this.ground(p.pos.x, p.pos.z) + 0.1) this.settle(p, this.ground);
    }
    if (flying) this.drawPieces();
    for (const [i, h] of this.houses.entries()) {
      if (h.smashed) continue;
      if ((this.smokeT[i] -= dt) <= 0) {
        this.smokeT[i] = 0.5 + Math.random() * 0.25;
        this.smoke.emit(h.chimney, 1, 0.2 + Math.random() * 0.1, 0.16, undefined, { life: 3, rise: 0.18, drag: 0.35, up: 0.7 });
      }
    }
    this.smoke.update(dt);
    if (this.waiting.length) {
      this.fleeT += dt;
      this.waiting = this.waiting.filter((w) => { if (w.at > this.fleeT) return true; w.go(); return false; });
    }
    if (this.calm) this.mill(dt, player);
    for (const [i, h] of this.houses.entries()) {
      if (h.smashed) continue;
      // The door swings in ahead of whoever's coming through it, and to behind them.
      let open = 0;
      for (const [k, s] of this.spirits.entries()) {
        if (this.home[k] !== i || this.taken[k]) continue;
        const l = this.life[k], t = this.world(h, h.doorX, h.hd, v1), near = Math.hypot(s.pos.x - t.x, s.pos.z - t.z);
        if ((l.doing === 'in' && near < 2.4) || (l.doing === 'inside' && l.t < 0.45) || (l.doing === 'out' && near < 1.5)) open = 1;
      }
      if (Math.abs(open - h.ajar) < 1e-3) continue;
      h.ajar += (open - h.ajar) * (1 - Math.exp(-7 * dt));
      h.leaf.rotation.y = h.plot.rot + h.ajar * 1.75;
    }
    for (const [k, s] of this.spirits.entries()) {
      // (Carried off, or indoors.)
      if (!s.group.visible) continue;
      s.player.copy(player);
      s.update(dt);
      this.eyes[k].copy(s.pos).y += EYE;
    }
  }

  /** House-local (x, z) in the world, at height `y`. */
  private world(h: House, lx: number, lz: number, out: THREE.Vector3, y = 0) {
    const c = Math.cos(h.plot.rot), s = Math.sin(h.plot.rot);
    return out.set(h.plot.x + c * lx + s * lz, y, h.plot.z - s * lx + c * lz);
  }

  /** The ground for someone who lives at house `i`: up its step and on to its floor. */
  private floor(i: number, x: number, z: number): number {
    const h = this.houses[i], g = this.gy(x, z);
    if (!h) return g;
    const l = this.local(h, x, z, this.l);
    // (Its footing laid again and no walls yet: that's a step up too.)
    if (h.step < 2) return h.step === 1 && Math.abs(l.x) < h.hw + 0.18 && Math.abs(l.z) < h.hd + 0.18 ? Math.max(g, h.plot.y + BASE * S) : g;
    if (Math.abs(l.x - h.doorX) > 0.3 * S || l.z > h.hd + 0.31 * S + 0.25 || l.z < -h.hd) return g;
    return Math.max(g, h.plot.y + BASE * S);
  }

  /** The lane point nearest `p`. */
  private nearest(p: { x: number; z: number }): number {
    let best = 0, bd = Infinity;
    for (const [j, q] of this.site.lane.entries()) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = j; } }
    return best;
  }

  /** The way for `k` from where it is to `at`, which is by lane point `to`: out to the lane, along its own side of it, and off. */
  private along(k: number, to: number, at: THREE.Vector3): THREE.Vector3[] | null {
    const lane = this.site.lane, p = this.spirits[k].pos, from = this.nearest(p);
    if (from === to) return null;
    const step = to < from ? -1 : 1, off = this.life[k].side * step, path: THREE.Vector3[] = [];
    for (let j = from; j !== to + step; j += step) {
      // (Not back to a point it's all but at, or on past the one it's leaving the lane by.)
      if ((j === from && Math.hypot(lane[j].x - p.x, lane[j].z - p.z) < 3) || (j === to && Math.hypot(lane[j].x - at.x, lane[j].z - at.z) < 3)) continue;
      const a = lane[Math.max(0, j - 1)], b = lane[Math.min(lane.length - 1, j + 1)], len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      path.push(new THREE.Vector3(lane[j].x + ((b.z - a.z) / len) * off, 0, lane[j].z - ((b.x - a.x) / len) * off));
    }
    path.push(at);
    return path;
  }

  /** Send `k` off to `at` to be `doing` something, by `path` (which ends there) or straight. */
  private go(k: number, at: THREE.Vector3, doing: Doing, path: THREE.Vector3[] | null = null) {
    const s = this.spirits[k], l = this.life[k];
    at.y = this.floor(this.home[k], at.x, at.z);
    this.way[k] = path;
    // (So it asks the way again, however near the last place this is.)
    s.teleport(s.pos);
    s.gesture = null;
    l.gt = 0;
    l.due = null;
    s.want = { at, face: l.face, pose: 'stand', icon: null, lead: false, settled: true };
    l.doing = doing;
    l.t = 0;
  }

  /** `k` says `g` (or just looks) for `secs`, to `face` (or whoever it's with); 'point' points out `at`. */
  private say(k: number, g: Gesture | null, secs: number, face?: THREE.Vector3, at?: THREE.Vector3) {
    const s = this.spirits[k], l = this.life[k];
    s.gesture = g;
    s.pointing = at ?? null;
    s.want.face = face ?? l.face;
    l.gt = secs;
  }

  /** Back on its doorstep with nothing to do for a while. */
  private settleHome(k: number) {
    const s = this.spirits[k], l = this.life[k];
    l.doing = 'home';
    l.t = 5 + Math.random() * 12;
    l.mate = -1;
    l.face = this.mid;
    s.want = { at: l.spot.clone(), face: l.face, pose: l.sits ? 'sit' : 'stand', icon: null, lead: false, settled: true };
  }

  private goHome(k: number) {
    const l = this.life[k];
    l.mate = -1;
    l.face = this.mid;
    this.go(k, l.spot.clone(), 'back', this.along(k, this.laneAt[k], l.spot));
  }

  /** At its own house being built again: over to the stack of boards or the footing, to stand and do something about it. */
  private work(k: number) {
    const h = this.houses[this.home[k]], l = this.life[k];
    const atStack = Math.random() < 0.5, a = Math.random() * 6.283;
    const c = atStack ? h.stack! : new THREE.Vector3(h.plot.x, 0, h.plot.z), r = atStack ? 1.9 : Math.max(h.hw, h.hd) + 1.5;
    const at = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    l.mate = -1;
    l.face = new THREE.Vector3(c.x, this.gy(c.x, c.z) + 0.4, c.z);
    this.go(k, at, 'work');
  }

  /** A wander a little way along the lane, to stand and look at something. */
  private stroll(k: number) {
    const lane = this.site.lane, l = this.life[k];
    const to = THREE.MathUtils.clamp(this.nearest(this.spirits[k].pos) + Math.round((Math.random() - 0.5) * 4), 0, lane.length - 1);
    const a = Math.random() * 6.283, r = 0.6 + Math.random() * 1.4;
    const at = new THREE.Vector3(lane[to].x + Math.cos(a) * r, 0, lane[to].z + Math.sin(a) * r);
    l.mate = -1;
    l.face = this.mid;
    this.go(k, at, 'stroll', this.along(k, to, at));
  }

  /** Something worth looking at or pointing out: a chimney's smoke, or either end of the lane. */
  private sight(): THREE.Vector3 {
    const lane = this.site.lane, r = Math.random();
    const up = this.houses.filter((h) => !h.smashed);
    if (r < 0.55 && up.length) return up[Math.floor(Math.random() * up.length)].chimney;
    const q = r < 0.8 ? lane[0] : lane[lane.length - 1];
    return new THREE.Vector3(q.x, this.gy(q.x, q.z) + 2, q.z);
  }

  /** `a` and `b` go and meet: where they are if they're neighbours, or out in the lane between their doors. */
  private meet(a: number, b: number) {
    const lane = this.site.lane, sa = this.life[a].spot, sb = this.life[b].spot;
    const d = Math.hypot(sb.x - sa.x, sb.z - sa.z) || 1, ux = (sb.x - sa.x) / d, uz = (sb.z - sa.z) / d;
    const mi = Math.round((this.laneAt[a] + this.laneAt[b]) / 2);
    const p = d < 5 ? new THREE.Vector3().addVectors(sa, sb).multiplyScalar(0.5) : new THREE.Vector3(lane[mi].x + (Math.random() - 0.5) * 2.4, 0, lane[mi].z + (Math.random() - 0.5) * 2.4);
    for (const [k, o, sg] of [[a, b, -1], [b, a, 1]]) {
      const l = this.life[k], at = new THREE.Vector3(p.x + ux * 0.8 * sg, 0, p.z + uz * 0.8 * sg);
      l.mate = o;
      l.face = this.eyes[o];
      this.go(k, at, 'meet', d < 5 ? null : this.along(k, mi, at));
    }
  }

  /** The talk between `a` and its mate (`a` keeps the clock): they take turns, one saying something with its arms and the other taking it in. */
  private talk(a: number, dt: number) {
    const la = this.life[a], b = la.mate;
    la.t -= dt;
    if ((la.next -= dt) > 0) return;
    if (la.t <= 0) {
      // A wave, and they go their ways.
      for (const k of [a, b]) { this.say(k, 'wave', 1.2); this.life[k].doing = 'part'; this.life[k].t = 1.3 + (k === a ? 0 : 0.3); }
      return;
    }
    const k = la.turn++ % 2 ? b : a, o = k === a ? b : a;
    const r = Math.random(), secs = 1.1 + Math.random() * 0.9;
    const g: Gesture = la.turn === 1 || r > 0.9 ? 'wave' : r < 0.32 ? 'wide' : r < 0.56 ? 'point' : r < 0.78 ? 'hop' : 'cheer';
    if (g === 'point') {
      // "Look at that": and the other does.
      const at = this.sight();
      this.say(k, g, secs + 0.5, undefined, at);
      this.life[o].due = { t: 0.5, g: null, secs, face: at };
    } else {
      this.say(k, g, secs);
      if (la.turn === 1) this.life[o].due = { t: 0.6, g: 'wave', secs: 1.1 };
      else if (Math.random() < 0.65) this.life[o].due = { t: secs * 0.6, g: g === 'cheer' ? 'cheer' : 'nod', secs: 0.8 };
    }
    la.next = secs + 0.5 + Math.random() * 0.9;
  }

  /** An ordinary day: each of them at something, and on to the next thing when it's done. */
  private mill(dt: number, player: THREE.Vector3) {
    for (const [k, s] of this.spirits.entries()) {
      if (this.taken[k]) continue;
      const l = this.life[k], h = this.houses[this.home[k]];
      if (l.due && (l.due.t -= dt) <= 0) { this.say(k, l.due.g, l.due.secs, l.due.face); l.due = null; }
      if (l.gt > 0 && (l.gt -= dt) <= 0) { s.gesture = null; s.want.face = l.face; }
      const idle = (l.doing === 'home' || l.doing === 'look') && l.gt <= 0 && !l.due;
      // You, close by: a wave.
      l.greetT -= dt;
      if (idle && l.greetT <= 0 && Math.hypot(player.x - s.pos.x, player.z - s.pos.z) < 5.5) {
        this.say(k, 'wave', 1.4, s.player);
        l.greetT = 20 + Math.random() * 12;
        continue;
      }
      switch (l.doing) {
        case 'home': {
          // Now and then, a wave across the way to whoever else is out on their step (who waves back).
          if (idle && (l.hailT -= dt) <= 0) {
            l.hailT = 9 + Math.random() * 14;
            const out = this.spirits.map((_q, m) => m).filter((m) => m !== k && !this.taken[m] && this.life[m].doing === 'home' && this.life[m].gt <= 0 && this.eyes[m].distanceTo(s.pos) < 32);
            if (out.length) {
              const m = out[Math.floor(Math.random() * out.length)];
              this.say(k, 'wave', 1.5, this.eyes[m]);
              this.life[m].due = { t: 0.8, g: 'wave', secs: 1.3, face: this.eyes[k] };
            }
          }
          if ((l.t -= dt) > 0 || !idle) break;
          const r = Math.random();
          // Its house is being built again: mostly, it's at that.
          if (h.stack && r < 0.7) { this.work(k); break; }
          if (r < 0.3 && !h.smashed) {
            // Indoors for a bit: to the door and in.
            const inside = this.world(h, h.doorX, h.hd - 0.85, new THREE.Vector3());
            this.go(k, inside, 'in', [h.door.clone(), inside]);
          } else if (r < 0.72) {
            const free = this.spirits.map((_q, m) => m).filter((m) => m !== k && !this.taken[m] && this.life[m].doing === 'home' && this.life[m].spot.distanceTo(l.spot) < 70);
            if (free.length) this.meet(k, free[Math.floor(Math.random() * free.length)]);
            else this.stroll(k);
          } else this.stroll(k);
          break;
        }
        case 'stroll':
          if (s.arrived || (l.t += dt) > 40) {
            l.doing = 'look';
            l.t = 3 + Math.random() * 5;
            s.want.face = l.face = this.sight();
          }
          break;
        case 'work':
          // There: it looks the thing over, and does a bit (a hop, a nod, its arms out at the size of the job).
          if (s.arrived || (l.t += dt) > 30) {
            l.doing = 'look';
            l.t = 2.5 + Math.random() * 3;
            s.want.face = l.face;
            const r = Math.random();
            l.due = { t: 0.5, g: r < 0.45 ? 'hop' : r < 0.75 ? 'nod' : 'wide', secs: 1.2 };
          }
          break;
        case 'look':
          if ((l.t -= dt) <= 0 && idle) { if (h.stack && Math.random() < 0.6) this.work(k); else if (Math.random() < 0.35) this.stroll(k); else this.goHome(k); }
          break;
        case 'back':
        case 'out':
          if (s.arrived || (l.t += dt) > 40) this.settleHome(k);
          break;
        case 'meet': {
          const m = l.mate, lm = this.life[m];
          l.t += dt;
          // (Stood up: the other's off at something else.)
          if (lm.mate !== k || (lm.doing !== 'meet' && lm.doing !== 'chat')) { this.goHome(k); break; }
          if (k > m) break;
          if (s.arrived && this.spirits[m].arrived) {
            l.doing = lm.doing = 'chat';
            l.t = 7 + Math.random() * 10;
            l.turn = 0;
            l.next = 0.4;
          } else if (l.t > 45) { this.goHome(k); this.goHome(m); }
          break;
        }
        case 'chat':
          if (k < l.mate) this.talk(k, dt);
          break;
        case 'part':
          if ((l.t -= dt) <= 0) { if (Math.random() < 0.3) this.stroll(k); else this.goHome(k); }
          break;
        case 'in':
          // Through the door and gone; it shuts behind.
          if (s.arrived || (l.t += dt) > 15) { s.group.visible = false; l.doing = 'inside'; l.t = 5 + Math.random() * 12; }
          break;
        case 'inside':
          if ((l.t -= dt) <= 0) {
            s.group.visible = true;
            this.go(k, l.spot.clone(), 'out', [h.door.clone(), l.spot.clone()]);
          }
          break;
      }
    }
  }

  /** Something's wrong: whatever they were at, they stop where they are (anyone indoors comes out to see). */
  private still() {
    if (!this.calm) return;
    this.calm = false;
    for (const [k, s] of this.spirits.entries()) {
      if (this.taken[k]) continue;
      const l = this.life[k], h = this.houses[this.home[k]];
      l.face = this.mid;
      if (l.doing === 'in' || l.doing === 'inside' || l.doing === 'out') {
        s.group.visible = true;
        this.go(k, l.spot.clone(), 'out', [h.door.clone(), l.spot.clone()]);
      } else this.go(k, s.pos.clone(), 'home');
      s.want.pose = 'stand';
    }
  }

  private local(h: House, x: number, z: number, out: { x: number; z: number }) {
    const c = Math.cos(h.plot.rot), s = Math.sin(h.plot.rot);
    const dx = x - h.plot.x, dz = z - h.plot.z;
    out.x = c * dx - s * dz;
    out.z = s * dx + c * dz;
    return out;
  }

  private l = { x: 0, z: 0 };

  /** The roof under a foot circle (you can land and stand on one), at most `step` above the feet. */
  surface(x: number, z: number, feetY: number, r: number, step: number): number {
    for (const h of this.houses) {
      if (Math.abs(x - h.plot.x) > 6 || Math.abs(z - h.plot.z) > 6) continue;
      if (h.step < 4) {
        // A footing laid again: a low step up, to stand on. Walls without a roof: their top, flat.
        if (!h.step) continue;
        const l = this.local(h, x, z, this.l), up = h.step > 1, y = h.plot.y + (up ? h.high : BASE * S), m = (up ? 0 : 0.18) + r * 0.5;
        if (Math.abs(l.x) < h.hw + m && Math.abs(l.z) < h.hd + m && y <= feetY + step) return y;
        continue;
      }
      const l = this.local(h, x, z, this.l);
      const over = OVER * S + 0.2;
      if (Math.abs(l.x) > h.hw + 0.45 + r || Math.abs(l.z) > h.hd + over + r || feetY < h.plot.y + h.wallTop - 0.3) continue;
      const nz = Math.min(h.hd + over, Math.max(0, Math.abs(l.z) - r));
      const y = h.plot.y + h.wallTop + h.rise * (1 - nz / h.hd) + 0.2;
      return y <= feetY + step ? y : -Infinity;
    }
    return -Infinity;
  }

  /** Push a body circle out of the walls. */
  push(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    for (const h of this.houses) {
      if (h.step < 2 || Math.abs(pos.x - h.plot.x) > 6 || Math.abs(pos.z - h.plot.z) > 6) continue;
      if (pos.y > h.plot.y + h.high - 0.1) continue;
      const l = this.local(h, pos.x, pos.z, this.l);
      const qx = Math.max(-h.hw, Math.min(h.hw, l.x)), qz = Math.max(-h.hd, Math.min(h.hd, l.z));
      let nx = l.x - qx, nz = l.z - qz, depth: number;
      const d = Math.hypot(nx, nz);
      if (d > 1e-4) {
        if (d >= r) continue;
        nx /= d; nz /= d;
        depth = r - d;
      } else {
        const px = h.hw - Math.abs(l.x), pz = h.hd - Math.abs(l.z);
        if (px < pz) { nx = Math.sign(l.x) || 1; nz = 0; depth = px + r; } else { nx = 0; nz = Math.sign(l.z) || 1; depth = pz + r; }
      }
      const c = Math.cos(h.plot.rot), s = Math.sin(h.plot.rot);
      const wx = c * nx + s * nz, wz = -s * nx + c * nz;
      pos.x += wx * depth;
      pos.z += wz * depth;
      const vn = vel.x * wx + vel.z * wz;
      if (vn < 0) { vel.x -= wx * vn; vel.z -= wz * vn; }
    }
  }
}
