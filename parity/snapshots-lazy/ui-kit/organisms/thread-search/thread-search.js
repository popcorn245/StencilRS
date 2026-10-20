import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopThreadSearchStyle0 from "./ui-kit/organisms/thread-search/thread-search.css?tag=pop-thread-search&encapsulation=scoped";
const EMPTY_ACTIVE = { cardType: [], sourcePanel: [] };
export const PopThreadSearch = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popSearch = __stencil_createEvent(this, "popSearch", 7);
        this.popResultOpen = __stencil_createEvent(this, "popResultOpen", 7);
    }
    /** Hits, in the order the host wants them shown. Never re-sorted here. */
    results = [];
    /** Counts per facet value. */
    facets = { cardType: {}, sourcePanel: {} };
    /** Facet values currently applied. */
    activeFacets = { cardType: [], sourcePanel: [] };
    /** Optional full facet vocabulary + labels, so zero-count values still render. */
    available;
    /** The query the host last ran. */
    query = '';
    loading = false;
    /** Emitted on submit and on every facet toggle. */
    popSearch;
    /** Emitted when a hit is opened — deep-link to `itemId` inside `threadId`. */
    popResultOpen;
    /** The text in the box. The only state this component owns. */
    draft = '';
    componentWillLoad() {
        this.draft = this.query || '';
    }
    onQueryChange(next) {
        this.draft = next || '';
    }
    active() {
        const a = this.activeFacets || EMPTY_ACTIVE;
        return {
            cardType: Array.isArray(a.cardType) ? a.cardType : [],
            sourcePanel: Array.isArray(a.sourcePanel) ? a.sourcePanel : [],
        };
    }
    submit = (ev) => {
        ev?.preventDefault();
        this.popSearch.emit({ q: this.draft.trim(), facets: this.active() });
    };
    toggleFacet(kind, value) {
        const current = this.active();
        const on = current[kind].includes(value);
        const next = {
            ...current,
            [kind]: on ? current[kind].filter((v) => v !== value) : [...current[kind], value],
        };
        this.popSearch.emit({ q: this.draft.trim(), facets: next });
    }
    /** Facet values to render: the host's vocabulary if given, else the counts. */
    cardTypeValues() {
        if (this.available?.cardType?.length) {
            return this.available.cardType.map((c) => ({ value: c.type, label: c.label || c.type }));
        }
        return Object.keys(this.facets?.cardType || {}).map((t) => ({ value: t, label: t }));
    }
    sourcePanelValues() {
        const list = this.available?.sourcePanel?.length
            ? this.available.sourcePanel
            : Object.keys(this.facets?.sourcePanel || {});
        return list.map((p) => ({ value: p, label: p }));
    }
    renderChipRow(kind, heading, values) {
        if (!values.length)
            return null;
        const counts = (this.facets?.[kind] || {});
        const active = this.active()[kind];
        return (h("div", { class: "tsr__facet" },
            h("span", { class: "tsr__facet-label" }, heading),
            h("div", { class: "tsr__chips" }, values.map((v) => {
                const on = active.includes(v.value);
                return (h("button", { key: `${kind}:${v.value}`, type: "button", class: { tsr__chip: true, 'tsr__chip--on': on }, "aria-pressed": on ? 'true' : 'false', onClick: () => this.toggleFacet(kind, v.value) },
                    v.label,
                    h("span", { class: "tsr__count" }, counts[v.value] ?? 0)));
            }))));
    }
    /** Group hits by thread, preserving the host's result order. */
    groups() {
        const out = [];
        for (const r of Array.isArray(this.results) ? this.results : []) {
            if (!r || !r.thread || !r.item)
                continue;
            const last = out[out.length - 1];
            if (last && last.thread.id === r.thread.id)
                last.hits.push(r);
            else
                out.push({ thread: r.thread, hits: [r] });
        }
        return out;
    }
    render() {
        const groups = this.groups();
        return (h("div", { key: '0', class: "tsr" },
            h("form", { key: '1', class: "tsr__form", onSubmit: this.submit },
                h("input", { key: '2', class: "tsr__input", type: "search", placeholder: "Search threads\u2026", "aria-label": "Search threads", value: this.draft, onInput: (ev) => (this.draft = ev.target.value) }),
                h("button", { key: '3', type: "button", class: "pop-iconbtn tsr__go", title: "Search", "aria-label": "Search", onClick: () => this.submit() },
                    h("ion-icon", { key: '4', name: "search-outline", "aria-hidden": "true" }))),
            h("div", { key: '5', class: "tsr__facets" },
                this.renderChipRow('cardType', 'Card type', this.cardTypeValues()),
                this.renderChipRow('sourcePanel', 'Panel', this.sourcePanelValues())),
            this.loading ? (h("p", { class: "tsr__state", role: "status", "aria-live": "polite" },
                h("ion-icon", { name: "hourglass-outline", "aria-hidden": "true" }),
                "Searching\u2026")) : groups.length === 0 ? (h("p", { class: "tsr__state tsr__state--empty" }, "No matches.")) : (h("div", { class: "tsr__results" }, groups.map((g) => (h("section", { key: g.thread.id, class: "tsr__group" },
                h("h3", { class: "tsr__group-head" },
                    h("span", { class: "tsr__group-title" }, g.thread.title),
                    g.thread.localDate && h("span", { class: "tsr__group-date" }, g.thread.localDate)),
                g.hits.map((hit) => (h("button", { key: hit.item.id, type: "button", class: "tsr__hit", onClick: () => this.popResultOpen.emit({ threadId: g.thread.id, itemId: hit.item.id }) },
                    h("span", { class: "tsr__snippet" }, hit.snippet),
                    hit.item.cardType && h("span", { class: "tsr__tag" }, hit.item.cardType),
                    hit.item.sourcePanel && h("span", { class: "tsr__tag" }, hit.item.sourcePanel)))))))))));
    }
    static get watchers() { return {
        "query": [{
                "onQueryChange": 0
            }]
    }; }
};
PopThreadSearch.style = PopThreadSearchStyle0();
//# sourceMappingURL=thread-search.js.map