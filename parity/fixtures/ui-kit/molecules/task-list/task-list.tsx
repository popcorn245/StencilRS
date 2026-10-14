import { Component, h, Prop, Event, EventEmitter, State, Watch, Element, Listen } from '@stencil/core';
import { resolveRoomId, type FloorPlan } from '@popcorn245/floorplan-core';

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  /** Fire time of a reminder/timer. Used as the effective date (dueDate ??
   *  reminderAt) for bucketing + sorting, and shown as a time on the row. */
  reminderAt?: string | null;
  assignedTo: string[];
  checked?: boolean;
  completedAt?: string | null;
  questId?: string | null;
  questTitle?: string | null;
  /** Tag strings — rendered as `#tag` chips in the row's meta line. */
  tags?: string[];
  /** Presentational thread label (teal chip) — Share-to-Thread phase hook. */
  threadLabel?: string | null;
  /** Space ids the task belongs to — used to resolve its canonical room. */
  spaceIds?: string[];
  /** Location-first place. Absent + spaceIds present → treated as Home. */
  location?: TaskLocation | null;
}

/** Mirrors tasks-app / tasks-core `TaskLocation`. */
type TaskLocation =
  | { kind: 'home' }
  | { kind: 'place'; label: string; lat: number; lon: number; osmId?: string };

/** Minimal space shape for room bucketing (passed via the `spaces` prop). */
interface SpaceLite {
  id: string;
  roomId?: string | null;
  room?: string | null;
}

/** A task's effective scheduling date: its due date, else its reminder time. */
function effectiveDate(t: TaskData): string | null {
  return t.dueDate ?? t.reminderAt ?? null;
}

type TimelineMode = 'flat' | 'timeline';

interface Bucket {
  key: string;
  label: string;
  tasks: TaskData[];
  anchor?: boolean; // the TODAY divider bucket
  archive?: boolean;
}

@Component({
  tag: 'pop-task-list',
  encapsulation: { type: 'scoped' },
  styleUrl: 'task-list.css',
})
export class PopTaskList {
  @Element() el: HTMLElement;

  /** Display mode: `flat` (default, legacy) or `timeline` (date-bucketed). */
  @Prop() mode: TimelineMode = 'flat';

  /** Grouping mode for the timeline: 'date' (date-bucketed, default), 'quest',
   *  'location', 'status', 'priority', or 'none' (a true flat, ungrouped, sorted
   *  list with no date dividers). An unspecified value keeps the date timeline. */
  @Prop() groupBy: string = 'date';

  /** Sort tasks by: createdAt, priority, dueDate, title, or `manual` (a
   *  host-supplied per-device order — see `manualOrder`). */
  @Prop() sortBy: string = 'createdAt';

  /** JSON stringified array of task ids defining the Manual sort order (used
   *  only when `sortBy === 'manual'`). Tasks are sorted by their index in this
   *  list; ids absent from it fall to the end (stable). The host owns this order
   *  (persisted per-device) and updates it on a `taskReordered` event. */
  @Prop() manualOrder: string = '[]';

  /** Fallback label for a quest bucket whose task carries no `questTitle`
   *  (groupBy === 'quest'). A host that calls a quest a "Project" can override. */
  @Prop() questGroupLabel: string = 'Quest';
  /** Label for the trailing "no quest" bucket (groupBy === 'quest'). A host that
   *  calls a quest a "Project" passes "No project". */
  @Prop() questGroupEmptyLabel: string = 'No quest';

  /** JSON stringified filter object: { status?, assignee? } */
  @Prop() filter: string = '{}';

  /** JSON stringified array of task objects */
  @Prop() tasks: string = '[]';

  /** JSON stringified array of user objects for avatar rendering */
  @Prop() users: string = '[]';

  /** Logged-in user's id — forwarded so a task assigned only to you (or
   *  unassigned) shows no avatar. */
  @Prop() currentUserId: string = '';

  /** Suppress the per-row assignee chip on every item — set when the list is
   *  already grouped by person (e.g. the tasks-app Family view) so the chip
   *  isn't redundant. Forwarded to each pop-task-item. */
  @Prop() hideAssignee: boolean = false;

  /** JSON stringified array of spaces ({ id, roomId?, room? }). Used to resolve
   *  each task's canonical room when groupBy === 'room'. */
  @Prop() spaces: string = '[]';

  /** JSON stringified FloorPlan (floorplan-core). Provides the canonical room
   *  list + aliases so a space's free-text `room` can be resolved when it has
   *  no stamped `roomId`. */
  @Prop() floorPlan: string = 'null';

  /** Selected task id (controlled). When set, that row pins to the top. */
  @Prop() selectedTaskId: string | null = null;

  /** Anchor for timeline scroll: 'today' | 'last-completed' | ISO date. */
  @Prop() anchor: string = 'today';

  /** Lazy-loader for older tasks (called when user scrolls past archive). */
  @Prop() loadPast?: () => Promise<TaskData[]>;

  /** Lazy-loader for future tasks (called when user scrolls past last month bucket). */
  @Prop() loadFuture?: () => Promise<TaskData[]>;

  /** Statuses hidden by default in timeline mode (still surface in archive). */
  @Prop() defaultHiddenStatuses: string = '["done","cancelled","skipped"]';

  /** A task row was clicked */
  @Event({ composed: true, bubbles: true }) taskClick: EventEmitter<{ taskId: string }>;

  /** Filter was changed by user */
  @Event({ composed: true, bubbles: true }) filterChange: EventEmitter<{ filter: any }>;

  /** Sort was changed by user */
  @Event({ composed: true, bubbles: true }) sortChange: EventEmitter<{ sortBy: string }>;

