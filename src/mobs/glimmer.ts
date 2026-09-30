import * as THREE from 'three';
import { Beast, clamp, collarGeometry, lerp, saddleGeometry, type Anim, type BeastData, type LegSet } from './beast';
import type { PartBatch } from './parts';
import { colored, ellipsoid, furBall, hoof, lathe, limb, merge, sculpt, smooth } from './shapes';
import type { Mob } from './types';

// The glimmer: something between a fox and a cat, slim and long-legged,
// with a coat the colour of dusk, a plume of a tail and great pointed ears.
// Pale spots down its spine, the insides of its ears and the tip of its tail
// shine softly (brightly after dark). It lives in the glimmerwood, and
// comes out into any forest at night. Ridden, it's quick and nimble, and
// Space sends it glimmering a few metres straight through whatever's in the
// way: trunks, fences, cabin walls.

const SHINE = '#c4f3ff';
const PALE = '#eeeaf8';
const PAW = '#c9c6d8';
const NOSE = '#3a3450';

/** Lean, deep-chested, a tucked waist. */
function barrel(d: THREE.Vector3, out: THREE.Vector3) {
  const front = smooth(d.z, -0.1, 0.8);
  const waist = Math.exp(-(((d.z + 0.1) / 0.35) ** 2));
  let y = d.y * 0.3;
  if (d.y < 0) y *= 1 + 0.25 * front - 0.3 * waist;
  return out.set(d.x * 0.27 * (1 + 0.1 * front - 0.12 * waist), y, d.z * 0.72);
}

function bodyGeometry() {
  const body = sculpt(new THREE.SphereGeometry(1, 48, 30), barrel);
  // A soft pale bib at the chest.
  const bib = furBall({ widthSegs: 28, heightSegs: 20, tufts: 30, amp: 0.1, sweep: 0.08, seed: 8, comb: (d, o) => o.set(0, -1, 0.2).addScaledVector(d, -d.dot(o)).normalize() })
    .scale(0.2, 0.24, 0.17).translate(0, -0.05, 0.6);
  // Shining spots along the spine.
  const spots: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const z = 0.45 - i * 0.22;
    const top = barrel(new THREE.Vector3(0, 1, z / 0.72).normalize(), new THREE.Vector3());
    for (const s of [-1, 1]) spots.push(colored(ellipsoid(0.045 - i * 0.004, 0.02, 0.05, 10, 6).translate(s * 0.08, top.y - 0.012, z), SHINE, 4, false));
  }
  return merge([colored(body, '#ffffff'), colored(bib, PALE), ...spots]);
}

function neckGeometry() {
  const prof: [number, number][] = [[0, 0.5], [0.1, 0.46], [0.13, 0.3], [0.17, 0.08], [0.2, -0.1], [0, -0.2]];
  return colored(lathe(prof, 18).scale(0.85, 1, 1), '#ffffff');
}

const CRANIUM = new THREE.Vector3(0, 0.04, 0);
function headGeometry() {
  const cranium = ellipsoid(0.19, 0.17, 0.19, 36, 26).translate(CRANIUM.x, CRANIUM.y, CRANIUM.z);
  // A fine pointed muzzle, a little upturned.
  const muzzle = sculpt(new THREE.SphereGeometry(1, 24, 18), (d, o) => {
    const k = 1 - 0.6 * smooth(d.z, -0.2, 1);
    return o.set(d.x * 0.1 * k, d.y * 0.08 * k + 0.01 * d.z, d.z * 0.2);
  }).translate(0, -0.03, 0.2);
  const nose = ellipsoid(0.03, 0.022, 0.02, 10, 8).translate(0, -0.01, 0.4);
  // Cheek ruff, pale.
  const ruff = furBall({ widthSegs: 24, heightSegs: 16, tufts: 22, amp: 0.2, sweep: 0.12, seed: 3, comb: (d, o) => o.set(0, -0.3, -1).addScaledVector(d, -d.dot(o)).normalize(), mask: (d) => smooth(-d.z, -0.3, 0.2) * smooth(-d.y, -0.6, 0.2) })
    .scale(0.2, 0.16, 0.16).translate(0, -0.04, -0.03);
  return merge([colored(cranium, '#ffffff', 1), colored(muzzle, '#ffffff'), colored(nose, NOSE, 0, false), colored(ruff, PALE)]);
}

