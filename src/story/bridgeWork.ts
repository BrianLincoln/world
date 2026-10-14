// Building the bridge over the strait (owner, 2026-10-13). It isn't there
// at first. Once the giant has waded across, the whole of it shows as a
// sketch, with a row of slots over its near end; stand anywhere within
// reach of it with wood and the wood goes in, as into the stable's fence.
// It takes `NEED` (each slot is a tenth of it). **Nothing of it bears you
// until the last piece is in**: then it stands, all at once, and you can
// cross. So nobody gets over early.
//
// Its own small thing beside the director (story/build.ts is the cabin's
// and the stable's, a slot a piece: a hundred slots would be a wall of
// them). The guide isn't in it yet.

import * as THREE from 'three';
import type { Bridges } from '../world/bridge';
import type { Sfx } from './audio';
import { slotCanvas, tex } from './icons';
import { Billboard, Sketch } from './overlay';

/** How much wood the bridge takes, how many slots show it, how near you hand it over (m), and how fast it goes in (a second). */
export const NEED = 100, SLOTS = 10;
const REACH = 16, RATE = 7;

export class BridgeWork {
  filled = 0;
  get done() { return this.filled >= NEED; }
  private sketch: Sketch | null = null;
  private slots: Billboard[] = [];
  private pop: number[] = [];
  private a = 0;
  private t = 0;
  private giveT = 0;
  private head = new THREE.Vector3();
  private fill: THREE.BufferGeometry | null = null;

  constructor(private bridges: Bridges, overlay: THREE.Object3D, private key: string, private sfx?: Sfx) {
    try { this.filled = Math.max(0, Math.min(NEED, +(localStorage.getItem(key) ?? 0) | 0)); } catch { /* none laid */ }
    const g = bridges.sketchGeometry();
    if (!g) return;
    this.fill = g;
    this.sketch = new Sketch(g, g, { threshold: 20 });
    overlay.add(this.sketch.group);
    bridges.headAt(this.head);
    for (let i = 0; i < SLOTS; i++) {
      const b = new Billboard(tex(slotCanvas('log', this.filled >= ((i + 1) * NEED) / SLOTS)), 0.9, 30);
      b.alpha = 0;
      this.slots.push(b); this.pop.push(0);
      overlay.add(b.mesh);
    }
  }

  /**
   * `open`: the giant has crossed, and the bridge is to be built. `pos`: where you are; `wood()` is what you carry,
   * `take()` takes one. Returns true on the frame the bridge stands.
   */
  update(dt: number, open: boolean, pos: THREE.Vector3, wood: () => number, take: () => void) {
    if (!this.sketch) return false;
    this.t += dt;
    const show = open && !this.done ? 1 : 0;
    this.a += (show - this.a) * (1 - Math.exp(-3 * dt));
    this.sketch.set(this.a);
    let stood = false;
    if (show && this.bridges.distTo(pos.x, pos.z) < REACH && wood() > 0) {
      this.giveT += dt * RATE;
      while (this.giveT >= 1 && wood() > 0 && !this.done) {
        this.giveT -= 1;
        take();
        this.filled++;
        const per = NEED / SLOTS, i = Math.floor((this.filled - 1) / per);
        if (this.filled % per === 0) { this.slots[i].texture = tex(slotCanvas('log', true)); this.pop[i] = 1; this.sfx?.slot(i); } else this.sfx?.pickup();
        try { localStorage.setItem(this.key, String(this.filled)); } catch { /* ignore */ }
      }
      if (this.done) { stood = true; this.sfx?.fanfare(); }
    } else this.giveT = 0;
    // The slots: a row over the near end, across the way you come, the one being filled nodding.
    const cur = Math.floor(this.filled / (NEED / SLOTS));
    for (let i = 0; i < SLOTS; i++) {
      const s = this.slots[i];
      this.bridges.acrossAt(this.head, ((SLOTS - 1) / 2 - i) * 1.05, s.pos);
      s.pos.y = this.head.y + 5.2 + Math.sin(this.t * 2 + i * 0.7) * 0.06 + (i === cur ? Math.sin(this.t * 5) * 0.08 : 0);
      this.pop[i] = Math.max(0, this.pop[i] - dt * 3);
      s.scale = 1 + Math.sin(this.pop[i] * Math.PI) * 0.45;
      s.alpha = this.a;
    }
    return stood;
  }

  /** Dev: as if this much wood had gone in. */
  debug(n: number) { this.filled = Math.max(0, Math.min(NEED, n)); for (let i = 0; i < SLOTS; i++) this.slots[i].texture = tex(slotCanvas('log', this.filled >= ((i + 1) * NEED) / SLOTS)); try { localStorage.setItem(this.key, String(this.filled)); } catch { /* ignore */ } }

  dispose() { this.sketch?.group.removeFromParent(); for (const s of this.slots) s.mesh.removeFromParent(); this.fill?.dispose(); }
}
