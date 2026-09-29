import * as THREE from 'three';
import type { Tower } from '../world/towers';
import { OCCLUDE, overlayMat } from './overlay';

// What you see from inside a lit tower's head (the tower camera): the other
// towers in sight, drawn over the finished frame so fog and night can't hide
// them. Every tower in view is a dark silhouette of its stack; a lit one's
// eyes blaze with a big warm glow, an unlit one's eyes are two dim embers,
// so you can tell at a glance where you can go and where to go next. The one
// you're aimed at glows brighter still, with a pulsing ring.

/** Silhouette body colour: a deep plum, like the far layers at dusk. */
const SIL = new THREE.Color('#3b2a36');
const MAX = 64;

const SIL_VERT = /* glsl */ `
out float vDepth;
out float vA;
in float aAlpha;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec4 vp = viewMatrix * wp;
  vDepth = -vp.z;
  vA = aAlpha;
  gl_Position = projectionMatrix * vp;
}
`;

const SIL_FRAG = /* glsl */ `
precision highp float;
${OCCLUDE}
uniform vec3 uColor;
in float vDepth;
in float vA;
out vec4 fragColor;
void main() {
  float a = vA * occlusion(vDepth);
  if (a < 0.01) discard;
  fragColor = vec4(uColor, a);
}
`;

const EYE_VERT = /* glsl */ `
in vec3 aPos;
in vec4 aK;
uniform vec2 uRes;
out vec2 vUv;
out float vDepth;
flat out vec4 vK;
void main() {
  vec4 vc = viewMatrix * vec4(aPos, 1.0);
  vDepth = -vc.z;
  vec4 c = projectionMatrix * vc;
  c.xy += (position.xy * 2.0 - vec2(1.0, 0.0)) * aK.w / uRes * 2.0 * c.w;
  vUv = position.xy * 2.0 - vec2(1.0, 0.0);
  vK = aK;
  gl_Position = c;
}
`;

// aK: x = lit (0..1), y = aimed (0..1), z = alpha, w = half size in pixels.
const EYE_FRAG = /* glsl */ `
precision highp float;
${OCCLUDE}
uniform float uTime;
in vec2 vUv;
in float vDepth;
flat in vec4 vK;
out vec4 fragColor;
float eye(vec2 p, float x) {
  vec2 q = abs(p - vec2(x, 0.02)) / vec2(0.1, 0.24);
  float r = pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25);
  return 1.0 - smoothstep(0.8, 1.0, r);
}
void main() {
  float lit = vK.x, aim = vK.y;
  vec2 p = vUv;
  float r = length(p);
  float eyes = max(eye(p, -0.2), eye(p, 0.2));
  vec3 ember = vec3(1.0, 0.6, 0.27), core = vec3(1.0, 0.86, 0.55);
  float pulse = 0.5 + 0.5 * sin(uTime * 4.0);
  // Lit: a big soft glow round white-hot eyes. Unlit: two dim embers.
  float halo = lit * (exp(-r * r * 5.0) * (0.55 + 0.35 * aim) + 0.25 * exp(-r * r * 1.6) * aim);
  float ring = aim * (1.0 - smoothstep(0.02, 0.06, abs(r - 0.78 - 0.06 * pulse))) * 0.9;
  vec3 eyeCol = mix(vec3(0.42, 0.2, 0.12), mix(core, vec3(1.0, 0.97, 0.88), aim), lit);
  float eyeA = eyes * mix(0.75, 1.0, lit);
  vec3 col = mix(ember, core, clamp(halo, 0.0, 1.0));
  float a = max(max(halo, ring), eyeA);
  col = mix(col, eyeCol, eyeA);
  col = mix(col, core, ring * (1.0 - eyeA));
  a *= vK.z * max(occlusion(vDepth), lit * 0.7);
  if (a < 0.01) discard;
  fragColor = vec4(col, a);
}
`;

export interface ViewTower { t: Tower; lit: boolean; aimed: number; alpha: number }

export class TowerView {
  readonly group = new THREE.Group();
  private sil: THREE.InstancedMesh[];
  private silA: THREE.InstancedBufferAttribute[];
  private eyes: THREE.Mesh;
  private eyeGeo = new THREE.InstancedBufferGeometry();
  private aPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
  private aK = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private sc = new THREE.Vector3();

