import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h, Host } from "@stencil/core/testing";
export const PopMetricCard = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popCardTap = __stencil_createEvent(this, "popCardTap", 7);
    }
    /** The emoji / glyph shown before the title (e.g. "⚖️"). Kept as a literal
     *  glyph by design — this is NOT a pop-icon slot. */
    glyph = '';
    /** The card title (e.g. "Weight"). */
    label = '';
    /** The big value (e.g. "150.7 lbs"). Rendered on one line where it fits. */
    value = '';
    /** Optional sub-line under the value (e.g. "Jul 15" or "of 2,000 goal"). */
    sub = '';
    /** Highlighted/pressed state — e.g. the card whose log form is open, or the
     *  one just logged. Rotates the "+" badge to a "✕". */
    active = false;
    /** Shows the tap-to-log affordance (the "+" badge + "Tap to log" hint). Off →
     *  the card is a plain (still tappable) stat tile. */
    loggable = false;
    /** Identity emitted with `popCardTap` so a host with many cards knows which
     *  one was tapped. Defaults to the label when unset. */
    cardKey = '';
    /** Fires when the card is tapped — detail is the card's `cardKey` (or label). */
    popCardTap;
    onTap = () => {
        this.popCardTap.emit(this.cardKey || this.label);
    };
    render() {
        return (h(Host, { key: '0' },
            h("button", { key: '1', type: "button", class: { mc: true, 'mc--on': this.active, 'mc--loggable': this.loggable }, "aria-pressed": this.loggable ? String(this.active) : undefined, onClick: this.onTap },
                this.loggable && (h("span", { key: '2', class: "mc__plus", "aria-hidden": "true" }, "+")),
                h("span", { key: '3', class: "mc__title" },
                    this.glyph && h("span", { key: '4', class: "mc__glyph" }, this.glyph),
                    h("span", { key: '5', class: "mc__label" }, this.label)),
                h("span", { key: '6', class: "mc__value" }, this.value),
                this.sub && h("span", { key: '7', class: "mc__sub" }, this.sub),
                this.loggable && (h("span", { key: '8', class: "mc__hint", "aria-hidden": "true" }, "Tap to log")))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-metric-card",
        "componentClassName": "PopMetricCard",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "glyph",
                "type": "string",
                "attribute": "glyph",
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
                    "text": "The emoji / glyph shown before the title (e.g. \"\u2696\uFE0F\"). Kept as a literal\nglyph by design \u2014 this is NOT a pop-icon slot."
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
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The card title (e.g. \"Weight\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "value",
                "type": "string",
                "attribute": "value",
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
                    "text": "The big value (e.g. \"150.7 lbs\"). Rendered on one line where it fits."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sub",
                "type": "string",
                "attribute": "sub",
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
                    "text": "Optional sub-line under the value (e.g. \"Jul 15\" or \"of 2,000 goal\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "active",
                "type": "boolean",
                "attribute": "active",
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
                    "text": "Highlighted/pressed state \u2014 e.g. the card whose log form is open, or the\none just logged. Rotates the \"+\" badge to a \"\u2715\"."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "loggable",
                "type": "boolean",
                "attribute": "loggable",
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
                    "text": "Shows the tap-to-log affordance (the \"+\" badge + \"Tap to log\" hint). Off \u2192\nthe card is a plain (still tappable) stat tile."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "cardKey",
                "type": "string",
                "attribute": "card-key",
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
                    "text": "Identity emitted with `popCardTap` so a host with many cards knows which\none was tapped. Defaults to the label when unset."
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
                "name": "popCardTap",
                "method": "popCardTap",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fires when the card is tapped \u2014 detail is the card's `cardKey` (or label)."
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
                "styleId": "POP-METRIC-CARD",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/metric-card/metric-card.css",
                        "relativePath": "metric-card.css",
                        "originalComponentPath": "metric-card.css"
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
        "hasPropNumber": false,
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
        "htmlAttrNames": ["key", "type", "class", "aria-pressed", "onClick", "aria-hidden"],
        "htmlTagNames": ["button", "span"],
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
//# sourceMappingURL=metric-card.js.map