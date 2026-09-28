import * as THREE from 'three';
import { KIND_COLORS, SKY_U, TERRAIN_U, U, WATER_U } from './materials';
import { BIOME, resolveSky, type SkyState } from './palette';

// Day/night: advances the clock, moves sun and moon, resolves the palette
// keyframes and pushes everything into the shared uniforms.

export class Environment {
  hour = 9.5;
  /** Real minutes per in-game day. */
  dayMinutes = 16;
  paused = false;
  paletteOverride: string | null = null;
  readonly sky: SkyState = {} as SkyState;
  readonly sunDir = new THREE.Vector3();
  readonly moonDir = new THREE.Vector3();
  private baseKinds = KIND_COLORS.map((c) => c.clone());

  update(dt: number) {
    if (!this.paused) this.hour = (this.hour + (dt * 24) / (this.dayMinutes * 60)) % 24;
    this.apply();
  }

  apply() {
    const s = resolveSky(this.hour, this.paletteOverride, this.sky);
    // Sun: rises in +x, arcs south-ish, sets in -x. t = 0 at 06:00.
    const t = ((this.hour - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(t), Math.sin(t) * 0.78, 0.5).normalize();
    this.moonDir.set(-Math.cos(t) * 0.8, -Math.sin(t) * 0.7 + 0.08, 0.45).normalize();
    const sunUp = THREE.MathUtils.smoothstep(this.sunDir.y, -0.08, 0.06);
    const key = new THREE.Vector3().copy(this.moonDir).lerp(this.sunDir, sunUp).normalize();
    // Keep the key light from grazing: low light makes everything shade.
    key.y = Math.max(key.y, 0.24);
    key.normalize();

    U.uLightDir.value.copy(key);
    U.uLightCol.value.copy(s.light);
    U.uMidCol.value.copy(s.mid);
    U.uShadeCol.value.copy(s.shade);
    U.uNight.value = s.night;

    SKY_U.uSkyTop.value.copy(s.skyTop);
    SKY_U.uSkyMid.value.copy(s.skyMid);
    SKY_U.uSkyHorizon.value.copy(s.skyHorizon);
    SKY_U.uSunGlow.value.copy(s.sunGlow);
    SKY_U.uSunCol.value.copy(s.sun);
    SKY_U.uSunDir.value.copy(this.sunDir);
    SKY_U.uMoonDir.value.copy(this.moonDir);
    SKY_U.uStars.value = s.stars;
    SKY_U.uCloud.value.copy(s.cloud);
    SKY_U.uCloudShade.value.copy(s.cloudShade);
    SKY_U.uCloudRim.value.copy(s.cloudRim);
    SKY_U.uCloudLine.value.copy(s.outline).lerp(s.cloudShade, 0.35);

    WATER_U.cDeep.value.copy(s.water);
    WATER_U.cShallow.value.copy(s.water).lerp(new THREE.Color(BIOME.waterShallow), 0.5).lerp(s.skyHorizon, 0.15);
    WATER_U.cFoam.value.set(BIOME.foam).lerp(s.skyHorizon, 0.3);
    WATER_U.cReflect.value.copy(s.skyHorizon);

    // Ground marks are a darker version of the meadow.
    TERRAIN_U.cStroke.value.set(BIOME.meadowDark).multiplyScalar(0.7);
    void this.baseKinds;
  }
}
