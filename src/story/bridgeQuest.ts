import * as THREE from 'three';
import type { Giant } from '../giant/giant';
import type { Footfall } from '../giant/visit';
import type { Body, WagonMode } from '../player/movement';
import type { Mob } from '../mobs/types';
import { LOAD, WAG } from './wagon';
import type { Bridges } from '../world/bridge';
import { colored, PartBatch } from '../mobs/parts';
import { buildMallet } from './chores';
import { BIOME } from '../gfx/palette';
import { SEAT, WHEEL_R } from '../vehicles/bicycle';
import type { Bike, Bikes } from '../vehicles/bikes';
import type { WorldGen } from '../world/worldgen';
import type { Sfx } from './audio';
import { Rail, trailRail } from './rail';
import type { Guide, Story } from './story';

// The bridge, as a quest (docs/NEXT-bridge.md; agreed with the owner
// 2026-10-14/15). The first island's last dungeon is done and the giant walks
// on; between it and the third ring is the strait.
//
//   cross   The giant wades the strait to its waist and comes up out of the
//           water on the far side. Hands off, four shots from the home shore
//           (into the water, out in the deep, coming up the far beach, and
//           the guide at the water's edge with the giant beyond), then back
//           to you by the shrine.
//   shore   The guide is simply there at the water's edge where the prints
//           go in, looking across at the gap: its thought is a bridge.
//   ride    Come up to it and it hops, thinks of bikes, and there are two
//           (yours, and its little one). Hands off: the two of you ride off
//           up the trail; a veil covers the three kilometres; you ride in
//           along the trail into the village and stop in the yard.
//   mill    From there it's the director's (phase 4, story/phase4.ts).
//
// Saved as `embla.quest.<seed>`: the stage. A cutscene is saved as the
// stage it ends in, so a reload never plays half of one: the crossing as
// `shore` (you're put on the trail just short of the guide), the ride as
// `mill` (you start by the cabin as always).

export type QuestStage = 'wait' | 'cross' | 'shore' | 'ride' | 'mill' | 'yoke' | 'haul' | 'build' | 'done';
const STAGES: QuestStage[] = ['wait', 'cross', 'shore', 'ride', 'mill', 'yoke', 'haul', 'build', 'done'];

export interface QuestDeps {
  gen: WorldGen;
  story: Story;
  body: Body;
  sfx: Sfx;
  bikes: Bikes;
  saveKey: string;
  /** The ground with the prints pressed into it. */
  ground(x: number, z: number): number;
  giant(): Giant | null;
  /**
   * The giant's walk from the second ring to the third (over the strait), and
   * where that stands: `ready`, you have your hands back and it's walking on;
   * `settled`, it's lying by the third ring already.
   */
  crossing(): { falls: Footfall[]; ready: boolean; settled: boolean };
  /** Every footfall of the giant's from the village to the third ring, in order. */
  trail(): Footfall[];
  stamp(at: THREE.Vector3, yaw: number): void;
  puff(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** Stand the explorer at (x, z), facing `heading`, the camera behind. */
  place(x: number, z: number, heading: number): void;
  cycling(): Bike | null;
  /** Off whatever creature you're on (nothing if none). */
  getOff(): void;
  mountBike(k: Bike): void;
  /** Is the land round the camera still being built? */
  loading(): boolean;
  /** How far the nearest standing tree's trunk is from (x, z) (Infinity if none within `max`). */
  tree(x: number, z: number, max: number): number;
  /** The village's stelk (made once, kept), the wagon's driving, and putting you in it (or back on your feet). */
  stelk(): Mob | null;
  wagonMode: WagonMode;
  drive(on: boolean): void;
  /** The bridge over the strait (how much of it stands is ours to say), or null without one. */
  bridges(): Bridges | null;
}

/** The veil: how long it takes to come up or go, the least it holds, and the longest it waits for the land (s). */
const VEIL = { fade: 0.55, hold: 0.45, most: 20 };
/** The guide's little bike, how far to your right it rides (m), and how near you come before it gets the bikes out (m). */
const LITTLE = 0.55, BESIDE = 1.7, AHEAD = 0.4, MEET = 5;
/** The ride home: how far up the trail you ride off (s), where in from the village you're set down after the veil (m along the rail), and where you stop (m). */
const RIDE = { off: 4.6, from: 58, stop: 11 };
/**
 * The haul: how far along you are out of the village when the veil comes (m), how far short of the water's
 * edge it sets you down (m), where the wagon stops (short of the edge, m), and how far the villagers walk to
 * either side of it (m).
 */
const HAUL = { cut: 125, tail: 150, end: 9, side: 2.7 };
/** From the wagon's back axle to where the stelk stands in the shafts (m). */
const TOW = WAG.HL - 0.4 + WAG.SHAFT + WAG.AX;
/**
 * The building, in seconds: off the wagon (`down`), the first bays at the bridgehead (`head`), the rest across the
 * water seen from out on it (`across`), the last of it reaching the far shore (`last`); then everyone cheering
 * (`party`) before they set off home, and how far you go off before the guide is simply home again (m).
 */
const BUILD = { down: 1.6, head: 7, across: 10, last: 5.5, party: 22, away: 60 };
/** How much of the bridge stands at the end of the bridgehead shot and the shot across. */
const BUILT = { head: 0.035, across: 0.9 };

const m4 = new THREE.Matrix4(), q1 = new THREE.Quaternion(), QY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), PLANK = new THREE.Vector3(1.4, 0.08, 0.3), WHITE = new THREE.Color('#ffffff');
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), w1 = new THREE.Vector2(), w2 = new THREE.Vector2();
const ss = THREE.MathUtils.smoothstep;

interface Shot { from: number; to: number; secs: number; cam: THREE.Vector3; fov: number; look: 'giant' | 'guide'; low?: number }

export class BridgeQuest {
  stage: QuestStage = 'wait';
  /** Seconds into the stage (and into the cutscene's beat). */
  private t = 0;
  private beat = '';
  private frames = 0;
  /** How much of the frame the veil covers (0..1). */
  veil = 0;
  /** Where the orbit camera should look from once a cutscene hands it back (a yaw), once. */
  afterYaw: number | null = null;
  /** Hands off, but the bike under you is steered: a heading and how hard to pedal (-1 brakes). Main feeds it in as input. */
  drive: { yaw: number; y: number } | null = null;
  private pos = new THREE.Vector3();
  private at = new THREE.Vector3();
  private fov = 36;
  /** The crossing: where the prints go into the water and come out, which way across, the guide's spot on the shore, which side the cameras stand. */
  private cx: { enter: number; out: number; E: THREE.Vector3; X: THREE.Vector3; d: THREE.Vector3; n: THREE.Vector3; S: THREE.Vector3; side: number; shots: Shot[] } | null = null;
  private shot = -1;
  private rail: Rail | null = null;
  /** The guide's bike. */
  private gBike: Bike | null = null;
  /** The guide's heading on its bike. */
  private gh = 0;
  /** The haul: how far along the trail, how far across it, and whether the veil has skipped the long middle (saved). */
  private haul = { s: 0, off: 0, cut: false };
  private hRail: Rail | null = null;
  private saveT = 0;
  /** The two villagers who walk beside the wagon. */
  private marchers: number[] = [];
  /** Who builds the bridge and cheers it (everyone home), and the tools and boards they're seen with. */
  private crew: number[] = [];
  readonly group = new THREE.Group();
  private malletB = new PartBatch(buildMallet(), { keep: 0.5 }, 12);
  private plankB = new PartBatch(colored(new THREE.BoxGeometry(1, 1, 1), BIOME.cutWood, 0, false), { keep: 0.5 }, 12);
  private mallets: THREE.Object3D[] = [];
  /** How much of the bridge stands (0..1), as the quest has it. */
  built = 0;
  /** The party's over and they've set off home; and whether they're home (out of your sight). */
  private homeward = false;
  private turnK = 0;

