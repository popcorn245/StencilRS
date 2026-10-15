/**
 * Panel-wide Snout search + filter + grouping — the pure predicates, the
 * per-tab match counts, the funnel filter option lists, and the flattened
 * Project-grouped issue tree. Mirrors the inventory panel's
 * `state/inventory-search.ts` split: ONE query + a funnel of filters narrow the
 * ACTIVE tab, the tab bubbles show per-tab MATCH counts while a query/filter is
 * active, and the list groups into pinned (🤖 Bots / 🚧 Needs Owner) + per-
 * Project collapsible sections of dense issue rows.
 *
 * No StencilJS / DOM imports — framework-agnostic + unit-tested in
 * snout-search.spec.ts (inventory-search precedent).
 */
import type { SnoutTask, SnoutProject, SnoutCounts } from './snout-work.helpers';
import { assigneeIsOwner, isBotAuthor, isActive, filterByTab } from './snout-work.helpers';

// ── Pinned attribution buckets (unassigned work) ─────────────────────────────
export const BOTS_KEY = '__bots__';
export const NEEDS_OWNER_KEY = '__needs_owner__';
export const ME_KEY = '__me__';

/** The status buckets shown in the funnel + the ⋮ set-status menu. */
export const STATUS_CHOICES: Array<{ value: string; label: string }> = [
  { value: 'open', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Canceled' },
];

/** The active funnel filters (mirrors inventory's Show/Category/Space set). */
export interface SnoutFilters {
  /** Project id, or '' = all. */
  project: string;
  /** Milestone id (or '__none__' for no-milestone), or '' = all. */
  milestone: string;
  /** Assignee bucket key (assignee id / Me / Bots / Needs Owner), or '' = all. */
  assignee: string;
  /** Bucket status value (open / in_progress / review / done / cancelled), or ''. */
  status: string;
  /** Only issues with at least one linked PR. */
  hasPr: '' | 'yes';
  /** The "⚠ needs reviewer" chip on the search bar. */
  needsReviewer: boolean;
}

export const EMPTY_FILTERS: SnoutFilters = {
  project: '',
  milestone: '',
  assignee: '',
  status: '',
  hasPr: '',
  needsReviewer: false,
};

/** True when any funnel filter (not the free-text query) is active. */
export function hasActiveFilters(f: SnoutFilters): boolean {
  return !!(f.project || f.milestone || f.assignee || f.status || f.hasPr || f.needsReviewer);
}

// ── Assignee attribution (shared by grouping + the assignee filter) ──────────

/** The bucket key an issue attributes to: the owner (Me), a real assignee (by
 *  id), or — when unassigned — 🤖 Bots (a bot-authored PR) vs 🚧 Needs Owner. */
export function assigneeBucketKey(t: SnoutTask): string {
  const a = t.linearAssignee ?? null;
  if (a) return assigneeIsOwner(a) ? ME_KEY : a.id;
  const botPr = (t.linearPRs || []).some((pr) => isBotAuthor(pr.author));
  return botPr ? BOTS_KEY : NEEDS_OWNER_KEY;
}

/** The human label for a bucket key (Me / a person / the pinned buckets). */
export function assigneeBucketName(t: SnoutTask): string {
  const a = t.linearAssignee ?? null;
  if (a) return assigneeIsOwner(a) ? 'Me' : a.name;
  return assigneeBucketKey(t) === BOTS_KEY ? '🤖 Bots' : '🚧 Needs Owner';
}

// ── Free-text search ─────────────────────────────────────────────────────────

/** Normalize the raw search text once (trim + lowercase). */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Issue match: ENG-key / title / assignee / milestone / PR author+number /
 *  summary (case-insensitive substring). */
export function taskMatches(t: SnoutTask, q: string): boolean {
  if (!q) return true;
  const hay = [
    t.title,
    t.linearIdentifier,
    t.linearAssignee?.name,
    t.linearMilestone?.name,
    t.summary,
    ...(t.linearPRs || []).flatMap((p) => [`#${p.number}`, String(p.number), p.author]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

/** Does an issue satisfy the funnel filters? */
export function passesFilters(t: SnoutTask, f: SnoutFilters): boolean {
  if (f.project && (t.projectId || '') !== f.project) return false;
  if (f.milestone && (t.linearMilestone?.id || '__none__') !== f.milestone) return false;
  if (f.assignee && assigneeBucketKey(t) !== f.assignee) return false;
  if (f.status && t.status !== f.status) return false;
  const prs = t.linearPRs || [];
  if (f.hasPr === 'yes' && prs.length === 0) return false;
  if (f.needsReviewer && !prs.some((p) => p.needsReviewer)) return false;
  return true;
}

/** Apply the query + funnel filters (soft-hidden always excluded). Tab is NOT
 *  applied here — callers layer `filterByTab` on top. */
export function filterTasks(tasks: SnoutTask[], query: string, f: SnoutFilters): SnoutTask[] {
  const q = normalizeQuery(query);
  return tasks.filter((t) => t.hidden !== true && taskMatches(t, q) && passesFilters(t, f));
}

/** Per-tab MATCH counts for the tab bubbles — the count of search+filter matches
 *  within each tab (so `Action 0 · Team 3` routes the user). Equals the tab
 *  totals when the query + filters are empty. */
export function tabCounts(tasks: SnoutTask[], query: string, f: SnoutFilters): SnoutCounts {
  const base = filterTasks(tasks, query, f);
  return {
    action: filterByTab(base, 'action').length,
    me: filterByTab(base, 'me').length,
    team: filterByTab(base, 'team').length,
  };
}

/** How many visible issues have a PR still needing a reviewer (the search-bar
 *  chip's count — panel-level, independent of the active tab). */
export function needsReviewerCount(tasks: SnoutTask[]): number {
  return tasks.filter((t) => t.hidden !== true && (t.linearPRs || []).some((p) => p.needsReviewer)).length;
}

// ── The funnel's option lists (only values present in the data) ──────────────

export interface FilterOptions {
  projects: Array<{ value: string; label: string }>;
  milestones: Array<{ value: string; label: string }>;
  assignees: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
}

/** Distinct filter options derived from the visible tasks — so the funnel only
 *  offers projects/milestones/assignees/statuses that actually occur. */
export function filterOptions(tasks: SnoutTask[], projects: SnoutProject[]): FilterOptions {
  const visible = tasks.filter((t) => t.hidden !== true);
  const projMeta = new Map(projects.map((p) => [p.id, p]));
  const projOrder = new Map(projects.map((p, i) => [p.id, i]));

  const projIds = new Set<string>();
  const milestones = new Map<string, { name: string; sortOrder: number }>();
  const assignees = new Map<string, string>();
  const statuses = new Set<string>();
  for (const t of visible) {
    if (t.projectId) projIds.add(t.projectId);
    const ms = t.linearMilestone;
    if (ms) milestones.set(ms.id, { name: ms.name, sortOrder: ms.sortOrder });
    assignees.set(assigneeBucketKey(t), assigneeBucketName(t));
    if (t.status) statuses.add(t.status);
  }

  const projectOpts = [...projIds]
    .map((id) => ({ value: id, label: projMeta.get(id)?.name || id }))
    .sort((a, b) => {
      const oa = projOrder.has(a.value) ? projOrder.get(a.value)! : Number.POSITIVE_INFINITY;
      const ob = projOrder.has(b.value) ? projOrder.get(b.value)! : Number.POSITIVE_INFINITY;
      return oa !== ob ? oa - ob : a.label.localeCompare(b.label);
    });

  const milestoneOpts = [...milestones.entries()]
    .map(([value, m]) => ({ value, label: m.name, sortOrder: m.sortOrder }))
    .sort((a, b) => (a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.label.localeCompare(b.label)))
    .map(({ value, label }) => ({ value, label }));

  const assigneeOpts = [...assignees.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => assigneeOptionRank(a.value) - assigneeOptionRank(b.value) || a.label.localeCompare(b.label));

  const statusOpts = STATUS_CHOICES.filter((s) => statuses.has(s.value));

  return { projects: projectOpts, milestones: milestoneOpts, assignees: assigneeOpts, statuses: statusOpts };
}

function assigneeOptionRank(key: string): number {
  if (key === ME_KEY) return 0;
  if (key === NEEDS_OWNER_KEY) return 3;
  if (key === BOTS_KEY) return 2;
  return 1;
}

// ── Grouping (project-first, or person→project for the team tab) ─────────────

export type IssueGroupKind = 'bots' | 'needs-owner' | 'project' | 'person' | 'me';

/** How the list groups. `project` (Action/Me tabs): pinned Bots/Needs-Owner +
 *  per-project sections of flat rows. `person` (the team/"Sonic" tab): top-level
 *  by assignee (a person — incl. the Bots / Needs Owner buckets), each with a
 *  project SUB-group underneath. */
export type GroupMode = 'project' | 'person';

export interface IssueGroup {
  key: string;
  kind: IssueGroupKind;
  /** Project id (for Post Update) or the assignee/bucket key. */
  id: string;
  name: string;
  linearUrl?: string;
  /** The rows in this group (empty when `subgroups` is present). */
  tasks: SnoutTask[];
  /** Nested project sub-sections (person mode only); undefined = a leaf group. */
  subgroups?: IssueGroup[];
  count: number;
  active: number;
}

const NO_PROJECT = '__noproject__';

/**
 * Group the (already tab + search + filter-limited) issues.
 *
 * `project` mode (default): 🤖 Bots and 🚧 Needs Owner PINNED first (unassigned
 * work needing attention), then per-Project sections in `projects` order.
 * Milestone + assignee ride each row as chips.
 *
 * `person` mode (the team/"Sonic" tab): top-level by ASSIGNEE — Me first, then
 * real people, then the 🤖 Bots / 🚧 Needs Owner buckets (treated as "people") —
 * and under each person a PROJECT sub-group of rows.
 */
export function issueGroups(tasks: SnoutTask[], projects: SnoutProject[] = [], mode: GroupMode = 'project'): IssueGroup[] {
  return mode === 'person' ? groupByPerson(tasks, projects) : groupByProject(tasks, projects);
}

function groupByProject(tasks: SnoutTask[], projects: SnoutProject[]): IssueGroup[] {
  const bots: SnoutTask[] = [];
  const needsOwner: SnoutTask[] = [];
  const byProject = new Map<string, SnoutTask[]>();
  for (const t of tasks) {
    if (t.hidden === true) continue;
    const key = assigneeBucketKey(t);
    if (key === BOTS_KEY) bots.push(t);
    else if (key === NEEDS_OWNER_KEY) needsOwner.push(t);
    else {
      const pid = t.projectId || NO_PROJECT;
      (byProject.get(pid) ?? byProject.set(pid, []).get(pid)!).push(t);
    }
  }

  const groups: IssueGroup[] = [];
  const pin = (key: string, kind: IssueGroupKind, name: string, list: SnoutTask[]) => {
    if (!list.length) return;
    groups.push({ key, kind, id: key, name, tasks: sortTasks(list), count: list.length, active: list.filter(isActive).length });
  };
  pin(BOTS_KEY, 'bots', '🤖 Bots', bots);
  pin(NEEDS_OWNER_KEY, 'needs-owner', '🚧 Needs Owner', needsOwner);

  return [...groups, ...projectLeaves(byProject, projects)];
}

function groupByPerson(tasks: SnoutTask[], projects: SnoutProject[]): IssueGroup[] {
  // person key → { name, kind, tasks }
  const people = new Map<string, { name: string; kind: IssueGroupKind; tasks: SnoutTask[] }>();
  for (const t of tasks) {
    if (t.hidden === true) continue;
    const key = assigneeBucketKey(t);
    const kind: IssueGroupKind = key === ME_KEY ? 'me' : key === BOTS_KEY ? 'bots' : key === NEEDS_OWNER_KEY ? 'needs-owner' : 'person';
    const bucket = people.get(key) ?? { name: assigneeBucketName(t), kind, tasks: [] };
    bucket.tasks.push(t);
    people.set(key, bucket);
  }

  const groups: IssueGroup[] = [...people.entries()].map(([key, p]) => {
    const byProject = new Map<string, SnoutTask[]>();
    for (const t of p.tasks) {
      const pid = t.projectId || NO_PROJECT;
      (byProject.get(pid) ?? byProject.set(pid, []).get(pid)!).push(t);
    }
    const subgroups = projectLeaves(byProject, projects).map((g) => ({ ...g, key: `${key}/${g.key}` }));
    return {
      key: `u:${key}`,
      kind: p.kind,
      id: key,
      name: p.name,
      tasks: [],
      subgroups,
      count: p.tasks.length,
      active: p.tasks.filter(isActive).length,
    };
  });

  groups.sort((a, b) => personRank(a.id) - personRank(b.id) || a.name.localeCompare(b.name));
  return groups;
}

/** Per-project leaf groups (flat rows), ordered by the `projects` array. */
function projectLeaves(byProject: Map<string, SnoutTask[]>, projects: SnoutProject[]): IssueGroup[] {
  const projMeta = new Map(projects.map((p) => [p.id, p]));
  const projOrder = new Map(projects.map((p, i) => [p.id, i]));
  const leaves: IssueGroup[] = [...byProject.entries()].map(([pid, list]) => ({
    key: `p:${pid}`,
    kind: 'project' as const,
    id: pid,
    name: projMeta.get(pid)?.name || (pid === NO_PROJECT ? 'No project' : pid),
    linearUrl: projMeta.get(pid)?.linearUrl,
    tasks: sortTasks(list),
    count: list.length,
    active: list.filter(isActive).length,
  }));
  leaves.sort((a, b) => {
    const oa = projOrder.has(a.id) ? projOrder.get(a.id)! : Number.POSITIVE_INFINITY;
    const ob = projOrder.has(b.id) ? projOrder.get(b.id)! : Number.POSITIVE_INFINITY;
    return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
  });
  return leaves;
}

/** Person order in person mode: Me first, real people, then Bots, Needs Owner. */
function personRank(key: string): number {
  if (key === ME_KEY) return 0;
  if (key === NEEDS_OWNER_KEY) return 3;
  if (key === BOTS_KEY) return 2;
  return 1;
}

/** Row order within a group: active before done/cancelled, then by milestone
 *  sortOrder, then by identifier (stable, readable). */
function sortTasks(tasks: SnoutTask[]): SnoutTask[] {
  return tasks.slice().sort((a, b) => {
    const aa = isActive(a) ? 0 : 1;
    const ba = isActive(b) ? 0 : 1;
    if (aa !== ba) return aa - ba;
    const ao = a.linearMilestone?.sortOrder ?? Number.POSITIVE_INFINITY;
    const bo = b.linearMilestone?.sortOrder ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return (a.linearIdentifier || a.id).localeCompare(b.linearIdentifier || b.id);
  });
}
