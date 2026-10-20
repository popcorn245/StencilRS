import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h, Host } from "@stencil/core/testing";
import { SNOUT_LOGO_SVG, verbsForTask, statusChip, prChips, commandsByTask, filterByTab, } from './snout-work.helpers';
import { filterTasks, tabCounts, needsReviewerCount, filterOptions, issueGroups, STATUS_CHOICES, EMPTY_FILTERS, } from './snout-search';
export const PopSnoutWork = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popTabChange = __stencil_createEvent(this, "popTabChange", 7);
        this.popAutoAccept = __stencil_createEvent(this, "popAutoAccept", 7);
        this.popRefresh = __stencil_createEvent(this, "popRefresh", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
        this.popOpenIssue = __stencil_createEvent(this, "popOpenIssue", 7);
        this.popOpenProject = __stencil_createEvent(this, "popOpenProject", 7);
        this.popVerb = __stencil_createEvent(this, "popVerb", 7);
        this.popStatusChange = __stencil_createEvent(this, "popStatusChange", 7);
        this.popMergePr = __stencil_createEvent(this, "popMergePr", 7);
        this.popPostUpdate = __stencil_createEvent(this, "popPostUpdate", 7);
        this.popCommandAnswerPrompt = __stencil_createEvent(this, "popCommandAnswerPrompt", 7);
        this.popCommandSendInbox = __stencil_createEvent(this, "popCommandSendInbox", 7);
        this.popCommandStop = __stencil_createEvent(this, "popCommandStop", 7);
    }
    /** Whole-team synced tasks (object array OR JSON string). */
    tasks = [];
    /** Projects for group headers + Open ↗ links (object array OR JSON string). */
    projects = [];
    /** Recent/active bridgeCommands, for live milestones (object array OR JSON). */
    commands = [];
    /** Server-computed tab counts (object OR JSON string). Used as a fallback; the
     *  live bubbles recompute per-tab MATCH counts from the loaded tasks. */
    counts = { action: 0, me: 0, team: 0 };
    /** Active tab. Mutable so it also switches standalone (Storybook); the host
     *  still binds + persists it and listens to popTabChange. */
    tab = 'action';
    /** The Linear team name (third tab label — "Sonic" for the Snout/ENG team). */
    teamName = 'Sonic';
    /** Global Auto-accept toggle state. */
    autoAccept = false;
    /** First-load (no data) → a subtle loader instead of empty. */
    loading = false;
    /** An error line shown in place of the tree (with a Retry → popRefresh). */
    error = '';
    /** Render the panel's own header (logo + title + sync + Auto-accept). Hosts
     *  with their own chrome (the hub's PanelShell) set this false — only the
     *  tabs + search + list show. */
    showHeader = true;
    /** Last successful sync time (epoch ms) for the header's pop-sync-status. */
    syncedAt;
    /** Collapsed group keys (client-only, local UI state). */
    collapsed = {};
    /** Expanded (breadcrumb editor) issue row ids. */
    expanded = {};
    /** Expanded console/command-output ids (collapsed to a status line by default). */
    cmdExpanded = {};
    /** Task id whose status-change popover is open, or null. */
    statusMenuFor = null;
    /** Panel-wide search text (filters the active tab live). */
    query = '';
    /** The funnel filters (Project / Milestone / Assignee / Status / Has-PR). */
    filters = { ...EMPTY_FILTERS };
    /** Local state for interactive reply inputs keyed by command id. */
    inboxInputs = {};
    popTabChange;
    popAutoAccept;
    popRefresh;
    popClose;
    popOpenIssue;
    popOpenProject;
    popVerb;
    popStatusChange;
    popMergePr;
    popPostUpdate;
    popCommandAnswerPrompt;
    popCommandSendInbox;
    popCommandStop;
    onTasksChange() {
        // A fresh list landed — drop any stale open menu so it never lingers.
        this.statusMenuFor = null;
    }
    parse(v, fallback) {
        if (typeof v === 'string') {
            if (v === '')
                return fallback;
            try {
                return JSON.parse(v) ?? fallback;
            }
            catch {
                return fallback;
            }
        }
        return v ?? fallback;
    }
    setTab(tab) {
        this.tab = tab;
        this.statusMenuFor = null;
        this.popTabChange.emit({ tab });
    }
    toggleGroup(key) {
        this.collapsed = { ...this.collapsed, [key]: !this.collapsed[key] };
    }
    toggleRow(id) {
        this.expanded = { ...this.expanded, [id]: !this.expanded[id] };
    }
    toggleCmd(id) {
        this.cmdExpanded = { ...this.cmdExpanded, [id]: !this.cmdExpanded[id] };
    }
    // ── Header ───────────────────────────────────────────────────────────────
    renderAutoAccept() {
        return (h("label", { class: "sw-autoaccept", title: "Applies edits unattended for build commands" },
            h("span", { class: "sw-autoaccept-label" }, "Auto-accept"),
            h("pop-switch", { label: "Auto-accept", checked: this.autoAccept, onPopChange: (e) => this.popAutoAccept.emit({ value: e.detail }) })));
    }
    renderHeader() {
        return (h("div", { class: "sw-header" },
            h("span", { class: "sw-brand" },
                h("span", { class: "sw-logo", innerHTML: SNOUT_LOGO_SVG }),
                h("span", { class: "sw-title" }, "Snout Tasks")),
            this.renderAutoAccept(),
            h("pop-sync-status", { class: "sw-sync", bare: true, syncedAt: this.syncedAt ?? undefined, loading: this.loading, onPopRefresh: () => this.popRefresh.emit() })));
    }
    // ── Tabs ─────────────────────────────────────────────────────────────────
    renderTabBar(all) {
        const c = tabCounts(all, this.query, this.filters);
        const tabs = JSON.stringify([
            { label: 'Action', value: 'action', count: c.action, icon: 'flash-outline' },
            { label: 'Me', value: 'me', count: c.me, icon: 'person-outline' },
            { label: this.teamName, value: 'team', count: c.team, icon: 'people-outline' },
        ]);
        return (h("pop-tab-bar", { class: "sw-tabbar", compact: true, tabs: tabs, activeTab: this.tab, onPopTabChange: (e) => {
                // pop-tab-bar's popTabChange bubbles + shares our event name; stop it so
                // the host only ever sees OUR re-emitted {tab} shape (not {value}).
                e.stopPropagation();
                this.setTab(e.detail.value);
            } }));
    }
    // ── Search + funnel filters ───────────────────────────────────────────────
    renderSearchBar(all, projects) {
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
        return (h("pop-list-filter-sort", { class: "sw-toolbar", value: this.query, placeholder: "Search issues, ENG-\u2026, assignee\u2026", filters: JSON.stringify(filters), views: "[]", "show-clear": true, onSearchChange: (e) => (this.query = e.detail), onFilterChange: (e) => {
                const { key, value } = e.detail;
                this.filters = { ...this.filters, [key]: value };
            }, onClearFilters: () => (this.filters = { ...EMPTY_FILTERS }) }, reviewN > 0 && (h("button", { slot: "actions", type: "button", class: { 'sw-chip': true, 'sw-reviewchip': true, 'sw-chip--on': this.filters.needsReviewer }, "aria-pressed": String(this.filters.needsReviewer), title: `${reviewN} PR${reviewN === 1 ? '' : 's'} need a reviewer`, onClick: () => (this.filters = { ...this.filters, needsReviewer: !this.filters.needsReviewer }) },
            h("pop-icon", { name: "warning-outline" }),
            " ",
            reviewN))));
    }
    // ── Grouped list (pinned buckets + per-project sections) ──────────────────
    renderGroups(groups, cmds) {
        return (h("div", { class: "sw-groups" }, groups.map((g) => this.renderGroup(g, cmds, 0))));
    }
    /** A person-group leading mark: the Snout logo for Me, else an initial. */
    renderGroupMark(g) {
        const isMe = g.kind === 'me';
        return (h("span", { class: { 'sw-avatar': true, 'sw-group-avatar': true, 'sw-avatar--me': isMe }, innerHTML: isMe ? SNOUT_LOGO_SVG : undefined, "aria-hidden": "true" }, isMe ? undefined : g.name.replace(/^[^\p{L}\p{N}]+/u, '').slice(0, 1).toUpperCase()));
    }
    renderGroup(g, cmds, depth) {
        const open = !this.collapsed[g.key];
        const isPerson = g.kind === 'me' || g.kind === 'person';
        const kindLabel = g.kind === 'project' ? 'PROJECT' : g.kind === 'bots' ? 'BOTS' : g.kind === 'needs-owner' ? 'NEEDS OWNER' : '';
        return (h("div", { class: { 'sw-group': true, 'sw-group--open': open, 'sw-group--sub': depth > 0, [`sw-group--${g.kind}`]: true }, key: g.key },
            h("div", { class: "sw-group-head" },
                h("button", { type: "button", class: "sw-group-toggle", "aria-expanded": String(open), onClick: () => this.toggleGroup(g.key) },
                    h("pop-icon", { class: "sw-group-chev", name: "chevron-forward" }),
                    isPerson ? this.renderGroupMark(g) : kindLabel && h("span", { class: "sw-group-kind" }, kindLabel),
                    h("span", { class: "sw-group-name" }, g.name),
                    h("span", { class: "sw-group-count" },
                        g.active,
                        " active")),
                g.kind === 'project' && (h("span", { class: "sw-group-actions" },
                    g.linearUrl && (h("button", { type: "button", class: "pop-iconbtn sw-iconbtn", "aria-label": `Open ${g.name} in Linear`, title: "Open in Linear", onClick: () => this.popOpenProject.emit({ url: g.linearUrl }) },
                        h("pop-icon", { name: "open-outline" }))),
                    h("button", { type: "button", class: "pop-iconbtn sw-iconbtn", "aria-label": `Post an update to ${g.name}`, title: "Post update", onClick: () => this.popPostUpdate.emit({ projectId: g.id }) },
                        h("pop-icon", { name: "megaphone-outline" }))))),
            open && (h("div", { class: "sw-group-body" }, g.subgroups
                ? g.subgroups.map((sg) => this.renderGroup(sg, cmds, depth + 1))
                : g.tasks.map((t) => this.renderRow(t, cmds.get(t.id)))))));
    }
    // ── Loading skeleton (issue-row silhouette, no spinner) ────────────────────
    renderSkeletonRow() {
        return (h("div", { class: "sw-row sw-skel-row", "aria-hidden": "true" },
            h("div", { class: "sw-row-main" },
                h("span", { class: "sw-row-gutter" },
                    h("pop-skeleton", { circle: true, h: "0.55rem" })),
                h("div", { class: "sw-row-body" },
                    h("div", { class: "sw-row-top" },
                        h("pop-skeleton", { w: "3.5rem", h: "0.8rem" }),
                        h("pop-skeleton", { class: "sw-skel-status", w: "4.5rem", h: "1.35rem", radius: "999px" })),
                    h("pop-skeleton", { w: "80%", h: "0.95rem" }),
                    h("div", { class: "sw-row-meta" },
                        h("pop-skeleton", { w: "4.5rem", h: "1.05rem", radius: "999px" }),
                        h("pop-skeleton", { w: "3rem", h: "1.05rem", radius: "999px" })),
                    h("div", { class: "sw-row-verbs" },
                        h("pop-skeleton", { class: "sw-skel-verb", w: "3.5rem", h: "2.3rem" }))))));
    }
    renderSkeletonGroup(rows) {
        return (h("div", { class: "sw-group sw-group--open" },
            h("div", { class: "sw-group-head sw-skel-head" },
                h("pop-skeleton", { w: "1rem", h: "1rem", circle: true }),
                h("pop-skeleton", { w: "7rem", h: "0.85rem" })),
            h("div", { class: "sw-group-body" }, Array.from({ length: rows }).map(() => this.renderSkeletonRow()))));
    }
    // ── Issue row ──────────────────────────────────────────────────────────────
    /** The ionicon for a contextual verb (icon-over-label vertical button). */
    verbIcon(v) {
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
    renderVerb(t, v) {
        return (h("button", { type: "button", class: { 'sw-verb': true, 'sw-verb--primary': !!v.primary }, "aria-label": v.label, onClick: () => v.type === 'merge-pr'
                ? this.mergeFor(t)
                : this.popVerb.emit({ taskId: t.id, issueId: t.linearIdentifier, type: v.type, setStatus: v.setStatus }) },
            h("pop-icon", { class: "sw-verb-ic", name: this.verbIcon(v) }),
            h("span", { class: "sw-verb-label" }, v.label)));
    }
    mergeFor(t) {
        const pr = (t.linearPRs || []).find((p) => p.reviewState === 'approved' && !p.isWip);
        if (pr)
            this.popMergePr.emit({ taskId: t.id, prNumber: pr.number, url: pr.url });
    }
    /** The interactive status chip → a small popover-select that fires the
     *  echo-guard status-change the host already handles. Replaces the ⋮ menu. */
    renderStatusChip(t, chip) {
        const open = this.statusMenuFor === t.id;
        return (h("div", { class: "sw-status-wrap" },
            h("button", { type: "button", class: { 'sw-statuschip': true, [`sw-status--${chip.tone}`]: true, 'sw-statuschip--open': open }, "aria-haspopup": "listbox", "aria-expanded": String(open), "aria-label": `Status: ${chip.label} — change`, onClick: () => (this.statusMenuFor = open ? null : t.id) },
                h("span", { class: "sw-statuschip-label" }, chip.label),
                h("pop-icon", { class: "sw-statuschip-caret", name: "chevron-down" })),
            open && (h("div", { class: "sw-statusmenu", role: "listbox", "aria-label": "Set status" }, STATUS_CHOICES.map((s) => (h("button", { type: "button", role: "option", "aria-selected": String(t.status === s.value), class: { 'sw-statusmenu-item': true, 'sw-statusmenu-on': t.status === s.value }, onClick: () => {
                    this.statusMenuFor = null;
                    this.popStatusChange.emit({ taskId: t.id, status: s.value });
                } }, s.label)))))));
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
    renderRow(t, cmd) {
        const chip = statusChip(t);
        const verbs = verbsForTask(t);
        const prs = prChips(t);
        const open = !!this.expanded[t.id];
        const assignee = t.linearAssignee;
        const isMe = assignee ? assignee.isMe === true || assignee.name === 'Bobby Johnson' : false;
        const hasMeta = !!t.linearMilestone || !!assignee || prs.length > 0;
        return (h("div", { class: { 'sw-row': true, 'sw-row--open': open }, key: t.id },
            h("div", { class: "sw-row-main" },
                h("span", { class: "sw-row-gutter" },
                    h("span", { class: { 'sw-dot': true, [`sw-dot--${chip.tone}`]: true }, title: chip.label, "aria-hidden": "true" })),
                h("div", { class: "sw-row-body" },
                    h("div", { class: "sw-row-top" },
                        t.linearIdentifier &&
                            (t.linearUrl ? (h("a", { class: "sw-key", href: t.linearUrl, target: "_blank", rel: "noopener noreferrer", "aria-label": `Open ${t.linearIdentifier} in Linear`, onClick: (e) => e.stopPropagation() },
                                h("span", { class: "sw-key-id" }, t.linearIdentifier),
                                h("pop-icon", { class: "sw-key-ic", name: "open-outline" }))) : (h("span", { class: "sw-key sw-key--plain" }, t.linearIdentifier))),
                        this.renderStatusChip(t, chip)),
                    h("button", { type: "button", class: "sw-row-title", "aria-expanded": String(open), "aria-label": open ? `Collapse ${t.linearIdentifier || t.title}` : `Expand ${t.linearIdentifier || t.title}`, onClick: () => this.toggleRow(t.id) }, t.title),
                    hasMeta && (h("div", { class: "sw-row-meta" },
                        t.linearMilestone && h("span", { class: "sw-meta-chip" },
                            "\u25C7 ",
                            t.linearMilestone.name),
                        assignee && (h("span", { class: "sw-meta-chip sw-assignee" },
                            h("span", { class: { 'sw-avatar': true, 'sw-avatar--me': isMe }, innerHTML: isMe ? SNOUT_LOGO_SVG : undefined }, isMe ? undefined : assignee.name.slice(0, 1).toUpperCase()),
                            isMe ? 'Me' : assignee.name)),
                        prs.map((pr) => (h("span", { class: "sw-prgrp" },
                            h("button", { type: "button", class: { 'sw-pr': true, 'sw-pr--wip': pr.isWip, 'sw-pr--ok': pr.mergeable }, title: pr.label, onClick: () => this.popOpenIssue.emit({ url: pr.url }) },
                                pr.mergeable && '✓ ',
                                pr.label),
                            pr.needsReviewer && h("span", { class: "sw-pr sw-pr--warn" }, "\u26A0 needs reviewer"),
                            pr.mergeable && (h("button", { type: "button", class: "sw-pr sw-pr--merge", onClick: () => this.popMergePr.emit({ taskId: t.id, prNumber: pr.number, url: pr.url }) }, "Merge"))))))),
                    verbs.length > 0 && h("div", { class: "sw-row-verbs" }, verbs.map((v) => this.renderVerb(t, v))),
                    cmd && this.renderCmd(t, cmd),
                    open && this.renderRowDetail(t)))));
    }
    /** The command/console block — COLLAPSED to a compact status line by default
     *  (a colour-coded status icon + status text); tapping expands the full
     *  milestone/output console. Also renders interactive permission cards,
     *  reply boxes, and stop buttons when interactive. */
    renderCmd(t, cmd) {
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
        return (h("div", { class: { 'sw-cmd': true, 'sw-cmd--open': open, [`sw-cmd--${tone}`]: true } },
            h("div", { class: "sw-cmd-header-bar" },
                h("button", { type: "button", class: "sw-cmd-line", "aria-expanded": String(open), disabled: !hasDetail, onClick: () => hasDetail && this.toggleCmd(t.id) },
                    h("pop-icon", { class: { 'sw-cmd-ic': true, 'sw-cmd-ic--spin': st === 'running' }, name: icon }),
                    h("span", { class: "sw-cmd-label" }, label),
                    hasDetail && h("pop-icon", { class: "sw-cmd-chev", name: "chevron-forward" })),
                isActiveSession && cmd.interactive && (h("button", { type: "button", class: "sw-btn sw-btn--stop", title: "Stop interactive build session", onClick: () => this.popCommandStop.emit({ commandId: cmd.id }) }, "Stop"))),
            open && (h("div", { class: "sw-cmd-body" },
                pendingPrompts.map((p) => (h("div", { class: "sw-cmd-prompt", key: p.id },
                    h("div", { class: "sw-cmd-prompt-title" },
                        h("pop-icon", { class: "sw-cmd-prompt-ic", name: "shield-outline" }),
                        "Permission request: ",
                        p.toolName),
                    h("pre", { class: "sw-cmd-prompt-input" }, JSON.stringify(p.input, null, 2)),
                    h("div", { class: "sw-cmd-prompt-actions" },
                        h("button", { type: "button", class: "sw-btn sw-btn--allow", onClick: () => this.popCommandAnswerPrompt.emit({ commandId: cmd.id, promptId: p.id, decision: 'allow' }) }, "Allow"),
                        h("button", { type: "button", class: "sw-btn sw-btn--deny", onClick: () => this.popCommandAnswerPrompt.emit({ commandId: cmd.id, promptId: p.id, decision: 'deny' }) }, "Deny"))))),
                isAwaitingInput && (h("div", { class: "sw-cmd-inbox" },
                    h("input", { type: "text", class: "sw-cmd-inbox-input", placeholder: "Send a follow-up turn\u2026", value: this.inboxInputs[cmd.id] || '', onInput: (e) => {
                            const val = e.target.value;
                            this.inboxInputs = { ...this.inboxInputs, [cmd.id]: val };
                        }, onKeyDown: (e) => {
                            if (e.key === 'Enter' && this.inboxInputs[cmd.id]?.trim()) {
                                this.popCommandSendInbox.emit({ commandId: cmd.id, text: this.inboxInputs[cmd.id].trim() });
                                this.inboxInputs = { ...this.inboxInputs, [cmd.id]: '' };
                            }
                        } }),
                    h("button", { type: "button", class: "sw-btn sw-btn--send", onClick: () => {
                            const txt = (this.inboxInputs[cmd.id] || '').trim();
                            if (txt) {
                                this.popCommandSendInbox.emit({ commandId: cmd.id, text: txt });
                                this.inboxInputs = { ...this.inboxInputs, [cmd.id]: '' };
                            }
                        } }, "Send"))),
                miles.length > 0 && (h("ul", { class: "sw-cmd-miles" }, miles.map((m) => (h("li", null, m))))),
                cmd.error && h("div", { class: "sw-cmd-out sw-cmd-out--err" }, cmd.error),
                cmd.result?.summary && h("div", { class: "sw-cmd-out" }, cmd.result.summary)))));
    }
    // ── Expanded row detail: READ-ONLY Linear summary ─────────────────────────
    /** The expanded detail is now read-only: the Linear issue summary/description
     *  (bridge-owned `summary`). No authoring UI — working detail lives in Linear
     *  + the Forgejo PR; the PR chips + console carry the rest. */
    renderRowDetail(t) {
        const summary = (t.summary ?? '').trim();
        return (h("div", { class: "sw-detail" },
            h("div", { class: "sw-summary-label" }, "Summary"),
            summary ? (h("p", { class: "sw-summary" }, summary)) : (h("p", { class: "sw-summary sw-summary--empty" }, "No summary synced from Linear yet."))));
    }
    render() {
        const tasks = this.parse(this.tasks, []);
        const projects = this.parse(this.projects, []);
        const commands = this.parse(this.commands, []);
        const cmdMap = commandsByTask(commands);
        const active = filterByTab(filterTasks(tasks, this.query, this.filters), this.tab);
        // Team ("Sonic") groups person → project; Action / Me stay project-first.
        const mode = this.tab === 'team' ? 'person' : 'project';
        const groups = issueGroups(active, projects, mode);
        const view = this.error && tasks.length === 0
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
        return (h(Host, { key: '0' },
            h("section", { key: '1', class: "sw", "aria-label": "Snout Tasks" },
                this.showHeader && this.renderHeader(),
                this.renderTabBar(tasks),
                this.renderSearchBar(tasks, projects),
                h("pop-async-view", { key: '2', class: "sw-view", state: view, errorLabel: this.error || "Couldn't load Snout work right now.", retryLabel: "Retry", onPopRetry: () => this.popRefresh.emit() },
                    view === 'content' && this.renderGroups(groups, cmdMap),
                    h("div", { key: '3', slot: "loading", class: "sw-skeleton", role: "status", "aria-busy": "true", "aria-label": "Loading Snout work" },
                        this.renderSkeletonGroup(2),
                        this.renderSkeletonGroup(3)),
                    h("div", { key: '4', slot: "empty", class: "sw-empty" },
                        h("span", { key: '5', class: "sw-logo sw-logo--empty", innerHTML: SNOUT_LOGO_SVG }),
                        h("span", { key: '6' }, emptyMsg))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-snout-work",
        "componentClassName": "PopSnoutWork",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "tasks",
                "type": "string",
                "attribute": "tasks",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "SnoutTask[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "SnoutTask": {
                            "location": "global",
                            "id": "global::SnoutTask"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Whole-team synced tasks (object array OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "projects",
                "type": "string",
                "attribute": "projects",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "SnoutProject[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "SnoutProject": {
                            "location": "global",
                            "id": "global::SnoutProject"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Projects for group headers + Open \u2197 links (object array OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "commands",
                "type": "string",
                "attribute": "commands",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "SnoutCommand[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "SnoutCommand": {
                            "location": "global",
                            "id": "global::SnoutCommand"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Recent/active bridgeCommands, for live milestones (object array OR JSON)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "counts",
                "type": "any",
                "attribute": "counts",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "{ action: 0, me: 0, team: 0 }",
                "complexType": {
                    "original": "SnoutCounts | string",
                    "resolved": "any",
                    "references": {
                        "SnoutCounts": {
                            "location": "global",
                            "id": "global::SnoutCounts"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Server-computed tab counts (object OR JSON string). Used as a fallback; the\nlive bubbles recompute per-tab MATCH counts from the loaded tasks."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "tab",
                "type": "any",
                "attribute": "tab",
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "'action'",
                "complexType": {
                    "original": "SnoutTab",
                    "resolved": "SnoutTab",
                    "references": {
                        "SnoutTab": {
                            "location": "global",
                            "id": "global::SnoutTab"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Active tab. Mutable so it also switches standalone (Storybook); the host\nstill binds + persists it and listens to popTabChange."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "teamName",
                "type": "string",
                "attribute": "team-name",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Sonic'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The Linear team name (third tab label \u2014 \"Sonic\" for the Snout/ENG team)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "autoAccept",
                "type": "boolean",
                "attribute": "auto-accept",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Global Auto-accept toggle state."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "loading",
                "type": "boolean",
                "attribute": "loading",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "First-load (no data) \u2192 a subtle loader instead of empty."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "error",
                "type": "string",
                "attribute": "error",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "An error line shown in place of the tree (with a Retry \u2192 popRefresh)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "showHeader",
                "type": "boolean",
                "attribute": "show-header",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Render the panel's own header (logo + title + sync + Auto-accept). Hosts\nwith their own chrome (the hub's PanelShell) set this false \u2014 only the\ntabs + search + list show."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "syncedAt",
                "type": "number",
                "attribute": "synced-at",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "number",
                    "resolved": "number | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Last successful sync time (epoch ms) for the header's pop-sync-status."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "collapsed"
            }, {
                "name": "expanded"
            }, {
                "name": "cmdExpanded"
            }, {
                "name": "statusMenuFor"
            }, {
                "name": "query"
            }, {
                "name": "filters"
            }, {
                "name": "inboxInputs"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popTabChange",
                "method": "popTabChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ tab: SnoutTab }",
                    "resolved": "{ tab: SnoutTab; }",
                    "references": {
                        "SnoutTab": {
                            "location": "global",
                            "id": "global::SnoutTab"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAutoAccept",
                "method": "popAutoAccept",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ value: boolean }",
                    "resolved": "{ value: boolean; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popRefresh",
                "method": "popRefresh",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popClose",
                "method": "popClose",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popOpenIssue",
                "method": "popOpenIssue",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ url: string }",
                    "resolved": "{ url: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popOpenProject",
                "method": "popOpenProject",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ url: string }",
                    "resolved": "{ url: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popVerb",
                "method": "popVerb",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ taskId: string; issueId?: string; type: string; setStatus?: string }",
                    "resolved": "{ taskId: string; issueId?: string | undefined; type: string; setStatus?: string | undefined; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popStatusChange",
                "method": "popStatusChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ taskId: string; status: string }",
                    "resolved": "{ taskId: string; status: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popMergePr",
                "method": "popMergePr",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ taskId: string; prNumber: number; url: string }",
                    "resolved": "{ taskId: string; prNumber: number; url: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popPostUpdate",
                "method": "popPostUpdate",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ projectId: string }",
                    "resolved": "{ projectId: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popCommandAnswerPrompt",
                "method": "popCommandAnswerPrompt",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ commandId: string; promptId: string; decision: 'allow' | 'deny'; updatedInput?: Record<string, unknown>; message?: string }",
                    "resolved": "{ commandId: string; promptId: string; decision: \"allow\" | \"deny\"; updatedInput?: any; message?: string | undefined; }",
                    "references": {
                        "Record": {
                            "location": "global",
                            "id": "global::Record"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popCommandSendInbox",
                "method": "popCommandSendInbox",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ commandId: string; text: string }",
                    "resolved": "{ commandId: string; text: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popCommandStop",
                "method": "popCommandStop",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ commandId: string }",
                    "resolved": "{ commandId: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "tasks",
                "methodName": "onTasksChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-SNOUT-WORK",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/snout-work/snout-work.css",
                        "relativePath": "snout-work.css",
                        "originalComponentPath": "snout-work.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": false,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": true,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": true,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "title", "label", "checked", "onPopChange", "innerHTML", "bare", "syncedAt", "loading", "onPopRefresh", "compact", "tabs", "activeTab", "onPopTabChange", "value", "placeholder", "filters", "views", "show-clear", "onSearchChange", "onFilterChange", "onClearFilters", "slot", "type", "aria-pressed", "onClick", "name", "aria-hidden", "key", "aria-expanded", "aria-label", "circle", "h", "w", "radius", "aria-haspopup", "role", "aria-selected", "href", "target", "rel", "disabled", "onInput", "onKeyDown", "state", "errorLabel", "retryLabel", "onPopRetry", "aria-busy"],
        "htmlTagNames": ["label", "span", "pop-switch", "div", "pop-sync-status", "pop-tab-bar", "pop-list-filter-sort", "button", "pop-icon", "pop-skeleton", "a", "pre", "input", "ul", "li", "p", "section", "pop-async-view"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
    static get watchers() { return {
        "tasks": [{
                "onTasksChange": 0
            }]
    }; }
};
//# sourceMappingURL=snout-work.js.map