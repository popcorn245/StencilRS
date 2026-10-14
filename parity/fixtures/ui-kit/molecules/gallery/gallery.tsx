import { Component, h, Element, State, Prop, Method } from '@stencil/core';

/**
 * A slot-based image gallery with scroll-snap navigation.
 * Pass slides as children with class `.gallery-slide`.
 *
 * When `collapsible` is true the gallery starts collapsed (slim strip with dot count).
 * Clicking the strip expands it to the full gallery.
 *
 * Zoom: Ctrl+Scroll or pinch to zoom. Drag to pan when zoomed.
 * CSS custom properties `--gallery-scale`, `--gallery-tx`, `--gallery-ty` are
 * set on the root and consumed by the slide styles.
 *
 * @example
 * <pop-gallery collapsible>
 *   <img src="a.jpg" class="gallery-slide" alt="" />
 *   <img src="b.jpg" class="gallery-slide" alt="" />
 * </pop-gallery>
 */
@Component({
  tag: 'pop-gallery',
  styleUrl: 'gallery.css',
})
export class PopGallery {
  @Element() el: HTMLElement;

  /** When true, starts collapsed. Click the strip to expand. */
  @Prop() collapsible: boolean = false;

  @State() currentIndex: number = 0;
  @State() total: number = 0;
  @State() expanded: boolean = false;
  @State() dominantColor: string = '';
  @State() scale: number = 1;
  @State() translateX: number = 0;
  @State() translateY: number = 0;
  @State() isFullscreen: boolean = false;

  private viewportEl: HTMLElement;
  private scrollTimeout: ReturnType<typeof setTimeout>;

  // Pinch tracking
  private lastTouchDistance: number = 0;

  // Pan tracking
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartTX: number = 0;
  private dragStartTY: number = 0;

  // Velocity tracking for inertia
  private velocityX: number = 0;
  private velocityY: number = 0;
  private lastMoveTime: number = 0;
  private inertiaRaf: number = 0;

  /* ────────────────────────────────────────────
   * Lifecycle
   * ──────────────────────────────────────────── */

