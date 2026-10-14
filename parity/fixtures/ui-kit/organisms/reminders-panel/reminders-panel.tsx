import { Component, Prop, State, Event, EventEmitter, Watch, h, Host } from '@stencil/core';
import {
  REMINDER_FILTERS,
  SNOOZE_CHOICES,
  DEFAULT_ALARM_SETTINGS,
  DEFAULT_ALARM_SOUNDS,
  toLocalInputValue,
  formatWhen,
  relativeShort,
  heroCountdown,
  drainPct,
  isImminent,
  HERO_TICK_WINDOW_MS,
  type ReminderRow,
  type ReminderFilterCounts,
  type AlarmSettingsView,
  type AlarmSoundOption,
} from './reminders-panel.helpers';

/**
 * pop-reminders-panel — the Reminders panel (organism), migrated from the hub's
 * 700-line hub-reminders monolith. PRESENTATION-ONLY: the host (Bucket Hub's
 * hub-reminders wrapper) owns the network (PanelShell + PanelData), optimistic
 * mutations, clock-skew-safe deadline math, and the alarm engine (Web-Audio +
 * HTMLAudio tone, vibration, push pref). This component displays what it is
 * handed and emits `pop*` events for every action the host must perform.
 *
 * Shared VISUAL LANGUAGE (matches the approved mockup): a red→amber→blue "drain"
 * gradient that empties RIGHT→LEFT — the countdown hero bar here, the hub tile
 * face, and the collapsed chip all reuse it. The last sliver standing is red
 * (urgent). Themed via ui-kit tokens (--ink/--ink-muted/--line/--surface-card/
 * --surface-raised/--brand-blue) with fallbacks; mobile-first (390px sheet).
 *
 * Object/array props accept a value (property binding) OR a JSON string
 * (attribute — how Storybook / plain HTML pass them), parsed defensively.
 *
 * Events (all composed + bubbling):
 *   popCreate {title,time}       — quick-create submitted
 *   popSnooze {id,minutes}       — per-row / banner snooze
 *   popDismiss {id}              — per-row / banner dismiss (complete)
 *   popEditReminder {id,title,time} — inline edit saved
 *   popDelete {id}               — per-row delete
 *   popFilterChange {filter}     — segmented filter changed
 *   popSearchChange {search}     — search text changed (debounce is the host's)
 *   popAlarmChange {patch,preview}— an alarm setting changed (host persists +
 *                                   previews the tone when preview=true)
 *   popAlarmTest                 — the Test button (host plays the tone)
 *   popStopRing                  — silence a no-id ringing banner
 *   popCountdownDone             — the hero countdown crossed zero
 *   popRefresh / popClose        — header refresh / close (standalone mode)
 *   popUnlock                    — a user gesture in the panel (host unlocks audio)
 */
@Component({
  tag: 'pop-reminders-panel',
  encapsulation: { type: 'scoped' },
  styleUrl: 'reminders-panel.css',
})
export class PopRemindersPanel {
  /** The rows for the ACTIVE filter/search view (object array OR JSON string). */
  @Prop() reminders: ReminderRow[] | string = [];
  /** Inline segmented-filter counts (object OR JSON string). Optional. */
  @Prop() counts: ReminderFilterCounts | string = { upcoming: 0, today: 0, overdue: 0, recurring: 0 };
  /** Active filter id. */
  @Prop() filter = 'upcoming';
  /** Search text (controlled by the host). */
  @Prop() searchText = '';
  /** Alarm settings for the drawer (object OR JSON string). */
  @Prop() alarm: AlarmSettingsView | string = DEFAULT_ALARM_SETTINGS;
  /** Selectable alarm tones (object array OR JSON string). */
  @Prop() sounds: AlarmSoundOption[] | string = DEFAULT_ALARM_SOUNDS;
  /** The reminder currently RINGING (host's alarm engine is looping the tone),
   *  or null. Drives the ringing banner + the row pulse. (object OR JSON string) */
  @Prop() ringing: { id: string; title: string } | null | string = null;
  /** The next reminder's title (hero "Next reminder" name). */
  @Prop() nextTitle = '';
  /** Local-clock deadline (epoch ms) of the next reminder — the hero countdown
   *  target. Host derives it skew-safe (syncedAt + fireInMs). 0/undefined = idle. */
  @Prop() countdownDeadline = 0;
  /** The original set→fire window (ms) — the drain denominator. Optional. */
  @Prop() heroTotalMs = 0;
  /** First-load (no data yet) → a subtle loader instead of the empty state. */
  @Prop() loading = false;
  /** An error line shown in place of the list (with a Retry → popRefresh). */
  @Prop() error = '';
  /** Render the panel's own header (title + refresh + close). Hosts with their
   *  own chrome (the hub's PanelShell) set this false — only the ⚙ gear shows. */
  @Prop() showHeader = true;

