import * as THREE from 'three';
import { hash01 } from '../core/rng';
import { handBits } from '../dungeon/shell';
import { makeSolidMaterial } from '../gfx/materials';
import type { WorldGen } from './worldgen';

// Stone hands about the world: the giant's hand that stands in the first
// dungeon, bigger, reaching up out of the ground in out-of-the-way places:
// small islands, the tips of headlands, summits. They don't do anything yet
// (the owner: "just place them randomly in interesting places"); they are
// meant to become puzzle pieces. Where they stand is a pure function of the
// seed: the world is cut into big cells, and each cell has at most one, at
// the most striking spot in it, if it has one striking enough.
//
// Finding a spot costs a couple of thousand height samples, so cells are
// looked at one a frame as you travel, nearest first, and remembered.

/** A cell's side (m), how many cells out from the camera are looked at, and how far off a hand is drawn. */
const CELL = 1100, REACH = 2, DRAW = 3200;
/** The share of cells that may have one at all. */
const RATE = 0.6;
/** Nothing within this of the start, of a tower, or of the dungeon's ring (m). */
const CLEAR_HOME = 420, CLEAR_TOWER = 150, CLEAR_RING = 160;

export interface Hand { x: number; y: number; z: number; rot: number; scale: number; kind: 'island' | 'summit' }

const merged = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (g) return g;
    const pos: number[] = [], nor: number[] = [];
    for (const b of handBits()) {
      const f = b.index ? b.toNonIndexed() : b;
      pos.push(...(f.getAttribute('position').array as Float32Array));
      nor.push(...(f.getAttribute('normal').array as Float32Array));
    }
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  };
})();

export class Hands {
  readonly group = new THREE.Group();
  /** Every cell looked at so far: its hand, or null. */
  private cells = new Map<string, Hand | null>();
  private meshes = new Map<string, THREE.Mesh>();
  /** The giant's own ash blue. */
  private mat = makeSolidMaterial('#9db3d6', 0, { keep: 0.72 });

  constructor(private gen: WorldGen) {}

  /** The hands found so far. */
  get list(): Hand[] { return [...this.cells.values()].filter((h): h is Hand => !!h); }

