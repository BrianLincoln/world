import { HARVEST_TEX } from '../world/harvest';
import { PRINT_U } from '../world/prints';
import * as THREE from 'three';
import { BIOME } from './palette';
import {
  CASTER_FRAG, CASTER_VERT, CLOUD_FRAG, CLOUD_VERT, CREATURE_FRAG, CREATURE_VERT, DUNGEON_FRAG, DUNGEON_GLOWS, DUNGEON_VERT, LANTERN_FRAG, LANTERN_VERT, FACE_FRAG, FACE_PARAMS, FACE_VERT, FS_VERT, GIANT_FRAG, GIANT_VERT, POOL_FRAG, PORTAL_FRAG, PROP_FRAG, PROP_VERT, SKY_FRAG, SOLID_FRAG, SOLID_VERT,
  TERRAIN_FRAG, TERRAIN_VERT, WATER_FRAG, WATER_VERT,
} from './shaders';

// One shared uniform set drives every scene material, so the day/night cycle
// and debug panel update a single place.

function makeNoiseTexture(): THREE.DataTexture {
  // Tileable value-noise fbm, 4 independent channels.
  const N = 256;
  const data = new Uint8Array(N * N * 4);
  const lattice = (period: number, salt: number) => {
    const g = new Float32Array(period * period);
    let s = 1234567 + salt * 7919;
    for (let i = 0; i < g.length; i++) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      g[i] = (s >>> 8) / 16777216;
    }
    return g;
  };
  const chans: number[][] = [];
  for (let c = 0; c < 4; c++) {
    const octs = [8, 16, 32, 64].map((p, o) => ({ p, g: lattice(p, c * 10 + o), a: 1 / (1 << o) }));
    const out = new Array(N * N).fill(0);
    for (const { p, g, a } of octs) {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const fx = (x / N) * p;
          const fy = (y / N) * p;
          const ix = Math.floor(fx);
          const iy = Math.floor(fy);
          let u = fx - ix;
          let v = fy - iy;
          u = u * u * (3 - 2 * u);
          v = v * v * (3 - 2 * v);
          const i0 = ix % p, i1 = (ix + 1) % p, j0 = iy % p, j1 = (iy + 1) % p;
          const a00 = g[j0 * p + i0], a10 = g[j0 * p + i1], a01 = g[j1 * p + i0], a11 = g[j1 * p + i1];
          out[y * N + x] += a * ((a00 * (1 - u) + a10 * u) * (1 - v) + (a01 * (1 - u) + a11 * u) * v);
        }
      }
    }
    chans.push(out.map((v) => v / 1.875));
  }
  for (let i = 0; i < N * N; i++) {
    for (let c = 0; c < 4; c++) data[i * 4 + c] = Math.max(0, Math.min(255, Math.round(chans[c][i] * 255)));
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

const col = (hex: string) => new THREE.Color(hex);

export const U = {
  uLightDir: { value: new THREE.Vector3(0.4, 0.6, 0.3).normalize() },
  uLightCol: { value: new THREE.Color(1, 1, 1) },
  uMidCol: { value: new THREE.Color(0.85, 0.8, 0.8) },
  uShadeCol: { value: new THREE.Color(0.65, 0.6, 0.66) },
  uBand1: { value: 0.22 },
  uBand2: { value: -0.12 },
  uTime: { value: 0 },
  uNight: { value: 0 },
  uNoise: { value: null as unknown as THREE.Texture },
  uFocus: { value: new THREE.Vector3() },
};

export const TERRAIN_U = {
  cMeadow: { value: col(BIOME.meadow) },
  cMeadowDark: { value: col(BIOME.meadowDark) },
  cForest: { value: col(BIOME.forestFloor) },
  cBog: { value: col(BIOME.bog) },
  cMud: { value: col(BIOME.mud) },
  cGlimmer: { value: col(BIOME.glimmerMoss) },
  cHeath: { value: col(BIOME.heath) },
  cRock: { value: col(BIOME.rock) },
  cRockDark: { value: col(BIOME.rockDark) },
  cSnow: { value: col(BIOME.snow) },
  cSand: { value: col(BIOME.sand) },
  cPath: { value: col(BIOME.path) },
  cSeabed: { value: col(BIOME.seabed) },
  cStroke: { value: col(BIOME.meadowDark).multiplyScalar(0.72) },
  uSnowLine: { value: 235 },
  uStrokes: { value: 1 },
  uPlayerFeet: { value: new THREE.Vector3(0, -1e4, 0) },
  uPlayerLift: { value: 0 },
  uMobShadow: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
  uGroundShadow: { value: null as THREE.Texture | null },
  uShadowRect: { value: new THREE.Vector4(0, 0, 1, 0) },
  uShadowFade: { value: new THREE.Vector2(55, 85) },
  cPrintWarm: { value: col('#f2a784') },
  cPrintEarth: { value: col('#a08268') },
  ...PRINT_U,
};

export const WATER_U = {
  cDeep: { value: col('#8fa3ad') },
  cShallow: { value: col(BIOME.waterShallow) },
  cFoam: { value: col(BIOME.foam) },
  cReflect: { value: col('#f4e6d4') },
};

export const SKY_U = {
  uInvProj: { value: new THREE.Matrix4() },
  uCamWorld: { value: new THREE.Matrix4() },
  uSkyTop: { value: new THREE.Color() },
  uSkyMid: { value: new THREE.Color() },
  uSkyHorizon: { value: new THREE.Color() },
  uSunGlow: { value: new THREE.Color() },
  uSunCol: { value: new THREE.Color() },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
  uStars: { value: 0 },
  uSkyBands: { value: 7 },
  uCloud: { value: new THREE.Color() },
  uCloudShade: { value: new THREE.Color() },
  uCloudRim: { value: new THREE.Color() },
  uCloudLine: { value: new THREE.Color() },
  uCloudDist: { value: 6000 },
  uCloudDrift: { value: 0 },
};

export function initMaterials() {
  U.uNoise.value = makeNoiseTexture();
}

function mat(vert: string, frag: string, uniforms: Record<string, THREE.IUniform>, extra: Partial<THREE.ShaderMaterialParameters> = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: vert,
    fragmentShader: frag,
    uniforms,
    ...extra,
  });
}

