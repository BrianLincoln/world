import * as THREE from 'three';
import { postSettings } from '../gfx/post';
import { hash01 } from '../core/rng';
import { TOWER_REGION, type Tower } from '../world/towers';

// The cold country (DESIGN.md "The cold country", docs/NEXT-warmth.md).
// **For now (owner, 2026-10-07, later that evening) the cold is only the
// mountain tops**: the land above `postSettings.cold.top` m, always, whatever is lit. No tower
// is a cold tower, so none wants sparks and no warmth rolls out (`REGIONS`
// is off; everything below about regions and patches is kept for when it's
// wanted again, and is still what `?cold=1` shows).
// Before that, the same evening, the cold was only certain regions of the
// country, there from the first and nothing to do with the story: some
// towers are *cold towers* (`isCold`: a function of the seed and where the
// tower stands, in blocks of `REGION` m, none near the start), and the land
// nearer one of those than any other tower, its *patch*, is cold until it's
// lit. Every other patch is simply warm. (Before that, the same day: all of
// it cold once the giant had been, `on`; and for a day, cold from the first.)
// Lighting a cold tower, the warming rolls out from it as a ring (`reach`)
// and stops at its neighbours' borders. (`pockets` is only dev's.)
//
// Nothing here is saved: it follows from the seed and which towers are lit
// (saved by `Beacons`).
// The composite pass draws it (`COMPOSITE_FRAG` in gfx/post.ts) from three
// small textures; `warmAt` is the same maths for anything that asks.

/** The id map: cells across, and how far it reaches from the start site (m). */
const IDS = 256, HALF = TOWER_REGION + 1900;
/** The coarse warm/cold map the air is read from (fog along a sight line, the sky over the land): cells across. */
const AIR = 128;
/** Room in the towers' texture. */
const MAX = 256;
/** The warming's first rush: this far (m) in this long (s), gathering pace (it is watched from over the tower); then on outward at `ON` m/s to the edge of its patch. */
const RUSH = 1500, RUSH_T = 11, ON = 400;
/** Were the cold to come on (`on` going true while you play), it would over this long (s). */
const FALL = 24;
/** Cold country comes in blocks this big (m), this share of them, and never within this of the start (m). */
const REGION = 2700, SHARE = 0.28, CLEAR = 2000;
/** Are there cold regions at all? (Not for now: only the mountain tops are cold.) */
const REGIONS = false;
// (How high the mountains' cold line lies is the look's: `postSettings.cold.top`.)
/** The rim of light along the warmth's edge: while it rolls, and once it rests. */
const RIM = { fresh: 1, rest: 0.4, fade: 6 };

/** How far the warmth has got `age` seconds after its tower was lit (m). */
export function reach(age: number) {
  if (age < 0) return 0;
  if (age < RUSH_T) return RUSH * Math.pow(age / RUSH_T, 1.6);
  const r = RUSH + (age - RUSH_T) * ON;
  return r > 9000 ? 1e6 : r;
}

/** The edge wanders: a place is judged from a little to one side of where it is (the same in the shader: `wob`). */
function wobX(x: number, z: number) { return x + 14 * Math.sin(z * 0.011 + 1.3 * Math.sin(x * 0.007)); }
function wobZ(x: number, z: number) { return z + 14 * Math.sin(x * 0.0093 + 1.7 * Math.sin(z * 0.0061)); }

/** Something that warms the land nearest it: a beacon tower, or a won dungeon's ring (its shrine). */
export interface Lamp { id: number; x: number; z: number; tower: Tower | null; /** Which dungeon's ring (0 = the first), or -1. */ ring: number }

export interface WarmthDeps {
  /** Is this tower alight (its spirit in its head)? */
  lit(id: number): boolean;
  /** Is this dungeon's ring warm (the dungeon won and the giant up and gone from it)? */
  ringWarm(i: number): boolean;
  /** The ground's height (m). */
  height(x: number, z: number): number;
}

