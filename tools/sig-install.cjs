#!/usr/bin/env node
/**
 * Install a signature design into the site's assets.
 *   node tools/sig-install.cjs <design.json>
 * Produces assets/signature.animated.svg (welcome screen), assets/signature.static.svg
 * (header mark), assets/signature.timing.json (pen-tip tracking), assets/seal.animated.svg
 * (contact section, separate id prefix so both can live on one page) and
 * assets/signature.inkflow.json (open it in InkFlow Studio to edit).
 * Ink colour is replaced with currentColor so CSS controls it in both themes.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [designPath, aliasPath] = process.argv.slice(2);
if (!designPath) { console.error('usage: node tools/sig-install.cjs <design.json> [alias-design.json]'); process.exit(1); }
const ROOT = 'D:/PORTFOLIO';
const out = path.join(ROOT, 'tools/out');
const assets = path.join(ROOT, 'assets');
const design = JSON.parse(fs.readFileSync(designPath, 'utf8'));
const alias = aliasPath ? JSON.parse(fs.readFileSync(aliasPath, 'utf8')) : null;

function build(doc, idPrefix, key) {
  const tmp = path.join(out, `${key}.design.json`);
  fs.writeFileSync(tmp, JSON.stringify({ ...doc, idPrefix }));
  const r = spawnSync('node', [path.join(ROOT, 'tools/sig-build.cjs'), tmp, key], { encoding: 'utf8', shell: true });
  if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
}
build(design, 'sig', 'signature');
build(design, 'seal', 'seal');
if (alias) build(alias, 'alias', 'alias');

const inkColorsOf = (doc) => new Set([(doc.color || '#eef1ea').toLowerCase(), ...doc.strokes.map((s) => (s.color || '').toLowerCase()).filter(Boolean)]);
const recolor = (doc) => (svg) => {
  let s = svg;
  for (const c of inkColorsOf(doc)) s = s.split(`fill="${c}"`).join('fill="currentColor"').split(`fill:${c}`).join('fill:currentColor');
  // drop the fixed pixel size so the mark scales with its container
  return s.replace(/<svg([^>]*?)\swidth="\d+(?:\.\d+)?"\sheight="\d+(?:\.\d+)?"/, '<svg$1');
};
const copy = (from, to, fn) => { const s = fs.readFileSync(path.join(out, from), 'utf8'); fs.writeFileSync(path.join(assets, to), fn ? fn(s) : s, 'utf8'); };
copy('signature.animated.svg', 'signature.animated.svg', recolor(design));
// the static header mark shares the page with the animated welcome copy, so its ids get their own prefix
copy('signature.static.svg', 'signature.static.svg', (s) => recolor(design)(s).replace(/id="sig-/g, 'id="mark-').replace(/url\(#sig-/g, 'url(#mark-').replace(/href="#sig-/g, 'href="#mark-'));
copy('signature.timing.json', 'signature.timing.json');
copy('signature.inkflow.json', 'signature.inkflow.json');
copy('seal.animated.svg', 'seal.animated.svg', recolor(design));
if (alias) { copy('alias.animated.svg', 'alias.animated.svg', recolor(alias)); copy('alias.inkflow.json', 'alias.inkflow.json'); }
console.log('installed', [...fs.readdirSync(assets).filter((f) => /^(signature|seal|alias)\./.test(f))].join(', '));
