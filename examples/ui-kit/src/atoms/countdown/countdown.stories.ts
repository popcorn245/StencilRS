import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Atoms/Countdown',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Ticking H/M/S countdown to a local-clock `deadline` (epoch ms). Emits ' +
          '`popCountdownDone` once when the deadline is crossed while mounted (the ' +
          'latch re-arms when the deadline changes — e.g. a snooze). Built for the ' +
          'hub Reminders panel header; callers convert server time to local terms ' +
          'first (localNow + (serverTarget − serverNow)) so clock skew never lies.',
      },
    },
  },
};
export default meta;

const wrap = (inner: string) => {
  const host = document.createElement('div');
  host.innerHTML = `<div style="display:flex; flex-direction:column; gap:12px; padding:1.25rem; font-size:1rem; background: var(--surface-canvas, var(--pico-background-color));">${inner}</div>`;
  host.addEventListener('popCountdownDone', (e) =>
    console.log('popCountdownDone', (e as CustomEvent<{ deadline: number }>).detail),
  );
  return host;
};

export const CountingDown: StoryObj = {
  render: () =>
    wrap(
      `<pop-countdown label="⏰ Call mom" deadline="${Date.now() + 3725_000}"></pop-countdown>
       <pop-countdown label="⏰ Take the salmon out" deadline="${Date.now() + 95_000}"></pop-countdown>`,
    ),
};

export const CrossingZeroSoon: StoryObj = {
  render: () =>
    wrap(
      `<pop-countdown label="⏰ Test alarm" deadline="${Date.now() + 8_000}"></pop-countdown>
       <p style="color: var(--ink-muted, gray); font-size: 0.85rem; margin: 0;">Watch the console — popCountdownDone fires once at zero, then the face flips to overdue.</p>`,
    ),
};

export const Overdue: StoryObj = {
  render: () => wrap(`<pop-countdown label="⏰ Water the plants" deadline="${Date.now() - 272_000}"></pop-countdown>`),
};

export const Idle: StoryObj = {
  render: () => wrap(`<pop-countdown idle-text="No upcoming reminders"></pop-countdown>`),
};
