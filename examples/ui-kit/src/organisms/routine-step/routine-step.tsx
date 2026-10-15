import { Component, h, Prop, State, Event, EventEmitter, Watch } from '@stencil/core';

export type RoutineStepType =
  | 'info'
  | 'checkbox'
  | 'timer'
  | 'duration'
  | 'set_reps'
  | 'breathing'
  | 'photo'
  | 'voice'
  | 'scale'
  | 'text_input'
  | 'confetti'
  | 'custom';

@Component({
  tag: 'pop-routine-step',
  encapsulation: { type: 'scoped' },
  styleUrl: 'routine-step.css',
})
export class PopRoutineStep {
  /** Step type determines the interactive widget shown */
  @Prop() type: RoutineStepType = 'info';

  /** Step title */
  @Prop() heading: string = '';

  /** Optional subtitle / instruction */
  @Prop() subtitle: string = '';

  /** Emoji displayed above the heading */
  @Prop() emoji: string = '';

  /** Duration in seconds (for timer/breathing/duration steps) */
  @Prop() durationSeconds: number = 60;

  /** Breathing pattern as "inhale,hold,exhale,hold" seconds (e.g. "4,4,6,2") */
  @Prop() breathingPattern: string = '4,4,6,2';

  /** JSON array of set objects [{reps, weight?}] for set_reps step */
  @Prop() sets: string = '[]';

  /** Scale min/max labels */
  @Prop() scaleMin: string = '1';
  @Prop() scaleMax: string = '10';
  @Prop() scaleMinLabel: string = 'Low';
  @Prop() scaleMaxLabel: string = 'High';

  /** Emitted when the step is marked done — detail contains any captured value */
  @Event({ composed: true, bubbles: true }) stepComplete: EventEmitter<any>;

  /** Emitted when user taps Skip */
  @Event({ composed: true, bubbles: true }) stepSkip: EventEmitter<void>;

  @State() timerRemaining: number = 0;
  @State() timerRunning: boolean = false;
  @State() checked: boolean = false;
  @State() scaleValue: number = 5;
  @State() textValue: string = '';
  @State() breathPhase: 'inhale' | 'hold_in' | 'exhale' | 'hold_out' = 'inhale';
  @State() breathProgress: number = 0; // 0-1 within current phase
  @State() breathCycle: number = 0;
  @State() parsedSets: Array<{ reps: number; weight?: number }> = [];

  private timerInterval?: any;
  private breathInterval?: any;

  componentWillLoad() {
    this.timerRemaining = this.durationSeconds;
    try { this.parsedSets = JSON.parse(this.sets); } catch { this.parsedSets = []; }
  }

  disconnectedCallback() {
    this.stopTimer();
    this.stopBreathing();
  }

  @Watch('type')
  onTypeChange() {
    this.stopTimer();
    this.stopBreathing();
    this.timerRemaining = this.durationSeconds;
  }

  // ─── Timer ────────────────────────────────────────────────────────────────

  private startTimer() {
    if (this.timerRunning) return;
    this.timerRunning = true;
    this.timerInterval = setInterval(() => {
      this.timerRemaining -= 1;
      if (this.timerRemaining <= 0) {
        this.stopTimer();
        this.stepComplete.emit({ type: this.type });
      }
    }, 1000);
  }

  private pauseTimer() {
    this.timerRunning = false;
    clearInterval(this.timerInterval);
  }

  private stopTimer() {
    this.timerRunning = false;
    clearInterval(this.timerInterval);
  }

