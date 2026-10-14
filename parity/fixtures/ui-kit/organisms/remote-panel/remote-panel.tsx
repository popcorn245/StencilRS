import { Component, Prop, State, Event, EventEmitter, Element, h, Host } from '@stencil/core';
import {
  ACTIVITY_OFF_ID,
  REMOTE_CALIBRATE_MIN,
  REMOTE_CALIBRATE_MAX,
  activityIcon,
  clampLevel,
  clampNumber,
  playToggleIcon,
  REMOTE_APPS,
  TRANSPORT_BUTTONS,
  type RemoteActivity,
  type RemoteCurrent,
  type RemoteRoom,
  type RemoteRoomDevice,
  type TransportAction,
  type PlayState,
} from './remote-panel.helpers';

/**
 * pop-remote-panel — the unified AV control surface (organism).
 *
 * Presentation-only sibling of the Bucket Hub's `hub-remote`: it renders the
 * room switcher, the Harmony status line + activities + volume, and the Shield
 * transport row + app launcher, and emits `pop*` events. The HOST owns the
 * network (hubApi), optimistic mutations and the PanelShell chrome — this
 * component just displays the data it is handed.
 *
 * Two capability sets, each SECTION gated by its own flag:
 *   • Harmony (`harmonyEnabled`) — activities · volume · room switcher · status.
 *   • Shield transport (`transportEnabled`) — playback row · app launcher.
 *
 * Object props (`activities`, `current`, `rooms`) accept an object (property
 * binding) OR a JSON string (attribute — how Storybook / plain HTML pass them),
 * parsed defensively.
 *
 * ── Three approved UX behaviors (honest to the IR-relative hardware) ──────────
 *   1. Volume SLIDER + hold-to-repeat. The Harmony receiver is IR-RELATIVE (step
 *      up/down only — no absolute-set API), so the slider is a visual level that
 *      emits `popVolumeStep` as it crosses each unit; the ± buttons press-and-hold
 *      to repeat (~90ms after a 300ms delay). `current.level` drives the readout.
 *   2. Mute reflects the `muted` prop (amber treatment + dimmed level). There is
 *      NO server truth for mute (the toggle returns no state) — the host owns
 *      `muted` as an optimistic local toggle.
 *   3. Play/pause reflects `playState` (derived by the host from the primary
 *      room's device state); the center transport button is emphasized + shows
 *      ▶ vs ⏸. 'unknown' → the host keeps the toggle optimistic.
 */
@Component({
  tag: 'pop-remote-panel',
  encapsulation: { type: 'scoped' },
  styleUrl: 'remote-panel.css',
})
export class PopRemotePanel {
  @Element() hostEl!: HTMLElement;

  /** Harmony activities (object OR JSON string). */
  @Prop() activities: RemoteActivity[] | string = [];
  /** Current AV snapshot: active activity + tracked receiver level (object OR JSON string). */
  @Prop() current: RemoteCurrent | string = { level: 0, known: false };
  /** The /av rooms for the switcher (object OR JSON string). */
  @Prop() rooms: RemoteRoom[] | string = [];
  /** The selected room's area, or null → default to the primary (Harmony) room. */
  @Prop() selectedArea: string | null = null;
  /** The active primary-room "what's playing" app name (e.g. "Netflix"), or ''. */
  @Prop() nowPlaying = '';
  /** Whether the Harmony sections (activities · volume · switcher · status) show. */
  @Prop() harmonyEnabled = false;
  /** Whether the Shield transport sections (playback · apps) show. */
  @Prop() transportEnabled = false;
  /** Mute state — optimistic local toggle owned by the host (no server truth). */
  @Prop() muted = false;
  /** Derived transport state driving the emphasized play/pause button. */
  @Prop() playState: PlayState = 'unknown';
  /** Loading (initial Harmony fetch) — a subtle inline spinner. */
  @Prop() loading = false;
  /** A blocking error message (e.g. "Could not reach the Remote."). */
  @Prop() error = '';
  /** Harmony degraded (hub unreachable, default controls shown). */
  @Prop() degraded = false;
  /** A transient status note ("Starting Watch TV…"). */
  @Prop() statusNote = '';
  /** The activity id the host optimistically marked pending (spinner). '' = none. */
  @Prop() pendingActivityId = '';
  /** Receiver volume bounds — mirror the host's REMOTE_CALIBRATE_*. */
  @Prop() calibrateMin = REMOTE_CALIBRATE_MIN;
  @Prop() calibrateMax = REMOTE_CALIBRATE_MAX;
  /** Base path the app-logo SVGs are served from (host copies them into www/). */
  @Prop() appAssetBase = '/assets/apps';

