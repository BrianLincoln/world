import * as THREE from 'three';
import type { Body } from '../player/movement';
import type { Bike, Bikes } from '../vehicles/bikes';
import { SEAT, WHEEL_R } from '../vehicles/bicycle';
import type { Tower } from '../world/towers';
import type { WorldGen } from '../world/worldgen';
import type { Print } from '../world/prints';
import type { Sfx } from './audio';
import type { BeaconEvent, Beacons } from './beacons';
import type { Guide, Story } from './story';
import { PAT } from './spirit';
import { makeSolidMaterial } from '../gfx/materials';
import { Puffs } from '../gfx/puffs';

// Phase 2: the gift and the first journey (DESIGN.md, Player Sequence).
//
//   gift    After the hearth is lit, the hearth spirit waits in the yard by a
//           bike it has for you, pointing at it. Climb on.
//   ride1   It rides alongside on its own little bike, a few lengths ahead,
//           along the path to the home tower, waiting when you fall behind.
//   lock1   At the tower it hops off and shows you the old lock. Smash it:
//           the tower's spirit comes out and climbs into the head.
//   enter1  It points you into the doorway. Up in the head, the giant comes
//           (giant/visit.ts). Come back down...
//   trudge  ...and it turns for home on foot, its bike forgotten at the
//           tower: back down the path, slowly, eyes on the ground, without
//           a stop. It doesn't lead you or wait for you.
//   grieve  In the village it keeps to itself for a while, going from one
//           wrecked house to the next, standing or sitting by each. A pat,
//           or your company while it sits by its fire, brings it round
//           sooner.
//   done    Once that's passed and you're in the village, phase 3 (the
//           stable, see phase3.ts) begins. Not before, and it doesn't call
//           you home for it.
//
// The send-off (sendOff(), within `done`): once a creature lives at the
// stable and you're at home (the village, or the pasture where you've just
// brought it in), the spirit comes over to you and walks you (waving you on, the `prints`
// bubble up all the way) to
// the edge of the village, to the rim of the giant's first print beyond the
// houses, and stands there hopping and pointing down the trail, its face set:
// go that way, bring them back. It stays there. When you're well on your
// way it goes home; if you come back without having found the ring (or just
// wander back to the yard and leave it pointing), it takes you out and
// points again.
//
// (ride2, lock2 and enter2 were a second guided ride to the next tower; the
// giant's trail goes that way instead. Old saves can still be in them.)
//
// From `ride1` on, the gift bike always turns up again outside the cabin.
// Which stage you're at is saved per seed, and is the checkpoint a reload
// resumes from (resume()).

export type Stage = 'wait' | 'gift' | 'ride1' | 'lock1' | 'enter1' | 'ride2' | 'lock2' | 'enter2' | 'trudge' | 'grieve' | 'done';
export const STAGES: Stage[] = ['wait', 'gift', 'ride1', 'lock1', 'enter1', 'ride2', 'lock2', 'enter2', 'trudge', 'grieve', 'done'];

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
  /** The giant's prints, in the order it made them. */
  prints(): Print[];
}

/** Coming within this of the cabin (m) settles which bike stands there (past bike draw range). */
const CABIN_R = 340;
/** The spirit's bike is this small, and rides this far to the right of the path (m). */
const LITTLE = 0.55, BESIDE = 1.5;
/** How far ahead of you it likes to ride, and how far before it stops to wait (m). */
const AHEAD = 10, WAIT_AT = 24;
/** Seconds at a stage without progress before the spirit comes and tugs your coat (as at home), and within what distance (m). */
const HINT_AFTER = 20, HINT_NEAR = 40;
/** The walk home after the giant: its pace (m/s), and how far from you it has to be to make up ground unseen (from, to full speed; m). */
const TRUDGE = 2.4, UNSEEN = [95, 130] as const, UNSEEN_PACE = 14;
/** Its pace from house to house in the village afterwards (m/s). */
const MOPE = 1.8;
/** How long after the giant it keeps to itself before it has anything to ask of you (s, from setting off home: a long walk back isn't followed by a long wait). */
const GRIEVE = 75;
/** ...but always at least this long in the village itself (s). */
const GRIEVE_MIN = 20;
/** Keeping it company brings it round sooner: this close to it while it sits by its fire (m), for this long (s). */
const COMPANY_R = 3, COMPANY = 6;
/** The send-off: seconds at home with the creature in before it starts. */
const SEND_AFTER = 6;
/** The village ends this far from the lane and the cabin (m): the first print past that is where it points from. */
const TOWN_EDGE = 55;
/** This far from it and out of the village (m), you're on your way: it goes home. Within this of the ring (m), you've found it. */
const SENT = 90, RING_FOUND = 70;
/** You're "in the village" within this of the cabin or of the lane (m). */
const VILLAGE_R = 32;
/** ...and "at home" there or within this of the pasture fence (m): the stable stands well out from the yard. */
const PASTURE_R = 16;
/** Left standing at the trail's edge with you back at home for this long (s), it comes and gets you. */
const SEND_LEFT = 8;
/** It sets off with you from within this of you (m). */
const SEND_NEAR = 7;

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
    // Its top speed rises with yours, so however fast you come it pulls away.
    const top = Math.max(11, playerSpeed * 1.3 + 4);
    const lead = !hold && off <= 40;
    let want = !lead || ahead > WAIT_AT ? 0 : THREE.MathUtils.clamp(playerSpeed * 1.05 + (AHEAD - ahead) * 0.45, 0, top);
    if (this.L - this.s < 12) want = Math.min(want, Math.max(1.2, (this.L - this.s) * 0.5));
    this.waitT = want < 0.2 && this.v < 0.3 ? this.waitT + dt : 0;
    // Pedal harder the closer you're catching up (and the faster you're going).
    const accel = 3 + Math.max(0, AHEAD - ahead) * 1.5 + playerSpeed * 0.4;
    this.v += THREE.MathUtils.clamp(want - this.v, -5 * dt, accel * dt);
    this.s = Math.min(this.L, this.s + this.v * dt);
    // Never let you pass: it stays at least a couple of metres in front.
    if (lead && this.s < ps + 2) { this.s = Math.min(this.L, ps + 2); this.v = Math.max(this.v, playerSpeed); }
    const h = this.dirAt(this.s);
    this.heading += Math.atan2(Math.sin(h - this.heading), Math.cos(h - this.heading)) * (1 - Math.exp(-4 * dt));
    return this.s >= this.L - 0.5;
  }
}

