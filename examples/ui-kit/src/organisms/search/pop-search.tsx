import { Component, Host, h, Prop, State, Method, Event, EventEmitter, Watch, Element } from '@stencil/core';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
}

export interface GroupedSearchResults {
  section: string;
  results: SearchResult[];
}

@Component({
  tag: 'pop-search',
  encapsulation: { type: 'shadow' },
  styleUrl: 'pop-search.css',
})
export class PopSearch {
  @Element() el!: HTMLElement;
  private inputEl?: HTMLInputElement;
  private searchBarEl?: HTMLDivElement;
  private searchPopoverEl?: HTMLDivElement;
  private clickOutsideHandler?: (e: MouseEvent) => void;
  private globalKbHandler?: (e: KeyboardEvent) => void;
  private resizeObserver?: ResizeObserver;
  private needsInitialQuery = false;

  // ── Props ──────────────────────────────────────────────────────────────────

  @Prop() results: GroupedSearchResults[] = [];
  @Prop({ mutable: true }) loading: boolean = false;

  /** POST endpoint for SSE chat — enables the AI chat side panel */
  @Prop() endpoint: string = '';

  /** GET endpoint for server-side search on Enter (response: GroupedSearchResults[] or { results: GroupedSearchResults[] }) */
  @Prop() searchApiEndpoint: string = '';

  @Prop() models: string = '[]';
  @Prop() selectedModel: string = '';
  @Prop() selectedMode: string = 'chat';
  @Prop() tools: string = '[]';
  @Prop() activeTools: string = '[]';
  @Prop() showMicButton: boolean = true;
  @Prop() placeholder: string = 'Search everything…';

  /** JSON array of filter definitions: { key: string, label: string, options: {value, label}[] } */
  @Prop() filters: string = '[]';

  /** CSS width override for the search bar (e.g. "400px", "100%") */
  @Prop() searchWidth: string = '';

  /** Width of the AI chat side panel in px — mobile always overrides to full-screen */
  @Prop() chatPanelWidth: number = 480;

  // ── Events ─────────────────────────────────────────────────────────────────

  /** Fired on every keystroke — use for live page-level filtering */
  @Event() queryChange: EventEmitter<string>;

  /** Fired when a result item is clicked */
  @Event() resultSelect: EventEmitter<SearchResult>;

  /** Fired when Ctrl/Cmd+Enter or the sparkles button is activated */
  @Event() agentQuery: EventEmitter<string>;

  /** Fired when Enter is pressed — use to trigger a full database search when searchApiEndpoint is unset */
  @Event() searchSubmit: EventEmitter<string>;

  /** Fired when filter values change */
  @Event() filterChange: EventEmitter<{ filters: Record<string, string[]> }>;

  @Event() popModelChanged: EventEmitter<string>;
  @Event() popModeChanged: EventEmitter<string>;
  @Event() popToolToggled: EventEmitter<{ id: string; enabled: boolean }>;

  // ── State ──────────────────────────────────────────────────────────────────

  @State() query: string = '';
  @State() isDictating: boolean = false;
  @State() viewMode: 'idle' | 'search' | 'chat' = 'idle';
  @State() focusedIndex: number = -1;
  @State() isFocused: boolean = false;
  @State() chatInitialQuery: string = '';
  @State() chatMessages: string = '[]';
  @State() showContinuePrompt: boolean = false;
  @State() activeFilters: Record<string, string[]> = {};
  @State() openFilterKey: string | null = null;

  // ── Speech ─────────────────────────────────────────────────────────────────

  private recognition: any;
  private synth: SpeechSynthesis;

  // ── Derived ────────────────────────────────────────────────────────────────

  private get flatResults(): SearchResult[] {
    return (this.results || []).flatMap(g => g.results);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  componentWillLoad() {
    this.setupSpeechAPI();
  }

  componentDidLoad() {
    this.clickOutsideHandler = (e: MouseEvent) => {
      if (this.viewMode === 'idle') return;
      if (!e.composedPath().includes(this.el)) this.closePopovers();
    };
    document.addEventListener('mousedown', this.clickOutsideHandler);

    this.globalKbHandler = (e: KeyboardEvent) => {
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
      const aiChat = this.el.shadowRoot?.querySelector('pop-ai-chat') as any;
      if (aiChat && this.chatInitialQuery) {
        setTimeout(() => aiChat.sendMessage?.(this.chatInitialQuery), 80);
      }
    }
  }

  disconnectedCallback() {
    if (this.clickOutsideHandler) document.removeEventListener('mousedown', this.clickOutsideHandler);
    if (this.globalKbHandler) document.removeEventListener('keydown', this.globalKbHandler);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.recognition) try { this.recognition.abort(); } catch { }
    document.body.classList.remove('has-chat-panel');
    document.body.style.removeProperty('--pop-chat-panel-width');
  }

