import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h, Host } from "@stencil/core/runtime/client/standalone";
import { REMINDER_FILTERS, SNOOZE_CHOICES, DEFAULT_ALARM_SETTINGS, DEFAULT_ALARM_SOUNDS, toLocalInputValue, formatWhen, relativeShort, heroCountdown, drainPct, isImminent, HERO_TICK_WINDOW_MS, } from './reminders-panel.helpers';
import PopRemindersPanelStyle0 from "./ui-kit/organisms/reminders-panel/reminders-panel.css?tag=pop-reminders-panel&encapsulation=scoped";
const PopRemindersPanel = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
    static get watchers() { return {
        "reminders": [{
                "onRemindersChange": 0
            }],
        "countdownDeadline": [{
                "onDeadlineChange": 0
            }]
    }; }
    static get style() { return PopRemindersPanelStyle0(); }
};
__stencil_defineCustomElement(PopRemindersPanel, [514, "pop-reminders-panel", {
        "reminders": [1],
        "counts": [8],
        "filter": [1],
        "searchText": [1, "search-text"],
        "alarm": [8],
        "sounds": [1],
        "ringing": [1],
        "nextTitle": [1, "next-title"],
        "countdownDeadline": [2, "countdown-deadline"],
        "heroTotalMs": [2, "hero-total-ms"],
        "loading": [4],
        "error": [1],
        "showHeader": [4, "show-header"],
        "settingsOpen": [32],
        "snoozeMenuId": [32],
        "editingId": [32],
        "editTitle": [32],
        "editTime": [32],
        "createTitle": [32],
        "createTime": [32],
        "nowMs": [32]
    }, undefined, {
        "reminders": [{
                "onRemindersChange": 0
            }],
        "countdownDeadline": [{
                "onDeadlineChange": 0
            }]
    }]);
//# sourceMappingURL=reminders-panel.js.map