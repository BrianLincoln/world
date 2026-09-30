import * as THREE from 'three';
import { Beast, clamp, collarGeometry, GAIT, lerp, saddleGeometry, type Anim, type BeastData, type LegSet } from './beast';
import type { PartBatch } from './parts';
import { colored, ellipsoid, furBall, limb, merge, sculpt, smooth, tube } from './shapes';
import type { Mob } from './types';

// The bog hag: a squat, pear-shaped something from the fen stories, part
// frog, part seal, part old woman of the marsh. It sits hunched with a
// shawl of pondweed over its head and shoulders, long thin arms, great
// frog legs folded under, a wide wide mouth, drooping barbels and bulging
// eyes on top of its head. Odd, a bit uncanny, never scary. It lurks by the
// bog pools. Ridden, it waddle-hops on land, and in water it's in its
// element: fast, and it dives (C) and rises (Space), and leaps out.

const BELLY = '#efe8cf';
const WEED = '#6a7040';
const WEED2 = '#565a36';

/** A pear: broad bottom, narrow shoulders. */
function pear(d: THREE.Vector3, out: THREE.Vector3) {
  const w = 1 + 0.25 * smooth(-d.y, -0.3, 0.8) - 0.18 * smooth(d.y, 0.2, 0.9);
  return out.set(d.x * 0.5 * w, d.y * 0.52, d.z * 0.46 * w);
}

function bodyGeometry() {
  const body = sculpt(new THREE.SphereGeometry(1, 44, 32), pear);
  const belly = sculpt(new THREE.SphereGeometry(1, 28, 20, -0.9, 1.8, Math.PI * 0.3, Math.PI * 0.6).rotateY(Math.PI / 2), pear, 0.01);
  // The weed shawl over the shoulders, long and draggled.
  const shawl = furBall({
    widthSegs: 40, heightSegs: 30, tufts: 70, amp: 0.16, sweep: 0.18, share: 0.55, seed: 19,
    comb: (d, o) => o.set(0, -1, 0).addScaledVector(d, -d.dot(o)).normalize(),
    mask: (d) => smooth(d.y, -0.1, 0.4) * smooth(-d.z, -0.9, -0.1),
  }).scale(0.46, 0.52, 0.46).translate(0, 0.08, -0.02);
  return merge([colored(body, '#ffffff'), colored(belly, BELLY), colored(shawl, WEED, 0, false)]);
}

const CRANIUM = new THREE.Vector3(0, 0, 0);
function headGeometry() {
  // Wide and flat, frog-like; eye bumps on top take the painted eyes.
  const head = ellipsoid(0.34, 0.19, 0.3, 40, 28);
  const bumps: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) bumps.push(colored(ellipsoid(0.12, 0.12, 0.12, 18, 14).translate(s * 0.15, 0.14, 0.14), '#ffffff', 1));
  // A weed fringe over the brow and long draggled strands down the sides.
  const fringe = furBall({ widthSegs: 30, heightSegs: 20, tufts: 40, amp: 0.2, sweep: 0.2, share: 0.6, seed: 7, comb: (d, o) => o.set(0, -1, -0.3).addScaledVector(d, -d.dot(o)).normalize(), mask: (d) => smooth(d.y, 0.1, 0.5) * smooth(-d.z, -0.5, 0.3) })
    .scale(0.35, 0.22, 0.31).translate(0, 0.02, -0.02);
  const strands: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = s * (0.24 + i * 0.03), z = 0.05 - i * 0.12;
    strands.push(tube([[x, 0.08, z], [x * 1.12, -0.12, z - 0.02], [x * 1.05, -0.36 - i * 0.05, z + 0.02]], 0.035, 0.012, i % 2 ? WEED : WEED2, 0, false, 8, 5));
  }
  // Barbels from the corners of the mouth.
  const barbels: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) barbels.push(tube([[s * 0.28, -0.07, 0.14], [s * 0.36, -0.2, 0.2], [s * 0.34, -0.36, 0.16]], 0.018, 0.006, '#cfc6a6', 0, false, 8, 5));
  return merge([colored(head, '#ffffff', 1), ...bumps, colored(fringe, WEED, 0, false), ...strands, ...barbels]);
}