export class Warmth {
  private towers: Lamp[] = [];
  /** How long each has been warming (s; -1 = it isn't). */
  private age = new Float32Array(MAX).fill(-1);
  private fresh = true;
  private ox = 0;
  private oz = 0;
  private ids = new Uint8Array(IDS * IDS * 4);
  private tow = new Float32Array(MAX * 4);
  private air = new Uint8Array(AIR * AIR);
  private idsTex = new THREE.DataTexture(this.ids, IDS, IDS, THREE.RGBAFormat, THREE.UnsignedByteType);
  private towTex = new THREE.DataTexture(this.tow, MAX, 1, THREE.RGBAFormat, THREE.FloatType);
  private airTex = new THREE.DataTexture(this.air, AIR, AIR, THREE.RedFormat, THREE.UnsignedByteType);
  /** Each tower's warmth so far (m; 0 = cold). */
  private r = new Float32Array(MAX);
  private stamp = '';
  /** 0..1: how cold the country is as a whole (0 until the giant has been). */
  amt = 0;
  /** Is there cold country at all? */
  on = true;
  private coldIds = new Set<number>();
  /** Is tower `id` one of the cold country's (its patch cold until it's lit)? */
  isCold(id: number) { return this.force ?? this.coldIds.has(id); }
  /** Lit cabins: each a little circle of warmth of its own, wherever it stands (main sets them; eight at most). */
  pockets: { x: number; z: number; r: number; /** Its rim of light (0.5 at rest). */ rim?: number }[] = [];
  /** Dev: all of it cold country, or none of it (null = its regions). */
  force: boolean | null = null;
  private forced: boolean | null = null;

  constructor(private d: WarmthDeps) {
    for (const t of [this.idsTex, this.towTex]) { t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; }
    this.airTex.minFilter = this.airTex.magFilter = THREE.LinearFilter;
    this.airTex.generateMipmaps = false;
    this.airTex.unpackAlignment = 1;
  }

  /** A new world: its towers, the start site the maps are centred on, its seed, the towers that are never cold (the story's own), and any dungeons' rings. */
  setWorld(towers: Tower[], site: { x: number; z: number }, seed = 0, spare: number[] = [], rings: { x: number; z: number }[] = []) {
    this.coldIds.clear();
    for (const t of towers) {
      if (!REGIONS || t.home || spare.includes(t.id) || Math.hypot(t.x - site.x, t.z - site.z) < CLEAR) continue;
      if (hash01(Math.floor(t.x / REGION), Math.floor(t.z / REGION), seed, 7151) < SHARE) this.coldIds.add(t.id);
    }
    this.towers = towers.slice(0, MAX - 8).map((t) => ({ id: t.id, x: t.x, z: t.z, tower: t, ring: -1 }));
    rings.forEach((r, i) => this.towers.push({ id: this.towers.length, x: r.x, z: r.z, tower: null, ring: i }));
    this.age.fill(-1);
    this.fresh = true;
    this.ox = site.x;
    this.oz = site.z;
    // The four towers nearest each cell: the nearest to any point in it is one of them.
    const T = this.towers, cell = (2 * HALF) / IDS;
    const best = [0, 0, 0, 0], bd = [0, 0, 0, 0];
    for (let j = 0; j < IDS; j++) for (let i = 0; i < IDS; i++) {
      const x = this.ox - HALF + (i + 0.5) * cell, z = this.oz - HALF + (j + 0.5) * cell;
      bd.fill(Infinity); best.fill(0);
      for (let k = 0; k < T.length; k++) {
        const d = (T[k].x - x) ** 2 + (T[k].z - z) ** 2;
        for (let s = 0; s < 4; s++) if (d < bd[s]) { for (let q = 3; q > s; q--) { bd[q] = bd[q - 1]; best[q] = best[q - 1]; } bd[s] = d; best[s] = k; break; }
      }
      const o = (j * IDS + i) * 4;
      for (let s = 0; s < 4; s++) this.ids[o + s] = bd[s] < Infinity ? best[s] : best[0];
    }
    this.idsTex.needsUpdate = true;
    this.r.fill(0);
    this.stamp = '';
    this.snap();
  }

  /** The lamp whose patch (x, z) is in. */
  patch(x: number, z: number): Lamp | null {
    const T = this.towers;
    if (!T.length) return null;
    const wx = wobX(x, z), wz = wobZ(x, z), cell = (2 * HALF) / IDS;
    const i = THREE.MathUtils.clamp(Math.floor((wx - this.ox + HALF) / cell), 0, IDS - 1), j = THREE.MathUtils.clamp(Math.floor((wz - this.oz + HALF) / cell), 0, IDS - 1);
    const o = (j * IDS + i) * 4;
    let b = T[this.ids[o]], bd = Infinity;
    for (let s = 0; s < 4; s++) { const t = T[this.ids[o + s]], d = Math.hypot(t.x - wx, t.z - wz); if (d < bd) { bd = d; b = t; } }
    return b;
  }

