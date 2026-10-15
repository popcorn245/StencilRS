import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-snout-work — the Snout Tasks panel, rebuilt to MIRROR the hub inventory
 * tile: the shared design-system primitives (pop-tab-bar with live per-tab count
 * bubbles, a working pop-list-filter-sort search + funnel, pop-async-view
 * states) over Project-grouped collapsible sections of dense issue rows (status
 * dot, ENG-key + title, milestone / assignee / PR chips, contextual verb, ⋮
 * overflow). 🤖 Bots + 🚧 Needs Owner pin as top groups. The one visual
 * deviation is the Snout-orange accent on the primary/verb buttons, active tab,
 * switch, and focus rings. Presentation-only: the host owns fetching + writes.
 * Use the theme toolbar for dark.
 */
const meta: Meta = {
  title: 'Components/Organisms/SnoutWork',
  argTypes: {
    tab: { control: 'text' },
    autoAccept: { control: 'boolean' },
    loading: { control: 'boolean' },
    showHeader: { control: 'boolean' },
  },
  parameters: {
    actions: {
      handles: [
        'popTabChange', 'popAutoAccept', 'popRefresh', 'popClose', 'popOpenIssue',
        'popOpenProject', 'popVerb', 'popStatusChange', 'popMergePr', 'popPostUpdate',
      ],
    },
    docs: {
      description: {
        component:
          'pop-snout-work — Action/Me/Team compact tab bar with live per-tab match counts, a working search box + funnel filters (Project / Milestone / Assignee / Status / Has-PR) with a "⚠ needs reviewer" chip, and Project-grouped collapsible sections (plus pinned 🤖 Bots / 🚧 Needs Owner; person→project on the Sonic tab). Roomy mobile-first issue cards: line 1 = status dot + ENG-key (links to Linear ↗) + an interactive status chip (opens a popover-select that fires the echo-guard status change); line 2 = full-width title; line 3 = milestone / assignee / PR chips (approved ✓, WIP, needs-reviewer); line 4 = a compact vertical icon-over-label verb (Start/Continue/Research/Review/Merge). Expanding a card reveals a READ-ONLY Linear summary; the collapsible command console + PR links ride along. Built entirely from shared ui-kit primitives; only the accent deviates to Snout-orange.',
      },
    },
  },
};

export default meta;

// ── mock bridge-shaped data (real Snout projects + people) ───────────────────
const bobby = { id: 'linUsr_bobby', name: 'Bobby Johnson', isMe: true };
const vincent = { id: 'linUsr_vincent', name: 'Vincent Nguyen' };
const cody = { id: 'linUsr_cody', name: 'Cody Tam' };

const ms21 = { id: 'ms_21', name: 'v2.1 — Booking', sortOrder: 1 };
const ms22 = { id: 'ms_22', name: 'v2.2 — Reminders', sortOrder: 2 };

const pr = (number: number, author: string, over: Record<string, unknown> = {}) => ({
  number, author, isWip: false, reviewState: 'pending', needsReviewer: false,
  url: `https://code.popcorn245.com/x/pulls/${number}`, ...over,
});

