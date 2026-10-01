import type { Sfx } from '../story/audio';

// The ambient soundtrack: sampled loops and one-shots, mixed quietly behind
// the synthesised effects of story/audio.ts. It plays on that engine's
// AudioContext (so the same first-gesture unlock) but on its own bus, past
// the effects' compressor, so a chop never pumps the music.
//
// Four things are mixed, each on its own bus (`gains`):
//   bed    one tonal loop at a time, picked by place; slow crossfades
//   air    unpitched outdoor air, day against night
//   layer  tonal loops laid over the bed by state (night, for now)
//   pluck  a sparse one-shot from the bed's set, every 20-60 s
// A new place is a row in BEDS, a new state layer a row in LAYERS, and what
// they read is a field of `AmbienceState`, filled in main.ts from the game's
// own state. The files come from scripts/audio.mjs.

export interface AmbienceState {
  /** 0 day .. 1 deep night (`Environment.sky.night`). */
  night: number;
  /** In the warmth of home: by the lit cabin, or in the village while its hearths burn. */
  home: boolean;
  /** Hold the music back (the giant's visit). The air stays. */
  hush: boolean;
}

type Bus = 'bed' | 'air' | 'layer' | 'pluck';

/** Every loop file has this much of its own tail in front and head behind (scripts/audio.mjs). */
const PAD = 0.5;
/** Seconds for one bed to give way to another. */
const BED_FADE = 15;
/** Seconds a silent loop keeps its decoded samples (about 40 MB a minute) before letting them go. */
const RELEASE = 45;

const WARM = ['pluck_warm_01', 'pluck_warm_02', 'pluck_warm_03', 'pluck_warm_04'];

/** Tonal beds, first match wins. `len` is the loop's exact length in seconds. */
const BEDS: { file: string; len: number; plucks: string[]; when(s: AmbienceState): boolean }[] = [
  { file: 'bed_home', len: 111, plucks: WARM, when: (s) => s.home },
  { file: 'bed_woods', len: 103, plucks: WARM, when: () => true },
];

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Loops that follow a state: `level` is their gain, 0..1. */
const LAYERS: { file: string; len: number; bus: Bus; level(s: AmbienceState): number }[] = [
  // Equal power, so the air doesn't dip half way through dusk.
  { file: 'air_day', len: 73, bus: 'air', level: (s) => Math.cos(s.night * Math.PI * 0.5) },
  { file: 'air_night', len: 81, bus: 'air', level: (s) => Math.sin(s.night * Math.PI * 0.5) },
  { file: 'layer_night', len: 67, bus: 'layer', level: (s) => smooth(0.1, 0.9, s.night) },
];

const url = (file: string) => `${import.meta.env.BASE_URL}audio/${file}.mp3`;
const load = (file: string) => fetch(url(file)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(file))));

/**
 * One seamless loop. The file is fetched at once and kept packed; it's
 * decoded when first wanted and let go again after a while silent.
 */
class Loop {
  target = 0;
  level = 0;
  private bytes: ArrayBuffer | null = null;
  private buf: AudioBuffer | null = null;
  private src: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private decoding = false;
  private idle = 0;

  constructor(readonly file: string, private len: number, private power: boolean) {
    load(file).then((b) => (this.bytes = b), () => { /* stays silent */ });
  }

  get playing() { return !!this.src; }

  /** Move toward `target`, taking `fade` seconds for the whole way. */
  step(ctx: AudioContext, out: AudioNode, dt: number, fade: number) {
    if (!this.src) {
      if (this.target <= 0) return;
      if (!this.buf) {
        if (this.bytes && !this.decoding) {
          this.decoding = true;
          // decodeAudioData takes the buffer it's given, so hand it a copy.
          ctx.decodeAudioData(this.bytes.slice(0)).then((b) => (this.buf = b), () => (this.bytes = null)).finally(() => (this.decoding = false));
        }
        return;
      }
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      this.src = ctx.createBufferSource();
      this.src.buffer = this.buf;
      this.src.loop = true;
      this.src.loopStart = PAD;
      this.src.loopEnd = PAD + this.len;
      this.src.connect(this.gain).connect(out);
      this.src.start(0, PAD);
    }
    const d = dt / fade;
    this.level = this.level < this.target ? Math.min(this.target, this.level + d) : Math.max(this.target, this.level - d);
    this.gain!.gain.setTargetAtTime(this.power ? Math.sin(this.level * Math.PI * 0.5) : this.level, ctx.currentTime, 0.05);
    this.idle = this.level > 0 || this.target > 0 ? 0 : this.idle + dt;
    if (this.idle > RELEASE) {
      this.src.stop();
      this.src.disconnect();
      this.gain!.disconnect();
      this.src = this.gain = this.buf = null;
    }
  }
}

