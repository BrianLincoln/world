import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeCreatureMaterial, type CreatureLook } from '../gfx/materials';

// Creatures are drawn as instanced "parts": every floof body in the world is
// one instance of one mesh, every left wing another, and so on. Each mob keeps
// a small Object3D skeleton (never added to the scene) that its animation
// poses; each frame the part objects' world matrices are copied into the
// batches. So all creatures of a species cost a handful of draw calls.

const tmpCol = new THREE.Color();

/**
 * Tag a geometry with a flat vertex colour (+ paint tag) so it can be merged.
 * `tinted` = takes the per-instance coat colour (fur does; noses don't).
 */
export function colored(geo: THREE.BufferGeometry, hex: string, paint = 0, tinted = true): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 4);
  tmpCol.set(hex);
  for (let i = 0; i < n; i++) c.set([tmpCol.r, tmpCol.g, tmpCol.b, paint], i * 4);
  g.setAttribute('aCol', new THREE.BufferAttribute(c, 4));
  g.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n).fill(tinted ? 1 : 0), 1));
  return g;
}

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts);
  if (!g) throw new Error('creature geometry merge failed');
  return g;
}

/** A lathe profile [radius, y] -> geometry. */
export function lathe(pts: [number, number][], segs = 32) {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), segs);
}

/** Mirror a geometry across x (for left/right parts), keeping winding correct. */
export function mirrorX(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.clone();
  g.scale(-1, 1, 1);
  // Scaling by -1 flips triangle winding; swap two vertices of each triangle.
  const flip = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
    const arr = a.array as Float32Array;
    const s = a.itemSize;
    for (let t = 0; t < a.count; t += 3) {
      for (let k = 0; k < s; k++) {
        const i1 = (t + 1) * s + k, i2 = (t + 2) * s + k;
        const v = arr[i1];
        arr[i1] = arr[i2];
        arr[i2] = v;
      }
    }
  };
  if (g.index) throw new Error('mirrorX expects non-indexed geometry');
  for (const k of Object.keys(g.attributes)) flip(g.getAttribute(k));
  return g;
}

export class PartBatch {
  readonly mesh: THREE.InstancedMesh;
  private eye: THREE.InstancedBufferAttribute;
  private n = 0;

  constructor(geo: THREE.BufferGeometry, look: CreatureLook, readonly max: number) {
    const g = geo.clone();
    this.eye = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.eye.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aEye', this.eye);
    this.mesh = new THREE.InstancedMesh(g, makeCreatureMaterial(look), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    // Instances roam the whole world; culling is done per mob by the manager.
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }

  get material() {
    return this.mesh.material as THREE.ShaderMaterial;
  }

  setGeometry(geo: THREE.BufferGeometry) {
    const g = geo.clone();
    g.setAttribute('aEye', this.eye);
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
  }

  begin() {
    this.n = 0;
  }

  push(m: THREE.Matrix4, tint: THREE.Color, eye?: THREE.Vector4) {
    if (this.n >= this.max) return;
    this.mesh.setMatrixAt(this.n, m);
    this.mesh.setColorAt(this.n, tint);
    if (eye) this.eye.setXYZW(this.n, eye.x, eye.y, eye.z, eye.w);
    this.n++;
  }

  end() {
    this.mesh.count = this.n;
    this.mesh.visible = this.n > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
    this.eye.needsUpdate = true;
  }
}

/** Critically-damped-ish spring used for all secondary motion. */
export class Spring {
  v = 0;
  constructor(public x = 0) {}
  step(target: number, k: number, c: number, dt: number) {
    this.v += (k * (target - this.x) - c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

/**
 * Fur: displace a unit sphere into combed tufts. Tufts sit on a jittered
 * Fibonacci lattice, each a pointed bump whose tip is swept along `comb`
 * (back and down, like brushed fur). `mask(dir)` 0..1 scales tufts (0 on the
 * face). Normals stay the sphere's, so toon bands fall as clean curves and
 * only the silhouette (the outline) reads as fluffy, as in the reference.
 */
export function furBall(opts: {
  widthSegs?: number; heightSegs?: number; tufts?: number; amp?: number; width?: number; sweep?: number;
  /** Fraction of lattice points that grow a real tuft. */
  share?: number;
  seed?: number; comb?: (d: THREE.Vector3, out: THREE.Vector3) => THREE.Vector3; mask?: (d: THREE.Vector3) => number;
}): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, opts.widthSegs ?? 72, opts.heightSegs ?? 52);
  const N = opts.tufts ?? 90;
  const amp = opts.amp ?? 0.06;
  const sweep = opts.sweep ?? 0.05;
  let s = (opts.seed ?? 7) >>> 0;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const centres: { d: THREE.Vector3; a: number; w: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - ((i + 0.5) / N) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * golden + (rnd() - 0.5) * 0.5;
    const d = new THREE.Vector3(Math.cos(th) * r, y + (rnd() - 0.5) * 0.08, Math.sin(th) * r).normalize();
    // Mostly smooth, with a scattering of distinct tufts (like an inked edge).
    const tuft = rnd() < (opts.share ?? 0.35);
    centres.push({ d, a: tuft ? 0.8 + rnd() * 0.8 : 0.1, w: (opts.width ?? 1) * (0.8 + rnd() * 0.45) });
  }
  const spacing = Math.sqrt((4 * Math.PI) / N);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
  const d = new THREE.Vector3();
  const comb = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    let bump = 0;
    for (const c of centres) {
      const ang = Math.acos(Math.min(1, d.dot(c.d)));
      const w = spacing * 0.75 * c.w;
      if (ang < w) bump = Math.max(bump, c.a * Math.pow(1 - ang / w, 2.2));
    }
    const m = opts.mask ? opts.mask(d) : 1;
    const out = 1 + amp * bump * m;
    const p = d.clone().multiplyScalar(out);
    if (opts.comb) {
      opts.comb(d, comb);
      p.addScaledVector(comb, sweep * bump * bump * m);
    }
    pos.setXYZ(i, p.x, p.y, p.z);
    nrm.setXYZ(i, d.x, d.y, d.z);
  }
  return geo;
}
