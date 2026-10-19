import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopImageCard = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.cardSelect = __stencil_createEvent(this, "cardSelect", 7);
    }
    /** Image URL for the fallback <img> (ignored when the `media` slot is filled). */
    src = '';
    /** Alt text for the fallback <img>. */
    alt = '';
    /** Optional title rendered above the default slot content. */
    cardTitle;
    /** CSS aspect-ratio for the media wrapper (e.g. '1/1', '4/3', '16/9'). */
    aspect = '1/1';
    /** Whether the whole card is a button (emits `cardSelect` on click/Enter). */
    clickable = false;
    /** Optional id echoed back in the `cardSelect` event detail. */
    cardId = '';
    /** When set, the card renders as an <a href> instead of emitting. */
    href;
    /** Emitted when a `clickable` card is activated (click / Enter / Space). */
    cardSelect;
    onActivate = (ev) => {
        if (this.href)
            return; // the anchor handles navigation itself
        ev.preventDefault();
        this.cardSelect.emit(this.cardId);
    };
    render() {
        const media = (h("div", { class: "pic-media", style: { aspectRatio: this.aspect.replace('/', ' / ') } },
            h("slot", { name: "media" }, this.src && h("img", { class: "pic-img", src: this.src, alt: this.alt, loading: "lazy" }))));
        const body = [
            this.cardTitle && h("div", { class: "pic-title" }, this.cardTitle),
            h("div", { class: "pic-content" },
                h("slot", null)),
        ];
        const actions = (h("div", { class: "pic-actions" },
            h("slot", { name: "actions" })));
        const rootClass = { 'pic-root': true, 'pic-root--clickable': this.clickable };
        if (this.href) {
            return (h("a", { class: rootClass, href: this.href },
                media,
                body,
                actions));
        }
        if (this.clickable) {
            return (h("div", { class: rootClass, role: "button", tabIndex: 0, onClick: this.onActivate, onKeyDown: (e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                        this.onActivate(e);
                } },
                media,
                body,
                actions));
        }
        return (h("div", { class: rootClass },
            media,
            body,
            actions));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-image-card",
        "componentClassName": "PopImageCard",
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
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Image URL for the fallback <img> (ignored when the `media` slot is filled)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "alt",
                "type": "string",
                "attribute": "alt",
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
                    "text": "Alt text for the fallback <img>."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "cardTitle",
                "type": "string",
                "attribute": "card-title",
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
                    "text": "Optional title rendered above the default slot content."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "aspect",
                "type": "string",
                "attribute": "aspect",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'1/1'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "CSS aspect-ratio for the media wrapper (e.g. '1/1', '4/3', '16/9')."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "clickable",
                "type": "boolean",
                "attribute": "clickable",
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
                    "text": "Whether the whole card is a button (emits `cardSelect` on click/Enter)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "cardId",
                "type": "string",
                "attribute": "card-id",
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
                    "text": "Optional id echoed back in the `cardSelect` event detail."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "href",
                "type": "string",
                "attribute": "href",
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
                    "text": "When set, the card renders as an <a href> instead of emitting."
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
                "name": "cardSelect",
                "method": "cardSelect",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when a `clickable` card is activated (click / Enter / Space)."
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
                "styleId": "POP-IMAGE-CARD",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/image-card/image-card.css",
                        "relativePath": "image-card.css",
                        "originalComponentPath": "image-card.css"
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
        "hasSlot": true,
        "hasState": false,
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
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["class", "style", "name", "src", "alt", "loading", "href", "role", "tabIndex", "onClick", "onKeyDown"],
        "htmlTagNames": ["div", "slot", "img", "a"],
        "htmlParts": [],
        "htmlSlots": ["media", "", "actions"],
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
//# sourceMappingURL=image-card.js.map