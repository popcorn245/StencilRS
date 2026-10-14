import { Component, Prop, h, Event, EventEmitter, State, Element } from '@stencil/core';

@Component({
  tag: 'pop-chat',
  encapsulation: { type: 'scoped' },
  styleUrl: 'chat.css',
})
export class PopChat {
  /**
   * JSON string of messages. Array of { id, text, userDisplayName, userId, createdAt }
   */
  @Prop() messages: string = '[]';

  /**
   * The name of the channel to display
   */
  @Prop() channelName: string = 'Chat';

  /**
   * The ID of the current user (to align messages right)
   */
  @Prop() currentUserId: string = '';

  /**
   * Emitted when the user attempts to send a message
   */
  @Event() popMessageSent: EventEmitter<string>;

  /**
   * Emitted when a user wants to open a thread
   */
  @Event() popThreadOpened: EventEmitter<any>;

  /**
   * Emitted when the user clicks 'Login'
   */
  @Event() popLoginRequested: EventEmitter<void>;

  /**
   * Mode of the chat: 'channel' (default) or 'thread' (hides thread controls)
   */
  @Prop() mode: 'channel' | 'thread' = 'channel';
  @Prop() defaultSort: 'newest' | 'oldest' | 'popular' = 'oldest';

  @State() inputText: string = '';
  @State() sortOrder: 'newest' | 'oldest' | 'popular' = 'oldest';
  
  // ... (keeping other properties)

