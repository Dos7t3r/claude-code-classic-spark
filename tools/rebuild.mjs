#!/usr/bin/env node
/**
 * rebuild.mjs — regenerate every derived artifact from a local Claude Desktop install.
 *
 * This is the "clean" path: the repo can be published WITHOUT shipping Anthropic's
 * artwork, because anyone can rebuild it from their own copy of the app.
 *
 * Usage:
 *   node tools/rebuild.mjs <extracted-ion-dir> [--dots <think.loop.webp>] [--out .]
 *
 * Example:
 *   python3 tools/extract-asar.py /Applications/Claude.app/Contents/Resources/ion-dist.asar \
 *           extract ./_ion /assets/v1
 *   node tools/rebuild.mjs ./_ion --dots ./_ion/assets/v1/cfdbc338b-DzLBZ8y5.webp
 *
 * Outputs:
 *   frames/<state>-<NN>.svg   — every frame of every state, standalone vector
 *   animations.json           — frame count + frame duration per state
 *   claude-spark.html         — offline comparison page (self-contained, no deps)
 *
 * Requires Node 18+. No npm dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const flag = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};

const ionDir = positional[0];
if (!ionDir) {
  console.error('usage: node tools/rebuild.mjs <extracted-ion-dir> [--dots <webp>] [--out <dir>]');
  process.exit(1);
}
const outDir = path.resolve(flag('--out') ?? '.');

/** Locate the sprite module by CONTENT, not filename (Vite hashes filenames per build). */
function findSpriteModule(root) {
  const hits = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      if (!name.endsWith('.js') || st.size > 4_000_000) continue;
      const text = fs.readFileSync(p, 'utf8');
      // the module that exports the sprite states, one per turn status.
      // Keys are unquoted in the minified bundle: {thinking:{svg:'<svg ...',frameCount:9,...}}
      const looksLikeSprite = /\b(thinking|orbiting|shimmer)\s*:\s*\{\s*svg\s*:/.test(text);
      if (looksLikeSprite && text.includes('frameCount') && text.includes('export')) hits.push(p);
    }
  };
  walk(root);
  return hits;
}

const hits = findSpriteModule(ionDir);
if (hits.length === 0) {
  console.error('No sprite module found. Did you extract assets/v1 from ion-dist.asar?');
  process.exit(1);
}
if (hits.length > 1) {
  console.error('Ambiguous: found multiple candidates:\n  ' + hits.join('\n  '));
  process.exit(1);
}
const spritePath = hits[0];
console.log('sprite module:', path.relative(outDir, spritePath));

const { animations } = await import(path.resolve(spritePath));
const states = Object.keys(animations);

const ORDER = ['thinking', 'writing', 'waiting', 'shimmer', 'entrance', 'exit', 'orbiting', 'tickle'];
const order = [...ORDER.filter(s => states.includes(s)), ...states.filter(s => !ORDER.includes(s))];

const LABELS = {
  thinking: ['思考中（旧版默认）', 'Thinking (the original)'],
  writing: ['写回复', 'Writing a reply'],
  waiting: ['等待你输入', 'Waiting for you'],
  shimmer: ['文字微光', 'Text shimmer'],
  entrance: ['入场（一次）', 'Entrance (one-shot)'],
  exit: ['退场（一次）', 'Exit (one-shot)'],
  orbiting: ['orbiting 变体', 'Orbiting variant'],
  tickle: ['tickle（一次）', 'Tickle (one-shot)'],
};

