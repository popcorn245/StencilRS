import { newSpecPage } from '../../test-utils/spec-page';
import { PopCarousel } from './carousel';

describe('pop-carousel', () => {
  it('renders with default state', async () => {
    const { rootInstance } = await newSpecPage({ components: [PopCarousel], html: '<pop-carousel></pop-carousel>' });
    expect((rootInstance as any).currentSlide).toBe(0);
    expect((rootInstance as any).isGalleryView).toBe(false);
  });

  it('adds gallery-mode class when viewGallery is called', async () => {
    const page = await newSpecPage({ components: [PopCarousel], html: '<pop-carousel></pop-carousel>' });
    const fakeCarousel = document.createElement('div');
    (page.rootInstance as any).carouselElement = fakeCarousel;
    await page.rootInstance.viewGallery();
    expect((page.rootInstance as any).isGalleryView).toBe(true);
    expect(fakeCarousel.classList.contains('gallery-mode')).toBe(true);
  });

  it('updates currentSlide when slideTo is called', async () => {
    const page = await newSpecPage({ components: [PopCarousel], html: '<pop-carousel></pop-carousel>' });
    const fakeCarousel = document.createElement('div');
    const fakeViewport = document.createElement('div');
    (fakeViewport as any).scrollTo = () => {};
    Object.defineProperty(fakeViewport, 'offsetWidth', { get: () => 300 });
    Object.defineProperty(fakeViewport, 'scrollWidth', { get: () => 900 });
    (page.rootInstance as any).carouselElement = fakeCarousel;
    (page.rootInstance as any).viewportElement = fakeViewport;
    await page.rootInstance.slideTo(2);
    expect((page.rootInstance as any).currentSlide).toBe(2);
  });

  it('removes gallery-mode when slideTo is called', async () => {
    const page = await newSpecPage({ components: [PopCarousel], html: '<pop-carousel></pop-carousel>' });
    const fakeCarousel = document.createElement('div');
    const fakeViewport = document.createElement('div');
    (fakeViewport as any).scrollTo = () => {};
    Object.defineProperty(fakeViewport, 'offsetWidth', { get: () => 300 });
    Object.defineProperty(fakeViewport, 'scrollWidth', { get: () => 900 });
    (page.rootInstance as any).carouselElement = fakeCarousel;
    (page.rootInstance as any).viewportElement = fakeViewport;
    await page.rootInstance.viewGallery();
    expect((page.rootInstance as any).isGalleryView).toBe(true);
    await page.rootInstance.slideTo(0);
    expect((page.rootInstance as any).isGalleryView).toBe(false);
    expect(fakeCarousel.classList.contains('gallery-mode')).toBe(false);
  });

  it('does nothing when viewGallery called without carouselElement', async () => {
    const page = await newSpecPage({ components: [PopCarousel], html: '<pop-carousel></pop-carousel>' });
    await page.rootInstance.viewGallery();
    expect((page.rootInstance as any).isGalleryView).toBe(false);
  });
});
