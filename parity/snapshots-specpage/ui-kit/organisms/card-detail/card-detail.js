import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
import { CARD_CONDITIONS, formatPrice, identityParts, isResolving, parseCardModel, parseContainers, relativeTime, } from './card-detail-logic';
export const PopCardDetail = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popCardAction = __stencil_createEvent(this, "popCardAction", 7);
        this.popCardClose = __stencil_createEvent(this, "popCardClose", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Whether the sheet is open (host-controlled). */
    open = false;
    /** The card view-model — JSON attr or object property (see CardDetailModel). */
    card = null;
    /** Binder/container options for Move — JSON attr or array property. */
    containers = '[]';
    /** Condition grades offered by the condition + split pickers (JSON array). */
    conditions = JSON.stringify(CARD_CONDITIONS);
    /** Host is mid-request → mutation controls disable (optional). */
    busy = false;
    /** The printing picker area is expanded (host may also drive this, e.g. the
     *  needs-review deep-link). Toggled by the printing row / review CTA. */
    printingsOpen = false;
    /** ONE event per user intent; the host owns the API call + revalidate. */
    popCardAction;
    /** Re-emitted when the sheet closes (backdrop / swipe / Esc / host). */
    popCardClose;
    /** Showing the user's own photo instead of the canonical art. */
    showPhoto = false;
    /** The Move-to-binder chooser row is expanded. */
    moveOpen = false;
    /** The Split-stack condition chooser is expanded. */
    splitOpen = false;
    /** The delete-confirm dialog element (typed structurally — the generated
     *  HTMLPopConfirmDialogElement global only exists post-build). */
    confirmEl;
    onOpenChange(open) {
        if (!open)
            this.resetTransient();
    }
    onCardChange() {
        // A different card (or a revalidated model) → drop per-card view state.
        this.showPhoto = false;
    }
    resetTransient() {
        this.showPhoto = false;
        this.moveOpen = false;
        this.splitOpen = false;
        this.printingsOpen = false;
    }
    get model() {
        return parseCardModel(this.card);
    }
    get containerOptions() {
        return parseContainers(this.containers);
    }
    get conditionOptions() {
        if (Array.isArray(this.conditions))
            return this.conditions.filter((c) => typeof c === 'string' && c);
        try {
            const arr = JSON.parse(this.conditions);
            return Array.isArray(arr) ? arr.filter((c) => typeof c === 'string' && !!c) : CARD_CONDITIONS;
        }
        catch {
            return CARD_CONDITIONS;
        }
    }
    emit(action, payload) {
        this.popCardAction.emit(payload ? { action, payload } : { action });
    }
    onClose = () => {
        this.resetTransient();
        this.popCardClose.emit();
    };
    togglePrintings = () => {
        const next = !this.printingsOpen;
        this.printingsOpen = next;
        if (next)
            this.emit('open-printings');
    };
    async onDelete() {
        const ok = await this.confirmEl?.confirm();
        if (ok)
            this.emit('delete');
    }
    // ── render pieces ──────────────────────────────────────────────────────────
    renderArt(m) {
        const canonical = m.imageUrl || null;
        const photo = m.photoUrl || null;
        // No canonical art → the user photo (if any) is primary.
        const primary = canonical ?? photo;
        const src = this.showPhoto && photo ? photo : primary;
        return (h("div", { class: "pcd__art" },
            src ? (h("img", { class: "pcd__art-img", src: src, alt: m.name, loading: "lazy" })) : (h("div", { class: "pcd__art-ph", "aria-hidden": "true" }, "\uD83C\uDCCF")),
            canonical && photo && (h("button", { type: "button", class: { 'pcd__photo-toggle': true, 'pcd__photo-toggle--on': this.showPhoto }, "aria-pressed": String(this.showPhoto), "aria-label": this.showPhoto ? 'Show the card art' : 'Show your photo', title: this.showPhoto ? 'Show the card art' : 'Show your photo', onClick: () => (this.showPhoto = !this.showPhoto) },
                h("img", { src: this.showPhoto ? canonical : photo, alt: "", loading: "lazy" })))));
    }
    renderIdentity(m, resolving) {
        const parts = identityParts(m);
        return (h("div", { class: "pcd__identity" },
            h("h3", { class: "pcd__name" }, m.name),
            m.needsReview && !resolving && (h("div", { class: "pcd__review", role: "status" },
                h("span", { class: "pcd__review-badge" }, "\u26A0\uFE0F needs review"),
                m.reviewReason && h("span", { class: "pcd__review-reason" }, m.reviewReason))),
            (parts.length > 0 || m.containerName) && (h("div", { class: "pcd__meta" },
                parts.map((p, i) => [i > 0 && h("span", { class: "pcd__dot", "aria-hidden": "true" }, "\u00B7"), h("span", { class: "pcd__meta-part" }, p)]),
                m.containerName && [parts.length > 0 && h("span", { class: "pcd__dot", "aria-hidden": "true" }, "\u00B7"), h("span", { class: "pcd__meta-part" },
                        "\uD83D\uDCE6 ",
                        m.containerName)])),
            !resolving && this.renderCondition(m)));
    }
    renderCondition(m) {
        const current = (m.condition ?? '').toUpperCase();
        const options = this.conditionOptions;
        return (h("label", { class: "pcd__condition" },
            h("span", { class: "pcd__label" }, "Condition"),
            h("select", { class: "pcd__select", disabled: this.busy, onChange: (e) => {
                    const condition = e.target.value;
                    if (condition && condition !== current)
                        this.emit('set-condition', { condition });
                } },
                !current && h("option", { value: "", selected: true }, "\u2014"),
                options.map((c) => (h("option", { value: c, selected: c === current }, c))),
                current && !options.includes(current) && h("option", { value: current, selected: true }, current))));
    }
    renderQuantity(m) {
        return (h("div", { class: "pcd__row pcd__qty-row" },
            h("span", { class: "pcd__label" }, "Quantity"),
            h("div", { class: "pcd__stepper" },
                h("button", { type: "button", class: "pcd__iconbtn", "aria-label": `Decrease quantity of ${m.name}`, disabled: this.busy || m.quantity <= 0, onClick: () => this.emit('qty', { delta: -1 }) },
                    h("pop-icon", { name: "remove" })),
                h("span", { class: "pcd__qty", "aria-live": "polite" }, m.quantity),
                h("button", { type: "button", class: "pcd__iconbtn", "aria-label": `Increase quantity of ${m.name}`, disabled: this.busy, onClick: () => this.emit('qty', { delta: 1 }) },
                    h("pop-icon", { name: "add" })))));
    }
    renderPrice(m) {
        const unpriced = typeof m.price !== 'number';
        const asOf = relativeTime(m.priceUpdatedAt);
        return (h("div", { class: "pcd__row pcd__price-row" },
            h("span", { class: "pcd__label" }, "Price"),
            h("span", { class: { pcd__price: true, 'pcd__price--none': unpriced } }, formatPrice(m.price)),
            !unpriced && asOf && h("span", { class: "pcd__asof" },
                "as of ",
                asOf),
            h("button", { type: "button", class: { pcd__iconbtn: true, 'pcd__refresh--cta': unpriced }, "aria-label": "Refresh price", title: "Refresh price", disabled: this.busy, onClick: () => this.emit('refresh-price') },
                h("pop-icon", { name: "refresh-outline" }))));
    }
    renderPrinting(m) {
        return (h("div", { class: "pcd__printing" },
            h("button", { type: "button", class: "pcd__row pcd__rowbtn", "aria-expanded": String(this.printingsOpen), disabled: this.busy || m.hasPasscode === false, onClick: this.togglePrintings },
                h("span", { class: "pcd__label" }, "Printing"),
                h("span", { class: "pcd__printing-code" }, m.setCode || '—'),
                h("pop-icon", { class: "pcd__chev", name: this.printingsOpen ? 'chevron-down' : 'chevron-forward' })),
            h("div", { class: { 'pcd__printing-body': true, 'pcd__printing-body--open': this.printingsOpen } },
                h("slot", { name: "printing-picker" }))));
    }
    /** Needs-review lead CTA: Pick the printing (passcode) or Rescan (none). */
    renderReviewCta(m) {
        if (!m.needsReview)
            return null;
        if (m.hasPasscode === false) {
            return (h("button", { type: "button", class: "pcd__cta", disabled: this.busy, onClick: () => this.emit('rescan') },
                h("pop-icon", { name: "camera-outline" }),
                " Rescan this card"));
        }
        if (this.printingsOpen)
            return null;
        return (h("button", { type: "button", class: "pcd__cta", disabled: this.busy, onClick: this.togglePrintings },
            h("pop-icon", { name: "albums-outline" }),
            " Pick the printing"));
    }
    renderActions(m) {
        const containers = this.containerOptions;
        return (h("div", { class: "pcd__actions" },
            containers.length > 0 && (h("div", { class: "pcd__action" },
                h("button", { type: "button", class: "pcd__row pcd__rowbtn", "aria-expanded": String(this.moveOpen), disabled: this.busy, onClick: () => (this.moveOpen = !this.moveOpen) },
                    h("pop-icon", { name: "file-tray-outline" }),
                    h("span", { class: "pcd__action-label" }, "Move to binder"),
                    h("pop-icon", { class: "pcd__chev", name: this.moveOpen ? 'chevron-down' : 'chevron-forward' })),
                this.moveOpen && (h("div", { class: "pcd__action-body" }, containers.map((c) => (h("button", { type: "button", class: "pcd__choice", key: c.id, disabled: this.busy, onClick: () => {
                        this.moveOpen = false;
                        this.emit('move', { containerId: c.id });
                    } },
                    "\uD83D\uDCE6 ",
                    c.name))))))),
            m.quantity >= 2 && (h("div", { class: "pcd__action" },
                h("button", { type: "button", class: "pcd__row pcd__rowbtn", "aria-expanded": String(this.splitOpen), disabled: this.busy, onClick: () => (this.splitOpen = !this.splitOpen) },
                    h("pop-icon", { name: "copy-outline" }),
                    h("span", { class: "pcd__action-label" }, "Split stack"),
                    h("pop-icon", { class: "pcd__chev", name: this.splitOpen ? 'chevron-down' : 'chevron-forward' })),
                this.splitOpen && (h("div", { class: "pcd__action-body" },
                    h("span", { class: "pcd__hint" }, "Peel one copy off as\u2026"),
                    h("div", { class: "pcd__choices" }, this.conditionOptions.map((c) => (h("button", { type: "button", class: "pcd__choice pcd__choice--chip", key: c, disabled: this.busy, onClick: () => {
                            this.splitOpen = false;
                            this.emit('split', { condition: c });
                        } }, c)))))))),
            h("slot", { name: "actions" }),
            h("div", { class: "pcd__action" },
                h("button", { type: "button", class: "pcd__row pcd__rowbtn pcd__rowbtn--danger", disabled: this.busy, onClick: () => void this.onDelete() },
                    h("pop-icon", { name: "trash-outline" }),
                    h("span", { class: "pcd__action-label" }, "Delete")))));
    }
    render() {
        const m = this.model;
        if (!this.open || !m)
            return null;
        const resolving = isResolving(m);
        return (h("pop-bottom-sheet", { open: true, sheetTitle: m.name, onPopClose: this.onClose },
            h("div", { class: { pcd: true, 'pcd--resolving': resolving } },
                this.renderArt(m),
                this.renderIdentity(m, resolving),
                resolving ? (h("div", { class: "pcd__resolving", role: "status" },
                    h("pop-icon", { name: "hourglass-outline" }),
                    " resolving printing & price\u2026")) : ([this.renderQuantity(m), this.renderPrice(m), this.renderReviewCta(m), this.renderPrinting(m)]),
                resolving ? (h("div", { class: "pcd__actions" },
                    h("div", { class: "pcd__action" },
                        h("button", { type: "button", class: "pcd__row pcd__rowbtn pcd__rowbtn--danger", onClick: () => void this.onDelete() },
                            h("pop-icon", { name: "trash-outline" }),
                            h("span", { class: "pcd__action-label" }, "Delete"))))) : (this.renderActions(m))),
            h("pop-confirm-dialog", { ref: (el) => (this.confirmEl = el), confirmTitle: "Delete card", message: `Delete "${m.name}"${m.quantity > 1 ? ` (all ${m.quantity} copies)` : ''}?`, confirmLabel: "Delete", danger: true })));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-card-detail",
        "componentClassName": "PopCardDetail",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "open",
                "type": "boolean",
                "attribute": "open",
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
                    "text": "Whether the sheet is open (host-controlled)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "card",
                "type": "any",
                "attribute": "card",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "null",
                "complexType": {
                    "original": "string | CardDetailModel | null",
                    "resolved": "any",
                    "references": {
                        "CardDetailModel": {
                            "location": "global",
                            "id": "global::CardDetailModel"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The card view-model \u2014 JSON attr or object property (see CardDetailModel)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "containers",
                "type": "string",
                "attribute": "containers",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string | CardContainerOption[]",
                    "resolved": "string | {}",
                    "references": {
                        "CardContainerOption": {
                            "location": "global",
                            "id": "global::CardContainerOption"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Binder/container options for Move \u2014 JSON attr or array property."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "conditions",
                "type": "string",
                "attribute": "conditions",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "JSON.stringify(CARD_CONDITIONS)",
                "complexType": {
                    "original": "string | string[]",
                    "resolved": "string | {}",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Condition grades offered by the condition + split pickers (JSON array)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "busy",
                "type": "boolean",
                "attribute": "busy",
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
                    "text": "Host is mid-request \u2192 mutation controls disable (optional)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "printingsOpen",
                "type": "boolean",
                "attribute": "printings-open",
                "reflect": false,
                "mutable": true,
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
                    "text": "The printing picker area is expanded (host may also drive this, e.g. the\nneeds-review deep-link). Toggled by the printing row / review CTA."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "showPhoto"
            }, {
                "name": "moveOpen"
            }, {
                "name": "splitOpen"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popCardAction",
                "method": "popCardAction",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "ONE event per user intent; the host owns the API call + revalidate."
                },
                "complexType": {
                    "original": "{ action: string; payload?: Record<string, unknown> }",
                    "resolved": "{ action: string; payload?: any; }",
                    "references": {
                        "Record": {
                            "location": "global",
                            "id": "global::Record"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popCardClose",
                "method": "popCardClose",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Re-emitted when the sheet closes (backdrop / swipe / Esc / host)."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "open",
                "methodName": "onOpenChange",
                "handlerOptions": undefined
            }, {
                "propName": "card",
                "methodName": "onCardChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-CARD-DETAIL",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/card-detail/card-detail.css",
                        "relativePath": "card-detail.css",
                        "originalComponentPath": "card-detail.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
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
        "hasLifecycle": false,
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
        "hasPropMutable": true,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
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
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "src", "alt", "loading", "aria-hidden", "type", "aria-pressed", "aria-label", "title", "onClick", "role", "disabled", "onChange", "value", "selected", "name", "aria-live", "aria-expanded", "key", "open", "sheetTitle", "onPopClose", "ref", "confirmTitle", "message", "confirmLabel", "danger"],
        "htmlTagNames": ["div", "img", "button", "h3", "span", "label", "select", "option", "pop-icon", "slot", "pop-bottom-sheet", "pop-confirm-dialog"],
        "htmlParts": [],
        "htmlSlots": ["printing-picker", "actions"],
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
        "open": [{
                "onOpenChange": 0
            }],
        "card": [{
                "onCardChange": 0
            }]
    }; }
};
//# sourceMappingURL=card-detail.js.map