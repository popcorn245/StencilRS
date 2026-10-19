import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const PopTokenPill = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** The text string to calculate tokens from (estimation) */
    text = '';
    /** Explicit token count (overrides 'text' calculation if provided) */
    tokens;
    /** The maximum context window size (default 8192) */
    limit = 8192;
    /** Whether to show the numerical label */
    showLabel = true;
    /** Multiplier for char-to-token estimation (Standard is ~4) */
    ratio = 4;
    /** Explicit meter state from the server */
    state;
    /** Explicit budget percentage from the server (0 to 1+) */
    budgetPct;
    getEffectiveTokens() {
        if (typeof this.tokens === 'number')
            return this.tokens;
        if (!this.text)
            return 0;
        // Basic estimation: chars / ratio
        return Math.ceil(this.text.length / this.ratio);
    }
    render() {
        const tokens = this.getEffectiveTokens();
        const ratioPct = (tokens / this.limit) * 100;
        // Use server values if provided, else fallback to ratio derivation
        const rawPct = typeof this.budgetPct === 'number' ? this.budgetPct * 100 : ratioPct;
        const percentage = Math.min(rawPct, 100); // Visually clamp fill
        let isWarning = false;
        let isCompact = false;
        let isOver = false;
        if (this.state) {
            isWarning = this.state === 'warn';
            isCompact = this.state === 'compact';
            isOver = this.state === 'over';
        }
        else {
            isWarning = ratioPct > 80;
            isCompact = ratioPct > 95; // map crit to compact in back-compat
            isOver = ratioPct > 100;
        }
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: {
                    'pill-container': true,
                    'warn': isWarning,
                    'crit': isCompact,
                    'over': isOver
                }, title: `${tokens.toLocaleString()} / ${this.limit.toLocaleString()} tokens` },
                h("div", { key: '2', class: "progress-fill", style: { width: `${percentage}%` } }),
                this.showLabel && (h("span", { key: '3', class: "label" },
                    tokens.toLocaleString(),
                    " / ",
                    this.limit.toLocaleString(),
                    " ",
                    isOver ? '(Over)' : '')))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-token-pill",
        "componentClassName": "PopTokenPill",
        "elementRef": null,
        "encapsulation": "shadow",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": "open",
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "text",
                "type": "string",
                "attribute": "text",
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
                    "text": "The text string to calculate tokens from (estimation)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "tokens",
                "type": "number",
                "attribute": "tokens",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "number",
                    "resolved": "number | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Explicit token count (overrides 'text' calculation if provided)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "limit",
                "type": "number",
                "attribute": "limit",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "8192",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The maximum context window size (default 8192)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "showLabel",
                "type": "boolean",
                "attribute": "show-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Whether to show the numerical label"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "ratio",
                "type": "number",
                "attribute": "ratio",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "4",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Multiplier for char-to-token estimation (Standard is ~4)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "state",
                "type": "string",
                "attribute": "state",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "'normal' | 'warn' | 'compact' | 'over'",
                    "resolved": "\"compact\" | \"normal\" | \"over\" | \"warn\" | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Explicit meter state from the server"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "budgetPct",
                "type": "number",
                "attribute": "budget-pct",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "number",
                    "resolved": "number | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Explicit budget percentage from the server (0 to 1+)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [],
        "events": [],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-TOKEN-PILL",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/token-pill/token-pill.css",
                        "relativePath": "token-pill.css",
                        "originalComponentPath": "token-pill.css"
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
        "hasEvent": false,
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
        "hasPropNumber": true,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": false,
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
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "title", "style"],
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
};
//# sourceMappingURL=token-pill.js.map