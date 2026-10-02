import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildBoulder, buildConifer, TREE_HEIGHT } from '../gfx/geometry';
import { makePropMaterial } from '../gfx/materials';
import type { StoryStone, StoryTree } from '../world/storySite';
import { buildAxe, buildBlock, buildLog, buildPebble, buildPick, buildStump, PICK_TIP } from './geometry';

// The small story props, each its own mesh drawn with the prop shader so it
// matches the world exactly (same palette, bands, outlines) and can carry the
// interactable glint. Transforms go on the mesh; the shader's instance
// attributes only hold scale/rotation/lean.

export function propMesh(geo: THREE.BufferGeometry, mat: THREE.ShaderMaterial, inst?: { sc?: number; rot?: number; sy?: number; lean?: number; tone?: number }): THREE.Mesh {
  const ig = new THREE.InstancedBufferGeometry();
  ig.index = geo.index;
  ig.setAttribute('position', geo.attributes.position);
  ig.setAttribute('normal', geo.attributes.normal);
  ig.setAttribute('aKind', geo.attributes.aKind);
  ig.setAttribute('aI0', new THREE.InstancedBufferAttribute(new Float32Array([0, 0, 0, inst?.sc ?? 1]), 4));
  ig.setAttribute('aI1', new THREE.InstancedBufferAttribute(new Float32Array([inst?.rot ?? 0, inst?.sy ?? 1, inst?.lean ?? 0, inst?.tone ?? 0.5]), 4));
  ig.instanceCount = 1;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const bs = geo.boundingSphere!.clone();
  bs.radius *= Math.max(inst?.sc ?? 1, 1) * Math.max(inst?.sy ?? 1, 1) * 1.3;
  ig.boundingSphere = bs;
  return new THREE.Mesh(ig, mat);
}

let TREE_GEO: THREE.BufferGeometry | null = null;
let TREE_GEO2: THREE.BufferGeometry | null = null;
let LOG_GEO: THREE.BufferGeometry | null = null;
let STUMP_GEO: THREE.BufferGeometry | null = null;
const PEBBLES: THREE.BufferGeometry[] = [];
let SHARED: THREE.ShaderMaterial | null = null;

/** Plain (non-glinting) prop material for logs, stumps and the like. */
export function sharedPropMat() {
  return (SHARED ??= makePropMaterial({ toneVar: 0.15, doubleSide: true, flipBack: true }));
}

/** A glint-capable material; each interactable owns one. */
export function glintMat(opts: Parameters<typeof makePropMaterial>[0] = {}) {
  return makePropMaterial({ toneVar: 0.15, doubleSide: true, flipBack: true, ...opts });
}

/** Smoothly approach a glint target (so the signal eases in and out). */
export function easeGlint(mat: THREE.ShaderMaterial, target: number, dt: number) {
  const u = mat.uniforms.uGlint;
  u.value += (target - u.value) * (1 - Math.exp(-5 * dt));
  if (Math.abs(u.value) < 0.01 && target === 0) u.value = 0;
}

// ---------------------------------------------------------------- trees

export type TreeState = 'standing' | 'falling' | 'down' | 'gone';

/** A tree you can fell: three swings, it creaks over, and turns into logs. */
export class ChopTree {
  readonly group = new THREE.Group();
  // Only the near-plane cut: the tree you're chopping must never vanish.
  readonly mat = glintMat({ bend: 0.24, wind: 0.012, heightRef: TREE_HEIGHT, toneVar: 0.22, cutaway: 'near', nearCut: 4.5 });
  readonly tree: THREE.Mesh;
  readonly stump: THREE.Mesh;
  state: TreeState = 'standing';
  hits = 0;
  private fallT = 0;
  private fallAxis = new THREE.Vector3();
  private shake = 0;
  private shakeV = 0;
  private shakeDir = new THREE.Vector3();
  /** World xz of the trunk and its collision radius. */
  readonly pos: THREE.Vector3;
  readonly radius: number;
  /** Radius of the lowest (widest) canopy tier. */
  readonly canopy: number;
  onLanded?: (t: ChopTree) => void;
  onGone?: (t: ChopTree, along: THREE.Vector3[]) => void;

