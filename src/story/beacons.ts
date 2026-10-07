import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Simplex } from '../core/noise';
import { buildBoulder } from '../gfx/geometry';
import { KIND_COLORS, makePropMaterial, makeSolidMaterial, U } from '../gfx/materials';
import { GHOST_FRAG, GHOST_VERT, HEAD_FRAG, HEAD_VERT } from '../gfx/shaders';
import { Puffs } from '../gfx/puffs';
import type { CharacterRig } from '../player/character';
import type { Body } from '../player/movement';
import type { Tower } from '../world/towers';
import type { WorldGen } from '../world/worldgen';
import type { Sfx } from './audio';
import { propMesh } from './props';
import { inside, rockShape, SPAN, span, TowerRocks, type Rock } from './towerRock';
import { TowerView, type ViewTower } from './towerView';

// Beacon towers at runtime: drawing them (bodies, the door boulder and the
// hollow head, at any distance) and everything that happens at them.
//
// An unlit tower is sealed and empty: its head is dead stone, black inside,
// and its door boulder is bound with an old iron band and padlock. Smash the
// lock with the pick (hold to keep swinging) and the door stone gives way.
// Out tumbles the tower's spirit, a little glowing body with long stretchy
// arms. It has a happy moment with you, then flings its arms up to the
// eyehole and hauls itself up the outside into the head, which blazes on
// from inside. That's lighting a tower. From then on, walk into its
// doorway and the spirit slurps you up the inside of the tower: up top you
// *are* the head, looking out through its eyes (the explorer isn't drawn),
// until you take the way out (the down badge, E, a click or Esc) and it
// slurps you back down and out of the door. Which towers are lit is saved
// per seed.

/** Draw towers this far away (m); nearer than NEAR_LOD gets the detailed meshes. */
const DRAW = 5200;
const NEAR_LOD = 650;
/** Smashing the lock: one swing, when in it the blow lands, and blows to break it. */
const SWING = 0.62, HIT_AT = 0.3, LOCK_HP = 3;
/** How near the lock (m, horizontally) you can swing at it. */
const LOCK_REACH = 5.5;
/** Where you stand to strike it (m from the lock, horizontally): a swing steps you in. */
const LOCK_STAND = 1.5;
/**
 * The spirit's sequence (s after the lock breaks): the door stone shudders
 * as glowing cracks run across it, it bursts, the spirit's glow stirs in
 * the dark doorway and it drifts out to beside you, looks about, is happy,
 * the climb, into the head.
 */
const T_BURST = 0.95, T_EMERGE = 1.3, T_OUT = 2.9, T_LOOK = 3.4, T_HAPPY = 4.2, T_TURN = 6.1, T_REACH = 7.5;
/** Up into the head: arms arcing up to the eyehole, a tug on the grip, yanked up to it, popping in (the arms gone in a puff), and a beat after (s). */
const ARMS_UP = 1.2, ARMS_HOLD = 0.5, PULL = 1.9, INTO = 0.35, AFTER = 2.2;
/** How far through the pull the arms go in a puff (they'd crumple as it closes on the eye). */
const POOF = 0.9;
/** Hanging arms reach this far at most (body units), and the spirit floats this high (m). */
const ARM_HANG = 1.6, HOVER = 0.35;
/** Tower rock collides within this distance of a tower's centre (m). */
const SOLID_R = 90;
/** Rock tops steeper than this (rise over run) aren't floor: you slide off. */
const WALK_SLOPE = 1.15;
/** How far up the feet can step onto rock, and the body's height, for walls (m). */
const STEP_UP = 0.5, BODY_H = 1.7;
/** Aim snaps to a lit tower within this angle of the middle of the view (rad). */
const AIM_CONE = 0.2;
/** The head view's field of view (deg), and how far it narrows onto a tower you're aimed at. */
const VIEW_FOV = 42, AIM_ZOOM = 9;
const RES = new THREE.Vector2();
/** Being slurped in and out (s). */
const IN_REACH = 0.3, IN_PULL = 0.45, IN_RISE = 0.85;

export interface BeaconDeps {
  gen: WorldGen;
  body: Body;
  rig: CharacterRig;
  sfx: Sfx;
  /** Switch the explorer's movement mode ('carried' while held, 'walk' after). */
  setMode(name: string): void;
  /** localStorage key suffix (the seed text). */
  saveKey: string;
  /** Can you break locks yet (do you have the pick)? */
  canSmash(): boolean;
  /** Draw the pick into the mitten for a swing. */
  showPick(): void;
  /** The overlay scene (drawn over the finished frame): the tower camera's markers. */
  overlay: THREE.Scene;
  /** Hide the explorer (while you're the head) or bring them back. */
  hidePlayer(on: boolean): void;
}

/** A hollow-head boulder: smooth, gently lumpy, flattened a little underneath. */
function buildHead(detail: number): THREE.BufferGeometry {
  const n = new Simplex(91);
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // Low bumps only: the openings are traced against a unit ball.
    const d = 1 + 0.045 * n.noise(v.x * 1.3 + v.y * 0.5, v.z * 1.3 - v.y * 0.4) + 0.02 * n.noise(v.x * 3.1, v.z * 3.1 + v.y * 2);
    v.multiplyScalar(d);
    if (v.y < -0.55) v.y = -0.55 + (v.y + 0.55) * 0.45;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Instanced boulders for the tower bodies (prop shading, rock kind). */
class BoulderBatch {
  readonly mesh: THREE.Mesh;
  private geo = new THREE.InstancedBufferGeometry();
  private a0: THREE.InstancedBufferAttribute;
  private a1: THREE.InstancedBufferAttribute;
  count = 0;

  constructor(src: THREE.BufferGeometry, mat: THREE.ShaderMaterial, private cap: number) {
    this.geo.index = src.index;
    this.geo.setAttribute('position', src.attributes.position);
    this.geo.setAttribute('normal', src.attributes.normal);
    this.geo.setAttribute('aKind', src.attributes.aKind);
    this.a0 = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.a1 = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('aI0', this.a0);
    this.geo.setAttribute('aI1', this.a1);
    this.geo.instanceCount = 0;
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
  }

  begin() { this.count = 0; }

  add(x: number, y: number, z: number, sc: number, rot: number, sy: number, tone: number) {
    if (this.count >= this.cap) return;
    const i = this.count++;
    (this.a0.array as Float32Array).set([x, y, z, sc], i * 4);
    (this.a1.array as Float32Array).set([rot, sy, 0, tone], i * 4);
  }

  end() {
    this.geo.instanceCount = this.count;
    this.a0.needsUpdate = true;
    this.a1.needsUpdate = true;
    this.mesh.visible = this.count > 0;
  }
}

/** Instanced hollow heads (see HEAD_FRAG). */
class HeadBatch {
  readonly mesh: THREE.Mesh;
  private geo = new THREE.InstancedBufferGeometry();
  readonly h0: THREE.InstancedBufferAttribute;
  readonly h1: THREE.InstancedBufferAttribute;
  readonly h2: THREE.InstancedBufferAttribute;
  count = 0;

  constructor(src: THREE.BufferGeometry, mat: THREE.ShaderMaterial, private cap: number) {
    this.geo.index = src.index;
    this.geo.setAttribute('position', src.attributes.position);
    this.geo.setAttribute('normal', src.attributes.normal);
    const mk = () => new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.h0 = mk(); this.h1 = mk(); this.h2 = mk();
    this.geo.setAttribute('aH0', this.h0);
    this.geo.setAttribute('aH1', this.h1);
    this.geo.setAttribute('aH2', this.h2);
    this.geo.instanceCount = 0;
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
  }

  begin() { this.count = 0; }

  /** One hollow boulder: `a` = lit (heads) or open (doors), `kind` 0 head / 1 door, `w` = highlight (heads) or the tower's glow (doors). */
  add(h: TowerBoulder4, bob: number, a: number, home: number, tilt: number, look: number, kind: number, w: number) {
    if (this.count >= this.cap) return;
    const i = this.count++;
    (this.h0.array as Float32Array).set([h.x, h.y + bob, h.z, h.rot], i * 4);
    (this.h1.array as Float32Array).set([h.sx, h.sy, a, home], i * 4);
    (this.h2.array as Float32Array).set([tilt, look, kind, w], i * 4);
  }

  end() {
    this.geo.instanceCount = this.count;
    this.h0.needsUpdate = this.h1.needsUpdate = this.h2.needsUpdate = true;
    this.mesh.visible = this.count > 0;
  }
}

type TowerBoulder4 = Tower['head'];

interface HeadState { lit: number; home: number; tilt: number; look: number; hl: number; bob: number; litT: number }

/**
 * A stretchy glowing arm: a tapered tube along a cubic curve from the
 * shoulder to a mitten, rebuilt in place per frame.
 */
export class Arm {
  readonly group = new THREE.Group();
  private geo = new THREE.BufferGeometry();
  private pos: Float32Array;
  private nrm: Float32Array;
  readonly hand: THREE.Mesh;
  private thumb: THREE.Mesh;
  private static SEG = 30;
  private static RAD = 10;

  constructor(mat: THREE.ShaderMaterial) {
    const S = Arm.SEG, R = Arm.RAD;
    this.pos = new Float32Array((S + 1) * R * 3);
    this.nrm = new Float32Array((S + 1) * R * 3);
    const idx: number[] = [];
    for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) {
      const a = i * R + j, b = i * R + ((j + 1) % R), c = (i + 1) * R + j, d = (i + 1) * R + ((j + 1) % R);
      idx.push(a, c, b, b, c, d);
    }
    this.geo.setIndex(idx);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    const tube = new THREE.Mesh(this.geo, mat);
    tube.frustumCulled = false;
    this.hand = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat);
    this.thumb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), mat);
    this.thumb.position.set(0.72, 0.1, 0.35);
    this.hand.add(this.thumb);
    this.hand.frustumCulled = this.thumb.frustumCulled = false;
    this.group.add(tube, this.hand);
    this.group.visible = false;
  }

  private p = new THREE.Vector3();
  private t = new THREE.Vector3();
  private n0 = new THREE.Vector3();
  private b0 = new THREE.Vector3();

  private cs: THREE.Vector3[] = Array.from({ length: Arm.SEG + 1 }, () => new THREE.Vector3());
  /** The centre line as last built, shoulder first. */
  get line(): readonly THREE.Vector3[] { return this.cs; }
  private cr = new THREE.CatmullRomCurve3([], false, 'centripetal');

  /** Shape the arm along a cubic: a0 shoulder, a1/a2 controls, a3 wrist; `side` flips the thumb. */
  set(a0: THREE.Vector3, a1: THREE.Vector3, a2: THREE.Vector3, a3: THREE.Vector3, r0: number, r1: number, handR: number, side: number, palm: THREE.Vector3, clear?: (p: THREE.Vector3, u: number) => void) {
    const S = Arm.SEG;
    for (let i = 0; i <= S; i++) {
      const u = i / S, v = 1 - u;
      this.cs[i].set(0, 0, 0).addScaledVector(a0, v * v * v).addScaledVector(a1, 3 * v * v * u).addScaledVector(a2, 3 * v * u * u).addScaledVector(a3, u * u * u);
    }
    this.build(r0, r1, handR, side, palm, clear);
  }

  /** Shape the arm through a list of points (shoulder first, wrist last). */
  setPath(pts: THREE.Vector3[], r0: number, r1: number, handR: number, side: number, palm: THREE.Vector3, clear?: (p: THREE.Vector3, u: number) => void) {
    this.cr.points = pts;
    for (let i = 0; i <= Arm.SEG; i++) this.cr.getPoint(i / Arm.SEG, this.cs[i]);
    this.build(r0, r1, handR, side, palm, clear);
  }

  /**
   * The tube round the centre line in `cs`. `clear` moves any centre point
   * that's in (or too near) rock back out, so the arm never passes through
   * it; the frame is then taken from the corrected line.
   */
  private build(r0: number, r1: number, handR: number, side: number, palm: THREE.Vector3, clear?: (p: THREE.Vector3, u: number) => void) {
    const S = Arm.SEG, R = Arm.RAD, cs = this.cs;
    if (clear) for (let i = 1; i < S; i++) clear(cs[i], i / S);
    const tan = (i: number, out: THREE.Vector3) => out.subVectors(cs[Math.min(S, i + 1)], cs[Math.max(0, i - 1)]).normalize();
    // A rotation-minimising frame down the curve, so the tube never twists.
    tan(0, this.t);
    this.n0.set(0, 1, 0);
    if (Math.abs(this.t.dot(this.n0)) > 0.9) this.n0.set(1, 0, 0);
    for (let i = 0; i <= S; i++) {
      const u = i / S;
      this.p.copy(cs[i]);
      tan(i, this.t);
      this.n0.addScaledVector(this.t, -this.n0.dot(this.t));
      if (this.n0.lengthSq() < 1e-8) this.n0.set(this.t.y, -this.t.x, 0);
      this.n0.normalize();
      this.b0.crossVectors(this.t, this.n0);
      // Tapered, with a soft swell at the shoulder and the wrist.
      const r = THREE.MathUtils.lerp(r0, r1, u) * (1 + 0.18 * Math.exp(-u * 14) + 0.1 * Math.exp(-(1 - u) * 18));
      for (let j = 0; j < R; j++) {
        const a = (j / R) * Math.PI * 2;
        const cx = Math.cos(a), cy = Math.sin(a);
        const k = (i * R + j) * 3;
        const nx = this.n0.x * cx + this.b0.x * cy, ny = this.n0.y * cx + this.b0.y * cy, nz = this.n0.z * cx + this.b0.z * cy;
        this.pos[k] = this.p.x + nx * r; this.pos[k + 1] = this.p.y + ny * r; this.pos[k + 2] = this.p.z + nz * r;
        this.nrm[k] = nx; this.nrm[k + 1] = ny; this.nrm[k + 2] = nz;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
    // The mitten: a flattened ball at the wrist, its palm toward `palm`.
    tan(S, this.t);
    this.hand.position.copy(cs[S]).addScaledVector(this.t, handR * 0.7);
    this.hand.scale.set(handR * 0.85, handR * 0.62, handR);
    this.hand.lookAt(this.hand.position.clone().add(this.t));
    const up = palm.clone().sub(this.hand.position).normalize();
    this.hand.rotateZ(Math.atan2(up.x, up.y) * 0.3);
    this.thumb.position.x = 0.72 * side;
    this.group.visible = true;
  }
}


/** The tower spirit's size: metres per unit of its 2-unit-tall body (so ~2.8 m tall, ~0.85 m wide). */
const SPIRIT_SIZE = 1.4;
/** Its body's height and radius in units. */
const GHOST_H = 2.0, GHOST_R = 0.3;
/** Glow colours: the same ember and core as a lit tower's eyes (HEAD_FRAG). */
const EMBER = '#ff9a45', CORE = '#ffcf73';
const IRON = '#5a4b52';
const RUST = '#9a5d3e';

/**
 * The old lock on a sealed tower's door boulder: two iron straps crossed
 * over the door stone and a big padlock hanging where they cross. It jolts
 * on each blow and, on the last, bursts off and the straps drop away.
 */
class Lock {
  readonly group = new THREE.Group();
  private padlock = new THREE.Group();
  private straps: THREE.Mesh[] = [];
  readonly pos = new THREE.Vector3();
  hits = 0;
  broken = false;
  private joltX = 0;
  private joltV = 0;
  private flyT = -1;
  private flyV = new THREE.Vector3();
  private spin = new THREE.Vector3();
  private strapV: number[] = [];

  constructor(readonly tower: Tower, ground: (x: number, z: number) => number) {
    const b = tower.boulders[1];
    const c = new THREE.Vector3(b.x, b.y, b.z);
    const fwd = new THREE.Vector3(Math.sin(tower.yaw), 0, Math.cos(tower.yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const iron = makeSolidMaterial(IRON, 0, { keep: 0.35 });
    const rust = makeSolidMaterial(RUST, 0, { keep: 0.45 });
    // A point on the door boulder's surface (a smooth ellipsoid, see
    // buildHead), a hair proud of it: horizontal angle a off the front, up e.
    const onRock = (a: number, e: number, out = 1.05) => {
      const dir = fwd.clone().multiplyScalar(Math.cos(a) * Math.cos(e)).addScaledVector(right, Math.sin(a) * Math.cos(e));
      return c.clone().addScaledVector(dir, b.sx * out).add(new THREE.Vector3(0, Math.sin(e) * b.sy * out, 0));
    };
    // The straps cross low on the door stone, so the padlock hangs at a
    // child's reach: about 1.4 m over the ground at the doorway. It stays on
    // the door stone (the doorway spans about -0.64..0.24 up, see DOOR_C in
    // shaders.ts), and where the door faces downhill and the ground in front
    // drops away, it climbs until the padlock clears the slope under it.
    const s = tower.scale;
    const want = tower.door.ground.y + 1.4 + 0.55 * s;
    const clear = (e: number) => {
      const p = onRock(0, e, 1.07).addScaledVector(fwd, 0.25 * s), q = onRock(0, e, 1);
      return p.y - 1.1 * s - Math.max(ground(p.x, p.z), ground(q.x, q.z));
    };
    let e0 = Math.asin(THREE.MathUtils.clamp((want - b.y) / (b.sy * 1.05), -0.5, 0.1));
    while (e0 < 0.3 && clear(e0) < 0.4) e0 += 0.02;
    const strap = (pts: THREE.Vector3[]) => {
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.26 * tower.scale, 8), iron);
      m.frustumCulled = false;
      this.straps.push(m);
      this.strapV.push(0);
      this.group.add(m);
    };
    strap(Array.from({ length: 13 }, (_, i) => onRock(-0.95 + (i / 12) * 1.9, e0)));
    strap(Array.from({ length: 13 }, (_, i) => onRock(0, e0 - 0.1 + (i / 12) * 0.95)));
    // The padlock: a squat rusty body, a keyhole, an iron shackle through the straps.
    const at = onRock(0, e0, 1.07);
    this.pos.copy(at);
    const bodyG = new RoundedBoxGeometry(1.25 * s, 1.05 * s, 0.5 * s, 3, 0.18 * s);
    const body = new THREE.Mesh(bodyG, rust);
    body.position.y = -0.55 * s;
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.38 * s, 0.1 * s, 10, 24, Math.PI), iron);
    shackle.position.y = -0.05 * s;
    const key = new THREE.Mesh(new THREE.CircleGeometry(0.1 * s, 16), makeSolidMaterial('#1c1418', 0, { keep: 0.3 }));
    key.position.set(0, -0.48 * s, 0.26 * s);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.07 * s, 0.22 * s), key.material);
    slot.position.set(0, -0.62 * s, 0.26 * s);
    this.padlock.add(body, shackle, key, slot);
    this.padlock.position.copy(at).addScaledVector(fwd, 0.25 * s);
    this.padlock.rotation.y = tower.yaw;
    for (const m of [body, shackle, key, slot]) m.frustumCulled = false;
    this.group.add(this.padlock);
    // Stand-in for the lock's front, where the pick lands.
    this.pos.addScaledVector(fwd, 0.5 * s).setY(this.pos.y - 0.5 * s);
  }

  /** `side`: which way it flies off (1 = to the tower's right): away from the camera. */
  hit(side = 1) {
    this.hits++;
    this.joltV += 5 + this.hits * 2;
    if (this.hits >= LOCK_HP) this.break(side);
  }

  private break(side: number) {
    this.broken = true;
    this.flyT = 0;
    const t = this.tower;
    // Off to one side, clear of you and away from the camera.
    this.flyV.set(Math.sin(t.yaw) * 2 + Math.cos(t.yaw) * side * 6, 8, Math.cos(t.yaw) * 2 - Math.sin(t.yaw) * side * 6);
    this.spin.set(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4);
  }

  /** Returns false once it's gone. */
  update(dt: number, ground: (x: number, z: number) => number): boolean {
    // A heavy pendulum swing on each blow.
    this.joltV += (-this.joltX * 60 - this.joltV * 6) * dt;
    this.joltX += this.joltV * dt;
    this.padlock.rotation.x = this.joltX * 0.25;
    if (this.flyT < 0) return true;
    this.flyT += dt;
    // The padlock tumbles off; the straps slither down the rock and sink away.
    if (this.padlock.visible) {
      this.flyV.y -= 22 * dt;
      this.padlock.position.addScaledVector(this.flyV, dt);
      this.padlock.rotation.x += this.spin.x * dt;
      this.padlock.rotation.z += this.spin.z * dt;
      const g = ground(this.padlock.position.x, this.padlock.position.z) + 0.3;
      if (this.padlock.position.y < g) {
        this.padlock.position.y = g;
        this.flyV.multiplyScalar(0.4);
        this.flyV.y = Math.abs(this.flyV.y) * 0.35;
        this.spin.multiplyScalar(0.5);
      }
    }
    this.straps.forEach((m, i) => {
      this.strapV[i] += 14 * dt;
      m.position.y -= this.strapV[i] * dt * (i === 0 ? 1 : 0.7);
      const k = Math.max(0, 1 - Math.max(0, this.flyT - 0.9) / 0.6);
      m.scale.setScalar(Math.max(0.001, k));
    });
    if (this.flyT > 1.1) {
      const k = Math.max(0.001, 1 - (this.flyT - 1.1) / 0.4);
      this.padlock.scale.setScalar(k);
    }
    return this.flyT < 3.2;
  }
}

