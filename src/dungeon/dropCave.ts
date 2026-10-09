import * as THREE from 'three';
import { hashInt } from '../core/rng';
import { DUNGEON_U, makeDungeonMaterial, makeLanternMaterial, makePortalMaterial, makeSolidMaterial, U } from '../gfx/materials';
import type { Mob } from '../mobs/types';
import type { Body } from '../player/movement';
import type { Sfx } from '../story/audio';
import { Arm } from '../story/beacons';
import { bubbleCanvas, chuteHintCanvas, climbHintCanvas, tex } from '../story/icons';
import { Billboard } from '../story/overlay';
import type { DungeonSite } from '../world/worldgen';
import { makeDarkLight } from './darkLight';
import { BURROW, CAVERN_R, DropLayout, over, PIT_HALF } from './dropPlan';
import { buildDropRock } from './dropShell';
import { ARM_R, LIFT_R } from './layout';
import { buildCaps, buildLanterns, buildShell } from './shell';

// The fourth dungeon, inside: the Drop. Its own scene, as the other three
// are, and let down into and lifted out of the same way. Its plan is drawn at
// the top of dropPlan.ts.
//
// Where the others are puzzles, this one is done with your hands. The way in
// ends at a lip, very high up in a great dark cavern; across it, level with
// you, a lit doorway and the dungeon's light in it. Under you there is no
// floor: below the lip nothing of the rock is seen that a lantern isn't on
// (`uDarkY`), and dust and grit come up past you out of the dark (`Dust`).
//
// The way is down: six pillars with flat tops, each lower than the last, to
// be landed on with the parachute, one after another, and then a ledge in the
// cavern's wall, the mouth of a burrow. A lantern wakes on the one you're to
// land on next, a moment after you've earned it (the first as you come to
// the lip), and the one before the one you stand on goes out: two are ever
// alight, where you are and where you're going.
//
// A wind blows up out of the dark the whole time. Drop past the lit top and
// it has you: it fills the parachute and carries you, hands off, back up to
// the lip, and blows out every lantern but the first. So a miss costs the
// whole way down again, and nothing else. (Once you've made the ledge it
// still takes anyone who falls, since there's nowhere to fall to, but the
// way down is done: `down`.)
//
// In from the ledge is the den, and the woolly wurm asleep in it, who clings
// to anything. She is glad of you, and she's yours. The den is a chimney:
// ride her straight up its face (`climbTop`), 172 m, and from the top two
// straight ways lead round to the far way and the light. Taking it ends the
// dungeon as the others end.

export interface DropDeps {
  body: Body;
  sfx: Sfx;
  /** Switch the explorer's movement mode ('carried' while held, 'walk' after). */
  setMode(m: string): void;
  puff(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** The cave's wurm, at `at` (she lives by the cave's floor and walls). */
  adopt(at: THREE.Vector3): Mob | null;
  /** Is this a touch screen (which press the parachute thought shows). */
  touch(): boolean;
  saveKey: string;
}

/** How far under the ring it lies (m). */
const DEPTH = 60;
/** Being let down, let go of, reached for and lifted (s): as dungeon 1. */
const LOWER = 1.6, LET_GO = 0.5, REACH = 0.5, LIFT = 0.75;
const ARM = 1.4;
const STEP = 0.5, LEDGE = 0.9;
// (Wider than the others': she can't sidestep, and comes at the light on whatever line she topped out on.)
const TAKE_R = 3.6;
const WAKE_R = 12, WAKE = 0.7;
/** Taking the light: how long the gladness lasts (s) and when its hops come. */
const WIN = 4.3, WIN_HOPS = [0.5, 1.35, 2.2], WIN_VEIL = 0.9;
/** How far below the lit top you may drop before the wind has you (m). */
const MISS = 4;
/** The wind's ride: how fast it lifts (m/s), carries you across to the lip, and how high over the lip it holds you. */
const RISE = 44, CARRY = 15, OVER = 4.5;
/** The cavern waking: how long the dark takes to go down under the ledge (s), and how long after one another its lanterns wake, the lowest first. */
const WAKE_ALL = 5.5, WAKE_STEP = 0.55;
/** A lantern wakes this long after you've earned it (s). */
const PAUSE = 0.9;
/** Where it sets you down: this far back from the lip's edge (m). */
const SET_BACK = 5;
/** How near the wurm you come before she wakes (m), and how long she's glad for (s). */
const MEET_R = 7.5, GLAD = 2.8;
/** The parachute thought: how long each of its frames holds (s), as dungeon 1's. */
const HINT_HOLD = [0.7, 0.36, 0.42, 1.3];
/** Stood on a top this long without going on (s), she thinks of the parachute again. */
const HESITATE = 12;
/** She comes to you if you've been left on another level from her this long (s). */
const STRAND = 2.5;

/** How the frame is finished in here: dark as the others are dark, but moss green. Never black. */
export const DROP_LOOK = {
  fog: new THREE.Color('#0f1c15'),
  outline: new THREE.Color('#0b1510'),
  tint: new THREE.Color('#86a07e'),
  tintAmt: 0.5,
  lift: 0.03,
  // (Thin air: the far doorway is 150 m off and wants seeing from the lip, and the tops from one another.)
  air: { density: 0.006, start: 16, bands: 8, max: 0.8 },
  lit: new THREE.Color('#f6fbe8'),
  mid: new THREE.Color('#bcd0ac'),
  shade: new THREE.Color('#5f7d62'),
  dark: [new THREE.Color('#a9c79d'), new THREE.Color('#7a9a78'), new THREE.Color('#536f58')],
  near: [new THREE.Color('#fbfff0'), new THREE.Color('#dcebc8'), new THREE.Color('#a9c2a0')],
  dir: new THREE.Vector3(0.3, 0.86, 0.4).normalize(),
  /** The flat veil across the cut between above and below. */
  cut: '#0f1c15',
  /** What isn't seen: the rock below the lip that no lantern is on. */
  unseen: new THREE.Color('#0c1711'),
};
/** Its rock: a pale lichen floor, moss-dark walls. */
const DROP_ROCK = {
  cFloor: '#e3ead2', cFloor2: '#cddabc', cWallA: '#5d7a5f', cWallB: '#4f6b54', cWallC: '#6c8a6b', cCeil: '#3b5340',
  cMark: '#f4fbe6', cMarkDark: '#16261b', cWarm: '#e6b8ff', uWarmFlat: 0.85,
};

type Phase = 'lower' | 'letgo' | 'reach' | 'lift';

const v = new THREE.Vector3(), w = new THREE.Vector3();
const ss = THREE.MathUtils.smoothstep;

