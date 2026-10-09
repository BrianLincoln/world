import * as THREE from 'three';
import { hashInt } from '../core/rng';
import { DUNGEON_U, makeDungeonMaterial, makeLanternMaterial, makePortalMaterial, makeSolidMaterial, U } from '../gfx/materials';
import type { BeastData } from '../mobs/beast';
import type { Mob } from '../mobs/types';
import type { Body } from '../player/movement';
import type { Sfx } from '../story/audio';
import type { Cue } from '../audio/ambience';
import { Arm } from '../story/beacons';
import { bubbleCanvas, tex, type IconName } from '../story/icons';
import { Billboard } from '../story/overlay';
import type { DungeonSite } from '../world/worldgen';
import { makeDarkLight } from './darkLight';
import { ARM_R, LANTERN_R, LIFT_R } from './layout';
import { DIAL_HALF, DIAL_ORB_R, DIAL_ORB_Y, DIAL_Y, LAMP_R, LAMP_Y, MothLayout, pulpitR } from './mothPlan';
import { buildDialHead, buildMosaic, buildMothRock, buildWallCaps, FACE_R, floorMoon } from './mothShell';

/** The marks on a moon: a shade under its light. */
const CRATER = '#b9a3a8';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildCaps, buildLanterns, buildShell } from './shell';

// The third dungeon, inside: the Moon Hall, under the third ring. Its own
// scene, as the other two are, and let down into and lifted out of the same
// way. Its plan is drawn at the top of mothPlan.ts.
//
// A great round hall, dusk rose where dungeon 1 is violet and dungeon 2 teal,
// and dark: no lanterns in it. In its middle a lamp, out. High on the far
// wall a ledge, and on its lip a moonmoth asleep: the first time you walk in,
// the camera goes up to her.
//
// What you do here: round the lamp stand four turning stones, a moon on each
// of their four faces. Walk up to one and turn it (the action key): a
// quarter turn each time. Let into the floor round the lamp are four moons,
// each on its stone's side: that is the moon each stone has to show the
// lamp. A stone showing its moon lights the little moon on its crown. All four, and
// each sends the lamp a beam and the lamp is lit: the hall's colour comes back, and the moth, who goes to
// light, comes down off her ledge to it, is glad, and offers her back. The
// lit lamp throws one more beam, up to a pale stone on the ledge she came
// from: that is the way on. Fly up; behind the ledge a gallery leads to the
// dungeon's light. Taking it ends the dungeon, and she carries you up out of
// the well.

