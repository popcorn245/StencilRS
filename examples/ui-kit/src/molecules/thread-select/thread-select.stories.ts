import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { ThreadOption } from './thread-select';

const meta: Meta = {
  title: 'Molecules/ThreadSelect',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '"Post to <thread>" picker. STATELESS — it stores nothing; the host persists ' +
          'the choice per (uid, panelId) and feeds it back as `value`. With `showToday` ' +
          'the daily threads are pinned above the topics. `threads` is an object array, ' +
          'so the stories build the element and assign the property in JS.',
      },
    },
  },
};
export default meta;

const threads: ThreadOption[] = [
  { id: 'd-2026-08-01', title: 'Today', kind: 'daily' },
  { id: 't-kitchen', title: 'Kitchen remodel', kind: 'topic' },
  { id: 't-valheim', title: "Saga of Odin's Trial", kind: 'topic' },
  { id: 't-groceries', title: 'Groceries', kind: 'topic' },
];

interface SelectOpts {
  threads?: ThreadOption[];
  value?: string;
  showToday?: boolean;
  disabled?: boolean;
  label?: string;
}

function picker(opts: SelectOpts = {}): HTMLElement {
  const el = document.createElement('pop-thread-select') as unknown as HTMLElement & Record<string, unknown>;
  el.threads = opts.threads ?? threads;
  el.value = opts.value ?? threads[0].id;
  el.showToday = opts.showToday ?? true;
  el.disabled = opts.disabled ?? false;
  el.label = opts.label ?? 'Post to';
  return el;
}

export const Default: StoryObj = {
  name: 'Default — Today selected',
  render: () => picker(),
};

export const TopicSelected: StoryObj = {
  name: 'Topic selected',
  render: () => picker({ value: 't-kitchen' }),
};

export const Disabled: StoryObj = {
  name: 'Disabled',
  render: () => picker({ disabled: true }),
};

export const NoThreads: StoryObj = {
  name: 'No threads',
  render: () => picker({ threads: [], value: '' }),
};
