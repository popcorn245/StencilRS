import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Atoms/Switch',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Accessible toggle switch (`role="switch"`, `aria-checked`, Space/Enter ' +
          'toggles) extracted from the hub\'s bespoke hub-switch. Emits `popChange` ' +
          'with the new boolean. Used standalone and by `pop-field type="boolean"`.',
      },
    },
  },
};
export default meta;

const row = (inner: string) =>
  `<div style="display:flex; flex-direction:column; gap: 12px; padding: 1.25rem; background: var(--surface-canvas, var(--pico-background-color));">${inner}</div>`;

const make = (html: string) => {
  const host = document.createElement('div');
  host.innerHTML = row(html);
  host.addEventListener('popChange', (e) => console.log('popChange', (e as CustomEvent<boolean>).detail));
  return host;
};

const labelled = (label: string, attrs = '') =>
  `<label style="display:flex; align-items:center; justify-content:space-between; gap:1rem; width: 260px; color: var(--ink, inherit); font-size: 0.9rem;">
     <span>${label}</span><pop-switch label="${label}" ${attrs}></pop-switch>
   </label>`;

export const Off: StoryObj = {
  render: () => make(labelled('Web only')),
};

export const On: StoryObj = {
  render: () => make(labelled('Web only', 'checked')),
};

export const Disabled: StoryObj = {
  render: () => make(labelled('Locked off', 'disabled') + labelled('Locked on', 'checked disabled')),
};

export const SwitchRow: StoryObj = {
  name: 'Form rows',
  render: () =>
    make(
      labelled('Save as note', 'checked') + labelled('Add to knowledge base') + labelled('Notify me', 'checked'),
    ),
};
