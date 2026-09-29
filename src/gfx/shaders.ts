// GLSL for every scene material. All scene shaders write two targets:
//   gColor: rgb = lit albedo, a = emissive strength (for bloom)
//   gND:    xyz = view-space normal, w = linear view depth (for outlines/fog)
// Materials are GLSL3 ShaderMaterials (three declares position/normal/uv and
// the standard matrices for us).

import { SAPLING } from '../world/harvest';

export const COMMON = /* glsl */ `
precision highp float;
uniform vec3 uLightDir;
uniform vec3 uLightCol;
uniform vec3 uMidCol;
uniform vec3 uShadeCol;
uniform float uBand1;
uniform float uBand2;
uniform float uTime;
uniform float uNight;
uniform sampler2D uNoise;

vec3 toonLight(vec3 n) {
  float d = dot(n, uLightDir);
  return d > uBand1 ? uLightCol : (d > uBand2 ? uMidCol : uShadeCol);
}

// The one "you can use this" signal (story interactables): a hard-edged warm
// rim that breathes, plus a slow shimmer that sweeps across the form now and
// then. Returns (rim amount, shimmer amount); callers tint and add emissive.
vec2 glintAmt(vec3 n, vec3 viewDir, vec3 world, float k) {
  if (k <= 0.0) return vec2(0.0);
  float fres = 1.0 - abs(dot(n, viewDir));
  float pulse = 0.55 + 0.45 * sin(uTime * 2.4);
  float rim = step(0.8 - 0.08 * k, fres) * pulse;
  float sweep = fract((world.x + world.z) * 0.11 + world.y * 0.16 - uTime * 0.32);
  float shimmer = step(0.955, sweep) * step(sweep, 0.978);
  return vec2(rim, shimmer) * min(k, 1.5);
}
const vec3 GLINT_COL = vec3(1.0, 0.94, 0.72);
`;

export const GBUF_OUT = /* glsl */ `
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gND;
// Props store half-length normals so post passes can tell them from ground;
// creatures (uIsProp = 2) store 0.62 so outlines can treat them gently.
uniform float uIsProp;
void writeG(vec3 col, float emissive, vec3 nWorld, vec3 viewPos) {
  gColor = vec4(col, emissive);
  float tag = uIsProp > 1.5 ? 0.62 : uIsProp > 0.5 ? 0.5 : 1.0;
  gND = vec4(normalize((viewMatrix * vec4(nWorld, 0.0)).xyz) * tag, -viewPos.z);
}
`;

// ------------------------------------------------------------------ terrain

