import * as THREE from 'three';
import type { Environment } from '../gfx/environment';
import { makeSolidMaterial, U } from '../gfx/materials';
import { Puffs } from '../gfx/puffs';
import type { CharacterRig } from '../player/character';
import type { Input } from '../player/input';
import type { Body } from '../player/movement';
import { siteLocal, siteToLocal, type StorySite } from '../world/storySite';
import type { WorldGen } from '../world/worldgen';
import type { Sfx } from './audio';
import { RuinCabin, type PartId } from './cabin';
import { CAB } from './geometry';
import { Hud } from './hud';
import { glowCanvas, iconCanvas, tex, type IconName } from './icons';
import { Billboard, OVERLAY_U } from './overlay';
import { PHASE1, type Anchor, type PhaseDef, type Resource, type StepDef, type TargetTag } from './phase1';
import { AxeProp, ChopTree, easeGlint, Flyer, HammerProp, SmashRock, Stumps, Woods, type WoodTree } from './props';
import type { Colliders } from '../world/colliders';
import { BIG_ROCK, Harvest, rubbleOf, type RegrowCtx, type Taken } from '../world/harvest';
import { hash01 } from '../core/rng';
import { segDist } from '../world/worldgen';
import { Spirit } from './spirit';

// The story director. It runs a phase table (phase1.ts) over the story set:
// the broken cabin, the axe, the grove, the brook stones and the spirit. It
// knows the step *kinds* (meet, pickup, gather, build, light, rest), not the
// content, so later phases can reuse it. It owns the interaction system
// (walk up to things; E / click also works), the inventory, the clock while
// the story runs, the idle hints and the save.

const SAVE_VERSION = 2;
/** How long a tool stays in hand after its last use before it's stowed again (s). */
const TOOL_HOLD = 0.7;
/** Seconds without progress before the spirit repeats its hint, more obviously. */
const HINT_AFTER = 20;

interface Target {
  tag: TargetTag;
  pos: THREE.Vector3;
  reach: number;
  mat: THREE.ShaderMaterial;
  ok(): boolean;
}

interface SaveData {
  v: number;
  step: string;
  inv: Record<Resource, number>;
  axe: boolean;
  hammer: boolean;
  felled: number[];
  /** Story boulders smashed. */
  smashed: number[];
  /** World trees felled and rocks smashed (anywhere), and how far they've come back. */
  world: Taken[];
  /** The harvest clock (in-game hours). */
  clock?: number;
  filled: Record<PartId, number>;
  built: PartId[];
  lit: boolean;
  done: boolean;
  hour: number;
}

interface Token { bb: Billboard; from: THREE.Vector3; part: PartId; slot: number; t: number; res: Resource }

export interface StoryDeps {
  scene: THREE.Scene;
  overlay: THREE.Scene;
  gen: WorldGen;
  env: Environment;
  rig: CharacterRig;
  body: Body;
  sfx: Sfx;
  camera: THREE.PerspectiveCamera;
  puffs(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** World prop collision (to find trees and rocks to take). */
  colliders: Colliders;
  /** What's been taken out of the world (felled / smashed). */
  harvest: Harvest;
  /** localStorage key suffix (the seed text). */
  saveKey: string;
  /** false = the sandbox only: the set is there, but nothing runs. */
  active: boolean;
}

export class Story {
  readonly site: StorySite;
  readonly cabin: RuinCabin;
  readonly spirit: Spirit;
  readonly trees: ChopTree[] = [];
  /** Boulders to smash behind the cabin ([0] has the hammer on it). */
  readonly rocks: SmashRock[] = [];
  readonly axe: AxeProp;
  readonly hammer: HammerProp;
  readonly stumps = new Stumps();
  /** A world tree / rock stood in for by a story prop (glints, takes hits). */
  private proxyTree: { tree: ChopTree; gi: number; gj: number; row: Float32Array } | null = null;
  private proxyRock: { rock: SmashRock; gi: number; gj: number; row: Float32Array } | null = null;
  /** World trees / rocks being felled or broken (they finish even if you walk off). */
  private worldChops: { tree: ChopTree; gi: number; gj: number; row: Float32Array }[] = [];
  private worldBreaks: { rock: SmashRock; gi: number; gj: number; row: Float32Array }[] = [];
  /** What big boulders broke into: small rocks to smash in turn (key "gi,gj#k"). */
  private rubble = new Map<string, { rock: SmashRock; gi: number; gj: number; k: number }>();
  private lastHour = -1;
  private harvestSeen = -1;
  private saveClockT = 0;
  private frustum = new THREE.Frustum();
  private projView = new THREE.Matrix4();
  private sphere = new THREE.Sphere();
  private regrow: RegrowCtx;
  private dynTargets: Target[] = [];
  readonly group = new THREE.Group();
  readonly overlayGroup = new THREE.Group();
  readonly hud: Hud;
  readonly phase: PhaseDef = PHASE1;
  readonly far: FarLight;
  readonly woods: Woods;
  private sparkles = new Puffs('#ffe7a0', 30, 0.8, 0.9);
  private chipPuffs = new Puffs('#ecd3a2', 24, 0, 0.6);
  private flyers: { f: Flyer; res: Resource; stone: number }[] = [];
  private tokens: Token[] = [];
  private targets: Target[] = [];
  stepIndex = 0;
  inv: Record<Resource, number> = { logs: 0, stones: 0 };
  hasAxe = false;
  hasHammer = false;
  /** The tool drawn for the last action, and how long ago it was used. */
  private toolHand: 'axe' | 'hammer' | null = null;
  private toolT = 99;
  done = false;
  private idleT = 0;
  private boostT = 0;
  private swingT = -1;
  private swingCd = 0;
  private swingOn: { tree?: ChopTree; rock?: SmashRock } = {};
  private depositT = 0;
  private stepT = 0;
  private revealT = -1;
  private revealWait = 0;
  private anchors = new Map<Anchor, THREE.Vector3>();
  private dirty = false;
  private saveT = 0;
  private t = 0;
  /** Suppress text UI while the opening runs. */
  get silent() { return this.d.active && !this.done; }

