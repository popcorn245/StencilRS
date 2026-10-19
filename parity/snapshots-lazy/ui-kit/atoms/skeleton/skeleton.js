import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h, Host } from "@stencil/core/runtime/client/standalone";
import PopSkeletonStyle0 from "./ui-kit/atoms/skeleton/skeleton.css?tag=pop-skeleton&encapsulation=scoped";
export const PopSkeleton = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
};
PopSkeleton.style = PopSkeletonStyle0();
//# sourceMappingURL=skeleton.js.map