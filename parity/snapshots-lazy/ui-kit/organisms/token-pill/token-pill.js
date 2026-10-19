import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopTokenPillStyle0 from "./ui-kit/organisms/token-pill/token-pill.css?tag=pop-token-pill&encapsulation=shadow";
export const PopTokenPill = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** The text string to calculate tokens from (estimation) */
    text = '';
    /** Explicit token count (overrides 'text' calculation if provided) */
    tokens;
    /** The maximum context window size (default 8192) */
    limit = 8192;
    /** Whether to show the numerical label */
    showLabel = true;
    /** Multiplier for char-to-token estimation (Standard is ~4) */
    ratio = 4;
    /** Explicit meter state from the server */
    state;
    /** Explicit budget percentage from the server (0 to 1+) */
    budgetPct;
    getEffectiveTokens() {
        if (typeof this.tokens === 'number')
            return this.tokens;
        if (!this.text)
            return 0;
        // Basic estimation: chars / ratio
        return Math.ceil(this.text.length / this.ratio);
    }
    render() {
        const tokens = this.getEffectiveTokens();
        const ratioPct = (tokens / this.limit) * 100;
        // Use server values if provided, else fallback to ratio derivation
        const rawPct = typeof this.budgetPct === 'number' ? this.budgetPct * 100 : ratioPct;
        const percentage = Math.min(rawPct, 100); // Visually clamp fill
        let isWarning = false;
        let isCompact = false;
        let isOver = false;
        if (this.state) {
            isWarning = this.state === 'warn';
            isCompact = this.state === 'compact';
            isOver = this.state === 'over';
        }
        else {
            isWarning = ratioPct > 80;
            isCompact = ratioPct > 95; // map crit to compact in back-compat
            isOver = ratioPct > 100;
        }
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: {
                    'pill-container': true,
                    'warn': isWarning,
                    'crit': isCompact,
                    'over': isOver
                }, title: `${tokens.toLocaleString()} / ${this.limit.toLocaleString()} tokens` },
                h("div", { key: '2', class: "progress-fill", style: { width: `${percentage}%` } }),
                this.showLabel && (h("span", { key: '3', class: "label" },
                    tokens.toLocaleString(),
                    " / ",
                    this.limit.toLocaleString(),
                    " ",
                    isOver ? '(Over)' : '')))));
    }
};
PopTokenPill.style = PopTokenPillStyle0();
//# sourceMappingURL=token-pill.js.map