  /** The hand of cell (i, j), if it has one: the most striking spot in it. */
  private find(i: number, j: number): Hand | null {
    const g = this.gen, seed = g.seed, H = (x: number, z: number) => g.height(x, z);
    // (Not every cell: they're for coming across, not for counting.)
    if (hash01(i, j, seed, 770) > RATE) return null;
    let best: Hand | null = null, top = 0;
    const offer = (x: number, z: number, y: number, kind: Hand['kind'], score: number) => {
      if (score <= top) return;
      const st = g.story;
      if (Math.hypot(x - st.x, z - st.z) < CLEAR_HOME || g.dungeons.some((d) => Math.hypot(x - d.x, z - d.z) < CLEAR_RING)) return;
      if (g.towers.towers.some((t) => Math.hypot(t.x - x, t.z - z) < CLEAR_TOWER)) return;
      top = score;
      best = { x, y, z, kind, rot: hash01(i, j, seed, 771) * Math.PI * 2, scale: 1.7 + hash01(i, j, seed, 772) * 1.1 };
    };
    // Islands and the tips of headlands: dry, low, and water most of the way round, near and further off.
    const N = 9;
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const x = (i + (a + hash01(i * N + a, j * N + b, seed, 773)) / N) * CELL, z = (j + (b + hash01(i * N + a, j * N + b, seed, 774)) / N) * CELL;
      const y = H(x, z);
      if (y < 2 || y > 22) continue;
      let wet = 0;
      for (let k = 0; k < 8; k++) {
        const c = Math.cos(k * 0.785), s = Math.sin(k * 0.785);
        if (H(x + c * 70, z + s * 70) < 0 || H(x + c * 140, z + s * 140) < 0) wet++;
      }
      if (wet >= 7) offer(x, z, y, 'island', 3 + wet * 0.3 + hash01(i * N + a, j * N + b, seed, 775) * 0.5);
    }
    // Summits: climb from a few starts to the top of whatever they're on; high, and falling away all round.
    for (let n = 0; n < 5 && top < 3; n++) {
      let x = (i + hash01(i, j, seed, 780 + n)) * CELL, z = (j + hash01(i, j, seed, 790 + n)) * CELL, y = H(x, z);
      for (let step = 0; step < 14; step++) {
        let bx = x, bz = z, by = y;
        for (let k = 0; k < 8; k++) {
          const px = x + Math.cos(k * 0.785) * 30, pz = z + Math.sin(k * 0.785) * 30, py = H(px, pz);
          if (py > by) { bx = px; bz = pz; by = py; }
        }
        if (by <= y) break;
        x = bx; z = bz; y = by;
      }
      if (y < 120 || Math.floor(x / CELL) !== i || Math.floor(z / CELL) !== j) continue;
      let drop = Infinity;
      for (let k = 0; k < 8; k++) drop = Math.min(drop, y - H(x + Math.cos(k * 0.785) * 60, z + Math.sin(k * 0.785) * 60));
      if (drop > 6) offer(x, z, y, 'summit', 1 + Math.min(1.8, y / 200) + Math.min(drop, 30) * 0.02);
    }
    return best;
  }

  /** Look at one more cell near the camera (if any is left), and draw the hands in reach. */
  update(cam: THREE.Vector3) {
    const ci = Math.floor(cam.x / CELL), cj = Math.floor(cam.z / CELL);
    let todo: [number, number] | null = null, near = Infinity;
    for (let i = ci - REACH; i <= ci + REACH; i++) for (let j = cj - REACH; j <= cj + REACH; j++) {
      if (this.cells.has(`${i},${j}`)) continue;
      const d = Math.hypot((i + 0.5) * CELL - cam.x, (j + 0.5) * CELL - cam.z);
      if (d < near) { near = d; todo = [i, j]; }
    }
    if (todo) this.cells.set(`${todo[0]},${todo[1]}`, this.find(todo[0], todo[1]));
    for (const [key, h] of this.cells) {
      if (!h) continue;
      const show = Math.hypot(h.x - cam.x, h.z - cam.z) < DRAW;
      let m = this.meshes.get(key);
      if (show && !m) {
        m = new THREE.Mesh(merged(), this.mat);
        // (Its heel goes well down into the ground, so on a slope none of it hangs in the air.)
        m.position.set(h.x, h.y - 0.5 * h.scale, h.z);
        m.rotation.y = h.rot;
        m.scale.setScalar(h.scale);
        this.meshes.set(key, m);
        this.group.add(m);
      }
      if (m) m.visible = show;
    }
  }

  /** Dev: look at every cell within `cells` of a point now. */
  survey(x: number, z: number, cells = REACH) {
    const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
    for (let i = ci - cells; i <= ci + cells; i++) for (let j = cj - cells; j <= cj + cells; j++) if (!this.cells.has(`${i},${j}`)) this.cells.set(`${i},${j}`, this.find(i, j));
    return this.list;
  }

  /** A hand is a thing you can't walk through: its palm, as a round post. */
  collide(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    for (const h of this.cells.values()) {
      if (!h) continue;
      const dx = pos.x - h.x, dz = pos.z - h.z, dist = Math.hypot(dx, dz), min = 2.1 * h.scale + r;
      if (dist >= min || dist < 1e-4 || pos.y > h.y + 9.5 * h.scale) continue;
      const nx = dx / dist, nz = dz / dist, vn = vel.x * nx + vel.z * nz;
      pos.x += nx * (min - dist);
      pos.z += nz * (min - dist);
      if (vn < 0) { vel.x -= nx * vn; vel.z -= nz * vn; }
    }
  }

  dispose() { this.group.removeFromParent(); }
}
