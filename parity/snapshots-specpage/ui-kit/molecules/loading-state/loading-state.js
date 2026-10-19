import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const LoadingState = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** `spinner` (default) or `card-skeleton`. */
    variant = 'spinner';
    /** Number of skeleton cards (card-skeleton variant). */
    count = 5;
    /** Tile the skeletons in a gallery grid instead of a single column. */
    grid = false;
    /** Visible / announced label. */
    label = 'Loading…';
    /** Show the label text next to the spinner (spinner variant). */
    showLabel = false;
    renderSkeletonCard = () => (h("div", { class: "ls-card", "aria-hidden": "true" },
        h("div", { class: "ls-card__head" },
            h("span", { class: "ls-bar ls-bar--title" }),
            h("span", { class: "ls-bar ls-bar--pin" })),
        h("span", { class: "ls-bar ls-bar--snippet" }),
        h("span", { class: "ls-bar ls-bar--snippet ls-bar--snippet-short" }),
        h("div", { class: "ls-card__meta" },
            h("span", { class: "ls-bar ls-bar--tag" }),
            h("span", { class: "ls-bar ls-bar--tag" }),
            h("span", { class: "ls-bar ls-bar--time" }))));
    render() {
        if (this.variant === 'card-skeleton') {
            return (h("div", { class: { 'ls': true, 'ls--skeleton': true, 'ls--grid': this.grid }, role: "status", "aria-busy": "true", "aria-label": this.label }, Array.from({ length: Math.max(1, this.count) }).map(this.renderSkeletonCard)));
        }
        return (h("div", { class: "ls ls--spinner", role: "status", "aria-busy": "true", "aria-label": this.label },
            h("span", { class: "ls-spinner", "aria-hidden": "true" }),
            this.showLabel && h("span", { class: "ls-label" }, this.label)));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-loading-state",
        "componentClassName": "LoadingState",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "variant",
                "type": "string",
                "attribute": "variant",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'spinner'",
                "complexType": {
                    "original": "'spinner' | 'card-skeleton'",
                    "resolved": "\"card-skeleton\" | \"spinner\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "`spinner` (default) or `card-skeleton`."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "count",
                "type": "number",
                "attribute": "count",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "5",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Number of skeleton cards (card-skeleton variant)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "grid",
                "type": "boolean",
                "attribute": "grid",
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
                    "text": "Tile the skeletons in a gallery grid instead of a single column."
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
                "defaultValue": "'Loading\u2026'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Visible / announced label."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "showLabel",
                "type": "boolean",
                "attribute": "show-label",
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
                    "text": "Show the label text next to the spinner (spinner variant)."
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
                "styleId": "POP-LOADING-STATE",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/loading-state/loading-state.css",
                        "relativePath": "loading-state.css",
                        "originalComponentPath": "loading-state.css"
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
        "hasSlot": false,
        "hasState": false,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": false,
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
        "htmlAttrNames": ["class", "aria-hidden", "role", "aria-busy", "aria-label"],
        "htmlTagNames": ["div", "span"],
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
//# sourceMappingURL=loading-state.js.map