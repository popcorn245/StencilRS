import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const PopCommandPalette = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popQueryChange = __stencil_createEvent(this, "popQueryChange", 7);
        this.popSelect = __stencil_createEvent(this, "popSelect", 7);
        this.popAsk = __stencil_createEvent(this, "popAsk", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Overlay visibility. */
    open = false;
    /** Sections to render. Accepts an array (property) or JSON string (attr). */
    sections = [];
    /** Current query value (controlled by the host). */
    query = '';
    /** Placeholder for the input. */
    placeholder = 'Search or ask your brain…';
    /** Loading spinner in the input affordance. */
    loading = false;
    /** Empty-state copy shown when there's a query but no results. */
    emptyLabel = 'No matches';
    /** Index of the currently highlighted flat row. */
    active = 0;
    /** Fires on every input keystroke (host debounces + runs notesSearch). */
    popQueryChange;
    /** Fires when a row is activated (Enter / click). */
    popSelect;
    /** Fires on Tab from the input → host expands the Ask flow (Phase 6). */
    popAsk;
    /** Fires when the palette closes (Esc / backdrop / select). */
    popClose;
    /** Element focused before the palette opened — restored on close. */
    lastFocused = null;
    inputEl;
    parseSections() {
        if (typeof this.sections === 'string') {
            try {
                return JSON.parse(this.sections);
            }
            catch {
                return [];
            }
        }
        return this.sections ?? [];
    }
    /** Flattened, globally-indexed rows for roving selection. */
    get rows() {
        const out = [];
        let i = 0;
        for (const s of this.parseSections()) {
            for (const item of s.items ?? [])
                out.push({ item, index: i++ });
        }
        return out;
    }
    onOpenChange(next, prev) {
        if (next && !prev) {
            this.lastFocused = document.activeElement ?? null;
            this.active = 0;
            // Focus the input after the overlay mounts.
            requestAnimationFrame(() => this.inputEl?.focus());
        }
        else if (!next && prev) {
            // Restore focus to whatever opened us (the topbar pill, usually).
            this.lastFocused?.focus?.();
            this.lastFocused = null;
        }
    }
    onSectionsChange() {
        // Keep the active row in range as results change under the cursor.
        const max = Math.max(0, this.rows.length - 1);
        if (this.active > max)
            this.active = max;
    }
    close = () => {
        if (!this.open)
            return;
        this.open = false;
        this.popClose.emit();
    };
    activate(item) {
        this.popSelect.emit(item);
    }
    move(delta) {
        const n = this.rows.length;
        if (!n)
            return;
        this.active = (this.active + delta + n) % n;
        // Scroll the active row into view.
        requestAnimationFrame(() => {
            const node = this.el.querySelector(`[data-row="${this.active}"]`);
            node?.scrollIntoView({ block: 'nearest' });
        });
    }
    /** Global key handling while open (focus is trapped on the input). */
    onKeydown(ev) {
        if (!this.open)
            return;
        switch (ev.key) {
            case 'Escape':
                ev.preventDefault();
                this.close();
                break;
            case 'ArrowDown':
                ev.preventDefault();
                this.move(1);
                break;
            case 'ArrowUp':
                ev.preventDefault();
                this.move(-1);
                break;
            case 'Enter': {
                ev.preventDefault();
                const row = this.rows[this.active];
                if (row)
                    this.activate(row.item);
                break;
            }
            case 'Tab': {
                // Trap focus on the input; Tab triggers the Phase-6 Ask affordance.
                ev.preventDefault();
                if (this.query.trim())
                    this.popAsk.emit(this.query.trim());
                break;
            }
            default:
                break;
        }
    }
    onInput = (e) => {
        const v = e.target.value;
        this.query = v;
        this.active = 0;
        this.popQueryChange.emit(v);
    };
    renderInput() {
        return (h("div", { class: "cp-inputrow" },
            h("svg", { class: "cp-search-icon", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.2", "stroke-linecap": "round", "aria-hidden": "true" },
                h("circle", { cx: "11", cy: "11", r: "7" }),
                h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })),
            h("input", { ref: (el) => (this.inputEl = el), class: "cp-input", type: "text", role: "combobox", "aria-expanded": "true", "aria-controls": "cp-listbox", "aria-activedescendant": `cp-row-${this.active}`, "aria-autocomplete": "list", "aria-label": "Search or ask your brain", placeholder: this.placeholder, value: this.query, autocomplete: "off", spellcheck: false, onInput: this.onInput }),
            this.loading && h("span", { class: "cp-spinner", "aria-hidden": "true" })));
    }
    renderRows() {
        const sections = this.parseSections();
        const hasAny = sections.some((s) => (s.items ?? []).length > 0);
        if (!hasAny) {
            return (h("div", { class: "cp-empty", role: "status" },
                h("span", { class: "cp-empty-icon", "aria-hidden": "true" },
                    h("pop-brand-icon", { name: "search" })),
                h("span", { class: "cp-empty-text" }, this.query.trim() ? this.emptyLabel : 'Type to search your brain')));
        }
        // Single global counter so each row's index matches `this.rows`.
        let idx = 0;
        return (h("ul", { class: "cp-list", id: "cp-listbox", role: "listbox", "aria-label": "Results" }, sections.map((section) => (section.items ?? []).length === 0
            ? null
            : [
                h("li", { class: "cp-heading", role: "presentation" },
                    h("span", null, section.heading),
                    section.askHint && h("span", { class: "cp-heading-hint" }, "Tab to ask")),
                ...section.items.map((item) => {
                    const i = idx++;
                    const isActive = i === this.active;
                    return (h("li", { id: `cp-row-${i}`, "data-row": i, class: { 'cp-row': true, 'is-active': isActive }, role: "option", "aria-selected": isActive ? 'true' : 'false', onMouseEnter: () => (this.active = i), onClick: () => this.activate(item) },
                        h("span", { class: "cp-row-icon", "aria-hidden": "true" },
                            h("pop-brand-icon", { name: item.icon || 'dot-outline' })),
                        h("span", { class: "cp-row-body" },
                            h("span", { class: "cp-row-label" }, item.label || 'Untitled'),
                            item.detail && h("span", { class: "cp-row-detail" }, item.detail)),
                        isActive && h("kbd", { class: "cp-row-enter", "aria-hidden": "true" }, "\u21B5")));
                }),
            ])));
    }
    render() {
        if (!this.open)
            return h(Host, { "aria-hidden": "true" });
        return (h(Host, null,
            h("div", { class: "cp-backdrop", onClick: this.close }),
            h("div", { class: "cp-panel", role: "dialog", "aria-modal": "true", "aria-label": "Command palette", onClick: (e) => e.stopPropagation() },
                this.renderInput(),
                h("div", { class: "cp-results" }, this.renderRows()),
                h("div", { class: "cp-footer", "aria-hidden": "true" },
                    h("span", null,
                        h("kbd", null, "\u2191"),
                        h("kbd", null, "\u2193"),
                        " navigate"),
                    h("span", null,
                        h("kbd", null, "\u21B5"),
                        " open"),
                    h("span", null,
                        h("kbd", null, "tab"),
                        " ask"),
                    h("span", null,
                        h("kbd", null, "esc"),
                        " close")))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-command-palette",
        "componentClassName": "PopCommandPalette",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "open",
                "type": "boolean",
                "attribute": "open",
                "reflect": true,
                "mutable": true,
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
                    "text": "Overlay visibility."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sections",
                "type": "string",
                "attribute": "sections",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "PaletteSection[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "PaletteSection": {
                            "location": "local",
                            "path": "ui-kit/organisms/command-palette/command-palette.tsx",
                            "id": "ui-kit/organisms/command-palette/command-palette.tsx::PaletteSection"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Sections to render. Accepts an array (property) or JSON string (attr)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "query",
                "type": "string",
                "attribute": "query",
                "reflect": false,
                "mutable": true,
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
                    "text": "Current query value (controlled by the host)."
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
                "defaultValue": "'Search or ask your brain\u2026'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Placeholder for the input."
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
                    "text": "Loading spinner in the input affordance."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "emptyLabel",
                "type": "string",
                "attribute": "empty-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'No matches'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Empty-state copy shown when there's a query but no results."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "active"
            }],
        "methods": [],
        "listeners": [{
                "name": "keydown",
                "method": "onKeydown",
                "capture": false,
                "passive": false,
                "target": "window"
            }],
        "events": [{
                "name": "popQueryChange",
                "method": "popQueryChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires on every input keystroke (host debounces + runs notesSearch)."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popSelect",
                "method": "popSelect",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when a row is activated (Enter / click)."
                },
                "complexType": {
                    "original": "PaletteItem",
                    "resolved": "PaletteItem",
                    "references": {
                        "PaletteItem": {
                            "location": "local",
                            "path": "ui-kit/organisms/command-palette/command-palette.tsx",
                            "id": "ui-kit/organisms/command-palette/command-palette.tsx::PaletteItem"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAsk",
                "method": "popAsk",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires on Tab from the input \u2192 host expands the Ask flow (Phase 6)."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
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
                    "text": "Fires when the palette closes (Esc / backdrop / select)."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "open",
                "methodName": "onOpenChange",
                "handlerOptions": undefined
            }, {
                "propName": "sections",
                "methodName": "onSectionsChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-COMMAND-PALETTE",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/command-palette/command-palette.css",
                        "relativePath": "command-palette.css",
                        "originalComponentPath": "command-palette.css"
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
        "hasListener": true,
        "hasListenerTarget": true,
        "hasListenerTargetWindow": true,
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
        "hasPropMutable": true,
        "hasReflect": true,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": false,
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
        "htmlAttrNames": ["class", "width", "height", "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "aria-hidden", "cx", "cy", "r", "x1", "y1", "x2", "y2", "ref", "type", "role", "aria-expanded", "aria-controls", "aria-activedescendant", "aria-autocomplete", "aria-label", "placeholder", "value", "autocomplete", "spellcheck", "onInput", "name", "id", "data-row", "aria-selected", "onMouseEnter", "onClick", "aria-modal"],
        "htmlTagNames": ["div", "svg", "circle", "line", "input", "span", "pop-brand-icon", "ul", "li", "kbd"],
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
        "open": [{
                "onOpenChange": 0
            }],
        "sections": [{
                "onSectionsChange": 0
            }]
    }; }
};
//# sourceMappingURL=command-palette.js.map