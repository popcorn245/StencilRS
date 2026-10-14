import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopFilterBarStyle0 from "./ui-kit/molecules/filter-bar/filter-bar.css?tag=pop-filter-bar";
const PopFilterBar = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popFilterChange = __stencil_createEvent(this, "popFilterChange", 7);
    }
    get el() { return this; }
    /** JSON array of FilterDef objects */
    filters = '[]';
    /** URL to the filter icon SVG. Defaults to the app's funnel-outline icon. */
    iconSrc = '/images/icon/funnel-outline.svg';
    /** Raw SVG string for the filter icon. If provided, overrides iconSrc. */
    iconSvg = '';
    /** Emitted when a filter value changes. Detail: `{ id: string, value: string }` */
    popFilterChange;
    isOpen = false;
    _filters = [];
    filtersChanged(newVal) {
        try {
            this._filters = JSON.parse(newVal);
        }
        catch {
            this._filters = [];
        }
    }
    componentWillLoad() {
        this.filtersChanged(this.filters);
    }
    componentDidLoad() {
        document.addEventListener('click', this.onDocClick);
    }
    disconnectedCallback() {
        document.removeEventListener('click', this.onDocClick);
    }
    onDocClick = (e) => {
        if (this.isOpen && !this.el.contains(e.target)) {
            this.isOpen = false;
        }
    };
    toggle = (e) => {
        e.stopPropagation();
        this.isOpen = !this.isOpen;
    };
    change(id, value) {
        this._filters = this._filters.map(f => f.id === id ? { ...f, value } : f);
        this.popFilterChange.emit({ id, value });
    }
    dismiss(id) {
        const filter = this._filters.find(f => f.id === id);
        if (!filter)
            return;
        this.change(id, filter.defaultValue ?? '');
    }
    get activeChips() {
        return this._filters.filter(f => {
            const def = f.defaultValue ?? '';
            return f.value !== '' && f.value !== def;
        });
    }
    get activeCount() {
        return this.activeChips.length;
    }
    render() {
        const chips = this.activeChips;
        return (h("div", { key: '0', class: "pfb-root" },
            h("div", { key: '1', class: "pfb-trigger-wrap" },
                h("button", { key: '2', class: `pfb-trigger${this.activeCount > 0 ? ' has-active' : ''}${this.isOpen ? ' is-open' : ''}`, type: "button", "aria-expanded": this.isOpen ? 'true' : 'false', "aria-haspopup": "dialog", onClick: this.toggle },
                    this.iconSvg ? (h("div", { class: "pfb-icon-svg", innerHTML: this.iconSvg })) : this.iconSrc ? (h("img", { class: "pfb-icon", src: this.iconSrc, width: "14", height: "14", "aria-hidden": "true", alt: "" })) : (h("svg", { class: "pfb-icon", width: "14", height: "14", viewBox: "0 0 512 512", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "32", "aria-hidden": "true" },
                        h("path", { d: "M32 144h448M112 256h288M208 368h96" }))),
                    "Filters",
                    this.activeCount > 0 && h("span", { key: '3', class: "pfb-badge" }, this.activeCount)),
                this.isOpen && (h("div", { key: '4', class: "pfb-popover", role: "dialog", "aria-label": "Filter options" },
                    this._filters.map(filter => (h("div", { key: filter.id, class: "pfb-group" },
                        h("label", { class: "pfb-group-label" }, filter.label),
                        h("div", { class: "pfb-options" }, filter.options.map(opt => (h("button", { key: opt.value, type: "button", class: `pfb-option${opt.value === filter.value ? ' selected' : ''}`, onClick: () => this.change(filter.id, opt.value) }, opt.label))))))),
                    h("button", { key: '5', class: "pfb-done", type: "button", onClick: () => { this.isOpen = false; } }, "Done")))),
            chips.length > 0 && (h("div", { key: '6', class: "pfb-chips" }, chips.map(chip => (h("span", { key: chip.id, class: "pfb-chip" },
                h("span", { class: "pfb-chip-label" }, chip.options.find(o => o.value === chip.value)?.label ?? chip.value),
                h("button", { class: "pfb-chip-dismiss", type: "button", "aria-label": `Remove ${chip.label} filter`, onClick: () => this.dismiss(chip.id) }, "\u00D7"))))))));
    }
    static get watchers() { return {
        "filters": [{
                "filtersChanged": 0
            }]
    }; }
    static get style() { return PopFilterBarStyle0(); }
};
__stencil_defineCustomElement(PopFilterBar, [512, "pop-filter-bar", {
        "filters": [1],
        "iconSrc": [1, "icon-src"],
        "iconSvg": [1, "icon-svg"],
        "isOpen": [32]
    }, undefined, {
        "filters": [{
                "filtersChanged": 0
            }]
    }]);
//# sourceMappingURL=filter-bar.js.map