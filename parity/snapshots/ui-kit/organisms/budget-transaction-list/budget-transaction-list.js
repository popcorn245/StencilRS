import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopBudgetTransactionListStyle0 from "./ui-kit/organisms/budget-transaction-list/budget-transaction-list.css?tag=pop-budget-transaction-list&encapsulation=scoped";
const PopBudgetTransactionList = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popTransactionEdit = __stencil_createEvent(this, "popTransactionEdit", 7);
        this.popTransactionDelete = __stencil_createEvent(this, "popTransactionDelete", 7);
        this.popAddTransaction = __stencil_createEvent(this, "popAddTransaction", 7);
    }
    /** Rows to render — an array (property binding) OR a JSON string (attribute,
     *  how Storybook / plain HTML pass them), parsed defensively. */
    transactions = [];
    loading = false;
    /** Suppress the built-in toolbar (filter pills + search + Add). Set when a
     *  host already owns filtering/search/add (e.g. the Bucket Hub) so the two
     *  don't stack. Default false → the organism stays self-sufficient. */
    hideToolbar = false;
    sortField = 'date';
    sortDir = 'desc';
    filterType = 'all';
    searchQuery = '';
    popTransactionEdit;
    popTransactionDelete;
    popAddTransaction;
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
        return this.parse(this.transactions, []);
    }
    get filtered() {
        let items = this.parsed;
        if (this.filterType !== 'all') {
            items = items.filter((t) => t.type === this.filterType);
        }
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            items = items.filter((t) => t.name.toLowerCase().includes(q) ||
                t.tags.some((tag) => tag.toLowerCase().includes(q)));
        }
        items.sort((a, b) => {
            let cmp = 0;
            if (this.sortField === 'date')
                cmp = a.date.localeCompare(b.date);
            else if (this.sortField === 'amount')
                cmp = a.amount - b.amount;
            else
                cmp = a.name.localeCompare(b.name);
            return this.sortDir === 'asc' ? cmp : -cmp;
        });
        return items;
    }
    toggleSort(field) {
        if (this.sortField === field) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        }
        else {
            this.sortField = field;
            this.sortDir = field === 'date' ? 'desc' : 'asc';
        }
    }
    formatDate(iso) {
        const d = new Date(iso);
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    }
    formatAmount(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(amount));
    }
    sortIndicator(field) {
        if (this.sortField !== field)
            return '';
        return this.sortDir === 'asc' ? ' ▲' : ' ▼';
    }
    render() {
        const items = this.filtered;
        return (h("div", { key: '0', class: "transaction-list" },
            !this.hideToolbar && (h("div", { key: '1', class: "toolbar" },
                h("div", { key: '2', class: "filter-buttons" }, ['all', 'income', 'expense'].map((t) => (h("button", { class: { 'filter-btn': true, active: this.filterType === t }, onClick: () => (this.filterType = t) }, t.charAt(0).toUpperCase() + t.slice(1))))),
                h("input", { key: '3', type: "text", class: "search-input", placeholder: "Search transactions...", value: this.searchQuery, onInput: (e) => (this.searchQuery = e.target.value) }),
                h("button", { key: '4', class: "add-btn", onClick: () => this.popAddTransaction.emit() }, "+ Add"))),
            this.loading ? (h("div", { class: "loading" }, "Loading transactions...")) : items.length === 0 ? (h("div", { class: "empty" }, "No transactions found.")) : (h("table", null,
                h("thead", null,
                    h("tr", null,
                        h("th", { onClick: () => this.toggleSort('date') },
                            "Date",
                            this.sortIndicator('date')),
                        h("th", { onClick: () => this.toggleSort('name') },
                            "Name",
                            this.sortIndicator('name')),
                        h("th", { onClick: () => this.toggleSort('amount') },
                            "Amount",
                            this.sortIndicator('amount')),
                        h("th", null, "Tags"),
                        h("th", null, "Actions"))),
                h("tbody", null, items.map((t) => (h("tr", null,
                    h("td", { class: "date" }, this.formatDate(t.date)),
                    h("td", { class: "name" }, t.name),
                    h("td", { class: `amount ${t.type}` },
                        t.type === 'expense' ? '-' : '+',
                        this.formatAmount(t.amount)),
                    h("td", { class: "tags" }, t.tags.map((tag) => (h("span", { class: "tag" }, tag)))),
                    h("td", { class: "actions" },
                        h("button", { class: "action-btn", onClick: () => this.popTransactionEdit.emit(t) }, "Edit"),
                        h("button", { class: "action-btn delete", onClick: () => this.popTransactionDelete.emit(t.id) }, "Del"))))))))));
    }
    static get style() { return PopBudgetTransactionListStyle0(); }
};
__stencil_defineCustomElement(PopBudgetTransactionList, [514, "pop-budget-transaction-list", {
        "transactions": [1],
        "loading": [4],
        "hideToolbar": [4, "hide-toolbar"],
        "sortField": [32],
        "sortDir": [32],
        "filterType": [32],
        "searchQuery": [32]
    }]);
//# sourceMappingURL=budget-transaction-list.js.map