  @Watch('results')
  resultsChanged() {
    this.focusedIndex = -1;
    if (this.results?.length > 0 && this.query && this.viewMode !== 'chat') {
      this.viewMode = 'search';
    }
  }

  // ── Positioning ────────────────────────────────────────────────────────────

  private positionSearchPopover() {
    if (!this.searchPopoverEl || !this.searchBarEl) return;
    const rect = this.searchBarEl.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const left = Math.max(rect.right - width, 8);
    this.searchPopoverEl.style.top = `${rect.bottom + 8}px`;
    this.searchPopoverEl.style.left = `${left}px`;
    this.searchPopoverEl.style.width = `${width}px`;
  }

  // ── Speech ─────────────────────────────────────────────────────────────────

  private setupSpeechAPI() {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.onstart = () => { this.isDictating = true; };
      this.recognition.onresult = (ev: any) => {
        this.query = ev.results[0][0].transcript;
        this.queryChange.emit(this.query);
      };
      this.recognition.onerror = () => { this.isDictating = false; };
      this.recognition.onend = () => { this.isDictating = false; };
    }
    this.synth = window.speechSynthesis;
  }

  // ── Internal fetch ─────────────────────────────────────────────────────────

  private async fetchResults(q: string) {
    this.loading = true;
    if (this.viewMode === 'idle') this.viewMode = 'search';
    try {
      const res = await fetch(`${this.searchApiEndpoint}?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      this.results = Array.isArray(data) ? data : (data.results ?? []);
    } catch { }
    this.loading = false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  @Method()
  async closePopovers(): Promise<void> {
    if (this.viewMode === 'chat') {
      const aiChat = this.el.shadowRoot?.querySelector('pop-ai-chat') as any;
      if (aiChat?.getMessages) {
        try {
          const msgs = await aiChat.getMessages();
          this.chatMessages = JSON.stringify(msgs);
        } catch { }
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

  @Method()
  async triggerSTT(): Promise<void> {
    if (!this.recognition) return;
    if (this.isDictating) {
      try { this.recognition.stop(); } catch { }
    } else {
      this.inputEl?.focus();
      try { this.recognition.start(); } catch { }
    }
  }

  @Method()
  async triggerTTS(text: string): Promise<void> {
    if (this.synth) this.synth.speak(new SpeechSynthesisUtterance(text));
  }

  @Method()
  async setLoading(val: boolean): Promise<void> {
    this.loading = val;
    if (val && this.viewMode === 'idle') this.viewMode = 'search';
  }

  // ── Chat mode ──────────────────────────────────────────────────────────────

  private enterChatMode = () => {
    const q = this.query.trim();
    this.agentQuery.emit(q);
    if (!this.endpoint) return;
    this.chatInitialQuery = q;
    const hasPrior = (() => { try { return JSON.parse(this.chatMessages).length > 0; } catch { return false; } })();
    if (hasPrior) {
      this.showContinuePrompt = true;
    } else {
      this.needsInitialQuery = !!q;
    }
    document.body.classList.add('has-chat-panel');
    document.body.style.setProperty('--pop-chat-panel-width', `${this.chatPanelWidth}px`);
    this.viewMode = 'chat';
  };

  // ── Input handlers ─────────────────────────────────────────────────────────

  private handleInput = (ev: Event) => {
    this.query = (ev.target as HTMLInputElement).value;
    this.focusedIndex = -1;
    this.queryChange.emit(this.query);
    if (!this.query && this.viewMode === 'search') this.viewMode = 'idle';
  };

  private handleKeydown = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') { this.closePopovers(); return; }

    const flat = this.flatResults;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.focusedIndex = Math.min(this.focusedIndex + 1, flat.length - 1);
      if (this.viewMode === 'idle') this.viewMode = 'search';
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
      } else if (this.focusedIndex >= 0 && flat[this.focusedIndex]) {
        this.handleResultClick(flat[this.focusedIndex]);
      } else {
        this.viewMode = 'search';
        this.searchSubmit.emit(this.query);
        if (this.searchApiEndpoint && this.query.trim()) {
          this.fetchResults(this.query.trim());
        }
      }
    }
  };

  private handleResultClick(result: SearchResult) {
    this.resultSelect.emit(result);
    if (this.viewMode === 'search') this.closePopovers();
    // In chat mode, panel stays open (source chip click)
  }

  // ── Filter handling ─────────────────────────────────────────────────────────

  private get parsedFilters(): { key: string; label: string; options: { value: string; label: string }[] }[] {
    try { return JSON.parse(this.filters); } catch { return []; }
  }

  private toggleFilterDropdown = (key: string) => {
    this.openFilterKey = this.openFilterKey === key ? null : key;
  };

  private toggleFilterValue = (key: string, value: string) => {
    const current = this.activeFilters[key] || [];
    const idx = current.indexOf(value);
    const updated = idx >= 0
      ? current.filter(v => v !== value)
      : [...current, value];
    this.activeFilters = { ...this.activeFilters, [key]: updated };
    this.filterChange.emit({ filters: this.activeFilters });
  };

  private renderFilterChips() {
    const filters = this.parsedFilters;
    if (filters.length === 0) return null;

    return (
      <div class="filter-chips">
        {filters.map(f => {
          const activeCount = (this.activeFilters[f.key] || []).length;
          const isOpen = this.openFilterKey === f.key;
          return (
            <div class="filter-chip-wrap" key={f.key}>
              <button
                type="button"
                class={{ 'filter-chip': true, 'filter-chip--active': activeCount > 0 }}
                onClick={() => this.toggleFilterDropdown(f.key)}
              >
                {f.label}
                {activeCount > 0 && <span class="filter-badge">{activeCount}</span>}
              </button>
              {isOpen && (
                <div class="filter-dropdown">
                  {f.options.map(opt => {
                    const selected = (this.activeFilters[f.key] || []).includes(opt.value);
                    return (
                      <label class="filter-option" key={opt.value}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => this.toggleFilterValue(f.key, opt.value)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  private clearQuery = () => {
    this.query = '';
    this.viewMode = 'idle';
    this.focusedIndex = -1;
    this.queryChange.emit('');
    this.inputEl?.focus();
  };

  // ── SVG helpers ─────────────────────────────────────────────────────────────

  private searchSvg(size = 16) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    );
  }

  private micSvg(size = 16) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    );
  }

  private closeSvg(size = 14) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }

  private sparklesSvg(size = 16) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    );
  }

  // ── Render: search popover ─────────────────────────────────────────────────

  private renderSearchPopover() {
    const hasResults = this.results?.length > 0;

    return (
      <div
        class="search-popover"
        ref={el => { this.searchPopoverEl = el as HTMLDivElement; }}
        role="listbox"
      >
        {this.loading ? (
          <div class="loading-row">
            <span class="spinner" aria-hidden="true" />
            <span>Searching<span class="dot dot-1">.</span><span class="dot dot-2">.</span><span class="dot dot-3">.</span></span>
          </div>
        ) : hasResults ? (
          <div class="search-popover-scroll">
            {this.renderResultGroups()}
          </div>
        ) : (
          <div class="empty-state" role="status">
            No results
            {this.endpoint && <span class="empty-hint"> — try <kbd>⌘↵</kbd> to ask AI</span>}
          </div>
        )}
        <div class="slot-toolbar-end">
          <slot name="toolbar-end" />
        </div>
      </div>
    );
  }

  private renderResultGroups() {
    let runningIndex = 0;
    return this.results.map(group => {
      const groupStart = runningIndex;
      runningIndex += group.results.length;
      return (
        <div class="result-group" key={group.section}>
          <div class="group-header" role="presentation">{group.section}</div>
          <ul class="result-list" role="group" aria-label={group.section}>
            {group.results.map((result, ri) => {
              const idx = groupStart + ri;
              return (
                <li
                  key={result.id}
                  class={{ 'result-item': true, 'is-focused': idx === this.focusedIndex }}
                  role="option"
                  aria-selected={String(idx === this.focusedIndex)}
                  onClick={() => this.handleResultClick(result)}
                  onMouseEnter={() => { this.focusedIndex = idx; }}
                >
                  <div class="result-title">{result.title}</div>
                  {result.subtitle && <div class="result-subtitle">{result.subtitle}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      );
    });
  }

  // ── Render: chat side panel ────────────────────────────────────────────────

  private renderChatPanel() {
    const totalSources = (this.results || []).reduce((n, g) => n + g.results.length, 0);

    return (
      <div class="chat-panel" role="dialog" aria-modal="true" aria-label="AI Search">
        <div class="chat-panel-header">
          <div class="chat-panel-query">
            {this.sparklesSvg(14)}
            <span>{this.chatInitialQuery || 'AI Chat'}</span>
          </div>
          <button
            class="icon-btn close-btn"
            type="button"
            onClick={() => this.closePopovers()}
            title="Close (Esc)"
            aria-label="Close"
          >
            {this.closeSvg(14)}
          </button>
        </div>

        {totalSources > 0 && (
          <div class="sources-section" aria-label="Sources">
            <div class="sources-list">
              {(this.results || []).flatMap(g => g.results).map(r => (
                <button
                  key={r.id}
                  class="source-item"
                  type="button"
                  onClick={() => { this.resultSelect.emit(r); }}
                  title={r.subtitle}
                >
                  {r.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {this.showContinuePrompt && (
          <div class="continue-prompt" role="alert">
            <span>Continue previous conversation?</span>
            <div class="continue-actions">
              <button type="button" class="continue-btn" onClick={() => { this.showContinuePrompt = false; }}>
                Continue
              </button>
              <button
                type="button"
                class="new-chat-btn"
                onClick={() => {
                  this.chatMessages = '[]';
                  this.showContinuePrompt = false;
                  this.needsInitialQuery = !!this.chatInitialQuery;
                }}
              >
                New Chat
              </button>
            </div>
          </div>
        )}

        <pop-ai-chat
          class="chat-panel-ai"
          endpoint={this.endpoint}
          messages={this.chatMessages}
          layout="prose"
          streaming-mode="inline"
          placeholder="Follow up…"
          models={this.models}
          selected-model={this.selectedModel}
          selected-mode={this.selectedMode}
          tools={this.tools}
          active-tools={this.activeTools}
          show-mic-button={String(this.showMicButton)}
          onPopModelChanged={(e: CustomEvent<string>) => this.popModelChanged.emit(e.detail)}
          onPopModeChanged={(e: CustomEvent<string>) => this.popModeChanged.emit(e.detail)}
          onPopToolToggled={(e: CustomEvent<any>) => this.popToolToggled.emit(e.detail)}
        >
          <slot name="toolbar-end" slot="toolbar-end" />
        </pop-ai-chat>
      </div>
    );
  }

  // ── Root render ────────────────────────────────────────────────────────────

  render() {
    const showKbdHint = !this.isFocused && !this.query;

    return (
      <Host>
        <div
          class={{ 'search-bar': true, 'is-open': this.viewMode !== 'idle' }}
          ref={el => { this.searchBarEl = el as HTMLDivElement; }}
          style={this.searchWidth ? { width: this.searchWidth } : {}}
        >
          <span class="search-icon" aria-hidden="true">{this.searchSvg()}</span>
          <input
            type="text"
            placeholder={this.placeholder}
            value={this.query}
            onInput={this.handleInput}
            onKeyDown={this.handleKeydown}
            onFocus={() => { this.isFocused = true; }}
            onBlur={() => { this.isFocused = false; }}
            ref={el => { this.inputEl = el; }}
            autocomplete="off"
            spellcheck={false}
            role="combobox"
            aria-label="Search"
            aria-expanded={String(this.viewMode !== 'idle')}
            aria-autocomplete="list"
            aria-haspopup="listbox"
          />
          <div class="suffix-icons">
            {this.query && (
              <button
                class="icon-btn clear-btn"
                type="button"
                onClick={this.clearQuery}
                title="Clear search"
                aria-label="Clear search"
              >
                {this.closeSvg(12)}
              </button>
            )}
            {showKbdHint && (
              <kbd class="kbd-hint" aria-hidden="true">⌘K</kbd>
            )}
            {this.showMicButton && (
              <button
                class={{ 'icon-btn': true, 'mic-btn': true, 'is-dictating': this.isDictating }}
                type="button"
                onClick={() => this.triggerSTT()}
                title={this.isDictating ? 'Stop listening' : 'Voice input'}
                aria-label={this.isDictating ? 'Stop listening' : 'Voice input'}
                aria-pressed={String(this.isDictating)}
              >
                {this.micSvg()}
              </button>
            )}
            {this.endpoint && (
              <button
                class="icon-btn sparkles-btn"
                type="button"
                onClick={this.enterChatMode}
                title="Ask AI (⌘↵)"
                aria-label="Ask AI"
              >
                {this.sparklesSvg()}
              </button>
            )}
          </div>
        </div>

        {this.renderFilterChips()}

        {this.viewMode === 'search' && this.renderSearchPopover()}
        {this.viewMode === 'chat' && this.renderChatPanel()}
      </Host>
    );
  }
}
