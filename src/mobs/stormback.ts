import * as THREE from 'three';
import { Beast, clamp, collarGeometry, lerp, saddleGeometry, type Anim, type BeastData, type LegSet } from './beast';
import type { PartBatch } from './parts';
import { colored, ellipsoid, furBall, hoof, limb, merge, mirrorX, sculpt, smooth, tube } from './shapes';
import type { Mob } from './types';

// The stormback: a big, shaggy, low-slung beast of the open downs, part
// bison, part musk ox, with a great woolly hump, a shag skirt that hides its
// legs, a fringe over its eyes and small curved horns. Its wool gathers
// static as it runs: little blue sparks crawl over the hump. Ridden, the
// static builds with every stride, and Space lets it all go in a charge: a
// thundering rush that knocks trees flat, throws creatures aside, rides
// over small rocks and sails across gaps.

const HORN = '#e8dcc2';
const SPARK = '#cdeeff';
const HOOF = '#353036';

function barrel(d: THREE.Vector3, out: THREE.Vector3) {
  const front = smooth(d.z, -0.3, 0.7);
  let y = d.y * 0.55;
  // The hump: high over the shoulders, sloping to the rump.
  if (d.y > 0) y += 0.32 * Math.exp(-(((d.z - 0.35) / 0.45) ** 2)) * d.y ** 1.2;
  return out.set(d.x * 0.62 * (1 + 0.12 * front), y, d.z * 0.95);
}

function bodyGeometry() {
  const wool = furBall({
    widthSegs: 56, heightSegs: 40, tufts: 140, amp: 0.13, sweep: 0.14, share: 0.55, seed: 61,
    comb: (d, o) => o.set(0, -1, -0.4).addScaledVector(d, -d.dot(o)).normalize(),
  });
  sculpt(wool, barrel);
  // The shag skirt, hanging to the knees.
  const skirt = furBall({
    widthSegs: 48, heightSegs: 30, tufts: 90, amp: 0.2, sweep: 0.3, share: 0.7, seed: 62,
    comb: (d, o) => o.set(0, -1, 0).addScaledVector(d, -d.dot(o)).normalize(),
    mask: (d) => smooth(-d.y, -0.2, 0.3),
  }).scale(0.66, 0.62, 0.96).translate(0, -0.12, 0);
  return merge([colored(wool, '#ffffff'), colored(skirt, '#e4e0dc')]);
}

const CRANIUM = new THREE.Vector3(0, 0.04, 0);
function headGeometry() {
  // Broad and low, a blunt muzzle.
  const head = sculpt(new THREE.SphereGeometry(1, 36, 26), (d, o) => {
    const m = smooth(d.z, 0.1, 1);
    return o.set(d.x * 0.3 * (1 - 0.2 * m), d.y * 0.27 * (1 - 0.15 * m) - 0.04 * m, d.z * 0.36);
  });
  const nose = ellipsoid(0.16, 0.08, 0.05, 16, 10).translate(0, -0.1, 0.34);
  // A fringe falling over the brow (the eyes peep out underneath).
  const fringe = furBall({ widthSegs: 30, heightSegs: 22, tufts: 40, amp: 0.2, sweep: 0.22, share: 0.6, seed: 8, comb: (d, o) => o.set(0, -1, 0.3).addScaledVector(d, -d.dot(o)).normalize(), mask: (d) => smooth(d.y, 0.25, 0.6) })
    .scale(0.34, 0.32, 0.36).translate(0, 0.02, -0.02);
  const beard = furBall({ widthSegs: 20, heightSegs: 14, tufts: 18, amp: 0.3, sweep: 0.25, seed: 5, comb: (d, o) => o.set(0, -1, 0).addScaledVector(d, -d.dot(o)).normalize() })
    .scale(0.16, 0.2, 0.14).translate(0, -0.28, 0.12);
  // Small horns curving out and up.
  const horn = tube([[0.22, 0.16, -0.02], [0.36, 0.2, 0.0], [0.42, 0.34, 0.06], [0.38, 0.44, 0.1]], 0.06, 0.018, HORN, 0, false, 14, 7);
  return merge([colored(head, '#ffffff', 1), colored(nose, '#4a3e44', 0, false), colored(fringe, '#e4e0dc'), colored(beard, '#e4e0dc'), horn, mirrorX(horn)]);
}

/** A zigzag spark, a few bright kinks. */
function sparkGeometry() {
  const pts: [number, number, number][] = [[0, 0, 0], [0.06, 0.08, 0], [-0.03, 0.14, 0.02], [0.05, 0.22, 0], [0, 0.3, 0.01]];
  const g: THREE.BufferGeometry[] = [];
  for (let i = 0; i + 1 < pts.length; i++) g.push(tube([pts[i], pts[i + 1]], 0.016, 0.012, SPARK, 4, false, 2, 4));
  return merge(g);
}

function legGeometry(upper: boolean) {
  if (upper) return limb([[0, 0.14], [0.2, 0.06], [0.2, -0.12], [0.15, -0.34], [0, -0.42]], '#ffffff');
  const L = 0.42;
  return merge([limb([[0, 0.05], [0.12, 0.02], [0.1, -0.2], [0.11, -L + 0.08], [0, -L + 0.06]], '#d6d0cc'), hoof(L, 0.12, HOOF, 1.2)]);
}

const SPARKS: [number, number, number, number][] = [[0.2, 0.62, 0.35, 0.3], [-0.25, 0.58, 0.2, -0.4], [0.05, 0.7, 0.55, 0.1], [0.4, 0.35, 0.1, 1.0], [-0.4, 0.4, 0.45, -1.0], [0.1, 0.5, -0.3, 0.5], [-0.15, 0.5, -0.5, -0.3]];

