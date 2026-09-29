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
import { CharacterRig } from './player/character';
import { Input } from './player/input';
import { TouchControls, isTouchDevice } from './ui/touch';
import { BikeMode, BODY_RADIUS, CarriedMode, FlyMode, GlideMode, MovementController, RideMode, SwimMode, WalkMode, type MoveContext, type WorldQuery } from './player/movement';
import { Crow, crowStyle } from './mobs/crow';
import { Mobs } from './mobs/manager';
import type { Mob, MobCtx } from './mobs/types';
import { Floof } from './mobs/floof';
import { Elk } from './mobs/elk';
import { OrbitCamera } from './player/orbitCamera';
import { DebugUI } from './ui/debug';
import { StoryHost } from './story/host';
import { Harvest } from './world/harvest';
import { Bikes, type Bike } from './vehicles/bikes';
import { TowerDebug } from './ui/towerDebug';
import { Beacons } from './story/beacons';
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
const terrain = new Terrain(gen.seed);
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
const world: WorldQuery = {
  groundHeight: (x, z) => gen.height(x, z),
  floorHeight: (x, z, feetY, r) => Math.max(gen.height(x, z), colliders.surface(x, z, feetY, r), storyHost?.story?.surface(x, z, feetY, r, 0.5) ?? -Infinity, beacons?.surface(x, z, feetY) ?? -Infinity),
  collide: (pos, vel, r, rampMax) => {
    colliders.push(pos, vel, r, rampMax);
    bikes.push(pos, vel, r);
    storyHost?.story?.collide(pos, vel, r);
    beacons?.collide(pos, vel, r);
  },
  ramp: (x, z, r, maxRise) => colliders.ramp(x, z, r, maxRise),
  landmarks: (pos, vel, r) => beacons?.collide(pos, vel, r),
  waterLevel: SEA_LEVEL,
};

const rideMode = new RideMode();
const bikeMode = new BikeMode();
const player = new MovementController([new WalkMode(), new SwimMode(), new FlyMode(), new GlideMode(), rideMode, bikeMode, new CarriedMode()], 'walk');
const rig = new CharacterRig();
scene.add(rig.root);
if (params.get('eyes') === 'round') rig.eyeType = 'round';
const puffs = new Puffs();
scene.add(puffs.group);
rig.onPuff = (at, n, size, spread) => puffs.emit(at, n, size, spread);

// Creatures: wild flocks, the lasso, leads and riding.
const crow = new Crow();
const elk = new Elk();
const mobs = new Mobs(gen, [new Floof(), crow, elk]);
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
  surface: (x, z) => Math.max(gen.height(x, z), SEA_LEVEL),
  collide: (pos, vel, r) => {
    colliders.push(pos, vel, r);
    storyHost?.story?.collide(pos, vel, r);
    beacons?.collide(pos, vel, r);
  },
  puff: (at, n, size, spread) => puffs.emit(at, n, size, spread),
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
  player.set('ride', ctx);
  riding = m;
  orbit.targetDistance = Math.max(orbit.targetDistance, 12);
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
colliders.skip = (kind, x, z) => { const [gi, gj] = Harvest.cellOf(kind, x, z); return harvest.gone(kind, gi, gj); };
colliders.busy = (kind, x, z) => { const [gi, gj] = Harvest.cellOf(kind, x, z); return harvest.has(kind, gi, gj); };
storyHost = new StoryHost({ scene, post, env, rig, body: player.body, camera, puffs: (at, n, size, spread) => puffs.emit(at, n, size, spread), colliders, harvest }, storyActive);
if (params.has('fresh')) try { localStorage.removeItem(`fjellheim.story.${seedText}`); } catch { /* ignore */ }
storyHost.build(gen, seedText);
// Dev views of the beacon-tower network (L sight lines, M map; panel only).
const towerDebug = new TowerDebug();
storyHost.overlay.add(towerDebug.group);
towerDebug.setGen(gen);
if (params.get('towers') === '1') towerDebug.settings.links = towerDebug.settings.map = true;
// Beacon towers: drawn at any distance, their spirits lift you up and down.
if (params.has('fresh')) try { localStorage.removeItem(`fjellheim.towers.${seedText}`); } catch { /* ignore */ }
let hadCine = false;
/** Easing the camera between a cinematic and the orbit: where it came from, and how far along (1 = done). */
const camBlendPos = new THREE.Vector3(), camBlendQ = new THREE.Quaternion(), camLastPos = new THREE.Vector3(), camLastQ = new THREE.Quaternion();
let camBlend = 1;
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
if (params.get('lit') === 'all') beacons.debugSet('all');
if (params.get('beacons') === '0') beacons.group.visible = false;

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
  b.pos.set(x, gen.height(x, z), z);
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
    player.body.heading = s.yaw + Math.PI;
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
if (params.get('mode') === 'fly') {
  player.set('fly', ctx);
  player.body.pos.y = gen.height(player.body.pos.x, player.body.pos.z) + (params.has('y') ? parseFloat(params.get('y')!) : 60);
}

