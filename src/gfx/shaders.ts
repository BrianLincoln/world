// GLSL for every scene material. All scene shaders write two targets:
//   gColor: rgb = lit albedo, a = emissive strength (for bloom)
//   gND:    xyz = view-space normal, w = linear view depth (for outlines/fog)
// Materials are GLSL3 ShaderMaterials (three declares position/normal/uv and
// the standard matrices for us).

import { SAPLING } from '../world/harvest';
import { PRINT_GLSL } from '../world/prints';

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
// The giant (uIsProp = 3) stores 0.8: it layers like terrain (anything over
// 0.71 does) and the composite fogs all of it as one flat card.
uniform float uIsProp;
void writeG(vec3 col, float emissive, vec3 nWorld, vec3 viewPos) {
  gColor = vec4(col, emissive);
  float tag = uIsProp > 2.5 ? 0.8 : uIsProp > 1.5 ? 0.62 : uIsProp > 0.5 ? 0.5 : 1.0;
  gND = vec4(normalize((viewMatrix * vec4(nWorld, 0.0)).xyz) * tag, -viewPos.z);
}
`;

// ------------------------------------------------------------------ terrain

export const TERRAIN_VERT = /* glsl */ `
${PRINT_GLSL}
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
  // The giant's footprints are pressed in here, not built into the chunk.
  float lift = printLift(soleSdf(wp.xz, printAt(wp.xz)));
  wp.y += lift;
  vH += lift;
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
${PRINT_GLSL}
uniform vec3 cPrintWarm;
uniform vec3 cPrintEarth;
in vec3 vWorld;
in vec3 vN;
in vec4 vBiome;
in vec3 vView;
in float vH;
uniform vec3 cMeadow;
uniform vec3 cMeadowDark;
uniform vec3 cForest;
uniform vec3 cBog;
uniform vec3 cMud;
uniform vec3 cGlimmer;
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
  // vBiome.w: + bog, - glimmerwood.
  float wild = vBiome.w;
  if (-wild + (nz2.b - 0.5) * 0.3 > 0.35 && forest > 0.3) c = cGlimmer;
  bool bog = wild + (nz2.g - 0.5) * 0.3 > 0.4;
  if (bog) c = h < 0.95 + nz2.r * 0.5 ? cMud : cBog;
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
  if (h < 1.1 + nz2.r * 1.3 && !bog) { c = cSand; grass = false; }
  if (bog && h < 0.95 + nz2.r * 0.5) grass = false;
  if (h < -2.5) c = cSeabed;
  if (path < 0.95 + (nz2.g - 0.5) * 0.6 && h > 0.8) { c = cPath; grass = false; }
  float snowLine = uSnowLine + (nz.r - 0.5) * 80.0 + (texture(uNoise, vWorld.xz / 90.0).b - 0.5) * 18.0;
  bool snow = h > snowLine && slope < 0.8;
  if (snow) { c = cSnow; grass = false; }

  // A footprint: a floor still warm from the giant (rose, glowing faintly
  // at night, cooling back to grass as it walks on), bare squashed earth up
  // the walls and over the lip, and a normal that follows the hollow.
  float em = snow ? -0.55 : 0.0;
  bool printShade = false;
  bool printGlow = false;
  vec4 pr = printAt(vWorld.xz);
  float ps = soleSdf(vWorld.xz, pr);
  if (ps < 4.5) {
    float l0 = printLift(ps);
    vec2 sg = vec2(soleSdf(vWorld.xz + vec2(0.3, 0.0), pr), soleSdf(vWorld.xz + vec2(0.0, 0.3), pr));
    n = normalize(vec3(n.x - (printLift(sg.x) - l0) / 0.3, n.y, n.z - (printLift(sg.y) - l0) / 0.3));
    // The wall that faces away from the light, and the crescent of shadow
    // it throws across the floor: what makes it read as a hole.
    vec2 outw = normalize(sg - ps + 1e-5);
    float toSun = dot(outw, normalize(uLightDir.xz + 1e-5));
    float reach = 0.5 + 2.4 * (1.0 - uLightDir.y);
    printShade = ps < 0.3 && ps > -1.4 - reach * smoothstep(0.3, 0.95, toSun) && toSun > 0.3;
    float warm = ceil(printWarmth(pr) * 4.0) / 4.0;
    float wob = (nz2.g - 0.5) * 0.7;
    if (ps < -1.3 + wob * 0.5) {
      if (warm > 0.0) {
        c = mix(cPrintEarth, cPrintWarm, warm);
        grass = false;
        // Self-lit after dark (0.5 and up skips the night grade): a string of warm lights.
        if (uNight * warm > 0.3) { em = 0.5 + 0.12 * warm; c *= 0.5 + 0.3 * warm; printGlow = true; }
        else em = -0.6 * warm;
      }
    } else if (ps < 1.0 + wob) { c = cPrintEarth; grass = false; em = 0.0; }
  }

  vec3 lightBand = toonLight(n);
  lightBand = mix(lightBand, mix(uMidCol, uLightCol, 0.6), smoothstep(350.0, 1300.0, dist));
  // Cast shadows drop the ground into the shade band, like a hill's far side.
  lightBand = mix(lightBand, uShadeCol, groundShadow(vWorld.xz, dist));
  if (printShade) lightBand = uShadeCol * 0.94;
  if (printGlow) lightBand = printShade ? vec3(0.8) : vec3(1.0);
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
  writeG(col, em, n, vView);
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
// World props (uPrintHide = 1) that stood where the giant has trodden are gone.
uniform float uPrintHide;
${PRINT_GLSL}
bool trodden(vec3 base) {
  if (uPrintHide < 0.5 || aI1.z > 5.0) return false;
  return soleSdf(base.xz, printAt(base.xz)) < 1.0;
}
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
  // Tone > 1.5: drawn elsewhere (beacon towers), here only for shadows.
  if (gGrow <= 0.0 || aI1.w > 1.5 || trodden(base)) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
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
  if (gGrow <= 0.0 || trodden(base)) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
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
uniform vec3 uKind[29];
uniform vec3 uGlow;
/** Story interactable signal strength (0 = none). */
uniform float uGlint;
uniform float uNearCut;
/** Window glow override: < 0 = follow the night (every world cabin); else a lit/unlit story cabin. */
uniform float uWin;
/** Firelight on story interiors (0..1). */
uniform float uFire;
/** Neglect on the ruined cabin (0 = kept, 1 = abandoned): faded, peeling paint, moss. */
uniform float uWear;
uniform float uToneVar;
uniform float uFlip;
uniform float uCutaway;
uniform vec3 uFocus;
// Kinds: 0 foliage, 1 trunk, 2 rock, 3 bush, 4 tuft, 5 flower petal, 6 flower core,
// 7 wall, 8 roof, 9 trim, 10 window, 11 door, 12 stone, 13 wall alt, 14 snowcap(rock),
// 15 harebell, 16 buttercup (petals of kind 5 with instance tone > 0.6),
// 17 cut wood, 18 axe steel, 19 soot, 20 ember glow, 21 roof boards (real planks, no drawn lines),
// 22 bare weathered wood, 23 moss, 24 faded paint (22-24 only via uWear or as moss props),
// 25 cattail, 26 glowcap (shines after dark), 27 toadstool stalk, 28 reed blade
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
  if (uWear > 0.0) {
    // One coordinate along whichever wall this is, one up it (cabin-local).
    vec2 q = vec2(vLocal.x + vLocal.z, vLocal.y);
    if (k == 7 || k == 11) {
      // Sun-faded paint (streaks read as plaid against the clapboard lines).
      base = mix(base, uKind[24], 0.5 * uWear);
      // Peeled back to grey wood a clapboard at a time: ragged along the
      // board, and worst low down where the snow sits.
      float row = floor(q.y * 2.4);
      float along = texture(uNoise, vec2(q.x * 0.11 + row * 0.137, row * 0.29)).r;
      float chip = texture(uNoise, q * 0.6).g;
      float rot = 1.0 - smoothstep(0.3, 1.2, q.y);
      float peel = along + chip * 0.55 + rot * 0.22;
      if (peel > 1.2 - 0.18 * uWear) base = uKind[22];
    } else if (k == 9) {
      // Cream trim flaking to bare wood.
      float chip = texture(uNoise, q * 0.9 + 0.37).g + texture(uNoise, q * 0.25).a * 0.5;
      if (chip > 1.02 - 0.12 * uWear) base = uKind[22];
      else base = mix(base, uKind[22], 0.22 * uWear);
    } else if (k == 21 && n.y > 0.3) {
      // Moss creeping up the roof from the eaves.
      float m = texture(uNoise, vLocal.xz * 0.28).a + texture(uNoise, vLocal.xz * 1.1).g * 0.4;
      m += 0.25 * (1.0 - smoothstep(3.0, 4.0, vLocal.y));
      if (m > 1.2 - 0.2 * uWear) base = uKind[23];
    }
  }
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
  // Glowcaps: lit from within after dark, a soft pulse.
  float capGlow = k == 26 ? uNight * (0.8 + 0.2 * sin(uTime * 1.3 + vWorld.x * 0.7 + vWorld.z)) : 0.0;
  vec3 col = k == 10 || k == 20 ? base : base * toonLight(n);
  if (capGlow > 0.0) { col = mix(col, base * 1.15, capGlow); emissive = 0.55 * capGlow; }
  // Firelight: interior faces warm up and flicker when the hearth is lit.
  if (uFire > 0.0 && k != 10 && k != 20) {
    float fl = 0.85 + 0.15 * sin(uTime * 9.0 + vWorld.x * 2.0) * sin(uTime * 5.3);
    col = mix(col, base * vec3(1.25, 0.86, 0.55), uFire * 0.55 * fl);
  }
  // Negative alpha = partial opt-out of the monochrome grade (accent colours).
  if (emissive == 0.0 && (k == 7 || k == 8 || k == 21 || k == 23)) emissive = -0.45;
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
// 3 = a lamp that glows at night, 4 = glows in its own colour (brighter at night),
// 5 = fire (always bright).
// Per instance: instanceColor = tint, aEye = (lookX, lookY, lids, iris)
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
/** 0..1: a set brow. The top of each eye is cut on a slant, low at the inner corner (resolve, not anger: the eye stays wide). */
uniform float uBrow;
uniform vec3 uMouthOrigin;
/** Mouth: (y centre, half width, curve), in radians around uMouthOrigin. */
uniform vec3 uMouth;
/** A little "w" mouth painted with the eyes: (y, half-spacing, curve); y = 0 = none. */
uniform vec3 uMouthW;
/** Cheek blush: (yaw, pitch, radius x, radius y), mirrored; radius 0 = none. */
uniform vec4 uBlush;
uniform vec3 uBlushCol;
/**
 * Glossy eyes (> 0): no whites, the whole eye is the pupil colour with two
 * shining glints (the kawaii look). Per instance, aEye.w picks an iris
 * colour instead of ink, with a smaller ink pupil inside.
 */
