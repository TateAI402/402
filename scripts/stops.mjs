// Screenshot every stop of the home flight at desktop and phone sizes.
//   BASE=<url> node scripts/stops.mjs [out-dir]
import { launch } from './browser.mjs';
import fs from 'node:fs';
const base = (process.env.BASE || 'http://localhost:5606').replace(/\/$/, '');
const out = process.argv[2] || 'artifacts/stops';
fs.mkdirSync(out, { recursive: true });
const b = await launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [w, h] of [[1366, 768], [390, 844]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(base + '/', { waitUntil: 'load' }); await p.waitForTimeout(3500);
  const span = await p.evaluate(() => { const t = document.querySelector('.flight'); return t.offsetHeight - innerHeight; });
  for (let i = 0; i < 9; i++) {
    await p.evaluate((y) => scrollTo(0, y), Math.round((span * i) / 8)); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/${w}-${i}.jpg`, type: 'jpeg', quality: 80 });
  }
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(w, 'overflow', over, 'errors', errs.slice(0, 4));
}
await b.close();