/**
 * A tower's spirit, out and about: a tall, skinny glowing ghost (a rounded
 * head over a long body with a softly waving hem, no legs, floating), the
 * towers' tall dark eyes, a quiet smile, and two long stretchy arms that
 * hang down to the ground. It only exists outside the head while it's being
 * freed. `pos` is the bottom of its hem.
 */
class TowerSpirit {
  readonly group = new THREE.Group();
  readonly body = new THREE.Group();
  readonly pos = new THREE.Vector3();
  yaw = 0;
  tilt = 0;
  squash = 1;
  size = 1;
  blink = 1;
  /** 0 = a small smile .. 1 = a big open grin. */
  grin = 0;
  /** The glowing body, with the face painted in (see GHOST_FRAG). Emissive over 0.5 keeps its colour out of the grade. */
  readonly face = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: GHOST_VERT, fragmentShader: GHOST_FRAG, side: THREE.DoubleSide,
    uniforms: { ...U, uIsProp: { value: 1 }, uEmber: { value: new THREE.Color(EMBER) }, uCore: { value: new THREE.Color(CORE) }, uInk: { value: new THREE.Color('#150e13') }, uEmissive: { value: 0.62 }, uBlink: { value: 1 }, uGrin: { value: 0 } },
  });
  /** The arms: the same glow, no face. */
  readonly mat = makeSolidMaterial('#ffae5c', 0.62, { doubleSide: true });

  constructor() {
    // A slim body that swells a touch at the hem, narrows a little at the
    // shoulders and rounds over into the head.
    const prof = [[0.33, 0.0], [0.31, 0.2], [0.29, 0.6], [0.275, 1.0], [0.27, 1.35], [0.275, 1.6], [0.25, 1.78], [0.19, 1.9], [0.1, 1.97], [0.001, 2.0]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, 36);
    // The hem waves: five soft scallops.
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > 0.25) continue;
      const a = Math.atan2(p.getZ(i), p.getX(i));
      p.setY(i, y + (0.25 - y) / 0.25 * 0.06 * Math.sin(a * 5));
    }
    g.computeVertexNormals();
    const shell = new THREE.Mesh(g, this.face);
    this.body.add(shell);
    this.body.traverse((o) => (o.frustumCulled = false));
    this.group.add(this.body);
    this.group.visible = false;
  }

  /** Metres per body unit right now. */
  get s() { return this.size * SPIRIT_SIZE; }
  /** Its height (m). */
  get height() { return GHOST_H * this.s * this.squash; }

  /** Where its shoulders are, in the world (side -1 left, 1 right). */
  shoulder(side: number, out: THREE.Vector3) {
    const s = this.s;
    const c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
    const w = GHOST_R * 0.95 * s / Math.sqrt(this.squash);
    return out.set(this.pos.x + c * side * w, this.pos.y + 1.3 * s * this.squash, this.pos.z - sn * side * w);
  }

  place() {
    const s = this.s;
    this.group.position.copy(this.pos);
    this.body.rotation.set(this.tilt, this.yaw, 0, 'YXZ');
    this.body.scale.set(s / Math.sqrt(this.squash), s * this.squash, s / Math.sqrt(this.squash));
    this.face.uniforms.uBlink.value = this.blink;
    this.face.uniforms.uGrin.value = this.grin;
  }
}

/** Where the climb goes, worked out once when it starts (see planClimb). */
interface ClimbPlan {
  /** Across the face (m, to the tower's right) where it waits, beside the doorway. */
  lat: number;
  /** Where it floats at the foot (hem position). */
  foot: THREE.Vector3;
  /** Its hands' grips, just inside the left eyehole either side. */
  grips: [THREE.Vector3, THREE.Vector3];
  /** The left eyehole: its centre on the head's surface and its outward axis. */
  eye: THREE.Vector3; axis: THREE.Vector3;
  /** The arc it's yanked up along, foot to just out from the eyehole (hem positions, a cubic). */
  path: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
  /** How far out in front of the face (from the tower's centre line) the arms arc. */
  out: number;
}
interface Freeing { tower: Tower; lock: Lock; t: number; spot: THREE.Vector3; lit: boolean; camYaw: number; side: number; plan?: ClimbPlan }
interface Slurp {
  tower: Tower;
  phase: 'reach' | 'pull' | 'rise' | 'view' | 'fly';
  t: number; from: THREE.Vector3; camFrom: THREE.Vector3;
  /** Ember flight: where to, how long it takes (s), the arc's ends, and which way the far head turns to catch you (world yaw). */
  to?: Tower; dur?: number; a?: THREE.Vector3; b?: THREE.Vector3; yaw?: number;
}
/** Something the journey (story/journey.ts) listens for. */
export type BeaconEvent = 'opened' | 'lit' | 'inHead' | 'outHead' | 'arrived';
interface Chunk { mesh: THREE.Mesh; vel: THREE.Vector3; spin: THREE.Vector3; rest: boolean; t: number }

