import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const SerializersCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    when = new Date(0);
    tags = [];
    get label() {
        return this._label;
    }
    _label = '';
    whenToAttr(value) {
        return value?.toISOString();
    }
    whenFromAttr(value) {
        return new Date(value);
    }
    tagsTranslate(value) {
        return Array.isArray(value) ? value.join(',') : value.split(',');
    }
    labelToAttr(value) {
        return value.toUpperCase();
    }
    /** No @Prop named `missing`: ignored. */
    missingFromAttr(value) {
        return value;
    }
    render() {
        return h("p", { key: '0' },
            this.when.toISOString(),
            " ",
            this.tags.join(' '),
            " ",
            this.label);
    }
    static get serializers() { return {
        "when": [{
                "whenToAttr": 0
            }],
        "tags": [{
                "tagsTranslate": 0
            }],
        "label": [{
                "labelToAttr": 0
            }]
    }; }
    static get deserializers() { return {
        "when": [{
                "whenFromAttr": 0
            }],
        "tags": [{
                "tagsTranslate": 0
            }]
    }; }
};
__stencil_proxyCustomElement(SerializersCmp, [512, "serializers-cmp", {
        "when": [520],
        "tags": [528],
        "label": [2561]
    }, undefined, undefined, {
        "when": [{
                "whenToAttr": 0
            }],
        "tags": [{
                "tagsTranslate": 0
            }],
        "label": [{
                "labelToAttr": 0
            }]
    }, {
        "when": [{
                "whenFromAttr": 0
            }],
        "tags": [{
                "tagsTranslate": 0
            }]
    }]);
//# sourceMappingURL=serializers.js.map