export const TERRAIN_VERT = /* glsl */ `
in vec4 aBiome;
out vec3 vWorld;
out vec3 vN;
out vec4 vBiome;
out vec3 vView;
out float vH;
void main() {
  vec3 p = position;
  vH = p.y;
  // Sink the seabed with distance only, so far shorelines never z-fight with
  // the water plane while near shores keep their true shape.
  vec4 wp0 = modelMatrix * vec4(p, 1.0);
  float push = clamp(length(wp0.xyz - cameraPosition) / 400.0, 0.0, 8.0);
  if (p.y < 0.0) p.y -= push * min(1.0, -p.y * 2.0);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vN = normal;
  vBiome = aBiome;
  vec4 vp = viewMatrix * wp;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

export const TERRAIN_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vWorld;
in vec3 vN;
in vec4 vBiome;
in vec3 vView;
in float vH;
uniform vec3 cMeadow;
uniform vec3 cMeadowDark;
uniform vec3 cForest;
uniform vec3 cHeath;
uniform vec3 cRock;
uniform vec3 cRockDark;
uniform vec3 cSnow;
uniform vec3 cSand;
uniform vec3 cPath;
uniform vec3 cSeabed;
uniform vec3 cStroke;
uniform float uSnowLine;
uniform float uStrokes;
uniform vec3 uPlayerFeet;
uniform float uPlayerLift;
// Creature contact shadows: xyz = ground point under it, w = radius (0 = off).
uniform vec4 uMobShadow[12];
// Cast shadows from props (gfx/groundShadow.ts): a top-down coverage mask.
uniform sampler2D uGroundShadow;
uniform vec4 uShadowRect;   // min x, min z, 1 / size, strength
uniform vec2 uShadowFade;   // camera distance where shadows fade out

float groundShadow(vec2 xz, float dist) {
  if (uShadowRect.w <= 0.0) return 0.0;
  vec2 uv = (xz - uShadowRect.xy) * uShadowRect.z;
  float edge = min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y));
  if (edge <= 0.0) return 0.0;
  // Threshold the filtered mask: crisp, hard-edged shapes at any texel size.
  float k = smoothstep(0.38, 0.62, texture(uGroundShadow, uv).r);
  k *= smoothstep(0.0, 0.06, edge) * (1.0 - smoothstep(uShadowFade.x, uShadowFade.y, dist));
  return k * uShadowRect.w;
}

// Storybook ground marks: short curved dashes scattered in world space,
// only near the camera (they'd shimmer further out).
float strokeCell(vec2 p, float scale, float salt) {
  vec2 cell = floor(p / scale);
  vec2 f = p / scale - cell;
  vec4 r = texture(uNoise, (cell * 7.0 + salt) / 256.0 + salt * 0.37);
  if (r.a < 0.5) return 0.0;
  vec2 c = vec2(0.25 + 0.5 * r.r, 0.25 + 0.5 * r.g);
  float ang = (r.b - 0.5) * 1.3;
  vec2 d = f - c;
  d = vec2(cos(ang) * d.x - sin(ang) * d.y, sin(ang) * d.x + cos(ang) * d.y);
  float len = 0.09 + 0.12 * fract(r.r * 13.7);
  float bend = (fract(r.g * 7.3) - 0.5) * 5.0;
  float curve = d.y - bend * d.x * d.x;
  float w = 0.012 + 0.012 * (1.0 - abs(d.x) / len);
  return step(abs(d.x), len) * step(abs(curve), w);
}

// Storybook ground marks: short curved dashes, jittered and rotated per cell
// on two offset lattices so no grid reads through. Only near the camera.
float strokes(vec2 p, float dist) {
  if (dist > 60.0 || uStrokes < 0.5) return 0.0;
  float m = max(strokeCell(p, 1.9, 0.0), strokeCell(p + vec2(0.83, 1.37), 2.3, 3.1));
  return m * (1.0 - smoothstep(30.0, 60.0, dist));
}

void main() {
  vec3 n = normalize(vN);
  float slope = 1.0 - n.y;
  vec4 nz = texture(uNoise, vWorld.xz / 210.0);
  vec4 nz2 = texture(uNoise, vWorld.xz / 27.0);
  float h = vH;
  float dist = length(vView);
  float forest = vBiome.x;
  float rocky = vBiome.y;
  float path = vBiome.z;

  vec3 c = cMeadow;
  bool grass = true;
  if (nz.r * 0.8 + nz2.g * 0.35 > 0.68) c = cMeadowDark;
  if (forest + (nz2.r - 0.5) * 0.3 > 0.42) c = cForest;
  float heathLine = 105.0 + (nz.g - 0.5) * 70.0;
  if (h > heathLine) c = cHeath;
  // Far terrain simplifies: slope detail fades so coarse chunks don't show
  // their triangles, leaving height bands (moor / snow) as flat layers.
  float farK = smoothstep(500.0, 1600.0, dist);
  float rockT = 0.33 - rocky * 0.08 + (nz2.b - 0.5) * 0.12 + farK * 0.5;
  if (slope > rockT) {
    c = slope + (nz.b - 0.5) * 0.25 > 0.55 ? cRockDark : cRock;
    grass = false;
  }
  if (h < 1.1 + nz2.r * 1.3) { c = cSand; grass = false; }
  if (h < -2.5) c = cSeabed;
  if (path < 0.95 + (nz2.g - 0.5) * 0.6 && h > 0.8) { c = cPath; grass = false; }
  float snowLine = uSnowLine + (nz.r - 0.5) * 80.0 + (texture(uNoise, vWorld.xz / 90.0).b - 0.5) * 18.0;
  bool snow = h > snowLine && slope < 0.8;
  if (snow) { c = cSnow; grass = false; }

  vec3 lightBand = toonLight(n);
  lightBand = mix(lightBand, mix(uMidCol, uLightCol, 0.6), smoothstep(350.0, 1300.0, dist));
  // Cast shadows drop the ground into the shade band, like a hill's far side.
  lightBand = mix(lightBand, uShadeCol, groundShadow(vWorld.xz, dist));
  vec3 col = c * lightBand;
  // Contact shadow under the explorer: a flat ellipse in the shade tone.
  // uPlayerFeet.y is the ground under them; it shrinks as they rise.
  vec2 pd = vWorld.xz - uPlayerFeet.xz;
  float shR = 0.52 / (1.0 + uPlayerLift * 0.12);
  if (dot(pd, pd) < shR * shR && abs(vH - uPlayerFeet.y) < 0.6) col = c * uShadeCol * 0.92;
  for (int i = 0; i < 12; i++) {
    vec4 ms = uMobShadow[i];
    if (ms.w <= 0.0) continue;
    vec2 md = vWorld.xz - ms.xz;
    if (dot(md, md) < ms.w * ms.w && abs(vH - ms.y) < 0.8) col = c * uShadeCol * 0.92;
  }
  if (grass) {
    float s = strokes(vWorld.xz, dist);
    col = mix(col, cStroke * lightBand, s * 0.8);
  }
  // Snow caps resist the monochrome grade: they stay the brightest thing.
  writeG(col, snow ? -0.55 : 0.0, n, vView);
}
`;

// ------------------------------------------------------------------ props

// Instanced props: trees, bushes, rocks, tufts, flowers, cabins.
// aI0 = (x, y, z, scale), aI1 = (rotY, yScale, lean, tone), aKind per vertex.
// The instance pose (scale, wind sway, bend, yaw) is shared with the ground
// shadow casters so shadows sway with their trees.
const PROP_POSE = /* glsl */ `
in vec4 aI0;
in vec4 aI1;
uniform float uTime;
uniform float uBend;
uniform float uWind;
uniform float uHeightRef;
// Taken out of the world (see world/harvest.ts): uHarvestGrid is the prop's
// grid cell size (0 = not harvestable), uHarvestChan 0 = trees, 1 = rocks.
// POI boulders carry aI1.z = 9 and are never taken. Returns 0 = gone, else
// the prop's size factor: a regrowing tree is drawn from a sapling up.
uniform sampler2D uHarvest;
uniform float uHarvestGrid;
uniform float uHarvestChan;
float harvestScale(vec3 base) {
  if (uHarvestGrid <= 0.0 || aI1.z > 5.0) return 1.0;
  ivec2 c = ivec2(floor(base.xz / uHarvestGrid));
  ivec2 t = ((c % 512) + 512) % 512;
  vec4 h = texelFetch(uHarvest, t, 0);
  if (uHarvestChan > 0.5) return max(h.g, h.a) > 0.5 ? 0.0 : 1.0;
  if (h.b > 0.5 || h.r > 0.998) return 0.0;
  return mix(1.0, ${SAPLING.toFixed(3)}, h.r);
}
// Set by main() from harvestScale before posing.
float gGrow = 1.0;
// Local-space vertex after scale, bend and yaw. hN = normalised height.
vec3 propPose(vec3 p, vec3 base, out float hN) {
  float sc = aI0.w * gGrow;
  hN = clamp(p.y / uHeightRef, 0.0, 1.0);
  p.xz *= sc;
  p.y *= sc * aI1.y;
  float sway = sin(uTime * 1.1 + base.x * 0.045 + base.z * 0.06) * uWind
             + sin(uTime * 2.3 + base.z * 0.11) * uWind * 0.35;
  p.x += (aI1.z * uBend + sway) * hN * hN * uHeightRef * sc;
  float c = cos(aI1.x);
  float s = sin(aI1.x);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
`;

