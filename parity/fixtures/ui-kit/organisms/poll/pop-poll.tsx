import { Component, Host, h, Prop, State, Event, EventEmitter, Watch, Method } from '@stencil/core';

export interface PollOption {
  label: string;
  value: string;
  color?: string;
  votes?: number;
  percentage?: number;
}

/**
 * @name pop-poll
 * @description A Twitter-style poll widget that displays a poll question with options,
 * shows real-time vote counts and percentages, and allows users to vote.
 * Emits a `pollVote` event when the user votes, so the host can persist to Firestore.
 */
@Component({
  tag: 'pop-poll',
  styleUrl: 'pop-poll.css',
})
export class PopPoll {
  /** The poll question text */
  @Prop() question: string = '';

  /** JSON-stringified array of PollOption objects */
  @Prop() options: string = '[]';

  /** Total number of votes cast */
  @Prop() totalVotes: number = 0;

  /** The current user's voted option value(s), comma-separated for multiple */
  @Prop() userVote: string = '';

  /** Poll type: 'single' for one choice, 'multiple' for many */
  @Prop() pollType: string = 'single';

  /** ISO date string when poll ends */
  @Prop() endDate: string = '';

  /** The Firestore document ID for this poll */
  @Prop() pollId: string = '';

  /** When true, disables voting interaction */
  @Prop() readonly: boolean = false;

  /** When true, always shows results even if user hasn't voted */
  @Prop() showResults: boolean = false;

  /** Accent color (CSS custom property value) */
  @Prop() accentColor: string = '#7c3aed';

  @State() parsedOptions: PollOption[] = [];
  @State() selectedValues: string[] = [];
  @State() hasVoted: boolean = false;
  @State() timeLeft: string = '';
  @State() isExpired: boolean = false;

  private timer: any;

  /**
   * Emitted when the user clicks "Vote" - detail contains selected values and pollId.
   */
  @Event() pollVote: EventEmitter<{ values: string[]; pollId: string }>;

  /**
   * Programmatically set the user's current vote.
   */
  @Method()
  async setUserVote(value: string) {
    this.selectedValues = value ? value.split(',').filter(Boolean) : [];
    this.hasVoted = this.selectedValues.length > 0;
  }

  componentWillLoad() {
    this.parseOptions();
    this.parseUserVote();
    this.updateTimeLeft();
    this.injectStyles();
  }

  componentDidLoad() {
    if (this.endDate) {
      this.timer = setInterval(() => this.updateTimeLeft(), 60_000);
    }
  }

  disconnectedCallback() {
    clearInterval(this.timer);
  }

  @Watch('options')
  onOptionsChange() {
    this.parseOptions();
  }

  @Watch('userVote')
  onUserVoteChange() {
    this.parseUserVote();
  }

  @Watch('endDate')
  onEndDateChange() {
    this.updateTimeLeft();
  }

  private parseOptions() {
    try {
      this.parsedOptions = JSON.parse(this.options || '[]');
    } catch {
      this.parsedOptions = [];
    }
  }

  private parseUserVote() {
    const votes = this.userVote ? this.userVote.split(',').filter(Boolean) : [];
    this.selectedValues = votes;
    this.hasVoted = votes.length > 0;
  }

  private updateTimeLeft() {
    if (!this.endDate) return;
    const end = new Date(this.endDate).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      this.isExpired = true;
      this.timeLeft = 'Final results';
      clearInterval(this.timer);
      return;
    }