  /** `def.sy` = height scale (world trees vary); the variant follows the tone, as in the world. */
  constructor(readonly def: StoryTree & { sy?: number }, y: number, readonly index: number) {
    TREE_GEO ??= buildConifer(7, 0);
    TREE_GEO2 ??= buildConifer(31, 0);
    STUMP_GEO ??= buildStump();
    this.tree = propMesh(def.tone < 0.5 ? TREE_GEO : TREE_GEO2, this.mat, { sc: def.sc, rot: def.rot, lean: def.lean, tone: def.tone, sy: def.sy ?? 1 });
    this.stump = propMesh(STUMP_GEO, sharedPropMat(), { sc: def.sc * 0.95, rot: def.rot, tone: def.tone });
    this.stump.visible = false;
    this.group.position.set(def.x, y - 0.4, def.z);
    this.stump.position.y = 0.25;
    this.group.add(this.tree, this.stump);
    this.pos = new THREE.Vector3(def.x, y, def.z);
    this.radius = 0.34 * def.sc;
    this.canopy = (TREE_HEIGHT * 0.19 + 0.3) * def.sc;
  }

  get standing() { return this.state === 'standing'; }

  /**
   * One axe blow from `from` (the explorer's position); `power` blows at once
   * (a charging stelk fells it outright). Returns true on the felling blow.
   */
  hit(from: THREE.Vector3, power = 1): boolean {
    if (this.state !== 'standing') return false;
    this.hits = Math.min(3, this.hits + power);
    this.shakeDir.set(this.pos.x - from.x, 0, this.pos.z - from.z).normalize();
    this.shakeV += 1.6 + this.hits * 0.4;
    if (this.hits >= 3) {
      this.state = 'falling';
      this.fallT = 0;
      // Falls away from the axe.
      this.fallAxis.set(0, 1, 0).cross(this.shakeDir).normalize();
      return true;
    }
    return false;
  }

  /** Restore a saved state instantly. */
  setFelled() {
    this.state = 'gone';
    this.tree.visible = false;
    this.stump.visible = true;
  }

  update(dt: number) {
    if (this.state === 'standing') {
      // A struck tree shudders (a damped spring about its base).
      this.shakeV += (-60 * this.shake - 7 * this.shakeV) * dt;
      this.shake += this.shakeV * dt;
      const ax = new THREE.Vector3(0, 1, 0).cross(this.shakeDir);
      if (ax.lengthSq() > 1e-6) this.tree.quaternion.setFromAxisAngle(ax.normalize(), this.shake * 0.02);
    } else if (this.state === 'falling') {
      this.fallT += dt;
      // Slow to start, then gravity: angle ~ t^2, a small bounce on landing.
      const T = 1.25;
      const t = Math.min(1, this.fallT / T);
      let a = t * t * (Math.PI / 2 - 0.06);
      if (this.fallT > T) {
        const b = this.fallT - T;
        a = Math.PI / 2 - 0.06 - Math.abs(Math.sin(b * 11)) * 0.07 * Math.exp(-b * 6);
      }
      this.tree.quaternion.setFromAxisAngle(this.fallAxis, a);
      this.stump.visible = this.fallT > 0.15;
      if (this.fallT > T && this.state === 'falling' && !(this as { landed?: boolean }).landed) {
        (this as { landed?: boolean }).landed = true;
        this.onLanded?.(this);
      }
      if (this.fallT > T + 0.6) {
        this.state = 'gone';
        this.tree.visible = false;
        const along: THREE.Vector3[] = [];
        const dir = new THREE.Vector3().crossVectors(this.fallAxis, new THREE.Vector3(0, 1, 0)).multiplyScalar(-1);
        const h = TREE_HEIGHT * this.def.sc * (this.def.sy ?? 1);
        for (const f of [0.18, 0.34, 0.5, 0.66]) along.push(this.pos.clone().addScaledVector(dir, h * f));
        this.onGone?.(this, along);
      }
    }
  }
}

// ---------------------------------------------------------------- axe

export class AxeProp {
  readonly group = new THREE.Group();
  readonly mat = glintMat({ toneVar: 0 });
  readonly block: THREE.Mesh;
  readonly axe: THREE.Mesh;
  readonly pos: THREE.Vector3;
  taken = false;

