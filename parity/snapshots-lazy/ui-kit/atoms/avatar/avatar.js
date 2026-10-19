import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopAvatarStyle0 from "./ui-kit/atoms/avatar/avatar.css?tag=pop-avatar&encapsulation=scoped";
export const Avatar = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    src;
    initials;
    icon = '👤';
    color;
    size = 'md';
    selected = false;
    name;
    /** Set when the <img> fails to load so we fall back to initials/icon. */
    imgError = false;
    resetImgError() {
        // A new src deserves a fresh load attempt.
        this.imgError = false;
    }
    renderContent() {
        if (this.src && !this.imgError) {
            return (h("img", { src: this.src, alt: this.name || 'Avatar', onError: () => (this.imgError = true) }));
        }
        if (this.initials) {
            return h("span", null, this.initials);
        }
        return h("span", { class: "avatar-icon" }, this.icon);
    }
    render() {
        return (h("div", { key: '0', class: {
                'avatar': true,
                [`avatar--${this.size}`]: true,
                'avatar--selected': this.selected,
            }, style: { '--avatar-color': this.color }, title: this.name, role: "img", "aria-label": this.name || 'Avatar' }, this.renderContent()));
    }
    static get watchers() { return {
        "src": [{
                "resetImgError": 0
            }]
    }; }
};
Avatar.style = PopAvatarStyle0();
//# sourceMappingURL=avatar.js.map