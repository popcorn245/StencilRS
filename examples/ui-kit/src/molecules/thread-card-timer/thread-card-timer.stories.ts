import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { CardPayload } from '../thread-card/thread-card-types';

const meta: Meta = {
  title: 'Molecules/ThreadCardTimer',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Thread Model v2 renderer for a timer / reminder card. Live cards compose ' +
          'the `pop-countdown` atom; frozen cards show the fired face and drop every ' +
          'mutating action. `payload` is an OBJECT, so these stories build the element ' +
          'and assign the property in JS rather than passing an attribute.',
      },
    },
  },
};
export default meta;

/** Build the card, set the object property, and wrap it at panel width. */
function card(payload: unknown, opts: { liveness?: string; readonly?: boolean } = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width: 360px;';
  const el = document.createElement('pop-thread-card-timer') as HTMLElement & {
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

const livePayload: CardPayload = {
  title: 'Pizza in the oven',
  subtitle: 'Started from the kitchen',
  data: {
    fireAt: Date.now() + 20 * 60 * 1000,
    mode: 'timer',
    durationMs: 20 * 60 * 1000,
    label: 'Pizza',
  },
  assignees: [{ uid: 'u1', displayName: 'Kat' }],
};

export const Live: StoryObj = {
  name: 'Live — counting down',
  render: () => card(livePayload),
};

export const Frozen: StoryObj = {
  name: 'Frozen — fired',
  render: () =>
    card(
      {
        title: 'Pizza in the oven',
        data: { fireAt: Date.now() - 60 * 60 * 1000, mode: 'timer', durationMs: 20 * 60 * 1000 },
      },
      { liveness: 'frozen' },
    ),
};

export const Readonly: StoryObj = {
  name: 'Readonly — public render',
  render: () => card(livePayload, { readonly: true }),
};

export const Broken: StoryObj = {
  name: 'Empty / error payload',
  render: () => card({ title: '', data: null }),
};
