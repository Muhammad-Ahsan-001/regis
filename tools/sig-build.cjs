#!/usr/bin/env node
/**
 * One-shot signature build: design.json -> InkFlow spec -> InkFlow export -> PNG frames.
 *   node D:/PORTFOLIO/tools/sig-build.cjs <design.json> <key> [bg] [glow]
 * Outputs in D:/PORTFOLIO/tools/out/<key>.{animated.svg,static.svg,inkflow.json,timing.json}
 * and D:/PORTFOLIO/tools/out/<key>-{033,066,final}.png. Prints a JSON summary.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const [designPath, key, bg, glow] = process.argv.slice(2);
if (!designPath || !key) { console.error('usage: node sig-build.cjs <design.json> <key> [bg] [glow]'); process.exit(1); }
const ROOT = 'D:/PORTFOLIO';
const INK = 'D:/TOOL_FOR_SVG_FORMATION';
const PW = 'D:/3D BUILDING MAKING/node_modules';
const out = path.join(ROOT, 'tools/out');
fs.mkdirSync(out, { recursive: true });
const spec = path.join(out, `${key}.spec.json`);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) { console.error(`step failed: ${cmd} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`); process.exit(r.status || 1); }
  return r.stdout.trim().split('\n').pop();
}

const author = run('node', [path.join(ROOT, 'tools/sig-author.cjs'), designPath, spec]);
const exp = run('npx', ['vite-node', 'tools/signature/export.ts', spec, out, key], { cwd: INK });
const render = run('node', [path.join(ROOT, 'tools/sig-render.cjs'), path.join(out, `${key}.animated.svg`), path.join(out, key), bg || '#0B1116', glow || '#F2B544'], { env: { ...process.env, NODE_PATH: PW }, cwd: PW });
console.log(JSON.stringify({ author: JSON.parse(author), export: JSON.parse(exp), render: JSON.parse(render), final_png: path.join(out, `${key}-final.png`).replace(/\//g, '\\'), mid_png: path.join(out, `${key}-066.png`).replace(/\//g, '\\') }, null, 1));
