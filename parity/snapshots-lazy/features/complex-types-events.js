import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export var Level;
(function (Level) {
    Level[Level["Low"] = 0] = "Low";
    Level[Level["High"] = 1] = "High";
})(Level || (Level = {}));
export const PopNoteCard = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.picked = __stencil_createEvent(this, "picked", 7);
        this.moded = __stencil_createEvent(this, "moded", 7);
        this.leveled = __stencil_createEvent(this, "leveled", 7);
        this.listed = __stencil_createEvent(this, "listed", 7);
        this.pair = __stencil_createEvent(this, "pair", 7);
        this.inline = __stencil_createEvent(this, "inline", 7);
        this.plain = __stencil_createEvent(this, "plain", 7);
        this.fn = __stencil_createEvent(this, "fn", 7);
    }
    /** Fired when the note is picked. */
    picked;
    moded;
    leveled;
    listed;
    pair;
    inline;
    plain;
    fn;
    render() {
        return h("div", { key: '0' });
    }
};
//# sourceMappingURL=complex-types-events.js.map