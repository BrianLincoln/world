import * as THREE from 'three';
import { mulberry32 } from '../core/rng';
import { postSettings } from '../gfx/post';
import { overlayMat } from './overlay';

// Snow, falling wherever the country is cold (story/warmth.ts: for now, up
// the mountains above `postSettings.cold.top`) and nowhere else: flat round flakes in a box of air that goes with the camera, each one
// asking the warmth's own maps whether the land under it is cold (and, for the mountains' line, how high the ground under it
// stands: never how high the flake is, or it would snow on anyone flying high over low country). So it stops
// at the edge of a lit tower's patch and round a lit cabin, and is swept off
// as a tower's warmth rolls out.
//
// Looks only. Drawn in the overlay scene (over the finished frame, so no
// outline, grade or fog of its own: the fog standing close in the cold is why
// the box needn't be big), hidden behind whatever is solid by the G-buffer's
// depth. A flake's place is a function of its number and the clock: nothing
// is simulated, and a cut of the camera needs no settling.

/** How many flakes at `postSettings.cold.snow` = 1 (it goes to `MAX` times that), and the box of air they fill (m: across, tall). */
const N = 9000, BOX = 76, TALL = 40;
/** The ground's height under the box, for the mountains' line: a square of `GRID` cells of `CELL` m, kept round the box as it goes (each texel holds the cell it is the remainder of: only the cells new to the square are asked for). */
const GRID = 32, CELL = 4;
export const SNOW_MAX = 100;
/** A flake's radius (m), its fall (m/s) and how far it sways (m): least and most. */
const SIZE = [0.028, 0.062], FALL = [1.0, 2.1], SWAY = [0.25, 0.7];
/** What little wind there is (m/s). */
const WIND = [0.55, 0.3];
/** Flakes by day and after dark. */
const DAY = [0.985, 0.99, 1.0], NIGHT = [0.72, 0.79, 0.93];

