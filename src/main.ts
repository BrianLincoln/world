import './core/colorSetup';
import * as THREE from 'three';
import './style.css';
import { seedFromString } from './core/rng';
import { Environment } from './gfx/environment';
import { GroundShadow, groundShadowSettings } from './gfx/groundShadow';
import { initMaterials, TERRAIN_U, U } from './gfx/materials';
import { PostPipeline, postSettings } from './gfx/post';
import { Puffs } from './gfx/puffs';
import { Sky } from './gfx/sky';
import { CharacterRig, type Mood } from './player/character';
import { Input } from './player/input';
import { TouchControls, isTouchDevice } from './ui/touch';
import { BikeMode, BODY_RADIUS, CarriedMode, CHARGE_RUN, FlyMode, GlideMode, MovementController, RideMode, SwimMode, WalkMode, type MoveContext, type WorldQuery } from './player/movement';
import { Crow, crowStyle } from './mobs/crow';
import { Mobs } from './mobs/manager';
import type { Mob, MobCtx } from './mobs/types';
import { Floof } from './mobs/floof';
import { Stelk } from './mobs/stelk';
import { makeBeasts } from './mobs/beasts';
import type { Drakitten } from './mobs/drakitten';
import type { BeastData } from './mobs/beast';
import { OrbitCamera } from './player/orbitCamera';
import { DebugUI } from './ui/debug';
import { CHECKPOINTS, CheckpointBar } from './ui/checkpoints';
import { StoryHost } from './story/host';
import { Ambience } from './audio/ambience';
import { Harvest } from './world/harvest';
import { Bikes, type Bike } from './vehicles/bikes';
import { Dungeon, DUNGEON_LOOK } from './dungeon/dungeon';
import { Giant } from './giant/giant';
import { Trail } from './giant/trail';
import { Ring } from './giant/ring';
import { Visit } from './giant/visit';
import { TowerDebug } from './ui/towerDebug';
import { Beacons } from './story/beacons';
import { Journey, STAGES, type Stage } from './story/journey';
import { Herd } from './story/herd';
import { PHASE3 } from './story/phase3';
import { Pointer } from './story/pointer';
import { Colliders } from './world/colliders';
import { Terrain } from './world/terrain';
import { SEA_LEVEL, WorldGen } from './world/worldgen';

// URL params (all optional): seed, t (hour), x, z, yaw, pitch, dist, ui=0,
// mode=fly, y (fly height), paused=1, palette=<preset>
const params = new URLSearchParams(location.search);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: params.has('capture') });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.info.autoReset = false;
document.getElementById('app')!.appendChild(renderer.domElement);

initMaterials();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 18000);

let seedText = params.get('seed') ?? 'hilda';
let gen = new WorldGen(seedFromString(seedText));
/**
 * The dungeon site is slow to find (seconds on a bad seed), so it's found
 * once per seed, kept in localStorage, and handed to the chunk workers.
 */
