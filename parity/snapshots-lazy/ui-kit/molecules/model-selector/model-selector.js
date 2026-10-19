import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopModelSelectorStyle0 from "./ui-kit/molecules/model-selector/model-selector.css?tag=pop-model-selector&encapsulation=scoped";
const MODE_ICONS = {
    chat: '\u{1F4AC}',
    plan: '\u{1F4CB}',
    code: '\u2328\uFE0F',
};
const LS_MODEL = 'pop-tb-model';
const LS_MODE = 'pop-tb-mode';
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
export const PopModelSelector = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popModelChanged = __stencil_createEvent(this, "popModelChanged", 7);
        this.popModeChanged = __stencil_createEvent(this, "popModeChanged", 7);
    }
    /** JSON string of ModelGroup[] */
    models = '[]';
    /** Currently selected model value */
    selectedModel = '';
    /** Currently selected mode */
    selectedMode = 'chat';
    popModelChanged;
    popModeChanged;
    currentModel = '';
    currentMode = 'chat';
    parsedModels = [];
    showDropdown = false;
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
    }
    restoreFromStorage() {
        const storedModel = ls(LS_MODEL);
        const storedMode = ls(LS_MODE);
        this.currentModel = this.selectedModel || storedModel || this.firstModelValue() || '';
        this.currentMode = this.selectedMode || storedMode || 'chat';
    }
    firstModelValue() {
        return this.parsedModels[0]?.models[0]?.value ?? '';
    }
    get allModels() {
        return this.parsedModels.flatMap(g => g.models);
    }
    modelLabel(value) {
        const m = this.allModels.find(m => m.value === value);
        if (!m)
            return value;
        const label = m.label;
        const parts = label.split(/[\s\-]/);
        if (parts.length > 2)
            return parts.slice(-2).join(' ');
        return label;
    }
    selectModel(value) {
        this.currentModel = value;
        this.showDropdown = false;
        lsSet(LS_MODEL, value);
        this.popModelChanged.emit(value);
    }
    selectMode(mode) {
        this.currentMode = mode;
        this.showDropdown = false;
        lsSet(LS_MODE, mode);
        this.popModeChanged.emit(mode);
    }
    render() {
        const modeIcon = MODE_ICONS[this.currentMode] || '\u{1F4AC}';
        const modelShort = this.modelLabel(this.currentModel);
        return (h("div", { key: '0', class: "ms-root" },
            h("button", { key: '1', class: { 'ms-pill': true, 'ms-pill--open': this.showDropdown }, onClick: () => { this.showDropdown = !this.showDropdown; }, title: `Model: ${this.currentModel} \u00B7 Mode: ${this.currentMode}` },
                h("span", { key: '2', class: "ms-pill-mode-icon" }, modeIcon),
                modelShort && h("span", { key: '3', class: "ms-pill-model" }, modelShort),
                h("svg", { key: '4', class: "ms-chevron", width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round" },
                    h("polyline", { key: '5', points: "6 9 12 15 18 9" }))),
            this.showDropdown && (h("div", { key: '6', class: "ms-dropdown-panel" },
                this.parsedModels.length > 0 && (h("div", { key: '7', class: "ms-section" },
                    h("div", { key: '8', class: "ms-section-label" }, "Model"),
                    this.parsedModels.map(group => (h("div", { key: group.group },
                        group.group && h("div", { class: "ms-group-label" }, group.group),
                        group.models.map(m => (h("button", { key: m.value, class: { 'ms-option': true, 'ms-option--active': this.currentModel === m.value }, onClick: () => this.selectModel(m.value) },
                            m.icon && h("span", { class: "ms-option-icon" }, m.icon),
                            h("span", { class: "ms-option-label" }, m.label),
                            this.currentModel === m.value && h("span", { class: "ms-checkmark" }, '\u2713'))))))))),
                h("div", { key: '9', class: "ms-section" },
                    h("div", { key: 'a', class: "ms-section-label" }, "Mode"),
                    ['chat', 'plan', 'code'].map(mode => (h("button", { key: mode, class: { 'ms-option': true, 'ms-option--active': this.currentMode === mode }, onClick: () => this.selectMode(mode) },
                        h("span", { class: "ms-option-icon" }, MODE_ICONS[mode]),
                        h("span", { class: "ms-option-label", style: { textTransform: 'capitalize' } }, mode),
                        this.currentMode === mode && h("span", { class: "ms-checkmark" }, '\u2713')))))))));
    }
    static get watchers() { return {
        "models": [{
                "parseProps": 0
            }],
        "selectedModel": [{
                "parseProps": 0
            }],
        "selectedMode": [{
                "parseProps": 0
            }]
    }; }
};
PopModelSelector.style = PopModelSelectorStyle0();
//# sourceMappingURL=model-selector.js.map