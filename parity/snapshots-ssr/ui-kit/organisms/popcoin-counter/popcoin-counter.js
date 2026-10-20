import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopPopcoinCounterStyle0 from "./ui-kit/organisms/popcoin-counter/popcoin-counter.css?tag=pop-popcoin-counter&encapsulation=scoped";
export class PopPopcoinCounter {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** Current balance */
    balance = 0;
    /** Previous balance — used to detect change direction */
    previousBalance = 0;
    /** Milestone thresholds that trigger confetti (comma-separated) */
    milestones = '100,250,500,1000';
    /** Display format: 'full' shows label, 'compact' shows icon + number */
    format = 'compact';
    /** Currency icon. Defaults to the Popcoin coin 🪙 (the household currency emoji). */
    icon = '🪙';
    displayValue = 0;
    delta = 0;
    showDelta = false;
    confetti = [];
    animRaf;
    deltaTimeout;
    confettiId = 0;
    componentWillLoad() {
        this.displayValue = this.balance;
    }
    onBalanceChange(newVal, oldVal) {
        this.animateToValue(oldVal, newVal);
        this.delta = newVal - oldVal;
        this.showDelta = true;
        clearTimeout(this.deltaTimeout);
        this.deltaTimeout = setTimeout(() => (this.showDelta = false), 2000);
        if (this.isAtMilestone(newVal)) {
            this.triggerConfetti();
        }
    }
    isAtMilestone(val) {
        const milestones = this.milestones.split(',').map(Number);
        return milestones.includes(val) || (milestones.some((m) => val >= m && (this.previousBalance || 0) < m));
    }
    animateToValue(from, to) {
        if (this.animRaf)
            cancelAnimationFrame(this.animRaf);
        const duration = Math.min(800, Math.abs(to - from) * 10);
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
            this.displayValue = Math.round(from + (to - from) * ease);
            if (t < 1) {
                this.animRaf = requestAnimationFrame(tick);
            }
        };
        this.animRaf = requestAnimationFrame(tick);
    }
    triggerConfetti() {
        const colors = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899'];
        const pieces = Array.from({ length: 16 }, (_, i) => ({
            id: this.confettiId++,
            x: Math.random() * 100,
            color: colors[i % colors.length],
            delay: Math.random() * 400,
        }));
        this.confetti = pieces;
        setTimeout(() => (this.confetti = []), 2000);
    }
    disconnectedCallback() {
        if (this.animRaf)
            cancelAnimationFrame(this.animRaf);
        clearTimeout(this.deltaTimeout);
    }
    render() {
        const sign = this.delta >= 0 ? '+' : '';
        const isCompact = this.format === 'compact';
        return (h("div", { key: '0', class: `pc-root pc-format--${this.format}` },
            this.confetti.map((c) => (h("div", { key: c.id, class: "pc-confetti-piece", style: {
                    left: `${c.x}%`,
                    background: c.color,
                    animationDelay: `${c.delay}ms`,
                } }))),
            h("span", { key: '1', class: "pc-icon", "aria-hidden": "true" }, this.icon),
            h("span", { key: '2', class: "pc-value", "aria-label": `${this.displayValue} Popcoins` }, this.displayValue.toLocaleString()),
            !isCompact && h("span", { key: '3', class: "pc-label" }, "Popcoins"),
            this.showDelta && this.delta !== 0 && (h("span", { key: '4', class: `pc-delta ${this.delta > 0 ? 'pc-delta--gain' : 'pc-delta--loss'}` },
                sign,
                this.delta))));
    }
    static get watchers() { return {
        "balance": [{
                "onBalanceChange": 0
            }]
    }; }
    static get style() { return PopPopcoinCounterStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-popcoin-counter",
        "$members$": {
            "balance": [2],
            "previousBalance": [2, "previous-balance"],
            "milestones": [1],
            "format": [1],
            "icon": [1],
            "displayValue": [32],
            "delta": [32],
            "showDelta": [32],
            "confetti": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=popcoin-counter.js.map