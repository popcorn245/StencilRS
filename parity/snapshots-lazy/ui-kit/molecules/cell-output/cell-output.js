import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h, Host } from "@stencil/core/runtime/client/standalone";
import PopCellOutputStyle0 from "./ui-kit/molecules/cell-output/cell-output.css?tag=pop-cell-output&encapsulation=scoped";
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
};
CellOutput.style = PopCellOutputStyle0();
//# sourceMappingURL=cell-output.js.map