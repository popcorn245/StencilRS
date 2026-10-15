import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-image-card — a shared image-forward card (media on top, content beneath,
 * optional actions row). Used by the hub Images grid and the Inventory grid view.
 */
const meta: Meta = {
  title: 'Components/Organisms/ImageCard',
  component: 'pop-image-card',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Image-forward card: media wrapper (aspect-ratio on the wrapper, never the <img>), a default slot for the body (title / tags / qty), and an optional `actions` slot. `clickable` makes the whole card emit a composed `cardSelect`.',
      },
    },
  },
};

export default meta;

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="%23c7d2fe"/><text x="50%" y="50%" font-size="20" fill="%234338ca" text-anchor="middle" dominant-baseline="middle">image</text></svg>',
  );

const frame = (inner: any) => html`<div style="width: 180px; display: flex;">${inner}</div>`;

export const Basic: StoryObj = {
  name: 'Basic (title + actions)',
  render: () =>
    frame(html`
      <pop-image-card src=${PLACEHOLDER} alt="Oat milk" card-title="Oat Milk">
        <div style="font-size:.72rem;opacity:.7;">Grocery · 2 ct</div>
        <div slot="actions">
          <button type="button" style="font-size:.72rem;padding:.25rem .5rem;">−</button>
          <span style="font-size:.8rem;">2</span>
          <button type="button" style="font-size:.72rem;padding:.25rem .5rem;">+</button>
        </div>
      </pop-image-card>
    `),
};

export const Clickable: StoryObj = {
  name: 'Clickable',
  render: () =>
    frame(html`
      <pop-image-card
        src=${PLACEHOLDER}
        alt="Beach sunset"
        card-title="Beach sunset"
        clickable
        card-id="img-1"
        @cardSelect=${(e: CustomEvent) => console.log('selected', e.detail)}
      ></pop-image-card>
    `),
};

export const MediaSlot: StoryObj = {
  name: 'Media slot (authed thumb)',
  render: () =>
    frame(html`
      <pop-image-card alt="From proxy" card-title="Proxied thumb" aspect="4/3">
        <img
          slot="media"
          src=${PLACEHOLDER}
          alt="Proxied"
          style="width:100%;height:100%;object-fit:cover;display:block;"
        />
        <div style="font-size:.72rem;opacity:.7;">4:3 media wrapper</div>
      </pop-image-card>
    `),
};
