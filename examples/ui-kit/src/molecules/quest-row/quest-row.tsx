import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'pop-quest-row',
  encapsulation: { type: 'scoped' },
  styleUrl: 'quest-row.css',
})
export class PopQuestRow {
  /** Quest document ID */
  @Prop() questId: string = '';

  /** Quest emoji */
  @Prop() emoji: string = '';

  /** Quest title (named 'heading' to avoid conflict with HTML title attribute) */
  @Prop() heading: string = '';

  /** Completed task count */
  @Prop() tasksCompleted: number = 0;

  /** Total task count */
  @Prop() tasksTotal: number = 0;

  /** Priority level */
  @Prop() priority: string = '';

  /** Row tapped, navigate to quest detail */
  @Event({ composed: true, bubbles: true }) questSelect: EventEmitter<{ questId: string }>;

  private get progressPercent(): number {
    if (this.tasksTotal === 0) return 0;
    return Math.round((this.tasksCompleted / this.tasksTotal) * 100);
  }

  private get priorityBorderColor(): string {
    switch (this.priority) {
      case 'high':
      case 'urgent':
        return '#ef4444';
      case 'medium':
        return '#f97316';
      default:
        return 'var(--pico-muted-border-color)';
    }
  }

  private handleClick = () => {
    this.questSelect.emit({ questId: this.questId });
  };

  render() {
    const pct = this.progressPercent;

    return (
      <div
        class="qr-root"
        role="button"
        tabIndex={0}
        onClick={this.handleClick}
        onKeyDown={(e) => e.key === 'Enter' && this.handleClick()}
        style={{ borderLeftColor: this.priorityBorderColor }}
      >
        <span class="qr-emoji">{this.emoji}</span>
        <span class="qr-title">{this.heading}</span>
        <div class="qr-progress">
          <div class="qr-progress-bar">
            <div
              class={{ 'qr-progress-fill': true, 'qr-progress-fill--done': pct === 100 }}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span class="qr-count">{this.tasksCompleted}/{this.tasksTotal}</span>
        </div>
      </div>
    );
  }
}
