import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
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
const PropsUnionsAliases = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
__stencil_defineCustomElement(PropsUnionsAliases, [512, "props-unions-aliases", {
        "size": [1],
        "count": [2],
        "literalUnion": [1, "literal-union"],
        "maybeBool": [4, "maybe-bool"],
        "nullableStr": [1, "nullable-str"],
        "strOrNum": [8, "str-or-num"],
        "strOrList": [1, "str-or-list"],
        "mode": [1],
        "level": [2],
        "mixed": [8],
        "modeMember": [1, "mode-member"],
        "options": [16],
        "parenthesized": [1],
        "template": [1]
    }]);
//# sourceMappingURL=props-unions-aliases.js.map