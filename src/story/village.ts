import * as THREE from 'three';
import { SHADOW_LAYER } from '../gfx/groundShadow';
import { makeCasterMaterial } from '../gfx/materials';
import { Puffs } from '../gfx/puffs';
import { hash01 } from '../core/rng';
import { BIOME } from '../gfx/palette';
import { colored, PartBatch } from '../mobs/parts';
import type { Plot, VillageSite } from '../world/storySite';
import { gable, K, kbox, merge, rbox } from './geometry';
import { glintMat, propMesh } from './props';
import { Spirit } from './spirit';

// The village: the other hearth spirits' houses, whole and lived in, down
// the lane from the guide's cabin (the plots are in world/storySite.ts).
// Each is about 4 m to the ridge, well under the cabin, with its spirit on
// the doorstep, a lit window and a wisp of smoke. The giant treads on them
// (`smash`): a house bursts into boards and stones that stay where they
// land, and its spirit is gone (giant/visit.ts carries it off).

/** Hut scale: the door (1.2 m) is for a spirit, not for you. */
const S = 1.8;

interface HutSpec { w: number; d: number; h: number; rise: number; wall: number; roof: number }
const HUTS: HutSpec[] = [
  { w: 1.5, d: 1.3, h: 1.0, rise: 0.95, wall: K.wall, roof: K.roof },
  { w: 1.8, d: 1.4, h: 0.85, rise: 0.75, wall: K.wood, roof: K.moss },
  { w: 1.25, d: 1.2, h: 1.3, rise: 1.2, wall: K.wall, roof: K.roof },
];
const BASE = 0.18, OVER = 0.22;

/** A spirit's house: local +z is the door side, the ridge runs along x, y = 0 at the ground. */
function buildHut(v: number): { geo: THREE.BufferGeometry; door: THREE.Vector3; chimney: THREE.Vector3 } {
  const { w, d, h, rise, wall, roof } = HUTS[v];
  const top = BASE + h, hd = d / 2;
  const parts: THREE.BufferGeometry[] = [];
  // Footing, sunk well in so a slope never shows daylight under it.
  parts.push(rbox(w + 0.2, 0.9, d + 0.2, 0.07, 0, BASE - 0.45, 0, K.stone));
  parts.push(rbox(w, h + 0.1, d, 0.05, 0, BASE + h / 2, 0, wall));
  for (const sx of [-1, 1]) {
    const g = gable(d, rise, 0.1, wall, -0.05);
    g.rotateY(Math.PI / 2);
    g.translate(sx * (w / 2 - 0.05), top, 0);
    parts.push(g);
  }
  // Roof: two thick slabs, well past the walls all round.
  const a = Math.atan2(rise, hd);
  const len = Math.hypot(hd, rise) * (1 + OVER / hd);
  for (const sz of [-1, 1]) {
    const cy = top + rise - Math.sin(a) * len / 2 + 0.07, cz = sz * Math.cos(a) * len / 2;
    parts.push(kbox(w + 0.5, 0.13, len, 0, cy, cz, roof, sz * a));
  }
  parts.push(kbox(w + 0.56, 0.1, 0.16, 0, top + rise + 0.1, 0, K.trim));
  // The door, a lintel, a step.
  const dx = -w * 0.17;
  parts.push(kbox(0.44, 0.66, 0.06, dx, BASE + 0.33, hd + 0.02, K.door));
  parts.push(kbox(0.56, 0.07, 0.09, dx, BASE + 0.7, hd + 0.03, K.trim));
  parts.push(kbox(0.05, 0.05, 0.05, dx + 0.14, BASE + 0.32, hd + 0.06, K.trim));
  parts.push(rbox(0.6, 0.14, 0.3, 0.05, dx, BASE - 0.06, hd + 0.16, K.stone));
  // A window by the door (a cross of glazing bars) and a small one in the gable.
  const wx = w * 0.24, wy = BASE + h * 0.58, ws = 0.24;
  parts.push(kbox(ws + 0.1, ws + 0.1, 0.05, wx, wy, hd + 0.01, K.trim));
  parts.push(kbox(ws, ws, 0.07, wx, wy, hd + 0.015, K.glass));
  parts.push(kbox(0.03, ws, 0.085, wx, wy, hd + 0.015, K.trim));
  parts.push(kbox(ws, 0.03, 0.085, wx, wy, hd + 0.015, K.trim));
  parts.push(kbox(ws + 0.14, 0.05, 0.1, wx, wy - ws / 2 - 0.06, hd + 0.03, K.trim));
  parts.push(kbox(0.05, 0.2, 0.2, -w / 2 - 0.01, top + rise * 0.3, 0, K.glass));
  // Chimney through the back slope.
  const cx = w * 0.24, cz = -d * 0.2, cTop = top + rise + 0.42;
  parts.push(kbox(0.26, 0.9, 0.26, cx, cTop - 0.45, cz, K.stone));
  parts.push(kbox(0.34, 0.07, 0.34, cx, cTop, cz, K.stone));
  const geo = merge(parts);
  geo.scale(S, S, S);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return { geo, door: new THREE.Vector3(dx * S, 0, (hd + 0.62) * S), chimney: new THREE.Vector3(cx * S, (cTop + 0.1) * S, cz * S) };
}

