import * as THREE from 'three';
import type { InputState } from './input';

// Movement is a small state machine of interchangeable modes. Each mode owns
// how a Body moves for one kind of locomotion and can request a transition.
// Adding boating or gliding = implement MovementMode + register it; nothing
// else (camera, character rig, input) needs to change.

export interface WorldQuery {
  /** Bare terrain height. */
  groundHeight(x: number, z: number): number;
  /**
   * What the feet rest on: terrain, or the top of a solid prop (rock, roof)
   * under a foot circle that is no more than a step above `feetY`.
   */
  floorHeight?(x: number, z: number, feetY: number, radius: number): number;
  /**
   * Push the body out of solid props and cancel velocity into them. Boulders
   * standing no more than `rampMax` out of the ground are let through
   * (a fast bike rides up them instead: see `ramp`).
   */
  collide?(pos: THREE.Vector3, vel: THREE.Vector3, radius: number, rampMax?: number): void;
  /**
   * Only the big landmarks (beacon towers): what even free flight can't pass
   * through. Walls push out, and coming down onto a top lands on it.
   */
  landmarks?(pos: THREE.Vector3, vel: THREE.Vector3, radius: number): void;
  /** Highest boulder surface under a circle, for rocks up to `maxRise` tall; -Infinity if none. */
  ramp?(x: number, z: number, radius: number, maxRise: number): number;
  waterLevel: number;
}

/** The explorer's footprint for prop collision (m). */
export const BODY_RADIUS = 0.32;

function floorAt(world: WorldQuery, x: number, z: number, feetY: number): number {
  return world.floorHeight ? world.floorHeight(x, z, feetY, BODY_RADIUS) : world.groundHeight(x, z);
}

function collide(b: Body, world: WorldQuery) {
  world.collide?.(b.pos, b.vel, BODY_RADIUS);
}

/** One-frame happenings that presentation (rig, camera, particles) reacts to. */
export type MoveEvent =
  | { type: 'jump' }
  /** `impact` = downward speed at touchdown, m/s. */
  | { type: 'land'; impact: number }
  | { type: 'deploy' }
  | { type: 'stow' }
  /** Ran into something solid; `impact` = speed lost, m/s. */
  | { type: 'bump'; impact: number }
  /** Launched off a ramp (a boulder); `perfect` = Space timed at the lip. */
  | { type: 'kick'; speed: number; perfect: boolean };

export interface Body {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  /** Facing, radians; 0 = +z. */
  heading: number;
  grounded: boolean;
  /** Cleared at the start of every controller update. */
  events: MoveEvent[];
}

export interface MoveContext {
  input: InputState;
  /** Camera yaw (radians), used to make input camera-relative. */
  camYaw: number;
  camPitch: number;
  dt: number;
  world: WorldQuery;
}

export interface MovementMode {
  readonly name: string;
  enter?(body: Body, ctx: MoveContext): void;
  exit?(body: Body): void;
  /** Returns the name of a mode to switch to, or null to stay. */
  update(body: Body, ctx: MoveContext): string | null;
}

const tmp = new THREE.Vector3();

/** Camera-relative planar wish direction (length <= 1). */
function wishDir(ctx: MoveContext, out: THREE.Vector3): THREE.Vector3 {
  const { x, y } = ctx.input;
  const sy = Math.sin(ctx.camYaw);
  const cy = Math.cos(ctx.camYaw);
  // forward = (-sin, -cos), right = (cos, -sin)
  out.set(-sy * y + cy * x, 0, -cy * y - sy * x);
  const l = out.length();
  if (l > 1) out.divideScalar(l);
  return out;
}

function turnToward(body: Body, dir: THREE.Vector3, rate: number, dt: number) {
  if (dir.lengthSq() < 1e-4) return;
  const target = Math.atan2(dir.x, dir.z);
  let d = target - body.heading;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  body.heading += d * (1 - Math.exp(-rate * dt));
}

/**
 * On foot. Tuned for feel rather than realism: a jog by default, a quick
 * ramp to sprint, and a platformer jump (coyote time, input buffer,
 * variable height, heavier fall, a little apex hang).
 */
export class WalkMode implements MovementMode {
  readonly name = 'walk';
  walkSpeed = 2.4;
  runSpeed = 6.2;
  sprintSpeed = 10.5;
  jumpSpeed = 8.4;
  gravity = 25;
  /** Gravity multipliers: falling, and rising after jump is released. */
  fallMul = 1.6;
  cutMul = 2.6;
  maxFall = 45;
  coyote = 0.12;
  buffer = 0.14;
  /** Minimum ground clearance before a mid-air press opens the parachute. */
  deployClearance = 1.0;
  private sinceGround = 0;
  private sincePress = 1;
  private jumping = false;

  enter(b: Body) {
    this.sinceGround = b.grounded ? 0 : 1;
    this.sincePress = 1;
    this.jumping = false;
  }