export function makeTerrainMaterial() {
  return mat(TERRAIN_VERT, TERRAIN_FRAG, { ...U, ...TERRAIN_U, uIsProp: { value: 0 } });
}

export function makeWaterMaterial() {
  return mat(WATER_VERT, WATER_FRAG, { ...U, ...WATER_U, uIsProp: { value: 0 } });
}

// Kind colours shared by all props (see PROP_FRAG for the index table).
export const KIND_COLORS: THREE.Color[] = [
  col(BIOME.foliage), col(BIOME.trunk), col(BIOME.rock), col(BIOME.bush),
  col(BIOME.tuft), col(BIOME.flower), col(BIOME.flowerCore), col(BIOME.cabinWall),
  col(BIOME.cabinRoof), col(BIOME.cabinTrim), col(BIOME.cabinWindow), col(BIOME.cabinDoor),
  col(BIOME.stone), col(BIOME.cabinWall2), col(BIOME.snow), col(BIOME.harebell),
  col(BIOME.buttercup), col(BIOME.cutWood), col(BIOME.steel), col(BIOME.soot), col(BIOME.ember), col(BIOME.cabinRoof),
  col(BIOME.cabinBare), col(BIOME.moss), col(BIOME.cabinFaded),
  col(BIOME.cattail), col(BIOME.glowcap), col(BIOME.stalk), col(BIOME.reed),
];
export const PROP_U = {
  uKind: { value: KIND_COLORS },
  uGlow: { value: col(BIOME.windowGlow) },
};

/** Harvestable world props: which grid and which flag channel (see world/harvest.ts). */
export interface HarvestOpt { grid: number; chan: 0 | 1 }
function harvestU(h?: HarvestOpt, prints = false) {
  return { uHarvest: { value: HARVEST_TEX }, uHarvestGrid: { value: h?.grid ?? 0 }, uHarvestChan: { value: h?.chan ?? 0 }, uPrintHide: { value: prints ? 1 : 0 }, ...PRINT_U };
}

export function makePropMaterial(opts: { bend?: number; wind?: number; heightRef?: number; toneVar?: number; doubleSide?: boolean; flipBack?: boolean; cutaway?: 'near' | 'occluders'; harvest?: HarvestOpt; nearCut?: number;
  /** A world prop: gone where the giant has trodden (see world/prints.ts). */
  prints?: boolean }) {
  return mat(PROP_VERT, PROP_FRAG, {
    ...U,
    ...PROP_U,
    uIsProp: { value: 1 },
    uBend: { value: opts.bend ?? 0 },
    uWind: { value: opts.wind ?? 0 },
    uHeightRef: { value: opts.heightRef ?? 1 },
    uToneVar: { value: opts.toneVar ?? 0.15 },
    uFlip: { value: opts.flipBack ? 1 : 0 },
    // 1 = discard near the camera; 2 = also hide whole instances blocking the player.
    uCutaway: { value: opts.cutaway === 'occluders' ? 2 : opts.cutaway === 'near' ? 1 : 0 },
    ...harvestU(opts.harvest, opts.prints),
    // Near-plane cut distance (m): a story tree you're chopping cuts a wider hole round the camera.
    uNearCut: { value: opts.nearCut ?? 1.5 },
    uGlint: { value: 0 },
    uWin: { value: -1 },
    uFire: { value: 0 },
    uWear: { value: 0 },
  }, { side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide });
}

