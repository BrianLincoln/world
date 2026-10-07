import * as THREE from 'three';
import type { CreatureLook } from '../gfx/materials';
import type { MountSpec } from '../player/movement';
import { colored, furBall, lathe, merge, PartBatch, Spring } from './parts';
import type { Flock, Mob, MobCtx, Species } from './types';

// The floof (our own creature, drawn in the storybook style): an almost perfect sphere of
// combed fur with a big painted face, a cream muzzle, little ears, four
// paddling paws and only a nub of a tail. Flocks pass by now and then, 3–9 m
// up (out of reach from the ground), climbing over forests.

const R = 1.1;
// Fur is white in the mesh; each floof's coat colour comes in as its tint.
const BODY = '#ffffff';
const NOSE = '#c4616b';
const SADDLE = '#b8473a';
const TRIM = '#f1e6d2';
const ROPE = '#c9a26b';

/** Coats: peach, cream-white, dark cocoa-plum. Flocks mix them. */
const COATS = ['#f3c38e', '#f6f0e6', '#66545c'].map((h) => new THREE.Color(h));

const MAX = 64;

function bodyGeometry(hi: boolean): THREE.BufferGeometry {
  // Fur everywhere except the face; tips comb back and down. Narrow flicks
  // need a dense mesh; far floofs get a coarse one (the flicks are sub-pixel).
  const up = new THREE.Vector3();
  const fur = furBall({
    widthSegs: hi ? 132 : 56, heightSegs: hi ? 96 : 40,
    tufts: hi ? 130 : 60, amp: hi ? 0.07 : 0.055, sweep: 0.14, width: hi ? 0.8 : 1.0, share: hi ? 0.45 : 0.35, seed: 11,
    comb: (d, out) => {
      up.set(0, -0.55, -1);
      return out.copy(up).addScaledVector(d, -d.dot(up)).normalize();
    },
    mask: (d) => {
      const face = THREE.MathUtils.smoothstep(d.z, 0.35, 0.7) * (1 - THREE.MathUtils.smoothstep(Math.abs(d.y), 0.55, 0.85));
      return 1 - face;
    },
  }).scale(R * 1.04, R * 0.97, R);
  // Tail: a small fur puff at the back.
  const tail = furBall({ widthSegs: 24, heightSegs: 16, tufts: 14, amp: 0.2, sweep: 0.15, seed: 3, comb: (d, out) => out.set(0, -0.3, -1).addScaledVector(d, -d.dot(out)).normalize() })
    .scale(0.24 * R, 0.2 * R, 0.26 * R).translate(0, -0.05 * R, -0.98 * R);
  // A small rose button nose; the mouth and cheeks are painted (see the face).
  const nose = new THREE.SphereGeometry(1, 20, 14).scale(0.09 * R, 0.068 * R, 0.07 * R).translate(0, -0.1 * R, 0.99 * R);
  const glint = new THREE.SphereGeometry(1, 10, 6).scale(0.026 * R, 0.017 * R, 0.014 * R).translate(0.025 * R, -0.075 * R, 1.055 * R);
  return merge([
    colored(fur, BODY, 1),
    colored(tail, BODY),
    colored(nose, NOSE, 0, false),
    colored(glint, '#fffdf8', 0, false),
  ]);
}

function earGeometry() {
  // Long, soft lop ears: flat leaves hanging from the root (pivot at 0).
  // Floofs fly by flapping them, which is also what sets them apart.
  const prof: [number, number][] = [[0.0, 0.02], [0.07, 0.0], [0.12, -0.12], [0.16, -0.32], [0.165, -0.5], [0.14, -0.66], [0.09, -0.77], [0.0, -0.8]];
  return colored(lathe(prof.map(([r, y]) => [r * R, y * R] as [number, number]), 24).scale(1, 1, 0.32), BODY);
}

function pawGeometry() {
  return colored(new THREE.SphereGeometry(1, 16, 12).scale(0.15 * R, 0.13 * R, 0.19 * R), BODY);
}

