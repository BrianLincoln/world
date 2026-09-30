import * as THREE from 'three';
import { Beast, collarGeometry, GAIT, lerp, saddleGeometry, type Anim, type BeastData, type LegSet } from './beast';
import { colored, ellipsoid, furBall, hoof, lathe, limb, merge, sculpt, smooth, sprout, toadstool, tube } from './shapes';
import type { PartBatch } from './parts';
import type { Mob } from './types';

// The mossback: a huge old turtle wearing a hill. Its domed shell is thick
// with moss, ferns, toadstools (one of them glows) and a sapling, so a
// sleeping one reads as a mound until it lifts its head. Heavy-lidded and
// unhurried. It plods, but it plods up anything: slopes too steep for any
// other mount don't slow it at all.

const SKIN = '#a3a383';
const RIM = '#7b6448';
const NAIL = '#e3d7bd';
const SHELL_RX = 1.45, SHELL_RY = 1.0, SHELL_RZ = 1.6;

/** The shell's dome: rounded top, a flatter plastron underneath. */
function dome(d: THREE.Vector3, out: THREE.Vector3) {
  const y = d.y < 0 ? d.y * 0.32 : d.y;
  // A gentle ridge along the spine.
  const ridge = 1 + 0.06 * Math.exp(-((d.x / 0.3) ** 2)) * Math.max(0, d.y);
  return out.set(d.x * SHELL_RX, y * SHELL_RY * ridge, d.z * SHELL_RZ);
}

/** Top of the shell at (x, z) in body space. */
function shellTop(x: number, z: number) {
  const q = 1 - (x / SHELL_RX) ** 2 - (z / SHELL_RZ) ** 2;
  return Math.sqrt(Math.max(0, q)) * SHELL_RY;
}

function shellGeometry() {
  const shell = sculpt(new THREE.SphereGeometry(1, 56, 34), dome);
  // The moss: a shaggy blanket over the upper dome, tinted by the coat.
  const moss = furBall({
    widthSegs: 56, heightSegs: 34, tufts: 110, amp: 0.07, sweep: 0.03, share: 0.45, seed: 31,
    comb: (d, out) => out.set(0, -1, 0).addScaledVector(d, -d.dot(out)).normalize(),
    mask: (d) => smooth(d.y, 0.05, 0.3),
  });
  const pos = moss.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3(), o = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = v.length();
    dome(v.normalize(), o);
    o.multiplyScalar(r * 1.02);
    // Only the upper dome wears moss; below the rim it tucks inside the shell.
    if (v.y < 0.12) o.multiplyScalar(0.96);
    pos.setXYZ(i, o.x, o.y, o.z);
  }
  moss.computeVertexNormals();
  // A dark scalloped rim where shell meets skin.
  const rim = new THREE.TorusGeometry(1, 0.07, 6, 48).rotateX(Math.PI / 2).scale(SHELL_RX * 0.99, 1, SHELL_RZ * 0.99).translate(0, 0.08, 0);
  const g: THREE.BufferGeometry[] = [colored(shell, RIM, 0, false), colored(moss, '#ffffff'), colored(rim, '#6a533b', 0, false)];
  // What grows on it: toadstools (one glows), ferns, a sapling.
  const at = (x: number, z: number, geo: THREE.BufferGeometry) => g.push(geo.translate(x, shellTop(x, z) + 0.02, z));
  at(0.55, 0.45, toadstool(0.26, 0.17, '#c4533f'));
  at(0.7, 0.25, toadstool(0.16, 0.1, '#d98a5a'));
  at(-0.65, -0.6, toadstool(0.2, 0.14, '#9fe3d0', '#eadfc8', true));
  at(-0.5, -0.4, toadstool(0.12, 0.08, '#9fe3d0', '#eadfc8', true));
  at(-0.8, 0.5, sprout(0.5, '#6d7a3c', 6, 1));
  at(0.75, -0.75, sprout(0.42, '#7a843f', 5, 2));
  at(0.2, -1.05, sprout(0.34, '#6d7a3c', 5, 3));
  // A little spruce seedling at the back, like the ones in the woods.
  const sap: THREE.BufferGeometry[] = [tube([[0, 0, 0], [0.01, 0.3, 0], [0, 0.62, 0]], 0.035, 0.015, '#7a5244', 0, false, 6, 6)];
  for (const [y, r, h] of [[0.18, 0.2, 0.28], [0.34, 0.15, 0.24], [0.48, 0.1, 0.2]]) sap.push(colored(new THREE.ConeGeometry(r, h, 9).translate(0, y + h / 2, 0), '#5d5a3c', 0, false));
  at(-0.25, -0.95, merge(sap));
  return merge(g);
}

