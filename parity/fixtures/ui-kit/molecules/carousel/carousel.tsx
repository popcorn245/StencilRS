import { Component, h, Element, State, Method } from '@stencil/core';

@Component({
  tag: 'pop-carousel',
  // Must be false to find and style slotted light DOM content
})
export class PopCarousel {
  @Element() el: HTMLElement;

  @State() isGalleryView: boolean = false;
  @State() currentSlide: number = 0;

  private carouselElement: HTMLElement;
  private viewportElement: HTMLElement;

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
  @Method()
  async viewGallery(): Promise<any> {
    if (!this.carouselElement) return;

    this.isGalleryView = true;
    this.carouselElement.classList.add('gallery-mode');
  }

  /**
   * Scrolls to a specific slide by index.
   */
  @Method()
  async slideTo(index: number): Promise<any> {
    if (!this.viewportElement) return;

    const slideWidth = this.viewportElement.offsetWidth;
    const totalWidth = this.viewportElement.scrollWidth;
    const maxIndex = Math.floor(totalWidth / slideWidth) - 1;

    if (index < 0) index = 0;
    if (index > maxIndex) index = maxIndex;

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
  @Method()
  async next(): Promise<any> {
    if (!this.viewportElement) return;

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
  @Method()
  async prev(): Promise<any> {
    if (!this.viewportElement) return;

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
    return <slot />;
  }
}