import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';
import { colored, lathe, merge, PartBatch, Spring } from '../mobs/parts';
import type { IconName } from './icons';
import { bubbleCanvas, tex } from './icons';
import { Billboard } from './overlay';

// The hearth spirit: a small round being made of the warmth of a house. A
// soft pebble-round body with big painted eyes, stubby arms for pantomime,
// two little feet and a glowing ember in its chest. Cold, it's the pale
// blue-grey of ash; as the house comes back to life it warms through apricot
// to a bright glowing amber.
//
// It never speaks. The director tells it where to be and what it wants
// (`want`), and queues one-shot acts (celebrate, greet, hint); everything it
// "says" is posture, gesture, the icon in its bubble and a few sounds.

const R = 0.34;
/** One ushering sweep and its rest (s). */
const USHER_CYCLE = 3.4;
/** Rallying you along: a wave every this many seconds on the way, and the point-then-wave round at the spot (s). */
const RALLY_GO = 5, RALLY_AT = 3.8;
/** One round of the foreman's pantomime (fetch / present) and its rest (s). */
const FOREMAN_CYCLE = 5.2;
/** One round of the lasso lesson: twirl, throw, "your turn", rest (s). */
const LASSO_CYCLE = 4.8;
/** Its own little loop of rope: whirled overhead, then flung. */
const LOOP_R = 0.2;
const COLD = new THREE.Color('#b8c6d8');
const MID = new THREE.Color('#ecc9ae');
const WARM = new THREE.Color('#f0924c');
/** Sunk in despair (`sullen`): ash with a little warmth left in it. */
const ASHEN = new THREE.Color('#aab4c6');
/** Seconds between its sighs, and between its tears, when it's sullen. */
const SIGH = 6.5, TEAR = 4.3;
const HEART_COLD = new THREE.Color('#6d6874');
const HEART_WARM = new THREE.Color('#ffb24a');

/**
 * A pat on the head (seconds into the act): the explorer's hand comes down
 * on each beat (story.ts drives it from `patTime`), stays for a little
 * stroke until `end`, then the spirit has `joy` seconds of delight.
 */
export const PAT = { beats: [0.6, 1.1, 1.6], end: 2.1, joy: 1.3 };

export type Pose = 'stand' | 'sit' | 'shiver' | 'warm' | 'point';
/** What it says with its arms to company (the village milling about, story/village.ts). */
export type Gesture = 'wave' | 'wide' | 'point' | 'hop' | 'cheer' | 'nod';

export interface Want {
  at: THREE.Vector3;
  /** What it keeps looking/pointing at from there. */
  face: THREE.Vector3 | null;
  pose: Pose;
  icon: IconName | null;
  /** How many of `icon` it still wants (null: not a tally; 0: had all it
   *  wanted, so no bubble). */
  count?: number | null;
  /** How many the whole task takes, shown as "×n" beside the icon. */
  total?: number | null;
  /** Wait for the explorer to keep up while travelling. */
  lead: boolean;
  /** Leading at a stride: no stops on the way to turn and wave, and it
   *  only waits once you're this far behind, m (otherwise 10, with stops). */
  lag?: number;
  /** Ushering you in: standing beside this doorway (a point in its
   *  opening), it sweeps an arm from you into it, "after you". */
  usher?: THREE.Vector3;
  /** Running the job from its spot: "go and get that" (it points out at
   *  `fetch`, where the material is, then waves you back to itself: "and
   *  bring it here"). */
  fetch?: THREE.Vector3;
  /** "Build this": it throws its arms wide at the sketch all round it
   *  (`face`), looking it up and down, then back to you. */
  present?: boolean;
  /** "Like this": it whirls a little loop of its own over its head and
   *  flings it out at this (a creature), then looks round at you. */
  lasso?: THREE.Vector3;
  /** "Come on, this way!": on the way to `at` its bubble stays up and it
   *  keeps turning to wave you on; there, it hops and points at `face`,
   *  and waves you over, round and round. */
  rally?: boolean;
  /** Nothing to ask for: it just enjoys being there (no pointing; watches
   *  `face`, looks round at you now and then when you're close). */
  settled?: boolean;
}

type Act =
  | { kind: 'celebrate'; t: number }
  | { kind: 'greet'; t: number }
  /** Hurry to `to` (e.g. out of the cabin), then carry on with the queue. */
  | { kind: 'pat'; t: number }
  /** Hurry over to you and cheer: you did it. */
  | { kind: 'praise'; t: number; phase: 'go' | 'cheer' }
  | { kind: 'emerge'; t: number; to: THREE.Vector3 }
  | { kind: 'hint'; t: number; phase: 'go' | 'tug' | 'back' | 'hop'; target: THREE.Vector3; face: THREE.Vector3 | null; hops: number };

export interface SpiritHooks {
  ground(x: number, z: number): number;
  /** Waypoints from a to b (around the cabin, through its door). */
  route(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[];
  sound(name: 'chirp' | 'coo' | 'excited' | 'whimper' | 'call' | 'tug'): void;
  sparkle(at: THREE.Vector3, n: number): void;
  /** A few hearts floating up. */
  hearts?(at: THREE.Vector3): void;
}

function bodyGeometry(): THREE.BufferGeometry {
  // Pebble-round, a flat seat underneath and a soft point on top.
  const prof: [number, number][] = [
    [0.0, -0.86], [0.42, -0.84], [0.72, -0.72], [0.92, -0.46], [1.0, -0.12], [0.98, 0.18], [0.88, 0.46],
    [0.7, 0.7], [0.46, 0.88], [0.2, 0.98], [0.0, 1.02],
  ];
  const body = lathe(prof.map(([r, y]) => [r * R, y * R] as [number, number]), 56).scale(1.04, 1, 0.96);
  // A cream belly patch, slightly proud of the surface, with the ember at its heart.
  const belly = new THREE.SphereGeometry(1, 28, 18).scale(0.4 * R, 0.3 * R, 0.1 * R);
  belly.rotateX(0.55);
  belly.translate(0, -0.56 * R, 0.8 * R);
  const g = merge([colored(body, '#ffffff', 1), colored(belly, '#fff5e8', 0)]);
  // The belly only takes a hint of the body's tint.
  const tint = g.getAttribute('aTint') as THREE.BufferAttribute;
  const bodyN = body.index ? body.index.count : body.attributes.position.count;
  for (let i = bodyN; i < tint.count; i++) tint.setX(i, 0.55);
  return g;
}

function armGeometry() {
  return colored(new THREE.CapsuleGeometry(0.06, 0.13, 6, 14).translate(0, -0.09, 0), '#ffffff');
}

function footGeometry() {
  return colored(new THREE.SphereGeometry(1, 18, 12).scale(0.085, 0.055, 0.11).translate(0, 0.045, 0.02), '#ffffff');
}

function heartGeometry() {
  return colored(new THREE.SphereGeometry(1, 16, 12).scale(0.045, 0.045, 0.02), '#ffffff');
}

const tv = new THREE.Vector3();
const tv2 = new THREE.Vector3();

export class Spirit {
  readonly group = new THREE.Group();
  readonly batches: PartBatch[];
  private bodyB: PartBatch;
  private armB: PartBatch;
  private footB: PartBatch;
  private heartB: PartBatch;
  readonly bubble: Billboard;
  private bubbleIcon: IconName | null = null;
  private bubbleCount = 0;
  private bubbleNear = false;
  private bubbleA = 0;
  private bubblePop = 0;

