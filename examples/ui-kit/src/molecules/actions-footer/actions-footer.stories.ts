import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Molecules/ActionsFooter',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The tier-aware Cancel/Send pair extracted from the sheet `slot="actions"` ' +
          'and pop-form-dialog footer duplicates. `tier` picks the spacing/order: ' +
          'sheet = full-width stacked-friendly; dialog = right-aligned; dock = ' +
          'compact inline. Both buttons are `type="button"` — submission is driven ' +
          'only by `popSubmit` (the implicit-submit gotcha).',
      },
    },
  },
};
export default meta;

const card = (inner: string, width = '340px') =>
  `<div style="width: ${width}; padding: 1rem; border-radius: var(--radius-card, 22px); background: var(--surface-card, var(--pico-card-background-color));">${inner}</div>`;

const wire = (html: string) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  host.addEventListener('popSubmit', () => console.log('popSubmit'));
  host.addEventListener('popCancel', () => console.log('popCancel'));
  return host;
};

export const Dialog: StoryObj = {
  name: 'Dialog tier (right-aligned)',
  render: () => wire(card(`<pop-actions-footer tier="dialog"></pop-actions-footer>`)),
};

export const Sheet: StoryObj = {
  name: 'Sheet tier (full-width)',
  render: () => wire(card(`<pop-actions-footer tier="sheet"></pop-actions-footer>`)),
};

export const Dock: StoryObj = {
  name: 'Dock tier (compact)',
  render: () => wire(card(`<pop-actions-footer tier="dock"></pop-actions-footer>`, '280px')),
};

export const CustomLabels: StoryObj = {
  render: () => wire(card(`<pop-actions-footer submit-label="Create tag" cancel-label="Back"></pop-actions-footer>`)),
};

export const SubmitDisabled: StoryObj = {
  render: () => wire(card(`<pop-actions-footer submit-disabled></pop-actions-footer>`)),
};

export const Busy: StoryObj = {
  name: 'Busy (spinner-in-button)',
  render: () => wire(card(`<pop-actions-footer busy></pop-actions-footer>`)),
};
