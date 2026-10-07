import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';
import { crowParts } from '../mobs/crow';
import { mirrorX, PartBatch } from '../mobs/parts';

// The giant's birds: a flock of big black crows that roosts in the trees on
// its shoulders. When it stops they lift off all together, stoop down the
// lane, and each snatches up a spirit; from then on they wheel round its
// head, every one carrying a small warm light. One that has set its light
// down in the village (giant/homecoming.ts) doesn't come back (`leave`): the
// crows on the giant are how many spirits it still has. They are the world's crow
// (mobs/crow.ts) in soot black with blank yellow eyes: the spooky thing in
// the story, by the owner's wish.
//
// They are drawn here (six instanced batches for the whole flock) and told
// where to be by giant/visit.ts; they have no brain of their own.

/** About 7 m from wingtip to wingtip: they have to read beside an 80 m giant. */
const S = 1.9;
/** A crow's middle over the ground it stands on (the crow's own `BODY_Y`, at this size). */
export const STAND = 0.78 * S;
/** What a crow carries hangs this far under it. */
export const GRIP = 1.6;
/** Its claws under its middle, flying level with its legs down. */
export const CLAW = (0.3 + 0.46) * S;
/** Reaching for what it takes on the wing: how far forward of straight down its legs swing (rad), and how much longer they stretch. */
const FORE = 1.05, STRETCH = 0.15;
/** And when: they start forward this long before it has it, are out by this long before, and back down under it this long after (s). */
const REACH = [0.8, 0.25, 0.14];
/** Soot: the crow's ink, nearly put out. */
const SOOT = [0.3, 0.26, 0.34].map((k) => new THREE.Color(k, k, k * 1.12));

/** (`stand`: on the ground, wings shut, put where its owner says, and walking if that moves it; `hover`: beating on the spot, likewise.) */
export type BirdState = 'roost' | 'wheel' | 'dive' | 'climb' | 'stand' | 'hover';

export interface Bird {
  pos: THREE.Vector3;
  /** The way it's flying (unit). */
  dir: THREE.Vector3;
  state: BirdState;
  /** Where on the wheel it flies, and where it sits. */
  phase: number;
  perch: number;
  /** A dive or a climb: from, by way of, to, and how far along (0..1). */
  a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; t: number; dur: number;
  /** How far along that curve it is by each of `ARC` even steps (0..1), to fly it at a speed of our choosing. */
  arc: Float32Array;
  /** What it does when it gets there. */
  then: BirdState;
  /** It loses its speed along the way and gets there stopped (a pull up into a hover), from twice the even pace at the start. */
  stall: boolean;
  /** How much of the curve, at its start and at its end, it's let off keeping clear (`Birds.clear`) to leave and arrive where it was sent. */
  ease: [number, number];
  /** How far it's being kept clear just now (0: flying the curve as sent; 1: wholly). */
  kept: number;
  /** Carrying a spirit: its light hangs under it (and how far it has come up, 0..1). */
  light: THREE.Mesh | null;
  glow: number;
  /** Where what it carries hangs: from its claws (`GRIP` under it, flying level). */
  grip: THREE.Vector3;
  flap: number;
  /** Standing: its walk's phase (a foot comes down at each odd half turn), where it stood last frame, and how far it's up on its toes (m). */
  stride: number;
  last: THREE.Vector3 | null;
  reach: number;
  /** Its legs: down under it (1) or tucked back (0). And its wings: shut along its flanks (1) or out (0). */
  down: number;
  shut: number;
  /** In the air, its legs held straight down under it (0..1), not tucked back. */
  grab: number;
  /** And thrown out ahead of it from there, claws first, to take something on the wing (0..1). */
  fore: number;
  /** Something is in its claws, so its legs stay down to it (and how far down they've come for that, 0..1). */
  holds: boolean;
  held: number;
  /** Where its claws are, legs down. */
  claw: THREE.Vector3;
  tint: THREE.Color;
  /** It has given up its light and left the giant for good: not flown, not drawn. */
  gone: boolean;
}