  update(b: Body, ctx: MoveContext): string | null {
    const { dt, world, input } = ctx;
    const wish = wishDir(ctx, tmp);
    const wishLen = wish.length();
    const target = input.walk ? this.walkSpeed : input.run ? this.sprintSpeed : this.runSpeed;
    const hSpeed = Math.hypot(b.vel.x, b.vel.z);

    if (b.grounded) {
      // Speed up briskly, stop and turn around faster still.
      const along = wishLen > 0.05 ? (b.vel.x * wish.x + b.vel.z * wish.z) / wishLen : 0;
      const rate = wishLen < 0.05 ? 14 : along < hSpeed * 0.3 ? 18 : along < target ? 9 : 12;
      const k = 1 - Math.exp(-rate * dt);
      b.vel.x += (wish.x * target - b.vel.x) * k;
      b.vel.z += (wish.z * target - b.vel.z) * k;
      turnToward(b, wish, 14, dt);
    } else if (wishLen > 0.05) {
      // Air control steers without bleeding momentum.
      const k = 1 - Math.exp(-4 * dt);
      const s = Math.max(target, hSpeed);
      b.vel.x += (wish.x * s - b.vel.x) * k;
      b.vel.z += (wish.z * s - b.vel.z) * k;
      turnToward(b, wish, 7, dt);
    }

    // Slow down when climbing steep ground.
    const g0 = floorAt(world, b.pos.x, b.pos.z, b.pos.y);
    if (b.grounded && hSpeed > 0.3) {
      const ahead = floorAt(world, b.pos.x + b.vel.x * 0.15, b.pos.z + b.vel.z * 0.15, b.pos.y);
      const climb = (ahead - g0) / (hSpeed * 0.15);
      if (climb > 0.8) {
        const f = Math.pow(THREE.MathUtils.clamp(1.6 - climb, 0.15, 1), dt * 60);
        b.vel.x *= f;
        b.vel.z *= f;
      }
    }

    // Jump: buffered presses, coyote time after leaving an edge.
    this.sinceGround = b.grounded ? 0 : this.sinceGround + dt;
    this.sincePress = input.jumpPressed ? 0 : this.sincePress + dt;
    const clearance = b.pos.y - g0;
    if (this.sincePress <= this.buffer && !this.jumping && this.sinceGround <= this.coyote) {
      b.vel.y = this.jumpSpeed + Math.min(1.2, hSpeed * 0.1);
      b.grounded = false;
      this.jumping = true;
      this.sincePress = 1;
      this.sinceGround = 1;
      b.events.push({ type: 'jump' });
    } else if (input.jumpPressed && !b.grounded && clearance > this.deployClearance) {
      return 'glide';
    }

    let g = this.gravity;
    if (b.vel.y < 0) g *= this.fallMul;
    else if (this.jumping && !input.jump) g *= this.cutMul;
    else if (this.jumping && b.vel.y < 1.5) g *= 0.6;
    if (!b.grounded || b.vel.y > 0) b.vel.y = Math.max(b.vel.y - g * dt, -this.maxFall);
    const vyBefore = b.vel.y;
    b.pos.addScaledVector(b.vel, dt);
    collide(b, world);

    // Stick to slopes up to ~58° when running downhill; steeper = airborne.
    const gh = floorAt(world, b.pos.x, b.pos.z, b.pos.y);
    const snap = b.grounded && b.vel.y <= 0 ? Math.max(0.05, hSpeed * dt * 1.6) : 0;
    if (b.pos.y <= gh || b.pos.y - gh < snap) {
      if (!b.grounded) b.events.push({ type: 'land', impact: Math.max(0, -vyBefore) });
      b.pos.y = gh;
      b.vel.y = 0;
      b.grounded = true;
      this.jumping = false;
    } else {
      b.grounded = false;
    }
    if (gh < world.waterLevel - 1.1 && b.pos.y < world.waterLevel - 0.9) return 'swim';
    return null;
  }
}

/**
 * Parachute (Palworld-style): Space in mid-air opens it, Space again drops.
 * Slow sink with forward drift along the facing, steered by input; Shift
 * spills air for a faster, steeper dive.
 */
export class GlideMode implements MovementMode {
  readonly name = 'glide';
  speed = 9;
  diveSpeed = 15;
  drift = 4;
  sink = 2.3;
  diveSink = 7;
  private t = 0;

  enter(b: Body) {
    this.t = 0;
    b.grounded = false;
    // The canopy catching: a little upward jolt when falling fast.
    if (b.vel.y < -4) b.vel.y = -4 + (b.vel.y + 4) * 0.25;
    b.events.push({ type: 'deploy' });
  }

  exit(b: Body) {
    b.events.push({ type: 'stow' });
  }

