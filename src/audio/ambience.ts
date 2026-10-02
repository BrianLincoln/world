import type { Sfx } from '../story/audio';

// The music: one sampled loop for outdoor exploration, quiet behind the
// synthesised effects of story/audio.ts. It plays on that engine's
// AudioContext (so the same first-gesture unlock) but on its own gain,
// past the effects' compressor, so a chop never pumps the music.
//
// One piece, on purpose: no beds by place, no air, no night layer, no
// plucks. It's here to be played with and judged; the adaptive soundtrack
// comes after. The file comes from scripts/audio.mjs.

export interface AmbienceState {
  /** Fade the music out and hold it there (the giant's visit, the offering, the dungeon). */
  hush: boolean;
}

const FILE = 'warm_field_v3_exploration_loop';
/** The loop's exact length in seconds (what scripts/audio.mjs prints). */
const LEN = 76;
/** The file has this much of its own tail in front and head behind (scripts/audio.mjs). */
const PAD = 0.5;
/** Seconds to fade all the way in, or out. */
const FADE = 8;
/** Seconds the silent loop keeps its decoded samples (about 30 MB) before letting them go. */
const RELEASE = 45;

export class Ambience {
  /** The music's volume, apart from the effects'. 1 is the file as it was made. */
  readonly gains = { music: 0.35 };
  private bytes: ArrayBuffer | null = null;
  private buf: AudioBuffer | null = null;
  private decoding = false;
  private src: AudioBufferSourceNode | null = null;
  private ctx: AudioContext | null = null;
  /** The fade and the volume. */
  private fade!: GainNode;
  /** Shut while muted or the tab is hidden. */
  private gate!: GainNode;
  /** 0 silent .. 1 fully in. */
  private level = 0;
  private idle = 0;

  constructor(private sfx: Sfx) {
    fetch(`${import.meta.env.BASE_URL}audio/${FILE}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(FILE))))
      .then((b) => (this.bytes = b), () => { /* stays silent */ });
  }

  private graph(ctx: AudioContext) {
    this.ctx = ctx;
    this.fade = ctx.createGain();
    this.fade.gain.value = 0;
    this.gate = ctx.createGain();
    this.gate.gain.value = 0;
    this.fade.connect(this.gate).connect(ctx.destination);
    // Silent in a hidden tab: the frames stop there, the loop wouldn't.
    document.addEventListener('visibilitychange', () => this.shut());
  }

  private shut() {
    this.gate.gain.setTargetAtTime(this.sfx.muted || document.hidden ? 0 : 1, this.ctx!.currentTime, 0.8);
  }

  update(dt: number, s: AmbienceState) {
    const ctx = this.sfx.context;
    if (!ctx) return;
    if (!this.ctx) this.graph(ctx);
    this.shut();
    if (ctx.state !== 'running') return;

    if (!this.src) {
      if (s.hush) return;
      if (!this.buf) {
        if (this.bytes && !this.decoding) {
          this.decoding = true;
          // decodeAudioData takes the buffer it's given, so hand it a copy.
          ctx.decodeAudioData(this.bytes.slice(0)).then((b) => (this.buf = b), () => (this.bytes = null)).finally(() => (this.decoding = false));
        }
        return;
      }
      this.src = ctx.createBufferSource();
      this.src.buffer = this.buf;
      this.src.loop = true;
      this.src.loopStart = PAD;
      this.src.loopEnd = PAD + LEN;
      this.src.connect(this.fade);
      this.src.start(0, PAD);
    }
    // It never restarts while it sounds: only the level moves.
    this.level = Math.min(1, Math.max(0, this.level + (s.hush ? -dt : dt) / FADE));
    // Squared, so the fade is even to the ear and not all in its first second.
    this.fade.gain.setTargetAtTime(this.gains.music * this.level * this.level, ctx.currentTime, 0.05);
    this.idle = this.level > 0 ? 0 : this.idle + dt;
    if (this.idle > RELEASE) {
      this.src.stop();
      this.src.disconnect();
      this.src = this.buf = null;
    }
  }

  /** What's sounding now, by file (tests and tuning). */
  get levels() {
    return this.src ? { [FILE]: +this.level.toFixed(3) } : {};
  }
}
