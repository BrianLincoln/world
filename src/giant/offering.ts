import * as THREE from 'three';
import { mulberry32 } from '../core/rng';
import { makeDarkLight } from '../dungeon/darkLight';
import { makeSolidMaterial } from '../gfx/materials';
import { rockhopperStatue } from '../mobs/rockhopper';
import type { Body } from '../player/movement';
import type { Sfx } from '../story/audio';
import type { DungeonSite } from '../world/worldgen';
import { Birds, GRIP, STAND } from './birds';
import type { Giant } from './giant';
import type { Ring } from './ring';

// The offering (dungeon 1, slice B of docs/NEXT-dungeon1.md): what becomes
// of the warm light once you're back up with it. All of it is a cutscene:
// from the moment the ring's arms let go of you, your hands are off until
// it's over (the owner: "just happening out of the user's control"). The
// guide isn't here; it stays at home.
//
// The ring shuts behind you: its field closes in to the middle, the dark
// spirit goes down with it, and what's left is paving and a shrine: a stone
// rockhopper on a plinth, with a bowl on its back. The light leaves your
// shoulder and settles in the bowl. One of the giant's crows comes down off
// its head, lands, walks up, and hops up and snatches the light in its claws;
// it hangs there in the air with it, turning to the giant.
// The giant's eyes open, and then its mouth, wide: a real hole into the
// hollow of its head. The crow flies up and straight in through it, the
// light lighting the hollow round it, and the mouth shuts on them both; it
// smiles.
// (The owner's idea, after a hand held out and a fist closing on the light
// were built twice and didn't read: its hands are boulders.) That's where
// this ends (slice C: a spirit goes home, the giant gets up).

export type OfferState = 'none' | 'held' | 'placed' | 'given';

export interface OfferDeps {
  site: DungeonSite;
  ground(x: number, z: number): number;
  body: Body;
  sfx: Sfx;
  ring: Ring;
  /** The giant asleep by the ring (main summons one if the story hasn't brought it). Null once it has got up and gone (giant/homecoming.ts). */
  giant(): Giant | null;
  puff(at: THREE.Vector3, n: number, size: number, spread: number): void;
  /** Stop whatever you're on where it stands. */
  halt(): void;
  /** How far the nearest standing tree's trunk is from a point (Infinity if none within `max`). */
  tree(x: number, z: number, max: number): number;
  saveKey: string;
}

/**
 * The sequence, in seconds from when the light leaves your shoulder. It
 * goes to the bowl (`set`); the crow leaves the giant's head at `come` and
 * takes `dive` to land, and walks straight on to the shrine in `walk`; it
 * takes `take` to crouch, hop up and snatch the light in its claws (it has
 * it `SNATCH` of the way through), and then hangs in the air with it, backing
 * off. The giant's eyes open at `wake` (the camera cuts to
 * its face `cut` later) and its mouth at `open`; the crow takes off at `fly` and is
 * `climb` getting to the back of the hollow (`gone`), in through the lips
 * a second or so before; the mouth starts to shut behind it at `shut` and
 * is shut at `closed`; the smile comes at `smile`; `end`.
 */
const timing = (set: number, come: number, dive: number, walk: number, take: number, gaps: [number, number, number, number], climb: number, smileAfter: number, hold: number) => {
  const landed = come + dive, atBowl = landed + walk, has = atBowl + take;
  const wake = has + gaps[0], cut = wake + gaps[1], open = cut + gaps[2], fly = open + gaps[3];
  const gone = fly + climb, shut = gone - 0.7, closed = shut + 0.75, smile = gone + smileAfter, end = smile + hold;
  return { set, come, dive, landed, walk, atBowl, take, has, wake, cut, open, fly, climb, gone, shut, closed, smile, end };
};
const T = timing(1.7, 1.2, 4.3, 2.8, 1.6, [0.4, 1.0, 1.7, 1.4], 4.8, 1.8, 3.4);
export type OfferTiming = typeof T;
/**
 * The same, told quickly (dungeon 2's: the owner found the first at risk of
 * wearing thin): about 16 s from the light leaving you, 20 from coming up.
 */
export const OFFER_SHORT: OfferTiming = timing(1.3, 0.4, 3.0, 1.6, 1.4, [0.2, 0.8, 1.0, 0.9], 3.6, 1.2, 2.2);

