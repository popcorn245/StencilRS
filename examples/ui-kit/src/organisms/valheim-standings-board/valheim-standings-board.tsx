import { Component, Prop, State, h } from '@stencil/core';

export interface ValheimStandingRow {
  name: string;
  /** Rune avatar glyph. */
  rune?: string;
  /** PvP kills — finale-only flavor; NOT shown on the default co-op table. */
  kills: number;
  /** Deaths to the world/monsters — the lighthearted "Falls" column. */
  deaths: number;
  bounties: number;
  coin: number;
  /** Bosses felled / boss nights fought — co-op progress. */
  bosses?: number;
}

export interface ValheimJuggernautState {
  active: boolean;
  targetName?: string;
  bounty?: number;
  pvpOn?: boolean;
}

/**
 * `valheim-standings-board` — "The Pantheon", the hall-of-the-worthy standings
 * block of the Popcorn's Pantheon surfaces. Theme-agnostic via the `--vlh-*`
 * token layer.
 *
 * The Pantheon (default view) is CO-OP: bounties · coin · bosses · Falls
 * (deaths to the world — playful ribbing, never PvP kills), with medal ranks.
 * Juggernaut: the hidden FINALE bounty board — PvP banner, the current target
 * and their price. The Juggernaut toggle only renders once the finale is
 * `active` (or for admins) — PvP is never the everyday framing, and the
 * toggle's existence would leak the season-end twist to players.
 */
@Component({
  tag: 'valheim-standings-board',
  encapsulation: { type: 'scoped' },
  styleUrls: ['../valheim-base.css', 'valheim-standings-board.css'],
})
export class ValheimStandingsBoard {
  /** JSON array of ValheimStandingRow, rank order. */
  @Prop() standings = '[]';
  /** JSON ValheimJuggernautState ('' = no finale state yet). */
  @Prop() juggernaut = '';
  /** Admins see the Juggernaut toggle even before the finale goes live. */
  @Prop() isAdmin = false;
  @Prop() heading = 'The Pantheon';

  @State() mode: 'league' | 'jug' = 'league';

  private get parsedStandings(): ValheimStandingRow[] {
    try {
      const v = JSON.parse(this.standings);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  private get parsedJug(): ValheimJuggernautState | null {
    if (!this.juggernaut) return null;
    try {
      const v = JSON.parse(this.juggernaut);
      return v && typeof v === 'object' ? v : null;
    } catch {
      return null;
    }
  }

  private fmt(n: number): string {
    return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
  }

  private renderLeague(rows: ValheimStandingRow[]) {
    if (!rows.length) {
      return <div class="vsb-empty">The Pantheon stands empty — the saga has not begun.</div>;
    }
    return [
      <table class="vsb-board">
        <thead>
          <tr>
            <th class="vsb-l">#</th>
            <th class="vsb-l">Warrior</th>
            <th>Bounties</th>
            <th>Coin</th>
            <th title="Bosses felled together">Bosses</th>
            <th title="Deaths to the world — the monsters keep count">Falls</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name}>
              <td class="vsb-l">
                <span class={{ 'vsb-rank': true, [`vsb-rank--g${i + 1}`]: i < 3 }}>{i + 1}</span>
              </td>
              <td class="vsb-l">
                <div class="vsb-w">
                  {r.rune && <span class="vlh-rune vsb-rune">{r.rune}</span>}
                  <span class="vsb-nm">{r.name}</span>
                </div>
              </td>
              <td>{this.fmt(r.bounties)}</td>
              <td class="vsb-coin">
                {this.fmt(r.coin)}
                <span class="vlh-cn">⬤</span>
              </td>
              <td>{this.fmt(r.bosses ?? 0)}</td>
              <td class="vsb-falls">{this.fmt(r.deaths)}</td>
            </tr>
          ))}
        </tbody>
      </table>,
      <div class="vlh-legend vsb-coop">
        <pop-icon name="people-outline" /> Co-Op world with PvP events.
      </div>,
    ];
  }

  private renderJuggernaut(jug: ValheimJuggernautState | null) {
    if (!jug?.active) {
      return (
        <div class="vsb-empty">
          The Juggernaut finale has not begun. When the eighth boss falls, the truce breaks…
        </div>
      );
    }
    return (
      <div class="vsb-jug">
        <div class="vsb-jugbanner">
          <pop-icon class="vsb-jb-ic" name="flame" />
          <div>
            <div class="vsb-jb-t">Juggernaut finale</div>
            <div class="vsb-jb-s">The truce is broken — every warrior is fair game.</div>
          </div>
          <span class={{ 'vsb-pvp': true, 'vsb-pvp--off': !jug.pvpOn }}>{jug.pvpOn ? 'PvP ON' : 'PvP OFF'}</span>
        </div>
        {jug.targetName && (
          <div class="vsb-target">
            <span class="vlh-rune">ᚦ</span>
            <div>
              <div class="vsb-tc-name">{jug.targetName}</div>
              <div class="vsb-tc-tag">The Juggernaut — a price on their head</div>
            </div>
            {jug.bounty != null && (
              <div class="vsb-bounty">
                <div class="vsb-b-lab">Bounty</div>
                <div class="vsb-b-val">{this.fmt(jug.bounty)}</div>
              </div>
            )}
          </div>
        )}
        <div class="vsb-jugnote">
          <pop-icon name="skull-outline" /> Slay the leader to claim the crown. Most bounty kills wins the saga.
        </div>
      </div>
    );
  }

  render() {
    const rows = this.parsedStandings;
    const jug = this.parsedJug;
    const showJugTab = !!jug?.active || this.isAdmin;
    const mode = showJugTab ? this.mode : 'league';
    return (
      <section class="vlh-block valheim-standings-board">
        <div class="vlh-block-h">
          <div class="vlh-ic">
            <pop-icon name="trophy-outline" />
          </div>
          <div class="vlh-grow">
            <h3>{this.heading}</h3>
          </div>
        </div>
        {showJugTab && (
          <div class="vsb-tabs">
            <button class={{ 'vsb-on': mode === 'league' }} onClick={() => (this.mode = 'league')}>
              <pop-icon name="ribbon-outline" /> League
            </button>
            <button class={{ 'vsb-jugbtn': true, 'vsb-on': mode === 'jug' }} onClick={() => (this.mode = 'jug')}>
              <pop-icon name="skull-outline" /> Juggernaut
            </button>
          </div>
        )}
        {mode === 'league' ? this.renderLeague(rows) : this.renderJuggernaut(jug)}
      </section>
    );
  }
}
