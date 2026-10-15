/**
 * Pure helpers + view types for pop-snout-work. No StencilJS / DOM imports so
 * they unit-test in isolation and keep the organism thin. Shapes mirror the
 * Bucket Hub's /api/hub/snout payload (which itself mirrors the Bucket Bridge
 * data-model), re-declared here so ui-kit stays free of any app-package
 * dependency.
 *
 * The Snout brand mark is the bundled `snout-logo` asset (fill=currentColor) —
 * NEVER the pig emoji (Snout is a cat + dog pet-care company). The inline
 * markup below lets the organism recolour it via `--color-snout-orange`.
 */

/** The bundled Snout logo, inline so it recolours with `currentColor`
 *  (→ `--color-snout-orange`). Byte-for-byte the `snout-logo` asset. */
export const SNOUT_LOGO_SVG =
  '<svg viewBox="0 0 66 69" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:1em;height:1em" aria-hidden="true" focusable="false">' +
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M33.2595 68.591C51.3415 68.591 66.0005 53.2376 66.0005 34.297C66.0005 15.3553 51.3415 0 33.2595 0C15.1755 0 0.514648 15.3553 0.514648 34.297C0.514648 53.2376 15.1755 68.591 33.2595 68.591ZM57.2797 41.1717L57.3805 41.1777C57.795 41.1993 58.1728 41.3887 58.4478 41.7101C58.7276 42.0305 58.8661 42.4446 58.8435 42.8745C58.5948 47.756 57.0423 51.4958 54.2237 53.9824C51.0999 56.7332 47.2545 57.1503 45.2414 57.1513C44.7722 57.1513 44.4227 57.1276 44.2324 57.1089L44.1373 57.1069C40.2721 57.0813 37.1944 55.7581 34.992 53.1709C34.6067 52.7095 34.2346 52.1859 33.8615 51.5569L32.9854 50.1036L32.1112 51.5559C31.7146 52.2086 31.3538 52.7193 30.9732 53.164C28.7735 55.7581 25.6987 57.0813 21.8307 57.1069L21.7327 57.1089C21.5509 57.1296 21.2203 57.1503 20.7747 57.1503C18.8953 57.1503 15.2929 56.7598 12.3067 54.1411C9.48996 51.6654 7.92806 47.8783 7.66994 42.8775C7.6266 41.9852 8.27567 41.223 9.13481 41.1757L9.22807 41.1717C10.0279 41.1717 10.7099 41.8599 10.7495 42.7098C10.9567 46.775 12.1475 49.7871 14.2925 51.6614C16.5355 53.6314 19.2976 53.9242 20.7492 53.9242C21.1581 53.9242 21.4256 53.9015 21.4558 53.8966L21.5424 53.8887C21.5971 53.8808 21.6536 53.8759 21.7092 53.8759C24.7425 53.8759 27.0166 52.9481 28.6586 51.0314C30.7678 48.5615 31.302 43.261 31.4357 41.0288V37.2131L30.636 37.0218C26.4269 35.9905 23.4877 32.5988 23.4877 28.7703C23.4877 25.0246 26.4627 23.4274 33.4348 23.4274C40.2467 23.4274 43.0247 24.9773 43.0247 28.7703C43.0247 32.7861 39.7775 36.3109 35.3038 37.151L34.4512 37.3117V39.3635L34.5313 41.0948C34.6604 43.2571 35.1898 48.5467 37.3131 51.0314C38.9523 52.9451 41.2236 53.8759 44.2626 53.8759C44.3276 53.8759 44.3964 53.8808 44.4604 53.8887C44.694 53.9143 45.068 53.9232 45.2649 53.9232C46.8551 53.9232 49.8847 53.6047 52.2756 51.4741C54.3876 49.585 55.5605 46.634 55.7583 42.7098C55.8026 41.8639 56.4865 41.1717 57.2797 41.1717Z" fill="currentColor"/>' +
  '</svg>';

// ── Owner (Snout) identity ────────────────────────────────────────────────────

/** The owner's Linear display name — the "Me" tab / group key. Kept as a single
 *  constant so the literal is never scattered (server mirrors it in config). */
export const OWNER_LINEAR_NAME = 'Bobby Johnson';

/** True when a Linear assignee maps to the owner (prefer the server-set `isMe`
 *  flag, fall back to the display name). */
export function assigneeIsOwner(a: SnoutAssignee | null | undefined): boolean {
  if (!a) return false;
  return a.isMe === true || a.name === OWNER_LINEAR_NAME;
}

/** Whether a PR author login looks like a bot (renovate/dependabot/…[bot]). We
 *  only ever inspect `linearPRs[].author` — no deeper bot modelling. */
