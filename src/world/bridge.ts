// The bridges over the one world's crossings (world/islands.ts): a long low
// wooden bridge on trestles, from where the ground comes down to its deck on
// one shore to where it comes back up on the other. The owner pictured wood
// (2026-10-13); what breaks one or mends it is the story's, and not built:
// this one stands whole.
//
// To everything that walks, rides or cycles, the deck is simply ground
// (`deckAt`, which main gives the world's ground query): nothing has to know
// it's a bridge. The giant walks astride it, a foot in the shallows either
// side (its prints fall 14.5 m off its line; the bank under a crossing is a
// shoal for that).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeSolidMaterial } from '../gfx/materials';
import { BIOME } from '../gfx/palette';
import type { WorldGen } from './worldgen';

/** The deck's top above the sea, its half width, and how far apart the trestles stand (m). */
const DECK = 3.4, HALF = 2.6, BAY = 9;

interface Span { ax: number; az: number; ux: number; uz: number; from: number; to: number }

export class Bridges {
  readonly group = new THREE.Group();
  private spans: Span[] = [];
  private geos: THREE.BufferGeometry[] = [];

  constructor(gen: WorldGen) {
    const wood = makeSolidMaterial(BIOME.cabinWall2, 0, { keep: 0.75 }), dark = makeSolidMaterial(BIOME.trunk, 0, { keep: 0.75 });
    for (const c of gen.crossings) {
      const l = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]), ux = (c.b[0] - c.a[0]) / l, uz = (c.b[1] - c.a[1]) / l;
      // The deck runs wherever the ground is below it, and a little way into the bank at each end.
      let from = -1, to = -1;
      for (let s = 0; s <= l; s += 1) if (gen.height(c.a[0] + ux * s, c.a[1] + uz * s) < DECK - 0.3) { if (from < 0) from = s; to = s; }
      if (from < 0) continue;
      from = Math.max(0, from - 3); to = Math.min(l, to + 3);
      this.spans.push({ ax: c.a[0], az: c.a[1], ux, uz, from, to });
      const yaw = Math.atan2(ux, uz), planks: THREE.BufferGeometry[] = [], frame: THREE.BufferGeometry[] = [];
      const box = (list: THREE.BufferGeometry[], w: number, h: number, d: number, side: number, y: number, along: number, tilt = 0) => {
        const g = new THREE.BoxGeometry(w, h, d);
        if (tilt) g.rotateZ(tilt);
        g.translate(side, y, along);
        list.push(g);
      };
      // Planks across, none quite like the next; two rails; a trestle every bay, its legs splayed and braced.
      for (let s = from, i = 0; s < to; s += 0.62, i++) {
        const k = Math.sin(i * 12.9898) * 43758.5453, r = k - Math.floor(k);
        box(planks, HALF * 2 + (r - 0.5) * 0.5, 0.14, 0.54, (r - 0.5) * 0.16, DECK - 0.07 - r * 0.03, s);
      }
      for (const sd of [-1, 1]) {
        box(frame, 0.16, 0.14, to - from, sd * (HALF - 0.1), DECK + 0.95, (from + to) / 2);
        box(frame, 0.24, 0.3, to - from, sd * (HALF - 0.5), DECK - 0.3, (from + to) / 2);
      }
      for (let s = from + 1; s < to; s += BAY) {
        const floor = Math.max(-9, gen.height(c.a[0] + ux * s, c.a[1] + uz * s) - 1), h = DECK - floor;
        for (const sd of [-1, 1]) {
          box(frame, 0.34, h + 1.2, 0.34, sd * (HALF + 0.25 + h * 0.06), floor + (h + 1.2) / 2 - 0.1, s, -sd * 0.12);
          box(frame, 0.18, 1.2, 0.18, sd * (HALF - 0.1), DECK + 0.5, s);
        }
        box(frame, HALF * 2 + 1.2, 0.3, 0.3, 0, DECK - 0.55, s);
        if (h > 3) box(frame, Math.hypot(HALF * 2, h * 0.6), 0.16, 0.16, 0, DECK - 0.5 - h * 0.3, s + 0.2, Math.atan2(h * 0.6, HALF * 2));
      }
      for (const [list, mat] of [[planks, wood], [frame, dark]] as const) {
        const g = mergeGeometries(list)!;
        for (const p of list) p.dispose();
        g.rotateY(yaw);
        g.translate(c.a[0], 0, c.a[1]);
        g.computeBoundingSphere();
        this.geos.push(g);
        this.group.add(new THREE.Mesh(g, mat));
      }
    }
  }

  /** The deck's top at (x, z), or -Infinity where there's no bridge. */
  deckAt(x: number, z: number, more = 0) {
    for (const s of this.spans) {
      const dx = x - s.ax, dz = z - s.az, along = dx * s.ux + dz * s.uz;
      if (along < s.from || along > s.to) continue;
      if (Math.abs(dx * s.uz - dz * s.ux) <= HALF + more) return DECK;
    }
    return -Infinity;
  }

  dispose() { this.group.removeFromParent(); for (const g of this.geos) g.dispose(); }
}
