import * as THREE from 'three';
import { hashInt } from '../core/rng';
import { DUNGEON_U, makeDungeonMaterial, makeLanternMaterial, makePoolMaterial, makePortalMaterial, makeSolidMaterial, makeVeilMaterial, U, VEIL_ROCK, VEIL_U } from '../gfx/materials';
import type { BeastData } from '../mobs/beast';
import type { GlimmerAct } from '../mobs/glimmer';
import type { Mob } from '../mobs/types';
import type { Body, GallopState } from '../player/movement';
import type { Sfx } from '../story/audio';
import { Arm } from '../story/beacons';
import { bubbleCanvas, tex } from '../story/icons';
import { Billboard } from '../story/overlay';
import type { DungeonSite } from '../world/worldgen';
import { makeDarkLight } from './darkLight';
import { ARM_R, LANTERN_R, LIFT_R } from './layout';
import { PawTrail } from './pawTrail';
import { buildCaps, buildLanterns, buildShell } from './shell';
import { DASH, HIDE, VEIL_HALF, VeilLayout, type Veil } from './veilPlan';
import { buildVeilRock, buildVeils } from './veilShell';

// The second dungeon, inside: the Veil Cave, under the second ring. Its own
// scene, as dungeon 1's is (dungeon.ts), and let down into and lifted out of
// the same way. Its plan is drawn at the top of veilPlan.ts.
//
// A cave under a glimmerwood: teal where dungeon 1 is violet, moss on the
// floor, glowcaps in clumps. It has two kinds of wall. Rock, which nothing
// passes; and veils, thin sheets of pale stone hung like curtains, which
// light shows through and a phasing glimmer passes. That light shows
// through a thing is how you know she can go through it.
//
// What you do here: you come down on foot. A glimmer lives here, and she is
// bored, and you are something to play with. Follow me, three times, each
// won by walking up to her where she ends up: behind a short veil (walk
// round its end), among the glowcaps (her tail gives her away), and in a
// pocket no walking gets you into (she pokes her head back out through the
// stone to look at you, comes out, and offers her back). She is far faster
// than you: she runs to just before a veil, stops and looks back until you
// have her in sight, goes through it, and waits in the middle of the room
// beyond until you are in its doorway; then on to the next. Her prints
// stay alight on the floor and her mark in the veil, and the room she's in
// is alight when a veil is between you: that is how you follow. She never
// comes back for you; she waits. Then you ride her, and Space takes
// the two of you through veils: into the pocket, down the middle of the
// cavern through the rooms you walked round, out into the first cell again,
// and through the last veil to the dungeon's light. Taking it ends the
// dungeon; she carries you out through the veil in the well's wall.
// (That light was amber when this was written and is a dark light now,
// violet: darkLight.ts. The names here still say `amber` and `warm`.)

export interface CaveDeps {
  body: Body;
  sfx: Sfx;
  /** Switch the explorer's movement mode ('carried' while held, 'walk' after). */
  setMode(m: string): void;
  puff(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** Her own motes of light. */
  glow(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** The cave's glimmer, standing at `at` (she lives by the cave's floor and walls). */
  adopt(at: THREE.Vector3): Mob | null;
  /** The ride's state while you're on her (her phase, her speed). */
  gs: GallopState;
  /** Up on to her, wherever you are. */
  mount(m: Mob): void;
  saveKey: string;
}

/** How far under the ring it lies (m). */
const DEPTH = 60;
/** Being let down, let go of, reached for and lifted (s): as dungeon 1. */
const LOWER = 1.6, LET_GO = 0.5, REACH = 0.5, LIFT = 0.75;
const ARM = 1.4;
/** How far a foot steps up on to a stone (m). */
const STEP = 0.5;
const TAKE_R = 1.9;
const WAKE_R = 12, WAKE = 0.7;
/** Taking the light: how long the gladness lasts (s) and when its hops come. */
const WIN = 4.3, WIN_HOPS = [0.5, 1.35, 2.2];
/** The way out, in seconds from the gladness's end: the cut to the well, the cut lifting, a breath before she's off, how far short of the veil she starts (m), and how long the cut takes to come down once she's through. */
const OUT = { cut: 0.45, lift: 0.4, wait: 0.45, from: 20, veil: 0.35 };
/** Waiting in a room with no veil led through (dev): how near you come, nothing between you, before she runs on (m). */
const SEEN = 24;
/** Her head out through the pocket's veil: how near you come before she comes out to you (m). */
const PEEK_R = 12;
/** She's yours: how long she bounces about with a heart over her before she offers her back (s). */
const GLAD = 2.5;
/**
 * Where her head comes out, in turn: the room you stand in, and the shut cell she is in. Come up to her at any
 * but the last and she draws it in and is off to the next, a room further round; at the last she comes out.
 */
const PEEKS: [string, string][] = [['E2', HIDE], ['E3', 'P'], ['E4', 'P'], ['W4', 'P'], ['W3', 'P']];
/**
 * The second lap. Come up to her at this one of `PEEKS` and she comes out of the wall instead, and leads you
 * on through these rooms as she did the first two; from the last she goes into the wall for the next of `PEEKS`.
 */
const LAP_AT = 2, LAP = ['F', 'W4'];
/** How fast she goes: leading you (and through a veil), and following once she's yours (m/s). You run at 6.2. */
const PACE = { dash: 14, follow: 9 };
/**
 * Leading you: how far short of a veil she stops (m); how near you must be, with her in your sight, for her
 * to go through it; how long she looks back at you first (s); how far round she turns to do it (rad: side
 * on, her head does the rest); and how long the skip takes that each turn on the spot is made with (s).
 */
const LEAD = { brink: 3.4, veil: 32, look: 1.0, turn: 1.75, skip: 0.34 };
/** Her prints: how far apart (m). Her room alight when she's hidden: how far her light reaches then (m; 5.2 in the open). */
const PRINT = 0.95, ROOM_R = 11.5;
/** A hole she has made in a veil: how wide it opens (m), and how long the veil lets the camera lag behind it (s). */
const HOLE_R = 3.3, LAG = 1.1;

/** How the frame is finished in here: dark as dungeon 1 is dark, but teal. Never black. */
export const VEIL_LOOK = {
  fog: new THREE.Color('#12333d'),
  outline: new THREE.Color('#241a30'),
  tint: new THREE.Color('#52a0aa'),
  tintAmt: 0.68,
  lift: 0.03,
  air: { density: 0.024, start: 9, bands: 6, max: 0.88 },
  lit: new THREE.Color('#f1fffb'),
  mid: new THREE.Color('#9fd9d2'),
  shade: new THREE.Color('#47858e'),
  dark: [new THREE.Color('#a3d6d6'), new THREE.Color('#74b0b6'), new THREE.Color('#4f8c96')],
  near: [new THREE.Color('#f6fffb'), new THREE.Color('#c9e9e2'), new THREE.Color('#97c6c4')],
  dir: new THREE.Vector3(0.3, 0.86, 0.4).normalize(),
  /** The flat veil across the cut between above and below. */
  cut: '#17343c',
};

type Phase = 'lower' | 'letgo' | 'reach' | 'lift';
/** What she is doing: watching you arrive; on her way; hidden; her head through the stone; yours. */
type Play = 'watch' | 'go' | 'hide' | 'peek' | 'yours';

const v = new THREE.Vector3(), w = new THREE.Vector3();
const ss = THREE.MathUtils.smoothstep;

export class VeilCave {
  readonly scene = new THREE.Scene();
  readonly overlay = new THREE.Scene();
  readonly layout: VeilLayout;
  readonly origin: THREE.Vector3;
  readonly facing: number;
  readonly look = VEIL_LOOK;
  inside = false;
  onLeft: (() => void) | null = null;
  onWon: (() => void) | null = null;
  /** You have the warm light. */
  taken = false;
  /** Which game of hide and seek she is on (0, 1, 2), or 3: she's yours. Saved. */
  round = 0;
  /** The glimmer. */
  she: Mob | null = null;
  play: Play = 'watch';
  readonly lit: boolean[];
  readonly buildMs: { plan: number; mesh: number };
  private win = -1;
  /** The way out, in seconds since the gladness ended (or -1). */
  private exit = -1;
  private exitFrom = new THREE.Vector3();
  private exitDir = new THREE.Vector3();
  private exitGone = 0;
  private heart = new Billboard(tex(bubbleCanvas('heart')), 1.05, 52);
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
  private glowAt: THREE.Vector3[];
  private glowD: Float32Array;
  private glowR: Float32Array;
  private glowOrder: number[];
  private inLight = 0;
  /** Where you were last frame, in the plan (null after being put somewhere). */
  private prev: [number, number] | null = null;
  /** Veils she has just taken you through: open to the camera, a hole in each, until it has followed. */
  private pass: { v: Veil; t: number; r: number; at: THREE.Vector3 }[] = [];
  /** Her own way, in the plan, and what she does at the end of it. */
  private path: [number, number][] = [];
  private then: Play = 'hide';
  private playT = 0;
  private stall = 0;
  private stalls = 0;
  private callT = 3;
  private pose: GlimmerAct = { crouch: 0, low: 0, twitch: 0, shake: 0 };
  /** The veil her head is through, and where (the plan). */
  private peekAt: { v: Veil; x: number; z: number; out: number } | null = null;
  private balk = 0;
  /** How fast she was going last frame, ridden (m/s). */
  private pace = 0;
  private wake = 0;
  /** Leading you: she has stopped to look back for you; how far she has gone since the last veil (m). */
  private waiting = false;
  private sinceVeil = 99;
  /** The veil she last led you through, how near its gap you have been since, and what she goes back to from its doorway. */
  private lastVeil: Veil | null = null;
  /** How long she has looked back at you from before a veil (s). */
  private lookT = 0;
  /** Which of `PEEKS` she is at. */
  private peekN = 0;
  /** The rooms of the second lap she has still to lead you through (the first is where she's going, or is). */
  private lap: string[] = [];
  /** What's left of her gladness at being yours (s). */
  private glad = 0;
  /** How long she has stood before it, and how long since she began to turn back to it (s). */
  private brinkT = 0;
  private backT = 0;
  /** Her prints on the floor, and how far she has gone since the last (m; -1: she isn't leaving any). */
  private trail = new PawTrail();
  private printD = -1;
  /** The marks she has left in veils (the newest last). */
  private scars: { at: THREE.Vector3; k: number; going: boolean }[] = [];
  /** How hidden from you she is (0..1): a veil between you, and the game still on. Her room is alight by it. */
  private hidden = 0;
  /** Where the orbit camera should be put at once (a yaw), once: main takes it. */
  snapYaw: number | null = null;

