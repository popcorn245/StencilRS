import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopChipInput = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
        this.createChip = __stencil_createEvent(this, "createChip", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Current value array. */
    value = [];
    /** Optional suggestions for autocomplete + chip label resolution. */
    suggestions = [];
    /** Placeholder for the trailing text input. */
    placeholder = 'Add…';
    /** Reject values that don't match a suggestion id. */
    strict = false;
    /** Hide the trailing add-input (read-only mode). */
    readonly = false;
    valueChanged;
    /** Emitted when the user picks the inline "Create «text»" row (the typed text
     *  matches no existing suggestion). The host persists a new chip/tag and adds
     *  its id to `value`. Only fires when `allowCreate` is true. */
    createChip;
    /** Show the inline "＋ Create «text»" row when the draft matches no suggestion.
     *  Off by default so existing {id,label} / free-text callers are unchanged. */
    allowCreate = false;
    draft = '';
    openSuggestions = false;
    inputRef = null;
    /** Imperatively focus the input. */
    async focusInput() {
        this.inputRef?.focus();
    }
    currentValue() {
        return Array.isArray(this.value) ? this.value : [];
    }
    suggestionFor(id) {
        return this.suggestions.find((s) => s.id === id);
    }
    labelFor(id) {
        const hit = this.suggestionFor(id);
        return hit ? hit.label : id;
    }
    /** Inline styles that tint a selected chip from its suggestion's `color`.
     *  No color → empty object, so the neutral (brand-blue) CSS default applies. */
    chipStyle(id) {
        const color = this.suggestionFor(id)?.color;
        if (!color)
            return {};
        return {
            background: `color-mix(in oklab, ${color} 16%, transparent)`,
            borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
        };
    }
    /** Whether to offer the inline "Create «draft»" row: create is enabled, the
     *  draft is non-empty, and it matches no existing suggestion by id or label. */
    canCreateDraft() {
        if (!this.allowCreate)
            return false;
        const q = this.draft.trim();
        if (!q)
            return false;
        const lower = q.toLowerCase();
        return !this.suggestions.some((s) => s.id.toLowerCase() === lower || s.label.toLowerCase() === lower);
    }
    commit(next) {
        this.value = next;
        this.valueChanged.emit([...next]);
    }
    addRaw(raw) {
        const trimmed = raw.trim();
        if (!trimmed)
            return;
        const current = this.currentValue();
        if (current.includes(trimmed))
            return;
        if (this.strict) {
            const hit = this.suggestions.find((s) => s.id === trimmed || s.label.toLowerCase() === trimmed.toLowerCase());
            if (!hit)
                return;
            this.commit([...current, hit.id]);
        }
        else {
            this.commit([...current, trimmed]);
        }
        this.draft = '';
        this.openSuggestions = false;
    }
    /** Emit createChip for the current draft (the host persists + adds the id). */
    emitCreate() {
        const label = this.draft.trim();
        if (!label)
            return;
        this.createChip.emit({ label });
        this.draft = '';
        this.openSuggestions = false;
    }
    removeAt(index) {
        const current = this.currentValue();
        const next = current.slice(0, index).concat(current.slice(index + 1));
        this.commit(next);
    }
    handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            // When the draft names no existing suggestion and create is on, Enter/comma
            // creates a new chip (host persists it) instead of a raw/strict-rejected add.
            if (this.canCreateDraft()) {
                this.emitCreate();
                return;
            }
            this.addRaw(this.draft);
            return;
        }
        if (e.key === 'Backspace' && !this.draft) {
            const current = this.currentValue();
            if (current.length)
                this.removeAt(current.length - 1);
        }
    };
    filteredSuggestions() {
        const current = new Set(this.currentValue());
        const q = this.draft.trim().toLowerCase();
        return this.suggestions
            .filter((s) => !current.has(s.id))
            .filter((s) => !q || s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
            .slice(0, 8);
    }
    render() {
        const chips = this.currentValue();
        const suggestions = this.filteredSuggestions();
        const showCreate = this.canCreateDraft();
        return (h("div", { key: '0', class: `pci ${this.readonly ? 'pci--readonly' : ''}` },
            h("div", { key: '1', class: "pci__chips" },
                chips.map((id, i) => {
                    const sug = this.suggestionFor(id);
                    return (h("span", { class: "pci__chip", key: id, style: this.chipStyle(id) },
                        sug?.emoji && h("span", { class: "pci__chip-emoji", "aria-hidden": "true" }, sug.emoji),
                        h("span", { class: "pci__chip-label" }, this.labelFor(id)),
                        !this.readonly && (h("button", { type: "button", class: "pci__chip-remove", "aria-label": `Remove ${this.labelFor(id)}`, onClick: (e) => {
                                e.preventDefault();
                                this.removeAt(i);
                            } }, "\u00D7"))));
                }),
                !this.readonly && (h("input", { key: '2', ref: (el) => (this.inputRef = el || null), class: "pci__input", type: "text", placeholder: chips.length === 0 ? this.placeholder : '', value: this.draft, onInput: (e) => {
                        this.draft = e.target.value;
                        this.openSuggestions = true;
                    }, onFocus: () => (this.openSuggestions = true), onBlur: () => setTimeout(() => (this.openSuggestions = false), 120), onKeyDown: this.handleKeyDown }))),
            !this.readonly && this.openSuggestions && (suggestions.length > 0 || showCreate) && (h("ul", { key: '3', class: "pci__suggestions", role: "listbox" },
                suggestions.map((s) => (h("li", { role: "option", class: "pci__suggestion", onMouseDown: (e) => {
                        e.preventDefault();
                        this.addRaw(s.id);
                    } },
                    s.emoji ? (h("span", { class: "pci__suggestion-emoji", "aria-hidden": "true" }, s.emoji)) : (h("span", { class: "pci__suggestion-dot", "aria-hidden": "true", style: { background: s.color || 'var(--brand-blue, #4299e1)' } })),
                    h("span", { class: "pci__suggestion-label" }, s.label)))),
                showCreate && (h("li", { key: '4', role: "option", class: "pci__suggestion pci__suggestion--create", onMouseDown: (e) => {
                        e.preventDefault();
                        this.emitCreate();
                    } },
                    h("span", { key: '5', class: "pci__suggestion-plus", "aria-hidden": "true" }, "\uFF0B"),
                    h("span", { key: '6', class: "pci__suggestion-label" },
                        "Create \u201C",
                        this.draft.trim(),
                        "\u201D")))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-chip-input",
        "componentClassName": "PopChipInput",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "value",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "string[]",
                    "resolved": "string[]",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current value array."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "suggestions",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "ChipSuggestion[]",
                    "resolved": "ChipSuggestion[]",
                    "references": {
                        "ChipSuggestion": {
                            "location": "local",
                            "path": "ui-kit/molecules/chip-input/chip-input.tsx",
                            "id": "ui-kit/molecules/chip-input/chip-input.tsx::ChipSuggestion"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Optional suggestions for autocomplete + chip label resolution."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "placeholder",
                "type": "string",
                "attribute": "placeholder",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Add\u2026'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Placeholder for the trailing text input."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "strict",
                "type": "boolean",
                "attribute": "strict",
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
                    "text": "Reject values that don't match a suggestion id."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "readonly",
                "type": "boolean",
                "attribute": "readonly",
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
                    "text": "Hide the trailing add-input (read-only mode)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "allowCreate",
                "type": "boolean",
                "attribute": "allow-create",
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
                    "text": "Show the inline \"\uFF0B Create \u00ABtext\u00BB\" row when the draft matches no suggestion.\nOff by default so existing {id,label} / free-text callers are unchanged."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "draft"
            }, {
                "name": "openSuggestions"
            }],
        "methods": [{
                "name": "focusInput",
                "docs": {
                    "text": "Imperatively focus the input.",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<any>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }],
        "listeners": [],
        "events": [{
                "name": "valueChanged",
                "method": "valueChanged",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string[]",
                    "resolved": "string[]",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "createChip",
                "method": "createChip",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the user picks the inline \"Create \u00ABtext\u00BB\" row (the typed text\nmatches no existing suggestion). The host persists a new chip/tag and adds\nits id to `value`. Only fires when `allowCreate` is true."
                },
                "complexType": {
                    "original": "{ label: string }",
                    "resolved": "{ label: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-CHIP-INPUT",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/chip-input/chip-input.css",
                        "relativePath": "chip-input.css",
                        "originalComponentPath": "chip-input.css"
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
        "hasMethod": true,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": true,
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
        "htmlAttrNames": ["key", "class", "style", "aria-hidden", "type", "aria-label", "onClick", "ref", "placeholder", "value", "onInput", "onFocus", "onBlur", "onKeyDown", "role", "onMouseDown"],
        "htmlTagNames": ["div", "span", "button", "input", "ul", "li"],
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
//# sourceMappingURL=chip-input.js.map