  update(b: Body, ctx: MoveContext): string | null {
    const { dt, world, input } = ctx;
    this.t += dt;
    if (input.jumpPressed && this.t > 0.15) return 'walk';
    const wish = wishDir(ctx, tmp);
    const dive = input.run;
    if (wish.lengthSq() > 0.0025) wish.multiplyScalar(dive ? this.diveSpeed : this.speed);
    else wish.set(Math.sin(b.heading), 0, Math.cos(b.heading)).multiplyScalar(this.drift);
    const kh = 1 - Math.exp(-1.6 * dt);
    b.vel.x += (wish.x - b.vel.x) * kh;
    b.vel.z += (wish.z - b.vel.z) * kh;
    turnToward(b, tmp.set(b.vel.x, 0, b.vel.z), 3.5, dt);
    const sink = dive ? -this.diveSink : -this.sink;
    b.vel.y += (sink - b.vel.y) * (1 - Math.exp(-(this.t < 0.6 ? 6 : 3) * dt));
    b.pos.addScaledVector(b.vel, dt);
    collide(b, world);

    const g = floorAt(world, b.pos.x, b.pos.z, b.pos.y);
    if (g < world.waterLevel - 1.1 && b.pos.y < world.waterLevel - 0.9) return 'swim';
    if (b.pos.y <= g) {
      b.events.push({ type: 'land', impact: -b.vel.y });
      b.pos.y = g;
      b.vel.y = 0;
      b.grounded = true;
      return 'walk';
    }
    return null;
  }
}

export class SwimMode implements MovementMode {
  readonly name = 'swim';
  speed = 2.2;
  fastSpeed = 3.8;
  /** How deep the body's feet float below the surface. */
  float = 1.15;
  private t = 0;

  enter(b: Body) {
    b.vel.y *= 0.2;
    b.grounded = false;
  }

  update(b: Body, ctx: MoveContext): string | null {
    const { dt, world } = ctx;
    this.t += dt;
    const wish = wishDir(ctx, tmp);
    const speed = ctx.input.run ? this.fastSpeed : this.speed;
    const k = 1 - Math.exp(-3 * dt);
    b.vel.x += (wish.x * speed - b.vel.x) * k;
    b.vel.z += (wish.z * speed - b.vel.z) * k;
    turnToward(b, wish, 5, dt);
    const targetY = world.waterLevel - this.float + Math.sin(this.t * 2.2) * 0.05;
    b.vel.y += (targetY - b.pos.y) * 6 * dt;
    b.vel.y *= Math.exp(-4 * dt);
    b.pos.addScaledVector(b.vel, dt);
    collide(b, world);
    const g = floorAt(world, b.pos.x, b.pos.z, b.pos.y);
    if (g > world.waterLevel - this.float + 0.05) {
      b.pos.y = Math.max(b.pos.y, g);
      return 'walk';
    }
    return null;
  }
}

/** Free flight (debug now; the basis for a later glider/bird mode). */
export class FlyMode implements MovementMode {
  readonly name = 'fly';
  speed = 22;
  fastSpeed = 90;

  enter(b: Body) {
    b.grounded = false;
    b.vel.y = Math.max(b.vel.y, 4);
  }

  update(b: Body, ctx: MoveContext): string | null {
    const { dt, world, input } = ctx;
    const speed = input.run ? this.fastSpeed : this.speed;
    const cp = Math.cos(ctx.camPitch);
    const sp = Math.sin(ctx.camPitch);
    const sy = Math.sin(ctx.camYaw);
    const cy = Math.cos(ctx.camYaw);
    // Forward follows the camera's look direction, including pitch.
    tmp.set(-sy * cp * input.y + cy * input.x, -sp * input.y + ((input.up ? 1 : 0) - (input.down ? 1 : 0)), -cy * cp * input.y - sy * input.x);
    if (tmp.lengthSq() > 1) tmp.normalize();
    const k = 1 - Math.exp(-3 * dt);
    b.vel.lerp(tmp.multiplyScalar(speed), k);
    turnToward(b, new THREE.Vector3(b.vel.x, 0, b.vel.z), 4, dt);
    b.pos.addScaledVector(b.vel, dt);
    const floor = Math.max(world.groundHeight(b.pos.x, b.pos.z), world.waterLevel) + 0.5;
    if (b.pos.y < floor) {
      b.pos.y = floor;
      b.vel.y = Math.max(0, b.vel.y);
    }
    const y0 = b.pos.y;
    world.landmarks?.(b.pos, b.vel, BODY_RADIUS);
    if (b.pos.y > y0) b.vel.y = Math.max(0, b.vel.y);
    return null;
  }
}

/**
 * Held by something else (a beacon spirit's arms): the body is placed from
 * outside each frame and nothing here moves it.
 */
export class CarriedMode implements MovementMode {
  readonly name = 'carried';
  enter(b: Body) { b.grounded = false; }
  update(): string | null { return null; }
}

/** How a mount moves. Speeds in m/s. */
export interface MountSpec {
  name: string;
  /** Collision footprint (m). */
  radius: number;
  /** Ground gait; without one the mount is always airborne. */
  walk?: { speed: number; sprint: number; takeoff: number };
  /**
   * Ground-only mounts (no `fly`): Space leaps this fast (m/s up), deep
   * water is swum at `swim` x speed, and it carves rather than strafes.
   */
  leap?: number;
  swim?: number;
  /** Seconds to build up to the sprint (a heavy animal gathers speed). */
  gather?: number;
  fly?: {
    speed: number;
    sprint: number;
    /** Climb / descend rate on Space / C. */
    climb: number;
    /** Sink rate with no vertical input (0 = holds altitude). */
    sink: number;
    /** Minimum clearance over ground or water. */
    hover: number;
    turn: number;
  };
}

