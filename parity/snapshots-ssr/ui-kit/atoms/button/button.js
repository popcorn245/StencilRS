import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { Host, h } from "@stencil/core/runtime/server";
/**
 * @name pop-button
 * @description A CTA button component for email templates. Renders a styled
 * button link that maps to MJML's <mj-button> element.
 */
export class EmailButton {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "pop-button",
        "$members$": {
            "text": [1],
            "url": [1],
            "alignment": [1],
            "backgroundColor": [1, "background-color"],
            "textColor": [1, "text-color"],
            "borderRadius": [2, "border-radius"],
            "readonly": [4]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=button.js.map