import * as THREE from 'three';
import { mulberry32 } from '../core/rng';
import { makeDarkLight } from '../dungeon/darkLight';
import { makeSolidMaterial } from '../gfx/materials';
import { rockhopperStatue } from '../mobs/rockhopper';
import type { Body } from '../player/movement';
import type { Sfx } from '../story/audio';
import type { Beacons } from '../story/beacons';
import type { Tower } from '../world/towers';
import type { DungeonSite } from '../world/worldgen';
import { Birds, CLAW } from './birds';
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
// rockhopper on a plinth, with a bowl on its back. You get down off
// whatever brought you up, walk to it with the light in your mittens and
// hold it up; it leaves them and settles in the bowl. Then the ground heaves
// (the owner, 2026-10-07): you're knocked back and run out through the ring's
// stones, and turn to watch a beacon tower come up out of the ring under the
// shrine and carry it up on its head, the light in the bowl. Its spirit
// wakes: it is a lit tower from then on, one you can go up into and fly from.
// The rest is as it was, from up there. One of the giant's crows comes down off
// its head in one swoop, levels out, and takes the light in its claws as it
// passes; it pulls up and hangs in the air with it, turning to the giant.
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
  /** Get down off it, if you're on anything. */
  dismount(): void;
  /** Where your two mittens are this frame: where the light sits while it's yours. */
  hands(out: THREE.Vector3): THREE.Vector3;
  /** How far the nearest standing tree's trunk is from a point (Infinity if none within `max`). */
  tree(x: number, z: number, max: number): number;
  /** The tower that comes up out of this ring (`WorldGen.ringTowers`), and the towers' keeper. */
  tower: Tower;
  towers: Pick<Beacons, 'raise' | 'stand' | 'bury' | 'release' | 'isUp' | 'crown'>;
  /** Whatever creature is standing within `r` of the ring's middle is put by `to`, out of the tower's way. */
  clear(r: number, to: THREE.Vector3): void;
  saveKey: string;
}

/**
 * The sequence, in seconds from when the light leaves your mittens. It
 * goes to the bowl (`set`); the ground heaves (`heave`) and the tower takes
 * `rise` to come up under the shrine, and stands, lit (`up`); the crow leaves the giant's head at `come` and
 * takes `dive` to swoop down, level out and be over the bowl, where it
 * takes the light in its claws without stopping (`has`); it pulls up and
 * round, and hangs in the air with it. The giant's eyes open at `wake` (the camera cuts to
 * its face `cut` later) and its mouth at `open`; the crow takes off at `fly` and is
 * `climb` getting to the back of the hollow (`gone`), in through the lips
 * a second or so before; the mouth starts to shut behind it at `shut` and
 * is shut at `closed`; the smile comes at `smile`; `end`.
 */
const timing = (set: number, rise: number, wait: number, dive: number, gaps: [number, number, number, number], climb: number, smileAfter: number, hold: number) => {
  const heave = set + 0.5, up = heave + rise, come = up + wait;
  const has = come + dive;
  const wake = has + gaps[0], cut = wake + gaps[1], open = cut + gaps[2], fly = open + gaps[3];
  const gone = fly + climb, shut = gone - 0.7, closed = shut + 0.75, smile = gone + smileAfter, end = smile + hold;
  return { set, heave, rise, up, come, dive, has, wake, cut, open, fly, climb, gone, shut, closed, smile, end };
};
const T = timing(1.7, 5.6, 0.9, 4.3, [0.4, 1.0, 1.7, 1.4], 4.8, 1.8, 3.4);
export type OfferTiming = typeof T;
/**
 * The same, told quickly (dungeon 2's: the owner found the first at risk of
 * wearing thin): about 18 s from the light leaving you, 22 from coming up.
 */
export const OFFER_SHORT: OfferTiming = timing(1.3, 4.4, 0.6, 3.0, [0.2, 0.8, 1.0, 0.9], 3.6, 1.2, 2.2);

