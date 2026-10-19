import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
const TYPE_ICONS = {
    storage: '\u{1F4E6}', // package
    shop: '\u{1F6D2}', // shopping cart
    recipes: '\u{1F373}', // cooking
    routines: '\u{1F504}', // cycle arrows
    inventory: '\u{1F4E6}', // package (inventory)
    custom: '\u{26A1}', // lightning
};
export const PopActionPicker = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-action-picker",
        "componentClassName": "PopActionPicker",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "actions",
                "type": "string",
                "attribute": "actions",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON-encoded array of TagAction objects"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "actionTagName",
                "type": "string",
                "attribute": "action-tag-name",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Name of the scanned tag (displayed in the header)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "open",
                "type": "boolean",
                "attribute": "open",
                "reflect": true,
                "mutable": true,
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
                    "text": "Whether the picker is open"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "parsedActions"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "actionSelected",
                "method": "actionSelected",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the user selects an action"
                },
                "complexType": {
                    "original": "TagAction",
                    "resolved": "TagAction",
                    "references": {
                        "TagAction": {
                            "location": "global",
                            "id": "global::TagAction"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "pickerDismiss",
                "method": "pickerDismiss",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the user dismisses the picker"
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "actions",
                "methodName": "onActionsChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-ACTION-PICKER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/action-picker/action-picker.css",
                        "relativePath": "action-picker.css",
                        "originalComponentPath": "action-picker.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": true,
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
        "hasLifecycle": true,
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
        "hasPropMutable": true,
        "hasReflect": true,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": false,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "onClick", "type"],
        "htmlTagNames": ["div", "h3", "ul", "li", "button", "span"],
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
    static get watchers() { return {
        "actions": [{
                "onActionsChange": 0
            }]
    }; }
};
//# sourceMappingURL=action-picker.js.map