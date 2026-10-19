import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { clampNumber, DEPTH_STOPS, DEPTH_PRESET_SOURCES, depthStopFromValues, depthValuesForStop, clampCustomSources, normalizeDepthValue, persistToggles, persistFromToggles, isTruthyValue, } from './field-logic';
import PopFieldStyle0 from "./ui-kit/molecules/field/field.css?tag=pop-field&encapsulation=scoped";
export const PopField = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.valueChange = __stencil_createEvent(this, "valueChange", 7);
    }
    get el() { return this; }
    /** The field spec (object — set as a property, not an attribute). */
    spec;
    /** Current value. string for most types; boolean for `boolean`;
     *  `{depth,maxSources}` for `depth`. */
    value;
    disabled = false;
    /** Owner-driven inline "Required" feedback (shown under the widget). */
    invalid = false;
    /** Emitted with `{ key, value }` on every edit (incl. re-emitted slot-fallback
     *  changes). */
    valueChange;
    emit(value) {
        this.value = value;
        this.valueChange.emit({ key: this.spec.key, value });
    }
    /** Swallow an inner widget's own `valueChange` (pop-fillable-field, a slotted
     *  custom widget) and re-emit it normalized as pop-field's `{key, value}`. */
    relay = (e, map) => {
        e.stopPropagation();
        const detail = e.detail;
        this.emit(map ? map(detail) : detail);
    };
    get str() {
        return typeof this.value === 'string' ? this.value : this.value == null ? '' : String(this.value);
    }
    // ── chrome ──────────────────────────────────────────────────────────────────
    labelText() {
        return this.spec.label + (this.spec.required ? ' *' : '');
    }
    chrome(control, opts = {}) {
        return (h("div", { class: {
                field: true,
                [`field--${this.spec.type}`]: true,
                'field--invalid': this.invalid,
                'field--disabled': this.disabled,
            } },
            !opts.ownLabel && (h("span", { class: "field__label" },
                h("span", { class: "field__label-text" }, this.labelText()),
                this.spec.hint && h("span", { class: "field__hint" }, this.spec.hint))),
            control,
            this.invalid && (h("span", { class: "field__error", role: "alert" }, "Required"))));
    }
    // ── widgets per type ────────────────────────────────────────────────────────
    renderFillable(inputType) {
        const base = inputType === 'select' && this.spec.options ? this.spec.options.map((o) => ({ ...o })) : undefined;
        // An OPTIONAL select with no default starts unset, but a bare <select> shows
        // its first option anyway — prepend an explicit "—" so unset renders unset.
        const opts = base && this.spec.optional && !this.spec.defaultValue ? [{ value: '', label: '—' }, ...base] : base;
        return this.chrome(h("pop-fillable-field", { label: this.labelText(), hint: this.spec.hint, value: this.str, placeholder: this.spec.placeholder, inputType: "text", askable: false, ...(opts ? { options: opts } : {}), onValueChange: (e) => this.relay(e) }), { ownLabel: true });
    }
    renderNumber() {
        const clampedNote = this.str.trim() !== '' && (this.spec.min != null || this.spec.max != null)
            ? this.spec.max != null && Number(this.str) === this.spec.max
                ? `Max ${this.spec.max}`
                : this.spec.min != null && Number(this.str) === this.spec.min
                    ? `Min ${this.spec.min}`
                    : ''
            : '';
        return this.chrome([
            h("input", { class: "field__input", type: "number", value: this.str, placeholder: this.spec.placeholder, min: this.spec.min, max: this.spec.max, step: this.spec.step, disabled: this.disabled, "aria-label": this.spec.label, onInput: (e) => {
                    const raw = e.target.value;
                    const clamped = clampNumber(raw, this.spec.min, this.spec.max);
                    this.emit(clamped != null ? String(clamped) : raw);
                } }),
            clampedNote && (h("span", { class: "field__note", role: "status" }, clampedNote)),
        ]);
    }
    renderDate() {
        return this.chrome(h("input", { class: "field__input", type: "date", value: this.str, disabled: this.disabled, "aria-label": this.spec.label, onInput: (e) => this.emit(e.target.value) }));
    }
    renderBoolean() {
        const on = isTruthyValue(this.value);
        return (h("div", { class: { field: true, 'field--boolean': true, 'field--invalid': this.invalid, 'field--disabled': this.disabled } },
            h("span", { class: "field__switchrow" },
                h("span", { class: "field__label" },
                    h("span", { class: "field__label-text" }, this.labelText()),
                    this.spec.hint && h("span", { class: "field__hint" }, this.spec.hint)),
                h("pop-switch", { checked: on, disabled: this.disabled, label: this.spec.label, onPopChange: (e) => {
                        e.stopPropagation();
                        this.emit(e.detail);
                    } }))));
    }
    renderLocation() {
        return this.chrome(h("pop-location", { value: this.str, default: this.spec.defaultValue || '', onPopLocationChange: (e) => {
                e.stopPropagation();
                const d = e.detail || {};
                this.emit((d.zip && d.zip.trim()) || (d.label && d.label.trim()) || '');
            } }));
    }
    /** Depth slider (Quick/Standard/Deep/Custom) + source-count box. */
    renderDepth() {
        const dv = normalizeDepthValue(this.value);
        const stop = depthStopFromValues(dv.depth, dv.maxSources);
        const idx = DEPTH_STOPS.indexOf(stop);
        const isCustom = stop === 'custom';
        const customCount = clampCustomSources(parseInt(dv.maxSources || '8', 10));
        const count = isCustom ? customCount : DEPTH_PRESET_SOURCES[stop];
        const applyStop = (s) => this.emit(depthValuesForStop(s, customCount));
        return this.chrome(h("div", { class: "field__depth" },
            h("div", { class: "field__depth-head" },
                h("div", { class: "field__depth-count" },
                    h("input", { type: "number", min: "1", max: "10", value: String(count), disabled: !isCustom || this.disabled, "aria-label": "Sources to read", onInput: (e) => this.emit({
                            depth: '',
                            maxSources: String(clampCustomSources(parseInt(e.target.value, 10))),
                        }) }),
                    h("span", { class: "field__depth-unit" }, "sources"))),
            h("input", { class: "field__depth-slider", type: "range", min: "0", max: String(DEPTH_STOPS.length - 1), step: "1", value: String(idx), disabled: this.disabled, "aria-label": this.spec.label, onInput: (e) => applyStop(DEPTH_STOPS[parseInt(e.target.value, 10)]) }),
            h("div", { class: "field__depth-ticks" }, DEPTH_STOPS.map((s) => (h("button", { type: "button", class: { 'field__depth-tick': true, 'field__depth-tick--on': s === stop }, disabled: this.disabled, onClick: () => applyStop(s) }, s))))));
    }
    /** Persist as two checkboxes → one 'none'|'note'|'index'|'both' value. */
    renderPersist() {
        const { note, index } = persistToggles(this.str);
        const set = (nextNote, nextIndex) => this.emit(persistFromToggles(nextNote, nextIndex));
        const row = (checked, text, onToggle) => (h("label", { class: "field__check-row" },
            h("input", { type: "checkbox", checked: checked, disabled: this.disabled, onChange: onToggle }),
            h("span", null, text)));
        return this.chrome(h("div", { class: "field__check-group" },
            row(note, 'Save as note', () => set(!note, index)),
            row(index, 'Add to knowledge base', () => set(note, !index))));
    }
    /** Unknown type → the app slots the widget; chrome + valueChange relay kept. */
    renderSlotFallback() {
        return this.chrome(h("span", { class: "field__slot", ...{ onValueChange: (e) => this.relay(e) } },
            h("slot", null)));
    }
    render() {
        if (!this.spec)
            return null;
        switch (this.spec.type) {
            case 'text':
            case 'select':
                return this.renderFillable(this.spec.type);
            case 'number':
                return this.renderNumber();
            case 'date':
                return this.renderDate();
            case 'boolean':
                return this.renderBoolean();
            case 'location':
                return this.renderLocation();
            case 'depth':
                return this.renderDepth();
            case 'persist':
                return this.renderPersist();
            default:
                return this.renderSlotFallback();
        }
    }
    static get style() { return PopFieldStyle0(); }
};
__stencil_proxyCustomElement(PopField, [774, "pop-field", {
        "spec": [8],
        "value": [1040],
        "disabled": [4],
        "invalid": [4]
    }]);
//# sourceMappingURL=field.js.map