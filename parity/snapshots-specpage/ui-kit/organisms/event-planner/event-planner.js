import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const EventPlanner = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.planSaved = __stencil_createEvent(this, "planSaved", 7);
    }
    titleText = 'Plan';
    editable = false;
    initialName = '';
    initialNotes = '';
    initialAddress = '';
    initialDatetime = '';
    mapsApiKey = '';
    name;
    notes;
    address;
    datetime;
    isEditing = false;
    planSaved;
    componentWillLoad() {
        this.name = this.initialName;
        this.notes = this.initialNotes;
        this.address = this.initialAddress;
        this.datetime = this.initialDatetime;
    }
    handleSave = () => {
        this.isEditing = false;
        this.planSaved.emit({
            name: this.name,
            notes: this.notes,
            address: this.address,
            datetime: this.datetime
        });
    };
    handleEdit = () => {
        this.isEditing = true;
    };
    render() {
        const isEditing = this.editable && this.isEditing;
        const hasData = this.name || this.notes || this.address || this.datetime;
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: "planner-card" },
                h("div", { key: '2', class: "planner-header" },
                    h("h3", { key: '3' }, this.titleText),
                    this.editable && !isEditing && (h("button", { key: '4', class: "edit-btn", onClick: this.handleEdit }, hasData ? 'Edit' : 'Set Plan'))),
                isEditing ? (h("div", { class: "planner-form" },
                    h("div", { class: "form-group" },
                        h("label", null, "Name"),
                        h("input", { type: "text", value: this.name, onInput: (e) => this.name = e.target.value, placeholder: "Event Name" })),
                    h("div", { class: "form-group" },
                        h("label", null, "Date & Time"),
                        h("input", { type: "datetime-local", value: this.datetime, onInput: (e) => this.datetime = e.target.value })),
                    h("div", { class: "form-group" },
                        h("label", null, "Location"),
                        h("pop-address-autocomplete", { apiKey: this.mapsApiKey, value: this.address, onAddressSelected: (e) => this.address = e.detail.address })),
                    h("div", { class: "form-group" },
                        h("label", null, "Notes"),
                        h("textarea", { value: this.notes, onInput: (e) => this.notes = e.target.value, placeholder: "Any special notes?" })),
                    h("div", { class: "form-actions" },
                        h("button", { class: "save-btn", onClick: this.handleSave }, "Save")))) : (h("div", { class: "planner-view" }, !hasData ? (h("p", { class: "empty-state" }, "No plans set yet.")) : (h("div", { class: "plan-details" },
                    this.name && h("h4", null, this.name),
                    this.datetime && (h("div", { class: "detail-row" },
                        h("span", { class: "icon" }, "\uD83D\uDCC5"),
                        h("span", null, new Date(this.datetime).toLocaleString()))),
                    this.address && (h("div", { class: "detail-row" },
                        h("span", { class: "icon" }, "\uD83D\uDCCD"),
                        h("span", null, this.address))),
                    this.notes && (h("div", { class: "detail-row" },
                        h("span", { class: "icon" }, "\uD83D\uDCDD"),
                        h("p", null, this.notes))))))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-event-planner",
        "componentClassName": "EventPlanner",
        "elementRef": null,
        "encapsulation": "shadow",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": "open",
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "titleText",
                "type": "string",
                "attribute": "title-text",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Plan'",
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
                "name": "editable",
                "type": "boolean",
                "attribute": "editable",
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
                "name": "initialName",
                "type": "string",
                "attribute": "initial-name",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "initialNotes",
                "type": "string",
                "attribute": "initial-notes",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "initialAddress",
                "type": "string",
                "attribute": "initial-address",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "initialDatetime",
                "type": "string",
                "attribute": "initial-datetime",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "mapsApiKey",
                "type": "string",
                "attribute": "maps-api-key",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "name"
            }, {
                "name": "notes"
            }, {
                "name": "address"
            }, {
                "name": "datetime"
            }, {
                "name": "isEditing"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "planSaved",
                "method": "planSaved",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ name: string, notes: string, address: string, datetime: string }",
                    "resolved": "{ name: string; notes: string; address: string; datetime: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-EVENT-PLANNER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/event-planner/event-planner.css",
                        "relativePath": "event-planner.css",
                        "originalComponentPath": "event-planner.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": true,
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
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "onClick", "type", "value", "onInput", "placeholder", "apiKey", "onAddressSelected"],
        "htmlTagNames": ["div", "h3", "button", "label", "input", "pop-address-autocomplete", "textarea", "p", "h4", "span"],
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
//# sourceMappingURL=event-planner.js.map