export interface House {
  plot: Plot; hw: number; hd: number; wallTop: number; rise: number; door: THREE.Vector3; chimney: THREE.Vector3;
  meshes: THREE.Object3D[]; smashed: boolean;
}

/** A board or a stone thrown out of a smashed house. */
interface Piece { stone: boolean; pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Euler; spin: THREE.Vector3; size: THREE.Vector3; tint: THREE.Color; rest: boolean }
const BOARDS = 26, STONES = 8;
const WALL_TINT = [BIOME.cabinWall, BIOME.cabinWall2, BIOME.cabinWall];
const ROOF_TINT = [BIOME.cabinRoof, BIOME.moss, BIOME.cabinRoof];
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();

export interface VillageDeps {
  seed: number;
  ground(x: number, z: number): number;
}

export class Village {
  readonly group = new THREE.Group();
  readonly houses: House[] = [];
  /** Everyone who lives here (some houses have two), the house each lives at, and whether it has been carried off. */
  readonly spirits: Spirit[] = [];
  readonly home: number[] = [];
  readonly taken: boolean[] = [];
  /** Where each one's door lets out on to the lane (an index into it), and the way it's running (set by `panic`). */
  private laneAt: number[] = [];
  private flee: (THREE.Vector3[] | null)[] = [];
  private gy: (x: number, z: number) => number;
  private smoke = new Puffs('#f3ebe0', 40, 0, 0.55);
  private smokeT: number[] = [];
  private mat = glintMat({ toneVar: 0 });
  private pieces: Piece[] = [];
  private boards = new PartBatch(colored(new THREE.BoxGeometry(1, 1, 1), '#ffffff'), { keep: 0.5 }, 5 * BOARDS);
  private stones = new PartBatch(colored(new THREE.IcosahedronGeometry(0.5, 2), '#ffffff'), { keep: 0.3 }, 5 * STONES);
  private seed: number;

