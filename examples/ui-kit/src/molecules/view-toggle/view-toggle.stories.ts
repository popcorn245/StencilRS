import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/ViewToggle',
  parameters: {
    docs: {
      description: {
        component:
          'A compact toggle for switching between card (grid) and list views. Emits a `popViewChange` custom event with the new value when toggled.',
      },
    },
  },
};

export default meta;

export const CardView: StoryObj = {
  name: 'Card View (default)',
  render: () => `<pop-view-toggle value="card"></pop-view-toggle>`,
};

export const ListView: StoryObj = {
  name: 'List View',
  render: () => `<pop-view-toggle value="list"></pop-view-toggle>`,
};

export const Interactive: StoryObj = {
  name: 'Interactive',
  render: () => `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <pop-view-toggle id="demo-toggle" value="card"></pop-view-toggle>
      <span id="demo-label" style="font-size: 0.875rem; color: var(--pico-muted-color);">Current: card</span>
    </div>
    <script>
      const toggle = document.getElementById('demo-toggle');
      const label = document.getElementById('demo-label');
      toggle.addEventListener('popViewChange', (e) => {
        label.textContent = 'Current: ' + e.detail;
      });
    </script>
  `,
};

export const Usage: StoryObj = {
  name: 'Usage Guide',
  render: () => `
    <article>
      <h2>PopViewToggle Component</h2>
      <p>A pill-shaped toggle that switches between card and list views. Uses pico/pollen design tokens.</p>
      <h3>Basic Usage</h3>
      <pre><code>&lt;pop-view-toggle value="card"&gt;&lt;/pop-view-toggle&gt;</code></pre>
      <h3>Listening for Changes</h3>
      <pre><code>const toggle = document.querySelector('pop-view-toggle');
toggle.addEventListener('popViewChange', (e) => {
  console.log(e.detail); // 'card' | 'list'
});</code></pre>
      <h3>Props</h3>
      <table>
        <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>value</code></td><td><code>'card' | 'list'</code></td><td><code>'card'</code></td><td>The active view mode</td></tr>
        </tbody>
      </table>
      <h3>Events</h3>
      <table>
        <thead><tr><th>Event</th><th>Detail type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>popViewChange</code></td><td><code>'card' | 'list'</code></td><td>Emitted when the user clicks a different view button</td></tr>
        </tbody>
      </table>
    </article>
  `,
};