export class Beacons {
  readonly group = new THREE.Group();
  private towers: Tower[] = [];
  private lit = new Set<number>();
  private state = new Map<number, HeadState>();
  private stoneMat = makePropMaterial({ toneVar: 0.2 });
  private homeMat = makePropMaterial({ toneVar: 0.2 });
  /** Tower bodies: [variant] near and far, granite and the home tower's sandstone. */
  private bodyNear: BoulderBatch[];
  private bodyFar: BoulderBatch[];
  private homeNear: BoulderBatch[];
  private homeFar: BoulderBatch[];
  private headMat: THREE.ShaderMaterial;
  private headNear: HeadBatch;
  private headFar: HeadBatch;
  /** Door boulders: the same shader, both sides (their inside is a room). */
  private doorMat: THREE.ShaderMaterial;
  private doorNear: HeadBatch;
  private doorFar: HeadBatch;
  private arms: [Arm, Arm];
  private spirit = new TowerSpirit();
  private sparks = new Puffs('#ffe7a0', 60, 0.8, 0.9);
  private dust = new Puffs('#e6d6bd', 40, 0, 0.5);
  /** The arms' glow, gone in a puff as the spirit pops into the head. */
  private wisps = new Puffs('#ffae5c', 56, 0.62, 0.9);
  private rubble: Chunk[] = [];
  private chunkGeo = buildBoulder(41, 1);
  private lock: Lock | null = null;
  private free: Freeing | null = null;
  private slurp: Slurp | null = null;
  private swingT = -1;
  private swingCd = 0;
  /** The doorway you were just put out of: no slurp until you step away. */
  private disarmed = -1;
  private time = 0;
  private refreshT = 0;
  /** Looking out from a head: yaw / pitch of the view. */
  private viewYaw = 0;
  private viewPitch = 0;
  private near: Tower | null = null;
  /** Every tower's rock as solid shapes (see towerRock.ts). */
  private rocks: TowerRocks;
  /** The explorer's feet at the end of the last frame (a landing checks where they came from). */
  private lastFeet = new THREE.Vector3(0, -Infinity, 0);
  /** How far out the camera is let go along its line (eases back out after rock pulls it in). */
  private camK = 1;
  private camPos = new THREE.Vector3();
  private camAt = new THREE.Vector3();

