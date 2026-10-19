import { registerInstance as __stencil_registerInstance, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopCarousel = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    get el() { return __stencil_getElement(this); }
    isGalleryView = false;
    currentSlide = 0;
    carouselElement;
    viewportElement;
    componentDidLoad() {
        // Find the carousel *inside* this component's slot
        this.carouselElement = this.el.querySelector('.carousel');
        if (!this.carouselElement) {
            console.error('[pop-carousel] No element with class ".carousel" found in slot.');
            return;
        }
        this.viewportElement = this.carouselElement.querySelector('.carousel__viewport');
        if (!this.viewportElement) {
            console.error('[pop-carousel] No element with class ".carousel__viewport" found.');
            return;
        }
        // Add a marker class to tell CSS that JS is available/active
        // This will be used to disable the CSS-only animations
        this.carouselElement.classList.add('js-enabled');
    }
    /**
     * Switches the carousel to gallery view (grid).
     */
    async viewGallery() {
        if (!this.carouselElement)
            return;
        this.isGalleryView = true;
        this.carouselElement.classList.add('gallery-mode');
    }
    /**
     * Scrolls to a specific slide by index.
     */
    async slideTo(index) {
        if (!this.viewportElement)
            return;
        const slideWidth = this.viewportElement.offsetWidth;
        const totalWidth = this.viewportElement.scrollWidth;
        const maxIndex = Math.floor(totalWidth / slideWidth) - 1;
        if (index < 0)
            index = 0;
        if (index > maxIndex)
            index = maxIndex;
        const nextScroll = index * slideWidth;
        this.viewportElement.scrollTo({
            left: nextScroll,
            behavior: 'smooth',
        });
        this.currentSlide = index;
        // Disable gallery view when sliding
        this.isGalleryView = false;
        this.carouselElement.classList.remove('gallery-mode');
    }
    /**
     * Scrolls the carousel to the next slide.
     */
    async next() {
        if (!this.viewportElement)
            return;
        const slideWidth = this.viewportElement.offsetWidth;
        const currentScroll = this.viewportElement.scrollLeft;
        const totalWidth = this.viewportElement.scrollWidth;
        let nextScroll = currentScroll + slideWidth;
        let nextIndex = this.currentSlide + 1;
        // Loop back to start if at end (allowing for small pixel rounding errors)
        if (nextScroll >= totalWidth - 10) {
            nextScroll = 0;
            nextIndex = 0;
        }
        this.viewportElement.scrollTo({
            left: nextScroll,
            behavior: 'smooth',
        });
        this.currentSlide = nextIndex;
    }
    /**
     * Scrolls the carousel to the previous slide.
     */
    async prev() {
        if (!this.viewportElement)
            return;
        const slideWidth = this.viewportElement.offsetWidth;
        const currentScroll = this.viewportElement.scrollLeft;
        const totalWidth = this.viewportElement.scrollWidth;
        const maxIndex = Math.floor(totalWidth / slideWidth) - 1;
        let nextScroll = currentScroll - slideWidth;
        let nextIndex = this.currentSlide - 1;
        if (nextScroll < 0) {
            // Loop to end
            nextScroll = totalWidth - slideWidth;
            nextIndex = maxIndex;
        }
        this.viewportElement.scrollTo({
            left: nextScroll,
            behavior: 'smooth',
        });
        this.currentSlide = nextIndex;
    }
    render() {
        // Render the slotted content
        return h("slot", { key: '0' });
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-carousel",
        "componentClassName": "PopCarousel",
        "elementRef": "el",
        "encapsulation": "none",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [],
        "virtualProperties": [],
        "states": [{
                "name": "isGalleryView"
            }, {
                "name": "currentSlide"
            }],
        "methods": [{
                "name": "viewGallery",
                "docs": {
                    "text": "Switches the carousel to gallery view (grid).",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<any>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "slideTo",
                "docs": {
                    "text": "Scrolls to a specific slide by index.",
                    "tags": []
                },
                "complexType": {
                    "signature": "(index: number) => Promise<any>",
                    "parameters": [{
                            "name": "index",
                            "type": "number",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "next",
                "docs": {
                    "text": "Scrolls the carousel to the next slide.",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<any>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "prev",
                "docs": {
                    "text": "Scrolls the carousel to the previous slide.",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<any>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }],
        "listeners": [],
        "events": [],
        "watchers": [],
        "doesExtend": false,
        "styles": [],
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
        "hasEvent": false,
        "hasLifecycle": true,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": true,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": false,
        "hasProp": false,
        "hasPropNumber": false,
        "hasPropBoolean": false,
        "hasPropString": false,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
        "hasState": true,
        "hasStyle": false,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": false,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": false,
        "hasVdomPropOrAttr": false,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": false,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key"],
        "htmlTagNames": ["slot"],
        "htmlParts": [],
        "htmlSlots": [""],
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
//# sourceMappingURL=carousel.js.map