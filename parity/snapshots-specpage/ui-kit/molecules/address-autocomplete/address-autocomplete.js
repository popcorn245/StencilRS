import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const AddressAutocomplete = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.addressSelected = __stencil_createEvent(this, "addressSelected", 7);
    }
    get el() { return __stencil_getElement(this); }
    apiKey;
    value = '';
    placeholder = 'Enter a location...';
    isScriptLoaded = false;
    mapUrl = '';
    addressSelected;
    inputEl;
    autocomplete;
    componentDidLoad() {
        this.loadGoogleMapsScript();
        if (this.value) {
            this.updateMapPreview(this.value);
        }
    }
    loadGoogleMapsScript() {
        if (window.google && window.google.maps) {
            this.isScriptLoaded = true;
            this.initAutocomplete();
            return;
        }
        if (!this.apiKey) {
            console.warn('Google Maps API key not provided to pop-address-autocomplete');
            return;
        }
        if (document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`)) {
            const checkInterval = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkInterval);
                    this.isScriptLoaded = true;
                    this.initAutocomplete();
                }
            }, 100);
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.isScriptLoaded = true;
            this.initAutocomplete();
        };
        document.head.appendChild(script);
    }
    initAutocomplete() {
        if (!this.inputEl || !this.isScriptLoaded)
            return;
        this.autocomplete = new google.maps.places.Autocomplete(this.inputEl, {
            types: ['establishment', 'geocode'],
        });
        this.autocomplete.addListener('place_changed', () => {
            const place = this.autocomplete.getPlace();
            let address = this.inputEl.value;
            let lat, lng;
            if (place.geometry && place.geometry.location) {
                lat = place.geometry.location.lat();
                lng = place.geometry.location.lng();
                this.updateMapPreview(address, lat, lng);
            }
            this.addressSelected.emit({
                address: address,
                lat: lat,
                lng: lng,
                placeId: place.place_id
            });
        });
    }
    updateMapPreview(address, lat, lng) {
        if (!this.apiKey)
            return;
        let query = '';
        if (lat && lng) {
            query = `${lat},${lng}`;
        }
        else if (address) {
            query = encodeURIComponent(address);
        }
        else {
            this.mapUrl = '';
            return;
        }
        this.mapUrl = `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=${query}`;
    }
    handleInput = (e) => {
        const target = e.target;
        this.value = target.value;
        if (!target.value) {
            this.mapUrl = '';
            this.addressSelected.emit({ address: '' });
        }
    };
    render() {
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: "autocomplete-container" },
                h("input", { key: '2', type: "text", placeholder: this.placeholder, value: this.value, ref: (el) => (this.inputEl = el), onInput: this.handleInput, class: "address-input" }),
                this.mapUrl && (h("div", { key: '3', class: "map-preview" },
                    h("iframe", { key: '4', width: "100%", height: "200", style: { border: "0", borderRadius: "8px" }, loading: "lazy", allowFullScreen: true, referrerPolicy: "no-referrer-when-downgrade", src: this.mapUrl }))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-address-autocomplete",
        "componentClassName": "AddressAutocomplete",
        "elementRef": "el",
        "encapsulation": "shadow",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": "open",
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "apiKey",
                "type": "string",
                "attribute": "api-key",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "value",
                "type": "string",
                "attribute": "value",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "placeholder",
                "type": "string",
                "attribute": "placeholder",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Enter a location...'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "isScriptLoaded"
            }, {
                "name": "mapUrl"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "addressSelected",
                "method": "addressSelected",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ address: string, lat?: number, lng?: number, placeId?: string }",
                    "resolved": "{ address: string; lat?: number | undefined; lng?: number | undefined; placeId?: string | undefined; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-ADDRESS-AUTOCOMPLETE",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/address-autocomplete/address-autocomplete.css",
                        "relativePath": "address-autocomplete.css",
                        "originalComponentPath": "address-autocomplete.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": true,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": true,
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
        "hasPropNumber": false,
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "type", "placeholder", "value", "ref", "onInput", "width", "height", "style", "loading", "allowFullScreen", "referrerPolicy", "src"],
        "htmlTagNames": ["script", "div", "input", "iframe"],
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
//# sourceMappingURL=address-autocomplete.js.map