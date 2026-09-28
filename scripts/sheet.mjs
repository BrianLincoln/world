// Contact sheet: node scripts/sheet.mjs out.png img1.png img2.png ...  (2 columns)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const [out, ...imgs] = process.argv.slice(2);
const cells = imgs.map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${path.basename(f)}</figcaption></figure>`).join('');
const html = `<html><body style="margin:0;background:#222;display:grid;grid-template-columns:1fr 1fr;gap:4px;width:1600px;font:14px sans-serif;color:#eee">
<style>figure{margin:0;position:relative}img{width:100%;display:block}figcaption{position:absolute;left:6px;top:4px;background:#0008;padding:1px 6px}</style>${cells}</body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 400 } });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
