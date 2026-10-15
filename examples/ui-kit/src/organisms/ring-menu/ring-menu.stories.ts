import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Ring Menu',
  parameters: {
    docs: {
      description: {
        component:
          'A highly interactive, semi-circular radial menu component that supports both tap-to-open and drag-to-select interactions. Built with StencilJS.',
      },
    },
    // Adding some padding so the ring menu has space to open
    layout: 'centered',
  },
  // We need to wrap it in a slightly taller container so it doesn't get clipped in the docs view if layout isn't padded
  decorators: [
    (story) => `<div style="min-height: 250px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 2rem;">${story()}</div>`,
  ],
};

export default meta;

const notesLayoutItems = [
  { icon: "journal-outline", label: "Note", action: "note", color: "#9c27b0" },
  { icon: "checkmark-circle-outline", label: "Task", action: "task", color: "#009688" },
  { icon: "calendar-outline", label: "Event", action: "event", color: "#ffc107" },
];

const inventoryLayoutItems = [
  { icon: "scan-outline", label: "Scan", action: "scan", color: "#e91e63" },
  { icon: "cube-outline", label: "Item", action: "item", color: "#03a9f4" },
  { icon: "archive-outline", label: "Box", action: "container", color: "#4caf50" },
  { icon: "shirt-outline", label: "Outfit", action: "outfit", color: "#ff9800" },
  { icon: "journal-outline", label: "Note", action: "note", color: "#9c27b0" },
  { icon: "checkmark-circle-outline", label: "Task", action: "task", color: "#009688" },
];

export const NotesUseCase: StoryObj = {
  name: 'Notes & Tasks (3 Options)',
  render: () => `
    <pop-ring-menu items='${JSON.stringify(notesLayoutItems)}'></pop-ring-menu>
    <script>
      (function() {
        // Find the most recently added component (helpful in storybook re-renders)
        const menus = document.querySelectorAll('pop-ring-menu');
        const menu = menus[menus.length - 1];
        menu.addEventListener('actionSelected', (e) => {
          alert('Action selected: ' + e.detail);
        });
      })();
    </script>
  `,
};

export const InventoryUseCase: StoryObj = {
  name: 'Inventory (6 Options)',
  render: () => `
    <pop-ring-menu items='${JSON.stringify(inventoryLayoutItems)}'></pop-ring-menu>
    <script>
      (function() {
        const menus = document.querySelectorAll('pop-ring-menu');
        const menu = menus[menus.length - 1];
        menu.addEventListener('actionSelected', (e) => {
          alert('Action selected: ' + e.detail);
        });
      })();
    </script>
  `,
};

export const Usage: StoryObj = {
  name: 'Usage Guide',
  parameters: {
    // No need for the bottom padding here
    decorators: [(story: any) => story()],
  },
  render: () => `
    <article style="text-align: left; max-width: 800px; margin: 0 auto;">
      <h2>Pop Ring Menu Component</h2>
      <p>
        An interactive radial menu designed as a drop-in replacement for standard Floating Action Buttons (FABs).
      </p>
      
      <h3>Interactions</h3>
      <ul>
        <li><strong>Tap:</strong> Tapping the center button toggles the menu open and closed.</li>
        <li><strong>Drag:</strong> Tapping and dragging the center button allows fluid selection of options. Releasing snaps to the option.</li>
      </ul>

      <h3>Props</h3>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>items</code></td>
            <td><code>string</code> (JSON Array)</td>
            <td>A JSON stringified array of menu items defining the <code>icon</code>, <code>label</code>, <code>action</code>, and <code>color</code>.</td>
          </tr>
          <tr>
            <td><code>centerIconSvg</code></td>
            <td><code>string</code></td>
            <td>Optional. An inline raw SVG string to use for the center button instead of the default Ionicons plus.</td>
          </tr>
        </tbody>
      </table>

      <h3>Events</h3>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Detail Payload</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>actionSelected</code></td>
            <td><code>string</code></td>
            <td>Emitted when an option is selected via tapping or dragging. The detail string is the <code>action</code> value defined in the items array.</td>
          </tr>
        </tbody>
      </table>

      <h3>Example Usage</h3>
      <pre>
<code>
const ringMenuItems = [
  { icon: "journal-outline", label: "Note", action: "note", color: "#9c27b0" },
  { icon: "checkmark-circle-outline", label: "Task", action: "task", color: "#009688" },
];

&lt;pop-ring-menu items={JSON.stringify(ringMenuItems)}&gt;&lt;/pop-ring-menu&gt;

&lt;script&gt;
  const menu = document.querySelector('pop-ring-menu');
  menu.addEventListener('actionSelected', (event) => {
    console.log('User wants to create:', event.detail);
  });
&lt;/script&gt;
</code>
      </pre>
    </article>
  `,
};