function armGeometry(upper: boolean) {
  if (upper) return limb([[0, 0.06], [0.08, 0.03], [0.07, -0.2], [0.05, -0.42], [0, -0.46]], '#ffffff');
  const L = 0.44;
  // A long forearm and a webbed hand, three long fingers splayed.
  const arm = limb([[0, 0.04], [0.05, 0.01], [0.04, -0.3], [0.035, -L + 0.04], [0, -L]], '#ffffff');
  const web = ellipsoid(0.12, 0.02, 0.13, 14, 6).translate(0, -L + 0.01, 0.07);
  const fingers: THREE.BufferGeometry[] = [];
  for (const a of [-0.5, 0, 0.5]) fingers.push(tube([[0, -L, 0.02], [Math.sin(a) * 0.1, -L - 0.01, 0.02 + Math.cos(a) * 0.1], [Math.sin(a) * 0.16, -L - 0.01, 0.02 + Math.cos(a) * 0.15]], 0.02, 0.012, '#ffffff', 0, true, 6, 5));
  return merge([arm, colored(web, '#d8d2b8'), ...fingers]);
}

function legGeometry(upper: boolean) {
  // Frog legs: a fat thigh, a long shank and a big webbed foot.
  if (upper) return limb([[0, 0.12], [0.18, 0.05], [0.17, -0.12], [0.1, -0.3], [0, -0.36]], '#ffffff');
  const L = 0.42;
  const shank = limb([[0, 0.05], [0.08, 0.02], [0.06, -0.25], [0.05, -L + 0.03], [0, -L]], '#ffffff');
  const foot = ellipsoid(0.13, 0.025, 0.22, 16, 6).translate(0, -L + 0.02, 0.14);
  return merge([shank, colored(foot, '#d8d2b8')]);
}

