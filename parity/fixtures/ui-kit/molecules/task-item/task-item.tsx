import { Component, h, Prop, Event, EventEmitter, State, Element } from '@stencil/core';

@Component({
  tag: 'pop-task-item',
  encapsulation: { type: 'scoped' },
  styleUrl: 'task-item.css',
})
export class PopTaskItem {
  @Element() el!: HTMLElement;

  /** Firestore task document ID */
  @Prop() taskId: string = '';

  /** Task title text */
  @Prop({ mutable: true }) taskTitle: string = '';

  /** Task status */
  @Prop({ mutable: true }) status: string = 'open';

  /** Priority: urgent, high, medium, low */
  @Prop({ mutable: true }) priority: string = 'medium';

  /** ISO date string (YYYY-MM-DD) */
  @Prop({ mutable: true }) dueDate: string | null = null;

  /** ISO timestamp — fire time of a reminder/timer. Shown as a time pill (⏰)
   *  when the task has no due date (a one-off transient nudge). */
  @Prop({ mutable: true }) reminderAt: string | null = null;

  /** JSON stringified array of user UIDs */
  @Prop({ mutable: true }) assignedTo: string = '[]';

  /** Whether the task is checked (derived from status === 'done') */
  @Prop({ mutable: true }) checked: boolean = false;

  /** If true, disables title editing (contenteditable / long-press / dblclick).
   *  Does NOT disable the completion checkbox — see `checkable`. */
  @Prop() readonly: boolean = false;

  /** Whether the completion checkbox can be toggled. Defaults to true so a
   *  list row stays `readonly` (title locked) yet still lets you tap to
   *  complete. Set false for a fully static render (e.g. read-only editor). */
  @Prop() checkable: boolean = true;

  /** JSON stringified array of { id, displayName, photoURL } for avatar rendering */
  @Prop() users: string = '[]';

  /** The logged-in user's id. Their own avatar is hidden (you don't need to see
   *  yourself on every task) — the assignee avatar only shows OTHER people. */
  @Prop() currentUserId: string = '';

  /** Suppress the assignee avatar+name chip. Useful when the surrounding list is
   *  already grouped by person (e.g. the tasks-app Family view), where a per-row
   *  assignee chip would be redundant. */
  @Prop() hideAssignee: boolean = false;

  /** Optional quest title — rendered as a small chip so you can see which
   *  quest a task belongs to (empty = no chip). */
  @Prop() questLabel: string = '';

  /** JSON stringified array of tag strings — rendered as `#tag` chips in the
   *  meta row (empty array = no chips). */
  @Prop() tags: string = '[]';

  /** Presentational thread label — a teal chip shown when a task is linked to a
   *  Bucket-Bot hub thread. Empty (default) hides it. Phase-1 hook only: the
   *  Share-to-Thread phase will populate this from the linked-thread field. */
  @Prop() threadLabel: string = '';

  /** Whether to render the right-edge drag handle. The parent list gates this
   *  so handles only appear when a drag actually does something — i.e. when a
   *  grouping is active (drag-to-regroup) or the sort is Manual (drag-to-reorder).
   *  Defaults to true so standalone/legacy consumers keep the handle. */
  @Prop() dragHandle: boolean = true;

  /** A task property was changed */
  @Event({ composed: true, bubbles: true }) taskChanged: EventEmitter<{ taskId: string; field: string; value: any }>;

  /** Checkbox was toggled */
  @Event({ composed: true, bubbles: true }) taskChecked: EventEmitter<{ taskId: string; checked: boolean }>;

  /** Task was deleted */
  @Event({ composed: true, bubbles: true }) taskDeleted: EventEmitter<{ taskId: string }>;

  /** The drag handle was pressed — the parent list starts a pointer drag. The
   *  pointer info lets the list build a ghost + track the move without the row
   *  itself owning any drag geometry. */
  @Event({ composed: true, bubbles: true }) taskDragHandleDown: EventEmitter<{
    taskId: string;
    pointerId: number;
    clientX: number;
    clientY: number;
  }>;