  private formatTime(s: number): string {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  // ─── Breathing ────────────────────────────────────────────────────────────

  private get breathParts(): number[] {
    return this.breathingPattern.split(',').map(Number);
  }

  private startBreathing() {
    const [inhale, holdIn, exhale, holdOut] = this.breathParts;
    const phases: Array<{ name: typeof this.breathPhase; dur: number }> = [
      { name: 'inhale', dur: inhale },
      { name: 'hold_in', dur: holdIn },
      { name: 'exhale', dur: exhale },
      { name: 'hold_out', dur: holdOut },
    ].filter((p) => p.dur > 0) as any;

    let phaseIdx = 0;
    let elapsed = 0;

    this.breathPhase = phases[0].name;
    this.breathProgress = 0;

    this.breathInterval = setInterval(() => {
      elapsed += 0.1;
      const cur = phases[phaseIdx];
      this.breathProgress = Math.min(elapsed / cur.dur, 1);

      if (elapsed >= cur.dur) {
        elapsed = 0;
        phaseIdx = (phaseIdx + 1) % phases.length;
        if (phaseIdx === 0) this.breathCycle += 1;
        this.breathPhase = phases[phaseIdx].name;
        this.breathProgress = 0;
      }
    }, 100);
  }

  private stopBreathing() {
    clearInterval(this.breathInterval);
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  private renderTimer() {
    const total = this.durationSeconds;
    const progress = 1 - this.timerRemaining / total;
    const r = 44;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - progress);

    return (
      <div class="rs-timer">
        <svg viewBox="0 0 100 100" width="120" height="120" class="rs-timer-ring">
          <circle cx="50" cy="50" r={r} class="rs-ring-track" />
          <circle
            cx="50" cy="50" r={r}
            class="rs-ring-progress"
            stroke-dasharray={circ}
            stroke-dashoffset={offset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div class="rs-timer-label">{this.formatTime(this.timerRemaining)}</div>
        <button
          class="rs-btn rs-btn--primary"
          type="button"
          onClick={() => this.timerRunning ? this.pauseTimer() : this.startTimer()}
        >
          {this.timerRunning ? 'Pause' : this.timerRemaining < this.durationSeconds ? 'Resume' : 'Start'}
        </button>
      </div>
    );
  }

  private renderBreathing() {
    const phaseLabels: Record<string, string> = {
      inhale: 'Inhale',
      hold_in: 'Hold',
      exhale: 'Exhale',
      hold_out: 'Rest',
    };
    const scale = this.breathPhase === 'inhale'
      ? 0.6 + this.breathProgress * 0.4
      : this.breathPhase === 'exhale'
        ? 1 - this.breathProgress * 0.4
        : this.breathPhase === 'hold_in' ? 1 : 0.6;

    return (
      <div class="rs-breathing">
        <div
          class="rs-breath-circle"
          style={{ transform: `scale(${scale})` }}
        />
        <div class="rs-breath-phase">{phaseLabels[this.breathPhase]}</div>
        <div class="rs-breath-cycle">Cycle {this.breathCycle + 1}</div>
        {!this.breathInterval && (
          <button class="rs-btn rs-btn--primary" type="button" onClick={() => this.startBreathing()}>Start</button>
        )}
        <button class="rs-btn rs-btn--ghost" type="button" onClick={() => { this.stopBreathing(); this.stepComplete.emit({ cycles: this.breathCycle }); }}>Done</button>
      </div>
    );
  }

  private renderScale() {
    const min = parseInt(this.scaleMin, 10) || 1;
    const max = parseInt(this.scaleMax, 10) || 10;
    const vals = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return (
      <div class="rs-scale">
        <div class="rs-scale-labels">
          <span>{this.scaleMinLabel}</span>
          <span>{this.scaleMaxLabel}</span>
        </div>
        <div class="rs-scale-pips">
          {vals.map((v) => (
            <button
              key={v}
              class={{ 'rs-pip': true, 'is-selected': this.scaleValue === v }}
              type="button"
              onClick={() => (this.scaleValue = v)}
            >
              {v}
            </button>
          ))}
        </div>
        <button class="rs-btn rs-btn--primary" type="button" onClick={() => this.stepComplete.emit({ value: this.scaleValue })}>
          Confirm {this.scaleValue}
        </button>
      </div>
    );
  }

  private renderSets() {
    const sets = this.parsedSets.length ? this.parsedSets : [{ reps: 10 }];
    return (
      <div class="rs-sets">
        {sets.map((set, i) => (
          <div class="rs-set-row" key={i}>
            <span class="rs-set-num">Set {i + 1}</span>
            <span class="rs-set-detail">
              {set.reps} reps{set.weight ? ` × ${set.weight} kg` : ''}
            </span>
          </div>
        ))}
        <button class="rs-btn rs-btn--primary" type="button" onClick={() => this.stepComplete.emit({ sets })}>
          All sets done
        </button>
      </div>
    );
  }

  render() {
    return (
      <div class={`rs-root rs-type--${this.type}`}>
        {this.emoji && <div class="rs-emoji">{this.emoji}</div>}
        {this.heading && <h2 class="rs-heading">{this.heading}</h2>}
        {this.subtitle && <p class="rs-subtitle">{this.subtitle}</p>}

        <div class="rs-widget">
          <slot></slot>
          {this.type === 'timer' && this.renderTimer()}
          {this.type === 'duration' && this.renderTimer()}
          {this.type === 'breathing' && this.renderBreathing()}
          {this.type === 'scale' && this.renderScale()}
          {this.type === 'set_reps' && this.renderSets()}

          {this.type === 'checkbox' && (
            <button
              class={{ 'rs-check-btn': true, 'is-checked': this.checked }}
              type="button"
              onClick={() => { this.checked = !this.checked; if (this.checked) this.stepComplete.emit({ checked: true }); }}
            >
              {this.checked ? '✓ Done' : 'Mark done'}
            </button>
          )}

          {this.type === 'text_input' && (
            <div class="rs-text-input">
              <textarea
                class="rs-textarea"
                rows={4}
                placeholder="Type your response…"
                value={this.textValue}
                onInput={(e) => (this.textValue = (e.target as HTMLTextAreaElement).value)}
              />
              <button class="rs-btn rs-btn--primary" type="button" onClick={() => this.stepComplete.emit({ text: this.textValue })}>
                Submit
              </button>
            </div>
          )}

          {(this.type === 'info' || this.type === 'photo' || this.type === 'voice' || this.type === 'confetti' || this.type === 'custom') && (
            <button class="rs-btn rs-btn--primary" type="button" onClick={() => this.stepComplete.emit({})}>
              {this.type === 'confetti' ? '🎉 Complete!' : 'Continue'}
            </button>
          )}
        </div>

        <button class="rs-skip" type="button" onClick={() => this.stepSkip.emit()}>Skip</button>
      </div>
    );
  }
}
