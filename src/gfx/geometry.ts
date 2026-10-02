import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/rng';
import { Simplex } from '../core/noise';

// Procedural prop meshes. Everything is built once at startup and instanced.
// Shapes follow the references: drooping scalloped conifer tiers with a
// visible trunk, smooth pebble boulders, puffy bushes, simple Nordic cabins.

export const TREE_HEIGHT = 13;

function withKind(g: THREE.BufferGeometry, kind: number): THREE.BufferGeometry {
  const n = g.attributes.position.count;
  g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(n).fill(kind), 1));
  return g;
}

function stripToCore(g: THREE.BufferGeometry): THREE.BufferGeometry {
  // Keep only attributes the prop shader reads so merges line up.
  for (const k of Object.keys(g.attributes)) {
    if (k !== 'position' && k !== 'normal' && k !== 'aKind') g.deleteAttribute(k);
  }
  return g.index ? g.toNonIndexed() : g;
}

/**
 * One conifer tier: a drooping, scalloped skirt around the trunk.
 * Upper surface is a surface of revolution whose rim hangs down in rounded
 * tongues; a short underside closes it back to the trunk.
 */
function coniferTier(opts: {
  y: number; R: number; th: number; lobes: number; segPerLobe: number; rings: number;
  ox: number; oz: number; phase: number; droop: number; rnd: () => number;
  /** Far shape: the skirt alone (see buildConifer, lod 3). */
  open?: boolean;
}): THREE.BufferGeometry {
  const { y, R, th, lobes, segPerLobe, rings, ox, oz, phase, droop, rnd, open } = opts;
  const radial = lobes * segPerLobe;
  const pos: number[] = [];
  const idx: number[] = [];
  const cx = ox;
  const cz = oz;
  const lobeJit = Array.from({ length: lobes }, () => 0.85 + 0.3 * rnd());
  const lobeAt = (a: number) => {
    const u = ((a / (Math.PI * 2)) * lobes + phase) % lobes;
    const li = Math.floor(u);
    const f = u - li;
    return { bump: Math.pow(Math.sin(Math.PI * f), 0.55), j: lobeJit[li] };
  };
  // Upper surface rings (0 = tip at trunk top, rings = rim).
  for (let r = 0; r <= rings; r++) {
    const s = r / rings;
    for (let k = 0; k < radial; k++) {
      const a = (k / radial) * Math.PI * 2;
      const { bump, j } = lobeAt(a);
      const lob = 0.8 + 0.2 * bump;
      const rr = R * Math.pow(s, 0.85) * (s > 0.6 ? lob * j : 1 + (lob * j - 1) * (s / 0.6));
      const yy = y + th * (1 - Math.pow(s, 1.25)) - droop * Math.pow(s, 3) * (0.55 + 0.45 * bump) * j;
      pos.push(cx + Math.cos(a) * rr, yy, cz + Math.sin(a) * rr);
    }
  }
  // Underside ring, tucked back toward the trunk.
  for (let k = 0; k < radial; k++) {
    const a = (k / radial) * Math.PI * 2;
    const rr = R * 0.35;
    pos.push(cx + Math.cos(a) * rr, y + th * 0.18, cz + Math.sin(a) * rr);
  }
  const ring = (r: number, k: number) => r * radial + (k % radial);
  for (let r = 0; r < rings + 1; r++) {
    for (let k = 0; k < radial; k++) {
      const a = ring(r, k), b = ring(r, k + 1), c = ring(r + 1, k), d = ring(r + 1, k + 1);
      if (r < rings) {
        idx.push(a, b, c, b, d, c);
      } else {
        // rim -> underside (faces downward/outward)
        idx.push(a, b, c, b, d, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Soften: blend toward a spherical normal around the tier's heart so each
  // tier reads as one puffy form with a lit top and a shaded underside.
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const ctr = new THREE.Vector3(cx, y + th * 0.15, cz);
  const v = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).sub(ctr).normalize();
    nn.fromBufferAttribute(n, i);
    // Orient the geometric normal outward (winding varies across the rim).
    if (nn.dot(v) < 0) nn.negate();
    nn.lerp(v, 0.55).normalize();
    n.setXYZ(i, nn.x, nn.y, nn.z);
  }
  if (open) {
    // Shaded exactly as the whole tier (the normals above were made with the
    // underside there), then only what shows from far off is kept: the skirt
    // without its underside, and without the zero-area triangles at its tip.
    const keep: number[] = [];
    for (let r = 0; r < rings; r++) for (let k = 0; k < radial; k++) {
      const a = ring(r, k), b = ring(r, k + 1), c = ring(r + 1, k), d = ring(r + 1, k + 1);
      if (r > 0) keep.push(a, b, c);
      keep.push(b, d, c);
    }
    g.setIndex(keep);
  }
  return withKind(g, 0);
}

/** As stripToCore, but still indexed, and without the vertices nothing uses. */
function coreIndexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const idx = g.index!.array, map = new Map<number, number>(), out: number[] = [];
  const names = ['position', 'normal', 'aKind'], src = names.map((k) => g.attributes[k] as THREE.BufferAttribute);
  const data: number[][] = names.map(() => []);
  for (let i = 0; i < idx.length; i++) {
    let v = map.get(idx[i]);
    if (v === undefined) {
      v = map.size;
      map.set(idx[i], v);
      src.forEach((a, k) => { for (let c = 0; c < a.itemSize; c++) data[k].push(a.array[idx[i] * a.itemSize + c]); });
    }
    out.push(v);
  }
  const o = new THREE.BufferGeometry();
  names.forEach((k, i) => o.setAttribute(k, new THREE.Float32BufferAttribute(data[i], src[i].itemSize)));
  o.setIndex(out);
  return o;
}

/**
 * Lod 0 to 2 are the tree from near to. Lod 3 is for trees far enough off
 * that a tier is a few pixels: lod 2's own tiers, trunk and crown, vertex for
 * vertex (the same draws from `rnd`, so the outline and the bands of light
 * are the same), without what can't be seen from there (the tiers'
 * undersides, the caps of trunk and crown), and indexed: 74 triangles on 82
 * vertices for lod 2's 148 on 444. Dropping the tiers' middle ring as well
 * (34 triangles) was tried and shows: every tree gets thinner.
 */
export function buildConifer(seed: number, lod: 0 | 1 | 2 | 3): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const H = TREE_HEIGHT;
  const parts: THREE.BufferGeometry[] = [];
  const open = lod === 3;
  const core = open ? coreIndexed : stripToCore;
  const tiers = lod >= 2 ? 4 : 5 + Math.floor(rnd() * 2);
  const segPerLobe = lod === 0 ? 4 : lod === 1 ? 2 : 1;
  const rings = lod === 0 ? 3 : 2;
  // Trunk with a gentle S-curve baked in (instances add their own lean).
  const trunk = new THREE.CylinderGeometry(0.09, 0.3, H * 0.97, lod === 0 ? 7 : 5, lod === 0 ? 4 : 1, open);
  trunk.translate(0, H * 0.485, 0);
  parts.push(core(withKind(trunk, 1)));
  let ox = 0;
  let oz = 0;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y = H * (0.25 + 0.64 * Math.pow(t, 0.9));
    const R = H * 0.19 * (1 - 0.72 * t) * (0.85 + 0.3 * rnd()) + 0.3;
    const th = H * (0.075 + 0.04 * t) * (0.9 + 0.2 * rnd());
    const lobes = lod >= 2 ? 5 : 6 + Math.floor(rnd() * 3);
    ox += (rnd() - 0.5) * 0.35;
    oz += (rnd() - 0.5) * 0.35;
    const g = coniferTier({ y, R, th: i === tiers - 1 ? th * 1.6 : th, lobes, segPerLobe, rings, ox, oz, phase: rnd() * lobes, droop: R * 0.62, rnd, open });
    parts.push(core(g));
  }
  // Pointed crown.
  const tip = new THREE.ConeGeometry(0.28, H * 0.12, lod === 0 ? 6 : 4, 1, open);
  tip.translate(ox, H * 0.99, oz);
  parts.push(core(withKind(tip, 0)));
  const merged = mergeGeometries(parts)!;
  merged.computeBoundingSphere();
  return merged;
}

