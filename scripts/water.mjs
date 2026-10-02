// How much of the world is water, per seed: node scripts/water.mjs [km=12] [step=40] [png=out.png] [seed ...]
//   Samples a square (12 km a side by default) centred on the start site and prints, per seed:
//   water  the share under the sea's level (sea, fjords, lakes)
//   low    the share of *land* under 3 m (shore flats: a little more water would drown them)
//   reach  the share of the land within 3 km of the start that you can walk to from it dry
//          (ground above 2.2 m, as `WorldGen.route` has it, on the sampling grid)
//   forest the share of the whole square that is wooded (mean grove density: what the tree count follows)
//   lakes  bodies of water that don't touch the square's edge, and the biggest of them (ha)
//   png=   draws each seed's square from above (out-<seed>.png; land you can't reach dry is darker)
// Runs `src/world/worldgen.ts` itself in node (bundled by rolldown), no build needed.
import { rolldown } from 'rolldown';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import zlib from 'node:zlib';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find((s) => s.startsWith(k + '=')); return a ? +a.split('=')[1] : d; };
const KM = num('km', 12), STEP = num('step', 40);
const PNG = args.find((a) => a.startsWith('png='))?.slice(4);
const seeds = args.filter((a) => !a.includes('='));
if (!seeds.length) seeds.push('hilda', '42', 'frost', 'bergen', 'hildaz2', '7', 'fjord', '1', 'troll', 'saga');

const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ow-water-')), 'gen.mjs');
const b = await rolldown({ input: path.join(root, 'scripts/water.entry.ts'), logLevel: 'silent' });
await b.write({ file: tmp, format: 'esm' });
const { WorldGen, seedFromString } = await import(tmp);

const N = Math.round((KM * 1000) / STEP);
let sw = 0, sl = 0, sr = 0, sf = 0;
console.log(`${KM} km square, every ${STEP} m, centred on the start site`);
console.log('seed      water   low    reach  lakes  biggest  forest');
for (const seed of seeds) {
  const gen = new WorldGen(seedFromString(seed)), st = gen.story;
  const h = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) h[j * N + i] = gen.baseHeight(st.x + (i - N / 2) * STEP, st.z + (j - N / 2) * STEP);
  let water = 0, low = 0, wood = 0;
  for (const v of h) { if (v < 0) water++; else if (v < 3) low++; }
  for (let j = 0; j < N; j += 2) for (let i = 0; i < N; i += 2) { const v = h[j * N + i]; if (v > 0) wood += gen.forestDensity(st.x + (i - N / 2) * STEP, st.z + (j - N / 2) * STEP, v) * 4; }
  // Flood fills (4-connected).
  const fill = (start, ok, seen) => {
    const q = [start]; seen[start] = 1;
    let n = 0, edge = false;
    while (q.length) {
      const k = q.pop(), i = k % N, j = (k - i) / N;
      n++;
      if (i === 0 || j === 0 || i === N - 1 || j === N - 1) edge = true;
      for (const m of [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, j > 0 ? k - N : -1, j < N - 1 ? k + N : -1]) if (m >= 0 && !seen[m] && ok(m)) { seen[m] = 1; q.push(m); }
    }
    return { n, edge };
  };
  const dry = new Uint8Array(N * N);
  const c = (N / 2) * N + N / 2;
  fill(c, (m) => h[m] > 2.2, dry);
  const R = 3000 / STEP;
  let near = 0, got = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (Math.hypot(i - N / 2, j - N / 2) > R || h[j * N + i] <= 2.2) continue;
    near++;
    if (dry[j * N + i]) got++;
  }
  const seen = new Uint8Array(N * N);
  let lakes = 0, biggest = 0;
  for (let k = 0; k < N * N; k++) if (!seen[k] && h[k] < 0) {
    const r = fill(k, (m) => h[m] < 0, seen);
    if (!r.edge) { lakes++; biggest = Math.max(biggest, r.n); }
  }
  const wf = water / (N * N), lf = low / (N * N - water), rf = got / near;
  if (PNG) {
    // From above: water, shore flats, land by height, the dry land you can reach from the start (lighter), the start.
    const px = Buffer.alloc(N * (N * 3 + 1));
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const v = h[j * N + i], o = j * (N * 3 + 1) + 1 + i * 3, k = Math.min(1, Math.max(0, v) / 260), r = dry[j * N + i] ? 1 : 0.8;
      const c = v < 0 ? [110 - Math.min(40, -v * 2), 150 - Math.min(40, -v * 2), 195] : v < 3 ? [225 * r, 215 * r, 170 * r] : [(170 + k * 70) * r, (185 + k * 50) * r, (120 + k * 120) * r];
      if (Math.hypot(i - N / 2, j - N / 2) < 3) c[0] = c[1] = c[2] = 0;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
    const chunk = (t, d) => { const b = Buffer.alloc(d.length + 12); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(zlib.crc32(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
    const hd = Buffer.alloc(13); hd.writeUInt32BE(N, 0); hd.writeUInt32BE(N, 4); hd[8] = 8; hd[9] = 2;
    fs.mkdirSync(path.dirname(PNG), { recursive: true });
    fs.writeFileSync(PNG.replace('.png', `-${seed}.png`), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(px)), chunk('IEND', Buffer.alloc(0))]));
  }
  sw += wf; sl += lf; sr += rf; sf += wood / (N * N);
  console.log(`${seed.padEnd(9)} ${(wf * 100).toFixed(1).padStart(5)}% ${(lf * 100).toFixed(1).padStart(5)}% ${(rf * 100).toFixed(0).padStart(5)}% ${String(lakes).padStart(5)} ${((biggest * STEP * STEP) / 1e4).toFixed(0).padStart(7)} ${((wood / (N * N)) * 100).toFixed(1).padStart(6)}%`);
}
console.log(`${'mean'.padEnd(9)} ${((sw / seeds.length) * 100).toFixed(1).padStart(5)}% ${((sl / seeds.length) * 100).toFixed(1).padStart(5)}% ${((sr / seeds.length) * 100).toFixed(0).padStart(5)}% ${' '.repeat(13)} ${((sf / seeds.length) * 100).toFixed(1).padStart(6)}%`);
fs.rmSync(path.dirname(tmp), { recursive: true });
