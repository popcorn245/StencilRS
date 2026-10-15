import { newSpecPage } from '../../test-utils/spec-page';
import { PopImageCard } from './image-card';

describe('pop-image-card', () => {
  it('renders the fallback <img> from src + alt', async () => {
    const page = await newSpecPage({
      components: [PopImageCard],
      html: `<pop-image-card src="/thumb.png" alt="Oat milk"></pop-image-card>`,
    });
    const img = page.root.querySelector('img.pic-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/thumb.png');
    expect(img.getAttribute('alt')).toBe('Oat milk');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('renders the title when card-title is set', async () => {
    const page = await newSpecPage({
      components: [PopImageCard],
      html: `<pop-image-card card-title="Oat Milk"></pop-image-card>`,
    });
    expect(page.root.querySelector('.pic-title')!.textContent).toBe('Oat Milk');
  });

  it('applies aspect-ratio to the media WRAPPER, not the img', async () => {
    const page = await newSpecPage({
      components: [PopImageCard],
      html: `<pop-image-card src="/x.png" aspect="4/3"></pop-image-card>`,
    });
    const media = page.root.querySelector('.pic-media') as HTMLElement;
    expect(media.style.aspectRatio).toBe('4 / 3');
  });

  it('is not clickable by default (no role=button)', async () => {
    const page = await newSpecPage({
      components: [PopImageCard],
      html: `<pop-image-card src="/x.png"></pop-image-card>`,
    });
    expect(page.root.querySelector('[role="button"]')).toBeNull();
  });

  it('emits cardSelect with the cardId when clickable + clicked', async () => {
    const page = await newSpecPage({
      components: [PopImageCard],
      html: `<pop-image-card clickable card-id="img-9"></pop-image-card>`,
    });
    const detail: string[] = [];
    page.root.addEventListener('cardSelect', (e: Event) => detail.push((e as CustomEvent).detail));
    const btn = page.root.querySelector('[role="button"]') as HTMLElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(detail).toEqual(['img-9']);
  });

  it('renders as an anchor when href is set', async () => {
    const page = await newSpecPage({
      components: [PopImageCard],
      html: `<pop-image-card href="/item/1" src="/x.png"></pop-image-card>`,
    });
    const a = page.root.querySelector('a.pic-root') as HTMLAnchorElement;
    expect(a).toBeTruthy();
    expect(a.getAttribute('href')).toBe('/item/1');
  });
});
