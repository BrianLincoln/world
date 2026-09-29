import type { Input } from '../player/input';
import type { Resource } from './phase1';
import { iconCanvas, type IconName } from './icons';

// The inventory: a soft parchment tab per resource at the bottom left, its
// drawn icon and a count (a log x3). A row appears once the story first asks
// for that resource and stays from then on, even when empty.

const CSS = `
#story-inv { position: fixed; left: 14px; bottom: 14px; display: flex; flex-direction: column; gap: 6px; pointer-events: none; z-index: 5; }
#story-inv .row { display: flex; align-items: center; gap: 4px; padding: 5px 9px 5px 7px; border-radius: 16px; background: rgba(251, 243, 228, 0.86);
  box-shadow: 0 0 0 2px rgba(74, 46, 54, 0.55); transition: opacity 0.35s, transform 0.35s; transform-origin: left center; }
#story-inv .row.hidden { display: none; }
#story-inv .row.zero .n, #story-inv .row.zero img.icon { opacity: 0.5; }
#story-inv img.icon { width: 34px; height: 34px; transition: transform 0.25s cubic-bezier(.3,1.8,.5,1), opacity 0.3s; }
#story-inv .row.in { animation: storyRowIn 0.45s cubic-bezier(.3,1.7,.5,1); }
@keyframes storyRowIn { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
#story-inv .n { min-width: 1.9em; font: 800 21px/1 ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', 'Nunito', system-ui, sans-serif;
  color: #4a2e36; letter-spacing: 0.02em; display: inline-block; transition: transform 0.25s cubic-bezier(.3,1.8,.5,1), opacity 0.3s; }
#story-inv .n small { font-size: 15px; margin-right: 1px; opacity: 0.75; }
#story-inv .pop img.icon { transform: scale(1.35) rotate(-8deg); }
#story-inv .pop .n { transform: scale(1.3); }
#story-inv img.check { width: 30px; height: 30px; margin: 2px 0 2px 6px; animation: storyCheck 0.45s cubic-bezier(.3,1.9,.5,1); }
@keyframes storyCheck { from { transform: scale(0) rotate(-40deg); } to { transform: scale(1) rotate(0); } }
@media (pointer: coarse) { #story-inv { bottom: auto; top: 12px; } }
/* The action badge: an icon of what you can do here. On touch screens it's
   the button (hold it); with a mouse it's the cue to hold E or the button. */
#story-act { position: fixed; left: 50%; bottom: 26px; width: 74px; height: 74px; margin-left: -37px; border-radius: 50%;
  background: rgba(251, 243, 228, 0.9); box-shadow: 0 0 0 3px rgba(74, 46, 54, 0.7), 0 3px 0 rgba(74, 46, 54, 0.35);
  display: grid; place-items: center; pointer-events: none; z-index: 6; opacity: 0; transform: scale(0.6);
  transition: opacity 0.25s, transform 0.25s cubic-bezier(.3,1.6,.5,1); touch-action: none; -webkit-tap-highlight-color: transparent; }
#story-act.on { opacity: 1; transform: scale(1); animation: storyActPulse 1.4s ease-in-out infinite; }
#story-act.held { background: #f0c26a; animation: none; transform: scale(0.94); }
#story-act img { width: 52px; height: 52px; pointer-events: none; }
@keyframes storyActPulse { 0%, 100% { box-shadow: 0 0 0 3px rgba(74, 46, 54, 0.7), 0 3px 0 rgba(74, 46, 54, 0.35); }
  50% { box-shadow: 0 0 0 3px rgba(74, 46, 54, 0.7), 0 0 0 10px rgba(255, 214, 128, 0.45); } }
body.touch #story-act { left: auto; margin-left: 0; right: calc(28px + env(safe-area-inset-right)); bottom: calc(128px + env(safe-area-inset-bottom)); width: 84px; height: 84px; }
body.touch #story-act.on { pointer-events: auto; }
/* How to do it on this device: a mouse with its button lit, or a finger. It
   taps for a press and presses-and-stays for a hold. */
#story-how { position: fixed; left: 50%; bottom: 22px; width: 72px; height: 72px; margin-left: 44px; pointer-events: none; z-index: 6;
  opacity: 0; transition: opacity 0.25s; }
#story-how.on { opacity: 1; }
#story-how img { position: absolute; inset: 0; width: 100%; height: 100%; }
#story-how img.down { opacity: 0; }
#story-how.tap img.up { animation: storyHowUp 1.2s steps(1) infinite; }
#story-how.tap img.down { animation: storyHowDown 1.2s steps(1) infinite; }
#story-how.hold img.up { animation: storyHowUp 2.4s steps(1) infinite; }
#story-how.hold img.down { animation: storyHowHoldDown 2.4s steps(1) infinite; }
#story-how.pressed img.up { animation: none; opacity: 0; }
#story-how.pressed img.down { animation: none; opacity: 1; }
@keyframes storyHowUp { 0% { opacity: 1; } 60% { opacity: 0; } 80% { opacity: 1; } }
@keyframes storyHowDown { 0% { opacity: 0; } 60% { opacity: 1; } 80% { opacity: 0; } }
@keyframes storyHowHoldDown { 0% { opacity: 0; } 25% { opacity: 1; } 85% { opacity: 0; } }
body.touch #story-how { left: auto; margin-left: 0; right: calc(96px + env(safe-area-inset-right)); bottom: calc(118px + env(safe-area-inset-bottom)); transform: rotate(-20deg); }
`;

