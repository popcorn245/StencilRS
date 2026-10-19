import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h, Host } from "@stencil/core/runtime/server";
import Reveal from 'reveal.js';
import PopSlideshowStyle0 from "./ui-kit/organisms/slideshow/slideshow.css?tag=pop-slideshow&encapsulation=scoped";
export class PopSlideshow {
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
    static get watchers() { return {
        "theme": [{
                "onThemeChange": 0
            }]
    }; }
    static get style() { return PopSlideshowStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-slideshow",
        "$members$": {
            "theme": [513],
            "transition": [513],
            "autoSlide": [514, "auto-slide"],
            "loop": [516],
            "controls": [516],
            "progress": [516],
            "hash": [516],
            "embedded": [516],
            "width": [514],
            "height": [514],
            "margin": [514],
            "slideNumber": [516, "slide-number"],
            "mouseWheel": [516, "mouse-wheel"],
            "touch": [516],
            "fullscreen": [516],
            "plugins": [513],
            "goToSlide": [64],
            "next": [64],
            "prev": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["theme", "theme"], ["transition", "transition"], ["autoSlide", "auto-slide"], ["loop", "loop"], ["controls", "controls"], ["progress", "progress"], ["hash", "hash"], ["embedded", "embedded"], ["width", "width"], ["height", "height"], ["margin", "margin"], ["slideNumber", "slide-number"], ["mouseWheel", "mouse-wheel"], ["touch", "touch"], ["fullscreen", "fullscreen"], ["plugins", "plugins"]]
    }; }
}
//# sourceMappingURL=slideshow.js.map