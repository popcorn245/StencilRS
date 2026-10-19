class Existing {
    fromExisting = true;
    static get properties() { return {
        "fromExisting": {
            "type": "boolean",
            "mutable": false,
            "complexType": {
                "original": "boolean",
                "resolved": "boolean",
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
            "attribute": "from-existing",
            "defaultValue": "true"
        }
    }; }
}
/** Returns an existing class by reference: Stencil can't see a class literal in it. */
export const byReference = (_Base) => Existing;
/** Implements, but extends nothing. */
export class Implementer {
    name = 'thing';
}
//# sourceMappingURL=factories.js.map