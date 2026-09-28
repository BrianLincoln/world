import * as THREE from 'three';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

// Frame pipeline:
//   1. scene -> G-buffer (MRT): colour+emissive, view normal+linear depth
//   2. emissive -> half-res bloom (extract + separable blur x2)
//   3. composite: monochrome grade, outlines, stepped atmospheric fog, bloom
//   4. FXAA -> screen
// Fog lives here (not in materials) so every surface, outline and prop gets
// exactly the same banded layers.

export const postSettings = {
  outline: true,
  outlineWidth: 1.6,
  depthThreshold: 0.045,
  normalThreshold: 0.4,
  outlineFadeStart: 220,
  outlineFadeEnd: 2600,
  fogDensity: 0.00032,
  fogStart: 40,
  fogBands: 5,
  fogHeight: 0.22,
  fogFalloff: 40,
  fogMax: 0.9,
  gradeScale: 1,
  bloom: 1.0,
  renderScale: 1,
  fxaa: true,
};

const FS_VERT = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
layout(location = 0) out vec4 fragColor;
in vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tND;
uniform sampler2D tBloom;
uniform vec2 uTexel;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform vec3 uFogCol;
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogBands;
uniform float uFogHeight;
uniform float uFogFalloff;
uniform float uFogMax;
uniform vec3 uOutlineCol;
uniform float uOutlineOn;
uniform float uOutlineWidth;
uniform float uDepthThr;
uniform float uNormalThr;
uniform float uFade0;
uniform float uFade1;
uniform vec3 uTint;
uniform float uTintAmt;
uniform float uLift;
uniform float uBloom;