/** Smooth pebble boulder, flattened base. */
export function buildBoulder(seed: number, detail: number): THREE.BufferGeometry {
  const n = new Simplex(seed);
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const rnd = mulberry32(seed + 1);
  const sx = 0.9 + rnd() * 0.3;
  const sz = 0.8 + rnd() * 0.3;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = 1 + 0.16 * n.noise(v.x * 0.9 + v.y * 0.4, v.z * 0.9 - v.y * 0.3) + 0.06 * n.noise(v.x * 2.2, v.z * 2.2 + v.y);
    v.multiplyScalar(d);
    v.x *= sx;
    v.z *= sz;
    if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.3;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return withKind(g, 2);
}

/** Cluster of soft spheres. */
export function buildBush(seed: number, detail: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];
  const k = 3 + Math.floor(rnd() * 3);
  const ctr = new THREE.Vector3(0, 0.6, 0);
  for (let i = 0; i < k; i++) {
    const r = 0.55 + rnd() * 0.45;
    let s: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, detail);
    s.deleteAttribute('uv');
    s = mergeVertices(s);
    const a = rnd() * Math.PI * 2;
    const d = i === 0 ? 0 : 0.5 + rnd() * 0.4;
    s.translate(Math.cos(a) * d, r * 0.75 + (i === 0 ? 0.25 : 0), Math.sin(a) * d);
    s.computeVertexNormals();
    // Soft blob normals.
    const p = s.attributes.position as THREE.BufferAttribute;
    const n = s.attributes.normal as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const nn = new THREE.Vector3();
    for (let j = 0; j < p.count; j++) {
      v.fromBufferAttribute(p, j).sub(ctr).normalize();
      nn.fromBufferAttribute(n, j).lerp(v, 0.5).normalize();
      n.setXYZ(j, nn.x, nn.y, nn.z);
    }
    parts.push(stripToCore(withKind(s, 3)));
  }
  return mergeGeometries(parts)!;
}

