import * as THREE from 'three';
import { loadingTips } from '../ui/loadingTips';
import type { Environment } from '../gfx/environment';
import type { PostPipeline } from '../gfx/post';
import type { CharacterRig } from '../player/character';
import type { Body } from '../player/movement';
import type { WorldGen } from '../world/worldgen';
import { Sfx } from './audio';
import { OVERLAY_U } from './overlay';
import { Story } from './story';
import type { Colliders } from '../world/colliders';
import type { Harvest } from '../world/harvest';

// Glue between main.ts and the story: owns the sound engine and the overlay
// scene, (re)builds the Story when the seed changes, and keeps text off the
// screen while the wordless opening runs.

export interface HostDeps {
  scene: THREE.Scene;
  post: PostPipeline;
  env: Environment;
  rig: CharacterRig;
  body: Body;
  camera: THREE.PerspectiveCamera;
  puffs(at: THREE.Vector3, n: number, size: number, spread: number): void;
  colliders: Colliders;
  harvest: Harvest;
  /** What the giant's footprints add to the ground height (world/prints.ts). */
  dent?(x: number, z: number): number;
}

export class StoryHost {
  readonly sfx = new Sfx();
  readonly overlay = new THREE.Scene();
  story: Story | null = null;

  constructor(private d: HostDeps, readonly active: boolean) {
    d.post.overlay = { scene: this.overlay, tND: OVERLAY_U.tND, uRes: OVERLAY_U.uRes };
    // No words anywhere in the story: the loading veil is index.html's breathing flame, and the
    // controls line stays out. The sandbox gets its words back.
    const veil = document.getElementById('veil');
    if (active) document.getElementById('help')?.remove();
    else {
      if (veil) veil.innerHTML = '<div>Embla</div><span>unrolling the map…</span>';
      document.getElementById('help')?.removeAttribute('hidden');
    }
    if (veil) loadingTips(veil);
  }

  build(gen: WorldGen, seedText: string) {
    this.story?.dispose();
    this.story = new Story({
      scene: this.d.scene, overlay: this.overlay, gen, env: this.d.env, rig: this.d.rig, body: this.d.body, sfx: this.sfx,
      camera: this.d.camera, puffs: this.d.puffs, colliders: this.d.colliders, harvest: this.d.harvest, saveKey: seedText, active: this.active, dent: this.d.dent,
    });
    return this.story;
  }
}
