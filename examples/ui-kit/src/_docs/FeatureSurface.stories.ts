import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { FieldSpec } from '../molecules/field/field-logic';

/**
 * Feature Surface — the kitchen-sink integration story for the bucket-bot
 * feature pipeline component set (the playbook's canonical visual reference):
 *
 *   tile grid (pop-tile) → tap → pop-presenter (all three tiers via the
 *   viewport toolbar) → pop-field stack (every type incl. a slot-fallback
 *   fake widget) → pop-async-view (cycle states) → pop-actions-footer.
 *
 * All fake data, no network. Verify in light + dark via the theme toolbar.
 */
const meta: Meta = {
  title: 'Components/Feature Surface',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Kitchen-sink assembly of the feature-surface set: a pop-tile grid opens a ' +
          'pop-presenter (sheet <768 / dialog 768–1199 / dock ≥1200 — resize to see ' +
          'each tier) containing a pop-field for every type (including the unknown-' +
          'type slot fallback), a pop-async-view cycling states, and a ' +
          'pop-actions-footer. All fake data, no network.',
      },
    },
  },
};
export default meta;

const FIELDS: { spec: FieldSpec; value?: unknown }[] = [
  { spec: { key: 'topic', label: 'Topic', type: 'text', required: true, placeholder: 'What to research…' } },
  {
    spec: {
      key: 'model',
      label: 'Model',
      type: 'select',
      hint: 'optional',
      options: [
        { value: 'gemma', label: 'Gemma' },
        { value: 'claude', label: 'Claude' },
      ],
    },
  },
  { spec: { key: 'count', label: 'Sources', type: 'number', min: 1, max: 10, step: 1 }, value: '5' },
  { spec: { key: 'when', label: 'When', type: 'date' }, value: '2026-07-09' },
  { spec: { key: 'webOnly', label: 'Web only', type: 'boolean' }, value: '' },
  { spec: { key: 'loc', label: 'Location', type: 'location', defaultValue: '63385' } },
  { spec: { key: 'depth', label: 'Depth', type: 'depth' }, value: { depth: 'standard', maxSources: '' } },
  { spec: { key: 'persist', label: 'Save result', type: 'persist' }, value: 'none' },
];

