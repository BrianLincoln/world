import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeFaceMaterial, makeSolidMaterial } from '../gfx/materials';
import { buildAxe, buildHammer, buildPick } from '../story/geometry';
import type { BikeRider } from '../vehicles/bikes';
import type { Body } from './movement';

// The explorer: a chunky storybook figure in a blue A-line parka, a red knit
// hat with a floppy tip, a mustard scarf and a rounded rucksack (which holds
// the parachute). Everything is smooth lathe/ellipsoid geometry so the toon
// bands fall in clean curves.
//
// Animation is fully procedural and reads only Body + the mode name + the
// Body's one-frame events. Each locomotion state produces a pose; poses are
// blended by smoothed weights, then overlays (lean into acceleration, bank
// into turns, landing crouch, squash & stretch) and spring-driven secondary
// motion (hat tip, scarf tails, canopy) go on top.

const C = {
  coat: '#40678c',
  coatDark: '#34587a',
  fur: '#efe5d4',
  skin: '#f2d7c0',
  eye: '#2e1f28',
  eyeWhite: '#fffdf8',
  hair: '#8c4b30',
  hat: '#b8473a',
  hatBrim: '#9d3a31',
  pom: '#f4ede2',
  scarf: '#d9a347',
  trousers: '#3b3444',
  boots: '#5c3b2c',
  sole: '#3c2922',
  mitten: '#a9443a',
  pack: '#7b5339',
  packDark: '#654230',
  strap: '#4f3326',
  bedroll: '#d8cbb3',
  toggle: '#eadcc3',
  canopyA: '#c24e3f',
  canopyB: '#f1e6d2',
  line: '#5a4034',
};

const HIP_Y = 0.66;

const mats = new Map<string, THREE.ShaderMaterial>();
function M(hex: string, doubleSide = false) {
  const key = hex + (doubleSide ? 'd' : '');
  let m = mats.get(key);
  // Eye whites stay flat and bright, or they shade down into "spectacles".
  const flat = hex === C.eyeWhite;
  if (!m) mats.set(key, (m = makeSolidMaterial(hex, 0, { doubleSide, keep: flat ? 0.95 : 0.7, flat: flat ? 1 : 0 })));
  return m;
}

function mesh(geo: THREE.BufferGeometry, hex: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, M(hex));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function lathe(pts: [number, number][], segs = 40) {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

/** Rounded tapered limb along +y from 0 to len (caps extend past both ends). */
function taper(r0: number, r1: number, len: number, segs = 24) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 4; i++) {
    const a = -Math.PI / 2 + (i / 4) * (Math.PI / 2);
    pts.push([Math.max(1e-4, r0 * Math.cos(a)), r0 * Math.sin(a) * 0.8]);
  }
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push([Math.max(1e-4, r1 * Math.cos(a)), len + r1 * Math.sin(a) * 0.8]);
  }
  return lathe(pts, segs);
}
/** Same, hanging down from the pivot. */
function limb(r0: number, r1: number, len: number) {
  return taper(r0, r1, len).rotateX(Math.PI);
}