function setSeed(s: string) {
  seedText = s;
  gen = new WorldGen(seedFromString(s));
  terrain.setSeed(gen.seed);
  colliders.reset(gen);
  if (riding) dismount();
  if (cycling) dismountBike();
  mobs.reset(gen);
  mobCtx.gen = gen;
  sky.setSeed(gen.seed);
  const story = storyHost?.build(gen, s);
  const [x, z] = storyHost?.active && story ? [story.spawnPoint().x, story.spawnPoint().z] : findSpawn(0, 0);
  player.set('walk', ctx);
  placePlayer(x, z);
  if (storyHost?.active && story) { orbit.yaw = story.spawnPoint().yaw; orbit.snap(); }
  bikes.reset(gen, x, z, orbit.yaw, !storyHost?.active);
  towerDebug.setGen(gen);
  beacons.setGen(gen, s);
  const u = new URL(location.href);
  u.searchParams.set('seed', s);
  history.replaceState(null, '', u);
}

const ui = new DebugUI({
  env,
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

  if (input.pressed('KeyF') && !riding && !cycling && !beacons.busy) player.set(player.current.name === 'fly' ? 'walk' : 'fly', ctx);
  // Only take the press (pressed() consumes it) when a tower is on offer.
  const beaconUsed = !!beacons.action(player.current.name) && (input.pressed('KeyE') || input.pressed('Mouse0')) && beacons.act(player.current.name);
  if (!beaconUsed) storyHost?.story?.handleAction(input);
  if (input.pressed('KeyE') && !beaconUsed) {
    // Something else in reach? Climb straight across; otherwise E hops off.
    const next = nextMount();
    if (next && (riding || cycling)) switchTo(next);
    else if (riding) dismount();
    else if (cycling) dismountBike();
    else if (next) switchTo(next);
  }
  const lassoKey = input.pressed('KeyR') || input.pressed('Mouse2');
  if (lassoKey && mobs.act() === 'throw') rig.throwLasso();
  if (input.pressed('KeyH')) ui.toggle();
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
  if (beacons.busy) ctx.input = { ...ctx.input, x: 0, y: 0, run: false, jump: false, jumpPressed: false, up: false, down: false };
  ctx.camYaw = inputYaw ?? orbit.yaw;
  ctx.camPitch = orbit.pitch;
  ctx.dt = dt;
  elkWork(dt);
  if (player.current.name !== 'fly') colliders.prefetch(player.body.pos.x, player.body.pos.z);
  player.update(ctx);
  input.endFrame();
  if (touch) followOnTouch(dt);

  const body = player.body;
  if (cycling && player.current.name !== 'bike') dismountBike(); // tumbled into deep water
  beacons.update(dt, camera, player.current.name, body.grounded, input.held('KeyE') || input.held('Mouse0'));
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
    // A gallop kicks up dust behind.
    const gs = rideMode.gallopState;
    if (riding.species.name === 'elk' && body.grounded && gs.wet < 0.5 && gs.speed > 12) {
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
  mobCtx.player.pos.copy(body.pos);
  mobCtx.player.vel.copy(body.vel);
  mobCtx.player.heading = body.heading;
  mobCtx.player.mode = mode;
  mobs.update(mobCtx, camera, hand, mode === 'walk' || mode === 'glide' || mode === 'ride' || mode === 'bike');
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
  if (storyHost?.story) storyHost.story.external = beacons.action(mode);
  storyHost?.story?.update(dt, input, mode);
  towerDebug.update(body.pos, body.heading, orbit.yaw);
  for (const ev of body.events) if (ev.type === 'land' && ev.impact > 6) orbit.bump(Math.min(2.2, (ev.impact - 6) * 0.14));
  const focus = body.pos.clone();
  focus.y += mode === 'swim' ? 1.1 : mode === 'glide' ? 2.0 : mode === 'ride' && riding ? riding.species.seat(riding).pos.y - body.pos.y + 1.1 : mode === 'bike' ? 1.55 : 1.4;
  focus.y += focusShift;
  if (focusOverride) focus.copy(focusOverride);
  // Speed feel: FOV kick + pull-back when sprinting, diving, gliding.
  const hs = Math.hypot(body.vel.x, body.vel.z);
  const sprint = mode === 'walk' ? THREE.MathUtils.clamp((hs - 6.5) / 4, 0, 1) : 0;
  const fall = mode === 'walk' ? THREE.MathUtils.clamp((-body.vel.y - 10) / 20, 0, 1) : 0;
  const glide = mode === 'glide' ? 1 : 0;
  const flyK = mode === 'fly' ? THREE.MathUtils.clamp(body.vel.length() / 90, 0, 1) : 0;
  const rideK = mode === 'ride' ? THREE.MathUtils.clamp((body.vel.length() - 8) / 30, 0, 1) : 0;
  // Keeps building with speed: a mountain descent should feel like one.
  const bikeK = mode === 'bike' ? THREE.MathUtils.clamp((hs - 8) / 50, 0, 1.4) : 0;
  orbit.update(focus, dt, (x, z) => Math.max(gen.height(x, z), SEA_LEVEL), {
    fovKick: 3.5 * sprint + 7 * fall + (3 + THREE.MathUtils.clamp((hs - 9) / 6, 0, 1) * 4) * glide + 8 * flyK + 6 * rideK + 9 * bikeK,
    distScale: 1 + 0.12 * sprint + 0.15 * fall + 0.4 * glide + (mode === 'ride' ? 0.25 + 0.2 * rideK : 0) + 0.3 * bikeK,
    airborne: !body.grounded && mode !== 'ride',
    velX: body.vel.x,
    velZ: body.vel.z,
  });
  // Back in a tower's room: look in at yourself through the doorway.
  if (beacons.lowered !== null) {
    orbit.yaw = beacons.lowered;
    orbit.pitch = 0.1;
    orbit.targetDistance = 12;
    orbit.snap();
    beacons.lowered = null;
  }
  // In a tower's room, the camera stays inside it too.
  beacons.clampCamera(camera.position, focus, dt);
  beacons.camNow.copy(camera.position);
  // You are the tower's head: the camera looks out through its eyes.
  // A tower's spirit being freed: the camera watches it, not you, easing
  // in from where it was and back to you after (never a cut).
  const cine = beacons.cinematic();
  if (cine) {
    if (!hadCine) { camBlendPos.copy(camera.position); camBlendQ.copy(camera.quaternion); camBlend = 0; }
    camera.position.copy(cine.pos);
    camera.lookAt(cine.at);
    camLastPos.copy(camera.position); camLastQ.copy(camera.quaternion);
  } else if (hadCine) {
    orbit.yaw = body.heading + Math.PI;
    orbit.pitch = 0.18;
    orbit.targetDistance = 10;
    camBlendPos.copy(camLastPos); camBlendQ.copy(camLastQ); camBlend = 0;
  }
  hadCine = !!cine;
  if (camBlend < 1) {
    camBlend = Math.min(1, camBlend + dt / 1.1);
    const k = THREE.MathUtils.smootherstep(camBlend, 0, 1);
    camera.position.lerpVectors(camBlendPos, camera.position, k);
    camera.quaternion.slerpQuaternions(camBlendQ, camera.quaternion, k);
    camera.updateMatrixWorld();
  }
  const vc = beacons.viewCam();
  if (vc) {
    camera.position.copy(vc.pos);
    camera.lookAt(vc.at);
    camera.fov = 42;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
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
  U.uTime.value = elapsed;
  sky.update(camera, elapsed);
  terrain.update(camera.position);

  renderer.info.reset();
  if (!skipRender) {
    groundShadow.update(renderer, terrain.root, camera.position);
    const s = env.sky;
    post.render(scene, camera, s.fog, s.outline, s.tint, s.tintAmt, s.lift);
  }

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
const elkDir = new THREE.Vector3();
/** A full gallop (m/s along the heading) bowls trees over. */
const CHARGE_SPEED = 13;

/**
 * Riding an elk: at a full gallop, trees in its path are knocked flat as it
 * runs through them (it hardly checks its stride); slower, a click (or the
 * badge) butts the tree in front down with the antlers. The logs hop into
 * your pack either way. Runs before the move, so the trunk is out of the way
 * before the gallop would hit it.
 */
function elkWork(dt: number) {
  const story = storyHost?.story;
  if (!story) return;
  const m = riding;
  if (!m || m.species.name !== 'elk') {
    story.ramReady = false;
    buttAt = -1;
    return;
  }
  const b = player.body;
  const gs = rideMode.gallopState;
  elkDir.set(Math.sin(b.heading), 0, Math.cos(b.heading));
  const nose = m.species.radius + 0.4;
  if (b.grounded && gs.wet < 0.5 && gs.speed > CHARGE_SPEED) {
    const reach = nose + gs.speed * dt * 1.6 + 0.4;
    if (story.knockTree(b.pos, elkDir, reach, 0.5)) {
      elk.butt(m);
      gs.speed *= 0.85;
      orbit.bump(0.8);
    }
  }
  story.ramReady = b.grounded && gs.wet < 0.5 && gs.speed <= CHARGE_SPEED && !!story.treeAhead(b.pos, elkDir, nose + 2.2, 0.8);
  if (buttAt < 0 && story.ramReady && input.pressed('Mouse0')) {
    elk.butt(m);
    buttAt = 0.26;
  }
  if (buttAt >= 0) {
    buttAt -= dt;
    if (buttAt < 0 && story.knockTree(b.pos, elkDir, nose + 2.6, 0.9)) orbit.bump(0.6);
  }
}
/** Seconds of dust trail left after a timed kick. */
let trailT = 0;
let trailEmit = 0;
const v3 = new THREE.Vector3();

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
    if (!sp.fly) tips.push(`${e} · <b>Shift</b> gallop · <b>Space</b> leap${storyHost?.story?.ramReady ? ' · <b>Click</b> knock it down' : ''}`);
    else tips.push(sp.walk ? `${e} · <b>Space</b> take off / climb · <b>C</b> descend` : `${e} · <b>Space</b> climb · <b>C</b> descend`);
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
  mobs,
  /** Drop a flock (floof|crow|elk) `d` m in front of the explorer. */
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
  /** Orbit the camera round a world point instead of the explorer (null = back to normal). */
  focusAt: (x: number | null, y = 0, z = 0) => { focusOverride = x === null ? null : new THREE.Vector3(x, y, z); orbit.snap(); },
  /** Frame the nearest bicycle from `dist` m, from `side` (rad around it, 0 = its left). */
  goToTower: (i: number) => goToTower(i),
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
