import './core/colorSetup';
import * as THREE from 'three';
import './style.css';
import { seedFromString } from './core/rng';
import { Environment } from './gfx/environment';
import { GroundShadow, groundShadowSettings } from './gfx/groundShadow';
import { initMaterials, TERRAIN_U, U, DUNGEON_U } from './gfx/materials';
import { PostPipeline, postSettings } from './gfx/post';
import { Warmth } from './story/warmth';
import { Snow } from './story/snow';
import { Sparks } from './story/sparks';
import { Puffs } from './gfx/puffs';
import { Sky } from './gfx/sky';
import { CharacterRig, type Mood } from './player/character';
import { Input } from './player/input';
import { TouchControls, isTouchDevice } from './ui/touch';
import { BikeMode, BODY_RADIUS, CarriedMode, CHARGE_RUN, PHASE_IN, FlyMode, GlideMode, MovementController, RideMode, SwimMode, WalkMode, type MoveContext, type WorldQuery } from './player/movement';
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
import { SkipPrompt } from './ui/skip';
import { StoryHost } from './story/host';
import { Ambience } from './audio/ambience';
import { Harvest } from './world/harvest';
import { Bikes, type Bike } from './vehicles/bikes';
import { Dungeon, DUNGEON_LOOK } from './dungeon/dungeon';
import { MoonHall, MOTH_LOOK } from './dungeon/mothCave';
import { DropCave, DROP_LOOK } from './dungeon/dropCave';
import { VeilCave } from './dungeon/veilCave';
import { BLINK_IN, blinkIn, glimmerStatue } from './mobs/glimmer';
import { moonmothStatue } from './mobs/moonmoth';
import { wurmStatue } from './mobs/wurm';
import { Giant } from './giant/giant';
import { Trail } from './giant/trail';
import { soleSdf, type Print } from './world/prints';
import { HOME, type DigSite } from './story/village';
import { Homecoming } from './giant/homecoming';
import { Offering, OFFER_SHORT } from './giant/offering';
import { Hands } from './world/hands';
import { Ring, type RingDeps } from './giant/ring';
import { restOf, Visit } from './giant/visit';
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

/**
 * Which land the saves in storage belong to. Bump it whenever world gen moves
 * every seed's land (2: less water; 3: forest grown round the start, 2026-10-02): every save of every seed is
 * then thrown away on the next load, before anything reads one, since they
 * hold places (felled trees, lit towers, the dungeon sites) that are gone.
 */
const WORLD_VERSION = '6';
try {
  // The game was Fjellheim until 2026-10-06: saves made under that name come along.
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith('fjellheim.')) continue;
    const to = `embla.${k.slice('fjellheim.'.length)}`;
    if (localStorage.getItem(to) === null) localStorage.setItem(to, localStorage.getItem(k)!);
    localStorage.removeItem(k);
  }
  if (localStorage.getItem('embla.world') !== WORLD_VERSION) {
    for (const k of Object.keys(localStorage)) if (k.startsWith('embla.')) localStorage.removeItem(k);
    localStorage.setItem('embla.world', WORLD_VERSION);
  }
} catch { /* no storage: nothing to wipe */ }
let seedText = params.get('seed') ?? 'hilda';
let gen = new WorldGen(seedFromString(seedText));
/**
 * The dungeon site is slow to find (seconds on a bad seed), so it's found
 * once per seed, kept in localStorage, and handed to the chunk workers.
 */
function primeDungeon(g: WorldGen) {
  primeStory(g);
  // (v7: a list. The first dungeon's site, and the one the giant walks on to after it.
  // v8: less water, 2026-10-02; every seed's land moved, and its sites with it.
  // v9: a third site, where the giant walks on to after the second dungeon.
  // v10: a fourth, after the third.
  // v12: a fifth, after the fourth.)
  const key = `embla.dungeon.v12.${g.seed}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) g.presetDungeons(JSON.parse(raw));
    else { const t0 = performance.now(); localStorage.setItem(key, JSON.stringify(g.dungeons)); siteSearchMs = performance.now() - t0; }
  } catch { /* private mode: they're found again each load */ }
  return g.dungeons;
}
/**
 * The start site is slow to find too (a couple of seconds, and every chunk
 * worker would find it again before its first chunk): once per seed, kept,
 * and handed to the workers (`terrain.story`). Bump the key's version when
 * `findStorySite` changes what it finds.
 */
function primeStory(g: WorldGen) {
  const key = `embla.site.v1.${g.seed}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) g.presetStory(JSON.parse(raw));
    else localStorage.setItem(key, JSON.stringify(g.story));
  } catch { /* private mode: it's found again each load */ }
  return g.story;
}
/** Dev: how long the search for the dungeon sites took on this load (0: they were cached). */
let siteSearchMs = 0;
const terrain = new Terrain(gen.seed);
terrain.dungeons = primeDungeon(gen);
terrain.story = gen.story;
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
// The giant (only once summoned). It's solid, asleep or walking: see `world` below.
let giant: Giant | null = null;
// What the giant leaves behind: footprints you can walk down into, flattened trees.
const trail = new Trail({ ground: (x, z) => gen.height(x, z), colliders });
// The first dungeon, inside (built the first time the ring takes you down). While you're in it, it is the world.
let dungeon: Dungeon | null = null;
// What you do with its light once you're back up: the shrine the ring becomes, the crow, the giant's hand.
let offering: Offering | null = null;
// What follows it: a crow takes one spirit's light home, and the giant gets up and walks on to the next ring.
let homecoming: Homecoming | null = null;
// The second dungeon, inside: the Veil Cave, under the second ring (built the first time that ring takes you down).
let cave: VeilCave | null = null;
// What becomes of its light: the first's offering again, told quickly, with a glimmer in stone for the shrine.
let offering2: Offering | null = null;
// And what follows that: the second spirit's light flown home, and the giant up again and on to the third ring.
let homecoming2: Homecoming | null = null;
// The third dungeon, inside: the Moon Hall, under the third ring (built the first time that ring takes you down).
let hall: MoonHall | null = null;
// What becomes of its light: the offering told quickly again, with a moonmoth in stone for the shrine.
let offering3: Offering | null = null;
// And what follows that: the third spirit's light flown home, and the giant up again and on to the fourth ring (bare stones: nothing is under it yet).
let homecoming3: Homecoming | null = null;
let homecoming4: Homecoming | null = null;
// The fourth dungeon, inside: the Drop, under the fourth ring (built the first time that ring takes you down). Nothing follows its light yet.
let chasm: DropCave | null = null;
// What becomes of its light: the offering told quickly again, with a wurm in stone for the shrine. Nothing follows it yet.
let offering4: Offering | null = null;
/** Whichever dungeon you're down in (while you are, it is the world), or null. */
const den = () => (dungeon?.inside ? dungeon : cave?.inside ? cave : hall?.inside ? hall : chasm?.inside ? chasm : null);
// Stone hands standing about the world, on islands and summits (world/hands.ts). They do nothing yet.
let hands: Hands | null = null;
const world: WorldQuery = {
  groundHeight: (x, z) => den()?.floorAt(x, z) ?? trail.height(x, z),
  floorHeight: (x, z, feetY, r) => den()?.floorAt(x, z, feetY) ?? Math.max(trail.height(x, z), colliders.surface(x, z, feetY, r), storyHost?.story?.surface(x, z, feetY, r, 0.5) ?? -Infinity, beacons?.surface(x, z, feetY) ?? -Infinity, giant?.surface(x, z, feetY, 0.6) ?? -Infinity),
  collide: (pos, vel, r, rampMax, noTrees) => {
    const d = den();
    if (d) { d.collide(pos, vel, r); return; }
    colliders.push(pos, vel, r, rampMax, noTrees);
    bikes.push(pos, vel, r);
    storyHost?.story?.collide(pos, vel, r);
    beacons?.collide(pos, vel, r);
    giant?.push(pos, vel, r);
    offering?.collide(pos, vel, r);
    offering2?.collide(pos, vel, r);
    offering3?.collide(pos, vel, r);
    offering4?.collide(pos, vel, r);
    hands?.collide(pos, vel, r);
  },
  ramp: (x, z, r, maxRise) => (den() ? -Infinity : colliders.ramp(x, z, r, maxRise)),
  climbTop: (x, z, r) => den() ? (chasm?.inside ? chasm.climbTop(x, z, r) : -Infinity) : Math.max(colliders.cabinTop(x, z, r), storyHost?.story?.surface(x, z, Infinity, r, Infinity) ?? -Infinity),
  wetland: (x, z) => (den() ? 0 : gen.bog(x, z)),
  forest: (x, z) => (den() ? 0 : gen.forestDensity(x, z, gen.height(x, z))),
  // (A glimmer phasing in the Veil Cave passes its veils, and nothing else of it: rock is rock.)
  landmarks: (pos, vel, r) => { if (cave?.inside) { cave.collide(pos, vel, r, true); return; } if (dungeon?.inside || hall?.inside || chasm?.inside) return; beacons?.collide(pos, vel, r); giant?.land(pos, vel, r); },
  // (The Drop's wind, when it has you.)
  updraft: (pos) => (chasm?.inside ? chasm.updraft(pos) : null),
  waterLevel: SEA_LEVEL,
};

const rideMode = new RideMode();
const bikeMode = new BikeMode();
const walkMode = new WalkMode();
const player = new MovementController([walkMode, new SwimMode(), new FlyMode(), new GlideMode(), rideMode, bikeMode, new CarriedMode()], 'walk');
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
  gs.phase = gs.burrow = gs.charge = gs.static = gs.depth = gs.cool = gs.rocket = gs.heat = gs.wall = gs.wallSide = gs.stickX = 0;
  gs.overheat = false;
  gs.crawl = false;
  if (m.data && 'gs' in m.data) (m.data as BeastData).gs = gs;
  player.set('ride', ctx);
  riding = m;
  // (Not down in the dungeon: its passages are narrower than that, and the camera would be forever on the walls.)
  if (!den()) orbit.targetDistance = Math.max(orbit.targetDistance, 12);
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
  gs.phase = gs.burrow = gs.charge = gs.rocket = gs.wall = gs.wallSide = 0;
  blinkWork(null, 0);
  mobs.dismount(m);
  player.set('walk', ctx);
}