  componentDidLoad() {
    this.viewportEl = this.el.querySelector('.gallery-viewport') as HTMLElement;
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

  private handleFullscreenChange = () => {
    this.isFullscreen = !!document.fullscreenElement;
  };

  /** Toggle browser fullscreen for the gallery. */
  @Method()
  async toggleFullscreen() {
    if (!document.fullscreenElement) {
      await this.el.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      await document.exitFullscreen();
    }
  }

  /* ────────────────────────────────────────────
   * Slide scroll / snap detection
   * ──────────────────────────────────────────── */

  private handleScroll = () => {
    if (this.scale > 1.01) return; // don't update index while zoomed
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      if (!this.viewportEl) return;
      const w = this.viewportEl.offsetWidth;
      if (!w) return;
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

  private handleWheel = (e: WheelEvent) => {
    if (!this.expanded) return;

    // Only zoom on Ctrl/Cmd + scroll, OR if already zoomed in
    if (!(e.ctrlKey || e.metaKey) && this.scale <= 1.01) return;

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

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.expanded || this.scale <= 1.01) return;
    this.startDrag(e.clientX, e.clientY);
    e.preventDefault();
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.moveDrag(e.clientX, e.clientY);
  };

  private handleMouseUp = () => {
    if (this.isDragging) this.endDrag();
  };

  /* ────────────────────────────────────────────
   * Touch – pinch to zoom + 1-finger pan
   * ──────────────────────────────────────────── */

  private handleTouchStart = (e: TouchEvent) => {
    if (!this.expanded) return;

    cancelAnimationFrame(this.inertiaRaf);

    if (e.touches.length === 2) {
      // Begin pinch
      this.isDragging = false;
      this.lastTouchDistance = this.touchDistance(e);
    } else if (e.touches.length === 1 && this.scale > 1.01) {
      // Begin 1-finger pan while zoomed
      this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault(); // prevent page scroll
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.expanded) return;

    if (e.touches.length === 2) {
      // Pinch zoom
      const dist = this.touchDistance(e);
      if (this.lastTouchDistance > 0) {
        const factor = dist / this.lastTouchDistance;
        this.applyZoom(this.scale * factor);
      }
      this.lastTouchDistance = dist;
      e.preventDefault();
    } else if (e.touches.length === 1 && this.isDragging) {
      this.moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  };

  private handleTouchEnd = () => {
    if (this.isDragging) this.endDrag();
    this.lastTouchDistance = 0;
  };

  private touchDistance(e: TouchEvent): number {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* ────────────────────────────────────────────
   * Shared drag helpers (mouse + touch)
   * ──────────────────────────────────────────── */

  private startDrag(x: number, y: number) {
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

  private moveDrag(x: number, y: number) {
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

  private endDrag() {
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
  private runInertia() {
    const friction = 0.94;
    const step = () => {
      this.velocityX *= friction;
      this.velocityY *= friction;

      if (Math.abs(this.velocityX) < 0.01 && Math.abs(this.velocityY) < 0.01) return;

      this.translateX += this.velocityX * 16; // ~16ms per frame
      this.translateY += this.velocityY * 16;
      this.inertiaRaf = requestAnimationFrame(step);
    };
    this.inertiaRaf = requestAnimationFrame(step);
  }

  /* ────────────────────────────────────────────
   * Zoom logic
   * ──────────────────────────────────────────── */

  private applyZoom(newScale: number) {
    const min = 1;
    const max = 5;
    const clamped = Math.max(min, Math.min(max, newScale));
    if (clamped === this.scale) return;

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
  private updateSlideVisibility() {
    const slides = this.getSlides();
    const isZoomed = this.scale > 1.01;
    slides.forEach((slide, i) => {
      if (isZoomed && i !== this.currentIndex) {
        slide.classList.add('gallery-slide--hidden');
      } else {
        slide.classList.remove('gallery-slide--hidden');
      }
    });
  }

  /* ────────────────────────────────────────────
   * Dominant colour extraction
   * ──────────────────────────────────────────── */

  private async updateDominantColor() {
    const slides = this.getSlides();
    const slide = slides[this.currentIndex];
    if (!slide) return;

    const img = slide instanceof HTMLImageElement ? slide : slide.querySelector('img');
    if (!img || !img.complete || !img.naturalWidth) {
      if (img && !img.complete) img.onload = () => this.updateDominantColor();
      this.dominantColor = '';
      return;
    }

    try {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      c.width = 1;
      c.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      this.dominantColor = `rgb(${r}, ${g}, ${b})`;
    } catch {
      this.dominantColor = ''; // CORS – CSS fallback handles it
    }
  }

  /* ────────────────────────────────────────────
   * Helpers
   * ──────────────────────────────────────────── */

  private getSlides(): HTMLElement[] {
    return Array.from(this.el.querySelectorAll('.gallery-slide'));
  }

  /* ────────────────────────────────────────────
   * Public API (@Method)
   * ──────────────────────────────────────────── */

  /** Navigate to a specific slide (0-based, wraps). */
  @Method()
  async goTo(index: number) {
    const slides = this.getSlides();
    if (!slides.length || !this.viewportEl) return;
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    this.currentIndex = index;
    this.viewportEl.scrollTo({ left: index * this.viewportEl.offsetWidth, behavior: 'smooth' });
    this.resetZoom();
    this.updateDominantColor();
  }

  /** Navigate to the next slide. */
  @Method()
  async next() { await this.goTo(this.currentIndex + 1); }

  /** Navigate to the previous slide. */
  @Method()
  async prev() { await this.goTo(this.currentIndex - 1); }

  /** Expand the gallery. */
  @Method()
  async expand() {
    this.expanded = true;
    this.resetZoom();
    this.updateDominantColor();
  }

  /** Collapse the gallery. */
  @Method()
  async collapse() {
    this.expanded = false;
    this.resetZoom();
  }

  /** Reset zoom level to 1×. */
  @Method()
  async resetZoom() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    cancelAnimationFrame(this.inertiaRaf);
    this.updateSlideVisibility();
  }

  /** Zoom in by a step. */
  @Method()
  async zoomIn() { this.applyZoom(this.scale * 1.25); }

  /** Zoom out by a step. */
  @Method()
  async zoomOut() { this.applyZoom(this.scale / 1.25); }

  /** Get current slide index. */
  @Method()
  async getCurrentIndex() { return this.currentIndex; }

  /** Get total slides. */
  @Method()
  async getTotal() { return this.total; }

  /* ────────────────────────────────────────────
   * Event helpers
   * ──────────────────────────────────────────── */

  private handleCollapseClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.gallery-arrow, .gallery-dot, .gallery-collapse-btn, .gallery-fullscreen-btn')) return;
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
    } as any;

    return (
      <div
        class={{
          'gallery-root': true,
          'gallery-collapsed': isCollapsed,
          'gallery-full': !isCollapsed,
          'is-expanded': this.expanded,
          'is-fullscreen': this.isFullscreen,
          'is-zoomed': isZoomed,
        }}
        style={rootStyle}
        onClick={this.handleCollapseClick}
      >
        <div class={{ 'gallery-viewport': true, 'is-zoomed': isZoomed }}>
          <slot />
        </div>

        {/* Collapsed state: tap-to-expand overlay */}
        {isCollapsed && (
          <div class="gallery-collapse-hint">
            {showControls && (
              <div class="gallery-dots gallery-dots--slim">
                {Array.from({ length: this.total }).map((_, i) => (
                  <span key={i} class={`gallery-dot${i === this.currentIndex ? ' active' : ''}`} />
                ))}
              </div>
            )}
            {this.total > 1 && (
              <span class="gallery-count-badge">{this.total} photos</span>
            )}
          </div>
        )}

        {/* Expanded/non-collapsible: full nav */}
        {!isCollapsed && showControls && (
          <div class="gallery-nav">
            <button
              class="gallery-arrow gallery-prev"
              type="button"
              aria-label="Previous slide"
              onClick={(e) => { e.stopPropagation(); this.prev(); }}
            >
              <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
                <path d="M328,112L184,256l144,144" style={{fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round', strokeWidth:'48px'}}/>
              </svg>
            </button>
            <div class="gallery-dots">
              {Array.from({ length: this.total }).map((_, i) => (
                <button
                  key={i}
                  class={`gallery-dot${i === this.currentIndex ? ' active' : ''}`}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={(e) => { e.stopPropagation(); this.goTo(i); }}
                />
              ))}
            </div>
            <button
              class="gallery-arrow gallery-next"
              type="button"
              aria-label="Next slide"
              onClick={(e) => { e.stopPropagation(); this.next(); }}
            >
              <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
                <path d="M184,112l144,144L184,400" style={{fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round', strokeWidth:'48px'}}/>
              </svg>
            </button>
          </div>
        )}

        {/* Collapse (close) button – top-right */}
        {this.collapsible && this.expanded && (
          <button
            class="gallery-collapse-btn"
            type="button"
            aria-label="Collapse gallery"
            onClick={(e) => { e.stopPropagation(); this.expanded = false; this.resetZoom(); }}
          >
            <svg width="24" height="24" viewBox="0 0 512 512" fill="currentColor">
              <path d="M256,48C141.31,48,48,141.31,48,256s93.31,208,208,208,208-93.31,208-208S370.69,48,256,48Zm75.31,260.69a16,16,0,1,1-22.62,22.62L256,278.63l-52.69,52.68a16,16,0,0,1-22.62-22.62L233.37,256l-52.68-52.69a16,16,0,0,1,22.62-22.62L256,233.37l52.69-52.68a16,16,0,0,1,22.62,22.62L278.63,256Z"/>
            </svg>
          </button>
        )}

        {/* Fullscreen toggle – bottom-right */}
        {this.expanded && (
          <button
            class="gallery-fullscreen-btn"
            type="button"
            aria-label="Toggle Fullscreen"
            onClick={(e) => { e.stopPropagation(); this.toggleFullscreen(); }}
          >
            {this.isFullscreen ? (
              <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
                <path d="M436,192H312V68a12,12,0,0,0-24,0V204a12,12,0,0,0,12,12H436a12,12,0,0,0,0-24Z"/>
                <path d="M76,216H200a12,12,0,0,0,12-12V68a12,12,0,0,0-24,0V192H76a12,12,0,0,0,0,24Z"/>
                <path d="M200,296H76a12,12,0,0,0,0,24H188V444a12,12,0,0,0,24,0V308A12,12,0,0,0,200,296Z"/>
                <path d="M436,296H300a12,12,0,0,0-12,12V444a12,12,0,0,0,24,0V320H436a12,12,0,0,0,0-24Z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
                <path d="M432,448H335a16,16,0,0,1,0-32h81V335a16,16,0,0,1,32,0v97A16,16,0,0,1,432,448Z"/>
                <path d="M432,193a16,16,0,0,1-16-16V96H335a16,16,0,0,1,0-32h97a16,16,0,0,1,16,16v97A16,16,0,0,1,432,193Z"/>
                <path d="M177,448H80a16,16,0,0,1-16-16V335a16,16,0,0,1,32,0v81h81a16,16,0,0,1,0,32Z"/>
                <path d="M80,193a16,16,0,0,1-16-16V80A16,16,0,0,1,80,64h97a16,16,0,0,1,0,32H96v81a16,16,0,0,1-16,16Z"/>
              </svg>
            )}
          </button>
        )}
      </div>
    );
  }
}