export interface HallDeps {
  body: Body;
  sfx: Sfx;
  /** Switch the explorer's movement mode ('carried' while held, 'walk' after). */
  setMode(m: string): void;
  puff(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** Motes of pale light. */
  glow(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** The hall's moth, at `at` (she lives by the hall's floor and walls). */
  adopt(at: THREE.Vector3): Mob | null;
  /** Up on to her, wherever you are. */
  mount(m: Mob): void;
  saveKey: string;
}

/** How far under the ring it lies (m). */
const DEPTH = 60;
/** Being let down, let go of, reached for and lifted (s): as dungeon 1. */
const LOWER = 1.6, LET_GO = 0.5, REACH = 0.5, LIFT = 0.75;
const ARM = 1.4;
const STEP = 0.5, LEDGE = 0.9;
const TAKE_R = 1.9;
const WAKE_R = 12, WAKE = 0.7;
/** Taking the light: how long the gladness lasts (s) and when its hops come. */
const WIN = 4.3, WIN_HOPS = [0.5, 1.35, 2.2], WIN_VEIL = 0.9;
/** A stone: how near you stand to turn it (m), and how long a quarter turn takes (s). */
const TURN_R = 3.6, TURN = 0.5;
/** The first look at her, up on her ledge (s). */
const LOOK = 3.6;
/** How far into that look she stretches her wings (s). */
const STRETCH_AT = 0.5;
/**
 * The lamp lit, in seconds from the last stone coming right: the lamp
 * kindles (you watch from where you stand); the cut to her ledge, where she
 * wakes; she lifts off; she is down. Then she is glad for `GLAD` more.
 */
const SHOW = { kindle: 1.7, wake: 3.1, down: 12.6, end: 13.2 };
const GLAD = 2.6;
/** How far from the lamp she lands (m), and the lamp's light reaches once it's lit. */
const LAND_R = 16.5, LAMP_REACH = 95;

/** How the frame is finished in here: dark as the others are dark, but dusk rose. Never black. */
export const MOTH_LOOK = {
  fog: new THREE.Color('#2e1c38'),
  outline: new THREE.Color('#1f1128'),
  tint: new THREE.Color('#9d7c98'),
  /** (Less of it once the lamp is lit: `update` moves it between `TINT`'s two.) */
  tintAmt: 0.56,
  lift: 0.03,
  // (Thinner air than the others': the hall is 112 m across and 130 high, and its far wall wants seeing; its roof is lost in it.)
  air: { density: 0.0075, start: 14, bands: 8, max: 0.84 },
  lit: new THREE.Color('#fff7ec'),
  mid: new THREE.Color('#d6b4c0'),
  shade: new THREE.Color('#7a5877'),
  dark: [new THREE.Color('#d2a8c6'), new THREE.Color('#a17a9d'), new THREE.Color('#765579')],
  near: [new THREE.Color('#fffaf1'), new THREE.Color('#efd9d6'), new THREE.Color('#c7a7b6')],
  dir: new THREE.Vector3(0.3, 0.86, 0.4).normalize(),
  /** The flat veil across the cut between above and below. */
  cut: '#2e1c38',
};
/** Its rock: a pale rose floor, plum walls. */
const MOTH_ROCK = {
  cFloor: '#eedfd8', cFloor2: '#e0c8c8', cWallA: '#7e5978', cWallB: '#6f4c6b', cWallC: '#8d6786', cCeil: '#583b58',
  cMark: '#fcf0f0', cMarkDark: '#2a1830', cWarm: '#e6b8ff', uWarmFlat: 0.85,
};
/** Moonlight: the lamp, the moons on the stones and in the floor, the beams. And the lamp's moon while it's out. */
const MOON = '#fff1cf', MOON_OUT = '#6a4a68';
/** The pictures in the floor: a quieter, yellower light than the lamp's. */
const FLOOR_MOON = '#f6e08a';
/** How much of the frame's one colour is laid over it: in the dark, and with the lamp lit (its light brings the colours back). */
const TINT = [0.56, 0.3];
const cA = new THREE.Color(), cB = new THREE.Color();

type Phase = 'lower' | 'letgo' | 'reach' | 'lift';

const v = new THREE.Vector3(), w = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const ss = THREE.MathUtils.smoothstep;

interface DialState {
  /** Which moon faces the lamp (0..3). */
  n: number;
  /** Quarter turns made in all (the head's angle, never unwound), and the turn in hand (s, or -1). */
  turns: number;
  t: number;
  head: THREE.Group;
  flare: THREE.Mesh;
  /** The little moon on its crown: dark, or lit as the lamp's is when its face is the right one. Its beam starts in it. */
  orb: THREE.Mesh;
  beam: THREE.Mesh;
  /** How lit its little moon is (0..1: its face is the right one), and how much of its beam is out (0..1: all four are). */
  k: number;
  b: number;
}

export class MoonHall {
  readonly scene = new THREE.Scene();
  readonly overlay = new THREE.Scene();
  readonly layout: MothLayout;
  readonly origin: THREE.Vector3;
  readonly facing: number;
  readonly look = MOTH_LOOK;
  inside = false;
  onLeft: (() => void) | null = null;
  onWon: (() => void) | null = null;
  /** You have the dungeon's light. */
  taken = false;
  /** All four stones show their moons: the lamp is lit. Saved. */
  solved = false;
  /** She has offered her back. Saved. */
  yours = false;
  /** You've been shown her, up on her ledge. Saved. */
  seen = false;
  /** The moth. */
  she: Mob | null = null;
  /**
   * This time down: you've come out into the hall; the lamp was lit before your eyes; you've been on her back
   * with it lit. What the music goes by (`music`).
   */
  private reached = false;
  private kindled = false;
  private flown = false;
  readonly dials: DialState[] = [];
  readonly lit: boolean[];
  readonly buildMs: { plan: number; mesh: number };
  /** Where the orbit camera should be put at once (a yaw), once: main takes it. */
  snapYaw: number | null = null;
  private win = -1;
  /** The first look at her (s, or -1); the lamp's lighting (s since, or -1); what's left of her gladness (s). */
  private lookT = -1;
  private show = -1;
  private glad = 0;
  /** How lit the lamp is (0..1), and how far out its beam to the ledge is. */
  private lampK = 0;
  private markK = 0;
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
  private moon: THREE.Mesh;
  private moonMat: THREE.ShaderMaterial;
  private markBall: THREE.Mesh;
  private markMat: THREE.ShaderMaterial;
  private markBeam: THREE.Mesh;
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
  /** Her way down: from, to (the world), and the lamp it winds round. */
  private flight: { from: THREE.Vector3; to: THREE.Vector3; a0: number; da: number; r0: number } | null = null;
  private camFrom = new THREE.Vector3();

