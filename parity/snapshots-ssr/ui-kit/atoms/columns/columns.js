import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { Host, h } from "@stencil/core/runtime/server";
/**
 * @name pop-columns
 * @description A multi-column layout component for email templates. Maps to
 * MJML's <mj-section><mj-column> structure for responsive email layouts.
 */
export class EmailColumns {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** JSON stringified column definitions with widths */
    columns = '[]';
    render() {
        let parsedColumns = [];
        try {
            parsedColumns = JSON.parse(this.columns);
        }
        catch {
            parsedColumns = [];
        }
        return (h(Host, { key: '0', style: { display: 'block' } },
            h("div", { key: '1', style: {
                    display: 'flex',
                    gap: '8px',
                    minHeight: '60px',
                } }, parsedColumns.map((col) => (h("div", { style: {
                    flex: `0 0 ${col.width}`,
                    maxWidth: col.width,
                    border: '1px dashed #e2e8f0',
                    borderRadius: '4px',
                    padding: '8px',
                    minHeight: '40px',
                } }, col.content || ''))))));
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "pop-columns",
        "$members$": {
            "columns": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=columns.js.map