/** What differs from one dungeon's offering to the next. Left out: dungeon 1's. */
export interface OfferOpts {
  /** Its save key's name (`embla.<name>.<seed>`). */
  name?: string;
  /** The creature of the dungeon in stone, for the shrine: position and normal, feet at y = 0. */
  statue?: THREE.BufferGeometry;
  timing?: OfferTiming;
}
/** A beat after the shrine is up before the light leaves you (s). */
const PAUSE = 0.7;
/** The shrine: its plinth's radius (what you can't walk through) and height, how big the stone rockhopper is beside a live one, and how far over the ground the light sits in the bowl on its back. */
const FOOT_R = 1.5, PLINTH = 0.5, STATUE = 1.35, BOWL_Y = PLINTH + STATUE * 1.33 + 0.42;
/** A crow's middle over the ground it stands on, and how far it sinks on its legs before it hops (m). */
const CROW_Y = STAND, CROUCH = 0.22;
/** The hop: how long it crouches (s), how far through `T.take` its claws close on the light, how long it takes to back off with it (s) and how far over the bowl it hangs then (m). */
const CROUCH_T = 0.4, SNATCH = 0.6, BACK_OFF = 2.8, HANG = 1.8;
/** The camera for the giant's face: how far in front of it (toward the ring), how far to one side, and how far above (m). */
const CAM_FRONT = 40, CAM_ASIDE = 15, CAM_ABOVE = 2;
/** The light's size on your shoulder and in the bowl, and under the crow (as the lights the other crows carry). */
const ORB = 0.34, ORB_CROW = 0.95;
/** The cameras' field of view: by the shrine, close on the giant's face as it wakes, back for the crow flying in, and on the smile. */
const FOV = 36, FOV_FACE = 20, FOV_WIDE = 40, FOV_SMILE = 25;
/** The crow's way in: how far out in front of the lips it lines up, and how far past the middle of the head it gets (see `Giant.throat`). */
const LINE_UP = 5, DEEP_IN = -0.2;
/** The grin it keeps. */
const GRIN_KEEP = 0.55;

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const ss = THREE.MathUtils.smoothstep;

