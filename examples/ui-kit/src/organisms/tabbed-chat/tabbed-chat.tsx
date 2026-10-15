import { Component, Prop, h, Event, EventEmitter, State, Watch, Element, Method } from '@stencil/core';

export interface ChatSession {
  id: string;
  label: string;
  messages?: string; // JSON AiMessage[]
}

@Component({
  tag: 'pop-tabbed-chat',
  encapsulation: { type: 'scoped' },
  styleUrl: 'tabbed-chat.css',
})
export class PopTabbedChat {
  @Element() el: HTMLElement;

  /** JSON string of ChatSession[] */
  @Prop() sessions: string = '[]';

  /** Currently active session ID */
  @Prop() activeSessionId: string = '';

  // pop-ai-chat forwarded props
  @Prop() endpoint: string = '';
  @Prop() context: string = '';
  @Prop() aiName: string = 'Assistant';
  @Prop() aiAvatarUrl: string = '';
  @Prop() aiAccentColor: string = '';
  @Prop() userAvatarUrl: string = '';
  @Prop() userInitials: string = '';
  @Prop() layout: 'bubble' | 'prose' = 'bubble';
  @Prop() streamingMode: 'inline' | 'dots' = 'inline';
  @Prop() placeholder: string = 'Message...';
  @Prop() showMicButton: boolean = false;
  @Prop() models: string = '[]';
  @Prop() selectedModel: string = '';
  @Prop() selectedMode: string = 'chat';
  @Prop() tools: string = '[]';
  @Prop() activeTools: string = '[]';

  @Event() popSessionSelected: EventEmitter<string>;
  @Event() popSessionCreated: EventEmitter<void>;
  @Event() popSessionDeleted: EventEmitter<string>;
  @Event() popMessageSent: EventEmitter<any>;
  @Event() popResponseComplete: EventEmitter<any>;
  @Event() popError: EventEmitter<string>;
  @Event() popModelChanged: EventEmitter<string>;
  @Event() popModeChanged: EventEmitter<string>;
  @Event() popToolToggled: EventEmitter<{ id: string; enabled: boolean }>;

  @State() parsedSessions: ChatSession[] = [];
  @State() currentSessionId: string = '';

  componentWillLoad() {
    this.parseSessions();
    this.currentSessionId = this.activeSessionId || this.parsedSessions[0]?.id || '';
  }

  @Watch('sessions')
  parseSessions() {
    try {
      const parsed = JSON.parse(this.sessions);
      this.parsedSessions = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.parsedSessions = [];
    }
  }

  @Watch('activeSessionId')
  onActiveSessionIdChange(val: string) {
    this.currentSessionId = val;
  }

  private selectSession(id: string) {
    this.currentSessionId = id;
    this.popSessionSelected.emit(id);
  }

  private deleteSession(e: MouseEvent, id: string) {
    e.stopPropagation();
    this.popSessionDeleted.emit(id);
  }

  private get activeSession(): ChatSession | undefined {
    return this.parsedSessions.find(s => s.id === this.currentSessionId);
  }

  @Method()
  async sendMessage(text: string): Promise<any> {
    const aiChat = this.el.querySelector('pop-ai-chat') as any;
    await aiChat?.sendMessage(text);
  }

  @Method()
  async setInputValue(text: string): Promise<any> {
    const aiChat = this.el.querySelector('pop-ai-chat') as any;
    await aiChat?.setInputValue(text);
  }

  render() {
    const active = this.activeSession;

    return (
      <div class="tc-root">
        {/* Tab bar */}
        <div class="tc-tabs" role="tablist">
          {this.parsedSessions.map(session => (
            <button
              key={session.id}
              class={{ 'tc-tab': true, 'tc-tab--active': session.id === this.currentSessionId }}
              role="tab"
              aria-selected={session.id === this.currentSessionId ? 'true' : 'false'}
              onClick={() => this.selectSession(session.id)}
            >
              <span class="tc-tab-label">{session.label}</span>
              <span
                class="tc-tab-close"
                title="Close session"
                onClick={(e: MouseEvent) => this.deleteSession(e, session.id)}
              >
                ×
              </span>
            </button>
          ))}

          <button class="tc-new-btn" title="New conversation" onClick={() => this.popSessionCreated.emit()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Active chat */}
        <div class="tc-body">
          {active ? (
            <pop-ai-chat
              key={active.id}
              endpoint={this.endpoint}
              context={this.context}
              session-id={active.id}
              messages={active.messages || '[]'}
              ai-name={this.aiName}
              ai-avatar-url={this.aiAvatarUrl}
              ai-accent-color={this.aiAccentColor}
              user-avatar-url={this.userAvatarUrl}
              user-initials={this.userInitials}
              layout={this.layout}
              streaming-mode={this.streamingMode}
              placeholder={this.placeholder}
              show-mic-button={this.showMicButton}
              models={this.models}
              selected-model={this.selectedModel}
              selected-mode={this.selectedMode}
              tools={this.tools}
              active-tools={this.activeTools}
              onPopMessageSent={(e: CustomEvent) => this.popMessageSent.emit(e.detail)}
              onPopResponseComplete={(e: CustomEvent) => this.popResponseComplete.emit(e.detail)}
              onPopError={(e: CustomEvent) => this.popError.emit(e.detail)}
              onPopModelChanged={(e: CustomEvent) => this.popModelChanged.emit(e.detail)}
              onPopModeChanged={(e: CustomEvent) => this.popModeChanged.emit(e.detail)}
              onPopToolToggled={(e: CustomEvent) => this.popToolToggled.emit(e.detail)}
            >
              <slot name="toolbar-end" slot="toolbar-end" />
            </pop-ai-chat>
          ) : (
            <div class="tc-empty">
              <p>No conversation selected.</p>
              <button class="tc-start-btn" onClick={() => this.popSessionCreated.emit()}>
                Start a new conversation
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