const tasks = [
  // Booking Flow
  {
    id: 'linear_16201', title: 'Sitter availability calendar sync', status: 'in_progress', projectId: 'p_booking',
    linearIdentifier: 'ENG-16201', linearUrl: 'https://linear.app/x/ENG-16201',
    linearState: { name: 'In Progress', type: 'started' },
    linearAssignee: bobby, linearMilestone: ms21,
    linearPRs: [pr(812, 'popcorn245', { needsReviewer: true })],
    inAction: true,
    summary:
      'Two-way sync of sitter availability with Google Calendar so booked slots block automatically. Handles recurring availability + DST edges; writes back cancellations. (Read-only summary synced from the Linear issue description.)',
  },
  {
    id: 'linear_16244', title: 'Booking confirmation email + SMS', status: 'in_progress', projectId: 'p_booking',
    linearIdentifier: 'ENG-16244', linearUrl: 'https://linear.app/x/ENG-16244',
    linearState: { name: 'In Review', type: 'started' },
    linearAssignee: vincent, linearMilestone: ms21,
    linearPRs: [pr(818, 'vnguyen', { reviewState: 'approved' })],
    inAction: true,
  },
  {
    id: 'linear_16260', title: 'Deposit + cancellation policy checkout step', status: 'open', projectId: 'p_booking',
    linearIdentifier: 'ENG-16260', linearUrl: 'https://linear.app/x/ENG-16260',
    linearState: { name: 'Todo', type: 'unstarted' },
    linearAssignee: cody, linearMilestone: ms21,
  },
  {
    id: 'linear_16277', title: 'Sitter double-booking guard', status: 'open', projectId: 'p_booking',
    linearIdentifier: 'ENG-16277', linearUrl: 'https://linear.app/x/ENG-16277',
    linearState: { name: 'Backlog', type: 'backlog' },
    linearAssignee: bobby, linearMilestone: ms22,
  },
  // Pet Profiles
  {
    id: 'linear_16305', title: 'Vaccination records upload + expiry reminders', status: 'in_progress', projectId: 'p_profiles',
    linearIdentifier: 'ENG-16305', linearUrl: 'https://linear.app/x/ENG-16305',
    linearState: { name: 'In Progress', type: 'started' },
    linearAssignee: cody, linearMilestone: ms22,
    linearPRs: [pr(821, 'ctam', { isWip: true })],
    inAction: true,
  },
  {
    id: 'linear_16312', title: 'Multi-pet household switcher', status: 'open', projectId: 'p_profiles',
    linearIdentifier: 'ENG-16312', linearUrl: 'https://linear.app/x/ENG-16312',
    linearState: { name: 'Todo', type: 'unstarted' },
    linearAssignee: vincent, linearMilestone: ms22,
  },
  {
    id: 'linear_16330', title: 'Feeding + medication schedule cards', status: 'done', projectId: 'p_profiles',
    linearIdentifier: 'ENG-16330', linearUrl: 'https://linear.app/x/ENG-16330',
    linearState: { name: 'Done', type: 'completed' },
    linearAssignee: bobby, linearMilestone: ms21,
  },
  // Unassigned → pinned buckets
  {
    id: 'linear_16350', title: 'Bump Stripe SDK to v18', status: 'open', projectId: 'p_billing',
    linearIdentifier: 'ENG-16350', linearUrl: 'https://linear.app/x/ENG-16350',
    linearState: { name: 'Todo', type: 'unstarted' }, linearAssignee: null,
    linearPRs: [pr(824, 'renovate[bot]', { reviewState: 'approved' })],
  },
  {
    id: 'linear_16351', title: 'Weekly dependency roll-up', status: 'open', projectId: 'p_billing',
    linearIdentifier: 'ENG-16351', linearUrl: 'https://linear.app/x/ENG-16351',
    linearState: { name: 'Backlog', type: 'backlog' }, linearAssignee: null,
    linearPRs: [pr(825, 'dependabot[bot]')],
  },
  {
    id: 'linear_16360', title: 'Triage: sitters report flaky push notifications', status: 'open', projectId: 'p_profiles',
    linearIdentifier: 'ENG-16360', linearUrl: 'https://linear.app/x/ENG-16360',
    linearState: { name: 'Backlog', type: 'backlog' }, linearAssignee: null,
  },
];

const projects = [
  { id: 'p_booking', name: 'Booking Flow', linearUrl: 'https://linear.app/x/booking' },
  { id: 'p_profiles', name: 'Pet Profiles', linearUrl: 'https://linear.app/x/profiles' },
  { id: 'p_billing', name: 'Billing', linearUrl: 'https://linear.app/x/billing' },
];
const counts = { action: 4, me: 3, team: 10 };

const commands = [
  { id: 'c1', type: 'build-on-issue', taskId: 'linear_16201', status: 'running', milestones: ['Read handler ✓', 'Wire calendar client ✓', 'Add DST fixtures…'] },
  { id: 'c2', type: 'build-on-issue', taskId: 'linear_16244', status: 'done', result: { summary: 'Merged PR #818 — confirmation email + SMS live.' } },
  { id: 'c3', type: 'build-on-issue', taskId: 'linear_16305', status: 'error', error: 'TypeError: cannot read "vaccinations" of undefined (worker.ts:88)' },
];

function panel(opts: { tab?: string; autoAccept?: boolean; loading?: boolean; error?: string; width?: number; showHeader?: boolean } = {}) {
  const attr = (o: unknown) => JSON.stringify(o).replace(/'/g, '&#39;');
  const withData = !opts.loading && !opts.error;
  return `
    <div style="max-width:${opts.width ?? 460}px; padding:16px; background:var(--surface-canvas,#eef2f8); border-radius:20px;">
      <pop-snout-work
        show-header="${opts.showHeader === false ? 'false' : 'true'}"
        team-name="Sonic"
        tab="${opts.tab ?? 'team'}"
        synced-at="${Date.now() - 90_000}"
        ${opts.autoAccept ? 'auto-accept="true"' : ''}
        ${opts.loading ? 'loading="true"' : ''}
        ${opts.error ? `error="${opts.error}"` : ''}
        counts='${attr(counts)}'
        projects='${attr(projects)}'
        commands='${attr(commands)}'
        ${withData ? `tasks='${attr(tasks)}'` : ''}
      ></pop-snout-work>
    </div>
  `;
}

/** Full panel — header + tabs + working search + Project-grouped tree. */
export const Default: StoryObj = { name: 'Panel — Team tab', render: () => panel() };

/** Action tab — the needs-my-action queue (Auto-accept on). */
export const Action: StoryObj = { name: 'Action tab', render: () => panel({ tab: 'action', autoAccept: true }) };

/** Me tab — the owner's issues, grouped by project. */
export const Me: StoryObj = { name: 'Me tab', render: () => panel({ tab: 'me' }) };

/** Embedded (showHeader=false) — how the hub PanelShell hosts it. */
export const Embedded: StoryObj = { name: 'Embedded in PanelShell', render: () => panel({ showHeader: false }) };

/** Loading (no data yet). */
export const Loading: StoryObj = { name: 'Loading', render: () => panel({ loading: true }) };

/** Error with a Retry. */
export const ErrorState: StoryObj = { name: 'Error', render: () => panel({ error: "Couldn't load Snout work right now." }) };
