import * as THREE from 'three';
import type { Environment } from '../gfx/environment';
import type { PostPipeline } from '../gfx/post';
import type { CharacterRig } from '../player/character';
import type { Body } from '../player/movement';
import type { WorldGen } from '../world/worldgen';
import { Sfx } from './audio';
import { iconCanvas } from './icons';
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
    if (active) {
      // No words anywhere: the loading veil becomes a small breathing flame.
      const veil = document.getElementById('veil');
      if (veil) {
        veil.innerHTML = '';
        const img = document.createElement('img');
        img.src = iconCanvas('flame').toDataURL();
        img.alt = '';
        img.style.cssText = 'width:72px;height:72px;animation:storyBreathe 1.6s ease-in-out infinite';
        veil.appendChild(img);
        const st = document.createElement('style');
        st.textContent = '@keyframes storyBreathe{0%,100%{transform:scale(0.92);opacity:.8}50%{transform:scale(1.06);opacity:1}}';
        document.head.appendChild(st);
      }
      document.getElementById('help')?.remove();
    }
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
