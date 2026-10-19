import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-thread-search",
        "componentClassName": "PopThreadSearch",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "results",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "SearchResult[]",
                    "resolved": "SearchResult[]",
                    "references": {
                        "SearchResult": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-search/thread-search.tsx",
                            "id": "ui-kit/organisms/thread-search/thread-search.tsx::SearchResult"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Hits, in the order the host wants them shown. Never re-sorted here."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "facets",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "{ cardType: {}, sourcePanel: {} }",
                "complexType": {
                    "original": "SearchFacets",
                    "resolved": "SearchFacets",
                    "references": {
                        "SearchFacets": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-search/thread-search.tsx",
                            "id": "ui-kit/organisms/thread-search/thread-search.tsx::SearchFacets"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Counts per facet value."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "activeFacets",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "{ cardType: [], sourcePanel: [] }",
                "complexType": {
                    "original": "ActiveFacets",
                    "resolved": "ActiveFacets",
                    "references": {
                        "ActiveFacets": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-search/thread-search.tsx",
                            "id": "ui-kit/organisms/thread-search/thread-search.tsx::ActiveFacets"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Facet values currently applied."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "available",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "AvailableFacets",
                    "resolved": "AvailableFacets | undefined",
                    "references": {
                        "AvailableFacets": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-search/thread-search.tsx",
                            "id": "ui-kit/organisms/thread-search/thread-search.tsx::AvailableFacets"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Optional full facet vocabulary + labels, so zero-count values still render."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "query",
                "type": "string",
                "attribute": "query",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The query the host last ran."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "loading",
                "type": "boolean",
                "attribute": "loading",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "draft"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popSearch",
                "method": "popSearch",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted on submit and on every facet toggle."
                },
                "complexType": {
                    "original": "SearchDetail",
                    "resolved": "SearchDetail",
                    "references": {
                        "SearchDetail": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-search/thread-search.tsx",
                            "id": "ui-kit/organisms/thread-search/thread-search.tsx::SearchDetail"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popResultOpen",
                "method": "popResultOpen",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when a hit is opened \u2014 deep-link to `itemId` inside `threadId`."
                },
                "complexType": {
                    "original": "ResultOpenDetail",
                    "resolved": "ResultOpenDetail",
                    "references": {
                        "ResultOpenDetail": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-search/thread-search.tsx",
                            "id": "ui-kit/organisms/thread-search/thread-search.tsx::ResultOpenDetail"
                        }
                    }
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "query",
                "methodName": "onQueryChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-THREAD-SEARCH",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/thread-search/thread-search.css",
                        "relativePath": "thread-search.css",
                        "originalComponentPath": "thread-search.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": true,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": true,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "key", "type", "aria-pressed", "onClick", "onSubmit", "placeholder", "aria-label", "value", "onInput", "title", "name", "aria-hidden", "role", "aria-live"],
        "htmlTagNames": ["div", "span", "button", "form", "input", "ion-icon", "p", "section", "h3"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
    static get watchers() { return {
        "query": [{
                "onQueryChange": 0
            }]
    }; }
};
//# sourceMappingURL=thread-search.js.map