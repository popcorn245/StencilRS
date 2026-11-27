// Feature test: which standards-based ways of sharing a shadow root's styles this Chromium supports.
//   node spike/dsd-styles/feature-test.mjs
import { chromium } from 'playwright';

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', ...(process.env.CHROME_ARGS?.split(' ') ?? [])] });
console.log('browser', b.version());
const p = await b.newPage();
const probe = () => {
  const d = document.querySelector('div');
  const s = d?.shadowRoot;
  const q = s?.querySelector('p');
  return { shadow: !!s, color: q ? getComputedStyle(q).color : null, adopted: s?.adoptedStyleSheets?.length };
};
const tests = {
  'declarative CSS module: <style type=module specifier> + shadowrootadoptedstylesheets': `<style type="module" specifier="a">.x{color:rgb(1,2,3)}</style><div><template shadowrootmode="open" shadowrootadoptedstylesheets="a"><p class="x">hi</p></template></div>`,
  '<link> in a declarative shadow root (data: URL)': `<div><template shadowrootmode="open"><link rel="stylesheet" href="data:text/css,.x{color:rgb(1,2,3)}"><p class="x">hi</p></template></div>`,
};
for (const [k, html] of Object.entries(tests)) {
  await p.setContent(html);
  await p.waitForTimeout(300);
  console.log(k, JSON.stringify(await p.evaluate(probe)));
}
console.log(
  JSON.stringify(
    await p.evaluate(() => ({
      templateShadowRootAdoptedStyleSheets: 'shadowRootAdoptedStyleSheets' in HTMLTemplateElement.prototype,
      shadowRootAdoptedStyleSheetsIdl: 'adoptedStyleSheets' in ShadowRoot.prototype,
    }))
  )
);
await b.close();
