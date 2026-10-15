import { newSpecPage } from '../../test-utils/spec-page';
import { Avatar } from './avatar';

describe('pop-avatar', () => {
  it('renders emoji fallback by default', async () => {
    const page = await newSpecPage({
      components: [Avatar],
      html: `<pop-avatar></pop-avatar>`,
    });
    expect(page.root.querySelector('.avatar-icon').textContent).toBe('👤');
  });

  it('renders image when src is provided', async () => {
    const page = await newSpecPage({
      components: [Avatar],
      html: `<pop-avatar src="https://example.com/photo.jpg" name="Test"></pop-avatar>`,
    });
    const img = page.root.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('alt')).toBe('Test');
  });

  it('renders initials when provided', async () => {
    const page = await newSpecPage({
      components: [Avatar],
      html: `<pop-avatar initials="JD"></pop-avatar>`,
    });
    expect(page.root.textContent).toContain('JD');
  });

  it('applies size class', async () => {
    const page = await newSpecPage({
      components: [Avatar],
      html: `<pop-avatar size="lg"></pop-avatar>`,
    });
    expect(page.root.querySelector('.avatar--lg')).not.toBeNull();
  });

  it('applies selected class', async () => {
    const page = await newSpecPage({
      components: [Avatar],
      html: `<pop-avatar selected></pop-avatar>`,
    });
    expect(page.root.querySelector('.avatar--selected')).not.toBeNull();
  });
});