/**
 * Riding a tamed mob. The Body is the mount's body (pos = its feet); the mob
 * mirrors it and the character rig sits in its saddle. Ground mounts run and
 * take off with Space (and land by touching down); fliers hover. Space climbs,
 * C/Q/Ctrl descends, Shift is the fast gait. Dismounting is up to the caller.
 */
export class RideMode implements MovementMode {
  readonly name = 'ride';
  spec: MountSpec | null = null;
  /** Ground-only mounts: speed along the heading, wetness (read by presentation). */
  readonly gallopState = new GallopState();
  private fp = new THREE.Vector3();

  enter(b: Body) {
    if (!this.spec?.walk) b.grounded = false;
    const f = Math.sin(b.heading) * b.vel.x + Math.cos(b.heading) * b.vel.z;
    this.gallopState.speed = f;
  }

  private gallop(b: Body, ctx: MoveContext, s: MountSpec): string | null {
    gallopUpdate(this.gallopState, b, ctx, s);
    return null;
  }

  update(b: Body, ctx: MoveContext): string | null {
    const s = this.spec;
    if (!s) return 'walk';
    if (!s.fly) return this.gallop(b, ctx, s);
    const { dt, world, input } = ctx;
    const wish = wishDir(ctx, tmp);
    const wishLen = wish.length();
    const floor = (feetY: number) => world.floorHeight ? world.floorHeight(b.pos.x, b.pos.z, feetY, s.radius) : world.groundHeight(b.pos.x, b.pos.z);

    if (b.grounded && s.walk) {
      const target = input.run ? s.walk.sprint : s.walk.speed;
      const k = 1 - Math.exp(-(wishLen < 0.05 ? 7 : 4.5) * dt);
      b.vel.x += (wish.x * target - b.vel.x) * k;
      b.vel.z += (wish.z * target - b.vel.z) * k;
      turnToward(b, wish, 7, dt);
      b.vel.y = 0;
      const hs = Math.hypot(b.vel.x, b.vel.z);
      b.pos.addScaledVector(b.vel, dt);
      world.collide?.(b.pos, b.vel, s.radius);
      const g = floor(b.pos.y);
      const wet = world.groundHeight(b.pos.x, b.pos.z) < world.waterLevel - 0.3;
      if (input.jumpPressed || wet) {
        // Take off: a big hop straight into flight.
        b.vel.y = s.walk.takeoff;
        b.grounded = false;
        b.events.push({ type: 'jump' });
      } else if (b.pos.y - g > Math.max(0.6, hs * dt * 1.6)) {
        b.grounded = false; // ran off a ledge: glide
      } else {
        b.pos.y = g;
      }
      return null;
    }

    // Flight.
    const f = s.fly;
    if (!f) return null;
    const speed = input.run ? f.sprint : f.speed;
    const kh = 1 - Math.exp(-(wishLen > 0.05 ? 2.2 : 0.9) * dt);
    b.vel.x += (wish.x * speed - b.vel.x) * kh;
    b.vel.z += (wish.z * speed - b.vel.z) * kh;
    const vy = input.up ? f.climb : input.down ? -f.climb * 1.3 : -f.sink;
    b.vel.y += (vy - b.vel.y) * (1 - Math.exp(-3 * dt));
    this.fp.set(b.vel.x, 0, b.vel.z);
    turnToward(b, this.fp.lengthSq() > 0.25 ? this.fp : wish, f.turn, dt);
    const vyBefore = b.vel.y;
    b.pos.addScaledVector(b.vel, dt);
    world.collide?.(b.pos, b.vel, s.radius);
    const g = floor(b.pos.y);
    const water = world.groundHeight(b.pos.x, b.pos.z) < world.waterLevel;
    if (s.walk && !water && b.pos.y <= g + 0.02 && vyBefore <= 0.5) {
      b.events.push({ type: 'land', impact: Math.max(0, -vyBefore) });
      b.pos.y = g;
      b.vel.y = 0;
      b.grounded = true;
      return null;
    }
    const min = Math.max(g, world.waterLevel) + (s.walk ? (water ? 0.35 : 0) : f.hover);
    if (b.pos.y < min) {
      b.pos.y += (min - b.pos.y) * Math.min(1, 12 * dt);
      if (b.pos.y < min - 0.5) b.pos.y = min - 0.5;
      b.vel.y = Math.max(0, b.vel.y);
    }
    b.pos.y = Math.min(b.pos.y, 900);
    b.grounded = false;
    return null;
  }
}

