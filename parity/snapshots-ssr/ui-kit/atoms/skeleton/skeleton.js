import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h, Host } from "@stencil/core/runtime/server";
import PopSkeletonStyle0 from "./ui-kit/atoms/skeleton/skeleton.css?tag=pop-skeleton&encapsulation=scoped";
/**
 * pop-skeleton — a single shimmer placeholder block (atom). Compose several to
 * build a content-shaped loading state (a skeleton that mirrors the real row's
 * silhouette reads far better than a spinner). Size it with the `w` / `h` props
 * (any CSS length; `w` defaults to 100%), round it with `radius`, or make it a
 * circle with `circle` (uses `h` for both dimensions — for avatars / status
 * dots).
 *
 * Always decorative: `aria-hidden`. Wrap a group in a `role="status"` region so
 * assistive tech announces the load once, not per block.
 */
export class PopSkeleton {
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
    static get style() { return PopSkeletonStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-skeleton",
        "$members$": {
            "w": [1],
            "h": [1],
            "radius": [1],
            "circle": [4]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=skeleton.js.map