  constructor(private d: BeaconDeps) {
    const homeKinds = KIND_COLORS.map((c) => c.clone());
    homeKinds[2] = new THREE.Color(HOME_STONE);
    this.homeMat.uniforms.uKind = { value: homeKinds };
    // Three boulder shapes, so no two towers are the same stack of pebbles.
    const seeds = [7, 19, 33];
    const shapes = seeds.map((sd) => buildBoulder(sd, 3));
    this.bodyNear = shapes.map((g) => new BoulderBatch(g, this.stoneMat, 200));
    this.bodyFar = seeds.map((sd) => new BoulderBatch(buildBoulder(sd, 1), this.stoneMat, 700));
    this.homeNear = seeds.map((sd) => new BoulderBatch(buildBoulder(sd, 3), this.homeMat, 12));
    this.homeFar = seeds.map((sd) => new BoulderBatch(buildBoulder(sd, 1), this.homeMat, 12));
    this.headMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: HEAD_VERT, fragmentShader: HEAD_FRAG,
      uniforms: {
        ...U, uIsProp: { value: 1 },
        uStone: { value: KIND_COLORS[2] }, uHomeStone: { value: new THREE.Color(HOME_STONE) },
        uEmber: { value: new THREE.Color('#ff9a45') }, uCore: { value: new THREE.Color('#ffcf73') }, uHollow: { value: new THREE.Color('#150e13') },
      },
    });
    const head = buildHead(4);
    this.rocks = new TowerRocks(shapes.map(rockShape), rockShape(head));
    this.headNear = new HeadBatch(head, this.headMat, 60);
    this.headFar = new HeadBatch(buildHead(2), this.headMat, 200);
    this.doorMat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: HEAD_VERT, fragmentShader: HEAD_FRAG, uniforms: this.headMat.uniforms, side: THREE.DoubleSide });
    this.doorNear = new HeadBatch(buildHead(4), this.doorMat, 60);
    this.doorFar = new HeadBatch(buildHead(2), this.doorMat, 200);
    this.arms = [new Arm(this.spirit.mat), new Arm(this.spirit.mat)];
    this.view = new TowerView([...seeds.map((sd) => buildBoulder(sd, 1)), buildHead(2)]);
    d.overlay.add(this.view.group);
    this.ember = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), makeSolidMaterial('#ffb35c', 0.8));
    this.ember.visible = false;
    this.ember.frustumCulled = false;
    this.group.add(...[...this.bodyNear, ...this.bodyFar, ...this.homeNear, ...this.homeFar].map((b) => b.mesh), this.headNear.mesh, this.headFar.mesh, this.doorNear.mesh, this.doorFar.mesh,
      this.arms[0].group, this.arms[1].group, this.spirit.group, this.ember, this.sparks.group, this.dust.group, this.wisps.group);
    this.setGen(d.gen, d.saveKey);
  }

  /** A new world (seed). */
  setGen(gen: WorldGen, saveKey: string) {
    this.d.gen = gen;
    this.d.saveKey = saveKey;
    this.towers = gen.towers.towers;
    this.rocks.clear();
    this.state.clear();
    for (const t of this.towers) this.state.set(t.id, { lit: 0, home: t.home ? 1 : 0, tilt: 0, look: 0, hl: 0, bob: 0, litT: 99 });
    this.lit.clear();
    this.dropLock();
    this.free = null;
    if (this.slurp) { this.d.hidePlayer(false); this.slurp = null; }
    for (const c of this.rubble) this.group.remove(c.mesh);
    this.rubble = [];
    this.spirit.group.visible = false;
    this.load();
    for (const id of this.lit) this.state.get(id)!.lit = 1;
    this.refreshT = 0;
  }

  /** Something's happening that the explorer should just watch (input off). */
  get busy() { return !!this.free || !!this.slurp; }
  /** You're the head of this tower (or on your way in or out). */
  get inside(): Tower | null { return this.slurp?.tower ?? null; }
  /** Settled in a tower's head, looking out (not on the way up, down or across). */
  get onTop(): boolean { return this.slurp?.phase === 'view'; }
  isLit(id: number) { return this.lit.has(id); }
  tower(id: number) { return this.towers[id]; }

  // ------------------------------------------------------------ actions

  /** Kept in the head: no coming down and no flying on (the first time up, until the giant has been and gone). */
  holdIn = false;

  /** Where the view out of the head you're in sits when it looks toward a world point (null if you're not in one). */
  eyeToward(x: number, z: number): THREE.Vector3 | null {
    const t = this.inside;
    return t ? this.eyeAt(t, Math.atan2(x - t.head.x, z - t.head.z)) : null;
  }

  /** What the one action would do right now: smash a lock, fly to the tower you're aimed at, or leave the head. */
  action(mode: string): 'pick' | 'down' | 'ember' | null {
    if (this.slurp && this.holdIn) return null;
    if (this.slurp) return this.slurp.phase === 'view' ? (this.aim ? 'ember' : 'down') : null;
    if (this.free || mode !== 'walk' || !this.lock || this.lock.broken) return null;
    if (!this.d.canSmash()) return null;
    const b = this.d.body, p = this.lock.pos;
    // Up to 7.5 m up: on a steep drop the lock sits well above the slope below the door.
    return Math.hypot(b.pos.x - p.x, b.pos.z - p.z) < LOCK_REACH && b.pos.y + 1 - p.y < 4 && p.y - b.pos.y - 1 < 7.5 ? 'pick' : null;
  }

  /** The action press. Returns true if it was used. */
  act(mode: string): boolean {
    const a = this.action(mode);
    if (a === 'down') { this.leave(); return true; }
    if (a === 'ember' && this.aim) { this.travel(this.aim); return true; }
    if (a === 'pick') { this.swing(); return true; }
    return false;
  }

  /** Esc while you're the head: out you go. */
  escape(): boolean {
    if (this.slurp?.phase !== 'view' || this.holdIn) return false;
    this.leave();
    return true;
  }

  /** Mouse / touch look while you're the head. */
  look(dx: number, dy: number) {
    // Looking round yourself takes over from a guided turn.
    if (Math.abs(dx) + Math.abs(dy) > 3) this.guideT = 0;
    this.viewYaw -= dx * 0.0022;
    this.viewPitch = THREE.MathUtils.clamp(this.viewPitch - dy * 0.0022, -0.9, 0.7);
  }

  /** Debug: light towers instantly ('all', 'none' or an id), with no ceremony. */
  debugSet(id: number | 'all' | 'none') {
    if (id === 'none') { this.lit.clear(); for (const s of this.state.values()) { s.lit = 0; s.litT = 99; } }
    else for (const t of id === 'all' ? this.towers : [this.towers[id]].filter(Boolean)) { this.lit.add(t.id); this.state.get(t.id)!.lit = 1; }
    this.dropLock();
    this.save();
  }

  /** Light or unlight one tower at once (the journey's dev jumps), with no ceremony. */
  setLit(id: number, on: boolean) {
    const s = this.state.get(id);
    if (!s) return;
    if (on) this.lit.add(id); else this.lit.delete(id);
    s.lit = on ? 1 : 0;
    s.litT = 99;
    this.dropLock();
    this.save();
  }

  /** Turn the view out of the head round to tower `id` (the journey showing you where next). */
  /** You're a tower's head: turn its view toward a world point. */
  lookToward(x: number, z: number, y?: number) {
    const t = this.inside;
    if (!t) return;
    this.viewYaw = Math.atan2(x - t.head.x, z - t.head.z);
    if (y !== undefined) this.viewPitch = THREE.MathUtils.clamp(Math.atan2(y - t.head.y, Math.hypot(x - t.head.x, z - t.head.z)), -0.9, 0.7);
  }

  guide(id: number) {
    this.guideId = id;
    this.guideT = 2.4;
  }
  private guideId = -1;
  private guideT = 0;

  /** Debug: be tower `id`'s head right away (it's lit if it wasn't), looking out of its face. */
  debugEnter(id: number) {
    const t = this.towers[id];
    if (!t) return;
    if (!this.lit.has(t.id)) this.debugSet(t.id);
    const g = t.door.ground;
    this.d.body.pos.set(g.x, g.y, g.z);
    this.d.setMode('carried');
    this.d.hidePlayer(true);
    this.slurp = { tower: t, phase: 'view', t: 0, from: this.d.body.pos.clone(), camFrom: new THREE.Vector3() };
    this.viewYaw = t.yaw;
    this.viewPitch = -0.08;
  }

  /** Debug: turn the head view toward tower `id`. */
  debugLookAt(id: number) {
    const s = this.slurp, t = this.towers[id];
    if (!s || !t) return;
    const e = this.eyeAt(s.tower, this.viewYaw);
    this.viewYaw = Math.atan2(t.head.x - e.x, t.head.z - e.z);
    this.viewPitch = Math.atan2(t.head.y - e.y, Math.hypot(t.head.x - e.x, t.head.z - e.z));
  }

  /** Debug: open the nearest sealed tower's lock at once (the spirit sequence plays). */
  debugBreak() {
    if (!this.lock) return;
    while (!this.lock.broken) this.lock.hit(-this.freeSide());
    this.opened(this.lock);
  }

  // ------------------------------------------------------------ cameras

  /**
   * The camera while a spirit is freed (null otherwise): first more face on
   * to the door stone as it cracks and bursts (a jolt), holding on the dark
   * doorway as the spirit comes out, then easing round side on to you and
   * the spirit with the doorway behind, then, as it turns to climb, a smooth
   * pull back and round to the whole tower from the front, so the climb and
   * the eyes lighting are seen face on. Always from the face side, well out
   * from the rock.
   */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3 } | null {
    const f = this.free;
    if (!f) return null;
    const t = f.tower, sp = this.spirit, b = this.d.body.pos;
    const u = f.t;
    const dir = (yaw: number, pitch: number) => new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    // From the door (and you in front of it) over to you and the spirit, as it comes out.
    const k0 = THREE.MathUtils.smootherstep(u, T_EMERGE + 0.6, T_LOOK);
    const doorAt = new THREE.Vector3(b.x, b.y + 1.4, b.z).lerp(new THREE.Vector3(t.door.x, t.door.y - 0.5, t.door.z), 0.5);
    const pair = new THREE.Vector3((sp.pos.x + b.x) / 2, Math.max(sp.pos.y + sp.height * 0.5, b.y + 1.2), (sp.pos.z + b.z) / 2);
    if (u < T_EMERGE) pair.copy(doorAt); else pair.lerp(doorAt, 1 - k0);
    const h = t.head;
    const tall = h.y + h.sy - t.door.ground.y;
    const mid = new THREE.Vector3(h.x, t.door.ground.y + tall * 0.52, h.z);
    const yawB = t.yaw + f.side * 0.4;
    const distB = tall * 1.2 + 16;
    const k = THREE.MathUtils.smootherstep(u, T_TURN + 0.5, T_REACH + 1.2);
    const at = pair.clone().lerp(mid, k);
    const yawA = THREE.MathUtils.lerp(t.yaw + f.side * 0.55, f.camYaw, k0);
    const yaw = THREE.MathUtils.lerp(yawA, yawB, k);
    const pitch = THREE.MathUtils.lerp(0.14, 0.05, k);
    // The distance leads the focus, so the camera backs away before the
    // focus moves in over the rock.
    let dist = THREE.MathUtils.lerp(THREE.MathUtils.lerp(15, 12, k0), distB, Math.pow(k, 0.55));
    // As it nears the top, closer in on the head for the slip into the eye.
    const top = T_REACH + ARMS_UP + ARMS_HOLD;
    const k2 = THREE.MathUtils.smootherstep(u, top + PULL * 0.3, top + PULL + INTO * 0.5);
    if (f.plan && k2 > 0) {
      at.lerp(f.plan.eye.clone().setY(f.plan.eye.y - 3), k2 * 0.7);
      dist *= 1 - 0.4 * k2;
    }
    const pos = at.clone().addScaledVector(dir(yaw, pitch), dist);
    // A tremble as the cracks run, and a jolt as the door bursts.
    const q = u < T_BURST ? 0.05 * (u / T_BURST) : 0.35 * Math.exp(-(u - T_BURST) * 5);
    if (q > 0.002) {
      const sh = new THREE.Vector3(Math.sin(u * 47), Math.sin(u * 59 + 1) * 0.7, Math.sin(u * 41 + 2)).multiplyScalar(q);
      pos.add(sh);
      at.add(sh);
    }
    return { pos, at };
  }

  /** While you're the head (or rising into it / dropping out), where the camera is and looks. */
  viewCam(): { pos: THREE.Vector3; at: THREE.Vector3; fov: number } | null {
    const s = this.slurp;
    if (!s || (s.phase !== 'rise' && s.phase !== 'view' && s.phase !== 'fly')) return null;
    // Aimed at a tower, the view leans in on it a little: that's somewhere you can go.
    const fov = VIEW_FOV - AIM_ZOOM * THREE.MathUtils.smoothstep(this.zoomK, 0, 1);
    if (s.phase === 'fly') return { ...this.flyCam(s), fov };
    const t = s.tower, h = t.head;
    // You are the head: it turns all the way round with your look, and the
    // eye rides round with it, just in front of the face.
    const dir = new THREE.Vector3(Math.sin(this.viewYaw), 0, Math.cos(this.viewYaw));
    const eye = new THREE.Vector3(h.x, h.y + h.sy * 0.14, h.z).addScaledVector(dir, h.sx * 1.12);
    const look = new THREE.Vector3(Math.sin(this.viewYaw) * Math.cos(this.viewPitch), Math.sin(this.viewPitch), Math.cos(this.viewYaw) * Math.cos(this.viewPitch));
    // In: from wherever the camera was, a fast rise up the front of the
    // tower into the eyes. Out: back down to look in at the doorway.
    const fwd = new THREE.Vector3(Math.sin(t.yaw), 0, Math.cos(t.yaw));
    const doorView = new THREE.Vector3(t.door.ground.x, t.door.ground.y + 2.2, t.door.ground.z).addScaledVector(fwd, 9);
    const from = s.phase === 'rise' ? s.camFrom : doorView;
    let k = 1;
    if (s.phase === 'rise') k = THREE.MathUtils.smootherstep(s.t / IN_RISE, 0, 1);
    this.camPos.lerpVectors(from, eye, k);
    // Out in front of the tower on the way, never through it.
    this.camPos.addScaledVector(fwd, Math.sin(k * Math.PI) * 14);
    this.camPos.y = THREE.MathUtils.lerp(from.y, eye.y, Math.pow(k, 0.7));
    const doorLook = new THREE.Vector3(t.door.x, t.door.y, t.door.z);
    this.camAt.lerpVectors(doorLook, eye.clone().add(look.multiplyScalar(10)), k);
    return { pos: this.camPos, at: this.camAt, fov };
  }

  // ------------------------------------------------------------ frame

  update(dt: number, cam: THREE.PerspectiveCamera, mode: string, grounded: boolean, held: boolean) {
    this.time += dt;
    const b = this.d.body;
    let near: Tower | null = null, nearD = Infinity;
    for (const t of this.towers) {
      const dd = Math.hypot(b.pos.x - t.x, b.pos.z - t.z);
      if (dd < nearD) { nearD = dd; near = t; }
    }
    this.near = near;

    // The lock props exist for the nearest sealed tower only.
    if (near && !this.lit.has(near.id) && nearD < 160 && !this.free) {
      if (this.lock?.tower !== near) { this.dropLock(); this.lock = new Lock(near, (x, z) => this.d.gen.height(x, z)); this.group.add(this.lock.group); }
    } else if (this.lock && !this.free && (!near || this.lock.tower !== near || nearD > 180)) this.dropLock();

    this.updateSwing(dt, mode, held);
    if (this.lock && this.lock.broken && !this.free) this.dropLock();
    if (this.free) this.updateFreeing(dt);
    else if (this.lock && !this.lock.update(dt, (x, z) => this.d.gen.height(x, z))) this.dropLock();
    this.updateSlurp(dt, mode, grounded);
    this.updateRubble(dt);
    this.updateHeads(dt);
    this.draw(cam);
    this.drawView(cam, dt);
    this.sparks.update(dt);
    this.dust.update(dt);
    this.wisps.update(dt);
    this.lastFeet.copy(b.pos);
  }

  private dropLock() {
    if (!this.lock) return;
    this.group.remove(this.lock.group);
    this.lock = null;
  }

  // ------------------------------------------------------------ the lock

  private swing() {
    if (this.swingT >= 0 || this.swingCd > 0) return;
    this.swingT = 0;
    this.swingCd = SWING;
    this.d.showPick();
    this.d.rig.chop();
  }

  private updateSwing(dt: number, mode: string, held: boolean) {
    this.swingCd -= dt;
    const b = this.d.body;
    if (this.action(mode) === 'pick' && held) this.swing();
    if (this.swingT < 0 || !this.lock) { this.swingT = -1; return; }
    this.swingT += dt;
    this.d.showPick();
    // Square up to the lock.
    const p = this.lock.pos;
    const want = Math.atan2(p.x - b.pos.x, p.z - b.pos.z);
    let dh = want - b.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    b.heading += dh * (1 - Math.exp(-14 * dt));
    // Step in (through the walk mode, so it animates and collides) until
    // the lock is in arm's length.
    const gap = Math.hypot(p.x - b.pos.x, p.z - b.pos.z) - LOCK_STAND;
    if (gap > 0.05 && this.swingT < HIT_AT) {
      const dl = Math.hypot(p.x - b.pos.x, p.z - b.pos.z) || 1;
      const sp = Math.min(6, gap * 10);
      b.vel.x = ((p.x - b.pos.x) / dl) * sp;
      b.vel.z = ((p.z - b.pos.z) / dl) * sp;
    }
    if (this.swingT >= HIT_AT && this.swingT - dt < HIT_AT && !this.lock.broken) {
      this.lock.hit(-this.freeSide());
      this.d.sfx.smash();
      this.sparks.emit(p, 6, 0.08, 3, undefined, { life: 0.45, rise: -6, drag: 1.5, up: 2.5 });
      if (this.lock.broken) this.opened(this.lock);
    }
    if (this.swingT > SWING - 0.05) this.swingT = -1;
  }

  /** The lock's off: the door stone gives way and the spirit comes out. */
  private opened(lock: Lock) {
    const t = lock.tower;
    const b = this.d.body;
    const fwd = new THREE.Vector3(Math.sin(t.yaw), 0, Math.cos(t.yaw));
    // It'll pop out and land between the door and you.
    // The camera watches from off to one side of the doorway; the spirit
    // lands beside you, side by side in that shot.
    const side = this.freeSide();
    const camYaw = t.yaw + side * 0.95;
    const perp = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const spot = b.pos.clone().addScaledVector(perp, -side * 3.4).addScaledVector(fwd, 1.5);
    spot.y = this.d.gen.height(spot.x, spot.z);
    // Keep the landing spot off the rock.
    for (let i = 0; i < 30 && this.solidAt(spot.clone().setY(spot.y + 1)); i++) spot.addScaledVector(fwd, 0.5);
    spot.y = this.floorUnder(spot.x, spot.z, spot.y + 2);
    this.free = { tower: t, lock, t: 0, spot, lit: false, camYaw, side };
    this.onEvent?.('opened', t);
    this.lit.add(t.id); // saved now: it's open and its spirit is out
    this.save();
    // The door stone holds a moment longer (see burst).
    this.d.sfx.thud();
  }

  /** The door stone gives way: it bursts out in chunks and a cloud of dust, leaving the dark doorway. */
  private burst(t: Tower) {
    const fwd = new THREE.Vector3(Math.sin(t.yaw), 0, Math.cos(t.yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const door = new THREE.Vector3(t.door.x, t.door.y, t.door.z);
    const bo = t.boulders[1];
    // The doorway's half size (m), from DOOR_SIZE in HEAD_FRAG.
    const hw = 0.3 * bo.sx, hh = 0.44 * bo.sy;
    this.d.sfx.thud();
    this.d.sfx.smash();
    for (let i = 0; i < 6; i++) {
      const p = door.clone().addScaledVector(right, (Math.random() - 0.5) * hw * 1.8).add(new THREE.Vector3(0, -hh * (0.3 + Math.random() * 0.6), 0)).addScaledVector(fwd, 1);
      this.dust.emit(p, 2, 0.4 + Math.random() * 0.2, 2.5 + Math.random() * 1.5);
    }
    this.sparks.emit(door.clone().addScaledVector(fwd, -1), 10, 0.1, 4);
    // Chunks of the door stone, from all over the doorway, thrown out and
    // off to either side of it (not straight at you).
    for (let i = 0; i < 11; i++) {
      const sd = i % 2 ? 1 : -1;
      const sc = (0.3 + Math.random() * 0.4) * t.scale;
      const mesh = propMesh(this.chunkGeo, this.stoneMat, { sc, rot: Math.random() * 6, sy: 0.7, tone: 0.4 + Math.random() * 0.2 });
      mesh.frustumCulled = false;
      mesh.position.copy(door).addScaledVector(right, sd * Math.random() * hw * 0.9).add(new THREE.Vector3(0, (Math.random() - 0.5) * hh * 1.4, 0)).addScaledVector(fwd, 0.4);
      const v = fwd.clone().multiplyScalar(3 + Math.random() * 3).addScaledVector(right, sd * (3.5 + Math.random() * 4)).add(new THREE.Vector3(0, 2 + Math.random() * 4, 0));
      this.rubble.push({ mesh, vel: v, spin: new THREE.Vector3(Math.random() * 8 - 4, 0, Math.random() * 8 - 4), rest: false, t: 0 });
      this.group.add(mesh);
    }
  }

  /** Which side of the doorway the freeing's camera watches from (fixed per tower, so the lock flies the other way). */
  private freeSide() { return this.lock && this.lock.tower.id % 2 ? 1 : -1; }

  private updateRubble(dt: number) {
    this.rubble = this.rubble.filter((c) => { if (c.t > 9) { this.group.remove(c.mesh); return false; } return true; });
    for (const c of this.rubble) {
      c.t += dt;
      // Settle, then sink away into the grass.
      if (c.t > 6) c.mesh.position.y -= dt * 0.6;
      if (c.rest) continue;
      c.vel.y -= 20 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += c.spin.x * dt;
      c.mesh.rotation.z += c.spin.z * dt;
      const g = this.d.gen.height(c.mesh.position.x, c.mesh.position.z) - 0.2;
      if (c.mesh.position.y < g) {
        c.mesh.position.y = g;
        c.vel.multiplyScalar(0.35);
        c.vel.y = Math.abs(c.vel.y) * 0.4;
        c.spin.multiplyScalar(0.4);
        if (c.vel.length() < 0.8) c.rest = true;
      }
    }
  }

  // ------------------------------------------------------------ freeing the spirit

  /** The floor under a point: the ground or an open rock top, whichever is higher (below `fromY`). */
  private floorUnder(x: number, z: number, fromY: number): number {
    return Math.max(this.d.gen.height(x, z), this.surface(x, z, fromY));
  }

  /**
   * How far out along the tower's face (from its centre line, `lat` m to its
   * right) the rock reaches at height y. -Infinity if there's none.
   */
  private faceAt(t: Tower, y: number, lat: number): number {
    const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
    const bx = t.x + fz * lat, bz = t.z - fx * lat;
    const p = this.tmpP;
    let d = 45;
    for (; d > -30; d -= 0.6) if (this.solidAt(p.set(bx + fx * d, y, bz + fz * d))) break;
    if (d <= -30) return -Infinity;
    let a = d, b = d + 0.6;
    for (let i = 0; i < 6; i++) {
      const m = (a + b) / 2;
      if (this.solidAt(p.set(bx + fx * m, y, bz + fz * m))) a = m; else b = m;
    }
    return b;
  }
  private tmpP = new THREE.Vector3();

  /** The furthest the rock reaches out over a body spanning heights y0..y1 and lat ± halfW. */
  private faceClear(t: Tower, y0: number, y1: number, lat: number, halfW: number): number {
    let out = -Infinity;
    for (let y = y0; y <= y1 + 1e-3; y += Math.max(0.4, (y1 - y0) / 7)) for (const l of [-halfW, 0, halfW]) out = Math.max(out, this.faceAt(t, y, lat + l));
    return out;
  }

  /** A point out from the face: `d` along the face direction, `lat` across, at height y. */
  private facePoint(t: Tower, d: number, lat: number, y: number, out = new THREE.Vector3()) {
    const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
    return out.set(t.x + fz * lat + fx * d, y, t.z - fx * lat + fz * d);
  }

  /**
   * Work out the way up once: it waits beside the doorway; its arms arc out
   * round the stack (well clear of every boulder) to the left eyehole; it's
   * yanked up along an arc just as clear, and slips in.
   */
  private planClimb(t: Tower, side: number): ClimbPlan {
    const S = SPIRIT_SIZE, bodyH = GHOST_H * S, halfW = GHOST_R * S + 0.15;
    const door = t.boulders[1];
    const lat = side * (0.3 * door.sx + 2.4);
    const g0 = this.floorUnder(this.facePoint(t, door.sx + 4, lat, 0).x, this.facePoint(t, door.sx + 4, lat, 0).z, t.door.ground.y + 6);
    const fd = this.faceClear(t, g0 + HOVER, g0 + HOVER + bodyH, lat, halfW) + halfW + 0.45;
    const foot = this.facePoint(t, fd, lat, 0);
    foot.y = this.floorUnder(foot.x, foot.z, g0 + 3) + HOVER;
    const h = t.head;
    const e = new THREE.Vector3(-0.27, 0.12, 0.955).normalize();
    const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
    const right = new THREE.Vector3(fz, 0, -fx), fwd = new THREE.Vector3(fx, 0, fz), up = new THREE.Vector3(0, 1, 0);
    const eye = new THREE.Vector3(h.x, h.y, h.z).addScaledVector(right, e.x * h.sx).addScaledVector(fwd, e.z * h.sx).addScaledVector(up, e.y * h.sy);
    const axis = right.clone().multiplyScalar(e.x / h.sx).addScaledVector(fwd, e.z / h.sx).addScaledVector(up, e.y / h.sy).normalize();
    // Hooked just inside the eyehole's side rims, low down.
    const hw = 0.125 * h.sx * 0.75;
    const grips: [THREE.Vector3, THREE.Vector3] = [-1, 1].map((sd) => eye.clone().addScaledVector(axis, -0.5).addScaledVector(right, sd * hw).addScaledVector(up, -0.3 * h.sy * 0.5)) as [THREE.Vector3, THREE.Vector3];
    // How far the rock reaches out in front, anywhere between the foot and the eyes.
    const eyeLat = (eye.x - t.x) * fz - (eye.z - t.z) * fx;
    const out = Math.max(this.faceClear(t, foot.y, eye.y + 2, lat, 2), this.faceClear(t, foot.y, eye.y + 2, eyeLat, 2));
    // Just out from the eyehole, its middle level with the eye (it's a touch smaller by then).
    const hc = bodyH * 0.85 * 0.5;
    const mouth = eye.clone().addScaledVector(axis, halfW + 1.0).setY(eye.y - hc);
    const along = (p: THREE.Vector3) => (p.x - t.x) * fx + (p.z - t.z) * fz;
    // The arc up: out in front of all the rock, then in to the eye. Pushed
    // further out until no part of the body would touch rock anywhere on it.
    let path: ClimbPlan['path'] = [foot, foot, mouth, mouth];
    for (let push = 5, tries = 0; tries < 10; tries++, push += 3) {
      // Swinging out across the face as well (away from the camera's side), so the arc reads.
      const c1 = foot.clone().addScaledVector(fwd, Math.max(0, out - along(foot)) + push).addScaledVector(up, (eye.y - foot.y) * 0.4).addScaledVector(right, -Math.sign(lat) * 7);
      const c2 = mouth.clone().addScaledVector(fwd, Math.max(0, out - along(mouth)) * 0.8 + push).addScaledVector(up, 3).addScaledVector(right, -Math.sign(lat) * 4);
      path = [foot, c1, c2, mouth];
      let hit = false;
      const p = new THREE.Vector3();
      for (let i = 1; i < 24 && !hit; i++) {
        bez3(path, i / 24, p);
        for (const dy of [0.3, bodyH * 0.45, bodyH * 0.85]) for (const l of [-halfW, 0, halfW]) if (this.solidAt(this.tmpP.copy(p).addScaledVector(right, l).setY(p.y + dy))) hit = true;
      }
      if (!hit) break;
    }
    return { lat, foot, grips, eye, axis, path, out };
  }

  private updateFreeing(dt: number) {
    const f = this.free!;
    f.t += dt;
    const t = f.tower, sp = this.spirit, b = this.d.body;
    f.lock.update(dt, (x, z) => this.d.gen.height(x, z));
    const fwd = new THREE.Vector3(Math.sin(t.yaw), 0, Math.cos(t.yaw));
    const door = new THREE.Vector3(t.door.x, t.door.y, t.door.z);
    const u = f.t;
    if (u - dt < T_BURST && u >= T_BURST) this.burst(t);
    // A creak or two as the cracks run.
    if (u - dt < T_BURST * 0.45 && u >= T_BURST * 0.45) this.d.sfx.smash();
    if (u - dt < T_BURST * 0.8 && u >= T_BURST * 0.8) this.d.sfx.smash();
    // Watch the door, then the spirit once it's out: the explorer turns to follow.
    const look = u < T_EMERGE + 0.3 ? door : sp.pos;
    const want = Math.atan2(look.x - b.pos.x, look.z - b.pos.z);
    let dh = want - b.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    b.heading += dh * (1 - Math.exp(-5 * dt));
    b.vel.set(0, b.vel.y, 0);
    // Startled back a step as the door bursts (through the walk mode, so it animates and collides).
    if (u > T_BURST && u < T_BURST + 0.3) b.vel.set(fwd.x * 3.2, b.vel.y, fwd.z * 3.2);

    const P = f.plan ??= this.planClimb(t, f.side);
    const reachEnd = T_REACH + ARMS_UP, holdEnd = reachEnd + ARMS_HOLD, pullEnd = holdEnd + PULL, poofAt = holdEnd + PULL * POOF, inEnd = pullEnd + INTO, end = inEnd + AFTER;
    const bob = () => Math.sin(this.time * 2.6) * 0.1;
    const hover = (p: THREE.Vector3) => { p.y = this.floorUnder(p.x, p.z, p.y + 2) + HOVER + bob(); return p; };

    let armUp = 0; // 0 = hanging .. 1 = flung up (happy)
    let reach = 0; // 0 .. 1: the arms' way up to the eyehole
    let pull = 0; // 0 .. 1: along the yank up to the eye
    let climbing = false;
    sp.group.visible = u > T_EMERGE && u < inEnd;
    sp.blink = 1;
    sp.tilt = 0;
    sp.squash = 1;
    sp.size = 1;
    sp.grin = 0;
    const toMe = Math.atan2(b.pos.x - sp.pos.x, b.pos.z - sp.pos.z);
    const toTower = t.yaw + Math.PI;
    const turnTo = (a: number, to: number, k: number) => a + Math.atan2(Math.sin(to - a), Math.cos(to - a)) * k;
    if (u < T_OUT) {
      // Its glow stirs deep in the dark doorway, then it drifts out over
      // the threshold, leaning into it, and curves round to beside you.
      const floor = Math.max(t.door.ground.y, this.d.gen.height(door.x, door.z));
      const p0 = door.clone().addScaledVector(fwd, -3.2).setY(floor + HOVER);
      const p1 = door.clone().addScaledVector(fwd, 2.2).setY(floor + HOVER + 0.3);
      const p2 = hover(f.spot.clone());
      const peek = THREE.MathUtils.smoothstep(u, T_EMERGE, T_EMERGE + 0.5);
      const k = THREE.MathUtils.smootherstep(u, T_EMERGE + 0.45, T_OUT);
      const v = 1 - k;
      sp.pos.set(0, 0, 0).addScaledVector(p0, v * v).addScaledVector(p1, 2 * v * k).addScaledVector(p2, k * k);
      sp.pos.y += Math.sin(k * Math.PI) * 0.5 + bob() * (1 - k);
      sp.size = 0.6 + 0.25 * peek + 0.15 * k;
      // Out the door first, then turning the way it's going.
      const go = Math.atan2(p2.x - p1.x, p2.z - p1.z);
      sp.yaw = turnTo(t.yaw, go, 0.6 * Math.sin(Math.min(1, k * 1.3) * Math.PI));
      sp.tilt = 0.3 * Math.sin(k * Math.PI);
      sp.squash = 1 + 0.12 * Math.sin(k * Math.PI);
      // A slow blink as it wakes in the dark.
      sp.blink = u > T_EMERGE + 0.25 && u < T_EMERGE + 0.4 ? 0 : 1;
      if (u - dt < T_EMERGE + 0.45 && u >= T_EMERGE + 0.45) this.d.sfx.chirp();
    } else if (u < T_LOOK) {
      // Settles beside you.
      const k = (u - T_OUT) / (T_LOOK - T_OUT);
      hover(sp.pos.copy(f.spot));
      sp.squash = 1 - 0.1 * Math.sin(k * Math.PI);
      sp.yaw = t.yaw;
    } else if (u < T_HAPPY) {
      // Looks about, finds you. A slow blink.
      const k = (u - T_LOOK) / (T_HAPPY - T_LOOK);
      hover(sp.pos.copy(f.spot));
      sp.yaw = THREE.MathUtils.lerp(t.yaw + Math.sin(k * 7) * 0.6 * (1 - k), turnTo(t.yaw, toMe, 1), THREE.MathUtils.smoothstep(k, 0.4, 1));
      sp.blink = Math.abs(k - 0.45) < 0.05 ? 0 : 1;
      sp.grin = THREE.MathUtils.smoothstep(k, 0.6, 1);
    } else if (u < T_TURN) {
      // Happy: two bouncy floats with its arms flung up, a little wiggle.
      const k = (u - T_HAPPY) / (T_TURN - T_HAPPY);
      const hop = Math.abs(Math.sin(k * Math.PI * 2));
      hover(sp.pos.copy(f.spot));
      sp.pos.y += hop * 0.8;
      sp.squash = 1 + (hop - 0.5) * 0.12;
      // Toward you and the camera both, so its face shows.
      let dc = f.camYaw - toMe;
      dc = Math.atan2(Math.sin(dc), Math.cos(dc));
      sp.yaw = toMe + dc * 0.6 + Math.sin(u * 9) * 0.12;
      sp.grin = 1;
      armUp = THREE.MathUtils.smoothstep(k, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(k, 0.82, 1));
      if (u - dt < T_HAPPY) this.d.sfx.chirp(true);
      if (u - dt < T_HAPPY + 0.95 && u >= T_HAPPY + 0.95) this.d.sfx.chirp(true);
      if (Math.random() < dt * 10) this.sparks.emit(sp.pos.clone().setY(sp.pos.y + sp.height), 1, 0.06, 1.2);
    } else if (u < T_REACH) {
      // Floats round to the foot of the climb, beside the doorway, turning to
      // the tower, and looks all the way up.
      const k = (u - T_TURN) / (T_REACH - T_TURN);
      sp.pos.lerpVectors(f.spot, P.foot, THREE.MathUtils.smootherstep(k, 0, 0.75));
      hover(sp.pos);
      sp.yaw = turnTo(toMe, toTower, THREE.MathUtils.smoothstep(k, 0.1, 0.6));
      sp.tilt = -0.35 * THREE.MathUtils.smoothstep(k, 0.5, 0.9);
      sp.grin = 1 - k;
    } else if (u < pullEnd) {
      // Both long arms shoot up, arcing out round the rock, and hook into
      // the eyehole; a tug; then they yank it up and round to the eye.
      climbing = true;
      sp.yaw = toTower;
      if (u < reachEnd) {
        const k = (u - T_REACH) / ARMS_UP;
        reach = 1 - Math.pow(1 - k, 3);
        sp.pos.copy(P.foot).setY(P.foot.y + bob() * (1 - k));
        sp.tilt = -0.45;
        sp.squash = 1 - 0.14 * Math.sin(k * Math.PI);
        if (u - dt < T_REACH) this.d.sfx.whoosh();
      } else if (u < holdEnd) {
        const k = (u - reachEnd) / ARMS_HOLD;
        reach = 1;
        sp.pos.copy(P.foot).setY(P.foot.y + 0.25 * Math.sin(k * Math.PI));
        sp.tilt = -0.45;
        sp.squash = 1 - 0.2 * Math.sin(k * Math.PI);
        if (u - dt < reachEnd) { this.d.sfx.thud(); for (const g of P.grips) this.sparks.emit(g, 4, 0.07, 1.4); }
      } else {
        const k = (u - holdEnd) / PULL;
        // Slow to start, then the stretchy arms snap it up, still quick as it
        // reaches the eye (only a short ease at the very end).
        const e = 1 - Math.pow(1 - Math.pow(k, 1.8), 1.5);
        reach = 1;
        pull = e;
        bez3(P.path, e, sp.pos);
        sp.size = 1 - 0.15 * e;
        sp.squash = 1 + 0.3 * Math.sin(e * Math.PI);
        sp.tilt = -0.45 + 0.2 * e;
        if (u - dt < holdEnd) this.d.sfx.whoosh();
        if (u - dt < poofAt && u >= poofAt) this.poofArms();
        if (Math.random() < dt * 20) this.sparks.emit(sp.pos.clone().setY(sp.pos.y + sp.height * 0.5), 1, 0.06, 0.5);
      }
    } else if (u < inEnd) {
      // Pops straight in, shrinking, into the hollow; the arms went in a puff.
      if (u - dt < poofAt) this.poofArms();
      const k = Math.pow((u - pullEnd) / INTO, 1.6);
      sp.size = 0.85 - 0.5 * k;
      sp.squash = 1 + 0.25 * Math.sin(k * Math.PI);
      const hc = GHOST_H * SPIRIT_SIZE * sp.size * 0.5;
      const e0 = P.path[3].clone().setY(P.eye.y);
      sp.pos.lerpVectors(e0, P.eye.clone().addScaledVector(P.axis, -2.6), k);
      sp.pos.y -= hc;
      sp.yaw = toTower;
      sp.tilt = 0.25 * k;
      reach = 1;
      pull = 1;
    } else if (!f.lit) {
      // The head blazes on.
      f.lit = true;
      this.onEvent?.('lit', t);
      const s = this.state.get(t.id)!;
      s.litT = 0;
      const h = t.head;
      this.sparks.emit(new THREE.Vector3(h.x, h.y, h.z).addScaledVector(fwd, h.sx), 24, 0.25, 7);
      this.d.sfx.whoosh();
      this.d.sfx.chirp(true);
    }
    // On the ground it never floats through you: it keeps a step away.
    if (u < T_REACH && sp.group.visible) {
      const dx = sp.pos.x - b.pos.x, dz = sp.pos.z - b.pos.z;
      const dd = Math.hypot(dx, dz);
      const min = GHOST_R * sp.s + 0.9;
      if (dd < min && sp.pos.y < b.pos.y + 1.8) {
        const k = min / Math.max(dd, 1e-3);
        sp.pos.x = b.pos.x + (dd > 1e-3 ? dx : 1) * k;
        sp.pos.z = b.pos.z + (dd > 1e-3 ? dz : 0) * k;
      }
    }
    sp.place();
    if (sp.group.visible && u < poofAt) this.poseArms(t, fwd, armUp, climbing ? reach : 0, pull, P);
    else if (!this.slurp) this.arms[0].group.visible = this.arms[1].group.visible = false;
    if (u >= end) {
      this.free = null;
      // No disarm here: you're outside the room at the lock, and walking
      // straight in (as the hearth spirit shows you) should just work.
      sp.group.visible = false;
      this.arms[0].group.visible = this.arms[1].group.visible = false;
      this.dropLock();
    }
  }

  /** The arms burst into glowing wisps all along their length (and are gone). */
  private poofArms() {
    const s = this.spirit.s;
    for (const arm of this.arms) {
      if (!arm.group.visible) continue;
      const line = arm.line;
      for (let i = 2; i < line.length; i += 3) this.wisps.emit(line[i], 2, 0.2 * s, 1.1, undefined, { life: 0.4, rise: 0.4, drag: 5, up: 0.5 });
      this.sparks.emit(arm.hand.position, 3, 0.07, 1.6);
      arm.group.visible = false;
    }
    this.d.sfx.chirp();
  }

  /**
   * The spirit's arms: hanging to the floor under it (never longer than an
   * arm), flung up for joy, or stretched up the tower to its grips. Nothing
   * passes through rock: on the climb the arm runs up the face just clear of
   * it, and any point of it that would be in rock is moved back out.
   */
  private poseArms(t: Tower, fwd: THREE.Vector3, armUp: number, reach: number, pull: number, P: ClimbPlan) {
    const sp = this.spirit;
    const s = sp.s;
    const up = new THREE.Vector3(0, 1, 0);
    const upOut = fwd.clone().add(up).normalize();
    const tmp = new THREE.Vector3();
    // Any point of an arm in (or brushing) rock goes back out: out and up
    // high on the stack, straight out lower down.
    const clear = (p: THREE.Vector3) => {
      const o = p.y > t.slab.y ? upOut : fwd;
      for (let i = 0; i < 60 && (this.solidAt(p) || this.solidAt(tmp.copy(p).addScaledVector(o, -0.35))); i++) p.addScaledVector(o, 0.2);
    };
    const along = (p: THREE.Vector3) => (p.x - t.x) * fwd.x + (p.z - t.z) * fwd.z;
    const rightV = new THREE.Vector3(fwd.z, 0, -fwd.x);
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const sh = sp.shoulder(side, new THREE.Vector3());
      const c = Math.cos(sp.yaw), sn = Math.sin(sp.yaw);
      const outward = new THREE.Vector3(c * side, 0, -sn * side);
      const ahead = new THREE.Vector3(Math.sin(sp.yaw), 0, Math.cos(sp.yaw));
      const r0 = 0.085 * s, r1 = 0.065 * s, hr = 0.13 * s;
      if (reach > 0) {
        // Up to the eyehole: a big arc out in front of the stack and back in.
        // It bows less as it's pulled up (the arm is shorter by then).
        const g = P.grips[k];
        const bow = 1 + 6 * (1 - pull);
        // Out and round across the face (away from the camera's side), then in to the eye.
        const swing = (-Math.sign(P.lat) * 10 + side * 2) * (1 - pull);
        const a1 = sh.clone().addScaledVector(fwd, Math.max(0, P.out - along(sh)) * (1 - pull) + bow).addScaledVector(up, (g.y - sh.y) * 0.45).addScaledVector(rightV, swing);
        const a2 = g.clone().addScaledVector(fwd, Math.max(0, P.out - along(g)) * 0.6 * (1 - pull) + bow * 0.7).addScaledVector(up, 2.5 * (1 - pull)).addScaledVector(rightV, swing * 0.6);
        // Shooting out: the arm is the first `reach` of the whole curve.
        const [q0, q1, q2, q3] = subBez(sh, a1, a2, g, reach);
        this.arms[k].set(q0, q1, q2, q3, r0, r1, hr, -side, q3.clone().add(up), clear);
        continue;
      }
      // Hanging: down to just off the floor under it (at most an arm's length), swaying.
      const sway = Math.sin(this.time * 2.2 + k * 1.7) * 0.12 * s;
      const down = sh.clone().addScaledVector(outward, 0.2 * s).addScaledVector(ahead, 0.08 * s + sway);
      down.y = Math.max(this.floorUnder(down.x, down.z, sh.y) + 0.1, sh.y - ARM_HANG * s);
      const joy = sh.clone().addScaledVector(outward, (0.9 + 0.15 * Math.sin(this.time * 11 + k * 2)) * s).add(new THREE.Vector3(0, (1.1 + 0.2 * Math.sin(this.time * 14 + k * 2)) * s, 0));
      const hand = down.lerp(joy, armUp);
      const len = sh.distanceTo(hand);
      const a1 = sh.clone().addScaledVector(outward, Math.min(len * 0.2, 0.5 * s));
      const a2 = hand.clone().addScaledVector(hand.y < sh.y ? outward : ahead, Math.min(len * 0.12, 0.4 * s)).add(new THREE.Vector3(0, hand.y < sh.y ? Math.min(len * 0.15, 0.35 * s) : -Math.min(len * 0.15, 2), 0));
      this.arms[k].set(sh, a1, a2, hand, r0, r1, hr, -side, hand.clone().add(up), clear);
    }
  }

  // ------------------------------------------------------------ in and out of the head

  /**
   * A point in a door boulder's own frame, normalised so its shell is the
   * unit sphere: x right, y up, z out of the doorway.
   */
  private shellQ(t: Tower, x: number, y: number, z: number, out = new THREE.Vector3()) {
    const b = t.boulders[1];
    const c = Math.cos(t.yaw), sn = Math.sin(t.yaw);
    const lx = x - b.x, lz = z - b.z;
    return out.set((lx * c - lz * sn) / b.sx, (y - b.y) / b.sy, (lx * sn + lz * c) / b.sx);
  }

  /** Is this direction (in the shell's frame, unit) inside the doorway, with `margin` to spare? */
  private inDoorway(d: THREE.Vector3, margin: number) {
    if (d.z < 0.4) return false;
    const cz = 0.98 / Math.hypot(0.2, 0.98), cy = -0.2 / Math.hypot(0.2, 0.98);
    // The doorway's own frame (see doorR in HEAD_FRAG): right = x, up = cross(c, right).
    const ux = d.x, uy = d.y * cz - d.z * cy;
    const r = Math.pow(Math.pow(Math.abs(ux) / 0.3, 3) + Math.pow(Math.abs(uy) / 0.44, 3), 1 / 3);
    return r < 1 - margin;
  }

  /** Is the explorer inside this tower's hollow door boulder? */
  private inRoom(t: Tower, x: number, y: number, z: number, deep = 0.95) {
    // Horizontally, as a fraction of the shell's radius (its centre is high above your head).
    const q = this.shellQ(t, x, y + 1.3, z);
    return Math.hypot(q.x, q.z) < deep && q.y > -0.8 && q.y < 0.6;
  }

  /** The tower whose rock is near enough to matter at (x, z), or null. */
  private solidNear(x: number, z: number): Tower | null {
    const t = this.near;
    return t && Math.hypot(x - t.x, z - t.z) < SOLID_R ? t : null;
  }

  /**
   * Is the top of rock `r` over (x, z) (already in SPAN, with its slope)
   * somewhere you can stand? Not too steep, and open to the sky: a top
   * buried inside another boulder is no floor. The hollow door boulder
   * buries nothing (its inside is the room).
   */
  private standable(rs: Rock[], r: Rock, x: number, z: number): boolean {
    if (SPAN.slope > WALK_SLOPE) return false;
    const top = SPAN.top;
    for (const o of rs) {
      if (o === r || o.hollow || !span(o, x, z)) continue;
      // Buried in it, or tucked under it with no headroom.
      if (SPAN.bot < top + BODY_H && top < SPAN.top - 0.05) return false;
    }
    SPAN.top = top;
    return true;
  }

  /**
   * Keep a body out of tower rock. Every boulder and the head is solid to
   * its drawn shape: walls where it's too tall to step onto, floors on its
   * open, walkable top (see `surface`). Coming down from above (a fall, the
   * parachute, a crow, a bike jump, dev flight) you land on whatever top
   * you pass through, however fast. The door boulder is a hollow shell:
   * solid while it's sealed, a room with a doorway once it's open.
   */
  collide(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    if (this.slurp) return;
    const t = this.solidNear(pos.x, pos.z);
    if (!t) return;
    const rs = this.rocks.of(t);
    // Landing: the explorer's feet were over this top last frame and are
    // under it now. (Other bodies aren't tracked frame to frame.)
    const me = Math.hypot(pos.x - this.lastFeet.x, pos.z - this.lastFeet.z) < 6;
    const prevY = me ? this.lastFeet.y : pos.y;
    let land = -Infinity;
    for (const rk of rs) {
      if (!span(rk, pos.x, pos.z, true)) continue;
      const top = SPAN.top;
      if (pos.y < top && prevY >= top - STEP_UP && top > land && this.standable(rs, rk, pos.x, pos.z)) land = top;
    }
    if (land > -Infinity) pos.y = land;
    // Walls: out along the line from the boulder's axis, past its rock at
    // any height the body spans.
    for (let pass = 0; pass < 2; pass++) {
      for (const rk of rs) {
        if (rk.hollow) {
          // From outside, the door boulder's drawn (lumpy) outer wall; the
          // shell below keeps you in the room from inside.
          const q = this.shellQ(t, pos.x, pos.y + 1.3, pos.z);
          const d = q.length();
          if (d > 0.93 && q.y > -0.56 && !(this.lit.has(t.id) && this.inDoorway(q.divideScalar(d), 0.12))) this.pushOut(rk, pos, vel, r);
          continue;
        }
        if (span(rk, pos.x, pos.z, true) && SPAN.top <= pos.y + STEP_UP && this.standable(rs, rk, pos.x, pos.z)) continue;
        this.pushOut(rk, pos, vel, r);
      }
    }
    this.shell(t, pos, vel, r);
  }

  /** Push a body (feet at pos, radius r) radially out of one rock's walls. */
  private pushOut(rk: Rock, pos: THREE.Vector3, vel: THREE.Vector3, rad: number) {
    let ux = pos.x - rk.x, uz = pos.z - rk.z;
    const d = Math.hypot(ux, uz);
    if (d < 1e-4) { ux = 1; uz = 0; } else { ux /= d; uz /= d; }
    const lo = pos.y + STEP_UP, hi = pos.y + BODY_H;
    // Rock over a step's height is wall; so is a lower lip too steep to stand on.
    const wall = (at: number) => span(rk, rk.x + ux * at, rk.z + uz * at, true) && SPAN.bot < hi && (SPAN.top > lo || (SPAN.top > pos.y + 0.12 && SPAN.slope > WALK_SLOPE));
    let a = Math.max(0, d - rad);
    if (!wall(a)) return;
    const far = rk.sx * 1.7;
    let b = a;
    while (b < far && wall(b)) { a = b; b += 0.5; }
    for (let i = 0; i < 7; i++) { const m = (a + b) / 2; if (wall(m)) a = m; else b = m; }
    const to = b + rad + 0.01;
    if (to <= d) return;
    pos.x = rk.x + ux * to;
    pos.z = rk.z + uz * to;
    const into = vel.x * ux + vel.z * uz;
    if (into < 0) { vel.x -= into * ux; vel.z -= into * uz; }
  }

  /** The door boulder's shell walls (horizontal push only, no popping up or down). */
  private shell(t: Tower, pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    const b = t.boulders[1];
    const q = this.shellQ(t, pos.x, pos.y + 1.3, pos.z);
    const d = q.length();
    // Below the flattened bottom there's no wall (it's all floor and ground).
    if (q.y < -0.56) return;
    const open = this.lit.has(t.id);
    const rn = r / b.sx;
    const dir = q.clone().divideScalar(d || 1);
    if (open && this.inDoorway(dir, 0.12)) return;
    const inner = 0.86;
    let target: number;
    if (!open) { if (d >= 1 + rn) return; target = 1 + rn; }
    else if (d > 1 + rn || d < inner - rn) return;
    else target = d > (1 + inner) / 2 ? 1 + rn : inner - rn;
    const qh = Math.hypot(q.x, q.z) || 1e-4;
    const want = Math.sqrt(Math.max(0, target * target - q.y * q.y));
    const k = want / qh;
    const c = Math.cos(t.yaw), sn = Math.sin(t.yaw);
    const nx = q.x * k * b.sx, nz = q.z * k * b.sx;
    const wx = b.x + nx * c + nz * sn, wz = b.z - nx * sn + nz * c;
    const px = wx - pos.x, pz = wz - pos.z;
    const pl = Math.hypot(px, pz);
    if (pl < 1e-5) return;
    pos.x = wx; pos.z = wz;
    const ux = px / pl, uz = pz / pl;
    const into = vel.x * ux + vel.z * uz;
    if (into < 0) { vel.x -= into * ux; vel.z -= into * uz; }
  }

  /**
   * Floor: the highest open, walkable rock top under (x, z) that's no more
   * than a step above the feet. -Infinity if none.
   */
  surface(x: number, z: number, feetY: number): number {
    const t = this.solidNear(x, z);
    if (!t) return -Infinity;
    const rs = this.rocks.of(t);
    let best = -Infinity;
    for (const rk of rs) {
      if (!span(rk, x, z, true)) continue;
      const top = SPAN.top;
      if (top > feetY + STEP_UP || top <= best) continue;
      if (this.standable(rs, rk, x, z)) best = top;
    }
    return best;
  }

  /**
   * Is a world point inside tower rock? The door boulder's hollow and doorway
   * are open air, unless `sealed` (then it's solid right through).
   */
  solidAt(p: THREE.Vector3, sealed = false): boolean {
    const t = this.solidNear(p.x, p.z);
    if (!t) return false;
    for (const rk of this.rocks.of(t)) {
      if (rk.hollow && sealed) {
        if (inside(rk, p.x, p.y, p.z)) return true;
      } else if (rk.hollow) {
        const q = this.shellQ(t, p.x, p.y, p.z);
        const d = q.length();
        // The drawn shape outside, the ellipsoid hollow within.
        if (!inside(rk, p.x, p.y, p.z) || q.y < -0.56) continue;
        if (!this.lit.has(t.id)) return true;
        if (d > 0.86 && !this.inDoorway(q.divideScalar(d || 1), 0)) return true;
      } else if (inside(rk, p.x, p.y, p.z)) return true;
    }
    return false;
  }

  /**
   * Keep the camera out of tower rock: pull it in along its line to the
   * focus, to just short of the first rock in the way. It snaps in and eases
   * back out. In a door boulder's room, that keeps it inside the room unless
   * it's looking in through the doorway. The room is only somewhere for the
   * camera to be while you're in it or on its threshold: once you're outside,
   * the door boulder is solid to the camera, doorway and all, or it slips in
   * through the doorway behind you and watches you leave from behind the wall.
   */
  clampCamera(cam: THREE.Vector3, focus: THREE.Vector3, dt: number) {
    let k = 1;
    const t = this.solidNear(cam.x, cam.z) ?? this.solidNear(focus.x, focus.z);
    if (t && !this.inside && !this.solidAt(focus)) {
      const sealed = this.shellQ(t, focus.x, focus.y, focus.z).length() > 1.05;
      const L = cam.distanceTo(focus);
      const n = Math.ceil(L / 0.3);
      const p = new THREE.Vector3();
      for (let i = 1; i <= n; i++) {
        p.lerpVectors(focus, cam, i / n);
        if (this.solidAt(p, sealed)) { k = Math.max(0, ((i - 1) / n) - 0.5 / Math.max(L, 1e-3)); break; }
      }
    }
    this.camK = Math.min(k, this.camK + (1 - this.camK) * (1 - Math.exp(-3 * dt)));
    if (this.camK < 1) cam.lerpVectors(focus, cam, this.camK);
  }

  private updateSlurp(dt: number, mode: string, grounded: boolean) {
    const b = this.d.body;
    const near = this.near;
    if (this.disarmed >= 0) {
      const t = this.towers[this.disarmed];
      if (!this.inRoom(t, b.pos.x, b.pos.y, b.pos.z, 0.6) && Math.hypot(b.pos.x - t.door.ground.x, b.pos.z - t.door.ground.z) > 3) this.disarmed = -1;
    }
    // Walk into the room of a lit tower, well in, and it takes you up.
    if (!this.slurp && !this.free && near && this.lit.has(near.id) && mode === 'walk' && grounded && near.id !== this.disarmed && this.inRoom(near, b.pos.x, b.pos.y, b.pos.z, 0.55)) {
      this.slurp = { tower: near, phase: 'reach', t: 0, from: b.pos.clone(), camFrom: new THREE.Vector3() };
      this.zoomK = 0;
      this.d.sfx.whoosh();
    }
    const s = this.slurp;
    if (!s) return;
    s.t += dt;
    const t = s.tower;
    const db = t.boulders[1];
    const fwd = new THREE.Vector3(Math.sin(t.yaw), 0, Math.cos(t.yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    // The spirit's hands come down the shaft from high in the dome.
    const high = new THREE.Vector3(db.x, db.y + db.sy * 0.72, db.z);
    const chest = b.pos.clone().setY(b.pos.y + 1.0);
    let hands = 0; // how far the arms reach down (0..1)
    const zoomTo = s.phase === 'view' && this.aim ? 1 : 0;
    this.zoomK += (zoomTo - this.zoomK) * (1 - Math.exp(-(zoomTo > this.zoomK ? 2.2 : 3.5) * dt));
    if (s.phase === 'reach') {
      hands = 1 - Math.pow(1 - Math.min(1, s.t / IN_REACH), 3);
      if (s.t >= IN_REACH) { s.phase = 'pull'; s.t = 0; s.from.copy(b.pos); this.d.setMode('carried'); }
    } else if (s.phase === 'pull') {
      const k = Math.min(1, s.t / IN_PULL);
      b.pos.lerpVectors(s.from, high, k * k);
      hands = 1;
      if (s.t >= IN_PULL) {
        s.phase = 'rise'; s.t = 0;
        s.camFrom.copy(this.camNow);
        this.d.hidePlayer(true);
        this.viewYaw = t.yaw;
        this.viewPitch = -0.08;
        this.d.sfx.whoosh();
      }
    } else if (s.phase === 'rise') {
      if (s.t >= IN_RISE) { s.phase = 'view'; s.t = 0; this.d.sfx.chirp(false); this.onEvent?.('inHead', t); }
    } else if (s.phase === 'view') {
      this.updateAim(s.tower, dt);
    } else if (s.phase === 'fly') {
      this.updateFlight(s, dt);
    }
    if (hands > 0.01 && !this.free) {
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? -1 : 1;
        const sh = high.clone().addScaledVector(right, side * 1.2).add(new THREE.Vector3(0, 1.5, 0));
        const grip = chest.clone().addScaledVector(right, side * 0.45);
        const hand = sh.clone().lerp(grip, hands);
        const len = sh.distanceTo(hand);
        const a1 = sh.clone().addScaledVector(right, side * Math.min(len * 0.2, 1.5));
        const a2 = hand.clone().add(new THREE.Vector3(0, Math.min(len * 0.25, 3), 0));
        this.arms[k].set(sh, a1, a2, hand, 0.1 * SPIRIT_SIZE, 0.075 * SPIRIT_SIZE, 0.16 * SPIRIT_SIZE, -side, chest);
      }
    } else if (!this.free) this.arms[0].group.visible = this.arms[1].group.visible = false;
  }

  /** The camera's last position (for the rise into the head to start from). */
  camNow = new THREE.Vector3();
  /** Set (to the tower's facing) when you've just come out of a head: the camera glides down to you outside the doorway. */
  lowered: number | null = null;

  /** Told when a lock breaks, a tower lights, you go into or out of a head, or you arrive by ember. */
  onEvent: ((e: BeaconEvent, t: Tower) => void) | null = null;
  /** The lit tower you're aimed at from inside a head (the tower camera). */
  aim: Tower | null = null;
  /** How aimed-at each tower is (eased), for its glow. */
  private aimK = new Map<number, number>();
  /** How far the head view has leaned in on the aimed tower (eased, 0..1). */
  private zoomK = 0;
  private view: TowerView;
  private viewK = 0;
  private ember: THREE.Mesh;

  /** Where you can fly from a lit tower: lit towers it can see, and home (from home, every lit tower). */
  targets(from: Tower): Tower[] {
    const ok = (t: Tower) => t !== from && this.lit.has(t.id);
    if (from.home) return this.towers.filter(ok);
    const out = from.links.map((i) => this.towers[i]).filter(ok);
    const home = this.d.gen.towers.home;
    if (ok(home) && !out.includes(home)) out.push(home);
    return out;
  }

  /** Every tower shown from a head: the ones it can see, lit or not, and wherever you can fly. */
  private sight(from: Tower): Tower[] {
    const out = new Set(from.links.map((i) => this.towers[i]));
    for (const t of this.targets(from)) out.add(t);
    return [...out];
  }

  /** Where the camera sits for the view out of a head, looking along `yaw`. */
  private eyeAt(t: Tower, yaw: number) {
    const h = t.head;
    return new THREE.Vector3(h.x, h.y + h.sy * 0.14, h.z).addScaledVector(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), h.sx * 1.12);
  }

  /** Aim snaps to the nearest lit tower you can fly to, near the middle of your view. */
  private updateAim(from: Tower, dt: number) {
    if (this.guideT > 0 && this.towers[this.guideId]) {
      // A slow turn round to where you go next, then it's yours again.
      this.guideT -= dt;
      const g = this.towers[this.guideId];
      const e0 = this.eyeAt(from, this.viewYaw);
      const gy = Math.atan2(g.head.x - e0.x, g.head.z - e0.z), gp = Math.atan2(g.head.y - e0.y, Math.hypot(g.head.x - e0.x, g.head.z - e0.z));
      const k = 1 - Math.exp(-1.8 * dt);
      this.viewYaw += Math.atan2(Math.sin(gy - this.viewYaw), Math.cos(gy - this.viewYaw)) * k;
      this.viewPitch += (gp - this.viewPitch) * k;
    }
    const eye = this.eyeAt(from, this.viewYaw);
    const look = new THREE.Vector3(Math.sin(this.viewYaw) * Math.cos(this.viewPitch), Math.sin(this.viewPitch), Math.cos(this.viewYaw) * Math.cos(this.viewPitch));
    let best: Tower | null = null, bestA = AIM_CONE;
    for (const t of this.targets(from)) {
      const d = new THREE.Vector3(t.head.x, t.head.y, t.head.z).sub(eye).normalize();
      const a = Math.acos(THREE.MathUtils.clamp(d.dot(look), -1, 1));
      // Looking well down at your own doorway is the way out, never a trip.
      if (a < bestA && this.viewPitch > -0.5) { bestA = a; best = t; }
    }
    if (best !== this.aim && best) this.d.sfx.chirp(false);
    this.aim = best;
    if (best) {
      // Ease the view onto it.
      const d = new THREE.Vector3(best.head.x, best.head.y, best.head.z).sub(eye);
      const wantYaw = Math.atan2(d.x, d.z), wantPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      const e = 1 - Math.exp(-4 * dt);
      this.viewYaw += Math.atan2(Math.sin(wantYaw - this.viewYaw), Math.cos(wantYaw - this.viewYaw)) * e;
      this.viewPitch += (wantPitch - this.viewPitch) * e;
    }
  }

  /** Burst into an ember and fly to another lit tower's head. */
  private travel(to: Tower) {
    const s = this.slurp;
    if (!s || s.phase !== 'view') return;
    const a = this.eyeAt(s.tower, this.viewYaw);
    // The far head turns to face where you're coming from, so you fly
    // straight into its eyes.
    const yaw = Math.atan2(a.x - to.head.x, a.z - to.head.z);
    const b = this.eyeAt(to, yaw);
    const d = a.distanceTo(b);
    s.phase = 'fly'; s.t = 0; s.to = to; s.a = a; s.b = b; s.yaw = yaw;
    s.dur = 2.6 + d / 480;
    this.aim = null;
    this.sparks.emit(a, 30, 0.22, 5);
    this.d.sfx.whoosh();
    this.d.sfx.chirp(true);
    // You (unseen) are there already, so the world streams in round it.
    const g = to.door.ground;
    this.d.body.pos.set(g.x, g.y, g.z);
    this.d.body.vel.set(0, 0, 0);
  }

  /**
   * The ember's arc from a to b (k 0..1): up and out along your look, high
   * over the land (higher for longer trips), then down into the far head's
   * eyes, which have turned to face you, never through its rock.
   */
  private arc(sl: Slurp, k: number, out = new THREE.Vector3()) {
    const a = sl.a!, b = sl.b!, yaw = sl.yaw!;
    const d = a.distanceTo(b);
    const h = 30 + d * 0.12;
    const p1 = a.clone().addScaledVector(b.clone().sub(a).setY(0).normalize(), d * 0.3).setY(Math.max(a.y, b.y) + h);
    const p2 = b.clone().add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(Math.min(120, d * 0.35))).setY(b.y + h * 0.6);
    const v = 1 - k;
    return out.set(0, 0, 0).addScaledVector(a, v * v * v).addScaledVector(p1, 3 * v * v * k).addScaledVector(p2, 3 * v * k * k).addScaledVector(b, k * k * k);
  }

  private updateFlight(s: Slurp, dt: number) {
    const k = THREE.MathUtils.smootherstep(s.t / s.dur!, 0, 1);
    const p = this.arc(s, k);
    const u = s.t / s.dur!;
    this.ember.visible = u > 0.08 && u < 0.97;
    this.ember.position.copy(p);
    this.ember.scale.setScalar(0.34 + 0.05 * Math.sin(this.time * 23));
    if (Math.random() < dt * 40) this.sparks.emit(p, 1, 0.1, 0.6, undefined, { life: 0.7, rise: -1, drag: 2, up: 0.3 });
    if (s.t >= s.dur!) {
      const to = s.to!;
      this.sparks.emit(s.b!, 26, 0.24, 5);
      this.d.sfx.whoosh();
      this.d.sfx.chirp(true);
      this.state.get(to.id)!.litT = 0;
      s.tower = to; s.phase = 'view'; s.t = 0;
      this.viewYaw = s.yaw!; this.viewPitch = -0.08;
      this.ember.visible = false;
      this.onEvent?.('arrived', to);
    }
  }

  /** The camera on an ember flight: out of the eyes, behind the ember along its arc, and into the far head's eyes. */
  private flyCam(s: Slurp): { pos: THREE.Vector3; at: THREE.Vector3 } {
    const u = s.t / s.dur!;
    const k = THREE.MathUtils.smootherstep(u, 0, 1);
    const p = this.arc(s, k);
    const ahead = this.arc(s, Math.min(1, k + 0.03)).sub(this.arc(s, Math.max(0, k - 0.03))).normalize();
    const follow = p.clone().addScaledVector(ahead, -13).add(new THREE.Vector3(0, 3, 0));
    const followAt = p.clone().addScaledVector(ahead, 12);
    // Leaving: from the view out of the head. Arriving: into the far eyes, turning to look out.
    const k0 = THREE.MathUtils.smootherstep(u, 0, 0.14), k1 = THREE.MathUtils.smootherstep(u, 0.84, 1);
    const startAt = s.a!.clone().add(new THREE.Vector3(Math.sin(this.viewYaw), Math.sin(this.viewPitch), Math.cos(this.viewYaw)).multiplyScalar(10));
    const endAt = s.b!.clone().add(new THREE.Vector3(Math.sin(s.yaw!), -0.08, Math.cos(s.yaw!)).multiplyScalar(10));
    this.camPos.lerpVectors(s.a!, follow, k0).lerp(s.b!, k1);
    this.camAt.lerpVectors(startAt, followAt, k0).lerp(endAt, k1);
    return { pos: this.camPos, at: this.camAt };
  }

  /** The tower camera's overlay: towers in sight as silhouettes, lit ones glowing. */
  private drawView(cam: THREE.PerspectiveCamera, dt: number) {
    const s = this.slurp;
    const on = !!s && s.phase === 'view';
    this.viewK += ((on ? 1 : 0) - this.viewK) * (1 - Math.exp(-(on ? 3 : 8) * dt));
    const from = s?.tower;
    if (!from || this.viewK < 0.01) { this.view.update([], cam, RES); return; }
    const list: ViewTower[] = [];
    for (const t of this.sight(from)) {
      const want = this.aim === t ? 1 : 0;
      const k = (this.aimK.get(t.id) ?? 0) + (want - (this.aimK.get(t.id) ?? 0)) * (1 - Math.exp(-8 * dt));
      this.aimK.set(t.id, k);
      this.state.get(t.id)!.hl = k;
      list.push({ t, lit: this.lit.has(t.id), aimed: k, alpha: this.viewK });
    }
    RES.set(innerWidth, innerHeight);
    this.view.update(list, cam, RES);
  }

  /**
   * Out of the head: you're straight back on your feet just outside the
   * doorway, facing out, and the camera glides down from the eyes to you
   * (main.ts blends it), so where you came out is plain to see.
   */
  private leave() {
    const s = this.slurp;
    if (!s || s.phase !== 'view') return;
    const t = s.tower, b = this.d.body;
    const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
    const x = t.door.ground.x + fx * 3, z = t.door.ground.z + fz * 3;
    b.pos.set(x, this.floorUnder(x, z, t.door.ground.y + 3), z);
    b.vel.set(0, 0, 0);
    b.heading = t.yaw;
    this.d.setMode('walk');
    this.d.hidePlayer(false);
    this.slurp = null;
    this.aim = null;
    this.disarmed = t.id;
    this.lowered = t.yaw;
    this.sparks.emit(b.pos.clone().setY(b.pos.y + 1), 14, 0.14, 2.5);
    this.d.sfx.whoosh();
    this.onEvent?.('outHead', t);
  }

  // ------------------------------------------------------------ the heads

  private updateHeads(dt: number) {
    const b = this.d.body;
    const e = (r: number) => 1 - Math.exp(-r * dt);
    const inside = this.inside;
    const sl = this.slurp;
    const flying = sl?.phase === 'fly' ? sl : null;
    // What the heads watch: you, or the ember while you're flying.
    const you = flying ? this.ember.position : b.pos.clone().setY(b.pos.y + 1.2);
    for (const t of this.towers) {
      const s = this.state.get(t.id)!;
      // Lit once its spirit is in the head (a tower being freed isn't yet).
      const lit = this.lit.has(t.id) && !(this.free?.tower === t && !this.free.lit);
      s.litT += dt;
      s.lit += ((lit ? 1 : 0) - s.lit) * e(lit ? 4 : 8);
      s.bob = 0;
      // Every head, lit or not, turns to watch you wherever you are. The one
      // you're inside turns with your look, and the one being freed faces
      // front (its spirit's climb is aimed at the eyehole where it rests).
      if (inside === t && this.slurp && this.slurp.phase !== 'reach' && this.slurp.phase !== 'pull' && this.slurp.phase !== 'fly') {
        // You are this head: it turns with your look.
        let dy = this.viewYaw - t.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        let cur = s.look;
        cur += Math.atan2(Math.sin(dy - cur), Math.cos(dy - cur));
        s.look = cur;
        s.tilt = -this.viewPitch * 0.5;
      } else if (flying?.to === t) {
        // Where you're flying to: it turns to catch you in its eyes.
        const want = flying.yaw! - t.yaw;
        s.look += Math.atan2(Math.sin(want - s.look), Math.cos(want - s.look)) * e(3);
        s.tilt += (0.04 - s.tilt) * e(3);
      } else if ((inside === t && !flying) || this.free?.tower === t) {
        s.look += Math.atan2(Math.sin(0 - s.look), Math.cos(0 - s.look)) * e(2);
        s.tilt += (0 - s.tilt) * e(2);
      } else {
        // It turns to watch you, all the way round.
        const h = t.head;
        const dx = you.x - h.x, dz = you.z - h.z;
        const want = Math.atan2(dx, dz) - t.yaw;
        s.look += Math.atan2(Math.sin(want - s.look), Math.cos(want - s.look)) * e(2.5);
        const down = Math.atan2(h.y - you.y, Math.max(4, Math.hypot(dx, dz)));
        s.tilt += (THREE.MathUtils.clamp(down * 0.45, -0.1, 0.32) - s.tilt) * e(3);
      }
      // A happy hop as it comes alive.
      if (s.litT < 1.4) s.bob = Math.sin(s.litT * 9) * Math.exp(-s.litT * 2.5) * 0.9 * t.scale;
    }
  }

  // ------------------------------------------------------------ drawing

  private draw(cam: THREE.PerspectiveCamera) {
    const cx = cam.position.x, cz = cam.position.z;
    this.refreshT -= 1;
    // Bodies only change with distance; refresh them every few frames.
    const bodies = this.refreshT <= 0;
    const all = [...this.bodyNear, ...this.bodyFar, ...this.homeNear, ...this.homeFar];
    if (bodies) {
      this.refreshT = 10;
      for (const bb of all) bb.begin();
    }
    this.headNear.begin(); this.headFar.begin(); this.doorNear.begin(); this.doorFar.begin();
    for (const t of this.towers) {
      const d = Math.hypot(t.x - cx, t.z - cz);
      if (d > DRAW) continue;
      const s = this.state.get(t.id)!;
      if (bodies) {
        const [bn, bf] = t.home ? [this.homeNear, this.homeFar] : [this.bodyNear, this.bodyFar];
        const set = d < NEAR_LOD ? bn : bf;
        t.boulders.forEach((bo, i) => {
          if (i === 1) return; // the door boulder is drawn hollow, below
          const h = (i * 7 + t.id * 3) % 3;
          set[h].add(bo.x, bo.y, bo.z, bo.sx, bo.rot, bo.sy / bo.sx, 0.3 + 0.4 * (((i * 0.37 + t.id * 0.61) % 1)));
        });
      }
      (d < NEAR_LOD ? this.headNear : this.headFar).add(t.head, s.bob, s.lit, s.home, s.tilt, s.look, 0, s.hl);
      // Being freed: sealed until it bursts, shuddering harder as the cracks
      // run (the glow slot carries how far they've got).
      const f = this.free?.tower === t && this.free.t < T_BURST ? this.free : null;
      const open = this.lit.has(t.id) && !f ? 1 : 0;
      let door = t.boulders[1], w = s.lit, jolt = 0;
      if (f) {
        const k = f.t / T_BURST;
        w = 0.08 + 0.92 * k;
        const a = 0.12 * t.scale * k * k;
        door = { ...door, x: door.x + Math.sin(this.time * 71) * a, z: door.z + Math.sin(this.time * 53 + 1) * a };
        jolt = Math.sin(this.time * 61 + 2) * a * 0.5;
      }
      (d < NEAR_LOD ? this.doorNear : this.doorFar).add(door, jolt, open, s.home, 0, 0, 1, w);
    }
    if (bodies) for (const bb of all) bb.end();
    this.headNear.end(); this.headFar.end(); this.doorNear.end(); this.doorFar.end();
  }

  // ------------------------------------------------------------ save

  private key() { return `embla.towers.${this.d.saveKey}`; }

  private save() {
    try { localStorage.setItem(this.key(), JSON.stringify([...this.lit])); } catch { /* private mode */ }
  }

  private load() {
    try {
      const raw = localStorage.getItem(this.key());
      if (raw) for (const id of JSON.parse(raw) as number[]) if (this.towers[id]) this.lit.add(id);
    } catch { /* ignore */ }
  }

  /** Forget this seed's lit towers (?fresh=1). */
  reset() {
    try { localStorage.removeItem(this.key()); } catch { /* ignore */ }
    this.lit.clear();
    for (const s of this.state.values()) s.lit = 0;
  }
}

/** The home tower's stone: pale golden sandstone, the colour of the hearth, against the grey-rose granite of the others. */
const HOME_STONE = '#d9bc8a';

/** A point on the cubic Bezier through p at u. */
function bez3(p: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3], u: number, out: THREE.Vector3) {
  const v = 1 - u;
  return out.set(0, 0, 0).addScaledVector(p[0], v * v * v).addScaledVector(p[1], 3 * v * v * u).addScaledVector(p[2], 3 * v * u * u).addScaledVector(p[3], u * u * u);
}

/** The first `u` of a cubic Bezier, as its own cubic (de Casteljau). */
function subBez(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, u: number): [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const q0 = p0.clone().lerp(p1, u), q1 = p1.clone().lerp(p2, u), q2 = p2.clone().lerp(p3, u);
  const r0 = q0.clone().lerp(q1, u), r1 = q1.clone().lerp(q2, u);
  return [p0.clone(), q0, r0, r0.clone().lerp(r1, u)];
}