export const CASTER_U = {
  /** Longest shadow, in metres of run per metre of height. */
  uShadowReach: { value: 1.5 },
};

/** Flattens a prop kind into the ground shadow mask (see CASTER_VERT). */
export function makeCasterMaterial(opts: { bend?: number; wind?: number; heightRef?: number; harvest?: HarvestOpt; prints?: boolean }) {
  return mat(CASTER_VERT, CASTER_FRAG, {
    ...harvestU(opts.harvest, opts.prints),
    uTime: U.uTime,
    uLightDir: U.uLightDir,
    uShadowReach: CASTER_U.uShadowReach,
    uBend: { value: opts.bend ?? 0 },
    uWind: { value: opts.wind ?? 0 },
    uHeightRef: { value: opts.heightRef ?? 1 },
  }, { side: THREE.DoubleSide, depthTest: false, depthWrite: false });
}


export function makeSkyMaterial() {
  return mat(FS_VERT, SKY_FRAG, { ...U, ...SKY_U }, { depthTest: false, depthWrite: false });
}

export function makeCloudMaterial() {
  return mat(CLOUD_VERT, CLOUD_FRAG, { ...U, ...SKY_U }, { depthTest: false, depthWrite: false, side: THREE.DoubleSide });
}

/** `keep` = how much of its own colour survives the monochrome grade (0..1). */
export function makeSolidMaterial(hex: string, emissive = 0, opts: { keep?: number; doubleSide?: boolean; flat?: number } = {}) {
  return mat(SOLID_VERT, SOLID_FRAG, {
    ...U, uIsProp: { value: 1 }, uColor: { value: col(hex) }, uEmissive: { value: emissive }, uKeep: { value: opts.keep ?? 0.7 }, uFlat: { value: opts.flat ?? 0 }, uGlint: { value: 0 },
  }, { side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide });
}

export interface CreatureLook {
  keep?: number;
  eyeOrigin?: THREE.Vector3;
  eyePos?: [number, number];
  eyeSize?: [number, number];
  pupil?: [number, number];
  lookRange?: [number, number];
  eyeTilt?: number;
  mouthOrigin?: THREE.Vector3;
  mouth?: [number, number, number];
  mouthW?: [number, number, number];
  blush?: [number, number, number, number];
  blushCol?: string;
  /** Glossy eyes: glint size (0 = ordinary eyes with whites), and the iris colour aEye.w mixes in. */
  gloss?: number;
  iris?: string;
  doubleSide?: boolean;
  /** 0..1: soften part-to-part creases in the outline pass (see uSoftCrease). */
  softCrease?: number;
}

/** Instanced creature parts: vertex colours plus painted eyes/mouth (see CREATURE_FRAG). */
export function makeCreatureMaterial(o: CreatureLook = {}) {
  return mat(CREATURE_VERT, CREATURE_FRAG, {
    ...U,
    uIsProp: { value: 2 },
    uKeep: { value: o.keep ?? 0.55 },
    uInk: { value: col('#2e1f28') },
    uWhite: { value: col('#fffdf8') },
    uEyeOrigin: { value: o.eyeOrigin ?? new THREE.Vector3() },
    uEyePos: { value: new THREE.Vector2(...(o.eyePos ?? [0.4, 0.2])) },
    uEyeSize: { value: new THREE.Vector2(...(o.eyeSize ?? [0.2, 0.25])) },
    uPupil: { value: new THREE.Vector2(...(o.pupil ?? [0.06, 0.09])) },
    uLookRange: { value: new THREE.Vector2(...(o.lookRange ?? [0.12, 0.1])) },
    uEyeTilt: { value: o.eyeTilt ?? 0 },
    uBrow: { value: 0 },
    uSad: { value: new THREE.Vector2() },
    uMouthOrigin: { value: o.mouthOrigin ?? new THREE.Vector3() },
    uMouth: { value: new THREE.Vector3(...(o.mouth ?? [-0.2, 0.2, 1])) },
    uMouthW: { value: new THREE.Vector3(...(o.mouthW ?? [0, 0, 0])) },
    uBlush: { value: new THREE.Vector4(...(o.blush ?? [0, 0, 0, 0])) },
    uBlushCol: { value: col(o.blushCol ?? '#ef9c93') },
    uGloss: { value: o.gloss ?? 0 },
    uIris: { value: col(o.iris ?? '#e0b84a') },
    uGlow: PROP_U.uGlow,
    uEmber: { value: 0 },
    uSoftCrease: { value: o.softCrease ?? 0 },
  }, { side: o.doubleSide ? THREE.DoubleSide : THREE.FrontSide });
}