function neckGeometry() {
  // Along +z from the shell opening, a wrinkled leathery neck.
  const prof: [number, number][] = [[0, -0.1], [0.36, 0], [0.37, 0.2], [0.32, 0.45], [0.3, 0.65], [0, 0.72]];
  return colored(lathe(prof, 20).rotateX(Math.PI / 2).scale(1, 0.85, 1), SKIN);
}

const CRANIUM = new THREE.Vector3(0, 0.06, 0.1);
function headGeometry() {
  // A blunt, beaky head, a touch wider than tall.
  const head = sculpt(new THREE.SphereGeometry(1, 36, 26), (d, out) => {
    const beak = smooth(d.z, 0.3, 1) * Math.max(0, -d.y + 0.3) * 0.12;
    return out.set(d.x * 0.38, d.y * 0.33 - beak, d.z * 0.44 + 0.05 * Math.max(0, d.z));
  }).translate(CRANIUM.x, CRANIUM.y, CRANIUM.z);
  // A pale beak edge.
  const beak = new THREE.TorusGeometry(0.28, 0.03, 5, 20, Math.PI).rotateX(Math.PI / 2).rotateY(-Math.PI / 2).scale(1, 1, 0.9).translate(0, -0.06, 0.32);
  return merge([colored(head, SKIN, 1), colored(beak, '#d8cba6', 0, false)]);
}

function legGeometry(upper: boolean) {
  if (upper) return limb([[0, 0.12], [0.26, 0.05], [0.29, -0.12], [0.26, -0.36], [0, -0.44]], SKIN);
  const L = 0.4;
  const leg = limb([[0, 0.08], [0.25, 0.02], [0.24, -0.25], [0.3, -L + 0.06], [0, -L]], SKIN);
  // Three blunt toenails at the front of the foot.
  const nails: THREE.BufferGeometry[] = [];
  for (const x of [-0.13, 0, 0.13]) nails.push(colored(ellipsoid(0.06, 0.05, 0.07, 8, 6).translate(x, -L + 0.04, 0.26), NAIL, 0, false));
  return merge([leg, hoof(L, 0.28, '#8a8468', 1), ...nails]);
}

function tailGeometry() {
  return colored(new THREE.ConeGeometry(0.14, 0.45, 10).rotateX(-Math.PI / 2).translate(0, 0, -0.2), SKIN);
}

