import './core/colorSetup';
import * as THREE from 'three';
import './style.css';
import { seedFromString } from './core/rng';
import { Environment } from './gfx/environment';
import { initMaterials, TERRAIN_U, U } from './gfx/materials';
import { PostPipeline, postSettings } from './gfx/post';
import { Puffs } from './gfx/puffs';
import { Sky } from './gfx/sky';
import { CharacterRig } from './player/character';
import { Input } from './player/input';
import { TouchControls, isTouchDevice } from './ui/touch';
import { BikeMode, BODY_RADIUS, FlyMode, GlideMode, MovementController, RideMode, SwimMode, WalkMode, type MoveContext, type WorldQuery } from './player/movement';
import { Crow, crowStyle } from './mobs/crow';
import { Mobs } from './mobs/manager';
import type { Mob, MobCtx } from './mobs/types';
import { Floof } from './mobs/floof';
import { OrbitCamera } from './player/orbitCamera';
import { DebugUI } from './ui/debug';
import { Bikes, type Bike } from './vehicles/bikes';
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
const sky = new Sky(gen.seed);
scene.add(sky.group);

const env = new Environment();
env.hour = params.has('t') ? parseFloat(params.get('t')!) : 9.2;
env.paused = params.get('paused') === '1';
if (params.get('palette')) env.paletteOverride = params.get('palette');

const colliders = new Colliders(gen);
const bikes = new Bikes(gen, colliders);
const world: WorldQuery = {
  groundHeight: (x, z) => gen.height(x, z),
  floorHeight: (x, z, feetY, r) => Math.max(gen.height(x, z), colliders.surface(x, z, feetY, r)),
  collide: (pos, vel, r, rampMax) => {
    colliders.push(pos, vel, r, rampMax);
    bikes.push(pos, vel, r);
  },
  ramp: (x, z, r, maxRise) => colliders.ramp(x, z, r, maxRise),
  waterLevel: SEA_LEVEL,
};

const rideMode = new RideMode();
const bikeMode = new BikeMode();
const player = new MovementController([new WalkMode(), new SwimMode(), new FlyMode(), new GlideMode(), rideMode, bikeMode], 'walk');
const rig = new CharacterRig();
scene.add(rig.root);
if (params.get('eyes') === 'round') rig.eyeType = 'round';
const puffs = new Puffs();
scene.add(puffs.group);
rig.onPuff = (at, n, size, spread) => puffs.emit(at, n, size, spread);

// Creatures: wild flocks, the lasso, leads and riding.
const crow = new Crow();
const mobs = new Mobs(gen, [new Floof(), crow]);
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

function placePlayer(x: number, z: number) {
  const b = player.body;
  b.pos.set(x, gen.height(x, z), z);
  b.vel.set(0, 0, 0);
  orbit.snap();
}

function spawn() {
  if (params.has('x') && params.has('z')) placePlayer(parseFloat(params.get('x')!), parseFloat(params.get('z')!));
  else {
    const [x, z] = findSpawn(0, 0);
    placePlayer(x, z);
  }
}
spawn();
if (params.has('yaw')) orbit.yaw = parseFloat(params.get('yaw')!);
{
  const [sx, sz] = findSpawn(0, 0);
  bikes.reset(gen, sx, sz, orbit.yaw);
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
  const [x, z] = findSpawn(0, 0);
  player.set('walk', ctx);
  placePlayer(x, z);
  bikes.reset(gen, x, z, orbit.yaw);
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
  if (avg > 1 / 50) {
    if (++slowWindows < 2) return;
    slowWindows = 0;
    // First shed pixels; once at the floor, shed geometry (vertex-bound GPUs).
    if (autoScale > 0.7) autoScale = Math.max(0.7, autoScale - 0.1);
    else if (terrain.settings.splitFactor > 1.4) {
      terrain.settings.splitFactor = Math.max(1.4, terrain.settings.splitFactor - 0.15);
      terrain.nearLodDistance = Math.max(45, terrain.nearLodDistance - 10);
    } else if (autoScale > 0.55) autoScale = Math.max(0.55, autoScale - 0.05);
    return;
  }
  slowWindows = 0;
  if (avg > 1 / 55) return;
  // Headroom: restore in reverse (low-res floor, then geometry, then pixels).
  if (autoScale < 0.7) autoScale = Math.min(0.7, autoScale + 0.05);
  else if (terrain.settings.splitFactor < fullSplit) {
    terrain.settings.splitFactor = Math.min(fullSplit, terrain.settings.splitFactor + 0.15);
    terrain.nearLodDistance = Math.min(fullNearLod, terrain.nearLodDistance + 10);
  } else if (autoScale < 1) autoScale = Math.min(1, autoScale + 0.05);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio || 1, 1.5) * postSettings.renderScale * autoScale;
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