  /** Room-switcher popover open (local UI). */
  @State() roomMenuOpen = false;
  /** Calibrate mini-form open (local UI). */
  @State() calibrateOpen = false;
  /** The value typed into the calibrate field. */
  @State() calibrateValue = '';
  /** Live slider preview level while dragging / just after a ± press (else null →
   *  the readout follows `current.level` from the host). */
  @State() dragLevel: number | null = null;

  /** Fires when an activity card is tapped (activity id). */
  @Event({ composed: true, bubbles: true }) popActivityStart!: EventEmitter<string>;
  /** Fires when the red power button is tapped. */
  @Event({ composed: true, bubbles: true }) popPowerOff!: EventEmitter<void>;
  /** Fires for EACH IR volume step (slider crossing a unit, or a ± press/hold). */
  @Event({ composed: true, bubbles: true }) popVolumeStep!: EventEmitter<{ dir: 'up' | 'down' }>;
  /** Fires when the mute button is tapped (host toggles optimistic `muted`). */
  @Event({ composed: true, bubbles: true }) popMuteToggle!: EventEmitter<void>;
  /** Fires with the clamped level when the calibrate form is submitted. */
  @Event({ composed: true, bubbles: true }) popCalibrate!: EventEmitter<number>;
  /** Fires when a transport button is tapped (the action; center = 'toggle'). */
  @Event({ composed: true, bubbles: true }) popTransport!: EventEmitter<TransportAction>;
  /** Fires when a streaming-app tile is tapped (app key). */
  @Event({ composed: true, bubbles: true }) popAppLaunch!: EventEmitter<string>;
  /** Fires when a different room is picked (area). */
  @Event({ composed: true, bubbles: true }) popRoomChange!: EventEmitter<string>;
  /** Fires when the error-banner Retry is tapped. */
  @Event({ composed: true, bubbles: true }) popRetry!: EventEmitter<void>;
  /** Fires when the panel requests to close (host chrome usually owns ×; provided
   *  for standalone use). */
  @Event({ composed: true, bubbles: true }) popClose!: EventEmitter<void>;

  private sliderEl?: HTMLElement;
  private roomTriggerEl?: HTMLElement;
  /** The level the slider has emitted UP TO during the current drag. */
  private emitAnchor = 0;
  private dragging = false;
  private mutedClearedThisDrag = false;
  private holdTimeout?: ReturnType<typeof setTimeout>;
  private holdInterval?: ReturnType<typeof setInterval>;
  private dragReleaseTimer?: ReturnType<typeof setTimeout>;