/** A small knitted blanket hugging the top-back, scalloped cream hem. */
export function blanket(r: number, ang: number, sx = 1, sz = 1, lift = 1.035, drape = 0.5) {
  const pos: number[] = [];
  const rows = 8, cols = 48;
  const at = (i: number, j: number, out: number) => {
    const th = (j / cols) * Math.PI * 2;
    const scallop = 1 + 0.07 * Math.abs(Math.sin(th * 5));
    // Longer down the flanks (x) than fore and aft, like a horse blanket.
    const phi = (i / rows) * ang * scallop * (1 + drape * Math.cos(th) ** 2);
    const rr = r * lift * out;
    return [Math.sin(phi) * Math.cos(th) * rr * sx, Math.cos(phi) * rr, Math.sin(phi) * Math.sin(th) * rr * sz];
  };
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = at(i, j, 1), b = at(i + 1, j, 1), c = at(i, j + 1, 1), d = at(i + 1, j + 1, 1);
    pos.push(...a, ...b, ...c, ...c, ...b, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // Normals straight out from the centre: it reads as soft cloth, not facets.
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  // A rolled cream hem following the scalloped edge.
  const edge: THREE.Vector3[] = [];
  for (let j = 0; j < cols; j++) edge.push(new THREE.Vector3(...at(rows, j, 1.01)));
  const hem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge, true), 96, r * 0.04, 6, true);
  return merge([colored(g, SADDLE), colored(hem, TRIM)]);
}

function saddleGeometry() {
  return blanket(R * 1.0, 0.34, 1, 1, 1.02, 0.6).rotateX(-0.42);
}

function collarGeometry() {
  return colored(new THREE.TorusGeometry(R * 1.06, 0.035, 6, 56).rotateX(Math.PI / 2), ROPE);
}

interface FloofData {
  root: THREE.Object3D;
  collar: THREE.Object3D;
  body: THREE.Object3D;
  ears: THREE.Object3D[];
  paws: THREE.Object3D[];
  saddle: THREE.Object3D;
  seat: THREE.Object3D;
  // brain
  slotA: number;
  slotR: number;
  slotSpin: number;
  alt: number;
  phase: number;
  // anim
  t: number;
  prevVel: THREE.Vector3;
  acc: THREE.Vector3;
  turn: number;
  prevHeading: number;
  pitch: Spring;
  bank: Spring;
  squash: Spring;
  earX: Spring[];
  earBeat: number;
  earZ: Spring[];
  paddle: number;
  blinkAt: number;
  look: THREE.Vector2;
  lookAt: THREE.Vector3 | null;
  eye: THREE.Vector4;
}

const tv = new THREE.Vector3();
const tv2 = new THREE.Vector3();
const tq = new THREE.Quaternion();

export class Floof implements Species {
  readonly name = 'floof' as const;
  readonly radius = R;
  readonly centreY = R;
  readonly flockSize: [number, number] = [4, 9];
  readonly mount: MountSpec = {
    name: 'floof',
    radius: R * 0.9,
    // Mounts outpace the explorer's own flight (22 m/s).
    fly: { speed: 26, sprint: 40, climb: 11, sink: 0, hover: 1.1, turn: 3.2 },
  };
  readonly bodyB: PartBatch;
  /** Coarse body for floofs far from the camera. */
  readonly farB: PartBatch;
  readonly earB: PartBatch;
  readonly pawB: PartBatch;
  readonly saddleB: PartBatch;
  readonly collarB: PartBatch;
  readonly batches: PartBatch[];

  constructor() {
    const face = {
      keep: 0.62,
      eyePos: [0.35, 0.14], eyeSize: [0.24, 0.29], pupil: [0.075, 0.1], lookRange: [0.14, 0.12], eyeTilt: -0.06,
      mouthW: [-0.215, 0.055, 7], blush: [0.6, -0.13, 0.13, 0.075],
    } as const;
    const look = () => ({ ...face, eyePos: [...face.eyePos], eyeSize: [...face.eyeSize], pupil: [...face.pupil], lookRange: [...face.lookRange], mouthW: [...face.mouthW], blush: [...face.blush] } as CreatureLook);
    this.bodyB = new PartBatch(bodyGeometry(true), look(), MAX);
    this.farB = new PartBatch(bodyGeometry(false), look(), MAX);
    this.earB = new PartBatch(earGeometry(), { keep: 0.62 }, MAX * 2);
    this.pawB = new PartBatch(pawGeometry(), { keep: 0.62 }, MAX * 4);
    this.saddleB = new PartBatch(saddleGeometry(), { keep: 0.75, doubleSide: true }, 16);
    this.collarB = new PartBatch(collarGeometry(), { keep: 0.6 }, 16);
    this.batches = [this.bodyB, this.farB, this.earB, this.pawB, this.saddleB, this.collarB];
  }

