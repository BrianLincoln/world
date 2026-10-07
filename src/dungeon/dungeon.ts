import * as THREE from 'three';
import { hashInt } from '../core/rng';
import { DUNGEON_U, makeDungeonMaterial, makeLanternMaterial, makePoolMaterial, makePortalMaterial, makeSolidMaterial, U } from '../gfx/materials';
import type { Mob } from '../mobs/types';
import type { Body } from '../player/movement';
import type { Sfx } from '../story/audio';
import { Arm } from '../story/beacons';
import { bubbleCanvas, chuteHintCanvas, tex } from '../story/icons';
import { Billboard } from '../story/overlay';
import type { DungeonSite } from '../world/worldgen';
import { makeDarkLight } from './darkLight';
import { ARM_R, LANTERN_R, Layout, LIFT_R } from './layout';
import { buildCaps, buildLanterns, buildRock, buildShell, buildStone } from './shell';

// The first dungeon, inside: its own scene (DESIGN.md, conflict 5), drawn in
// place of the world while you're in it. The ring's dark arms let you down
// through the well's ceiling, which is the forcefield seen from underneath,
// and take you back up when you stand under it again.
//
// It is a big dark cave under the ring (its plan is drawn at the top of
// layout.ts). Spirit lanterns sleep on its walls and wake, and stay awake,
// as you come by: they are how you know where you've been. The only warm
// thing in it is a small light, on a ledge too high to climb.
//
// What you do here: you come down with no mount. From the fork the nearer
// way leads to that ledge, and is the wrong way: there's nothing to climb.
// The other way winds on through the great cavern and the room with the
// stone hand to a pit crossed on stepping stones (jump, and for the long
// gap the parachute; miss, and a tunnel climbs back to the start), and at
// last to a rockfall that has shut a rockhopper into its den. Smash it away
// with the pick and the creature is yours, saddled, down here. The den's
// other way out drops off a balcony back into the fork; from there the
// rockhopper's bound gets you up the ledge. Walk into the light and it
// comes with you. What the light is for is slice B (docs/NEXT-dungeon1.md).
//
// It keeps the world's x and z (it sits under the ring, DEPTH m down), so
// streaming, creatures and the story carry on overhead undisturbed.

export interface DungeonDeps {
  body: Body;
  sfx: Sfx;
  /** Switch the explorer's movement mode ('carried' while held, 'walk' after). */
  setMode(m: string): void;
  rig: { chop(): void };
  /** You have a pick (the story's; the sandbox lends one). */
  canSmash(): boolean;
  /** Put the pick in the mitten for a swing. */
  showPick(): void;
  puff(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** A creature of the dungeon's own, standing at `at` (it lives by the dungeon's floor and walls). */
  adopt(at: THREE.Vector3): Mob | null;
  saveKey: string;
  /** Played by touch (the thought of the parachute shows a finger, not a key). */
  touch(): boolean;
}

/** How far under the ring it lies (m). */
const DEPTH = 60;
/** Being let down, let go of, reached for and lifted (s). */
const LOWER = 1.6, LET_GO = 0.5, REACH = 0.5, LIFT = 0.75;
/** The arms' size, as the tower spirit's. */
const ARM = 1.4;
/** How far a foot steps up on to a stone (m). */
const STEP = 0.5;
/** A rise in the floor taller than this is a wall to whatever is standing below it (m). */
const LEDGE = 0.9;
/** A pick swing (s), when in it the blow lands, how near you stand, and blows to break a boulder. */
const SWING = 0.62, HIT_AT = 0.3, SMASH_REACH = 1.5, BLOWS = 3;
/** How near the warm light you come before it's yours (m). */
const TAKE_R = 1.9;
/** How near a sleeping lantern you come before it wakes (m), and how long waking takes (s). */
const WAKE_R = 12, WAKE = 0.7;
/** How far the freed rockhopper lets you get from it on foot before it comes after you (m), and after how long (s). */
const STRAY = 38, STRAY_T = 2.5;
/** The freed rockhopper's hops for gladness: when each leaves the ground after the rockfall breaks (s) and how high it goes (m), and how long one lasts (s). */
const GLAD_HOPS = [[0.5, 0.7], [1.05, 0.7], [1.6, 1.25]], GLAD_HOP = 0.5;
/** The explorer's thought on the high stone, how the parachute is opened: how long each of its four frames is held (s: standing, a press and the jump, falling, a press and the canopy), and the last two turn about this fast once she's off the stone and falling. */
const HINT_HOLD = [0.7, 0.36, 0.42, 1.3], HINT_QUICK = 0.2;
/** Taking the light: how long the gladness lasts before the veil (s), when the three hops come, and the veil's length. */
const WIN = 5.4, WIN_HOPS = [0.55, 1.5, 2.45], WIN_VEIL = 0.9;

interface PlugStone { mesh: THREE.Mesh; solid: { x: number; z: number; r: number; top: number }; at: THREE.Vector3; hits: number; gone: number; jolt: number }

