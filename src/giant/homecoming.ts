import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';
import type { Body } from '../player/movement';
import type { Sfx } from '../story/audio';
import type { Story } from '../story/story';
import { CAB } from '../story/geometry';
import { siteLocal } from '../world/storySite';
import type { DungeonSite, WorldGen } from '../world/worldgen';
import type { Birds } from './birds';
import type { Giant } from './giant';
import { onwardRoute, restOf, type Footfall } from './visit';

// The homecoming (dungeon 1, slice C of docs/NEXT-dungeon1.md): what follows
// the giant's smile. It carries straight on from the offering, hands off:
//
//  1. One of the crows roosting in the giant's trees lifts off with its
//     light and flies out past the camera.
//  2. Under a short veil the camera goes to the guide's cabin (you stay at
//     the ring; only the camera travels, and it waits for the land there to
//     load). The guide is on its doorstep. The crow comes over low and lets
//     the light go from a few metres up; it lands in a cloud of dust, and
//     out of the dust comes the spirit it was. The crow doesn't stop: it
//     flies on and away, out of sight, and is never seen to vanish. The two
//     run up to each other and jump for joy.
//     Its house is not touched: it is still the wreck in the giant's print
//     (step 0 of `Village.setStep`; the building starts with the next
//     dungeon done). The spirit walks home to it afterwards.
//  3. Under the veil again, back to the ring. The giant gets up out of the
//     ground (`Giant.rise`), and walks off along a real way to the next
//     dungeon's ring, leaving prints. You get your hands back after its
//     first few steps; it goes on walking, and lies down again by that ring.
//
// The same again follows dungeon 2's offering (`who: 1, leg: 2, name:
// 'home2'` in main): the second spirit taken comes home, and the giant gets
// up from the second ring and walks to a third. That third ring is bare
// stones and stays shut: there is nothing under it yet (dungeon 3 isn't
// built). The trail ends there for now.
//
// Outside the story (`story=0`) there is no village and there are no crows:
// it goes straight from the smile to the giant getting up.
//
// Saved as `embla.home1.<seed>` from the moment the spirit is on the
// ground. A reload before that plays this again from the start (you're
// put back by the shrine); a reload after it finds everything done: the
// spirit home, and the giant asleep by the second
// ring with its prints laid all the way there. Nothing is replayed.

