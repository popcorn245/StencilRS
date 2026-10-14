import { Component, Prop, h, Event, EventEmitter, State, Watch, Element, Method } from '@stencil/core';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  /** Optional grounding citations attached to an assistant message. */
  citations?: AiCitation[];
}

/** A clickable source attached to an assistant answer (RAG / note-grounded). */
export interface AiCitation {
  /** 1-based marker rendered in the chip ("[1]"). */
  index: number;
  /** Opaque id the host resolves on click (e.g. a noteId). */
  refId: string;
  /** Display label (e.g. a note title). */
  label: string;
  /** Optional hover preview. */
  snippet?: string;
}

@Component({
  tag: 'pop-ai-chat',
  encapsulation: { type: 'scoped' },
  styleUrl: 'ai-chat.css',
})
export class PopAiChat {
  @Element() el: HTMLElement;

  /** POST endpoint that streams SSE: data: {token?, done?, error?, assistantMsgId?} */
  @Prop() endpoint: string = '';

  /**
   * When true, the host drives the answer instead of the built-in SSE fetch:
   * on send the component emits `popMessageSent` and the host streams tokens via
   * `beginAssistant()` / `appendAssistantToken()` / `endAssistant()`. Used by the
   * notes-app right-dock so chat is backed by the in-browser RAG `askBrain`
   * (retrieval + required citations) rather than a raw endpoint.
   */
  @Prop() externalDriver: boolean = false;

  /** Extra context injected into request payload */
  @Prop() context: string = '';

  /** JSON string of AiMessage[] — pre-loaded history */
  @Prop() messages: string = '[]';

  /** Session ID passed through in each request */
  @Prop() sessionId: string = '';

  // AI persona
  @Prop() aiName: string = 'Assistant';
  @Prop() aiAvatarUrl: string = '';
  @Prop() aiAccentColor: string = '';

  // User identity
  @Prop() userAvatarUrl: string = '';
  @Prop() userInitials: string = '';

  // Display
  @Prop() layout: 'bubble' | 'prose' = 'bubble';
  @Prop() streamingMode: 'inline' | 'dots' = 'inline';
  @Prop() placeholder: string = 'Message...';

  // Input features
  @Prop() showMicButton: boolean = false;
  @Prop() disabled: boolean = false;

  // Toolbar
  @Prop() models: string = '[]';
  @Prop() selectedModel: string = '';
  @Prop() selectedMode: string = 'chat';
  @Prop() tools: string = '[]';
  @Prop() activeTools: string = '[]';

  @State() localMessages: AiMessage[] = [];
  @State() isStreaming: boolean = false;
  @State() streamingContent: string = '';
  @State() streamingCitations: AiCitation[] = [];
  @State() currentModel: string = '';
  @State() currentMode: string = 'chat';
  @State() currentActiveTools: string[] = [];

  @Event() popMessageSent: EventEmitter<{ text: string; sessionId: string; model: string; mode: string; tools: string[] }>;
  @Event() popResponseComplete: EventEmitter<{ content: string; sessionId: string }>;
  @Event() popError: EventEmitter<string>;
  /** Fired when a source/citation chip is clicked — host navigates to the ref. */
  @Event() popCitationClick: EventEmitter<{ refId: string; index: number }>;
  @Event() popModelChanged: EventEmitter<string>;
  @Event() popModeChanged: EventEmitter<string>;
  @Event() popToolToggled: EventEmitter<{ id: string; enabled: boolean }>;

  private scrollAnchor: HTMLElement;
  private abortController: AbortController | null = null;

  componentWillLoad() {
    this.parseMessages();
    this.currentModel = this.selectedModel;
    this.currentMode = this.selectedMode;
    try { this.currentActiveTools = JSON.parse(this.activeTools); } catch { this.currentActiveTools = []; }
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  @Watch('messages')
  parseMessages() {
    try {
      const parsed = JSON.parse(this.messages);
      this.localMessages = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.localMessages = [];
    }
  }

  private scrollToBottom() {
    this.scrollAnchor?.scrollIntoView({ behavior: 'smooth' });
  }

  private async handleSend(detail: { text: string; files: File[] }) {
    const text = detail.text?.trim();
    if (!text || this.isStreaming) return;

    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    this.localMessages = [...this.localMessages, userMsg];
    this.isStreaming = true;
    this.streamingContent = '';

    this.popMessageSent.emit({
      text,
      sessionId: this.sessionId,
      model: this.currentModel,
      mode: this.currentMode,
      tools: this.currentActiveTools,
    });

    // In external-driver mode the host streams the reply (e.g. askBrain RAG);
    // the built-in SSE fetch is skipped. We still flip into the streaming state
    // so the typing bubble shows until the host calls beginAssistant/append/end.
    if (this.externalDriver) {
      this.streamingCitations = [];
      return;
    }

    await this.streamResponse(text);
  }

  // ── external driver (host-supplied streaming) ──────────────────────────────

  /** Host: start an assistant turn (shows the streaming bubble). */
  @Method()
  async beginAssistant() {
    this.streamingContent = '';
    this.streamingCitations = [];
    this.isStreaming = true;
  }

  /** Host: append a token to the in-flight assistant message. */
  @Method()
  async appendAssistantToken(token: string) {
    this.streamingContent = this.streamingContent + token;
  }

  /** Host: finalize the assistant turn with optional grounding citations. */
  @Method()
  async endAssistant(content?: string, citations?: AiCitation[]) {
    const finalContent = content ?? this.streamingContent;
    const msg: AiMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: finalContent,
      timestamp: Date.now(),
      citations: citations && citations.length ? citations : undefined,
    };
    this.localMessages = [...this.localMessages, msg];
    this.streamingContent = '';
    this.streamingCitations = [];
    this.isStreaming = false;
    this.popResponseComplete.emit({ content: finalContent, sessionId: this.sessionId });
  }