  constructor(site: DungeonSite, seed: number, groundY: number, private d: CaveDeps) {
    const turn = (Math.PI * 2) / 9;
    this.facing = 0.2 + ((hashInt(5, 11, seed, 962) % 9) + 0.5) * turn;
    this.cos = Math.cos(this.facing);
    this.sin = Math.sin(this.facing);
    this.origin = new THREE.Vector3(site.x, groundY - DEPTH, site.z);
    const t0 = performance.now();
    const L = (this.layout = new VeilLayout(seed ^ 0x2b7e15));
    const t1 = performance.now();
    this.top = this.origin.clone().setY(this.origin.y + L.rooms[0].clear);
    this.root.position.copy(this.origin);
    this.root.rotation.y = -this.facing;
    this.root.updateMatrixWorld();
    const add = (g: THREE.BufferGeometry, m: THREE.Material) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      this.root.add(mesh);
      return mesh;
    };
    add(buildShell(L), makeDungeonMaterial(true, VEIL_ROCK));
    add(buildVeilRock(L), makeDungeonMaterial(false, VEIL_ROCK));
    add(buildVeils(L), makeVeilMaterial());
    add(buildCaps(L), makeSolidMaterial('#8fe9da', 0.5, { keep: 1 }));
    add(new THREE.CircleGeometry(site.r - 2.4, 56).rotateX(Math.PI / 2).translate(0, L.rooms[0].clear - 0.06, 0), makePortalMaterial(site.r - 2.4, { a: '#4aa3ad', b: '#84d6d2', lip: '#e2fff8' }));
    add(new THREE.CircleGeometry(L.pool.r + 3, 40).rotateX(-Math.PI / 2).translate(L.pool.x, L.pool.y, L.pool.z), makePoolMaterial('#2f6f7c', '#9fe0d8'));
    this.ember = makeDarkLight(0.4).mesh;
    this.root.add(this.ember);
    this.ember.position.set(L.ember.x, L.ember.y, L.ember.z);
    const lanterns = buildLanterns(L);
    this.lanternGeo = lanterns.geometry;
    this.lanternRanges = lanterns.ranges;
    add(this.lanternGeo, makeLanternMaterial({ dark: '#356774', glow: '#d2fff3', ink: '#10262c', lid: '#a6d8d2' }));
    this.lanternAt = L.lanterns.map((o) => this.world(o.x, o.y + 0.4, o.z));
    this.lit = L.lanterns.map(() => false);
    this.litK = new Float32Array(L.lanterns.length);
    // (One more than the plan's: her own light, which goes where she does.)
    this.glowAt = [...L.glows.map((g) => this.world(g.x, g.y, g.z)), new THREE.Vector3()];
    this.glowD = new Float32Array(L.glows.length + 1);
    this.glowR = new Float32Array(L.glows.length + 1);
    this.glowOrder = this.glowAt.map((_, i) => i);
    this.heart.alpha = 0;
    this.overlay.add(this.heart.mesh);
    this.scene.add(this.root, this.trail.mesh);
    try {
      const sv = JSON.parse(localStorage.getItem(`embla.dungeon2.${d.saveKey}`) ?? '{}');
      this.round = Math.max(0, Math.min(3, sv.round | 0));
      this.taken = !!sv.taken;
      for (const i of (sv.lit ?? []) as number[]) if (i < this.lit.length) { this.lit[i] = true; this.litK[i] = 1; this.paintLantern(i); }
    } catch { /* no storage: she hasn't met you */ }
    this.buildMs = { plan: t1 - t0, mesh: performance.now() - t1 };
    this.world(L.ember.x, L.ember.y, L.ember.z, this.emberAt);
    const ink = makeSolidMaterial('#191424', 0, { keep: 1, flat: 0.5 });
    this.arms = [new Arm(ink), new Arm(ink)];
    this.scene.add(this.arms[0].group, this.arms[1].group);
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

  private paintLantern(i: number) {
    const a = this.lanternGeo.attributes.aLit as THREE.BufferAttribute, [from, to] = this.lanternRanges[i];
    (a.array as Float32Array).fill(this.litK[i], from, to);
    a.needsUpdate = true;
  }

  /** The dungeon's creature, for whoever asks which (main). */
  get creature() { return this.she; }
  /** She has offered her back: E by her gets you on. */
  get mountable() { return this.round >= 3 && this.exit < 0 && this.glad <= 0; }

