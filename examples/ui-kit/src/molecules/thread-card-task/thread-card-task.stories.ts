import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { CardPayload } from '../thread-card/thread-card-types';

const meta: Meta = {
  title: 'Molecules/ThreadCardTask',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Thread Model v2 renderer for a task card. "Complete" and "Reassign" mutate ' +
          'and vanish once the card is frozen; "Open in Tasks" is navigational and ' +
          'survives the freeze. Assignees are always shown by display NAME. `payload` ' +
          'is an OBJECT, so these stories assign it as a property in JS.',
      },
    },
  },
};
export default meta;

/** Build the card, set the object property, and wrap it at panel width. */
function card(payload: unknown, opts: { liveness?: string; readonly?: boolean } = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width: 360px;';
  const el = document.createElement('pop-thread-card-task') as HTMLElement & {
    payload: unknown;
    liveness: string;
    readonly: boolean;
  };
  el.payload = payload;
  el.liveness = opts.liveness ?? 'live';
  el.readonly = opts.readonly ?? false;
  wrap.appendChild(el);
  return wrap;
}

const openTask: CardPayload = {
  title: 'Take the recycling out',
  subtitle: 'Household',
  data: {
    taskId: 't-1042',
    status: 'open',
    dueDate: '2026-08-05',
    priority: 'high',
    questTitle: 'Weekly reset',
  },
  assignees: [
    { uid: 'u1', displayName: 'Kat' },
    { uid: 'u2', displayName: 'Ben' },
  ],
};

export const Live: StoryObj = {
  name: 'Live — open task',
  render: () => card(openTask),
};

export const Frozen: StoryObj = {
  name: 'Frozen — done (Open in Tasks survives, Complete is gone)',
  render: () =>
    card(
      { ...openTask, data: { ...openTask.data, status: 'done' } },
      { liveness: 'frozen' },
    ),
};

export const Readonly: StoryObj = {
  name: 'Readonly — public render',
  render: () => card(openTask, { readonly: true }),
};

export const Broken: StoryObj = {
  name: 'Empty / error payload',
  render: () => card(undefined),
};