  constructor(private d: QuestDeps) {
    this.load();
    this.group.add(this.malletB.mesh, this.plankB.mesh);
    for (let i = 0; i < 8; i++) this.mallets.push(new THREE.Object3D());
    if (this.stage === 'build') this.stage = 'done';
    if (this.stage === 'done') this.built = 1;
  }

  private get spirit() { return this.d.story.spirit; }
  /** A cutscene has the camera and your hands. */
  get busy() { return this.stage === 'cross' || this.stage === 'ride' || (this.stage === 'build' && this.beat !== 'party') || (this.stage === 'yoke' && this.beat === 'hitch') || (this.stage === 'haul' && (this.beat === 'cut' || this.beat === 'cutWait')); }
  /** A cutscene you can hold Space through. */
  get skippable() { return this.stage === 'cross' || this.stage === 'ride' || (this.stage === 'build' && this.beat !== 'party'); }
  /** The guide is the quest's (the story and the journey leave it be). */
  get holds() { return this.stage !== 'wait' && this.stage !== 'mill' && (this.stage !== 'done' || this.homeT >= 0); }
  /** Waiting under the veil for the land to load (dev: a stepped script must give the workers real time here). */
  get waiting() { return this.beat === 'veiled' || this.beat === 'cut'; }
  get clock() { return this.t; }
  get part() { return this.beat; }

  private key() { return `embla.quest.${this.d.saveKey}`; }
  private save(s: QuestStage) { try { localStorage.setItem(this.key(), s); } catch { /* ignore */ } }
  private load() {
    let s: string | null = null;
    try { s = localStorage.getItem(this.key()); } catch { /* no storage */ }
    this.stage = STAGES.includes(s as QuestStage) ? (s as QuestStage) : 'wait';
    if (this.stage === 'cross') this.stage = 'shore';
    if (this.stage === 'ride') this.stage = 'mill';
    try { const h = JSON.parse(localStorage.getItem(this.key() + '.haul') ?? 'null'); if (h) this.haul = { s: +h.s || 0, off: +h.off || 0, cut: !!h.cut }; } catch { /* none */ }
  }
  private saveHaul() { try { localStorage.setItem(this.key() + '.haul', JSON.stringify(this.haul)); } catch { /* ignore */ } }

  private enter(s: QuestStage, saveAs: QuestStage = s) {
    this.stage = s;
    this.t = 0;
    this.beat = '';
    this.frames = 0;
    this.save(saveAs);
  }

  /** The trail from the yard to the water's edge. */
  private railNow(): Rail {
    if (this.rail) return this.rail;
    const st = this.d.story, gen = this.d.gen, yard = st.anchor('yard');
    // (From the first footfall out of the village on: the ones in the lane are behind the yard.)
    const lane = st.site.village?.lane ?? [];
    const near = (x: number, z: number) => Math.min(Math.hypot(x - st.site.x, z - st.site.z), ...lane.map((q) => Math.hypot(x - q.x, z - q.z)));
    const falls = this.d.trail();
    let from = 0;
    for (let i = 0; i < Math.min(falls.length, 60); i++) if (near(falls[i].x, falls[i].z) < 26) from = i + 1;
    this.rail = trailRail(yard, falls.slice(from), (x, z) => gen.height(x, z) < 1.2);
    return this.rail;
  }

  // ------------------------------------------------------------ frame

  update(dt: number) {
    this.questStep(dt);
    // The chains from the shafts to the stelk's yoke (once it's been brought to the wagon).
    const w = this.d.story.wagon, late = this.stage !== 'wait' && this.stage !== 'cross' && this.stage !== 'shore' && this.stage !== 'ride' && this.stage !== 'mill';
    w?.harness(late ? this.d.stelk() : null, dt);
  }

  private questStep(dt: number) {
    this.t += dt;
    this.frames++;
    const c = this.d.crossing();
    if (this.stage === 'wait') {
      if (c.settled) this.enter('shore');
      else if (c.ready && this.d.giant()) this.startCrossing();
    }
    switch (this.stage) {
      case 'cross': this.playCrossing(dt); break;
      case 'shore': this.atShore(dt); break;
      case 'ride': this.playRide(dt); break;
      // (Home: the mill and the wagon are the director's phase 4, story/phase4.ts.)
      case 'mill': {
        const st = this.d.story;
        if (st.phaseIndex < 2) st.startBridge();
        // Loaded: the stelk's yoked to it next.
        if (st.wagon?.full && st.step.id === 'loading') this.startYoke();
        break;
      }
      case 'yoke': this.atYoke(dt); break;
      case 'haul': this.playHaul(dt); break;
      case 'build': this.playBuild(dt); break;
      case 'done': this.after(dt); break;
      default: break;
    }
    if (this.gBike && this.stage !== 'ride') this.parkGuideBike(dt);
  }

  // ------------------------------------------------------------ the crossing

  /** Where the prints go in and come out, and the four shots. */
  private stageCrossing() {
    const gen = this.d.gen, F = this.d.crossing().falls;
    const wet = (i: number) => gen.height(F[i].x, F[i].z) < -0.5;
    let enter = F.findIndex((_f, i) => wet(i));
    if (enter < 1) enter = Math.max(1, Math.floor(F.length * 0.4));
    let out = enter + 4;
    while (out < F.length - 1 && wet(out)) out++;
    const mid = (i: number) => new THREE.Vector3((F[i - 1].x + F[i].x) / 2, 0, (F[i - 1].z + F[i].z) / 2);
    const E = mid(enter), X = mid(Math.min(out, F.length - 1));
    const d = X.clone().sub(E).setY(0).normalize(), n = new THREE.Vector3(d.z, 0, -d.x);
    // The guide's spot: back from where the prints go in, on the first dry ground.
    const S = E.clone();
    for (let k = 0; k < 60 && gen.height(S.x, S.z) < 0.7; k++) S.addScaledVector(d, -1);
    S.y = this.d.ground(S.x, S.z);
    // The cameras stand on whichever side of the prints has more open shore.
    const room = (sd: number) => {
      let r = 0;
      for (const k of [20, 35, 55]) { const x = E.x - d.x * 25 + n.x * k * sd, z = E.z - d.z * 25 + n.z * k * sd; r += (gen.height(x, z) > 0.3 ? 1 : 0) + Math.min(this.d.tree(x, z, 10), 10) / 10; }
      return r;
    };
    const side = room(1) >= room(-1) ? 1 : -1;
    const P = (along: number, across: number, up: number, onLand: boolean) => {
      const p = E.clone().addScaledVector(d, along).addScaledVector(n, across * side);
      p.y = Math.max(onLand ? this.d.ground(p.x, p.z) : 0, 0) + up;
      return p;
    };
    // Into the water (seen from the shore, off to the side), out in the deep (low over the water, behind it), coming up
    // the far side (a long lens from the guide's beach), and the guide watching it go.
    const shots: Shot[] = [
      { from: enter - 3, to: enter + 4, secs: 12, cam: P(-25, 175, 6, true), fov: 36, look: 'giant', low: -4 },
      { from: enter + 9, to: enter + 13, secs: 7.5, cam: P(70, 34, 3.2, false), fov: 42, look: 'giant', low: 12 },
      { from: out - 5, to: out + 2, secs: 12.5, cam: S.clone().addScaledVector(n, 9 * side).addScaledVector(d, -4).setY(0), fov: 21, look: 'giant' },
      { from: out + 2, to: out + 6, secs: 5.5, cam: S.clone().addScaledVector(d, -9.5).addScaledVector(n, 2.4 * side).setY(0), fov: 34, look: 'guide' },
    ];
    for (const [i, s] of shots.slice(2).entries()) s.cam.y = Math.max(this.d.ground(s.cam.x, s.cam.z), 0.3) + (i ? 1.25 : 1.7);
    // (Over water a camera keeps above the waves.)
    for (const s of shots) s.cam.y = Math.max(s.cam.y, 2.5);
    this.cx = { enter, out, E, X, d, n, S, side, shots };
  }