function primeDungeon(g: WorldGen) {
  const key = `fjellheim.dungeon.v5.${g.seed}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) g.presetDungeon(JSON.parse(raw));
    else localStorage.setItem(key, JSON.stringify(g.dungeon));
  } catch { /* private mode: it's found again each load */ }
  return g.dungeon;
}
const terrain = new Terrain(gen.seed);
terrain.dungeon = primeDungeon(gen);
scene.add(terrain.root);
const groundShadow = new GroundShadow();
if (params.get('shadows') === '0') groundShadowSettings.enabled = false;
const sky = new Sky(gen.seed);
scene.add(sky.group);

const env = new Environment();
env.hour = params.has('t') ? parseFloat(params.get('t')!) : 9.2;
env.paused = params.get('paused') === '1';
if (params.get('palette')) env.paletteOverride = params.get('palette');

const colliders = new Colliders(gen);
const bikes = new Bikes(gen, colliders);
// The story's opening (the broken cabin, the hearth spirit): see src/story/.
let storyHost: StoryHost | null = null;
// The giant (only once summoned). Asleep, it's solid: see `world` below.
let giant: Giant | null = null;
// What the giant leaves behind: footprints you can walk down into, flattened trees.
const trail = new Trail({ ground: (x, z) => gen.height(x, z), colliders });
// The first dungeon, inside (built the first time the ring takes you down). While you're in it, it is the world.
let dungeon: Dungeon | null = null;
const world: WorldQuery = {
  groundHeight: (x, z) => (dungeon?.inside ? dungeon.floorAt(x, z) : trail.height(x, z)),
  floorHeight: (x, z, feetY, r) => dungeon?.inside ? dungeon.floorAt(x, z, feetY) : Math.max(trail.height(x, z), colliders.surface(x, z, feetY, r), storyHost?.story?.surface(x, z, feetY, r, 0.5) ?? -Infinity, beacons?.surface(x, z, feetY) ?? -Infinity, giant?.surface(x, z, feetY, 0.6) ?? -Infinity),
  collide: (pos, vel, r, rampMax, noTrees) => {
    if (dungeon?.inside) { dungeon.collide(pos, vel, r); return; }
    colliders.push(pos, vel, r, rampMax, noTrees);
    bikes.push(pos, vel, r);
    storyHost?.story?.collide(pos, vel, r);
    beacons?.collide(pos, vel, r);
    giant?.push(pos, vel, r);
  },
  ramp: (x, z, r, maxRise) => (dungeon?.inside ? -Infinity : colliders.ramp(x, z, r, maxRise)),
  climbTop: (x, z, r) => dungeon?.inside ? -Infinity : Math.max(colliders.cabinTop(x, z, r), storyHost?.story?.surface(x, z, Infinity, r, Infinity) ?? -Infinity),
  wetland: (x, z) => (dungeon?.inside ? 0 : gen.bog(x, z)),
  forest: (x, z) => (dungeon?.inside ? 0 : gen.forestDensity(x, z, gen.height(x, z))),
  landmarks: (pos, vel, r) => { if (dungeon?.inside) return; beacons?.collide(pos, vel, r); giant?.land(pos, vel, r); },
  waterLevel: SEA_LEVEL,
};

const rideMode = new RideMode();
const bikeMode = new BikeMode();
const player = new MovementController([new WalkMode(), new SwimMode(), new FlyMode(), new GlideMode(), rideMode, bikeMode, new CarriedMode()], 'walk');
const rig = new CharacterRig();
scene.add(rig.root);
if (params.get('eyes') === 'round') rig.eyeType = 'round';
// Dev: ?mood=sad|scared|set holds her face in a mood (outside the story).
if (params.has('mood')) rig.mood = params.get('mood') as Mood;
const puffs = new Puffs();
scene.add(puffs.group);
// Ride effects for the wilder mounts: churned mud, glimmer motes, static sparks.
const mudPuffs = new Puffs('#8a7458', 40, 0, 0.6);
const glowPuffs = new Puffs('#c9f4ff', 30, 0.8, 0.9);
const sparkPuffs = new Puffs('#d6f0ff', 30, 0.9, 0.9);
// Drakitten rocket smoke: round storybook puffs that hang in the air a while.
const smokePuffs = new Puffs('#f3ece3', 140, 0, 0.45);
scene.add(mudPuffs.group, glowPuffs.group, sparkPuffs.group, smokePuffs.group);
const SMOKE = { life: 1.1, rise: 0.35, drag: 2.2, up: 0.15 };
rig.onPuff = (at, n, size, spread) => puffs.emit(at, n, size, spread);

// Creatures: wild flocks, the lasso, leads and riding.
const crow = new Crow();
const stelk = new Stelk();
const mobs = new Mobs(gen, [new Floof(), crow, stelk, ...makeBeasts()]);
// ?mobs=0 = no wild spawns (shots place their own), or a density multiplier.
if (params.has('mobs')) mobs.settings.density = parseFloat(params.get('mobs')!);
scene.add(mobs.group);
scene.add(bikes.group);
if (params.get('bikes') === '0') bikes.settings.enabled = false;
const mobCtx: MobCtx = {
  dt: 0,
  time: 0,
  gen,
  player: { pos: new THREE.Vector3(), vel: new THREE.Vector3(), heading: 0, mode: 'walk' },
  surface: (x, z) => Math.max(trail.height(x, z), SEA_LEVEL),
  collide: (pos, vel, r) => {
    colliders.push(pos, vel, r);
    storyHost?.story?.collide(pos, vel, r, true);
    beacons?.collide(pos, vel, r);
  },
  puff: (at, n, size, spread) => puffs.emit(at, n, size, spread),
  trail: (at, size) => smokePuffs.emit(at, 1, size, 0.35, undefined, SMOKE),
};
let riding: Mob | null = null;
const hand = new THREE.Vector3();
const ropeTo = new THREE.Vector3();
const aimEl = document.getElementById('aim') as HTMLDivElement;
const promptEl = document.getElementById('prompt') as HTMLDivElement;

function mount(m: Mob) {
  const b = player.body;
  rideMode.spec = m.species.mount;
  b.pos.copy(m.pos);
  b.vel.copy(m.vel);
  b.heading = m.heading;
  b.grounded = m.grounded;
  mobs.mount(m);
  // The newer mounts read their ride state (abilities) off the mode.
  const gs = rideMode.gallopState;
  gs.phase = gs.burrow = gs.charge = gs.static = gs.depth = gs.cool = gs.rocket = gs.heat = gs.wall = gs.stickX = 0;
  gs.overheat = false;
  gs.crawl = false;
  if (m.data && 'gs' in m.data) (m.data as BeastData).gs = gs;
  player.set('ride', ctx);
  riding = m;
  // (Not down in the dungeon: its passages are narrower than that, and the camera would be forever on the walls.)
  if (!dungeon?.inside) orbit.targetDistance = Math.max(orbit.targetDistance, 12);
}

function dismount() {
  const m = riding;
  if (!m) return;
  const b = player.body;
  const seat = m.species.seat(m);
  // Hop off to the right of the mount.
  const side = m.species.radius + 0.7;
  b.pos.set(seat.pos.x - Math.cos(m.heading) * side, seat.pos.y - 0.4, seat.pos.z + Math.sin(m.heading) * side);
  b.vel.set(m.vel.x * 0.5, 4, m.vel.z * 0.5);
  b.grounded = false;
  riding = null;
  if (burrowHid) { rig.root.visible = true; burrowHid = false; }
  const gs = rideMode.gallopState;
  gs.phase = gs.burrow = gs.charge = gs.rocket = gs.wall = 0;
  mobs.dismount(m);
  player.set('walk', ctx);
}

// Bicycles: parked about the world, ridden through BikeMode.
let cycling: Bike | null = null;
/** Last spot the bike stood on dry land (where it's left if you tumble into deep water). */
const lastDry = new THREE.Vector3();
let lookIdle = 0;
/** Debug framing: lowers the camera focus (bike close-ups with the explorer hidden). */
let focusShift = 0;
/** Debug framing: orbit this point instead of the explorer (story close-ups). */
let focusOverride: THREE.Vector3 | null = null;
/** Debug: steer input relative to this yaw instead of the camera's (scripted shots orbit freely). */
let inputYaw: number | null = null;

function mountBike(k: Bike) {
  bikes.mount(k, player.body, bikeMode);
  player.set('bike', ctx);
  cycling = k;
  lastDry.copy(k.pos);
  orbit.targetDistance = Math.max(orbit.targetDistance, 9);
}

function dismountBike() {
  const k = cycling;
  if (!k) return;
  cycling = null;
  const b = player.body;
  const wet = player.current.name !== 'bike';
  bikes.park(k, wet ? lastDry : undefined);
  if (!wet) {
    // Step off on the kickstand side (the rider's left).
    const side = 0.8;
    b.pos.set(k.pos.x + Math.cos(k.heading) * side, k.pos.y + 0.05, k.pos.z - Math.sin(k.heading) * side);
    b.vel.set(b.vel.x * 0.4, 2.5, b.vel.z * 0.4);
    b.grounded = false;
    player.set('walk', ctx);
  }
}

/**
 * The nearest thing to climb onto from where you are: a tamed creature or a
 * parked bike (never the one you're on). From a mount the reach is wider,
 * so a floof trailing on its lead counts.
 */
function nextMount(): { mob: Mob } | { bike: Bike } | null {
  // Down in the dungeon the only mount is its own creature, once you've let it out.
  if (dungeon?.inside) {
    const m = dungeon.freed ? mobs.mountable(player.body.pos, riding ? 6.5 : undefined) : null;
    return m ? { mob: m } : null;
  }
  const p = player.body.pos;
  const mounted = !!riding || !!cycling;
  const mode = player.current.name;
  const m = mobs.mountable(p, mounted ? 6.5 : undefined);
  // Bikes from the ground, another bike, or a mount low enough to step down from.
  const low = riding && p.y - gen.height(p.x, p.z) < 3;
  const k = mode === 'walk' || cycling || low ? bikes.mountable(p, mounted ? 4.5 : undefined, low ? 3.2 : undefined) : null;
  if (m && (!k || m.pos.distanceTo(p) < k.pos.distanceTo(p) + 1)) return { mob: m };
  return k ? { bike: k } : null;
}

/** Leave whatever you're on (it stays put: no hop-off) and climb onto `next`. */
function switchTo(next: { mob: Mob } | { bike: Bike }) {
  if (cycling) {
    bikes.park(cycling);
    cycling = null;
  }
  if (riding) {
    mobs.dismount(riding);
    riding = null;
  }
  if ('mob' in next) mount(next.mob);
  else mountBike(next.bike);
}

const orbit = new OrbitCamera(camera);
const input = new Input(renderer.domElement);
// Touch controls: up front on phones and tablets, or on the first touch of a
// hybrid screen.
let touch: TouchControls | null = isTouchDevice() ? new TouchControls(input, renderer.domElement) : null;
if (!touch) {
  const firstTouch = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    renderer.domElement.removeEventListener('pointerdown', firstTouch, true);
    touch = new TouchControls(input, renderer.domElement);
  };
  renderer.domElement.addEventListener('pointerdown', firstTouch, true);
}
const post = new PostPipeline(renderer);
// The wordless opening runs on a plain start; shots and debug views that set
// a time, a position or flight get the sandbox (?story=1 forces it on,
// ?story=0 off; ?fresh=1 forgets saved progress for this seed).
const storyActive = params.get('story') === '1' || (params.get('story') !== '0' && !params.has('t') && !params.has('x') && params.get('mode') !== 'fly');
// Felled trees and smashed rocks (hidden on the GPU, left out of collision).
const harvest = new Harvest();
colliders.skip = (kind, x, z) => { const [gi, gj] = Harvest.cellOf(kind, x, z); return harvest.gone(kind, gi, gj) || trail.prints.sdf(x, z) < 1; };
colliders.busy = (kind, x, z) => { const [gi, gj] = Harvest.cellOf(kind, x, z); return harvest.has(kind, gi, gj); };
storyHost = new StoryHost({ scene, post, env, rig, body: player.body, camera, puffs: (at, n, size, spread) => puffs.emit(at, n, size, spread), colliders, harvest, dent: (x, z) => trail.prints.offset(x, z) }, storyActive);
const ambience = new Ambience(storyHost.sfx);
let homeIn = false;
/**
 * For the ambience's home bed: by the lit cabin, or along the village lane
 * until the giant has been. A wider ring to leave than to enter, so the
 * edge doesn't flutter.
 */
function atHome() {
  const story = storyHost?.story;
  if (!story || !story.cabin.lit) return (homeIn = false);
  const p = player.body.pos, r = homeIn ? 70 : 55;
  let d = Math.hypot(p.x - story.cabin.hearthPos.x, p.z - story.cabin.hearthPos.z);
  if (story.village && !story.giantGone) for (const q of story.village.site.lane) d = Math.min(d, Math.hypot(p.x - q.x, p.z - q.z));
  return (homeIn = d < r);
}
if (params.has('fresh')) try { localStorage.removeItem(`fjellheim.story.${seedText}`); } catch { /* ignore */ }
storyHost.build(gen, seedText);
if (params.has('fresh')) try { localStorage.removeItem(`fjellheim.journey.${seedText}`); } catch { /* ignore */ }
// Dev views of the beacon-tower network (L sight lines, M map; panel only).
const towerDebug = new TowerDebug();
storyHost.overlay.add(towerDebug.group);
towerDebug.setGen(gen);
if (params.get('towers') === '1') towerDebug.settings.links = towerDebug.settings.map = true;
// Beacon towers: drawn at any distance, their spirits lift you up and down.
if (params.has('fresh')) try { localStorage.removeItem(`fjellheim.towers.${seedText}`); } catch { /* ignore */ }
let hadCine = false;
/** Easing the camera between a cinematic and the orbit: where it came from, and how far along (1 = done). */
const camBlendPos = new THREE.Vector3(), camBlendQ = new THREE.Quaternion(), camToQ = new THREE.Quaternion(), camLastPos = new THREE.Vector3(), camLastQ = new THREE.Quaternion();
let camBlend = 1, camBlendDur = 1.1;
/** Last frame's final camera pose (a blend can start from it). */
const camPrevPos = new THREE.Vector3(), camPrevQ = new THREE.Quaternion();
/** Sandbox only: how long the pick stays in the mitten after a swing at a tower's lock. */
let sandboxPickT = 0;
const beacons = new Beacons({
  gen, body: player.body, rig, sfx: storyHost.sfx, saveKey: seedText, setMode: (m) => player.set(m, ctx), overlay: storyHost.overlay,
  // In the story you need the pick from phase 1; the sandbox lends you one.
  canSmash: () => (storyHost.active && storyHost.story ? storyHost.story.hasPick : true),
  showPick: () => { if (storyHost.active && storyHost.story) storyHost.story.showTool('pick'); else sandboxPickT = 0.8; },
  hidePlayer: (on) => { rig.root.visible = !on; },
});
scene.add(beacons.group);
// Phase 2: the bike, the ride to the home tower, the first two towers (story only).
let journey = null as Journey | null;
function makeJourney() {
  if (journey) scene.remove(journey.group);
  const host = storyHost!;
  const story = host.story;
  journey = host.active && story ? new Journey({
    gen, story, bikes, beacons, body: player.body, sfx: host.sfx, saveKey: seedText,
    cycling: () => cycling,
    place: (x, z, h) => { if (riding) dismount(); if (cycling) dismountBike(); player.set('walk', ctx); placePlayer(x, z); player.body.heading = h; orbit.yaw = h + Math.PI; orbit.pitch = 0.2; orbit.snap(); },
    mount: (k) => mountBike(k),
  }) : null;
  if (journey) scene.add(journey.group);
  makeHerd();
}
/** The far-off pointer to the next task (story only). */
const pointer = storyHost.active ? new Pointer() : null;
// Phase 3: the creatures living at the stable (story only).
let herd = null as Herd | null;
function makeHerd() {
  const story = storyHost!.story;
  herd = storyHost!.active && story?.stable ? new Herd({ mobs, story, sfx: storyHost!.sfx, saveKey: seedText, camera, ctx: mobCtx, puffs: (at, n, size, spread) => puffs.emit(at, n, size, spread) }) : null;
  if (story) story.herdCount = () => herd?.count ?? 0;
  // In the story the lasso is the spirit's gift, and a creature is only
  // yours (saddled, and it comes home) once it's been brought to the stable.
  mobs.rules.stable = !!storyHost!.active;
}
if (params.has('fresh')) try { localStorage.removeItem(`fjellheim.herd.${seedText}`); localStorage.removeItem(`fjellheim.dungeon1.${seedText}`); } catch { /* ignore */ }
makeJourney();

/** Dev: straight to a phase 3 step (the journey done, everything before it built), standing by the pasture gate. */
function stableJump(id: string) {
  const story = storyHost?.story;
  if (!journey || !story?.stable) return false;
  journey.jump('done');
  if (!story.debugJump(id)) return false;
  const g = story.anchor('gateOut');
  if (riding) dismount();
  if (cycling) dismountBike();
  player.set('walk', ctx);
  const out = g.clone().sub(story.stable.gate).setY(0).normalize();
  placePlayer(g.x + out.x * 5, g.z + out.z * 5);
  player.body.heading = Math.atan2(-out.x, -out.z);
  orbit.yaw = Math.atan2(out.x, out.z);
  orbit.pitch = 0.2;
  orbit.snap();
  return true;
}
if (params.get('beacons') === '0') beacons.group.visible = false;

// The giant (slice 1, step 1: the look; no story drives it yet). It only
// exists once summoned: `__ow.giant(dist)` or ?giant=<metres>[,walk].
const giantDust = new Puffs('#efe4d2', 60, 0, 0.35);
const giantBreath = new Puffs('#fbf8f4', 16, 0, 0.5, true);
scene.add(giantDust.group, giantBreath.group, trail.group);
function summonGiant(x: number, z: number, heading: number) {
  if (!giant) {
    giant = new Giant({
      ground: (gx, gz) => Math.max(gen.height(gx, gz), SEA_LEVEL - 6),
      onStep: (at, _foot, yaw) => {
        // It leaves a print for good, and whatever stood there is flat.
        trail.stamp(at, yaw);
        visit?.onStep(at);
        // A ring of dust as big as a cabin, and the ground jumps under you.
        giantDust.emit(at, 14, 4.6, 16, undefined, { life: 1.6, rise: 1.2, drag: 1.6, up: 3 });
        giantDust.emit(at, 8, 2.2, 7, undefined, { life: 1.1, rise: 2, drag: 1.4, up: 6 });
        const d = at.distanceTo(player.body.pos);
        if (d < 900) orbit.bump(1.8 * (1 - d / 900) ** 2);
      },
      onBreath: (at, dir) => {
        for (let i = 0; i < 3; i++) giantBreath.emit(v3.copy(at).addScaledVector(dir, 2 + i * 2.5), 1, 2.6 - i * 0.5, 0.4, v3b.copy(dir).multiplyScalar(-14 + i * 3), { life: 3.2, rise: 0.5, drag: 0.9, up: -0.6 });
      },
    });
    scene.add(giant.group);
  }
  giant.place(x, z, heading);
  return giant;
}
/**
 * Dev: stand the giant about `dist` m off, on dry land in clear view, as near
 * the way the camera looks as the ground allows, and turn to look at it.
 * `face` is its heading relative to facing you (0 = toward you).
 */
function giantAhead(dist: number, face = 0, walk = false) {
  const p = player.body.pos;
  const eye = p.y + 3;
  let best = Infinity, bx = 0, bz = 0, ba = 0;
  for (let i = 0; i < 48; i++) {
    const off = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.13;
    const a = orbit.yaw + Math.PI + off;
    const x = p.x + Math.sin(a) * dist, z = p.z + Math.cos(a) * dist;
    const g = gen.height(x, z);
    if (g < 1.5) continue;
    // How much of it the ground between hides (metres up from its feet).
    let hidden = 0;
    for (let t = 0.04; t < 1; t += 0.04) {
      const h = gen.height(p.x + (x - p.x) * t, p.z + (z - p.z) * t);
      hidden = Math.max(hidden, (h - eye) / t + eye - g);
    }
    // Woods in the foreground hide it too.
    let woods = 0;
    for (let d = 20; d < Math.min(dist, 320); d += 30) {
      const wx = p.x + Math.sin(a) * d, wz = p.z + Math.cos(a) * d;
      woods = Math.max(woods, gen.forestDensity(wx, wz, gen.height(wx, wz)) * (1 - d / 400));
    }
    // Best about level with you, so it stands on the skyline rather than down in a valley.
    const score = Math.max(hidden, 0) + woods * 60 + Math.abs(off) * 6 + Math.abs(g + 30 - eye) * 0.6;
    if (score < best) { best = score; bx = x; bz = z; ba = a; }
  }
  if (best === Infinity) return null;
  const g = summonGiant(bx, bz, ba + Math.PI + face);
  g.walking = walk;
  orbit.yaw = ba + Math.PI;
  orbit.pitch = -0.02;
  orbit.snap();
  return g;
}
// The giant's visit: it comes up the lane once the hearth is lit (story only;
// `__ow.visit().start()` runs it from anywhere in the story).
let visit: Visit | null = null;
/** After the giant: you're in among what it left (see where `rig.mood` is set). */
let grieving = false;
// The first dungeon's ring: bare stones until the giant gets there and opens it.
let ring: Ring | null = null;
let visitWait = 0;
let visitHud = false;
/** The cut between the world and the dungeon: a flat violet veil, driven by whichever has hold of you. */
const dungeonVeil = document.createElement('div');
dungeonVeil.style.cssText = 'position:fixed;inset:0;background:#2b2147;opacity:0;pointer-events:none;z-index:4';
document.body.append(dungeonVeil);
let dungeonVeilK = 0;
/** The saddle's height over the mount's feet, smoothed (down in the dungeon), or -1. */
let rideSeatY = -1;
/** The orbit camera's zoom as it was above ground. */
let zoomAbove = 10;
/** The first dungeon is done (the light taken): the ring won't take you again. Saved with the dungeon's own state. */
let dungeonWon = false;
/** The rockhopper, brought up out of the dungeon with you: you're put on it once the ring has let go. */
let bringUp: Mob | null = null;
/** What the dungeon's creatures live by (see Mobs.under). */
let dungeonCtx: MobCtx | null = null;

/**
 * Down into the dungeon: it becomes the world (floor, walls, what's drawn)
 * and the explorer moves into its scene. `drop` (dev) skips being let down
 * and stands you at a point of its plan.
 */
function enterDungeon(drop?: [number, number]) {
  if (!ring || dungeon?.inside) return;
  if (riding) dismount();
  if (cycling) dismountBike();
  if (!dungeon) {
    // Its creatures live by its floor and walls, not the land's overhead.
    const at = (x: number, z: number) => dungeon!.floorAt(x, z);
    const under: MobCtx = Object.assign(Object.create(mobCtx), {
      gen: new Proxy(gen, { get: (g, k) => (k === 'height' ? at : k === 'bog' ? () => 0 : Reflect.get(g, k)) }),
      surface: at,
      collide: (pos: THREE.Vector3, vel: THREE.Vector3, r: number) => dungeon!.collide(pos, vel, r),
    });
    const host = storyHost!;
    dungeon = new Dungeon(gen.dungeon, gen.seed, ring.groundY, {
      body: player.body, sfx: host.sfx, setMode: (m) => player.set(m, ctx), rig, saveKey: seedText,
      canSmash: () => (host.active && host.story ? host.story.hasPick : true),
      showPick: () => { if (host.active && host.story) host.story.showTool('pick'); else sandboxPickT = 0.8; },
      puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
      adopt: (p) => {
        const m = mobs.adopt('rockhopper', 'cave:rockhopper', p, new THREE.Color('#e2dbcf'), under);
        if (m) m.below = true;
        return m;
      },
    });
    dungeon.onLeft = () => leaveDungeon();
    dungeon.onWon = () => leaveDungeon(true);
    dungeonCtx = under;
  }
  mobs.under = dungeonCtx;
  dungeon.scene.add(mobs.group);
  // No sea down there (it lies below sea level on low ground).
  world.waterLevel = -1e9;
  dungeon.scene.add(rig.root, puffs.group);
  rig.root.visible = true;
  if (drop) dungeon.drop(drop[0], drop[1]); else dungeon.enter();
  // A tight camera, behind you, looking the way on. No easing across the cut.
  zoomAbove = orbit.targetDistance;
  orbit.maxDistance = 16;
  orbit.targetDistance = 9;
  orbit.yaw = dungeon.startYaw;
  orbit.pitch = 0.14;
  orbit.snap();
  hadCine = !!dungeon.cinematic();
  camBlend = 1;
}

/** Back up: the world is the world again, and the ring's arms lift you out on to the field. */
function leaveDungeon(won = false) {
  if (riding) dismount();
  player.body.vel.set(0, 0, 0);
  if (won) {
    // The light is yours: the dungeon is done with, and its creature comes up with you.
    dungeonWon = true;
    const g = dungeon?.goat ?? null;
    if (g) {
      const d = gen.dungeon, x = d.x + 2.4, z = d.z + 1.2;
      g.below = false;
      g.pos.set(x, trail.height(x, z), z);
      g.vel.set(0, 0, 0);
      g.stay.copy(g.pos);
      g.species.reset(g);
      bringUp = g;
    }
  }
  world.waterLevel = SEA_LEVEL;
  mobs.under = null;
  scene.add(rig.root, puffs.group, mobs.group);
  rig.root.visible = true;
  orbit.maxDistance = 80;
  orbit.targetDistance = zoomAbove;
  orbit.pitch = 0.22;
  ring?.emerge(trail.height(gen.dungeon.x, gen.dungeon.z));
  orbit.snap();
  hadCine = false;
  camBlend = 1;
}

function makeVisit() {
  visit?.dispose();
  ring?.dispose();
  if (dungeon) {
    if (dungeon.inside) { dungeon.inside = false; world.waterLevel = SEA_LEVEL; mobs.under = null; scene.add(rig.root, puffs.group, mobs.group); orbit.maxDistance = 80; player.set('walk', ctx); }
    dungeon.dispose();
    dungeon = null;
    dungeonCtx = null;
  }
  ring = new Ring(gen.dungeon, (x, z) => gen.height(x, z), { body: player.body, sfx: storyHost!.sfx, setMode: (m) => player.set(m, ctx) });
  // A save from after the light was taken: the dungeon stays shut, and its rockhopper is waiting by the ring.
  bringUp = null;
  try { dungeonWon = !!JSON.parse(localStorage.getItem(`fjellheim.dungeon1.${seedText}`) ?? '{}').taken; } catch { dungeonWon = false; }
  if (dungeonWon) {
    const d = gen.dungeon, x = d.x + d.r + 3, z = d.z;
    mobs.adopt('rockhopper', 'cave:rockhopper', new THREE.Vector3(x, gen.height(x, z), z), new THREE.Color('#e2dbcf'), mobCtx);
  }
  ring.onTaken = () => enterDungeon();
  scene.add(ring.group);
  storyHost?.overlay.add(ring.overlay);
  const story = storyHost?.story;
  visit = story && story.village ? new Visit({
    story, trail, summon: summonGiant, gen, ground: (x, z) => gen.height(x, z),
    dust: (at) => { giantDust.emit(at, 16, 3.2, 13, undefined, { life: 1.8, rise: 1.6, drag: 1.5, up: 7 }); giantDust.emit(at, 8, 1.8, 6, undefined, { life: 1.3, rise: 2.4, drag: 1.3, up: 10 }); },
    sound: (n, level = 1) => { const fx = storyHost!.sfx, was = fx.level; fx.level = was * level; if (n === 'squeak') fx.chirp(true); else fx[n](); fx.level = was; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
    ring: () => ring,
    solid: (p) => beacons.solidAt(p, true),
    bike: (x, z, h) => journey?.standBike(x, z, h),
  }) : null;
  if (visit) scene.add(visit.group);
  visitWait = 0;
  if (visit && storyHost!.active && story!.giantGone) visit.restore();
}
makeVisit();
if (params.has('giant')) {
  const [d, w] = params.get('giant')!.split(',');
  giantAhead(parseFloat(d) || 500, w === 'walk' ? Math.PI / 2 : 0, w === 'walk');
}

/** Find dry, gentle ground near a point: spiral search. */
function findSpawn(x0: number, z0: number): [number, number] {
  for (let r = 0; r < 4000; r += 37) {
    for (let a = 0; a < 6.28; a += 0.7) {
      const x = x0 + Math.cos(a) * r;
      const z = z0 + Math.sin(a) * r;
      const h = gen.height(x, z);
      if (h > 6 && h < 90 && gen.forestDensity(x, z, h) < 0.05 && gen.forestDensity(x + 12, z + 12, h) < 0.1 && Math.abs(gen.height(x + 4, z) - h) < 1.2 && Math.abs(gen.height(x, z + 4) - h) < 1.2) return [x, z];
    }
  }
  return [x0, z0];
}

/** Dev: stand in front of tower `i`'s face, looking up at it. */
function goToTower(i: number) {
  const t = gen.towers.towers[Math.max(0, Math.min(gen.towers.towers.length - 1, i))];
  if (riding) dismount();
  if (cycling) dismountBike();
  player.set('walk', ctx);
  // In front of the doorway, facing it, the camera behind you.
  const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
  const g = t.door.ground;
  placePlayer(g.x + fx * 9, g.z + fz * 9);
  player.body.heading = t.yaw + Math.PI;
  orbit.yaw = t.yaw;
  orbit.pitch = 0.05;
  orbit.targetDistance = 12;
  orbit.snap();
}

function placePlayer(x: number, z: number) {
  const b = player.body;
  b.pos.set(x, trail.height(x, z), z);
  b.vel.set(0, 0, 0);
  orbit.snap();
}

function spawn() {
  if (params.has('x') && params.has('z')) placePlayer(parseFloat(params.get('x')!), parseFloat(params.get('z')!));
  else if (storyHost?.active && storyHost.story) {
    // The start (or, once its hearth is lit, the cabin's doorstep).
    const s = storyHost.story.spawnPoint();
    placePlayer(s.x, s.z);
    orbit.yaw = s.yaw;
    player.body.heading = s.heading;
    orbit.snap();
  } else {
    const [x, z] = findSpawn(0, 0);
    placePlayer(x, z);
  }
}
spawn();
if (params.has('yaw')) orbit.yaw = parseFloat(params.get('yaw')!);
{
  const [sx, sz] = findSpawn(0, 0);
  bikes.reset(gen, sx, sz, orbit.yaw, !storyHost?.active);
}
if (params.has('pitch')) orbit.pitch = parseFloat(params.get('pitch')!);
if (params.has('dist')) orbit.targetDistance = parseFloat(params.get('dist')!);

const ctx: MoveContext = { input: input.state(), camYaw: 0, camPitch: 0, dt: 0, world };
// ?journey=<step>: straight to a phase 2 step (after the spawn and the bike reset, which would undo it).
if (params.get('journey') && STAGES.includes(params.get('journey') as Stage)) journey?.jump(params.get('journey') as Stage);
// Otherwise, mid-journey: back at the stage's checkpoint (a tower, the start of a ride).
else if (!params.has('x')) journey?.resume();
// ?stable=<step>: straight to a phase 3 step.
if (params.get('stable')) stableJump(params.get('stable')!);

/** Dev: set the story up as it stands at a checkpoint (`?fresh=1&cp=<id>`; see ui/checkpoints.ts). Expects a fresh save. */
function checkpoint(id: string) {
  const story = storyHost?.story, c = CHECKPOINTS.find((k) => k.id === id);
  if (!c || !story || !storyHost!.active) return false;
  if (c.kind === 'phase1') {
    if (!story.debugJump(id)) return false;
    spawn();
  } else if (c.kind === 'journey') journey?.jump(id as Stage);
  else if (c.kind === 'ring') journey?.jump('done');
  else if (!stableJump(id)) return false;
  // Past the home tower's head the giant has been: its prints and the wrecked lane, as a save from there has them.
  if (c.giantGone) { story.giantGone = true; visit?.restore(); }
  if (c.kind === 'ring') goToRing();
  story.save();
  return true;
}
if (params.get('cp')) {
  checkpoint(params.get('cp')!);
  // A reload from here picks the save up like any other, rather than starting the checkpoint over.
  const u = new URL(location.href);
  u.searchParams.delete('cp');
  u.searchParams.delete('fresh');
  history.replaceState(null, '', u);
}
/** Where the story stands, as a checkpoint id. */
function checkpointNow() {
  const story = storyHost?.story;
  if (!story || !storyHost!.active) return null;
  if (story.phaseIndex > 0 || !story.done) return story.step.id === 'home' ? 'wait' : story.step.id;
  return journey?.stage ?? 'wait';
}
const checkpoints = new CheckpointBar(checkpointNow);
/** Dev: stand on the giant's way just outside the first dungeon's ring, facing it. */
function goToRing() {
  const d = gen.dungeon, w = d.way[d.way.length - 1] ?? [d.x + 1, d.z];
  const l = Math.hypot(w[0] - d.x, w[1] - d.z) || 1, ux = (w[0] - d.x) / l, uz = (w[1] - d.z) / l;
  if (riding) dismount();
  if (cycling) dismountBike();
  player.set('walk', ctx);
  placePlayer(d.x + ux * 22, d.z + uz * 22);
  player.body.heading = Math.atan2(-ux, -uz);
  orbit.yaw = Math.atan2(ux, uz);
  orbit.pitch = 0.16;
  orbit.targetDistance = 11;
  orbit.snap();
}
// ?dungeon=1: straight into the first dungeon (the ring opened), in the well; ?dungeon=x,z: at a point of its plan.
if (params.has('dungeon')) {
  const [dx, dz] = params.get('dungeon')!.split(',').map(parseFloat);
  (ring as Ring | null)?.setOpen();
  enterDungeon([Number.isFinite(dx) && Number.isFinite(dz) ? dx : 0, Number.isFinite(dz) ? dz : 0]);
}
if (params.get('mode') === 'fly') {
  player.set('fly', ctx);
  player.body.pos.y = gen.height(player.body.pos.x, player.body.pos.z) + (params.has('y') ? parseFloat(params.get('y')!) : 60);
}

function setSeed(s: string) {
  seedText = s;
  gen = new WorldGen(seedFromString(s));
  terrain.dungeon = primeDungeon(gen);
  terrain.setSeed(gen.seed);
  colliders.reset(gen);
  trail.clear();
  if (riding) dismount();
  if (cycling) dismountBike();
  mobs.reset(gen);
  mobCtx.gen = gen;
  sky.setSeed(gen.seed);
  const story = storyHost?.build(gen, s);
  const sp = storyHost?.active && story ? story.spawnPoint() : null;
  const [x, z] = sp ? [sp.x, sp.z] : findSpawn(0, 0);
  player.set('walk', ctx);
  placePlayer(x, z);
  if (sp) { orbit.yaw = sp.yaw; player.body.heading = sp.heading; orbit.snap(); }
  bikes.reset(gen, x, z, orbit.yaw, !storyHost?.active);
  towerDebug.setGen(gen);
  beacons.setGen(gen, s);
  makeJourney();
  journey?.resume();
  makeVisit();
  const u = new URL(location.href);
  u.searchParams.set('seed', s);
  history.replaceState(null, '', u);
}

const ui = new DebugUI({
  env,
  ambience,
  terrain,
  getSeed: () => seedText,
  setSeed,
  randomSeed: () => setSeed(Math.random().toString(36).slice(2, 8)),
  modeName: () => player.current.name,
  setMode: (m) => {
    // Riding needs a mount: go through mount/dismount, never set it bare.
    if (m === 'ride') { const t = mobs.mountable(player.body.pos); if (t && !riding) mount(t); return; }
    if (m === 'bike') { const k = bikes.mountable(player.body.pos); if (k && !riding && !cycling) mountBike(k); return; }
    if (riding) dismount();
    if (cycling) dismountBike();
    player.set(m, ctx);
  },
  position: () => player.body.pos,
  character: rig,
  colliders,
  mobs,
  bikes,
  spawnFlock: (name) => {
    const b = player.body;
    mobs.spawnFlockAt(name, b.pos.x + Math.sin(b.heading) * 18, b.pos.z + Math.cos(b.heading) * 18, mobCtx);
  },
  crowPlump: { get: () => crowStyle.plump, set: (v) => { crowStyle.plump = v; crow.setPlump(v); } },
  journey: { stages: [...STAGES, ...PHASE3.steps.map((st) => st.id)], jump: (s) => (STAGES.includes(s as Stage) ? journey?.jump(s as Stage) : stableJump(s)) },
  towers: {
    settings: towerDebug.settings,
    count: () => gen.towers.towers.length,
    go: (i) => goToTower(i),
    light: (w) => (w === 'break' ? beacons.debugBreak() : beacons.debugSet(w)),
    overview: () => {
      const h = gen.towers.home;
      if (riding) dismount();
      if (cycling) dismountBike();
      player.set('fly', ctx);
      player.body.pos.set(h.x, h.flame.y + 420, h.z);
      player.body.vel.set(0, 0, 0);
      orbit.pitch = 1.3;
      orbit.targetDistance = 60;
      orbit.snap();
      towerDebug.settings.links = true;
    },
  },
  faceCam: (on) => {
    rig.holdStill = on;
    if (on) {
      // Straight on, close, just below eye level.
      orbit.yaw = player.body.heading;
      orbit.pitch = -0.02;
      orbit.targetDistance = 2.4;
    } else {
      orbit.pitch = 0.18;
      orbit.targetDistance = 10;
    }
  },
});
if (params.has('capture')) postSettings.adaptive = false;
// No text during the story: the panel and FPS stay hidden (H shows them, or ?debug=1).
if (storyHost.active && params.get('debug') !== '1') ui.hide();
if (params.get('ui') === '0') {
  ui.hide();
  document.getElementById('help')?.remove();
}

// Adaptive quality: if frames run long, render fewer pixels (outlines and
// flat colour survive downscaling well), then shed terrain/prop detail. It
// only sheds after two slow windows in a row, ignores hitches (tab switches,
// other apps grabbing the GPU), and gives everything back, in reverse order,
// once there's headroom again.
let autoScale = 1;
// Phones and tablets: iOS caps requestAnimationFrame at 30 fps in Low Power
// Mode (and some browsers throttle it too), which the 50 fps test read as "GPU
// too slow", dropping to the lowest resolution and least detail. On touch
// devices only a real slowdown below ~27 fps sheds quality. Their small,
// dense screens also get a higher pixel-ratio cap: 1.5 on a 3x phone looks
// soft and makes the outlines look chunky.
const touchDevice = isTouchDevice();
const slowFrame = touchDevice ? 1 / 27 : 1 / 50;
const maxPixelRatio = touchDevice ? 2 : 1.5;
let frameAcc = 0;
let frameN = 0;
let slowWindows = 0;
const fullSplit = terrain.settings.splitFactor;
const fullNearLod = terrain.nearLodDistance;
function adaptResolution(rawDt: number) {
  if (!postSettings.adaptive || document.hidden || rawDt > 0.25) {
    frameAcc = frameN = 0;
    return;
  }
  frameAcc += rawDt;
  frameN++;
  if (frameAcc < 1.5) return;
  const avg = frameAcc / frameN;
  frameAcc = 0;
  frameN = 0;
  if (avg > slowFrame) {
    if (++slowWindows < 2) return;
    slowWindows = 0;
    // First shed pixels, then cast shadows; once at the floor, shed geometry
    // (vertex-bound GPUs).
    if (autoScale > 0.7) autoScale = Math.max(0.7, autoScale - 0.1);
    else if (!groundShadow.shed && groundShadowSettings.enabled) groundShadow.shed = true;
    else if (terrain.settings.splitFactor > 1.4) {
      terrain.settings.splitFactor = Math.max(1.4, terrain.settings.splitFactor - 0.15);
      terrain.nearLodDistance = Math.max(45, terrain.nearLodDistance - 10);
    } else if (autoScale > 0.55) autoScale = Math.max(0.55, autoScale - 0.05);
    return;
  }
  slowWindows = 0;
  if (avg > 1 / 55) return;
  // Headroom: restore in reverse (low-res floor, geometry, shadows, pixels).
  if (autoScale < 0.7) autoScale = Math.min(0.7, autoScale + 0.05);
  else if (terrain.settings.splitFactor < fullSplit) {
    terrain.settings.splitFactor = Math.min(fullSplit, terrain.settings.splitFactor + 0.15);
    terrain.nearLodDistance = Math.min(fullNearLod, terrain.nearLodDistance + 10);
  } else if (groundShadow.shed) groundShadow.shed = false;
  else if (autoScale < 1) autoScale = Math.min(1, autoScale + 0.05);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio || 1, maxPixelRatio) * postSettings.renderScale * autoScale;
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + 'px';
  renderer.domElement.style.height = h + 'px';
  renderer.domElement.width = Math.floor(w * pr);
  renderer.domElement.height = Math.floor(h * pr);
  renderer.setViewport(0, 0, Math.floor(w * pr), Math.floor(h * pr));
  post.setSize(w * pr, h * pr);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
let lastScale = postSettings.renderScale;
let lastAuto = autoScale;
window.addEventListener('resize', resize);
resize();

const timer = new THREE.Timer();
timer.connect(document);
let elapsed = 0;

/** Test harness: frames stepped by hand at a fixed dt (see __ow.advance). */
let manualStep = false;
let stepDt: number | null = null;
/** Stepped frames that don't draw (only the last of an `advance` does). */
let skipRender = false;

function frame(ts?: number) {
  // A browser frame that was already queued when stepping by hand began.
  if (manualStep && stepDt === null) return;
  timer.update(ts);
  const rawDt = stepDt ?? timer.getDelta();
  const dt = THREE.MathUtils.clamp(rawDt, 0, 0.05);
  adaptResolution(rawDt);
  elapsed += dt;
  if (postSettings.renderScale !== lastScale || autoScale !== lastAuto) {
    lastScale = postSettings.renderScale;
    lastAuto = autoScale;
    resize();
  }

  const storyBusy = !!storyHost?.story?.busy || !!visit?.busy;
  /** In the ring's arms (either way), and down in the dungeon. */
  const held = !!ring?.busy || !!dungeon?.busy, below = !!dungeon?.inside;
  if (input.pressed('KeyF') && !riding && !cycling && !beacons.busy && !journey?.busy && !storyBusy && !held && !below) player.set(player.current.name === 'fly' ? 'walk' : 'fly', ctx);
  // Only take the press (pressed() consumes it) when a tower is on offer.
  const beaconUsed = !!beacons.action(player.current.name) && (input.pressed('KeyE') || input.pressed('Mouse0')) && beacons.act(player.current.name);
  // Likewise the dungeon's (the pick, at its rockfall).
  const dungeonUsed = below && !!dungeon!.action(player.current.name) && (input.pressed('KeyE') || input.pressed('Mouse0')) && dungeon!.act(player.current.name);
  if (!beaconUsed && !dungeonUsed) storyHost?.story?.handleAction(input);
  if (input.pressed('KeyE') && !beaconUsed && !dungeonUsed && !journey?.busy && !storyBusy && !held) {
    // Something else in reach? Climb straight across; otherwise E hops off.
    const next = nextMount();
    if (next && (riding || cycling)) switchTo(next);
    else if (riding) dismount();
    else if (cycling) dismountBike();
    else if (next) switchTo(next);
  }
  mobs.rules.lasso = !storyHost?.active || !!storyHost.story?.hasLasso;
  const lassoKey = input.pressed('KeyR') || input.pressed('Mouse2');
  if (lassoKey && mobs.act() === 'throw') rig.throwLasso();
  if (input.pressed('KeyH')) ui.toggle();
  if (input.pressed('Backquote')) checkpoints.toggle();
  if (ui.shown && input.pressed('KeyL')) towerDebug.settings.links = !towerDebug.settings.links;
  if (ui.shown && input.pressed('KeyM')) towerDebug.settings.map = !towerDebug.settings.map;
  if (input.pressed('KeyT')) env.hour = (Math.floor(env.hour) + 1) % 24;
  const [lx, ly] = input.consumeLook();
  // Inside a tower's head you look out through its eyes instead.
  if (beacons.inside) beacons.look(lx, ly); else orbit.addLook(lx, ly);
  if (beacons.inside && input.pressed('Escape')) beacons.escape();
  lookIdle = lx || ly ? 0 : lookIdle + dt;
  orbit.zoom(input.consumeWheel());

  ctx.input = input.state();
  // Watching a tower's spirit (or being carried in and out): hands off.
  if (beacons.busy || journey?.busy || storyBusy || held) ctx.input = { ...ctx.input, x: 0, y: 0, run: false, jump: false, jumpPressed: false, up: false, down: false };
  ctx.camYaw = inputYaw ?? orbit.yaw;
  ctx.camPitch = orbit.pitch;
  ctx.dt = dt;
  stelkWork(dt);
  if (player.current.name !== 'fly') colliders.prefetch(player.body.pos.x, player.body.pos.z);
  player.update(ctx);
  input.endFrame();
  if (touch) followOnTouch(dt);

  const body = player.body;
  if (cycling && player.current.name !== 'bike') dismountBike(); // tumbled into deep water
  beacons.update(dt, camera, player.current.name, body.grounded, input.held('KeyE') || input.held('Mouse0'));
  // The ring takes you down (on your own feet only); the dungeon lets you down, and takes you back up.
  ring?.update(dt, camera.position, player.current.name, body.grounded, !storyBusy && !beacons.busy && !journey?.busy && !riding && !cycling && !dungeon?.inside && !dungeonWon);
  // Out of the dungeon with its creature: up on to it as soon as the arms have let go.
  if (bringUp && !dungeon?.inside && !ring?.busy) { const g = bringUp; bringUp = null; g.pos.copy(body.pos); mount(g); }
  if (dungeon?.inside) dungeon.update(dt, player.current.name, body.grounded, input.held('KeyE') || input.held('Mouse0'));
  const veilK = Math.max(ring?.veil ?? 0, dungeon?.veil ?? 0);
  if (veilK !== dungeonVeilK) dungeonVeil.style.opacity = String((dungeonVeilK = veilK));
  if (sandboxPickT > 0) {
    sandboxPickT -= dt;
    rig.setTools({ axe: false, pick: sandboxPickT > 0 }, sandboxPickT > 0 ? 'pick' : null);
  }
  const mode = player.current.name;
  if (cycling) {
    bikes.ride(cycling, body, bikeMode, dt);
    if (body.grounded && gen.height(body.pos.x, body.pos.z) > SEA_LEVEL) lastDry.copy(body.pos);
    for (const ev of body.events) {
      if (ev.type === 'land' && ev.impact > 3) puffs.emit(body.pos, 5 + Math.min(4, Math.round(ev.impact / 3)), 0.13, 1.8);
      if (ev.type === 'kick') {
        // Dust off the back wheel; a timed kick throws a full ring and a word.
        v3.set(body.pos.x - Math.sin(body.heading) * 0.5, body.pos.y, body.pos.z - Math.cos(body.heading) * 0.5);
        puffs.emit(v3, ev.perfect ? 10 : 4, ev.perfect ? 0.2 : 0.12, ev.perfect ? 3 : 1.6);
        // A timed kick: a bigger poof and a short dust trail up the flight.
        if (ev.perfect) {
          trailT = 0.3;
          puffs.emit(v3, 7, 0.2, 3.2);
        }
      }
      if (ev.type === 'bump') {
        puffs.emit(v3.set(body.pos.x + Math.sin(body.heading) * 0.6, body.pos.y + 0.4, body.pos.z + Math.cos(body.heading) * 0.6), 5, 0.12, 1.6);
        orbit.bump(Math.min(1.5, ev.impact * 0.15));
      }
    }
    if (trailT > 0) {
      trailT -= dt;
      trailEmit -= dt;
      if (trailEmit <= 0) {
        trailEmit = 0.045;
        puffs.emit(v3.set(body.pos.x - Math.sin(body.heading) * 0.6, body.pos.y + 0.2, body.pos.z - Math.cos(body.heading) * 0.6), 1, 0.11, 0.3);
      }
    }
    // Skids: a little dust off the back wheel when braking hard or carving fast.
    const hs = Math.abs(bikeMode.speed);
    skidT -= dt;
    if (body.grounded && skidT <= 0 && ((ctx.input.y < -0.3 && hs > 4) || Math.abs(bikeMode.lean) > 0.42)) {
      skidT = 0.09;
      puffs.emit(v3.set(body.pos.x - Math.sin(body.heading) * 0.5, body.pos.y, body.pos.z - Math.cos(body.heading) * 0.5), 1, 0.08, 0.6);
    }
    // With the mouse idle, the camera drifts round behind the bike.
    if (lookIdle > 1.2 && hs > 3) {
      const d = Math.atan2(Math.sin(body.heading + Math.PI - orbit.yaw), Math.cos(body.heading + Math.PI - orbit.yaw));
      orbit.yaw += d * (1 - Math.exp(-0.9 * Math.min(1, (hs - 3) / 4) * dt));
    }
  }
  if (riding) {
    riding.pos.copy(body.pos);
    riding.vel.copy(body.vel);
    riding.heading = body.heading;
    riding.grounded = body.grounded;
    for (const ev of body.events) {
      if (ev.type === 'land' && ev.impact > 3) puffs.emit(body.pos, 6, 0.16, 2.2);
      if (ev.type === 'bump') orbit.bump(Math.min(1.5, ev.impact * 0.1));
    }
    beastWork(riding, dt);
    // A snake steerer turns in right angles: with the mouse idle the camera
    // swings round behind it, so left and right stay its left and right.
    if (riding.species.mount?.trait?.snap && lookIdle > 0.5 && !rideMode.gallopState.wall) {
      const d = Math.atan2(Math.sin(body.heading + Math.PI - orbit.yaw), Math.cos(body.heading + Math.PI - orbit.yaw));
      orbit.yaw += d * (1 - Math.exp(-5 * dt));
    }
    // A gallop kicks up dust behind.
    const gs = rideMode.gallopState;
    if ((riding.species.name === 'stelk' || (riding.species.verb && !riding.species.mount.fly)) && body.grounded && gs.wet < 0.5 && gs.speed > 12 && gs.burrow <= 0) {
      hoofT -= dt;
      if (hoofT <= 0) {
        hoofT = 0.11 - Math.min(0.06, (gs.speed - 12) * 0.003);
        const k = (Math.random() - 0.5) * 0.8;
        puffs.emit(v3.set(body.pos.x - Math.sin(body.heading) * 1.3 + Math.cos(body.heading) * k, body.pos.y + 0.1, body.pos.z - Math.cos(body.heading) * 1.3 - Math.sin(body.heading) * k), 1, 0.16 + Math.min(0.1, (gs.speed - 12) * 0.005), 0.8);
      }
    }
  }
  if (storyHost?.story) storyHost.story.packLift = riding ? riding.species.seat(riding).pos.y - body.pos.y : 0;
  mobCtx.dt = dt;
  mobCtx.time = elapsed;
  mobCtx.night = U.uNight.value;
  mobCtx.player.pos.copy(body.pos);
  mobCtx.player.vel.copy(body.vel);
  mobCtx.player.heading = body.heading;
  mobCtx.player.mode = mode;
  mobs.update(mobCtx, camera, hand, !dungeon?.inside && (mode === 'walk' || mode === 'glide' || mode === 'ride' || mode === 'bike'));
  herd?.update(dt);
  bikes.update(dt, body.pos, camera);
  bikes.shadows(camera);
  rig.ropeAim = null;
  if (mobs.ropeTarget(ropeTo)) {
    // Slack leads hang from a relaxed arm; taut ones pull it out straight.
    const d = ropeTo.sub(hand);
    const slack = THREE.MathUtils.smoothstep(d.length(), 2.5, 5);
    d.normalize().lerp(new THREE.Vector3(0, -1, 0.35), 1 - slack);
    rig.ropeAim = d;
  }
  rig.update(body, mode, dt, cycling ? bikes.seat : riding ? riding.species.seat(riding) : undefined);
  rig.hand(hand);
  mobs.updateRopes(mobCtx, hand);
  puffs.update(dt);
  mudPuffs.update(dt);
  glowPuffs.update(dt);
  sparkPuffs.update(dt);
  smokePuffs.update(dt);
  giant?.update(dt);
  giantDust.update(dt);
  giantBreath.update(dt);
  trail.update(dt, body.pos);
  post.giant = giant ? { dist: giant.centre.distanceTo(camera.position), y: giant.centre.y } : null;
  if (storyHost?.story) {
    storyHost.story.external = beacons.action(mode) ?? (dungeon?.inside ? dungeon.action(mode) : null);
    // No pats in the middle of a cutscene.
    storyHost.story.noPat = beacons.busy || !!journey?.busy || storyBusy;
  }
  storyHost?.story?.update(dt, input, mode);
  journey?.update(dt);
  // The giant comes the first time you look out of the home tower's head:
  // you see it from up there, then the village, then you're back in the
  // head as it walks off. (A save from before this order, already past the
  // tower, gets it as soon as it loads.)
  if (visit && visit.state === 'idle' && storyHost?.active && storyHost.story && journey && !storyHost.story.giantGone) {
    if (journey.stage === 'enter1') visit.prepare();
    const head = journey.stage === 'enter1' && beacons.onTop ? beacons.inside : null;
    if (head) {
      // Seven seconds to look about first. Then the view turns, from the head's own eyes, to what's coming.
      if ((visitWait += dt) > 7 &&visit.start((x, z) => beacons.eyeToward(x, z) ?? new THREE.Vector3(head.head.x, head.head.y, head.head.z), head) && visit.route) beacons.lookToward(visit.route.start.x, visit.route.start.z);
    } else if (journey.stage === 'done' && storyHost.story.cabin.lit) visit.start();
    else visitWait = 0;
  }
  // That first time up there's no coming down until it has been and gone.
  beacons.holdIn = !!visit && !!storyHost?.active && !!storyHost.story && !storyHost.story.giantGone && (visit.busy || (visit.state === 'idle' && journey?.stage === 'enter1'));
  const visitWas = !!visit?.busy;
  visit?.update(dt);
  // How the two of you take it. While it's here, she feels what the guide
  // does. Afterwards the guide stays downcast, and so does she among the
  // wreckage; away from it her grin is gone and her face is set.
  const moodHeld = params.has('mood');
  if (storyHost?.active && storyHost.story) {
    const st = storyHost.story, sp = st.spirit, was = rig.mood;
    if (st.giantGone) {
      let d = Infinity;
      if (st.village) for (const q of st.village.site.lane) d = Math.min(d, Math.hypot(body.pos.x - q.x, body.pos.z - q.z));
      grieving = d < (grieving ? 85 : 65);
      rig.mood = grieving ? 'sad' : 'set';
      if (!sp.mood) sp.mood = 'down';
    } else {
      if (sp.mood === 'down') sp.mood = null;
      rig.mood = visit?.state === 'running' ? sp.mood as Mood | null : null;
    }
    if (moodHeld) rig.mood = was;
  } else if (!moodHeld) rig.mood = null;
  // No buttons or tallies over the cutscene.
  if (visitHud !== !!visit?.busy) { visitHud = !!visit?.busy; for (const id of ['story-inv', 'story-act']) { const el = document.getElementById(id); if (el) el.style.visibility = visitHud ? 'hidden' : ''; } }
  // Handed back to the tower's eyes, looking after it.
  if (visitWas && visit && !visit.busy && beacons.inside && giant) beacons.lookToward(giant.centre.x, giant.centre.z, giant.centre.y - 10);
  // Far from the task: a small arrowhead shows the way.
  if (pointer && storyHost?.story) {
    const g = journey ? journey.guide(mobs.leading) : storyHost.story.guide(mobs.leading);
    pointer.update(dt, camera, body.pos, g, !beacons.busy && !beacons.inside && !journey?.busy && !storyBusy && !dungeon?.inside);
  }
  // Patting the spirit: from behind, the explorer's back hides it all, so
  // with the mouse idle the camera eases round to the patting side.
  const patYaw = storyHost?.story?.patCamYaw ?? null;
  if (patYaw !== null && lookIdle > 0.3) {
    const behind = Math.atan2(Math.sin(body.heading + Math.PI - orbit.yaw), Math.cos(body.heading + Math.PI - orbit.yaw));
    if (Math.abs(behind) < 1.4) orbit.yaw += Math.atan2(Math.sin(patYaw - orbit.yaw), Math.cos(patYaw - orbit.yaw)) * (1 - Math.exp(-1.6 * dt));
  }
  towerDebug.update(body.pos, body.heading, orbit.yaw);
  for (const ev of body.events) if (ev.type === 'land' && ev.impact > 6) orbit.bump(Math.min(2.2, (ev.impact - 6) * 0.14));
  const focus = body.pos.clone();
  // (Down in the dungeon the saddle's bounce is smoothed out of it: the camera is close there, and on
  // a trotting mount it was bobbing with every stride.)
  let seatY = mode === 'ride' && riding ? riding.species.seat(riding).pos.y - body.pos.y : 0;
  if (mode === 'ride' && dungeon?.inside) seatY = rideSeatY = rideSeatY < 0 ? seatY : rideSeatY + (seatY - rideSeatY) * (1 - Math.exp(-1.5 * dt));
  else rideSeatY = -1;
  focus.y += mode === 'swim' ? 1.1 : mode === 'glide' ? 2.0 : mode === 'ride' && riding ? seatY + 1.1 : mode === 'bike' ? 1.55 : 1.4;
  focus.y += focusShift;
  if (focusOverride) focus.copy(focusOverride);
  // In the ring's arms the camera stays up where you stood.
  if (ring?.busy) focus.y = Math.max(focus.y, ring.heldY + 1.4);
  // Speed feel: FOV kick + pull-back when sprinting, diving, gliding.
  const hs = Math.hypot(body.vel.x, body.vel.z);
  const sprint = mode === 'walk' ? THREE.MathUtils.clamp((hs - 6.5) / 4, 0, 1) : 0;
  const fall = mode === 'walk' ? THREE.MathUtils.clamp((-body.vel.y - 10) / 20, 0, 1) : 0;
  const glide = mode === 'glide' ? 1 : 0;
  const flyK = mode === 'fly' ? THREE.MathUtils.clamp(body.vel.length() / 90, 0, 1) : 0;
  const rideK = mode === 'ride' ? THREE.MathUtils.clamp((body.vel.length() - 8) / 30, 0, 1) : 0;
  // Keeps building with speed: a mountain descent should feel like one.
  const bikeK = mode === 'bike' ? THREE.MathUtils.clamp((hs - 8) / 50, 0, 1.4) : 0;
  // (Down in the dungeon its own clamp keeps the camera over the floor: the plan's floor out in the rock,
  // where an unclamped camera often is, is no floor at all, and lifting the camera to it made it jump.)
  orbit.update(focus, dt, (x, z) => (dungeon?.inside ? -1e9 : Math.max(trail.height(x, z), SEA_LEVEL)), {
    fovKick: 3.5 * sprint + 7 * fall + (3 + THREE.MathUtils.clamp((hs - 9) / 6, 0, 1) * 4) * glide + 8 * flyK + 6 * rideK + 9 * bikeK,
    distScale: 1 + 0.12 * sprint + 0.15 * fall + 0.4 * glide + (mode === 'ride' ? (dungeon?.inside ? 0.08 : 0.25 + 0.2 * rideK) : 0) + 0.3 * bikeK,
    airborne: !body.grounded && mode !== 'ride',
    velX: body.vel.x,
    velZ: body.vel.z,
  });
  // Back in a tower's room: look in at yourself through the doorway.
  if (beacons.lowered !== null) {
    // Out of a tower's head: in front of you, a little to the side, the
    // doorway behind you; eased down from where the head's view was.
    orbit.yaw = beacons.lowered + 0.55;
    orbit.pitch = 0.16;
    orbit.targetDistance = 11;
    orbit.snap();
    beacons.lowered = null;
    camBlendPos.copy(camPrevPos); camBlendQ.copy(camPrevQ); camBlend = 0; camBlendDur = 1.1;
  }
  // In a tower's room, the camera stays inside it too.
  beacons.clampCamera(camera.position, focus, dt);
  if (dungeon?.inside) dungeon.clampCamera(camera.position, focus, dt, body.vel);
  beacons.camNow.copy(camera.position);
  // You are the tower's head: the camera looks out through its eyes.
  // A tower's spirit being freed: the camera watches it, not you, easing
  // in from where it was and back to you after (never a cut).
  // Or the hearth spirit pulling your bike out of its heart.
  const cine = beacons.cinematic() ?? (dungeon?.inside ? dungeon.cinematic() : null) ?? visit?.cinematic() ?? journey?.cinematic() ?? storyHost?.story?.cinematic() ?? null;
  if (cine) {
    if (!hadCine) {
      // From a tower's head the turn starts from the head's own view (last frame's camera), and takes its time.
      if (beacons.inside) { camBlendPos.copy(camPrevPos); camBlendQ.copy(camPrevQ); camBlendDur = 2.4; } else { camBlendPos.copy(camera.position); camBlendQ.copy(camera.quaternion); camBlendDur = 1.1; }
      camBlend = 0;
    }
    camera.position.copy(cine.pos);
    camera.lookAt(cine.at);
    const cf = (cine as { fov?: number }).fov;
    if (cf !== undefined && camera.fov !== cf) { camera.fov = cf; camera.updateProjectionMatrix(); }
    camLastPos.copy(camera.position); camLastQ.copy(camera.quaternion);
  } else if (hadCine) {
    orbit.yaw = body.heading + Math.PI;
    orbit.pitch = 0.18;
    orbit.targetDistance = 10;
    camBlendPos.copy(camLastPos); camBlendQ.copy(camLastQ); camBlend = 0; camBlendDur = 1.1;
  }
  hadCine = !!cine;
  if (camBlend < 1) {
    camBlend = Math.min(1, camBlend + dt / camBlendDur);
    const k = THREE.MathUtils.smootherstep(camBlend, 0, 1);
    camera.position.lerpVectors(camBlendPos, camera.position, k);
    // (Not slerpQuaternions(from, camera.quaternion): it copies `from` in first, so it never turns.)
    camToQ.copy(camera.quaternion);
    camera.quaternion.copy(camBlendQ).slerp(camToQ, k);
    camera.updateMatrixWorld();
  }
  const vc = visit?.busy ? null : beacons.viewCam();
  if (vc) {
    camera.position.copy(vc.pos);
    camera.lookAt(vc.at);
    camera.fov = vc.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  camPrevPos.copy(camera.position); camPrevQ.copy(camera.quaternion);
  // Backed against the rock down there, the camera is pushed in on top of you: you're not drawn, rather than seen from inside your hat.
  // (With a margin either way, or at that distance you'd flicker.)
  if (dungeon?.inside) rig.root.visible = camera.position.distanceTo(focus) > (rig.root.visible ? 1.2 : 1.7);
  U.uFocus.value.copy(focus);
  // Contact shadow sits on the ground under the explorer and shrinks with height.
  // Floor, not bare terrain: on a rock or roof the terrain-only shadow hides.
  const groundY = world.floorHeight!(body.pos.x, body.pos.z, body.pos.y, BODY_RADIUS);
  const lift = body.pos.y - groundY;
  TERRAIN_U.uPlayerFeet.value.set(body.pos.x, groundY, body.pos.z);
  TERRAIN_U.uPlayerLift.value = lift;
  if (mode === 'swim' || mode === 'ride' || lift > 40 || groundY < SEA_LEVEL || !rig.root.visible) TERRAIN_U.uPlayerFeet.value.y = -1e4;
  updateAimHud();

  env.update(dt);
  // Down there the light is the cave's own, whatever the hour is above.
  if (dungeon?.inside) dungeon.applyLight(camera.position);
  ambience.update(dt, { night: env.sky.night, home: atHome(), hush: !!visit?.busy || !!dungeon?.inside });
  U.uTime.value = elapsed;
  sky.update(camera, elapsed);
  terrain.update(camera.position);

  renderer.info.reset();
  if (!skipRender && dungeon?.inside) {
    // Its own scene, its own air; nothing of the world's overlay (the field, the pointer) shows through.
    const k = DUNGEON_LOOK, ov = post.overlay;
    // (But its own: the explorer's thought bubble.)
    post.overlay = ov && { ...ov, scene: dungeon.overlay };
    post.render(dungeon.scene, camera, k.fog, k.outline, k.tint, k.tintAmt, k.lift, k.air);
    post.overlay = ov;
  } else if (!skipRender) {
    groundShadow.update(renderer, terrain.root, camera.position);
    const s = env.sky;
    post.render(scene, camera, s.fog, s.outline, s.tint, s.tintAmt, s.lift);
  }

  checkpoints.tick(dt);
  ui.tick(dt, () => {
    const p = player.body.pos;
    const i = renderer.info.render;
    return `res ${(autoScale * postSettings.renderScale * 100).toFixed(0)}% · ${(i.triangles / 1e6).toFixed(2)}M tris · ${i.calls} calls · ${terrain.stats.nodes} nodes · ${terrain.stats.pending} queued\n` +
      `${player.current.name} · ${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)} · ${env.hour.toFixed(1)}h · seed ${seedText}\n` +
      `creatures ${mobs.stats.drawn}/${mobs.stats.mobs} drawn · ${mobs.stats.flocks} flocks · ${mobs.tamed.length} tamed · bikes ${bikes.stats.drawn}/${bikes.stats.bikes}`;
  });
  // TEMP (testing the drakittens): a crew rockets in and lands in front of
  // you a moment after the world's up. ?drak=0 turns it off.
  if (drakDemoT >= 0 && !terrain.busy && (drakDemoT += dt) > 2.5) {
    drakDemoT = -1;
    drakArrive(16);
  }
  if (veil && !terrain.busy && ++readyFrames > 10) {
    veil.classList.add('gone');
    setTimeout(() => veil?.remove(), 1000);
    veil = null;
  }
  if (!manualStep) requestAnimationFrame(frame);
}
let skidT = 0;
let hoofT = 0;
/** Seconds until a butt of the antlers lands (-1 = none under way). */
let buttAt = -1;
const stelkDir = new THREE.Vector3();
/** A full gallop (m/s along the heading) bowls trees over. */
const CHARGE_SPEED = 13;

/**
 * Riding a stelk: at a full gallop, trees in its path are knocked flat as it
 * runs through them (it hardly checks its stride); slower, a click (or the
 * badge) butts the tree in front down with the antlers. The logs hop into
 * your pack either way. Runs before the move, so the trunk is out of the way
 * before the gallop would hit it.
 */
function stelkWork(dt: number) {
  const story = storyHost?.story;
  if (!story) return;
  const m = riding;
  if (!m || m.species.name !== 'stelk') {
    story.ramReady = false;
    buttAt = -1;
    return;
  }
  const b = player.body;
  const gs = rideMode.gallopState;
  stelkDir.set(Math.sin(b.heading), 0, Math.cos(b.heading));
  const nose = m.species.radius + 0.4;
  if (b.grounded && gs.wet < 0.5 && gs.speed > CHARGE_SPEED) {
    const reach = nose + gs.speed * dt * 1.6 + 0.4;
    if (story.knockTree(b.pos, stelkDir, reach, 0.5)) {
      stelk.butt(m);
      gs.speed *= 0.85;
      orbit.bump(0.8);
    }
  }
  story.ramReady = b.grounded && gs.wet < 0.5 && gs.speed <= CHARGE_SPEED && !!story.treeAhead(b.pos, stelkDir, nose + 2.2, 0.8);
  if (buttAt < 0 && story.ramReady && input.pressed('Mouse0')) {
    stelk.butt(m);
    buttAt = 0.26;
  }
  if (buttAt >= 0) {
    buttAt -= dt;
    if (buttAt < 0 && story.knockTree(b.pos, stelkDir, nose + 2.6, 0.9)) orbit.bump(0.6);
  }
}
/** The explorer is hidden because their mount has gone underground. */
let burrowHid = false;
let trickT = 0;
const trickDir = new THREE.Vector3();

/**
 * The wilder mounts' tricks, after the move: dirt churned up over a
 * burrowing mudsnoot (and the rider tucked out of sight), motes left behind
 * a phasing glimmer, and a stormback's charge flattening trees and flinging
 * creatures aside with a crackle of sparks.
 */
function beastWork(m: Mob, dt: number) {
  const gs = rideMode.gallopState;
  const b = player.body;
  const sp = m.species.mount;
  if (sp.fly?.rocket) rocketWork(m, dt);
  if (!sp.trait) return;
  trickDir.set(Math.sin(b.heading), 0, Math.cos(b.heading));
  const behind = v3.set(b.pos.x - trickDir.x * m.species.radius, b.pos.y + 0.2, b.pos.z - trickDir.z * m.species.radius);
  switch (gs.fx) {
    case 'burrow': mudPuffs.emit(behind.setY(b.pos.y + 0.3), 10, 0.28, 2.4); orbit.bump(0.5); break;
    case 'emerge': mudPuffs.emit(v3.set(b.pos.x, b.pos.y + 0.2, b.pos.z), 12, 0.3, 2.8); orbit.bump(0.6); break;
    case 'phase': glowPuffs.emit(v3.set(b.pos.x, b.pos.y + 1, b.pos.z), 8, 0.12, 1.4); break;
    case 'charge': sparkPuffs.emit(v3.set(b.pos.x, b.pos.y + 1.6, b.pos.z), 10, 0.1, 2.2); orbit.bump(1.0); break;
    case 'dive': case 'surface': puffs.emit(v3.set(b.pos.x, SEA_LEVEL + 0.1, b.pos.z), 7, 0.2, 2.2); break;
  }
  // Underground: a travelling ridge of dirt, the explorer tucked away.
  const under = gs.burrow > 0;
  if (under !== burrowHid) { rig.root.visible = !under; burrowHid = under; }
  trickT -= dt;
  if (trickT <= 0) {
    trickT = 0.06;
    if (under) mudPuffs.emit(v3.set(b.pos.x + (Math.random() - 0.5) * 0.6, b.pos.y + 0.05, b.pos.z + (Math.random() - 0.5) * 0.6), 1, 0.24, 0.9);
    if (gs.phase > 0) glowPuffs.emit(v3.set(b.pos.x, b.pos.y + 0.9, b.pos.z), 2, 0.09, 0.6);
    if (gs.charge > 0) sparkPuffs.emit(v3.set(b.pos.x + (Math.random() - 0.5) * 2, b.pos.y + 1.2 + Math.random(), b.pos.z + (Math.random() - 0.5) * 2), 1, 0.07, 1.2);
    else if (gs.static > 0.6 && Math.random() < gs.static * 0.35) sparkPuffs.emit(v3.set(b.pos.x + (Math.random() - 0.5) * 1.6, b.pos.y + 2.2, b.pos.z + (Math.random() - 0.5) * 1.6), 1, 0.05, 0.5);
  }
  // Charging: trees ahead go down, creatures are thrown aside.
  if (gs.charge > 0) {
    const story = storyHost?.story;
    const nose = m.species.radius + 0.4;
    if (story?.knockTree(b.pos, trickDir, nose + gs.speed * dt * 1.6 + 0.6, 0.7)) orbit.bump(0.7);
    if (mobs.shove(b.pos, trickDir, m.species.radius + 1.6, CHARGE_RUN * 0.5, m)) orbit.bump(0.5);
  }
}

/**
 * A drakitten's rocket, ridden: a burst of smoke and a kick of the camera
 * as it lights, a steady trail of smoke puffs while it burns (the mob lays
 * those itself, see Drakitten.think), and when it overheats a sad little
 * sputter of darker puffs until it cools.
 */
let sputterT = 0;
function rocketWork(m: Mob, dt: number) {
  const gs = rideMode.gallopState;
  const b = player.body;
  const back = v3.set(b.pos.x - Math.sin(b.heading) * m.species.radius, b.pos.y + m.species.centreY - 0.1, b.pos.z - Math.cos(b.heading) * m.species.radius);
  if (gs.fx === 'ignite') { smokePuffs.emit(back, 7, 0.3, 2.4, undefined, SMOKE); orbit.bump(0.7); }
  if (gs.fx === 'fizzle') { puffs.emit(back, 6, 0.2, 1.6); orbit.bump(0.4); }
  sputterT -= dt;
  if (gs.overheat && sputterT <= 0) {
    sputterT = 0.3 + Math.random() * 0.3;
    mudPuffs.emit(back, 1, 0.14, 0.4, undefined, { life: 0.8, rise: 0.8, drag: 2, up: 0.4 });
  }
}

/** Seconds of dust trail left after a timed kick. */
let trailT = 0;
let trailEmit = 0;
const v3 = new THREE.Vector3();
const v3b = new THREE.Vector3();

/**
 * Touch: with no finger on the camera, it swings round behind the way you're
 * going, so the stick alone is enough to explore. It leaves you alone while
 * you run towards it (no whip-around) and eases the pitch back to a
 * comfortable angle. Bikes keep their own drift (below).
 */
function followOnTouch(dt: number) {
  touch!.update(dt);
  if (cycling || touch!.lookIdle < 0.4) return;
  const v = player.body.vel;
  const hs = Math.hypot(v.x, v.z);
  if (hs < 0.8) return;
  const d = Math.atan2(Math.sin(Math.atan2(-v.x, -v.z) - orbit.yaw), Math.cos(Math.atan2(-v.x, -v.z) - orbit.yaw));
  const ease = Math.min(1, (touch!.lookIdle - 0.4) / 0.6) * Math.min(1, (hs - 0.8) / 3);
  if (Math.abs(d) < 2.3) orbit.yaw += d * (1 - Math.exp(-0.8 * ease * dt));
  const pitch = player.current.name === 'fly' || riding ? orbit.pitch : 0.2;
  orbit.pitch += (pitch - orbit.pitch) * (1 - Math.exp(-0.8 * ease * dt));
}

/** The lasso reticle over the aimed mob, and the context prompt. */
const aimV = new THREE.Vector3();
function updateAimHud() {
  const a = mobs.aim;
  const next = nextMount();
  const onto = next ? ('mob' in next ? `ride the ${next.mob.species.name}` : 'ride the bicycle') : '';
  const mounted = !!riding || !!cycling;
  const tips: string[] = [];
  if (a) {
    aimV.copy(a.mob.pos).setY(a.mob.pos.y + a.mob.species.centreY).project(camera);
    const x = (aimV.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-aimV.y * 0.5 + 0.5) * window.innerHeight;
    aimEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    aimEl.className = aimV.z < 1 ? 'on ' + a.action : '';
    tips.push(a.action === 'lasso' ? '<b>R</b> lasso' : a.action === 'lead' ? '<b>R</b> lead' : '<b>R</b> let go');
  } else aimEl.className = '';
  const e = next ? `<b>E</b> ${onto}` : '<b>E</b> hop off';
  if (next && !mounted) tips.push(e);
  if (cycling) tips.push(`${e} · <b>Shift</b> pedal hard · <b>Space</b> hop`);
  if (riding) {
    const sp = riding.species.mount;
    const verb = riding.species.verb;
    const swim = sp.trait?.diver && rideMode.gallopState.wet > 0.5 ? ' · <b>C</b> dive · <b>Space</b> rise' : '';
    const space = sp.trait?.ability === 'charge' ? (rideMode.gallopState.static >= 0.3 ? 'charge' : 'leap') : verb ?? 'leap';
    if (sp.trait?.snap) tips.push(`${e} · <b>A</b>/<b>D</b> turn · <b>${rideMode.gallopState.crawl ? 'S</b> stop' : 'W</b> go'} · <b>Shift</b> hurry`);
    else if (!sp.fly) tips.push(`${e} · <b>Shift</b> gallop${sp.leap || sp.trait?.ability ? ` · <b>Space</b> ${space}` : ''}${swim}${storyHost?.story?.ramReady ? ' · <b>Click</b> knock it down' : ''}`);
    else {
      const gs = rideMode.gallopState;
      const rocket = sp.fly.rocket ? (gs.overheat ? ' · <i>rocket cooling…</i>' : ' · <b>Shift</b> rocket') : '';
      tips.push((sp.walk ? `${e} · <b>Space</b> take off / climb · <b>C</b> descend` : `${e} · <b>Space</b> climb · <b>C</b> descend`) + rocket);
    }
  }
  touch?.setContext({
    ride: next ? (mounted ? 'Switch' : 'Ride') : mounted ? 'Hop off' : null,
    lasso: a ? (a.action === 'lasso' ? 'Lasso' : a.action === 'lead' ? 'Lead' : 'Let go') : null,
    down: (!!riding && !!riding.species.mount.fly) || player.current.name === 'fly',
    fly: !riding && !cycling,
  });
  const html = tips.join(' · ');
  if (promptEl.innerHTML !== html) promptEl.innerHTML = html;
  promptEl.style.opacity = html && !storyHost?.story?.silent ? '1' : '0';
}

let veil = document.getElementById('veil');
let readyFrames = 0;
let drakDemoT = params.get('drak') === '0' || params.has('capture') ? -1 : 0;
/**
 * A crew of three drakittens (pink, dark, tabby) rockets in and lands in
 * the cabin's front yard if you're at the cabin, else `d` m in front of you.
 */
function drakArrive(d = 16, n = 3) {
  const b = player.body;
  const st = gen.story;
  const home = Math.hypot(b.pos.x - st.x, b.pos.z - st.z) < 70;
  const x = home ? st.x + Math.sin(st.rot) * 11 : b.pos.x + Math.sin(b.heading) * d;
  const z = home ? st.z + Math.cos(st.rot) * 11 : b.pos.z + Math.cos(b.heading) * d;
  const f = mobs.spawnFlockAt('drakitten', x, z, mobCtx, n);
  if (!f) return false;
  const sp = f.species as Drakitten;
  f.members.forEach((m, i) => sp.setCoat(m, i % 3));
  sp.arrive(f, mobCtx);
  return true;
}
if (params.has('capture')) { veil?.remove(); veil = null; }
requestAnimationFrame(frame);

// Hooks for the screenshot / perf harness.
declare global {
  interface Window { __ow: unknown }
}
window.__ow = {
  ready: () => !terrain.busy,
  stats: () => ({ ...terrain.stats, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, kinds: terrain.kindStats() }),
  setHour: (h: number) => { env.hour = h; env.apply(); },
  /** The ambient soundtrack's mix and what's playing (tests). */
  ambience,
  setPalette: (p: string | null) => { env.paletteOverride = p; },
  teleport: (x: number, z: number) => placePlayer(x, z),
  view: (yaw: number, pitch: number, dist: number) => { orbit.yaw = yaw; orbit.pitch = pitch; orbit.targetDistance = dist; orbit.snap(); },
  setMode: (m: string, y?: number) => { player.set(m, ctx); if (y !== undefined) player.body.pos.y = gen.height(player.body.pos.x, player.body.pos.z) + y; },
  /** Turn the camera toward the highest ground within `r` metres. */
  facePeak: (r = 5000) => {
    const p0 = player.body.pos;
    let best = -Infinity, bx = 0, bz = 0;
    for (let z = -r; z <= r; z += 150) for (let x = -r; x <= r; x += 150) {
      if (x * x + z * z > r * r || x * x + z * z < 600 * 600) continue;
      const h = gen.height(p0.x + x, p0.z + z);
      if (h > best) { best = h; bx = x; bz = z; }
    }
    orbit.yaw = Math.atan2(-bx, -bz);
    orbit.snap();
    return { h: best, d: Math.hypot(bx, bz) };
  },
  setSeed,
  pos: () => ({ ...player.body.pos }),
  height: (x: number, z: number) => gen.height(x, z),
  gen: () => gen,
  /** Frame the nearest POI of a kind: player stands `dist` m from it, camera behind. */
  lookAtPoi: (kind: string, dist = 25, side: number | null = null, hover = 0) => {
    const p0 = player.body.pos;
    let best: { x: number; z: number; y: number } | null = null;
    let bd = Infinity;
    gen.poiCellRange(p0.x - 3000, p0.z - 3000, p0.x + 3000, p0.z + 3000, (p) => {
      const d = Math.hypot(p.x - p0.x, p.z - p0.z);
      if (p.kind === kind && d < bd) { bd = d; best = p; }
    });
    if (!best) return null;
    const b = best as { x: number; z: number; y: number };
    if (side === null) {
      // Pick the most open, downhill side so the POI is actually in view.
      let lowest = Infinity;
      for (let a = 0; a < 6.28; a += 0.39) {
        const x = b.x + Math.cos(a) * dist, z = b.z + Math.sin(a) * dist;
        if (gen.height(x, z) < 3) continue;
        let score = gen.height(x, z);
        for (let t = 0.25; t < 1; t += 0.25) score += Math.max(0, gen.height(b.x + Math.cos(a) * dist * t, b.z + Math.sin(a) * dist * t) - b.y) * 2;
        score += 60 * gen.forestDensity(x, z, gen.height(x, z));
        if (score < lowest) { lowest = score; side = a; }
      }
    }
    const x = b.x + Math.cos(side!) * dist;
    const z = b.z + Math.sin(side!) * dist;
    placePlayer(x, z);
    if (hover > 0) {
      player.set('fly', ctx);
      player.body.pos.y = Math.max(gen.height(x, z) + 2, b.y + hover);
    }
    orbit.yaw = Math.atan2(-(b.x - x), -(b.z - z));
    orbit.snap();
    return { x: b.x, z: b.z };
  },

  input,
  story: () => storyHost?.story,
  storyHost,
  body: player.body,
  post: postSettings,
  // debug handles for the probe scripts
  _r: renderer,
  _p: post,
  _scene: scene,
  _terrain: terrain,
  _shadow: groundShadow,
  _colliders: colliders,
  _body: player.body,
  _cam: camera,
  _orbit: orbit,
  mobs,
  /** Drop a flock (floof|crow|stelk) `d` m in front of the explorer. */
  spawnFlock: (name: string, d = 14, n?: number) => {
    const b = player.body;
    mobs.spawnFlockAt(name, b.pos.x + Math.sin(b.heading) * d, b.pos.z + Math.cos(b.heading) * d, mobCtx, n);
  },
  /** Tame the nearest wild mob of a species on the spot (for shots/tests). */
  tameNearest: (name?: string) => {
    let best: Mob | null = null, bd = Infinity;
    for (const m of mobs.all()) {
      if (m.state !== 'wild' || (name && m.species.name !== name)) continue;
      const d = m.pos.distanceTo(player.body.pos);
      if (d < bd) { bd = d; best = m; }
    }
    if (best) { best.state = 'caught'; best.stateT = 99; }
    return !!best;
  },
  /** The ride state of the newer mounts (abilities), for probes. */
  rideState: () => { const g = rideMode.gallopState; return { speed: +g.speed.toFixed(1), phase: +g.phase.toFixed(2), burrow: +g.burrow.toFixed(2), charge: +g.charge.toFixed(2), static: +g.static.toFixed(2), depth: +g.depth.toFixed(2), rocket: +g.rocket.toFixed(2), heat: +g.heat.toFixed(2), overheat: g.overheat }; },
  /** Drop a flock of `n` right at (x, z). */
  spawnAt: (name: string, x: number, z: number, n?: number) => mobs.spawnFlockAt(name, x, z, mobCtx, n),
  drakArrive,
  /** The giant: `giantAhead(dist, face, walk)` stands it in view; `giant()` is it (or null). */
  giantAhead,
  summonGiant,
  giant: () => giant,
  /** The giant's visit to the village (null without a story). */
  visit: () => visit,
  /** The first dungeon's ring (`ring().setOpen()` opens it for shots). */
  ring: () => ring,
  goToRing,
  /** The first dungeon, inside (null until you've been down). `enterDungeon()` is the ring taking you; `enterDungeon(x, z)` stands you at a point of its plan; `leaveDungeon()` brings you back up. */
  dungeon: () => dungeon,
  enterDungeon: (x?: number, z?: number) => { ring?.setOpen(); enterDungeon(x === undefined ? undefined : [x, z ?? 0]); },
  leaveDungeon: () => { if (dungeon?.inside) { dungeon.inside = false; leaveDungeon(); } },
  /** The other spirits' houses down the lane (null when no lane fits the seed). */
  village: () => storyHost?.story?.village ?? null,
  trail,
  /** Phase 3 (shots/tests): `n` fresh creatures of a species, lassoed inside the pasture so they come to live there. */
  bringHome: (name: string, n = 1) => {
    const st = storyHost?.story?.stable;
    if (!st) return false;
    const at = st.spot(Math.random, 1.5);
    mobs.spawnFlockAt(name, at.x, at.z, mobCtx, n);
    for (const m of mobs.all()) if (m.state === 'wild' && m.species.name === name && st.inside(m.pos.x, m.pos.z, 1)) { m.state = 'caught'; m.stateT = 99; }
    return true;
  },
  mountNearest: () => { const m = mobs.mountable(player.body.pos) ?? mobs.tamed[0]; if (m) mount(m); return !!m; },
  bikes,
  bikeMode,
  /** Climb onto the nearest bicycle (teleports next to it first if needed). */
  mountBike: () => {
    rig.root.visible = true;
    focusShift = 0;
    let best: Bike | null = null, bd = Infinity;
    for (const k of bikes.bikes.values()) {
      const d = k.pos.distanceTo(player.body.pos);
      if (!k.ridden && d < bd) { bd = d; best = k; }
    }
    if (best) mountBike(best);
    return !!best;
  },
  dismountBike,
  lockInput: (yaw: number | null) => { inputYaw = yaw; },
  /** How you're getting about just now ('walk', 'glide', 'ride', ...), and what you're riding. */
  mode: () => player.current.name,
  riding: () => riding,
  /** Orbit the camera round a world point instead of the explorer (null = back to normal). */
  focusAt: (x: number | null, y = 0, z = 0) => { focusOverride = x === null ? null : new THREE.Vector3(x, y, z); orbit.snap(); },
  /** Frame the nearest bicycle from `dist` m, from `side` (rad around it, 0 = its left). */
  goToTower: (i: number) => goToTower(i),
  /** Phase 2: the journey director; `journeyJump(stage)` jumps to a step. */
  journey: () => journey,
  journeyJump: (s: Stage) => journey?.jump(s),
  /** Phase 3: jump to a step (`stableJump('fence')`), and the herd. */
  stableJump,
  herd: () => herd,
  /** Stop the clock (true) and step frames by hand with `advance`, or hand it back (false). */
  manual: (on: boolean) => { if (manualStep && !on) { manualStep = false; timer.update(); requestAnimationFrame(frame); } else manualStep = on; },
  /** Run `n` frames of exactly `dt` seconds each (only in manual mode). */
  advance: (n: number, dt = 1 / 60) => { for (let i = 0; i < n; i++) { stepDt = dt; skipRender = i < n - 1; frame(); } stepDt = null; skipRender = false; },
  _world: world,
  beacons,
  _towerDebug: towerDebug,
  lookAtBike: (dist = 4, side = 0, pitch = 0.12, hide = true) => {
    let best: Bike | null = null, bd = Infinity;
    for (const k of bikes.bikes.values()) {
      const d = k.pos.distanceTo(player.body.pos);
      if (d < bd) { bd = d; best = k; }
    }
    if (!best) return null;
    // The explorer waits just beyond the bike, so the camera frames both.
    const a = best.heading + Math.PI / 2 + side;
    placePlayer(best.pos.x - Math.sin(a) * 0.9, best.pos.z - Math.cos(a) * 0.9);
    orbit.yaw = a;
    orbit.pitch = pitch;
    orbit.targetDistance = dist;
    orbit.snap();
    rig.root.visible = !hide;
    focusShift = hide ? best.pos.y - player.body.pos.y - 1.0 : 0;
    return { x: best.pos.x, z: best.pos.z, key: best.key };
  },
  dismount,
  rig,
  /** Orbit a mob for close-ups: brains freeze, the explorer hides. yawRel 0 = its front. */
  inspect: (i: number, yawRel: number, pitch: number, dist: number, species?: string) => {
    const list = [...mobs.all()].filter((m) => !species || m.species.name === species);
    const m = list[i];
    if (!m) return false;
    mobs.settings.freeze = true;
    if (m.data) { m.data.lookAt = null; m.data.peck = 9; m.data.headYawT = 0; }
    rig.root.visible = false;
    player.set('fly', ctx);
    player.body.pos.set(m.pos.x, m.pos.y + m.species.centreY - 1.4, m.pos.z);
    player.body.vel.set(0, 0, 0);
    orbit.yaw = m.heading + yawRel;
    orbit.pitch = pitch;
    orbit.targetDistance = dist;
    orbit.snap();
    return true;
  },
};
