import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
import { clampNumber, DEPTH_STOPS, DEPTH_PRESET_SOURCES, depthStopFromValues, depthValuesForStop, clampCustomSources, normalizeDepthValue, persistToggles, persistFromToggles, isTruthyValue, } from './field-logic';
export const PopField = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valueChange = __stencil_createEvent(this, "valueChange", 7);
    }
    get el() { return __stencil_getElement(this); }
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-field",
        "componentClassName": "PopField",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "spec",
                "type": "any",
                "attribute": "spec",
                "reflect": false,
                "mutable": false,
                "required": true,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "FieldSpec",
                    "resolved": "FieldSpec",
                    "references": {
                        "FieldSpec": {
                            "location": "global",
                            "id": "global::FieldSpec"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The field spec (object \u2014 set as a property, not an attribute)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "value",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "unknown",
                    "resolved": "unknown",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current value. string for most types; boolean for `boolean`;\n`{depth,maxSources}` for `depth`."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "disabled",
                "type": "boolean",
                "attribute": "disabled",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "invalid",
                "type": "boolean",
                "attribute": "invalid",
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
                    "text": "Owner-driven inline \"Required\" feedback (shown under the widget)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "valueChange",
                "method": "valueChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted with `{ key, value }` on every edit (incl. re-emitted slot-fallback\nchanges)."
                },
                "complexType": {
                    "original": "{ key: string; value: unknown }",
                    "resolved": "{ key: string; value: unknown; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-FIELD",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/field/field.css",
                        "relativePath": "field.css",
                        "originalComponentPath": "field.css"
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
        "hasPropNumber": false,
        "hasPropBoolean": true,
        "hasPropString": false,
        "hasPropMutable": true,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
        "hasState": false,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": true,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": true,
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["class", "role", "label", "hint", "value", "placeholder", "inputType", "askable", "onValueChange", "type", "min", "max", "step", "disabled", "aria-label", "onInput", "checked", "onPopChange", "default", "onPopLocationChange", "onClick", "onChange"],
        "htmlTagNames": ["div", "span", "pop-fillable-field", "input", "pop-switch", "pop-location", "button", "label", "slot"],
        "htmlParts": [],
        "htmlSlots": [""],
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
//# sourceMappingURL=field.js.map