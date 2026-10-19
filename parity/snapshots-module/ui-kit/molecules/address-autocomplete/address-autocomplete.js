import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopAddressAutocompleteStyle0 from "./ui-kit/molecules/address-autocomplete/address-autocomplete.css?tag=pop-address-autocomplete&encapsulation=shadow";
export const AddressAutocomplete = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.addressSelected = __stencil_createEvent(this, "addressSelected", 7);
    }
    get el() { return this; }
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
    static get style() { return PopAddressAutocompleteStyle0(); }
};
__stencil_proxyCustomElement(AddressAutocomplete, [513, "pop-address-autocomplete", {
        "apiKey": [1, "api-key"],
        "value": [1],
        "placeholder": [1],
        "isScriptLoaded": [32],
        "mapUrl": [32]
    }]);
//# sourceMappingURL=address-autocomplete.js.map