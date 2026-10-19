import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopBacklinks = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.open = __stencil_createEvent(this, "open", 7);
    }
    /**
     * Backlink source notes. Accepts a BacklinkItem[] (set as a DOM property) or a
     * JSON string (so it can be used declaratively / in Storybook attributes).
     */
    items = [];
    /** Loading state — show skeleton rows while the query resolves. */
    loading = false;
    /** Emitted with the source note id when a backlink is activated. */
    open;
    parsed() {
        if (Array.isArray(this.items))
            return this.items;
        try {
            const v = JSON.parse(this.items || '[]');
            return Array.isArray(v) ? v : [];
        }
        catch {
            return [];
        }
    }
    render() {
        if (this.loading) {
            return (h("ul", { class: "bl bl--loading", "aria-busy": "true", "aria-label": "Loading backlinks" }, [0, 1, 2].map((i) => (h("li", { class: "bl__skeleton", key: i },
                h("span", { class: "bl__skeleton-title" }),
                h("span", { class: "bl__skeleton-snippet" }))))));
        }
        const items = this.parsed();
        if (!items.length) {
            return (h("p", { class: "bl__empty", role: "status" }, "No backlinks yet."));
        }
        return (h("ul", { class: "bl", "aria-label": "Linked references" }, items.map((it) => (h("li", { class: "bl__item", key: it.id },
            h("button", { type: "button", class: "bl__link", title: `Open “${it.title || 'Untitled'}”`, onClick: () => this.open.emit(it.id) },
                h("span", { class: "bl__icon", "aria-hidden": "true" },
                    h("pop-brand-icon", { name: "link" })),
                h("span", { class: "bl__body" },
                    h("span", { class: "bl__title" }, it.title || 'Untitled'),
                    it.snippet && h("span", { class: "bl__snippet" }, it.snippet))))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-backlinks",
        "componentClassName": "PopBacklinks",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "items",
                "type": "string",
                "attribute": "items",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "BacklinkItem[] | string",
                    "resolved": "string | {}",
                    "references": {
                        "BacklinkItem": {
                            "location": "local",
                            "path": "ui-kit/molecules/backlinks/backlinks.tsx",
                            "id": "ui-kit/molecules/backlinks/backlinks.tsx::BacklinkItem"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Backlink source notes. Accepts a BacklinkItem[] (set as a DOM property) or a\nJSON string (so it can be used declaratively / in Storybook attributes)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "loading",
                "type": "boolean",
                "attribute": "loading",
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
                    "text": "Loading state \u2014 show skeleton rows while the query resolves."
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
                "name": "open",
                "method": "open",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted with the source note id when a backlink is activated."
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
                "styleId": "POP-BACKLINKS",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/backlinks/backlinks.css",
                        "relativePath": "backlinks.css",
                        "originalComponentPath": "backlinks.css"
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
        "htmlAttrNames": ["class", "aria-busy", "aria-label", "key", "role", "type", "title", "onClick", "aria-hidden", "name"],
        "htmlTagNames": ["ul", "li", "span", "p", "button", "pop-brand-icon"],
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
//# sourceMappingURL=backlinks.js.map