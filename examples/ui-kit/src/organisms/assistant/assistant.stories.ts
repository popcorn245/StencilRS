import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Assistant',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'pop-assistant — the unified in-app Assistant for the Notes app (WS2). ONE surface, three verbs (Ask / Build / Link), a SINGLE Gemma/Claude model control, and the locked propose→approve model: Build renders an inline block diff (full Notion palette) with per-block accept toggles; Link renders approvable link chips; nothing writes until Approve. Ask reuses pop-ai-chat (host-driven streaming + citation chips). Presentation + interaction only — the host owns retrieval, the model, /assistantThreads persistence, and the approve-side writes. Proposal payloads are passed as JSON strings here so they render in static Storybook builds; in the app they are set as properties.',
      },
    },
  },
};

export default meta;

/** Mount the assistant in a dock-sized frame. */
function frame(inner: string) {
  return `
    <div style="height: 620px; width: 380px; border: 1px solid var(--line, #ddd); border-radius: 12px; overflow: hidden; background: var(--surface-card, #fff);">
      ${inner}
    </div>
  `;
}

/** Ask verb — the default conversation surface (empty). */
export const Ask: StoryObj = {
  name: 'Ask (default)',
  render: () => frame(`<pop-assistant verb="ask" model="gemma" note-grounded="true" note-title="Launch plan"></pop-assistant>`),
};

const BUILD_BLOCKS = [
  { type: 'header', data: { text: 'Launch checklist', level: 2 }, change: 'add' },
  { type: 'paragraph', data: { text: 'Everything that must ship before go-live.' }, change: 'add' },
  {
    type: 'checklist',
    data: { items: [{ content: 'Freeze the API', checked: true }, { content: 'DKIM verified', checked: false }] },
    change: 'add',
  },
  {
    type: 'table',
    data: { content: [['Owner', 'Task'], ['Kat', 'Docs'], ['Bot', 'Deploy']] },
    change: 'add',
  },
  { type: 'code', data: { code: 'nx build notes-app' }, change: 'add' },
];

/** Build verb — a block-diff proposal with Approve / Reject. */
export const BuildProposal: StoryObj = {
  name: 'Build — block diff proposal',
  render: () =>
    frame(
      `<pop-assistant verb="build" model="claude" build-action="structure" build-proposal='${JSON.stringify(
        BUILD_BLOCKS,
      ).replace(/'/g, '&#39;')}'></pop-assistant>`,
    ),
};

const LINKS = [
  { noteId: 'a', title: 'Q3 roadmap', reason: 'Shares the “launch” milestone' },
  { noteId: 'b', title: 'DKIM setup notes', reason: 'Referenced by the email task' },
  { noteId: 'c', title: 'Standup — Jun 30', reason: 'Discussed the same blockers' },
];

/** Link verb — on-demand suggestions as approvable chips. */
export const LinkProposal: StoryObj = {
  name: 'Link — suggested links',
  render: () =>
    frame(
      `<pop-assistant verb="link" model="gemma" link-proposal='${JSON.stringify(LINKS).replace(
        /'/g,
        '&#39;',
      )}'></pop-assistant>`,
    ),
};

/** Honest error state (endpoint unreachable — what the off-origin preview shows). */
export const ErrorState: StoryObj = {
  name: 'Build — error state',
  render: () =>
    frame(
      `<pop-assistant verb="build" model="gemma" error-message="Couldn't reach the model to build a proposal. Try again once you're back online."></pop-assistant>`,
    ),
};
