import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
const LEVELS = ['viewer', 'participant'];
export const PopShareSheet = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popAclChange = __stencil_createEvent(this, "popAclChange", 7);
        this.popLinkToggle = __stencil_createEvent(this, "popLinkToggle", 7);
        this.popRedactionChange = __stencil_createEvent(this, "popRedactionChange", 7);
    }
    /** What is being shared. Free-form `kind` — this component stays domain-free. */
    subject;
    /** The current access-control list. */
    acl = [];
    /** People the host can resolve, for names and the add-person picker. */
    people = [];
    /** Groups the host can resolve. An acl group missing here renders as deleted. */
    groups = [];
    /** False ⇒ the whole sheet is read-only. */
    canEdit = false;
    /** Phase 2 — public link. Rendered disabled in V1. */
    linkEnabled = false;
    /** Phase 2 — the public link URL. */
    linkUrl = '';
    /** Host-owned redaction settings, passed through untouched. */
    redaction;
    /** The FULL replacement acl. Never a patch. */
    popAclChange;
    /** Phase 2 — emitted when the public link switch flips. */
    popLinkToggle;
    /** Emitted when the host-owned redaction settings change. */
    popRedactionChange;
    /** Which group rows have their member list expanded (view-only UI state). */
    expanded = [];
    /** Selection of the add-person picker (view-only UI state). */
    pendingUid = '';
    entries() {
        return Array.isArray(this.acl) ? this.acl.filter((e) => e && e.subjectType) : [];
    }
    emit(next) {
        this.popAclChange.emit({ acl: next });
    }
    setLevel(entry, level) {
        if (!this.canEdit || entry.level === level)
            return;
        this.emit(this.entries().map((e) => (e === entry ? { ...e, level } : e)));
    }
    remove(entry) {
        if (!this.canEdit)
            return;
        this.emit(this.entries().filter((e) => e !== entry));
    }
    addPerson = () => {
        const uid = this.pendingUid;
        if (!this.canEdit || !uid)
            return;
        this.pendingUid = '';
        this.emit([
            ...this.entries(),
            { subjectType: 'user', subjectId: uid, level: 'viewer', grantedAt: Date.now() },
        ]);
    };
    toggleExpanded(groupId) {
        this.expanded = this.expanded.includes(groupId)
            ? this.expanded.filter((id) => id !== groupId)
            : [...this.expanded, groupId];
    }
    personName(uid) {
        const found = (this.people || []).find((p) => p && p.uid === uid);
        return found?.displayName || 'Unknown person';
    }
    renderLevel(entry) {
        return (h("div", { class: "shs__seg", role: "group", "aria-label": "Access level" }, LEVELS.map((level) => (h("button", { key: level, type: "button", class: { shs__segbtn: true, 'shs__segbtn--on': entry.level === level }, disabled: !this.canEdit, "aria-pressed": entry.level === level ? 'true' : 'false', onClick: () => this.setLevel(entry, level) }, level === 'viewer' ? 'Viewer' : 'Participant')))));
    }
    renderRemove(entry, what) {
        if (!this.canEdit)
            return null;
        return (h("button", { type: "button", class: "pop-iconbtn shs__btn", title: `Remove ${what}`, "aria-label": `Remove ${what}`, onClick: () => this.remove(entry) },
            h("ion-icon", { name: "close-outline", "aria-hidden": "true" })));
    }
    renderPeople() {
        const rows = this.entries().filter((e) => e.subjectType === 'user');
        const takenUids = new Set(rows.map((e) => e.subjectId));
        const addable = (this.people || []).filter((p) => p && !takenUids.has(p.uid));
        return (h("section", { class: "shs__section" },
            h("h3", { class: "shs__heading" }, "People"),
            rows.length === 0 && h("p", { class: "shs__empty" }, "Nobody else has access yet."),
            rows.map((entry) => (h("div", { key: `u:${entry.subjectId}`, class: "shs__row" },
                h("span", { class: "shs__name" }, this.personName(entry.subjectId)),
                this.renderLevel(entry),
                this.renderRemove(entry, this.personName(entry.subjectId))))),
            this.canEdit && addable.length > 0 && (h("div", { class: "shs__add" },
                h("select", { class: "shs__picker", "aria-label": "Add a person", onChange: (ev) => (this.pendingUid = ev.target.value) },
                    h("option", { value: "" }, "Add a person\u2026"),
                    addable.map((p) => (h("option", { key: p.uid, value: p.uid }, p.displayName)))),
                h("button", { type: "button", class: { 'shs__add-btn': true, 'shs__add-btn--off': !this.pendingUid }, "aria-disabled": this.pendingUid ? 'false' : 'true', onClick: this.addPerson }, "Add")))));
    }
    renderGroups() {
        const rows = this.entries().filter((e) => e.subjectType === 'group');
        if (rows.length === 0)
            return null;
        return (h("section", { class: "shs__section" },
            h("h3", { class: "shs__heading" }, "Groups"),
            rows.map((entry) => {
                const group = (this.groups || []).find((g) => g && g.id === entry.subjectId);
                const open = this.expanded.includes(entry.subjectId || '');
                const members = group?.memberUids || [];
                return (h("div", { key: `g:${entry.subjectId}`, class: { shs__row: true, 'shs__row--stack': true } },
                    h("div", { class: "shs__rowline" },
                        h("span", { class: { shs__name: true, 'shs__name--gone': !group } }, group ? group.name : 'deleted group'),
                        group && h("span", { class: "shs__count" }, members.length),
                        group && (h("button", { type: "button", class: "pop-iconbtn shs__btn", title: open ? 'Hide members' : 'Show members', "aria-label": open ? 'Hide members' : 'Show members', "aria-expanded": open ? 'true' : 'false', onClick: () => this.toggleExpanded(entry.subjectId || '') },
                            h("ion-icon", { name: open ? 'chevron-up-outline' : 'chevron-down-outline', "aria-hidden": "true" }))),
                        this.renderLevel(entry),
                        this.renderRemove(entry, group ? group.name : 'deleted group')),
                    open && (h("ul", { class: "shs__members" }, members.map((uid) => (h("li", { key: uid }, this.personName(uid))))))));
            })));
    }
    renderLink() {
        // Phase 2. Rendered now — disabled, with a "Coming soon" badge — so the
        // layout does not shift when public links actually ship.
        return (h("section", { class: "shs__section shs__section--soon" },
            h("h3", { class: "shs__heading" },
                "Link",
                h("span", { class: "shs__soon" }, "Coming soon")),
            h("div", { class: "shs__row" },
                h("span", { class: "shs__name" }, "Anyone with the link can view"),
                h("pop-switch", { checked: this.linkEnabled, disabled: true, label: "Anyone with the link can view" })),
            this.linkUrl && h("p", { class: "shs__url" }, this.linkUrl)));
    }
    render() {
        const title = this.subject?.title || '';
        return (h("div", { key: '0', class: { shs: true, 'shs--readonly': !this.canEdit } },
            h("header", { key: '1', class: "shs__head" },
                h("span", { key: '2', class: "shs__subject" }, title),
                this.subject?.kind && h("span", { key: '3', class: "shs__kind" }, this.subject.kind)),
            !this.canEdit && h("p", { key: '4', class: "shs__note" }, "You can see who has access, but not change it."),
            this.renderPeople(),
            this.renderGroups(),
            this.renderLink()));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-share-sheet",
        "componentClassName": "PopShareSheet",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "subject",
                "type": "any",
                "attribute": "subject",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "ShareSubject",
                    "resolved": "any",
                    "references": {
                        "ShareSubject": {
                            "location": "global",
                            "id": "global::ShareSubject"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "What is being shared. Free-form `kind` \u2014 this component stays domain-free."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "acl",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "AclEntry[]",
                    "resolved": "AclEntry[]",
                    "references": {
                        "AclEntry": {
                            "location": "global",
                            "id": "global::AclEntry"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The current access-control list."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "people",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "Member[]",
                    "resolved": "Member[]",
                    "references": {
                        "Member": {
                            "location": "global",
                            "id": "global::Member"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "People the host can resolve, for names and the add-person picker."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "groups",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "Group[]",
                    "resolved": "Group[]",
                    "references": {
                        "Group": {
                            "location": "global",
                            "id": "global::Group"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Groups the host can resolve. An acl group missing here renders as deleted."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "canEdit",
                "type": "boolean",
                "attribute": "can-edit",
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
                    "text": "False \u21D2 the whole sheet is read-only."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "linkEnabled",
                "type": "boolean",
                "attribute": "link-enabled",
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
                    "text": "Phase 2 \u2014 public link. Rendered disabled in V1."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "linkUrl",
                "type": "string",
                "attribute": "link-url",
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
                    "text": "Phase 2 \u2014 the public link URL."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "redaction",
                "type": "any",
                "attribute": "redaction",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Record<string, unknown>",
                    "resolved": "any",
                    "references": {
                        "Record": {
                            "location": "global",
                            "id": "global::Record"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Host-owned redaction settings, passed through untouched."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "expanded"
            }, {
                "name": "pendingUid"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popAclChange",
                "method": "popAclChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The FULL replacement acl. Never a patch."
                },
                "complexType": {
                    "original": "AclChangeDetail",
                    "resolved": "AclChangeDetail",
                    "references": {
                        "AclChangeDetail": {
                            "location": "global",
                            "id": "global::AclChangeDetail"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popLinkToggle",
                "method": "popLinkToggle",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Phase 2 \u2014 emitted when the public link switch flips."
                },
                "complexType": {
                    "original": "LinkToggleDetail",
                    "resolved": "LinkToggleDetail",
                    "references": {
                        "LinkToggleDetail": {
                            "location": "global",
                            "id": "global::LinkToggleDetail"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popRedactionChange",
                "method": "popRedactionChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the host-owned redaction settings change."
                },
                "complexType": {
                    "original": "RedactionChangeDetail",
                    "resolved": "RedactionChangeDetail",
                    "references": {
                        "RedactionChangeDetail": {
                            "location": "global",
                            "id": "global::RedactionChangeDetail"
                        }
                    }
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-SHARE-SHEET",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/share-sheet/share-sheet.css",
                        "relativePath": "share-sheet.css",
                        "originalComponentPath": "share-sheet.css"
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
        "htmlAttrNames": ["class", "role", "aria-label", "key", "type", "disabled", "aria-pressed", "onClick", "title", "name", "aria-hidden", "onChange", "value", "aria-disabled", "aria-expanded", "checked", "label"],
        "htmlTagNames": ["div", "button", "ion-icon", "section", "h3", "p", "span", "select", "option", "ul", "li", "pop-switch", "header"],
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
//# sourceMappingURL=share-sheet.js.map