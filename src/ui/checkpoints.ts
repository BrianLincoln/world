import { PHASE1 } from '../story/phase1';
import { PHASE3 } from '../story/phase3';
import { STAGES } from '../story/journey';

/**
 * Dev: the story's checkpoints in play order, and a little strip to step
 * between them (` shows it). A step is a reload with `?fresh=1&cp=<id>`, so
 * the world is rebuilt up to that point from nothing; that's what makes going
 * back as safe as going forward (the jumps only ever add: build, fell, light).
 */
export interface Checkpoint {
  id: string;
  label: string;
  kind: 'phase1' | 'journey' | 'stable' | 'ring';
  /** The giant has already been (it comes while you look out of the home tower's head, in 'enter1'). */
  giantGone: boolean;
}

export const CHECKPOINTS: Checkpoint[] = [
  // 'home' (the hearth lit) is the journey's 'wait'.
  ...PHASE1.steps.filter((s) => s.id !== 'home').map((s, i): Checkpoint => ({ id: s.id, label: `1.${i + 1} ${s.id}`, kind: 'phase1', giantGone: false })),
  ...STAGES.map((s, i): Checkpoint => ({ id: s, label: `2.${i + 1} ${s}${s === 'enter1' ? ' (the giant comes)' : ''}`, kind: 'journey', giantGone: i > STAGES.indexOf('enter1') })),
  ...PHASE3.steps.map((s, i): Checkpoint => ({ id: s.id, label: `3.${i + 1} ${s.id}`, kind: 'stable', giantGone: true })),
  // Not a story step yet: stands you by the first dungeon's ring, opened.
  { id: 'ring', label: '4.1 ring (dungeon 1)', kind: 'ring', giantGone: true },
  // The dungeon done: coming up with its light, the ring shutting into a shrine (giant/offering.ts).
  { id: 'offer', label: '4.2 offering (dungeon 1 done)', kind: 'ring', giantGone: true },
];

const SHOW_KEY = 'ow.cp.show';

/** Reload at a checkpoint, keeping the seed and the dev switches but nothing that would turn the story off. */
export function gotoCheckpoint(id: string) {
  const u = new URL(location.href);
  for (const k of ['t', 'x', 'z', 'y', 'mode', 'journey', 'stable', 'giant', 'paused']) u.searchParams.delete(k);
  u.searchParams.set('story', '1');
  u.searchParams.set('fresh', '1');
  u.searchParams.set('cp', id);
  location.href = u.toString();
}

export class CheckpointBar {
  private el: HTMLDivElement;
  private sel: HTMLSelectElement;
  private prev: HTMLButtonElement;
  private next: HTMLButtonElement;
  private acc = 0;

  /** `current` is where the story is now (a checkpoint id, or null outside the story). */
  constructor(private current: () => string | null) {
    this.el = document.createElement('div');
    this.el.id = 'checkpoints';
    this.prev = this.button('◀', () => this.step(-1));
    this.sel = document.createElement('select');
    for (const c of CHECKPOINTS) this.sel.add(new Option(c.label, c.id));
    this.sel.onchange = () => gotoCheckpoint(this.sel.value);
    this.next = this.button('▶', () => this.step(1));
    this.el.append(this.prev, this.sel, this.next, this.button('↻', () => gotoCheckpoint(this.sel.value)));
    // Clicks here aren't camera drags, and keys stay with the game.
    for (const ev of ['pointerdown', 'mousedown', 'touchstart', 'wheel'] as const) this.el.addEventListener(ev, (e) => e.stopPropagation());
    this.el.addEventListener('keydown', (e) => e.preventDefault());
    document.body.append(this.el);
    let on = false;
    try { on = sessionStorage.getItem(SHOW_KEY) === '1'; } catch { /* no storage */ }
    this.show(on);
  }

  private button(text: string, fn: () => void) {
    const b = document.createElement('button');
    b.textContent = text;
    b.onclick = () => { b.blur(); fn(); };
    return b;
  }

  private index() { return CHECKPOINTS.findIndex((c) => c.id === this.current()); }

  private step(d: number) {
    const i = this.index();
    // Outside the story there's no "now": forward is the start, back is the end.
    const j = i < 0 ? (d > 0 ? 0 : CHECKPOINTS.length - 1) : i + d;
    if (j >= 0 && j < CHECKPOINTS.length) gotoCheckpoint(CHECKPOINTS[j].id);
  }

  get shown() { return this.el.style.display !== 'none'; }

  show(on: boolean) {
    this.el.style.display = on ? '' : 'none';
    try { sessionStorage.setItem(SHOW_KEY, on ? '1' : '0'); } catch { /* no storage */ }
    if (on) this.refresh();
  }

  toggle() { this.show(!this.shown); }

  private refresh() {
    const i = this.index();
    if (document.activeElement !== this.sel) this.sel.selectedIndex = i;
    this.prev.disabled = i === 0;
    this.next.disabled = i === CHECKPOINTS.length - 1;
  }

  /** Follows the story as you play. */
  tick(dt: number) {
    if (!this.shown || (this.acc += dt) < 0.5) return;
    this.acc = 0;
    this.refresh();
  }
}