export class DropCave {
  readonly scene = new THREE.Scene();
  readonly overlay = new THREE.Scene();
  readonly layout: DropLayout;
  readonly origin: THREE.Vector3;
  readonly facing: number;
  readonly look = DROP_LOOK;
  inside = false;
  onLeft: (() => void) | null = null;
  onWon: (() => void) | null = null;
  /** You have the dungeon's light. */
  taken = false;
  /** You've made the ledge: the way down is done (a fall after this costs you nothing but the ride up). Saved. */
  down = false;
  /** The wurm is yours. Saved. */
  yours = false;
  /** You've had the parachute thought, and jumped. Saved. */
  hinted = false;
  /** You've been up a wall on her. Saved. */
  climbed = false;
  /** You've ridden her out on to the ledge: the cavern has woken (every lantern, and the dark gone down under the ledge). Saved. */
  woken = false;
  /** How long since it began to (s). */
  private wakeT = 0;
  /** The wurm. */
  she: Mob | null = null;
  /** The top you're to land on next (this time down): `tops.length` once you've made the ledge. */
  target = 0;
  /** The wind has you. */
  caught = false;
  readonly lit: boolean[];
  readonly buildMs: { plan: number; mesh: number };
  private caughtT = 0;
  /** What's left of the pause before the lantern you're to land by wakes (s). */
  private lightT = 0;
  /** You've come to the lip, this time down (the first lantern wakes). */
  private arrived = false;
  /** How hard it's blowing, for the ear (0..1), eased. */
  private gust = 0;
  private win = -1;
  private glad = 0;
  private strand = 0;
  private heart = new Billboard(tex(bubbleCanvas('heart')), 1.05, 52);
  private thought = new Billboard(tex(chuteHintCanvas(0, false)), 1.6, 88);
  private thoughtA = 0;
  private thoughtT = 0;
  /** How long you've stood on a top, the next one lit and waiting (s). */
  private idle = 0;
  private cheer = 0;
  private root = new THREE.Group();
  private cos: number;
  private sin: number;
  private seq: { phase: Phase; t: number; from: THREE.Vector3 } | null = null;
  private armed = false;
  private arms: Arm[];
  private ember: THREE.Mesh;
  private emberAt = new THREE.Vector3();
  private time = 0;
  private camK = 1;
  private top: THREE.Vector3;
  private litK: Float32Array;
  private lanternGeo: THREE.BufferGeometry;
  private lanternRanges: [number, number][];
  private lanternAt: THREE.Vector3[];
  /** The ladder up the far face: which rung each lantern is of (-1: none), and how bright its turn in the light running up it makes it just now (0..1; 1 for every other lantern). */
  private rung: number[];
  private wave: Float32Array;
  /** Which lanterns the cave lights itself (the tops', the pit floor's): the rest wake as you come by. */
  private own: boolean[];
  private glowAt: THREE.Vector3[];
  private glowD: Float32Array;
  private glowR: Float32Array;
  private glowOrder: number[];
  private inLight = 0;
  private rideK = 0;
  /** Where the wind sets you down, and where it holds you over the pit on the way (the world). */
  private setDown: THREE.Vector3;
  private hover: THREE.Vector3;
  private wind = new THREE.Vector3();
  /** You're on her (what `collide` goes by at the ledge's rim). */
  private riding = false;
  private dust: Dust;

  constructor(site: DungeonSite, seed: number, groundY: number, private d: DropDeps) {
    const turn = (Math.PI * 2) / 9;
    this.facing = 0.2 + ((hashInt(7, 13, seed, 964) % 9) + 0.5) * turn;
    this.cos = Math.cos(this.facing);
    this.sin = Math.sin(this.facing);
    this.origin = new THREE.Vector3(site.x, groundY - DEPTH, site.z);
    const t0 = performance.now();
    const L = (this.layout = new DropLayout(seed ^ 0x4d7c15));
    const t1 = performance.now();
    this.top = this.origin.clone().setY(this.origin.y + L.rooms[0].clear);
    this.root.position.copy(this.origin);
    this.root.rotation.y = -this.facing;
    this.root.updateMatrixWorld();
    const add = <T extends THREE.Material>(g: THREE.BufferGeometry, m: T) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      this.root.add(mesh);
      return mesh;
    };
    add(buildShell(L), makeDungeonMaterial(true, DROP_ROCK));
    add(buildDropRock(L, {
      column: '#3f5a45', stone: '#8fa98a', stoneBig: '#7c977a', made: '#b4c8a6', sconce: '#bfd0b0', stub: '#8ea68a',
      spike: '#7d9a7c', spikeDown: '#56715a', kerb: '#eef6dc', stalk: '#e6efd6', pillar: '#7c977a', top: '#eaf2d8', band: '#33503c', ring: '#8fa98a',
    }), makeDungeonMaterial(false, DROP_ROCK));
    add(buildCaps(L), makeSolidMaterial('#d6ffcf', 0.5, { keep: 1 }));
    add(new THREE.CircleGeometry(site.r - 2.4, 56).rotateX(Math.PI / 2).translate(0, L.rooms[0].clear - 0.06, 0), makePortalMaterial(site.r - 2.4, { a: '#5f8a66', b: '#9cc49a', lip: '#f0ffe8' }));
    this.ember = makeDarkLight(0.55).mesh;
    this.root.add(this.ember);
    this.ember.position.set(L.ember.x, L.ember.y, L.ember.z);
    const lanterns = buildLanterns(L);
    this.lanternGeo = lanterns.geometry;
    this.lanternRanges = lanterns.ranges;
    add(this.lanternGeo, makeLanternMaterial({ dark: '#2a4232', glow: '#fff3d0', ink: '#14241a', lid: '#bcd2b0' }));
    this.lanternAt = L.lanterns.map((o) => this.world(o.x, o.y + 0.4, o.z));
    this.lit = L.lanterns.map(() => false);
    this.litK = new Float32Array(L.lanterns.length);
    this.own = L.lanterns.map((_, i) => L.tops.some((o) => o.lantern === i) || L.ledgeLanterns.includes(i) || L.climbLanterns.includes(i));
    this.rung = L.lanterns.map((_, i) => { const k = L.climbLanterns.indexOf(i); return k < 0 ? -1 : k >> 1; });
    this.wave = new Float32Array(L.lanterns.length).fill(1);
    try {
      const sv = JSON.parse(localStorage.getItem(`embla.dungeon4.${d.saveKey}`) ?? '{}');
      this.taken = !!sv.taken;
      this.yours = !!sv.yours || this.taken;
      this.down = !!sv.down || this.yours;
      this.hinted = !!sv.hinted || this.down;
      this.climbed = !!sv.climbed || this.taken;
      this.woken = !!sv.woken || this.taken;
      if (this.woken) this.wakeT = 99;
      for (const i of (sv.lit ?? []) as number[]) if (i < this.lit.length && !this.own[i]) this.wake(i, true);
    } catch { /* no storage: nothing has happened yet */ }
    for (const i of L.beacons) this.wake(i, true);

