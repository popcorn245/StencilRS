import { Component, h, Prop, State, Event, EventEmitter, Element, Listen } from '@stencil/core';

export interface RingMenuItem {
  icon: string;
  label: string;
  action: string;
  color?: string;
}

@Component({
  tag: 'pop-ring-menu',
  encapsulation: { type: 'scoped' },
  styleUrl: 'ring-menu.css',
  // We'll use scoped to allow global SVG/Icon usage easily if needed
})
export class PopRingMenu {
  @Element() el: HTMLElement;

  /**
   * JSON string of RingMenuItem array
   */
  @Prop() items: string = '[]';

  /**
   * SVG string for the center button icon
   */
  @Prop() centerIconSvg: string = '';

  /** Show a mic zone below the ring for voice memos */
  @Prop() showMic: boolean = false;

  /**
   * Emitted when an action is selected
   */
  @Event({
    eventName: 'actionSelected',
    composed: true,
    bubbles: true,
  }) actionSelected: EventEmitter<string>;

  /** Emitted when mic recording is saved */
  @Event({ composed: true, bubbles: true }) micRecordingComplete: EventEmitter<Blob>;

  /** Emitted when mic recording is cancelled */
  @Event({ composed: true, bubbles: true }) micRecordingCancel: EventEmitter<void>;

  @State() isOpen: boolean = false;
  @State() isDragging: boolean = false;
  @State() activeIndex: number = -1;
  @State() holdingTimer: any = null;
  @State() isHolding: boolean = false;
  @State() thumbX: number = 0;
  @State() thumbY: number = 0;
  @State() micActive: boolean = false; // true when dragging downward toward mic

  // Mic zone state: 'idle' | 'countdown' | 'recording' | 'saved'
  @State() micState: 'idle' | 'countdown' | 'recording' | 'saved' = 'idle';
  @State() countdownValue: number = 3;
  @State() savedAudioBlob?: Blob;

  private parsedItems: RingMenuItem[] = [];
  private centerX: number = 0;
  private centerY: number = 0;
  private dragThreshold: number = 30; // Min distance to start selecting
  private countdownTimer?: any;
  

  componentWillRender() {
    try {
      this.parsedItems = JSON.parse(this.items || '[]');
    } catch (e) {
      this.parsedItems = [];
    }
  }



  // Calculate angle between top (12 o'clock) and the point (x,y)
  // For a half circle pointing up, items are spread between roughly -80deg and 80deg
  private getAngle(clientX: number, clientY: number): number {
    const dx = clientX - this.centerX;
    const dy = clientY - this.centerY;
    // Math.atan2 gives angle from positive x-axis. 
    // We want 0 degrees to be straight up (negative Y)
    // So dx, -dy -> angle in radians from top
    let angleRef = Math.atan2(dx, -dy) * (180 / Math.PI);
    return angleRef;
  }