  /** A task was marked complete via the row checkbox. */
  @Event({ composed: true, bubbles: true }) taskComplete: EventEmitter<{ taskId: string }>;

  /** A bucket header was toggled/expanded. */
  @Event({ composed: true, bubbles: true }) bucketExpand: EventEmitter<{ bucket: string; expanded: boolean }>;

  /** Fired when the anchor row enters view (e.g. for "Jump to today" FAB). */
  @Event({ composed: true, bubbles: true }) anchorReached: EventEmitter<{ anchor: string }>;

  /** A task was dragged onto a different bucket section. The host persists the
   *  field implied by `groupBy` (status/quest/location/room → see page-dashboard). */
  @Event({ composed: true, bubbles: true }) taskMoved: EventEmitter<{
    taskId: string;
    groupBy: string;
    toBucketKey: string;
  }>;

  /** A task was dragged onto a map room hit-zone (detected via DOM hit-test of
   *  `[data-room-drop]` elements rendered by pop-floor-map). The host moves the
   *  task to that canonical room. */
  @Event({ composed: true, bubbles: true }) taskDroppedOnRoom: EventEmitter<{
    taskId: string;
    roomId: string;
  }>;

  /** A task was re-ordered within the Manual sort (dragged to a new position in
   *  the same list/group). `orderedIds` is the full new order of the currently
   *  visible rows (flattened across buckets in render order). The host persists
   *  this per-device. Only fired when `sortBy === 'manual'`. */
  @Event({ composed: true, bubbles: true }) taskReordered: EventEmitter<{
    taskId: string;
    orderedIds: string[];
  }>;

  @State() localFilter: { status?: string; assignee?: string } = {};
  @State() localSort: string = 'createdAt';
  @State() collapsedBuckets: Record<string, boolean> = {};

  /** Id of the task currently being dragged by its handle (null = no drag). */
  @State() draggingTaskId: string | null = null;
  /** Bucket key currently hovered as a drop target (highlighted). */
  @State() dropBucketKey: string | null = null;
  /** During a Manual-sort drag: the row id the ghost would insert next to. */
  @State() reorderTargetId: string | null = null;
  /** Whether the manual-sort insertion is before (true) or after (false) the
   *  `reorderTargetId` row. */
  @State() reorderBefore: boolean = true;

  private anchorEl?: HTMLElement;
  private observer?: IntersectionObserver;

  // ── pointer-drag controller (touch + mouse) ──
  private dragPointerId: number | null = null;
  private dragGhost: HTMLElement | null = null;
  private dragMoved = false;
  private dragStartX = 0;
  private dragStartY = 0;
  /** A map room hit-zone (data-room-drop) currently under the pointer, if any. */
  private dropRoomId: string | null = null;
  private floorMapEl: (HTMLElement & { dropTargetRoomId?: string }) | null = null;

  componentWillLoad() {
    try { this.localFilter = JSON.parse(this.filter); } catch { this.localFilter = {}; }
    this.localSort = this.sortBy;
  }

  componentDidLoad() {
    if (this.mode === 'timeline') {
      this.scrollToAnchor();
      this.setupAnchorObserver();
    }
  }

  @Watch('mode')
  onModeChange() {
    if (this.mode === 'timeline') {
      requestAnimationFrame(() => {
        this.scrollToAnchor();
        this.setupAnchorObserver();
      });
    }
  }

  @Watch('anchor')
  onAnchorChange() {
    if (this.mode === 'timeline') {
      requestAnimationFrame(() => this.scrollToAnchor());
    }
  }

  /** Keep the internal sort in step when a host drives `sortBy` as a prop (the
   *  flat-mode select updates localSort directly; a controlled host does not). */
  @Watch('sortBy')
  onSortByChange() {
    this.localSort = this.sortBy;
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    this.teardownDrag();
  }

  // ─────────────── drag-and-drop (pointer-based, reuses the kanban DnD
  // model: a lifted source, a highlighted drop target, touch-friendly) ──────

  /** A task row's drag handle was pressed → begin a pointer-tracked drag. The
   *  list owns the geometry (bucket sections + the sibling map's room zones). */
  @Listen('taskDragHandleDown')
  onTaskDragHandleDown(
    ev: CustomEvent<{ taskId: string; pointerId: number; clientX: number; clientY: number }>,
  ) {
    ev.stopPropagation();
    const { taskId, pointerId, clientX, clientY } = ev.detail;
    this.draggingTaskId = taskId;
    this.dragPointerId = pointerId;
    this.dragMoved = false;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.dropBucketKey = null;
    this.dropRoomId = null;
    this.reorderTargetId = null;
    // The sibling map (rendered by the page) is the room drop surface.
    this.floorMapEl = (document.querySelector('pop-floor-map') as any) ?? null;
    window.addEventListener('pointermove', this.onDragMove, { passive: false });
    window.addEventListener('pointerup', this.onDragEnd);
    window.addEventListener('pointercancel', this.onDragEnd);
  }