    // (One more than the plan's: a small light that goes with the two of you up the dark face.)
    this.glowAt = [...L.glows.map((g) => this.world(g.x, g.y, g.z)), new THREE.Vector3()];
    this.glowD = new Float32Array(this.glowAt.length);
    this.glowR = new Float32Array(this.glowAt.length);
    this.glowOrder = this.glowAt.map((_, i) => i);
    this.heart.alpha = 0;
    this.thought.alpha = 0;
    this.overlay.add(this.heart.mesh, this.thought.mesh);
    this.scene.add(this.root);
    this.buildMs = { plan: t1 - t0, mesh: performance.now() - t1 };
    this.world(L.ember.x, L.ember.y, L.ember.z, this.emberAt);
    const ink = makeSolidMaterial('#141f18', 0, { keep: 1, flat: 0.5 });
    this.arms = [new Arm(ink), new Arm(ink)];
    this.scene.add(this.arms[0].group, this.arms[1].group);
    const P = L.lip;
    this.dust = new Dust(this);
    this.scene.add(this.dust.mesh);
    this.setDown = this.world(P.x - P.dx * SET_BACK, L.cavern.y, P.z - P.dz * SET_BACK);
    this.hover = this.world(P.x + P.dx * 7, L.cavern.y + OVER, P.z + P.dz * 7);
  }

  /** A point of the world, in the plan. */
  local(x: number, z: number): [number, number] {
    const dx = x - this.origin.x, dz = z - this.origin.z;
    return [dx * this.cos + dz * this.sin, -dx * this.sin + dz * this.cos];
  }

  /** A point of the plan, in the world. */
  world(x: number, y: number, z: number, out = new THREE.Vector3()) {
    return out.set(this.origin.x + x * this.cos - z * this.sin, this.origin.y + y, this.origin.z + x * this.sin + z * this.cos);
  }

  /** A heading in the world (as the body's: atan2(x, z)) for a direction of the plan. */
  private yawOf(dx: number, dz: number) {
    return Math.atan2(dx * this.cos - dz * this.sin, dx * this.sin + dz * this.cos);
  }

  /** The nearest heading to `h` that is square to the plan (she turns in right angles: this keeps her square to the pit's faces). */
  private square(h: number) {
    const wx = Math.sin(h), wz = Math.cos(h), dx = wx * this.cos + wz * this.sin, dz = -wx * this.sin + wz * this.cos;
    return Math.abs(dx) > Math.abs(dz) ? this.yawOf(Math.sign(dx), 0) : this.yawOf(0, Math.sign(dz));
  }

  private paintLantern(i: number) {
    const a = this.lanternGeo.attributes.aLit as THREE.BufferAttribute, [from, to] = this.lanternRanges[i];
    (a.array as Float32Array).fill(this.litK[i] * this.wave[i], from, to);
    a.needsUpdate = true;
  }

  private wake(i: number, atOnce = false) {
    this.lit[i] = true;
    if (atOnce) { this.litK[i] = 1; this.paintLantern(i); }
  }

  /** Below this height of the world, rock that no lantern is on isn't seen (main hands it to the shader while you're inside). */
  get darkY() {
    // (Once the cavern has woken the dark goes down, over a few seconds, to under the ledge: all of the cavern is
    // seen, and under the ledge there is still nothing.)
    const L = this.layout, k = ss(this.wakeT, 0.3, WAKE_ALL);
    return this.origin.y + THREE.MathUtils.lerp(L.cavern.y - 1.5, L.cavern.y - BURROW - 7, k * k * (3 - 2 * k));
  }

  /** The dungeon's creature, for whoever asks which (main). */
  get creature() { return this.she; }
  /** She's yours: E by her gets you on. */
  get mountable() { return this.yours && this.win < 0 && this.glad <= 0; }

  /** The cave's light and rock, into the shared uniforms (every frame you're inside). */
  applyLight(cam: THREE.Vector3) {
    const k = DROP_LOOK, b = this.d.body.pos, L = this.layout;
    DUNGEON_U.cLit.value.copy(k.lit);
    DUNGEON_U.cMid.value.copy(k.mid);
    DUNGEON_U.cShade.value.copy(k.shade);
    DUNGEON_U.uOrigin.value.copy(this.origin);
    DUNGEON_U.uMark.value = LIFT_R;
    DUNGEON_U.cUnseen.value.copy(k.unseen);
    this.world(L.cavern.x, 0, L.cavern.z, v);
    DUNGEON_U.uDarkAt.value.set(v.x, v.z, L.cavern.r + 4);
    const g = L.glows, slots = DUNGEON_U.uGlows.value, N = slots.length;
    const aim = L.tops[Math.min(this.target, L.tops.length - 1)].lantern;
    for (let i = 0; i < g.length; i++) {
      const o = g[i];
      let r = o.r, keep = i === 0;
      if (o.warm) { r = (this.taken && this.win < 0 ? 4.5 : this.taken ? 8 : o.r) * (1 + 0.04 * Math.sin(this.time * 2.3)) * (1 + 1.1 * this.cheer); this.glowAt[i].copy(this.emberAt); keep = true; }
      else if (o.lantern !== undefined) {
        const q = this.litK[o.lantern] * this.wave[o.lantern];
        r = o.r * q * (2 - q) * (1 + 0.025 * Math.sin(this.time * 1.7 + o.lantern * 2.4)) * (1 + 0.3 * this.cheer);
        // (The one you're to land by is never dropped for a nearer light; nor the far doorway's.)
        keep = o.lantern === aim || L.beacons.includes(o.lantern) || L.ledgeLanterns.includes(o.lantern);
        // (Woken, the whole way down is alight at once: each top's pool reaches further, so the pillars are seen.)
        if (this.woken && o.r > 14) r *= 1.5;
      }
      this.glowR[i] = r;
      this.glowD[i] = r < 0.05 ? 1e9 : keep ? -1e9 : Math.max(0, cam.distanceTo(this.glowAt[i]) - r);
    }
    // On her below the lips, in the dark: what's near the two of you is seen, as far as a lantern's light would go.
    {
      const n1 = g.length, on = this.riding && b.y < this.darkY ? 1 : 0;
      this.rideK += (on - this.rideK) * 0.06;
      this.glowAt[n1].set(b.x, b.y + 1.5, b.z);
      this.glowR[n1] = 9 * this.rideK;
      this.glowD[n1] = this.rideK < 0.03 ? 1e9 : -1e9;
    }
    this.glowOrder.sort((p, q) => this.glowD[p] - this.glowD[q]);
    const cut = this.glowOrder.length > N ? this.glowD[this.glowOrder[N]] : 1e9;
    let n = 0, light = 0;
    for (; n < Math.min(N, this.glowOrder.length); n++) {
      const i = this.glowOrder[n];
      if (this.glowD[i] > 1e8) break;
      const fade = cut > 1e8 || this.glowD[i] < 0 ? 1 : 1 - ss(this.glowD[i], cut * 0.75, cut);
      const r = this.glowR[i] * fade, at = this.glowAt[i];
      slots[n].set(at.x, at.y, at.z, g[i]?.warm ? -r : r);
      if (r > 0.1 && Math.abs(b.y - at.y) < r) light = Math.max(light, 1 - ss(Math.hypot(b.x - at.x, b.z - at.z), r * 0.55, r * 1.05));
    }
    DUNGEON_U.uGlowN.value = n;
    this.inLight += (light - this.inLight) * 0.12;
    U.uLightDir.value.copy(k.dir);
    U.uLightCol.value.copy(k.dark[0]).lerp(k.near[0], this.inLight);
    U.uMidCol.value.copy(k.dark[1]).lerp(k.near[1], this.inLight);
    U.uShadeCol.value.copy(k.dark[2]).lerp(k.near[2], this.inLight);
    U.uNight.value = 1;
  }

  /** What the feet rest on: the floor (the pit's, in the pit), a pillar's top come down on from above, or a boulder no more than a step up. */
  floorAt(x: number, z: number, feetY = -Infinity): number {
    const [lx, lz] = this.local(x, z), L = this.layout;
    // (The lip's own edge is lip: a clinger coming up over it is put exactly there.)
    const f = this.origin.y + (L.pitSd(lx, lz) > -0.06 ? L.ground(lx, lz) : L.floor(lx, lz));
    let top = f;
    for (const o of L.tops) {
      if (!over(o, lx, lz)) continue;
      const s = this.origin.y + o.y;
      if (s <= feetY + STEP) top = Math.max(top, s);
    }
    for (const o of L.solids) {
      const R = o.r * 0.8, dist = Math.hypot(lx - o.x, lz - o.z);
      if (o.top > 50 || dist > R) continue;
      const s = f + o.top * 0.82 * (1 - (dist / R) ** 4);
      if (s <= feetY + STEP) top = Math.max(top, s);
    }
    return top;
  }

  /**
   * What a clinger can climb from (x, z): the lip over a face of the pit, or
   * a pillar's top. The wurm goes straight up either (RideMode's wall climb).
   */
  climbTop(x: number, z: number, r: number): number {
    const [lx, lz] = this.local(x, z), L = this.layout;
    if (L.pitSd(lx, lz) > 0) return L.sdf(lx, lz) < 0.5 ? this.origin.y + L.ground(lx, lz) : -Infinity;
    let top = -Infinity;
    // (Not the ledge: there is nowhere under it to climb from.)
    for (const o of L.tops) if (!o.ledge && over(o, lx, lz, r)) top = Math.max(top, this.origin.y + o.y);
    return top;
  }

  /**
   * The wind, where it has you: the way it's carrying you (m/s), or null.
   * Up out of the pit, well clear of the face, then across over the lip.
   * GlideMode goes where this says, hands off.
   */
  updraft(pos: THREE.Vector3): THREE.Vector3 | null {
    if (!this.caught) return null;
    const rim = this.origin.y + this.layout.cavern.y;
    const over = pos.y > rim + OVER - 2;
    const to = over ? this.setDown : this.hover;
    const dx = to.x - pos.x, dz = to.z - pos.z, dl = Math.hypot(dx, dz) || 1;
    const h = Math.min(CARRY, dl * (over ? 2.2 : 0.9));
    // (It takes hold gently, is fastest in the middle of the climb, and eases off as it brings you level.)
    const up = Math.min(RISE * ss(this.caughtT, 0, 0.9), 3 + (rim + OVER - pos.y) * 1.5);
    return this.wind.set((dx / dl) * h, over ? (rim + OVER - pos.y) * 1.5 : up, (dz / dl) * h);
  }

  /**
   * Keep a body of radius `r` inside the rock, out of the pillars and what
   * stands on the floor, and (from below) out from under the lips. The
   * walls lean in as they rise: the wall is wherever it has got to at the
   * body's height.
   */
  collide(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    const L = this.layout;
    let [lx, lz] = this.local(pos.x, pos.z);
    const out = (nx: number, nz: number, by: number) => {
      lx -= nx * by; lz -= nz * by;
      const wx = nx * this.cos - nz * this.sin, wz = nx * this.sin + nz * this.cos;
      const into = vel.x * wx + vel.z * wz;
      if (into > 0) { vel.x -= wx * into; vel.z -= wz * into; }
    };
    const y = pos.y - this.origin.y;
    for (let i = 0; i < 2; i++) {
      const dist = L.sdf(lx, lz) + L.leanAt(lx, y + 1.2, lz);
      if (dist <= -r) break;
      const [gx, gz] = L.grad(lx, lz);
      out(gx, gz, dist + r);
    }
    const feet = y - L.floor(lx, lz);
    for (const o of L.solids) {
      const dx = lx - o.x, dz = lz - o.z, dist = Math.hypot(dx, dz);
      if (dist >= o.r + r || dist < 1e-4 || feet + STEP >= o.top * 0.82) continue;
      out(-dx / dist, -dz / dist, o.r + r - dist);
    }
    // A pillar: its shaft is slimmer than its top.
    for (const o of L.tops) {
      if (o.ledge || y + STEP >= o.y) continue;
      const dx = lx - o.x, dz = lz - o.z, dist = Math.hypot(dx, dz), R = y > o.y - 1.6 ? o.r : Math.min(o.r * 0.62, 3.2) * 1.1;
      if (dist >= R + r || dist < 1e-4) continue;
      out(-dx / dist, -dz / dist, R + r - dist);
    }
    // A lip is a wall from below: its face holds you off it, out in the pit.
    const pd = L.pitSd(lx, lz);
    if (pd > -r && pd < 6 && L.ground(lx, lz) - y > LEDGE) {
      const e = 0.1, gx = L.pitSd(lx + e, lz) - L.pitSd(lx - e, lz), gz = L.pitSd(lx, lz + e) - L.pitSd(lx, lz - e), gl = Math.hypot(gx, gz) || 1;
      out(gx / gl, gz / gl, pd + r);
    }
    // Riding, she doesn't go off into the dark (there's nothing down there to come back from): the ledge's edges hold
    // her, and so do the lips', but for the far lip over the ledge, where the way down the face comes out on it.
    if (this.riding) {
      const K = L.tops[L.tops.length - 1], m = 0.85;
      if (Math.abs(y - K.y) < 1.5 && L.inVoid(lx, lz) && over(K, lx, lz, 2)) {
        const ex = Math.abs(lx - K.x) - (K.hx! - m), ez = Math.abs(lz - K.z) - (K.hz! - m);
        // (Its side along the far face isn't an edge: that's the wall she climbs.)
        if (ex > 0 && lx < K.x) out(-1, 0, ex);
        if (ez > 0) out(0, Math.sign(lz - K.z), ez);
      }
      // On the far face over it she keeps over the ledge too: off its ends the way down is into the dark.
      if (y > K.y + 1.5 && y < L.cavern.y - 1.5 && lx > K.x - K.hx! && Math.abs(lx - L.cavern.x) < PIT_HALF + 1) {
        const ez = Math.abs(lz - K.z) - (K.hz! - m);
        if (ez > 0) out(0, Math.sign(lz - K.z), ez);
      }
      const pd2 = L.pitSd(lx, lz);
      if (pd2 > 0 && pd2 < m && Math.abs(y - L.ground(lx, lz)) < 1.5 && L.sdf(lx, lz) < 0 && Math.abs(lx - L.cavern.x) < PIT_HALF + 3) {
        const far = lx > L.cavern.x, overLedge = far && Math.abs(lz - K.z) < K.hz! - 1;
        if (!overLedge) out(far ? -1 : 1, 0, m - pd2);
      }
    }
    this.world(lx, 0, lz, v);
    pos.x = v.x; pos.z = v.z;
    const roof = this.origin.y + L.ceil(lx, lz) - 2.6;
    if (pos.y > roof) { pos.y = roof; if (vel.y > 0) vel.y = 0; }
  }

  private save() {
    try {
      localStorage.setItem(`embla.dungeon4.${this.d.saveKey}`, JSON.stringify({
        down: this.down, yours: this.yours, hinted: this.hinted, climbed: this.climbed, woken: this.woken, taken: this.taken, lit: this.lit.flatMap((on, i) => (on && !this.own[i] ? [i] : [])),
      }));
    } catch { /* ignore */ }
  }

  /** The camera stays in the cave, as in dungeon 1 (drawn in along its line to you until it's clear of rock; quick in, slow out). */
  clampCamera(cam: THREE.Vector3, focus: THREE.Vector3, dt: number, vel?: THREE.Vector3) {
    const L = this.layout, len = cam.distanceTo(focus);
    let ox = 0, oz = 0;
    const ok = (k: number) => {
      v.lerpVectors(focus, cam, k);
      const [lx, lz] = this.local(v.x + ox, v.z + oz);
      return L.free(lx, v.y - this.origin.y, lz, 0.45);
    };
    const n = Math.max(1, Math.ceil(len / 0.5));
    const reach = () => {
      for (let i = 1; i <= n; i++) {
        if (ok(i / n)) continue;
        let a = (i - 1) / n, b = i / n;
        for (let j = 0; j < 6; j++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; }
        return Math.max(0.06, a);
      }
      return 1;
    };
    let k = reach();
    const speed = vel ? Math.hypot(vel.x, vel.z) : 0;
    if (vel && speed > 2) {
      ox = vel.x * 0.25; oz = vel.z * 0.25;
      if (ok(0)) k = Math.min(k, reach());
    }
    const rate = k < this.camK ? 14 : 1.4 / (1 + speed * 0.45);
    this.camK += (k - this.camK) * (1 - Math.exp(-rate * dt));
    if (this.camK < 0.999) cam.lerpVectors(focus, cam, this.camK);
  }

  /** Stand her somewhere of the plan, at once, on the floor. */
  private put(x: number, z: number, heading?: number) {
    const m = this.she;
    if (!m) return;
    this.world(x, 0, z, m.pos);
    m.pos.y = this.floorAt(m.pos.x, m.pos.z, 1e9);
    m.vel.set(0, 0, 0);
    m.stay.copy(m.pos);
    m.grounded = true;
    if (heading !== undefined) m.heading = heading;
    m.species.reset(m);
  }

  /** The ring has let go of you above: the arms let you down through the well's ceiling. */
  enter() {
    const b = this.d.body, L = this.layout;
    if (!this.she) this.she = this.d.adopt(this.world(L.wurm.x, L.floor(L.wurm.x, L.wurm.z), L.wurm.z));
    if (this.she && !this.she.ridden) { this.put(L.wurm.x, L.wurm.z, this.yawOf(Math.cos(L.wurm.dir), Math.sin(L.wurm.dir))); this.she.stabled = this.yours; }
    this.inside = true;
    this.armed = false;
    this.camK = 1;
    this.target = this.down ? L.tops.length : 0;
    this.riding = false;
    this.caught = false;
    this.arrived = false;
    this.lightT = 0;
    this.strand = 0;
    this.gust = 0;
    DUNGEON_U.uMarkOn.value = 0;
    b.pos.copy(this.top).setY(this.top.y - 1.2);
    b.vel.set(0, 0, 0);
    b.heading = Math.atan2(Math.cos(this.facing + L.door), Math.sin(this.facing + L.door));
    this.d.setMode('carried');
    this.seq = { phase: 'lower', t: 0, from: b.pos.clone() };
    this.applyLight(b.pos);
  }

  /** Dev: straight in, on your feet in the middle of the well (or at a point of the plan). */
  drop(x = 0, z = 0) {
    this.enter();
    this.seq = null;
    this.armed = false;
    this.d.setMode('walk');
    this.goTo([x, z]);
    this.hideArms();
  }

  /** Dev: stand at one of the plan's named places (`layout.at`), or at a point of it: on a pillar's top, if it's one. */
  goTo(name: string | [number, number]) {
    const p = typeof name === 'string' ? this.layout.at[name] : name;
    if (!p || !this.inside) return false;
    const b = this.d.body;
    this.world(p[0], 0, p[1], b.pos);
    b.pos.y = this.floorAt(b.pos.x, b.pos.z, 1e9);
    b.vel.set(0, 0, 0);
    b.grounded = true;
    return true;
  }

  /** Dev: every lantern awake (or asleep again). */
  debugLight(on = true) {
    this.lit.forEach((_, i) => { this.lit[i] = on; this.litK[i] = on ? 1 : 0; this.paintLantern(i); });
  }

  /** Dev: as if you'd landed on every top up to `n` (default: all of them, the ledge too). */
  debugDown(n = this.layout.tops.length) {
    this.target = n;
    this.arrived = true;
    if (n >= this.layout.tops.length) { this.down = this.hinted = true; this.save(); }
  }

  /** Dev: she's yours, by you (wherever you are), ready to be got on. */
  debugYours() {
    this.debugDown();
    this.yours = true;
    this.glad = 0;
    const m = this.she;
    if (!m) return;
    const b = this.d.body, [x, z] = this.local(b.pos.x - Math.cos(b.heading) * 2.4, b.pos.z + Math.sin(b.heading) * 2.4);
    this.put(x, z, this.square(b.heading));
    m.stabled = true;
    this.save();
  }

  get busy() { return !!this.seq || this.win >= 0; }

  /** Dev: where it all stands. */
  get debug() {
    return {
      target: this.target, caught: this.caught, down: this.down, yours: this.yours, hinted: this.hinted, climbed: this.climbed, woken: this.woken, taken: this.taken, arrived: this.arrived,
      gust: this.gust, glad: this.glad, win: this.win, camK: this.camK, thought: this.thoughtA, idle: this.idle, lit: this.lit.map((on) => (on ? 1 : 0)).join(''),
    };
  }

  /** How much of the frame the flat veil of the cut covers (0..1). */
  get veil() {
    const s = this.seq;
    if (this.win >= 0) return ss(this.win, WIN - WIN_VEIL, WIN - 0.1);
    if (!s) return 0;
    if (s.phase === 'lower') return 1 - ss(s.t, 0.05, 0.6);
    if (s.phase === 'lift') return ss(s.t / LIFT, 0.45, 1);
    return 0;
  }

  /** Being let down, watched from across the well. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3 } | null {
    const s = this.seq, b = this.d.body.pos, L = this.layout;
    if (s && (s.phase === 'lower' || s.phase === 'letgo')) {
      const c = Math.cos(L.door), n = Math.sin(L.door), side = L.side;
      return { pos: this.world(-11 * c + 3.2 * side * n, 1.7, -11 * n - 3.2 * side * c), at: new THREE.Vector3(b.x, b.y + 1.6, b.z).lerp(this.world(0, 3, 0), 0.25) };
    }
    return null;
  }

  get startYaw() { return this.d.body.heading + Math.PI; }

  private hideArms() { this.arms[0].group.visible = this.arms[1].group.visible = false; }

  /** The wind, for the ear: nothing in the well, a moan down the way in, all of it in the cavern; a roar while it has you. */
  private blow(dt: number, px: number, pz: number) {
    const L = this.layout, b = this.d.body;
    const off = Math.max(0, Math.hypot(px - L.cavern.x, pz - L.cavern.z) - CAVERN_R);
    const level = this.seq ? 0 : 0.12 + 0.88 * (1 - ss(off, 0, 90));
    // (Falling through it, it rushes past you; and once it has you, it roars.)
    const want = this.caught ? 1 : THREE.MathUtils.clamp(-b.vel.y / 40, 0, 0.45);
    this.gust += (want - this.gust) * (1 - Math.exp(-(want > this.gust ? 6 : 1.4) * dt));
    this.d.sfx.wind(level, this.gust);
  }

  update(dt: number, mode: string, grounded: boolean) {
    this.time += dt;
    const b = this.d.body, L = this.layout, N = L.tops.length;
    const [px, pz] = this.local(b.pos.x, b.pos.z), py = b.pos.y - this.origin.y;
    const inPit = L.inVoid(px, pz);
    const onFoot = mode === 'walk' || mode === 'glide';
    this.riding = mode === 'ride';
    this.dust.update(dt, this.time, b.pos, this.gust);

    // The way down. You come to the lip, and the first lantern wakes; land on the lit top, and the next one does.
    if (!this.arrived && !this.seq && Math.hypot(px - L.lip.x, pz - L.lip.z) < 13) { this.arrived = true; this.lightT = PAUSE; }
    if (this.lightT > 0 && this.arrived) { this.lightT -= dt; if (this.lightT <= 0) this.d.sfx.coo(); }
    if (grounded && mode === 'walk' && !this.caught) {
      const on = L.tops.findIndex((o) => over(o, px, pz) && Math.abs(py - o.y) < 0.3);
      if (on >= 0 && on === this.target) {
        this.target = on + 1;
        this.lightT = PAUSE;
        this.d.sfx.collect(on);
        this.d.puff(v.copy(b.pos).setY(b.pos.y + 0.2), 6, 0.16, 2);
        // The ledge: down. The way is done.
        if (this.target >= N && !this.down) { this.down = this.hinted = true; this.d.sfx.fanfare(0.15); this.save(); }
      }
    }
    // Past the lit top with nothing under you: the wind has you. It blows out every lantern below the first.
    // (And always, once you're below the ledge's own level: there is no floor to come to.)
    const lost = this.target < N && !this.down ? L.tops[this.target].y - MISS : L.cavern.y - BURROW - 10;
    if (!this.caught && !this.seq && onFoot && !grounded && inPit && py < lost) {
      this.caught = true;
      this.caughtT = 0;
      if (!this.down) { this.target = 0; this.lightT = PAUSE; }
      this.hinted = true;
      this.d.puff(v.copy(b.pos).setY(b.pos.y - 1), 10, 0.3, 4);
      if (mode === 'walk') this.d.setMode('glide');
    }
    if (this.caught) {
      this.caughtT += dt;
      // Set down: over the lip, it lets go, and the parachute brings you the last of the way.
      const rim = this.origin.y + L.cavern.y;
      if (b.pos.y > rim + 1 && Math.hypot(b.pos.x - this.setDown.x, b.pos.z - this.setDown.z) < 1.6) this.caught = false;
      // (Never for ever: if something has gone wrong it puts you there.)
      if (this.caughtT > 20 || mode === 'ride') { this.caught = false; if (mode !== 'ride') { b.pos.copy(this.setDown).setY(rim + 1.2); b.vel.set(0, 0, 0); } }
      for (let k = 0; k < 2; k++) if (Math.random() < dt * 14) this.d.puff(v.set(b.pos.x + (Math.random() - 0.5) * 3, b.pos.y - 2 - Math.random() * 3, b.pos.z + (Math.random() - 0.5) * 3), 1, 0.22, 1.2);
    }
    this.blow(dt, px, pz);

    // The lanterns: the tops' and the pit floor's are the cave's to light (and to put out behind you, and the wind's to blow out); the rest wake as you come by.
    for (let i = 0; i < this.lit.length; i++) {
      if (this.own[i]) {
        const t = L.tops.findIndex((o) => o.lantern === i);
        // (Only two are ever awake: the one you're to land by, once its pause is up, and the one you stand by.)
        // (The ledge's other two wake with it once you're on it.)
        const was = this.lit[i], c = this.rung[i];
        this.lit[i] = c >= 0 ? false : t < 0 ? this.target >= N && this.lightT <= 0 : this.arrived && (t === this.target ? this.lightT <= 0 : t === this.target - 1);
        // The cavern woken: every one of them, one after another from the ledge up to the lip.
        if (this.woken && t >= 0 && this.wakeT > (N - 1 - t) * WAKE_STEP) { this.lit[i] = true; if (!was && this.wakeT < 90) this.d.sfx.collect(N - 1 - t); }
      } else if (!this.lit[i] && !this.seq && this.lanternAt[i].distanceTo(b.pos) < WAKE_R) {
        this.lit[i] = true;
        this.d.sfx.coo();
        this.save();
      }
      // The ladder up the far face: awake after the rest, from the foot up, and then its light runs up it over and
      // over (the way to go) until the light at the top is yours.
      const c = this.rung[i];
      if (c >= 0) {
        this.lit[i] = this.woken && this.wakeT > N * WAKE_STEP + c * 0.22;
        const w = this.taken ? 1 : 0.22 + 0.78 * Math.max(0, Math.cos((this.time * 0.55 - c * 0.26) * Math.PI * 2)) ** 2;
        if (this.litK[i] > 0 && w !== this.wave[i]) { this.wave[i] = w; this.paintLantern(i); }
      }
      const to = this.lit[i] ? 1 : 0;
      if (this.litK[i] !== to) { this.litK[i] = to > this.litK[i] ? Math.min(1, this.litK[i] + dt / WAKE) : Math.max(0, this.litK[i] - dt / 0.35); this.paintLantern(i); }
    }

    // The parachute thought, once: on the lip, by its edge, until you've jumped.
    {
      const near = !inPit && px < L.cavern.x && Math.abs(px - L.lip.x) < 9 && L.pitSd(px, pz) > 0 && L.sdf(px, pz) < 0;
      if (!this.hinted && inPit && !grounded) { this.hinted = true; this.save(); }
      // And again for anyone who stands a long time on a top with the next one waiting (it goes when they step off).
      const onTop = grounded && mode === 'walk' && !this.down && L.tops.some((o) => !o.ledge && over(o, px, pz) && Math.abs(py - o.y) < 0.3);
      this.idle = onTop ? this.idle + dt : 0;
      const chute = !this.seq && mode === 'walk' && grounded && ((!this.hinted && near) || this.idle > HESITATE);
      // And, on her on the ledge, of what she can do: up the wall. Until you've been up one.
      const K = L.tops[N - 1];
      if (!this.climbed && mode === 'ride' && py > K.y + 6 && inPit) { this.climbed = true; this.save(); }
      const climb = !this.climbed && mode === 'ride' && over(K, px, pz, 1) && Math.abs(py - K.y) < 1.5;
      // Out on the ledge on her for the first time: the cavern wakes.
      if (!this.woken && mode === 'ride' && inPit && over(K, px, pz, 1)) { this.woken = true; this.wakeT = 0; this.d.sfx.shimmer(); this.save(); }
      if (this.woken) this.wakeT += dt;
      const show = chute || climb ? 1 : 0;
      if (show && this.thoughtA < 0.02) { this.d.sfx.call(); this.thoughtT = 0; }
      this.thoughtT += dt;
      let frame = 0, u = this.thoughtT % HINT_HOLD.reduce((a, h) => a + h, 0);
      for (; u >= HINT_HOLD[frame]; frame++) u -= HINT_HOLD[frame];
      if (show) this.thought.texture = tex(climb ? climbHintCanvas(Math.floor(this.thoughtT / 0.55) % 4) : chuteHintCanvas(frame, this.d.touch()));
      this.thoughtA += (show - this.thoughtA) * (1 - Math.exp(-(show ? 6 : 10) * dt));
      this.thought.alpha = this.thoughtA;
      this.thought.scale = 0.6 + 0.4 * this.thoughtA;
      this.thought.pos.set(b.pos.x, b.pos.y + (mode === 'ride' ? 4.1 : 2.95) + 0.05 * Math.sin(this.time * 2), b.pos.z);
    }

    // The wurm: asleep in her den until you come to her; glad; yours.
    const m = this.she;
    if (m && !m.ridden) {
      const dist = Math.hypot(m.pos.x - b.pos.x, m.pos.z - b.pos.z), level = Math.abs(m.pos.y - b.pos.y) < 4;
      if (!this.yours && this.glad <= 0 && !this.caught && grounded && mode === 'walk' && level && dist < MEET_R) {
        this.glad = GLAD;
        m.happy = GLAD;
        this.d.sfx.fanfare(0.1);
        this.d.puff(v.copy(m.pos).setY(m.pos.y + 1), 8, 0.2, 2.4);
      }
      if (this.glad > 0) {
        this.glad -= dt;
        m.hop = 0.45 * Math.abs(Math.sin((GLAD - this.glad) * 5.2)) * ss(this.glad, 0, 0.5);
        const show = this.glad > 0.3 ? 1 : 0;
        this.heart.alpha += (show - this.heart.alpha) * (1 - Math.exp(-7 * dt));
        this.heart.scale = (0.6 + 0.4 * this.heart.alpha) * (1 + 0.12 * Math.sin(this.time * 6));
        this.heart.pos.set(m.pos.x, m.pos.y + 2.7, m.pos.z);
        if (this.glad <= 0) { m.hop = 0; m.stabled = true; this.yours = true; this.heart.alpha = 0; this.d.sfx.chirp(true); this.save(); }
      }
      // Left on another level from her (you got off at the top and fell, or the other way about): she comes to you.
      if (this.yours && this.glad <= 0 && grounded && mode === 'walk' && !level && !this.seq && this.win < 0) {
        this.strand += dt;
        if (this.strand > STRAND) {
          this.strand = 0;
          // (Behind you if there's floor there at your level; else round to wherever there is.)
          for (let k = 0; k < 8; k++) {
            const a = b.heading + Math.PI + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 0.7;
            const wx = b.pos.x + Math.sin(a) * 3.2, wz = b.pos.z + Math.cos(a) * 3.2, [x, z] = this.local(wx, wz);
            if (L.sdf(x, z) > -1.2 || Math.abs(this.floorAt(wx, wz, b.pos.y) - b.pos.y) > 0.6) continue;
            this.put(x, z, this.square(b.heading));
            m.pos.y = this.floorAt(wx, wz, b.pos.y);
            m.stay.copy(m.pos);
            this.d.puff(v.copy(m.pos).setY(m.pos.y + 0.8), 10, 0.24, 2.6);
            this.d.sfx.chirp();
            break;
          }
        }
      } else this.strand = 0;
    }

    // The dungeon's light: on its stone until you come to it, then at your shoulder.
    const rest = this.world(L.ember.x, L.ember.y + 0.06 * Math.sin(this.time * 1.7), L.ember.z);
    if (!this.taken && !this.seq && Math.hypot(b.pos.x - rest.x, b.pos.z - rest.z) < TAKE_R && Math.abs(b.pos.y + 1 - rest.y) < 3) {
      this.taken = true;
      this.win = 0;
      b.vel.x = b.vel.z = 0;
      this.d.sfx.chirp(true);
      this.d.puff(rest, 8, 0.16, 2.2);
      this.save();
    }
    // It's yours: the light flares, the lanterns brighten, and you hop for it with a heart over you.
    if (this.win >= 0) {
      const t0 = this.win;
      this.win += dt;
      for (const h of WIN_HOPS) if (t0 < h && this.win >= h && b.grounded) {
        b.vel.y = mode === 'ride' ? 7.5 : 6.5;
        b.grounded = false;
        this.d.sfx.chirp(h === WIN_HOPS[2]);
        this.d.puff(v.copy(b.pos).setY(b.pos.y + 0.2), 7, 0.18, 2.4);
      }
      if (this.win > WIN_HOPS[0] && this.win < WIN_HOPS[2] + 0.75) b.heading += (dt * Math.PI * 2) / (WIN_HOPS[2] + 0.75 - WIN_HOPS[0]);
      b.vel.x = b.vel.z = 0;
      const up = ss(this.win, 0.05, 0.5) * (1 - ss(this.win, WIN - 1.3, WIN - 0.5));
      this.cheer = up * (0.75 + 0.25 * Math.sin(this.win * 7));
      const show = this.win > 0.6 && this.win < WIN - 0.9 ? 1 : 0;
      this.heart.alpha += (show - this.heart.alpha) * (1 - Math.exp(-7 * dt));
      this.heart.scale = (0.6 + 0.4 * this.heart.alpha) * (1 + 0.12 * Math.sin(this.win * 6));
      this.heart.pos.set(b.pos.x, b.pos.y + (mode === 'ride' ? 3.4 : 2.8), b.pos.z);
      // And out, as from the others: under the cut, main has you lifted out above.
      if (this.win >= WIN) {
        this.win = -1;
        this.cheer = 0;
        this.heart.alpha = 0;
        this.inside = false;
        this.hideArms();
        this.d.sfx.wind(0, 0);
        this.onWon?.();
        return;
      }
    }

    if (this.taken) {
      const up = mode === 'ride' ? 2.7 : 2.0;
      rest.set(b.pos.x - Math.sin(b.heading) * 0.55 + Math.cos(b.heading) * 0.5, b.pos.y + up + 0.08 * Math.sin(this.time * 2.1), b.pos.z - Math.cos(b.heading) * 0.55 - Math.sin(b.heading) * 0.5);
      this.emberAt.lerp(rest, 1 - Math.exp(-(this.seq ? 30 : 5) * dt));
    } else this.emberAt.copy(rest);
    this.root.worldToLocal(this.ember.position.copy(this.emberAt));
    this.ember.scale.setScalar((this.taken ? 0.6 : 1) * (1 + 0.07 * Math.sin(this.time * 4.1)) * (1 + 0.9 * this.cheer));

    DUNGEON_U.uFeet.value.set(b.pos.x, this.floorAt(b.pos.x, b.pos.z, b.pos.y), b.pos.z);
    if (this.seq || mode === 'carried') DUNGEON_U.uFeet.value.y = -1e4;
    const off = Math.hypot(px, pz);
    if (off > ARM_R) this.armed = true;
    const on = DUNGEON_U.uMarkOn;
    on.value += ((this.armed ? 1 : 0) - on.value) * (1 - Math.exp(-4 * dt));
    if (!this.seq && this.armed && mode === 'walk' && grounded && off < LIFT_R && this.win < 0) {
      this.seq = { phase: 'reach', t: 0, from: b.pos.clone() };
      b.vel.set(0, 0, 0);
      this.d.sfx.sink(true);
    }
    const s = this.seq;
    if (!s) { this.hideArms(); return; }
    s.t += dt;
    let hands = 1;
    const floor = w.copy(this.origin);
    if (s.phase === 'lower') {
      const k = Math.min(1, s.t / LOWER);
      b.pos.lerpVectors(s.from, floor, 1 - Math.pow(1 - k, 2.4));
      if (k >= 1) {
        s.phase = 'letgo'; s.t = 0;
        b.pos.copy(floor);
        b.grounded = true;
        this.d.setMode('walk');
      }
    } else if (s.phase === 'letgo') {
      hands = 1 - ss(s.t / LET_GO, 0, 1);
      if (s.t >= LET_GO) this.seq = null;
    } else if (s.phase === 'reach') {
      hands = 1 - Math.pow(1 - Math.min(1, s.t / REACH), 3);
      if (s.t >= REACH) { s.phase = 'lift'; s.t = 0; s.from.copy(b.pos); this.d.setMode('carried'); }
    } else {
      const k = Math.min(1, s.t / LIFT);
      b.pos.lerpVectors(s.from, v.copy(this.top).setY(this.top.y - 1.2), k * k);
      if (k >= 1) {
        this.seq = null;
        this.inside = false;
        this.hideArms();
        this.d.sfx.wind(0, 0);
        this.onLeft?.();
        return;
      }
    }
    if (!this.seq) { this.hideArms(); return; }
    const rightV = new THREE.Vector3(Math.cos(b.heading), 0, -Math.sin(b.heading));
    const chest = b.pos.clone().setY(b.pos.y + 1.0);
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const sh = this.top.clone().addScaledVector(rightV, side * 1.2).setY(this.top.y + 0.6);
      const grip = chest.clone().addScaledVector(rightV, side * 0.45);
      const hand = sh.clone().lerp(grip, hands);
      const len = sh.distanceTo(hand);
      const a1 = sh.clone().addScaledVector(rightV, side * Math.min(len * 0.2, 1.5));
      const a2 = hand.clone().add(new THREE.Vector3(0, Math.min(len * 0.25, 3), 0));
      this.arms[k].set(sh, a1, a2, hand, 0.1 * ARM, 0.075 * ARM, 0.16 * ARM, -side, chest);
    }
  }

  dispose() {
    this.d.sfx.wind(0, 0);
    this.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    this.dust.mesh.geometry.dispose();
    this.scene.clear();
  }
}

