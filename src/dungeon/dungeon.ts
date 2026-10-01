import * as THREE from 'three';
import { hashInt } from '../core/rng';
import { DUNGEON_U, makeDungeonMaterial, makePoolMaterial, makePortalMaterial, makeSolidMaterial, U } from '../gfx/materials';
import type { Mob } from '../mobs/types';
import type { Body } from '../player/movement';
import type { Sfx } from '../story/audio';
import { Arm } from '../story/beacons';
import type { DungeonSite } from '../world/worldgen';
import { ARM_R, Layout, LIFT_R } from './layout';
import { buildCaps, buildRock, buildShell, buildStone } from './shell';

// The first dungeon, inside: its own scene (DESIGN.md, conflict 5), drawn in
// place of the world while you're in it. The ring's dark arms let you down
// through the well's ceiling, which is the forcefield seen from underneath,
// and take you back up when you stand under it again.
//
// It is a cave under the ring: the well, with four great columns
// about the passage's mouth; a passage winding down past a grotto of glowcaps; a great
// cavern with a still pool; and up a ramp at the far end a small warm light,
// the one thing down here that isn't violet.
//
// What you do here (a first slice): you come down with no mount. A rockfall
// has shut a rockhopper into the grotto; smash it away with the pick and the
// creature is yours, saddled, down here. The warm light stands on a ledge
// too high to jump on foot: only the rockhopper's bound gets you up to it.
// Walk into the light and it comes with you. What the light is for is not
// decided (DESIGN.md).
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

interface PlugStone { mesh: THREE.Mesh; solid: { x: number; z: number; r: number; top: number }; at: THREE.Vector3; hits: number; gone: number; jolt: number }

/** How the frame is finished in here (see PostPipeline.render). */
export const DUNGEON_LOOK = {
  fog: new THREE.Color('#bdb3dc'),
  outline: new THREE.Color('#2c1f3d'),
  tint: new THREE.Color('#8377b8'),
  tintAmt: 0.7,
  lift: 0.05,
  air: { density: 0.012, start: 9, bands: 6, max: 0.72 },
  light: new THREE.Color('#fbf6ff'),
  mid: new THREE.Color('#d6cdee'),
  shade: new THREE.Color('#a59bcd'),
  dir: new THREE.Vector3(0.3, 0.86, 0.4).normalize(),
};

type Phase = 'lower' | 'letgo' | 'reach' | 'lift';

const v = new THREE.Vector3(), w = new THREE.Vector3();

export class Dungeon {
  readonly scene = new THREE.Scene();
  readonly layout: Layout;
  /** The middle of the well's floor, in the world. */
  readonly origin: THREE.Vector3;
  /** Which way (world, as atan2(z, x)) the plan's +x runs: out between two of the ring's stones. */
  readonly facing: number;
  /** You're in it (from the moment the ring lets go of you above to the moment it has you back). */
  inside = false;
  /** Called when the arms have you back up at the ceiling: the world takes over again. */
  onLeft: (() => void) | null = null;
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
  /** You have the warm light: it goes where you go. */
  taken = false;
  /** The shut-in rockhopper. */
  goat: Mob | null = null;
  private emberAt = new THREE.Vector3();