const SPHERE = new THREE.SphereGeometry(1, 32, 24);
function blob(hex: string, parent: THREE.Object3D, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0) {
  const m = mesh(SPHERE, hex, parent, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

// ----------------------------------------------------------------- poses

const JOINTS = [
  'hipY', 'hipX', 'hipYaw', 'hipRoll', 'spX', 'spYaw', 'spRoll', 'hdX', 'hdYaw', 'hdRoll',
  'thL', 'thR', 'thLz', 'thRz', 'knL', 'knR', 'anL', 'anR',
  'shLx', 'shRx', 'shLz', 'shRz', 'elL', 'elR',
] as const;
type Pose = Record<(typeof JOINTS)[number], number>;
const newPose = (): Pose => Object.fromEntries(JOINTS.map((k) => [k, 0])) as Pose;

const STATES = ['ground', 'air', 'glide', 'swim', 'fly', 'ride', 'bike'] as const;
type State = (typeof STATES)[number];
/** Putting a tool away: the whole gesture (s), and when it leaves the mitten. */
const STOW_T = 0.45;
const STOW_SWAP = 0.2;
/** Story tools the right mitten can hold. */
const TOOLS = ['axe', 'pick', 'hammer'] as const;
type Tool = (typeof TOOLS)[number];

const sat = (x: number) => Math.min(1, Math.max(0, x));
const lerp = THREE.MathUtils.lerp;

/** Limb lengths (pivot to next pivot) and where the pivots sit, for IK. */
const THIGH = 0.27;
const SHIN = 0.255;
const UPPER_ARM = 0.22;
const FOREARM = 0.245;
const HIP_X = 0.105;
const SHOULDER = new THREE.Vector2(0.22, 0.45);

/**
 * Two-bone IK for a limb hanging along -y from its pivot, posed as
 * rotation (x, 0, z) then a bend about x at the middle joint. `t` is the
 * target relative to the pivot, in the pivot's parent frame. Knees bend
 * forward (bend > 0), elbows backward (bend < 0). Returns [x, z, bend].
 */
function solveLimb(t: THREE.Vector3, a: number, b: number, knee: boolean): [number, number, number] {
  const len = Math.max(1e-4, t.length());
  const d = THREE.MathUtils.clamp(len, Math.abs(a - b) + 1e-3, a + b - 1e-3);
  const splay = Math.asin(THREE.MathUtils.clamp(t.x / len, -1, 1));
  const phi = Math.atan2(-t.z, -t.y);
  const alpha = Math.acos(THREE.MathUtils.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const bend = Math.PI - Math.acos(THREE.MathUtils.clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1));
  return knee ? [phi - alpha, splay, bend] : [phi + alpha, splay, -bend];
}

/** Rotate a vector by -angle about x (undo a parent's pitch). */
function unpitch(v: THREE.Vector3, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return v.set(v.x, v.y * c + v.z * s, -v.y * s + v.z * c);
}

class Spring {
  x = 0;
  v = 0;
  constructor(x = 0) {
    this.x = x;
  }
  step(target: number, k: number, c: number, dt: number) {
    this.v += (k * (target - this.x) - c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

// ----------------------------------------------------------------- parachute

class Parachute {
  readonly group = new THREE.Group();
  private canopy = new THREE.Group();
  private open = new Spring(0);
  private pitch = new Spring();
  private roll = new Spring();
  target = 0;

  constructor() {
    const gores = 8;
    const R = 1.75;
    const squash = 0.62;
    const phiMax = 1.12;
    const rows = 12;
    const cols = gores * 8;
    const pos: number[] = [];
    for (let i = 0; i <= rows; i++) {
      const phi = (i / rows) * phiMax;
      const edge = Math.pow(i / rows, 4);
      for (let j = 0; j <= cols; j++) {
        const th = (j / cols) * Math.PI * 2;
        const cell = Math.abs(Math.sin((gores * th) / 2));
        // Inflated cells bulge between seams; the hem sags in scallops.
        const r = R * Math.sin(phi) * (1 + 0.07 * cell * Math.sin(phi));
        const y = R * squash * Math.cos(phi) - 0.2 * cell * edge;
        pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
      }
    }
    const idx: number[][] = [[], []];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = i * (cols + 1) + j;
        const b = a + cols + 1;
        const gore = Math.floor((j / cols) * gores) % 2;
        idx[gore].push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex([...idx[0], ...idx[1]]);
    geo.addGroup(0, idx[0].length, 0);
    geo.addGroup(idx[0].length, idx[1].length, 1);
    geo.computeVertexNormals();
    const dome = new THREE.Mesh(geo, [M(C.canopyA, true), M(C.canopyB, true)]);
    const hemY = R * squash * Math.cos(phiMax);
    const lift = 2.0 - hemY;
    dome.position.y = lift;
    this.canopy.add(dome);

    // Rigging lines from each seam on the hem down to the harness (origin).
    const lines: THREE.BufferGeometry[] = [];
    const hemR = R * Math.sin(phiMax);
    for (let k = 0; k < gores; k++) {
      const th = (k / gores) * Math.PI * 2;
      const top = new THREE.Vector3(Math.cos(th) * hemR, 2.0, Math.sin(th) * hemR);
      const len = top.length();
      const g = new THREE.CylinderGeometry(0.014, 0.014, len, 4, 1, true);
      g.translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().normalize()));
      lines.push(g);
    }
    this.canopy.add(new THREE.Mesh(mergeGeometries(lines), M(C.line)));
    this.group.add(this.canopy);
    this.group.visible = false;
  }

  update(dt: number, t: number, fwdAcc: number, turn: number, speed: number) {
    const opening = this.target > this.open.x;
    const o = this.open.step(this.target, opening ? 70 : 220, opening ? 7 : 28, dt);
    if (this.target === 0 && o < 0.03) {
      this.open.x = this.open.v = 0;
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const s = Math.max(0.001, o);
    // Unfurls out of the rucksack: narrow and low first, then full.
    this.canopy.scale.set(s, Math.max(0.001, s * s) * (1 + 0.03 * Math.sin(t * 3.1)), s);
    this.canopy.position.set(0, 0, -0.25 * (1 - sat(o)));
    const p = this.pitch.step(THREE.MathUtils.clamp(-fwdAcc * 0.03 - speed * 0.012, -0.4, 0.3), 30, 5, dt);
    const r = this.roll.step(THREE.MathUtils.clamp(-turn * 0.35, -0.45, 0.45), 30, 5, dt);
    this.canopy.rotation.set(p + Math.sin(t * 1.7) * 0.03, 0, r + Math.sin(t * 1.3) * 0.04);
  }
}

// ----------------------------------------------------------------- rig

export class CharacterRig {
  readonly root = new THREE.Group();
  /** Emits dust: world position, count, size, outward speed. */
  onPuff?: (at: THREE.Vector3, count: number, size: number, spread: number) => void;

  private body = new THREE.Group();
  private hips = new THREE.Group();
  private spine = new THREE.Group();
  private head = new THREE.Group();
  private thighL = new THREE.Group();
  private thighR = new THREE.Group();
  private kneeL = new THREE.Group();
  private kneeR = new THREE.Group();
  private ankleL = new THREE.Group();
  private ankleR = new THREE.Group();
  private shL = new THREE.Group();
  private shR = new THREE.Group();
  private elL = new THREE.Group();
  private elR = new THREE.Group();
  private tip1 = new THREE.Group();
  private tip2 = new THREE.Group();
  private scarf: THREE.Group[] = [];
  private face = makeFaceMaterial(C.skin, C.eye, C.eyeWhite, C.hair);
  private chute = new Parachute();

  private t = 0;
  private phase = 0;
  private w: Record<State, number> = { ground: 1, air: 0, glide: 0, swim: 0, fly: 0, ride: 0, bike: 0 };
  private poses: Record<State, Pose> = { ground: newPose(), air: newPose(), glide: newPose(), swim: newPose(), fly: newPose(), ride: newPose(), bike: newPose() };
  private rootInv = new THREE.Matrix4();
  private ik = new THREE.Vector3();
  private ik2 = new THREE.Vector3();
  /** Seconds since a lasso throw started (large = not throwing). */
  private throwT = 9;
  private aimW = 0;
  private aimLocal = new THREE.Vector3();
  private seatSpread = 0.6;
  private invQ = new THREE.Quaternion();
  private pose = newPose();
  private airTime = 0;
  private prevVel = new THREE.Vector3();
  private acc = new THREE.Vector2();
  private turn = 0;
  private prevHeading = 0;
  private squash = new Spring();
  private crouch = 0;
  private crouchTarget = 0;
  private tipX = [new Spring(1.1), new Spring(0.9)];
  private tipZ = [new Spring(), new Spring()];
  private scarfX = [new Spring(), new Spring(), new Spring(), new Spring()];
  private scarfZ = [new Spring(), new Spring()];
  private blinkAt = 2;
  private look = new THREE.Vector2();
  private glance = new THREE.Vector2();
  private glanceAt = 1;
  private lastStep = 0;
  private tmp = new THREE.Vector3();

  /** Live round-face values, in FACE_PARAMS order (edited by the debug panel). */
  get faceValues(): number[] {
    return this.face.uniforms.uFace.value;
  }
  /**
   * World direction the right hand holds a rope toward (a lead or a caught
   * mob), or null. The arm points along it.
   */
  ropeAim: THREE.Vector3 | null = null;

  /** Play the lasso throw on the right arm. */
  throwLasso() {
    this.throwT = 0;
  }

  private chopT = 9;
  private giveT = 9;
  private knockT = 9;
  /**
   * Story tools: each has an in-hand copy (right mitten); the axe and pick
   * also have a stowed one, crossed on the pack. The hammer isn't carried:
   * it's only ever drawn for building.
   */
  private tools: Record<Tool, { hand: THREE.Group; stowed: THREE.Group | null; parts: THREE.Object3D[]; carryGrip: number; swingGrip: number }> = {
    axe: { hand: new THREE.Group(), stowed: new THREE.Group(), parts: [], carryGrip: 0.52, swingGrip: 0.06 },
    pick: { hand: new THREE.Group(), stowed: new THREE.Group(), parts: [], carryGrip: 0.5, swingGrip: 0.06 },
    hammer: { hand: new THREE.Group(), stowed: null, parts: [], carryGrip: 0.12, swingGrip: 0.04 },
  };
  private held: Tool | null = null;

  /** Which tools you own (drawn stowed on the pack) and which is in the right mitten (the hammer needs no owning). */
  setTools(owned: { axe: boolean; pick: boolean }, hand: Tool | null) {
    const held = hand && (hand === 'hammer' || owned[hand]) ? hand : null;
    // Putting a tool away (not swapping to another) plays the stow gesture.
    if (this.held && !held) { this.stowing = this.held; this.stowT = 0; }
    if (held && this.stowing) {
      const t = this.tools[this.stowing];
      t.hand.scale.setScalar(1);
      t.stowed?.scale.setScalar(1);
      this.stowing = null;
    }
    this.held = held;
    for (const k of TOOLS) {
      const t = this.tools[k];
      const going = this.stowing === k && this.stowT < STOW_SWAP;
      t.hand.visible = this.held === k || going;
      if (t.stowed) t.stowed.visible = k !== 'hammer' && owned[k] && this.held !== k && !going;
    }
  }
  private stowing: Tool | null = null;
  private stowT = 9;

  get inHand() { return this.held; }

  /** A quick one-armed knock with the hammer (building). */
  knock() {
    if (this.knockT > 0.22) this.knockT = 0;
  }

  /** A two-handed overhead axe swing (the blow lands ~0.3 s in). */
  chop() {
    this.chopT = 0;
  }

  /** Both hands forward: handing something over. */
  give() {
    if (this.giveT > 0.3) this.giveT = 0;
  }

  /** The right mitten, world space (where ropes start). */
  hand(out: THREE.Vector3): THREE.Vector3 {
    return this.elR.localToWorld(out.set(0, -0.27, 0.02));
  }

  /** Freeze idle head turns and blinks (for tuning the face). */
  holdStill = false;

  /** 'dot' = solid ink ovals, 'round' = whites with small pupils. */
  get eyeType(): 'dot' | 'round' {
    return this.face.uniforms.uEyeType.value > 0.5 ? 'round' : 'dot';
  }
  set eyeType(v: 'dot' | 'round') {
    this.face.uniforms.uEyeType.value = v === 'round' ? 1 : 0;
  }

  constructor() {
    this.root.add(this.body, this.chute.group);
    this.chute.group.position.set(0, 1.2, -0.12);
    this.body.add(this.hips);
    this.hips.position.y = HIP_Y;
    this.hips.add(this.spine);
    this.buildTorso();
    this.buildHead();
    this.buildArms();
    this.buildLegs();
    this.buildAxe();
  }

  private buildAxe() {
    // Each story tool is one geometry drawn as two solid meshes: the cut-wood
    // handle (kind 17) and the steel (kind 18).
    const split = (geo: THREE.BufferGeometry, want: number) => {
      const kinds = geo.getAttribute('aKind') as THREE.BufferAttribute;
      const pos = geo.getAttribute('position') as THREE.BufferAttribute, nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
      const P: number[] = [], N: number[] = [];
      for (let i = 0; i < pos.count; i += 3) {
        if (Math.round(kinds.getX(i)) !== want) continue;
        for (let k = 0; k < 3; k++) { P.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k)); N.push(nrm.getX(i + k), nrm.getY(i + k), nrm.getZ(i + k)); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      return g;
    };
    const wood = makeSolidMaterial('#e3c48f', 0, { keep: 0.6 });
    const steel = makeSolidMaterial('#9aa8b8', 0, { keep: 0.6 });
    const basis = (h: THREE.Vector3, b: THREE.Vector3) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(b.normalize(), h.normalize(), new THREE.Vector3().crossVectors(b, h)));
    // Carried by the throat: head forward, handle trailing down and back.
    // Swinging: gripped at the end, the head out along the forearm, edge
    // leading (-z is the direction an arm swinging forward travels).
    this.toolCarry = basis(new THREE.Vector3(0, 0.55, 0.83), new THREE.Vector3(0, -0.83, 0.55));
    this.toolSwing = basis(new THREE.Vector3(0, -1, 0.12), new THREE.Vector3(0, -0.12, -1));
    for (const [k, geo] of [['axe', buildAxe()], ['pick', buildPick()], ['hammer', buildHammer()]] as const) {
      const t = this.tools[k];
      const mk = () => [new THREE.Mesh(split(geo, 17), wood), new THREE.Mesh(split(geo, 18), steel)];
      const inHand = mk();
      t.parts = inHand;
      t.hand.add(...inHand);
      t.hand.position.set(0, -0.25, 0.03);
      t.hand.quaternion.copy(this.toolCarry);
      t.hand.visible = false;
      this.elR.add(t.hand);
      if (!t.stowed) continue;
      const stowed = mk();
      t.stowed.add(...stowed);
      t.stowed.visible = false;
      if (k === 'axe') {
        // Diagonal across the pack, head up by the left shoulder, blade flat.
        for (const m of stowed) m.position.set(0, -0.42, 0);
        t.stowed.quaternion.copy(basis(new THREE.Vector3(0.62, 0.78, 0), new THREE.Vector3(0.78, -0.62, 0)));
        t.stowed.position.set(0.02, 0.3, -0.43);
        this.spine.add(t.stowed);
      } else {
        // The mirror diagonal, crossing the axe in an X, head up by the right
        // shoulder; a touch further out so it lies over the axe handle.
        for (const m of stowed) m.position.set(0, -0.4, 0);
        t.stowed.quaternion.copy(basis(new THREE.Vector3(-0.62, 0.78, 0), new THREE.Vector3(0.78, 0.62, 0)));
        t.stowed.position.set(0.02, 0.32, -0.47);
        this.spine.add(t.stowed);
      }
    }
  }
  private toolCarry = new THREE.Quaternion();
  private toolSwing = new THREE.Quaternion();
  private swingW = 0;

  private buildTorso() {
    const sp = this.spine;
    // A-line parka, slightly flattened front-to-back.
    const coat = lathe([
      [0, -0.13], [0.2, -0.15], [0.272, -0.14], [0.288, -0.1], [0.283, 0.0], [0.27, 0.12], [0.256, 0.24],
      [0.246, 0.34], [0.234, 0.42], [0.212, 0.49], [0.175, 0.54], [0.12, 0.58], [0.06, 0.605], [0, 0.61],
    ]).scale(1, 1, 0.82);
    mesh(coat, C.coat, sp);
    mesh(new THREE.TorusGeometry(0.278, 0.042, 10, 40).rotateX(Math.PI / 2).scale(1, 1, 0.82), C.fur, sp, 0, -0.12, 0);
    const toggle = new THREE.CapsuleGeometry(0.018, 0.06, 4, 8).rotateZ(Math.PI / 2);
    mesh(toggle, C.toggle, sp, 0, 0.3, 0.203);
    mesh(toggle, C.toggle, sp, 0, 0.13, 0.222);

    // Rucksack, flap, pocket, bedroll, straps.
    mesh(new RoundedBoxGeometry(0.34, 0.38, 0.19, 4, 0.075), C.pack, sp, 0, 0.25, -0.3);
    mesh(new RoundedBoxGeometry(0.355, 0.15, 0.21, 4, 0.06), C.packDark, sp, 0, 0.39, -0.305);
    mesh(new RoundedBoxGeometry(0.22, 0.12, 0.07, 3, 0.03), C.packDark, sp, 0, 0.14, -0.4);
    mesh(new THREE.CapsuleGeometry(0.085, 0.3, 6, 16).rotateZ(Math.PI / 2), C.bedroll, sp, 0, 0.5, -0.31);
    const strap = new THREE.TorusGeometry(0.2, 0.022, 6, 20, Math.PI).rotateY(Math.PI / 2);
    mesh(strap, C.strap, sp, 0.12, 0.4, -0.02);
    mesh(strap, C.strap, sp, -0.12, 0.4, -0.02);

    // Scarf: a thick ring plus two tails that flap from the back.
    mesh(new THREE.TorusGeometry(0.125, 0.068, 12, 28).rotateX(Math.PI / 2).scale(1, 1, 0.92), C.scarf, sp, 0, 0.565, 0);
    const tailGeo = new RoundedBoxGeometry(0.1, 0.2, 0.035, 2, 0.015).translate(0, -0.09, 0);
    for (const [x, len] of [[0.06, 1], [-0.02, 0.8]] as const) {
      const a = new THREE.Group();
      a.position.set(x, 0.54, -0.14);
      sp.add(a);
      const m1 = mesh(tailGeo, C.scarf, a);
      m1.scale.y = len;
      const b = new THREE.Group();
      b.position.y = -0.18 * len;
      a.add(b);
      const m2 = mesh(tailGeo, C.scarf, b);
      m2.scale.set(0.9, len, 1);
      this.scarf.push(a, b);
    }
  }

  private buildHead() {
    const h = this.head;
    h.position.set(0, 0.6, 0.01);
    this.spine.add(h);
    const R = 0.25;
    const cy = 0.23;
    h.scale.setScalar(1.1);
    // Face features are painted in the head's shader (FACE_FRAG).
    const head = new THREE.Mesh(SPHERE, this.face);
    head.scale.set(R * 1.06, R * 0.96, R * 0.96);
    head.position.set(0, cy, 0.02);
    h.add(head);
    const Z = new THREE.Vector3(0, 0, 1);
    /** A blob on the head surface; yaw/pitch in radians from the face centre. */
    const on = (hex: string, yaw: number, pitch: number, sx: number, sy: number, sz: number, out = 1) => {
      const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const m = blob(hex, h, sx, sy, sz, d.x * R * 1.02 * out, cy + d.y * R * 0.96 * out, 0.02 + d.z * R * 0.96 * out);
      m.quaternion.setFromUnitVectors(Z, d);
      return m;
    };

    // Hair: a shell over the back of the head and side tufts.
    const shell = new THREE.SphereGeometry(R * 1.06, 24, 14, Math.PI - 0.5, Math.PI + 1.0, Math.PI * 0.28, Math.PI * 0.44);
    const hm = mesh(shell, C.hair, h, 0, cy, 0.0);
    hm.scale.set(1.03, 0.98, 0.98);
    (hm.material as THREE.ShaderMaterial).side = THREE.DoubleSide;
    on(C.hair, 1.3, -0.05, 0.05, 0.1, 0.06, 0.97);
    on(C.hair, -1.3, -0.05, 0.05, 0.1, 0.06, 0.97);

    // Knit hat: ribbed brim, rounded crown, floppy two-segment tip + pom.
    const hat = new THREE.Group();
    hat.position.set(0, cy + 0.15, -0.005);
    hat.rotation.x = -0.24;
    h.add(hat);
    mesh(new THREE.TorusGeometry(0.245, 0.058, 12, 36).rotateX(Math.PI / 2), C.hatBrim, hat);
    mesh(lathe([[0.25, -0.02], [0.255, 0.06], [0.24, 0.14], [0.205, 0.21], [0.15, 0.27], [0.1, 0.305], [0.05, 0.32], [0, 0.325]]), C.hat, hat);
    this.tip1.position.set(0, 0.26, -0.03);
    hat.add(this.tip1);
    mesh(taper(0.11, 0.075, 0.16), C.hat, this.tip1);
    this.tip2.position.y = 0.17;
    this.tip1.add(this.tip2);
    mesh(taper(0.075, 0.045, 0.14), C.hat, this.tip2);
    blob(C.pom, this.tip2, 0.085, 0.085, 0.085, 0, 0.2, 0);
  }

  private buildArms() {
    const arm = (sh: THREE.Group, el: THREE.Group, x: number) => {
      sh.position.set(x, 0.45, 0);
      this.spine.add(sh);
      mesh(limb(0.078, 0.066, 0.2), C.coat, sh);
      el.position.y = -0.22;
      sh.add(el);
      mesh(limb(0.066, 0.058, 0.15), C.coat, el);
      mesh(new THREE.TorusGeometry(0.058, 0.026, 8, 18).rotateX(Math.PI / 2), C.fur, el, 0, -0.18, 0);
      blob(C.mitten, el, 0.07, 0.082, 0.068, 0, -0.245, 0.005);
      blob(C.mitten, el, 0.03, 0.04, 0.03, x > 0 ? -0.045 : 0.045, -0.225, 0.035);
    };
    arm(this.shL, this.elL, 0.22);
    arm(this.shR, this.elR, -0.22);
  }

  private buildLegs() {
    const leg = (th: THREE.Group, kn: THREE.Group, an: THREE.Group, x: number) => {
      th.position.set(x, 0, 0);
      this.hips.add(th);
      mesh(limb(0.094, 0.08, 0.2), C.trousers, th);
      kn.position.y = -0.27;
      th.add(kn);
      mesh(limb(0.08, 0.072, 0.18), C.trousers, kn);
      an.position.y = -0.255;
      kn.add(an);
      mesh(taper(0.084, 0.09, 0.07), C.boots, an, 0, -0.06, 0);
      blob(C.boots, an, 0.1, 0.085, 0.15, 0, -0.045, 0.035);
      blob(C.sole, an, 0.105, 0.03, 0.158, 0, -0.105, 0.035);
    };
    leg(this.thighL, this.kneeL, this.ankleL, 0.105);
    leg(this.thighR, this.kneeR, this.ankleR, -0.105);
  }

  // --------------------------------------------------------------- poses

  private groundPose(o: Pose, s: number, q: number) {
    const t = this.t;
    const g = sat((s - 0.2) / 2.0);
    const r = sat((s - 3.2) / 3.5);
    const k = sat((s - 7) / 3.5);
    const A = g * lerp(0.42, 0.78, r) + 0.14 * k;
    const knA = lerp(0.55, 1.45, r) + 0.25 * k;
    const leg = (qq: number): [number, number, number] => {
      const th = -Math.sin(qq) * A - 0.12 * r;
      const kn = g * (0.06 + knA * Math.pow(Math.max(0, Math.cos(qq - 0.25)), 1.4)) + (1 - g) * 0.05;
      return [th, kn, -(th + kn) * 0.8];
    };
    [o.thL, o.knL, o.anL] = leg(q);
    [o.thR, o.knR, o.anR] = leg(q + Math.PI);
    o.thLz = 0.03;
    o.thRz = -0.03;
    const bobW = 0.035 * (0.5 - 0.5 * Math.cos(2 * q)) - 0.02;
    const bobR = 0.08 * (0.5 - 0.5 * Math.cos(2 * q - 0.6)) - 0.075;
    o.hipY = g * lerp(bobW, bobR, r) + (1 - g) * 0.006 * Math.sin(t * 2.1);
    o.hipX = 0.03 * g + 0.08 * r + 0.05 * k;
    o.hipYaw = -Math.sin(q) * 0.14 * g;
    o.hipRoll = 0.035 * Math.cos(q) * g * (1 - r) + (1 - g) * 0.02 * Math.sin(t * 0.5);
    o.spX = 0.02 * g + 0.03 * r + (1 - g) * 0.015 * Math.sin(t * 2.1);
    o.spYaw = Math.sin(q) * 0.24 * g;
    o.spRoll = 0;
    o.hdX = -(o.hipX + o.spX) * 0.7 + (1 - g) * 0.05 * Math.sin(t * 0.31);
    o.hdYaw = -o.spYaw * 0.6 - o.hipYaw + (1 - g) * 0.45 * Math.sin(t * 0.37) * Math.sin(t * 0.23);
    o.hdRoll = (1 - g) * 0.06 * Math.sin(t * 0.29);
    const armA = g * lerp(0.4, 0.95, r);
    o.shLx = Math.sin(q) * armA + 0.05 * r;
    o.shRx = -Math.sin(q) * armA + 0.05 * r;
    o.shLz = 0.13 + 0.07 * r + (1 - g) * 0.02 * Math.sin(t * 2.1);
    o.shRz = -o.shLz;
    o.elL = -(0.18 + 0.12 * g + 1.0 * r) - 0.3 * r * Math.max(0, -Math.sin(q));
    o.elR = -(0.18 + 0.12 * g + 1.0 * r) - 0.3 * r * Math.max(0, Math.sin(q));
  }

  private airPose(o: Pose, vy: number) {
    const t = this.t;
    const f = sat((2 - vy) / 8); // 0 rising, 1 falling
    const down = sat((-vy - 6) / 10);
    const flail = Math.sin(t * 13) * 0.18 * down;
    o.thL = lerp(-1.05, -0.5, f);
    o.knL = lerp(1.55, 0.55, f);
    o.anL = lerp(-0.2, -0.1, f);
    o.thR = lerp(0.3, 0.12, f) + flail * 0.5;
    o.knR = lerp(0.95, 0.75, f);
    o.anR = 0.1;
    o.thLz = 0.08;
    o.thRz = -0.06;
    o.hipY = 0;
    o.hipX = lerp(0.12, -0.02, f);
    o.hipYaw = 0.1;
    o.hipRoll = 0;
    o.spX = lerp(0.05, -0.05, f);
    o.spYaw = -0.12;
    o.spRoll = 0;
    o.hdX = lerp(-0.1, 0.12, f);
    o.hdYaw = 0.05;
    o.hdRoll = 0;
    o.shLx = lerp(0.5, -0.2, f) + flail;
    o.shRx = lerp(-0.7, -0.3, f) - flail;
    o.shLz = lerp(0.55, 1.35, f);
    o.shRz = -lerp(0.45, 1.3, f);
    o.elL = lerp(-0.5, -0.45, f);
    o.elR = lerp(-0.9, -0.5, f);
  }

  private glidePose(o: Pose, s: number) {
    const t = this.t;
    const sw = Math.sin(t * 2.3);
    o.thL = -0.28 + sw * 0.2;
    o.thR = -0.2 - sw * 0.2;
    o.knL = 0.45 - sw * 0.15;
    o.knR = 0.4 + sw * 0.15;
    o.anL = o.anR = 0.25;
    o.thLz = 0.06;
    o.thRz = -0.06;
    o.hipY = 0;
    o.hipX = 0.04 + Math.min(0.15, s * 0.01);
    o.hipYaw = 0;
    o.hipRoll = Math.sin(t * 1.3) * 0.03;
    o.spX = 0;
    o.spYaw = 0;
    o.spRoll = 0;
    o.hdX = 0.12;
    o.hdYaw = Math.sin(t * 0.4) * 0.2;
    o.hdRoll = 0;
    o.shLx = o.shRx = -2.72;
    o.shLz = 0.34;
    o.shRz = -0.34;
    o.elL = o.elR = -0.35;
  }

  private swimPose(o: Pose) {
    const t = this.t;
    const p = t * 3;
    o.hipY = -0.1;
    o.hipX = 1.15;
    o.hipYaw = 0;
    o.hipRoll = Math.sin(p) * 0.12;
    o.spX = 0.1;
    o.spYaw = 0;
    o.spRoll = 0;
    o.hdX = -1.05;
    o.hdYaw = 0;
    o.hdRoll = 0;
    o.thL = Math.sin(t * 7) * 0.35;
    o.thR = -Math.sin(t * 7) * 0.35;
    o.knL = 0.3 + Math.max(0, Math.sin(t * 7)) * 0.4;
    o.knR = 0.3 + Math.max(0, -Math.sin(t * 7)) * 0.4;
    o.anL = o.anR = 0.6;
    o.thLz = 0.05;
    o.thRz = -0.05;
    o.shLx = -2.3 + Math.sin(p) * 0.7;
    o.shRx = -2.3 - Math.sin(p) * 0.7;
    o.shLz = 0.45;
    o.shRz = -0.45;
    o.elL = -0.3 - Math.max(0, Math.cos(p)) * 0.6;
    o.elR = -0.3 - Math.max(0, -Math.cos(p)) * 0.6;
  }

  private flyPose(o: Pose, s: number) {
    const t = this.t;
    o.hipY = 0;
    o.hipX = 0.35 + Math.min(0.9, s / 50);
    o.hipYaw = 0;
    o.hipRoll = Math.sin(t * 1.4) * 0.05;
    o.spX = 0;
    o.spYaw = 0;
    o.spRoll = 0;
    o.hdX = -o.hipX * 0.8;
    o.hdYaw = 0;
    o.hdRoll = 0;
    o.thL = 0.3 + Math.sin(t * 2) * 0.08;
    o.thR = 0.38 - Math.sin(t * 2) * 0.08;
    o.knL = 0.35;
    o.knR = 0.5;
    o.anL = o.anR = 0.5;
    o.thLz = 0.08;
    o.thRz = -0.08;
    o.shLx = o.shRx = 0.1;
    o.shLz = 1.35;
    o.shRz = -1.35;
    o.elL = o.elR = -0.15;
  }

  /** Astride a mount: knees wide around it, mittens forward on the saddle. */
  private ridePose(o: Pose, s: number, vy: number) {
    const t = this.t;
    const spread = this.seatSpread;
    const lean = 0.12 + Math.min(0.35, s * 0.018) - THREE.MathUtils.clamp(vy * 0.02, -0.12, 0.12);
    o.hipY = 0;
    o.hipX = lean;
    o.hipYaw = 0;
    o.hipRoll = Math.sin(t * 1.1) * 0.02;
    o.spX = 0.04;
    o.spYaw = 0;
    o.spRoll = 0;
    o.hdX = -lean * 0.8 + Math.sin(t * 0.7) * 0.03;
    o.hdYaw = Math.sin(t * 0.31) * Math.sin(t * 0.19) * 0.35 * (1 - Math.min(1, s / 8));
    o.hdRoll = 0;
    o.thL = o.thR = -1.25;
    o.thLz = spread;
    o.thRz = -spread;
    o.knL = o.knR = 1.35 - spread * 0.4;
    o.anL = o.anR = -0.1;
    o.shLx = o.shRx = -0.75 - lean * 0.5;
    o.shLz = 0.22;
    o.shRz = -0.22;
    o.elL = o.elR = -0.7;
  }

  /**
   * On a bicycle: hips on the saddle, boots on the pedals and mittens on the
   * grips, solved with two-bone IK against the bike's world-space targets.
   * Leans into the bars, more when standing on the pedals; at a stop the
   * left boot goes down to the ground.
   */
  private bikePose(o: Pose, k: BikeRider, s: number) {
    const t = this.t;
    const stand = k.standing;
    const down = k.footDown;
    const lean = 0.3 + Math.min(0.1, s * 0.01) + 0.22 * stand - 0.1 * down;
    o.hipY = 0;
    o.hipX = lean;
    o.hipYaw = 0;
    o.hipRoll = Math.sin(k.crank) * 0.035 * k.effort;
    o.spX = 0.08;
    o.spYaw = Math.sin(k.crank) * 0.05 * k.effort;
    o.spRoll = 0;
    o.hdX = -(lean + o.spX) * 0.85 + Math.sin(t * 0.7) * 0.02;
    o.hdYaw = Math.sin(t * 0.31) * Math.sin(t * 0.19) * 0.45 * down;
    o.hdRoll = 0;
    const inv = this.rootInv;
    // Root space -> the hips' frame.
    const toHips = (w: THREE.Vector3, out: THREE.Vector3) => unpitch(out.copy(w).applyMatrix4(inv).setY(out.y - HIP_Y - o.hipY), o.hipX);
    const legs: [1 | -1, THREE.Vector3, number][] = [[1, k.pedalL, Math.PI], [-1, k.pedalR, 0]];
    for (const [side, pedal, phase] of legs) {
      // The ankle sits above and just behind the ball of the foot.
      const p = this.ik.copy(pedal).applyMatrix4(inv).add(this.ik2.set(0, 0.12, -0.07));
      const toe = 0.12 + 0.12 * Math.sin(k.crank + phase);
      let pitch = toe;
      if (side === 1 && down > 0.001) {
        const g = this.ik2.copy(k.foot).applyMatrix4(inv);
        p.lerp(g.add(this.tmp.set(0, 0.12, -0.03)), down);
        pitch = lerp(toe, 0, down);
      }
      unpitch(p.setY(p.y - HIP_Y - o.hipY), o.hipX).setX(p.x - side * HIP_X);
      const [th, z, kn] = solveLimb(p, THIGH, SHIN, true);
      if (side === 1) { o.thL = th; o.thLz = z; o.knL = kn; o.anL = pitch - (o.hipX + th + kn); }
      else { o.thR = th; o.thRz = z; o.knR = kn; o.anR = pitch - (o.hipX + th + kn); }
    }
    const arms: [1 | -1, THREE.Vector3][] = [[1, k.gripL], [-1, k.gripR]];
    for (const [side, grip] of arms) {
      const p = unpitch(toHips(grip, this.ik), o.spX);
      p.x -= side * SHOULDER.x;
      p.y -= SHOULDER.y;
      const [sx, sz, el] = solveLimb(p, UPPER_ARM, FOREARM, false);
      if (side === 1) { o.shLx = sx; o.shLz = sz; o.elL = el; }
      else { o.shRx = sx; o.shRz = sz; o.elR = el; }
    }
  }

  // --------------------------------------------------------------- update

  /**
   * `seat` (riding): the rider's hip anchor on the mount, which replaces the
   * Body transform; `spread` is how wide the legs straddle.
   */
  update(b: Body, mode: string, dt: number, seat?: { pos: THREE.Vector3; quat: THREE.Quaternion; spread: number; bike?: BikeRider }) {
    if (dt <= 0) return;
    this.t += dt;
    const t = this.t;
    const e = (rate: number) => 1 - Math.exp(-rate * dt);
    if (seat) {
      this.seatSpread = seat.spread;
      this.root.quaternion.copy(seat.quat);
      this.root.position.set(0, -HIP_Y, 0).applyQuaternion(seat.quat).add(seat.pos);
      if (seat.bike) {
        this.root.updateMatrixWorld();
        this.rootInv.copy(this.root.matrixWorld).invert();
      }
    } else {
      this.root.position.copy(b.pos);
      this.root.rotation.set(0, b.heading, 0);
    }

    // Motion in the character's own frame.
    const speed = Math.hypot(b.vel.x, b.vel.z);
    const sh = Math.sin(b.heading);
    const ch = Math.cos(b.heading);
    const ax = (b.vel.x - this.prevVel.x) / dt;
    const az = (b.vel.z - this.prevVel.z) / dt;
    this.prevVel.copy(b.vel);
    this.acc.x += (ax * sh + az * ch - this.acc.x) * e(10); // forward
    this.acc.y += (ax * ch - az * sh - this.acc.y) * e(10); // left
    let dh = b.heading - this.prevHeading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    this.prevHeading = b.heading;
    this.turn += (dh / dt - this.turn) * e(8);
    const fwdSpeed = b.vel.x * sh + b.vel.z * ch;

    // Events: jump/land/parachute.
    for (const ev of b.events) {
      if (ev.type === 'jump') {
        this.squash.v += 3.2;
        this.crouch = this.crouchTarget = 0;
        if (!seat) this.puff(0, 3, 0.08, 1.2);
      } else if (ev.type === 'land') {
        const k = sat((ev.impact - 1.5) / 14);
        this.squash.v -= 1.2 + k * 4;
        this.crouchTarget = Math.max(this.crouchTarget, 0.25 + k * 0.75);
        this.tipX[0].v += 3 + k * 6;
        if (ev.impact > 3 && !seat) this.puff(0, 5 + Math.round(k * 4), 0.09 + k * 0.08, 1.6 + k * 2.2);
        this.airTime = 0;
      } else if (ev.type === 'deploy') {
        this.chute.target = 1;
        this.tmp.set(0, 1.3, -0.4).applyAxisAngle(THREE.Object3D.DEFAULT_UP, b.heading).add(b.pos);
        this.onPuff?.(this.tmp, 5, 0.12, 1.6);
      } else if (ev.type === 'stow') {
        this.chute.target = 0;
      }
    }
    if (mode !== 'glide') this.chute.target = 0;

    // Which pose family we're in.
    this.airTime = b.grounded ? 0 : this.airTime + dt;
    const state: State = seat ? (seat.bike ? 'bike' : 'ride') : mode === 'walk' ? (this.airTime > 0.1 ? 'air' : 'ground') : (mode as State) in this.w ? (mode as State) : 'ground';
    const rate = state === 'ground' ? 16 : 9;
    let sum = 0;
    for (const s of STATES) {
      this.w[s] += ((s === state ? 1 : 0) - this.w[s]) * e(rate);
      sum += this.w[s];
    }

    // Stride: phase advances with distance, so feet don't skate. Cycle
    // length grows with speed: quick little steps walking, long bounds
    // sprinting.
    if (state === 'ground') {
      const L = 1.0 + 0.27 * speed;
      this.phase += (speed * dt / L) * Math.PI * 2;
      if (speed < 0.2) this.phase += (0 - Math.sin(this.phase)) * e(6) * 0.5;
    }
    const q = this.phase;

    // Blend.
    const P = this.pose;
    for (const j of JOINTS) P[j] = 0;
    for (const s of STATES) {
      const w = this.w[s] / sum;
      if (w < 1e-3) continue;
      const o = this.poses[s];
      if (s === 'ground') this.groundPose(o, speed, q);
      else if (s === 'air') this.airPose(o, b.vel.y);
      else if (s === 'glide') this.glidePose(o, speed);
      else if (s === 'swim') this.swimPose(o);
      else if (s === 'ride') this.ridePose(o, speed, b.vel.y);
      else if (s === 'bike') { if (seat?.bike) this.bikePose(o, seat.bike, speed); }
      else this.flyPose(o, speed);
      for (const j of JOINTS) P[j] += o[j] * w;
    }

    // Overlays: lean into acceleration, bank into turns, landing crouch.
    const wg = this.w.ground / sum;
    const wGl = this.w.glide / sum;
    P.hipX += THREE.MathUtils.clamp(this.acc.x * 0.012, -0.12, 0.15) * wg;
    const bank = THREE.MathUtils.clamp(-this.turn * speed * 0.016, -0.2, 0.2);
    P.hipRoll += bank * (wg + this.w.air / sum * 0.5 + wGl * 1.4);
    P.hdRoll -= bank * 0.5;
    this.crouch += (this.crouchTarget - this.crouch) * e(35);
    this.crouchTarget *= Math.exp(-6 * dt);
    const c = this.crouch * wg;
    P.hipY -= 0.2 * c;
    P.hipX += 0.3 * c;
    P.thL -= 0.6 * c;
    P.thR -= 0.5 * c;
    P.knL += 1.15 * c;
    P.knR += 1.0 * c;
    P.anL -= 0.5 * c;
    P.anR -= 0.45 * c;
    P.hdX -= 0.2 * c;
    P.shLz += 0.3 * c;
    P.shRz -= 0.3 * c;

    // Right arm: the lasso throw (overhead wind-up, then snap forward), then
    // holding the rope toward whatever is on the end of it.
    this.throwT += dt;
    const holding = !!this.ropeAim;
    this.aimW += ((holding ? 1 : 0) - this.aimW) * e(8);
    if (holding) {
      this.invQ.copy(this.root.quaternion).invert();
      this.aimLocal.copy(this.ropeAim!).normalize().applyQuaternion(this.invQ);
    }
    if (this.aimW > 1e-3) {
      const d = this.aimLocal;
      const z = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(d.x, -1, 1)), -1.1, 0.35);
      const x = THREE.MathUtils.clamp(-Math.atan2(Math.max(d.z, -0.2), -d.y), -2.4, 0.3);
      const w = this.aimW;
      P.shRx = lerp(P.shRx, x - P.hipX - P.spX, w);
      P.shRz = lerp(P.shRz, z, w);
      P.elR = lerp(P.elR, -0.15, w);
      P.spYaw = lerp(P.spYaw, P.spYaw - 0.15, w);
    }
    if (this.throwT < 0.5) {
      const k = this.throwT;
      const wind = sat(k / 0.14);
      const snap = sat((k - 0.14) / 0.1);
      const out = 1 - sat((k - 0.3) / 0.2) * (holding ? 0 : 1);
      const x = lerp(lerp(P.shRx, -2.9, wind), -1.35, snap);
      P.shRx = lerp(P.shRx, x, out);
      P.shRz = lerp(P.shRz, lerp(-0.55, -0.2, snap), out);
      P.elR = lerp(P.elR, lerp(-1.3, -0.1, snap), out);
      P.spYaw += (0.3 * wind - 0.55 * snap) * out;
      P.hdYaw -= (0.3 * wind - 0.55 * snap) * out * 0.5;
    }

    // Carrying a tool: the right arm holds it a little out in front.
    if (this.held) {
      P.shRx -= 0.25 * wg;
      P.elR -= 0.45 * wg;
      P.shRz -= 0.08 * wg;
    }
    // Axe swing: wind up overhead and twist, then a hard downward chop with
    // both hands, a little crouch into it, and recover.
    this.chopT += dt;
    if (this.chopT < 0.6) {
      const k = this.chopT;
      const wind = sat(k / 0.2);
      const hit = sat((k - 0.2) / 0.1);
      const back = sat((k - 0.34) / 0.26);
      const w = (1 - back) * (1 - back * 0.2);
      const shx = lerp(lerp(P.shRx, -2.75, wind), -0.75, hit);
      P.shRx = lerp(P.shRx, shx, w);
      P.shLx = lerp(P.shLx, shx + 0.1, w);
      P.shRz = lerp(P.shRz, 0.42, w);
      P.shLz = lerp(P.shLz, -0.38, w);
      P.elR = lerp(P.elR, lerp(-1.0, -0.25, hit), w);
      P.elL = lerp(P.elL, lerp(-1.1, -0.35, hit), w);
      P.spX += (-0.18 * wind * (1 - hit) + 0.32 * hit) * w;
      P.spYaw += (0.35 * wind * (1 - hit) - 0.25 * hit) * w;
      P.hipY -= 0.06 * hit * w;
      P.hdX += 0.15 * hit * w;
    }
    // Knocking with the hammer: the arm comes up and taps down twice as fast
    // as a swing, the body leaning in a touch.
    this.knockT += dt;
    if (this.knockT < 0.3) {
      const k = this.knockT / 0.3;
      const up = Math.sin(k * Math.PI);
      const hit = k > 0.55 ? 1 : 0;
      P.shRx = lerp(P.shRx, -1.35 - 0.9 * up + 0.5 * hit, 0.9);
      P.shRz = lerp(P.shRz, 0.25, 0.9);
      P.elR = lerp(P.elR, -0.9 * up - 0.2, 0.9);
      P.spX += 0.12 * (1 - up);
    }
    // The tool changes grip for a swing or a knock.
    if (this.held) {
      const t = this.tools[this.held];
      const swinging = this.chopT < 0.5 || this.knockT < 0.3;
      this.swingW += ((swinging ? 1 : 0) - this.swingW) * e(swinging ? 30 : 10);
      t.hand.quaternion.slerpQuaternions(this.toolCarry, this.toolSwing, this.swingW);
      const grip = lerp(t.carryGrip, t.swingGrip, this.swingW);
      for (const p of t.parts) p.position.set(0, -grip, 0);
    }
    // Putting a tool away: reach back over the right shoulder and slot it on
    // the pack (it lands with a little bounce), or, for the hammer, drop the
    // hand to the hip and tuck it away.
    this.stowT += dt;
    if (this.stowing && this.stowT < STOW_T) {
      const k = this.stowT / STOW_T;
      const w = Math.sin(k * Math.PI);
      const t = this.tools[this.stowing];
      if (this.stowing === 'hammer') {
        P.shRx = lerp(P.shRx, 0.35, w);
        P.shRz = lerp(P.shRz, -0.2, w);
        P.elR = lerp(P.elR, -0.35, w);
        t.hand.scale.setScalar(sat((STOW_SWAP - this.stowT) / 0.1));
      } else {
        P.shRx = lerp(P.shRx, -2.6, w);
        P.shRz = lerp(P.shRz, 0.3, w);
        P.elR = lerp(P.elR, -2.0, w);
        P.spYaw -= 0.12 * w;
        P.hdYaw += 0.1 * w;
        const pop = sat((this.stowT - STOW_SWAP) / 0.18);
        t.stowed?.scale.setScalar(this.stowT > STOW_SWAP ? 1 + 0.14 * Math.sin(pop * Math.PI) : 1);
      }
    } else if (this.stowing) {
      const t = this.tools[this.stowing];
      t.hand.scale.setScalar(1);
      t.stowed?.scale.setScalar(1);
      this.stowing = null;
    }
    this.giveT += dt;
    if (this.giveT < 0.35) {
      const w = Math.sin((this.giveT / 0.35) * Math.PI);
      P.shRx = lerp(P.shRx, -1.25, w);
      P.shLx = lerp(P.shLx, -1.25, w);
      P.elR = lerp(P.elR, -0.2, w);
      P.elL = lerp(P.elL, -0.2, w);
    }

    // Apply.
    this.hips.position.y = HIP_Y + P.hipY;
    this.hips.rotation.set(P.hipX, P.hipYaw, P.hipRoll);
    this.spine.rotation.set(P.spX, P.spYaw, P.spRoll);
    if (this.holdStill) this.head.rotation.set(0, 0, 0);
    else this.head.rotation.set(P.hdX, P.hdYaw, P.hdRoll);
    this.thighL.rotation.set(P.thL, 0, P.thLz);
    this.thighR.rotation.set(P.thR, 0, P.thRz);
    this.kneeL.rotation.x = P.knL;
    this.kneeR.rotation.x = P.knR;
    this.ankleL.rotation.x = P.anL;
    this.ankleR.rotation.x = P.anR;
    this.shL.rotation.set(P.shLx, 0, P.shLz);
    this.shR.rotation.set(P.shRx, 0, P.shRz);
    this.elL.rotation.x = P.elL;
    this.elR.rotation.x = P.elR;

    // Squash & stretch, volume-preserving.
    const sq = this.squash.step(0, 260, 13, dt);
    const sy = 1 + THREE.MathUtils.clamp(sq, -0.35, 0.35);
    this.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));

    // Footfalls: a spring kick for the hat, a puff when sprinting.
    const step = Math.floor((q + Math.PI / 2) / Math.PI);
    if (state === 'ground' && step !== this.lastStep) {
      const run = sat((speed - 4) / 4);
      this.tipX[0].v += 1.5 * run;
      this.scarfX[0].v += 1.0 * run;
      if (speed > 8.5 && b.grounded) this.puff(step % 2 ? 0.1 : -0.1, 2, 0.07, 0.7);
    }
    this.lastStep = step;

    // Secondary motion. Angles are "tilt back"; the base lean is removed so
    // things hang from the world, not the spine.
    const lean = P.hipX + P.spX;
    const wind = Math.min(1, Math.max(0, fwdSpeed) / 10) + wGl * 0.3;
    const lift = THREE.MathUtils.clamp(-b.vel.y * 0.07, -0.3, 1.2) * (1 - this.w.ground / sum);
    const tipT = 1.05 + wind * 0.35 * 0.5 + this.acc.x * 0.02 - lift * 0.6 - lean * 0.8 + P.hdX * -0.5;
    this.tip1.rotation.x = -this.tipX[0].step(tipT, 60, 6, dt);
    this.tip2.rotation.x = -this.tipX[1].step(0.85 + wind * 0.3 - lift * 0.5 + (this.tipX[0].x - tipT) * 0.8, 45, 4, dt);
    const side = -this.acc.y * 0.02 - bank * 0.8;
    this.tip1.rotation.z = this.tipZ[0].step(side, 50, 5, dt);
    this.tip2.rotation.z = this.tipZ[1].step(side * 1.3, 40, 4, dt);
    const flutter = (i: number) => Math.sin(t * (16 + i * 3) + i * 1.7) * 0.12 * wind;
    for (let i = 0; i < 2; i++) {
      const a = this.scarfX[i * 2];
      const bb = this.scarfX[i * 2 + 1];
      const tgt = wind * (1.25 - i * 0.15) + lift * 1.1 + this.acc.x * 0.015 - lean + flutter(i);
      this.scarf[i * 2].rotation.x = a.step(tgt, 55, 5, dt);
      this.scarf[i * 2 + 1].rotation.x = bb.step(wind * 0.35 + flutter(i + 2) * 1.5 + (a.x - tgt) * 0.6, 40, 4, dt);
      this.scarf[i * 2].rotation.z = this.scarfZ[i].step(side * 0.8 + (i ? -0.08 : 0.08), 40, 5, dt);
    }

    // Blink.
    const bl = t > this.blinkAt && !this.holdStill ? 0 : 1;
    if (t > this.blinkAt + 0.11) this.blinkAt = t + 2 + Math.random() * 3.5;
    this.face.uniforms.uBlink.value = bl;

    // Gaze (face x = the character's left). Idle: quick saccades to random
    // points, often back to centre. Moving: eyes lead turns. Eyes also
    // follow the idle head turn, a little ahead of it.
    if (t > this.glanceAt) {
      if (Math.random() < 0.35) this.glance.set(0, 0);
      else this.glance.set((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.07);
      this.glanceAt = t + 0.5 + Math.random() * 2.5;
    }
    const still = 1 - sat(speed / 2.5);
    const lx = this.glance.x * still + THREE.MathUtils.clamp(this.turn * 0.06, -0.12, 0.12) + P.hdYaw * 0.2;
    const ly = this.glance.y * still - 0.01 * (1 - still);
    if (this.holdStill) this.look.set(0, 0);
    else {
      const k = e(28);
      this.look.x += (lx - this.look.x) * k;
      this.look.y += (ly - this.look.y) * k;
    }
    this.face.uniforms.uLook.value.copy(this.look);

    this.chute.update(dt, t, this.acc.x, this.turn, speed);
    this.root.updateMatrixWorld(true);
  }

  private puff(side: number, count: number, size: number, spread: number) {
    if (!this.onPuff) return;
    this.tmp.set(side, 0, 0).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.root.rotation.y).add(this.root.position);
    this.onPuff(this.tmp, count, size, spread);
  }
}
