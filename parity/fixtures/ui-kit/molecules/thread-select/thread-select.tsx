import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

/** A thread a panel can post into. `daily` threads are the per-day threads. */
export interface ThreadOption {
  id: string;
  title: string;
  kind: 'daily' | 'topic';
}

/** Detail of `popThreadChange`. */
export interface ThreadChangeDetail {
  threadId: string;
}

/**
 * pop-thread-select — "Post to <thread>" picker.
 *
 * A panel uses this to choose which thread its output lands in. The component is
 * STATELESS: it stores nothing and remembers nothing. The HOST persists the
 * choice per `(uid, panelId)` and feeds it back as `value`.
 *
 * With `showToday` the daily threads are pinned above the topic threads, because
 * "post it into today" is the overwhelmingly common answer.
 */
@Component({
  tag: 'pop-thread-select',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-select.css',
})
export class PopThreadSelect {
  /** Threads the user may post into. */
  @Prop() threads: ThreadOption[] = [];
  /** The currently selected thread id. */
  @Prop() value = '';
  /** Pin the daily ("Today") threads above the topic threads. */
  @Prop() showToday = true;
  @Prop() disabled = false;
  /** Visible label for the control. */
  @Prop() label = 'Post to';

  /** Emitted with the newly-picked thread id. The HOST persists it. */
  @Event({ composed: true, bubbles: true }) popThreadChange!: EventEmitter<ThreadChangeDetail>;

  private options(): ThreadOption[] {
    const list = Array.isArray(this.threads) ? this.threads.filter((t) => t && t.id) : [];
    if (!this.showToday) return list;
    // Stable partition: dailies first, everything else in the given order.
    return [...list.filter((t) => t.kind === 'daily'), ...list.filter((t) => t.kind !== 'daily')];
  }

  private onChange = (ev: Event) => {
    const threadId = (ev.target as HTMLSelectElement).value;
    if (!threadId) return;
    this.popThreadChange.emit({ threadId });
  };

  render() {
    const options = this.options();
    const empty = options.length === 0;
    const daily = options.filter((t) => t.kind === 'daily');
    const topics = options.filter((t) => t.kind !== 'daily');
    const grouped = this.showToday && daily.length > 0 && topics.length > 0;

    return (
      <label class="tsel">
        <span class="tsel__label">{this.label}</span>
        <select
          class="tsel__select"
          disabled={this.disabled || empty}
          aria-label={this.label}
          onChange={this.onChange}
        >
          {empty ? (
            <option value="">No threads yet</option>
          ) : grouped ? (
            [
              <optgroup label="Today">
                {daily.map((t) => (
                  <option key={t.id} value={t.id} selected={t.id === this.value}>
                    {t.title}
                  </option>
                ))}
              </optgroup>,
              <optgroup label="Topics">
                {topics.map((t) => (
                  <option key={t.id} value={t.id} selected={t.id === this.value}>
                    {t.title}
                  </option>
                ))}
              </optgroup>,
            ]
          ) : (
            options.map((t) => (
              <option key={t.id} value={t.id} selected={t.id === this.value}>
                {t.title}
              </option>
            ))
          )}
        </select>
      </label>
    );
  }
}
