import { newSpecPage } from '../../test-utils/spec-page';
import { NavItem } from './nav-item';

describe('pop-nav-item', () => {
  it('renders with icon and label', async () => {
    const page = await newSpecPage({
      components: [NavItem],
      html: `<pop-nav-item href="/home" icon="🏠" label="Home"></pop-nav-item>`,
    });
    expect(page.root.querySelector('.ni-icon').textContent).toBe('🏠');
    expect(page.root.querySelector('.ni-label').textContent).toBe('Home');
    expect(page.root.querySelector('a').getAttribute('href')).toBe('/home');
  });

  it('applies active class', async () => {
    const page = await newSpecPage({
      components: [NavItem],
      html: `<pop-nav-item href="/home" label="Home" active></pop-nav-item>`,
    });
    expect(page.root.querySelector('.ni--active')).not.toBeNull();
  });
});
