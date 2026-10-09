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
  outlineWidth: 1,
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
  layeredFog: true,
  gradeScale: 1,
  bloom: 1.0,
  renderScale: 1,
  adaptive: true,
  fxaa: true,
  /**
   * The cold country (story/warmth.ts sets `amt` and the maps each frame; the rest is the look).
   * Off while `amt` is 0 or there are no maps.
   */
  cold: {
    amt: 0,
    ids: null as THREE.Texture | null, tow: null as THREE.Texture | null, air: null as THREE.Texture | null,
    ox: 0, oz: 0, half: 1,
    tint: [0.58, 0.72, 0.86], fog: [0.9, 0.93, 0.95], lead: [1.0, 0.9, 0.66], snowNight: [0.5, 0.58, 0.76],
    /** Small warm circles (a lit cabin's): x, z, radius, rim of light; up to eight. */
    pockets: [] as number[],
    tintAmt: 0.7, lift: 0.42, fogMul: 6.5, fogMax: 0.95, mist: 0.55, sky: 1, rim: 0.55,
    /** How much snow falls in it (1 = a quiet fall, up to 100; story/snow.ts). */
    snow: 12,
    /** The sky over cold land by day: how far it goes to `storm`, a heavy snow sky. */
    gloom: 0.8, storm: [0.29, 0.34, 0.43],
    /** The mountain tops are cold whatever the maps say: above this height (m; 0 = no such line; trees stop at 175 and the snow caps lie from about 235), coming on over `topSoft` m either side. */
    top: 200, topSoft: 10,
    /** The ground's height under the camera (main sets it): the air is cold by the land under it, not by how high it is. */
    under: 0,
  },
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
uniform sampler2D tLayer;
uniform vec2 uLayerSize;
uniform float uLayered;
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
// The giant as one card: x = its distance as a whole (0 = no giant), y = its mid height.
uniform vec2 uGiant;
// The cold country (story/warmth.ts): xy = the maps' centre (world x, z), z = their half width, w = how cold (0 = off).
uniform vec4 uCold;
// The four towers nearest each cell (ids), each tower's place, reach and rim (x, z, r, rim), and warm / cold coarsely (for the air).
uniform sampler2D tWarmIds;
uniform sampler2D tWarmTow;
uniform sampler2D tWarmAir;
uniform vec3 uColdTint;
uniform vec3 uColdFog;
uniform vec3 uColdLead;
uniform vec3 uColdSnowNight;
// x = tint, y = lift, z = fog density times, w = fog max
uniform vec4 uColdP;
// x = sky, y = mist, z = the rim of light
uniform vec3 uColdQ;
// A heavy snow sky over cold land: rgb, and how far the sky goes to it by day.
uniform vec4 uColdStorm;
// A lit cabin's own little circle of warmth: x, z, radius (0 = none), and its rim of light.
uniform vec4 uColdPk[8];
// The mountain tops: x = the height above which it's cold (m), y = how soft that line is (m either side), z = the ground's height under the eye.
uniform vec3 uColdTop;

// The edge wanders: a place is judged from a little to one side of where it is (the same in warmth.ts).
vec2 wob(vec2 p) {
  return p + 14.0 * vec2(sin(p.y * 0.011 + 1.3 * sin(p.x * 0.007)), sin(p.x * 0.0093 + 1.7 * sin(p.y * 0.0061)));
}
float airWarm(vec2 p) { return texture(tWarmAir, (p - uCold.xy) / (2.0 * uCold.z) + 0.5).r; }
// How far above the mountains' cold line a place is, 0..1 (the line wanders a little too; the same in warmth.ts).
float coldHigh(vec2 p, float y) {
  float line = uColdTop.x + (wob(p).x - p.x);
  return smoothstep(line - uColdTop.y, line + uColdTop.y, y);
}

vec3 nrm(vec3 v) { return v / max(length(v), 1e-4); }