/** A clump of 5 drooping grass blades (thin double-sided ribbons). */
export function buildTuft(): THREE.BufferGeometry {
  const pos: number[] = [];
  const nrm: number[] = [];
  const blades = 6;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + b * 0.7;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const lean = 0.12 + (b % 3) * 0.08;
    const h = 0.22 + (b % 3) * 0.09;
    const w = 0.028;
    const px = -dz * w;
    const pz = dx * w;
    const segs = 3;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs;
      const t1 = (s + 1) / segs;
      const y0 = h * Math.sin(t0 * Math.PI * 0.5);
      const y1 = h * Math.sin(t1 * Math.PI * 0.5);
      const o0 = lean * t0 * t0;
      const o1 = lean * t1 * t1;
      const w0 = 1 - t0;
      const w1 = 1 - t1;
      const A = [dx * o0 - px * w0, y0, dz * o0 - pz * w0];
      const B = [dx * o0 + px * w0, y0, dz * o0 + pz * w0];
      const C = [dx * o1 - px * w1, y1, dz * o1 - pz * w1];
      const D = [dx * o1 + px * w1, y1, dz * o1 + pz * w1];
      pos.push(...A, ...B, ...C, ...B, ...D, ...C);
      for (let i = 0; i < 6; i++) nrm.push(dx * 0.4, 0.9, dz * 0.4);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return withKind(g, 4);
}

/**
 * A clump of wildflowers on thin stems that poke just above the grass.
 * Variant 0: upright open heads (daisy or buttercup; PROP_FRAG picks the
 * petal colour from the instance tone). Variant 1: nodding harebells on
 * crooked stems.
 */
