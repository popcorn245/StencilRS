import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/AppShell',
  parameters: {
    docs: {
      description: {
        component:
          'The shared page frame for the notes-app. A sticky header (title + `context` slot + `actions` slot) over a scrolling body slot, so every page stops reinventing its own header.',
      },
    },
  },
};

export default meta;

const frame =
  'height:420px; display:flex; flex-direction:column; background:var(--surface-canvas,#eef3fb); color:var(--ink,#1b2333); border:1px solid var(--line,#dde6f2); border-radius:var(--radius-lg,16px); overflow:hidden;';

export const Basic: StoryObj = {
  render: () => `
    <div style="${frame}">
      <pop-app-shell heading="Trash" icon-name="trash" style="flex:1;">
        <span slot="context">3 notes</span>
        <button slot="actions" style="min-height:40px;">Empty trash</button>
        <div style="padding:var(--size-5);">Body content scrolls here.</div>
      </pop-app-shell>
    </div>
  `,
};

export const Centered: StoryObj = {
  render: () => `
    <div style="${frame}">
      <pop-app-shell heading="Settings" icon-name="settings" centered="true" style="flex:1;">
        <div style="padding:var(--size-5);">Centered, max-width body (Settings).</div>
      </pop-app-shell>
    </div>
  `,
};

export const WithActions: StoryObj = {
  render: () => `
    <div style="${frame}">
      <pop-app-shell heading="Graph" icon-name="graph" style="flex:1;">
        <span slot="context">42 nodes · 3 orphans</span>
        <button slot="actions" style="min-height:40px;">Fit</button>
        <button slot="actions" style="min-height:40px;">Orphans</button>
        <div style="padding:var(--size-5);">Graph canvas would render here.</div>
      </pop-app-shell>
    </div>
  `,
};