export function isBotAuthor(author: string | undefined | null): boolean {
  if (!author) return false;
  return /\bbot\b/i.test(author) || /\[bot\]$/i.test(author) || /^(renovate|dependabot|greenkeeper)/i.test(author);
}

// ── Hub-owned breadcrumb fields (authored in the panel, never pushed to Linear) ─

export interface SnoutObjective {
  done: boolean;
  text: string;
}

export interface SnoutNote {
  ts: number;
  text: string;
}

/** The four hub-owned "breadcrumb" fields the panel authors. The bridge writes a
 *  default once and masks these keys on re-sync, so hub edits survive. */
export interface SnoutBreadcrumbs {
  objectives?: SnoutObjective[];
  notes?: SnoutNote[];
  tdd?: string | null;
  summary?: string;
}

// ── Payload types (mirror /api/hub/snout) ────────────────────────────────────

export interface SnoutAssignee {
  id: string;
  name: string;
  avatarUrl?: string;
  /** The bridge marks the owner's issues (`linearAssignee` maps to owner uid). */
  isMe?: boolean;
}

export interface SnoutMilestone {
  id: string;
  name: string;
  sortOrder: number;
}

export interface SnoutState {
  name: string;
  type: string;
}

export type SnoutReviewState = 'pending' | 'approved' | 'changes_requested' | 'none';

export interface SnoutPR {
  number: number;
  author: string;
  isWip: boolean;
  reviewState: SnoutReviewState;
  needsReviewer: boolean;
  url: string;
}

export interface SnoutTask {
  id: string;
  title: string;
  status: string;
  priority?: string;
  questId?: string;
  projectId?: string;
  linearIdentifier?: string;
  linearUrl?: string;
  linearState?: SnoutState | null;
  linearAssignee?: SnoutAssignee | null;
  linearMilestone?: SnoutMilestone | null;
  linearPRs?: SnoutPR[];
  /** Server-evaluated Action predicate (see hub-integration). */
  inAction?: boolean;
  /** Bridge soft-hide (out-of-scope / archived) — never shown or counted. */
  hidden?: boolean;
  // ── Hub-owned breadcrumb fields (authored in the panel) ──
  objectives?: SnoutObjective[];
  notes?: SnoutNote[];
  tdd?: string | null;
  summary?: string;
}

export interface SnoutProject {
  id: string;
  name: string;
  companyId?: string;
  linearUrl?: string;
  total?: number;
  active?: number;
}

export interface SnoutPrompt {
  id: string;
  kind: 'permission';
  toolName: string;
  input: Record<string, unknown>;
  suggestions?: unknown[];
  status: 'pending' | 'answered' | 'timeout';
  createdAt?: string | number;
}

export interface SnoutInboxMessage {
  id?: string;
  text: string;
  status: 'pending' | 'delivered';
  createdAt?: string | number;
}

export interface SnoutCommand {
  id: string;
  type: string;
  issueId?: string;
  taskId?: string;
  status: string; // 'pending' | 'running' | 'awaiting_permission' | 'awaiting_input' | 'done' | 'error' | 'cancelled'
  interactive?: boolean;
  waitingOn?: null | 'permission' | 'input';
  stopRequested?: boolean;
  milestones?: string[];
  prompts?: SnoutPrompt[];
  result?: { summary?: string; prUrl?: string };
  error?: string;
}

export interface SnoutCounts {
  action: number;
  me: number;
  team: number;
}

export type SnoutTab = 'action' | 'me' | 'team';

// ── Tab predicate ─────────────────────────────────────────────────────────────

/** Filter the whole-team task list for the active tab. Soft-hidden tasks
 *  (`hidden === true`) are ALWAYS excluded. `action` uses the server-evaluated
 *  `inAction` flag; `me` maps to the owner; `team` is the curated set. */
export function filterByTab(tasks: SnoutTask[], tab: SnoutTab): SnoutTask[] {
  const visible = tasks.filter((t) => t.hidden !== true);
  if (tab === 'action') return visible.filter((t) => t.inAction === true);
  if (tab === 'me') return visible.filter((t) => assigneeIsOwner(t.linearAssignee));
  return visible;
}

/** "Active" = not done / cancelled (the (N active) badge denominator). */
export function isActive(t: SnoutTask): boolean {
  return t.status !== 'done' && t.status !== 'cancelled';
}

// ── 4-level grouping: Project → Milestone → Assignee → Issue ──────────────────

export interface AssigneeGroup {
  key: string;
  name: string;
  assignee: SnoutAssignee | null;
  isMe: boolean;
  tasks: SnoutTask[];
  count: number;
  active: number;
}

export interface MilestoneGroup {
  key: string;
  name: string;
  milestone: SnoutMilestone | null;
  sortOrder: number;
  assignees: AssigneeGroup[];
  count: number;
  active: number;
}