  constructor(readonly site: VillageSite, d: VillageDeps) {
    this.seed = d.seed;
    this.gy = d.ground;
    // Lit windows by day too: somebody's home.
    this.mat.uniforms.uWin.value = 1;
    const caster = makeCasterMaterial({});
    const lane = site.lane, mid = lane[Math.floor(lane.length / 2)];
    for (const [i, p] of site.plots.filter((q) => q.house).entries()) {
      const built = buildHut(p.variant);
      const mesh = propMesh(built.geo, this.mat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = p.rot;
      mesh.updateMatrixWorld();
      const shade = propMesh(built.geo, caster);
      shade.position.copy(mesh.position);
      shade.rotation.y = p.rot;
      shade.layers.set(SHADOW_LAYER);
      this.group.add(mesh, shade);
      const door = built.door.clone().applyMatrix4(mesh.matrixWorld);
      const chimney = built.chimney.clone().applyMatrix4(mesh.matrixWorld);
      const sp = HUTS[p.variant];
      this.smokeT.push(i * 0.17);

      // Its spirits (every other house has two): on the doorstep, watching
      // the lane (and you, when you pass). When they run, it's out to the
      // lane first and then along it, not through the neighbours' walls.
      let vi = 0, vd = Infinity;
      for (const [j, l] of lane.entries()) { const dl = Math.hypot(l.x - door.x, l.z - door.z); if (dl < vd) { vd = dl; vi = j; } }
      for (let k = 0; k < (i % 2 ? 1 : 2); k++) {
        const n = this.spirits.length;
        const at = door.clone();
        if (k) { at.x += Math.cos(p.rot) * 1.5; at.z -= Math.sin(p.rot) * 1.5; at.y = d.ground(at.x, at.z); }
        const spirit = new Spirit({ ground: d.ground, route: (_a, b) => this.flee[n]?.slice() ?? [b], sound: () => {}, sparkle: () => {} }, at);
        this.laneAt.push(vi);
        this.flee.push(null);
        spirit.want = { at: at.clone(), face: new THREE.Vector3(mid.x, 0, mid.z), pose: hash01(n, 1, d.seed, 979) < 0.4 ? 'sit' : 'stand', icon: null, lead: false, settled: true };
        spirit.holdWarmth = 0.8 + hash01(n, 7, d.seed, 979) * 0.2;
        spirit.heading = p.rot;
        this.spirits.push(spirit);
        this.home.push(i);
        this.taken.push(false);
        this.group.add(spirit.group);
      }
      this.houses.push({ plot: p, hw: (sp.w / 2) * S, hd: (sp.d / 2) * S, wallTop: (BASE + sp.h) * S, rise: sp.rise * S, door, chimney, meshes: [mesh, shade], smashed: false });
    }
    this.group.add(this.smoke.group, this.boards.mesh, this.stones.mesh);
  }

  /**
   * A foot comes down on house `i`: it bursts into boards and stones, which
   * fly out, land on `ground` and stay. `instant` lays them where they'd
   * have ended up (a restored save). Nobody is in it: they ran for the
   * middle of the lane when they heard it coming (`panic`). In a restored
   * save they're long gone.
   */
  smash(i: number, ground: (x: number, z: number) => number, instant = false) {
    const h = this.houses[i];
    if (h.smashed) return;
    h.smashed = true;
    for (const m of h.meshes) m.visible = false;
    if (instant) for (const [k, s] of this.spirits.entries()) if (this.home[k] === i) { this.taken[k] = true; s.group.visible = false; }
    const v = h.plot.variant;
    for (let k = 0; k < BOARDS + STONES; k++) {
      const r = (n: number) => hash01(i * 40 + k, n, this.seed, 983);
      const stone = k >= BOARDS;
      // Out from under the edge of the sole, in a ring, high enough to be seen over it.
      const a = r(1) * 6.283, out = 7 + r(2) * 10, ring = 5 + r(6) * 4;
      const size = stone ? new THREE.Vector3(0.5 + r(3) * 0.5, 0.35 + r(4) * 0.3, 0.5 + r(5) * 0.4) : new THREE.Vector3(1.5 + r(3) * 1.9, 0.12, 0.4 + r(4) * 0.35);
      const p: Piece = {
        stone, size, rest: false,
        pos: new THREE.Vector3(h.plot.x + Math.cos(a) * ring, h.plot.y + 0.6 + r(7) * 2.5, h.plot.z + Math.sin(a) * ring),
        vel: new THREE.Vector3(Math.cos(a) * out, 11 + r(9) * 11, Math.sin(a) * out),
        rot: new THREE.Euler(r(10) * 6, r(11) * 6, r(12) * 6),
        spin: new THREE.Vector3((r(13) - 0.5) * 14, (r(14) - 0.5) * 8, (r(15) - 0.5) * 14),
        tint: new THREE.Color(stone ? BIOME.stone : k % 3 === 0 ? ROOF_TINT[v] : WALL_TINT[v]),
      };
      if (instant) {
        // Where it would have come down, more or less.
        const t = p.vel.y / 11;
        p.pos.x += p.vel.x * t; p.pos.z += p.vel.z * t;
        this.settle(p, ground);
      }
      this.pieces.push(p);
    }
    this.ground = ground;
    this.drawPieces();
  }

  /**
   * They've heard it: everyone runs for `to` and stands about there in a
   * few loose knots, shaking, looking up at `face` (which lies off toward
   * `front`, a unit vector). Out of the door to the lane, along it to its
   * point `laneTo`, by way of `via`, and there. The one with furthest to go
   * bolts at once; each of the others stands staring until the runners are
   * nearly on it and then goes with them, so they come down the lane as a
   * pack and get there together, in about `secs`. Returns who went first.
   */
  panic(to: THREE.Vector3, face: THREE.Vector3, front: { x: number; z: number }, laneTo: number, via: THREE.Vector3[], secs: number): number {
    const lane = this.site.lane;
    /** Where each stands, across the way they're looking and back from it: twos and threes, not a rank. */
    const SPOT = [[-4.7, 0.5], [-3.6, -1.7], [-2.6, 2.0], [-0.7, -0.4], [0.4, 2.7], [1.1, -2.3], [3.2, 1.0], [4.3, -1.3], [2.2, 3.4], [-1.9, 3.6]];
    let tail = 0, far = 0;
    const runs: { k: number; len: number; go: () => void }[] = [];
    for (const [k, s] of this.spirits.entries()) {
      if (this.taken[k]) continue;
      const r = (n: number) => hash01(k, n, this.seed, 991) - 0.5;
      const [across, back] = SPOT[k % SPOT.length].map((v, n) => v + r(n + 1) * 0.6);
      const at = new THREE.Vector3(to.x + front.z * across - front.x * back, 0, to.z - front.x * across - front.z * back);
      at.y = this.gy(at.x, at.z);
      // Each keeps to its own side of the way, so the pack is a pack and not a string.
      const off = r(3) * 4.4, path: THREE.Vector3[] = [];
      const step = laneTo < this.laneAt[k] ? -1 : 1;
      const side = (p: { x: number; z: number }, q: { x: number; z: number }) => { const l = Math.hypot(q.x - p.x, q.z - p.z) || 1; return new THREE.Vector3(p.x + ((q.z - p.z) / l) * off, 0, p.z - ((q.x - p.x) / l) * off); };
      for (let j = this.laneAt[k]; j !== laneTo; j += step) path.push(side(lane[j], lane[j + step]));
      const end = via[0] ?? at;
      path.push(side(lane[laneTo], end));
      for (const [n, w] of via.entries()) path.push(side(w, via[n + 1] ?? at).lerp(w, 0.6));
      path.push(at);
      let len = 0, p = s.pos;
      for (const q of path) { len += Math.hypot(q.x - p.x, q.z - p.z); p = q; }
      if (len > far) { far = len; tail = k; }
      s.mood = 'scared';
      s.want.face = face;
      s.want.pose = 'stand';
      runs.push({ k, len, go: () => { this.flee[k] = path; s.want = { at, face, pose: 'stand', icon: null, lead: false, settled: true }; } });
    }
    const speed = THREE.MathUtils.clamp(far / secs, 5, 11.5);
    this.fleeT = 0;
    this.waiting = runs.map((q) => {
      this.spirits[q.k].haste = speed * (q.k === tail ? 1 : 0.97 + 0.05 * hash01(q.k, 5, this.seed, 991));
      // (It goes when the first runner is a few strides short of its door.)
      return { at: q.k === tail ? 0 : Math.max(0.25, (far - q.len - 7) / speed), go: q.go };
    });
    return tail;
  }

  private fleeT = 0;
  private waiting: { at: number; go: () => void }[] = [];

  /** Something came down close by: they all start. */
  flinch() {
    for (const [k, s] of this.spirits.entries()) if (!this.taken[k]) s.flinch();
  }

  /** Spirit `k` is snatched up: from now on it hangs at `grip` (a crow's, which moves), kicking. */
  take(k: number, grip: THREE.Vector3) {
    this.taken[k] = true;
    this.spirits[k].carried = grip;
  }

  /** And it's gone from here (up at the giant's head, it is a light under its crow). */
  drop(k: number) {
    this.spirits[k].carried = null;
    this.spirits[k].group.visible = false;
  }

  private ground: ((x: number, z: number) => number) | null = null;

  private settle(p: Piece, ground: (x: number, z: number) => number) {
    p.rest = true;
    p.pos.y = ground(p.pos.x, p.pos.z) + (p.stone ? p.size.y * 0.3 : 0.07);
    // Boards lie flat, give or take.
    p.rot.set(p.stone ? p.rot.x : Math.sin(p.rot.x) * 0.12, p.rot.y, p.stone ? p.rot.z : Math.sin(p.rot.z) * 0.12);
  }

  private drawPieces() {
    this.boards.begin();
    this.stones.begin();
    for (const p of this.pieces) (p.stone ? this.stones : this.boards).push(m4.compose(p.pos, q.setFromEuler(p.rot), p.size), p.tint);
    this.boards.end();
    this.stones.end();
  }

  update(dt: number, player: THREE.Vector3) {
    // Boards and stones in the air: they tumble, drop and stay where they land.
    let flying = false;
    for (const p of this.pieces) {
      if (p.rest || !this.ground) continue;
      flying = true;
      p.vel.y -= 22 * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += p.spin.x * dt; p.rot.y += p.spin.y * dt; p.rot.z += p.spin.z * dt;
      if (p.vel.y < 0 && p.pos.y <= this.ground(p.pos.x, p.pos.z) + 0.1) this.settle(p, this.ground);
    }
    if (flying) this.drawPieces();
    for (const [i, h] of this.houses.entries()) {
      if (h.smashed) continue;
      if ((this.smokeT[i] -= dt) <= 0) {
        this.smokeT[i] = 0.5 + Math.random() * 0.25;
        this.smoke.emit(h.chimney, 1, 0.2 + Math.random() * 0.1, 0.16, undefined, { life: 3, rise: 0.18, drag: 0.35, up: 0.7 });
      }
    }
    this.smoke.update(dt);
    if (this.waiting.length) {
      this.fleeT += dt;
      this.waiting = this.waiting.filter((w) => { if (w.at > this.fleeT) return true; w.go(); return false; });
    }
    for (const [k, s] of this.spirits.entries()) {
      if (this.taken[k] && !s.carried) continue;
      s.player.copy(player);
      s.update(dt);
    }
  }

  private local(h: House, x: number, z: number, out: { x: number; z: number }) {
    const c = Math.cos(h.plot.rot), s = Math.sin(h.plot.rot);
    const dx = x - h.plot.x, dz = z - h.plot.z;
    out.x = c * dx - s * dz;
    out.z = s * dx + c * dz;
    return out;
  }

  private l = { x: 0, z: 0 };

  /** The roof under a foot circle (you can land and stand on one), at most `step` above the feet. */
  surface(x: number, z: number, feetY: number, r: number, step: number): number {
    for (const h of this.houses) {
      if (h.smashed || Math.abs(x - h.plot.x) > 6 || Math.abs(z - h.plot.z) > 6) continue;
      const l = this.local(h, x, z, this.l);
      const over = OVER * S + 0.2;
      if (Math.abs(l.x) > h.hw + 0.45 + r || Math.abs(l.z) > h.hd + over + r || feetY < h.plot.y + h.wallTop - 0.3) continue;
      const nz = Math.min(h.hd + over, Math.max(0, Math.abs(l.z) - r));
      const y = h.plot.y + h.wallTop + h.rise * (1 - nz / h.hd) + 0.2;
      return y <= feetY + step ? y : -Infinity;
    }
    return -Infinity;
  }

  /** Push a body circle out of the walls. */
  push(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    for (const h of this.houses) {
      if (h.smashed || Math.abs(pos.x - h.plot.x) > 6 || Math.abs(pos.z - h.plot.z) > 6) continue;
      if (pos.y > h.plot.y + h.wallTop - 0.05) continue;
      const l = this.local(h, pos.x, pos.z, this.l);
      const qx = Math.max(-h.hw, Math.min(h.hw, l.x)), qz = Math.max(-h.hd, Math.min(h.hd, l.z));
      let nx = l.x - qx, nz = l.z - qz, depth: number;
      const d = Math.hypot(nx, nz);
      if (d > 1e-4) {
        if (d >= r) continue;
        nx /= d; nz /= d;
        depth = r - d;
      } else {
        const px = h.hw - Math.abs(l.x), pz = h.hd - Math.abs(l.z);
        if (px < pz) { nx = Math.sign(l.x) || 1; nz = 0; depth = px + r; } else { nx = 0; nz = Math.sign(l.z) || 1; depth = pz + r; }
      }
      const c = Math.cos(h.plot.rot), s = Math.sin(h.plot.rot);
      const wx = c * nx + s * nz, wz = -s * nx + c * nz;
      pos.x += wx * depth;
      pos.z += wz * depth;
      const vn = vel.x * wx + vel.z * wz;
      if (vn < 0) { vel.x -= wx * vn; vel.z -= wz * vn; }
    }
  }
}
