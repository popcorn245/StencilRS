import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopGalleryStyle0 from "./ui-kit/molecules/gallery/gallery.css?tag=pop-gallery";
const PopGallery = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    get el() { return this; }
    /** When true, starts collapsed. Click the strip to expand. */
    collapsible = false;
    currentIndex = 0;
    total = 0;
    expanded = false;
    dominantColor = '';
    scale = 1;
    translateX = 0;
    translateY = 0;
    isFullscreen = false;
    viewportEl;
    scrollTimeout;
    // Pinch tracking
    lastTouchDistance = 0;
    // Pan tracking
    isDragging = false;
    dragStartX = 0;
    dragStartY = 0;
    dragStartTX = 0;
    dragStartTY = 0;
    // Velocity tracking for inertia
    velocityX = 0;
    velocityY = 0;
    lastMoveTime = 0;
    inertiaRaf = 0;
    /* ────────────────────────────────────────────
     * Lifecycle
     * ──────────────────────────────────────────── */
    componentDidLoad() {
        this.viewportEl = this.el.querySelector('.gallery-viewport');
        this.total = this.getSlides().length;
        if (this.viewportEl) {
            this.viewportEl.addEventListener('scroll', this.handleScroll, { passive: true });
        }
        // Wheel on the whole component for reliable capture
        this.el.addEventListener('wheel', this.handleWheel, { passive: false });
        // Mouse pan
        this.el.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        // Touch pinch + pan
        this.el.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.el.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.el.addEventListener('touchend', this.handleTouchEnd, { passive: true });
        // Fullscreen
        document.addEventListener('fullscreenchange', this.handleFullscreenChange);
        this.updateDominantColor();
    }
    disconnectedCallback() {
        this.viewportEl?.removeEventListener('scroll', this.handleScroll);
        this.el?.removeEventListener('wheel', this.handleWheel);
        this.el?.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        this.el?.removeEventListener('touchstart', this.handleTouchStart);
        this.el?.removeEventListener('touchmove', this.handleTouchMove);
        this.el?.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
        clearTimeout(this.scrollTimeout);
        cancelAnimationFrame(this.inertiaRaf);
    }
    /* ────────────────────────────────────────────
     * Fullscreen
     * ──────────────────────────────────────────── */
    handleFullscreenChange = () => {
        this.isFullscreen = !!document.fullscreenElement;
    };
    /** Toggle browser fullscreen for the gallery. */
    async toggleFullscreen() {
        if (!document.fullscreenElement) {
            await this.el.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
        else {
            await document.exitFullscreen();
        }
    }
    /* ────────────────────────────────────────────
     * Slide scroll / snap detection
     * ──────────────────────────────────────────── */
    handleScroll = () => {
        if (this.scale > 1.01)
            return; // don't update index while zoomed
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            if (!this.viewportEl)
                return;
            const w = this.viewportEl.offsetWidth;
            if (!w)
                return;
            const idx = Math.round(this.viewportEl.scrollLeft / w);
            if (idx !== this.currentIndex) {
                this.currentIndex = idx;
                this.resetZoom();
                this.updateDominantColor();
            }
        }, 80);
    };
    /* ────────────────────────────────────────────
     * Zoom – scroll wheel
     * ──────────────────────────────────────────── */
    handleWheel = (e) => {
        if (!this.expanded)
            return;
        // Only zoom on Ctrl/Cmd + scroll, OR if already zoomed in
        if (!(e.ctrlKey || e.metaKey) && this.scale <= 1.01)
            return;
        e.preventDefault();
        e.stopPropagation();
        // Normalize deltaY for trackpad vs mouse (trackpad sends small deltas)
        const delta = -e.deltaY;
        const step = Math.sign(delta) * Math.min(Math.abs(delta), 100);
        const factor = 1 + step * 0.005; // smooth, proportional
        this.applyZoom(this.scale * factor);
    };
    /* ────────────────────────────────────────────
     * Pan – mouse
     * ──────────────────────────────────────────── */
    handleMouseDown = (e) => {
        if (!this.expanded || this.scale <= 1.01)
            return;
        this.startDrag(e.clientX, e.clientY);
        e.preventDefault();
    };
    handleMouseMove = (e) => {
        if (!this.isDragging)
            return;
        this.moveDrag(e.clientX, e.clientY);
    };
    handleMouseUp = () => {
        if (this.isDragging)
            this.endDrag();
    };
    /* ────────────────────────────────────────────
     * Touch – pinch to zoom + 1-finger pan
     * ──────────────────────────────────────────── */
    handleTouchStart = (e) => {
        if (!this.expanded)
            return;
        cancelAnimationFrame(this.inertiaRaf);
        if (e.touches.length === 2) {
            // Begin pinch
            this.isDragging = false;
            this.lastTouchDistance = this.touchDistance(e);
        }
        else if (e.touches.length === 1 && this.scale > 1.01) {
            // Begin 1-finger pan while zoomed
            this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault(); // prevent page scroll
        }
    };
    handleTouchMove = (e) => {
        if (!this.expanded)
            return;
        if (e.touches.length === 2) {
            // Pinch zoom
            const dist = this.touchDistance(e);
            if (this.lastTouchDistance > 0) {
                const factor = dist / this.lastTouchDistance;
                this.applyZoom(this.scale * factor);
            }
            this.lastTouchDistance = dist;
            e.preventDefault();
        }
        else if (e.touches.length === 1 && this.isDragging) {
            this.moveDrag(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
        }
    };
    handleTouchEnd = () => {
        if (this.isDragging)
            this.endDrag();
        this.lastTouchDistance = 0;
    };
    touchDistance(e) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /* ────────────────────────────────────────────
     * Shared drag helpers (mouse + touch)
     * ──────────────────────────────────────────── */
    startDrag(x, y) {
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.dragStartTX = this.translateX;
        this.dragStartTY = this.translateY;
        this.velocityX = 0;
        this.velocityY = 0;
        this.lastMoveTime = performance.now();
        cancelAnimationFrame(this.inertiaRaf);
    }
    moveDrag(x, y) {
        const now = performance.now();
        const dt = now - this.lastMoveTime || 16;
        const newTX = this.dragStartTX + (x - this.dragStartX);
        const newTY = this.dragStartTY + (y - this.dragStartY);
        // Track velocity (px/ms – we'll use for inertia)
        this.velocityX = (newTX - this.translateX) / dt;
        this.velocityY = (newTY - this.translateY) / dt;
        this.lastMoveTime = now;
        this.translateX = newTX;
        this.translateY = newTY;
    }
    endDrag() {
        this.isDragging = false;
        // Kick off inertia if there's meaningful velocity
        if (Math.abs(this.velocityX) > 0.05 || Math.abs(this.velocityY) > 0.05) {
            this.runInertia();
        }
    }
    /**
     * Simple inertia: decay velocity each frame and apply,
     * giving a natural "slide" after releasing.
     */
    runInertia() {
        const friction = 0.94;
        const step = () => {
            this.velocityX *= friction;
            this.velocityY *= friction;
            if (Math.abs(this.velocityX) < 0.01 && Math.abs(this.velocityY) < 0.01)
                return;
            this.translateX += this.velocityX * 16; // ~16ms per frame
            this.translateY += this.velocityY * 16;
            this.inertiaRaf = requestAnimationFrame(step);
        };
        this.inertiaRaf = requestAnimationFrame(step);
    }
    /* ────────────────────────────────────────────
     * Zoom logic
     * ──────────────────────────────────────────── */
    applyZoom(newScale) {
        const min = 1;
        const max = 5;
        const clamped = Math.max(min, Math.min(max, newScale));
        if (clamped === this.scale)
            return;
        this.scale = clamped;
        // Snap back to 1× if close enough
        if (this.scale < 1.05) {
            this.scale = 1;
            this.translateX = 0;
            this.translateY = 0;
        }
        this.updateSlideVisibility();
    }
    /**
     * When zoomed, hide all slides except the current one so the
     * scaled-up image doesn't bleed into neighbouring slides.
     * When back at 1×, restore them all.
     */
    updateSlideVisibility() {
        const slides = this.getSlides();
        const isZoomed = this.scale > 1.01;
        slides.forEach((slide, i) => {
            if (isZoomed && i !== this.currentIndex) {
                slide.classList.add('gallery-slide--hidden');
            }
            else {
                slide.classList.remove('gallery-slide--hidden');
            }
        });
    }
    /* ────────────────────────────────────────────
     * Dominant colour extraction
     * ──────────────────────────────────────────── */
    async updateDominantColor() {
        const slides = this.getSlides();
        const slide = slides[this.currentIndex];
        if (!slide)
            return;
        const img = slide instanceof HTMLImageElement ? slide : slide.querySelector('img');
        if (!img || !img.complete || !img.naturalWidth) {
            if (img && !img.complete)
                img.onload = () => this.updateDominantColor();
            this.dominantColor = '';
            return;
        }
        try {
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d');
            c.width = 1;
            c.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            this.dominantColor = `rgb(${r}, ${g}, ${b})`;
        }
        catch {
            this.dominantColor = ''; // CORS – CSS fallback handles it
        }
    }
    /* ────────────────────────────────────────────
     * Helpers
     * ──────────────────────────────────────────── */
    getSlides() {
        return Array.from(this.el.querySelectorAll('.gallery-slide'));
    }
    /* ────────────────────────────────────────────
     * Public API (@Method)
     * ──────────────────────────────────────────── */
    /** Navigate to a specific slide (0-based, wraps). */
    async goTo(index) {
        const slides = this.getSlides();
        if (!slides.length || !this.viewportEl)
            return;
        if (index < 0)
            index = slides.length - 1;
        if (index >= slides.length)
            index = 0;
        this.currentIndex = index;
        this.viewportEl.scrollTo({ left: index * this.viewportEl.offsetWidth, behavior: 'smooth' });
        this.resetZoom();
        this.updateDominantColor();
    }
    /** Navigate to the next slide. */
    async next() { await this.goTo(this.currentIndex + 1); }
    /** Navigate to the previous slide. */
    async prev() { await this.goTo(this.currentIndex - 1); }
    /** Expand the gallery. */
    async expand() {
        this.expanded = true;
        this.resetZoom();
        this.updateDominantColor();
    }
    /** Collapse the gallery. */
    async collapse() {
        this.expanded = false;
        this.resetZoom();
    }
    /** Reset zoom level to 1×. */
    async resetZoom() {
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        cancelAnimationFrame(this.inertiaRaf);
        this.updateSlideVisibility();
    }
    /** Zoom in by a step. */
    async zoomIn() { this.applyZoom(this.scale * 1.25); }
    /** Zoom out by a step. */
    async zoomOut() { this.applyZoom(this.scale / 1.25); }
    /** Get current slide index. */
    async getCurrentIndex() { return this.currentIndex; }
    /** Get total slides. */
    async getTotal() { return this.total; }
    /* ────────────────────────────────────────────
     * Event helpers
     * ──────────────────────────────────────────── */
    handleCollapseClick = (e) => {
        if (e.target.closest('.gallery-arrow, .gallery-dot, .gallery-collapse-btn, .gallery-fullscreen-btn'))
            return;
        if (this.collapsible && !this.expanded) {
            this.expanded = true;
        }
    };
    /* ────────────────────────────────────────────
     * Render
     * ──────────────────────────────────────────── */
    render() {
        const isCollapsed = this.collapsible && !this.expanded;
        const showControls = this.total > 1;
        const isZoomed = this.scale > 1.01;
        const rootStyle = {
            ...(this.expanded && this.dominantColor ? { backgroundColor: this.dominantColor } : {}),
            '--gallery-scale': this.scale.toString(),
            '--gallery-tx': `${this.translateX}px`,
            '--gallery-ty': `${this.translateY}px`,
        };
        return (h("div", { key: '0', class: {
                'gallery-root': true,
                'gallery-collapsed': isCollapsed,
                'gallery-full': !isCollapsed,
                'is-expanded': this.expanded,
                'is-fullscreen': this.isFullscreen,
                'is-zoomed': isZoomed,
            }, style: rootStyle, onClick: this.handleCollapseClick },
            h("div", { key: '1', class: { 'gallery-viewport': true, 'is-zoomed': isZoomed } },
                h("slot", { key: '2' })),
            isCollapsed && (h("div", { key: '3', class: "gallery-collapse-hint" },
                showControls && (h("div", { key: '4', class: "gallery-dots gallery-dots--slim" }, Array.from({ length: this.total }).map((_, i) => (h("span", { key: i, class: `gallery-dot${i === this.currentIndex ? ' active' : ''}` }))))),
                this.total > 1 && (h("span", { key: '5', class: "gallery-count-badge" },
                    this.total,
                    " photos")))),
            !isCollapsed && showControls && (h("div", { key: '6', class: "gallery-nav" },
                h("button", { key: '7', class: "gallery-arrow gallery-prev", type: "button", "aria-label": "Previous slide", onClick: (e) => { e.stopPropagation(); this.prev(); } },
                    h("svg", { key: '8', width: "20", height: "20", viewBox: "0 0 512 512", fill: "currentColor" },
                        h("path", { key: '9', d: "M328,112L184,256l144,144", style: { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '48px' } }))),
                h("div", { key: 'a', class: "gallery-dots" }, Array.from({ length: this.total }).map((_, i) => (h("button", { key: i, class: `gallery-dot${i === this.currentIndex ? ' active' : ''}`, type: "button", "aria-label": `Slide ${i + 1}`, onClick: (e) => { e.stopPropagation(); this.goTo(i); } })))),
                h("button", { key: 'b', class: "gallery-arrow gallery-next", type: "button", "aria-label": "Next slide", onClick: (e) => { e.stopPropagation(); this.next(); } },
                    h("svg", { key: 'c', width: "20", height: "20", viewBox: "0 0 512 512", fill: "currentColor" },
                        h("path", { key: 'd', d: "M184,112l144,144L184,400", style: { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '48px' } }))))),
            this.collapsible && this.expanded && (h("button", { key: 'e', class: "gallery-collapse-btn", type: "button", "aria-label": "Collapse gallery", onClick: (e) => { e.stopPropagation(); this.expanded = false; this.resetZoom(); } },
                h("svg", { key: 'f', width: "24", height: "24", viewBox: "0 0 512 512", fill: "currentColor" },
                    h("path", { key: 'g', d: "M256,48C141.31,48,48,141.31,48,256s93.31,208,208,208,208-93.31,208-208S370.69,48,256,48Zm75.31,260.69a16,16,0,1,1-22.62,22.62L256,278.63l-52.69,52.68a16,16,0,0,1-22.62-22.62L233.37,256l-52.68-52.69a16,16,0,0,1,22.62-22.62L256,233.37l52.69-52.68a16,16,0,0,1,22.62,22.62L278.63,256Z" })))),
            this.expanded && (h("button", { key: 'h', class: "gallery-fullscreen-btn", type: "button", "aria-label": "Toggle Fullscreen", onClick: (e) => { e.stopPropagation(); this.toggleFullscreen(); } }, this.isFullscreen ? (h("svg", { width: "20", height: "20", viewBox: "0 0 512 512", fill: "currentColor" },
                h("path", { d: "M436,192H312V68a12,12,0,0,0-24,0V204a12,12,0,0,0,12,12H436a12,12,0,0,0,0-24Z" }),
                h("path", { d: "M76,216H200a12,12,0,0,0,12-12V68a12,12,0,0,0-24,0V192H76a12,12,0,0,0,0,24Z" }),
                h("path", { d: "M200,296H76a12,12,0,0,0,0,24H188V444a12,12,0,0,0,24,0V308A12,12,0,0,0,200,296Z" }),
                h("path", { d: "M436,296H300a12,12,0,0,0-12,12V444a12,12,0,0,0,24,0V320H436a12,12,0,0,0,0-24Z" }))) : (h("svg", { width: "20", height: "20", viewBox: "0 0 512 512", fill: "currentColor" },
                h("path", { d: "M432,448H335a16,16,0,0,1,0-32h81V335a16,16,0,0,1,32,0v97A16,16,0,0,1,432,448Z" }),
                h("path", { d: "M432,193a16,16,0,0,1-16-16V96H335a16,16,0,0,1,0-32h97a16,16,0,0,1,16,16v97A16,16,0,0,1,432,193Z" }),
                h("path", { d: "M177,448H80a16,16,0,0,1-16-16V335a16,16,0,0,1,32,0v81h81a16,16,0,0,1,0,32Z" }),
                h("path", { d: "M80,193a16,16,0,0,1-16-16V80A16,16,0,0,1,80,64h97a16,16,0,0,1,0,32H96v81a16,16,0,0,1-16,16Z" })))))));
    }
    static get style() { return PopGalleryStyle0(); }
};
__stencil_defineCustomElement(PopGallery, [772, "pop-gallery", {
        "collapsible": [4],
        "currentIndex": [32],
        "total": [32],
        "expanded": [32],
        "dominantColor": [32],
        "scale": [32],
        "translateX": [32],
        "translateY": [32],
        "isFullscreen": [32],
        "toggleFullscreen": [64],
        "goTo": [64],
        "next": [64],
        "prev": [64],
        "expand": [64],
        "collapse": [64],
        "resetZoom": [64],
        "zoomIn": [64],
        "zoomOut": [64],
        "getCurrentIndex": [64],
        "getTotal": [64]
    }]);
//# sourceMappingURL=gallery.js.map