import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const PopBulkBar = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popBulkDone = __stencil_createEvent(this, "popBulkDone", 7);
    }
    /** How many items are selected (the count pill). */
    count = 0;
    /** Noun after the count (e.g. "selected", "cards"). */
    label = 'selected';
    /** Busy: a bulk request is running — every control disables. */
    busy = false;
    /** Done/exit button label. */
    doneLabel = 'Done';
    /** Exit selection mode (Done tapped). */
    popBulkDone;
    render() {
        return (h(Host, { key: '0', role: "toolbar", "aria-label": "Bulk actions" },
            h("div", { key: '1', class: { bulk: true, 'bulk--busy': this.busy } },
                h("span", { key: '2', class: "bulk__count", "aria-live": "polite" },
                    h("strong", { key: '3' }, this.count),
                    " ",
                    this.label),
                h("div", { key: '4', class: "bulk__actions" },
                    h("slot", { key: '5' })),
                h("button", { key: '6', type: "button", class: "bulk__done", disabled: this.busy, onClick: () => this.popBulkDone.emit() }, this.doneLabel))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-bulk-bar",
        "componentClassName": "PopBulkBar",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "count",
                "type": "number",
                "attribute": "count",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "How many items are selected (the count pill)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "label",
                "type": "string",
                "attribute": "label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'selected'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Noun after the count (e.g. \"selected\", \"cards\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "busy",
                "type": "boolean",
                "attribute": "busy",
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
                    "text": "Busy: a bulk request is running \u2014 every control disables."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "doneLabel",
                "type": "string",
                "attribute": "done-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Done'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Done/exit button label."
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
                "name": "popBulkDone",
                "method": "popBulkDone",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Exit selection mode (Done tapped)."
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
                "styleId": "POP-BULK-BAR",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/bulk-bar/bulk-bar.css",
                        "relativePath": "bulk-bar.css",
                        "originalComponentPath": "bulk-bar.css"
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
        "hasPropNumber": true,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
        "hasState": false,
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
        "htmlAttrNames": ["key", "role", "aria-label", "class", "aria-live", "type", "disabled", "onClick"],
        "htmlTagNames": ["div", "span", "strong", "slot", "button"],
        "htmlParts": [],
        "htmlSlots": [""],
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
//# sourceMappingURL=bulk-bar.js.map