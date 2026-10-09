import * as THREE from 'three';
import { SHADOW_LAYER } from '../gfx/groundShadow';
import { makeCasterMaterial } from '../gfx/materials';
import { Puffs } from '../gfx/puffs';
import { hash01 } from '../core/rng';
import { BIOME } from '../gfx/palette';
import { colored, merge as mergeParts, PartBatch } from '../mobs/parts';
import type { Plot, VillageSite } from '../world/storySite';
import { gable, K, kbox, merge, rbox } from './geometry';
import { glintMat, propMesh } from './props';
import { buildLadder, buildMallet, buildSaw, buildSawhorse, CUT_Z, HORSE_TOP } from './chores';
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
// home. While it's part built it has a yard (`Yard`), and whoever's home
// works in it (`work`, `chore`): one saws boards to length at a sawhorse,
// one nails them to the end wall off a ladder, and others carry in what
// still lies about of the houses nobody has begun on, boards to the stack
// and stones to a pile. Looks only: none of it is saved or builds anything.

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

type Doing = 'home' | 'stroll' | 'look' | 'back' | 'meet' | 'chat' | 'part' | 'in' | 'inside' | 'out' | 'work' | 'toBed' | 'bed' | 'toDig' | 'grab' | 'stow' | 'scoop' | 'carry' | 'toss' | 'job';
/** At the heap with a shovel, or on the way there. */
const DIGGING = new Set<Doing>(['toDig', 'grab', 'stow', 'scoop', 'carry', 'toss']);

/**
 * Where one of the giant's prints is being shovelled full (`Village.dig`):
 * the heap of earth beside it, where they stand at its lip to throw, and a
 * point down in it that the earth is thrown at.
 */
export interface DigSite { pile: THREE.Vector3; edge: THREE.Vector3; into: THREE.Vector3 }
/** Shovels stood in the heap (so that many dig at once), and where along one its blade is (it lies along -y from the hand). */
const SHOVELS = 2, BLADE = 0.47;
/** Clods lying round the heap's foot: across, along (heap-local, m) and how big. */
const LOOSE = [[1.45, 0.4, 0.3], [-1.35, 0.7, 0.24], [1.0, 1.25, 0.2], [-1.6, -0.4, 0.22], [1.3, -1.0, 0.26]];

/** A heap of loose earth: a soft cone, a little lumpy, its foot on the ground at y = 0. About 2.6 m across and 0.75 high. */
function buildHeap(): THREE.BufferGeometry {
  const prof = [[0.001, 0.95], [0.28, 0.9], [0.62, 0.68], [1.0, 0.4], [1.36, 0.14], [1.6, -0.05]].map(([r, y]) => new THREE.Vector2(r, y)).reverse();
  const g = new THREE.LatheGeometry(prof, 18);
  const pos = g.getAttribute('position');
  // (Lumps: by where the point is, so the seam's two edges move together.)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), n = Math.sin(x * 5.1 + y * 3.3) * Math.cos(z * 4.7 - y * 2.1);
    pos.setXYZ(i, x * (0.8 + n * 0.04), y * (0.8 + n * 0.06), z * (0.8 + n * 0.04));
  }
  g.computeVertexNormals();
  return colored(g, BIOME.earth, 0, false);
}

/** A shovel: its origin where it's held, cut-wood shaft down -y, a steel blade at the end, its hollow toward +z. */
function buildShovel(): THREE.BufferGeometry {
  const shaft = new THREE.CylinderGeometry(0.027, 0.027, 0.48, 8).translate(0, -0.15, 0);
  const grip = new THREE.BoxGeometry(0.13, 0.045, 0.045).translate(0, 0.1, 0);
  // A spade: square shoulders, its sides drawing in to a rounded point.
  const s = new THREE.Shape();
  s.moveTo(-0.1, 0.1);
  s.lineTo(0.1, 0.1);
  s.lineTo(0.105, 0.02);
  s.quadraticCurveTo(0.1, -0.09, 0, -0.16);
  s.quadraticCurveTo(-0.1, -0.09, -0.105, 0.02);
  s.closePath();
  const blade = new THREE.ExtrudeGeometry(s, { depth: 0.028, bevelEnabled: false, curveSegments: 6 }).translate(0, -BLADE, -0.014);
  return mergeParts([colored(shaft, BIOME.cutWood, 0, false), colored(grip, BIOME.cutWood, 0, false), colored(blade, BIOME.steel, 0, false)]);
}
/** Where something loose is put: where, which way round, and (if it changes on the way) how big. */
interface Pose { pos: THREE.Vector3; quat: THREE.Quaternion; size?: THREE.Vector3 }
/**
 * A loose board or stone that's being worked with (carried, sawn, piled,
 * nailed up). Drawn every frame, unlike a `Piece`, which lies where it fell.
 */
interface Thing {
  stone: boolean; pos: THREE.Vector3; quat: THREE.Quaternion; size: THREE.Vector3; tint: THREE.Color;
  /** Whose yard it's in (a house), and on whose head it is (-1: nobody's). */
  yard: number; on: number;
  /** On its way somewhere: from where, to where (null: up on to `on`'s head), and how far along. */
  flit: { p0: THREE.Vector3; q0: THREE.Quaternion; s0: THREE.Vector3; to: Pose | null; t: number; secs: number; arc: number } | null;
}
/** A saw or a mallet: where it's left when nobody has it, and on its way to or from whose hand. */
interface Tool { obj: THREE.Object3D; pos: THREE.Vector3; quat: THREE.Quaternion; fly: { k: number; t: number; secs: number; out: boolean } | null }
/**
 * The works at a house being built again (step 1 to 4), all in the house's
 * own frame: beside the stack of boards a sawhorse with a board on it,
 * offcuts under its end; a pile of stones; and from step 2, a ladder on the
 * end wall away from the stack, off which boards are nailed up on that wall.
 */
interface Yard {
  i: number; h: House; side: number; tint: THREE.Color;
  horse: THREE.Object3D; saw: Tool; sawAt: THREE.Vector3; sawFace: THREE.Vector3; fetchAt: THREE.Vector3;
  /** The board on the horse (and how long it still is). */
  board: Thing | null; len: number;
  offcuts: (Thing | null)[]; nailed: (Thing | null)[]; extras: (Thing | null)[]; cairn: (Thing | null)[];
  /** How many have been put on each so far (which slot is next). */
  count: { off: number; nail: number; extra: number; cairn: number };
  cairnAt: THREE.Vector3;
  /** The board on the horse, and room round it, in the house's frame: across, and from where to where along. */
  bx: number; bz0: number; bz1: number;
  /** The ladder: its foot's ground, how far out that is from the wall, how high its top is above that, and how high you stand for each row. */
  ladder: THREE.Object3D | null; mallet: Tool; footY: number; out: number; rise: number; climb: number[]; wallFace: THREE.Vector3;
  /** Who's sawing and who's on the ladder (-1: nobody). */
  sawyer: number; nailer: number;
}
/** A turn at something in a yard (`Village.chore`). */
interface Job {
  kind: 'saw' | 'haul' | 'nail'; yard: Yard; stage: string;
  /** Seconds left of this stage, how many more rounds, and the strokes counted so far. */
  t: number; left: number; seen: number; n: number;
  thing: Thing | null; piece: Piece | null;
}
/** A board on the sawhorse: how long a fresh one is, what's sawn off it each time, and its section. */
const BOARD = 2.2, CUT = 0.45, THICK = 0.1, WIDE = 0.36;
/** How far to the side of its middle a spirit's tool hand is, and how far above its feet a mallet lands. */
const HAND = 0.31, STRIKE = 0.47;
/** Blows of the mallet to a board (about ten seconds of it): the first six knock it level. */
const KNOCKS = 17;
/** The stages of nailing that are on the ladder. */
const LADDER = new Set(['climb', 'place', 'hammer', 'rest', 'down']);
const QUARTER = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
const UP = new THREE.Vector3(0, 1, 0);

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
  /** Digging: which shovel is its (-1: none), and how many more shovelfuls before it has had enough. */
  shovel: number; loads: number;
  /** At a chore in a yard (`doing` is 'job'), and how far up a ladder it is (m). */
  job: Job | null; up: number;
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
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const WHITE = new THREE.Color('#ffffff'), e1 = new THREE.Euler(), v3 = new THREE.Vector3(), q2 = new THREE.Quaternion();

