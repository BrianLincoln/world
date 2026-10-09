import * as THREE from 'three';

// The giant's footprints. Like the harvest flags, they are story state laid
// over a world that is a pure function of the seed: chunks are never rebuilt.
// A wrap-around texture holds up to two prints per 12 m cell (two layers,
// one above the other in the texture: the giant comes back over ground it
// has trodden, and a second print mustn't cut the first off at the cell's
// edge), and at any point the one whose sole is nearer counts. The terrain
// shader presses the hollow
// into the ground and paints it, the prop shaders hide whatever stood in it,
// and `offset` gives the same hollow to anything that walks (the GLSL in
// PRINT_GLSL and the functions below must stay the same shape).
//
// A print is the sole as built (giant.ts): a stone slab about 22 x 14 m,
// square-shouldered, with two cracks in from the front (not a paw).
// Its origin is the middle of the sole; heading h faces (sin h, cos h).

export const PRINT_CELL = 12;
const N = 512;
/** How deep the sole is pressed, and how high the squashed rim stands (m). */
const DEPTH = 1.9, RIM = 0.5;
/**
 * It wades through a wood, it doesn't tiptoe: nothing is left standing
 * between the outer edges of its prints. Each print clears a box round
 * itself: this far (m) out past the sole on the outer side, in toward its
 * other foot (far enough that the two sides meet), and ahead and behind.
 * Which side is in is the side its last print was on (`Print.side`).
 */
const CLEAR_OUT = 1, CLEAR_IN = 13, CLEAR_ALONG = 13;
/** Past this far from the middle of a print nothing is touched. */
const REACH = 17;

export const PRINT_TEX = new THREE.DataTexture(new Float32Array(N * N * 2 * 4), N, N * 2, THREE.RGBAFormat, THREE.FloatType);
PRINT_TEX.magFilter = THREE.NearestFilter;
PRINT_TEX.minFilter = THREE.NearestFilter;
PRINT_TEX.generateMipmaps = false;
PRINT_TEX.needsUpdate = true;

/**
 * Where the giant has cleared what stood (see CLEAR_*): a wrap-around mask of its own, finer than the
 * print cells and with no limit on how many prints reach a spot (two a cell isn't enough where its way
 * in and its way out cross). Never un-cleared: a print filled in again doesn't bring the trees back.
 */
const CLEAR_CELL = 3, CN = 2048;
export const CLEAR_TEX = new THREE.DataTexture(new Uint8Array(CN * CN), CN, CN, THREE.RedFormat, THREE.UnsignedByteType);
CLEAR_TEX.magFilter = THREE.NearestFilter;
CLEAR_TEX.minFilter = THREE.NearestFilter;
CLEAR_TEX.generateMipmaps = false;
CLEAR_TEX.needsUpdate = true;
const cwrap = (i: number) => ((i % CN) + CN) % CN;

export const PRINT_U = {
  uPrints: { value: PRINT_TEX },
  uPrintClear: { value: CLEAR_TEX },
  /** The newest print's number: prints cool as it leaves them behind (and it runs on past that while the giant rests: `cool`). */
  uPrintHead: { value: 0 },
  /** How many prints back the warmth has gone out of the ground. */
  uPrintCool: { value: 9 },
  /** One print being filled in again (`Prints.part`): its x and z, and how much of its depth is left (1 = all of it). */
  uPrintFill: { value: new THREE.Vector3(0, 0, 1) },
};

export const PRINT_GLSL = /* glsl */ `
uniform sampler2D uPrints;
uniform sampler2D uPrintClear;
uniform float uPrintHead;
uniform float uPrintCool;
uniform vec3 uPrintFill;
// How much of this print's depth is left: 1, but for the one being shovelled full.
float printDeep(vec4 p) { return p.a > 0.5 && distance(p.xy, uPrintFill.xy) < 0.5 ? uPrintFill.z : 1.0; }
// Signed distance (m) to the edge of its sole: negative inside.
float soleSdf(vec2 xz, vec4 p) {
  if (p.a < 0.5) return 99.0;
  vec2 d = xz - p.xy;
  if (dot(d, d) > ${(REACH * REACH * 2).toFixed(1)}) return 99.0;
  float cs = cos(p.z), sn = sin(p.z);
  vec2 q = vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs);
  // A stone slab: square-shouldered, broader at the front, and two cracks
  // in from the front edge where its three blocks meet.
  vec2 a = abs(q / vec2(mix(5.9, 7.5, (q.y + 11.0) / 22.0), 11.0));
  a *= a;
  float s = (sqrt(sqrt(dot(a, a))) - 1.0) * 6.5;
  float crack = length(vec2(abs(q.x) - 2.6, q.y - clamp(q.y, 6.5, 12.0))) - 0.5;
  return max(s, -crack);
}
// The print that matters at this point: x, z, heading, number (0 = none). Of the (up to) two in its 12 m
// cell, the one whose sole is nearer.
vec4 printAt(vec2 xz) {
  ivec2 c = ((ivec2(floor(xz / ${PRINT_CELL.toFixed(1)})) % ${N}) + ${N}) % ${N};
  vec4 a = texelFetch(uPrints, c, 0);
  vec4 b = texelFetch(uPrints, c + ivec2(0, ${N}), 0);
  if (b.a < 0.5) return a;
  return soleSdf(xz, a) <= soleSdf(xz, b) ? a : b;
}
// A prop standing here is gone: under a sole, or in the swathe between its feet (a mask, ${CLEAR_CELL.toFixed(0)} m to the texel).
bool printClears(vec2 xz) {
  ivec2 c = ((ivec2(floor(xz / ${CLEAR_CELL.toFixed(1)})) % ${CN}) + ${CN}) % ${CN};
  return texelFetch(uPrintClear, c, 0).r > 0.5;
}
// How the ground moves: a flat floor, a steep wall, a squashed-up rim.
float printLift(float s) {
  float r = s - 1.7;
  return -${DEPTH.toFixed(2)} * (1.0 - smoothstep(-1.5, 0.4, s)) + ${RIM.toFixed(2)} * exp(-r * r / 1.5);
}
float printWarmth(vec4 p) { return clamp(1.0 - (uPrintHead - p.a) / uPrintCool, 0.0, 1.0); }
`;