export class Hud {
  private root: HTMLDivElement;
  private rows: Record<Resource, HTMLDivElement>;
  private shown: Record<Resource, number> = { logs: -1, stones: -1 };
  private counts: Record<Resource, HTMLSpanElement>;
  private open: Record<Resource, boolean> = { logs: false, stones: false };
  private ticked: Record<Resource, boolean> = { logs: false, stones: false };
  private ticks: Record<Resource, HTMLImageElement>;
  private style: HTMLStyleElement;
  private act: HTMLDivElement;
  private actIcon: HTMLImageElement;
  private actName: IconName | null = null;
  private input: Input | null = null;
  private touchHeld = false;
  private how: HTMLDivElement;
  private howKind = '';

  constructor() {
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);
    this.root = document.createElement('div');
    this.root.id = 'story-inv';
    const row = (icon: IconName): [HTMLDivElement, HTMLSpanElement] => {
      const r = document.createElement('div');
      r.className = 'row hidden';
      const img = document.createElement('img');
      img.src = iconCanvas(icon).toDataURL();
      img.alt = '';
      img.className = 'icon';
      const n = document.createElement('span');
      n.className = 'n';
      r.append(img, n);
      this.root.appendChild(r);
      return [r, n];
    };
    const [logs, logsN] = row('log');
    const [stones, stonesN] = row('stone');
    this.rows = { logs, stones };
    this.counts = { logs: logsN, stones: stonesN };
    document.body.appendChild(this.root);
    const tick = () => { const i = document.createElement('img'); i.src = iconCanvas('check').toDataURL(); i.alt = ''; i.className = 'check'; return i; };
    this.ticks = { logs: tick(), stones: tick() };
    this.act = document.createElement('div');
    this.act.id = 'story-act';
    this.actIcon = document.createElement('img');
    this.actIcon.alt = '';
    this.act.appendChild(this.actIcon);
    document.body.appendChild(this.act);
    this.how = document.createElement('div');
    this.how.id = 'story-how';
    document.body.appendChild(this.how);
    // Touch: holding the badge is a held click (E is the ride button's).
    this.act.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.touchHeld = true;
      this.input?.virtualKey('Mouse0', true);
    });
    const up = () => { if (this.touchHeld) { this.touchHeld = false; this.input?.virtualKey('Mouse0', false); } };
    this.act.addEventListener('pointerup', up);
    this.act.addEventListener('pointercancel', up);
    this.act.addEventListener('pointerleave', up);
    this.act.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Show the action badge for `icon` (null hides it); `held` = it's being
   * pressed; `mode`: a single press or press-and-hold (the glyph beside it).
   */
  action(icon: IconName | null, held: boolean, input: Input, mode: 'tap' | 'hold' = 'tap') {
    const touch = document.body.classList.contains('touch');
    const kind = touch ? 'finger' : 'mouse';
    if (kind !== this.howKind) {
      this.howKind = kind;
      this.how.innerHTML = '';
      for (const [n, cls] of [[kind, 'up'], [kind + 'Down', 'down']] as const) {
        const img = document.createElement('img');
        img.src = iconCanvas(n as IconName).toDataURL();
        img.alt = '';
        img.className = cls;
        this.how.appendChild(img);
      }
    }
    this.how.className = icon ? `on ${mode}${held ? ' pressed' : ''}` : '';
    this.input = input;
    if (icon && icon !== this.actName) this.actIcon.src = iconCanvas(icon).toDataURL();
    if (icon) this.actName = icon;
    this.act.classList.toggle('on', !!icon);
    this.act.classList.toggle('held', !!icon && held);
    if (!icon && this.touchHeld) { this.touchHeld = false; input.virtualKey('Mouse0', false); }
  }

  /**
   * `open`: which rows are shown at all (the story has reached them);
   * `enough`: which rows get the tick (you have all you need of it).
   */
  set(inv: Record<Resource, number>, visible: boolean, open: Partial<Record<Resource, boolean>>, enough?: Partial<Record<Resource, boolean>>) {
    this.root.style.display = visible ? '' : 'none';
    for (const k of Object.keys(this.rows) as Resource[]) {
      const row = this.rows[k];
      const on = !!open[k] || inv[k] > 0;
      if (on !== this.open[k]) {
        this.open[k] = on;
        row.classList.toggle('hidden', !on);
        // Pop in the first time it shows up while playing (not on load).
        if (on && visible) { row.classList.remove('in'); void row.offsetWidth; row.classList.add('in'); }
      }
      const n = Math.max(0, Math.min(inv[k], 99));
      if (n !== this.shown[k]) {
        this.shown[k] = n;
        this.counts[k].innerHTML = `<small>\u00d7</small>${n}`;
        row.classList.toggle('zero', n === 0);
      }
      const tick = !!enough?.[k] && n > 0;
      if (tick !== this.ticked[k]) {
        this.ticked[k] = tick;
        if (tick) row.appendChild(this.ticks[k]); else this.ticks[k].remove();
      }
    }
  }

  /** A little wiggle on a row's icon and count. */
  bump(k: Resource) {
    const row = this.rows[k];
    row.classList.add('pop');
    setTimeout(() => row.classList.remove('pop'), 220);
  }

  dispose() {
    this.how.remove();
    this.act.remove();
    this.root.remove();
    this.style.remove();
  }
}
