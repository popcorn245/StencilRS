import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopCelebration = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.celebrationDone = __stencil_createEvent(this, "celebrationDone", 7);
    }
    /** Trigger the animation */
    active = false;
    /** Points earned (displayed in animation) */
    points = 0;
    /** Celebration message */
    message = 'Quest Complete!';
    /** Animation finished */
    celebrationDone;
    visible = false;
    displayedPoints = 0;
    dismissTimer;
    counterTimer;
    confettiPieces = [];
    onActiveChange(isActive) {
        if (isActive) {
            this.startCelebration();
        }
    }
    componentWillLoad() {
        if (this.active) {
            this.startCelebration();
        }
    }
    disconnectedCallback() {
        this.cleanup();
    }
    startCelebration() {
        this.visible = true;
        this.displayedPoints = 0;
        this.generateConfetti();
        // Animate counter
        if (this.points > 0) {
            const steps = Math.min(this.points, 30);
            const increment = this.points / steps;
            let current = 0;
            this.counterTimer = setInterval(() => {
                current += increment;
                if (current >= this.points) {
                    this.displayedPoints = this.points;
                    clearInterval(this.counterTimer);
                }
                else {
                    this.displayedPoints = Math.round(current);
                }
            }, 60);
        }
        // Auto-dismiss after 3s
        this.dismissTimer = setTimeout(() => {
            this.dismiss();
        }, 3000);
    }
    generateConfetti() {
        const colors = ['#a855f7', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899'];
        this.confettiPieces = Array.from({ length: 40 }, () => ({
            x: Math.random() * 100,
            y: Math.random() * -50 - 10,
            rotation: Math.random() * 360,
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 0.5,
            size: 6 + Math.random() * 6,
        }));
    }
    dismiss = () => {
        this.cleanup();
        this.visible = false;
        this.celebrationDone.emit();
    };
    cleanup() {
        if (this.dismissTimer)
            clearTimeout(this.dismissTimer);
        if (this.counterTimer)
            clearInterval(this.counterTimer);
    }
    render() {
        if (!this.visible)
            return null;
        return (h("div", { class: "cel-overlay", onClick: this.dismiss },
            h("div", { class: "cel-confetti" }, this.confettiPieces.map((piece, i) => (h("div", { key: i, class: "cel-piece", style: {
                    left: `${piece.x}%`,
                    top: `${piece.y}%`,
                    width: `${piece.size}px`,
                    height: `${piece.size}px`,
                    backgroundColor: piece.color,
                    transform: `rotate(${piece.rotation}deg)`,
                    animationDelay: `${piece.delay}s`,
                } })))),
            h("div", { class: "cel-content" },
                h("div", { class: "cel-emoji" }, "\uD83C\uDF89"),
                h("h2", { class: "cel-message" }, this.message),
                this.points > 0 && (h("div", { class: "cel-points" },
                    h("span", { class: "cel-coin" }, "\uD83E\uDE99"),
                    h("span", { class: "cel-points-value" },
                        "+",
                        this.displayedPoints),
                    h("span", { class: "cel-points-label" }, "Popcoins"))),
                h("p", { class: "cel-tap-hint" }, "Tap to dismiss"))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-celebration",
        "componentClassName": "PopCelebration",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "active",
                "type": "boolean",
                "attribute": "active",
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
                    "text": "Trigger the animation"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "points",
                "type": "number",
                "attribute": "points",
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
                    "text": "Points earned (displayed in animation)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "message",
                "type": "string",
                "attribute": "message",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Quest Complete!'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Celebration message"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "visible"
            }, {
                "name": "displayedPoints"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "celebrationDone",
                "method": "celebrationDone",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Animation finished"
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "active",
                "methodName": "onActiveChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-CELEBRATION",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/celebration/celebration.css",
                        "relativePath": "celebration.css",
                        "originalComponentPath": "celebration.css"
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
        "hasVdomPropOrAttr": false,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "onClick", "key", "style"],
        "htmlTagNames": ["div", "h2", "span", "p"],
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
        "active": [{
                "onActiveChange": 0
            }]
    }; }
};
//# sourceMappingURL=celebration.js.map