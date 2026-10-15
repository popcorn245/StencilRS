import { newSpecPage } from '../../test-utils/spec-page';
import { PopPresenter } from './presenter';
import { resolvePresenterTier, PRESENTER_BREAKPOINTS } from './presenter-logic';

describe('resolvePresenterTier', () => {
  it('resolves the canonical bands: 767/768/1199/1200', () => {
    expect(resolvePresenterTier(767)).toBe('sheet');
    expect(resolvePresenterTier(768)).toBe('dialog');
    expect(resolvePresenterTier(1199)).toBe('dialog');
    expect(resolvePresenterTier(1200)).toBe('dock');
  });

  it('honors a forced tier over the viewport', () => {
    expect(resolvePresenterTier(375, { tier: 'dock' })).toBe('dock');
    expect(resolvePresenterTier(1440, { tier: 'dialog' })).toBe('dialog');
    expect(resolvePresenterTier(1440, { tier: 'sheet' })).toBe('sheet');
  });

  it('honors breakpoint overrides', () => {
    expect(resolvePresenterTier(700, { sheetMax: 640 })).toBe('dialog');
    expect(resolvePresenterTier(1100, { dockMin: 1024 })).toBe('dock');
  });

  it('exports the canonical defaults', () => {
    expect(PRESENTER_BREAKPOINTS.sheetMax).toBe(767);
    expect(PRESENTER_BREAKPOINTS.dockMin).toBe(1200);
  });
});

describe('pop-presenter', () => {
  it('renders nothing while closed', async () => {
    const page = await newSpecPage({
      components: [PopPresenter],
      html: `<pop-presenter heading="Weather"></pop-presenter>`,
    });
    expect(page.root.querySelector('pop-bottom-sheet, pop-form-dialog, .presenter-dock')).toBeNull();
  });

  it('renders a bottom sheet in the (forced) sheet tier', async () => {
    const page = await newSpecPage({
      components: [PopPresenter],
      html: `<pop-presenter open tier="sheet" heading="Research"></pop-presenter>`,
    });
    const sheet = page.root.querySelector('pop-bottom-sheet');
    expect(sheet).not.toBeNull();
    expect((sheet as HTMLElement & { sheetTitle?: string }).sheetTitle).toBe('Research');
  });

  it('renders a footer-less form dialog in the (forced) dialog tier', async () => {
    const page = await newSpecPage({
      components: [PopPresenter],
      html: `<pop-presenter open tier="dialog" heading="Research"></pop-presenter>`,
    });
    const dialog = page.root.querySelector('pop-form-dialog') as HTMLElement & {
      hideFooter?: boolean;
      dialogTitle?: string;
    };
    expect(dialog).not.toBeNull();
    expect(dialog.hideFooter).toBe(true);
    expect(dialog.dialogTitle).toBe('Research');
  });

  it('renders a plain dock container in the (forced) dock tier', async () => {
    const page = await newSpecPage({
      components: [PopPresenter],
      html: `<pop-presenter open tier="dock" heading="Weather"></pop-presenter>`,
    });
    expect(page.root.querySelector('.presenter-dock')).not.toBeNull();
    expect(page.root.querySelector('.presenter-dock__title')?.textContent).toBe('Weather');
    expect(page.root.querySelector('pop-form-dialog, pop-bottom-sheet')).toBeNull();
  });

  it('renders slotted header content through the header slot (dock tier)', async () => {
    const page = await newSpecPage({
      components: [PopPresenter],
      html: `<pop-presenter open tier="dock"><div slot="header">Room: Living</div></pop-presenter>`,
    });
    expect(page.root.querySelector('.presenter-dock__header-main slot[name="header"], .presenter-dock__header-main')).not.toBeNull();
    // No plain-heading fallback when rich header content is slotted.
    expect(page.root.querySelector('.presenter-dock__title')).toBeNull();
  });

  it('emits popClose from the dock close button', async () => {
    const page = await newSpecPage({
      components: [PopPresenter],
      html: `<pop-presenter open tier="dock" heading="Weather"></pop-presenter>`,
    });
    const spy = vi.fn();
    page.root.addEventListener('popClose', spy);
    (page.root.querySelector('.presenter-dock__close') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not double-bubble popClose when the inner sheet closes', async () => {
    const page = await newSpecPage({
      components: [PopPresenter],
      html: `<pop-presenter open tier="sheet" heading="Research"></pop-presenter>`,
    });
    const sheet = page.root.querySelector('pop-bottom-sheet') as HTMLElement;
    expect(sheet).not.toBeNull();

    // The inner overlay's own (bubbling) popClose. The presenter stops it and re-emits its
    // own, so a listener on the presenter sees exactly ONE popClose (two would mean the
    // inner event also bubbled through).
    const spy = vi.fn();
    page.root.addEventListener('popClose', spy);

    sheet.dispatchEvent(new CustomEvent('popClose', { bubbles: true, composed: true }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].target).toBe(page.root); // the presenter's re-emit, not the sheet's
  });

  it('shows the "Dock to side" affordance only in a wide forced dialog, and emits popRedock', async () => {
    const page = await newSpecPage<PopPresenter>({
      components: [PopPresenter],
      html: `<pop-presenter open tier="dialog" heading="Weather"></pop-presenter>`,
    });
    // jsdom default width is 1024 < dockMin → no affordance.
    expect(page.root.querySelector('.presenter__redock')).toBeNull();

    (page.rootInstance as PopPresenter)['viewportWidth'] = 1440;
    await page.waitForChanges();
    const redock = page.root.querySelector('.presenter__redock') as HTMLButtonElement;
    expect(redock).not.toBeNull();
    const spy = vi.fn();
    page.root.addEventListener('popRedock', spy);
    redock.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits tierChange when the viewport crosses a breakpoint while open', async () => {
    const page = await newSpecPage<PopPresenter>({
      components: [PopPresenter],
      html: `<pop-presenter open heading="X"></pop-presenter>`,
    });
    const tiers: string[] = [];
    page.root.addEventListener('tierChange', (e) => tiers.push((e as CustomEvent<string>).detail));
    const inst = page.rootInstance as PopPresenter;
    // Simulate resizes across both boundaries (jsdom's innerWidth is fixed, so
    // drive the state the resize handler feeds).
    inst['viewportWidth'] = 500;
    inst['maybeEmitTier']();
    inst['viewportWidth'] = 900;
    inst['maybeEmitTier']();
    inst['viewportWidth'] = 1300;
    inst['maybeEmitTier']();
    inst['viewportWidth'] = 1350; // same tier — no re-emit
    inst['maybeEmitTier']();
    expect(tiers).toEqual(['sheet', 'dialog', 'dock']);
  });
});
