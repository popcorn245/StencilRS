import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Atoms/Tile',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Presentational quick-tile FACE: emoji/ionicon, label, chip vs square ' +
          'variants, accent color, pressed/edit states. Emits `popTap` (face) and ' +
          '`popDelete` (edit-mode delete). It carries NO drag/reorder or data ' +
          'logic — hosts wrap it for DnD and decide what a tap does. Rich live ' +
          'faces go in the default slot; a corner count in `slot="badge"`.',
      },
    },
  },
};
export default meta;

const wrap = (inner: string, width = 'auto') =>
  `<div style="display:flex; gap: 14px; align-items: center; flex-wrap: wrap; padding: 1.25rem; width:${width}; background: var(--surface-canvas, var(--pico-background-color));">${inner}</div>`;

const events = (el: HTMLElement) => {
  el.addEventListener('popTap', (e) => console.log('popTap', (e.target as HTMLElement).getAttribute('label')));
  el.addEventListener('popDelete', (e) => console.log('popDelete', (e.target as HTMLElement).getAttribute('label')));
  return el;
};

const make = (html: string) => {
  const host = document.createElement('div');
  host.innerHTML = wrap(html);
  return events(host);
};

export const Square: StoryObj = {
  render: () => make(`<pop-tile emoji="🌤️" label="Weather"></pop-tile>
    <pop-tile emoji="💡" label="Lights"></pop-tile>
    <pop-tile emoji="🔎" label="Research"></pop-tile>`),
};

export const Chips: StoryObj = {
  render: () => make(`<pop-tile variant="chip" emoji="🌤️" label="Weather"></pop-tile>
    <pop-tile variant="chip" emoji="💡" label="Lights"></pop-tile>
    <pop-tile variant="chip" icon="add" label="New"></pop-tile>`),
};

export const IconFace: StoryObj = {
  name: 'Ionicon face',
  render: () => make(`<pop-tile icon="add" label="New"></pop-tile>
    <pop-tile icon="settings-outline" label="Settings"></pop-tile>`),
};

export const AccentColor: StoryObj = {
  render: () => make(`<pop-tile emoji="🎬" label="Showtimes" color="#fde68a"></pop-tile>
    <pop-tile variant="chip" emoji="🎬" label="Showtimes" color="#fde68a"></pop-tile>`),
};

export const RichFace: StoryObj = {
  name: 'Rich face (default slot)',
  render: () =>
    make(`<pop-tile emoji="🌤️" label="Weather"><span>72° · H 78° L 61°</span></pop-tile>
    <pop-tile emoji="📺" label="Remote"><span>Watch TV · ▶ Plex</span></pop-tile>
    <pop-tile variant="chip" emoji="🪙" label="Popcoin"><span>140</span></pop-tile>`),
};

export const Badge: StoryObj = {
  name: 'Corner badge',
  render: () => make(`<pop-tile emoji="🗓️" label="Calendar"><span slot="badge">3</span></pop-tile>
    <pop-tile variant="chip" emoji="🗓️" label="Calendar"><span slot="badge">3</span></pop-tile>`),
};

export const Pressed: StoryObj = {
  render: () => make(`<pop-tile emoji="💡" label="Lights" pressed></pop-tile>
    <pop-tile variant="chip" emoji="💡" label="Lights" pressed></pop-tile>`),
};

export const Editing: StoryObj = {
  name: 'Edit mode (wiggle + delete)',
  render: () => make(`<pop-tile emoji="🔎" label="Research" editing></pop-tile>
    <pop-tile variant="chip" emoji="🔎" label="Research" editing></pop-tile>`),
};

export const Disabled: StoryObj = {
  render: () => make(`<pop-tile emoji="🚫" label="Disabled" disabled></pop-tile>`),
};
