import { newSpecPage } from '../../test-utils/spec-page';
import { PopSnoutWork } from './snout-work';
import { TabBar } from '../../molecules/tab-bar/tab-bar';
import {
  filterByTab,
  groupTasks,
  verbsForTask,
  statusChip,
  prChips,
  toggleObjective,
  isBotAuthor,
  assigneeIsOwner,
  type SnoutTask,
} from './snout-work.helpers';

const me = { id: 'linUsr_bobby', name: 'Bobby Johnson', isMe: true };
const alice = { id: 'linUsr_alice', name: 'alice' };

function task(over: Partial<SnoutTask> = {}): SnoutTask {
  return {
    id: over.id || 't1',
    title: over.title || 'A task',
    status: over.status || 'open',
    projectId: over.projectId || 'p_core',
    ...over,
  };
}

const tasks: SnoutTask[] = [
  task({ id: 'a', status: 'in_progress', linearState: { name: 'In Progress', type: 'started' }, linearAssignee: me, linearMilestone: { id: 'ms2', name: 'v1.1.0', sortOrder: 2 }, inAction: true }),
  task({ id: 'b', status: 'open', linearState: { name: 'Todo', type: 'unstarted' }, linearAssignee: me, linearMilestone: { id: 'ms2', name: 'v1.1.0', sortOrder: 2 } }),
  task({ id: 'c', status: 'open', linearState: { name: 'Backlog', type: 'backlog' }, linearAssignee: alice, linearMilestone: { id: 'ms1', name: 'v1.0.0', sortOrder: 1 } }),
  task({ id: 'd', status: 'done', linearState: { name: 'Done', type: 'completed' }, linearAssignee: alice, linearMilestone: null }),
  task({ id: 'hid', status: 'open', hidden: true, linearAssignee: me }),
];