  /** The cave's light and rock, into the shared uniforms (every frame you're inside). As dungeon 1's, with her light added. */
  applyLight(cam: THREE.Vector3) {
    const k = VEIL_LOOK, b = this.d.body.pos;
    DUNGEON_U.cLit.value.copy(k.lit);
    DUNGEON_U.cMid.value.copy(k.mid);
    DUNGEON_U.cShade.value.copy(k.shade);
    DUNGEON_U.uOrigin.value.copy(this.origin);
    DUNGEON_U.uMark.value = LIFT_R;
    const g = this.layout.glows, slots = DUNGEON_U.uGlows.value, N = slots.length, n1 = g.length;
    for (let i = 0; i < n1; i++) {
      const o = g[i];
      let r = o.r;
      if (o.warm) { r = (this.taken && this.win < 0 ? 4.5 : this.taken ? 8 : o.r) * (1 + 0.04 * Math.sin(this.time * 2.3)) * (1 + 1.1 * this.cheer); this.glowAt[i].copy(this.emberAt); }
      else if (o.lantern !== undefined) { const q = this.litK[o.lantern]; r = LANTERN_R * q * (2 - q) * (1 + 0.025 * Math.sin(this.time * 1.7 + o.lantern * 2.4)) * (1 + 0.3 * this.cheer); }
      this.glowR[i] = r;
      this.glowD[i] = r < 0.05 ? 1e9 : i === 0 ? -1e9 : Math.max(0, cam.distanceTo(this.glowAt[i]) - r);
    }
    // Her own light: a small pool that goes where she goes.
    const m = this.she;
    // (Hidden from you behind a veil, it fills the room she's in.)
    if (m) { this.glowAt[n1].set(m.pos.x, m.pos.y + 1.5 + 1.5 * this.hidden, m.pos.z); this.glowR[n1] = (5.2 + (ROOM_R - 5.2) * this.hidden) * (1 + 0.05 * Math.sin(this.time * 3.1)); this.glowD[n1] = Math.max(0, cam.distanceTo(this.glowAt[n1]) - 12 - 30 * this.hidden); }
    else this.glowD[n1] = 1e9;
    this.glowOrder.sort((p, q) => this.glowD[p] - this.glowD[q]);
    const cut = this.glowOrder.length > N ? this.glowD[this.glowOrder[N]] : 1e9;
    let n = 0, light = 0;
    for (; n < Math.min(N, this.glowOrder.length); n++) {
      const i = this.glowOrder[n];
      if (this.glowD[i] > 1e8) break;
      const fade = cut > 1e8 || i === 0 ? 1 : 1 - ss(this.glowD[i], cut * 0.75, cut);
      const r = this.glowR[i] * fade, at = this.glowAt[i];
      slots[n].set(at.x, at.y, at.z, i < n1 && g[i].warm ? -r : r);
      if (r > 0.1) light = Math.max(light, 1 - ss(Math.hypot(b.x - at.x, b.z - at.z), r * 0.55, r * 1.05));
    }
    DUNGEON_U.uGlowN.value = n;
    this.inLight += (light - this.inLight) * 0.12;
    U.uLightDir.value.copy(k.dir);
    U.uLightCol.value.copy(k.dark[0]).lerp(k.near[0], this.inLight);
    U.uMidCol.value.copy(k.dark[1]).lerp(k.near[1], this.inLight);
    U.uShadeCol.value.copy(k.dark[2]).lerp(k.near[2], this.inLight);
    // (As after dark above: her spots, her ears and her tail are alight down here.)
    U.uNight.value = 1;
  }

  floorAt(x: number, z: number, feetY = -Infinity): number {
    const [lx, lz] = this.local(x, z);
    const f = this.origin.y + this.layout.floor(lx, lz);
    let top = f;
    for (const o of this.layout.solids) {
      const R = o.r * 0.8, dist = Math.hypot(lx - o.x, lz - o.z);
      if (o.top > 50 || dist > R) continue;
      const s = f + o.top * 0.82 * (1 - (dist / R) ** 4);
      if (s <= feetY + STEP) top = Math.max(top, s);
    }
    return top;
  }

  /**
   * Keep a body of radius `r` inside the rock, out of what stands on the
   * floor, and on its own side of every veil. `ghost`: a glimmer phasing,
   * which the veils don't stop. Rock stops her like anything else.
   */
  collide(pos: THREE.Vector3, vel: THREE.Vector3, r: number, ghost = false) {
    const L = this.layout;
    let [lx, lz] = this.local(pos.x, pos.z);
    const out = (nx: number, nz: number, by: number) => {
      lx -= nx * by; lz -= nz * by;
      const wx = nx * this.cos - nz * this.sin, wz = nx * this.sin + nz * this.cos;
      const into = vel.x * wx + vel.z * wz;
      if (into > 0) { vel.x -= wx * into; vel.z -= wz * into; }
    };
    for (let i = 0; i < 2; i++) {
      const dist = L.sdf(lx, lz);
      if (dist <= -r) break;
      const [gx, gz] = L.grad(lx, lz);
      out(gx, gz, dist + r);
    }
    const feet = pos.y - this.origin.y - L.floor(lx, lz);
    for (const o of L.solids) {
      const dx = lx - o.x, dz = lz - o.z, dist = Math.hypot(dx, dz);
      if (dist >= o.r + r || dist < 1e-4 || feet + STEP >= o.top * 0.82) continue;
      out(-dx / dist, -dz / dist, o.r + r - dist);
    }
    if (!ghost) for (const q of L.veils) {
      const dist = L.toVeil(q, lx, lz);
      if (dist >= r + VEIL_HALF) continue;
      // Back to whichever side you're on.
      const s = L.signed(q, lx, lz) >= 0 ? 1 : -1;
      out(-q.nx * s, -q.nz * s, r + VEIL_HALF - Math.abs(L.signed(q, lx, lz)));
    }
    this.world(lx, 0, lz, v);
    pos.x = v.x; pos.z = v.z;
    const roof = this.origin.y + L.ceil(lx, lz) - 2.3;
    if (pos.y > roof) { pos.y = roof; if (vel.y > 0) vel.y = 0; }
  }

  /** Nothing here is done with a tool. */
  action(_mode: string): null { return null; }
  act(_mode: string) { return false; }

  private save() {
    try { localStorage.setItem(`embla.dungeon2.${this.d.saveKey}`, JSON.stringify({ round: this.round, taken: this.taken, lit: this.lit.flatMap((on, i) => (on ? [i] : [])) })); } catch { /* ignore */ }
  }

  /**
   * The camera stays in the cave, as in dungeon 1 (drawn in along its line
   * to you until it's clear of rock; quick in, slow out). A veil stops it
   * like rock, except one she has just taken you through. That one is open
   * to it, with a hole in the stone where the camera's line to you crosses
   * (her light running round its rim), until the camera has come through
   * after you; so a dash is followed straight through, and you are never
   * hidden behind what you just passed. If you stop short on the far side
   * and the camera is still behind, the veil draws it through after `LAG`.
   */
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
    // The veils.
    const [fx, fz] = this.local(focus.x, focus.z), [cx, cz] = this.local(cam.x, cam.z);
    let slow = false;
    for (const q of L.veils) {
      const p = this.pass.find((o) => o.v === q);
      if (p && p.t < LAG) continue;
      const t = L.cross(q, fx, fz, cx, cz, 0.6);
      if (t < 0) continue;
      const to = Math.max(0.06, t - 0.8 / Math.max(len, 0.01));
      if (to < k) { k = to; slow = !!p; }
    }
    // (Drawn through a veil she opened, it comes at a walk, not a snap.)
    const rate = k < this.camK ? (slow ? 4.5 : 14) : 1.4 / (1 + speed * 0.45);
    this.camK += (k - this.camK) * (1 - Math.exp(-rate * dt));
    if (this.camK < 0.999) cam.lerpVectors(focus, cam, this.camK);
    // The holes: each where the camera's line to you crosses its veil; shut once the camera is on your side of it.
    const eye = cam, [qx, qz] = this.local(eye.x, eye.z);
    for (let i = this.pass.length - 1; i >= 0; i--) {
      const p = this.pass[i];
      p.t += dt;
      const t = L.cross(p.v, qx, qz, fx, fz, 6);
      if (t >= 0) { p.at.lerpVectors(eye, focus, t); p.r = Math.min(HOLE_R, p.r + dt * 30); }
      else { p.r -= dt * 11; if (p.r <= 0) this.pass.splice(i, 1); }
    }
    const holes = VEIL_U.uHole.value;
    for (let i = 0; i < holes.length; i++) {
      const p = this.pass[i];
      if (p) holes[i].set(p.at.x, p.at.y, p.at.z, p.r);
      else if (i === 1 && this.peekAt && this.play === 'peek') {
        // Her head, through the stone.
        const a = this.peekAt;
        this.world(a.x, L.floor(a.x, a.z) + 1.62, a.z, v);
        holes[i].set(v.x, v.y, v.z, 0.62 * ss(this.playT, 0, 0.25));
      } else holes[i].w = 0;
    }
  }

