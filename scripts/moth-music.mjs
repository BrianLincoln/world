// The Moon Hall's music, by ear, in real time: what sounds (and how loud) as its events happen.
//   node scripts/moth-music.mjs [seed=hilda]
// Down the well; out into the hall; the last stone coming right (the lamp, her flight down); on to her back;
// and out. The events are the dungeon's own (`MoonHall.music`); getting about is by the dev hooks.
// When each falls in a played game: `scripts/moth.mjs <dir> quest` prints it.
// Uses the build in dist/, or in $DIST.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const seed = process.argv.slice(2).find((a) => a.startsWith('seed='))?.slice(5) ?? 'hilda';
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(root, process.env.DIST ?? 'dist', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const W = (ms) => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);
await page.goto(`http://localhost:${server.address().port}/?seed=${seed}&ui=0&mobs=0&drak=0&fresh=1`);
for (let i = 0; i < 240; i++) { if (await ev(() => window.__ow?.ready())) break; await W(250); }
await W(1000);
// A gesture, for the AudioContext.
await page.mouse.click(480, 270); await page.keyboard.press('w');
const t0 = Date.now();
const watch = async (secs, what) => {
  console.log(`-- ${what}`);
  for (let t = 0; t < secs; t += 1) {
    await W(1000);
    const s = await ev(() => { const o = window.__ow, h = o.hall(); return { music: h?.music ?? null, levels: o.ambience.levels, show: h ? +h.debug.show.toFixed(1) : null }; });
    console.log(' ', ((Date.now() - t0) / 1000).toFixed(1).padStart(5), (s.music ?? '-').padEnd(24), JSON.stringify(s.levels), s.show >= 0 ? `show ${s.show}` : '');
  }
};
await watch(3, 'above ground');
await ev(() => { const o = window.__ow; o.secondDone(); o.ring3().setOpen(); });
await W(500);
// (The real way down: the arms let you into the well.)
await ev(() => window.__ow.enterHall());
await watch(6, 'let down the well: the way in');
await ev(() => window.__ow.hall().goTo('hall'));
await watch(6, 'out into the hall (and the first look at her)');
await ev(() => window.__ow.hall().debugSolve(false));
await watch(3, 'three stones right: nothing changes');
await ev(() => window.__ow.hall().debugSolve(true));
await watch(18, 'the last stone: the lamp, her flight down, her gladness');
const on = await ev(() => { const o = window.__ow, h = o.hall(); o._body.pos.copy(h.she.pos); o._body.pos.x += 1.5; o.mountNearest(); return o.mode(); });
console.log('   mode:', on);
await watch(7, 'on her back');
await ev(() => window.__ow.leaveHall());
await watch(7, 'out');
await browser.close(); server.close();
