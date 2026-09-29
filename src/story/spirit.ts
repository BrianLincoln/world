import * as THREE from 'three';
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
const COLD = new THREE.Color('#b8c6d8');
const MID = new THREE.Color('#ecc9ae');
const WARM = new THREE.Color('#f0924c');
const HEART_COLD = new THREE.Color('#6d6874');
const HEART_WARM = new THREE.Color('#ffb24a');

export type Pose = 'stand' | 'sit' | 'shiver' | 'warm' | 'point';

export interface Want {
  at: THREE.Vector3;
  /** What it keeps looking/pointing at from there. */
  face: THREE.Vector3 | null;
  pose: Pose;
  icon: IconName | null;
  /** Wait for the explorer to keep up while travelling. */
  lead: boolean;
  /** Nothing to ask for: it just enjoys being there (no pointing; watches
   *  `face`, looks round at you now and then when you're close). */
  settled?: boolean;
}

type Act =
  | { kind: 'celebrate'; t: number }
  | { kind: 'greet'; t: number }
  /** Hurry to `to` (e.g. out of the cabin), then carry on with the queue. */
  | { kind: 'emerge'; t: number; to: THREE.Vector3 }
  | { kind: 'hint'; t: number; phase: 'go' | 'tug' | 'back' | 'hop'; target: THREE.Vector3; face: THREE.Vector3 | null; hops: number };

