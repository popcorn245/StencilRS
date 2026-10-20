import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopConflictResolverStyle0 from "./ui-kit/organisms/conflict-resolver/conflict-resolver.css?tag=pop-conflict-resolver&encapsulation=scoped";
export class PopConflictResolver {
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
    static get style() { return PopConflictResolverStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-conflict-resolver",
        "$members$": {
            "local": [1],
            "remote": [1],
            "label": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=conflict-resolver.js.map