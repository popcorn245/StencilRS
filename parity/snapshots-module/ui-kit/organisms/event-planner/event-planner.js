import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopEventPlannerStyle0 from "./ui-kit/organisms/event-planner/event-planner.css?tag=pop-event-planner&encapsulation=shadow";
export const EventPlanner = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
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
    static get style() { return PopEventPlannerStyle0(); }
};
__stencil_proxyCustomElement(EventPlanner, [513, "pop-event-planner", {
        "titleText": [1, "title-text"],
        "editable": [4],
        "initialName": [1, "initial-name"],
        "initialNotes": [1, "initial-notes"],
        "initialAddress": [1, "initial-address"],
        "initialDatetime": [1, "initial-datetime"],
        "mapsApiKey": [1, "maps-api-key"],
        "name": [32],
        "notes": [32],
        "address": [32],
        "datetime": [32],
        "isEditing": [32]
    }]);
//# sourceMappingURL=event-planner.js.map