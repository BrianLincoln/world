// The way out of a cutscene: hold Space (by touch: hold the prompt itself)
// for a moment. Nothing shows until a key, a click or a tap says someone's
// there and might want it; it goes again a few seconds after the last one.
// Held, not pressed: a key hit by chance mid-scene skips nothing.
// (Not Esc: the browser keeps that to let the mouse go.)

/** How long it's held (s), how long the prompt stays after the last key or tap, and how fast a let-go hold runs back down (per s). */
const HOLD = 0.9, LINGER = 3, BACK = 2.5;

export class SkipPrompt {
  private el = document.createElement('div');
  private bar = document.createElement('i');
  /** Seconds the prompt has left to show. */
  private awake = 0;
  /** How far the hold has got (0..1). */
  private k = 0;
  /** A finger (or the mouse) is down on the prompt. */
  private pressed = false;
  private shown = false;

  constructor(touch: boolean) {
    this.el.id = 'skip';
    this.el.innerHTML = touch ? 'Hold to skip' : 'Hold <b>Space</b> to skip';
    this.el.append(this.bar);
    document.body.append(this.el);
    const wake = () => { this.awake = LINGER; };
    window.addEventListener('keydown', wake);
    window.addEventListener('pointerdown', wake);
    this.el.addEventListener('pointerdown', (e) => { this.pressed = true; e.preventDefault(); e.stopPropagation(); });
    for (const up of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(up, () => { this.pressed = false; });
  }

  /** One frame. `can`: there's something playing that can be skipped; `held`: the key is down. True the frame the hold is complete. */
  update(dt: number, can: boolean, held: boolean): boolean {
    if (!can) {
      if (this.shown || this.k > 0) this.bar.style.transform = 'scaleX(0)';
      this.awake = 0; this.k = 0; this.pressed = false; this.show(false);
      return false;
    }
    const down = held || this.pressed;
    if (down) this.awake = LINGER; else this.awake = Math.max(0, this.awake - dt);
    this.k = Math.min(1, Math.max(0, this.k + (down ? dt / HOLD : -dt * BACK)));
    this.show(this.awake > 0 || this.k > 0);
    this.bar.style.transform = `scaleX(${this.k.toFixed(3)})`;
    if (this.k < 1) return false;
    this.k = 0;
    this.awake = 0;
    this.pressed = false;
    this.show(false);
    this.bar.style.transform = 'scaleX(0)';
    return true;
  }

  private show(on: boolean) {
    if (on === this.shown) return;
    this.shown = on;
    this.el.classList.toggle('on', on);
  }
}
