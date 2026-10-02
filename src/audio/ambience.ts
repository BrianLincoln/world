import type { Sfx } from '../story/audio';

// The music: one sampled loop for outdoor exploration, quiet behind the
// synthesised effects of story/audio.ts. It plays on that engine's
// AudioContext (so the same first-gesture unlock) but on its own gain,
// past the effects' compressor, so a chop never pumps the music.
//
// One piece, on purpose: no beds by place, no air, no night layer, no
// plucks. It's here to be played with and judged; the adaptive soundtrack
// comes after. The file comes from scripts/audio.mjs.
//
// And the giant's visit, which has music of its own: three pieces played
// once each, one into the next (`CUES`), over the same effects. What says
// which is the visit itself (`Visit.music`); here they only cross-fade.
// The loop is out while they sound, and for `REST` after the last.

export interface AmbienceState {
  /** Fade the music out and hold it there (the giant's visit, the offering, the dungeon). */
  hush: boolean;
  /** The scene music that should be sounding (each piece plays once, as this changes), or null. */
  cue: Cue | null;
  /** One may be asked for before long: fetch them. */
  soon: boolean;
}

/** The pieces of the giant's visit: seconds each takes to come in, which is what the one before goes out over. */
const CUES = { giant_emergence: 1, giant_village: 3, giant_aftermath: 5 };
export type Cue = keyof typeof CUES;
/** A piece dropped with nothing after it goes out over this long (s). */
const DROP = 4;
/** Only the last piece ends in silence: the others go out over their last this long if nothing has taken over (s). */
const TAIL = 2;
/** Seconds with no music at all after the last piece, before the loop starts back in. */
const REST = 4;

interface Voice { cue: Cue; src: AudioBufferSourceNode; gain: GainNode; level: number; ends: number; out: number; done: boolean }

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
  /**
   * The music's volume, apart from the effects'. 1 is the file as it was made.
   * `scene`: the giant's pieces, times that (they're mastered 3 dB or so under the loop).
   */
  readonly gains = { music: 0.35, scene: 1.4 };
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
  /** The scene pieces: their files, decoded, what's sounding, the one asked for, and the one not yet begun. */
  private cueBytes: Partial<Record<Cue, ArrayBuffer>> | null = null;
  private cueBufs: Partial<Record<Cue, AudioBuffer>> | null = null;
  private decodingCue = new Set<Cue>();
  private voices: Voice[] = [];
  private asked: Cue | null = null;
  private due: Cue | null = null;
  private rest = 0;

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

  /** The scene pieces: begins the one asked for, fades the rest, and counts out the quiet after. */
  private score(dt: number, s: AmbienceState, ctx: AudioContext) {
    if ((s.soon || s.cue) && !this.cueBytes) {
      const bytes: Partial<Record<Cue, ArrayBuffer>> = (this.cueBytes = {});
      for (const c of Object.keys(CUES) as Cue[]) {
        fetch(`${import.meta.env.BASE_URL}audio/${c}.mp3`)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(c))))
          .then((b) => (bytes[c] = b), () => { /* that one stays silent */ });
      }
    }
    if (s.cue !== this.asked) {
      this.asked = this.due = s.cue;
      if (!s.cue) for (const v of this.voices) v.out ||= DROP;
    }
    if (this.due) {
      // All three are decoded at the first, so the later ones come in on their moment.
      const bufs = (this.cueBufs ??= {});
      for (const c of Object.keys(CUES) as Cue[]) {
        const b = this.cueBytes?.[c];
        if (!b || this.decodingCue.has(c) || bufs[c]) continue;
        this.decodingCue.add(c);
        ctx.decodeAudioData(b.slice(0)).then((d) => { if (this.cueBufs === bufs) bufs[c] = d; }, () => { /* silent */ }).finally(() => this.decodingCue.delete(c));
      }
      const buf = this.cueBufs?.[this.due];
      if (buf) {
        const cue = this.due, src = ctx.createBufferSource(), gain = ctx.createGain();
        for (const v of this.voices) v.out ||= CUES[cue];
        gain.gain.value = 0;
        src.buffer = buf;
        src.connect(gain).connect(this.gate);
        const v: Voice = { cue, src, gain, level: 0, ends: ctx.currentTime + buf.duration, out: 0, done: false };
        src.onended = () => (v.done = true);
        src.start();
        this.voices.push(v);
        this.due = null;
      }
    }
    const had = this.voices.length > 0;
    for (const v of this.voices) {
      v.level = Math.min(1, Math.max(0, v.level + dt / (v.out ? -v.out : CUES[v.cue])));
      if (v.out && v.level <= 0) v.done = true;
      const tail = v.cue === 'giant_aftermath' ? 1 : Math.min(1, Math.max(0, (v.ends - ctx.currentTime) / TAIL));
      // Equal power, so one piece into the next holds its level through the middle.
      v.gain.gain.setTargetAtTime(this.gains.music * this.gains.scene * Math.sin(v.level * Math.PI / 2) * tail, ctx.currentTime, 0.05);
      if (v.done) { v.src.onended = null; try { v.src.stop(); } catch { /* already ended */ } v.gain.disconnect(); }
    }
    this.voices = this.voices.filter((v) => !v.done);
    if (had && !this.voices.length) { this.rest = REST; this.cueBufs = null; }
    else if (!had) this.rest = Math.max(0, this.rest - dt);
  }

  update(dt: number, s: AmbienceState) {
    const ctx = this.sfx.context;
    if (!ctx) return;
    if (!this.ctx) this.graph(ctx);
    this.shut();
    if (ctx.state !== 'running') return;
    this.score(dt, s, ctx);
    const hush = s.hush || this.voices.length > 0 || this.rest > 0;

    if (!this.src) {
      if (hush) return;
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
    this.level = Math.min(1, Math.max(0, this.level + (hush ? -dt : dt) / FADE));
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
    const l: Record<string, number> = this.src ? { [FILE]: +this.level.toFixed(3) } : {};
    for (const v of this.voices) l[v.cue] = +v.level.toFixed(3);
    return l;
  }
}
