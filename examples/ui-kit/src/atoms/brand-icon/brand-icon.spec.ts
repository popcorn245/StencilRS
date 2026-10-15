import { newSpecPage } from '../../test-utils/spec-page';
import { BrandIcon } from './brand-icon';

/** The svg is injected via innerHTML, so assert against the markup string. */
function markup(root: Element): string {
  const wrap = root.querySelector('.pop-brand-icon__wrap');
  return (wrap?.innerHTML ?? root.innerHTML) || '';
}

describe('pop-brand-icon', () => {
  it('renders an inline svg for a registered name', async () => {
    const page = await newSpecPage({
      components: [BrandIcon],
      html: `<pop-brand-icon name="star"></pop-brand-icon>`,
    });
    expect(markup(page.root)).toContain('<svg');
  });

  it('paints solid icons with fill=currentColor', async () => {
    const page = await newSpecPage({
      components: [BrandIcon],
      html: `<pop-brand-icon name="star"></pop-brand-icon>`,
    });
    expect(markup(page.root)).toContain('fill="currentColor"');
  });

  it('paints outline icons with stroke=currentColor', async () => {
    const page = await newSpecPage({
      components: [BrandIcon],
      html: `<pop-brand-icon name="link"></pop-brand-icon>`,
    });
    const m = markup(page.root);
    expect(m).toContain('stroke="currentColor"');
    expect(m).toContain('fill="none"');
  });

  it('renders an empty svg for an unknown name (no crash)', async () => {
    const page = await newSpecPage({
      components: [BrandIcon],
      html: `<pop-brand-icon name="does-not-exist"></pop-brand-icon>`,
    });
    expect(markup(page.root)).toContain('<svg');
  });

  it('centers the glyph with inline-flex + line-height 0', async () => {
    const page = await newSpecPage({
      components: [BrandIcon],
      html: `<pop-brand-icon name="check"></pop-brand-icon>`,
    });
    expect(page.root.style.display).toBe('inline-flex');
    expect(page.root.style.lineHeight).toBe('0');
  });

  it('sets font-size on the host when the size prop is given', async () => {
    const page = await newSpecPage({
      components: [BrandIcon],
      html: `<pop-brand-icon name="check" size="1.2rem"></pop-brand-icon>`,
    });
    expect(page.root.style.fontSize).toBe('1.2rem');
  });

  it('marks the icon aria-hidden when no label is given', async () => {
    const page = await newSpecPage({
      components: [BrandIcon],
      html: `<pop-brand-icon name="check"></pop-brand-icon>`,
    });
    expect(page.root.getAttribute('aria-hidden')).toBe('true');
    expect(page.root.hasAttribute('role')).toBe(false);
  });

  it('exposes aria-label + role=img when a label is given', async () => {
    const page = await newSpecPage({
      components: [BrandIcon],
      html: `<pop-brand-icon name="trash" label="Delete"></pop-brand-icon>`,
    });
    expect(page.root.getAttribute('aria-label')).toBe('Delete');
    expect(page.root.getAttribute('role')).toBe('img');
  });
});
