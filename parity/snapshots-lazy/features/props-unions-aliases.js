import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
var Mode;
(function (Mode) {
    Mode["Light"] = "light";
    Mode["Dark"] = "dark";
})(Mode || (Mode = {}));
var Level;
(function (Level) {
    Level[Level["Low"] = 0] = "Low";
    Level[Level["High"] = 1] = "High";
})(Level || (Level = {}));
var Mixed;
(function (Mixed) {
    Mixed["A"] = "a";
    Mixed[Mixed["B"] = 1] = "B";
})(Mixed || (Mixed = {}));
export const PropsUnionsAliases = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    size = 'md';
    count;
    literalUnion;
    maybeBool;
    nullableStr;
    strOrNum;
    strOrList;
    mode = Mode.Light;
    level;
    mixed;
    modeMember;
    options;
    parenthesized;
    template;
    render() {
        return h("div", { key: '0' }, this.size);
    }
};
//# sourceMappingURL=props-unions-aliases.js.map