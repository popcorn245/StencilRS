import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopSpacePicker = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
        this.spaceCreateRequested = __stencil_createEvent(this, "spaceCreateRequested", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Currently picked space IDs. */
    value = [];
    /** Available spaces — caller provides; component is presentational. */
    spaces = [];
    /** Placeholder shown when no spaces are selected. */
    placeholder = 'Select spaces…';
    /** Whether to show the "+ New space" entry at popover bottom. */
    allowCreate = true;
    /** Emitted when the picked set changes. Detail = new ID list. */
    valueChanged;
    /** Emitted when user submits the "+ New space" mini-form. */
    spaceCreateRequested;
    open = false;
    query = '';
    showCreateForm = false;
    createName = '';
    createIcon = '📦';
    createRoom = '';
    onChipRemove(id, e) {
        e.stopPropagation();
        const next = (this.value ?? []).filter(v => v !== id);
        this.value = next;
        this.valueChanged.emit(next);
    }
    toggleSpace(id) {
        const current = this.value ?? [];
        const next = current.includes(id)
            ? current.filter(v => v !== id)
            : [...current, id];
        this.value = next;
        this.valueChanged.emit(next);
    }
    openPopover = () => {
        this.open = true;
    };
    closePopover = () => {
        this.open = false;
        this.showCreateForm = false;
        this.query = '';
    };
    onOuterClick = (e) => {
        if (!this.el.contains(e.target)) {
            this.closePopover();
        }
    };
    connectedCallback() {
        document.addEventListener('mousedown', this.onOuterClick);
    }
    disconnectedCallback() {
        document.removeEventListener('mousedown', this.onOuterClick);
    }
    submitCreate = (e) => {
        e.preventDefault();
        const name = this.createName.trim();
        if (!name)
            return;
        this.spaceCreateRequested.emit({
            name,
            icon: this.createIcon || '📦',
            room: this.createRoom.trim() || undefined,
        });
        this.createName = '';
        this.createIcon = '📦';
        this.createRoom = '';
        this.showCreateForm = false;
    };
    filteredSpaces() {
        const q = this.query.trim().toLowerCase();
        if (!q)
            return this.spaces;
        return this.spaces.filter(s => s.name.toLowerCase().includes(q) || (s.room?.toLowerCase().includes(q) ?? false));
    }
    render() {
        const picked = this.value ?? [];
        const byId = new Map(this.spaces.map(s => [s.id, s]));
        const chips = picked.map(id => byId.get(id)).filter(Boolean);
        return (h("div", { key: '0', class: "psp" },
            h("button", { key: '1', type: "button", class: "psp__field", "aria-haspopup": "listbox", "aria-expanded": this.open ? 'true' : 'false', onClick: this.openPopover },
                chips.length === 0 && (h("span", { key: '2', class: "psp__placeholder" }, this.placeholder)),
                chips.map(s => (h("span", { class: "psp__chip", key: s.id },
                    h("span", { class: "psp__chip-icon" }, s.icon),
                    h("span", { class: "psp__chip-label" }, s.name),
                    h("button", { type: "button", class: "psp__chip-remove", "aria-label": `Remove ${s.name}`, onClick: (e) => this.onChipRemove(s.id, e) }, "\u00D7"))))),
            this.open && (h("div", { key: '3', class: "psp__popover", role: "dialog" },
                h("input", { key: '4', type: "text", class: "psp__search", placeholder: "Search spaces\u2026", value: this.query, onInput: (e) => this.query = e.target.value }),
                h("ul", { key: '5', class: "psp__list", role: "listbox" },
                    this.filteredSpaces().map(s => {
                        const isPicked = picked.includes(s.id);
                        return (h("li", { class: { 'psp__opt': true, 'psp__opt--picked': isPicked }, role: "option", "aria-selected": isPicked ? 'true' : 'false', key: s.id, onClick: () => this.toggleSpace(s.id) },
                            h("span", { class: "psp__opt-icon" }, s.icon),
                            h("span", { class: "psp__opt-name" }, s.name),
                            s.room && h("span", { class: "psp__opt-room" }, s.room),
                            isPicked && h("span", { class: "psp__opt-check" }, "\u2713")));
                    }),
                    this.filteredSpaces().length === 0 && (h("li", { key: '6', class: "psp__empty" }, "No matching spaces."))),
                this.allowCreate && !this.showCreateForm && (h("button", { key: '7', type: "button", class: "psp__new", onClick: () => { this.showCreateForm = true; } }, "+ New space")),
                this.allowCreate && this.showCreateForm && (h("form", { key: '8', class: "psp__create", onSubmit: this.submitCreate },
                    h("div", { key: '9', class: "psp__create-row" },
                        h("input", { key: 'a', type: "text", class: "psp__create-icon", "aria-label": "Icon", maxLength: 4, value: this.createIcon, onInput: (e) => this.createIcon = e.target.value }),
                        h("input", { key: 'b', type: "text", class: "psp__create-name", "aria-label": "Space name", placeholder: "Name (e.g. Kitchen)", value: this.createName, onInput: (e) => this.createName = e.target.value })),
                    h("input", { key: 'c', type: "text", class: "psp__create-room", "aria-label": "Room category (optional)", placeholder: "Room category (optional)", value: this.createRoom, onInput: (e) => this.createRoom = e.target.value }),
                    h("div", { key: 'd', class: "psp__create-actions" },
                        h("button", { key: 'e', type: "button", onClick: () => { this.showCreateForm = false; } }, "Cancel"),
                        h("button", { key: 'f', type: "submit", disabled: !this.createName.trim() }, "Create"))))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-space-picker",
        "componentClassName": "PopSpacePicker",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "value",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "string[]",
                    "resolved": "string[]",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Currently picked space IDs."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "spaces",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "Space[]",
                    "resolved": "Space[]",
                    "references": {
                        "Space": {
                            "location": "local",
                            "path": "ui-kit/organisms/space-picker/space-picker.tsx",
                            "id": "ui-kit/organisms/space-picker/space-picker.tsx::Space"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Available spaces \u2014 caller provides; component is presentational."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "placeholder",
                "type": "string",
                "attribute": "placeholder",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Select spaces\u2026'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Placeholder shown when no spaces are selected."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "allowCreate",
                "type": "boolean",
                "attribute": "allow-create",
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
                    "text": "Whether to show the \"+ New space\" entry at popover bottom."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "open"
            }, {
                "name": "query"
            }, {
                "name": "showCreateForm"
            }, {
                "name": "createName"
            }, {
                "name": "createIcon"
            }, {
                "name": "createRoom"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "valueChanged",
                "method": "valueChanged",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the picked set changes. Detail = new ID list."
                },
                "complexType": {
                    "original": "string[]",
                    "resolved": "string[]",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "spaceCreateRequested",
                "method": "spaceCreateRequested",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when user submits the \"+ New space\" mini-form."
                },
                "complexType": {
                    "original": "{\n    name: string;\n    icon: string;\n    room?: string;\n  }",
                    "resolved": "{ name: string; icon: string; room?: string | undefined; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-SPACE-PICKER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/space-picker/space-picker.css",
                        "relativePath": "space-picker.css",
                        "originalComponentPath": "space-picker.css"
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
        "hasConnectedCallbackFn": true,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": true,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": true,
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
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "type", "aria-haspopup", "aria-expanded", "onClick", "aria-label", "role", "placeholder", "value", "onInput", "aria-selected", "onSubmit", "maxLength", "disabled"],
        "htmlTagNames": ["div", "button", "span", "input", "ul", "li", "form"],
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
//# sourceMappingURL=space-picker.js.map