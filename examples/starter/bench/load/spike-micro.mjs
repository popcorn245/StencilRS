// Spike: what does defining a tag with 500 server-rendered, waiting instances cost, and how much of it is
// the browser's? Floor = a bare `class extends HTMLElement`. usage: node spike-micro.mjs [cpuRate] [reps]
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const RATE = Number(process.argv[2] ?? 4), REPS = Number(process.argv[3] ?? 15);
const runtime = readFileSync(new URL('../../../../runtime.js', import.meta.url), 'utf8');
const server = createServer((req, res) => {
  if (req.url === '/runtime.js') return res.writeHead(200, { 'content-type': 'text/javascript' }).end(runtime);
  res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body><script type="rs/state" e="click">{}</script></body>');
}).listen(0);
await new Promise((r) => server.on('listening', r));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
await page.goto(`http://localhost:${server.address().port}/`);
const res = await page.evaluate(async (REPS) => {
  const { Base, define } = await import('/runtime.js');
  const N = 500;
  const fill = (tag) => {
    const c = document.createElement('div');
    c.innerHTML = Array.from({ length: N }, (_, i) => `<${tag} s-rs="${i + 1}" class="sc-x"><div class="card"><h3>a</h3></div></${tag}>`).join('');
    document.body.append(c);
  };
  const med = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
  const out = { bare: [], card: [], cardnoctor: [] };
  const mk = (kind, i) => {
    const tag = `m-${kind}-${i}`;
    if (kind === 'bare') return [tag, class extends HTMLElement {}, false];
    const Card = class extends Base {
      constructor(...a) {
        super(...a);
        if (kind === 'card') {
          this.name = '';
          this.price = 0;
          this.likes = 0;
        }
      }
    };
    define(Card, { tag, members: { name: [65, 'name'], price: [129, 'price'], likes: [2] } }, false);
    return [tag, Card, true];
  };
  for (let i = 0; i < REPS; i++) {
    for (const kind of ['bare', 'card', 'cardnoctor']) {
      const [tag, Cstr] = mk(kind, i);
      fill(tag);
      const t = performance.now();
      customElements.define(tag, Cstr);
      out[kind].push(performance.now() - t);
      document.body.replaceChildren(document.querySelector('script'));
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { med: med(v), min: Math.min(...v), max: Math.max(...v) }]));
}, REPS);
console.log(`cpu x${RATE}, 500 elements, customElements.define (ms):`);
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(12), v.med.toFixed(2), `[${v.min.toFixed(2)}-${v.max.toFixed(2)}]`);
await browser.close();
server.close();
