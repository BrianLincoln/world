import * as THREE from 'three';
import { Beast, clamp, collarGeometry, lerp, saddleGeometry, type Anim, type BeastData } from './beast';
import type { PartBatch } from './parts';
import { colored, ellipsoid, furBall, merge, mirrorX, tube } from './shapes';
import type { Mob } from './types';

// The moonmoth: a moth as big as a pony, all soft fuzz and great pale wings
// with long swallow tails and a shining eyespot on each. By day they rest on
// the woodland floor (or in the hollows) with their wings spread flat, and
// at dusk they lift off and drift in slow loops. Ridden it's the gentlest of
// fliers: slow, floaty, quick to rise, loose on the stick.

const FUZZ = '#fbf6ee';
const SPOT = '#c6f1ff';
const RING = '#6f5f86';
const EDGE = '#e6dccd';

function wingShape(hind: boolean) {
  const s = new THREE.Shape();
  if (!hind) {
    // Forewing: a broad sickle, the leading edge sweeping to a rounded tip.
    s.moveTo(0, 0.12);
    s.bezierCurveTo(0.5, 0.35, 1.1, 0.42, 1.55, 0.2);
    s.bezierCurveTo(1.7, 0.08, 1.6, -0.25, 1.35, -0.35);
    s.bezierCurveTo(0.95, -0.5, 0.45, -0.45, 0.05, -0.2);
    s.lineTo(0, 0.12);
  } else {
    // Hindwing: rounded, trailing a long tail.
    s.moveTo(0, 0.05);
    s.bezierCurveTo(0.5, 0.15, 1.0, 0.05, 1.05, -0.3);
    s.bezierCurveTo(1.05, -0.55, 0.85, -0.75, 0.75, -1.2);
    s.bezierCurveTo(0.7, -1.45, 0.55, -1.5, 0.52, -1.3);
    s.bezierCurveTo(0.45, -0.85, 0.2, -0.55, 0.0, -0.2);
    s.lineTo(0, 0.05);
  }
  return s;
}

/** A wing lying flat, spanning +x, chord along z (the shape's y -> +z: leading edge forward). */
function wingGeometry(hind: boolean, mirror: boolean) {
  const shape = wingShape(hind);
  const flat = (g: THREE.BufferGeometry, y: number) => g.rotateX(Math.PI / 2).translate(0, y, 0);
  const wing = flat(new THREE.ShapeGeometry(shape, 24), 0);
  // (Broader than the outline suggests: soft and moth-like, not a glider.)
  // A soft pale border a hair above and below.
  const border = new THREE.Path(shape.getPoints(40)).getPoints(80);
  const edgePts = border.map((p) => new THREE.Vector3(p.x, 0, p.y));
  const edge = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePts, true), 90, 0.022, 4, true);
  // The eyespot: a dark ring round a shining middle, on both faces.
  const [cx, cz, r] = hind ? [0.62, -0.38, 0.16] : [0.95, 0.0, 0.2];
  const spot: THREE.BufferGeometry[] = [];
  for (const side of [1, -1]) {
    const ring = new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2 * side).translate(cx, 0.006 * side, cz);
    const mid = new THREE.CircleGeometry(r * 0.62, 20).rotateX(-Math.PI / 2 * side).translate(cx, 0.011 * side, cz);
    spot.push(colored(ring, RING, 0, false), colored(mid, SPOT, 4, false));
  }
  const g = merge([colored(wing, '#ffffff'), colored(edge, EDGE, 0, true), ...spot]).scale(1.05, 1, 1.35);
  return mirror ? mirrorX(g) : g;
}

const CRANIUM = new THREE.Vector3(0, 0, 0);
function headGeometry() {
  const head = furBall({ widthSegs: 32, heightSegs: 24, tufts: 36, amp: 0.1, sweep: 0.05, seed: 21, mask: (d) => smooth01(1 - d.z) })
    .scale(0.2, 0.19, 0.19);
  // Feathery antennae: a stalk with a broad fringed leaf on each.
  const ant: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    ant.push(tube([[s * 0.06, 0.14, 0.06], [s * 0.14, 0.32, 0.14], [s * 0.2, 0.46, 0.12]], 0.014, 0.008, '#e8dcc8', 0, false, 10, 5));
    const leaf = ellipsoid(0.07, 0.012, 0.19, 14, 6).rotateX(-0.6).rotateZ(s * -0.5).translate(s * 0.16, 0.36, 0.08);
    ant.push(colored(leaf, '#eadfcc', 0, false));
  }
  return merge([colored(head, FUZZ, 1), ...ant]);
}
function smooth01(x: number) { return clamp(x * 1.5, 0, 1); }

function bodyGeometry() {
  const thorax = furBall({ widthSegs: 40, heightSegs: 30, tufts: 60, amp: 0.12, sweep: 0.06, seed: 14 }).scale(0.34, 0.32, 0.38);
  // The abdomen: fuzzy rings tapering back.
  const rings: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const r = 0.3 - i * 0.045;
    rings.push(colored(furBall({ widthSegs: 22, heightSegs: 16, tufts: 16, amp: 0.1, seed: 30 + i }).scale(r, r * 0.92, r * 0.8).translate(0, -0.04 - i * 0.02, -0.38 - i * 0.2), i % 2 ? '#e4d8ea' : '#ffffff'));
  }
  // Six thin legs, folded under.
  const legs: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const z = 0.14 - i * 0.14;
    legs.push(tube([[s * 0.12, -0.2, z], [s * 0.3, -0.3, z + 0.04], [s * 0.34, -0.55, z + 0.08 - i * 0.04]], 0.028, 0.016, '#cfc3b0', 0, false, 8, 5));
  }
  return merge([colored(thorax, '#ffffff'), ...rings, ...legs]);
}

