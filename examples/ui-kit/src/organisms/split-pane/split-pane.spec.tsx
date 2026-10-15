import { newSpecPage } from '../../test-utils/spec-page';
import { PopSplitPane } from './split-pane';

describe('pop-split-pane', () => {
  it('renders three-column mode with three pane slots and two dividers', async () => {
    const page = await newSpecPage({
      components: [PopSplitPane],
      html: `<pop-split-pane mode="three-column"></pop-split-pane>`,
    });
    expect(page.root.querySelector('.sp--three')).toBeTruthy();
    expect(page.root.querySelectorAll('.sp__pane').length).toBe(3);
    expect(page.root.querySelectorAll('.sp__divider').length).toBe(2);
  });

  it('renders two-column mode with two panes and one divider', async () => {
    const page = await newSpecPage({
      components: [PopSplitPane],
      html: `<pop-split-pane mode="two-column"></pop-split-pane>`,
    });
    expect(page.root.querySelector('.sp--two')).toBeTruthy();
    expect(page.root.querySelectorAll('.sp__pane').length).toBe(2);
    expect(page.root.querySelectorAll('.sp__divider').length).toBe(1);
  });

  it('renders tab strip when two-column + tabsRight', async () => {
    const page = await newSpecPage({
      components: [PopSplitPane],
      html: `<pop-split-pane mode="two-column" tabs-right="true"></pop-split-pane>`,
    });
    expect(page.root.querySelector('.sp__tabstrip')).toBeTruthy();
    expect(page.root.querySelectorAll('.sp__tab').length).toBe(2);
  });

  it('renders stack mode with two screens, only active visible', async () => {
    const page = await newSpecPage({
      components: [PopSplitPane],
      html: `<pop-split-pane mode="stack" active-screen="list-screen"></pop-split-pane>`,
    });
    const screens = page.root.querySelectorAll('.sp__screen');
    expect(screens.length).toBe(2);
    // First screen (list-screen) is visible; second is hidden
    expect(screens[0].classList.contains('sp__screen--hidden')).toBe(false);
    expect(screens[1].classList.contains('sp__screen--hidden')).toBe(true);
  });

  it('switches active tab and emits activeTabChanged', async () => {
    const page = await newSpecPage({
      components: [PopSplitPane],
      html: `<pop-split-pane mode="two-column" tabs-right="true"></pop-split-pane>`,
    });
    const events: string[] = [];
    page.root.addEventListener('activeTabChanged', ((e: CustomEvent) => events.push(e.detail)) as EventListener);
    const tabs = page.root.querySelectorAll('.sp__tab') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    await page.waitForChanges();
    expect(events).toContain('tab-note');
    expect(tabs[1].classList.contains('sp__tab--active')).toBe(true);
  });
});