  private async streamResponse(_userText: string) {
    if (!this.endpoint) {
      this.isStreaming = false;
      this.popError.emit('No endpoint configured');
      return;
    }

    this.abortController = new AbortController();

    try {
      const history = this.localMessages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          messages: history,
          context: this.context || undefined,
          model: this.currentModel || undefined,
          mode: this.currentMode || undefined,
          tools: this.currentActiveTools.length ? this.currentActiveTools : undefined,
        }),
        signal: this.abortController.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;

          try {
            const event = JSON.parse(raw);
            if (event.error) throw new Error(event.error);
            if (event.token) {
              fullContent += event.token;
              this.streamingContent = fullContent;
            }
            if (event.done) {
              const assistantMsg: AiMessage = {
                id: event.assistantMsgId || `a-${Date.now()}`,
                role: 'assistant',
                content: fullContent,
                timestamp: Date.now(),
              };
              this.localMessages = [...this.localMessages, assistantMsg];
              this.streamingContent = '';
              this.isStreaming = false;
              this.popResponseComplete.emit({ content: fullContent, sessionId: this.sessionId });
              return;
            }
          } catch (parseErr) {
            // malformed line — skip
          }
        }
      }

      // Stream ended without done flag — commit whatever we have
      if (fullContent) {
        this.localMessages = [...this.localMessages, {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now(),
        }];
        this.popResponseComplete.emit({ content: fullContent, sessionId: this.sessionId });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        this.popError.emit(err?.message ?? 'Unknown error');
      }
    } finally {
      this.streamingContent = '';
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  @Method()
  async getMessages(): Promise<AiMessage[]> {
    return this.localMessages;
  }

  @Method()
  async sendMessage(text: string) {
    await this.handleSend({ text, files: [] });
  }

  @Method()
  async setInputValue(text: string) {
    const msgBox = this.el.querySelector('pop-message-box') as any;
    await msgBox?.setInputValue(text);
  }

  disconnectedCallback() {
    this.abortController?.abort();
  }

  /** Render the required Source chips for an assistant answer (RAG citations). */
  private renderCitations(citations?: AiCitation[]) {
    if (!citations || !citations.length) return null;
    return (
      <div class="aic-cites" aria-label="Sources">
        {citations.map(c => (
          <button
            type="button"
            class="aic-cite"
            key={`${c.refId}-${c.index}`}
            title={c.snippet || c.label}
            onClick={() => this.popCitationClick.emit({ refId: c.refId, index: c.index })}
          >
            <span class="aic-cite-num">{c.index}</span>
            <span class="aic-cite-label">{c.label}</span>
          </button>
        ))}
      </div>
    );
  }

  render() {
    const accentStyle = this.aiAccentColor
      ? ({ '--section-accent': this.aiAccentColor } as any)
      : undefined;

    return (
      <div class={{ 'aic-root': true, [`aic-layout--${this.layout}`]: true }} style={accentStyle}>
        {/* Message list */}
        <div class="aic-messages">
          {this.localMessages.length === 0 && !this.isStreaming && (
            <div class="aic-empty">Start a conversation&hellip;</div>
          )}

          {this.localMessages.map(msg => (
            <div key={msg.id} class="aic-msg">
              <pop-message-bubble
                role={msg.role === 'user' ? 'user' : 'assistant'}
                content={msg.content}
                message-id={msg.id}
                layout={this.layout}
                avatar-url={msg.role === 'user' ? this.userAvatarUrl : this.aiAvatarUrl}
                avatar-initials={msg.role === 'user' ? this.userInitials : (this.aiName?.[0] ?? 'A')}
                user-name={msg.role === 'user' ? '' : this.aiName}
                timestamp={msg.timestamp ?? 0}
                show-copy-button={msg.role === 'assistant'}
                streaming={false}
              />
              {this.renderCitations(msg.citations)}
            </div>
          ))}

          {/* Streaming bubble */}
          {this.isStreaming && (
            <div class="aic-msg">
              <pop-message-bubble
                role="assistant"
                content={this.streamingContent}
                layout={this.layout}
                streaming-mode={this.streamingMode}
                avatar-url={this.aiAvatarUrl}
                avatar-initials={this.aiName?.[0] ?? 'A'}
                user-name={this.aiName}
                streaming={true}
              />
              {this.renderCitations(this.streamingCitations)}
            </div>
          )}

          <div ref={el => this.scrollAnchor = el} />
        </div>

        {/* Input */}
        <div class="aic-input">
          <pop-message-box
            placeholder={this.placeholder}
            disabled={this.disabled || this.isStreaming}
            models={this.models}
            selected-model={this.selectedModel}
            selected-mode={this.selectedMode}
            tools={this.tools}
            active-tools={this.activeTools}
            show-mic-button={this.showMicButton}
            onSend={(e: CustomEvent) => this.handleSend(e.detail)}
            onPopModelChanged={(e: CustomEvent<string>) => {
              this.currentModel = e.detail;
              this.popModelChanged.emit(e.detail);
            }}
            onPopModeChanged={(e: CustomEvent<string>) => {
              this.currentMode = e.detail;
              this.popModeChanged.emit(e.detail);
            }}
            onPopToolToggled={(e: CustomEvent<any>) => {
              const { id, enabled } = e.detail;
              this.currentActiveTools = enabled
                ? [...this.currentActiveTools, id]
                : this.currentActiveTools.filter(t => t !== id);
              this.popToolToggled.emit(e.detail);
            }}
          >
            <slot name="toolbar-end" slot="toolbar-end" />
          </pop-message-box>
        </div>
      </div>
    );
  }
}
