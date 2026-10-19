import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h, Host } from "@stencil/core/runtime/client/standalone";
import PopSidebarStyle0 from "./ui-kit/organisms/Sidebar/sidebar.css?tag=pop-sidebar&encapsulation=scoped";
export const PopSidebar = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /**
     * Whether the sidebar is open
     */
    open = false;
    /**
     * Which side the sidebar should appear on
     */
    side = 'left';
    toggle = () => {
        this.open = !this.open;
    };
    render() {
        return (h(Host, { key: '0', class: { 'sidebar-open': this.open, [`sidebar-${this.side}`]: true } },
            h("input", { key: '1', type: "checkbox", class: "sidebar-checkbox", checked: this.open, onChange: this.toggle, id: "pop-sidebar-toggle" // ID might need uniqueness if multiple, but specific req was basic
             }),
            h("aside", { key: '2', class: "sidebar-content" },
                h("slot", { key: '3', name: "sidebar" })),
            h("label", { key: '4', htmlFor: "pop-sidebar-toggle", class: "sidebar-overlay", onClick: () => this.open = false }),
            h("main", { key: '5', class: "main-content" },
                h("label", { key: '6', htmlFor: "pop-sidebar-toggle", class: "sidebar-trigger" },
                    h("slot", { key: '7', name: "trigger" }, "\u2630")),
                h("slot", { key: '8' }))));
    }
};
PopSidebar.style = PopSidebarStyle0();
//# sourceMappingURL=sidebar.js.map