const m4 = new THREE.Matrix4(), m5 = new THREE.Matrix4(), part = new THREE.Matrix4(), wingM = new THREE.Matrix4();
const up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
const bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), v = new THREE.Vector3();
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), qd = new THREE.Quaternion();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const EYE = new THREE.Vector4(0, 0, 1, 0);
const ARC = 24;

export class Birds {
  readonly group = new THREE.Group();
  readonly birds: Bird[] = [];
  private body: PartBatch;
  private head: PartBatch;
  private wing: PartBatch[];
  private hand: PartBatch[];
  private leg: PartBatch;
  private frame = crowParts(0.25);
  private glow = makeSolidMaterial('#ee6a20', 1.6, { keep: 1 });
  private glowGeo = new THREE.IcosahedronGeometry(1, 3);
  private time = 0;
  /** Lifts a point on a dive or a climb clear of something it mustn't fly through (the giant). */
  clear: ((p: THREE.Vector3) => void) | null = null;

  constructor(n: number) {
    const g = this.frame;
    this.body = new PartBatch(g.body, { keep: 0.9 }, n);
    // Blank yellow eyes, no pupil at all: they don't look at you, they look through you.
    this.head = new PartBatch(g.head, { keep: 0.9, eyePos: [0.5, 0.2], eyeSize: [0.24, 0.2], pupil: [0, 0], lookRange: [0, 0], eyeTilt: -0.35 }, n);
    this.head.material.uniforms.uWhite.value = new THREE.Color('#ffd35e');
    this.wing = [new PartBatch(g.wing, { keep: 0.9 }, n), new PartBatch(mirrorX(g.wing), { keep: 0.9 }, n)];
    this.hand = [new PartBatch(g.hand, { keep: 0.9 }, n), new PartBatch(mirrorX(g.hand), { keep: 0.9 }, n)];
    this.leg = new PartBatch(g.leg, { keep: 0.9 }, n * 2);
    this.group.add(this.body.mesh, this.head.mesh, ...this.wing.map((b) => b.mesh), ...this.hand.map((b) => b.mesh), this.leg.mesh);
    for (let i = 0; i < n; i++) {
      this.birds.push({
        pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), state: 'roost', phase: (i / n) * Math.PI * 2 + (i % 2) * 0.35, perch: i,
        a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), t: 0, dur: 1, arc: new Float32Array(ARC + 1), then: 'wheel', stall: false, ease: [0.1, 0.1], kept: 0, light: null, glow: 0, grip: new THREE.Vector3(), flap: i * 1.7, stride: 0, last: null, reach: 0, down: 0, shut: 1, grab: 0, fore: 0, holds: false, held: 0, claw: new THREE.Vector3(), tint: SOOT[i % SOOT.length], gone: false,
      });
    }
  }

  /**
   * Send bird `i` from where it is to `to`, swinging out by way of `via`, in `dur` seconds.
   * (`easeIn`, `easeOut`: see `Bird.ease`. More than a little, for an end that is in under what it keeps clear of.)
   * Returns how long the way is (m).
   */
  send(i: number, state: 'dive' | 'climb', via: THREE.Vector3, to: THREE.Vector3, dur: number, then: BirdState = 'wheel', easeIn = 0.1, easeOut = 0.1) {
    const b = this.birds[i];
    b.state = state;
    b.ease = [easeIn, easeOut];
    b.a.copy(b.pos); b.b.copy(via); b.c.copy(to);
    b.t = 0; b.dur = dur; b.then = then; b.stall = false;
    // Measure it: the curve's own pace bunches up at a short leg (the level run at the mark), which is
    // just where it mustn't dawdle.
    let len = 0;
    b.arc[0] = 0;
    bx.copy(b.a);
    for (let j = 1; j <= ARC; j++) {
      const k = j / ARC;
      v.copy(b.a).multiplyScalar((1 - k) * (1 - k)).addScaledVector(b.b, 2 * (1 - k) * k).addScaledVector(b.c, k * k);
      len += v.distanceTo(bx);
      b.arc[j] = len;
      bx.copy(v);
    }
    for (let j = 1; j <= ARC; j++) b.arc[j] = len > 1e-4 ? b.arc[j] / len : j / ARC;
    return len;
  }

  /** What bird `i` has hold of becomes a warm light under it (`now`: lit already, a restored save). */
  carry(i: number, now = false) {
    const b = this.birds[i];
    if (b.light) return;
    b.holds = true;
    if (now) b.held = 1;
    b.glow = now ? 1 : 0;
    b.light = new THREE.Mesh(this.glowGeo, this.glow);
    b.light.frustumCulled = false;
    b.light.scale.setScalar(now ? 1.1 : 0);
    this.group.add(b.light);
  }

  /** Bird `i` has set its light down: it carries nothing. */
  shed(i: number) {
    const b = this.birds[i];
    if (b.light) this.group.remove(b.light);
    b.light = null;
    b.holds = false;
    b.glow = 0;
  }

  /**
   * Bird `i` has no light any more, and is gone from the giant for good: the
   * crows left in its trees are the spirits still to bring home. (Done out of
   * sight: it was last seen flying off over the village.)
   */
  leave(i: number) {
    this.shed(i);
    this.birds[i].gone = true;
  }

  /** How many are still with the giant. */
  get left() { return this.birds.filter((b) => !b.gone).length; }

  /** Where a ball of radius `r` sits in bird `b`'s claws: under them, their toes just into the top of it. */
  static clasp(b: Bird, r: number, out: THREE.Vector3) { return out.copy(b.claw).setY(b.claw.y - 0.8 * r); }

  /** How far its feet are thrown out ahead of it at `t`, taking something on the wing at `at`: out by `REACH` before, and snapped back under it as they close (`Bird.fore`). */
  static reach(t: number, at: number) {
    return THREE.MathUtils.smoothstep(t, at - REACH[0], at - REACH[1]) * (1 - THREE.MathUtils.smoothstep(t, at - 0.04, at + REACH[2]));
  }

  /**
   * Fly them. `perch(i)` is where bird i roosts, `hub` the middle of the
   * wheel (the giant's head), `facing` the way the giant faces.
   */
  update(dt: number, perch: (i: number, out: THREE.Vector3) => THREE.Vector3, hub: THREE.Vector3, facing: number) {
    this.time += dt;
    const t = this.time;
    const all = [this.body, this.head, ...this.wing, ...this.hand, this.leg];
    for (const b of all) b.begin();
    for (const [i, b] of this.birds.entries()) {
      if (b.gone) continue;
      let fold = 0, flapRate = 7, glide = 0;
      b.kept = 0;
      if (b.state === 'roost') {
        perch(b.perch, b.pos);
        b.dir.set(Math.sin(facing + (i % 3 - 1) * 0.5), 0, Math.cos(facing + (i % 3 - 1) * 0.5));
        fold = 1;
      } else if (b.state === 'stand') {
        fold = 1;
      } else if (b.state === 'hover') {
        flapRate = 11;
      } else if (b.state === 'wheel') {
        // Round its head, each at its own height, rising and falling a little.
        const a = b.phase + t * 0.55, r = 30 + (i % 3) * 5;
        v.set(hub.x + Math.cos(a) * r, hub.y + 6 + (i % 4) * 3 + Math.sin(t * 0.7 + i) * 2.5, hub.z + Math.sin(a) * r);
        // Ease on to the wheel from wherever it was, so nothing snaps.
        b.dir.subVectors(v, b.pos);
        const far = b.dir.length();
        if (far > 0.5 && dt > 0) {
          b.dir.divideScalar(far);
          const want = bx.set(-Math.sin(a), 0.02, Math.cos(a));
          b.dir.lerp(want, THREE.MathUtils.clamp(1 - far / 12, 0, 1)).normalize();
          b.pos.lerp(v, 1 - Math.exp(-3.5 * dt));
        } else b.dir.set(-Math.sin(a), 0, Math.cos(a));
        glide = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 2);
      } else {
        b.t = Math.min(1, b.t + dt / b.dur);
        // Down, level through the mark and up again all at one speed: it doesn't slow for what it takes.
        // (Home to roost, it eases in to land.)
        const s = b.then === 'roost' ? b.t * b.t * (3 - 2 * b.t) : b.stall ? b.t * (2 - b.t) : b.t;
        // That far along the curve by distance, as the curve's own parameter.
        let j = 1;
        while (j < ARC && b.arc[j] < s) j++;
        const e = (j - 1 + (s - b.arc[j - 1]) / Math.max(1e-6, b.arc[j] - b.arc[j - 1])) / ARC;
        // (Eased in and out, so it still leaves from and arrives at exactly where it was sent.)
        const keep = (k: number) => Math.min(THREE.MathUtils.smoothstep(k, 0, b.ease[0]), THREE.MathUtils.smoothstep(1 - k, 0, b.ease[1]));
        const at = (k: number, out: THREE.Vector3) => {
          out.copy(b.a).multiplyScalar((1 - k) * (1 - k)).addScaledVector(b.b, 2 * (1 - k) * k).addScaledVector(b.c, k * k);
          if (this.clear) {
            const y = out.y;
            this.clear(out);
            out.y = THREE.MathUtils.lerp(y, out.y, keep(k));
          }
          return out;
        };
        b.kept = keep(e);
        at(e, b.pos);
        at(Math.min(1, e + 0.02), v);
        if (v.distanceToSquared(b.pos) > 1e-4) b.dir.subVectors(v, b.pos).normalize();
        // (Wings held out along the ground, where a beat would go through it.)
        glide = b.state === 'dive' ? 0.85 : b.then === 'roost' ? 0 : 0.85 * (1 - THREE.MathUtils.smoothstep(b.t, 0.05, 0.3));
        flapRate = b.state === 'climb' ? 10 : 7;
        if (b.t >= 1) b.state = b.then;
      }
      b.flap += dt * flapRate * (1 - glide * 0.8);
      // On the ground it walks wherever it's moved to: the crow's own walk (mobs/crow.ts), legs by turns,
      // a slight waddle and the head bobbing. Still, its feet come together.
      let waddle = 0, bob = 0, lift = 0, swing = 0, amp2 = 0;
      const standing = b.state === 'stand';
      if (standing) {
        const speed = b.last && dt > 0 ? Math.hypot(b.pos.x - b.last.x, b.pos.z - b.last.z) / dt : 0;
        (b.last ??= new THREE.Vector3()).copy(b.pos);
        b.stride += (speed * dt / ((0.75 + 0.12 * speed) * S)) * Math.PI * 2;
        if (speed < 0.3) b.stride += (Math.round(b.stride / Math.PI) * Math.PI - b.stride) * (1 - Math.exp(-6 * dt));
        const moving = THREE.MathUtils.clamp(speed / 1.5, 0, 1);
        amp2 = moving * 0.42;
        lift = Math.abs(Math.sin(b.stride)) * 0.03 * moving;
        waddle = Math.sin(b.stride) * 0.08 * moving;
        bob = Math.sin(b.stride * 2) * 0.035 * moving;
        swing = b.stride;
      } else b.last = null;
      // (Its legs come down as it comes in to land, and go back as it leaves the ground.)
      const landing = b.state === 'dive' && b.then === 'stand' && b.t > 0.8;
      b.down += ((standing || landing ? 1 : 0) - b.down) * (1 - Math.exp(-(standing ? 30 : 9) * dt));
      // Body frame: +z along the way it flies. On a perch it sits up.
      bz.copy(b.dir);
      // (Beating on the spot, it hangs back on its tail.)
      if (b.state === 'hover') bz.setY(0).normalize().setY(0.75).normalize();
      bx.crossVectors(up, bz);
      if (bx.lengthSq() < 1e-4) bx.set(1, 0, 0);
      bx.normalize();
      by.crossVectors(bz, bx);
      m4.makeBasis(bx, by, bz).setPosition(v.copy(b.pos).setY(b.pos.y + lift * S)).scale(v.set(S, S, S));
      // (Its wings shut, and it sits up, over a moment: nothing snaps as it lands.)
      const shut = (b.shut += (fold - b.shut) * (1 - Math.exp(-11 * dt)));
      m4.multiply(m5.makeRotationX(-0.38 * shut)).multiply(m5.makeRotationZ(waddle));
      this.body.push(m4, b.tint);
      const f = this.frame;
      this.head.push(part.multiplyMatrices(m4, m5.makeTranslation(0, f.neck.y, f.neck.z + THREE.MathUtils.lerp(0.08, bob, shut))).multiply(m5.makeRotationX(THREE.MathUtils.lerp(-0.2, 0.38, shut))), b.tint, EYE);
      // Wings as the crow's: beating about the body's long axis with the
      // hand trailing the beat; held out on a glide; laid along the flanks
      // on a perch.
      const open = 1 - shut, amp = (1 - 0.85 * glide) * open;
      const beat = Math.sin(b.flap), lag = Math.sin(b.flap - 0.9);
      for (let k = 0; k < 2; k++) {
        const s = k ? -1 : 1;
        qa.setFromAxisAngle(AZ, s * (beat * amp * 0.95 + 0.14 * glide));
        qa.multiply(qb.setFromAxisAngle(AY, s * (0.15 + 0.1 * beat * amp)));
        if (shut > 1e-3) {
          qd.setFromAxisAngle(AX, 0.42);
          qd.multiply(qc.setFromAxisAngle(AY, s * 1.66)).multiply(qc.setFromAxisAngle(AX, -1.35)).multiply(qc.setFromAxisAngle(AZ, s * -0.12));
          qa.slerp(qd, shut);
        }
        const flank = 0.4 + 0.14 * f.plump;
        v.set(s * THREE.MathUtils.lerp(flank, f.shoulder.x, open), THREE.MathUtils.lerp(0.16, f.shoulder.y, open), THREE.MathUtils.lerp(0.26, f.shoulder.z, open));
        wingM.multiplyMatrices(m4, m5.compose(v, qa, one.set(THREE.MathUtils.lerp(0.62, 1, open), 1, 1)));
        this.wing[k].push(wingM, b.tint);
        qb.setFromAxisAngle(AZ, s * (lag * amp * 0.6 - beat * amp * 0.25) * open);
        v.set(s * THREE.MathUtils.lerp(0.5, 0.8, open), 0, 0);
        part.multiplyMatrices(wingM, m5.compose(v, qb, one.set(THREE.MathUtils.lerp(0.82, 1, open) / THREE.MathUtils.lerp(0.62, 1, open), 1, THREE.MathUtils.lerp(0.5, 1, open))));
        this.hand[k].push(part, b.tint);
      }
      // Legs: straight down under it whatever the body's tilt, stepping; tucked back under the tail in the air.
      // (None on a perch: it sits on them. With something in its claws they hang straight down to it; reaching for it, out ahead.)
      b.held += ((b.holds ? 1 : 0) - b.held) * (1 - Math.exp(-20 * dt));
      const legs = Math.max(b.grab, b.held, b.fore);
      b.claw.set(0, f.hip.y, f.hip.z).applyMatrix4(m4).setY(b.claw.y - 0.46 * S);
      if (b.state !== 'roost') for (let k = 0; k < 2; k++) {
        const ph = swing + k * Math.PI, raise = Math.max(0, -Math.cos(ph)) * amp2;
        qa.setFromAxisAngle(AX, 0.38 * shut + THREE.MathUtils.lerp((1 - b.down) * 1.25, Math.asin(THREE.MathUtils.clamp(bz.y, -1, 1)), legs) - b.fore * FORE + Math.sin(ph) * amp2).multiply(qb.setFromAxisAngle(AZ, -waddle * 0.8));
        const len = (1 - raise * 0.35) * (1 + (b.reach * b.down) / (0.46 * S)) * (1 + STRETCH * b.fore);
        this.leg.push(part.multiplyMatrices(m4, m5.compose(v.set((k ? -1 : 1) * f.hip.x, f.hip.y, f.hip.z), qa, one.set(1, len, 1))), b.tint);
      }
      one.set(1, 1, 1);
      b.grip.copy(b.claw).setY(b.claw.y + CLAW - GRIP);
      if (b.light) {
        b.glow = Math.min(1, b.glow + dt / 0.6);
        const r = (1.1 + 0.08 * Math.sin(t * 5 + i)) * b.glow * (2 - b.glow);
        Birds.clasp(b, r, b.light.position);
        b.light.scale.setScalar(r);
      }
    }
    for (const b of all) b.end();
  }

  dispose() { this.group.removeFromParent(); }
}
