import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'pop-quest-card',
  encapsulation: { type: 'scoped' },
  styleUrl: 'quest-card.css',
})
export class PopQuestCard {
  /** Quest ID */
  @Prop() questId: string = '';

  /** Display emoji for the quest */
  @Prop() emoji: string = '🗺️';

  /** Quest title */
  @Prop() heading: string = '';

  /** Status: active | paused | completed | archived */
  @Prop() status: 'active' | 'paused' | 'completed' | 'archived' = 'active';

  /** Has an associated research session (shows 🔬 badge) */
  @Prop() hasResearch: boolean = false;

  /** Number of completed tasks */
  @Prop() tasksCompleted: number = 0;

  /** Total number of tasks */
  @Prop() tasksTotal: number = 0;

  /** Number of completed events (past events count as done) */
  @Prop() eventsCompleted: number = 0;

  /** Total number of events */
  @Prop() eventsTotal: number = 0;

  /** Optional priority: high | medium | low */
  @Prop() priority: 'high' | 'medium' | 'low' | '' = '';

  /** Emitted when the card is clicked */
  @Event({ composed: true, bubbles: true }) questSelect: EventEmitter<string>;

  private get progress(): number {
    const total = this.tasksTotal + this.eventsTotal;
    if (total === 0) return 0;
    return (this.tasksCompleted + this.eventsCompleted) / total;
  }

  private get progressPercent(): number {
    return Math.round(this.progress * 100);
  }

  private get isComplete(): boolean {
    return this.status === 'completed';
  }

  private get allTasksDone(): boolean {
    return this.tasksTotal > 0 && this.tasksCompleted >= this.tasksTotal
      && this.eventsCompleted >= this.eventsTotal;
  }

  render() {
    const pct = this.progressPercent;

    return (
      <div
        class={{
          'qc-root': true,
          [`qc-status--${this.status}`]: true,
          [`qc-priority--${this.priority}`]: !!this.priority,
          'qc-all-done': this.allTasksDone,
        }}
        role="button"
        tabIndex={0}
        onClick={() => this.questSelect.emit(this.questId)}
        onKeyDown={(e) => e.key === 'Enter' && this.questSelect.emit(this.questId)}
      >
        {/* Emoji + badges row */}
        <div class="qc-top">
          <span class="qc-emoji">{this.emoji}</span>
          <div class="qc-badges">
            {this.hasResearch && <span class="qc-badge qc-badge--research" title="Has research session">🔬</span>}
            {this.priority === 'high' && <span class="qc-badge qc-badge--priority" title="High priority">!</span>}
            {this.isComplete && <span class="qc-badge qc-badge--done" title="Completed">✓</span>}
          </div>
        </div>

        {/* Title */}
        <div class="qc-title">{this.heading}</div>

        {/* Progress */}
        {(this.tasksTotal > 0 || this.eventsTotal > 0) && (
          <div class="qc-progress-area">
            <div class="qc-progress-bar">
              <div class="qc-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div class="qc-progress-label">
              {this.allTasksDone ? (
                <span class="qc-all-done-label">All done!</span>
              ) : (
                <span>{pct}%</span>
              )}
              <span class="qc-progress-detail">
                {this.tasksCompleted}/{this.tasksTotal} tasks
                {this.eventsTotal > 0 && ` · ${this.eventsCompleted}/${this.eventsTotal} events`}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
}
