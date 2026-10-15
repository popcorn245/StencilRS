import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { CardAction, CardAssignee, CardPayload } from './thread-card-types';

const meta: Meta = {
  title: 'Molecules/ThreadCard',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The Thread Model v2 card WRAPPER. Owns the chrome (header, assignee chips, ' +
          'action row, frozen treatment) and mounts an INJECTED `pop-*` renderer tag ' +
          'inside it. An unknown or missing renderer degrades to the fallback face — it ' +
          'never renders blank. `payload`/`actions`/`assignees` are objects, so these ' +
          'stories build the element and assign properties in JS.',
      },
    },
  },
};
export default meta;

interface CardOpts {
  cardType?: string;
  liveness?: string;
  actions?: CardAction[];
  assignees?: CardAssignee[];
  readonly?: boolean;
  renderer?: string;
}

/** Build the wrapper, set the object properties, and frame it at panel width. */
function card(payload: unknown, opts: CardOpts = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width: 380px;';
  const el = document.createElement('pop-thread-card') as unknown as HTMLElement & Record<string, unknown>;
  el.cardType = opts.cardType ?? 'timer';
  el.payload = payload;
  el.liveness = opts.liveness ?? 'live';
  el.actions = opts.actions ?? [];
  el.assignees = opts.assignees ?? [];
  el.readonly = opts.readonly ?? false;
  el.renderer = opts.renderer ?? 'pop-thread-card-timer';
  wrap.appendChild(el);
  return wrap;
}

const timerPayload: CardPayload = {
  title: 'Pizza in the oven',
  subtitle: 'Started from the kitchen',
  data: {
    fireAt: Date.now() + 20 * 60 * 1000,
    mode: 'timer',
    durationMs: 20 * 60 * 1000,
  },
};

const actions: CardAction[] = [
  { actionId: 'complete', label: 'Complete', icon: 'checkmark-outline', mutating: true },
  { actionId: 'assign', label: 'Assign', icon: 'person-add-outline', mutating: true },
  { actionId: 'open', label: 'Open panel', icon: 'open-outline', mutating: false },
];

const assignees: CardAssignee[] = [
  { uid: 'u1', displayName: 'Kat' },
  { uid: 'u2', displayName: 'Bobby' },
];

export const Live: StoryObj = {
  name: 'Live — with actions',
  render: () => card(timerPayload, { actions, assignees }),
};

export const Frozen: StoryObj = {
  name: 'Frozen — mutating actions dropped',
  render: () =>
    card(
      {
        title: 'Pizza in the oven',
        subtitle: 'Started from the kitchen',
        data: { fireAt: Date.now() - 60 * 60 * 1000, mode: 'timer', durationMs: 20 * 60 * 1000 },
      },
      { liveness: 'frozen', actions, assignees },
    ),
};

export const Readonly: StoryObj = {
  name: 'Readonly — viewer',
  render: () => card(timerPayload, { actions, assignees, readonly: true }),
};

export const UnknownRenderer: StoryObj = {
  name: 'Unknown renderer — fallback face',
  render: () => {
    // The host maps cardType → tag; a MISS yields no `renderer`, which is what an
    // unknown card type looks like from in here. A malformed tag falls back too.
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width: 380px; display: grid; gap: 0.75rem;';
    wrap.appendChild(
      card(
        { title: 'Snout ticket SNO-141', subtitle: 'Linear · In Progress', data: { status: 'wip' } },
        { cardType: 'snout', renderer: '', actions },
      ),
    );
    wrap.appendChild(
      card(
        { title: 'Bad renderer tag', subtitle: 'renderer="totally-not-ours"', data: { x: 1 } },
        { cardType: 'mystery', renderer: 'totally-not-ours', actions },
      ),
    );
    return wrap;
  },
};
