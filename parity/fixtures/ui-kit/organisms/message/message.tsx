import { Component, Prop, h, Event, EventEmitter, State, Watch } from '@stencil/core';

@Component({
  tag: 'pop-message',
  encapsulation: { type: 'scoped' },
  styleUrl: 'message.css',
  // Keeping false for now to inherit global styles if any, or easier migration
})
export class PopMessage {
  /**
   * The message object (serialized or object)
   */
  @Prop() message: string | any = {};

  /**
   * The current user's ID
   */
  @Prop() currentUserId: string = '';

  /**
   * Whether this message is displayed inside a thread view (hides thread actions, changes context)
   */
  @Prop() isThread: boolean = false;

  /**
   * Whether the current user has admin privileges (allows deleting any message)
   */
  @Prop() isAdmin: boolean = false;

  /**
   * Emitted when a user wants to open a thread
   */
  @Event() popThreadOpened: EventEmitter<any>;

  /**
   * Emitted when a message is edited
   */
  @Event() popMessageEdited: EventEmitter<{ id: string, text: string }>;

  /**
   * Emitted when a message is deleted
   */
  @Event() popMessageDeleted: EventEmitter<string>;

  @State() innerMessage: any = {};
  @State() editing: boolean = false;
  @State() editInputText: string = '';

  componentWillLoad() {
    this.parseMessage();
  }

  @Watch('message')
  parseMessage() {
    try {
      let msg: any = {};
      if (typeof this.message === 'string') {
        msg = JSON.parse(this.message);
      } else {
        msg = this.message || {};
      }

      // Helper to normalize dates
      const normalize = (date: any) => {
          if (!date) return null;
          if (typeof date === 'number' || typeof date === 'string') return date;
          // Firestore Timestamp (object or instance)
          if (typeof date.toMillis === 'function') return date.toMillis();
          if ('seconds' in date) return date.seconds * 1000;
          return date; 
      };

      if (msg.createdAt) msg.createdAt = normalize(msg.createdAt);
      if (msg.lastReplyAt) msg.lastReplyAt = normalize(msg.lastReplyAt);

      this.innerMessage = msg;
    } catch (e) {
      console.error('PopMessage: Invalid message prop', e);
      this.innerMessage = {};
    }
  }

  private handleEditClick = () => {
      // Just in case
      if (this.currentUserId !== this.innerMessage.userId) return;
      this.editing = true;
      this.editInputText = this.innerMessage.text;
  };

  private handleCancelEdit = () => {
      this.editing = false;
      this.editInputText = '';
  };

  private handleSaveEdit = () => {
      if (!this.editInputText.trim()) return;
      this.popMessageEdited.emit({ id: this.innerMessage.id, text: this.editInputText });
      this.editing = false;
  };

  private handleDeleteClick = () => {
      if (confirm("Are you sure you want to delete this message?")) {
          this.popMessageDeleted.emit(this.innerMessage.id);
      }
  };

