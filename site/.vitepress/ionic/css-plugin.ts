// The stylesheets of Ionic's components, for the stencilrs Vite plugin.
//
// The plugin turns a component's `styleUrls` into `\0stencil-css:` modules and compiles them itself
// (Sass, then lightningcss, then the Rust scopeCss). Ionic's Sass has rules that no browser accepts,
// such as `::slotted(*) ion-button` (a pseudo-element followed by a selector): Stencil's own build
// drops them, but the plugin's lightningcss call has no `errorRecovery` (nor has @stencil/unplugin's), so the
// first one fails the build. This plugin runs first, gives lightningcss `errorRecovery` and Sass a quiet
// logger (Ionic's `@import`-based Sass prints ~30,000 lines of deprecations), and does the same otherwise:
// same Sass, same scoped CSS from stencilrs' scopeCss.
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scopeCss } from '@popcorn245/stencilrs';
import { transform } from 'lightningcss';
import * as sass from 'sass';

const PREFIX = '\0stencil-css:';

/** The file, tag and encapsulation of a `\0stencil-css:` id (the plugin's parseStencilCssId). */
function parse(id: string) {
  const rest = id.slice(PREFIX.length);
  const q = rest.indexOf('?');
  const stem = q === -1 ? rest : rest.slice(0, q);
  const params = new URLSearchParams(q === -1 ? '' : rest.slice(q + 1));
  return { file: `${stem}.${decodeURIComponent(params.get('__ext') ?? 'css')}`, tag: params.get('tag') ?? '', encapsulation: params.get('encapsulation') ?? 'none' };
}

export function ionicCss(): any {
  let minify = true;
  return {
    name: 'ionic-css',
    enforce: 'pre',
    configResolved(config: any) {
      minify = config.command === 'build';
    },
    load(this: any, id: string) {
      if (!id.startsWith(PREFIX)) return null;
      const { file, tag, encapsulation } = parse(id);
      // only Ionic's own styles; the starter's go through the plugin as before
      if (!file.includes('/examples/ionic/')) return null;
      if (!existsSync(file)) return { code: 'export default () => ""', moduleSideEffects: false };
      let css = readFileSync(file, 'utf8');
      if (/^\.s[ac]ss$/.test(extname(file))) {
        const result = sass.compileString(css, {
          url: new URL(`file://${file}`),
          syntax: file.endsWith('.sass') ? 'indented' : 'scss',
          logger: sass.Logger.silent,
        });
        css = result.css;
        for (const u of result.loadedUrls) if (u.protocol === 'file:') this.addWatchFile(fileURLToPath(u));
      }
      this.addWatchFile(file);
      css = transform({ filename: file, code: Buffer.from(css), minify, errorRecovery: true }).code.toString();
      if (encapsulation === 'scoped' && tag) css = scopeCss(css, `sc-${tag}`, false);
      return { code: `export default () => ${JSON.stringify(css)};` };
    },
  };
}
