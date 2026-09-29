import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';

// A hand-drawn-looking rope: a verlet chain rendered as a thin tube. The
// outline pass inks both edges, so at a few pixels wide it reads as a line
// drawing of a rope rather than a shaded cylinder.

const N = 22;
const SIDES = 5;
const RADIUS = 0.028;

const ROPE_MAT = () => makeSolidMaterial('#c9a26b', 0, { keep: 0.6 });

export class Rope {
  readonly mesh: THREE.Mesh;
  private p = Array.from({ length: N }, () => new THREE.Vector3());
  private prev = Array.from({ length: N }, () => new THREE.Vector3());
  private pos: THREE.BufferAttribute;
  private nrm: THREE.BufferAttribute;
  /** Rest length (m). */
  length = 5;
  private primed = false;

  constructor() {
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(N * SIDES * 3), 3);
    this.nrm = new THREE.BufferAttribute(new Float32Array(N * SIDES * 3), 3);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.nrm.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.pos);
    geo.setAttribute('normal', this.nrm);
    const idx: number[] = [];
    for (let i = 0; i < N - 1; i++) {
      for (let s = 0; s < SIDES; s++) {
        const a = i * SIDES + s, b = i * SIDES + ((s + 1) % SIDES);
        const c = a + SIDES, d = b + SIDES;
        idx.push(a, c, b, b, c, d);
      }
    }
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, ROPE_MAT());
    this.mesh.frustumCulled = false;
  }

  /**
   * Step the chain with both ends pinned. `floor(x, z)` keeps it on top of
   * the ground.
   */
  update(a: THREE.Vector3, b: THREE.Vector3, dt: number, floor: (x: number, z: number) => number) {
    const p = this.p;
    if (!this.primed) {
      for (let i = 0; i < N; i++) {
        p[i].lerpVectors(a, b, i / (N - 1));
        this.prev[i].copy(p[i]);
      }
      this.primed = true;
    }
    const damp = Math.exp(-2.5 * dt);
    const g = 14 * dt * dt;
    for (let i = 1; i < N - 1; i++) {
      const v = tmp.subVectors(p[i], this.prev[i]).multiplyScalar(damp);
      this.prev[i].copy(p[i]);
      p[i].add(v);
      p[i].y -= g;
    }
    p[0].copy(a);
    p[N - 1].copy(b);
    // If the ends are further apart than the rope, it's simply taut.
    const seg = Math.max(this.length, a.distanceTo(b) * 1.001) / (N - 1);
    for (let it = 0; it < 12; it++) {
      for (let i = 0; i < N - 1; i++) {
        const d = tmp.subVectors(p[i + 1], p[i]);
        const l = d.length();
        if (l < 1e-6) continue;
        const k = (l - seg) / l;
        const wa = i === 0 ? 0 : i + 1 === N - 1 ? 1 : 0.5;
        const wb = i + 1 === N - 1 ? 0 : i === 0 ? 1 : 0.5;
        p[i].addScaledVector(d, k * wa);
        p[i + 1].addScaledVector(d, -k * wb);
      }
      for (let i = 1; i < N - 1; i++) {
        const f = floor(p[i].x, p[i].z) + RADIUS;
        if (p[i].y < f) p[i].y = f;
      }
    }
    this.build();
  }

  /** Throw in progress: a straight-ish line hand -> loop, no physics. */
  line(a: THREE.Vector3, b: THREE.Vector3, sag: number) {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      this.p[i].lerpVectors(a, b, t);
      this.p[i].y -= sag * 4 * t * (1 - t);
      this.prev[i].copy(this.p[i]);
    }
    this.primed = true;
    this.build();
  }

  private build() {
    const p = this.p;
    const pos = this.pos.array as Float32Array;
    const nrm = this.nrm.array as Float32Array;
    for (let i = 0; i < N; i++) {
      const tan = tmp.subVectors(p[Math.min(N - 1, i + 1)], p[Math.max(0, i - 1)]).normalize();
      const side = tmp2.crossVectors(tan, Math.abs(tan.y) > 0.9 ? X : Y).normalize();
      const up = tmp3.crossVectors(side, tan);
      for (let s = 0; s < SIDES; s++) {
        const a = (s / SIDES) * Math.PI * 2;
        const nx = side.x * Math.cos(a) + up.x * Math.sin(a);
        const ny = side.y * Math.cos(a) + up.y * Math.sin(a);
        const nz = side.z * Math.cos(a) + up.z * Math.sin(a);
        const o = (i * SIDES + s) * 3;
        pos[o] = p[i].x + nx * RADIUS;
        pos[o + 1] = p[i].y + ny * RADIUS;
        pos[o + 2] = p[i].z + nz * RADIUS;
        nrm[o] = nx;
        nrm[o + 1] = ny;
        nrm[o + 2] = nz;
      }
    }
    this.pos.needsUpdate = true;
    this.nrm.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
  }
}

/** The open noose while the lasso is in the air. */
export function makeNoose(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.42, RADIUS * 1.2, 6, 28), ROPE_MAT());
  m.frustumCulled = false;
  return m;
}

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const tmp3 = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
