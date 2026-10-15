import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Organisms/Location',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A self-contained location picker: ONE button (current place or "Set ' +
          'Location") that opens a popover with a "ZIP or town" input (with a ' +
          'find-my-location icon on the right), OpenStreetMap (Photon) autocomplete ' +
          'suggestions, and GPS→Nominatim / IP fallback. Persists to the shared ' +
          '`hub:location` localStorage key and emits `popLocationChange`.',
      },
    },
  },
};
export default meta;

const wrap = (inner: string) =>
  `<div style="width: 280px; padding: 1.5rem; background: var(--pico-background-color);">${inner}</div>`;

// Seed/clear the shared store before each story renders.
const seed = (label: string, zip: string) =>
  `<script>try{localStorage.setItem('hub:location',JSON.stringify({label:'${label}',zip:'${zip}',lat:38.81,lng:-90.85,updatedAt:Date.now()}))}catch(e){}</script>`;
const clear = `<script>try{localStorage.removeItem('hub:location')}catch(e){}</script>`;

export const Empty: StoryObj = {
  name: 'Collapsed — Set Location',
  render: () => wrap(`${clear}<pop-location></pop-location>`),
};

export const Set: StoryObj = {
  name: 'Collapsed — current location',
  render: () => wrap(`${seed('Wentzville, MO 63385', '63385')}<pop-location></pop-location>`),
};

export const FromValueProp: StoryObj = {
  name: 'Seeded via value prop',
  render: () => wrap(`${clear}<pop-location value="Austin, TX"></pop-location>`),
};