  private formatRelativeTime(dateInput: string | number) {
      if (!dateInput) return '';
      const date = new Date(dateInput);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days > 1) return date.toLocaleDateString();
      if (days === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (now.getDate() !== date.getDate()) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  private formatShortRelativeTime(dateInput: string | number) {
       if (!dateInput) return '';
       const date = new Date(dateInput);
       const now = new Date();
       const diff = (now.getTime() - date.getTime()) / 1000; // seconds
       
       if (diff < 60) return 'Just now';
       if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
       if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
       if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
       return date.toLocaleDateString();
  }

  render() {
    const msg = this.innerMessage;
    const isOwner = msg.userId === this.currentUserId;

    return (
      <div
        class={{
          'message': true,
          'mine': isOwner,
          'editing': this.editing
        }}
        key={msg.id}
      >
        <div class="message-avatar">
            <img 
                src={msg.userPhotoUrl || 'https://via.placeholder.com/40'} 
                alt="Avatar" 
                style={{width: '100%', height:'100%', borderRadius:'50%', objectFit:'cover'}}
                onError={(e:any) => {e.target.onerror=null; e.target.src=`https://ui-avatars.com/api/?name=${msg.userDisplayName||'?'}&background=random`}} 
            />
        </div>
        <div class="message-content-wrapper">
            <div class="message-header">
                <span class="message-meta">{msg.userDisplayName || 'Anonymous'}</span>
                {msg.createdAt && <span class="message-time">{this.formatRelativeTime(msg.createdAt)}</span>}
            </div>
            
            {/* Render Edit Mode or Text */}
            {this.editing ? (
                <div class="edit-mode">
                        <textarea 
                        class="edit-textarea"
                        value={this.editInputText}
                        onInput={(e: any) => this.editInputText = e.target.value}
                        onKeyDown={(e: KeyboardEvent) => {
                            if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSaveEdit(); }
                            if(e.key === 'Escape') this.handleCancelEdit();
                        }}
                        ></textarea>
                        <div class="edit-controls">
                            <span class="edit-hint">escape to cancel • enter to save</span>
                            <div class="edit-buttons">
                                <button class="save-edit-btn" onClick={() => this.handleSaveEdit()}>Save</button>
                                <button class="cancel-edit-btn" onClick={this.handleCancelEdit}>Cancel</button>
                            </div>
                        </div>
                </div>
            ) : (
                <div class="message-text">
                    {msg.imageUrl && (
                        <img src={msg.imageUrl} style={{maxWidth:'300px', maxHeight:'300px', borderRadius:'4px', display:'block', marginBottom:'8px'}} />
                    )}
                    {msg.text}
                </div>
            )}
            
            {!this.isThread && msg.replyCount > 0 && !this.editing && (
                <div class="thread-summary" onClick={() => this.popThreadOpened.emit(msg)}>
                    <div class="thread-spine"></div>
                    
                    <div class="thread-info">
                        <div style={{display:'flex', alignItems:'center', gap:'8px', overflow:'hidden', maxWidth:'250px'}}> 
                            <img src={msg.lastReplyUserPhotoUrl || 'https://via.placeholder.com/16'} style={{width:'16px', height:'16px', borderRadius:'50%', objectFit:'cover'}} />
                            <span style={{fontSize:'0.85em', color:'#b9bbbe', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:'500'}}>{msg.lastReplyText || 'Thread reply...'}</span>
                        </div>
                        
                        {msg.lastReplyAt && (
                        <span style={{fontSize: '0.75em', color: '#72767d', marginLeft: '4px', whiteSpace: 'nowrap'}}>
                            {this.formatShortRelativeTime(msg.lastReplyAt)}
                        </span>
                        )}
                    </div>
                </div>
            )}
        </div>
        
        {/* Actions (hover) */}
        {!this.editing && (
        <div 
            class={{
                'message-actions-container': true,
                'has-thread': msg.replyCount > 0
            }}
        >
            {/* Thread Button (Only if not already in thread mode) */}
            {!this.isThread && (
            <button 
                class={{
                    'thread-btn': true,
                    'action-btn': true,
                    'thread-visible': msg.replyCount > 0
                }} 
                onClick={() => this.popThreadOpened.emit(msg)} 
                title={msg.replyCount ? "View Thread" : "Start Thread"}
            >
                <div style={{display:'flex'}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512" style={{fill: 'currentColor'}}><path d="M448,440a16,16,0,0,1-12.61-6.15c-22.86-29.27-44.07-51.86-73.32-67C335,352.88,301,345.59,256,344.23V424A16,16,0,0,1,229,435.57l-176-168a16,16,0,0,1,0-23.14l176-168A16,16,0,0,1,256,88v80.36c74.14,3.41,129.38,30.91,164.35,81.87C449.32,292.44,464,350.9,464,424a16,16,0,0,1-16,16Z"/></svg>
                </div>
                {msg.replyCount > 0 && (
                <div style={{position: 'absolute', top: '-4px', right: '-6px', background: '#5865f2', color: 'white', fontSize: '0.65em', fontWeight: 'bold', padding: '1px 4px', borderRadius: '8px', minWidth: '14px', textAlign: 'center', border: '2px solid #2f3136', lineHeight: '1'}}>
                    {msg.replyCount}
                </div>
                )}
            </button>
            )}

            {/* Edit/Delete Buttons (Owner edits, Owner or Admin deletes) */}
            {(isOwner || this.isAdmin) && (
                [
                    isOwner && (
                    <button 
                        class="action-btn edit-btn" 
                        title="Edit" 
                        onClick={this.handleEditClick}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512"><polygon points="358.62 129.28 86.49 402.08 70 442 109.92 425.51 382.72 153.38 358.62 129.28" style={{fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round', strokeWidth:'44px'}}/><path d="M413.07,74.84,401.28,86.62l24.1,24.1,11.79-11.79a16.51,16.51,0,0,0,0-23.34l-.75-.75A16.51,16.51,0,0,0,413.07,74.84Z" style={{fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round', strokeWidth:'44px'}}/></svg>
                    </button>
                    ),
                    <button 
                        class="action-btn delete-btn" 
                        title="Delete" 
                        onClick={this.handleDeleteClick}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512" style={{fill: 'currentColor'}}><path d="M296,64H216a7.91,7.91,0,0,0-8,8V96h96V72A7.91,7.91,0,0,0,296,64Z"/><path d="M432,96H336V72a40,40,0,0,0-40-40H216a40,40,0,0,0-40,40V96H80a16,16,0,0,0,0,32H97L116,432.92c1.42,26.85,22,47.08,48,47.08H348c26.13,0,46.3-19.78,48-47L415,128h17a16,16,0,0,0,0-32ZM192.57,416H192a16,16,0,0,1-16-15.43l-8-224a16,16,0,1,1,32-1.14l8,224A16,16,0,0,1,192.57,416ZM272,400a16,16,0,0,1-32,0V176a16,16,0,0,1,32,0ZM304,96H208V72a7.91,7.91,0,0,1,8-8h80a7.91,7.91,0,0,1,8,8Zm32,304.57A16,16,0,0,1,320,416h-.58A16,16,0,0,1,304,399.43l8-224a16,16,0,1,1,32,1.14Z"/></svg>
                    </button>
                ]
            )}
        </div>
        )}
      </div>
    );
  }
}