  readonly pos = new THREE.Vector3();
  private vel = new THREE.Vector3();
  heading = 0;
  /** 0 = cold ash .. 1 = a bright warm glow. Eases toward `warmthTarget`. */
  warmth = 0;
  warmthTarget = 0;
  want: Want;
  private acts: Act[] = [];
  private path: THREE.Vector3[] = [];
  private pathTo = new THREE.Vector3(1e9, 0, 0);
  private waiting = false;
  private rallyT = 0;
  private moving = false;

  // Skeleton (never in the scene; its matrices feed the batches).
  private root = new THREE.Object3D();
  private body = new THREE.Object3D();
  private arms = [new THREE.Object3D(), new THREE.Object3D()];
  private feet = [new THREE.Object3D(), new THREE.Object3D()];
  private heart = new THREE.Object3D();

  private t = 0;
  private hop = 0;
  private hopH = 0;
  private squash = new Spring();
  private tilt = new Spring();
  private sit = 0;
  private armX = [new Spring(), new Spring()];
  private armZ = [new Spring(), new Spring()];
  private blinkAt = 1;
  private look = new THREE.Vector2();
  private eye = new THREE.Vector4(0, 0, 1, 0);
  private happyT = 0;
  private whimperT = 3;
  private pointT = 0;
  private usherT = 0;
  private foremanT = 0;
  private lassoT = 0;
  /** Its own loop of rope for the lasso lesson (hidden otherwise). */
  private loop = new THREE.Mesh(new THREE.TorusGeometry(LOOP_R, 0.026, 6, 24), makeSolidMaterial('#c9a26b', 0, { keep: 0.6 }));
  /** Where the flung loop set off from, and where it's headed. */
  private loopFrom = new THREE.Vector3();
  private loopTo = new THREE.Vector3();
  private glanceT = 4;
  private beckonT = 0;
  private spin = 0;
  /** 0..1: the warm flush of being patted (glow, blush, heart). */
  private patGlow = 0;
  private tint = new THREE.Color();
  private heartTint = new THREE.Color();
  player = new THREE.Vector3();
  /** Its yard: it won't go further than `range` from `home` (the cabin). */
  home: THREE.Vector3 | null = null;
  range = 45;

  /** Pull a destination back inside the yard; true if it had to. */
  keepHome(p: THREE.Vector3): boolean {
    if (!this.home) return false;
    const dx = p.x - this.home.x, dz = p.z - this.home.z;
    const d = Math.hypot(dx, dz);
    if (d <= this.range) return false;
    p.x = this.home.x + (dx / d) * this.range;
    p.z = this.home.z + (dz / d) * this.range;
    return true;
  }

  /**
   * On its little bike (story/journey.ts): it sits on the saddle at `seat`,
   * facing `heading`, hands forward on the bars, and looks at `look` (or
   * straight ahead). The director moves it; its own brain rests.
   */
  riding: { seat: THREE.Vector3; heading: number; look: THREE.Vector3 | null } | null = null;

  /**
   * Something dreadful is happening (the giant): 'scared' trembles, wide-eyed,
   * arms pulled in; 'sad' reaches both arms up after what's been taken, mouth
   * turned right down, eyes heavy. 'down' is what's left afterwards: heavy
   * eyes and a frown, but it gets on with things (and still brightens when
   * something good happens). 'brave' is its mind made up (the send-off,
   * story/journey.ts): brows set (lightly: resolve, not a glare, and only
   * while it looks at the trail; turned to you its eyes are simply wide),
   * mouth a firm line, stood up straight.
   */
  mood: 'scared' | 'sad' | 'down' | 'brave' | null = null;
  private brow = 0;

  /**
   * Heavy-hearted (the walk home after the giant, story/journey.ts): it
   * trudges instead of trotting, bent forward, arms hanging, eyes on the
   * ground, and isn't cheered by seeing you.
   *
   * The lowest it gets, below every `mood`: its fire sunk to ash (colour
   * and glow, whatever its warmth), brows up in the middle, eyes big and wet, its lip
   * trembling, a heaved sigh every so often, and tears.
   */
  sullen = false;
  /** `sullen`, eased in and out. */
  private gloom = 0;
  /** A sad `mood`, eased in and out. */
  private woe = 0;
  private mouthHalf = -1;

  /** Snatched up by one of the giant's crows: it hangs at this point (which moves), arms up, legs going. */
  carried: THREE.Vector3 | null = null;

  /** How big it's drawn, where it stands (1: itself). Not `group.scale`: the group is the world's, and that would move it. */
  size = 1;

  /** In a hurry (the village running from the giant): how fast it goes to where it's wanted, m/s. */
  haste: number | null = null;
  /**
   * In company (the village, story/village.ts): what it's saying to whoever
   * it's turned to (`want.face`) while it's settled there. 'point' turns and
   * points out `pointing`.
   */
  gesture: Gesture | null = null;
  pointing: THREE.Vector3 | null = null;
  private flinchT = 0;
  /** A start: one sharp hop where it stands. */
  flinch() { this.flinchT = 0.38; }

  /** Debug: pin the heading (close-up shots). */
  hold: number | null = null;
  /** Debug: pin the warmth. */
  holdWarmth: number | null = null;
  /** The explorer's body position (hint tugs walk up to it). */
  playerVel = new THREE.Vector3();

  constructor(private hooks: SpiritHooks, start: THREE.Vector3) {
    const face = {
      keep: 0.86,
      eyeOrigin: new THREE.Vector3(0, 0.04 * R, 0),
      eyePos: [0.36, 0.2], eyeSize: [0.22, 0.27], pupil: [0.085, 0.115], lookRange: [0.13, 0.11], eyeTilt: 0.05,
      mouthW: [-0.14, 0.05, 6], blush: [0.62, -0.05, 0.14, 0.08], blushCol: '#f08a7a',
    } as const;
    this.bodyB = new PartBatch(bodyGeometry(), {
      ...face, eyePos: [...face.eyePos], eyeSize: [...face.eyeSize], pupil: [...face.pupil], lookRange: [...face.lookRange],
      mouthW: [...face.mouthW], blush: [...face.blush],
    }, 2);
    this.armB = new PartBatch(armGeometry(), { keep: 0.86 }, 4);
    this.footB = new PartBatch(footGeometry(), { keep: 0.86 }, 4);
    this.heartB = new PartBatch(heartGeometry(), { keep: 0.95 }, 2);
    this.batches = [this.bodyB, this.armB, this.footB, this.heartB];
    for (const b of this.batches) this.group.add(b.mesh);
    this.loop.visible = false;
    this.loop.frustumCulled = false;
    this.group.add(this.loop);
    this.bubble = new Billboard(tex(bubbleCanvas('axe')), 0.95, 44);
    this.bubble.alpha = 0;

    this.root.add(this.body);
    this.body.add(this.heart, ...this.arms);
    this.root.add(...this.feet);
    this.heart.position.set(0, -0.52 * R, 0.86 * R);
    this.heart.rotation.x = 0.55;
    this.arms[0].position.set(0.9 * R, -0.05 * R, 0.08 * R);
    this.arms[1].position.set(-0.9 * R, -0.05 * R, 0.08 * R);
    this.feet[0].position.set(0.42 * R, 0, 0.18 * R);
    this.feet[1].position.set(-0.42 * R, 0, 0.18 * R);
    this.pos.copy(start);
    this.want = { at: start.clone(), face: null, pose: 'stand', icon: null, lead: false };
  }

