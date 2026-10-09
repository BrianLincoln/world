import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLUMN_R } from './layout';
import { DIAL_HALF, DIAL_Y, FLOOR_MOON_R, LAMP_R, LAMP_Y, MOSAIC_R, PULPIT, type MothLayout } from './mothPlan';
import { buildStone, lathe, tint } from './shell';

// The Moon Hall's own meshes, from its plan (mothPlan.ts), in the plan's
// local frame. Its floor, walls and ceiling are shell.ts's `buildShell`.

/** How far across a moon on a stone's face is (m, its radius), and one let into the floor. */
export const FACE_R = 0.62;

const bare = (g: THREE.BufferGeometry) => {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal') out.deleteAttribute(k);
  return out;
};

/** How much of a moon of the eight is lit (the terminator's ellipse: 1 none, 0 half, -1 all), and which side (+1 right, as you look at it: waxing). */
const PHASES: [number, number][] = [[1, 1], [0.5, 1], [0, 1], [-0.5, 1], [-1, 1], [-0.5, -1], [0, -1], [0.5, -1]];

/**
 * The lit part of a moon of radius `r`, flat, facing +z; `phase` of eight,
 * in the month's order: 0 new (nothing lit: null), 1 waxing crescent, 2
 * first quarter, 3 waxing gibbous, 4 full, 5 waning gibbous, 6 third
 * quarter, 7 waning crescent. Waxing moons are lit on the right as you look
 * at them. (An arc down the lit side, and the terminator back up: an ellipse
 * of the same height.)
 */
export function moonGeometry(phase: number, r: number): THREE.BufferGeometry | null {
  const [e, side] = PHASES[phase], N = 28;
  if (e >= 1) return null;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + (Math.PI * i) / N; pts.push(new THREE.Vector2(Math.cos(a) * r * side, Math.sin(a) * r)); }
  for (let i = 1; i < N; i++) { const a = Math.PI / 2 - (Math.PI * i) / N; pts.push(new THREE.Vector2(Math.cos(a) * r * e * side, Math.sin(a) * r)); }
  // (Mirrored, it runs the other way round: turn it back, so it still faces +z.)
  if (side < 0) pts.reverse();
  return bare(new THREE.ShapeGeometry(new THREE.Shape(pts), 1));
}

/** A moon's seas and craters, on a moon of radius 1: where, and how big. */
const CRATERS: [number, number, number][] = [
  [0.8, 0.05, 0.085], [0.74, -0.42, 0.07], [0.62, 0.5, 0.1], [0.5, -0.12, 0.2], [0.3, 0.42, 0.13], [0.24, -0.62, 0.15], [0.08, 0.05, 0.09],
  [-0.2, 0.55, 0.17], [-0.34, -0.2, 0.24], [-0.6, 0.22, 0.12], [-0.55, -0.55, 0.1], [-0.05, -0.36, 0.08], [-0.78, -0.12, 0.07], [-0.8, 0.3, 0.06], [0.45, 0.72, 0.07],
];
/**
 * The marks on a moon, a hair in front of it: those that lie wholly in its
 * lit part (`lit`), or wholly in its dark part. The same marks on every
 * moon, as on the real one: what makes a half disc a half moon, and a dark
 * disc a new one.
 */
export function craterGeometry(phase: number, r: number, lit: boolean): THREE.BufferGeometry | null {
  const [e, side] = PHASES[phase], parts: THREE.BufferGeometry[] = [];
  /** How far into the lit part a point is (negative: in the dark). */
  const inLit = (x: number, y: number) => x * side - e * Math.sqrt(Math.max(0, 1 - y * y));
  for (const [x, y, q] of CRATERS) {
    let ok = true;
    for (let a = 0; a < 8 && ok; a++) { const px = x + Math.cos(a * 0.785) * q, py = y + Math.sin(a * 0.785) * q, d = inLit(px, py); ok = px * px + py * py < 0.92 && (lit ? d > 0.04 : d < -0.04); }
    if (ok) parts.push(bare(new THREE.CircleGeometry(q * r, 16).translate(x * r, y * r, 0)));
  }
  return parts.length ? mergeGeometries(parts)! : null;
}

