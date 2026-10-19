import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const DocsCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.happened = __stencil_createEvent(this, "happened", 7);
    }
    /** One line. */
    oneLine;
    /**
     * Many lines
     *   keep their indentation
     *
     * and blank lines.
     * @default 'x'
     * @since 1.2
     */
    many = 'x';
    /** Same line as the tag @internal */
    inlineTag;
    /**
     * @deprecated
     */
    onlyTags;
    /** First comment. */
    /** Second comment wins both. */
    twoComments;
    // not a JSDoc
    lineComment;
    /* not a JSDoc either */
    blockComment;
    /**
     Unstarred
     lines
     */
    unstarred;
    /**
     * Text with an email a@b.com and @mention and trailing spaces.
     * Tag text spanning
     * @example
     * <docs-cmp></docs-cmp>
     *
     * ```tsx
     * <docs-cmp many="y" />
     * ```
     * @see https://stenciljs.com
     */
    example;
    /** The getter docs. */
    get both() {
        return 'a';
    }
    /** The setter docs. */
    set both(_v) { }
    /** Fired when something happens.
     * @since 2.0
     */
    happened;
    /**
     * Opens the card.
     * @param id the card id
     * @param {boolean} [force=false] force it open
     * @returns whether it opened
     */
    async open(id, force) {
        return !!id && !!force;
    }
    /** State docs are not part of the metadata. */
    hidden = false;
    render() {
        return h("div", { key: '0' });
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "docs-cmp",
        "componentClassName": "DocsCmp",
        "elementRef": null,
        "encapsulation": "none",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "oneLine",
                "type": "string",
                "attribute": "one-line",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "One line."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "many",
                "type": "string",
                "attribute": "many",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'x'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [{
                            "name": "default",
                            "text": "'x'"
                        }, {
                            "name": "since",
                            "text": "1.2"
                        }],
                    "text": "Many lines\n  keep their indentation\n\nand blank lines."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "inlineTag",
                "type": "string",
                "attribute": "inline-tag",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [{
                            "name": "internal",
                            "text": undefined
                        }],
                    "text": "Same line as the tag"
                },
                "internal": true,
                "getter": false,
                "setter": false
            }, {
                "name": "onlyTags",
                "type": "string",
                "attribute": "only-tags",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [{
                            "name": "deprecated",
                            "text": undefined
                        }],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "twoComments",
                "type": "string",
                "attribute": "two-comments",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Second comment wins both."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "lineComment",
                "type": "string",
                "attribute": "line-comment",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
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
                "name": "blockComment",
                "type": "string",
                "attribute": "block-comment",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
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
                "name": "unstarred",
                "type": "string",
                "attribute": "unstarred",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Unstarred\nlines"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "example",
                "type": "string",
                "attribute": "example",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [{
                            "name": "mention",
                            "text": "and trailing spaces.\nTag text spanning"
                        }, {
                            "name": "example",
                            "text": "<docs-cmp></docs-cmp>\n\n```tsx\n<docs-cmp many=\"y\" />\n```"
                        }, {
                            "name": "see",
                            "text": "https://stenciljs.com"
                        }],
                    "text": "Text with an email a@b.com and"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "both",
                "type": "string",
                "attribute": "both",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'a'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The getter docs.\nThe setter docs."
                },
                "internal": false,
                "getter": true,
                "setter": true
            }],
        "virtualProperties": [],
        "states": [{
                "name": "hidden"
            }],
        "methods": [{
                "name": "open",
                "docs": {
                    "text": "Opens the card.",
                    "tags": [{
                            "name": "param",
                            "text": "id the card id"
                        }, {
                            "name": "param",
                            "text": "force force it open"
                        }, {
                            "name": "returns",
                            "text": "whether it opened"
                        }]
                },
                "complexType": {
                    "signature": "(id: string, force?: boolean) => Promise<boolean>",
                    "parameters": [{
                            "name": "id",
                            "type": "string",
                            "docs": "the card id"
                        }, {
                            "name": "force",
                            "type": "boolean | undefined",
                            "docs": "force it open"
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<boolean>"
                },
                "internal": false
            }],
        "listeners": [],
        "events": [{
                "name": "happened",
                "method": "happened",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [{
                            "name": "since",
                            "text": "2.0"
                        }],
                    "text": "Fired when something happens."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [],
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
        "hasMethod": true,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": false,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": false,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": false,
        "hasVdomPropOrAttr": false,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": false,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key"],
        "htmlTagNames": ["div"],
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
//# sourceMappingURL=docs.js.map