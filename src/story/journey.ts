import * as THREE from 'three';
import type { Body } from '../player/movement';
import type { Bike, Bikes } from '../vehicles/bikes';
import { SEAT, WHEEL_R } from '../vehicles/bicycle';
import type { Tower } from '../world/towers';
import type { WorldGen } from '../world/worldgen';
import type { Sfx } from './audio';
import type { BeaconEvent, Beacons } from './beacons';
import type { Story } from './story';

// Phase 2: the gift and the first journey (DESIGN.md, Player Sequence).
//
//   gift    After the hearth is lit, the hearth spirit waits in the yard by a
//           bike it has for you, pointing at it. Climb on.
//   ride1   It rides alongside on its own little bike, a few lengths ahead,
//           along the path to the home tower, waiting when you fall behind.
//   lock1   At the tower it hops off and shows you the old lock. Smash it:
//           the tower's spirit comes out and climbs into the head.
//   enter1  It points you into the doorway. Up in the head, the view turns
//           to the next tower, dark on its hill. Come back down...
//   ride2   ...and it's waiting on its bike to lead you there.
//   lock2   The same again at that tower...
//   enter2  ...and from its head, home glows: fly back as an ember.
//   done    It goes back to its fire.
//
// From `ride1` on, the gift bike always turns up again outside the cabin.
// Which stage you're at is saved per seed.

export type Stage = 'wait' | 'gift' | 'ride1' | 'lock1' | 'enter1' | 'ride2' | 'lock2' | 'enter2' | 'done';
export const STAGES: Stage[] = ['wait', 'gift', 'ride1', 'lock1', 'enter1', 'ride2', 'lock2', 'enter2', 'done'];

export interface JourneyDeps {
  gen: WorldGen;
  story: Story;
  bikes: Bikes;
  beacons: Beacons;
  body: Body;
  sfx: Sfx;
  saveKey: string;
  /** The bike you're riding, if any. */
  cycling(): Bike | null;
  /** Stand the explorer at (x, z) facing `heading`, the camera behind. */
  place(x: number, z: number, heading: number): void;
  /** Climb onto a bike (dev jumps). */
  mount(k: Bike): void;
}

/** The spirit's bike is this small, and rides this far to the right of the path (m). */
const LITTLE = 0.55, BESIDE = 1.5;
/** How far ahead of you it likes to ride, and how far before it stops to wait (m). */
const AHEAD = 10, WAIT_AT = 24;

/** Rides the spirit's bike along a path, keeping a little ahead of you. */
class Leader {
  readonly pts: THREE.Vector3[];
  private cum: number[] = [0];
  readonly L: number;
  s: number;
  v = 0;
  heading = 0;
  private sp = 0;
  waitT = 0;

  constructor(line: [number, number][], gen: WorldGen, start = 0) {
    this.pts = line.map(([x, z]) => new THREE.Vector3(x, gen.height(x, z), z));
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.L = this.cum[this.cum.length - 1];
    this.s = start;
    this.heading = this.dirAt(start);
  }

  /** The point at arc length s (and the tangent's heading). */
  at(s: number, out = new THREE.Vector3()) {
    s = THREE.MathUtils.clamp(s, 0, this.L);
    let i = 0;
    while (i < this.cum.length - 2 && this.cum[i + 1] < s) i++;
    const k = (s - this.cum[i]) / Math.max(1e-6, this.cum[i + 1] - this.cum[i]);
    return out.lerpVectors(this.pts[i], this.pts[i + 1], k);
  }

  dirAt(s: number) {
    const a = this.at(s - 3), b = this.at(s + 3);
    return Math.atan2(b.x - a.x, b.z - a.z);
  }

  /** Arc length of the nearest point on the path to p (searched near the last answer). */
  project(p: THREE.Vector3): { s: number; off: number } {
    let best = this.sp, bd = Infinity;
    for (let i = 0; i + 1 < this.pts.length; i++) {
      const a = this.pts[i], b = this.pts[i + 1];
      const vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz || 1;
      const t = THREE.MathUtils.clamp(((p.x - a.x) * vx + (p.z - a.z) * vz) / l2, 0, 1);
      const d = Math.hypot(p.x - a.x - vx * t, p.z - a.z - vz * t);
      if (d < bd) { bd = d; best = this.cum[i] + t * Math.sqrt(l2); }
    }
    this.sp = best;
    return { s: best, off: bd };
  }