function buildSurface(): HTMLElement {
  const host = document.createElement('div');
  host.style.cssText =
    'min-height: 100vh; padding: 1.25rem; background: var(--surface-canvas, var(--pico-background-color)); color: var(--ink, inherit);';

  host.innerHTML = `
    <h3 style="margin: 0 0 0.75rem; font-size: 1rem;">Quick tiles — tap one to open the presenter</h3>
    <div id="grid" style="display:flex; gap: 14px; flex-wrap: wrap; margin-bottom: 1rem;"></div>
    <div id="chips" style="display:flex; gap: 10px; flex-wrap: wrap; margin-bottom: 1.25rem;"></div>
    <pop-presenter id="presenter" heading="🔎 Research"></pop-presenter>
    <pre id="log" style="font-size: 0.72rem; color: var(--ink-muted, inherit);">events: —</pre>
  `;

  const grid = host.querySelector('#grid')!;
  const chips = host.querySelector('#chips')!;
  const presenter = host.querySelector('#presenter') as HTMLElement & { open: boolean };
  const log = host.querySelector('#log')!;
  const say = (msg: string) => (log.textContent = `events: ${msg}`);

  // ── tile grid (square + chip variants, one with a badge, one rich face) ────
  const tile = (attrs: Record<string, string>, inner = '') => {
    const t = document.createElement('pop-tile');
    for (const [k, v] of Object.entries(attrs)) t.setAttribute(k, v);
    if (inner) t.innerHTML = inner;
    t.addEventListener('popTap', () => {
      presenter.open = true;
      say(`popTap → ${attrs.label}`);
    });
    t.addEventListener('popDelete', () => say(`popDelete → ${attrs.label}`));
    return t;
  };
  grid.append(
    tile({ emoji: '🔎', label: 'Research' }),
    tile({ emoji: '🌤️', label: 'Weather' }, '<span>72° · H 78° L 61°</span>'),
    tile({ emoji: '🗓️', label: 'Calendar' }, '<span slot="badge">3</span>'),
    tile({ icon: 'add', label: 'New', color: '#e0e7ff' }),
  );
  chips.append(
    tile({ variant: 'chip', emoji: '🔎', label: 'Research' }),
    tile({ variant: 'chip', emoji: '💡', label: 'Lights' }),
    tile({ variant: 'chip', emoji: '🪙', label: 'Popcoin' }, '<span>140</span>'),
  );

  // ── presenter content: field stack + async view + actions footer ──────────
  const body = document.createElement('div');
  body.style.cssText = 'display:flex; flex-direction:column; min-width: 280px;';
  for (const f of FIELDS) {
    const el = document.createElement('pop-field') as HTMLElement & { spec: FieldSpec; value?: unknown };
    el.spec = f.spec;
    if (f.value !== undefined) el.value = f.value;
    body.appendChild(el);
  }
  // Unknown-type slot fallback: the app supplies the widget.
  const fallback = document.createElement('pop-field') as HTMLElement & { spec: FieldSpec };
  fallback.spec = { key: 'movie', label: 'Movie', type: 'movie', hint: 'slot-fallback widget', required: true };
  fallback.innerHTML = `<input placeholder="(fake movie typeahead)" style="width:100%; margin:0;" />`;
  const fkInput = fallback.querySelector('input')!;
  fkInput.addEventListener('input', () =>
    fkInput.dispatchEvent(new CustomEvent('valueChange', { detail: fkInput.value, bubbles: true })),
  );
  body.appendChild(fallback);

  // Async view cycling its states on a timer (fake data, no network).
  const avWrap = document.createElement('div');
  avWrap.innerHTML = `
    <hr style="margin: 0.5rem 0;" />
    <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
      <strong style="font-size:0.8rem;">Recent runs</strong>
      <button type="button" id="cycle" style="margin:0; padding:0.2rem 0.6rem; font-size:0.72rem; width:auto;">cycle state</button>
    </div>
    <pop-async-view state="loading" empty-label="No runs yet" error-label="Couldn’t load runs">
      <ul style="margin:0; padding-left:1.1rem; font-size:0.85rem;">
        <li>“best budget e-bikes” — 5 sources</li>
        <li>“PG18 PGDATA migration” — 8 sources</li>
      </ul>
    </pop-async-view>`;
  const av = avWrap.querySelector('pop-async-view') as HTMLElement & { state: string };
  const states = ['loading', 'empty', 'error', 'content'];
  avWrap.querySelector('#cycle')!.addEventListener('click', () => {
    av.state = states[(states.indexOf(av.state) + 1) % states.length];
    say(`async-view → ${av.state}`);
  });
  body.appendChild(avWrap);

  const footer = document.createElement('pop-actions-footer');
  footer.setAttribute('slot', 'actions');
  footer.setAttribute('submit-label', 'Send');
  presenter.append(body, footer);

  // ── events ─────────────────────────────────────────────────────────────────
  presenter.addEventListener('tierChange', (e) => {
    const tier = (e as CustomEvent<string>).detail;
    footer.setAttribute('tier', tier);
    say(`tierChange → ${tier}`);
  });
  presenter.addEventListener('popClose', () => {
    presenter.open = false;
    say('popClose');
  });
  presenter.addEventListener('popRedock', () => say('popRedock'));
  host.addEventListener('popSubmit', () => {
    presenter.open = false;
    say('popSubmit → /research …');
  });
  host.addEventListener('popCancel', () => {
    presenter.open = false;
    say('popCancel');
  });
  host.addEventListener('valueChange', (e) => {
    const d = (e as CustomEvent<{ key: string; value: unknown }>).detail;
    if (d && typeof d === 'object' && 'key' in d) say(`valueChange → ${d.key} = ${JSON.stringify(d.value)}`);
  });

  return host;
}

export const FeatureSurface: StoryObj = {
  name: 'Feature Surface (kitchen sink)',
  render: () => buildSurface(),
};