  /** She has taken you through this one: it's open to the camera until that has followed. */
  private openPass(q: Veil) {
    if (this.pass.some((o) => o.v === q)) return;
    if (this.pass.length >= 2) this.pass.shift();
    const b = this.d.body.pos;
    this.pass.push({ v: q, t: 0, r: 1.5, at: new THREE.Vector3(b.x, b.y + 1.4, b.z) });
    this.d.sfx.shimmer();
    this.d.glow(v.set(b.x, b.y + 1.2, b.z), 10, 0.14, 2.6);
  }

  /** Where she waits on each of her three goes (the middle of the room past the first veil; of the one past the second; the shut cell beside that), and when she's yours (by the mark in the well). */
  private spot(round: number): [number, number] {
    const A = this.layout.at;
    return round === 0 ? A.E1 : round === 1 ? A.E2 : round === 2 ? A.spot3 : [Math.cos(this.layout.door) * 5.5, Math.sin(this.layout.door) * 5.5];
  }

  /** Stand her somewhere, at once. */
  private put(x: number, z: number, heading?: number) {
    const m = this.she;
    if (!m) return;
    this.world(x, this.layout.floor(x, z), z, m.pos);
    m.vel.set(0, 0, 0);
    m.stay.copy(m.pos);
    m.grounded = true;
    if (heading !== undefined) m.heading = heading;
    this.path.length = 0;
  }

  /** Where she is as you come down: by where the story stands. */
  private placeHer() {
    const L = this.layout, m = this.she;
    if (!m || m.ridden) return;
    this.stall = this.stalls = 0;
    this.playT = 0;
    this.peekAt = null;
    this.peekN = 0;
    this.lap = [];
    this.waiting = false;
    this.forget(true);
    m.stabled = this.round >= 3;
    if (this.round < 3) {
      // In the mouth of the way on, looking back at you; she leads you from there to wherever the game has got to.
      this.put(L.at.door[0], L.at.door[1], this.yawOf(-Math.cos(L.door), -Math.sin(L.door)));
      this.play = 'watch';
    } else {
      const [x, z] = this.spot(3);
      this.put(x, z, this.yawOf(-Math.cos(L.door), -Math.sin(L.door)));
      this.play = 'yours';
    }
  }

  /** Send her to a point of the plan by the comb's ways, and say what she does there. */
  private send(x: number, z: number, then: Play, through?: string) {
    const m = this.she!, L = this.layout, [hx, hz] = this.local(m.pos.x, m.pos.z);
    // (`through`: by way of that cell's middle, so she is seen to go that way.)
    const mid = through ? L.at[through] : null;
    // (Leading you, she keeps to where you can follow: round the ring, never through a shut cell. Only the last veil, into the pocket, is one you can't get round.)
    const walk = then === 'hide';
    this.path = mid ? [...L.route(hx, hz, mid[0], mid[1], walk).slice(1), ...L.route(mid[0], mid[1], x, z).slice(1)] : L.route(hx, hz, x, z, walk).slice(1);
    this.then = then;
    this.play = 'go';
    this.waiting = false;
    this.sinceVeil = 99;
    this.lastVeil = null;
    this.stall = 0;
  }

  /** The veil she is about to come to on her way, within `reach` m along it (or null). */
  private veilAhead(reach: number): Veil | null {
    const m = this.she!, L = this.layout;
    let [x, z] = this.local(m.pos.x, m.pos.z), left = reach;
    for (let i = 0; i < this.path.length && left > 0; i++) {
      const [tx, tz] = this.path[i], dl = Math.hypot(tx - x, tz - z) || 1e-6, k = Math.min(1, left / dl);
      const qx = x + (tx - x) * k, qz = z + (tz - z) * k, hit = L.firstVeil(x, z, qx, qz);
      if (hit) return hit.v;
      left -= dl * k;
      x = qx; z = qz;
    }
    return null;
  }

  /** Her prints and her marks in the veils go out (`now`: at once). */
  private forget(now = false) {
    this.trail.fade();
    for (const o of this.scars) o.going = true;
    if (now) { this.scars.length = 0; for (const u of VEIL_U.uScar.value) u.w = 0; }
    this.printD = -1;
  }

  /** A step of her way. True when she's there. `lay`: she leaves her prints, and a mark in any veil she goes through. */
  private run(dt: number, speed: number, lay = false): boolean {
    const m = this.she!, L = this.layout;
    let [x, z] = this.local(m.pos.x, m.pos.z), left = speed * dt;
    const x0 = x, z0 = z;
    while (left > 0 && this.path.length) {
      const [tx, tz] = this.path[0], dl = Math.hypot(tx - x, tz - z);
      if (dl <= left) { x = tx; z = tz; left -= dl; this.path.shift(); continue; }
      x += ((tx - x) / dl) * left; z += ((tz - z) / dl) * left;
      left = 0;
    }
    const dx = x - x0, dz = z - z0, dl = Math.hypot(dx, dz);
    if (dl > 1e-5) {
      const yaw = this.yawOf(dx, dz);
      m.heading += Math.atan2(Math.sin(yaw - m.heading), Math.cos(yaw - m.heading)) * (1 - Math.exp(-12 * dt));
      // Through a veil: she glimmers, thin and flickering, from a little before it to a little after.
      const ux = dx / dl, uz = dz / dl;
      if (L.firstVeil(x - ux * 1.6, z - uz * 1.6, x + ux * 2.4, z + uz * 2.4)) m.ghost = 0.12;
      const hit = L.firstVeil(x0, z0, x, z);
      if (hit) {
        this.d.sfx.shimmer();
        this.d.glow(v.copy(m.pos).setY(m.pos.y + 1), 9, 0.13, 2.4);
        this.sinceVeil = 0;
        if (lay) {
          this.lastVeil = hit.v;
          const cx = x0 + (x - x0) * hit.t, cz = z0 + (z - z0) * hit.t;
          if (this.scars.filter((o) => !o.going).length >= VEIL_U.uScar.value.length) this.scars.find((o) => !o.going)!.going = true;
          this.scars.push({ at: this.world(cx, L.floor(cx, cz) + 1.3, cz), k: 0, going: false });
        }
      } else this.sinceVeil += dl;
      if (lay) {
        if (this.printD < 0) this.printD = PRINT;
        this.printD += dl;
        if (this.printD >= PRINT) {
          this.printD = 0;
          this.world(x, L.floor(x, z), z, v);
          const wx = ux * this.cos - uz * this.sin, wz = ux * this.sin + uz * this.cos;
          this.trail.drop(v, wx, wz);
        }
      }
    }
    this.world(x, L.floor(x, z), z, m.pos);
    const sp = dl / Math.max(dt, 1e-4);
    m.vel.set(Math.sin(m.heading) * sp, 0, Math.cos(m.heading) * sp);
    return !this.path.length;
  }

