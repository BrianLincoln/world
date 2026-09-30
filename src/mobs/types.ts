import * as THREE from 'three';
import type { MountSpec } from '../player/movement';
import type { WorldGen } from '../world/worldgen';
import type { PartBatch } from './parts';

// Mobs: wild creatures that roam in flocks until lassoed. A tamed mob can be
// led on a rope or left to wait; once it's been brought home to the stable
// (in the story; in the sandbox at once) it's saddled and can be ridden (the
// player's RideMode then drives its position and the mob only animates).

export type MobState = 'wild' | 'caught' | 'tamed';

export interface Mob {
  /** Stable per spawn: `${species}:${cx},${cz}:${i}`. Tamed ids never respawn wild. */
  id: string;
  species: Species;
  /** Feet (the bottom of the body), world space. */
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  heading: number;
  /** On the ground (crows, stelks). Floofs are always airborne. */
  grounded: boolean;
  state: MobState;
  leashed: boolean;
  ridden: boolean;
  /** Lives at the stable: saddled, rideable, always comes home (see story/herd.ts). */
  stabled: boolean;
  flock: Flock | null;
  /** Presentation-only randomness (AI, blinks); spawn layout uses world hashes. */
  rnd: () => number;
  tint: THREE.Color;
  /** Where a tamed, unleashed mob waits. */
  stay: THREE.Vector3;
  /** Seconds in the current state. */
  stateT: number;
  /** Happy-eyes timer after taming. */
  happy: number;
  /** Per-species brain + animation scratch. */
  data: any;
}

export interface Flock {
  key: string;
  species: Species;
  home: THREE.Vector3;
  /** Moving centre the members orbit / gather around. */
  centre: THREE.Vector3;
  target: THREE.Vector3;
  members: Mob[];
  t: number;
  data: any;
}

/** What the brains can see of the player. */
export interface PlayerView {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  heading: number;
  mode: string;
}

export interface MobCtx {
  dt: number;
  time: number;
  gen: WorldGen;
  player: PlayerView;
  /** Terrain or water surface, whichever is higher. */
  surface(x: number, z: number): number;
  /** Is a sphere out of the camera's view? (Set by the manager for spawning.) */
  hidden?(x: number, y: number, z: number, r: number): boolean;
  /** Push a ground creature out of solid props (trees, rocks, walls). */
  collide?(pos: THREE.Vector3, vel: THREE.Vector3, radius: number): void;
  /** Dust / hearts. */
  puff(at: THREE.Vector3, count: number, size: number, spread: number): void;
  /** 0 day .. 1 night (some creatures only come out after dark). */
  night?: number;
}

export type SpeciesName =
  | 'floof' | 'crow' | 'stelk'
  | 'mossback' | 'glimmer' | 'mudsnoot' | 'moonmoth' | 'rockhopper'
  | 'boghag' | 'brambler' | 'wurm' | 'stormback' | 'lanternhare';

export interface Species {
  readonly name: SpeciesName;
  /** Body radius (m), for collision, rope and targeting. */
  readonly radius: number;
  /** Height of the body centre above the feet. */
  readonly centreY: number;
  readonly mount: MountSpec;
  readonly batches: PartBatch[];
  /** Flock size range for a spawn cell. */
  readonly flockSize: [number, number];
  /**
   * Place a new flock (centre, target, data) somewhere around the player.
   * `initial` = the world is just loading (it may start already settled).
   * Return false if there's nowhere suitable this time.
   */
  launch(f: Flock, ctx: MobCtx, rnd: () => number, initial: boolean): boolean;
  initMob(m: Mob, i: number, f: Flock, ctx: MobCtx): void;
  thinkFlock(f: Flock, ctx: MobCtx): void;
  think(m: Mob, ctx: MobCtx, leashIndex: number): void;
  /** Pose the skeleton from pos/vel/heading + internal state. */
  animate(m: Mob, ctx: MobCtx): void;
  /** Push this mob's parts into the batches (after animate). */
  emit(m: Mob, dist: number): void;
  /** Where the rope ties on, world space. */
  attach(m: Mob, toward: THREE.Vector3, out: THREE.Vector3): THREE.Vector3;
  /** The rider's hip anchor (world) and how far their legs straddle. */
  seat(m: Mob): { pos: THREE.Vector3; quat: THREE.Quaternion; spread: number };
  /** Called after a ride ends / a mob is freshly tamed, to settle its brain. */
  reset(m: Mob): void;
  // The newer creatures (see beast.ts) also say how many wild herds to keep
  // around, how often newcomers arrive, what Space does when ridden, and how
  // a debug-placed herd settles.
  readonly herds?: number;
  readonly every?: [number, number];
  readonly verb?: string;
  settle?(f: Flock, at: THREE.Vector3, rnd: () => number): void;
}