describe('snout-work.helpers', () => {
  it('filterByTab: action=inAction, me=owner, team=all — always excludes hidden', () => {
    expect(filterByTab(tasks, 'action').map((t) => t.id)).toEqual(['a']);
    expect(filterByTab(tasks, 'me').map((t) => t.id).sort()).toEqual(['a', 'b']);
    // team excludes the hidden task
    expect(filterByTab(tasks, 'team').map((t) => t.id)).not.toContain('hid');
    expect(filterByTab(tasks, 'team').length).toBe(4);
  });

  it('assigneeIsOwner matches the owner by flag or name', () => {
    expect(assigneeIsOwner(me)).toBe(true);
    expect(assigneeIsOwner({ id: 'x', name: 'Bobby Johnson' })).toBe(true);
    expect(assigneeIsOwner(alice)).toBe(false);
    expect(assigneeIsOwner(null)).toBe(false);
  });

  it('groupTasks builds Project → Milestone (sortOrder, No milestone last) → Assignee (Me first)', () => {
    const groups = groupTasks(filterByTab(tasks, 'team'), [{ id: 'p_core', name: 'Core' }]);
    expect(groups.length).toBe(1);
    expect(groups[0].name).toBe('Core');
    const ms = groups[0].milestones.map((m) => m.name);
    expect(ms).toEqual(['v1.0.0', 'v1.1.0', 'No milestone']);
    // v1.1.0 assignees: Me first
    const v11 = groups[0].milestones.find((m) => m.name === 'v1.1.0')!;
    expect(v11.assignees[0].isMe).toBe(true);
    expect(v11.assignees[0].name).toBe('Me');
  });

  it('groupTasks attributes unassigned work to 🤖 Bots and 🚧 Needs Owner', () => {
    const t = [
      task({ id: 'bot', linearAssignee: null, linearPRs: [{ number: 1, author: 'dependabot[bot]', isWip: false, reviewState: 'approved', needsReviewer: false, url: 'u' }] }),
      task({ id: 'own', linearAssignee: null }),
    ];
    const groups = groupTasks(t, [{ id: 'p_core', name: 'Core' }]);
    const names = groups[0].milestones[0].assignees.map((a) => a.name);
    expect(names).toContain('🤖 Bots');
    expect(names).toContain('🚧 Needs Owner');
    // Needs Owner sorts last
    expect(names[names.length - 1]).toBe('🚧 Needs Owner');
  });

  it('isBotAuthor recognises common bot logins', () => {
    expect(isBotAuthor('renovate[bot]')).toBe(true);
    expect(isBotAuthor('dependabot[bot]')).toBe(true);
    expect(isBotAuthor('some-bot')).toBe(true);
    expect(isBotAuthor('popcorn245')).toBe(false);
  });

  it('verbsForTask maps status → contextual verb', () => {
    expect(verbsForTask(task({ status: 'open', linearState: { name: 'Todo', type: 'unstarted' } }))).toEqual([{ label: 'Start', type: 'build-on-issue', setStatus: 'in_progress', primary: true }]);
    expect(verbsForTask(task({ status: 'in_progress', linearState: { name: 'In Progress', type: 'started' } }))[0].label).toBe('Continue');
    expect(verbsForTask(task({ status: 'open', linearState: { name: 'Backlog', type: 'backlog' } }))[0].label).toBe('Research');
    expect(verbsForTask(task({ status: 'done', linearState: { name: 'Done', type: 'completed' } }))).toEqual([]);
  });

  it('verbsForTask: In Review offers Review, plus Merge only when a PR is approved & not WIP', () => {
    const noMerge = verbsForTask(task({ status: 'in_progress', linearState: { name: 'In Review', type: 'started' }, linearPRs: [{ number: 1, author: 'a', isWip: true, reviewState: 'pending', needsReviewer: false, url: 'u' }] }));
    expect(noMerge.map((v) => v.label)).toEqual(['Review']);
    const withMerge = verbsForTask(task({ status: 'in_progress', linearState: { name: 'In Review', type: 'started' }, linearPRs: [{ number: 2, author: 'a', isWip: false, reviewState: 'approved', needsReviewer: false, url: 'u' }] }));
    expect(withMerge.map((v) => v.label)).toEqual(['Review', 'Merge']);
  });

  it('statusChip: In Progress green ≠ In Review blue; Todo/Backlog gray', () => {
    expect(statusChip(task({ linearState: { name: 'In Progress', type: 'started' } })).tone).toBe('progress');
    expect(statusChip(task({ linearState: { name: 'In Review', type: 'started' } })).tone).toBe('review');
    expect(statusChip(task({ linearState: { name: 'Todo', type: 'unstarted' } })).tone).toBe('todo');
    expect(statusChip(task({ linearState: { name: 'Backlog', type: 'backlog' } })).tone).toBe('todo');
  });

  it('prChips label WIP vs non-WIP + mergeable flag', () => {
    const chips = prChips(task({ linearPRs: [
      { number: 799, author: 'alice', isWip: true, reviewState: 'pending', needsReviewer: true, url: 'u' },
      { number: 812, author: 'bob', isWip: false, reviewState: 'approved', needsReviewer: false, url: 'u' },
    ] }));
    expect(chips[0].label).toBe('WIP PR #799 · alice');
    expect(chips[0].needsReviewer).toBe(true);
    expect(chips[1].label).toBe('PR #812 · bob');
    expect(chips[1].mergeable).toBe(true);
  });

  it('toggleObjective flips only the target, immutably', () => {
    const objs = [{ done: false, text: 'a' }, { done: false, text: 'b' }];
    const next = toggleObjective(objs, 1);
    expect(next[1].done).toBe(true);
    expect(next[0].done).toBe(false);
    expect(objs[1].done).toBe(false); // original untouched
  });
});

// ── Component render ──────────────────────────────────────────────────────────

