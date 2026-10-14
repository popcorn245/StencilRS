import { Component, Prop, State, Event, EventEmitter, Watch, h, Host } from '@stencil/core';
import {
  SNOUT_LOGO_SVG,
  verbsForTask,
  statusChip,
  prChips,
  commandsByTask,
  filterByTab,
  type SnoutTask,
  type SnoutProject,
  type SnoutCommand,
  type SnoutCounts,
  type SnoutTab,
  type Verb,
} from './snout-work.helpers';
import {
  filterTasks,
  tabCounts,
  needsReviewerCount,
  filterOptions,
  issueGroups,
  STATUS_CHOICES,
  EMPTY_FILTERS,
  type SnoutFilters,
  type IssueGroup,
  type GroupMode,
} from './snout-search';

/**
 * pop-snout-work — the **Snout Tasks** team command center (organism), rebuilt
 * to mirror the hub INVENTORY panel: the shared design-system primitives
 * (`pop-tab-bar`, `pop-list-filter-sort`, `pop-async-view`, `pop-sync-status`)
 * over a fat pure-logic split (`snout-work.helpers` + `snout-search`), NOT a
 * bespoke reinterpretation. Every surface — the compact tab bar with live
 * per-tab count bubbles, the working search box + funnel filters, the
 * Project-grouped collapsible sections of dense issue rows, the interactive
 * status chip, the empty/loading/error states — match the other hub tiles. The
 * ONLY deviation is the accent: the panel root scopes `--accent` to
 * `--color-snout-orange`, so the primary/verb buttons + active-tab underline +
 * focus rings read Snout-orange while everything else inherits the standard look.
 *
 * PRESENTATION-ONLY over the Bucket Bridge's synced Linear work: the host
 * (`hub-snout`) owns all IO (fetch `/api/hub/snout`, SWR cache, every write) and
 * this component renders what it is handed + emits `pop*` events. Search + the
 * funnel filters are LOCAL client-side state over the loaded snapshot (like
 * inventory's query) so they function with no round-trip; `tab` is a mutable
 * prop (host persists it, but it also switches standalone in Storybook).
 *
 * Object/array props accept a value (property binding) OR a JSON string
 * (attribute — how Storybook / plain HTML pass them), parsed defensively.
 *
 * Events (all composed + bubbling):
 *   popTabChange {tab}                       — Action / Me / Team tab
 *   popAutoAccept {value}                    — global Auto-accept toggle
 *   popRefresh / popClose                    — header refresh / close
 *   popOpenIssue {url} / popOpenProject {url}— open in Linear
 *   popVerb {taskId,issueId,type,setStatus?} — a contextual verb button tapped
 *   popStatusChange {taskId,status}          — status change
 *   popMergePr {taskId,prNumber,url}         — inline PR Merge
 *   popPostUpdate {projectId}                — per-project Post Update
 *
 * The expanded row detail is READ-ONLY (the Linear summary) — the breadcrumb
 * editor (objectives/notes/tdd/summary + comment write-back) was dropped.
 */
@Component({
  tag: 'pop-snout-work',
  encapsulation: { type: 'scoped' },
  styleUrl: 'snout-work.css',
})
export class PopSnoutWork {
  /** Whole-team synced tasks (object array OR JSON string). */
  @Prop() tasks: SnoutTask[] | string = [];
  /** Projects for group headers + Open ↗ links (object array OR JSON string). */
  @Prop() projects: SnoutProject[] | string = [];
  /** Recent/active bridgeCommands, for live milestones (object array OR JSON). */
  @Prop() commands: SnoutCommand[] | string = [];
  /** Server-computed tab counts (object OR JSON string). Used as a fallback; the
   *  live bubbles recompute per-tab MATCH counts from the loaded tasks. */
  @Prop() counts: SnoutCounts | string = { action: 0, me: 0, team: 0 };
  /** Active tab. Mutable so it also switches standalone (Storybook); the host
   *  still binds + persists it and listens to popTabChange. */
  @Prop({ mutable: true }) tab: SnoutTab = 'action';
  /** The Linear team name (third tab label — "Sonic" for the Snout/ENG team). */
  @Prop() teamName = 'Sonic';
  /** Global Auto-accept toggle state. */
  @Prop() autoAccept = false;
  /** First-load (no data) → a subtle loader instead of empty. */
  @Prop() loading = false;
  /** An error line shown in place of the tree (with a Retry → popRefresh). */
  @Prop() error = '';
  /** Render the panel's own header (logo + title + sync + Auto-accept). Hosts
   *  with their own chrome (the hub's PanelShell) set this false — only the
   *  tabs + search + list show. */
  @Prop() showHeader = true;
  /** Last successful sync time (epoch ms) for the header's pop-sync-status. */
  @Prop() syncedAt?: number;