// Bicycles: parked about the world, ridden through BikeMode.
let cycling: Bike | null = null;
/** Last spot the bike stood on dry land (where it's left if you tumble into deep water). */
const lastDry = new THREE.Vector3();
let lookIdle = 0;
/** On a face of the Drop on the wurm (0..1, eased): how far the camera has stood back for it. */
let wallCamK = 0;
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
  const d = den();
  if (d) {
    const m = d.mountable ? mobs.mountable(player.body.pos, riding ? 6.5 : undefined) : null;
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
// Flying on foot is a dev tool: off unless ticked in the panel (Player), or ?fly=1 (0 clears it). Kept in this browser.
const devFly = { on: false };
try { devFly.on = params.has('fly') ? params.get('fly') !== '0' : localStorage.getItem('ow.devFly') === '1'; } catch { /* storage unavailable */ }
if (params.has('fly')) try { localStorage.setItem('ow.devFly', devFly.on ? '1' : '0'); } catch { /* ignore */ }
const storyActive = params.get('story') === '1' || (params.get('story') !== '0' && !params.has('t') && !params.has('x') && params.get('mode') !== 'fly');
// Felled trees and smashed rocks (hidden on the GPU, left out of collision).
const harvest = new Harvest();
colliders.skip = (kind, x, z) => { const [gi, gj] = Harvest.cellOf(kind, x, z); return harvest.gone(kind, gi, gj) || trail.prints.clears(x, z); };
colliders.busy = (kind, x, z) => { const [gi, gj] = Harvest.cellOf(kind, x, z); return harvest.has(kind, gi, gj); };
storyHost = new StoryHost({ scene, post, env, rig, body: player.body, camera, puffs: (at, n, size, spread) => puffs.emit(at, n, size, spread), colliders, harvest, dent: (x, z) => trail.prints.offset(x, z) }, storyActive);
const ambience = new Ambience(storyHost.sfx);
if (import.meta.env.DEV) (window as unknown as { __action: unknown }).__action = (a: Parameters<Ambience['action']>[0]) => ambience.action(a);
if (params.has('fresh')) try { localStorage.removeItem(`embla.story.${seedText}`); } catch { /* ignore */ }
storyHost.build(gen, seedText);
if (params.has('fresh')) try { localStorage.removeItem(`embla.journey.${seedText}`); } catch { /* ignore */ }
// Dev views of the beacon-tower network (L sight lines, M map; panel only).
const towerDebug = new TowerDebug();
storyHost.overlay.add(towerDebug.group);
towerDebug.setGen(gen);
if (params.get('towers') === '1') towerDebug.settings.links = towerDebug.settings.map = true;
// Beacon towers: drawn at any distance, their spirits lift you up and down.
if (params.has('fresh')) try { localStorage.removeItem(`embla.towers.${seedText}`); localStorage.removeItem(`embla.towers.${seedText}.out`); localStorage.removeItem(`embla.sparks.${seedText}`); } catch { /* ignore */ }
let hadCine = false;
/**
 * The way out of a cutscene (ui/skip.ts: hold Space). A veil comes up, the
 * scene is put to how it ends (each one's own `skip`), the veil waits for
 * the land round you, and goes. `skipK`: how much of the frame it covers;
 * `skipCut`: the camera is handed back at a cut, under it.
 */
const skipPrompt = new SkipPrompt(isTouchDevice());
let skipStage: 'none' | 'in' | 'hold' | 'out' = 'none', skipK = 0, skipT = 0, skipFrames = 0, skipCut = false;
/** What's playing that can be skipped (null: nothing), as the thing to do about it. An offering goes with the homecoming that follows it: one scene, to whoever's watching. */
function skippable(): (() => void) | null {
  if (den()) return null;
  if (visit?.busy) return () => visit!.skip();
  for (const [o, h] of [[offering, homecoming], [offering2, homecoming2], [offering3, homecoming3], [offering4, homecoming4]] as const) {
    if (o?.canSkip) return () => { o.skip(player.current.name); h?.begin(); h?.skip(); };
    if (h?.busy) return () => h.skip();
  }
  return null;
}
function skipUpdate(dt: number) {
  if (skipPrompt.update(dt, skipStage === 'none' && !!skippable(), input.held('Space')) && skipStage === 'none') skipStage = 'in';
  if (skipStage === 'in') {
    skipK = Math.min(1, skipK + dt / 0.3);
    if (skipK >= 1) { skippable()?.(); skipCut = true; skipStage = 'hold'; skipT = 0; skipFrames = 0; }
  } else if (skipStage === 'hold') {
    skipT += dt;
    if ((skipT > 0.35 && ++skipFrames > 8 && !terrain.busy) || skipT > 20) skipStage = 'out';
  } else if (skipStage === 'out') {
    skipK = Math.max(0, skipK - dt / 0.5);
    if (skipK <= 0) skipStage = 'none';
  }
}
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
  // (And a tower out in the cold country wants sparks as well.)
  canSmash: (t) => (storyHost.active && storyHost.story ? storyHost.story.hasPick : true) && (!warmth.isCold(t.id) || sparks.count >= sparks.price(t.id)),
  paid: (t) => { if (warmth.isCold(t.id)) sparks.pay(t.id); },
  showPick: () => { if (storyHost.active && storyHost.story) storyHost.story.showTool('pick'); else sandboxPickT = 0.8; },
  hidePlayer: (on) => { rig.root.visible = !on; },
});
scene.add(beacons.group);
// The cold country: for now only the mountain tops (story/warmth.ts). `?cold=1` makes all of it cold country, `?cold=0` none.
const warmth = new Warmth({
  height: (x, z) => gen.height(x, z),
  lit: (id) => beacons.isAlight(id),
  // A won dungeon's ring warms its own country, once the giant has got up from beside it and gone on .
  ringWarm: (i) => !!(i === 0 ? homecoming?.left : i === 1 ? homecoming2?.left : i === 2 ? homecoming3?.left : i === 3 ? homecoming4?.left : false),
});
// Sparks: found in warm land, and what a sealed tower out in the cold takes to open (story/sparks.ts).
const sparks = new Sparks({
  warm: (x, z) => warmth.warmAt(x, z),
  ground: (x, z) => gen.height(x, z),
  // (Into the pack, as the village's go.)
  jarAt: (out) => out.copy(player.body.pos).setY(player.body.pos.y + 1.1),
  onWake: () => storyHost.sfx.pickup(),
  onTake: () => storyHost.sfx.collect(Math.min(sparks.count, 12)),
});
scene.add(sparks.group);
storyHost.overlay.add(sparks.lights.mesh);
/** Sparks are about to be found. */
let sparksOn = false;
/** Breath in the cold. */
const breath = new Puffs('#f6fafc', 16, 0, 0.9);
scene.add(breath.group);
let breathT = 1;
sparks.setWorld(gen.seed, gen.towers.towers, seedText);
/** (The rings only in the story: finding them is slow, and nothing is won outside it.) */
// Snow falls where it's cold (story/snow.ts): over the finished frame, with the story's sketches.
const snow = new Snow((x, z) => gen.height(x, z));
storyHost.overlay.add(snow.mesh);
// (Never the two towers the guide takes you to. No ring warms anything for now: none is asked about.)
const warmWorld = () => warmth.setWorld(gen.towers.towers, gen.story, gen.seed, [gen.towers.home.id, gen.journey.next]);
warmWorld();
if (params.has('cold')) { warmth.force = params.get('cold') !== '0'; warmth.snap(); }
// Phase 2: the bike, the ride to the home tower, the first two towers (story only).
let journey = null as Journey | null;
function makeJourney() {
  if (journey) scene.remove(journey.group);
  const host = storyHost!;
  const story = host.story;
  journey = host.active && story ? new Journey({
    gen, story, bikes, beacons, body: player.body, sfx: host.sfx, saveKey: seedText,
    cycling: () => cycling,
    mounted: () => !!riding,
    trees: (x, z, r) => !!colliders.nearestTree(x, z, r) || trail.littered(x, z, r + 8),
    place: (x, z, h) => { if (riding) dismount(); if (cycling) dismountBike(); player.set('walk', ctx); placePlayer(x, z); player.body.heading = h; orbit.yaw = h + Math.PI; orbit.pitch = 0.2; orbit.snap(); },
    mount: (k) => mountBike(k),
    prints: () => trail.prints.list,
  }) : null;
  if (journey) scene.add(journey.group);
  makeHerd();
}
/** The far-off pointer to the next task (story only). */
/**
 * The way back to the village for whoever strays at the start, when no task
 * is pointing anywhere: over `far` m off and a minute out of `near`.
 */
let wayHome: import('./story/story').Guide | null = null;
const pointer = storyHost.active ? new Pointer(storyHost.overlay, (x, z) => gen.height(x, z)) : null;
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
if (params.has('fresh')) try { localStorage.removeItem(`embla.herd.${seedText}`); localStorage.removeItem(`embla.dungeon1.${seedText}`); localStorage.removeItem(`embla.offer1.${seedText}`); localStorage.removeItem(`embla.home1.${seedText}`); for (const k of ['dungeon2', 'offer2', 'home2', 'dungeon3', 'offer3', 'home3', 'dungeon4', 'offer4']) localStorage.removeItem(`embla.${k}.${seedText}`); } catch { /* ignore */ }
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
scene.add(giantDust.group, trail.group);
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
// The second's: bare stones until the giant has walked there and lain down (giant/homecoming.ts), then open the same way.
let ring2: Ring | null = null;
// The third's: bare stones until the giant has walked there from the second and lain down, then open the same way.
let ring3: Ring | null = null;
// The fourth's: bare stones until the giant has walked there from the third and lain down, then open the same way. Under it is the Drop.
let ring4: Ring | null = null;
let visitWait = 0;
let visitHud = false;
/** The cut between the world and the dungeon: a flat violet veil, driven by whichever has hold of you. */
const dungeonVeil = document.createElement('div');
dungeonVeil.style.cssText = 'position:fixed;inset:0;background:#2b2147;opacity:0;pointer-events:none;z-index:4';
document.body.append(dungeonVeil);
let dungeonVeilK = 0;
/** Its colour: the first dungeon's violet, the second's teal, the third's dusk rose. */
let dungeonVeilHex = '#2b2147';
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
/** The second dungeon is done: its ring won't take you again. Saved with the cave's own state. */
let dungeon2Won = false;
let caveCtx: MobCtx | null = null;
/** The third is done: likewise. Saved with the hall's own state. */
let dungeon3Won = false;
let hallCtx: MobCtx | null = null;
let chasmCtx: MobCtx | null = null;
/** The fourth is done: its ring won't take you again. Saved with the Drop's own state. */
let dungeon4Won = false;
/** The hall's moth, as it is adopted: its coat. */
const MOTH_COAT = new THREE.Color('#dbe9c9');
/** The cave's glimmer, as it is adopted: its coat. */
const GLIMMER_COAT = new THREE.Color('#4c6c80');

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
      body: player.body, sfx: host.sfx, setMode: (m) => player.set(m, ctx), rig, saveKey: seedText, touch: () => !!touch,
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

/** Where the giant lies by the first ring: where its walk there ended. (Outside the story nothing has walked there: 66 m back along the way it would have come by.) */
function giantRest() {
  if (visit?.route) return restOf(visit.route.falls);
  const d = gen.dungeon;
  // (The last point of that way that isn't the ring itself.)
  let w: [number, number] = [d.x + 1, d.z];
  for (let i = d.way.length - 1; i >= 0; i--) if (Math.hypot(d.way[i][0] - d.x, d.way[i][1] - d.z) > 5) { w = d.way[i]; break; }
  const l = Math.hypot(w[0] - d.x, w[1] - d.z) || 1, ux = (w[0] - d.x) / l, uz = (w[1] - d.z) / l;
  return { x: d.x + ux * 66, z: d.z + uz * 66, heading: Math.atan2(-ux, -uz) };
}
/** The giant asleep by the ring, where its walk ended (one is stood there if nothing has walked there); or wherever it has got to since, once it has got up from there. */
function theGiant() {
  const d = gen.dungeon;
  if (giant && (homecoming?.left || Math.hypot(giant.origin.x - d.x, giant.origin.z - d.z) < 400)) return giant;
  const r = giantRest();
  const g = summonGiant(r.x, r.z, r.heading);
  g.settle();
  return g;
}
/** The giant by the first ring, for as long as it's there: null once it has got up (it isn't the offering's any more). */
function giantByRing() { return homecoming?.left ? null : theGiant(); }

/** A dungeon's creature come up with you when you weren't on it: beside where you come up, a little behind (clear of the shrine), facing as you do. */
function standBy(g: Mob, at: THREE.Vector3) {
  const h = player.body.heading;
  const x = at.x - Math.sin(h) * 1.5 + Math.cos(h) * 2.6, z = at.z - Math.cos(h) * 1.5 - Math.sin(h) * 2.6;
  g.pos.set(x, trail.height(x, z), z);
  g.stay.copy(g.pos);
  g.heading = h;
}

/**
 * Coming up out of a dungeon still on its creature: it comes up under you in
 * the ring's arms, and you're on it all the way (you used to be taken off it
 * below, lifted alone, and put back on it once the arms had let go).
 */
function rideUp(g: Mob, out: THREE.Vector3) {
  const gs = rideMode.gallopState;
  gs.phase = gs.burrow = gs.charge = gs.rocket = gs.wall = gs.wallSide = gs.speed = 0;
  gs.crawl = false;
  if (burrowHid) { rig.root.visible = true; burrowHid = false; }
  g.pos.set(out.x, trail.height(out.x, out.z), out.z);
  g.stay.copy(g.pos);
  g.heading = player.body.heading;
  // (`reset`, as it was moved above ground, let go of its ride state.)
  if (g.data && 'gs' in g.data) (g.data as BeastData).gs = gs;
  // (Mounted above ground the camera stands further off.)
  zoomAbove = Math.max(zoomAbove, 12);
}

/** What a ring's arms hold: you, or you on a creature (they take you by the chest wherever that is, and let go of you still riding). */
function ringDeps(): RingDeps {
  return {
    body: player.body, sfx: storyHost!.sfx,
    setMode: (m) => player.set(m === 'walk' && riding ? 'ride' : m, ctx),
    seat: () => (riding ? riding.species.seat(riding).pos.y - player.body.pos.y : 0),
  };
}

/** Back up: the world is the world again, and the ring's arms lift you out on to the field. */
function leaveDungeon(won = false) {
  // (Only on your own feet does a dungeon let you out without its light: on its creature you've won, and stay on it.)
  if (riding && !won) dismount();
  player.body.vel.set(0, 0, 0);
  const d = gen.dungeon, out = new THREE.Vector3(d.x, 0, d.z);
  if (won) {
    // The light is yours: the dungeon is done with, and its creature comes up with you.
    dungeonWon = true;
    // (Short of the middle, facing it: the shrine comes up there.)
    if (offering) { offering.arrival(out); player.body.heading = offering.arrivalHeading; }
    const g = dungeon?.goat ?? mobs.adopt('rockhopper', 'cave:rockhopper', out.clone(), new THREE.Color('#e2dbcf'), mobCtx);
    if (g) {
      const x = out.x + 2.4, z = out.z + 1.2;
      g.below = false;
      g.pos.set(x, trail.height(x, z), z);
      g.vel.set(0, 0, 0);
      g.stay.copy(g.pos);
      g.species.reset(g);
      if (riding === g) rideUp(g, out); else { if (riding) dismount(); standBy(g, out); }
    }
  }
  world.waterLevel = SEA_LEVEL;
  mobs.under = null;
  scene.add(rig.root, puffs.group, mobs.group);
  rig.root.visible = true;
  orbit.maxDistance = 80;
  orbit.targetDistance = zoomAbove;
  orbit.pitch = 0.22;
  ring?.emerge(trail.height(out.x, out.z), out.x, out.z);
  if (won) { offering?.begin(); orbit.yaw = player.body.heading + Math.PI; }
  orbit.snap();
  hadCine = false;
  camBlend = 1;
}

