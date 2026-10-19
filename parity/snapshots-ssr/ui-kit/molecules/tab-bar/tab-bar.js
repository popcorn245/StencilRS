import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopTabBarStyle0 from "./ui-kit/molecules/tab-bar/tab-bar.css?tag=pop-tab-bar&encapsulation=scoped";
/**
 * `pop-tab-bar` — the shared tab row with optional per-tab count bubbles and
 * icons.
 *
 * COMPACT variant (`compact`): when the bar's own width falls under 480px
 * (a container query — panel width, not viewport), inactive tabs collapse to
 * icon + count with the label visually hidden; the ACTIVE tab keeps its label.
 * This keeps five tabs visible on a phone without horizontal scroll. Tabs
 * without an `icon` keep their label (there'd be nothing left to show).
 * Browsers without container-query support just keep the full labels.
 */
export class TabBar {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popTabChange = __stencil_createEvent(this, "popTabChange", 7);
    }
    tabs = '[]';
    activeTab;
    scrollable = false;
    /** Collapse inactive tabs to icon + count when the bar is narrower than
     *  480px (needs per-tab `icon`s). */
    compact = false;
    popTabChange;
    get parsedTabs() {
        try {
            return JSON.parse(this.tabs);
        }
        catch {
            return [];
        }
    }
    handleClick(value) {
        this.activeTab = value;
        this.popTabChange.emit({ value });
    }
    render() {
        const tabs = this.parsedTabs;
        return (h("div", { key: '0', class: { 'tb-wrap': true, 'tb-wrap--compact': this.compact } },
            h("div", { key: '1', class: { 'tb-bar': true, 'tb-bar--scrollable': this.scrollable }, role: "tablist" }, tabs.map((tab) => (h("button", { class: {
                    'tb-tab': true,
                    'tb-tab--active': this.activeTab === tab.value,
                    'tb-tab--iconed': !!tab.icon,
                }, role: "tab", "aria-selected": String(this.activeTab === tab.value), "aria-label": tab.label, title: tab.label, onClick: () => this.handleClick(tab.value) },
                tab.icon && h("pop-icon", { class: "tb-tab-icon", name: tab.icon }),
                h("span", { class: "tb-tab-label" }, tab.label),
                typeof tab.count === 'number' && h("span", { class: "tb-tab-count" }, tab.count)))))));
    }
    static get style() { return PopTabBarStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-tab-bar",
        "$members$": {
            "tabs": [1],
            "activeTab": [1537, "active-tab"],
            "scrollable": [4],
            "compact": [4]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["activeTab", "active-tab"]]
    }; }
}
//# sourceMappingURL=tab-bar.js.map