export class Ambience {
  /** The mix. 1 is a file as it was made. The air is cut hard: as made it was too much, day and night. */
  readonly gains = { master: 0.5, bed: 0.7, air: 0.3, layer: 0.7, pluck: 0.6 };
  private beds = BEDS.map((b) => new Loop(b.file, b.len, true));
  private layers = LAYERS.map((l) => new Loop(l.file, l.len, false));
  private pluckBytes = new Map<string, ArrayBuffer>();
  private plucks = new Map<string, AudioBuffer>();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bus!: Record<Bus, GainNode>;
  private hush = 0;
  private pluckIn = 0;
  private lastPluck = '';
  private ringing = false;

  constructor(private sfx: Sfx) {
    for (const f of new Set(BEDS.flatMap((b) => b.plucks))) load(f).then((b) => this.pluckBytes.set(f, b), () => { /* never picked */ });
    this.nextPluck();
  }

  private nextPluck() { this.pluckIn = 20 + Math.random() * 40; }

  private graph(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    const bus = () => { const g = ctx.createGain(); g.connect(this.master); return g; };
    this.bus = { bed: bus(), air: bus(), layer: bus(), pluck: bus() };
    // Silent in a hidden tab: the frames stop there, the loops wouldn't.
    document.addEventListener('visibilitychange', () => this.level());
  }

  private level() {
    this.master.gain.setTargetAtTime(this.sfx.muted || document.hidden ? 0 : this.gains.master, this.ctx!.currentTime, 0.8);
  }

  update(dt: number, s: AmbienceState) {
    const ctx = this.sfx.context;
    if (!ctx) return;
    if (!this.ctx) this.graph(ctx);
    const now = ctx.currentTime;
    this.level();
    if (ctx.state !== 'running') return;

    this.hush = Math.min(1, Math.max(0, this.hush + (s.hush ? dt : -dt) / 4));
    const open = 1 - this.hush;
    this.bus.bed.gain.setTargetAtTime(this.gains.bed * open, now, 0.1);
    this.bus.air.gain.setTargetAtTime(this.gains.air, now, 0.1);
    this.bus.layer.gain.setTargetAtTime(this.gains.layer * open, now, 0.1);
    this.bus.pluck.gain.setTargetAtTime(this.gains.pluck, now, 0.1);

    const pick = BEDS.findIndex((b) => b.when(s));
    this.beds.forEach((b, i) => (b.target = i === pick ? 1 : 0));
    // The new bed waits for its samples, so the old one never drops out
    // under it. With nothing to cross from (the start), it comes up quicker.
    const ready = this.beds[pick].playing;
    const alone = !this.beds.some((b, i) => i !== pick && b.level > 0);
    this.beds.forEach((b, i) => {
      if (i !== pick && !ready) b.target = b.level;
      b.step(ctx, this.bus.bed, dt, alone ? 4 : BED_FADE);
    });
    // The states behind these move slowly themselves; the fade only softens a jump (the debug clock).
    this.layers.forEach((l, i) => { l.target = LAYERS[i].level(s); l.step(ctx, this.bus[LAYERS[i].bus], dt, 3); });

    for (const [f, b] of this.pluckBytes) {
      this.pluckBytes.delete(f);
      ctx.decodeAudioData(b).then((buf) => this.plucks.set(f, buf), () => { /* never picked */ });
    }
    if (s.hush || this.ringing || !ready) return;
    this.pluckIn -= dt;
    if (this.pluckIn > 0) return;
    this.nextPluck();
    const choice = BEDS[pick].plucks.filter((f) => this.plucks.has(f) && f !== this.lastPluck);
    if (choice.length) this.pluck(ctx, choice[Math.floor(Math.random() * choice.length)]);
  }

  /** What's sounding now, by file (tests and tuning). */
  get levels() {
    const o: Record<string, number> = {};
    [...this.beds, ...this.layers].forEach((l) => { if (l.playing) o[l.file] = +l.level.toFixed(3); });
    return o;
  }

  /** One pluck, somewhere off to a side and at its own distance, so no two land alike. */
  private pluck(ctx: AudioContext, file: string) {
    const src = ctx.createBufferSource();
    src.buffer = this.plucks.get(file)!;
    const g = ctx.createGain();
    g.gain.value = 0.6 + Math.random() * 0.4;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() - 0.5;
    src.connect(g).connect(pan).connect(this.bus.pluck);
    this.ringing = true;
    this.lastPluck = file;
    src.onended = () => { this.ringing = false; pan.disconnect(); };
    src.start();
  }
}