export class Stormback extends Beast {
  private bodyB: PartBatch; private headB: PartBatch; private sparkB: PartBatch; private legB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'stormback', radius: 1.1, centreY: 1.3, flockSize: [2, 4],
      mount: {
        name: 'stormback', radius: 0.85,
        walk: { speed: 7, sprint: 18, takeoff: 0 },
        leap: 6, swim: 0.4, gather: 2.2,
        trait: { ability: 'charge', maxClimb: 1.1, turn: 0.85 },
      },
      amble: 0.8, travel: 1.3, flee: 12, wary: [10, 20], space: 3.2, spread: 9,
      habitat: (s) => (s.forest < 0.1 && s.slope < 1.2 && s.h > 4 && s.h < 150 && s.bog < 0.2 && s.hollow < 0.2 ? 0.3 + s.slope * 0.3 + s.forest * 3 : Infinity),
      coats: ['#7f8898', '#8e857c', '#646a7c'], rare: ['#cdd1dc', 0.08],
      strideLen: 1.1, seatSpread: 1.0, herds: 1, every: [30, 70], verb: 'charge',
    });
    const look = { keep: 0.55, softCrease: 0.75 };
    this.bodyB = this.batch(bodyGeometry(), look);
    this.headB = this.batch(headGeometry(), { ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.48, 0.12], eyeSize: [0.13, 0.12], pupil: [0.07, 0.07], lookRange: [0.07, 0.04] });
    this.sparkB = this.batch(sparkGeometry(), { keep: 0.9 }, SPARKS.length);
    this.legB = [this.batch(legGeometry(true), look, 2), this.batch(legGeometry(false), look, 2), this.batch(legGeometry(true), look, 2), this.batch(legGeometry(false), look, 2)];
    this.saddleB = this.batch(saddleGeometry(0.64, 0.6, 0.8, '#3e5a7a', '#efe4d2', '#6e4a33', 0.45), { keep: 0.75, doubleSide: true }, 1, 8);
    this.collarB = this.batch(collarGeometry(0.34), { keep: 0.6 }, 1, 8);
  }

  protected build(d: BeastData) {
    this.draw(d, this.bodyB, d.body);
    d.body.add(d.head);
    d.head.position.set(0, 0.0, 1.0);
    this.draw(d, this.headB, d.head, { eye: true });
    d.body.add(d.collar);
    d.collar.position.set(0, 0.05, 0.78);
    d.collar.rotation.x = Math.PI / 2 - 0.3;
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    SPARKS.forEach(([x, y, z, r], i) => {
      const o = this.node(d, `spark${i}`, d.body, x, y, z);
      o.rotation.set(0, 0, r);
      this.draw(d, this.sparkB, o, { tint: false });
    });
    this.draw(d, this.saddleB, this.node(d, 'saddle', d.body, 0, 0.12, -0.15), { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, 0.78, -0.15);
    d.s.legs = this.makeLegs(d, { front: new THREE.Vector3(0.34, -0.38, 0.55), hind: new THREE.Vector3(0.34, -0.36, -0.6), fu: 0.42, fl: 0.42, hu: 0.42, hl: 0.42, fold: 0.25 }, this.legB);
    d.s.static = 0;
  }

  protected feet(d: BeastData) {
    return this.legFeet(d.s.legs as LegSet);
  }

  protected pose(m: Mob, d: BeastData, a: Anim) {
    const t = a.t;
    const gs = a.gs;
    const charge = gs ? clamp(gs.charge * 3, 0, 1) : 0;
    // Static: the rider's meter when ridden; wild ones crackle when they run.
    const st = gs ? gs.static : (d.s.static = clamp(d.s.static + (a.speed > 6 ? a.dt * 0.25 : -a.dt * 0.1), 0, 0.8));
    const g = this.gaitMix(d, a, 3, 8);
    const pitch = d.pitch.step(-a.slope * 0.9 + g.rock + charge * 0.18 - a.joy * 0.2 + (a.caught ? Math.max(0, Math.sin(m.stateT * 4)) * 0.2 : 0), 50, 11, a.dt) + (a.air > 0.5 ? clamp(-a.vy * 0.03, -0.25, 0.25) : 0);
    d.body.position.y += g.bounce + a.air * 0.05 + a.joy * 0.15;
    d.body.rotation.set(pitch, 0, a.bank);
    this.poseLegs(d.s.legs, a, g.offs, g.duty, g.sweep * 0.9, g.flex * 0.9, pitch);
    // Head low; lower still to graze or to charge, horns first.
    const graze = a.graze * (0.45 + Math.sin(t * 5) * 0.03);
    d.head.rotation.set(graze + charge * 0.4 - a.alert * 0.1 + Math.sin(a.stride * Math.PI * 4) * 0.05 * a.moving - pitch * 0.4, a.lookYaw * 0.6, 0);
    d.head.position.y = lerp(0, -0.12, Math.max(a.graze, charge));
    // Sparks crawl over the wool: more with more static, all of them in a charge.
    for (let i = 0; i < SPARKS.length; i++) {
      const o = d.n[`spark${i}`];
      const on = charge > 0 || (st > 0.1 && Math.sin(t * (7 + i * 1.3) + i * 2.1) > 1 - st * 0.9);
      o.visible = on;
      if (on) o.scale.setScalar(0.7 + 0.5 * Math.abs(Math.sin(t * 23 + i)) + charge * 0.4);
    }
  }
}
