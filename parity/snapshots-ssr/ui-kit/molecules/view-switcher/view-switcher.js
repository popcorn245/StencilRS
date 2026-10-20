import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopViewSwitcherStyle0 from "./ui-kit/molecules/view-switcher/view-switcher.css?tag=pop-view-switcher&encapsulation=scoped";
const VIEW_META = {
    list: { icon: 'list', label: 'List view' },
    card: { icon: 'grid', label: 'Card view' },
    kanban: { icon: 'albums-outline', label: 'Kanban view' },
    table: { icon: 'reorder-four-outline', label: 'Table view' },
};
/**
 * `pop-view-switcher` — the segmented list/card view toggle, generalized to any
 * subset of list · card · kanban · table.
 *
 * Each option is a square icon-only button with a centered `pop-icon` and
 * `aria-pressed`, inside a compact segmented container. Deliberately NOT
 * `role="group"` — pico.css styles [role=group] as a full-width stretched
 * button group.
 *
 * CONTROLLED: the host passes `value` and reacts to `viewChange`.
 * Expected adopters: the hub photos/tasks/inventory/images dialogs (usually
 * via the `pop-list-filter-sort` organism).
 *
 * @example
 * <pop-view-switcher views='["list","card"]' value="list"></pop-view-switcher>
 */
export class PopViewSwitcher {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.viewChange = __stencil_createEvent(this, "viewChange", 7);
    }
    /** JSON array of views to offer, from 'list' | 'card' | 'kanban' | 'table'. */
    views = '["list","card"]';
    /** The current view. */
    value = '';
    /** The user picked a view. Detail = the new view name. */
    viewChange;
    /** Parsed + validated view list. */
    parsed = [];
    parseViews(json) {
        try {
            const arr = JSON.parse(json ?? this.views);
            if (!Array.isArray(arr)) {
                this.parsed = [];
                return;
            }
            this.parsed = arr.filter((v) => typeof v === 'string' && v in VIEW_META);
        }
        catch {
            this.parsed = [];
        }
    }
    componentWillLoad() {
        this.parseViews();
    }
    pick(view) {
        if (view === this.value)
            return;
        this.viewChange.emit(view);
    }
    render() {
        if (this.parsed.length === 0)
            return null;
        return (h("div", { class: "pvs", "aria-label": "View mode" }, this.parsed.map((v) => (h("button", { type: "button", key: v, class: { pvs__btn: true, 'pvs__btn--on': this.value === v }, "aria-pressed": this.value === v ? 'true' : 'false', "aria-label": VIEW_META[v].label, title: VIEW_META[v].label, onClick: () => this.pick(v) },
            h("pop-icon", { name: VIEW_META[v].icon }))))));
    }
    static get watchers() { return {
        "views": [{
                "parseViews": 0
            }]
    }; }
    static get style() { return PopViewSwitcherStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-view-switcher",
        "$members$": {
            "views": [1],
            "value": [1],
            "parsed": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=view-switcher.js.map