export interface Print { x: number; z: number; heading: number; n: number; /** Which side of it (its own x, +1 / -1) the other foot came down: the middle of the trail. 0 = no telling. */ side?: number; /** How much of its depth is left (`Prints.part`; left out: all of it). */ keep?: number }

/** Print p clears what stands at (x, z) (`pad`: that much more round the sole itself, m). */
export function printClears(x: number, z: number, p: Print, pad = 0): boolean {
  if (soleSdf(x, z, p) < 1 + pad) return true;
  if (!p.side) return false;
  const dx = x - p.x, dz = z - p.z, cs = Math.cos(p.heading), sn = Math.sin(p.heading);
  const u = (dx * cs - dz * sn) * p.side, v = dx * sn + dz * cs;
  return u > -(7.5 + CLEAR_OUT) && u < 7.5 + CLEAR_IN && Math.abs(v) < 11 + CLEAR_ALONG;
}

const wrap = (i: number) => ((i % N) + N) % N;
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function soleSdf(x: number, z: number, p: Print): number {
  const dx = x - p.x, dz = z - p.z;
  const cs = Math.cos(p.heading), sn = Math.sin(p.heading);
  const qx = dx * cs - dz * sn, qy = dx * sn + dz * cs;
  const w = 5.9 + 1.6 * Math.min(1, Math.max(0, (qy + 11) / 22));
  const ax = (qx / w) ** 2, ay = (qy / 11) ** 2;
  const s = (Math.sqrt(Math.hypot(ax, ay)) - 1) * 6.5;
  const crack = Math.hypot(Math.abs(qx) - 2.6, qy - Math.min(12, Math.max(6.5, qy))) - 0.5;
  return Math.max(s, -crack);
}

export function printLift(s: number): number {
  const r = s - 1.7;
  return -DEPTH * (1 - smooth(-1.5, 0.4, s)) + RIM * Math.exp(-r * r / 1.5);
}

export class Prints {
  readonly list: Print[] = [];
  private cells = new Map<number, Print[]>();
  /** The newest print's number, and on past it as the trail cools at rest (the next print is numbered from here). */
  private head = 0;

  /** Press a print: the middle of the sole and the way the foot points. */
  add(x: number, z: number, heading: number): Print {
    const p: Print = { x, z, heading, n: this.head + 1 };
    // The other foot is where the last print is (if that's a stride away, and to one side).
    const last = this.list[this.list.length - 1];
    if (last && Math.hypot(last.x - x, last.z - z) < 45) {
      const u = (last.x - x) * Math.cos(heading) - (last.z - z) * Math.sin(heading);
      if (Math.abs(u) > 4) p.side = Math.sign(u);
    }
    this.list.push(p);
    // What it clears, into the mask.
    const cd = CLEAR_TEX.image.data as Uint8Array;
    for (let j = Math.floor((z - 36) / CLEAR_CELL); j <= Math.floor((z + 36) / CLEAR_CELL); j++) {
      for (let i = Math.floor((x - 36) / CLEAR_CELL); i <= Math.floor((x + 36) / CLEAR_CELL); i++) {
        if (printClears((i + 0.5) * CLEAR_CELL, (j + 0.5) * CLEAR_CELL, p, 1.5)) cd[cwrap(j) * CN + cwrap(i)] = 255;
      }
    }
    CLEAR_TEX.needsUpdate = true;
    // Every cell the sole, toes and rim can reach (a circle a little ahead of the middle).
    const cx = x + Math.sin(heading) * 2, cz = z + Math.cos(heading) * 2, r = 15.5;
    for (let j = Math.floor((cz - r) / PRINT_CELL); j <= Math.floor((cz + r) / PRINT_CELL); j++) {
      for (let i = Math.floor((cx - r) / PRINT_CELL); i <= Math.floor((cx + r) / PRINT_CELL); i++) {
        const nx = Math.max(i * PRINT_CELL, Math.min(cx, (i + 1) * PRINT_CELL)), nz = Math.max(j * PRINT_CELL, Math.min(cz, (j + 1) * PRINT_CELL));
        if (Math.hypot(nx - cx, nz - cz) > r) continue;
        const k = wrap(j) * N + wrap(i);
        // Beside what's there, if there's room; else in place of the older of the two.
        const c = this.cells.get(k) ?? [];
        if (c.length < 2) c.push(p); else c[c[0].n < c[1].n ? 0 : 1] = p;
        this.cells.set(k, c);
        this.write(k, c);
      }
    }
    PRINT_TEX.needsUpdate = true;
    PRINT_U.uPrintHead.value = this.head = p.n;
    return p;
  }

