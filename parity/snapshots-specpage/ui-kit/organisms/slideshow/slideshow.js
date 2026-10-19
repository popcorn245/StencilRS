import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h, Host } from "@stencil/core/testing";
import Reveal from 'reveal.js';
export const PopSlideshow = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popSlideChanged = __stencil_createEvent(this, "popSlideChanged", 7);
        this.popSlideshowReady = __stencil_createEvent(this, "popSlideshowReady", 7);
    }
    get el() { return __stencil_getElement(this); }
    deck;
    themeLink;
    coreLink;
    revealContainer;
    // ─── Props ───
    theme = 'black';
    transition = 'slide';
    autoSlide = 0;
    loop = false;
    controls = true;
    progress = true;
    hash = false;
    embedded = true;
    width = 960;
    height = 700;
    margin = 0.04;
    slideNumber = false;
    mouseWheel = false;
    touch = true;
    fullscreen = true;
    plugins = '[]';
    // ─── Events ───
    popSlideChanged;
    popSlideshowReady;
    // ─── Methods ───
    async goToSlide(indexH, indexV = 0) {
        this.deck?.slide(indexH, indexV);
    }
    async next() {
        this.deck?.next();
    }
    async prev() {
        this.deck?.prev();
    }
    // ─── Watchers ───
    onThemeChange(newTheme) {
        this.loadTheme(newTheme);
    }
    // ─── Lifecycle ───
    componentDidLoad() {
        this.loadCoreCss();
        this.loadTheme(this.theme);
        this.buildSlides();
        this.initReveal();
    }
    disconnectedCallback() {
        if (this.deck) {
            this.deck.destroy();
        }
        if (this.themeLink) {
            this.themeLink.remove();
        }
    }
    loadCoreCss() {
        if (!document.head.querySelector('link[data-reveal-core]')) {
            this.coreLink = document.createElement('link');
            this.coreLink.rel = 'stylesheet';
            this.coreLink.href = 'https://cdn.jsdelivr.net/npm/reveal.js@6/dist/reveal.css';
            this.coreLink.setAttribute('data-reveal-core', '');
            document.head.appendChild(this.coreLink);
        }
    }
    loadTheme(theme) {
        if (this.themeLink) {
            this.themeLink.remove();
        }
        this.themeLink = document.createElement('link');
        this.themeLink.rel = 'stylesheet';
        this.themeLink.href = `https://cdn.jsdelivr.net/npm/reveal.js@6/dist/theme/${theme}.css`;
        document.head.appendChild(this.themeLink);
    }
    buildSlides() {
        const slidesContainer = this.revealContainer?.querySelector('.slides');
        if (!slidesContainer)
            return;
        const slotted = this.el.querySelectorAll(':scope > [slot="slide"], :scope > :not(.reveal)');
        const children = Array.from(slotted).filter((child) => child !== this.revealContainer && !child.classList.contains('fullscreen-btn') && child.tagName !== 'SLOT');
        children.forEach((child) => {
            if (child instanceof HTMLElement && child.hasAttribute('data-vertical')) {
                // Vertical slide group
                const section = document.createElement('section');
                Array.from(child.children).forEach((subSlide) => {
                    const subSection = document.createElement('section');
                    subSection.innerHTML = subSlide.innerHTML;
                    // Copy data attributes
                    Array.from(subSlide.attributes).forEach((attr) => {
                        if (attr.name.startsWith('data-') && attr.name !== 'data-vertical') {
                            subSection.setAttribute(attr.name, attr.value);
                        }
                    });
                    section.appendChild(subSection);
                });
                slidesContainer.appendChild(section);
            }
            else {
                // Horizontal slide
                const section = document.createElement('section');
                section.innerHTML = child.innerHTML;
                if (child instanceof HTMLElement) {
                    Array.from(child.attributes).forEach((attr) => {
                        if (attr.name.startsWith('data-')) {
                            section.setAttribute(attr.name, attr.value);
                        }
                    });
                }
                slidesContainer.appendChild(section);
            }
            child.remove();
        });
    }
    async initReveal() {
        const pluginNames = JSON.parse(this.plugins);
        const loadedPlugins = await this.loadPlugins(pluginNames);
        this.deck = new Reveal(this.revealContainer, {
            embedded: this.embedded,
            transition: this.transition,
            autoSlide: this.autoSlide,
            loop: this.loop,
            controls: this.controls,
            progress: this.progress,
            hash: this.hash,
            width: this.width,
            height: this.height,
            margin: this.margin,
            slideNumber: this.slideNumber,
            mouseWheel: this.mouseWheel,
            touch: this.touch,
            plugins: loadedPlugins,
        });
        this.deck.on('slidechanged', (event) => {
            this.popSlideChanged.emit({ indexH: event.indexh, indexV: event.indexv });
        });
        await this.deck.initialize();
        this.popSlideshowReady.emit();
    }
    async loadPlugins(pluginNames) {
        const plugins = [];
        for (const name of pluginNames) {
            switch (name) {
                case 'Markdown': {
                    const mod = await import('reveal.js/plugin/markdown');
                    plugins.push(mod.default);
                    break;
                }
                case 'Highlight': {
                    const mod = await import('reveal.js/plugin/highlight');
                    plugins.push(mod.default);
                    break;
                }
                case 'Notes': {
                    const mod = await import('reveal.js/plugin/notes');
                    plugins.push(mod.default);
                    break;
                }
                case 'Math': {
                    const mod = await import('reveal.js/plugin/math');
                    plugins.push(mod.default);
                    break;
                }
                case 'Search': {
                    const mod = await import('reveal.js/plugin/search');
                    plugins.push(mod.default);
                    break;
                }
                case 'Zoom': {
                    const mod = await import('reveal.js/plugin/zoom');
                    plugins.push(mod.default);
                    break;
                }
            }
        }
        return plugins;
    }
    toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            this.el.requestFullscreen();
        }
        else {
            document.exitFullscreen();
        }
    };
    render() {
        return (h(Host, { key: '0', class: { 'is-embedded': this.embedded, 'is-fullpage': !this.embedded } },
            h("div", { key: '1', class: "reveal", ref: (el) => (this.revealContainer = el) },
                h("div", { key: '2', class: "slides" })),
            this.fullscreen && (h("button", { key: '3', class: "fullscreen-btn", onClick: this.toggleFullscreen, title: "Toggle fullscreen" },
                h("svg", { key: '4', xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2" },
                    h("path", { key: '5', d: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" })))),
            h("slot", { key: '6' })));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-slideshow",
        "componentClassName": "PopSlideshow",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "theme",
                "type": "string",
                "attribute": "theme",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'black'",
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
                "name": "transition",
                "type": "string",
                "attribute": "transition",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'slide'",
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
                "name": "autoSlide",
                "type": "number",
                "attribute": "auto-slide",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
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
                "name": "loop",
                "type": "boolean",
                "attribute": "loop",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
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
                "name": "controls",
                "type": "boolean",
                "attribute": "controls",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
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
                "name": "progress",
                "type": "boolean",
                "attribute": "progress",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
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
                "name": "hash",
                "type": "boolean",
                "attribute": "hash",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
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
                "name": "embedded",
                "type": "boolean",
                "attribute": "embedded",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
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
                "name": "width",
                "type": "number",
                "attribute": "width",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "960",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
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
                "name": "height",
                "type": "number",
                "attribute": "height",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "700",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
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
                "name": "margin",
                "type": "number",
                "attribute": "margin",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0.04",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
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
                "name": "slideNumber",
                "type": "boolean",
                "attribute": "slide-number",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
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
                "name": "mouseWheel",
                "type": "boolean",
                "attribute": "mouse-wheel",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
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
                "name": "touch",
                "type": "boolean",
                "attribute": "touch",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
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
                "name": "fullscreen",
                "type": "boolean",
                "attribute": "fullscreen",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
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
                "name": "plugins",
                "type": "string",
                "attribute": "plugins",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
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
        "states": [],
        "methods": [{
                "name": "goToSlide",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(indexH: number, indexV?: number) => Promise<any>",
                    "parameters": [{
                            "name": "indexH",
                            "type": "number",
                            "docs": ""
                        }, {
                            "name": "indexV",
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
                    "text": "",
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
                    "text": "",
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
        "events": [{
                "name": "popSlideChanged",
                "method": "popSlideChanged",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ indexH: number; indexV: number }",
                    "resolved": "{ indexH: number; indexV: number; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popSlideshowReady",
                "method": "popSlideshowReady",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "theme",
                "methodName": "onThemeChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-SLIDESHOW",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/slideshow/slideshow.css",
                        "relativePath": "slideshow.css",
                        "originalComponentPath": "slideshow.css"
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
        "hasDisconnectedCallbackFn": true,
        "hasElement": false,
        "hasEvent": true,
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
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": true,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": true,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
        "hasState": false,
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
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "ref", "onClick", "title", "xmlns", "width", "height", "viewBox", "fill", "stroke", "stroke-width", "d"],
        "htmlTagNames": ["link", "section", "div", "button", "svg", "path", "slot"],
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
    static get watchers() { return {
        "theme": [{
                "onThemeChange": 0
            }]
    }; }
};
//# sourceMappingURL=slideshow.js.map