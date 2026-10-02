import GUI from 'lil-gui';
import { postSettings } from '../gfx/post';
import { SKY_PRESETS } from '../gfx/palette';
import { CASTER_U, KIND_COLORS, TERRAIN_U, U } from '../gfx/materials';
import { groundShadowSettings } from '../gfx/groundShadow';
import { FACE_PARAMS } from '../gfx/shaders';
import type { Environment } from '../gfx/environment';
import type { Terrain } from '../world/terrain';

export interface DebugHooks {
  env: Environment;
  ambience: { gains: { music: number } };
  terrain: Terrain;
  getSeed(): string;
  setSeed(s: string): void;
  randomSeed(): void;
  modeName(): string;
  setMode(m: string): void;
  position(): { x: number; y: number; z: number };
  /** Whether F (and the touch button) flies the explorer. */
  devFly: { get(): boolean; set(v: boolean): void };
  character: { eyeType: 'dot' | 'round'; faceValues: number[] };
  colliders: { enabled: boolean };
  /** Camera close-up on the face, and the explorer holds still. */
  faceCam(on: boolean): void;
  mobs: { settings: { enabled: boolean; density: number; freeze: boolean; stelkHerds: number; beastHerds: number }; species: readonly { name: string; herds?: number }[] };
  bikes: { settings: { enabled: boolean } };
  /** Drop a flock of `species` in front of the explorer. */
  spawnFlock(species: string): void;
  /** Crow shape, 0 sleek .. 1 round. */
  crowPlump: { get(): number; set(v: number): void };
  towers: { settings: { links: boolean; map: boolean; index: number }; count(): number; go(i: number): void; overview(): void; light(which: 'all' | 'none' | 'break' | number): void };
  /** Phase 2's journey: its steps, jump to one. */
  journey: { stages: string[]; jump(stage: string): void };
}

export class DebugUI {
  gui: GUI;
  private fpsEl: HTMLDivElement;
  private frames = 0;
  private acc = 0;
  private worst = 0;
  private info = '';