/**
 * How the frame is finished in here (see PostPipeline.render). Dark, as the
 * blue night above is dark: deep blue-violet, never black, outlines kept
 * (DESIGN.md, conflict 7). The air closes in to a dark violet a room away.
 */
export const DUNGEON_LOOK = {
  fog: new THREE.Color('#231f47'),
  outline: new THREE.Color('#150f29'),
  tint: new THREE.Color('#6a66b4'),
  tintAmt: 0.7,
  lift: 0.03,
  air: { density: 0.03, start: 7, bands: 6, max: 0.9 },
  /** The rock's three tones (`DUNGEON_FRAG`): in a pool of light, at its edge, and everywhere else. */
  lit: new THREE.Color('#f4f0ff'),
  mid: new THREE.Color('#a59fd8'),
  shade: new THREE.Color('#514d8c'),
  /** The explorer and the creatures: out in the dark, and standing in a light. */
  dark: [new THREE.Color('#aaa5dc'), new THREE.Color('#7d78b8'), new THREE.Color('#5a5694')],
  near: [new THREE.Color('#fbf6ff'), new THREE.Color('#d6cdee'), new THREE.Color('#a59bcd')],
  dir: new THREE.Vector3(0.3, 0.86, 0.4).normalize(),
};

type Phase = 'lower' | 'letgo' | 'reach' | 'lift';

const v = new THREE.Vector3(), w = new THREE.Vector3();

export class Dungeon {
  readonly scene = new THREE.Scene();
  /** What's drawn over it with real transparency (the thought bubble): main hands it to the post pipeline. */
  readonly overlay = new THREE.Scene();
  readonly layout: Layout;
  /** The middle of the well's floor, in the world. */
  readonly origin: THREE.Vector3;
  /** Which way (world, as atan2(z, x)) the plan's +x runs: out between two of the ring's stones. */
  readonly facing: number;
  /** You're in it (from the moment the ring lets go of you above to the moment it has you back). */
  inside = false;
  /** Called when the arms have you back up at the ceiling: the world takes over again. */
  onLeft: (() => void) | null = null;
  /** Called when the light is yours and the gladness is done, under the veil: main puts you out on the surface. */
  onWon: (() => void) | null = null;
  /** The gladness at taking the light, in seconds since (or -1). Hands off while it runs. */
  private win = -1;
  private heart = new Billboard(tex(bubbleCanvas('heart')), 1.05, 52);
  private cheer = 0;
  private root = new THREE.Group();
  private cos: number;
  private sin: number;
  private seq: { phase: Phase; t: number; from: THREE.Vector3 } | null = null;
  /** The arms take you up only once you've walked off the mark and come back. */
  private armed = false;
  private arms: Arm[];
  private ember: THREE.Mesh;
  private time = 0;
  private camK = 1;
  private top: THREE.Vector3;
  private plug: PlugStone[] = [];
  private plugMat = makeDungeonMaterial(false);
  private swingT = -1;
  private swingCd = 0;
  private swingAt: PlugStone | null = null;
  /** The rockfall is gone and the creature is yours. */
  freed = false;
  /** Seconds since it was freed, while the rockhopper is still hopping about it (else -1). */
  private glad = -1;
  /** You have the warm light: it goes where you go. */
  taken = false;
  /** The shut-in rockhopper. */
  goat: Mob | null = null;
  private emberAt = new THREE.Vector3();
  /** Which lanterns are awake (saved), how far each has woken (0..1), and their mesh. */
  readonly lit: boolean[];
  private litK: Float32Array;
  private lanternGeo: THREE.BufferGeometry;
  private lanternRanges: [number, number][];
  private lanternAt: THREE.Vector3[];
  /** Every glow's place in the world, and scratch for picking the nearest. */
  private glowAt: THREE.Vector3[];
  private glowD: Float32Array;
  private glowR: Float32Array;
  private glowOrder: number[];
  /** How well lit the explorer is (0..1), eased. */
  private inLight = 0;
  /** The stepping stone you last stood on (-1: none since the pit's floor). */
  private lastTop = -1;
  /** Across the long gap at least once: she's not reminded in the air any more. */
  private crossed = false;
  /** The explorer's own thought, over her head whenever she's on the high stone: how the parachute is opened (HINT_HOLD). */
  private thought = new Billboard(tex(chuteHintCanvas(0, false)), 1.6, 88);
  private thoughtA = 0;
  private thoughtT = 0;
  private strayT = 0;
  private bleatT = 4;
  /** How long the plan and its meshes took to build (ms): the hitch on first entry. */
  readonly buildMs: { plan: number; mesh: number };