export interface HomeDeps {
  gen: WorldGen;
  /** The ground with the prints pressed into it. */
  ground(x: number, z: number): number;
  body: Body;
  sfx: Sfx;
  /** The story (its village and the guide), or null outside it. */
  story: Story | null;
  /** The giant where it lies by the ring it's about to leave (the first, unless `leg` says otherwise). */
  giant(): Giant;
  /** Where that is: where its walk to that ring ended. */
  rest(): { x: number; z: number; heading: number };
  /** The footfalls of that walk (none: nothing walked there). */
  before(): Footfall[];
  /** The crows roosting in its trees with the spirits' lights (null: there are none). */
  crows(): Birds | null;
  /** Put the giant somewhere else at once (a restored save). */
  summon(x: number, z: number, heading: number): Giant;
  /** Leave a print (a restored save: the walk isn't replayed). */
  stamp(at: THREE.Vector3, yaw: number): void;
  puff(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** Stop whatever you're on where it stands. */
  halt(): void;
  /** How far the nearest standing tree's trunk is from a point (Infinity if none within `max`). */
  tree(x: number, z: number, max: number): number;
  /** Is the land round the camera still being built? */
  loading(): boolean;
  /** It has lain down by the second ring (what it does there next is dungeon 2's: main). */
  settledAt?(g: Giant): void;
  saveKey: string;
  /**
   * Which homecoming this is (left out: the first dungeon's). `who`: which of
   * the taken comes home, in the order they were taken (the first: the one
   * the visit's camera went down with). `leg`: the ring it walks on to,
   * `gen.dungeons[leg]`; it gets up from the one before. `name`: what it's
   * saved as.
   */
  who?: number;
  leg?: number;
  name?: string;
}

type Phase = 'leave' | 'cutTo' | 'village' | 'cutBack' | 'rise';

/** The veil: how long it takes to come up or go, the least it holds, and the longest it waits for the land (s). */
const VEIL = { fade: 0.55, hold: 0.45, most: 20 };
/** The crow leaving the giant: how long it's watched, and how far past the camera it's bound (m). */
const LEAVE = { secs: 4.6, past: 16 };
/**
 * The village, in seconds from the veil lifting: the crow is `dive` coming
 * in, and lets the light go from `high` up as it passes over; it is `away`
 * getting out of sight. The light falls (`fall`, m/s2) and lands in dust;
 * `grow` later the spirit is all there; `go` after landing the two set off
 * for each other; they jump for joy `cheer` after landing, and `out` after
 * landing the veil comes up.
 */
const V = { dive: 3.1, high: 7, away: 4.5, fall: 13, grow: 0.7, go: 1.1, cheer: 2.9, out: 5.6 };
/** The giant getting up, in seconds from the veil lifting: it starts at `at`, sets off walking `walk` later, and you get your hands back when it has taken `steps`. */
const RISE = { at: 1.0, walk: 8.2, steps: 2.6 };
/** Seconds per step on the way to the next ring. */
const STEP_TIME = 2.0;
/** How far behind you the camera is put when it's handed back (m): main sets the orbit camera to this. */
export const BACK_DIST = 10;
/** The cameras' fields of view: on the crow leaving, in the village, and on the giant getting up. */
const FOV = { leave: 34, village: 40, rise: 38 };

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
const ss = THREE.MathUtils.smoothstep;

export class Homecoming {
  readonly group = new THREE.Group();
  state: 'idle' | 'playing' | 'done' = 'idle';
  phase: Phase = 'leave';
  /** Seconds into the phase. */
  private t = 0;
  private frames = 0;
  /** The giant has got up from the first ring (or is long gone from it): it isn't the offering's any more. */
  left = false;
  /** It has lain down by the second ring. */
  settled = false;
  /** How much of the frame the veil covers (0..1). */
  veil = 0;
  /** Where the orbit camera should be looking from once this hands it back (a yaw), once. */
  afterYaw: number | null = null;
  private falls: Footfall[] | null = null;
  private pos = new THREE.Vector3();
  private at = new THREE.Vector3();
  private atNow = new THREE.Vector3();
  private fov = 36;
  /** The light, once the crow is over the village: ours to set down. */
  private orb: THREE.Mesh;
  private orbAt = new THREE.Vector3();
  /** The village's marks: where the light comes down, the guide's doorstep, the way the crow flies over, and the camera. */
  private drop = new THREE.Vector3();
  private step = new THREE.Vector3();
  private fly = new THREE.Vector3();
  private camV = new THREE.Vector3();
  private orbVel = new THREE.Vector3();
  /** When the crow let go, and when the light hit the ground (seconds into the shot; -1: not yet). */
  private letGo = -1;
  private landed = -1;
  /** The spirit that was taken first is back on the ground in the village. */
  home = false;
  private wasLent = false;
  private camR = new THREE.Vector3();
  private lookAt = new THREE.Vector3();
  private staged = false;

  private who: number;
  private leg: number;
  private name: string;
  /** The ring it gets up from (a shrine by now). */
  private site: DungeonSite;

