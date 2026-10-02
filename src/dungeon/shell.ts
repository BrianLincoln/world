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
 *
 * A stepped height field draws teeth, so the plan's hard edges are cut in:
 * the floor stops at the pit's edge (its cells drawn back to it) and the
 * pit's own floor is a sheet below; a ledge's top is a sheet above, drawn
 * back to its line; and each edge has a plain face of its own.
 */
export function buildShell(L: Layout): THREE.BufferGeometry {
  const [x0, z0, x1, z1] = L.box;
  const nx = Math.ceil((x1 - x0) / CELL) + 1, nz = Math.ceil((z1 - z0) / CELL) + 1;
  const sd = new Float32Array(nx * nz), pd = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    sd[j * nx + i] = L.sdf(x0 + i * CELL, z0 + j * CELL);
    pd[j * nx + i] = L.pitSd(x0 + i * CELL, z0 + j * CELL);
  }
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  /** On to the pit's edge, from either side. */
  const toEdge = (x: number, z: number): [number, number] => {
    for (let k = 0; k < 3; k++) {
      const d = L.pitSd(x, z), e = 0.05;
      const gx = L.pitSd(x + e, z) - L.pitSd(x - e, z), gz = L.pitSd(x, z + e) - L.pitSd(x, z - e), gl = Math.hypot(gx, gz) || 1;
      x -= (gx / gl) * d; z -= (gz / gl) * d;
    }
    return [x, z];
  };
  const corners = (a: Float32Array, i: number, j: number) => [a[j * nx + i], a[j * nx + i + 1], a[(j + 1) * nx + i], a[(j + 1) * nx + i + 1]];

  /** A sheet over the grid: which cells, where each node really goes, and how high. */
  const sheet = (cell: (i: number, j: number) => boolean, place: (x: number, z: number) => [number, number], h: (x: number, z: number) => number, top = false) => {
    const at = new Int32Array(nx * nz).fill(-1);
    const node = (i: number, j: number) => {
      const k = j * nx + i;
      if (at[k] >= 0) return at[k];
      const [x, z] = place(x0 + i * CELL, z0 + j * CELL);
      const e = 0.4;
      const n = new THREE.Vector3(h(x - e, z) - h(x + e, z), 2 * e, h(x, z - e) - h(x, z + e)).normalize();
      if (top) n.negate();
      pos.push(x, h(x, z), z);
      nrm.push(n.x, n.y, n.z);
      return (at[k] = pos.length / 3 - 1);
    };
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      if (Math.min(...corners(sd, i, j)) > 1.5 || !cell(i, j)) continue;
      const a = node(i, j), b = node(i + 1, j), c = node(i + 1, j + 1), d = node(i, j + 1);
      if (top) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
    }
  };
  const same = (x: number, z: number): [number, number] => [x, z];
  // The floor, up to the pit's edge.
  sheet((i, j) => Math.max(...corners(pd, i, j)) >= 0, (x, z) => (L.pitSd(x, z) < 0 ? toEdge(x, z) : [x, z]), (x, z) => L.ground(x, z));
  // The pit's floor (and its tunnel's, climbing back up to meet the floor).
  sheet((i, j) => Math.min(...corners(pd, i, j)) < 0, (x, z) => (L.pitSd(x, z) > 0 ? toEdge(x, z) : [x, z]), (x, z) => L.ground(x, z) - L.sinkOf(x, z));
  sheet(() => true, same, (x, z) => L.ceil(x, z), true);
  for (const K of L.shelves) {
    const back = (x: number, z: number): [number, number] => { const s = Math.min(0, L.past(K, x, z)); return [x - K.dx * s, z - K.dz * s]; };
    sheet((i, j) => {
      const x = x0 + i * CELL, z = z0 + j * CELL;
      const c = [[x, z], [x + CELL, z], [x + CELL, z + CELL], [x, z + CELL]];
      return Math.max(...c.map(([px, pz]) => L.past(K, px, pz))) > 0 && Math.max(...c.map(([px, pz]) => L.riseOf(K, px, pz, true))) > 0.01;
    }, back, (x, z) => L.low(x, z) + L.riseOf(K, x, z, true));
    // Its face: a plain wall along its line, from wall to wall (and on into the rock either side).
    const first = pos.length / 3, N = Math.ceil(K.w * 2);
    for (let i = 0; i <= N; i++) {
      const u = -K.w + (2 * K.w * i) / N;
      const x = K.x - K.dz * u, z = K.z + K.dx * u, g = L.low(x, z);
      pos.push(x, g - 0.5, z, x, g + K.h, z);
      nrm.push(-K.dx, 0, -K.dz, -K.dx, 0, -K.dz);
    }
    for (let i = 0; i < N; i++) {
      const a = first + i * 2, b = a + 2;
      // (Wound to face the low side, where it's seen from.)
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  // Walls.
  const p = new THREE.Vector3(), q = new THREE.Vector3(), r = new THREE.Vector3(), fn = new THREE.Vector3();
  const column = (x: number, z: number) => {
    const [gx, gz] = L.grad(x, z);
    // (Their feet are on the floor under any ledge, and down in the pit: tops and faces cover the rest.)
    const f = L.low(x, z), c = L.ceil(x, z) - f, lean = Layout.lean(c, c);
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
  // Where a field's zero contour crosses each of a cell's four edges.
  const cross = (f: Float32Array, i: number, j: number, e: number): [number, number] => {
    const [i0, j0, i1, j1] = e === 0 ? [i, j, i + 1, j] : e === 1 ? [i + 1, j, i + 1, j + 1] : e === 2 ? [i + 1, j + 1, i, j + 1] : [i, j + 1, i, j];
    const a = f[j0 * nx + i0], b = f[j1 * nx + i1];
    const t = a / (a - b);
    return [x0 + (i0 + (i1 - i0) * t) * CELL, z0 + (j0 + (j1 - j0) * t) * CELL];
  };
  const SEGS: number[][] = [[], [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2], [2, 3], [0, 2], [0, 1, 2, 3], [1, 2], [1, 3], [0, 1], [3, 0], []];
  const contour = (f: Float32Array, seg: (ax: number, az: number, bx: number, bz: number) => void) => {
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const m = (f[j * nx + i] < 0 ? 1 : 0) | (f[j * nx + i + 1] < 0 ? 2 : 0) | (f[(j + 1) * nx + i + 1] < 0 ? 4 : 0) | (f[(j + 1) * nx + i] < 0 ? 8 : 0);
      const s = SEGS[m];
      for (let k = 0; k < s.length; k += 2) {
        const [ax, az] = cross(f, i, j, s[k]), [bx, bz] = cross(f, i, j, s[k + 1]);
        seg(ax, az, bx, bz);
      }
    }
  };
  contour(sd, (ax, az, bx, bz) => {
    const a = column(ax, az), b = column(bx, bz);
    // Wound to face into the room, whichever way round the segment came.
    p.fromArray(pos, a * 3); q.fromArray(pos, b * 3); r.fromArray(pos, (a + 1) * 3);
    const facing = fn.crossVectors(q.sub(p), r.sub(p)).dot(p.set(nrm[a * 3], 0, nrm[a * 3 + 2])) > 0;
    for (let v = 0; v < ROWS; v++) {
      if (facing) idx.push(a + v, b + v, a + v + 1, b + v, b + v + 1, a + v + 1);
      else idx.push(a + v, a + v + 1, b + v, b + v, a + v + 1, b + v + 1);
    }
  });
  // The pit's face: straight down from the floor's edge, wherever that edge is in the open.
  contour(pd, (ax, az, bx, bz) => {
    const da = L.sinkOf(ax, az), db = L.sinkOf(bx, bz);
    if (Math.max(da, db) < 0.03 || Math.min(L.sdf(ax, az), L.sdf(bx, bz)) > 1.5) return;
    const e = 0.05, mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const gx = L.pitSd(mx + e, mz) - L.pitSd(mx - e, mz), gz = L.pitSd(mx, mz + e) - L.pitSd(mx, mz - e), gl = Math.hypot(gx, gz) || 1;
    // Facing into the pit.
    const ox = -gx / gl, oz = -gz / gl;
    const ga = L.ground(ax, az), gb = L.ground(bx, bz), first = pos.length / 3;
    pos.push(ax, ga, az, ax, ga - da - 0.4, az, bx, gb, bz, bx, gb - db - 0.4, bz);
    for (let k = 0; k < 4; k++) nrm.push(ox, 0, oz);
    const facing = (bz - az) * ox - (bx - ax) * oz < 0;
    if (facing) idx.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
    else idx.push(first, first + 2, first + 1, first + 2, first + 3, first + 1);
  });

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
  for (const s of L.stones) parts.push(buildStone(s, s.hex ?? (s.sx > 1.3 ? '#8f86b4' : '#a096c2')));
  // The giant's hand: a slab of a palm up out of the floor, four fingers and a thumb, a little curled.
  {
    const H = L.hand, hex = '#8d9cc6', fy = L.floor(H.x, H.z);
    const bits: THREE.BufferGeometry[] = [];
    const bone = (r: number, l: number) => lathe([[0, -r * 0.35], [r * 0.8, -r * 0.1], [r, l * 0.25], [r * 0.96, l * 0.7], [r * 0.7, l * 0.94], [0, l + r * 0.2]], 14);
    /** A finger: bones end to end from (x, y, z), each leaning `curl` more toward the palm's front, the whole splayed `splay` sideways. */
    const finger = (x: number, y: number, z: number, r: number, lens: number[], curl: number, splay: number) => {
      let a = 0.08, py = y, pz = z;
      const part: THREE.BufferGeometry[] = [];
      lens.forEach((l, i) => {
        part.push(bone(r * (1 - i * 0.12), l).rotateX(a).translate(0, py, pz));
        py += Math.cos(a) * l; pz += Math.sin(a) * l;
        a += curl;
      });
      for (const g of part) bits.push(g.translate(0, -y, 0).rotateZ(splay).translate(x, y, 0));
    };
    // The palm, and the heel of the hand going down into the floor.
    bits.push(lathe([[1.5, -1.2], [1.9, 0.4], [2.5, 2.2], [2.75, 3.6], [2.6, 4.6], [1.9, 5.1], [0, 5.2]], 20).scale(1, 1, 0.42));
    finger(-1.95, 4.5, 0, 0.56, [1.5, 1.2, 0.95], 0.34, 0.2);
    finger(-0.68, 4.9, 0, 0.6, [1.9, 1.45, 1.1], 0.3, 0.06);
    finger(0.62, 4.9, 0, 0.6, [2.0, 1.5, 1.15], 0.28, -0.05);
    finger(1.85, 4.6, 0, 0.56, [1.8, 1.35, 1.05], 0.32, -0.18);
    finger(-2.3, 2.3, 0.2, 0.66, [1.5, 1.25], 0.3, 0.95);
    for (const g of bits) parts.push(tint(g.rotateY(H.rot).translate(H.x, fy, H.z), hex));
  }
  // A pale kerb along every lip (the ledges', the pit's two), so an edge reads as an edge in the dark,
  // from above and from below.
  {
    const kerb = (x: number, z: number, nx: number, nz: number, y: number) => {
      // (nx, nz) points off the edge, toward the low side.
      if (L.sdf(x, z) > 0.7) return;
      parts.push(tint(new THREE.BoxGeometry(0.56, 0.34, 0.5).translate(0, -0.1, 0.12).rotateY(Math.atan2(nx, nz)).translate(x, y, z), '#d9d4f4'));
    };
    for (const K of L.shelves) for (let u = -K.w; u <= K.w; u += 0.5) {
      const x = K.x - K.dz * u, z = K.z + K.dx * u;
      kerb(x, z, -K.dx, -K.dz, L.low(x, z) + K.h);
    }
    const P = L.pit;
    for (let a = 0; a < Math.PI * 2; a += 0.5 / P.r) {
      const x = P.x + Math.cos(a) * P.r, z = P.z + Math.sin(a) * P.r;
      kerb(x, z, -Math.cos(a), -Math.sin(a), L.ground(x, z));
    }
  }
  // The stepping stones: pillars up out of the pit, waisted, each with a flat top to land on.
  for (const o of L.tops) {
    const H = o.top;
    const fy = L.floor(o.x, o.z);
    parts.push(tint(lathe([[o.r * 1.3, -0.5], [o.r * 0.98, 0.7], [o.r * 0.8, H * 0.45], [o.r * 0.86, H - 1.1], [o.r * 1.02, H - 0.42]], 22).translate(o.x, fy, o.z), '#8f86b4'));
    // Its top is marked out so you can see where you're jumping to, and where it stops: a pale flat top
    // with a dark border round its very edge and a dark band down the rim under it (all pale, the owner
    // couldn't tell top from side), and a ring let into the middle as a target.
    parts.push(tint(lathe([[o.r * 1.02, H - 0.42], [o.r * 1.05, H - 0.36], [o.r * 1.05, H - 0.04], [o.r, H]], 28).translate(o.x, fy, o.z), '#494177'));
    parts.push(tint(new THREE.CircleGeometry(o.r, 28).rotateX(-Math.PI / 2).translate(o.x, fy + H, o.z), '#e2ddf8'));
    parts.push(tint(new THREE.RingGeometry(o.r - 0.3, o.r, 28).rotateX(-Math.PI / 2).translate(o.x, fy + H + 0.012, o.z), '#494177'));
    parts.push(tint(new THREE.RingGeometry(o.r * 0.5, o.r * 0.6, 28).rotateX(-Math.PI / 2).translate(o.x, fy + H + 0.012, o.z), '#8f86b4'));
  }
  // The lanterns' sconces: a stone bowl on a stub out of the wall.
  for (const o of L.lanterns) {
    const yaw = Math.atan2(o.nx, o.nz);
    parts.push(tint(lathe([[0, -0.36], [0.2, -0.34], [0.44, -0.14], [0.52, 0.02], [0.46, 0.04], [0.3, -0.06], [0, -0.08]], 14).translate(o.x + o.nx * 0.5, o.y, o.z + o.nz * 0.5), '#b4abd4'));
    parts.push(tint(new THREE.CylinderGeometry(0.13, 0.17, 0.9, 8).rotateX(Math.PI / 2).translate(0, -0.2, -0.05).rotateY(yaw).translate(o.x, o.y, o.z), '#9a91bd'));
  }
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

/**
 * The spirit lanterns, as one mesh: each a small dome with a wavy hem (the
 * tower spirits' shape) sat in its sconce, with two tall eyes and two shut
 * ones. `aLit` (per vertex, the same for all of one lantern's) says which
 * show; `ranges[i]` is lantern i's run of vertices, for rewriting it.
 */
export function buildLanterns(L: Layout): { geometry: THREE.BufferGeometry; ranges: [number, number][] } {
  const parts: THREE.BufferGeometry[] = [], ranges: [number, number][] = [];
  let count = 0;
  const prof: [number, number][] = [[0.02, 1.25], [0.45, 1.15], [0.8, 0.8], [0.95, 0.3], [0.98, -0.25], [0.9, -0.7], [0.7, -0.95], [0.02, -0.9]];
  for (const o of L.lanterns) {
    const yaw = Math.atan2(o.nx, o.nz), S = 0.36;
    const at = new THREE.Vector3(o.x + o.nx * 0.5, o.y + 0.36, o.z + o.nz * 0.5);
    const start = count;
    const add = (g: THREE.BufferGeometry, part: number, pivot: THREE.Vector3) => {
      const k = (g.index ? g.toNonIndexed() : g).rotateY(yaw).translate(at.x, at.y, at.z);
      for (const a of Object.keys(k.attributes)) if (a !== 'position' && a !== 'normal') k.deleteAttribute(a);
      const n = k.attributes.position.count, pv = pivot.clone().applyAxisAngle(UP, yaw).add(at);
      k.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
      k.setAttribute('aLit', new THREE.BufferAttribute(new Float32Array(n), 1));
      const pa = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) pa.set([pv.x, pv.y, pv.z], i * 3);
      k.setAttribute('aPivot', new THREE.BufferAttribute(pa, 3));
      parts.push(k);
      count += n;
    };
    add(lathe(prof, 20).scale(S, S, S), 0, new THREE.Vector3(0, -0.3, 0));
    for (const sd of [-1, 1]) {
      const c = new THREE.Vector3(sd * 0.33 * S, 0.35 * S, 0.88 * S);
      add(new THREE.SphereGeometry(1, 10, 8).scale(0.13 * S, 0.26 * S, 0.06 * S).rotateY(sd * 0.36).translate(c.x, c.y, c.z), 1, c);
      add(new THREE.SphereGeometry(1, 10, 6).scale(0.17 * S, 0.035 * S, 0.06 * S).rotateY(sd * 0.36).translate(c.x, c.y - 0.04 * S, c.z), 2, c);
    }
    ranges.push([start, count]);
  }
  return { geometry: mergeGeometries(parts)!, ranges };
}