  constructor(site: DungeonSite, seed: number, groundY: number, private d: DungeonDeps) {
    // The ring's stones stand at k/9 turns + 0.2 (worldgen); the way on leaves between two of them.
    const turn = (Math.PI * 2) / 9;
    this.facing = 0.2 + ((hashInt(3, 7, seed, 961) % 9) + 0.5) * turn;
    this.cos = Math.cos(this.facing);
    this.sin = Math.sin(this.facing);
    this.origin = new THREE.Vector3(site.x, groundY - DEPTH, site.z);
    const t0 = performance.now();
    const L = (this.layout = new Layout(seed));
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
    add(buildShell(L), makeDungeonMaterial(true));
    add(buildRock(L), makeDungeonMaterial(false));
    add(buildCaps(L), makeSolidMaterial('#9fd0e6', 0.5, { keep: 1 }));
    add(new THREE.CircleGeometry(site.r - 2.4, 56).rotateX(Math.PI / 2).translate(0, L.rooms[0].clear - 0.06, 0), makePortalMaterial(site.r - 2.4));
    add(new THREE.CircleGeometry(L.pool.r + 3, 40).rotateX(-Math.PI / 2).translate(L.pool.x, L.pool.y, L.pool.z), makePoolMaterial());
    this.ember = makeDarkLight(0.4).mesh;
    this.root.add(this.ember);
    this.ember.position.set(L.ember.x, L.ember.y, L.ember.z);
    const lanterns = buildLanterns(L);
    this.lanternGeo = lanterns.geometry;
    this.lanternRanges = lanterns.ranges;
    add(this.lanternGeo, makeLanternMaterial());
    this.lanternAt = L.lanterns.map((o) => this.world(o.x, o.y + 0.4, o.z));
    this.lit = L.lanterns.map(() => false);
    this.litK = new Float32Array(L.lanterns.length);
    this.glowAt = L.glows.map((g) => this.world(g.x, g.y, g.z));
    this.glowD = new Float32Array(L.glows.length);
    this.glowR = new Float32Array(L.glows.length);
    this.glowOrder = L.glows.map((_, i) => i);
    this.thought.alpha = 0;
    this.heart.alpha = 0;
    this.overlay.add(this.thought.mesh, this.heart.mesh);
    this.scene.add(this.root);
    try {
      const sv = JSON.parse(localStorage.getItem(`embla.dungeon1.${d.saveKey}`) ?? '{}');
      this.freed = !!sv.freed;
      this.taken = !!sv.taken;
      this.crossed = !!sv.crossed;
      for (const i of (sv.lit ?? []) as number[]) if (i < this.lit.length) { this.lit[i] = true; this.litK[i] = 1; this.paintLantern(i); }
    } catch { /* no storage: it starts shut, and dark */ }
    this.buildMs = { plan: t1 - t0, mesh: performance.now() - t1 };
    for (const p of L.plug) {
      if (this.freed) { L.solids.splice(L.solids.indexOf(p.solid), 1); continue; }
      const mesh = new THREE.Mesh(buildStone(p.stone, '#948ab8', true), this.plugMat);
      mesh.position.set(p.stone.x, p.stone.y, p.stone.z);
      this.root.add(mesh);
      this.plug.push({ mesh, solid: p.solid, at: this.world(p.stone.x, p.stone.y, p.stone.z), hits: 0, gone: -1, jolt: 0 });
    }
    this.world(L.ember.x, L.ember.y, L.ember.z, this.emberAt);

    const ink = makeSolidMaterial('#191424', 0, { keep: 1, flat: 0.5 });
    this.arms = [new Arm(ink), new Arm(ink)];
    this.scene.add(this.arms[0].group, this.arms[1].group);
  }

  private local(x: number, z: number): [number, number] {
    const dx = x - this.origin.x, dz = z - this.origin.z;
    return [dx * this.cos + dz * this.sin, -dx * this.sin + dz * this.cos];
  }

  /** A point of the plan, in the world. */
  world(x: number, y: number, z: number, out = new THREE.Vector3()) {
    return out.set(this.origin.x + x * this.cos - z * this.sin, this.origin.y + y, this.origin.z + x * this.sin + z * this.cos);
  }

  /** A lantern's `aLit`, into its vertices. */
  private paintLantern(i: number) {
    const a = this.lanternGeo.attributes.aLit as THREE.BufferAttribute, [from, to] = this.lanternRanges[i];
    (a.array as Float32Array).fill(this.litK[i], from, to);
    a.needsUpdate = true;
  }

