import * as THREE from 'three';

// Third-person orbit camera, independent of movement: it only needs a focus
// point each frame plus a few presentation hints (see CameraHints). Narrow
// FOV for the flattened, painterly perspective of the references.
//
// Feel, in the usual third-person vocabulary:
// - FOV kick + pull-back at speed (sprint, dive, glide) sells velocity
//   without moving the character on screen much.
// - Vertical follow is soft while airborne, so a jump reads as the explorer
//   leaving the ground rather than the whole world dropping.
// - A damped spring "dip" on hard landings gives weight.
// - Slight look-ahead along velocity shows more of where you're heading.
// - Looking up: below ORBIT_MIN_PITCH the orbit stops (it would only dig
//   into the ground) and the view tilts up from a low, slightly closer
//   camera instead, so the sky and flying creatures stay reachable.

export interface CameraHints {
  /** Extra degrees of FOV. */
  fovKick: number;
  /** Multiplier on the zoom distance. */
  distScale: number;
  /** Feet off the ground (jump/fall/glide): vertical follow goes soft. */
  airborne: boolean;
  /** Planar velocity for look-ahead. */
  velX: number;
  velZ: number;
}

/** Lowest orbit angle; more negative pitch becomes an upward view tilt. */
const ORBIT_MIN_PITCH = -0.22;
const MIN_PITCH = -1.4;
const MAX_PITCH = 1.35;

const NO_HINTS: CameraHints = { fovKick: 0, distScale: 1, airborne: false, velX: 0, velZ: 0 };

export class OrbitCamera {
  yaw = 0.6;
  /** Positive = camera above the target, looking down. */
  pitch = 0.18;
  distance = 10;
  targetDistance = 10;
  minDistance = 3;
  maxDistance = 80;
  baseFov: number;
  readonly target = new THREE.Vector3();
  private initialized = false;
  private fovKick = 0;
  private distScale = 1;
  private followY = 0;
  private dip = 0;
  private dipVel = 0;
  private lead = new THREE.Vector2();

  constructor(public camera: THREE.PerspectiveCamera) {
    this.baseFov = camera.fov;
  }

  addLook(dx: number, dy: number) {
    this.yaw -= dx * 0.0024;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0022, MIN_PITCH, MAX_PITCH);
  }

  zoom(delta: number) {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance * Math.exp(delta * 0.001), this.minDistance, this.maxDistance);
  }

  /** Kick the camera down (landing weight). `amount` in metres of initial velocity-ish. */
  bump(amount: number) {
    this.dipVel -= amount;
  }

  snap() {
    this.initialized = false;
  }

  update(focus: THREE.Vector3, dt: number, floorAt: (x: number, z: number) => number, hints: CameraHints = NO_HINTS) {
    if (!this.initialized) {
      this.target.copy(focus);
      this.followY = focus.y;
      this.distance = this.targetDistance;
      this.distScale = hints.distScale;
      this.fovKick = hints.fovKick;
      this.dip = this.dipVel = 0;
      this.lead.set(0, 0);
      this.initialized = true;
    }
    const e = (rate: number) => 1 - Math.exp(-rate * dt);

    // Horizontal follow is tight; vertical is soft in the air unless the
    // focus drops well below (a real fall), when it catches up quickly.
    this.target.x += (focus.x - this.target.x) * e(12);
    this.target.z += (focus.z - this.target.z) * e(12);
    const below = this.followY - focus.y;
    const yRate = !hints.airborne ? 10 : below > 1.5 ? 6 : 2.2;
    this.followY += (focus.y - this.followY) * e(yRate);
    // Never let the explorer leave the frame vertically.
    this.followY = THREE.MathUtils.clamp(this.followY, focus.y - 3, focus.y + 2.5);
    this.target.y = this.followY;

    const leadMax = 2.2;
    const lx = THREE.MathUtils.clamp(hints.velX * 0.16, -leadMax, leadMax);
    const lz = THREE.MathUtils.clamp(hints.velZ * 0.16, -leadMax, leadMax);
    this.lead.x += (lx - this.lead.x) * e(2.5);
    this.lead.y += (lz - this.lead.y) * e(2.5);

    // Speed feel eases in slowly and out a bit faster.
    this.fovKick += (hints.fovKick - this.fovKick) * e(hints.fovKick > this.fovKick ? 2.5 : 4);
    this.distScale += (hints.distScale - this.distScale) * e(hints.distScale > this.distScale ? 1.8 : 3);
    const fov = this.baseFov + this.fovKick;
    if (Math.abs(this.camera.fov - fov) > 1e-3) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    // Underdamped spring for the landing dip.
    this.dipVel += (-170 * this.dip - 15 * this.dipVel) * dt;
    this.dip += this.dipVel * dt;

    this.distance += (this.targetDistance - this.distance) * e(8);
    // Pitch below the orbit floor tilts the view up instead; ease the camera
    // in a little as it does so the explorer stays framed low in the shot.
    const orbitPitch = Math.max(this.pitch, ORBIT_MIN_PITCH);
    const lookUp = orbitPitch - this.pitch;
    const upK = lookUp / (ORBIT_MIN_PITCH - MIN_PITCH);
    const dist = this.distance * this.distScale * (1 - 0.3 * upK * (2 - upK));
    const cp = Math.cos(orbitPitch);
    const tx = this.target.x + this.lead.x;
    const tz = this.target.z + this.lead.y;
    const c = this.camera.position;
    c.set(
      tx + Math.sin(this.yaw) * cp * dist,
      this.target.y + Math.sin(orbitPitch) * dist + this.dip,
      tz + Math.cos(this.yaw) * cp * dist,
    );
    const floor = floorAt(c.x, c.z) + 0.6;
    if (c.y < floor) c.y = floor;
    const ay = this.target.y + 0.3 + this.dip * 0.6;
    if (lookUp > 0) {
      // Rotate the aim direction up by lookUp about the horizontal axis.
      const dx = tx - c.x, dy = ay - c.y, dz = tz - c.z;
      const h = Math.max(1e-4, Math.hypot(dx, dz));
      const elev = Math.min(Math.atan2(dy, h) + lookUp, 1.45);
      const ch = Math.cos(elev) / h;
      this.camera.lookAt(c.x + dx * ch, c.y + Math.sin(elev), c.z + dz * ch);
    } else {
      this.camera.lookAt(tx, ay, tz);
    }
    this.camera.updateMatrixWorld();
  }
}