  /** Collapsed group keys (client-only, local UI state). */
  @State() collapsed: Record<string, boolean> = {};
  /** Expanded (breadcrumb editor) issue row ids. */
  @State() expanded: Record<string, boolean> = {};
  /** Expanded console/command-output ids (collapsed to a status line by default). */
  @State() cmdExpanded: Record<string, boolean> = {};
  /** Task id whose status-change popover is open, or null. */
  @State() statusMenuFor: string | null = null;
  /** Panel-wide search text (filters the active tab live). */
  @State() query = '';
  /** The funnel filters (Project / Milestone / Assignee / Status / Has-PR). */
  @State() filters: SnoutFilters = { ...EMPTY_FILTERS };

  /** Local state for interactive reply inputs keyed by command id. */
  @State() inboxInputs: Record<string, string> = {};

  @Event({ composed: true, bubbles: true }) popTabChange!: EventEmitter<{ tab: SnoutTab }>;
  @Event({ composed: true, bubbles: true }) popAutoAccept!: EventEmitter<{ value: boolean }>;
  @Event({ composed: true, bubbles: true }) popRefresh!: EventEmitter<void>;
  @Event({ composed: true, bubbles: true }) popClose!: EventEmitter<void>;
  @Event({ composed: true, bubbles: true }) popOpenIssue!: EventEmitter<{ url: string }>;
  @Event({ composed: true, bubbles: true }) popOpenProject!: EventEmitter<{ url: string }>;
  @Event({ composed: true, bubbles: true }) popVerb!: EventEmitter<{ taskId: string; issueId?: string; type: string; setStatus?: string }>;
  @Event({ composed: true, bubbles: true }) popStatusChange!: EventEmitter<{ taskId: string; status: string }>;
  @Event({ composed: true, bubbles: true }) popMergePr!: EventEmitter<{ taskId: string; prNumber: number; url: string }>;
  @Event({ composed: true, bubbles: true }) popPostUpdate!: EventEmitter<{ projectId: string }>;
  @Event({ composed: true, bubbles: true }) popCommandAnswerPrompt!: EventEmitter<{ commandId: string; promptId: string; decision: 'allow' | 'deny'; updatedInput?: Record<string, unknown>; message?: string }>;
  @Event({ composed: true, bubbles: true }) popCommandSendInbox!: EventEmitter<{ commandId: string; text: string }>;
  @Event({ composed: true, bubbles: true }) popCommandStop!: EventEmitter<{ commandId: string }>;

  @Watch('tasks')
  onTasksChange() {
    // A fresh list landed — drop any stale open menu so it never lingers.
    this.statusMenuFor = null;
  }

  private parse<T>(v: T | string, fallback: T): T {
    if (typeof v === 'string') {
      if (v === '') return fallback;
      try {
        return (JSON.parse(v) as T) ?? fallback;
      } catch {
        return fallback;
      }
    }
    return v ?? fallback;
  }

  private setTab(tab: SnoutTab) {
    this.tab = tab;
    this.statusMenuFor = null;
    this.popTabChange.emit({ tab });
  }

  private toggleGroup(key: string) {
    this.collapsed = { ...this.collapsed, [key]: !this.collapsed[key] };
  }

