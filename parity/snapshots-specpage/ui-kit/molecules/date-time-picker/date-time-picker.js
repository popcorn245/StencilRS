import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopDateTimePicker = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
    }
    /** ISO-ish string. `YYYY-MM-DDTHH:MM` when timed, `YYYY-MM-DD` when all-day, '' when unset. */
    value = '';
    allDay = false;
    disabled = false;
    valueChanged;
    toDateOnly(v) {
        if (!v)
            return '';
        return v.length >= 10 ? v.slice(0, 10) : v;
    }
    toDateTime(v) {
        if (!v)
            return '';
        if (v.includes('T'))
            return v;
        return `${v}T09:00`;
    }
    commit(value, allDay) {
        this.value = value;
        this.allDay = allDay;
        this.valueChanged.emit({ value, allDay });
    }
    handleAllDayToggle = (e) => {
        const next = e.target.checked;
        const v = next ? this.toDateOnly(this.value) : this.toDateTime(this.value);
        this.commit(v, next);
    };
    handleDateInput = (e) => {
        const v = e.target.value;
        this.commit(v, this.allDay);
    };
    handleClear = (e) => {
        e.preventDefault();
        this.commit('', this.allDay);
    };
    render() {
        return (h("div", { key: '0', class: "pdtp" },
            h("input", { key: '1', class: "pdtp__input", type: this.allDay ? 'date' : 'datetime-local', value: this.value, disabled: this.disabled, onInput: this.handleDateInput }),
            h("label", { key: '2', class: "pdtp__toggle" },
                h("input", { key: '3', type: "checkbox", checked: this.allDay, disabled: this.disabled, onChange: this.handleAllDayToggle }),
                h("span", { key: '4' }, "All day")),
            this.value && !this.disabled && (h("button", { key: '5', type: "button", class: "pdtp__clear", "aria-label": "Clear due date", onClick: this.handleClear }, "\u00D7"))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-date-time-picker",
        "componentClassName": "PopDateTimePicker",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "value",
                "type": "string",
                "attribute": "value",
                "reflect": false,
                "mutable": true,
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
                    "text": "ISO-ish string. `YYYY-MM-DDTHH:MM` when timed, `YYYY-MM-DD` when all-day, '' when unset."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "allDay",
                "type": "boolean",
                "attribute": "all-day",
                "reflect": false,
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
                    "text": ""
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
            }],
        "virtualProperties": [],
        "states": [],
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
                    "text": ""
                },
                "complexType": {
                    "original": "{ value: string; allDay: boolean }",
                    "resolved": "{ value: string; allDay: boolean; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-DATE-TIME-PICKER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/date-time-picker/date-time-picker.css",
                        "relativePath": "date-time-picker.css",
                        "originalComponentPath": "date-time-picker.css"
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
        "hasPropMutable": true,
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
        "htmlAttrNames": ["key", "class", "type", "value", "disabled", "onInput", "checked", "onChange", "aria-label", "onClick"],
        "htmlTagNames": ["div", "input", "label", "span", "button"],
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
//# sourceMappingURL=date-time-picker.js.map