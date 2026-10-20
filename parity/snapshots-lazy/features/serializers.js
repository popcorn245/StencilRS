import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const SerializersCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=serializers.js.map