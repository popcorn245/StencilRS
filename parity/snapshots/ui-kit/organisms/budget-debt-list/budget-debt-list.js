import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopBudgetDebtListStyle0 from "./ui-kit/organisms/budget-debt-list/budget-debt-list.css?tag=pop-budget-debt-list&encapsulation=scoped";
const STATUS_COLORS = {
    active: '#34d399',
    paid: '#818cf8',
    pending: '#fbbf24',
    cancelled: '#6b7280',
};
const PopBudgetDebtList = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popDebtEdit = __stencil_createEvent(this, "popDebtEdit", 7);
        this.popDebtAdd = __stencil_createEvent(this, "popDebtAdd", 7);
    }
    /** Debts to render — an array (property binding) OR a JSON string (attribute,
     *  how Storybook / plain HTML pass them), parsed defensively. */
    debts = [];
    loading = false;
    /** Suppress the built-in toolbar (the Total Owed line + Add Debt). Set when a
     *  host renders its own debt summary so the total isn't shown twice. Default
     *  false → self-sufficient. */
    hideToolbar = false;
    popDebtEdit;
    popDebtAdd;
    parse(v, fallback) {
        if (typeof v === 'string') {
            if (v === '')
                return fallback;
            try {
                return JSON.parse(v) ?? fallback;
            }
            catch {
                return fallback;
            }
        }
        return v ?? fallback;
    }
    get parsed() {
        return this.parse(this.debts, []);
    }
    get activeDebts() {
        return this.parsed.filter((d) => d.status === 'active');
    }
    get totalOwed() {
        return this.activeDebts.reduce((sum, d) => sum + d.amount, 0);
    }
    formatAmount(n) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }
    utilizationPercent(debt) {
        if (!debt.creditLimit || debt.creditLimit <= 0)
            return 0;
        return Math.min(100, (debt.amount / debt.creditLimit) * 100);
    }
    utilizationColor(pct) {
        if (pct < 30)
            return '#34d399';
        if (pct < 70)
            return '#fbbf24';
        return '#f87171';
    }
    render() {
        const items = this.activeDebts;
        return (h("div", { key: '0', class: "debt-list" },
            !this.hideToolbar && (h("div", { key: '1', class: "toolbar" },
                h("div", { key: '2', class: "total-owed" },
                    "Total Owed: ",
                    h("strong", { key: '3' }, this.formatAmount(this.totalOwed))),
                h("button", { key: '4', class: "add-btn", onClick: () => this.popDebtAdd.emit() }, "+ Add Debt"))),
            this.loading ? (h("div", { class: "loading" }, "Loading debts...")) : items.length === 0 ? (h("div", { class: "empty" }, "No active debts.")) : (h("div", { class: "debt-cards" }, items.map((d) => {
                const pct = this.utilizationPercent(d);
                const barColor = this.utilizationColor(pct);
                return (h("div", { class: "debt-card" },
                    h("div", { class: "card-header" },
                        h("span", { class: "card-name" }, d.name),
                        h("span", { class: "status-badge", style: { background: STATUS_COLORS[d.status] } }, d.status)),
                    h("div", { class: "card-amount" }, this.formatAmount(d.amount)),
                    d.creditLimit ? (h("div", { class: "utilization" },
                        h("div", { class: "util-bar" },
                            h("div", { class: "util-fill", style: { width: `${pct}%`, background: barColor } })),
                        h("div", { class: "util-label" },
                            pct.toFixed(0),
                            "% of ",
                            this.formatAmount(d.creditLimit)))) : null,
                    h("div", { class: "card-meta" },
                        d.interestRate != null && h("span", null,
                            (d.interestRate * 100).toFixed(1),
                            "% APR"),
                        d.billDue && h("span", null,
                            "Due: ",
                            d.billDue),
                        h("span", null, d.frequency)),
                    h("button", { class: "action-btn", onClick: () => this.popDebtEdit.emit(d) }, "Edit")));
            })))));
    }
    static get style() { return PopBudgetDebtListStyle0(); }
};
__stencil_defineCustomElement(PopBudgetDebtList, [514, "pop-budget-debt-list", {
        "debts": [1],
        "loading": [4],
        "hideToolbar": [4, "hide-toolbar"]
    }]);
//# sourceMappingURL=budget-debt-list.js.map