  /**
   * Floofs just pass by: a flock appears out of view 170-260 m off and drifts
   * across on a line that passes within ~60 m of the explorer, then leaves
   * (the manager despawns it once it's far behind).
   */
  launch(f: Flock, ctx: MobCtx, rnd: () => number, _initial: boolean): boolean {
    const p = ctx.player.pos;
    f.data.alt = 9 + rnd() * 6;
    f.data.speed = 4.5 + rnd() * 3.5;
    f.data.wobble = rnd() * 10;
    f.data.ang = rnd() * Math.PI * 2;
    // Appear out of view, 170-260 m off, on a line that passes 0-60 m from you.
    for (let k = 0; k < 16; k++) {
      const a = rnd() * Math.PI * 2;
      const side = (rnd() - 0.5) * 120;
      const out = 170 + rnd() * 90;
      const dx = Math.sin(a), dz = Math.cos(a);
      const x = p.x + dx * out + dz * side, z = p.z + dz * out - dx * side;
      const y = ctx.surface(x, z) + f.data.alt;
      if (ctx.hidden && !ctx.hidden(x, y, z, 20)) continue;
      f.centre.set(x, 0, z);
      f.target.copy(f.centre);
      f.data.ang = a + Math.PI + (rnd() - 0.5) * 0.3;
      return true;
    }
    return false;
  }

  /** They turn tail and go, as fast as a floof goes, and higher. */
  bolt(f: Flock, from: THREE.Vector3, _ctx: MobCtx) {
    const fd = f.data;
    const rnd = fd.rnd as () => number;
    fd.ang = Math.atan2(f.centre.x - from.x, f.centre.z - from.z) + (rnd() - 0.5) * 0.6;
    fd.speed = 11 + rnd() * 3;
    for (const m of f.members) (m.data as FloofData).alt += 6 + rnd() * 8;
  }

  initMob(m: Mob, i: number, f: Flock, ctx: MobCtx) {
    const r = m.rnd;
    const d: FloofData = {
      root: new THREE.Object3D(),
      collar: new THREE.Object3D(),
      body: new THREE.Object3D(),
      ears: [new THREE.Object3D(), new THREE.Object3D()],
      paws: [0, 1, 2, 3].map(() => new THREE.Object3D()),
      saddle: new THREE.Object3D(),
      seat: new THREE.Object3D(),
      slotA: (i / f.members.length) * Math.PI * 2 + r() * 0.8,
      slotR: 2.5 + r() * 6,
      slotSpin: (r() < 0.5 ? -1 : 1) * (0.04 + r() * 0.05),
      // A flock shares a cruising height; members sit just a little above or below it.
      alt: (f.data.alt ?? 6) + (r() - 0.5) * 3,
      phase: r() * 10,
      t: r() * 10,
      prevVel: new THREE.Vector3(),
      acc: new THREE.Vector3(),
      turn: 0,
      prevHeading: 0,
      pitch: new Spring(),
      bank: new Spring(),
      squash: new Spring(),
      earX: [new Spring(), new Spring()],
      earBeat: r() * 6,
      earZ: [new Spring(), new Spring()],
      paddle: r() * 6,
      blinkAt: r() * 4,
      look: new THREE.Vector2(),
      lookAt: null,
      eye: new THREE.Vector4(0, 0, 1, 0),
    };
    d.root.add(d.body);
    d.body.position.y = R;
    for (const [k, e] of d.ears.entries()) {
      const s = k ? -1 : 1;
      e.position.set(s * 0.58 * R, 0.76 * R, 0.02 * R);
      e.rotation.set(0.15, 0, s * 1.05);
      d.body.add(e);
    }
    for (const [k, p] of d.paws.entries()) {
      p.position.set((k % 2 ? -1 : 1) * 0.4 * R, -0.86 * R, (k < 2 ? 0.34 : -0.36) * R);
      d.body.add(p);
    }
    d.body.add(d.saddle, d.collar);
    d.collar.rotation.x = 0.12;
    d.saddle.position.set(0, 0.0, -0.06 * R);
    d.seat.position.set(0, 0.95 * R, -0.36 * R);
    d.seat.rotation.x = -0.3;
    d.body.add(d.seat);
    m.data = d;
    m.grounded = false;
    const a = d.slotA;
    const x = f.centre.x + Math.cos(a) * d.slotR;
    const z = f.centre.z + Math.sin(a) * d.slotR;
    m.pos.set(x, this.cruiseY(x, z, d.alt, ctx), z);
    m.heading = r() * Math.PI * 2;
    // Mostly the flock's coat, with the odd one out; a touch of variation.
    f.data.coat ??= Math.floor((f.data.rnd as () => number)() * COATS.length);
    const coat = r() < 0.65 ? f.data.coat : Math.floor(r() * COATS.length);
    m.tint.copy(COATS[coat]).multiplyScalar(0.96 + r() * 0.08);
  }