void main() {
  vec4 cc = texture(tColor, vUv);
  vec4 nd = texture(tND, vUv);
  float d = nd.w;
  vec3 col = cc.rgb;
  bool sky = d > 5.0e4;

  // How cold this pixel's ground is, how much of the way to it lies through cold air, and the lit rim.
  float cold = 0.0;
  float coldAir = 0.0;
  float lead = 0.0;
  vec3 fogCol = uFogCol;
  // After dark the sky and the trees go darker and the snowy ground stays light.
  float night = 1.0 - smoothstep(0.3, 0.6, dot(uFogCol, vec3(0.299, 0.587, 0.114)));
  vec3 frost = mix(mix(uColdFog, uFogCol, 0.15), uColdSnowNight, night);
  vec3 coldFog = mix(frost, uFogCol * vec3(0.8, 0.86, 1.0), night);
  if (uCold.w > 0.0) {
    vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 ray = v.xyz / v.w;
    ray /= -ray.z;
    if (sky) {
      // A cold sky over cold land: by what lies under it, out the way you look.
      vec3 dir = normalize(mat3(uCamWorld) * ray);
      // (Low in the sky it's the far country that's under it; overhead, where you stand.)
      vec2 hd = normalize(dir.xz + 1e-5);
      float far = (airWarm(uCamPos.xz + hd * 700.0) + airWarm(uCamPos.xz + hd * 1600.0) + airWarm(uCamPos.xz + hd * 3000.0)) / 3.0;
      float w = mix(far, airWarm(uCamPos.xz + hd * 250.0), smoothstep(0.1, 0.55, dir.y));
      // (Or, up a mountain, by how high the ground under you stands: not by how high you are over it.)
      float k = max(1.0 - w, coldHigh(uCamPos.xz, uColdTop.z)) * uColdQ.x * uCold.w;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      float tl = dot(uColdTint, vec3(0.299, 0.587, 0.114));
      vec3 c = mix(col, uColdTint * (l / tl), 0.75);
      col = mix(col, mix(mix(c, coldFog, 0.45), c * 0.62, night), k);
      // A snow sky: heavy overhead, paling down to the fog where the far land goes into it. Clouds stay as a shade of it.
      vec3 st = uColdStorm.rgb * mix(0.86, 1.14, smoothstep(0.35, 0.95, l));
      col = mix(col, mix(coldFog, st, smoothstep(-0.02, 0.3, dir.y)), k * uColdStorm.a * (1.0 - night));
    } else {
      vec3 wp = uCamPos + mat3(uCamWorld) * (ray * d);
      vec2 p = wob(wp.xz);
      vec4 ids = floor(texture(tWarmIds, (p - uCold.xy) / (2.0 * uCold.z) + 0.5) * 255.0 + 0.5);
      vec4 t0 = texelFetch(tWarmTow, ivec2(int(ids.x), 0), 0), t1 = texelFetch(tWarmTow, ivec2(int(ids.y), 0), 0);
      vec4 t2 = texelFetch(tWarmTow, ivec2(int(ids.z), 0), 0), t3 = texelFetch(tWarmTow, ivec2(int(ids.w), 0), 0);
      vec4 ds = vec4(distance(p, t0.xy), distance(p, t1.xy), distance(p, t2.xy), distance(p, t3.xy));
      vec4 rs = vec4(t0.z, t1.z, t2.z, t3.z), rim = vec4(t0.w, t1.w, t2.w, t3.w);
      // Its own tower: the nearest. Warm if that one's warmth has got this far.
      float dn = ds.x, rn = rs.x, rimN = rim.x;
      if (ds.y < dn) { dn = ds.y; rn = rs.y; rimN = rim.y; }
      if (ds.z < dn) { dn = ds.z; rn = rs.z; rimN = rim.z; }
      if (ds.w < dn) { dn = ds.w; rn = rs.w; rimN = rim.w; }
      float w = step(dn, rn);
      // How far into the cold this is from the nearest warmth (its own tower's ring, or a warm neighbour's border), for the rim.
      float e = rn > 0.0 ? dn - rn : 1e9, er = rimN;
      for (int k = 0; k < 4; k++) {
        float ek = (ds[k] - dn) * 0.5;
        if (ds[k] > dn + 0.01 && rs[k] > ds[k] && ek < e) { e = ek; er = rim[k]; }
      }
      for (int k = 0; k < 8; k++) {
        if (uColdPk[k].z <= 0.0) continue;
        // (A true circle, from where the ground really is: the wander that suits a kilometre of edge makes a blob of 20 m.)
        float ek = distance(wp.xz, uColdPk[k].xy) - uColdPk[k].z;
        if (ek < 0.0) w = 1.0;
        else if (ek * 4.0 < e) { e = ek * 4.0; er = uColdPk[k].w; }
      }
      lead = (1.0 - w) * er * (step(e, 4.0) + 0.4 * step(e, 20.0) * (1.0 - step(e, 4.0)));
      cold = max(1.0 - w, coldHigh(wp.xz, wp.y)) * uCold.w;
      // Of the straight line from the eye to here, the part through cold air.
      vec2 c0 = uCamPos.xz, dp = wp.xz - uCamPos.xz;
      coldAir = 1.0 - 0.25 * (airWarm(c0 + dp * 0.125) + airWarm(c0 + dp * 0.375) + airWarm(c0 + dp * 0.625) + airWarm(c0 + dp * 0.875));
      // (And the part of it over land above the mountains' line: the ground between is taken as a straight slope from under the eye to here.)
      float y0 = uColdTop.z, dy = wp.y - y0;
      coldAir = max(coldAir, 0.25 * (coldHigh(c0 + dp * 0.125, y0 + dy * 0.125) + coldHigh(c0 + dp * 0.375, y0 + dy * 0.375) + coldHigh(c0 + dp * 0.625, y0 + dy * 0.625) + coldHigh(c0 + dp * 0.875, y0 + dy * 0.875))) * uCold.w;
      // (Cold land is in cold air's colour however much warm air you see it through, or it goes muddy.)
      fogCol = mix(uFogCol, coldFog, max(cold, coldAir));
    }
  }

  if (!sky && cc.a < 0.5) {
    float keep = clamp(-cc.a, 0.0, 1.0);
    // Pull toward a single hue family: keep luminance, swap chroma for the tint's.
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    float tl = dot(uTint, vec3(0.299, 0.587, 0.114));
    col = mix(col, uTint * (l / max(tl, 1e-3)), uTintAmt * (1.0 - keep));
    col = mix(col, uFogCol, uLift * (1.0 - keep * 0.7));
  }
  if (!sky && cold + lead > 0.0) {
    // Whatever glows keeps its colour, the more the brighter (no threshold: a spirit's light pulses across one).
    float keep = cc.a < 0.0 ? clamp(-cc.a, 0.0, 1.0) : smoothstep(0.0, 0.3, cc.a);
    float cl = dot(col, vec3(0.299, 0.587, 0.114));
    float ctl = dot(uColdTint, vec3(0.299, 0.587, 0.114));
    // Ground and water take the frost; what stands on it (half-length normals) takes less, and after dark goes darker.
    float prop = 1.0 - step(0.5, dot(nd.xyz, nd.xyz));
    col = mix(col, uColdTint * (cl / ctl), uColdP.x * cold * (1.0 - keep));
    col = mix(col, frost, uColdP.y * cold * (1.0 - keep * (cc.a < 0.0 ? 0.7 : 1.0)) * mix(1.0 + 0.5 * night, 1.0 - 0.75 * night, prop));
    col *= 1.0 - 0.38 * night * prop * cold * (1.0 - keep);
    col = mix(col, uColdLead, lead * uColdQ.z * uCold.w * (1.0 - keep));
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
      vec3 n = nrm(nd.xyz);
      float ne = max(max(1.0 - dot(n, nrm(l.xyz)), 1.0 - dot(n, nrm(r.xyz))), max(1.0 - dot(n, nrm(u.xyz)), 1.0 - dot(n, nrm(b.xyz))));
      // Only creases where depth is continuous and we are the nearer side.
      float nearer = step(-0.002, de);
      float normalEdge = smoothstep(uNormalThr, uNormalThr + 0.15, ne) * nearer * (1.0 - smoothstep(30.0, 160.0, d));
      float edge = max(depthEdge, normalEdge) * (1.0 - smoothstep(uFade0, uFade1, d));
      // Creatures (normal length 0.62) are small and fuzzy: past a few tens of
      // metres their line eases off into a darker shade of their own colour,
      // or a distant flock reads as a cluster of ink rings.
      vec3 lineCol = uOutlineCol;
      float nl2 = dot(nd.xyz, nd.xyz);
      if (nl2 > 0.32 && nl2 < 0.46) {
        float far = smoothstep(14.0, 90.0, d);
        edge *= 1.0 - 0.75 * far;
        lineCol = mix(uOutlineCol, col * 0.78, far);
      }
      // Lines on distant layers become a darker shade of that layer, not ink.
      col = mix(col, lineCol, edge);
    }

    // Reconstruct world position from linear depth.
    vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 ray = v.xyz / v.w;
    ray /= -ray.z;
    vec3 vp = ray * d;
    float dist = length(vp);
    // Pick the quarter-res layer sample that belongs to this surface.
    float fd = d;
    if (uLayered > 0.5) {
      vec2 lp = vUv * uLayerSize - 0.5;
      vec2 base = floor(lp);
      float bestErr = 1e9;
      for (int k = 0; k < 4; k++) {
        vec2 o = vec2(float(k & 1), float(k >> 1));
        vec2 t = texelFetch(tLayer, ivec2(clamp(base + o, vec2(0.0), uLayerSize - 1.0)), 0).rg;
        float err = abs(t.y - d) / d;
        if (err < bestErr) { bestErr = err; fd = t.x; }
      }
      if (bestErr > 0.08) fd = d;
    }
    float fogDist = length(ray * fd);
    vec3 wdir = normalize(mat3(uCamWorld) * vp);
    float wy = uCamPos.y + wdir.y * dist;
    float airY = wy;
    // The giant (normal length 0.8) takes one fog tone from head to foot, so
    // it reads as a painted card however the bands fall across it.
    float gl2 = dot(nd.xyz, nd.xyz);
    if (uGiant.x > 0.0 && gl2 > 0.55 && gl2 < 0.75) { fogDist = uGiant.x; airY = uGiant.y; }
    float f = 1.0 - exp(-max(fogDist - uFogStart * (1.0 - 0.75 * coldAir), 0.0) * uFogDensity * mix(1.0, uColdP.z, coldAir));
    // Thinner air up high: peaks and snow caps stay legible as landmarks.
    f *= 1.0 - 0.4 * smoothstep(90.0, 420.0, airY);
    if (uFogBands > 0.5) f = floor(f * uFogBands + 0.3) / uFogBands;
    // Valley mist: one flat bank with a hard top, lying over low ground in
    // the distance (never contoured bands that cut across objects).
    float mistTop = uFogFalloff * 0.25;
    float mist = step(wy, mistTop) * uFogHeight * smoothstep(250.0, 900.0, dist);
    // In the cold the bank stands nearer and thicker.
    mist = max(mist, step(wy, mistTop) * uColdQ.y * coldAir * smoothstep(30.0, 120.0, dist) * (1.0 - 0.6 * night));
    float fmax = mix(uFogMax, uColdP.w, coldAir);
    f = max(f, min(fmax, f + mist));
    f = min(f, fmax);
    // A beacon (emissive over 1.5: the warm lights the giant carries) shows through the air.
    f *= 1.0 - 0.85 * step(1.5, cc.a);
    col = mix(col, fogCol, f);
  }

  col += texture(tBloom, vUv).rgb * uBloom;
  fragColor = vec4(col, 1.0);
}
`;

// Layer depth (quarter res): walk up the screen from each pixel until the
// depth jumps (a silhouette ridge) and report the depth just below the jump.
// Fogging a whole layer by its ridge depth makes each hill or mountain one
// flat tone, like painted background layers, instead of banding across it.
const LAYER_FRAG = /* glsl */ `
precision highp float;
layout(location = 0) out vec4 fragColor;
in vec2 vUv;
uniform sampler2D tND;
uniform vec2 uStep;
uniform mat4 uCamWorld;
void main() {
  vec4 s0 = texture(tND, vUv);
  // Flat ground and water keep their own depth: layering is for faces.
  float upness = (mat3(uCamWorld) * normalize(s0.xyz + 1e-6)).y;
  float d0 = s0.w;
  float cur = d0;
  // Props (half-length normals) never define a layer: they fog by their own
  // depth, and scans from the ground look straight through them.
  if (d0 < 5.0e4 && dot(s0.xyz, s0.xyz) > 0.5 && upness < 0.8) {
    for (int i = 1; i <= 64; i++) {
      vec2 uv = vUv + vec2(0.0, uStep.y * float(i));
      if (uv.y > 1.0) break;
      vec4 sm = texture(tND, uv);
      if (sm.w > 5.0e4) break;                   // sky: ridge reached
      if (dot(sm.xyz, sm.xyz) < 0.5) continue;   // skip trees, rocks, cabins
      if (sm.w > cur * 1.12) break;              // farther layer: ridge reached
      if (sm.w < cur * 0.8) break;               // nearer ground in front
      cur = max(cur, sm.w);
      if (cur > d0 * 2.2) break;                 // long continuous slope: cap
    }
  }
  fragColor = vec4(cur, d0, 0.0, 1.0);
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
  private layerRT: THREE.WebGLRenderTarget;
  private layer: FullscreenPass;
  private extract: FullscreenPass;
  private blur: FullscreenPass;
  private composite: FullscreenPass;
  private fxaa: FullscreenPass;
  readonly uniforms: Record<string, THREE.IUniform>;
  /**
   * Drawn over the composited frame (before FXAA) with blending: story
   * sketches and icons. Its shaders get the G-buffer normal+depth texture
   * and the render size, to fade behind solid geometry.
   */
  overlay: { scene: THREE.Scene; tND: THREE.IUniform; uRes: THREE.IUniform } | null = null;
  /** The giant's distance from the camera and mid height, while it's about (see uGiant). */
  giant: { dist: number; y: number } | null = null;
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

    // Half float: depths stay well under 65504 and only need ~8% relative
    // accuracy, and 16F targets are renderable on more GPUs (iOS) than 32F.
    this.layerRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.layer = new FullscreenPass(fsMat(LAYER_FRAG, { tND: { value: null }, uStep: { value: new THREE.Vector2() }, uCamWorld: { value: new THREE.Matrix4() } }));
    this.extract = new FullscreenPass(fsMat(EXTRACT_FRAG, { tColor: { value: null }, uTexel: { value: new THREE.Vector2() } }));
    this.blur = new FullscreenPass(fsMat(BLUR_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }));
    this.uniforms = {
      tColor: { value: null }, tND: { value: null }, tBloom: { value: null }, tLayer: { value: null },
      uLayerSize: { value: new THREE.Vector2(1, 1) }, uLayered: { value: 1 },
      uTexel: { value: new THREE.Vector2() },
      uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
      uFogCol: { value: new THREE.Color() }, uFogDensity: { value: 0 }, uFogStart: { value: 0 }, uFogBands: { value: 0 },
      uFogHeight: { value: 0 }, uFogFalloff: { value: 1 }, uFogMax: { value: 1 },
      uOutlineCol: { value: new THREE.Color() }, uOutlineOn: { value: 1 }, uOutlineWidth: { value: 1 },
      uDepthThr: { value: 0.05 }, uNormalThr: { value: 0.4 }, uFade0: { value: 0 }, uFade1: { value: 1 },
      uTint: { value: new THREE.Color() }, uTintAmt: { value: 0 }, uLift: { value: 0 }, uBloom: { value: 1 },
      uGiant: { value: new THREE.Vector2() },
      uCold: { value: new THREE.Vector4() }, tWarmIds: { value: null }, tWarmTow: { value: null }, tWarmAir: { value: null },
      uColdTint: { value: new THREE.Vector3() }, uColdFog: { value: new THREE.Vector3() }, uColdLead: { value: new THREE.Vector3() },
      uColdPk: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, uColdSnowNight: { value: new THREE.Vector3() }, uColdP: { value: new THREE.Vector4() }, uColdQ: { value: new THREE.Vector3() }, uColdStorm: { value: new THREE.Vector4() }, uColdTop: { value: new THREE.Vector3(1e9, 1, 0) },
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
    this.layerRT.setSize(Math.max(1, this.w >> 2), Math.max(1, this.h >> 2));
    this.fxaa.material.uniforms.resolution.value.set(1 / this.w, 1 / this.h);
  }

  /** `air`: the fog of an enclosed place (a dungeon), in place of the open world's settings: no layers, no valley mist. */
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, fog: THREE.Color, outline: THREE.Color, tint: THREE.Color, tintAmt: number, lift = 0, air?: { density: number; start: number; bands: number; max: number }) {
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

    if (s.layeredFog && !air) {
      this.layer.material.uniforms.tND.value = this.gbuf.textures[1];
      this.layer.material.uniforms.uStep.value.set(0, 1 / this.layerRT.height);
      this.layer.material.uniforms.uCamWorld.value.copy(camera.matrixWorld);
      this.layer.render(r, this.layerRT);
    }

    const u = this.uniforms;
    u.tLayer.value = this.layerRT.texture;
    u.uLayerSize.value.set(this.layerRT.width, this.layerRT.height);
    u.uLayered.value = s.layeredFog && !air ? 1 : 0;
    u.tColor.value = this.gbuf.textures[0];
    u.tND.value = this.gbuf.textures[1];
    u.tBloom.value = this.bloomA.texture;
    u.uTexel.value.set(1 / this.w, 1 / this.h);
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uCamWorld.value.copy(camera.matrixWorld);
    u.uCamPos.value.copy(camera.position);
    u.uFogCol.value.copy(fog);
    u.uFogDensity.value = air?.density ?? s.fogDensity;
    u.uFogStart.value = air?.start ?? s.fogStart;
    u.uFogBands.value = air?.bands ?? s.fogBands;
    u.uFogHeight.value = air ? 0 : s.fogHeight;
    u.uFogFalloff.value = s.fogFalloff;
    u.uFogMax.value = air?.max ?? s.fogMax;
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
    u.uGiant.value.set(air ? 0 : this.giant?.dist ?? 0, this.giant?.y ?? 0);
    const c = s.cold;
    u.uCold.value.set(c.ox, c.oz, c.half, air || !c.ids ? 0 : c.amt);
    u.tWarmIds.value = c.ids;
    u.tWarmTow.value = c.tow;
    u.tWarmAir.value = c.air;
    u.uColdTint.value.fromArray(c.tint);
    u.uColdFog.value.fromArray(c.fog);
    u.uColdLead.value.fromArray(c.lead);
    u.uColdSnowNight.value.fromArray(c.snowNight);
    u.uColdP.value.set(c.tintAmt, c.lift, c.fogMul, c.fogMax);
    u.uColdQ.value.set(c.sky, c.mist, c.rim);
    u.uColdStorm.value.set(c.storm[0], c.storm[1], c.storm[2], c.gloom);
    u.uColdTop.value.set(c.top > 0 ? c.top : 1e9, Math.max(c.topSoft, 0.01), c.under);
    (u.uColdPk.value as THREE.Vector4[]).forEach((v, i) => v.set(c.pockets[i * 4] ?? 0, c.pockets[i * 4 + 1] ?? 0, c.pockets[i * 4 + 2] ?? 0, c.pockets[i * 4 + 3] ?? 0));

    const drawOverlay = (target: THREE.WebGLRenderTarget | null) => {
      const o = this.overlay;
      if (!o || !o.scene.children.some((c) => c.visible)) return;
      o.tND.value = this.gbuf.textures[1];
      (o.uRes.value as THREE.Vector2).set(this.w, this.h);
      const auto = r.autoClear;
      r.autoClear = false;
      r.setRenderTarget(target);
      r.render(o.scene, camera);
      r.autoClear = auto;
    };
    if (s.fxaa) {
      this.composite.render(r, this.comp);
      drawOverlay(this.comp);
      this.fxaa.material.uniforms.tDiffuse.value = this.comp.texture;
      this.fxaa.render(r, null);
    } else {
      this.composite.render(r, null);
      drawOverlay(null);
    }
  }
}
