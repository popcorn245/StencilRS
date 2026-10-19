import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopDateTimePickerStyle0 from "./ui-kit/molecules/date-time-picker/date-time-picker.css?tag=pop-date-time-picker&encapsulation=scoped";
export const PopDateTimePicker = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_proxyCustomElement(PopDateTimePicker, [514, "pop-date-time-picker", {
        "value": [1025],
        "allDay": [1028, "all-day"],
        "disabled": [4]
    }]);
//# sourceMappingURL=date-time-picker.js.map