import * as THREE from 'three';
import type { InputState } from './input';

// Movement is a small state machine of interchangeable modes. Each mode owns
// how a Body moves for one kind of locomotion and can request a transition.
// Adding boating or gliding = implement MovementMode + register it; nothing
// else (camera, character rig, input) needs to change.

export interface WorldQuery {
  groundHeight(x: number, z: number): number;
  waterLevel: number;
}

export interface Body {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  /** Facing, radians; 0 = +z. */
  heading: number;
  grounded: boolean;
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

export class WalkMode implements MovementMode {
  readonly name = 'walk';
  walkSpeed = 3.4;
  runSpeed = 8;
  jumpSpeed = 7;
  gravity = 22;

  update(b: Body, ctx: MoveContext): string | null {
    const { dt, world } = ctx;
    const wish = wishDir(ctx, tmp);
    const speed = ctx.input.run ? this.runSpeed : this.walkSpeed;
    const accel = b.grounded ? 10 : 2.5;
    const k = 1 - Math.exp(-accel * dt);
    b.vel.x += (wish.x * speed - b.vel.x) * k;
    b.vel.z += (wish.z * speed - b.vel.z) * k;
    turnToward(b, wish, 10, dt);

    // Slow down when climbing steep ground.
    const g0 = world.groundHeight(b.pos.x, b.pos.z);
    const ahead = world.groundHeight(b.pos.x + b.vel.x * 0.15, b.pos.z + b.vel.z * 0.15);
    const climb = (ahead - g0) / Math.max(0.05, Math.hypot(b.vel.x, b.vel.z) * 0.15);
    if (climb > 0.8) {
      const f = THREE.MathUtils.clamp(1.6 - climb, 0.15, 1);
      b.vel.x *= f;
      b.vel.z *= f;
    }

    if (b.grounded && ctx.input.jump) {
      b.vel.y = this.jumpSpeed;
      b.grounded = false;
    }
    b.vel.y -= this.gravity * dt;
    b.pos.addScaledVector(b.vel, dt);

    const g = world.groundHeight(b.pos.x, b.pos.z);
    if (b.pos.y <= g || (b.grounded && b.vel.y <= 0 && b.pos.y - g < 0.4)) {
      b.pos.y = g;
      b.vel.y = 0;
      b.grounded = true;
    } else {
      b.grounded = false;
    }
    if (g < world.waterLevel - 1.1 && b.pos.y < world.waterLevel - 0.9) return 'swim';
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
    const g = world.groundHeight(b.pos.x, b.pos.z);
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
    return null;
  }
}

export class MovementController {
  private modes = new Map<string, MovementMode>();
  current: MovementMode;
  readonly body: Body = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), heading: 0, grounded: false };

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
    const next = this.current.update(this.body, ctx);
    if (next) this.set(next, ctx);
  }
}