export interface VillageDeps {
  seed: number;
  ground(x: number, z: number): number;
  /** Is it night? (They go indoors: into their own house if it's whole, else to `cabin`.) */
  night?(): boolean;
  /**
   * Your cabin, where whoever has no house of their own sits out the night:
   * its floor (-Infinity outside it), the way in (doorstep, door, just
   * inside), places on the floor round the hearth, and the hearth to look at.
   */
  cabin?: { floor(x: number, z: number): number; way: THREE.Vector3[]; seats: THREE.Vector3[]; hearth: THREE.Vector3 };
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
  /** Stood somewhere by someone else for now (`attend`): `mill` leaves them be. */
  private held = new Set<number>();
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
  private night: () => boolean;
  private cabin: VillageDeps['cabin'];
  /** You're away from the village (so when you come back, they're found at what they do: `busy`). */
  private away = true;
  /** The print being filled in, if one is: its heap, the shovels (each in the heap or in a hand), and whether there's earth on each. */
  private digAt: DigSite | null = null;
  private onToss: (() => void) | null = null;
  private heap = new THREE.Object3D();
  private shovels: THREE.Object3D[] = [];
  private clods: THREE.Object3D[] = [];
  private loaded: boolean[] = [];
  private heapB = new PartBatch(buildHeap(), { keep: 0.5 }, 1);
  private dirtB = new PartBatch(colored(new THREE.IcosahedronGeometry(0.5, 1), BIOME.earth, 0, false), { keep: 0.5 }, LOOSE.length + SHOVELS);
  private shovelB = new PartBatch(buildShovel(), { keep: 0.5 }, SHOVELS);
  private dirt = new Puffs(BIOME.earth, 36, 0, 0.5);
  /** The yards (by house; null where nothing's being built), and every loose thing in them. */
  private yards: (Yard | null)[] = [];
  private things: Thing[] = [];
  private plankB = new PartBatch(colored(new THREE.BoxGeometry(1, 1, 1), '#ffffff'), { keep: 0.5 }, 160);
  private rockB = new PartBatch(colored(new THREE.IcosahedronGeometry(0.5, 2), '#ffffff'), { keep: 0.3 }, 80);
  private horseB = new PartBatch(buildSawhorse(), { keep: 0.5 }, 6);
  private ladderB = new PartBatch(buildLadder(), { keep: 0.5 }, 6);
  private sawB = new PartBatch(buildSaw(), { keep: 0.5 }, 6);
  private malletB = new PartBatch(buildMallet(), { keep: 0.5 }, 6);
  private dust = new Puffs(BIOME.cutWood, 30, 0, 0.5);