  get busy() { return this.acts.length > 0; }
  /** On its way somewhere (the pasture gate swings open for it). */
  get travelling() { return this.moving; }
  get arrived() { return !this.moving && !this.acts.length && this.pos.distanceTo(this.want.at) < 0.6; }
  /**
   * Idle at home with nothing to ask of you (settled: sitting by the fire or
   * pottering round the yard), at its spot: free to be patted. Never while
   * it's pointing, hinting, leading or riding.
   */
  get idle() {
    const home = !this.home || Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) < this.range;
    return !!this.want.settled && !this.want.icon && home && !this.riding && !this.waiting && this.arrived;
  }
  /** Seconds into a pat (-1 when not being patted). */
  get patTime() { const a = this.acts[0]; return a?.kind === 'pat' ? a.t : -1; }

  /** Lean up for a pat on the head; false if it's busy with something. */
  pat(): boolean {
    if (!this.idle) return false;
    this.acts.push({ kind: 'pat', t: 0 });
    return true;
  }
  /** The hand went away early: skip straight to being pleased about it. */
  endPat() {
    const a = this.acts[0];
    if (a?.kind === 'pat' && a.t < PAT.end) { this.acts.shift(); this.happyT = 1.5; }
  }
  /** The top of its head, world space (where a patting hand lands). */
  headTop(out: THREE.Vector3) {
    return this.body.localToWorld(out.set(0, 0.98 * R, 0.2 * R));
  }

  teleport(p: THREE.Vector3) {
    this.pos.copy(p);
    this.path = [];
    this.pathTo.set(1e9, 0, 0);
  }

  celebrate() {
    // The last piece landing and the step finishing both cheer, a moment
    // apart: one jump, not a restarted one.
    if (this.acts.some((a) => a.kind === 'celebrate' && a.t < 1)) return;
    this.acts = this.acts.filter((a) => a.kind !== 'celebrate');
    this.acts.push({ kind: 'celebrate', t: 0 });
  }
  /** Wave hello; with `at`, first hurry there (out the door to meet you). */
  greet(at?: THREE.Vector3) {
    // Already out fetching you (a hint): it's met you where it stands, so it
    // doesn't walk back to its spot indoors first and come out again.
    const out = this.acts.some((a) => a.kind === 'hint');
    this.acts = this.acts.filter((a) => a.kind !== 'hint');
    if (at && !out) this.acts.push({ kind: 'emerge', t: 0, to: at.clone() });
    this.acts.push({ kind: 'greet', t: 0 });
  }
  hint(target: THREE.Vector3, face: THREE.Vector3 | null) {
    if (this.acts.some((a) => a.kind === 'hint')) return;
    this.acts.push({ kind: 'hint', t: 0, phase: 'go', target: target.clone(), face: face?.clone() ?? null, hops: 0 });
  }
  cancelActs() { this.acts = []; }
  /** You did it: it hurries over to you, cheers and throws up hearts. */
  praise() {
    this.acts = this.acts.filter((a) => a.kind === 'pat');
    this.acts.push({ kind: 'praise', t: 0, phase: 'go' });
  }
  /** Nothing's happening: start the foreman's pantomime over, with a call. */
  nudge() {
    this.foremanT = 0;
    this.hooks.sound('call');
  }

  /** Walk toward `to` along routed waypoints at `speed`; returns true once there. */
  private travel(to: THREE.Vector3, speed: number, dt: number): boolean {
    if (this.pathTo.distanceTo(to) > 0.5) {
      this.path = this.hooks.route(this.pos, to);
      this.pathTo.copy(to);
    }
    while (this.path.length && Math.hypot(this.path[0].x - this.pos.x, this.path[0].z - this.pos.z) < 0.35) this.path.shift();
    if (!this.path.length) {
      this.vel.multiplyScalar(Math.exp(-10 * dt));
      return true;
    }
    const n = this.path[0];
    tv.set(n.x - this.pos.x, 0, n.z - this.pos.z);
    const d = tv.length();
    const last = this.path.length === 1;
    const sp = last ? Math.min(speed, d * 2.5 + 0.6) : speed;
    tv.multiplyScalar(sp / Math.max(d, 1e-3));
    this.vel.lerp(tv, 1 - Math.exp(-8 * dt));
    return false;
  }

