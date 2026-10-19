import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopDateTimePickerStyle0 from "./ui-kit/molecules/date-time-picker/date-time-picker.css?tag=pop-date-time-picker&encapsulation=scoped";
/**
 * pop-date-time-picker — date + time + All-day toggle.
 *
 *   <pop-date-time-picker
 *     value={'2026-05-29T09:00'}
 *     allDay={false}
 *     onValueChanged={ev => save(ev.detail)}
 *   />
 *
 * Emits `{ value: string | null, allDay: boolean }`. When allDay is true,
 * value is `YYYY-MM-DD`; otherwise `YYYY-MM-DDTHH:MM`. Wraps native
 * date/datetime-local inputs (best mobile picker UX) with a checkbox.
 * Empty value === no due date.
 */
export class PopDateTimePicker {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
    }
    /** ISO-ish string. `YYYY-MM-DDTHH:MM` when timed, `YYYY-MM-DD` when all-day, '' when unset. */
    value = '';
    allDay = false;
    disabled = false;
    valueChanged;
    toDateOnly(v) {
        if (!v)
            return '';
        return v.length >= 10 ? v.slice(0, 10) : v;
    }
    toDateTime(v) {
        if (!v)
            return '';
        if (v.includes('T'))
            return v;
        return `${v}T09:00`;
    }
    commit(value, allDay) {
        this.value = value;
        this.allDay = allDay;
        this.valueChanged.emit({ value, allDay });
    }
    handleAllDayToggle = (e) => {
        const next = e.target.checked;
        const v = next ? this.toDateOnly(this.value) : this.toDateTime(this.value);
        this.commit(v, next);
    };
    handleDateInput = (e) => {
        const v = e.target.value;
        this.commit(v, this.allDay);
    };
    handleClear = (e) => {
        e.preventDefault();
        this.commit('', this.allDay);
    };
    render() {
        return (h("div", { key: '0', class: "pdtp" },
            h("input", { key: '1', class: "pdtp__input", type: this.allDay ? 'date' : 'datetime-local', value: this.value, disabled: this.disabled, onInput: this.handleDateInput }),
            h("label", { key: '2', class: "pdtp__toggle" },
                h("input", { key: '3', type: "checkbox", checked: this.allDay, disabled: this.disabled, onChange: this.handleAllDayToggle }),
                h("span", { key: '4' }, "All day")),
            this.value && !this.disabled && (h("button", { key: '5', type: "button", class: "pdtp__clear", "aria-label": "Clear due date", onClick: this.handleClear }, "\u00D7"))));
    }
    static get style() { return PopDateTimePickerStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-date-time-picker",
        "$members$": {
            "value": [1025],
            "allDay": [1028, "all-day"],
            "disabled": [4]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=date-time-picker.js.map