  /** Is it warm at (x, z)? (Always, until the country goes cold.) */
  warmAt(x: number, z: number) {
    if (this.amt < 0.5) return true;
    for (const p of this.pockets) if (Math.hypot(p.x - x, p.z - z) < p.r) return true;
    // (Up a mountain it's cold whatever is lit; the line is the shader's, `coldHigh`.)
    const top = postSettings.cold.top;
    if (top > 0 && this.d.height(x, z) > top + wobX(x, z) - x) return false;
    const t = this.patch(x, z);
    if (!t) return true;
    return Math.hypot(t.x - wobX(x, z), t.z - wobZ(x, z)) < this.r[t.id];
  }

  /** 0..1: how much of the country's towers are warm (for whoever wants to know how it's going). */
  get share() {
    let n = 0;
    for (const t of this.towers) if (this.r[t.id] > 0) n++;
    return this.towers.length ? n / this.towers.length : 1;
  }

  update(dt: number) {
    const cold = this.force ?? this.on;
    if (this.force !== this.forced) { this.forced = this.force; this.age.fill(-1); this.fresh = true; }
    // It comes over slowly the first time; a save that is already cold starts cold (`snap`).
    this.amt = THREE.MathUtils.clamp(this.amt + (cold ? dt / FALL : -dt / 2), 0, 1);
    const c = postSettings.cold;
    c.amt = this.amt * this.amt * (3 - 2 * this.amt);
    if (this.amt <= 0 || !this.towers.length) { c.ids = null; return; }
    // Each tower's reach and rim, and a stamp of it all: the coarse map is redone only when something has moved.
    let stamp = '';
    for (const t of this.towers) {
      const lit = t.tower ? !this.isCold(t.id) || this.d.lit(t.id) : this.d.ringWarm(t.ring);
      // (What's alight when first looked at has long been: only what is lit while you play rolls out.)
      this.age[t.id] = !lit ? -1 : this.age[t.id] < 0 ? (this.fresh ? 1e3 : 0) : this.age[t.id] + dt;
      const age = this.age[t.id];
      const r = reach(age);
      this.r[t.id] = r;
      const o = t.id * 4;
      this.tow[o] = t.x; this.tow[o + 1] = t.z; this.tow[o + 2] = r;
      this.tow[o + 3] = lit ? RIM.rest + (RIM.fresh - RIM.rest) * (1 - THREE.MathUtils.smoothstep(age, RUSH_T, RUSH_T + RIM.fade)) : 0;
      stamp += r >= 1e6 ? 'F' : r > 0 ? r.toFixed(0) + ',' : '-';
    }
    this.fresh = false;
    this.towTex.needsUpdate = true;
    if (stamp !== this.stamp) {
      this.stamp = stamp;
      const cell = (2 * HALF) / AIR, T = this.towers, k = IDS / AIR;
      for (let j = 0; j < AIR; j++) for (let i = 0; i < AIR; i++) {
        const x = this.ox - HALF + (i + 0.5) * cell, z = this.oz - HALF + (j + 0.5) * cell;
        const o = ((Math.floor((j + 0.5) * k)) * IDS + Math.floor((i + 0.5) * k)) * 4;
        let b = 0, bd = Infinity;
        for (let s = 0; s < 4; s++) { const t = T[this.ids[o + s]], d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; b = t.id; } }
        this.air[j * AIR + i] = bd < this.r[b] ? 255 : 0;
      }
      this.airTex.needsUpdate = true;
    }
    c.ids = this.idsTex; c.tow = this.towTex; c.air = this.airTex;
    c.ox = this.ox; c.oz = this.oz; c.half = HALF;
    c.pockets = this.pockets.slice(0, 8).flatMap((p) => [p.x, p.z, p.r, p.rim ?? 0.5]);
  }

  /** As cold as it is, at once: no slow fall. */
  snap() { this.amt = (this.force ?? this.on) ? 1 : 0; }
}