const asAttr = (o: unknown) => JSON.stringify(o).replace(/"/g, '&quot;');

function html(extra = '', rows: unknown = tasks, tab = 'team') {
  const counts = { action: 1, me: 2, team: 4 };
  const projects = [{ id: 'p_core', name: 'Core', linearUrl: 'https://linear.app/x/core' }];
  return `<pop-snout-work show-header="false" team-name="Snout" tab="${tab}" counts="${asAttr(counts)}" projects="${asAttr(projects)}" tasks="${asAttr(rows)}" ${extra}></pop-snout-work>`;
}

describe('pop-snout-work', () => {
  it('delegates tabs to the shared pop-tab-bar with the active tab + live counts', async () => {
    const page = await newSpecPage({ components: [PopSnoutWork], html: html() });
    const bar = page.root.querySelector('pop-tab-bar');
    expect(bar).not.toBeNull();
    // Child components receive props as properties.
    const tabBar = bar as HTMLElement & { activeTab?: string; tabs?: unknown };
    expect(tabBar.activeTab).toBe('team');
    const tabsJson = (typeof tabBar.tabs === 'string' ? JSON.parse(tabBar.tabs) : tabBar.tabs) as { value: string; label: string; count: number }[];
    expect(tabsJson.map((t: { value: string }) => t.value)).toEqual(['action', 'me', 'team']);
    // Live per-tab MATCH counts from the loaded tasks (a,b,c,d visible; a inAction; a,b are me).
    const team = tabsJson.find((t: { value: string }) => t.value === 'team');
    expect(team.label).toBe('Snout');
    expect(team.count).toBe(4);
    expect(tabsJson.find((t: { value: string }) => t.value === 'action').count).toBe(1);
    expect(tabsJson.find((t: { value: string }) => t.value === 'me').count).toBe(2);
  });

  it('mounts the shared search + funnel (pop-list-filter-sort)', async () => {
    const page = await newSpecPage({ components: [PopSnoutWork], html: html() });
    expect(page.root.querySelector('pop-list-filter-sort')).not.toBeNull();
  });

  it('renders Project-grouped sections of dense issue rows', async () => {
    const page = await newSpecPage({ components: [PopSnoutWork], html: html() });
    expect(page.root.textContent).toContain('PROJECT');
    expect(page.root.textContent).toContain('Core');
    // 4 visible team tasks → 4 issue rows
    expect(page.root.querySelectorAll('.sw-row:not(.sw-skel-row)').length).toBe(4);
    expect(page.root.textContent).toContain('A task');
    // assignee chip surfaces the owner as "Me"
    expect(page.root.textContent).toContain('Me');
  });

  it('renders a coloured status dot + contextual verb per row', async () => {
    const page = await newSpecPage({ components: [PopSnoutWork], html: html() });
    expect(page.root.querySelector('.sw-dot--progress')).not.toBeNull();
    expect(page.root.querySelector('.sw-dot--done')).not.toBeNull();
    const verbs = Array.from(page.root.querySelectorAll('.sw-verb')).map((b) => b.textContent?.trim());
    expect(verbs).toContain('Continue');
    expect(verbs).toContain('Start');
  });

  it('switches rendered content when the (mutable) tab changes', async () => {
    // tab is a mutable prop so the panel also switches standalone (Storybook):
    // Team shows all 4 visible tasks; Me narrows to the owner's 2.
    const page = await newSpecPage({ components: [PopSnoutWork, TabBar], html: html() });
    expect(page.root.querySelectorAll('.sw-row:not(.sw-skel-row)').length).toBe(4);
    (page.rootInstance as PopSnoutWork).tab = 'me';
    await page.waitForChanges();
    expect(page.root.querySelectorAll('.sw-row:not(.sw-skel-row)').length).toBe(2);
    const bar = page.root.querySelector('pop-tab-bar')!;
    expect(bar.getAttribute('activeTab') ?? bar.getAttribute('active-tab')).toBe('me');
  });

  it('emits popVerb with the mapped command type + issueId', async () => {
    const rows = [task({ id: 'a', status: 'open', linearIdentifier: 'ENG-1', linearState: { name: 'Todo', type: 'unstarted' }, linearAssignee: me })];
    const page = await newSpecPage({ components: [PopSnoutWork], html: html('', rows) });
    const spy = vi.fn();
    page.root.addEventListener('popVerb', spy);
    const start = Array.from(page.root.querySelectorAll('.sw-verb')).find((b) => b.textContent?.trim() === 'Start') as HTMLButtonElement;
    start.click();
    await page.waitForChanges();
    expect((spy.mock.calls[0][0] as CustomEvent).detail).toEqual({ taskId: 'a', issueId: 'ENG-1', type: 'build-on-issue', setStatus: 'in_progress' });
  });

  it('renders inline PR chips (WIP + needs-reviewer)', async () => {
    const rows = [task({ id: 'a', linearAssignee: me, linearPRs: [{ number: 799, author: 'alice', isWip: true, reviewState: 'pending', needsReviewer: true, url: 'u' }] })];
    const page = await newSpecPage({ components: [PopSnoutWork], html: html('', rows) });
    expect(page.root.querySelector('.sw-pr--wip')?.textContent).toContain('WIP PR #799');
    expect(page.root.querySelector('.sw-pr--warn')?.textContent).toContain('needs reviewer');
  });

  it('search filters the rendered rows live', async () => {
    const page = await newSpecPage({ components: [PopSnoutWork], html: html() });
    expect(page.root.querySelectorAll('.sw-row:not(.sw-skel-row)').length).toBe(4);
    (page.rootInstance as PopSnoutWork).query = 'A task';
    await page.waitForChanges();
    // Every visible task shares the "A task" title, so all still match; narrow it.
    (page.rootInstance as PopSnoutWork).query = 'zzz-no-match';
    await page.waitForChanges();
    expect(page.root.querySelectorAll('.sw-row:not(.sw-skel-row)').length).toBe(0);
    expect(page.root.querySelector('.sw-empty')).not.toBeNull();
  });

  it('shows an empty state for a tab with no matches', async () => {
    const page = await newSpecPage({ components: [PopSnoutWork], html: html('', [], 'action') });
    expect(page.root.querySelector('.sw-empty')).not.toBeNull();
  });

  it('has NO ⋮ overflow menu; the ENG-key links to Linear (new tab)', async () => {
    const rows = [task({ id: 'a', linearIdentifier: 'ENG-1', linearUrl: 'https://linear.app/x/ENG-1', linearAssignee: me })];
    const page = await newSpecPage({ components: [PopSnoutWork], html: html('', rows) });
    // No overflow trigger anywhere.
    expect(page.root.querySelector('.sw-overflow, [aria-label^="Actions for"]')).toBeNull();
    const link = page.root.querySelector('a.sw-key') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('https://linear.app/x/ENG-1');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toContain('ENG-1');
  });

  it('status chip opens a popover-select that emits popStatusChange', async () => {
    const rows = [task({ id: 'a', linearIdentifier: 'ENG-1', linearState: { name: 'In Progress', type: 'started' }, status: 'in_progress', linearAssignee: me })];
    const page = await newSpecPage({ components: [PopSnoutWork], html: html('', rows) });
    const chip = page.root.querySelector('.sw-statuschip') as HTMLButtonElement;
    expect(chip).not.toBeNull();
    // Closed initially.
    expect(page.root.querySelector('.sw-statusmenu')).toBeNull();
    chip.click();
    await page.waitForChanges();
    const opts = page.root.querySelectorAll('.sw-statusmenu [role="option"]');
    expect(opts.length).toBe(5); // Todo / In Progress / In Review / Done / Canceled
    const spy = vi.fn();
    page.root.addEventListener('popStatusChange', spy);
    (Array.from(opts).find((o) => o.textContent?.trim() === 'Done') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect((spy.mock.calls[0][0] as CustomEvent).detail).toEqual({ taskId: 'a', status: 'done' });
    expect(page.root.querySelector('.sw-statusmenu')).toBeNull(); // closes on select
  });

  it('renders the verb as an icon + label (vertical button)', async () => {
    const rows = [task({ id: 'a', status: 'in_progress', linearState: { name: 'In Progress', type: 'started' }, linearAssignee: me })];
    const page = await newSpecPage({ components: [PopSnoutWork], html: html('', rows) });
    const verb = page.root.querySelector('.sw-verb') as HTMLElement;
    expect(verb.querySelector('.sw-verb-ic')).not.toBeNull();
    expect(verb.querySelector('.sw-verb-label')?.textContent).toBe('Continue');
  });

  it('expanded detail is a READ-ONLY summary (no editor fields)', async () => {
    const rows = [task({ id: 'a', linearIdentifier: 'ENG-1', linearAssignee: me, summary: 'Sync availability with Google Calendar.' })];
    const page = await newSpecPage({ components: [PopSnoutWork], html: html('', rows) });
    (page.rootInstance as PopSnoutWork).expanded = { a: true };
    await page.waitForChanges();
    expect(page.root.querySelector('.sw-summary')?.textContent).toContain('Sync availability');
    // No authoring UI.
    expect(page.root.querySelector('.sw-detail textarea, .sw-detail input, .sw-bc, .sw-obj')).toBeNull();
  });
});
