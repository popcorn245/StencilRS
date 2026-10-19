import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const EmailButton = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.buttonChange = __stencil_createEvent(this, "buttonChange", 7);
    }
    /** Button label text */
    text = 'Click Here';
    /** Button link URL */
    url = '#';
    /** Horizontal alignment: left, center, right */
    alignment = 'center';
    /** Button background color */
    backgroundColor = '#7c3aed';
    /** Button text color */
    textColor = '#ffffff';
    /** Border radius in pixels */
    borderRadius = 4;
    /** Read-only mode */
    readonly = false;
    /** Emitted when button properties change */
    buttonChange;
    render() {
        return (h(Host, { key: '0', style: { textAlign: this.alignment, display: 'block', padding: '8px 0' } },
            h("a", { key: '1', href: this.readonly ? this.url : undefined, style: {
                    display: 'inline-block',
                    padding: '10px 24px',
                    background: this.backgroundColor,
                    color: this.textColor,
                    borderRadius: `${this.borderRadius}px`,
                    textDecoration: 'none',
                    fontWeight: '600',
                    cursor: this.readonly ? 'pointer' : 'text',
                    minWidth: '100px',
                    textAlign: 'center',
                } }, this.text)));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-button",
        "componentClassName": "EmailButton",
        "elementRef": null,
        "encapsulation": "none",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "text",
                "type": "string",
                "attribute": "text",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Click Here'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Button label text"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "url",
                "type": "string",
                "attribute": "url",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'#'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Button link URL"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "alignment",
                "type": "string",
                "attribute": "alignment",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'center'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Horizontal alignment: left, center, right"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "backgroundColor",
                "type": "string",
                "attribute": "background-color",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'#7c3aed'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Button background color"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "textColor",
                "type": "string",
                "attribute": "text-color",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'#ffffff'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Button text color"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "borderRadius",
                "type": "number",
                "attribute": "border-radius",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "4",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Border radius in pixels"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "readonly",
                "type": "boolean",
                "attribute": "readonly",
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
                    "text": "Read-only mode"
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
                "name": "buttonChange",
                "method": "buttonChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when button properties change"
                },
                "complexType": {
                    "original": "{\n    text: string;\n    url: string;\n    alignment: string;\n    backgroundColor: string;\n    textColor: string;\n    borderRadius: number;\n  }",
                    "resolved": "{ text: string; url: string; alignment: string; backgroundColor: string; textColor: string; borderRadius: number; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [],
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
        "hasStyle": false,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": false,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": false,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "style", "href"],
        "htmlTagNames": ["a"],
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
//# sourceMappingURL=button.js.map