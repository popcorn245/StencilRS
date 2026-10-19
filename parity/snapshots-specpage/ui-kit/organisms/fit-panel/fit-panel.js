import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h, Host } from "@stencil/core/testing";
import { fitCards, fitFormFields, fitSubmitLabel, fitFormHint, weightChart, glucoseChart, caloriesChart, readingDisplay, readingCount, readingEditFields, readingInitialValues, buildReadingPatch, dayLabel, shortDay, localTodayStr, logAtFor, } from './fit-panel.helpers';
const FALLBACK_DISCLAIMER = 'ℹ️ Fit tracks and summarizes your numbers — it is not medical advice and does not ' +
    'diagnose or recommend treatment. For anything concerning, check with your doctor.';
export const PopFitPanel = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popCardTap = __stencil_createEvent(this, "popCardTap", 7);
        this.popLog = __stencil_createEvent(this, "popLog", 7);
        this.popCancelLog = __stencil_createEvent(this, "popCancelLog", 7);
        this.popDayChange = __stencil_createEvent(this, "popDayChange", 7);
        this.popRefresh = __stencil_createEvent(this, "popRefresh", 7);
        this.popEditReading = __stencil_createEvent(this, "popEditReading", 7);
        this.popDeleteReading = __stencil_createEvent(this, "popDeleteReading", 7);
    }
    /** Latest readings (object OR JSON string). */
    latest = {};
    /** Goals / target bands (object OR JSON string). */
    goals = {};
    /** Optional precomputed metric cards. When omitted they're derived from
     *  `latest` + `goals` + `days` (day-aware). Lets a host reuse the panel with
     *  a different card set. (object array OR JSON string). */
    cards = [];
    /** The selected day (YYYY-MM-DD, local). Drives day-aware labels + the pill. */
    days = localTodayStr();
    /** Weight trend points (object array OR JSON string). */
    weightSeries = [];
    /** Blood-sugar trend points (object array OR JSON string). */
    glucoseSeries = [];
    /** Calories-per-day bars (object array OR JSON string). */
    caloriesSeries = [];
    /** The selected day's readings, grouped by domain (object OR JSON string). */
    readings = { glucose: [], body: [], food: [], workouts: [] };
    /** The card whose log form is open (''=none). Controlled by the host. */
    activeCard = '';
    /** The card just logged — stays highlighted after its form closes. */
    justLoggedCard = '';
    /** A confirmation line shown under the action zone (e.g. "✓ Logged weight"). */
    logReply = '';
    /** A log submit is in flight (disables the button). */
    logBusy = false;
    /** First-load state (no data yet) → a subtle loader. */
    loading = false;
    /** An error message to show instead of the body (with a Retry). */
    error = '';
    /** Render the panel's own header (title + date pill + refresh). Hosts that
     *  supply their own chrome (the hub's PanelShell) set this false. */
    showHeader = true;
    /** Days in the workouts rolling window (sub-line "last Nd"). */
    windowDays = 30;
    /** Transient form values for the open card (key → string). Local only; the
     *  final payload crosses up via popLog. */
    formValues = {};
    /** Recorded-at (ms) for the open form — now for today, else noon of the day. */
    logAt = Date.now();
    /** The reading row currently in inline-edit (`${domain}:${id}`), or ''. Local
     *  UI state (the host owns the network) — like remote-panel's room menu. */
    editingReadingKey = '';
    /** The reading row awaiting delete confirmation (`${domain}:${id}`), or ''. */
    confirmDeleteKey = '';
    /** A row edit/delete is in flight (disables its buttons). Cleared when the
     *  host's refresh lands (readings prop changes). */
    rowBusy = false;
    /** Transient edit-form values for the row being edited (key → string). */
    editValues = {};
    popCardTap;
    popLog;
    popCancelLog;
    popDayChange;
    popRefresh;
    /** Save an inline reading edit — `patch` holds the domain's edited fields. */
    popEditReading;
    /** Delete a logged reading (after the two-step confirm). */
    popDeleteReading;
    /** When the host's refresh lands (new readings), clear transient row state. */
    onReadingsChange() {
        this.editingReadingKey = '';
        this.confirmDeleteKey = '';
        this.rowBusy = false;
        this.editValues = {};
    }
    dateInput;
    onActiveCardChange(next) {
        // A freshly-opened card starts with empty inputs (context select defaulted)
        // and a recorded-at defaulted to the selected day.
        this.formValues = {};
        if (next)
            this.logAt = logAtFor(this.days || localTodayStr());
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
    hasData(latest) {
        return !!latest && Object.keys(latest).length > 0;
    }
    onCardTap = (e) => {
        e.stopPropagation();
        this.popCardTap.emit(e.detail);
    };
    onFieldChange = (e) => {
        e.stopPropagation();
        const { key, value } = e.detail;
        this.formValues = { ...this.formValues, [key]: value == null ? '' : String(value) };
    };
    submit = () => {
        const card = this.activeCard;
        if (!card || this.logBusy)
            return;
        const fields = fitFormFields(card);
        const values = {};
        for (const f of fields)
            values[f.key] = (this.formValues[f.key] ?? f.defaultValue ?? '').trim();
        // Require the first field.
        const first = fields[0];
        if (first && !values[first.key])
            return;
        this.popLog.emit({ card, values, at: this.logAt });
    };
    cancel = () => {
        this.popCancelLog.emit();
    };
    // ── readings-by-day inline edit / delete ──────────────────────────────────
    rowKey(domain, id) {
        return `${domain}:${id}`;
    }
    startEdit(domain, r) {
        this.editingReadingKey = this.rowKey(domain, r.id);
        this.editValues = readingInitialValues(domain, r);
        this.confirmDeleteKey = '';
    }
    cancelEdit = () => {
        this.editingReadingKey = '';
        this.editValues = {};
    };
    onEditFieldChange = (e) => {
        e.stopPropagation();
        const { key, value } = e.detail;
        this.editValues = { ...this.editValues, [key]: value == null ? '' : String(value) };
    };
    saveEdit(domain, id) {
        if (this.rowBusy)
            return;
        const patch = buildReadingPatch(domain, this.editValues);
        this.rowBusy = true;
        this.popEditReading.emit({ domain, id, patch });
    }
    askDelete(domain, id) {
        this.confirmDeleteKey = this.rowKey(domain, id);
        this.editingReadingKey = '';
    }
    cancelDelete = () => {
        this.confirmDeleteKey = '';
    };
    confirmDelete(domain, id) {
        if (this.rowBusy)
            return;
        this.rowBusy = true;
        this.popDeleteReading.emit({ domain, id });
    }
    openDatePicker = () => {
        const el = this.dateInput;
        if (!el)
            return;
        if (typeof el.showPicker === 'function')
            el.showPicker();
        else
            el.focus();
    };
    // ── render pieces ────────────────────────────────────────────────────────
    renderHeader(day) {
        return (h("header", { class: "fitp-header" },
            h("span", { class: "fitp-title" }, "Fit"),
            h("div", { class: "fitp-headright" },
                h("button", { type: "button", class: "fitp-datepill", onClick: this.openDatePicker, "aria-label": `Pick a day (showing ${shortDay(day)})` },
                    "\uD83D\uDCC5 ",
                    shortDay(day)),
                h("button", { type: "button", class: "fitp-refresh", onClick: () => this.popRefresh.emit(), "aria-label": "Refresh" }, "\u21BB"),
                h("input", { class: "fitp-datehidden", type: "date", value: day, max: localTodayStr(), "aria-hidden": "true", tabindex: -1, ref: (el) => (this.dateInput = el), onChange: (e) => {
                        const v = e.target.value;
                        if (v)
                            this.popDayChange.emit(v);
                    } }))));
    }
    renderForm(latest) {
        const card = this.activeCard;
        const fields = fitFormFields(card);
        if (!fields.length)
            return null;
        const hint = fitFormHint(card, latest);
        // Two plain fields sit side-by-side; blood sugar stacks (its context select
        // wants full width).
        const grouped = fields.length === 2 && card !== 'bg';
        const fieldEls = fields.map((f) => (h("pop-field", { key: f.key, class: "fitp-field", spec: f, value: this.formValues[f.key] ?? '', onValueChange: this.onFieldChange })));
        return (h("div", { class: "fitp-cardform", key: `form-${card}` },
            h("div", { class: "fitp-cardform-head" },
                h("span", null,
                    "Log ",
                    (fields[0]?.label || card).replace(/ \(.*\)$/, '')),
                h("button", { type: "button", class: "fitp-x", onClick: this.cancel, "aria-label": "Close" }, "\u2715")),
            hint && h("div", { class: "fitp-cardform-hint" }, hint),
            h("div", { class: { 'fitp-fields': true, 'fitp-fields--row': grouped } }, fieldEls),
            h("div", { class: "fitp-cardform-actions" },
                h("button", { type: "button", class: "fitp-btn", onClick: this.cancel }, "Cancel"),
                h("button", { type: "button", class: "fitp-btn fitp-btn--primary", disabled: this.logBusy, onClick: this.submit }, this.logBusy ? '…' : fitSubmitLabel(card)))));
    }
    renderCards(cards, latest) {
        return [
            (this.activeCard || this.logReply) && (h("div", { class: "fitp-actionzone" },
                this.activeCard && this.renderForm(latest),
                this.logReply && h("div", { class: "fitp-log-reply" }, this.logReply))),
            h("div", { class: "fitp-cards" }, cards.map((c) => (h("pop-metric-card", { key: c.key, glyph: c.glyph, label: c.label, value: c.value, sub: c.sub, cardKey: c.key, loggable: c.loggable !== false, active: this.activeCard === c.key || this.justLoggedCard === c.key, onPopCardTap: this.onCardTap })))),
        ];
    }
    /** The inline edit form for a reading row (pop-field per domain + Save/Cancel). */
    renderRowEdit(domain, id) {
        const fields = readingEditFields(domain);
        return (h("div", { class: "fitp-dayrow fitp-dayrow--edit", key: `${domain}:${id}` },
            h("div", { class: "fitp-dayrow-fields" }, fields.map((f) => (h("pop-field", { key: f.key, class: "fitp-field", spec: f, value: this.editValues[f.key] ?? '', onValueChange: this.onEditFieldChange })))),
            h("div", { class: "fitp-dayrow-actions" },
                h("button", { type: "button", class: "fitp-btn", disabled: this.rowBusy, onClick: this.cancelEdit }, "Cancel"),
                h("button", { type: "button", class: "fitp-btn fitp-btn--primary", disabled: this.rowBusy, onClick: () => this.saveEdit(domain, id) }, this.rowBusy ? '…' : 'Save'))));
    }
    renderReadings(readings, day) {
        const total = readingCount(readings);
        const label = dayLabel(day);
        const row = (domain, r) => {
            const key = this.rowKey(domain, r.id);
            if (this.editingReadingKey === key)
                return this.renderRowEdit(domain, r.id);
            const disp = readingDisplay(domain, r);
            const confirming = this.confirmDeleteKey === key;
            return (h("div", { class: "fitp-dayrow", key: key },
                h("span", { class: "fitp-dayrow-glyph" }, disp.glyph),
                h("span", { class: "fitp-dayrow-main" }, disp.main),
                h("span", { class: "fitp-dayrow-meta" }, disp.meta),
                h("div", { class: "fitp-dayrow-actions" }, confirming
                    ? [
                        h("button", { type: "button", class: "fitp-rowbtn fitp-rowbtn--danger", disabled: this.rowBusy, onClick: () => this.confirmDelete(domain, r.id) }, this.rowBusy ? '…' : 'Delete?'),
                        h("button", { type: "button", class: "fitp-rowbtn", disabled: this.rowBusy, onClick: this.cancelDelete }, "Cancel"),
                    ]
                    : [
                        h("button", { type: "button", class: "fitp-rowbtn", "aria-label": "Edit reading", title: "Edit", onClick: () => this.startEdit(domain, r) }, "\u270E"),
                        h("button", { type: "button", class: "fitp-rowbtn", "aria-label": "Delete reading", title: "Delete", onClick: () => this.askDelete(domain, r.id) }, "\u2715"),
                    ])));
        };
        return (h("div", { class: "fitp-section" },
            h("div", { class: "fitp-section-title" },
                "Readings on ",
                label),
            total === 0 ? (h("div", { class: "fitp-empty" },
                "No readings logged on ",
                label,
                ".")) : (h("div", { class: "fitp-day-list" },
                readings.glucose.map((r) => row('glucose', r)),
                readings.body.map((r) => row('body', r)),
                readings.food.map((r) => row('food', r)),
                readings.workouts.map((r) => row('workout', r))))));
    }
    renderChartEmpty(text) {
        return h("div", { class: "fitp-chart-empty" }, text);
    }
    renderCharts(goals, weight, glucose, calories) {
        const w = weightChart(weight, goals.goalWeightLbs);
        const g = glucoseChart(glucose, goals.glucoseMin, goals.glucoseMax);
        const c = caloriesChart(calories, goals.dailyCalorieGoal);
        const bandHint = goals.glucoseMin != null && goals.glucoseMax != null
            ? goals.glucoseBandSource === 'derived'
                ? `typical range ${goals.glucoseMin}–${goals.glucoseMax}`
                : `normal range ${goals.glucoseMin}–${goals.glucoseMax}`
            : '';
        return [
            h("div", { class: "fitp-section" },
                h("div", { class: "fitp-section-title" },
                    "Weight ",
                    goals.goalWeightLbs != null && h("span", { class: "fitp-section-hint" },
                        "goal ",
                        goals.goalWeightLbs)),
                weight.length >= 2 ? (h("div", { class: "fitp-chart-card" },
                    h("pop-line-chart", { series: w.series, refLines: w.refLines, leftUnit: " lb", chartTitle: "Weight trend" }))) : (this.renderChartEmpty('Log a couple of weigh-ins to see the trend.'))),
            h("div", { class: "fitp-section" },
                h("div", { class: "fitp-section-title" },
                    "Blood sugar ",
                    bandHint && h("span", { class: "fitp-section-hint" }, bandHint)),
                glucose.length ? (h("div", { class: "fitp-chart-card" },
                    h("pop-line-chart", { series: g.series, rangeBands: g.rangeBands, chartTitle: "Blood-sugar trend with normal range shaded" }))) : (this.renderChartEmpty('Log a blood-sugar reading to see the trend.'))),
            h("div", { class: "fitp-section" },
                h("div", { class: "fitp-section-title" },
                    "Calories / day ",
                    goals.dailyCalorieGoal != null && h("span", { class: "fitp-section-hint" },
                        "goal ",
                        goals.dailyCalorieGoal)),
                calories.some((b) => b.v > 0) ? (h("div", { class: "fitp-chart-card" },
                    h("pop-line-chart", { series: c.series, refLines: c.refLines, xLabels: c.xLabels, chartTitle: "Calories per day vs your goal" }))) : (this.renderChartEmpty('Log meals to see calories per day.'))),
        ];
    }
    render() {
        const latest = this.parse(this.latest, {});
        const goals = this.parse(this.goals, {});
        const day = this.days || localTodayStr();
        const providedCards = this.parse(this.cards, []);
        const cards = providedCards.length ? providedCards : this.hasData(latest) ? fitCards(latest, goals, day, this.windowDays) : [];
        const weight = this.parse(this.weightSeries, []);
        const glucose = this.parse(this.glucoseSeries, []);
        const calories = this.parse(this.caloriesSeries, []);
        const readings = this.parse(this.readings, { glucose: [], body: [], food: [], workouts: [] });
        const hasData = this.hasData(latest) || cards.length > 0;
        return (h(Host, { key: '0' },
            h("section", { key: '1', class: "fitp", "aria-label": "Fit" },
                this.showHeader && this.renderHeader(day),
                this.error && !hasData ? (h("div", { class: "fitp-state fitp-state--err" },
                    h("span", null, this.error),
                    h("button", { type: "button", class: "fitp-btn", onClick: () => this.popRefresh.emit() }, "Retry"))) : !hasData ? (h("div", { class: "fitp-state" }, this.loading ? 'Loading…' : 'No health data yet.')) : ([
                    this.renderCards(cards, latest),
                    this.renderReadings(readings, day),
                    this.renderCharts(goals, weight, glucose, calories),
                    h("div", { class: "fitp-disclaimer" }, FALLBACK_DISCLAIMER),
                ]))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-fit-panel",
        "componentClassName": "PopFitPanel",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "latest",
                "type": "any",
                "attribute": "latest",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "{}",
                "complexType": {
                    "original": "FitLatest | string",
                    "resolved": "any",
                    "references": {
                        "FitLatest": {
                            "location": "global",
                            "id": "global::FitLatest"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Latest readings (object OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "goals",
                "type": "any",
                "attribute": "goals",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "{}",
                "complexType": {
                    "original": "FitGoals | string",
                    "resolved": "any",
                    "references": {
                        "FitGoals": {
                            "location": "global",
                            "id": "global::FitGoals"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Goals / target bands (object OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "cards",
                "type": "string",
                "attribute": "cards",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "FitPanelCard[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "FitPanelCard": {
                            "location": "global",
                            "id": "global::FitPanelCard"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Optional precomputed metric cards. When omitted they're derived from\n`latest` + `goals` + `days` (day-aware). Lets a host reuse the panel with\na different card set. (object array OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "days",
                "type": "any",
                "attribute": "days",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "localTodayStr()",
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The selected day (YYYY-MM-DD, local). Drives day-aware labels + the pill."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "weightSeries",
                "type": "string",
                "attribute": "weight-series",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "FitPoint[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "FitPoint": {
                            "location": "global",
                            "id": "global::FitPoint"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Weight trend points (object array OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "glucoseSeries",
                "type": "string",
                "attribute": "glucose-series",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "FitGlucosePoint[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "FitGlucosePoint": {
                            "location": "global",
                            "id": "global::FitGlucosePoint"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Blood-sugar trend points (object array OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "caloriesSeries",
                "type": "string",
                "attribute": "calories-series",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "FitDayBar[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "FitDayBar": {
                            "location": "global",
                            "id": "global::FitDayBar"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Calories-per-day bars (object array OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "readings",
                "type": "any",
                "attribute": "readings",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "{ glucose: [], body: [], food: [], workouts: [] }",
                "complexType": {
                    "original": "FitDayReadings | string",
                    "resolved": "any",
                    "references": {
                        "FitDayReadings": {
                            "location": "global",
                            "id": "global::FitDayReadings"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The selected day's readings, grouped by domain (object OR JSON string)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "activeCard",
                "type": "string",
                "attribute": "active-card",
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
                    "text": "The card whose log form is open (''=none). Controlled by the host."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "justLoggedCard",
                "type": "string",
                "attribute": "just-logged-card",
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
                    "text": "The card just logged \u2014 stays highlighted after its form closes."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "logReply",
                "type": "string",
                "attribute": "log-reply",
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
                    "text": "A confirmation line shown under the action zone (e.g. \"\u2713 Logged weight\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "logBusy",
                "type": "boolean",
                "attribute": "log-busy",
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
                    "text": "A log submit is in flight (disables the button)."
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
                    "text": "First-load state (no data yet) \u2192 a subtle loader."
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
                    "text": "An error message to show instead of the body (with a Retry)."
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
                    "text": "Render the panel's own header (title + date pill + refresh). Hosts that\nsupply their own chrome (the hub's PanelShell) set this false."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "windowDays",
                "type": "number",
                "attribute": "window-days",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "30",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Days in the workouts rolling window (sub-line \"last Nd\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "formValues"
            }, {
                "name": "logAt"
            }, {
                "name": "editingReadingKey"
            }, {
                "name": "confirmDeleteKey"
            }, {
                "name": "rowBusy"
            }, {
                "name": "editValues"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popCardTap",
                "method": "popCardTap",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popLog",
                "method": "popLog",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ card: string; values: Record<string, string>; at: number }",
                    "resolved": "{ card: string; values: Record<string, string>; at: number; }",
                    "references": {
                        "Record": {
                            "location": "global",
                            "id": "global::Record"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popCancelLog",
                "method": "popCancelLog",
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
                "name": "popDayChange",
                "method": "popDayChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
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
                "name": "popEditReading",
                "method": "popEditReading",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Save an inline reading edit \u2014 `patch` holds the domain's edited fields."
                },
                "complexType": {
                    "original": "{ domain: FitReadingDomain; id: string; patch: Record<string, unknown> }",
                    "resolved": "{ domain: FitReadingDomain; id: string; patch: Record<string, unknown>; }",
                    "references": {
                        "FitReadingDomain": {
                            "location": "global",
                            "id": "global::FitReadingDomain"
                        },
                        "Record": {
                            "location": "global",
                            "id": "global::Record"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popDeleteReading",
                "method": "popDeleteReading",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Delete a logged reading (after the two-step confirm)."
                },
                "complexType": {
                    "original": "{ domain: FitReadingDomain; id: string }",
                    "resolved": "{ domain: FitReadingDomain; id: string; }",
                    "references": {
                        "FitReadingDomain": {
                            "location": "global",
                            "id": "global::FitReadingDomain"
                        }
                    }
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "readings",
                "methodName": "onReadingsChange",
                "handlerOptions": undefined
            }, {
                "propName": "activeCard",
                "methodName": "onActiveCardChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-FIT-PANEL",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/fit-panel/fit-panel.css",
                        "relativePath": "fit-panel.css",
                        "originalComponentPath": "fit-panel.css"
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
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": false,
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
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "type", "onClick", "aria-label", "value", "max", "aria-hidden", "tabindex", "ref", "onChange", "key", "spec", "onValueChange", "disabled", "glyph", "label", "sub", "cardKey", "loggable", "active", "onPopCardTap", "title", "series", "refLines", "leftUnit", "chartTitle", "rangeBands", "xLabels"],
        "htmlTagNames": ["header", "span", "div", "button", "input", "pop-field", "pop-metric-card", "pop-line-chart", "section"],
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
        "readings": [{
                "onReadingsChange": 0
            }],
        "activeCard": [{
                "onActiveCardChange": 0
            }]
    }; }
};
//# sourceMappingURL=fit-panel.js.map