  constructor(x: number, y: number, z: number, faceYaw: number) {
    this.block = propMesh(buildBlock(), sharedPropMat(), { tone: 0.4 });
    this.axe = propMesh(buildAxe(), this.mat);
    this.group.position.set(x, y - 0.05, z);
    this.group.rotation.y = faceYaw;
    // The axe is struck into the top of the block, blade down in the wood,
    // handle angled up and out over the edge toward the yard.
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.97, 0.56);
    pivot.rotation.set(-2.18, 0, 0);
    this.axe.rotation.y = Math.PI / 2;
    pivot.add(this.axe);
    this.group.add(this.block, pivot);
    this.pos = new THREE.Vector3(x, y, z);
  }

  take() {
    this.taken = true;
    this.axe.visible = false;
  }
}

// ---------------------------------------------------------------- stones

export class RiverStone {
  readonly mesh: THREE.Mesh;
  readonly mat = glintMat({ toneVar: 0.3 });
  readonly pos: THREE.Vector3;
  taken = false;

  constructor(def: StoryStone, y: number, readonly index: number) {
    if (!PEBBLES.length) for (let i = 0; i < 4; i++) PEBBLES.push(buildPebble(71 + i * 13));
    this.mesh = propMesh(PEBBLES[index % PEBBLES.length], this.mat, { sc: def.sc * 1.25, rot: def.rot, tone: (index * 0.37) % 1 });
    this.mesh.position.set(def.x, y - 0.03, def.z);
    this.pos = new THREE.Vector3(def.x, y, def.z);
  }

  take() {
    this.taken = true;
    this.mesh.visible = false;
  }
}

// ---------------------------------------------------------------- flying pickups

/**
 * A log or stone popping out and hopping into your pack: a toss, a bounce,
 * then it homes in on the explorer and counts on arrival.
 */
export class Flyer {
  readonly mesh: THREE.Mesh;
  private vel = new THREE.Vector3();
  private t = 0;
  private spin = new THREE.Vector3();
  done = false;

  constructor(kind: 'log' | 'stone', from: THREE.Vector3, private ground: (x: number, z: number) => number, private delay = 0, stoneIndex = 0) {
    LOG_GEO ??= buildLog();
    if (!PEBBLES.length) for (let i = 0; i < 4; i++) PEBBLES.push(buildPebble(71 + i * 13));
    this.mesh = propMesh(kind === 'log' ? LOG_GEO : PEBBLES[stoneIndex % PEBBLES.length], sharedPropMat(), { sc: kind === 'log' ? 1 : 1.2, tone: Math.random() });
    this.mesh.position.copy(from);
    const a = Math.random() * Math.PI * 2;
    this.vel.set(Math.cos(a) * 1.5, kind === 'log' ? 5.5 : 4, Math.sin(a) * 1.5);
    this.spin.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    this.mesh.visible = delay <= 0;
  }

  /** Returns true on the frame it reaches the explorer. */
  update(dt: number, target: THREE.Vector3): boolean {
    if (this.done) return false;
    this.t += dt;
    if (this.t < this.delay) return false;
    this.mesh.visible = true;
    const t = this.t - this.delay;
    const p = this.mesh.position;
    if (t < 0.75) {
      this.vel.y -= 16 * dt;
      p.addScaledVector(this.vel, dt);
      const g = this.ground(p.x, p.z) + 0.15;
      if (p.y < g) { p.y = g; this.vel.y = Math.abs(this.vel.y) * 0.4; this.vel.x *= 0.6; this.vel.z *= 0.6; }
      this.mesh.rotation.x += this.spin.x * dt;
      this.mesh.rotation.y += this.spin.y * dt;
    } else {
      // Home in, accelerating, in a little arc.
      const k = Math.min(1, (t - 0.75) * 2.2);
      const aim = target.clone();
      aim.y += 1.0 + Math.sin(k * Math.PI) * 0.8;
      p.lerp(aim, 1 - Math.exp(-(4 + k * 14) * dt));
      this.mesh.rotation.y += 8 * dt;
      const s = 1 - Math.max(0, k - 0.6) * 1.2;
      this.mesh.scale.setScalar(Math.max(0.2, s));
      if (p.distanceTo(aim) < 0.35 || t > 2.2) {
        this.done = true;
        this.mesh.visible = false;
        return true;
      }
    }
    return false;
  }
}

