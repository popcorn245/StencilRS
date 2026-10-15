import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/CaptureBar',
  parameters: {
    docs: {
      description: {
        component:
          'A zero-friction quick-capture input pinned at the top of Home. Pressing Enter (or the send button) emits a `capture` event with the trimmed text and clears the field (save-and-clear loop). The page wires note creation via the NotesAdapter.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => `<div style="max-width: 520px;"><pop-capture-bar></pop-capture-bar></div>`,
};

export const CustomPlaceholder: StoryObj = {
  name: 'Custom placeholder',
  render: () =>
    `<div style="max-width: 520px;"><pop-capture-bar placeholder="What's on your mind?"></pop-capture-bar></div>`,
};

export const MobileFullWidth: StoryObj = {
  name: 'Mobile (full width)',
  render: () => `<div style="max-width: 360px;"><pop-capture-bar></pop-capture-bar></div>`,
};

export const Interactive: StoryObj = {
  render: () => `
    <div style="max-width: 520px;">
      <pop-capture-bar id="cb-demo"></pop-capture-bar>
      <ul id="cb-log" style="margin-top: 1rem; font-size: 0.85rem; color: var(--pico-muted-color);"></ul>
    </div>
    <script>
      (() => {
        const bar = document.getElementById('cb-demo');
        const log = document.getElementById('cb-log');
        bar.addEventListener('capture', (e) => {
          const li = document.createElement('li');
          li.textContent = 'Captured: ' + e.detail.text;
          log.prepend(li);
        });
      })();
    </script>
  `,
};