  constructor(site: DungeonSite, seed: number, groundY: number, private d: HallDeps) {
    const turn = (Math.PI * 2) / 9;
    this.facing = 0.2 + ((hashInt(7, 13, seed, 963) % 9) + 0.5) * turn;
    this.cos = Math.cos(this.facing);
    this.sin = Math.sin(this.facing);
    this.origin = new THREE.Vector3(site.x, groundY - DEPTH, site.z);
    const t0 = performance.now();
    const L = (this.layout = new MothLayout(seed ^ 0x6d2b79));
    const t1 = performance.now();
    this.top = this.origin.clone().setY(this.origin.y + L.rooms[0].clear);
    this.root.position.copy(this.origin);
    this.root.rotation.y = -this.facing;
    this.root.updateMatrixWorld();
    const add = <T extends THREE.Material>(g: THREE.BufferGeometry, m: T, to: THREE.Object3D = this.root) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      to.add(mesh);
      return mesh;
    };
    const rock = makeDungeonMaterial(false, MOTH_ROCK);
    add(buildShell(L), makeDungeonMaterial(true, MOTH_ROCK));
    add(buildMothRock(L, {
      column: '#5e4060', stone: '#a888a4', stoneBig: '#977493', made: '#c4a6b8', madeDark: '#4a3150', sconce: '#c9aebf', stub: '#a98aa2',
      spike: '#94718f', spikeDown: '#6d4c6c', kerb: '#f6e6e6', stalk: '#f1dfe0',
    }), rock);
    add(mergeGeometries([buildCaps(L), buildWallCaps(L)])!, makeSolidMaterial('#ffd9ec', 0.5, { keep: 1 }));
    add(new THREE.CircleGeometry(site.r - 2.4, 56).rotateX(Math.PI / 2).translate(0, L.rooms[0].clear - 0.06, 0), makePortalMaterial(site.r - 2.4, { a: '#9a6a96', b: '#d3a3c4', lip: '#fff0f2' }));
    const craterMat = makeSolidMaterial(CRATER, 0.06, { keep: 1 });
    const mosaic = buildMosaic(L);
    this.ember = makeDarkLight(0.4).mesh;
    this.root.add(this.ember);
    this.ember.position.set(L.ember.x, L.ember.y, L.ember.z);
    const lanterns = buildLanterns(L);
    this.lanternGeo = lanterns.geometry;
    this.lanternRanges = lanterns.ranges;
    add(this.lanternGeo, makeLanternMaterial({ dark: '#6b4a72', glow: '#fff0d8', ink: '#24142c', lid: '#d4b3c9' }));
    this.lanternAt = L.lanterns.map((o) => this.world(o.x, o.y + 0.4, o.z));
    this.lit = L.lanterns.map(() => false);
    this.litK = new Float32Array(L.lanterns.length);

    // The lamp's moon, and its beam up to the pale stone on the lip.
    const fy = L.floor(L.lamp.x, L.lamp.z);
    this.moonMat = makeSolidMaterial(MOON_OUT, 0, { keep: 1 });
    this.moon = add(new THREE.SphereGeometry(LAMP_R, 28, 20), this.moonMat);
    this.moon.position.set(L.lamp.x, fy + LAMP_Y, L.lamp.z);
    this.markMat = makeSolidMaterial(MOON_OUT, 0, { keep: 1 });
    this.markBall = add(new THREE.SphereGeometry(0.42, 18, 12), this.markMat);
    this.markBall.position.set(L.mark.x, L.mark.y, L.mark.z);
    const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0);
    const beamMat = makeSolidMaterial(MOON, 1, { keep: 1, doubleSide: true });
    const beam = (from: THREE.Vector3, to: THREE.Vector3) => {
      const m = add(beamGeo, beamMat);
      m.position.copy(from);
      m.quaternion.setFromUnitVectors(UP, w.subVectors(to, from).normalize());
      m.userData.len = from.distanceTo(to);
      m.visible = false;
      return m;
    };
    this.markBeam = beam(this.moon.position, this.markBall.position);

