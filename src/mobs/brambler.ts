import * as THREE from 'three';
import { Beast, clamp, collarGeometry, lerp, saddleGeometry, type Anim, type BeastData, type LegSet } from './beast';
import type { PartBatch } from './parts';
import { colored, ellipsoid, furBall, merge, mirrorX, sculpt, smooth, tube } from './shapes';
import type { Mob } from './types';

// The brambler: a deer-sized creature woven out of the forest itself. Its
// body is a basket of bent branches round a dark hollow, grown over with
// leafy clumps and a few red berries; its legs are long twigs, its antlers
// bare branches with leaves budding on them. Standing still in the trees
// it's a thicket. Ridden, it walks straight through trees and bushes (the
// wood just parts round it), goes quicker the deeper the forest, and picks
// its way up slopes too steep for most.

const BARK = '#6d4c38';
const BARK2 = '#83604a';
const HOLLOW = '#3b2c28';
const BERRY = '#b8403a';

function bodyGeometry() {
  // The dark hollow inside.
  const core = ellipsoid(0.3, 0.3, 0.6, 28, 20);
  // Ribs of bent branch hooping round it, and two long ones down the flanks.
  const ribs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const z = 0.5 - i * 0.2;
    const r = 0.36 * Math.sqrt(1 - (z / 0.72) ** 2) + 0.04;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 8; k++) {
      const a = -Math.PI * 0.95 + (k / 8) * Math.PI * 1.9;
      pts.push([Math.sin(a) * r * 1.05, Math.cos(a) * r, z + Math.sin(a * 2 + i) * 0.03]);
    }
    ribs.push(tube(pts, 0.04, 0.03, i % 2 ? BARK : BARK2, 0, false, 16, 6));
  }
  for (const s of [-1, 1]) {
    ribs.push(tube([[s * 0.2, 0.25, 0.7], [s * 0.34, 0.12, 0.25], [s * 0.35, 0.1, -0.2], [s * 0.26, 0.16, -0.62]], 0.05, 0.035, BARK, 0, false, 16, 6));
  }
  // Leafy clumps over the back and shoulders (they take the coat: green, autumn...).
  const leaves: THREE.BufferGeometry[] = [];
  const spots: [number, number, number, number][] = [[0, 0.3, 0.35, 0.24], [0.12, 0.3, -0.05, 0.22], [-0.1, 0.3, -0.35, 0.22], [0.26, 0.12, 0.45, 0.14], [-0.26, 0.14, 0.2, 0.14], [0.2, 0.2, -0.45, 0.15]];
  spots.forEach(([x, y, z, r], i) => leaves.push(colored(furBall({ widthSegs: 20, heightSegs: 14, tufts: 18, amp: 0.3, sweep: 0.1, seed: 50 + i }).scale(r, r * 0.8, r).translate(x, y, z), '#ffffff')));
  const berries: THREE.BufferGeometry[] = [];
  for (const [x, y, z] of [[0.08, 0.5, 0.4], [-0.1, 0.46, 0.28], [0.2, 0.44, -0.1], [-0.15, 0.45, -0.3], [0.3, 0.26, 0.5]]) berries.push(colored(ellipsoid(0.04, 0.04, 0.04, 8, 6).translate(x, y, z), BERRY, 0, false));
  // A leafy sprig of a tail.
  const tail = colored(furBall({ widthSegs: 14, heightSegs: 10, tufts: 10, amp: 0.4, seed: 3 }).scale(0.1, 0.14, 0.16).translate(0, 0.2, -0.78), '#ffffff');
  return merge([colored(core, HOLLOW, 0, false), ...ribs, ...leaves, ...berries, tail]);
}

function neckGeometry() {
  // Twisted vines, two strands wound round each other up the neck.
  const g: THREE.BufferGeometry[] = [];
  for (let s = 0; s < 2; s++) {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, a = t * Math.PI * 2 + s * Math.PI;
      pts.push([Math.cos(a) * 0.07, t * 0.62 - 0.05, Math.sin(a) * 0.07]);
    }
    g.push(tube(pts, 0.07, 0.05, s ? BARK : BARK2, 0, false, 20, 6));
  }
  return merge(g);
}

const CRANIUM = new THREE.Vector3(0, 0.02, 0);
function headGeometry() {
  // A long skull of pale weathered wood.
  const skull = sculpt(new THREE.SphereGeometry(1, 32, 22), (d, o) => {
    const k = 1 - 0.45 * smooth(d.z, -0.1, 1);
    return o.set(d.x * 0.15 * k, d.y * 0.14 * k, d.z * 0.3);
  }).translate(0, 0, 0.08);
  // Branch antlers with leaf buds.
  const antler: THREE.BufferGeometry[] = [];
  const add = (pts: [number, number, number][], r0: number, r1: number) => antler.push(tube(pts, r0, r1, BARK2, 0, false, 12, 5));
  add([[0.05, 0.08, -0.04], [0.14, 0.3, -0.1], [0.28, 0.52, -0.12], [0.34, 0.72, -0.04]], 0.035, 0.015);
  add([[0.14, 0.3, -0.1], [0.26, 0.36, 0.02], [0.36, 0.42, 0.08]], 0.02, 0.01);
  add([[0.28, 0.52, -0.12], [0.44, 0.58, -0.2], [0.5, 0.66, -0.2]], 0.018, 0.009);
  const buds: THREE.BufferGeometry[] = [];
  for (const [x, y, z] of [[0.36, 0.44, 0.09], [0.5, 0.67, -0.2], [0.34, 0.74, -0.03]]) buds.push(colored(ellipsoid(0.07, 0.025, 0.045, 10, 6).rotateZ(0.6).translate(x, y, z), '#ffffff'));
  const one = merge([...antler, ...buds]);
  return merge([colored(skull, '#e0d4bd', 1, false), one, mirrorX(one)]);
}

