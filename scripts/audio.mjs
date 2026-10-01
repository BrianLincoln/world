// Turns the ambient audio pack's WAVs (150 MB, not in the repo) into the MP3s
// the game ships in public/audio.
//
//   node scripts/audio.mjs [pack folder]
//
// MP3 adds a little silence at both ends, which would click at a loop's seam.
// So each loop is written with its own tail in front and its own head behind
// (PAD seconds of each): the file is periodic all the way through, and the
// game loops a window exactly one period long inside it (see `PAD` and `len`
// in src/audio/ambience.ts, which must match what this prints). One-shots go
// through as they are. preview_reference_only.wav is never converted.
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PAD = 0.5;
const LOOPS = ['bed_woods', 'bed_home', 'air_day', 'air_night', 'layer_night'];
const SHOTS = ['pluck_warm_01', 'pluck_warm_02', 'pluck_warm_03', 'pluck_warm_04'];

const src = process.argv[2] ?? join(homedir(), 'Downloads/fjellheim_audio_implementation_pack');
const out = new URL('../public/audio/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const seconds = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const mp3 = (name, filter) => {
  const to = join(out, `${name}.mp3`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(src, `${name}.wav`), ...filter, '-c:a', 'libmp3lame', '-q:a', '4', to]);
  return (statSync(to).size / 1e6).toFixed(2);
};

for (const name of LOOPS) {
  const len = seconds(join(src, `${name}.wav`));
  const wrap = `[0:a]asplit=3[a][b][c];[a]atrim=start=${len - PAD},asetpts=PTS-STARTPTS[tail];[c]atrim=end=${PAD},asetpts=PTS-STARTPTS[head];[tail][b][head]concat=n=3:v=0:a=1`;
  console.log(`${name}: len ${len} s, ${mp3(name, ['-filter_complex', wrap])} MB`);
}
for (const name of SHOTS) console.log(`${name}: ${mp3(name, [])} MB`);
