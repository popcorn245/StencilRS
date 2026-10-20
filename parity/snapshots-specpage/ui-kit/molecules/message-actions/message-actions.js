import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopMessageActions = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popThreadOpened = __stencil_createEvent(this, "popThreadOpened", 7);
        this.popEditRequested = __stencil_createEvent(this, "popEditRequested", 7);
        this.popDeleteRequested = __stencil_createEvent(this, "popDeleteRequested", 7);
    }
    messageId = '';
    isOwn = false;
    isAdmin = false;
    isThread = false;
    threadCount = 0;
    popThreadOpened;
    popEditRequested;
    popDeleteRequested;
    render() {
        return (h("div", { key: '0', class: { 'mb-actions': true, 'mb-actions--thread': this.threadCount > 0 } },
            !this.isThread && (h("button", { key: '1', class: { 'mb-act-btn': true, 'mb-act-thread': true, 'mb-act-thread--active': this.threadCount > 0 }, title: this.threadCount ? 'View thread' : 'Start thread', onClick: () => this.popThreadOpened.emit({ id: this.messageId }) },
                h("svg", { key: '2', xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 512 512", fill: "currentColor" },
                    h("path", { key: '3', d: "M448,440a16,16,0,0,1-12.61-6.15c-22.86-29.27-44.07-51.86-73.32-67C335,352.88,301,345.59,256,344.23V424A16,16,0,0,1,229,435.57l-176-168a16,16,0,0,1,0-23.14l176-168A16,16,0,0,1,256,88v80.36c74.14,3.41,129.38,30.91,164.35,81.87C449.32,292.44,464,350.9,464,424a16,16,0,0,1-16,16Z" })),
                this.threadCount > 0 && h("span", { key: '4', class: "mb-thread-badge" }, this.threadCount))),
            this.isOwn && (h("button", { key: '5', class: "mb-act-btn mb-act-edit", title: "Edit", onClick: () => this.popEditRequested.emit(this.messageId) },
                h("svg", { key: '6', xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 512 512" },
                    h("polygon", { key: '7', points: "358.62 129.28 86.49 402.08 70 442 109.92 425.51 382.72 153.38 358.62 129.28", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "44" }),
                    h("path", { key: '8', d: "M413.07,74.84,401.28,86.62l24.1,24.1,11.79-11.79a16.51,16.51,0,0,0,0-23.34l-.75-.75A16.51,16.51,0,0,0,413.07,74.84Z", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "44" })))),
            (this.isOwn || this.isAdmin) && (h("button", { key: '9', class: "mb-act-btn mb-act-delete", title: "Delete", onClick: () => this.popDeleteRequested.emit(this.messageId) },
                h("svg", { key: 'a', xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 512 512", fill: "currentColor" },
                    h("path", { key: 'b', d: "M432,96H336V72a40,40,0,0,0-40-40H216a40,40,0,0,0-40,40V96H80a16,16,0,0,0,0,32H97L116,432.92c1.42,26.85,22,47.08,48,47.08H348c26.13,0,46.3-19.78,48-47L415,128h17a16,16,0,0,0,0-32ZM208,96V72a8,8,0,0,1,8-8h80a8,8,0,0,1,8,8V96Z" }))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-message-actions",
        "componentClassName": "PopMessageActions",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "messageId",
                "type": "string",
                "attribute": "message-id",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "isOwn",
                "type": "boolean",
                "attribute": "is-own",
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
                "name": "isAdmin",
                "type": "boolean",
                "attribute": "is-admin",
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
                "name": "isThread",
                "type": "boolean",
                "attribute": "is-thread",
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
                "name": "threadCount",
                "type": "number",
                "attribute": "thread-count",
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
                    "text": ""
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
                "name": "popThreadOpened",
                "method": "popThreadOpened",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ id: string }",
                    "resolved": "{ id: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popEditRequested",
                "method": "popEditRequested",
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
                "name": "popDeleteRequested",
                "method": "popDeleteRequested",
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
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-MESSAGE-ACTIONS",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/message-actions/message-actions.css",
                        "relativePath": "message-actions.css",
                        "originalComponentPath": "message-actions.css"
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
        "hasSlot": false,
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
        "htmlAttrNames": ["key", "class", "title", "onClick", "xmlns", "width", "height", "viewBox", "fill", "d", "points", "stroke", "stroke-linecap", "stroke-linejoin", "stroke-width"],
        "htmlTagNames": ["div", "button", "svg", "path", "span", "polygon"],
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
//# sourceMappingURL=message-actions.js.map