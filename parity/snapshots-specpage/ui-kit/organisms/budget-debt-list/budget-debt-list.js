import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
const STATUS_COLORS = {
    active: '#34d399',
    paid: '#818cf8',
    pending: '#fbbf24',
    cancelled: '#6b7280',
};
export const PopBudgetDebtList = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-budget-debt-list",
        "componentClassName": "PopBudgetDebtList",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "debts",
                "type": "string",
                "attribute": "debts",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "BudgetDebt[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "BudgetDebt": {
                            "location": "local",
                            "path": "ui-kit/organisms/budget-debt-list/budget-debt-list.tsx",
                            "id": "ui-kit/organisms/budget-debt-list/budget-debt-list.tsx::BudgetDebt"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Debts to render \u2014 an array (property binding) OR a JSON string (attribute,\nhow Storybook / plain HTML pass them), parsed defensively."
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
                    "text": "Suppress the built-in toolbar (the Total Owed line + Add Debt). Set when a\nhost renders its own debt summary so the total isn't shown twice. Default\nfalse \u2192 self-sufficient."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popDebtEdit",
                "method": "popDebtEdit",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "BudgetDebt",
                    "resolved": "BudgetDebt",
                    "references": {
                        "BudgetDebt": {
                            "location": "local",
                            "path": "ui-kit/organisms/budget-debt-list/budget-debt-list.tsx",
                            "id": "ui-kit/organisms/budget-debt-list/budget-debt-list.tsx::BudgetDebt"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popDebtAdd",
                "method": "popDebtAdd",
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
                "styleId": "POP-BUDGET-DEBT-LIST",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/budget-debt-list/budget-debt-list.css",
                        "relativePath": "budget-debt-list.css",
                        "originalComponentPath": "budget-debt-list.css"
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
        "hasState": false,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": false,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "onClick", "style"],
        "htmlTagNames": ["div", "strong", "button", "span"],
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
//# sourceMappingURL=budget-debt-list.js.map