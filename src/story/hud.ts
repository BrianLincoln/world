import type { Resource } from './phase1';
import { iconCanvas } from './icons';

// The inventory, shown only as icons: one small drawn log or stone per item
// you carry, in a soft parchment tab at the bottom left. No numbers, so a
// child who can't read yet can still count them.

const CSS = `
#story-inv { position: fixed; left: 14px; bottom: 14px; display: flex; flex-direction: column; gap: 6px; pointer-events: none; z-index: 5; }
#story-inv .row { display: flex; gap: 2px; padding: 5px 9px 5px 7px; border-radius: 16px; background: rgba(251, 243, 228, 0.86);
  box-shadow: 0 0 0 2px rgba(74, 46, 54, 0.55); transition: opacity 0.35s, transform 0.35s; transform-origin: left center; }
#story-inv .row.empty { opacity: 0; transform: scale(0.8); }
#story-inv img { width: 34px; height: 34px; transition: transform 0.25s cubic-bezier(.3,1.8,.5,1); }
#story-inv img.pop { transform: scale(1.35) rotate(-8deg); }
@media (pointer: coarse) { #story-inv { bottom: auto; top: 12px; } }
`;

export class Hud {
  private root: HTMLDivElement;
  private rows: Record<Resource, HTMLDivElement>;
  private shown: Record<Resource, number> = { logs: 0, stones: 0 };
  private src: Record<Resource, string>;
  private style: HTMLStyleElement;

  constructor() {
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);
    this.root = document.createElement('div');
    this.root.id = 'story-inv';
    this.rows = { logs: document.createElement('div'), stones: document.createElement('div') };
    for (const r of Object.values(this.rows)) { r.className = 'row empty'; this.root.appendChild(r); }
    document.body.appendChild(this.root);
    this.src = { logs: iconCanvas('log').toDataURL(), stones: iconCanvas('stone').toDataURL() };
  }

  set(inv: Record<Resource, number>, visible: boolean) {
    this.root.style.display = visible ? '' : 'none';
    for (const k of Object.keys(this.rows) as Resource[]) {
      const n = Math.min(inv[k], 16);
      const row = this.rows[k];
      if (n === this.shown[k]) continue;
      while (row.children.length < n) {
        const img = document.createElement('img');
        img.src = this.src[k];
        img.alt = '';
        row.appendChild(img);
        img.classList.add('pop');
        setTimeout(() => img.classList.remove('pop'), 220);
      }
      while (row.children.length > n) row.lastElementChild!.remove();
      row.classList.toggle('empty', n === 0);
      this.shown[k] = n;
    }
  }

  /** A little wiggle on the newest icon of a row. */
  bump(k: Resource) {
    const img = this.rows[k].lastElementChild as HTMLImageElement | null;
    if (!img) return;
    img.classList.add('pop');
    setTimeout(() => img.classList.remove('pop'), 220);
  }

  dispose() {
    this.root.remove();
    this.style.remove();
  }
}
