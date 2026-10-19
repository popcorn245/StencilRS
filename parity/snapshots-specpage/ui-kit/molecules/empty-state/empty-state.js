import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const EmptyState = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /**
     * A `pop-brand-icon` name (preferred — a themeable SVG). When set it renders
     * the vector icon; falls back to the legacy `icon` glyph string otherwise.
     */
    iconName;
    /** Legacy: a literal glyph/emoji. Prefer `iconName`. */
    icon;
    heading;
    message;
    size = 'inline';
    render() {
        return (h("div", { key: '0', class: { 'es': true, [`es--${this.size}`]: true }, role: "status" },
            this.iconName ? (h("div", { class: "es-icon es-icon--vector", "aria-hidden": "true" },
                h("pop-brand-icon", { name: this.iconName }))) : (this.icon && h("div", { class: "es-icon", "aria-hidden": "true" }, this.icon)),
            this.heading && h("h3", { key: '1', class: "es-heading" }, this.heading),
            this.message && h("p", { key: '2', class: "es-message" }, this.message),
            h("div", { key: '3', class: "es-action" },
                h("slot", { key: '4', name: "action" }))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-empty-state",
        "componentClassName": "EmptyState",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "iconName",
                "type": "string",
                "attribute": "icon-name",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "A `pop-brand-icon` name (preferred \u2014 a themeable SVG). When set it renders\nthe vector icon; falls back to the legacy `icon` glyph string otherwise."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "icon",
                "type": "string",
                "attribute": "icon",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Legacy: a literal glyph/emoji. Prefer `iconName`."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "heading",
                "type": "string",
                "attribute": "heading",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
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
                "name": "message",
                "type": "string",
                "attribute": "message",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
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
                "name": "size",
                "type": "string",
                "attribute": "size",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'inline'",
                "complexType": {
                    "original": "'inline' | 'full'",
                    "resolved": "\"full\" | \"inline\"",
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
        "events": [],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-EMPTY-STATE",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/empty-state/empty-state.css",
                        "relativePath": "empty-state.css",
                        "originalComponentPath": "empty-state.css"
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
        "hasEvent": false,
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
        "hasPropBoolean": false,
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
        "hasVdomListener": false,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "role", "aria-hidden", "name"],
        "htmlTagNames": ["div", "pop-brand-icon", "h3", "p", "slot"],
        "htmlParts": [],
        "htmlSlots": ["action"],
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
//# sourceMappingURL=empty-state.js.map