    // The four stones: a head that turns on its post, a flare over the face that looks at the lamp (shown when it's the right one), a little moon on its crown and the beam out of it.
    // (A moon's dark side is a dim moon, not a hole: its marks show on it.)
    const moonLook = { stone: '#c4a6b8', dark: '#57415f', darkMark: '#47334f' };
    const head = buildDialHead(moonLook);
    const moons = makeSolidMaterial(MOON, 0.3, { keep: 1 });
    const flareMat = makeSolidMaterial('#fffaf0', 1, { keep: 1 });
    let state: number[] = L.dials.map((o) => o.start);
    try {
      const sv = JSON.parse(localStorage.getItem(`embla.dungeon3.${d.saveKey}`) ?? '{}');
      this.taken = !!sv.taken;
      this.solved = !!sv.solved || this.taken;
      this.yours = !!sv.yours || this.taken;
      this.seen = !!sv.seen || this.solved;
      if (Array.isArray(sv.dials) && sv.dials.length === 4) state = sv.dials.map((n: number) => ((n | 0) % 4 + 4) % 4);
      for (const i of (sv.lit ?? []) as number[]) if (i < this.lit.length) { this.lit[i] = true; this.litK[i] = 1; this.paintLantern(i); }
    } catch { /* no storage: nothing has been turned */ }
    if (this.solved) state = L.dials.map((o) => o.want);
    L.dials.forEach((o, i) => {
      const y = L.floor(o.x, o.z) + DIAL_Y, yaw = Math.atan2(o.nx, o.nz);
      const post = new THREE.Group();
      post.position.set(o.x, y, o.z);
      post.rotation.y = yaw;
      this.root.add(post);
      const g = new THREE.Group();
      post.add(g);
      add(head.stone, rock, g);
      add(head.moons, moons, g);
      add(head.craters, craterMat, g);
      // (Behind the whole moon and a little bigger: a bright rim all round it.)
      const flare = add(new THREE.CircleGeometry(FACE_R * 1.2, 36).translate(0, 0, DIAL_HALF + 0.006), flareMat, post);
      flare.visible = false;
      // (From the little moon on the head's crown, not its face: the beam mustn't hide the moon it's for.)
      const from = new THREE.Vector3(o.x, y + DIAL_ORB_Y, o.z);
      const orb = add(new THREE.SphereGeometry(DIAL_ORB_R, 20, 14), makeSolidMaterial(MOON_OUT, 0, { keep: 1 }));
      orb.position.copy(from);
      const k = this.solved ? 1 : 0;
      g.rotation.y = (-state[i] * Math.PI) / 2;
      this.dials.push({ n: state[i], turns: state[i], t: -1, head: g, flare, orb, beam: beam(from, this.moon.position), k, b: k });
    });
    // The floor's ring of eight pictures: the month as it should be. They never change; they are what the stones are turned to.
    {
      const lit: THREE.BufferGeometry[] = [mosaic], marks: THREE.BufferGeometry[] = [], dark: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 8; i++) {
        const f = floorMoon(L, i, L.phaseAt(i));
        if (f.lit) lit.push(f.lit);
        if (f.craters) marks.push(f.craters);
        if (f.dark) dark.push(f.dark);
      }
      add(mergeGeometries(lit)!, makeSolidMaterial(FLOOR_MOON, 0.2, { keep: 1 }));
      add(mergeGeometries(marks)!, makeSolidMaterial('#cfb56a', 0.06, { keep: 1 }));
      add(mergeGeometries(dark)!, makeSolidMaterial(moonLook.darkMark, 0, { keep: 1, flat: 1 }));
    }
    if (this.solved) { this.lampK = 1; this.markK = 1; }

    // (Two more than the plan's: her own light, which goes where she does, and the pale stone's on the lip.)
    this.glowAt = [...L.glows.map((g) => this.world(g.x, g.y, g.z)), new THREE.Vector3(), this.world(L.mark.x, L.mark.y + 0.6, L.mark.z)];
    this.glowD = new Float32Array(this.glowAt.length);
    this.glowR = new Float32Array(this.glowAt.length);
    this.glowOrder = this.glowAt.map((_, i) => i);
    this.heart.alpha = 0;
    this.overlay.add(this.heart.mesh);
    this.scene.add(this.root);
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

  /** The great hall itself (the plan's biggest room). */
  private get hallRoom() { return this.layout.rooms.reduce((a, b) => (b.r > a.r ? b : a)); }

  /** The dungeon's creature, for whoever asks which (main). */
  get creature() { return this.she; }
  /** She has offered her back: E by her gets you on. */
  get mountable() { return this.yours && this.win < 0 && this.glad <= 0 && this.show < 0; }

  /** The hall's light and rock, into the shared uniforms (every frame you're inside). */
  applyLight(cam: THREE.Vector3) {
    const k = MOTH_LOOK, b = this.d.body.pos, L = this.layout;
    DUNGEON_U.cLit.value.copy(k.lit);
    DUNGEON_U.cMid.value.copy(k.mid);
    DUNGEON_U.cShade.value.copy(k.shade);
    DUNGEON_U.uOrigin.value.copy(this.origin);
    DUNGEON_U.uMark.value = LIFT_R;
    const g = L.glows, slots = DUNGEON_U.uGlows.value, N = slots.length, n1 = g.length;
    for (let i = 0; i < n1; i++) {
      const o = g[i];
      let r = o.r;
      if (o.warm) { r = (this.taken && this.win < 0 ? 4.5 : this.taken ? 8 : o.r) * (1 + 0.04 * Math.sin(this.time * 2.3)) * (1 + 1.1 * this.cheer); this.glowAt[i].copy(this.emberAt); }
      else if (o.lantern !== undefined) { const q = this.litK[o.lantern]; r = LANTERN_R * q * (2 - q) * (1 + 0.025 * Math.sin(this.time * 1.7 + o.lantern * 2.4)) * (1 + 0.3 * this.cheer); }
      else if (i === L.lampGlow) r = LAMP_REACH * this.lampK * (2 - this.lampK) * (1 + 0.015 * Math.sin(this.time * 1.3));
      else if (i >= L.dialGlow && i < L.dialGlow + 4) r = o.r + 3.5 * this.dials[i - L.dialGlow].k;
      this.glowR[i] = r;
      // (The portal's and the lamp's are never dropped for a nearer one.)
      this.glowD[i] = r < 0.05 ? 1e9 : i === 0 || i === L.lampGlow ? -1e9 : Math.max(0, cam.distanceTo(this.glowAt[i]) - r);
    }
    // Her own light: a pool that goes where she goes (her eyespots; wider while she sleeps, so she is found in the dark).
    const m = this.she;
    if (m) { this.glowAt[n1].set(m.pos.x, m.pos.y + 1.6, m.pos.z); this.glowR[n1] = (this.yours ? 5 : 8.5) * (1 + 0.05 * Math.sin(this.time * 3.1)); this.glowD[n1] = Math.max(0, cam.distanceTo(this.glowAt[n1]) - 40); }
    else this.glowD[n1] = 1e9;
    this.glowR[n1 + 1] = 9 * this.markK;
    this.glowD[n1 + 1] = this.markK < 0.02 ? 1e9 : Math.max(0, cam.distanceTo(this.glowAt[n1 + 1]) - 30);
    this.glowOrder.sort((p, q) => this.glowD[p] - this.glowD[q]);
    const cut = this.glowOrder.length > N ? this.glowD[this.glowOrder[N]] : 1e9;
    let n = 0, light = 0;
    for (; n < Math.min(N, this.glowOrder.length); n++) {
      const i = this.glowOrder[n];
      if (this.glowD[i] > 1e8) break;
      const fade = cut > 1e8 || this.glowD[i] < 0 ? 1 : 1 - ss(this.glowD[i], cut * 0.75, cut);
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
    // (As after dark above: her eyespots are alight down here.)
    U.uNight.value = 1;
  }

  /** What the feet rest on: the floor, a boulder no more than a step up, or the top of the lamp or a stone come down on from above. */
  floorAt(x: number, z: number, feetY = -Infinity): number {
    const [lx, lz] = this.local(x, z);
    const f = this.origin.y + this.layout.floor(lx, lz);
    let top = f;
    for (const o of this.layout.solids) {
      const R = o.flat ? o.r : o.r * 0.8, dist = Math.hypot(lx - o.x, lz - o.z);
      if (o.top > 50 || dist > R) continue;
      const s = o.y !== undefined ? this.origin.y + o.y : f + (o.flat ? o.top : o.top * 0.82 * (1 - (dist / R) ** 4));
      if (s <= feetY + STEP) top = Math.max(top, s);
    }
    return top;
  }

  /**
   * Keep a body of radius `r` inside the rock and out of what stands on the
   * floor. The walls lean in as they rise, and she flies: the wall is
   * wherever it has got to at the body's height.
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
      if (dist >= o.r + r || dist < 1e-4 || (o.y !== undefined ? y + STEP >= o.y : feet + STEP >= (o.flat ? o.top : o.top * 0.82))) continue;
      // (The pulpit is waisted: under its top there's air to fly in.)
      const R = o.y !== undefined ? o.r * pulpitR(THREE.MathUtils.clamp((y + 1.2 - (o.y - o.top)) / o.top, 0, 1)) : o.r;
      if (dist >= R + r) continue;
      out(-dx / dist, -dz / dist, R + r - dist);
    }
    // The ledge is a wall from below: back down the slope until the floor is in reach.
    for (let i = 0; i < 10 && L.floor(lx, lz) - y > LEDGE; i++) {
      const e = 0.3;
      const gx = L.floor(lx + e, lz) - L.floor(lx - e, lz), gz = L.floor(lx, lz + e) - L.floor(lx, lz - e);
      const gl = Math.hypot(gx, gz);
      if (gl < 1e-4) break;
      out(gx / gl, gz / gl, 0.12);
    }
    this.world(lx, 0, lz, v);
    pos.x = v.x; pos.z = v.z;
    const roof = this.origin.y + L.ceil(lx, lz) - 2.6;
    if (pos.y > roof) { pos.y = roof; if (vel.y > 0) vel.y = 0; }
  }

  /** The stone you'd turn from here, if any. */
  private target(): number {
    const b = this.d.body.pos, L = this.layout;
    const [lx, lz] = this.local(b.x, b.z);
    let best = -1, bd = TURN_R;
    L.dials.forEach((o, i) => { const dist = Math.hypot(lx - o.x, lz - o.z); if (dist < bd) { bd = dist; best = i; } });
    return best;
  }

  /** What the one action would do right now: turn a stone. */
  action(mode: string): IconName | null {
    return !this.busy && !this.solved && mode === 'walk' && this.target() >= 0 ? 'hand' : null;
  }

  /** The action press. Returns true if it was used. */
  act(mode: string): boolean {
    if (!this.action(mode)) return false;
    const o = this.dials[this.target()];
    if (o.t >= 0) return true;
    o.t = 0;
    o.n = (o.n + 1) % 4;
    o.turns++;
    this.d.sfx.thunk();
    this.save();
    return true;
  }

  private save() {
    try {
      localStorage.setItem(`embla.dungeon3.${this.d.saveKey}`, JSON.stringify({
        dials: this.dials.map((o) => o.n), solved: this.solved, yours: this.yours, seen: this.seen, taken: this.taken, lit: this.lit.flatMap((on, i) => (on ? [i] : [])),
      }));
    } catch { /* ignore */ }
  }

  /** The camera stays in the hall, as in dungeon 1 (drawn in along its line to you until it's clear of rock; quick in, slow out). */
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
    this.world(x, this.layout.floor(x, z), z, m.pos);
    m.vel.set(0, 0, 0);
    m.stay.copy(m.pos);
    m.grounded = true;
    if (heading !== undefined) m.heading = heading;
  }

  /** Where she is as you come down: asleep on her ledge, or (the lamp lit) by it. */
  private placeHer() {
    const L = this.layout, m = this.she;
    if (!m || m.ridden) return;
    const d = m.data as BeastData;
    this.flight = null;
    if (!this.solved) {
      // On the pulpit's face, head up, her back and her spread wings to the hall.
      this.world(L.perch.x, L.perch.y, L.perch.z, m.pos);
      m.vel.set(0, 0, 0);
      m.stay.copy(m.pos);
      m.grounded = true;
      m.heading = this.yawOf(L.perch.nx, L.perch.nz);
      d.rest = 1;
      d.s.hang = 1;
      d.s.lean = L.perch.lean;
      m.stabled = false;
    } else {
      this.put(L.lamp.x - LAND_R, L.lamp.z, this.yawOf(-1, 0));
      d.rest = 0;
      d.s.hang = 0;
      m.stabled = true;
      this.yours = true;
    }
  }

  /** Her way down from the ledge: out over the hall, once and a bit round the lamp, and down beside it on your side. */
  private takeOff() {
    const m = this.she, L = this.layout;
    if (!m) return;
    const b = this.d.body.pos, [px, pz] = this.local(b.x, b.z);
    let dx = px - L.lamp.x, dz = pz - L.lamp.z;
    const dl = Math.hypot(dx, dz);
    // (Between you and the lamp; or, if you're at its foot, round to one side of you.)
    if (dl < LAND_R + 2.5) { const a = Math.atan2(dz, dx) + 1.2; dx = Math.cos(a); dz = Math.sin(a); } else { dx /= dl; dz /= dl; }
    const tx = L.lamp.x + dx * LAND_R, tz = L.lamp.z + dz * LAND_R;
    const from = m.pos.clone(), to = this.world(tx, L.floor(tx, tz), tz);
    const a0 = Math.atan2(L.perch.z - L.lamp.z, L.perch.x - L.lamp.x), a1 = Math.atan2(dz, dx);
    let da = a1 - a0;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    // (Never the short way straight down: round the long way if the short one is under a half turn.)
    if (Math.abs(da) < Math.PI * 0.9) da -= (da >= 0 ? 1 : -1) * Math.PI * 2;
    this.flight = { from, to, a0, da, r0: Math.hypot(L.perch.x - L.lamp.x, L.perch.z - L.lamp.z) };
    this.d.glow(v.copy(from), 8, 0.13, 2);
    m.grounded = false;
    this.d.sfx.whoosh();
  }

  /** Where she is `s` of the way down (0..1), in the world. */
  private flightAt(s: number, out: THREE.Vector3) {
    const f = this.flight!, L = this.layout;
    const r = THREE.MathUtils.lerp(f.r0, LAND_R, 1 - Math.pow(1 - s, 2.2)), a = f.a0 + f.da * Math.pow(s, 1.6);
    this.world(L.lamp.x + Math.cos(a) * r, 0, L.lamp.z + Math.sin(a) * r, out);
    // (Up off the ledge first, then a long even glide, and a last soft settle.)
    const k = ss(s, 0, 1);
    out.y = THREE.MathUtils.lerp(f.from.y, f.to.y, k) + 1.6 * Math.sin(Math.min(1, s * 5) * Math.PI * 0.5) * (1 - ss(s, 0.8, 1));
    return out;
  }

  /** The moth, when nobody is on her: asleep, coming down, glad, or waiting to be got on. */
  private playHer(dt: number) {
    const m = this.she;
    if (!m || m.ridden) return;
    const d = m.data as BeastData;
    if (this.flight && this.show >= SHOW.wake) {
      const s = Math.min(1, (this.show - SHOW.wake) / (SHOW.down - SHOW.wake));
      const e = s * s * (3 - 2 * s);
      this.flightAt(e, v);
      m.vel.subVectors(v, m.pos).divideScalar(Math.max(dt, 1e-3));
      if (Math.hypot(m.vel.x, m.vel.z) > 0.5) m.heading = Math.atan2(m.vel.x, m.vel.z);
      m.pos.copy(v);
      d.rest = 0;
      d.s.hang = 1 - ss(s, 0, 0.1);
      if (s >= 1) {
        // Down: by the lamp, turned to you, glad.
        this.flight = null;
        m.grounded = true;
        m.vel.set(0, 0, 0);
        m.stay.copy(m.pos);
        const b = this.d.body.pos;
        m.heading = Math.atan2(b.x - m.pos.x, b.z - m.pos.z);
        m.happy = GLAD;
        this.glad = GLAD;
        this.d.sfx.fanfare(0.1);
        this.d.glow(v.copy(m.pos).setY(m.pos.y + 1.2), 12, 0.14, 2.6);
      }
      return;
    }
    if (!this.solved) { d.rest = 1; d.s.hang = 1; return; }
    if (this.show >= 0 && this.show < SHOW.wake) { d.rest = THREE.MathUtils.clamp(1 - (this.show - SHOW.kindle) / 0.9, 0, 1); return; }
    // Yours, and nobody on her: she comes down to the floor wherever you left her, and waits.
    const f = this.floorAt(m.pos.x, m.pos.z, m.pos.y);
    if (m.pos.y > f + 0.02) {
      m.grounded = false;
      m.vel.set(0, -3.2, 0);
      m.pos.y = Math.max(f, m.pos.y - 3.2 * dt);
    } else if (!m.grounded) { m.pos.y = f; m.grounded = true; m.vel.set(0, 0, 0); m.stay.copy(m.pos); }
  }

  /** The ring has let go of you above: the arms let you down through the well's ceiling. */
  enter() {
    const b = this.d.body, L = this.layout;
    if (!this.she) this.she = this.d.adopt(this.world(L.perch.x, L.perch.y, L.perch.z));
    this.inside = true;
    this.armed = false;
    this.camK = 1;
    this.lookT = -1;
    this.show = -1;
    this.reached = this.kindled = this.flown = false;
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
    return true;
  }

  /** Dev: every lantern awake (or asleep again). */
  debugLight(on = true) {
    this.lit.forEach((_, i) => { this.lit[i] = on; this.litK[i] = on ? 1 : 0; this.paintLantern(i); });
  }

  /** Dev: every stone but the last turned to its moon (`all`: the last too, so the lamp lights). */
  debugSolve(all = true) {
    this.dials.forEach((o, i) => {
      const want = this.layout.dials[i].want, n = all || i < 3 ? want : (want + 3) % 4;
      o.turns += (n - o.n + 4) % 4;
      o.n = n;
      o.t = -1;
    });
    this.seen = true;
    this.save();
  }

  /** Dev: the lamp lit and she's yours, by you (wherever you are), ready to be got on. */
  debugYours() {
    this.debugSolve();
    this.solved = this.yours = true;
    this.show = -1;
    this.lampK = this.markK = 1;
    for (const o of this.dials) o.k = o.b = 1;
    const m = this.she;
    if (!m) return;
    const b = this.d.body, [x, z] = this.local(b.pos.x - Math.cos(b.heading) * 2, b.pos.z + Math.sin(b.heading) * 2);
    this.flight = null;
    this.put(x, z, b.heading);
    (m.data as BeastData).rest = 0;
    (m.data as BeastData).s.hang = 0;
    m.stabled = true;
    this.save();
  }

  get busy() { return !!this.seq || this.win >= 0 || this.lookT >= 0 || this.show >= 0; }

  /**
   * Its music, by where you've got to this time down (audio/ambience.ts cross-fades as this changes, and plays
   * a piece that isn't a loop once): the way in, from the arms taking you down; the dark hall, from coming out
   * into it (where the first look at her is); the lamp's, from the last stone coming right; and the flying
   * one from first being on her back, to the end. Between the lamp's piece ending and getting on her there
   * is none. (Come back down with the lamp already lit and the hall's plays until you're on her.)
   */
  get music(): Cue | null {
    if (!this.inside) return null;
    return this.flown ? 'moonhall_flying_loop' : this.kindled ? 'moonhall_lamp_lights' : this.reached ? 'moonhall_dark_hall_loop' : 'moonhall_way_in';
  }

  /** Dev: where the puzzle and the scenes stand. */
  get debug() {
    return {
      dials: this.dials.map((o, i) => ({ n: o.n, want: this.layout.dials[i].want, k: o.k })), solved: this.solved, yours: this.yours, seen: this.seen, taken: this.taken, music: this.music,
      look: this.lookT, show: this.show, glad: this.glad, lampK: this.lampK, markK: this.markK, win: this.win, camK: this.camK, heart: this.heart.alpha,
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

  /** Being let down, watched from across the well; the first look at her; and her coming down to the lamp. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3 } | null {
    const s = this.seq, b = this.d.body.pos, L = this.layout, m = this.she;
    if (s && (s.phase === 'lower' || s.phase === 'letgo')) {
      const c = Math.cos(L.door), n = Math.sin(L.door), side = L.side;
      return { pos: this.world(-11 * c + 3.2 * side * n, 1.7, -11 * n - 3.2 * side * c), at: new THREE.Vector3(b.x, b.y + 1.6, b.z).lerp(this.world(0, 3, 0), 0.25) };
    }
    if (!m) return null;
    // At her on the pulpit's face, from out in the hall's air a little below her: her wings spread on the rock, her eyespots, the ledge above.
    const P = L.perch;
    const up = (t: number) => {
      const out = 15 - 3.5 * ss(t, 0, LOOK), x = P.x - P.nx * out - P.nz * 5 * L.side, z = P.z - P.nz * out + P.nx * 5 * L.side;
      return { pos: this.world(x, P.y - 3.2, z), at: this.world(P.x, P.y + 1.2, P.z) };
    };
    if (this.lookT >= 0) return up(this.lookT);
    if (this.show >= SHOW.kindle && this.show < SHOW.wake) return up(LOOK * 0.6 + (this.show - SHOW.kindle));
    if (this.show >= SHOW.wake && this.show < SHOW.end) {
      // From beyond where she'll land, low, so she comes down across the lit lamp.
      return { pos: this.camFrom, at: w.copy(m.pos).setY(m.pos.y + 0.8).lerp(this.moon.getWorldPosition(v), 0.25).clone() };
    }
    return null;
  }

  get startYaw() { return this.d.body.heading + Math.PI; }

  private hideArms() { this.arms[0].group.visible = this.arms[1].group.visible = false; }

  update(dt: number, mode: string, grounded: boolean, _held = false) {
    this.time += dt;
    const b = this.d.body, L = this.layout;
    const [px, pz] = this.local(b.pos.x, b.pos.z);

    // The stones: a turn in hand; whether each shows its moon; its beam.
    let right = 0, turning = false;
    this.dials.forEach((o, i) => {
      const want = L.dials[i].want;
      if (o.t >= 0) {
        o.t += dt;
        const k = Math.min(1, o.t / TURN), e = k * k * (3 - 2 * k);
        o.head.rotation.y = (-(o.turns - 1 + e) * Math.PI) / 2;
        turning = true;
        if (k >= 1) {
          o.t = -1;
          if (o.n === want) { this.d.sfx.collect(i); const at = o.flare.getWorldPosition(v); this.d.glow(at, 8, 0.12, 1.6); }
        }
      } else o.head.rotation.y = (-o.turns * Math.PI) / 2;
      const on = o.t < 0 && o.n === want;
      if (on) right++;
      o.k += ((on ? 1 : 0) - o.k) * (1 - Math.exp(-(on ? 5 : 9) * dt));
      o.flare.visible = o.k > 0.03;
      { const u = (o.orb.material as THREE.ShaderMaterial).uniforms; u.uEmissive.value = o.k; (u.uColor.value as THREE.Color).copy(cA.set(MOON_OUT)).lerp(cB.set(MOON), o.k); }
      o.orb.scale.setScalar(1 + 0.03 * o.k * Math.sin(this.time * 2.1 + i * 1.7));
      // (No beam till all four are right: then they go out together, and the lamp lights.)
      o.b += ((this.solved ? 1 : 0) - o.b) * (1 - Math.exp(-5 * dt));
      o.beam.visible = o.b > 0.02;
      const r = 0.085 * (1 + 0.12 * Math.sin(this.time * 5 + i * 1.7));
      o.beam.scale.set(r, o.beam.userData.len * o.b, r);
    });

    // All four: the lamp is lit.
    if (!this.solved && right === 4 && !turning) {
      this.solved = true;
      this.seen = true;
      this.show = 0;
      this.kindled = true;
      b.vel.x = b.vel.z = 0;
      this.d.sfx.shimmer();
      this.save();
      // (Where the camera will watch her come down from: the far side of the lamp from her ledge, off to one side, low.)
      const K = L.shelves[0];
      this.world(L.lamp.x - K.dx * 24 + K.dz * 11 * L.side, this.hallRoom.floor + 2.8, L.lamp.z - K.dz * 24 - K.dx * 11 * L.side, this.camFrom);
    }
    if (this.show >= 0) {
      const t0 = this.show;
      this.show += dt;
      b.vel.x = b.vel.z = 0;
      if (t0 < 0.5 && this.show >= 0.5) this.d.sfx.fanfare();
      // (Waking, her wings go up; she's off the rock with them still raised.)
      if (t0 < SHOW.kindle && this.show >= SHOW.kindle && this.she && !this.she.ridden) (this.she.data as BeastData).s.stretch = 0;
      if (t0 < SHOW.wake && this.show >= SHOW.wake) this.takeOff();
      if (this.show >= SHOW.end) this.show = -1;
    }
    const lampOn = this.solved && (this.show < 0 || this.show > 0.25) ? 1 : 0;
    this.lampK += (lampOn - this.lampK) * (1 - Math.exp(-2.2 * dt));
    this.moonMat.uniforms.uEmissive.value = this.lampK;
    (this.moonMat.uniforms.uColor.value as THREE.Color).copy(cA.set(MOON_OUT)).lerp(cB.set(MOON), this.lampK);
    MOTH_LOOK.tintAmt = TINT[0] + (TINT[1] - TINT[0]) * this.lampK;
    this.moon.scale.setScalar(1 + 0.03 * this.lampK * Math.sin(this.time * 2.1));
    // Her gladness; then she's yours, and the lamp points the way on.
    if (this.glad > 0) {
      this.glad -= dt;
      const m = this.she;
      if (m) {
        const show = this.glad > 0.3 ? 1 : 0;
        this.heart.alpha += (show - this.heart.alpha) * (1 - Math.exp(-7 * dt));
        this.heart.scale = (0.6 + 0.4 * this.heart.alpha) * (1 + 0.12 * Math.sin(this.time * 6));
        this.heart.pos.set(m.pos.x, m.pos.y + 2.6, m.pos.z);
        if (this.glad <= 0) { m.stabled = true; this.yours = true; this.heart.alpha = 0; this.d.sfx.chirp(true); this.save(); }
      }
    }
    const markOn = this.yours && this.glad <= 0 ? 1 : 0;
    this.markK += (markOn - this.markK) * (1 - Math.exp(-1.6 * dt));
    this.markBeam.visible = this.markK > 0.02;
    this.markBeam.scale.set(0.11, this.markBeam.userData.len * this.markK, 0.11);
    { const k = ss(this.markK, 0.85, 1); this.markMat.uniforms.uEmissive.value = k; (this.markMat.uniforms.uColor.value as THREE.Color).copy(cA.set(MOON_OUT)).lerp(cB.set(MOON), k); }

    // You've come out into the hall (and, the first time, the first look at her).
    const out = Math.hypot(px - this.hallRoom.x, pz - this.hallRoom.z) < this.hallRoom.r - 9;
    if (out) this.reached = true;
    if (this.solved && this.she?.ridden) this.flown = true;
    if (!this.seen && !this.seq && out) {
      this.seen = true;
      this.lookT = 0;
      this.d.sfx.coo();
      this.save();
    }
    if (this.lookT >= 0) {
      // (Once the camera is on her she stretches her wings, asleep.)
      if (this.lookT < STRETCH_AT && this.lookT + dt >= STRETCH_AT && this.she) (this.she.data as BeastData).s.stretch = 0;
      this.lookT += dt;
      b.vel.x = b.vel.z = 0;
      if (this.lookT >= LOOK) this.lookT = -1;
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
      // And out, as from the other two: under the cut, main has the ring's arms lift you out above.
      if (this.win >= WIN) {
        this.win = -1;
        this.cheer = 0;
        this.heart.alpha = 0;
        this.inside = false;
        this.hideArms();
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
    for (let i = 0; i < this.lit.length; i++) {
      if (!this.lit[i] && !this.seq && this.lanternAt[i].distanceTo(b.pos) < WAKE_R) {
        this.lit[i] = true;
        this.d.sfx.coo();
        this.save();
      }
      if (this.lit[i] && this.litK[i] < 1) { this.litK[i] = Math.min(1, this.litK[i] + dt / WAKE); this.paintLantern(i); }
    }
    this.playHer(dt);

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
    this.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    this.scene.clear();
  }
}