export const PROP_VERT = /* glsl */ `
${PROP_POSE}
in float aKind;
uniform float uCutaway;
uniform vec3 uFocus;
out vec3 vN;
out vec3 vView;
out vec3 vLocal;
out float vKind;
out float vTone;
out vec3 vWorld;
void main() {
  vec3 base = (modelMatrix * vec4(aI0.xyz, 1.0)).xyz;
  gGrow = harvestScale(base);
  if (gGrow <= 0.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  float sc = aI0.w * gGrow;
  float sy = aI1.y;
  vLocal = position;
  if (uCutaway > 1.5) {
    // Hide whole trees whose canopy actually blocks the camera->player
    // sightline, instead of slicing them open. The canopy is a cone from
    // ~17% of the height (under the drooping lowest tier) to the tip. A tree
    // right beside the player isn't hidden: the sightline there runs at
    // chest height, under its branches.
    vec2 a = cameraPosition.xz;
    vec2 ab = uFocus.xz - a;
    float L2 = max(dot(ab, ab), 1e-3);
    float L = sqrt(L2);
    float t0 = dot(base.xz - a, ab) / L2;
    float rMax = 2.8 * sc + 0.3;
    float perp = length(base.xz - (a + ab * clamp(t0, 0.0, 1.0)));
    if (perp < rMax) {
      float hTree = uHeightRef * sc * sy;
      float yLow = 0.17 * hTree;
      // Where the sightline crosses the canopy footprint; stop short of the player.
      float span = sqrt(max(rMax * rMax - perp * perp, 0.0)) / L;
      float tEnd = 1.0 - 0.6 / L;
      bool hide = false;
      for (int i = 0; i < 5; i++) {
        float t = clamp(t0 + span * (float(i) * 0.5 - 1.0), 0.0, tEnd);
        vec3 q = mix(cameraPosition, uFocus, t);
        float y = q.y - base.y;
        float cr = y < yLow ? 0.0 : rMax * clamp((hTree - y) / (hTree - yLow), 0.0, 1.0);
        if (length(q.xz - base.xz) < cr) hide = true;
      }
      if (hide) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
      }
    }
  }
  float hN;
  vec3 p = propPose(position, base, hN);
  float c = cos(aI1.x);
  float s = sin(aI1.x);
  vec3 nrm = normal;
  // Tilt normals with the bend so lit sides follow the curve.
  nrm.x -= aI1.z * uBend * hN * 1.5;
  nrm = normalize(vec3(c * nrm.x + s * nrm.z, nrm.y / max(sy, 0.3), -s * nrm.x + c * nrm.z));
  vec4 wp = modelMatrix * vec4(p + aI0.xyz, 1.0);
  vWorld = wp.xyz;
  // Chunk groups are translation-only; story props may rotate (a falling tree).
  vN = normalize(mat3(modelMatrix) * nrm);
  vKind = aKind;
  vTone = aI1.w;
  vec4 vp = viewMatrix * wp;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

// Ground shadow casters: the prop, posed exactly as drawn, flattened along
// the key light onto the plane of its own base and seen from straight above.
// This fills a top-down coverage mask that the terrain samples (see
// gfx/groundShadow.ts). Only the ground receives, so there's no acne or bias.
export const CASTER_VERT = /* glsl */ `
${PROP_POSE}
uniform vec3 uLightDir;
uniform float uShadowReach;
void main() {
  vec3 base = (modelMatrix * vec4(aI0.xyz, 1.0)).xyz;
  gGrow = harvestScale(base);
  if (gGrow <= 0.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  float hN;
  vec3 p = propPose(position, base, hN);
  vec3 w = (modelMatrix * vec4(p + aI0.xyz, 1.0)).xyz;
  // Horizontal run per metre of height, capped so low sun can't smear
  // shadows across the whole mask.
  vec2 run = uLightDir.xz / max(uLightDir.y, 0.05);
  float r = length(run);
  if (r > uShadowReach) run *= uShadowReach / r;
  w.xz -= run * max(w.y - base.y, 0.0);
  w.y = base.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

export const CASTER_FRAG = /* glsl */ `
precision highp float;
out vec4 oMask;
void main() { oMask = vec4(1.0); }
`;

export const PROP_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vN;
in vec3 vView;
in vec3 vLocal;
in float vKind;
in float vTone;
in vec3 vWorld;
uniform vec3 uKind[22];
uniform vec3 uGlow;
/** Story interactable signal strength (0 = none). */
uniform float uGlint;
uniform float uNearCut;
/** Window glow override: < 0 = follow the night (every world cabin); else a lit/unlit story cabin. */
uniform float uWin;
/** Firelight on story interiors (0..1). */
uniform float uFire;
uniform float uToneVar;
uniform float uFlip;
uniform float uCutaway;
uniform vec3 uFocus;
// Kinds: 0 foliage, 1 trunk, 2 rock, 3 bush, 4 tuft, 5 flower petal, 6 flower core,
// 7 wall, 8 roof, 9 trim, 10 window, 11 door, 12 stone, 13 wall alt, 14 snowcap(rock),
// 15 harebell, 16 buttercup (petals of kind 5 with instance tone > 0.6),
// 17 cut wood, 18 axe steel, 19 soot, 20 ember glow, 21 roof boards (real planks, no drawn lines)
void main() {
  int k = int(vKind + 0.5);
  if (uCutaway > 0.5) {
    // Cut away foliage between the camera and the player, and anything that
    // would brush the near plane.
    if (-vView.z < uNearCut) discard;
  }
  vec3 n = normalize(vN);
  if (uFlip > 0.5 && !gl_FrontFacing) n = -n;
  vec3 base = uKind[k];
  bool petal = k == 5 || k == 15;
  if (k == 5 && vTone > 0.6) base = uKind[16];
  base *= 1.0 - uToneVar * 0.5 + uToneVar * vTone;
  float emissive = 0.0;
  if ((k == 7 || k == 13) && abs(n.y) > 0.9) {
    // floorboards
    float line = step(0.9, fract(vLocal.z * 3.2));
    base *= 1.0 - 0.16 * line;
  } else if (k == 7 || k == 13) {
    // clapboard lines
    float line = step(0.86, fract(vLocal.y * 2.4));
    base *= 1.0 - 0.18 * line;
  } else if (k == 8) {
    float line = step(0.84, fract((vLocal.y + abs(vLocal.z) * 0.9) * 2.2));
    base *= 1.0 - 0.2 * line;
  } else if (k == 10) {
    float w = uWin < 0.0 ? uNight : uWin;
    base = mix(base, uGlow, w);
    emissive = w;
  } else if (k == 20) {
    emissive = 0.9;
  }
  vec3 col = k == 10 || k == 20 ? base : base * toonLight(n);
  // Firelight: interior faces warm up and flicker when the hearth is lit.
  if (uFire > 0.0 && k != 10 && k != 20) {
    float fl = 0.85 + 0.15 * sin(uTime * 9.0 + vWorld.x * 2.0) * sin(uTime * 5.3);
    col = mix(col, base * vec3(1.25, 0.86, 0.55), uFire * 0.55 * fl);
  }
  // Negative alpha = partial opt-out of the monochrome grade (accent colours).
  if (emissive == 0.0 && (k == 7 || k == 8 || k == 21)) emissive = -0.45;
  if (emissive == 0.0 && (k == 17 || k == 18)) emissive = -0.3;
  if (petal) emissive = -0.35;
  if (uGlint > 0.0) {
    vec2 g = glintAmt(n, normalize(-vView), vWorld, uGlint);
    col = mix(col, GLINT_COL, max(g.x * 0.85, g.y * 0.55));
    if (g.x > 0.0) emissive = max(emissive, 0.55 * g.x);
    else if (g.y > 0.0) emissive = max(emissive, 0.25);
  }
  writeG(col, emissive, n, vView);
}
`;

// ------------------------------------------------------------------ water

export const WATER_VERT = /* glsl */ `
out float vDepth;
out vec3 vWorld;
out vec3 vView;
void main() {
  vec3 p = position;
  vDepth = -p.y;
  p.y = 0.0;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vec4 vp = viewMatrix * wp;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

export const WATER_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in float vDepth;
in vec3 vWorld;
in vec3 vView;
uniform vec3 cDeep;
uniform vec3 cShallow;
uniform vec3 cFoam;
uniform vec3 cReflect;
void main() {
  float d = vDepth;
  if (d < -0.05) discard;
  vec4 nz = texture(uNoise, vWorld.xz / 60.0 + vec2(uTime * 0.004, uTime * 0.002));
  vec3 c = cDeep;
  if (d < 1.6 + nz.r * 1.6) c = cShallow;
  float foamW = 0.28 + 0.14 * sin(uTime * 1.3 + nz.g * 9.0);
  if (d < foamW) c = cFoam;
  vec3 V = normalize(cameraPosition - vWorld);
  // Grazing view: a hard sky-reflection band.
  if (V.y < 0.07) c = mix(c, cReflect, 0.45);
  // Sparkle streaks: long horizontal dashes drifting slowly.
  float dist = length(vView);
  vec2 sp = vec2(vWorld.x * 0.012 + uTime * 0.01, vWorld.z * 0.09);
  float st = texture(uNoise, sp).g * 0.7 + texture(uNoise, sp * 3.1).b * 0.3;
  if (st > 0.74 && dist < 900.0 && c != cFoam) c = mix(c, cReflect, 0.55);
  writeG(c, -0.55, vec3(0.0, 1.0, 0.0), vView);
}
`;

// ------------------------------------------------------------------ sky

export const FS_VERT = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const SKY_FRAG = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gND;
in vec2 vUv;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uSkyTop;
uniform vec3 uSkyMid;
uniform vec3 uSkyHorizon;
uniform vec3 uSunGlow;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uStars;
uniform float uSkyBands;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dirV = normalize(v.xyz / v.w);
  vec3 dir = normalize((uCamWorld * vec4(dirV, 0.0)).xyz);
  float e = dir.y;
  // Banded gradient: quantise elevation into flat strips (inspo/2).
  float t = clamp(e / 0.55, 0.0, 1.0);
  float tq = floor(pow(t, 0.7) * uSkyBands) / uSkyBands;
  vec3 col = tq < 0.5 ? mix(uSkyHorizon, uSkyMid, tq * 2.0) : mix(uSkyMid, uSkyTop, (tq - 0.5) * 2.0);
  if (e < 0.0) col = uSkyHorizon;
  // Sun-side glow band near the horizon.
  float sd = dot(dir, uSunDir);
  float glow = step(0.975, sd) * 0.35 + step(0.993, sd) * 0.4;
  col = mix(col, uSunGlow, glow * step(-0.1, uSunDir.y));
  float emissive = 0.0;
  // Sun disc: flat, pale.
  if (sd > 0.9994 && uSunDir.y > -0.05) { col = uSunCol; emissive = 0.35; }
  // Moon: crescent at night.
  float md = dot(dir, uMoonDir);
  if (uStars > 0.2 && md > 0.99965) {
    vec3 off = normalize(uMoonDir + vec3(0.012, 0.006, 0.0));
    if (dot(dir, off) < 0.99968) { col = vec3(0.97, 0.95, 0.88); emissive = 0.6; }
  }
  // Stars.
  if (uStars > 0.01 && e > 0.03) {
    vec2 sp = vec2(atan(dir.z, dir.x) * 180.0, asin(e) * 180.0);
    vec2 cell = floor(sp);
    float h = hash12(cell);
    if (h > 0.985) {
      vec2 f = fract(sp) - 0.5 - (vec2(hash12(cell + 7.1), hash12(cell + 3.3)) - 0.5) * 0.6;
      float tw = 0.7 + 0.3 * sin(uTime * 2.0 + h * 100.0);
      float r = 0.11 + 0.1 * step(0.996, h);
      if (length(f) < r) { col = mix(col, vec3(0.95, 0.93, 0.85), uStars * tw * smoothstep(0.03, 0.15, e)); emissive = 0.2 * uStars; }
    }
  }
  gColor = vec4(col, emissive);
  gND = vec4(0.0, 0.0, 0.0, 1.0e5);
}
`;

// ------------------------------------------------------------------ clouds

// Camera-centred billboards on a far dome. aC0 = (azimuth, elevation, width, seed)
export const CLOUD_VERT = /* glsl */ `
in vec4 aC0;
uniform float uCloudDist;
uniform float uCloudDrift;
out vec2 vP;
out float vSeed;
out float vElev;
void main() {
  float az = aC0.x + uCloudDrift;
  float el = aC0.y;
  vec3 dir = vec3(cos(az) * cos(el), sin(el), sin(az) * cos(el));
  vec3 right = normalize(vec3(-dir.z, 0.0, dir.x));
  vec3 up = vec3(0.0, 1.0, 0.0);
  float w = aC0.z;
  float h = w * 0.42;
  vP = vec2(position.x, position.y);
  vec3 wp = cameraPosition + dir * uCloudDist + right * position.x * w * 0.5 + up * (position.y * h);
  vSeed = aC0.w;
  vElev = el;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

export const CLOUD_FRAG = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gND;
in vec2 vP;
in float vSeed;
in float vElev;
uniform vec3 uCloud;
uniform vec3 uCloudShade;
uniform vec3 uCloudRim;
uniform vec3 uCloudLine;
uniform vec3 uSkyHorizon;

float h1(float n) { return fract(sin(n) * 43758.5453); }

// Signed distance to a puffy flat-bottomed cloud in a [-1,1]x[0,1] box.
float cloudSdf(vec2 p) {
  float d = 1e5;
  float n = 5.0 + floor(h1(vSeed * 3.1) * 3.0);
  for (int i = 0; i < 8; i++) {
    if (float(i) >= n) break;
    float fi = float(i) / (n - 1.0);
    float x = mix(-0.72, 0.72, fi) + (h1(vSeed + float(i) * 1.7) - 0.5) * 0.12;
    float bell = 1.0 - pow(abs(fi - 0.5) * 2.0, 1.6);
    float r = 0.14 + 0.3 * bell * (0.75 + 0.5 * h1(vSeed * 1.3 + float(i)));
    float y = r * 0.5 + 0.02;
    vec2 q = (p - vec2(x, y)) * vec2(1.0, 0.84);
    d = min(d, length(q) - r);
  }
  // Flat bottom.
  return max(d, 0.03 - p.y);
}

void main() {
  vec2 p = vec2(vP.x, vP.y);
  float d = cloudSdf(p);
  if (d > 0.0) discard;
  vec3 col = uCloud;
  float lineW = 0.012;
  if (p.y < 0.075) col = uCloudRim;
  else if (p.y < 0.2 && d > -0.08) col = uCloudShade;
  if (d > -lineW || abs(p.y - 0.075) < lineW * 0.5) col = uCloudLine;
  // Low clouds sink into the horizon haze.
  col = mix(col, uSkyHorizon, (1.0 - smoothstep(0.02, 0.25, vElev)) * 0.55);
  gColor = vec4(col, 0.0);
  gND = vec4(0.0, 0.0, 0.0, 1.0e5);
}
`;

// ------------------------------------------------------------------ simple toon (character etc.)

export const SOLID_VERT = /* glsl */ `
out vec3 vN;
out vec3 vView;
void main() {
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 vp = modelViewMatrix * vec4(position, 1.0);
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

export const SOLID_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vN;
in vec3 vView;
uniform vec3 uColor;
uniform float uEmissive;
uniform float uKeep;
uniform float uFlat;
uniform float uGlint;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 col = uEmissive > 0.0 ? uColor : uColor * mix(toonLight(n), uLightCol, uFlat);
  float em = uEmissive > 0.0 ? uEmissive : -uKeep;
  if (uGlint > 0.0) {
    vec2 g = glintAmt(n, normalize(-vView), vView, uGlint);
    col = mix(col, GLINT_COL, max(g.x * 0.85, g.y * 0.55));
    if (g.x > 0.0) em = max(em, 0.55 * g.x);
  }
  // The explorer keeps most of their colour so they read against the land.
  writeG(col, em, n, vView);
}
`;

// ------------------------------------------------------------------ creatures
// Instanced creature parts (woffs, crows). Per-vertex colour (aCol.rgb) so a
// whole creature body is one merged mesh; aCol.a tags where features are
// painted: 1 = eyes (around uEyeOrigin), 2 = mouth (around uMouthOrigin),
// 3 = a lamp that glows at night.
// Per instance: instanceColor = tint, aEye = (lookX, lookY, lids, unused)
// where lids 1 = open, 0 = shut, -1 = happy arcs.

export const CREATURE_VERT = /* glsl */ `
in vec4 aCol;
in float aTint;
in vec4 aEye;
out vec3 vN;
out vec3 vView;
out vec3 vObj;
out vec4 vCol;
out vec4 vEye;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vObj = position;
  // Parts squash and stretch, so normals need the inverse transpose.
  vN = normalize(inverse(transpose(mat3(m))) * normal);
  vCol = aCol;
#ifdef USE_INSTANCING_COLOR
  vCol.rgb *= mix(vec3(1.0), instanceColor, aTint);
#endif
  vEye = aEye;
  vec4 vp = viewMatrix * (m * vec4(position, 1.0));
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

export const CREATURE_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vN;
in vec3 vView;
in vec3 vObj;
in vec4 vCol;
in vec4 vEye;
uniform float uKeep;
uniform vec3 uInk;
uniform vec3 uWhite;
uniform vec3 uEyeOrigin;
/** Eye centre (yaw, pitch) in radians from the face centre, mirrored in x. */
uniform vec2 uEyePos;
uniform vec2 uEyeSize;
uniform vec2 uPupil;
/** How far pupils can travel for a look of 1. */
uniform vec2 uLookRange;
/** Eye rotation: + lifts the outer corners. */
uniform float uEyeTilt;
uniform vec3 uMouthOrigin;
/** Mouth: (y centre, half width, curve), in radians around uMouthOrigin. */
uniform vec3 uMouth;
/** A little "w" mouth painted with the eyes: (y, half-spacing, curve); y = 0 = none. */
uniform vec3 uMouthW;
/** Cheek blush: (yaw, pitch, radius x, radius y), mirrored; radius 0 = none. */
uniform vec4 uBlush;
uniform vec3 uBlushCol;
uniform vec3 uGlow;
/** Hearth-spirit warmth glow (0 = none): flattens shading and blooms. */
uniform float uEmber;
/**
 * 0..1: the normal written for the outline pass leans toward the camera, so
 * creases where one part meets another (a neck into a body) don't ink.
 * Silhouettes still do, from depth. Lighting uses the true normal.
 */
uniform float uSoftCrease;

float fillE(float d, float aa) { return 1.0 - smoothstep(-0.5 * aa, 0.5 * aa, d); }
vec2 sphereUV(vec3 d) { return vec2(atan(d.x, d.z), asin(clamp(d.y, -1.0, 1.0))); }

void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  // Far away (and usually seen from below) a creature would be mostly its
  // shaded belly and read as a dark blot: flatten it toward the lit tones,
  // as distant terrain does.
  float far = smoothstep(20.0, 110.0, length(vView));
  vec3 col = vCol.rgb * mix(toonLight(n), mix(uMidCol, uLightCol, 0.65), far * 0.9);
  // A touch of aerial haze: dark coats soften toward the sky tone with
  // distance instead of reading as holes in it.
  col = mix(col, uLightCol * 0.92, smoothstep(35.0, 220.0, length(vView)) * 0.4);
  float keep = uKeep;
  float tag = vCol.a;
  if (tag > 0.5 && tag < 1.5) {
    vec3 dir = normalize(vObj - uEyeOrigin);
    vec2 p = sphereUV(dir);
    vec2 m = vec2(abs(p.x), p.y);
    // Pixel size in radians, from the direction (atan wraps at the back).
    float aa = max(length(fwidth(dir)), 1e-4);
    float lw = max(0.012, aa * 1.1);
    float lids = vEye.z;
    if (uBlush.z > 0.0) {
      vec2 bq = (m - uBlush.xy) / uBlush.zw;
      col = mix(col, uBlushCol * toonLight(n), fillE((length(bq) - 1.0) * uBlush.w, aa) * 0.8);
    }
    if (uMouthW.x != 0.0) {
      // Two little arcs meeting in the middle, like a cat's mouth.
      float u = abs(p.x) - uMouthW.y;
      float y = uMouthW.x + uMouthW.z * u * u;
      float w = max(abs(p.y - y) - lw * 0.8, abs(p.x) - uMouthW.y * 2.0);
      col = mix(col, uInk, fillE(w, aa));
    }
    float ct = cos(uEyeTilt), st = sin(uEyeTilt);
    vec2 me = uEyePos + mat2(ct, st, -st, ct) * (m - uEyePos);
    vec2 q = (me - uEyePos) / uEyeSize;
    float d = (length(q) - 1.0) * min(uEyeSize.x, uEyeSize.y);
    if (lids > 0.02) {
      // Whites squash shut from the top and bottom.
      vec2 r = vec2(uEyeSize.x, uEyeSize.y * lids);
      vec2 qq = (me - uEyePos) / r;
      d = (length(qq) - 1.0) * min(r.x, r.y);
      float white = fillE(d, aa);
      col = mix(col, uWhite * mix(uLightCol, vec3(1.0), 0.55 - 0.25 * uNight), white);
      // Pupils share one look direction so they never cross.
      vec2 room = max(r - uPupil * vec2(1.0, lids) * 1.15, 0.0);
      vec2 lk = clamp(vEye.xy * uLookRange, -room, room);
      vec2 pc = vec2(sign(p.x) * uEyePos.x, uEyePos.y) + lk;
      vec2 pq = (p - pc) / (uPupil * vec2(1.0, max(lids, 0.2)));
      float pd = (length(pq) - 1.0) * min(uPupil.x, uPupil.y);
      col = mix(col, uInk, fillE(max(pd, d), aa));
      col = mix(col, uInk, fillE(abs(d) - lw * 0.6, aa));
      keep = mix(keep, 0.95, white);
    } else if (lids < -0.02) {
      // Happy: upward arcs.
      vec2 c = uEyePos - vec2(0.0, uEyeSize.y * 0.35);
      float arc = abs(length((m - c) / vec2(1.0, 1.25)) - uEyeSize.x * 0.75) - lw;
      arc = max(arc, c.y - m.y);
      col = mix(col, uInk, fillE(arc, aa));
    } else {
      float line = max(abs(m.y - uEyePos.y) - lw * 0.8, abs(m.x - uEyePos.x) - uEyeSize.x * 0.85);
      col = mix(col, uInk, fillE(line, aa));
    }
  } else if (tag > 1.5 && tag < 2.5) {
    // A small frown: a curve that droops at both ends (inspo woff).
    vec3 dir = normalize(vObj - uMouthOrigin);
    vec2 p = sphereUV(dir);
    float aa = max(length(fwidth(dir)), 1e-4);
    float lw = max(0.02, aa * 1.1);
    float y = uMouth.x - uMouth.z * p.x * p.x;
    float mouth = max(abs(p.y - y) - lw, abs(p.x) - uMouth.y);
    col = mix(col, uInk, fillE(mouth, aa));
  }
  float glow = 0.0;
  if (tag > 2.5) {
    // A lamp (bicycles): lit warm at night, like the cabin windows.
    col = mix(col, uGlow, uNight);
    glow = uNight;
  }
  if (uEmber > 0.0 && tag < 2.5) {
    // A warm spirit glows from within: less shade, a soft bloom. Painted
    // eyes (ink/white) stay crisp.
    float paint = clamp(1.0 - length(col - vCol.rgb * toonLight(n)) * 4.0, 0.0, 1.0);
    // Self-lit: its own colour with a soft two-band form, whatever the sky does.
    vec3 self = vCol.rgb * (dot(n, uLightDir) > uBand2 ? 1.0 : 0.84);
    col = mix(col, self, min(1.0, uEmber * 1.3) * paint);
    // Emissive >= 0.5 also exempts it from the monochrome grade (see post),
    // which is the point: a warm spirit stays warm under a blue night.
    if (uEmber > 0.3 && paint > 0.5) glow = max(glow, 0.52 + 0.06 * sin(uTime * 3.0));
  }
  vec3 gn = n;
  if (uSoftCrease > 0.0) gn = normalize(mix(n, transpose(mat3(viewMatrix)) * normalize(-vView), uSoftCrease));
  writeG(col, glow > 0.02 ? glow : -keep, gn, vView);
}
`;

// ------------------------------------------------------------------ explorer face
// Features are painted on the head sphere (object space = unit sphere) with
// their own thin ink, not the scene outline pass, whose lines are too heavy
// at face scale. Coordinates are (yaw, pitch) radians from the face centre.

/**
 * Tunable round-eye face, live in the debug panel (Player → Face). Angles
 * are radians on the head: x = yaw from the face centre (+ = the
 * character's left), y = pitch (+ = up).
 */
export const FACE_PARAMS = [
  { key: 'eyeSpacing', value: 0.395, min: 0.1, max: 0.6, step: 0.005 },
  { key: 'eyeHeight', value: 0.39, min: -0.3, max: 0.4, step: 0.005 },
  { key: 'eyeWidth', value: 0.25, min: 0.03, max: 0.35, step: 0.005 },
  { key: 'eyeTall', value: 0.45, min: 0.03, max: 0.45, step: 0.005 },
  { key: 'eyeSquareness', value: 3.05, min: 1.5, max: 5, step: 0.05 },
  { key: 'eyeTilt', value: 0.06, min: -0.6, max: 0.6, step: 0.01 },
  { key: 'outline', value: 0.001, min: 0, max: 0.03, step: 0.0005 },
  { key: 'pupilWidth', value: 0.043, min: 0.005, max: 0.15, step: 0.002 },
  { key: 'pupilTall', value: 0.137, min: 0.005, max: 0.25, step: 0.002 },
  { key: 'lookX', value: 0, min: -0.15, max: 0.15, step: 0.002 },
  { key: 'lookY', value: -0.02, min: -0.2, max: 0.2, step: 0.002 },
  { key: 'noseX', value: -0.03, min: -0.3, max: 0.3, step: 0.005 },
  { key: 'noseHeight', value: -0.13, min: -0.5, max: 0.2, step: 0.005 },
  { key: 'noseSize', value: 0.05, min: 0, max: 0.15, step: 0.002 },
  { key: 'mouthHeight', value: -0.42, min: -0.8, max: -0.05, step: 0.005 },
  { key: 'mouthX', value: 0.055, min: -0.3, max: 0.3, step: 0.005 },
  { key: 'mouthWidth', value: 0.205, min: 0.02, max: 0.5, step: 0.005 },
  { key: 'mouthCurve', value: 0.9, min: -3, max: 5, step: 0.05 },
  { key: 'mouthCurl', value: 4, min: 0, max: 20, step: 0.25 },
  { key: 'mouthLine', value: 0.008, min: 0.002, max: 0.03, step: 0.0005 },
] as const;
const FACE_DEFINES = FACE_PARAMS.map((p, i) => `#define F_${p.key} uFace[${i}]`).join('\n');

export const FACE_VERT = /* glsl */ `
out vec3 vN;
out vec3 vView;
out vec3 vObj;
void main() {
  vObj = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 vp = modelViewMatrix * vec4(position, 1.0);
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

export const FACE_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vN;
in vec3 vView;
in vec3 vObj;
uniform vec3 uColor;
uniform vec3 uInk;
uniform vec3 uWhite;
uniform vec3 uBrow;
/** 0 = solid ink ovals, 1 = round whites with small pupils. */
uniform float uEyeType;
/** 1 open .. 0 shut. */
uniform float uBlink;
uniform float uFace[${FACE_PARAMS.length}];
/** Animated gaze (idle glances, heading), added to lookX/lookY. */
uniform vec2 uLook;
${FACE_DEFINES}

// Approximate signed distance to an ellipse, in the same units as p.
float ell(vec2 p, vec2 c, vec2 r) {
  vec2 q = (p - c) / r;
  return (length(q) - 1.0) * min(r.x, r.y);
}
// Edges resolve over one pixel: wider AA smears small features at distance.
float fill(float d, float aa) { return 1.0 - smoothstep(-0.5 * aa, 0.5 * aa, d); }
// Superellipse: power 2 = ellipse, higher = squarer.
float sell(vec2 p, vec2 c, vec2 r, float n) {
  vec2 q = abs((p - c) / r);
  return (pow(pow(q.x, n) + pow(q.y, n), 1.0 / n) - 1.0) * min(r.x, r.y);
}

void main() {
  vec3 n = normalize(vN);
  vec3 dir = normalize(vObj);
  vec2 p = vec2(atan(dir.x, dir.z), asin(clamp(dir.y, -1.0, 1.0)));
  vec2 m = vec2(abs(p.x), p.y);
  float aa = max(fwidth(p.x), fwidth(p.y));
  // Lines never go thinner than ~1px, so the face survives distance.
  float lw = max(0.011, aa * 1.1);

  vec3 lit = toonLight(n);
  vec3 col = uColor * lit;
  float open = max(uBlink, 0.0);

  // Proportions measured from inspo/char1 (face = brim to scarf here):
  // whites ~1/3 face wide and ~0.4 face tall with only a quarter-eye gap,
  // slim oval pupils, the nose hooked over the whites' lower inner edges,
  // and a wide off-centre grin low on the face (~0.8 of the way down).
  bool round = uEyeType > 0.5;
  float ink = lw * 1.3;
  float white = 0.0;
  if (!round) {
    vec2 bq = m - vec2(0.3, 0.02);
    float brow = abs(length(bq) - 0.24) - lw * 0.9;
    brow = max(max(brow, abs(m.x - 0.3) - 0.075), -bq.y);
    col = mix(col, uBrow * mix(lit, uLightCol, 0.5), fill(brow, aa));
    vec2 r = vec2(0.058, max(0.092 * open, lw));
    col = mix(col, uInk, fill(ell(m, vec2(0.3, 0.07), r), aa));
  } else {
    // All values come from FACE_PARAMS (debug panel: Player → Face).
    vec2 c = vec2(F_eyeSpacing, F_eyeHeight);
    vec2 r = vec2(F_eyeWidth, F_eyeTall * open);
    // Tilt: + lifts the outer corners.
    float ct = cos(F_eyeTilt), st = sin(F_eyeTilt);
    vec2 me = c + mat2(ct, st, -st, ct) * (m - c);
    float d = open > 0.0 ? sell(me, c, r, F_eyeSquareness) : 1.0;
    white = fill(d, aa);
    col = mix(col, uWhite * mix(uLightCol, vec3(1.0), 0.55 - 0.25 * uNight), white);
    // Pupils share one look direction (not mirrored), so they never cross.
    vec2 lk = vec2(F_lookX, F_lookY) + uLook;
    lk = clamp(lk, -max(r - vec2(F_pupilWidth, F_pupilTall * open) * 1.1, 0.0), max(r - vec2(F_pupilWidth, F_pupilTall * open) * 1.1, 0.0));
    vec2 pc = vec2(sign(p.x) * c.x, c.y) + lk;
    float pupil = ell(p, pc, vec2(F_pupilWidth, F_pupilTall * open));
    col = mix(col, uInk, fill(max(pupil, d), aa));
    if (F_outline > 0.0) col = mix(col, uInk, fill(abs(d) - max(F_outline, aa * 0.5), aa));
    if (open <= 0.0) col = mix(col, uInk, fill(max(abs(p.y - c.y) - lw * 0.7, abs(m.x - c.x) - r.x * 0.85), aa));
  }

  // Nose: an open "c" hook.
  vec2 nc = round ? vec2(F_noseX, F_noseHeight) : vec2(0.02, -0.1);
  float nr = round ? F_noseSize : 0.04;
  vec2 nq = p - nc;
  float nose = abs(length(nq) - nr) - max(0.0066, aa * 0.5);
  nose = max(nose, nq.x / max(length(nq), 1e-4) - 0.35);
  if (nr > 0.001) col = mix(col, uInk, fill(nose, aa));

  // Mouth: a long closed grin, off-centre, one end curling up.
  float my = round ? F_mouthHeight : -0.4;
  float mcx = round ? F_mouthX : 0.055;
  float mhw = round ? F_mouthWidth : 0.205;
  float k = round ? F_mouthCurve : 0.9;
  float kc = round ? F_mouthCurl : 4.0;
  float x1 = mcx + mhw;
  float dx = p.x - (mcx - 0.075);
  float curl = max(0.0, p.x - (x1 - 0.08));
  float fy = my + k * dx * dx + kc * curl * curl;
  float slope = 2.0 * k * dx + 2.0 * kc * curl;
  float mouth = abs(p.y - fy) / sqrt(1.0 + slope * slope) - max(round ? F_mouthLine : 0.0088, aa * 0.5);
  mouth = max(mouth, abs(p.x - mcx) - mhw);
  col = mix(col, uInk, fill(mouth, aa));

  if (!gl_FrontFacing) n = -n;
  // Whites skip the grade entirely: the contrast is the point.
  writeG(col, mix(-0.7, -0.95, white), n, vView);
}
`;