/**
 * A ground-only mount (the stelk): no sideways slip, the heading carves toward
 * where you steer, tighter at a walk than at a full gallop, and the speed
 * builds over a couple of seconds. Space leaps; running off a ledge falls.
 * Deep water is swum, slowly, the body low in it. Sub-stepped collision so a
 * gallop can't skip through a trunk.
 */
const GALLOP_GRAVITY = 25;
export class GallopState {
  /** Signed speed along the heading, m/s. */
  speed = 0;
  /** 0..1 how deep in water (0 = dry, 1 = swimming). */
  wet = 0;
}

export function gallopUpdate(st: GallopState, b: Body, ctx: MoveContext, s: MountSpec): void {
  const { dt, world, input } = ctx;
  const walk = s.walk!;
  const e = (r: number) => 1 - Math.exp(-r * dt);
  const wish = wishDir(ctx, tmp);
  const wl = Math.min(1, wish.length());
  const fx0 = Math.sin(b.heading), fz0 = Math.cos(b.heading);
  const ground = world.groundHeight(b.pos.x, b.pos.z);
  const swimY = world.waterLevel - 1.25;
  const deep = ground < swimY;
  st.wet += ((deep ? 1 : 0) - st.wet) * e(4);

  // Where the rider wants to go, relative to where the mount points.
  let target = 0;
  if (wl > 0.05) {
    let d = Math.atan2(wish.x, wish.z) - b.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const gait = input.run ? walk.sprint : input.walk ? walk.speed * 0.4 : walk.speed;
    // Ease off for sharp turns; a slow wheel round when it's behind.
    target = gait * wl * (0.25 + 0.75 * Math.max(0, Math.cos(d)) ** 2);
    if (deep) target = Math.min(target, walk.speed * (s.swim ?? 0.4));
    // Carving: quick on the spot, wide at a gallop.
    const hs = Math.abs(st.speed);
    const rate = b.grounded || deep ? 7.5 / (1 + hs * 0.11) : 0.8;
    b.heading += THREE.MathUtils.clamp(d, -1, 1) * rate * dt * (hs < 1.5 ? 1.4 : 1);
  }
  if (b.grounded || deep) {
    // Gathering speed takes a while; slowing is quicker.
    // Brisk up to the canter, then `gather` seconds on to the full gallop.
    const up = target > st.speed;
    const accel = up ? (st.speed < walk.speed ? 9 : (walk.sprint - walk.speed) / (s.gather ?? 2)) : wl < 0.05 ? 12 : 16;
    st.speed += THREE.MathUtils.clamp(target - st.speed, -accel * dt, accel * dt);
    // Uphill drags, downhill runs on a little.
    if (b.grounded) {
      const ahead = world.groundHeight(b.pos.x + fx0 * 1.2, b.pos.z + fz0 * 1.2);
      const climb = THREE.MathUtils.clamp((ahead - ground) / 1.2, -1, 1.5);
      if (climb > 0.35) st.speed *= Math.pow(THREE.MathUtils.clamp(1.25 - climb * 0.6, 0.3, 1), dt * 4);
    }
  }
  const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
  b.vel.x = fx * st.speed;
  b.vel.z = fz * st.speed;

  if (b.grounded && input.jumpPressed && !deep && s.leap) {
    b.vel.y = s.leap + Math.min(3, Math.abs(st.speed) * 0.08);
    b.grounded = false;
    b.events.push({ type: 'jump' });
  }
  if (!b.grounded && !deep) b.vel.y = Math.max(b.vel.y - GALLOP_GRAVITY * (b.vel.y < 0 ? 1.4 : 1) * dt, -45);

  // Sub-steps of at most 0.3 m, so a gallop can't skip through a trunk.
  const before = st.speed;
  const steps = Math.max(1, Math.min(40, Math.ceil((Math.abs(st.speed) * dt) / 0.3)));
  for (let i = 0; i < steps; i++) {
    b.pos.x += (b.vel.x * dt) / steps;
    b.pos.z += (b.vel.z * dt) / steps;
    world.collide?.(b.pos, b.vel, s.radius);
  }
  st.speed = b.vel.x * fx + b.vel.z * fz;
  const lost = Math.abs(before) - Math.abs(st.speed);
  if (lost > 4) b.events.push({ type: 'bump', impact: lost });
  const vyBefore = b.vel.y;
  b.pos.y += b.vel.y * dt;

  const g = world.floorHeight ? world.floorHeight(b.pos.x, b.pos.z, b.pos.y, s.radius) : world.groundHeight(b.pos.x, b.pos.z);
  if (world.groundHeight(b.pos.x, b.pos.z) < swimY) {
    // Swimming: bob along with the body low in the water.
    const was = b.grounded;
    b.pos.y += (swimY - b.pos.y) * e(was ? 6 : 3);
    if (!was && vyBefore < -3) b.events.push({ type: 'land', impact: -vyBefore });
    b.vel.y = 0;
    b.grounded = true;
    return;
  }
  const hs = Math.abs(st.speed);
  if (b.grounded) {
    if (b.pos.y - g > Math.max(0.5, hs * dt * 1.6)) {
      b.grounded = false; // ran off a ledge
      b.vel.y = 0;
    } else {
      b.pos.y = g;
      b.vel.y = 0;
    }
  } else if (b.pos.y <= g) {
    b.events.push({ type: 'land', impact: Math.max(0, -vyBefore) });
    b.pos.y = g;
    b.vel.y = 0;
    b.grounded = true;
  }
}

