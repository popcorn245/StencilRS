import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
import { marked } from 'marked';
export const PopResearchMessage = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** Who sent the message */
    role = 'user';
    /** Message text content (may stream in) */
    content = '';
    /** Whether the message is still streaming */
    streaming = false;
    /** Avatar URL for user messages */
    avatarUrl = '';
    /** Avatar initials fallback */
    avatarInitials = '';
    /** JSON string of IntentChip[] — shown on assistant messages after streaming */
    intents = '[]';
    parsedIntents = [];
    onIntentsChange(val) {
        try {
            this.parsedIntents = JSON.parse(val);
        }
        catch {
            this.parsedIntents = [];
        }
    }
    componentWillLoad() {
        try {
            this.parsedIntents = JSON.parse(this.intents);
        }
        catch {
            this.parsedIntents = [];
        }
    }
    intentColor(type) {
        const map = {
            task: '#3b82f6',
            event: '#22c55e',
            note: '#f59e0b',
            research: '#a855f7',
            quest: '#ec4899',
            unknown: '#6b7280',
        };
        return map[type] ?? map.unknown;
    }
    intentIcon(type) {
        const map = {
            task: '✓',
            event: '📅',
            note: '📝',
            research: '🔬',
            quest: '🗺️',
            unknown: '?',
        };
        return map[type] ?? '?';
    }
    render() {
        const isUser = this.role === 'user';
        return (h("div", { key: '0', class: { 'rm-root': true, 'rm-role--user': isUser, 'rm-role--assistant': !isUser } },
            isUser && (h("div", { key: '1', class: "rm-avatar" }, this.avatarUrl ? (h("img", { src: this.avatarUrl, alt: "", class: "rm-avatar-img" })) : (h("div", { class: "rm-avatar-fallback" }, this.avatarInitials.slice(0, 2).toUpperCase())))),
            h("div", { key: '2', class: "rm-body" },
                h("div", { key: '3', class: { 'rm-bubble': true, 'rm-bubble--streaming': this.streaming }, innerHTML: marked.parse(this.content || (this.streaming ? '' : '…')) }),
                this.streaming && h("span", { key: '4', class: "rm-cursor", "aria-hidden": "true" }),
                !isUser && !this.streaming && this.parsedIntents.length > 0 && (h("div", { key: '5', class: "rm-intents", role: "list", "aria-label": "Detected intents" }, this.parsedIntents.map((chip, i) => (h("span", { key: i, class: "rm-chip", role: "listitem", style: { '--chip-color': this.intentColor(chip.type) }, title: chip.type },
                    h("span", { class: "rm-chip-icon", "aria-hidden": "true" }, this.intentIcon(chip.type)),
                    chip.label))))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-research-message",
        "componentClassName": "PopResearchMessage",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "role",
                "type": "string",
                "attribute": "role",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'user'",
                "complexType": {
                    "original": "MessageRole",
                    "resolved": "\"assistant\" | \"user\"",
                    "references": {
                        "MessageRole": {
                            "location": "local",
                            "path": "ui-kit/organisms/research-message/research-message.tsx",
                            "id": "ui-kit/organisms/research-message/research-message.tsx::MessageRole"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Who sent the message"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "content",
                "type": "string",
                "attribute": "content",
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
                    "text": "Message text content (may stream in)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "streaming",
                "type": "boolean",
                "attribute": "streaming",
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
                    "text": "Whether the message is still streaming"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "avatarUrl",
                "type": "string",
                "attribute": "avatar-url",
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
                    "text": "Avatar URL for user messages"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "avatarInitials",
                "type": "string",
                "attribute": "avatar-initials",
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
                    "text": "Avatar initials fallback"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "intents",
                "type": "string",
                "attribute": "intents",
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
                    "text": "JSON string of IntentChip[] \u2014 shown on assistant messages after streaming"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "parsedIntents"
            }],
        "methods": [],
        "listeners": [],
        "events": [],
        "watchers": [{
                "propName": "intents",
                "methodName": "onIntentsChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-RESEARCH-MESSAGE",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/research-message/research-message.css",
                        "relativePath": "research-message.css",
                        "originalComponentPath": "research-message.css"
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
        "htmlAttrNames": ["key", "class", "src", "alt", "innerHTML", "aria-hidden", "role", "aria-label", "style", "title"],
        "htmlTagNames": ["div", "img", "span"],
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
        "intents": [{
                "onIntentsChange": 0
            }]
    }; }
};
//# sourceMappingURL=research-message.js.map