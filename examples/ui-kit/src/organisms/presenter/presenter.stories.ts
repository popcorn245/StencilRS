import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Organisms/Presenter',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The generic presentation-tier resolver: sheet (<768) → renders ' +
          'pop-bottom-sheet, dialog (768–1199) → renders pop-form-dialog, dock ' +
          '(≥1200) → renders a PLAIN panel container the HOST places in its layout ' +
          '(controlled tier + slot). Emits `tierChange` on open/resize, `popClose`, ' +
          'and `popRedock` (the wide forced-dialog "Dock to side" affordance). ' +
          'Dock persistence is the host\'s job — force `tier="dialog"` to keep a ' +
          'collapsed dock. Resize the viewport across 768/1200 to watch the tier ' +
          'change live.',
      },
    },
  },
};
export default meta;

const FIELDS = `
  <div style="display:flex; flex-direction:column; gap: 0.6rem; min-width: 260px;">
    <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.82rem; font-weight:600; color: var(--ink-soft, inherit);">
      Topic
      <input placeholder="What to research…" style="margin:0;" />
    </label>
    <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.82rem; font-weight:600; color: var(--ink-soft, inherit);">
      Model
      <select style="margin:0;"><option>—</option><option>Gemma</option><option>Claude</option></select>
    </label>
  </div>`;

function present(attrs: string, opts: { dockAside?: boolean } = {}): HTMLElement {
  const host = document.createElement('div');
  host.style.cssText = 'min-height: 60vh; padding: 1rem; background: var(--surface-canvas, var(--pico-background-color));';
  const dockNote = opts.dockAside
    ? `<p style="max-width: 480px; font-size: 0.8rem; color: var(--ink-muted, inherit);">
         The presenter below renders a PLAIN panel container in dock tier — this story
         places it in a right-hand column the way a host layout would.</p>`
    : '';
  host.innerHTML = `
    ${dockNote}
    <div style="${opts.dockAside ? 'display:grid; grid-template-columns: 1fr 360px; gap: 1rem; align-items: start;' : ''}">
      ${opts.dockAside ? '<div style="min-height:300px; border:1px dashed var(--pico-border-color); border-radius: var(--radius-card, 22px); display:grid; place-items:center; color: var(--ink-muted, inherit);">chat column</div>' : ''}
      <pop-presenter open ${attrs}>
        ${FIELDS}
        <pop-actions-footer slot="actions"></pop-actions-footer>
      </pop-presenter>
    </div>
    <pre style="margin-top:0.75rem; font-size:0.72rem; color: var(--ink-muted, inherit);">events: —</pre>`;
  const echo = host.querySelector('pre')!;
  const log = (name: string, detail?: unknown) =>
    (echo.textContent = `events: ${name}${detail !== undefined ? ` → ${JSON.stringify(detail)}` : ''}`);
  host.addEventListener('tierChange', (e) => log('tierChange', (e as CustomEvent).detail));
  host.addEventListener('popClose', () => log('popClose'));
  host.addEventListener('popRedock', () => log('popRedock'));
  host.addEventListener('popSubmit', () => log('popSubmit'));
  host.addEventListener('popCancel', () => log('popCancel'));
  return host;
}

export const Responsive: StoryObj = {
  name: 'Responsive (resize across 768/1200)',
  render: () => present('heading="🔎 Research"'),
};

export const ForcedSheet: StoryObj = {
  name: 'Sheet tier (forced)',
  render: () => present('tier="sheet" heading="🔎 Research"'),
};

export const ForcedDialog: StoryObj = {
  name: 'Dialog tier (forced)',
  render: () => present('tier="dialog" heading="🔎 Research"'),
};

export const ForcedDialogWide: StoryObj = {
  name: 'Dialog forced at dock width ("Dock to side" affordance)',
  parameters: {
    docs: {
      description: {
        story:
          'When the HOST forces `tier="dialog"` at a dock-qualifying width (a collapsed dock), ' +
          'the dialog grows a "Dock to side" header affordance that emits `popRedock`. ' +
          'View at ≥1200px viewport width.',
      },
    },
  },
  render: () => present('tier="dialog" heading="🔎 Research"'),
};

export const ForcedDock: StoryObj = {
  name: 'Dock tier (forced, host-placed)',
  render: () => present('tier="dock" heading="🔎 Research"', { dockAside: true }),
};

export const CustomBreakpoints: StoryObj = {
  name: 'Breakpoint overrides (sheetMax=640, dockMin=1024)',
  render: () => present('sheet-max="640" dock-min="1024" heading="🔎 Research"'),
};
