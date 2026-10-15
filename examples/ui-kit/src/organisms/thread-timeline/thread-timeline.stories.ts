import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { ThreadItem } from './thread-timeline-types';

const meta: Meta = {
  title: 'Organisms/ThreadTimeline',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The Thread Model v2 timeline. `items` arrive PRE-SORTED from the server and ' +
          'are never re-sorted here. Cards render through `pop-thread-card` using the ' +
          'INJECTED `renderers` map (cardType → `pop-*` tag), so ui-kit holds no card ' +
          'registry. `items`/`renderers` are objects, so the stories build the element ' +
          'and assign properties in JS.',
      },
    },
  },
};
export default meta;

const RENDERERS: Record<string, string> = {
  timer: 'pop-thread-card-timer',
  task: 'pop-thread-card-task',
  list: 'pop-thread-card-list',
  showtimes: 'pop-thread-card-showtimes',
};

const ME = 'u-kat';
const T0 = Date.now() - 6 * 60 * 60 * 1000;

const items: ThreadItem[] = [
  {
    id: 'i1',
    threadId: 't1',
    kind: 'message',
    authorUid: ME,
    authorKind: 'human',
    text: 'Starting dinner — pizza goes in now.',
    createdAt: T0,
  },
  {
    id: 'i2',
    threadId: 't1',
    kind: 'card',
    authorUid: null,
    authorKind: 'bot',
    cardType: 'timer',
    card: {
      title: 'Pizza in the oven',
      subtitle: '20 minutes',
      data: { fireAt: Date.now() + 12 * 60 * 1000, mode: 'timer', durationMs: 20 * 60 * 1000 },
    },
    liveness: 'live',
    actions: [{ actionId: 'dismiss', label: 'Dismiss', icon: 'close-circle-outline', mutating: true }],
    createdAt: T0 + 1000,
  },
  {
    id: 'i3',
    threadId: 't1',
    kind: 'card',
    authorUid: null,
    authorKind: 'panel',
    sourcePanel: 'tasks',
    cardType: 'task',
    card: {
      title: 'Take the recycling out',
      subtitle: 'Due today',
      data: { status: 'open', dueAt: Date.now() + 3 * 60 * 60 * 1000 },
      assignees: [{ uid: 'u-bobby', displayName: 'Bobby' }],
    },
    liveness: 'live',
    checkable: true,
    itemStatus: 'open',
    actions: [{ actionId: 'complete', label: 'Complete', icon: 'checkmark-outline', mutating: true }],
    createdAt: T0 + 2000,
  },
  {
    id: 'i4',
    threadId: 't1',
    kind: 'card',
    authorUid: null,
    authorKind: 'panel',
    sourcePanel: 'grocery',
    cardType: 'list',
    card: {
      title: 'Grocery run',
      data: {
        postedAt: T0,
        lines: [
          { id: 'l1', label: 'Mozzarella', checked: true },
          { id: 'l2', label: 'Basil', checked: false },
          { id: 'l3', label: 'Tomatoes', checked: false, qty: '2 cans' },
        ],
      },
    },
    liveness: 'live',
    createdAt: T0 + 3000,
  },
  {
    id: 'i5',
    threadId: 't1',
    kind: 'card',
    authorUid: null,
    authorKind: 'bot',
    cardType: 'showtimes',
    card: {
      title: 'Dune: Part Three',
      subtitle: 'Alamo Drafthouse',
      data: {
        theater: 'Alamo Drafthouse',
        movie: 'Dune: Part Three',
        showings: [{ startsAt: Date.now() + 5 * 60 * 60 * 1000, format: 'IMAX' }],
      },
    },
    liveness: 'frozen',
    createdAt: T0 + 4000,
  },
  {
    id: 'i6',
    threadId: 't1',
    kind: 'message',
    authorUid: 'u-bobby',
    authorKind: 'human',
    text: 'Got the basil, skipping the tomatoes.',
    replyToItemId: 'i4',
    createdAt: T0 + 5000,
  },
  {
    id: 'i7',
    threadId: 't1',
    kind: 'message',
    authorUid: ME,
    authorKind: 'human',
    text: 'Recycling handled.',
    itemStatus: 'done',
    checkable: true,
    createdAt: T0 + 6000,
  },
  {
    id: 'i8',
    threadId: 't1',
    kind: 'message',
    authorUid: null,
    authorKind: 'system',
    text: 'Thread archived reminder',
    itemStatus: 'dismissed',
    createdAt: T0 + 7000,
  },
];

interface TimelineOpts {
  items?: ThreadItem[];
  canParticipate?: boolean;
  loadingOlder?: boolean;
}

function timeline(opts: TimelineOpts = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'max-width: 620px; height: 640px; display: flex;';
  const el = document.createElement('pop-thread-timeline') as unknown as HTMLElement & Record<string, unknown>;
  el.items = opts.items ?? items;
  el.currentUid = ME;
  el.canParticipate = opts.canParticipate ?? true;
  el.renderers = RENDERERS;
  el.loadingOlder = opts.loadingOlder ?? false;
  (el as HTMLElement).style.flex = '1 1 auto';
  wrap.appendChild(el);
  return wrap;
}

export const Mixed: StoryObj = {
  name: 'Mixed timeline — messages, all four card types, a reply',
  render: () => timeline(),
};

export const Viewer: StoryObj = {
  name: 'Viewer — canParticipate=false, no buttons',
  render: () => timeline({ canParticipate: false }),
};

export const Empty: StoryObj = {
  name: 'Empty',
  render: () => timeline({ items: [] }),
};

export const LoadingOlder: StoryObj = {
  name: 'Loading older',
  render: () => timeline({ loadingOlder: true }),
};
