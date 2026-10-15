import { Component, h, Prop, Watch, State } from '@stencil/core';

@Component({
  tag: 'pop-popcoin-counter',
  encapsulation: { type: 'scoped' },
  styleUrl: 'popcoin-counter.css',
})
export class PopPopcoinCounter {
  /** Current balance */
  @Prop() balance: number = 0;

  /** Previous balance — used to detect change direction */
  @Prop() previousBalance: number = 0;

  /** Milestone thresholds that trigger confetti (comma-separated) */
  @Prop() milestones: string = '100,250,500,1000';

  /** Display format: 'full' shows label, 'compact' shows icon + number */
  @Prop() format: 'full' | 'compact' = 'compact';

  /** Currency icon. Defaults to the Popcoin coin 🪙 (the household currency emoji). */
  @Prop() icon: string = '🪙';

  @State() displayValue: number = 0;
  @State() delta: number = 0;
  @State() showDelta: boolean = false;
  @State() confetti: Array<{ id: number; x: number; color: string; delay: number }> = [];

  private animRaf?: number;
  private deltaTimeout?: any;
  private confettiId: number = 0;

  componentWillLoad() {
    this.displayValue = this.balance;
  }

  @Watch('balance')
  onBalanceChange(newVal: number, oldVal: number) {
    this.animateToValue(oldVal, newVal);
    this.delta = newVal - oldVal;
    this.showDelta = true;
    clearTimeout(this.deltaTimeout);
    this.deltaTimeout = setTimeout(() => (this.showDelta = false), 2000);

    if (this.isAtMilestone(newVal)) {
      this.triggerConfetti();
    }
  }

  private isAtMilestone(val: number): boolean {
    const milestones = this.milestones.split(',').map(Number);
    return milestones.includes(val) || (milestones.some((m) => val >= m && (this.previousBalance || 0) < m));
  }

  private animateToValue(from: number, to: number) {
    if (this.animRaf) cancelAnimationFrame(this.animRaf);
    const duration = Math.min(800, Math.abs(to - from) * 10);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      this.displayValue = Math.round(from + (to - from) * ease);
      if (t < 1) {
        this.animRaf = requestAnimationFrame(tick);
      }
    };
    this.animRaf = requestAnimationFrame(tick);
  }

  private triggerConfetti() {
    const colors = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899'];
    const pieces = Array.from({ length: 16 }, (_, i) => ({
      id: this.confettiId++,
      x: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 400,
    }));
    this.confetti = pieces;
    setTimeout(() => (this.confetti = []), 2000);
  }

  disconnectedCallback() {
    if (this.animRaf) cancelAnimationFrame(this.animRaf);
    clearTimeout(this.deltaTimeout);
  }

  render() {
    const sign = this.delta >= 0 ? '+' : '';
    const isCompact = this.format === 'compact';

    return (
      <div class={`pc-root pc-format--${this.format}`}>
        {/* Confetti */}
        {this.confetti.map((c) => (
          <div
            key={c.id}
            class="pc-confetti-piece"
            style={{
              left: `${c.x}%`,
              background: c.color,
              animationDelay: `${c.delay}ms`,
            }}
          />
        ))}

        {/* Coin icon (🪙 by default — the household currency emoji) */}
        <span class="pc-icon" aria-hidden="true">{this.icon}</span>

        {/* Value */}
        <span class="pc-value" aria-label={`${this.displayValue} Popcoins`}>
          {this.displayValue.toLocaleString()}
        </span>

        {!isCompact && <span class="pc-label">Popcoins</span>}

        {/* Delta badge */}
        {this.showDelta && this.delta !== 0 && (
          <span class={`pc-delta ${this.delta > 0 ? 'pc-delta--gain' : 'pc-delta--loss'}`}>
            {sign}{this.delta}
          </span>
        )}
      </div>
    );
  }
}
