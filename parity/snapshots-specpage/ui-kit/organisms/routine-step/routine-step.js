import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopRoutineStep = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.stepComplete = __stencil_createEvent(this, "stepComplete", 7);
        this.stepSkip = __stencil_createEvent(this, "stepSkip", 7);
    }
    /** Step type determines the interactive widget shown */
    type = 'info';
    /** Step title */
    heading = '';
    /** Optional subtitle / instruction */
    subtitle = '';
    /** Emoji displayed above the heading */
    emoji = '';
    /** Duration in seconds (for timer/breathing/duration steps) */
    durationSeconds = 60;
    /** Breathing pattern as "inhale,hold,exhale,hold" seconds (e.g. "4,4,6,2") */
    breathingPattern = '4,4,6,2';
    /** JSON array of set objects [{reps, weight?}] for set_reps step */
    sets = '[]';
    /** Scale min/max labels */
    scaleMin = '1';
    scaleMax = '10';
    scaleMinLabel = 'Low';
    scaleMaxLabel = 'High';
    /** Emitted when the step is marked done — detail contains any captured value */
    stepComplete;
    /** Emitted when user taps Skip */
    stepSkip;
    timerRemaining = 0;
    timerRunning = false;
    checked = false;
    scaleValue = 5;
    textValue = '';
    breathPhase = 'inhale';
    breathProgress = 0; // 0-1 within current phase
    breathCycle = 0;
    parsedSets = [];
    timerInterval;
    breathInterval;
    componentWillLoad() {
        this.timerRemaining = this.durationSeconds;
        try {
            this.parsedSets = JSON.parse(this.sets);
        }
        catch {
            this.parsedSets = [];
        }
    }
    disconnectedCallback() {
        this.stopTimer();
        this.stopBreathing();
    }
    onTypeChange() {
        this.stopTimer();
        this.stopBreathing();
        this.timerRemaining = this.durationSeconds;
    }
    // ─── Timer ────────────────────────────────────────────────────────────────
    startTimer() {
        if (this.timerRunning)
            return;
        this.timerRunning = true;
        this.timerInterval = setInterval(() => {
            this.timerRemaining -= 1;
            if (this.timerRemaining <= 0) {
                this.stopTimer();
                this.stepComplete.emit({ type: this.type });
            }
        }, 1000);
    }
    pauseTimer() {
        this.timerRunning = false;
        clearInterval(this.timerInterval);
    }
    stopTimer() {
        this.timerRunning = false;
        clearInterval(this.timerInterval);
    }
    formatTime(s) {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    }
    // ─── Breathing ────────────────────────────────────────────────────────────
    get breathParts() {
        return this.breathingPattern.split(',').map(Number);
    }
    startBreathing() {
        const [inhale, holdIn, exhale, holdOut] = this.breathParts;
        const phases = [
            { name: 'inhale', dur: inhale },
            { name: 'hold_in', dur: holdIn },
            { name: 'exhale', dur: exhale },
            { name: 'hold_out', dur: holdOut },
        ].filter((p) => p.dur > 0);
        let phaseIdx = 0;
        let elapsed = 0;
        this.breathPhase = phases[0].name;
        this.breathProgress = 0;
        this.breathInterval = setInterval(() => {
            elapsed += 0.1;
            const cur = phases[phaseIdx];
            this.breathProgress = Math.min(elapsed / cur.dur, 1);
            if (elapsed >= cur.dur) {
                elapsed = 0;
                phaseIdx = (phaseIdx + 1) % phases.length;
                if (phaseIdx === 0)
                    this.breathCycle += 1;
                this.breathPhase = phases[phaseIdx].name;
                this.breathProgress = 0;
            }
        }, 100);
    }
    stopBreathing() {
        clearInterval(this.breathInterval);
    }
    // ─── Render helpers ───────────────────────────────────────────────────────
    renderTimer() {
        const total = this.durationSeconds;
        const progress = 1 - this.timerRemaining / total;
        const r = 44;
        const circ = 2 * Math.PI * r;
        const offset = circ * (1 - progress);
        return (h("div", { class: "rs-timer" },
            h("svg", { viewBox: "0 0 100 100", width: "120", height: "120", class: "rs-timer-ring" },
                h("circle", { cx: "50", cy: "50", r: r, class: "rs-ring-track" }),
                h("circle", { cx: "50", cy: "50", r: r, class: "rs-ring-progress", "stroke-dasharray": circ, "stroke-dashoffset": offset, transform: "rotate(-90 50 50)" })),
            h("div", { class: "rs-timer-label" }, this.formatTime(this.timerRemaining)),
            h("button", { class: "rs-btn rs-btn--primary", type: "button", onClick: () => this.timerRunning ? this.pauseTimer() : this.startTimer() }, this.timerRunning ? 'Pause' : this.timerRemaining < this.durationSeconds ? 'Resume' : 'Start')));
    }
    renderBreathing() {
        const phaseLabels = {
            inhale: 'Inhale',
            hold_in: 'Hold',
            exhale: 'Exhale',
            hold_out: 'Rest',
        };
        const scale = this.breathPhase === 'inhale'
            ? 0.6 + this.breathProgress * 0.4
            : this.breathPhase === 'exhale'
                ? 1 - this.breathProgress * 0.4
                : this.breathPhase === 'hold_in' ? 1 : 0.6;
        return (h("div", { class: "rs-breathing" },
            h("div", { class: "rs-breath-circle", style: { transform: `scale(${scale})` } }),
            h("div", { class: "rs-breath-phase" }, phaseLabels[this.breathPhase]),
            h("div", { class: "rs-breath-cycle" },
                "Cycle ",
                this.breathCycle + 1),
            !this.breathInterval && (h("button", { class: "rs-btn rs-btn--primary", type: "button", onClick: () => this.startBreathing() }, "Start")),
            h("button", { class: "rs-btn rs-btn--ghost", type: "button", onClick: () => { this.stopBreathing(); this.stepComplete.emit({ cycles: this.breathCycle }); } }, "Done")));
    }
    renderScale() {
        const min = parseInt(this.scaleMin, 10) || 1;
        const max = parseInt(this.scaleMax, 10) || 10;
        const vals = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return (h("div", { class: "rs-scale" },
            h("div", { class: "rs-scale-labels" },
                h("span", null, this.scaleMinLabel),
                h("span", null, this.scaleMaxLabel)),
            h("div", { class: "rs-scale-pips" }, vals.map((v) => (h("button", { key: v, class: { 'rs-pip': true, 'is-selected': this.scaleValue === v }, type: "button", onClick: () => (this.scaleValue = v) }, v)))),
            h("button", { class: "rs-btn rs-btn--primary", type: "button", onClick: () => this.stepComplete.emit({ value: this.scaleValue }) },
                "Confirm ",
                this.scaleValue)));
    }
    renderSets() {
        const sets = this.parsedSets.length ? this.parsedSets : [{ reps: 10 }];
        return (h("div", { class: "rs-sets" },
            sets.map((set, i) => (h("div", { class: "rs-set-row", key: i },
                h("span", { class: "rs-set-num" },
                    "Set ",
                    i + 1),
                h("span", { class: "rs-set-detail" },
                    set.reps,
                    " reps",
                    set.weight ? ` × ${set.weight} kg` : '')))),
            h("button", { class: "rs-btn rs-btn--primary", type: "button", onClick: () => this.stepComplete.emit({ sets }) }, "All sets done")));
    }
    render() {
        return (h("div", { key: '0', class: `rs-root rs-type--${this.type}` },
            this.emoji && h("div", { key: '1', class: "rs-emoji" }, this.emoji),
            this.heading && h("h2", { key: '2', class: "rs-heading" }, this.heading),
            this.subtitle && h("p", { key: '3', class: "rs-subtitle" }, this.subtitle),
            h("div", { key: '4', class: "rs-widget" },
                h("slot", { key: '5' }),
                this.type === 'timer' && this.renderTimer(),
                this.type === 'duration' && this.renderTimer(),
                this.type === 'breathing' && this.renderBreathing(),
                this.type === 'scale' && this.renderScale(),
                this.type === 'set_reps' && this.renderSets(),
                this.type === 'checkbox' && (h("button", { key: '6', class: { 'rs-check-btn': true, 'is-checked': this.checked }, type: "button", onClick: () => { this.checked = !this.checked; if (this.checked)
                        this.stepComplete.emit({ checked: true }); } }, this.checked ? '✓ Done' : 'Mark done')),
                this.type === 'text_input' && (h("div", { key: '7', class: "rs-text-input" },
                    h("textarea", { key: '8', class: "rs-textarea", rows: 4, placeholder: "Type your response\u2026", value: this.textValue, onInput: (e) => (this.textValue = e.target.value) }),
                    h("button", { key: '9', class: "rs-btn rs-btn--primary", type: "button", onClick: () => this.stepComplete.emit({ text: this.textValue }) }, "Submit"))),
                (this.type === 'info' || this.type === 'photo' || this.type === 'voice' || this.type === 'confetti' || this.type === 'custom') && (h("button", { key: 'a', class: "rs-btn rs-btn--primary", type: "button", onClick: () => this.stepComplete.emit({}) }, this.type === 'confetti' ? '🎉 Complete!' : 'Continue'))),
            h("button", { key: 'b', class: "rs-skip", type: "button", onClick: () => this.stepSkip.emit() }, "Skip")));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-routine-step",
        "componentClassName": "PopRoutineStep",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "type",
                "type": "string",
                "attribute": "type",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'info'",
                "complexType": {
                    "original": "RoutineStepType",
                    "resolved": "\"breathing\" | \"checkbox\" | \"confetti\" | \"custom\" | \"duration\" | \"info\" | \"photo\" | \"scale\" | \"set_reps\" | \"text_input\" | \"timer\" | \"voice\"",
                    "references": {
                        "RoutineStepType": {
                            "location": "local",
                            "path": "ui-kit/organisms/routine-step/routine-step.tsx",
                            "id": "ui-kit/organisms/routine-step/routine-step.tsx::RoutineStepType"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Step type determines the interactive widget shown"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "heading",
                "type": "string",
                "attribute": "heading",
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
                    "text": "Step title"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "subtitle",
                "type": "string",
                "attribute": "subtitle",
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
                    "text": "Optional subtitle / instruction"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "emoji",
                "type": "string",
                "attribute": "emoji",
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
                    "text": "Emoji displayed above the heading"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "durationSeconds",
                "type": "number",
                "attribute": "duration-seconds",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "60",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Duration in seconds (for timer/breathing/duration steps)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "breathingPattern",
                "type": "string",
                "attribute": "breathing-pattern",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'4,4,6,2'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Breathing pattern as \"inhale,hold,exhale,hold\" seconds (e.g. \"4,4,6,2\")"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sets",
                "type": "string",
                "attribute": "sets",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON array of set objects [{reps, weight?}] for set_reps step"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "scaleMin",
                "type": "string",
                "attribute": "scale-min",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'1'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Scale min/max labels"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "scaleMax",
                "type": "string",
                "attribute": "scale-max",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'10'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "scaleMinLabel",
                "type": "string",
                "attribute": "scale-min-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Low'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "scaleMaxLabel",
                "type": "string",
                "attribute": "scale-max-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'High'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
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
                "name": "timerRemaining"
            }, {
                "name": "timerRunning"
            }, {
                "name": "checked"
            }, {
                "name": "scaleValue"
            }, {
                "name": "textValue"
            }, {
                "name": "breathPhase"
            }, {
                "name": "breathProgress"
            }, {
                "name": "breathCycle"
            }, {
                "name": "parsedSets"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "stepComplete",
                "method": "stepComplete",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the step is marked done \u2014 detail contains any captured value"
                },
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "stepSkip",
                "method": "stepSkip",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when user taps Skip"
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "type",
                "methodName": "onTypeChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-ROUTINE-STEP",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/routine-step/routine-step.css",
                        "relativePath": "routine-step.css",
                        "originalComponentPath": "routine-step.css"
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
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "viewBox", "width", "height", "cx", "cy", "r", "stroke-dasharray", "stroke-dashoffset", "transform", "type", "onClick", "style", "key", "rows", "placeholder", "value", "onInput"],
        "htmlTagNames": ["div", "svg", "circle", "button", "span", "h2", "p", "slot", "textarea"],
        "htmlParts": [],
        "htmlSlots": [""],
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
        "type": [{
                "onTypeChange": 0
            }]
    }; }
};
//# sourceMappingURL=routine-step.js.map