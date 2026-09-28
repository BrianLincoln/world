import * as THREE from 'three';

// Colour comes from palettes, never textures. Two layers:
//  - BiomeColors: base material colours per biome (pre-grade, "daylight").
//  - SkyPalette: per time-of-day keyframe; sky, fog, light bands and a
//    monochrome "grade" that pulls every surface into one hue family.
// Each keyframe is modelled on one of the /inspo references.

export interface SkyPalette {
  name: string;
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  sunGlow: string;
  fog: string;
  light: string;
  mid: string;
  shade: string;
  tint: string;
  tintAmt: number;
  /** Wash toward the fog colour: high-key, low-contrast storybook look. */
  lift: number;
  cloud: string;
  cloudShade: string;
  cloudRim: string;
  outline: string;
  sun: string;
  stars: number;
  night: number;
  water: string;
}

export const SKY_PRESETS: Record<string, SkyPalette> = {
  // inspo/1 — dusty rose morning, near-monochrome mauve
  rose: {
    name: 'Rose dawn',
    skyTop: '#edcfb6', skyMid: '#f2dcc6', skyHorizon: '#f6e6d4', sunGlow: '#fbeedd',
    fog: '#efd6c3', light: '#fff8f0', mid: '#ecd6d0', shade: '#cbaeb4',
    tint: '#c8918a', tintAmt: 0.62, lift: 0.24,
    cloud: '#fdf8f2', cloudShade: '#f0dcd2', cloudRim: '#fff9f2', outline: '#5c3a3e',
    sun: '#fff6ea', stars: 0, night: 0, water: '#b6a7b0',
  },
  // inspo/3 — golden valley, cream sky, olive meadows
  golden: {
    name: 'Golden meadow',
    skyTop: '#ecd6a8', skyMid: '#f2e2bc', skyHorizon: '#f7ecd1', sunGlow: '#fcf3de',
    fog: '#f1e2c0', light: '#fff8e8', mid: '#ecdcbe', shade: '#c6b09c',
    tint: '#c9ab72', tintAmt: 0.46, lift: 0.07,
    cloud: '#fffaf0', cloudShade: '#f3e6cc', cloudRim: '#fffbf2', outline: '#4c3526',
    sun: '#fffaf0', stars: 0, night: 0, water: '#a9b3a6',
  },
  // inspo/6 — midday forest: olive/ochre, warm and a bit deeper
  olive: {
    name: 'Olive forest',
    skyTop: '#e6d9b8', skyMid: '#eee3c7', skyHorizon: '#f3ead6', sunGlow: '#f8f0e0',
    fog: '#e7dbbd', light: '#fff8e6', mid: '#e8d8b8', shade: '#bca894',
    tint: '#ad9a66', tintAmt: 0.4, lift: 0.05,
    cloud: '#fffbf2', cloudShade: '#efe4cd', cloudRim: '#fffcf4', outline: '#402c20',
    sun: '#fffbf0', stars: 0, night: 0, water: '#9fb0a8',
  },
  // inspo/2 — coral dusk with purple clouds
  coral: {
    name: 'Coral dusk',
    skyTop: '#76597f', skyMid: '#d98583', skyHorizon: '#f5b08e', sunGlow: '#fbd0a8',
    fog: '#eca58e', light: '#fff0e0', mid: '#ecc2b8', shade: '#bc92a0',
    tint: '#d88c7c', tintAmt: 0.54, lift: 0.2,
    cloud: '#86648a', cloudShade: '#6e5078', cloudRim: '#f6c7a6', outline: '#4a2a3a',
    sun: '#fff0d8', stars: 0.15, night: 0.15, water: '#8c86a6',
  },
  // between dusk and night
  twilight: {
    name: 'Twilight',
    skyTop: '#343d6a', skyMid: '#6a6690', skyHorizon: '#b08ca4', sunGlow: '#c89aa6',
    fog: '#8a7ea0', light: '#d0c8e6', mid: '#aaa4cc', shade: '#8480ac',
    tint: '#8a82b4', tintAmt: 0.72, lift: 0.06,
    cloud: '#5e5a86', cloudShade: '#4c4a74', cloudRim: '#c6a2b4', outline: '#241c38',
    sun: '#ffe8d8', stars: 0.55, night: 0.7, water: '#5c6490',
  },
  // inspo/4 + inspo/7 — deep blue night, warm windows
  night: {
    name: 'Blue night',
    skyTop: '#16213f', skyMid: '#22325a', skyHorizon: '#34497a', sunGlow: '#3e5588',
    fog: '#33466f', light: '#8d9dd2', mid: '#6d7cb2', shade: '#4d5989',
    tint: '#5d74b0', tintAmt: 0.86, lift: 0.0,
    cloud: '#2c3a62', cloudShade: '#243256', cloudRim: '#50679a', outline: '#141630',
    sun: '#e8eeff', stars: 1, night: 1, water: '#2a3a64',
  },
};