export interface SpiritHooks {
  ground(x: number, z: number): number;
  /** Waypoints from a to b (around the cabin, through its door). */
  route(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[];
  sound(name: 'chirp' | 'excited' | 'whimper' | 'call' | 'tug'): void;
  sparkle(at: THREE.Vector3, n: number): void;
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
  private glanceT = 4;
  private beckonT = 0;
  private spin = 0;
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
  get arrived() { return !this.moving && !this.acts.length && this.pos.distanceTo(this.want.at) < 0.6; }

  teleport(p: THREE.Vector3) {
    this.pos.copy(p);
    this.path = [];
    this.pathTo.set(1e9, 0, 0);
  }

  celebrate() {
    this.acts = this.acts.filter((a) => a.kind !== 'celebrate');
    this.acts.push({ kind: 'celebrate', t: 0 });
  }
  /** Wave hello; with `at`, first hurry there (out the door to meet you). */
  greet(at?: THREE.Vector3) {
    if (at) this.acts.push({ kind: 'emerge', t: 0, to: at.clone() });
    this.acts.push({ kind: 'greet', t: 0 });
  }
  hint(target: THREE.Vector3, face: THREE.Vector3 | null) {
    if (this.acts.some((a) => a.kind === 'hint')) return;
    this.acts.push({ kind: 'hint', t: 0, phase: 'go', target: target.clone(), face: face?.clone() ?? null, hops: 0 });
  }
  cancelActs() { this.acts = []; }

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
    let speed = 3.1;
    let happy = false;
    let bounce = 0;
    const act = this.acts[0];
    this.moving = false;
    if (act) {
      act.t += dt;
      if (act.kind === 'celebrate') {
        this.vel.multiplyScalar(Math.exp(-10 * dt));
        happy = true;
        armsUp = 1;
        bounce = 1;
        this.spin = act.t > 0.45 && act.t < 1.05 ? (act.t - 0.45) / 0.6 : 0;
        if (act.t > 1.8) { this.acts.shift(); this.happyT = 1.5; this.spin = 0; }
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
        const lag = w.lead && toPlayer > 10 && Math.hypot(this.player.x - dest.x, this.player.z - dest.z) > Math.hypot(this.pos.x - dest.x, this.pos.z - dest.z) - 2;
        if (lag) this.waiting = true;
        if (this.waiting && (toPlayer < 6 || !w.lead)) this.waiting = false;
        if (this.waiting) {
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
          const near = toPlayer < 7;
          this.glanceT -= dt;
          if (this.glanceT <= 0) this.glanceT = near ? 5 + Math.random() * 6 : 2;
          const glancing = near && this.glanceT < 1.8;
          if (glancing && this.glanceT + dt >= 1.8) this.happyT = Math.max(this.happyT, 1.4);
          lookAt = glancing ? this.player : w.face;
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
    this.pos.y += (gy - this.pos.y) * e(20);
    const rest = w.settled && !act && !this.moving;
    this.face(this.moving ? null : act?.kind === 'hint' && act.phase === 'tug' ? this.player : (pointAt ?? (pose === 'warm' || rest ? w.face : lookAt)), dt);
    if (this.hold !== null) this.heading = this.hold;

    // ---- body animation
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const walking = hs > 0.3;
    // Trotting hops; celebration and hints bounce higher.
    const hopRate = walking ? 3.4 + hs * 0.5 : bounce > 0 ? 2.6 : 0;
    if (hopRate > 0) this.hop += dt * hopRate;
    else this.hop = Math.round(this.hop);
    const ph = this.hop % 1;
    const air = hopRate > 0 ? Math.sin(ph * Math.PI) : 0;
    const hopTarget = walking ? 0.1 + hs * 0.018 : bounce * 0.42;
    this.hopH += (hopTarget - this.hopH) * e(8);
    const lift = air * this.hopH;
    const landing = hopRate > 0 && ph < 0.12 ? 1 - ph / 0.12 : 0;
    const sq = this.squash.step(-landing * (walking ? 0.12 : 0.22) * (hopRate > 0 ? 1 : 0) + air * 0.08, 180, 14, dt);
    const shiver = pose === 'shiver' && !walking && !act ? 1 : pose === 'warm' && this.warmth < 0.9 && !walking && !act ? 0.4 : 0;
    this.sit += ((pose === 'sit' && !walking && !act ? 1 : 0) - this.sit) * e(5);

    this.root.position.copy(this.pos);
    this.root.position.x += Math.sin(this.t * 55) * 0.008 * shiver;
    this.root.rotation.y = this.heading + this.spin * Math.PI * 2;
    const breathe = Math.sin(this.t * 2.1) * 0.02;
    const sy = 1 + sq + breathe - this.sit * 0.08;
    this.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    this.body.position.y = R * 0.86 * sy + lift - this.sit * 0.07;
    const lean = this.tilt.step(THREE.MathUtils.clamp(hs * 0.05, 0, 0.25) - this.sit * 0.12 + (reach ? -0.2 : 0) + (pose === 'warm' ? 0.1 : 0), 90, 12, dt);
    this.body.rotation.set(lean, 0, Math.sin(this.t * 42) * 0.03 * shiver + (walking ? Math.sin(this.hop * Math.PI * 2) * 0.06 : 0) + (rest ? Math.sin(this.t * 0.9) * 0.045 * this.sit : 0));

    // Feet: little alternating steps, tucked forward when sitting.
    for (let k = 0; k < 2; k++) {
      const f = this.feet[k];
      const s = k ? -1 : 1;
      const step = walking ? Math.sin(this.hop * Math.PI * 2 + k * Math.PI) : 0;
      f.position.set(s * 0.42 * R, lift * 0.85 + Math.max(0, step) * 0.05, 0.18 * R + step * 0.06 + this.sit * 0.14);
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
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      let x = 0.15, z = s * 0.35;
      if (shiver > 0.5) { x = -1.1; z = -s * 0.5; }
      if (pose === 'warm' && !walking && !act) { x = -1.35; z = s * 0.1; }
      if (walking) { x = Math.sin(this.hop * Math.PI * 2 + k * Math.PI) * 0.5; z = s * 0.5; }
      if (armsUp) { x = -0.4 + Math.sin(this.t * 14 + k) * 0.25; z = s * (2.5 + Math.sin(this.t * 10 + k * 2) * 0.2); }
      if (reach) { x = -1.45 + Math.sin(this.t * 14) * 0.15; z = s * 0.15; }
      if (beckon && k === 0) { x = -1.2; z = 2.0 + Math.sin(this.t * 10) * 0.55; }
      if (k === pointArm && !armsUp && !reach) { x = -1.5; z = 0.25; }
      if (this.sit > 0.5 && !pointAt) { x = -0.5; z = s * 0.45; }
      if (this.sit > 0.5 && rest) { x = -1.05 + Math.sin(this.t * 1.3 + k * 1.7) * 0.08; z = s * 0.3; }
      this.arms[k].rotation.set(this.armX[k].step(x, 120, 12, dt), 0, this.armZ[k].step(z, 120, 12, dt));
    }

    const wm = this.warmth;
    this.heart.scale.setScalar(0.85 + wm * 0.35 + Math.sin(this.t * 3) * 0.06 * wm);

    // Eyes: blink; sad half-lids when cold; happy arcs after good things.
    this.happyT = Math.max(0, this.happyT - dt);
    if (this.t > this.blinkAt + 0.12) this.blinkAt = this.t + 1.6 + Math.random() * 3.2;
    let lids = this.t > this.blinkAt ? 0.05 : 1;
    if (shiver > 0.5 && lids > 0.5) lids = 0.55;
    if (happy || this.happyT > 0) lids = -1;
    let lx = 0, ly = 0;
    if (lookAt) {
      tv.subVectors(lookAt, this.pos);
      tv.y += (lookAt === this.player ? 1.3 : 0) - R;
      const sh = Math.sin(this.heading), ch = Math.cos(this.heading);
      const lz = tv.x * sh + tv.z * ch, lxw = tv.x * ch - tv.z * sh;
      lx = THREE.MathUtils.clamp(Math.atan2(lxw, Math.max(lz, 0.1)) / 0.8, -1, 1);
      ly = THREE.MathUtils.clamp(Math.atan2(tv.y, Math.hypot(lxw, lz)) / 0.7, -1, 1);
    }
    this.look.x += (lx - this.look.x) * e(10);
    this.look.y += (ly - this.look.y) * e(10);
    this.eye.set(this.look.x, this.look.y, lids, 0);

    // Colour: ash-blue -> apricot -> amber, and a growing glow.
    if (wm < 0.5) this.tint.copy(COLD).lerp(MID, wm * 2);
    else this.tint.copy(MID).lerp(WARM, (wm - 0.5) * 2);
    this.heartTint.copy(HEART_COLD).lerp(HEART_WARM, THREE.MathUtils.smoothstep(wm, 0.05, 0.6));
    this.bodyB.material.uniforms.uEmber.value = THREE.MathUtils.smoothstep(wm, 0.55, 1) * 0.62;
    this.heartB.material.uniforms.uEmber.value = THREE.MathUtils.smoothstep(wm, 0.05, 0.5) * 0.85;
    this.armB.material.uniforms.uEmber.value = this.footB.material.uniforms.uEmber.value = this.bodyB.material.uniforms.uEmber.value;
    // Mouth: a little frown when cold, a "w" smile when warm or happy.
    const mw = this.bodyB.material.uniforms.uMouthW.value as THREE.Vector3;
    mw.z = happy || this.happyT > 0 || wm > 0.35 ? 7 : shiver > 0.5 ? -5 : 3;
    const bl = this.bodyB.material.uniforms.uBlush.value as THREE.Vector4;
    bl.z = 0.14 * THREE.MathUtils.smoothstep(wm, 0.3, 0.8);
    bl.w = 0.08 * THREE.MathUtils.smoothstep(wm, 0.3, 0.8);

    this.root.updateMatrixWorld(true);
    for (const b of this.batches) b.begin();
    this.bodyB.push(this.body.matrixWorld, this.tint, this.eye);
    this.heartB.push(this.heart.matrixWorld, this.heartTint);
    for (const a of this.arms) this.armB.push(a.matrixWorld, this.tint);
    for (const f of this.feet) this.footB.push(f.matrixWorld, this.tint);
    for (const b of this.batches) b.end();

    // Thought bubble with what it wants next (hidden while travelling).
    // Only up close: from across the yard the pantomime does the talking.
    const close = toPlayer < 5.5;
    const icon = !close ? null : act?.kind === 'celebrate' ? 'heart' : this.moving || this.waiting ? null : w.icon;
    if (icon !== this.bubbleIcon && this.bubbleA < 0.05) {
      this.bubbleIcon = icon;
      if (icon) { this.bubble.texture = tex(bubbleCanvas(icon)); this.bubblePop = 1; }
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