function earGeometry() {
  // A tall triangle, broad face forward, shining inside.
  const ear = new THREE.ConeGeometry(0.1, 0.34, 12, 1).scale(1, 1, 0.42).translate(0, 0.17, 0);
  const inner = new THREE.ConeGeometry(0.065, 0.26, 10, 1).scale(1, 1, 0.2).translate(0, 0.14, 0.022);
  return merge([colored(ear, '#ffffff'), colored(inner, SHINE, 4, false)]);
}

function tailGeometry() {
  // A long plume swept back and up, the tip alight.
  const plume = furBall({ widthSegs: 30, heightSegs: 22, tufts: 40, amp: 0.14, sweep: 0.1, seed: 12, comb: (d, o) => o.set(0, 0.1, -1).addScaledVector(d, -d.dot(o)).normalize() });
  const pos = plume.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const t = (1 - z) / 2; // 0 root .. 1 tip
    const r = 0.1 + 0.07 * Math.sin(t * Math.PI);
    pos.setXYZ(i, pos.getX(i) * r, pos.getY(i) * r + t * t * 0.35, -t * 0.85);
  }
  plume.computeVertexNormals();
  const tip = furBall({ widthSegs: 18, heightSegs: 12, tufts: 12, amp: 0.2, seed: 2 }).scale(0.1, 0.1, 0.12).translate(0, 0.37, -0.88);
  return merge([colored(plume, '#ffffff'), colored(tip, SHINE, 4, false)]);
}

function legGeometry(hind: boolean, upper: boolean) {
  if (upper) {
    return hind
      ? limb([[0, 0.12], [0.13, 0.06], [0.14, -0.12], [0.09, -0.34], [0.06, -0.5], [0, -0.54]], '#ffffff', 0.85)
      : limb([[0, 0.1], [0.1, 0.05], [0.1, -0.12], [0.065, -0.34], [0.05, -0.42], [0, -0.45]], '#ffffff', 0.85);
  }
  const L = hind ? 0.5 : 0.45;
  return merge([limb([[0, 0.05], [0.05, 0.02], [0.04, -0.2], [0.035, -L + 0.08], [0, -L + 0.05]], PAW), hoof(L, 0.055, '#e2ddeb', 1.5)]);
}

