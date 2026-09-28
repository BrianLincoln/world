// Raw device input -> an abstract InputState. Movement modes only ever see
// InputState, so gamepad/touch can be added here without touching them.

export interface InputState {
  /** -1..1 strafe (right +) */
  x: number;
  /** -1..1 forward (+) */
  y: number;
  run: boolean;
  jump: boolean;
  up: boolean;
  down: boolean;
}

export class Input {
  private keys = new Set<string>();
  private edges = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  private wheel = 0;
  private dragging = false;

  constructor(private el: HTMLElement) {
    const typing = (e: Event) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    };
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      if (!this.keys.has(e.code)) this.edges.add(e.code);
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    el.addEventListener('pointerdown', (e) => {
      if (e.button === 0 && !document.pointerLockElement) {
        el.requestPointerLock?.();
      }
      this.dragging = true;
    });
    window.addEventListener('pointerup', () => (this.dragging = false));
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.el || this.dragging) {
        this.lookX += e.movementX;
        this.lookY += e.movementY;
      }
    });
    el.addEventListener('wheel', (e) => {
      this.wheel += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  }

  state(): InputState {
    const k = (c: string) => this.keys.has(c);
    return {
      x: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0),
      y: (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0),
      run: k('ShiftLeft') || k('ShiftRight'),
      jump: k('Space'),
      up: k('Space') || k('KeyE'),
      down: k('KeyC') || k('KeyQ') || k('ControlLeft'),
    };
  }

  /** True once per key press. */
  pressed(code: string): boolean {
    const had = this.edges.has(code);
    this.edges.delete(code);
    return had;
  }

  endFrame() {
    this.edges.clear();
  }

  consumeLook(): [number, number] {
    const r: [number, number] = [this.lookX, this.lookY];
    this.lookX = this.lookY = 0;
    return r;
  }

  consumeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }
}
