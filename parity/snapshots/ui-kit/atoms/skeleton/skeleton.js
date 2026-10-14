import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h, Host } from "@stencil/core/runtime/client/standalone";
import PopSkeletonStyle0 from "./ui-kit/atoms/skeleton/skeleton.css?tag=pop-skeleton&encapsulation=scoped";
const PopSkeleton = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    /** Width (any CSS length). Ignored when `circle`. Default 100%. */
    w;
    /** Height (any CSS length). Default 0.75rem. */
    h;
    /** Corner radius (any CSS length). Default var(--radius-sm). */
    radius;
    /** Render a circle sized `h × h` (avatars, status dots). */
    circle = false;
    render() {
        const size = this.h || '0.75rem';
        const style = {
            height: size,
            width: this.circle ? size : this.w || '100%',
            borderRadius: this.circle ? '999px' : this.radius || 'var(--radius-sm, 6px)',
        };
        return h(Host, { key: '0', class: "pop-skeleton", "aria-hidden": "true", style: style });
    }
    static get style() { return PopSkeletonStyle0(); }
};
__stencil_defineCustomElement(PopSkeleton, [514, "pop-skeleton", {
        "w": [1],
        "h": [1],
        "radius": [1],
        "circle": [4]
    }]);
//# sourceMappingURL=skeleton.js.map