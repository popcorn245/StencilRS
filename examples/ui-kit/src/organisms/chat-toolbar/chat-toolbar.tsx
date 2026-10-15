import { Component, Prop, h, Event, EventEmitter, State, Watch } from '@stencil/core';

export interface ModelOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

export interface ModelGroup {
  group: string;
  models: ModelOption[];
}

export interface ToolDefinition {
  id: string;
  label: string;
  icon: string;
  enabled?: boolean;
}

const LS_MODEL = 'pop-tb-model';
const LS_MODE  = 'pop-tb-mode';
const LS_TOOLS = 'pop-tb-tools';

function ls(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

@Component({
  tag: 'pop-chat-toolbar',
  encapsulation: { type: 'scoped' },
  styleUrl: 'chat-toolbar.css',
})
export class PopChatToolbar {
  /** JSON string of ModelGroup[] */
  @Prop() models: string = '[]';

  /** Initial/controlled model value */
  @Prop() selectedModel: string = '';

  /** Initial/controlled mode */
  @Prop() selectedMode: string = 'chat';

  /** JSON string of ToolDefinition[] (extra tools merged with built-ins) */
  @Prop() tools: string = '[]';

  /** JSON string of string[] — initially active tool IDs */
  @Prop() activeTools: string = '[]';

  /** Show mic button in toolbar */
  @Prop() showMicButton: boolean = false;

  @Event() popModelChanged: EventEmitter<string>;
  @Event() popModeChanged: EventEmitter<string>;
  @Event() popToolToggled: EventEmitter<{ id: string; enabled: boolean }>;
  @Event() micPressed: EventEmitter<void>;
  @Event() micReleased: EventEmitter<void>;

  @State() currentModel: string = '';
  @State() currentMode: string = 'chat';
  @State() activeToolIds: string[] = [];
  @State() parsedModels: ModelGroup[] = [];
  @State() parsedTools: ToolDefinition[] = [];
  @State() showToolsPopover: boolean = false;

  componentWillLoad() {
    this.parseProps();
    this.restoreFromStorage();
  }

  @Watch('models')
  @Watch('tools')
  @Watch('selectedModel')
  @Watch('selectedMode')
  @Watch('activeTools')
  parseProps() {
    try { this.parsedModels = JSON.parse(this.models); } catch { this.parsedModels = []; }
    try { this.parsedTools = JSON.parse(this.tools); } catch { this.parsedTools = []; }
  }

  private restoreFromStorage() {
    // Controlled props take priority; fall back to localStorage; fall back to defaults
    const storedModel = ls(LS_MODEL);
    const storedMode  = ls(LS_MODE);
    const storedTools = ls(LS_TOOLS);

    this.currentModel = this.selectedModel || storedModel || this.firstModelValue() || '';
    this.currentMode  = this.selectedMode  || storedMode  || 'chat';

    if (this.activeTools !== '[]') {
      try { this.activeToolIds = JSON.parse(this.activeTools); } catch { this.activeToolIds = []; }
    } else if (storedTools) {
      try { this.activeToolIds = JSON.parse(storedTools); } catch { this.activeToolIds = []; }
    } else {
      this.activeToolIds = [];
    }
  }

  private firstModelValue(): string {
    return this.parsedModels[0]?.models[0]?.value ?? '';
  }


  private toggleTool(id: string) {
    const enabled = !this.activeToolIds.includes(id);
    const next = enabled
      ? [...this.activeToolIds, id]
      : this.activeToolIds.filter(t => t !== id);
    this.activeToolIds = next;
    lsSet(LS_TOOLS, JSON.stringify(next));
    this.popToolToggled.emit({ id, enabled });
  }


  private renderToolsPopover() {
    return (
      <div class="ct-dropdown-panel ct-tools-panel">
        <div class="ct-section-label">Tools</div>
        {this.parsedTools.map(tool => {
          const on = this.activeToolIds.includes(tool.id);
          return (
            <button
              key={tool.id}
              class={{ 'ct-tool-item': true, 'ct-tool-item--on': on }}
              onClick={() => this.toggleTool(tool.id)}
            >
              <span class="ct-tool-icon">{tool.icon}</span>
              <span class="ct-tool-label">{tool.label}</span>
              <span class={{ 'ct-toggle': true, 'ct-toggle--on': on }}>
                {on ? 'On' : 'Off'}
              </span>
            </button>
          );
        })}
        {this.parsedTools.length === 0 && (
          <div class="ct-empty">No tools configured</div>
        )}
        <slot name="tool" />
      </div>
    );
  }

  render() {
    const hasActiveTools = this.activeToolIds.length > 0;

    // Active tool icons to display in toolbar
    const activeToolDefs = this.parsedTools.filter(t => this.activeToolIds.includes(t.id));

    return (
      <div class="ct-root">
        {/* Model + Mode pill */}
        <pop-model-selector
          models={this.models}
          selectedModel={this.currentModel}
          selectedMode={this.currentMode}
          onPopModelChanged={(e: CustomEvent<string>) => {
            this.currentModel = e.detail;
            this.popModelChanged.emit(e.detail);
          }}
          onPopModeChanged={(e: CustomEvent<string>) => {
            this.currentMode = e.detail;
            this.popModeChanged.emit(e.detail);
          }}
        />

        {/* Tools button or active tool icons */}
        <div class="ct-tools-wrap">
          <button
            class={{ 'ct-tools-btn': true, 'ct-tools-btn--open': this.showToolsPopover }}
            onClick={() => {
              this.showToolsPopover = !this.showToolsPopover;
            }}
            title="Tools"
          >
            {hasActiveTools ? (
              activeToolDefs.map(t => (
                <span key={t.id} class="ct-active-tool-icon" title={t.label}>{t.icon}</span>
              ))
            ) : (
              <span class="ct-tools-label">Tools</span>
            )}
            <svg class="ct-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {this.showToolsPopover && this.renderToolsPopover()}
        </div>

        {/* Mic button */}
        {this.showMicButton && (
          <button
            class="ct-mic-btn"
            title="Voice input"
            onMouseDown={() => this.micPressed.emit()}
            onMouseUp={() => this.micReleased.emit()}
            onTouchStart={() => this.micPressed.emit()}
            onTouchEnd={() => this.micReleased.emit()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}

        {/* Parent-injected controls */}
        <slot name="toolbar-end" />
      </div>
    );
  }
}