  private startCrossing() {
    this.stageCrossing();
    // From here a reload finds the guide at the shore.
    this.enter('cross', 'shore');
    this.beat = 'in';
    this.shot = -1;
    this.d.story.lent = true;
  }

  /** Walk the giant on to footfall `n` at once, laying the prints it skipped. */
  private jumpGiant(n: number) {
    const g = this.d.giant(), F = this.d.crossing().falls;
    if (!g || g.steps >= n) return;
    for (let k = Math.max(0, Math.floor(g.steps)); k < Math.min(n, F.length); k++) this.d.stamp(v1.set(F[k].x, 0, F[k].z), F[k].yaw);
    g.jumpTo(n);
  }

  private startShot(i: number) {
    const s = this.cx!.shots[i];
    this.shot = i;
    this.t = 0;
    this.jumpGiant(s.from);
    this.pos.copy(s.cam);
    this.fov = s.fov;
    const g = this.d.giant();
    if (g) this.at.copy(g.centre).setY(g.centre.y - (s.low ?? 0));
    const sp = this.spirit;
    sp.think = i === 3;
    // (Looking out across the water after it, not round at the camera.)
    sp.hold = i === 3 ? Math.atan2(this.cx!.X.x - sp.pos.x, this.cx!.X.z - sp.pos.z) : null;
  }

  private playCrossing(dt: number) {
    const cx = this.cx!, g = this.d.giant(), sp = this.spirit;
    this.d.body.vel.x = this.d.body.vel.z = 0;
    if (this.beat === 'in') {
      // The veil comes up over where you are...
      this.veil = Math.min(1, this.veil + dt / VEIL.fade);
      if (this.veil >= 1) {
        this.beat = 'veiled';
        this.frames = 0;
        this.t = 0;
        // ...and under it the guide is at the water's edge, and the camera on the shore.
        sp.cancelActs();
        sp.riding = null;
        sp.teleport(cx.S);
        sp.mood = null;
        sp.want = { at: cx.S.clone(), face: cx.X.clone().setY(8), pose: 'stand', icon: 'bridge', lead: false };
        this.startShot(0);
      }
      return;
    }
    if (this.beat === 'veiled') {
      this.veil = 1;
      if ((this.t > VEIL.hold && this.frames > 8 && !this.d.loading()) || this.t > VEIL.most) { this.beat = 'shots'; this.t = 0; }
      this.follow(dt, true);
      return;
    }
    if (this.beat === 'shots') {
      const s = cx.shots[this.shot];
      if (this.shot === 0) this.veil = 1 - ss(this.t, 0, VEIL.fade);
      this.follow(dt, false);
      // (It walks on its own pace; a shot ends on its time, or when it's taken its steps.)
      if (this.t >= s.secs || (g && g.steps >= s.to + 0.5 && this.t > s.secs * 0.6)) {
        if (this.shot < cx.shots.length - 1) this.startShot(this.shot + 1);
        else { this.beat = 'out'; this.t = 0; }
      }
      return;
    }
    if (this.beat === 'out') {
      this.follow(dt, false);
      this.veil = Math.min(1, this.veil + dt / VEIL.fade);
      if (this.veil >= 1) { this.beat = 'back'; this.t = 0; this.frames = 0; sp.think = false; sp.hold = null; this.atShore(0); }
      return;
    }
    if (this.beat === 'back') {
      // Back to you, wherever you were (by the shrine), once the land there is in.
      this.veil = 1;
      if ((this.t > VEIL.hold && this.frames > 8 && !this.d.loading()) || this.t > VEIL.most) {
        this.stage = 'shore';
        this.t = 0;
        this.beat = 'lift';
        this.afterYaw = this.d.body.heading + Math.PI;
      }
    }
  }

  /** The shot's camera: put, and turning with what it watches. */
  private follow(dt: number, snap: boolean) {
    const s = this.cx!.shots[this.shot], g = this.d.giant(), sp = this.spirit;
    this.pos.copy(s.cam);
    this.fov = s.fov;
    if (s.look === 'guide') {
      // Over its shoulder: it low in the near third, the strait and the giant beyond.
      v1.copy(sp.pos).lerp(this.cx!.X, 0.07).setY(sp.pos.y + 3.2);
    } else if (g) v1.copy(g.centre).setY(g.centre.y - (s.low ?? 0) - 4);
    if (snap) this.at.copy(v1); else this.at.lerp(v1, 1 - Math.exp(-2.4 * dt));
  }

  // ------------------------------------------------------------ at the shore

  /** Waiting at the water's edge, looking across, thinking of a bridge. */
  private atShore(dt: number) {
    if (!this.cx) this.stageCrossing();
    const cx = this.cx!, sp = this.spirit, b = this.d.body, st = this.d.story;
    st.lent = true;
    sp.home = null;
    if (this.beat === 'lift') {
      this.veil = Math.max(0, this.veil - dt / VEIL.fade);
      if (this.veil <= 0) this.beat = '';
    }
    if (sp.pos.distanceTo(cx.S) > 30) { sp.teleport(cx.S); sp.riding = null; }
    if (sp.want.icon !== 'bridge') sp.want = { at: cx.S.clone(), face: cx.X.clone().setY(8), pose: 'stand', icon: 'bridge', lead: false };
    // You've come: the bikes, and home.
    const near = Math.hypot(b.pos.x - sp.pos.x, b.pos.z - sp.pos.z) < MEET && this.beat === '';
    if (near && (b.grounded || this.d.cycling())) this.startRide();
  }

  /** A reload in this stage: you're on the trail just short of the guide, looking at it. */
  resume() {
    if (this.stage === 'haul') { this.startHaul(false); return; }
    if (this.stage !== 'shore') return;
    if (!this.cx) this.stageCrossing();
    const cx = this.cx!;
    const p = cx.S.clone().addScaledVector(cx.d, -16);
    this.d.place(p.x, p.z, Math.atan2(cx.d.x, cx.d.z));
    this.spirit.teleport(cx.S);
  }

  // ------------------------------------------------------------ the ride home

  private startRide() {
    // From here a reload starts at home.
    this.enter('ride', 'mill');
    this.beat = 'hello';
    const sp = this.spirit, b = this.d.body;
    this.d.getOff();
    b.vel.x = b.vel.z = 0;
    sp.cancelActs();
    sp.want = { at: sp.pos.clone(), face: b.pos.clone().setY(b.pos.y + 1), pose: 'stand', icon: 'bike', lead: false };
    sp.think = true;
    sp.greet();
    this.d.story.chirp(true);
    // Up the trail from the two of them and off to the left, looking back down at them with the strait behind.
    const R = this.railNow();
    this.camS = R.project(b.pos.x, b.pos.z, true).s;
    this.dolly(0, R, 7, 3, 1.5, 0, true);
  }

  /** Where along the rail the cameras' riders are (the middle of the two). */
  private camS = 0;

