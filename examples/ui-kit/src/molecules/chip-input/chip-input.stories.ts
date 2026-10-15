import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/ChipInput',
  parameters: {
    docs: {
      description: {
        component:
          'pop-chip-input — a string-array editor rendered as removable chips with autocomplete. Suggestions may carry an optional `emoji` + `color` (ChipSuggestion), which tint the selected chip and decorate the dropdown row. With `allow-create`, an unmatched draft shows a "＋ Create «text»" row that emits `createChip` so the host can persist a new tag then add its id to `value`. Backward-compatible: plain `{id,label}` suggestions and free-text/strict behavior are unchanged. Adopters: tasks-app tags/assignees, hub Clippings tags (shared tags collection).',
      },
    },
  },
};

export default meta;

function frame(inner: string) {
  return `
    <div style="width: 360px; padding: 16px; border: 1px solid var(--line, #ddd); border-radius: 12px; background: var(--surface-card, #fff);">
      ${inner}
    </div>
  `;
}

const TAG_SUGGESTIONS = [
  { id: 'work', label: 'Work', emoji: '💼', color: '#3b82f6' },
  { id: 'home', label: 'Home', emoji: '🏠', color: '#22c55e' },
  { id: 'urgent', label: 'Urgent', emoji: '🔥', color: '#ef4444' },
  { id: 'reading', label: 'Reading', emoji: '📚', color: '#a855f7' },
];

export const Basic: StoryObj = {
  render: () =>
    frame(
      `<pop-chip-input placeholder="Add a tag…" suggestions='${JSON.stringify([
        { id: 'design', label: 'design' },
        { id: 'review', label: 'review' },
      ])}'></pop-chip-input>`,
    ),
};

export const WithEmojiAndColor: StoryObj = {
  render: () => {
    const el = frame(`<pop-chip-input id="tags" placeholder="Tag this…"></pop-chip-input>`);
    setTimeout(() => {
      const node = document.getElementById('tags') as any;
      if (node) {
        node.suggestions = TAG_SUGGESTIONS;
        node.value = ['work', 'urgent'];
      }
    });
    return el;
  },
};

export const AllowCreate: StoryObj = {
  render: () => {
    const el = frame(`<pop-chip-input id="tags-create" allow-create placeholder="Type a new tag…"></pop-chip-input>`);
    setTimeout(() => {
      const node = document.getElementById('tags-create') as any;
      if (node) {
        node.suggestions = TAG_SUGGESTIONS;
        node.addEventListener('createChip', (e: CustomEvent) => {
          // Demo: assign a color + push a fresh suggestion + select it.
          const label = e.detail.label;
          const id = label.toLowerCase();
          node.suggestions = [...node.suggestions, { id, label, emoji: '🏷️', color: '#64748b' }];
          node.value = [...(node.value ?? []), id];
        });
      }
    });
    return el;
  },
};
