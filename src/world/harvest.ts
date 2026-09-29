import * as THREE from 'three';
import { hash01 } from '../core/rng';

// What the player has taken out of the world: felled trees and smashed
// rocks. World props are pure functions of the seed and drawn as big instance
// buffers built in workers, so instead of rebuilding chunks we hide the taken
// ones on the GPU: scatter trees sit one per 4 m grid cell and rocks one per
// 9 m cell, so a cell id names a prop exactly, at every LOD. A small
// wrap-around texture (512 x 512 cells) holds the flags:
//   R = tree: 255 felled (a bare stump), 1..254 regrowing (smaller the
//       higher), 0 standing. G = rock smashed. (Saved.)
//   B = tree, A = rock stood in for by a story prop right now (a tree being
//       chopped, a rock being hit), not saved.
// The prop and shadow-caster shaders read it (see `harvestScale` in shaders.ts).
// Two taken props 2 km (trees) / 4.6 km (rocks) apart could alias; rare, and
// only ever hides a far-away twin.
//
// Things come back, like most sandbox games do, counted in in-game hours on
// the harvest clock (so sleeping or a time-lapse counts): a stump sprouts a
// sapling that grows into a full tree; a smashed rock (and any rubble left of
// it) reappears. Sprouting and reappearing only happen out of sight; growing
// is slow enough to be invisible. Nothing comes back where `keep` says the
// player has made a clearing (round the cabin).

export const TREE_CELL = 4;
export const ROCK_CELL = 9;
const N = 512;

/** In-game hours a felled tree stays a bare stump before a sapling sprouts. */
export const TREE_DORMANT = 10;
/** In-game hours from sprout to a full-grown tree. */
export const TREE_GROW = 36;
/** In-game hours before a smashed rock (and the rubble left of it) comes back. */
export const ROCK_RETURN = 20;
/** World rocks bigger than this break into rubble first (see `rubbleOf`). */
export const BIG_ROCK = 1.4;
/** A regrowing tree is solid (a collider) from this far along. */
const SOLID_AT = 0.6;
/** A sapling's size as a fraction of the tree it grows into. */
export const SAPLING = 0.12;

export type HarvestKind = 'tree' | 'rock';

/** A taken prop, enough to redraw what's left (a stump, rubble). */
export interface Taken {
  kind: HarvestKind; gi: number; gj: number; x: number; y: number; z: number; sc: number; rot: number;
  /** Harvest clock (in-game hours) when it was taken. */
  at?: number;
  /** Trees: 0 = a bare stump, then 0..1 regrowing. */
  grow?: number;
  /** Rocks: a big boulder that broke into rubble; bit k = piece k smashed too. */
  big?: boolean;
  smashed?: number;
}

export const HARVEST_TEX = new THREE.DataTexture(new Uint8Array(N * N * 4), N, N, THREE.RGBAFormat);
HARVEST_TEX.magFilter = THREE.NearestFilter;
HARVEST_TEX.minFilter = THREE.NearestFilter;
HARVEST_TEX.generateMipmaps = false;
HARVEST_TEX.needsUpdate = true;

const wrap = (i: number) => ((i % N) + N) % N;

/** The texture byte for a taken tree (quantised so a slow grow uploads rarely). */
function treeByte(t: Taken) {
  const g = t.grow ?? 0;
  return g <= 0 ? 255 : Math.max(1, Math.round((1 - Math.floor(g * 64) / 64) * 254));
}

export interface RegrowCtx {
  /** Could the player not see a prop here (a sphere at x, y, z of radius r)? */
  unseen(x: number, y: number, z: number, r: number): boolean;
  /** A clearing the player made: nothing comes back here. */
  keep(x: number, z: number): boolean;
}

export class Harvest {
  private taken = new Map<string, Taken>();
  private proxies = new Set<string>();
  /** Bumped on every change (stumps, rubble and colliders rebuild from it). */
  version = 0;
  /** In-game hours elapsed (saved with the story). */
  clock = 0;
  private acc = 0;
  private accH = 0;

  static cellOf(kind: HarvestKind, x: number, z: number): [number, number] {
    const c = kind === 'tree' ? TREE_CELL : ROCK_CELL;
    return [Math.floor(x / c), Math.floor(z / c)];
  }

  static key(kind: HarvestKind, gi: number, gj: number) { return `${kind}:${gi},${gj}`; }

  private write(kind: HarvestKind, gi: number, gj: number, chan: 'saved' | 'proxy', v: number) {
    const d = HARVEST_TEX.image.data as Uint8Array;
    const o = (wrap(gj) * N + wrap(gi)) * 4 + (kind === 'tree' ? 0 : 1) + (chan === 'proxy' ? 2 : 0);
    if (d[o] === v) return;
    d[o] = v;
    HARVEST_TEX.needsUpdate = true;
  }

  /** Taken at all (including a tree still regrowing): it can't be taken again yet. */
  has(kind: HarvestKind, gi: number, gj: number) { return this.taken.has(Harvest.key(kind, gi, gj)); }