export function buildFlower(variant: 0 | 1): THREE.BufferGeometry {
  const pos: number[] = [];
  const nrm: number[] = [];
  const kinds: number[] = [];
  const tri = (a: number[], b: number[], c: number[], n: number[][], k: number) => {
    pos.push(...a, ...b, ...c);
    for (const v of n) nrm.push(...v);
    kinds.push(k, k, k);
  };
  // Tapered double-sided ribbon along a polyline (stems, basal leaves).
  const ribbon = (pts: number[][], w: number, k: number, taper = 0.4) => {
    for (let s = 0; s < pts.length - 1; s++) {
      const [p0, p1] = [pts[s], pts[s + 1]];
      const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
      const l = Math.hypot(dx, dz) || 1;
      // Width runs across the direction of travel (or along x if vertical).
      const px = l > 1e-4 ? -dz / l : 1, pz = l > 1e-4 ? dx / l : 0;
      const w0 = w * (1 - taper * (s / (pts.length - 1)));
      const w1 = w * (1 - taper * ((s + 1) / (pts.length - 1)));
      const A = [p0[0] - px * w0, p0[1], p0[2] - pz * w0];
      const B = [p0[0] + px * w0, p0[1], p0[2] + pz * w0];
      const C = [p1[0] - px * w1, p1[1], p1[2] - pz * w1];
      const D = [p1[0] + px * w1, p1[1], p1[2] + pz * w1];
      const n = [dx * 2, 0.9, dz * 2];
      tri(A, B, C, [n, n, n], k);
      tri(B, D, C, [n, n, n], k);
    }
  };
  // Stem that rises and leans outward along `a`; `crook` bends the top over.
  const stem = (a: number, h: number, lean: number, crook: number) => {
    const dx = Math.cos(a), dz = Math.sin(a);
    const pts: number[][] = [];
    const segs = 4;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const o = lean * t * t + crook * Math.max(0, t - 0.6) * 2.5;
      const y = h * t - crook * 0.6 * Math.max(0, t - 0.75) * 4;
      pts.push([dx * o, y, dz * o]);
    }
    ribbon(pts, 0.02, 4, 0.45);
    return pts[segs];
  };
  // Open head: 5 rounded petals in a shallow cup, tilted toward `a`, with a core.
  const openHead = (c: number[], a: number, r: number) => {
    const tilt = 0.35;
    const tx = Math.cos(a) * tilt, tz = Math.sin(a) * tilt;
    const up = [tx, 1, tz];
    const at = (ang: number, rr: number, lift: number) => {
      const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
      return [c[0] + x, c[1] + lift - (x * tx + z * tz), c[2] + z];
    };
    const seg = 20;
    const rad = (ang: number) => r * (0.55 + 0.45 * Math.abs(Math.cos(ang * 2.5)));
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const o0 = at(a0, rad(a0), r * 0.25), o1 = at(a1, rad(a1), r * 0.25);
      tri(at(0, 0, 0), o1, o0, [up, up, up], 5);
    }
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2, a1 = ((i + 1) / 6) * Math.PI * 2;
      tri(at(0, 0, r * 0.18), at(a1, r * 0.3, r * 0.14), at(a0, r * 0.3, r * 0.14), [up, up, up], 6);
    }
  };
  // Nodding bell hanging from the stem tip: a flared 5-point cone, mouth down.
  const bell = (c: number[], r: number) => {
    // Rounded shoulder ring, then a flared lip; normals lean up so the bell
    // stays in the lit band instead of going grey.
    const seg = 14;
    const rings: [number, number][] = [[0, r * 0.15], [r * 0.35, r * 0.75], [r * 1.1, r * 0.9], [r * 1.5, r * 1.15]];
    const ring = (j: number, ang: number) => {
      const [d, rr] = rings[j];
      const f = j === rings.length - 1 ? 1 + 0.18 * Math.cos(ang * 5) : 1;
      return [c[0] + Math.cos(ang) * rr * f, c[1] - d + r * 0.15, c[2] + Math.sin(ang) * rr * f];
    };
    const nm = (ang: number) => [Math.cos(ang) * 0.45, 1, Math.sin(ang) * 0.45];
    for (let j = 0; j < rings.length - 1; j++) {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        tri(ring(j, a0), ring(j + 1, a0), ring(j + 1, a1), [nm(a0), nm(a0), nm(a1)], 15);
        tri(ring(j, a0), ring(j + 1, a1), ring(j, a1), [nm(a0), nm(a1), nm(a1)], 15);
      }
    }
  };

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.6 * i;
    const h = [0.34, 0.27, 0.21][i];
    if (variant === 0) openHead(stem(a, h, 0.07 + 0.03 * i, 0), a, 0.085 - 0.012 * i);
    else bell(stem(a, h + 0.04, 0.05, 0.07), 0.046 - 0.006 * i);
  }
  // Two short basal leaves to seat the clump in the grass.
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI + 0.9;
    const dx = Math.cos(a), dz = Math.sin(a);
    ribbon([[0, 0, 0], [dx * 0.05, 0.08, dz * 0.05], [dx * 0.12, 0.12, dz * 0.12]], 0.022, 4, 0.8);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kinds, 1));
  return g;
}

