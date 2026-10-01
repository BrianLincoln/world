import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';
import type { Body } from '../player/movement';
import type { Sfx } from '../story/audio';
import { Arm } from '../story/beacons';
import { OCCLUDE, overlayMat } from '../story/overlay';
import type { DungeonSite } from '../world/worldgen';

// A dungeon's ring, once it's open: the towers' dark opposite. The giant
// sets a dark spirit free inside the standing stones; it spreads a
// forcefield over the ground there and hangs above it. Walk well on to the
// field and it takes you, exactly as a tower's spirit does but the other
// way up: two long black arms come up out of the field once, either side of
// you, take hold, and pull you down through it into the dungeon
// (src/dungeon/). Coming back, they lift you out and let go.

export interface RingDeps {
  body: Body;
  sfx: Sfx;
  /** Switch the explorer's movement mode ('carried' while held, 'walk' after). */
  setMode(m: string): void;
}

/** Reaching up for you, holding a beat, pulling you under; and bringing you back up and letting go (s). */
const REACH = 0.5, HOLD = 0.14, PULL = 0.6, RISE = 0.7, LET_GO = 0.45;
/** How far on to the field you walk before it takes you (m in from its lip). */
const WELL_ON = 3;
/** How far under the field the arms start from and take you to (m). */
const UNDER = 4.5;
/** The arms' size, as the tower spirit's. */
const ARM = 1.4;

type Phase = 'reach' | 'hold' | 'pull' | 'rise' | 'letgo';

const FIELD_VERT = /* glsl */ `
out vec2 vP;
out float vDepth;
void main() {
  vP = position.xz;
  vec4 vc = modelViewMatrix * vec4(position, 1.0);
  vDepth = -vc.z;
  gl_Position = projectionMatrix * vc;
}
`;
const FIELD_FRAG = /* glsl */ `
precision highp float;
${OCCLUDE}
uniform float uTime;
uniform float uOpen;
uniform float uR;
uniform vec2 uStir;
in vec2 vP;
in float vDepth;
out vec4 fragColor;
void main() {
  float r = length(vP) / uR;
  if (r > uOpen) discard;
  float a = atan(vP.y, vP.x);
  // Slow flat bands winding in to the middle, and a hard pale lip.
  float swirl = step(0.5, fract(a * 0.477 + r * 2.2 - uTime * 0.07));
  float ring = step(0.5, fract(r * 3.0 - uTime * 0.11));
  vec3 col = mix(vec3(0.085, 0.06, 0.15), vec3(0.16, 0.11, 0.27), 0.55 * swirl + 0.25 * ring);
  float lip = smoothstep(uOpen - 0.07, uOpen - 0.03, r);
  col = mix(col, vec3(0.62, 0.55, 0.86), lip);
  // Where something stands on it, it pales in a ring round the feet.
  float d = length(vP - uStir);
  col = mix(col, vec3(0.45, 0.38, 0.7), (1.0 - smoothstep(0.0, 0.5, abs(d - 1.6 - 0.25 * sin(uTime * 3.0)))) * 0.6);
  fragColor = vec4(col, (0.78 + 0.16 * lip) * occlusion(vDepth));
}
`;

const p = new THREE.Vector3();

export class Ring {
  /** Solid things (the spirit, its arms): the main scene. */
  readonly group = new THREE.Group();
  /** The forcefield: translucent, so the overlay scene. */
  readonly overlay = new THREE.Group();
  open = false;
  /** Called when the arms have you under the field: the dungeon takes over. */
  onTaken: (() => void) | null = null;
  private openNow = 0;
  private time = 0;
  private field: THREE.Mesh;
  private spirit = new THREE.Group();
  private arms: Arm[];
  private take: { phase: Phase; t: number; from: THREE.Vector3 } | null = null;
  /** Just put back on the field: it won't take you again until you've stepped off it. */
  private disarmed = false;
  /** The dark spirit on its way down from the giant (0..1), or -1. */
  private fall = -1;
  private from = new THREE.Vector3();
  private centre: THREE.Vector3;
  private stir = new THREE.Vector2(99, 99);
  /** The field's tilt (rise per metre along x and z). */
  private sx = 0;
  private sz = 0;

