import * as THREE from 'three';
import { colored, furBall, lathe, merge, mirrorX } from './parts';
import { sculpt, taper } from './stelk';

// Small shape helpers shared by the creatures in beast.ts's family. All
// geometry is built once per species and instanced (see parts.ts).

export { colored, furBall, lathe, merge, mirrorX, sculpt, taper };

export const smooth = THREE.MathUtils.smoothstep;

export function ellipsoid(rx: number, ry: number, rz: number, ws = 32, hs = 22) {
  return new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz);
}

/** A tapered tube (from `taper`) merged with its rounded tip, one colour. */
export function tube(pts: [number, number, number][], r0: number, r1: number, hex: string, paint = 0, tinted = true, segs = 16, radial = 8) {
  return merge(taper(pts, r0, r1, segs, radial).map((g) => colored(g, hex, paint, tinted)));
}

/** A leg segment down -y from the joint: a lathe from a [radius, y] profile. */
export function limb(prof: [number, number][], hex: string, sx = 1, sz = 1, tinted = true) {
  return colored(lathe(prof, 14).scale(sx, 1, sz), hex, 0, tinted);
}

/** A simple hoof / foot pad at the end of a segment of length L. */
export function hoof(L: number, r: number, hex: string, long = 1.1) {
  return colored(lathe([[0, -L + r * 1.3], [r * 0.7, -L + r * 1.25], [r, -L + r * 0.4], [r * 1.05, -L], [0, -L]], 12).scale(1, 1, long).translate(0, 0, r * 0.2), hex, 0, false);
}

/** A curled horn (the left one, +x), rooted at the origin. */
export function curlHorn(r0: number, turns: number, rad: number, hex: string) {
  const pts: [number, number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const rr = rad * (1 - t * 0.45);
    pts.push([0.04 + t * rad * 0.8 + Math.sin(a) * rr * 0.3, Math.sin(a) * rr, -Math.cos(a) * rr + rr]);
  }
  return tube(pts, r0, r0 * 0.25, hex, 0, false, 30, 8);
}

/** The left + right pair of a part built on the +x side. */
export function pair(g: THREE.BufferGeometry, x = 0) {
  const L = g.clone().translate(x, 0, 0);
  const R = mirrorX(g).translate(-x, 0, 0);
  return merge([L, R]);
}

/** A little toadstool: stalk and cap; `glow` paints the cap to shine. */
export function toadstool(h: number, r: number, cap: string, stalk = '#eadfc8', glow = false) {
  const s = new THREE.CylinderGeometry(r * 0.28, r * 0.4, h, 7).translate(0, h / 2, 0);
  const c = new THREE.SphereGeometry(r, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 0.7, 1).translate(0, h, 0);
  return merge([colored(s, stalk, 0, false), colored(c, cap, glow ? 4 : 0, false)]);
}

/** A fern / sprout of a few pointed blades. */
export function sprout(h: number, hex: string, blades = 5, seed = 1) {
  const g: THREE.BufferGeometry[] = [];
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + seed;
    const l = h * (0.7 + 0.3 * Math.sin(i * 2.3 + seed));
    const lean = 0.35;
    g.push(tube([[0, 0, 0], [Math.cos(a) * l * lean * 0.4, l * 0.55, Math.sin(a) * l * lean * 0.4], [Math.cos(a) * l * lean, l, Math.sin(a) * l * lean]], h * 0.07, h * 0.015, hex, 0, false, 6, 5));
  }
  return merge(g);
}
