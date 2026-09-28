import GUI from 'lil-gui';
import { postSettings } from '../gfx/post';
import { SKY_PRESETS } from '../gfx/palette';
import { KIND_COLORS, TERRAIN_U, U } from '../gfx/materials';
import type { Environment } from '../gfx/environment';
import type { Terrain } from '../world/terrain';

export interface DebugHooks {
  env: Environment;
  terrain: Terrain;
  getSeed(): string;
  setSeed(s: string): void;
  randomSeed(): void;
  modeName(): string;
  setMode(m: string): void;
  position(): { x: number; y: number; z: number };
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
    fr.add(postSettings, 'fxaa').name('FXAA');
    fr.add(h.terrain.settings, 'splitFactor', 1.2, 4, 0.05).name('terrain detail');
    fr.add(h.terrain.settings, 'showProps').name('props');
    fr.add(h.terrain.settings, 'showGround').name('ground');
    const strokes = { on: TERRAIN_U.uStrokes.value > 0.5 };
    fr.add(strokes, 'on').name('ground strokes').onChange((v: boolean) => (TERRAIN_U.uStrokes.value = v ? 1 : 0));
    fr.close();

    const fm = this.gui.addFolder('Player');
    const mode = { mode: h.modeName() };
    fm.add(mode, 'mode', ['walk', 'fly', 'swim']).name('mode (F = fly)').onChange((v: string) => h.setMode(v)).listen();
    setInterval(() => (mode.mode = h.modeName()), 250);

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