  /** Alarm-settings drawer visibility (the ⚙). Local UI state. */
  @State() settingsOpen = false;
  /** Row id whose snooze menu is open, or null. Local UI state. */
  @State() snoozeMenuId: string | null = null;
  /** Row id being inline-edited, or null. Local UI state (+ its draft fields). */
  @State() editingId: string | null = null;
  @State() editTitle = '';
  @State() editTime = '';
  /** Quick-create drafts. Local UI state. */
  @State() createTitle = '';
  @State() createTime = '';
  /** Ticker clock — drives the live hero countdown + drain within the final hour. */
  @State() nowMs = Date.now();

  @Event({ composed: true, bubbles: true }) popCreate!: EventEmitter<{ title: string; time: string }>;
  @Event({ composed: true, bubbles: true }) popSnooze!: EventEmitter<{ id: string; minutes: number }>;
  @Event({ composed: true, bubbles: true }) popDismiss!: EventEmitter<{ id: string }>;
  @Event({ composed: true, bubbles: true }) popEditReminder!: EventEmitter<{ id: string; title: string; time: string }>;
  @Event({ composed: true, bubbles: true }) popDelete!: EventEmitter<{ id: string }>;
  @Event({ composed: true, bubbles: true }) popFilterChange!: EventEmitter<{ filter: string }>;
  @Event({ composed: true, bubbles: true }) popSearchChange!: EventEmitter<{ search: string }>;
  @Event({ composed: true, bubbles: true }) popAlarmChange!: EventEmitter<{ patch: Partial<AlarmSettingsView>; preview: boolean }>;
  @Event({ composed: true, bubbles: true }) popAlarmTest!: EventEmitter<void>;
  @Event({ composed: true, bubbles: true }) popStopRing!: EventEmitter<void>;
  @Event({ composed: true, bubbles: true }) popCountdownDone!: EventEmitter<void>;
  @Event({ composed: true, bubbles: true }) popRefresh!: EventEmitter<void>;
  @Event({ composed: true, bubbles: true }) popClose!: EventEmitter<void>;
  @Event({ composed: true, bubbles: true }) popUnlock!: EventEmitter<void>;

  private tickTimer?: ReturnType<typeof setInterval>;
  /** The deadline we've already announced as done (never re-emit for the same). */
  private announcedDeadline = 0;

  connectedCallback() {
    this.startTick();
  }

  disconnectedCallback() {
    if (this.tickTimer) clearInterval(this.tickTimer);
  }

  /** When the host hands a fresh list (revalidate landed), clear transient row
   *  UI so a stale open menu / edit row never lingers over new data. */
  @Watch('reminders')
  onRemindersChange() {
    this.snoozeMenuId = null;
    this.editingId = null;
  }

  @Watch('countdownDeadline')
  onDeadlineChange() {
    this.announcedDeadline = 0; // a new target can fire again
    this.nowMs = Date.now();
  }

  private startTick() {
    if (this.tickTimer) return;
    // One 1 Hz clock. Cheap: a single interval drives the hero text + drain and
    // the per-row relative labels. (The tile/chip run their own tickers.)
    this.tickTimer = setInterval(() => {
      this.nowMs = Date.now();
      this.maybeAnnounceDone();
    }, 1000);
  }

