import { newSpecPage } from '../../test-utils/spec-page';
import { PopViewSwitcher } from './view-switcher';

describe('pop-view-switcher', () => {
  it('renders the default list/card pair with centered pop-icons', async () => {
    const page = await newSpecPage({
      components: [PopViewSwitcher],
      html: `<pop-view-switcher value="list"></pop-view-switcher>`,
    });
    const btns = page.root.querySelectorAll('.pvs__btn');
    expect(btns.length).toBe(2);
    expect(btns[0].getAttribute('aria-label')).toBe('List view');
    expect(btns[1].getAttribute('aria-label')).toBe('Card view');
    expect(btns[0].querySelector('pop-icon')).toBeTruthy();
    expect((btns[0].querySelector('pop-icon') as any).name).toBe('list');
    expect((btns[1].querySelector('pop-icon') as any).name).toBe('grid');
  });

  it('marks the current view with aria-pressed + the --on class', async () => {
    const page = await newSpecPage({
      components: [PopViewSwitcher],
      html: `<pop-view-switcher views='["list","card"]' value="card"></pop-view-switcher>`,
    });
    const btns = page.root.querySelectorAll('.pvs__btn');
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
    expect(btns[1].getAttribute('aria-pressed')).toBe('true');
    expect(btns[1].classList.contains('pvs__btn--on')).toBe(true);
  });

  it('renders all four views when asked', async () => {
    const page = await newSpecPage({
      components: [PopViewSwitcher],
      html: `<pop-view-switcher views='["list","card","kanban","table"]' value="kanban"></pop-view-switcher>`,
    });
    const icons = Array.from(page.root.querySelectorAll('pop-icon')).map((i: any) => i.name);
    expect(icons).toEqual(['list', 'grid', 'albums-outline', 'reorder-four-outline']);
  });

  it('drops unknown view names and survives malformed JSON', async () => {
    const partial = await newSpecPage({
      components: [PopViewSwitcher],
      html: `<pop-view-switcher views='["list","bogus","table"]' value="list"></pop-view-switcher>`,
    });
    expect(partial.root.querySelectorAll('.pvs__btn').length).toBe(2);

    const broken = await newSpecPage({
      components: [PopViewSwitcher],
      html: `<pop-view-switcher views='not json' value="list"></pop-view-switcher>`,
    });
    expect(broken.root.querySelectorAll('.pvs__btn').length).toBe(0);
  });

  it('emits viewChange with the picked view', async () => {
    const page = await newSpecPage({
      components: [PopViewSwitcher],
      html: `<pop-view-switcher views='["list","card"]' value="list"></pop-view-switcher>`,
    });
    const events: string[] = [];
    page.root.addEventListener('viewChange', (e: any) => events.push(e.detail));
    (page.root.querySelectorAll('.pvs__btn')[1] as HTMLButtonElement).click();
    expect(events).toEqual(['card']);
  });

  it('does not emit when the current view is re-clicked', async () => {
    const page = await newSpecPage({
      components: [PopViewSwitcher],
      html: `<pop-view-switcher views='["list","card"]' value="list"></pop-view-switcher>`,
    });
    const events: string[] = [];
    page.root.addEventListener('viewChange', (e: any) => events.push(e.detail));
    (page.root.querySelectorAll('.pvs__btn')[0] as HTMLButtonElement).click();
    expect(events).toEqual([]);
  });
});
