import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const Avatar = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    src;
    initials;
    icon = '👤';
    color;
    size = 'md';
    selected = false;
    name;
    /** Set when the <img> fails to load so we fall back to initials/icon. */
    imgError = false;
    resetImgError() {
        // A new src deserves a fresh load attempt.
        this.imgError = false;
    }
    renderContent() {
        if (this.src && !this.imgError) {
            return (h("img", { src: this.src, alt: this.name || 'Avatar', onError: () => (this.imgError = true) }));
        }
        if (this.initials) {
            return h("span", null, this.initials);
        }
        return h("span", { class: "avatar-icon" }, this.icon);
    }
    render() {
        return (h("div", { key: '0', class: {
                'avatar': true,
                [`avatar--${this.size}`]: true,
                'avatar--selected': this.selected,
            }, style: { '--avatar-color': this.color }, title: this.name, role: "img", "aria-label": this.name || 'Avatar' }, this.renderContent()));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-avatar",
        "componentClassName": "Avatar",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "src",
                "type": "string",
                "attribute": "src",
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
                "name": "initials",
                "type": "string",
                "attribute": "initials",
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
                "name": "icon",
                "type": "string",
                "attribute": "icon",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'\uD83D\uDC64'",
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
                "name": "color",
                "type": "string",
                "attribute": "color",
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
                "defaultValue": "'md'",
                "complexType": {
                    "original": "'sm' | 'md' | 'lg'",
                    "resolved": "\"lg\" | \"md\" | \"sm\"",
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
                "name": "selected",
                "type": "boolean",
                "attribute": "selected",
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
                "name": "name",
                "type": "string",
                "attribute": "name",
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
            }],
        "virtualProperties": [],
        "states": [{
                "name": "imgError"
            }],
        "methods": [],
        "listeners": [],
        "events": [],
        "watchers": [{
                "propName": "src",
                "methodName": "resetImgError",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-AVATAR",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/atoms/avatar/avatar.css",
                        "relativePath": "avatar.css",
                        "originalComponentPath": "avatar.css"
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
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["src", "alt", "onError", "class", "key", "style", "title", "role", "aria-label"],
        "htmlTagNames": ["img", "span", "div"],
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
        "src": [{
                "resetImgError": 0
            }]
    }; }
};
//# sourceMappingURL=avatar.js.map