import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Toast',
  parameters: {
    docs: {
      description: {
        component:
          'Floating, ephemeral notifications. Mount ONE `<pop-toast>` in an app shell ' +
          'and drive it via its `show(message, type, action?, options?)` method. Toasts ' +
          'auto-dismiss after `duration` (default 5000ms). Pass `{ persistent: true }` ' +
          '(or `duration <= 0`) for a sticky toast that stays until you call `hide()` — ' +
          'used for the Bucket Hub "Reconnecting…" indicator.',
      },
    },
  },
};

export default meta;

// A `<pop-toast>` plus buttons that call its imperative methods. The custom
// element is registered by .storybook/preview (defineCustomElements()).
const demo = (inner: string) => `
  <pop-toast id="story-toast" position="bottom-center"></pop-toast>
  <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
    ${inner}
  </div>
  <script>
    (function () {
      var t = document.getElementById('story-toast');
      document.querySelectorAll('[data-toast]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var kind = btn.getAttribute('data-toast');
          if (kind === 'hide') { t.hide(); return; }
          if (kind === 'persistent') { t.show('Reconnecting…', 'default', undefined, { persistent: true }); return; }
          if (kind === 'success') { t.show('Reconnected', 'success', undefined, { duration: 2000 }); return; }
          if (kind === 'error') { t.show('Something went wrong', 'error'); return; }
          t.show('Saved to Bucket', 'default');
        });
      });
    })();
  </script>
`;

export const Default: StoryObj = {
  name: 'Default (auto-dismiss)',
  render: () => demo(`
    <button data-toast="default">Show toast</button>
    <button data-toast="success" class="secondary">Success</button>
    <button data-toast="error" class="contrast">Error</button>
  `),
};

export const Persistent: StoryObj = {
  name: 'Persistent + hide()',
  parameters: {
    docs: {
      description: {
        story:
          'A sticky toast (`{ persistent: true }`) never auto-dismisses — it stays ' +
          'until `hide()` is called. This is how the hub keeps "Reconnecting…" visible ' +
          'for the entire outage, then swaps in a brief "Reconnected" success toast.',
      },
    },
  },
  render: () => demo(`
    <button data-toast="persistent">Show "Reconnecting…" (sticky)</button>
    <button data-toast="hide" class="secondary">hide()</button>
    <button data-toast="success" class="contrast">Flash "Reconnected"</button>
  `),
};
