import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
import { ICON_PATHS } from './icons';
export const BrandIcon = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** The registered icon name (e.g. "star", "link", "trash"). */
    name;
    /**
     * Optional explicit size; sets `font-size` on the host (e.g. "1.2rem",
     * "20px"). When omitted the icon inherits `1em` from the host font-size,
     * which can also be driven via the `--size` custom property.
     */
    size;
    /**
     * Accessible label. When present, the icon exposes `aria-label` + `role="img"`;
     * otherwise it is marked `aria-hidden="true"` (decorative).
     */
    label;
    /** Stroke weight override for the outline vectors (default 2). */
    strokeWidth;
    render() {
        const hasLabel = !!this.label;
        const def = ICON_PATHS[this.name];
        // Centering + sizing mirrored inline so the host is a perfectly-centered
        // VISIBLE block even though this is a scoped component (`:host` css doesn't
        // apply in scoped mode). font-size falls back to `var(--size, 1.25rem)`.
        const style = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '0',
            fontSize: this.size || 'var(--size, 1.25rem)',
        };
        // Build the whole <svg> as a string and inject it — Stencil's typed JSX has
        // no `innerHTML` on <svg>, and it can't diff arbitrary registry markup into
        // vnodes anyway, so we render a wrapper <span> with `innerHTML`. Everything
        // paints in `currentColor`, so the icon themes with the surrounding text.
        const paint = def?.fill
            ? 'fill="currentColor" stroke="none"'
            : `fill="none" stroke="currentColor" stroke-width="${this.strokeWidth ?? 2}"`;
        // The svg is injected via innerHTML, so it does NOT receive Stencil's scoped
        // style attribute — the `.pop-brand-icon__svg` class rule won't match it.
        // Size it with an INLINE style (1em square, tracks the host font-size) so the
        // glyph is always visible regardless of scoping.
        const svg = `<svg class="pop-brand-icon__svg" style="display:block;width:1em;height:1em;color:inherit;flex:0 0 auto" viewBox="0 0 24 24" ${paint} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${def?.body ?? ''}</svg>`;
        return (h(Host, { key: '0', class: "pop-brand-icon", style: style, role: hasLabel ? 'img' : undefined, "aria-label": hasLabel ? this.label : undefined, "aria-hidden": hasLabel ? undefined : 'true' },
            h("span", { key: '1', class: "pop-brand-icon__wrap", innerHTML: svg })));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-brand-icon",
        "componentClassName": "BrandIcon",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "name",
                "type": "any",
                "attribute": "name",
                "reflect": false,
                "mutable": false,
                "required": true,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "BrandIconName | string",
                    "resolved": "any",
                    "references": {
                        "BrandIconName": {
                            "location": "global",
                            "id": "global::BrandIconName"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The registered icon name (e.g. \"star\", \"link\", \"trash\")."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "size",
                "type": "string",
                "attribute": "size",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Optional explicit size; sets `font-size` on the host (e.g. \"1.2rem\",\n\"20px\"). When omitted the icon inherits `1em` from the host font-size,\nwhich can also be driven via the `--size` custom property."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "label",
                "type": "string",
                "attribute": "label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Accessible label. When present, the icon exposes `aria-label` + `role=\"img\"`;\notherwise it is marked `aria-hidden=\"true\"` (decorative)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "strokeWidth",
                "type": "number",
                "attribute": "stroke-width",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "number",
                    "resolved": "number | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Stroke weight override for the outline vectors (default 2)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [],
        "events": [],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-BRAND-ICON",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/atoms/brand-icon/brand-icon.css",
                        "relativePath": "brand-icon.css",
                        "originalComponentPath": "brand-icon.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": false,
        "hasLifecycle": false,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": true,
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": false,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": false,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": false,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "style", "role", "aria-label", "aria-hidden", "innerHTML"],
        "htmlTagNames": ["span"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
};
//# sourceMappingURL=brand-icon.js.map