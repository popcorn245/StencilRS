import { Component, Prop, State, Event, EventEmitter, Watch, Method, h } from '@stencil/core';

export interface CafeteriaPanelAction {
  key: number;
  emoji: string;
  title: string;
  description: string;
}

@Component({
  tag: 'pop-cafeteria-panel',
  encapsulation: { type: 'scoped' },
  styleUrl: 'cafeteria-panel.css',
})
export class PopCafeteriaPanel {
  /** One-liner summary of the active NPC's request */
  @Prop() summary: string = '';
  /** Full paragraph description */
  @Prop() paragraph: string = '';
  /** NPC agent role (exploration, planning, codegen, orchestrator) */
  @Prop() agentRole: string = '';
  /** NPC ID for display */
  @Prop() npcId: string = '';
  /** Available food actions as JSON string (array of CafeteriaPanelAction) */
  @Prop() actions: string = '[]';
  /** Queue position (1-indexed) */
  @Prop() queuePosition: number = 0;
  /** Total queue size */
  @Prop() queueTotal: number = 0;
  /** Whether game is paused (panel expanded) */
  @Prop({ mutable: true, reflect: true }) paused: boolean = false;
  /** Review time in seconds */
  @Prop() reviewTime: number = 0;
  /** Whether there's an active NPC at the counter */
  @Prop() hasActiveNpc: boolean = false;

  @State() parsedActions: CafeteriaPanelAction[] = [];
  @State() chatText: string = '';
  @State() expanded: boolean = false;

  /** Fired when the user clicks an action card */
  @Event() actionSelected: EventEmitter<{ key: number }>;
  /** Fired when the user submits chat context */
  @Event() contextSubmitted: EventEmitter<{ text: string }>;
  /** Fired when user toggles the expanded/paused state */
  @Event() panelToggled: EventEmitter<{ expanded: boolean }>;
  /** Fired when user clicks Tab/cycle */
  @Event() cycleNpc: EventEmitter<void>;

  private chatInputEl?: HTMLTextAreaElement;

  @Watch('actions')
  parseActions() {
    try {
      this.parsedActions = JSON.parse(this.actions);
    } catch {
      this.parsedActions = [];
    }
  }

  componentWillLoad() {
    this.parseActions();
  }

  private handleActionClick(key: number) {
    this.actionSelected.emit({ key });
  }

  private handleChatSubmit() {
    const text = this.chatText.trim();
    if (!text) return;
    this.chatText = '';
    this.contextSubmitted.emit({ text });
  }

  private handleChatKeyDown(e: KeyboardEvent) {
    e.stopPropagation(); // prevent game from eating keys
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleChatSubmit();
    }
  }

  private toggleExpanded() {
    this.expanded = !this.expanded;
    this.paused = this.expanded;
    this.panelToggled.emit({ expanded: this.expanded });
  }

  private handleCycleClick() {
    this.cycleNpc.emit();
  }

  /** Public method to toggle expanded state (called from game) */
  @Method()
  async toggle(): Promise<any> {
    this.toggleExpanded();
  }

  /** Public method to set chat text (for autoplay typing animation) */
  @Method()
  async setChatText(text: string): Promise<any> {
    this.chatText = text;
  }

  /** Public method to focus the chat input */
  @Method()
  async focusChat(): Promise<any> {
    if (!this.expanded) {
      this.toggleExpanded();
    }
    this.chatInputEl?.focus();
  }

  private getRoleColor(role: string): string {
    switch (role) {
      case 'exploration': return '#3498db';
      case 'planning': return '#9b59b6';
      case 'codegen': return '#2ecc71';
      case 'orchestrator': return '#e67e22';
      default: return '#888';
    }
  }

  private getRoleLabel(role: string): string {
    switch (role) {
      case 'exploration': return 'Explorer';
      case 'planning': return 'Architect';
      case 'codegen': return 'Developer';
      case 'orchestrator': return 'Manager';
      default: return 'Agent';
    }
  }

  render() {
    if (!this.hasActiveNpc) {
      return (
        <div class="cp-empty">
          <span class="cp-empty-text">Waiting for agents to arrive at the counter...</span>
        </div>
      );
    }

    const roleColor = this.getRoleColor(this.agentRole);
    const roleLabel = this.getRoleLabel(this.agentRole);

    return (
      <div class={{ 'cp-container': true, 'cp-expanded': this.expanded }}>
        {/* Header bar -- always visible */}
        <div class="cp-header" onClick={() => this.toggleExpanded()}>
          <div class="cp-header-left">
            <span class="cp-role-dot" style={{ background: roleColor }}></span>
            <span class="cp-role-label">{roleLabel}</span>
            <span class="cp-npc-id">{this.npcId}</span>
            <span class="cp-queue-info">({this.queuePosition}/{this.queueTotal})</span>
            <button class="cp-cycle-btn" onClick={(e) => { e.stopPropagation(); this.handleCycleClick(); }} title="Next NPC (Tab)">
              Tab &rarr;
            </button>
          </div>
          <div class="cp-header-right">
            {this.expanded && this.reviewTime > 0 && (
              <span class="cp-review-timer">Review: {this.reviewTime}s</span>
            )}
            {this.expanded && <span class="cp-paused-badge">PAUSED</span>}
            <span class="cp-expand-hint">{this.expanded ? '\u25BC Close' : '\u25B2 Details [D]'}</span>
          </div>
        </div>

        {/* Summary -- always visible */}
        <div class="cp-summary">{this.summary}</div>

        {/* Expanded content */}
        {this.expanded && (
          <div class="cp-details">
            {/* Full paragraph */}
            {this.paragraph && (
              <div class="cp-paragraph">{this.paragraph}</div>
            )}

            {/* Action cards */}
            <div class="cp-actions">
              {this.parsedActions
                .filter(a => a.key !== 2) // "Add Context" is the chat input, not a card
                .map(action => (
                  <div class="cp-action-row" onClick={() => this.handleActionClick(action.key)}>
                    <span class="cp-action-emoji">{action.emoji}</span>
                    <span class="cp-action-key">{action.key}</span>
                    <span class="cp-action-title">{action.title}</span>
                    <span class="cp-action-desc">&mdash; {action.description}</span>
                  </div>
                ))
              }
            </div>

            {/* Always-visible chat input */}
            <div class="cp-chat">
              <textarea
                ref={el => this.chatInputEl = el}
                class="cp-chat-input"
                rows={2}
                placeholder="Add context... [Enter to send]"
                value={this.chatText}
                onInput={(e) => this.chatText = (e.target as HTMLTextAreaElement).value}
                onKeyDown={(e) => this.handleChatKeyDown(e)}
              ></textarea>
            </div>
          </div>
        )}
      </div>
    );
  }
}