  /**
   * Take a print away again (the ground is whole there: a house's plot,
   * mended). It stays in `list`, so the others keep their numbers.
   */
  erase(p: Print) {
    for (const [k, c] of this.cells) {
      if (!c.includes(p)) continue;
      const left = c.filter((q) => q !== p);
      if (left.length) this.cells.set(k, left); else this.cells.delete(k);
      this.write(k, left);
    }
    if (p.keep !== undefined) this.part(null);
    PRINT_TEX.needsUpdate = true;
  }

  /**
   * Print `p` is part filled in: `keep` of its depth is left (1 = as it was
   * pressed). One at a time: the shader knows of one (`uPrintFill`), and
   * the one before goes back to its full depth.
   */
  part(p: Print | null, keep = 1) {
    for (const q of this.list) q.keep = undefined;
    if (p) p.keep = keep;
    PRINT_U.uPrintFill.value.set(p?.x ?? 0, p?.z ?? 0, p ? keep : 1);
  }

  /** A cell's prints into the texture's two layers. */
  private write(k: number, c: Print[]) {
    const d = PRINT_TEX.image.data as Float32Array;
    for (let l = 0; l < 2; l++) { const q = c[l]; d.set(q ? [q.x, q.z, q.heading, q.n] : [0, 0, 0, 0], (k + l * N * N) * 4); }
  }

  /** The print whose cell holds this point, if it is near enough to matter. */
  at(x: number, z: number): Print | null {
    const c = this.cells.get(wrap(Math.floor(z / PRINT_CELL)) * N + wrap(Math.floor(x / PRINT_CELL)));
    if (!c) return null;
    // (Of two, the one whose sole is nearer: as the shader has it.)
    const p = c.length > 1 && soleSdf(x, z, c[1]) < soleSdf(x, z, c[0]) ? c[1] : c[0];
    return (x - p.x) ** 2 + (z - p.z) ** 2 < REACH * REACH * 2 ? p : null;
  }

  /** A prop standing here is gone (trodden, or in the swathe between the giant's feet). */
  clears(x: number, z: number): boolean {
    return (CLEAR_TEX.image.data as Uint8Array)[cwrap(Math.floor(z / CLEAR_CELL)) * CN + cwrap(Math.floor(x / CLEAR_CELL))] > 0;
  }

  /** Signed distance to the nearest sole's edge (99 = no print about). */
  sdf(x: number, z: number): number {
    const p = this.at(x, z);
    return p ? soleSdf(x, z, p) : 99;
  }

  /** What a print adds to the ground height here (0 away from any). */
  offset(x: number, z: number): number {
    const p = this.at(x, z);
    return p ? printLift(soleSdf(x, z, p)) * (p.keep ?? 1) : 0;
  }

  /** 1 = just made, 0 = gone cold. */
  warmth(p: Print): number {
    return Math.min(1, Math.max(0, 1 - (this.head - p.n) / PRINT_U.uPrintCool.value));
  }

  /** The giant has stopped: its last prints go cold too, as if it had walked on this many prints. */
  cool(by: number) {
    const last = this.list[this.list.length - 1];
    if (!last) return;
    PRINT_U.uPrintHead.value = this.head = Math.min(this.head + by, last.n + PRINT_U.uPrintCool.value);
  }

  clear() {
    this.list.length = 0;
    this.cells.clear();
    (PRINT_TEX.image.data as Float32Array).fill(0);
    PRINT_TEX.needsUpdate = true;
    (CLEAR_TEX.image.data as Uint8Array).fill(0);
    CLEAR_TEX.needsUpdate = true;
    PRINT_U.uPrintHead.value = this.head = 0;
    PRINT_U.uPrintFill.value.set(0, 0, 1);
  }
}