uniform float uGloss;
uniform vec3 uIris;
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
    if (lids > 0.02 && uGloss > 0.0) {
      vec2 r = vec2(uEyeSize.x, uEyeSize.y * lids);
      vec2 qq = (me - uEyePos) / r;
      d = (length(qq) - 1.0) * min(r.x, r.y);
      float e = fillE(d, aa);
      vec2 lk = vEye.xy * uLookRange;
      vec2 ec = vec2(sign(p.x) * uEyePos.x, uEyePos.y);
      vec3 iris = mix(uInk, uIris * mix(uLightCol, vec3(1.0), 0.5), vEye.w);
      col = mix(col, iris, e);
      if (vEye.w > 0.0) {
        vec2 pq = (p - ec - lk * 0.5) / (uPupil * vec2(1.0, max(lids, 0.2)));
        col = mix(col, uInk, fillE(max((length(pq) - 1.0) * min(uPupil.x, uPupil.y), d), aa) * vEye.w);
        col = mix(col, uInk, fillE(abs(d) - lw * 0.6, aa));
      }
      // Glints sit up and to the same side on both eyes (one light), and
      // drift a little with the look.
      vec2 g = (p - ec - lk * 0.3) / uEyeSize.x;
      float g1 = length((g - vec2(0.3, 0.32 * lids)) / vec2(1.0, max(lids, 0.3))) - 0.3 * uGloss;
      float g2 = length((g - vec2(-0.12, -0.1 * lids)) / vec2(1.0, max(lids, 0.3))) - 0.13 * uGloss;
      float gl = fillE(min(g1, g2) * uEyeSize.x, aa) * e;
      col = mix(col, uWhite * mix(uLightCol, vec3(1.0), 0.7), gl);
      keep = mix(keep, 0.95, e);
    } else if (lids > 0.02) {
      // Whites squash shut from the top and bottom.
      vec2 r = vec2(uEyeSize.x, uEyeSize.y * lids);
      vec2 qq = (me - uEyePos) / r;
      d = (length(qq) - 1.0) * min(r.x, r.y);
      if (uBrow > 0.0) d = max(d, (me.y - uEyePos.y) - uEyeSize.y * (1.05 - 0.8 * uBrow) - (me.x - uEyePos.x) * 0.55 * uBrow);
      float white = fillE(d, aa);
      col = mix(col, uWhite * mix(uLightCol, vec3(1.0), 0.55 - 0.25 * uNight), white);
      // Pupils share one look direction so they never cross.
      vec2 room = max(r - uPupil * vec2(1.0, lids) * 1.15, 0.0);
      vec2 lk = clamp(vEye.xy * uLookRange, -room, room);
      vec2 pc = vec2(sign(p.x) * uEyePos.x, uEyePos.y) + lk;
      vec2 pq = (p - pc) / (uPupil * vec2(1.0, max(lids, 0.2)));
      float pd = (length(pq) - 1.0) * min(uPupil.x, uPupil.y);
      // A pupil of no size is no pupil (blank eyes), not a divide by zero.
      if (min(uPupil.x, uPupil.y) > 0.0) col = mix(col, uInk, fillE(max(pd, d), aa));
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
  if (tag > 2.5 && tag < 3.5) {
    // A lamp (bicycles): lit warm at night, like the cabin windows.
    col = mix(col, uGlow, uNight);
    glow = uNight;
  } else if (tag > 4.5) {
    // Fire (a drakitten's rocket): hot and bright day or night, and bright
    // enough to keep its colour through the monochrome grade. Toon bands by
    // how squarely it faces you, so from any side it reads as a white-hot
    // core inside a coloured flame.
    float face = abs(dot(n, normalize(-vView)));
    col = face > 0.82 ? vec3(1.0, 0.97, 0.9) : face > 0.5 ? mix(vCol.rgb, vec3(1.0, 0.95, 0.85), 0.5) : vCol.rgb;
    col *= 1.1;
    glow = 0.85;
  } else if (tag > 3.5) {
    // Bioluminescence (glimmers, moonmoths, lantern hares, storm sparks):
    // its own colour, self-lit; a soft shine by day, a real glow after dark.
    col = mix(col, vCol.rgb * 1.08, 0.55 + 0.45 * uNight);
    glow = 0.3 + 0.45 * uNight;
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
/** How she feels, each 0..1: (sad, worried, frightened, set). All 0 = the usual grin. */
uniform vec4 uMood;
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
    // Worried: the brows' inner ends go up. Frightened: the whole brow does.
    vec2 bq = m - vec2(0.3, 0.02 + uMood.y * ((0.3 - m.x) * 1.5 + 0.015) + uMood.z * 0.05);
    float brow = abs(length(bq) - 0.24) - lw * 0.9;
    brow = max(max(brow, abs(m.x - 0.3) - 0.075), -bq.y);
    col = mix(col, uBrow * mix(lit, uLightCol, 0.5), fill(brow, aa));
    vec2 r = vec2(0.058, max(0.092 * open, lw)) * (1.0 + 0.22 * uMood.z);
    col = mix(col, uInk, fill(ell(m, vec2(0.3, 0.07 - 0.012 * uMood.x), r), aa));
  } else {
    // All values come from FACE_PARAMS (debug panel: Player → Face).
    vec2 c = vec2(F_eyeSpacing, F_eyeHeight);
    vec2 r = vec2(F_eyeWidth, F_eyeTall * open);
    // Tilt: + lifts the outer corners.
    float ct = cos(F_eyeTilt), st = sin(F_eyeTilt);
    vec2 me = c + mat2(ct, st, -st, ct) * (m - c);
    float d = open > 0.0 ? sell(me, c, r, F_eyeSquareness) : 1.0;
    // Sad: heavy upper lids, lowest at the outer corners.
    if (uMood.x > 0.0) d = max(d, m.y - (c.y + r.y * (1.0 - 0.7 * uMood.x) - 0.55 * uMood.x * (m.x - c.x)));
    white = fill(d, aa);
    col = mix(col, uWhite * mix(uLightCol, vec3(1.0), 0.55 - 0.25 * uNight), white);
    // Pupils share one look direction (not mirrored), so they never cross.
    vec2 lk = vec2(F_lookX, F_lookY) + uLook;
    // (Frightened: the pupils shrink.)
    vec2 pr = vec2(F_pupilWidth, F_pupilTall * open) * (1.0 - 0.35 * uMood.z);
    lk = clamp(lk, -max(r - pr * 1.1, 0.0), max(r - pr * 1.1, 0.0));
    vec2 pc = vec2(sign(p.x) * c.x, c.y) + lk;
    float pupil = ell(p, pc, pr);
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
  // The grin gives way to how she feels: sad, a centred frown; set, a short
  // flat line; frightened, it closes up to a small open "o".
  float grin = 1.0 - clamp(uMood.x + uMood.z + uMood.w, 0.0, 1.0);
  mcx = mcx * grin + 0.015 * uMood.w;
  mhw = mhw * grin + 0.125 * uMood.x + 0.11 * uMood.w;
  k = k * grin - 3.4 * uMood.x;
  kc *= grin;
  my += 0.03 * uMood.x;
  float x1 = mcx + mhw;
  float dx = p.x - (mcx - 0.075 * grin);
  float curl = max(0.0, p.x - (x1 - 0.08));
  float fy = my + k * dx * dx + kc * curl * curl;
  float slope = 2.0 * k * dx + 2.0 * kc * curl;
  float mouth = abs(p.y - fy) / sqrt(1.0 + slope * slope) - max(round ? F_mouthLine : 0.0088, aa * 0.5);
  mouth = max(mouth, abs(p.x - mcx) - mhw);
  if (uMood.z > 0.0) mouth = min(mouth, ell(p, vec2(0.0, my), vec2(0.05, 0.062) * uMood.z));
  col = mix(col, uInk, fill(mouth, aa));

  if (!gl_FrontFacing) n = -n;
  // Whites skip the grade entirely: the contrast is the point.
  writeG(col, mix(-0.7, -0.95, white), n, vView);
}
`;

// ------------------------------------------------------------------ beacon heads
// The top boulder of a beacon tower: a hollow stone head with two oval
// eyeholes and a hole in its crown the flame rises from. The holes are not
// geometry. Inside an opening, the fragment traces the view ray into the
// head (object space, where the head is a unit ball with a hollow of radius
// HEAD_RIN) and shades what it meets: the shell's cut wall, the far side of
// the hollow, or nothing at all when the ray leaves by another hole. It
// writes that point's real depth, so the outline pass inks the hole rims
// like any silhouette.
// Per instance: aH0 = (x, y, z, yaw), aH1 = (radius, height, lit / open, home),
// aH2 = (tilt, look yaw, kind, highlight / tower lit).
// Kind 0 = a head (two eyeholes); kind 1 = a tower's door boulder (one big
// doorway, only cut once its lock is off; before that a carved seam).

export const HEAD_VERT = /* glsl */ `
in vec4 aH0;
in vec4 aH1;
in vec4 aH2;
out vec3 vObj;
flat out vec3 vCamObj;
flat out vec4 vH0;
flat out vec4 vH1;
flat out vec4 vH2;
out vec3 vView;
mat3 headRot(float yaw, float tilt) {
  float cy = cos(yaw), sy = sin(yaw), cp = cos(tilt), sp = sin(tilt);
  mat3 ry = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cp, sp, 0.0, -sp, cp);
  return ry * rx;
}
void main() {
  mat3 R = headRot(aH0.w + aH2.y, aH2.x);
  vec3 sc = vec3(aH1.x, aH1.y, aH1.x);
  vec3 wp = aH0.xyz + R * (position * sc);
  vObj = position;
  vCamObj = (transpose(R) * (cameraPosition - aH0.xyz)) / sc;
  vH0 = aH0; vH1 = aH1; vH2 = aH2;
  vec4 vp = viewMatrix * vec4(wp, 1.0);
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

export const HEAD_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vObj;
flat in vec3 vCamObj;
flat in vec4 vH0;
flat in vec4 vH1;
flat in vec4 vH2;
in vec3 vView;
uniform vec3 uStone;
uniform vec3 uHomeStone;
uniform vec3 uEmber;
uniform vec3 uCore;
uniform vec3 uHollow;
const float HEAD_RIN = 0.88;
// Tall, near-rectangular eyes with rounded corners (a superellipse), set
// straight and level: dark and a little uncanny, not cartoon ovals.
const vec3 EYE_L = vec3(-0.27, 0.12, 0.955);
const vec3 EYE_R = vec3(0.27, 0.12, 0.955);
const vec2 EYE_SIZE = vec2(0.125, 0.3);
const float EYE_SQUARE = 5.0;
mat3 headRot(float yaw, float tilt) {
  float cy = cos(yaw), sy = sin(yaw), cp = cos(tilt), sp = sin(tilt);
  mat3 ry = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cp, sp, 0.0, -sp, cp);
  return ry * rx;
}
// Where direction d lands in an opening's own 2D frame (unit oval = the rim).
vec2 eyeUV(vec3 d, vec3 c, float tilt) {
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), c));
  vec3 u = cross(c, r);
  vec2 q = vec2(dot(d, r), dot(d, u));
  float cs = cos(tilt), sn = sin(tilt);
  q = vec2(cs * q.x - sn * q.y, sn * q.x + cs * q.y);
  return q / EYE_SIZE;
}
// Superellipse "radius": 1 on the rim of a rounded rectangle.
float eyeR(vec2 q) {
  vec2 a = abs(q);
  return pow(pow(a.x, EYE_SQUARE) + pow(a.y, EYE_SQUARE), 1.0 / EYE_SQUARE);
}
const vec3 DOOR_C = vec3(0.0, -0.2, 0.98);
const vec2 DOOR_SIZE = vec2(0.3, 0.44);
float gKind = 0.0;
float gOpen = 0.0;
// Direction d in the doorway's own frame (the rim is about 1 out).
vec2 doorQ(vec3 d) {
  vec3 c = normalize(DOOR_C);
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), c));
  vec3 u = cross(c, r);
  return vec2(dot(d, r), dot(d, u)) / DOOR_SIZE;
}
float doorR(vec3 d) {
  vec2 q = abs(doorQ(d));
  return pow(pow(q.x, 3.0) + pow(q.y, 3.0), 1.0 / 3.0);
}
// 0 = solid shell, 1 / 2 = the eyes (or 1 = the doorway).
int holeId(vec3 d) {
  // Doors are a real opening (cut in main, the shell drawn double sided).
  if (gKind > 0.5) return 0;
  if (d.z < 0.6) return 0;
  if (eyeR(eyeUV(d, normalize(EYE_L), 0.0)) < 1.0) return 1;
  if (eyeR(eyeUV(d, normalize(EYE_R), 0.0)) < 1.0) return 2;
  return 0;
}
vec3 holeAxis(int h) {
  if (gKind > 0.5) return normalize(DOOR_C);
  return h == 1 ? normalize(EYE_L) : normalize(EYE_R);
}
// A little house carved over the home tower's brow: distance to its outline.
float houseMark(vec3 d) {
  vec3 c = normalize(vec3(0.0, 0.74, 0.67));
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), c));
  vec3 u = cross(c, r);
  if (dot(d, c) < 0.8) return 1.0;
  vec2 q = vec2(dot(d, r), dot(d, u)) / 0.12;
  // Walls (a box) and a pitched roof over them.
  vec2 b = abs(q - vec2(0.0, -0.35)) - vec2(0.62, 0.55);
  float box = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0);
  vec2 p = vec2(abs(q.x), q.y - 0.2);
  float roof = max(dot(p, normalize(vec2(0.62, 0.78))) - 0.62, -p.y);
  float door = max(abs(q.x) - 0.17, abs(q.y + 0.62) - 0.28);
  return min(min(abs(min(box, roof)), abs(door)), 1.0);
}
void main() {
  float lit = vH1.z;
  float home = vH1.w;
  float hl = vH2.w;
  gKind = vH2.z;
  gOpen = vH1.z;
  bool isDoor = gKind > 0.5;
  // A doorway is dark inside, with the tower's glow far up the shaft once lit.
  float shaftGlow = isDoor ? vH2.w : 0.0;
  if (isDoor) { lit = 0.0; hl = 0.0; }
  vec3 o = vObj;
  vec3 rd = normalize(vObj - vCamObj);
  vec3 d = normalize(o);
  if (isDoor) {
    // A walk-in doorway: the opening is cut for real, and the inside of the
    // shell is the cave you stand in (dark stone, lit from far above once
    // the tower is).
    if (gl_FrontFacing && gOpen > 0.5 && d.z > 0.4 && doorR(d) < 1.0) discard;
    if (!gl_FrontFacing) {
      mat3 Ri = headRot(vH0.w, 0.0);
      vec3 ni = normalize(Ri * (-d / vec3(vH1.x, vH1.y, vH1.x)));
      vec3 st = mix(uStone, uHomeStone, home);
      float up = smoothstep(-0.2, 0.95, d.y);
      float fl = 0.9 + 0.1 * sin(uTime * 5.3 + vH0.x) * sin(uTime * 3.1 + vH0.z);
      vec3 cave = st * uShadeCol * mix(0.42, 0.3, up);
      vec3 c = mix(cave, mix(uEmber, uCore, 0.35) * fl, shaftGlow * up * up * 0.85);
      float e = shaftGlow * up * up * 0.7;
      writeG(c, e > 0.0 ? e : -0.2, ni, vView);
      return;
    }
  }
  int h = holeId(d);
  vec3 hit = o;
  vec3 nObj = d;
  int surf = 0;
  if (h > 0) {
    float b = dot(o, rd);
    float disc = b * b - (dot(o, o) - HEAD_RIN * HEAD_RIN);
    bool inside = false;
    float t1 = 0.6;
    if (disc > 0.0) {
      float sq = sqrt(disc);
      t1 = -b - sq;
      if (t1 > 0.0 && holeId(normalize(o + rd * t1)) == h) {
        vec3 f = o + rd * (-b + sq);
        int h2 = holeId(normalize(f));
        // Straight through one hole and out of another: the sky beyond.
        if (h2 > 0 && h2 != h) discard;
        hit = f;
        nObj = -normalize(f);
        surf = 2;
        inside = true;
      }
      if (t1 <= 0.0) t1 = 0.6;
    }
    if (!inside) {
      // The cut wall of the shell: where the ray leaves the opening's cone.
      float lo = 0.0, hi = t1;
      for (int i = 0; i < 7; i++) {
        float m = 0.5 * (lo + hi);
        if (holeId(normalize(o + rd * m)) == h) lo = m; else hi = m;
      }
      hit = o + rd * hi;
      vec3 hd = normalize(hit);
      vec3 ax = holeAxis(h);
      nObj = normalize(ax * dot(hd, ax) - hd);
      surf = 1;
    }
  }
  mat3 R = headRot(vH0.w + vH2.y, vH2.x);
  vec3 sc = vec3(vH1.x, vH1.y, vH1.x);
  vec3 world = vH0.xyz + R * (hit * sc);
  vec3 view = (viewMatrix * vec4(world, 1.0)).xyz;
  vec3 n = normalize(R * (nObj / sc));
  // The same stone as the rest of its tower (the body's mid tone).
  vec3 stone = mix(uStone, uHomeStone, home);
  float flick = 0.9 + 0.1 * sin(uTime * 5.3 + vH0.x) * sin(uTime * 3.1 + vH0.z);
  vec3 core = mix(uCore, vec3(1.0, 0.96, 0.84), home * 0.5 + hl * 0.5);
  vec3 col;
  float em = 0.0;
  if (surf == 2) {
    // The hollow: near black until the tower is lit, then a glow that fills
    // the rock, brightest low down and at the back.
    float low = smoothstep(0.6, -0.8, hit.y);
    vec3 glow = mix(uEmber, core, 0.25 + 0.6 * low) * flick;
    col = mix(uHollow, glow, lit);
    em = lit;
    if (isDoor) {
      float up = smoothstep(0.1, 0.85, hit.y);
      col = mix(uHollow, mix(uEmber, uCore, 0.3) * flick, shaftGlow * up * 0.8);
      em = shaftGlow * up * 0.7;
    }
  } else if (surf == 1) {
    // The cut wall of the eyehole: a dark bevel, warm and lit from within once lit.
    vec3 wall = stone * uShadeCol * 0.55;
    float up = clamp(dot(nObj, vec3(0.0, -1.0, 0.0)) * 0.5 + 0.5, 0.0, 1.0);
    wall *= 0.8 + 0.35 * up;
    col = mix(wall, mix(uEmber, core, 0.25) * 0.9 * flick, lit * 0.85);
    em = lit * 0.6;
  } else {
    col = stone * toonLight(n);
    if (isDoor && gOpen < 0.5) {
      // Sealed: a door stone set into the boulder, a carved seam round it.
      float dr = doorR(d);
      float seam = step(0.97, dr) * step(dr, 1.035) * step(0.4, d.z);
      col = mix(col, stone * uShadeCol * 0.55, seam);
      col *= dr < 0.97 && d.z > 0.4 ? 0.94 : 1.0;
      // Giving way (the glow slot runs 0..1 as it does): ember light through
      // the seam, and jagged cracks running out from the middle of the stone.
      if (shaftGlow > 0.0 && d.z > 0.4) {
        vec2 q = doorQ(d);
        float rr = length(q);
        float ang = atan(q.y, q.x) / 6.2832 * 7.0;
        float jag = ang + 0.1 * sin(rr * 19.0 + ang * 2.0) + 0.05 * sin(rr * 47.0);
        float sector = floor(jag);
        float keep = step(0.25, fract(sin(sector * 12.9898) * 43758.5453));
        float off = (0.5 - abs(fract(jag) - 0.5)) * 0.8976 * rr;
        float reach = shaftGlow * 1.25;
        float crack = keep * step(off, 0.016 + 0.014 * shaftGlow) * step(rr, reach) * step(dr, 0.97);
        crack = max(crack, step(rr, 0.12 * shaftGlow * shaftGlow));
        float glow = max(crack, seam * step(0.3, shaftGlow));
        col = mix(col, mix(uEmber, uCore, 0.4 + 0.4 * shaftGlow), glow);
        em = max(em, glow * (0.55 + 0.4 * shaftGlow));
      }
    } else if (isDoor && d.z > 0.4) {
      // Open: a worn bevel round the doorway gives the shell its thickness.
      float dr = doorR(d);
      float rim = step(1.0, dr) * step(dr, 1.07);
      col = mix(col, stone * uShadeCol * 0.7, rim);
    }
    // Once lit, warm light spills round the rims of the eyes.
    float nearEye = max(1.0 - eyeR(eyeUV(d, normalize(EYE_L), 0.0)), 1.0 - eyeR(eyeUV(d, normalize(EYE_R), 0.0)));
    float lip = step(-0.2, nearEye) * step(0.0, d.z);
    col = mix(col, stone * mix(uLightCol, uEmber, 0.6), lit * lip * 0.5);
    if (home > 0.5 && !isDoor) {
      float m = houseMark(d);
      float line = 1.0 - smoothstep(0.1, 0.16, m);
      col = mix(col, mix(stone * uShadeCol * 0.75, core, lit), line);
      em = max(em, line * lit);
    }
    // Targeted from another tower (the tower camera): a warm rim.
    if (hl > 0.0) {
      float fres = 1.0 - abs(dot(n, normalize(-view)));
      col = mix(col, core, step(0.72, fres) * hl);
      em = max(em, step(0.72, fres) * hl);
    }
  }
  writeG(col, em, n, view);
}
`;

// ------------------------------------------------------------------ tower spirit
// The glowing ghost that lives in a beacon tower's head: tall and skinny, in
// the same warm amber as a lit tower's eyes (hotter core up top, deeper ember
// toward the hem and the edges). Its face is painted, not stuck on: two tall,
// rounded-rectangle eye sockets that sink into the glow, and a small, quiet,
// lopsided smile like the explorer's.
// Object space: the face looks down +z, the body is 2.0 tall, ~0.3 round.

export const GHOST_VERT = /* glsl */ `
out vec3 vObj;
out vec3 vN;
out vec3 vView;
void main() {
  vObj = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 vp = modelViewMatrix * vec4(position, 1.0);
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

export const GHOST_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vObj;
in vec3 vN;
in vec3 vView;
uniform vec3 uEmber;
uniform vec3 uCore;
uniform vec3 uInk;
uniform float uEmissive;
uniform float uBlink;
uniform float uGrin;
float sq(vec2 q) {
  vec2 a = abs(q);
  return pow(pow(a.x, 4.0) + pow(a.y, 4.0), 0.25);
}
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  // Hotter up in the head, deeper ember toward the hem and round the edges.
  float up = smoothstep(0.1, 1.8, vObj.y);
  float edge = pow(1.0 - abs(dot(n, normalize(-vView))), 2.0);
  float flick = 0.94 + 0.06 * sin(uTime * 7.1 + vObj.y * 3.0) * sin(uTime * 4.3);
  vec3 col = mix(uEmber, uCore, 0.12 + 0.5 * up) * flick;
  col = mix(col, uEmber * 0.92, edge * 0.6);
  float em = uEmissive;
  if (vObj.z > 0.1) {
    // Eyes: tall rounded rectangles (the towers' eyes), level, apart.
    vec2 size = vec2(0.052, 0.12 * max(uBlink, 0.06));
    for (int i = 0; i < 2; i++) {
      float ex = i == 0 ? -0.105 : 0.105;
      vec2 q = (vObj.xy - vec2(ex, 1.62)) / size;
      float r = sq(q);
      // A soft darkened rim round the socket: the glow sinks in.
      float rim = 1.0 - smoothstep(1.0, 1.6, r);
      col = mix(col, uEmber * 0.62, rim * 0.75);
      if (r < 1.0) {
        // Inside: near black, a touch of warmth low down, deepest under the brow.
        float depth = smoothstep(-1.0, 0.7, q.y);
        col = mix(uInk * 1.9 + uEmber * 0.1, uInk, depth);
      }
    }
    // A small, quiet smile, a little off centre with one end lifted.
    float x = vObj.x - 0.015;
    float w = 0.06 + 0.014 * uGrin;
    if (abs(x) < w) {
      float t = x / w;
      float yc = 1.44 + (0.022 + 0.016 * uGrin) * t * t + 0.009 * t;
      float thick = 0.009 * (1.0 - 0.55 * t * t);
      float d = abs(vObj.y - yc);
      float line = 1.0 - smoothstep(thick * 0.6, thick, d);
      col = mix(col, uInk * 1.3, line);
    }
  }
  writeG(col, em, n, vView);
}
`;

// ------------------------------------------------------------------ the giant

// Landscape that walks: pebble boulders coloured by the terrain's own rule
// stack (stone, turf on the tops, snow above a wavy line), with real conifers
// on its shoulders. Boulders are instanced; the trees are plain meshes on its
// bones. The caps are measured in each boulder's rest pose (aUp), so turf and
// snow ride with the stone instead of sliding as it leans.
// aPart = (seed, 1 = the head, turf line, snow line): lines are cap heights
// in -1..1 (bottom to top of the boulder at rest), 9 = none.
export const GIANT_VERT = /* glsl */ `
in float aKind;
in vec4 aPart;
in vec3 aUp;
out vec3 vN;
out vec3 vView;
out vec3 vObj;
out vec3 vUnit;
out vec3 vWorld;
out float vKind;
out float vCap;
flat out vec4 vPart;
void main() {
#ifdef USE_INSTANCING
  mat4 m = modelMatrix * instanceMatrix;
#else
  mat4 m = modelMatrix;
#endif
  mat3 m3 = mat3(m);
  vec3 sc = vec3(length(m3[0]), length(m3[1]), length(m3[2]));
  vUnit = position;
  vObj = position * sc + aPart.x * 37.0;
  vCap = dot(position, aUp) / max(length(aUp), 1e-4);
  // Boulders are squashed spheres: normals need the inverse scale.
  vN = normalize(m3 * (normal / (sc * sc)));
  vKind = aKind;
  vPart = aPart;
  vec4 w = m * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 vp = viewMatrix * w;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

export const GIANT_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vN;
in vec3 vView;
in vec3 vObj;
in vec3 vUnit;
in vec3 vWorld;
in float vKind;
in float vCap;
flat in vec4 vPart;
uniform vec3 cStone;
uniform vec3 cTurf;
uniform vec3 cMoss;
uniform vec3 cSnow;
uniform vec3 cFoliage;
uniform vec3 cTrunk;
uniform vec3 cInk;
/** How much of its own (cold) colour survives the monochrome grade. */
uniform float uKeep;
/** Eyelids: 0 = wide open, 1 = shut. It lives at about half. */
uniform float uLid;
/** A small grin under the eyes (0: no mouth at all, as it has always been). */
uniform float uGrin;
/** Its mouth open (0..1): a hole in its head, with the hollow inside it seen through. */
uniform float uMouth;
/** 1: this is that hollow, the head's own shape drawn from inside. */
uniform float uInside;
/** A light in the hollow: where (in the head's unit space), and how strong (0..1). */
uniform vec4 uGlowAt;
/** The world to the head's unit space: while its mouth is open, what the other boulders have inside its head isn't drawn (its chest runs up into it). */
uniform mat4 uHeadInv;
uniform vec3 cWarm;
// The towers' and spirits' eyes: tall rounded rectangles, set high.
const vec2 EYE_SIZE = vec2(0.13, 0.27);
vec2 eyeUV(vec3 d, vec3 c) {
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), c));
  vec3 u = cross(c, r);
  return vec2(dot(d, r), dot(d, u)) / EYE_SIZE;
}
float eyeR(vec2 q) {
  vec2 a = abs(q);
  return pow(pow(a.x, 5.0) + pow(a.y, 5.0), 0.2);
}
// Where its mouth is on its head (a direction from the head's middle), and the hole it opens: under 1 inside it.
const vec3 MOUTH_C = vec3(0.0, -0.3012, 0.9536);
vec2 mouthUV(vec3 d) {
  vec3 mr = normalize(cross(vec3(0.0, 1.0, 0.0), MOUTH_C));
  return vec2(dot(d, mr), dot(d, cross(MOUTH_C, mr)));
}
float gape(vec3 d) {
  if (dot(d, MOUTH_C) < 0.4) return 9.0;
  vec2 mq = mouthUV(d);
  vec2 o = vec2(mq.x / (0.2 + 0.2 * uMouth), (mq.y + 0.13 * uMouth) / (0.33 * uMouth + 1e-3));
  return dot(o, o);
}
void main() {
  vec3 n = normalize(vN);
  int k = int(vKind + 0.5);
  float dist = length(vView);
  vec3 c;
  float em = -uKeep;
  bool unlit = false;
  if (uInside > 0.5) {
    // The hollow of its mouth: dark, and what's carried into it lights the stone round it in two hard rings.
    float dd = length(vUnit - uGlowAt.xyz);
    c = cInk * 0.8;
    em = -0.85;
    if (dd < 1.25) c = mix(c, cWarm * 0.55, uGlowAt.w);
    if (dd < 0.85) { c = mix(cInk * 0.8, cWarm, uGlowAt.w); em = mix(-0.85, 0.3, uGlowAt.w); }
    writeG(c, em, -n, vView);
    return;
  }
  if (uMouth > 0.01 && vPart.y < 0.5) {
    vec3 h = (uHeadInv * vec4(vWorld, 1.0)).xyz;
    float hh = dot(h, h);
    if (hh < 0.74) discard;
    if (hh < 1.7) {
      // (And the skin of them between that and the head's lumpy inside, wherever it's being looked at through the mouth.)
      vec3 eye = (uHeadInv * vec4(cameraPosition, 1.0)).xyz;
      vec3 rd = h - eye;
      float far = length(rd);
      rd /= far;
      float b = dot(eye, rd), disc = b * b - dot(eye, eye) + 1.0;
      if (disc > 0.0) {
        float t = -b - sqrt(disc);
        if (t > 0.0 && far > t && gape(normalize(eye + rd * t)) < 1.0) discard;
      }
    }
  }
  if (k == 0) c = cFoliage;
  else if (k == 1) c = cTrunk;
  else {
    vec4 nz = texture(uNoise, vObj.xz / 46.0 + vObj.y / 71.0);
    vec4 nz2 = texture(uNoise, vObj.xz / 11.0 - vObj.y / 17.0);
    // Each pebble a slightly different stone.
    c = cStone * (0.95 + 0.1 * fract(vPart.x * 7.31));
    float edge = (nz.g - 0.5) * 0.34 + (nz2.r - 0.5) * 0.1;
    if (vCap + edge > vPart.z) c = nz.b + (nz2.g - 0.5) * 0.3 > 0.56 ? cMoss : cTurf;
    if (vCap + edge * 0.8 > vPart.w) { c = cSnow; em = -0.6; }
    if (vPart.y > 0.5) {
      vec3 d = normalize(vUnit);
      if (d.z > 0.4) {
        // The mouth, under the eyes: shut, a short ink line with its ends turned up; open, a tall hole right through the stone.
        if (uGrin > 0.02 || uMouth > 0.01) {
          vec2 mq = mouthUV(d);
          float half_ = 0.08 + 0.14 * max(uGrin, uMouth);
          float up = mq.x * mq.x * 1.9 * uGrin * (1.0 - uMouth);
          if (abs(mq.x) < half_ && abs(mq.y - up) < 0.026 * min(1.0, (half_ - abs(mq.x)) * 30.0 + 0.55)) { c = cInk; unlit = true; em = -0.85; }
          float hole = gape(d);
          if (uMouth > 0.01 && hole < 1.0) {
            // (A lip of ink round it; inside the lip there's no stone: the hollow shows, and what flies in goes in.)
            if (hole < 0.8) discard;
            c = cInk;
            unlit = true;
            em = -0.85;
          }
        }
        for (int i = 0; i < 2; i++) {
          vec2 q = eyeUV(d, normalize(vec3(i == 0 ? -0.3 : 0.3, 0.2, 0.93)));
          if (eyeR(q) < 1.0) {
            // Heavy lids: stone drawn down over the eye, a line along the edge.
            float lid = 1.0 - 2.0 * uLid;
            c = q.y > lid ? cStone * 0.9 : cInk;
            if (abs(q.y - lid) < 0.07) c = cInk;
            if (q.y <= lid) { unlit = true; em = -0.85; }
          }
        }
      }
    }
  }
  vec3 band = toonLight(n);
  // Far off it flattens like the far ranges: one tone, a painted card.
  band = mix(band, mix(uMidCol, uLightCol, 0.6), smoothstep(350.0, 1300.0, dist));
  writeG(unlit ? c : c * band, em, n, vView);
}
`;

// ------------------------------------------------------------------ the dungeon (src/dungeon/)
// A cave has no sun. Its light is pools: each glow lights what faces it in
// two hard rings (near, nearer), and everything else is the shade tone. The
// shell colours itself (floor, strata up the walls, ceiling); props bring
// their own colour in aCol.

export const DUNGEON_VERT = /* glsl */ `
in vec3 aCol;
out vec3 vN;
out vec3 vView;
out vec3 vWorld;
out vec3 vCol;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vCol = aCol;
  vec4 vp = viewMatrix * w;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