const VERT = /* glsl */ `
// (position: its place in the box, 0..1 each way; aOwn: its own number.)
in float aOwn;
uniform vec3 uMid;
uniform vec2 uBox;
uniform float uSnowT;
uniform vec2 uRes;
uniform vec4 uCold;
uniform sampler2D tWarmIds;
uniform sampler2D tWarmTow;
uniform vec3 uColdPk[8];
uniform vec2 uTop;
uniform sampler2D tGround;
uniform float uGround;
uniform vec2 uSize;
uniform vec2 uFall;
uniform vec2 uSway;
uniform vec2 uWind;
out float vDepth;
out float vA;

// The same as the composite pass's (gfx/post.ts) and warmth.ts's.
vec2 wob(vec2 p) {
  return p + 14.0 * vec2(sin(p.y * 0.011 + 1.3 * sin(p.x * 0.007)), sin(p.x * 0.0093 + 1.7 * sin(p.y * 0.0061)));
}
float coldAt(vec2 at) {
  vec2 p = wob(at);
  vec4 ids = floor(texture(tWarmIds, (p - uCold.xy) / (2.0 * uCold.z) + 0.5) * 255.0 + 0.5);
  float dn = 1e9, rn = 0.0;
  for (int k = 0; k < 4; k++) {
    vec4 t = texelFetch(tWarmTow, ivec2(int(ids[k]), 0), 0);
    float d = distance(p, t.xy);
    if (d < dn) { dn = d; rn = t.z; }
  }
  // (It thins out over the last few metres before the warmth, and none falls in it.)
  float c = smoothstep(0.0, 9.0, dn - rn);
  for (int k = 0; k < 8; k++) {
    if (uColdPk[k].z > 0.0) c *= smoothstep(0.0, 4.0, distance(at, uColdPk[k].xy) - uColdPk[k].z);
  }
  return c;
}

void main() {
  float own = aOwn, own2 = fract(own * 7.31 + 0.17);
  vec3 box = vec3(uBox.x, uBox.y, uBox.x);
  vec3 p = position * box;
  p.y -= uSnowT * mix(uFall.x, uFall.y, own);
  float ph = uSnowT * (0.5 + 0.9 * own2) + own * 40.0;
  p.xz += uWind * uSnowT + mix(uSway.x, uSway.y, own2) * vec2(sin(ph), cos(ph * 0.83 + own * 9.0));
  // Its place in the box round the camera: the same flake at the same spot wherever the camera goes, till it leaves the box.
  vec3 q = mod(p - uMid + box * 0.5, box) - box * 0.5;
  vec3 w = uMid + q;
  vec4 vc = viewMatrix * vec4(w, 1.0);
  vDepth = -vc.z;
  // Fewer where it's nearly warm (by its own number, so a flake is there or it isn't), none past the box's sides, none in your face.
  // (Up a mountain it's the height of the ground under it that says, not its own: it falls over land above the cold line and thins out to nothing below it.)
  float line = uTop.x + (wob(w.xz).x - w.x);
  float cold = max(coldAt(w.xz), smoothstep(line - uTop.y, line + uTop.y, texture(tGround, w.xz / uGround).r));
  float keep = step(own2, cold * 1.02 - 0.01);
  vec3 e = abs(q) / (box * 0.5);
  float a = keep * (1.0 - smoothstep(0.78, 1.0, max(e.x, max(e.y, e.z)))) * smoothstep(1.5, 4.0, vDepth);
  float px = mix(uSize.x, uSize.y, own * own) * projectionMatrix[1][1] / max(vDepth, 1e-3) * uRes.y * 0.5;
  // (Never under a pixel and a bit: far ones go faint, not to a shimmer. And never a great disc across the view.)
  float s = clamp(px, 1.3, min(uRes.y * 0.008, 30.0));
  vA = a * clamp(px / 1.3, 0.3, 1.0) * uCold.w;
  // A point each (a quad each is four times the work, and there may be near a million).
  gl_PointSize = 2.0 * s;
  gl_Position = vA > 0.01 && vDepth > 0.0 ? projectionMatrix * vc : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tND;
uniform vec2 uRes;
uniform vec3 uColor;
in float vDepth;
in float vA;
out vec4 fragColor;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  if (dot(d, d) > 1.0) discard;
  if (vDepth > texture(tND, gl_FragCoord.xy / uRes).w) discard;
  fragColor = vec4(uColor, vA);
}
`;

const fwd = new THREE.Vector3();

export class Snow {
  readonly mesh: THREE.Points;
  private geo = new THREE.BufferGeometry();
  private u: Record<string, THREE.IUniform>;
  private t = 0;
  private have = 0;
  private high = new Uint16Array(GRID * GRID);
  private highTex = new THREE.DataTexture(this.high, GRID, GRID, THREE.RedFormat, THREE.HalfFloatType);
  /** The cell each texel holds (x, z). */
  private cells = new Int32Array(GRID * GRID * 2).fill(0x7fffffff);

