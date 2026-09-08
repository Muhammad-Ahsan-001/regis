#!/usr/bin/env node
/**
 * Render an InkFlow animated signature to PNG frames for visual review.
 *   node tools/sig-render.cjs <animated.svg> <out-prefix> [bg=#0B1116] [ink-glow=#F2B544]
 * Writes <out-prefix>-final.png plus -033.png and -066.png (draw order check).
 * Requires NODE_PATH pointing at a node_modules that has playwright.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const [svgPath, outPrefix, bg = '#0B1116', glow = '#F2B544'] = process.argv.slice(2);
if (!svgPath || !outPrefix) { console.error('usage: node sig-render.cjs <animated.svg> <out-prefix> [bg] [glow]'); process.exit(1); }
const svg = fs.readFileSync(svgPath, 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:${bg};height:100%;display:grid;place-items:center}
.wrap{width:1000px;max-width:96vw;filter:drop-shadow(0 0 14px ${glow}55) drop-shadow(0 0 2px ${glow}88)}
.wrap svg{width:100%;height:auto;display:block}
</style></head><body><div class="wrap">${svg}</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 560 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  const info = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    const api = svg && svg.inkflow;
    return { hasApi: !!api, methods: api ? Object.keys(api) : [], viewBox: svg && svg.getAttribute('viewBox') };
  });
  const duration = await page.evaluate(() => {
    const m = document.body.innerHTML.match(/"duration":(\d+)/);
    return m ? +m[1] : 3000;
  });
  const seek = async (ms) => {
    await page.evaluate((t) => { const api = document.querySelector('svg').inkflow; if (api) { api.pause(); api.seek(t); } }, ms);
    await page.waitForTimeout(80);
  };
  await seek(duration * 0.33); await page.screenshot({ path: `${outPrefix}-033.png` });
  await seek(duration * 0.66); await page.screenshot({ path: `${outPrefix}-066.png` });
  await seek(duration); await page.screenshot({ path: `${outPrefix}-final.png` });
  console.log(JSON.stringify({ ...info, duration, wrote: [`${outPrefix}-033.png`, `${outPrefix}-066.png`, `${outPrefix}-final.png`] }));
  await browser.close();
})();