  constructor(private d: StoryDeps) {
    const gen = d.gen;
    const site = (this.site = gen.story);
    const ground = (x: number, z: number) => gen.height(x, z);
    this.cabin = new RuinCabin(site, d.puffs);
    this.group.add(this.cabin.root, this.cabin.embers.group, this.cabin.smoke.group, this.cabin.column.batch.mesh, this.sparkles.group, this.chipPuffs.group);
    this.overlayGroup.add(this.cabin.overlay);
    site.trees.forEach((t, i) => {
      const tree = new ChopTree(t, ground(t.x, t.z), i);
      tree.onLanded = (tr) => this.treeLanded(tr);
      tree.onGone = (tr, along) => this.treeGone(tr, along);
      this.trees.push(tree);
      this.group.add(tree.group);
    });
    site.boulders.forEach((b, i) => {
      const y = ground(b.x, b.z);
      const r = new SmashRock([b.x, y - b.sc * 0.25, b.z, b.sc, b.rot, 0.72, 0, 0.3 + i * 0.2], i);
      r.onBroken = (rk) => this.rockBroken(rk);
      this.rocks.push(r);
      this.group.add(r.group);
    });
    const hb = site.boulders[0];
    // Leaning on the cabin side of its boulder, a little away from where the spirit waits.
    const hdir = new THREE.Vector3(site.x - hb.x, 0, site.z - hb.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.45);
    this.hammer = new HammerProp(this.rocks[0], hdir, ground);
    this.group.add(this.hammer.mesh, this.stumps.mesh);
    const cab = { x: site.x, z: site.z };
    // The axe leans on the side facing the yard (where you walk in).
    this.axe = new AxeProp(site.stump.x, ground(site.stump.x, site.stump.z), site.stump.z, Math.atan2(site.paths[0].bx - cab.x, site.paths[0].bz - cab.z));
    this.group.add(this.axe.group);
    this.woods = new Woods(this.plantWoods(gen));
    this.group.add(this.woods.group);
    this.far = new FarLight(site);
    this.group.add(this.far.mesh);
    this.overlayGroup.add(this.far.halo.mesh);

    // Named places.
    const L = (lx: number, lz: number) => { const p = siteLocal(site, lx, lz); return new THREE.Vector3(p.x, ground(p.x, p.z), p.z); };
    const inside = (lx: number, lz: number) => { const p = siteLocal(site, lx, lz); return new THREE.Vector3(p.x, site.y + CAB.floor, p.z); };
    const hx = CAB.hearth.x, hz = CAB.hearth.z;
    this.anchors.set('hearthSpot', inside(hx - 1.45, hz + 0.1));
    this.anchors.set('hearthSeat', inside(hx - 1.3, hz + 0.95));
    this.anchors.set('hearth', this.cabin.hearthPos.clone());
    this.anchors.set('door', L(-0.9, CAB.D / 2 + 0.5));
    this.anchors.set('doorstep', L(-0.2, CAB.D / 2 + 2.2));
    const stumpToCab = new THREE.Vector3(site.x - site.stump.x, 0, site.z - site.stump.z).normalize();
    this.anchors.set('stumpSpot', new THREE.Vector3(site.stump.x + stumpToCab.x * 1.3 + stumpToCab.z * 0.6, 0, site.stump.z + stumpToCab.z * 1.3 - stumpToCab.x * 0.6));
    this.anchors.set('axe', this.axe.pos.clone().setY(this.axe.pos.y + 0.5));
    this.anchors.set('seat', new THREE.Vector3(site.seat.x, 0, site.seat.z));
    const gc = site.trees.reduce((a, t) => a.add(new THREE.Vector3(t.x, 0, t.z)), new THREE.Vector3()).divideScalar(Math.max(1, site.trees.length));
    this.anchors.set('grove', gc.setY(ground(gc.x, gc.z) + 2));
    this.anchors.set('yard', L(1.3, CAB.D / 2 + 1.7));
    this.anchors.set('cabin', L(0, 0).setY(site.y + 2.5));
    this.anchors.set('roof', this.cabin.parts.roof.centre.clone());
    this.anchors.set('bank', new THREE.Vector3(site.bank.x, 0, site.bank.z));
    // Beside the hammer's boulder, on the cabin side, looking at it.
    const hbv = new THREE.Vector3(hb.x, 0, hb.z);
    const toCab = new THREE.Vector3(site.x - hb.x, 0, site.z - hb.z).normalize();
    this.anchors.set('hammerSpot', hbv.clone().addScaledVector(toCab, 1.8 + hb.sc).add(new THREE.Vector3(toCab.z, 0, -toCab.x).multiplyScalar(0.8)));
    this.anchors.set('hammer', this.hammer.pos.clone());
    const rc = site.boulders.reduce((a, b) => a.add(new THREE.Vector3(b.x, 0, b.z)), new THREE.Vector3()).divideScalar(site.boulders.length);
    this.anchors.set('rocks', rc.setY(ground(rc.x, rc.z) + 0.6));
    this.anchors.set('chimneySpot', L(CAB.W / 2 + 2.6, 1.6));
    this.anchors.set('chimney', this.cabin.parts.chimney.centre.clone());
    this.anchors.set('far', this.far.pos.clone());
    this.anchors.set('lookout', new THREE.Vector3(site.lookout.x, 0, site.lookout.z));
    for (const [k, v] of this.anchors) if (v.y === 0 && k !== 'far') v.y = ground(v.x, v.z);

    // Interactables.
    this.targets.push({ tag: 'axe', pos: this.axe.pos, reach: 2.3, mat: this.axe.mat, ok: () => !this.axe.taken });
    for (const t of this.trees) this.targets.push({ tag: 'tree', pos: t.pos, reach: 1.65 + t.radius, mat: t.mat, ok: () => t.standing });
    this.targets.push({ tag: 'hammer', pos: this.hammer.pos, reach: 2.0 + hb.sc, mat: this.hammer.mat, ok: () => !this.hammer.taken });
    for (const r of this.rocks) this.targets.push({ tag: 'rock', pos: r.pos, reach: 1.6 + r.radius, mat: r.mat, ok: () => !r.broken && this.hasHammer });
    this.targets.push({
      tag: 'hearth', pos: this.cabin.hearthPos, reach: 2.0, mat: this.cabin.hearthMat,
      ok: () => !this.cabin.lit && d.env.hour >= (this.step.kind === 'light' ? this.step.readyAt : 99),
    });

    this.spirit = new Spirit({
      ground: (x, z) => this.floorAt(x, z),
      route: (a, b) => this.route(a, b),
      sound: (n) => { if (n === 'excited') d.sfx.chirp(true); else d.sfx[n](); },
      sparkle: (at, n) => this.sparkles.emit(at, n, 0.07, 1.4, undefined, { life: 0.6, rise: 0.4, up: 1.4 }),
    }, this.anchors.get('hearthSpot')!.clone());
    this.spirit.home = new THREE.Vector3(site.x, 0, site.z);
    this.group.add(this.spirit.group);
    this.overlayGroup.add(this.spirit.bubble.mesh);
    this.hud = new Hud();
    this.regrow = {
      // Only where you'd never catch it happening: well away, or off screen.
      unseen: (x, y, z, r) => {
        const dd = Math.hypot(x - d.body.pos.x, z - d.body.pos.z);
        if (dd < 25) return false;
        return dd > 120 || !this.frustum.intersectsSphere(this.sphere.set(this.sphere.center.set(x, y, z), r));
      },
      // The cabin's clearing stays cleared.
      keep: (x, z) => Math.hypot(x - site.x, z - site.z) < 40,
    };

    d.scene.add(this.group);
    d.overlay.add(this.overlayGroup);
    this.load();
    this.enterStep(true);
    if (!d.active) {
      this.spirit.group.visible = false;
      this.spirit.bubble.mesh.visible = false;
    }
  }

  get step(): StepDef { return this.phase.steps[Math.min(this.stepIndex, this.phase.steps.length - 1)]; }

  anchor(a: Anchor) { return this.anchors.get(a)!; }

  /** Ground or cabin floor. */
  floorAt(x: number, z: number) {
    const g = this.d.gen.height(x, z);
    return this.cabin.inside(x, z, -0.2) ? Math.max(g, this.site.y + CAB.floor) : g;
  }

