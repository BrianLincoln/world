import * as THREE from 'three';
import { buildConifer, TREE_HEIGHT } from '../gfx/geometry';
import { makePropMaterial } from '../gfx/materials';
import { Puffs } from '../gfx/puffs';
import { propMesh } from '../story/props';
import type { Colliders } from '../world/colliders';
import { Prints, soleSdf } from '../world/prints';

// What the giant leaves behind: wherever a foot comes down, a permanent
// print (world/prints.ts), the trees under the sole pressed flat and fanned
// outward, and steam off the prints that are still warm while it walks on.

/** Flattened trees kept lying about (the oldest are cleared away). */
const MAX_FLAT = 90;
/** Dry land only: a print under water would be a hole in the lake. */
const MIN_GROUND = 0.6;

const Y = new THREE.Vector3(0, 1, 0);
const bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3();
const m4 = new THREE.Matrix4();
const v = new THREE.Vector3();

export class Trail {
  readonly group = new THREE.Group();
  readonly prints = new Prints();
  private steam = new Puffs('#fdf6ee', 60, 0, 0.5, true);
  private flat: THREE.Mesh[] = [];
  private treeGeo = [buildConifer(7, 1), buildConifer(31, 1)];
  private treeMat = makePropMaterial({ heightRef: TREE_HEIGHT, toneVar: 0.22, doubleSide: true });
  private steamT = 0;

  constructor(private d: { ground: (x: number, z: number) => number; colliders: Colliders }) {
    this.group.add(this.steam.group);
  }

  /** The ground with the prints pressed into it. */
  height(x: number, z: number) { return this.d.ground(x, z) + this.prints.offset(x, z); }

  /** A foot came down: `at` is under its ankle, `yaw` the way it points. Returns false in water. */
  stamp(at: THREE.Vector3, yaw: number): boolean {
    const x = at.x + Math.sin(yaw) * 3.4, z = at.z + Math.cos(yaw) * 3.4;
    if (this.d.ground(x, z) < MIN_GROUND) return false;
    const trees = this.d.colliders.treesNear(x, z, 18);
    const p = this.prints.add(x, z, yaw);
    for (const r of trees) {
      const s = soleSdf(r[0], r[2], p);
      if (s > 1.2) continue;
      // Laid flat, crown away from the middle of the sole, pressed like a flower in a book.
      by.set(r[0] - x, 0, r[2] - z);
      if (by.lengthSq() < 0.5) by.set(Math.sin(yaw), 0, Math.cos(yaw));
      by.normalize();
      bx.crossVectors(by, Y).normalize();
      bz.crossVectors(bx, by);
      const mesh = propMesh(this.treeGeo[r[7] < 0.5 ? 0 : 1], this.treeMat, { sc: r[3], rot: r[4], sy: r[5], tone: r[7] });
      mesh.position.set(r[0], this.height(r[0], r[2]) + 0.25, r[2]);
      mesh.quaternion.setFromRotationMatrix(m4.makeBasis(bx, by, bz));
      mesh.scale.set(1, 1, 0.22);
      this.group.add(mesh);
      this.flat.push(mesh);
    }
    while (this.flat.length > MAX_FLAT) {
      const old = this.flat.shift()!;
      this.group.remove(old);
    }
    // Whatever stood here is no longer solid.
    for (let dz = -24; dz <= 24; dz += 12) for (let dx = -24; dx <= 24; dx += 12) this.d.colliders.invalidate(x + dx, z + dz);
    return true;
  }

  /** `walking`: the giant is on the move. (Stood or sat on its last prints, their steam was a cloud round it for good.) */
  update(dt: number, near: THREE.Vector3, walking: boolean) {
    // Steam off the warm ones near you: soft puffs that rise and thin.
    this.steamT -= dt;
    const L = this.prints.list;
    if (this.steamT <= 0 && L.length && walking) {
      this.steamT = 0.07;
      const p = L[Math.max(0, L.length - 1 - Math.floor(Math.random() * 10))]; // presentation only
      const w = this.prints.warmth(p);
      if (Math.random() < w && Math.hypot(p.x - near.x, p.z - near.z) < 260) {
        const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 5.5;
        const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r * 1.4;
        this.steam.emit(v.set(x, this.height(x, z) + 0.3, z), 1, 0.45 + 0.55 * w, 0.3, undefined, { life: 3.4, rise: 0.9, drag: 0.8, up: 1.4 });
      }
    }
    this.steam.update(dt);
  }

  clear() {
    this.prints.clear();
    for (const m of this.flat) this.group.remove(m);
    this.flat.length = 0;
  }
}