// ---------------------------------------------------------------- rocks

let ROCK_GEO: THREE.BufferGeometry | null = null;
const RAY = new THREE.Raycaster();

/**
 * A boulder you can break with the pick: three blows (it jolts and chips),
 * then it cracks apart in a burst of dust and leaves stones to collect. The
 * same mesh as world boulders, so it can stand in for one seamlessly. A big
 * one takes `hp` blows and breaks into rubble instead (story.ts); each piece
 * is a small SmashRock that tumbles out (`hop`).
 */
export class SmashRock {
  readonly group = new THREE.Group();
  readonly mat = glintMat({ toneVar: 0.18 });
  readonly mesh: THREE.Mesh;
  readonly pos: THREE.Vector3;
  readonly radius: number;
  hits = 0;
  broken = false;
  private jolt = 0;
  private joltV = 0;
  private breakT = -1;
  private hopT = -100;
  private hopFrom = new THREE.Vector3();
  private rest = new THREE.Vector3();
  onBroken?: (r: SmashRock) => void;

  /** `row`: world instance row (x, y, z, scale, rot, yScale, lean, tone). */
  constructor(readonly row: ArrayLike<number>, readonly index = -1, readonly hp = 3) {
    ROCK_GEO ??= buildBoulder(5, 3);
    this.mesh = propMesh(ROCK_GEO, this.mat, { sc: row[3], rot: row[4], sy: row[5], tone: row[7] });
    this.group.position.set(row[0], row[1], row[2]);
    this.group.add(this.mesh);
    this.pos = new THREE.Vector3(row[0], row[1] + row[3] * 0.25, row[2]);
    this.radius = 0.9 * row[3];
    this.rest.copy(this.group.position);
  }

  /** Tumble out from `from` to where it rests, after `delay` s. */
  hop(from: THREE.Vector3, delay: number) {
    this.hopFrom.copy(from);
    this.hopT = -delay;
    this.group.position.copy(from);
    this.group.visible = false;
  }

  /**
   * How far the rock's surface is from its centre, horizontally, in direction
   * `dir` (unit xz) at world height `y`: a ray cast in from outside against
   * the posed mesh. 0 above the rock.
   */
  surface(dir: THREE.Vector3, y: number): number {
    if (!this.posed) {
      const [sc, rot, sy] = [this.row[3], this.row[4], this.row[5]];
      const g = ROCK_GEO!.clone().scale(sc, sc * sy, sc).rotateY(rot);
      this.posed = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    }
    const far = 4 * this.row[3] + 2;
    RAY.set(new THREE.Vector3(dir.x * far, y - this.row[1], dir.z * far), new THREE.Vector3(-dir.x, 0, -dir.z));
    const hit = RAY.intersectObject(this.posed, false)[0];
    return hit ? Math.hypot(hit.point.x, hit.point.z) : 0;
  }
  private posed: THREE.Mesh | null = null;

  /** World height of the rock's upper surface above (x, z) (its base if the point misses it). */
  top(x: number, z: number): number {
    this.surface(new THREE.Vector3(1, 0, 0), this.row[1]);
    RAY.set(new THREE.Vector3(x - this.row[0], 10 * this.row[3] + 5, z - this.row[2]), new THREE.Vector3(0, -1, 0));
    const hit = RAY.intersectObject(this.posed!, false)[0];
    return this.row[1] + (hit ? hit.point.y : 0);
  }

  hit(): boolean {
    if (this.broken) return false;
    this.hits++;
    this.joltV += 2.5;
    if (this.hits >= this.hp) { this.broken = true; this.breakT = 0; return true; }
    return false;
  }

  /** Restore a saved state instantly. */
  setBroken() {
    this.broken = true;
    this.group.visible = false;
  }

