import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopIconStyle0 from "./ui-kit/atoms/icon/icon.css?tag=pop-icon&encapsulation=scoped";
const Icon = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    /** The ionicon name (e.g. "close", "checkmark", "add"). */
    name;
    /** Pass-through SVG src URL (alternative to `name`). */
    src;
    /**
     * Optional explicit size; sets `font-size` on the host (e.g. "1.2rem",
     * "20px"). When omitted the icon inherits `1em` from the host font-size,
     * which can also be driven via the `--size` custom property.
     */
    size;
    /**
     * Accessible label. When present, the icon exposes `aria-label` + `role="img"`;
     * otherwise it is marked `aria-hidden="true"`.
     */
    label;
    render() {
        const hasLabel = !!this.label;
        // Centering + sizing are mirrored inline so the host is a perfectly-centered,
        // VISIBLE block even though this is a scoped component (`:host` css doesn't
        // apply in scoped mode). font-size falls back to `var(--size, 1.25rem)` — NOT
        // inherit — so an icon-only button that sets `font-size: 0` (to hide text)
        // can't collapse the glyph to 0. An explicit `size` prop wins.
        const style = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '0',
            fontSize: this.size || 'var(--size, 1.25rem)',
        };
        return (h(Host, { key: '0', class: "pop-icon", style: style, role: hasLabel ? 'img' : undefined, "aria-label": hasLabel ? this.label : undefined, "aria-hidden": hasLabel ? undefined : 'true' },
            h("ion-icon", { key: '1', class: "pop-icon__glyph", name: this.name, src: this.src, "aria-hidden": "true" })));
    }
    static get style() { return PopIconStyle0(); }
};
__stencil_defineCustomElement(Icon, [514, "pop-icon", {
        "name": [1],
        "src": [1],
        "size": [1],
        "label": [1]
    }]);
//# sourceMappingURL=icon.js.map