import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const AppShell = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** Page title rendered in the header. */
    heading;
    /** Optional leading `pop-brand-icon` name shown before the title. */
    iconName;
    /** Heading level for the title (a11y). */
    headingLevel = 1;
    /** Constrain the body to a readable column and center it (Settings). */
    centered = false;
    /** Render no header chrome — just the flex/scroll frame. */
    bare = false;
    render() {
        const Title = `h${this.headingLevel}`;
        return (h("div", { key: '0', class: { 'shell': true, 'shell--centered': this.centered, 'shell--bare': this.bare } },
            !this.bare && (h("header", { key: '1', class: "shell__head" },
                h(Title, { key: '2', class: "shell__title" },
                    this.iconName && (h("span", { key: '3', class: "shell__title-icon", "aria-hidden": "true" },
                        h("pop-brand-icon", { key: '4', name: this.iconName }))),
                    h("span", { key: '5', class: "shell__title-text" }, this.heading),
                    h("span", { key: '6', class: "shell__context" },
                        h("slot", { key: '7', name: "context" }))),
                h("div", { key: '8', class: "shell__actions" },
                    h("slot", { key: '9', name: "actions" })))),
            h("div", { key: 'a', class: "shell__body" },
                h("slot", { key: 'b' }))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-app-shell",
        "componentClassName": "AppShell",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "heading",
                "type": "string",
                "attribute": "heading",
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
                    "text": "Page title rendered in the header."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
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
                    "text": "Optional leading `pop-brand-icon` name shown before the title."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "headingLevel",
                "type": "number",
                "attribute": "heading-level",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "1",
                "complexType": {
                    "original": "1 | 2",
                    "resolved": "1 | 2",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Heading level for the title (a11y)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "centered",
                "type": "boolean",
                "attribute": "centered",
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
                    "text": "Constrain the body to a readable column and center it (Settings)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "bare",
                "type": "boolean",
                "attribute": "bare",
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
                    "text": "Render no header chrome \u2014 just the flex/scroll frame."
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
                "styleId": "POP-APP-SHELL",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/app-shell/app-shell.css",
                        "relativePath": "app-shell.css",
                        "originalComponentPath": "app-shell.css"
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
        "hasVdomFunctional": true,
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
        "htmlAttrNames": ["key", "class", "aria-hidden", "name"],
        "htmlTagNames": ["div", "header", "span", "pop-brand-icon", "slot"],
        "htmlParts": [],
        "htmlSlots": ["context", "actions", ""],
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
//# sourceMappingURL=app-shell.js.map