  /**
   * The ride's camera, from the two riders (the rail's way home is their way): `along` metres ahead of them (back:
   * negative), `side` to their left, `up` over the ground there (and never under the line to them), looking at them,
   * or `ahead` metres past them.
   */
  private dolly(dt: number, R: Rail, along: number, side: number, up: number, ahead: number, snap = false) {
    const sp = this.spirit, b = this.d.body;
    const mid = v1.copy(b.pos).lerp(sp.pos, 0.5);
    const s = R.project(mid.x, mid.z).s;
    this.camS = snap ? s : this.camS + (s - this.camS) * (1 - Math.exp(-4 * dt));
    // (Home is toward the rail's start: ahead is less along it, and their left is its right.)
    const c = R.beside(this.camS - along, -side, w1);
    const y = Math.max(this.d.ground(c.x, c.y) + up, mid.y + up * 0.6);
    v2.set(c.x, y, c.y);
    // Never looking through a rise in the ground.
    for (let n = 0; n < 10; n++) {
      let hid = false;
      for (let u = 0.15; u < 0.95; u += 0.1) if (this.d.ground(v2.x + (mid.x - v2.x) * u, v2.z + (mid.z - v2.z) * u) + 0.4 > v2.y + (mid.y + 0.8 - v2.y) * u) hid = true;
      if (!hid) break;
      v2.y += 0.4;
    }
    if (snap) this.pos.copy(v2); else this.pos.lerp(v2, 1 - Math.exp(-5 * dt));
    const look = ahead ? R.at(this.camS - ahead, w2) : null;
    v2.copy(mid).setY(mid.y + 0.75);
    // (Half way to a point down the way ahead, so they're never out of the bottom of the frame.)
    if (look) v2.lerp(v3.set(look.x, this.d.ground(look.x, look.y) + 1.2, look.y), 0.55);
    if (snap) this.at.copy(v2); else this.at.lerp(v2, 1 - Math.exp(-4 * dt));
    this.fov = 38;
  }

  private playRide(dt: number) {
    const sp = this.spirit, b = this.d.body, R = this.railNow();
    const t = this.t;
    switch (this.beat) {
      case 'hello': {
        this.drive = null;
        b.vel.x = b.vel.z = 0;
        if (t > 1.7) { this.beat = 'bikes'; this.t = 0; this.bikesOut(); }
        break;
      }
      case 'bikes': {
        this.drive = null;
        b.vel.x = b.vel.z = 0;
        this.dolly(dt, R, 7, 3, 1.5, 0);
        if (t > 1.1 && !this.d.cycling()) { const k = this.d.bikes.bikes.get('gift'); if (k) this.d.mountBike(k); }
        if (t > 1.3 && !sp.riding) { this.gh = b.heading; R.project(b.pos.x, b.pos.z, true); sp.think = false; this.d.story.chirp(false); }
        if (t > 1.3) this.poseGuide(0);
        if (t > 1.9) { this.beat = 'off'; this.t = 0; }
        break;
      }
      case 'off': {
        // Off up the trail, away from the water: the camera stays and watches them go.
        const s = R.project(b.pos.x, b.pos.z).s;
        this.steer(R, s - 8, 1);
        this.poseGuide(dt);
        this.dolly(dt, R, 7 - t * 0.5, 3, 1.5, 0);
        this.veil = ss(t, RIDE.off - VEIL.fade, RIDE.off);
        if (t >= RIDE.off) { this.beat = 'cut'; this.t = 0; this.frames = 0; this.setDown(R); }
        break;
      }
      case 'cut': {
        // Under the veil: set down on the trail just out of the village, heading in.
        this.veil = 1;
        this.steer(R, RIDE.from - 8, 0);
        b.vel.x = b.vel.z = 0;
        this.poseGuide(0);
        this.dolly(0, R, -8, 3, 2.6, 9, true);
        if ((t > VEIL.hold && this.frames > 8 && !this.d.loading()) || t > VEIL.most) { this.beat = 'in'; this.t = 0; }
        break;
      }
      case 'in': {
        this.veil = 1 - ss(t, 0, VEIL.fade);
        const s = R.project(b.pos.x, b.pos.z).s;
        const speed = Math.hypot(b.vel.x, b.vel.z);
        if (s > RIDE.stop + 4) this.steer(R, s - 8, s > RIDE.stop + 22 ? 1 : 0.35);
        else this.steer(R, s - 6, speed > 2.5 ? -1 : 0);
        this.poseGuide(dt);
        // Behind them and to the left, the village ahead.
        this.dolly(dt, R, -8, 3, 2.6, 9);
        if (s < RIDE.stop + 4 && speed < 0.6) { this.beat = 'stop'; this.t = 0; this.drive = { yaw: b.heading, y: 0 }; this.hopOff(); }
        break;
      }
      case 'stop': {
        this.drive = { yaw: b.heading, y: 0 };
        if (t > 1.2) this.home();
        break;
      }
    }
  }

  /** The two bikes, out of nowhere in a puff: yours beside you (if you aren't on one), its little one beside that, both pointing up the trail. */
  private bikesOut() {
    const b = this.d.body, cx = this.cx!, sp = this.spirit;
    const h = Math.atan2(-cx.d.x, -cx.d.z);
    // (Your right hand, as you face up the trail.)
    const rx = -Math.cos(h), rz = Math.sin(h);
    if (!this.d.cycling()) {
      const k = this.d.bikes.placeNear('gift', b.pos.x - rx * 0.9, b.pos.z - rz * 0.9, h, 0, 3);
      this.d.puff(v1.copy(k.pos).setY(k.pos.y + 0.5), 8, 0.22, 1.6);
    }
    const mine = this.d.cycling() ?? this.d.bikes.bikes.get('gift')!;
    const gx = mine.pos.x + rx * BESIDE + Math.sin(h) * AHEAD, gz = mine.pos.z + rz * BESIDE + Math.cos(h) * AHEAD;
    this.gBike = this.d.bikes.place('spirit', gx, gz, h, 2, LITTLE);
    this.gBike.scale = LITTLE;
    this.gBike.ridden = true;
    this.d.puff(v1.copy(this.gBike.pos).setY(this.gBike.pos.y + 0.4), 7, 0.18, 1.3);
    this.d.sfx.whoosh();
    sp.want = { at: v1.set(gx - rx * 0.6, 0, gz - rz * 0.6).setY(this.d.ground(gx, gz)).clone(), face: this.gBike.pos.clone(), pose: 'stand', icon: null, lead: false };
  }

  /** Steer the bike under you at the rail's point `aim` m along, at `y` (1: pedal, 0: coast, -1: brake). */
  private steer(R: Rail, aim: number, y: number) {
    const b = this.d.body, p = R.at(aim, w1);
    this.drive = { yaw: Math.atan2(p.x - b.pos.x, p.y - b.pos.z), y };
  }

  /** The guide on its bike at your right hand, a wheel ahead, going your way (its own, a little behind your turns). */
  private poseGuide(dt: number) {
    const k = this.gBike!, sp = this.spirit, b = this.d.body;
    this.gh = dt > 0 ? this.gh + Math.atan2(Math.sin(b.heading - this.gh), Math.cos(b.heading - this.gh)) * (1 - Math.exp(-5 * dt)) : b.heading;
    const h = this.gh;
    const p = w2.set(b.pos.x - Math.cos(h) * BESIDE + Math.sin(h) * AHEAD, b.pos.z + Math.sin(h) * BESIDE + Math.cos(h) * AHEAD);
    const moved = Math.hypot(p.x - k.pos.x, p.y - k.pos.z);
    const dh = Math.atan2(Math.sin(h - k.heading), Math.cos(h - k.heading));
    this.turnK += ((dt > 0 ? dh / dt : 0) - this.turnK) * (1 - Math.exp(-6 * dt));
    k.pos.set(p.x, this.d.ground(p.x, p.y), p.y);
    k.heading = h;
    k.roll += moved / (WHEEL_R * LITTLE);
    k.crank += moved / (WHEEL_R * LITTLE) * 0.55;
    k.steer = THREE.MathUtils.clamp(this.turnK * 0.3, -0.5, 0.5);
    const v = dt > 0 ? moved / dt : 0;
    k.lean = THREE.MathUtils.clamp(-this.turnK * v * 0.06, -0.35, 0.35) + (v < 0.4 ? 0.12 : 0);
    const f = WHEEL_R * 1.6 * LITTLE;
    const hf = this.d.ground(p.x + Math.sin(h) * f, p.y + Math.cos(h) * f), hr = this.d.ground(p.x - Math.sin(h) * f, p.y - Math.cos(h) * f);
    k.pitch = Math.atan2(hf - hr, 2 * f);
    k.stand = 0;
    k.ridden = true;
    k.skel.pose(k);
    const seat = k.skel.toWorld(SEAT.x, SEAT.y + 0.05, SEAT.z + 0.05, new THREE.Vector3());
    sp.riding = { seat, heading: h, look: null };
  }