export class Mossback extends Beast {
  private shellB: PartBatch; private neckB: PartBatch; private headB: PartBatch; private tailB: PartBatch; private legB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'mossback', radius: 1.5, centreY: 1.05, flockSize: [1, 2],
      mount: {
        name: 'mossback', radius: 1.2,
        walk: { speed: 3.2, sprint: 5.6, takeoff: 0 },
        leap: 3.5, swim: 0.7, gather: 1.6,
        // Slow, but nothing is too steep for it.
        trait: { slopeDrag: 0, turn: 0.7, brake: 9, gravity: 1.2 },
      },
      amble: 0.6, travel: 0.8, flee: 2.6, wary: [5, 10], space: 3.6, spread: 6,
      habitat: (s) => {
        if (s.h < 3 || s.h > 170 || s.bog > 0.4) return Infinity;
        // Forest edges and meadows; it doesn't mind a hillside.
        return Math.abs(s.forest - 0.3) * 2 + s.slope * 0.1;
      },
      coats: ['#8c9254', '#a0995b', '#778456'], rare: ['#c9a2a0', 0.05],
      strideLen: 0.9, seatSpread: 1.0, herds: 1, every: [40, 90], verb: 'hop',
    });
    const look = { keep: 0.55, softCrease: 0.7 };
    this.shellB = this.batch(shellGeometry(), look, 1, 8);
    this.neckB = this.batch(neckGeometry(), look, 1, 8);
    this.headB = this.batch(headGeometry(), { ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.62, 0.2], eyeSize: [0.2, 0.2], pupil: [0.08, 0.1], lookRange: [0.1, 0.06], eyeTilt: -0.15 }, 1, 8);
    this.tailB = this.batch(tailGeometry(), look, 1, 8);
    this.legB = [this.batch(legGeometry(true), look, 2, 8), this.batch(legGeometry(false), look, 2, 8), this.batch(legGeometry(true), look, 2, 8), this.batch(legGeometry(false), look, 2, 8)];
    this.saddleB = this.batch(saddleGeometry(0.72, 0.26, 0.82, '#5b7a8c', '#efe4d2', '#7a4a36', 0.62), { keep: 0.75, doubleSide: true }, 1, 6);
    this.collarB = this.batch(collarGeometry(0.34), { keep: 0.6 }, 1, 6);
  }

  protected build(d: BeastData) {
    this.draw(d, this.shellB, d.body);
    const neck = this.node(d, 'neck', d.body, 0, -0.05, SHELL_RZ * 0.82);
    this.draw(d, this.neckB, neck);
    neck.add(d.head);
    d.head.position.set(0, 0.04, 0.66);
    this.draw(d, this.headB, d.head, { eye: true });
    neck.add(d.collar);
    d.collar.position.set(0, 0, 0.25);
    d.collar.rotation.x = Math.PI / 2;
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    const tail = this.node(d, 'tail', d.body, 0, -0.1, -SHELL_RZ * 0.92);
    this.draw(d, this.tailB, tail);
    const saddle = this.node(d, 'saddle', d.body, 0, SHELL_RY * 0.78, -0.05);
    this.draw(d, this.saddleB, saddle, { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, SHELL_RY + 0.12, -0.05);
    d.s.legs = this.makeLegs(d, { front: new THREE.Vector3(0.95, -0.22, 0.85), hind: new THREE.Vector3(0.95, -0.22, -0.85), fu: 0.42, fl: 0.4, hu: 0.42, hl: 0.4, fold: 0.1 }, this.legB);
  }

  protected feet(d: BeastData) {
    return this.legFeet(d.s.legs as LegSet);
  }

  protected pose(m: Mob, d: BeastData, a: Anim) {
    const t = a.t;
    // A slow lateral walk; the shell sways over the planted side.
    const sway = Math.sin(a.stride * Math.PI * 2) * 0.05 * a.moving;
    const bob = Math.abs(Math.sin(a.stride * Math.PI * 2)) * 0.04 * a.moving;
    const pitch = d.pitch.step(-a.slope * 0.9 + a.graze * 0.04 - a.joy * 0.12, 30, 10, a.dt);
    d.body.position.y += bob + a.air * 0.05;
    d.body.rotation.set(pitch, 0, sway + a.bank * 0.5);
    this.poseLegs(d.s.legs, a, GAIT.walk, 0.7, 0.3, 0.6, pitch);
    // Legs splay a little outward: a turtle's stance.
    for (let k = 0; k < 4; k++) d.n[`up${k}`].rotation.z += (k % 2 ? -1 : 1) * 0.18;
    // Head: out and nodding when walking, down to browse, tucked in when
    // scared or plunging on the rope, raised and swaying when happy.
    const tuck = a.caught ? 0.8 : m.state === 'wild' && m.flock?.data.mode === 'flee' ? 0.5 : 0;
    const neck = d.n.neck;
    const ext = 1 - tuck;
    neck.scale.set(1, 1, lerp(0.45, 1, ext));
    const graze = a.graze * (0.22 + 0.06 * Math.sin(t * 1.3));
    neck.rotation.set(-0.12 + graze - a.slope * 0.3 - a.joy * 0.35 + Math.sin(a.stride * Math.PI * 4) * 0.04 * a.moving, a.lookYaw * 0.6, 0);
    d.head.rotation.set(graze * 0.5 - a.alert * 0.1, a.lookYaw * 0.4, Math.sin(t * 2.2) * 0.1 * a.joy);
    d.head.position.z = lerp(0.3, 0.66, ext);
    d.n.tail.rotation.set(0, Math.sin(t * 1.5) * 0.25 * a.moving, 0);
    // Heavy lids: sleepy, unless something's up.
    d.s.lids = a.alert ? 0.75 : 0.5;
  }
}
