import * as THREE from 'three';
import type { Environment } from '../gfx/environment';
import { makeSolidMaterial, U } from '../gfx/materials';
import { Puffs } from '../gfx/puffs';
import type { CharacterRig } from '../player/character';
import type { Input } from '../player/input';
import type { Body } from '../player/movement';
import { GATE_HW } from './stableGeometry';
import { PASTURE_D, PASTURE_W, siteLocal, siteToLocal, type StorySite } from '../world/storySite';
import type { WorldGen } from '../world/worldgen';
import type { Sfx } from './audio';
import { RuinCabin } from './cabin';
import type { Buildable, Part, PartId } from './build';
import { Stable } from './stable';
import { PHASE3 } from './phase3';
import { CAB } from './geometry';
import { Hud } from './hud';
import { glowCanvas, iconCanvas, tex, type IconName } from './icons';
import { Billboard, OVERLAY_U } from './overlay';
import { PHASE1, type Anchor, type PhaseDef, type Resource, type StepDef, type TargetTag } from './phase1';
import { AxeProp, ChopTree, easeGlint, Flyer, LassoProp, PickProp, SmashRock, Stumps, Woods, type WoodTree } from './props';
import type { Colliders, PropHit } from '../world/colliders';
import { BIG_ROCK, Harvest, rubbleOf, type RegrowCtx, type Taken } from '../world/harvest';
import { hash01 } from '../core/rng';
import { segDist } from '../world/worldgen';
import { PAT, Spirit } from './spirit';

// The story director. It runs the phase tables (phase1.ts, phase3.ts) over
// the story set: the broken cabin, the axe, the grove, the brook stones, the
// spirit, and later the stable and its pasture. It
// knows the step *kinds* (meet, pickup, gather, build, light, rest), not the
// content, so later phases can reuse it. It owns the interaction system
// (walk up to things; E / click also works), the inventory, the clock while
// the story runs, the idle hints and the save.

const SAVE_VERSION = 2;
/** The lasso gift shot: the camera settles this long before the spark, and holds on the post this long after (s). */
const GIFT_LEAD = 1.1, GIFT_HOLD = 1.5;
/** How long a tool stays in hand after its last use before it's stowed again (s). */
const TOOL_HOLD = 0.7;
/** Seconds without progress before the spirit repeats its hint, more obviously. */
const HINT_AFTER = 20;
/**
 * How far from a tree's canopy edge / a rock's surface the axe and pick
 * reach (m). Trees are measured from the canopy: its lowest tier droops to
 * head height, so you'd otherwise have to stand under the branches.
 */