  private buildGhost(clientX: number, clientY: number) {
    const task = this.parsedTasks.find((t) => t.id === this.draggingTaskId);
    const ghost = document.createElement('div');
    ghost.className = 'task-list__drag-ghost';
    ghost.textContent = task?.title ?? 'Task';
    // Inline styles so the ghost looks right even though it's appended to
    // <body> (out of reach of this component's scoped CSS).
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${clientX}px`,
      top: `${clientY}px`,
      transform: 'translate(-50%, -120%) rotate(-1.5deg)',
      zIndex: '9999',
      pointerEvents: 'none',
      maxWidth: '260px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      padding: '8px 14px',
      borderRadius: '12px',
      background: 'var(--pico-card-background-color, #fff)',
      color: 'var(--ink, #1a202c)',
      font: '600 14px/1.2 var(--font-sans, system-ui, sans-serif)',
      boxShadow: '0 12px 30px rgba(20, 30, 60, 0.28)',
      border: '1px solid color-mix(in oklab, var(--brand-blue, #4299e1) 40%, transparent)',
      opacity: '0.96',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(ghost);
    this.dragGhost = ghost;
  }

  private onDragMove = (ev: PointerEvent) => {
    if (this.draggingTaskId === null || ev.pointerId !== this.dragPointerId) return;
    ev.preventDefault();
    // Require a small threshold before the drag "engages" (avoids a jittery
    // ghost on a stationary press).
    if (!this.dragMoved) {
      const dx = Math.abs(ev.clientX - this.dragStartX);
      const dy = Math.abs(ev.clientY - this.dragStartY);
      if (dx < 5 && dy < 5) return;
      this.dragMoved = true;
      this.buildGhost(ev.clientX, ev.clientY);
    }
    if (this.dragGhost) {
      this.dragGhost.style.left = `${ev.clientX}px`;
      this.dragGhost.style.top = `${ev.clientY}px`;
    }
    this.hitTest(ev.clientX, ev.clientY);
  };

  /** Find the bucket section or map room under the pointer and highlight it. */
  private hitTest(x: number, y: number) {
    // Temporarily ignore the ghost so it doesn't shadow the hit target.
    const prevPE = this.dragGhost?.style.pointerEvents;
    if (this.dragGhost) this.dragGhost.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (this.dragGhost && prevPE !== undefined) this.dragGhost.style.pointerEvents = prevPE;

    // 1. Map room hit-zone (rendered by pop-floor-map with data-room-drop).
    const roomEl = el?.closest?.('[data-room-drop]') as HTMLElement | null;
    const roomId = roomEl?.getAttribute('data-room-drop') ?? null;
    if (roomId) {
      this.setDropRoom(roomId);
      this.setDropBucket(null);
      this.setReorderTarget(null, true);
      return;
    }
    this.setDropRoom(null);

    // 2. Manual sort → within-list (or within-group) reorder. Find the row
    //    under the pointer; if it shares the dragged row's bucket (or the list
    //    is ungrouped), we reorder relative to it rather than re-bucketing.
    if (this.sortBy === 'manual') {
      const rowEl = el?.closest?.('[data-task-id]') as HTMLElement | null;
      const targetId = rowEl?.getAttribute('data-task-id') ?? null;
      if (rowEl && targetId && targetId !== this.draggingTaskId) {
        const draggedRow = this.el.querySelector(
          `[data-task-id="${CSS.escape(this.draggingTaskId ?? '')}"]`,
        ) as HTMLElement | null;
        const sameBucket =
          (rowEl.closest('[data-bucket]') ?? null) ===
          (draggedRow?.closest('[data-bucket]') ?? null);
        if (sameBucket) {
          const rect = rowEl.getBoundingClientRect();
          this.setReorderTarget(targetId, y < rect.top + rect.height / 2);
          this.setDropBucket(null);
          return;
        }
      }
    }
    this.setReorderTarget(null, true);

    // 3. A DROPPABLE bucket section in this list (field-backed groupings +
    //    date's single-day buckets carry the droppable flag).
    const bucketEl = el?.closest?.('[data-bucket-droppable]') as HTMLElement | null;
    const key = bucketEl?.getAttribute('data-bucket') ?? null;
    this.setDropBucket(key);
  }

  private setReorderTarget(id: string | null, before: boolean) {
    if (this.reorderTargetId !== id) this.reorderTargetId = id;
    if (this.reorderBefore !== before) this.reorderBefore = before;
  }

  private setDropBucket(key: string | null) {
    if (this.dropBucketKey !== key) this.dropBucketKey = key;
  }

  private setDropRoom(roomId: string | null) {
    if (this.dropRoomId === roomId) return;
    this.dropRoomId = roomId;
    // Drive the sibling map's highlight via its prop (no full page re-render).
    if (this.floorMapEl) this.floorMapEl.dropTargetRoomId = roomId ?? undefined;
  }

  private onDragEnd = (ev: PointerEvent) => {
    if (this.draggingTaskId === null || ev.pointerId !== this.dragPointerId) return;
    const taskId = this.draggingTaskId;
    const bucketKey = this.dropBucketKey;
    const roomId = this.dropRoomId;
    const reorderTargetId = this.reorderTargetId;
    const reorderBefore = this.reorderBefore;
    const engaged = this.dragMoved;
    // Snapshot the current visible row order BEFORE teardown re-renders.
    const currentOrder = this.visibleRowIds();
    this.teardownDrag();
    if (!engaged) return; // a tap without movement — let the row handle it
    if (roomId) {
      this.taskDroppedOnRoom.emit({ taskId, roomId });
    } else if (reorderTargetId) {
      const orderedIds = reorder(currentOrder, taskId, reorderTargetId, reorderBefore);
      if (orderedIds) this.taskReordered.emit({ taskId, orderedIds });
    } else if (bucketKey) {
      this.taskMoved.emit({ taskId, groupBy: this.groupBy, toBucketKey: bucketKey });
    }
  };

  /** Ids of every currently rendered task row, in DOM (visible) order. */
  private visibleRowIds(): string[] {
    return Array.from(this.el.querySelectorAll('[data-task-id]'))
      .map((n) => (n as HTMLElement).getAttribute('data-task-id') || '')
      .filter(Boolean);
  }

  private teardownDrag() {
    window.removeEventListener('pointermove', this.onDragMove as any);
    window.removeEventListener('pointerup', this.onDragEnd as any);
    window.removeEventListener('pointercancel', this.onDragEnd as any);
    this.dragGhost?.remove();
    this.dragGhost = null;
    if (this.floorMapEl) this.floorMapEl.dropTargetRoomId = undefined;
    this.floorMapEl = null;
    this.draggingTaskId = null;
    this.dragPointerId = null;
    this.dropBucketKey = null;
    this.dropRoomId = null;
    this.reorderTargetId = null;
    this.dragMoved = false;
  }

  private setupAnchorObserver() {
    this.observer?.disconnect();
    if (!this.anchorEl || typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) this.anchorReached.emit({ anchor: this.anchor });
      }
    }, { threshold: 0.1 });
    this.observer.observe(this.anchorEl);
  }

  private scrollToAnchor() {
    if (!this.anchorEl) return;
    if (typeof this.anchorEl.scrollIntoView !== 'function') return;
    this.anchorEl.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  private get parsedTasks(): TaskData[] {
    try { return JSON.parse(this.tasks); } catch { return []; }
  }

  private get parsedManualOrder(): string[] {
    try {
      const a = JSON.parse(this.manualOrder);
      return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : [];
    } catch { return []; }
  }

  /** Whether task rows should show their drag handle. Only when a drag actually
   *  does something: a grouping is active (drag-to-regroup) OR the sort is
   *  Manual (drag-to-reorder). A true flat, auto-sorted list shows none. The
   *  person-grouped Family view passes groupBy='none', so it stays handle-free. */
  private get handlesVisible(): boolean {
    return this.groupBy !== 'none' || this.sortBy === 'manual';
  }

  private get parsedUsers(): { id: string; displayName: string; photoURL?: string }[] {
    try { return JSON.parse(this.users); } catch { return []; }
  }

  private get parsedSpaces(): SpaceLite[] {
    try { return JSON.parse(this.spaces); } catch { return []; }
  }

  private get parsedFloorPlan(): FloorPlan | null {
    try { return JSON.parse(this.floorPlan); } catch { return null; }
  }

  private get hiddenStatuses(): string[] {
    try { return JSON.parse(this.defaultHiddenStatuses); } catch { return ['done', 'cancelled', 'skipped']; }
  }

  private get filteredTasks(): TaskData[] {
    let tasks = this.parsedTasks;

    if (this.localFilter.status && this.localFilter.status !== 'all') {
      if (this.localFilter.status === 'open') {
        tasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.status !== 'skipped');
      } else {
        tasks = tasks.filter(t => t.status === this.localFilter.status);
      }
    }

    if (this.localFilter.assignee) {
      tasks = tasks.filter(t => t.assignedTo.includes(this.localFilter.assignee!));
    }

    return this.sortTasks(tasks);
  }

  /** Sort by `sortKey` (defaults to the flat-mode internal select's value).
   *  The timeline path passes `this.sortBy` directly so a controlled host's
   *  sort is honoured on every render — no reliance on a prop @Watch. */
  private sortTasks(tasks: TaskData[], sortKey: string = this.localSort): TaskData[] {
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

    if (sortKey === 'manual') {
      const order = this.parsedManualOrder;
      const rank = new Map(order.map((id, i) => [id, i]));
      // Stable: unknown ids keep their incoming relative order after the known
      // ones (Infinity rank + index tiebreak).
      return tasks
        .map((t, i) => ({ t, i, r: rank.has(t.id) ? (rank.get(t.id) as number) : Infinity }))
        .sort((a, b) => (a.r - b.r) || (a.i - b.i))
        .map((x) => x.t);
    }

    return [...tasks].sort((a, b) => {
      if (sortKey === 'priority') {
        return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      }
      if (sortKey === 'dueDate') {
        const aEff = effectiveDate(a);
        const bEff = effectiveDate(b);
        const aDate = aEff ? new Date(aEff).getTime() : Infinity;
        const bDate = bEff ? new Date(bEff).getTime() : Infinity;
        return aDate - bDate;
      }
      if (sortKey === 'title') {
        return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
      }
      // 'createdAt' (and any unknown id) → stable insertion order (the host
      // already sends tasks in creation order).
      return 0;
    });
  }

  private handleFilterChange = (key: string, value: string) => {
    this.localFilter = { ...this.localFilter, [key]: value };
    this.filterChange.emit({ filter: this.localFilter });
  };

  private handleSortChange = (e: Event) => {
    this.localSort = (e.target as HTMLSelectElement).value;
    this.sortChange.emit({ sortBy: this.localSort });
  };

  private handleTaskClick = (taskId: string) => {
    this.taskClick.emit({ taskId });
  };

  private handleTaskComplete = (taskId: string, ev: Event) => {
    ev.stopPropagation();
    this.taskComplete.emit({ taskId });
  };

  private toggleBucket = (key: string) => {
    const expanded = !!this.collapsedBuckets[key];
    this.collapsedBuckets = { ...this.collapsedBuckets, [key]: !expanded };
    this.bucketExpand.emit({ bucket: key, expanded: !expanded });
  };

  // ---------- timeline bucket logic ----------

  private resolveAnchorDate(): Date {
    if (this.anchor === 'today') return startOfDay(new Date());
    if (this.anchor === 'last-completed') {
      const done = this.parsedTasks
        .filter(t => t.completedAt && (t.status === 'done'))
        .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
      if (done.length && done[0].completedAt) return startOfDay(new Date(done[0].completedAt));
      return startOfDay(new Date());
    }
    // ISO date string
    const d = new Date(this.anchor);
    if (!isNaN(d.getTime())) return startOfDay(d);
    return startOfDay(new Date());
  }

  private bucketsForTimeline(): Bucket[] {
    const anchorDate = this.resolveAnchorDate();
    const today = anchorDate;
    const tomorrow = addDays(today, 1);
    const endOfWeek = addDays(today, 7 - today.getDay());
    const endOfNextWeek = addDays(endOfWeek, 7);
    const endOfThisMonth = endOfMonth(today);
    const startOfThisWeek = addDays(today, -today.getDay());
    const startOfLastWeek = addDays(startOfThisWeek, -7);

    const hidden = new Set(this.hiddenStatuses);
    const isDone = (t: TaskData) => t.status === 'done' || t.status === 'cancelled' || t.status === 'skipped';
    const isCompletedToday = (t: TaskData) => {
      if (!isDone(t)) return false;
      if (!t.completedAt) return false;
      const d = startOfDay(new Date(t.completedAt));
      return d.getTime() === today.getTime();
    };

    // Status filter override
    const statusFilter = this.localFilter.status;
    const showHidden = statusFilter && statusFilter !== 'open' && statusFilter !== 'all';

    const tasks = this.parsedTasks.filter(t => {
      if (this.localFilter.assignee && !t.assignedTo.includes(this.localFilter.assignee)) return false;
      if (statusFilter && statusFilter !== 'all' && statusFilter !== 'open') {
        return t.status === statusFilter;
      }
      return true;
    });

    const buckets: Record<string, Bucket> = {
      older: { key: 'older', label: 'Older', tasks: [], archive: true },
      lastWeek: { key: 'lastWeek', label: 'Last week', tasks: [], archive: true },
      thisWeekPast: { key: 'thisWeekPast', label: 'This week', tasks: [], archive: true },
      overdue: { key: 'overdue', label: 'Overdue', tasks: [] },
      // `today` is the single scroll anchor + the only bucket that renders the
      // "Today" divider. Inbox is a normal labelled bucket (shown only when it
      // holds no-due-date tasks) so we don't paint two identical dividers.
      inbox: { key: 'inbox', label: 'Inbox', tasks: [] },
      today: { key: 'today', label: 'Today', tasks: [], anchor: true },
      tomorrow: { key: 'tomorrow', label: 'Tomorrow', tasks: [] },
      thisWeek: { key: 'thisWeek', label: 'This week', tasks: [] },
      nextWeek: { key: 'nextWeek', label: 'Next week', tasks: [] },
      laterThisMonth: { key: 'laterThisMonth', label: 'Later this month', tasks: [] },
    };
    const futureMonths: Record<string, Bucket> = {};

    for (const t of tasks) {
      const isHiddenStatus = hidden.has(t.status);

      // Past completed/cancelled/skipped → archive surfacing
      if (isDone(t) && t.completedAt) {
        const c = startOfDay(new Date(t.completedAt));
        if (c.getTime() === today.getTime()) {
          // sinks to bottom of today bucket
          buckets.today.tasks.push(t);
          continue;
        }
        if (c < today) {
          if (c >= startOfThisWeek) buckets.thisWeekPast.tasks.push(t);
          else if (c >= startOfLastWeek) buckets.lastWeek.tasks.push(t);
          else buckets.older.tasks.push(t);
          continue;
        }
      }

      // Hidden status without showHidden → drop (except today done handled above)
      if (isHiddenStatus && !showHidden) continue;

      const eff = effectiveDate(t);
      const due = eff ? startOfDay(new Date(eff)) : null;

      if (!due) {
        buckets.inbox.tasks.push(t);
        continue;
      }

      if (due < today) buckets.overdue.tasks.push(t);
      else if (due.getTime() === today.getTime()) buckets.today.tasks.push(t);
      else if (due.getTime() === tomorrow.getTime()) buckets.tomorrow.tasks.push(t);
      else if (due <= endOfWeek) buckets.thisWeek.tasks.push(t);
      else if (due <= endOfNextWeek) buckets.nextWeek.tasks.push(t);
      else if (due <= endOfThisMonth) buckets.laterThisMonth.tasks.push(t);
      else {
        const key = `m-${due.getFullYear()}-${due.getMonth()}`;
        const label = due.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        if (!futureMonths[key]) futureMonths[key] = { key, label, tasks: [] };
        futureMonths[key].tasks.push(t);
      }
    }

    // Today bucket: sort open first, completed-today sink to bottom
    buckets.today.tasks.sort((a, b) => {
      const aDone = isCompletedToday(a) ? 1 : 0;
      const bDone = isCompletedToday(b) ? 1 : 0;
      return aDone - bDone;
    });

    const ordered: Bucket[] = [
      buckets.older,
      buckets.lastWeek,
      buckets.thisWeekPast,
      buckets.overdue,
      buckets.inbox,
      buckets.today,
      buckets.tomorrow,
      buckets.thisWeek,
      buckets.nextWeek,
      buckets.laterThisMonth,
      ...Object.values(futureMonths).sort((a, b) => a.key.localeCompare(b.key)),
    ];

    return ordered.filter(b => b.tasks.length > 0 || b.anchor);
  }

  /** Map a date-timeline bucket key to its drag-drop payload. Only the
   *  single-day buckets are droppable; the `date:<iso>` / `date:none` key lets
   *  the host set (or clear) the task's due date without re-deriving "today". */
  private dateBucketDrop(bucketKey: string, anchor: Date): { droppable: boolean; key: string } {
    if (bucketKey === 'inbox') return { droppable: true, key: 'date:none' };
    if (bucketKey === 'today') return { droppable: true, key: `date:${toISODate(anchor)}` };
    if (bucketKey === 'tomorrow') return { droppable: true, key: `date:${toISODate(addDays(anchor, 1))}` };
    return { droppable: false, key: bucketKey };
  }

  private renderTaskRow = (t: TaskData) => {
    const isSelected = this.selectedTaskId === t.id;
    const href = `/task/${encodeURIComponent(t.id)}`;
    return (
      <a
        // Stable identity so a list mutation (e.g. a task completed + removed by
        // the host) never reuses a pop-task-item node by position — which would
        // otherwise leak that item's internal `checked` state onto a different
        // task.
        key={t.id}
        href={href}
        class={{
          'task-list__item-wrap': true,
          'task-list__item-wrap--selected': isSelected,
          'task-list__item-wrap--dragging': this.draggingTaskId === t.id,
          'task-list__item-wrap--insert-before':
            this.reorderTargetId === t.id && this.reorderBefore,
          'task-list__item-wrap--insert-after':
            this.reorderTargetId === t.id && !this.reorderBefore,
        }}
        data-task-id={t.id}
        onClick={(e: MouseEvent) => {
          // Modifier-click → let the browser open in new tab.
          if (e.metaKey || e.ctrlKey || e.shiftKey || (e as any).button === 1) return;
          e.preventDefault();
          this.handleTaskClick(t.id);
        }}
      >
        <pop-task-item
          taskId={t.id}
          taskTitle={t.title}
          status={t.status}
          priority={t.priority}
          dueDate={t.dueDate}
          reminderAt={t.reminderAt}
          assignedTo={JSON.stringify(t.assignedTo)}
          checked={t.status === 'done'}
          users={this.users}
          currentUserId={this.currentUserId}
          hideAssignee={this.hideAssignee}
          questLabel={this.groupBy === 'quest' ? '' : (t.questTitle || '')}
          tags={JSON.stringify(t.tags ?? [])}
          threadLabel={t.threadLabel || ''}
          dragHandle={this.handlesVisible}
          readonly={true}
          onTaskChecked={(ev: CustomEvent<{ taskId: string; checked: boolean }>) => this.handleTaskComplete(t.id, ev)}
        />
      </a>
    );
  };

  private renderFlat() {
    const tasks = this.filteredTasks;
    const users = this.parsedUsers;
    return (
      <div class="task-list">
        <div class="task-list__bar">
          <select
            class="task-list__select"
            onChange={(e) => this.handleFilterChange('status', (e.target as HTMLSelectElement).value)}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </select>

          {users.length > 0 && (
            <select
              class="task-list__select"
              onChange={(e) => this.handleFilterChange('assignee', (e.target as HTMLSelectElement).value)}
            >
              <option value="">All assignees</option>
              {users.map(u => <option value={u.id}>{u.displayName}</option>)}
            </select>
          )}

          <select class="task-list__select" onChange={this.handleSortChange}>
            <option value="createdAt">Date</option>
            <option value="priority">Priority</option>
            <option value="dueDate">Due date</option>
          </select>
        </div>

        {tasks.length === 0 ? (
          <div class="task-list__empty">No tasks match your filters</div>
        ) : (
          <div class="task-list__items">
            {tasks.map(this.renderTaskRow)}
          </div>
        )}
      </div>
    );
  }

  /** Group tasks by their quest (label = quest title), with a trailing
   *  "No quest" bucket. Used when groupBy === 'quest'. Shows all statuses so
   *  quest progress (incl. done) is visible. */
  private bucketsByQuest(): Bucket[] {
    const tasks = this.parsedTasks.filter(t => {
      if (this.localFilter.assignee && !t.assignedTo.includes(this.localFilter.assignee)) return false;
      const sf = this.localFilter.status;
      if (sf && sf !== 'all' && sf !== 'open') return t.status === sf;
      return true;
    });
    const byQuest = new Map<string, Bucket>();
    const noQuest: Bucket = { key: '__noquest', label: this.questGroupEmptyLabel, tasks: [] };
    for (const t of tasks) {
      if (t.questId) {
        const key = `q-${t.questId}`;
        if (!byQuest.has(key)) byQuest.set(key, { key, label: t.questTitle || this.questGroupLabel, tasks: [] });
        byQuest.get(key)!.tasks.push(t);
      } else {
        noQuest.tasks.push(t);
      }
    }
    const ordered = [...byQuest.values()].sort((a, b) => a.label.localeCompare(b.label));
    if (noQuest.tasks.length) ordered.push(noQuest);
    return ordered.filter(b => b.tasks.length > 0);
  }

  /** Resolve a task's canonical room id (and display name) via its spaces.
   *  A space's stamped `roomId` wins; otherwise we resolve its free-text `room`
   *  against the floor plan. Returns the FIRST resolvable room across the
   *  task's spaces, or null. */
  private taskRoom(t: TaskData): { id: string; name: string } | null {
    const plan = this.parsedFloorPlan;
    const spaceById = new Map(this.parsedSpaces.map(s => [s.id, s]));
    for (const sid of t.spaceIds ?? []) {
      const sp = spaceById.get(sid);
      if (!sp) continue;
      const rid = sp.roomId || resolveRoomId(plan, sp.room ?? '');
      if (rid) {
        const name = plan?.rooms.find(r => r.id === rid)?.name ?? sp.room ?? rid;
        return { id: rid, name };
      }
    }
    return null;
  }

  /** Is this task a "Home" task? Either an explicit home location OR (legacy)
   *  no location but room-resolvable spaces. */
  private isHomeTask(t: TaskData): boolean {
    if (t.location?.kind === 'home') return true;
    if (t.location?.kind === 'place') return false;
    // Legacy / no location: treat as Home when it has a resolvable room (or any
    // space ids at all — a Home task may carry spaces that don't map to a room).
    return (t.spaceIds?.length ?? 0) > 0 && !!this.taskRoom(t);
  }

  /** Group tasks by their LOCATION (location-first). One "🏠 Home" bucket for
   *  all Home tasks (explicit or legacy spaceIds/room), one bucket per place
   *  (keyed by osmId||label), and a trailing "No location" bucket. Used when
   *  groupBy === 'location'. */
  private bucketsByLocation(): Bucket[] {
    const tasks = this.parsedTasks.filter(t => {
      if (this.localFilter.assignee && !t.assignedTo.includes(this.localFilter.assignee)) return false;
      const sf = this.localFilter.status;
      if (sf && sf !== 'all' && sf !== 'open') return t.status === sf;
      return true;
    });
    const home: Bucket = { key: '__home', label: '🏠 Home', tasks: [] };
    const byPlace = new Map<string, Bucket>();
    const none: Bucket = { key: '__noloc', label: 'No location', tasks: [] };
    for (const t of tasks) {
      if (t.location?.kind === 'place') {
        const key = `p-${t.location.osmId || t.location.label}`;
        if (!byPlace.has(key)) byPlace.set(key, { key, label: t.location.label, tasks: [] });
        byPlace.get(key)!.tasks.push(t);
      } else if (this.isHomeTask(t)) {
        home.tasks.push(t);
      } else {
        none.tasks.push(t);
      }
    }
    const places = [...byPlace.values()].sort((a, b) => a.label.localeCompare(b.label));
    const ordered: Bucket[] = [];
    if (home.tasks.length) ordered.push(home);
    ordered.push(...places);
    if (none.tasks.length) ordered.push(none);
    return ordered.filter(b => b.tasks.length > 0);
  }

  /** Shared filter for the field-groupings (quest/location/status/priority):
   *  honour the assignee filter, and let an explicit (non-open/all) status
   *  filter narrow the set. Mirrors bucketsByQuest/bucketsByLocation. */
  private groupingSourceTasks(): TaskData[] {
    return this.parsedTasks.filter(t => {
      if (this.localFilter.assignee && !t.assignedTo.includes(this.localFilter.assignee)) return false;
      const sf = this.localFilter.status;
      if (sf && sf !== 'all' && sf !== 'open') return t.status === sf;
      return true;
    });
  }

  /** Group tasks by STATUS. Active statuses first (Open → In progress →
   *  Blocked), then the hidden/terminal statuses (Done, Cancelled, Skipped) as
   *  trailing `archive` buckets — matching how the date timeline sinks
   *  done/cancelled/skipped (see `defaultHiddenStatuses`). Any unrecognised
   *  status falls into a trailing "Other" bucket. Bucket keys are stable
   *  (`status:<value>`) so a drag-to-regroup can persist the new status. Used
   *  when groupBy === 'status'. */
  private bucketsByStatus(): Bucket[] {
    const tasks = this.groupingSourceTasks();
    const hidden = new Set(this.hiddenStatuses);
    // Canonical display order + human labels.
    const order: { status: string; label: string }[] = [
      { status: 'open', label: 'Open' },
      { status: 'in_progress', label: 'In progress' },
      { status: 'review', label: 'Review' },
      { status: 'blocked', label: 'Blocked' },
      { status: 'done', label: 'Done' },
      { status: 'cancelled', label: 'Cancelled' },
      { status: 'skipped', label: 'Skipped' },
    ];
    const rank = new Map(order.map((o, i) => [o.status, i]));
    const byStatus = new Map<string, Bucket>();
    for (const meta of order) {
      byStatus.set(meta.status, {
        key: `status:${meta.status}`,
        label: meta.label,
        tasks: [],
        archive: hidden.has(meta.status),
      });
    }
    const other: Bucket = { key: 'status:__other', label: 'Other', tasks: [], archive: true };
    for (const t of tasks) {
      const b = byStatus.get(t.status);
      if (b) b.tasks.push(t);
      else other.tasks.push(t);
    }
    const ordered: Bucket[] = [...byStatus.values()].sort(
      (a, b) => (rank.get(a.key.slice('status:'.length)) ?? 99) - (rank.get(b.key.slice('status:'.length)) ?? 99),
    );
    if (other.tasks.length) ordered.push(other);
    return ordered.filter(b => b.tasks.length > 0);
  }

  /** Group tasks by PRIORITY (Urgent → High → Medium → Low), with a trailing
   *  "No priority" bucket for tasks whose priority is empty/unknown. Uses the
   *  same priority ranking as `sortTasks`. Bucket keys are stable
   *  (`priority:<value>`) so a drag-to-regroup can persist the new priority.
   *  Used when groupBy === 'priority'. */
  private bucketsByPriority(): Bucket[] {
    const tasks = this.groupingSourceTasks();
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const order: { priority: string; label: string }[] = [
      { priority: 'urgent', label: 'Urgent' },
      { priority: 'high', label: 'High' },
      { priority: 'medium', label: 'Medium' },
      { priority: 'low', label: 'Low' },
    ];
    const byPriority = new Map<string, Bucket>();
    for (const meta of order) {
      byPriority.set(meta.priority, { key: `priority:${meta.priority}`, label: meta.label, tasks: [] });
    }
    const none: Bucket = { key: 'priority:__none', label: 'No priority', tasks: [] };
    for (const t of tasks) {
      const b = t.priority && priorityOrder[t.priority] !== undefined ? byPriority.get(t.priority) : null;
      if (b) b.tasks.push(t);
      else none.tasks.push(t);
    }
    const ordered: Bucket[] = [...byPriority.values()].sort(
      (a, b) => priorityOrder[a.key.slice('priority:'.length)] - priorityOrder[b.key.slice('priority:'.length)],
    );
    if (none.tasks.length) ordered.push(none);
    return ordered.filter(b => b.tasks.length > 0);
  }

  /** A TRUE flat, ungrouped, sorted list (groupBy === 'none' in timeline mode):
   *  no date dividers, no bucket headers — just every task honouring the
   *  assignee/status filter, ordered by the active sort. Additive; the date
   *  timeline + field groupings are untouched. */
  private renderFlatSorted() {
    const tasks = this.sortTasks(this.groupingSourceTasks(), this.sortBy);
    const selectedTask = this.selectedTaskId
      ? this.parsedTasks.find(t => t.id === this.selectedTaskId)
      : null;
    return (
      <div class="task-list task-list--timeline task-list--flatsorted">
        {selectedTask && (
          <div class="task-list__pinned">{this.renderTaskRow(selectedTask)}</div>
        )}
        {tasks.length === 0 ? (
          <div class="task-list__empty">No tasks match your filters</div>
        ) : (
          <div class="task-list__items">
            <div class="task-list__bucket-items">{tasks.map(this.renderTaskRow)}</div>
          </div>
        )}
      </div>
    );
  }

  private renderTimeline() {
    if (this.groupBy === 'none') return this.renderFlatSorted();
    const buckets =
      this.groupBy === 'quest'
        ? this.bucketsByQuest()
        : this.groupBy === 'location'
          ? this.bucketsByLocation()
          : this.groupBy === 'status'
            ? this.bucketsByStatus()
            : this.groupBy === 'priority'
              ? this.bucketsByPriority()
              : this.bucketsForTimeline();
    // Field-backed groupings order their tasks by the active sort (date buckets
    // keep their date-derived ordering + today-completion sink).
    const fieldGrouped =
      this.groupBy === 'quest' ||
      this.groupBy === 'location' ||
      this.groupBy === 'status' ||
      this.groupBy === 'priority';
    if (fieldGrouped) {
      for (const b of buckets) b.tasks = this.sortTasks(b.tasks, this.sortBy);
    }
    const anchorDate = this.resolveAnchorDate();
    const selectedTask = this.selectedTaskId
      ? this.parsedTasks.find(t => t.id === this.selectedTaskId)
      : null;
    const anchorLabel = `${anchorDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;

    return (
      <div class="task-list task-list--timeline">
        {selectedTask && (
          <div class="task-list__pinned">
            {this.renderTaskRow(selectedTask)}
          </div>
        )}
        <div class="task-list__items">
          {buckets.map(b => {
            const collapsed = !!this.collapsedBuckets[b.key];
            // Re-bucketing by drag is supported for field-backed groupings
            // (quest/location/status/priority — the whole bucket is droppable)
            // and, in the date timeline, for the single-day buckets: Today,
            // Tomorrow, and Inbox ("No date" → clears the due date). Those emit
            // an encoded `date:<iso>` / `date:none` key the host turns into a
            // due date. Range buckets (This week, overdue, months) stay
            // non-droppable since they have no single unambiguous date.
            let droppable: boolean;
            let dropKey: string;
            if (fieldGrouped) {
              droppable = !b.anchor;
              dropKey = b.key;
            } else {
              const dd = this.dateBucketDrop(b.key, anchorDate);
              droppable = dd.droppable;
              dropKey = dd.key;
            }
            const isDropTarget =
              droppable &&
              this.draggingTaskId !== null &&
              this.dropBucketKey === dropKey;
            return (
              <section
                class={{
                  'task-list__bucket': true,
                  'task-list__bucket--archive': !!b.archive,
                  'task-list__bucket--anchor': !!b.anchor,
                  'task-list__bucket--drop': isDropTarget,
                }}
                data-bucket={dropKey}
                data-bucket-droppable={droppable ? '' : undefined}
              >
                {isDropTarget && (
                  <div class="task-list__drop-hint" aria-hidden="true">
                    Move to <strong>{b.label}</strong>
                  </div>
                )}
                {b.anchor ? (
                  <div
                    class="task-list__anchor"
                    ref={el => { this.anchorEl = el as HTMLElement; }}
                  >
                    <span class="task-list__anchor-pill">
                      <span class="task-list__anchor-dot" aria-hidden="true"></span>
                      Today
                      <span class="task-list__anchor-date">{anchorLabel}</span>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    class={{
                      'task-list__bucket-header': true,
                      'task-list__bucket-header--overdue': b.key === 'overdue',
                    }}
                    onClick={() => this.toggleBucket(b.key)}
                    aria-expanded={collapsed ? 'false' : 'true'}
                  >
                    <span class="task-list__bucket-label">{b.label}</span>
                    <span class="task-list__bucket-count">{b.tasks.length}</span>
                  </button>
                )}
                {!collapsed && b.tasks.length > 0 && (
                  <div class="task-list__bucket-items">
                    {b.tasks.map(this.renderTaskRow)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  render() {
    return this.mode === 'timeline' ? this.renderTimeline() : this.renderFlat();
  }
}

// ─────────────────── date helpers ───────────────────

function startOfDay(d: Date): Date {
  const out = new Date(d.getTime());
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + n);
  return startOfDay(out);
}

function endOfMonth(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return startOfDay(out);
}

/** Local YYYY-MM-DD for a Date (no UTC shift). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Move `taskId` before/after `targetId` within `order`, returning the new
 *  order. Returns null if the move is a no-op (already in place). */
function reorder(
  order: string[],
  taskId: string,
  targetId: string,
  before: boolean,
): string[] | null {
  const from = order.indexOf(taskId);
  if (from === -1) return null;
  const without = order.slice(0, from).concat(order.slice(from + 1));
  let target = without.indexOf(targetId);
  if (target === -1) return null;
  const insertAt = before ? target : target + 1;
  const next = without.slice(0, insertAt).concat(taskId, without.slice(insertAt));
  // No-op guard: same sequence.
  if (next.length === order.length && next.every((id, i) => id === order[i])) return null;
  return next;
}