export interface MoonLook { stone: string; dark: string; darkMark: string }
interface Faces { stone: THREE.BufferGeometry[]; moons: THREE.BufferGeometry[]; craters: THREE.BufferGeometry[] }
/** One moon on a face `z` out along +z, turned `yaw` about y: its dark round and the dark's marks (rock), its lit part, the lit part's marks. */
function face(to: Faces, phase: number, z: number, yaw: number, c: MoonLook) {
  to.stone.push(tint(new THREE.CircleGeometry(FACE_R * 1.04, 32).translate(0, 0, z + 0.012).rotateY(yaw), c.dark));
  const dm = craterGeometry(phase, FACE_R, false), lit = moonGeometry(phase, FACE_R), lm = craterGeometry(phase, FACE_R, true);
  if (dm) to.stone.push(tint(dm.translate(0, 0, z + 0.02).rotateY(yaw), c.darkMark));
  if (lit) to.moons.push(lit.translate(0, 0, z + 0.03).rotateY(yaw));
  if (lm) to.craters.push(lm.translate(0, 0, z + 0.04).rotateY(yaw));
}
const done = (f: Faces) => ({ stone: mergeGeometries(f.stone)!, moons: mergeGeometries(f.moons)!, craters: mergeGeometries(f.craters)! });

/**
 * A turning stone's head, about its own middle: a square block with a moon
 * on each face: new, first quarter, full, third quarter. Face `k` looks
 * along +z once the head is turned `-k` quarter turns.
 */
export function buildDialHead(c: MoonLook) {
  const H = DIAL_HALF, f: Faces = { stone: [], moons: [], craters: [] };
  f.stone.push(tint(new THREE.BoxGeometry(H * 2, H * 2, H * 2), c.stone));
  // A cap and a foot, so it reads as a made thing.
  f.stone.push(tint(new THREE.BoxGeometry(H * 2.24, 0.22, H * 2.24).translate(0, H + 0.11, 0), c.stone));
  f.stone.push(tint(new THREE.BoxGeometry(H * 2.24, 0.22, H * 2.24).translate(0, -H - 0.11, 0), c.stone));
  // A cup on the cap, for the little moon that sits on it (the cave's: it lights).
  f.stone.push(tint(new THREE.CylinderGeometry(0.3, 0.4, 0.2, 12).translate(0, H + 0.32, 0), c.stone));
  for (let k = 0; k < 4; k++) face(f, k * 2, H, (k * Math.PI) / 2, c);
  return done(f);
}

/** Where a picture of the floor's ring lies: flat, its top away from the lamp, its lit side to your right as you stand at the lamp and look out (as on a stone's face). */
function onFloor(L: MothLayout, slot: number, lift: number) {
  const p = L.slot(slot), y = L.floor(L.lamp.x, L.lamp.z) + lift;
  return new THREE.Matrix4().makeBasis(new THREE.Vector3(-p.oz, 0, p.ox), new THREE.Vector3(p.ox, 0, p.oz), new THREE.Vector3(0, 1, 0)).setPosition(p.x, y, p.z);
}

/**
 * One picture of the floor's ring, at place `slot`, showing `phase` (of
 * eight): its lit part, the lit part's marks, and the marks on its dark part
 * (each may be null). Its dark round is the rock's (`buildMothRock`).
 */
export function floorMoon(L: MothLayout, slot: number, phase: number) {
  const put = (g: THREE.BufferGeometry | null, lift: number) => g && g.applyMatrix4(onFloor(L, slot, lift));
  return { lit: put(moonGeometry(phase, FLOOR_MOON_R), 0.04), craters: put(craterGeometry(phase, FLOOR_MOON_R, true), 0.052), dark: put(craterGeometry(phase, FLOOR_MOON_R, false), 0.034) };
}

