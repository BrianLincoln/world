import * as THREE from 'three';

// Third-person orbit camera, independent of movement: it only needs a focus
// point each frame. Narrow FOV for the flattened, painterly perspective of
// the references.

export class OrbitCamera {
  yaw = 0.6;
  /** Positive = camera above the target, looking down. */
  pitch = 0.18;
  distance = 10;
  targetDistance = 10;
  minDistance = 3;
  maxDistance = 80;
  readonly target = new THREE.Vector3();
  private initialized = false;

  constructor(public camera: THREE.PerspectiveCamera) {}

  addLook(dx: number, dy: number) {
    this.yaw -= dx * 0.0024;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0022, -0.45, 1.35);
  }

  zoom(delta: number) {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance * Math.exp(delta * 0.001), this.minDistance, this.maxDistance);
  }

  snap() {
    this.initialized = false;
  }

  update(focus: THREE.Vector3, dt: number, floorAt: (x: number, z: number) => number) {
    if (!this.initialized) {
      this.target.copy(focus);
      this.distance = this.targetDistance;
      this.initialized = true;
    }
    this.target.lerp(focus, 1 - Math.exp(-12 * dt));
    this.distance += (this.targetDistance - this.distance) * (1 - Math.exp(-8 * dt));
    const cp = Math.cos(this.pitch);
    const c = this.camera.position;
    c.set(
      this.target.x + Math.sin(this.yaw) * cp * this.distance,
      this.target.y + Math.sin(this.pitch) * this.distance,
      this.target.z + Math.cos(this.yaw) * cp * this.distance,
    );
    const floor = floorAt(c.x, c.z) + 0.6;
    if (c.y < floor) c.y = floor;
    this.camera.lookAt(this.target.x, this.target.y + 0.3, this.target.z);
    this.camera.updateMatrixWorld();
  }
}