  /** `shapes`: the three boulder meshes, then the head mesh (low detail is plenty). */
  constructor(shapes: THREE.BufferGeometry[]) {
    const mat = overlayMat(SIL_VERT, SIL_FRAG, { uColor: { value: SIL } });
    mat.uniforms.uThrough.value = 0;
    this.sil = shapes.map((g) => {
      const im = new THREE.InstancedMesh(g, mat, MAX * 8);
      im.frustumCulled = false;
      im.count = 0;
      im.renderOrder = 1;
      return im;
    });
    this.silA = this.sil.map((im) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 8), 1).setUsage(THREE.DynamicDrawUsage);
      // Shared geometry across instanced meshes would share this attribute, so give each its own view of the geometry.
      im.geometry = im.geometry.clone();
      im.geometry.setAttribute('aAlpha', a);
      return a;
    });
    const quad = new THREE.BufferGeometry();
    quad.setAttribute('position', new THREE.Float32BufferAttribute([0, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, 0, 0.5, 0], 3));
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    this.eyeGeo.index = quad.index;
    this.eyeGeo.setAttribute('position', quad.attributes.position);
    this.eyeGeo.setAttribute('aPos', this.aPos);
    this.eyeGeo.setAttribute('aK', this.aK);
    const em = overlayMat(EYE_VERT, EYE_FRAG, {});
    em.uniforms.uThrough.value = 0;
    this.eyes = new THREE.Mesh(this.eyeGeo, em);
    this.eyes.frustumCulled = false;
    this.eyes.renderOrder = 2;
    this.group.add(...this.sil, this.eyes);
    this.group.visible = false;
  }

  /** Draw these towers (seen from `cam`); an empty list hides it all. */
  update(list: ViewTower[], cam: THREE.Camera, res: THREE.Vector2) {
    this.group.visible = list.length > 0;
    if (!list.length) return;
    const counts = this.sil.map(() => 0);
    let n = 0;
    const put = (k: number, x: number, y: number, z: number, sx: number, sy: number, rot: number, a: number) => {
      const i = counts[k]++;
      if (i >= MAX * 8) return;
      this.q.setFromAxisAngle(this.v.set(0, 1, 0), rot);
      this.m.compose(this.v.set(x, y, z), this.q, this.sc.set(sx, sy, sx));
      this.sil[k].setMatrixAt(i, this.m);
      this.silA[k].setX(i, a);
    };
    for (const vt of list.slice(0, MAX)) {
      const t = vt.t;
      const d = cam.position.distanceTo(this.v.set(t.head.x, t.head.y, t.head.z));
      // Silhouettes only where the real tower has faded into the distance.
      const sa = vt.alpha * THREE.MathUtils.smoothstep(d, 250, 700) * 0.92;
      if (sa > 0.01) {
        t.boulders.forEach((b, i) => put(i === 1 ? 3 : (i * 7 + t.id * 3) % 3, b.x, b.y, b.z, b.sx, b.sy, b.rot, sa));
        put(3, t.head.x, t.head.y, t.head.z, t.head.sx, t.head.sy, t.head.rot, sa);
      }
      // The eyes, a touch in front of the head's face.
      const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
      const ex = t.head.x + fx * t.head.sx * 0.9, ey = t.head.y + t.head.sy * 0.12, ez = t.head.z + fz * t.head.sx * 0.9;
      // Half size in pixels: the head's own size on screen, but never tiny.
      const px = (t.head.sx * 1.1 / Math.max(d, 1)) * res.y * 1.4;
      const size = Math.max(px, vt.lit ? 26 + 14 * vt.aimed : 11) * (vt.lit ? 1.6 + 0.5 * vt.aimed : 1);
      this.aPos.setXYZ(n, ex, ey, ez);
      this.aK.setXYZW(n, vt.lit ? 1 : 0, vt.aimed, vt.alpha, size);
      n++;
    }
    this.sil.forEach((im, k) => { im.count = Math.min(counts[k], MAX * 8); im.instanceMatrix.needsUpdate = true; this.silA[k].needsUpdate = true; });
    this.eyeGeo.instanceCount = n;
    this.aPos.needsUpdate = this.aK.needsUpdate = true;
  }
}
