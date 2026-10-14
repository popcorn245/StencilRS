import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopViewSwitcherStyle0 from "./ui-kit/molecules/view-switcher/view-switcher.css?tag=pop-view-switcher&encapsulation=scoped";
const VIEW_META = {
    list: { icon: 'list', label: 'List view' },
    card: { icon: 'grid', label: 'Card view' },
    kanban: { icon: 'albums-outline', label: 'Kanban view' },
    table: { icon: 'reorder-four-outline', label: 'Table view' },
};
const PopViewSwitcher = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_defineCustomElement(PopViewSwitcher, [514, "pop-view-switcher", {
        "views": [1],
        "value": [1],
        "parsed": [32]
    }, undefined, {
        "views": [{
                "parseViews": 0
            }]
    }]);
//# sourceMappingURL=view-switcher.js.map