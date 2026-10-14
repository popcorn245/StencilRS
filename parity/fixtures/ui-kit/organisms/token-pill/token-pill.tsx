import { Component, Host, h, Prop } from '@stencil/core';

@Component({
  tag: 'pop-token-pill',
  encapsulation: { type: 'shadow' },
  styleUrl: 'token-pill.css',
})
export class PopTokenPill {
  /** The text string to calculate tokens from (estimation) */
  @Prop() text: string = '';

  /** Explicit token count (overrides 'text' calculation if provided) */
  @Prop() tokens?: number;

  /** The maximum context window size (default 8192) */
  @Prop() limit: number = 8192;

  /** Whether to show the numerical label */
  @Prop() showLabel: boolean = true;

  /** Multiplier for char-to-token estimation (Standard is ~4) */
  @Prop() ratio: number = 4;

  /** Explicit meter state from the server */
  @Prop() state?: 'normal' | 'warn' | 'compact' | 'over';

  /** Explicit budget percentage from the server (0 to 1+) */
  @Prop() budgetPct?: number;

  private getEffectiveTokens(): number {
    if (typeof this.tokens === 'number') return this.tokens;
    if (!this.text) return 0;
    // Basic estimation: chars / ratio
    return Math.ceil(this.text.length / this.ratio);
  }

  render() {
    const tokens = this.getEffectiveTokens();
    const ratioPct = (tokens / this.limit) * 100;
    
    // Use server values if provided, else fallback to ratio derivation
    const rawPct = typeof this.budgetPct === 'number' ? this.budgetPct * 100 : ratioPct;
    const percentage = Math.min(rawPct, 100); // Visually clamp fill
    
    let isWarning = false;
    let isCompact = false;
    let isOver = false;

    if (this.state) {
      isWarning = this.state === 'warn';
      isCompact = this.state === 'compact';
      isOver = this.state === 'over';
    } else {
      isWarning = ratioPct > 80;
      isCompact = ratioPct > 95; // map crit to compact in back-compat
      isOver = ratioPct > 100;
    }

    return (
      <Host>
        <div 
          class={{
            'pill-container': true,
            'warn': isWarning,
            'crit': isCompact,
            'over': isOver
          }}
          title={`${tokens.toLocaleString()} / ${this.limit.toLocaleString()} tokens`}
        >
          <div 
            class="progress-fill" 
            style={{ width: `${percentage}%` }}
          ></div>
          
          {this.showLabel && (
            <span class="label">
              {tokens.toLocaleString()} / {this.limit.toLocaleString()} {isOver ? '(Over)' : ''}
            </span>
          )}
        </div>
      </Host>
    );
  }
}
