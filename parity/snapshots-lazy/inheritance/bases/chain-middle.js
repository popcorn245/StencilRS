import { BaseProps } from './base-props';
/** The middle of a chain: adds members on top of BaseProps. */
export class ChainMiddle extends BaseProps {
    constructor() {
        super();
    }
    middle = 2;
    open = false;
    toggle() {
        this.open = !this.open;
    }
    static get properties() { return {
        "middle": {
            "type": "number",
            "mutable": false,
            "complexType": {
                "original": "number",
                "resolved": "number",
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
            "attribute": "middle",
            "defaultValue": "2"
        }
    }; }
    static get states() { return {
        "open": {}
    }; }
}
//# sourceMappingURL=chain-middle.js.map