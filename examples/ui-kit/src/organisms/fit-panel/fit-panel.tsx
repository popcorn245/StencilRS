import { Component, Prop, State, Event, EventEmitter, Watch, h, Host } from '@stencil/core';
import {
  fitCards,
  fitFormFields,
  fitSubmitLabel,
  fitFormHint,
  weightChart,
  glucoseChart,
  caloriesChart,
  readingDisplay,
  readingCount,
  readingEditFields,
  readingInitialValues,
  buildReadingPatch,
  dayLabel,
  shortDay,
  localTodayStr,
  logAtFor,
  type FitLatest,
  type FitGoals,
  type FitPanelCard,
  type FitPoint,
  type FitGlucosePoint,
  type FitDayBar,
  type FitDayReadings,
  type FitReadingDomain,
  type FitDayGlucose,
  type FitDayBody,
  type FitDayFood,
  type FitDayWorkout,
} from './fit-panel.helpers';

/** A logged reading of any domain (used by the inline edit/delete rows). */
type FitReading = FitDayGlucose | FitDayBody | FitDayFood | FitDayWorkout;

const FALLBACK_DISCLAIMER =
  'ℹ️ Fit tracks and summarizes your numbers — it is not medical advice and does not ' +
  'diagnose or recommend treatment. For anything concerning, check with your doctor.';

/**
 * pop-fit-panel — the health panel (organism): six tappable metric cards, an
 * inline log form (opens in an action zone above the grid), the readings-by-day
 * list, and three consolidated trend charts (weight line + goal, blood-sugar
 * line + normal-range band, calories bars + goal) — all three via one
 * `pop-line-chart`. Forms use `pop-field`; the emoji glyphs are kept as-is.
 *
 * Presentation-only: the HOST (the Bucket Hub's hub-fit) owns the network
 * (hubApi), optimistic mutations, day/state and the PanelShell chrome. This
 * component displays the data it is handed and emits `pop*` events:
 *   • popCardTap(cardKey)  — a metric card was tapped (host opens/closes its form)
 *   • popLog(payload)      — submit the active card's form ({card, values, at})
 *   • popCancelLog         — dismiss the open form
 *   • popDayChange(day)    — the built-in date pill picked a day (header mode)
 *   • popRefresh           — refresh requested
 *
 * Object/array props accept a value (property binding) OR a JSON string
 * (attribute — how Storybook / plain HTML pass them), parsed defensively.
 *
 * The user/child switcher of the old monolith is intentionally GONE — the panel
 * is single-user (owner).
 */
@Component({
  tag: 'pop-fit-panel',
  encapsulation: { type: 'scoped' },
  styleUrl: 'fit-panel.css',
})
export class PopFitPanel {
  /** Latest readings (object OR JSON string). */
  @Prop() latest: FitLatest | string = {} as FitLatest;
  /** Goals / target bands (object OR JSON string). */
  @Prop() goals: FitGoals | string = {} as FitGoals;
  /** Optional precomputed metric cards. When omitted they're derived from
   *  `latest` + `goals` + `days` (day-aware). Lets a host reuse the panel with
   *  a different card set. (object array OR JSON string). */
  @Prop() cards: FitPanelCard[] | string = [];
  /** The selected day (YYYY-MM-DD, local). Drives day-aware labels + the pill. */
  @Prop() days = localTodayStr();
  /** Weight trend points (object array OR JSON string). */
  @Prop() weightSeries: FitPoint[] | string = [];
  /** Blood-sugar trend points (object array OR JSON string). */
  @Prop() glucoseSeries: FitGlucosePoint[] | string = [];
  /** Calories-per-day bars (object array OR JSON string). */
  @Prop() caloriesSeries: FitDayBar[] | string = [];
  /** The selected day's readings, grouped by domain (object OR JSON string). */
  @Prop() readings: FitDayReadings | string = { glucose: [], body: [], food: [], workouts: [] };
  /** The card whose log form is open (''=none). Controlled by the host. */
  @Prop() activeCard = '';
  /** The card just logged — stays highlighted after its form closes. */
  @Prop() justLoggedCard = '';
  /** A confirmation line shown under the action zone (e.g. "✓ Logged weight"). */
  @Prop() logReply = '';
  /** A log submit is in flight (disables the button). */
  @Prop() logBusy = false;
  /** First-load state (no data yet) → a subtle loader. */
  @Prop() loading = false;
  /** An error message to show instead of the body (with a Retry). */
  @Prop() error = '';
  /** Render the panel's own header (title + date pill + refresh). Hosts that
   *  supply their own chrome (the hub's PanelShell) set this false. */
  @Prop() showHeader = true;
  /** Days in the workouts rolling window (sub-line "last Nd"). */
  @Prop() windowDays = 30;

