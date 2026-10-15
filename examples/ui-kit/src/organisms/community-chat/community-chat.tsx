import { Component, Prop, h, Event, EventEmitter, State, Element } from '@stencil/core';

@Component({
  tag: 'pop-community-chat',
  encapsulation: { type: 'scoped' },
  styleUrl: 'community-chat.css',
})
export class PopCommunityChat {
  @Element() el: HTMLElement;

  /** JSON string of message objects */
  @Prop() messages: string = '[]';

  @Prop() channelName: string = 'Chat';
  @Prop() currentUserId: string = '';
  @Prop() mode: 'channel' | 'thread' = 'channel';
  @Prop() defaultSort: 'newest' | 'oldest' | 'popular' = 'oldest';
  @Prop() messagePlaceholder: string = '';
  @Prop() guestPlaceholder: string = 'Please log in to chat';
  @Prop() loginButtonText: string = 'Login to Chat';
  @Prop() showFullChatLink: boolean = false;
  @Prop() fullChatLink: string = '/chat';

  @Event() popMessageSent: EventEmitter<string>;
  @Event() popThreadOpened: EventEmitter<any>;
  @Event() popLoginRequested: EventEmitter<void>;
  @Event() popMessageEdited: EventEmitter<{ id: string; text: string }>;
  @Event() popMessageDeleted: EventEmitter<string>;
  @Event() popLoadHistory: EventEmitter<void>;

  @State() inputText: string = '';
  @State() sortOrder: 'newest' | 'oldest' | 'popular' = 'oldest';
  @State() showSortMenu: boolean = false;

  private wasAtBottom: boolean = true;
  private wasAtTop: boolean = true;
  private shouldForceScroll: boolean = false;
  private lastKnownMessageId: string | null = null;

  componentDidLoad() {
    this.sortOrder = this.defaultSort;
    const container = this.el.querySelector('.cc-messages') as HTMLElement;
    if (container) {
      container.scrollTop = this.sortOrder === 'oldest' ? container.scrollHeight : 0;
      container.addEventListener('scroll', this.handleScroll);
    }
  }

