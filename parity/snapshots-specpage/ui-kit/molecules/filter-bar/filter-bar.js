import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopFilterBar = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popFilterChange = __stencil_createEvent(this, "popFilterChange", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** JSON array of FilterDef objects */
    filters = '[]';
    /** URL to the filter icon SVG. Defaults to the app's funnel-outline icon. */
    iconSrc = '/images/icon/funnel-outline.svg';
    /** Raw SVG string for the filter icon. If provided, overrides iconSrc. */
    iconSvg = '';
    /** Emitted when a filter value changes. Detail: `{ id: string, value: string }` */
    popFilterChange;
    isOpen = false;
    _filters = [];
    filtersChanged(newVal) {
        try {
            this._filters = JSON.parse(newVal);
        }
        catch {
            this._filters = [];
        }
    }
    componentWillLoad() {
        this.filtersChanged(this.filters);
    }
    componentDidLoad() {
        document.addEventListener('click', this.onDocClick);
    }
    disconnectedCallback() {
        document.removeEventListener('click', this.onDocClick);
    }
    onDocClick = (e) => {
        if (this.isOpen && !this.el.contains(e.target)) {
            this.isOpen = false;
        }
    };
    toggle = (e) => {
        e.stopPropagation();
        this.isOpen = !this.isOpen;
    };
    change(id, value) {
        this._filters = this._filters.map(f => f.id === id ? { ...f, value } : f);
        this.popFilterChange.emit({ id, value });
    }
    dismiss(id) {
        const filter = this._filters.find(f => f.id === id);
        if (!filter)
            return;
        this.change(id, filter.defaultValue ?? '');
    }
    get activeChips() {
        return this._filters.filter(f => {
            const def = f.defaultValue ?? '';
            return f.value !== '' && f.value !== def;
        });
    }
    get activeCount() {
        return this.activeChips.length;
    }
    render() {
        const chips = this.activeChips;
        return (h("div", { key: '0', class: "pfb-root" },
            h("div", { key: '1', class: "pfb-trigger-wrap" },
                h("button", { key: '2', class: `pfb-trigger${this.activeCount > 0 ? ' has-active' : ''}${this.isOpen ? ' is-open' : ''}`, type: "button", "aria-expanded": this.isOpen ? 'true' : 'false', "aria-haspopup": "dialog", onClick: this.toggle },
                    this.iconSvg ? (h("div", { class: "pfb-icon-svg", innerHTML: this.iconSvg })) : this.iconSrc ? (h("img", { class: "pfb-icon", src: this.iconSrc, width: "14", height: "14", "aria-hidden": "true", alt: "" })) : (h("svg", { class: "pfb-icon", width: "14", height: "14", viewBox: "0 0 512 512", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "32", "aria-hidden": "true" },
                        h("path", { d: "M32 144h448M112 256h288M208 368h96" }))),
                    "Filters",
                    this.activeCount > 0 && h("span", { key: '3', class: "pfb-badge" }, this.activeCount)),
                this.isOpen && (h("div", { key: '4', class: "pfb-popover", role: "dialog", "aria-label": "Filter options" },
                    this._filters.map(filter => (h("div", { key: filter.id, class: "pfb-group" },
                        h("label", { class: "pfb-group-label" }, filter.label),
                        h("div", { class: "pfb-options" }, filter.options.map(opt => (h("button", { key: opt.value, type: "button", class: `pfb-option${opt.value === filter.value ? ' selected' : ''}`, onClick: () => this.change(filter.id, opt.value) }, opt.label))))))),
                    h("button", { key: '5', class: "pfb-done", type: "button", onClick: () => { this.isOpen = false; } }, "Done")))),
            chips.length > 0 && (h("div", { key: '6', class: "pfb-chips" }, chips.map(chip => (h("span", { key: chip.id, class: "pfb-chip" },
                h("span", { class: "pfb-chip-label" }, chip.options.find(o => o.value === chip.value)?.label ?? chip.value),
                h("button", { class: "pfb-chip-dismiss", type: "button", "aria-label": `Remove ${chip.label} filter`, onClick: () => this.dismiss(chip.id) }, "\u00D7"))))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-filter-bar",
        "componentClassName": "PopFilterBar",
        "elementRef": "el",
        "encapsulation": "none",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "filters",
                "type": "string",
                "attribute": "filters",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON array of FilterDef objects"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "iconSrc",
                "type": "string",
                "attribute": "icon-src",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'/images/icon/funnel-outline.svg'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "URL to the filter icon SVG. Defaults to the app's funnel-outline icon."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "iconSvg",
                "type": "string",
                "attribute": "icon-svg",
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
                    "text": "Raw SVG string for the filter icon. If provided, overrides iconSrc."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "isOpen"
            }, {
                "name": "_filters"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popFilterChange",
                "method": "popFilterChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when a filter value changes. Detail: `{ id: string, value: string }`"
                },
                "complexType": {
                    "original": "{ id: string; value: string }",
                    "resolved": "{ id: string; value: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "filters",
                "methodName": "filtersChanged",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-FILTER-BAR",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/filter-bar/filter-bar.css",
                        "relativePath": "filter-bar.css",
                        "originalComponentPath": "filter-bar.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": true,
        "hasComponentDidLoadFn": true,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
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
        "hasPropNumber": false,
        "hasPropBoolean": false,
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
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "type", "aria-expanded", "aria-haspopup", "onClick", "innerHTML", "src", "width", "height", "aria-hidden", "alt", "viewBox", "fill", "stroke", "stroke-linecap", "stroke-linejoin", "stroke-width", "d", "role", "aria-label"],
        "htmlTagNames": ["div", "button", "img", "svg", "path", "span", "label"],
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
        "filters": [{
                "filtersChanged": 0
            }]
    }; }
};
//# sourceMappingURL=filter-bar.js.map