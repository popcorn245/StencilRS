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

const MODE_ICONS: Record<string, string> = {
  chat: '\u{1F4AC}',
  plan: '\u{1F4CB}',
  code: '\u2328\uFE0F',
};

const LS_MODEL = 'pop-tb-model';
const LS_MODE = 'pop-tb-mode';

function ls(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

@Component({
  tag: 'pop-model-selector',
  encapsulation: { type: 'scoped' },
  styleUrl: 'model-selector.css',
})
export class PopModelSelector {
  /** JSON string of ModelGroup[] */
  @Prop() models: string = '[]';

  /** Currently selected model value */
  @Prop() selectedModel: string = '';

  /** Currently selected mode */
  @Prop() selectedMode: string = 'chat';

  @Event() popModelChanged: EventEmitter<string>;
  @Event() popModeChanged: EventEmitter<string>;

  @State() currentModel: string = '';
  @State() currentMode: string = 'chat';
  @State() parsedModels: ModelGroup[] = [];
  @State() showDropdown: boolean = false;

  componentWillLoad() {
    this.parseProps();
    this.restoreFromStorage();
  }

  @Watch('models')
  @Watch('selectedModel')
  @Watch('selectedMode')
  parseProps() {
    try { this.parsedModels = JSON.parse(this.models); } catch { this.parsedModels = []; }
  }

  private restoreFromStorage() {
    const storedModel = ls(LS_MODEL);
    const storedMode = ls(LS_MODE);
    this.currentModel = this.selectedModel || storedModel || this.firstModelValue() || '';
    this.currentMode = this.selectedMode || storedMode || 'chat';
  }

  private firstModelValue(): string {
    return this.parsedModels[0]?.models[0]?.value ?? '';
  }

  private get allModels(): ModelOption[] {
    return this.parsedModels.flatMap(g => g.models);
  }

  private modelLabel(value: string): string {
    const m = this.allModels.find(m => m.value === value);
    if (!m) return value;
    const label = m.label;
    const parts = label.split(/[\s\-]/);
    if (parts.length > 2) return parts.slice(-2).join(' ');
    return label;
  }

  private selectModel(value: string) {
    this.currentModel = value;
    this.showDropdown = false;
    lsSet(LS_MODEL, value);
    this.popModelChanged.emit(value);
  }

  private selectMode(mode: string) {
    this.currentMode = mode;
    this.showDropdown = false;
    lsSet(LS_MODE, mode);
    this.popModeChanged.emit(mode);
  }

  render() {
    const modeIcon = MODE_ICONS[this.currentMode] || '\u{1F4AC}';
    const modelShort = this.modelLabel(this.currentModel);

    return (
      <div class="ms-root">
        <button
          class={{ 'ms-pill': true, 'ms-pill--open': this.showDropdown }}
          onClick={() => { this.showDropdown = !this.showDropdown; }}
          title={`Model: ${this.currentModel} \u00B7 Mode: ${this.currentMode}`}
        >
          <span class="ms-pill-mode-icon">{modeIcon}</span>
          {modelShort && <span class="ms-pill-model">{modelShort}</span>}
          <svg class="ms-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {this.showDropdown && (
          <div class="ms-dropdown-panel">
            {this.parsedModels.length > 0 && (
              <div class="ms-section">
                <div class="ms-section-label">Model</div>
                {this.parsedModels.map(group => (
                  <div key={group.group}>
                    {group.group && <div class="ms-group-label">{group.group}</div>}
                    {group.models.map(m => (
                      <button
                        key={m.value}
                        class={{ 'ms-option': true, 'ms-option--active': this.currentModel === m.value }}
                        onClick={() => this.selectModel(m.value)}
                      >
                        {m.icon && <span class="ms-option-icon">{m.icon}</span>}
                        <span class="ms-option-label">{m.label}</span>
                        {this.currentModel === m.value && <span class="ms-checkmark">{'\u2713'}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div class="ms-section">
              <div class="ms-section-label">Mode</div>
              {['chat', 'plan', 'code'].map(mode => (
                <button
                  key={mode}
                  class={{ 'ms-option': true, 'ms-option--active': this.currentMode === mode }}
                  onClick={() => this.selectMode(mode)}
                >
                  <span class="ms-option-icon">{MODE_ICONS[mode]}</span>
                  <span class="ms-option-label" style={{ textTransform: 'capitalize' }}>{mode}</span>
                  {this.currentMode === mode && <span class="ms-checkmark">{'\u2713'}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