  private onDocPointerDown = (e: Event) => {
    const path = (e as unknown as { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
    const menu = this.hostEl?.querySelector('.rp-roommenu');
    if (this.roomTriggerEl && path.includes(this.roomTriggerEl)) return;
    if (menu && path.includes(menu)) return;
    this.closeRoomMenu();
  };

  disconnectedCallback() {
    this.stopHold();
    clearTimeout(this.dragReleaseTimer);
    document.removeEventListener('pointerdown', this.onDocPointerDown, true);
  }

  // ── Prop parsing (object OR JSON string) ────────────────────────────────────
  private parse<T>(v: T | string, fallback: T): T {
    if (typeof v === 'string') {
      try {
        return (JSON.parse(v) as T) ?? fallback;
      } catch {
        return fallback;
      }
    }
    return (v as T) ?? fallback;
  }
  private acts(): RemoteActivity[] {
    return this.parse<RemoteActivity[]>(this.activities, []);
  }
  private cur(): RemoteCurrent {
    return this.parse<RemoteCurrent>(this.current, { level: 0, known: false });
  }
  private roomList(): RemoteRoom[] {
    return this.parse<RemoteRoom[]>(this.rooms, []);
  }

  // ── Room derivation ─────────────────────────────────────────────────────────
  private get primaryRoom(): RemoteRoom | undefined {
    return this.roomList().find((r) => r.primary);
  }
  private get activeRoom(): RemoteRoom | undefined {
    if (this.selectedArea) return this.roomList().find((r) => r.area === this.selectedArea);
    return this.primaryRoom;
  }
  private get onPrimary(): boolean {
    const active = this.activeRoom;
    return !active || !!active.primary;
  }
  private get canSwitch(): boolean {
    return this.roomList().length >= 2;
  }
  private get activeId(): string | undefined {
    return this.pendingActivityId || this.cur().activityId;
  }

  // ── Room switcher ───────────────────────────────────────────────────────────
  private toggleRoomMenu = () => {
    if (!this.canSwitch) return;
    if (this.roomMenuOpen) this.closeRoomMenu();
    else this.openRoomMenu();
  };
  private openRoomMenu() {
    this.roomMenuOpen = true;
    document.addEventListener('pointerdown', this.onDocPointerDown, true);
  }
  private closeRoomMenu() {
    if (this.roomMenuOpen) this.roomMenuOpen = false;
    document.removeEventListener('pointerdown', this.onDocPointerDown, true);
  }
  private pickRoom(area: string) {
    this.closeRoomMenu();
    this.popRoomChange.emit(area);
  }
  private onRoomMenuKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeRoomMenu();
    }
  };