  private getDistance(clientX: number, clientY: number): number {
    const dx = clientX - this.centerX;
    const dy = clientY - this.centerY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private updateActiveItem(clientX: number, clientY: number) {
    if (this.parsedItems.length === 0) return;

    let dx = clientX - this.centerX;
    let dy = clientY - this.centerY;
    const dist = this.getDistance(clientX, clientY);

    // Max drag radius so thumb doesn't go indefinitely far
    const maxRadius = 90;
    if (dist > maxRadius) {
       dx = (dx / dist) * maxRadius;
       dy = (dy / dist) * maxRadius;
    }

    if (dist < this.dragThreshold) {
      this.activeIndex = -1;
      this.micActive = false;
      this.thumbX = dx;
      this.thumbY = dy;
      return;
    }

    const angle = this.getAngle(clientX, clientY);

    // Downward drag → activate mic (angle near ±180° means pointing down)
    if (this.showMic && Math.abs(angle) > 130) {
      this.micActive = true;
      this.activeIndex = -1;
      this.thumbX = Math.max(-20, Math.min(20, dx)); // limit horizontal drift
      this.thumbY = Math.min(maxRadius, Math.max(0, clientY - this.centerY)); // only positive (downward)
      return;
    }
    this.micActive = false;
    
    const totalItems = this.parsedItems.length;
    let range = 160;
    if (totalItems > 3) {
      range = Math.min(220, 160 + (totalItems - 3) * 30);
    }
    const startAngle = -range / 2;
    
    // Find closest item logically
    let closestIdx = -1;
    let minDifference = 999;

    for (let i = 0; i < this.parsedItems.length; i++) {
        const itemAngle = startAngle + (i * (range / Math.max(1, this.parsedItems.length - 1)));
        const diff = Math.abs(angle - itemAngle);
        if (diff < minDifference) {
            minDifference = diff;
            closestIdx = i;
        }
    }

    if (closestIdx !== -1 && minDifference < 45) { // Snapping threshold
      this.activeIndex = closestIdx;
      // Snap thumb to the exact position of the item
      const snapAngleDeg = startAngle + (closestIdx * (range / Math.max(1, this.parsedItems.length - 1)));
      const snapAngleRad = (snapAngleDeg - 90) * (Math.PI / 180);
      this.thumbX = Math.cos(snapAngleRad) * maxRadius;
      this.thumbY = Math.sin(snapAngleRad) * maxRadius;
    } else {
      this.activeIndex = -1;
      this.thumbX = dx;
      this.thumbY = dy;
    }
  }

  private calculateCenter() {
    // get center of the button relative to viewport
    const btn = this.el.querySelector('.ring-btn-core') as HTMLElement;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
    }
  }

  private closeMenu() {
    this.isOpen = false;
    this.activeIndex = -1;
  }

  // --- INTERACTION HANDLERS ---

  private handlePointerDown = (e: PointerEvent) => {
    // Only respond to main button (left click or touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.preventDefault();
    this.calculateCenter();

    // Capture the pointer on the button itself so it continues to receive move events even if thumb moves off, 
    // which is more reliable than document listeners on touch.
    const target = e.currentTarget as HTMLElement;
    if (target.setPointerCapture) {
      target.setPointerCapture(e.pointerId);
    }

    target.addEventListener('pointermove', this.handlePointerMove as EventListener);
    target.addEventListener('pointerup', this.handlePointerUp as EventListener);
    target.addEventListener('pointercancel', this.handlePointerUp as EventListener);

    this.isHolding = true;

    this.holdingTimer = setTimeout(() => {
       // Long press triggered if we haven't started dragging
       if (this.isHolding && !this.isOpen) {
         this.isOpen = true;
       }
    }, 400); // 400ms to trigger ring menu holding glow
  }

  private handlePointerMove = (e: PointerEvent) => {
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (this.isHolding || this.isDragging) {
        const dist = this.getDistance(clientX, clientY);
        
        // If they start moving significantly, switch to drag mode
        if (!this.isDragging && dist > 15) {
            clearTimeout(this.holdingTimer);
            this.isHolding = false;
            this.isOpen = true;
            this.isDragging = true;
        }
    }

    if (this.isDragging) {
        e.preventDefault();
        this.updateActiveItem(clientX, clientY);
    }
  }

  private handlePointerUp = (e: PointerEvent) => {
    // Clean up listeners
    clearTimeout(this.holdingTimer);
    const target = e.currentTarget as HTMLElement;
    target.removeEventListener('pointermove', this.handlePointerMove as EventListener);
    target.removeEventListener('pointerup', this.handlePointerUp as EventListener);
    target.removeEventListener('pointercancel', this.handlePointerUp as EventListener);
    
    if (target.releasePointerCapture) {
        target.releasePointerCapture(e.pointerId);
    }

    this.thumbX = 0;
    this.thumbY = 0;

    if (this.isHolding) {
       // Was a tap!
       this.isHolding = false;
       if (!this.isOpen) {
         this.isOpen = true;
       } else {
         this.closeMenu();
       }
       return;
    }

    if (this.isDragging) {
      // Finished a drag interaction
      this.isDragging = false;

      // Downward drag → trigger mic recording
      if (this.micActive) {
        this.micActive = false;
        this.startMicCountdown(); // ring stays open to show mic zone
        return;
      }

      if (this.activeIndex !== -1) {
        const action = this.parsedItems[this.activeIndex].action;
        this.actionSelected.emit(action);
        // Reset and close after selection
        setTimeout(() => {
           this.closeMenu();
        }, 150);
      } else {
        // Did not select anything, just keep it open for manual taps
        this.activeIndex = -1;
      }
    }
  }