  componentWillUpdate() {
    const container = this.el.querySelector('.cc-messages') as HTMLElement;
    if (!container) return;
    this.wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
    this.wasAtTop = container.scrollTop <= 20;

    let msgs: any[] = [];
    try { msgs = JSON.parse(this.messages); } catch { /* ok */ }
    if (msgs.length > 0) {
      const sorted = [...msgs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const newest = sorted[sorted.length - 1];
      if (newest && newest.id !== this.lastKnownMessageId) {
        if (newest.userId === this.currentUserId) this.shouldForceScroll = true;
        this.lastKnownMessageId = newest.id;
      }
    }
  }

  componentDidUpdate() {
    const container = this.el.querySelector('.cc-messages') as HTMLElement;
    if (!container) return;
    if (this.sortOrder === 'oldest' && (this.shouldForceScroll || this.wasAtBottom)) {
      container.scrollTop = container.scrollHeight;
    } else if (this.sortOrder === 'newest' && (this.shouldForceScroll || this.wasAtTop)) {
      container.scrollTop = 0;
    }
    this.shouldForceScroll = false;
  }

  disconnectedCallback() {
    const container = this.el.querySelector('.cc-messages');
    container?.removeEventListener('scroll', this.handleScroll);
  }

  private handleScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    if (this.sortOrder === 'oldest' && target.scrollTop <= 50) {
      this.popLoadHistory.emit();
    } else if (this.sortOrder === 'newest') {
      if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
        this.popLoadHistory.emit();
      }
    }
  };

  private sendMessage = () => {
    if (!this.currentUserId) { this.popLoginRequested.emit(); return; }
    if (!this.inputText.trim()) return;
    this.popMessageSent.emit(this.inputText);
    this.inputText = '';
  };

  private parsedMessages(): any[] {
    try {
      const raw = typeof this.messages === 'string' ? JSON.parse(this.messages) : this.messages;
      const arr = Array.isArray(raw) ? raw : [];
      if (this.sortOrder === 'newest') return [...arr].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (this.sortOrder === 'popular') return [...arr].sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));
      return [...arr].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } catch { return []; }
  }

  render() {
    const isThread = this.mode === 'thread';
    const msgs = this.parsedMessages();
    const placeholder = this.currentUserId
      ? (this.messagePlaceholder || (isThread ? 'Reply to thread...' : `Message ${this.channelName}`))
      : this.guestPlaceholder;

    return (
      <div class="cc-container">
        <header class="cc-header">
          <slot name="header-prefix" />
          <span class="cc-channel-name">{this.channelName}</span>
          <slot name="header-suffix" />

          <div class="cc-header-actions">
            {/* Sort menu */}
            <div class="cc-sort-wrap">
              <button class="cc-icon-btn" title="Sort" onClick={() => this.showSortMenu = !this.showSortMenu}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M472,168H40a24,24,0,0,1,0-48H472a24,24,0,0,1,0,48Z" />
                  <path d="M392,280H120a24,24,0,0,1,0-48H392a24,24,0,0,1,0,48Z" />
                  <path d="M296,392H216a24,24,0,0,1,0-48h80a24,24,0,0,1,0,48Z" />
                </svg>
              </button>
              {this.showSortMenu && (
                <div class="cc-sort-dropdown">
                  {(['oldest', 'newest', 'popular'] as const).map(s => (
                    <div
                      key={s}
                      class={{ 'cc-sort-option': true, 'cc-sort-option--active': this.sortOrder === s }}
                      onClick={() => { this.sortOrder = s; this.showSortMenu = false; }}
                    >
                      {s === 'oldest' ? 'Oldest First' : s === 'newest' ? 'Newest First' : 'Most Discussed'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {this.showFullChatLink && (
              <a href={this.fullChatLink} target="_blank" class="cc-icon-btn" title="Open full chat">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M384,224v184a40,40,0,0,1-40,40H104a40,40,0,0,1-40-40V168a40,40,0,0,1,40-40H288" />
                  <polyline points="336 64 448 64 448 176" />
                  <line x1="224" y1="288" x2="440" y2="72" />
                </svg>
              </a>
            )}
          </div>
        </header>

        <div class="cc-messages">
          {msgs.length === 0 ? (
            <div class="cc-empty">No messages yet. Be the first!</div>
          ) : (
            msgs.map((msg: any) => (
              <pop-message-bubble
                key={msg.id}
                role="member"
                content={msg.text || ''}
                message-id={msg.id}
                avatar-url={msg.userPhotoUrl || ''}
                avatar-initials={(msg.userDisplayName || '?').slice(0, 2)}
                user-name={msg.userDisplayName || 'Anonymous'}
                timestamp={msg.createdAt || 0}
                is-own={msg.userId === this.currentUserId}
                is-thread={isThread}
                thread-count={msg.replyCount || 0}
                thread-preview={msg.lastReplyText || ''}
                thread-avatar-url={msg.lastReplyUserPhotoUrl || ''}
                thread-last-at={msg.lastReplyAt || 0}
                onPopThreadOpened={(e: CustomEvent) => this.popThreadOpened.emit(e.detail)}
                onPopMessageEdited={(e: CustomEvent) => this.popMessageEdited.emit(e.detail)}
                onPopMessageDeleted={(e: CustomEvent) => this.popMessageDeleted.emit(e.detail)}
              />
            ))
          )}
        </div>

        <footer class="cc-footer">
          {this.currentUserId ? (
            <pop-message-box
              placeholder={placeholder}
              disabled={false}
              onSend={(e: CustomEvent) => {
                this.inputText = typeof e.detail === 'string' ? e.detail : e.detail.text;
                this.sendMessage();
                (e.target as any).clear?.();
              }}
              onValueChange={(e: CustomEvent) => this.inputText = e.detail}
            />
          ) : (
            <button class="cc-login-btn" onClick={() => this.popLoginRequested.emit()}>
              {this.loginButtonText}
            </button>
          )}
        </footer>
      </div>
    );
  }
}