  /** Transient form values for the open card (key → string). Local only; the
   *  final payload crosses up via popLog. */
  @State() formValues: Record<string, string> = {};
  /** Recorded-at (ms) for the open form — now for today, else noon of the day. */
  @State() logAt = Date.now();
  /** The reading row currently in inline-edit (`${domain}:${id}`), or ''. Local
   *  UI state (the host owns the network) — like remote-panel's room menu. */
  @State() editingReadingKey = '';
  /** The reading row awaiting delete confirmation (`${domain}:${id}`), or ''. */
  @State() confirmDeleteKey = '';
  /** A row edit/delete is in flight (disables its buttons). Cleared when the
   *  host's refresh lands (readings prop changes). */
  @State() rowBusy = false;
  /** Transient edit-form values for the row being edited (key → string). */
  @State() editValues: Record<string, string> = {};

  @Event({ composed: true, bubbles: true }) popCardTap!: EventEmitter<string>;
  @Event({ composed: true, bubbles: true }) popLog!: EventEmitter<{ card: string; values: Record<string, string>; at: number }>;
  @Event({ composed: true, bubbles: true }) popCancelLog!: EventEmitter<void>;
  @Event({ composed: true, bubbles: true }) popDayChange!: EventEmitter<string>;
  @Event({ composed: true, bubbles: true }) popRefresh!: EventEmitter<void>;
  /** Save an inline reading edit — `patch` holds the domain's edited fields. */
  @Event({ composed: true, bubbles: true }) popEditReading!: EventEmitter<{ domain: FitReadingDomain; id: string; patch: Record<string, unknown> }>;
  /** Delete a logged reading (after the two-step confirm). */
  @Event({ composed: true, bubbles: true }) popDeleteReading!: EventEmitter<{ domain: FitReadingDomain; id: string }>;

  /** When the host's refresh lands (new readings), clear transient row state. */
  @Watch('readings')
  onReadingsChange() {
    this.editingReadingKey = '';
    this.confirmDeleteKey = '';
    this.rowBusy = false;
    this.editValues = {};
  }

  private dateInput?: HTMLInputElement;

  @Watch('activeCard')
  onActiveCardChange(next: string) {
    // A freshly-opened card starts with empty inputs (context select defaulted)
    // and a recorded-at defaulted to the selected day.
    this.formValues = {};
    if (next) this.logAt = logAtFor(this.days || localTodayStr());
  }

  private parse<T>(v: T | string, fallback: T): T {
    if (typeof v === 'string') {
      if (v === '') return fallback;
      try {
        return (JSON.parse(v) as T) ?? fallback;
      } catch {
        return fallback;
      }
    }
    return v ?? fallback;
  }

  private hasData(latest: FitLatest): boolean {
    return !!latest && Object.keys(latest).length > 0;
  }

  private onCardTap = (e: CustomEvent<string>) => {
    e.stopPropagation();
    this.popCardTap.emit(e.detail);
  };

  private onFieldChange = (e: CustomEvent<{ key: string; value: unknown }>) => {
    e.stopPropagation();
    const { key, value } = e.detail;
    this.formValues = { ...this.formValues, [key]: value == null ? '' : String(value) };
  };

  private submit = () => {
    const card = this.activeCard;
    if (!card || this.logBusy) return;
    const fields = fitFormFields(card);
    const values: Record<string, string> = {};
    for (const f of fields) values[f.key] = (this.formValues[f.key] ?? (f.defaultValue as string) ?? '').trim();
    // Require the first field.
    const first = fields[0];
    if (first && !values[first.key]) return;
    this.popLog.emit({ card, values, at: this.logAt });
  };