  constructor(h: DebugHooks) {
    this.gui = new GUI({ title: 'World' });
    this.gui.close();
    this.gui.domElement.style.setProperty('--width', '270px');
    const world = { seed: h.getSeed(), regenerate: () => h.setSeed(world.seed), random: () => { h.randomSeed(); world.seed = h.getSeed(); this.gui.controllersRecursive().forEach((c) => c.updateDisplay()); } };
    const fw = this.gui.addFolder('Seed');
    fw.add(world, 'seed').name('seed').onFinishChange((v: string) => h.setSeed(v));
    fw.add(world, 'regenerate');
    fw.add(world, 'random').name('random seed');

    const ft = this.gui.addFolder('Time of day');
    ft.add(h.env, 'hour', 0, 24, 0.01).name('hour').listen();
    ft.add(h.env, 'dayMinutes', 1, 60, 1).name('minutes / day');
    ft.add(h.env, 'paused');
    const pal = { palette: 'auto' };
    const opts: Record<string, string> = { 'Auto (time of day)': 'auto' };
    for (const [k, v] of Object.entries(SKY_PRESETS)) opts[v.name] = k;
    ft.add(pal, 'palette', opts).name('palette').onChange((v: string) => (h.env.paletteOverride = v === 'auto' ? null : v));

    const fs = this.gui.addFolder('Music');
    fs.add(h.ambience.gains, 'music', 0, 1, 0.01).name('volume');
    fs.close();

    const fp = this.gui.addFolder('Palette');
    fp.add(postSettings, 'gradeScale', 0, 1.6, 0.01).name('mono grade');
    const bandCtl = { band1: U.uBand1.value, band2: U.uBand2.value };
    fp.add(bandCtl, 'band1', -0.5, 0.9, 0.01).name('light band').onChange((v: number) => (U.uBand1.value = v));
    fp.add(bandCtl, 'band2', -0.8, 0.5, 0.01).name('shade band').onChange((v: number) => (U.uBand2.value = v));
    const colors = {
      meadow: '#' + TERRAIN_U.cMeadow.value.getHexString(),
      forest: '#' + TERRAIN_U.cForest.value.getHexString(),
      heath: '#' + TERRAIN_U.cHeath.value.getHexString(),
      rock: '#' + TERRAIN_U.cRock.value.getHexString(),
      foliage: '#' + KIND_COLORS[0].getHexString(),
      cabin: '#' + KIND_COLORS[7].getHexString(),
    };
    fp.addColor(colors, 'meadow').onChange((v: string) => TERRAIN_U.cMeadow.value.set(v));
    fp.addColor(colors, 'forest').onChange((v: string) => TERRAIN_U.cForest.value.set(v));
    fp.addColor(colors, 'heath').onChange((v: string) => TERRAIN_U.cHeath.value.set(v));
    fp.addColor(colors, 'rock').onChange((v: string) => TERRAIN_U.cRock.value.set(v));
    fp.addColor(colors, 'foliage').onChange((v: string) => KIND_COLORS[0].set(v));
    fp.addColor(colors, 'cabin').onChange((v: string) => KIND_COLORS[7].set(v));
    fp.close();

    const ff = this.gui.addFolder('Fog');
    ff.add(postSettings, 'fogDensity', 0, 0.0015, 0.00001).name('density');
    ff.add(postSettings, 'fogBands', 0, 12, 1).name('bands (0 = smooth)');
    ff.add(postSettings, 'layeredFog').name('fog per layer');
    ff.add(postSettings, 'fogHeight', 0, 1, 0.01).name('valley mist');
    ff.add(postSettings, 'fogFalloff', 5, 200, 1).name('mist height x4');
    ff.add(postSettings, 'fogMax', 0, 1, 0.01).name('max');
    ff.add(postSettings, 'fogStart', 0, 400, 1).name('start');

    const fo = this.gui.addFolder('Outline');
    fo.add(postSettings, 'outline').name('enabled');
    fo.add(postSettings, 'outlineWidth', 0.5, 3, 0.05).name('width (px)');
    fo.add(postSettings, 'depthThreshold', 0.005, 0.3, 0.001).name('depth sensitivity');
    fo.add(postSettings, 'normalThreshold', 0.05, 1.5, 0.01).name('crease sensitivity');
    fo.add(postSettings, 'outlineFadeStart', 0, 2000, 10).name('fade start');
    fo.add(postSettings, 'outlineFadeEnd', 100, 8000, 10).name('fade end');

    const fr = this.gui.addFolder('Render');
    fr.add(postSettings, 'bloom', 0, 3, 0.01).name('window bloom');
    fr.add(postSettings, 'renderScale', 0.5, 2, 0.05).name('resolution scale');
    fr.add(postSettings, 'adaptive').name('adaptive resolution');
    fr.add(postSettings, 'fxaa').name('FXAA');
    fr.add(h.terrain.settings, 'splitFactor', 1.2, 4, 0.05).name('terrain detail');
    fr.add(h.terrain.settings, 'showProps').name('props');
    fr.add(h.terrain.settings, 'showGround').name('ground');
    fr.add(h.colliders, 'enabled').name('prop collision');
    const strokes = { on: TERRAIN_U.uStrokes.value > 0.5 };
    fr.add(strokes, 'on').name('ground strokes').onChange((v: boolean) => (TERRAIN_U.uStrokes.value = v ? 1 : 0));
    fr.add(groundShadowSettings, 'enabled').name('cast shadows');
    fr.add(groundShadowSettings, 'strength', 0, 1, 0.01).name('shadow strength');
    fr.add(CASTER_U.uShadowReach, 'value', 0.3, 4, 0.05).name('shadow reach');
    fr.close();

    const fc = this.gui.addFolder('Creatures');
    fc.add(h.mobs.settings, 'enabled').name('creatures');
    fc.add(h.mobs.settings, 'density', 0, 4, 0.05).name('wild density');
    fc.add(h.mobs.settings, 'freeze').name('freeze brains');
    fc.add({ w: () => h.spawnFlock('floof') }, 'w').name('spawn floofs here');
    fc.add({ c: () => h.spawnFlock('crow') }, 'c').name('spawn crows here');
    fc.add({ e: () => h.spawnFlock('stelk') }, 'e').name('spawn stelk here');
    fc.add(h.mobs.settings, 'stelkHerds', 0, 6, 1).name('stelk herds');
    // The wilder creatures (beast.ts): each lives in its own biome.
    fc.add(h.mobs.settings, 'beastHerds', 0, 4, 0.5).name('wild herds (new kinds)');
    const fb = fc.addFolder('Spawn the wilder creatures');
    for (const sp of h.mobs.species) if (sp.herds !== undefined) fb.add({ s: () => h.spawnFlock(sp.name) }, 's').name(sp.name);
    fb.close();
    const plump = { plump: h.crowPlump.get() };
    fc.add(plump, 'plump', 0, 1, 0.01).name('crow roundness').onFinishChange((v: number) => h.crowPlump.set(v));
    fc.add(h.bikes.settings, 'enabled').name('bicycles');
    fc.close();

    const fw2 = this.gui.addFolder('Beacon towers');
    fw2.add(h.towers.settings, 'links').name('sight lines (L)').listen();
    fw2.add(h.towers.settings, 'map').name('network map (M)').listen();
    fw2.add(h.towers.settings, 'index', 0, 200, 1).name('tower #').onChange((v: number) => (h.towers.settings.index = Math.min(v, h.towers.count() - 1))).listen();
    fw2.add({ go: () => h.towers.go(h.towers.settings.index) }, 'go').name('go to tower # (0 = home)');
    fw2.add({ o: () => h.towers.overview() }, 'o').name('view from above');
    fw2.add({ l: () => h.towers.light(h.towers.settings.index) }, 'l').name('light tower #');
    fw2.add({ l: () => h.towers.light('break') }, 'l').name('break the nearest lock');
    fw2.add({ l: () => h.towers.light('all') }, 'l').name('light all towers');
    fw2.add({ l: () => h.towers.light('none') }, 'l').name('unlight all towers');
    const fj = this.gui.addFolder('Journey (phase 2)');
    const js = { stage: 'gift' };
    fj.add(js, 'stage', h.journey.stages).name('step');
    fj.add({ j: () => h.journey.jump(js.stage) }, 'j').name('jump to step');

    const fm = this.gui.addFolder('Player');
    const mode = { mode: h.modeName() };
    fm.add(mode, 'mode', ['walk', 'glide', 'fly', 'swim', 'ride', 'bike']).name('mode').onChange((v: string) => h.setMode(v)).listen();
    setInterval(() => (mode.mode = h.modeName()), 250);
    fm.add({ fly: h.devFly.get() }, 'fly').name('F flies (dev)').onChange((v: boolean) => h.devFly.set(v));
    fm.add(h.character, 'eyeType', ['dot', 'round']).name('eyes').listen();

    // Round-eye face tuning. Values persist in this browser (localStorage);
    // "copy values" puts them on the clipboard to paste back into
    // FACE_PARAMS as the new defaults.
    const faceF = fm.addFolder('Face (round eyes)');
    const fv = h.character.faceValues;
    const face: Record<string, number> = {};
    let saved: Record<string, number> = {};
    try { saved = JSON.parse(localStorage.getItem('ow.face.v2') ?? '{}'); } catch { /* storage unavailable */ }
    const save = () => { try { localStorage.setItem('ow.face.v2', JSON.stringify(face)); } catch { /* storage unavailable */ } };
    const cam = { 'face cam': false };
    faceF.add(cam, 'face cam').onChange((v: boolean) => {
      if (v) h.character.eyeType = 'round';
      h.faceCam(v);
    });
    FACE_PARAMS.forEach((p, i) => {
      face[p.key] = typeof saved[p.key] === 'number' ? saved[p.key] : p.value;
      fv[i] = face[p.key];
      faceF.add(face, p.key, p.min, p.max, p.step).onChange((v: number) => { fv[i] = v; save(); });
    });
    faceF.add({ copy: () => {
      const txt = JSON.stringify(face, null, 2);
      console.log(txt);
      navigator.clipboard?.writeText(txt).catch(() => undefined);
    } }, 'copy').name('copy values');
    faceF.add({ reset: () => {
      FACE_PARAMS.forEach((p, i) => { face[p.key] = p.value; fv[i] = p.value; });
      save();
      faceF.controllersRecursive().forEach((c) => c.updateDisplay());
    } }, 'reset').name('reset face');
    faceF.close();

    // Back to the values each control had at startup. Seed, clock and movement
    // mode are world/game state, not settings, so they're left alone.
    const keep = new Set(['seed', 'hour', 'mode', 'fly']);
    this.gui.add({ reset: () => this.gui.controllersRecursive()
      .filter((c) => !keep.has(c.property) && typeof c.initialValue !== 'function')
      .forEach((c) => c.reset()) }, 'reset').name('reset to defaults');

    this.fpsEl = document.createElement('div');
    this.fpsEl.id = 'fps';
    document.body.appendChild(this.fpsEl);
  }

  toggle() {
    const hidden = this.gui._hidden;
    this.gui.show(hidden);
    this.fpsEl.style.display = hidden ? '' : 'none';
    const help = document.getElementById('help');
    if (help) help.style.display = hidden ? '' : 'none';
  }

  get shown() { return !this.gui._hidden; }

  hide() {
    this.gui.hide();
    this.fpsEl.style.display = 'none';
  }

  tick(dt: number, extra: () => string) {
    this.frames++;
    this.acc += dt;
    this.worst = Math.max(this.worst, dt);
    if (this.acc >= 0.5) {
      const fps = this.frames / this.acc;
      this.info = `${fps.toFixed(0)} fps · ${(1000 * this.acc / this.frames).toFixed(1)} ms · worst ${(this.worst * 1000).toFixed(0)} ms\n${extra()}`;
      this.fpsEl.textContent = this.info;
      this.frames = 0;
      this.acc = 0;
      this.worst = 0;
    }
  }
}
