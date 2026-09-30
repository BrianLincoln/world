import * as THREE from 'three';
import { Beast, clamp, collarGeometry, GAIT, lerp, mixGait, saddleGeometry, type Anim, type BeastData, type LegSet } from './beast';
import type { PartBatch } from './parts';
import { colored, curlHorn, ellipsoid, furBall, hoof, limb, merge, mirrorX, sculpt, smooth } from './shapes';
import type { Mob } from './types';

// The rockhopper: a small, stocky, shaggy mountain goat with big curled
// horns, a beard and oblong goat pupils. Flocks skip about the crags and
// the steep rocky slopes of the high ground. Ridden, it's quick and bouncy
// (it pronks along on all four at once), sure-footed on slopes that stop
// anything else, and Space launches an enormous spring-loaded bound that
// clears gullies and ledges.

const HORN = '#d9c9a8';
const HOOF = '#3d3234';

function bodyGeometry() {
  const body = furBall({
    widthSegs: 48, heightSegs: 34, tufts: 90, amp: 0.12, sweep: 0.1, share: 0.5, seed: 41,
    comb: (d, o) => o.set(0, -1, -0.3).addScaledVector(d, -d.dot(o)).normalize(),
  });
  sculpt(body, (d, o) => {
    const front = smooth(d.z, -0.2, 0.8);
    return o.set(d.x * 0.36 * (1 + 0.08 * front), d.y * 0.36 * (1 + 0.1 * front), d.z * 0.55);
  });
  // A short upturned tail.
  const tail = ellipsoid(0.07, 0.12, 0.06, 12, 8).rotateX(-0.6).translate(0, 0.2, -0.55);
  return merge([colored(body, '#ffffff'), colored(tail, '#f1ece2')]);
}

const CRANIUM = new THREE.Vector3(0, 0.02, 0);
function headGeometry() {
  const head = sculpt(new THREE.SphereGeometry(1, 36, 26), (d, o) => {
    const muzzle = smooth(d.z, 0.2, 1);
    return o.set(d.x * 0.16 * (1 - 0.35 * muzzle), d.y * 0.16 * (1 - 0.2 * muzzle) - 0.03 * muzzle, d.z * 0.26);
  }).translate(0, 0, 0.06);
  const nose = ellipsoid(0.05, 0.035, 0.02, 10, 8).translate(0, -0.04, 0.325);
  const beard = furBall({ widthSegs: 18, heightSegs: 14, tufts: 14, amp: 0.25, sweep: 0.2, seed: 6, comb: (d, o) => o.set(0, -1, 0).addScaledVector(d, -d.dot(o)).normalize() })
    .scale(0.06, 0.13, 0.06).translate(0, -0.2, 0.2);
  // Ram's horns: curling back and down round the ears.
  const horn = mirrorX(curlHorn(0.05, 0.85, 0.14, HORN).rotateY(Math.PI + 0.3));
  const L = horn.clone().translate(0.07, 0.12, 0);
  const R = mirrorX(horn).translate(-0.07, 0.12, 0);
  return merge([colored(head, '#ffffff', 1), colored(nose, '#4a3a3a', 0, false), colored(beard, '#f1ece2'), L, R]);
}

function earGeometry() {
  return colored(ellipsoid(0.1, 0.035, 0.045, 12, 8).translate(0.09, 0, 0), '#ffffff');
}

function legGeometry(hind: boolean, upper: boolean) {
  if (upper) return limb([[0, 0.12], [0.16, 0.05], [0.17, -0.1], [0.12, -0.3], [0, -0.38]], '#ffffff', 0.9);
  const L = 0.4;
  return merge([limb([[0, 0.05], [0.085, 0.02], [0.075, -0.2], [0.08, -L + 0.07], [0, -L + 0.05]], '#e8e0d8'), hoof(L, 0.09, HOOF, 1.3)]);
}