  /**
   * Conifers round the start clearing and along the first two-thirds of the
   * path from it, wherever the natural forest is thin, so the walk always
   * starts in the woods and the cabin opens up round the bend. Seeded: the
   * same trees every time.
   */
  private plantWoods(gen: WorldGen): WoodTree[] {
    const site = this.site;
    const seed = gen.seed;
    const approach = site.paths.slice(2); // [0] door->yard, [1] to the bank
    const out: WoodTree[] = [];
    if (!approach.length) return out;
    const S = site.spawn;
    const pathD = (x: number, z: number) => approach.reduce((d, p) => Math.min(d, segDist(x, z, p)), Infinity);
    for (let i = 0; i < 700 && out.length < 95; i++) {
      const r = (k: number) => hash01(i, k, seed, 977);
      let x: number, z: number;
      if (r(0) < 0.4) {
        const a = r(1) * Math.PI * 2, d = 10 + r(2) * 16;
        x = S.x + Math.cos(a) * d; z = S.z + Math.sin(a) * d;
      } else {
        // Beside the path, over the stretch nearest the start.
        const seg = approach[approach.length - 1 - Math.floor(r(1) * approach.length * 0.7)];
        const t = r(2);
        const px = seg.ax + (seg.bx - seg.ax) * t, pz = seg.az + (seg.bz - seg.az) * t;
        const l = Math.hypot(seg.bx - seg.ax, seg.bz - seg.az) || 1;
        const side = (r(3) < 0.5 ? -1 : 1) * (5.4 + r(4) * 9);
        x = px - ((seg.bz - seg.az) / l) * side; z = pz + ((seg.bx - seg.ax) / l) * side;
      }
      const h = gen.height(x, z);
      if (h < 2.5 || Math.abs(gen.height(x + 2, z) - gen.height(x - 2, z)) > 1.4) continue;
      if (gen.forestDensity(x, z, h) > 0.35) continue; // real forest already
      if (pathD(x, z) < 5.2 || Math.hypot(x - S.x, z - S.z) < 9.5) continue;
      if (Math.hypot(x - site.x, z - site.z) < 24) continue;
      if (gen.storyBlock(x, z, 1.2, 'tree')) continue;
      if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 3.6)) continue;
      out.push({ x, y: h, z, sc: 0.75 + r(5) * 0.45, rot: r(6) * 6.283, lean: r(7) - 0.5, tone: r(8) });
    }
    return out;
  }

  // ------------------------------------------------------------ world hooks

  /** Solid story props (cabin walls, standing trunks, stumps). */
  collide(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    this.cabin.push(pos, vel, r);
    const l = siteToLocal(this.site, pos.x, pos.z);
    if (Math.abs(l.x) > 130 || Math.abs(l.z) > 130) return;
    for (const t of this.woods.trees) {
      const rad = 0.34 * t.sc + r;
      const dx = pos.x - t.x, dz = pos.z - t.z;
      const dd = Math.hypot(dx, dz);
      if (dd >= rad || dd < 1e-4 || pos.y > t.y + 12) continue;
      pos.x = t.x + (dx / dd) * rad;
      pos.z = t.z + (dz / dd) * rad;
      const vn = (vel.x * dx + vel.z * dz) / dd;
      if (vn < 0) { vel.x -= (dx / dd) * vn; vel.z -= (dz / dd) * vn; }
    }
    for (const rk of this.rocks) {
      if (rk.broken) continue;
      const rad = rk.radius * 0.95 + r;
      const dx = pos.x - rk.pos.x, dz = pos.z - rk.pos.z;
      const dd = Math.hypot(dx, dz);
      if (dd >= rad || dd < 1e-4 || pos.y > rk.pos.y + rk.radius) continue;
      pos.x = rk.pos.x + (dx / dd) * rad;
      pos.z = rk.pos.z + (dz / dd) * rad;
      const vn = (vel.x * dx + vel.z * dz) / dd;
      if (vn < 0) { vel.x -= (dx / dd) * vn; vel.z -= (dz / dd) * vn; }
    }
    for (const t of this.allTrees()) {
      const rad = (t.state === 'standing' ? t.radius : 0.36 * t.def.sc) + r;
      if (pos.y > t.pos.y + (t.state === 'standing' ? 12 : 0.4)) continue;
      const dx = pos.x - t.pos.x, dz = pos.z - t.pos.z;
      const dd = Math.hypot(dx, dz);
      if (dd >= rad || dd < 1e-4) continue;
      const nx = dx / dd, nz = dz / dd;
      pos.x = t.pos.x + nx * rad;
      pos.z = t.pos.z + nz * rad;
      const vn = vel.x * nx + vel.z * nz;
      if (vn < 0) { vel.x -= nx * vn; vel.z -= nz * vn; }
    }
  }

  /** The grove plus any world tree being targeted or felled. */
  private allTrees(): ChopTree[] {
    const out = [...this.trees, ...this.worldChops.map((w) => w.tree)];
    if (this.proxyTree) out.push(this.proxyTree.tree);
    return out;
  }

  private allRocks(): SmashRock[] {
    const out = [...this.rocks, ...this.worldBreaks.map((w) => w.rock), ...[...this.rubble.values()].map((r) => r.rock)];
    if (this.proxyRock) out.push(this.proxyRock.rock);
    return out;
  }

  // ------------------------------------------------------------ world trees and rocks

  /**
   * Any world tree (with the axe) or ordinary boulder (with the hammer) you
   * walk up to is swapped for an identical story prop that can glint and
   * take blows; the world's instance hides meanwhile (Harvest proxy flag).
   * Walk away without hitting it and the world's copy comes back. Once it
   * falls or breaks it's taken for good (saved), leaving a stump.
   */
  private updateProxies(walking: boolean) {
    const d = this.d;
    const p = d.body.pos;
    const hitT = this.hasAxe && walking ? d.colliders.nearestTree(p.x, p.z, 1.6) : null;
    const cT = hitT ? Harvest.cellOf('tree', hitT.x, hitT.z) : null;
    if (this.proxyTree && (!cT || cT[0] !== this.proxyTree.gi || cT[1] !== this.proxyTree.gj)) this.releaseTree();
    if (hitT && cT && !this.proxyTree && !this.worldChops.some((w) => w.gi === cT[0] && w.gj === cT[1])) {
      const r = hitT.row;
      const tree = new ChopTree({ x: r[0], z: r[2], sc: r[3], rot: r[4], lean: r[6], tone: r[7], sy: r[5] }, r[1] + 0.4, -1);
      tree.onLanded = (tr) => this.treeLanded(tr);
      tree.onGone = (tr, along) => this.treeGone(tr, along);
      this.group.add(tree.group);
      d.harvest.proxy('tree', cT[0], cT[1], true);
      this.proxyTree = { tree, gi: cT[0], gj: cT[1], row: r };
    }
    const hitR = this.hasHammer && walking ? d.colliders.nearestRock(p.x, p.z, 1.4, Infinity) : null;
    const cR = hitR ? Harvest.cellOf('rock', hitR.x, hitR.z) : null;
    if (this.proxyRock && (!cR || cR[0] !== this.proxyRock.gi || cR[1] !== this.proxyRock.gj)) this.releaseRock();
    if (hitR && cR && !this.proxyRock && !this.worldBreaks.some((w) => w.gi === cR[0] && w.gj === cR[1])) {
      // Big boulders take more blows (and break into rubble, see rockBroken).
      const rock = new SmashRock(hitR.row, -1, hitR.row[3] > BIG_ROCK ? 5 : 3);
      rock.onBroken = (rk) => this.rockBroken(rk);
      this.group.add(rock.group);
      d.harvest.proxy('rock', cR[0], cR[1], true);
      this.proxyRock = { rock, gi: cR[0], gj: cR[1], row: hitR.row };
    }
    this.dynTargets.length = 0;
    if (this.proxyTree) { const t = this.proxyTree.tree; this.dynTargets.push({ tag: 'tree', pos: t.pos, reach: 1.7 + t.radius, mat: t.mat, ok: () => t.standing }); }
    if (this.proxyRock) { const r = this.proxyRock.rock; this.dynTargets.push({ tag: 'rock', pos: r.pos, reach: 1.6 + r.radius, mat: r.mat, ok: () => !r.broken }); }
    if (this.hasHammer) {
      for (const { rock: r } of this.rubble.values()) {
        if (r.broken || Math.hypot(r.pos.x - p.x, r.pos.z - p.z) > 4) continue;
        this.dynTargets.push({ tag: 'rock', pos: r.pos, reach: 1.6 + r.radius, mat: r.mat, ok: () => !r.broken });
      }
    }
  }

  private releaseTree() {
    const w = this.proxyTree!;
    this.proxyTree = null;
    // Already cut into: it'll finish falling where it is.
    if (w.tree.hits > 0) { this.worldChops.push(w); return; }
    this.group.remove(w.tree.group);
    this.d.harvest.proxy('tree', w.gi, w.gj, false);
  }

  private releaseRock() {
    const w = this.proxyRock!;
    this.proxyRock = null;
    if (w.rock.hits > 0) { this.worldBreaks.push(w); return; }
    this.group.remove(w.rock.group);
    this.d.harvest.proxy('rock', w.gi, w.gj, false);
  }

  /** A world tree has fallen or a world rock broken: take it for good. */
  private takeWorld(kind: 'tree' | 'rock', gi: number, gj: number, row: Float32Array) {
    const d = this.d;
    const t: Taken = { kind, gi, gj, x: row[0], y: d.gen.height(row[0], row[2]), z: row[2], sc: row[3], rot: row[4] };
    if (kind === 'rock' && row[3] > BIG_ROCK) t.big = true;
    d.harvest.take(t);
    d.harvest.proxy(kind, gi, gj, false);
    d.colliders.invalidate(row[0], row[2]);
    this.refreshTaken();
    this.dirty = true;
  }

  /** Stumps and rubble, from what's taken (and how far it's grown back). */
  private refreshTaken() {
    this.harvestSeen = this.d.harvest.version;
    const all = this.d.harvest.all();
    this.stumps.set(all.filter((t) => t.kind === 'tree'));
    const want = new Set<string>();
    for (const t of all) {
      if (t.kind !== 'rock' || !t.big) continue;
      rubbleOf(t, this.d.gen.seed, (x, z) => this.d.gen.height(x, z)).forEach((row, k) => {
        if ((t.smashed ?? 0) & (1 << k)) return;
        const key = `${t.gi},${t.gj}#${k}`;
        want.add(key);
        if (this.rubble.has(key)) return;
        const rock = new SmashRock(row);
        rock.onBroken = (rk) => this.rockBroken(rk);
        this.group.add(rock.group);
        this.rubble.set(key, { rock, gi: t.gi, gj: t.gj, k });
      });
    }
    // Pieces smashed (once their break has played) or back as a boulder.
    for (const [key, r] of this.rubble) {
      if (want.has(key) || (r.rock.broken && r.rock.group.visible)) continue;
      this.group.remove(r.rock.group);
      this.rubble.delete(key);
    }
  }

  surface(x: number, z: number, feetY: number, r: number, step: number) {
    let best = this.cabin.surface(x, z, feetY, r, step);
    // Rubble: low domes (all within a step), walked over like small world rocks.
    for (const { rock } of this.rubble.values()) {
      if (rock.broken) continue;
      const row = rock.row, R = 0.9 * row[3];
      const e = Math.max(0, Math.hypot(x - row[0], z - row[2]) - r);
      if (e >= R) continue;
      const q = e / R;
      const h = row[1] + 1.1 * row[3] * row[5] * Math.sqrt(1 - q * q);
      if (h <= feetY + step && h > best) best = h;
    }
    return best;
  }

  /** Where the explorer (re)starts: the yard, or the lit cabin's doorstep once it's home. */
  spawnPoint(): { x: number; z: number; yaw: number } {
    if (this.cabin.lit) {
      const p = this.anchor('doorstep');
      const out = siteLocal(this.site, -0.2, CAB.D / 2 + 9);
      return { x: p.x, z: p.z, yaw: Math.atan2(out.x - this.site.x, out.z - this.site.z) };
    }
    return this.site.spawn;
  }

  // ------------------------------------------------------------ navigation

  /** Waypoints from a to b: around the cabin outside, through its door in and out. */
  route(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] {
    const s = this.site;
    const la = siteToLocal(s, a.x, a.z), lb = siteToLocal(s, b.x, b.z);
    const inA = this.inLocal(la, 0.05), inB = this.inLocal(lb, 0.05);
    const W = (lx: number, lz: number) => { const p = siteLocal(s, lx, lz); return new THREE.Vector3(p.x, 0, p.z); };
    const dx = (CAB.door.x0 + CAB.door.x1) / 2;
    const inner = W(dx, CAB.D / 2 - 0.75), outer = W(dx, CAB.D / 2 + 1.1);
    if (inA && inB) return [b.clone()];
    if (inA) return [inner, outer, ...this.around(outer, b)];
    if (inB) return [...this.around(a, outer), inner, b.clone()];
    return this.around(a, b);
  }

  private inLocal(l: { x: number; z: number }, m: number) {
    return Math.abs(l.x) < CAB.W / 2 - m && Math.abs(l.z) < CAB.D / 2 - m;
  }

  /** Outside the cabin: straight if clear, else via its (expanded) corners. */
  private around(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] {
    const s = this.site;
    const hx = CAB.W / 2 + 1.6, hz = CAB.D / 2 + 1.1;
    const la = siteToLocal(s, a.x, a.z), lb = siteToLocal(s, b.x, b.z);
    const hits = (p: { x: number; z: number }, q: { x: number; z: number }) => segBox(p.x, p.z, q.x, q.z, CAB.W / 2 + 1.1, CAB.D / 2 + 0.6);
    if (!hits(la, lb)) return [b.clone()];
    const cs = [[hx, hz], [-hx, hz], [-hx, -hz], [hx, -hz]].map(([x, z]) => ({ x, z }));
    let best: { x: number; z: number }[] | null = null, bl = Infinity;
    const len = (pts: { x: number; z: number }[]) => pts.reduce((acc, p, i) => i ? acc + Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) : 0, 0);
    for (let i = 0; i < 4; i++) {
      const p1 = [la, cs[i], lb];
      if (!hits(la, cs[i]) && !hits(cs[i], lb) && len(p1) < bl) { bl = len(p1); best = [cs[i]]; }
      for (const j of [(i + 1) % 4, (i + 3) % 4]) {
        const p2 = [la, cs[i], cs[j], lb];
        if (!hits(la, cs[i]) && !hits(cs[j], lb) && len(p2) < bl) { bl = len(p2); best = [cs[i], cs[j]]; }
      }
    }
    const out = (best ?? []).map((c) => { const p = siteLocal(s, c.x, c.z); return new THREE.Vector3(p.x, 0, p.z); });
    out.push(b.clone());
    return out;
  }

  // ------------------------------------------------------------ steps

  private enterStep(restoring = false) {
    const st = this.step;
    this.stepT = 0;
    this.idleT = 0;
    const sp = this.spirit;
    sp.want = {
      at: this.anchor(st.anchor).clone(),
      face: st.face ? this.anchor(st.face) : null,
      pose: st.pose ?? 'stand',
      icon: st.icon ?? null,
      lead: st.kind !== 'meet',
      settled: st.kind === 'rest',
    };
    if (st.kind === 'build') for (const p of st.parts) this.cabin.showSketch(p);
    if (restoring) {
      sp.teleport(this.anchor(st.anchor));
      sp.warmth = sp.warmthTarget = st.warmth;
    }
    if (st.kind === 'rest' && !restoring) this.d.sfx.chirp(true);
  }

  private advance() {
    const st = this.step;
    if (st.onDone === 'celebrate') this.spirit.celebrate();
    if (st.onDone === 'greet') this.spirit.greet();
    this.stepIndex = Math.min(this.stepIndex + 1, this.phase.steps.length - 1);
    this.enterStep();
    this.dirty = true;
  }

  private goToStep(id: string) {
    const i = this.phase.steps.findIndex((s) => s.id === id);
    if (i < 0) return;
    this.stepIndex = i;
    this.enterStep();
    this.dirty = true;
  }

  private pending(res: Resource) {
    return this.flyers.filter((f) => f.res === res && !f.f.done).length;
  }

  private remainingFor(parts: PartId[]) {
    return parts.reduce((a, p) => a + this.cabin.remaining(p), 0) - this.tokens.filter((t) => parts.includes(t.part)).length;
  }

  /** 0..1 progress through the current step (for the spirit's warming). */
  private progress(): number {
    const st = this.step;
    if (st.kind === 'gather') {
      const need = st.for.reduce((a, p) => a + this.cabin.remaining(p), 0);
      return need > 0 ? Math.min(1, this.inv[st.resource] / need) : 1;
    }
    if (st.kind === 'build') {
      const tot = st.parts.reduce((a, p) => a + this.cabin.parts[p].need, 0);
      const got = st.parts.reduce((a, p) => a + this.cabin.parts[p].filled, 0);
      return got / tot;
    }
    return 0;
  }

  private complete(): boolean {
    const st = this.step;
    const p = this.d.body.pos;
    switch (st.kind) {
      case 'meet': return Math.hypot(p.x - this.anchor(st.near).x, p.z - this.anchor(st.near).z) < st.radius;
      case 'pickup': return st.item === 'axe' ? this.hasAxe : this.hasHammer;
      case 'gather': return this.inv[st.resource] + this.pending(st.resource) >= this.remainingFor(st.for) && this.pending(st.resource) === 0;
      case 'build': return st.parts.every((id) => this.cabin.parts[id].state === 'built');
      case 'light': return this.cabin.lit;
      case 'rest': return false;
    }
  }

  // ------------------------------------------------------------ frame

  /**
   * The action press (E, a click, the on-screen badge; later a pad's X) on
   * whatever the badge shows. Returns true if the story used the press.
   */
  handleAction(input: Input): boolean {
    if (!this.d.active) return false;
    const a = this.action;
    if (!a) return false;
    if (!input.pressed('KeyE') && !input.pressed('Mouse0')) return false;
    if (a.verb === 'repair') this.depositing = true;
    else if (a.target) this.act(a.target, true);
    return true;
  }

  /** What the action would do right now (the badge), from the last frame. */
  private action: { verb: 'take' | 'chop' | 'smash' | 'repair' | 'light'; icon: IconName; target?: Target } | null = null;
  private depositing = false;

  private findAction(walking: boolean): typeof this.action {
    if (!walking) return null;
    const t = this.inReach();
    if (t) {
      if (t.tag === 'tree') return { verb: 'chop', icon: 'axe', target: t };
      if (t.tag === 'rock') return { verb: 'smash', icon: 'hammer', target: t };
      if (t.tag === 'hearth') return { verb: 'light', icon: 'flame', target: t };
      return { verb: 'take', icon: 'hand', target: t };
    }
    const st = this.step;
    if (st.kind === 'build' && !this.depositing && this.inBuildZone() && this.inv[st.resource] > 0 && this.remainingFor(st.parts) > 0) return { verb: 'repair', icon: 'hammer' };
    return null;
  }

  private inBuildZone(): boolean {
    const st = this.step;
    if (st.kind !== 'build') return false;
    const p = this.d.body.pos, z = this.anchor(st.zone);
    return Math.hypot(p.x - z.x, p.z - z.z) < st.zoneRadius || this.nearCabinSide(st.parts);
  }

  private activeTag(): TargetTag | null {
    const st = this.step;
    return st.kind === 'pickup' || st.kind === 'gather' || st.kind === 'light' ? st.targets : null;
  }

  /** A gather step already has everything it needs (don't over-collect). */
  private enough(): boolean {
    const st = this.step;
    return st.kind === 'gather' && this.inv[st.resource] + this.pending(st.resource) >= this.remainingFor(st.for);
  }

  /**
   * The thing the action would work on. The current step's targets, and
   * (tools in hand) any tree or rock: gathering is a way of life now.
   */
  private inReach(): Target | null {
    const tag = this.activeTag();
    const p = this.d.body.pos;
    let best: Target | null = null, bd = Infinity;
    for (const t of [...this.targets, ...this.dynTargets]) {
      const tool = (t.tag === 'tree' && this.hasAxe) || (t.tag === 'rock' && this.hasHammer);
      if ((t.tag !== tag && !tool) || !t.ok()) continue;
      if (Math.abs(p.y - t.pos.y) > 2.5) continue;
      const d = Math.hypot(p.x - t.pos.x, p.z - t.pos.z);
      if (d < t.reach && d < bd) { bd = d; best = t; }
    }
    return best;
  }

  private act(t: Target, pressed: boolean) {
    const d = this.d;
    if (t.tag === 'tree' || t.tag === 'rock') {
      if (this.swingCd > 0 || this.swingT >= 0) return;
      this.swingOn = t.tag === 'tree' ? { tree: this.allTrees().find((tr) => tr.pos === t.pos) } : { rock: this.allRocks().find((r) => r.pos === t.pos) };
      if (!this.swingOn.tree && !this.swingOn.rock) return;
      this.swingT = 0;
      this.swingCd = pressed ? 0.6 : 0.72;
      this.useTool(t.tag === 'tree' ? 'axe' : 'hammer');
      d.rig.chop();
      return;
    }
    if (t.tag === 'axe' || t.tag === 'hammer') {
      const prop = t.tag === 'axe' ? this.axe : this.hammer;
      prop.take();
      if (t.tag === 'axe') this.hasAxe = true; else this.hasHammer = true;
      this.useTool(t.tag);
      d.sfx.pickup();
      this.sparkles.emit(t.pos.clone().setY(t.pos.y + 0.6), 6, 0.07, 1.6, undefined, { life: 0.6, rise: 0.4, up: 1.4 });
    } else if (t.tag === 'hearth') {
      this.cabin.light();
      d.sfx.whoosh();
      this.sparkles.emit(this.cabin.hearthPos, 8, 0.06, 1.2, undefined, { life: 0.8, rise: 1.2, up: 1.6 });
      d.puffs(this.cabin.hearthPos, 6, 0.12, 1.4);
    }
    this.progressMade();
  }

  /** Draw a tool into the right mitten (it's stowed again after TOOL_HOLD s unused). */
  private useTool(k: 'axe' | 'hammer') {
    this.toolHand = k;
    this.toolT = 0;
  }

  private placeTools(dt: number) {
    this.toolT += dt;
    if (this.toolT > TOOL_HOLD && this.swingT < 0 && !this.depositing) this.toolHand = null;
    this.d.rig.setTools({ axe: this.hasAxe, hammer: this.hasHammer }, this.toolHand);
  }

  /**
   * A boulder broke apart: stones for the pack. A big one breaks into
   * rubble instead, small rocks tumbling out to be smashed in turn.
   */
  private rockBroken(r: SmashRock) {
    const d = this.d;
    d.sfx.thud();
    const w = this.worldBreaks.find((x) => x.rock === r) ?? (this.proxyRock?.rock === r ? this.proxyRock : null);
    if (w && w.row[3] > BIG_ROCK) {
      d.puffs(r.pos, 16, 0.45, 3.4 * w.row[3] * 0.6);
      this.chipPuffs.emit(r.pos, 14, 0.09, 4, undefined, { life: 0.7, rise: -9, drag: 1.2, up: 4 });
      const before = new Set(this.rubble.keys());
      this.takeWorld('rock', w.gi, w.gj, w.row);
      let i = 0;
      const from = r.pos.clone().setY(r.pos.y + w.row[3] * 0.4);
      for (const [key, p] of this.rubble) if (!before.has(key)) p.rock.hop(from, i++ * 0.07);
      return;
    }
    d.puffs(r.pos, 10, 0.3, 2.6);
    this.chipPuffs.emit(r.pos, 8, 0.07, 3, undefined, { life: 0.6, rise: -9, drag: 1.2, up: 3 });
    for (let i = 0; i < 2; i++) {
      const f = new Flyer('stone', r.pos.clone().setY(r.pos.y + 0.2), (x, z) => this.floorAt(x, z), i * 0.15, i + (r.index + 3) * 2);
      this.flyers.push({ f, res: 'stones', stone: -1 });
      this.group.add(f.mesh);
    }
    if (w) this.takeWorld('rock', w.gi, w.gj, w.row);
    const piece = [...this.rubble.values()].find((p) => p.rock === r);
    if (piece) d.harvest.smashPiece(piece.gi, piece.gj, piece.k);
    this.dirty = true;
  }

  private progressMade() {
    this.idleT = 0;
    this.dirty = true;
  }

  private treeLanded(t: ChopTree) {
    this.d.sfx.thud();
    this.d.puffs(t.pos, 8, 0.3, 3);
  }

  private treeGone(t: ChopTree, along: THREE.Vector3[]) {
    for (const p of along) this.d.puffs(p.clone().setY(this.floorAt(p.x, p.z)), 4, 0.35, 2.2);
    // Two logs hop out and into the pack.
    for (const [i, p] of [along[1], along[2]].entries()) {
      const f = new Flyer('log', p.clone().setY(this.floorAt(p.x, p.z) + 0.4), (x, z) => this.floorAt(x, z), i * 0.18);
      this.flyers.push({ f, res: 'logs', stone: -1 });
      this.group.add(f.mesh);
    }
    // A world tree: taken (its stump takes over) until it grows back.
    const w = this.worldChops.find((x) => x.tree === t) ?? (this.proxyTree?.tree === t ? this.proxyTree : null);
    if (w) {
      this.takeWorld('tree', w.gi, w.gj, w.row);
      if (this.proxyTree === w) { this.proxyTree = null; this.worldChops.push(w); }
    }
    this.dirty = true;
  }

  update(dt: number, input: Input, mode: string) {
    const d = this.d;
    this.t += dt;
    this.stepT += dt;
    OVERLAY_U.uTime.value = this.t;
    const body = d.body;
    const st = this.step;

    for (const t of this.allTrees()) t.update(dt);
    for (const r of this.allRocks()) r.update(dt);
    // Felled world trees hand over to the instanced stumps once they're gone.
    this.worldChops = this.worldChops.filter((w) => { if (w.tree.state === 'gone') { this.group.remove(w.tree.group); return false; } return true; });
    this.worldBreaks = this.worldBreaks.filter((w) => { if (w.rock.broken && !w.rock.group.visible) { this.group.remove(w.rock.group); return false; } return true; });
    this.regrowth(dt);
    this.cabin.update(dt, d.camera.position, body.pos);
    this.sparkles.update(dt);
    this.chipPuffs.update(dt);
    this.far.update(d.camera, d.env.hour);
    // The lit hearth crackles, louder close up.
    d.sfx.crackle = this.cabin.lit ? THREE.MathUtils.clamp(1 - body.pos.distanceTo(this.cabin.hearthPos) / 14, 0, 1) : 0;
    d.sfx.update(dt);

    // Flying pickups land in the pack.
    for (const fl of this.flyers) {
      if (fl.f.update(dt, body.pos)) {
        this.inv[fl.res]++;
        d.sfx.collect(this.inv[fl.res]);
        this.hud.bump(fl.res);
        this.progressMade();
      }
    }
    this.flyers = this.flyers.filter((f) => { if (f.f.done) { this.group.remove(f.f.mesh); return false; } return true; });

    if (!d.active) {
      this.hud.set(this.inv, false, this.opened());
      return;
    }

    // Interaction: everything is the one action (E, a click, or the badge
    // on a touch screen), shown by an icon of what it will do. Chopping
    // repeats while it's held.
    const walking = mode === 'walk' && body.grounded;
    this.updateProxies(walking);
    this.action = this.findAction(walking);
    const holding = input.held('KeyE') || input.held('Mouse0');
    if ((this.action?.verb === 'chop' || this.action?.verb === 'smash') && holding) this.act(this.action.target!, false);
    const hold = this.action?.verb === 'chop' || this.action?.verb === 'smash';
    this.hud.action(this.action?.icon ?? null, holding, input, hold ? 'hold' : 'tap');
    this.swingCd -= dt;
    if (this.swingT >= 0) {
      this.swingT += dt;
      const { tree, rock } = this.swingOn;
      const tp = (tree ?? rock)!.pos;
      // Square up to the trunk / rock while swinging, stepping in if you
      // started from the edge of reach so the blow lands.
      this.face(tp, dt);
      const reachIn = (tree ? tree.radius + 0.95 : rock!.radius + 0.85);
      const gap = Math.hypot(tp.x - body.pos.x, tp.z - body.pos.z) - reachIn;
      if (gap > 0 && this.swingT < 0.28) {
        const k = Math.min(gap, 3.5 * dt) / (gap + reachIn);
        body.pos.x += (tp.x - body.pos.x) * k;
        body.pos.z += (tp.z - body.pos.z) * k;
      }
      if (this.swingT >= 0.3 && this.swingT - dt < 0.3) {
        if (tree) {
          const felled = tree.hit(body.pos);
          d.sfx.chop();
          if (felled) d.sfx.fall();
          const at = tree.pos.clone().lerp(body.pos, 0.35).setY(tree.pos.y + 0.9);
          d.puffs(at, 3, 0.07, 1.8);
          this.chips(at);
        } else if (rock) {
          rock.hit();
          d.sfx.smash();
          const at = rock.pos.clone().lerp(body.pos, 0.3).setY(rock.pos.y + rock.radius * 0.6);
          d.puffs(at, 3, 0.09, 1.6);
          this.chipPuffs.emit(at, 4, 0.05, 2.4, undefined, { life: 0.45, rise: -9, drag: 1.5, up: 2.2 });
        }
        this.progressMade();
      }
      if (this.swingT > 0.55) this.swingT = -1;
    }

    // Deposits: stand by the sketch with material and it flies into the slots.
    if (st.kind === 'build') {
      const inZone = this.inBuildZone();
      // One press hands over everything that's needed, piece by piece.
      if (!inZone || this.inv[st.resource] === 0) this.depositing = false;
      this.depositT -= dt;
      if (this.depositing) {
        // Face what you're building.
        const part = st.parts.find((p) => this.cabin.remaining(p) > 0);
        if (part) this.face(this.cabin.parts[part].centre, dt);
      }
      if (this.depositing && this.inv[st.resource] > 0 && this.depositT <= 0) {
        const part = st.parts.find((p) => this.cabin.remaining(p) - this.tokens.filter((t) => t.part === p).length > 0);
        if (part) {
          this.depositT = 0.3;
          this.inv[st.resource]--;
          const P = this.cabin.parts[part];
          const slot = P.filled + this.tokens.filter((t) => t.part === part).length;
          const bb = new Billboard(tex(iconCanvas(st.resource === 'logs' ? 'log' : 'stone')), 0.55, 30);
          this.overlayGroup.add(bb.mesh);
          this.tokens.push({ bb, from: body.pos.clone().setY(body.pos.y + 1.3), part, slot, t: 0, res: st.resource });
          // Building: with the hammer it's a knock per piece; before she has
          // one (the cabin repair) it's a flurry in a cloud of dust.
          if (this.hasHammer) { this.useTool('hammer'); d.rig.knock(); this.dust(P.centre); }
          else { d.rig.give(); this.dust(P.centre, 2); }
          this.progressMade();
        }
      }
    }
    for (const tk of this.tokens) {
      tk.t += dt;
      const k = Math.min(1, tk.t / 0.5);
      const to = this.cabin.slotPos(this.cabin.parts[tk.part], tk.slot, new THREE.Vector3());
      const e = k * k * (3 - 2 * k);
      tk.bb.pos.copy(tk.from).lerp(to, e);
      tk.bb.pos.y += Math.sin(k * Math.PI) * 1.4;
      tk.bb.scale = 1 - 0.2 * k;
      if (k >= 1) {
        const P = this.cabin.parts[tk.part];
        const finished = this.cabin.fill(tk.part);
        d.sfx.slot(P.filled, tk.res === 'stones');
        this.dust(this.cabin.slotPos(P, tk.slot, new THREE.Vector3()).lerp(P.centre, 0.5));
        if (finished) {
          setTimeout(() => d.sfx.thunk(), 180);
          this.spirit.celebrate();
        }
        this.overlayGroup.remove(tk.bb.mesh);
        this.dirty = true;
      }
    }
    this.tokens = this.tokens.filter((t) => t.t < 0.5);

    // Step logic.
    if (st.kind === 'build' && !this.complete() && this.inv[st.resource] === 0 && !this.tokens.length && this.remainingFor(st.parts) > 0 && this.pending(st.resource) === 0) {
      this.goToStep(st.gather); // ran out: back to gathering
    } else if (this.complete() && this.stepT > 0.3) {
      this.advance();
    }
    if (st.kind === 'rest') this.restLogic(dt);

    // The spirit warms as things come back to life.
    const next = this.phase.steps[Math.min(this.stepIndex + 1, this.phase.steps.length - 1)];
    this.spirit.warmthTarget = st.warmth + (next.warmth - st.warmth) * this.progress();
    if (this.cabin.lit) this.spirit.warmthTarget = 1;
    this.spirit.player.copy(body.pos);
    this.spirit.update(dt);

    // Glint only what's usable now; brighter while a hint is running.
    this.boostT = Math.max(0, this.boostT - dt);
    const tag = this.enough() ? null : this.activeTag();
    // Trees are big: their rim is kept gentler so a canopy doesn't flare.
    const aimed = this.action?.target;
    for (const t of [...this.targets, ...this.dynTargets]) {
      const on = (t.tag === tag && t.ok()) || t === aimed;
      // Thin tools are nearly all rim; they get a lighter touch too.
      const k = t.tag === 'tree' ? 0.55 : t.tag === 'axe' || t.tag === 'hammer' ? 0.5 : 1;
      easeGlint(t.mat, on ? (this.boostT > 0 ? 1.5 : 1) * k : 0, dt);
    }

    // Hints: ~20 s without anything useful and the spirit comes to fetch you.
    this.idleT += dt;
    if (st.hint === 'tug' && this.idleT > HINT_AFTER && !this.spirit.busy && this.stepT > 4) {
      const h = this.hintTarget();
      if (h) {
        this.spirit.hint(h.at, h.face);
        this.boostT = 8;
      }
      this.idleT = 0;
    }

    this.placeTools(dt);
    this.clock(dt);
    this.hud.set(this.inv, true, this.opened(), this.enoughOf());
    this.saveT -= dt;
    if (this.dirty && this.saveT <= 0) { this.save(); this.dirty = false; this.saveT = 1; }
  }

  /**
   * The harvest clock runs on in-game hours however the clock gets there
   * (naturally, the story's time-lapses, later sleep), and things grow back.
   */
  private regrowth(dt: number) {
    const d = this.d;
    const hr = d.env.hour;
    let dh = this.lastHour < 0 ? 0 : (hr - this.lastHour + 24) % 24;
    if (dh > 12) dh = 0; // set backwards (debug)
    this.lastHour = hr;
    const cam = d.camera;
    this.frustum.setFromProjectionMatrix(this.projView.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const changed = d.harvest.update(dh, dt, this.regrow);
    for (const t of changed) d.colliders.invalidate(t.x, t.z);
    if (changed.length) this.dirty = true;
    // Broken rubble goes once its break has played.
    for (const [key, r] of this.rubble) if (r.rock.broken && !r.rock.group.visible) { this.group.remove(r.rock.group); this.rubble.delete(key); }
    if (d.harvest.version !== this.harvestSeen) this.refreshTaken();
    // Keep the clock (and growth) saved now and then.
    this.saveClockT += dt;
    if (this.saveClockT > 15) { this.saveClockT = 0; this.dirty = true; }
  }

  /** Per resource: has the story asked for it yet? (Its HUD row shows from then on.) */
  private opened(): Record<Resource, boolean> {
    const out = { logs: false, stones: false } as Record<Resource, boolean>;
    this.phase.steps.forEach((s, i) => { if (s.kind === 'gather' && i <= this.stepIndex) out[s.resource] = true; });
    return out;
  }

  /** Per resource: do you carry all that the unbuilt parts still need? (The HUD's tick.) */
  private enoughOf(): Record<Resource, boolean> {
    const out = { logs: false, stones: false } as Record<Resource, boolean>;
    for (const r of Object.keys(out) as Resource[]) {
      const need = this.phase.parts.filter((p) => p.resource === r).reduce((a, p) => a + this.cabin.remaining(p.id), 0) - this.tokens.filter((t) => t.res === r).length;
      out[r] = need > 0 && this.inv[r] >= need;
    }
    return out;
  }

  /** Turn the explorer toward a point (squaring up to work). */
  private face(p: THREE.Vector3, dt: number) {
    const b = this.d.body;
    const want = Math.atan2(p.x - b.pos.x, p.z - b.pos.z);
    let dh = want - b.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    b.heading += dh * (1 - Math.exp(-14 * dt));
  }

  /** A little cloud of building dust. */
  private dust(at: THREE.Vector3, amount = 1) {
    for (let i = 0; i < 3 * amount; i++) {
      const p = at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 2));
      this.d.puffs(p, 3, 0.2 + 0.08 * amount, 1.1);
    }
  }

  /** Pale wood chips flying off the cut. */
  private chips(at: THREE.Vector3) {
    this.chipPuffs.emit(at, 4, 0.05, 2.8, undefined, { life: 0.5, rise: -9, drag: 1.5, up: 2.5 });
  }

  /** Close to the cabin wall that carries one of these parts. */
  private nearCabinSide(parts: PartId[]) {
    const l = siteToLocal(this.site, this.d.body.pos.x, this.d.body.pos.z);
    if (parts.includes('chimney')) return l.x > CAB.W / 2 - 0.2 && l.x < CAB.W / 2 + 4 && Math.abs(l.z) < CAB.D / 2 + 2.5;
    return l.z > CAB.D / 2 - 0.2 && l.z < CAB.D / 2 + 5 && Math.abs(l.x) < CAB.W / 2 + 2;
  }

  private hintTarget(): { at: THREE.Vector3; face: THREE.Vector3 | null } | null {
    const st = this.step;
    const sp = this.spirit.want;
    if (st.kind === 'gather' && st.targets === 'tree') {
      const seat = this.anchor('seat');
      const tree = this.trees.filter((t) => t.standing).sort((a, b) => a.pos.distanceTo(seat) - b.pos.distanceTo(seat))[0];
      if (!tree) return null;
      const at = tree.pos.clone().add(seat.clone().sub(tree.pos).setY(0).setLength(1.3));
      return { at, face: tree.pos.clone().setY(tree.pos.y + 1.5) };
    }
    if (st.kind === 'gather' && st.targets === 'rock') {
      const r = this.rocks.find((x) => !x.broken);
      return r ? { at: this.anchor('hammerSpot'), face: r.pos } : null;
    }
    if (st.kind === 'light' && this.d.env.hour < st.readyAt) return null;
    if (st.kind === 'build' && this.inv[st.resource] === 0) return null;
    return { at: sp.at, face: sp.face };
  }

  private restLogic(dt: number) {
    const st = this.step;
    if (st.kind !== 'rest') return;
    if (this.revealT < 0 && !this.done && this.d.env.hour >= st.revealAt) {
      // Night: the spirit steps out onto the doorstep and shows you the light
      // across the valley. Then it goes back in to its fire.
      this.revealT = 0;
      this.spirit.want = { at: this.anchor(st.from).clone(), face: this.anchor(st.reveal), pose: 'point', icon: 'home', lead: true };
    }
    if (this.revealT >= 0) {
      // It keeps pointing until you've stood beside it a while (or, if you
      // wander off, it gives up after a minute and goes home anyway).
      const near = this.d.body.pos.distanceTo(this.anchor(st.from)) < 14;
      this.revealWait += dt;
      if ((this.spirit.arrived || this.revealT > 0) && (near || this.revealWait > 60)) this.revealT += dt;
      if (this.revealT > 8 && !this.done) {
        this.done = true;
        this.d.sfx.chirp();
        this.spirit.want = { at: this.anchor('hearthSeat').clone(), face: this.anchor('hearth'), pose: 'sit', icon: null, lead: false, settled: true };
        this.dirty = true;
      }
    }
  }

  /**
   * Story time. Each step has an hour it begins at: entering the step, the
   * clock drifts there (a gentle time-lapse: the sun moves on while you
   * work), then runs at the natural pace but never past the next step's
   * start, so dusk only comes when the hearth is ready to be lit. The light
   * step time-lapses to dusk; the ending time-lapses into night.
   */
  private clock(dt: number) {
    const env = this.d.env;
    if (this.done) { env.paused = false; return; }
    env.paused = true;
    const st = this.step;
    const next = this.phase.steps[this.stepIndex + 1];
    const natural = (24 / (env.dayMinutes * 60)) * dt;
    const start = st.easeTo ?? st.hour ?? env.hour;
    const cap = st.easeTo ?? (next ? next.hour ?? (next.easeTo !== undefined ? next.easeTo - 1.2 : start) : start);
    if (env.hour < start - 0.005) {
      const gap = start - env.hour;
      const rate = st.easeTo !== undefined ? gap * 0.16 + 0.035 : Math.min(0.2, gap * 0.12 + 0.02);
      env.hour = Math.min(start, env.hour + Math.max(natural, rate * dt));
    } else if (env.hour < cap) {
      env.hour = Math.min(cap, env.hour + natural);
    } else if (st.kind === 'rest' && this.revealT >= 0) {
      env.hour += natural;
    }
  }

  /** Debug: jump straight to a step with everything before it done. */
  debugJump(id: string) {
    const i = this.phase.steps.findIndex((s) => s.id === id);
    if (i < 0) return false;
    for (let k = 0; k < i; k++) {
      const st = this.phase.steps[k];
      if (st.kind === 'pickup' && st.item === 'axe') { this.axe.take(); this.hasAxe = true; }
      if (st.kind === 'pickup' && st.item === 'hammer') { this.hammer.take(); this.hasHammer = true; }
      if (st.kind === 'build') for (const p of st.parts) this.cabin.setBuilt(p);
      if (st.kind === 'gather' && st.targets === 'tree') for (const t of this.trees.slice(0, 3)) t.setFelled();
      if (st.kind === 'gather' && st.targets === 'rock') for (const r of this.rocks.slice(0, 2)) r.setBroken();
      if (st.kind === 'light') this.cabin.light(true);
    }
    this.stepIndex = i;
    const st = this.step;
    if (st.kind === 'build') this.inv[st.resource] = this.remainingFor(st.parts);
    this.d.env.hour = st.easeTo !== undefined ? st.easeTo - (st.kind === 'light' ? 0.6 : 0) : st.hour ?? this.d.env.hour;
    this.enterStep(true);
    this.spirit.warmth = this.spirit.warmthTarget = st.warmth;
    return true;
  }

  // ------------------------------------------------------------ save

  private key() { return `fjellheim.story.${this.d.saveKey}`; }

  save() {
    if (!this.d.active) return;
    const data: SaveData = {
      v: SAVE_VERSION,
      step: this.step.id,
      inv: { ...this.inv, logs: this.inv.logs + this.pending('logs') + this.tokens.filter((t) => t.res === 'logs').length, stones: this.inv.stones + this.pending('stones') + this.tokens.filter((t) => t.res === 'stones').length },
      axe: this.hasAxe,
      hammer: this.hasHammer,
      felled: this.trees.filter((t) => t.state !== 'standing').map((t) => t.index),
      smashed: this.rocks.filter((r) => r.broken).map((r) => r.index),
      world: this.d.harvest.all(),
      clock: this.d.harvest.clock,
      filled: { roof: this.cabin.parts.roof.filled, door: this.cabin.parts.door.filled, chimney: this.cabin.parts.chimney.filled },
      built: (Object.keys(this.cabin.parts) as PartId[]).filter((p) => this.cabin.parts[p].state === 'built'),
      lit: this.cabin.lit,
      done: this.done,
      hour: this.d.env.hour,
    };
    try { localStorage.setItem(this.key(), JSON.stringify(data)); } catch { /* private mode: progress lasts the session */ }
  }

  private load() {
    let data: SaveData | null = null;
    try {
      const raw = localStorage.getItem(this.key());
      if (raw) data = JSON.parse(raw) as SaveData;
    } catch { data = null; }
    if (!data || data.v !== SAVE_VERSION) {
      this.d.harvest.clear();
      this.refreshTaken();
      if (this.d.active) this.d.env.hour = this.phase.startHour;
      return;
    }
    this.d.harvest.load(data.world ?? [], data.clock ?? 0);
    this.d.colliders.reset(this.d.gen);
    this.refreshTaken();
    const i = this.phase.steps.findIndex((s) => s.id === data!.step);
    this.stepIndex = Math.max(0, i);
    this.inv = { logs: data.inv.logs ?? 0, stones: data.inv.stones ?? 0 };
    this.hasAxe = data.axe;
    this.hasHammer = !!data.hammer;
    if (this.hasAxe) this.axe.take();
    if (this.hasHammer) this.hammer.take();
    for (const k of data.felled) this.trees[k]?.setFelled();
    for (const k of data.smashed ?? []) this.rocks[k]?.setBroken();
    for (const p of data.built) this.cabin.setBuilt(p);
    // Only parts already started come back as sketches; the current step shows its own (enterStep).
    for (const p of Object.keys(data.filled) as PartId[]) if (!data.built.includes(p) && data.filled[p] > 0) { this.cabin.showSketch(p); this.cabin.setFilled(p, data.filled[p]); }
    if (data.lit) this.cabin.light(true);
    this.done = data.done;
    if (this.d.active) this.d.env.hour = data.hour;
    if (this.done) this.spirit.want = { at: this.anchor('hearthSeat').clone(), face: this.anchor('hearth'), pose: 'sit', icon: null, lead: false, settled: true };
  }

  /** Forget this seed's progress (debug / tests). */
  reset() {
    try { localStorage.removeItem(this.key()); } catch { /* ignore */ }
  }

  dispose() {
    this.d.scene.remove(this.group);
    this.d.overlay.remove(this.overlayGroup);
    this.hud.dispose();
  }

  // ------------------------------------------------------------ test hooks

  /** Where the explorer should head next (for scripted playthroughs). */
  goal(): THREE.Vector3 | null {
    const st = this.step;
    const p = this.d.body.pos;
    const nearest = (list: { pos: THREE.Vector3 }[]) => list.sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p))[0]?.pos ?? null;
    switch (st.kind) {
      case 'meet': return this.anchor(st.near);
      case 'pickup': return st.item === 'axe' ? this.axe.pos : this.hammer.pos;
      case 'gather': return st.targets === 'tree' ? nearest(this.trees.filter((t) => t.standing)) : nearest(this.rocks.filter((r) => !r.broken));
      case 'build': return this.anchor(st.zone);
      case 'light': return this.d.env.hour >= st.readyAt ? this.cabin.hearthPos : this.anchor('doorstep');
      case 'rest': return this.revealT >= 0 && !this.done ? this.anchor(st.from) : null;
    }
  }

  state() {
    return {
      step: this.step.id, index: this.stepIndex, inv: { ...this.inv }, axe: this.hasAxe, lit: this.cabin.lit, done: this.done,
      hour: this.d.env.hour, warmth: this.spirit.warmth, spirit: this.spirit.pos.clone(),
      parts: Object.fromEntries(Object.entries(this.cabin.parts).map(([k, v]) => [k, `${v.state}:${v.filled}/${v.need}`])),
      felled: this.trees.filter((t) => !t.standing).length, idle: this.idleT,
    };
  }
}