  /** Under the veil: you and the guide, on your bikes, on the trail a little way out of the village, heading in. */
  private setDown(R: Rail) {
    const s = RIDE.from, p = R.at(s, w1), h = R.heading(s) + Math.PI;
    this.d.place(p.x, p.y, h);
    const k = this.d.cycling();
    if (k) { k.pos.copy(this.d.body.pos); k.heading = h; }
    R.project(p.x, p.y, true);
    this.d.story.spirit.teleport(v1.set(p.x, this.d.ground(p.x, p.y), p.y));
    this.poseGuide(0);
  }

  /** Stopped in the yard: off its bike and on to its feet beside it. */
  private hopOff() {
    const k = this.gBike, sp = this.spirit;
    sp.riding = null;
    if (k) {
      // (Off on the side away from you.)
      const p = k.pos.clone().add(v2.set(-Math.cos(k.heading), 0, Math.sin(k.heading)).multiplyScalar(0.9));
      p.y = this.d.ground(p.x, p.z);
      sp.teleport(p);
      sp.want = { at: p.clone(), face: this.d.body.pos.clone().setY(this.d.body.pos.y + 1), pose: 'stand', icon: null, lead: false };
      sp.celebrate();
      this.d.story.chirp(true);
    }
  }

  /** Home: your hands back, on your bike in the yard, and the rest is the village's (phase 4). */
  private home() {
    this.drive = null;
    this.enter('mill');
    this.afterYaw = this.d.body.heading + Math.PI;
    this.d.story.lent = false;
    this.d.story.startBridge();
  }

  /** The guide's bike once it's off: on its stand. */
  private parkGuideBike(dt: number) {
    const k = this.gBike!;
    k.ridden = true;
    k.stand += (1 - k.stand) * (1 - Math.exp(-6 * dt));
    k.lean += (0.2 - k.lean) * (1 - Math.exp(-5 * dt));
    k.steer += (0.25 - k.steer) * (1 - Math.exp(-3 * dt));
    k.skel.pose(k);
  }

  // ------------------------------------------------------------ the haul

  /** The trail from where the wagon stands to the water's edge. */
  private haulRail(): Rail {
    if (this.hRail) return this.hRail;
    const st = this.d.story, w = st.wagon!, gen = this.d.gen;
    const lane = st.site.village?.lane ?? [];
    const near = (x: number, z: number) => Math.min(Math.hypot(x - st.site.x, z - st.site.z), ...lane.map((q) => Math.hypot(x - q.x, z - q.z)));
    const falls = this.d.trail();
    let from = 0;
    for (let i = 0; i < Math.min(falls.length, 60); i++) if (near(falls[i].x, falls[i].z) < 26) from = i + 1;
    this.hRail = trailRail({ x: w.home.x, z: w.home.z }, falls.slice(from), (x, z) => gen.height(x, z) < 1.2);
    return this.hRail;
  }

  /** Loaded: the stelk is brought round, and the guide waits by the bench for you to climb up. */
  private startYoke() {
    this.enter('yoke');
    const m = this.d.stelk(), st = this.d.story, w = st.wagon!;
    if (m) {
      // It stands off to the side of the wagon, waiting.
      const p = w.local(-3.2, WAG.HL + 1.2);
      m.pos.set(p.x, this.d.ground(p.x, p.z), p.z);
      m.heading = w.heading;
      m.vel.set(0, 0, 0);
    }
  }

  private atYoke(dt: number) {
    const st = this.d.story, w = st.wagon!, sp = this.spirit, b = this.d.body, m = this.d.stelk();
    st.lent = true;
    const bench = w.local(-1.4, WAG.HL - 0.3);
    bench.y = this.d.ground(bench.x, bench.z);
    if (this.beat === '') {
      if (sp.want.icon !== 'antlers') sp.want = { at: bench.clone(), face: m ? m.pos.clone().setY(m.pos.y + 1.4) : w.local(0, WAG.HL + 2), pose: 'point', icon: 'antlers', lead: false };
      if (m) { m.ridden = true; m.vel.set(0, 0, 0); }
      // Up to the bench (or the stelk): it's yoked, and you're up on the bench.
      const by = Math.hypot(b.pos.x - bench.x, b.pos.z - bench.z) < 3.2 || (m && Math.hypot(b.pos.x - m.pos.x, b.pos.z - m.pos.z) < 2.6);
      if (by && b.grounded) { this.beat = 'hitch'; this.t = 0; this.d.getOff(); sp.celebrate(); this.d.story.chirp(true); }
      return;
    }
    // The stelk walks round into the shafts.
    b.vel.x = b.vel.z = 0;
    if (m) {
      const to = w.hitch(v1), k = Math.min(1, this.t / 2.2), from = v2.copy(w.local(-3.2, WAG.HL + 1.2));
      const p = v3.copy(from).lerp(to, ss(k, 0, 1));
      p.x += Math.sin(k * Math.PI) * -1.2 * Math.cos(w.heading); p.z += Math.sin(k * Math.PI) * 1.2 * Math.sin(w.heading);
      m.vel.set((p.x - m.pos.x) / Math.max(dt, 1e-3), 0, (p.z - m.pos.z) / Math.max(dt, 1e-3));
      m.pos.set(p.x, this.d.ground(p.x, p.z), p.z);
      m.heading += Math.atan2(Math.sin(w.heading - m.heading), Math.cos(w.heading - m.heading)) * (1 - Math.exp(-3 * dt));
    }
    if (this.t > 2.4) {
      if (this.beat === 'hitch') {
        if (m) { this.d.puff(w.hitch(v1).setY(m.pos.y + 1), 8, 0.2, 1.6); m.vel.set(0, 0, 0); m.heading = w.heading; }
        this.d.sfx.thunk();
        this.beat = 'board';
      }
      // Up onto the bench under a veil, so the cut to the driving camera isn't a jump.
      this.veil = Math.min(1, this.veil + dt / VEIL.fade);
      if (this.veil >= 1) { this.startHaul(true); this.beat = 'cutWait'; this.t = 0; this.frames = 0; }
    }
  }

  /** On the bench, the stelk in the shafts: off down the trail (or, a reload, on from where you were). */
  private startHaul(fresh: boolean) {
    const R = this.haulRail(), st = this.d.story, sp = this.spirit;
    if (fresh) { this.haul = { s: TOW - WAG.AX, off: 0, cut: false }; this.saveHaul(); this.enter('haul'); }
    else { this.stage = 'haul'; this.t = 0; }
    this.beat = '';
    const wm = this.d.wagonMode;
    wm.far = this.haul.s;
    wm.set(R, this.haul.s, this.haul.off, this.d.ground);
    wm.stop = R.L - HAUL.end;
    // The wagon's back axle straight behind the stelk.
    const h0 = R.heading(this.haul.s, 5);
    this.axle.set(wm.lead.x - Math.sin(h0) * TOW, 0, wm.lead.z - Math.cos(h0) * TOW);
    this.d.drive(true);
    this.tow();
    this.afterYaw = this.d.body.heading + Math.PI;
    // The guide beside you on the bench.
    sp.cancelActs();
    sp.think = false;
    sp.want = { at: sp.pos.clone(), face: null, pose: 'stand', icon: null, lead: false, settled: true };
    st.lent = true;
    // Two of the village walk alongside.
    const v = st.village;
    this.marchers = v ? v.spirits.map((_s, k) => k).filter((k) => v.here(k)).slice(0, 2) : [];
    for (const [n, k] of this.marchers.entries()) { const q = R.beside(this.haul.s + 1, (n ? -1 : 1) * HAUL.side, w2); v!.attend(k, v3.set(q.x, 0, q.y), v1.set(q.x, 0, q.y)); }
    this.place(0);
  }

