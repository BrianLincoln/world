import * as THREE from 'three';
import { Beast, clamp, collarGeometry, saddleGeometry, type Anim, type BeastData, type LegSet } from './beast';
import type { PartBatch } from './parts';
import { colored, ellipsoid, furBall, hoof, limb, merge, sculpt, smooth, tube } from './shapes';
import type { Mob, MobCtx } from './types';

// The mudsnoot: a round, bristly bog pig with an enormous flat shovel of a
// snout, floppy ears, a corkscrew tail and permanently muddy socks. Herds
// root about in the fens with their snouts in the peat. Ridden, bog mud
// doesn't slow it at all, and Space dives it nose-first underground: it
// tunnels a short way (further in soft bog) and bursts up somewhere else.

const MUD = '#6c5644';
const SNOUT = '#e2b2a2';
const NOSTRIL = '#4a3232';

/** A barrel, round as a sack, a bit higher at the shoulders. */
function barrel(d: THREE.Vector3, out: THREE.Vector3) {
  const front = smooth(d.z, -0.2, 0.8);
  let y = d.y * 0.5;
  if (d.y > 0) y *= 1 + 0.1 * front;
  return out.set(d.x * 0.52 * (1 + 0.05 * front), y, d.z * 0.72);
}

function bodyGeometry() {
  const body = sculpt(new THREE.SphereGeometry(1, 48, 32), barrel);
  // A bristly ridge down the back.
  const bristle = furBall({ widthSegs: 30, heightSegs: 18, tufts: 34, amp: 0.3, sweep: 0.2, seed: 4, comb: (d, o) => o.set(0, 0.2, -1).addScaledVector(d, -d.dot(o)).normalize(), mask: (d) => smooth(d.y, 0.4, 0.8) })
    .scale(0.3, 0.5, 0.7).translate(0, 0.02, 0.02);
  // Mud caked up the belly and flanks.
  const mud = sculpt(new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), barrel, 0.012);
  return merge([colored(body, '#ffffff'), colored(bristle, '#e8d8cc'), colored(mud, MUD, 0, false)]);
}

const CRANIUM = new THREE.Vector3(0, 0.06, 0);
function headGeometry() {
  const head = ellipsoid(0.3, 0.27, 0.3, 36, 26).translate(CRANIUM.x, CRANIUM.y, CRANIUM.z);
  // The snout: a broad flat shovel, rounded at the tip, with a pale disc face.
  const shovel = sculpt(new THREE.SphereGeometry(1, 32, 20), (d, o) => {
    const t = (d.z + 1) / 2;
    const w = 0.22 + 0.2 * smooth(t, 0.2, 0.9);
    return o.set(d.x * w, d.y * 0.11 * (1 - 0.3 * t), d.z * 0.26);
  }).translate(0, -0.08, 0.36);
  const disc = ellipsoid(0.38, 0.1, 0.05, 24, 10).translate(0, -0.08, 0.6);
  const nostrils: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) nostrils.push(colored(ellipsoid(0.05, 0.035, 0.02, 10, 6).translate(s * 0.12, -0.07, 0.645), NOSTRIL, 0, false));
  return merge([colored(head, '#ffffff', 1), colored(shovel, SNOUT, 0, true), colored(disc, SNOUT, 0, true), ...nostrils]);
}

function earGeometry() {
  // A floppy leaf hanging forward and out.
  const ear = sculpt(new THREE.SphereGeometry(1, 18, 12), (d, o) => o.set(d.x * 0.13, d.y * 0.03 + 0.05 * d.z * d.z, d.z * 0.18)).translate(0, 0, 0.16);
  return colored(ear, '#f1e1d8');
}

function tailGeometry() {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, a = t * Math.PI * 3.2;
    pts.push([Math.sin(a) * 0.05, t * 0.08 + Math.cos(a) * 0.05, -t * 0.14]);
  }
  return tube(pts, 0.028, 0.015, '#ffffff', 0, true, 36, 6);
}

function legGeometry(upper: boolean) {
  if (upper) return limb([[0, 0.1], [0.14, 0.04], [0.15, -0.12], [0.12, -0.28], [0, -0.32]], '#ffffff');
  const L = 0.3;
  return merge([limb([[0, 0.05], [0.11, 0.02], [0.1, -0.15], [0.1, -L + 0.06], [0, -L + 0.04]], MUD, 1, 1, false), hoof(L, 0.1, '#3f3230', 1.2)]);
}

