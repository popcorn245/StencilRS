import { newSpecPage } from '../../test-utils/spec-page';
import { NavBar } from './nav-bar';
import { NavItem } from '../../atoms/nav-item/nav-item';

describe('pop-nav-bar', () => {
  it('renders horizontal nav by default', async () => {
    const page = await newSpecPage({
      components: [NavBar, NavItem],
      html: `<pop-nav-bar>
        <pop-nav-item href="/home" label="Home"></pop-nav-item>
        <pop-nav-item href="/plan" label="Plan"></pop-nav-item>
      </pop-nav-bar>`,
    });
    expect(page.root.querySelector('.nb--horizontal')).not.toBeNull();
  });

  it('applies bottom position class', async () => {
    const page = await newSpecPage({
      components: [NavBar],
      html: `<pop-nav-bar position="bottom"></pop-nav-bar>`,
    });
    expect(page.root.querySelector('.nb--bottom')).not.toBeNull();
  });

  it('renders as nav element', async () => {
    const page = await newSpecPage({
      components: [NavBar],
      html: `<pop-nav-bar></pop-nav-bar>`,
    });
    expect(page.root.querySelector('nav')).not.toBeNull();
  });
});
