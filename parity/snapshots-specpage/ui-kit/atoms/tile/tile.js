import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const PopTile = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popTap = __stencil_createEvent(this, "popTap", 7);
        this.popDelete = __stencil_createEvent(this, "popDelete", 7);
    }
    /** Emoji face (e.g. '🌤️') — mutually exclusive with `icon`. */
    emoji;
    /** Ionicon name, rendered via pop-icon (used when no `emoji`). */
    icon;
    /** The tile label. */
    label;
    /** Square card (default) or compact chip pill. */
    variant = 'square';
    /** Accent — any CSS color (drives the face background tint). */
    color;
    /** Active/pressed visual state (reflected as aria-pressed). */
    pressed = false;
    /** Edit mode: wiggle affordance + delete button. */
    editing = false;
    disabled = false;
    /** Whether the edit-mode delete button shows at all (hosts suppress it for
     *  tiles that must never be removed, e.g. a Settings tile). */
    deletable = true;
    /** Ionicon for the edit-mode delete button — hosts repurpose it for their own
     *  remove semantics (e.g. 'eye-off-outline' = hide, 'eye-outline' = restore,
     *  'trash-outline' = delete). */
    deleteIcon = 'close';
    /** Accessible name/tooltip for the delete button. */
    deleteLabel = 'Delete';
    /** Tooltip for the face button. Defaults to the label. */
    tileTitle;
    /** The face was activated (click / Enter / Space). Not emitted while disabled. */
    popTap;
    /** The edit-mode delete button was activated (only reachable when `editing`). */
    popDelete;
    onDelete = (e) => {
        e.stopPropagation();
        this.popDelete.emit();
    };
    render() {
        const chip = this.variant === 'chip';
        return (h(Host, { key: '0', class: {
                'pop-tile--chip': chip,
                'pop-tile--square': !chip,
                'pop-tile--editing': this.editing,
            } },
            h("button", { key: '1', type: "button", class: {
                    tile: true,
                    'tile--chip': chip,
                    'tile--square': !chip,
                    'tile--pressed': this.pressed,
                    'tile--editing': this.editing,
                }, style: this.color ? { '--pop-tile-accent': this.color, background: this.color } : undefined, disabled: this.disabled, "aria-pressed": this.pressed ? 'true' : 'false', title: this.tileTitle ?? this.label, onClick: () => this.popTap.emit() },
                this.emoji ? (h("span", { class: "tile__emoji", role: "img", "aria-label": this.label }, this.emoji)) : this.icon ? (h("pop-icon", { class: "tile__icon", name: this.icon })) : null,
                h("span", { key: '2', class: "tile__label" }, this.label),
                h("span", { key: '3', class: "tile__face" },
                    h("slot", { key: '4' })),
                h("span", { key: '5', class: "tile__badge" },
                    h("slot", { key: '6', name: "badge" }))),
            this.editing && this.deletable && (h("button", { key: '7', type: "button", class: "tile__delete", "aria-label": this.deleteLabel, title: this.deleteLabel, onClick: this.onDelete },
                h("pop-icon", { key: '8', name: this.deleteIcon })))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-tile",
        "componentClassName": "PopTile",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "emoji",
                "type": "string",
                "attribute": "emoji",
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
                    "text": "Emoji face (e.g. '\uD83C\uDF24\uFE0F') \u2014 mutually exclusive with `icon`."
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
                    "text": "Ionicon name, rendered via pop-icon (used when no `emoji`)."
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
                "required": true,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The tile label."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "variant",
                "type": "string",
                "attribute": "variant",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'square'",
                "complexType": {
                    "original": "'square' | 'chip'",
                    "resolved": "\"chip\" | \"square\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Square card (default) or compact chip pill."
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
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Accent \u2014 any CSS color (drives the face background tint)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "pressed",
                "type": "boolean",
                "attribute": "pressed",
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
                    "text": "Active/pressed visual state (reflected as aria-pressed)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "editing",
                "type": "boolean",
                "attribute": "editing",
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
                    "text": "Edit mode: wiggle affordance + delete button."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "disabled",
                "type": "boolean",
                "attribute": "disabled",
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
                "name": "deletable",
                "type": "boolean",
                "attribute": "deletable",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Whether the edit-mode delete button shows at all (hosts suppress it for\ntiles that must never be removed, e.g. a Settings tile)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "deleteIcon",
                "type": "string",
                "attribute": "delete-icon",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'close'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Ionicon for the edit-mode delete button \u2014 hosts repurpose it for their own\nremove semantics (e.g. 'eye-off-outline' = hide, 'eye-outline' = restore,\n'trash-outline' = delete)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "deleteLabel",
                "type": "string",
                "attribute": "delete-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Delete'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Accessible name/tooltip for the delete button."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "tileTitle",
                "type": "string",
                "attribute": "tile-title",
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
                    "text": "Tooltip for the face button. Defaults to the label."
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
                "name": "popTap",
                "method": "popTap",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The face was activated (click / Enter / Space). Not emitted while disabled."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popDelete",
                "method": "popDelete",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The edit-mode delete button was activated (only reachable when `editing`)."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-TILE",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/atoms/tile/tile.css",
                        "relativePath": "tile.css",
                        "originalComponentPath": "tile.css"
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
        "hasVdomKey": true,
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
        "htmlAttrNames": ["key", "class", "type", "style", "disabled", "aria-pressed", "title", "onClick", "role", "aria-label", "name"],
        "htmlTagNames": ["button", "span", "pop-icon", "slot"],
        "htmlParts": [],
        "htmlSlots": ["", "badge"],
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
//# sourceMappingURL=tile.js.map