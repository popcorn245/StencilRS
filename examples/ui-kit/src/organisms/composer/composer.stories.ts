import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Composer',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'pop-composer — a SLIM chat composer (a lighter alternative to pop-message-box). A growing 1→N line input with compact attach + mic icons and a send button. Typing `/` opens an inline popover ABOVE the input listing slash-commands (name + short description); typing `@` opens a people popover whose selection inserts a styled PILL carrying the person uid. Arrow-key navigable; Enter sends (Shift+Enter newlines). Emits `popSend` ({ text, mentions:[{id,name}], images? }), `popValueChange`, `popMicRequested`, `popAttach`. `commands` and `people` are set as PROPERTIES (assigned in the render fn below). Themed via real --pico-* tokens.',
      },
    },
  },
};

export default meta;

const COMMANDS = [
  { name: 'ask', description: 'Ask a question' },
  { name: 'research', description: 'Deep multi-source research' },
  { name: 'weather', description: 'Forecast for a location' },
  { name: 'image', description: 'Generate an image' },
  { name: 'showtimes', description: 'Movie showtimes near you' },
  { name: 'lights', description: 'Control the lights' },
];

const PEOPLE = [
  { id: 'uid-kat', name: 'Kat' },
  { id: 'uid-sam', name: 'Sam' },
  { id: 'uid-alex', name: 'Alex' },
  { id: 'uid-jordan', name: 'Jordan' },
];

const SEND_ACTIONS = [
  { id: 'addToThread', label: 'Add to Thread' },
  { id: 'createThread', label: 'Create Thread' },
];

function mount(attrs: string, opts: { sendActions?: any[]; openPopover?: boolean } = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width: 420px; max-width: 92vw; padding: 24px; background: var(--surface-canvas, #eef3fb); border-radius: 16px;';
  wrap.innerHTML = `<pop-composer ${attrs}></pop-composer>`;
  const el = wrap.querySelector('pop-composer') as any;
  // commands/people/sendActions are properties, not attributes
  const apply = () => {
    el.commands = COMMANDS;
    el.people = PEOPLE;
    if (opts.sendActions) el.sendActions = opts.sendActions;
    if (opts.openPopover) {
      // Seed text + open the press-hold popover so the story shows it expanded.
      el.setValue?.("It's chilly today…");
      el.actionsOpen = true;
    }
  };
  customElements.whenDefined('pop-composer').then(apply);
  apply();
  return wrap;
}

type Story = StoryObj;

export const Default: Story = {
  render: () => mount('placeholder="Message bucket-bot…" show-mic="true" show-attach="true"'),
};

export const NoMic: Story = {
  render: () => mount('placeholder="Type a message…" show-attach="true"'),
};

export const Disabled: Story = {
  render: () => mount('placeholder="Sending…" disabled="true" show-mic="true"'),
};

/**
 * Press-and-hold send button. With `sendActions` set, a normal TAP performs the
 * default send (`popSend`); a press-and-hold (~450ms, mouse + touch) opens a small
 * popover ABOVE the button with the secondary actions, each emitting
 * `popSendAction { id, text }`. Shown here closed (default send glyph).
 */
export const HoldActions: Story = {
  render: () => mount('placeholder="Message about the weather…" show-attach="true"', { sendActions: SEND_ACTIONS }),
};

/** The press-and-hold popover shown OPEN with "Add to Thread" + "Create Thread". */
export const HoldActionsOpen: Story = {
  render: () => mount('placeholder="Message about the weather…" show-attach="true"', { sendActions: SEND_ACTIONS, openPopover: true }),
};