/**
 * Bog reeds: a clump of tall blades (kind 4) and a few bulrushes, each a
 * stiff stalk topped with a fat brown cattail (kind 25). Stands in the
 * shallows and along pool edges.
 */
export function buildReeds(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const rnd = mulberry32(77);
  for (let i = 0; i < 9; i++) {
    // A blade: a thin tapered cone, leaning out and bent at the tip.
    const a = rnd() * Math.PI * 2, h = 0.8 + rnd() * 0.7, lean = 0.12 + rnd() * 0.18;
    const g = new THREE.ConeGeometry(0.05, h, 4, 3, true);
    g.translate(0, h / 2, 0);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k) / h;
      pos.setX(k, pos.getX(k) + Math.cos(a) * lean * y * y * h);
      pos.setZ(k, pos.getZ(k) + Math.sin(a) * lean * y * y * h);
    }
    g.translate(Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1);
    g.computeVertexNormals();
    parts.push(stripToCore(withKind(g, 28)));
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4, r = 0.06 + 0.05 * i, h = 1.15 + 0.2 * i;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    parts.push(stripToCore(withKind(new THREE.CylinderGeometry(0.012, 0.016, h, 4).translate(x, h / 2, z), 4)));
    parts.push(stripToCore(withKind(new THREE.CapsuleGeometry(0.045, 0.2, 3, 6).translate(x, h - 0.08, z), 25)));
    parts.push(stripToCore(withKind(new THREE.CylinderGeometry(0.006, 0.01, 0.12, 3).translate(x, h + 0.12, z), 4)));
  }
  const g = mergeGeometries(parts)!;
  return g;
}

/**
 * Glowcaps: a little family of toadstools on the glimmerwood floor, cream
 * stalks (kind 27) under round teal caps (kind 26) that shine after dark.
 */
export function buildGlowcaps(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const caps: [number, number, number, number][] = [[0, 0, 0.26, 0.13], [0.2, 0.08, 0.17, 0.09], [-0.12, 0.17, 0.12, 0.07], [0.07, -0.2, 0.09, 0.05]];
  for (const [x, z, h, r] of caps) {
    parts.push(stripToCore(withKind(new THREE.CylinderGeometry(r * 0.3, r * 0.42, h, 6).translate(x, h / 2, z), 27)));
    const cap = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 0.72, 1).translate(x, h, z);
    parts.push(stripToCore(withKind(cap, 26)));
  }
  return mergeGeometries(parts)!;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, kind: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return stripToCore(withKind(g, kind));
}

