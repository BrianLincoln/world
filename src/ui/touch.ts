import type { Input } from '../player/input';

// On-screen controls for touch screens. Everything lands in Input as the same
// signals the keyboard and mouse produce (virtual keys, look deltas, zoom), so
// movement modes and the camera never know the difference.
//
// - Left half: a floating stick that appears under the thumb. A light push
//   walks, a full push jogs, pushing past the rim sprints.
// - Right half: drag to look; a second finger pinches to zoom.
// - Buttons: jump always; ride / hop off, lasso and descend when relevant; fly.

export interface TouchContext {
  /** Label for the E button, or null to hide it. */
  ride: string | null;
  /** Label for the R button, or null to hide it. */
  lasso: string | null;
  /** Show the descend (C) button. */
  down: boolean;
  /** Show the fly (F) toggle. */
  fly: boolean;
}

const STICK_R = 56;
const LOOK_GAIN = 1.5;

export function isTouchDevice(): boolean {
  return matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export class TouchControls {
  private root: HTMLDivElement;
  private stick: HTMLDivElement;
  private knob: HTMLDivElement;
  private buttons: Record<'jump' | 'ride' | 'lasso' | 'down' | 'fly', HTMLButtonElement>;
  private stickId = -1;
  private stickOrigin = { x: 0, y: 0 };
  private looks = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private last: TouchContext = { ride: null, lasso: null, down: false, fly: true };

  constructor(private input: Input, el: HTMLElement) {
    document.body.classList.add('touch');
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.stick = document.createElement('div');
    this.stick.className = 'stick';
    this.knob = document.createElement('div');
    this.knob.className = 'knob';
    this.stick.appendChild(this.knob);
    this.root.appendChild(this.stick);

    const button = (cls: string, label: string, code: string) => {
      const b = document.createElement('button');
      b.className = 'tbtn ' + cls;
      b.textContent = label;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        b.classList.add('held');
        this.input.virtualKey(code, true);
      });
      const up = () => {
        b.classList.remove('held');
        this.input.virtualKey(code, false);
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      this.root.appendChild(b);
      return b;
    };
    this.buttons = {
      jump: button('jump', 'Jump', 'Space'),
      ride: button('ride', 'Ride', 'KeyE'),
      lasso: button('lasso', 'Lasso', 'KeyR'),
      down: button('down', '▼', 'KeyC'),
      fly: button('fly', 'Fly', 'KeyF'),
    };
    document.body.appendChild(this.root);
    this.apply(this.last, true);

    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    el.addEventListener('pointerup', (e) => this.up(e));
    el.addEventListener('pointercancel', (e) => this.up(e));
    // iOS Safari: no page pinch-zoom or double-tap zoom over the game.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
  }

  /** Show only the buttons that do something right now. */
  setContext(c: TouchContext) {
    this.apply(c, false);
  }

  private apply(c: TouchContext, force: boolean) {
    const l = this.last;
    if (!force && l.ride === c.ride && l.lasso === c.lasso && l.down === c.down && l.fly === c.fly) return;
    this.last = { ...c };
    const b = this.buttons;
    b.ride.hidden = !c.ride;
    if (c.ride) b.ride.textContent = c.ride;
    b.lasso.hidden = !c.lasso;
    if (c.lasso) b.lasso.textContent = c.lasso;
    b.down.hidden = !c.down;
    // Flying or riding, the jump button climbs.
    b.jump.textContent = c.down ? '▲' : 'Jump';
    b.jump.classList.toggle('climb', c.down);
    b.fly.hidden = !c.fly;
  }

  private down(e: PointerEvent) {
    if (e.pointerType !== 'touch') return;
    e.preventDefault();
    if (this.stickId < 0 && e.clientX < window.innerWidth * 0.45) {
      this.stickId = e.pointerId;
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      this.stick.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      this.stick.classList.add('on');
      this.knob.style.transform = '';
      return;
    }
    this.looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.pinch = this.looks.size === 2 ? this.spread() : 0;
  }

  private move(e: PointerEvent) {
    if (e.pointerType !== 'touch') return;
    if (e.pointerId === this.stickId) {
      let dx = e.clientX - this.stickOrigin.x;
      let dy = e.clientY - this.stickOrigin.y;
      const d = Math.hypot(dx, dy);
      const m = d / STICK_R;
      if (d > STICK_R) {
        dx *= STICK_R / d;
        dy *= STICK_R / d;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.knob.classList.toggle('sprint', m > 1.15);
      this.input.setStick(dx / STICK_R, -dy / STICK_R, m < 0.45, m > 1.15);
      return;
    }
    const p = this.looks.get(e.pointerId);
    if (!p) return;
    if (this.looks.size >= 2) {
      p.x = e.clientX;
      p.y = e.clientY;
      const s = this.spread();
      if (this.pinch > 0 && s > 0) this.input.addZoom(-Math.log(s / this.pinch) / 0.001);
      this.pinch = s;
      return;
    }
    this.input.addLook((e.clientX - p.x) * LOOK_GAIN, (e.clientY - p.y) * LOOK_GAIN);
    p.x = e.clientX;
    p.y = e.clientY;
  }

  private up(e: PointerEvent) {
    if (e.pointerType !== 'touch') return;
    if (e.pointerId === this.stickId) {
      this.stickId = -1;
      this.stick.classList.remove('on');
      this.knob.classList.remove('sprint');
      this.input.setStick(0, 0, false, false);
      return;
    }
    this.looks.delete(e.pointerId);
    this.pinch = this.looks.size === 2 ? this.spread() : 0;
  }

  private spread(): number {
    const [a, b] = [...this.looks.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
}