  /** One frame: returns true at the end of the path. */
  update(dt: number, player: THREE.Vector3, playerSpeed: number, hold = false): boolean {
    const { s: ps, off } = this.project(player);
    const ahead = this.s - ps;
    // Wait for you if you're well behind or off the path; else keep ~AHEAD m in front.
    let want = hold || off > 40 || ahead > WAIT_AT ? 0 : THREE.MathUtils.clamp(playerSpeed * 1.05 + (AHEAD - ahead) * 0.45, 0, 11);
    if (this.L - this.s < 12) want = Math.min(want, Math.max(1.2, (this.L - this.s) * 0.5));
    this.waitT = want < 0.2 && this.v < 0.3 ? this.waitT + dt : 0;
    this.v += THREE.MathUtils.clamp(want - this.v, -5 * dt, 3 * dt);
    this.s = Math.min(this.L, this.s + this.v * dt);
    const h = this.dirAt(this.s);
    this.heading += Math.atan2(Math.sin(h - this.heading), Math.cos(h - this.heading)) * (1 - Math.exp(-4 * dt));
    return this.s >= this.L - 0.5;
  }
}

export class Journey {
  stage: Stage = 'wait';
  private t = 0;
  private leader: Leader | null = null;
  private sBike: Bike | null = null;
  private turn = 0;
  private callT = 0;
  private tmp = new THREE.Vector3();

  constructor(private d: JourneyDeps) {
    this.load();
    d.beacons.onEvent = (e, t) => this.event(e, t);
  }

  private get home(): Tower { return this.d.gen.towers.home; }
  private get next(): Tower { return this.d.gen.towers.towers[this.d.gen.journey.next]; }
  private get spirit() { return this.d.story.spirit; }

  /** Where the gift bike stands outside the cabin, and which way. */
  private giftSpot(): { x: number; z: number; heading: number } {
    const st = this.d.gen.story;
    const [yx, yz] = this.d.gen.journey.toHome[0];
    // Beside the start of the path out, pointing along it.
    const [nx, nz] = this.d.gen.journey.toHome[Math.min(2, this.d.gen.journey.toHome.length - 1)];
    const h = Math.atan2(nx - yx, nz - yz);
    return { x: yx + Math.cos(h) * 2.2 - (yx - st.x) * 0.05, z: yz - Math.sin(h) * 2.2 - (yz - st.z) * 0.05, heading: h };
  }

  private gift(): Bike {
    let k = this.d.bikes.bikes.get('gift');
    if (!k) {
      const g = this.giftSpot();
      k = this.d.bikes.place('gift', g.x, g.z, g.heading, 0);
    }
    return k;
  }

  private setStage(s: Stage) {
    if (s === this.stage) return;
    this.stage = s;
    this.t = 0;
    this.save();
  }

  // ------------------------------------------------------------ events from the towers

  private event(e: BeaconEvent, t: Tower) {
    const target = this.stage === 'lock1' || this.stage === 'enter1' ? this.home : this.stage === 'lock2' || this.stage === 'enter2' ? this.next : null;
    if (!target || t.id !== target.id) {
      if (e === 'arrived' && this.stage === 'enter2') this.setStage('done');
      return;
    }
    if (e === 'opened') this.spirit.celebrate();
    if (e === 'lit' && (this.stage === 'lock1' || this.stage === 'lock2')) { this.spirit.celebrate(); this.setStage(this.stage === 'lock1' ? 'enter1' : 'enter2'); }
    // Up in the head: the view turns to where you go next.
    if (e === 'inHead') this.d.beacons.guide(this.stage === 'enter1' ? this.next.id : this.home.id);
    if (e === 'outHead' && this.stage === 'enter1') this.startRide2();
    if (e === 'outHead' && this.stage === 'enter2') this.setStage('done');
  }

  // ------------------------------------------------------------ frame

