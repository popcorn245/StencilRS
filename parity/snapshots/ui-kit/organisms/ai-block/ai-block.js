import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopAiBlockStyle0 from "./ui-kit/organisms/ai-block/ai-block.css?tag=pop-ai-block&encapsulation=scoped";
const PopAiBlock = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.aiGenerate = __stencil_createEvent(this, "aiGenerate", 7);
        this.aiCancel = __stencil_createEvent(this, "aiCancel", 7);
        this.aiModelChange = __stencil_createEvent(this, "aiModelChange", 7);
        this.aiChange = __stencil_createEvent(this, "aiChange", 7);
    }
    /** User's prompt text */
    prompt = '';
    /** Generated response text */
    response = '';
    /** Selected model identifier */
    model = 'gemma4:e4b';
    /** Generation status: idle, generating, done, error */
    status = 'idle';
    /** Whether Ollama is reachable */
    ollamaAvailable = false;
    /** User clicked Generate */
    aiGenerate;
    /** User cancelled generation */
    aiCancel;
    /** Model selection changed */
    aiModelChange;
    /** Any data change */
    aiChange;
    showPrompt = true;
    statusText = '';
    promptRef = null;
    componentWillLoad() {
        this.showPrompt = !this.response;
    }
    get availableModels() {
        const models = [];
        if (this.ollamaAvailable) {
            models.push({ label: 'Gemma 4', value: 'gemma4:e4b' });
        }
        models.push({ label: 'Claude', value: 'claude-sonnet-4-20250514' });
        return models;
    }
    handleGenerate = () => {
        const prompt = this.promptRef?.value?.trim() || this.prompt;
        if (!prompt)
            return;
        this.prompt = prompt;
        this.status = 'generating';
        this.showPrompt = false;
        this.aiGenerate.emit({ prompt, model: this.model });
        this.emitChange();
    };
    handleEditPrompt = () => {
        this.showPrompt = true;
    };
    handleRefresh = () => {
        this.response = '';
        this.status = 'generating';
        this.aiGenerate.emit({ prompt: this.prompt, model: this.model });
        this.emitChange();
    };
    handleModelChange = (e) => {
        this.model = e.target.value;
        this.aiModelChange.emit({ model: this.model });
        this.emitChange();
    };
    emitChange() {
        this.aiChange.emit({
            prompt: this.prompt,
            response: this.response,
            model: this.model,
            status: this.status,
        });
    }
    render() {
        return (h("div", { key: '0', class: "aib-wrap" },
            h("div", { key: '1', class: "aib-header" },
                h("span", { key: '2', class: "aib-label" }, "AI"),
                h("select", { key: '3', class: "aib-model-select", onChange: this.handleModelChange }, this.availableModels.map(m => (h("option", { value: m.value, selected: this.model === m.value }, m.label))))),
            this.showPrompt && (h("div", { key: '4', class: "aib-prompt-area" },
                h("textarea", { key: '5', class: "aib-prompt-input", placeholder: "Ask AI...", value: this.prompt, rows: 2, ref: el => this.promptRef = el, onKeyDown: (e) => e.stopPropagation() }),
                h("button", { key: '6', type: "button", class: "aib-generate-btn", onClick: this.handleGenerate, disabled: this.status === 'generating' }, this.status === 'generating' ? 'Generating...' : 'Generate'))),
            this.statusText && (h("div", { key: '7', class: "aib-status" }, this.statusText)),
            this.response && (h("div", { key: '8', class: "aib-content" }, this.response)),
            this.status === 'error' && (h("div", { key: '9', class: "aib-error" }, "Generation failed. Please try again.")),
            this.response && !this.showPrompt && (h("div", { key: 'a', class: "aib-actions" },
                h("button", { key: 'b', type: "button", class: "aib-action-btn aib-action-btn--primary", onClick: this.handleRefresh }, "Refresh"),
                h("button", { key: 'c', type: "button", class: "aib-action-btn", onClick: this.handleEditPrompt }, "Edit prompt")))));
    }
    static get style() { return PopAiBlockStyle0(); }
};
__stencil_defineCustomElement(PopAiBlock, [514, "pop-ai-block", {
        "prompt": [1025],
        "response": [1025],
        "model": [1025],
        "status": [1025],
        "ollamaAvailable": [4, "ollama-available"],
        "showPrompt": [32],
        "statusText": [32]
    }]);
//# sourceMappingURL=ai-block.js.map