  /** The wagon's back axle, dragged along behind the stelk as a cart is. */
  private axle = new THREE.Vector3();
  /**
   * The wagon towed: its back axle is pulled straight toward the stelk, never pushed sideways, so the stelk leads
   * into a turn and the wagon swings round after it. The body (you, on the bench) goes with the wagon.
   */
  private tow() {
    const wm = this.d.wagonMode, b = this.d.body, L = wm.lead, A = this.axle;
    const dx = L.x - A.x, dz = L.z - A.z, d = Math.hypot(dx, dz) || 1;
    A.set(L.x - (dx / d) * TOW, 0, L.z - (dz / d) * TOW);
    const yaw = Math.atan2(dx, dz);
    const cx = A.x + Math.sin(yaw) * WAG.AX, cz = A.z + Math.cos(yaw) * WAG.AX;
    this.d.story.wagon!.place(cx, cz, yaw, this.d.ground);
    b.pos.set(cx, this.d.ground(cx, cz), cz);
    b.heading = yaw;
  }

  /** The wagon, the stelk, the guide on the bench and the two walking, from where the drive has you. */
  private place(dt: number) {
    const b = this.d.body, st = this.d.story, w = st.wagon!, m = this.d.stelk(), sp = this.spirit, wm = this.d.wagonMode;
    this.tow();
    if (m) {
      m.ridden = true;
      m.vel.copy(b.vel);
      m.pos.copy(wm.lead);
      // In the shafts, but turning its head and shoulders into the way it's going.
      const lean = Math.atan2(Math.sin(wm.leadHeading - w.heading), Math.cos(wm.leadHeading - w.heading));
      m.heading = w.heading + THREE.MathUtils.clamp(lean, -0.12, 0.12);
      m.grounded = true;
    }
    const seat = w.local(-0.42, WAG.HL - 0.2, WAG.DECK + 0.42);
    sp.riding = { seat, heading: b.heading, look: m ? m.pos.clone().setY(m.pos.y + 1.6) : null };
    const v = st.village, R = this.haulRail();
    if (!v) return;
    for (const [n, k] of this.marchers.entries()) {
      const s = v.spirits[k], q = R.beside(wm.s - 3.6, wm.off + (n ? -1 : 1) * HAUL.side, w2);
      s.want.at.set(q.x, this.d.ground(q.x, q.y), q.y);
      s.want.face = null;
      s.want.settled = false;
      s.haste = Math.max(1.6, Math.abs(wm.speed) * 1.25 + 0.6);
      if (dt === 0 || Math.hypot(s.pos.x - q.x, s.pos.z - q.y) > 9) s.teleport(s.want.at);
    }
  }

  private playHaul(dt: number) {
    const wm = this.d.wagonMode, R = this.haulRail(), st = this.d.story;
    st.lent = true;
    this.place(dt);
    // Backing too far: the stelk won't have it.
    if (wm.balked < dt * 1.5 && (this.t - this.balkT > 1.2)) { this.balkT = this.t; this.d.sfx.nope(); const m = this.d.stelk(); if (m) this.d.puff(v1.copy(m.pos).setY(m.pos.y + 0.2), 4, 0.15, 1); }
    this.haul.s = wm.s;
    this.haul.off = wm.off;
    if ((this.saveT -= dt) <= 0) { this.saveT = 1; this.saveHaul(); }
    if (this.beat === '' && !this.haul.cut && wm.s > HAUL.cut) { this.beat = 'cut'; this.t = 0; this.frames = 0; }
    if (this.beat === 'cut') {
      // The long middle under a veil: down the trail to near the strait.
      if (this.veil < 1) { this.veil = Math.min(1, this.veil + dt / VEIL.fade); if (this.veil >= 1) { this.t = 0; this.frames = 0; this.haul = { s: R.L - HAUL.tail, off: 0, cut: true }; this.saveHaul(); this.startHaul(false); this.beat = 'cutWait'; } return; }
    }
    if (this.beat === 'cutWait') {
      this.veil = 1;
      if ((this.t > VEIL.hold && this.frames > 8 && !this.d.loading()) || this.t > VEIL.most) this.beat = 'lift';
      return;
    }
    if (this.beat === 'lift') { this.veil = Math.max(0, this.veil - dt / VEIL.fade); if (this.veil <= 0) this.beat = ''; }
    // At the water's edge: stopped. (The building is slice E.)
    if (wm.s >= wm.stop - 1.5 && Math.abs(wm.speed) < 0.05) this.arrive();
  }
  private balkT = -9;

  /** The wagon at the strait. */
  private arrive() {
    // From here a reload finds the bridge standing.
    this.enter('build', 'done');
    this.beat = 'down';
    this.d.wagonMode.speed = 0;
  }

  // ------------------------------------------------------------ the building

  private bridgeAt(k: number, out = new THREE.Vector3()) { const b = this.d.bridges(); return b ? b.along(k, out) : out.copy(this.d.body.pos); }

  /** Off the bench, and everyone home sets to: the crew is the two who walked, the guide's helpers, all of the village that's here. */
  private startBuild() {
    const st = this.d.story, sp = this.spirit, v = st.village, b = this.d.body, br = this.d.bridges();
    this.d.drive(false);
    const w = st.wagon!;
    this.parkWagon();
    const off = w.local(-2.2, -0.6);
    this.d.place(off.x, off.z, br ? br.heading : b.heading);
    sp.riding = null;
    sp.teleport(w.local(-1.4, WAG.HL + 0.6).setY(this.d.ground(w.local(-1.4, WAG.HL + 0.6).x, w.local(-1.4, WAG.HL + 0.6).z)));
    sp.want = { at: sp.pos.clone(), face: this.bridgeAt(0.05), pose: 'stand', icon: null, lead: false, settled: true };
    sp.celebrate();
    this.crew = v ? v.spirits.map((_q, k) => k).filter((k) => v.here(k)) : [];
    for (const k of this.crew) if (!this.marchers.includes(k)) v!.attend(k, w.local(1.8, -1 - k * 0.6), this.bridgeAt(0));
    this.d.sfx.chirp(true);
  }

  private playBuild(dt: number) {
    const st = this.d.story, sp = this.spirit, v = st.village, br = this.d.bridges(), w = st.wagon!, t = this.t;
    st.lent = true;
    if (!br) { this.finish(); return; }
    const dir = v1.set(Math.sin(br.heading), 0, Math.cos(br.heading)), n = v2.set(dir.z, 0, -dir.x);
    if (this.beat === 'down') {
      if (t < dt * 1.5) this.startBuild();
      this.shotHead();
      if (t > BUILD.down) { this.beat = 'head'; this.t = 0; }
    } else if (this.beat === 'head') {
      this.built = BUILT.head * ss(t, 0.5, BUILD.head - 0.5);
      this.shotHead();
      if (t > BUILD.head) { this.beat = 'across'; this.t = 0; }
    } else if (this.beat === 'across') {
      this.built = THREE.MathUtils.lerp(BUILT.head, BUILT.across, ss(t, 0, BUILD.across));
      // Out on the water off to one side, the bridge running across the frame as it grows.
      const mid = this.bridgeAt(0.45, v3);
      this.pos.copy(mid).addScaledVector(n, 120).addScaledVector(dir, -25).setY(7);
      // (Turning a little with the end as it goes out over the water.)
      this.at.copy(this.bridgeAt(0.4)).lerp(this.bridgeAt(this.built), 0.35).setY(3.5);
      this.fov = 30;
      if (t > BUILD.across) { this.beat = 'last'; this.t = 0; }
    } else if (this.beat === 'last') {
      this.built = THREE.MathUtils.lerp(BUILT.across, 1, ss(t, 0, BUILD.last - 2));
      // Along the deck from the near end, the far shore at the end of it.
      this.pos.copy(this.bridgeAt(0)).addScaledVector(dir, -6).addScaledVector(n, 1.2).setY(3.4 + 2.2);
      this.at.copy(this.bridgeAt(1)).setY(6);
      this.fov = 30;
      if (this.built >= 1 && this.t - dt < BUILD.last - 2) { this.d.sfx.fanfare(); for (const k of this.crew) v?.spirits[k].celebrate(); sp.celebrate(); }
      if (t > BUILD.last) { this.beat = 'party'; this.t = 0; this.startParty(); }
    } else if (this.beat === 'party') this.party(dt);
    this.built = Math.min(1, this.built);
    br.built = this.built;
    // The load goes into it as it goes up.
    w.setLoad(Math.round(LOAD * (1 - this.built)));
    this.crewWork(dt, dir, n);
  }