  /** Cruising height: clearance over ground, lifted over forest canopy. */
  private cruiseY(x: number, z: number, alt: number, ctx: MobCtx) {
    const g = ctx.surface(x, z);
    const forest = ctx.gen.forestDensity(x, z, g);
    return g + alt + 17 * THREE.MathUtils.smoothstep(forest, 0.05, 0.4);
  }

  thinkFlock(f: Flock, ctx: MobCtx) {
    // Drift on, the course bending lazily.
    const fd = f.data;
    fd.ang += Math.sin(f.t * 0.07 + fd.wobble) * 0.012 * ctx.dt;
    f.centre.x += Math.sin(fd.ang) * fd.speed * ctx.dt;
    f.centre.z += Math.cos(fd.ang) * fd.speed * ctx.dt;
  }

  think(m: Mob, ctx: MobCtx, leashIndex: number) {
    const d = m.data as FloofData;
    const { dt, player } = ctx;
    if (m.ridden) return;
    const want = tv;
    let maxSpeed = 4;
    let rate = 1.4;
    d.lookAt = null;
    const toPlayer = Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z);

    if (m.state === 'wild' && m.flock) {
      const f = m.flock;
      d.slotA += d.slotSpin * dt;
      const x = f.centre.x + Math.cos(d.slotA) * d.slotR;
      const z = f.centre.z + Math.sin(d.slotA) * d.slotR;
      want.set(x, this.cruiseY(x, z, d.alt + Math.sin(ctx.time * 0.4 + d.phase) * 0.8, ctx), z);
      // Keep up with the drifting flock.
      maxSpeed = (f.data.speed ?? 3) + 3;
      // Curious: they turn to watch you when you're close.
      if (toPlayer < 22) d.lookAt = player.pos;
      // Neighbours keep their distance.
      for (const o of f.members) {
        if (o === m) continue;
        tv2.subVectors(m.pos, o.pos);
        const dd = tv2.length();
        if (dd < 2.8 && dd > 1e-3) want.addScaledVector(tv2, (2.8 - dd) / dd * 1.5);
      }
    } else if (m.state === 'caught') {
      // Tugging against the rope, away from the thrower.
      tv2.subVectors(m.pos, player.pos).setY(0).normalize();
      const tug = 3 + Math.sin(m.stateT * 11) * 2.5;
      want.copy(m.pos).addScaledVector(tv2, tug).add(tv2.set(Math.sin(m.stateT * 7) * 1.5, 0.8, 0));
      maxSpeed = 5;
      rate = 5;
      d.lookAt = player.pos;
    } else if (m.leashed) {
      // Trail behind and a little above the explorer, fanned out if several.
      const back = 3.4 + leashIndex * 1.2;
      const side = (leashIndex % 2 ? -1 : 1) * Math.ceil(leashIndex / 2) * 2.2;
      const sh = Math.sin(player.heading), ch = Math.cos(player.heading);
      want.set(player.pos.x - sh * back + ch * side, 0, player.pos.z - ch * back - sh * side);
      want.y = Math.max(ctx.surface(want.x, want.z) + 1.3, player.pos.y + 0.6);
      maxSpeed = 22;
      rate = 3;
      if (toPlayer < 12) d.lookAt = player.pos;
    } else {
      // Waiting. Comes down low when you walk up, so you can climb on.
      const near = Math.hypot(player.pos.x - m.stay.x, player.pos.z - m.stay.z) < 7;
      want.copy(m.stay);
      want.y = ctx.surface(want.x, want.z) + (near ? 0.5 : 2.2) + Math.sin(ctx.time * 0.9 + d.phase) * 0.25;
      maxSpeed = 4;
      rate = 2;
      if (toPlayer < 14) d.lookAt = player.pos;
    }

