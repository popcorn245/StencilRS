import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { FieldSpec } from './field-logic';

const meta: Meta = {
  title: 'Components/Molecules/Field',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'ONE labeled form field: a `FieldSpec` → the right widget. text/select ' +
          'compose pop-fillable-field; number is clamped to min/max; boolean is a ' +
          'pop-switch row; location is pop-location; depth/persist are the research ' +
          'composites; unknown types fall back to the default slot (label/hint/' +
          'required chrome kept, slotted `valueChange` re-emitted). Emits ' +
          '`valueChange` with `{ key, value }`. `spec` and `value` are properties — ' +
          'set them in JS.',
      },
    },
  },
};
export default meta;

function make(spec: FieldSpec, value?: unknown, slotHtml?: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'width: 340px; padding: 1rem; border-radius: var(--radius-card, 22px); background: var(--surface-card, var(--pico-card-background-color)); color: var(--ink, inherit);';
  const el = document.createElement('pop-field') as HTMLElement & { spec: FieldSpec; value?: unknown };
  el.spec = spec;
  if (value !== undefined) el.value = value;
  if (slotHtml) el.innerHTML = slotHtml;

  const echo = document.createElement('pre');
  echo.style.cssText =
    'margin: 0.75rem 0 0; font-size: 0.72rem; color: var(--ink-muted, var(--pico-muted-color)); white-space: pre-wrap;';
  echo.textContent = 'valueChange: —';
  el.addEventListener('valueChange', (e) => {
    const d = (e as CustomEvent<{ key: string; value: unknown }>).detail;
    echo.textContent = `valueChange: ${d.key} = ${JSON.stringify(d.value)}`;
  });

  wrap.append(el, echo);
  return wrap;
}

export const Text: StoryObj = {
  render: () => make({ key: 'topic', label: 'Topic', type: 'text', required: true, placeholder: 'What to research…' }),
};

export const Select: StoryObj = {
  name: 'Select (optional → "—" placeholder)',
  render: () =>
    make({
      key: 'model',
      label: 'Model',
      type: 'select',
      optional: true,
      hint: 'optional',
      options: [
        { value: 'gemma', label: 'Gemma' },
        { value: 'claude', label: 'Claude' },
      ],
    }),
};

export const NumberClamped: StoryObj = {
  name: 'Number (clamped 1–10)',
  render: () => make({ key: 'count', label: 'Sources', type: 'number', min: 1, max: 10, step: 1 }, '5'),
};

export const DateField: StoryObj = {
  name: 'Date',
  render: () => make({ key: 'when', label: 'When', type: 'date' }, '2026-07-09'),
};

export const Boolean: StoryObj = {
  name: 'Boolean (pop-switch)',
  render: () => make({ key: 'webOnly', label: 'Web only', type: 'boolean', hint: 'skip local files' }, 'true'),
};

export const Location: StoryObj = {
  render: () => make({ key: 'loc', label: 'Location', type: 'location', defaultValue: '63385' }),
};

export const Depth: StoryObj = {
  name: 'Depth composite (research slider)',
  render: () => make({ key: 'depth', label: 'Depth', type: 'depth' }, { depth: 'standard', maxSources: '' }),
};

export const Persist: StoryObj = {
  name: 'Persist composite (note / knowledge base)',
  render: () => make({ key: 'persist', label: 'Save result', type: 'persist' }, 'note'),
};

export const SlotFallback: StoryObj = {
  name: 'Unknown type → slot fallback',
  render: () => {
    const host = make(
      { key: 'movie', label: 'Movie', type: 'movie', hint: 'app-supplied widget', required: true },
      undefined,
      `<input placeholder="(fake movie typeahead)" style="width:100%; margin:0;" />`,
    );
    // The fake slotted widget emits valueChange like a real custom widget would.
    const input = host.querySelector('input')!;
    input.addEventListener('input', () => {
      input.dispatchEvent(new CustomEvent('valueChange', { detail: input.value, bubbles: true }));
    });
    return host;
  },
};

export const Invalid: StoryObj = {
  name: 'Invalid (required feedback)',
  render: () => {
    const host = make({ key: 'topic', label: 'Topic', type: 'text', required: true });
    (host.querySelector('pop-field') as HTMLElement & { invalid: boolean }).invalid = true;
    return host;
  },
};
