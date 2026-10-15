import { newSpecPage } from '../../test-utils/spec-page';
import { PopSwitch } from './switch';

describe('pop-switch', () => {
  it('renders role="switch" with aria-checked=false by default', async () => {
    const page = await newSpecPage({
      components: [PopSwitch],
      html: `<pop-switch label="Web only"></pop-switch>`,
    });
    const btn = page.root.querySelector('button.sw') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('role')).toBe('switch');
    expect(btn.getAttribute('aria-checked')).toBe('false');
    expect(btn.getAttribute('aria-label')).toBe('Web only');
  });

  it('reflects checked', async () => {
    const page = await newSpecPage({
      components: [PopSwitch],
      html: `<pop-switch checked></pop-switch>`,
    });
    const btn = page.root.querySelector('button.sw') as HTMLButtonElement;
    expect(btn.getAttribute('aria-checked')).toBe('true');
    expect(btn.classList.contains('sw--on')).toBe(true);
  });

  it('toggles on click and emits popChange with the new state', async () => {
    const page = await newSpecPage({
      components: [PopSwitch],
      html: `<pop-switch></pop-switch>`,
    });
    const seen: boolean[] = [];
    page.root.addEventListener('popChange', (e) => seen.push((e as CustomEvent<boolean>).detail));
    const btn = page.root.querySelector('button.sw') as HTMLButtonElement;
    btn.click();
    expect(seen).toEqual([true]);
    expect(page.rootInstance.checked).toBe(true);
    btn.click();
    expect(seen).toEqual([true, false]);
    expect(page.rootInstance.checked).toBe(false);
  });

  it('does not toggle while disabled', async () => {
    const page = await newSpecPage({
      components: [PopSwitch],
      html: `<pop-switch disabled></pop-switch>`,
    });
    const spy = vi.fn();
    page.root.addEventListener('popChange', spy);
    // jsdom fires click handlers on disabled buttons via direct .click() in some
    // paths — the component guards internally, so assert the guard.
    (page.rootInstance as PopSwitch)['toggle']();
    expect(spy).not.toHaveBeenCalled();
    expect(page.rootInstance.checked).toBe(false);
  });
});