  private handleItemClick(item: RingMenuItem) {
    if (this.isDragging) return; // Ignore click if we were dragging
    this.actionSelected.emit(item.action);
    this.closeMenu();
  }

  // ─── Mic zone ─────────────────────────────────────────────────────────────

  private startMicCountdown() {
    if (this.micState !== 'idle') return;
    this.micState = 'countdown';
    this.countdownValue = 3;
    const tick = () => {
      if (this.micState !== 'countdown') return; // cancelled mid-tick
      this.countdownValue -= 1;
      if (this.countdownValue <= 0) {
        this.micState = 'recording';
      } else {
        this.countdownTimer = setTimeout(tick, 1000);
      }
    };
    this.countdownTimer = setTimeout(tick, 1000);
  }

  private cancelMic() {
    clearTimeout(this.countdownTimer);
    this.countdownTimer = undefined;
    this.savedAudioBlob = undefined;
    this.micState = 'idle';
    this.countdownValue = 3;
    this.micRecordingCancel.emit();
  }

  @Listen('recordingComplete')
  onRecordingComplete(e: CustomEvent<Blob>) {
    this.savedAudioBlob = e.detail;
    this.micState = 'saved';
    this.micRecordingComplete.emit(e.detail);
  }

  @Listen('recordingCancel')
  onRecordingCancel() {
    this.savedAudioBlob = undefined;
    this.micState = 'idle';
    this.micRecordingCancel.emit();
  }

  disconnectedCallback() {
    clearTimeout(this.countdownTimer);
  }