/** How many bits of dust and grit are in the air, and the box round you they're kept in (m: across, and high). */
const DUST_N = 900, DUST_BOX = 64, DUST_H = 90;
const dA = new THREE.Vector3(), dB = new THREE.Vector3(), dC = new THREE.Vector3();

/**
 * What the wind carries: dust and grit blown up out of the dark, all through
 * the cavern's pit. Each bit is one small triangle, tumbling, in a box that
 * goes where you go (a bit that leaves one side comes in at the other), so
 * there is always the same amount of it round you however far you fall.
 * Pale, and a little alight, so it's seen against the dark. Looks only.
 */
class Dust {
  readonly mesh: THREE.Mesh;
  private pos: Float32Array;
  private seed: Float32Array;

  constructor(private cave: DropCave) {
    this.pos = new Float32Array(DUST_N * 9);
    this.seed = new Float32Array(DUST_N * 6);
    // (Presentation only: the world's own randomness isn't touched.)
    for (let i = 0; i < this.seed.length; i++) this.seed[i] = Math.random();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(DUST_N * 9).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    this.mesh = new THREE.Mesh(g, makeSolidMaterial('#c9d6b8', 0.22, { keep: 1, doubleSide: true, flat: 1 }));
    this.mesh.frustumCulled = false;
  }

