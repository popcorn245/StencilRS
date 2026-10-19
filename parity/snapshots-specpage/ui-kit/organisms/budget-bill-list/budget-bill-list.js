import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
const STATUS_COLORS = {
    active: '#34d399',
    paid: '#818cf8',
    pending: '#fbbf24',
    cancelled: '#6b7280',
};
export const PopBudgetBillList = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popBillEdit = __stencil_createEvent(this, "popBillEdit", 7);
        this.popBillAdd = __stencil_createEvent(this, "popBillAdd", 7);
    }
    /** Bills to render — an array (property binding) OR a JSON string (attribute,
     *  how Storybook / plain HTML pass them), parsed defensively. */
    bills = [];
    loading = false;
    /** Suppress the built-in toolbar (view tabs + Add Bill). Set when a host owns
     *  those controls so they don't stack. Default false → self-sufficient. */
    hideToolbar = false;
    activeView = 'active';
    popBillEdit;
    popBillAdd;
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
        return this.parse(this.bills, []);
    }
    get filtered() {
        const items = this.parsed;
        switch (this.activeView) {
            case 'active':
                return items.filter((b) => b.status === 'active');
            case 'monthly':
                return items.filter((b) => b.frequency === 'monthly');
            case 'yearly':
                return items.filter((b) => b.frequency === 'yearly');
            default:
                return items;
        }
    }
    formatAmount(n) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }
    render() {
        const items = this.filtered;
        const views = ['active', 'monthly', 'yearly', 'all'];
        return (h("div", { key: '0', class: "bill-list" },
            !this.hideToolbar && (h("div", { key: '1', class: "toolbar" },
                h("div", { key: '2', class: "view-tabs" }, views.map((v) => (h("button", { class: { 'tab-btn': true, active: this.activeView === v }, onClick: () => (this.activeView = v) }, v.charAt(0).toUpperCase() + v.slice(1))))),
                h("button", { key: '3', class: "add-btn", onClick: () => this.popBillAdd.emit() }, "+ Add Bill"))),
            this.loading ? (h("div", { class: "loading" }, "Loading bills...")) : items.length === 0 ? (h("div", { class: "empty" }, "No bills found.")) : (h("table", null,
                h("thead", null,
                    h("tr", null,
                        h("th", null, "Name"),
                        h("th", null, "Amount"),
                        h("th", null, "Due"),
                        h("th", null, "Frequency"),
                        h("th", null, "Status"),
                        h("th", null))),
                h("tbody", null, items.map((b) => (h("tr", null,
                    h("td", { class: "name" }, b.name),
                    h("td", { class: "amount" }, this.formatAmount(b.amountTotal)),
                    h("td", { class: "due" }, b.billDue),
                    h("td", { class: "freq" }, b.frequency),
                    h("td", null,
                        h("span", { class: "status-badge", style: { background: STATUS_COLORS[b.status] || '#6b7280' } }, b.status)),
                    h("td", null,
                        h("button", { class: "action-btn", onClick: () => this.popBillEdit.emit(b) }, "Edit"))))))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-budget-bill-list",
        "componentClassName": "PopBudgetBillList",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "bills",
                "type": "string",
                "attribute": "bills",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "BudgetBill[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "BudgetBill": {
                            "location": "local",
                            "path": "ui-kit/organisms/budget-bill-list/budget-bill-list.tsx",
                            "id": "ui-kit/organisms/budget-bill-list/budget-bill-list.tsx::BudgetBill"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Bills to render \u2014 an array (property binding) OR a JSON string (attribute,\nhow Storybook / plain HTML pass them), parsed defensively."
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
                    "text": "Suppress the built-in toolbar (view tabs + Add Bill). Set when a host owns\nthose controls so they don't stack. Default false \u2192 self-sufficient."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "activeView"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popBillEdit",
                "method": "popBillEdit",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "BudgetBill",
                    "resolved": "BudgetBill",
                    "references": {
                        "BudgetBill": {
                            "location": "local",
                            "path": "ui-kit/organisms/budget-bill-list/budget-bill-list.tsx",
                            "id": "ui-kit/organisms/budget-bill-list/budget-bill-list.tsx::BudgetBill"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popBillAdd",
                "method": "popBillAdd",
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
                "styleId": "POP-BUDGET-BILL-LIST",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/budget-bill-list/budget-bill-list.css",
                        "relativePath": "budget-bill-list.css",
                        "originalComponentPath": "budget-bill-list.css"
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
        "htmlTagNames": ["div", "button", "table", "thead", "tr", "th", "tbody", "td", "span"],
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
//# sourceMappingURL=budget-bill-list.js.map