import { Component, h, Prop, Event, EventEmitter, State } from '@stencil/core';

@Component({
  tag: 'pop-ai-block',
  encapsulation: { type: 'scoped' },
  styleUrl: 'ai-block.css',
})
export class PopAiBlock {
  /** User's prompt text */
  @Prop({ mutable: true }) prompt: string = '';

  /** Generated response text */
  @Prop({ mutable: true }) response: string = '';

  /** Selected model identifier */
  @Prop({ mutable: true }) model: string = 'gemma4:e4b';

  /** Generation status: idle, generating, done, error */
  @Prop({ mutable: true }) status: string = 'idle';

  /** Whether Ollama is reachable */
  @Prop() ollamaAvailable: boolean = false;

  /** User clicked Generate */
  @Event({ composed: true, bubbles: true }) aiGenerate: EventEmitter<{ prompt: string; model: string }>;

  /** User cancelled generation */
  @Event({ composed: true, bubbles: true }) aiCancel: EventEmitter<{}>;

  /** Model selection changed */
  @Event({ composed: true, bubbles: true }) aiModelChange: EventEmitter<{ model: string }>;

  /** Any data change */
  @Event({ composed: true, bubbles: true }) aiChange: EventEmitter<{ prompt: string; response: string; model: string; status: string }>;

  @State() showPrompt: boolean = true;
  @State() statusText: string = '';

  private promptRef: HTMLTextAreaElement | null = null;

  componentWillLoad() {
    this.showPrompt = !this.response;
  }

  private get availableModels() {
    const models: { label: string; value: string }[] = [];
    if (this.ollamaAvailable) {
      models.push({ label: 'Gemma 4', value: 'gemma4:e4b' });
    }
    models.push({ label: 'Claude', value: 'claude-sonnet-4-20250514' });
    return models;
  }

  private handleGenerate = () => {
    const prompt = this.promptRef?.value?.trim() || this.prompt;
    if (!prompt) return;
    this.prompt = prompt;
    this.status = 'generating';
    this.showPrompt = false;
    this.aiGenerate.emit({ prompt, model: this.model });
    this.emitChange();
  };

  private handleEditPrompt = () => {
    this.showPrompt = true;
  };

  private handleRefresh = () => {
    this.response = '';
    this.status = 'generating';
    this.aiGenerate.emit({ prompt: this.prompt, model: this.model });
    this.emitChange();
  };

  private handleModelChange = (e: Event) => {
    this.model = (e.target as HTMLSelectElement).value;
    this.aiModelChange.emit({ model: this.model });
    this.emitChange();
  };

  private emitChange() {
    this.aiChange.emit({
      prompt: this.prompt,
      response: this.response,
      model: this.model,
      status: this.status,
    });
  }

  render() {
    return (
      <div class="aib-wrap">
        {/* Header with model selector */}
        <div class="aib-header">
          <span class="aib-label">AI</span>
          <select class="aib-model-select" onChange={this.handleModelChange}>
            {this.availableModels.map(m => (
              <option value={m.value} selected={this.model === m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Prompt area */}
        {this.showPrompt && (
          <div class="aib-prompt-area">
            <textarea
              class="aib-prompt-input"
              placeholder="Ask AI..."
              value={this.prompt}
              rows={2}
              ref={el => this.promptRef = el}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              class="aib-generate-btn"
              onClick={this.handleGenerate}
              disabled={this.status === 'generating'}
            >
              {this.status === 'generating' ? 'Generating...' : 'Generate'}
            </button>
          </div>
        )}

        {/* Status line */}
        {this.statusText && (
          <div class="aib-status">{this.statusText}</div>
        )}

        {/* Response content */}
        {this.response && (
          <div class="aib-content">{this.response}</div>
        )}

        {/* Error state */}
        {this.status === 'error' && (
          <div class="aib-error">Generation failed. Please try again.</div>
        )}

        {/* Action bar */}
        {this.response && !this.showPrompt && (
          <div class="aib-actions">
            <button type="button" class="aib-action-btn aib-action-btn--primary" onClick={this.handleRefresh}>
              Refresh
            </button>
            <button type="button" class="aib-action-btn" onClick={this.handleEditPrompt}>
              Edit prompt
            </button>
          </div>
        )}
      </div>
    );
  }
}
