// Every sound is synthesised here with WebAudio: no samples to load. The
// palette is small and soft, like a picture book read aloud: the spirit's
// chirps and whimpers are pure glides, wood is filtered noise plus a low
// knock, and the hearth is a noise swell that settles into crackles.
//
// Browsers only start audio after a user gesture, so the context is created
// on the first key or pointer press (see `unlock`).

type Env = { a?: number; d: number; peak?: number };

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private echo: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;
  /** Loudness of the next sounds (0..1): the story sets it round the spirit's voice for distance. */
  level = 1;
  /** Fire crackle loop level (0..1), set every frame from distance to the hearth. */
  crackle = 0;
  private crackleT = 0;

  constructor() {
    const unlock = () => this.unlock();
    window.addEventListener('keydown', unlock, { capture: true });
    window.addEventListener('pointerdown', unlock, { capture: true });
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    // A short soft echo gives the chirps a little room.
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.13;
    const fb = ctx.createGain();
    fb.gain.value = 0.22;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    this.echo = ctx.createGain();
    this.echo.gain.value = 0.3;
    this.echo.connect(delay);
    delay.connect(lp).connect(fb).connect(delay);
    lp.connect(this.master);
    const n = ctx.sampleRate * 1.5;
    this.noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }

  private get ok() {
    return !!this.ctx && !this.muted && this.ctx.state === 'running';
  }

  private env(g: GainNode, t: number, e: Env) {
    const a = e.a ?? 0.005;
    const p = Math.max(0.0002, (e.peak ?? 1) * this.level);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(p, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + e.d);
  }

  /** A pitched voice with an optional glide and vibrato. */
  private tone(type: OscillatorType, f0: number, f1: number, t: number, e: Env, opts: { vib?: number; vibHz?: number; echo?: boolean; dest?: AudioNode } = {}) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + (e.a ?? 0.005) + e.d * 0.8);
    if (opts.vib) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = opts.vibHz ?? 7;
      const lg = ctx.createGain();
      lg.gain.value = opts.vib;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + (e.a ?? 0.005) + e.d + 0.05);
    }
    const g = ctx.createGain();
    this.env(g, t, e);
    o.connect(g).connect(opts.dest ?? this.master!);
    if (opts.echo) g.connect(this.echo!);
    o.start(t);
    o.stop(t + (e.a ?? 0.005) + e.d + 0.05);
  }

  /** Filtered noise burst. */
  private noise(t: number, e: Env, filter: BiquadFilterType, f0: number, f1: number, q = 1, dest?: AudioNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const bf = ctx.createBiquadFilter();
    bf.type = filter;
    bf.Q.value = q;
    bf.frequency.setValueAtTime(f0, t);
    bf.frequency.exponentialRampToValueAtTime(f1, t + (e.a ?? 0.005) + e.d);
    const g = ctx.createGain();
    this.env(g, t, e);
    src.connect(bf).connect(g).connect(dest ?? this.master!);
    src.start(t, Math.random() * 0.8);
    src.stop(t + (e.a ?? 0.005) + e.d + 0.05);
  }

  /** Happy: three bright rising blips. */
  chirp(excited = false) {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.01;
    const base = 880 * (0.95 + Math.random() * 0.1);
    const notes = excited ? [1, 1.26, 1.5, 2] : [1, 1.26, 1.5];
    notes.forEach((m, i) => {
      const s = t + i * 0.085;
      this.tone('sine', base * m * 0.85, base * m * 1.12, s, { a: 0.008, d: 0.075, peak: 0.28 }, { echo: true });
      this.tone('triangle', base * m * 1.7, base * m * 2.2, s, { a: 0.005, d: 0.05, peak: 0.05 });
    });
  }

  /** Content: a soft warbling coo (a pat on the head). */
  coo() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.01;
    const f = 600 * (0.94 + Math.random() * 0.12);
    this.tone('sine', f, f * 1.4, t, { a: 0.05, d: 0.32, peak: 0.2 }, { vib: 16, vibHz: 12, echo: true });
    this.tone('triangle', f * 2, f * 2.7, t, { a: 0.05, d: 0.24, peak: 0.025 }, { vib: 28, vibHz: 12 });
  }

  /** Sad: a small falling glide with a wobble. */
  whimper() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.01;
    this.tone('sine', 760, 430, t, { a: 0.06, d: 0.55, peak: 0.22 }, { vib: 22, vibHz: 7.5, echo: true });
    this.tone('triangle', 1520, 900, t, { a: 0.06, d: 0.45, peak: 0.03 }, { vib: 40, vibHz: 7.5 });
  }

  /** "Over here!": a quick two-note call, used by hints. */
  call() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.01;
    this.tone('sine', 700, 1100, t, { a: 0.01, d: 0.1, peak: 0.26 }, { echo: true });
    this.tone('sine', 900, 1300, t + 0.16, { a: 0.01, d: 0.14, peak: 0.26 }, { echo: true });
  }

  /** A little squeak while tugging at your coat. */
  tug() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.01;
    this.tone('sine', 1200, 1500, t, { a: 0.005, d: 0.06, peak: 0.16 });
  }

  /** Axe into wood: a woody knock, a bright bite and a crunch of chips. */
  chop() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.005;
    this.tone('sine', 190, 70, t, { a: 0.002, d: 0.16, peak: 0.55 });
    this.tone('square', 620 * (0.9 + Math.random() * 0.2), 380, t, { a: 0.001, d: 0.03, peak: 0.1 });
    this.noise(t, { a: 0.001, d: 0.09, peak: 0.5 }, 'bandpass', 2400, 900, 1.4);
    this.noise(t + 0.01, { a: 0.002, d: 0.2, peak: 0.18 }, 'bandpass', 5200, 3000, 2);
  }

  /** A tree coming down: creak, swish, then the ground thud. */
  fall(delay = 0) {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.01 + delay;
    this.tone('sawtooth', 130, 90, t, { a: 0.08, d: 0.45, peak: 0.05 }, { vib: 6, vibHz: 13 });
    this.noise(t + 0.3, { a: 0.35, d: 0.4, peak: 0.12 }, 'bandpass', 700, 1800, 0.8);
  }

  /** Hammer on stone: a hard click, grit and a dull knock. */
  smash() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.005;
    this.tone('square', 1400 * (0.9 + Math.random() * 0.2), 700, t, { a: 0.001, d: 0.025, peak: 0.12 });
    this.noise(t, { a: 0.001, d: 0.12, peak: 0.45 }, 'highpass', 2500, 1500, 0.8);
    this.tone('sine', 160, 80, t, { a: 0.002, d: 0.12, peak: 0.4 });
  }

  thud() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.005;
    this.tone('sine', 110, 40, t, { a: 0.003, d: 0.35, peak: 0.7 });
    this.noise(t, { a: 0.003, d: 0.3, peak: 0.35 }, 'lowpass', 900, 200, 0.7);
  }

  /** Picking something up. */
  pickup() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.005;
    this.tone('sine', 520, 780, t, { a: 0.01, d: 0.12, peak: 0.22 }, { echo: true });
    this.tone('sine', 780, 1170, t + 0.07, { a: 0.01, d: 0.14, peak: 0.16 }, { echo: true });
  }

  /** A resource popping into your pack. `k` climbs the pitch for runs. */
  collect(k = 0) {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.005;
    const f = 900 * Math.pow(1.122, k);
    this.tone('sine', f, f * 1.3, t, { a: 0.004, d: 0.07, peak: 0.2 });
  }

  /** One slot filled: a wooden knock, a little brighter each time. */
  slot(k = 0, stone = false) {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.005;
    const f = (stone ? 260 : 200) * Math.pow(1.06, k);
    this.tone('sine', f * 1.6, f * 0.6, t, { a: 0.002, d: 0.14, peak: 0.45 });
    this.noise(t, { a: 0.001, d: 0.05, peak: stone ? 0.35 : 0.22 }, 'bandpass', stone ? 3000 : 1600, stone ? 2000 : 900, 2);
  }

  /** A piece snapping into place: a deep thunk and a warm two-note chime. */
  thunk() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.005;
    this.tone('sine', 150, 55, t, { a: 0.002, d: 0.3, peak: 0.8 });
    this.noise(t, { a: 0.002, d: 0.12, peak: 0.4 }, 'lowpass', 1200, 300, 0.8);
    for (const [f, dt] of [[523, 0.1], [784, 0.2], [1046, 0.3]] as const) {
      this.tone('sine', f, f, t + dt, { a: 0.01, d: 1.1, peak: 0.12 }, { echo: true });
      this.tone('triangle', f * 2, f * 2, t + dt, { a: 0.01, d: 0.5, peak: 0.02 });
    }
  }

  /** The hearth catching: a rising whoosh that settles into crackle. */
  whoosh() {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + 0.01;
    this.noise(t, { a: 0.35, d: 1.1, peak: 0.55 }, 'lowpass', 250, 3200, 0.9);
    this.noise(t + 0.1, { a: 0.4, d: 0.9, peak: 0.2 }, 'bandpass', 500, 1400, 1.5);
    this.tone('sine', 70, 110, t, { a: 0.3, d: 0.9, peak: 0.3 });
    for (let i = 0; i < 14; i++) this.pop(t + 0.5 + Math.random() * 1.8, 0.25);
    for (const [f, dt] of [[392, 0.6], [523, 0.75], [659, 0.9], [784, 1.05]] as const) {
      this.tone('sine', f, f, t + dt, { a: 0.02, d: 1.4, peak: 0.1 }, { echo: true });
    }
  }

  private pop(t: number, level: number) {
    this.noise(t, { a: 0.001, d: 0.015 + Math.random() * 0.02, peak: level * (0.4 + Math.random() * 0.6) }, 'highpass', 1500 + Math.random() * 2500, 1200, 0.7);
  }

  /** Called every frame: the lit hearth's crackle, louder as you get close. */
  update(dt: number) {
    if (!this.ok || this.crackle < 0.02) return;
    this.crackleT -= dt;
    if (this.crackleT <= 0) {
      this.crackleT = 0.03 + Math.random() * 0.25;
      this.pop(this.ctx!.currentTime + 0.01, 0.22 * this.crackle);
      if (Math.random() < 0.08) this.noise(this.ctx!.currentTime + 0.01, { a: 0.2, d: 0.6, peak: 0.05 * this.crackle }, 'lowpass', 400, 700, 0.6);
    }
  }
}
