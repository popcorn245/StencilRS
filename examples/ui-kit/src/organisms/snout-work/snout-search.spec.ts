import {
  normalizeQuery,
  taskMatches,
  passesFilters,
  filterTasks,
  tabCounts,
  needsReviewerCount,
  filterOptions,
  issueGroups,
  assigneeBucketKey,
  assigneeBucketName,
  EMPTY_FILTERS,
  hasActiveFilters,
  BOTS_KEY,
  NEEDS_OWNER_KEY,
  ME_KEY,
  type SnoutFilters,
} from './snout-search';
import type { SnoutTask } from './snout-work.helpers';

const bobby = { id: 'u_bobby', name: 'Bobby Johnson', isMe: true };
const vincent = { id: 'u_vincent', name: 'Vincent Nguyen' };
const cody = { id: 'u_cody', name: 'Cody Tam' };
const ms21 = { id: 'ms21', name: 'v2.1', sortOrder: 1 };
const ms22 = { id: 'ms22', name: 'v2.2', sortOrder: 2 };

function task(over: Partial<SnoutTask> = {}): SnoutTask {
  return {
    id: over.id || 't1',
    title: over.title || 'A task',
    status: over.status || 'open',
    projectId: over.projectId || 'p_a',
    ...over,
  };
}

const tasks: SnoutTask[] = [
  task({ id: 'a', title: 'Calendar sync', status: 'in_progress', projectId: 'p_a', linearIdentifier: 'ENG-1', linearAssignee: bobby, linearMilestone: ms21, inAction: true, linearPRs: [{ number: 812, author: 'popcorn245', isWip: false, reviewState: 'pending', needsReviewer: true, url: 'u' }] }),
  task({ id: 'b', title: 'Confirmation email', status: 'review', projectId: 'p_a', linearIdentifier: 'ENG-2', linearAssignee: vincent, linearMilestone: ms21, inAction: true }),
  task({ id: 'c', title: 'Deposit checkout', status: 'open', projectId: 'p_b', linearIdentifier: 'ENG-3', linearAssignee: cody, linearMilestone: ms22 }),
  task({ id: 'bot', title: 'Bump deps', status: 'open', projectId: 'p_b', linearIdentifier: 'ENG-4', linearAssignee: null, linearPRs: [{ number: 900, author: 'renovate[bot]', isWip: false, reviewState: 'approved', needsReviewer: false, url: 'u' }] }),
  task({ id: 'own', title: 'Triage flaky push', status: 'open', projectId: 'p_a', linearIdentifier: 'ENG-5', linearAssignee: null }),
  task({ id: 'hid', title: 'Hidden', status: 'open', projectId: 'p_a', hidden: true, linearAssignee: bobby }),
];
const projects = [
  { id: 'p_a', name: 'Booking' },
  { id: 'p_b', name: 'Billing' },
];

describe('snout-search: attribution', () => {
  it('assigneeBucketKey maps owner → Me, others → id, unassigned → Bots/Needs Owner', () => {
    expect(assigneeBucketKey(tasks[0])).toBe(ME_KEY);
    expect(assigneeBucketKey(tasks[1])).toBe('u_vincent');
    expect(assigneeBucketKey(tasks[3])).toBe(BOTS_KEY); // bot-authored PR, unassigned
    expect(assigneeBucketKey(tasks[4])).toBe(NEEDS_OWNER_KEY); // unassigned, no bot PR
  });

  it('assigneeBucketName gives friendly labels', () => {
    expect(assigneeBucketName(tasks[0])).toBe('Me');
    expect(assigneeBucketName(tasks[1])).toBe('Vincent Nguyen');
    expect(assigneeBucketName(tasks[3])).toBe('🤖 Bots');
    expect(assigneeBucketName(tasks[4])).toBe('🚧 Needs Owner');
  });
});

describe('snout-search: search + filters', () => {
  it('normalizeQuery trims + lowercases', () => {
    expect(normalizeQuery('  Foo Bar ')).toBe('foo bar');
  });

  it('taskMatches by title / ENG-key / assignee / PR', () => {
    expect(taskMatches(tasks[0], 'calendar')).toBe(true);
    expect(taskMatches(tasks[0], 'eng-1')).toBe(true);
    expect(taskMatches(tasks[1], 'vincent')).toBe(true);
    expect(taskMatches(tasks[0], '812')).toBe(true);
    expect(taskMatches(tasks[0], 'nope')).toBe(false);
    expect(taskMatches(tasks[0], '')).toBe(true);
  });

  it('passesFilters gates by project / milestone / assignee / status / hasPr / needsReviewer', () => {
    const f = (o: Partial<SnoutFilters>): SnoutFilters => ({ ...EMPTY_FILTERS, ...o });
    expect(passesFilters(tasks[0], f({ project: 'p_a' }))).toBe(true);
    expect(passesFilters(tasks[0], f({ project: 'p_b' }))).toBe(false);
    expect(passesFilters(tasks[0], f({ milestone: 'ms21' }))).toBe(true);
    expect(passesFilters(tasks[2], f({ milestone: 'ms21' }))).toBe(false);
    expect(passesFilters(tasks[0], f({ assignee: ME_KEY }))).toBe(true);
    expect(passesFilters(tasks[1], f({ assignee: ME_KEY }))).toBe(false);
    expect(passesFilters(tasks[0], f({ status: 'in_progress' }))).toBe(true);
    expect(passesFilters(tasks[0], f({ status: 'done' }))).toBe(false);
    expect(passesFilters(tasks[0], f({ hasPr: 'yes' }))).toBe(true);
    expect(passesFilters(tasks[4], f({ hasPr: 'yes' }))).toBe(false);
    expect(passesFilters(tasks[0], f({ needsReviewer: true }))).toBe(true);
    expect(passesFilters(tasks[3], f({ needsReviewer: true }))).toBe(false);
  });

  it('filterTasks excludes hidden + applies query + filters', () => {
    expect(filterTasks(tasks, '', EMPTY_FILTERS).map((t) => t.id)).not.toContain('hid');
    expect(filterTasks(tasks, 'calendar', EMPTY_FILTERS).map((t) => t.id)).toEqual(['a']);
    expect(filterTasks(tasks, '', { ...EMPTY_FILTERS, project: 'p_b' }).map((t) => t.id).sort()).toEqual(['bot', 'c']);
  });

  it('hasActiveFilters detects any non-empty funnel filter', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: 'done' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, needsReviewer: true })).toBe(true);
  });
});

