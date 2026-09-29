import * as THREE from 'three';
import { hash01, hashInt, mulberry32 } from '../core/rng';
import { TERRAIN_U } from '../gfx/materials';
import type { BikeMode, Body } from '../player/movement';
import type { Colliders } from '../world/colliders';
import { SEA_LEVEL, type WorldGen } from '../world/worldgen';
import { bikeBatches, BikeSkeleton, FRAME_TINTS, PARK_LEAN, SEAT, WHEEL_R, WHEELBASE } from './bicycle';

// Bicycles left about the world. Where they stand is world generation, a pure
// function of the seed like the cabins: one waits a few steps from where you
// start, and beyond that roughly one 480 m cell in eight has one, parked on
// the verge of a footpath where the cell has a path, else out in an open
// meadow. Spots are checked against the prop colliders so a bike never
// stands in a trunk or a boulder. Once ridden, a bike stays wherever you
// leave it for the rest of the session instead of being regenerated.

const CELL = 480;
const CHANCE = 0.13;
/** Cells whose spot is within this of the player get their bike. */
const SPAWN_R = 380;
const DROP_R = 520;
const DRAW_R = 320;
const MOUNT_R = 2.1;

export interface Bike {
  key: string;
  pos: THREE.Vector3;
  heading: number;
  pitch: number;
  lean: number;
  steer: number;
  roll: number;
  crank: number;
  stand: number;
  tint: THREE.Color;
  ridden: boolean;
  /** Ridden at least once: kept for the session, not regenerated. */
  moved: boolean;
  /** Where the bars rest when parked. */
  restSteer: number;
  skel: BikeSkeleton;
}

interface Spot { x: number; z: number; heading: number }

/** What the rider's rig needs to sit on a bike: world-space targets. */
export interface BikeRider {
  pedalL: THREE.Vector3;
  pedalR: THREE.Vector3;
  gripL: THREE.Vector3;
  gripR: THREE.Vector3;
  /** Where the left boot plants when stopped, and how far it's down (0..1). */
  foot: THREE.Vector3;
  footDown: number;
  standing: number;
  effort: number;
  crank: number;
}

