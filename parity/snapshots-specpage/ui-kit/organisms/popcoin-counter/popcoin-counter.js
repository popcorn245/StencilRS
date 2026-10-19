import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopPopcoinCounter = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** Current balance */
    balance = 0;
    /** Previous balance — used to detect change direction */
    previousBalance = 0;
    /** Milestone thresholds that trigger confetti (comma-separated) */
    milestones = '100,250,500,1000';
    /** Display format: 'full' shows label, 'compact' shows icon + number */
    format = 'compact';
    /** Currency icon. Defaults to the Popcoin coin 🪙 (the household currency emoji). */
    icon = '🪙';
    displayValue = 0;
    delta = 0;
    showDelta = false;
    confetti = [];
    animRaf;
    deltaTimeout;
    confettiId = 0;
    componentWillLoad() {
        this.displayValue = this.balance;
    }
    onBalanceChange(newVal, oldVal) {
        this.animateToValue(oldVal, newVal);
        this.delta = newVal - oldVal;
        this.showDelta = true;
        clearTimeout(this.deltaTimeout);
        this.deltaTimeout = setTimeout(() => (this.showDelta = false), 2000);
        if (this.isAtMilestone(newVal)) {
            this.triggerConfetti();
        }
    }
    isAtMilestone(val) {
        const milestones = this.milestones.split(',').map(Number);
        return milestones.includes(val) || (milestones.some((m) => val >= m && (this.previousBalance || 0) < m));
    }
    animateToValue(from, to) {
        if (this.animRaf)
            cancelAnimationFrame(this.animRaf);
        const duration = Math.min(800, Math.abs(to - from) * 10);
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
            this.displayValue = Math.round(from + (to - from) * ease);
            if (t < 1) {
                this.animRaf = requestAnimationFrame(tick);
            }
        };
        this.animRaf = requestAnimationFrame(tick);
    }
    triggerConfetti() {
        const colors = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899'];
        const pieces = Array.from({ length: 16 }, (_, i) => ({
            id: this.confettiId++,
            x: Math.random() * 100,
            color: colors[i % colors.length],
            delay: Math.random() * 400,
        }));
        this.confetti = pieces;
        setTimeout(() => (this.confetti = []), 2000);
    }
    disconnectedCallback() {
        if (this.animRaf)
            cancelAnimationFrame(this.animRaf);
        clearTimeout(this.deltaTimeout);
    }
    render() {
        const sign = this.delta >= 0 ? '+' : '';
        const isCompact = this.format === 'compact';
        return (h("div", { key: '0', class: `pc-root pc-format--${this.format}` },
            this.confetti.map((c) => (h("div", { key: c.id, class: "pc-confetti-piece", style: {
                    left: `${c.x}%`,
                    background: c.color,
                    animationDelay: `${c.delay}ms`,
                } }))),
            h("span", { key: '1', class: "pc-icon", "aria-hidden": "true" }, this.icon),
            h("span", { key: '2', class: "pc-value", "aria-label": `${this.displayValue} Popcoins` }, this.displayValue.toLocaleString()),
            !isCompact && h("span", { key: '3', class: "pc-label" }, "Popcoins"),
            this.showDelta && this.delta !== 0 && (h("span", { key: '4', class: `pc-delta ${this.delta > 0 ? 'pc-delta--gain' : 'pc-delta--loss'}` },
                sign,
                this.delta))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-popcoin-counter",
        "componentClassName": "PopPopcoinCounter",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "balance",
                "type": "number",
                "attribute": "balance",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current balance"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "previousBalance",
                "type": "number",
                "attribute": "previous-balance",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Previous balance \u2014 used to detect change direction"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "milestones",
                "type": "string",
                "attribute": "milestones",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'100,250,500,1000'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Milestone thresholds that trigger confetti (comma-separated)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "format",
                "type": "string",
                "attribute": "format",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'compact'",
                "complexType": {
                    "original": "'full' | 'compact'",
                    "resolved": "\"compact\" | \"full\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Display format: 'full' shows label, 'compact' shows icon + number"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "icon",
                "type": "string",
                "attribute": "icon",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'\uD83E\uDE99'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Currency icon. Defaults to the Popcoin coin \uD83E\uDE99 (the household currency emoji)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "displayValue"
            }, {
                "name": "delta"
            }, {
                "name": "showDelta"
            }, {
                "name": "confetti"
            }],
        "methods": [],
        "listeners": [],
        "events": [],
        "watchers": [{
                "propName": "balance",
                "methodName": "onBalanceChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-POPCOIN-COUNTER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/popcoin-counter/popcoin-counter.css",
                        "relativePath": "popcoin-counter.css",
                        "originalComponentPath": "popcoin-counter.css"
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
        "hasDisconnectedCallbackFn": true,
        "hasElement": false,
        "hasEvent": false,
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
        "hasPropNumber": true,
        "hasPropBoolean": false,
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
        "hasVdomListener": false,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "style", "aria-hidden", "aria-label"],
        "htmlTagNames": ["div", "span"],
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
        "balance": [{
                "onBalanceChange": 0
            }]
    }; }
};
//# sourceMappingURL=popcoin-counter.js.map