export class Moonmoth extends Beast {
  private bodyB: PartBatch; private headB: PartBatch; private wingB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

  constructor() {
    super({
      name: 'moonmoth', radius: 1.0, centreY: 0.58, flockSize: [1, 3],
      mount: {
        name: 'moonmoth', radius: 0.8,
        walk: { speed: 2.4, sprint: 4, takeoff: 7 },
        // Slow and floaty, but it rises like thistledown.
        fly: { speed: 10, sprint: 16, climb: 10, sink: 0.6, hover: 0, turn: 1.5, ease: 0.8 },
      },
      amble: 1.4, travel: 2.5, flee: 7, wary: [7, 14], space: 2.8, spread: 6,
      habitat: (s) => {
        if (s.h < 2 || s.bog > 0.5) return Infinity;
        if (s.hollow > 0.4) return 0.2;
        if (s.glimmer > 0.2) return 0.3;
        if (s.forest > 0.45) return s.night > 0.5 ? 0.5 : 1.2;
        return Infinity;
      },
      flier: { alt: [2.5, 6], rests: true },
      coats: ['#dbe9c9', '#e8dff0', '#f0e6cc'], rare: ['#c9d8f7', 0.1],
      strideLen: 0.5, seatSpread: 0.72, herds: 1, every: [40, 90], verb: 'take off',
    });
    const look = { keep: 0.6, softCrease: 0.7 };
    this.bodyB = this.batch(bodyGeometry(), look);
    this.headB = this.batch(headGeometry(), { ...look, eyeOrigin: CRANIUM.clone(), eyePos: [0.62, 0.05], eyeSize: [0.34, 0.34], pupil: [0.2, 0.22], lookRange: [0.08, 0.06] });
    const wl = { ...look, doubleSide: true };
    this.wingB = [this.batch(wingGeometry(false, false), wl), this.batch(wingGeometry(false, true), wl), this.batch(wingGeometry(true, false), wl), this.batch(wingGeometry(true, true), wl)];
    this.saddleB = this.batch(saddleGeometry(0.34, 0.32, 0.38, '#5d6f9a', '#efe4d2', '#6e4a33', 0.62), { keep: 0.75, doubleSide: true }, 1, 8);
    this.collarB = this.batch(collarGeometry(0.2), { keep: 0.6 }, 1, 8);
  }

  protected build(d: BeastData) {
    this.draw(d, this.bodyB, d.body);
    d.body.add(d.head);
    d.head.position.set(0, 0.04, 0.46);
    this.draw(d, this.headB, d.head, { eye: true });
    const W: [string, number, number, number, number][] = [['fL', 0, 0.16, 0.12, 0.2], ['fR', 1, -0.16, 0.12, 0.2], ['hL', 2, 0.14, 0.08, -0.06], ['hR', 3, -0.14, 0.08, -0.06]];
    for (const [n, b, x, y, z] of W) this.draw(d, this.wingB[b], this.node(d, n, d.body, x, y, z));
    d.head.add(d.collar);
    d.collar.position.set(0, -0.02, -0.1);
    this.draw(d, this.collarB, d.collar, { tint: false, when: 2 });
    this.draw(d, this.saddleB, this.node(d, 'saddle', d.body, 0, 0, 0.02), { tint: false, when: 1 });
    d.body.add(d.seat);
    d.seat.position.set(0, 0.36, 0.02);
  }

  protected pose(m: Mob, d: BeastData, a: Anim) {
    const t = a.t;
    const flying = !m.grounded;
    const rest = d.rest;
    // Wings: slow deep beats in flight, gliding pauses, a lazy fan at rest.
    const climb = clamp(a.vy / 6, -1, 1);
    const f = d.s.flap ?? 0;
    d.s.flap = f + a.dt * (flying ? 1.35 + Math.max(0, climb) * 0.8 : 0.25);
    const glide = flying ? clamp(-climb, 0, 0.7) * (0.5 + 0.5 * Math.sin(t * 0.4)) : 0;
    const beat = Math.sin(d.s.flap * Math.PI * 2);
    let up = flying ? 0.2 + beat * lerp(0.75, 0.15, glide) : -0.08 + Math.sin(t * 0.8) * 0.1 * (1 - rest * 0.5);
    if (a.joy > 0) up = 0.4 + Math.sin(t * 12) * 0.5;
    const sweep = flying ? -beat * 0.12 : 0.05;
    d.n.fL.rotation.set(0, sweep, up);
    d.n.fR.rotation.set(0, -sweep, -up);
    d.n.hL.rotation.set(0, sweep * 0.5 - 0.15, up * 0.85 - 0.05);
    d.n.hR.rotation.set(0, -sweep * 0.5 + 0.15, -up * 0.85 + 0.05);
    // The body rises and falls against each beat; tips into its turns.
    const bob = flying ? -beat * 0.12 : 0;
    const pitch = d.pitch.step(flying ? clamp(-a.vy * 0.05, -0.35, 0.35) - a.speed * 0.012 : -a.slope * 0.8, 20, 7, a.dt);
    d.body.position.y += bob;
    d.body.rotation.set(pitch, 0, flying ? a.bank * 1.6 : 0);
    d.head.rotation.set(-0.1 + (flying ? 0 : 0.15), a.lookYaw * 0.6, Math.sin(t * 0.6) * 0.1 * a.alert);
    d.s.lids = rest > 0.5 ? 0.35 : undefined;
  }
}