const CHOP_REACH = 1.3;
/** Widest canopy a world tree can have (m), for the collider search. */
const MAX_CANOPY = 4.6;
const SMASH_REACH = 2.15;
/** Resources come out as you work: every other blow, ending on the last (3 blows: 1st and 3rd). */
const yields = (hit: number, hp: number) => (hp - hit) % 2 === 0;
/** How close to the idle spirit the pat is offered, and where you stand to do it (m). */
const PAT_NEAR = 1.7;
const PAT_STAND = 0.7;

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
  pick: boolean;
  /** Saves from before the pick replaced the hammer. */
  hammer?: boolean;
  felled: number[];
  /** Story boulders smashed. */
  smashed: number[];
  /** World trees felled and rocks smashed (anywhere), and how far they've come back. */
  world: Taken[];
  /** The harvest clock (in-game hours). */
  clock?: number;
  filled: Partial<Record<PartId, number>>;
  built: PartId[];
  lit: boolean;
  /** Which phase table the step is in (absent: phase 1). */
  phase?: number;
  lasso?: boolean;
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
  /** Boulders to smash behind the cabin ([0] has the pick struck in it). */
  readonly rocks: SmashRock[] = [];
  readonly axe: AxeProp;
  readonly pick: PickProp;
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
  private pack = new THREE.Vector3();
  private projView = new THREE.Matrix4();
  private sphere = new THREE.Sphere();
  private regrow: RegrowCtx;
  private dynTargets: Target[] = [];
  readonly group = new THREE.Group();
  readonly overlayGroup = new THREE.Group();
  readonly hud: Hud;
  /** Phase tables in order (phase 2 is the journey's own director). */
  readonly phases: PhaseDef[] = [PHASE1, PHASE3];
  phaseIndex = 0;
  get phase(): PhaseDef { return this.phases[this.phaseIndex]; }
  /** The stable and its pasture (phase 3), when the site has room for one. */
  readonly stable: Stable | null = null;
  readonly lasso: LassoProp | null = null;
  hasLasso = false;
  /** How many creatures live at the stable (set by the herd, see story/herd.ts). */
  herdCount: () => number = () => 0;
  /** The lasso's gift: the spirit pulls it out of its heart (-1 = not running). */
  private giftT = -1;
  private giftBall = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), makeSolidMaterial('#ffcf73', 0.8));
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
  hasPick = false;
  /** The tool drawn for the last action, and how long ago it was used. */
  private toolHand: 'axe' | 'pick' | 'hammer' | null = null;
  private toolT = 99;
  done = false;
  private idleT = 0;
  private boostT = 0;
  private swingT = -1;
  /** Walking in to a tree / rock picked from out of arm's length (s), -1 when not. */
  private stepIn = -1;
  private stepPressed = false;
  /** The press that took a tool is still down: don't let it hold-swing (the pick lies on a boulder). */
  private heldFromTake = false;
  private swingCd = 0;
  private swingOn: { tree?: ChopTree; rock?: SmashRock } = {};
  /** Where the patting mitten goes (the spirit's head, lifting between pats). */
  private patAt = new THREE.Vector3();
  /** How far above the body's feet the pack is (riding: up on the mount). */
  packLift = 0;
  /** A mount could butt a tree right now (the badge shows antlers). */
  ramReady = false;
  private depositT = 0;
  private stepT = 0;
  /** The resting spirit's pottering: where it is, how long it's been there, how long it stays. */
  private pot = { out: 0, t: 0, go: 0, stay: 40 };
  private anchors = new Map<Anchor, THREE.Vector3>();
  private dirty = false;
  private saveT = 0;
  private t = 0;
  /** Suppress text UI while the opening runs. */
  get silent() { return this.d.active && !this.done; }
  /** Phase 2 (story/journey.ts) has the spirit: the house leaves it alone. */
  lent = false;

  constructor(private d: StoryDeps) {
    const gen = d.gen;
    const site = (this.site = gen.story);
    const ground = (x: number, z: number) => gen.height(x, z);
    this.cabin = new RuinCabin(site, d.puffs);
    this.group.add(this.cabin.root, this.cabin.embers.group, this.cabin.smoke.group, this.cabin.column.batch.mesh, this.sparkles.group, this.chipPuffs.group);
    this.overlayGroup.add(this.cabin.overlay);
    if (site.pasture) {
      const st = (this.stable = new Stable(site, d.puffs));
      this.group.add(st.root);
      this.overlayGroup.add(st.overlay);
      // The lasso hangs coiled on the gatepost once it's been given.
      const post = st.local(-GATE_HW, PASTURE_D / 2 + 0.15, 1.08);
      this.lasso = new LassoProp(post, siteLocal(site.pasture, 0, 1).x - site.pasture.x, siteLocal(site.pasture, 0, 1).z - site.pasture.z);
      this.group.add(this.lasso.group);
    }
    this.giftBall.visible = false;
    this.giftBall.frustumCulled = false;
    this.group.add(this.giftBall);
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
    // Handle out over the cabin side of its boulder, a little away from where the spirit waits.
    const hdir = new THREE.Vector3(site.x - hb.x, 0, site.z - hb.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.45);
    this.pick = new PickProp(this.rocks[0], hdir);
    this.group.add(this.pick.group, this.stumps.mesh);
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
    // Beside the pick's boulder, on the cabin side, looking at it.
    const hbv = new THREE.Vector3(hb.x, 0, hb.z);
    const toCab = new THREE.Vector3(site.x - hb.x, 0, site.z - hb.z).normalize();
    this.anchors.set('pickSpot', hbv.clone().addScaledVector(toCab, 1.8 + hb.sc).add(new THREE.Vector3(toCab.z, 0, -toCab.x).multiplyScalar(0.8)));
    this.anchors.set('pick', this.pick.pos.clone());
    const rc = site.boulders.reduce((a, b) => a.add(new THREE.Vector3(b.x, 0, b.z)), new THREE.Vector3()).divideScalar(site.boulders.length);
    this.anchors.set('rocks', rc.setY(ground(rc.x, rc.z) + 0.6));
    this.anchors.set('chimneySpot', L(CAB.W / 2 + 2.6, 1.6));
    this.anchors.set('chimney', this.cabin.parts.chimney.centre.clone());
    this.anchors.set('far', this.far.pos.clone());
    this.anchors.set('lookout', new THREE.Vector3(site.lookout.x, 0, site.lookout.z));
    const stb = this.stable;
    if (stb) {
      const pa = site.pasture!;
      const P = (lx: number, lz: number, up = 0) => stb.local(lx, lz, up);
      this.anchors.set('plotSpot', P(-pa.end * 3, 2));
      this.anchors.set('stableSite', stb.local(pa.end * (PASTURE_W / 2 - 2.5), 0, 1.5));
      this.anchors.set('stableFront', stb.front.clone());
      this.anchors.set('roofTop', stb.parts.sroof.centre.clone());
      this.anchors.set('gate', stb.gate.clone().setY(stb.gate.y + 0.8));
      this.anchors.set('gateIn', stb.gateIn.clone());
      // Outside the gate, off to the side so it isn't in your way.
      this.anchors.set('gateOut', P(3.2, PASTURE_D / 2 + 2.4));
      this.anchors.set('fenceSide', P(-PASTURE_W / 4, PASTURE_D / 2, 0.8));
      this.anchors.set('lasso', this.lasso!.pos.clone());
      this.anchors.set('woods', this.findWoods(gen));
    }
    for (const [k, v] of this.anchors) if (v.y === 0 && k !== 'far') v.y = ground(v.x, v.z);

    // Interactables.
    this.targets.push({ tag: 'axe', pos: this.axe.pos, reach: 2.3, mat: this.axe.mat, ok: () => !this.axe.taken });
    for (const t of this.trees) this.targets.push({ tag: 'tree', pos: t.pos, reach: CHOP_REACH + t.canopy, mat: t.mat, ok: () => t.standing });
    this.targets.push({ tag: 'pick', pos: this.pick.pos, reach: 2.0 + hb.sc, mat: this.pick.mat, ok: () => !this.pick.taken });
    for (const r of this.rocks) this.targets.push({ tag: 'rock', pos: r.pos, reach: SMASH_REACH + r.radius, mat: r.mat, ok: () => !r.broken && this.hasPick });
    if (this.lasso) { const l = this.lasso; this.targets.push({ tag: 'lasso', pos: l.pos, reach: 2.2, mat: l.mat, ok: () => l.shown && !l.taken }); }
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
      // The cabin's clearing and the pasture stay cleared.
      keep: (x, z) => Math.hypot(x - site.x, z - site.z) < 40 || !!this.stable?.inside(x, z, -6),
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

  /** Whichever building a part belongs to. */
  private owner(id: PartId): Buildable {
    return id in this.cabin.parts ? this.cabin : this.stable!;
  }

  part(id: PartId): Part { return this.owner(id).parts[id]!; }

  /**
   * Open ground at the edge of the woods nearest the pasture, where the
   * spirit looks while you fetch logs for the stable.
   */
  private findWoods(gen: WorldGen): THREE.Vector3 {
    const c = this.stable!.local(0, 0);
    let best = this.anchor('grove').clone(), bd = Infinity;
    for (let r = 30; r <= 110; r += 10) {
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
        const h = gen.height(x, z);
        if (h < 3 || gen.forestDensity(x, z, h) < 0.5) continue;
        if (r < bd) { bd = r; best = new THREE.Vector3(x, h + 2, z); }
      }
      if (bd < Infinity) break;
    }
    return best;
  }

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
    const trail = gen.journey.toHome;
    const journeyD = (x: number, z: number) => {
      let d = Infinity;
      for (let k = 0; k + 1 < trail.length; k++) d = Math.min(d, segDist(x, z, { ax: trail[k][0], az: trail[k][1], bx: trail[k + 1][0], bz: trail[k + 1][1] }));
      return d;
    };
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
      // Clear of the journey's trail to the home tower by the whole canopy.
      if (journeyD(x, z) < 1.2 + 1.6 + 2.4 * (0.75 + r(5) * 0.45)) continue;
      if (Math.hypot(x - site.x, z - site.z) < 24) continue;
      if (gen.storyBlock(x, z, 1.2, 'tree')) continue;
      if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 3.6)) continue;
      out.push({ x, y: h, z, sc: 0.75 + r(5) * 0.45, rot: r(6) * 6.283, lean: r(7) - 0.5, tone: r(8) });
    }
    return out;
  }

  // ------------------------------------------------------------ the lasso gift

  /** Little hearts floating up (a creature coming home). */
  private floaters: { bb: Billboard; from: THREE.Vector3; t: number; dx: number }[] = [];

  hearts(at: THREE.Vector3) {
    for (let i = 0; i < 3; i++) {
      const bb = new Billboard(tex(iconCanvas('heart')), 0.42, 20);
      bb.alpha = 0;
      this.overlayGroup.add(bb.mesh);
      this.floaters.push({ bb, from: at.clone(), t: -i * 0.22, dx: (i - 1) * 0.35 });
    }
  }

  private updateFloaters(dt: number) {
    for (const f of this.floaters) {
      f.t += dt;
      const k = Math.max(0, f.t) / 1.5;
      f.bb.pos.copy(f.from).add(new THREE.Vector3(f.dx + Math.sin(f.t * 5) * 0.08, k * 1.6, 0));
      f.bb.alpha = f.t < 0 ? 0 : Math.min(1, k * 6) * (1 - THREE.MathUtils.smoothstep(k, 0.6, 1));
      f.bb.scale = 0.7 + 0.5 * Math.min(1, k * 4);
      if (k >= 1) this.overlayGroup.remove(f.bb.mesh);
    }
    this.floaters = this.floaters.filter((f) => f.t < 1.5);
  }

  /** Others coming up to the gate (a creature on a lead): it swings open for them too. */
  gateFor: THREE.Vector3[] = [];

  /**
   * The lasso step: once you're outside by the gate with it, the spirit
   * takes the camera and pulls the lasso out of its heart: a spark rises
   * from its chest, swells over its head, arcs to the gatepost and bursts,
   * and the coiled rope bounces in there.
   */
  private updateGift(dt: number) {
    const st = this.step;
    const l = this.lasso;
    this.giftBall.visible = false;
    // The shot holds on the post a moment after the lasso's there.
    if (l && l.shown && this.giftT >= 0) { this.giftT += dt; if (!this.busy) this.giftT = -1; return; }
    if (!l || st.kind !== 'pickup' || st.item !== 'lasso' || l.shown) { this.giftT = -1; return; }
    const b = this.d.body.pos;
    if (this.giftT < 0) {
      const near = b.distanceTo(this.anchor('gateOut')) < 14 && !this.stable!.inside(b.x, b.z) && this.d.body.grounded;
      if (this.spirit.arrived && near && !this.lent) {
        this.giftT = 0;
        this.spirit.celebrate();
        this.d.sfx.chirp(true);
      }
      return;
    }
    this.giftT += dt;
    const t = this.giftT - GIFT_LEAD;
    if (t < 0) return;
    const sp = this.spirit;
    const chest = sp.pos.clone().add(new THREE.Vector3(0, 0.35, 0));
    const over = chest.clone().add(new THREE.Vector3(0, 1.3, 0));
    const land = l.pos.clone().setY(l.pos.y + 0.25);
    const p = new THREE.Vector3();
    let r = 0;
    if (t < 0.5) {
      const e = t / 0.5;
      p.copy(chest).addScaledVector(new THREE.Vector3(Math.sin(sp.heading), 0, Math.cos(sp.heading)), 0.3 * e);
      r = 0.16 * e;
    } else if (t < 1.3) {
      const e = THREE.MathUtils.smootherstep(t, 0.5, 1.3);
      p.lerpVectors(chest, over, e);
      r = 0.16 + 0.2 * e + 0.03 * Math.sin(t * 30);
      if (Math.random() < dt * 30) this.sparkles.emit(p, 1, 0.06, 1.2);
    } else if (t < 1.85) {
      const e = THREE.MathUtils.smootherstep(t, 1.3, 1.85);
      p.lerpVectors(over, land, e);
      p.y += Math.sin(e * Math.PI) * 1.2;
      r = 0.36 * (1 - 0.3 * e);
    } else {
      this.sparkles.emit(land, 22, 0.1, 3, undefined, { life: 0.7, rise: 0.4, up: 1.6 });
      this.d.sfx.chirp(false);
      l.show();
      this.dirty = true;
      return;
    }
    this.giftBall.visible = true;
    this.giftBall.position.copy(p);
    this.giftBall.scale.setScalar(r);
  }

  /** The gift shot is running: hands off, the camera is the spirit's. */
  get busy() { return this.giftT >= 0 && this.giftT < GIFT_LEAD + 1.85 + GIFT_HOLD; }

  /** The gift shot: three-quarters on to the spirit and the gatepost, from outside the pasture. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3 } | null {
    if (!this.busy) return null;
    const sp = this.spirit.pos, g = this.lasso!.pos;
    const mid = sp.clone().lerp(g, 0.5);
    const t = this.giftT - GIFT_LEAD;
    const onPost = THREE.MathUtils.smootherstep(t, 1.4, 2.4);
    const at = mid.clone().setY(mid.y + 0.5 + 0.7 * THREE.MathUtils.smootherstep(t, 0.3, 1.3) * (1 - onPost));
    at.lerp(g, 0.45 * onPost);
    const out = this.anchor('gateOut').clone().sub(this.stable!.gate).setY(0).normalize();
    const side = new THREE.Vector3(out.z, 0, -out.x);
    const pos = at.clone().addScaledVector(out, 10.5 - 2 * onPost).addScaledVector(side, -1.5).setY(at.y + 0.9);
    pos.y = Math.max(pos.y, this.d.gen.height(pos.x, pos.z) + 0.8);
    return { pos, at };
  }

  // ------------------------------------------------------------ world hooks

  /** Solid story props (cabin walls, standing trunks, stumps). */
  collide(pos: THREE.Vector3, vel: THREE.Vector3, r: number, mob = false) {
    this.cabin.push(pos, vel, r);
    this.stable?.push(pos, vel, r, mob);
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
      // A big mount strides over stumps (and through a tree it's knocking down).
      if (t.state !== 'standing' && r > 0.5) continue;
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
   * Any world tree (with the axe) or ordinary boulder (with the pick) you
   * walk up to is swapped for an identical story prop that can glint and
   * take blows; the world's instance hides meanwhile (Harvest proxy flag).
   * Walk away without hitting it and the world's copy comes back. Once it
   * falls or breaks it's taken for good (saved), leaving a stump.
   */
  private updateProxies(walking: boolean) {
    const d = this.d;
    const p = d.body.pos;
    const hitT = this.hasAxe && walking ? d.colliders.nearestTree(p.x, p.z, CHOP_REACH + MAX_CANOPY) : null;
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
    const hitR = this.hasPick && walking ? d.colliders.nearestRock(p.x, p.z, SMASH_REACH, Infinity) : null;
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
    if (this.proxyTree) { const t = this.proxyTree.tree; this.dynTargets.push({ tag: 'tree', pos: t.pos, reach: CHOP_REACH + t.canopy, mat: t.mat, ok: () => t.standing }); }
    if (this.proxyRock) { const r = this.proxyRock.rock; this.dynTargets.push({ tag: 'rock', pos: r.pos, reach: SMASH_REACH + r.radius, mat: r.mat, ok: () => !r.broken }); }
    if (this.hasPick) {
      for (const { rock: r } of this.rubble.values()) {
        if (r.broken || Math.hypot(r.pos.x - p.x, r.pos.z - p.z) > 4) continue;
        this.dynTargets.push({ tag: 'rock', pos: r.pos, reach: SMASH_REACH + r.radius, mat: r.mat, ok: () => !r.broken });
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

  /**
   * The nearest standing tree whose trunk is in a strip `reach` m ahead of
   * `from` along `dir` (unit, flat), `half` m either side: a story tree or a
   * world tree (by its instance row). Null if none.
   */
  treeAhead(from: THREE.Vector3, dir: THREE.Vector3, reach: number, half: number): { tree?: ChopTree; hit?: PropHit; x: number; z: number } | null {
    const inStrip = (x: number, z: number, r: number) => {
      const dx = x - from.x, dz = z - from.z;
      const along = dx * dir.x + dz * dir.z;
      const side = Math.abs(dx * dir.z - dz * dir.x);
      return along > -r && along < reach + r && side < half + r ? along : null;
    };
    let best: { tree?: ChopTree; hit?: PropHit; x: number; z: number } | null = null;
    let bd = Infinity;
    for (const t of this.allTrees()) {
      if (!t.standing || Math.abs(t.pos.y - from.y) > 3) continue;
      const a = inStrip(t.pos.x, t.pos.z, t.radius);
      if (a !== null && a < bd) { bd = a; best = { tree: t, x: t.pos.x, z: t.pos.z }; }
    }
    const mid = reach * 0.5;
    const hit = this.d.colliders.nearestTree(from.x + dir.x * mid, from.z + dir.z * mid, Math.hypot(mid, half) + 0.2);
    if (hit) {
      const a = inStrip(hit.x, hit.z, hit.radius);
      if (a !== null && a < bd && Math.abs(hit.row[1] - from.y) < 3) best = { hit, x: hit.x, z: hit.z };
    }
    return best;
  }

  /**
   * Knock a tree down (a charging or butting mount): it falls away from
   * `from`, stops being solid at once, and throws out its logs, which hop
   * into the pack. Returns where the trunk stood, or null if nothing was there.
   */
  knockTree(from: THREE.Vector3, dir: THREE.Vector3, reach: number, half: number): THREE.Vector3 | null {
    const d = this.d;
    const found = this.treeAhead(from, dir, reach, half);
    if (!found) return null;
    let tree = found.tree;
    if (!tree && found.hit) {
      // A world tree: stand a story tree in for it, falling (or use the one
      // already standing in for it).
      const r = found.hit.row;
      const [gi, gj] = Harvest.cellOf('tree', r[0], r[2]);
      tree = [...this.worldChops, ...(this.proxyTree ? [this.proxyTree] : [])].find((w) => w.gi === gi && w.gj === gj)?.tree;
    }
    if (!tree && found.hit) {
      const r = found.hit.row;
      const [gi, gj] = Harvest.cellOf('tree', r[0], r[2]);
      tree = new ChopTree({ x: r[0], z: r[2], sc: r[3], rot: r[4], lean: r[6], tone: r[7], sy: r[5] }, r[1] + 0.4, -1);
      tree.onLanded = (tr) => this.treeLanded(tr);
      tree.onGone = (tr, along) => this.treeGone(tr, along);
      this.group.add(tree.group);
      d.harvest.proxy('tree', gi, gj, true);
      this.worldChops.push({ tree, gi, gj, row: r });
    }
    if (!tree) return null;
    // Stop being solid now, not when it's down.
    for (const w of this.worldChops) {
      if (w.tree !== tree && this.proxyTree?.tree !== tree) continue;
      d.harvest.knock('tree', w.gi, w.gj, true);
      d.colliders.invalidate(w.row[0], w.row[2]);
    }
    if (this.proxyTree?.tree === tree) {
      d.harvest.knock('tree', this.proxyTree.gi, this.proxyTree.gj, true);
      d.colliders.invalidate(this.proxyTree.row[0], this.proxyTree.row[2]);
    }
    const before = tree.hits;
    tree.hit(from, 3);
    d.sfx.chop();
    d.sfx.fall();
    const at = tree.pos.clone().lerp(from, 0.3).setY(tree.pos.y + 1.2);
    d.puffs(at, 6, 0.14, 2.6);
    this.chipPuffs.emit(at, 8, 0.07, 3.4, undefined, { life: 0.6, rise: -9, drag: 1.3, up: 3.2 });
    // The logs a full chop would have given (less any already chopped out).
    for (let k = before < 1 ? 0 : 1; k < 2; k++) this.spill('log', at, k + 1);
    this.progressMade();
    return tree.pos;
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
  spawnPoint(): { x: number; z: number; yaw: number; heading: number } {
    if (this.cabin.lit) {
      // On the doorstep, turned out to face the camera, the cabin behind you.
      const p = this.anchor('doorstep');
      const out = siteLocal(this.site, -0.2, CAB.D / 2 + 9);
      const yaw = Math.atan2(out.x - this.site.x, out.z - this.site.z);
      return { x: p.x, z: p.z, yaw, heading: yaw };
    }
    // The start: your back to the camera, looking up the path.
    const sp = this.site.spawn;
    return { x: sp.x, z: sp.z, yaw: sp.yaw, heading: sp.yaw + Math.PI };
  }

  // ------------------------------------------------------------ navigation

  /** Waypoints from a to b: around the cabin outside, through its door in and out. */
  route(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] {
    // In or out of the pasture (once it's fenced): through the gate.
    const stb = this.stable;
    if (stb && stb.parts.fence.state === 'built') {
      const ia = stb.inside(a.x, a.z, -0.5), ib = stb.inside(b.x, b.z, -0.5);
      if (ia && !ib) return [stb.gateIn.clone(), stb.gateOut.clone(), ...this.routeCabin(stb.gateOut, b)];
      if (!ia && ib) return [...this.routeCabin(a, stb.gateOut), stb.gateIn.clone(), b.clone()];
    }
    return this.routeCabin(a, b);
  }

  private routeCabin(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] {
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
      lead: st.lead ?? st.kind !== 'meet',
      settled: st.kind === 'rest',
    };
    if (st.kind === 'build') for (const p of st.parts) this.owner(p).showSketch(p);
    if (this.phase.id === 'stable') this.stable?.showStakes();
    if (restoring) {
      sp.teleport(this.anchor(st.anchor));
      sp.warmth = sp.warmthTarget = st.warmth;
    }
    if (st.kind === 'rest') this.pot = { out: 0, t: 0, go: 0, stay: restoring ? 20 : 45 };
    if (st.kind === 'rest' && !restoring) this.d.sfx.chirp(true);
  }

  private advance() {
    const st = this.step;
    if (st.onDone === 'celebrate') this.spirit.celebrate();
    if (st.onDone === 'greet') this.spirit.greet(this.anchor('doorstep'));
    this.stepIndex = Math.min(this.stepIndex + 1, this.phase.steps.length - 1);
    this.enterStep();
    this.dirty = true;
  }

  /** Phase 3 can begin: the house is lit and the first two towers are too (the journey says when). */
  get stableReady() { return !!this.stable && this.phaseIndex === 0 && this.done; }

  /** Start phase 3: a hello, then it walks you out to the pasture. */
  startStable() {
    if (!this.stableReady) return;
    this.phaseIndex = 1;
    this.stepIndex = 0;
    this.spirit.greet();
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
    return parts.reduce((a, p) => a + this.owner(p).remaining(p), 0) - this.tokens.filter((t) => parts.includes(t.part)).length;
  }

  /** 0..1 progress through the current step (for the spirit's warming). */
  private progress(): number {
    const st = this.step;
    if (st.kind === 'gather') {
      const need = st.for.reduce((a, p) => a + this.owner(p).remaining(p), 0);
      return need > 0 ? Math.min(1, this.inv[st.resource] / need) : 1;
    }
    if (st.kind === 'build') {
      const tot = st.parts.reduce((a, p) => a + this.part(p).need, 0);
      const got = st.parts.reduce((a, p) => a + this.part(p).filled, 0);
      return got / tot;
    }
    return 0;
  }

  private complete(): boolean {
    const st = this.step;
    const p = this.d.body.pos;
    switch (st.kind) {
      case 'meet': return Math.hypot(p.x - this.anchor(st.near).x, p.z - this.anchor(st.near).z) < st.radius;
      case 'pickup': return st.item === 'axe' ? this.hasAxe : st.item === 'pick' ? this.hasPick : this.hasLasso;
      case 'gather': return this.inv[st.resource] + this.pending(st.resource) >= this.remainingFor(st.for) && this.pending(st.resource) === 0;
      case 'build': return st.parts.every((id) => this.part(id).state === 'built');
      case 'herd': return this.herdCount() >= st.count;
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
    if (a.verb === 'other') return false;
    if (a.verb === 'repair') this.depositing = true;
    else if (a.verb === 'pat') this.spirit.pat();
    else if (a.target) this.act(a.target, true);
    return true;
  }

  /** What the action would do right now (the badge), from the last frame. */
  private action: { verb: 'take' | 'chop' | 'smash' | 'repair' | 'light' | 'pat' | 'other'; icon: IconName; target?: Target } | null = null;
  /** An action offered by something outside the story (a beacon tower to light): shown on the badge, handled by its owner. */
  external: IconName | null = null;
  /** Something else has the scene (a tower, a journey cutscene): the spirit can't be patted. */
  noPat = false;
  private depositing = false;

  private findAction(walking: boolean): typeof this.action {
    if (!walking) return this.external ? { verb: 'other', icon: this.external } : null;
    const t = this.inReach();
    if (t) {
      if (t.tag === 'tree') return { verb: 'chop', icon: 'axe', target: t };
      if (t.tag === 'rock') return { verb: 'smash', icon: 'pick', target: t };
      if (t.tag === 'hearth') return { verb: 'light', icon: 'flame', target: t };
      return { verb: 'take', icon: 'hand', target: t };
    }
    const st = this.step;
    if (st.kind === 'build' && !this.depositing && this.inBuildZone() && this.inv[st.resource] > 0 && this.remainingFor(st.parts) > 0) return { verb: 'repair', icon: 'hammer' };
    if (this.canPat()) return { verb: 'pat', icon: 'pat' };
    return this.external ? { verb: 'other', icon: this.external } : null;
  }

  /** Right by the spirit while it's idling (and not already being patted). */
  private canPat(): boolean {
    const sp = this.spirit, p = this.d.body.pos;
    if (this.noPat || !sp.idle || !sp.group.visible || this.swingT >= 0 || this.stepIn >= 0) return false;
    return Math.hypot(p.x - sp.pos.x, p.z - sp.pos.z) < PAT_NEAR && Math.abs(p.y - sp.pos.y) < 1;
  }

  /**
   * A pat in progress (the spirit's `patTime` is the clock): step to arm's
   * length and square up, then the mitten comes down on each beat, lingers
   * for a stroke and lifts away. Walking off lets go.
   */
  private patting(dt: number, input: Input, walking: boolean) {
    const sp = this.spirit, body = this.d.body, rig = this.d.rig;
    const t = sp.patTime;
    if (t < 0 || t >= PAT.end) { rig.patAt = null; return; }
    const i = input.state();
    if (!walking || Math.hypot(i.x, i.y) > 0.2 || i.jumpPressed) { sp.endPat(); rig.patAt = null; return; }
    const dx = sp.pos.x - body.pos.x, dz = sp.pos.z - body.pos.z, dl = Math.hypot(dx, dz) || 1;
    const gap = dl - PAT_STAND;
    const step = Math.sign(gap) * Math.min(Math.abs(gap), 2.2 * dt);
    body.pos.x += (dx / dl) * step;
    body.pos.z += (dz / dl) * step;
    body.vel.x = body.vel.z = 0;
    // Turned a touch right, so the spirit sits in front of the left mitten.
    this.face(this.patAt.set(sp.pos.x + dz / dl * 0.3, 0, sp.pos.z - dx / dl * 0.3), dt);
    const b = PAT.beats, beat = b[1] - b[0], last = b[b.length - 1];
    let lift = 0.13, stroke = 0;
    if (t >= b[0] - 0.22 && t < b[0]) lift = 0.13 * (b[0] - t) / 0.22;
    else if (t >= b[0] && t < last) lift = 0.12 * Math.sin(Math.PI * (((t - b[0]) / beat) % 1));
    else if (t >= last) { lift = 0; stroke = (t - last) / (PAT.end - last); }
    sp.headTop(this.patAt);
    // (The mitten's centre, so a little below it presses into the crown.)
    this.patAt.y += lift + 0.01;
    // The last pat stays for a slow stroke back over the crown.
    this.patAt.x -= (dx / dl) * 0.1 * stroke;
    this.patAt.z -= (dz / dl) * 0.1 * stroke;
    rig.patAt = this.patAt;
  }

  /** While patting: a camera yaw that shows it (three-quarters from the patting side). */
  get patCamYaw(): number | null {
    const t = this.spirit.patTime;
    return t >= 0 && t < PAT.end ? this.d.body.heading + 1.8 : null;
  }

  private inBuildZone(): boolean {
    const st = this.step;
    if (st.kind !== 'build') return false;
    const p = this.d.body.pos, z = this.anchor(st.zone);
    return Math.hypot(p.x - z.x, p.z - z.z) < st.zoneRadius || st.parts.some((id) => this.owner(id).near([id], p));
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
      const tool = (t.tag === 'tree' && this.hasAxe) || (t.tag === 'rock' && this.hasPick);
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
      if (this.swingCd > 0 || this.swingT >= 0 || this.stepIn >= 0) return;
      this.swingOn = t.tag === 'tree' ? { tree: this.allTrees().find((tr) => tr.pos === t.pos) } : { rock: this.allRocks().find((r) => r.pos === t.pos) };
      if (!this.swingOn.tree && !this.swingOn.rock) return;
      this.stepPressed = pressed;
      // From out at the canopy edge, walk in first so the blow lands.
      if (this.swingGap() > 0.35) this.stepIn = 0; else this.startSwing();
      return;
    }
    if (t.tag === 'lasso') {
      this.lasso!.take();
      this.hasLasso = true;
      d.sfx.pickup();
      this.sparkles.emit(t.pos.clone().setY(t.pos.y + 0.3), 8, 0.07, 1.6, undefined, { life: 0.6, rise: 0.4, up: 1.4 });
    } else if (t.tag === 'axe' || t.tag === 'pick') {
      const prop = t.tag === 'axe' ? this.axe : this.pick;
      prop.take();
      if (t.tag === 'axe') this.hasAxe = true; else this.hasPick = true;
      this.heldFromTake = true;
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
  /** Draw a tool into the explorer's mitten for a moment (a swing at something outside the story). */
  showTool(k: 'axe' | 'pick' | 'hammer') { this.useTool(k); }

  private useTool(k: 'axe' | 'pick' | 'hammer') {
    this.toolHand = k;
    this.toolT = 0;
  }

  private placeTools(dt: number) {
    this.toolT += dt;
    if (this.toolT > TOOL_HOLD && this.swingT < 0 && !this.depositing) this.toolHand = null;
    this.d.rig.setTools({ axe: this.hasAxe, pick: this.hasPick }, this.toolHand);
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
    // (Its stones already came out with the blows, see `spill`.)
    d.puffs(r.pos, 10, 0.3, 2.6);
    this.chipPuffs.emit(r.pos, 8, 0.07, 3, undefined, { life: 0.6, rise: -9, drag: 1.2, up: 3 });
    if (w) this.takeWorld('rock', w.gi, w.gj, w.row);
    const piece = [...this.rubble.values()].find((p) => p.rock === r);
    if (piece) d.harvest.smashPiece(piece.gi, piece.gj, piece.k);
    this.dirty = true;
  }

  /** A log or stone knocked loose by a blow: it hops out and into the pack. */
  private spill(kind: 'log' | 'stone', at: THREE.Vector3, variant: number) {
    const f = new Flyer(kind, at.clone(), (x, z) => this.floorAt(x, z), 0, variant);
    this.flyers.push({ f, res: kind === 'log' ? 'logs' : 'stones', stone: -1 });
    this.group.add(f.mesh);
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
    // (Its logs already came out with the blows, see `spill`.)
    for (const p of along) this.d.puffs(p.clone().setY(this.floorAt(p.x, p.z)), 4, 0.35, 2.2);
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
    this.stable?.update(dt, d.camera.position, [body.pos, ...this.gateFor]);
    this.lasso?.update(dt);
    this.updateGift(dt);
    this.updateFloaters(dt);
    this.sparkles.update(dt);
    this.chipPuffs.update(dt);
    this.far.update(d.camera, d.env.hour);
    // The lit hearth crackles, louder close up.
    d.sfx.crackle = this.cabin.lit ? THREE.MathUtils.clamp(1 - body.pos.distanceTo(this.cabin.hearthPos) / 14, 0, 1) : 0;
    d.sfx.update(dt);

    // Flying pickups land in the pack.
    for (const fl of this.flyers) {
      if (fl.f.update(dt, this.pack.copy(body.pos).setY(body.pos.y + this.packLift))) {
        this.inv[fl.res]++;
        d.sfx.collect(this.inv[fl.res]);
        this.hud.bump(fl.res);
        this.progressMade();
      }
    }
    this.flyers = this.flyers.filter((f) => { if (f.f.done) { this.group.remove(f.f.mesh); return false; } return true; });

    if (!d.active) {
      // The sandbox has no story, but wood knocked down still counts.
      this.hud.set(this.inv, this.inv.logs + this.inv.stones > 0, this.opened());
      this.hud.action(this.ramReady ? 'antlers' : this.external, input.held('Mouse0') || input.held('KeyE'), input, 'tap');
      return;
    }

    // Interaction: everything is the one action (E, a click, or the badge
    // on a touch screen), shown by an icon of what it will do. Chopping
    // repeats while it's held.
    const walking = mode === 'walk' && body.grounded;
    this.updateProxies(walking);
    this.action = this.findAction(walking);
    const holding = input.held('KeyE') || input.held('Mouse0');
    if (!holding) this.heldFromTake = false;
    if ((this.action?.verb === 'chop' || this.action?.verb === 'smash') && holding && !this.heldFromTake) this.act(this.action.target!, false);
    const hold = this.action?.verb === 'chop' || this.action?.verb === 'smash';
    this.hud.action(this.action?.icon ?? (this.ramReady ? 'antlers' : null), holding, input, hold ? 'hold' : 'tap');
    this.swingCd -= dt;
    if (this.stepIn >= 0) {
      // Walk (through the movement mode, so it animates and collides) until
      // the trunk / rock is in arm's length, then swing.
      this.stepIn += dt;
      const { tree, rock } = this.swingOn;
      const tp = (tree ?? rock)!.pos;
      const gone = tree ? !tree.standing : rock!.broken;
      const gap = this.swingGap();
      if (gone || !walking) this.stepIn = -1;
      else if (gap <= 0.1 || this.stepIn > 1.2) this.startSwing();
      else {
        this.face(tp, dt);
        const dx = tp.x - body.pos.x, dz = tp.z - body.pos.z, dl = Math.hypot(dx, dz) || 1;
        const s = Math.min(4.5, gap * 8);
        body.vel.x = (dx / dl) * s;
        body.vel.z = (dz / dl) * s;
      }
    }
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
          const before = tree.hits;
          const felled = tree.hit(body.pos);
          d.sfx.chop();
          if (felled) d.sfx.fall();
          const at = tree.pos.clone().lerp(body.pos, 0.35).setY(tree.pos.y + 0.9);
          d.puffs(at, 3, 0.07, 1.8);
          this.chips(at);
          if (tree.hits > before && yields(tree.hits, 3)) this.spill('log', at, tree.hits);
        } else if (rock) {
          const before = rock.hits;
          rock.hit();
          d.sfx.smash();
          const at = rock.pos.clone().lerp(body.pos, 0.3).setY(rock.pos.y + rock.radius * 0.6);
          d.puffs(at, 3, 0.09, 1.6);
          this.chipPuffs.emit(at, 4, 0.05, 2.4, undefined, { life: 0.45, rise: -9, drag: 1.5, up: 2.2 });
          if (rock.hits > before && yields(rock.hits, rock.hp)) this.spill('stone', at, rock.hits + (rock.index + 3) * 2);
        }
        this.progressMade();
      }
      if (this.swingT > 0.55) this.swingT = -1;
    }

    // Deposits: stand by the sketch with material and it flies into the slots.
    if (st.kind !== 'build') this.depositing = false;
    if (st.kind === 'build') {
      const inZone = this.inBuildZone();
      // One press hands over everything that's needed, piece by piece.
      if (!inZone || this.inv[st.resource] === 0) this.depositing = false;
      this.depositT -= dt;
      if (this.depositing) {
        // Face what you're building.
        const part = st.parts.find((p) => this.owner(p).remaining(p) > 0);
        if (part) this.face(part === 'fence' ? this.stable!.gate : this.part(part).centre, dt);
      }
      if (this.depositing && this.inv[st.resource] > 0 && this.depositT <= 0) {
        const part = st.parts.find((p) => this.owner(p).remaining(p) - this.tokens.filter((t) => t.part === p).length > 0);
        if (part) {
          this.depositT = 0.3;
          this.inv[st.resource]--;
          const P = this.part(part);
          const slot = P.filled + this.tokens.filter((t) => t.part === part).length;
          const bb = new Billboard(tex(iconCanvas(st.resource === 'logs' ? 'log' : 'stone')), 0.55, 30);
          this.overlayGroup.add(bb.mesh);
          this.tokens.push({ bb, from: body.pos.clone().setY(body.pos.y + 1.3), part, slot, t: 0, res: st.resource });
          // Building: the hammer comes out for a knock per piece (it isn't
          // carried, just drawn for the work and put away after).
          this.useTool('hammer'); d.rig.knock(); this.dust(P.centre);
          this.progressMade();
        }
      }
    }
    for (const tk of this.tokens) {
      tk.t += dt;
      const k = Math.min(1, tk.t / 0.5);
      const to = this.owner(tk.part).slotPos(this.part(tk.part), tk.slot, new THREE.Vector3());
      const e = k * k * (3 - 2 * k);
      tk.bb.pos.copy(tk.from).lerp(to, e);
      tk.bb.pos.y += Math.sin(k * Math.PI) * 1.4;
      tk.bb.scale = 1 - 0.2 * k;
      if (k >= 1) {
        const P = this.part(tk.part);
        const O = this.owner(tk.part);
        const finished = O.fill(tk.part);
        d.sfx.slot(P.filled, tk.res === 'stones');
        this.dust(O.slotPos(P, tk.slot, new THREE.Vector3()).lerp(P.centre, 0.5));
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
    if (st.kind === 'rest' && !this.lent) this.restLogic(dt);

    // The spirit warms as things come back to life.
    const next = this.phase.steps[Math.min(this.stepIndex + 1, this.phase.steps.length - 1)];
    this.spirit.warmthTarget = st.warmth + (next.warmth - st.warmth) * this.progress();
    if (this.cabin.lit) this.spirit.warmthTarget = 1;
    this.spirit.player.copy(body.pos);
    this.spirit.update(dt);
    this.patting(dt, input, walking);

    // Glint only what's usable now; brighter while a hint is running.
    this.boostT = Math.max(0, this.boostT - dt);
    const tag = this.enough() ? null : this.activeTag();
    // Trees are big: their rim is kept gentler so a canopy doesn't flare.
    const aimed = this.action?.target;
    for (const t of [...this.targets, ...this.dynTargets]) {
      const on = (t.tag === tag && t.ok()) || t === aimed;
      // Thin tools are nearly all rim; they get a lighter touch too.
      const k = t.tag === 'tree' ? 0.55 : t.tag === 'axe' || t.tag === 'pick' ? 0.5 : 1;
      easeGlint(t.mat, on ? (this.boostT > 0 ? 1.5 : 1) * k : 0, dt);
    }

    // Hints: ~20 s without anything useful and the spirit comes to fetch you.
    this.idleT += dt;
    if (st.hint === 'tug' && !this.lent && this.idleT > HINT_AFTER && !this.spirit.busy && this.stepT > 4) {
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
    this.phases.forEach((ph, k) => ph.steps.forEach((s, i) => {
      if (s.kind === 'gather' && (k < this.phaseIndex || (k === this.phaseIndex && i <= this.stepIndex))) out[s.resource] = true;
    }));
    return out;
  }

  /** Per resource: do you carry all that the unbuilt parts still need? (The HUD's tick.) */
  private enoughOf(): Record<Resource, boolean> {
    const out = { logs: false, stones: false } as Record<Resource, boolean>;
    for (const r of Object.keys(out) as Resource[]) {
      const need = this.phase.parts.filter((p) => p.resource === r).reduce((a, p) => a + this.owner(p.id).remaining(p.id), 0) - this.tokens.filter((t) => t.res === r).length;
      out[r] = need > 0 && this.inv[r] >= need;
    }
    return out;
  }

  /** How far the explorer is outside striking distance of the tree / rock being worked (m). */
  private swingGap(): number {
    const { tree, rock } = this.swingOn;
    const tp = (tree ?? rock)!.pos;
    const reachIn = tree ? tree.radius + 0.95 : rock!.radius + 0.85;
    return Math.hypot(tp.x - this.d.body.pos.x, tp.z - this.d.body.pos.z) - reachIn;
  }

  private startSwing() {
    this.stepIn = -1;
    this.swingT = 0;
    this.swingCd = this.stepPressed ? 0.6 : 0.72;
    this.useTool(this.swingOn.tree ? 'axe' : 'pick');
    this.d.rig.chop();
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

  private hintTarget(): { at: THREE.Vector3; face: THREE.Vector3 | null } | null {
    const st = this.step;
    const sp = this.spirit.want;
    // Later phases: the nearest world tree or rock to where the spirit waits.
    const world = (kind: 'tree' | 'rock') => {
      const a = this.anchor(st.anchor), c = this.d.colliders;
      for (const r of [20, 40, 70]) {
        const h = kind === 'tree' ? c.nearestTree(a.x, a.z, r) : c.nearestRock(a.x, a.z, r, Infinity);
        if (!h) continue;
        const y = this.d.gen.height(h.x, h.z);
        const pos = new THREE.Vector3(h.x, y, h.z);
        return { at: pos.clone().add(a.clone().sub(pos).setY(0).setLength(h.radius + 1.3)), face: pos.setY(y + (kind === 'tree' ? 1.5 : 0.5)) };
      }
      return null;
    };
    if (st.kind === 'gather' && st.targets === 'tree') {
      const seat = this.anchor('seat');
      const tree = this.phaseIndex === 0 ? this.trees.filter((t) => t.standing).sort((a, b) => a.pos.distanceTo(seat) - b.pos.distanceTo(seat))[0] : null;
      if (!tree) return world('tree');
      const at = tree.pos.clone().add(seat.clone().sub(tree.pos).setY(0).setLength(1.3));
      return { at, face: tree.pos.clone().setY(tree.pos.y + 1.5) };
    }
    if (st.kind === 'gather' && st.targets === 'rock') {
      const r = this.phaseIndex === 0 ? this.rocks.find((x) => !x.broken) : null;
      return r ? { at: this.anchor('pickSpot'), face: r.pos } : world('rock');
    }
    if (st.kind === 'light' && this.d.env.hour < st.readyAt) return null;
    if (st.kind === 'build' && this.inv[st.resource] === 0) return null;
    return { at: sp.at, face: sp.face };
  }

  private restLogic(dt: number) {
    const st = this.step;
    if (st.kind !== 'rest') return;
    // Night has come in: the story lets go of the clock.
    if (!this.done && this.d.env.hour >= st.doneAt) { this.done = true; this.dirty = true; }
    this.potter(dt);
  }

  /**
   * Nothing left to ask for, so the spirit just lives here: a long sit by the
   * fire, then a slow turn round the yard (a spot or three, looking about),
   * then back to the fire. It never leads or points; the next phase's first
   * step takes over from this.
   */
  private potter(dt: number) {
    const sp = this.spirit;
    const p = this.pot;
    if (sp.busy) return;
    if (sp.arrived || p.go > 20) p.t += dt;
    else p.go += dt;
    if (p.t < p.stay) return;
    p.t = p.go = 0;
    if (p.out === 0) p.out = 1 + Math.floor(Math.random() * 3);
    else p.out--;
    if (p.out === 0) {
      p.stay = 45 + Math.random() * 45;
      sp.want = { at: this.anchor('hearthSeat').clone(), face: this.anchor('hearth'), pose: 'sit', icon: null, lead: false, settled: true };
      return;
    }
    p.stay = 7 + Math.random() * 9;
    const spots: Anchor[] = ['doorstep', 'yard', 'stumpSpot', 'chimneySpot', 'seat'];
    if (this.phaseIndex > 0) spots.push('gateOut', 'stableFront');
    const looks: Anchor[] = ['grove', 'cabin', 'chimney', 'far', 'rocks'];
    const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const at = this.anchor(pick(spots)).clone();
    at.x += (Math.random() - 0.5) * 2.4;
    at.z += (Math.random() - 0.5) * 2.4;
    at.y = this.d.gen.height(at.x, at.z);
    sp.want = { at, face: this.anchor(pick(looks)), pose: 'stand', icon: null, lead: false, settled: true };
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
      let rate = st.easeTo !== undefined ? gap * 0.16 + 0.035 : Math.min(0.2, gap * 0.12 + 0.02);
      // The hearth can't be lit before dusk, so dusk mustn't keep you
      // waiting: it's there within a few seconds of the step, and at once if
      // you're already at the hearth.
      if (st.kind === 'light' && env.hour < st.readyAt) {
        const p = this.d.body.pos, h = this.cabin.hearthPos;
        const left = Math.hypot(p.x - h.x, p.z - h.z) < 2.5 ? 0.5 : Math.max(0.5, 4.5 - this.stepT);
        rate = Math.max(rate, (st.readyAt - env.hour) / left + 0.3);
      }
      env.hour = Math.min(start, env.hour + Math.max(natural, rate * dt));
    } else if (env.hour < cap) {
      env.hour = Math.min(cap, env.hour + natural);
    }
  }

  /** Debug: jump straight to a step (in any phase) with everything before it done. */
  debugJump(id: string) {
    const pi = this.phases.findIndex((ph) => ph.steps.some((st) => st.id === id));
    if (pi < 0 || (pi > 0 && !this.stable)) return false;
    for (let k = 0; k <= pi; k++) {
      const steps = this.phases[k].steps;
      const upTo = k < pi ? steps.length : steps.findIndex((st) => st.id === id);
      for (let j = 0; j < upTo; j++) {
        const st = steps[j];
        if (st.kind === 'pickup' && st.item === 'axe') { this.axe.take(); this.hasAxe = true; }
        if (st.kind === 'pickup' && st.item === 'pick') { this.pick.take(); this.hasPick = true; }
        if (st.kind === 'pickup' && st.item === 'lasso') { this.lasso!.show(true); this.lasso!.take(); this.hasLasso = true; }
        if (st.kind === 'build') for (const p of st.parts) this.owner(p).setBuilt(p);
        if (st.kind === 'gather' && st.targets === 'tree' && k === 0) for (const t of this.trees.slice(0, 3)) t.setFelled();
        if (st.kind === 'gather' && st.targets === 'rock' && k === 0) for (const r of this.rocks.slice(0, 2)) r.setBroken();
        if (st.kind === 'light') this.cabin.light(true);
      }
    }
    if (pi > 0) this.done = true;
    this.phaseIndex = pi;
    this.stepIndex = this.phase.steps.findIndex((st) => st.id === id);
    const st = this.step;
    if (st.kind === 'build') this.inv[st.resource] = this.remainingFor(st.parts);
    if (pi === 0) this.d.env.hour = st.easeTo !== undefined ? st.easeTo - (st.kind === 'light' ? 0.6 : 0) : st.hour ?? this.d.env.hour;
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
      pick: this.hasPick,
      felled: this.trees.filter((t) => t.state !== 'standing').map((t) => t.index),
      smashed: this.rocks.filter((r) => r.broken).map((r) => r.index),
      world: this.d.harvest.all(),
      clock: this.d.harvest.clock,
      filled: Object.fromEntries(this.allParts().map((p) => [p.id, p.filled])),
      built: this.allParts().filter((p) => p.state === 'built').map((p) => p.id),
      lit: this.cabin.lit,
      phase: this.phaseIndex,
      lasso: this.hasLasso,
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
      if (this.d.active) this.d.env.hour = PHASE1.startHour!;
      return;
    }
    this.d.harvest.load(data.world ?? [], data.clock ?? 0);
    this.d.colliders.reset(this.d.gen);
    this.refreshTaken();
    const saved = data.step === 'hammer' ? 'pick' : data.step;
    this.phaseIndex = data.phase && this.stable ? Math.min(data.phase, this.phases.length - 1) : 0;
    const i = this.phase.steps.findIndex((s) => s.id === saved);
    this.stepIndex = Math.max(0, i);
    this.inv = { logs: data.inv.logs ?? 0, stones: data.inv.stones ?? 0 };
    this.hasAxe = data.axe;
    this.hasPick = !!(data.pick ?? data.hammer);
    if (this.hasAxe) this.axe.take();
    if (this.hasPick) this.pick.take();
    for (const k of data.felled) this.trees[k]?.setFelled();
    for (const k of data.smashed ?? []) this.rocks[k]?.setBroken();
    const known = (p: PartId) => p in this.cabin.parts || (!!this.stable && p in this.stable.parts);
    for (const p of data.built) if (known(p)) this.owner(p).setBuilt(p);
    // Only parts already started come back as sketches; the current step shows its own (enterStep).
    for (const p of Object.keys(data.filled) as PartId[]) {
      const n = data.filled[p] ?? 0;
      if (known(p) && !data.built.includes(p) && n > 0) { this.owner(p).showSketch(p); this.owner(p).setFilled(p, n); }
    }
    if (data.lasso && this.lasso) { this.lasso.show(true); this.lasso.take(); this.hasLasso = true; }
    if (data.lit) this.cabin.light(true);
    this.done = data.done;
    if (this.d.active) this.d.env.hour = data.hour;
    if (this.done && this.phaseIndex === 0) this.spirit.want = { at: this.anchor('hearthSeat').clone(), face: this.anchor('hearth'), pose: 'sit', icon: null, lead: false, settled: true };
  }

  private allParts(): Part[] {
    return [...Object.values(this.cabin.parts), ...(this.stable ? Object.values(this.stable.parts) : [])];
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
      case 'pickup': return st.item === 'axe' ? this.axe.pos : st.item === 'pick' ? this.pick.pos : this.lasso!.pos;
      case 'herd': return null;
      case 'gather': {
        if (this.phaseIndex === 0) return st.targets === 'tree' ? nearest(this.trees.filter((t) => t.standing)) : nearest(this.rocks.filter((r) => !r.broken));
        const h = this.hintTarget();
        return h ? h.face : null;
      }
      case 'build': return this.anchor(st.zone);
      case 'light': return this.d.env.hour >= st.readyAt ? this.cabin.hearthPos : this.anchor('doorstep');
      case 'rest': return null;
    }
  }

  state() {
    return {
      step: this.step.id, index: this.stepIndex, inv: { ...this.inv }, axe: this.hasAxe, lit: this.cabin.lit, done: this.done,
      hour: this.d.env.hour, warmth: this.spirit.warmth, spirit: this.spirit.pos.clone(),
      phase: this.phase.id, lasso: this.hasLasso,
      parts: Object.fromEntries(this.allParts().map((v) => [v.id, `${v.state}:${v.filled}/${v.need}`])),
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
