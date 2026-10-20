import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { Host, h } from "@stencil/core/runtime/server";
/**
 * @name pop-divider
 * @description A horizontal divider component for email templates. Renders a
 * styled horizontal rule that maps to MJML's <mj-divider> element.
 */
export class EmailDivider {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** Line style: solid, dashed, dotted */
    lineStyle = 'solid';
    /** Line color */
    color = '#dddddd';
    /** Line width as CSS value */
    width = '100%';
    /** Vertical padding in pixels */
    padding = 10;
    render() {
        return (h(Host, { key: '0', style: { display: 'block', padding: `${this.padding}px 0` } },
            h("hr", { key: '1', style: {
                    border: 'none',
                    borderTop: `2px ${this.lineStyle} ${this.color}`,
                    width: this.width,
                    margin: '0 auto',
                } })));
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "pop-divider",
        "$members$": {
            "lineStyle": [1, "line-style"],
            "color": [1],
            "width": [1],
            "padding": [2]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=divider.js.map