import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopSearchStyle0 from "./ui-kit/organisms/search/pop-search.css?tag=pop-search&encapsulation=shadow";
export const PopSearch = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.queryChange = __stencil_createEvent(this, "queryChange", 7);
        this.resultSelect = __stencil_createEvent(this, "resultSelect", 7);
        this.agentQuery = __stencil_createEvent(this, "agentQuery", 7);
        this.searchSubmit = __stencil_createEvent(this, "searchSubmit", 7);
        this.filterChange = __stencil_createEvent(this, "filterChange", 7);
        this.popModelChanged = __stencil_createEvent(this, "popModelChanged", 7);
        this.popModeChanged = __stencil_createEvent(this, "popModeChanged", 7);
        this.popToolToggled = __stencil_createEvent(this, "popToolToggled", 7);
    }
    get el() { return __stencil_getElement(this); }
    inputEl;
    searchBarEl;
    searchPopoverEl;
    clickOutsideHandler;
    globalKbHandler;
    resizeObserver;
    needsInitialQuery = false;
    // ── Props ──────────────────────────────────────────────────────────────────
    results = [];
    loading = false;
    /** POST endpoint for SSE chat — enables the AI chat side panel */
    endpoint = '';
    /** GET endpoint for server-side search on Enter (response: GroupedSearchResults[] or { results: GroupedSearchResults[] }) */
    searchApiEndpoint = '';
    models = '[]';
    selectedModel = '';
    selectedMode = 'chat';
    tools = '[]';
    activeTools = '[]';
    showMicButton = true;
    placeholder = 'Search everything…';
    /** JSON array of filter definitions: { key: string, label: string, options: {value, label}[] } */
    filters = '[]';
    /** CSS width override for the search bar (e.g. "400px", "100%") */
    searchWidth = '';
    /** Width of the AI chat side panel in px — mobile always overrides to full-screen */
    chatPanelWidth = 480;
    // ── Events ─────────────────────────────────────────────────────────────────
    /** Fired on every keystroke — use for live page-level filtering */
    queryChange;
    /** Fired when a result item is clicked */
    resultSelect;
    /** Fired when Ctrl/Cmd+Enter or the sparkles button is activated */
    agentQuery;
    /** Fired when Enter is pressed — use to trigger a full database search when searchApiEndpoint is unset */
    searchSubmit;
    /** Fired when filter values change */
    filterChange;
    popModelChanged;
    popModeChanged;
    popToolToggled;
    // ── State ──────────────────────────────────────────────────────────────────
    query = '';
    isDictating = false;
    viewMode = 'idle';
    focusedIndex = -1;
    isFocused = false;
    chatInitialQuery = '';
    chatMessages = '[]';
    showContinuePrompt = false;
    activeFilters = {};
    openFilterKey = null;
    // ── Speech ─────────────────────────────────────────────────────────────────
    recognition;
    synth;
    // ── Derived ────────────────────────────────────────────────────────────────
    get flatResults() {
        return (this.results || []).flatMap(g => g.results);
    }
    // ── Lifecycle ──────────────────────────────────────────────────────────────
    componentWillLoad() {
        this.setupSpeechAPI();
    }
    componentDidLoad() {
        this.clickOutsideHandler = (e) => {
            if (this.viewMode === 'idle')
                return;
            if (!e.composedPath().includes(this.el))
                this.closePopovers();
        };
        document.addEventListener('mousedown', this.clickOutsideHandler);
        this.globalKbHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.inputEl?.focus();
                this.inputEl?.select();
            }
            if (e.key === 'Escape' && this.viewMode !== 'idle') {
                this.closePopovers();
            }
        };
        document.addEventListener('keydown', this.globalKbHandler);
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.positionSearchPopover());
            this.resizeObserver.observe(document.documentElement);
        }
    }
    componentDidUpdate() {
        this.positionSearchPopover();
        if (this.needsInitialQuery && this.viewMode === 'chat') {
            this.needsInitialQuery = false;
            const aiChat = this.el.shadowRoot?.querySelector('pop-ai-chat');
            if (aiChat && this.chatInitialQuery) {
                setTimeout(() => aiChat.sendMessage?.(this.chatInitialQuery), 80);
            }
        }
    }
    disconnectedCallback() {
        if (this.clickOutsideHandler)
            document.removeEventListener('mousedown', this.clickOutsideHandler);
        if (this.globalKbHandler)
            document.removeEventListener('keydown', this.globalKbHandler);
        if (this.resizeObserver)
            this.resizeObserver.disconnect();
        if (this.recognition)
            try {
                this.recognition.abort();
            }
            catch { }
        document.body.classList.remove('has-chat-panel');
        document.body.style.removeProperty('--pop-chat-panel-width');
    }
    resultsChanged() {
        this.focusedIndex = -1;
        if (this.results?.length > 0 && this.query && this.viewMode !== 'chat') {
            this.viewMode = 'search';
        }
    }
    // ── Positioning ────────────────────────────────────────────────────────────
    positionSearchPopover() {
        if (!this.searchPopoverEl || !this.searchBarEl)
            return;
        const rect = this.searchBarEl.getBoundingClientRect();
        const width = Math.max(rect.width, 320);
        const left = Math.max(rect.right - width, 8);
        this.searchPopoverEl.style.top = `${rect.bottom + 8}px`;
        this.searchPopoverEl.style.left = `${left}px`;
        this.searchPopoverEl.style.width = `${width}px`;
    }
    // ── Speech ─────────────────────────────────────────────────────────────────
    setupSpeechAPI() {
        if (typeof window === 'undefined')
            return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
            this.recognition = new SR();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            this.recognition.onstart = () => { this.isDictating = true; };
            this.recognition.onresult = (ev) => {
                this.query = ev.results[0][0].transcript;
                this.queryChange.emit(this.query);
            };
            this.recognition.onerror = () => { this.isDictating = false; };
            this.recognition.onend = () => { this.isDictating = false; };
        }
        this.synth = window.speechSynthesis;
    }
    // ── Internal fetch ─────────────────────────────────────────────────────────
    async fetchResults(q) {
        this.loading = true;
        if (this.viewMode === 'idle')
            this.viewMode = 'search';
        try {
            const res = await fetch(`${this.searchApiEndpoint}?q=${encodeURIComponent(q)}`);
            if (!res.ok)
                throw new Error(`${res.status}`);
            const data = await res.json();
            this.results = Array.isArray(data) ? data : (data.results ?? []);
        }
        catch { }
        this.loading = false;
    }
    // ── Public API ─────────────────────────────────────────────────────────────
    async closePopovers() {
        if (this.viewMode === 'chat') {
            const aiChat = this.el.shadowRoot?.querySelector('pop-ai-chat');
            if (aiChat?.getMessages) {
                try {
                    const msgs = await aiChat.getMessages();
                    this.chatMessages = JSON.stringify(msgs);
                }
                catch { }
            }
            document.body.classList.remove('has-chat-panel');
            document.body.style.removeProperty('--pop-chat-panel-width');
        }
        this.viewMode = 'idle';
        this.focusedIndex = -1;
        this.openFilterKey = null;
        this.showContinuePrompt = false;
        this.loading = false;
    }
    async triggerSTT() {
        if (!this.recognition)
            return;
        if (this.isDictating) {
            try {
                this.recognition.stop();
            }
            catch { }
        }
        else {
            this.inputEl?.focus();
            try {
                this.recognition.start();
            }
            catch { }
        }
    }
    async triggerTTS(text) {
        if (this.synth)
            this.synth.speak(new SpeechSynthesisUtterance(text));
    }
    async setLoading(val) {
        this.loading = val;
        if (val && this.viewMode === 'idle')
            this.viewMode = 'search';
    }
    // ── Chat mode ──────────────────────────────────────────────────────────────
    enterChatMode = () => {
        const q = this.query.trim();
        this.agentQuery.emit(q);
        if (!this.endpoint)
            return;
        this.chatInitialQuery = q;
        const hasPrior = (() => { try {
            return JSON.parse(this.chatMessages).length > 0;
        }
        catch {
            return false;
        } })();
        if (hasPrior) {
            this.showContinuePrompt = true;
        }
        else {
            this.needsInitialQuery = !!q;
        }
        document.body.classList.add('has-chat-panel');
        document.body.style.setProperty('--pop-chat-panel-width', `${this.chatPanelWidth}px`);
        this.viewMode = 'chat';
    };
    // ── Input handlers ─────────────────────────────────────────────────────────
    handleInput = (ev) => {
        this.query = ev.target.value;
        this.focusedIndex = -1;
        this.queryChange.emit(this.query);
        if (!this.query && this.viewMode === 'search')
            this.viewMode = 'idle';
    };
    handleKeydown = (ev) => {
        if (ev.key === 'Escape') {
            this.closePopovers();
            return;
        }
        const flat = this.flatResults;
        if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            this.focusedIndex = Math.min(this.focusedIndex + 1, flat.length - 1);
            if (this.viewMode === 'idle')
                this.viewMode = 'search';
            return;
        }
        if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            this.focusedIndex = this.focusedIndex <= 0 ? -1 : this.focusedIndex - 1;
            return;
        }
        if (ev.key === 'Enter') {
            if (ev.ctrlKey || ev.metaKey) {
                ev.preventDefault();
                this.enterChatMode();
            }
            else if (this.focusedIndex >= 0 && flat[this.focusedIndex]) {
                this.handleResultClick(flat[this.focusedIndex]);
            }
            else {
                this.viewMode = 'search';
                this.searchSubmit.emit(this.query);
                if (this.searchApiEndpoint && this.query.trim()) {
                    this.fetchResults(this.query.trim());
                }
            }
        }
    };
    handleResultClick(result) {
        this.resultSelect.emit(result);
        if (this.viewMode === 'search')
            this.closePopovers();
        // In chat mode, panel stays open (source chip click)
    }
    // ── Filter handling ─────────────────────────────────────────────────────────
    get parsedFilters() {
        try {
            return JSON.parse(this.filters);
        }
        catch {
            return [];
        }
    }
    toggleFilterDropdown = (key) => {
        this.openFilterKey = this.openFilterKey === key ? null : key;
    };
    toggleFilterValue = (key, value) => {
        const current = this.activeFilters[key] || [];
        const idx = current.indexOf(value);
        const updated = idx >= 0
            ? current.filter(v => v !== value)
            : [...current, value];
        this.activeFilters = { ...this.activeFilters, [key]: updated };
        this.filterChange.emit({ filters: this.activeFilters });
    };
    renderFilterChips() {
        const filters = this.parsedFilters;
        if (filters.length === 0)
            return null;
        return (h("div", { class: "filter-chips" }, filters.map(f => {
            const activeCount = (this.activeFilters[f.key] || []).length;
            const isOpen = this.openFilterKey === f.key;
            return (h("div", { class: "filter-chip-wrap", key: f.key },
                h("button", { type: "button", class: { 'filter-chip': true, 'filter-chip--active': activeCount > 0 }, onClick: () => this.toggleFilterDropdown(f.key) },
                    f.label,
                    activeCount > 0 && h("span", { class: "filter-badge" }, activeCount)),
                isOpen && (h("div", { class: "filter-dropdown" }, f.options.map(opt => {
                    const selected = (this.activeFilters[f.key] || []).includes(opt.value);
                    return (h("label", { class: "filter-option", key: opt.value },
                        h("input", { type: "checkbox", checked: selected, onChange: () => this.toggleFilterValue(f.key, opt.value) }),
                        h("span", null, opt.label)));
                })))));
        })));
    }
    clearQuery = () => {
        this.query = '';
        this.viewMode = 'idle';
        this.focusedIndex = -1;
        this.queryChange.emit('');
        this.inputEl?.focus();
    };
    // ── SVG helpers ─────────────────────────────────────────────────────────────
    searchSvg(size = 16) {
        return (h("svg", { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
            h("circle", { cx: "11", cy: "11", r: "8" }),
            h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })));
    }
    micSvg(size = 16) {
        return (h("svg", { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
            h("path", { d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" }),
            h("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
            h("line", { x1: "12", y1: "19", x2: "12", y2: "22" })));
    }
    closeSvg(size = 14) {
        return (h("svg", { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
            h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
            h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })));
    }
    sparklesSvg(size = 16) {
        return (h("svg", { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" },
            h("path", { d: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" })));
    }
    // ── Render: search popover ─────────────────────────────────────────────────
    renderSearchPopover() {
        const hasResults = this.results?.length > 0;
        return (h("div", { class: "search-popover", ref: el => { this.searchPopoverEl = el; }, role: "listbox" },
            this.loading ? (h("div", { class: "loading-row" },
                h("span", { class: "spinner", "aria-hidden": "true" }),
                h("span", null,
                    "Searching",
                    h("span", { class: "dot dot-1" }, "."),
                    h("span", { class: "dot dot-2" }, "."),
                    h("span", { class: "dot dot-3" }, ".")))) : hasResults ? (h("div", { class: "search-popover-scroll" }, this.renderResultGroups())) : (h("div", { class: "empty-state", role: "status" },
                "No results",
                this.endpoint && h("span", { class: "empty-hint" },
                    " \u2014 try ",
                    h("kbd", null, "\u2318\u21B5"),
                    " to ask AI"))),
            h("div", { class: "slot-toolbar-end" },
                h("slot", { name: "toolbar-end" }))));
    }
    renderResultGroups() {
        let runningIndex = 0;
        return this.results.map(group => {
            const groupStart = runningIndex;
            runningIndex += group.results.length;
            return (h("div", { class: "result-group", key: group.section },
                h("div", { class: "group-header", role: "presentation" }, group.section),
                h("ul", { class: "result-list", role: "group", "aria-label": group.section }, group.results.map((result, ri) => {
                    const idx = groupStart + ri;
                    return (h("li", { key: result.id, class: { 'result-item': true, 'is-focused': idx === this.focusedIndex }, role: "option", "aria-selected": String(idx === this.focusedIndex), onClick: () => this.handleResultClick(result), onMouseEnter: () => { this.focusedIndex = idx; } },
                        h("div", { class: "result-title" }, result.title),
                        result.subtitle && h("div", { class: "result-subtitle" }, result.subtitle)));
                }))));
        });
    }
    // ── Render: chat side panel ────────────────────────────────────────────────
    renderChatPanel() {
        const totalSources = (this.results || []).reduce((n, g) => n + g.results.length, 0);
        return (h("div", { class: "chat-panel", role: "dialog", "aria-modal": "true", "aria-label": "AI Search" },
            h("div", { class: "chat-panel-header" },
                h("div", { class: "chat-panel-query" },
                    this.sparklesSvg(14),
                    h("span", null, this.chatInitialQuery || 'AI Chat')),
                h("button", { class: "icon-btn close-btn", type: "button", onClick: () => this.closePopovers(), title: "Close (Esc)", "aria-label": "Close" }, this.closeSvg(14))),
            totalSources > 0 && (h("div", { class: "sources-section", "aria-label": "Sources" },
                h("div", { class: "sources-list" }, (this.results || []).flatMap(g => g.results).map(r => (h("button", { key: r.id, class: "source-item", type: "button", onClick: () => { this.resultSelect.emit(r); }, title: r.subtitle }, r.title)))))),
            this.showContinuePrompt && (h("div", { class: "continue-prompt", role: "alert" },
                h("span", null, "Continue previous conversation?"),
                h("div", { class: "continue-actions" },
                    h("button", { type: "button", class: "continue-btn", onClick: () => { this.showContinuePrompt = false; } }, "Continue"),
                    h("button", { type: "button", class: "new-chat-btn", onClick: () => {
                            this.chatMessages = '[]';
                            this.showContinuePrompt = false;
                            this.needsInitialQuery = !!this.chatInitialQuery;
                        } }, "New Chat")))),
            h("pop-ai-chat", { class: "chat-panel-ai", endpoint: this.endpoint, messages: this.chatMessages, layout: "prose", "streaming-mode": "inline", placeholder: "Follow up\u2026", models: this.models, "selected-model": this.selectedModel, "selected-mode": this.selectedMode, tools: this.tools, "active-tools": this.activeTools, "show-mic-button": String(this.showMicButton), onPopModelChanged: (e) => this.popModelChanged.emit(e.detail), onPopModeChanged: (e) => this.popModeChanged.emit(e.detail), onPopToolToggled: (e) => this.popToolToggled.emit(e.detail) },
                h("slot", { name: "toolbar-end", slot: "toolbar-end" }))));
    }
    // ── Root render ────────────────────────────────────────────────────────────
    render() {
        const showKbdHint = !this.isFocused && !this.query;
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: { 'search-bar': true, 'is-open': this.viewMode !== 'idle' }, ref: el => { this.searchBarEl = el; }, style: this.searchWidth ? { width: this.searchWidth } : {} },
                h("span", { key: '2', class: "search-icon", "aria-hidden": "true" }, this.searchSvg()),
                h("input", { key: '3', type: "text", placeholder: this.placeholder, value: this.query, onInput: this.handleInput, onKeyDown: this.handleKeydown, onFocus: () => { this.isFocused = true; }, onBlur: () => { this.isFocused = false; }, ref: el => { this.inputEl = el; }, autocomplete: "off", spellcheck: false, role: "combobox", "aria-label": "Search", "aria-expanded": String(this.viewMode !== 'idle'), "aria-autocomplete": "list", "aria-haspopup": "listbox" }),
                h("div", { key: '4', class: "suffix-icons" },
                    this.query && (h("button", { key: '5', class: "icon-btn clear-btn", type: "button", onClick: this.clearQuery, title: "Clear search", "aria-label": "Clear search" }, this.closeSvg(12))),
                    showKbdHint && (h("kbd", { key: '6', class: "kbd-hint", "aria-hidden": "true" }, "\u2318K")),
                    this.showMicButton && (h("button", { key: '7', class: { 'icon-btn': true, 'mic-btn': true, 'is-dictating': this.isDictating }, type: "button", onClick: () => this.triggerSTT(), title: this.isDictating ? 'Stop listening' : 'Voice input', "aria-label": this.isDictating ? 'Stop listening' : 'Voice input', "aria-pressed": String(this.isDictating) }, this.micSvg())),
                    this.endpoint && (h("button", { key: '8', class: "icon-btn sparkles-btn", type: "button", onClick: this.enterChatMode, title: "Ask AI (\u2318\u21B5)", "aria-label": "Ask AI" }, this.sparklesSvg())))),
            this.renderFilterChips(),
            this.viewMode === 'search' && this.renderSearchPopover(),
            this.viewMode === 'chat' && this.renderChatPanel()));
    }
    static get watchers() { return {
        "results": [{
                "resultsChanged": 0
            }]
    }; }
};
PopSearch.style = PopSearchStyle0();
//# sourceMappingURL=pop-search.js.map