  constructor(private d: HomeDeps) {
    this.who = d.who ?? 0;
    this.leg = d.leg ?? 1;
    this.name = d.name ?? 'home1';
    this.site = d.gen.dungeons[this.leg - 1];
    this.orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), makeSolidMaterial('#ee6a20', 1.6, { keep: 1 }));
    this.orb.frustumCulled = false;
    this.orb.visible = false;
    this.group.add(this.orb);
  }

  /** Hands off, and the camera is this's. */
  get busy() { return this.state === 'playing'; }
  /** Seconds into the phase (dev). */
  get clock() { return this.t; }
  /** Waiting under the veil for the land to load (dev: a stepped script must give the workers real time here). */
  get waiting() { return this.busy && (this.phase === 'cutTo' || this.phase === 'cutBack'); }

  private get village() { return this.d.story?.village ?? null; }
  /** Is there a village to go to, a spirit to take there and a crow to take it? */
  private get whole() { const v = this.village, c = this.d.crows(); return !!v && !!c && c.birds.length > this.who && v.spirits.length > this.who; }

  /** The giant's footfalls from the ring it lies by to the next. */
  get route(): Footfall[] { return (this.falls ??= onwardRoute(this.d.gen, this.leg, this.d.rest(), this.d.before())); }

  private save() {
    try { localStorage.setItem(`embla.${this.name}.${this.d.saveKey}`, '1'); } catch { /* ignore */ }
  }

  /** A save from after the spirit was home: all of it as it was left, and the giant asleep by the second ring. Nothing is replayed. */
  restore() {
    let saved = false;
    try { saved = localStorage.getItem(`embla.${this.name}.${this.d.saveKey}`) === '1'; } catch { /* no storage */ }
    if (!saved) return;
    this.state = 'done';
    this.left = true;
    this.settled = true;
    this.home = this.whole;
    const v = this.village;
    if (this.whole && v) {
      v.comeHome(this.who);
      this.d.crows()!.shed(this.who);
    }
    const falls = this.route;
    for (const f of falls) this.d.stamp(v1.set(f.x, 0, f.z), f.yaw);
    const at = falls.length > 1 ? restOf(falls) : this.d.rest();
    const g = this.d.summon(at.x, at.z, at.heading);
    this.asleep(g);
    g.settle();
    g.snap();
  }

  private asleep(g: Giant) {
    g.awake = false;
    g.grin = 0;
    g.wide = 0;
    g.mouth = 0;
    g.look = null;
  }

  /** The offering is over: on from its last frame. */
  begin() {
    if (this.state !== 'idle') return;
    this.state = 'playing';
    this.staged = false;
    if (this.whole) this.enter('leave');
    else { this.enter('rise'); this.save(); }
  }

  private enter(p: Phase) {
    this.phase = p;
    this.t = 0;
    this.frames = 0;
    const g = this.d.giant(), fx = this.d.sfx;
    if (p === 'leave') {
      // In front of its face and off to one side, about level with its trees: the crow comes out of them toward us.
      const c = this.d.crows()!, r = this.d.rest();
      const fwd = v1.set(Math.sin(r.heading), 0, Math.cos(r.heading)), side = v2.set(fwd.z, 0, -fwd.x);
      g.perch(this.who, v3);
      const sd = this.clearer(g.centre, fwd, side, 52, 20);
      this.pos.copy(g.centre).addScaledVector(fwd, 52).addScaledVector(side, 20 * sd).setY(v3.y - 7);
      this.pos.y = Math.max(this.pos.y, this.d.ground(this.pos.x, this.pos.z) + 3);
      // Up out of its tree, out over its head and on past the camera's shoulder.
      const via = new THREE.Vector3().copy(v3).addScaledVector(fwd, 16).setY(v3.y + 11);
      const to = new THREE.Vector3().copy(this.pos).addScaledVector(fwd, LEAVE.past).addScaledVector(side, -sd * 7).setY(this.pos.y + 5);
      c.send(this.who, 'climb', via, to, LEAVE.secs + 0.4, 'hover');
      this.atNow.copy(v3);
      g.look = this.lookAt.copy(v3);
      fx.whoosh();
    } else if (p === 'cutTo') {
      this.stageVillage();
    } else if (p === 'village') {
      const c = this.d.crows()!, b = c.birds[this.who];
      // The light is ours from here: the crow lets it go.
      c.shed(this.who);
      this.orb.visible = true;
      // (Smaller than it hangs under a crow far off: here it is a few metres from the lens.)
      this.orb.scale.setScalar(0.5);
      this.letGo = this.landed = -1;
      // In across the shot, low and level over the yard, and on.
      v1.copy(this.drop).setY(this.drop.y + V.high);
      b.pos.copy(v1).addScaledVector(this.fly, -78).setY(v1.y + 30);
      b.dir.copy(this.fly);
      v2.copy(v1).addScaledVector(this.fly, -22).setY(v1.y + 1.5);
      c.send(this.who, 'dive', v2, v1, V.dive, 'hover');
      this.orbAt.copy(b.pos);
      this.atNow.copy(this.drop).lerp(this.step, 0.5).setY(this.drop.y + 1.2);
      fx.whoosh();
    } else if (p === 'cutBack') {
      this.stageRise();
      // The crow is back in its tree, with nothing to carry.
      const c = this.d.crows();
      if (c) c.birds[this.who].state = 'roost';
      this.orb.visible = false;
      const st = this.d.story, v = this.village;
      if (st) { st.lent = this.wasLent; st.spirit.haste = null; }
      // (Back to its own pace: it walks home to its house from here.)
      if (v) v.spirits[this.who].haste = 1.8;
    } else {
      this.stageRise();
      g.look = null;
      this.riseCam(0, true);
    }
  }

  /** Which side (+1 or -1 along `side`) of a point `ahead` of `c` is clearer of trunks for a camera. */
  private clearer(c: THREE.Vector3, fwd: THREE.Vector3, side: THREE.Vector3, ahead: number, out: number) {
    const room = (s: number) => this.d.tree(c.x + fwd.x * ahead + side.x * out * s, c.z + fwd.z * ahead + side.z * out * s, 12);
    return room(1) >= room(-1) ? 1 : -1;
  }

  /** The village's marks: the guide's yard, in front of its cabin. */
  private stageVillage() {
    const st = this.d.story!, gy = this.d.ground;
    // (Nothing is built yet: the spirit's house is the wreck it was, step 0 of `Village.setStep`. Its footing
    // is for the next dungeon done.)
    // The guide on its doorstep; the light comes down out in its yard, toward the lane.
    const door = siteLocal(st.site, -0.2, CAB.D / 2 + 2.2), yard = st.site.village!.lane[0];
    this.step.set(door.x, gy(door.x, door.z), door.z);
    v1.set(yard.x - door.x, 0, yard.z - door.z);
    const far = Math.min(9.5, v1.length() * 0.75);
    v1.normalize();
    this.drop.copy(this.step).addScaledVector(v1, far);
    this.drop.y = gy(this.drop.x, this.drop.z);
    v2.set(v1.z, 0, -v1.x);
    // The camera: out past where it lands, off to one side, looking back at the cabin; wherever there's no
    // trunk to stand in or look through.
    let best = -Infinity;
    for (const side of [1, -1]) for (const [out, across, cost] of [[7.5, 6.5, 0], [9.5, 4.5, 0.3], [5.5, 8.5, 0.5], [11, 2.5, 0.9]]) {
      v3.copy(this.drop).addScaledVector(v1, out).addScaledVector(v2, across * side);
      let room = Math.min(this.d.tree(v3.x, v3.z, 12) - 1.5, 6);
      for (const u of [0.25, 0.5, 0.75]) room = Math.min(room, this.d.tree(v3.x + (this.drop.x - v3.x) * u, v3.z + (this.drop.z - v3.z) * u, 12), this.d.tree(v3.x + (this.step.x - v3.x) * u, v3.z + (this.step.z - v3.z) * u, 12));
      const y = gy(v3.x, v3.z), score = Math.min(room, 5) * 2 - cost - Math.abs(y - this.drop.y) * 0.8;
      // (The crow comes in over the cabin's roof and goes out over the lane, away from the camera's side.)
      if (score > best) { best = score; this.camV.set(v3.x, y, v3.z); this.fly.copy(v1).multiplyScalar(0.8).addScaledVector(v2, -0.6 * side).normalize(); }
    }
    this.camV.y = Math.max(this.camV.y + 1.3, this.drop.y + 1.5);
    // Never looking through a rise in the ground: up, until both of them will be in plain sight.
    for (let n = 0; n < 12; n++) {
      let hid = false;
      for (const to of [this.drop, this.step]) for (let u = 0.08; u < 0.95; u += 0.08) {
        const x = this.camV.x + (to.x - this.camV.x) * u, z = this.camV.z + (to.z - this.camV.z) * u;
        if (gy(x, z) + 0.45 > this.camV.y + (to.y + 0.2 - this.camV.y) * u) hid = true;
      }
      if (!hid) break;
      this.camV.y += 0.35;
    }
    const sp = st.spirit;
    this.wasLent = st.lent;
    st.lent = true;
    sp.cancelActs();
    sp.teleport(this.step);
    sp.mood = null;
    sp.want = { at: this.step.clone(), face: this.drop.clone().setY(this.drop.y + V.high), pose: 'stand', icon: null, lead: false, settled: true };
    this.pos.copy(this.camV);
    this.at.copy(this.drop).lerp(this.step, 0.5).setY(this.drop.y + 1.2);
    this.fov = FOV.village;
  }

  /**
   * The camera for the giant getting up: side on to it and well back, above
   * the treetops, so the whole of it is in frame as it stands (80 m), with
   * the ring and you small in front. Whichever side, and however far round,
   * the land between hides least of it.
   */
  private stageRise() {
    if (this.staged) return;
    this.staged = true;
    const r = this.d.rest(), gy = this.d.ground, f = this.route;
    // The way it's about to go: toward its fourth footfall.
    const on = f[Math.min(3, f.length - 1)];
    const h = on ? Math.atan2(on.x - r.x, on.z - r.z) : r.heading;
    const mx = on ? (r.x + on.x) / 2 : r.x, mz = on ? (r.z + on.z) / 2 : r.z, base = gy(r.x, r.z);
    let best = Infinity;
    for (const s of [1, -1]) for (const turn of [0, 0.35, -0.35, 0.7, -0.7]) for (const far of [215, 190, 245]) {
      const a = h + s * (Math.PI / 2 + turn), x = mx + Math.sin(a) * far, z = mz + Math.cos(a) * far, g = gy(x, z);
      if (g < 1) continue;
      // (Out in the open if it can be: in woods the lens is among the treetops, and they fill the frame.)
      const wood = (wx: number, wz: number) => { const wh = gy(wx, wz); return wh < 1 ? 0 : this.d.gen.forestDensity(wx, wz, wh); };
      let woods = wood(x, z) * 1.5;
      for (const t of [0.08, 0.16, 0.24, 0.32]) woods += wood(x + (mx - x) * t, z + (mz - z) * t);
      const eye = Math.max(g + (woods > 0.5 ? 24 : 9), base + 8);
      // How much of it the ground (and what grows on it) between hides, in metres up from its feet.
      let hidden = 0;
      for (let t = 0.05; t < 1; t += 0.05) { const wx = x + (mx - x) * t, wz = z + (mz - z) * t; hidden = Math.max(hidden, (gy(wx, wz) + 16 * Math.min(1, wood(wx, wz) * 2) - eye) / t + eye - base); }
      // (Not perched on a hillside either: its own slope fills the bottom of the frame, and it looks down on the giant.)
      const slope = Math.abs(gy(x + 12, z) - gy(x - 12, z)) + Math.abs(gy(x, z + 12) - gy(x, z - 12));
      const score = Math.max(hidden, 0) + woods * 14 + Math.abs(turn) * 5 + Math.abs(far - 215) * 0.03 + Math.abs(eye - base - 12) * 0.6 + slope * 1.2;
      if (score < best) { best = score; this.camR.set(x, eye, z); }
    }
    if (best === Infinity) this.camR.set(mx + Math.cos(h) * 185, base + 20, mz - Math.sin(h) * 185);
  }

  update(dt: number, given: boolean) {
    // On from the offering's last frame (or, a save from between the two: as soon as you're by the shrine again).
    if (this.state === 'idle') {
      const s = this.site, b = this.d.body.pos;
      if (given && Math.hypot(b.x - s.x, b.z - s.z) < 40) this.begin();
    }
    if (this.state === 'playing') this.play(dt);
    // It walks on by itself, and at the next ring it lies down again: a hill, until there's something under that ring.
    if (this.left && !this.settled) {
      const g = this.d.giant();
      if (g.arrived && !g.walking) {
        this.settled = true;
        this.asleep(g);
        g.dormant = true;
        this.d.settledAt?.(g);
      }
    }
  }

  private play(dt: number) {
    const t0 = this.t, t = (this.t += dt), fx = this.d.sfx, b = this.d.body;
    const passed = (k: number) => t0 < k && t >= k;
    this.frames++;
    this.d.halt();
    const c = this.d.crows(), bird = c?.birds[this.who];
    switch (this.phase) {
      case 'leave': {
        this.lookAt.lerp(bird!.pos, 1 - Math.exp(-3 * dt));
        // The camera goes with the crow, and the light.
        this.atNow.lerp(bird!.pos, 1 - Math.exp(-5 * dt));
        this.at.copy(this.atNow);
        this.fov = FOV.leave;
        this.veil = ss(t, LEAVE.secs - VEIL.fade, LEAVE.secs);
        if (t >= LEAVE.secs) this.enter('cutTo');
        break;
      }
      case 'cutTo':
      case 'cutBack': {
        // Dark, while the land where the camera now is gets built.
        this.veil = 1;
        if (this.phase === 'cutBack') this.riseCam(dt, true);
        if ((t > VEIL.hold && this.frames > 8 && !this.d.loading()) || t > VEIL.most) this.enter(this.phase === 'cutTo' ? 'village' : 'rise');
        break;
      }
      case 'village': this.playVillage(dt, t, passed); break;
      case 'rise': {
        const g = this.d.giant();
        this.veil = this.d.crows() && this.whole ? 1 - ss(t, 0, VEIL.fade) : 0;
        if (passed(RISE.at)) {
          this.left = true;
          this.asleep(g);
          g.awake = true;
          g.grin = 0.55;
          g.stepTime = STEP_TIME;
          g.rise();
          fx.stomp();
          if (!this.whole) this.save();
        }
        if (t > RISE.at && t < RISE.at + RISE.walk && Math.floor(t / 1.4) !== Math.floor(t0 / 1.4)) fx.thud();
        if (passed(RISE.at + RISE.walk) && this.route.length > 1) g.walkRoute(this.route);
        // You turn to watch it go.
        let dh = Math.atan2(g.centre.x - b.pos.x, g.centre.z - b.pos.z) - b.heading;
        dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        b.heading += dh * (1 - Math.exp(-1.6 * dt));
        this.riseCam(dt, false);
        if ((t > RISE.at + RISE.walk && (g.steps >= RISE.steps || !g.walking)) || this.route.length <= 1 && t > RISE.at + 10) {
          this.state = 'done';
          this.veil = 0;
          this.afterYaw = this.backYaw();
        }
        break;
      }
    }
  }

  /**
   * Where the orbit camera goes when you get your hands back: behind you as
   * you watch the giant go, or as near that as has a clear look at you. You
   * are inside the ring, and behind you may be one of its stones (the camera
   * was, the first time: all stone, and no you) or the shrine.
   */
  private backYaw() {
    const b = this.d.body, s = this.site, back = b.heading + Math.PI;
    let best = -Infinity, yaw = back;
    for (const off of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.25, -1.25]) {
      const a = back + off;
      let room = 6;
      for (const u of [0.25, 0.5, 0.75, 1, 1.15, 1.3]) {
        const x = b.pos.x + Math.sin(a) * BACK_DIST * u, z = b.pos.z + Math.cos(a) * BACK_DIST * u;
        room = Math.min(room, Math.hypot(x - s.x, z - s.z) - 2.6);
        for (let i = 0; i < 9; i++) { const k = 0.2 + (i / 9) * Math.PI * 2; room = Math.min(room, Math.hypot(x - s.x - Math.cos(k) * s.r, z - s.z - Math.sin(k) * s.r) - 2.4); }
        room = Math.min(room, this.d.tree(x, z, 8) - 1);
      }
      const score = Math.min(room, 2.5) * 3 - Math.abs(off) * 1.6;
      if (score > best) { best = score; yaw = a; }
    }
    return yaw;
  }

  /** The wide camera on the giant: it stays put and turns with it. */
  private riseCam(dt: number, snap: boolean) {
    const g = this.d.giant(), r = this.d.rest();
    this.pos.copy(this.camR);
    // (Its middle while it's a hill is underground: look at where its chest will be, part way.)
    const base = this.d.ground(r.x, r.z);
    v1.set(g.centre.x, base + 26 + 20 * (1 - g.sunk), g.centre.z);
    if (snap) this.atNow.copy(v1); else this.atNow.lerp(v1, 1 - Math.exp(-2.2 * dt));
    this.at.copy(this.atNow);
    this.fov = FOV.rise;
  }

  private playVillage(dt: number, t: number, passed: (k: number) => boolean) {
    const v = this.village!, st = this.d.story!, fx = this.d.sfx, c = this.d.crows()!, bird = c.birds[this.who], sp = st.spirit, home = v.spirits[this.who];
    const L = this.landed;
    this.veil = Math.max(1 - ss(t, 0, VEIL.fade), L >= 0 ? ss(t, L + V.out - VEIL.fade, L + V.out) : 0);
    // The crow comes over and doesn't stop: as it passes it lets go, and flies on up and away until it's out of
    // sight. (It's put back in its tree under the veil, far from here.)
    if (this.letGo < 0 && bird.state === 'hover') {
      this.letGo = t;
      this.orbVel.copy(this.fly).multiplyScalar(5);
      v1.copy(bird.pos).addScaledVector(this.fly, 24).setY(bird.pos.y + 4);
      v2.copy(bird.pos).addScaledVector(this.fly, 150).setY(bird.pos.y + 70);
      c.send(this.who, 'climb', v1, v2, V.away, 'hover');
      fx.whoosh();
    }
    // The light: under the crow; then falling, a little the way the crow was going; then gone into who it was.
    if (this.letGo < 0) this.orbAt.copy(bird.grip).setY(bird.grip.y + 0.35);
    else if (L < 0) {
      this.orbVel.y -= V.fall * dt;
      this.orbVel.x *= Math.exp(-1.2 * dt); this.orbVel.z *= Math.exp(-1.2 * dt);
      this.orbAt.addScaledVector(this.orbVel, dt);
      const g = this.d.ground(this.orbAt.x, this.orbAt.z);
      if (this.orbAt.y <= g + 0.5) {
        // Down, in a cloud of dust: and in the dust, the one it was. From here a reload finds it home.
        this.landed = t;
        this.orbAt.y = g + 0.5;
        this.drop.set(this.orbAt.x, g, this.orbAt.z);
        v1.copy(this.drop).setY(g + 0.3);
        this.d.puff(v1, 22, 0.7, 3.4);
        this.d.puff(v1.setY(g + 1.0), 12, 0.6, 2);
        fx.thud();
        fx.chirp(true);
        v.comeHome(this.who, this.drop);
        home.size = 0.2;
        home.heading = Math.atan2(this.step.x - this.drop.x, this.step.z - this.drop.z);
        home.want.face = sp.pos;
        sp.flinch();
        this.home = true;
        this.save();
      }
    }
    if (L >= 0) {
      const k = ss(t, L, L + V.grow);
      this.orb.scale.setScalar(0.5 * (1 - ss(t, L, L + 0.25)));
      this.orb.visible = t < L + 0.25;
      home.size = (k < 1 ? 0.2 + 0.8 * k + 0.25 * Math.sin(k * Math.PI) : 1);
      // A moment while the dust thins; then they go to each other, and jump for joy.
      if (passed(L + 0.18)) this.d.puff(v1.copy(this.drop).setY(this.drop.y + 0.6), 10, 0.6, 2.4);
      if (passed(L + V.go)) {
        v1.subVectors(this.drop, this.step).setY(0);
        const far = v1.length();
        v1.normalize();
        const meet = (who: typeof sp, from: THREE.Vector3, k: number, speed: number, face: THREE.Vector3) => {
          const at = new THREE.Vector3().copy(this.step).addScaledVector(v1, far * 0.5 + k * 0.75);
          at.y = this.d.ground(at.x, at.z);
          who.haste = speed;
          who.teleport(from);
          who.want = { at, face, pose: 'stand', icon: null, lead: false, settled: true };
        };
        meet(sp, sp.pos, -1, 6, home.pos);
        meet(home, home.pos, 1, 4.5, sp.pos);
        fx.chirp(true);
      }
      if (passed(L + V.cheer)) { sp.celebrate(); home.celebrate(); fx.fanfare(0.1); }
    }
    this.orb.position.copy(this.orbAt);
    // The guide watches it come.
    if (L < 0) (sp.want.face as THREE.Vector3).copy(this.orbAt);
    // The camera: one place. It looks up to the crow coming in, follows the light down, and settles on the two.
    this.pos.copy(this.camV);
    if (L < 0) v1.copy(this.drop).lerp(this.step, 0.5).setY(this.drop.y + 1.2).lerp(this.orbAt, this.letGo < 0 ? 0.38 : 0.3);
    else v1.copy(home.pos).lerp(sp.pos, 0.5).setY(this.drop.y + 0.9);
    this.atNow.lerp(v1, 1 - Math.exp(-4 * dt));
    this.at.copy(this.atNow);
    this.fov = FOV.village;
    if (L >= 0 && t >= L + V.out) this.enter('cutBack');
  }

  /** The camera for this frame while this has it. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3; fov: number } | null {
    return this.state === 'playing' ? { pos: this.pos, at: this.at, fov: this.fov } : null;
  }

  dispose() { this.group.removeFromParent(); }
}
