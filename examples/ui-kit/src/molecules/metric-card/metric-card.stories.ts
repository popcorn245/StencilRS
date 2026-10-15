import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-metric-card — a reusable, tappable stat tile (glyph + title + big value +
 * sub-line) with an optional tap-to-log affordance. Domain-agnostic: the host
 * hands it strings and listens for `popCardTap`. Use the theme toolbar for dark.
 */
const meta: Meta = {
  title: 'Components/Molecules/MetricCard',
  argTypes: {
    glyph: { control: 'text' },
    label: { control: 'text' },
    value: { control: 'text' },
    sub: { control: 'text' },
    active: { control: 'boolean' },
    loggable: { control: 'boolean' },
  },
  parameters: {
    actions: { handles: ['popCardTap'] },
    docs: {
      description: {
        component:
          'pop-metric-card — a compact stat tile. When `loggable`, it doubles as a log entry point: a "+" badge (top-right) turns brand-blue on hover/focus and rotates to a "✕" when `active`, and a "Tap to log" hint slides up on hover. The whole card is a button emitting `popCardTap` with its `cardKey`. Reusable beyond Fit (Popcoin, Inventory counts, …).',
      },
    },
  },
};

export default meta;

function card(opts: {
  glyph?: string;
  label?: string;
  value?: string;
  sub?: string;
  active?: boolean;
  loggable?: boolean;
  cardKey?: string;
}) {
  return `
    <pop-metric-card
      ${opts.glyph ? `glyph="${opts.glyph}"` : ''}
      ${opts.label ? `label="${opts.label}"` : ''}
      ${opts.value ? `value="${opts.value}"` : ''}
      ${opts.sub ? `sub="${opts.sub}"` : ''}
      ${opts.active ? 'active="true"' : ''}
      ${opts.loggable ? 'loggable="true"' : ''}
      ${opts.cardKey ? `card-key="${opts.cardKey}"` : ''}
    ></pop-metric-card>
  `;
}

/** Mounts a card (or several) in a bounded, tile-sized grid. */
function stage(inner: string, cols = 1) {
  return `
    <div style="max-width: ${cols > 1 ? 460 : 150}px; padding: 16px; background: var(--surface-canvas, #eef3fb); border-radius: 16px;">
      <div style="display:grid; grid-template-columns:repeat(${cols},1fr); gap:10px;">
        ${inner}
      </div>
    </div>
  `;
}

/** A single loggable card (default). */
export const Default: StoryObj = {
  name: 'Default — loggable',
  render: (args) =>
    stage(
      card({
        glyph: args.glyph,
        label: args.label,
        value: args.value,
        sub: args.sub,
        active: args.active,
        loggable: args.loggable,
      }),
    ),
  args: { glyph: '⚖️', label: 'Weight', value: '150.7 lbs', sub: 'Jul 15', active: false, loggable: true },
};

/** Active/pressed — the "+" badge rotates to a "✕" and the surface tints. */
export const Active: StoryObj = {
  name: 'Active (form open)',
  render: () => stage(card({ glyph: '🩸', label: 'Blood sugar', value: '101', sub: 'mg/dL · random', active: true, loggable: true })),
};

/** A plain stat tile with the tap-to-log affordance OFF (still tappable). */
export const NotLoggable: StoryObj = {
  name: 'Not loggable (plain stat)',
  render: () => stage(card({ glyph: '📊', label: 'BMI', value: '21', sub: 'normal', loggable: false })),
};

/** The Fit 6-card grid — verifies long titles ("Blood sugar", "Workouts") clear
 *  the "+" badge and values fit on one line. */
export const Grid: StoryObj = {
  name: 'Grid (Fit cards)',
  render: () =>
    stage(
      [
        card({ glyph: '⚖️', label: 'Weight', value: '150.7 lbs', sub: 'Jul 15', loggable: true, cardKey: 'weight' }),
        card({ glyph: '🔥', label: 'Body fat', value: '14.7%', sub: 'Jul 15', loggable: true, cardKey: 'bodyfat' }),
        card({ glyph: '📊', label: 'BMI', value: '21', sub: 'normal', loggable: true, cardKey: 'bmi' }),
        card({ glyph: '🩸', label: 'Blood sugar', value: '101', sub: 'mg/dL · random', active: true, loggable: true, cardKey: 'bg' }),
        card({ glyph: '🍎', label: 'Calories today', value: '0', sub: 'kcal', loggable: true, cardKey: 'calories' }),
        card({ glyph: '🏃', label: 'Workouts', value: '0', sub: 'last 30d', loggable: true, cardKey: 'workout' }),
      ].join(''),
      3,
    ),
};
