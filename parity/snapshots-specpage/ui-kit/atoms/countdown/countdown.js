import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopCountdown = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popCountdownDone = __stencil_createEvent(this, "popCountdownDone", 7);
    }
    /** Target instant — epoch MILLISECONDS on the local clock. null/0 = idle. */
    deadline;
    /** Optional label rendered before the time ("Call mom — 1h 02m 05s"). */
    label;
    /** Text when there is no deadline ("No upcoming reminders"). */
    idleText = '';
    /** Text prefix once the deadline passes (the time keeps counting UP). */
    overdueText = 'now';
    /** Re-render tick (1 Hz while a deadline is set). */
    nowMs = Date.now();
    /** Fired ONCE when the deadline crosses ≤0 while mounted (re-armed when the
     *  deadline changes — e.g. after a snooze). */
    popCountdownDone;
    timer;
    fired = false;
    connectedCallback() {
        this.start();
    }
    disconnectedCallback() {
        this.stop();
    }
    onDeadlineChange() {
        this.fired = false; // a new/pushed-out deadline arms the latch again
        this.nowMs = Date.now();
        this.start();
    }
    start() {
        this.stop();
        if (!this.deadline)
            return;
        this.timer = setInterval(() => {
            this.nowMs = Date.now();
            if (!this.fired && this.deadline && this.nowMs >= this.deadline) {
                this.fired = true;
                this.popCountdownDone.emit({ deadline: this.deadline });
            }
        }, 1000);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    /** "1h 02m 05s" / "4m 09s" / "32s" — compact, zero-padded after the first unit. */
    static face(ms) {
        const total = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0)
            return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
        if (m > 0)
            return `${m}m ${String(s).padStart(2, '0')}s`;
        return `${s}s`;
    }
    render() {
        if (!this.deadline) {
            return this.idleText ? h("span", { class: "cd cd--idle" }, this.idleText) : null;
        }
        const remaining = this.deadline - this.nowMs;
        const overdue = remaining < 0;
        const time = PopCountdown.face(Math.abs(remaining));
        return (h("span", { class: { cd: true, 'cd--overdue': overdue }, role: "timer", "aria-live": "off" },
            this.label && h("span", { class: "cd__label" }, this.label),
            h("span", { class: "cd__time" }, overdue ? `${this.overdueText} · ${time} ago` : `in ${time}`)));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-countdown",
        "componentClassName": "PopCountdown",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "deadline",
                "type": "number",
                "attribute": "deadline",
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
                    "text": "Target instant \u2014 epoch MILLISECONDS on the local clock. null/0 = idle."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "label",
                "type": "string",
                "attribute": "label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Optional label rendered before the time (\"Call mom \u2014 1h 02m 05s\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "idleText",
                "type": "string",
                "attribute": "idle-text",
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
                    "text": "Text when there is no deadline (\"No upcoming reminders\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "overdueText",
                "type": "string",
                "attribute": "overdue-text",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'now'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Text prefix once the deadline passes (the time keeps counting UP)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "nowMs"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popCountdownDone",
                "method": "popCountdownDone",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fired ONCE when the deadline crosses \u22640 while mounted (re-armed when the\ndeadline changes \u2014 e.g. after a snooze)."
                },
                "complexType": {
                    "original": "{ deadline: number }",
                    "resolved": "{ deadline: number; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "deadline",
                "methodName": "onDeadlineChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-COUNTDOWN",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/atoms/countdown/countdown.css",
                        "relativePath": "countdown.css",
                        "originalComponentPath": "countdown.css"
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
        "hasConnectedCallbackFn": true,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": true,
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
        "hasVdomKey": false,
        "hasVdomListener": false,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "role", "aria-live"],
        "htmlTagNames": ["span"],
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
        "deadline": [{
                "onDeadlineChange": 0
            }]
    }; }
};
//# sourceMappingURL=countdown.js.map