  /**
   * The cave's light and rock, into the shared uniforms (every frame you're
   * inside, after the day/night has set its own). The shader draws only so
   * many pools of light: the portal's, and the nearest to the camera of the
   * rest, the farthest of those shrinking away before they drop out so
   * none pops.
   */
  applyLight(cam: THREE.Vector3) {
    const k = DUNGEON_LOOK, b = this.d.body.pos;
    DUNGEON_U.cLit.value.copy(k.lit);
    DUNGEON_U.cMid.value.copy(k.mid);
    DUNGEON_U.cShade.value.copy(k.shade);
    DUNGEON_U.uOrigin.value.copy(this.origin);
    DUNGEON_U.uMark.value = LIFT_R;
    const g = this.layout.glows, slots = DUNGEON_U.uGlows.value, N = slots.length;
    for (let i = 0; i < g.length; i++) {
      const o = g[i];
      // The ember's light breathes, and goes where the light does; a lantern's opens as it wakes.
      let r = o.r;
      if (o.warm) { r = (this.taken ? 8 : o.r) * (1 + 0.04 * Math.sin(this.time * 2.3)) * (1 + 1.1 * this.cheer); this.glowAt[i].copy(this.emberAt); }
      else if (o.lantern !== undefined) { const w = this.litK[o.lantern]; r = LANTERN_R * w * (2 - w) * (1 + 0.025 * Math.sin(this.time * 1.7 + o.lantern * 2.4)) * (1 + 0.3 * this.cheer); }
      this.glowR[i] = r;
      this.glowD[i] = r < 0.05 ? 1e9 : i === 0 ? -1e9 : Math.max(0, cam.distanceTo(this.glowAt[i]) - r);
    }
    this.glowOrder.sort((p, q) => this.glowD[p] - this.glowD[q]);
    const cut = g.length > N ? this.glowD[this.glowOrder[N]] : 1e9;
    let n = 0, light = 0;
    for (; n < Math.min(N, g.length); n++) {
      const i = this.glowOrder[n];
      if (this.glowD[i] > 1e8) break;
      const fade = cut > 1e8 || i === 0 ? 1 : 1 - THREE.MathUtils.smoothstep(this.glowD[i], cut * 0.75, cut);
      const r = this.glowR[i] * fade, at = this.glowAt[i];
      slots[n].set(at.x, at.y, at.z, g[i].warm ? -r : r);
      if (r > 0.1) light = Math.max(light, 1 - THREE.MathUtils.smoothstep(Math.hypot(b.x - at.x, b.z - at.z), r * 0.55, r * 1.05));
    }
    DUNGEON_U.uGlowN.value = n;
    // She is lit by whatever pool she stands in, and is a dim blue shape between them.
    this.inLight += (light - this.inLight) * 0.12;
    U.uLightDir.value.copy(k.dir);
    U.uLightCol.value.copy(k.dark[0]).lerp(k.near[0], this.inLight);
    U.uMidCol.value.copy(k.dark[1]).lerp(k.near[1], this.inLight);
    U.uShadeCol.value.copy(k.dark[2]).lerp(k.near[2], this.inLight);
    U.uNight.value = 0;
  }

  /** Its creature can be got on (main asks whichever dungeon you're in). */
  get mountable() { return this.freed; }

  /** What the feet rest on: the floor, or a stone no more than a step up. */
  floorAt(x: number, z: number, feetY = -Infinity): number {
    const [lx, lz] = this.local(x, z);
    const f = this.origin.y + this.layout.floor(lx, lz);
    let top = f;
    for (const o of this.layout.solids) {
      const R = o.flat ? o.r : o.r * 0.8, dist = Math.hypot(lx - o.x, lz - o.z);
      if (o.top > 50 || dist > R) continue;
      // A pillar's top is flat; a boulder's is a dome, so a foot (or a hoof at a trot) rides up over a pebble rather than popping on to it.
      const s = o.y !== undefined ? this.origin.y + o.y : f + (o.flat ? o.top : o.top * 0.82 * (1 - (dist / R) ** 4));
      if (s <= feetY + STEP) top = Math.max(top, s);
    }
    return top;
  }