  update(dt: number) {
    this.joltV += (-120 * this.jolt - 9 * this.joltV) * dt;
    this.jolt += this.joltV * dt;
    this.mesh.scale.set(1 + this.jolt * 0.04, 1 - this.jolt * 0.06, 1 + this.jolt * 0.04);
    if (this.hopT > -99) {
      this.hopT += dt;
      if (this.hopT >= 0) {
        // A toss up and out, a squash as it lands.
        const t = Math.min(1, this.hopT / 0.5);
        this.group.visible = true;
        this.group.position.lerpVectors(this.hopFrom, this.rest, t);
        this.group.position.y += Math.sin(t * Math.PI) * 0.9;
        const land = Math.max(0, 1 - Math.abs(this.hopT - 0.55) / 0.12);
        this.mesh.scale.set((0.55 + 0.45 * t) * (1 + land * 0.12), (0.55 + 0.45 * t) * (1 - land * 0.18), (0.55 + 0.45 * t) * (1 + land * 0.12));
        if (this.hopT > 0.7) { this.hopT = -100; this.group.position.copy(this.rest); }
      }
    }
    if (this.breakT >= 0) {
      this.breakT += dt;
      // A beat, then it falls apart: swell, then shrink away into dust.
      const t = this.breakT;
      const s = t < 0.12 ? 1 + t : Math.max(0.001, 1.12 * (1 - (t - 0.12) / 0.2));
      this.mesh.scale.setScalar(s);
      if (t > 0.12 && t - dt <= 0.12) this.onBroken?.(this);
      if (t > 0.32) { this.group.visible = false; this.breakT = -1; }
    }
  }
}

// ---------------------------------------------------------------- pick

/** The pickaxe, its point struck into the top of a boulder behind the cabin. */
export class PickProp {
  readonly group = new THREE.Group();
  readonly mat = glintMat({ toneVar: 0 });
  readonly mesh: THREE.Mesh;
  readonly pos: THREE.Vector3;
  taken = false;

  /** `dir`: unit xz from the rock's centre toward the side the handle leans out over. */
  constructor(rock: SmashRock, dir: THREE.Vector3) {
    const S = 1.35, TILT = 0.85, BITE = 0.07;
    this.mesh = propMesh(buildPick(), this.mat);
    this.mesh.scale.setScalar(S);
    // Tip at the pivot's origin; tilt the handle up and out (the point
    // goes in steeply), then turn so the handle leans over `dir`.
    const tilt = new THREE.Group();
    tilt.rotation.z = -TILT;
    this.mesh.position.copy(PICK_TIP).multiplyScalar(-S);
    tilt.add(this.mesh);
    const pivot = new THREE.Group();
    pivot.rotation.y = Math.atan2(-dir.z, dir.x);
    pivot.add(tilt);
    // Struck in a little off the crown toward `dir`, sunk a touch into the rock.
    const off = rock.radius * 0.3;
    const x = rock.row[0] + dir.x * off, z = rock.row[2] + dir.z * off;
    pivot.position.set(x, rock.top(x, z) - BITE, z);
    this.group.add(pivot);
    this.pos = new THREE.Vector3(x, pivot.position.y + 0.3, z);
  }

  take() {
    this.taken = true;
    this.mesh.visible = false;
  }
}

// ---------------------------------------------------------------- lasso

/** A coil of rope with its running loop hanging free, and the peg it hangs on. */
function buildLassoGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const kind = (g: THREE.BufferGeometry, k: number) => {
    const out = g.toNonIndexed();
    for (const a of Object.keys(out.attributes)) if (a !== 'position' && a !== 'normal') out.deleteAttribute(a);
    out.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(out.attributes.position.count).fill(k), 1));
    return out;
  };
  // Coils: a few rope rings stacked slightly askew, hanging flat against the post.
  for (let i = 0; i < 4; i++) {
    const g = new THREE.TorusGeometry(0.2 - i * 0.012, 0.028, 8, 22);
    g.rotateZ(i * 0.35);
    g.translate(0.01 * i, -0.2 - i * 0.012, 0.04 + i * 0.022);
    parts.push(kind(g, 17));
  }
  // The loop dangling out below, with its knot.
  const loop = new THREE.TorusGeometry(0.13, 0.022, 8, 18);
  loop.scale(1, 1.35, 1);
  loop.rotateY(0.4);
  loop.translate(0.1, -0.55, 0.1);
  parts.push(kind(loop, 17));
  const tail = new THREE.CylinderGeometry(0.022, 0.022, 0.2, 6);
  tail.translate(0.1, -0.32, 0.1);
  parts.push(kind(tail, 17));
  const peg = new THREE.CylinderGeometry(0.03, 0.035, 0.22, 7);
  peg.rotateX(Math.PI / 2);
  peg.translate(0, 0, 0.1);
  parts.push(kind(peg, 1));
  const g = mergeGeometries(parts)!;
  g.computeBoundingSphere();
  return g;
}

