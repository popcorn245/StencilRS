import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopNoteList = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.noteSelect = __stencil_createEvent(this, "noteSelect", 7);
        this.notePin = __stencil_createEvent(this, "notePin", 7);
    }
    /** The notes to render (set as a property). */
    notes = [];
    /** noteId → snippet/excerpt text (set as a property). */
    snippets = {};
    /** List (rows) or grid (gallery tiles). */
    view = 'list';
    /** Split into Pinned + Recent sections (Home default) vs one flat list. */
    sectioned = true;
    /** Show the loading skeleton instead of content. */
    loading = false;
    /** id of the currently-selected note (highlights its card). */
    selectedId = '';
    /** Re-emitted from the cards so the page can open / pin a note. */
    noteSelect;
    notePin;
    _notes = [];
    notesChanged(v) {
        this._notes = Array.isArray(v) ? v : [];
    }
    componentWillLoad() {
        this.notesChanged(this.notes);
    }
    renderCard = (n) => (h("pop-note-card", { key: n.id, note: n, snippet: this.snippets?.[n.id] ?? '', layout: this.view === 'grid' ? 'grid' : 'list', selected: n.id === this.selectedId }));
    renderSection(title, items) {
        if (!items.length)
            return null;
        return (h("section", { class: "nl__section" },
            h("h2", { class: "nl__section-head" },
                h("span", { class: "nl__section-title" }, title),
                h("span", { class: "nl__section-count" }, items.length)),
            h("div", { class: { 'nl__items': true, [`nl__items--${this.view}`]: true } }, items.map(this.renderCard))));
    }
    render() {
        if (this.loading) {
            // Card-shaped skeletons (title + snippet + meta) mirror the note-card
            // silhouette so loading has the same shape as the content it becomes.
            return (h("div", { class: "nl" },
                h("pop-loading-state", { variant: "card-skeleton", grid: this.view === 'grid', count: this.view === 'grid' ? 6 : 5, label: "Loading notes" })));
        }
        const notes = this._notes;
        if (!notes.length) {
            return (h("div", { class: "nl nl--empty" },
                h("slot", { name: "empty" },
                    h("pop-empty-state", { iconName: "home", heading: "Nothing here yet", message: "Capture a thought to fill your brain.", size: "full" }))));
        }
        if (!this.sectioned) {
            return (h("div", { class: "nl" },
                h("div", { class: { 'nl__items': true, [`nl__items--${this.view}`]: true }, role: "list" }, notes.map(this.renderCard))));
        }
        const pinned = notes.filter((n) => n.pinned);
        const recent = notes.filter((n) => !n.pinned);
        return (h("div", { class: "nl" },
            this.renderSection('Pinned', pinned),
            this.renderSection('Recent', recent)));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-note-list",
        "componentClassName": "PopNoteList",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "notes",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "NoteCardData[]",
                    "resolved": "NoteCardData[]",
                    "references": {
                        "NoteCardData": {
                            "location": "global",
                            "id": "global::NoteCardData"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The notes to render (set as a property)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "snippets",
                "type": "any",
                "attribute": "snippets",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "{}",
                "complexType": {
                    "original": "Record<string, string>",
                    "resolved": "string",
                    "references": {
                        "Record": {
                            "location": "global",
                            "id": "global::Record"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "noteId \u2192 snippet/excerpt text (set as a property)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "view",
                "type": "string",
                "attribute": "view",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'list'",
                "complexType": {
                    "original": "'list' | 'grid'",
                    "resolved": "\"grid\" | \"list\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "List (rows) or grid (gallery tiles)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sectioned",
                "type": "boolean",
                "attribute": "sectioned",
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
                    "text": "Split into Pinned + Recent sections (Home default) vs one flat list."
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
                    "text": "Show the loading skeleton instead of content."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "selectedId",
                "type": "string",
                "attribute": "selected-id",
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
                    "text": "id of the currently-selected note (highlights its card)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "_notes"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "noteSelect",
                "method": "noteSelect",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Re-emitted from the cards so the page can open / pin a note."
                },
                "complexType": {
                    "original": "{ id: string }",
                    "resolved": "{ id: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "notePin",
                "method": "notePin",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ id: string; pinned: boolean }",
                    "resolved": "{ id: string; pinned: boolean; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "notes",
                "methodName": "notesChanged",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-NOTE-LIST",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/note-list/note-list.css",
                        "relativePath": "note-list.css",
                        "originalComponentPath": "note-list.css"
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
        "hasReflect": true,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": false,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["key", "note", "snippet", "layout", "selected", "class", "variant", "grid", "count", "label", "name", "iconName", "heading", "message", "size", "role"],
        "htmlTagNames": ["pop-note-card", "section", "h2", "span", "div", "pop-loading-state", "slot", "pop-empty-state"],
        "htmlParts": [],
        "htmlSlots": ["empty"],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
    static get watchers() { return {
        "notes": [{
                "notesChanged": 0
            }]
    }; }
};
//# sourceMappingURL=note-list.js.map