import { Component, Prop, h, Host, Event, EventEmitter, Element, Method, Watch } from '@stencil/core';
import Reveal from 'reveal.js';
import type { TransitionStyle } from 'reveal.js';

@Component({
  tag: 'pop-slideshow',
  encapsulation: { type: 'scoped' },
  styleUrl: 'slideshow.css',
})
export class PopSlideshow {
  @Element() el: HTMLElement;

  private deck: any;
  private themeLink: HTMLLinkElement;
  private coreLink: HTMLLinkElement;
  private revealContainer: HTMLDivElement;

  // ─── Props ───
  @Prop({ reflect: true }) theme: string = 'black';
  @Prop({ reflect: true }) transition: string = 'slide';
  @Prop({ reflect: true }) autoSlide: number = 0;
  @Prop({ reflect: true }) loop: boolean = false;
  @Prop({ reflect: true }) controls: boolean = true;
  @Prop({ reflect: true }) progress: boolean = true;
  @Prop({ reflect: true }) hash: boolean = false;
  @Prop({ reflect: true }) embedded: boolean = true;
  @Prop({ reflect: true }) width: number = 960;
  @Prop({ reflect: true }) height: number = 700;
  @Prop({ reflect: true }) margin: number = 0.04;
  @Prop({ reflect: true }) slideNumber: boolean = false;
  @Prop({ reflect: true }) mouseWheel: boolean = false;
  @Prop({ reflect: true }) touch: boolean = true;
  @Prop({ reflect: true }) fullscreen: boolean = true;
  @Prop({ reflect: true }) plugins: string = '[]';

  // ─── Events ───
  @Event() popSlideChanged: EventEmitter<{ indexH: number; indexV: number }>;
  @Event() popSlideshowReady: EventEmitter<void>;

  // ─── Methods ───
  @Method()
  async goToSlide(indexH: number, indexV: number = 0) {
    this.deck?.slide(indexH, indexV);
  }

  @Method()
  async next() {
    this.deck?.next();
  }

  @Method()
  async prev() {
    this.deck?.prev();
  }

  // ─── Watchers ───
  @Watch('theme')
  onThemeChange(newTheme: string) {
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

  private loadCoreCss() {
    if (!document.head.querySelector('link[data-reveal-core]')) {
      this.coreLink = document.createElement('link');
      this.coreLink.rel = 'stylesheet';
      this.coreLink.href = 'https://cdn.jsdelivr.net/npm/reveal.js@6/dist/reveal.css';
      this.coreLink.setAttribute('data-reveal-core', '');
      document.head.appendChild(this.coreLink);
    }
  }

  private loadTheme(theme: string) {
    if (this.themeLink) {
      this.themeLink.remove();
    }
    this.themeLink = document.createElement('link');
    this.themeLink.rel = 'stylesheet';
    this.themeLink.href = `https://cdn.jsdelivr.net/npm/reveal.js@6/dist/theme/${theme}.css`;
    document.head.appendChild(this.themeLink);
  }

  private buildSlides() {
    const slidesContainer = this.revealContainer?.querySelector('.slides');
    if (!slidesContainer) return;

    const slotted = this.el.querySelectorAll(':scope > [slot="slide"], :scope > :not(.reveal)');
    const children = Array.from(slotted).filter(
      (child) => child !== this.revealContainer && !child.classList.contains('fullscreen-btn') && child.tagName !== 'SLOT'
    );

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
      } else {
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

  private async initReveal() {
    const pluginNames: string[] = JSON.parse(this.plugins);
    const loadedPlugins = await this.loadPlugins(pluginNames);

    this.deck = new Reveal(this.revealContainer, {
      embedded: this.embedded,
      transition: this.transition as TransitionStyle,
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

    this.deck.on('slidechanged', (event: any) => {
      this.popSlideChanged.emit({ indexH: event.indexh, indexV: event.indexv });
    });

    await this.deck.initialize();
    this.popSlideshowReady.emit();
  }

  private async loadPlugins(pluginNames: string[]): Promise<any[]> {
    const plugins: any[] = [];

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

  private toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      this.el.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  render() {
    return (
      <Host class={{ 'is-embedded': this.embedded, 'is-fullpage': !this.embedded }}>
        <div class="reveal" ref={(el) => (this.revealContainer = el)}>
          <div class="slides"></div>
        </div>
        {this.fullscreen && (
          <button class="fullscreen-btn" onClick={this.toggleFullscreen} title="Toggle fullscreen">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        )}
        <slot />
      </Host>
    );
  }
}
