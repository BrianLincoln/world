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
import { glowCanvas, iconCanvas, tex } from './icons';
import { Billboard, OVERLAY_U } from './overlay';
import { PHASE1, type Anchor, type PhaseDef, type Resource, type StepDef, type TargetTag } from './phase1';
import { AxeProp, ChopTree, easeGlint, Flyer, RiverStone } from './props';
import { Spirit } from './spirit';

// The story director. It runs a phase table (phase1.ts) over the story set:
// the broken cabin, the axe, the grove, the brook stones and the spirit. It
// knows the step *kinds* (meet, pickup, gather, build, light, rest), not the
// content, so later phases can reuse it. It owns the interaction system
// (walk up to things; E / click also works), the inventory, the clock while
// the story runs, the idle hints and the save.

const SAVE_VERSION = 1;
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
  felled: number[];
  taken: number[];
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
  readonly stones: RiverStone[] = [];
  readonly axe: AxeProp;
  readonly group = new THREE.Group();
  readonly overlayGroup = new THREE.Group();
  readonly hud: Hud;
  readonly phase: PhaseDef = PHASE1;
  readonly far: FarLight;
  private sparkles = new Puffs('#ffe7a0', 30, 0.8, 0.9);
  private chipPuffs = new Puffs('#ecd3a2', 24, 0, 0.6);
  private flyers: { f: Flyer; res: Resource; stone: number }[] = [];
  private tokens: Token[] = [];
  private targets: Target[] = [];
  stepIndex = 0;
  inv: Record<Resource, number> = { logs: 0, stones: 0 };
  hasAxe = false;
  done = false;
  private idleT = 0;
  private boostT = 0;
  private dwell = 0;
  private swingT = -1;
  private swingCd = 0;
  private swingTree: ChopTree | null = null;
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
    this.group.add(this.cabin.root, this.cabin.embers.group, this.cabin.smoke.group, this.sparkles.group, this.chipPuffs.group);
    this.overlayGroup.add(this.cabin.overlay);
    site.trees.forEach((t, i) => {
      const tree = new ChopTree(t, ground(t.x, t.z), i);
      tree.onLanded = (tr) => this.treeLanded(tr);
      tree.onGone = (tr, along) => this.treeGone(tr, along);
      this.trees.push(tree);
      this.group.add(tree.group);
    });
    site.stones.forEach((s, i) => {
      const st = new RiverStone(s, ground(s.x, s.z), i);
      this.stones.push(st);
      this.group.add(st.mesh);
    });
    const cab = { x: site.x, z: site.z };
    this.axe = new AxeProp(site.stump.x, ground(site.stump.x, site.stump.z), site.stump.z, Math.atan2(site.spawn.x - cab.x, site.spawn.z - cab.z));
    this.group.add(this.axe.group);
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
    const sc = site.stones.reduce((a, s) => a.add(new THREE.Vector3(s.x, 0, s.z)), new THREE.Vector3()).divideScalar(Math.max(1, site.stones.length));
    this.anchors.set('stones', sc.setY(ground(sc.x, sc.z)));
    this.anchors.set('chimneySpot', L(CAB.W / 2 + 2.6, 1.6));
    this.anchors.set('chimney', this.cabin.parts.chimney.centre.clone());
    this.anchors.set('far', this.far.pos.clone());
    this.anchors.set('lookout', new THREE.Vector3(site.lookout.x, 0, site.lookout.z));
    for (const [k, v] of this.anchors) if (v.y === 0 && k !== 'far') v.y = ground(v.x, v.z);

    // Interactables.
    this.targets.push({ tag: 'axe', pos: this.axe.pos, reach: 1.7, mat: this.axe.mat, ok: () => !this.axe.taken });
    for (const t of this.trees) this.targets.push({ tag: 'tree', pos: t.pos, reach: 1.2 + t.radius, mat: t.mat, ok: () => t.standing });
    for (const s of this.stones) this.targets.push({ tag: 'stone', pos: s.pos, reach: 1.35, mat: s.mat, ok: () => !s.taken });
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
    this.group.add(this.spirit.group);
    this.overlayGroup.add(this.spirit.bubble.mesh);
    this.hud = new Hud();

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

  // ------------------------------------------------------------ world hooks

  /** Solid story props (cabin walls, standing trunks, stumps). */
  collide(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    this.cabin.push(pos, vel, r);
    const l = siteToLocal(this.site, pos.x, pos.z);
    if (Math.abs(l.x) > 60 || Math.abs(l.z) > 60) return;
    for (const t of this.trees) {
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

  surface(x: number, z: number, feetY: number, r: number, step: number) {
    return this.cabin.surface(x, z, feetY, r, step);
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
      case 'pickup': return this.hasAxe;
      case 'gather': return this.inv[st.resource] + this.pending(st.resource) >= this.remainingFor(st.for) && this.pending(st.resource) === 0;
      case 'build': return st.parts.every((id) => this.cabin.parts[id].state === 'built');
      case 'light': return this.cabin.lit;
      case 'rest': return false;
    }
  }

  // ------------------------------------------------------------ frame

  /** E / click on whatever is in reach. Returns true if the story used the press. */
  handleAction(input: Input): boolean {
    if (!this.d.active) return false;
    const t = this.inReach();
    if (!t) return false;
    if (!input.pressed('KeyE') && !input.pressed('Mouse0')) return false;
    this.act(t, true);
    return true;
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

  private inReach(): Target | null {
    const tag = this.activeTag();
    if (!tag || this.enough()) return null;
    const p = this.d.body.pos;
    let best: Target | null = null, bd = Infinity;
    for (const t of this.targets) {
      if (t.tag !== tag || !t.ok()) continue;
      if (Math.abs(p.y - t.pos.y) > 2.5) continue;
      const d = Math.hypot(p.x - t.pos.x, p.z - t.pos.z);
      if (d < t.reach && d < bd) { bd = d; best = t; }
    }
    return best;
  }

  private act(t: Target, pressed: boolean) {
    const d = this.d;
    if (t.tag === 'tree') {
      if (this.swingCd > 0 || this.swingT >= 0) return;
      const tree = this.trees.find((tr) => tr.pos === t.pos)!;
      this.swingTree = tree;
      this.swingT = 0;
      this.swingCd = pressed ? 0.6 : 0.85;
      d.rig.chop();
      return;
    }
    if (t.tag === 'axe') {
      this.axe.take();
      this.hasAxe = true;
      d.rig.tool = 'axe';
      d.sfx.pickup();
      this.sparkles.emit(this.axe.pos.clone().setY(this.axe.pos.y + 0.6), 6, 0.07, 1.6, undefined, { life: 0.6, rise: 0.4, up: 1.4 });
    } else if (t.tag === 'stone') {
      const s = this.stones.find((x) => x.pos === t.pos)!;
      s.take();
      d.sfx.pickup();
      const f = new Flyer('stone', s.pos.clone().setY(s.pos.y + 0.2), (x, z) => this.floorAt(x, z), 0, s.index);
      this.flyers.push({ f, res: 'stones', stone: s.index });
      this.group.add(f.mesh);
    } else if (t.tag === 'hearth') {
      this.cabin.light();
      d.sfx.whoosh();
      this.sparkles.emit(this.cabin.hearthPos, 8, 0.06, 1.2, undefined, { life: 0.8, rise: 1.2, up: 1.6 });
      d.puffs(this.cabin.hearthPos, 6, 0.12, 1.4);
    }
    this.progressMade();
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
    this.dirty = true;
  }

  update(dt: number, input: Input, mode: string) {
    const d = this.d;
    this.t += dt;
    this.stepT += dt;
    OVERLAY_U.uTime.value = this.t;
    const body = d.body;
    const st = this.step;

    for (const t of this.trees) t.update(dt);
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
      this.hud.set(this.inv, false);
      return;
    }

    // Interaction: walk into what glints; E / click works too.
    const walking = mode === 'walk' && body.grounded;
    const near = walking ? this.inReach() : null;
    if (near) {
      this.dwell += dt;
      if (near.tag === 'tree' ? this.dwell > 0.1 : this.dwell > 0.18) this.act(near, false);
    } else this.dwell = 0;
    this.swingCd -= dt;
    if (this.swingT >= 0) {
      this.swingT += dt;
      const tree = this.swingTree!;
      // Square up to the trunk while swinging.
      const want = Math.atan2(tree.pos.x - body.pos.x, tree.pos.z - body.pos.z);
      let dh = want - body.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      body.heading += dh * (1 - Math.exp(-14 * dt));
      if (this.swingT >= 0.3 && this.swingT - dt < 0.3) {
        const felled = tree.hit(body.pos);
        d.sfx.chop();
        if (felled) d.sfx.fall();
        const at = tree.pos.clone().lerp(body.pos, 0.35).setY(tree.pos.y + 0.9);
        d.puffs(at, 3, 0.07, 1.8);
        this.chips(at);
        this.progressMade();
      }
      if (this.swingT > 0.55) this.swingT = -1;
    }

    // Deposits: stand by the sketch with material and it flies into the slots.
    if (st.kind === 'build') {
      const z = this.anchor(st.zone);
      const inZone = Math.hypot(body.pos.x - z.x, body.pos.z - z.z) < st.zoneRadius || this.nearCabinSide(st.parts);
      this.depositT -= dt;
      if (inZone && this.inv[st.resource] > 0 && this.depositT <= 0) {
        const part = st.parts.find((p) => this.cabin.remaining(p) - this.tokens.filter((t) => t.part === p).length > 0);
        if (part) {
          this.depositT = 0.3;
          this.inv[st.resource]--;
          const P = this.cabin.parts[part];
          const slot = P.filled + this.tokens.filter((t) => t.part === part).length;
          const bb = new Billboard(tex(iconCanvas(st.resource === 'logs' ? 'log' : 'stone')), 0.55, 30);
          this.overlayGroup.add(bb.mesh);
          this.tokens.push({ bb, from: body.pos.clone().setY(body.pos.y + 1.3), part, slot, t: 0, res: st.resource });
          d.rig.give();
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
    for (const t of this.targets) easeGlint(t.mat, t.tag === tag && t.ok() ? (this.boostT > 0 ? 1.5 : 1) : 0, dt);

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

    this.clock(dt);
    this.hud.set(this.inv, true);
    this.saveT -= dt;
    if (this.dirty && this.saveT <= 0) { this.save(); this.dirty = false; this.saveT = 1; }
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
    if (st.kind === 'gather' && st.targets === 'stone') {
      const bank = this.anchor('bank');
      const s = this.stones.filter((x) => !x.taken).sort((a, b) => a.pos.distanceTo(bank) - b.pos.distanceTo(bank))[0];
      return s ? { at: bank, face: s.pos } : null;
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
        this.spirit.want = { at: this.anchor('hearthSeat').clone(), face: this.anchor('hearth'), pose: 'sit', icon: null, lead: false };
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
      if (st.kind === 'pickup') { this.axe.take(); this.hasAxe = true; this.d.rig.tool = 'axe'; }
      if (st.kind === 'build') for (const p of st.parts) this.cabin.setBuilt(p);
      if (st.kind === 'gather' && st.targets === 'tree') for (const t of this.trees.slice(0, 3)) t.setFelled();
      if (st.kind === 'gather' && st.targets === 'stone') for (const s of this.stones.slice(0, 3)) s.take();
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
      felled: this.trees.filter((t) => t.state !== 'standing').map((t) => t.index),
      taken: this.stones.filter((s) => s.taken).map((s) => s.index),
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
      if (this.d.active) this.d.env.hour = this.phase.startHour;
      return;
    }
    const i = this.phase.steps.findIndex((s) => s.id === data!.step);
    this.stepIndex = Math.max(0, i);
    this.inv = { logs: data.inv.logs ?? 0, stones: data.inv.stones ?? 0 };
    this.hasAxe = data.axe;
    if (this.hasAxe) { this.axe.take(); this.d.rig.tool = 'axe'; }
    for (const k of data.felled) this.trees[k]?.setFelled();
    for (const k of data.taken) this.stones[k]?.take();
    for (const p of data.built) this.cabin.setBuilt(p);
    for (const p of Object.keys(data.filled) as PartId[]) if (!data.built.includes(p)) { this.cabin.showSketch(p); this.cabin.setFilled(p, data.filled[p]); }
    if (data.lit) this.cabin.light(true);
    this.done = data.done;
    if (this.d.active) this.d.env.hour = data.hour;
    if (this.done) this.spirit.want = { at: this.anchor('hearthSeat').clone(), face: this.anchor('hearth'), pose: 'sit', icon: null, lead: false };
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
      case 'pickup': return this.axe.pos;
      case 'gather': return st.targets === 'tree' ? nearest(this.trees.filter((t) => t.standing)) : nearest(this.stones.filter((s) => !s.taken));
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
