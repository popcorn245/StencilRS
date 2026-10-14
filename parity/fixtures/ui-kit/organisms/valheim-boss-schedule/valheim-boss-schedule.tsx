import { Component, Prop, State, Event, EventEmitter, Watch, h } from '@stencil/core';

export type ValheimBossStatus = 'done' | 'now' | 'soon' | 'finale';

/** Trial kind — the season alternates BOSS weeks and EVENT weeks (mini-game
 *  competitions for prizes, some opt-in PvP). Absent = 'boss'. */
export type ValheimTrialKind = 'boss' | 'event';

/** One agenda row — a TRIAL: a boss (default) or an event week. */
export interface ValheimBossItem {
  id?: string;
  name: string;
  biome?: string;
  /** Display slot, e.g. "Week 3" / "Weeks 4–5". */
  week?: string;
  status: ValheimBossStatus;
  /** 'boss' when absent (graceful default). */
  kind?: ValheimTrialKind;
  /** Event trials: the prize on the line. */
  prize?: string;
  /** Event trials: true when the mini-game is opt-in PvP. */
  pvp?: boolean;
  /** Widened late-season 2-week slot. */
  slot2?: boolean;
  /** Announced to players. `done`/`now` imply revealed. */
  revealed?: boolean;
}

/**
 * `valheim-boss-schedule` — the trials block of the Popcorn's Pantheon
 * surfaces: the next-trial target card (+ live trial-night countdown + RSVP
 * row) and the agenda list. Theme-agnostic via the `--vlh-*` token layer.
 *
 * TRIAL SECRECY / NEXT-ONLY (the standardization rule both surfaces share):
 * players see ONLY announced (`revealed`) + past trials — everything else
 * collapses into ONE sealed teaser row ("??? · the gods reveal one trial at a
 * time") so not even the season's length or week numbering leaks (player rows
 * also drop their `week` labels). `isAdmin` overrides and shows the full
 * agenda with week slots (the hub panel is admin-facing). The finale row stays
 * sealed to players until the season-end reveal.
 */
@Component({
  tag: 'valheim-boss-schedule',
  encapsulation: { type: 'scoped' },
  styleUrls: ['../valheim-base.css', 'valheim-boss-schedule.css'],
})
export class ValheimBossSchedule {
  /** JSON array of ValheimBossItem, season order. */
  @Prop() bosses = '[]';
  /** Admin view — full schedule, sealed rows included. */
  @Prop() isAdmin = false;
  /** Raiders who answered the horn for the current boss night. */
  @Prop() rsvpCount?: number;
  /** Epoch ms of the next boss night (drives the countdown). */
  @Prop() bossNightAt?: number;
  /** Render the agenda list (false = the Overview "next trial" glance). */
  @Prop() showList = true;
  /** Show the "Answer the horn" CTA on the RSVP row. Admin dashboards that
   *  only MONITOR the count (the RSVP flow is bot-run) pass false. */
  @Prop() rsvpCta = true;
  @Prop() heading = 'The trials';

  /** RSVP button — the HOST records the answer. */
  @Event() valheimRsvp!: EventEmitter<void>;

  @State() nowTick = Date.now();
  private timer?: ReturnType<typeof setInterval>;

  connectedCallback() {
    this.syncTimer();
  }
  disconnectedCallback() {
    this.stopTimer();
  }

  @Watch('bossNightAt')
  onBossNightChange() {
    this.syncTimer();
  }