  /** `gust` (0..1): how hard it's blowing just now (it all goes faster while the wind has you). */
  update(_dt: number, time: number, at: THREE.Vector3, gust: number) {
    const c = this.cave, L = c.layout, P = this.pos, S = this.seed;
    const wrap = (v: number, to: number, size: number) => to + ((((v - to) % size) + size * 1.5) % size) - size * 0.5;
    const rim = c.origin.y + L.cavern.y;
    for (let i = 0; i < DUST_N; i++) {
      const k = i * 6, big = S[k + 5] > 0.93;
      const speed = (5 + 13 * S[k + 3]) * (1 + 1.6 * gust);
      // Where it is: its own place in the box, carried up, swaying a little as it goes.
      const sway = 1.2 * Math.sin(time * (0.5 + S[k + 4]) + S[k] * 40);
      const x = wrap(S[k] * DUST_BOX + sway, at.x, DUST_BOX), z = wrap(S[k + 1] * DUST_BOX + 0.7 * sway, at.z, DUST_BOX);
      const y = wrap(S[k + 2] * DUST_H + time * speed, at.y, DUST_H);
      const [lx, lz] = c.local(x, z);
      const j = i * 9;
      // (Only out over the pit, and thinning out above the lips.)
      if (!L.inVoid(lx, lz) || L.sdf(lx, lz) > -3 || y > rim + 8 + 30 * S[k + 4]) { P.fill(0, j, j + 9); continue; }
      const r = big ? 0.16 + 0.2 * S[k + 4] : 0.035 + 0.07 * S[k + 4], spin = time * (2 + 5 * S[k + 3]) + S[k + 1] * 30;
      dA.set(Math.cos(spin), Math.sin(spin * 0.7), Math.sin(spin)).multiplyScalar(r);
      dB.set(Math.cos(spin + 2.1), Math.sin(spin * 0.7 + 2), Math.sin(spin + 2.1)).multiplyScalar(r);
      dC.set(Math.cos(spin + 4.2), Math.sin(spin * 0.7 + 4), Math.sin(spin + 4.2)).multiplyScalar(r);
      P[j] = x + dA.x; P[j + 1] = y + dA.y; P[j + 2] = z + dA.z;
      P[j + 3] = x + dB.x; P[j + 4] = y + dB.y; P[j + 5] = z + dB.z;
      P[j + 6] = x + dC.x; P[j + 7] = y + dC.y; P[j + 8] = z + dC.z;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}