  /** Keep a body of radius `r` inside the walls and out of what stands on the floor. */
  collide(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
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
      // A stone you're standing on (or could step on to) isn't a wall.
      if (dist >= o.r + r || dist < 1e-4 || (o.y !== undefined ? pos.y - this.origin.y + STEP >= o.y : feet + STEP >= (o.flat ? o.top : o.top * 0.82))) continue;
      out(-dx / dist, -dz / dist, o.r + r - dist);
    }
    // A ledge taller than a step is a wall from below: back down the slope until the floor is in reach.
    for (let i = 0; i < 10 && L.floor(lx, lz) - (pos.y - this.origin.y) > LEDGE; i++) {
      const e = 0.3;
      const gx = L.floor(lx + e, lz) - L.floor(lx - e, lz), gz = L.floor(lx, lz + e) - L.floor(lx, lz - e);
      const gl = Math.hypot(gx, gz);
      if (gl < 1e-4) break;
      out(gx / gl, gz / gl, 0.12);
    }
    this.world(lx, 0, lz, v);
    pos.x = v.x; pos.z = v.z;
    // And a head doesn't go through the roof (a mount's bound can reach it).
    const roof = this.origin.y + L.ceil(lx, lz) - 2.3;
    if (pos.y > roof) { pos.y = roof; if (vel.y > 0) vel.y = 0; }
  }

  /** The boulder of the rockfall you'd swing at from here, if any. */
  private target(): PlugStone | null {
    const b = this.d.body.pos;
    let best: PlugStone | null = null, bd = SMASH_REACH + 1.4 + 0.6;
    for (const p of this.plug) {
      if (p.gone >= 0) continue;
      const dist = Math.hypot(p.at.x - b.x, p.at.z - b.z);
      if (dist < bd) { bd = dist; best = p; }
    }
    return best;
  }

  /** What the one action would do right now: swing the pick at the rockfall. */
  action(mode: string): 'pick' | null {
    return !this.seq && mode === 'walk' && this.d.canSmash() && this.target() ? 'pick' : null;
  }

  /** The action press. Returns true if it was used. */
  act(mode: string): boolean {
    if (this.action(mode) !== 'pick') return false;
    this.swing();
    return true;
  }

  private swing() {
    if (this.swingT >= 0 || this.swingCd > 0) return;
    this.swingAt = this.target();
    if (!this.swingAt) return;
    this.swingT = 0;
    this.swingCd = SWING;
    this.d.showPick();
    this.d.rig.chop();
  }

  private updateSwing(dt: number, mode: string, held: boolean) {
    this.swingCd -= dt;
    const b = this.d.body;
    if (held && this.action(mode) === 'pick') this.swing();
    const p = this.swingAt;
    if (this.swingT < 0 || !p) { this.swingT = -1; return; }
    this.swingT += dt;
    this.d.showPick();
    // Square up to it, and step in until it's in arm's length.
    const dx = p.at.x - b.pos.x, dz = p.at.z - b.pos.z, dl = Math.hypot(dx, dz) || 1;
    let dh = Math.atan2(dx, dz) - b.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    b.heading += dh * (1 - Math.exp(-14 * dt));
    const gap = dl - p.solid.r - SMASH_REACH * 0.4;
    if (gap > 0.05 && this.swingT < HIT_AT) {
      const sp = Math.min(6, gap * 10);
      b.vel.x = (dx / dl) * sp;
      b.vel.z = (dz / dl) * sp;
    }
    if (this.swingT >= HIT_AT && this.swingT - dt < HIT_AT && p.gone < 0) {
      p.hits++;
      p.jolt = 1;
      this.d.sfx.smash();
      this.d.puff(v.copy(p.at).lerp(b.pos, 0.35).setY(b.pos.y + 1), 5, 0.14, 2.2);
      if (p.hits >= BLOWS) {
        // It breaks up: gone as a wall at once, and as a shape in a moment.
        p.gone = 0;
        const s = this.layout.solids;
        s.splice(s.indexOf(p.solid), 1);
        this.d.sfx.thud();
        this.d.puff(p.at, 12, 0.3, 4);
        // One gap is a way out.
        if (!this.freed) this.free();
      }
    }
    if (this.swingT > SWING - 0.05) this.swingT = -1;
  }

  /** The rockfall is down: the creature comes out to you, glad, and it's yours. */
  private free() {
    const L = this.layout, m = this.goat;
    this.freed = true;
    if (m) {
      this.world(L.den.outX, L.floor(L.den.outX, L.den.outZ), L.den.outZ, m.stay);
      m.stabled = true;
      m.happy = 3;
      m.species.reset(m);
      this.d.puff(v.copy(m.pos).setY(m.pos.y + 1.6), 8, 0.22, 2.4);
      this.glad = 0;
    }
    this.d.sfx.fanfare(0.25);
    this.save();
  }

  /** The freed rockhopper catches you up: it lands a few steps behind you, wherever you've got to. */
  private fetch(m: Mob) {
    const b = this.d.body, L = this.layout;
    const [lx, lz] = this.local(b.pos.x, b.pos.z), here = L.floor(lx, lz);
    for (const [back, side] of [[5, 0], [4, 2.5], [4, -2.5], [2.5, 3.5], [2.5, -3.5], [-4, 0]]) {
      const wx = b.pos.x - Math.sin(b.heading) * back + Math.cos(b.heading) * side, wz = b.pos.z - Math.cos(b.heading) * back - Math.sin(b.heading) * side;
      const [px, pz] = this.local(wx, wz);
      if (L.sdf(px, pz) > -1.2 || Math.abs(L.floor(px, pz) - here) > 0.8 || L.solids.some((o) => Math.hypot(o.x - px, o.z - pz) < o.r + 0.8)) continue;
      m.pos.set(wx, this.origin.y + L.floor(px, pz), wz);
      m.vel.set(0, 0, 0);
      m.stay.copy(m.pos);
      m.heading = b.heading;
      m.happy = 2;
      this.d.puff(v.copy(m.pos).setY(m.pos.y + 0.4), 9, 0.2, 2.6);
      this.d.sfx.chirp();
      break;
    }
    this.strayT = 0;
  }

  private save() {
    try { localStorage.setItem(`embla.dungeon1.${this.d.saveKey}`, JSON.stringify({ freed: this.freed, taken: this.taken, crossed: this.crossed, lit: this.lit.flatMap((on, i) => (on ? [i] : [])) })); } catch { /* ignore */ }
  }

  /** Dev: the rockfall gone and the creature free, with no ceremony. */
  debugFree() {
    for (const p of this.plug) if (p.gone < 0) { p.gone = 1; p.mesh.visible = false; this.layout.solids.splice(this.layout.solids.indexOf(p.solid), 1); }
    if (!this.freed) this.free();
  }

  /**
   * The camera stays in the cave: drawn in along its line to you until it's
   * clear of rock. It used to come in at once, a 0.35 m step at a time, and
   * spring straight back out: on a mount, zoomed out past the walls of every
   * passage, that was a camera that never stopped twitching. Now it finds
   * exactly where the rock begins, comes in quickly but not in one frame
   * (the walls are one-sided, so a frame or two inside the rock shows
   * nothing wrong), and goes back out slowly: the faster you're going the
   * slower, so along a passage it holds the nearest the wall has been
   * rather than breathing in and out with every bulge. It also looks a
   * quarter of a second ahead (`vel`), to be in before the bulge arrives.
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
      // (Only if you'll be in the open there yourself: not when you're riding at a wall.)
      if (ok(0)) k = Math.min(k, reach());
    }
    this.camK += (k - this.camK) * (1 - Math.exp(-(k < this.camK ? 14 : 1.4 / (1 + speed * 0.45)) * dt));
    if (this.camK < 0.999) cam.lerpVectors(focus, cam, this.camK);
  }

  /** The ring has let go of you above: the arms let you down through the well's ceiling. */
  enter() {
    const b = this.d.body, L = this.layout;
    // The rockhopper (the first time down): in its den until it's let out, then waiting outside it.
    if (!this.goat) {
      const home = this.freed ? this.world(L.den.outX, L.floor(L.den.outX, L.den.outZ), L.den.outZ) : this.world(L.den.x, L.floor(L.den.x, L.den.z), L.den.z);
      this.goat = this.d.adopt(home);
      if (this.goat) { this.goat.stay.copy(home); this.goat.stabled = this.freed; }
    }
    this.inside = true;
    this.armed = false;
    this.camK = 1;
    DUNGEON_U.uMarkOn.value = 0;
    b.pos.copy(this.top).setY(this.top.y - 1.2);
    b.vel.set(0, 0, 0);
    // Facing the way on.
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

  /** Dev: stand at one of the plan's named places (`layout.at`). */
  goTo(name: string) {
    const p = this.layout.at[name];
    if (!p) return false;
    if (!this.inside) return false;
    this.world(p[0], this.layout.floor(p[0], p[1]), p[1], this.d.body.pos);
    this.d.body.vel.set(0, 0, 0);
    return true;
  }

  /** Dev: every lantern awake (or asleep again). */
  debugLight(on = true) {
    this.lit.forEach((_, i) => { this.lit[i] = on; this.litK[i] = on ? 1 : 0; this.paintLantern(i); });
  }

  get busy() { return !!this.seq || this.win >= 0; }

  /** How much of the frame the violet veil covers (0..1): the cut between above and below. */
  get veil() {
    const s = this.seq;
    if (this.win >= 0) return THREE.MathUtils.smoothstep(this.win, WIN - WIN_VEIL, WIN - 0.1);
    if (!s) return 0;
    if (s.phase === 'lower') return 1 - THREE.MathUtils.smoothstep(s.t, 0.05, 0.6);
    if (s.phase === 'lift') return THREE.MathUtils.smoothstep(s.t / LIFT, 0.45, 1);
    return 0;
  }

  /** Being let down: watched from across the well, the way on behind you. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3 } | null {
    const s = this.seq;
    if (!s || (s.phase !== 'lower' && s.phase !== 'letgo')) return null;
    const b = this.d.body.pos;
    // (Straight across from the passage's mouth and a little aside, so it shows past you between its two columns.)
    const L = this.layout, c = Math.cos(L.door), n = Math.sin(L.door), side = Math.sign(n) || 1;
    return { pos: this.world(-11 * c + 3.2 * side * n, 1.7, -11 * n - 3.2 * side * c), at: new THREE.Vector3(b.x, b.y + 1.6, b.z).lerp(this.world(0, 3, 0), 0.25) };
  }

  /** Where the orbit camera should start from when you're set down. */
  get startYaw() { return this.d.body.heading + Math.PI; }

  private hideArms() { this.arms[0].group.visible = this.arms[1].group.visible = false; }

  /** `held`: the action is being held down (swing after swing). */
  update(dt: number, mode: string, grounded: boolean, held = false) {
    this.time += dt;
    const b = this.d.body, L = this.layout;
    this.updateSwing(dt, mode, held);
    // The rockfall glints while you could break it; a struck boulder jolts, a broken one shrinks away.
    this.plugMat.uniforms.uGlint.value = this.d.canSmash() && this.plug.some((p) => p.gone < 0) ? 1 : 0;
    for (const p of this.plug) {
      p.jolt = Math.max(0, p.jolt - dt * 5);
      if (p.gone >= 0) p.gone = Math.min(1, p.gone + dt / 0.28);
      p.mesh.visible = p.gone < 1;
      p.mesh.scale.setScalar((1 - Math.max(0, p.gone)) * (1 + 0.05 * p.jolt * Math.sin(p.jolt * 18)));
    }
    // The warm light: on its stone until you come to it, then at your shoulder.
    const rest = this.world(L.ember.x, L.ember.y + 0.06 * Math.sin(this.time * 1.7), L.ember.z);
    if (!this.taken && !this.seq && Math.hypot(b.pos.x - rest.x, b.pos.z - rest.z) < TAKE_R && Math.abs(b.pos.y + 1 - rest.y) < 3) {
      this.taken = true;
      this.win = 0;
      b.vel.x = b.vel.z = 0;
      this.d.sfx.chirp(true);
      this.d.puff(rest, 8, 0.16, 2.2);
      this.save();
    }
    // It's yours: the light flares, every lantern you've woken brightens, and whoever is carrying you (the
    // rockhopper, or your own two feet) hops round three times for gladness, a heart over its head. Then
    // the veil, and you're put out on the surface.
    if (this.win >= 0) {
      const t0 = this.win;
      this.win += dt;
      for (const h of WIN_HOPS) if (t0 < h && this.win >= h && b.grounded) {
        b.vel.y = mode === 'ride' ? 8.5 : 6.5;
        b.grounded = false;
        this.d.sfx.chirp(h === WIN_HOPS[2]);
        this.d.puff(v.copy(b.pos).setY(b.pos.y + 0.2), 7, 0.18, 2.4);
      }
      if (this.win > WIN_HOPS[0] && this.win < WIN_HOPS[2] + 0.75) b.heading += (dt * Math.PI * 2) / (WIN_HOPS[2] + 0.75 - WIN_HOPS[0]);
      b.vel.x = b.vel.z = 0;
      const up = THREE.MathUtils.smoothstep(this.win, 0.05, 0.5) * (1 - THREE.MathUtils.smoothstep(this.win, WIN - 1.6, WIN - 0.8));
      this.cheer = up * (0.75 + 0.25 * Math.sin(this.win * 7));
      const show = this.win > 0.7 && this.win < WIN - 1.2 ? 1 : 0;
      this.heart.alpha += (show - this.heart.alpha) * (1 - Math.exp(-7 * dt));
      this.heart.scale = (0.6 + 0.4 * this.heart.alpha) * (1 + 0.12 * Math.sin(this.win * 6));
      this.heart.pos.set(b.pos.x, b.pos.y + (mode === 'ride' ? 3.7 : 2.8), b.pos.z);
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
      const up = mode === 'ride' ? 2.9 : 2.0;
      rest.set(b.pos.x - Math.sin(b.heading) * 0.55 + Math.cos(b.heading) * 0.5, b.pos.y + up + 0.08 * Math.sin(this.time * 2.1), b.pos.z - Math.cos(b.heading) * 0.55 - Math.sin(b.heading) * 0.5);
      this.emberAt.lerp(rest, 1 - Math.exp(-(this.seq ? 30 : 5) * dt));
    } else this.emberAt.copy(rest);
    this.root.worldToLocal(this.ember.position.copy(this.emberAt));
    this.ember.scale.setScalar((this.taken ? 0.6 : 1) * (1 + 0.07 * Math.sin(this.time * 4.1)) * (1 + 0.9 * this.cheer));
    // The lanterns: each wakes as you come near, and stays awake.
    for (let i = 0; i < this.lit.length; i++) {
      if (!this.lit[i] && !this.seq && this.lanternAt[i].distanceTo(b.pos) < WAKE_R) {
        this.lit[i] = true;
        this.d.sfx.coo();
        this.save();
      }
      if (this.lit[i] && this.litK[i] < 1) { this.litK[i] = Math.min(1, this.litK[i] + dt / WAKE); this.paintLantern(i); }
    }
    // The rockhopper: heard before it's seen, while it's shut in; and once it's yours it won't be left behind
    // (walk off the balcony without it and it would be the whole way round again to fetch it).
    const m = this.goat;
    if (m && !this.freed) {
      this.bleatT -= dt;
      const far = m.pos.distanceTo(b.pos);
      if (this.bleatT < 0 && far > 9 && far < 75) { this.d.sfx.whimper(); this.bleatT = 6 + 3 * Math.sin(this.time * 7.3); }
    }
    // Out at last: three hops on the spot, the last the highest, a chirp as each leaves the ground and dust where it lands.
    if (m && this.glad >= 0) {
      const t0 = this.glad, last = GLAD_HOPS[GLAD_HOPS.length - 1];
      this.glad += dt;
      m.hop = 0;
      for (const hop of GLAD_HOPS) {
        const [at, h] = hop, u = (this.glad - at) / GLAD_HOP;
        if (u > 0 && u < 1) m.hop = h * 4 * u * (1 - u);
        if (m.ridden) continue;
        if (t0 < at && this.glad >= at) this.d.sfx.chirp(hop === last);
        if (t0 < at + GLAD_HOP && this.glad >= at + GLAD_HOP) this.d.puff(v.copy(m.pos).setY(m.pos.y + 0.2), 6, 0.16, 2.2);
      }
      if (this.glad >= last[0] + GLAD_HOP) { this.glad = -1; m.hop = 0; }
    }
    if (m && this.freed && mode === 'walk' && grounded && !this.seq && m.pos.distanceTo(b.pos) > STRAY) {
      this.strayT += dt;
      if (this.strayT > STRAY_T) this.fetch(m);
    } else this.strayT = 0;
    // The stepping stones: the long fall is from the high stone (the last) to the far lip, and only
    // the parachute makes it. Nothing before here has asked for it, so standing on the high stone she thinks
    // of how it's done, every time; and the first time across, falling off it with nothing open, of the press.
    {
      const [px, pz] = this.local(b.pos.x, b.pos.z), y = b.pos.y - this.origin.y, T = L.tops, high = T.length - 1;
      if (grounded && mode === 'walk') {
        const on = T.findIndex((o) => Math.hypot(px - o.x, pz - o.z) < o.r && Math.abs(y - o.y!) < 0.3);
        if (on >= 0) this.lastTop = on;
        else if (!this.crossed && L.pitSd(px, pz) > 0 && Math.hypot(px - L.at.farLip[0], pz - L.at.farLip[1]) < 45 && y < L.ground(L.at.lip[0], L.at.lip[1]) - 3) {
          // Down on the far side: you know how, now.
          this.crossed = true;
          this.save();
        } else this.lastTop = -1;
      }
      // Off it: past its edge or below its top (a hop on the spot isn't).
      const o = T[high], off = !grounded && (Math.hypot(px - o.x, pz - o.z) > o.r || y < o.y! - 0.3);
      const show = this.lastTop === high && mode === 'walk' && !(off && this.crossed) ? 1 : 0;
      if (show && this.thoughtA < 0.02) { this.d.sfx.call(); this.thoughtT = 0; }
      this.thoughtT += dt;
      let frame = 2 + (Math.floor(this.thoughtT / HINT_QUICK) & 1);
      if (!off) {
        let u = this.thoughtT % HINT_HOLD.reduce((a, h) => a + h, 0);
        for (frame = 0; u >= HINT_HOLD[frame]; frame++) u -= HINT_HOLD[frame];
      }
      if (show) this.thought.texture = tex(chuteHintCanvas(frame, this.d.touch()));
      this.thoughtA += (show - this.thoughtA) * (1 - Math.exp(-(show ? 6 : 10) * dt));
      this.thought.alpha = this.thoughtA;
      this.thought.scale = 0.6 + 0.4 * this.thoughtA;
      this.thought.pos.set(b.pos.x, b.pos.y + 2.95 + 0.05 * Math.sin(this.time * 2), b.pos.z);
    }
    DUNGEON_U.uFeet.value.set(b.pos.x, this.floorAt(b.pos.x, b.pos.z, b.pos.y), b.pos.z);
    if (this.seq || mode === 'carried') DUNGEON_U.uFeet.value.y = -1e4;

    const [lx, lz] = this.local(b.pos.x, b.pos.z);
    const off = Math.hypot(lx, lz);
    if (off > ARM_R) this.armed = true;
    // The mark's rim lights up once it will take you.
    const on = DUNGEON_U.uMarkOn;
    on.value += ((this.armed ? 1 : 0) - on.value) * (1 - Math.exp(-4 * dt));
    // Back on the mark under the portal: the arms come down for you.
    if (!this.seq && this.armed && mode === 'walk' && grounded && off < LIFT_R) {
      this.seq = { phase: 'reach', t: 0, from: b.pos.clone() };
      b.vel.set(0, 0, 0);
      this.d.sfx.sink(true);
    }
    const s = this.seq;
    if (!s) { this.hideArms(); return; }
    s.t += dt;
    // How far down the arms reach from the portal (0..1).
    let hands = 1;
    const floor = w.copy(this.origin);
    if (s.phase === 'lower') {
      const k = Math.min(1, s.t / LOWER);
      // Quick through the ceiling, gently on to the floor.
      b.pos.lerpVectors(s.from, floor, 1 - Math.pow(1 - k, 2.4));
      if (k >= 1) {
        s.phase = 'letgo'; s.t = 0;
        b.pos.copy(floor);
        b.grounded = true;
        this.d.setMode('walk');
      }
    } else if (s.phase === 'letgo') {
      hands = 1 - THREE.MathUtils.smoothstep(s.t / LET_GO, 0, 1);
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
    // The same two arms as a tower's spirit has, in ink, out of the portal overhead.
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

  dispose() {
    this.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    this.scene.clear();
  }
}
