// The lumber mill: the village's first building that makes something by
// itself (owner, 2026-10-13: "I want to find more and more ways to expand the
// village, lumber mill seems like an obvious choice. it adds x lumber per
// played period"). An open shed with a saw bench on one of the village's
// free plots, a pile of logs by it and a stack of boards that grows while you
// play: one every `EVERY` seconds of play (never while you're away from the
// game), up to `CAP`. Walk up to the stack and they're yours, as wood.
//
// It stands once the first spirit is home. A first rough form: nobody works
// at it, it isn't solid, and its numbers are guesses to be played.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeSolidMaterial } from '../gfx/materials';
import { BIOME } from '../gfx/palette';
import type { Plot } from '../world/storySite';
import type { Sfx } from './audio';

/** A board every this many seconds of play, and how many the stack holds. (The owner said one in ten minutes "or something": a bridge is a hundred, so this is faster. To be played.) */
export const EVERY = 60, CAP = 60;
/** How near the stack you take from it (m), and how fast they come to you (a second). */
const REACH = 3.2, RATE = 9;

export class LumberMill {
  readonly group = new THREE.Group();
  stock = 0;
  private t = 0;
  private stack: THREE.BufferGeometry;
  private at = new THREE.Vector3();
  private takeT = 0;
  private saveT = 0;
  private geos: THREE.BufferGeometry[] = [];

  constructor(private plot: Plot, private key: string, private sfx?: Sfx) {
    const wood = makeSolidMaterial(BIOME.cabinWall2, 0, { keep: 0.75 }), dark = makeSolidMaterial(BIOME.trunk, 0, { keep: 0.75 }), roof = makeSolidMaterial(BIOME.cabinRoof, 0, { keep: 0.75 }), pale = makeSolidMaterial(BIOME.cutWood, 0, { keep: 0.8 });
    const box = (list: THREE.BufferGeometry[], w: number, h: number, d: number, x: number, y: number, z: number, rz = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); list.push(g); };
    const frame: THREE.BufferGeometry[] = [], top: THREE.BufferGeometry[] = [], cut: THREE.BufferGeometry[] = [], boards: THREE.BufferGeometry[] = [];
    // The shed: four posts, two tie beams, a roof of two slopes, open all round.
    for (const x of [-1.9, 1.9]) for (const z of [-1.4, 1.4]) box(frame, 0.2, 2.5, 0.2, x, 1.25, z);
    for (const z of [-1.4, 1.4]) box(frame, 4.2, 0.18, 0.18, 0, 2.5, z);
    for (const s of [-1, 1]) box(top, 2.5, 0.1, 3.5, s * 1.1, 2.95, 0, -s * 0.42);
    // The saw bench: two trestles, a log on them, a blade standing in its cut.
    for (const x of [-0.8, 0.8]) { box(frame, 0.12, 0.8, 1.0, x, 0.4, 0); box(frame, 0.5, 0.1, 1.1, x, 0.8, 0); }
    { const g = new THREE.CylinderGeometry(0.24, 0.26, 2.6, 9).rotateZ(Math.PI / 2).translate(0, 1.08, 0); cut.push(g.toNonIndexed()); }
    box(frame, 0.03, 0.9, 0.5, 0.35, 1.5, 0);
    // Logs waiting, to one side.
    for (const [x, y, z] of [[-3.1, 0.24, -0.5], [-3.1, 0.24, 0.05], [-3.1, 0.24, 0.6], [-3.1, 0.68, -0.22], [-3.1, 0.68, 0.33]]) cut.push(new THREE.CylinderGeometry(0.24, 0.24, 2.4, 9).rotateX(Math.PI / 2).rotateY(Math.PI / 2).translate(x, y, z).toNonIndexed());
    // The stack of boards, on the other: laid five to a course, each course across the one under it.
    for (let i = 0; i < CAP; i++) {
      const course = Math.floor(i / 5), k = i % 5, across = course % 2 === 1;
      box(boards, across ? 1.5 : 0.26, 0.07, across ? 0.26 : 1.5, 3.1 + (across ? 0 : (k - 2) * 0.3), 0.14 + course * 0.075, across ? (k - 2) * 0.3 : 0);
    }
    box(frame, 0.12, 0.1, 1.5, 2.6, 0.05, 0); box(frame, 0.12, 0.1, 1.5, 3.6, 0.05, 0);
    const add = (list: THREE.BufferGeometry[], mat: THREE.Material, indexed = true) => {
      const g = mergeGeometries(indexed ? list : list.map((p) => { p.deleteAttribute('uv'); return p; }).concat())!;
      for (const p of list) p.dispose();
      this.geos.push(g);
      this.group.add(new THREE.Mesh(g, mat));
      return g;
    };
    add(frame, dark); add(top, roof); add(cut, pale, false);
    this.stack = add(boards, wood);
    this.group.position.set(plot.x, plot.y, plot.z);
    this.group.rotation.y = plot.rot;
    this.at.set(3.1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), plot.rot).add(this.group.position);
    try { const s = JSON.parse(localStorage.getItem(this.key) ?? 'null'); if (s) { this.stock = Math.min(CAP, s.stock | 0); this.t = +s.t || 0; } } catch { /* a fresh mill */ }
    this.show();
  }

  private show() { this.stack.setDrawRange(0, this.stock * 36); }
  private save() { try { localStorage.setItem(this.key, JSON.stringify({ stock: this.stock, t: this.t })); } catch { /* ignore */ } }

  /**
   * `standing`: it's there (the first spirit is home). `dt` is time played. `pos`: where you are; `give(n)` puts
   * wood in your pack. Returns how many it gave this frame.
   */
  update(dt: number, standing: boolean, pos: THREE.Vector3, give: (n: number) => void) {
    this.group.visible = standing;
    if (!standing) return 0;
    this.t += dt;
    let changed = false;
    while (this.t >= EVERY) { this.t -= EVERY; if (this.stock < CAP) { this.stock++; changed = true; } }
    let gave = 0;
    if (this.stock > 0 && Math.hypot(pos.x - this.at.x, pos.z - this.at.z) < REACH && Math.abs(pos.y - this.plot.y) < 3) {
      this.takeT += dt * RATE;
      while (this.takeT >= 1 && this.stock > 0) { this.takeT -= 1; this.stock--; gave++; }
      if (gave) { give(gave); this.sfx?.pickup(); changed = true; }
    } else this.takeT = 0;
    if (changed) { this.show(); this.save(); }
    else if ((this.saveT += dt) > 15) { this.saveT = 0; this.save(); }
    return gave;
  }

  dispose() { this.group.removeFromParent(); for (const g of this.geos) g.dispose(); }
}
