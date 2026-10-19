import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { Host, h } from "@stencil/core/runtime/server";
import PopIconStyle0 from "./ui-kit/atoms/icon/icon.css?tag=pop-icon&encapsulation=scoped";
/**
 * @name pop-icon
 * @description A perfectly-centered icon atom that wraps `ion-icon`. Unlike a
 * bare `ion-icon`, it renders as a centered inline-flex block with
 * `line-height: 0`, so the glyph never picks up inline/baseline offset.
 *
 * Sizing: the icon inherits `1em` from the host font-size, so callers can size
 * it with CSS `font-size` or the `--size` custom property. The optional `size`
 * prop sets `font-size` on the host directly.
 */
export class Icon {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-icon",
        "$members$": {
            "name": [1],
            "src": [1],
            "size": [1],
            "label": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=icon.js.map