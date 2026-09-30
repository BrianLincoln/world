import * as THREE from 'three';
import { Beast, clamp, collarGeometry, GAIT, lerp, mixGait, saddleGeometry, type Anim, type BeastData, type LegSet } from './beast';
import type { PartBatch } from './parts';
import { colored, ellipsoid, furBall, lathe, limb, merge, sculpt, smooth } from './shapes';
import type { Mob } from './types';

// The lantern hare: a hare the size of a pony, all haunches and ears. The
// insides and tips of its long ears and its cotton tail glow like lanterns,
// warm amber, so at dusk a meadow of them is a scatter of little lights.
// Ridden, it's the fastest thing there is, and hard to hold: it takes an
// age to stop, slides wide through turns on its loose footing, and Space
// sends it on a huge soaring leap.

const LAMP = '#ffd98e';
const BELLY = '#f4ecde';
const NOSE = '#d88f8a';

/** Pear-shaped: a narrow chest, great round haunches. */
function barrel(d: THREE.Vector3, out: THREE.Vector3) {
  const rear = smooth(-d.z, -0.3, 0.8);
  return out.set(d.x * 0.34 * (1 + 0.35 * rear), d.y * 0.36 * (1 + 0.3 * rear) + 0.06 * rear * Math.max(0, d.y), d.z * 0.6);
}

function bodyGeometry() {
  const body = sculpt(new THREE.SphereGeometry(1, 48, 32), barrel);
  const belly = sculpt(new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), barrel, 0.01);
  const chest = furBall({ widthSegs: 24, heightSegs: 18, tufts: 26, amp: 0.14, sweep: 0.1, seed: 13, comb: (d, o) => o.set(0, -1, 0.2).addScaledVector(d, -d.dot(o)).normalize() })
    .scale(0.22, 0.26, 0.18).translate(0, -0.02, 0.44);
  // The lantern tail.
  const tail = colored(furBall({ widthSegs: 22, heightSegs: 16, tufts: 22, amp: 0.2, seed: 14 }).scale(0.17, 0.17, 0.15).translate(0, 0.18, -0.7), LAMP, 4, false);
  return merge([colored(body, '#ffffff'), colored(belly, BELLY), colored(chest, BELLY), tail]);
}

const CRANIUM = new THREE.Vector3(0, 0.02, 0);
function headGeometry() {
  const head = sculpt(new THREE.SphereGeometry(1, 36, 26), (d, o) => {
    const m = smooth(d.z, 0, 1);
    return o.set(d.x * 0.2 * (1 - 0.25 * m), d.y * 0.19 * (1 - 0.2 * m), d.z * 0.26);
  }).translate(0, 0, 0.04);
  const cheeks = ellipsoid(0.16, 0.1, 0.12, 16, 10).translate(0, -0.08, 0.14);
  const nose = ellipsoid(0.035, 0.025, 0.02, 10, 8).translate(0, -0.02, 0.3);
  return merge([colored(head, '#ffffff', 1), colored(cheeks, BELLY), colored(nose, NOSE, 0, false)]);
}

function earGeometry() {
  // A long spoon of an ear, up +y, the face forward; lit inside and at the tip.
  const prof: [number, number][] = [[0, 0.8], [0.05, 0.78], [0.1, 0.68], [0.12, 0.45], [0.1, 0.2], [0.07, 0.04], [0, 0]];
  const ear = lathe(prof, 16).scale(1, 1, 0.34);
  const inner = lathe(prof.map(([r, y]) => [r * 0.62, y * 0.9 + 0.04] as [number, number]), 12).scale(1, 1, 0.16).translate(0, 0, 0.018);
  const tip = ellipsoid(0.06, 0.1, 0.03, 12, 8).translate(0, 0.72, 0.012);
  return merge([colored(ear, '#ffffff'), colored(inner, LAMP, 4, false), colored(tip, LAMP, 4, false)]);
}

function legGeometry(hind: boolean, upper: boolean) {
  if (!hind) {
    if (upper) return limb([[0, 0.08], [0.08, 0.04], [0.07, -0.12], [0.05, -0.26], [0, -0.3]], '#ffffff');
    return merge([limb([[0, 0.04], [0.045, 0.01], [0.04, -0.26], [0, -0.32]], '#ffffff'), colored(ellipsoid(0.06, 0.04, 0.09, 10, 6).translate(0, -0.31, 0.04), BELLY)]);
  }
  // Great haunches and a long hind foot.
  if (upper) return limb([[0, 0.14], [0.2, 0.06], [0.18, -0.15], [0.1, -0.36], [0, -0.42]], '#ffffff');
  const L = 0.5;
  return merge([limb([[0, 0.05], [0.07, 0.02], [0.05, -0.3], [0.045, -L + 0.04], [0, -L]], '#ffffff'), colored(ellipsoid(0.08, 0.05, 0.2, 12, 8).translate(0, -L + 0.03, 0.12), BELLY)]);
}

