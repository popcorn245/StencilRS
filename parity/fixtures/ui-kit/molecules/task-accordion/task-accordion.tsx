import { Component, h, Prop, State, Event, EventEmitter } from '@stencil/core';

interface QuestOption {
  id: string;
  emoji: string;
  title: string;
}

interface MemberOption {
  uid: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: '#9ca3af' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'review', label: 'Review', color: '#8b5cf6' },
  { value: 'done', label: 'Done', color: '#22c55e' },
  { value: 'blocked', label: 'Blocked', color: '#ef4444' },
  { value: 'skipped', label: 'Skipped', color: '#eab308' },
  { value: 'cancelled', label: 'Cancelled', color: '#6b7280' },
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'medium', label: 'Medium', color: '#3b82f6' },
  { value: 'low', label: 'Low', color: '#9ca3af' },
];

@Component({
  tag: 'pop-task-accordion',
  encapsulation: { type: 'scoped' },
  styleUrl: 'task-accordion.css',
})
export class PopTaskAccordion {
  /** Task document ID */
  @Prop() taskId: string = '';

  /** Current title (named 'heading' to avoid conflict with HTML title attribute) */
  @Prop() heading: string = '';

  /** Current status */
  @Prop() status: string = 'open';

  /** Current priority */
  @Prop() priority: string = 'medium';

  /** ISO date */
  @Prop() dueDate: string | null = null;

  /** Current quest ID */
  @Prop() questId: string | null = null;

  /** JSON array of {id, emoji, title} for quest picker */
  @Prop() quests: string = '[]';

  /** JSON array of assignee UIDs */
  @Prop() assignedTo: string = '[]';

  /** JSON array of {uid, name} for assignee picker */
  @Prop() members: string = '[]';

  /** Linked note ID */
  @Prop() noteId: string | null = null;

  /** Any field changed (auto-save trigger) */
  @Event({ composed: true, bubbles: true }) taskUpdate: EventEmitter<{ taskId: string; field: string; value: any }>;

  /** Delete button pressed */
  @Event({ composed: true, bubbles: true }) taskDelete: EventEmitter<{ taskId: string }>;

  @State() localTitle: string = '';

  private parsedQuests: QuestOption[] = [];
  private parsedMembers: MemberOption[] = [];
  private parsedAssignedTo: string[] = [];

  componentWillLoad() {
    this.localTitle = this.heading;
    this.parseProps();
  }

  componentWillUpdate() {
    this.parseProps();
  }

  private parseProps() {
    try { this.parsedQuests = JSON.parse(this.quests); } catch { this.parsedQuests = []; }
    try { this.parsedMembers = JSON.parse(this.members); } catch { this.parsedMembers = []; }
    try { this.parsedAssignedTo = JSON.parse(this.assignedTo); } catch { this.parsedAssignedTo = []; }
  }

  private emitUpdate(field: string, value: any) {
    this.taskUpdate.emit({ taskId: this.taskId, field, value });
  }

  private handleTitleBlur = () => {
    const trimmed = this.localTitle.trim();
    if (trimmed && trimmed !== this.heading) {
      this.emitUpdate('title', trimmed);
    }
  };

  private handleStatusClick = (value: string) => {
    if (value !== this.status) {
      this.emitUpdate('status', value);
    }
  };

  private handlePriorityClick = (value: string) => {
    if (value !== this.priority) {
      this.emitUpdate('priority', value);
    }
  };

  private handleDueDateChange = (e: Event) => {
    const val = (e.target as HTMLInputElement).value || null;
    this.emitUpdate('dueDate', val);
  };

  private handleQuestChange = (e: Event) => {
    const val = (e.target as HTMLSelectElement).value || null;
    this.emitUpdate('questId', val);
  };

  private handleAssigneeToggle = (uid: string) => {
    const current = [...this.parsedAssignedTo];
    const idx = current.indexOf(uid);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(uid);
    }
    this.emitUpdate('assignedTo', current);
  };

  private handleDelete = () => {
    this.taskDelete.emit({ taskId: this.taskId });
  };

  render() {
    return (
      <div class="ta-root">
        {/* Title */}
        <div class="ta-field">
          <label class="ta-label">Title</label>
          <input
            type="text"
            class="ta-input"
            value={this.localTitle}
            onInput={(e: Event) => { this.localTitle = (e.target as HTMLInputElement).value; }}
            onBlur={this.handleTitleBlur}
          />
        </div>

        {/* Status chips */}
        <div class="ta-field">
          <label class="ta-label">Status</label>
          <div class="ta-chips">
            {STATUS_OPTIONS.map(opt => (
              <button
                type="button"
                class={{ 'ta-chip': true, 'ta-chip--active': this.status === opt.value }}
                style={{ '--chip-color': opt.color } as any}
                onClick={() => this.handleStatusClick(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority chips */}
        <div class="ta-field">
          <label class="ta-label">Priority</label>
          <div class="ta-chips">
            {PRIORITY_OPTIONS.map(opt => (
              <button
                type="button"
                class={{ 'ta-chip': true, 'ta-chip--active': this.priority === opt.value }}
                style={{ '--chip-color': opt.color } as any}
                onClick={() => this.handlePriorityClick(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div class="ta-field">
          <label class="ta-label">Due date</label>
          <input
            type="date"
            class="ta-input"
            value={this.dueDate || ''}
            onChange={this.handleDueDateChange}
          />
        </div>

        {/* Quest picker */}
        {this.parsedQuests.length > 0 && (
          <div class="ta-field">
            <label class="ta-label">Quest</label>
            <select class="ta-input" onChange={this.handleQuestChange}>
              <option value="" selected={!this.questId}>Inbox (no quest)</option>
              {this.parsedQuests.map(q => (
                <option value={q.id} selected={this.questId === q.id}>
                  {q.emoji} {q.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Assignee */}
        {this.parsedMembers.length > 0 && (
          <div class="ta-field">
            <label class="ta-label">Assignee</label>
            <div class="ta-assignees">
              {this.parsedMembers.map(m => (
                <label class="ta-assignee-option">
                  <input
                    type="checkbox"
                    checked={this.parsedAssignedTo.includes(m.uid)}
                    onChange={() => this.handleAssigneeToggle(m.uid)}
                  />
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Note link */}
        <div class="ta-field">
          <label class="ta-label">Note</label>
          {this.noteId ? (
            <a href={`/notes/${this.noteId}`} class="ta-note-link">View linked note</a>
          ) : (
            <span class="ta-note-empty">No note linked</span>
          )}
        </div>

        {/* Delete */}
        <button type="button" class="ta-delete-btn" onClick={this.handleDelete}>
          Delete Task
        </button>
      </div>
    );
  }
}