/** Flat stones laid over the ground where the field was: one mesh, each stone on the slope where it lies. */
function buildPaving(site: DungeonSite, ground: (x: number, z: number) => number, seed: number) {
  const rnd = mulberry32(seed ^ 0x51a7e);
  const pos: number[] = [], idx: number[] = [];
  const R = site.r - 2.6;
  for (let r = 2.5; r < R; r += 1.62) {
    const n = Math.round((Math.PI * 2 * r) / 1.72), a0 = rnd() * 6.28;
    for (let k = 0; k < n; k++) {
      const a = a0 + ((k + (rnd() - 0.5) * 0.3) / n) * Math.PI * 2, rr = r + (rnd() - 0.5) * 0.35;
      const cx = site.x + Math.cos(a) * rr, cz = site.z + Math.sin(a) * rr, size = 0.56 + rnd() * 0.2, sides = 5 + Math.floor(rnd() * 3), turn = rnd() * 6.28;
      const base = pos.length / 3;
      // The top (a fan), and a skirt down into the grass.
      pos.push(cx, ground(cx, cz) + 0.09, cz);
      for (let s = 0; s < sides; s++) {
        const b = turn + (s / sides) * Math.PI * 2, q = size * (0.82 + rnd() * 0.3);
        const x = cx + Math.cos(b) * q, z = cz + Math.sin(b) * q;
        pos.push(x, ground(x, z) + 0.08, z, cx + Math.cos(b) * q * 1.12, ground(x, z) - 0.2, cz + Math.sin(b) * q * 1.12);
      }
      for (let s = 0; s < sides; s++) {
        const i = base + 1 + s * 2, j = base + 1 + ((s + 1) % sides) * 2;
        idx.push(base, j, i, i, j, i + 1, j, j + 1, i + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class Offering {
  /** Solid things (the shrine, the paving, the light, the crow): the main scene. */
  readonly group = new THREE.Group();
  state: OfferState = 'none';
  /** Seconds since the light left your shoulder, while the rest plays (else -1). */
  private t = -1;
  private time = 0;
  /** How long the shrine has stood there with you still holding the light (s). */
  private wait = 0;
  private centre: THREE.Vector3;
  private bowl: THREE.Vector3;
  private paving: THREE.Mesh;
  private shrine = new THREE.Group();
  private statue: THREE.Mesh;
  private orb: THREE.Mesh;
  private orbMat: THREE.ShaderMaterial;
  private orbAt = new THREE.Vector3();
  private orbFrom = new THREE.Vector3();
  private orbSize = ORB;
  /** The light settling into the bowl (seconds since, or -1). */
  private popT = -1;
  private crow = new Birds(1);
  private perch = new THREE.Vector3();
  /** Staged once the giant is where it will be: the way to it and across it, the camera's places, and the crow's marks. */
  private u = new THREE.Vector3(1, 0, 0);
  private p = new THREE.Vector3(0, 0, 1);
  private side = 1;
  private gap = 0;
  private planned = false;
  private staged = false;
  private camNear = new THREE.Vector3();
  private camFace = new THREE.Vector3();
  private land = new THREE.Vector3();
  private byBowl = new THREE.Vector3();
  private over = new THREE.Vector3();
  private hang = new THREE.Vector3();
  /** The crow's footfalls so far (to hear each). */
  private foot = 0;
  /** The crow has gone into the giant's mouth: it isn't drawn again. */
  private eaten = false;
  private lookAt = new THREE.Vector3();
  private pos = new THREE.Vector3();
  private at = new THREE.Vector3();
  private atNow = new THREE.Vector3();
  /** The grin settling, after (seconds since the end, or -1). */
  private after = -1;
  /** Where the orbit camera should be looking from once this hands it back (a yaw), once. */
  afterYaw: number | null = null;

  private T: OfferTiming;
  private name: string;

  constructor(private d: OfferDeps, seed: number, opts: OfferOpts = {}) {
    this.T = opts.timing ?? T;
    this.name = opts.name ?? 'offer1';
    const s = d.site;
    this.centre = new THREE.Vector3(s.x, d.ground(s.x, s.z), s.z);
    this.bowl = this.centre.clone().setY(this.centre.y + BOWL_Y);
    // The giant's own ash blue, as the stone hand below was.
    const stone = makeSolidMaterial('#b3c0dc', 0, { keep: 0.6 });
    this.paving = new THREE.Mesh(buildPaving(s, d.ground, seed), makeSolidMaterial('#a9b6d2', 0, { keep: 0.6 }));
    // The shrine: a round plinth, the creature you found below in stone on it, and a shallow bowl on its back.
    const plinth: [number, number][] = [[FOOT_R, -1.2], [FOOT_R, PLINTH - 0.14], [FOOT_R - 0.12, PLINTH], [0.02, PLINTH]];
    const bowlY = BOWL_Y - 0.42 - 0.06;
    const bowl: [number, number][] = [[0.3, bowlY - 0.22], [0.5, bowlY - 0.1], [0.66, bowlY + 0.1], [0.6, bowlY + 0.13], [0.42, bowlY], [0.02, bowlY - 0.06]];
    const lathe = (pr: [number, number][]) => new THREE.Mesh(new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(r, y)), 26), stone);
    this.statue = new THREE.Mesh(opts.statue ?? rockhopperStatue(), stone);
    this.statue.scale.setScalar(STATUE);
    this.statue.position.y = PLINTH;
    this.shrine.add(lathe(plinth), this.statue, lathe(bowl));
    // (A dark light, the ring's violet: not one of the spirits' orange ones.)
    const dark = makeDarkLight(1.15);
    this.orb = dark.mesh;
    this.orbMat = dark.glow;
    this.shrine.traverse((o) => { o.frustumCulled = false; });
    for (const m of [this.paving, this.shrine, this.orb]) { m.frustumCulled = false; m.visible = false; }
    this.group.add(this.paving, this.shrine, this.orb, this.crow.group);
    this.crow.group.visible = false;
  }

  /**
   * The lie of it, worked out once the giant is where it will be: the way
   * to the giant (`u`) and across it (`p`), which side the near camera
   * stands (the clearer), and the gap in the ring you come up in line with.
   */
  private plan() {
    if (this.planned) return;
    this.planned = true;
    const g = this.d.giant();
    // (Long gone, in a save from after: the way its walk here ended will do.)
    if (!g) { const w = this.d.site.way, q = w[Math.max(0, w.length - 2)] ?? [this.centre.x + 1, this.centre.z]; this.u.set(q[0] - this.centre.x, 0, q[1] - this.centre.z).normalize(); }
    else this.u.set(g.centre.x - this.centre.x, 0, g.centre.z - this.centre.z).normalize();
    this.p.set(this.u.z, 0, -this.u.x);
    const k = this.pick(this.camNear, [[-7.4, 4.6], [-7.4, -4.6], [-7.4, 5.8], [-7.4, -5.8], [-8.6, 3.6], [-8.6, -3.6]], 2.2, 3);
    this.side = k % 2 ? -1 : 1;
    // The stone rockhopper stands side on to the way you come up and to the giant, its head to the near camera's side.
    this.statue.rotation.y = Math.atan2(this.p.x * this.side, this.p.z * this.side);
    // The gap between two of the ring's stones nearest the side away from the giant: you come up in line with it,
    // so the camera behind you looks in through it rather than at the back of a stone.
    const turn = (Math.PI * 2) / 9, back = Math.atan2(-this.u.z, -this.u.x);
    this.gap = 0.2 + (Math.round((back - 0.2) / turn - 0.5) + 0.5) * turn;
  }

  /** Where the ring's arms set you down when you come up with the light: short of the middle, facing it, the giant beyond. */
  arrival(out: THREE.Vector3) {
    this.plan();
    return out.copy(this.centre).add(v1.set(Math.cos(this.gap) * 5.6, 0, Math.sin(this.gap) * 5.6));
  }
  get arrivalHeading() { return Math.atan2(-Math.cos(this.gap), -Math.sin(this.gap)); }

  /** You've just come up with the light (main calls this as the ring's arms lift you out). */
  begin() {
    if (this.state !== 'none') return;
    this.state = 'held';
    this.wait = 0;
    this.plan();
    this.orbAt.copy(this.d.body.pos).setY(this.d.body.pos.y + 2);
    this.save();
  }

  /** A save from after the light was taken: the ring already shut, and everything as it was left. */
  restore() {
    let st: OfferState = 'held';
    try { const raw = localStorage.getItem(`embla.${this.name}.${this.d.saveKey}`); if (raw === 'placed' || raw === 'given') st = raw; } catch { /* no storage: you still have it */ }
    this.state = st;
    this.plan();
    this.d.ring.seal(true);
    this.orbAt.copy(st === 'held' ? v1.copy(this.d.body.pos).setY(this.d.body.pos.y + 2) : this.bowl);
    if (st === 'given') this.keep(true);
    if (st === 'placed') this.popT = 9;
  }

  /** The giant as the offering leaves it: awake, its mouth shut on the light, smiling. (`now`: at once, a restored save.) */
  private keep(now: boolean) {
    const g = this.d.giant();
    this.eaten = true;
    if (!g) return;
    this.stage();
    g.awake = true;
    g.wide = 0;
    g.look = this.bowl;
    g.mouth = 0;
    g.gulp = 0;
    g.grin = GRIN_KEEP;
    if (now) g.snap();
  }

  private save() {
    try { localStorage.setItem(`embla.${this.name}.${this.d.saveKey}`, this.state); } catch { /* ignore */ }
  }

  /** The shrine is a thing you can't walk through. */
  collide(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    if (!this.d.ring.sealed || this.d.ring.sealK < 0.6) return;
    const dx = pos.x - this.centre.x, dz = pos.z - this.centre.z, dist = Math.hypot(dx, dz), min = FOOT_R + r * 0.8;
    if (dist >= min || dist < 1e-4 || pos.y > this.centre.y + BOWL_Y) return;
    const nx = dx / dist, nz = dz / dist, vn = vel.x * nx + vel.z * nz;
    pos.x += nx * (min - dist);
    pos.z += nz * (min - dist);
    if (vn < 0) { vel.x -= nx * vn; vel.z -= nz * vn; }
  }

  private get off() { return Math.hypot(this.d.body.pos.x - this.centre.x, this.d.body.pos.z - this.centre.z); }

  /** Hands off: from coming up with the light until the giant has it. (The camera is only taken once the light leaves you.) */
  get busy() { return this.t >= 0 || ((this.state === 'held' || this.state === 'placed') && this.off < 40); }

  /** The light leaves your shoulder for the bowl, and the rest follows. */
  private place() {
    this.state = 'placed';
    this.t = 0;
    this.stage();
    this.orbFrom.copy(this.orbAt);
    this.d.sfx.slot(0, true);
    this.d.halt();
    this.save();
  }

  /** Work out where everything happens, from where the giant lies. */
  private stage() {
    if (this.staged) return;
    this.staged = true;
    const g = this.d.giant()!, c = this.centre, gy = this.d.ground;
    this.plan();
    const u = this.u, p = this.p, side = this.side;
    // The camera for the giant: in front of its face and off to one side, about level with it, so the crow is
    // seen flying up and in.
    g.face(v1);
    const fx = v1.x - c.x, fz = v1.z - c.z, along = fx * u.x + fz * u.z, across = fx * p.x + fz * p.z, up = v1.y + CAM_ABOVE - c.y;
    this.pick(this.camFace, [[along - CAM_FRONT, across + CAM_ASIDE * side], [along - CAM_FRONT, across - CAM_ASIDE * side], [along - CAM_FRONT + 8, across + (CAM_ASIDE + 5) * side], [along - CAM_FRONT + 8, across - (CAM_ASIDE + 5) * side]], up, 4);
    // The crow's marks: it lands on the giant's side of the shrine (away from the near camera's side, so it's seen), comes to the bowl, hops up over it, and hangs in the air back out that way.
    this.land.copy(c).addScaledVector(u, 6.8).addScaledVector(p, -side * 1.6);
    this.byBowl.copy(c).addScaledVector(u, 2.15).addScaledVector(p, -side * 0.2);
    for (const m of [this.land, this.byBowl]) m.y = gy(m.x, m.z) + CROW_Y;
    // (Over the bowl its claws, `GRIP` under it, are on the light.)
    this.over.copy(this.bowl).addScaledVector(u, 0.2).setY(this.bowl.y + GRIP - 0.22);
    this.hang.copy(c).addScaledVector(u, 6.5).addScaledVector(p, -side * 0.6).setY(this.over.y + HANG);
    this.atNow.copy(this.bowl);
  }

  /** The best of some places for the camera (`along` the way to the giant, `across` it, `up` over the ring's middle): clear of trunks and the ring's stones. */
  private pick(out: THREE.Vector3, spots: [number, number][], up: number, room: number) {
    const c = this.centre, s = this.d.site;
    let best = -Infinity, chosen = 0;
    for (const [k, [along, across]] of spots.entries()) {
      const x = c.x + this.u.x * along + this.p.x * across, z = c.z + this.u.z * along + this.p.z * across;
      let clear = Math.min(this.d.tree(x, z, 12) - 1, room);
      // The ring's nine stones stand at k/9 turns + 0.2: not behind one, looking toward the giant.
      for (let i = 0; i < 9; i++) {
        const a = 0.2 + (i / 9) * Math.PI * 2, sx = s.x + Math.cos(a) * s.r - x, sz = s.z + Math.sin(a) * s.r - z;
        const fwd = sx * this.u.x + sz * this.u.z, lat = Math.abs(sx * this.p.x + sz * this.p.z);
        if (fwd > 0 && up < 7) clear = Math.min(clear, (lat - 2.2) * 1.5);
        clear = Math.min(clear, Math.hypot(sx, sz) - 2.2);
      }
      const score = clear - k * 0.4;
      if (score > best) { best = score; chosen = k; out.set(x, Math.max(this.d.ground(x, z) + 1.4, c.y + up), z); }
    }
    return chosen;
  }

  /** `mode`: how you're getting about. */
  update(dt: number, mode: string) {
    const T = this.T;
    this.time += dt;
    const ring = this.d.ring, b = this.d.body, c = this.centre;
    const up = this.state !== 'none' && ring.sealed;
    // The shrine comes up out of the ground as the field closes over it; the paving shows as the field draws in.
    const rise = ss(ring.sealK, 0.45, 1), lay = ss(ring.sealK, 0.05, 0.6);
    this.paving.visible = up && lay > 0;
    this.paving.position.y = -0.3 * (1 - lay);
    this.shrine.visible = up && rise > 0;
    this.shrine.position.set(c.x, c.y - (BOWL_Y + 0.6) * (1 - rise) * (1 - rise), c.z);
    this.crow.group.visible = this.state !== 'none' && !this.eaten;
    if (this.state === 'none') return;
    const g = this.d.giant();
    // The giant has got up and gone: what's left here is the shrine.
    if (!g) { this.crow.group.visible = false; this.orb.visible = false; this.after = -1; return; }

    // The shrine is up: a beat, and the light goes to it. (A save from part way through: on from the light in the bowl.)
    if (this.state === 'held' && ring.sealK >= 1 && this.off < 40) {
      this.d.halt();
      if ((this.wait += dt) > PAUSE) this.place();
    } else if (this.state === 'placed' && this.t < 0 && this.off < 40) { this.t = T.set; this.stage(); }

    if (this.t >= 0) this.play(dt, g);
    const bird = this.crow.birds[0];

    // The light: at your shoulder; across to the bowl; in the crow's claws; in through the giant's mouth.
    const t = this.t;
    this.orb.visible = !this.eaten;
    let size = ORB * (1 + 0.07 * Math.sin(this.time * 4.1));
    if (this.state === 'held') {
      const lift = mode === 'ride' ? 2.9 : 2.0;
      v1.set(b.pos.x - Math.sin(b.heading) * 0.55 + Math.cos(b.heading) * 0.5, b.pos.y + lift + 0.08 * Math.sin(this.time * 2.1), b.pos.z - Math.cos(b.heading) * 0.55 - Math.sin(b.heading) * 0.5);
      this.orbAt.lerp(v1, 1 - Math.exp(-(ring.busy ? 30 : 5) * dt));
      size *= 0.6;
    } else if (t < 0 || t < T.atBowl + T.take * SNATCH) {
      // Up off your shoulder and over to the bowl in one slow arc, and it settles there with a bounce.
      v1.copy(this.bowl).setY(this.bowl.y + 0.05 * Math.sin(this.time * 1.7));
      if (t >= 0 && t < T.set) { const k = ss(t, 0.1, T.set * 0.85); this.orbAt.lerpVectors(this.orbFrom, v1, k).setY(this.orbAt.y + Math.sin(k * Math.PI) * 1.3); size *= 0.6 + 0.4 * k; }
      else this.orbAt.copy(v1);
      if (this.popT >= 0 && this.popT < 2) { const k = this.popT; size *= k < 0.12 ? 0.82 + (k / 0.12) * 0.3 : 1 + 0.12 * Math.exp(-k * 7) * Math.cos(k * 22); }
    } else {
      // The crow has it: in its claws, close under it, and hanging a little higher as it grows on the way up.
      const air = ss(t, T.fly + 0.2, T.fly + 1.0), k = ss(t, T.atBowl + T.take * SNATCH, T.has);
      v1.copy(bird.grip).addScaledVector(v2.copy(bird.dir).setY(0).normalize(), 0.3 * (1 - air)).setY(bird.grip.y + THREE.MathUtils.lerp(0.22, 0.35, air));
      this.orbAt.lerp(v1, k);
      // (Small in its claws; flying off it's the light the other crows carry.)
      size *= 1 + (ORB_CROW / ORB - 1) * ss(t, T.fly + 0.3, T.fly + 2.2);
    }
    this.orbSize = size;
    this.orb.position.copy(this.orbAt);
    this.orb.scale.setScalar(size);
    // (Far off in the crow's feet and the giant's hand it has to carry: brighter.)
    this.orbMat.uniforms.uEmissive.value = 0.95 + 0.7 * ss(t, T.fly, T.fly + 1.5);
    if (this.popT >= 0) this.popT += dt;

    // The crow: asleep on the giant's head until it's sent for.
    g.crown(this.perch);
    this.perch.y += 0.9;
    this.crow.update(dt, (_i, o) => o.copy(this.perch), this.perch, g.facing);

    // After: the smile settles to the small one it keeps.
    if (this.after >= 0) {
      this.after += dt;
      g.grin = THREE.MathUtils.lerp(1, GRIN_KEEP, ss(this.after, 2, 9));
      if (this.after > 9) this.after = -1;
    }
  }

  /** One frame of the sequence. */
  private play(dt: number, g: Giant) {
    const T = this.T;
    const t0 = this.t, t = (this.t += dt), fx = this.d.sfx, crow = this.crow, bird = crow.birds[0], b = this.d.body;
    const passed = (k: number) => t0 < k && t >= k;
    this.d.halt();
    // You turn to watch: the shrine, the crow while it's down here, then the giant.
    {
      const look = t < T.come ? this.bowl : t < T.wake ? bird.pos : g.centre;
      let dh = Math.atan2(look.x - b.pos.x, look.z - b.pos.z) - b.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      b.heading += dh * (1 - Math.exp(-1.6 * dt));
    }
    if (passed(T.set * 0.85)) { this.popT = 0; fx.chirp(); this.d.puff(this.bowl, 6, 0.12, 1.6); }
    // Down off its head, in a long glide, to land on the far side of the shrine.
    if (passed(T.come)) {
      v1.copy(this.land).addScaledVector(this.u, 16).setY(this.land.y + 2.2);
      bird.grab = 0;
      crow.send(0, 'dive', v1, this.land, T.dive, 'stand');
      fx.whoosh();
    }
    if (passed(T.landed)) this.d.puff(v1.copy(this.land).setY(this.land.y - CROW_Y + 0.2), 6, 0.16, 2);
    // It walks (the walk itself is the bird's own: `Birds`), a pat at each foot put down.
    const foot = Math.floor(bird.stride / Math.PI + 0.5);
    if (foot !== this.foot && bird.state === 'stand') fx.step();
    this.foot = foot;
    const walk = (from: THREE.Vector3, to: THREE.Vector3, since: number, dur: number, carry: number) => {
      // (Off at a trot and slowing to a stop: out of a landing, it keeps coming.)
      const x = THREE.MathUtils.clamp(since / dur, 0, 1);
      bird.pos.lerpVectors(from, to, THREE.MathUtils.lerp(ss(x, 0, 1), x * (2 - x), carry));
      bird.pos.y = this.d.ground(bird.pos.x, bird.pos.z) + CROW_Y;
    };
    const hop = T.atBowl + CROUCH_T, snatch = T.atBowl + T.take * SNATCH;
    const face = (to: THREE.Vector3, k: number) => { v1.set(to.x - bird.pos.x, 0, to.z - bird.pos.z).normalize(); bird.dir.lerp(v1, k).setY(0).normalize(); };
    if (bird.state === 'stand') {
      const e = 1 - Math.exp(-7 * dt);
      if (t < T.atBowl) { walk(this.land, this.byBowl, t - T.landed, T.walk, 1); face(this.bowl, e); }
      else {
        // It sinks on its legs, to hop.
        bird.reach = -CROUCH * ss(t, T.atBowl, hop);
        bird.pos.copy(this.byBowl).setY(this.byBowl.y + bird.reach);
        face(this.bowl, e);
      }
    }
    // Up off the ground, wings out, its claws coming forward and down on to the light in the bowl...
    if (passed(hop)) { bird.state = 'hover'; bird.reach = 0; fx.whoosh(); }
    if (bird.state === 'hover' && t < T.fly) {
      bird.grab = ss(t, hop, snatch);
      if (t < snatch) {
        const k = (t - hop) / (snatch - hop);
        bird.pos.lerpVectors(this.byBowl, this.over, k).setY(THREE.MathUtils.lerp(this.byBowl.y, this.over.y, k * (2 - k)));
        face(this.bowl, 1 - Math.exp(-7 * dt));
      } else {
        // ...and it has it: back and up, beating on the spot, and round to face the giant.
        const k = ss(t, snatch, snatch + BACK_OFF);
        bird.pos.lerpVectors(this.over, this.hang, k).setY(bird.pos.y + 0.18 * Math.sin((t - snatch) * 2.6) * k);
        const a = Math.atan2(bird.dir.x, bird.dir.z);
        let da = Math.atan2(g.centre.x - bird.pos.x, g.centre.z - bird.pos.z) - a;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const to = a + da * (1 - Math.exp(-2.2 * ss(t, snatch + 0.3, snatch + 1) * dt));
        bird.dir.set(Math.sin(to), 0, Math.cos(to));
      }
    }
    if (passed(snatch)) fx.snatch();
    // The giant: its eyes open; it sees what the crow has; and its mouth opens, wide.
    if (passed(T.wake)) { g.awake = true; g.wide = 1; g.look = this.lookAt.copy(this.bowl); fx.stomp(); }
    // (It watches the crow until that takes off, and then holds still for it: its mouth is what the crow is flying at.)
    if (t >= T.wake && t < T.fly) this.lookAt.lerp(bird.pos, 1 - Math.exp(-3 * dt));
    if (passed(T.open)) { g.mouth = 1; fx.whoosh(); }
    // And the crow flies up and straight in, the light under it.
    // (Lined up out in front of the mouth, then along that line through the lips and on to the back of the hollow.)
    if (passed(T.fly)) {
      crow.send(0, 'climb', g.throat(v1, LINE_UP), g.throat(v2, DEEP_IN), T.climb, 'hover');
      g.gulp = 1;
      fx.whoosh();
    }
    if (bird.state === 'climb') { g.throat(bird.b, LINE_UP); g.throat(bird.c, DEEP_IN); }
    // Its light lights the hollow as it goes in.
    if (t >= T.fly && !this.eaten) g.gulpAt.copy(this.orbAt);
    if (passed(T.shut)) {
      // It's in: the mouth shuts behind it.
      g.mouth = 0;
      g.wide = 0.3;
      g.look = this.bowl;
      // It has it. From here on a reload finds it given.
      this.state = 'given';
      this.save();
    }
    if (passed(T.closed)) {
      // Gone: light and all. (It doesn't come out again.)
      this.eaten = true;
      g.gulp = 0;
      fx.thud();
    }
    if (passed(T.smile)) { g.grin = 1; fx.fanfare(0.1); }
    if (t >= T.end) { this.t = -1; this.after = 0; this.afterYaw = this.arrivalHeading + Math.PI; this.keep(false); }
  }

  /** The camera for this frame while the offering has it. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3; fov: number } | null {
    if (this.t < 0) return null;
    const T = this.T;
    const t = this.t, g = this.d.giant(), bird = this.crow.birds[0];
    if (!g) return null;
    let fov = FOV;
    if (t < T.cut) {
      // Over your shoulder: the shrine, the crow coming down to it out of the giant, and the giant beyond.
      this.pos.copy(this.camNear);
      v1.copy(this.bowl).setY(this.bowl.y - 0.5).lerp(bird.pos, t < T.landed ? 0.35 * ss(t, T.come, T.landed) : 0.5);
      if (t < 0.05) this.atNow.copy(v1);
      this.atNow.lerp(v1, 0.06);
      this.at.copy(this.atNow);
    } else {
      // In front of its face and to one side, one place. Close as its eyes open; back as the mouth opens and
      // the crow flies up into frame and in; close again on the smile.
      this.pos.copy(this.camFace);
      const back = ss(t, T.open - 0.4, T.fly + 0.6), close = ss(t, T.shut + 0.2, T.smile + 0.8);
      g.face(v1).setY(v1.y - 0.5);
      g.mouthAt(v2);
      this.at.copy(v1).lerp(v2.lerp(bird.pos, this.eaten ? 0 : 0.3 * (1 - ss(t, T.fly + T.climb * 0.5, T.gone))), back).lerp(v1, close);
      fov = THREE.MathUtils.lerp(THREE.MathUtils.lerp(FOV_FACE, FOV_WIDE, back), FOV_SMILE, close);
    }
    return { pos: this.pos, at: this.at, fov };
  }

  /** Dev: straight to a step (`held`: up with the light, the shrine risen; `placed`: the light in the bowl; `given`). */
  debug(to: OfferState) {
    this.d.ring.seal(true);
    this.staged = false;
    this.t = -1;
    this.after = -1;
    this.wait = 0;
    const g = this.d.giant();
    if (g) { g.awake = false; g.mouth = 0; g.gulp = 0; g.grin = 0; g.wide = 0; g.look = null; g.snap(); }
    this.eaten = false;
    this.crow.birds[0].state = 'roost';
    this.state = to;
    if (to === 'none') return;
    this.orbAt.copy(to === 'held' ? this.d.body.pos : this.bowl);
    if (to === 'given') this.keep(true);
    this.save();
  }

  /** Dev: the sequence's clock (seconds since the light left you, -1 when it isn't playing), and its cues. */
  get clock() { return this.t; }
  get cues() { return this.T; }
  /** Dev: where the shrine is, and the light. */
  get shrineAt() { return this.centre; }
  get lightAt() { return this.orbAt; }
  get lightSize() { return this.orbSize; }

  dispose() {
    this.crow.dispose();
    this.group.removeFromParent();
  }
}