/**
 * A bicycle. The Body is the bike (pos = the ground midway between the
 * wheels). No sideways slip: velocity follows the heading, and the heading
 * turns only as fast as the speed allows (tight at a crawl, wide when fast),
 * so it carves instead of strafing. Pushing toward where you want to go
 * pedals up to a cruise; Shift stands on the pedals, Alt dawdles, pulling
 * back brakes (and then U-turns). Slopes pull the bike along, so it
 * freewheels downhill past the pedalling speed and stalls on steep climbs.
 * There's no top speed: only rolling resistance and a light air drag, so a
 * long steep descent keeps building (tens of m/s off a mountain).
 * Space bunny-hops; crests at speed throw it into the air. Water is a wall.
 * Boulders up to RAMP_RISE tall are ramps at speed: the bike rides up the
 * dome and is kicked off the top as fast as it was climbing. Space pressed
 * just before or just after the lip doubles the kick.
 * The bicycle's presentation reads speed/steer/lean/crank/effort off the mode.
 */
/** Boulders standing at most this far out of the ground are bike ramps (m). */
const RAMP_RISE = 2.2;
/** Below this speed a boulder is a wall, not a ramp. */
const RAMP_SPEED = 3;

export class BikeMode implements MovementMode {
  readonly name = 'bike';
  cruise = 10;
  sprint = 16;
  dawdle = 3.5;
  accel = 3.4;
  sprintAccel = 5.2;
  brake = 10;
  /** No input at pedalling speeds: ease off to a stop. Faster than that you freewheel. */
  idleBrake = 2.6;
  roll = 0.25;
  /** Air drag (per v^2): terminal speed is ~75 m/s on a 30 degree slope. */
  drag = 0.0008;
  hop = 5.4;
  gravity = 25;
  wheelbase = 1.0;
  /** Wheel radius (m) and pedal-to-wheel gearing, for the crank. */
  wheelR = 0.315;
  gear = 2.3;
  /** Collision circles at the front and back wheels. */
  radius = 0.3;

  /** Signed speed along the heading, m/s. */
  speed = 0;
  yawRate = 0;
  /** Handlebar angle (rad, + = left) and lean (rad, + = toward the left). */
  steer = 0;
  lean = 0;
  /** Crank angle (rad); it only turns while pedalling (freewheel). */
  crank = 0;
  /** 0..1 how hard the rider pedals, and how much they stand on the pedals. */
  effort = 0;
  standing = 0;
  private fwd = new THREE.Vector3();
  private prev = new THREE.Vector3();
  /** Vertical speed of the ground under the wheels (for launches off crests). */
  private groundVy = 0;
  /** Fastest climb on the current ramp (decays), and time before another kick. */
  private rampVy = 0;
  private kickCool = 0;
  /** Space pressed on a ramp, waiting for the lip (s left); after a kick, the late window (s left). */
  private armed = 0;
  private late = 0;
  private lastKick = 0;
  /** Last ramp kick (for probes). */
  debugKick: { speed: number; perfect: boolean; rise: number; rampVy: number } | null = null;
  /** Timing window either side of the lip (s). */
  perfectWindow = 0.16;
  /** Leg cadence cap (rad/s): past this the gearing does the work. */
  maxCadence = 15;

  enter(b: Body) {
    this.fwd.set(Math.sin(b.heading), 0, Math.cos(b.heading));
    this.speed = b.vel.x * this.fwd.x + b.vel.z * this.fwd.z;
    this.yawRate = this.groundVy = this.rampVy = this.armed = this.late = 0;
    this.effort = this.standing = 0;
    b.vel.y = 0;
  }

