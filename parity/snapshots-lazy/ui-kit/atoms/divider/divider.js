import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
export const EmailDivider = class {
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
};
//# sourceMappingURL=divider.js.map