  private cancel = () => {
    this.popCancelLog.emit();
  };

  // ── readings-by-day inline edit / delete ──────────────────────────────────
  private rowKey(domain: FitReadingDomain, id: string): string {
    return `${domain}:${id}`;
  }

  private startEdit(domain: FitReadingDomain, r: FitReading) {
    this.editingReadingKey = this.rowKey(domain, r.id);
    this.editValues = readingInitialValues(domain, r);
    this.confirmDeleteKey = '';
  }

  private cancelEdit = () => {
    this.editingReadingKey = '';
    this.editValues = {};
  };

  private onEditFieldChange = (e: CustomEvent<{ key: string; value: unknown }>) => {
    e.stopPropagation();
    const { key, value } = e.detail;
    this.editValues = { ...this.editValues, [key]: value == null ? '' : String(value) };
  };

  private saveEdit(domain: FitReadingDomain, id: string) {
    if (this.rowBusy) return;
    const patch = buildReadingPatch(domain, this.editValues);
    this.rowBusy = true;
    this.popEditReading.emit({ domain, id, patch });
  }

  private askDelete(domain: FitReadingDomain, id: string) {
    this.confirmDeleteKey = this.rowKey(domain, id);
    this.editingReadingKey = '';
  }

  private cancelDelete = () => {
    this.confirmDeleteKey = '';
  };

  private confirmDelete(domain: FitReadingDomain, id: string) {
    if (this.rowBusy) return;
    this.rowBusy = true;
    this.popDeleteReading.emit({ domain, id });
  }

  private openDatePicker = () => {
    const el = this.dateInput as (HTMLInputElement & { showPicker?: () => void }) | undefined;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.focus();
  };

  // ── render pieces ────────────────────────────────────────────────────────

  private renderHeader(day: string) {
    return (
      <header class="fitp-header">
        <span class="fitp-title">Fit</span>
        <div class="fitp-headright">
          <button type="button" class="fitp-datepill" onClick={this.openDatePicker} aria-label={`Pick a day (showing ${shortDay(day)})`}>
            📅 {shortDay(day)}
          </button>
          <button type="button" class="fitp-refresh" onClick={() => this.popRefresh.emit()} aria-label="Refresh">
            ↻
          </button>
          <input
            class="fitp-datehidden"
            type="date"
            value={day}
            max={localTodayStr()}
            aria-hidden="true"
            tabindex={-1}
            ref={(el) => (this.dateInput = el as HTMLInputElement)}
            onChange={(e) => {
              const v = (e.target as HTMLInputElement).value;
              if (v) this.popDayChange.emit(v);
            }}
          />
        </div>
      </header>
    );
  }

  private renderForm(latest: FitLatest) {
    const card = this.activeCard;
    const fields = fitFormFields(card);
    if (!fields.length) return null;
    const hint = fitFormHint(card, latest);
    // Two plain fields sit side-by-side; blood sugar stacks (its context select
    // wants full width).
    const grouped = fields.length === 2 && card !== 'bg';
    const fieldEls = fields.map((f) => (
      <pop-field
        key={f.key}
        class="fitp-field"
        spec={f}
        value={this.formValues[f.key] ?? ''}
        onValueChange={this.onFieldChange}
      />
    ));
    return (
      <div class="fitp-cardform" key={`form-${card}`}>
        <div class="fitp-cardform-head">
          <span>Log {(fields[0]?.label || card).replace(/ \(.*\)$/, '')}</span>
          <button type="button" class="fitp-x" onClick={this.cancel} aria-label="Close">
            ✕
          </button>
        </div>
        {hint && <div class="fitp-cardform-hint">{hint}</div>}
        <div class={{ 'fitp-fields': true, 'fitp-fields--row': grouped }}>{fieldEls}</div>
        <div class="fitp-cardform-actions">
          <button type="button" class="fitp-btn" onClick={this.cancel}>
            Cancel
          </button>
          <button type="button" class="fitp-btn fitp-btn--primary" disabled={this.logBusy} onClick={this.submit}>
            {this.logBusy ? '…' : fitSubmitLabel(card)}
          </button>
        </div>
      </div>
    );
  }

