import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
export const EmailDivider = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_proxyCustomElement(EmailDivider, [512, "pop-divider", {
        "lineStyle": [1, "line-style"],
        "color": [1],
        "width": [1],
        "padding": [2]
    }]);
//# sourceMappingURL=divider.js.map