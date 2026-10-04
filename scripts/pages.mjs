// Screenshot the tool pages at desktop and phone. BASE=<url> node scripts/pages.mjs [out-dir]
import { launch } from './browser.mjs';
import fs from 'node:fs';
const base = (process.env.BASE || 'http://localhost:5606').replace(/\/$/, '');
const out = process.argv[2] || 'artifacts/pages'; fs.mkdirSync(out, { recursive: true });
const b = await launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [w, h] of [[1366, 768], [390, 844]]) for (const path of ['/terminal', '/privacy', '/agent', '/vault', '/docs']) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + path, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  await p.screenshot({ path: `${out}/${w}${path.replace(/\//g, '-')}.jpg`, type: 'jpeg', quality: 78 });
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over || errs.length) console.log(w, path, 'overflow', over, errs.slice(0, 2));
  await p.context().close();
}
await b.close(); console.log('done');