/** Gable roof prism (two slopes + gable ends are part of the walls). */
function roof(w: number, d: number, rise: number, over: number, y: number, kind: number, thick = 0.18) {
  const hw = w / 2 + over;
  const hd = d / 2 + over;
  // Ridge runs along X. Slab for each slope with a little thickness.
  const pos: number[] = [];
  const slope = (sgn: number) => {
    const a = [-hw, y + rise, 0];
    const b = [hw, y + rise, 0];
    const c = [hw, y - over * (rise / (d / 2)), sgn * hd];
    const e = [-hw, y - over * (rise / (d / 2)), sgn * hd];
    const t = [0, thick, 0];
    const up = (p: number[]) => [p[0] + t[0], p[1] + t[1], p[2] + t[2]];
    const quad = (p: number[], q: number[], r: number[], s: number[], flip: boolean) => {
      if (flip) pos.push(...p, ...r, ...q, ...p, ...s, ...r);
      else pos.push(...p, ...q, ...r, ...p, ...r, ...s);
    };
    const f = sgn > 0;
    quad(up(a), up(b), up(c), up(e), !f); // top
    quad(a, b, c, e, f); // underside
    quad(up(c), up(e), e, c, !f); // eave edge
    quad(up(a), up(e), e, a, f);
    quad(up(b), up(c), c, b, !f);
  };
  slope(1);
  slope(-1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return withKind(g, kind);
}

function gableWall(w: number, rise: number, z: number, y: number, kind: number, facing: number) {
  const hw = w / 2;
  const pos = facing > 0
    ? [-hw, y, z, hw, y, z, 0, y + rise, z]
    : [hw, y, z, -hw, y, z, 0, y + rise, z];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return withKind(g, kind);
}

export function buildCabin(variant: number): THREE.BufferGeometry {
  const W = variant === 1 ? 7 : 5.6;
  const D = variant === 1 ? 4.6 : 4.2;
  const Hh = 2.9;
  const rise = variant === 2 ? 2.8 : 2.1;
  const wall = variant === 2 ? 13 : 7;
  const parts: THREE.BufferGeometry[] = [];
  parts.push(box(W + 0.3, 0.6, D + 0.3, 0, 0.1, 0, 12)); // stone footing
  parts.push(box(W, Hh, D, 0, 0.4 + Hh / 2, 0, wall));
  // Gable ends (walls go up to the ridge). Ridge runs along X, so gables face ±X.
  const gy = 0.4 + Hh;
  const gx = (s: number) => {
    const g = gableWall(D, rise, 0, gy, wall, s);
    g.rotateY(s > 0 ? -Math.PI / 2 : Math.PI / 2);
    g.translate(s * W / 2, 0, 0);
    return stripToCore(g);
  };
  parts.push(gx(1), gx(-1));
  parts.push(stripToCore(roof(W, D, rise, 0.45, gy, 8)));
  // Corner trim.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(box(0.22, Hh, 0.22, sx * W / 2, 0.4 + Hh / 2, sz * D / 2, 9));
  }
  // Door on the long side (+z).
  parts.push(box(1.0, 2.0, 0.12, -W * 0.18, 0.4 + 1.0, D / 2 + 0.04, 11));
  parts.push(box(1.25, 0.14, 0.16, -W * 0.18, 0.4 + 2.05, D / 2 + 0.05, 9));
  // Windows with light trim.
  const win = (x: number, z: number, rotY: number) => {
    const w = box(0.95, 0.95, 0.12, 0, 0, 0, 9);
    const g = box(0.72, 0.72, 0.14, 0, 0, 0, 10);
    const bar = box(0.07, 0.72, 0.16, 0, 0, 0, 9);
    const bar2 = box(0.72, 0.07, 0.16, 0, 0, 0, 9);
    for (const p of [w, g, bar, bar2]) {
      p.rotateY(rotY);
      p.translate(x, 0.4 + 1.6, z);
      parts.push(p);
    }
  };
  win(W * 0.22, D / 2 + 0.05, 0);
  win(-W * 0.2, -D / 2 - 0.05, 0);
  win(W * 0.2, -D / 2 - 0.05, 0);
  win(W / 2 + 0.05, 0, Math.PI / 2);
  // small gable window
  const gw = box(0.5, 0.5, 0.14, 0, 0, 0, 10);
  gw.rotateY(Math.PI / 2);
  gw.translate(-W / 2 - 0.05, gy + rise * 0.35, 0);
  parts.push(gw);
  // Chimney
  parts.push(box(0.7, 2.6, 0.7, W * 0.28, gy + rise * 0.55 + 0.6, -D * 0.12, 12));
  const merged = mergeGeometries(parts)!;
  merged.computeBoundingSphere();
  return merged;
}
