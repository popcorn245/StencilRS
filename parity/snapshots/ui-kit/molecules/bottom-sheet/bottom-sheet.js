import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopBottomSheetStyle0 from "./ui-kit/molecules/bottom-sheet/bottom-sheet.css?tag=pop-bottom-sheet&encapsulation=scoped";
/** Drag dead-zone (px) before a press becomes a drag — a tap must not move the sheet. */
const DRAG_SLOP = 4;
const BottomSheet = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popClose = __stencil_createEvent(this, "popClose", 7);
    }
    get el() { return this; }
    open = false;
    sheetTitle;
    // dvh (dynamic viewport height) tracks the phone's real visible area as the
    // URL bar / keyboard come and go; vh does not, which let a tall sheet push its
    // action bar below the fold. The CSS carries an 85vh fallback for old engines
    // (an unsupported inline dvh value is ignored → the stylesheet wins).
    maxHeight = '85dvh';
    fullScreen = false;
    popClose;
    /** Live drag offset (px) while the user swipes the sheet down. 0 = at rest. */
    dragY = 0;
    /** True while a pointer drag is in progress (suppresses the snap transition). */
    dragging = false;
    startY = 0;
    lastY = 0;
    lastT = 0;
    velocity = 0; // px/ms, positive = downward
    sheetEl;
    pointerId = null;
    handleKeydown(ev) {
        if (ev.key === 'Escape' && this.open) {
            this.close();
        }
    }
    // The @Listen keydown above is Stencil-managed (auto-removed on teardown); only
    // the manually-added window pointer listeners below need explicit cleanup. If the
    // component unmounts mid-drag (route change / a swallowed pointerup), disconnect
    // pulls the three window listeners so the dead instance isn't held for the page
    // lifetime, and nulls the drag pointer so a stray late event is ignored.
    disconnectedCallback() {
        this.removeDragListeners();
        this.pointerId = null;
    }
    removeDragListeners() {
        window.removeEventListener('pointermove', this.onDragMove);
        window.removeEventListener('pointerup', this.onDragEnd);
        window.removeEventListener('pointercancel', this.onDragEnd);
    }
    close() {
        // Guard against a double close (e.g. Escape during an active drag closes the
        // sheet, then the eventual pointerup runs onDragEnd) so popClose emits once.
        if (!this.open)
            return;
        this.open = false;
        this.popClose.emit();
    }
    // ── drag-to-close (pointer-based, touch + mouse) ──
    // Grab the handle/title area and drag the sheet down; release past ~30% of the
    // sheet height (or with downward flick velocity) → close, else snap back.
    //
    // Standardized on the same robust drag shape as the hub tiles/rail/bar handles:
    //  · capture the pointer on the GRIP itself (currentTarget), not whichever child
    //    (handle bar / title) was pressed — capturing the child made routing flaky;
    //  · track on WINDOW listeners so a dropped capture / a node re-render mid-drag
    //    can't silently strand the gesture (the old element-bound moves did);
    //  · a SLOP dead-zone (DRAG_SLOP) before it starts translating, so a tap or a
    //    couple px of jitter never nudges the sheet ("finicky" fix).
    onDragStart = (ev) => {
        if (!this.open)
            return;
        // Ignore secondary buttons (right/middle click).
        if (ev.button !== undefined && ev.button > 0)
            return;
        this.pointerId = ev.pointerId;
        this.dragging = false; // true only once past the slop threshold
        this.startY = ev.clientY;
        this.lastY = ev.clientY;
        this.lastT = ev.timeStamp;
        this.velocity = 0;
        this.dragY = 0;
        try {
            ev.currentTarget.setPointerCapture?.(ev.pointerId);
        }
        catch { /* ignore */ }
        window.addEventListener('pointermove', this.onDragMove);
        window.addEventListener('pointerup', this.onDragEnd);
        window.addEventListener('pointercancel', this.onDragEnd);
    };
    onDragMove = (ev) => {
        if (this.pointerId === null || ev.pointerId !== this.pointerId)
            return;
        const dy = ev.clientY - this.startY;
        // Slop: ignore tiny jitter so a tap doesn't move the sheet.
        if (!this.dragging) {
            if (Math.abs(dy) < DRAG_SLOP)
                return;
            this.dragging = true;
        }
        // Only follow downward drags; clamp upward to 0.
        this.dragY = Math.max(0, dy);
        const dt = ev.timeStamp - this.lastT;
        if (dt > 0)
            this.velocity = (ev.clientY - this.lastY) / dt;
        this.lastY = ev.clientY;
        this.lastT = ev.timeStamp;
    };
    onDragEnd = (ev) => {
        if (this.pointerId === null || ev.pointerId !== this.pointerId)
            return;
        this.removeDragListeners();
        const wasDragging = this.dragging;
        // Decide BEFORE resetting the offset.
        const height = this.sheetEl?.getBoundingClientRect().height || window.innerHeight * 0.85;
        const past = this.dragY > height * 0.3;
        const flick = this.velocity > 0.5; // fast downward flick
        this.dragging = false;
        this.pointerId = null;
        this.dragY = 0;
        if (wasDragging && (past || flick))
            this.close();
    };
    render() {
        const sheetStyle = {};
        if (!this.fullScreen)
            sheetStyle.maxHeight = this.maxHeight;
        if (this.dragY > 0)
            sheetStyle.transform = `translateY(${this.dragY}px)`;
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: { 'bs-backdrop': true, 'bs-backdrop--open': this.open }, onClick: () => this.close() }),
            h("div", { key: '2', class: {
                    'bs-sheet': true,
                    'bs-sheet--open': this.open,
                    'bs-sheet--full': this.fullScreen,
                    'bs-sheet--dragging': this.dragging,
                }, ref: (el) => (this.sheetEl = el), style: sheetStyle },
                h("div", { key: '3', class: "bs-grip", onPointerDown: this.onDragStart },
                    h("div", { key: '4', class: "bs-handle" }),
                    this.sheetTitle && h("h2", { key: '5', class: "bs-title" }, this.sheetTitle)),
                h("div", { key: '6', class: "bs-body" },
                    h("slot", { key: '7' })),
                h("div", { key: '8', class: "bs-actions" },
                    h("slot", { key: '9', name: "actions" })))));
    }
    static get style() { return PopBottomSheetStyle0(); }
};
__stencil_defineCustomElement(BottomSheet, [774, "pop-bottom-sheet", {
        "open": [1540],
        "sheetTitle": [1, "sheet-title"],
        "maxHeight": [1, "max-height"],
        "fullScreen": [4, "full-screen"],
        "dragY": [32],
        "dragging": [32]
    }, [[8, "keydown", "handleKeydown"]]]);
//# sourceMappingURL=bottom-sheet.js.map