  /** Her voice, quieter the farther off she is. */
  private voice(what: 'chirp' | 'glad' | 'coo' | 'call' | 'nope') {
    const m = this.she, fx = this.d.sfx;
    if (!m) return;
    const far = m.pos.distanceTo(this.d.body.pos), was = fx.level;
    fx.level = was * (1 - 0.85 * ss(far, 12, 70));
    if (what === 'chirp') fx.chirp(); else if (what === 'glad') fx.chirp(true); else fx[what]();
    fx.level = was;
  }

  /**
   * Follow me. She is driven from here (`puppet`); her species only animates
   * her. She runs from veil to veil far faster than you can, looks back
   * before each until you can see her, and waits beyond it in the middle of
   * the room until you're in its doorway. She doesn't come back for you: her
   * prints and her marks are the way. Finding her is walking up to her in
   * the grove; the first room she only waits in, and the pocket she comes
   * out of.
   */
  private playHer(dt: number, mode: string) {
    const m = this.she;
    if (!m) return;
    const L = this.layout, b = this.d.body, data = m.data as BeastData;
    m.puppet = true;
    m.ghost = Math.max(0, (m.ghost ?? 0) - dt);
    // Her lights, for the veils: her ears, her spine, the tip of her tail.
    {
      const fx = Math.sin(m.heading), fz = Math.cos(m.heading), sh = VEIL_U.uShe.value, on = m.ridden ? 0 : 1;
      sh[0].set(m.pos.x + fx * 0.85, m.pos.y + 1.78, m.pos.z + fz * 0.85, on);
      sh[1].set(m.pos.x, m.pos.y + 1.32, m.pos.z, on * 0.92);
      sh[2].set(m.pos.x - fx * 1.3, m.pos.y + 1.5, m.pos.z - fz * 1.3, on);
    }
    const act = this.pose, e = 1 - Math.exp(-7 * dt);
    act.shake = Math.max(0, act.shake - dt * 1.7);
    act.twitch = 0;
    m.hop = 0;
    data.s.act = act;
    // Her prints, and her marks in the veils.
    this.trail.update(dt);
    for (let i = this.scars.length - 1; i >= 0; i--) {
      const o = this.scars[i];
      o.k = o.going ? o.k - dt * 1.6 : Math.min(1, o.k + dt * 3.5);
      if (o.k <= 0) this.scars.splice(i, 1);
    }
    VEIL_U.uScar.value.forEach((u, i) => { const o = this.scars[this.scars.length - 1 - i]; if (o) u.set(o.at.x, o.at.y, o.at.z, o.k * (2 - o.k)); else u.w = 0; });
    if (m.ridden) {
      act.crouch += (0 - act.crouch) * e; act.low += (0 - act.low) * e;
      this.play = 'yours';
      this.path.length = 0;
      this.hidden = 0;
      VEIL_U.uHer.value.w = 0;
      if (this.printD >= 0 || this.scars.length) this.forget();
      return;
    }
    const [px, pz] = this.local(b.pos.x, b.pos.z), [hx, hz] = this.local(m.pos.x, m.pos.z);
    const far = Math.hypot(px - hx, pz - hz), level = Math.abs(b.pos.y - m.pos.y) < 3;
    /** Nothing between the two of you but air. */
    const clear = () => !L.firstVeil(px, pz, hx, hz);
    const held = !!this.seq || this.win >= 0 || this.exit >= 0;
    const face = (x: number, z: number, rate = 6) => { const yaw = this.yawOf(x - hx, z - hz); m.heading += Math.atan2(Math.sin(yaw - m.heading), Math.cos(yaw - m.heading)) * (1 - Math.exp(-rate * dt)); };
    data.lookAt = far < 45 ? b.pos : null;
    this.playT += dt;
    // A veil between the two of you while the game is on: her room is alight, and she shows through as more than three small lights.
    this.hidden += ((this.round < 3 && this.play !== 'watch' && !clear() ? 1 : 0) - this.hidden) * (1 - Math.exp(-3.5 * dt));
    VEIL_U.uHer.value.set(m.pos.x, m.pos.y + 1.6, m.pos.z, this.hidden < 0.02 ? 0 : this.hidden);
    let crouch = 0, low = 0;
    /** She has led you through a veil: have you come round it, into its doorway or past, with nothing between you? */
    const through = () => { const q = this.lastVeil; return !q ? clear() && far < SEEN : clear() && L.signed(q, px, pz) * Math.sign(L.signed(q, hx, hz)) > -4; };
    switch (this.play) {
      case 'watch': {
        // Two bright eyes in the mouth of the way on. When you're let go and step toward her (or soon anyway), she's off.
        m.vel.set(0, 0, 0);
        face(px, pz);
        if (held) { this.playT = 0; break; }
        if (far < 9 || this.playT > 4.5) {
          this.voice('chirp');
          const [x, z] = this.spot(this.round);
          this.send(x, z, 'hide', this.round === 2 ? 'E2' : undefined);
        }
        break;
      }
      case 'go': {
        if (this.then !== 'hide') {
          // Out to you, or after you: straight there.
          if (this.run(dt, this.then === 'yours' ? PACE.follow : PACE.dash)) {
            this.play = this.then;
            this.playT = 0;
            this.stall = 0;
            m.vel.set(0, 0, 0);
            if (this.play === 'peek') { this.voice('coo'); this.d.glow(v.copy(m.pos).setY(m.pos.y + 1.5), 7, 0.1, 1.6); }
            if (this.play === 'yours') this.offer();
          }
          break;
        }
        // Leading you to where she hides, far faster than you can run; her prints say where she went.
        const brink = this.veilAhead(LEAD.brink), c = L.cell(L.cellAt(hx, hz));
        if (this.lastVeil && through()) this.lastVeil = null;
        /** Turn toward a heading; how far off it she still is. */
        const turn = (to: number, rate: number) => { const d = Math.atan2(Math.sin(to - m.heading), Math.cos(to - m.heading)); m.heading += d * (1 - Math.exp(-rate * dt)); return Math.abs(d); };
        /** The little skip a turn on the spot is made with. */
        const skip = (t: number) => (t > 0 && t < LEAD.skip ? 0.3 * Math.sin((Math.PI * t) / LEAD.skip) : 0);
        // (Only at the first veil: after that you know how it goes, and she runs straight through.)
        if (brink && this.round === 0) {
          // Right before a veil she stops, skips half round (side on, no further: her head does the rest) and looks
          // back at you. When you have had her in sight a moment she skips back round to face the veil, and only
          // then, the turn done, goes through it.
          const fwd = this.yawOf(this.path[0][0] - hx, this.path[0][1] - hz);
          m.vel.set(0, 0, 0);
          this.waiting = true;
          if (this.lookT < LEAD.look) {
            this.brinkT += dt;
            const you = this.yawOf(px - hx, pz - hz), off = THREE.MathUtils.clamp(Math.atan2(Math.sin(you - fwd), Math.cos(you - fwd)), -LEAD.turn, LEAD.turn);
            turn(fwd + off, 6);
            m.hop = skip(this.brinkT - 0.08);
            if (clear() && far < LEAD.veil && !held && this.brinkT > 0.6) this.lookT += dt;
            this.backT = 0;
          } else {
            this.backT += dt;
            m.hop = skip(this.backT);
            if (turn(fwd, 10) < 0.08 && this.backT > LEAD.skip + 0.08) this.waiting = false;
          }
          if (this.waiting) break;
        } else {
          // Through one, she goes to the middle of the room beyond and waits there until you are in its doorway.
          this.lookT = this.brinkT = this.backT = 0;
          // (Not where the middle is itself the end of her way: there she is `hide`.)
          this.waiting = !!this.lastVeil && !!c && Math.hypot(hx - c.x, hz - c.z) < 1.2 && Math.hypot(this.path[0][0] - c.x, this.path[0][1] - c.z) > 1.5;
          if (this.waiting) { m.vel.set(0, 0, 0); face(px, pz, 4); break; }
        }
        if (this.run(dt, PACE.dash, true)) {
          this.play = 'hide';
          this.playT = 0;
          m.vel.set(0, 0, 0);
          this.voice('coo');
        }
        break;
      }
      case 'hide': {
        m.vel.set(0, 0, 0);
        face(px, pz, 3);
        if (held) break;
        // The first two rooms she only waits in: the moment you are in the doorway, round the veil's end, she's off to the next veil.
        if (this.round < 2 && level && through()) {
          this.round++;
          this.save();
          this.forget();
          this.voice('glad');
          m.happy = 1.2;
          const [x, z] = this.spot(this.round);
          this.send(x, z, 'hide');
          break;
        }
        // The second lap: the same in each of its rooms; and from the last of them, into the wall of the shut cell beside it.
        const here = L.cell(L.cellAt(hx, hz));
        if (this.round === 2 && this.lap.length && here && here.ring >= 0) {
          if (!level || !through()) break;
          this.lap.shift();
          this.forget();
          this.voice('glad');
          if (this.lap.length) { const [x, z] = L.at[this.lap[0]]; this.send(x, z, 'hide'); break; }
          const [ring, shut] = PEEKS[++this.peekN], q = L.veil(`${ring}-${shut}`), sg = q.to === shut ? 1 : -1;
          this.send((q.ax + q.bx) / 2 + q.nx * sg * 4.5, (q.az + q.bz) / 2 + q.nz * sg * 4.5, 'hide');
          break;
        }
        // The pocket. A moment after she has gone in, her head comes back out through the stone where she went
        // through, and stays there looking at you: that is where she went. (Put there without having led you,
        // she comes to whichever of its veils you come near.)
        if (this.round === 2 && this.playT > 0.9 && here && here.ring < 0) {
          const cell = L.cellAt(px, pz), went = this.lastVeil, HIDE = PEEKS[this.peekN][1];
          for (const q of L.veils) {
            const other = q.from === HIDE ? q.to : q.to === HIDE ? q.from : '';
            if (!other || L.cell(other)!.ring < 0) continue;
            if (went ? q !== went : other !== cell || L.toVeil(q, px, pz) > 13) continue;
            const [ox, oz] = went ? [hx, hz] : [px, pz];
            const u = THREE.MathUtils.clamp(((ox - q.ax) * (q.bx - q.ax) + (oz - q.az) * (q.bz - q.az)) / q.len, 6.5, q.len - 6.5), out = q.to === HIDE ? -1 : 1;
            const x = q.ax + ((q.bx - q.ax) / q.len) * u, z = q.az + ((q.bz - q.az) / q.len) * u;
            this.peekAt = { v: q, x, z, out };
            this.path = [[x - q.nx * out * 0.55, z - q.nz * out * 0.55]];
            this.then = 'peek';
            this.play = 'go';
            break;
          }
          if (this.play !== 'hide') break;
        }
        // Calling, now and then, so there's something to walk toward.
        if ((this.callT -= dt) < 0 && far < 80) { this.voice('chirp'); this.callT = 6 + 3 * Math.abs(Math.sin(this.time * 3.7)); }
        break;
      }
      case 'peek': {
        // Her head back through the stone, looking at you; then out she comes.
        const a = this.peekAt!;
        m.vel.set(0, 0, 0);
        const yaw = this.yawOf(a.v.nx * a.out, a.v.nz * a.out);
        m.heading += Math.atan2(Math.sin(yaw - m.heading), Math.cos(yaw - m.heading)) * (1 - Math.exp(-10 * dt));
        // (She stays so until you have come up to her.)
        if (this.playT > 1.6 && far < PEEK_R && !held && this.peekN === LAP_AT) {
          // Not yet, again! Out of the wall she comes, right by you, and away through the next veil: another lap,
          // two more rooms to follow her through, before she goes into a wall again.
          this.lap = [...LAP];
          const ox = a.x + a.v.nx * a.out * 4.4, oz = a.z + a.v.nz * a.out * 4.4, [tx, tz] = L.at[LAP[0]];
          this.forget();
          this.send(tx, tz, 'hide');
          this.path = [[ox, oz], ...L.route(ox, oz, tx, tz, true).slice(1)];
          this.voice('glad');
          this.d.glow(v.copy(m.pos).setY(m.pos.y + 1.5), 9, 0.12, 2.2);
          break;
        }
        if (this.playT > 1.6 && far < PEEK_R && !held && this.peekN < PEEKS.length - 1) {
          // Not yet! Her head goes back in, and off she runs inside the shut cells, her light going along behind
          // the stone, to put it out again through a wall a room further round.
          const [ring, shut] = PEEKS[++this.peekN], q = L.veil(`${ring}-${shut}`), c = L.cell(ring)!;
          const u = THREE.MathUtils.clamp(((c.x - q.ax) * (q.bx - q.ax) + (c.z - q.az) * (q.bz - q.az)) / q.len, 6.5, q.len - 6.5), out = q.to === shut ? -1 : 1;
          const x = q.ax + ((q.bx - q.ax) / q.len) * u, z = q.az + ((q.bz - q.az) / q.len) * u;
          this.peekAt = { v: q, x, z, out };
          const tx = x - q.nx * out * 0.55, tz = z - q.nz * out * 0.55;
          // (Back from the wall first, so she is seen to draw her head in.)
          this.path = [[hx - a.v.nx * a.out * 3, hz - a.v.nz * a.out * 3], ...L.route(hx, hz, tx, tz).slice(1)];
          this.then = 'peek';
          this.play = 'go';
          this.forget();
          this.voice('glad');
          this.d.glow(v.copy(m.pos).setY(m.pos.y + 1.5), 9, 0.12, 2.2);
          break;
        }
        if (this.playT > 1.6 && far < PEEK_R && !held) {
          this.round = 3;
          this.save();
          this.forget();
          this.path = [[a.x + a.v.nx * a.out * 4.4, a.z + a.v.nz * a.out * 4.4]];
          this.then = 'yours';
          this.play = 'go';
        }
        break;
      }
      case 'yours': {
        // Down on folded legs, her back offered. She won't be left behind: wander off and she comes after you.
        m.vel.set(0, 0, 0);
        if (this.glad > 0) {
          // Yours! Three bounces and a turn about, a heart over her: the one time she does it. Then down she goes.
          const t = GLAD - this.glad, hop = (at: number, h: number, len = 0.42) => { const u = (t - at) / len; return u > 0 && u < 1 ? h * 4 * u * (1 - u) : 0; };
          this.glad -= dt;
          m.hop = hop(0.15, 0.6) + hop(0.65, 0.6) + hop(1.15, 0.95, 0.5);
          if (t < 1.15) face(px, pz, 9); else if (t < 1.85) m.heading += dt * 9; else face(px, pz, 9);
          act.twitch = 1;
          const show = t > 0.1 && this.glad > 0.3 ? 1 : 0;
          this.heart.alpha += (show - this.heart.alpha) * (1 - Math.exp(-8 * dt));
          this.heart.scale = (0.6 + 0.4 * this.heart.alpha) * (1 + 0.1 * Math.sin(t * 7));
          this.heart.pos.set(m.pos.x, m.pos.y + 2.5 + (m.hop ?? 0), m.pos.z);
          if (this.glad <= 0) this.heart.alpha = 0;
          break;
        }
        crouch = 1;
        face(px, pz, 4);
        if (held) break;
        const lost = far > 15 || !clear();
        this.stall = lost ? this.stall + dt : 0;
        if (this.stall > (far > 30 ? 0.4 : 2.2)) {
          // To a few steps short of you.
          const r = L.route(hx, hz, px, pz), n = r.length, [ax, az] = r[n - 2], dl = Math.hypot(px - ax, pz - az) || 1, back = Math.min(3.6, dl * 0.6);
          r[n - 1] = [px - ((px - ax) / dl) * back, pz - ((pz - az) / dl) * back];
          this.path = r.slice(1);
          this.then = 'yours';
          this.play = 'go';
        }
        break;
      }
    }
    act.crouch += (crouch - act.crouch) * (1 - Math.exp(-5 * dt));
    act.low += (low - act.low) * (1 - Math.exp(-5 * dt));
  }