  update(dt: number) {
    const story = this.d.story;
    this.t += dt;
    if (this.stage === 'wait') {
      // The hearth is lit and the house has settled: a few moments later, the gift.
      if (story.done && story.step.id === 'home') { if (this.t > 5) this.startGift(); }
      else this.t = 0;
      return;
    }
    if (this.stage !== 'done') {
      story.lent = true;
      this.spirit.home = null;
    }
    const b = this.d.body;
    const riding = this.d.cycling();
    // From the first ride on, your bike always turns up again outside the cabin.
    if (this.stage !== 'gift') {
      const k = this.gift();
      const g = this.giftSpot();
      if (!k.ridden && Math.hypot(k.pos.x - b.pos.x, k.pos.z - b.pos.z) > 220 && Math.hypot(k.pos.x - g.x, k.pos.z - g.z) > 20 && Math.hypot(g.x - b.pos.x, g.z - b.pos.z) > 120) this.d.bikes.move(k, g.x, g.z, g.heading);
    }
    switch (this.stage) {
      case 'gift': {
        const k = this.gift();
        // It waits beside the bike and points at it.
        const at = k.pos.clone().add(new THREE.Vector3(Math.cos(k.heading), 0, -Math.sin(k.heading)).multiplyScalar(-1.6));
        at.y = this.d.gen.height(at.x, at.z);
        this.want(at, k.pos, 'point', 'bike');
        // Its own little bike stands ready just along the path.
        if (!this.sBike) this.parkAtPath(this.d.gen.journey.toHome, 7);
        if (riding === k) {
          this.spirit.celebrate();
          this.setStage('ride1');
        }
        break;
      }
      case 'ride1':
      case 'ride2': {
        const line = this.stage === 'ride1' ? this.d.gen.journey.toHome : this.d.gen.journey.toNext;
        if (!this.leader) {
          // Off its bike: it goes and gets on (showing you to), then waits
          // for you to get on yours.
          if (this.board(dt, line)) { this.parkSpiritBike(dt); break; }
        }
        const v = b.vel;
        const L = this.leader!;
        // Holding on the start line until you're on your bike (or set off on foot).
        if (this.holding && (riding || L.project(b.pos).s > L.s + 3 || this.t > 40)) this.holding = false;
        const done = this.holding ? (L.update(dt, b.pos, 0, true), false) : L.update(dt, b.pos, Math.hypot(v.x, v.z));
        this.poseRide(dt, b.pos);
        this.want(this.spirit.pos.clone(), b.pos, 'stand', this.holding ? 'bike' : null);
        if (done) {
          this.hopOff();
          this.setStage(this.stage === 'ride1' ? 'lock1' : 'lock2');
        }
        break;
      }
      case 'lock1':
      case 'lock2': {
        const t = this.stage === 'lock1' ? this.home : this.next;
        // Already lit (and not being lit right now): on to going in.
        if (this.d.beacons.isLit(t.id) && !this.d.beacons.busy) { this.setStage(this.stage === 'lock1' ? 'enter1' : 'enter2'); break; }
        // Beside the doorway, pointing at the lock.
        this.want(this.besideDoor(t, 3.2), this.lockAt(t), 'point', 'pick');
        break;
      }
      case 'enter1':
      case 'enter2': {
        const t = this.stage === 'enter1' ? this.home : this.next;
        if (this.d.beacons.busy && !this.d.beacons.inside) break; // the tower's spirit is still climbing
        this.want(this.besideDoor(t, 3.6), new THREE.Vector3(t.door.x, t.door.y, t.door.z), 'point', 'up');
        break;
      }
      case 'done': {
        // Back to its fire once you're well away (or home already).
        if (story.lent) {
          const far = this.spirit.pos.distanceTo(b.pos) > 90;
          if (far) this.goHome();
          else this.want(this.spirit.pos.clone(), b.pos, 'stand', null);
        }
        break;
      }
    }
    if (this.sBike && this.stage !== 'ride1' && this.stage !== 'ride2') this.parkSpiritBike(dt);
  }

  private want(at: THREE.Vector3, face: THREE.Vector3 | null, pose: 'point' | 'stand', icon: 'bike' | 'pick' | 'up' | null) {
    const sp = this.spirit;
    // Far off (you took another way, or flew): it catches up out of sight.
    if (sp.pos.distanceTo(at) > 60 && sp.pos.distanceTo(this.d.body.pos) > 40) sp.teleport(at);
    const w = sp.want;
    if (w.at.distanceTo(at) > 0.5 || w.icon !== icon || w.pose !== pose) sp.want = { at, face, pose, icon, lead: false };
    else w.face = face;
  }

  /** A spot beside tower t's doorway (to your right as you face it), `out` m out from the rock. */
  private besideDoor(t: Tower, side: number) {
    const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
    const g = t.door.ground;
    const p = new THREE.Vector3(g.x + fz * side + fx * 1.2, 0, g.z - fx * side + fz * 1.2);
    p.y = this.d.gen.height(p.x, p.z);
    return p;
  }

  private lockAt(t: Tower) {
    const g = t.door.ground;
    return new THREE.Vector3(g.x, g.y + 1.4, g.z);
  }

  // ------------------------------------------------------------ riding

  private startGift() {
    this.gift();
    this.setStage('gift');
    this.d.story.lent = true;
  }