/**
 * The hearth spirit pulling a bike out of its glowing heart: a spark rises
 * out of its chest, swells into a ball of light, arcs over to where the bike
 * will stand and bursts, and the bike spins up out of the light to full size.
 */
interface Conjure { bike: Bike; t: number; to: THREE.Vector3; heading: number; size: number }
const CONJURE = 2.7;
/** The gift shot: the camera settles on the spirit this long before it conjures, and holds on the bike this long after (s). */
const SHOT_LEAD = 1.2, SHOT_HOLD = 1.6;

export class Journey {
  /** Its sparkles and the ball of light (add to the scene). */
  readonly group = new THREE.Group();
  private sparks = new Puffs('#ffe7a0', 50, 0.8, 0.9);
  private ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), makeSolidMaterial('#ffcf73', 0.8));
  private conj: Conjure | null = null;
  /** Seconds into the gift shot (the camera on the spirit and the bike); < 0 = not running. */
  private shot = -1;
  stage: Stage = 'wait';
  private t = 0;
  private leader: Leader | null = null;
  private sBike: Bike | null = null;
  /** You were within CABIN_R of the cabin last frame. */
  private atCabin = false;
  private turn = 0;
  private callT = 0;
  private hintT = 0;
  /** The walk home: the path back, and how far along it the spirit is heading. */
  private back: Leader | null = null;
  private backS = -1;
  /** Keeping to itself: how long at this spot, how long it's been, how long getting there. */
  private mope = { stay: 0, t: 0, go: 0, last: -1 };
  private low = false;
  /** Seconds since it set off home after the giant. */
  private grief = 0;
  /** Seconds you've kept it company by its fire; and whether a pat or that has brought it round. */
  private beside = 0;
  private comforted = false;
  /** The send-off: where it's at, its clock, and whether you've been away since it last sent you. */
  private send: 'idle' | 'come' | 'lead' | 'sent' = 'idle';
  private sendT = 0;
  private away = false;
  private leftT = 0;
  /** You've been to the ring (saved): nothing more to point at. */
  private found = false;
  private edge: { n: number; at: THREE.Vector3; on: THREE.Vector3 } | null = null;
  private tmp = new THREE.Vector3();

  constructor(private d: JourneyDeps) {
    this.ball.visible = false;
    this.ball.frustumCulled = false;
    this.group.add(this.sparks.group, this.ball);
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
    this.hintT = 0;
    if (s === 'trudge') this.clearGrief();
    this.save();
  }

  private clearGrief() { this.grief = this.beside = 0; this.comforted = false; }

  // ------------------------------------------------------------ events from the towers

  private event(e: BeaconEvent, t: Tower) {
    if (e === 'arrived') this.towerBike(t);
    this.hintT = 0;
    const target = this.stage === 'lock1' || this.stage === 'enter1' ? this.home : this.stage === 'lock2' || this.stage === 'enter2' ? this.next : null;
    if (!target || t.id !== target.id) {
      if (e === 'arrived' && this.stage === 'enter2') this.setStage('done');
      return;
    }
    if (e === 'opened') this.spirit.celebrate();
    if (e === 'lit' && (this.stage === 'lock1' || this.stage === 'lock2')) { this.spirit.celebrate(); this.setStage(this.stage === 'lock1' ? 'enter1' : 'enter2'); }
    // Up in the head of the second tower (old saves): the view turns home.
    if (e === 'inHead' && this.stage === 'enter2') this.d.beacons.guide(this.home.id);
    // Up in the home tower's head for the first time is where the giant comes (main.ts starts giant/visit.ts).
    // Down again, the guided part is over: the world is open, and the spirit sets off home on foot.
    if (e === 'outHead' && this.stage === 'enter1') this.setStage('trudge');
    if (e === 'outHead' && this.stage === 'enter2') this.setStage('done');
  }

  // ------------------------------------------------------------ frame

  update(dt: number) {
    const story = this.d.story;
    this.t += dt;
    this.sparks.update(dt);
    this.updateConjure(dt);
    if (this.shot >= 0) this.shot = this.stage === 'gift' && this.shot < SHOT_LEAD + CONJURE + SHOT_HOLD ? this.shot + dt : -1;
    // A saved journey never outlives the story it belongs to (a fresh start).
    if (!story.done && this.stage !== 'wait') {
      this.stage = 'wait';
      this.save();
      this.d.bikes.bikes.delete('gift');
      this.d.bikes.bikes.delete('spirit');
      this.sBike = null;
      this.leader = null;
      this.spirit.riding = null;
      story.lent = false;
    }
    const low = this.stage === 'trudge' || this.stage === 'grieve';
    this.spirit.sullen = low;
    if (this.low && !low) this.spirit.haste = null;
    this.low = low;
    this.tidyCabin();
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
    switch (this.stage) {
      case 'gift': {
        const g = this.giftSpot();
        // It comes out to the yard beside where the bike will stand...
        const at = new THREE.Vector3(g.x - Math.cos(g.heading) * 1.6, 0, g.z + Math.sin(g.heading) * 1.6);
        at.y = this.d.gen.height(at.x, at.z);
        const k = this.d.bikes.bikes.get('gift');
        if (!k) {
          this.want(at, b.pos, 'stand', null);
          // ...and once you're out in the yard with it (never through a
          // wall or from the sky), takes the camera and, once it's looking,
          // pulls the bike out of its heart.
          if (this.shot < 0) {
            const outside = !this.d.story.cabin.inside(b.pos.x, b.pos.z, -0.6) && this.d.body.grounded;
            const near = b.pos.distanceTo(at) < 16 || (this.t > 25 && b.pos.distanceTo(at) < 40);
            if (this.spirit.arrived && outside && near) this.shot = 0;
          } else if (!this.conj && this.shot >= SHOT_LEAD) {
            const nk = this.d.bikes.place('gift', g.x, g.z, g.heading, 0);
            this.conjure(nk, 1);
          }
          break;
        }
        if (this.conj) break;
        // Then it points at it: yours.
        this.want(at, k.pos, 'point', 'bike');
        this.nudge(dt, at, k.pos);
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
        this.nudge(dt, this.besideDoor(t, 3.2), this.lockAt(t));
        break;
      }
      case 'enter1':
      case 'enter2': {
        const t = this.stage === 'enter1' ? this.home : this.next;
        if (this.d.beacons.busy && !this.d.beacons.inside) break; // the tower's spirit is still climbing
        // Right at the side of the doorway, ushering you in.
        const d = new THREE.Vector3(t.door.x, t.door.y, t.door.z);
        this.want(this.byDoorway(t), d, 'point', 'up', d);
        break;
      }
      case 'trudge': {
        const sp = this.spirit;
        this.grief += dt;
        const L = (this.back ??= new Leader(this.d.gen.journey.toHome, this.d.gen));
        const s = L.project(sp.pos).s;
        // In the yard: home.
        if (s < 4) { this.back = null; this.backS = -1; this.setStage('grieve'); break; }
        // Out of your sight it makes up ground, so it's never far behind you; where you can see it, it trudges.
        sp.haste = THREE.MathUtils.lerp(TRUDGE, UNSEEN_PACE, THREE.MathUtils.smoothstep(sp.pos.distanceTo(b.pos), UNSEEN[0], UNSEEN[1]));
        // Down the path a stretch at a time.
        // (Its goal is always well ahead of it, so it never slows for one.)
        if (this.backS < 0 || Math.hypot(sp.want.at.x - sp.pos.x, sp.want.at.z - sp.pos.z) < 6) {
          this.backS = Math.max(0, s - 14);
          sp.want = { at: L.at(this.backS), face: null, pose: 'stand', icon: null, lead: false, settled: true };
        }
        break;
      }
      case 'grieve': {
        const sp = this.spirit;
        sp.haste = MOPE;
        this.grief += dt;
        this.keepToItself(dt);
        // A pat, or sitting a while with it at its fire, and it comes round sooner.
        if (sp.patTime >= PAT.joy) this.comforted = true;
        const fire = sp.want.pose === 'sit' && sp.arrived && sp.want.at.distanceTo(story.anchor('hearthSeat')) < 0.1;
        this.beside = fire && sp.pos.distanceTo(b.pos) < COMPANY_R ? this.beside + dt : 0;
        if (this.beside > COMPANY) this.comforted = true;
        // A while on (or comforted), and you're here: it has something to ask of you again.
        if (((this.grief > GRIEVE && this.t > GRIEVE_MIN) || this.comforted) && this.inVillage(b.pos) && b.grounded && !sp.busy) {
          story.lent = false;
          sp.home = new THREE.Vector3(this.d.gen.story.x, 0, this.d.gen.story.z);
          sp.sullen = false;
          sp.haste = null;
          sp.want = { at: sp.pos.clone(), face: story.anchor('hearth'), pose: 'stand', icon: null, lead: false, settled: true };
          this.setStage('done');
          story.startStable();
        }
        break;
      }
      case 'done': {
        if (this.sendOff(dt)) break;
        // Back to its fire once you're well away (or home already).
        if (story.lent) {
          const far = this.spirit.pos.distanceTo(b.pos) > 90;
          if (far) this.goHome();
          else this.want(this.spirit.pos.clone(), b.pos, 'stand', null);
        } else if (story.stableReady && this.inVillage(b.pos) && b.grounded) {
          // (An older save, already past all this.) Home again: the stable (phase 3).
          story.startStable();
        }
        break;
      }
    }
    if (this.sBike && this.stage !== 'ride1' && this.stage !== 'ride2') this.parkSpiritBike(dt);
  }

  /** How far p is from the village (the cabin and the lane), m. */
  private fromVillage(x: number, z: number) {
    const st = this.d.gen.story;
    let d = Math.hypot(x - st.x, z - st.z);
    for (const q of st.village?.lane ?? []) d = Math.min(d, Math.hypot(x - q.x, z - q.z));
    return d;
  }

  /**
   * Where the trail leaves the village: on the heel rim of the giant's first
   * print beyond the houses (found from the far end back, since it walked in
   * as well as out), and the print after next to point at.
   */
  private trailEdge() {
    const ps = this.d.prints();
    if (this.edge?.n === ps.length) return this.edge;
    let i = ps.length - 1;
    while (i >= 0 && this.fromVillage(ps[i].x, ps[i].z) > TOWN_EDGE) i--;
    const p = ps[i + 1], q = ps[Math.min(i + 3, ps.length - 1)];
    if (!p || i < 0) return (this.edge = null);
    const at = new THREE.Vector3(p.x - Math.sin(p.heading) * 13.4, 0, p.z - Math.cos(p.heading) * 13.4);
    at.y = this.d.gen.height(at.x, at.z);
    return (this.edge = { n: ps.length, at, on: new THREE.Vector3(q.x, this.d.gen.height(q.x, q.z) + 1, q.z) });
  }

  /** The send-off is over (or broken off): the spirit is the house's again, and walks home. */
  private sendHome() {
    const story = this.d.story, sp = this.spirit;
    if (sp.mood === 'brave') sp.mood = null;
    story.lent = false;
    sp.home = new THREE.Vector3(this.d.gen.story.x, 0, this.d.gen.story.z);
    sp.want = { at: story.anchor('hearthSeat').clone(), face: story.anchor('hearth'), pose: 'sit', icon: null, lead: false, settled: true };
  }

  /**
   * The send-off (see the top of the file). True while the spirit is
   * the journey's (looking, leading, pointing).
   */
  private sendOff(dt: number): boolean {
    const story = this.d.story, sp = this.spirit, b = this.d.body;
    if (!this.found && story.giantGone) {
      const dg = this.d.gen.dungeon;
      if (Math.hypot(b.pos.x - dg.x, b.pos.z - dg.z) < RING_FOUND) { this.found = true; this.save(); }
    }
    const due = !this.found && story.giantGone && story.phase.id === 'stable' && story.step.id === 'ranch';
    const here = this.atHome(b.pos);
    if (!due) {
      if (this.send === 'come' || this.send === 'lead') this.sendHome();
      this.send = 'idle';
      this.sendT = 0;
      return false;
    }
    switch (this.send) {
      case 'idle': {
        // A little while after the creature's in (or after you've come home): now, them.
        this.sendT = here && b.grounded && !sp.busy && !story.busy ? this.sendT + dt : 0;
        if (this.sendT < SEND_AFTER || !this.trailEdge()) return false;
        story.lent = true;
        sp.home = null;
        this.send = 'come';
        this.sendT = 0;
        return true;
      }
      case 'come': {
        // Over to you first, if it isn't with you (it leads from where you are, not from across the yard).
        this.sendT += dt;
        const gap = sp.pos.distanceTo(b.pos);
        if (gap > SEND_NEAR && this.sendT < 25) {
          const to = this.tmp.copy(sp.pos).sub(b.pos).setY(0).setLength(SEND_NEAR - 2).add(b.pos);
          to.y = this.d.gen.height(to.x, to.z);
          if (sp.want.at.distanceTo(to) > 2 || sp.want.settled) sp.want = { at: to.clone(), face: null, pose: 'stand', icon: null, lead: false };
          return true;
        }
        // Straight to it: the grieving's done, there's a job on.
        this.send = 'lead';
        this.hintT = 0;
        this.leftT = 0;
        return true;
      }
      case 'lead': {
        const e = this.trailEdge();
        // Well on your way (or off somewhere else): it goes home.
        const gone = !here && Math.min(sp.pos.distanceTo(b.pos), e ? e.at.distanceTo(b.pos) : Infinity) > SENT;
        if (!e || gone) { this.sendHome(); this.send = 'sent'; this.away = true; return false; }
        sp.mood = 'brave';
        if (sp.want.at.distanceTo(e.at) > 0.5 || sp.want.icon !== 'prints') sp.want = { at: e.at.clone(), face: e.on, pose: 'point', icon: 'prints', lead: true, rally: true };
        if (sp.arrived) this.nudge(dt, e.at, e.on);
        // Pointing at nobody (you've gone back to the yard or the stable): it comes for you and starts over.
        this.leftT = sp.arrived && here && sp.pos.distanceTo(b.pos) > HINT_NEAR ? this.leftT + dt : 0;
        if (this.leftT > SEND_LEFT) { this.sendHome(); this.send = 'idle'; this.sendT = 0; return false; }
        return true;
      }
      case 'sent': {
        // Home again with the ring still unfound: out it goes with you once more.
        if (!here) this.away = true;
        else if (this.away) { this.away = false; this.send = 'idle'; this.sendT = 0; }
        return false;
      }
    }
  }

  /** At home: in the village, or at the stable and its pasture (which is where you are when a creature comes in). */
  private atHome(p: THREE.Vector3) {
    return this.inVillage(p) || !!this.d.story.stable?.inside(p.x, p.z, -PASTURE_R);
  }

  /** In the village: by the cabin, or somewhere along the lane. */
  private inVillage(p: THREE.Vector3) {
    const st = this.d.gen.story;
    let d = Math.hypot(p.x - st.x, p.z - st.z);
    for (const q of st.village?.lane ?? []) d = Math.min(d, Math.hypot(p.x - q.x, p.z - q.z));
    return d < VILLAGE_R;
  }

  /**
   * Its own thing, after the giant: from one wrecked house to the next, out
   * in the lane in front of each, standing or sitting and looking at what's
   * left; now and then a while by its own fire. Nothing to ask of you (it
   * can be patted).
   */
  private keepToItself(dt: number) {
    const sp = this.spirit, m = this.mope, story = this.d.story;
    if (sp.busy) return;
    if (sp.arrived || m.go > 60) m.t += dt;
    else m.go += dt;
    if (m.t < m.stay) return;
    m.t = m.go = 0;
    const vil = this.d.gen.story.village;
    const houses = vil?.plots.filter((p) => p.house) ?? [];
    let k = Math.floor(Math.random() * (houses.length + 1));
    if (k === m.last) k = (k + 1) % (houses.length + 1);
    m.last = k;
    if (k >= houses.length) {
      m.stay = 25 + Math.random() * 15;
      sp.want = { at: story.anchor('hearthSeat').clone(), face: story.anchor('hearth'), pose: 'sit', icon: null, lead: false, settled: true };
      return;
    }
    // In the lane abreast of the house, a step toward it.
    const h = houses[k];
    let q = vil!.lane[0], bd = Infinity;
    for (const l of vil!.lane) { const d = Math.hypot(l.x - h.x, l.z - h.z); if (d < bd) { bd = d; q = l; } }
    const side = 2 + Math.random() * 2.5, along = (Math.random() - 0.5) * 4;
    const ux = (h.x - q.x) / (bd || 1), uz = (h.z - q.z) / (bd || 1);
    const at = new THREE.Vector3(q.x + ux * side - uz * along, 0, q.z + uz * side + ux * along);
    at.y = this.d.gen.height(at.x, at.z);
    m.stay = 12 + Math.random() * 12;
    sp.want = { at, face: new THREE.Vector3(h.x, h.y + 0.6, h.z), pose: Math.random() < 0.4 ? 'sit' : 'stand', icon: null, lead: false, settled: true };
  }

  /**
   * Where the task is (story/pointer.ts): the spirit while it's giving the
   * bike or leading a ride, the tower's door at a lock; otherwise the
   * house's own steps. Nothing calls you home for the stable: that waits
   * until you're there.
   */
  guide(leading: boolean): Guide | null {
    const story = this.d.story;
    switch (this.stage) {
      case 'gift': case 'ride1': case 'ride2': return { at: this.spirit.pos, near: 35 };
      case 'lock1': case 'enter1': case 'lock2': case 'enter2': {
        const t = this.stage === 'lock1' || this.stage === 'enter1' ? this.home : this.next;
        const g = t.door.ground;
        return { at: new THREE.Vector3(g.x, g.y, g.z), near: 45 };
      }
      case 'trudge': case 'grieve': return null;
      case 'done':
        // Being walked to the edge of the village: the spirit. Once it's pointing, the prints do the asking.
        if (this.send === 'lead' && !this.spirit.arrived) return { at: this.spirit.pos, near: 35 };
        if (story.lent || story.stableReady) return null;
    }
    return story.guide(leading);
  }

  /** The gift shot is running: hands off, the camera is the spirit's. */
  get busy() { return this.shot >= 0; }

  /**
   * The gift shot: side on to the spirit and where the bike will stand, from
   * the yard side (the cabin behind them, not in the way), rising a little
   * with the ball of light and settling on the bike.
   */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3 } | null {
    if (this.shot < 0) return null;
    const g = this.giftSpot(), st = this.d.gen.story, sp = this.spirit.pos;
    const gy = this.d.gen.height(g.x, g.z);
    const ax = g.x - sp.x, az = g.z - sp.z, al = Math.hypot(ax, az) || 1;
    let nx = az / al, nz = -ax / al;
    const mx = (sp.x + g.x) / 2, mz = (sp.z + g.z) / 2;
    if (nx * (mx - st.x) + nz * (mz - st.z) < 0) { nx = -nx; nz = -nz; }
    // A three-quarter view, the spirit a touch nearer.
    const yaw = Math.atan2(nx, nz) - 0.3 * Math.sign(nx * az - nz * ax || 1);
    const u = this.shot - SHOT_LEAD;
    const up = THREE.MathUtils.smootherstep(u, 0.3, 1.3) * (1 - THREE.MathUtils.smootherstep(u, 1.7, 2.6));
    const onBike = THREE.MathUtils.smootherstep(u, 1.6, 2.8);
    const at = new THREE.Vector3(mx, (sp.y + gy) / 2 + 0.9 + up * 0.9, mz);
    at.x += (g.x - mx) * 0.4 * onBike;
    at.z += (g.z - mz) * 0.4 * onBike;
    const pitch = 0.2, dist = 7.5 - 1 * onBike;
    const pos = at.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist));
    pos.y = Math.max(pos.y, this.d.gen.height(pos.x, pos.z) + 0.8);
    return { pos, at };
  }

  private want(at: THREE.Vector3, face: THREE.Vector3 | null, pose: 'point' | 'stand', icon: 'bike' | 'pick' | 'up' | null, usher?: THREE.Vector3) {
    const sp = this.spirit;
    // Far off (you took another way, or flew): it catches up out of sight.
    if (sp.pos.distanceTo(at) > 60 && sp.pos.distanceTo(this.d.body.pos) > 40) sp.teleport(at);
    const w = sp.want;
    if (w.at.distanceTo(at) > 0.5 || w.icon !== icon || w.pose !== pose || !w.usher !== !usher) sp.want = { at, face, pose, icon, lead: false, usher };
    else w.face = face;
  }

  /**
   * Just to the side of tower t's doorway (the same side as besideDoor),
   * close in against the rock, where an arm swept round points into the
   * opening. Cached per tower (it steps out until it's clear of rock).
   */
  private byDoorway(t: Tower) {
    if (this.doorSpot?.id === t.id) return this.doorSpot.p;
    const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
    const bo = t.boulders[1];
    // The doorway's half width is 0.3 sx (DOOR_SIZE in HEAD_FRAG).
    const lat = 0.3 * bo.sx + 0.9;
    const p = new THREE.Vector3(t.door.x + fz * lat + fx * 0.6, 0, t.door.z - fx * lat + fz * 0.6);
    const q = new THREE.Vector3();
    for (let i = 0; i < 20; i++) {
      p.y = this.d.gen.height(p.x, p.z);
      if (!this.d.beacons.solidAt(q.copy(p).setY(p.y + 0.3)) && !this.d.beacons.solidAt(q.setY(p.y + 0.8))) break;
      p.x += fx * 0.3;
      p.z += fz * 0.3;
    }
    this.doorSpot = { id: t.id, p };
    return p;
  }
  private doorSpot: { id: number; p: THREE.Vector3 } | null = null;

  /**
   * Nothing happening for a while with you nearby: the spirit comes over,
   * tugs your coat toward `at` and points at `face`, calling (the house's
   * hint, story.ts). Further off, the pointer does the asking.
   */
  private nudge(dt: number, at: THREE.Vector3, face: THREE.Vector3) {
    const sp = this.spirit;
    if (sp.busy || this.d.beacons.busy || sp.pos.distanceTo(this.d.body.pos) > HINT_NEAR) { this.hintT = 0; return; }
    this.hintT += dt;
    if (this.hintT > HINT_AFTER) { this.hintT = 0; sp.hint(at, face); }
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

  /** Stand the spirit's bike at a spot of someone else's choosing (the giant's visit: beside it, at the foot of the tower). */
  standBike(x: number, z: number, heading: number) {
    if (!this.sBike) this.sBike = this.d.bikes.place('spirit', x, z, heading, 2, LITTLE);
    else this.d.bikes.move(this.sBike, x, z, heading);
    this.sBike.scale = LITTLE;
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
    // No bike for you here (you walked, or yours is back at the cabin): it
    // pulls one out of its heart for you first, beside the start of the path.
    if (!this.conj && !this.d.cycling() && !this.bikeNear() && this.spirit.pos.distanceTo(this.d.body.pos) < 30) {
      const L = new Leader(line, this.d.gen, 9), p = L.at(9), h = L.heading;
      const k = this.d.bikes.placeNear('gift', p.x - Math.cos(h) * BESIDE, p.z + Math.sin(h) * BESIDE, h, 0, 5);
      this.conjure(k, 1);
    }
    if (!this.sBike) {
      // Its own little bike, out of its heart too, just along the path.
      this.parkAtPath(line, 6);
      this.conjure(this.sBike!, LITTLE);
    }
    if (this.conj) return true;
    const k = this.sBike!;
    this.boardT += dt;
    if (this.boardT < 0.05 && this.stage === 'ride2') this.spirit.greet();
    if (this.spirit.busy) return true;
    // To the bike's left, where you climb on.
    const at = this.byBike();
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
    this.d.story.chirp(true);
    this.poseRide(0, this.d.body.pos);
    return false;
  }

  /** A bike you could climb on within 30 m of you. */
  private bikeNear() {
    const b = this.d.body.pos;
    for (const [key, k] of this.d.bikes.bikes) if (key !== 'spirit' && !k.ridden && k.pos.distanceTo(b) < 30) return true;
    return false;
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
      if (this.callT <= 0) { this.callT = 3.5; this.d.story.chirp(false); }
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

  // ------------------------------------------------------------ bikes at the cabin

  /**
   * Exactly one bike at the cabin, and only once it's been given. Settled as
   * you come within CABIN_R of it: on foot, yours is back at its spot
   * outside (wherever you left it); riding in, the bike under you is the
   * cabin's one and the spot stays empty. Any other bike left about the
   * cabin quietly goes either way.
   */
  private tidyCabin() {
    const b = this.d.body.pos, st = this.d.gen.story;
    const g = this.giftSpot();
    const given = this.stage !== 'wait' && this.stage !== 'gift';
    const near = Math.hypot(g.x - b.x, g.z - b.z) < CABIN_R;
    if (!given || !near) { this.atCabin = near; return; }
    if (this.atCabin) return;
    this.atCabin = true;
    const riding = this.d.cycling();
    // Nothing goes or moves within sight of you.
    const far = (k: Bike) => Math.hypot(k.pos.x - b.x, k.pos.z - b.z) > 70;
    for (const [key, k] of this.d.bikes.bikes) {
      if (k === riding || key === 'spirit' || key === 'gift' || !far(k)) continue;
      if (Math.hypot(k.pos.x - st.x, k.pos.z - st.z) < 80) this.d.bikes.bikes.delete(key);
    }
    const gift = this.d.bikes.bikes.get('gift');
    if (riding) {
      // Left out front last time and you've come back on another: it's gone home.
      if (gift && gift !== riding && far(gift) && Math.hypot(gift.pos.x - st.x, gift.pos.z - st.z) < 80) this.d.bikes.bikes.delete('gift');
    } else if (!gift) this.gift();
    else if (far(gift) && Math.hypot(gift.pos.x - g.x, gift.pos.z - g.z) > 20 && Math.hypot(g.x - b.x, g.z - b.z) > 40) this.d.bikes.move(gift, g.x, g.z, g.heading);
  }

  /**
   * Arriving at a tower by ember: a bike waits at its foot, a little out
   * from the doorway and off to one side, unless one of yours is there.
   */
  private towerBike(t: Tower) {
    const bikes = this.d.bikes, g = t.door.ground;
    const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
    for (const [key, k] of bikes.bikes) {
      if (k.ridden || key === 'spirit') continue;
      if (Math.hypot(k.pos.x - g.x, k.pos.z - g.z) < 25) return;
      // One from an earlier trip, far behind: it goes.
      if (key.startsWith('tower:') && Math.hypot(k.pos.x - g.x, k.pos.z - g.z) > 500) bikes.bikes.delete(key);
    }
    const tip = new THREE.Vector3();
    const offRock = (x: number, z: number) => {
      const y = this.d.gen.height(x, z);
      for (const dy of [0.4, 1.2]) for (const d of [-0.8, 0, 0.8]) if (this.d.beacons.solidAt(tip.set(x + fx * d, y + dy, z + fz * d))) return false;
      return true;
    };
    // Beside where you come out (3 m in front of the doorway), side-on to it.
    const x = g.x + fx * 4.5 + fz * 2.6, z = g.z + fz * 4.5 - fx * 2.6;
    bikes.placeNear(`tower:${t.id}`, x, z, t.yaw + Math.PI / 2, 1 + (t.id % 15), 7, offRock);
  }

  /** Pull a bike out of the spirit's heart (it appears at `size` when done). */
  private conjure(k: Bike, size: number) {
    this.conj = { bike: k, t: 0, to: k.pos.clone(), heading: k.heading, size };
    k.scale = 0.001;
    this.spirit.celebrate();
    this.d.story.chirp(true);
  }

  private updateConjure(dt: number) {
    const c = this.conj;
    this.ball.visible = false;
    if (!c) return;
    c.t += dt;
    const sp = this.spirit, k = c.bike, t = c.t;
    const chest = sp.pos.clone().add(new THREE.Vector3(0, 0.35, 0));
    const over = chest.clone().add(new THREE.Vector3(0, 1.3, 0));
    const land = c.to.clone().add(new THREE.Vector3(0, 0.55 * c.size, 0));
    let r = 0;
    const p = new THREE.Vector3();
    if (t < 0.5) {
      // A spark out of its chest.
      const e = t / 0.5;
      p.copy(chest).addScaledVector(new THREE.Vector3(Math.sin(sp.heading), 0, Math.cos(sp.heading)), 0.3 * e);
      r = 0.16 * e;
      if (Math.random() < dt * 20) this.sparks.emit(p, 1, 0.05, 0.6);
    } else if (t < 1.3) {
      // Rising and swelling over its head.
      const e = THREE.MathUtils.smootherstep(t, 0.5, 1.3);
      p.lerpVectors(chest, over, e);
      r = 0.16 + 0.24 * e + 0.03 * Math.sin(t * 30);
      if (Math.random() < dt * 30) this.sparks.emit(p, 1, 0.06, 1.2);
    } else if (t < 1.85) {
      // Arcing over to where the bike will stand.
      const e = THREE.MathUtils.smootherstep(t, 1.3, 1.85);
      p.lerpVectors(over, land, e);
      p.y += Math.sin(e * Math.PI) * 1.2;
      r = 0.4 * (1 - 0.2 * e);
    } else if (t - dt < 1.85) {
      this.sparks.emit(land, 24, 0.12, 3.2);
      this.d.story.chirp(false);
    }
    if (r > 0) {
      this.ball.visible = true;
      this.ball.position.copy(p);
      this.ball.scale.setScalar(r);
    }
    // The bike spins up out of the light, a little bounce as it lands.
    if (t >= 1.85) {
      const e = Math.min(1, (t - 1.85) / 0.7);
      const grow = 1 - Math.pow(1 - e, 3) * Math.cos(e * 7);
      k.scale = Math.max(0.001, c.size * grow);
      k.heading = c.heading + (1 - THREE.MathUtils.smootherstep(e, 0, 1)) * Math.PI * 2;
      k.pos.copy(c.to);
      k.pos.y = this.d.gen.height(c.to.x, c.to.z) + (1 - e) * 0.3;
      k.stand = 1;
      k.skel.pose(k);
    } else {
      k.scale = 0.001;
      k.skel.pose(k);
    }
    if (t >= CONJURE) {
      k.scale = c.size;
      k.heading = c.heading;
      k.pos.copy(c.to);
      this.conj = null;
    }
  }

  // ------------------------------------------------------------ dev jumps

  /** Jump straight to a stage (the panel, ?journey=): finishes phase 1 and sets the world up for it. */
  jump(s: Stage) {
    const story = this.d.story, bz = this.d.beacons;
    if (!story.done) { story.debugJump('home'); story.done = true; story.save(); }
    const idx = STAGES.indexOf(s);
    bz.setLit(this.home.id, idx > STAGES.indexOf('lock1'));
    bz.setLit(this.next.id, idx > STAGES.indexOf('lock2') && s !== 'trudge' && s !== 'grieve');
    this.leader = null;
    this.back = null;
    this.backS = -1;
    this.mope = { stay: 0, t: 0, go: 0, last: -1 };
    this.clearGrief();
    this.spirit.riding = null;
    if (this.sBike) { this.d.bikes.bikes.delete('spirit'); this.sBike = null; }
    this.stage = s;
    this.t = 0;
    const j = this.d.gen.journey;
    const front = (t: Tower, d: number) => [t.door.ground.x + Math.sin(t.yaw) * d, t.door.ground.z + Math.cos(t.yaw) * d] as const;
    this.conj = null;
    this.shot = -1;
    this.ball.visible = false;
    if (s === 'wait' || s === 'gift') this.d.bikes.bikes.delete('gift');
    const gift = s === 'wait' || s === 'gift' ? null! : this.gift();
    if (s === 'wait' || s === 'gift') {
      const g = this.giftSpot();
      this.d.place(g.x + Math.sin(g.heading) * -7, g.z + Math.cos(g.heading) * -7, g.heading);
      if (s === 'gift') { this.startGift(); this.spirit.teleport(new THREE.Vector3(g.x - Math.cos(g.heading) * 1.6, this.d.gen.height(g.x, g.z), g.z + Math.sin(g.heading) * 1.6)); }
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
    } else if (s === 'grieve') {
      // In the yard, the spirit just in from the path; its bike still at the tower.
      const [x, z] = j.toHome[0], [nx, nz] = j.toHome[1];
      this.d.place(x, z, Math.atan2(x - nx, z - nz));
      this.spirit.teleport(new THREE.Vector3(x + 2, this.d.gen.height(x + 2, z), z));
      this.parkAtEnd(j.toHome);
    } else {
      const t = s === 'lock1' || s === 'enter1' || s === 'trudge' ? this.home : this.next;
      this.atTower(t, gift);
      this.spirit.teleport(s === 'trudge' ? this.byDoorway(t) : this.besideDoor(t, 3.2));
      if (s === 'trudge') this.parkAtEnd(j.toHome);
      if (s === 'done') this.goHome();
    }
    this.save();
  }

  /** Stand the explorer in front of tower t, facing it, the gift bike beside them. */
  private atTower(t: Tower, gift: Bike) {
    const d = 7, x = t.door.ground.x + Math.sin(t.yaw) * d, z = t.door.ground.z + Math.cos(t.yaw) * d;
    this.d.bikes.move(gift, x + Math.cos(t.yaw) * 3, z - Math.sin(t.yaw) * 3, t.yaw + Math.PI);
    this.d.place(x, z, t.yaw + Math.PI);
  }

  /** The spirit's little bike parked where `line` ends (the tower it rode to). */
  private parkAtEnd(line: [number, number][]) {
    this.parkAtPath(line, Math.max(0, new Leader(line, this.d.gen).L - 1));
  }

  /** The spirit standing at its bike's left, ready to climb on. */
  private byBike() {
    const k = this.sBike!;
    const at = k.pos.clone().add(new THREE.Vector3(Math.cos(k.heading), 0, -Math.sin(k.heading)).multiplyScalar(-0.7));
    at.y = this.d.gen.height(at.x, at.z);
    return at;
  }

  /**
   * Back after a reload mid-journey: the stage is the checkpoint, and you,
   * the spirit and both bikes start where it happens rather than everyone
   * at the cabin (the spirit would walk all the way to a tower). A ride
   * starts over from its start line, the spirit already by its bike;
   * at a tower you're in front of it with your bike, the spirit by the
   * door and its bike where the ride ended. Call after the spawn and the
   * bike reset (which would undo it).
   */
  resume() {
    const s = this.stage, j = this.d.gen.journey;
    // Keeping to itself in the village (the house has put it by its fire); the bike it forgot is still at the tower.
    if (this.d.story.done && s === 'grieve') { this.parkAtEnd(j.toHome); return; }
    if (!this.d.story.done || s === 'wait' || s === 'gift' || s === 'done') return;
    this.leader = null;
    this.spirit.riding = null;
    this.boardT = 0;
    const gift = this.gift();
    if (s === 'ride1') {
      // At the cabin (the usual doorstep), your bike at its spot; its own a little way up the path.
      this.parkAtPath(j.toHome, 6);
      this.spirit.teleport(this.byBike());
      return;
    }
    const t = s === 'lock1' || s === 'enter1' || s === 'ride2' ? this.home : this.next;
    this.atTower(t, gift);
    this.parkAtEnd(t === this.home ? j.toHome : j.toNext);
    this.spirit.teleport(s === 'ride2' ? this.byBike() : this.besideDoor(t, 3.2));
  }

  // ------------------------------------------------------------ save

  private key() { return `fjellheim.journey.${this.d.saveKey}`; }
  private save() { try { localStorage.setItem(this.key(), this.stage); if (this.found) localStorage.setItem(this.key() + '.ring', '1'); } catch { /* private mode */ } }
  private load() {
    try {
      const s = localStorage.getItem(this.key()) as Stage | null;
      if (s && STAGES.includes(s)) {
        // Where you pick up again is resume()'s (a ride starts over; the walk home is over, and it's in the village).
        this.stage = s === 'trudge' ? 'grieve' : s;
      }
      this.found = !!localStorage.getItem(this.key() + '.ring');
    } catch { /* ignore */ }
  }
  reset() { try { localStorage.removeItem(this.key()); localStorage.removeItem(this.key() + '.ring'); } catch { /* ignore */ } this.stage = 'wait'; this.found = false; this.send = 'idle'; }
}