/** The lasso the spirit gives you, hung on the gatepost until you take it. */
export class LassoProp {
  readonly group = new THREE.Group();
  readonly mat = glintMat({ toneVar: 0 });
  readonly mesh: THREE.Mesh;
  readonly pos: THREE.Vector3;
  shown = false;
  taken = false;
  private popT = -1;

  /** Hung at `at`, facing out along (fx, fz). */
  constructor(at: THREE.Vector3, fx: number, fz: number) {
    this.mesh = propMesh(buildLassoGeo(), this.mat);
    this.group.position.copy(at);
    this.group.rotation.y = Math.atan2(fx, fz);
    this.group.add(this.mesh);
    this.group.visible = false;
    this.pos = at.clone().setY(at.y - 0.25);
  }

  /** It appears (with a little bounce unless `instant`). */
  show(instant = false) {
    this.shown = true;
    this.group.visible = !this.taken;
    this.popT = instant ? -1 : 0;
    this.mesh.scale.setScalar(instant ? 1 : 0.001);
  }

  take() {
    this.taken = true;
    this.group.visible = false;
  }

  update(dt: number) {
    if (this.popT < 0) return;
    this.popT += dt;
    const e = Math.min(1, this.popT / 0.6);
    this.mesh.scale.setScalar(Math.max(0.001, 1 - Math.pow(1 - e, 3) * Math.cos(e * 7)));
    this.mesh.rotation.z = (1 - e) * 1.2 * Math.sin(this.popT * 14);
    if (e >= 1) { this.popT = -1; this.mesh.scale.setScalar(1); this.mesh.rotation.z = 0; }
  }
}

// ---------------------------------------------------------------- stumps

/** What's left of every world tree you've felled: one instanced draw. */
export class Stumps {
  readonly mesh: THREE.Mesh;
  private geo: THREE.InstancedBufferGeometry;
  private a0: THREE.InstancedBufferAttribute;
  private a1: THREE.InstancedBufferAttribute;
  static readonly MAX = 1024;

  constructor() {
    STUMP_GEO ??= buildStump();
    const g = new THREE.InstancedBufferGeometry();
    g.index = STUMP_GEO.index;
    g.setAttribute('position', STUMP_GEO.attributes.position);
    g.setAttribute('normal', STUMP_GEO.attributes.normal);
    g.setAttribute('aKind', STUMP_GEO.attributes.aKind);
    this.a0 = new THREE.InstancedBufferAttribute(new Float32Array(Stumps.MAX * 4), 4);
    this.a1 = new THREE.InstancedBufferAttribute(new Float32Array(Stumps.MAX * 4), 4);
    g.setAttribute('aI0', this.a0);
    g.setAttribute('aI1', this.a1);
    g.instanceCount = 0;
    this.geo = g;
    this.mesh = new THREE.Mesh(g, sharedPropMat());
    this.mesh.frustumCulled = false;
  }

  /** `grow`: a sapling is coming up through it; the stump rots into the ground (gone by 0.4). */
  set(all: { x: number; y: number; z: number; sc: number; rot: number; grow?: number }[]) {
    const list = all.filter((t) => (t.grow ?? 0) < 0.4);
    const n = Math.min(list.length, Stumps.MAX);
    for (let i = 0; i < n; i++) {
      const t = list[i];
      const sink = Math.min(1, (t.grow ?? 0) / 0.4) * 0.5 * t.sc;
      this.a0.setXYZW(i, t.x, t.y - 0.15 - sink, t.z, t.sc * 0.95);
      this.a1.setXYZW(i, t.rot, 1, 0, 0.5);
    }
    this.a0.needsUpdate = this.a1.needsUpdate = true;
    this.geo.instanceCount = n;
    this.mesh.visible = n > 0;
  }
}