export class Glimmer extends Beast {
  private bodyB: PartBatch; private neckB: PartBatch; private headB: PartBatch; private earB: PartBatch; private tailB: PartBatch;
  private legB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'glimmer', radius: 0.6, centreY: 1.0, flockSize: [1, 3],
      mount: {
        name: 'glimmer', radius: 0.45,
        walk: { speed: 9, sprint: 22, takeoff: 0 },
        leap: 8, swim: 0.4, gather: 1.2,
        trait: { turn: 1.6, maxClimb: 1.2, slopeDrag: 0.8, ability: 'phase' },
      },
      amble: 1.2, travel: 2.2, flee: 14, wary: [9, 18], space: 1.8, spread: 5,
      habitat: (s) => {
        if (s.h < 2 || s.bog > 0.3) return Infinity;
        if (s.glimmer > 0.3) return 0.2 + s.slope * 0.1;
        // Any forest, after dark.
        if (s.forest > 0.5 && s.night > 0.5) return 0.8;
        return Infinity;
      },
      coats: ['#5a5f93', '#4c6c80', '#6d5890'], rare: ['#ebe7f7', 0.06],
      strideLen: 1.0, seatSpread: 0.62, herds: 1, every: [30, 70], verb: 'phase',
    });
    const look = { keep: 0.6, softCrease: 0.8 };
    this.bodyB = this.batch(bodyGeometry(), look);
    this.neckB = this.batch(neckGeometry(), look);
    this.headB = this.batch(headGeometry(), { ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.5, 0.18], eyeSize: [0.2, 0.22], pupil: [0.06, 0.13], lookRange: [0.12, 0.08], eyeTilt: 0.25 });
    this.earB = this.batch(earGeometry(), look, 2);
    this.tailB = this.batch(tailGeometry(), look);
    this.legB = [this.batch(legGeometry(false, true), look, 2), this.batch(legGeometry(false, false), look, 2), this.batch(legGeometry(true, true), look, 2), this.batch(legGeometry(true, false), look, 2)];
    this.saddleB = this.batch(saddleGeometry(0.28, 0.3, 0.72, '#3d5c78', '#e7dcc8', '#6e4a33', 0.55), { keep: 0.75, doubleSide: true }, 1, 8);
    this.collarB = this.batch(collarGeometry(0.16), { keep: 0.6 }, 1, 8);
  }

  protected build(d: BeastData) {
    this.draw(d, this.bodyB, d.body);
    const neck = this.node(d, 'neck', d.body, 0, 0.12, 0.52);
    this.draw(d, this.neckB, neck);
    neck.add(d.head);
    d.head.position.set(0, 0.46, 0.02);
    this.draw(d, this.headB, d.head, { eye: true });
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      const ear = this.node(d, `ear${k}`, d.head, s * 0.1, 0.13, -0.04);
      this.draw(d, this.earB, ear);
    }
    neck.add(d.collar);
    d.collar.position.set(0, 0.2, 0.02);
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    const tail = this.node(d, 'tail', d.body, 0, 0.12, -0.66);
    this.draw(d, this.tailB, tail);
    this.draw(d, this.saddleB, this.node(d, 'saddle', d.body, 0, 0, -0.02), { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, 0.36, -0.02);
    d.s.legs = this.makeLegs(d, { front: new THREE.Vector3(0.14, -0.14, 0.44), hind: new THREE.Vector3(0.15, -0.02, -0.48), fu: 0.42, fl: 0.45, hu: 0.5, hl: 0.5, fold: 0.45 }, this.legB);
  }

  protected feet(d: BeastData) {
    return this.legFeet(d.s.legs as LegSet);
  }

  protected pose(m: Mob, d: BeastData, a: Anim) {
    const t = a.t;
    const g = this.gaitMix(d, a, 3, 9);
    const phase = a.gs?.phase ?? 0;
    const pitch = d.pitch.step(-a.slope + g.rock - a.joy * 0.25 + (a.caught ? Math.max(0, Math.sin(m.stateT * 5)) * 0.3 : 0), 60, 12, a.dt) + (a.air > 0.5 ? clamp(-a.vy * 0.04, -0.3, 0.3) : 0);
    d.body.position.y += g.bounce + a.air * 0.05 - a.graze * 0.06 + a.joy * 0.15;
    d.body.rotation.set(pitch, 0, a.bank);
    // Phasing: stretched thin, flickering in and out.
    const stretch = phase > 0 ? 1 : 0;
    d.body.scale.set(1 - 0.2 * stretch, 1 - 0.15 * stretch, 1 + 0.35 * stretch);
    d.hidden = phase > 0 && Math.floor(t * 30) % 2 === 0;
    this.poseLegs(d.s.legs, a, g.offs, g.duty, g.sweep, g.flex, pitch);
    // Head: low and stretched at a run, sniffing the ground when idle, ears
    // swivelling; a curious tilt when it watches you.
    const run = g.wG * clamp((a.speed - 9) / 8, 0, 1);
    const neck = d.n.neck;
    const sniff = a.graze * (1.1 + Math.sin(t * 4) * 0.05);
    neck.rotation.set(0.45 + run * 0.6 + sniff - pitch, a.lookYaw * 0.5, 0);
    d.head.rotation.set(-0.35 - run * 0.4 + sniff * 0.2 + Math.sin(a.stride * Math.PI * 4) * 0.04 * a.moving, a.lookYaw * 0.5, a.alert * Math.sin(t * 0.7) * 0.22);
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      const back = Math.max(run, phase > 0 ? 1 : 0);
      const flick = Math.max(0, Math.sin(t * 0.9 + k * 2.1) - 0.93) * 6;
      d.n[`ear${k}`].rotation.set(-0.1 - back * 0.9 + flick * 0.3, s * (0.2 + a.lookYaw * 0.2), -s * (0.28 - back * 0.15));
    }
    // The tail: streams out behind at speed, swishes at rest.
    const tail = d.n.tail;
    tail.rotation.set(lerp(-0.15 + Math.sin(t * 1.3) * 0.08, 0.5, run) + a.joy * -0.4, Math.sin(t * (a.moving > 0.5 ? 6 : 1.6)) * lerp(0.3, 0.1, a.moving), 0);
  }
}
