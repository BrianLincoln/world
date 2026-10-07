import * as THREE from 'three';
import { Beast, clamp, collarGeometry, frac, lerp, saddleGeometry, swing, type Anim, type BeastData } from './beast';
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

// Six thin legs, in two pieces each so they can step: a thigh out from the
// hip along +x, sloping down, and a shin down from the knee to the foot.
const THIGH: [number, number] = [0.2, -0.1];
const SHIN: [number, number] = [0.03, -0.25];
const LEG = '#cfc3b0';
/** Hips: side, how far along the body, and which way the leg points at rest (rad forward of straight out). Left then right, front to back. */
const LEGS: { s: number; z: number; fwd: number }[] = [];
for (const s of [1, -1]) for (let i = 0; i < 3; i++) LEGS.push({ s, z: 0.14 - i * 0.14, fwd: 0.5 - i * 0.5 });
const thighGeometry = () => tube([[0, 0, 0], [THIGH[0] * 0.55, THIGH[1] * 0.35, 0], [THIGH[0], THIGH[1], 0]], 0.028, 0.022, LEG, 0, false, 8, 5);
const shinGeometry = () => tube([[0, 0, 0], [SHIN[0] * 1.2, SHIN[1] * 0.5, 0], [SHIN[0], SHIN[1], 0]], 0.022, 0.014, LEG, 0, false, 8, 5);

function bodyGeometry(legs = false) {
  const thorax = furBall({ widthSegs: 40, heightSegs: 30, tufts: 60, amp: 0.12, sweep: 0.06, seed: 14 }).scale(0.34, 0.32, 0.38);
  // The abdomen: fuzzy rings tapering back.
  const rings: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const r = 0.3 - i * 0.045;
    rings.push(colored(furBall({ widthSegs: 22, heightSegs: 16, tufts: 16, amp: 0.1, seed: 30 + i }).scale(r, r * 0.92, r * 0.8).translate(0, -0.04 - i * 0.02, -0.38 - i * 0.2), i % 2 ? '#e4d8ea' : '#ffffff'));
  }
  // (The living moth's legs are parts of their own; the statue's are cut in with it, standing.)
  const fixed: THREE.BufferGeometry[] = [];
  if (legs) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const z = 0.14 - i * 0.14;
    fixed.push(tube([[s * 0.12, -0.2, z], [s * 0.3, -0.3, z + 0.04], [s * 0.34, -0.55, z + 0.08 - i * 0.04]], 0.028, 0.016, LEG, 0, false, 8, 5));
  }
  return merge([colored(thorax, '#ffffff'), ...rings, ...fixed]);
}

/** A moonmoth in stone, settled, its wings half raised (the shrine the third ring becomes): position and normal, feet at y = 0, facing +z. */
export function moonmothStatue(): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [];
  const m = new THREE.Matrix4(), n3 = new THREE.Matrix3(), v = new THREE.Vector3();
  const add = (g: THREE.BufferGeometry, at: THREE.Matrix4) => {
    const flat = g.index ? g.toNonIndexed() : g;
    const p = flat.getAttribute('position'), n = flat.getAttribute('normal');
    n3.getNormalMatrix(at);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(at);
      pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(n3).normalize();
      nor.push(v.x, v.y, v.z);
    }
  };
  const body = new THREE.Matrix4().makeTranslation(0, 0.58, 0);
  add(bodyGeometry(true), body);
  add(headGeometry(), body.clone().multiply(m.makeTranslation(0, 0.04, 0.46)));
  // (Thin sheets: both faces, so the stone has two sides.)
  const W: [boolean, boolean, number, number, number, number][] = [[false, false, 0.16, 0.12, 0.2, 0.42], [false, true, -0.16, 0.12, 0.2, -0.42], [true, false, 0.14, 0.08, -0.06, 0.32], [true, true, -0.14, 0.08, -0.06, -0.32]];
  for (const [hind, mirror, x, y, z, up] of W) {
    const at = body.clone().multiply(m.makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationZ(up));
    add(wingGeometry(hind, mirror), at);
    add(wingGeometry(hind, mirror).scale(1, -1, 1), at.clone().multiply(m.makeTranslation(0, -0.03, 0)));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.computeVertexNormals();
  return g;
}

export class Moonmoth extends Beast {
  private bodyB: PartBatch; private thighB: PartBatch; private shinB: PartBatch; private headB: PartBatch; private wingB: PartBatch[]; private saddleB: PartBatch; private collarB: PartBatch;

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
    this.thighB = this.batch(thighGeometry(), look, 6);
    this.shinB = this.batch(shinGeometry(), look, 6);
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
    LEGS.forEach((L, k) => {
      const hip = this.node(d, `hip${k}`, d.body, L.s * 0.12, -0.2, L.z);
      this.draw(d, this.thighB, hip);
      this.draw(d, this.shinB, this.node(d, `knee${k}`, hip, THIGH[0], THIGH[1], 0));
    });
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
    // Walking, they're held half up off the ground and shiver with each step.
    const walk = flying ? 0 : a.moving;
    const step = a.cyc * Math.PI * 2;
    up += walk * (0.3 + Math.sin(step * 2) * 0.06);
    const sweep = flying ? -beat * 0.12 : 0.05;
    d.n.fL.rotation.set(0, sweep, up);
    d.n.fR.rotation.set(0, -sweep, -up);
    d.n.hL.rotation.set(0, sweep * 0.5 - 0.15, up * 0.85 - 0.05);
    d.n.hR.rotation.set(0, -sweep * 0.5 + 0.15, -up * 0.85 + 0.05);
    // The body rises and falls against each beat; tips into its turns.
    // Legs: an insect's walk, three feet down at a time (fore and hind of one
    // side with the middle of the other); tucked up under her in the air.
    const tuck = a.air;
    LEGS.forEach((L, k) => {
      const [back, raise] = swing(frac(a.cyc + ((k + (L.s > 0 ? 0 : 1)) % 2) * 0.5), 0.6, 0.5, 1);
      const fwd = lerp(L.fwd - back * walk, L.fwd * 0.4, tuck);
      const lift = raise * 0.4 * walk;
      // (Thigh along +x: the right side's are turned right round.)
      d.n[`hip${k}`].rotation.set(0, L.s > 0 ? -fwd : Math.PI + fwd, lift * (1 - tuck) - 0.35 * tuck);
      d.n[`knee${k}`].rotation.set(0, 0, -lift * 0.5 * (1 - tuck) - 1.3 * tuck);
    });
    const bob = flying ? -beat * 0.12 : Math.abs(Math.sin(step)) * 0.025 * walk;
    const pitch = d.pitch.step(flying ? clamp(-a.vy * 0.05, -0.35, 0.35) - a.speed * 0.012 : -a.slope * 0.8, 20, 7, a.dt);
    d.body.position.y += bob;
    // (Clinging to a rock face, head up, wings spread against it: `s.hang`, 0..1. Whoever has put her there says so.)
    const hang = d.s.hang ?? 0;
    // (On foot she waddles: a little roll and yaw onto each tripod.)
    const waddle = Math.sin(step) * walk;
    d.body.rotation.set(pitch * (1 - hang) - (Math.PI / 2) * hang, waddle * 0.05, flying ? a.bank * 1.6 : waddle * 0.04);
    d.head.rotation.set(-0.1 + (flying ? 0 : 0.15), a.lookYaw * 0.6 - waddle * 0.05, Math.sin(t * 0.6) * 0.1 * a.alert);
    d.s.lids = rest > 0.5 ? 0.35 : undefined;
  }
}
