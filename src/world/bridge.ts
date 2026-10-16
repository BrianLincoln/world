// The bridges over the one world's crossings (world/islands.ts): a long low
// wooden bridge on trestles, from where the ground comes down to its deck on
// one shore to where it comes back up on the other.
//
// **It isn't there at first** (owner, 2026-10-13). When the last dungeon of
// the first island is done the giant wades the strait and comes up out of
// it on the far side; then your spirit is at the water's edge, and the
// bridge is a quest (story/bridgeQuest.ts: the mill, the wagon, the haul and
// the building). Of that, this file is the bridge itself and how much of it
// stands (`built`, 0 to 1, from the near shore out, a bay at a time).
//
// To everything that walks, rides or cycles, the deck is simply ground
// (`deckAt`, which main gives the world's ground query): nothing has to know
// it's a bridge.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeSolidMaterial } from '../gfx/materials';
import { BIOME } from '../gfx/palette';
import type { WorldGen } from './worldgen';

/** The deck's top above the sea, its half width, and how far apart the trestles stand (m). */
const DECK = 3.4, HALF = 2.6, BAY = 9;

interface Span { ax: number; az: number; ux: number; uz: number; from: number; to: number; planks: THREE.BufferGeometry; frame: THREE.BufferGeometry; nPlanks: number; bays: { s: number; end: number }[] }

export class Bridges {
  readonly group = new THREE.Group();
  private spans: Span[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private k = 1;

  /** How much of each bridge stands, 0 to 1, from its near shore out. */
  get built() { return this.k; }
  set built(v: number) {
    v = Math.max(0, Math.min(1, v));
    if (v === this.k) return;
    this.k = v;
    for (const s of this.spans) {
      const reach = s.from + (s.to - s.from) * v;
      s.planks.setDrawRange(0, Math.floor(s.nPlanks * v) * 36);
      let end = 0;
      for (const b of s.bays) if (b.s <= reach) end = b.end;
      s.frame.setDrawRange(0, end);
    }
    this.group.visible = v > 0;
  }

  constructor(gen: WorldGen) {
    const wood = makeSolidMaterial(BIOME.cabinWall2, 0, { keep: 0.75 }), dark = makeSolidMaterial(BIOME.trunk, 0, { keep: 0.75 });
    for (const c of gen.crossings) {
      const l = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]), ux = (c.b[0] - c.a[0]) / l, uz = (c.b[1] - c.a[1]) / l;
      // The deck runs wherever the ground is below it, and a little way into the bank at each end.
      let from = -1, to = -1;
      for (let s = 0; s <= l; s += 1) if (gen.height(c.a[0] + ux * s, c.a[1] + uz * s) < DECK - 0.3) { if (from < 0) from = s; to = s; }
      if (from < 0) continue;
      from = Math.max(0, from - 3); to = Math.min(l, to + 3);
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
      const bays: { s: number; end: number }[] = [];
      for (let s = from + 1; s < to; s += BAY) {
        const floor = Math.max(-9, gen.height(c.a[0] + ux * s, c.a[1] + uz * s) - 1), h = DECK - floor;
        const run = Math.min(BAY, to - s) + (s < from + 1.5 ? 1 : 0), mid = s + Math.min(BAY, to - s) / 2 - (s < from + 1.5 ? 0.5 : 0);
        for (const sd of [-1, 1]) {
          box(frame, 0.34, h + 1.2, 0.34, sd * (HALF + 0.25 + h * 0.06), floor + (h + 1.2) / 2 - 0.1, s, -sd * 0.12);
          box(frame, 0.18, 1.2, 0.18, sd * (HALF - 0.1), DECK + 0.5, s);
          box(frame, 0.16, 0.14, run, sd * (HALF - 0.1), DECK + 0.95, mid);
          box(frame, 0.24, 0.3, run, sd * (HALF - 0.5), DECK - 0.3, mid);
        }
        box(frame, HALF * 2 + 1.2, 0.3, 0.3, 0, DECK - 0.55, s);
        bays.push({ s, end: frame.length * 36 });
      }
      const made = ([[planks, wood], [frame, dark]] as const).map(([list, mat]) => {
        const g = mergeGeometries(list)!;
        for (const p of list) p.dispose();
        g.rotateY(yaw);
        g.translate(c.a[0], 0, c.a[1]);
        g.computeBoundingSphere();
        this.geos.push(g);
        this.group.add(new THREE.Mesh(g, mat));
        return g;
      });
      this.spans.push({ ax: c.a[0], az: c.a[1], ux, uz, from, to, planks: made[0], frame: made[1], nPlanks: planks.length, bays });
    }
  }

  /** How far (x, z) is from the first bridge's line, shore to shore. */
  distTo(x: number, z: number) {
    const s = this.spans[0];
    if (!s) return Infinity;
    const dx = x - s.ax, dz = z - s.az, along = Math.max(s.from, Math.min(s.to, dx * s.ux + dz * s.uz));
    return Math.hypot(dx - s.ux * along, dz - s.uz * along);
  }

  /** The first bridge's deck `k` (0..1) of the way from its near end to its far one. */
  along(k: number, out: THREE.Vector3) { const s = this.spans[0]; if (!s) return out; const a = s.from + (s.to - s.from) * k; return out.set(s.ax + s.ux * a, DECK, s.az + s.uz * a); }
  /** Its length (m), and which way it runs (a heading). */
  get length() { const s = this.spans[0]; return s ? s.to - s.from : 0; }
  get heading() { const s = this.spans[0]; return s ? Math.atan2(s.ux, s.uz) : 0; }
  /** `off` metres to the side of a point on the first bridge. */
  acrossAt(at: THREE.Vector3, off: number, out: THREE.Vector3) { const s = this.spans[0]; return s ? out.set(at.x + s.uz * off, at.y, at.z - s.ux * off) : out.copy(at); }

  /** The deck's top at (x, z), or -Infinity where there's no bridge. */
  deckAt(x: number, z: number, more = 0) {
    for (const s of this.spans) {
      const dx = x - s.ax, dz = z - s.az, along = dx * s.ux + dz * s.uz;
      if (along < s.from || along > s.from + (s.to - s.from) * this.k || this.k <= 0) continue;
      if (Math.abs(dx * s.uz - dz * s.ux) <= HALF + more) return DECK;
    }
    return -Infinity;
  }

  dispose() { this.group.removeFromParent(); for (const g of this.geos) g.dispose(); }
}
