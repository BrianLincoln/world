import './core/colorSetup';
import * as THREE from 'three';
import './style.css';
import { seedFromString } from './core/rng';
import { Environment } from './gfx/environment';
import { initMaterials, TERRAIN_U, U } from './gfx/materials';
import { PostPipeline, postSettings } from './gfx/post';
import { Sky } from './gfx/sky';
import { CharacterRig } from './player/character';
import { Input } from './player/input';
import { FlyMode, MovementController, SwimMode, WalkMode, type MoveContext, type WorldQuery } from './player/movement';
import { OrbitCamera } from './player/orbitCamera';
import { DebugUI } from './ui/debug';
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

const world: WorldQuery = {
  groundHeight: (x, z) => gen.height(x, z),
  waterLevel: SEA_LEVEL,
};

const player = new MovementController([new WalkMode(), new SwimMode(), new FlyMode()], 'walk');
const rig = new CharacterRig();
scene.add(rig.root);
const orbit = new OrbitCamera(camera);
const input = new Input(renderer.domElement);
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
  sky.setSeed(gen.seed);
  const [x, z] = findSpawn(0, 0);
  player.set('walk', ctx);
  placePlayer(x, z);
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
  setMode: (m) => player.set(m, ctx),
  position: () => player.body.pos,
});
if (params.has('capture')) postSettings.adaptive = false;
if (params.get('ui') === '0') {
  ui.hide();
  document.getElementById('help')?.remove();
}

// Adaptive resolution: if frames run long, render fewer pixels. Outlines and
// flat colour survive downscaling well, so this is the cheapest quality knob.
let autoScale = 1;
let frameAcc = 0;
let frameN = 0;
function adaptResolution(rawDt: number) {
  if (!postSettings.adaptive || document.hidden) return;
  frameAcc += rawDt;
  frameN++;
  if (frameAcc < 1.5) return;
  const avg = frameAcc / frameN;
  frameAcc = 0;
  frameN = 0;
  if (avg > 1 / 50) {
    // First shed pixels; once at the floor, shed geometry (vertex-bound GPUs).
    if (autoScale > 0.7) autoScale = Math.max(0.7, autoScale - 0.1);
    else if (terrain.settings.splitFactor > 1.4) {
      terrain.settings.splitFactor = Math.max(1.4, terrain.settings.splitFactor - 0.15);
      terrain.nearLodDistance = Math.max(45, terrain.nearLodDistance - 10);
    } else if (autoScale > 0.55) autoScale = Math.max(0.55, autoScale - 0.05);
  } else if (avg < 1 / 58 && autoScale < 1) autoScale = Math.min(1, autoScale + 0.05);
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

  if (input.pressed('KeyF')) player.set(player.current.name === 'fly' ? 'walk' : 'fly', ctx);
  if (input.pressed('KeyH')) ui.toggle();
  if (input.pressed('KeyT')) env.hour = (Math.floor(env.hour) + 1) % 24;
  const [lx, ly] = input.consumeLook();
  orbit.addLook(lx, ly);
  orbit.zoom(input.consumeWheel());

  ctx.input = input.state();
  ctx.camYaw = orbit.yaw;
  ctx.camPitch = orbit.pitch;
  ctx.dt = dt;
  player.update(ctx);
  input.endFrame();

  rig.update(player.body, player.current.name, dt);
  const focus = player.body.pos.clone();
  focus.y += player.current.name === 'swim' ? 1.1 : 1.4;
  orbit.update(focus, dt, (x, z) => Math.max(gen.height(x, z), SEA_LEVEL));
  U.uFocus.value.copy(focus);
  TERRAIN_U.uPlayerFeet.value.copy(player.body.pos);
  if (player.current.name !== 'walk') TERRAIN_U.uPlayerFeet.value.y = -1e4;

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
      `${player.current.name} · ${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)} · ${env.hour.toFixed(1)}h · seed ${seedText}`;
  });
  if (veil && !terrain.busy && ++readyFrames > 10) {
    veil.classList.add('gone');
    setTimeout(() => veil?.remove(), 1000);
    veil = null;
  }
  requestAnimationFrame(frame);
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
  _cam: camera,
};