  update(b: Body, ctx: MoveContext): string | null {
    const { dt, world, input } = ctx;
    const e = (r: number) => 1 - Math.exp(-r * dt);
    const wish = wishDir(ctx, tmp);
    const wl = Math.min(1, wish.length());

    // Where the rider wants to go, relative to where the bike points.
    let d = 0;
    let target = 0;
    let braking = false;
    if (wl > 0.05) {
      d = Math.atan2(wish.x, wish.z) - b.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const back = Math.abs(d) > 2.0;
      if (back && this.speed > 2.5) {
        braking = true;
        d = 0;
      } else {
        const gait = input.run ? this.sprint : input.walk ? this.dawdle : this.cruise;
        // Ease off into sharp turns; a slow U-turn when it's behind you.
        target = gait * wl * (back ? 0.3 : 0.55 + 0.45 * Math.max(0, Math.cos(d)));
      }
    }

    // Steering: a turn radius that widens with speed, plus a little pivot at
    // a standstill so you can line up a start.
    const s = Math.abs(this.speed);
    // The radius grows with speed squared, so it stays steerable at 60 m/s.
    const maxYaw = Math.max(s / (1.7 + s * 0.22 + s * s * 0.012), 1.3 * (1 - Math.min(1, s / 2.5)));
    const yawT = THREE.MathUtils.clamp(d * 3.2, -maxYaw, maxYaw) * (b.grounded ? 1 : 0.35);
    this.yawRate += (yawT - this.yawRate) * e(b.grounded ? 9 : 3);
    b.heading += this.yawRate * dt;
    const fx = Math.sin(b.heading);
    const fz = Math.cos(b.heading);
    this.fwd.set(fx, 0, fz);

    // At speed, low boulders are ramps: part of the floor, not walls.
    const rampy = s > RAMP_SPEED;
    const floor = (x: number, z: number, feetY: number) => {
      const f = floorAt(world, x, z, feetY);
      return rampy && world.ramp ? Math.max(f, world.ramp(x, z, 0.15, RAMP_RISE)) : f;
    };
    this.kickCool -= dt;

    let pushing = false;
    let spinning = false;
    let climb = 0;
    if (b.grounded) {
      // Gravity along the slope between the wheel contacts.
      const half = this.wheelbase / 2;
      const hf = floor(b.pos.x + fx * half, b.pos.z + fz * half, b.pos.y + 0.3);
      const hr = floor(b.pos.x - fx * half, b.pos.z - fz * half, b.pos.y + 0.3);
      climb = THREE.MathUtils.clamp((hf - hr) / this.wheelbase, -3, 3);
      let drive = (-9.8 * climb) / Math.sqrt(1 + climb * climb);
      // Pedal toward the target speed, easing in so it holds it smoothly
      // instead of overshooting and cutting out. Legs keep turning whenever
      // you're asking to go (freewheel only when you let go).
      spinning = target > 0;
      if (target > 0 && this.speed < target) {
        const push = Math.min(1, (target - this.speed) / 1.5);
        drive += (input.run ? this.sprintAccel : this.accel) * push + (this.roll + this.drag * this.speed * this.speed) * Math.min(1, push * 4);
        pushing = push > 0.05;
      }
      // Resistance only ever slows the bike, never reverses it.
      const resist = (braking ? this.brake : 0) + (wl < 0.05 && Math.abs(this.speed) < this.cruise ? this.idleBrake : 0) + this.roll + this.drag * this.speed * this.speed;
      this.speed += drive * dt;
      this.speed = Math.sign(this.speed) * Math.max(0, Math.abs(this.speed) - resist * dt);
      this.speed = Math.max(this.speed, -4);
      b.vel.set(fx * this.speed, 0, fz * this.speed);

      // Space on the way up a ramp waits for the lip (that's the timed
      // kick); anywhere else it's a hop. A press that finds no lip in time
      // still hops.
      const onRamp = this.rampVy > 2 && this.kickCool <= 0;
      if (input.jumpPressed && onRamp) this.armed = this.perfectWindow;
      else if (input.jumpPressed || (this.armed > 0 && this.armed - dt <= 0)) this.hopNow(b);
    }
    this.armed = Math.max(0, this.armed - dt);
    if (!b.grounded && this.late > 0) {
      this.late -= dt;
      if (input.jumpPressed) {
        // Late but in time: the double kick.
        b.vel.y = Math.max(b.vel.y, 0) + this.lastKick;
        this.late = 0;
        b.events.push({ type: 'kick', speed: this.lastKick * 2, perfect: true });
      }
    }

    // Presentation state.
    this.effort += ((spinning ? (pushing ? (input.run ? 1 : 0.6) : 0.25) : 0) - this.effort) * e(6);
    const stand = pushing && (input.run || climb > 0.14) ? 1 : 0;
    this.standing += (stand - this.standing) * e(stand ? 5 : 3);
    if (spinning && b.grounded) this.crank += Math.min(this.maxCadence, Math.max(this.speed, 1.4) / (this.wheelR * this.gear)) * dt;
    const leanT = THREE.MathUtils.clamp(Math.atan((this.speed * this.yawRate) / 9.8), -0.75, 0.75);
    this.lean += (leanT - this.lean) * e(b.grounded ? 7 : 3);
    const steerT = THREE.MathUtils.clamp(Math.atan((this.yawRate * this.wheelbase) / Math.max(0.8, s)), -0.8, 0.8);
    this.steer += (steerT - this.steer) * e(12);

    if (!b.grounded) {
      // Ballistic: the bike can yaw a little in the air, but its path can't.
      b.vel.y = Math.max(b.vel.y - this.gravity * (b.vel.y < 0 ? 1.3 : 1) * dt, -45);
    }

    this.prev.copy(b.pos);
    // Sub-steps of at most 0.25 m, so a fast bike can't skip through a trunk.
    const steps = Math.min(40, Math.ceil((Math.hypot(b.vel.x, b.vel.z) * dt) / 0.25));
    const before = this.speed;
    for (let i = 0; i < steps; i++) {
      b.pos.addScaledVector(b.vel, dt / steps);
      this.collide(b, world, before, rampy ? RAMP_RISE : 0);
    }
    if (!steps) b.pos.y += b.vel.y * dt;

    // Water stops you at the shore (dismount to swim).
    const dir = Math.sign(this.speed) || 1;
    if (b.grounded && world.groundHeight(b.pos.x + fx * 0.6 * dir, b.pos.z + fz * 0.6 * dir) < world.waterLevel - 0.25) {
      b.pos.x = this.prev.x;
      b.pos.z = this.prev.z;
      this.speed = 0;
      b.vel.set(0, 0, 0);
    }

    const g = floor(b.pos.x, b.pos.z, b.pos.y);
    if (b.grounded) {
      if (b.pos.y - g > Math.max(0.08, s * dt * 1.3)) {
        // The ground fell away (a crest or a ledge): launch along it.
        b.grounded = false;
        b.vel.y = Math.max(0, this.groundVy);
      } else {
        // A boulder's lip is near vertical: don't let one frame's step read
        // as a rocket.
        const vy = Math.min((g - this.prev.y) / dt, s * 1.3 + 1);
        this.groundVy += (vy - this.groundVy) * e(20);
        b.pos.y = g;
        const rise = g - world.groundHeight(b.pos.x, b.pos.z);
        if (rise > 0.08) this.rampVy = Math.max(this.rampVy * Math.exp(-2 * dt), this.groundVy);
        else this.rampVy *= Math.exp(-10 * dt);
        // Over the top of a ramp: kicked off it as fast as you were climbing,
        // scaled down for pebbles. Space in the window doubles it.
        if (rise > 0.15 && this.rampVy > 2 && this.groundVy < this.rampVy * 0.3 && this.kickCool <= 0) {
          // At least 45% of the ground speed, so faster approaches fly further.
          const kick = Math.max(Math.min(this.rampVy, s * 1.1), s * 0.45) * Math.min(1.3, rise / 0.9);
          if (kick > 1.5) {
            const perfect = this.armed > 0;
            b.vel.y = perfect ? kick * 2 : kick;
            b.grounded = false;
            this.lastKick = kick;
            this.late = perfect ? 0 : this.perfectWindow;
            this.armed = 0;
            this.kickCool = 0.6;
            this.rampVy = 0;
            b.events.push({ type: 'kick', speed: b.vel.y, perfect });
            this.debugKick = { speed: b.vel.y, perfect, rise, rampVy: kick };
          }
        }
      }
    } else if (b.pos.y <= g) {
      b.events.push({ type: 'land', impact: Math.max(0, -b.vel.y) });
      b.pos.y = g;
      b.vel.y = 0;
      b.grounded = true;
      this.speed = b.vel.x * fx + b.vel.z * fz;
      this.groundVy = this.rampVy = 0;
      this.late = 0;
    }
    if (g < world.waterLevel - 1.1 && b.pos.y < world.waterLevel - 0.9) return 'swim';
    return null;
  }