export class LanternHare extends Beast {
  private bodyB: PartBatch; private headB: PartBatch; private earB: PartBatch; private legB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'lanternhare', radius: 0.65, centreY: 0.82, flockSize: [1, 3],
      mount: {
        name: 'lanternhare', radius: 0.5,
        walk: { speed: 12, sprint: 42, takeoff: 0 },
        leap: 14, swim: 0.35, gather: 1.4,
        // Fastest of all, and loose: slow to stop, sliding through turns.
        trait: { grip: 2.6, brake: 3.5, turn: 0.6, leapFwd: 12, maxClimb: 1.3, airTurn: 0.5 },
      },
      amble: 1.2, travel: 2.5, flee: 20, wary: [10, 22], space: 2, spread: 6,
      habitat: (s) => (s.forest < 0.45 && s.slope < 1.5 && s.h > 3 && s.h < 170 && s.bog < 0.3 && s.hollow < 0.2 ? 0.3 + Math.abs(s.forest - 0.15) + s.slope * 0.3 : Infinity),
      coats: ['#dccfb8', '#bba993', '#a3a0a6'], rare: ['#f5f0e8', 0.1],
      strideLen: 1.2, seatSpread: 0.7, herds: 1, every: [30, 60], verb: 'leap',
    });
    const look = { keep: 0.55, softCrease: 0.8 };
    this.bodyB = this.batch(bodyGeometry(), look);
    this.headB = this.batch(headGeometry(), { ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.62, 0.22], eyeSize: [0.2, 0.22], pupil: [0.1, 0.12], lookRange: [0.1, 0.07], mouthW: [-0.5, 0.1, 1.2] });
    this.earB = this.batch(earGeometry(), look, 2);
    this.legB = [this.batch(legGeometry(false, true), look, 2), this.batch(legGeometry(false, false), look, 2), this.batch(legGeometry(true, true), look, 2), this.batch(legGeometry(true, false), look, 2)];
    this.saddleB = this.batch(saddleGeometry(0.4, 0.42, 0.6, '#c27a3a', '#efe4d2', '#6e4a33', 0.5), { keep: 0.75, doubleSide: true }, 1, 8);
    this.collarB = this.batch(collarGeometry(0.15), { keep: 0.6 }, 1, 8);
  }

  protected build(d: BeastData) {
    this.draw(d, this.bodyB, d.body);
    const neck = this.node(d, 'neck', d.body, 0, 0.22, 0.42);
    neck.add(d.head);
    d.head.position.set(0, 0.16, 0.08);
    this.draw(d, this.headB, d.head, { eye: true });
    for (let k = 0; k < 2; k++) this.draw(d, this.earB, this.node(d, `ear${k}`, d.head, (k ? -1 : 1) * 0.08, 0.14, -0.06));
    neck.add(d.collar);
    d.collar.position.set(0, 0.04, 0.04);
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    this.draw(d, this.saddleB, this.node(d, 'saddle', d.body, 0, 0.02, -0.08), { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, 0.5, -0.1);
    d.s.legs = this.makeLegs(d, { front: new THREE.Vector3(0.14, -0.2, 0.34), hind: new THREE.Vector3(0.24, -0.12, -0.35), fu: 0.28, fl: 0.32, hu: 0.4, hl: 0.5, fold: 1.1 }, this.legB);
  }

  protected feet(d: BeastData) {
    return this.legFeet(d.s.legs as LegSet);
  }

  protected pose(m: Mob, d: BeastData, a: Anim) {
    const t = a.t;
    // Bounding: forefeet down, hind feet swinging past them, the body
    // arching and stretching each stride; a hop-hop when ambling.
    const g = this.gaitMix(d, a, 2, 6, GAIT.bound);
    const bound = clamp(g.wT + g.wG, 0, 1);
    const offs = mixGait(g.offs, GAIT.bound, bound);
    const c = a.cyc * Math.PI * 2;
    const arch = Math.sin(c) * 0.16 * bound * a.moving;
    const lift = Math.max(0, Math.sin(c - 0.6)) * lerp(0.08, 0.3, g.wG) * a.moving;
    const pitch = d.pitch.step(-a.slope + arch - a.joy * 0.3 + (a.caught ? Math.sin(m.stateT * 7) * 0.2 : 0), 70, 12, a.dt) + (a.air > 0.5 ? clamp(-a.vy * 0.03, -0.35, 0.35) : 0);
    d.body.position.y += lift + a.air * 0.05 + a.joy * 0.3 - a.graze * 0.05;
    d.body.rotation.set(pitch, 0, a.bank * 1.3);
    d.body.scale.set(1, 1, 1 + arch * 0.4);
    this.poseLegs(d.s.legs, a, offs, lerp(g.duty, 0.32, bound), g.sweep * lerp(1, 1.3, bound), g.flex, pitch);
    // Head: nibbling the grass, up and alert; ears up, swivelling, laid
    // back along the neck at a run, flopping in a leap.
    const run = clamp((a.speed - 8) / 16, 0, 1);
    const nib = a.graze * (0.7 + Math.max(0, Math.sin(t * 9)) * 0.06);
    d.n.neck.rotation.set(nib + run * 0.3 - pitch * 0.6, a.lookYaw * 0.5, 0);
    d.head.rotation.set(-0.1 + nib * 0.4 - a.alert * 0.12, a.lookYaw * 0.5, a.alert * Math.sin(t * 0.9) * 0.12);
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      const back = Math.max(run * 1.2, a.air * 0.6);
      const twitch = Math.max(0, Math.sin(t * 1.4 + k * 2.3) - 0.9) * 5;
      d.n[`ear${k}`].rotation.set(-0.15 - back * 1.1 + twitch * 0.3 + Math.sin(a.stride * Math.PI * 2) * 0.1 * a.moving, s * (0.15 + a.lookYaw * 0.2), -s * (0.12 + back * 0.1));
    }
  }
}
