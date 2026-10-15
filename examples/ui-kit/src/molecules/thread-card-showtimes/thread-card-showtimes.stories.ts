import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { CardPayload } from '../thread-card/thread-card-types';

const meta: Meta = {
  title: 'Molecules/ThreadCardShowtimes',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Thread Model v2 renderer for a movie showtimes card. THEATER-FIRST: the ' +
          'venue is the heading of each group and the times hang under it as chips. ' +
          'It never renders ticket links. Both actions are navigational, so they ' +
          'survive a freeze. `payload` is an OBJECT, assigned in JS.',
      },
    },
  },
};
export default meta;

/** Build the card, set the object property, and wrap it at panel width. */
function card(payload: unknown, opts: { liveness?: string; readonly?: boolean } = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width: 360px;';
  const el = document.createElement('pop-thread-card-showtimes') as HTMLElement & {
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

const today = new Date().toISOString().slice(0, 10);

const showtimes: CardPayload = {
  title: 'Showtimes',
  data: {
    date: today,
    movie: 'Dune: Part Three',
    timezone: 'America/Chicago',
    theaters: [
      {
        name: 'Alamo Drafthouse — Lakeline',
        address: '14028 US-183, Austin, TX',
        times: ['1:15 PM', '4:40 PM', '8:05 PM'],
      },
      {
        name: 'AMC Barton Creek 14',
        address: '2901 Capital of Texas Hwy, Austin, TX',
        times: ['12:30 PM', '3:50 PM', '7:10 PM', '10:25 PM'],
      },
    ],
  },
};

export const Live: StoryObj = {
  name: 'Live — today, 2 theaters',
  render: () => card(showtimes),
};

export const Frozen: StoryObj = {
  name: 'Frozen — past date',
  render: () =>
    card(
      { ...showtimes, data: { ...showtimes.data, date: '2026-07-04' } },
      { liveness: 'frozen' },
    ),
};

export const Empty: StoryObj = {
  name: 'Empty — no theaters found',
  render: () => card({ title: 'Showtimes', data: { date: today, movie: 'Obscure Indie Film', theaters: [] } }),
};

export const Broken: StoryObj = {
  name: 'Error payload',
  render: () => card(null),
};
