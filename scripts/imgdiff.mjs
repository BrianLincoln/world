// How two shots differ: node scripts/imgdiff.mjs a.png b.png [out.png] [x,y,w,h]
// Prints how many pixels changed (by more than 2/255 in any channel, and by
// more than 16), the largest change, and where the changes sit; with
// out.png, writes a, b and the difference (x8, on grey) one above the other,
// of the whole frame or of the region given.
import { chromium } from 'playwright';
import fs from 'node:fs';
const [a, b, out, region] = process.argv.slice(2);
const uri = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
const br = await chromium.launch();
const page = await br.newPage({ viewport: { width: 800, height: 600 } });
const res = await page.evaluate(async ([ua, ub, region]) => {
  const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
  const [ia, ib] = [await load(ua), await load(ub)];
  const [x0, y0, w, h] = region ? region.split(',').map(Number) : [0, 0, ia.width, ia.height];
  const px = (im) => { const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.drawImage(im, -x0, -y0); return g.getImageData(0, 0, w, h); };
  const A = px(ia), B = px(ib);
  const c = document.createElement('canvas');
  c.width = w; c.height = h * 3;
  const g = c.getContext('2d');
  g.putImageData(A, 0, 0); g.putImageData(B, 0, h);
  const D = g.createImageData(w, h);
  let n2 = 0, n16 = 0, max = 0, minY = h, maxY = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    let m = 0;
    for (let k = 0; k < 3; k++) { const d = B.data[i + k] - A.data[i + k]; m = Math.max(m, Math.abs(d)); D.data[i + k] = Math.max(0, Math.min(255, 128 + d * 8)); }
    D.data[i + 3] = 255;
    if (m > 2) { n2++; const y = Math.floor(i / 4 / w); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    if (m > 16) n16++;
    max = Math.max(max, m);
  }
  g.putImageData(D, 0, h * 2);
  document.body.style.margin = '0';
  document.body.replaceChildren(c);
  return { w, h, n2, n16, max, minY, maxY };
}, [uri(a), uri(b), region ?? null]);
console.log(`${res.n2} px differ (${(100 * res.n2 / (res.w * res.h)).toFixed(2)}%), ${res.n16} by more than 16, largest ${res.max}; rows ${res.minY}-${res.maxY}`);
if (out && out.endsWith('.png')) await (await page.$('canvas')).screenshot({ path: out });
await br.close();
