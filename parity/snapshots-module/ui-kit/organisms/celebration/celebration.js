import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopCelebrationStyle0 from "./ui-kit/organisms/celebration/celebration.css?tag=pop-celebration&encapsulation=scoped";
export const PopCelebration = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.celebrationDone = __stencil_createEvent(this, "celebrationDone", 7);
    }
    /** Trigger the animation */
    active = false;
    /** Points earned (displayed in animation) */
    points = 0;
    /** Celebration message */
    message = 'Quest Complete!';
    /** Animation finished */
    celebrationDone;
    visible = false;
    displayedPoints = 0;
    dismissTimer;
    counterTimer;
    confettiPieces = [];
    onActiveChange(isActive) {
        if (isActive) {
            this.startCelebration();
        }
    }
    componentWillLoad() {
        if (this.active) {
            this.startCelebration();
        }
    }
    disconnectedCallback() {
        this.cleanup();
    }
    startCelebration() {
        this.visible = true;
        this.displayedPoints = 0;
        this.generateConfetti();
        // Animate counter
        if (this.points > 0) {
            const steps = Math.min(this.points, 30);
            const increment = this.points / steps;
            let current = 0;
            this.counterTimer = setInterval(() => {
                current += increment;
                if (current >= this.points) {
                    this.displayedPoints = this.points;
                    clearInterval(this.counterTimer);
                }
                else {
                    this.displayedPoints = Math.round(current);
                }
            }, 60);
        }
        // Auto-dismiss after 3s
        this.dismissTimer = setTimeout(() => {
            this.dismiss();
        }, 3000);
    }
    generateConfetti() {
        const colors = ['#a855f7', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899'];
        this.confettiPieces = Array.from({ length: 40 }, () => ({
            x: Math.random() * 100,
            y: Math.random() * -50 - 10,
            rotation: Math.random() * 360,
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 0.5,
            size: 6 + Math.random() * 6,
        }));
    }
    dismiss = () => {
        this.cleanup();
        this.visible = false;
        this.celebrationDone.emit();
    };
    cleanup() {
        if (this.dismissTimer)
            clearTimeout(this.dismissTimer);
        if (this.counterTimer)
            clearInterval(this.counterTimer);
    }
    render() {
        if (!this.visible)
            return null;
        return (h("div", { class: "cel-overlay", onClick: this.dismiss },
            h("div", { class: "cel-confetti" }, this.confettiPieces.map((piece, i) => (h("div", { key: i, class: "cel-piece", style: {
                    left: `${piece.x}%`,
                    top: `${piece.y}%`,
                    width: `${piece.size}px`,
                    height: `${piece.size}px`,
                    backgroundColor: piece.color,
                    transform: `rotate(${piece.rotation}deg)`,
                    animationDelay: `${piece.delay}s`,
                } })))),
            h("div", { class: "cel-content" },
                h("div", { class: "cel-emoji" }, "\uD83C\uDF89"),
                h("h2", { class: "cel-message" }, this.message),
                this.points > 0 && (h("div", { class: "cel-points" },
                    h("span", { class: "cel-coin" }, "\uD83E\uDE99"),
                    h("span", { class: "cel-points-value" },
                        "+",
                        this.displayedPoints),
                    h("span", { class: "cel-points-label" }, "Popcoins"))),
                h("p", { class: "cel-tap-hint" }, "Tap to dismiss"))));
    }
    static get watchers() { return {
        "active": [{
                "onActiveChange": 0
            }]
    }; }
    static get style() { return PopCelebrationStyle0(); }
};
__stencil_proxyCustomElement(PopCelebration, [514, "pop-celebration", {
        "active": [4],
        "points": [2],
        "message": [1],
        "visible": [32],
        "displayedPoints": [32]
    }, undefined, {
        "active": [{
                "onActiveChange": 0
            }]
    }]);
//# sourceMappingURL=celebration.js.map