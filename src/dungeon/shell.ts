import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildBoulder } from '../gfx/geometry';
import { COLUMN_R, Layout, type Stone } from './layout';

// The cave's meshes, from its plan (layout.ts), in the plan's local frame.

const CELL = 1;
/** Rows up a wall, foot to ceiling. */
const ROWS = 10;

/**
 * Floor, walls and ceiling as one mesh. Floor and ceiling are plain grids
 * that run on under and over the walls (you only ever see them from inside);
 * the walls are the plan's zero contour (marching squares), swept up the
 * vault's quarter ellipse, with normals from the plan so they shade smooth.
 */
export function buildShell(L: Layout): THREE.BufferGeometry {
  const [x0, z0, x1, z1] = L.box;
  const nx = Math.ceil((x1 - x0) / CELL) + 1, nz = Math.ceil((z1 - z0) / CELL) + 1;
  const sd = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) sd[j * nx + i] = L.sdf(x0 + i * CELL, z0 + j * CELL);
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];

  // Floor, the ledge's top, and ceiling. The floor runs on under the ledge;
  // the ledge's top is its own sheet, its cells drawn back to the ledge's
  // line so the lip is straight, and its face is a wall of its own (below).
  const K = L.shelf;
  for (const sheet of ['floor', 'shelf', 'ceil'] as const) {
    const top = sheet === 'ceil';
    const at = new Int32Array(nx * nz).fill(-1);
    const node = (i: number, j: number) => {
      const k = j * nx + i;
      if (at[k] >= 0) return at[k];
      let x = x0 + i * CELL, z = z0 + j * CELL;
      if (sheet === 'shelf') { const s = Math.min(0, L.past(x, z)); x -= K.dx * s; z -= K.dz * s; }
      const h = (px: number, pz: number) => (top ? L.ceil(px, pz) : L.ground(px, pz) + (sheet === 'shelf' ? K.h : 0));
      const e = 0.4;
      const n = new THREE.Vector3(h(x - e, z) - h(x + e, z), 2 * e, h(x, z - e) - h(x, z + e)).normalize();
      if (top) n.negate();
      pos.push(x, h(x, z), z);
      nrm.push(n.x, n.y, n.z);
      return (at[k] = pos.length / 3 - 1);
    };
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      if (Math.min(sd[j * nx + i], sd[j * nx + i + 1], sd[(j + 1) * nx + i], sd[(j + 1) * nx + i + 1]) > 1.5) continue;
      if (sheet === 'shelf') {
        const x = x0 + i * CELL, z = z0 + j * CELL;
        if (Math.max(L.past(x, z), L.past(x + CELL, z), L.past(x + CELL, z + CELL), L.past(x, z + CELL)) <= 0) continue;
      }
      const a = node(i, j), b = node(i + 1, j), c = node(i + 1, j + 1), d = node(i, j + 1);
      if (top) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
    }
  }
  // The ledge's face: a plain wall along its line, from wall to wall (and on into the rock either side).
  {
    const first = pos.length / 3, N = 28, W = 14;
    for (let i = 0; i <= N; i++) {
      const u = -W + (2 * W * i) / N;
      const x = K.x - K.dz * u, z = K.z + K.dx * u, g = L.ground(x, z);
      pos.push(x, g - 0.5, z, x, g + K.h, z);
      nrm.push(-K.dx, 0, -K.dz, -K.dx, 0, -K.dz);
    }
    for (let i = 0; i < N; i++) {
      const a = first + i * 2, b = a + 2;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  // Walls.
  const p = new THREE.Vector3(), q = new THREE.Vector3(), r = new THREE.Vector3(), fn = new THREE.Vector3();
  const column = (x: number, z: number) => {
    const [gx, gz] = L.grad(x, z);
    // (Their feet are on the floor under the ledge: its top and face cover the rest.)
    const f = L.ground(x, z), c = L.ceil(x, z) - f, lean = Layout.lean(c, c);
    const first = pos.length / 3;
    for (let k = 0; k <= ROWS; k++) {
      const th = (k / ROWS) * Math.PI / 2;
      const o = lean * (1 - Math.cos(th));
      // The foot goes on down a little, to seal against the floor.
      pos.push(x - gx * o, k === 0 ? f - 0.5 : f + c * Math.sin(th), z - gz * o);
      const n = fn.set(-gx * c * Math.cos(th), -lean * Math.sin(th), -gz * c * Math.cos(th)).normalize();
      nrm.push(n.x, n.y, n.z);
    }
    return first;
  };
  // Where the contour crosses each of a cell's four edges.
  const cross = (i: number, j: number, e: number): [number, number] => {
    const [i0, j0, i1, j1] = e === 0 ? [i, j, i + 1, j] : e === 1 ? [i + 1, j, i + 1, j + 1] : e === 2 ? [i + 1, j + 1, i, j + 1] : [i, j + 1, i, j];
    const a = sd[j0 * nx + i0], b = sd[j1 * nx + i1];
    const t = a / (a - b);
    return [x0 + (i0 + (i1 - i0) * t) * CELL, z0 + (j0 + (j1 - j0) * t) * CELL];
  };
  const SEGS: number[][] = [[], [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2], [2, 3], [0, 2], [0, 1, 2, 3], [1, 2], [1, 3], [0, 1], [3, 0], []];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const m = (sd[j * nx + i] < 0 ? 1 : 0) | (sd[j * nx + i + 1] < 0 ? 2 : 0) | (sd[(j + 1) * nx + i + 1] < 0 ? 4 : 0) | (sd[(j + 1) * nx + i] < 0 ? 8 : 0);
    const s = SEGS[m];
    for (let k = 0; k < s.length; k += 2) {
      const [ax, az] = cross(i, j, s[k]), [bx, bz] = cross(i, j, s[k + 1]);
      const a = column(ax, az), b = column(bx, bz);
      // Wound to face into the room, whichever way round the segment came.
      p.fromArray(pos, a * 3); q.fromArray(pos, b * 3); r.fromArray(pos, (a + 1) * 3);
      const facing = fn.crossVectors(q.sub(p), r.sub(p)).dot(p.set(nrm[a * 3], 0, nrm[a * 3 + 2])) > 0;
      for (let v = 0; v < ROWS; v++) {
        if (facing) idx.push(a + v, b + v, a + v + 1, b + v, b + v + 1, a + v + 1);
        else idx.push(a + v, a + v + 1, b + v, b + v, a + v + 1, b + v + 1);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

function tint(g: THREE.BufferGeometry, hex: string) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal') out.deleteAttribute(k);
  const n = out.attributes.position.count, c = new THREE.Color(hex), a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  out.setAttribute('aCol', new THREE.BufferAttribute(a, 3));
  return out;
}

const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
const lathe = (pts: [number, number][], segs = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-3), y)), segs);

