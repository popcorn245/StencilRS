import { newSpecPage } from '../../test-utils/spec-page';
import { Icon } from './icon';

describe('pop-icon', () => {
  it('renders an inner ion-icon with the passed name', async () => {
    const page = await newSpecPage({
      components: [Icon],
      html: `<pop-icon name="close"></pop-icon>`,
    });
    const ionIcon = page.root.querySelector('ion-icon');
    expect(ionIcon).not.toBeNull();
    expect(ionIcon!.getAttribute('name')).toBe('close');
  });

  it('passes through the src prop to ion-icon', async () => {
    const page = await newSpecPage({
      components: [Icon],
      html: `<pop-icon src="/assets/foo.svg"></pop-icon>`,
    });
    const ionIcon = page.root.querySelector('ion-icon');
    expect(ionIcon!.getAttribute('src')).toBe('/assets/foo.svg');
  });

  it('centers the glyph with inline-flex + align-items center + line-height 0', async () => {
    const page = await newSpecPage({
      components: [Icon],
      html: `<pop-icon name="add"></pop-icon>`,
    });
    expect(page.root.style.display).toBe('inline-flex');
    expect(page.root.style.alignItems).toBe('center');
    expect(page.root.style.justifyContent).toBe('center');
    expect(page.root.style.lineHeight).toBe('0');
  });

  it('sets font-size on the host when the size prop is given', async () => {
    const page = await newSpecPage({
      components: [Icon],
      html: `<pop-icon name="add" size="1.2rem"></pop-icon>`,
    });
    expect(page.root.style.fontSize).toBe('1.2rem');
  });

  it('marks the icon aria-hidden when no label is given', async () => {
    const page = await newSpecPage({
      components: [Icon],
      html: `<pop-icon name="add"></pop-icon>`,
    });
    expect(page.root.getAttribute('aria-hidden')).toBe('true');
    expect(page.root.hasAttribute('aria-label')).toBe(false);
    expect(page.root.hasAttribute('role')).toBe(false);
  });

  it('exposes aria-label + role=img when a label is given', async () => {
    const page = await newSpecPage({
      components: [Icon],
      html: `<pop-icon name="close" label="Close"></pop-icon>`,
    });
    expect(page.root.getAttribute('aria-label')).toBe('Close');
    expect(page.root.getAttribute('role')).toBe('img');
    expect(page.root.getAttribute('aria-hidden')).not.toBe('true');
  });
});
