import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopRecurrenceEditorStyle0 from "./ui-kit/organisms/recurrence-editor/recurrence-editor.css?tag=pop-recurrence-editor&encapsulation=scoped";
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const PopRecurrenceEditor = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valueChange = __stencil_createEvent(this, "valueChange", 7);
    }
    /** Controlled value. `null` means "not recurring". */
    value = null;
    /** Fired whenever the user changes the value. */
    valueChange;
    enabled = false;
    frequency = 'weekly';
    days = [];
    endDate = '';
    componentWillLoad() {
        this.hydrateFromValue(this.value);
    }
    onValueChange(next) {
        this.hydrateFromValue(next);
    }
    hydrateFromValue(v) {
        if (!v) {
            this.enabled = false;
            this.frequency = 'weekly';
            this.days = [];
            this.endDate = '';
            return;
        }
        this.enabled = true;
        this.frequency = v.frequency;
        this.days = Array.isArray(v.days) ? [...v.days] : [];
        this.endDate = v.endDate || '';
    }
    emit() {
        if (!this.enabled) {
            this.valueChange.emit(null);
            return;
        }
        const out = { frequency: this.frequency };
        if (this.frequency === 'weekly' || this.frequency === 'monthly') {
            if (this.days.length > 0)
                out.days = [...this.days].sort((a, b) => a - b);
        }
        if (this.endDate)
            out.endDate = this.endDate;
        this.valueChange.emit(out);
    }
    toggleEnabled = (e) => {
        this.enabled = e.target.checked;
        if (!this.enabled) {
            this.days = [];
            this.endDate = '';
        }
        this.emit();
    };
    setFrequency = (e) => {
        this.frequency = e.target.value;
        // Reset days when frequency category changes
        this.days = [];
        this.emit();
    };
    toggleWeekday = (idx) => {
        if (this.days.includes(idx))
            this.days = this.days.filter(d => d !== idx);
        else
            this.days = [...this.days, idx];
        this.emit();
    };
    setMonthlyDay = (e) => {
        const v = parseInt(e.target.value, 10);
        this.days = isNaN(v) ? [] : [v];
        this.emit();
    };
    setEndDate = (e) => {
        this.endDate = e.target.value;
        this.emit();
    };
    render() {
        return (h("div", { key: '0', class: "pre" },
            h("label", { key: '1', class: "pre__row" },
                h("input", { key: '2', type: "checkbox", class: "pre__toggle", checked: this.enabled, onChange: this.toggleEnabled }),
                h("span", { key: '3' }, "Recurring")),
            this.enabled && (h("div", { key: '4', class: "pre__body" },
                h("label", { key: '5', class: "pre__field" },
                    h("span", { key: '6', class: "pre__label" }, "Frequency"),
                    h("select", { key: '7', class: "pre__select", onChange: this.setFrequency },
                        h("option", { key: '8', value: "daily", selected: this.frequency === 'daily' }, "Daily"),
                        h("option", { key: '9', value: "weekly", selected: this.frequency === 'weekly' }, "Weekly"),
                        h("option", { key: 'a', value: "monthly", selected: this.frequency === 'monthly' }, "Monthly"),
                        h("option", { key: 'b', value: "yearly", selected: this.frequency === 'yearly' }, "Yearly"))),
                this.frequency === 'weekly' && (h("div", { key: 'c', class: "pre__field" },
                    h("span", { key: 'd', class: "pre__label" }, "Days of week"),
                    h("div", { key: 'e', class: "pre__weekdays", role: "group", "aria-label": "Days of week" }, WEEKDAYS.map((label, idx) => (h("button", { type: "button", class: {
                            'pre__day': true,
                            'pre__day--active': this.days.includes(idx),
                        }, "aria-pressed": this.days.includes(idx) ? 'true' : 'false', onClick: () => this.toggleWeekday(idx) }, label)))))),
                this.frequency === 'monthly' && (h("label", { key: 'f', class: "pre__field" },
                    h("span", { key: 'g', class: "pre__label" }, "Day of month"),
                    h("input", { key: 'h', type: "number", class: "pre__input", min: "1", max: "31", value: this.days[0] ?? '', onInput: this.setMonthlyDay }))),
                h("label", { key: 'i', class: "pre__field" },
                    h("span", { key: 'j', class: "pre__label" }, "End date (optional)"),
                    h("input", { key: 'k', type: "date", class: "pre__input", value: this.endDate, onInput: this.setEndDate }))))));
    }
    static get watchers() { return {
        "value": [{
                "onValueChange": 0
            }]
    }; }
};
PopRecurrenceEditor.style = PopRecurrenceEditorStyle0();
//# sourceMappingURL=recurrence-editor.js.map