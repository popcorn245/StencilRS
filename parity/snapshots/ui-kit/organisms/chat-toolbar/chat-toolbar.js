import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopChatToolbarStyle0 from "./ui-kit/organisms/chat-toolbar/chat-toolbar.css?tag=pop-chat-toolbar&encapsulation=scoped";
const LS_MODEL = 'pop-tb-model';
const LS_MODE = 'pop-tb-mode';
const LS_TOOLS = 'pop-tb-tools';
function ls(key) {
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
function lsSet(key, val) {
    try {
        localStorage.setItem(key, val);
    }
    catch { /* ignore */ }
}
const PopChatToolbar = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popModelChanged = __stencil_createEvent(this, "popModelChanged", 7);
        this.popModeChanged = __stencil_createEvent(this, "popModeChanged", 7);
        this.popToolToggled = __stencil_createEvent(this, "popToolToggled", 7);
        this.micPressed = __stencil_createEvent(this, "micPressed", 7);
        this.micReleased = __stencil_createEvent(this, "micReleased", 7);
    }
    /** JSON string of ModelGroup[] */
    models = '[]';
    /** Initial/controlled model value */
    selectedModel = '';
    /** Initial/controlled mode */
    selectedMode = 'chat';
    /** JSON string of ToolDefinition[] (extra tools merged with built-ins) */
    tools = '[]';
    /** JSON string of string[] — initially active tool IDs */
    activeTools = '[]';
    /** Show mic button in toolbar */
    showMicButton = false;
    popModelChanged;
    popModeChanged;
    popToolToggled;
    micPressed;
    micReleased;
    currentModel = '';
    currentMode = 'chat';
    activeToolIds = [];
    parsedModels = [];
    parsedTools = [];
    showToolsPopover = false;
    componentWillLoad() {
        this.parseProps();
        this.restoreFromStorage();
    }
    parseProps() {
        try {
            this.parsedModels = JSON.parse(this.models);
        }
        catch {
            this.parsedModels = [];
        }
        try {
            this.parsedTools = JSON.parse(this.tools);
        }
        catch {
            this.parsedTools = [];
        }
    }
    restoreFromStorage() {
        // Controlled props take priority; fall back to localStorage; fall back to defaults
        const storedModel = ls(LS_MODEL);
        const storedMode = ls(LS_MODE);
        const storedTools = ls(LS_TOOLS);
        this.currentModel = this.selectedModel || storedModel || this.firstModelValue() || '';
        this.currentMode = this.selectedMode || storedMode || 'chat';
        if (this.activeTools !== '[]') {
            try {
                this.activeToolIds = JSON.parse(this.activeTools);
            }
            catch {
                this.activeToolIds = [];
            }
        }
        else if (storedTools) {
            try {
                this.activeToolIds = JSON.parse(storedTools);
            }
            catch {
                this.activeToolIds = [];
            }
        }
        else {
            this.activeToolIds = [];
        }
    }
    firstModelValue() {
        return this.parsedModels[0]?.models[0]?.value ?? '';
    }
    toggleTool(id) {
        const enabled = !this.activeToolIds.includes(id);
        const next = enabled
            ? [...this.activeToolIds, id]
            : this.activeToolIds.filter(t => t !== id);
        this.activeToolIds = next;
        lsSet(LS_TOOLS, JSON.stringify(next));
        this.popToolToggled.emit({ id, enabled });
    }
    renderToolsPopover() {
        return (h("div", { class: "ct-dropdown-panel ct-tools-panel" },
            h("div", { class: "ct-section-label" }, "Tools"),
            this.parsedTools.map(tool => {
                const on = this.activeToolIds.includes(tool.id);
                return (h("button", { key: tool.id, class: { 'ct-tool-item': true, 'ct-tool-item--on': on }, onClick: () => this.toggleTool(tool.id) },
                    h("span", { class: "ct-tool-icon" }, tool.icon),
                    h("span", { class: "ct-tool-label" }, tool.label),
                    h("span", { class: { 'ct-toggle': true, 'ct-toggle--on': on } }, on ? 'On' : 'Off')));
            }),
            this.parsedTools.length === 0 && (h("div", { class: "ct-empty" }, "No tools configured")),
            h("slot", { name: "tool" })));
    }
    render() {
        const hasActiveTools = this.activeToolIds.length > 0;
        // Active tool icons to display in toolbar
        const activeToolDefs = this.parsedTools.filter(t => this.activeToolIds.includes(t.id));
        return (h("div", { key: '0', class: "ct-root" },
            h("pop-model-selector", { key: '1', models: this.models, selectedModel: this.currentModel, selectedMode: this.currentMode, onPopModelChanged: (e) => {
                    this.currentModel = e.detail;
                    this.popModelChanged.emit(e.detail);
                }, onPopModeChanged: (e) => {
                    this.currentMode = e.detail;
                    this.popModeChanged.emit(e.detail);
                } }),
            h("div", { key: '2', class: "ct-tools-wrap" },
                h("button", { key: '3', class: { 'ct-tools-btn': true, 'ct-tools-btn--open': this.showToolsPopover }, onClick: () => {
                        this.showToolsPopover = !this.showToolsPopover;
                    }, title: "Tools" },
                    hasActiveTools ? (activeToolDefs.map(t => (h("span", { key: t.id, class: "ct-active-tool-icon", title: t.label }, t.icon)))) : (h("span", { class: "ct-tools-label" }, "Tools")),
                    h("svg", { key: '4', class: "ct-chevron", width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round" },
                        h("polyline", { key: '5', points: "6 9 12 15 18 9" }))),
                this.showToolsPopover && this.renderToolsPopover()),
            this.showMicButton && (h("button", { key: '6', class: "ct-mic-btn", title: "Voice input", onMouseDown: () => this.micPressed.emit(), onMouseUp: () => this.micReleased.emit(), onTouchStart: () => this.micPressed.emit(), onTouchEnd: () => this.micReleased.emit() },
                h("svg", { key: '7', width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" },
                    h("path", { key: '8', d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" }),
                    h("path", { key: '9', d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
                    h("line", { key: 'a', x1: "12", y1: "19", x2: "12", y2: "23" }),
                    h("line", { key: 'b', x1: "8", y1: "23", x2: "16", y2: "23" })))),
            h("slot", { key: 'c', name: "toolbar-end" })));
    }
    static get watchers() { return {
        "models": [{
                "parseProps": 0
            }],
        "tools": [{
                "parseProps": 0
            }],
        "selectedModel": [{
                "parseProps": 0
            }],
        "selectedMode": [{
                "parseProps": 0
            }],
        "activeTools": [{
                "parseProps": 0
            }]
    }; }
    static get style() { return PopChatToolbarStyle0(); }
};
__stencil_defineCustomElement(PopChatToolbar, [774, "pop-chat-toolbar", {
        "models": [1],
        "selectedModel": [1, "selected-model"],
        "selectedMode": [1, "selected-mode"],
        "tools": [1],
        "activeTools": [1, "active-tools"],
        "showMicButton": [4, "show-mic-button"],
        "currentModel": [32],
        "currentMode": [32],
        "activeToolIds": [32],
        "parsedModels": [32],
        "parsedTools": [32],
        "showToolsPopover": [32]
    }, undefined, {
        "models": [{
                "parseProps": 0
            }],
        "tools": [{
                "parseProps": 0
            }],
        "selectedModel": [{
                "parseProps": 0
            }],
        "selectedMode": [{
                "parseProps": 0
            }],
        "activeTools": [{
                "parseProps": 0
            }]
    }]);
//# sourceMappingURL=chat-toolbar.js.map