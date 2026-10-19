import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
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
export class PropsUnionsAliases {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "props-unions-aliases",
        "$members$": {
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
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=props-unions-aliases.js.map