  // ── Volume (IR-relative step model) ─────────────────────────────────────────
  private get max(): number {
    return this.calibrateMax > 0 ? this.calibrateMax : 60;
  }
  /** The level shown in the readout/slider: the live drag preview, else host truth. */
  private displayLevel(): number {
    return this.dragLevel != null ? this.dragLevel : this.cur().level;
  }
  /** Raw step emit (used by the slider — no optimistic bump). */
  private emitStepRaw(dir: 'up' | 'down') {
    this.popVolumeStep.emit({ dir });
  }
  /** ± button step: optimistic +1/−1 preview, unmute-on-adjust, then emit. */
  private emitStep(dir: 'up' | 'down') {
    if (this.muted) this.popMuteToggle.emit();
    const next = clampLevel(this.displayLevel() + (dir === 'up' ? 1 : -1), this.max);
    this.setDragLevel(next, true);
    this.emitStepRaw(dir);
  }
  /** Set the drag preview level; `release` schedules a fade back to host truth. */
  private setDragLevel(n: number, release: boolean) {
    this.dragLevel = n;
    clearTimeout(this.dragReleaseTimer);
    if (release) {
      // Give queued IR steps time to resolve + report the real level, then let
      // `current.level` take over the readout.
      this.dragReleaseTimer = setTimeout(() => (this.dragLevel = null), 900);
    }
  }
  private levelFromClientX(clientX: number): number {
    if (!this.sliderEl) return this.displayLevel();
    const r = this.sliderEl.getBoundingClientRect();
    if (r.width <= 0) return this.displayLevel();
    const pct = (clientX - r.left) / r.width;
    return clampLevel(pct * this.max, this.max);
  }
  private onSliderDown = (e: PointerEvent) => {
    this.dragging = true;
    this.mutedClearedThisDrag = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    this.emitAnchor = this.cur().level;
    this.dragTo(e.clientX);
  };
  private onSliderMove = (e: PointerEvent) => {
    if (this.dragging) this.dragTo(e.clientX);
  };
  private onSliderUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    // Persist the preview briefly so the thumb doesn't snap back before the
    // queued steps report the new level.
    this.setDragLevel(this.displayLevel(), true);
  };
  private dragTo(clientX: number) {
    const target = this.levelFromClientX(clientX);
    if (this.muted && !this.mutedClearedThisDrag) {
      this.mutedClearedThisDrag = true;
      this.popMuteToggle.emit();
    }
    // Emit one step per unit crossed since the last emit (throttled by pointermove
    // cadence). The host coalesces/queues so rapid steps don't stampede the API.
    while (this.emitAnchor < target) {
      this.emitStepRaw('up');
      this.emitAnchor++;
    }
    while (this.emitAnchor > target) {
      this.emitStepRaw('down');
      this.emitAnchor--;
    }
    this.setDragLevel(target, false);
  }

  private startHold(dir: 'up' | 'down') {
    this.emitStep(dir);
    this.stopHold();
    this.holdTimeout = setTimeout(() => {
      this.holdInterval = setInterval(() => this.emitStep(dir), 90);
    }, 300);
  }
  private stopHold = () => {
    clearTimeout(this.holdTimeout);
    clearInterval(this.holdInterval);
  };

  // ── Calibrate ───────────────────────────────────────────────────────────────
  private openCalibrate = () => {
    const c = this.cur();
    this.calibrateValue = c.known ? String(c.level) : '';
    this.calibrateOpen = true;
  };
  private cancelCalibrate = () => {
    this.calibrateOpen = false;
    this.calibrateValue = '';
  };
  private submitCalibrate = () => {
    const level = clampNumber(this.calibrateValue, this.calibrateMin, this.calibrateMax);
    if (level == null) return;
    this.calibrateOpen = false;
    this.calibrateValue = '';
    this.dragLevel = level; // reflect the calibrated number immediately
    this.setDragLevel(level, true);
    this.popCalibrate.emit(level);
  };

  // ── Render pieces ───────────────────────────────────────────────────────────
  private renderHeader() {
    const active = this.activeRoom;
    const roomName = active?.area || this.primaryRoom?.area || 'Living Room';
    const subtitle = this.onPrimary ? 'Shield Pro' : this.roomSubtitle(active);
    const switchable = this.canSwitch;
    return (
      <div class="rp-header" onKeyDown={this.onRoomMenuKeyDown}>
        <div class="rp-header-titles">
          {switchable ? (
            <button
              type="button"
              class={{ 'rp-roomtrigger': true, 'rp-roomtrigger--open': this.roomMenuOpen }}
              aria-haspopup="menu"
              aria-expanded={String(this.roomMenuOpen)}
              aria-label={`Room: ${roomName}. Change room`}
              title="Change room"
              ref={(el) => (this.roomTriggerEl = el as HTMLElement)}
              onClick={() => this.toggleRoomMenu()}
            >
              <span class="rp-room">{roomName}</span>
              <pop-icon class="rp-roomcaret" name="chevron-down-circle-outline" />
            </button>
          ) : (
            <span class="rp-room">{roomName}</span>
          )}
          <span class="rp-device">{subtitle}</span>
          {switchable && this.roomMenuOpen && this.renderRoomMenu()}
        </div>
      </div>
    );
  }

  private roomSubtitle(room: RemoteRoom | undefined): string {
    const n = room?.devices.length ?? 0;
    if (!n) return 'No devices';
    return `${n} device${n === 1 ? '' : 's'}`;
  }

  private renderRoomMenu() {
    const activeArea = this.activeRoom?.area ?? this.primaryRoom?.area;
    return (
      <div class="rp-roommenu" role="menu" aria-label="Room" onKeyDown={this.onRoomMenuKeyDown}>
        {this.roomList().map((r) => {
          const sel = r.area === activeArea;
          return (
            <button
              type="button"
              key={r.area}
              role="menuitemradio"
              aria-checked={String(sel)}
              class={{ 'rp-roomitem': true, 'rp-roomitem--active': sel }}
              onClick={() => this.pickRoom(r.area)}
            >
              <span class="rp-roomitem-emoji" aria-hidden="true">{r.emoji || '📺'}</span>
              <span class="rp-roomitem-label">{r.area}</span>
              {sel && <pop-icon class="rp-roomitem-check" name="checkmark" />}
            </button>
          );
        })}
      </div>
    );
  }

  private renderStatusLine() {
    const c = this.cur();
    const label = c.activityLabel || (this.activeId ? 'On' : 'Off');
    const isOff = this.activeId === ACTIVITY_OFF_ID;
    const poweringOff = this.pendingActivityId === ACTIVITY_OFF_ID;
    const app = this.nowPlaying;
    const playGlyph = this.playState === 'paused' ? '⏸' : '▶';
    const vol = this.muted ? 'Muted' : c.known ? `Vol ${this.displayLevel()}` : 'Vol —';
    return (
      <div class="rp-status">
        <span class="rp-status-activity">
          <span class={{ 'rp-dot': true, 'rp-dot--on': !!this.activeId && !isOff }} aria-hidden="true" />
          {app ? `${label} · ${playGlyph} ${app}` : label}
        </span>
        <span class="rp-status-vol">{vol}</span>
        <button
          type="button"
          class={{ 'rp-power': true, 'rp-power--active': isOff }}
          title="Power off"
          aria-label="Power off"
          aria-pressed={String(isOff)}
          onClick={() => this.popPowerOff.emit()}
        >
          {poweringOff ? <span class="rp-spin rp-spin--sm" aria-hidden="true" /> : <pop-icon name="power" />}
        </button>
      </div>
    );
  }

  private renderActivities() {
    return [
      <div class="rp-section-title">Activities</div>,
      <div class="rp-grid">
        {this.acts()
          .filter((a) => a.id !== ACTIVITY_OFF_ID)
          .map((a) => {
            const active = this.activeId === a.id;
            const pending = this.pendingActivityId === a.id;
            return (
              <button
                type="button"
                key={a.id}
                class={{ 'rp-act': true, 'rp-act--active': active }}
                aria-pressed={String(active)}
                onClick={() => this.popActivityStart.emit(a.id)}
              >
                {pending ? <span class="rp-spin" aria-hidden="true" /> : <pop-icon name={activityIcon(a)} />}
                <span class="rp-act-label">{a.label}</span>
              </button>
            );
          })}
      </div>,
    ];
  }

  private renderVolume() {
    const level = this.displayLevel();
    const pct = this.max > 0 ? Math.max(0, Math.min(100, (level / this.max) * 100)) : 0;
    return [
      <div class="rp-section-title-row">
        <span class="rp-section-title" style={{ marginTop: '0' }}>Volume</span>
        <button
          type="button"
          class="rp-iconbtn"
          title="Recalibrate volume"
          aria-label="Recalibrate volume"
          onClick={this.openCalibrate}
        >
          <pop-icon name="options-outline" />
        </button>
      </div>,
      <div class={{ 'rp-vol-card': true, 'rp-vol-card--muted': this.muted }}>
        <div class="rp-vol-top">
          <div class="rp-vol-readout">
            <span class="rp-vol-num">{level}</span>
            <span class="rp-vol-unit">Volume</span>
          </div>
          <span class="rp-vol-muted-badge"><pop-icon name="volume-mute" /> Muted</span>
        </div>
        <div
          class="rp-vol-slider"
          role="slider"
          aria-label="Volume"
          aria-valuemin={this.calibrateMin}
          aria-valuemax={this.calibrateMax}
          aria-valuenow={level}
          ref={(el) => (this.sliderEl = el as HTMLElement)}
          onPointerDown={this.onSliderDown}
          onPointerMove={this.onSliderMove}
          onPointerUp={this.onSliderUp}
          onPointerCancel={this.onSliderUp}
        >
          <div class="rp-vol-track" />
          <div class="rp-vol-fill" style={{ width: `${pct}%` }} />
          <div class="rp-vol-thumb" style={{ left: `${pct}%` }} />
        </div>
        <div class="rp-vol-btns">
          <button
            type="button"
            class="rp-volbtn"
            aria-label="Volume down"
            onPointerDown={(e: PointerEvent) => { e.preventDefault(); this.startHold('down'); }}
            onPointerUp={this.stopHold}
            onPointerLeave={this.stopHold}
            onPointerCancel={this.stopHold}
          >
            <pop-icon name="remove" />
            <small>Hold</small>
          </button>
          <button
            type="button"
            class={{ 'rp-volbtn': true, 'rp-volbtn--mute': true, 'rp-volbtn--muted': this.muted }}
            aria-label={this.muted ? 'Unmute' : 'Mute'}
            aria-pressed={String(this.muted)}
            onClick={() => this.popMuteToggle.emit()}
          >
            <pop-icon name={this.muted ? 'volume-mute' : 'volume-high-outline'} />
          </button>
          <button
            type="button"
            class="rp-volbtn"
            aria-label="Volume up"
            onPointerDown={(e: PointerEvent) => { e.preventDefault(); this.startHold('up'); }}
            onPointerUp={this.stopHold}
            onPointerLeave={this.stopHold}
            onPointerCancel={this.stopHold}
          >
            <pop-icon name="add" />
            <small>Hold</small>
          </button>
        </div>
      </div>,
      this.calibrateOpen && (
        <div class="rp-calibrate">
          <div class="rp-calibrate-row">
            <pop-field
              class="rp-calibrate-field"
              spec={{
                key: 'level',
                type: 'number',
                label: "What's the actual volume?",
                min: this.calibrateMin,
                max: this.calibrateMax,
                placeholder: `${this.calibrateMin}–${this.calibrateMax}`,
              }}
              value={this.calibrateValue}
              onValueChange={(e: CustomEvent<{ key: string; value: unknown }>) => {
                e.stopPropagation();
                this.calibrateValue = e.detail?.value == null ? '' : String(e.detail.value);
              }}
            />
            <button type="button" class="rp-btn" onClick={this.cancelCalibrate}>Cancel</button>
            <button
              type="button"
              class="rp-btn rp-btn--primary"
              disabled={this.calibrateValue.trim() === ''}
              onClick={this.submitCalibrate}
            >
              Set
            </button>
          </div>
        </div>
      ),
    ];
  }

  private renderTransport() {
    return [
      <div class="rp-section-title">Playback</div>,
      <div class="rp-transport" role="group" aria-label="Playback controls">
        {TRANSPORT_BUTTONS.map((b) => {
          const isPlay = !!b.primary;
          const icon = isPlay ? playToggleIcon(this.playState) : b.icon;
          return (
            <button
              type="button"
              key={b.action}
              class={{ 'rp-tbtn': true, 'rp-tbtn--play': isPlay }}
              title={b.label}
              aria-label={b.label}
              onClick={() => this.popTransport.emit(b.action)}
            >
              <pop-icon name={icon} />
            </button>
          );
        })}
      </div>,
    ];
  }

  private renderApps() {
    return [
      <div class="rp-section-title">Apps</div>,
      <div class="rp-apps-grid" role="group" aria-label="Open a streaming app">
        {REMOTE_APPS.map((a) => (
          <button
            type="button"
            key={a.key}
            class="rp-app-tile"
            aria-label={`Open ${a.label}`}
            title={`Open ${a.label}`}
            onClick={() => this.popAppLaunch.emit(a.key)}
          >
            {a.logo ? (
              <span
                class="rp-app-chip rp-app-chip--logo"
                style={{ '--app-accent': a.accent, '--app-logo': `url(${this.appAssetBase}/${a.logo}.svg)` }}
                aria-hidden="true"
              >
                <span class="rp-app-glyph" />
              </span>
            ) : (
              <span class="rp-app-chip" style={{ '--app-accent': a.accent }} aria-hidden="true">
                {a.glyph}
              </span>
            )}
            <span class="rp-app-label">{a.label}</span>
          </button>
        ))}
      </div>,
    ];
  }

  private renderNowPlaying() {
    const app = this.nowPlaying;
    return (
      <div class="rp-transport-status">
        <span class={{ 'rp-device-dot': true, 'rp-device-dot--on': !!app }} aria-hidden="true" />
        <span class="rp-transport-status-app">{app ? `Playing · ${app}` : 'Nothing playing'}</span>
      </div>
    );
  }

  private renderOtherRoom() {
    const room = this.activeRoom;
    const devices = room?.devices ?? [];
    return (
      <div class="rp-otherroom">
        <div class="rp-section-title-row">
          <span class="rp-section-title" style={{ marginTop: '0' }}>Devices</span>
          <span class="rp-readonly-badge" aria-hidden="true">Read-only</span>
        </div>
        {devices.length ? (
          <ul class="rp-devices" aria-label="Device status (read-only)">
            {devices.map((d) => this.renderRoomDevice(d))}
          </ul>
        ) : (
          <div class="rp-empty">Nothing here right now.</div>
        )}
        <div class="rp-soon">
          <pop-icon name="tv-outline" />
          <span>Status only — full remote coming soon for this room.</span>
        </div>
      </div>
    );
  }

  private renderRoomDevice(d: RemoteRoomDevice) {
    const on = d.state === 'playing' || d.state === 'paused';
    const detail = d.receiver
      ? d.input || 'Off'
      : on
        ? `${d.state === 'paused' ? '⏸' : '▶'} ${d.app || (d.state === 'paused' ? 'Paused' : 'Playing')}`
        : 'Off';
    return (
      <li class="rp-device-row" key={d.label} aria-disabled="true">
        <span class={{ 'rp-device-dot': true, 'rp-device-dot--on': on }} aria-hidden="true" />
        <span class="rp-device-name">{d.label}</span>
        <span class={{ 'rp-device-state': true, 'rp-device-state--on': on }}>{detail}</span>
      </li>
    );
  }

  private renderBody() {
    if (this.error) {
      return (
        <div class="rp-error">
          <pop-icon name="warning-outline" />
          <span>{this.error}</span>
          <button type="button" class="rp-btn" onClick={() => this.popRetry.emit()}>Retry</button>
        </div>
      );
    }
    if (!this.onPrimary) {
      return this.renderOtherRoom();
    }
    return [
      this.harmonyEnabled && this.renderStatusLine(),
      this.harmonyEnabled && this.degraded && (
        <div class="rp-degraded">
          <pop-icon name="cloud-offline-outline" />
          <span>Hub unreachable — showing default controls.</span>
        </div>
      ),
      this.harmonyEnabled && this.loading && (
        <div class="rp-loading"><span class="rp-spin rp-spin--sm" aria-hidden="true" /> Loading…</div>
      ),
      this.statusNote && <div class="rp-note" role="status">{this.statusNote}</div>,
      this.harmonyEnabled && this.renderActivities(),
      this.harmonyEnabled && this.renderVolume(),
      this.transportEnabled && !this.harmonyEnabled && this.renderNowPlaying(),
      this.transportEnabled && this.renderTransport(),
      this.transportEnabled && this.renderApps(),
    ];
  }

  render() {
    return (
      <Host>
        <section class="rp" aria-label="Remote">
          {this.renderHeader()}
          {this.renderBody()}
        </section>
      </Host>
    );
  }
}
