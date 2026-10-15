import { newSpecPage } from '../../test-utils/spec-page';
import { TabBar } from './tab-bar';

describe('pop-tab-bar', () => {
  const tabs = JSON.stringify([
    { label: 'Today', value: 'today' },
    { label: 'All', value: 'all' },
  ]);

  it('renders tabs', async () => {
    const page = await newSpecPage({
      components: [TabBar],
      html: `<pop-tab-bar tabs='${tabs}' active-tab="today"></pop-tab-bar>`,
    });
    const buttons = page.root.querySelectorAll('.tb-tab');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Today');
    expect(buttons[1].textContent).toBe('All');
  });

  it('marks active tab', async () => {
    const page = await newSpecPage({
      components: [TabBar],
      html: `<pop-tab-bar tabs='${tabs}' active-tab="all"></pop-tab-bar>`,
    });
    const active = page.root.querySelector('.tb-tab--active');
    expect(active.textContent).toBe('All');
  });

  it('uses tablist role', async () => {
    const page = await newSpecPage({
      components: [TabBar],
      html: `<pop-tab-bar tabs='${tabs}' active-tab="today"></pop-tab-bar>`,
    });
    expect(page.root.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('renders count bubbles only for tabs with a numeric count', async () => {
    const counted = JSON.stringify([
      { label: 'Items', value: 'items', count: 117 },
      { label: 'Lists', value: 'lists', count: 0 },
      { label: 'Outfits', value: 'outfits' },
    ]);
    const page = await newSpecPage({
      components: [TabBar],
      html: `<pop-tab-bar tabs='${counted}' active-tab="items"></pop-tab-bar>`,
    });
    const bubbles = page.root.querySelectorAll('.tb-tab-count');
    expect(bubbles.length).toBe(2); // 117 and 0 render; missing count doesn't
    expect(bubbles[0].textContent).toBe('117');
    expect(bubbles[1].textContent).toBe('0');
  });

  it('renders per-tab icons and flags iconed tabs', async () => {
    const iconed = JSON.stringify([
      { label: 'Items', value: 'items', icon: 'cube-outline', count: 4 },
      { label: 'Lists', value: 'lists' },
    ]);
    const page = await newSpecPage({
      components: [TabBar],
      html: `<pop-tab-bar tabs='${iconed}' active-tab="items"></pop-tab-bar>`,
    });
    const buttons = page.root.querySelectorAll('.tb-tab');
    expect(buttons[0].querySelector('pop-icon')).not.toBeNull();
    expect(buttons[0].classList.contains('tb-tab--iconed')).toBe(true);
    expect(buttons[1].querySelector('pop-icon')).toBeNull();
    expect(buttons[1].classList.contains('tb-tab--iconed')).toBe(false);
    // Labels stay in the DOM in every mode (compact only visually hides them).
    expect(buttons[0].querySelector('.tb-tab-label').textContent).toBe('Items');
  });

  it('applies the compact container class only when compact is set', async () => {
    const page = await newSpecPage({
      components: [TabBar],
      html: `<pop-tab-bar tabs='${tabs}' active-tab="today" compact></pop-tab-bar>`,
    });
    expect(page.root.querySelector('.tb-wrap--compact')).not.toBeNull();

    const plain = await newSpecPage({
      components: [TabBar],
      html: `<pop-tab-bar tabs='${tabs}' active-tab="today"></pop-tab-bar>`,
    });
    expect(plain.root.querySelector('.tb-wrap--compact')).toBeNull();
  });
});