/**
 * Down into the Veil Cave, as into the first dungeon. `drop` (dev) skips
 * being let down and stands you at a point of its plan.
 */
function enterCave(drop?: [number, number]) {
  if (!ring2 || den()) return;
  if (riding) dismount();
  if (cycling) dismountBike();
  if (!cave) {
    const at = (x: number, z: number) => cave!.floorAt(x, z);
    const under: MobCtx = Object.assign(Object.create(mobCtx), {
      gen: new Proxy(gen, { get: (g, k) => (k === 'height' ? at : k === 'bog' ? () => 0 : Reflect.get(g, k)) }),
      surface: at,
      collide: (pos: THREE.Vector3, vel: THREE.Vector3, r: number) => cave!.collide(pos, vel, r),
    });
    cave = new VeilCave(gen.dungeons[1], gen.seed, ring2.groundY, {
      body: player.body, sfx: storyHost!.sfx, setMode: (m) => player.set(m, ctx), saveKey: seedText,
      puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
      glow: (p, n, size, spread) => glowPuffs.emit(p, n, size, spread),
      gs: rideMode.gallopState,
      mount: (m) => mount(m),
      adopt: (p) => {
        const m = mobs.adopt('glimmer', 'cave:glimmer', p, GLIMMER_COAT, under);
        if (m) { m.below = true; m.puppet = true; m.stabled = false; }
        return m;
      },
    });
    cave.onLeft = () => leaveCave();
    cave.onWon = () => leaveCave(true);
    caveCtx = under;
  }
  mobs.under = caveCtx;
  world.waterLevel = -1e9;
  cave.scene.add(mobs.group, rig.root, puffs.group, glowPuffs.group);
  rig.root.visible = true;
  if (drop) cave.drop(drop[0], drop[1]); else cave.enter();
  zoomAbove = orbit.targetDistance;
  orbit.maxDistance = 16;
  orbit.targetDistance = 9;
  orbit.yaw = cave.startYaw;
  orbit.pitch = 0.14;
  orbit.snap();
  hadCine = !!cave.cinematic();
  camBlend = 1;
}

/**
 * Back up from the Veil Cave. Lifted out by the ring's arms, as from the
 * first; or (`won`) carried out by the glimmer: you are on the surface in
 * the ring, on her, in a burst of her light.
 */
function leaveCave(won = false) {
  // (Only on your own feet does a dungeon let you out without its light: on its creature you've won, and stay on it.)
  if (riding && !won) dismount();
  player.body.vel.set(0, 0, 0);
  const d = gen.dungeons[1], out = new THREE.Vector3(d.x, 0, d.z);
  if (won) {
    dungeon2Won = true;
    if (offering2) { offering2.arrival(out); player.body.heading = offering2.arrivalHeading; }
    const g = cave?.she ?? mobs.adopt('glimmer', 'cave:glimmer', out.clone(), GLIMMER_COAT, mobCtx);
    if (g) {
      g.below = false;
      g.puppet = false;
      g.stabled = true;
      g.ghost = 0;
      g.hop = 0;
      (g.data as BeastData).s.act = null;
      const x = out.x + 2.4, z = out.z + 1.2;
      g.pos.set(x, trail.height(x, z), z);
      g.vel.set(0, 0, 0);
      g.stay.copy(g.pos);
      g.species.reset(g);
      if (riding === g) rideUp(g, out); else { if (riding) dismount(); standBy(g, out); }
    }
  }
  world.waterLevel = SEA_LEVEL;
  mobs.under = null;
  scene.add(rig.root, puffs.group, glowPuffs.group, mobs.group);
  rig.root.visible = true;
  orbit.maxDistance = 80;
  orbit.targetDistance = zoomAbove;
  orbit.pitch = 0.22;
  ring2?.emerge(trail.height(out.x, out.z), out.x, out.z);
  if (won) { offering2?.begin(); orbit.yaw = player.body.heading + Math.PI; }
  orbit.snap();
  hadCine = false;
  camBlend = 1;
}

/**
 * Down into the Moon Hall, as into the other two. `drop` (dev) skips being
 * let down and stands you at a point of its plan.
 */
function enterHall(drop?: [number, number]) {
  if (!ring3 || den()) return;
  if (riding) dismount();
  if (cycling) dismountBike();
  if (!hall) {
    const at = (x: number, z: number) => hall!.floorAt(x, z);
    const under: MobCtx = Object.assign(Object.create(mobCtx), {
      gen: new Proxy(gen, { get: (g, k) => (k === 'height' ? at : k === 'bog' ? () => 0 : Reflect.get(g, k)) }),
      surface: at,
      collide: (pos: THREE.Vector3, vel: THREE.Vector3, r: number) => hall!.collide(pos, vel, r),
    });
    hall = new MoonHall(gen.dungeons[2], gen.seed, ring3.groundY, {
      body: player.body, sfx: storyHost!.sfx, setMode: (m) => player.set(m, ctx), saveKey: seedText,
      puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
      glow: (p, n, size, spread) => glowPuffs.emit(p, n, size, spread),
      mount: (m) => mount(m),
      adopt: (p) => {
        const m = mobs.adopt('moonmoth', 'cave:moonmoth', p, MOTH_COAT, under);
        if (m) { m.below = true; m.puppet = true; m.stabled = false; }
        return m;
      },
    });
    hall.onLeft = () => leaveHall();
    hall.onWon = () => leaveHall(true);
    hallCtx = under;
  }
  mobs.under = hallCtx;
  world.waterLevel = -1e9;
  hall.scene.add(mobs.group, rig.root, puffs.group, glowPuffs.group);
  rig.root.visible = true;
  if (drop) hall.drop(drop[0], drop[1]); else hall.enter();
  zoomAbove = orbit.targetDistance;
  // (A little further back than in the other two: it's a big room, and you fly in it.)
  orbit.maxDistance = 30;
  orbit.targetDistance = 9;
  orbit.yaw = hall.startYaw;
  orbit.pitch = 0.14;
  orbit.snap();
  hadCine = !!hall.cinematic();
  camBlend = 1;
}

/**
 * Back up from the Moon Hall. Lifted out by the ring's arms, as from the
 * others, the light taken (`won`) or not; with it the moth comes up too
 * (you're on her if you were below, or she's beside you).
 */
function leaveHall(won = false) {
  // (Only on your own feet does a dungeon let you out without its light: on its creature you've won, and stay on it.)
  if (riding && !won) dismount();
  player.body.vel.set(0, 0, 0);
  const d = gen.dungeons[2], out = new THREE.Vector3(d.x, 0, d.z);
  if (won) {
    dungeon3Won = true;
    if (offering3) { offering3.arrival(out); player.body.heading = offering3.arrivalHeading; }
    const g = hall?.she ?? mobs.adopt('moonmoth', 'cave:moonmoth', out.clone(), MOTH_COAT, mobCtx);
    if (g) {
      g.below = false;
      g.puppet = false;
      g.stabled = true;
      const x = out.x + 2.4, z = out.z + 1.2;
      g.pos.set(x, trail.height(x, z), z);
      g.vel.set(0, 0, 0);
      g.grounded = true;
      g.stay.copy(g.pos);
      g.species.reset(g);
      // (Once you're off her for the offering she stays down where she is, as the other two's creatures stand: a flier left alone drifts in loops, and hers went round the shrine.)
      g.settle = true;
      if (riding === g) rideUp(g, out); else { if (riding) dismount(); standBy(g, out); }
    }
  }
  world.waterLevel = SEA_LEVEL;
  mobs.under = null;
  scene.add(rig.root, puffs.group, glowPuffs.group, mobs.group);
  rig.root.visible = true;
  orbit.maxDistance = 80;
  orbit.targetDistance = zoomAbove;
  orbit.pitch = 0.22;
  ring3?.emerge(trail.height(out.x, out.z), out.x, out.z);
  if (won) { offering3?.begin(); orbit.yaw = player.body.heading + Math.PI; }
  orbit.snap();
  hadCine = false;
  camBlend = 1;
}

/**
 * Down into the Drop, the fourth dungeon, as into the other three. `at`
 * (dev) skips being let down and stands you at a point of its plan.
 */
function enterChasm(at?: [number, number]) {
  if (den() || !storyHost) return;
  if (riding) dismount();
  if (cycling) dismountBike();
  if (!chasm) {
    const site = gen.dungeons[3];
    const floor = (x: number, z: number) => chasm!.floorAt(x, z);
    const under: MobCtx = Object.assign(Object.create(mobCtx), {
      gen: new Proxy(gen, { get: (g, k) => (k === 'height' ? floor : k === 'bog' ? () => 0 : Reflect.get(g, k)) }),
      surface: floor,
      collide: (pos: THREE.Vector3, vel: THREE.Vector3, r: number) => chasm!.collide(pos, vel, r),
    });
    chasm = new DropCave(site, gen.seed, ring4?.groundY ?? gen.height(site.x, site.z), {
      body: player.body, sfx: storyHost.sfx, setMode: (m) => player.set(m, ctx), saveKey: seedText, touch: () => !!touch,
      puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
      adopt: (p) => {
        const m = mobs.adopt('wurm', 'cave:wurm', p, null, under);
        if (m) { m.below = true; m.puppet = true; m.stabled = false; }
        return m;
      },
    });
    chasm.onLeft = () => leaveChasm();
    chasm.onWon = () => leaveChasm(true);
    chasmCtx = under;
  }
  mobs.under = chasmCtx;
  world.waterLevel = -1e9;
  chasm.scene.add(mobs.group, rig.root, puffs.group, glowPuffs.group);
  rig.root.visible = true;
  if (at) chasm.drop(at[0], at[1]); else chasm.enter();
  zoomAbove = orbit.targetDistance;
  orbit.maxDistance = 30;
  orbit.targetDistance = 9;
  orbit.yaw = chasm.startYaw;
  orbit.pitch = 0.14;
  orbit.snap();
  hadCine = !!chasm.cinematic();
  camBlend = 1;
}

/**
 * Back up from the Drop. Lifted out by the ring's arms, as from the others,
 * the light taken (`won`) or not; with it the wurm comes up too (you're on
 * her if you were below, or she's beside you), and its offering begins.
 * Nothing follows that yet: the giant stays where it lies.
 */
function leaveChasm(won = false) {
  // (Only on your own feet does a dungeon let you out without its light: on its creature you've won, and stay on it.)
  if (riding && !won) dismount();
  storyHost?.sfx.wind(0);
  player.body.vel.set(0, 0, 0);
  const d = gen.dungeons[3], out = new THREE.Vector3(d.x, 0, d.z);
  if (won) {
    dungeon4Won = true;
    if (offering4) { offering4.arrival(out); player.body.heading = offering4.arrivalHeading; }
    const g = chasm?.she ?? wonWurm ?? mobs.adopt('wurm', 'cave:wurm', out.clone(), null, mobCtx);
    if (g) {
      g.below = false;
      g.puppet = false;
      g.stabled = true;
      const x = out.x + 2.6, z = out.z + 1.2;
      g.pos.set(x, trail.height(x, z), z);
      g.vel.set(0, 0, 0);
      g.grounded = true;
      g.stay.copy(g.pos);
      g.species.reset(g);
      if (riding === g) rideUp(g, out); else { if (riding) dismount(); standBy(g, out); }
    }
  }
  world.waterLevel = SEA_LEVEL;
  mobs.under = null;
  scene.add(rig.root, puffs.group, glowPuffs.group, mobs.group);
  rig.root.visible = true;
  orbit.maxDistance = 80;
  orbit.targetDistance = zoomAbove;
  orbit.pitch = 0.22;
  ring4?.emerge(trail.height(out.x, out.z), out.x, out.z);
  if (won) { offering4?.begin(); orbit.yaw = player.body.heading + Math.PI; }
  orbit.snap();
  hadCine = false;
  camBlend = 1;
}

