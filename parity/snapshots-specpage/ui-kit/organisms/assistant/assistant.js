import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopAssistant = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popAssistantVerbChange = __stencil_createEvent(this, "popAssistantVerbChange", 7);
        this.popAssistantModelChange = __stencil_createEvent(this, "popAssistantModelChange", 7);
        this.popAssistantSend = __stencil_createEvent(this, "popAssistantSend", 7);
        this.popAssistantBuild = __stencil_createEvent(this, "popAssistantBuild", 7);
        this.popAssistantSuggestLinks = __stencil_createEvent(this, "popAssistantSuggestLinks", 7);
        this.popAssistantCitationClick = __stencil_createEvent(this, "popAssistantCitationClick", 7);
        this.popAssistantApproveBuild = __stencil_createEvent(this, "popAssistantApproveBuild", 7);
        this.popAssistantRejectBuild = __stencil_createEvent(this, "popAssistantRejectBuild", 7);
        this.popAssistantApproveLinks = __stencil_createEvent(this, "popAssistantApproveLinks", 7);
        this.popAssistantRejectLinks = __stencil_createEvent(this, "popAssistantRejectLinks", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Active verb (Ask default). Controlled by the host or the internal tabs. */
    verb = 'ask';
    /** The single model control's value: Gemma (default) ↔ Claude (toggle). */
    model = 'gemma';
    /** Pre-loaded Ask conversation (JSON AiMessage[]) restored from the thread. */
    messages = '[]';
    /** True when the Assistant is grounded in an open note (shows the context row). */
    noteGrounded = false;
    /** Label of the grounding note (for the context row). */
    noteTitle = '';
    /** Compact mode = the desktop dock; full = a page/sheet surface. */
    layout = 'dock';
    /** A pending Build proposal (JSON AssistantBlock[]) — renders the block diff. */
    buildProposal = '';
    /** The Build sub-action label shown on the proposal ("Structure"/"Rewrite"…). */
    buildAction = 'structure';
    /** A pending Link proposal (JSON AssistantLink[]) — renders the link chips. */
    linkProposal = '';
    /** Show the busy state while the host fetches a Build/Link proposal. */
    proposing = false;
    /** An honest error to surface (e.g. endpoint unreachable). */
    errorMessage = '';
    // ── proposal selection state ──
    acceptedBlocks = {};
    acceptedLinks = {};
    popAssistantVerbChange;
    popAssistantModelChange;
    /** Ask: a question was submitted (host drives the streamed answer). */
    popAssistantSend;
    /** Build: run a sub-action against the current text/selection. */
    popAssistantBuild;
    /** Link: on-demand "Suggest links" was invoked. */
    popAssistantSuggestLinks;
    /** A citation chip was clicked → host navigates to the ref. */
    popAssistantCitationClick;
    /** Approve a Build proposal → host writes the accepted blocks. */
    popAssistantApproveBuild;
    /** Reject a Build proposal → discard (nothing written). */
    popAssistantRejectBuild;
    /** Approve a Link proposal → host appends the accepted links. */
    popAssistantApproveLinks;
    /** Reject a Link proposal → discard. */
    popAssistantRejectLinks;
    chatEl;
    // ── imperative streaming (proxied to the inner pop-ai-chat) ────────────────
    /** Host: begin an Ask assistant turn (typing bubble). */
    async beginAssistant() {
        await this.chatEl?.beginAssistant();
    }
    /** Host: append a token to the streaming answer. */
    async appendAssistantToken(token) {
        await this.chatEl?.appendAssistantToken(token);
    }
    /** Host: finalize the answer with optional citations. */
    async endAssistant(content, citations) {
        await this.chatEl?.endAssistant(content, citations);
    }
    /** Host: seed the Ask input (e.g. from Cmd-K / a selection). */
    async setAskInput(text) {
        this.verb = 'ask';
        await this.chatEl?.setInputValue(text);
    }
    resetBuildSelection() {
        // New proposal → accept everything by default (user can toggle off).
        const blocks = this.parseBlocks();
        const next = {};
        blocks.forEach((_, i) => (next[i] = true));
        this.acceptedBlocks = next;
    }
    resetLinkSelection() {
        const links = this.parseLinks();
        const next = {};
        links.forEach((l) => (next[l.noteId] = true));
        this.acceptedLinks = next;
    }
    componentWillLoad() {
        this.resetBuildSelection();
        this.resetLinkSelection();
    }
    parseBlocks() {
        try {
            const p = JSON.parse(this.buildProposal || '[]');
            return Array.isArray(p) ? p : [];
        }
        catch {
            return [];
        }
    }
    parseLinks() {
        try {
            const p = JSON.parse(this.linkProposal || '[]');
            return Array.isArray(p) ? p : [];
        }
        catch {
            return [];
        }
    }
    setVerb(v) {
        if (this.verb === v)
            return;
        this.verb = v;
        this.popAssistantVerbChange.emit(v);
    }
    setModel(m) {
        if (this.model === m)
            return;
        this.model = m;
        this.popAssistantModelChange.emit(m);
    }
    // ── render: header (verb tabs + the ONE model control) ─────────────────────
    renderHeader() {
        const verbs = [
            { id: 'ask', label: 'Ask', icon: 'sparkles' },
            { id: 'build', label: 'Build', icon: 'notebook' },
            { id: 'link', label: 'Link', icon: 'link' },
        ];
        return (h("header", { class: "asst-head" },
            h("div", { class: "asst-verbs", role: "tablist", "aria-label": "Assistant mode" }, verbs.map((v) => (h("button", { type: "button", role: "tab", "aria-selected": this.verb === v.id ? 'true' : 'false', class: { 'asst-verb': true, 'is-active': this.verb === v.id }, onClick: () => this.setVerb(v.id) },
                h("pop-brand-icon", { name: v.icon }),
                " ",
                h("span", null, v.label))))),
            h("div", { class: "asst-model", role: "radiogroup", "aria-label": "Answer model" }, ['gemma', 'claude'].map((m) => (h("button", { type: "button", role: "radio", "aria-checked": this.model === m ? 'true' : 'false', class: { 'asst-model-opt': true, 'is-active': this.model === m }, onClick: () => this.setModel(m) }, m === 'gemma' ? 'Gemma' : 'Claude'))))));
    }
    renderContext() {
        if (!this.noteGrounded)
            return null;
        return (h("div", { class: "asst-context", "aria-label": "Grounded in the open note" },
            h("pop-brand-icon", { name: "sparkles" }),
            h("span", null,
                "Grounded in ",
                this.noteTitle ? `“${this.noteTitle}”` : 'this note')));
    }
    renderError() {
        if (!this.errorMessage)
            return null;
        return (h("div", { class: "asst-error", role: "alert" },
            h("pop-brand-icon", { name: "warning" }),
            " ",
            h("span", null, this.errorMessage)));
    }
    // ── render: Ask (the pop-ai-chat conversation) ─────────────────────────────
    renderAsk() {
        return (h("pop-ai-chat", { class: "asst-chat", ref: (el) => (this.chatEl = el), "external-driver": true, "ai-name": "Brain", layout: "bubble", placeholder: "Ask about your notes\u2026", messages: this.messages, "selected-model": this.model, onPopMessageSent: (e) => this.popAssistantSend.emit({ text: e.detail.text, model: this.model }), onPopCitationClick: (e) => this.popAssistantCitationClick.emit(e.detail) }));
    }
    // ── render: Build (sub-actions + block-diff proposal) ──────────────────────
    renderBuild() {
        const blocks = this.parseBlocks();
        const hasProposal = blocks.length > 0;
        const actions = [
            { id: 'structure', label: 'Structure' },
            { id: 'expand', label: 'Expand' },
            { id: 'summarize', label: 'Summarize' },
            { id: 'rewrite', label: 'Rewrite' },
        ];
        return (h("div", { class: "asst-build" },
            h("div", { class: "asst-actions", role: "group", "aria-label": "Build actions" }, actions.map((a) => (h("button", { type: "button", class: "asst-action", disabled: this.proposing, onClick: () => this.popAssistantBuild.emit({ action: a.id, model: this.model }) }, a.label)))),
            this.proposing && (h("pop-loading-state", { variant: "spinner", "show-label": "true", label: "Building a proposal\u2026" })),
            !this.proposing && !hasProposal && (h("pop-empty-state", { iconName: "notebook", heading: "Build structured blocks", message: "Turn a raw capture into headers, lists, tables, code, checklists and columns \u2014 or rewrite a selection. You approve before anything is written.", size: "full" })),
            !this.proposing && hasProposal && this.renderBuildProposal(blocks)));
    }
    renderBuildProposal(blocks) {
        const acceptedCount = blocks.filter((_, i) => this.acceptedBlocks[i]).length;
        return (h("div", { class: "asst-proposal", "aria-label": "Proposed blocks" },
            h("div", { class: "asst-proposal-head" },
                h("span", { class: "asst-proposal-title" },
                    "Proposed ",
                    blocks.length,
                    " block",
                    blocks.length === 1 ? '' : 's',
                    " \u00B7 ",
                    this.buildAction),
                h("span", { class: "asst-proposal-note" }, "Nothing is written until you Approve")),
            h("ul", { class: "asst-diff" }, blocks.map((b, i) => (h("li", { class: { 'asst-diff-block': true, 'is-off': !this.acceptedBlocks[i] } },
                h("label", { class: "asst-diff-toggle" },
                    h("input", { type: "checkbox", checked: !!this.acceptedBlocks[i], onChange: (e) => (this.acceptedBlocks = {
                            ...this.acceptedBlocks,
                            [i]: e.target.checked,
                        }), "aria-label": `Include block ${i + 1}` })),
                h("div", { class: "asst-diff-body" },
                    h("span", { class: "asst-diff-kind" },
                        b.change === 'rewrite' ? 'rewrite' : 'add',
                        " \u00B7 ",
                        b.type),
                    this.renderBlockPreview(b)))))),
            h("div", { class: "asst-approve-row" },
                h("button", { type: "button", class: "asst-approve", disabled: acceptedCount === 0, onClick: () => this.popAssistantApproveBuild.emit({
                        blocks: blocks.filter((_, i) => this.acceptedBlocks[i]),
                    }) },
                    h("pop-brand-icon", { name: "check" }),
                    " Approve (",
                    acceptedCount,
                    ")"),
                h("button", { type: "button", class: "asst-reject", onClick: () => this.popAssistantRejectBuild.emit() },
                    h("pop-brand-icon", { name: "close" }),
                    " Reject"))));
    }
    /** Render a small, faithful preview of each palette block type. */
    renderBlockPreview(b) {
        const d = (b.data ?? {});
        switch (b.type) {
            case 'header':
                return h("div", { class: `asst-bp asst-bp-h${d.level ?? 2}`, innerHTML: sanitize(d.text) });
            case 'paragraph':
                return h("p", { class: "asst-bp", innerHTML: sanitize(d.text) });
            case 'list':
            case 'checklist': {
                const items = Array.isArray(d.items) ? d.items : [];
                const ordered = d.style === 'ordered';
                return (h("ul", { class: { 'asst-bp': true, 'asst-bp-list': true, 'is-check': b.type === 'checklist' } }, items.map((it) => {
                    const text = typeof it === 'string' ? it : it?.content ?? it?.text ?? '';
                    const checked = typeof it === 'object' && (it?.meta?.checked || it?.checked);
                    return (h("li", null,
                        b.type === 'checklist' && (h("span", { class: { 'asst-check': true, 'is-on': !!checked }, "aria-hidden": "true" })),
                        ordered && b.type === 'list' ? '• ' : '',
                        h("span", { innerHTML: sanitize(text) })));
                })));
            }
            case 'table': {
                const rows = Array.isArray(d.content) ? d.content : [];
                return (h("table", { class: "asst-bp asst-bp-table" },
                    h("tbody", null, rows.slice(0, 4).map((row) => (h("tr", null, (row || []).slice(0, 4).map((cell) => h("td", { innerHTML: sanitize(cell) }))))))));
            }
            case 'code':
                return (h("pre", { class: "asst-bp asst-bp-code" },
                    h("code", null, String(d.code ?? ''))));
            case 'columns': {
                const cols = Array.isArray(d.columns) ? d.columns : [];
                return (h("div", { class: "asst-bp asst-bp-cols" }, cols.map((c) => (h("div", { class: "asst-bp-col" }, (c?.blocks ?? []).map((cb) => (h("div", { innerHTML: sanitize(cb?.data?.text ?? '') }))))))));
            }
            default:
                return h("p", { class: "asst-bp asst-bp-muted" }, b.type);
        }
    }
    // ── render: Link (on-demand Suggest links + approvable chips) ──────────────
    renderLink() {
        const links = this.parseLinks();
        const hasProposal = links.length > 0;
        return (h("div", { class: "asst-link" },
            h("button", { type: "button", class: "asst-suggest", disabled: this.proposing, onClick: () => this.popAssistantSuggestLinks.emit({ model: this.model }) },
                h("pop-brand-icon", { name: "link" }),
                " Suggest links"),
            this.proposing && (h("pop-loading-state", { variant: "spinner", "show-label": "true", label: "Finding related notes\u2026" })),
            !this.proposing && !hasProposal && (h("pop-empty-state", { iconName: "link", heading: "Related notes, on demand", message: "Ask for NotebookLM-style connections. Suggestions never appear on their own \u2014 and you approve each link before it's added.", size: "full" })),
            !this.proposing && hasProposal && this.renderLinkProposal(links)));
    }
    renderLinkProposal(links) {
        const acceptedIds = links.filter((l) => this.acceptedLinks[l.noteId]).map((l) => l.noteId);
        return (h("div", { class: "asst-proposal", "aria-label": "Suggested links" },
            h("div", { class: "asst-proposal-head" },
                h("span", { class: "asst-proposal-title" },
                    links.length,
                    " suggested link",
                    links.length === 1 ? '' : 's'),
                h("span", { class: "asst-proposal-note" }, "Approve to insert [[links]]")),
            h("ul", { class: "asst-linklist" }, links.map((l) => (h("li", { class: { 'asst-linkrow': true, 'is-off': !this.acceptedLinks[l.noteId] } },
                h("label", { class: "asst-diff-toggle" },
                    h("input", { type: "checkbox", checked: !!this.acceptedLinks[l.noteId], onChange: (e) => (this.acceptedLinks = {
                            ...this.acceptedLinks,
                            [l.noteId]: e.target.checked,
                        }), "aria-label": `Include link to ${l.title}` })),
                h("div", { class: "asst-linkrow-body" },
                    h("span", { class: "asst-linkrow-title" }, l.title),
                    h("span", { class: "asst-linkrow-reason" }, l.reason)))))),
            h("div", { class: "asst-approve-row" },
                h("button", { type: "button", class: "asst-approve", disabled: acceptedIds.length === 0, onClick: () => this.popAssistantApproveLinks.emit({ noteIds: acceptedIds }) },
                    h("pop-brand-icon", { name: "check" }),
                    " Approve (",
                    acceptedIds.length,
                    ")"),
                h("button", { type: "button", class: "asst-reject", onClick: () => this.popAssistantRejectLinks.emit() },
                    h("pop-brand-icon", { name: "close" }),
                    " Reject"))));
    }
    render() {
        return (h("div", { key: '0', class: { 'asst-root': true, [`asst-root--${this.layout}`]: true } },
            this.renderHeader(),
            this.renderContext(),
            this.renderError(),
            h("div", { key: '1', class: "asst-body" },
                h("div", { key: '2', class: "asst-pane", hidden: this.verb !== 'ask' }, this.renderAsk()),
                this.verb === 'build' && h("div", { key: '3', class: "asst-pane" }, this.renderBuild()),
                this.verb === 'link' && h("div", { key: '4', class: "asst-pane" }, this.renderLink()))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-assistant",
        "componentClassName": "PopAssistant",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "verb",
                "type": "string",
                "attribute": "verb",
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "'ask'",
                "complexType": {
                    "original": "Verb",
                    "resolved": "\"ask\" | \"build\" | \"link\"",
                    "references": {
                        "Verb": {
                            "location": "global",
                            "id": "global::Verb"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Active verb (Ask default). Controlled by the host or the internal tabs."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "model",
                "type": "string",
                "attribute": "model",
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "'gemma'",
                "complexType": {
                    "original": "Model",
                    "resolved": "\"claude\" | \"gemma\"",
                    "references": {
                        "Model": {
                            "location": "global",
                            "id": "global::Model"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The single model control's value: Gemma (default) \u2194 Claude (toggle)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "messages",
                "type": "string",
                "attribute": "messages",
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
                    "text": "Pre-loaded Ask conversation (JSON AiMessage[]) restored from the thread."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "noteGrounded",
                "type": "boolean",
                "attribute": "note-grounded",
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
                    "text": "True when the Assistant is grounded in an open note (shows the context row)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "noteTitle",
                "type": "string",
                "attribute": "note-title",
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
                    "text": "Label of the grounding note (for the context row)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "layout",
                "type": "string",
                "attribute": "layout",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'dock'",
                "complexType": {
                    "original": "'dock' | 'full'",
                    "resolved": "\"dock\" | \"full\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Compact mode = the desktop dock; full = a page/sheet surface."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "buildProposal",
                "type": "string",
                "attribute": "build-proposal",
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
                    "text": "A pending Build proposal (JSON AssistantBlock[]) \u2014 renders the block diff."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "buildAction",
                "type": "string",
                "attribute": "build-action",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'structure'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The Build sub-action label shown on the proposal (\"Structure\"/\"Rewrite\"\u2026)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "linkProposal",
                "type": "string",
                "attribute": "link-proposal",
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
                    "text": "A pending Link proposal (JSON AssistantLink[]) \u2014 renders the link chips."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "proposing",
                "type": "boolean",
                "attribute": "proposing",
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
                    "text": "Show the busy state while the host fetches a Build/Link proposal."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "errorMessage",
                "type": "string",
                "attribute": "error-message",
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
                    "text": "An honest error to surface (e.g. endpoint unreachable)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "acceptedBlocks"
            }, {
                "name": "acceptedLinks"
            }],
        "methods": [{
                "name": "beginAssistant",
                "docs": {
                    "text": "Host: begin an Ask assistant turn (typing bubble).",
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
            }, {
                "name": "appendAssistantToken",
                "docs": {
                    "text": "Host: append a token to the streaming answer.",
                    "tags": []
                },
                "complexType": {
                    "signature": "(token: string) => Promise<any>",
                    "parameters": [{
                            "name": "token",
                            "type": "string",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "endAssistant",
                "docs": {
                    "text": "Host: finalize the answer with optional citations.",
                    "tags": []
                },
                "complexType": {
                    "signature": "(content?: string, citations?: AssistantCitation[]) => Promise<any>",
                    "parameters": [{
                            "name": "content",
                            "type": "string | undefined",
                            "docs": ""
                        }, {
                            "name": "citations",
                            "type": "{} | undefined",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "AssistantCitation": {
                            "location": "local",
                            "path": "ui-kit/organisms/assistant/assistant.tsx",
                            "id": "ui-kit/organisms/assistant/assistant.tsx::AssistantCitation"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "setAskInput",
                "docs": {
                    "text": "Host: seed the Ask input (e.g. from Cmd-K / a selection).",
                    "tags": []
                },
                "complexType": {
                    "signature": "(text: string) => Promise<any>",
                    "parameters": [{
                            "name": "text",
                            "type": "string",
                            "docs": ""
                        }],
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
                "name": "popAssistantVerbChange",
                "method": "popAssistantVerbChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "Verb",
                    "resolved": "\"ask\" | \"build\" | \"link\"",
                    "references": {
                        "Verb": {
                            "location": "global",
                            "id": "global::Verb"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAssistantModelChange",
                "method": "popAssistantModelChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "Model",
                    "resolved": "\"claude\" | \"gemma\"",
                    "references": {
                        "Model": {
                            "location": "global",
                            "id": "global::Model"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAssistantSend",
                "method": "popAssistantSend",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Ask: a question was submitted (host drives the streamed answer)."
                },
                "complexType": {
                    "original": "{ text: string; model: Model }",
                    "resolved": "{ text: string; model: Model; }",
                    "references": {
                        "Model": {
                            "location": "global",
                            "id": "global::Model"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAssistantBuild",
                "method": "popAssistantBuild",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Build: run a sub-action against the current text/selection."
                },
                "complexType": {
                    "original": "{ action: string; model: Model }",
                    "resolved": "{ action: string; model: Model; }",
                    "references": {
                        "Model": {
                            "location": "global",
                            "id": "global::Model"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAssistantSuggestLinks",
                "method": "popAssistantSuggestLinks",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Link: on-demand \"Suggest links\" was invoked."
                },
                "complexType": {
                    "original": "{ model: Model }",
                    "resolved": "{ model: Model; }",
                    "references": {
                        "Model": {
                            "location": "global",
                            "id": "global::Model"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAssistantCitationClick",
                "method": "popAssistantCitationClick",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "A citation chip was clicked \u2192 host navigates to the ref."
                },
                "complexType": {
                    "original": "{ refId: string; index: number }",
                    "resolved": "{ refId: string; index: number; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popAssistantApproveBuild",
                "method": "popAssistantApproveBuild",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Approve a Build proposal \u2192 host writes the accepted blocks."
                },
                "complexType": {
                    "original": "{ blocks: AssistantBlock[] }",
                    "resolved": "{ blocks: {}; }",
                    "references": {
                        "AssistantBlock": {
                            "location": "local",
                            "path": "ui-kit/organisms/assistant/assistant.tsx",
                            "id": "ui-kit/organisms/assistant/assistant.tsx::AssistantBlock"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popAssistantRejectBuild",
                "method": "popAssistantRejectBuild",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Reject a Build proposal \u2192 discard (nothing written)."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popAssistantApproveLinks",
                "method": "popAssistantApproveLinks",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Approve a Link proposal \u2192 host appends the accepted links."
                },
                "complexType": {
                    "original": "{ noteIds: string[] }",
                    "resolved": "{ noteIds: {}; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popAssistantRejectLinks",
                "method": "popAssistantRejectLinks",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Reject a Link proposal \u2192 discard."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "buildProposal",
                "methodName": "resetBuildSelection",
                "handlerOptions": undefined
            }, {
                "propName": "linkProposal",
                "methodName": "resetLinkSelection",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-ASSISTANT",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/assistant/assistant.css",
                        "relativePath": "assistant.css",
                        "originalComponentPath": "assistant.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": true,
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
        "hasLifecycle": true,
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
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "role", "aria-label", "type", "aria-selected", "onClick", "name", "aria-checked", "ref", "external-driver", "ai-name", "layout", "placeholder", "messages", "selected-model", "onPopMessageSent", "onPopCitationClick", "disabled", "variant", "show-label", "label", "iconName", "heading", "message", "size", "checked", "onChange", "innerHTML", "aria-hidden", "key", "hidden"],
        "htmlTagNames": ["header", "div", "button", "pop-brand-icon", "span", "pop-ai-chat", "pop-loading-state", "pop-empty-state", "ul", "li", "label", "input", "p", "table", "tbody", "tr", "td", "pre", "code"],
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
        "buildProposal": [{
                "resetBuildSelection": 0
            }],
        "linkProposal": [{
                "resetLinkSelection": 0
            }]
    }; }
};
/**
 * Minimal inline-HTML sanitizer for proposal previews. Editor.js block text may
 * carry inline markup (<b>/<i>/<a>/wikilink anchors); we keep a safe subset and
 * drop everything else so a proposal can't inject script into the preview.
 */
function sanitize(html) {
    const s = String(html ?? '');
    if (typeof document === 'undefined')
        return s.replace(/<[^>]*>/g, '');
    const tmp = document.createElement('div');
    tmp.innerHTML = s;
    tmp.querySelectorAll('script,style,iframe,object,embed').forEach((n) => n.remove());
    tmp.querySelectorAll('*').forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on'))
                el.removeAttribute(attr.name);
            if (name === 'href' && /^\s*javascript:/i.test(attr.value))
                el.removeAttribute(attr.name);
        }
    });
    return tmp.innerHTML;
}
//# sourceMappingURL=assistant.js.map