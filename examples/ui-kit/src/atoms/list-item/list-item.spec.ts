import { newSpecPage } from '../../test-utils/spec-page';
import { ListItem } from './list-item';

describe('pop-list-item', () => {
  it('renders as div by default', async () => {
    const page = await newSpecPage({
      components: [ListItem],
      html: `<pop-list-item icon="🎁">Rewards</pop-list-item>`,
    });
    expect(page.root.querySelector('div.li')).not.toBeNull();
    expect(page.root.querySelector('a.li')).toBeNull();
  });

  it('renders as anchor when href is set', async () => {
    const page = await newSpecPage({
      components: [ListItem],
      html: `<pop-list-item href="/rewards" icon="🎁">Rewards</pop-list-item>`,
    });
    expect(page.root.querySelector('a.li')).not.toBeNull();
    expect(page.root.querySelector('a.li').getAttribute('href')).toBe('/rewards');
  });

  it('displays icon', async () => {
    const page = await newSpecPage({
      components: [ListItem],
      html: `<pop-list-item icon="📜">Activities</pop-list-item>`,
    });
    expect(page.root.querySelector('.li-thumb').textContent).toContain('📜');
  });

  it('applies selected class', async () => {
    const page = await newSpecPage({
      components: [ListItem],
      html: `<pop-list-item selected>Item</pop-list-item>`,
    });
    expect(page.root.querySelector('.li--selected')).not.toBeNull();
  });
});