  /** `ground`: the land's height at (x, z). */
  constructor(private ground: (x: number, z: number) => number) {
    this.room(N);
    this.highTex.wrapS = this.highTex.wrapT = THREE.RepeatWrapping;
    this.highTex.minFilter = this.highTex.magFilter = THREE.LinearFilter;
    this.highTex.generateMipmaps = false;
    this.u = {
      uMid: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector2(BOX, TALL) }, uSnowT: { value: 0 },
      uCold: { value: new THREE.Vector4() }, tWarmIds: { value: null }, tWarmTow: { value: null },
      uColdPk: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) }, uTop: { value: new THREE.Vector2(1e9, 1) },
      tGround: { value: this.highTex }, uGround: { value: GRID * CELL },
      uSize: { value: new THREE.Vector2(SIZE[0], SIZE[1]) }, uFall: { value: new THREE.Vector2(FALL[0], FALL[1]) },
      uSway: { value: new THREE.Vector2(SWAY[0], SWAY[1]) }, uWind: { value: new THREE.Vector2(WIND[0], WIND[1]) },
      uColor: { value: new THREE.Vector3() },
    };
    this.mesh = new THREE.Points(this.geo, overlayMat(VERT, FRAG, this.u));
    this.mesh.frustumCulled = false;
    // (Under the story's sketches and icons.)
    this.mesh.renderOrder = -10;
    this.mesh.visible = false;
  }

  /** Flakes enough for `n` (the same ones every time, and the first of them the same however many there are). */
  private room(n: number) {
    if (n <= this.have) return;
    this.have = Math.min(N * SNOW_MAX, Math.max(n, this.have * 2));
    const at = new Float32Array(this.have * 3), own = new Float32Array(this.have), rnd = mulberry32(0x5e0f1a4e);
    for (let i = 0; i < this.have; i++) { at[i * 3] = rnd(); at[i * 3 + 1] = rnd(); at[i * 3 + 2] = rnd(); own[i] = rnd(); }
    this.geo.setAttribute('position', new THREE.BufferAttribute(at, 3));
    this.geo.setAttribute('aOwn', new THREE.BufferAttribute(own, 1));
  }

  /** The ground's height in the square of cells round (x, z). */
  private survey(x: number, z: number) {
    const cx = Math.floor(x / CELL) - GRID / 2, cz = Math.floor(z / CELL) - GRID / 2;
    let fresh = false;
    for (let j = cz; j < cz + GRID; j++) for (let i = cx; i < cx + GRID; i++) {
      const o = (j & (GRID - 1)) * GRID + (i & (GRID - 1));
      if (this.cells[o * 2] === i && this.cells[o * 2 + 1] === j) continue;
      this.cells[o * 2] = i; this.cells[o * 2 + 1] = j;
      this.high[o] = THREE.DataUtils.toHalfFloat(this.ground((i + 0.5) * CELL, (j + 0.5) * CELL));
      fresh = true;
    }
    if (fresh) this.highTex.needsUpdate = true;
  }

  /** `fog`: the hour's fog colour (how dark it is); `show`: above ground, in the open world. */
  update(dt: number, camera: THREE.PerspectiveCamera, fog: THREE.Color, show: boolean) {
    const c = postSettings.cold, u = this.u;
    // (The clock wraps where every flake's cycle would have to, near enough: a jump once in hours.)
    this.t = (this.t + dt) % 7200;
    const amt = THREE.MathUtils.clamp(c.snow, 0, SNOW_MAX), n = Math.round(N * amt);
    this.mesh.visible = show && c.amt > 0 && !!c.ids && n > 0;
    if (!this.mesh.visible) return;
    this.room(n);
    this.geo.setDrawRange(0, n);
    // The thicker it falls the harder it blows: it comes down aslant.
    const blow = Math.max(1, Math.min(5, Math.sqrt(amt)));
    u.uWind.value.set(WIND[0] * blow, WIND[1] * blow);
    // The box stands a little ahead of the camera: most of it is in sight.
    camera.getWorldDirection(fwd);
    u.uMid.value.copy(camera.position).addScaledVector(fwd, BOX * 0.3);
    u.uSnowT.value = this.t;
    if (c.top > 0) this.survey(u.uMid.value.x, u.uMid.value.z);
    u.uCold.value.set(c.ox, c.oz, c.half, c.amt);
    u.tWarmIds.value = c.ids;
    u.tWarmTow.value = c.tow;
    u.uTop.value.set(c.top > 0 ? c.top : 1e9, Math.max(c.topSoft, 0.01));
    (u.uColdPk.value as THREE.Vector3[]).forEach((v, i) => v.set(c.pockets[i * 4] ?? 0, c.pockets[i * 4 + 1] ?? 0, c.pockets[i * 4 + 2] ?? 0));
    // After dark the flakes are the snowy ground's blue, not white (the same reckoning of night as the composite's).
    const night = 1 - THREE.MathUtils.smoothstep(fog.r * 0.299 + fog.g * 0.587 + fog.b * 0.114, 0.3, 0.6);
    (u.uColor.value as THREE.Vector3).set(DAY[0] + (NIGHT[0] - DAY[0]) * night, DAY[1] + (NIGHT[1] - DAY[1]) * night, DAY[2] + (NIGHT[2] - DAY[2]) * night);
  }
}
