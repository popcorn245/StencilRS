import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopBudgetTransactionList = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-budget-transaction-list",
        "componentClassName": "PopBudgetTransactionList",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "transactions",
                "type": "string",
                "attribute": "transactions",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "BudgetTransaction[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "BudgetTransaction": {
                            "location": "local",
                            "path": "ui-kit/organisms/budget-transaction-list/budget-transaction-list.tsx",
                            "id": "ui-kit/organisms/budget-transaction-list/budget-transaction-list.tsx::BudgetTransaction"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Rows to render \u2014 an array (property binding) OR a JSON string (attribute,\nhow Storybook / plain HTML pass them), parsed defensively."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "loading",
                "type": "boolean",
                "attribute": "loading",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "hideToolbar",
                "type": "boolean",
                "attribute": "hide-toolbar",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Suppress the built-in toolbar (filter pills + search + Add). Set when a\nhost already owns filtering/search/add (e.g. the Bucket Hub) so the two\ndon't stack. Default false \u2192 the organism stays self-sufficient."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "sortField"
            }, {
                "name": "sortDir"
            }, {
                "name": "filterType"
            }, {
                "name": "searchQuery"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popTransactionEdit",
                "method": "popTransactionEdit",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "BudgetTransaction",
                    "resolved": "BudgetTransaction",
                    "references": {
                        "BudgetTransaction": {
                            "location": "local",
                            "path": "ui-kit/organisms/budget-transaction-list/budget-transaction-list.tsx",
                            "id": "ui-kit/organisms/budget-transaction-list/budget-transaction-list.tsx::BudgetTransaction"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popTransactionDelete",
                "method": "popTransactionDelete",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popAddTransaction",
                "method": "popAddTransaction",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-BUDGET-TRANSACTION-LIST",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/budget-transaction-list/budget-transaction-list.css",
                        "relativePath": "budget-transaction-list.css",
                        "originalComponentPath": "budget-transaction-list.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": false,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "onClick", "type", "placeholder", "value", "onInput"],
        "htmlTagNames": ["div", "button", "input", "table", "thead", "tr", "th", "tbody", "td", "span"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
};
//# sourceMappingURL=budget-transaction-list.js.map