/** How many pools of light are drawn at once: the nearest to the camera (`Dungeon.applyLight` picks them). */
export const DUNGEON_GLOWS = 16;

export const DUNGEON_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vN;
in vec3 vView;
in vec3 vWorld;
in vec3 vCol;
// xyz = where, w = reach (negative: a warm light).
uniform vec4 uGlows[${DUNGEON_GLOWS}];
uniform int uGlowN;
uniform vec3 uOrigin;
uniform float uShell;
uniform vec3 cFloor;
uniform vec3 cFloor2;
uniform vec3 cWallA;
uniform vec3 cWallB;
uniform vec3 cWallC;
uniform vec3 cCeil;
uniform vec3 cMark;
uniform vec3 cWarm;
// The rock's three tones (its own, not the sun's: what's lit by the day above is the explorer).
uniform vec3 cLit;
uniform vec3 cMid;
uniform vec3 cShade;
uniform vec3 uFeet;
uniform float uMark;
uniform float uMarkOn;
uniform vec3 cMarkDark;
uniform float uGlint;
void main() {
  vec3 n = normalize(vN);
  vec3 lp = vWorld - uOrigin;
  float wob = texture(uNoise, vWorld.xz * 0.011).r;
  float wob2 = texture(uNoise, vWorld.xz * 0.004 + 0.37).g;
  vec3 base = vCol;
  bool ground = false;
  int mark = 0;
  if (uShell > 0.5) {
    if (n.y > 0.55) {
      ground = true;
      // Worn, paler patches on the floor, as the meadow has darker ones.
      base = wob2 > 0.56 ? cFloor2 : cFloor;
      // Where the arms take you back up: a dark round let into the well's floor,
      // rimmed in pale stone that glows (brighter once the arms will come for you).
      float r = length(lp.xz);
      if (r < uMark) { base = cMarkDark; mark = 1; }
      else if (r < uMark + 0.3) { base = cMark; mark = 2; }
      else if (abs(r - uMark - 0.75) < 0.06) base = cMark;
    } else if (n.y < -0.62) {
      base = cCeil;
    } else {
      // Strata: flat bands up the wall, their edges wandering a little.
      float h = lp.y + (wob - 0.5) * 2.6 + (wob2 - 0.5) * 5.0;
      float s = fract(h / 7.5);
      base = s < 0.36 ? cWallA : s < 0.5 ? cWallC : s < 0.86 ? cWallB : cWallC;
    }
  }
  int level = 0;
  float warm = 0.0;
  for (int i = 0; i < ${DUNGEON_GLOWS}; i++) {
    if (i >= uGlowN) break;
    vec3 d = uGlows[i].xyz - vWorld;
    float dist = length(d);
    float k = dist / abs(uGlows[i].w) * (0.88 + 0.24 * wob);
    if (k > 1.0 || dot(n, d) < -0.12 * dist) continue;
    // The near ring is for what the light falls on from above: a glowcap's halo on a wall is one tone.
    int lv = k < 0.52 && (n.y > 0.3 || i == 0 || uGlows[i].w < 0.0) ? 2 : 1;
    if (uGlows[i].w < 0.0) warm = max(warm, float(lv));
    level = max(level, lv);
  }
  // A boulder's top catches what light there is.
  if (uShell < 0.5 && n.y > 0.62) level = max(level, 1);
  vec3 col = base * (level == 2 ? cLit : level == 1 ? cMid : cShade);
  float em = 0.0;
  if (warm > 0.5) {
    col = base * (warm > 1.5 ? cWarm : mix(cWarm, cMid, 0.5));
    em = -0.8;
  }
  if (mark == 1) col = base;
  if (mark == 2) { col = base; em = mix(0.12, 0.42 + 0.1 * sin(uTime * 2.2), uMarkOn); }
  // Something you can use (the rockfall, with a pick in your pack): the same glint as everywhere else.
  if (uGlint > 0.0) {
    // (Gentler than on the small things above ground: these are boulders, and it's dim.)
    vec2 g = glintAmt(n, normalize(-vView), vWorld, uGlint * 0.5);
    col = mix(col, mix(base, GLINT_COL, 0.6), max(g.x * 0.5, g.y * 0.6));
  }
  // Your shadow, a soft blob at your feet.
  if (ground) {
    vec2 f = (vWorld.xz - uFeet.xz) / max(0.2, 0.46 - 0.06 * (uFeet.y - vWorld.y));
    if (dot(f, f) < 1.0 && abs(vWorld.y - uFeet.y) < 2.5) col *= vec3(0.72, 0.7, 0.82);
  }
  writeG(col, em, n, vView);
}
`;

/**
 * The spirit lanterns, all of them as one mesh. Each sleeps dark in its
 * sconce, eyes shut, until you come near; then it wakes pale and bright and
 * stays so. aLit is 0..1 per lantern (rewritten when one wakes); aPart is
 * 0 = body, 1 = an open eye, 2 = a shut one; aPivot is what a part grows from.
 */
export const LANTERN_VERT = /* glsl */ `
in float aLit;
in float aPart;
in vec3 aPivot;
out vec3 vN;
out vec3 vView;
out float vLit;
out float vPart;
void main() {
  float k = aPart < 0.5 ? 1.0 + 0.22 * sin(clamp(aLit, 0.0, 1.0) * 3.14159) : aPart < 1.5 ? smoothstep(0.45, 0.9, aLit) : 1.0 - smoothstep(0.1, 0.45, aLit);
  vec4 w = modelMatrix * vec4(aPivot + (position - aPivot) * k, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vLit = aLit;
  vPart = aPart;
  vec4 vp = viewMatrix * w;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`;

export const LANTERN_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vN;
in vec3 vView;
in float vLit;
in float vPart;
uniform vec3 cDark;
uniform vec3 cGlow;
uniform vec3 cInk;
uniform vec3 cLid;
void main() {
  vec3 n = normalize(vN);
  vec3 col = vPart > 1.5 ? cLid : vPart > 0.5 ? cInk : mix(cDark, cGlow, smoothstep(0.0, 0.6, vLit));
  float em = vPart < 0.5 && vLit > 0.05 ? 0.9 * vLit : -1.0;
  writeG(col, em, n, vView);
}
`;

/** The ring's forcefield from underneath: the well's ceiling, and its light. */
export const PORTAL_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vN;
in vec3 vView;
in vec3 vWorld;
in vec3 vCol;
uniform vec3 uOrigin;
uniform float uR;
void main() {
  vec2 p = (vWorld - uOrigin).xz;
  float r = length(p) / uR;
  float a = atan(p.y, p.x);
  float swirl = step(0.5, fract(a * 0.477 - r * 2.2 + uTime * 0.07));
  float ring = step(0.5, fract(r * 3.0 + uTime * 0.11));
  vec3 col = mix(vec3(0.5, 0.43, 0.82), vec3(0.72, 0.66, 0.97), 0.55 * swirl + 0.25 * ring);
  float lip = smoothstep(0.9, 0.94, r);
  col = mix(col, vec3(0.93, 0.9, 1.0), lip);
  writeG(col, 0.62 + 0.3 * lip, vec3(0.0, -1.0, 0.0), vView);
}
`;

/** Still water: one flat tone, with a few pale streaks lying on it. */
export const POOL_FRAG = /* glsl */ `
${COMMON}
${GBUF_OUT}
in vec3 vN;
in vec3 vView;
in vec3 vWorld;
in vec3 vCol;
uniform vec3 cWater;
uniform vec3 cStreak;
void main() {
  float s = texture(uNoise, vWorld.xz * vec2(0.012, 0.085) + vec2(uTime * 0.0035, 0.0)).r;
  float t = texture(uNoise, vWorld.xz * vec2(0.03, 0.21) - vec2(uTime * 0.005, 0.2)).g;
  vec3 col = mix(cWater, cStreak, step(0.63, s) * step(0.42, t));
  writeG(col, -0.35, vec3(0.0, 1.0, 0.0), vView);
}
`;