  /** Stand the spirit's bike beside the path, `s` m along it, pointing along it. */
  private parkAtPath(line: [number, number][], s: number) {
    const L = new Leader(line, this.d.gen, s);
    const p = L.at(s), h = L.heading;
    const x = p.x + Math.cos(h) * BESIDE, z = p.z - Math.sin(h) * BESIDE;
    if (!this.sBike) this.sBike = this.d.bikes.place('spirit', x, z, h, 2, LITTLE);
    else this.d.bikes.move(this.sBike, x, z, h);
    this.sBike.scale = LITTLE;
    // Its own: never one you can climb on (and posed by us, not the bike stand).
    this.sBike.ridden = true;
  }

  /** Waiting on its bike at the start for you to get on yours. */
  private holding = false;
  private boardT = 0;
  /** Where the bike was when it got on (eased onto the riding line from there). */
  private bikeFrom = new THREE.Vector3();
  private bikeBlend = 1;

  /**
   * Off the bike at the start of a ride: a hello (after the tower), walk to
   * the bike, climb on. Returns true while that's still going on.
   */
  private board(dt: number, line: [number, number][]): boolean {
    if (!this.sBike) this.parkAtPath(line, 6);
    const k = this.sBike!;
    this.boardT += dt;
    if (this.boardT < 0.05 && this.stage === 'ride2') this.spirit.greet();
    if (this.spirit.busy) return true;
    // To the bike's left, where you climb on.
    const at = k.pos.clone().add(new THREE.Vector3(Math.cos(k.heading), 0, -Math.sin(k.heading)).multiplyScalar(-0.7));
    at.y = this.d.gen.height(at.x, at.z);
    this.want(at, k.pos, 'stand', null);
    if (this.spirit.pos.distanceTo(at) > 0.8 && this.boardT < 12) return true;
    // On it.
    const L = new Leader(line, this.d.gen, 0);
    L.s = L.project(k.pos).s;
    L.heading = k.heading;
    this.leader = L;
    this.bikeFrom.copy(k.pos);
    this.bikeBlend = 0;
    k.ridden = true;
    this.holding = true;
    this.boardT = 0;
    this.d.sfx.chirp(true);
    this.poseRide(0, this.d.body.pos);
    return false;
  }

  private startRide2() {
    this.setStage('ride2');
    this.leader = null;
    this.boardT = 0;
    this.spirit.want = { at: this.spirit.pos.clone(), face: this.d.body.pos.clone(), pose: 'stand', icon: null, lead: false };
  }

  /** The little bike and its rider, from the leader's place on the path. */
  private poseRide(dt: number, player: THREE.Vector3) {
    const L = this.leader!, k = this.sBike!;
    const h = L.heading;
    const p = L.at(L.s);
    const rx = Math.cos(h), rz = -Math.sin(h);
    let x = p.x + rx * BESIDE, z = p.z + rz * BESIDE;
    if (this.bikeBlend < 1) {
      this.bikeBlend = Math.min(1, this.bikeBlend + dt / 1.2);
      const e = THREE.MathUtils.smootherstep(this.bikeBlend, 0, 1);
      x = THREE.MathUtils.lerp(this.bikeFrom.x, x, e);
      z = THREE.MathUtils.lerp(this.bikeFrom.z, z, e);
    }
    const moved = Math.hypot(x - k.pos.x, z - k.pos.z);
    k.pos.set(x, this.d.gen.height(x, z), z);
    const dh = Math.atan2(Math.sin(h - k.heading), Math.cos(h - k.heading));
    this.turn += ((dt > 0 ? dh / dt : 0) - this.turn) * (1 - Math.exp(-6 * dt));
    k.heading = h;
    k.roll += moved / (WHEEL_R * LITTLE);
    k.crank += moved / (WHEEL_R * LITTLE) * 0.55;
    k.steer = THREE.MathUtils.clamp(this.turn * 0.3, -0.5, 0.5);
    k.lean = THREE.MathUtils.clamp(-this.turn * L.v * 0.06, -0.35, 0.35) + (L.v < 0.4 ? 0.12 : 0);
    const f = (WHEEL_R * 1.6) * LITTLE;
    const hf = this.d.gen.height(x + Math.sin(h) * f, z + Math.cos(h) * f), hr = this.d.gen.height(x - Math.sin(h) * f, z - Math.cos(h) * f);
    k.pitch = Math.atan2(hf - hr, 2 * f);
    k.stand = 0;
    k.skel.pose(k);
    const seat = k.skel.toWorld(SEAT.x, SEAT.y + 0.05, SEAT.z + 0.05, this.tmp.clone());
    // Waiting for you: it looks back round; riding, it watches the way.
    const look = L.waitT > 0.6 || this.holding ? player.clone() : null;
    this.spirit.riding = { seat, heading: h, look };
    if (L.waitT > 1.5) {
      this.callT -= dt;
      if (this.callT <= 0) { this.callT = 3.5; this.d.sfx.chirp(false); }
    }
  }