  /** She's yours: saddled, down on her legs, glad. */
  private offer() {
    const m = this.she!;
    if (m.stabled) return;
    m.stabled = true;
    m.happy = GLAD;
    this.glad = GLAD;
    this.d.sfx.fanfare(0.15);
    this.d.glow(v.copy(m.pos).setY(m.pos.y + 1.4), 10, 0.13, 2.4);
  }

  /** Riding her: a veil near by wakes; Space at rock is a shake of the head. */
  private ride(dt: number, mode: string, px: number, pz: number) {
    const b = this.d.body, L = this.layout, gs = this.d.gs, on = mode === 'ride' && !!this.she?.ridden;
    this.wake += ((on ? 1 : 0) - this.wake) * (1 - Math.exp(-4 * dt));
    VEIL_U.uWake.value.set(b.pos.x, b.pos.y + 1.2, b.pos.z, this.wake);
    this.balk = Math.max(0, this.balk - dt);
    if (!on || this.exit >= 0) return;
    const wx = Math.sin(b.heading), wz = Math.cos(b.heading), dx = wx * this.cos + wz * this.sin, dz = -wx * this.sin + wz * this.cos;
    if (gs.fx === 'phase') {
      // What's ahead of her: a veil (through it), open floor (a plain dash), or rock.
      const reach = DASH + 1, rock = L.rockAhead(px, pz, dx, dz, reach), hit = L.firstVeil(px, pz, px + dx * reach, pz + dz * reach);
      if (rock < reach && rock < (hit ? hit.t * reach : Infinity)) {
        // Rock: she won't. It costs nothing: she pulls up short of it and shakes her head.
        gs.phase = 0;
        gs.cool = 0.35;
        gs.fx = null;
        // (At the pace she was going, not the dash's.)
        gs.speed = Math.min(gs.speed, this.pace);
        this.balk = 0.6;
        this.pose.shake = 1;
        this.d.sfx.nope();
      }
    }
    if (this.balk > 0) gs.speed = Math.min(gs.speed, Math.max(0, (L.rockAhead(px, pz, dx, dz, 14) - 1.1) * 3));
    this.pace = Math.abs(gs.speed);
  }