  @State() isEditing: boolean = false;
  private pressTimer: number | null = null;

  private titleRef: HTMLElement | null = null;

  private get parsedUsers(): { id: string; displayName?: string; email?: string; photoURL?: string }[] {
    try { return JSON.parse(this.users); } catch { return []; }
  }

  private get parsedAssignedTo(): string[] {
    try { return JSON.parse(this.assignedTo); } catch { return []; }
  }

  private get parsedTags(): string[] {
    try {
      const arr = JSON.parse(this.tags);
      return Array.isArray(arr) ? arr.filter((t) => typeof t === 'string' && t) : [];
    } catch { return []; }
  }

  private get isDone(): boolean {
    return this.status === 'done';
  }

  /** Parse the due date to a local Date, or null. Handles both a bare
   *  'YYYY-MM-DD' (local midnight) and a full ISO timestamp. */
  private get dueDateObj(): Date | null {
    if (!this.dueDate) return null;
    const raw = this.dueDate.includes('T') ? this.dueDate : this.dueDate + 'T00:00:00';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  private get isOverdue(): boolean {
    const d = this.dueDateObj;
    if (!d) return false;
    return d < new Date() && !this.isDone && !this.isToday;
  }

  /** True when the due date falls on today's calendar day. */
  private get isToday(): boolean {
    const d = this.dueDateObj;
    if (!d) return false;
    return d.toDateString() === new Date().toDateString();
  }

  /** Priority → a modifier class for the coloured dot (urgent/high/med/low). */
  private get priorityClass(): string {
    switch (this.priority) {
      case 'urgent': return 'task-item__pri--urgent';
      case 'high': return 'task-item__pri--high';
      case 'low': return 'task-item__pri--low';
      default: return 'task-item__pri--med';
    }
  }

  private get formattedDate(): string {
    const d = this.dueDateObj;
    if (!d) return '';
    // Whole-day difference between the due day and today (ignores time-of-day).
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dayMs = 86400000;
    const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / dayMs);
    const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0);
    const time = hasTime
      ? ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined as any }).replace(':00', '')
      : '';
    if (diff === 0) return `Today${time}`;
    if (diff === 1) return `Tomorrow${time}`;
    if (diff === -1) return 'Yesterday';
    if (diff < -1) return `${-diff} days ago`;
    if (diff > 1 && diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' }) + time;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + time;
  }

  /** True when this row represents a reminder/timer with no due date. */
  private get isReminder(): boolean {
    return !this.dueDate && !!this.reminderAt;
  }

  /** Reminder fire time — just the time if it's today, else date + time. */
  private get formattedReminder(): string {
    if (!this.reminderAt) return '';
    const d = new Date(this.reminderAt);
    if (isNaN(d.getTime())) return '';
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay
      ? time
      : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
  }

  private handleCheckToggle = (e?: MouseEvent) => {
    if (!this.checkable) return;
    // The row is wrapped in a navigating <a>; keep a checkbox tap from also
    // bubbling up and opening the detail view.
    e?.stopPropagation();
    e?.preventDefault();
    const newChecked = !this.isDone;
    const newStatus = newChecked ? 'done' : 'open';
    this.checked = newChecked;
    this.status = newStatus;
    this.taskChecked.emit({ taskId: this.taskId, checked: newChecked });
    this.taskChanged.emit({ taskId: this.taskId, field: 'status', value: newStatus });
  };

  private handleTitleBlur = () => {
    if (!this.titleRef) return;
    const newTitle = this.titleRef.textContent?.trim() || '';
    if (newTitle !== this.taskTitle) {
      this.taskTitle = newTitle;
      this.taskChanged.emit({ taskId: this.taskId, field: 'title', value: newTitle });
    }
    this.isEditing = false;
  };

  private handleTitleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.titleRef?.blur();
    }
    if (e.key === 'Backspace' && !this.titleRef?.textContent?.trim()) {
      e.preventDefault();
      if (window.confirm('Delete this task?')) {
        this.taskDeleted.emit({ taskId: this.taskId });
      }
    }
  };

  /** Tap-hold (long-press) → enter edit mode. Single tap stays uncaptured
   *  so the parent row's onClick navigates normally. Cancels on
   *  pointer-up, leave, or cancel (sloppy press = no edit). Desktop users
   *  get the same affordance via double-click. */
  private startPress = (e: PointerEvent) => {
    if (this.readonly || this.isEditing) return;
    if (e.button !== undefined && e.button !== 0) return; // ignore right/middle
    this.cancelPress();
    this.pressTimer = window.setTimeout(() => {
      this.pressTimer = null;
      this.enterEditMode();
    }, 450);
  };

  private cancelPress = () => {
    if (this.pressTimer !== null) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  };

  private handleTitleDblClick = (e: MouseEvent) => {
    if (this.readonly || this.isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    this.enterEditMode();
  };

  /** Drag handle pressed → hand off to the parent list (which owns bucket +
   *  map geometry). Stop propagation so the press doesn't also navigate / enter
   *  edit mode. */
  private onHandleDown = (e: PointerEvent) => {
    if (e.button !== undefined && e.button > 0) return;
    e.stopPropagation();
    e.preventDefault();
    this.taskDragHandleDown.emit({
      taskId: this.taskId,
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  private enterEditMode = () => {
    this.isEditing = true;
    requestAnimationFrame(() => {
      this.titleRef?.focus();
      const sel = window.getSelection();
      if (sel && this.titleRef) {
        const range = document.createRange();
        range.selectNodeContents(this.titleRef);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  };

  componentDidLoad() {
    // no-op
  }

  render() {
    const users = this.parsedUsers;
    // Only surface OTHER assignees — hide the avatar when the task is unassigned
    // or assigned (only) to the logged-in user.
    const assignedUsers = this.parsedAssignedTo.filter(
      (uid) => uid && uid !== this.currentUserId,
    );

    const tags = this.parsedTags;
    const hasMeta =
      !!this.dueDate || this.isReminder || !!this.questLabel || !!this.threadLabel ||
      tags.length > 0 || assignedUsers.length > 0;

    return (
      <div class={`task-item ${this.isDone ? 'task-item--done' : ''}`}>
        {/* Completion checkbox — a resting-contrast affordance (see CSS). */}
        <button
          type="button"
          class={`task-item__check ${this.isDone ? 'task-item__check--on' : ''}`}
          onClick={(e: MouseEvent) => this.handleCheckToggle(e)}
          disabled={!this.checkable}
          aria-label={this.isDone ? 'Mark incomplete' : 'Mark complete'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M20 6 9 17l-5-5" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        {/* Priority dot — always rendered; colour driven by `priority`. */}
        <span
          class={`task-item__pri ${this.priorityClass}`}
          aria-hidden="true"
          title={`Priority: ${this.priority}`}
        ></span>

        {/* Body: title on top, a meta row of chips beneath. */}
        <div class="task-item__body">
          {/* Title — plain text by default. Long-press (mobile) or double-click
              (desktop) enters edit mode. Single tap propagates to the parent
              row so navigation works. */}
          <div
            class={{
              'task-item__title': true,
              'task-item__title--done': this.isDone,
              'task-item__title--editing': this.isEditing,
            }}
            contentEditable={this.isEditing && !this.readonly}
            ref={el => this.titleRef = el}
            onBlur={this.handleTitleBlur}
            onKeyDown={this.handleTitleKeydown}
            onPointerDown={this.startPress}
            onPointerUp={this.cancelPress}
            onPointerCancel={this.cancelPress}
            onPointerLeave={this.cancelPress}
            onDblClick={this.handleTitleDblClick}
          >
            {/* Rendered as an escaped text node (NOT innerHTML) — task titles
                come from Firestore / the bot (SMS, screenshots) and must never
                execute as HTML. Editing reads textContent back on blur. */}
            {this.taskTitle}
          </div>

          {hasMeta && (
            <div class="task-item__meta">
              {/* Due chip — colour-coded: overdue red, today amber, else neutral. */}
              {this.dueDate && (
                <span
                  class={{
                    'task-item__chip': true,
                    'task-item__chip--due': true,
                    'task-item__chip--overdue': this.isOverdue,
                    'task-item__chip--today': this.isToday && !this.isOverdue,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
                  </svg>
                  {this.formattedDate}
                </span>
              )}

              {/* Reminder/timer fire time (one-off with no due date). */}
              {this.isReminder && (
                <span class="task-item__chip task-item__chip--reminder">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
                  </svg>
                  {this.formattedReminder}
                </span>
              )}

              {/* Quest badge (violet). */}
              {this.questLabel && (
                <span class="task-item__chip task-item__chip--quest" title={`Quest: ${this.questLabel}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
                    <path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 22.3 7 19.9l1-5.8L3.8 10l5.8-.8z"/>
                  </svg>
                  <span class="task-item__chip-label">{this.questLabel}</span>
                </span>
              )}

              {/* Thread chip (teal) — presentational hook for Share-to-Thread. */}
              {this.threadLabel && (
                <span class="task-item__chip task-item__chip--thread" title={`Thread: ${this.threadLabel}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
                    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.6A8 8 0 1 1 21 12z"/>
                  </svg>
                  <span class="task-item__chip-label">{this.threadLabel}</span>
                </span>
              )}

              {/* Tag chips. */}
              {tags.slice(0, 3).map((tag) => (
                <span class="task-item__chip task-item__chip--tag">{tag}</span>
              ))}

              {/* Assignee — avatar + name (other people only). Suppressed when
                  the list is grouped by person (hideAssignee). */}
              {!this.hideAssignee && assignedUsers.length > 0 && (() => {
                const uid = assignedUsers[0];
                const user = users.find(u => u.id === uid);
                // Prefer the resolved display name; if the uid has no roster
                // entry, fall back to a short uid stub (not the word "Assignee").
                const resolved = user?.displayName || user?.email || '';
                const name = resolved || `${uid.slice(0, 6)}…`;
                const initials = (resolved || uid).split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const extra = assignedUsers.length - 1;
                return (
                  <span class="task-item__assignee">
                    {user?.photoURL
                      ? <img class="task-item__assignee-av" src={user.photoURL} alt="" />
                      : <span class="task-item__assignee-av task-item__assignee-av--initials">{initials}</span>}
                    <span class="task-item__assignee-name">{name}{extra > 0 ? ` +${extra}` : ''}</span>
                  </span>
                );
              })()}
            </div>
          )}

          {/* Slot for additional actions (host-supplied). */}
          <slot name="actions" />
        </div>

        {/* Drag handle (right edge). Initiates a drag to re-bucket / reorder /
            move to a map room. Gated by `dragHandle` so it only shows when a
            drag is meaningful (grouping active or Manual sort). A normal
            tap/click elsewhere on the row still opens the task. */}
        {this.dragHandle && (
        <button
          type="button"
          class="task-item__drag-handle"
          aria-label="Drag to move task"
          title="Drag to move"
          onPointerDown={this.onHandleDown}
          onClick={(e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {/* ionicon: reorder-three-outline (packages/ui-kit/src/assets/svg) */}
          <svg width="18" height="18" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="36" aria-hidden="true">
            <line x1="96" y1="176" x2="416" y2="176" />
            <line x1="96" y1="256" x2="416" y2="256" />
            <line x1="96" y1="336" x2="416" y2="336" />
          </svg>
        </button>
        )}
      </div>
    );
  }
}