/** A save from after the light was taken: the rockhopper that waits by the ring. */
let wonGoat: Mob | null = null;
/** And the glimmer, by the second. */
let wonGlimmer: Mob | null = null;
/** And the moth, by the third. */
let wonMoth: Mob | null = null;
/** And the wurm, by the fourth. */
let wonWurm: Mob | null = null;
/** How many dungeons' worth of mending the village has had (`mendVillage`). */
let mendedTo = 0;
/** By this many dungeons finished, every print in the village is filled in; and how much of its depth the one being filled starts with, and ends with however long they shovel. */
const FILLED_BY = 5, DIG_KEEP = 0.62, DIG_LEAST = 0.3;
/** How much of the wreckage still strewn about is cleared away with each dungeon. */
const CLEARED = 0.22;
/**
 * The village as it is once `done` dungeons are finished: what the spirits
 * who are home have got done while you were away. The houses are further
 * built, each at its own stage (`Village.plan`), the strewn wreckage is
 * thinner, the giant's prints along the lane are filled in
 * from the yard's end outward, a share for each dungeon, and the next print
 * is the one they're at with shovels (`Village.dig`). All of it follows
 * from the number, so nothing is saved, and it only ever goes forward.
 */
function mendVillage(done: number) {
  const v = storyHost?.active ? storyHost.story?.village : null, falls = visit?.route?.falls;
  if (!v || !falls || done <= mendedTo) return;
  mendedTo = done;
  const lane = v.site.lane, steps = v.plan(done), gone: Print[] = [];
  const fill = (c: { x: number; z: number }) => {
    const p = trail.prints.at(c.x, c.z);
    if (!p || Math.hypot(p.x - c.x, p.z - c.z) > 1) return;
    gone.push(p);
    trail.fill(c.x, c.z);
  };
  // The prints in the village: under a house (filled when its footing is laid), or in the open by the lane.
  const open: { x: number; z: number; d: number }[] = [];
  for (const f of falls) {
    const c = { x: f.x + Math.sin(f.yaw) * 3.4, z: f.z + Math.cos(f.yaw) * 3.4, d: Math.hypot(f.x - lane[0].x, f.z - lane[0].z) };
    if (f.house >= 0) { if (steps[f.house] > 0) fill(c); continue; }
    if (lane.some((q) => Math.hypot(q.x - c.x, q.z - c.z) < 30)) open.push(c);
  }
  open.sort((a, b) => a.d - b.d);
  const n = Math.min(open.length, Math.ceil((open.length * done) / FILLED_BY));
  for (const c of open.slice(0, n)) fill(c);
  // (No house is built in a hollow: any other print that reaches under one that's begun goes too.)
  for (const [i, s] of steps.entries()) {
    const h = v.houses[i].plot;
    if (s > 0 && v.houses[i].smashed) for (const o of trail.prints.list) if (!gone.includes(o) && soleSdf(h.x, h.z, o) < 5.5) fill(o);
  }
  const left = (c: { x: number; z: number }) => { const o = trail.prints.at(c.x, c.z); return !!o && Math.hypot(o.x - c.x, o.z - c.z) < 1; };
  for (const [i, s] of steps.entries()) if (s > v.houses[i].step || (s === HOME && v.houses[i].smashed)) v.setStep(i, s);
  // The next one: half full already, a heap of earth on the lane's side of it, and shovels.
  // (Those in the open all done: the one under the next house to be begun, its wreck cleared out of it.)
  const under = falls.filter((f) => f.house >= 0 && steps[f.house] === 0 && v.houses[f.house].smashed).map((f) => ({ x: f.x + Math.sin(f.yaw) * 3.4, z: f.z + Math.cos(f.yaw) * 3.4 }));
  const next = [...open.slice(n), ...under].find(left), p = next ? trail.prints.at(next.x, next.z) : null;
  let site: DigSite | null = null;
  if (p && next) {
    let li = 0;
    for (const [j, q] of lane.entries()) if (Math.hypot(q.x - p.x, q.z - p.z) < Math.hypot(lane[li].x - p.x, lane[li].z - p.z)) li = j;
    const a0 = Math.atan2(lane[li].x - p.x, lane[li].z - p.z);
    // (Clear of the other prints and of every plot; the lane's side if it can be, else round from it.)
    for (const da of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, Math.PI]) {
      const ux = Math.sin(a0 + da), uz = Math.cos(a0 + da);
      const out = (s: number) => { let r = 2; while (r < 30 && soleSdf(p.x + ux * r, p.z + uz * r, p) < s) r += 0.2; return r; };
      const re = out(3.6), rp = out(5.8), px = p.x + ux * rp, pz = p.z + uz * rp;
      if (trail.prints.list.some((o) => o !== p && !gone.includes(o) && soleSdf(px, pz, o) < 4)) continue;
      if (v.houses.some((h) => Math.hypot(h.plot.x - px, h.plot.z - pz) < 6.5)) continue;
      gone.push(p);
      let keep = DIG_KEEP;
      trail.part(p.x, p.z, keep);
      const ix = p.x + ux * (re - 6.2), iz = p.z + uz * (re - 6.2);
      site = { pile: new THREE.Vector3(px, trail.height(px, pz), pz), edge: new THREE.Vector3(p.x + ux * re, 0, p.z + uz * re), into: new THREE.Vector3(ix, trail.height(ix, iz) + 0.2, iz) };
      // Every shovelful shows, a little (until the page is next loaded).
      v.dig(site, () => { keep = Math.max(DIG_LEAST, keep - 0.008); trail.prints.part(p, keep); });
      break;
    }
  }
  if (!site) v.dig(null);
  v.sweep((x, z) => gone.some((o) => soleSdf(x, z, o) < 2), Math.min(1, done * CLEARED));
  v.busy();
  return { open: open.length, filled: n, digging: !!site };
}

