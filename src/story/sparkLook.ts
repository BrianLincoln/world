import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';
import { overlayMat } from './overlay';

// What a spark looks like, wherever one is (lying in warm land, in flight to
// the jar, held up by a spirit): a small living light. A white-hot bead in
// the scene (so it blooms and sits properly behind things), and over the
// finished frame a four-pointed star that turns and twinkles, a flat halo in
// two bands, and glitter shed behind it when it moves.
//
// Looks only. Whoever owns sparks says where they are each frame (`put`);
// nothing here knows what a spark is for.

/** The bead, the star, its edge and the halo. */
export const SPARK = { core: '#fff6d6', star: '#ffd27a', edge: '#f39a2e', halo: '#ffc46a' };
/** How many lights (sparks and their glitter together) can show at once. */
const MAX = 256;
/** Glitter: how long a fleck lives (s), least and most. */
const FLECK = [0.35, 0.8];

const VERT = /* glsl */ `
// (aAt: where, and how big across in metres; aLook: its own phase, how bright, 0 = a spark / 1 = a fleck of glitter.)
in vec4 aAt;
in vec3 aLook;
uniform vec2 uRes;
uniform float uTime;
out vec2 vUv;
out float vDepth;
out vec3 vLook;
void main() {
  vec4 vc = viewMatrix * vec4(aAt.xyz, 1.0);
  vDepth = -vc.z;
  vec4 c = projectionMatrix * vc;
  // World size, but a spark is never less than a twinkle on screen: it's what you look for from far off.
  float px = aAt.w * projectionMatrix[1][1] / max(vDepth, 1e-3) * uRes.y * 0.5;
  float s = max(px, aLook.z > 0.5 ? 2.0 : 9.0);
  c.xy += position.xy * s / uRes * 2.0 * c.w;
  vUv = position.xy * 2.0;
  vLook = aLook;
  gl_Position = vDepth > 0.2 && aLook.y > 0.003 ? c : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tND;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCore;
uniform vec3 uStar;
uniform vec3 uHalo;
uniform vec3 uEdge;
in vec2 vUv;
in float vDepth;
in vec3 vLook;
out vec4 fragColor;

// A four-pointed star with hollow sides, its points \`len\` long.
float star(vec2 p, float len) {
  p = abs(p) / len;
  return 1.0 - (sqrt(p.x) + sqrt(p.y));
}

void main() {
  // (Hidden behind what's solid, but for the bead's own depth.)
  float scene = texture(tND, gl_FragCoord.xy / uRes).w;
  if (vDepth > scene + 0.35) discard;
  float r = length(vUv), ph = vLook.x, t = uTime;
  if (vLook.z > 0.5) {
    // Glitter: a hard little diamond.
    float d = 1.0 - (abs(vUv.x) + abs(vUv.y));
    if (d < 0.0) discard;
    fragColor = vec4(mix(uStar, uCore, step(0.45, d)), vLook.y);
    return;
  }
  // It breathes, and every few seconds flares.
  float breath = 0.5 + 0.5 * sin(t * 2.6 + ph);
  float flare = pow(max(0.0, sin(t * 0.9 + ph * 1.7)), 24.0);
  float big = 0.62 + 0.14 * breath + 0.3 * flare;
  // The long star stands upright and rocks a little; a short one, turned an eighth, comes and goes against it.
  float a = 0.12 * sin(t * 1.3 + ph), ca = cos(a), sa = sin(a);
  vec2 p = vec2(ca * vUv.x - sa * vUv.y, sa * vUv.x + ca * vUv.y);
  float s1 = star(p * vec2(1.25, 1.0), big);
  vec2 q = vec2(p.x + p.y, p.y - p.x) * 0.7071;
  float s2 = star(q, big * (0.3 + 0.22 * (1.0 - breath) + 0.2 * flare));
  float s = max(s1, s2);
  // The halo: two flat bands of warm light, no falloff.
  float h = 0.2 * step(r, 0.5 + 0.05 * breath + 0.2 * flare) + 0.26 * step(r, 0.27 + 0.03 * breath + 0.1 * flare);
  vec4 c = vec4(uHalo, h);
  // The star: an amber edge, its own colour, white-hot down the middle.
  if (s > 0.0) c = vec4(s < 0.07 ? uEdge : s < 0.3 ? uStar : uCore, 1.0);
  if (r < 0.1 + 0.02 * breath) c = vec4(1.0);
  c.a *= vLook.y;
  if (c.a < 0.01) discard;
  fragColor = c;
}
`;

