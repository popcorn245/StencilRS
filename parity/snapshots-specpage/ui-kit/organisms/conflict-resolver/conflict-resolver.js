import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopConflictResolver = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.resolve = __stencil_createEvent(this, "resolve", 7);
        this.dismissConflict = __stencil_createEvent(this, "dismissConflict", 7);
    }
    /** JSON string of the local version of the document */
    local = '{}';
    /** JSON string of the remote version of the document */
    remote = '{}';
    /** Human-readable label for the document (e.g. "Note · abc123…") */
    label = 'Document';
    /** Emitted when user picks keep_local or use_remote */
    resolve;
    /** Emitted when user dismisses without resolving */
    dismissConflict;
    get localObj() {
        try {
            return JSON.parse(this.local);
        }
        catch {
            return {};
        }
    }
    get remoteObj() {
        try {
            return JSON.parse(this.remote);
        }
        catch {
            return {};
        }
    }
    /** Returns keys that differ between local and remote */
    get diffKeys() {
        const l = this.localObj;
        const r = this.remoteObj;
        const allKeys = new Set([...Object.keys(l), ...Object.keys(r)]);
        // Ignore internal sync fields
        const ignore = new Set(['_syncedAt', '_localId', 'id']);
        return [...allKeys].filter((k) => !ignore.has(k) && JSON.stringify(l[k]) !== JSON.stringify(r[k]));
    }
    renderValue(val) {
        if (val === undefined)
            return '(missing)';
        if (val === null)
            return '(null)';
        if (typeof val === 'object')
            return JSON.stringify(val);
        return String(val);
    }
    render() {
        const diff = this.diffKeys;
        const local = this.localObj;
        const remote = this.remoteObj;
        return (h("div", { key: '0', class: "cr-root" },
            h("div", { key: '1', class: "cr-header" },
                h("span", { key: '2', class: "cr-icon" }, "\u26A1"),
                h("div", { key: '3' },
                    h("div", { key: '4', class: "cr-title" }, "Sync conflict"),
                    h("div", { key: '5', class: "cr-label" }, this.label)),
                h("button", { key: '6', class: "cr-dismiss", type: "button", onClick: () => this.dismissConflict.emit(), title: "Dismiss" }, "\u2715")),
            diff.length === 0 ? (h("p", { class: "cr-no-diff" }, "No visible differences found.")) : (h("div", { class: "cr-diff" },
                h("div", { class: "cr-diff-header" },
                    h("span", null),
                    h("span", { class: "cr-col-label cr-mine" }, "Mine"),
                    h("span", { class: "cr-col-label cr-incoming" }, "Incoming")),
                diff.map((key) => (h("div", { class: "cr-diff-row", key: key },
                    h("span", { class: "cr-field" }, key),
                    h("span", { class: "cr-val cr-val--local" }, this.renderValue(local[key])),
                    h("span", { class: "cr-val cr-val--remote" }, this.renderValue(remote[key]))))))),
            h("div", { key: '7', class: "cr-actions" },
                h("button", { key: '8', class: "cr-btn cr-btn--local", type: "button", onClick: () => this.resolve.emit('keep_local') }, "Keep mine"),
                h("button", { key: '9', class: "cr-btn cr-btn--remote", type: "button", onClick: () => this.resolve.emit('use_remote') }, "Use incoming"))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-conflict-resolver",
        "componentClassName": "PopConflictResolver",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "local",
                "type": "string",
                "attribute": "local",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'{}'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON string of the local version of the document"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "remote",
                "type": "string",
                "attribute": "remote",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'{}'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON string of the remote version of the document"
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
                "defaultValue": "'Document'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Human-readable label for the document (e.g. \"Note \u00B7 abc123\u2026\")"
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
                "name": "resolve",
                "method": "resolve",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when user picks keep_local or use_remote"
                },
                "complexType": {
                    "original": "ConflictResolution",
                    "resolved": "\"keep_local\" | \"use_remote\"",
                    "references": {
                        "ConflictResolution": {
                            "location": "local",
                            "path": "ui-kit/organisms/conflict-resolver/conflict-resolver.tsx",
                            "id": "ui-kit/organisms/conflict-resolver/conflict-resolver.tsx::ConflictResolution"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "dismissConflict",
                "method": "dismissConflict",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when user dismisses without resolving"
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
                "styleId": "POP-CONFLICT-RESOLVER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/conflict-resolver/conflict-resolver.css",
                        "relativePath": "conflict-resolver.css",
                        "originalComponentPath": "conflict-resolver.css"
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
        "hasPropBoolean": false,
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
        "htmlAttrNames": ["key", "class", "type", "onClick", "title"],
        "htmlTagNames": ["div", "span", "button", "p"],
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
//# sourceMappingURL=conflict-resolver.js.map