  constructor(readonly site: DungeonSite, ground: (x: number, z: number) => number, private d: RingDeps) {
    this.centre = new THREE.Vector3(site.x, ground(site.x, site.z), site.z);
    const R = site.r - 2.4;
    this.field = new THREE.Mesh(new THREE.CircleGeometry(R, 56).rotateX(-Math.PI / 2), overlayMat(FIELD_VERT, FIELD_FRAG, { uOpen: { value: 0 }, uR: { value: R }, uStir: { value: this.stir } }));
    // The ground in the ring is never quite level: the field lies on its slope, just clear of it.
    const g = (dx: number, dz: number) => ground(site.x + dx, site.z + dz);
    this.sx = (g(R, 0) - g(-R, 0)) / (2 * R);
    this.sz = (g(0, R) - g(0, -R)) / (2 * R);
    this.centre.y = (g(R, 0) + g(-R, 0) + g(0, R) + g(0, -R) + 2 * this.centre.y) / 6;
    this.field.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-this.sx, 1, -this.sz).normalize());
    this.field.position.copy(this.centre).setY(this.centre.y + 0.55);
    this.field.frustumCulled = false;
    this.field.visible = false;
    this.overlay.add(this.field);

    // The dark spirit: the tower spirit's shape (a dome over a wavy hem, tall eyes) in ink, with pale eyes.
    const prof: [number, number][] = [[0.02, 1.25], [0.45, 1.15], [0.8, 0.8], [0.95, 0.3], [0.98, -0.25], [0.9, -0.7], [0.7, -0.95], [0.02, -0.9]];
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28), makeSolidMaterial('#191424', 0, { keep: 1, flat: 0.5 }));
    const eyeMat = makeSolidMaterial('#d8d0ff', 0.9, { keep: 1 });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10).scale(0.13, 0.26, 0.06), eyeMat);
      eye.position.set(s * 0.33, 0.35, 0.86);
      eye.rotation.y = s * 0.36;
      this.spirit.add(eye);
    }
    this.spirit.add(body);
    this.spirit.scale.setScalar(1.25);
    this.spirit.visible = false;
    this.group.add(this.spirit);

    const ink = makeSolidMaterial('#191424', 0, { keep: 1, flat: 0.5 });
    this.arms = [new Arm(ink), new Arm(ink)];
    this.group.add(this.arms[0].group, this.arms[1].group);
  }

  /** The ground height in the middle of the ring (the dungeon lies under it). */
  get groundY() { return this.centre.y; }

  /** Taking you down or bringing you back: hands off. */
  get busy() { return !!this.take; }

  /** How much of the frame the violet veil covers (0..1): the cut between above and below. */
  get veil() {
    const s = this.take;
    if (!s) return 0;
    if (s.phase === 'pull') return THREE.MathUtils.smoothstep(s.t / PULL, 0.4, 1);
    if (s.phase === 'rise') return 1 - THREE.MathUtils.smoothstep(s.t, 0.05, 0.5);
    return 0;
  }

  /** Where you stood (your feet) when it took you, while it has you: the camera stays up there, it can't follow you under the ground. */
  get heldY() { return this.take ? this.take.from.y : -Infinity; }

  /** The field's height at a point (it lies on the ground's slope). */
  private fieldY(x: number, z: number) {
    return this.centre.y + 0.55 + this.sx * (x - this.centre.x) + this.sz * (z - this.centre.z);
  }

  /** Back from the dungeon: the arms lift you out through the middle of the field and let go. */
  emerge(ground: number) {
    const b = this.d.body, c = this.centre;
    b.pos.set(c.x, ground - UNDER, c.z);
    b.vel.set(0, 0, 0);
    this.d.setMode('carried');
    this.take = { phase: 'rise', t: 0, from: new THREE.Vector3(c.x, ground, c.z) };
    this.disarmed = true;
  }

  /** The giant lets it go from `from`: it drops into the ring, and the ring opens. */
  free(from: THREE.Vector3) {
    if (this.open || this.fall >= 0) return;
    this.from.copy(from);
    this.fall = 0;
    this.spirit.visible = true;
  }

  /** Open already (a save from after). */
  setOpen() {
    this.open = true;
    this.openNow = 1;
    this.fall = -1;
    this.spirit.visible = true;
  }

  /** `mode`, `grounded`: how you're getting about; `allow`: nothing else has hold of the story just now. */
  update(dt: number, camera: THREE.Vector3, mode: string, grounded: boolean, allow: boolean) {
    this.time += dt;
    const t = this.time, ctr = this.centre, b = this.d.body, player = b.pos;
    const hover = p.set(ctr.x, ctr.y + 3.4 + Math.sin(t * 1.3) * 0.25, ctr.z);
    if (this.fall >= 0) {
      // Down out of its hand in a long slow curve, turning over.
      this.fall = Math.min(1, this.fall + dt / 3.2);
      const e = this.fall * this.fall * (3 - 2 * this.fall);
      this.spirit.position.lerpVectors(this.from, hover, e);
      this.spirit.position.y += Math.sin(this.fall * Math.PI) * 8;
      this.spirit.rotation.z = (1 - e) * 2.5;
      if (this.fall >= 1) { this.fall = -1; this.open = true; }
    } else if (this.open) {
      this.spirit.position.copy(hover);
      this.spirit.rotation.z = Math.sin(t * 0.9) * 0.06;
    }
    this.openNow += ((this.open ? 1 : 0) - this.openNow) * (1 - Math.exp(-1.4 * dt));
    this.field.visible = this.openNow > 0.01;
    (this.field.material as THREE.ShaderMaterial).uniforms.uOpen.value = this.openNow;
    if (!this.spirit.visible) { this.hideArms(); return; }
    // It watches whoever is nearest: you.
    const off = Math.hypot(player.x - ctr.x, player.z - ctr.z);
    const look = off < 60 ? player : camera;
    if (this.fall < 0) this.spirit.rotation.y = Math.atan2(look.x - this.spirit.position.x, look.z - this.spirit.position.z);

    const R = this.site.r - 2.4;
    const on = this.open && off < R - 0.4 && Math.abs(player.y - ctr.y) < 3;
    this.stir.set(on ? player.x - ctr.x : 99, on ? player.z - ctr.z : 99);
    if (off > R + 1) this.disarmed = false;
    // Walk well on to the field, on your own feet, and it takes you.
    if (!this.take && allow && !this.disarmed && this.openNow > 0.9 && mode === 'walk' && grounded && off < R - WELL_ON && Math.abs(player.y - ctr.y) < 3) {
      this.take = { phase: 'reach', t: 0, from: player.clone() };
      b.vel.set(0, 0, 0);
      this.d.sfx.sink();
    }
    const s = this.take;
    if (!s) { this.hideArms(); return; }
    s.t += dt;
    // How far the hands have come up to you (0..1), and how far under the arms' roots have sunk.
    let hands = 1, sunk = 0;
    if (s.phase === 'reach') {
      hands = 1 - Math.pow(1 - Math.min(1, s.t / REACH), 3);
      if (s.t >= REACH) { s.phase = 'hold'; s.t = 0; s.from.copy(player); this.d.setMode('carried'); }
    } else if (s.phase === 'hold') {
      player.copy(s.from);
      if (s.t >= HOLD) { s.phase = 'pull'; s.t = 0; }
    } else if (s.phase === 'pull') {
      const k = Math.min(1, s.t / PULL);
      player.copy(s.from).setY(s.from.y - UNDER * k * k);
      sunk = k * k;
      if (k >= 1) {
        this.take = null;
        this.hideArms();
        this.disarmed = true;
        this.onTaken?.();
        return;
      }
    } else if (s.phase === 'rise') {
      const k = Math.min(1, s.t / RISE);
      player.copy(s.from).setY(s.from.y - UNDER * Math.pow(1 - k, 2.2));
      sunk = Math.pow(1 - k, 2.2);
      if (k >= 1) { s.phase = 'letgo'; s.t = 0; player.copy(s.from); b.grounded = true; this.d.setMode('walk'); }
    } else {
      hands = 1 - THREE.MathUtils.smoothstep(s.t / LET_GO, 0, 1);
      if (s.t >= LET_GO) { this.take = null; this.hideArms(); return; }
    }
    // The same two arms as a tower's spirit has, in ink. Each comes up out of
    // the field beside you, arches over, and comes down on to you from above.
    const right = new THREE.Vector3(Math.cos(b.heading), 0, -Math.sin(b.heading));
    const chest = player.clone().setY(player.y + 1.0);
    const drop = UNDER * sunk, h = hands;
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const root = s.from.clone().addScaledVector(right, side * 1.5);
      // Never out past the field's lip: it's the field they come out of.
      const far = Math.hypot(root.x - ctr.x, root.z - ctr.z) / (R - 0.7);
      if (far > 1) { root.x = ctr.x + (root.x - ctr.x) / far; root.z = ctr.z + (root.z - ctr.z) / far; }
      root.y = this.fieldY(root.x, root.z) - drop;
      const sh = root.clone().setY(root.y - 1.2);
      // The hand's way up: from just under the field's skin, high over your shoulder, down to your chest.
      const rest = root.clone().setY(root.y - 0.4);
      const over = root.clone().setY(root.y + 2.9).addScaledVector(right, -side * 0.3);
      const grip = chest.clone().addScaledVector(right, side * 0.42);
      const hand = rest.multiplyScalar((1 - h) * (1 - h)).addScaledVector(over, 2 * (1 - h) * h).addScaledVector(grip, h * h);
      const len = sh.distanceTo(hand);
      const a1 = sh.clone().add(new THREE.Vector3(0, Math.min(len * 0.7, 3.6), 0)).addScaledVector(right, side * 0.35);
      const a2 = hand.clone().add(new THREE.Vector3(0, 1.5 * h, 0)).addScaledVector(right, side * 0.85 * h);
      this.arms[k].set(sh, a1, a2, hand, 0.1 * ARM, 0.075 * ARM, 0.16 * ARM, -side, chest);
    }
  }

  private hideArms() { this.arms[0].group.visible = this.arms[1].group.visible = false; }

  dispose() {
    this.group.removeFromParent();
    this.overlay.removeFromParent();
  }
}