export class Mudsnoot extends Beast {
  private bodyB: PartBatch; private headB: PartBatch; private earB: PartBatch; private tailB: PartBatch;
  private legB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'mudsnoot', radius: 0.8, centreY: 0.78, flockSize: [2, 4],
      mount: {
        name: 'mudsnoot', radius: 0.6,
        walk: { speed: 6.5, sprint: 12.5, takeoff: 0 },
        leap: 6, swim: 0.5, gather: 1.4,
        trait: { mudder: true, maxClimb: 1.0, turn: 1.1, ability: 'burrow' },
      },
      amble: 0.8, travel: 1.4, flee: 9, wary: [8, 16], space: 1.6, spread: 6,
      habitat: (s) => (s.bog > 0.35 && s.h > -0.4 ? 0.4 - s.bog * 0.3 + s.slope * 0.2 : Infinity),
      coats: ['#d3a292', '#bd927c', '#a88470'], rare: ['#8c7262', 0.12],
      strideLen: 0.55, seatSpread: 0.9, herds: 1, every: [30, 70], verb: 'burrow',
    });
    const look = { keep: 0.55, softCrease: 0.75 };
    this.bodyB = this.batch(bodyGeometry(), look);
    this.headB = this.batch(headGeometry(), { ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.48, 0.4], eyeSize: [0.16, 0.16], pupil: [0.07, 0.08], lookRange: [0.08, 0.05], eyeTilt: 0.1 });
    this.earB = this.batch(earGeometry(), look, 2);
    this.tailB = this.batch(tailGeometry(), look);
    this.legB = [this.batch(legGeometry(true), look, 2), this.batch(legGeometry(false), look, 2), this.batch(legGeometry(true), look, 2), this.batch(legGeometry(false), look, 2)];
    this.saddleB = this.batch(saddleGeometry(0.52, 0.5, 0.72, '#8a5a3a', '#e7dcc8', '#5a3e2c', 0.5), { keep: 0.75, doubleSide: true }, 1, 8);
    this.collarB = this.batch(collarGeometry(0.3), { keep: 0.6 }, 1, 8);
  }

  protected build(d: BeastData) {
    this.draw(d, this.bodyB, d.body);
    d.body.add(d.head);
    d.head.position.set(0, 0.1, 0.68);
    this.draw(d, this.headB, d.head, { eye: true });
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      this.draw(d, this.earB, this.node(d, `ear${k}`, d.head, s * 0.2, 0.22, -0.02));
    }
    d.head.add(d.collar);
    d.collar.position.set(0, 0, -0.12);
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    this.draw(d, this.tailB, this.node(d, 'tail', d.body, 0, 0.14, -0.7));
    this.draw(d, this.saddleB, this.node(d, 'saddle', d.body, 0, 0, -0.04), { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, 0.55, -0.04);
    d.s.legs = this.makeLegs(d, { front: new THREE.Vector3(0.28, -0.3, 0.42), hind: new THREE.Vector3(0.28, -0.28, -0.42), fu: 0.28, fl: 0.3, hu: 0.28, hl: 0.3, fold: 0.15 }, this.legB);
  }

  protected feet(d: BeastData) {
    return this.legFeet(d.s.legs as LegSet);
  }

  protected pose(m: Mob, d: BeastData, a: Anim, ctx: MobCtx) {
    const t = a.t;
    const gs = a.gs;
    // Underground: nothing to see but the churned dirt (see main.ts).
    if (gs && gs.burrow > 0) { d.hidden = true; return; }
    // Wild in the bog: wallowing low in the mud when it's wet underfoot.
    const g = this.gaitMix(d, a, 2.5, 7);
    const wallow = m.state === 'wild' && a.graze > 0 && ctx.gen.height(m.pos.x, m.pos.z) < 0.9 ? 0.18 : 0;
    const pitch = d.pitch.step(-a.slope * 0.9 + g.rock + a.graze * 0.12 - a.joy * 0.2 + (a.caught ? Math.sin(m.stateT * 7) * 0.15 : 0), 60, 12, a.dt) + (a.air > 0.5 ? clamp(-a.vy * 0.05, -0.4, 0.4) : 0);
    d.body.position.y += g.bounce * 1.3 + a.air * 0.05 - wallow + a.joy * 0.1;
    d.body.rotation.set(pitch, 0, a.bank + Math.sin(a.stride * Math.PI * 2) * 0.05 * a.moving);
    this.poseLegs(d.s.legs, a, g.offs, g.duty, g.sweep * 1.1, g.flex, pitch);
    // Rooting: snout down, shoving along through the mud in little jerks.
    const root = a.graze * (0.4 + Math.max(0, Math.sin(t * 5)) * 0.12);
    d.head.rotation.set(root - a.alert * 0.15 + Math.sin(a.stride * Math.PI * 4) * 0.05 * a.moving - (a.air > 0.5 ? 0.3 : 0), a.lookYaw * 0.8, Math.sin(t * 3) * 0.08 * a.joy);
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      const flop = Math.sin(a.stride * Math.PI * 2 + k) * 0.25 * a.moving;
      d.n[`ear${k}`].rotation.set(0.5 + flop - a.alert * 0.25, s * 0.5, -s * (0.35 + flop * 0.5));
    }
    // The corkscrew tail wiggles when it's pleased (or rooting).
    d.n.tail.rotation.set(-0.3, 0, Math.sin(t * (a.graze > 0 || a.joy > 0 ? 14 : 3)) * 0.5);
  }
}