    want.sub(m.pos).multiplyScalar(m.leashed ? 1.4 : 0.7);
    if (want.length() > maxSpeed) want.setLength(maxSpeed);
    m.vel.lerp(want, 1 - Math.exp(-rate * dt));
    m.pos.addScaledVector(m.vel, dt);
    const floor = ctx.surface(m.pos.x, m.pos.z) + 0.3;
    if (m.pos.y < floor) { m.pos.y = floor; m.vel.y = Math.max(0, m.vel.y); }

    // Heading: follow travel; when drifting slowly, turn to face what they watch.
    const hs = Math.hypot(m.vel.x, m.vel.z);
    let target = m.heading;
    if (d.lookAt && hs < 2.5) target = Math.atan2(d.lookAt.x - m.pos.x, d.lookAt.z - m.pos.z);
    else if (hs > 0.3) target = Math.atan2(m.vel.x, m.vel.z);
    let dh = target - m.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    m.heading += dh * (1 - Math.exp(-(m.state === 'caught' ? 6 : 1.8) * dt));
  }

  animate(m: Mob, ctx: MobCtx) {
    const d = m.data as FloofData;
    const dt = Math.max(ctx.dt, 1e-4);
    d.t += dt;
    const t = d.t;
    const e = (k: number) => 1 - Math.exp(-k * dt);
    d.root.position.copy(m.pos);
    d.root.rotation.y = m.heading;

    const sh = Math.sin(m.heading), ch = Math.cos(m.heading);
    tv.subVectors(m.vel, d.prevVel).divideScalar(dt);
    d.prevVel.copy(m.vel);
    d.acc.lerp(tv, e(8));
    let dh = m.heading - d.prevHeading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    d.prevHeading = m.heading;
    d.turn += (dh / dt - d.turn) * e(6);
    const fwd = m.vel.x * sh + m.vel.z * ch;
    const accF = d.acc.x * sh + d.acc.z * ch;
    const accS = d.acc.x * ch - d.acc.z * sh;
    const speed = m.vel.length();

    // Floaty bob, nose-down into speed, banking into turns, stretch on climbs.
    const bob = Math.sin(t * 1.9 + d.phase) * 0.1 * (1 - Math.min(1, speed / 12));
    const struggle = m.state === 'caught' ? 1 : 0;
    const pitch = d.pitch.step(THREE.MathUtils.clamp(fwd * 0.03 + accF * 0.02, -0.25, 0.45) + struggle * Math.sin(t * 13) * 0.25, 40, 9, dt);
    const bank = d.bank.step(THREE.MathUtils.clamp(-d.turn * Math.max(2, speed) * 0.05, -0.45, 0.45) + struggle * Math.sin(t * 9) * 0.3, 40, 9, dt);
    d.body.position.y = R + bob;
    d.body.rotation.set(pitch, 0, bank);
    const sq = d.squash.step(THREE.MathUtils.clamp(m.vel.y * 0.025, -0.12, 0.12) + Math.sin(t * 3.8 + d.phase) * 0.015, 90, 10, dt);
    const sy = 1 + sq;
    d.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));

    // Ears are wings: a slow lazy beat drifting along, quicker and bigger
    // when climbing or hurrying; they trail back with speed.
    const work = THREE.MathUtils.clamp(0.35 + m.vel.y * 0.12 + speed * 0.03 + struggle, 0, 1.4);
    d.earBeat += dt * (4.2 + work * 5);
    const beat = Math.sin(d.earBeat);
    for (let k = 0; k < 2; k++) {
      const s = k ? -1 : 1;
      const x = d.earX[k].step(0.15 + fwd * 0.035 + accF * 0.03 - m.vel.y * 0.02, 60, 7, dt);
      const lag = Math.sin(d.earBeat - 0.5);
      const z = d.earZ[k].step(s * (1.12 + (0.35 + 0.3 * work) * lag - accS * 0.03 * s - bank * 0.3), 90, 9, dt);
      d.ears[k].rotation.set(x, 0, z);
      // Soft ears bend on the beat.
      d.ears[k].scale.set(1, 1 + beat * 0.04 * work, 1);
    }
    d.paddle += dt * (3 + Math.min(speed, 20) * 0.9);
    const pa = 0.25 + Math.min(1, speed / 6) * 0.5;
    for (let k = 0; k < 4; k++) {
      const ph = d.paddle + (k === 0 || k === 3 ? 0 : Math.PI);
      d.paws[k].rotation.x = Math.sin(ph) * pa - 0.2;
      d.paws[k].position.y = -0.86 * R + Math.max(0, Math.cos(ph)) * 0.06 * pa;
    }

    // Eyes: blink, happy squint after taming, watch the explorer.
    if (t > d.blinkAt + 0.12) d.blinkAt = t + 1.5 + m.rnd() * 4;
    const lids = m.happy > 0 ? -1 : t > d.blinkAt ? 0.05 : 1;
    let lx = 0, ly = 0;
    if (d.lookAt) {
      tv.subVectors(d.lookAt, m.pos);
      tv.y += 1.2 - R;
      const lz = tv.x * sh + tv.z * ch;
      const lxw = tv.x * ch - tv.z * sh;
      lx = THREE.MathUtils.clamp(Math.atan2(lxw, Math.max(lz, 0.1)) / 0.8, -1, 1);
      ly = THREE.MathUtils.clamp(Math.atan2(tv.y, Math.hypot(lxw, lz)) / 0.8, -1, 1);
    }
    d.look.x += (lx - d.look.x) * e(10);
    d.look.y += (ly - d.look.y) * e(10);
    d.eye.set(d.look.x, d.look.y, lids, 0);
    d.saddle.visible = m.stabled;
    d.root.updateMatrixWorld(true);
  }

  emit(m: Mob, dist: number) {
    const d = m.data as FloofData;
    (dist < 45 ? this.bodyB : this.farB).push(d.body.matrixWorld, m.tint, d.eye);
    for (const e of d.ears) this.earB.push(e.matrixWorld, m.tint);
    for (const p of d.paws) this.pawB.push(p.matrixWorld, m.tint);
    if (d.saddle.visible) this.saddleB.push(d.saddle.matrixWorld, WHITE);
    if (m.state === 'caught' || m.leashed) this.collarB.push(d.collar.matrixWorld, WHITE);
  }

  attach(m: Mob, toward: THREE.Vector3, out: THREE.Vector3) {
    // The lasso rides round the middle; the rope leaves toward the holder.
    const d = m.data as FloofData;
    d.body.getWorldPosition(out);
    tv.subVectors(toward, out).setY(0);
    if (tv.lengthSq() < 1e-4) tv.set(0, 0, 1);
    return out.addScaledVector(tv.normalize(), R * 1.02);
  }

  seat(m: Mob) {
    const d = m.data as FloofData;
    d.seat.getWorldPosition(seatPos);
    d.seat.getWorldQuaternion(seatQuat);
    return { pos: seatPos, quat: seatQuat, spread: 0.72 };
  }

  reset(m: Mob) {
    const d = m.data as FloofData;
    d.pitch.v = d.bank.v = 0;
    m.stay.copy(m.pos);
    tq.identity();
  }
}

const WHITE = new THREE.Color(1, 1, 1);
const seatPos = new THREE.Vector3();
const seatQuat = new THREE.Quaternion();