  private hopNow(b: Body) {
    b.vel.y = this.hop + Math.max(0, this.groundVy) * 0.5;
    b.grounded = false;
    this.armed = 0;
    b.events.push({ type: 'jump' });
  }

  /** Two circles, one per wheel, so the front wheel can't poke into a trunk. */
  private collide(b: Body, world: WorldQuery, before: number, rampMax: number) {
    if (!world.collide) return;
    const off = this.wheelbase * 0.35;
    for (const k of [off, -off]) {
      tmp.set(b.pos.x + this.fwd.x * k, b.pos.y, b.pos.z + this.fwd.z * k);
      const x = tmp.x, z = tmp.z;
      world.collide(tmp, b.vel, this.radius, rampMax);
      b.pos.x += tmp.x - x;
      b.pos.z += tmp.z - z;
    }
    if (!b.grounded) return;
    this.speed = b.vel.x * this.fwd.x + b.vel.z * this.fwd.z;
    const lost = Math.abs(before) - Math.abs(this.speed);
    if (lost > 3.5 && !b.events.some((ev) => ev.type === 'bump')) b.events.push({ type: 'bump', impact: lost });
  }
}

export class MovementController {
  private modes = new Map<string, MovementMode>();
  current: MovementMode;
  readonly body: Body = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), heading: 0, grounded: false, events: [] };

  constructor(modes: MovementMode[], initial: string) {
    for (const m of modes) this.modes.set(m.name, m);
    this.current = this.modes.get(initial)!;
  }

  register(mode: MovementMode) {
    this.modes.set(mode.name, mode);
  }

  set(name: string, ctx: MoveContext) {
    const next = this.modes.get(name);
    if (!next || next === this.current) return;
    this.current.exit?.(this.body);
    this.current = next;
    next.enter?.(this.body, ctx);
  }

  update(ctx: MoveContext) {
    this.body.events.length = 0;
    const next = this.current.update(this.body, ctx);
    if (next) this.set(next, ctx);
  }
}
