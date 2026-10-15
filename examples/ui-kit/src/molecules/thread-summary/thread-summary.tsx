import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'pop-thread-summary',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-summary.css',
})
export class PopThreadSummary {
  @Prop() messageId: string = '';
  @Prop() threadCount: number = 0;
  @Prop() threadPreview: string = '';
  @Prop() threadAvatarUrl: string = '';
  @Prop() threadLastAt: number = 0;

  @Event() popThreadOpened: EventEmitter<{ id: string }>;

  private formatShortTime(ts: number): string {
    if (!ts) return '';
    const date = new Date(ts);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  render() {
    if (this.threadCount <= 0) return null;

    return (
      <div class="mb-thread-summary" onClick={() => this.popThreadOpened.emit({ id: this.messageId })}>
        <div class="mb-thread-spine" />
        <div class="mb-thread-info">
          {this.threadAvatarUrl && (
            <img src={this.threadAvatarUrl} alt="" class="mb-thread-avatar" />
          )}
          <span class="mb-thread-preview">{this.threadPreview || 'Thread reply...'}</span>
          {this.threadLastAt > 0 && (
            <span class="mb-thread-time">{this.formatShortTime(this.threadLastAt)}</span>
          )}
        </div>
      </div>
    );
  }
}
