import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h, Host } from "@stencil/core/testing";
import { ACTIVITY_OFF_ID, REMOTE_CALIBRATE_MIN, REMOTE_CALIBRATE_MAX, activityIcon, clampLevel, clampNumber, playToggleIcon, REMOTE_APPS, TRANSPORT_BUTTONS, } from './remote-panel.helpers';
export const PopRemotePanel = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popActivityStart = __stencil_createEvent(this, "popActivityStart", 7);
        this.popPowerOff = __stencil_createEvent(this, "popPowerOff", 7);
        this.popVolumeStep = __stencil_createEvent(this, "popVolumeStep", 7);
        this.popMuteToggle = __stencil_createEvent(this, "popMuteToggle", 7);
        this.popCalibrate = __stencil_createEvent(this, "popCalibrate", 7);
        this.popTransport = __stencil_createEvent(this, "popTransport", 7);
        this.popAppLaunch = __stencil_createEvent(this, "popAppLaunch", 7);
        this.popRoomChange = __stencil_createEvent(this, "popRoomChange", 7);
        this.popRetry = __stencil_createEvent(this, "popRetry", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
    }
    get hostEl() { return __stencil_getElement(this); }
    /** Harmony activities (object OR JSON string). */
    activities = [];
    /** Current AV snapshot: active activity + tracked receiver level (object OR JSON string). */
    current = { level: 0, known: false };
    /** The /av rooms for the switcher (object OR JSON string). */
    rooms = [];
    /** The selected room's area, or null → default to the primary (Harmony) room. */
    selectedArea = null;
    /** The active primary-room "what's playing" app name (e.g. "Netflix"), or ''. */
    nowPlaying = '';
    /** Whether the Harmony sections (activities · volume · switcher · status) show. */
    harmonyEnabled = false;
    /** Whether the Shield transport sections (playback · apps) show. */
    transportEnabled = false;
    /** Mute state — optimistic local toggle owned by the host (no server truth). */
    muted = false;
    /** Derived transport state driving the emphasized play/pause button. */
    playState = 'unknown';
    /** Loading (initial Harmony fetch) — a subtle inline spinner. */
    loading = false;
    /** A blocking error message (e.g. "Could not reach the Remote."). */
    error = '';
    /** Harmony degraded (hub unreachable, default controls shown). */
    degraded = false;
    /** A transient status note ("Starting Watch TV…"). */
    statusNote = '';
    /** The activity id the host optimistically marked pending (spinner). '' = none. */
    pendingActivityId = '';
    /** Receiver volume bounds — mirror the host's REMOTE_CALIBRATE_*. */
    calibrateMin = REMOTE_CALIBRATE_MIN;
    calibrateMax = REMOTE_CALIBRATE_MAX;
    /** Base path the app-logo SVGs are served from (host copies them into www/). */
    appAssetBase = '/assets/apps';
    /** Room-switcher popover open (local UI). */
    roomMenuOpen = false;
    /** Calibrate mini-form open (local UI). */
    calibrateOpen = false;
    /** The value typed into the calibrate field. */
    calibrateValue = '';
    /** Live slider preview level while dragging / just after a ± press (else null →
     *  the readout follows `current.level` from the host). */
    dragLevel = null;
    /** Fires when an activity card is tapped (activity id). */
    popActivityStart;
    /** Fires when the red power button is tapped. */
    popPowerOff;
    /** Fires for EACH IR volume step (slider crossing a unit, or a ± press/hold). */
    popVolumeStep;
    /** Fires when the mute button is tapped (host toggles optimistic `muted`). */
    popMuteToggle;
    /** Fires with the clamped level when the calibrate form is submitted. */
    popCalibrate;
    /** Fires when a transport button is tapped (the action; center = 'toggle'). */
    popTransport;
    /** Fires when a streaming-app tile is tapped (app key). */
    popAppLaunch;
    /** Fires when a different room is picked (area). */
    popRoomChange;
    /** Fires when the error-banner Retry is tapped. */
    popRetry;
    /** Fires when the panel requests to close (host chrome usually owns ×; provided
     *  for standalone use). */
    popClose;
    sliderEl;
    roomTriggerEl;
    /** The level the slider has emitted UP TO during the current drag. */
    emitAnchor = 0;
    dragging = false;
    mutedClearedThisDrag = false;
    holdTimeout;
    holdInterval;
    dragReleaseTimer;
    onDocPointerDown = (e) => {
        const path = e.composedPath?.() ?? [];
        const menu = this.hostEl?.querySelector('.rp-roommenu');
        if (this.roomTriggerEl && path.includes(this.roomTriggerEl))
            return;
        if (menu && path.includes(menu))
            return;
        this.closeRoomMenu();
    };
    disconnectedCallback() {
        this.stopHold();
        clearTimeout(this.dragReleaseTimer);
        document.removeEventListener('pointerdown', this.onDocPointerDown, true);
    }
    // ── Prop parsing (object OR JSON string) ────────────────────────────────────
    parse(v, fallback) {
        if (typeof v === 'string') {
            try {
                return JSON.parse(v) ?? fallback;
            }
            catch {
                return fallback;
            }
        }
        return v ?? fallback;
    }
    acts() {
        return this.parse(this.activities, []);
    }
    cur() {
        return this.parse(this.current, { level: 0, known: false });
    }
    roomList() {
        return this.parse(this.rooms, []);
    }
    // ── Room derivation ─────────────────────────────────────────────────────────
    get primaryRoom() {
        return this.roomList().find((r) => r.primary);
    }
    get activeRoom() {
        if (this.selectedArea)
            return this.roomList().find((r) => r.area === this.selectedArea);
        return this.primaryRoom;
    }
    get onPrimary() {
        const active = this.activeRoom;
        return !active || !!active.primary;
    }
    get canSwitch() {
        return this.roomList().length >= 2;
    }
    get activeId() {
        return this.pendingActivityId || this.cur().activityId;
    }
    // ── Room switcher ───────────────────────────────────────────────────────────
    toggleRoomMenu = () => {
        if (!this.canSwitch)
            return;
        if (this.roomMenuOpen)
            this.closeRoomMenu();
        else
            this.openRoomMenu();
    };
    openRoomMenu() {
        this.roomMenuOpen = true;
        document.addEventListener('pointerdown', this.onDocPointerDown, true);
    }
    closeRoomMenu() {
        if (this.roomMenuOpen)
            this.roomMenuOpen = false;
        document.removeEventListener('pointerdown', this.onDocPointerDown, true);
    }
    pickRoom(area) {
        this.closeRoomMenu();
        this.popRoomChange.emit(area);
    }
    onRoomMenuKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.closeRoomMenu();
        }
    };
    // ── Volume (IR-relative step model) ─────────────────────────────────────────
    get max() {
        return this.calibrateMax > 0 ? this.calibrateMax : 60;
    }
    /** The level shown in the readout/slider: the live drag preview, else host truth. */
    displayLevel() {
        return this.dragLevel != null ? this.dragLevel : this.cur().level;
    }
    /** Raw step emit (used by the slider — no optimistic bump). */
    emitStepRaw(dir) {
        this.popVolumeStep.emit({ dir });
    }
    /** ± button step: optimistic +1/−1 preview, unmute-on-adjust, then emit. */
    emitStep(dir) {
        if (this.muted)
            this.popMuteToggle.emit();
        const next = clampLevel(this.displayLevel() + (dir === 'up' ? 1 : -1), this.max);
        this.setDragLevel(next, true);
        this.emitStepRaw(dir);
    }
    /** Set the drag preview level; `release` schedules a fade back to host truth. */
    setDragLevel(n, release) {
        this.dragLevel = n;
        clearTimeout(this.dragReleaseTimer);
        if (release) {
            // Give queued IR steps time to resolve + report the real level, then let
            // `current.level` take over the readout.
            this.dragReleaseTimer = setTimeout(() => (this.dragLevel = null), 900);
        }
    }
    levelFromClientX(clientX) {
        if (!this.sliderEl)
            return this.displayLevel();
        const r = this.sliderEl.getBoundingClientRect();
        if (r.width <= 0)
            return this.displayLevel();
        const pct = (clientX - r.left) / r.width;
        return clampLevel(pct * this.max, this.max);
    }
    onSliderDown = (e) => {
        this.dragging = true;
        this.mutedClearedThisDrag = false;
        e.target.setPointerCapture?.(e.pointerId);
        this.emitAnchor = this.cur().level;
        this.dragTo(e.clientX);
    };
    onSliderMove = (e) => {
        if (this.dragging)
            this.dragTo(e.clientX);
    };
    onSliderUp = () => {
        if (!this.dragging)
            return;
        this.dragging = false;
        // Persist the preview briefly so the thumb doesn't snap back before the
        // queued steps report the new level.
        this.setDragLevel(this.displayLevel(), true);
    };
    dragTo(clientX) {
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
    startHold(dir) {
        this.emitStep(dir);
        this.stopHold();
        this.holdTimeout = setTimeout(() => {
            this.holdInterval = setInterval(() => this.emitStep(dir), 90);
        }, 300);
    }
    stopHold = () => {
        clearTimeout(this.holdTimeout);
        clearInterval(this.holdInterval);
    };
    // ── Calibrate ───────────────────────────────────────────────────────────────
    openCalibrate = () => {
        const c = this.cur();
        this.calibrateValue = c.known ? String(c.level) : '';
        this.calibrateOpen = true;
    };
    cancelCalibrate = () => {
        this.calibrateOpen = false;
        this.calibrateValue = '';
    };
    submitCalibrate = () => {
        const level = clampNumber(this.calibrateValue, this.calibrateMin, this.calibrateMax);
        if (level == null)
            return;
        this.calibrateOpen = false;
        this.calibrateValue = '';
        this.dragLevel = level; // reflect the calibrated number immediately
        this.setDragLevel(level, true);
        this.popCalibrate.emit(level);
    };
    // ── Render pieces ───────────────────────────────────────────────────────────
    renderHeader() {
        const active = this.activeRoom;
        const roomName = active?.area || this.primaryRoom?.area || 'Living Room';
        const subtitle = this.onPrimary ? 'Shield Pro' : this.roomSubtitle(active);
        const switchable = this.canSwitch;
        return (h("div", { class: "rp-header", onKeyDown: this.onRoomMenuKeyDown },
            h("div", { class: "rp-header-titles" },
                switchable ? (h("button", { type: "button", class: { 'rp-roomtrigger': true, 'rp-roomtrigger--open': this.roomMenuOpen }, "aria-haspopup": "menu", "aria-expanded": String(this.roomMenuOpen), "aria-label": `Room: ${roomName}. Change room`, title: "Change room", ref: (el) => (this.roomTriggerEl = el), onClick: () => this.toggleRoomMenu() },
                    h("span", { class: "rp-room" }, roomName),
                    h("pop-icon", { class: "rp-roomcaret", name: "chevron-down-circle-outline" }))) : (h("span", { class: "rp-room" }, roomName)),
                h("span", { class: "rp-device" }, subtitle),
                switchable && this.roomMenuOpen && this.renderRoomMenu())));
    }
    roomSubtitle(room) {
        const n = room?.devices.length ?? 0;
        if (!n)
            return 'No devices';
        return `${n} device${n === 1 ? '' : 's'}`;
    }
    renderRoomMenu() {
        const activeArea = this.activeRoom?.area ?? this.primaryRoom?.area;
        return (h("div", { class: "rp-roommenu", role: "menu", "aria-label": "Room", onKeyDown: this.onRoomMenuKeyDown }, this.roomList().map((r) => {
            const sel = r.area === activeArea;
            return (h("button", { type: "button", key: r.area, role: "menuitemradio", "aria-checked": String(sel), class: { 'rp-roomitem': true, 'rp-roomitem--active': sel }, onClick: () => this.pickRoom(r.area) },
                h("span", { class: "rp-roomitem-emoji", "aria-hidden": "true" }, r.emoji || '📺'),
                h("span", { class: "rp-roomitem-label" }, r.area),
                sel && h("pop-icon", { class: "rp-roomitem-check", name: "checkmark" })));
        })));
    }
    renderStatusLine() {
        const c = this.cur();
        const label = c.activityLabel || (this.activeId ? 'On' : 'Off');
        const isOff = this.activeId === ACTIVITY_OFF_ID;
        const poweringOff = this.pendingActivityId === ACTIVITY_OFF_ID;
        const app = this.nowPlaying;
        const playGlyph = this.playState === 'paused' ? '⏸' : '▶';
        const vol = this.muted ? 'Muted' : c.known ? `Vol ${this.displayLevel()}` : 'Vol —';
        return (h("div", { class: "rp-status" },
            h("span", { class: "rp-status-activity" },
                h("span", { class: { 'rp-dot': true, 'rp-dot--on': !!this.activeId && !isOff }, "aria-hidden": "true" }),
                app ? `${label} · ${playGlyph} ${app}` : label),
            h("span", { class: "rp-status-vol" }, vol),
            h("button", { type: "button", class: { 'rp-power': true, 'rp-power--active': isOff }, title: "Power off", "aria-label": "Power off", "aria-pressed": String(isOff), onClick: () => this.popPowerOff.emit() }, poweringOff ? h("span", { class: "rp-spin rp-spin--sm", "aria-hidden": "true" }) : h("pop-icon", { name: "power" }))));
    }
    renderActivities() {
        return [
            h("div", { class: "rp-section-title" }, "Activities"),
            h("div", { class: "rp-grid" }, this.acts()
                .filter((a) => a.id !== ACTIVITY_OFF_ID)
                .map((a) => {
                const active = this.activeId === a.id;
                const pending = this.pendingActivityId === a.id;
                return (h("button", { type: "button", key: a.id, class: { 'rp-act': true, 'rp-act--active': active }, "aria-pressed": String(active), onClick: () => this.popActivityStart.emit(a.id) },
                    pending ? h("span", { class: "rp-spin", "aria-hidden": "true" }) : h("pop-icon", { name: activityIcon(a) }),
                    h("span", { class: "rp-act-label" }, a.label)));
            })),
        ];
    }
    renderVolume() {
        const level = this.displayLevel();
        const pct = this.max > 0 ? Math.max(0, Math.min(100, (level / this.max) * 100)) : 0;
        return [
            h("div", { class: "rp-section-title-row" },
                h("span", { class: "rp-section-title", style: { marginTop: '0' } }, "Volume"),
                h("button", { type: "button", class: "rp-iconbtn", title: "Recalibrate volume", "aria-label": "Recalibrate volume", onClick: this.openCalibrate },
                    h("pop-icon", { name: "options-outline" }))),
            h("div", { class: { 'rp-vol-card': true, 'rp-vol-card--muted': this.muted } },
                h("div", { class: "rp-vol-top" },
                    h("div", { class: "rp-vol-readout" },
                        h("span", { class: "rp-vol-num" }, level),
                        h("span", { class: "rp-vol-unit" }, "Volume")),
                    h("span", { class: "rp-vol-muted-badge" },
                        h("pop-icon", { name: "volume-mute" }),
                        " Muted")),
                h("div", { class: "rp-vol-slider", role: "slider", "aria-label": "Volume", "aria-valuemin": this.calibrateMin, "aria-valuemax": this.calibrateMax, "aria-valuenow": level, ref: (el) => (this.sliderEl = el), onPointerDown: this.onSliderDown, onPointerMove: this.onSliderMove, onPointerUp: this.onSliderUp, onPointerCancel: this.onSliderUp },
                    h("div", { class: "rp-vol-track" }),
                    h("div", { class: "rp-vol-fill", style: { width: `${pct}%` } }),
                    h("div", { class: "rp-vol-thumb", style: { left: `${pct}%` } })),
                h("div", { class: "rp-vol-btns" },
                    h("button", { type: "button", class: "rp-volbtn", "aria-label": "Volume down", onPointerDown: (e) => { e.preventDefault(); this.startHold('down'); }, onPointerUp: this.stopHold, onPointerLeave: this.stopHold, onPointerCancel: this.stopHold },
                        h("pop-icon", { name: "remove" }),
                        h("small", null, "Hold")),
                    h("button", { type: "button", class: { 'rp-volbtn': true, 'rp-volbtn--mute': true, 'rp-volbtn--muted': this.muted }, "aria-label": this.muted ? 'Unmute' : 'Mute', "aria-pressed": String(this.muted), onClick: () => this.popMuteToggle.emit() },
                        h("pop-icon", { name: this.muted ? 'volume-mute' : 'volume-high-outline' })),
                    h("button", { type: "button", class: "rp-volbtn", "aria-label": "Volume up", onPointerDown: (e) => { e.preventDefault(); this.startHold('up'); }, onPointerUp: this.stopHold, onPointerLeave: this.stopHold, onPointerCancel: this.stopHold },
                        h("pop-icon", { name: "add" }),
                        h("small", null, "Hold")))),
            this.calibrateOpen && (h("div", { class: "rp-calibrate" },
                h("div", { class: "rp-calibrate-row" },
                    h("pop-field", { class: "rp-calibrate-field", spec: {
                            key: 'level',
                            type: 'number',
                            label: "What's the actual volume?",
                            min: this.calibrateMin,
                            max: this.calibrateMax,
                            placeholder: `${this.calibrateMin}–${this.calibrateMax}`,
                        }, value: this.calibrateValue, onValueChange: (e) => {
                            e.stopPropagation();
                            this.calibrateValue = e.detail?.value == null ? '' : String(e.detail.value);
                        } }),
                    h("button", { type: "button", class: "rp-btn", onClick: this.cancelCalibrate }, "Cancel"),
                    h("button", { type: "button", class: "rp-btn rp-btn--primary", disabled: this.calibrateValue.trim() === '', onClick: this.submitCalibrate }, "Set")))),
        ];
    }
    renderTransport() {
        return [
            h("div", { class: "rp-section-title" }, "Playback"),
            h("div", { class: "rp-transport", role: "group", "aria-label": "Playback controls" }, TRANSPORT_BUTTONS.map((b) => {
                const isPlay = !!b.primary;
                const icon = isPlay ? playToggleIcon(this.playState) : b.icon;
                return (h("button", { type: "button", key: b.action, class: { 'rp-tbtn': true, 'rp-tbtn--play': isPlay }, title: b.label, "aria-label": b.label, onClick: () => this.popTransport.emit(b.action) },
                    h("pop-icon", { name: icon })));
            })),
        ];
    }
    renderApps() {
        return [
            h("div", { class: "rp-section-title" }, "Apps"),
            h("div", { class: "rp-apps-grid", role: "group", "aria-label": "Open a streaming app" }, REMOTE_APPS.map((a) => (h("button", { type: "button", key: a.key, class: "rp-app-tile", "aria-label": `Open ${a.label}`, title: `Open ${a.label}`, onClick: () => this.popAppLaunch.emit(a.key) },
                a.logo ? (h("span", { class: "rp-app-chip rp-app-chip--logo", style: { '--app-accent': a.accent, '--app-logo': `url(${this.appAssetBase}/${a.logo}.svg)` }, "aria-hidden": "true" },
                    h("span", { class: "rp-app-glyph" }))) : (h("span", { class: "rp-app-chip", style: { '--app-accent': a.accent }, "aria-hidden": "true" }, a.glyph)),
                h("span", { class: "rp-app-label" }, a.label))))),
        ];
    }
    renderNowPlaying() {
        const app = this.nowPlaying;
        return (h("div", { class: "rp-transport-status" },
            h("span", { class: { 'rp-device-dot': true, 'rp-device-dot--on': !!app }, "aria-hidden": "true" }),
            h("span", { class: "rp-transport-status-app" }, app ? `Playing · ${app}` : 'Nothing playing')));
    }
    renderOtherRoom() {
        const room = this.activeRoom;
        const devices = room?.devices ?? [];
        return (h("div", { class: "rp-otherroom" },
            h("div", { class: "rp-section-title-row" },
                h("span", { class: "rp-section-title", style: { marginTop: '0' } }, "Devices"),
                h("span", { class: "rp-readonly-badge", "aria-hidden": "true" }, "Read-only")),
            devices.length ? (h("ul", { class: "rp-devices", "aria-label": "Device status (read-only)" }, devices.map((d) => this.renderRoomDevice(d)))) : (h("div", { class: "rp-empty" }, "Nothing here right now.")),
            h("div", { class: "rp-soon" },
                h("pop-icon", { name: "tv-outline" }),
                h("span", null, "Status only \u2014 full remote coming soon for this room."))));
    }
    renderRoomDevice(d) {
        const on = d.state === 'playing' || d.state === 'paused';
        const detail = d.receiver
            ? d.input || 'Off'
            : on
                ? `${d.state === 'paused' ? '⏸' : '▶'} ${d.app || (d.state === 'paused' ? 'Paused' : 'Playing')}`
                : 'Off';
        return (h("li", { class: "rp-device-row", key: d.label, "aria-disabled": "true" },
            h("span", { class: { 'rp-device-dot': true, 'rp-device-dot--on': on }, "aria-hidden": "true" }),
            h("span", { class: "rp-device-name" }, d.label),
            h("span", { class: { 'rp-device-state': true, 'rp-device-state--on': on } }, detail)));
    }
    renderBody() {
        if (this.error) {
            return (h("div", { class: "rp-error" },
                h("pop-icon", { name: "warning-outline" }),
                h("span", null, this.error),
                h("button", { type: "button", class: "rp-btn", onClick: () => this.popRetry.emit() }, "Retry")));
        }
        if (!this.onPrimary) {
            return this.renderOtherRoom();
        }
        return [
            this.harmonyEnabled && this.renderStatusLine(),
            this.harmonyEnabled && this.degraded && (h("div", { class: "rp-degraded" },
                h("pop-icon", { name: "cloud-offline-outline" }),
                h("span", null, "Hub unreachable \u2014 showing default controls."))),
            this.harmonyEnabled && this.loading && (h("div", { class: "rp-loading" },
                h("span", { class: "rp-spin rp-spin--sm", "aria-hidden": "true" }),
                " Loading\u2026")),
            this.statusNote && h("div", { class: "rp-note", role: "status" }, this.statusNote),
            this.harmonyEnabled && this.renderActivities(),
            this.harmonyEnabled && this.renderVolume(),
            this.transportEnabled && !this.harmonyEnabled && this.renderNowPlaying(),
            this.transportEnabled && this.renderTransport(),
            this.transportEnabled && this.renderApps(),
        ];
    }
    render() {
        return (h(Host, { key: '0' },
            h("section", { key: '1', class: "rp", "aria-label": "Remote" },
                this.renderHeader(),
                this.renderBody())));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-remote-panel",
        "componentClassName": "PopRemotePanel",
        "elementRef": "hostEl",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "activities",
                "type": "string",
                "attribute": "activities",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "RemoteActivity[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "RemoteActivity": {
                            "location": "global",
                            "id": "global::RemoteActivity"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Harmony activities (object OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "current",
                "type": "any",
                "attribute": "current",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "{ level: 0, known: false }",
                "complexType": {
                    "original": "RemoteCurrent | string",
                    "resolved": "any",
                    "references": {
                        "RemoteCurrent": {
                            "location": "global",
                            "id": "global::RemoteCurrent"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Current AV snapshot: active activity + tracked receiver level (object OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "rooms",
                "type": "string",
                "attribute": "rooms",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "RemoteRoom[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "RemoteRoom": {
                            "location": "global",
                            "id": "global::RemoteRoom"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The /av rooms for the switcher (object OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "selectedArea",
                "type": "string",
                "attribute": "selected-area",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "null",
                "complexType": {
                    "original": "string | null",
                    "resolved": "null | string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The selected room's area, or null \u2192 default to the primary (Harmony) room."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "nowPlaying",
                "type": "string",
                "attribute": "now-playing",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The active primary-room \"what's playing\" app name (e.g. \"Netflix\"), or ''."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "harmonyEnabled",
                "type": "boolean",
                "attribute": "harmony-enabled",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Whether the Harmony sections (activities \u00B7 volume \u00B7 switcher \u00B7 status) show."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "transportEnabled",
                "type": "boolean",
                "attribute": "transport-enabled",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Whether the Shield transport sections (playback \u00B7 apps) show."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "muted",
                "type": "boolean",
                "attribute": "muted",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Mute state \u2014 optimistic local toggle owned by the host (no server truth)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "playState",
                "type": "any",
                "attribute": "play-state",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'unknown'",
                "complexType": {
                    "original": "PlayState",
                    "resolved": "PlayState",
                    "references": {
                        "PlayState": {
                            "location": "global",
                            "id": "global::PlayState"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Derived transport state driving the emphasized play/pause button."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "loading",
                "type": "boolean",
                "attribute": "loading",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Loading (initial Harmony fetch) \u2014 a subtle inline spinner."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "error",
                "type": "string",
                "attribute": "error",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "A blocking error message (e.g. \"Could not reach the Remote.\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "degraded",
                "type": "boolean",
                "attribute": "degraded",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Harmony degraded (hub unreachable, default controls shown)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "statusNote",
                "type": "string",
                "attribute": "status-note",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "A transient status note (\"Starting Watch TV\u2026\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "pendingActivityId",
                "type": "string",
                "attribute": "pending-activity-id",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The activity id the host optimistically marked pending (spinner). '' = none."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "calibrateMin",
                "type": "any",
                "attribute": "calibrate-min",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "REMOTE_CALIBRATE_MIN",
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Receiver volume bounds \u2014 mirror the host's REMOTE_CALIBRATE_*."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "calibrateMax",
                "type": "any",
                "attribute": "calibrate-max",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "REMOTE_CALIBRATE_MAX",
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "appAssetBase",
                "type": "string",
                "attribute": "app-asset-base",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'/assets/apps'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Base path the app-logo SVGs are served from (host copies them into www/)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "roomMenuOpen"
            }, {
                "name": "calibrateOpen"
            }, {
                "name": "calibrateValue"
            }, {
                "name": "dragLevel"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popActivityStart",
                "method": "popActivityStart",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when an activity card is tapped (activity id)."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popPowerOff",
                "method": "popPowerOff",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when the red power button is tapped."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popVolumeStep",
                "method": "popVolumeStep",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires for EACH IR volume step (slider crossing a unit, or a \u00B1 press/hold)."
                },
                "complexType": {
                    "original": "{ dir: 'up' | 'down' }",
                    "resolved": "{ dir: \"up\" | \"down\"; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popMuteToggle",
                "method": "popMuteToggle",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when the mute button is tapped (host toggles optimistic `muted`)."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popCalibrate",
                "method": "popCalibrate",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires with the clamped level when the calibrate form is submitted."
                },
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popTransport",
                "method": "popTransport",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when a transport button is tapped (the action; center = 'toggle')."
                },
                "complexType": {
                    "original": "TransportAction",
                    "resolved": "TransportAction",
                    "references": {
                        "TransportAction": {
                            "location": "global",
                            "id": "global::TransportAction"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAppLaunch",
                "method": "popAppLaunch",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when a streaming-app tile is tapped (app key)."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popRoomChange",
                "method": "popRoomChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when a different room is picked (area)."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popRetry",
                "method": "popRetry",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when the error-banner Retry is tapped."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popClose",
                "method": "popClose",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when the panel requests to close (host chrome usually owns \u00D7; provided\nfor standalone use)."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-REMOTE-PANEL",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/remote-panel/remote-panel.css",
                        "relativePath": "remote-panel.css",
                        "originalComponentPath": "remote-panel.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": true,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": true,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["class", "onKeyDown", "type", "aria-haspopup", "aria-expanded", "aria-label", "title", "ref", "onClick", "name", "role", "key", "aria-checked", "aria-hidden", "aria-pressed", "style", "aria-valuemin", "aria-valuemax", "aria-valuenow", "onPointerDown", "onPointerMove", "onPointerUp", "onPointerCancel", "onPointerLeave", "spec", "value", "onValueChange", "disabled", "aria-disabled"],
        "htmlTagNames": ["div", "button", "span", "pop-icon", "small", "pop-field", "ul", "li", "section"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
};
//# sourceMappingURL=remote-panel.js.map