/** The glowcaps that grow out of the walls: each a low dome, half of it in the rock. They glow (the caps' mesh). */
export function buildWallCaps(L: MothLayout): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const c of L.wallCaps) {
    const dome = new THREE.SphereGeometry(c.r, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1), under = new THREE.CircleGeometry(c.r, 14).rotateX(Math.PI / 2);
    for (const g of [dome, under]) { g.deleteAttribute('uv'); parts.push(g.rotateZ(c.tilt).rotateY(c.dir).translate(c.x, c.y, c.z)); }
  }
  return mergeGeometries(parts)!;
}

/** What else is let into the floor round the lamp: a thin ring inside the pictures and one outside. Flat, facing up. */
export function buildMosaic(L: MothLayout): THREE.BufferGeometry {
  const pos: number[] = [], y = L.floor(L.lamp.x, L.lamp.z) + 0.035;
  const at = (r: number, a: number) => [L.lamp.x + Math.cos(a) * r, y, L.lamp.z + Math.sin(a) * r];
  const arc = (r0: number, r1: number, a0: number, a1: number) => {
    const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 0.06));
    for (let i = 0; i < n; i++) {
      const p = a0 + ((a1 - a0) * i) / n, q = a0 + ((a1 - a0) * (i + 1)) / n;
      pos.push(...at(r0, p), ...at(r1, q), ...at(r1, p), ...at(r0, p), ...at(r0, q), ...at(r1, q));
    }
  };
  const IN = MOSAIC_R - FLOOR_MOON_R - 0.9, OUT = MOSAIC_R + FLOOR_MOON_R + 0.9;
  for (const r of [IN, OUT]) arc(r - 0.08, r + 0.08, 0, Math.PI * 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}

const K0 = (L: MothLayout) => L.shelves[0];

export interface MothRockLook { column: string; stone: string; stoneBig: string; made: string; madeDark: string; sconce: string; stub: string; spike: string; spikeDown: string; kerb: string; stalk: string }