function legGeometry(hind: boolean, upper: boolean) {
  // Long twigs, knobbly at the joints.
  const L = upper ? (hind ? 0.62 : 0.58) : 0.66;
  const knob = colored(ellipsoid(0.07, 0.07, 0.07, 10, 8), BARK2, 0, false);
  const twig = tube([[0, 0, 0], [0.01, -L * 0.5, 0.015], [0, -L, 0]], upper ? 0.06 : 0.045, upper ? 0.045 : 0.025, BARK, 0, false, 8, 6);
  if (upper) return merge([twig, knob]);
  // A split root of a foot.
  const toes: THREE.BufferGeometry[] = [];
  for (const a of [-0.5, 0.5]) toes.push(tube([[0, -L + 0.02, 0], [Math.sin(a) * 0.06, -L, 0.06]], 0.025, 0.015, BARK, 0, false, 4, 5));
  return merge([twig, knob, ...toes]);
}

export class Brambler extends Beast {
  private bodyB: PartBatch; private neckB: PartBatch; private headB: PartBatch; private legB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'brambler', radius: 0.7, centreY: 1.38, flockSize: [1, 3],
      mount: {
        name: 'brambler', radius: 0.5,
        walk: { speed: 8, sprint: 20, takeoff: 0 },
        leap: 8.5, swim: 0.4, gather: 1.8,
        trait: { thicket: true, maxClimb: 1.6, slopeDrag: 0.6, turn: 1.1 },
      },
      amble: 0.9, travel: 1.5, flee: 12, wary: [7, 15], space: 2.4, spread: 7,
      habitat: (s) => (s.forest > 0.55 && s.bog < 0.3 ? 0.9 - s.forest * 0.6 + s.slope * 0.1 : Infinity),
      coats: ['#7c8a48', '#a68d45', '#9a6444'], rare: ['#c7b2c9', 0.08],
      strideLen: 1.3, seatSpread: 0.66, herds: 1, every: [30, 70], verb: 'leap',
    });
    const look = { keep: 0.55, softCrease: 0.6 };
    this.bodyB = this.batch(bodyGeometry(), look);
    this.neckB = this.batch(neckGeometry(), look);
    this.headB = this.batch(headGeometry(), { ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.62, 0.12], eyeSize: [0.15, 0.13], pupil: [0.08, 0.08], lookRange: [0.08, 0.05] });
    this.legB = [this.batch(legGeometry(false, true), look, 2), this.batch(legGeometry(false, false), look, 2), this.batch(legGeometry(true, true), look, 2), this.batch(legGeometry(true, false), look, 2)];
    this.saddleB = this.batch(saddleGeometry(0.36, 0.34, 0.66, '#b8473a', '#f1e6d2', '#7a4a36', 0.5), { keep: 0.75, doubleSide: true }, 1, 8);
    this.collarB = this.batch(collarGeometry(0.16), { keep: 0.6 }, 1, 8);
  }

  protected build(d: BeastData) {
    this.draw(d, this.bodyB, d.body);
    const neck = this.node(d, 'neck', d.body, 0, 0.2, 0.56);
    this.draw(d, this.neckB, neck);
    neck.add(d.head);
    d.head.position.set(0, 0.62, 0.02);
    this.draw(d, this.headB, d.head, { eye: true });
    neck.add(d.collar);
    d.collar.position.set(0, 0.3, 0);
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    this.draw(d, this.saddleB, this.node(d, 'saddle', d.body, 0, 0.06, -0.02), { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, 0.46, -0.02);
    d.s.legs = this.makeLegs(d, { front: new THREE.Vector3(0.2, -0.2, 0.45), hind: new THREE.Vector3(0.2, -0.12, -0.48), fu: 0.58, fl: 0.66, hu: 0.62, hl: 0.66, fold: 0.4 }, this.legB);
  }

  protected feet(d: BeastData) {
    return this.legFeet(d.s.legs as LegSet);
  }

  protected pose(m: Mob, d: BeastData, a: Anim) {
    const t = a.t;
    const g = this.gaitMix(d, a, 3, 9);
    // Stock still when idle: a thicket with eyes. A creak and a sway now and then.
    const still = a.graze;
    const sway = Math.sin(t * 0.6) * 0.02 * (1 - a.moving);
    const pitch = d.pitch.step(-a.slope + g.rock - a.joy * 0.3 + (a.caught ? Math.max(0, Math.sin(m.stateT * 4.5)) * 0.35 : 0), 50, 11, a.dt) + (a.air > 0.5 ? clamp(-a.vy * 0.035, -0.3, 0.3) : 0);
    d.body.position.y += g.bounce + a.air * 0.05 + a.joy * 0.1;
    d.body.rotation.set(pitch, 0, a.bank + sway);
    this.poseLegs(d.s.legs, a, g.offs, g.duty, g.sweep, g.flex, pitch);
    const run = g.wG * clamp((a.speed - 9) / 8, 0, 1);
    d.n.neck.rotation.set(lerp(0.35, 0.95, run) + still * 0.6 - pitch, a.lookYaw * 0.6, sway);
    d.head.rotation.set(lerp(-0.2, -0.55, run) + still * 0.35 - a.alert * 0.1 + Math.sin(a.stride * Math.PI * 4) * 0.04 * a.moving, a.lookYaw * 0.4, 0);
    d.s.lids = still > 0 && !a.alert ? 0.3 : undefined;
  }
}