/** Keyframes over a 24h day. */
const KEYS: [number, string][] = [
  [0, 'night'],
  [4.6, 'night'],
  [5.8, 'twilight'],
  [7.0, 'rose'],
  [9.5, 'golden'],
  [12.5, 'olive'],
  [16.0, 'golden'],
  [18.2, 'coral'],
  [19.6, 'twilight'],
  [20.8, 'night'],
  [24, 'night'],
];

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

function blend(a: SkyPalette, b: SkyPalette, t: number, out: Record<string, THREE.Color | number>) {
  for (const k of Object.keys(a) as (keyof SkyPalette)[]) {
    if (k === 'name') continue;
    const va = a[k];
    const vb = b[k];
    if (typeof va === 'number' && typeof vb === 'number') {
      out[k] = va + (vb - va) * t;
    } else {
      tmpA.set(va as string);
      tmpB.set(vb as string);
      const c = (out[k] as THREE.Color) ?? new THREE.Color();
      c.copy(tmpA).lerp(tmpB, t);
      out[k] = c;
    }
  }
}

export type SkyState = {
  skyTop: THREE.Color; skyMid: THREE.Color; skyHorizon: THREE.Color; sunGlow: THREE.Color;
  fog: THREE.Color; light: THREE.Color; mid: THREE.Color; shade: THREE.Color;
  tint: THREE.Color; tintAmt: number; lift: number;
  cloud: THREE.Color; cloudShade: THREE.Color; cloudRim: THREE.Color; outline: THREE.Color;
  sun: THREE.Color; stars: number; night: number; water: THREE.Color;
};

export function resolveSky(hour: number, override: string | null, out: Partial<SkyState>): SkyState {
  const o = out as unknown as Record<string, THREE.Color | number>;
  if (override && SKY_PRESETS[override]) {
    blend(SKY_PRESETS[override], SKY_PRESETS[override], 0, o);
    return out as SkyState;
  }
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [t0, k0] = KEYS[i];
    const [t1, k1] = KEYS[i + 1];
    if (h >= t0 && h <= t1) {
      const t = t1 > t0 ? (h - t0) / (t1 - t0) : 0;
      const e = t * t * (3 - 2 * t);
      blend(SKY_PRESETS[k0], SKY_PRESETS[k1], e, o);
      return out as SkyState;
    }
  }
  blend(SKY_PRESETS.night, SKY_PRESETS.night, 0, o);
  return out as SkyState;
}

// Base colours (display-referred; colour management is disabled so hex is
// exactly what is written). The grade pulls these toward each keyframe's hue.
export const BIOME = {
  meadow: '#c6ae6c',   // open golden grass
  meadowDark: '#b09860',
  forestFloor: '#8e7d4e',
  heath: '#a08a7a',     // highland moor, mauve-brown
  rock: '#b8a39c',      // pinkish granite
  rockDark: '#8f7c78',
  snow: '#f6f1ea',
  sand: '#dcc59c',
  path: '#d8c197',
  seabed: '#8a8878',
  foliage: '#5d5a3c',
  foliageDark: '#4a4630',
  trunk: '#7a5244',
  bush: '#6c6a42',
  tuft: '#7a6a3a',
  flower: '#fbf6ec',
  flowerCore: '#e8c860',
  waterShallow: '#a4b6b4',
  foam: '#f2efe6',
  cabinWall: '#a9543f',  // falu red, like the cabin in inspo/3
  cabinWall2: '#8a6a52',
  cabinRoof: '#5c4040',
  cabinTrim: '#efe4d2',
  cabinWindow: '#3b3440',
  windowGlow: '#ffd27a',
  cabinDoor: '#5a3c30',
  stone: '#9d918a',
};
