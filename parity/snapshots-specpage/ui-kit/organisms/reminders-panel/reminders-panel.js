import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h, Host } from "@stencil/core/testing";
import { REMINDER_FILTERS, SNOOZE_CHOICES, DEFAULT_ALARM_SETTINGS, DEFAULT_ALARM_SOUNDS, toLocalInputValue, formatWhen, relativeShort, heroCountdown, drainPct, isImminent, HERO_TICK_WINDOW_MS, } from './reminders-panel.helpers';
export const PopRemindersPanel = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popCreate = __stencil_createEvent(this, "popCreate", 7);
        this.popSnooze = __stencil_createEvent(this, "popSnooze", 7);
        this.popDismiss = __stencil_createEvent(this, "popDismiss", 7);
        this.popEditReminder = __stencil_createEvent(this, "popEditReminder", 7);
        this.popDelete = __stencil_createEvent(this, "popDelete", 7);
        this.popFilterChange = __stencil_createEvent(this, "popFilterChange", 7);
        this.popSearchChange = __stencil_createEvent(this, "popSearchChange", 7);
        this.popAlarmChange = __stencil_createEvent(this, "popAlarmChange", 7);
        this.popAlarmTest = __stencil_createEvent(this, "popAlarmTest", 7);
        this.popStopRing = __stencil_createEvent(this, "popStopRing", 7);
        this.popCountdownDone = __stencil_createEvent(this, "popCountdownDone", 7);
        this.popRefresh = __stencil_createEvent(this, "popRefresh", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
        this.popUnlock = __stencil_createEvent(this, "popUnlock", 7);
    }
    /** The rows for the ACTIVE filter/search view (object array OR JSON string). */
    reminders = [];
    /** Inline segmented-filter counts (object OR JSON string). Optional. */
    counts = { upcoming: 0, today: 0, overdue: 0, recurring: 0 };
    /** Active filter id. */
    filter = 'upcoming';
    /** Search text (controlled by the host). */
    searchText = '';
    /** Alarm settings for the drawer (object OR JSON string). */
    alarm = DEFAULT_ALARM_SETTINGS;
    /** Selectable alarm tones (object array OR JSON string). */
    sounds = DEFAULT_ALARM_SOUNDS;
    /** The reminder currently RINGING (host's alarm engine is looping the tone),
     *  or null. Drives the ringing banner + the row pulse. (object OR JSON string) */
    ringing = null;
    /** The next reminder's title (hero "Next reminder" name). */
    nextTitle = '';
    /** Local-clock deadline (epoch ms) of the next reminder — the hero countdown
     *  target. Host derives it skew-safe (syncedAt + fireInMs). 0/undefined = idle. */
    countdownDeadline = 0;
    /** The original set→fire window (ms) — the drain denominator. Optional. */
    heroTotalMs = 0;
    /** First-load (no data yet) → a subtle loader instead of the empty state. */
    loading = false;
    /** An error line shown in place of the list (with a Retry → popRefresh). */
    error = '';
    /** Render the panel's own header (title + refresh + close). Hosts with their
     *  own chrome (the hub's PanelShell) set this false — only the ⚙ gear shows. */
    showHeader = true;
    /** Alarm-settings drawer visibility (the ⚙). Local UI state. */
    settingsOpen = false;
    /** Row id whose snooze menu is open, or null. Local UI state. */
    snoozeMenuId = null;
    /** Row id being inline-edited, or null. Local UI state (+ its draft fields). */
    editingId = null;
    editTitle = '';
    editTime = '';
    /** Quick-create drafts. Local UI state. */
    createTitle = '';
    createTime = '';
    /** Ticker clock — drives the live hero countdown + drain within the final hour. */
    nowMs = Date.now();
    popCreate;
    popSnooze;
    popDismiss;
    popEditReminder;
    popDelete;
    popFilterChange;
    popSearchChange;
    popAlarmChange;
    popAlarmTest;
    popStopRing;
    popCountdownDone;
    popRefresh;
    popClose;
    popUnlock;
    tickTimer;
    /** The deadline we've already announced as done (never re-emit for the same). */
    announcedDeadline = 0;
    connectedCallback() {
        this.startTick();
    }
    disconnectedCallback() {
        if (this.tickTimer)
            clearInterval(this.tickTimer);
    }
    /** When the host hands a fresh list (revalidate landed), clear transient row
     *  UI so a stale open menu / edit row never lingers over new data. */
    onRemindersChange() {
        this.snoozeMenuId = null;
        this.editingId = null;
    }
    onDeadlineChange() {
        this.announcedDeadline = 0; // a new target can fire again
        this.nowMs = Date.now();
    }
    startTick() {
        if (this.tickTimer)
            return;
        // One 1 Hz clock. Cheap: a single interval drives the hero text + drain and
        // the per-row relative labels. (The tile/chip run their own tickers.)
        this.tickTimer = setInterval(() => {
            this.nowMs = Date.now();
            this.maybeAnnounceDone();
        }, 1000);
    }
    maybeAnnounceDone() {
        const dl = this.countdownDeadline;
        if (!dl)
            return;
        if (this.nowMs >= dl && this.announcedDeadline !== dl) {
            this.announcedDeadline = dl;
            this.popCountdownDone.emit();
        }
    }
    parse(v, fallback) {
        if (typeof v === 'string') {
            if (v === '')
                return fallback;
            try {
                return JSON.parse(v) ?? fallback;
            }
            catch {
                return fallback;
            }
        }
        return v ?? fallback;
    }
    unlock = () => this.popUnlock.emit();
    setAlarm(patch, preview) {
        this.popAlarmChange.emit({ patch, preview });
    }
    submitCreate = () => {
        const title = this.createTitle.trim();
        const time = this.createTime;
        if (!title || !time)
            return;
        this.popCreate.emit({ title, time });
        this.createTitle = '';
        this.createTime = '';
    };
    startEdit(r) {
        this.editingId = r.id;
        this.editTitle = r.title;
        this.editTime = toLocalInputValue(r.reminderAt);
        this.snoozeMenuId = null;
    }
    saveEdit() {
        const id = this.editingId;
        if (!id)
            return;
        this.popEditReminder.emit({ id, title: this.editTitle.trim(), time: this.editTime });
        this.editingId = null;
    }
    // ── Render pieces ──────────────────────────────────────────────────────────
    renderGear() {
        return (h("button", { type: "button", class: { 'rp-iconbtn': true, 'rp-iconbtn--on': this.settingsOpen }, "aria-label": "Alarm settings", "aria-pressed": this.settingsOpen ? 'true' : 'false', onClick: () => {
                this.unlock();
                this.settingsOpen = !this.settingsOpen;
            } },
            h("pop-icon", { name: "settings-outline" })));
    }
    renderHead() {
        if (!this.showHeader)
            return null;
        return (h("div", { class: "rp-head" },
            h("div", { class: "rp-title" }, "Reminders"),
            h("div", { class: "rp-headbtns" },
                h("button", { type: "button", class: "rp-iconbtn", "aria-label": "Refresh", onClick: () => this.popRefresh.emit() },
                    h("pop-icon", { name: "refresh-outline" })),
                this.renderGear(),
                h("button", { type: "button", class: "rp-iconbtn", "aria-label": "Close", onClick: () => this.popClose.emit() },
                    h("pop-icon", { name: "close-outline" })))));
    }
    renderHero() {
        const dl = this.countdownDeadline;
        const remaining = dl ? dl - this.nowMs : 0;
        const idle = !dl;
        const imminent = !idle && isImminent(remaining);
        // Live within the final hour; a static full-ish bar beyond (saves the eye a
        // twitch and matches the tile's tick policy).
        const live = !idle && remaining <= HERO_TICK_WINDOW_MS;
        const pct = idle ? 100 : drainPct(Math.max(0, remaining), this.heroTotalMs || undefined);
        const timeText = idle ? '—' : live ? heroCountdown(Math.max(0, remaining)) : heroCountdown(Math.max(0, remaining));
        return (h("div", { class: "rp-count" },
            h("div", { class: "rp-count-top" },
                h("span", { class: "rp-count-glyph" }, imminent ? '🔔' : '⏰'),
                h("div", { class: "rp-count-body" },
                    h("div", { class: "rp-count-label" }, idle ? 'Reminders' : 'Next reminder'),
                    h("div", { class: "rp-count-name" }, idle ? 'No upcoming reminders' : this.nextTitle || 'Reminder')),
                !idle && h("div", { class: { 'rp-count-time': true, 'rp-count-time--warn': imminent } }, timeText),
                !this.showHeader && this.renderGear()),
            !idle && h("div", { class: "rp-drain", style: { '--pct': `${pct}%` }, "aria-hidden": "true" })));
    }
    renderRinging(ring) {
        if (!ring)
            return null;
        return (h("div", { class: "rp-ringing", role: "alert" },
            h("span", { class: "rp-ringing-title" },
                "\uD83D\uDD14 ",
                ring.title),
            h("div", { class: "rp-ringing-actions" },
                h("button", { type: "button", class: "rp-btn", onClick: () => (ring.id ? this.popSnooze.emit({ id: ring.id, minutes: 10 }) : this.popStopRing.emit()) }, "Snooze 10m"),
                h("button", { type: "button", class: "rp-btn rp-btn--primary", onClick: () => (ring.id ? this.popDismiss.emit({ id: ring.id }) : this.popStopRing.emit()) }, "Dismiss"))));
    }
    renderSettings(alarm, sounds) {
        if (!this.settingsOpen)
            return null;
        return (h("div", { class: "rp-settings" },
            h("div", { class: "rp-set-row" },
                h("span", { class: "rp-set-label" }, "Sound"),
                h("div", { class: "rp-sounds", role: "radiogroup", "aria-label": "Alarm sound" }, sounds.map((s) => (h("button", { type: "button", class: { 'rp-sound': true, 'rp-sound--on': alarm.sound === s.id }, "aria-pressed": alarm.sound === s.id ? 'true' : 'false', onClick: () => {
                        this.unlock();
                        this.setAlarm({ sound: s.id }, true);
                    } }, s.label))))),
            h("div", { class: "rp-set-row" },
                h("span", { class: "rp-set-label" }, "Volume"),
                h("input", { type: "range", min: "0", max: "100", value: Math.round(alarm.volume * 100), "aria-label": "Alarm volume", onInput: (e) => this.setAlarm({ volume: Number(e.target.value) / 100 }, false), onChange: () => this.setAlarm({}, true) })),
            h("div", { class: "rp-set-row" },
                h("span", { class: "rp-set-label" }, "Sound"),
                h("pop-switch", { label: "Sound", checked: alarm.soundOn, onPopChange: (e) => this.setAlarm({ soundOn: e.detail }, false) })),
            h("div", { class: "rp-set-row" },
                h("span", { class: "rp-set-label" }, "Vibration"),
                h("pop-switch", { label: "Vibration", checked: alarm.vibrateOn, onPopChange: (e) => this.setAlarm({ vibrateOn: e.detail }, false) })),
            h("div", { class: "rp-set-row" },
                h("span", { class: "rp-set-label" }, "Push notification"),
                h("pop-switch", { label: "Push notification", checked: alarm.pushOn, onPopChange: (e) => this.setAlarm({ pushOn: e.detail }, false) })),
            h("div", { class: "rp-set-row rp-set-row--test" },
                h("button", { type: "button", class: "rp-btn", onClick: () => { this.unlock(); this.popAlarmTest.emit(); } }, "\u25B6 Test alarm"))));
    }
    renderControls(counts) {
        const countFor = (id) => counts[id] ?? 0;
        return (h("div", { class: "rp-controls" },
            h("div", { class: "rp-search" },
                h("pop-icon", { name: "search-outline" }),
                h("input", { type: "search", placeholder: "Search reminders\u2026", value: this.searchText, "aria-label": "Search reminders", onInput: (e) => this.popSearchChange.emit({ search: e.target.value }) })),
            h("div", { class: "rp-seg", role: "radiogroup", "aria-label": "Filter" }, REMINDER_FILTERS.map((f) => {
                const n = countFor(f.id);
                const alert = f.id === 'overdue' && n > 0;
                return (h("button", { type: "button", class: { 'rp-seg-btn': true, 'rp-seg-btn--on': this.filter === f.id }, "aria-pressed": this.filter === f.id ? 'true' : 'false', onClick: () => this.popFilterChange.emit({ filter: f.id }) },
                    f.label,
                    " ",
                    h("span", { class: { 'rp-n': true, 'rp-n--alert': alert } }, n)));
            }))));
    }
    renderCreate() {
        return (h("div", { class: "rp-create" },
            h("input", { class: "rp-field", placeholder: "Remind me to\u2026", value: this.createTitle, "aria-label": "Reminder title", onInput: (e) => (this.createTitle = e.target.value), onKeyDown: (e) => e.key === 'Enter' && this.submitCreate() }),
            h("div", { class: "rp-create-row2" },
                h("input", { class: "rp-field", type: "datetime-local", "aria-label": "When", value: this.createTime, onInput: (e) => (this.createTime = e.target.value) }),
                h("button", { type: "button", class: "rp-btn rp-btn--primary", onClick: this.submitCreate }, "Add"))));
    }
    renderRow(r, ringId) {
        if (this.editingId === r.id) {
            return (h("li", { class: "rp-row rp-row--edit", key: r.id },
                h("div", { class: "rp-edit-fields" },
                    h("input", { class: "rp-field", value: this.editTitle, "aria-label": "Title", onInput: (e) => (this.editTitle = e.target.value) }),
                    h("input", { class: "rp-field", type: "datetime-local", "aria-label": "When", value: this.editTime, onInput: (e) => (this.editTime = e.target.value) })),
                h("div", { class: "rp-row-actions" },
                    h("button", { type: "button", class: "rp-btn rp-btn--primary", onClick: () => this.saveEdit() }, "Save"),
                    h("button", { type: "button", class: "rp-btn", onClick: () => (this.editingId = null) }, "Cancel"))));
        }
        const ringingThis = !!ringId && ringId === r.id;
        const deadline = r.fireInMs != null ? this.nowMs + r.fireInMs : null; // relative label only needs a sign; host sends fresh fireInMs each fetch
        const overdue = r.overdue || (deadline != null && deadline < this.nowMs);
        // Prefer the server-sent overdue flag / reminderAt for the relative label,
        // falling back to fireInMs — but fireInMs is measured from the fetch baseline,
        // so for the row label we lean on reminderAt when present.
        const rel = r.reminderAt ? relativeShort(Date.parse(r.reminderAt), this.nowMs) : r.fireInMs != null ? relativeShort(this.nowMs + r.fireInMs, this.nowMs) : '';
        return (h("li", { class: { 'rp-row': true, 'rp-row--overdue': overdue && !ringingThis, 'rp-row--ring': ringingThis }, key: r.id },
            h("span", { class: "rp-row-glyph" }, ringingThis ? '🔔' : '⏰'),
            h("div", { class: "rp-row-main" },
                h("div", { class: "rp-row-title" },
                    r.title,
                    r.recurring && h("span", { class: "rp-badge", title: "Recurring" }, "\uD83D\uDD01")),
                h("div", { class: "rp-row-when" },
                    formatWhen(r.reminderAt, new Date(this.nowMs)),
                    rel && h("span", { class: { 'rp-rel': true, 'rp-rel--over': overdue } },
                        " \u00B7 ",
                        rel))),
            h("div", { class: "rp-row-actions" },
                h("div", { class: "rp-snoozewrap" },
                    h("button", { type: "button", class: "rp-a", "aria-label": `Snooze ${r.title}`, onClick: () => (this.snoozeMenuId = this.snoozeMenuId === r.id ? null : r.id) },
                        h("pop-icon", { name: "alarm-outline" })),
                    this.snoozeMenuId === r.id && (h("div", { class: "rp-snoozemenu", role: "menu" }, SNOOZE_CHOICES.map((m) => (h("button", { type: "button", role: "menuitem", onClick: () => {
                            this.snoozeMenuId = null;
                            this.popSnooze.emit({ id: r.id, minutes: m });
                        } }, m < 60 ? `${m} min` : '1 hour')))))),
                h("button", { type: "button", class: "rp-a", "aria-label": `Dismiss ${r.title}`, onClick: () => this.popDismiss.emit({ id: r.id }) },
                    h("pop-icon", { name: "checkmark-outline" })),
                h("button", { type: "button", class: "rp-a", "aria-label": `Edit ${r.title}`, onClick: () => this.startEdit(r) },
                    h("pop-icon", { name: "create-outline" })),
                h("button", { type: "button", class: "rp-a rp-a--danger", "aria-label": `Delete ${r.title}`, onClick: () => this.popDelete.emit({ id: r.id }) },
                    h("pop-icon", { name: "trash-outline" })))));
    }
    render() {
        const reminders = this.parse(this.reminders, []);
        const counts = this.parse(this.counts, { upcoming: 0, today: 0, overdue: 0, recurring: 0 });
        const alarm = this.parse(this.alarm, DEFAULT_ALARM_SETTINGS);
        const sounds = this.parse(this.sounds, DEFAULT_ALARM_SOUNDS);
        const ring = this.parse(this.ringing, null);
        const ringId = ring ? ring.id : null;
        const empty = reminders.length === 0;
        return (h(Host, { key: '0' },
            h("section", { key: '1', class: "rp", "aria-label": "Reminders", onPointerDown: this.unlock },
                this.renderHead(),
                this.renderHero(),
                this.renderRinging(ring),
                this.renderSettings(alarm, sounds),
                this.renderControls(counts),
                this.renderCreate(),
                this.error && empty ? (h("div", { class: "rp-state rp-state--err" },
                    h("ion-icon", { name: "cloud-offline-outline", "aria-hidden": "true" }),
                    h("span", null, this.error),
                    h("button", { type: "button", class: "rp-btn", onClick: () => this.popRefresh.emit() }, "Retry"))) : empty && this.loading ? (h("div", { class: "rp-state" }, "Loading\u2026")) : empty ? (h("div", { class: "rp-state" },
                    h("ion-icon", { name: "alarm-outline", "aria-hidden": "true" }),
                    h("span", null, this.searchText || this.filter !== 'upcoming' ? 'Nothing matches.' : 'No reminders set.'))) : (h("ul", { class: "rp-list" }, reminders.map((r) => this.renderRow(r, ringId)))),
                h("div", { key: '2', class: "rp-disclaimer" }, "Reminders are the same transient tasks the bot fires. Countdown is clock-skew-safe. Alarm rings in-tab; a push wakes a closed app (OS notification sound + vibration)."))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-reminders-panel",
        "componentClassName": "PopRemindersPanel",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "reminders",
                "type": "string",
                "attribute": "reminders",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "ReminderRow[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "ReminderRow": {
                            "location": "global",
                            "id": "global::ReminderRow"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The rows for the ACTIVE filter/search view (object array OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "counts",
                "type": "any",
                "attribute": "counts",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "{ upcoming: 0, today: 0, overdue: 0, recurring: 0 }",
                "complexType": {
                    "original": "ReminderFilterCounts | string",
                    "resolved": "any",
                    "references": {
                        "ReminderFilterCounts": {
                            "location": "global",
                            "id": "global::ReminderFilterCounts"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Inline segmented-filter counts (object OR JSON string). Optional."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "filter",
                "type": "string",
                "attribute": "filter",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'upcoming'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Active filter id."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "searchText",
                "type": "string",
                "attribute": "search-text",
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
                    "text": "Search text (controlled by the host)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "alarm",
                "type": "any",
                "attribute": "alarm",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "DEFAULT_ALARM_SETTINGS",
                "complexType": {
                    "original": "AlarmSettingsView | string",
                    "resolved": "any",
                    "references": {
                        "AlarmSettingsView": {
                            "location": "global",
                            "id": "global::AlarmSettingsView"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Alarm settings for the drawer (object OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sounds",
                "type": "string",
                "attribute": "sounds",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "DEFAULT_ALARM_SOUNDS",
                "complexType": {
                    "original": "AlarmSoundOption[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "AlarmSoundOption": {
                            "location": "global",
                            "id": "global::AlarmSoundOption"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Selectable alarm tones (object array OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "ringing",
                "type": "string",
                "attribute": "ringing",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "null",
                "complexType": {
                    "original": "{ id: string; title: string } | null | string",
                    "resolved": "null | string | { id: string; title: string; }",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The reminder currently RINGING (host's alarm engine is looping the tone),\nor null. Drives the ringing banner + the row pulse. (object OR JSON string)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "nextTitle",
                "type": "string",
                "attribute": "next-title",
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
                    "text": "The next reminder's title (hero \"Next reminder\" name)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "countdownDeadline",
                "type": "number",
                "attribute": "countdown-deadline",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Local-clock deadline (epoch ms) of the next reminder \u2014 the hero countdown\ntarget. Host derives it skew-safe (syncedAt + fireInMs). 0/undefined = idle."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "heroTotalMs",
                "type": "number",
                "attribute": "hero-total-ms",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The original set\u2192fire window (ms) \u2014 the drain denominator. Optional."
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
                    "text": "First-load (no data yet) \u2192 a subtle loader instead of the empty state."
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
                    "text": "An error line shown in place of the list (with a Retry \u2192 popRefresh)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "showHeader",
                "type": "boolean",
                "attribute": "show-header",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Render the panel's own header (title + refresh + close). Hosts with their\nown chrome (the hub's PanelShell) set this false \u2014 only the \u2699 gear shows."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "settingsOpen"
            }, {
                "name": "snoozeMenuId"
            }, {
                "name": "editingId"
            }, {
                "name": "editTitle"
            }, {
                "name": "editTime"
            }, {
                "name": "createTitle"
            }, {
                "name": "createTime"
            }, {
                "name": "nowMs"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popCreate",
                "method": "popCreate",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ title: string; time: string }",
                    "resolved": "{ title: string; time: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popSnooze",
                "method": "popSnooze",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ id: string; minutes: number }",
                    "resolved": "{ id: string; minutes: number; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popDismiss",
                "method": "popDismiss",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ id: string }",
                    "resolved": "{ id: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popEditReminder",
                "method": "popEditReminder",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ id: string; title: string; time: string }",
                    "resolved": "{ id: string; title: string; time: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popDelete",
                "method": "popDelete",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ id: string }",
                    "resolved": "{ id: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popFilterChange",
                "method": "popFilterChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ filter: string }",
                    "resolved": "{ filter: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popSearchChange",
                "method": "popSearchChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ search: string }",
                    "resolved": "{ search: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popAlarmChange",
                "method": "popAlarmChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ patch: Partial<AlarmSettingsView>; preview: boolean }",
                    "resolved": "{ patch: Partial<AlarmSettingsView>; preview: boolean; }",
                    "references": {
                        "Partial": {
                            "location": "global",
                            "id": "global::Partial"
                        },
                        "AlarmSettingsView": {
                            "location": "global",
                            "id": "global::AlarmSettingsView"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAlarmTest",
                "method": "popAlarmTest",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popStopRing",
                "method": "popStopRing",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popCountdownDone",
                "method": "popCountdownDone",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popRefresh",
                "method": "popRefresh",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
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
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popUnlock",
                "method": "popUnlock",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "reminders",
                "methodName": "onRemindersChange",
                "handlerOptions": undefined
            }, {
                "propName": "countdownDeadline",
                "methodName": "onDeadlineChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-REMINDERS-PANEL",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/reminders-panel/reminders-panel.css",
                        "relativePath": "reminders-panel.css",
                        "originalComponentPath": "reminders-panel.css"
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
        "hasConnectedCallbackFn": true,
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
        "hasPropNumber": true,
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
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["type", "class", "aria-label", "aria-pressed", "onClick", "name", "style", "aria-hidden", "role", "min", "max", "value", "onInput", "onChange", "label", "checked", "onPopChange", "placeholder", "onKeyDown", "key", "title", "onPointerDown"],
        "htmlTagNames": ["button", "pop-icon", "div", "span", "input", "pop-switch", "li", "section", "ion-icon", "ul"],
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
    static get watchers() { return {
        "reminders": [{
                "onRemindersChange": 0
            }],
        "countdownDeadline": [{
                "onDeadlineChange": 0
            }]
    }; }
};
//# sourceMappingURL=reminders-panel.js.map