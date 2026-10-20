/** A decorated base class: every member decorator, plus lifecycle. */
export class BaseProps {
    el;
    /** Shown before the name. */
    greeting = 'Hello';
    size = 'small';
    disabled = false;
    clicks = 0;
    baseClicked;
    greetingChanged(next) {
        console.log('greeting', next);
    }
    onClick() {
        this.clicks++;
        this.baseClicked.emit(this.clicks);
    }
    async reset() {
        this.clicks = 0;
    }
    componentDidLoad() {
        console.log('base loaded');
    }
    label() {
        return `${this.greeting} (${this.clicks})`;
    }
    static get properties() { return {
        "greeting": {
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
                "text": "Shown before the name."
            },
            "getter": false,
            "setter": false,
            "reflect": false,
            "attribute": "greeting",
            "defaultValue": "'Hello'"
        },
        "size": {
            "type": "string",
            "mutable": false,
            "complexType": {
                "original": "'small' | 'large'",
                "resolved": "\"large\" | \"small\"",
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
            "reflect": true,
            "attribute": "size",
            "defaultValue": "'small'"
        },
        "disabled": {
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
            "attribute": "disabled",
            "defaultValue": "false"
        }
    }; }
    static get states() { return {
        "clicks": {}
    }; }
    static get events() { return [{
            "method": "baseClicked",
            "name": "baseClicked",
            "bubbles": true,
            "cancelable": true,
            "composed": true,
            "docs": {
                "tags": [],
                "text": ""
            },
            "complexType": {
                "original": "number",
                "resolved": "number",
                "references": {}
            }
        }]; }
    static get methods() { return {
        "reset": {
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
    static get elementRef() { return "el"; }
    static get watchers() { return [{
            "propName": "greeting",
            "methodName": "greetingChanged"
        }]; }
    static get listeners() { return [{
            "name": "click",
            "method": "onClick",
            "target": undefined,
            "capture": false,
            "passive": false
        }]; }
}
//# sourceMappingURL=base-props.js.map