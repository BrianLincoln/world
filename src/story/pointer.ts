import * as THREE from 'three';
import type { Guide } from './story';
import { OCCLUDE, OVERLAY_U, overlayMat } from './overlay';

// The far-off pointer: wander well away from the task (you can still hear
// the spirit calling, but not see it) and a short run of glowing chevrons
// shows the way. They lie nearly flat in the air at the explorer's waist,
// a little way out on the side the task is on, pointing at it in the world
// (not turned on the screen): ahead of you they point away into the
// picture, and a pulse runs out along them toward the task. They're a
// thing in the world (the overlay scene, which has real transparency):
// they pass behind the explorer, and anything else solid, rather than
// showing through. They fade in only after you've been away a good while
// (DELAY), and out again as you come close.

/** The quad's size on its own plane (m, as floats for the shaders): the chevrons and room for their glow. */
const LEN = '1.9', WID = '1.2';

const VERT = /* glsl */ `
uniform vec3 uCenter;
uniform vec3 uAlong;
uniform vec3 uAcross;
out vec2 vQ;
out float vDepth;
void main() {
  // Metres on its own plane: x along the way it points, y across.
  vQ = position.xy * vec2(${LEN}, ${WID});
  vec4 vp = viewMatrix * vec4(uCenter + uAlong * vQ.x + uAcross * vQ.y, 1.0);
  vDepth = -vp.z;
  gl_Position = projectionMatrix * vp;
}
`;

const FRAG = /* glsl */ `
precision highp float;
${OCCLUDE}
uniform float uAlpha;
uniform float uTime;
in vec2 vQ;
in float vDepth;
out vec4 fragColor;
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
void main() {
  vec2 q = vec2(vQ.x, abs(vQ.y));
  float core = 0.0, glow = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float d = seg(q - vec2((fi - 1.0) * 0.42, 0.0), vec2(-0.16, 0.34), vec2(0.16, 0.0));
    // A pulse running out along them, toward the task; the ones nearer the explorer are fainter.
    float k = (0.6 + 0.2 * fi) * (0.72 + 0.28 * sin(uTime * 3.4 - fi * 1.25));
    // A soft-edged stroke and a dim halo close round it (wider, and the three run into one smudge).
    core = max(core, k * (1.0 - smoothstep(0.035, 0.07, d)));
    glow = max(glow, k * exp(-d * d / 0.009));
  }
  vec2 e = abs(vQ) / vec2(${LEN}, ${WID}) * 2.0;
  glow *= smoothstep(1.0, 0.7, max(e.x, e.y));
  vec3 col = mix(vec3(1.0, 0.5, 0.13), vec3(1.0, 0.68, 0.32), core);
  float a = max(core, glow * 0.45) * uAlpha * occlusion(vDepth);
  if (a < 0.004) discard;
  fragColor = vec4(col, a);
}
`;

/** How far out from the explorer its middle is (m), and its height off their feet (their waist). */
const RING = 2.3;
const WAIST = 0.6;
/** The least it clears the ground (m): on a slope it would run into the hill. */
const CLEAR = 0.3;
/**
 * How far its plane leans from flat toward the camera (0: flat, like paint
 * on a table; 1: halfway to facing you). Flat, a low camera sees a sliver.
 */
const LEAN = 0.6;
/** The size it's drawn at holds between these many px to the metre, however near or far the camera is. */
const MIN_PPM = 75, MAX_PPM = 150;
/**
 * Seconds away from the task before it shows: stepping off for a look
 * round isn't nagged.
 */
const DELAY = 15;
/** Its highest opacity: a hint, not a waypoint marker. */
const MAX_A = 0.6;

export class Pointer {
  private mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private a = 0;
  private awayT = 0;
  /** The way it points, in the world (rad, atan2(z, x)); NaN: not yet shown. */
  private ang = NaN;
  private n = new THREE.Vector3();

  /** `overlay`: the scene drawn over the finished frame; `ground`: the land's height. */
  constructor(private overlay: THREE.Object3D, private ground: (x: number, z: number) => number) {
    this.mat = overlayMat(VERT, FRAG, {
      uCenter: { value: new THREE.Vector3() }, uAlong: { value: new THREE.Vector3(1, 0, 0) }, uAcross: { value: new THREE.Vector3(0, 0, 1) }, uAlpha: { value: 0 },
    });
    // Behind something solid it's gone, not ghosted.
    this.mat.uniforms.uThrough.value = 0;
    this.mat.side = THREE.DoubleSide;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    overlay.add(this.mesh);
  }

  /** `g`: the task (null: nothing to point at); `show`: false while a cutscene or the tower view has the screen. */
  update(dt: number, camera: THREE.PerspectiveCamera, player: THREE.Vector3, g: Guide | null, show: boolean) {
    const dist = g ? Math.hypot(g.at.x - player.x, g.at.z - player.z) : 0;
    this.awayT = g && dist > g.near ? this.awayT + dt : 0;
    const want = show && g && this.awayT > DELAY ? MAX_A * THREE.MathUtils.smoothstep(dist, g.near, g.near + 25) : 0;
    this.a += (want - this.a) * (1 - Math.exp(-(want > this.a ? 1.5 : 4) * dt));
    if (this.a < 0.01 || !g) {
      this.mesh.visible = false;
      this.ang = NaN;
      return;
    }

    const ang = Math.atan2(g.at.z - player.z, g.at.x - player.x);
    if (Number.isNaN(this.ang)) this.ang = ang;
    this.ang += Math.atan2(Math.sin(ang - this.ang), Math.cos(ang - this.ang)) * (1 - Math.exp(-6 * dt));
    const dx = Math.cos(this.ang), dz = Math.sin(this.ang);

    const u = this.mat.uniforms;
    const c = u.uCenter.value as THREE.Vector3;
    c.set(player.x + dx * RING, 0, player.z + dz * RING);
    c.y = Math.max(player.y + WAIST, this.ground(c.x, c.z) + CLEAR);
    // Its plane: flat, leant a little toward the camera so it's never seen edge on.
    const n = this.n.copy(camera.position).sub(c);
    const depth = n.length();
    if (depth < 1e-3) { this.mesh.visible = false; return; }
    n.multiplyScalar(LEAN / depth).y += 1;
    n.normalize();
    // The way to the task, laid onto that plane, and across it.
    const along = u.uAlong.value as THREE.Vector3, across = u.uAcross.value as THREE.Vector3;
    along.set(dx, 0, dz).addScaledVector(n, -(dx * n.x + dz * n.z)).normalize();
    across.crossVectors(n, along);
    // Its true size, within reason: not huge with the camera in close, not a speck from far back.
    const ppm = OVERLAY_U.uRes.value.y / Math.max(1, window.devicePixelRatio) * 0.5 * camera.projectionMatrix.elements[5] / depth;
    const k = THREE.MathUtils.clamp(1, MIN_PPM / ppm, MAX_PPM / ppm);
    along.multiplyScalar(k);
    across.multiplyScalar(k);
    u.uAlpha.value = this.a;
    this.mesh.visible = true;
  }

  dispose() {
    this.overlay.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