    this.isExpired = false;
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);

    if (days > 0) {
      this.timeLeft = `${days}d ${hours}h left`;
    } else if (hours > 0) {
      this.timeLeft = `${hours}h ${mins}m left`;
    } else {
      this.timeLeft = `${mins}m left`;
    }
  }

  private injectStyles() {
    if (document.getElementById('pop-poll-styles')) return;
    const s = document.createElement('style');
    s.id = 'pop-poll-styles';
    s.textContent = `
pop-poll { display: block; font-family: var(--pico-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif); }
.pp-wrap { max-width: 500px; }
.pp-question { font-size: 1rem; font-weight: 600; margin: 0 0 0.85rem; line-height: 1.4; color: inherit; }
.pp-options { display: flex; flex-direction: column; gap: 0.5rem; }
.pp-option { position: relative; border-radius: 9999px; border: 2px solid var(--pico-muted-border-color, #e2e8f0); overflow: hidden;
  cursor: pointer; transition: border-color 0.15s; user-select: none; }
.pp-option:hover:not(.pp-option--voted):not(.pp-option--disabled) { border-color: var(--pp-accent, var(--pico-primary, #7c3aed)); }
.pp-option--selected { border-color: var(--pp-accent, var(--pico-primary, #7c3aed)) !important; }
.pp-option--winner { border-color: var(--pp-accent, var(--pico-primary, #7c3aed)); }
.pp-option--disabled { cursor: default; }
.pp-option-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 9999px;
  background: var(--pp-fill-color, rgba(124,58,237,0.15)); transition: width 0.4s ease; pointer-events: none; }
.pp-option-inner { position: relative; display: flex; align-items: center; gap: 0.5rem;
  padding: 0.65rem 1rem; z-index: 1; }
.pp-option-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--pico-muted-border-color, #cbd5e1);
  flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.pp-option--selected .pp-option-radio { border-color: var(--pp-accent, var(--pico-primary, #7c3aed)); background: var(--pp-accent, var(--pico-primary, #7c3aed)); }
.pp-option-radio-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pico-primary-inverse, #fff); opacity: 0; transition: opacity 0.15s; }
.pp-option--selected .pp-option-radio-dot { opacity: 1; }
.pp-option-check { width: 8px; height: 8px; }
.pp-option-label { flex: 1; font-size: 0.9375rem; font-weight: 500; line-height: 1.3; }
.pp-option-pct { font-size: 0.875rem; font-weight: 600; color: var(--pp-accent, var(--pico-primary, #7c3aed)); margin-left: auto; flex-shrink: 0; }
.pp-option-pct--muted { color: var(--pico-muted-color, #94a3b8); }
.pp-winner-badge { font-size: 11px; color: var(--pp-accent, var(--pico-primary, #7c3aed)); font-weight: 700; margin-left: 4px; }
.pp-footer { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.85rem; font-size: 0.8125rem; color: var(--pico-muted-color, #64748b); }
.pp-footer-dot { opacity: 0.4; }
.pp-vote-btn { margin-top: 0.75rem; padding: 0.5rem 1.25rem; background: var(--pp-accent, var(--pico-primary, #7c3aed));
  color: var(--pico-primary-inverse, #fff); border: none; border-radius: 9999px; font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s; }
.pp-vote-btn:hover { opacity: 0.9; }
.pp-vote-btn:disabled { opacity: 0.4; cursor: default; }
.pp-empty { color: var(--pico-muted-color, #94a3b8); font-style: italic; font-size: 0.875rem; }
.pp-poll-link { color: inherit; text-decoration: underline; font-size: inherit; }
.pp-poll-link:hover { color: var(--pp-accent, var(--pico-primary, #7c3aed)); }
`;
    document.head.appendChild(s);
  }

  private handleOptionClick(value: string) {
    if (this.readonly || this.hasVoted || this.isExpired) return;

    if (this.pollType === 'multiple') {
      if (this.selectedValues.includes(value)) {
        this.selectedValues = this.selectedValues.filter(v => v !== value);
      } else {
        this.selectedValues = [...this.selectedValues, value];
      }
    } else {
      this.selectedValues = [value];
    }
  }

  private handleVote() {
    if (!this.selectedValues.length) return;
    this.hasVoted = true;
    this.pollVote.emit({ values: this.selectedValues, pollId: this.pollId });
  }

  private getWinnerValue(): string | null {
    if (!this.parsedOptions.length || !this.totalVotes) return null;
    let max = -1;
    let winner = '';
    for (const opt of this.parsedOptions) {
      if ((opt.votes || 0) > max) {
        max = opt.votes || 0;
        winner = opt.value;
      }
    }
    return max > 0 ? winner : null;
  }

  private getFillColor(color?: string): string {
    const colorMap: Record<string, string> = {
      blue: 'rgba(59,130,246,0.18)',
      red: 'rgba(239,68,68,0.18)',
      green: 'rgba(34,197,94,0.18)',
      yellow: 'rgba(234,179,8,0.18)',
      purple: 'rgba(124,58,237,0.18)',
      pink: 'rgba(236,72,153,0.18)',
      orange: 'rgba(249,115,22,0.18)',
    };
    return colorMap[color || ''] || 'rgba(124,58,237,0.18)';
  }

  private renderOption(opt: PollOption, showVotes: boolean, winnerValue: string | null) {
    const isSelected = this.selectedValues.includes(opt.value);
    const isWinner = showVotes && opt.value === winnerValue;
    const pct = showVotes ? Math.round((opt.percentage || 0) * 100) : 0;
    const fillColor = this.getFillColor(opt.color);

    const classes = [
      'pp-option',
      isSelected ? 'pp-option--selected' : '',
      showVotes ? 'pp-option--voted pp-option--disabled' : '',
      isWinner && showVotes ? 'pp-option--winner' : '',
    ].filter(Boolean).join(' ');

    return (
      <div
        class={classes}
        style={{ '--pp-fill-color': fillColor } as any}
        onClick={() => this.handleOptionClick(opt.value)}
        role="radio"
        aria-checked={isSelected ? 'true' : 'false'}
        tabIndex={0}
        onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.handleOptionClick(opt.value); } }}
      >
        {showVotes && (
          <div class="pp-option-fill" style={{ width: `${pct}%` }} />
        )}
        <div class="pp-option-inner">
          {!showVotes && (
            <div class="pp-option-radio">
              <div class="pp-option-radio-dot" />
            </div>
          )}
          {showVotes && isSelected && (
            <svg class="pp-option-check" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l4 4 6-6" stroke="var(--pp-accent,#7c3aed)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          )}
          <span class="pp-option-label">{opt.label || opt.value}</span>
          {showVotes && (
            <span class={`pp-option-pct${isWinner ? '' : ' pp-option-pct--muted'}`}>
              {pct}%
              {isWinner && <span class="pp-winner-badge">✓</span>}
            </span>
          )}
        </div>
      </div>
    );
  }

  render() {
    const showVotes = this.hasVoted || this.showResults || this.isExpired || this.readonly;
    const winnerValue = this.getWinnerValue();
    const canVote = !this.readonly && !this.hasVoted && !this.isExpired;

    return (
      <Host style={{ '--pp-accent': this.accentColor } as any}>
        <div class="pp-wrap">
          {this.question && <p class="pp-question">{this.question}</p>}

          {this.parsedOptions.length === 0 ? (
            <p class="pp-empty">No options available.</p>
          ) : (
            <div class="pp-options" role="radiogroup" aria-label={this.question}>
              {this.parsedOptions.map(opt => this.renderOption(opt, showVotes, winnerValue))}
            </div>
          )}

          {canVote && this.selectedValues.length > 0 && (
            <button class="pp-vote-btn" onClick={() => this.handleVote()}>
              Vote
            </button>
          )}

          <div class="pp-footer">
            <span>{this.totalVotes} vote{this.totalVotes !== 1 ? 's' : ''}</span>
            {this.timeLeft && (
              <span class="pp-footer-dot">·</span>
            )}
            {this.timeLeft && (
              <span>{this.timeLeft}</span>
            )}
            {this.pollId && (
              <span class="pp-footer-dot">·</span>
            )}
            {this.pollId && (
              <a href={`/polls/${this.pollId}`} class="pp-poll-link">
                View poll
              </a>
            )}
          </div>
        </div>
      </Host>
    );
  }
}
