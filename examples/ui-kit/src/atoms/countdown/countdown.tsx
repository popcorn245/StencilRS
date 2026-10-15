import { Component, Prop, State, Event, EventEmitter, Watch, h } from '@stencil/core';

/**
 * pop-countdown — a ticking H/M/S countdown to a deadline (atom).
 *
 * Built for the hub Reminders panel header ("next: ⏰ Call mom in 1h 02m 05s")
 * but deliberately generic: give it a `deadline` (epoch ms, LOCAL clock) and it
 * re-renders every second, emits `popCountdownDone` ONCE when the deadline is
 * crossed while mounted, and shows an overdue face after that.
 *
 * Clock-skew note: callers who get their deadline from a server should convert
 * it to local-clock terms FIRST (localNow + (serverTarget - serverNow)) and
 * pass that — this atom never interprets absolute server time.
 *
 *   <pop-countdown deadline={msEpoch} label="Call mom" />
 *
 * The interval is cleared in disconnectedCallback; changing `deadline` re-arms
 * the done latch (a snooze that pushes the deadline out counts down again).
 */
@Component({
  tag: 'pop-countdown',
  encapsulation: { type: 'scoped' },
  styleUrl: 'countdown.css',
})
export class PopCountdown {
  /** Target instant — epoch MILLISECONDS on the local clock. null/0 = idle. */
  @Prop() deadline?: number;
  /** Optional label rendered before the time ("Call mom — 1h 02m 05s"). */
  @Prop() label?: string;
  /** Text when there is no deadline ("No upcoming reminders"). */
  @Prop() idleText = '';
  /** Text prefix once the deadline passes (the time keeps counting UP). */
  @Prop() overdueText = 'now';

  /** Re-render tick (1 Hz while a deadline is set). */
  @State() nowMs = Date.now();

  /** Fired ONCE when the deadline crosses ≤0 while mounted (re-armed when the
   *  deadline changes — e.g. after a snooze). */
  @Event() popCountdownDone!: EventEmitter<{ deadline: number }>;

  private timer?: ReturnType<typeof setInterval>;
  private fired = false;

  connectedCallback() {
    this.start();
  }

  disconnectedCallback() {
    this.stop();
  }

  @Watch('deadline')
  onDeadlineChange() {
    this.fired = false; // a new/pushed-out deadline arms the latch again
    this.nowMs = Date.now();
    this.start();
  }

  private start() {
    this.stop();
    if (!this.deadline) return;
    this.timer = setInterval(() => {
      this.nowMs = Date.now();
      if (!this.fired && this.deadline && this.nowMs >= this.deadline) {
        this.fired = true;
        this.popCountdownDone.emit({ deadline: this.deadline });
      }
    }, 1000);
  }

  private stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** "1h 02m 05s" / "4m 09s" / "32s" — compact, zero-padded after the first unit. */
  private static face(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  }

  render() {
    if (!this.deadline) {
      return this.idleText ? <span class="cd cd--idle">{this.idleText}</span> : null;
    }
    const remaining = this.deadline - this.nowMs;
    const overdue = remaining < 0;
    const time = PopCountdown.face(Math.abs(remaining));
    return (
      <span class={{ cd: true, 'cd--overdue': overdue }} role="timer" aria-live="off">
        {this.label && <span class="cd__label">{this.label}</span>}
        <span class="cd__time">{overdue ? `${this.overdueText} · ${time} ago` : `in ${time}`}</span>
      </span>
    );
  }
}