export class Rockhopper extends Beast {
  private bodyB: PartBatch; private headB: PartBatch; private earB: PartBatch; private legB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'rockhopper', radius: 0.6, centreY: 0.92, flockSize: [2, 5],
      mount: {
        name: 'rockhopper', radius: 0.45,
        walk: { speed: 8, sprint: 17, takeoff: 0 },
        leap: 19, swim: 0.35, gather: 0.8,
        // A spring-loaded bound, steerable in the air, sure on steep rock.
        trait: { leapFwd: 5, airTurn: 2.4, maxClimb: 2.4, slopeDrag: 0.3, turn: 1.3 },
      },
      amble: 1, travel: 2, flee: 12, wary: [9, 18], space: 1.6, spread: 7,
      habitat: (s) => {
        if (s.h < 40 || s.bog > 0.2 || s.forest > 0.4) return Infinity;
        // Crags: high, steep and rocky.
        return 1.6 - clamp(s.slope / 3, 0, 1) - s.rock * 0.5 - clamp((s.h - 60) / 120, 0, 0.5) + s.forest;
      },
      coats: ['#e2dbcf', '#a79b90', '#7a695d'], rare: ['#3e3638', 0.08],
      strideLen: 0.65, seatSpread: 0.7, herds: 1, every: [30, 60], verb: 'bound',
    });
    const look = { keep: 0.55, softCrease: 0.75 };
    this.bodyB = this.batch(bodyGeometry(), look);
    // Oblong goat pupils.
    this.headB = this.batch(headGeometry(), { ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.72, 0.28], eyeSize: [0.17, 0.15], pupil: [0.11, 0.045], lookRange: [0.08, 0.04] });
    this.earB = this.batch(earGeometry(), look, 2);
    this.legB = [this.batch(legGeometry(false, true), look, 2), this.batch(legGeometry(false, false), look, 2), this.batch(legGeometry(true, true), look, 2), this.batch(legGeometry(true, false), look, 2)];
    this.saddleB = this.batch(saddleGeometry(0.37, 0.37, 0.55, '#a8433a', '#efe4d2', '#6e4a33', 0.55), { keep: 0.75, doubleSide: true }, 1, 8);
    this.collarB = this.batch(collarGeometry(0.17), { keep: 0.6 }, 1, 8);
  }

  protected build(d: BeastData) {
    this.draw(d, this.bodyB, d.body);
    const neck = this.node(d, 'neck', d.body, 0, 0.18, 0.42);
    neck.add(d.head);
    d.head.position.set(0, 0.1, 0.16);
    this.draw(d, this.headB, d.head, { eye: true });
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      this.draw(d, this.earB, this.node(d, `ear${k}`, d.head, s * 0.12, 0.06, -0.06));
    }
    neck.add(d.collar);
    d.collar.position.set(0, 0.05, 0.02);
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    this.draw(d, this.saddleB, this.node(d, 'saddle', d.body, 0, 0, -0.04), { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, 0.46, -0.04);
    d.s.legs = this.makeLegs(d, { front: new THREE.Vector3(0.17, -0.18, 0.32), hind: new THREE.Vector3(0.18, -0.16, -0.32), fu: 0.34, fl: 0.4, hu: 0.34, hl: 0.4, fold: 0.3 }, this.legB);
  }

  protected feet(d: BeastData) {
    return this.legFeet(d.s.legs as LegSet);
  }

  protected pose(m: Mob, d: BeastData, a: Anim) {
    const t = a.t;
    // Bouncy: past a trot it pronks, all four feet together, the body
    // springing off the ground each stride.
    const g = this.gaitMix(d, a, 2.5, 7, GAIT.pronk);
    const pronk = g.wG;
    const offs = mixGait(g.offs, GAIT.pronk, pronk);
    const spring = pronk * Math.max(0, Math.sin(a.cyc * Math.PI * 2)) * 0.28 * a.moving;
    const pitch = d.pitch.step(-a.slope * 0.8 + g.rock * 0.5 - a.joy * 0.35 + (a.caught ? Math.sin(m.stateT * 6) * 0.25 : 0), 60, 12, a.dt) + (a.air > 0.5 ? clamp(-a.vy * 0.03, -0.4, 0.4) : 0);
    d.body.position.y += g.bounce + spring + a.air * 0.04 + a.joy * 0.25;
    d.body.rotation.set(pitch, 0, a.bank);
    this.poseLegs(d.s.legs, a, offs, lerp(g.duty, 0.45, pronk), g.sweep * (1 - 0.4 * pronk), g.flex, pitch);
    const neck = d.n.neck;
    neck.rotation.set(0.4 + a.graze * 0.7 - pitch * 0.5 + Math.sin(t * 6) * 0.03 * a.graze, a.lookYaw * 0.5, 0);
    d.head.rotation.set(a.graze * 0.5 - a.alert * 0.15 + Math.sin(a.stride * Math.PI * 4) * 0.05 * a.moving, a.lookYaw * 0.5, a.alert * Math.sin(t * 0.8) * 0.15);
    for (let k = 0; k < 2; k++) {
      // The right ear is the left one turned round.
      const flick = Math.max(0, Math.sin(t * 1.1 + k * 1.7) - 0.95) * 8;
      d.n[`ear${k}`].rotation.set(0, k ? Math.PI : 0, -0.35 - flick * 0.3 + a.moving * 0.2);
    }
  }
}