  constructor(site: DungeonSite, seed: number, groundY: number, private d: DungeonDeps) {
    // The ring's stones stand at k/9 turns + 0.2 (worldgen); the way on leaves between two of them.
    const turn = (Math.PI * 2) / 9;
    this.facing = 0.2 + ((hashInt(3, 7, seed, 961) % 9) + 0.5) * turn;
    this.cos = Math.cos(this.facing);
    this.sin = Math.sin(this.facing);
    this.origin = new THREE.Vector3(site.x, groundY - DEPTH, site.z);
    const L = (this.layout = new Layout(seed));
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
    this.ember = add(new THREE.SphereGeometry(0.34, 20, 14), makeSolidMaterial('#f08a3c', 0.95, { keep: 1 }));
    this.ember.position.set(L.ember.x, L.ember.y, L.ember.z);
    this.scene.add(this.root);
    try {
      const sv = JSON.parse(localStorage.getItem(`fjellheim.dungeon1.${d.saveKey}`) ?? '{}');
      this.freed = !!sv.freed;
      this.taken = !!sv.taken;
    } catch { /* no storage: it starts shut */ }
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

  /** The cave's light and rock, into the shared uniforms (every frame you're inside, after the day/night has set its own). */
  applyLight() {
    const k = DUNGEON_LOOK;
    U.uLightDir.value.copy(k.dir);
    U.uLightCol.value.copy(k.light);
    U.uMidCol.value.copy(k.mid);
    U.uShadeCol.value.copy(k.shade);
    U.uNight.value = 0;
    DUNGEON_U.uOrigin.value.copy(this.origin);
    DUNGEON_U.uMark.value = LIFT_R;
    const g = this.layout.glows;
    DUNGEON_U.uGlowN.value = Math.min(g.length, DUNGEON_U.uGlows.value.length);
    for (let i = 0; i < DUNGEON_U.uGlowN.value; i++) {
      this.world(g[i].x, g[i].y, g[i].z, v);
      // The ember's light breathes.
      const r = g[i].warm ? (this.taken ? 8 : g[i].r) * (1 + 0.04 * Math.sin(this.time * 2.3)) : g[i].r;
      // The warm light's pool goes where the light does.
      if (g[i].warm) v.copy(this.emberAt);
      DUNGEON_U.uGlows.value[i].set(v.x, v.y, v.z, g[i].warm ? -r : r);
    }
  }

  /** What the feet rest on: the floor, or a stone no more than a step up. */
  floorAt(x: number, z: number, feetY = -Infinity): number {
    const [lx, lz] = this.local(x, z);
    const f = this.origin.y + this.layout.floor(lx, lz);
    let top = f;
    for (const o of this.layout.solids) {
      if (o.top > 50 || Math.hypot(lx - o.x, lz - o.z) > o.r * 0.8) continue;
      const s = f + o.top * 0.82;
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
      if (dist >= o.r + r || dist < 1e-4 || feet + STEP >= o.top * 0.82) continue;
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
    }
    this.d.sfx.chirp(true);
    this.save();
  }

  private save() {
    try { localStorage.setItem(`fjellheim.dungeon1.${this.d.saveKey}`, JSON.stringify({ freed: this.freed, taken: this.taken })); } catch { /* ignore */ }
  }

  /** Dev: the rockfall gone and the creature free, with no ceremony. */
  debugFree() {
    for (const p of this.plug) if (p.gone < 0) { p.gone = 1; p.mesh.visible = false; this.layout.solids.splice(this.layout.solids.indexOf(p.solid), 1); }
    if (!this.freed) this.free();
  }

  /** The camera stays in the cave: drawn in along its line to you until it's clear of rock. */
  clampCamera(cam: THREE.Vector3, focus: THREE.Vector3, dt: number) {
    const L = this.layout, len = cam.distanceTo(focus);
    const n = Math.ceil(len / 0.35);
    let k = 1;
    for (let i = 1; i <= n; i++) {
      v.lerpVectors(focus, cam, i / n);
      const [lx, lz] = this.local(v.x, v.z);
      if (!L.free(lx, v.y - this.origin.y, lz, 0.45)) { k = Math.max(0.06, (i - 1) / n); break; }
    }
    // In at once, back out at its leisure.
    this.camK = Math.min(k, this.camK + (1 - this.camK) * (1 - Math.exp(-3 * dt)));
    if (this.camK < 1) cam.lerpVectors(focus, cam, this.camK);
  }

  /** The ring has let go of you above: the arms let you down through the well's ceiling. */
  enter() {
    const b = this.d.body, L = this.layout;
    // The rockhopper (the first time down): in its den until it's let out, then waiting by the passage.
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
    this.applyLight();
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

  get busy() { return !!this.seq; }

  /** How much of the frame the violet veil covers (0..1): the cut between above and below. */
  get veil() {
    const s = this.seq;
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
      this.d.sfx.chirp(true);
      this.d.puff(rest, 8, 0.16, 2.2);
      this.save();
    }
    if (this.taken) {
      const up = mode === 'ride' ? 2.9 : 2.0;
      rest.set(b.pos.x - Math.sin(b.heading) * 0.55 + Math.cos(b.heading) * 0.5, b.pos.y + up + 0.08 * Math.sin(this.time * 2.1), b.pos.z - Math.cos(b.heading) * 0.55 - Math.sin(b.heading) * 0.5);
      this.emberAt.lerp(rest, 1 - Math.exp(-(this.seq ? 30 : 5) * dt));
    } else this.emberAt.copy(rest);
    this.root.worldToLocal(this.ember.position.copy(this.emberAt));
    this.ember.scale.setScalar((this.taken ? 0.6 : 1) * (1 + 0.07 * Math.sin(this.time * 4.1)));
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
