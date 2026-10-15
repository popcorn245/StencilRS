import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { CardPayload } from '../thread-card/thread-card-types';

const meta: Meta = {
  title: 'Molecules/ThreadCardList',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Thread Model v2 renderer for a grocery / inventory list card. Tapping a ' +
          "line emits `popCardAction` with `{ actionId: 'check', params: { lineId, " +
          'checked } }` and the header shows an "N left" count. Frozen cards render ' +
          'read-only, struck-through lines. `payload` is an OBJECT, assigned in JS.',
      },
    },
  },
};
export default meta;

/** Build the card, set the object property, and echo emitted actions under it. */
function card(payload: unknown, opts: { liveness?: string; readonly?: boolean } = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width: 360px;';
  const el = document.createElement('pop-thread-card-list') as HTMLElement & {
    payload: unknown;
    liveness: string;
    readonly: boolean;
  };
  el.payload = payload;
  el.liveness = opts.liveness ?? 'live';
  el.readonly = opts.readonly ?? false;

  const echo = document.createElement('pre');
  echo.style.cssText =
    'margin: 0.6rem 0 0; font-size: 0.7rem; white-space: pre-wrap; color: var(--pico-muted-color, #64748b);';
  echo.textContent = 'popCardAction: —';
  el.addEventListener('popCardAction', (e) => {
    echo.textContent = `popCardAction: ${JSON.stringify((e as CustomEvent).detail)}`;
  });

  wrap.appendChild(el);
  wrap.appendChild(echo);
  return wrap;
}

const groceries: CardPayload = {
  title: 'Grocery run',
  subtitle: 'Posted from the kitchen',
  data: {
    postedAt: Date.now() - 45 * 60 * 1000,
    listId: 'grocery',
    lines: [
      { id: 'l1', label: 'Milk', checked: true, qty: '1 gal' },
      { id: 'l2', label: 'Eggs', checked: true, qty: '18' },
      { id: 'l3', label: 'Sourdough', checked: false },
      { id: 'l4', label: 'Coffee beans', checked: false, qty: '12 oz' },
    ],
  },
};

export const Live: StoryObj = {
  name: 'Live — 4 lines, 2 checked',
  render: () => card(groceries),
};

export const Frozen: StoryObj = {
  name: 'Frozen — all checked, read-only',
  render: () =>
    card(
      {
        ...groceries,
        data: {
          ...groceries.data,
          lines: (groceries.data.lines as Record<string, unknown>[]).map((l) => ({ ...l, checked: true })),
        },
      },
      { liveness: 'frozen' },
    ),
};

export const Empty: StoryObj = {
  name: 'Empty list',
  render: () => card({ title: 'Grocery run', data: { postedAt: Date.now(), lines: [] } }),
};

export const Broken: StoryObj = {
  name: 'Error payload',
  render: () => card('not a payload'),
};