  /** The bridgehead: the crew at the wagon's tail and out on the first bays, seen from the shore beside them. */
  private shotHead() {
    const br = this.d.bridges()!, h = this.bridgeAt(0, v3), dir = new THREE.Vector3(Math.sin(br.heading), 0, Math.cos(br.heading)), n = new THREE.Vector3(dir.z, 0, -dir.x);
    this.pos.copy(h).addScaledVector(dir, -16).addScaledVector(n, 10);
    this.pos.y = Math.max(this.d.ground(this.pos.x, this.pos.z), 0) + 3;
    this.at.copy(h).addScaledVector(dir, 5).setY(h.y + 0.5);
    this.fov = 38;
  }

  /**
   * The crew: back and forth between the wagon and the end of the bridge with a board on their heads, and a knock or
   * two at the end with a mallet. Far out on it, they're at the end, knocking. Their boards and mallets are drawn here.
   */
  private crewWork(dt: number, dir: THREE.Vector3, n: THREE.Vector3) {
    const v = this.d.story.village, w = this.d.story.wagon!;
    this.malletB.begin();
    this.plankB.begin();
    if (v && this.beat !== 'party') {
      const end = this.bridgeAt(this.built, new THREE.Vector3());
      const far = this.built > BUILT.head * 1.2;
      for (const [i, k] of this.crew.entries()) {
        const s = v.spirits[k], ph = (this.t + i * 1.7) % 6, laden = !far && ph < 3;
        const side = (i % 2 ? -1 : 1) * (0.8 + (i >> 1) * 0.7);
        const to = laden || far ? end.clone().addScaledVector(dir, -0.8 - (i >> 1) * 0.6).addScaledVector(n, side) : w.local(side * 0.5, -WAG.HL - 0.9);
        to.y = Math.max(this.d.ground(to.x, to.z), end.y);
        if (far) s.teleport(to);
        s.want.at.copy(to);
        s.want.settled = true;
        s.want.face = end;
        s.haste = 3.2;
        s.laden = laden && !far;
        const at = s.pos.distanceTo(to) < 0.8;
        s.gesture = at && (far || laden) ? 'hammer' : null;
        if (s.gesture === 'hammer' && !this.mallets[i].parent) s.take(this.mallets[i]);
        if (!s.gesture && s.tool === this.mallets[i]) s.take(null);
        if (s.tool === this.mallets[i]) { this.mallets[i].updateWorldMatrix(true, false); this.malletB.push(this.mallets[i].matrixWorld, WHITE); }
        if (s.laden) { s.overhead(v3, q1); v3.y += 0.06; q1.multiply(QY); this.plankB.push(m4.compose(v3, q1, PLANK), WHITE); }
        if (at && (far || laden) && Math.floor((this.t + i) * 1.7) !== Math.floor((this.t - dt + i) * 1.7)) this.d.puff(v3.copy(end).setY(end.y + 0.2), 2, 0.12, 1.2);
      }
      // The guide too, by the wagon, pointing them on.
      if (!far) { this.spirit.want.face = end; }
    }
    this.malletB.end();
    this.plankB.end();
    void w;
  }

  /** Everyone round you at the bridgehead, cheering. */
  private startParty() {
    const v = this.d.story.village, b = this.d.body, sp = this.spirit;
    this.afterYaw = this.d.bridges() ? this.d.bridges()!.heading + Math.PI : b.heading + Math.PI;
    for (const [i, k] of this.crew.entries()) {
      const s = v!.spirits[k];
      if (s.tool) s.take(null);
      s.laden = false;
      s.gesture = null;
      const a = (i / Math.max(1, this.crew.length)) * Math.PI * 1.4 - 0.7 + Math.PI, r = 2.6 + (i % 2) * 0.8;
      const at = new THREE.Vector3(b.pos.x + Math.sin(b.heading + a) * r, 0, b.pos.z + Math.cos(b.heading + a) * r);
      at.y = this.d.ground(at.x, at.z);
      v!.attend(k, at, b.pos);
      v!.spirits[k].teleport(at);
    }
    const g = new THREE.Vector3(b.pos.x + Math.sin(b.heading) * 2.2, 0, b.pos.z + Math.cos(b.heading) * 2.2);
    g.y = this.d.ground(g.x, g.z);
    sp.teleport(g);
    sp.want = { at: g.clone(), face: b.pos, pose: 'stand', icon: null, lead: false, settled: true };
    this.homeT = -1;
  }

  /** The party: a while of cheering, now one, now another; then they're off home up the trail. */
  private party(dt: number) {
    const v = this.d.story.village, sp = this.spirit, b = this.d.body;
    if (!v) { this.finish(); return; }
    for (const [i, k] of this.crew.entries()) {
      if (Math.floor((this.t + i * 0.9) / 2.6) !== Math.floor((this.t - dt + i * 0.9) / 2.6)) v.spirits[k].celebrate();
      v.spirits[k].want.face = b.pos;
    }
    if (Math.floor(this.t / 3.1) !== Math.floor((this.t - dt) / 3.1)) { sp.celebrate(); if (Math.random() < 0.5) this.d.story.chirp(true); }
    if (this.t > BUILD.party) this.finish();
  }

  /** It stands: saved, and everyone sets off home (`after`), the guide pointing you across. */
  private finish() {
    const v = this.d.story.village, R = this.haulRail();
    this.enter('done');
    this.built = 1;
    const br = this.d.bridges();
    if (br) br.built = 1;
    this.d.story.wagon?.setLoad(0);
    this.homeT = 0;
    this.homeward = true;
    // Up the trail toward home, a little apart.
    for (const [i, k] of this.crew.entries()) {
      const s = v?.spirits[k];
      if (!s) continue;
      const q = R.beside(R.L - 80 - i * 6, (i % 2 ? -1 : 1) * 2, w1);
      s.want = { at: new THREE.Vector3(q.x, this.d.ground(q.x, q.y), q.y), face: null, pose: 'stand', icon: null, lead: false, settled: true };
      s.haste = 1.9;
    }
    const m = this.d.stelk();
    if (m) this.stelkHome = R.L - 70;
    const sp = this.spirit, h = this.bridgeAt(0.01);
    const at = this.bridgeAt(0).addScaledVector(v1.set(Math.sin(br?.heading ?? 0), 0, Math.cos(br?.heading ?? 0)), -4).addScaledVector(v2.set(Math.cos(br?.heading ?? 0), 0, -Math.sin(br?.heading ?? 0)), 2.2);
    at.y = this.d.ground(at.x, at.z);
    sp.want = { at, face: this.bridgeAt(1).setY(6), pose: 'point', icon: null, lead: false };
    void h;
  }
  /** Seconds since they set off home (-1: not yet). */
  private homeT = -1;
  private stelkHome = -1;

