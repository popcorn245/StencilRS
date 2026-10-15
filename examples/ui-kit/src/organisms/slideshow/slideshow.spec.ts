import { vi, describe, it, expect, beforeEach } from 'vitest';
import { newSpecPage } from '../../test-utils/spec-page';
import { PopSlideshow } from './slideshow';

// Mock reveal.js
const mockReveal = {
  initialize: vi.fn().mockResolvedValue(undefined),
  slide: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
};

vi.mock('reveal.js', () => {
  return { default: vi.fn().mockImplementation(() => mockReveal) };
});

describe('pop-slideshow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with a reveal container and slides div', async () => {
    const page = await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow>
        <div>Slide 1</div>
        <div>Slide 2</div>
      </pop-slideshow>`,
    });

    const reveal = page.root.querySelector('.reveal');
    expect(reveal).not.toBeNull();
    const slides = reveal.querySelector('.slides');
    expect(slides).not.toBeNull();
  });

  it('renders the fullscreen button when fullscreen prop is true', async () => {
    const page = await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow fullscreen="true"><div>Slide</div></pop-slideshow>`,
    });

    const btn = page.root.querySelector('.fullscreen-btn');
    expect(btn).not.toBeNull();
  });

  it('hides the fullscreen button when fullscreen prop is false', async () => {
    const page = await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow fullscreen="false"><div>Slide</div></pop-slideshow>`,
    });

    const btn = page.root.querySelector('.fullscreen-btn');
    expect(btn).toBeNull();
  });

  it('applies embedded class when embedded is true', async () => {
    const page = await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow embedded="true"><div>Slide</div></pop-slideshow>`,
    });

    expect(page.root.classList.contains('is-embedded')).toBe(true);
  });

  it('applies fullpage class when embedded is false', async () => {
    const page = await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow embedded="false"><div>Slide</div></pop-slideshow>`,
    });

    expect(page.root.classList.contains('is-fullpage')).toBe(true);
  });

  it('loads theme stylesheet into document head', async () => {
    const page = await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow theme="moon"><div>Slide</div></pop-slideshow>`,
    });

    const link = document.head.querySelector('link[href*="moon.css"]');
    expect(link).not.toBeNull();
  });

  it('converts slotted children into section elements', async () => {
    const page = await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow>
        <div>Slide 1</div>
        <div>Slide 2</div>
        <div>Slide 3</div>
      </pop-slideshow>`,
    });

    const sections = page.root.querySelectorAll('.slides > section');
    expect(sections.length).toBe(3);
  });

  it('handles vertical slide groups with data-vertical', async () => {
    const page = await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow>
        <div>Horizontal</div>
        <div data-vertical>
          <div>Vertical A</div>
          <div>Vertical B</div>
        </div>
      </pop-slideshow>`,
    });

    const topSections = page.root.querySelectorAll('.slides > section');
    expect(topSections.length).toBe(2);
    const nestedSections = topSections[1].querySelectorAll('section');
    expect(nestedSections.length).toBe(2);
  });

  it('emits popSlideshowReady after initialization', async () => {
    const page = await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow><div>Slide</div></pop-slideshow>`,
    });

    const events: CustomEvent[] = [];
    page.root.addEventListener('popSlideshowReady', (e: Event) => events.push(e as CustomEvent));

    await page.waitForChanges();
    // The event should have been emitted during componentDidLoad
    expect(mockReveal.initialize).toHaveBeenCalled();
  });

  it('registers slidechanged event listener on deck', async () => {
    await newSpecPage({
      components: [PopSlideshow],
      html: `<pop-slideshow><div>Slide</div></pop-slideshow>`,
    });

    expect(mockReveal.on).toHaveBeenCalledWith('slidechanged', expect.any(Function));
  });
});
