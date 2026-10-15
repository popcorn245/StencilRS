import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Organisms/Feedback Button',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The feedback-pipeline trigger: a small button that opens a form composed ' +
          'entirely from the feature-surface set — pop-presenter (sheet/dialog/dock), ' +
          'two pop-fields (category + description), pop-async-view (submit ' +
          'loading/error) and pop-actions-footer (Cancel/Send, `busy`, ' +
          '`popSubmit`/`popCancel` — never a native form submit). The only bespoke UI ' +
          'is the trigger and the getDisplayMedia() screenshot control. Page context ' +
          '(url/app/version/viewport/userAgent) is captured silently at submit time. ' +
          'Resize across 768/1200 to watch the presenter re-tier.',
      },
    },
  },
};
export default meta;

/** Stand the button in a host shell with an event echo (and no real endpoint). */
function shell(attrs: string, note: string): HTMLElement {
  const host = document.createElement('div');
  host.style.cssText =
    'min-height: 60vh; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; ' +
    'background: var(--surface-canvas, var(--pico-background-color));';
  host.innerHTML = `
    <p style="max-width: 520px; font-size: 0.82rem; color: var(--ink-muted, inherit);">${note}</p>
    <div><pop-feedback-button ${attrs}></pop-feedback-button></div>
    <pre style="font-size:0.72rem; color: var(--ink-muted, inherit);">events: —</pre>`;
  const echo = host.querySelector('pre')!;
  host.addEventListener('popFeedbackSubmit', (e) => {
    echo.textContent = `events: popFeedbackSubmit → ${JSON.stringify((e as CustomEvent).detail)}`;
  });
  return host;
}

export const Default: StoryObj = {
  name: 'Trigger + form (responsive)',
  render: () =>
    shell(
      'app="bucket-hub" submit-endpoint="/api/hub/feedback" position="inline"',
      'Tap the button to open the form. Submitting POSTs to <code>submitEndpoint</code>, ' +
        'which does not exist in Storybook — the error state is what you should see.',
    ),
};

export const IconOnly: StoryObj = {
  name: 'Icon-only trigger',
  render: () =>
    shell(
      'label="" icon="bug-outline" heading="Report a bug" position="inline"',
      'An empty <code>label</code> renders the icon centered in a square hit area ' +
        '(pop-icon + ionicons — never a hand-rolled glyph).',
    ),
};

export const CustomTarget: StoryObj = {
  name: 'Dropped into another app shell',
  render: () =>
    shell(
      'app="tasks-app" submit-endpoint="https://example.test/feedback" label="Report an issue" position="inline"',
      'The <code>app</code> and <code>submitEndpoint</code> props are what let the organism ' +
        'live outside bucket-hub — nothing about the target is hardcoded.',
    ),
};

export const FloatingCorner: StoryObj = {
  name: 'Floating corner (default) + x/y gutters',
  render: () => {
    const host = shell(
      'label="" icon="megaphone-outline" position="bottom-left" style="--pop-feedback-x: 2rem; --pop-feedback-y: 2rem;"',
      'The default <code>position</code> is <code>bottom-right</code>; this one is ' +
        '<code>bottom-left</code>, nudged to a 2rem gutter with <code>--pop-feedback-x</code> / ' +
        '<code>--pop-feedback-y</code>. Both are added to the matching ' +
        '<code>env(safe-area-inset-*)</code>. A floating host is <code>display: contents</code>, ' +
        'so it takes up no room in the column below.',
    );
    return host;
  },
};