  /**
   * After: the villagers and the stelk walk off up the trail, and once you're well away (or over the water) they're
   * simply home; the guide points you across until you've gone, and then it's home by its fire. The wagon stays.
   */
  private after(dt: number) {
    const st = this.d.story, b = this.d.body, v = st.village, R = this.haulRail();
    const br = this.d.bridges();
    if (br) br.built = 1;
    // The wagon's left where it stopped, at the bridgehead.
    const w = st.wagon;
    if (w && !this.homeward && this.homeT < 0 && !this.parked) {
      this.parked = true;
      this.parkWagon();
      w.setLoad(0);
      st.finishBridge();
    }
    if (this.homeT < 0) return;
    this.homeT += dt;
    this.parked = true;
    st.lent = true;
    const m = this.d.stelk();
    if (m && this.stelkHome > 0) {
      // Its yoke off, it walks home with them.
      const to = R.at(this.stelkHome, w1), d = Math.hypot(to.x - m.pos.x, to.y - m.pos.z);
      if (d > 0.5) { const sp = Math.min(1.6 * dt, d); m.vel.set(((to.x - m.pos.x) / d) * 1.6, 0, ((to.y - m.pos.z) / d) * 1.6); m.pos.x += ((to.x - m.pos.x) / d) * sp; m.pos.z += ((to.y - m.pos.z) / d) * sp; m.pos.y = this.d.ground(m.pos.x, m.pos.z); m.heading = Math.atan2(to.x - m.pos.x, to.y - m.pos.z); }
      else m.vel.set(0, 0, 0);
    }
    const far = (p: THREE.Vector3) => Math.hypot(p.x - b.pos.x, p.z - b.pos.z) > 110;
    // Out of your sight, they're home.
    if (v && this.homeward && this.crew.every((k) => far(v.spirits[k].pos))) {
      for (const k of this.crew) { const door = v.houses[v.home[k]].door; v.attend(k, door, door); v.dismiss(k); }
      if (m) { const p = st.mill?.local(-6, 4); if (p) m.pos.set(p.x, this.d.ground(p.x, p.z), p.z); m.vel.set(0, 0, 0); this.stelkHome = -1; }
      this.homeward = false;
    }
    // You're away over the water (or a long way off): the guide's home too.
    const gap = Math.hypot(this.spirit.pos.x - b.pos.x, this.spirit.pos.z - b.pos.z);
    if (gap > BUILD.away) {
      if (v && this.homeward) for (const k of this.crew) { const door = v.houses[v.home[k]].door; v.attend(k, door, door); v.dismiss(k); }
      this.homeward = false;
      if (m && this.stelkHome > 0) { const p = st.mill?.local(-6, 4); if (p) m.pos.set(p.x, this.d.ground(p.x, p.z), p.z); this.stelkHome = -1; }
      this.homeT = -1;
      st.lent = false;
      st.finishBridge();
    }
  }
  private parked = false;

  /** The wagon drawn off to the side of the bridgehead, out of the way, the stelk still in its shafts until they go home. */
  private parkWagon() {
    const st = this.d.story, w = st.wagon!, R = this.haulRail(), br = this.d.bridges(), m = this.d.stelk();
    let best = -Infinity, at = R.at(R.L - 24, new THREE.Vector2());
    for (const side of [5.5, -5.5, 8, -8]) {
      const q = R.beside(R.L - 24, side, new THREE.Vector2()), g = this.d.gen.height(q.x, q.y);
      const score = (br ? Math.min(br.distTo(q.x, q.y), 12) : 0) + (g > 0.8 ? 6 : 0) - Math.abs(side) * 0.2;
      if (score > best) { best = score; at = q; }
    }
    w.place(at.x, at.y, R.heading(R.L - 24, 6) + 0.35, this.d.ground);
    if (m && this.stelkHome < 0) { const h = w.hitch(v1); m.pos.set(h.x, this.d.ground(h.x, h.z), h.z); m.heading = w.heading; m.vel.set(0, 0, 0); }
  }

  /** Where you sit while you drive (the rig's seat). */
  seat(out: { pos: THREE.Vector3; quat: THREE.Quaternion; spread: number }) { return this.d.story.wagon!.seat(out); }
  /** The reins: from your hands to the stelk's shoulders (a direction, for the rig's rope arm). */
  reins(out: THREE.Vector3) { const m = this.d.stelk(), b = this.d.body; return m ? out.set(m.pos.x - b.pos.x, m.pos.y + 1.2 - b.pos.y - 1.5, m.pos.z - b.pos.z) : null; }
  /** Driving the wagon now. */
  get driving() { return this.stage === 'haul'; }

  // ------------------------------------------------------------ for main

  /** The camera while a cutscene has it. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3; fov: number } | null {
    if (this.stage === 'cross' && this.beat !== 'in' && this.beat !== 'back') return { pos: this.pos, at: this.at, fov: this.fov };
    if (this.stage === 'ride') return { pos: this.pos, at: this.at, fov: this.fov };
    if (this.stage === 'build' && this.beat !== 'party') return { pos: this.pos, at: this.at, fov: this.fov };
    return null;
  }

  /** Where the pointer points (the guide at the shore, from far off). */
  guide(): Guide | null {
    if (this.stage === 'shore' || this.stage === 'yoke') return { at: this.spirit.pos, near: 30 };
    return null;
  }

  /** The way out of a cutscene (main holds the veil): the crossing as if seen, the giant on its far side; the ride as if ridden. */
  skip() {
    if (this.stage === 'cross') {
      const cx = this.cx!;
      this.jumpGiant(cx.out + 4);
      this.spirit.think = false;
      this.spirit.hold = null;
      this.stage = 'shore';
      this.beat = '';
      this.veil = 0;
      this.atShore(0);
      this.afterYaw = this.d.body.heading + Math.PI;
    } else if (this.stage === 'ride') {
      const R = this.railNow();
      if (this.beat === 'hello' || (this.beat === 'bikes' && !this.d.cycling())) { this.bikesOut(); const k = this.d.bikes.bikes.get('gift'); if (k && !this.d.cycling()) this.d.mountBike(k); }
      this.setDown(R);
      const p = R.at(RIDE.stop, w1);
      this.d.place(p.x, p.y, R.heading(RIDE.stop) + Math.PI);
      const k = this.d.cycling();
      if (k) { k.pos.copy(this.d.body.pos); k.heading = this.d.body.heading; }
      this.poseGuide(0);
      this.hopOff();
      this.veil = 0;
      this.home();
    }
  }

  /** Dev: on the bench `s` metres along the haul, the long middle behind you. */
  debugHaul(s: number) { this.haul = { s: Math.min(s, this.haulRail().L - HAUL.end - 1), off: 0, cut: true }; this.saveHaul(); this.startHaul(false); }

  /** Dev: straight to a stage, as a save from there has it. */
  debug(s: QuestStage) {
    if (s === 'yoke' || s === 'haul') {
      // The wagon built and loaded, the stelk by it; for `haul`, on the bench already.
      const st = this.d.story;
      st.lent = false;
      st.startBridge();
      st.debugJump('loading');
      st.wagon!.setLoad(99);
      this.startYoke();
      const p = st.wagon!.local(-9, WAG.HL - 1);
      this.d.place(p.x, p.z, st.wagon!.heading);
      if (s === 'haul') this.startHaul(true);
      return;
    }
    this.enter(s);
    if (s === 'shore') { this.stageCrossing(); this.resume(); }
    if (s === 'mill') {
      this.d.story.lent = false;
      this.d.story.startBridge();
      // Where the ride home ends: in the yard, off your bike.
      const R = this.railNow(), p = R.at(RIDE.stop, w1);
      this.d.place(p.x, p.y, R.heading(RIDE.stop) + Math.PI);
      this.spirit.teleport(v1.set(p.x + 1.5, this.d.ground(p.x + 1.5, p.y), p.y));
    }
  }
}