  /** Not there to bump into: taken, or a sapling still too small to block. */
  gone(kind: HarvestKind, gi: number, gj: number) {
    const t = this.taken.get(Harvest.key(kind, gi, gj));
    return !!t && (kind === 'rock' || (t.grow ?? 0) < SOLID_AT);
  }

  get(kind: HarvestKind, gi: number, gj: number) { return this.taken.get(Harvest.key(kind, gi, gj)); }

  /** For now: the prop is gone from the world until it grows back. */
  take(t: Taken) {
    t.at ??= this.clock;
    if (t.kind === 'tree') t.grow ??= 0;
    this.taken.set(Harvest.key(t.kind, t.gi, t.gj), t);
    this.write(t.kind, t.gi, t.gj, 'saved', t.kind === 'tree' ? treeByte(t) : 255);
    this.version++;
  }

  /** A piece of a big rock's rubble has been smashed too. */
  smashPiece(gi: number, gj: number, k: number) {
    const t = this.taken.get(Harvest.key('rock', gi, gj));
    if (!t) return;
    t.smashed = (t.smashed ?? 0) | (1 << k);
    this.version++;
  }

  /** Hide the world's copy while a story prop stands in for it (or show it again). */
  proxy(kind: HarvestKind, gi: number, gj: number, on: boolean) {
    const k = Harvest.key(kind, gi, gj);
    if (on === this.proxies.has(k)) return;
    if (on) this.proxies.add(k); else this.proxies.delete(k);
    this.write(kind, gi, gj, 'proxy', on ? 255 : 0);
  }

  all(): Taken[] { return [...this.taken.values()]; }

  /**
   * Advance the harvest clock by `hours` of in-game time (`dt` real seconds)
   * and let things come back. Returns the props whose collision changed
   * (sprouted past solid, or back for good) so their collider cells rebuild.
   */
  update(hours: number, dt: number, ctx: RegrowCtx): Taken[] {
    this.clock += hours;
    this.accH += hours;
    this.acc += dt;
    // A slow process: once a second is plenty.
    if (this.acc < 1) return [];
    const dh = this.accH;
    this.acc = 0;
    this.accH = 0;
    const changed: Taken[] = [];
    for (const [k, t] of this.taken) {
      if (this.proxies.has(k) || ctx.keep(t.x, t.z)) continue;
      const age = this.clock - (t.at ?? this.clock);
      if (t.kind === 'tree') {
        const g0 = t.grow ?? 0;
        let g = g0;
        if (g0 <= 0) {
          if (age > TREE_DORMANT && ctx.unseen(t.x, t.y + 1, t.z, 2)) g = 1e-3;
        } else g = Math.min(1, g0 + dh / TREE_GROW);
        if (g === g0) continue;
        if (g >= 1) {
          this.taken.delete(k);
          this.write('tree', t.gi, t.gj, 'saved', 0);
          changed.push(t);
        } else {
          t.grow = g;
          this.write('tree', t.gi, t.gj, 'saved', treeByte(t));
          if (g0 < SOLID_AT && g >= SOLID_AT) changed.push(t);
        }
        this.version++;
      } else if (age > ROCK_RETURN && ctx.unseen(t.x, t.y + t.sc * 0.5, t.z, t.sc * (t.big ? 2 : 1.2))) {
        this.taken.delete(k);
        this.write('rock', t.gi, t.gj, 'saved', 0);
        changed.push(t);
        this.version++;
      }
    }
    return changed;
  }

  clear() {
    for (const t of this.taken.values()) this.write(t.kind, t.gi, t.gj, 'saved', 0);
    for (const k of this.proxies) {
      const [kind, rest] = k.split(':');
      const [gi, gj] = rest.split(',').map(Number);
      this.write(kind as HarvestKind, gi, gj, 'proxy', 0);
    }
    this.taken.clear();
    this.proxies.clear();
    this.clock = 0;
    this.version++;
  }

  load(list: Taken[], clock = 0) {
    this.clear();
    this.clock = clock;
    for (const t of list) this.take(t);
  }
}

/**
 * The small rocks a big boulder breaks into, as world instance rows (x, y,
 * z, scale, rot, yScale, lean, tone): a loose pile inside its footprint, a
 * pure function of the seed and the boulder's cell. Low enough (< 0.5 m) to
 * walk over.
 */
export function rubbleOf(t: Taken, seed: number, height: (x: number, z: number) => number): Float32Array[] {
  const n = t.sc > 2 ? 4 : 3;
  const out: Float32Array[] = [];
  for (let k = 0; k < n; k++) {
    const h = (salt: number) => hash01(t.gi * 8 + k, t.gj, seed, 610 + salt);
    const a = t.rot + (k / n) * Math.PI * 2 + (h(0) - 0.5) * 0.9;
    const d = 0.9 * t.sc * (0.4 + 0.35 * h(1));
    const sc = 0.55 + 0.3 * h(2);
    const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
    out.push(new Float32Array([x, height(x, z) - sc * 0.25, z, sc, h(3) * 6.283, 0.55 + 0.2 * h(4), 0, h(5)]));
  }
  return out;
}