/** Does segment p-q cross the box |x| < hx, |z| < hz? */
function segBox(px: number, pz: number, qx: number, qz: number, hx: number, hz: number): boolean {
  let t0 = 0, t1 = 1;
  const dx = qx - px, dz = qz - pz;
  for (const [p, d, lo, hi] of [[px, dx, -hx, hx], [pz, dz, -hz, hz]]) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let a = (lo - p) / d, b = (hi - p) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * The next cabin's lit window, far across the valley: a small warm point
 * that keeps a minimum size on screen (a real window at a kilometre would be
 * sub-pixel) and blooms. It only shows at night.
 */
class FarLight {
  readonly mesh: THREE.Mesh;
  /** A soft halo drawn over the frame, hidden wherever terrain is in front. */
  readonly halo = new Billboard(tex(glowCanvas()), 3.5, 30);
  readonly pos = new THREE.Vector3();
  private t = 0;

  constructor(site: StorySite) {
    const f = site.far;
    // World cabins (variant 0) have a front window at local (1.23, 2.0, 2.15).
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    const lx = 1.23, lz = 2.3;
    this.pos.set(f.x + c * lx + s * lz, f.y + 2.0, f.z - s * lx + c * lz);
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), makeSolidMaterial('#ffd27a', 1.0));
    this.mesh.position.copy(this.pos);
    this.mesh.frustumCulled = false;
    this.halo.pos.copy(this.pos);
    this.halo.mat.uniforms.uThrough.value = 0;
    this.halo.alpha = 0;
  }

  update(cam: THREE.PerspectiveCamera, hour: number) {
    this.t += 1 / 60;
    const night = U.uNight.value as number;
    void hour;
    const d = cam.position.distanceTo(this.pos);
    const pxAngle = (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / Math.max(1, window.innerHeight);
    const tw = 0.9 + 0.1 * Math.sin(this.t * 2.3) * Math.sin(this.t * 1.3);
    const r = Math.max(0.45, d * pxAngle * 3.2) * tw;
    const k = THREE.MathUtils.smoothstep(night, 0.35, 0.8);
    this.mesh.visible = k > 0.01;
    this.mesh.scale.setScalar(r * k);
    this.halo.alpha = k * 0.85 * tw;
    this.halo.scale = 0.9 + 0.15 * tw;
  }
}
