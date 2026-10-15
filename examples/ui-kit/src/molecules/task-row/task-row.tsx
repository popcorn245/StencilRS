import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'pop-task-row',
  encapsulation: { type: 'scoped' },
  styleUrl: 'task-row.css',
})
export class PopTaskRow {
  /** Task document ID */
  @Prop() taskId: string = '';

  /** Task title (named 'heading' to avoid conflict with HTML title attribute) */
  @Prop() heading: string = '';

  /** One of: open, in_progress, review, done, blocked, skipped, cancelled */
  @Prop() status: string = 'open';

  /** One of: urgent, high, medium, low */
  @Prop() priority: string = 'medium';

  /** ISO date string */
  @Prop() dueDate: string | null = null;

  /** Emoji of parent quest (displayed as chip) */
  @Prop() questEmoji: string | null = null;

  /** Title of parent quest */
  @Prop() questTitle: string | null = null;

  /** JSON array of assignee UIDs */
  @Prop() assignedTo: string = '[]';

  /** Inline error message to display */
  @Prop() error: string | null = null;

  /** Checkbox toggled (open<->done) */
  @Event({ composed: true, bubbles: true }) taskToggle: EventEmitter<{ taskId: string; newStatus: string }>;

  /** Row tapped — for future right-pane integration */
  @Event({ composed: true, bubbles: true }) taskSelect: EventEmitter<{ taskId: string }>;

  /** Ellipsis menu button tapped */
  @Event({ composed: true, bubbles: true }) taskMenu: EventEmitter<{ taskId: string }>;

  private get isDone(): boolean {
    return this.status === 'done' || this.status === 'cancelled' || this.status === 'skipped';
  }

  private get isOverdue(): boolean {
    if (!this.dueDate) return false;
    const due = new Date(this.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today && !this.isDone;
  }

  private get dueDateLabel(): string | null {
    if (!this.dueDate) return null;
    const d = new Date(this.dueDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private get priorityColor(): string {
    switch (this.priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#3b82f6';
      case 'low': return '#9ca3af';
      default: return '#9ca3af';
    }
  }

  private handleCheckClick = (e: MouseEvent) => {
    e.stopPropagation();
    const newStatus = this.isDone ? 'open' : 'done';
    this.taskToggle.emit({ taskId: this.taskId, newStatus });
  };

  private handleRowClick = () => {
    this.taskSelect.emit({ taskId: this.taskId });
  };

  private handleMenuClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.taskMenu.emit({ taskId: this.taskId });
  };

  render() {
    return (
      <div
        class={{
          'tr-root': true,
          'tr-done': this.isDone,
          'tr-overdue': this.isOverdue,
          'tr-error': !!this.error,
        }}
      >
        <div class="tr-row" onClick={this.handleRowClick}>
          <button
            class={{ 'tr-check': true, 'tr-check--done': this.isDone }}
            type="button"
            onClick={this.handleCheckClick}
            aria-label={this.isDone ? 'Mark incomplete' : 'Mark complete'}
          >
            {this.isDone ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
              </svg>
            )}
          </button>

          <span class={{ 'tr-title': true, 'tr-title--done': this.isDone }}>
            {this.heading}
          </span>

          {this.questEmoji && (
            <span class="tr-quest-chip" title={this.questTitle || ''}>
              {this.questEmoji}
              {this.questTitle && <span class="tr-quest-label">{this.questTitle}</span>}
            </span>
          )}

          <span class="tr-priority-dot" style={{ background: this.priorityColor }} title={this.priority} />

          {this.dueDateLabel && (
            <span class={{ 'tr-due': true, 'tr-due--overdue': this.isOverdue }}>
              {this.dueDateLabel}
            </span>
          )}

          <button
            class="tr-menu-btn"
            type="button"
            onClick={this.handleMenuClick}
            aria-label="Task menu"
          >
            <svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor">
              <circle cx="256" cy="96" r="32" />
              <circle cx="256" cy="256" r="32" />
              <circle cx="256" cy="416" r="32" />
            </svg>
          </button>
        </div>

        {this.error && (
          <div class="tr-error-msg">{this.error}</div>
        )}
      </div>
    );
  }
}
