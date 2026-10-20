import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
export const EmailButton = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.buttonChange = __stencil_createEvent(this, "buttonChange", 7);
    }
    /** Button label text */
    text = 'Click Here';
    /** Button link URL */
    url = '#';
    /** Horizontal alignment: left, center, right */
    alignment = 'center';
    /** Button background color */
    backgroundColor = '#7c3aed';
    /** Button text color */
    textColor = '#ffffff';
    /** Border radius in pixels */
    borderRadius = 4;
    /** Read-only mode */
    readonly = false;
    /** Emitted when button properties change */
    buttonChange;
    render() {
        return (h(Host, { key: '0', style: { textAlign: this.alignment, display: 'block', padding: '8px 0' } },
            h("a", { key: '1', href: this.readonly ? this.url : undefined, style: {
                    display: 'inline-block',
                    padding: '10px 24px',
                    background: this.backgroundColor,
                    color: this.textColor,
                    borderRadius: `${this.borderRadius}px`,
                    textDecoration: 'none',
                    fontWeight: '600',
                    cursor: this.readonly ? 'pointer' : 'text',
                    minWidth: '100px',
                    textAlign: 'center',
                } }, this.text)));
    }
};
__stencil_proxyCustomElement(EmailButton, [512, "pop-button", {
        "text": [1],
        "url": [1],
        "alignment": [1],
        "backgroundColor": [1, "background-color"],
        "textColor": [1, "text-color"],
        "borderRadius": [2, "border-radius"],
        "readonly": [4]
    }]);
//# sourceMappingURL=button.js.map