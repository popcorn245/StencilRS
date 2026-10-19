import { h } from "@stencil/core/testing";
export var ExportedEnum;
(function (ExportedEnum) {
    ExportedEnum[ExportedEnum["A"] = 0] = "A";
})(ExportedEnum || (ExportedEnum = {}));
export const helper = () => 1;
export function otherHelper() { }
export class ExportsCmp {
    render() {
        return h("div", null);
    }
}
//# sourceMappingURL=exports.js.map