function frame(ts?: number) {
  timer.update(ts);
  const rawDt = timer.getDelta();
  const dt = Math.min(rawDt, 0.05);
  adaptResolution(rawDt);
  elapsed += dt;
  if (postSettings.renderScale !== lastScale || autoScale !== lastAuto) {
    lastScale = postSettings.renderScale;
    lastAuto = autoScale;
    resize();
  }

  if (input.pressed('KeyF') && !riding && !cycling) player.set(player.current.name === 'fly' ? 'walk' : 'fly', ctx);
  if (input.pressed('KeyE')) {
    if (riding) dismount();
    else if (cycling) dismountBike();
    else {
      const m = mobs.mountable(player.body.pos);
      const k = player.current.name === 'walk' ? bikes.mountable(player.body.pos) : null;
      if (m && (!k || m.pos.distanceTo(player.body.pos) < k.pos.distanceTo(player.body.pos))) mount(m);
      else if (k) mountBike(k);
    }
  }
  const lassoKey = input.pressed('KeyR') || input.pressed('Mouse2');
  if (lassoKey && mobs.act() === 'throw') rig.throwLasso();
  if (input.pressed('KeyH')) ui.toggle();
  if (input.pressed('KeyT')) env.hour = (Math.floor(env.hour) + 1) % 24;
  const [lx, ly] = input.consumeLook();
  orbit.addLook(lx, ly);
  lookIdle = lx || ly ? 0 : lookIdle + dt;
  orbit.zoom(input.consumeWheel());

  ctx.input = input.state();
  ctx.camYaw = inputYaw ?? orbit.yaw;
  ctx.camPitch = orbit.pitch;
  ctx.dt = dt;
  if (player.current.name !== 'fly') colliders.prefetch(player.body.pos.x, player.body.pos.z);
  player.update(ctx);
  input.endFrame();

  const body = player.body;
  if (cycling && player.current.name !== 'bike') dismountBike(); // tumbled into deep water
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
    for (const ev of body.events) if (ev.type === 'land' && ev.impact > 3) puffs.emit(body.pos, 6, 0.16, 2.2);
  }
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
  for (const ev of body.events) if (ev.type === 'land' && ev.impact > 6) orbit.bump(Math.min(2.2, (ev.impact - 6) * 0.14));
  const focus = body.pos.clone();
  focus.y += mode === 'swim' ? 1.1 : mode === 'glide' ? 2.0 : mode === 'ride' && riding ? riding.species.seat(riding).pos.y - body.pos.y + 1.1 : mode === 'bike' ? 1.55 : 1.4;
  focus.y += focusShift;
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
  U.uFocus.value.copy(focus);
  // Contact shadow sits on the ground under the explorer and shrinks with height.
  // Floor, not bare terrain: on a rock or roof the terrain-only shadow hides.
  const groundY = world.floorHeight!(body.pos.x, body.pos.z, body.pos.y, BODY_RADIUS);
  const lift = body.pos.y - groundY;
  TERRAIN_U.uPlayerFeet.value.set(body.pos.x, groundY, body.pos.z);
  TERRAIN_U.uPlayerLift.value = lift;
  if (mode === 'swim' || mode === 'ride' || lift > 40 || groundY < SEA_LEVEL) TERRAIN_U.uPlayerFeet.value.y = -1e4;
  updateAimHud();

  env.update(dt);
  U.uTime.value = elapsed;
  sky.update(camera, elapsed);
  terrain.update(camera.position);

  renderer.info.reset();
  const s = env.sky;
  post.render(scene, camera, s.fog, s.outline, s.tint, s.tintAmt, s.lift);

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
  requestAnimationFrame(frame);
}
let skidT = 0;
/** Seconds of dust trail left after a timed kick. */
let trailT = 0;
let trailEmit = 0;
const v3 = new THREE.Vector3();

/** The lasso reticle over the aimed mob, and the context prompt. */
const aimV = new THREE.Vector3();
function updateAimHud() {
  const a = mobs.aim;
  const mountable = !riding && !cycling ? mobs.mountable(player.body.pos) : null;
  const bike = !riding && !cycling && !mountable && player.current.name === 'walk' ? bikes.mountable(player.body.pos) : null;
  const tips: string[] = [];
  if (a) {
    aimV.copy(a.mob.pos).setY(a.mob.pos.y + a.mob.species.centreY).project(camera);
    const x = (aimV.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-aimV.y * 0.5 + 0.5) * window.innerHeight;
    aimEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    aimEl.className = aimV.z < 1 ? 'on ' + a.action : '';
    tips.push(a.action === 'lasso' ? '<b>R</b> lasso' : a.action === 'lead' ? '<b>R</b> lead' : '<b>R</b> let go');
  } else aimEl.className = '';
  if (mountable) tips.push('<b>E</b> ride');
  if (bike) tips.push('<b>E</b> ride the bicycle');
  if (cycling) tips.push('<b>E</b> hop off · <b>Shift</b> pedal hard · <b>Space</b> hop');
  if (riding) tips.push(riding.species.mount.walk ? '<b>E</b> hop off · <b>Space</b> take off / climb · <b>C</b> descend' : '<b>E</b> hop off · <b>Space</b> climb · <b>C</b> descend');
  touch?.setContext({
    ride: riding || cycling ? 'Hop off' : mountable || bike ? 'Ride' : null,
    lasso: a ? (a.action === 'lasso' ? 'Lasso' : a.action === 'lead' ? 'Lead' : 'Let go') : null,
    down: !!riding || player.current.name === 'fly',
    fly: !riding && !cycling,
  });
  const html = tips.join(' · ');
  if (promptEl.innerHTML !== html) promptEl.innerHTML = html;
  promptEl.style.opacity = html ? '1' : '0';
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
  body: player.body,
  post: postSettings,
  // debug handles for the probe scripts
  _r: renderer,
  _p: post,
  _scene: scene,
  _terrain: terrain,
  _colliders: colliders,
  _body: player.body,
  _cam: camera,
  mobs,
  /** Drop a flock (floof|crow) `d` m in front of the explorer. */
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
  /** Frame the nearest bicycle from `dist` m, from `side` (rad around it, 0 = its left). */
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