  /** The ring has let go of you above: the arms let you down through the well's ceiling. */
  enter() {
    const b = this.d.body, L = this.layout;
    if (!this.she) {
      this.she = this.d.adopt(this.world(L.at.door[0], L.floor(L.at.door[0], L.at.door[1]), L.at.door[1]));
      if (this.she) (this.she.data as BeastData).s.act = this.pose;
    }
    this.inside = true;
    this.armed = false;
    this.camK = 1;
    this.prev = null;
    this.pass.length = 0;
    this.placeHer();
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
    this.world(x, this.layout.floor(x, z), z, this.d.body.pos);
    this.d.setMode('walk');
    this.hideArms();
  }

  /** Dev: stand at one of the plan's named places (`layout.at`), or at a point of it. */
  goTo(name: string | [number, number]) {
    const p = typeof name === 'string' ? this.layout.at[name] : name;
    if (!p || !this.inside) return false;
    this.world(p[0], this.layout.floor(p[0], p[1]), p[1], this.d.body.pos);
    this.d.body.vel.set(0, 0, 0);
    this.prev = null;
    return true;
  }

  /** Dev: every lantern awake (or asleep again). */
  debugLight(on = true) {
    this.lit.forEach((_, i) => { this.lit[i] = on; this.litK[i] = on ? 1 : 0; this.paintLantern(i); });
  }

  /** Dev: the game as it stands at round `n` (0, 1, 2: she's hiding there; 3: she's yours), her put where that has her. */
  debugRound(n: number) {
    this.round = Math.max(0, Math.min(3, n | 0));
    this.placeHer();
    if (this.round < 3 && this.she) { const [x, z] = this.spot(this.round); this.put(x, z); this.play = 'hide'; }
    this.save();
  }

  /** Dev: she's yours and stands by you (wherever you are), ready to be got on. */
  debugYours() {
    this.round = 3;
    const m = this.she;
    if (!m) return;
    const b = this.d.body, [x, z] = this.local(b.pos.x - Math.cos(b.heading) * 1.6, b.pos.z + Math.sin(b.heading) * 1.6);
    this.put(x, z, b.heading);
    m.stabled = true;
    this.play = 'yours';
    this.save();
  }

  get busy() { return !!this.seq || this.win >= 0 || this.exit >= 0; }

  /** Dev: what the camera and her poses are up to (the veils she has open and how wide their holes are, how far in the camera is drawn). */
  get debug() { return { pass: this.pass.map((p) => ({ id: p.v.id, r: p.r, t: p.t })), camK: this.camK, pose: { ...this.pose }, stall: this.stall, stalls: this.stalls, waiting: this.waiting, glad: this.glad, lap: this.lap.length, heart: this.heart.alpha, peekN: this.peekN, peekCell: PEEKS[this.peekN][0], hidden: this.hidden, prints: this.trail.count, scars: this.scars.filter((o) => !o.going).length, win: this.win, exit: this.exit, balk: this.balk }; }

  /** How much of the frame the flat veil of the cut covers (0..1). */
  get veil() {
    const s = this.seq;
    if (this.exit >= 0) return Math.max(ss(this.exit, 0, OUT.cut) * (1 - ss(this.exit, OUT.cut + 0.05, OUT.cut + OUT.lift)), this.exitGone > 0 ? ss(this.exitGone, 0, OUT.veil) : 0);
    if (!s) return 0;
    if (s.phase === 'lower') return 1 - ss(s.t, 0.05, 0.6);
    if (s.phase === 'lift') return ss(s.t / LIFT, 0.45, 1);
    return 0;
  }

