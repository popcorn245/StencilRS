import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopAvatarStyle0 from "./ui-kit/atoms/avatar/avatar.css?tag=pop-avatar&encapsulation=scoped";
export const Avatar = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
    static get style() { return PopAvatarStyle0(); }
};
__stencil_proxyCustomElement(Avatar, [514, "pop-avatar", {
        "src": [1],
        "initials": [1],
        "icon": [1],
        "color": [1],
        "size": [1],
        "selected": [4],
        "name": [1],
        "imgError": [32]
    }, undefined, {
        "src": [{
                "resetImgError": 0
            }]
    }]);
//# sourceMappingURL=avatar.js.map