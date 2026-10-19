import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopRingMenuStyle0 from "./ui-kit/organisms/ring-menu/ring-menu.css?tag=pop-ring-menu&encapsulation=scoped";
export const PopRingMenu = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.actionSelected = __stencil_createEvent(this, "actionSelected", 7);
        this.micRecordingComplete = __stencil_createEvent(this, "micRecordingComplete", 7);
        this.micRecordingCancel = __stencil_createEvent(this, "micRecordingCancel", 7);
    }
    get el() { return this; }
    /**
     * JSON string of RingMenuItem array
     */
    items = '[]';
    /**
     * SVG string for the center button icon
     */
    centerIconSvg = '';
    /** Show a mic zone below the ring for voice memos */
    showMic = false;
    /**
     * Emitted when an action is selected
     */
    actionSelected;
    /** Emitted when mic recording is saved */
    micRecordingComplete;
    /** Emitted when mic recording is cancelled */
    micRecordingCancel;
    isOpen = false;
    isDragging = false;
    activeIndex = -1;
    holdingTimer = null;
    isHolding = false;
    thumbX = 0;
    thumbY = 0;
    micActive = false; // true when dragging downward toward mic
    // Mic zone state: 'idle' | 'countdown' | 'recording' | 'saved'
    micState = 'idle';
    countdownValue = 3;
    savedAudioBlob;
    parsedItems = [];
    centerX = 0;
    centerY = 0;
    dragThreshold = 30; // Min distance to start selecting
    countdownTimer;
    componentWillRender() {
        try {
            this.parsedItems = JSON.parse(this.items || '[]');
        }
        catch (e) {
            this.parsedItems = [];
        }
    }
    // Calculate angle between top (12 o'clock) and the point (x,y)
    // For a half circle pointing up, items are spread between roughly -80deg and 80deg
    getAngle(clientX, clientY) {
        const dx = clientX - this.centerX;
        const dy = clientY - this.centerY;
        // Math.atan2 gives angle from positive x-axis. 
        // We want 0 degrees to be straight up (negative Y)
        // So dx, -dy -> angle in radians from top
        let angleRef = Math.atan2(dx, -dy) * (180 / Math.PI);
        return angleRef;
    }
    getDistance(clientX, clientY) {
        const dx = clientX - this.centerX;
        const dy = clientY - this.centerY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    updateActiveItem(clientX, clientY) {
        if (this.parsedItems.length === 0)
            return;
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
        }
        else {
            this.activeIndex = -1;
            this.thumbX = dx;
            this.thumbY = dy;
        }
    }
    calculateCenter() {
        // get center of the button relative to viewport
        const btn = this.el.querySelector('.ring-btn-core');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            this.centerX = rect.left + rect.width / 2;
            this.centerY = rect.top + rect.height / 2;
        }
    }
    closeMenu() {
        this.isOpen = false;
        this.activeIndex = -1;
    }
    // --- INTERACTION HANDLERS ---
    handlePointerDown = (e) => {
        // Only respond to main button (left click or touch)
        if (e.button !== 0 && e.pointerType === 'mouse')
            return;
        e.preventDefault();
        this.calculateCenter();
        // Capture the pointer on the button itself so it continues to receive move events even if thumb moves off, 
        // which is more reliable than document listeners on touch.
        const target = e.currentTarget;
        if (target.setPointerCapture) {
            target.setPointerCapture(e.pointerId);
        }
        target.addEventListener('pointermove', this.handlePointerMove);
        target.addEventListener('pointerup', this.handlePointerUp);
        target.addEventListener('pointercancel', this.handlePointerUp);
        this.isHolding = true;
        this.holdingTimer = setTimeout(() => {
            // Long press triggered if we haven't started dragging
            if (this.isHolding && !this.isOpen) {
                this.isOpen = true;
            }
        }, 400); // 400ms to trigger ring menu holding glow
    };
    handlePointerMove = (e) => {
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
    };
    handlePointerUp = (e) => {
        // Clean up listeners
        clearTimeout(this.holdingTimer);
        const target = e.currentTarget;
        target.removeEventListener('pointermove', this.handlePointerMove);
        target.removeEventListener('pointerup', this.handlePointerUp);
        target.removeEventListener('pointercancel', this.handlePointerUp);
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
            }
            else {
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
            }
            else {
                // Did not select anything, just keep it open for manual taps
                this.activeIndex = -1;
            }
        }
    };
    handleItemClick(item) {
        if (this.isDragging)
            return; // Ignore click if we were dragging
        this.actionSelected.emit(item.action);
        this.closeMenu();
    }
    // ─── Mic zone ─────────────────────────────────────────────────────────────
    startMicCountdown() {
        if (this.micState !== 'idle')
            return;
        this.micState = 'countdown';
        this.countdownValue = 3;
        const tick = () => {
            if (this.micState !== 'countdown')
                return; // cancelled mid-tick
            this.countdownValue -= 1;
            if (this.countdownValue <= 0) {
                this.micState = 'recording';
            }
            else {
                this.countdownTimer = setTimeout(tick, 1000);
            }
        };
        this.countdownTimer = setTimeout(tick, 1000);
    }
    cancelMic() {
        clearTimeout(this.countdownTimer);
        this.countdownTimer = undefined;
        this.savedAudioBlob = undefined;
        this.micState = 'idle';
        this.countdownValue = 3;
        this.micRecordingCancel.emit();
    }
    onRecordingComplete(e) {
        this.savedAudioBlob = e.detail;
        this.micState = 'saved';
        this.micRecordingComplete.emit(e.detail);
    }
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
        }
        else if (this.activeIndex !== -1 && this.parsedItems[this.activeIndex]?.color) {
            glowColor = this.parsedItems[this.activeIndex].color;
            ringColor = this.parsedItems[this.activeIndex].color;
        }
        const isRecording = this.micState === 'recording' || this.micState === 'saved';
        return (h("div", { key: '0', class: { "ring-menu-container": true, "is-open": this.isOpen, "is-dragging": this.isDragging, "is-recording": this.micState !== 'idle' } },
            this.isOpen && (h("div", { key: '1', class: "ring-menu-backdrop", onClick: (e) => { e.stopPropagation(); this.closeMenu(); } })),
            h("div", { key: '2', class: "ring-menu-glow", style: {
                    '--ring-glow-color': glowColor,
                    ...(this.isOpen ? {
                        transform: `translate(calc(-50% + ${this.thumbX}px), calc(-50% + ${this.thumbY}px)) scale(1)`,
                        transition: (this.isDragging && this.activeIndex === -1) ? 'none' : ''
                    } : {})
                } }),
            h("div", { key: '3', class: "ring-menu-items-wrapper" }, this.parsedItems.map((item, i) => {
                const angleDeg = startAngle + (i * (range / Math.max(1, totalItems - 1)));
                const angleRad = (angleDeg - 90) * (Math.PI / 180); // -90 because 0 is right in trig, we want 0 is top
                // Calculate absolute offset
                const tx = Math.cos(angleRad) * radius;
                const ty = Math.sin(angleRad) * radius;
                const isActive = i === this.activeIndex;
                const itemColor = item.color || 'var(--pico-primary)';
                return (h("button", { class: { "ring-item": true, "is-active": isActive }, style: {
                        transform: this.isOpen ? `translate(${tx}px, ${ty}px) scale(${isActive ? 1.15 : 1})` : `translate(0px, 0px) scale(0)`,
                        transitionDelay: `${this.isOpen ? i * 30 : 0}ms`,
                        backgroundColor: itemColor,
                        boxShadow: isActive ? `0 0 20px ${itemColor}` : `0 4px 10px rgba(0,0,0,0.2)`
                    }, onClick: () => this.handleItemClick(item), onTouchEnd: (e) => {
                        e.preventDefault();
                        this.handleItemClick(item);
                    } },
                    item.iconSvg ? (h("div", { class: "ring-item-svg", innerHTML: item.iconSvg, style: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '24px', height: '24px', color: '#fff' } })) : (h("ion-icon", { name: item.icon, style: { color: '#fff', fontSize: '24px' } })),
                    h("span", { class: { "ring-item-label": true, "show-label": this.isOpen } }, item.label)));
            })),
            h("button", { key: '4', class: { "ring-btn-core": true, "is-holding": this.isHolding, "is-dragging-out": this.isDragging }, onPointerDown: this.handlePointerDown, style: {
                    '--drag-ring-color': ringColor,
                    transform: (this.isDragging || this.thumbX !== 0 || this.thumbY !== 0) ? `translate(${this.thumbX}px, ${this.thumbY}px) scale(${this.isHolding || this.isDragging ? 0.95 : 1})` : '',
                    transition: (this.isDragging && this.activeIndex === -1) ? 'none' : ''
                } },
                h("div", { key: '5', class: { "ring-btn-icon": true, "rotate-icon": this.isOpen && !this.isDragging } }, this.centerIconSvg ? (h("div", { class: "ring-center-svg", innerHTML: this.centerIconSvg, style: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '32px', height: '32px', color: '#fff' } })) : (h("ion-icon", { name: "add-outline", style: { fontSize: '32px' } }))),
                h("div", { key: '6', class: { "drag-thumb-ring": true, "is-visible": this.isDragging } })),
            this.showMic && this.isOpen && this.micState === 'idle' && (h("button", { key: '7', class: { 'mic-drag-hint': true, 'is-active': this.micActive }, type: "button", title: "Record voice memo", onClick: () => this.startMicCountdown() }, "\uD83C\uDFA4")),
            this.showMic && this.micState === 'countdown' && (h("div", { key: '8', class: "ring-countdown-center" },
                h("span", { key: '9', class: "ring-countdown-num" }, this.countdownValue),
                h("button", { key: 'a', class: "ring-rec-cancel", type: "button", onClick: () => this.cancelMic() }, "cancel"))),
            this.showMic && isRecording && (h("div", { key: 'b', class: "ring-recorder-area" },
                h("pop-voice-recorder", { key: 'c', mode: this.micState === 'saved' ? 'collapsed' : 'expanded', audioBlob: this.savedAudioBlob }),
                h("button", { key: 'd', class: "ring-rec-cancel", type: "button", onClick: () => this.cancelMic() }, "\u2715")))));
    }
    static get style() { return PopRingMenuStyle0(); }
};
__stencil_proxyCustomElement(PopRingMenu, [514, "pop-ring-menu", {
        "items": [1],
        "centerIconSvg": [1, "center-icon-svg"],
        "showMic": [4, "show-mic"],
        "isOpen": [32],
        "isDragging": [32],
        "activeIndex": [32],
        "holdingTimer": [32],
        "isHolding": [32],
        "thumbX": [32],
        "thumbY": [32],
        "micActive": [32],
        "micState": [32],
        "countdownValue": [32],
        "savedAudioBlob": [32]
    }, [[0, "recordingComplete", "onRecordingComplete"], [0, "recordingCancel", "onRecordingCancel"]]]);
//# sourceMappingURL=ring-menu.js.map