function makeVisit() {
  mendedTo = 0;
  hands?.dispose();
  hands = new Hands(gen);
  scene.add(hands.group);
  visit?.dispose();
  ring?.dispose();
  ring2?.dispose();
  ring3?.dispose();
  ring4?.dispose();
  offering?.dispose();
  offering2?.dispose();
  offering3?.dispose();
  offering4?.dispose();
  homecoming?.dispose();
  homecoming = null;
  homecoming2?.dispose();
  homecoming2 = null;
  homecoming3?.dispose();
  homecoming3 = null;
  homecoming4?.dispose();
  homecoming4 = null;
  if (chasm) {
    if (chasm.inside) { chasm.inside = false; world.waterLevel = SEA_LEVEL; mobs.under = null; scene.add(rig.root, puffs.group, glowPuffs.group, mobs.group); orbit.maxDistance = 80; player.set('walk', ctx); }
    chasm.dispose();
    chasm = null;
    chasmCtx = null;
  }
  if (hall) {
    if (hall.inside) { hall.inside = false; world.waterLevel = SEA_LEVEL; mobs.under = null; scene.add(rig.root, puffs.group, glowPuffs.group, mobs.group); orbit.maxDistance = 80; player.set('walk', ctx); }
    hall.dispose();
    hall = null;
    hallCtx = null;
  }
  if (cave) {
    if (cave.inside) { cave.inside = false; world.waterLevel = SEA_LEVEL; mobs.under = null; scene.add(rig.root, puffs.group, glowPuffs.group, mobs.group); orbit.maxDistance = 80; player.set('walk', ctx); }
    cave.dispose();
    cave = null;
    caveCtx = null;
  }
  if (dungeon) {
    if (dungeon.inside) { dungeon.inside = false; world.waterLevel = SEA_LEVEL; mobs.under = null; scene.add(rig.root, puffs.group, mobs.group); orbit.maxDistance = 80; player.set('walk', ctx); }
    dungeon.dispose();
    dungeon = null;
    dungeonCtx = null;
  }
  ring = new Ring(gen.dungeon, (x, z) => gen.height(x, z), ringDeps());
  // A save from after the light was taken: the dungeon stays shut, and its rockhopper is waiting by the ring.
  bringUp = null;
  try { dungeonWon = !!JSON.parse(localStorage.getItem(`embla.dungeon1.${seedText}`) ?? '{}').taken; } catch { dungeonWon = false; }
  wonGoat = null;
  if (dungeonWon) {
    const d = gen.dungeon, x = d.x + d.r + 3, z = d.z;
    wonGoat = mobs.adopt('rockhopper', 'cave:rockhopper', new THREE.Vector3(x, gen.height(x, z), z), new THREE.Color('#e2dbcf'), mobCtx);
  }
  ring.onTaken = () => enterDungeon();
  scene.add(ring.group);
  const site2 = gen.dungeons[1];
  ring2 = new Ring(site2, (x, z) => gen.height(x, z), ringDeps());
  ring2.onTaken = () => enterCave();
  scene.add(ring2.group);
  try { dungeon2Won = !!JSON.parse(localStorage.getItem(`embla.dungeon2.${seedText}`) ?? '{}').taken; } catch { dungeon2Won = false; }
  wonGlimmer = null;
  const site3 = gen.dungeons[2];
  ring3 = new Ring(site3, (x, z) => gen.height(x, z), ringDeps());
  ring3.onTaken = () => enterHall();
  scene.add(ring3.group);
  try { dungeon3Won = !!JSON.parse(localStorage.getItem(`embla.dungeon3.${seedText}`) ?? '{}').taken; } catch { dungeon3Won = false; }
  const site4 = gen.dungeons[3];
  ring4 = new Ring(site4, (x, z) => gen.height(x, z), ringDeps());
  ring4.onTaken = () => enterChasm();
  scene.add(ring4.group);
  try { dungeon4Won = !!JSON.parse(localStorage.getItem(`embla.dungeon4.${seedText}`) ?? '{}').taken; } catch { dungeon4Won = false; }
  wonWurm = null;
  wonMoth = null;
  const story = storyHost?.story;
  visit = story && story.village ? new Visit({
    story, trail, summon: summonGiant, gen, ground: (x, z) => gen.height(x, z),
    dust: (at) => { giantDust.emit(at, 16, 3.2, 13, undefined, { life: 1.8, rise: 1.6, drag: 1.5, up: 7 }); giantDust.emit(at, 8, 1.8, 6, undefined, { life: 1.3, rise: 2.4, drag: 1.3, up: 10 }); },
    sound: (n, level = 1) => { const fx = storyHost!.sfx, was = fx.level; fx.level = was * level; if (n === 'squeak') fx.chirp(true); else fx[n](); fx.level = was; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
    ring: () => ring,
    solid: (p) => beacons.solidAt(p, true),
    scare: (from, seen) => mobs.scare(from, mobCtx, 6, seen),
    calm: () => mobs.calm(),
  }) : null;
  if (visit) scene.add(visit.group);
  visitWait = 0;
  if (visit && storyHost!.active && story!.giantGone) visit.restore();
  const host = storyHost!;
  // (Whoever makes an offering gets down to make it, and carries the light in her mittens.)
  const bearer = { hands: (out: THREE.Vector3) => rig.hands(out), dismount: () => { if (riding) dismount(); } };
  // (And a tower comes up out of the ring under the shrine: whatever creature stood by is put out of its way.)
  const riser = (i: number) => {
    const site = gen.dungeons[i];
    return {
      tower: gen.ringTowers[i], towers: beacons,
      clear: (r: number, to: THREE.Vector3) => {
        let n = 0;
        for (const m of mobs.all()) {
          if (m === riding || Math.hypot(m.pos.x - site.x, m.pos.z - site.z) > r) continue;
          const x = to.x + n * 2.4, z = to.z + n * 1.1;
          m.pos.set(x, trail.height(x, z), z);
          m.vel.set(0, 0, 0);
          m.stay.copy(m.pos);
          m.heading = Math.atan2(site.x - x, site.z - z);
          n++;
        }
      },
    };
  };
  offering = new Offering({
    ...riser(0), site: gen.dungeon, ground: (x, z) => trail.height(x, z), body: player.body, ...bearer, sfx: host.sfx, ring, giant: giantByRing, saveKey: seedText,
    puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
    halt: () => { player.body.vel.x = player.body.vel.z = 0; rideMode.gallopState.speed = 0; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
  }, gen.seed);
  scene.add(offering.group);
  homecoming = new Homecoming({
    gen, ground: (x, z) => trail.height(x, z), body: player.body, sfx: host.sfx, story: host.active ? story ?? null : null, saveKey: seedText,
    giant: theGiant, rest: giantRest, before: () => visit?.route?.falls ?? [], crows: () => (visit?.state === 'gone' ? visit.crows : null), summon: summonGiant,
    stamp: (at, yaw) => { trail.stamp(at, yaw); },
    puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
    halt: () => { player.body.vel.x = player.body.vel.z = 0; rideMode.gallopState.speed = 0; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
    loading: () => terrain.busy,
    mend: () => mendVillage(1),
    // At the second ring it does what it did at the first: lets a dark spirit go, down into the ring, which opens.
    settledAt: (g) => { if (!dungeon2Won) ring2?.free(g.centre.clone().setY(g.centre.y - 6)); },
  });
  scene.add(homecoming.group);
  // The same after the second dungeon: the second spirit taken comes home, and the giant gets up from the
  // second ring and walks to the third (bare stones: nothing is under it yet, so it only lies down there).
  const first = homecoming;
  homecoming2 = new Homecoming({
    gen, ground: (x, z) => trail.height(x, z), body: player.body, sfx: host.sfx, story: host.active ? story ?? null : null, saveKey: seedText,
    who: 1, leg: 2, name: 'home2', mend: () => mendVillage(2),
    giant: theGiant, rest: () => (first.route.length > 1 ? restOf(first.route) : giantRest()), before: () => first.route, crows: () => (visit?.state === 'gone' ? visit.crows : null), summon: summonGiant,
    stamp: (at, yaw) => { trail.stamp(at, yaw); },
    puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
    halt: () => { player.body.vel.x = player.body.vel.z = 0; rideMode.gallopState.speed = 0; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
    loading: () => terrain.busy,
    // At the third ring, the same again: a dark spirit let go into it, and it opens.
    settledAt: (g) => { if (!dungeon3Won) ring3?.free(g.centre.clone().setY(g.centre.y - 6)); },
  });
  scene.add(homecoming2.group);
  // And after the third: the third spirit taken comes home, and the giant gets up from the third ring and
  // walks to the fourth.
  const second = homecoming2;
  homecoming3 = new Homecoming({
    gen, ground: (x, z) => trail.height(x, z), body: player.body, sfx: host.sfx, story: host.active ? story ?? null : null, saveKey: seedText,
    who: 2, leg: 3, name: 'home3', mend: () => mendVillage(3),
    giant: theGiant, rest: () => (second.route.length > 1 ? restOf(second.route) : first.route.length > 1 ? restOf(first.route) : giantRest()), before: () => second.route, crows: () => (visit?.state === 'gone' ? visit.crows : null), summon: summonGiant,
    stamp: (at, yaw) => { trail.stamp(at, yaw); },
    puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
    halt: () => { player.body.vel.x = player.body.vel.z = 0; rideMode.gallopState.speed = 0; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
    loading: () => terrain.busy,
    // At the fourth ring, the same again: a dark spirit let go into it, and it opens.
    settledAt: (g) => { if (!dungeon4Won) ring4?.free(g.centre.clone().setY(g.centre.y - 6)); },
  });
  scene.add(homecoming3.group);
  // And after the fourth: the fourth spirit taken comes home, and the giant gets up from the fourth ring and
  // walks to the fifth (bare stones: nothing is under it yet, so it only lies down there). Its veil is moss.
  const third = homecoming3;
  homecoming4 = new Homecoming({
    gen, ground: (x, z) => trail.height(x, z), body: player.body, sfx: host.sfx, story: host.active ? story ?? null : null, saveKey: seedText,
    who: 3, leg: 4, name: 'home4', mend: () => mendVillage(4),
    giant: theGiant, rest: () => (third.route.length > 1 ? restOf(third.route) : second.route.length > 1 ? restOf(second.route) : first.route.length > 1 ? restOf(first.route) : giantRest()), before: () => third.route, crows: () => (visit?.state === 'gone' ? visit.crows : null), summon: summonGiant,
    stamp: (at, yaw) => { trail.stamp(at, yaw); },
    puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
    halt: () => { player.body.vel.x = player.body.vel.z = 0; rideMode.gallopState.speed = 0; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
    loading: () => terrain.busy,
  });
  scene.add(homecoming4.group);
  // The second dungeon's offering: the first's, told quickly (the owner found the first at risk of wearing
  // thin), the shrine a glimmer in stone. The giant is the one lying by the second ring, until it gets up from there.
  offering2 = new Offering({
    ...riser(1), site: site2, ground: (x, z) => trail.height(x, z), body: player.body, ...bearer, sfx: host.sfx, ring: ring2, giant: () => (homecoming?.settled && !homecoming2?.left ? giant : null), saveKey: seedText,
    puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
    halt: () => { player.body.vel.x = player.body.vel.z = 0; rideMode.gallopState.speed = 0; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
  }, gen.seed ^ 0x3c6ef, { name: 'offer2', statue: glimmerStatue(), timing: OFFER_SHORT });
  scene.add(offering2.group);
  // The third's: the same short telling, the shrine a moonmoth in stone. The giant is the one lying by the third ring, until it gets up from there.
  offering3 = new Offering({
    ...riser(2), site: site3, ground: (x, z) => trail.height(x, z), body: player.body, ...bearer, sfx: host.sfx, ring: ring3, giant: () => (homecoming2?.settled && !homecoming3?.left ? giant : null), saveKey: seedText,
    puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
    halt: () => { player.body.vel.x = player.body.vel.z = 0; rideMode.gallopState.speed = 0; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
  }, gen.seed ^ 0x51f15, { name: 'offer3', statue: moonmothStatue(), timing: OFFER_SHORT });
  scene.add(offering3.group);
  // The fourth's: the same short telling, the shrine a wurm in stone. The giant is the one lying by the fourth ring, until it gets up from there.
  offering4 = new Offering({
    ...riser(3), site: site4, ground: (x, z) => trail.height(x, z), body: player.body, ...bearer, sfx: host.sfx, ring: ring4, giant: () => (homecoming3?.settled && !homecoming4?.left ? giant : null), saveKey: seedText,
    puff: (p, n, size, spread) => puffs.emit(p, n, size, spread),
    halt: () => { player.body.vel.x = player.body.vel.z = 0; rideMode.gallopState.speed = 0; },
    tree: (x, z, max) => colliders.nearestTree(x, z, max)?.d ?? Infinity,
  }, gen.seed ^ 0x6a3b7, { name: 'offer4', statue: wurmStatue(), timing: OFFER_SHORT });
  scene.add(offering4.group);
  // (The giant's whereabouts first: the offering asks for it.)
  if (dungeonWon) { homecoming.restore(); offering.restore(); }
  // A save from after the giant lay down by the second ring: that ring is open; or, its light taken, shut,
  // with the glimmer waiting by it.
  if (homecoming.settled) {
    if (dungeon2Won) {
      // (As above: where the giant is first. A save from after the second spirit was home finds it by the third ring.)
      homecoming2.restore();
      offering2.restore();
      const x = site2.x + site2.r + 3, z = site2.z;
      wonGlimmer = mobs.adopt('glimmer', 'cave:glimmer', new THREE.Vector3(x, gen.height(x, z), z), GLIMMER_COAT, mobCtx);
    } else ring2.setOpen();
  }
  // And from after it lay down by the third: that ring open; or shut, with the moth waiting by it.
  if (homecoming2.settled) {
    if (dungeon3Won) {
      // (Where the giant is first, again. A save from after the third spirit was home finds it by the fourth ring.)
      homecoming3.restore();
      offering3.restore();
      const x = site3.x + site3.r + 3, z = site3.z;
      wonMoth = mobs.adopt('moonmoth', 'cave:moonmoth', new THREE.Vector3(x, gen.height(x, z), z), MOTH_COAT, mobCtx);
      if (wonMoth) { wonMoth.settle = true; wonMoth.grounded = true; }
    } else ring3.setOpen();
  }
  // And from after it lay down by the fourth: that ring open; or shut, with the wurm waiting by it.
  if (homecoming3.settled) {
    if (dungeon4Won) {
      // (Where the giant is first, again. A save from after the fourth spirit was home finds it by the fifth ring.)
      homecoming4.restore();
      offering4.restore();
      const x = site4.x + site4.r + 3, z = site4.z;
      wonWurm = mobs.adopt('wurm', 'cave:wurm', new THREE.Vector3(x, gen.height(x, z), z), null, mobCtx);
    } else ring4.setOpen();
  }
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

/** Dev: home, on foot: the cabin's doorstep (the start, until its hearth is lit). */
function goHome() {
  if (den()) return;
  if (riding) dismount();
  if (cycling) dismountBike();
  player.set('walk', ctx);
  const s = storyHost?.active ? storyHost.story?.spawnPoint() : null;
  if (s) {
    placePlayer(s.x, s.z);
    orbit.yaw = s.yaw;
    player.body.heading = s.heading;
    orbit.snap();
  } else {
    const [x, z] = findSpawn(0, 0);
    placePlayer(x, z);
  }
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
// A save from between taking the light and giving it: you're by the shrine with it, on the rockhopper, as you were.
if (dungeonWon && (offering as Offering | null) && ((offering as Offering | null)!.state !== 'given' || (homecoming as Homecoming | null)?.state === 'idle') && wonGoat && !params.has('x') && !params.has('cp')) atShrine();
// Likewise the second's: by its shrine with its light, on the glimmer.
if (dungeon2Won && (offering2 as Offering | null) && ((offering2 as Offering | null)!.state !== 'given' || (homecoming2 as Homecoming | null)?.state === 'idle') && wonGlimmer && !params.has('x') && !params.has('cp')) atShrine(offering2, wonGlimmer);
// And the third's, on the moth.
if (dungeon3Won && (offering3 as Offering | null) && ((offering3 as Offering | null)!.state !== 'given' || (homecoming3 as Homecoming | null)?.state === 'idle') && wonMoth && !params.has('x') && !params.has('cp')) atShrine(offering3, wonMoth);
// And the fourth's, on the wurm.
if (dungeon4Won && (offering4 as Offering | null) && ((offering4 as Offering | null)!.state !== 'given' || (homecoming4 as Homecoming | null)?.state === 'idle') && wonWurm && !params.has('x') && !params.has('cp')) atShrine(offering4, wonWurm);

/** Dev: set the story up as it stands at a checkpoint (`?fresh=1&cp=<id>`; see ui/checkpoints.ts). Expects a fresh save. */
function checkpoint(id: string) {
  const story = storyHost?.story, c = CHECKPOINTS.find((k) => k.id === id);
  if (!c || !story || !storyHost!.active) return false;
  if (c.kind === 'phase1') {
    if (!story.debugJump(id)) return false;
    spawn();
  } else if (c.kind === 'journey') journey?.jump(id as Stage);
  // By the rings the stable's long built and the lasso yours (phase 3's last step); only the pasture is empty.
  else if (c.kind === 'ring') { if (!stableJump('ranch')) journey?.jump('done'); }
  else if (!stableJump(id)) return false;
  // Past the home tower's head the giant has been: its prints and the wrecked lane, as a save from there has them.
  if (c.giantGone) { story.giantGone = true; visit?.restore(); }
  // The second dungeon's: the first done and the giant walked on, as a save from there has it.
  const second = id === 'ring2' || id === 'offer2', third = id === 'ring3' || id === 'offer3', fourth = id === 'ring4' || id === 'offer4';
  if (second) firstDone();
  if (third) secondDone();
  if (fourth) thirdDone();
  if (c.kind === 'ring') goToRing(fourth ? 3 : third ? 2 : second ? 1 : 0);
  // The dungeon done: up you come with its light, on the rockhopper.
  if (id === 'offer') winDungeon();
  if (id === 'offer2') winDungeon(2);
  if (id === 'offer3') winDungeon(3);
  if (id === 'offer4') winDungeon(4);
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
/** By the shrine on the rockhopper (`wonGoat`), facing it and the giant beyond: where you came up. (Or the second dungeon's, on its glimmer.) */
function atShrine(of: Offering | null = offering, g: Mob | null = wonGoat) {
  const offering = of;
  if (!offering || !g) return;
  const at = offering.arrival(new THREE.Vector3());
  if (riding) dismount();
  if (cycling) dismountBike();
  player.set('walk', ctx);
  placePlayer(at.x, at.z);
  player.body.heading = offering.arrivalHeading;
  g.pos.copy(player.body.pos);
  g.stay.copy(g.pos);
  g.heading = player.body.heading;
  mount(g);
  orbit.yaw = player.body.heading + Math.PI;
  orbit.pitch = 0.2;
  orbit.snap();
}
/** Dev: as if you'd just taken the light: the dungeon marked done, and up you come on the rockhopper. (`which` 2: the second's, on the glimmer; the first is made done if it isn't.) */
function winDungeon(which = 1) {
  if (which === 4) {
    if (!homecoming3?.settled) thirdDone();
    try { localStorage.setItem(`embla.dungeon4.${seedText}`, JSON.stringify({ down: true, yours: true, hinted: true, taken: true, lit: [] })); } catch { /* ignore */ }
    if (chasm) chasm.inside = false;
    leaveChasm(true);
    return;
  }
  if (which === 3) {
    if (!homecoming2?.settled) secondDone();
    try { localStorage.setItem(`embla.dungeon3.${seedText}`, JSON.stringify({ solved: true, yours: true, seen: true, taken: true, lit: [] })); } catch { /* ignore */ }
    if (hall) hall.inside = false;
    leaveHall(true);
    return;
  }
  if (which === 2) {
    if (!homecoming?.settled) firstDone();
    try { localStorage.setItem(`embla.dungeon2.${seedText}`, JSON.stringify({ round: 3, taken: true, lit: [] })); } catch { /* ignore */ }
    if (cave) cave.inside = false;
    leaveCave(true);
    return;
  }
  try { localStorage.setItem(`embla.dungeon1.${seedText}`, JSON.stringify({ freed: true, taken: true, crossed: true, lit: [] })); } catch { /* ignore */ }
  if (dungeon) dungeon.inside = false;
  leaveDungeon(true);
}
/**
 * Dev: everything of the first dungeon behind you, as a save from after its
 * homecoming has it: its ring a shrine, a spirit home, the giant asleep by
 * the second ring with its prints laid all the way there, that ring open.
 */
function firstDone() {
  try {
    localStorage.setItem(`embla.dungeon1.${seedText}`, JSON.stringify({ freed: true, taken: true, crossed: true, lit: [] }));
    localStorage.setItem(`embla.offer1.${seedText}`, 'given');
    localStorage.setItem(`embla.home1.${seedText}`, '1');
  } catch { /* ignore */ }
  makeVisit();
}
/** Dev: the second dungeon behind you too: its ring a shrine, a second spirit home, the giant asleep by the third ring, that ring open. */
function secondDone() {
  try {
    localStorage.setItem(`embla.dungeon1.${seedText}`, JSON.stringify({ freed: true, taken: true, crossed: true, lit: [] }));
    localStorage.setItem(`embla.offer1.${seedText}`, 'given');
    localStorage.setItem(`embla.home1.${seedText}`, '1');
    localStorage.setItem(`embla.dungeon2.${seedText}`, JSON.stringify({ round: 3, taken: true, lit: [] }));
    localStorage.setItem(`embla.offer2.${seedText}`, 'given');
    localStorage.setItem(`embla.home2.${seedText}`, '1');
  } catch { /* ignore */ }
  makeVisit();
}
/** Dev: the third behind you too: its ring a shrine, a third spirit home, the giant asleep by the fourth ring, that ring open. */
function thirdDone() {
  try {
    localStorage.setItem(`embla.dungeon1.${seedText}`, JSON.stringify({ freed: true, taken: true, crossed: true, lit: [] }));
    localStorage.setItem(`embla.offer1.${seedText}`, 'given');
    localStorage.setItem(`embla.home1.${seedText}`, '1');
    localStorage.setItem(`embla.dungeon2.${seedText}`, JSON.stringify({ round: 3, taken: true, lit: [] }));
    localStorage.setItem(`embla.offer2.${seedText}`, 'given');
    localStorage.setItem(`embla.home2.${seedText}`, '1');
    localStorage.setItem(`embla.dungeon3.${seedText}`, JSON.stringify({ solved: true, yours: true, seen: true, taken: true, lit: [] }));
    localStorage.setItem(`embla.offer3.${seedText}`, 'given');
    localStorage.setItem(`embla.home3.${seedText}`, '1');
  } catch { /* ignore */ }
  makeVisit();
}
/** Dev: stand on the giant's way just outside a dungeon's ring (0: the first, 1: the second, 2: the third, 3: the fourth), facing it. */
function goToRing(which = 0) {
  const d = gen.dungeons[which], w = d.way[d.way.length - 1] ?? [d.x + 1, d.z];
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
// ?dungeon=3: straight into the third, the Moon Hall, in its well (the first two done, the giant by its ring); ?dungeon=3,x,z: at a point of its plan.
// ?dungeon=4: straight into the fourth, the Drop, in its well; ?dungeon=4,x,z: at a point of its plan.
if (params.get('dungeon')?.split(',')[0] === '4') {
  const [, dx, dz] = params.get('dungeon')!.split(',').map(parseFloat);
  enterChasm([Number.isFinite(dx) && Number.isFinite(dz) ? dx : 0, Number.isFinite(dz) ? dz : 0]);
}
else if (params.get('dungeon')?.split(',')[0] === '3') {
  const [, dx, dz] = params.get('dungeon')!.split(',').map(parseFloat);
  secondDone();
  (ring3 as Ring | null)?.setOpen();
  enterHall([Number.isFinite(dx) && Number.isFinite(dz) ? dx : 0, Number.isFinite(dz) ? dz : 0]);
}
// ?dungeon=2: straight into the second, the Veil Cave, in its well (the first done, the giant by its ring); ?dungeon=2,x,z: at a point of its plan.
else if (params.get('dungeon')?.split(',')[0] === '2') {
  const [, dx, dz] = params.get('dungeon')!.split(',').map(parseFloat);
  firstDone();
  enterCave([Number.isFinite(dx) && Number.isFinite(dz) ? dx : 0, Number.isFinite(dz) ? dz : 0]);
}
// ?dungeon=1: straight into the first dungeon (the ring opened), in the well; ?dungeon=x,z: at a point of its plan.
else if (params.has('dungeon')) {
  const [dx, dz] = params.get('dungeon')!.split(',').map(parseFloat);
  (ring as Ring | null)?.setOpen();
  enterDungeon([Number.isFinite(dx) && Number.isFinite(dz) ? dx : 0, Number.isFinite(dz) ? dz : 0]);
}
// ?ride=<species>[,water]: on one of its kind, tame, where you stand; `water`: on the nearest shore of deep water, facing it.
if (params.has('ride')) {
  const [kind, where] = params.get('ride')!.split(',');
  const b = player.body;
  if (where === 'water') {
    find: for (let r = 40; r < 4000; r += 20) for (let a = 0; a < 6.28; a += 20 / r) {
      const dx = Math.sin(a), dz = Math.cos(a);
      if (gen.height(b.pos.x + dx * r, b.pos.z + dz * r) > SEA_LEVEL - 6) continue;
      // Back toward where you were, to the first dry ground.
      let s = r;
      while (s > 0 && gen.height(b.pos.x + dx * s, b.pos.z + dz * s) < SEA_LEVEL + 0.5) s -= 2;
      placePlayer(b.pos.x + dx * s, b.pos.z + dz * s);
      b.heading = a;
      orbit.yaw = a + Math.PI;
      orbit.snap();
      break find;
    }
  }
  const m = mobs.adopt(kind, `dev:${kind}`, b.pos.clone(), null, mobCtx);
  if (m) { m.stabled = false; bringUp = m; }
}
if (params.get('mode') === 'fly') {
  player.set('fly', ctx);
  player.body.pos.y = gen.height(player.body.pos.x, player.body.pos.z) + (params.has('y') ? parseFloat(params.get('y')!) : 60);
}

function setSeed(s: string) {
  seedText = s;
  gen = new WorldGen(seedFromString(s));
  wayHome = null;
  terrain.dungeons = primeDungeon(gen);
  terrain.story = gen.story;
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
  warmWorld();
  sparks.setWorld(gen.seed, gen.towers.towers, s);
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
  devFly: {
    get: () => devFly.on,
    set: (v) => {
      devFly.on = v;
      try { localStorage.setItem('ow.devFly', v ? '1' : '0'); } catch { /* ignore */ }
      if (!v && player.current.name === 'fly') player.set('walk', ctx);
    },
  },
  character: rig,
  colliders,
  mobs,
  bikes,
  spawnFlock: (name) => {
    const b = player.body;
    mobs.spawnFlockAt(name, b.pos.x + Math.sin(b.heading) * 18, b.pos.z + Math.cos(b.heading) * 18, mobCtx);
  },
  goHome,
  crowPlump: { get: () => crowStyle.plump, set: (v) => { crowStyle.plump = v; crow.setPlump(v); } },
  journey: { stages: [...STAGES, ...PHASE3.steps.map((st) => st.id)], jump: (s) => (STAGES.includes(s as Stage) ? journey?.jump(s as Stage) : stableJump(s)) },
  warmth: {
    mode: () => (warmth.force === null ? 'story' : warmth.force ? 'cold' : 'warm'),
    setMode: (m) => { warmth.force = m === 'story' ? null : m === 'cold'; },
    // The tower whose patch you stand in: lit as if just now (the warming rolls out), or put out.
    light: (on) => { const t = warmth.patch(player.body.pos.x, player.body.pos.z)?.tower; if (t) { if (on) beacons.debugSet(t.id); else beacons.setLit(t.id, false); } },
  },
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
// How far resolution may drop: to `softFloor` first, then shadows and
// geometry go, then to `hardFloor`. On a desktop screen anything under 85%
// shows at once in outlines and faces, so it stops there and sheds the rest
// instead; a dense phone screen can spare more.
const softFloor = touchDevice ? 0.7 : 0.85;
const hardFloor = touchDevice ? 0.55 : 0.85;
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
    if (autoScale > softFloor) autoScale = Math.max(softFloor, autoScale - 0.1);
    else if (!groundShadow.shed && groundShadowSettings.enabled) groundShadow.shed = true;
    else if (terrain.settings.splitFactor > 1.4) {
      terrain.settings.splitFactor = Math.max(1.4, terrain.settings.splitFactor - 0.15);
      terrain.nearLodDistance = Math.max(45, terrain.nearLodDistance - 10);
    } else if (autoScale > hardFloor) autoScale = Math.max(hardFloor, autoScale - 0.05);
    return;
  }
  slowWindows = 0;
  if (avg > 1 / 55) return;
  // Headroom: restore in reverse (low-res floor, geometry, shadows, pixels).
  if (autoScale < softFloor) autoScale = Math.min(softFloor, autoScale + 0.05);
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

  const storyBusy = !!storyHost?.story?.busy || !!visit?.busy || !!offering?.busy || !!homecoming?.busy || !!offering2?.busy || !!homecoming2?.busy || !!offering3?.busy || !!homecoming3?.busy || !!homecoming4?.busy || !!offering4?.busy;
  /** In a ring's arms (either way), and down in a dungeon. */
  const held = !!ring?.busy || !!ring2?.busy || !!ring3?.busy || !!ring4?.busy || !!dungeon?.busy || !!cave?.busy || !!hall?.busy || !!chasm?.busy, below = !!den();
  if (devFly.on && input.pressed('KeyF') && !riding && !cycling && !beacons.busy && !journey?.busy && !storyBusy && !held && !below) player.set(player.current.name === 'fly' ? 'walk' : 'fly', ctx);
  // Only take the press (pressed() consumes it) when a tower is on offer.
  const beaconUsed = !!beacons.action(player.current.name) && (input.pressed('KeyE') || input.pressed('Mouse0')) && beacons.act(player.current.name);
  // Likewise the dungeon's (the pick, at its rockfall).
  const inner = dungeon?.inside ? dungeon : hall?.inside ? hall : null;
  const dungeonUsed = !!inner && !!inner.action(player.current.name) && (input.pressed('KeyE') || input.pressed('Mouse0')) && inner.act(player.current.name);
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
  // (Dev: `__ow.pocket = { x, z, r }` stands a warm circle anywhere, to look at.)
  if (warmth.amt > 0) {
    const dev = (window as unknown as { __ow?: { pocket?: { x: number; z: number; r: number } } }).__ow?.pocket;
    warmth.pockets = dev ? [dev] : [];
  }
  warmth.update(dt);
  {
    // A sealed tower out in the cold: lighting it is shown warming its land, and it wants sparks.
    const st = beacons.sealed, cold = !!st && warmth.isCold(st.id);
    beacons.cold = cold;
    // In the story, sparks only once the giant has been: nothing glints about the village while the opening runs.
    sparksOn = !storyHost?.active || !!storyHost.story?.giantGone;
    sparks.update(dt, body.pos, sparksOn && !den(), cold ? sparks.price(st!.id) : 0, !beacons.busy && !storyBusy && !den());
  }
  // Her breath shows in the cold: a small pale puff from her mouth every few seconds, more often when she's been running.
  if (rig.chill > 0 && rig.root.visible && !den()) {
    breathT -= dt * (1 + Math.min(1.2, Math.hypot(body.vel.x, body.vel.z) / 6));
    if (breathT <= 0) {
      breathT = 2.4;
      const fx = Math.sin(body.heading), fz = Math.cos(body.heading);
      breath.emit(new THREE.Vector3(body.pos.x + fx * 0.46, body.pos.y + 1.08, body.pos.z + fz * 0.46), 2, 0.07, 0.1, new THREE.Vector3(-fx * 2.2, 0, -fz * 2.2), { life: 1.1, rise: 0.25, drag: 2.2, up: 0.15 });
    }
  }
  breath.update(dt);
  // Out in the cold it shows on your face and the guide's (not their colours: how they hold themselves).
  rig.chill = !den() && !warmth.warmAt(body.pos.x, body.pos.z) ? 1 : 0;
  { const sp = storyHost?.active ? storyHost.story?.spirit : null; if (sp) sp.chill = !warmth.warmAt(sp.pos.x, sp.pos.z) ? 1 : 0; }
  // The ring takes you down (on your own feet only); the dungeon lets you down, and takes you back up.
  ring?.update(dt, camera.position, player.current.name, body.grounded, !storyBusy && !beacons.busy && !journey?.busy && !riding && !cycling && !den() && !dungeonWon);
  ring2?.update(dt, camera.position, player.current.name, body.grounded, !storyBusy && !beacons.busy && !journey?.busy && !riding && !cycling && !den() && !dungeon2Won);
  ring3?.update(dt, camera.position, player.current.name, body.grounded, !storyBusy && !beacons.busy && !journey?.busy && !riding && !cycling && !den() && !dungeon3Won);
  // Out of the dungeon with its creature: up on to it as soon as the arms have let go.
  ring4?.update(dt, camera.position, player.current.name, body.grounded, !storyBusy && !beacons.busy && !journey?.busy && !riding && !cycling && !den() && !dungeon4Won);
  // (Until then it isn't seen: stood beside the ring while the arms lifted you, it then jumped under you. The owner saw it with the wurm, which is long.)
  // (`below` with nobody below: it doesn't think and isn't drawn.)
  if (bringUp && !den()) bringUp.below = true;
  if (bringUp && !den() && !ring?.busy && !ring2?.busy && !ring3?.busy && !ring4?.busy) { const g = bringUp; bringUp = null; g.below = false; g.pos.copy(body.pos); g.heading = body.heading; mount(g); }
  // And the ring shuts behind you: the field closes over, and the shrine comes up in the middle of it.
  if (dungeonWon && ring && !ring.sealed && !ring.busy && !den()) ring.seal();
  if (dungeon2Won && ring2 && !ring2.sealed && !ring2.busy && !den()) ring2.seal();
  if (dungeon3Won && ring3 && !ring3.sealed && !ring3.busy && !den()) ring3.seal();
  if (dungeon4Won && ring4 && !ring4.sealed && !ring4.busy && !den()) ring4.seal();
  if (dungeon?.inside) dungeon.update(dt, player.current.name, body.grounded, input.held('KeyE') || input.held('Mouse0'));
  else if (cave?.inside) cave.update(dt, player.current.name, body.grounded);
  else if (hall?.inside) {
    hall.update(dt, player.current.name, body.grounded);
    // (Put in the well under the cut, for the way out: the camera goes with you at once.)
    if (hall.snapYaw !== null) { orbit.yaw = hall.snapYaw; orbit.pitch = 0.3; orbit.targetDistance = 11; orbit.snap(); hall.snapYaw = null; }
  }
  if (chasm?.inside) chasm.update(dt, player.current.name, body.grounded);
  const mossK = Math.max(ring4?.veil ?? 0, chasm?.veil ?? 0, homecoming4?.veil ?? 0);
  const tealK = Math.max(ring2?.veil ?? 0, cave?.veil ?? 0, homecoming2?.veil ?? 0), roseK = Math.max(ring3?.veil ?? 0, hall?.veil ?? 0, homecoming3?.veil ?? 0);
  const veilK = Math.max(ring?.veil ?? 0, dungeon?.veil ?? 0, homecoming?.veil ?? 0, tealK, roseK, mossK, skipK);
  const veilHex = mossK > 0 ? DROP_LOOK.cut : roseK > 0 ? MOTH_LOOK.cut : tealK > 0 ? cave?.look.cut ?? '#17343c' : '#2b2147';
  if (veilK > 0 && veilHex !== dungeonVeilHex) dungeonVeil.style.background = dungeonVeilHex = veilHex;
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
    // Up (or down) a face of the Drop: the camera stands well back from the wall, square on to it and about level,
    // so the climb is seen whole (it used to stay wherever it was, close in, as she turned up the wall under it).
    const onFace = !!chasm?.inside && rideMode.gallopState.wall !== 0;
    wallCamK += ((onFace ? 1 : 0) - wallCamK) * (1 - Math.exp(-(onFace ? 1.6 : 2.5) * dt));
    if (onFace && lookIdle > 0.5) {
      const gs = rideMode.gallopState, want = Math.atan2(-gs.wallX, -gs.wallZ);
      orbit.yaw += Math.atan2(Math.sin(want - orbit.yaw), Math.cos(want - orbit.yaw)) * (1 - Math.exp(-3 * dt));
      orbit.pitch += (0.1 - orbit.pitch) * (1 - Math.exp(-2 * dt));
    }
    // A gallop kicks up dust behind.
    const gs = rideMode.gallopState;
    if ((riding.species.name === 'stelk' || (riding.species.verb && !riding.species.mount.fly)) && body.grounded && gs.wet < 0.5 && gs.speed > 12 && gs.burrow <= 0 && !blinkGone) {
      hoofT -= dt;
      if (hoofT <= 0) {
        hoofT = 0.11 - Math.min(0.06, (gs.speed - 12) * 0.003);
        const k = (Math.random() - 0.5) * 0.8;
        puffs.emit(v3.set(body.pos.x - Math.sin(body.heading) * 1.3 + Math.cos(body.heading) * k, body.pos.y + 0.1, body.pos.z - Math.cos(body.heading) * 1.3 - Math.sin(body.heading) * k), 1, 0.16 + Math.min(0.1, (gs.speed - 12) * 0.005), 0.8);
      }
    }
  }
  blinkWork(riding, dt);
  if (storyHost?.story) storyHost.story.packLift = riding ? riding.species.seat(riding).pos.y - body.pos.y : 0;
  mobCtx.dt = dt;
  mobCtx.time = elapsed;
  mobCtx.night = U.uNight.value;
  mobCtx.player.pos.copy(body.pos);
  mobCtx.player.vel.copy(body.vel);
  mobCtx.player.heading = body.heading;
  mobCtx.player.mode = mode;
  mobs.update(mobCtx, camera, hand, !den() && (mode === 'walk' || mode === 'glide' || mode === 'ride' || mode === 'bike'));
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
  // A dungeon's light, once it's yours, is in your mittens: below, and up at the shrine until it's given.
  const lightOf = dungeon?.inside ? dungeon : cave?.inside ? cave : null;
  rig.carry = lightOf ? lightOf.carrying : den() ? 0 : offering?.carrying || offering2?.carrying || offering3?.carrying || offering4?.carrying || 0;
  rig.update(body, mode, dt, cycling ? bikes.seat : riding ? riding.species.seat(riding) : undefined);
  if (lightOf?.carrying) lightOf.carryAt(rig.hands(hand));
  rig.hand(hand);
  mobs.updateRopes(mobCtx, hand);
  puffs.update(dt);
  mudPuffs.update(dt);
  glowPuffs.update(dt);
  sparkPuffs.update(dt);
  smokePuffs.update(dt);
  // (Standing on it, you go where it goes.)
  if (giant) giant.rider = den() ? null : body;
  giant?.update(dt);
  giantDust.update(dt);
  trail.update(dt, body.pos, !!giant?.walking);
  post.giant = giant ? { dist: giant.centre.distanceTo(camera.position), y: giant.centre.y } : null;
  if (storyHost?.story) {
    storyHost.story.external = beacons.action(mode) ?? (dungeon?.inside ? dungeon.action(mode) : hall?.inside ? hall.action(mode) : null);
    // No pats in the middle of a cutscene.
    storyHost.story.noPat = beacons.busy || !!journey?.busy || storyBusy;
  }
  storyHost?.story?.update(dt, input, mode);
  // (While the homecoming has the guide, the journey leaves it be.)
  if (!homecoming?.busy && !homecoming2?.busy && !homecoming3?.busy && !homecoming4?.busy) journey?.update(dt);
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
  skipUpdate(dt);
  visit?.update(dt);
  if (!den()) offering?.update(dt, mode);
  if (!den()) offering2?.update(dt, mode);
  if (!den()) offering3?.update(dt, mode);
  if (!den()) offering4?.update(dt, mode);
  // And on from its last frame: a spirit's light flown home, and the giant getting up.
  if (!den() && offering) homecoming?.update(dt, offering.state === 'given' && offering.clock < 0 && !veil);
  // The same from the second's: the second spirit home, and the giant on to the third ring.
  if (!den() && offering2 && homecoming?.settled) homecoming2?.update(dt, offering2.state === 'given' && offering2.clock < 0 && !veil);
  if (!den() && offering3 && homecoming2?.settled) homecoming3?.update(dt, offering3.state === 'given' && offering3.clock < 0 && !veil);
  // And from the fourth's: the fourth spirit home, and the giant on to the fifth ring.
  if (!den() && offering4 && homecoming3?.settled) homecoming4?.update(dt, offering4.state === 'given' && offering4.clock < 0 && !veil);
  // How the two of you take it. While it's here, she feels what the guide
  // does. Afterwards the guide stays downcast, and so does she among the
  // wreckage; away from it her grin is gone and her face is set.
  // The village, mended as far as the spirits home have got (a save, or a dev jump: live, it's done under the homecoming's veil).
  { const d = [homecoming, homecoming2, homecoming3, homecoming4].filter((h) => h?.home).length; if (d > mendedTo) mendVillage(d); }
  const moodHeld = params.has('mood');
  if (storyHost?.active && storyHost.story) {
    const st = storyHost.story, sp = st.spirit, was = rig.mood;
    // (Until one of them is home again: then there's something to be glad of, and neither is downcast.)
    if (st.giantGone && !homecoming?.home) {
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
  if (visitHud !== (!!visit?.busy || !!offering?.busy || !!homecoming?.busy || !!offering2?.busy || !!homecoming2?.busy || !!offering3?.busy || !!homecoming3?.busy || !!homecoming4?.busy || !!offering4?.busy)) { visitHud = !!visit?.busy || !!offering?.busy || !!homecoming?.busy || !!offering2?.busy || !!homecoming2?.busy || !!offering3?.busy || !!homecoming3?.busy || !!homecoming4?.busy || !!offering4?.busy; for (const id of ['story-inv', 'story-act']) { const el = document.getElementById(id); if (el) el.style.visibility = visitHud ? 'hidden' : ''; } }
  // Handed back to the tower's eyes, looking after it.
  if (visitWas && visit && !visit.busy && beacons.inside && giant) beacons.lookToward(giant.centre.x, giant.centre.z, giant.centre.y - 10);
  // Far from the task: a small arrowhead shows the way.
  if (pointer && storyHost?.story) {
    // No task to point at, and the giant not yet been: lost a long way off, the way home.
    const g = (journey ? journey.guide(mobs.leading) : storyHost.story.guide(mobs.leading)) ?? (storyHost.story.giantGone ? null : wayHome ??= { at: new THREE.Vector3(gen.story.x, gen.story.y, gen.story.z), near: 150, far: 350, delay: 60 });
    pointer.update(dt, camera, body.pos, g, !beacons.busy && !beacons.inside && !journey?.busy && !storyBusy && !den());
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
  // (The saddle's bounce is smoothed out of it: on a trotting mount the camera was bobbing with every
  // stride. First only down in the dungeon, where the camera is close; the owner asked for it above ground too.)
  let seatY = mode === 'ride' && riding ? riding.species.seat(riding).pos.y - body.pos.y : 0;
  if (mode === 'ride') seatY = rideSeatY = rideSeatY < 0 ? seatY : rideSeatY + (seatY - rideSeatY) * (1 - Math.exp(-1.5 * dt));
  else rideSeatY = -1;
  focus.y += mode === 'swim' ? 1.1 : mode === 'glide' ? 2.0 : mode === 'ride' && riding ? seatY + 1.1 : mode === 'bike' ? 1.55 : 1.4;
  focus.y += focusShift;
  if (focusOverride) focus.copy(focusOverride);
  // In the ring's arms the camera stays up where you stood.
  if (ring?.busy) focus.y = Math.max(focus.y, ring.heldY + 1.4);
  if (ring2?.busy) focus.y = Math.max(focus.y, ring2.heldY + 1.4);
  if (ring3?.busy) focus.y = Math.max(focus.y, ring3.heldY + 1.4);
  if (ring4?.busy) focus.y = Math.max(focus.y, ring4.heldY + 1.4);
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
  orbit.update(focus, dt, (x, z) => (den() ? -1e9 : Math.max(trail.height(x, z), SEA_LEVEL)), {
    fovKick: 3.5 * sprint + 7 * fall + (3 + THREE.MathUtils.clamp((hs - 9) / 6, 0, 1) * 4) * glide + 8 * flyK + 6 * rideK + 9 * bikeK,
    distScale: 1 + 0.12 * sprint + 0.15 * fall + 0.4 * glide + (mode === 'ride' ? (den() ? 0.08 : 0.25 + 0.2 * rideK) : 0) + 0.3 * bikeK + (mode === 'ride' ? 1.5 * wallCamK : 0),
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
  den()?.clampCamera(camera.position, focus, dt, body.vel);
  beacons.camNow.copy(camera.position);
  // You are the tower's head: the camera looks out through its eyes.
  // A tower's spirit being freed: the camera watches it, not you, easing
  // in from where it was and back to you after (never a cut).
  // Or the hearth spirit pulling your bike out of its heart.
  const cine = beacons.cinematic() ?? den()?.cinematic() ?? visit?.cinematic() ?? offering?.cinematic() ?? homecoming?.cinematic() ?? offering2?.cinematic() ?? homecoming2?.cinematic() ?? offering3?.cinematic() ?? homecoming3?.cinematic() ?? offering4?.cinematic() ?? homecoming4?.cinematic() ?? journey?.cinematic() ?? storyHost?.story?.cinematic() ?? null;
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
    // (From the homecoming's far-off camera it's a cut: easing 200 m back to you goes through whatever's between.)
    const cut = skipCut || homecoming?.afterYaw != null || homecoming2?.afterYaw != null || homecoming3?.afterYaw != null || homecoming4?.afterYaw != null;
    orbit.yaw = homecoming?.afterYaw ?? homecoming2?.afterYaw ?? homecoming3?.afterYaw ?? homecoming4?.afterYaw ?? offering?.afterYaw ?? offering2?.afterYaw ?? offering3?.afterYaw ?? offering4?.afterYaw ?? body.heading + Math.PI;
    if (offering3) offering3.afterYaw = null;
    if (offering4) offering4.afterYaw = null;
    if (offering) offering.afterYaw = null;
    if (offering2) offering2.afterYaw = null;
    if (homecoming) homecoming.afterYaw = null;
    if (homecoming2) homecoming2.afterYaw = null;
    if (homecoming3) homecoming3.afterYaw = null;
    if (homecoming4) homecoming4.afterYaw = null;
    orbit.pitch = cut ? 0.06 : 0.18;
    orbit.targetDistance = 10;
    if (cut) { orbit.snap(); camBlend = 1; } else { camBlendPos.copy(camLastPos); camBlendQ.copy(camLastQ); camBlend = 0; camBlendDur = 1.1; }
  }
  hadCine = !!cine;
  skipCut = false;
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
  if (den()) { nearHid = camera.position.distanceTo(focus) < (nearHid ? 1.7 : 1.2); rig.root.visible = !nearHid && !blinkGone; }
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
  // (The Drop's dark below its lip: nowhere else.)
  DUNGEON_U.uDarkY.value = chasm?.inside ? chasm.darkY : -1e9;
  den()?.applyLight(camera.position);
  ambience.update(dt, { hush: !!visit?.busy || !!offering?.busy || !!homecoming?.busy || !!offering2?.busy || !!homecoming2?.busy || !!offering3?.busy || !!homecoming3?.busy || !!homecoming4?.busy || !!offering4?.busy || !!den(), cue: visit?.music ?? hall?.music ?? null, soon: visit?.state === 'idle' && !!visit.route ? 'scene' : hall?.inside || (ring3 && homecoming2?.settled && !dungeon3Won) ? 'hall' : null });
  U.uTime.value = elapsed;
  sky.update(camera, elapsed);
  terrain.update(camera.position);
  if (!den()) hands?.update(camera.position);

  snow.update(dt, camera, env.sky.fog, !den());
  // (The mountains' cold is the land's, not the air's: the sky and the fog go by the ground under the eye.)
  if (postSettings.cold.top > 0 && postSettings.cold.amt > 0) postSettings.cold.under = gen.height(camera.position.x, camera.position.z);
  renderer.info.reset();
  const inDen = den();
  if (!skipRender && inDen) {
    // Its own scene, its own air; nothing of the world's overlay (the field, the pointer) shows through.
    const k = inDen === cave ? cave.look : inDen === hall ? hall.look : inDen === chasm ? chasm.look : DUNGEON_LOOK, ov = post.overlay;
    // (But its own: the explorer's thought bubble.)
    post.overlay = ov && { ...ov, scene: inDen.overlay };
    post.render(inDen.scene, camera, k.fog, k.outline, k.tint, k.tintAmt, k.lift, k.air);
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
/** A glimmer's blink: the two of you are gone (most of her phase), then seconds since you came back, while you fill out again (-1: not). */
let blinkGone = false;
let blinkBack = -1;
/** In a den with the camera pushed in on top of you: not drawn. */
let nearHid = false;
/** The rider's side of a blink: out of sight with her, and back out of the same sliver of light. */
function blinkWork(m: Mob | null, dt: number) {
  const gs = rideMode.gallopState, b = player.body;
  const gone = !!m && gs.phase > PHASE_IN;
  if (gone !== blinkGone) {
    blinkGone = gone;
    rig.root.visible = !gone;
    if (!gone && m) {
      // Back: a ring of her light thrown out round her (it goes along with her a way), and the dust jumps where she lands.
      blinkBack = 0;
      const on = -Math.abs(gs.speed) * 2.2;
      glowPuffs.emit(v3.set(b.pos.x, b.pos.y + 1.1, b.pos.z), 12, 0.13, 4.2, v3b.set(Math.sin(b.heading) * on, 0, Math.cos(b.heading) * on), { life: 0.3, up: 0.3, drag: 7 });
      if (b.grounded) puffs.emit(v3.set(b.pos.x, b.pos.y + 0.05, b.pos.z), 7, 0.17, 2.6, undefined, { up: 0.4 });
      orbit.bump(0.3);
    }
  }
  if (blinkBack >= 0) {
    blinkBack = m ? blinkBack + dt : BLINK_IN;
    if (blinkBack >= BLINK_IN) { blinkBack = -1; rig.root.scale.setScalar(1); }
    else { const [w, tall] = blinkIn(blinkBack / BLINK_IN); rig.root.scale.set(w, tall, w); }
  }
}
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
    case 'phase':
      // Gone: the dust she stood in is thrown back the way she came, a few motes of her light left hanging in it.
      puffs.emit(behind, 9, 0.26, 1.6, v3b.copy(trickDir).multiplyScalar(16), { life: 0.5, up: 0.5, drag: 3.2 });
      puffs.emit(behind.setY(b.pos.y + 0.7), 6, 0.16, 2.4, v3b.copy(trickDir).multiplyScalar(22), { life: 0.4, up: 1.2, drag: 3.6 });
      glowPuffs.emit(v3.set(b.pos.x, b.pos.y + 1, b.pos.z), 7, 0.11, 1.8, v3b.copy(trickDir).multiplyScalar(9), { life: 0.45 });
      break;
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
    // (Gone, all there is of her is a thin line of motes: where she went.)
    if (gs.phase > 0) glowPuffs.emit(v3.set(b.pos.x, b.pos.y + 0.9, b.pos.z), 1, 0.09, 0.25, undefined, { life: 0.25, up: 0.1 });
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
    fly: devFly.on && !riding && !cycling,
    chute: player.current.name === 'walk' && !player.body.grounded && player.body.pos.y - world.floorHeight!(player.body.pos.x, player.body.pos.z, player.body.pos.y, BODY_RADIUS) > walkMode.deployClearance,
  });
  const html = tips.join(' · ');
  if (promptEl.innerHTML !== html) promptEl.innerHTML = html;
  promptEl.style.opacity = html && !storyHost?.story?.silent ? '1' : '0';
}

let veil = document.getElementById('veil');
let readyFrames = 0;
/**
 * Dev (`__ow.drakArrive()`): a crew of three drakittens (pink, dark, tabby) rockets in and lands in
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
  /** The music's gain and what's playing (tests). */
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
  warmth,
  snow,
  sparks,
  _scene: scene,
  _terrain: terrain,
  _shadow: groundShadow,
  _colliders: colliders,
  _body: player.body,
  _cam: camera,
  _mobs: mobs,
  _orbit: orbit,
  _rig: rig,
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
  /** What you do with the light, above (giant/offering.ts): `offering().debug('held'|'placed'|'given')`, `.state`, `.clock`, `.cues`. */
  offering: () => offering,
  /** What follows it (giant/homecoming.ts): `.state`, `.phase`, `.clock`, `.waiting` (under the veil, for the land), `.left`, `.settled`, `.route`. */
  homecoming: () => homecoming,
  /** The same after the second dungeon (`who` 1, on to the third ring; saved as `home2`). */
  homecoming2: () => homecoming2,
  /** And after the third (`who` 2, on to the fourth ring; saved as `home3`). */
  homecoming3: () => homecoming3,
  /** And after the fourth (`who` 3, on to the fifth ring, bare stones; saved as `home4`). */
  homecoming4: () => homecoming4,
  /** The giant's footfalls on to the second ring (`onward(2)`: from there to the third), and how long the search for the dungeon sites took this load (ms; 0: cached). */
  onward: (leg = 1) => (leg === 4 ? homecoming4 : leg === 3 ? homecoming3 : leg === 2 ? homecoming2 : homecoming)?.route ?? [],
  siteSearchMs: () => siteSearchMs,
  siteSearchEach: () => gen.searchMs,
  /** The stone hands about the world: `hands().list` so far, `hands().survey(x, z, cells)` looks further at once. */
  hands: () => hands,
  /** Dev: as if you'd just taken the light: the dungeon marked done, and up you come on the rockhopper. (`winDungeon(2)`: the second's, on the glimmer.) */
  winDungeon,
  /** The second dungeon, the Veil Cave (null until you've been down): `.round`, `.play`, `.she`, `.layout.at`, `.goTo(name)`, `.debugRound(n)`, `.debugYours()`. `enterCave()` is its ring taking you; `enterCave(x, z)` stands you at a point of its plan; `leaveCave()` brings you up. */
  cave: () => cave,
  /** The third dungeon, the Moon Hall (null until you've been down): `.debug`, `.dials`, `.she`, `.layout.at`, `.goTo(name)`, `.debugSolve(all)`, `.debugYours()`. `enterHall()` is its ring taking you; `enterHall(x, z)` stands you at a point of its plan. */
  hall: () => hall,
  /** The fourth dungeon, the Drop (null until you've been down; dev only so far): `.debug`, `.target`, `.she`, `.layout.at`, `.goTo(name)`, `.debugDown(n)`, `.debugYours()`. `enterChasm()` lets you down into it; `enterChasm(x, z)` stands you at a point of its plan; `leaveChasm()` brings you up. */
  chasm: () => chasm,
  ring4: () => ring4,
  offering4: () => offering4,
  thirdDone,
  enterChasm: (x?: number, z?: number) => enterChasm(x === undefined ? undefined : [x, z ?? 0]),
  leaveChasm: () => { if (chasm?.inside) { chasm.inside = false; leaveChasm(); } },
  ring3: () => ring3,
  offering3: () => offering3,
  enterHall: (x?: number, z?: number) => { if (!homecoming2?.settled) secondDone(); ring3?.setOpen(); enterHall(x === undefined ? undefined : [x, z ?? 0]); },
  leaveHall: () => { if (hall?.inside) { hall.inside = false; leaveHall(); } },
  secondDone,
  ring2: () => ring2,
  offering2: () => offering2,
  enterCave: (x?: number, z?: number) => { if (!homecoming?.settled) firstDone(); ring2?.setOpen(); enterCave(x === undefined ? undefined : [x, z ?? 0]); },
  leaveCave: () => { if (cave?.inside) { cave.inside = false; leaveCave(); } },
  /** Dev: the first dungeon done and the giant walked on to the second ring, as a save from there has it. */
  firstDone,
  /** The ride's state on a ground mount (its phase, its speed). */
  gallop: () => rideMode.gallopState,
  /** The other spirits' houses down the lane (null when no lane fits the seed). */
  village: () => storyHost?.story?.village ?? null,
  /** Dev: house `i` at step `step` of being built again (0 nothing, 5 home; `Village.setStep`), the giant's print under it filled in. With no step: the step it's at. */
  house: (i: number, step?: number) => {
    const v = storyHost?.story?.village, h = v?.houses[i];
    if (!v || !h) return null;
    if (step !== undefined) { if (step > 0) trail.fill(h.plot.x, h.plot.z); v.setStep(i, step); }
    return h.step;
  },
  trail,
  /** Dev: the village as `done` dungeons finished leave it (`mendVillage`: forward only). */
  mend: (done: number) => mendVillage(done) ?? null,
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
  /** Skip whatever cutscene is playing, as holding Space does (false: nothing to skip). */
  skip: () => { if (skipStage !== 'none' || !skippable()) return false; skipStage = 'in'; return true; },
  skipping: () => skipStage,
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
