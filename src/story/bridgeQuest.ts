import * as THREE from 'three';
import type { Giant } from '../giant/giant';
import type { Footfall } from '../giant/visit';
import type { Body } from '../player/movement';
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

export type QuestStage = 'wait' | 'cross' | 'shore' | 'ride' | 'mill';
const STAGES: QuestStage[] = ['wait', 'cross', 'shore', 'ride', 'mill'];

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
}

/** The veil: how long it takes to come up or go, the least it holds, and the longest it waits for the land (s). */
const VEIL = { fade: 0.55, hold: 0.45, most: 20 };
/** The guide's little bike, how far to your right it rides (m), and how near you come before it gets the bikes out (m). */
const LITTLE = 0.55, BESIDE = 1.7, AHEAD = 0.4, MEET = 5;
/** The ride home: how far up the trail you ride off (s), where in from the village you're set down after the veil (m along the rail), and where you stop (m). */
const RIDE = { off: 4.6, from: 58, stop: 11 };

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
  private turnK = 0;

  constructor(private d: QuestDeps) {
    this.load();
  }

  private get spirit() { return this.d.story.spirit; }
  /** A cutscene has the camera and your hands. */
  get busy() { return this.stage === 'cross' || this.stage === 'ride'; }
  /** The guide is the quest's (the story and the journey leave it be). */
  get holds() { return this.stage === 'cross' || this.stage === 'shore' || this.stage === 'ride'; }
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
  }

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
      case 'mill': if (this.d.story.phaseIndex < 2) this.d.story.startBridge(); break;
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

  // ------------------------------------------------------------ for main

  /** The camera while a cutscene has it. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3; fov: number } | null {
    if (this.stage === 'cross' && this.beat !== 'in' && this.beat !== 'back') return { pos: this.pos, at: this.at, fov: this.fov };
    if (this.stage === 'ride') return { pos: this.pos, at: this.at, fov: this.fov };
    return null;
  }

  /** Where the pointer points (the guide at the shore, from far off). */
  guide(): Guide | null {
    if (this.stage === 'shore') return { at: this.spirit.pos, near: 30 };
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

  /** Dev: straight to a stage, as a save from there has it. */
  debug(s: QuestStage) {
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