export interface ProjectGroup {
  key: string;
  id: string;
  name: string;
  linearUrl?: string;
  milestones: MilestoneGroup[];
  count: number;
  active: number;
}

const NO_MILESTONE_KEY = '__none__';
const BOTS_KEY = '__bots__';
const NEEDS_OWNER_KEY = '__needs_owner__';

/**
 * Build the 4-level tree. Milestones are ordered by `sortOrder` with a
 * "No milestone" bucket LAST; assignees put the owner ("Me") first, then by
 * name; projects follow the `projects` array order (falling back to name).
 */
export function groupTasks(tasks: SnoutTask[], projects: SnoutProject[] = []): ProjectGroup[] {
  const projMeta = new Map(projects.map((p) => [p.id, p]));
  const projOrder = new Map(projects.map((p, i) => [p.id, i]));

  // project id → milestone key → assignee key → tasks (soft-hidden excluded)
  const byProject = new Map<string, SnoutTask[]>();
  for (const t of tasks) {
    if (t.hidden === true) continue;
    const pid = t.projectId || '__noproject__';
    const list = byProject.get(pid) ?? [];
    list.push(t);
    byProject.set(pid, list);
  }

  const projectGroups: ProjectGroup[] = [];
  for (const [pid, pTasks] of byProject) {
    const meta = projMeta.get(pid);
    const milestones = groupMilestones(pTasks);
    projectGroups.push({
      key: pid,
      id: pid,
      name: meta?.name || (pid === '__noproject__' ? 'No project' : pid),
      linearUrl: meta?.linearUrl,
      milestones,
      count: pTasks.length,
      active: pTasks.filter(isActive).length,
    });
  }

  projectGroups.sort((a, b) => {
    const oa = projOrder.has(a.id) ? projOrder.get(a.id)! : Number.POSITIVE_INFINITY;
    const ob = projOrder.has(b.id) ? projOrder.get(b.id)! : Number.POSITIVE_INFINITY;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
  return projectGroups;
}

function groupMilestones(tasks: SnoutTask[]): MilestoneGroup[] {
  const buckets = new Map<string, { ms: SnoutMilestone | null; tasks: SnoutTask[] }>();
  for (const t of tasks) {
    const ms = t.linearMilestone ?? null;
    const key = ms?.id || NO_MILESTONE_KEY;
    const b = buckets.get(key) ?? { ms, tasks: [] };
    b.tasks.push(t);
    buckets.set(key, b);
  }
  const groups: MilestoneGroup[] = [];
  for (const [key, b] of buckets) {
    groups.push({
      key,
      name: b.ms?.name || 'No milestone',
      milestone: b.ms,
      sortOrder: b.ms ? b.ms.sortOrder : Number.POSITIVE_INFINITY,
      assignees: groupAssignees(b.tasks),
      count: b.tasks.length,
      active: b.tasks.filter(isActive).length,
    });
  }
  groups.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
  return groups;
}

/** Resolve an issue's assignee bucket. A real Linear assignee groups by id;
 *  otherwise the bridge's attribution rule applies: a bot-authored PR → the
 *  "🤖 Bots" bucket, everything else unassigned → "🚧 Needs Owner". */
function bucketFor(t: SnoutTask): { key: string; name: string; assignee: SnoutAssignee | null; isMe: boolean } {
  const a = t.linearAssignee ?? null;
  if (a) {
    const me = assigneeIsOwner(a);
    return { key: me ? '__me__' : a.id, name: me ? 'Me' : a.name, assignee: a, isMe: me };
  }
  const botPr = (t.linearPRs || []).some((pr) => isBotAuthor(pr.author));
  return botPr
    ? { key: BOTS_KEY, name: '🤖 Bots', assignee: null, isMe: false }
    : { key: NEEDS_OWNER_KEY, name: '🚧 Needs Owner', assignee: null, isMe: false };
}

/** Sort rank: Me first, real people (by name) next, then Bots, then Needs Owner. */
function assigneeRank(g: AssigneeGroup): number {
  if (g.isMe) return 0;
  if (g.key === NEEDS_OWNER_KEY) return 3;
  if (g.key === BOTS_KEY) return 2;
  return 1;
}

function groupAssignees(tasks: SnoutTask[]): AssigneeGroup[] {
  const buckets = new Map<string, AssigneeGroup>();
  for (const t of tasks) {
    const b = bucketFor(t);
    const g = buckets.get(b.key) ?? { key: b.key, name: b.name, assignee: b.assignee, isMe: b.isMe, tasks: [], count: 0, active: 0 };
    g.tasks.push(t);
    buckets.set(b.key, g);
  }
  const groups = [...buckets.values()].map((g) => ({ ...g, count: g.tasks.length, active: g.tasks.filter(isActive).length }));
  groups.sort((a, b) => {
    const ra = assigneeRank(a);
    const rb = assigneeRank(b);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
  return groups;
}

// ── Contextual verb button by status ──────────────────────────────────────────

export type VerbType = 'build-on-issue' | 'research' | 'investigate' | 'review' | 'merge-pr';

export interface Verb {
  label: string;
  type: VerbType;
  /** Todo → Start also writes an echo-guard status change to this value. */
  setStatus?: string;
  /** The primary (filled) verb vs. a secondary action (e.g. Merge). */
  primary?: boolean;
}

/**
 * The contextual verb button(s) for an issue, keyed off the Linear state label
 * (so In Review is distinguished from In Progress even though both are the
 * `in_progress` bucket-status). Done / Canceled → no verbs.
 */
export function verbsForTask(t: SnoutTask): Verb[] {
  if (t.status === 'done' || t.status === 'cancelled') return [];
  const state = (t.linearState?.name || '').toLowerCase();

  if (state.includes('review')) {
    const verbs: Verb[] = [{ label: 'Review', type: 'review', primary: true }];
    const mergeable = (t.linearPRs || []).some((pr) => pr.reviewState === 'approved' && !pr.isWip);
    if (mergeable) verbs.push({ label: 'Merge', type: 'merge-pr' });
    return verbs;
  }
  if (state.includes('progress') || t.status === 'in_progress') {
    return [{ label: 'Continue', type: 'build-on-issue', primary: true }];
  }
  if (state.includes('backlog')) {
    return [{ label: 'Research', type: 'research', primary: true }];
  }
  // Todo / any remaining open, unstarted issue.
  if (state.includes('todo') || t.status === 'open') {
    return [{ label: 'Start', type: 'build-on-issue', setStatus: 'in_progress', primary: true }];
  }
  return [];
}

// ── Status chip (label + colour tone) ─────────────────────────────────────────

export type ChipTone = 'progress' | 'review' | 'todo' | 'done' | 'cancel';

export interface StatusChip {
  label: string;
  tone: ChipTone;
}

/** Map a task to its coloured status chip. Colour comes from the Linear state
 *  label so **In Progress (green) ≠ In Review (blue)** even though both map to
 *  the `in_progress` bucket-status. */
export function statusChip(t: SnoutTask): StatusChip {
  const label = t.linearState?.name || defaultStatusLabel(t.status);
  const n = label.toLowerCase();
  let tone: ChipTone = 'todo';
  if (n.includes('review')) tone = 'review'; // blue
  else if (n.includes('progress')) tone = 'progress'; // green
  else if (n.includes('done') || n.includes('complete')) tone = 'done';
  else if (n.includes('cancel')) tone = 'cancel';
  else tone = 'todo'; // Todo / Backlog → gray
  return { label, tone };
}

function defaultStatusLabel(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'review':
      return 'In Review';
    case 'done':
      return 'Done';
    case 'cancelled':
      return 'Canceled';
    case 'blocked':
      return 'Blocked';
    default:
      return 'Todo';
  }
}

// ── PR chips ──────────────────────────────────────────────────────────────────

export interface PrChip {
  number: number;
  author: string;
  isWip: boolean;
  needsReviewer: boolean;
  mergeable: boolean;
  url: string;
  label: string;
}

/** Derive the inline PR chip view-models from a task's linked PRs. */
export function prChips(t: SnoutTask): PrChip[] {
  return (t.linearPRs || []).map((pr) => ({
    number: pr.number,
    author: pr.author,
    isWip: pr.isWip,
    needsReviewer: pr.needsReviewer,
    mergeable: pr.reviewState === 'approved' && !pr.isWip,
    url: pr.url,
    label: `${pr.isWip ? 'WIP PR' : 'PR'} #${pr.number} · ${pr.author}`,
  }));
}

/** Toggle the `done` flag of the objective at `index`, returning a NEW array
 *  (immutably) for the host to write. */
export function toggleObjective(objectives: SnoutObjective[], index: number): SnoutObjective[] {
  return objectives.map((o, i) => (i === index ? { ...o, done: !o.done } : o));
}

/** Short local timestamp label for a note log entry. */
export function formatTs(ts: number): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString([], { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Index the recent/active bridgeCommands by the task id they act on. */
export function commandsByTask(commands: SnoutCommand[]): Map<string, SnoutCommand> {
  const map = new Map<string, SnoutCommand>();
  for (const c of commands) {
    const tid = c.taskId;
    if (!tid) continue;
    const existing = map.get(tid);
    // Prefer a live (pending/running) command over a terminal one.
    if (!existing || rank(c.status) > rank(existing.status)) map.set(tid, c);
  }
  return map;
}

function rank(status: string): number {
  if (status === 'running') return 3;
  if (status === 'pending') return 2;
  return 1;
}
