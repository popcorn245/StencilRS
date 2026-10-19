import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h, Host } from "@stencil/core/testing";
export const PopSidebar = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /**
     * Whether the sidebar is open
     */
    open = false;
    /**
     * Which side the sidebar should appear on
     */
    side = 'left';
    toggle = () => {
        this.open = !this.open;
    };
    render() {
        return (h(Host, { key: '0', class: { 'sidebar-open': this.open, [`sidebar-${this.side}`]: true } },
            h("input", { key: '1', type: "checkbox", class: "sidebar-checkbox", checked: this.open, onChange: this.toggle, id: "pop-sidebar-toggle" // ID might need uniqueness if multiple, but specific req was basic
             }),
            h("aside", { key: '2', class: "sidebar-content" },
                h("slot", { key: '3', name: "sidebar" })),
            h("label", { key: '4', htmlFor: "pop-sidebar-toggle", class: "sidebar-overlay", onClick: () => this.open = false }),
            h("main", { key: '5', class: "main-content" },
                h("label", { key: '6', htmlFor: "pop-sidebar-toggle", class: "sidebar-trigger" },
                    h("slot", { key: '7', name: "trigger" }, "\u2630")),
                h("slot", { key: '8' }))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-sidebar",
        "componentClassName": "PopSidebar",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
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
                    "text": "Whether the sidebar is open"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "side",
                "type": "string",
                "attribute": "side",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'left'",
                "complexType": {
                    "original": "'left' | 'right'",
                    "resolved": "\"left\" | \"right\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Which side the sidebar should appear on"
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
                "styleId": "POP-SIDEBAR",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/Sidebar/sidebar.css",
                        "relativePath": "sidebar.css",
                        "originalComponentPath": "sidebar.css"
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
        "hasPropMutable": true,
        "hasReflect": true,
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
        "htmlAttrNames": ["key", "class", "type", "checked", "onChange", "id", "name", "htmlFor", "onClick"],
        "htmlTagNames": ["input", "aside", "slot", "label", "main"],
        "htmlParts": [],
        "htmlSlots": ["sidebar", "trigger", ""],
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
//# sourceMappingURL=sidebar.js.map