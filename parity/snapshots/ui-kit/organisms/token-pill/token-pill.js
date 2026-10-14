import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopTokenPillStyle0 from "./ui-kit/organisms/token-pill/token-pill.css?tag=pop-token-pill&encapsulation=shadow";
const PopTokenPill = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
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
    static get style() { return PopTokenPillStyle0(); }
};
__stencil_defineCustomElement(PopTokenPill, [513, "pop-token-pill", {
        "text": [1],
        "tokens": [2],
        "limit": [2],
        "showLabel": [4, "show-label"],
        "ratio": [2],
        "state": [1],
        "budgetPct": [2, "budget-pct"]
    }]);
//# sourceMappingURL=token-pill.js.map