// GLSL for every scene material. All scene shaders write two targets:
//   gColor: rgb = lit albedo, a = emissive strength (for bloom)
//   gND:    xyz = view-space normal, w = linear view depth (for outlines/fog)
// Materials are GLSL3 ShaderMaterials (three declares position/normal/uv and
// the standard matrices for us).

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
`;

export const GBUF_OUT = /* glsl */ `
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gND;
// Props store half-length normals so post passes can tell them from ground.
uniform float uIsProp;
void writeG(vec3 col, float emissive, vec3 nWorld, vec3 viewPos) {
  gColor = vec4(col, emissive);
  gND = vec4(normalize((viewMatrix * vec4(nWorld, 0.0)).xyz) * (uIsProp > 0.5 ? 0.5 : 1.0), -viewPos.z);
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
  // Sink the seabed so distant shorelines never z-fight with the water plane.
  if (p.y < 0.0) p.y = p.y * 2.0 - 1.2;
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
  float snowLine = uSnowLine + (nz.r - 0.5) * 70.0 + (nz2.b - 0.5) * 16.0;
  bool snow = h > snowLine && slope < 0.8;
  if (snow) { c = cSnow; grass = false; }

  vec3 lightBand = toonLight(n);
  lightBand = mix(lightBand, mix(uMidCol, uLightCol, 0.6), smoothstep(700.0, 2200.0, dist));
  vec3 col = c * lightBand;
  // Contact shadow under the explorer: a flat ellipse in the shade tone.
  vec2 pd = (vWorld.xz - uPlayerFeet.xz) * vec2(1.0, 1.0);
  if (dot(pd, pd) < 0.2 && abs(vH - uPlayerFeet.y) < 0.6) col = c * uShadeCol * 0.92;
  if (grass) {
    float s = strokes(vWorld.xz, dist);
    col = mix(col, cStroke * toonLight(n), s * 0.8);
  }
  // Snow caps resist the monochrome grade: they stay the brightest thing.
  writeG(col, snow ? -0.55 : 0.0, n, vView);
}
`;

// ------------------------------------------------------------------ props

// Instanced props: trees, bushes, rocks, tufts, flowers, cabins.
// aI0 = (x, y, z, scale), aI1 = (rotY, yScale, lean, tone), aKind per vertex.
export const PROP_VERT = /* glsl */ `
in vec4 aI0;
in vec4 aI1;
in float aKind;
uniform float uTime;
uniform float uBend;
uniform float uWind;
uniform float uHeightRef;
uniform float uCutaway;
uniform vec3 uFocus;
out vec3 vN;
out vec3 vView;
out vec3 vLocal;
out float vKind;
out float vTone;
out vec3 vWorld;
void main() {
  vec3 p = position;
  float sc = aI0.w;
  float sy = aI1.y;
  vLocal = p;
  float hN = clamp(p.y / uHeightRef, 0.0, 1.0);
  p.xz *= sc;
  p.y *= sc * sy;
  vec3 base = (modelMatrix * vec4(aI0.xyz, 1.0)).xyz;
  if (uCutaway > 0.5) {
    // Hide whole trees standing between the camera and the player (2D test
    // against the camera->focus segment), instead of slicing them open.
    vec2 a = cameraPosition.xz;
    vec2 ab = uFocus.xz - a;
    float t = clamp(dot(base.xz - a, ab) / max(dot(ab, ab), 1e-3), 0.0, 1.0);
    float r = length(base.xz - (a + ab * t));
    float reach = 2.8 * sc + 0.8;
    float top = base.y + uHeightRef * sc * sy;
    float segY = mix(cameraPosition.y, uFocus.y, t);
    if (t < 0.97 && r < reach && segY < top) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      return;
    }
  }
  float sway = sin(uTime * 1.1 + base.x * 0.045 + base.z * 0.06) * uWind
             + sin(uTime * 2.3 + base.z * 0.11) * uWind * 0.35;
  float bendAmt = (aI1.z * uBend + sway) * hN * hN * uHeightRef * sc;
  p.x += bendAmt;
  float c = cos(aI1.x);
  float s = sin(aI1.x);
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  vec3 nrm = normal;
  // Tilt normals with the bend so lit sides follow the curve.
  nrm.x -= aI1.z * uBend * hN * 1.5;
  nrm = normalize(vec3(c * nrm.x + s * nrm.z, nrm.y / max(sy, 0.3), -s * nrm.x + c * nrm.z));
  vec4 wp = modelMatrix * vec4(p + aI0.xyz, 1.0);
  vWorld = wp.xyz;
  vN = nrm;
  vKind = aKind;
  vTone = aI1.w;
  vec4 vp = viewMatrix * wp;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
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
uniform vec3 uKind[16];
uniform vec3 uGlow;
uniform float uToneVar;
uniform float uFlip;
uniform float uCutaway;
uniform vec3 uFocus;
// Kinds: 0 foliage, 1 trunk, 2 rock, 3 bush, 4 tuft, 5 flower petal, 6 flower core,
// 7 wall, 8 roof, 9 trim, 10 window, 11 door, 12 stone, 13 wall alt, 14 snowcap(rock)
void main() {
  int k = int(vKind + 0.5);
  if (uCutaway > 0.5) {
    // Cut away foliage between the camera and the player, and anything that
    // would brush the near plane.
    if (-vView.z < 1.5) discard;
  }
  vec3 n = normalize(vN);
  if (uFlip > 0.5 && !gl_FrontFacing) n = -n;
  vec3 base = uKind[k];
  base *= 1.0 - uToneVar * 0.5 + uToneVar * vTone;
  float emissive = 0.0;
  if (k == 7 || k == 13) {
    // clapboard lines
    float line = step(0.86, fract(vLocal.y * 2.4));
    base *= 1.0 - 0.18 * line;
  } else if (k == 8) {
    float line = step(0.84, fract((vLocal.y + abs(vLocal.z) * 0.9) * 2.2));
    base *= 1.0 - 0.2 * line;
  } else if (k == 10) {
    base = mix(base, uGlow, uNight);
    emissive = uNight;
  }
  vec3 col = k == 10 ? base : base * toonLight(n);
  // Negative alpha = partial opt-out of the monochrome grade (accent colours).
  if (emissive == 0.0 && (k == 7 || k == 8)) emissive = -0.45;
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
void main() {
  vec3 n = normalize(vN);
  vec3 col = uEmissive > 0.0 ? uColor : uColor * toonLight(n);
  // The explorer keeps most of their colour so they read against the land.
  writeG(col, uEmissive > 0.0 ? uEmissive : -0.7, n, vView);
}
`;