export class Bikes {
  readonly group = new THREE.Group();
  readonly settings = { enabled: true };
  readonly bikes = new Map<string, Bike>();
  stats = { bikes: 0, drawn: 0 };
  private batches = bikeBatches();
  private start: Spot | null = null;
  /** Cells known to have no bike. */
  private empty = new Set<string>();
  private scanT = 0;
  private frustum = new THREE.Frustum();
  private pm = new THREE.Matrix4();
  private sphere = new THREE.Sphere();
  // Ridden-bike presentation state.
  private lastCrank = 0;
  private footDown = 0;
  private pitchV = 0;
  readonly rider: BikeRider = {
    pedalL: new THREE.Vector3(), pedalR: new THREE.Vector3(), gripL: new THREE.Vector3(), gripR: new THREE.Vector3(),
    foot: new THREE.Vector3(), footDown: 0, standing: 0, effort: 0, crank: 0,
  };
  readonly seat = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), spread: 0, bike: this.rider };

  constructor(private gen: WorldGen, private colliders: Colliders) {
    for (const b of this.batches.all) this.group.add(b.mesh);
  }

  /**
   * New world (or first start): forget every bike and place the starter one
   * near the spawn, side-on to a camera looking along `camYaw`.
   */
  reset(gen: WorldGen, spawnX: number, spawnZ: number, camYaw: number) {
    this.gen = gen;
    this.bikes.clear();
    this.empty.clear();
    this.scanT = 0;
    this.start = this.startSpot(spawnX, spawnZ, camYaw);
  }

  // ------------------------------------------------------------ placement

  /** Flat, dry and clear of props for a bike standing at (x, z) facing `heading`. */
  private open(x: number, z: number, heading: number, meadow: boolean): boolean {
    const g = this.gen;
    const h = g.height(x, z);
    if (h < 2.5 || h > 170) return false;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    if (Math.abs(g.height(x + fx * 0.6, z + fz * 0.6) - g.height(x - fx * 0.6, z - fz * 0.6)) > 0.3) return false;
    if (Math.abs(g.height(x + fz * 0.5, z - fx * 0.5) - g.height(x - fz * 0.5, z + fx * 0.5)) > 0.25) return false;
    if (meadow && (g.forestDensity(x, z, h) > 0.02 || g.rockiness(x, z, h) > 0.3)) return false;
    let clear = true;
    g.poiCellRange(x - 40, z - 40, x + 40, z + 40, (p) => {
      if (Math.hypot(p.x - x, p.z - z) < Math.max(p.clear * 0.7, 9)) clear = false;
    });
    return clear;
  }

  /** Nothing (trunk, boulder, cabin, bush) where either wheel would stand. */
  private clearOfProps(x: number, z: number, heading: number): boolean {
    const h = this.gen.height(x, z);
    const fx = Math.sin(heading), fz = Math.cos(heading);
    for (const k of [0.45, -0.45]) {
      const px = x + fx * k, pz = z + fz * k;
      v1.set(px, h, pz);
      v2.set(0, 0, 0);
      this.colliders.push(v1, v2, 0.35);
      if (Math.hypot(v1.x - px, v1.z - pz) > 1e-3) return false;
      if (this.colliders.surface(px, pz, h, 0.3) > h + 0.05) return false;
      if (this.colliders.inBush(px, pz, 0.3)) return false;
    }
    return true;
  }

  /** The bike (if any) that belongs to a world cell. Deterministic from the seed. */
  private spotInCell(cx: number, cz: number): Spot | null {
    const seed = this.gen.seed;
    if (hash01(cx, cz, seed, 811) > CHANCE) return null;
    const rnd = mulberry32(hashInt(cx, cz, seed, 812));
    const x0 = cx * CELL, z0 = cz * CELL;
    // On the verge of a footpath, parked along it.
    const paths = this.gen.pathsInRange(x0, z0, x0 + CELL, z0 + CELL, 0);
    for (let i = 0; i < 8 && paths.length; i++) {
      const s = paths[Math.floor(rnd() * paths.length)];
      const t = 0.15 + rnd() * 0.7;
      const side = rnd() < 0.5 ? 1 : -1;
      const flip = rnd() < 0.5 ? 0 : Math.PI;
      const dx = s.bx - s.ax, dz = s.bz - s.az;
      const len = Math.hypot(dx, dz);
      if (len < 1) continue;
      const x = s.ax + dx * t - (dz / len) * side * 1.35;
      const z = s.az + dz * t + (dx / len) * side * 1.35;
      if (x < x0 || x >= x0 + CELL || z < z0 || z >= z0 + CELL) continue;
      const heading = Math.atan2(dx, dz) + flip + (rnd() - 0.5) * 0.2;
      if (this.open(x, z, heading, false)) return { x, z, heading };
    }
    // Otherwise out in an open meadow.
    for (let i = 0; i < 12; i++) {
      const x = x0 + 30 + rnd() * (CELL - 60);
      const z = z0 + 30 + rnd() * (CELL - 60);
      const heading = rnd() * Math.PI * 2;
      if (this.open(x, z, heading, true)) return { x, z, heading };
    }
    return null;
  }

  /** A few steps from the spawn, in front of the first camera, side-on to it. */
  private startSpot(sx: number, sz: number, camYaw: number): Spot | null {
    // The camera sits at +(sin yaw, cos yaw) from the explorer, looking back.
    const away = camYaw + Math.PI;
    for (const d of [5, 6.5, 4, 8, 10]) {
      for (const da of [0.55, -0.55, 0.9, -0.9, 0.25, -0.25, 1.3, -1.3]) {
        const a = away + da;
        const x = sx + Math.sin(a) * d;
        const z = sz + Math.cos(a) * d;
        // Show its profile, nosed a touch toward the camera.
        const heading = camYaw + (da > 0 ? -1 : 1) * (Math.PI / 2 + 0.35);
        if (this.open(x, z, heading, false) && this.clearOfProps(x, z, heading)) return { x, z, heading };
      }
    }
    return null;
  }

  private create(key: string, s: Spot, tintIndex: number): Bike | null {
    // Shuffle off anything solid; give up on the spot if it's crowded.
    let spot: Spot | null = null;
    for (let ring = 0; ring < 4 && !spot; ring++) {
      for (let i = 0; i < (ring ? 8 : 1); i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = s.x + Math.cos(a) * ring * 1.2, z = s.z + Math.sin(a) * ring * 1.2;
        if (this.clearOfProps(x, z, s.heading)) { spot = { x, z, heading: s.heading }; break; }
      }
    }
    if (!spot) return null;
    const h = hashInt(Math.round(spot.x), Math.round(spot.z), this.gen.seed, 813);
    const k: Bike = {
      key, pos: new THREE.Vector3(spot.x, this.gen.height(spot.x, spot.z), spot.z), heading: spot.heading,
      pitch: 0, lean: PARK_LEAN, steer: 0, roll: (h % 628) / 100, crank: ((h >>> 10) % 628) / 100, stand: 1,
      tint: new THREE.Color(FRAME_TINTS[tintIndex % FRAME_TINTS.length]),
      ridden: false, moved: false, restSteer: (((h >>> 20) % 100) / 100 - 0.5) * 0.7, skel: new BikeSkeleton(),
    };
    k.steer = k.restSteer;
    k.pitch = this.groundPitch(k);
    this.bikes.set(key, k);
    return k;
  }

  private populate(p: THREE.Vector3) {
    // Untouched bikes far behind you drop out (and come back when you return).
    for (const [key, k] of this.bikes) {
      if (!k.moved && !k.ridden && Math.hypot(k.pos.x - p.x, k.pos.z - p.z) > DROP_R) this.bikes.delete(key);
    }
    if (this.start && !this.bikes.has('start') && Math.hypot(this.start.x - p.x, this.start.z - p.z) < SPAWN_R) {
      this.create('start', this.start, 0);
    }
    const c0x = Math.floor((p.x - SPAWN_R) / CELL), c1x = Math.floor((p.x + SPAWN_R) / CELL);
    const c0z = Math.floor((p.z - SPAWN_R) / CELL), c1z = Math.floor((p.z + SPAWN_R) / CELL);
    for (let cz = c0z; cz <= c1z; cz++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const key = `${cx},${cz}`;
        if (this.bikes.has(key) || this.empty.has(key)) continue;
        const s = this.spotInCell(cx, cz);
        if (!s) { this.empty.add(key); continue; }
        if (Math.hypot(s.x - p.x, s.z - p.z) > SPAWN_R) continue;
        if (!this.create(key, s, 1 + (hashInt(cx, cz, this.gen.seed, 814) % 16))) this.empty.add(key);
      }
    }
  }

  // ------------------------------------------------------------ riding

  /** The parked bike you could climb onto from `p`, if any. */
  mountable(p: THREE.Vector3): Bike | null {
    if (!this.settings.enabled) return null;
    let best: Bike | null = null;
    let bd = MOUNT_R;
    for (const k of this.bikes.values()) {
      if (k.ridden) continue;
      const d = Math.hypot(k.pos.x - p.x, k.pos.z - p.z);
      if (d < bd && Math.abs(k.pos.y - p.y) < 1.2) { bd = d; best = k; }
    }
    return best;
  }

  mount(k: Bike, body: Body, mode: BikeMode) {
    k.ridden = true;
    k.moved = true;
    body.pos.copy(k.pos);
    body.vel.set(0, 0, 0);
    body.heading = k.heading;
    body.grounded = true;
    mode.crank = k.crank;
    mode.steer = k.steer;
    mode.lean = k.lean;
    this.lastCrank = k.crank;
    // Start with a foot already down, so climbing on doesn't pop.
    this.footDown = 1;
    this.pitchV = 0;
  }

  /** Leave the bike standing where it is (on its kickstand). */
  park(k: Bike, at?: THREE.Vector3) {
    k.ridden = false;
    if (at) k.pos.copy(at);
    k.pos.y = this.gen.height(k.pos.x, k.pos.z);
    k.restSteer = k.steer * 0.5 + 0.2;
  }

  /** Mirror the ridden bike from the movement body + mode. */
  ride(k: Bike, body: Body, mode: BikeMode, dt: number) {
    const e = (r: number) => 1 - Math.exp(-r * dt);
    const dx = body.pos.x - k.pos.x, dz = body.pos.z - k.pos.z;
    k.roll += (dx * Math.sin(body.heading) + dz * Math.cos(body.heading)) / WHEEL_R;
    k.pos.copy(body.pos);
    k.heading = body.heading;
    k.steer = mode.steer;
    k.stand += (0 - k.stand) * e(10);

    // Stopped: a boot goes down and the bike tips onto it; the pedals come
    // round to the ready position (right pedal forward and up).
    const stopped = body.grounded && Math.abs(mode.speed) < 0.7 && mode.effort < 0.15;
    this.footDown += ((stopped ? 1 : 0) - this.footDown) * e(stopped ? 5 : 12);
    k.crank += mode.crank - this.lastCrank;
    this.lastCrank = mode.crank;
    if (this.footDown > 0.3) {
      const ready = -0.7;
      const d = Math.atan2(Math.sin(ready - k.crank), Math.cos(ready - k.crank));
      k.crank += d * e(3) * this.footDown;
    }
    const rock = Math.sin(k.crank) * 0.07 * mode.standing;
    k.lean = mode.lean + 0.13 * this.footDown + rock;

    // Pitch follows the ground under the wheels; in the air it noses along
    // the flight path.
    const target = body.grounded ? this.groundPitch(k) : THREE.MathUtils.clamp(Math.atan2(body.vel.y, Math.max(2, Math.hypot(body.vel.x, body.vel.z))) * 0.6, -0.5, 0.5);
    this.pitchV += ((target - k.pitch) * 180 - this.pitchV * 22) * dt;
    k.pitch += this.pitchV * dt;
    if (body.grounded) k.pitch += (target - k.pitch) * e(6);

    // Rider targets.
    k.skel.pose(k);
    const r = this.rider;
    k.skel.pedal('L', r.pedalL);
    k.skel.pedal('R', r.pedalR);
    k.skel.grip('L', r.gripL);
    k.skel.grip('R', r.gripR);
    k.skel.toWorld(0.36, 0, -0.08, r.foot);
    r.foot.y = this.gen.height(r.foot.x, r.foot.z);
    r.footDown = this.footDown;
    r.standing = mode.standing;
    r.effort = mode.effort;
    r.crank = k.crank;
    // Standing on the pedals lifts the hips forward off the saddle.
    const st = mode.standing;
    k.skel.toWorld(SEAT.x - rock * 0.2, SEAT.y + 0.1 * st, SEAT.z + 0.07 * st, this.seat.pos);
    this.seat.quat.copy(k.skel.root.quaternion);
  }

  private groundPitch(k: Bike) {
    const fx = Math.sin(k.heading), fz = Math.cos(k.heading), h = WHEELBASE / 2;
    const hf = this.floor(k, k.pos.x + fx * h, k.pos.z + fz * h);
    const hr = this.floor(k, k.pos.x - fx * h, k.pos.z - fz * h);
    return Math.atan2(hf - hr, WHEELBASE);
  }

  /** Ground under a wheel: terrain, or a boulder the ridden bike is rolling over. */
  private floor(k: Bike, x: number, z: number) {
    const g = this.gen.height(x, z);
    return k.ridden && k.pos.y > g + 0.05 ? Math.max(g, this.colliders.ramp(x, z, 0.1, 2.2)) : g;
  }

  /** Keep walkers out of parked bikes (a wheel-sized circle at each end). */
  push(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    for (const k of this.bikes.values()) {
      if (k.ridden || Math.abs(k.pos.x - pos.x) > 3 || Math.abs(k.pos.z - pos.z) > 3) continue;
      if (pos.y > k.pos.y + 0.9 || pos.y < k.pos.y - 1) continue;
      const fx = Math.sin(k.heading), fz = Math.cos(k.heading);
      for (const o of [0.33, -0.33]) {
        const dx = pos.x - (k.pos.x + fx * o), dz = pos.z - (k.pos.z + fz * o);
        const d = Math.hypot(dx, dz), min = r + 0.27;
        if (d >= min || d < 1e-4) continue;
        const nx = dx / d, nz = dz / d;
        pos.x += nx * (min - d);
        pos.z += nz * (min - d);
        const vn = vel.x * nx + vel.z * nz;
        if (vn < 0) { vel.x -= nx * vn; vel.z -= nz * vn; }
      }
    }
  }

  // ------------------------------------------------------------ frame

  update(dt: number, player: THREE.Vector3, camera: THREE.PerspectiveCamera) {
    const B = this.batches;
    for (const b of B.all) b.begin();
    if (!this.settings.enabled) {
      for (const b of B.all) b.end();
      return;
    }
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.populate(player);
      this.scanT = 0.5;
    }
    const e = (r: number) => 1 - Math.exp(-r * dt);
    camera.updateMatrixWorld();
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    let drawn = 0;
    for (const k of this.bikes.values()) {
      if (!k.ridden) {
        // Settle onto the kickstand (after you hop off).
        k.stand += (1 - k.stand) * e(9);
        k.lean += (PARK_LEAN - k.lean) * e(k.stand > 0.8 ? 7 : 2);
        k.steer += (k.restSteer - k.steer) * e(3);
        k.pitch += (this.groundPitch(k) - k.pitch) * e(8);
      }
      const d = k.pos.distanceTo(camera.position);
      if (d > DRAW_R && !k.ridden) continue;
      this.sphere.center.set(k.pos.x, k.pos.y + 0.5, k.pos.z);
      this.sphere.radius = 1.1;
      if (!k.ridden && !this.frustum.intersectsSphere(this.sphere)) continue;
      if (!k.ridden) k.skel.pose(k);
      k.skel.emit(B, k.tint);
      drawn++;
    }
    for (const b of B.all) b.end();
    this.stats.bikes = this.bikes.size;
    this.stats.drawn = drawn;
  }

  /** Contact shadows for parked bikes, in whatever creature shadow slots are free. */
  shadows(camera: THREE.Camera) {
    if (!this.settings.enabled) return;
    const U = TERRAIN_U.uMobShadow.value;
    let slot = 0;
    for (const k of this.bikes.values()) {
      if (k.ridden || k.pos.distanceTo(camera.position) > 80 || k.pos.y < SEA_LEVEL) continue;
      while (slot < U.length && U[slot].y > -1e3) slot++;
      if (slot >= U.length) return;
      U[slot].set(k.pos.x, k.pos.y, k.pos.z, 0.55);
    }
  }
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
