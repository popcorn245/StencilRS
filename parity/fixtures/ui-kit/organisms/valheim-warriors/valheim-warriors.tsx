import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';

export interface ValheimWarrior {
  name: string;
  /** Flavor line, e.g. "Axe-thegn · iron-forged". */
  class?: string;
  level?: number;
  /** Rune avatar glyph; derived from the name when omitted. */
  rune?: string;
}

export interface ValheimServerHealth {
  uptimeSec?: number;
  tps?: number;
  pingMs?: number;
  /** Epoch ms of the last world backup. */
  lastBackupAt?: number;
}

export type ValheimServerActionKind = 'restart' | 'stop' | 'backup';

const RUNES = ['ᚦ', 'ᛗ', 'ᚱ', 'ᛖ', 'ᚨ', 'ᛟ', 'ᚹ', 'ᛒ', 'ᚴ', 'ᛚ'];

/**
 * `valheim-warriors` — the online-roster + server-health block of the Valheim
 * raid-league surfaces (hub panel + public event page). Theme-agnostic: ALL
 * color/shape rides the `--vlh-*` token layer (styles/valheim-skins.css) so
 * the same component renders hub-native under `.vlh-skin--hub` and in-universe
 * under `.vlh-skin--norse`.
 *
 * Admin server ops (restart / stop / backup) render only when `isAdmin`; the
 * component never talks to a backend — it emits `valheimServerAction` and the
 * host (hub-valheim) enqueues the real `valheimCommands` outbox doc.
 */
@Component({
  tag: 'valheim-warriors',
  encapsulation: { type: 'scoped' },
  styleUrls: ['../valheim-base.css', 'valheim-warriors.css'],
})
export class ValheimWarriors {
  /** JSON array of ValheimWarrior. */
  @Prop() players = '[]';
  @Prop() maxPlayers?: number;
  /** JSON ValheimServerHealth. */
  @Prop() health = '{}';
  /** Server reachability (drives the header tone; ops still render). */
  @Prop() online = true;
  /** Admin surfaces get the server-ops row. */
  @Prop() isAdmin = false;
  @Prop() heading = 'Warriors online';

  /** Admin op tapped — the HOST performs it (outbox enqueue). */
  @Event() valheimServerAction!: EventEmitter<{ action: ValheimServerActionKind }>;

  private get parsedPlayers(): ValheimWarrior[] {
    try {
      const v = JSON.parse(this.players);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  private get parsedHealth(): ValheimServerHealth {
    try {
      const v = JSON.parse(this.health);
      return v && typeof v === 'object' ? v : {};
    } catch {
      return {};
    }
  }

  private runeFor(w: ValheimWarrior, i: number): string {
    if (w.rune) return w.rune;
    let hash = i;
    for (const ch of w.name || '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return RUNES[hash % RUNES.length];
  }

  private uptime(sec?: number): string {
    if (!sec || sec <= 0) return '—';
    const d = Math.floor(sec / 86400);
    const hLeft = Math.floor((sec - d * 86400) / 3600);
    if (d > 0) return `${d}d ${hLeft}h`;
    const m = Math.floor((sec % 3600) / 60);
    return hLeft > 0 ? `${hLeft}h ${m}m` : `${m}m`;
  }

  private backupAgo(at?: number): string {
    if (!at) return '';
    const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
    return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
  }

  render() {
    const players = this.parsedPlayers;
    const health = this.parsedHealth;
    const cap = this.maxPlayers ? ` / ${this.maxPlayers}` : '';
    const backup = this.backupAgo(health.lastBackupAt);
    return (
      <section class="vlh-block valheim-warriors">
        <div class="vlh-block-h">
          <div class="vlh-ic">
            <pop-icon name="people-outline" />
          </div>
          <div class="vlh-grow">
            <h3>{this.heading}</h3>
          </div>
          <span class={{ 'vlh-count': true, 'vw-count--down': !this.online }}>
            {this.online ? `${players.length}${cap}` : 'offline'}
          </span>
        </div>

        <div class="vw-health">
          <span class={this.online ? 'vw-ok' : 'vw-down'}>
            <pop-icon name="pulse-outline" />
            {this.online ? (
              <span>
                Uptime <b>{this.uptime(health.uptimeSec)}</b>
              </span>
            ) : (
              <span>Server unreachable</span>
            )}
          </span>
          {this.online && Number.isFinite(health.tps) && [
            <span class="vw-sep" />,
            <span>
              <b>{health.tps}</b> TPS
            </span>,
          ]}
          {this.online && Number.isFinite(health.pingMs) && [
            <span class="vw-sep" />,
            <span>
              ping <b>{health.pingMs} ms</b>
            </span>,
          ]}
        </div>

        {players.length ? (
          <div class="vlh-rows">
            {players.map((w, i) => (
              <div class="vlh-row" key={w.name}>
                <div class="vlh-rune">{this.runeFor(w, i)}</div>
                <div class="vw-body">
                  <div class="vw-name">
                    <span class="vw-live" />
                    {w.name}
                  </div>
                  {w.class && <div class="vw-class">{w.class}</div>}
                </div>
                {Number.isFinite(w.level) && <span class="vw-lvl">Lv {w.level}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div class="vw-empty">The halls are quiet — no warriors online.</div>
        )}

        {this.isAdmin && (
          <div class="vw-ops">
            <span class="vw-ops-lbl">Server</span>
            <button
              class="vlh-iconbtn"
              title="Restart server"
              onClick={() => this.valheimServerAction.emit({ action: 'restart' })}
            >
              <pop-icon name="refresh-outline" />
            </button>
            <button
              class="vlh-iconbtn vlh-iconbtn--danger"
              title="Stop server"
              onClick={() => this.valheimServerAction.emit({ action: 'stop' })}
            >
              <pop-icon name="stop-outline" />
            </button>
            <button
              class="vlh-iconbtn"
              title="Backup now"
              onClick={() => this.valheimServerAction.emit({ action: 'backup' })}
            >
              <pop-icon name="save-outline" />
            </button>
            {backup && <span class="vw-ops-hint">last backup {backup}</span>}
          </div>
        )}
      </section>
    );
  }
}