/** Everything of rock that stands in the hall: the well's columns, boulders, stalagmites and stalactites, the lamp's stand, the stones' posts, the lip's kerb and its pale stone's post, the sconces, the light's plinth. One mesh. */
export function buildMothRock(L: MothLayout, c: MothRockLook): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const well = L.rooms[0];
  for (const o of L.solids) {
    if (Math.abs(Math.hypot(o.x, o.z) - COLUMN_R) > 0.01 || o.top < 50) continue;
    const H = well.clear + 0.6;
    parts.push(tint(lathe([[o.r * 1.5, -0.4], [o.r * 1.12, 0.5], [o.r * 0.92, 2.2], [o.r * 0.8, H * 0.5], [o.r * 0.9, H - 3.5], [o.r * 1.25, H - 1.2], [o.r * 2.1, H]], 20).translate(o.x, well.floor, o.z), c.column));
  }
  for (const s of L.stones) parts.push(buildStone(s, s.sx > 1.3 ? c.stoneBig : c.stone));
  // The lamp's stand: a stepped foot, a slim stem, and a cup the moon sits in.
  {
    const fy = L.floor(L.lamp.x, L.lamp.z), cup = LAMP_Y - LAMP_R * 0.62, q = LAMP_R / 1.5;
    parts.push(tint(lathe([[2.3, -0.3], [2.3, 0.28], [1.75, 0.3], [1.7, 0.62], [1.1, 0.66], [0.66, 1.4], [0.5, cup - 1.5 * q], [0.6 * q, cup - 0.7 * q], [1.2 * q, cup - 0.1 * q], [1.42 * q, cup + 0.5 * q], [1.3 * q, cup + 0.52 * q], [1.05 * q, cup + 0.05 * q], [0, cup - 0.1 * q]], 28).translate(L.lamp.x, fy, L.lamp.z), c.made));
  }
  // Each stone's post: a foot and a neck, under its head.
  // The dark rounds the floor's eight pictures lie on.
  for (let i = 0; i < 8; i++) parts.push(tint(new THREE.CircleGeometry(FLOOR_MOON_R * 1.05, 44).rotateX(-Math.PI / 2).translate(L.slot(i).x, L.floor(L.lamp.x, L.lamp.z) + 0.022, L.slot(i).z), c.madeDark));
  for (const d of L.dials) {
    const fy = L.floor(d.x, d.z), top = DIAL_Y - DIAL_HALF - 0.22;
    parts.push(tint(lathe([[1.15, -0.3], [1.15, 0.22], [0.82, 0.26], [0.5, 0.7], [0.42, top - 0.3], [0.62, top]], 20).translate(d.x, fy, d.z), c.made));
  }
  // A pale kerb along the lip, so its edge reads as an edge in the dark, from above and from below.
  for (const K of L.shelves) for (let u = -K.w; u <= K.w; u += 0.5) {
    const x = K.x - K.dz * u, z = K.z + K.dx * u;
    if (L.sdf(x, z) > 0.7) continue;
    parts.push(tint(new THREE.BoxGeometry(0.56, 0.34, 0.5).translate(0, -0.1, 0.12).rotateY(Math.atan2(-K.dx, -K.dz)).translate(x, L.low(x, z) + K.h, z), c.kerb));
  }
  // The pulpit: a great pillar out of the hall's floor, waisted, spreading to a flat top level with the ledge, a pale rim round it.
  {
    const P = L.pulpit, fy = L.floor(P.x - K0(L).dx * (P.r + 3), P.z - K0(L).dz * (P.r + 3)), H = P.y - fy, r = P.r;
    parts.push(tint(lathe([[r * PULPIT[0][1] * 1.15, -0.6], ...PULPIT.map(([k, q]): [number, number] => [r * q, H * k]), [0, H]], 40).translate(P.x, fy, P.z), c.stoneBig));
    parts.push(tint(lathe([[r + 0.06, H - 0.5], [r + 0.16, H - 0.4], [r + 0.16, H + 0.05], [r - 0.3, H + 0.06], [r - 0.3, H + 0.012]], 48).translate(P.x, fy, P.z), c.kerb));
  }
  // The pale stone's post, on the pulpit's top.
  {
    const m = L.mark, fy = L.pulpit.y;
    parts.push(tint(lathe([[0.5, -0.2], [0.46, 0.12], [0.26, 0.3], [0.2, m.y - fy - 0.5], [0.34, m.y - fy - 0.34], [0, m.y - fy - 0.36]], 14).translate(m.x, fy, m.z), c.made));
  }
  for (const o of L.lanterns) {
    const yaw = Math.atan2(o.nx, o.nz);
    parts.push(tint(lathe([[0, -0.36], [0.2, -0.34], [0.44, -0.14], [0.52, 0.02], [0.46, 0.04], [0.3, -0.06], [0, -0.08]], 14).translate(o.x + o.nx * 0.5, o.y, o.z + o.nz * 0.5), c.sconce));
    parts.push(tint(new THREE.CylinderGeometry(0.13, 0.17, 0.9, 8).rotateX(Math.PI / 2).translate(0, -0.2, -0.05).rotateY(yaw).translate(o.x, o.y, o.z), c.stub));
  }
  for (const s of L.spikes) {
    const g = lathe([[s.r * 1.5, 0], [s.r, s.h * 0.12], [s.r * 0.62, s.h * 0.5], [s.r * 0.36, s.h * 0.85], [s.r * 0.2, s.h * 0.97], [0, s.h]], 12);
    if (s.down) g.rotateX(Math.PI);
    parts.push(tint(g.translate(s.x, s.y, s.z), s.down ? c.spikeDown : c.spike));
  }
  const e = L.ember, fy = L.floor(e.x, e.z);
  parts.push(tint(lathe([[1.05, -0.3], [1.0, 0.15], [0.84, 0.5], [0.66, 0.74], [0.62, 0.9], [0.7, 1.04], [0.6, 1.1], [0.4, 1.02], [0, 0.98]], 24).translate(e.x, fy, e.z), c.made));
  for (const k of L.caps) {
    const g = lathe([[k.r * 0.34, 0], [k.r * 0.22, k.h * 0.35], [k.r * 0.17, k.h * 0.8], [k.r * 0.2, k.h]], 10);
    parts.push(tint(g.rotateZ(k.lean).rotateY(k.dir).translate(k.x, k.y, k.z), c.stalk));
  }
  return mergeGeometries(parts)!;
}