describe('snout-search: counts', () => {
  it('tabCounts gives per-tab match counts (equal to totals with no query)', () => {
    const c = tabCounts(tasks, '', EMPTY_FILTERS);
    // action = inAction (a,b); me = owner (a); team = all visible (a,b,c,bot,own)
    expect(c).toEqual({ action: 2, me: 1, team: 5 });
  });

  it('tabCounts narrows with a query', () => {
    const c = tabCounts(tasks, 'calendar', EMPTY_FILTERS);
    expect(c).toEqual({ action: 1, me: 1, team: 1 });
  });

  it('needsReviewerCount counts PRs still needing a reviewer', () => {
    expect(needsReviewerCount(tasks)).toBe(1);
  });
});

describe('snout-search: filter options', () => {
  it('filterOptions lists only present projects/milestones/assignees/statuses', () => {
    const opts = filterOptions(tasks, projects);
    expect(opts.projects.map((p) => p.value)).toEqual(['p_a', 'p_b']);
    expect(opts.milestones.map((m) => m.label)).toEqual(['v2.1', 'v2.2']);
    // Me first, then real people, then Bots, then Needs Owner
    expect(opts.assignees[0].value).toBe(ME_KEY);
    expect(opts.assignees.map((a) => a.label)).toContain('🤖 Bots');
    expect(opts.assignees[opts.assignees.length - 1].label).toBe('🚧 Needs Owner');
    expect(opts.statuses.map((s) => s.value).sort()).toEqual(['in_progress', 'open', 'review']);
  });
});

describe('snout-search: grouping', () => {
  it('issueGroups pins Bots + Needs Owner first, then projects in order', () => {
    const groups = issueGroups(filterTasks(tasks, '', EMPTY_FILTERS), projects);
    expect(groups.map((g) => g.kind)).toEqual(['bots', 'needs-owner', 'project', 'project']);
    expect(groups[0].name).toBe('🤖 Bots');
    expect(groups[1].name).toBe('🚧 Needs Owner');
    expect(groups[2].name).toBe('Booking');
    expect(groups[3].name).toBe('Billing');
  });

  it('issueGroups routes assigned tasks to their project, unassigned to pinned buckets', () => {
    const groups = issueGroups(filterTasks(tasks, '', EMPTY_FILTERS), projects);
    const booking = groups.find((g) => g.name === 'Booking')!;
    expect(booking.tasks.map((t) => t.id).sort()).toEqual(['a', 'b']); // cody's 'c' is in Billing
    expect(groups.find((g) => g.kind === 'bots')!.tasks.map((t) => t.id)).toEqual(['bot']);
    expect(groups.find((g) => g.kind === 'needs-owner')!.tasks.map((t) => t.id)).toEqual(['own']);
  });

  it('issueGroups reports active counts', () => {
    const withDone = [...tasks, task({ id: 'd', projectId: 'p_a', status: 'done', linearAssignee: bobby })];
    const groups = issueGroups(filterTasks(withDone, '', EMPTY_FILTERS), projects);
    const booking = groups.find((g) => g.name === 'Booking')!;
    expect(booking.count).toBe(3); // a, b, d
    expect(booking.active).toBe(2); // a, b (d is done)
  });
});

describe('snout-search: person→project grouping (team tab)', () => {
  it("groups top-level by assignee (Me first), each with project sub-groups", () => {
    const groups = issueGroups(filterTasks(tasks, '', EMPTY_FILTERS), projects, 'person');
    // Me first, then Vincent/Cody, then Bots, then Needs Owner
    expect(groups[0].kind).toBe('me');
    expect(groups[0].name).toBe('Me');
    expect(groups[groups.length - 1].name).toBe('🚧 Needs Owner');
    expect(groups.map((g) => g.name)).toContain('🤖 Bots');
    // Every top-level person group nests project sub-groups (no flat rows)
    for (const g of groups) {
      expect(g.tasks).toEqual([]);
      expect(g.subgroups && g.subgroups.length).toBeGreaterThan(0);
      expect(g.subgroups!.every((s) => s.kind === 'project')).toBe(true);
    }
  });

  it('puts a person’s issues under their own project sub-group', () => {
    const groups = issueGroups(filterTasks(tasks, '', EMPTY_FILTERS), projects, 'person');
    const me = groups.find((g) => g.kind === 'me')!;
    // Bobby ('a' Booking) → one Booking sub-group with task a
    const booking = me.subgroups!.find((s) => s.name === 'Booking')!;
    expect(booking.tasks.map((t) => t.id)).toEqual(['a']);
    expect(me.count).toBe(1);
  });

  it('default mode stays project-first (unchanged)', () => {
    const groups = issueGroups(filterTasks(tasks, '', EMPTY_FILTERS), projects);
    expect(groups[0].kind).toBe('bots');
    expect(groups.some((g) => g.subgroups)).toBe(false);
  });
});
