import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopAppShellStyle0 from "./ui-kit/organisms/app-shell/app-shell.css?tag=pop-app-shell&encapsulation=scoped";
export const AppShell = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    /** Page title rendered in the header. */
    heading;
    /** Optional leading `pop-brand-icon` name shown before the title. */
    iconName;
    /** Heading level for the title (a11y). */
    headingLevel = 1;
    /** Constrain the body to a readable column and center it (Settings). */
    centered = false;
    /** Render no header chrome — just the flex/scroll frame. */
    bare = false;
    render() {
        const Title = `h${this.headingLevel}`;
        return (h("div", { key: '0', class: { 'shell': true, 'shell--centered': this.centered, 'shell--bare': this.bare } },
            !this.bare && (h("header", { key: '1', class: "shell__head" },
                h(Title, { key: '2', class: "shell__title" },
                    this.iconName && (h("span", { key: '3', class: "shell__title-icon", "aria-hidden": "true" },
                        h("pop-brand-icon", { key: '4', name: this.iconName }))),
                    h("span", { key: '5', class: "shell__title-text" }, this.heading),
                    h("span", { key: '6', class: "shell__context" },
                        h("slot", { key: '7', name: "context" }))),
                h("div", { key: '8', class: "shell__actions" },
                    h("slot", { key: '9', name: "actions" })))),
            h("div", { key: 'a', class: "shell__body" },
                h("slot", { key: 'b' }))));
    }
    static get style() { return PopAppShellStyle0(); }
};
__stencil_proxyCustomElement(AppShell, [774, "pop-app-shell", {
        "heading": [1],
        "iconName": [1, "icon-name"],
        "headingLevel": [2, "heading-level"],
        "centered": [4],
        "bare": [4]
    }]);
//# sourceMappingURL=app-shell.js.map