  private renderCards(cards: FitPanelCard[], latest: FitLatest) {
    return [
      (this.activeCard || this.logReply) && (
        <div class="fitp-actionzone">
          {this.activeCard && this.renderForm(latest)}
          {this.logReply && <div class="fitp-log-reply">{this.logReply}</div>}
        </div>
      ),
      <div class="fitp-cards">
        {cards.map((c) => (
          <pop-metric-card
            key={c.key}
            glyph={c.glyph}
            label={c.label}
            value={c.value}
            sub={c.sub}
            cardKey={c.key}
            loggable={c.loggable !== false}
            active={this.activeCard === c.key || this.justLoggedCard === c.key}
            onPopCardTap={this.onCardTap}
          />
        ))}
      </div>,
    ];
  }

  /** The inline edit form for a reading row (pop-field per domain + Save/Cancel). */
  private renderRowEdit(domain: FitReadingDomain, id: string) {
    const fields = readingEditFields(domain);
    return (
      <div class="fitp-dayrow fitp-dayrow--edit" key={`${domain}:${id}`}>
        <div class="fitp-dayrow-fields">
          {fields.map((f) => (
            <pop-field key={f.key} class="fitp-field" spec={f} value={this.editValues[f.key] ?? ''} onValueChange={this.onEditFieldChange} />
          ))}
        </div>
        <div class="fitp-dayrow-actions">
          <button type="button" class="fitp-btn" disabled={this.rowBusy} onClick={this.cancelEdit}>
            Cancel
          </button>
          <button type="button" class="fitp-btn fitp-btn--primary" disabled={this.rowBusy} onClick={() => this.saveEdit(domain, id)}>
            {this.rowBusy ? '…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  private renderReadings(readings: FitDayReadings, day: string) {
    const total = readingCount(readings);
    const label = dayLabel(day);
    const row = (domain: FitReadingDomain, r: FitReading) => {
      const key = this.rowKey(domain, r.id);
      if (this.editingReadingKey === key) return this.renderRowEdit(domain, r.id);
      const disp = readingDisplay(domain, r);
      const confirming = this.confirmDeleteKey === key;
      return (
        <div class="fitp-dayrow" key={key}>
          <span class="fitp-dayrow-glyph">{disp.glyph}</span>
          <span class="fitp-dayrow-main">{disp.main}</span>
          <span class="fitp-dayrow-meta">{disp.meta}</span>
          <div class="fitp-dayrow-actions">
            {confirming
              ? [
                  <button type="button" class="fitp-rowbtn fitp-rowbtn--danger" disabled={this.rowBusy} onClick={() => this.confirmDelete(domain, r.id)}>
                    {this.rowBusy ? '…' : 'Delete?'}
                  </button>,
                  <button type="button" class="fitp-rowbtn" disabled={this.rowBusy} onClick={this.cancelDelete}>
                    Cancel
                  </button>,
                ]
              : [
                  <button type="button" class="fitp-rowbtn" aria-label="Edit reading" title="Edit" onClick={() => this.startEdit(domain, r)}>
                    ✎
                  </button>,
                  <button type="button" class="fitp-rowbtn" aria-label="Delete reading" title="Delete" onClick={() => this.askDelete(domain, r.id)}>
                    ✕
                  </button>,
                ]}
          </div>
        </div>
      );
    };
    return (
      <div class="fitp-section">
        <div class="fitp-section-title">Readings on {label}</div>
        {total === 0 ? (
          <div class="fitp-empty">No readings logged on {label}.</div>
        ) : (
          <div class="fitp-day-list">
            {readings.glucose.map((r) => row('glucose', r))}
            {readings.body.map((r) => row('body', r))}
            {readings.food.map((r) => row('food', r))}
            {readings.workouts.map((r) => row('workout', r))}
          </div>
        )}
      </div>
    );
  }

  private renderChartEmpty(text: string) {
    return <div class="fitp-chart-empty">{text}</div>;
  }

  private renderCharts(goals: FitGoals, weight: FitPoint[], glucose: FitGlucosePoint[], calories: FitDayBar[]) {
    const w = weightChart(weight, goals.goalWeightLbs);
    const g = glucoseChart(glucose, goals.glucoseMin, goals.glucoseMax);
    const c = caloriesChart(calories, goals.dailyCalorieGoal);
    const bandHint =
      goals.glucoseMin != null && goals.glucoseMax != null
        ? goals.glucoseBandSource === 'derived'
          ? `typical range ${goals.glucoseMin}–${goals.glucoseMax}`
          : `normal range ${goals.glucoseMin}–${goals.glucoseMax}`
        : '';
    return [
      <div class="fitp-section">
        <div class="fitp-section-title">
          Weight {goals.goalWeightLbs != null && <span class="fitp-section-hint">goal {goals.goalWeightLbs}</span>}
        </div>
        {weight.length >= 2 ? (
          <div class="fitp-chart-card">
            <pop-line-chart series={w.series as any} refLines={w.refLines as any} leftUnit=" lb" chartTitle="Weight trend" />
          </div>
        ) : (
          this.renderChartEmpty('Log a couple of weigh-ins to see the trend.')
        )}
      </div>,
      <div class="fitp-section">
        <div class="fitp-section-title">
          Blood sugar {bandHint && <span class="fitp-section-hint">{bandHint}</span>}
        </div>
        {glucose.length ? (
          <div class="fitp-chart-card">
            <pop-line-chart series={g.series as any} rangeBands={g.rangeBands as any} chartTitle="Blood-sugar trend with normal range shaded" />
          </div>
        ) : (
          this.renderChartEmpty('Log a blood-sugar reading to see the trend.')
        )}
      </div>,
      <div class="fitp-section">
        <div class="fitp-section-title">
          Calories / day {goals.dailyCalorieGoal != null && <span class="fitp-section-hint">goal {goals.dailyCalorieGoal}</span>}
        </div>
        {calories.some((b) => b.v > 0) ? (
          <div class="fitp-chart-card">
            <pop-line-chart series={c.series as any} refLines={c.refLines as any} xLabels={c.xLabels as any} chartTitle="Calories per day vs your goal" />
          </div>
        ) : (
          this.renderChartEmpty('Log meals to see calories per day.')
        )}
      </div>,
    ];
  }

  render() {
    const latest = this.parse<FitLatest>(this.latest, {} as FitLatest);
    const goals = this.parse<FitGoals>(this.goals, {} as FitGoals);
    const day = this.days || localTodayStr();
    const providedCards = this.parse<FitPanelCard[]>(this.cards, []);
    const cards = providedCards.length ? providedCards : this.hasData(latest) ? fitCards(latest, goals, day, this.windowDays) : [];
    const weight = this.parse<FitPoint[]>(this.weightSeries, []);
    const glucose = this.parse<FitGlucosePoint[]>(this.glucoseSeries, []);
    const calories = this.parse<FitDayBar[]>(this.caloriesSeries, []);
    const readings = this.parse<FitDayReadings>(this.readings, { glucose: [], body: [], food: [], workouts: [] });
    const hasData = this.hasData(latest) || cards.length > 0;

    return (
      <Host>
        <section class="fitp" aria-label="Fit">
          {this.showHeader && this.renderHeader(day)}
          {this.error && !hasData ? (
            <div class="fitp-state fitp-state--err">
              <span>{this.error}</span>
              <button type="button" class="fitp-btn" onClick={() => this.popRefresh.emit()}>
                Retry
              </button>
            </div>
          ) : !hasData ? (
            <div class="fitp-state">{this.loading ? 'Loading…' : 'No health data yet.'}</div>
          ) : (
            [
              this.renderCards(cards, latest),
              this.renderReadings(readings, day),
              this.renderCharts(goals, weight, glucose, calories),
              <div class="fitp-disclaimer">{FALLBACK_DISCLAIMER}</div>,
            ]
          )}
        </section>
      </Host>
    );
  }
}
