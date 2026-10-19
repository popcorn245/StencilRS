import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopSplitPane = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.widthsChanged = __stencil_createEvent(this, "widthsChanged", 7);
        this.activeScreenChanged = __stencil_createEvent(this, "activeScreenChanged", 7);
        this.activeTabChanged = __stencil_createEvent(this, "activeTabChanged", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Layout mode. `'auto'` switches based on container width. */
    mode = 'auto';
    /** JSON-encoded breakpoints object, e.g. `'{"desktop":1200,"tablet":768}'`. */
    breakpoints = '{"desktop":1200,"tablet":768}';
    /** JSON-encoded default widths (percent per visible pane). */
    defaultWidths = '';
    /** localStorage key for persisting widths. Empty disables persistence. */
    persistKey = '';
    /** In two-column mode, render right pane as tabbed. */
    tabsRight = false;
    /** Stack mode: which screen is visible (`'list-screen'` | `'detail-screen'`). */
    activeScreen = 'list-screen';
    /** Tabs mode: which tab is visible (`'tab-details'` | `'tab-note'`). */
    activeTab = 'tab-details';
    /** Widths actually changed by the user dragging a divider. */
    widthsChanged;
    /** Stack mode: which screen is showing. */
    activeScreenChanged;
    /** Tabs mode: which tab is showing. */
    activeTabChanged;
    resolvedMode = 'three-column';
    widths = [];
    resizeObserver;
    dragState = null;
    componentWillLoad() {
        this.widths = this.computeInitialWidths();
        this.resolvedMode = this.resolveMode(this.currentWidth());
    }
    componentDidLoad() {
        // Watch container width for auto-mode switching
        if (this.mode === 'auto' && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(entries => {
                const w = entries[0]?.contentRect?.width ?? this.currentWidth();
                const next = this.resolveMode(w);
                if (next !== this.resolvedMode) {
                    this.resolvedMode = next;
                    // Re-seed widths when mode flips (different pane counts)
                    this.widths = this.computeInitialWidths();
                }
            });
            this.resizeObserver.observe(this.el);
        }
    }
    disconnectedCallback() {
        this.resizeObserver?.disconnect();
        this.detachDrag();
    }
    onModeChange() {
        this.resolvedMode = this.mode === 'auto' ? this.resolveMode(this.currentWidth()) : this.mode;
        this.widths = this.computeInitialWidths();
    }
    currentWidth() {
        return this.el?.getBoundingClientRect().width || (typeof window !== 'undefined' ? window.innerWidth : 1200);
    }
    parseBreakpoints() {
        try {
            const bp = JSON.parse(this.breakpoints);
            return { desktop: Number(bp.desktop) || 1200, tablet: Number(bp.tablet) || 768 };
        }
        catch {
            return { desktop: 1200, tablet: 768 };
        }
    }
    resolveMode(width) {
        if (this.mode !== 'auto')
            return this.mode;
        const bp = this.parseBreakpoints();
        if (width >= bp.desktop)
            return 'three-column';
        if (width >= bp.tablet)
            return 'two-column';
        return 'stack';
    }
    computeInitialWidths() {
        const mode = this.mode === 'auto' ? this.resolveMode(this.currentWidth()) : this.mode;
        // Try persisted first
        if (this.persistKey && typeof localStorage !== 'undefined') {
            try {
                const raw = localStorage.getItem(this.persistKey + ':' + mode);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) {
                        return parsed;
                    }
                }
            }
            catch { /* ignore */ }
        }
        // Try caller-supplied defaults
        if (this.defaultWidths) {
            try {
                const parsed = JSON.parse(this.defaultWidths);
                if (Array.isArray(parsed) && parsed.length > 0)
                    return parsed;
            }
            catch { /* ignore */ }
        }
        // Built-in defaults
        if (mode === 'three-column')
            return [35, 35, 30];
        if (mode === 'two-column')
            return [45, 55];
        return [];
    }
    persistWidths() {
        if (!this.persistKey || typeof localStorage === 'undefined')
            return;
        try {
            localStorage.setItem(this.persistKey + ':' + this.resolvedMode, JSON.stringify(this.widths));
        }
        catch { /* ignore quota */ }
    }
    onDragStart = (idx) => (e) => {
        e.preventDefault();
        this.dragState = { idx, startX: e.clientX, startWidths: [...this.widths] };
        document.addEventListener('mousemove', this.onDragMove);
        document.addEventListener('mouseup', this.onDragEnd);
    };
    onDragMove = (e) => {
        if (!this.dragState)
            return;
        const totalWidth = this.currentWidth();
        if (totalWidth <= 0)
            return;
        const deltaPct = ((e.clientX - this.dragState.startX) / totalWidth) * 100;
        const next = [...this.dragState.startWidths];
        const i = this.dragState.idx;
        // Move width between pane[i] and pane[i+1]
        const min = 10; // % floor per pane
        const proposedLeft = next[i] + deltaPct;
        const proposedRight = next[i + 1] - deltaPct;
        if (proposedLeft < min || proposedRight < min)
            return;
        next[i] = proposedLeft;
        next[i + 1] = proposedRight;
        this.widths = next;
    };
    onDragEnd = () => {
        this.detachDrag();
        this.persistWidths();
        this.widthsChanged.emit([...this.widths]);
    };
    detachDrag() {
        this.dragState = null;
        document.removeEventListener('mousemove', this.onDragMove);
        document.removeEventListener('mouseup', this.onDragEnd);
    }
    // Reserved for future external/manual screen switching.
    setActiveScreen = (name) => {
        if (this.activeScreen === name)
            return;
        this.activeScreen = name;
        this.activeScreenChanged.emit(name);
    };
    setActiveTab = (name) => {
        if (this.activeTab === name)
            return;
        this.activeTab = name;
        this.activeTabChanged.emit(name);
    };
    render() {
        if (this.resolvedMode === 'stack')
            return this.renderStack();
        if (this.resolvedMode === 'two-column')
            return this.renderTwoColumn();
        return this.renderThreeColumn();
    }
    renderThreeColumn() {
        const w = this.widths.length === 3 ? this.widths : [35, 35, 30];
        return (h("div", { class: "sp sp--three" },
            h("div", { class: "sp__pane", style: { flexBasis: w[0] + '%' } },
                h("slot", { name: "pane-1" })),
            h("div", { class: "sp__divider", role: "separator", "aria-orientation": "vertical", onMouseDown: this.onDragStart(0) }),
            h("div", { class: "sp__pane", style: { flexBasis: w[1] + '%' } },
                h("slot", { name: "pane-2" })),
            h("div", { class: "sp__divider", role: "separator", "aria-orientation": "vertical", onMouseDown: this.onDragStart(1) }),
            h("div", { class: "sp__pane", style: { flexBasis: w[2] + '%' } },
                h("slot", { name: "pane-3" }))));
    }
    renderTwoColumn() {
        const w = this.widths.length === 2 ? this.widths : [45, 55];
        return (h("div", { class: "sp sp--two" },
            h("div", { class: "sp__pane", style: { flexBasis: w[0] + '%' } },
                h("slot", { name: "pane-1" })),
            h("div", { class: "sp__divider", role: "separator", "aria-orientation": "vertical", onMouseDown: this.onDragStart(0) }),
            h("div", { class: "sp__pane", style: { flexBasis: w[1] + '%' } }, this.tabsRight ? this.renderTabbedRight() : h("slot", { name: "pane-2" }))));
    }
    renderTabbedRight() {
        const tabs = [
            { id: 'tab-details', label: 'Details' },
            { id: 'tab-note', label: 'Note' },
        ];
        return (h("div", { class: "sp__tabs" },
            h("div", { class: "sp__tabstrip", role: "tablist" }, tabs.map(t => (h("button", { type: "button", role: "tab", "aria-selected": this.activeTab === t.id ? 'true' : 'false', class: { 'sp__tab': true, 'sp__tab--active': this.activeTab === t.id }, onClick: () => this.setActiveTab(t.id) }, t.label)))),
            h("div", { class: "sp__tabpanels" },
                h("div", { class: { 'sp__tabpanel': true, 'sp__tabpanel--hidden': this.activeTab !== 'tab-details' }, role: "tabpanel" },
                    h("slot", { name: "tab-details" })),
                h("div", { class: { 'sp__tabpanel': true, 'sp__tabpanel--hidden': this.activeTab !== 'tab-note' }, role: "tabpanel" },
                    h("slot", { name: "tab-note" })))));
    }
    renderStack() {
        return (h("div", { class: "sp sp--stack" },
            h("div", { class: { 'sp__screen': true, 'sp__screen--hidden': this.activeScreen !== 'list-screen' } },
                h("slot", { name: "list-screen" })),
            h("div", { class: { 'sp__screen': true, 'sp__screen--hidden': this.activeScreen !== 'detail-screen' } },
                h("slot", { name: "detail-screen" }))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-split-pane",
        "componentClassName": "PopSplitPane",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "mode",
                "type": "string",
                "attribute": "mode",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'auto'",
                "complexType": {
                    "original": "SplitPaneMode",
                    "resolved": "\"auto\" | \"stack\" | \"three-column\" | \"two-column\"",
                    "references": {
                        "SplitPaneMode": {
                            "location": "local",
                            "path": "ui-kit/organisms/split-pane/split-pane.tsx",
                            "id": "ui-kit/organisms/split-pane/split-pane.tsx::SplitPaneMode"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Layout mode. `'auto'` switches based on container width."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "breakpoints",
                "type": "string",
                "attribute": "breakpoints",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'{\"desktop\":1200,\"tablet\":768}'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON-encoded breakpoints object, e.g. `'{\"desktop\":1200,\"tablet\":768}'`."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "defaultWidths",
                "type": "string",
                "attribute": "default-widths",
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
                    "text": "JSON-encoded default widths (percent per visible pane)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "persistKey",
                "type": "string",
                "attribute": "persist-key",
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
                    "text": "localStorage key for persisting widths. Empty disables persistence."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "tabsRight",
                "type": "boolean",
                "attribute": "tabs-right",
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
                    "text": "In two-column mode, render right pane as tabbed."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "activeScreen",
                "type": "string",
                "attribute": "active-screen",
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "'list-screen'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Stack mode: which screen is visible (`'list-screen'` | `'detail-screen'`)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "activeTab",
                "type": "string",
                "attribute": "active-tab",
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "'tab-details'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Tabs mode: which tab is visible (`'tab-details'` | `'tab-note'`)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "resolvedMode"
            }, {
                "name": "widths"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "widthsChanged",
                "method": "widthsChanged",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Widths actually changed by the user dragging a divider."
                },
                "complexType": {
                    "original": "number[]",
                    "resolved": "number[]",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "activeScreenChanged",
                "method": "activeScreenChanged",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Stack mode: which screen is showing."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "activeTabChanged",
                "method": "activeTabChanged",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Tabs mode: which tab is showing."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "mode",
                "methodName": "onModeChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-SPLIT-PANE",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/split-pane/split-pane.css",
                        "relativePath": "split-pane.css",
                        "originalComponentPath": "split-pane.css"
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
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": true,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
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
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "style", "name", "role", "aria-orientation", "onMouseDown", "type", "aria-selected", "onClick"],
        "htmlTagNames": ["div", "slot", "button"],
        "htmlParts": [],
        "htmlSlots": ["pane-1", "pane-2", "pane-3", "tab-details", "tab-note", "list-screen", "detail-screen"],
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
        "mode": [{
                "onModeChange": 0
            }]
    }; }
};
//# sourceMappingURL=split-pane.js.map