void main() {
  vec4 cc = texture(tColor, vUv);
  vec4 nd = texture(tND, vUv);
  float d = nd.w;
  vec3 col = cc.rgb;
  bool sky = d > 5.0e4;

  if (!sky && cc.a < 0.5) {
    float keep = clamp(-cc.a, 0.0, 1.0);
    // Pull toward a single hue family: keep luminance, swap chroma for the tint's.
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    float tl = dot(uTint, vec3(0.299, 0.587, 0.114));
    col = mix(col, uTint * (l / max(tl, 1e-3)), uTintAmt * (1.0 - keep));
    col = mix(col, uFogCol, uLift * (1.0 - keep * 0.7));
  }

  if (!sky) {
    if (uOutlineOn > 0.5) {
      vec2 o = uTexel * uOutlineWidth;
      vec4 l = texture(tND, vUv - vec2(o.x, 0.0));
      vec4 r = texture(tND, vUv + vec2(o.x, 0.0));
      vec4 u = texture(tND, vUv + vec2(0.0, o.y));
      vec4 b = texture(tND, vUv - vec2(0.0, o.y));
      // Laplacian of inverse depth: zero on planes (even at grazing angles),
      // positive where this pixel is in front of its neighbours.
      float ex = 2.0 - d / l.w - d / r.w;
      float ey = 2.0 - d / u.w - d / b.w;
      float de = max(ex, ey);
      float depthEdge = smoothstep(uDepthThr, uDepthThr * 1.8, de);
      vec3 n = nd.xyz;
      float ne = max(max(1.0 - dot(n, l.xyz), 1.0 - dot(n, r.xyz)), max(1.0 - dot(n, u.xyz), 1.0 - dot(n, b.xyz)));
      // Only creases where depth is continuous and we are the nearer side.
      float nearer = step(-0.002, de);
      float normalEdge = smoothstep(uNormalThr, uNormalThr + 0.15, ne) * nearer * (1.0 - smoothstep(30.0, 160.0, d));
      float edge = max(depthEdge, normalEdge) * (1.0 - smoothstep(uFade0, uFade1, d));
      // Lines on distant layers become a darker shade of that layer, not ink.
      col = mix(col, uOutlineCol, edge);
    }

    // Reconstruct world position from linear depth.
    vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 ray = v.xyz / v.w;
    ray /= -ray.z;
    vec3 vp = ray * d;
    float dist = length(vp);
    vec3 wdir = normalize(mat3(uCamWorld) * vp);
    float wy = uCamPos.y + wdir.y * dist;
    float f = 1.0 - exp(-max(dist - uFogStart, 0.0) * uFogDensity);
    // Thinner air up high: peaks and snow caps stay legible as landmarks.
    f *= 1.0 - 0.4 * smoothstep(90.0, 420.0, wy);
    if (uFogBands > 0.5) f = floor(f * uFogBands + 0.3) / uFogBands;
    // Valley mist: one flat bank with a hard top, lying over low ground in
    // the distance (never contoured bands that cut across objects).
    float mistTop = uFogFalloff * 0.25;
    float mist = step(wy, mistTop) * uFogHeight * smoothstep(250.0, 900.0, dist);
    f = max(f, min(uFogMax, f + mist));
    f = min(f, uFogMax);
    col = mix(col, uFogCol, f);
  }

  col += texture(tBloom, vUv).rgb * uBloom;
  fragColor = vec4(col, 1.0);
}
`;

const EXTRACT_FRAG = /* glsl */ `
precision highp float;
layout(location = 0) out vec4 fragColor;
in vec2 vUv;
uniform sampler2D tColor;
uniform vec2 uTexel;
void main() {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec2 o = vec2(float(i & 1) - 0.5, float(i >> 1) - 0.5) * uTexel;
    vec4 c = texture(tColor, vUv + o);
    acc += c.rgb * max(c.a, 0.0);
  }
  fragColor = vec4(acc * 0.25, 1.0);
}
`;

const BLUR_FRAG = /* glsl */ `
precision highp float;
layout(location = 0) out vec4 fragColor;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uDir;
void main() {
  float w[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec3 acc = texture(tSrc, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    acc += texture(tSrc, vUv + uDir * float(i)).rgb * w[i];
    acc += texture(tSrc, vUv - uDir * float(i)).rgb * w[i];
  }
  fragColor = vec4(acc, 1.0);
}
`;

class FullscreenPass {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  readonly material: THREE.ShaderMaterial;
  constructor(material: THREE.ShaderMaterial) {
    this.material = material;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    const m = new THREE.Mesh(g, material);
    m.frustumCulled = false;
    this.scene.add(m);
  }
  render(r: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null) {
    r.setRenderTarget(target);
    r.render(this.scene, this.camera);
  }
}

function fsMat(frag: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
}

export class PostPipeline {
  gbuf: THREE.WebGLRenderTarget;
  private bloomA: THREE.WebGLRenderTarget;
  private bloomB: THREE.WebGLRenderTarget;
  private comp: THREE.WebGLRenderTarget;
  private extract: FullscreenPass;
  private blur: FullscreenPass;
  private composite: FullscreenPass;
  private fxaa: FullscreenPass;
  readonly uniforms: Record<string, THREE.IUniform>;
  private w = 1;
  private h = 1;

  constructor(private renderer: THREE.WebGLRenderer) {
    this.gbuf = new THREE.WebGLRenderTarget(1, 1, { count: 2, type: THREE.HalfFloatType, depthBuffer: true });
    this.gbuf.textures[0].minFilter = THREE.LinearFilter;
    this.gbuf.textures[0].magFilter = THREE.LinearFilter;
    this.gbuf.textures[1].minFilter = THREE.NearestFilter;
    this.gbuf.textures[1].magFilter = THREE.NearestFilter;
    const half = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.bloomA = new THREE.WebGLRenderTarget(1, 1, half);
    this.bloomB = new THREE.WebGLRenderTarget(1, 1, half);
    this.comp = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

    this.extract = new FullscreenPass(fsMat(EXTRACT_FRAG, { tColor: { value: null }, uTexel: { value: new THREE.Vector2() } }));
    this.blur = new FullscreenPass(fsMat(BLUR_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }));
    this.uniforms = {
      tColor: { value: null }, tND: { value: null }, tBloom: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
      uFogCol: { value: new THREE.Color() }, uFogDensity: { value: 0 }, uFogStart: { value: 0 }, uFogBands: { value: 0 },
      uFogHeight: { value: 0 }, uFogFalloff: { value: 1 }, uFogMax: { value: 1 },
      uOutlineCol: { value: new THREE.Color() }, uOutlineOn: { value: 1 }, uOutlineWidth: { value: 1 },
      uDepthThr: { value: 0.05 }, uNormalThr: { value: 0.4 }, uFade0: { value: 0 }, uFade1: { value: 1 },
      uTint: { value: new THREE.Color() }, uTintAmt: { value: 0 }, uLift: { value: 0 }, uBloom: { value: 1 },
    };
    this.composite = new FullscreenPass(fsMat(COMPOSITE_FRAG, this.uniforms));
    const fx = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms),
      vertexShader: FXAAShader.vertexShader,
      fragmentShader: FXAAShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.fxaa = new FullscreenPass(fx);
  }

  setSize(w: number, h: number) {
    this.w = Math.max(1, Math.floor(w));
    this.h = Math.max(1, Math.floor(h));
    this.gbuf.setSize(this.w, this.h);
    this.comp.setSize(this.w, this.h);
    const hw = Math.max(1, this.w >> 1);
    const hh = Math.max(1, this.h >> 1);
    this.bloomA.setSize(hw, hh);
    this.bloomB.setSize(hw, hh);
    this.fxaa.material.uniforms.resolution.value.set(1 / this.w, 1 / this.h);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, fog: THREE.Color, outline: THREE.Color, tint: THREE.Color, tintAmt: number, lift = 0) {
    const r = this.renderer;
    const s = postSettings;
    r.setRenderTarget(this.gbuf);
    r.render(scene, camera);

    // Bloom from emissive.
    const hw = this.bloomA.width;
    const hh = this.bloomA.height;
    this.extract.material.uniforms.tColor.value = this.gbuf.textures[0];
    this.extract.material.uniforms.uTexel.value.set(0.5 / this.w, 0.5 / this.h);
    this.extract.render(r, this.bloomA);
    const bu = this.blur.material.uniforms;
    for (let i = 0; i < 2; i++) {
      const k = 1 + i * 1.5;
      bu.tSrc.value = this.bloomA.texture;
      bu.uDir.value.set(k / hw, 0);
      this.blur.render(r, this.bloomB);
      bu.tSrc.value = this.bloomB.texture;
      bu.uDir.value.set(0, k / hh);
      this.blur.render(r, this.bloomA);
    }

    const u = this.uniforms;
    u.tColor.value = this.gbuf.textures[0];
    u.tND.value = this.gbuf.textures[1];
    u.tBloom.value = this.bloomA.texture;
    u.uTexel.value.set(1 / this.w, 1 / this.h);
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uCamWorld.value.copy(camera.matrixWorld);
    u.uCamPos.value.copy(camera.position);
    u.uFogCol.value.copy(fog);
    u.uFogDensity.value = s.fogDensity;
    u.uFogStart.value = s.fogStart;
    u.uFogBands.value = s.fogBands;
    u.uFogHeight.value = s.fogHeight;
    u.uFogFalloff.value = s.fogFalloff;
    u.uFogMax.value = s.fogMax;
    u.uOutlineCol.value.copy(outline);
    u.uOutlineOn.value = s.outline ? 1 : 0;
    u.uOutlineWidth.value = s.outlineWidth;
    u.uDepthThr.value = s.depthThreshold;
    u.uNormalThr.value = s.normalThreshold;
    u.uFade0.value = s.outlineFadeStart;
    u.uFade1.value = s.outlineFadeEnd;
    u.uTint.value.copy(tint);
    u.uTintAmt.value = Math.min(1, tintAmt * s.gradeScale);
    u.uBloom.value = s.bloom;
    u.uLift.value = lift;

    if (s.fxaa) {
      this.composite.render(r, this.comp);
      this.fxaa.material.uniforms.tDiffuse.value = this.comp.texture;
      this.fxaa.render(r, null);
    } else {
      this.composite.render(r, null);
    }
  }
}
