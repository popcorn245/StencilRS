import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h, Host } from "@stencil/core/testing";
export const CellOutput = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** Cell run status. */
    status = 'idle';
    /** Jupyter-style execution count. 0 → not yet run. */
    count = 0;
    /** Wall-clock ms for the last run (footer hint). */
    ms;
    /** Ordered output entries; accepts a JSON string (attribute) or an array. */
    items = [];
    parseItems() {
        const v = this.items;
        if (Array.isArray(v))
            return v;
        if (typeof v === 'string' && v.trim()) {
            try {
                const parsed = JSON.parse(v);
                return Array.isArray(parsed) ? parsed : [];
            }
            catch {
                return [];
            }
        }
        return [];
    }
    /** The [N] / [*] / [ ] prompt label. */
    prompt() {
        if (this.status === 'running')
            return '[*]';
        if (this.count > 0)
            return `[${this.count}]`;
        return '[ ]';
    }
    renderItem(item, i) {
        if (item.kind === 'display' && item.html != null) {
            // Opt-in HTML — render inside a sandboxed, scriptless, opaque-origin frame.
            // The host doc is NEVER given the raw HTML; it lives behind the frame.
            const safeDoc = '<!DOCTYPE html><html><head>' +
                '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\';">' +
                '<style>body{margin:0;font:14px/1.5 system-ui,sans-serif;color:#222;}</style>' +
                '</head><body>' +
                item.html +
                '</body></html>';
            return (h("iframe", { key: i, class: "co__html", sandbox: "", srcdoc: safeDoc, title: "cell HTML output", loading: "lazy" }));
        }
        const text = item.kind === 'display' ? (item.text ?? '') : item.text ?? '';
        const cls = {
            co__line: true,
            [`co__line--${item.kind}`]: true,
        };
        return (h("div", { class: cls, key: i },
            (item.kind === 'warn' || item.kind === 'error') && (h("span", { class: "co__icon", "aria-hidden": "true" },
                h("pop-brand-icon", { name: item.kind === 'error' ? 'close' : 'warning' }))),
            h("span", { class: "co__text" }, text),
            item.kind === 'error' && item.stack ? (h("details", { class: "co__stack" },
                h("summary", null, "stack"),
                h("pre", { class: "co__stack-pre" }, item.stack))) : null));
    }
    render() {
        const items = this.parseItems();
        const hasError = this.status === 'error' || items.some((it) => it.kind === 'error');
        const empty = items.length === 0;
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: {
                    co: true,
                    'co--running': this.status === 'running',
                    'co--error': hasError,
                    'co--empty': empty,
                }, role: "region", "aria-label": `Cell output ${this.prompt()}`, "aria-busy": this.status === 'running' ? 'true' : 'false' },
                h("div", { key: '2', class: "co__gutter", "aria-hidden": "true" },
                    h("span", { key: '3', class: "co__prompt" }, this.prompt())),
                h("div", { key: '4', class: "co__body", "aria-live": "polite", "aria-atomic": "false" },
                    this.status === 'running' && empty ? (h("div", { class: "co__line co__line--muted" },
                        h("span", { class: "co__spin", "aria-hidden": "true" }),
                        h("span", { class: "co__text" }, "Running in sandbox\u2026"))) : empty ? (h("div", { class: "co__line co__line--muted" },
                        h("span", { class: "co__text" }, "No output"))) : (items.map((it, i) => this.renderItem(it, i))),
                    this.ms != null && this.status !== 'running' && !empty ? (h("div", { class: "co__meta" },
                        "\u2014 ",
                        this.ms,
                        "ms")) : null))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-cell-output",
        "componentClassName": "CellOutput",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "status",
                "type": "string",
                "attribute": "status",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'idle'",
                "complexType": {
                    "original": "CellStatus",
                    "resolved": "\"done\" | \"error\" | \"idle\" | \"running\"",
                    "references": {
                        "CellStatus": {
                            "location": "local",
                            "path": "ui-kit/molecules/cell-output/cell-output.tsx",
                            "id": "ui-kit/molecules/cell-output/cell-output.tsx::CellStatus"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Cell run status."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "count",
                "type": "number",
                "attribute": "count",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Jupyter-style execution count. 0 \u2192 not yet run."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "ms",
                "type": "number",
                "attribute": "ms",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "number",
                    "resolved": "number | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Wall-clock ms for the last run (footer hint)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "items",
                "type": "string",
                "attribute": "items",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "string | CellItem[]",
                    "resolved": "string | {}",
                    "references": {
                        "CellItem": {
                            "location": "local",
                            "path": "ui-kit/molecules/cell-output/cell-output.tsx",
                            "id": "ui-kit/molecules/cell-output/cell-output.tsx::CellItem"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Ordered output entries; accepts a JSON string (attribute) or an array."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [],
        "events": [],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-CELL-OUTPUT",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/cell-output/cell-output.css",
                        "relativePath": "cell-output.css",
                        "originalComponentPath": "cell-output.css"
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
        "hasEvent": false,
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
        "hasPropNumber": true,
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
        "hasVdomListener": false,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "sandbox", "srcdoc", "title", "loading", "aria-hidden", "name", "role", "aria-label", "aria-busy", "aria-live", "aria-atomic"],
        "htmlTagNames": ["iframe", "div", "span", "pop-brand-icon", "details", "summary", "pre"],
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
//# sourceMappingURL=cell-output.js.map