  /** Being let down, watched from across the well. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3 } | null {
    const s = this.seq, b = this.d.body.pos, L = this.layout;
    const c = Math.cos(L.door), n = Math.sin(L.door), side = Math.sign(n) || 1;
    // (The way out has no camera of its own: the one behind you follows her through the veil, as on any dash.)
    if (!s || (s.phase !== 'lower' && s.phase !== 'letgo')) return null;
    return { pos: this.world(-11 * c + 3.2 * side * n, 1.7, -11 * n - 3.2 * side * c), at: new THREE.Vector3(b.x, b.y + 1.6, b.z).lerp(this.world(0, 3, 0), 0.25) };
  }

  get startYaw() { return this.d.body.heading + Math.PI; }

  private hideArms() { this.arms[0].group.visible = this.arms[1].group.visible = false; }

  update(dt: number, mode: string, grounded: boolean, _held = false) {
    this.time += dt;
    const b = this.d.body, L = this.layout;
    const [px, pz] = this.local(b.pos.x, b.pos.z);
    // Through a veil: only on her, phasing. The camera is let through after you.
    if (this.prev && mode === 'ride') { const hit = L.firstVeil(this.prev[0], this.prev[1], px, pz); if (hit) this.openPass(hit.v); }
    this.prev = [px, pz];
    this.ride(dt, mode, px, pz);

    // The warm light: on its stone until you come to it, then at your shoulder.
    const rest = this.world(L.ember.x, L.ember.y + 0.06 * Math.sin(this.time * 1.7), L.ember.z);
    if (!this.taken && !this.seq && Math.hypot(b.pos.x - rest.x, b.pos.z - rest.z) < TAKE_R && Math.abs(b.pos.y + 1 - rest.y) < 3) {
      this.taken = true;
      this.win = 0;
      b.vel.x = b.vel.z = 0;
      this.d.gs.speed = 0;
      this.d.sfx.chirp(true);
      this.d.puff(rest, 8, 0.16, 2.2);
      this.save();
    }
    // It's yours: the light flares, the lanterns brighten, she hops round three times with a heart over her.
    if (this.win >= 0) {
      const t0 = this.win;
      this.win += dt;
      this.d.gs.speed = 0;
      for (const h of WIN_HOPS) if (t0 < h && this.win >= h && b.grounded) {
        b.vel.y = mode === 'ride' ? 8.5 : 6.5;
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
      this.heart.pos.set(b.pos.x, b.pos.y + (mode === 'ride' ? 3.7 : 2.8), b.pos.z);
      if (this.win >= WIN) { this.win = -1; this.cheer = 0; this.heart.alpha = 0; this.exit = 0; this.exitGone = 0; }
    }
    // And out: a cut to the well, and she takes you across it and through the veil in its wall.
    if (this.exit >= 0 && this.leave(dt, mode)) return;

    if (this.taken) {
      const up = mode === 'ride' ? 2.9 : 2.0;
      rest.set(b.pos.x - Math.sin(b.heading) * 0.55 + Math.cos(b.heading) * 0.5, b.pos.y + up + 0.08 * Math.sin(this.time * 2.1), b.pos.z - Math.cos(b.heading) * 0.55 - Math.sin(b.heading) * 0.5);
      this.emberAt.lerp(rest, 1 - Math.exp(-(this.seq || this.exit >= 0 ? 30 : 5) * dt));
    } else this.emberAt.copy(rest);
    this.root.worldToLocal(this.ember.position.copy(this.emberAt));
    this.ember.scale.setScalar((this.taken ? 0.6 : 1) * (1 + 0.07 * Math.sin(this.time * 4.1)) * (1 + 0.9 * this.cheer));
    for (let i = 0; i < this.lit.length; i++) {
      if (!this.lit[i] && !this.seq && this.lanternAt[i].distanceTo(b.pos) < WAKE_R) {
        this.lit[i] = true;
        this.d.sfx.coo();
        this.save();
      }
      if (this.lit[i] && this.litK[i] < 1) { this.litK[i] = Math.min(1, this.litK[i] + dt / WAKE); this.paintLantern(i); }
    }
    this.playHer(dt, mode);

    DUNGEON_U.uFeet.value.set(b.pos.x, this.floorAt(b.pos.x, b.pos.z, b.pos.y), b.pos.z);
    if (this.seq || mode === 'carried') DUNGEON_U.uFeet.value.y = -1e4;
    const off = Math.hypot(px, pz);
    if (off > ARM_R) this.armed = true;
    const on = DUNGEON_U.uMarkOn;
    on.value += ((this.armed ? 1 : 0) - on.value) * (1 - Math.exp(-4 * dt));
    if (!this.seq && this.armed && mode === 'walk' && grounded && off < LIFT_R && this.exit < 0 && this.win < 0) {
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
        this.prev = null;
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
        this.onLeft?.();
        return;
      }
    }
    if (!this.seq) { this.hideArms(); return; }
    const right = new THREE.Vector3(Math.cos(b.heading), 0, -Math.sin(b.heading));
    const chest = b.pos.clone().setY(b.pos.y + 1.0);
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const sh = this.top.clone().addScaledVector(right, side * 1.2).setY(this.top.y + 0.6);
      const grip = chest.clone().addScaledVector(right, side * 0.45);
      const hand = sh.clone().lerp(grip, hands);
      const len = sh.distanceTo(hand);
      const a1 = sh.clone().addScaledVector(right, side * Math.min(len * 0.2, 1.5));
      const a2 = hand.clone().add(new THREE.Vector3(0, Math.min(len * 0.25, 3), 0));
      this.arms[k].set(sh, a1, a2, hand, 0.1 * ARM, 0.075 * ARM, 0.16 * ARM, -side, chest);
    }
  }

  /**
   * The way out, hands off: under the cut you are put in the well on her
   * back; she runs across it and straight through the veil in its far wall,
   * and as she goes through the cut comes down again. True when it's over
   * (main has you on the surface).
   */
  private leave(dt: number, mode: string): boolean {
    const b = this.d.body, L = this.layout, gs = this.d.gs, m = this.she;
    const t0 = this.exit;
    this.exit += dt;
    const q = L.veil('out'), mx = (q.ax + q.bx) / 2, mz = (q.az + q.bz) / 2;
    if (t0 < OUT.cut && this.exit >= OUT.cut) {
      // In the well, facing the way out. (Up on to her, if you walked the last few steps to the light.)
      if (m && mode !== 'ride') { const [x, z] = this.local(b.pos.x, b.pos.z); this.put(x, z); this.d.mount(m); }
      this.world(mx - q.nx * OUT.from, 0, mz - q.nz * OUT.from, this.exitFrom);
      this.exitFrom.y = this.origin.y;
      this.world(mx + q.nx, 0, mz + q.nz, v);
      this.exitDir.set(v.x - this.exitFrom.x, 0, v.z - this.exitFrom.z).normalize();
      b.pos.copy(this.exitFrom);
      b.grounded = true;
      b.heading = Math.atan2(this.exitDir.x, this.exitDir.z);
      this.prev = null;
      this.pass.length = 0;
      this.camK = 1;
      // The camera behind her, looking the way she's going.
      this.snapYaw = b.heading + Math.PI;
    }
    if (this.exit < OUT.cut) { gs.speed = 0; b.vel.x = b.vel.z = 0; return false; }
    // A breath; then off, faster and faster, and through.
    const t = Math.max(0, this.exit - OUT.cut - OUT.lift - OUT.wait), run = t < 0.8 ? 13.5 * t * t : 13.5 * 0.64 + 21.6 * (t - 0.8);
    const speed = t < 0.8 ? 27 * t : 21.6, gap = OUT.from - run;
    b.pos.copy(this.exitFrom).addScaledVector(this.exitDir, run);
    b.pos.y = this.floorAt(b.pos.x, b.pos.z);
    b.heading = Math.atan2(this.exitDir.x, this.exitDir.z);
    b.vel.set(this.exitDir.x * speed, 0, this.exitDir.z * speed);
    b.grounded = true;
    gs.speed = speed;
    // (Glimmering from a few metres short of the veil.)
    if (gap < 4.5) { if (gs.phase <= 0) this.d.glow(v.copy(b.pos).setY(b.pos.y + 1), 8, 0.12, 1.6); gs.phase = 0.2; }
    if (gap < -1.5) this.exitGone += dt;
    if (this.exitGone >= OUT.veil) {
      this.exit = -1;
      this.exitGone = 0;
      gs.phase = 0;
      gs.speed = 0;
      this.inside = false;
      this.hideArms();
      this.pass.length = 0;
      VEIL_U.uWake.value.w = 0;
      VEIL_U.uHer.value.w = 0;
      for (const h of [...VEIL_U.uHole.value, ...VEIL_U.uScar.value]) h.w = 0;
      this.onWon?.();
      return true;
    }
    return false;
  }

  dispose() {
    this.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    this.scene.clear();
  }
}
