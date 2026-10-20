import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopActionPickerStyle0 from "./ui-kit/organisms/action-picker/action-picker.css?tag=pop-action-picker&encapsulation=scoped";
const TYPE_ICONS = {
    storage: '\u{1F4E6}', // package
    shop: '\u{1F6D2}', // shopping cart
    recipes: '\u{1F373}', // cooking
    routines: '\u{1F504}', // cycle arrows
    inventory: '\u{1F4E6}', // package (inventory)
    custom: '\u{26A1}', // lightning
};
export const PopActionPicker = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.actionSelected = __stencil_createEvent(this, "actionSelected", 7);
        this.pickerDismiss = __stencil_createEvent(this, "pickerDismiss", 7);
    }
    /** JSON-encoded array of TagAction objects */
    actions = '[]';
    /** Name of the scanned tag (displayed in the header) */
    actionTagName = '';
    /** Whether the picker is open */
    open = false;
    /** Emitted when the user selects an action */
    actionSelected;
    /** Emitted when the user dismisses the picker */
    pickerDismiss;
    parsedActions = [];
    onActionsChange(val) {
        this.parseActions(val);
    }
    componentWillLoad() {
        this.parseActions(this.actions);
    }
    parseActions(val) {
        try {
            const parsed = typeof val === 'string' ? JSON.parse(val) : val;
            this.parsedActions = Array.isArray(parsed) ? parsed : [];
        }
        catch {
            this.parsedActions = [];
        }
    }
    onBackdropClick = () => {
        this.open = false;
        this.pickerDismiss.emit();
    };
    onActionClick = (action) => {
        this.open = false;
        this.actionSelected.emit(action);
    };
    render() {
        if (!this.open)
            return null;
        return (h("div", { class: "ap-backdrop", onClick: this.onBackdropClick },
            h("div", { class: "ap-panel", onClick: (e) => e.stopPropagation() },
                h("div", { class: "ap-handle" }),
                h("h3", { class: "ap-title" }, this.actionTagName || 'Select Action'),
                h("ul", { class: "ap-list" }, this.parsedActions.map((action) => (h("li", null,
                    h("button", { class: "ap-action-btn", type: "button", onClick: () => this.onActionClick(action) },
                        h("span", { class: "ap-action-icon" }, TYPE_ICONS[action.type] || TYPE_ICONS.custom),
                        h("span", { class: "ap-action-body" },
                            h("span", { class: "ap-action-label" }, action.label),
                            h("span", { class: "ap-action-type" }, action.type))))))),
                h("button", { class: "ap-cancel-btn", type: "button", onClick: this.onBackdropClick }, "Cancel"))));
    }
    static get watchers() { return {
        "actions": [{
                "onActionsChange": 0
            }]
    }; }
    static get style() { return PopActionPickerStyle0(); }
};
__stencil_proxyCustomElement(PopActionPicker, [514, "pop-action-picker", {
        "actions": [1],
        "actionTagName": [1, "action-tag-name"],
        "open": [1540],
        "parsedActions": [32]
    }, undefined, {
        "actions": [{
                "onActionsChange": 0
            }]
    }]);
//# sourceMappingURL=action-picker.js.map