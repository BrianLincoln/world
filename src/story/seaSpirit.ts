// The sea spirit: what keeps you on your island (owner, 2026-10-13; DESIGN.md
// "The shape of the world"). Coastal water is free. Out over the deep (the
// darker sea: `isDeep` in world/islands.ts), by swimming, on a mount or in
// the air, it shows itself: two pale eyes come up under you and the water
// darkens round them. Turn back and they sink. Carry on, and an arm of water
// rises, takes you (and what you ride) and sets you down on the shore of the
// island you left. You're never hurt, only put back, by something you can
// watch: as the towers' spirits and the rings' do it.
//
// No meter, nothing saved. A first rough form, not played by the owner.

import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';
import { islandAt, isDeep } from '../world/islands';
import type { WorldGen } from '../world/worldgen';
import type { Body } from '../player/movement';
import type { Sfx } from './audio';

/** Seconds of warning before it takes you, how long the arm takes to come up, and to go back down. */
const WARN = 2.2, RISE = 0.7, SINK = 1.1;
/** How fast it carries you (m/s), and the least and most a carry lasts (s). */
const PACE = 42, CARRY: [number, number] = [2.4, 7];
/** The arm: how many beads of water, and how thick at the root and the wrist (m). */
const BEADS = 14, ROOT = 3.4, WRIST = 1.5;

type Phase = 'calm' | 'warn' | 'rise' | 'carry' | 'set' | 'sink';

export interface SeaDeps {
  gen: WorldGen;
  /** The ground as you stand on it (prints, pads and all). */
  height(x: number, z: number): number;
  sfx?: Sfx;
  /** A burst of spray at a place: how many, how big. */
  spray?(at: THREE.Vector3, n: number, size: number): void;
}

export class SeaSpirit {
  readonly group = new THREE.Group();
  phase: Phase = 'calm';
  /** It has you: hands off. */
  get busy() { return this.phase === 'rise' || this.phase === 'carry' || this.phase === 'set'; }
  /** 0..1: how far the warning has got (for a face, a sound, a test). */
  get dread() { return this.phase === 'warn' ? this.t / WARN : this.busy ? 1 : 0; }

  private t = 0;
  /** The last dry ground you stood on, and its island. */
  private home = new THREE.Vector3();
  private homeIsle = -1;
  private hasHome = false;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private root = new THREE.Vector3();
  private span = 1;
  private beads: THREE.Mesh[] = [];
  private palm: THREE.Mesh;
  private eyes: THREE.Mesh[] = [];
  private pool: THREE.Mesh;
  private tmp = new THREE.Vector3();

  constructor(private d: SeaDeps) {
    // Water in the scene's own colours: the sea's body, a paler palm, eyes like a tower spirit's.
    const body = makeSolidMaterial('#7f97a6', 0, { keep: 0.8 }), pale = makeSolidMaterial('#c9d8d6', 0, { keep: 0.8 });
    const ball = new THREE.IcosahedronGeometry(1, 2);
    for (let i = 0; i < BEADS; i++) { const m = new THREE.Mesh(ball, body); m.frustumCulled = false; this.beads.push(m); this.group.add(m); }
    this.palm = new THREE.Mesh(ball, pale); this.palm.frustumCulled = false; this.group.add(this.palm);
    // (Under the water, looking up: flat on the surface, drawn over it.)
    const eyeMat = makeSolidMaterial('#f4ecd2', 0.3, { keep: 1 }), disc = new THREE.CircleGeometry(1, 56).rotateX(-Math.PI / 2);
    for (let i = 0; i < 2; i++) { const e = new THREE.Mesh(disc, eyeMat); e.frustumCulled = false; e.renderOrder = 3; this.eyes.push(e); this.group.add(e); }
    this.pool = new THREE.Mesh(disc, makeSolidMaterial('#465a70', 0, { keep: 0.9 })); this.pool.frustumCulled = false; this.pool.renderOrder = 2; this.group.add(this.pool);
    this.hide();
  }

  private hide() { for (const m of [...this.beads, this.palm, ...this.eyes, this.pool]) m.visible = false; }

  /** Is (x, z) the deep? */
  deep(x: number, z: number) { return this.d.gen.sea && isDeep(x, z, this.d.gen.baseHeight(x, z), 3); }

