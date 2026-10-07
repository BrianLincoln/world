import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';

// The glimmer's trail in the Veil Cave: a line of small pads of her light on
// the floor where she ran, left and right like a creature's prints, so you
// can see which way she went and which veil she went through. A beat of
// light runs along it the way she went. One mesh, its pads moved on the CPU.

/** How many pads it holds (the oldest go first), and how many sides a pad has. */
const N = 150, SIDES = 8;
/** A pad: how long and wide (m), how far off her line, and how far above the floor. */
const LEN = 0.3, WIDE = 0.2, OFF = 0.24, LIFT = 0.09;
/** How long a pad takes to come and to go (s). */
const COME = 0.3, GO = 0.7;

const ss = THREE.MathUtils.smoothstep;

export class PawTrail {
  readonly mesh: THREE.Mesh;
  /** Per pad: x, y, z, the way she was going (x, z), when it was laid, when it began to go (or -1). */
  private pad = new Float32Array(N * 7);
  private pos: THREE.BufferAttribute;
  private next = 0;
  private laid = 0;
  private time = 0;

  constructor() {
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(N * (SIDES + 1) * 3), 3);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    const nrm = new Float32Array(N * (SIDES + 1) * 3), idx: number[] = [];
    for (let i = 0; i < N; i++) {
      const o = i * (SIDES + 1);
      for (let k = 0; k <= SIDES; k++) nrm[(o + k) * 3 + 1] = 1;
      for (let k = 0; k < SIDES; k++) idx.push(o, o + 1 + ((k + 1) % SIDES), o + 1 + k);
    }
    g.setAttribute('position', this.pos);
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, makeSolidMaterial('#aef2e2', 0.45, { keep: 1 }));
    this.mesh.frustumCulled = false;
    for (let i = 0; i < N; i++) this.pad[i * 7 + 5] = -1;
  }

  /** A pad where she is (the world), going that way. */
  drop(at: THREE.Vector3, dx: number, dz: number) {
    const side = this.laid++ % 2 ? 1 : -1, p = this.pad, o = this.next * 7;
    this.next = (this.next + 1) % N;
    p[o] = at.x - dz * OFF * side; p[o + 1] = at.y + LIFT; p[o + 2] = at.z + dx * OFF * side;
    p[o + 3] = dx; p[o + 4] = dz;
    p[o + 5] = this.time; p[o + 6] = -1;
  }

  /** What's there goes out. */
  fade() {
    const p = this.pad;
    for (let i = 0; i < N; i++) if (p[i * 7 + 5] >= 0 && p[i * 7 + 6] < 0) p[i * 7 + 6] = this.time;
  }

  /** How many are alight (dev). */
  get count() {
    let n = 0;
    for (let i = 0; i < N; i++) if (this.pad[i * 7 + 5] >= 0 && this.pad[i * 7 + 6] < 0) n++;
    return n;
  }

  update(dt: number) {
    this.time += dt;
    const p = this.pad, a = this.pos.array as Float32Array, t = this.time;
    let any = false;
    for (let i = 0; i < N; i++) {
      const o = i * 7, q = i * (SIDES + 1) * 3;
      let k = 0;
      if (p[o + 5] >= 0) {
        k = ss(t - p[o + 5], 0, COME);
        if (p[o + 6] >= 0) { k *= 1 - ss(t - p[o + 6], 0, GO); if (k <= 0) p[o + 5] = -1; }
        // The beat: one pad in nine swells, and the swell runs on the way she went.
        const order = (i - this.next + N) % N, beat = (((order * 0.11 - t * 0.9) % 1) + 1) % 1;
        k *= 0.8 + 0.55 * ss(beat, 0.8, 1) + 0.55 * (1 - ss(beat, 0, 0.12));
      }
      any = any || k > 0;
      const x = p[o], y = p[o + 1], z = p[o + 2], dx = p[o + 3], dz = p[o + 4];
      a[q] = x; a[q + 1] = y; a[q + 2] = z;
      for (let s = 0; s < SIDES; s++) {
        const an = (s / SIDES) * Math.PI * 2, f = Math.cos(an) * LEN * k, w = Math.sin(an) * WIDE * k, j = q + (s + 1) * 3;
        a[j] = x + dx * f - dz * w; a[j + 1] = y; a[j + 2] = z + dz * f + dx * w;
      }
    }
    this.pos.needsUpdate = true;
    this.mesh.visible = any;
  }
}
