import * as THREE from 'three';
import type { Guide } from './story';

// The far-off pointer: wander well away from the task (you can still hear
// the spirit calling, but not see it) and a small warm arrowhead shows the
// way, in the icons' look (a flame-cream fill, the plum ink line). Off
// screen it rides the screen's edge, pointing out toward the task; on screen
// it hangs over it, pointing down, and bobs. It fades in only after you've
// been away a good while (DELAY), and out again as you come close.

const CSS = `
#story-pointer { position: fixed; left: 0; top: 0; width: 34px; height: 34px; margin: -17px 0 0 -17px; pointer-events: none; z-index: 4;
  opacity: 0; will-change: transform, opacity; filter: drop-shadow(0 0 5px rgba(255, 196, 110, 0.75)); }
#story-pointer svg { width: 100%; height: 100%; display: block; }
`;
const SVG = `<svg viewBox="-20 -20 40 40"><path d="M-9 -12 L13 0 L-9 12 Q-3 0 -9 -12 Z" fill="#ffd98a" stroke="#4a2e36" stroke-width="3.2" stroke-linejoin="round"/></svg>`;

/** How far inside the screen's edge the arrowhead rides (px). */
const INSET = 46;
/**
 * Seconds away from the task before it shows: the opening gets its moment
 * to be found on its own, and stepping off for a look round isn't nagged.
 */
const DELAY = 15;
/** Its highest opacity: a hint, not a waypoint marker. */
const MAX_A = 0.85;

export class Pointer {
  private el: HTMLDivElement;
  private style: HTMLStyleElement;
  private a = 0;
  private awayT = 0;
  private x = -1;
  private y = -1;
  private ang = 0;
  private t = 0;
  private v = new THREE.Vector3();

  constructor() {
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);
    this.el = document.createElement('div');
    this.el.id = 'story-pointer';
    this.el.innerHTML = SVG;
    document.body.appendChild(this.el);
  }

  /** `g`: the task (null: nothing to point at); `show`: false while a cutscene or the tower view has the screen. */
  update(dt: number, camera: THREE.PerspectiveCamera, player: THREE.Vector3, g: Guide | null, show: boolean) {
    this.t += dt;
    const dist = g ? Math.hypot(g.at.x - player.x, g.at.z - player.z) : 0;
    this.awayT = g && dist > g.near ? this.awayT + dt : 0;
    const want = show && g && this.awayT > DELAY ? MAX_A * THREE.MathUtils.smoothstep(dist, g.near, g.near + 25) : 0;
    this.a += (want - this.a) * (1 - Math.exp(-(want > this.a ? 1.5 : 4) * dt));
    if (this.a < 0.01 || !g) {
      if (this.el.style.opacity !== '0') this.el.style.opacity = '0';
      this.x = -1;
      return;
    }

    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H / 2, hx = cx - INSET, hy = cy - INSET;
    // A little above the thing itself, so it points at the spirit, not its feet.
    const p = this.v.copy(g.at).setY(g.at.y + 1.6).project(camera);
    const behind = p.z > 1;
    let px = p.x * cx, py = -p.y * cy;
    if (behind) { px = -px; py = -py; }
    let x: number, y: number, ang: number;
    if (!behind && Math.abs(px) < hx && Math.abs(py) < hy - 30) {
      // On screen: over it, pointing down.
      x = cx + px;
      y = cy + py - 26;
      ang = Math.PI / 2;
    } else {
      // Off screen: on the edge, pointing out toward it (straight behind: along the bottom).
      if (Math.hypot(px, py) < 1) { px = 0; py = 1; }
      const k = Math.min(hx / Math.max(1e-6, Math.abs(px)), hy / Math.max(1e-6, Math.abs(py)));
      x = cx + px * k;
      y = cy + py * k;
      ang = Math.atan2(py, px);
    }
    if (this.x < 0) { this.x = x; this.y = y; this.ang = ang; }
    const e = 1 - Math.exp(-8 * dt);
    this.x += (x - this.x) * e;
    this.y += (y - this.y) * e;
    this.ang += Math.atan2(Math.sin(ang - this.ang), Math.cos(ang - this.ang)) * e;
    // A slow nudge along the way it points.
    const bob = Math.sin(this.t * 3.2) * 3.5;
    const bx = this.x + Math.cos(this.ang) * bob, by = this.y + Math.sin(this.ang) * bob;
    this.el.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) rotate(${this.ang.toFixed(3)}rad)`;
    this.el.style.opacity = this.a.toFixed(3);
  }

  dispose() {
    this.el.remove();
    this.style.remove();
  }
}