  /** At the end of a ride: off the bike and onto its feet beside it. */
  private hopOff() {
    const k = this.sBike;
    this.spirit.riding = null;
    if (k) {
      const p = k.pos.clone().add(new THREE.Vector3(Math.cos(k.heading), 0, -Math.sin(k.heading)).multiplyScalar(-0.9));
      p.y = this.d.gen.height(p.x, p.z);
      this.spirit.teleport(p);
    }
    this.leader = null;
  }

  /** The spirit's bike standing on its kickstand while it's off it. */
  private parkSpiritBike(dt: number) {
    const k = this.sBike!;
    k.stand += (1 - k.stand) * (1 - Math.exp(-6 * dt));
    k.lean += (0.2 - k.lean) * (1 - Math.exp(-5 * dt));
    k.steer += (0.25 - k.steer) * (1 - Math.exp(-3 * dt));
    k.skel.pose(k);
  }

  private goHome() {
    const story = this.d.story;
    this.spirit.riding = null;
    story.lent = false;
    this.spirit.home = new THREE.Vector3(this.d.gen.story.x, 0, this.d.gen.story.z);
    const seat = story.anchor('hearthSeat').clone();
    this.spirit.teleport(seat);
    this.spirit.want = { at: seat, face: story.anchor('hearth'), pose: 'sit', icon: null, lead: false, settled: true };
    if (this.sBike) { this.d.bikes.bikes.delete('spirit'); this.sBike = null; }
  }

  // ------------------------------------------------------------ dev jumps

  /** Jump straight to a stage (the panel, ?journey=): finishes phase 1 and sets the world up for it. */
  jump(s: Stage) {
    const story = this.d.story, bz = this.d.beacons;
    if (!story.done) { story.debugJump('home'); story.done = true; }
    const idx = STAGES.indexOf(s);
    bz.setLit(this.home.id, idx > STAGES.indexOf('lock1'));
    bz.setLit(this.next.id, idx > STAGES.indexOf('lock2'));
    this.leader = null;
    this.spirit.riding = null;
    if (this.sBike) { this.d.bikes.bikes.delete('spirit'); this.sBike = null; }
    this.stage = s;
    this.t = 0;
    const j = this.d.gen.journey;
    const front = (t: Tower, d: number) => [t.door.ground.x + Math.sin(t.yaw) * d, t.door.ground.z + Math.cos(t.yaw) * d] as const;
    const gift = this.gift();
    if (s === 'wait' || s === 'gift') {
      const g = this.giftSpot();
      this.d.bikes.move(gift, g.x, g.z, g.heading);
      this.d.place(g.x + Math.sin(g.heading) * -5, g.z + Math.cos(g.heading) * -5, g.heading);
      if (s === 'gift') this.startGift();
    } else if (s === 'ride1') {
      const [x, z] = j.toHome[0];
      this.d.bikes.move(gift, x, z, Math.atan2(j.toHome[1][0] - x, j.toHome[1][1] - z));
      this.d.place(x, z, gift.heading);
      this.d.mount(gift);
    } else if (s === 'ride2') {
      const [x, z] = front(this.home, 4);
      this.d.bikes.move(gift, x + 2, z, this.home.yaw);
      this.d.place(x, z, this.home.yaw);
      this.d.mount(gift);
    } else {
      const t = s === 'lock1' || s === 'enter1' ? this.home : this.next;
      const [x, z] = front(t, 7);
      this.d.bikes.move(gift, x + Math.cos(t.yaw) * 3, z - Math.sin(t.yaw) * 3, t.yaw + Math.PI);
      this.d.place(x, z, t.yaw + Math.PI);
      this.spirit.teleport(this.besideDoor(t, 3.2));
      if (s === 'done') this.goHome();
    }
    this.save();
  }

  // ------------------------------------------------------------ save

  private key() { return `fjellheim.journey.${this.d.saveKey}`; }
  private save() { try { localStorage.setItem(this.key(), this.stage); } catch { /* private mode */ } }
  private load() {
    try {
      const s = localStorage.getItem(this.key()) as Stage | null;
      if (s && STAGES.includes(s)) {
        // Mid-ride, pick up again from the start of that ride.
        this.stage = s;
      }
    } catch { /* ignore */ }
  }
  reset() { try { localStorage.removeItem(this.key()); } catch { /* ignore */ } this.stage = 'wait'; }
}