/** What differs from one dungeon's offering to the next. Left out: dungeon 1's. */
export interface OfferOpts {
  /** Its save key's name (`embla.<name>.<seed>`). */
  name?: string;
  /** The creature of the dungeon in stone, for the shrine: position and normal, feet at y = 0. */
  statue?: THREE.BufferGeometry;
  timing?: OfferTiming;
}
/** A beat after the shrine is up before you get down (s). */
const PAUSE = 0.7;
/** Making the offering: how far from the shrine's middle you stand to (m), the pace you walk up at (m/s), how long you hold the light up before it leaves you (s), and the longest the walk may take (s). */
const MARK = 2.7, PACE = 1.5, RAISE = 1.1, WALK_MAX = 7;
/** The shrine: its plinth's radius (what you can't walk through) and height, how big the stone rockhopper is beside a live one, and how far over the ground the light sits in the bowl on its back. */
const FOOT_R = 1.5, PLINTH = 0.5, STATUE = 1.35, BOWL_Y = PLINTH + STATUE * 1.33 + 0.42;
/** The tower coming up: how far from the ring's middle you watch it from (m: out through the stones, in front of its door), how long you stumble back before you turn and run (s) and how fast (m/s), how hard it shakes (m), and the camera behind you: how far back, aside and up (m). */
const WATCH = 17.5, KNOCK = 0.4, RUN = 6.6, SHAKE = 0.07, RISE_BACK = 3.2, RISE_ASIDE = 4.6, RISE_UP = 0.9;
/** How long the close camera stays as the ground heaves (s), how long the low one stays once the tower is up (s), and the one up by the shrine for the crow: how far back from the bowl (away from the giant), aside, and over it (m). */
const HEAVE_HOLD = 1.0, RISE_HOLD = 1.3, TOP_BACK = 8.2, TOP_ASIDE = 4.8, TOP_UP = 0.4;
/** The crow's swoop: how far out from the bowl it's down and level (m), how far round from the giant toward the near camera it comes in (rad), how long before the bowl its claws start down (s), and how far over the bowl it hangs afterwards (m). */
const LEVEL = 20, ASKEW = 0.7, CLAWS = 0.8, HANG = 3.5;
/** The camera for the giant's face: how far in front of it (toward the ring), how far to one side, and how far above (m). */
const CAM_FRONT = 40, CAM_ASIDE = 15, CAM_ABOVE = 2;
/** The light's size in your mittens and in the bowl, and under the crow (as the lights the other crows carry). */
const ORB = 0.34, ORB_CROW = 0.95;
/** The cameras' field of view: by the shrine, close on the giant's face as it wakes, back for the crow flying in, and on the smile. */
const FOV = 36, FOV_RISE = 64, FOV_TOP = 40, FOV_FACE = 20, FOV_WIDE = 40, FOV_SMILE = 25;
/** The crow's way in: how far out in front of the lips it lines up, and how far past the middle of the head it gets (see `Giant.throat`). */
const LINE_UP = 5, DEEP_IN = -0.2;
/** The crow flies in this far over the middle of the mouth (m): the light hangs under its feet, and it's the two of them together that go through the middle, clear of both lips. */
const OVER_MID = 1.0;
/** The grin it keeps. */
const GRIN_KEEP = 0.55;

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const e1 = new THREE.Euler();
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
  /** Seconds since the light left your mittens, while the rest plays (else -1). */
  private t = -1;
  private time = 0;
  /** How long the shrine has stood there with you still holding the light (s). */
  private wait = 0;
  /** How long you've held the light up to the shrine (s; -1: not there yet), and where you stand to do it. */
  private lift = -1;
  private mark = new THREE.Vector3();
  /** The near camera has you (its aim is eased from where it started). */
  private watching = false;
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
  /** Where you watch the tower come up from, the camera for it, and whether you've got there. */
  private watch = new THREE.Vector3();
  private camRise = new THREE.Vector3();
  /** The camera up by the shrine once the tower has it (set as it's first wanted), and which camera had the last frame (a cut starts its aim afresh). */
  private camTop = new THREE.Vector3();
  private topSet = false;
  private shot = '';
  private there = false;
  private dustT = 0;
  private camFace = new THREE.Vector3();
  /** The crow's swoop: level from `run` to `over` the bowl, on by way of `pull` and up to `hang`. Its speed down (m/s), and when it came to hang (-1: not yet). */
  private run = new THREE.Vector3();
  private over = new THREE.Vector3();
  private pull = new THREE.Vector3();
  private hang = new THREE.Vector3();
  private speed = 0;
  private hung = -1;
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
    // (The shrine is turned as the tower's head is: it rides on it.)
    const tw = this.d.tower;
    this.statue.rotation.y = Math.atan2(this.p.x * this.side, this.p.z * this.side) - tw.yaw;
    // The gap between two of the ring's stones on the side away from the giant, the one the tower faces out through:
    // you come up in line with it, so the camera behind you looks in through it rather than at the back of a stone.
    this.gap = Math.atan2(Math.cos(tw.yaw), Math.sin(tw.yaw));
    const gx = Math.cos(this.gap), gz = Math.sin(this.gap);
    this.mark.copy(this.centre).add(v1.set(gx * MARK, 0, gz * MARK));
    this.watch.copy(this.centre).add(v1.set(gx * WATCH, 0, gz * WATCH));
    this.watch.y = this.d.ground(this.watch.x, this.watch.z);
    // The camera for the tower coming up: low on the ground behind you and to one side, inside the ring's own
    // clearing (further back it's in the trees), looking steeply up at it. The place with the clearest line to it.
    let best = -Infinity;
    for (const [n, aside] of [RISE_ASIDE, -RISE_ASIDE, RISE_ASIDE * 1.6, -RISE_ASIDE * 1.6, RISE_ASIDE * 0.5, -RISE_ASIDE * 0.5].entries()) {
      const sd = aside * this.side;
      const x = this.watch.x + gx * RISE_BACK - gz * sd, z = this.watch.z + gz * RISE_BACK + gx * sd;
      let clear = Math.min(this.d.tree(x, z, 12), 5);
      for (let k = 1; k <= 4; k++) clear = Math.min(clear, this.d.tree(x + (this.centre.x - x) * k * 0.18, z + (this.centre.z - z) * k * 0.18, 12) - 0.5);
      // (Nor right behind one of the ring's stones.)
      for (let i = 0; i < 9; i++) { const a = 0.2 + (i / 9) * Math.PI * 2; clear = Math.min(clear, Math.hypot(this.centre.x + Math.cos(a) * this.d.site.r - x, this.centre.z + Math.sin(a) * this.d.site.r - z) - 3); }
      if (clear - n * 0.3 > best) { best = clear - n * 0.3; this.camRise.set(x, this.d.ground(x, z) + RISE_UP, z); }
    }
  }

  /** Where the ring's arms set you down when you come up with the light: short of the middle, facing it, the giant beyond. */
  arrival(out: THREE.Vector3) {
    this.plan();
    // (Once the tower is up: where you watched it from.)
    if (this.state === 'placed' || this.state === 'given') return out.copy(this.watch);
    return out.copy(this.centre).add(v1.set(Math.cos(this.gap) * 5.6, 0, Math.sin(this.gap) * 5.6));
  }
  get arrivalHeading() { return Math.atan2(-Math.cos(this.gap), -Math.sin(this.gap)); }

  /** You've just come up with the light (main calls this as the ring's arms lift you out). */
  begin() {
    if (this.state !== 'none') return;
    this.state = 'held';
    this.wait = 0;
    this.lift = -1;
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
    // (The light in the bowl: the tower is up under it.)
    if (st !== 'held') { this.d.towers.stand(this.d.tower.id, true); this.there = true; this.seat(); }
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
    if (!this.d.ring.sealed || this.d.ring.sealK < 0.6 || this.d.towers.isUp(this.d.tower.id)) return;
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

  /** The light is yours to carry: in both mittens (1), or held up in them to the shrine (2, and until it's well on its way). */
  get carrying(): 0 | 1 | 2 { return this.state === 'held' ? (this.lift >= 0 ? 2 : 1) : this.t >= 0 && this.t < this.T.set * 0.35 ? 2 : 0; }

  /**
   * Making the offering, hands off: down off whatever brought you up, a
   * slow walk to the shrine with the light in your mittens, and there you
   * hold it up.
   */
  private approach(dt: number, mode: string) {
    const b = this.d.body;
    this.wait += dt;
    if (this.wait < PAUSE) { this.d.halt(); return; }
    if (mode === 'ride') { this.d.halt(); this.d.dismount(); return; }
    this.stage();
    const dx = this.mark.x - b.pos.x, dz = this.mark.z - b.pos.z, far = Math.hypot(dx, dz);
    const turn = (x: number, z: number, rate: number) => {
      let dh = Math.atan2(x, z) - b.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      b.heading += dh * (1 - Math.exp(-rate * dt));
    };
    if (this.lift < 0 && far > 0.15 && this.wait < PAUSE + WALK_MAX) {
      if (!b.grounded) return;
      // (A walk's own drag takes a fifth off what it's given. From far off, a reload: quicker, to be there in good time.)
      const pace = Math.min(Math.max(PACE, far / 3.5), 0.4 + far * 3) * 1.25;
      b.vel.x = (dx / far) * pace;
      b.vel.z = (dz / far) * pace;
      turn(dx, dz, 8);
      return;
    }
    // There: still, facing it, the light held up. And it goes.
    this.d.halt();
    this.lift = Math.max(0, this.lift) + dt;
    turn(this.centre.x - b.pos.x, this.centre.z - b.pos.z, 6);
    if (this.lift > RAISE) this.place();
  }

  /** The light leaves your mittens for the bowl, and the rest follows. */
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
    const g = this.d.giant()!, c = this.centre;
    this.plan();
    const u = this.u, p = this.p, side = this.side;
    // The camera for the giant: in front of its face and off to one side, about level with it, so the crow is
    // seen flying up and in.
    g.face(v1);
    const fx = v1.x - c.x, fz = v1.z - c.z, along = fx * u.x + fz * u.z, across = fx * p.x + fz * p.z, up = v1.y + CAM_ABOVE - c.y;
    this.pick(this.camFace, [[along - CAM_FRONT, across + CAM_ASIDE * side], [along - CAM_FRONT, across - CAM_ASIDE * side], [along - CAM_FRONT + 8, across + (CAM_ASIDE + 5) * side], [along - CAM_FRONT + 8, across - (CAM_ASIDE + 5) * side]], up, 4);
    this.atNow.copy(this.bowl);
  }

  /** The crow's marks, from where the bowl is (up on the tower by the time it's sent for). */
  private marks() {
    const c = this.centre, u = this.u, p = this.p, side = this.side;
    this.seat(false);
    // It comes in level from the giant's side and round toward
    // the near camera's: across the view and away, not at you. (Over the bowl its claws, `CLAW` under it, are on
    // the light.) Then on, up and round on the far side, to hang there.
    const turn = (Math.PI * 2) / 9, want = Math.atan2(u.z, u.x) - side * ASKEW, a = 0.2 + (Math.round((want - 0.2) / turn - 0.5) + 0.5) * turn;
    v2.set(Math.cos(a), 0, Math.sin(a));
    this.over.copy(this.bowl).addScaledVector(v2, 0.3).setY(this.bowl.y + CLAW + 0.8 * ORB);
    this.run.copy(this.over).addScaledVector(v2, LEVEL);
    this.pull.copy(this.over).addScaledVector(v2, -5).setY(this.over.y + 2);
    this.hang.copy(c).addScaledVector(u, 1).addScaledVector(p, -side * 7.5).setY(this.over.y + HANG);
  }

  /** Where the shrine is this frame, and so the bowl: on the ground where it came up, or on the tower's head once that has it. (`bob`: with the head's hop.) */
  private seat(bob = true) {
    const c = this.centre, tw = this.d.tower, sh = this.shrine;
    const rise = ss(this.d.ring.sealK, 0.45, 1);
    sh.position.set(c.x, c.y - (BOWL_Y + 0.6) * (1 - rise) * (1 - rise), c.z);
    sh.rotation.set(0, tw.yaw, 0, 'YXZ');
    if (this.d.towers.isUp(tw.id) && this.d.towers.crown(tw.id, v1, e1, bob).y > c.y) { sh.position.copy(v1); sh.rotation.copy(e1); }
    this.bowl.set(0, BOWL_Y, 0).applyEuler(sh.rotation).add(sh.position);
  }

  /** Knocked back from the shrine as the ground heaves, then out through the stones at a run to where you watch from. */
  private flee(dt: number, mode: string) {
    const b = this.d.body, T = this.T, since = this.t - T.heave;
    const dx = this.watch.x - b.pos.x, dz = this.watch.z - b.pos.z, far = Math.hypot(dx, dz);
    // (On something, a save from part way: it stands where it is. And if anything held you up, you're there by the time the tower is.)
    if (mode !== 'walk' || far < 0.6) { this.there = true; return; }
    if (this.t > T.up - 0.4) { b.pos.set(this.watch.x, this.watch.y, this.watch.z); b.vel.set(0, 0, 0); this.there = true; return; }
    if (since < KNOCK) {
      // Backwards, still facing it.
      b.vel.x = Math.cos(this.gap) * 5.5;
      b.vel.z = Math.sin(this.gap) * 5.5;
      return;
    }
    const pace = Math.min(RUN, 0.8 + far * 3) * 1.25;
    b.vel.x = (dx / far) * pace;
    b.vel.z = (dz / far) * pace;
    let dh = Math.atan2(dx, dz) - b.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    b.heading += dh * (1 - Math.exp(-12 * dt));
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
    const ring = this.d.ring;
    const up = this.state !== 'none' && ring.sealed;
    // The shrine comes up out of the ground as the field closes over it; the paving shows as the field draws in.
    // (And later the tower comes up under it, and it's on that.)
    const rise = ss(ring.sealK, 0.45, 1), lay = ss(ring.sealK, 0.05, 0.6);
    this.paving.visible = up && lay > 0;
    this.paving.position.y = -0.3 * (1 - lay);
    this.shrine.visible = up && rise > 0;
    this.seat();
    this.crow.group.visible = this.state !== 'none' && !this.eaten;
    if (this.state === 'none') return;
    const g = this.d.giant();
    // The giant has got up and gone: what's left here is the shrine.
    if (!g) { this.crow.group.visible = false; this.orb.visible = false; this.after = -1; return; }

    // The shrine is up: a beat, and you take the light to it. (A save from part way through: on from the light in the bowl.)
    if (this.state === 'held' && ring.sealK >= 1 && this.off < 40) this.approach(dt, mode);
    else if (this.state === 'placed' && this.t < 0 && this.off < 40) { this.t = T.up; this.stage(); }

    if (this.t >= 0) this.play(dt, g, mode);
    const bird = this.crow.birds[0];

    // The light: in your mittens; up to the bowl; in the crow's claws; in through the giant's mouth.
    const t = this.t;
    this.orb.visible = !this.eaten;
    let size = ORB * (1 + 0.07 * Math.sin(this.time * 4.1));
    if (this.state === 'held') {
      this.d.hands(this.orbAt);
      size *= 0.6;
    } else if (t < T.has) {
      // Up out of your mittens by itself (you don't throw it) and over to the bowl in one slow arc, and it settles there with a bounce.
      v1.copy(this.bowl).setY(this.bowl.y + 0.05 * Math.sin(this.time * 1.7));
      if (t >= 0 && t < T.set) { const k = ss(t, 0.1, T.set * 0.85); this.orbAt.lerpVectors(this.orbFrom, v1, k).setY(this.orbAt.y + Math.sin(k * Math.PI) * 0.7); size *= 0.6 + 0.4 * k; }
      else this.orbAt.copy(v1);
      if (this.popT >= 0 && this.popT < 2) { const k = this.popT; size *= k < 0.12 ? 0.82 + (k / 0.12) * 0.3 : 1 + 0.12 * Math.exp(-k * 7) * Math.cos(k * 22); }
    } else {
      // The crow has it: in its claws, close under it, and hanging a little higher as it grows on the way up.
      const air = ss(t, T.fly + 0.2, T.fly + 1.0);
      // (Small in its claws; flying off it's the light the other crows carry.)
      size *= 1 + (ORB_CROW / ORB - 1) * ss(t, T.fly + 0.3, T.fly + 2.2);
      Birds.clasp(bird, size, this.orbAt).addScaledVector(v2.copy(bird.dir).setY(0).normalize(), 0.3 * (1 - air));
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
  private play(dt: number, g: Giant, mode: string) {
    const T = this.T;
    const t0 = this.t, t = (this.t += dt), fx = this.d.sfx, crow = this.crow, bird = crow.birds[0], b = this.d.body;
    const passed = (k: number) => t0 < k && t >= k;
    const tw = this.d.tower, tws = this.d.towers;
    // The ground heaves under the shrine: whatever stood by is out of the way, and so are you.
    if (passed(T.heave)) { fx.stomp(); this.there = false; this.topSet = false; this.d.clear(WATCH + 2, v1.copy(this.watch).addScaledVector(this.p, -this.side * 7)); this.d.puff(v1.copy(this.centre).setY(this.centre.y + 0.4), 16, 0.6, 5); }
    const fleeing = t >= T.heave && !this.there;
    if (fleeing) this.flee(dt, mode); else this.d.halt();
    // The tower comes up under it, slowly at first, shaking, dust rolling off its stones; and stands, and its spirit wakes.
    if (t >= T.heave && t < T.up) {
      const x = (t - T.heave) / T.rise, k = x * x * (3 - 2 * x);
      tws.raise(tw.id, 0.04 * x + 0.96 * k * k ** 0.35, SHAKE * Math.min(1, x * 6) * ss(1 - x, 0, 0.18));
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.16;
        const a = this.time * 7.3, r = 2 + 7 * k;
        this.d.puff(v1.set(this.centre.x + Math.cos(a) * r, this.d.ground(this.centre.x + Math.cos(a) * r, this.centre.z + Math.sin(a) * r) + 0.5, this.centre.z + Math.sin(a) * r), 5, 0.55, 2.6);
        if (Math.floor(t / 0.8) !== Math.floor((t - 0.16) / 0.8)) fx.thud();
      }
    }
    if (passed(T.up)) { tws.stand(tw.id); fx.stomp(); fx.shimmer(); this.d.puff(v1.copy(this.centre).setY(this.centre.y + 0.6), 20, 0.7, 9); }
    // You turn to watch: the shrine, the crow while it's down here, then the giant.
    if (!fleeing) {
      const look = t < T.come ? this.bowl : t < T.wake ? bird.pos : g.centre;
      let dh = Math.atan2(look.x - b.pos.x, look.z - b.pos.z) - b.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      b.heading += dh * (1 - Math.exp(-1.6 * dt));
    }
    if (passed(T.set * 0.85)) { this.popT = 0; fx.chirp(); this.d.puff(this.bowl, 6, 0.12, 1.6); }
    // Down off its head in one long swoop, level by the time it's at the ring's stones, and over the bowl.
    // (A save from part way: it comes the quicker, to be there on the beat.)
    if (bird.state === 'roost' && t >= T.come && t < T.has) {
      const dur = T.has - t;
      this.marks();
      bird.grab = bird.fore = 0;
      bird.holds = false;
      this.hung = -1;
      // (`dive` once there: held over the bowl the frame it's early.)
      this.speed = crow.send(0, 'dive', this.run, this.over, dur, 'dive') / dur;
      fx.whoosh();
    }
    // Its claws come down for the light...
    if (bird.state === 'dive') bird.grab = ss(t, T.has - CLAWS, T.has - 0.15);
    // ...feet first, out ahead of it as an eagle's for a fish, and snapped back under it as they close on it...
    bird.fore = Birds.reach(t, T.has);
    // ...and it has it, without stopping: on, up and round, losing its speed, to beat on the spot.
    if (passed(T.has)) {
      bird.dur = (2 * crow.send(0, 'climb', this.pull, this.hang, 1, 'hover')) / Math.max(this.speed, 6);
      bird.stall = true;
      bird.holds = true;
      fx.snatch();
    }
    if (bird.state === 'hover' && t > T.has && t < T.fly) {
      // There it hangs, and comes round to face the giant.
      if (this.hung < 0) this.hung = t;
      bird.pos.copy(this.hang).setY(this.hang.y + 0.18 * Math.sin((t - this.hung) * 2.6));
      const a = Math.atan2(bird.dir.x, bird.dir.z);
      let da = Math.atan2(g.centre.x - bird.pos.x, g.centre.z - bird.pos.z) - a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const to = a + da * (1 - Math.exp(-2.2 * dt));
      bird.dir.set(Math.sin(to), 0, Math.cos(to));
    }
    // The giant: its eyes open; it sees what the crow has; and its mouth opens, wide.
    if (passed(T.wake)) { g.awake = true; g.wide = 1; g.look = this.lookAt.copy(this.bowl); fx.stomp(); }
    // (It watches the crow until that takes off, and then holds still for it: its mouth is what the crow is flying at.)
    if (t >= T.wake && t < T.fly) this.lookAt.lerp(bird.pos, 1 - Math.exp(-3 * dt));
    if (passed(T.open)) { g.mouth = 1; fx.whoosh(); }
    // And the crow flies up and straight in, the light under it.
    // (Lined up out in front of the mouth, then along that line through the lips and on to the back of the hollow.)
    if (passed(T.fly)) {
      crow.send(0, 'climb', g.throat(v1, LINE_UP).setY(v1.y + OVER_MID), g.throat(v2, DEEP_IN).setY(v2.y + OVER_MID), T.climb, 'hover');
      g.gulp = 1;
      fx.whoosh();
    }
    if (bird.state === 'climb' && t >= T.fly) { g.throat(bird.b, LINE_UP).y += OVER_MID; g.throat(bird.c, DEEP_IN).y += OVER_MID; }
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
    if (t >= T.end) { tws.release(tw.id); this.t = -1; this.after = 0; this.afterYaw = this.arrivalHeading + Math.PI; this.keep(false); }
  }

  /** The camera for this frame while the offering has it. */
  cinematic(): { pos: THREE.Vector3; at: THREE.Vector3; fov: number } | null {
    const T = this.T;
    const t = this.t, bird = this.crow.birds[0];
    // (From when you get down to make the offering.)
    const coming = this.state === 'held' && this.wait >= PAUSE && this.staged;
    // (Not asked for the giant until then: asking stands one asleep by the ring, and before any offering it may be
    // still on its way there. Asked every frame, it was laid down at the ring the moment the visit's camera let go.)
    if (t < 0 && !coming) { this.watching = false; return null; }
    const g = this.d.giant();
    if (!g) { this.watching = false; return null; }
    let fov = FOV;
    // Four cameras, a cut between each: close by the shrine while the light goes to it and the ground first heaves;
    // low behind you for the tower coming up; up by the shrine on its head for the crow; and the giant's face.
    const top = Math.min(T.up + RISE_HOLD, T.come - 0.1);
    const shot = t < T.heave + HEAVE_HOLD ? 'near' : t < top ? 'rise' : t < T.cut ? 'top' : 'face';
    const cut = shot !== this.shot || !this.watching;
    this.shot = shot;
    this.watching = true;
    if (shot === 'rise') {
      // The tower: from low behind where you run to, looking up at it; you come out toward the camera and turn.
      this.pos.copy(this.camRise);
      v1.copy(this.centre).setY(THREE.MathUtils.lerp(this.centre.y + 1.5, Math.max(this.bowl.y, this.centre.y + 8), 0.36));
      if (cut) this.atNow.copy(v1);
      this.atNow.lerp(v1, 0.08);
      this.at.copy(this.atNow);
      fov = FOV_RISE;
    } else if (shot !== 'face') {
      // From behind and beside where you came up: you and the shrine, and it starting to lift. And the same
      // again from up in the air once the tower has it: the shrine close, the crow coming down over it out of
      // the giant, taking the light, and the giant beyond.
      if (shot === 'top' && !this.topSet) {
        this.topSet = true;
        this.d.towers.crown(this.d.tower.id, this.camTop, e1, false);
        this.camTop.addScaledVector(this.u, -TOP_BACK).addScaledVector(this.p, TOP_ASIDE * this.side).setY(this.camTop.y + BOWL_Y + TOP_UP);
      }
      this.pos.copy(shot === 'top' ? this.camTop : this.camNear);
      v1.copy(this.bowl).setY(this.bowl.y - 0.5);
      if (t < 0) v1.lerp(v2.copy(this.d.body.pos).setY(this.d.body.pos.y + 1.2), 0.5);
      else if (shot === 'top') v1.lerp(bird.pos, t < T.has ? 0.35 * ss(t, T.come, T.has) : 0.5);
      if (cut) this.atNow.copy(v1);
      this.atNow.lerp(v1, shot === 'top' ? 0.1 : 0.06);
      this.at.copy(this.atNow);
      if (shot === 'top') fov = FOV_TOP;
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

  /** It can be skipped: from when the shrine is up and you're about to take the light to it, until the giant has it. */
  get canSkip() { return this.busy && this.state !== 'given' && this.d.ring.sealK >= 1 && !!this.d.giant(); }

  /**
   * Skipped (main does it under a veil): all of it at once, as a save from
   * after finds it. The tower up and lit with the shrine on its head, the
   * light given, the giant smiling; and you where you'd have watched from.
   */
  skip(mode: string) {
    if (!this.canSkip) return;
    const g = this.d.giant()!, b = this.d.body, tw = this.d.tower, tws = this.d.towers;
    this.stage();
    if (this.t < this.T.heave) this.d.clear(WATCH + 2, v1.copy(this.watch).addScaledVector(this.p, -this.side * 7));
    tws.stand(tw.id, true);
    tws.release(tw.id);
    // (On something: it stands where it is, as it does when the scene plays.)
    if (mode === 'walk') {
      b.pos.set(this.watch.x, this.watch.y, this.watch.z);
      b.vel.set(0, 0, 0);
      b.heading = Math.atan2(g.centre.x - b.pos.x, g.centre.z - b.pos.z);
    }
    this.there = true;
    this.seat();
    this.orbAt.copy(this.bowl);
    this.state = 'given';
    this.save();
    this.t = -1;
    this.after = -1;
    this.lift = -1;
    this.watching = false;
    this.afterYaw = this.arrivalHeading + Math.PI;
    this.keep(true);
  }

  /** Dev: straight to a step (`held`: up with the light, the shrine risen; `placed`: the light in the bowl; `given`). */
  debug(to: OfferState) {
    this.d.ring.seal(true);
    this.staged = false;
    this.t = -1;
    this.after = -1;
    this.wait = 0;
    this.lift = -1;
    this.there = to === 'placed' || to === 'given';
    this.topSet = false;
    if (this.there) this.d.towers.stand(this.d.tower.id, true); else this.d.towers.bury(this.d.tower.id);
    const g = this.d.giant();
    if (g) { g.awake = false; g.mouth = 0; g.gulp = 0; g.grin = 0; g.wide = 0; g.look = null; g.snap(); }
    this.eaten = false;
    this.crow.birds[0].state = 'roost';
    this.crow.birds[0].holds = false;
    this.state = to;
    if (to === 'none') return;
    this.seat();
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