  /** Only tick (a re-render per second) while there's a countdown to show. */
  private syncTimer() {
    this.stopTimer();
    if (this.bossNightAt) {
      this.timer = setInterval(() => (this.nowTick = Date.now()), 1000);
    }
  }
  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private get parsedBosses(): ValheimBossItem[] {
    try {
      const v = JSON.parse(this.bosses);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  /** Announced-to-players (independent of the admin override). */
  private revealedToPlayers(b: ValheimBossItem): boolean {
    return b.status === 'done' || b.status === 'now' || b.revealed === true;
  }

  private countdown(): string {
    if (!this.bossNightAt) return '';
    let s = Math.max(0, Math.floor((this.bossNightAt - this.nowTick) / 1000));
    const d = Math.floor(s / 86400);
    s -= d * 86400;
    const hh = Math.floor(s / 3600);
    s -= hh * 3600;
    const mm = Math.floor(s / 60);
    s -= mm * 60;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d}d ${p(hh)}:${p(mm)}:${p(s)}`;
  }

  private renderTarget(current: ValheimBossItem | undefined) {
    if (!current) return null;
    const cd = this.countdown();
    const isEvent = current.kind === 'event';
    // Event trials lead with the prize; bosses keep their biome flavor. NEXT-
    // ONLY: players never see week numbering.
    const meta = isEvent
      ? [this.isAdmin ? current.week : undefined, current.prize ? `Prize: ${current.prize}` : undefined]
      : [this.isAdmin ? current.week : undefined, current.biome];
    return (
      <div class={{ 'vbs-target': true, 'vbs-target--event': isEvent }}>
        <div class="vbs-sigil">
          <pop-icon name={isEvent ? 'trophy-outline' : 'skull-outline'} />
        </div>
        <div>
          <div class="vbs-name">
            {current.name}
            {isEvent && current.pvp && <span class="vbs-pvptag">Opt-in PvP</span>}
          </div>
          <div class="vbs-tag">{meta.filter(Boolean).join(' · ') || 'The next trial'}</div>
        </div>
        {cd && (
          <div class="vbs-countdown">
            <div class="vbs-cd-lab">{isEvent ? 'Event night in' : 'Boss night in'}</div>
            <div class="vbs-cd-val">{cd}</div>
          </div>
        )}
      </div>
    );
  }

  private renderRsvp() {
    if (this.rsvpCount == null) return null;
    return (
      <div class="vbs-rsvp">
        <pop-icon name="megaphone-outline" />
        <span>
          <b>{this.rsvpCount}</b> raiders answered the horn
        </span>
        {this.rsvpCta && (
          <button class="vlh-btn vlh-btn--sm vbs-rsvp-go" onClick={() => this.valheimRsvp.emit()}>
            Answer the horn
          </button>
        )}
      </div>
    );
  }

  /** The single sealed teaser row players see in place of the rest of the
   *  agenda — ONE row regardless of what remains, so nothing about the
   *  season's length leaks. */
  private renderSealedTeaser() {
    return (
      <div class="vbs-row vbs-row--sealed">
        <div class="vbs-node">
          <pop-icon name="lock-closed" />
        </div>
        <div class="vbs-rbody">
          <div class="vbs-rname">???</div>
          <div class="vbs-rmeta">Sealed — the gods reveal one trial at a time</div>
        </div>
        <span class="vlh-st vlh-st--sealed">Sealed</span>
      </div>
    );
  }

  private renderRow(b: ValheimBossItem) {
    // Defense in depth: player lists are pre-filtered to revealed rows in
    // render(), but a stray sealed row still never leaks name/biome/week.
    const open = this.isAdmin || this.revealedToPlayers(b);
    if (!open) return this.renderSealedTeaser();
    const isEvent = b.kind === 'event';
    const icon = isEvent
      ? b.status === 'done'
        ? 'checkmark'
        : 'trophy-outline'
      : b.status === 'done'
        ? 'checkmark'
        : b.status === 'now'
          ? 'flame'
          : b.status === 'finale'
            ? 'sparkles'
            : 'ellipse-outline';
    const pill =
      b.status === 'done' ? (
        <span class="vlh-st vlh-st--done">{isEvent ? 'Held' : 'Fallen'}</span>
      ) : b.status === 'now' ? (
        <span class="vlh-st vlh-st--now">{isEvent ? 'Event' : 'This week'}</span>
      ) : b.status === 'finale' ? (
        <span class="vlh-st vlh-st--sealed">Finale</span>
      ) : (
        <span class="vlh-st vlh-st--soon">{isEvent ? 'Event' : 'Upcoming'}</span>
      );
    // Event trials lead with the prize; bosses keep their biome flavor.
    const meta = isEvent
      ? [this.isAdmin ? b.week : undefined, b.prize ? `Prize: ${b.prize}` : undefined]
      : [this.isAdmin ? b.week : undefined, b.biome];
    return (
      <div class={{ 'vbs-row': true, [`vbs-row--${b.status}`]: true, 'vbs-row--event': isEvent }}>
        <div class="vbs-node">
          <pop-icon name={icon} />
        </div>
        <div class="vbs-rbody">
          <div class="vbs-rname">
            {b.name}
            {isEvent && b.pvp && <span class="vbs-pvptag">Opt-in PvP</span>}
            {this.isAdmin && b.slot2 && <span class="vbs-slot2">2-week slot</span>}
          </div>
          {/* Players never see week numbering — the agenda is next-only. */}
          <div class="vbs-rmeta">{meta.filter(Boolean).join(' · ')}</div>
        </div>
        {pill}
      </div>
    );
  }

  render() {
    const bosses = this.parsedBosses;
    const current = bosses.find((b) => b.status === 'now');
    // NEXT-ONLY for players: only revealed/past trials render as rows; the
    // entire rest of the agenda is ONE sealed teaser (never a row per slot).
    const rows = this.isAdmin ? bosses : bosses.filter((b) => this.revealedToPlayers(b));
    const showAgenda = this.showList && (rows.length > 0 || !this.isAdmin);
    return (
      <section class="vlh-block valheim-boss-schedule">
        <div class="vlh-block-h">
          <div class="vlh-ic vlh-ic--danger">
            <pop-icon name="skull-outline" />
          </div>
          <div class="vlh-grow">
            <h3>{this.heading}</h3>
          </div>
        </div>
        {this.renderTarget(current)}
        {this.renderRsvp()}
        {showAgenda && (
          <div class="vbs-list">
            {rows.map((b) => this.renderRow(b))}
            {!this.isAdmin && this.renderSealedTeaser()}
          </div>
        )}
        {showAgenda && (
          <div class={{ 'vlh-legend': true, 'vlh-legend--adm': this.isAdmin, 'vlh-legend--pub': !this.isAdmin }}>
            <pop-icon name={this.isAdmin ? 'eye-outline' : 'lock-closed-outline'} />
            {this.isAdmin
              ? 'Admin view — the full agenda, including sealed trials. Players only ever see the next trial.'
              : 'The gods reveal one trial at a time — the rest of the saga stays sealed.'}
          </div>
        )}
      </section>
    );
  }
}