/**
 * The giant: cold stone in the spirit's ash blue, turf and frosted conifers
 * on its back, snow on its head. One material for its boulders and its trees.
 */
/** (`inside`: the hollow of its mouth, the head's shape drawn from within.) */
export function makeGiantMaterial(inside = false) {
  return mat(GIANT_VERT, GIANT_FRAG, {
    ...U,
    uIsProp: { value: 3 },
    cStone: { value: col('#9db3d6') },
    cTurf: { value: col('#93a084') },
    cMoss: { value: col('#7f9079') },
    cSnow: { value: col(BIOME.snow) },
    cFoliage: { value: col('#5b6652') },
    cTrunk: { value: col(BIOME.trunk) },
    cInk: { value: col('#2c2638') },
    uKeep: { value: 0.72 },
    uLid: { value: 0.45 },
    uGrin: { value: 0 },
    uMouth: { value: 0 },
    uInside: { value: inside ? 1 : 0 },
    uGlowAt: { value: new THREE.Vector4() },
    uHeadInv: { value: new THREE.Matrix4() },
    cWarm: { value: col('#f08a3c') },
  }, inside ? { side: THREE.BackSide } : {});
}

/** The explorer's head: skin with painted eyes/brows/nose/mouth (see FACE_FRAG). */
export function makeFaceMaterial(skin: string, ink: string, white: string, brow: string) {
  return mat(FACE_VERT, FACE_FRAG, {
    ...U, uIsProp: { value: 1 }, uColor: { value: col(skin) }, uInk: { value: col(ink) }, uWhite: { value: col(white) },
    uBrow: { value: col(brow) }, uEyeType: { value: 0 }, uBlink: { value: 1 },
    uFace: { value: FACE_PARAMS.map((p) => p.value as number) },
    uLook: { value: new THREE.Vector2() },
    uMood: { value: new THREE.Vector4() },
  });
}

/**
 * The dungeon's own uniforms: its pools of light, where it is, and its rock.
 * Shared by the shell, its props, the portal and the pool.
 */
export const DUNGEON_U = {
  uGlows: { value: Array.from({ length: DUNGEON_GLOWS }, () => new THREE.Vector4()) },
  uGlowN: { value: 0 },
  uOrigin: { value: new THREE.Vector3() },
  uFeet: { value: new THREE.Vector3(0, -1e4, 0) },
  uMark: { value: 2.4 },
  uMarkOn: { value: 0 },
  // (The floor is a pale blue slate, the walls a darker violet: in the dark they were one tone, and
  // a ledge's face, which is wall, was the floor going on.)
  cFloor: { value: col('#b4c0ea') },
  cFloor2: { value: col('#c6d0f2') },
  cWallA: { value: col('#685e90') },
  cWallB: { value: col('#5b5183') },
  cWallC: { value: col('#766c9e') },
  cCeil: { value: col('#4f4674') },
  cMark: { value: col('#d9d2f2') },
  cMarkDark: { value: col('#2a2140') },
  cWarm: { value: col('#ffd9a8') },
  cLit: { value: col('#ffffff') },
  cMid: { value: col('#ffffff') },
  cShade: { value: col('#ffffff') },
};

/** The cave itself (`shell`), or the rock standing in it (vertex colours in aCol). */
export function makeDungeonMaterial(shell: boolean) {
  return mat(DUNGEON_VERT, DUNGEON_FRAG, { ...U, ...DUNGEON_U, uIsProp: { value: shell ? 0 : 1 }, uShell: { value: shell ? 1 : 0 }, uGlint: { value: 0 } });
}

/** The spirit lanterns (one mesh; see LANTERN_FRAG). */
export function makeLanternMaterial() {
  return mat(LANTERN_VERT, LANTERN_FRAG, { ...U, uIsProp: { value: 1 }, cDark: { value: col('#4d4884') }, cGlow: { value: col('#d6efff') }, cInk: { value: col('#1c1630') }, cLid: { value: col('#b3abe0') } });
}

export function makePortalMaterial(r: number) {
  return mat(DUNGEON_VERT, PORTAL_FRAG, { ...U, uIsProp: { value: 0 }, uOrigin: DUNGEON_U.uOrigin, uR: { value: r } });
}

export function makePoolMaterial() {
  return mat(DUNGEON_VERT, POOL_FRAG, { ...U, uIsProp: { value: 0 }, cWater: { value: col('#4b4a86') }, cStreak: { value: col('#aaa6da') } });
}