  render() {
    const totalItems = this.parsedItems.length;
    let range = 160;
    if (totalItems > 3) {
      range = Math.min(220, 160 + (totalItems - 3) * 30);
    }
    const startAngle = -range / 2;
    
    // radius of the ring
    const radius = 90;

    // Calculate the current glow color based on the selected item
    let glowColor = 'var(--pico-primary)';
    let ringColor = '#ffffff';
    if (this.micActive) {
      glowColor = '#a855f7';
      ringColor = '#a855f7';
    } else if (this.activeIndex !== -1 && this.parsedItems[this.activeIndex]?.color) {
      glowColor = this.parsedItems[this.activeIndex].color;
      ringColor = this.parsedItems[this.activeIndex].color;
    }

    const isRecording = this.micState === 'recording' || this.micState === 'saved';

    return (
      <div class={{"ring-menu-container": true, "is-open": this.isOpen, "is-dragging": this.isDragging, "is-recording": this.micState !== 'idle'}}>
        
        {/* The backdrop prevents underlying clicks when menu is open */}
        {this.isOpen && (
           <div class="ring-menu-backdrop" onClick={(e) => { e.stopPropagation(); this.closeMenu(); }}></div>
        )}

        <div class="ring-menu-glow" style={{
           '--ring-glow-color': glowColor,
           ...(this.isOpen ? {
              transform: `translate(calc(-50% + ${this.thumbX}px), calc(-50% + ${this.thumbY}px)) scale(1)`,
              transition: (this.isDragging && this.activeIndex === -1) ? 'none' : ''
           } : {})
        } as any}></div>

        <div class="ring-menu-items-wrapper">
           {this.parsedItems.map((item, i) => {
             const angleDeg = startAngle + (i * (range / Math.max(1, totalItems - 1)));
             const angleRad = (angleDeg - 90) * (Math.PI / 180); // -90 because 0 is right in trig, we want 0 is top
             
             // Calculate absolute offset
             const tx = Math.cos(angleRad) * radius;
             const ty = Math.sin(angleRad) * radius;
             
             const isActive = i === this.activeIndex;
             
             const itemColor = item.color || 'var(--pico-primary)';

             return (
                 <button 
                   class={{"ring-item": true, "is-active": isActive}}
                   style={{
                      transform: this.isOpen ? `translate(${tx}px, ${ty}px) scale(${isActive ? 1.15 : 1})` : `translate(0px, 0px) scale(0)`,
                      transitionDelay: `${this.isOpen ? i * 30 : 0}ms`,
                      backgroundColor: itemColor,
                      boxShadow: isActive ? `0 0 20px ${itemColor}` : `0 4px 10px rgba(0,0,0,0.2)`
                   }}
                   onClick={() => this.handleItemClick(item)}
                   onTouchEnd={(e) => {
                     e.preventDefault();
                     this.handleItemClick(item);
                   }}
                 >
                    {(item as any).iconSvg ? (
                      <div class="ring-item-svg" innerHTML={(item as any).iconSvg} style={{display: 'flex', justifyContent: 'center', alignItems:'center', width: '24px', height: '24px', color: '#fff'}}></div>
                    ) : (
                      <ion-icon name={item.icon} style={{color: '#fff', fontSize: '24px'}}></ion-icon>
                    )}
                    
                    {/* Optional Label */}
                    <span class={{"ring-item-label": true, "show-label": this.isOpen}}>{item.label}</span>
                 </button>
             );
           })}
        </div>

        <button
            class={{"ring-btn-core": true, "is-holding": this.isHolding, "is-dragging-out": this.isDragging}}
            onPointerDown={this.handlePointerDown}
            style={{
               '--drag-ring-color': ringColor,
               transform: (this.isDragging || this.thumbX !== 0 || this.thumbY !== 0) ? `translate(${this.thumbX}px, ${this.thumbY}px) scale(${this.isHolding || this.isDragging ? 0.95 : 1})` : '',
               transition: (this.isDragging && this.activeIndex === -1) ? 'none' : ''
            } as any}
        >
            <div class={{"ring-btn-icon": true, "rotate-icon": this.isOpen && !this.isDragging}}>
               {this.centerIconSvg ? (
                 <div class="ring-center-svg" innerHTML={this.centerIconSvg} style={{display: 'flex', justifyContent: 'center', alignItems:'center', width: '32px', height: '32px', color: '#fff'}}></div>
               ) : (
                 <ion-icon name="add-outline" style={{fontSize: '32px'}}></ion-icon>
               )}
            </div>

            {/* The drag thumb ring indicator */}
            <div class={{ "drag-thumb-ring": true, "is-visible": this.isDragging }}></div>
        </button>

        {/* ── Mic drag hint — idle tap/drag affordance ─────────────── */}
        {this.showMic && this.isOpen && this.micState === 'idle' && (
          <button
            class={{'mic-drag-hint': true, 'is-active': this.micActive}}
            type="button"
            title="Record voice memo"
            onClick={() => this.startMicCountdown()}
          >🎤</button>
        )}

        {/* ── Countdown: floats in the center of the ring ──────────── */}
        {this.showMic && this.micState === 'countdown' && (
          <div class="ring-countdown-center">
            <span class="ring-countdown-num">{this.countdownValue}</span>
            <button class="ring-rec-cancel" type="button" onClick={() => this.cancelMic()}>cancel</button>
          </div>
        )}

        {/* ── Recorder: above the ring options ─────────────────────── */}
        {this.showMic && isRecording && (
          <div class="ring-recorder-area">
            <pop-voice-recorder
              mode={this.micState === 'saved' ? 'collapsed' : 'expanded'}
              audioBlob={this.savedAudioBlob}
            />
            <button class="ring-rec-cancel" type="button" onClick={() => this.cancelMic()}>✕</button>
          </div>
        )}

      </div>
    );
  }
}