  /**
   * Once a frame, after the player has moved. `on`: it may act (not in a dungeon or a cutscene). While `busy`
   * it places the body itself: the caller keeps its hands off, and whatever is ridden goes where the body goes.
   */
  update(dt: number, body: Body, on: boolean) {
    const g = this.d.gen;
    if (!g.sea) return;
    const p = body.pos, ground = this.d.height(p.x, p.z);
    // Where you last stood on dry ground: that's the island you left.
    if (!this.busy && body.grounded && ground > 0.8 && p.y - ground < 1.5) { const id = islandAt(p.x, p.z); if (id >= 0) { this.home.copy(p); this.homeIsle = id; this.hasHome = true; } }
    const over = on && this.hasHome && p.y < 600 && this.deep(p.x, p.z);
    switch (this.phase) {
      case 'calm':
        if (over) { this.phase = 'warn'; this.t = 0; this.d.sfx?.sink(); }
        break;
      case 'warn':
        this.t += over ? dt : -dt * 1.6;
        if (this.t <= 0) { this.phase = 'calm'; this.hide(); break; }
        this.showEyes(p, this.t / WARN);
        if (this.t >= WARN) this.take(body);
        break;
      case 'rise': {
        this.t += dt;
        const k = Math.min(1, this.t / RISE);
        body.pos.copy(this.from); body.vel.set(0, 0, 0);
        this.showEyes(this.from, 1 - k);
        this.arm(this.root, this.tmp.copy(this.from).setY(THREE.MathUtils.lerp(-2, this.from.y, k * k * (3 - 2 * k))), k);
        if (k >= 1) { this.phase = 'carry'; this.t = 0; this.d.sfx?.whoosh(); }
        break;
      }
      case 'carry': {
        this.t += dt;
        const k = Math.min(1, this.t / this.span), s = k * k * (3 - 2 * k);
        const lift = Math.min(22, this.from.distanceTo(this.to) * 0.12) + 4;
        body.pos.lerpVectors(this.from, this.to, s); body.pos.y += Math.sin(Math.PI * s) * lift;
        body.vel.set(0, 0, 0);
        body.heading = Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z);
        // Its root goes along under you while there's water to go in, and stops at the shore: then it reaches.
        if (g.baseHeight(body.pos.x, body.pos.z) < -1.5) this.root.set(body.pos.x, 0, body.pos.z);
        this.arm(this.root, body.pos, 1);
        if (k >= 1) { this.phase = 'set'; this.t = 0; }
        break;
      }
      case 'set': {
        this.t += dt;
        body.pos.copy(this.to); body.vel.set(0, 0, 0);
        this.arm(this.root, this.to, 1);
        if (this.t > 0.25) { this.phase = 'sink'; this.t = 0; body.grounded = true; this.d.sfx?.thud(); this.d.spray?.(this.to, 10, 0.5); }
        break;
      }
      case 'sink': {
        this.t += dt;
        const k = Math.min(1, this.t / SINK);
        this.arm(this.root, this.tmp.lerpVectors(this.to, this.root, k * k), 1 - k);
        if (k >= 1) { this.phase = 'calm'; this.hide(); }
        break;
      }
    }
  }

  private take(body: Body) {
    this.phase = 'rise'; this.t = 0;
    this.from.copy(body.pos);
    this.root.set(body.pos.x, 0, body.pos.z);
    this.shore(this.from, this.to);
    this.span = THREE.MathUtils.clamp(this.from.distanceTo(this.to) / PACE, CARRY[0], CARRY[1]);
    this.d.sfx?.sink(true);
    this.d.spray?.(this.root, 14, 0.7);
  }

  /**
   * Where it sets you down: the shore of the island you left, at the point nearest where it took you. Never the
   * nearest shore of all (a ferry). Walked from you toward where you last stood, to the first dry ground that is
   * that island's, and a few metres up the beach.
   */
  private shore(from: THREE.Vector3, out: THREE.Vector3) {
    const g = this.d.gen, l = Math.hypot(this.home.x - from.x, this.home.z - from.z) || 1;
    const ux = (this.home.x - from.x) / l, uz = (this.home.z - from.z) / l;
    out.copy(this.home);
    // (On past where you stood, too: that was the water's edge, and it puts you well up the beach.)
    for (let s = 0; s < l + 80; s += 4) {
      const x = from.x + ux * s, z = from.z + uz * s;
      if (g.height(x, z) < 2.2 || islandAt(x, z) !== this.homeIsle) continue;
      out.set(x, 0, z);
      break;
    }
    out.y = this.d.height(out.x, out.z);
    return out;
  }

  /** The warning: a dark pool on the water under you and two pale eyes in it, growing. */
  private showEyes(at: THREE.Vector3, k: number) {
    const s = Math.max(0, Math.min(1, k)), e = s * s * (3 - 2 * s);
    this.pool.visible = e > 0.01;
    this.pool.position.set(at.x, 0.05, at.z);
    this.pool.scale.setScalar(4 + 13 * e);
    const blink = Math.sin(this.t * 9) > 0.96 ? 0.15 : 1;
    for (let i = 0; i < 2; i++) {
      const m = this.eyes[i];
      m.visible = e > 0.2;
      m.position.set(at.x + (i ? 2.3 : -2.3) * e, 0.08, at.z + 1.2 * e);
      m.scale.set(1.5 * e, 1, 1.5 * e * blink);
    }
  }

  /** The arm: beads of water along a bow from its root in the sea to your feet, and a palm under you. `k`: how much of it there is. */
  private arm(root: THREE.Vector3, hand: THREE.Vector3, k: number) {
    const show = k > 0.02;
    this.pool.visible = show; this.pool.position.set(root.x, 0.05, root.z); this.pool.scale.setScalar(6 * k + 2);
    for (const e of this.eyes) e.visible = false;
    // A bow: straight up out of the water first, then over to you.
    const mx = root.x + (hand.x - root.x) * 0.25, mz = root.z + (hand.z - root.z) * 0.25, my = Math.max(hand.y, 2) + Math.hypot(hand.x - root.x, hand.z - root.z) * 0.35;
    for (let i = 0; i < BEADS; i++) {
      const m = this.beads[i], u = i / (BEADS - 1), a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      m.visible = show;
      m.position.set(a * root.x + b * mx + c * hand.x, a * -1.5 + b * my + c * (hand.y - 0.9), a * root.z + b * mz + c * hand.z);
      m.scale.setScalar(THREE.MathUtils.lerp(ROOT, WRIST, u) * (0.35 + 0.65 * k));
    }
    this.palm.visible = show;
    this.palm.position.set(hand.x, hand.y - 0.75, hand.z);
    this.palm.scale.set(2.6 * k, 0.7 * k, 2.6 * k);
  }

  dispose() { this.group.removeFromParent(); }
}