  private maybeAnnounceDone() {
    const dl = this.countdownDeadline;
    if (!dl) return;
    if (this.nowMs >= dl && this.announcedDeadline !== dl) {
      this.announcedDeadline = dl;
      this.popCountdownDone.emit();
    }
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

  private unlock = () => this.popUnlock.emit();

  private setAlarm(patch: Partial<AlarmSettingsView>, preview: boolean) {
    this.popAlarmChange.emit({ patch, preview });
  }

  private submitCreate = () => {
    const title = this.createTitle.trim();
    const time = this.createTime;
    if (!title || !time) return;
    this.popCreate.emit({ title, time });
    this.createTitle = '';
    this.createTime = '';
  };

  private startEdit(r: ReminderRow) {
    this.editingId = r.id;
    this.editTitle = r.title;
    this.editTime = toLocalInputValue(r.reminderAt);
    this.snoozeMenuId = null;
  }

  private saveEdit() {
    const id = this.editingId;
    if (!id) return;
    this.popEditReminder.emit({ id, title: this.editTitle.trim(), time: this.editTime });
    this.editingId = null;
  }

  // ── Render pieces ──────────────────────────────────────────────────────────

  private renderGear() {
    return (
      <button
        type="button"
        class={{ 'rp-iconbtn': true, 'rp-iconbtn--on': this.settingsOpen }}
        aria-label="Alarm settings"
        aria-pressed={this.settingsOpen ? 'true' : 'false'}
        onClick={() => {
          this.unlock();
          this.settingsOpen = !this.settingsOpen;
        }}
      >
        <pop-icon name="settings-outline" />
      </button>
    );
  }

  private renderHead() {
    if (!this.showHeader) return null;
    return (
      <div class="rp-head">
        <div class="rp-title">Reminders</div>
        <div class="rp-headbtns">
          <button type="button" class="rp-iconbtn" aria-label="Refresh" onClick={() => this.popRefresh.emit()}>
            <pop-icon name="refresh-outline" />
          </button>
          {this.renderGear()}
          <button type="button" class="rp-iconbtn" aria-label="Close" onClick={() => this.popClose.emit()}>
            <pop-icon name="close-outline" />
          </button>
        </div>
      </div>
    );
  }

  private renderHero() {
    const dl = this.countdownDeadline;
    const remaining = dl ? dl - this.nowMs : 0;
    const idle = !dl;
    const imminent = !idle && isImminent(remaining);
    // Live within the final hour; a static full-ish bar beyond (saves the eye a
    // twitch and matches the tile's tick policy).
    const live = !idle && remaining <= HERO_TICK_WINDOW_MS;
    const pct = idle ? 100 : drainPct(Math.max(0, remaining), this.heroTotalMs || undefined);
    const timeText = idle ? '—' : live ? heroCountdown(Math.max(0, remaining)) : heroCountdown(Math.max(0, remaining));
    return (
      <div class="rp-count">
        <div class="rp-count-top">
          <span class="rp-count-glyph">{imminent ? '🔔' : '⏰'}</span>
          <div class="rp-count-body">
            <div class="rp-count-label">{idle ? 'Reminders' : 'Next reminder'}</div>
            <div class="rp-count-name">{idle ? 'No upcoming reminders' : this.nextTitle || 'Reminder'}</div>
          </div>
          {!idle && <div class={{ 'rp-count-time': true, 'rp-count-time--warn': imminent }}>{timeText}</div>}
          {!this.showHeader && this.renderGear()}
        </div>
        {!idle && <div class="rp-drain" style={{ '--pct': `${pct}%` }} aria-hidden="true"></div>}
      </div>
    );
  }

  private renderRinging(ring: { id: string; title: string } | null) {
    if (!ring) return null;
    return (
      <div class="rp-ringing" role="alert">
        <span class="rp-ringing-title">🔔 {ring.title}</span>
        <div class="rp-ringing-actions">
          <button
            type="button"
            class="rp-btn"
            onClick={() => (ring.id ? this.popSnooze.emit({ id: ring.id, minutes: 10 }) : this.popStopRing.emit())}
          >
            Snooze 10m
          </button>
          <button
            type="button"
            class="rp-btn rp-btn--primary"
            onClick={() => (ring.id ? this.popDismiss.emit({ id: ring.id }) : this.popStopRing.emit())}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  private renderSettings(alarm: AlarmSettingsView, sounds: AlarmSoundOption[]) {
    if (!this.settingsOpen) return null;
    return (
      <div class="rp-settings">
        <div class="rp-set-row">
          <span class="rp-set-label">Sound</span>
          <div class="rp-sounds" role="radiogroup" aria-label="Alarm sound">
            {sounds.map((s) => (
              <button
                type="button"
                class={{ 'rp-sound': true, 'rp-sound--on': alarm.sound === s.id }}
                aria-pressed={alarm.sound === s.id ? 'true' : 'false'}
                onClick={() => {
                  this.unlock();
                  this.setAlarm({ sound: s.id }, true);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div class="rp-set-row">
          <span class="rp-set-label">Volume</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(alarm.volume * 100)}
            aria-label="Alarm volume"
            onInput={(e) => this.setAlarm({ volume: Number((e.target as HTMLInputElement).value) / 100 }, false)}
            onChange={() => this.setAlarm({}, true)}
          />
        </div>
        <div class="rp-set-row">
          <span class="rp-set-label">Sound</span>
          <pop-switch label="Sound" checked={alarm.soundOn} onPopChange={(e: CustomEvent<boolean>) => this.setAlarm({ soundOn: e.detail }, false)} />
        </div>
        <div class="rp-set-row">
          <span class="rp-set-label">Vibration</span>
          <pop-switch label="Vibration" checked={alarm.vibrateOn} onPopChange={(e: CustomEvent<boolean>) => this.setAlarm({ vibrateOn: e.detail }, false)} />
        </div>
        <div class="rp-set-row">
          <span class="rp-set-label">Push notification</span>
          <pop-switch label="Push notification" checked={alarm.pushOn} onPopChange={(e: CustomEvent<boolean>) => this.setAlarm({ pushOn: e.detail }, false)} />
        </div>
        <div class="rp-set-row rp-set-row--test">
          <button type="button" class="rp-btn" onClick={() => { this.unlock(); this.popAlarmTest.emit(); }}>
            ▶ Test alarm
          </button>
        </div>
      </div>
    );
  }

  private renderControls(counts: ReminderFilterCounts) {
    const countFor = (id: string): number => (counts as unknown as Record<string, number>)[id] ?? 0;
    return (
      <div class="rp-controls">
        <div class="rp-search">
          <pop-icon name="search-outline" />
          <input
            type="search"
            placeholder="Search reminders…"
            value={this.searchText}
            aria-label="Search reminders"
            onInput={(e) => this.popSearchChange.emit({ search: (e.target as HTMLInputElement).value })}
          />
        </div>
        <div class="rp-seg" role="radiogroup" aria-label="Filter">
          {REMINDER_FILTERS.map((f) => {
            const n = countFor(f.id);
            const alert = f.id === 'overdue' && n > 0;
            return (
              <button
                type="button"
                class={{ 'rp-seg-btn': true, 'rp-seg-btn--on': this.filter === f.id }}
                aria-pressed={this.filter === f.id ? 'true' : 'false'}
                onClick={() => this.popFilterChange.emit({ filter: f.id })}
              >
                {f.label} <span class={{ 'rp-n': true, 'rp-n--alert': alert }}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  private renderCreate() {
    return (
      <div class="rp-create">
        <input
          class="rp-field"
          placeholder="Remind me to…"
          value={this.createTitle}
          aria-label="Reminder title"
          onInput={(e) => (this.createTitle = (e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && this.submitCreate()}
        />
        <div class="rp-create-row2">
          <input
            class="rp-field"
            type="datetime-local"
            aria-label="When"
            value={this.createTime}
            onInput={(e) => (this.createTime = (e.target as HTMLInputElement).value)}
          />
          <button type="button" class="rp-btn rp-btn--primary" onClick={this.submitCreate}>
            Add
          </button>
        </div>
      </div>
    );
  }

  private renderRow(r: ReminderRow, ringId: string | null) {
    if (this.editingId === r.id) {
      return (
        <li class="rp-row rp-row--edit" key={r.id}>
          <div class="rp-edit-fields">
            <input
              class="rp-field"
              value={this.editTitle}
              aria-label="Title"
              onInput={(e) => (this.editTitle = (e.target as HTMLInputElement).value)}
            />
            <input
              class="rp-field"
              type="datetime-local"
              aria-label="When"
              value={this.editTime}
              onInput={(e) => (this.editTime = (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="rp-row-actions">
            <button type="button" class="rp-btn rp-btn--primary" onClick={() => this.saveEdit()}>Save</button>
            <button type="button" class="rp-btn" onClick={() => (this.editingId = null)}>Cancel</button>
          </div>
        </li>
      );
    }
    const ringingThis = !!ringId && ringId === r.id;
    const deadline = r.fireInMs != null ? this.nowMs + r.fireInMs : null; // relative label only needs a sign; host sends fresh fireInMs each fetch
    const overdue = r.overdue || (deadline != null && deadline < this.nowMs);
    // Prefer the server-sent overdue flag / reminderAt for the relative label,
    // falling back to fireInMs — but fireInMs is measured from the fetch baseline,
    // so for the row label we lean on reminderAt when present.
    const rel = r.reminderAt ? relativeShort(Date.parse(r.reminderAt), this.nowMs) : r.fireInMs != null ? relativeShort(this.nowMs + r.fireInMs, this.nowMs) : '';
    return (
      <li class={{ 'rp-row': true, 'rp-row--overdue': overdue && !ringingThis, 'rp-row--ring': ringingThis }} key={r.id}>
        <span class="rp-row-glyph">{ringingThis ? '🔔' : '⏰'}</span>
        <div class="rp-row-main">
          <div class="rp-row-title">
            {r.title}
            {r.recurring && <span class="rp-badge" title="Recurring">🔁</span>}
          </div>
          <div class="rp-row-when">
            {formatWhen(r.reminderAt, new Date(this.nowMs))}
            {rel && <span class={{ 'rp-rel': true, 'rp-rel--over': overdue }}> · {rel}</span>}
          </div>
        </div>
        <div class="rp-row-actions">
          <div class="rp-snoozewrap">
            <button
              type="button"
              class="rp-a"
              aria-label={`Snooze ${r.title}`}
              onClick={() => (this.snoozeMenuId = this.snoozeMenuId === r.id ? null : r.id)}
            >
              <pop-icon name="alarm-outline" />
            </button>
            {this.snoozeMenuId === r.id && (
              <div class="rp-snoozemenu" role="menu">
                {SNOOZE_CHOICES.map((m) => (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      this.snoozeMenuId = null;
                      this.popSnooze.emit({ id: r.id, minutes: m });
                    }}
                  >
                    {m < 60 ? `${m} min` : '1 hour'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" class="rp-a" aria-label={`Dismiss ${r.title}`} onClick={() => this.popDismiss.emit({ id: r.id })}>
            <pop-icon name="checkmark-outline" />
          </button>
          <button type="button" class="rp-a" aria-label={`Edit ${r.title}`} onClick={() => this.startEdit(r)}>
            <pop-icon name="create-outline" />
          </button>
          <button type="button" class="rp-a rp-a--danger" aria-label={`Delete ${r.title}`} onClick={() => this.popDelete.emit({ id: r.id })}>
            <pop-icon name="trash-outline" />
          </button>
        </div>
      </li>
    );
  }

  render() {
    const reminders = this.parse<ReminderRow[]>(this.reminders, []);
    const counts = this.parse<ReminderFilterCounts>(this.counts, { upcoming: 0, today: 0, overdue: 0, recurring: 0 });
    const alarm = this.parse<AlarmSettingsView>(this.alarm, DEFAULT_ALARM_SETTINGS);
    const sounds = this.parse<AlarmSoundOption[]>(this.sounds, DEFAULT_ALARM_SOUNDS);
    const ring = this.parse<{ id: string; title: string } | null>(this.ringing, null);
    const ringId = ring ? ring.id : null;
    const empty = reminders.length === 0;

    return (
      <Host>
        <section class="rp" aria-label="Reminders" onPointerDown={this.unlock}>
          {this.renderHead()}
          {this.renderHero()}
          {this.renderRinging(ring)}
          {this.renderSettings(alarm, sounds)}
          {this.renderControls(counts)}
          {this.renderCreate()}

          {this.error && empty ? (
            <div class="rp-state rp-state--err">
              <ion-icon name="cloud-offline-outline" aria-hidden="true" />
              <span>{this.error}</span>
              <button type="button" class="rp-btn" onClick={() => this.popRefresh.emit()}>Retry</button>
            </div>
          ) : empty && this.loading ? (
            <div class="rp-state">Loading…</div>
          ) : empty ? (
            <div class="rp-state">
              <ion-icon name="alarm-outline" aria-hidden="true" />
              <span>{this.searchText || this.filter !== 'upcoming' ? 'Nothing matches.' : 'No reminders set.'}</span>
            </div>
          ) : (
            <ul class="rp-list">{reminders.map((r) => this.renderRow(r, ringId))}</ul>
          )}

          <div class="rp-disclaimer">
            Reminders are the same transient tasks the bot fires. Countdown is clock-skew-safe. Alarm rings in-tab; a push wakes a closed app (OS notification sound + vibration).
          </div>
        </section>
      </Host>
    );
  }
}