  constructor(readonly site: VillageSite, d: VillageDeps) {
    this.seed = d.seed;
    // (With the giant's prints in it, once there are any: `smash` is handed that ground.)
    this.gy = (x, z) => (this.ground ?? d.ground)(x, z);
    this.night = d.night ?? (() => false);
    this.cabin = d.cabin;
    for (let j = 0; j < SHOVELS; j++) {
      const sh = new THREE.Object3D(), clod = new THREE.Object3D();
      clod.position.set(0, -BLADE, 0.05);
      clod.scale.set(0.2, 0.13, 0.2);
      sh.add(clod);
      // (Their size: a shovel as long as one of them is tall.)
      sh.scale.setScalar(2);
      this.shovels.push(sh);
      this.clods.push(clod);
      this.loaded.push(false);
      this.stand(j);
    }
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
        const spirit = new Spirit({ ground: (x, z) => this.floor(i, x, z) + (this.life[n]?.up ?? 0), route: (_a, b) => this.way[n]?.slice() ?? [b], sound: () => {}, sparkle: () => {} }, at);
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
          hailT: 3 + hash01(n, 5, d.seed, 979) * 12, greetT: 0, side: (n % 2 ? 1 : -1) * (0.5 + hash01(n, 6, d.seed, 979) * 0.8), shovel: -1, loads: 0, job: null, up: 0,
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
    this.group.add(this.smoke.group, this.boards.mesh, this.stones.mesh, this.heapB.mesh, this.dirtB.mesh, this.shovelB.mesh, this.dirt.group);
    this.group.add(this.plankB.mesh, this.rockB.mesh, this.horseB.mesh, this.ladderB.mesh, this.sawB.mesh, this.malletB.mesh, this.dust.group);
    this.yards = this.houses.map(() => null);
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

  /** Is `k` here (not carried off)? */
  here(k: number) { return !this.taken[k]; }

  /**
   * `k` drops what it's at and is stood at `at`, looking at `face`, until
   * it's let go (`dismiss`): the crowd when one of them comes home.
   */
  attend(k: number, at: THREE.Vector3, face: THREE.Vector3) {
    if (this.taken[k]) return;
    const s = this.spirits[k], l = this.life[k];
    this.held.add(k);
    s.group.visible = true;
    s.gesture = null;
    s.pointing = null;
    s.mood = null;
    this.way[k] = null;
    l.doing = 'home';
    l.mate = -1;
    l.gt = 0;
    l.due = null;
    const p = at.clone();
    p.y = this.gy(p.x, p.z);
    s.teleport(p);
    s.heading = Math.atan2(face.x - p.x, face.z - p.z);
    s.want = { at: p, face, pose: 'stand', icon: null, lead: false, settled: true };
  }

  /** And off home again, down the lane, to get on with its day. */
  dismiss(k: number) {
    if (!this.held.delete(k) || this.taken[k]) return;
    this.spirits[k].gesture = null;
    this.goHome(k);
  }

  /** Houses part built (step 1 to 4). */
  get mended(): number[] { return this.houses.map((_h, i) => i).filter((i) => this.houses[i].step > 0 && this.houses[i].step < HOME); }

  /**
   * How far built each house is once `done` dungeons are finished (what to
   * hand `setStep`). Everyone home works on all of it, one house after the
   * next down the lane, so there are always houses at different stages:
   * 1 0 0 0 0, then 3 1 0 0 0, 4 3 1 0 0, 5 4 3 1 0, 5 5 4 3 1 and so on.
   */
  plan(done: number): number[] {
    return this.houses.map((h, i) => (h.smashed ? THREE.MathUtils.clamp(Math.round(1.4 * done - 1.4 * i - 0.2), 0, HOME) : HOME));
  }

  /**
   * Cleared away, of what's left lying of the houses nobody has begun on:
   * whatever is where `gone` says (a print filled in over it), and `share`
   * (0..1) of the rest, the same pieces every time.
   */
  sweep(gone: (x: number, z: number) => boolean, share: number) {
    for (const [k, p] of this.pieces.entries()) {
      if (!p.rest || p.used || this.houses[p.house].step !== 0) continue;
      if (hash01(k, 3, this.seed, 997) < share || gone(p.pos.x, p.pos.z)) p.used = true;
    }
    this.drawPieces();
  }

  /**
   * One of the giant's prints is being filled in (or with null, none is):
   * a heap of earth stands at `site.pile` with shovels in it, and whoever's
   * home and has nothing else on takes one now and then, digs, carries a
   * shovelful to `site.edge` and throws it in (`toss` is called as each
   * lands). Looks only: how full the print is, is the caller's.
   */
  dig(site: DigSite | null, toss: (() => void) | null = null) {
    this.digAt = site;
    this.onToss = toss;
    for (const [k, l] of this.life.entries()) if (l.shovel >= 0) { this.putDown(k); if (!this.taken[k] && !this.held.has(k) && this.calm) this.goHome(k); }
    if (!site) return;
    this.heap.position.copy(site.pile);
    this.heap.rotation.y = Math.atan2(site.edge.x - site.pile.x, site.edge.z - site.pile.z);
    this.heap.updateMatrixWorld(true);
  }

  /**
   * Found at it, not setting out for it: whoever's here and free is put
   * straight to what it would be doing (called when the village has just
   * been mended unseen, and whenever you come back to it from away). By
   * day at the digging or at its own house; by night indoors already.
   */
  busy() {
    if (!this.calm) return;
    const night = this.night();
    for (const [k, s] of this.spirits.entries()) {
      const l = this.life[k], h = this.houses[this.home[k]];
      if (this.taken[k] || this.held.has(k) || l.doing === 'chat' || l.doing === 'bed') continue;
      if (l.doing === 'inside') { if (!night && h.smashed) { s.group.visible = true; this.settleHome(k); } continue; }
      this.putDown(k);
      this.quit(k);
      s.group.visible = true;
      const yard = this.yards.some((y) => y);
      if (night) {
        if (!h.smashed) { s.group.visible = false; l.doing = 'inside'; l.t = 5 + Math.random() * 10; l.mate = -1; continue; }
        if (!this.toBed(k)) continue;
        l.doing = 'bed';
        s.want.pose = 'sit';
      } else if (yard && k % 2 === 0) this.work(k);
      else if (!this.goDig(k)) { if (yard) this.work(k); else this.settleHome(k); }
      const at = s.want.at.clone();
      this.way[k] = null;
      s.teleport(at);
      if (l.face) s.heading = Math.atan2(l.face.x - at.x, l.face.z - at.z);
    }
  }

  /** Night: off to your cabin, in at the door and to its place by the hearth. False if there's no cabin to go to. */
  private toBed(k: number): boolean {
    const c = this.cabin, l = this.life[k];
    if (!c || !c.seats.length) return false;
    const seat = c.seats[k % c.seats.length].clone();
    l.mate = -1;
    l.face = c.hearth;
    const path = this.along(k, 0, c.way[0]) ?? [];
    if (!path.length) path.push(c.way[0]);
    // (Already indoors: straight across the floor.)
    this.go(k, seat, 'toBed', c.floor(this.spirits[k].pos.x, this.spirits[k].pos.z) > -1e9 ? null : [...path, ...c.way.slice(1).map((p) => p.clone()), seat.clone()]);
    return true;
  }

  /** Shovel `j` stood in the heap, blade down. */
  private stand(j: number) {
    const sh = this.shovels[j];
    this.heap.add(sh);
    // (In its foot on the print's side, the handle leaning out to whoever comes for it.)
    sh.position.set(j ? 0.7 : -0.7, 1.08, 1.2);
    sh.rotation.set(0.32, 0, j ? -0.1 : 0.12);
    this.fly[j] = null;
    this.loaded[j] = false;
    this.heap.updateMatrixWorld(true);
  }

  /** Shovels on their way between the heap and a hand (`grab`, `stow`): how far (0..1), over how long, and whose hand. */
  private fly: ({ t: number; secs: number; k: number; out: boolean } | null)[] = [];

  /** Shovel `j` moved along between where it stands in the heap and `k`'s hand. */
  private flyShovels(dt: number) {
    for (const [j, f] of this.fly.entries()) {
      if (!f) continue;
      const sh = this.shovels[j];
      f.t = Math.min(1, f.t + dt / f.secs);
      // Where it stands in the heap.
      this.heap.add(sh);
      const keep = this.fly[j];
      this.stand(j);
      this.fly[j] = keep;
      sh.updateWorldMatrix(true, false);
      sh.matrixWorld.decompose(v1, q, v2);
      this.spirits[f.k].handPose(v3, q2);
      const a = f.t * f.t * (3 - 2 * f.t), u = f.out ? a : 1 - a;
      sh.removeFromParent();
      sh.position.lerpVectors(v1, v3, u);
      sh.position.y += Math.sin(u * Math.PI) * 0.25;
      sh.quaternion.copy(q).slerp(q2, u);
      sh.updateMatrixWorld(true);
    }
  }

  /** `k` is done with its shovel: back in the heap. */
  private putDown(k: number) {
    const l = this.life[k];
    if (l.shovel < 0) return;
    this.spirits[k].take(null);
    this.stand(l.shovel);
    l.shovel = -1;
  }

  /** Off to the heap for a shovel (if there's one free). */
  private goDig(k: number): boolean {
    const d = this.digAt, l = this.life[k];
    if (!d) return false;
    const j = this.shovels.findIndex((_s, n) => !this.life.some((q) => q.shovel === n));
    if (j < 0) return false;
    l.shovel = j;
    l.loads = 8 + Math.floor(Math.random() * 9);
    l.mate = -1;
    const at = this.digSpot(j, true);
    l.face = new THREE.Vector3(d.pile.x, d.pile.y + 0.2, d.pile.z);
    this.go(k, at, 'toDig', this.along(k, this.nearest(d.pile), at));
    return true;
  }

  /** Where shovel `j`'s digger stands: at the heap, on the print's side of it; or at the print's lip. Side by side, not in each other's way. */
  private digSpot(j: number, heap: boolean): THREE.Vector3 {
    const d = this.digAt!, ux = d.edge.x - d.pile.x, uz = d.edge.z - d.pile.z, len = Math.hypot(ux, uz) || 1, side = (j ? 1 : -1) * (heap ? 0.7 : 1.05);
    const c = heap ? d.pile : d.edge, f = heap ? 1.95 : 0;
    return new THREE.Vector3(c.x + (ux / len) * f + (uz / len) * side, 0, c.z + (uz / len) * f - (ux / len) * side);
  }

  /** The heap, the shovels and what's on them, as they are now. */
  private drawDig() {
    this.heapB.begin();
    this.dirtB.begin();
    this.shovelB.begin();
    if (this.digAt) {
      this.heapB.push(this.heap.matrixWorld, WHITE);
      for (const [n, [lx, lz, sz]] of LOOSE.entries()) {
        v1.set(lx, 0, lz).applyMatrix4(this.heap.matrixWorld);
        v1.y = this.gy(v1.x, v1.z) + sz * 0.18;
        this.dirtB.push(m4.compose(v1, q.setFromEuler(e1.set(n, n * 2.3, 0)), v2.set(sz, sz * 0.7, sz * 0.9)), WHITE);
      }
      for (const [j, sh] of this.shovels.entries()) {
        this.shovelB.push(sh.matrixWorld, WHITE);
        if (this.loaded[j]) this.dirtB.push(this.clods[j].matrixWorld, WHITE);
      }
    }
    this.heapB.end();
    this.dirtB.end();
    this.shovelB.end();
  }

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
    // (Whoever was at something in its yard: that yard's gone.)
    for (const [k, l] of this.life.entries()) if (l.job?.yard.i === i) this.quit(k);
    this.things = this.things.filter((t) => t.yard !== i);
    this.yards[i] = null;
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
        q.rot.set(0, this.stackSlot(h, nb++, q.pos), 0);
        // (Boards lie with their length along x: all cut to much the same, so the stack has square ends.)
        q.size.x = Math.min(q.size.x, 2.3) * 0.5 + 1.15;
        q.size.z = 0.56;
      }
    }
    this.drawPieces();
    if (h.stack) this.layYard(i);
  }

  /** Where board number `nb` of house `h`'s stack lies (into `pos`), and which way it's turned: four across, layer on layer, each a hair askew, as stacked by hand. */
  private stackSlot(h: House, nb: number, pos: THREE.Vector3): number {
    const layer = Math.floor(nb / 4), col = nb % 4, side = h.doorX > 0 ? -1 : 1;
    this.world(h, side * (h.hw + 2.3) + (col - 1.5) * 0.62, ((layer * 7 + col * 3) % 5 - 2) * 0.09, pos);
    pos.y = h.stack!.y + 0.08 + layer * 0.135;
    return h.plot.rot + Math.PI / 2 + ((layer * 5 + col * 3) % 7 - 3) * 0.022;
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
    // You, back from away: they're found at it.
    let near = Infinity;
    for (const p of this.site.lane) near = Math.min(near, Math.hypot(p.x - player.x, p.z - player.z));
    if (near > 150) this.away = true;
    else if (this.away && near < 120) { this.away = false; this.busy(); }
    // (A shovel is only ever in the hand of someone at the digging.)
    for (const [k, l] of this.life.entries()) if (l.shovel >= 0 && (!this.calm || this.taken[k] || this.held.has(k) || !DIGGING.has(l.doing))) this.putDown(k);
    // (Nor is anyone at a chore who has been called off to something else.)
    for (const [k, l] of this.life.entries()) if (l.job && (!this.calm || this.taken[k] || this.held.has(k) || l.doing !== 'job')) this.quit(k);
    if (this.calm) this.mill(dt, player);
    this.dirt.update(dt);
    this.dust.update(dt);
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
      // Round the heap and the stacks of boards, not through them.
      if (this.digAt) this.shove(s.pos, this.digAt.pile, 1.5, s.want.at, dt);
      for (const h of this.houses) if (h.stack) this.shove(s.pos, h.stack, 1.75, s.want.at, dt);
      for (const y of this.yards) {
        if (!y) continue;
        this.shove(s.pos, y.cairnAt, 1.1, s.want.at, dt);
        // The sawhorse and the board on it: by one side or the other, never through.
        if (Math.abs(s.pos.x - y.horse.position.x) > 4 || Math.abs(s.pos.z - y.horse.position.z) > 4) continue;
        const b = this.local(y.h, s.pos.x, s.pos.z, this.l), dx = b.x - y.bx, need = WIDE / 2 + 0.36;
        if (Math.abs(dx) >= need || b.z < y.bz0 || b.z > y.bz1) continue;
        const to = this.local(y.h, s.want.at.x, s.want.at.z, this.l2), m = ((Math.sign(dx) || Math.sign(to.x - y.bx) || 1) * need - dx), c = Math.cos(y.h.plot.rot), sn = Math.sin(y.h.plot.rot);
        s.pos.x += c * m;
        s.pos.z -= sn * m;
      }
      // Nor through a house, whole or half built (its own it goes into by the door, and on to its bare footing).
      for (const [i, h] of this.houses.entries()) {
        if (!h.step || Math.abs(s.pos.x - h.plot.x) > 6 || Math.abs(s.pos.z - h.plot.z) > 6) continue;
        const d = this.life[k].doing;
        if (i === this.home[k] && (h.step === 1 || d === 'in' || d === 'inside' || d === 'out')) continue;
        // (On a ladder, and only then, it's up against the wall.)
        if (this.life[k].job?.kind === 'nail' && this.life[k].job!.yard.i === i && LADDER.has(this.life[k].job!.stage)) continue;
        const l = this.local(h, s.pos.x, s.pos.z, this.l), px = h.hw + 0.45 - Math.abs(l.x), pz = h.hd + 0.45 - Math.abs(l.z);
        if (px <= 0 || pz <= 0) continue;
        // Out by the nearer wall, and along it toward where it's going (or it would stand there pushing).
        const to = this.local(h, s.want.at.x, s.want.at.z, this.l2);
        let nx = 0, nz = 0, tx = 0, tz = 0;
        // (Where it's going is past the far wall: round by the nearer corner, and no changing its mind half way.)
        if (px < pz) { nx = (Math.sign(l.x) || 1) * px; tz = (to.x * l.x < 0 && Math.abs(to.z) < h.hd + 0.45 ? Math.sign(l.z) || 1 : Math.sign(to.z - l.z)) * 2.2 * dt; }
        else { nz = (Math.sign(l.z) || 1) * pz; tx = (to.z * l.z < 0 && Math.abs(to.x) < h.hw + 0.45 ? Math.sign(l.x) || 1 : Math.sign(to.x - l.x)) * 2.2 * dt; }
        const c = Math.cos(h.plot.rot), sn = Math.sin(h.plot.rot);
        s.pos.x += c * (nx + tx) + sn * (nz + tz);
        s.pos.z += -sn * (nx + tx) + c * (nz + tz);
      }
      this.eyes[k].copy(s.pos).y += EYE;
    }
    this.flyShovels(dt);
    this.drawDig();
    this.moveThings(dt);
    this.drawYards();
  }

  /** `pos` is kept `r` from `c`, on the flat; and if it's on its way `to` somewhere past it, it's slid round (or it would stand there pushing). */
  private shove(pos: THREE.Vector3, c: THREE.Vector3, r: number, to?: THREE.Vector3, dt = 0) {
    const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz);
    if (d >= r || d < 1e-4) return;
    pos.x = c.x + (dx / d) * r;
    pos.z = c.z + (dz / d) * r;
    if (!to || Math.hypot(to.x - pos.x, to.z - pos.z) < 0.6) return;
    const tx = -dz / d, tz = dx / d, way = Math.sign(tx * (to.x - pos.x) + tz * (to.z - pos.z)) || 1;
    pos.x += tx * way * 1.6 * dt;
    pos.z += tz * way * 1.6 * dt;
  }

  /** How high the stack of boards by house `h` stands (m above its foot), and its half size across and along (house-local). */
  private stackBox(h: House) {
    const more = this.yards[this.houses.indexOf(h)]?.extras.filter((t) => t).length ?? 0;
    return { top: Math.ceil((STACKED[h.step] + more) / 4) * 0.135 + 0.1, hx: 1.3, hz: 1.2 };
  }

  /** House-local (x, z) in the world, at height `y`. */
  private world(h: House, lx: number, lz: number, out: THREE.Vector3, y = 0) {
    const c = Math.cos(h.plot.rot), s = Math.sin(h.plot.rot);
    return out.set(h.plot.x + c * lx + s * lz, y, h.plot.z - s * lx + c * lz);
  }

  /** The ground for someone who lives at house `i`: up its step and on to its floor. */
  private floor(i: number, x: number, z: number): number {
    const h = this.houses[i], g = Math.max(this.gy(x, z), this.cabin?.floor(x, z) ?? -Infinity);
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

  /**
   * To work on a house being built again (its own, mostly; else a
   * neighbour's): a turn at the saw, on the ladder, or carrying in what
   * lies about. With all of those taken, it looks the job over.
   */
  private work(k: number) {
    const l = this.life[k], s = this.spirits[k];
    const yards = this.yards.filter((y): y is Yard => !!y), own = this.yards[this.home[k]];
    if (!yards.length) { this.settleHome(k); return; }
    const y = own && Math.random() < 0.65 ? own : yards[Math.floor(Math.random() * yards.length)];
    const kinds: Job['kind'][] = [];
    if (y.sawyer < 0) kinds.push('saw');
    if (y.ladder && y.nailer < 0) kinds.push('nail');
    const piece = this.life.filter((o) => o.job?.kind === 'haul' && o.job.yard === y).length < 2 ? this.debris(y, s.pos) : null;
    if (piece) kinds.push('haul');
    if (!kinds.length) { this.lookOver(k, y.h); return; }
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    l.mate = -1;
    l.job = { kind, yard: y, stage: '', t: 0, left: 2 + Math.floor(Math.random() * 3), seen: 0, n: 0, thing: null, piece: null };
    if (kind === 'saw') {
      y.sawyer = k;
      if (y.board) this.walk(k, 'to', y.sawAt, y.sawFace); else this.walk(k, 'toStack', y.fetchAt, y.h.stack!);
    } else if (kind === 'nail') {
      y.nailer = k;
      l.job.left = 1 + Math.floor(Math.random() * 2);
      this.walk(k, 'to', y.fetchAt, y.h.stack!);
    } else this.fetch(k, piece!);
  }

  /** Over to house `h`'s stack of boards or its footing, to stand and look at it (a hop, a nod, its arms out at the size of the job). */
  private lookOver(k: number, h: House) {
    const l = this.life[k];
    const atStack = Math.random() < 0.5, a = Math.random() * 6.283;
    const c = atStack ? h.stack! : new THREE.Vector3(h.plot.x, 0, h.plot.z), r = atStack ? 1.9 : Math.max(h.hw, h.hd) + 1.5;
    const at = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r);
    l.mate = -1;
    l.face = new THREE.Vector3(c.x, this.gy(c.x, c.z) + 0.4, c.z);
    this.go(k, at, 'work');
  }

  /** Something lying about of a house nobody has begun on, near enough to yard `y` to carry there (one of the few nearest `from`, and nobody else's). */
  private debris(y: Yard, from: THREE.Vector3): Piece | null {
    const c = y.h.stack!, mine = new Set(this.life.map((l) => l.job?.piece));
    const near = this.pieces.filter((p) => p.rest && !p.used && this.houses[p.house].step === 0 && !mine.has(p) && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 45);
    if (!near.length) return null;
    const d = (p: Piece) => Math.hypot(p.pos.x - c.x, p.pos.z - c.z) + 0.5 * Math.hypot(p.pos.x - from.x, p.pos.z - from.z);
    near.sort((a, b) => d(a) - d(b));
    return near[Math.floor(Math.random() * Math.min(4, near.length))];
  }

  /** Off to `piece`, to carry it in. */
  private fetch(k: number, piece: Piece) {
    const s = this.spirits[k], dx = s.pos.x - piece.pos.x, dz = s.pos.z - piece.pos.z, d = Math.hypot(dx, dz) || 1;
    this.life[k].job!.piece = piece;
    this.walk(k, 'toPiece', v1.set(piece.pos.x + (dx / d) * 0.6, 0, piece.pos.z + (dz / d) * 0.6), piece.pos);
  }

  /** On with the chore: walk to `at` (by the lane, if it's a way off) and be at `stage` of it there, turned to `face`. */
  private walk(k: number, stage: string, at: THREE.Vector3, face: THREE.Vector3) {
    const l = this.life[k], p = this.spirits[k].pos, to = at.clone();
    l.job!.stage = stage;
    l.face = face;
    this.go(k, to, 'job', Math.hypot(to.x - p.x, to.z - p.z) > 14 ? this.along(k, this.nearest(to), to) : null);
  }

  /** On with the chore where it stands: `stage` for `secs`, saying `g`. */
  private pause(k: number, stage: string, secs: number, g: Gesture | null, at?: THREE.Vector3) {
    const l = this.life[k], j = l.job!;
    j.stage = stage;
    j.t = secs;
    this.say(k, g, secs + 0.1, l.face, at);
  }

  private thing(yard: number, stone: boolean, pos: THREE.Vector3, quat: THREE.Quaternion, size: THREE.Vector3, tint: THREE.Color): Thing {
    const t: Thing = { stone, pos: pos.clone(), quat: quat.clone(), size: size.clone(), tint, yard, on: -1, flit: null };
    this.things.push(t);
    return t;
  }

  /** `t` goes to `to` (or with null, up on to the head of whoever has it) over `secs`, in a hop `arc` high. */
  private send(t: Thing, to: Pose | null, secs: number, arc: number) {
    t.flit = { p0: t.pos.clone(), q0: t.quat.clone(), s0: t.size.clone(), to, t: 0, secs, arc };
  }

  /** `k` bends to `t` and has it up on its head. */
  private lift(k: number, t: Thing, stage: string) {
    t.on = k;
    this.send(t, null, 0.45, 0.22);
    this.pause(k, stage, 0.5, 'stoop');
  }

  /** `k` bends and puts down what's on its head: into slot `idx` of `list`, which is at `pose` (whatever was there is under it now, and gone). */
  private setDown(k: number, pose: Pose, list: (Thing | null)[], idx: number, stage: string) {
    const j = this.life[k].job!, t = j.thing!, old = list[idx];
    if (old) this.things = this.things.filter((o) => o !== old);
    list[idx] = t;
    this.spirits[k].laden = false;
    t.on = -1;
    j.thing = null;
    j.piece = null;
    this.send(t, pose, 0.45, 0.15);
    this.pause(k, stage, 0.55, 'stoop');
  }

  /** A tool where it's kept. */
  private rest(t: Tool) {
    t.fly = null;
    t.obj.removeFromParent();
    t.obj.position.copy(t.pos);
    t.obj.quaternion.copy(t.quat);
    t.obj.updateMatrixWorld(true);
  }

  /** `k` reaches for tool `t` and has it (`out`), or puts it back where it's kept. */
  private reach(k: number, t: Tool, out: boolean, stage: string) {
    if (!out) this.spirits[k].take(null);
    t.fly = { k, t: 0, secs: 0.35, out };
    this.pause(k, stage, 0.5, null);
  }

  /** The board on `y`'s sawhorse, `len` long, its end `lead` past where it's cut. */
  private horsePose(y: Yard, len: number, lead: number): Pose {
    return { pos: y.horse.localToWorld(new THREE.Vector3(0, HORSE_TOP + THICK / 2, CUT_Z + lead - len / 2)), quat: new THREE.Quaternion().setFromAxisAngle(UP, y.h.plot.rot + Math.PI / 2), size: new THREE.Vector3(len, THICK, WIDE) };
  }

  /** Where the `idx`th offcut lies, under the end of the sawhorse. */
  private offcutSlot(y: Yard, idx: number): Pose {
    const pos = y.horse.localToWorld(new THREE.Vector3((idx % 3 - 1) * 0.3, 0, CUT_Z + 0.34 + ((idx * 7) % 4) * 0.09));
    pos.y = (this.ground ?? this.gy)(pos.x, pos.z) + THICK / 2 + Math.floor(idx / 3) * THICK;
    return { pos, quat: new THREE.Quaternion().setFromAxisAngle(UP, y.h.plot.rot + Math.PI / 2 + ((idx * 37) % 10 - 5) * 0.09), size: new THREE.Vector3(CUT, THICK, WIDE) };
  }

  /** Where the `idx`th stone of the pile lies: five round its foot, three on those, one on top. */
  private cairnSlot(y: Yard, idx: number, size: THREE.Vector3): Pose {
    const a = idx < 5 ? idx * 1.2566 : idx < 8 ? 0.6 + (idx - 5) * 2.094 : 0, r = idx < 5 ? 0.62 : idx < 8 ? 0.3 : 0;
    const pos = new THREE.Vector3(y.cairnAt.x + Math.cos(a) * r, 0, y.cairnAt.z + Math.sin(a) * r);
    pos.y = (idx < 5 ? (this.ground ?? this.gy)(pos.x, pos.z) : y.cairnAt.y + (idx < 8 ? 0.42 : 0.8)) + size.y * 0.3;
    return { pos, quat: new THREE.Quaternion().setFromEuler(e1.set(idx * 1.7, idx * 2.3, 0)) };
  }

  /** Where the `idx`th board carried in lies, on top of the stack (cut to the stack's length as it's put there). */
  private extraSlot(y: Yard, idx: number, size: THREE.Vector3): Pose {
    const pos = new THREE.Vector3(), yaw = this.stackSlot(y.h, STACKED[y.h.step] + idx, pos);
    return { pos, quat: new THREE.Quaternion().setFromAxisAngle(UP, yaw), size: new THREE.Vector3(Math.min(size.x, 2.3) * 0.5 + 1.15, 0.12, 0.56) };
  }

  /** Where a board is nailed up in `row` of the end wall, `crook` (rad) off the level. */
  private wallPose(y: Yard, row: number, crook: number): Pose {
    const h = y.h, c = Math.cos(h.plot.rot), s = Math.sin(h.plot.rot);
    const pos = this.world(h, -y.side * (h.hw + THICK / 2 - 0.01), h.hd * 0.3 - y.side * HAND, new THREE.Vector3(), y.footY + y.climb[row] + STRIKE);
    const along = new THREE.Vector3(s, 0, c), outward = new THREE.Vector3(-y.side * c, 0, y.side * s);
    const quat = new THREE.Quaternion().setFromRotationMatrix(m4.makeBasis(along, outward, new THREE.Vector3().crossVectors(along, outward)));
    return { pos, quat: quat.multiply(q2.setFromAxisAngle(UP, crook)) };
  }

  /** Where `k` is on `y`'s ladder, `up` m above its foot (into `out`). */
  private ladderAt(y: Yard, up: number, out: THREE.Vector3) {
    return this.world(y.h, -y.side * (y.h.hw + y.out * (1 - up / y.rise) + 0.36), y.h.hd * 0.3, out, y.footY + up);
  }

  /** `k` kept on its ladder, as high as it has climbed. */
  private onLadder(k: number) {
    const l = this.life[k], s = this.spirits[k], y = l.job!.yard, p = this.ladderAt(y, l.up, v1);
    s.pos.x = p.x;
    s.pos.z = p.z;
    s.want.at.copy(p);
    y.wallFace.y = p.y + 0.45;
  }

  /**
   * The yard of house `i`, as found: a board on the sawhorse with an end or
   * two off it already, a few cut boards and a few stones piled, and (once
   * there are walls) the ladder up.
   */
  private layYard(i: number) {
    const h = this.houses[i], p = h.plot, gy = this.ground ?? this.gy, side = h.doorX > 0 ? -1 : 1;
    const at = (lx: number, lz: number, up = 0) => { const v = this.world(h, lx, lz, new THREE.Vector3()); v.y = gy(v.x, v.z) + up; return v; };
    const r = (n: number) => hash01(i, n, this.seed, 1009);
    const tool = (): Tool => ({ obj: new THREE.Object3D(), pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fly: null });
    const hx = side * (h.hw + 2.3), hz = 3.7, zL = h.hd * 0.3;
    const horse = new THREE.Object3D();
    horse.position.copy(at(hx, hz));
    horse.rotation.y = p.rot;
    horse.updateMatrixWorld(true);
    const y: Yard = {
      i, h, side, horse, saw: tool(), mallet: tool(), tint: new THREE.Color(WALL_TINT[p.variant]).lerp(new THREE.Color(BIOME.cutWood), 0.45),
      sawAt: at(hx + side * 0.66, hz + CUT_Z - side * HAND), sawFace: at(hx, hz + CUT_Z - side * HAND, 0.3), fetchAt: at(hx + side * 1.0, 1.75),
      bx: hx, bz0: hz + CUT_Z + CUT - BOARD - 0.3, bz1: hz + CUT_Z + CUT + 0.3,
      board: null, len: BOARD - CUT * Math.floor(r(1) * 2), offcuts: [], nailed: [], extras: [], cairn: [], count: { off: 2, nail: 0, extra: 0, cairn: 3 },
      cairnAt: at(hx + side * 1.9, -2.4),
      ladder: null, footY: 0, out: 0, rise: 0, climb: [], wallFace: new THREE.Vector3(), sawyer: -1, nailer: -1,
    };
    this.yards[i] = y;
    // The saw: laid flat on the ground by the sawhorse, where whoever saws stands.
    y.saw.pos.copy(at(hx + side * 0.8, hz - 0.55, 0.012));
    y.saw.quat.setFromAxisAngle(UP, p.rot + Math.PI / 2).multiply(q2.setFromEuler(e1.set(0, 0, Math.PI / 2)));
    this.rest(y.saw);
    const on = this.horsePose(y, y.len, CUT);
    y.board = this.thing(i, false, on.pos, on.quat, on.size!, y.tint);
    for (let n = 0; n < 2; n++) { const o = this.offcutSlot(y, n); y.offcuts[n] = this.thing(i, false, o.pos, o.quat, o.size!, y.tint); }
    const grey = new THREE.Color(BIOME.stone);
    for (let n = 0; n < 3; n++) {
      const size = new THREE.Vector3(0.55 + r(10 + n) * 0.4, 0.4 + r(20 + n) * 0.25, 0.55 + r(30 + n) * 0.35), o = this.cairnSlot(y, n, size);
      y.cairn[n] = this.thing(i, true, o.pos, o.quat, size, grey);
    }
    if (h.step < 2) return;
    // The ladder: on the end wall away from the stack, a little forward of its middle (clear of the vent in the gable).
    const top = h.high - 0.12;
    y.footY = at(-side * (h.hw + 0.5), zL).y;
    y.rise = Math.max(0.6, p.y + top - y.footY);
    y.out = 0.2 * y.rise;
    for (let row = 0; row < 2; row++) { const c = y.rise - 0.3 - row * 0.36 - STRIKE; if (c >= 0.1 || !row) y.climb.push(Math.max(0, c)); }
    const foot = this.world(h, -side * (h.hw + y.out), zL, new THREE.Vector3(), y.footY), head = this.world(h, -side * (h.hw + 0.03), zL, new THREE.Vector3(), y.footY + y.rise);
    const up = head.clone().sub(foot), len = up.length(), across = new THREE.Vector3(Math.sin(p.rot), 0, Math.cos(p.rot));
    up.normalize();
    const ladder = new THREE.Object3D();
    ladder.position.copy(foot);
    ladder.quaternion.setFromRotationMatrix(m4.makeBasis(across, up, new THREE.Vector3().crossVectors(across, up)));
    ladder.scale.setScalar(len);
    ladder.updateMatrixWorld(true);
    y.ladder = ladder;
    y.wallFace.copy(this.world(h, -side * h.hw, zL, new THREE.Vector3(), y.footY + 0.45));
    // The mallet: on the ground by the ladder's foot.
    y.mallet.pos.copy(at(-side * (h.hw + y.out + 0.15), zL + 0.15 * len + 0.3, 0.075));
    y.mallet.quat.setFromAxisAngle(UP, p.rot).multiply(q2.setFromEuler(e1.set(0, 0, Math.PI / 2)));
    this.rest(y.mallet);
    // (One board up already, if there's room for two.)
    if (y.climb.length > 1) { const o = this.wallPose(y, 1, 0); y.nailed[1] = this.thing(i, false, o.pos, o.quat, new THREE.Vector3(BOARD - 3 * CUT, THICK, WIDE), y.tint); }
  }

  /** `k` is done with its chore, or called off it: tools back where they're kept, and anything on its head back where it came from. */
  private quit(k: number) {
    const l = this.life[k], j = l.job, s = this.spirits[k];
    if (!j) return;
    const y = j.yard;
    if (j.thing && j.thing.on === k) {
      this.things = this.things.filter((t) => t !== j.thing);
      if (j.piece) { j.piece.used = false; this.drawPieces(); }
    }
    for (const t of [y.saw, y.mallet]) {
      if (s.tool !== t.obj && t.fly?.k !== k) continue;
      if (s.tool === t.obj) s.take(null);
      this.rest(t);
    }
    if (y.sawyer === k) y.sawyer = -1;
    if (y.nailer === k) y.nailer = -1;
    s.laden = false;
    l.up = 0;
    l.job = null;
  }

  /** And on to the next thing: often another chore. */
  private done(k: number) {
    this.quit(k);
    if (!this.night() && Math.random() < 0.55) this.work(k);
    else if (Math.random() < 0.3) this.stroll(k);
    else this.goHome(k);
  }

  /** A turn at a chore, stage by stage (`Job`). */
  private chore(k: number, dt: number) {
    const s = this.spirits[k], l = this.life[k], j = l.job!, y = j.yard, h = y.h;
    const there = () => s.arrived || (l.t += dt) > 45;
    const wait = () => (j.t -= dt) <= 0;
    const more = () => --j.left > 0 && !this.night();
    const puff = (at: THREE.Vector3, n: number, size: number) => this.dust.emit(at, n, size, 0.6, undefined, { life: 0.5, rise: -1.6, drag: 1.4, up: 0.9 });
    switch (j.kind + ' ' + j.stage) {
      // ---- Carrying in what lies about: boards to the stack, stones to the pile.
      case 'haul toPiece': {
        const p = j.piece!;
        if (p.used) { this.done(k); break; }
        if (!there()) break;
        p.used = true;
        this.drawPieces();
        j.thing = this.thing(y.i, p.stone, p.pos, q.setFromEuler(p.rot), p.size, p.tint);
        this.lift(k, j.thing, 'lift');
        break;
      }
      case 'haul lift': {
        if (!wait()) break;
        s.laden = true;
        // To the near side of the pile it's for.
        const c = j.thing!.stone ? y.cairnAt : h.stack!, r = j.thing!.stone ? 1.3 : 2.0, dx = s.pos.x - c.x, dz = s.pos.z - c.z, d = Math.hypot(dx, dz) || 1;
        this.walk(k, 'carry', v1.set(c.x + (dx / d) * r, 0, c.z + (dz / d) * r), c);
        break;
      }
      case 'haul carry': {
        if (!there()) break;
        const t = j.thing!;
        if (t.stone) { const n = y.count.cairn++, idx = n < 9 ? n : 5 + ((n - 9) % 4); this.setDown(k, this.cairnSlot(y, idx, t.size), y.cairn, idx, 'set'); }
        else { const idx = y.count.extra++ % 8; this.setDown(k, this.extraSlot(y, idx, t.size), y.extras, idx, 'set'); }
        break;
      }
      case 'haul set': {
        if (!wait()) break;
        const p = more() ? this.debris(y, s.pos) : null;
        if (p) this.fetch(k, p); else this.done(k);
        break;
      }

      // ---- Sawing: a board from the stack on to the sawhorse, three ends off it, and what's left to the pile by the ladder.
      case 'saw toStack': {
        if (!there()) break;
        const yaw = this.stackSlot(h, STACKED[h.step] + y.extras.filter((t) => t).length, v1);
        j.thing = this.thing(y.i, false, v1, q.setFromAxisAngle(UP, yaw), v2.set(BOARD, THICK, WIDE), y.tint);
        this.lift(k, j.thing, 'take');
        break;
      }
      case 'saw take':
        if (!wait()) break;
        s.laden = true;
        this.walk(k, 'bring', y.sawAt, y.sawFace);
        break;
      case 'saw bring': {
        if (!there()) break;
        const t = j.thing!;
        s.laden = false;
        t.on = -1;
        j.thing = null;
        y.board = t;
        y.len = BOARD;
        this.send(t, this.horsePose(y, BOARD, CUT), 0.45, 0.12);
        this.pause(k, 'lay', 0.6, 'stoop');
        break;
      }
      case 'saw lay':
        if (wait()) this.reach(k, y.saw, true, 'grab');
        break;
      case 'saw to':
        if (!there()) break;
        if (y.board) this.reach(k, y.saw, true, 'grab'); else this.walk(k, 'toStack', y.fetchAt, h.stack!);
        break;
      case 'saw grab':
      case 'saw shift':
        if (!wait()) break;
        y.saw.fly = null;
        s.take(y.saw.obj);
        j.seen = s.strokes;
        this.pause(k, 'saw', 4 + Math.random() * 1.5, 'saw');
        break;
      case 'saw saw': {
        const cut = y.horse.localToWorld(v3.set(0, HORSE_TOP + THICK, CUT_Z));
        if (s.strokes !== j.seen) { j.seen = s.strokes; puff(cut, 2, 0.07); }
        if (!wait()) break;
        // Through: the end drops off, on to the others.
        const b = y.board!, idx = y.count.off++ % 6, old = y.offcuts[idx];
        y.len -= CUT;
        b.pos.copy(this.horsePose(y, y.len, 0).pos);
        b.size.x = y.len;
        if (old) this.things = this.things.filter((o) => o !== old);
        const off = y.offcuts[idx] = this.thing(y.i, false, y.horse.localToWorld(v1.set(0, HORSE_TOP + THICK / 2, CUT_Z + CUT / 2)), b.quat, v2.set(CUT, THICK, WIDE), b.tint);
        this.send(off, this.offcutSlot(y, idx), 0.36, 0);
        puff(cut, 6, 0.11);
        this.pause(k, 'cut', 0.7, 'nod');
        break;
      }
      case 'saw cut':
        if (!wait()) break;
        // The board along for the next one; or it's short enough, and the saw's put by.
        if (y.len > 1) { this.send(y.board!, this.horsePose(y, y.len, CUT), 0.4, 0); this.pause(k, 'shift', 0.55, 'stoop'); }
        else this.reach(k, y.saw, false, 'stow');
        break;
      case 'saw stow':
        if (!wait()) break;
        j.thing = y.board!;
        y.board = null;
        this.lift(k, j.thing, 'liftRest');
        break;
      case 'saw liftRest':
        if (!wait()) break;
        s.laden = true;
        this.walk(k, 'carryRest', y.fetchAt, h.stack!);
        break;
      case 'saw carryRest': {
        if (!there()) break;
        // (Cut to length: on to the stack with it.)
        const idx = y.count.extra++ % 8, o = this.extraSlot(y, idx, j.thing!.size);
        this.setDown(k, { pos: o.pos, quat: o.quat }, y.extras, idx, 'setRest');
        break;
      }
      case 'saw setRest':
        if (!wait()) break;
        // (It's at the stack already: the next one up from it.)
        if (more()) { j.stage = 'toStack'; l.t = 99; } else this.done(k);
        break;

      // ---- Nailing up: a cut board off the stack, round to the ladder and up it with the mallet, on to the wall, and a good long while knocking it home.
      case 'nail to': {
        if (!there()) break;
        const yaw = this.stackSlot(h, STACKED[h.step] + y.extras.filter((t) => t).length, v1);
        j.thing = this.thing(y.i, false, v1, q.setFromAxisAngle(UP, yaw), v2.set(BOARD - 3 * CUT, THICK, WIDE), y.tint);
        this.lift(k, j.thing, 'lift');
        break;
      }
      case 'nail lift':
        if (!wait()) break;
        s.laden = true;
        this.walk(k, 'toLadder', this.ladderAt(y, 0, v1), y.wallFace);
        break;
      case 'nail toLadder':
        if (there()) this.reach(k, y.mallet, true, 'grab');
        break;
      case 'nail grab':
        if (!wait()) break;
        y.mallet.fly = null;
        s.take(y.mallet.obj);
        j.n = y.count.nail++ % y.climb.length;
        j.stage = 'climb';
        break;
      case 'nail climb': {
        const top = y.climb[j.n];
        l.up = Math.min(top, l.up + dt * 0.9);
        this.onLadder(k);
        if (l.up < top) break;
        // Up: the board off its head and on to the wall, not quite straight.
        const t = j.thing!, old = y.nailed[j.n];
        if (old) this.things = this.things.filter((o) => o !== old);
        y.nailed[j.n] = t;
        s.laden = false;
        t.on = -1;
        this.send(t, this.wallPose(y, j.n, j.n % 2 ? -0.3 : 0.3), 0.4, 0.05);
        this.pause(k, 'place', 0.55, null);
        break;
      }
      case 'nail place':
        this.onLadder(k);
        if (!wait()) break;
        j.seen = s.strokes;
        j.t = KNOCKS;
        j.stage = 'hammer';
        this.say(k, 'hammer', 60, l.face);
        break;
      case 'nail hammer': {
        this.onLadder(k);
        if (s.strokes === j.seen) break;
        // A knock: it's a little straighter.
        j.seen = s.strokes;
        j.t--;
        const t = j.thing!;
        t.quat.copy(this.wallPose(y, j.n, (j.n % 2 ? -0.3 : 0.3) * Math.max(0, j.t - (KNOCKS - 6)) / 6).quat);
        puff(v3.copy(t.pos).addScaledVector(v1.subVectors(s.pos, t.pos).setY(0).normalize(), 0.1), 3, 0.06);
        if (j.t > 0) break;
        j.thing = null;
        this.pause(k, 'rest', 0.5, 'nod');
        break;
      }
      case 'nail rest':
        this.onLadder(k);
        if (wait()) j.stage = 'down';
        break;
      case 'nail down':
        l.up = Math.max(0, l.up - dt * 1.1);
        this.onLadder(k);
        if (l.up <= 0) this.reach(k, y.mallet, false, 'stow');
        break;
      case 'nail stow':
        if (!wait()) break;
        if (more()) this.walk(k, 'to', y.fetchAt, h.stack!); else this.done(k);
        break;
      default:
        this.done(k);
    }
  }

  /** Things on their way somewhere or on somebody's head, and tools between a hand and where they're kept. */
  private moveThings(dt: number) {
    for (const t of this.things) {
      const f = t.flit;
      if (!f && t.on < 0) continue;
      if (t.on >= 0) {
        // (A board lies along the way it's going.)
        this.spirits[t.on].overhead(v1, q);
        v1.y += t.size.y * (t.stone ? 0.42 : 0.5);
        if (!t.stone) q.multiply(QUARTER);
      }
      if (!f) { t.pos.copy(v1); t.quat.copy(q); continue; }
      f.t = Math.min(1, f.t + dt / f.secs);
      const a = f.t * f.t * (3 - 2 * f.t);
      t.pos.lerpVectors(f.p0, f.to ? f.to.pos : v1, a);
      t.pos.y += Math.sin(a * Math.PI) * f.arc;
      t.quat.copy(f.q0).slerp(f.to ? f.to.quat : q, a);
      if (f.to?.size) t.size.lerpVectors(f.s0, f.to.size, a);
      if (f.t >= 1) t.flit = null;
    }
    for (const y of this.yards) {
      if (!y) continue;
      for (const t of [y.saw, y.mallet]) {
        const f = t.fly;
        if (!f) continue;
        f.t = Math.min(1, f.t + dt / f.secs);
        this.spirits[f.k].handPose(v3, q2);
        const a = f.t * f.t * (3 - 2 * f.t), u = f.out ? a : 1 - a;
        t.obj.removeFromParent();
        t.obj.position.lerpVectors(t.pos, v3, u);
        t.obj.position.y += Math.sin(u * Math.PI) * 0.12;
        t.obj.quaternion.copy(t.quat).slerp(q2, u);
        t.obj.updateMatrixWorld(true);
        if (f.t < 1) continue;
        if (f.out) { t.fly = null; this.spirits[f.k].take(t.obj); } else this.rest(t);
      }
    }
  }

  /** The yards as they are now. */
  private drawYards() {
    const all = [this.plankB, this.rockB, this.horseB, this.ladderB, this.sawB, this.malletB];
    for (const b of all) b.begin();
    for (const y of this.yards) {
      if (!y) continue;
      this.horseB.push(y.horse.matrixWorld, WHITE);
      this.sawB.push(y.saw.obj.matrixWorld, WHITE);
      if (!y.ladder) continue;
      this.ladderB.push(y.ladder.matrixWorld, WHITE);
      this.malletB.push(y.mallet.obj.matrixWorld, WHITE);
    }
    for (const t of this.things) (t.stone ? this.rockB : this.plankB).push(m4.compose(t.pos, t.quat, t.size), t.tint);
    for (const b of all) b.end();
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
      if (this.taken[k] || this.held.has(k)) continue;
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
      // Night: indoors. Into its own house if that's whole, else to your cabin's hearth; and out again in the morning.
      const night = this.night();
      // (Whatever's on its head is put down first, and nobody goes to bed off a ladder.)
      if (night && l.doing !== 'toBed' && l.doing !== 'bed' && l.doing !== 'in' && l.doing !== 'inside' && l.doing !== 'chat' && l.doing !== 'meet' && !(l.job && (l.job.thing?.on === k || l.up > 0))) {
        this.putDown(k);
        if (!h.smashed) { const inside = this.world(h, h.doorX, h.hd - 0.85, new THREE.Vector3()); this.go(k, inside, 'in', [...(this.along(k, this.laneAt[k], h.door) ?? [h.door.clone()]), inside]); continue; }
        if (this.toBed(k)) continue;
      }
      switch (l.doing) {
        case 'toBed':
          if (s.arrived || (l.t += dt) > 120) { l.doing = 'bed'; s.want.pose = 'sit'; s.want.face = l.face; }
          break;
        case 'bed':
          if (night) break;
          // Morning: out at the door and home, to get on with the day.
          { const c = this.cabin!; l.face = this.mid; this.go(k, l.spot.clone(), 'back', [c.way[2].clone(), c.way[1].clone(), c.way[0].clone(), ...(this.along(k, this.laneAt[k], l.spot) ?? [l.spot.clone()])]); }
          break;
        case 'home': {
          // Now and then, a wave across the way to whoever else is out on their step (who waves back).
          if (idle && (l.hailT -= dt) <= 0) {
            l.hailT = 9 + Math.random() * 14;
            const out = this.spirits.map((_q, m) => m).filter((m) => m !== k && !this.taken[m] && !this.held.has(m) && this.life[m].doing === 'home' && this.life[m].gt <= 0 && this.eyes[m].distanceTo(s.pos) < 32);
            if (out.length) {
              const m = out[Math.floor(Math.random() * out.length)];
              this.say(k, 'wave', 1.5, this.eyes[m]);
              this.life[m].due = { t: 0.8, g: 'wave', secs: 1.3, face: this.eyes[k] };
            }
          }
          if ((l.t -= dt) > 0 || !idle) break;
          const r = Math.random();
          // Its house is being built again: mostly, it's at that.
          if (this.yards.some((y) => y) && r < (h.stack ? 0.6 : 0.45)) { this.work(k); break; }
          // A print's being filled in: a turn with a shovel.
          if (this.digAt && Math.random() < 0.65 && this.goDig(k)) break;
          if (r < 0.3 && !h.smashed) {
            // Indoors for a bit: to the door and in.
            const inside = this.world(h, h.doorX, h.hd - 0.85, new THREE.Vector3());
            this.go(k, inside, 'in', [h.door.clone(), inside]);
          } else if (r < 0.72) {
            const free = this.spirits.map((_q, m) => m).filter((m) => m !== k && !this.taken[m] && !this.held.has(m) && this.life[m].doing === 'home' && this.life[m].spot.distanceTo(l.spot) < 70);
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
        case 'job':
          if (l.job) this.chore(k, dt); else this.goHome(k);
          break;
        case 'toDig':
          // At the heap: its shovel out of it (or, back for more, in again), and a few good digs.
          if (!this.digAt) { this.goHome(k); break; }
          if (s.arrived || (l.t += dt) > 60) {
            const sh = this.shovels[l.shovel];
            if (!s.tool) {
              // Its shovel is stood in the heap in front of it: a hand out for it, and it's pulled free.
              l.doing = 'grab';
              l.t = 0.75;
              sh.updateWorldMatrix(true, false);
              this.say(k, 'point', 0.8, l.face, new THREE.Vector3(0, 0.1, 0).applyMatrix4(sh.matrixWorld));
            } else if (l.loads <= 0) {
              // Enough: the shovel back in the heap where it was.
              s.take(null);
              this.fly[l.shovel] = { t: 0, secs: 0.45, k, out: false };
              l.doing = 'stow';
              l.t = 0.6;
              this.say(k, 'point', 0.5, l.face, new THREE.Vector3(0, 0.1, 0).applyMatrix4(this.heap.matrixWorld));
            } else {
              l.doing = 'scoop';
              l.t = 1.3 + Math.random() * 0.6;
              this.say(k, 'dig', l.t + 0.2, l.face);
            }
          }
          break;
        case 'grab': {
          if (!this.digAt) { this.goHome(k); break; }
          const was = l.t;
          l.t -= dt;
          if (was > 0.4 && l.t <= 0.4) this.fly[l.shovel] = { t: 0, secs: 0.38, k, out: true };
          if (l.t > 0) break;
          this.fly[l.shovel] = null;
          s.take(this.shovels[l.shovel]);
          l.doing = 'scoop';
          l.t = 1.3 + Math.random() * 0.6;
          this.say(k, 'dig', l.t + 0.2, l.face);
          break;
        }
        case 'stow':
          if ((l.t -= dt) > 0) break;
          this.putDown(k);
          if (Math.random() < 0.3) this.stroll(k); else this.goHome(k);
          break;
        case 'scoop':
          if (!this.digAt) { this.goHome(k); break; }
          if ((l.t -= dt) > 0) break;
          // A shovelful: over to the lip of the print with it.
          this.loaded[l.shovel] = true;
          l.face = this.digAt.into;
          this.go(k, this.digSpot(l.shovel, false), 'carry');
          break;
        case 'carry':
          if (!this.digAt) { this.goHome(k); break; }
          if (s.arrived || (l.t += dt) > 15) {
            l.doing = 'toss';
            l.t = 0.7;
            this.say(k, 'toss', 0.45, this.digAt.into);
          }
          break;
        case 'toss': {
          if (!this.digAt) { this.goHome(k); break; }
          l.t -= dt;
          if (l.t < 0.5 && this.loaded[l.shovel]) {
            // And in it goes: off the blade, out over the hollow.
            this.loaded[l.shovel] = false;
            v1.set(0, -BLADE, 0.05).applyMatrix4(this.shovels[l.shovel].matrixWorld);
            v2.subVectors(this.digAt.into, v1).setY(0).normalize().multiplyScalar(-11);
            this.dirt.emit(v1, 8, 0.26, 0.7, v2, { life: 0.75, rise: -3.2, drag: 0.6, up: 1.6 });
            this.onToss?.();
            l.loads--;
          }
          if (l.t > 0) break;
          // Back to the heap: for more, or to leave the shovel there.
          l.face = new THREE.Vector3(this.digAt.pile.x, this.digAt.pile.y + 0.2, this.digAt.pile.z);
          this.go(k, this.digSpot(l.shovel, true), 'toDig');
          break;
        }
        case 'look':
          if ((l.t -= dt) <= 0 && idle) { if (this.yards.some((y) => y) && Math.random() < (h.stack ? 0.85 : 0.5)) this.work(k); else if (Math.random() < 0.35) this.stroll(k); else this.goHome(k); }
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
          if (night && !h.smashed) break;
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
  private l2 = { x: 0, z: 0 };

  /** The roof under a foot circle (you can land and stand on one), at most `step` above the feet. */
  surface(x: number, z: number, feetY: number, r: number, step: number): number {
    // The heap of earth: a low cone, walked up like any hump.
    if (this.digAt) {
      const p = this.digAt.pile, d = Math.hypot(x - p.x, z - p.z);
      if (d < 1.3) { const y = p.y + 0.72 * (1 - d / 1.3); if (y <= feetY + step) return y; }
    }
    // A stack of boards: its flat top.
    for (const h of this.houses) {
      if (!h.stack || Math.abs(x - h.stack.x) > 3 || Math.abs(z - h.stack.z) > 3) continue;
      const b = this.stackBox(h), l = this.local(h, x, z, this.l), cx = this.local(h, h.stack.x, h.stack.z, this.l2).x, y = h.stack.y + b.top;
      if (Math.abs(l.x - cx) < b.hx + r * 0.5 && Math.abs(l.z) < b.hz + r * 0.5 && y <= feetY + step) return y;
    }
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
    // The piles of stones: round them.
    for (const y of this.yards) {
      if (!y || pos.y > y.cairnAt.y + 0.9) continue;
      const dx = pos.x - y.cairnAt.x, dz = pos.z - y.cairnAt.z, d = Math.hypot(dx, dz), need = 0.75 + r;
      if (d >= need || d < 1e-4) continue;
      pos.x += (dx / d) * (need - d);
      pos.z += (dz / d) * (need - d);
      const vn = (vel.x * dx + vel.z * dz) / d;
      if (vn < 0) { vel.x -= (dx / d) * vn; vel.z -= (dz / d) * vn; }
    }
    // The stacks of boards: solid from the side.
    for (const h of this.houses) {
      if (!h.stack || Math.abs(pos.x - h.stack.x) > 4 || Math.abs(pos.z - h.stack.z) > 4) continue;
      const b = this.stackBox(h);
      if (pos.y > h.stack.y + b.top - 0.1) continue;
      const l = this.local(h, pos.x, pos.z, this.l), cx = this.local(h, h.stack.x, h.stack.z, this.l2).x;
      const px = b.hx + r - Math.abs(l.x - cx), pz = b.hz + r - Math.abs(l.z);
      if (px <= 0 || pz <= 0) continue;
      let nx = 0, nz = 0;
      if (px < pz) nx = Math.sign(l.x - cx) || 1; else nz = Math.sign(l.z) || 1;
      const c = Math.cos(h.plot.rot), s = Math.sin(h.plot.rot), wx = c * nx + s * nz, wz = -s * nx + c * nz, depth = Math.min(px, pz);
      pos.x += wx * depth;
      pos.z += wz * depth;
      const vn = vel.x * wx + vel.z * wz;
      if (vn < 0) { vel.x -= wx * vn; vel.z -= wz * vn; }
    }
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
