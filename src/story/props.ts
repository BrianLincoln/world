import * as THREE from 'three';
import { buildConifer, TREE_HEIGHT } from '../gfx/geometry';
import { makePropMaterial } from '../gfx/materials';
import type { StoryStone, StoryTree } from '../world/storySite';
import { buildAxe, buildBlock, buildLog, buildPebble, buildStump } from './geometry';

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
  readonly mat = glintMat({ bend: 0.24, wind: 0.012, heightRef: TREE_HEIGHT, toneVar: 0.22, cutaway: 'near' });
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
  onLanded?: (t: ChopTree) => void;
  onGone?: (t: ChopTree, along: THREE.Vector3[]) => void;

  constructor(readonly def: StoryTree, y: number, readonly index: number) {
    TREE_GEO ??= buildConifer(7, 0);
    STUMP_GEO ??= buildStump();
    this.tree = propMesh(TREE_GEO, this.mat, { sc: def.sc, rot: def.rot, lean: def.lean, tone: def.tone });
    this.stump = propMesh(STUMP_GEO, sharedPropMat(), { sc: def.sc * 0.95, rot: def.rot, tone: def.tone });
    this.stump.visible = false;
    this.group.position.set(def.x, y - 0.4, def.z);
    this.stump.position.y = 0.25;
    this.group.add(this.tree, this.stump);
    this.pos = new THREE.Vector3(def.x, y, def.z);
    this.radius = 0.34 * def.sc;
  }

  get standing() { return this.state === 'standing'; }

  /** One axe blow from `from` (the explorer's position). Returns true on the felling blow. */
  hit(from: THREE.Vector3): boolean {
    if (this.state !== 'standing') return false;
    this.hits++;
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
        const h = TREE_HEIGHT * this.def.sc;
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
    // The axe leans against the block on the side facing the spawn.
    this.axe.position.set(0.12, 0.02, 0.46);
    this.axe.rotation.set(-0.32, 0.4, 0.12);
    this.group.add(this.block, this.axe);
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