export class BogHag extends Beast {
  private bodyB: PartBatch; private headB: PartBatch; private armB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'boghag', radius: 0.75, centreY: 0.72, flockSize: [1, 2],
      mount: {
        name: 'boghag', radius: 0.55,
        walk: { speed: 5, sprint: 9.5, takeoff: 0 },
        // In the water it's as quick as on its best day on land.
        leap: 8, swim: 1.9, gather: 1,
        trait: { diver: true, mudder: true, maxClimb: 1.0, turn: 1.2 },
      },
      amble: 0.6, travel: 1.3, flee: 7, wary: [6, 13], space: 2.2, spread: 5,
      habitat: (s) => {
        if (s.bog > 0.3) return 0.3 - s.bog * 0.2;
        // Wetlands: low marshy shores by open water.
        if (s.h > -1.5 && s.h < 1.2 && s.slope < 1 && s.forest < 0.3) return 1.1;
        return Infinity;
      },
      coats: ['#7f8c6a', '#6f7f7a', '#8b8466'], rare: ['#a2b8a4', 0.08],
      strideLen: 0.7, seatSpread: 0.8, herds: 1, every: [40, 90], verb: 'leap',
    });
    const look = { keep: 0.55, softCrease: 0.75 };
    this.bodyB = this.batch(bodyGeometry(), look);
    this.headB = this.batch(headGeometry(), {
      ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.45, 0.62], eyeSize: [0.2, 0.2], pupil: [0.1, 0.035], lookRange: [0.08, 0.03],
      // A wide, wide mouth.
      mouthW: [-0.3, 0.48, -0.25],
    });
    this.armB = [this.batch(armGeometry(true), look, 2), this.batch(armGeometry(false), look, 2), this.batch(legGeometry(true), look, 2), this.batch(legGeometry(false), look, 2)];
    this.saddleB = this.batch(saddleGeometry(0.46, 0.5, 0.42, '#6b4a6e', '#e7dcc8', '#5a3e2c', 0.55), { keep: 0.75, doubleSide: true }, 1, 8);
    this.collarB = this.batch(collarGeometry(0.22), { keep: 0.6 }, 1, 8);
  }

  protected build(d: BeastData) {
    this.draw(d, this.bodyB, d.body);
    d.body.add(d.head);
    d.head.position.set(0, 0.5, 0.3);
    d.head.scale.setScalar(1.2);
    this.draw(d, this.headB, d.head, { eye: true });
    d.body.add(d.collar);
    d.collar.position.set(0, 0.34, 0.08);
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    this.draw(d, this.saddleB, this.node(d, 'saddle', d.body, 0, 0, -0.08), { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, 0.5, -0.12);
    d.s.legs = this.makeLegs(d, { front: new THREE.Vector3(0.36, 0.22, 0.24), hind: new THREE.Vector3(0.34, -0.3, -0.12), fu: 0.44, fl: 0.44, hu: 0.34, hl: 0.42, fold: 1.0 }, this.armB);
  }

  protected feet(d: BeastData) {
    return this.legFeet(d.s.legs as LegSet);
  }

  protected pose(m: Mob, d: BeastData, a: Anim) {
    const t = a.t;
    const gs = a.gs;
    const under = gs ? clamp(gs.depth, 0, 1) : 0;
    // On land: hunched upright, lurching along in waddling hops. In water:
    // stretched out flat, a slow frog-kick, arms sweeping.
    const swim = a.wet;
    const hop = Math.max(0, Math.sin(a.cyc * Math.PI * 2)) * 0.14 * a.moving * (1 - swim);
    const upright = lerp(-0.42, 1.0 + under * 0.3, swim);
    const pitch = d.pitch.step(upright - a.slope * 0.6 + Math.sin(a.cyc * Math.PI * 2) * 0.12 * a.moving * (1 - swim) - a.joy * 0.2, 40, 10, a.dt);
    d.body.position.y += hop + a.joy * 0.2 - swim * 0.2;
    d.body.rotation.set(pitch, 0, a.bank + Math.sin(a.stride * Math.PI * 2) * 0.12 * a.moving * (1 - swim));
    this.poseLegs(d.s.legs, a, GAIT.bound, 0.5, 0.45, 1.1, pitch);
    const legs = d.s.legs as LegSet;
    // Arms hang long in front on land; the swim is a breaststroke and a kick.
    for (let k = 0; k < 4; k++) {
      const side = k % 2 ? -1 : 1;
      if (k < 2) {
        legs.up[k].rotation.z = side * (0.35 + 0.1 * Math.sin(t * 1.3 + k));
        if (swim > 0.01) {
          const st = Math.sin(t * 2.6);
          legs.up[k].rotation.x = lerp(legs.up[k].rotation.x, -1.2 + st * 0.6, swim);
          legs.up[k].rotation.z = lerp(legs.up[k].rotation.z, side * (0.6 + st * 0.5), swim);
        }
      } else if (swim > 0.01) {
        const kick = Math.max(0, Math.sin(t * 2.6 + 1.2));
        legs.up[k].rotation.x = lerp(legs.up[k].rotation.x, 1.4 + kick * 0.5, swim);
        legs.lo[k].rotation.x = lerp(legs.lo[k].rotation.x, -1.8 + kick * 1.4, swim);
      }
    }
    // Head: level whatever the body does, a slow unsettling tilt as it watches you.
    d.head.rotation.set(-pitch * 0.85 + a.graze * 0.3 + (swim > 0.5 ? -0.3 : 0), a.lookYaw * 0.8, a.alert * Math.sin(t * 0.5) * 0.3 + Math.sin(t * 0.21) * 0.06);
    d.s.lids = a.alert ? 1 : 0.7;
  }
}