const boulders = new Map<number, THREE.BufferGeometry>();
/** One boulder, where the plan puts it (or, `centred`, about its own middle, to be placed by its mesh). */
export function buildStone(s: Stone, hex: string, centred = false): THREE.BufferGeometry {
  if (!boulders.has(s.seed)) boulders.set(s.seed, buildBoulder(s.seed, 4));
  // (applyMatrix4 carries the normals through the squash properly, so they stay smooth.)
  const at = centred ? v3.set(0, 0, 0) : v3.set(s.x, s.y, s.z);
  return tint(boulders.get(s.seed)!.clone().applyMatrix4(m4.compose(at, q4.setFromAxisAngle(UP, s.rot), s3.set(s.sx, s.sy, s.sz))), hex);
}

/** Everything of rock that stands in the cave: the well's columns, boulders, stalagmites and stalactites, the ember's plinth. One mesh. */
export function buildRock(L: Layout): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const well = L.rooms[0];
  // The ring's stones, going on down: dark, waisted, splaying into the ceiling and the floor.
  for (const o of L.solids) {
    if (Math.abs(Math.hypot(o.x, o.z) - COLUMN_R) > 0.01 || o.top < 50) continue;
    const H = well.clear + 0.6;
    const g = lathe([[o.r * 1.5, -0.4], [o.r * 1.12, 0.5], [o.r * 0.92, 2.2], [o.r * 0.8, H * 0.5], [o.r * 0.9, H - 3.5], [o.r * 1.25, H - 1.2], [o.r * 2.1, H]], 20);
    parts.push(tint(g.translate(o.x, well.floor, o.z), '#574d7c'));
  }
  for (const s of L.stones) parts.push(buildStone(s, s.sx > 1.3 ? '#8f86b4' : '#a096c2'));
  for (const s of L.spikes) {
    const g = lathe([[s.r * 1.5, 0], [s.r, s.h * 0.12], [s.r * 0.62, s.h * 0.5], [s.r * 0.36, s.h * 0.85], [s.r * 0.2, s.h * 0.97], [0, s.h]], 12);
    if (s.down) g.rotateX(Math.PI);
    parts.push(tint(g.translate(s.x, s.y, s.z), s.down ? '#665c8b' : '#8279a8'));
  }
  // The ember's plinth: a low round stone with a hollow top.
  const e = L.ember;
  const fy = L.floor(e.x, e.z);
  parts.push(tint(lathe([[1.05, -0.3], [1.0, 0.15], [0.84, 0.5], [0.66, 0.74], [0.62, 0.9], [0.7, 1.04], [0.6, 1.1], [0.4, 1.02], [0, 0.98]], 24).translate(e.x, fy, e.z), '#a096c2'));
  // Glowcap stalks.
  for (const c of L.caps) {
    const g = lathe([[c.r * 0.34, 0], [c.r * 0.22, c.h * 0.35], [c.r * 0.17, c.h * 0.8], [c.r * 0.2, c.h]], 10);
    parts.push(tint(g.rotateZ(c.lean).rotateY(c.dir).translate(c.x, c.y, c.z), '#d8d0ee'));
  }
  return mergeGeometries(parts)!;
}

/** The glowcaps' caps (they glow, so a mesh of their own). */
export function buildCaps(L: Layout): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const c of L.caps) {
    const g = new THREE.SphereGeometry(c.r, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(1, 0.62, 1).translate(0, c.h - c.r * 0.12, 0);
    const under = new THREE.CircleGeometry(c.r * 0.985, 18).rotateX(Math.PI / 2).translate(0, c.h - c.r * 0.12 - c.r * 0.62 * 0.19, 0);
    for (const k of [g, under]) { k.deleteAttribute('uv'); parts.push(k.rotateZ(c.lean).rotateY(c.dir).translate(c.x, c.y, c.z)); }
  }
  return mergeGeometries(parts)!;
}
