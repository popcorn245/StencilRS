// Scaffold a component: npm run new pop-thing
// Writes src/components/<tag>/<tag>.tsx, .css and .test.ts, exports it from src/index.ts
// (which main.ts imports), and drops an example tag into index.html.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const tag = process.argv[2];
if (!tag || !/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(tag)) {
  console.error('usage: npm run new <tag>   (lowercase, with a dash, e.g. pop-card)');
  process.exit(1);
}
const className = tag.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
const dir = join('src', 'components', tag);
if (existsSync(dir)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });

writeFileSync(
  join(dir, `${tag}.tsx`),
  `import { Component, Event, EventEmitter, Host, Prop, State } from '@stencil/core';

@Component({
  tag: '${tag}',
  styleUrl: '${tag}.css',
  encapsulation: { type: 'shadow' },
})
export class ${className} {
  /** Text to show. */
  @Prop() label: string = '${tag}';

  @State() active = false;

  /** Fired when the component is toggled. */
  @Event() toggled: EventEmitter<boolean>;

  private toggle = () => {
    this.active = !this.active;
    this.toggled.emit(this.active);
  };

  render() {
    return (
      <Host class={{ active: this.active }}>
        <button onClick={this.toggle}>{this.label}</button>
        <slot />
      </Host>
    );
  }
}
`,
);

writeFileSync(
  join(dir, `${tag}.css`),
  `:host {
  display: inline-block;
}

:host(.active) button {
  outline: 2px solid #e53e3e;
}
`,
);

writeFileSync(
  join(dir, `${tag}.test.ts`),
  `import { describe, expect, it } from 'vitest';

import { flush, mount } from '../../test-utils';
import './${tag}';

describe('${tag}', () => {
  it('renders its label', async () => {
    const el = await mount<HTMLElement>('<${tag} label="Hi"></${tag}>');
    expect(el.shadowRoot!.querySelector('button')!.textContent).toBe('Hi');
  });

  it('toggles and emits', async () => {
    const el = await mount<HTMLElement>('<${tag}></${tag}>');
    const seen: boolean[] = [];
    el.addEventListener('toggled', (e) => seen.push((e as CustomEvent<boolean>).detail));
    el.shadowRoot!.querySelector('button')!.click();
    await flush();
    expect(el.classList.contains('active')).toBe(true);
    expect(seen).toEqual([true]);
  });
});
`,
);

appendFileSync('src/index.ts', `export { ${className} } from './components/${tag}/${tag}';\n`);
const html = readFileSync('index.html', 'utf8');
writeFileSync('index.html', html.replace('    <script type="module"', `    <h2>${tag}</h2>\n    <${tag}></${tag}>\n\n    <script type="module"`));

console.log(`created ${dir}/ (${tag}.tsx, ${tag}.css, ${tag}.test.ts) and registered <${tag}>`);