// ---------- frames ----------
fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });
const meta = {};
const inner = {};
for (const key of order) {
  const a = animations[key];
  meta[key] = { frames: a.frameCount, frameMs: a.speed, width: a.width, height: a.height };
  inner[key] = a.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  for (let i = 0; i < a.frameCount; i++) {
    const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${i * 100} 100 100" width="100" height="100" fill="#D97757">${inner[key]}</svg>`;
    fs.writeFileSync(path.join(outDir, 'frames', `${key}-${String(i).padStart(2, '0')}.svg`), doc);
  }
}
fs.writeFileSync(path.join(outDir, 'animations.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`wrote ${order.reduce((n, k) => n + meta[k].frames, 0)} SVG frames for ${order.length} states`);

// ---------- html ----------
const dotsPath = flag('--dots');
const dotsB64 = dotsPath && fs.existsSync(dotsPath)
  ? fs.readFileSync(dotsPath).toString('base64')
  : undefined;

const counts = [...new Set(order.map(k => meta[k].frames))];
let keyframes = '';
for (const n of counts) {
  const pct = (100 / n).toFixed(5);
  keyframes += `@keyframes s${n}{0%{opacity:1}${pct}%{opacity:1}${(100 / n + 0.0001).toFixed(5)}%{opacity:0}100%{opacity:0}}\n`;
}

function strip(key, size, phase = 0) {
  const { frames: n, frameMs: ms } = meta[key];
  const cyc = n * ms;
  const svgs = Array.from({ length: n }, (_, i) =>
    `<svg viewBox="0 ${i * 100} 100 100" style="animation:s${n} ${cyc}ms steps(1,end) infinite;animation-delay:calc(-${i * ms}ms - ${phase}ms)"><use href="#g-${key}"/></svg>`
  ).join('');
  return `<span class="spark" style="--s:${size}px">${svgs}</span>`;
}

const defs = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
  order.map(k => `<g id="g-${k}">${inner[k]}</g>`).join('') + '</defs></svg>';

const cards = order.map(k => `<figure class="card"><div class="stage">${strip(k, 64)}</div>
  <figcaption><b>${k}</b><span>${LABELS[k]?.[0] ?? k}</span><em>${meta[k].frames} 帧 · ${meta[k].frameMs}ms/帧</em></figcaption></figure>`).join('');

const nowPane = dotsB64 ? `
  <div class="pane">
    <span class="tag new">现在 · WorkingMark "think.loop"</span>
    <div class="bigs"><span class="dots big"></span><div style="font-size:15px;color:var(--muted)">正在思考</div></div>
    <div class="smallrow">实际尺寸 20px <span class="dots tiny"></span></div>
  </div>` : '';

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Claude Code — Classic Spark</title>
<style>
*{box-sizing:border-box}
:root{--bg:#faf9f5;--ink:#141413;--muted:#6b6862;--line:#e6e2d8;--accent:#D97757;--card:#fffefb}
@media (prefers-color-scheme:dark){:root{--bg:#14100e;--ink:#f0ece4;--muted:#9a938a;--line:#2e2823;--card:#1c1714}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:940px;margin:0 auto;padding:56px 28px 90px}
h1{font-family:"Iowan Old Style",Georgia,serif;font-size:34px;line-height:1.2;margin:0 0 10px;letter-spacing:-.4px}
.lede{color:var(--muted);margin:0 0 6px}
h2{font-size:13px;font-weight:650;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:52px 0 18px;padding-bottom:9px;border-bottom:1px solid var(--line)}
.compare{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:700px){.compare{grid-template-columns:1fr}}
.pane{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 22px 18px}
.tag{display:inline-block;font:11px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;padding:5px 9px;border-radius:999px;margin-bottom:16px}
.old{background:rgba(217,119,87,.13);color:#a8542f}.new{background:var(--line);color:var(--muted)}
.bigs{display:flex;align-items:center;gap:26px;margin-bottom:14px}
.smallrow{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px;padding-top:12px;border-top:1px dashed var(--line)}
.spark{position:relative;display:inline-block;width:var(--s);height:var(--s);flex:0 0 auto}
.spark svg{position:absolute;inset:0;width:100%;height:100%;fill:var(--accent);opacity:0}
.dots{display:inline-block;background-image:url(data:image/webp;base64,${dotsB64 ?? ''});background-repeat:no-repeat;background-size:100% auto;flex:0 0 auto}
.dots.big{width:88px;height:88px;animation:dots88 3663ms steps(110,end) infinite}
.dots.tiny{width:20px;height:20px;animation:dots20 3663ms steps(110,end) infinite}
@keyframes dots88{to{background-position-y:-9680px}}
@keyframes dots20{to{background-position-y:-2200px}}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:820px){.grid{grid-template-columns:repeat(2,1fr)}}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 14px 14px;margin:0;text-align:center}
.stage{display:flex;align-items:center;justify-content:center;height:86px}
figcaption{display:flex;flex-direction:column;gap:2px;font-size:12.5px;line-height:1.45;margin-top:8px}
figcaption b{font:12px ui-monospace,monospace;color:var(--accent)}
figcaption em{color:var(--muted);font-style:normal;font:11px ui-monospace,monospace}
footer{margin-top:58px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:12.5px}
</style></head><body><div class="wrap">${defs}
<h1>Claude Code — Classic Spark</h1>
<p class="lede">旧版的「思考」星芒：9 帧、90ms/帧的 SVG 矢量序列帧。The original thinking spark, resurrected from the shipped bundle.</p>
<h2>现在 vs 原来 · now vs then</h2>
<div class="compare">
  <div class="pane">
    <span class="tag old">原来 · Spark "thinking"</span>
    <div class="bigs">${strip('thinking', 88, 360)}<div style="font-size:15px;color:var(--muted)">Thinking…</div></div>
    <div class="smallrow">实际尺寸 20px ${strip('thinking', 20, 360)}</div>
  </div>${nowPane}
</div>
<h2>旧版全部动作 · every state</h2>
<div class="grid">${cards}</div>
<footer>Generated by tools/rebuild.mjs from a locally installed Claude Desktop. No external dependencies.</footer>
</div>
<style>${keyframes}</style></body></html>`;

fs.writeFileSync(path.join(outDir, 'claude-spark.html'), html);
console.log('wrote claude-spark.html' + (dotsB64 ? ' (with the current dots for comparison)' : ' (no --dots given: comparison pane omitted)'));