  private toggleRow(id: string) {
    this.expanded = { ...this.expanded, [id]: !this.expanded[id] };
  }

  private toggleCmd(id: string) {
    this.cmdExpanded = { ...this.cmdExpanded, [id]: !this.cmdExpanded[id] };
  }

  // ── Header ───────────────────────────────────────────────────────────────

  private renderAutoAccept() {
    return (
      <label class="sw-autoaccept" title="Applies edits unattended for build commands">
        <span class="sw-autoaccept-label">Auto-accept</span>
        <pop-switch
          label="Auto-accept"
          checked={this.autoAccept}
          onPopChange={(e: CustomEvent<boolean>) => this.popAutoAccept.emit({ value: e.detail })}
        />
      </label>
    );
  }

  private renderHeader() {
    return (
      <div class="sw-header">
        <span class="sw-brand">
          <span class="sw-logo" innerHTML={SNOUT_LOGO_SVG}></span>
          <span class="sw-title">Snout Tasks</span>
        </span>
        {this.renderAutoAccept()}
        <pop-sync-status
          class="sw-sync"
          bare
          syncedAt={this.syncedAt ?? undefined}
          loading={this.loading}
          onPopRefresh={() => this.popRefresh.emit()}
        />
      </div>
    );
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────

  private renderTabBar(all: SnoutTask[]) {
    const c = tabCounts(all, this.query, this.filters);
    const tabs = JSON.stringify([
      { label: 'Action', value: 'action', count: c.action, icon: 'flash-outline' },
      { label: 'Me', value: 'me', count: c.me, icon: 'person-outline' },
      { label: this.teamName, value: 'team', count: c.team, icon: 'people-outline' },
    ]);
    return (
      <pop-tab-bar
        class="sw-tabbar"
        compact
        tabs={tabs}
        activeTab={this.tab}
        onPopTabChange={(e: CustomEvent<{ value: string }>) => {
          // pop-tab-bar's popTabChange bubbles + shares our event name; stop it so
          // the host only ever sees OUR re-emitted {tab} shape (not {value}).
          e.stopPropagation();
          this.setTab(e.detail.value as SnoutTab);
        }}
      />
    );
  }

  // ── Search + funnel filters ───────────────────────────────────────────────

  private renderSearchBar(all: SnoutTask[], projects: SnoutProject[]) {
    const opts = filterOptions(all, projects);
    const filters = [
      ...(opts.projects.length > 1
        ? [{ key: 'project', label: 'Project', kind: 'select', options: [{ value: '', label: 'All projects' }, ...opts.projects], value: this.filters.project }]
        : []),
      ...(opts.milestones.length
        ? [{ key: 'milestone', label: 'Milestone', kind: 'select', options: [{ value: '', label: 'All milestones' }, ...opts.milestones], value: this.filters.milestone }]
        : []),
      ...(opts.assignees.length > 1
        ? [{ key: 'assignee', label: 'Assignee', kind: 'select', options: [{ value: '', label: 'Anyone' }, ...opts.assignees], value: this.filters.assignee }]
        : []),
      ...(opts.statuses.length
        ? [{ key: 'status', label: 'Status', kind: 'select', options: [{ value: '', label: 'Any status' }, ...opts.statuses], value: this.filters.status }]
        : []),
      { key: 'hasPr', label: 'PR', kind: 'tabs', options: [{ value: '', label: 'All' }, { value: 'yes', label: 'Has PR' }], value: this.filters.hasPr },
    ];
    const reviewN = needsReviewerCount(all);
    return (
      <pop-list-filter-sort
        class="sw-toolbar"
        value={this.query}
        placeholder="Search issues, ENG-…, assignee…"
        filters={JSON.stringify(filters)}
        views="[]"
        show-clear
        onSearchChange={(e: CustomEvent<string>) => (this.query = e.detail)}
        onFilterChange={(e: CustomEvent<{ key: string; value: string }>) => {
          const { key, value } = e.detail;
          this.filters = { ...this.filters, [key]: value } as SnoutFilters;
        }}
        onClearFilters={() => (this.filters = { ...EMPTY_FILTERS })}
      >
        {reviewN > 0 && (
          <button
            slot="actions"
            type="button"
            class={{ 'sw-chip': true, 'sw-reviewchip': true, 'sw-chip--on': this.filters.needsReviewer }}
            aria-pressed={String(this.filters.needsReviewer)}
            title={`${reviewN} PR${reviewN === 1 ? '' : 's'} need a reviewer`}
            onClick={() => (this.filters = { ...this.filters, needsReviewer: !this.filters.needsReviewer })}
          >
            <pop-icon name="warning-outline" /> {reviewN}
          </button>
        )}
      </pop-list-filter-sort>
    );
  }

  // ── Grouped list (pinned buckets + per-project sections) ──────────────────

  private renderGroups(groups: IssueGroup[], cmds: Map<string, SnoutCommand>) {
    return (
      <div class="sw-groups">
        {groups.map((g) => this.renderGroup(g, cmds, 0))}
      </div>
    );
  }

  /** A person-group leading mark: the Snout logo for Me, else an initial. */
  private renderGroupMark(g: IssueGroup) {
    const isMe = g.kind === 'me';
    return (
      <span class={{ 'sw-avatar': true, 'sw-group-avatar': true, 'sw-avatar--me': isMe }} innerHTML={isMe ? SNOUT_LOGO_SVG : undefined} aria-hidden="true">
        {isMe ? undefined : g.name.replace(/^[^\p{L}\p{N}]+/u, '').slice(0, 1).toUpperCase()}
      </span>
    );
  }

  private renderGroup(g: IssueGroup, cmds: Map<string, SnoutCommand>, depth: number) {
    const open = !this.collapsed[g.key];
    const isPerson = g.kind === 'me' || g.kind === 'person';
    const kindLabel = g.kind === 'project' ? 'PROJECT' : g.kind === 'bots' ? 'BOTS' : g.kind === 'needs-owner' ? 'NEEDS OWNER' : '';
    return (
      <div class={{ 'sw-group': true, 'sw-group--open': open, 'sw-group--sub': depth > 0, [`sw-group--${g.kind}`]: true }} key={g.key}>
        <div class="sw-group-head">
          <button type="button" class="sw-group-toggle" aria-expanded={String(open)} onClick={() => this.toggleGroup(g.key)}>
            <pop-icon class="sw-group-chev" name="chevron-forward" />
            {isPerson ? this.renderGroupMark(g) : kindLabel && <span class="sw-group-kind">{kindLabel}</span>}
            <span class="sw-group-name">{g.name}</span>
            <span class="sw-group-count">{g.active} active</span>
          </button>
          {g.kind === 'project' && (
            <span class="sw-group-actions">
              {g.linearUrl && (
                <button type="button" class="pop-iconbtn sw-iconbtn" aria-label={`Open ${g.name} in Linear`} title="Open in Linear" onClick={() => this.popOpenProject.emit({ url: g.linearUrl! })}>
                  <pop-icon name="open-outline" />
                </button>
              )}
              <button type="button" class="pop-iconbtn sw-iconbtn" aria-label={`Post an update to ${g.name}`} title="Post update" onClick={() => this.popPostUpdate.emit({ projectId: g.id })}>
                <pop-icon name="megaphone-outline" />
              </button>
            </span>
          )}
        </div>
        {open && (
          <div class="sw-group-body">
            {g.subgroups
              ? g.subgroups.map((sg) => this.renderGroup(sg, cmds, depth + 1))
              : g.tasks.map((t) => this.renderRow(t, cmds.get(t.id)))}
          </div>
        )}
      </div>
    );
  }

  // ── Loading skeleton (issue-row silhouette, no spinner) ────────────────────

  private renderSkeletonRow() {
    return (
      <div class="sw-row sw-skel-row" aria-hidden="true">
        <div class="sw-row-main">
          <span class="sw-row-gutter">
            <pop-skeleton circle h="0.55rem" />
          </span>
          <div class="sw-row-body">
            <div class="sw-row-top">
              <pop-skeleton w="3.5rem" h="0.8rem" />
              <pop-skeleton class="sw-skel-status" w="4.5rem" h="1.35rem" radius="999px" />
            </div>
            <pop-skeleton w="80%" h="0.95rem" />
            <div class="sw-row-meta">
              <pop-skeleton w="4.5rem" h="1.05rem" radius="999px" />
              <pop-skeleton w="3rem" h="1.05rem" radius="999px" />
            </div>
            <div class="sw-row-verbs">
              <pop-skeleton class="sw-skel-verb" w="3.5rem" h="2.3rem" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderSkeletonGroup(rows: number) {
    return (
      <div class="sw-group sw-group--open">
        <div class="sw-group-head sw-skel-head">
          <pop-skeleton w="1rem" h="1rem" circle />
          <pop-skeleton w="7rem" h="0.85rem" />
        </div>
        <div class="sw-group-body">
          {Array.from({ length: rows }).map(() => this.renderSkeletonRow())}
        </div>
      </div>
    );
  }

  // ── Issue row ──────────────────────────────────────────────────────────────

  /** The ionicon for a contextual verb (icon-over-label vertical button). */
  private verbIcon(v: Verb): string {
    switch (v.type) {
      case 'merge-pr':
        return 'git-merge-outline';
      case 'research':
        return 'search-outline';
      case 'investigate':
        return 'bug-outline';
      case 'review':
        return 'eye-outline';
      default:
        // build-on-issue: Start (writes a status) vs Continue.
        return v.setStatus ? 'play-outline' : 'play-forward-outline';
    }
  }

  /** A compact VERTICAL verb button: icon on top, small label under it. */
  private renderVerb(t: SnoutTask, v: Verb) {
    return (
      <button
        type="button"
        class={{ 'sw-verb': true, 'sw-verb--primary': !!v.primary }}
        aria-label={v.label}
        onClick={() =>
          v.type === 'merge-pr'
            ? this.mergeFor(t)
            : this.popVerb.emit({ taskId: t.id, issueId: t.linearIdentifier, type: v.type, setStatus: v.setStatus })
        }
      >
        <pop-icon class="sw-verb-ic" name={this.verbIcon(v)} />
        <span class="sw-verb-label">{v.label}</span>
      </button>
    );
  }

  private mergeFor(t: SnoutTask) {
    const pr = (t.linearPRs || []).find((p) => p.reviewState === 'approved' && !p.isWip);
    if (pr) this.popMergePr.emit({ taskId: t.id, prNumber: pr.number, url: pr.url });
  }

  /** The interactive status chip → a small popover-select that fires the
   *  echo-guard status-change the host already handles. Replaces the ⋮ menu. */
  private renderStatusChip(t: SnoutTask, chip: { label: string; tone: string }) {
    const open = this.statusMenuFor === t.id;
    return (
      <div class="sw-status-wrap">
        <button
          type="button"
          class={{ 'sw-statuschip': true, [`sw-status--${chip.tone}`]: true, 'sw-statuschip--open': open }}
          aria-haspopup="listbox"
          aria-expanded={String(open)}
          aria-label={`Status: ${chip.label} — change`}
          onClick={() => (this.statusMenuFor = open ? null : t.id)}
        >
          <span class="sw-statuschip-label">{chip.label}</span>
          <pop-icon class="sw-statuschip-caret" name="chevron-down" />
        </button>
        {open && (
          <div class="sw-statusmenu" role="listbox" aria-label="Set status">
            {STATUS_CHOICES.map((s) => (
              <button
                type="button"
                role="option"
                aria-selected={String(t.status === s.value)}
                class={{ 'sw-statusmenu-item': true, 'sw-statusmenu-on': t.status === s.value }}
                onClick={() => {
                  this.statusMenuFor = null;
                  this.popStatusChange.emit({ taskId: t.id, status: s.value });
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /**
   * A dense, aligned issue card (inventory row density; comfortable at 375–390px).
   * A fixed left gutter holds the status dot; everything else lives in the body
   * column sharing ONE left edge:
   *   line 1 — ENG-key (links to Linear ↗) … status chip (pinned right)
   *   line 2 — the full-width title (taps to expand the read-only summary)
   *   line 3 — meta chips (milestone / assignee / PR chips)
   *   line 4 — the contextual verb button(s) (icon-over-label, pinned right)
   *   + collapsible console + read-only summary detail (aligned to the body edge)
   */
  private renderRow(t: SnoutTask, cmd: SnoutCommand | undefined) {
    const chip = statusChip(t);
    const verbs = verbsForTask(t);
    const prs = prChips(t);
    const open = !!this.expanded[t.id];
    const assignee = t.linearAssignee;
    const isMe = assignee ? assignee.isMe === true || assignee.name === 'Bobby Johnson' : false;
    const hasMeta = !!t.linearMilestone || !!assignee || prs.length > 0;
    return (
      <div class={{ 'sw-row': true, 'sw-row--open': open }} key={t.id}>
        <div class="sw-row-main">
          <span class="sw-row-gutter">
            <span class={{ 'sw-dot': true, [`sw-dot--${chip.tone}`]: true }} title={chip.label} aria-hidden="true"></span>
          </span>
          <div class="sw-row-body">
            <div class="sw-row-top">
              {t.linearIdentifier &&
                (t.linearUrl ? (
                  <a
                    class="sw-key"
                    href={t.linearUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${t.linearIdentifier} in Linear`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span class="sw-key-id">{t.linearIdentifier}</span>
                    <pop-icon class="sw-key-ic" name="open-outline" />
                  </a>
                ) : (
                  <span class="sw-key sw-key--plain">{t.linearIdentifier}</span>
                ))}
              {this.renderStatusChip(t, chip)}
            </div>

            <button
              type="button"
              class="sw-row-title"
              aria-expanded={String(open)}
              aria-label={open ? `Collapse ${t.linearIdentifier || t.title}` : `Expand ${t.linearIdentifier || t.title}`}
              onClick={() => this.toggleRow(t.id)}
            >
              {t.title}
            </button>

            {hasMeta && (
              <div class="sw-row-meta">
                {t.linearMilestone && <span class="sw-meta-chip">◇ {t.linearMilestone.name}</span>}
                {assignee && (
                  <span class="sw-meta-chip sw-assignee">
                    <span class={{ 'sw-avatar': true, 'sw-avatar--me': isMe }} innerHTML={isMe ? SNOUT_LOGO_SVG : undefined}>
                      {isMe ? undefined : assignee.name.slice(0, 1).toUpperCase()}
                    </span>
                    {isMe ? 'Me' : assignee.name}
                  </span>
                )}
                {prs.map((pr) => (
                  <span class="sw-prgrp">
                    <button type="button" class={{ 'sw-pr': true, 'sw-pr--wip': pr.isWip, 'sw-pr--ok': pr.mergeable }} title={pr.label} onClick={() => this.popOpenIssue.emit({ url: pr.url })}>
                      {pr.mergeable && '✓ '}
                      {pr.label}
                    </button>
                    {pr.needsReviewer && <span class="sw-pr sw-pr--warn">⚠ needs reviewer</span>}
                    {pr.mergeable && (
                      <button type="button" class="sw-pr sw-pr--merge" onClick={() => this.popMergePr.emit({ taskId: t.id, prNumber: pr.number, url: pr.url })}>
                        Merge
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {verbs.length > 0 && <div class="sw-row-verbs">{verbs.map((v) => this.renderVerb(t, v))}</div>}

            {cmd && this.renderCmd(t, cmd)}
            {open && this.renderRowDetail(t)}
          </div>
        </div>
      </div>
    );
  }

  /** The command/console block — COLLAPSED to a compact status line by default
   *  (a colour-coded status icon + status text); tapping expands the full
   *  milestone/output console. Also renders interactive permission cards,
   *  reply boxes, and stop buttons when interactive. */
  private renderCmd(t: SnoutTask, cmd: SnoutCommand) {
    const st = cmd.status;
    const isAwaitingPerm = st === 'awaiting_permission' || cmd.waitingOn === 'permission';
    const isAwaitingInput = st === 'awaiting_input' || cmd.waitingOn === 'input';
    const isCancelled = st === 'cancelled';
    const tone = st === 'done' ? 'done' : st === 'error' ? 'error' : isAwaitingPerm ? 'permission' : isAwaitingInput ? 'input' : isCancelled ? 'cancelled' : st === 'running' ? 'running' : st === 'pending' ? 'pending' : 'idle';
    const icon = st === 'done' ? 'checkmark-circle' : st === 'error' ? 'alert-circle' : isAwaitingPerm ? 'shield-outline' : isAwaitingInput ? 'chatbox-ellipses-outline' : isCancelled ? 'ban-outline' : st === 'running' ? 'sync-outline' : st === 'pending' ? 'time-outline' : 'ellipse-outline';
    const label = st === 'done' ? 'Build done' : st === 'error' ? 'Build failed' : isAwaitingPerm ? 'Awaiting permission…' : isAwaitingInput ? 'Awaiting input…' : isCancelled ? 'Cancelled' : st === 'running' ? 'Running…' : st === 'pending' ? 'Queued…' : 'Idle';
    const miles = cmd.milestones || [];
    const pendingPrompts = (cmd.prompts || []).filter((p) => p.status === 'pending');
    const isActiveSession = (st === 'running' || isAwaitingPerm || isAwaitingInput) && !cmd.stopRequested;
    const hasDetail = miles.length > 0 || !!cmd.result?.summary || !!cmd.error || pendingPrompts.length > 0 || isAwaitingInput;
    const open = !!this.cmdExpanded[t.id] || isAwaitingPerm || isAwaitingInput;

    return (
      <div class={{ 'sw-cmd': true, 'sw-cmd--open': open, [`sw-cmd--${tone}`]: true }}>
        <div class="sw-cmd-header-bar">
          <button
            type="button"
            class="sw-cmd-line"
            aria-expanded={String(open)}
            disabled={!hasDetail}
            onClick={() => hasDetail && this.toggleCmd(t.id)}
          >
            <pop-icon class={{ 'sw-cmd-ic': true, 'sw-cmd-ic--spin': st === 'running' }} name={icon} />
            <span class="sw-cmd-label">{label}</span>
            {hasDetail && <pop-icon class="sw-cmd-chev" name="chevron-forward" />}
          </button>
          {isActiveSession && cmd.interactive && (
            <button
              type="button"
              class="sw-btn sw-btn--stop"
              title="Stop interactive build session"
              onClick={() => this.popCommandStop.emit({ commandId: cmd.id })}
            >
              Stop
            </button>
          )}
        </div>
        {open && (
          <div class="sw-cmd-body">
            {pendingPrompts.map((p) => (
              <div class="sw-cmd-prompt" key={p.id}>
                <div class="sw-cmd-prompt-title">
                  <pop-icon class="sw-cmd-prompt-ic" name="shield-outline" />
                  Permission request: {p.toolName}
                </div>
                <pre class="sw-cmd-prompt-input">{JSON.stringify(p.input, null, 2)}</pre>
                <div class="sw-cmd-prompt-actions">
                  <button
                    type="button"
                    class="sw-btn sw-btn--allow"
                    onClick={() => this.popCommandAnswerPrompt.emit({ commandId: cmd.id, promptId: p.id, decision: 'allow' })}
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    class="sw-btn sw-btn--deny"
                    onClick={() => this.popCommandAnswerPrompt.emit({ commandId: cmd.id, promptId: p.id, decision: 'deny' })}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
            {isAwaitingInput && (
              <div class="sw-cmd-inbox">
                <input
                  type="text"
                  class="sw-cmd-inbox-input"
                  placeholder="Send a follow-up turn…"
                  value={this.inboxInputs[cmd.id] || ''}
                  onInput={(e: Event) => {
                    const val = (e.target as HTMLInputElement).value;
                    this.inboxInputs = { ...this.inboxInputs, [cmd.id]: val };
                  }}
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter' && this.inboxInputs[cmd.id]?.trim()) {
                      this.popCommandSendInbox.emit({ commandId: cmd.id, text: this.inboxInputs[cmd.id].trim() });
                      this.inboxInputs = { ...this.inboxInputs, [cmd.id]: '' };
                    }
                  }}
                />
                <button
                  type="button"
                  class="sw-btn sw-btn--send"
                  onClick={() => {
                    const txt = (this.inboxInputs[cmd.id] || '').trim();
                    if (txt) {
                      this.popCommandSendInbox.emit({ commandId: cmd.id, text: txt });
                      this.inboxInputs = { ...this.inboxInputs, [cmd.id]: '' };
                    }
                  }}
                >
                  Send
                </button>
              </div>
            )}
            {miles.length > 0 && (
              <ul class="sw-cmd-miles">
                {miles.map((m) => (
                  <li>{m}</li>
                ))}
              </ul>
            )}
            {cmd.error && <div class="sw-cmd-out sw-cmd-out--err">{cmd.error}</div>}
            {cmd.result?.summary && <div class="sw-cmd-out">{cmd.result.summary}</div>}
          </div>
        )}
      </div>
    );
  }

  // ── Expanded row detail: READ-ONLY Linear summary ─────────────────────────

  /** The expanded detail is now read-only: the Linear issue summary/description
   *  (bridge-owned `summary`). No authoring UI — working detail lives in Linear
   *  + the Forgejo PR; the PR chips + console carry the rest. */
  private renderRowDetail(t: SnoutTask) {
    const summary = (t.summary ?? '').trim();
    return (
      <div class="sw-detail">
        <div class="sw-summary-label">Summary</div>
        {summary ? (
          <p class="sw-summary">{summary}</p>
        ) : (
          <p class="sw-summary sw-summary--empty">No summary synced from Linear yet.</p>
        )}
      </div>
    );
  }

  render() {
    const tasks = this.parse<SnoutTask[]>(this.tasks, []);
    const projects = this.parse<SnoutProject[]>(this.projects, []);
    const commands = this.parse<SnoutCommand[]>(this.commands, []);
    const cmdMap = commandsByTask(commands);

    const active = filterByTab(filterTasks(tasks, this.query, this.filters), this.tab);
    // Team ("Sonic") groups person → project; Action / Me stay project-first.
    const mode: GroupMode = this.tab === 'team' ? 'person' : 'project';
    const groups = issueGroups(active, projects, mode);

    const view: 'loading' | 'empty' | 'error' | 'content' =
      this.error && tasks.length === 0
        ? 'error'
        : this.loading && tasks.length === 0
          ? 'loading'
          : groups.length === 0
            ? 'empty'
            : 'content';

    const emptyMsg = this.query.trim()
      ? 'Nothing matches your search.'
      : this.tab === 'action'
        ? 'Nothing needs your action.'
        : 'No synced Snout work yet.';

    return (
      <Host>
        <section class="sw" aria-label="Snout Tasks">
          {this.showHeader && this.renderHeader()}
          {this.renderTabBar(tasks)}
          {this.renderSearchBar(tasks, projects)}

          <pop-async-view
            class="sw-view"
            state={view}
            errorLabel={this.error || "Couldn't load Snout work right now."}
            retryLabel="Retry"
            onPopRetry={() => this.popRefresh.emit()}
          >
            {view === 'content' && this.renderGroups(groups, cmdMap)}
            <div slot="loading" class="sw-skeleton" role="status" aria-busy="true" aria-label="Loading Snout work">
              {this.renderSkeletonGroup(2)}
              {this.renderSkeletonGroup(3)}
            </div>
            <div slot="empty" class="sw-empty">
              <span class="sw-logo sw-logo--empty" innerHTML={SNOUT_LOGO_SVG}></span>
              <span>{emptyMsg}</span>
            </div>
          </pop-async-view>
        </section>
      </Host>
    );
  }
}
