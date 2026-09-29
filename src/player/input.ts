// Raw device input -> an abstract InputState. Movement modes only ever see
// InputState, so gamepad/touch can be added here without touching them.

export interface InputState {
  /** -1..1 strafe (right +) */
  x: number;
  /** -1..1 forward (+) */
  y: number;
  /** Sprint (Shift). */
  run: boolean;
  /** Slow walk (Alt). The default gait is a jog. */
  walk: boolean;
  /** Jump held (for variable jump height). */
  jump: boolean;
  /** Jump pressed this frame (buffered jumps, parachute toggle). */
  jumpPressed: boolean;
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
  private stick = { x: 0, y: 0, walk: false, run: false };

  constructor(private el: HTMLElement) {
    const typing = (e: Event) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    };
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      if (!this.keys.has(e.code)) this.edges.add(e.code);
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code.startsWith('Alt')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return; // handled by TouchControls
      if (e.button === 0 && !document.pointerLockElement) {
        el.requestPointerLock?.();
      }
      // Left click while looking around is the story's "use" (like E); held, it keeps using (chopping).
      if (e.button === 0 && document.pointerLockElement === el) { this.edges.add('Mouse0'); this.keys.add('Mouse0'); }
      // Right button is an action (lasso), reported like a key: 'Mouse2'.
      if (e.button === 2) this.edges.add('Mouse2');
      else this.dragging = true;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('pointerup', (e) => {
      this.dragging = false;
      if (e.button === 0) this.keys.delete('Mouse0');
    });
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
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const st = this.stick;
    return {
      x: clamp((k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0) + st.x),
      y: clamp((k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0) + st.y),
      run: k('ShiftLeft') || k('ShiftRight') || st.run,
      walk: k('AltLeft') || k('AltRight') || st.walk,
      jump: k('Space'),
      jumpPressed: this.edges.has('Space'),
      up: k('Space'),
      down: k('KeyC') || k('KeyQ') || k('ControlLeft'),
    };
  }

  /** Is a key (or 'Mouse0') held right now? */
  held(code: string): boolean {
    return this.keys.has(code);
  }

  /** A held on-screen button, reported as the key it stands in for. */
  virtualKey(code: string, down: boolean) {
    if (down) {
      if (!this.keys.has(code)) this.edges.add(code);
      this.keys.add(code);
    } else this.keys.delete(code);
  }

  /** Analog stick, -1..1 each axis (forward +). */
  setStick(x: number, y: number, walk: boolean, run: boolean) {
    this.stick = { x, y, walk, run };
  }

  addLook(dx: number, dy: number) {
    this.lookX += dx;
    this.lookY += dy;
  }

  addZoom(delta: number) {
    this.wheel += delta;
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
