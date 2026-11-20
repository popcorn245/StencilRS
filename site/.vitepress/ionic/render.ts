// Markdown for one Ionic component page, from data/ionic-api.json (made by scripts/components.mjs).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { demosFor, handWritten } from './demos';
import { overviews } from './overviews';

const dataDir = fileURLToPath(new URL('../../data/', import.meta.url));
export const api = JSON.parse(readFileSync(`${dataDir}ionic-api.json`, 'utf8'));
export const diff = JSON.parse(readFileSync(`${dataDir}ionic-api-diff.json`, 'utf8'));

const ionicRepo = `https://github.com/ionic-team/ionic-framework/blob/${api.source.tag}/core/`;
const ionicDocs = 'https://ionicframework.com/docs';

/** Text from a JSDoc comment as one line of markdown: `<` and `{{` escaped outside code (Vue would take them), docs links made absolute. */
export function md(text: string, { block = false } = {}) {
  const parts = text.replace(/\]\(\/docs\//g, `](${ionicDocs}/`).split(/(`[^`]*`)/);
  const out = parts
    .map((p, i) => (i % 2 ? p : p.replace(/</g, '&lt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;').replace(/\|/g, '\\|')))
    .join('')
    .replace(/(`[^`]*`)/g, (c) => c.replace(/\|/g, '\\|'));
  return block ? out.trim() : out.trim().replace(/\n{2,}/g, '<br><br>').replace(/\n/g, ' ');
}

const code = (s: string) => {
  const t = s.replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
  return `<code>${t}</code>`;
};

const dagger = '<sup title="This type comes from Stencil\'s docs-json: stencilrs\' analyze() reports that it is not ported yet.">†</sup>';

function table(head: string[], rows: string[][]) {
  return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

export function pageFor(name: string) {
  const tag = `ion-${name}`;
  const c = api.components[tag];
  const out: string[] = [];
  const overview = overviews[name] ?? '';
  const group = api.groups.find((g: any) => g.tags.includes(tag));
  const sibs = group.tags.filter((t: string) => t !== tag);

  out.push(`# ${tag}`);
  out.push(`${overview}${c.deprecated !== null ? `\n\n::: warning Deprecated\n${md(c.deprecated || 'This component is deprecated.')}\n:::` : ''}`);
  if (c.docs) out.push(md(c.docs, { block: true }));
  const handWrittenDemo = handWritten.includes(name);
  out.push(
    `<p class="ion-meta"><span><b>Section</b> ${group.name}</span><span><b>Encapsulation</b> ${c.encapsulation}</span>` +
      `<span><b>Modes</b> ${c.modes.some((m: string) => m !== 'default') ? 'iOS, MD' : 'one style for both'}</span>` +
      (sibs.length ? `<span><b>See also</b> ${sibs.map((t: string) => `<a href="${'./' + t.replace(/^ion-/, '')}.html"><code>${t}</code></a>`).join(' ')}</span>` : '') +
      `</p>`,
  );

  out.push('## Usage');
  out.push(
    handWrittenDemo
      ? 'Live demos, written for this page. Switch the mode to see Ionic\'s iOS and Material Design styles.'
      : 'A generated demo: the element with content that shows it. Switch the mode to see Ionic\'s iOS and Material Design styles.',
  );
  out.push(`<IonDemos name="${name}" />`);

  out.push('## API');
  const real = c.props;
  if (real.length) {
    out.push('### Properties');
    out.push(
      table(
        ['Property', 'Attribute', 'Type', 'Default', 'Description'],
        real.map((p: any) => [
          `<code>${p.name}</code>${p.required ? ' <i>required</i>' : ''}${p.virtual ? ' <i>virtual</i>' : ''}`,
          p.attribute ? `<code>${p.attribute}</code>` : '',
          code(p.type) + (p.typeFrom === 'docs-json' ? dagger : ''),
          p.default !== null ? code(p.default) : '',
          md(p.docs) + (p.deprecated !== null ? ` <b>Deprecated.</b> ${md(p.deprecated)}` : ''),
        ]),
      ),
    );
  }
  if (c.events.length) {
    out.push('### Events');
    out.push(
      table(
        ['Event', 'Detail', 'Description'],
        c.events.map((e: any) => [
          `<code>${e.name}</code>${e.bubbles ? '' : ' <i>no bubbling</i>'}`,
          code(e.detail) + (e.typeFrom === 'docs-json' ? dagger : ''),
          md(e.docs) + (e.deprecated !== null ? ` <b>Deprecated.</b> ${md(e.deprecated)}` : ''),
        ]),
      ),
    );
  }
  if (c.methods.length) {
    out.push('### Methods');
    out.push(
      table(
        ['Method', 'Signature', 'Description'],
        c.methods.map((m: any) => [
          `<code>${m.name}</code>`,
          code(m.signature) + (m.typeFrom === 'docs-json' ? dagger : ''),
          md(m.docs) +
            (m.params.length ? '<br><br>' + m.params.map((p: any) => `<code>${p.name}</code> ${md(p.docs)}`).join('<br>') : '') +
            (m.returns ? `<br><br><b>Returns</b> ${md(m.returns)}` : '') +
            (m.deprecated !== null ? ` <b>Deprecated.</b> ${md(m.deprecated)}` : ''),
        ]),
      ),
    );
  }
  if (c.slots.length) {
    out.push('### Slots');
    out.push(table(['Name', 'Description'], c.slots.map((s: any) => [s.name ? `<code>${s.name}</code>` : '<i>default</i>', md(s.docs)])));
  }
  if (c.parts.length) {
    out.push('### CSS Shadow Parts');
    out.push(table(['Name', 'Description'], c.parts.map((s: any) => [`<code>${s.name}</code>`, md(s.docs)])));
  }
  if (c.cssProps.length) {
    out.push('### CSS Custom Properties');
    out.push(
      table(
        ['Name', 'Description'],
        c.cssProps.map((s: any) => [`<code>${s.name}</code>${s.modes.length ? ` <i>${s.modes.map((m: string) => (m === 'md' ? 'MD' : 'iOS')).join(', ')}</i>` : ''}`, md(s.docs)]),
      ),
    );
  }
  if (c.fallbacks.length) {
    out.push(
      `<p class="ion-fallback">† ${c.fallbacks.length === 1 ? 'This type comes' : 'These types come'} from Stencil's docs-json: stencilrs' <code>analyze()</code> reports that ${c.fallbacks.length === 1 ? 'it is' : 'they are'} not ported yet (<a href="../guide/quirks.html">quirk 18</a>).</p>`,
    );
  }

  out.push('## Source');
  out.push(
    `From [Ionic Framework](https://github.com/ionic-team/ionic-framework) ${api.source.version} (MIT): [\`core/${c.file}\`](${ionicRepo}${c.file}), migrated to Stencil v5 and compiled in this page by stencilrs. ` +
      `Ionic's own docs for it: [ionicframework.com/docs](${ionicDocs}/api/${name}).`,
  );
  return out.join('\n\n');
}

export const names = Object.keys(api.components).map((t) => t.replace(/^ion-/, '')).sort();
