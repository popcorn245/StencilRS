/** A mixin factory with a named class inside. */
export const withCount = (Base) => {
    class WithCount extends Base {
        constructor() {
            super();
        }
        count = 0;
        step = 1;
        async increment() {
            this.count += this.step;
        }
        static get properties() { return {
            "step": {
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
                "attribute": "step",
                "defaultValue": "1"
            }
        }; }
        static get states() { return {
            "count": {}
        }; }
        static get methods() { return {
            "increment": {
                "complexType": {
                    "signature": "() => Promise<void>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<void>"
                },
                "docs": {
                    "text": "",
                    "tags": []
                }
            }
        }; }
    }
    return WithCount;
};
/** A mixin factory returning an anonymous class. */
export const withLabel = (Base) => class extends Base {
    label = 'Label';
    labelChanged() {
        console.log(this.label);
    }
};
/** A function declaration factory. */
export function withTheme(Base) {
    class WithTheme extends Base {
        constructor() {
            super();
        }
        theme = 'light';
        static get properties() { return {
            "theme": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "'light' | 'dark'",
                    "resolved": "\"dark\" | \"light\"",
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
                "attribute": "theme",
                "defaultValue": "'light'"
            }
        }; }
    }
    return WithTheme;
}
//# sourceMappingURL=mixins.js.map