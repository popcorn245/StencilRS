import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
/**
 * A card with documented members.
 *
 * Second paragraph, with `code` and a {@link Prop} link.
 *
 * @slot - the card body
 * @part header - the header part
 * @deprecated use the other card
 */
export class DocsCmp {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "docs-cmp",
        "$members$": {
            "oneLine": [1, "one-line"],
            "many": [1],
            "inlineTag": [1, "inline-tag"],
            "onlyTags": [1, "only-tags"],
            "twoComments": [1, "two-comments"],
            "lineComment": [1, "line-comment"],
            "blockComment": [1, "block-comment"],
            "unstarred": [1],
            "example": [1],
            "both": [6145],
            "hidden": [32],
            "open": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=docs.js.map