  private face(target: THREE.Vector3 | null, dt: number, rate = 6) {
    let h = this.heading;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.4) h = Math.atan2(this.vel.x, this.vel.z);
    else if (target) h = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    let dh = h - this.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    this.heading += dh * (1 - Math.exp(-rate * dt));
  }

  /**
   * The lesson's loop: whirled flat over its hand, then flung out in a lob
   * that drops over the creature's head, and melts away there (it's only
   * showing you: the real catch is yours).
   */
  private placeLoop(twirl: number, fling: number, at: THREE.Vector3 | null) {
    const hand = this.arms[0].localToWorld(tv2.set(0, -0.21, 0));
    const l = this.loop;
    l.visible = false;
    if (!at) return;
    if (twirl > 0.05) {
      const a = this.t * 13;
      l.visible = true;
      l.position.set(hand.x + Math.cos(a) * 0.1, hand.y + 0.03, hand.z + Math.sin(a) * 0.1);
      l.rotation.set(Math.PI / 2 + Math.sin(a) * 0.25, 0, a);
      l.scale.setScalar(twirl);
      this.loopFrom.copy(hand);
      // Out to the creature (or as far as a little throw goes), round its neck.
      tv.subVectors(at, hand).setY(0);
      const d = Math.min(14, tv.length());
      this.loopTo.copy(hand).addScaledVector(tv.normalize(), d);
      this.loopTo.y = this.hooks.ground(this.loopTo.x, this.loopTo.z) + 1.1;
      return;
    }
    if (fling > 0) {
      const k = THREE.MathUtils.clamp(((this.lassoT % LASSO_CYCLE) - 1.95) / 0.7, 0, 1);
      const drop = THREE.MathUtils.clamp(((this.lassoT % LASSO_CYCLE) - 2.65) / 0.3, 0, 1);
      if (drop >= 1) return;
      l.visible = true;
      l.position.lerpVectors(this.loopFrom, this.loopTo, THREE.MathUtils.smootherstep(k, 0, 1) * 0.3 + k * 0.7);
      l.position.y += Math.sin(k * Math.PI) * (0.6 + this.loopFrom.distanceTo(this.loopTo) * 0.12) - drop * 0.5;
      l.rotation.set(Math.PI / 2 + Math.sin(k * 9) * 0.15 * (1 - k), 0, this.t * 16 * (1 - k * 0.8));
      // It opens out wide in flight, then settles and fades.
      l.scale.setScalar((1 + k * 2.2) * (1 - drop));
    }
  }

  update(dt: number) {
    if (dt <= 0) return;
    this.t += dt;
    const e = (k: number) => 1 - Math.exp(-k * dt);
    this.warmth += (this.warmthTarget - this.warmth) * e(0.8);
    if (this.holdWarmth !== null) this.warmth = this.holdWarmth;
    const w = this.want;
    const toPlayer = Math.hypot(this.player.x - this.pos.x, this.player.z - this.pos.z);

    // ---- brain
    let lookAt: THREE.Vector3 | null = this.player;
    let pose: Pose = w.pose;
    let armsUp = 0, beckon = 0, reach = 0, pointAt: THREE.Vector3 | null = null;
    /** The ushering arm's sweep, 0 (out to you) .. 1 (into the doorway), and how much it's showing. */
    let usher = 0, usherOn = 0;
    /** The foreman's arms-wide "build this", 0..1. */
    let present = 0;
    /** The lasso lesson: whirling overhead (0..1), and the throw's arm (0..1). */
    let twirl = 0, fling = 0;
    let faceAt: THREE.Vector3 | null = null;
    let speed = this.haste ?? 3.1;
    let happy = false;
    let bounce = 0;
    let patted = 0;
    const ride = this.riding;
    const act = ride ? undefined : this.acts[0];
    this.moving = false;
    if (ride) {
      this.vel.set(0, 0, 0);
      pose = 'sit';
      lookAt = ride.look;
    } else if (act) {
      /** Did the act just pass `k` seconds? (From the time before this frame:
       *  `t - dt` can round to just past `k` and miss it.) */
      const t0 = act.t;
      const passed = (k: number) => t0 < k && act.t >= k;
      act.t += dt;
      if (act.kind === 'celebrate') {
        this.vel.multiplyScalar(Math.exp(-10 * dt));
        happy = true;
        armsUp = 1;
        bounce = 1;
        this.spin = act.t > 0.45 && act.t < 1.05 ? (act.t - 0.45) / 0.6 : 0;
        if (act.t > 1.8) { this.acts.shift(); this.happyT = 1.5; this.spin = 0; }
      } else if (act.kind === 'pat') {
        // Eyes shut, pressing up into the hand, a squish and a coo on every
        // pat; once the hand lifts, a bounce and a spin of pure delight.
        this.vel.multiplyScalar(Math.exp(-10 * dt));
        happy = true;
        if (act.t < PAT.end) {
          patted = 1;
          for (const b of PAT.beats) {
            if (passed(b)) {
              this.squash.v -= 2.4;
              this.hooks.sound('coo');
              this.hooks.sparkle(this.headTop(tv2).setY(tv2.y + 0.12), 2);
            }
          }
        } else {
          armsUp = 1;
          bounce = 1;
          this.spin = act.t > PAT.end + 0.25 && act.t < PAT.end + 0.85 ? (act.t - PAT.end - 0.25) / 0.6 : 0;
          if (passed(PAT.end)) {
            this.hooks.sound('excited');
            this.hooks.sparkle(tv2.set(this.pos.x, this.pos.y + R * 2.4, this.pos.z), 6);
          }
          if (act.t > PAT.end + PAT.joy) { this.acts.shift(); this.happyT = 2.5; this.spin = 0; }
        }
      } else if (act.kind === 'praise') {
        if (act.phase === 'go') {
          // Over to you (not all the way from across the valley: from far
          // off it cheers where it is).
          speed = 5.2;
          this.moving = true;
          lookAt = this.player;
          tv2.set(this.player.x - this.pos.x, 0, this.player.z - this.pos.z);
          const stop = tv2.clone().setLength(Math.max(0, tv2.length() - 1.6));
          tv2.set(this.pos.x + stop.x, 0, this.pos.z + stop.z);
          const there = toPlayer < 2.2 || toPlayer > 30 || this.travel(tv2, speed, dt);
          if (there || act.t > 7) { act.phase = 'cheer'; act.t = 0; this.moving = false; }
        } else {
          // A big jump for joy, two spins, hearts and sparkles, and then
          // a long happy look at you.
          this.vel.multiplyScalar(Math.exp(-10 * dt));
          faceAt = this.player;
          happy = true;
          armsUp = act.t < 2.3 ? 1 : 0;
          bounce = act.t < 2.3 ? 1 : 0.3;
          this.spin = act.t > 0.4 && act.t < 1.6 ? ((act.t - 0.4) / 1.2) * 2 : 0;
          if (passed(0.05)) this.hooks.sound('excited');
          if (passed(0.5)) this.hooks.hearts?.(this.headTop(tv2).setY(tv2.y + 0.2));
          if (passed(1.7)) this.hooks.sound('coo');
          if (Math.floor(act.t / 0.5) !== Math.floor((act.t - dt) / 0.5) && act.t < 2.3) this.hooks.sparkle(tv2.set(this.pos.x, this.pos.y + R * 2.4, this.pos.z), 4);
          if (act.t > 3.4) { this.acts.shift(); this.happyT = 4; this.spin = 0; }
        }
      } else if (act.kind === 'greet') {
        this.vel.multiplyScalar(Math.exp(-8 * dt));
        beckon = act.t < 1.4 ? 1 : 0;
        bounce = act.t < 0.9 ? 0.6 : 0;
        if (act.t > 1.8) this.acts.shift();
      } else if (act.kind === 'emerge') {
        speed = 4.6;
        this.moving = true;
        pose = 'stand';
        lookAt = null;
        if (this.travel(act.to, speed, dt) || act.t > 8) { this.acts.shift(); this.moving = false; }
      } else if (act.kind === 'hint') {
        if (act.phase === 'go') {
          speed = 5.2;
          this.moving = true;
          tv2.set(this.player.x - this.pos.x, 0, this.player.z - this.pos.z);
          const stop = tv2.clone().setLength(Math.max(0, tv2.length() - 1.0));
          tv2.set(this.pos.x + stop.x, 0, this.pos.z + stop.z);
          // It never leaves its yard: past the edge it stops and calls you back.
          const clamped = this.keepHome(tv2);
          const there = this.travel(tv2, speed, dt);
          if (toPlayer < 1.3 || (there && !clamped) || act.t > 9) { act.phase = 'tug'; act.t = 0; }
          else if (there && clamped) { act.phase = 'hop'; act.t = 0; act.face = this.player.clone(); }
        } else if (act.phase === 'tug') {
          // Grab the coat and pull toward the target, three little tugs.
          this.vel.multiplyScalar(Math.exp(-10 * dt));
          reach = 1;
          const k = Math.floor(act.t / 0.45);
          if (k !== act.hops && k < 4) { act.hops = k; if (k > 0) this.hooks.sound('tug'); }
          const f = act.t % 0.45;
          tv.set(act.target.x - this.pos.x, 0, act.target.z - this.pos.z).normalize();
          this.pos.addScaledVector(tv, (f < 0.12 ? 1.2 : -0.35) * dt);
          if (act.t > 1.9) { act.phase = 'back'; act.t = 0; act.hops = 0; this.hooks.sound('call'); }
        } else if (act.phase === 'back') {
          speed = 4.6;
          this.moving = true;
          lookAt = act.target;
          if (this.travel(act.target, speed, dt) || act.t > 14) { act.phase = 'hop'; act.t = 0; }
        } else {
          this.vel.multiplyScalar(Math.exp(-10 * dt));
          bounce = 1;
          pointAt = act.face ?? act.target;
          lookAt = pointAt;
          if (act.t > 0.6 && act.hops === 0) { act.hops = 1; this.hooks.sound('call'); }
          if (act.t > 1.9) this.acts.shift();
        }
      }
    } else {
      // Go to the wanted spot, waiting for the explorer when leading.
      const dest = w.at;
      const far = this.pos.distanceTo(dest) > 0.6;
      if (far) {
        const lag = w.lead && toPlayer > (w.lag ?? 10) && Math.hypot(this.player.x - dest.x, this.player.z - dest.z) > Math.hypot(this.pos.x - dest.x, this.pos.z - dest.z) - 2;
        if (lag) this.waiting = true;
        if (this.waiting && (toPlayer < (w.lag ? w.lag * 0.5 : 6) || !w.lead)) this.waiting = false;
        const rc = w.rally && !w.lag && !this.waiting ? (this.rallyT += dt) % RALLY_GO : 9;
        if (rc < 1.3 && toPlayer < 30) {
          // A stop to turn and wave you on, with a hop.
          this.vel.multiplyScalar(Math.exp(-10 * dt));
          this.moving = true;
          faceAt = lookAt = this.player;
          beckon = 1;
          bounce = 0.5;
          if (rc - dt < 0.2 && rc >= 0.2) this.hooks.sound('call');
        } else if (this.waiting) {
          this.vel.multiplyScalar(Math.exp(-10 * dt));
          beckon = 1;
          this.beckonT -= dt;
          if (this.beckonT <= 0) { this.beckonT = 3.5; this.hooks.sound('call'); }
          bounce = 0.4;
        } else {
          this.moving = !this.travel(dest, speed, dt);
          lookAt = this.moving ? null : lookAt;
          pose = 'stand';
        }
      } else {
        this.vel.multiplyScalar(Math.exp(-10 * dt));
        this.path = [];
        if (w.settled) {
          // Content by the fire: it watches the flames and, when you're
          // close, looks round at you now and then, pleased you're there.
          const near = toPlayer < 7 && this.mood !== 'scared';
          this.glanceT -= dt;
          if (this.glanceT <= 0) this.glanceT = near ? 5 + Math.random() * 6 : 2;
          const glancing = near && this.glanceT < 1.8;
          if (glancing && this.glanceT + dt >= 1.8 && !this.sullen) this.happyT = Math.max(this.happyT, 1.4);
          lookAt = glancing ? this.player : w.face;
          const g = this.gesture;
          if (g) {
            // On its feet for it, turned to them.
            pose = 'stand';
            lookAt = faceAt = w.face;
            if (g === 'wave') { beckon = 1; bounce = 0.3; }
            else if (g === 'wide') present = 1;
            else if (g === 'point' && this.pointing) { pointAt = lookAt = this.pointing; faceAt = null; }
            else if (g === 'hop') bounce = 0.6;
            else if (g === 'cheer') { armsUp = 1; bounce = 0.8; happy = true; }
            else if (g === 'nod') { bounce = 0.2; this.happyT = Math.max(this.happyT, 0.3); }
          }
        } else if (w.rally && w.face) {
          // That way! Hopping, arm out at it; then round to you, waving you over.
          const c = (this.rallyT += dt) % RALLY_AT;
          if (c < 2.6) {
            pointAt = lookAt = w.face;
            bounce = 0.6;
            if (c - dt < 0.3 && c >= 0.3 && toPlayer < 40) this.hooks.sound('chirp');
          } else {
            faceAt = lookAt = this.player;
            beckon = 1;
            bounce = 0.4;
          }
        } else if (w.usher && toPlayer < 30) {
          // Ushering: turned between you and the doorway, it holds a hand
          // out to you, sweeps it round into the opening with a little hop,
          // holds it there looking at you, then lets it drop and goes again.
          const c = (this.usherT += dt) % USHER_CYCLE;
          usherOn = c < 2.3 ? 1 : 0;
          usher = THREE.MathUtils.smootherstep(c, 0.45, 1.05);
          bounce = c > 0.95 && c < 1.45 ? 0.5 : 0;
          if (c - dt < 1.0 && c >= 1.0 && this.usherT < USHER_CYCLE * 3) this.hooks.sound('chirp');
          tv2.set(this.player.x - this.pos.x, 0, this.player.z - this.pos.z).normalize();
          tv.set(w.usher.x - this.pos.x, 0, w.usher.z - this.pos.z).normalize();
          faceAt = tv2.addScaledVector(tv, 0.45).add(this.pos);
          lookAt = usher > 0.5 && c < 1.7 ? w.usher : this.player;
        } else if (w.lasso && toPlayer < 30) {
          // The lasso lesson: turned to the creature, it whirls a loop over
          // its head, flings it out at it, then looks round at you with a
          // hop ("now you").
          const c0 = this.lassoT % LASSO_CYCLE;
          const c = (this.lassoT += dt) % LASSO_CYCLE;
          const passed = (k: number) => c0 < k && c >= k;
          const first = this.lassoT < LASSO_CYCLE * 3;
          if (c < 2.95) {
            faceAt = w.lasso;
            lookAt = w.lasso;
            twirl = THREE.MathUtils.smoothstep(c, 0.2, 0.5) * (c < 1.95 ? 1 : 0);
            fling = c >= 1.95 ? 1 - THREE.MathUtils.smoothstep(c, 2.6, 2.95) : 0;
            bounce = c > 0.5 && c < 1.9 ? 0.25 : 0;
            if (first && passed(1.95)) this.hooks.sound('chirp');
          } else if (c < 4.3) {
            faceAt = this.player;
            bounce = c < 3.5 ? 0.55 : 0;
            if (passed(3.0)) this.happyT = Math.max(this.happyT, 0.9);
          }
        } else if ((w.fetch || w.present) && toPlayer < 45) {
          // The foreman: it stays put and runs the job with its arms.
          const c = (this.foremanT += dt) % FOREMAN_CYCLE;
          const first = this.foremanT < FOREMAN_CYCLE * 3;
          if (w.fetch) {
            // Turn and point out at where the stuff is, with a hop and a
            // chirp; then round to you, waving you back in to itself.
            if (c > 0.5 && c < 2.1) {
              pointAt = lookAt = w.fetch;
              bounce = c > 0.7 && c < 1.2 ? 0.6 : 0;
              if (first && c - dt < 0.75 && c >= 0.75) this.hooks.sound('chirp');
            } else if (c > 2.4 && c < 3.6) {
              faceAt = this.player;
              beckon = 1;
            }
          } else if (w.face && c > 0.4 && c < 2.2) {
            // Arms flung wide at the sketch round it, glancing up it.
            faceAt = this.player;
            present = THREE.MathUtils.smoothstep(c, 0.4, 0.7) * (1 - THREE.MathUtils.smoothstep(c, 1.9, 2.2));
            lookAt = c < 1.5 ? w.face : this.player;
            bounce = c > 0.6 && c < 1.1 ? 0.5 : 0;
            if (first && c - dt < 0.65 && c >= 0.65) this.hooks.sound('chirp');
          }
        } else {
          // Idle at the spot: glance at the target and point now and then.
          this.pointT -= dt;
          if (w.face && this.pointT < -2.6) this.pointT = 1.6;
          if (w.face && (this.pointT > 0 || pose === 'point')) { pointAt = w.face; lookAt = w.face; }
          if (pose === 'warm' && w.face) lookAt = w.face;
        }
      }
      if (pose === 'shiver' && toPlayer < 16) {
        this.whimperT -= dt;
        if (this.whimperT <= 0) { this.whimperT = 6 + Math.random() * 3; this.hooks.sound('whimper'); }
      }
    }
    this.pos.addScaledVector(this.vel, dt);
    const gy = this.hooks.ground(this.pos.x, this.pos.z);
    if (ride) this.pos.copy(ride.seat).setY(ride.seat.y - 0.05);
    else if (this.carried) { this.pos.copy(this.carried); this.vel.set(0, 0, 0); }
    else this.pos.y += (gy - this.pos.y) * e(20);
    const rest = w.settled && !act && !this.moving;
    this.face(this.moving ? null : (act?.kind === 'hint' && act.phase === 'tug') || act?.kind === 'pat' ? this.player : (faceAt ?? pointAt ?? (pose === 'warm' || rest ? w.face : lookAt)), dt, faceAt ? 3 : 6);
    if (!faceAt) this.usherT = 0;
    if (!(w.fetch || w.present) || act || this.moving) this.foremanT = 0;
    if (!w.lasso || act || this.moving) this.lassoT = 0;
    if (ride) this.heading = ride.heading;
    if (this.hold !== null) this.heading = this.hold;

    if (this.flinchT > 0) { this.flinchT -= dt; bounce = Math.max(bounce, 1.3); }

    // ---- body animation
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const walking = hs > 0.3;
    // Trotting hops; celebration and hints bounce higher. Sullen, it barely
    // lifts its feet.
    const low = this.sullen && !act && !this.riding;
    this.gloom += ((low ? 1 : 0) - this.gloom) * e(1.5);
    const gloom = this.gloom;
    // A sigh: it heaves up, then sinks lower than before.
    const sp = (this.t % SIGH) / 2.2;
    const sigh = low && sp < 1 ? Math.sin(sp * Math.PI * 2) * (sp < 0.5 ? 0.6 : 1) : 0;
    const hopRate = walking ? (low ? 1.7 + hs * 0.3 : 3.4 + hs * 0.5) : bounce > 0 ? 2.6 : 0;
    if (hopRate > 0) this.hop += dt * hopRate;
    else this.hop = Math.round(this.hop);
    const ph = this.hop % 1;
    const air = hopRate > 0 ? Math.sin(ph * Math.PI) : 0;
    const hopTarget = walking ? (low ? 0.012 : 0.1 + hs * 0.018) : bounce * 0.42;
    this.hopH += (hopTarget - this.hopH) * e(8);
    const lift = air * this.hopH;
    const landing = hopRate > 0 && ph < 0.12 ? 1 - ph / 0.12 : 0;
    const sq = this.squash.step(-landing * (walking ? 0.12 : 0.22) * (hopRate > 0 ? 1 : 0) + air * 0.08, 180, 14, dt);
    const mood = this.mood;
    const shiver = mood === 'scared' ? 1 : mood === 'sad' ? 0.3 : pose === 'shiver' && !walking && !act ? 1 : pose === 'warm' && this.warmth < 0.9 && !walking && !act ? 0.4 : 0;
    this.sit += ((pose === 'sit' && !walking && !act ? 1 : 0) - this.sit) * e(5);

    this.root.position.copy(this.pos);
    this.root.position.x += Math.sin(this.t * 55) * 0.008 * shiver;
    this.root.rotation.y = this.heading + this.spin * Math.PI * 2;
    this.root.scale.setScalar(this.size);
    const breathe = Math.sin(this.t * 2.1) * 0.02;
    const sy = 1 + sq + breathe - this.sit * 0.08 - gloom * 0.05 + sigh * 0.055;
    this.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    this.body.position.y = R * 0.86 * sy + lift - this.sit * 0.07;
    // On a slope the flat seat would cut into the hill ahead (a trot's hop hides it; a trudge doesn't).
    if (low && walking) {
      const fx = Math.sin(this.heading) * R, fz = Math.cos(this.heading) * R;
      this.body.position.y += Math.max(0, this.hooks.ground(this.pos.x + fx, this.pos.z + fz) - this.pos.y, this.hooks.ground(this.pos.x - fx, this.pos.z - fz) - this.pos.y);
    }
    this.patGlow += ((patted || act?.kind === 'pat' ? 1 : 0) - this.patGlow) * e(patted ? 3 : 0.8);
    const lean = this.tilt.step(THREE.MathUtils.clamp(hs * 0.05, 0, 0.25) - this.sit * 0.12 + (reach ? -0.2 : 0) + (pose === 'warm' ? 0.1 : 0) - patted * 0.16 + (low ? (0.36 - sigh * 0.1) * (1 - this.sit * 0.6) : 0), 90, 12, dt);
    // Patted: a slow contented wiggle under the hand.
    const wiggle = Math.sin(this.t * 6.5) * 0.08 * patted;
    // Bent forward, the seat's front edge drops: lift it clear.
    this.body.position.y += Math.max(0, Math.sin(lean)) * R * 0.8 * (low ? 1 : 0);
    this.body.rotation.set(lean, 0, Math.sin(this.t * 42) * 0.03 * shiver + (walking ? Math.sin(this.hop * Math.PI * 2) * (low ? 0.1 : 0.06) : 0) + (rest ? Math.sin(this.t * 0.9) * 0.045 * this.sit : 0) + wiggle);

    // Feet: little alternating steps, tucked forward when sitting.
    for (let k = 0; k < 2; k++) {
      const f = this.feet[k];
      const s = k ? -1 : 1;
      const step = walking ? Math.sin(this.hop * Math.PI * 2 + k * Math.PI) : 0;
      f.position.set(s * 0.42 * R, lift * 0.85 + Math.max(0, step) * (low ? 0.015 : 0.05), 0.18 * R + step * (low ? 0.045 : 0.06) + this.sit * 0.14);
      f.rotation.x = -this.sit * 0.9 + step * 0.3;
      f.rotation.y = s * 0.2;
    }

    // Arms: rest out a little; hug when shivering; up when celebrating;
    // beckon with one; both reach for the hearth or the explorer's coat;
    // point with the right.
    let pointArm = -1;
    if (pointAt) {
      tv.subVectors(pointAt, this.pos);
      pointArm = 0;
    }
    // Ushering: the arm on the doorway's side, horizontal (x = -pi/2) with
    // z its bearing (0 = straight ahead, + toward the +x side), swept from
    // toward you to toward the doorway.
    let usherArm = -1, usherZ = 0;
    if (usherOn && w.usher) {
      const h = this.heading, dx = w.usher.x - this.pos.x, dz = w.usher.z - this.pos.z;
      const door = Math.atan2(dx * Math.cos(h) - dz * Math.sin(h), dx * Math.sin(h) + dz * Math.cos(h));
      const you = Math.atan2((this.player.x - this.pos.x) * Math.cos(h) - (this.player.z - this.pos.z) * Math.sin(h), (this.player.x - this.pos.x) * Math.sin(h) + (this.player.z - this.pos.z) * Math.cos(h));
      usherArm = door >= 0 ? 0 : 1;
      const lim = (a: number) => THREE.MathUtils.clamp(a, -2.1, 2.1);
      usherZ = THREE.MathUtils.lerp(lim(you * 0.85), lim(door), usher);
    }
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      let x = 0.15, z = s * 0.35;
      if (shiver > 0.5) { x = -1.1; z = -s * 0.5; }
      if (pose === 'warm' && !walking && !act) { x = -1.35; z = s * 0.1; }
      if (walking) { x = Math.sin(this.hop * Math.PI * 2 + k * Math.PI) * 0.5; z = s * 0.5; }
      // Hanging at its sides, hardly swinging.
      // (Bent over, they dangle in front of it.)
      if (low && shiver < 0.5) { x = -0.3 + (walking ? Math.sin(this.hop * Math.PI * 2 + k * Math.PI) * 0.07 : 0) - sigh * 0.08; z = s * 0.04; }
      if (armsUp) { x = -0.4 + Math.sin(this.t * 14 + k) * 0.25; z = s * (2.5 + Math.sin(this.t * 10 + k * 2) * 0.2); }
      if (reach) { x = -1.45 + Math.sin(this.t * 14) * 0.15; z = s * 0.15; }
      if (beckon && k === 0) { x = -1.2; z = 2.0 + Math.sin(this.t * 10) * 0.55; }
      if (k === pointArm && !armsUp && !reach) { x = -1.5; z = 0.25; }
      // Presenting: both arms out wide and a little up, palms open.
      // Whirling: the right arm straight up, circling; the left out for balance.
      if (twirl && !armsUp && !reach) {
        if (k === 0) { x = THREE.MathUtils.lerp(x, -0.35 + Math.sin(this.t * 13) * 0.3, twirl); z = THREE.MathUtils.lerp(z, 2.75 + Math.cos(this.t * 13) * 0.22, twirl); }
        else { x = -0.3; z = s * 0.9; }
      }
      // Thrown: the arm follows through out toward the creature.
      if (fling && k === 0 && !armsUp && !reach) { x = -1.55; z = 0.2; }
      if (present && !armsUp && !reach) { x = THREE.MathUtils.lerp(x, -1.05 + Math.sin(this.t * 5 + k) * 0.06, present); z = THREE.MathUtils.lerp(z, s * 2.0, present); }
      // Out to you low, palm up; into the doorway a little raised.
      if (k === usherArm && !reach) { x = -1.25 - usher * 0.4; z = usherZ; }
      else if (usherArm >= 0 && !reach) { x = 0.1; z = s * 0.3; }
      if (this.sit > 0.5 && !pointAt) { x = -0.5; z = s * 0.45; }
      if (this.sit > 0.5 && rest && !low) { x = -1.05 + Math.sin(this.t * 1.3 + k * 1.7) * 0.08; z = s * 0.3; }
      if (patted) { x = -0.95 + Math.sin(this.t * 13 + k * 2) * 0.12; z = -s * 0.28; }
      if (ride) { x = -1.25; z = s * 0.32; }
      // Reaching up after them, straining, hands opening and closing.
      if (mood === 'sad' && !walking) { x = -0.3 + Math.sin(this.t * 2.6 + k * 1.4) * 0.1; z = s * (2.6 + Math.sin(this.t * 3.4 + k) * 0.12); }
      if (this.carried) { x = -0.3 + Math.sin(this.t * 15 + k * 2) * 0.3; z = s * (2.7 + Math.sin(this.t * 11 + k) * 0.2); }
      this.arms[k].rotation.set(this.armX[k].step(x, 120, 12, dt), 0, this.armZ[k].step(z, 120, 12, dt));
    }

    const wm = this.warmth;
    const pg = this.patGlow;
    this.heart.scale.setScalar(0.85 + wm * 0.35 + Math.sin(this.t * 3) * 0.06 * wm + pg * (0.3 + Math.sin(this.t * 7) * 0.08));

    // Eyes: blink; sad half-lids when cold; happy arcs after good things.
    this.happyT = Math.max(0, this.happyT - dt);
    if (this.t > this.blinkAt + 0.12) this.blinkAt = this.t + 1.6 + Math.random() * 3.2;
    let lids = this.t > this.blinkAt ? 0.05 : 1;
    if (shiver > 0.5 && lids > 0.5) lids = 0.55;
    if (happy || this.happyT > 0) lids = -1;
    if (mood === 'scared' && lids > 0.5) lids = 1;
    if ((mood === 'sad' || mood === 'down') && lids > 0.5) lids = 0.88;
    const brave = mood === 'brave' && !happy;
    if (brave && lids !== 1) lids = this.t > this.blinkAt ? 0.05 : 1;
    // The set brow is for the trail, never for you: turned to you, its eyes are just wide.
    this.brow += ((brave && lookAt !== this.player ? 1 : 0) - this.brow) * e(7);
    this.bodyB.material.uniforms.uBrow.value = this.brow;
    let lx = 0, ly = 0;
    if (lookAt) {
      tv.subVectors(lookAt, this.pos);
      tv.y += (lookAt === this.player ? 1.3 : 0) - R;
      const sh = Math.sin(this.heading), ch = Math.cos(this.heading);
      const lz = tv.x * sh + tv.z * ch, lxw = tv.x * ch - tv.z * sh;
      lx = THREE.MathUtils.clamp(Math.atan2(lxw, Math.max(lz, 0.1)) / 0.8, -1, 1);
      ly = THREE.MathUtils.clamp(Math.atan2(tv.y, Math.hypot(lxw, lz)) / 0.7, -1, 1);
    }
    // Eyes down, unless it's looking round at you.
    if (low && lookAt !== this.player) { ly = Math.min(ly, -0.9); if (walking) lx = 0; }
    if (low && lids > 0.5) lids = 0.88;
    const sad = this.bodyB.material.uniforms.uSad.value as THREE.Vector2;
    const tp = ((this.t + 1.3) % TEAR) / 2.4;
    // (Its sad face is the same one, whichever way it's sad: only despair has the tear that falls.)
    this.woe += ((mood === 'sad' ? 1 : mood === 'down' ? 0.8 : 0) - this.woe) * e(4);
    sad.set(Math.max(gloom, this.woe), low && tp < 1 ? Math.max(tp, 0.001) : 0);
    this.look.x += (lx - this.look.x) * e(low ? 4 : 10);
    this.look.y += (ly - this.look.y) * e(10);
    this.eye.set(this.look.x, this.look.y, lids, 0);

    // Colour: ash-blue -> apricot -> amber, and a growing glow.
    if (wm < 0.5) this.tint.copy(COLD).lerp(MID, wm * 2);
    else this.tint.copy(MID).lerp(WARM, (wm - 0.5) * 2);
    // In despair its fire's all but out.
    this.tint.lerp(ASHEN, gloom * 0.7);
    // Being patted warms it through a little, however cold it is.
    if (wm < 0.75) this.tint.lerp(wm < 0.5 ? MID : WARM, pg * 0.35);
    this.heartTint.copy(HEART_COLD).lerp(HEART_WARM, Math.max(pg, THREE.MathUtils.smoothstep(wm, 0.05, 0.6)));
    this.bodyB.material.uniforms.uEmber.value = Math.min(0.8, THREE.MathUtils.smoothstep(wm, 0.55, 1) * 0.62 * (1 - gloom * 0.85) + pg * 0.18);
    this.heartB.material.uniforms.uEmber.value = Math.max(pg, THREE.MathUtils.smoothstep(wm, 0.05, 0.5) * (1 - gloom * 0.6)) * 0.85;
    this.armB.material.uniforms.uEmber.value = this.footB.material.uniforms.uEmber.value = this.bodyB.material.uniforms.uEmber.value;
    // Mouth: a little frown when cold, a "w" smile when warm or happy.
    const mw = this.bodyB.material.uniforms.uMouthW.value as THREE.Vector3;
    mw.z = brave ? -1.5 : mood === 'sad' ? -8 : mood === 'scared' ? -5 : happy || this.happyT > 0 ? 7 : low ? -13 + Math.sin(this.t * 17) * 2.5 : mood === 'down' ? -6 : wm > 0.35 ? 7 : shiver > 0.5 ? -5 : 3;
    if (this.mouthHalf < 0) this.mouthHalf = mw.y;
    mw.y = this.mouthHalf * (1 + gloom * 0.5);
    const bl = this.bodyB.material.uniforms.uBlush.value as THREE.Vector4;
    const blush = Math.max(THREE.MathUtils.smoothstep(wm, 0.3, 0.8) * (1 - gloom), pg) * (1 + pg * 0.25);
    bl.z = 0.14 * blush;
    bl.w = 0.08 * blush;

    this.root.updateMatrixWorld(true);
    this.placeLoop(twirl, fling, w.lasso ?? null);
    for (const b of this.batches) b.begin();
    this.bodyB.push(this.body.matrixWorld, this.tint, this.eye);
    this.heartB.push(this.heart.matrixWorld, this.heartTint);
    for (const a of this.arms) this.armB.push(a.matrixWorld, this.tint);
    for (const f of this.feet) this.footB.push(f.matrixWorld, this.tint);
    for (const b of this.batches) b.end();

    // Thought bubble with what it wants next (hidden while travelling).
    // Only up close: from across the yard the pantomime does the talking.
    // "Close" covers every build zone (you can build from 7 m), with a
    // little slack before it lets go so the edge doesn't flicker.
    // (Rallying you along, it's seen from further back: you're following it.)
    if (!w.rally) this.rallyT = 0;
    this.bubbleNear = toPlayer < (w.rally ? 20 : this.bubbleNear ? 9.5 : 8);
    // A tally that's reached 0 has nothing left to ask for (the last of it
    // is flying in; the heart comes next).
    const want = w.count === 0 ? null : w.icon;
    // (Frightened or grieving, it isn't asking for anything.)
    const icon = !this.bubbleNear || (this.mood && this.mood !== 'down' && this.mood !== 'brave') ? null : act?.kind === 'celebrate' || (act?.kind === 'pat' && act.t > PAT.end) ? 'heart' : (this.moving || this.waiting) && !w.rally ? null : want;
    const count = icon === w.icon ? w.total ?? w.count ?? 0 : 0;
    if (icon !== this.bubbleIcon && this.bubbleA < 0.05) {
      this.bubbleIcon = icon;
      this.bubbleCount = count;
      if (icon) { this.bubble.texture = tex(bubbleCanvas(icon, count)); this.bubblePop = 1; }
    } else if (icon && icon === this.bubbleIcon && count !== this.bubbleCount) {
      // The tally changes in place, with a little bob.
      this.bubbleCount = count;
      this.bubble.texture = tex(bubbleCanvas(icon, count));
      this.bubblePop = Math.max(this.bubblePop, 0.5);
    }
    const showB = icon !== null && icon === this.bubbleIcon ? 1 : 0;
    this.bubbleA += (showB - this.bubbleA) * e(showB ? 6 : 10);
    this.bubblePop = Math.max(0, this.bubblePop - dt * 2.5);
    this.bubble.alpha = this.bubbleA;
    this.bubble.scale = (0.6 + 0.4 * this.bubbleA) * (1 + Math.sin(this.bubblePop * Math.PI) * 0.25);
    this.bubble.pos.set(this.pos.x, this.pos.y + R * 2 + 0.95 + Math.sin(this.t * 1.8) * 0.05 + lift, this.pos.z);

    if (act?.kind === 'celebrate' && Math.floor(act.t / 0.6) !== Math.floor((act.t - dt) / 0.6)) {
      this.hooks.sparkle(tv.set(this.pos.x, this.pos.y + R * 2.4, this.pos.z), 5);
      this.hooks.sound(act.t < 0.1 ? 'excited' : 'chirp');
    }
    if (act?.kind === 'greet' && act.t - dt <= 0.2 && act.t > 0.2) this.hooks.sound('chirp');
  }
}
