import { h } from "@stencil/core/testing";
export default class DefaultExport {
    value;
    render() {
        return h("div", null, this.value);
    }
    static get properties() { return {
        "value": {
            "type": "string",
            "mutable": false,
            "complexType": {
                "original": "string",
                "resolved": "string",
                "references": {}
            },
            "required": false,
            "optional": false,
            "docs": {
                "tags": [],
                "text": ""
            },
            "getter": false,
            "setter": false,
            "reflect": false,
            "attribute": "value"
        }
    }; }
}
//# sourceMappingURL=default-export.js.map