interface Fleck { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; life: number; size: number }

/** The bead in the scene: a mesh per spark of radius `r` (its scale is left at 1 for its owner), one material for all of them. */
const beadGeo = new Map<number, THREE.BufferGeometry>();
let beadMat: THREE.ShaderMaterial | null = null;
export function sparkBead(r = 0.09): THREE.Mesh {
  beadMat ??= makeSolidMaterial(SPARK.core, 1.7, { keep: 1 });
  let geo = beadGeo.get(r);
  if (!geo) beadGeo.set(r, (geo = new THREE.IcosahedronGeometry(r, 1)));
  const m = new THREE.Mesh(geo, beadMat);
  m.frustumCulled = false;
  m.visible = false;
  return m;
}

/** The lights over the frame, for one owner's sparks: `mesh` goes in the overlay scene. */
export class SparkLights {
  readonly mesh: THREE.Mesh;
  private geo = new THREE.InstancedBufferGeometry();
  private at = new Float32Array(MAX * 4);
  private look = new Float32Array(MAX * 3);
  private aAt: THREE.InstancedBufferAttribute;
  private aLook: THREE.InstancedBufferAttribute;
  private n = 0;
  private flecks: Fleck[] = [];
  private u = { uCore: { value: new THREE.Color(SPARK.core) }, uStar: { value: new THREE.Color(SPARK.star) }, uHalo: { value: new THREE.Color(SPARK.halo) }, uEdge: { value: new THREE.Color(SPARK.edge) } };

  constructor() {
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.aAt = new THREE.InstancedBufferAttribute(this.at, 4).setUsage(THREE.DynamicDrawUsage);
    this.aLook = new THREE.InstancedBufferAttribute(this.look, 3).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('aAt', this.aAt);
    this.geo.setAttribute('aLook', this.aLook);
    this.geo.instanceCount = 0;
    const mat = overlayMat(VERT, FRAG, this.u);
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -5;
    this.mesh.visible = false;
  }

  /** Start the frame: age the glitter, and forget where last frame's sparks were. */
  begin(dt: number) {
    this.n = 0;
    for (const f of this.flecks) {
      f.t += dt;
      f.vy -= 1.4 * dt;
      const drag = Math.exp(-2.5 * dt);
      f.vx *= drag; f.vy *= drag; f.vz *= drag;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    }
    this.flecks = this.flecks.filter((f) => f.t < f.life);
  }

  private add(x: number, y: number, z: number, size: number, phase: number, bright: number, kind: number) {
    if (this.n >= MAX) return;
    const i = this.n++;
    this.at[i * 4] = x; this.at[i * 4 + 1] = y; this.at[i * 4 + 2] = z; this.at[i * 4 + 3] = size;
    this.look[i * 3] = phase; this.look[i * 3 + 1] = bright; this.look[i * 3 + 2] = kind;
  }

  /** A spark is here this frame: `size` m across its halo, `phase` its own (so no two twinkle together), `bright` 0..1. */
  put(p: THREE.Vector3, size = 1, phase = 0, bright = 1) { this.add(p.x, p.y, p.z, size, phase, bright, 0); }

  /** Glitter thrown off at `p`: `n` flecks, flung at up to `speed` m/s. */
  shed(p: THREE.Vector3, n = 1, speed = 0.6, size = 0.07) {
    for (let i = 0; i < n && this.flecks.length < MAX / 2; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + 0.7 * Math.random()), up = Math.random() * 2 - 0.6;
      this.flecks.push({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * v, vy: up * v, vz: Math.sin(a) * v, t: 0, life: FLECK[0] + (FLECK[1] - FLECK[0]) * Math.random(), size: size * (0.6 + 0.8 * Math.random()) });
    }
  }

  /** End the frame: the glitter goes in after the sparks, and it's all handed to the card. */
  end() {
    for (const f of this.flecks) {
      const k = 1 - f.t / f.life;
      this.add(f.x, f.y, f.z, f.size * (0.4 + 0.6 * k), 0, Math.min(1, k * 1.6), 1);
    }
    this.geo.instanceCount = this.n;
    this.mesh.visible = this.n > 0;
    this.aAt.needsUpdate = true;
    this.aLook.needsUpdate = true;
  }
}