  private handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Infinite Scroll Trigger
      if (this.sortOrder === 'oldest') {
          // Standard: Load history at top
          // Use a threshold (e.g., 50px) to trigger before hitting hard top
          if (target.scrollTop <= 50) {
              this.popLoadHistory.emit();
          }
      } else if (this.sortOrder === 'newest') {
          // Reverse: Load history at bottom
          if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
              this.popLoadHistory.emit();
          }
      }
  };
  @State() showSortMenu: boolean = false;

  @Prop() messagePlaceholder: string = '';
  @Prop() guestPlaceholder: string = 'Please log in to chat';
  @Prop() loginButtonText: string = 'Login to Chat';


  
  /**
   * Whether to show a link to the full chat application in the header
   */
  @Prop() showFullChatLink: boolean = false;

  /**
   * The URL for the full chat link
   */
  @Prop() fullChatLink: string = '/chat';
  @Event() popMessageEdited: EventEmitter<{ id: string, text: string }>;

  /**
   * Emitted when a message is deleted
   */
  @Event() popMessageDeleted: EventEmitter<string>;

  
  // Auto-scroll State
  private wasAtBottom: boolean = true;
  private wasAtTop: boolean = true;
  private shouldForceScroll: boolean = false;
  private lastKnownMessageId: string | null = null;

  /**
   * Emitted when the user scrolls to the top of the history
   */
  @Event() popLoadHistory: EventEmitter<void>;

  @Element() el: HTMLElement;

  componentDidLoad() {
      this.sortOrder = this.defaultSort;
      const messagesContainer = this.el.querySelector('.messages');
      if (messagesContainer) {
          // Initial Scroll Position based on sort
          if (this.sortOrder === 'oldest') {
             messagesContainer.scrollTop = messagesContainer.scrollHeight; 
          } else {
             messagesContainer.scrollTop = 0;
          }
          messagesContainer.addEventListener('scroll', this.handleScroll);
      }
  }

  componentWillUpdate() {
      const container = this.el.querySelector('.messages');
      if (container) {
          // Check if at bottom (with threshold)
          this.wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
          this.wasAtTop = container.scrollTop <= 20;
          
          // Parse current messages to check for new ones
          let msgs: any[] = [];
          try {
              msgs = typeof this.messages === 'string' ? JSON.parse(this.messages) : this.messages;
          } catch(e) {}
          
          if (msgs.length > 0) {
              // Check for new message
              // Strategy depends on sort? No, "new" is "newly added to list".
              // But effectively we want to track if a new message arrived.
              // We'll peek at the "latest" based on time if possible, or just change in ID/Length.
              // Simplest: Check if the set of IDs changed or length increased. 
              // But we only have `lastKnownMessageId`.
              // Let's assume the "Unread" message is the one with highest createdAt.
              
              // We'll just rely on determining if *any* message is new.
              // For auto-scroll:
              // If sort=oldest (Standard): Scroll to bottom if I posted OR if I was at bottom.
              // If sort=newest (Reverse): Scroll to top if I posted OR if I was at top.
              
              // Find the "newest" message in the list
              const sortedByTime = [...msgs].sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0));
              const newestMsg = sortedByTime[sortedByTime.length - 1];

              if (newestMsg && newestMsg.id !== this.lastKnownMessageId) {
                  // New message detected
                  if (newestMsg.userId === this.currentUserId) {
                       this.shouldForceScroll = true;
                  }
                  this.lastKnownMessageId = newestMsg.id;
              }
          }
      }
  }

  componentDidUpdate() {
      const container = this.el.querySelector('.messages');
      if (container) {
          if (this.sortOrder === 'oldest') {
              if (this.shouldForceScroll || this.wasAtBottom) {
                  container.scrollTop = container.scrollHeight;
              }
          } else if (this.sortOrder === 'newest') {
              if (this.shouldForceScroll || this.wasAtTop) {
                  container.scrollTop = 0;
              }
          }
          // Popular: No auto-scroll usually?
          
          this.shouldForceScroll = false;
      }
  }

  disconnectedCallback() {
      const messagesContainer = this.el.querySelector('.messages');
      if (messagesContainer) {
          messagesContainer.removeEventListener('scroll', this.handleScroll);
      }
  }


  private sendMessage = () => {
    if (!this.currentUserId) {
        this.popLoginRequested.emit();
        return;
    }
    if (!this.inputText.trim()) return;
    this.popMessageSent.emit(this.inputText);
    this.inputText = '';
  };
  render() {
    let parsedMessages = [];
    try {
      if (typeof this.messages === 'string') {
          parsedMessages = JSON.parse(this.messages);
      } else {
          parsedMessages = this.messages;
      }
    } catch (e) {
      console.error('Invalid messages JSON', e);
    }

    const isThread = this.mode === 'thread';
    
    let finalMessages = [...parsedMessages];
    
    // Sort logic
    if (this.sortOrder === 'newest') {
        finalMessages.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (this.sortOrder === 'oldest') {
        finalMessages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else if (this.sortOrder === 'popular') {
        finalMessages.sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));
    }

    // Determine placeholder
    let placeholder = this.guestPlaceholder;
    if (this.currentUserId) {
        if (this.messagePlaceholder) {
            placeholder = this.messagePlaceholder;
        } else {
             placeholder = isThread ? 'Reply to thread...' : `Message ${this.channelName}`;
        }
    }

    return (
      <div class="chat-container">
        <header>
          <slot name="header-prefix"></slot>
          {this.channelName}
          <slot name="header-suffix"></slot>
          
          <div style={{marginLeft: 'auto', display: 'flex', gap: '8px', alignItems:'center'}}>
              {/* Sort Menu */}
              <div class="sort-menu-container" style={{position:'relative'}}>
                  <button 
                    class="header-action-btn sort-btn" 
                    onClick={() => this.showSortMenu = !this.showSortMenu}
                    title="Sort Messages"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512" style={{fill: 'currentColor'}}>
                        <path d="M472,168H40a24,24,0,0,1,0-48H472a24,24,0,0,1,0,48Z"/><path d="M392,280H120a24,24,0,0,1,0-48H392a24,24,0,0,1,0,48Z"/><path d="M296,392H216a24,24,0,0,1,0-48h80a24,24,0,0,1,0,48Z"/>
                     </svg>
                  </button>
                  {this.showSortMenu && (
                      <div class="sort-dropdown" style={{
                          position: 'absolute',
                          top: '100%',
                          right: '0',
                          background: '#2f3136',
                          border: '1px solid #202225',
                          borderRadius: '4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                          zIndex: '50',
                          marginTop: '4px',
                          minWidth: '150px'
                      }}>
                          <div class={{'sort-option': true, 'active': this.sortOrder === 'newest'}} onClick={() => { this.sortOrder = 'newest'; this.showSortMenu = false; }}>Newest First</div>
                          <div class={{'sort-option': true, 'active': this.sortOrder === 'oldest'}} onClick={() => { this.sortOrder = 'oldest'; this.showSortMenu = false; }}>Oldest First</div>
                          <div class={{'sort-option': true, 'active': this.sortOrder === 'popular'}} onClick={() => { this.sortOrder = 'popular'; this.showSortMenu = false; }}>Most Discussed</div>
                      </div>
                  )}
              </div>

              {this.showFullChatLink && (
                <a 
                    href={this.fullChatLink} 
                    target="_blank" 
                    class="header-action-btn full-chat-link" 
                    title="Open Full Chat"
                    style={{display: 'flex', alignItems: 'center', color: '#b9bbbe', textDecoration: 'none'}}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512" style={{fill: 'currentColor'}}>
                        <path d="M384,224v184a40,40,0,0,1-40,40H104a40,40,0,0,1-40-40V168a40,40,0,0,1,40-40H288" style={{fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round', strokeWidth:'32px'}}/>
                        <polyline points="336 64 448 64 448 176" style={{fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round', strokeWidth:'32px'}}/>
                        <line x1="224" y1="288" x2="440" y2="72" style={{fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round', strokeWidth:'32px'}}/>
                    </svg>
                </a>
              )}
          </div>
        </header>

        <div class="messages">
          {finalMessages.length === 0 ? (
            <div class="empty-state">No messages yet. Be the first!</div>
          ) : (
            finalMessages.map((msg: any) => (
              <pop-message
                key={msg.id}
                message={msg}
                currentUserId={this.currentUserId}
                isThread={isThread}
                onPopThreadOpened={(e) => this.popThreadOpened.emit(e.detail)}
                onPopMessageEdited={(e) => this.popMessageEdited.emit(e.detail)}
                onPopMessageDeleted={(e) => this.popMessageDeleted.emit(e.detail)}
              ></pop-message>
            ))
          )}
        </div>

                <footer>
                  {this.currentUserId ? (
                    <pop-message-box
                      placeholder={placeholder}
                      disabled={false}
                      onSend={(e: CustomEvent) => {
                           const detail = e.detail;
                           // Handle backward compatibility or object structure
                           this.inputText = typeof detail === 'string' ? detail : detail.text;
                           this.sendMessage();
                           (e.target as any).clear();
                      }}
                      onValueChange={(e: CustomEvent) => this.inputText = e.detail}
                    ></pop-message-box>
                  ) : (
                       <button class="login-prompt-btn" onClick={() => this.popLoginRequested.emit()}>
                          {this.loginButtonText}
                       </button>
                  )}
                </footer>
      </div>
    );
  }
}
