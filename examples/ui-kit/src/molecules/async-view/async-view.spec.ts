import { newSpecPage } from '../../test-utils/spec-page';
import { PopAsyncView } from './async-view';

const visible = (page: { root: Element }): string[] =>
  Array.from(page.root.querySelectorAll('.av__region.av__region--active')).map((r) =>
    Array.from(r.classList)
      .find((c) => c.startsWith('av__region--') && c !== 'av__region--active')!
      .replace('av__region--', ''),
  );

describe('pop-async-view', () => {
  it('defaults to the loading region', async () => {
    const page = await newSpecPage({
      components: [PopAsyncView],
      html: `<pop-async-view></pop-async-view>`,
    });
    expect(visible(page)).toEqual(['loading']);
    expect(page.root.querySelector('pop-loading-state')).not.toBeNull();
  });

  it('shows exactly one region per state and keeps the others mounted', async () => {
    const page = await newSpecPage<PopAsyncView>({
      components: [PopAsyncView],
      html: `<pop-async-view state="content"></pop-async-view>`,
    });
    expect(visible(page)).toEqual(['content']);
    // All four regions remain in the DOM (slotted content never torn down).
    expect(page.root.querySelectorAll('.av__region')).toHaveLength(4);

    page.rootInstance.state = 'error';
    await page.waitForChanges();
    expect(visible(page)).toEqual(['error']);

    page.rootInstance.state = 'empty';
    await page.waitForChanges();
    expect(visible(page)).toEqual(['empty']);
  });

  it('renders the default empty/error labels', async () => {
    const page = await newSpecPage({
      components: [PopAsyncView],
      html: `<pop-async-view state="empty" empty-label="No tags yet" error-label="Fetch failed"></pop-async-view>`,
    });
    expect((page.root.querySelector('pop-empty-state') as any)?.message).toBe('No tags yet');
    expect((page.root.querySelector('pop-error-state') as any)?.heading).toBe('Fetch failed');
  });

  it('re-emits the inner retry as popRetry', async () => {
    const page = await newSpecPage<PopAsyncView>({
      components: [PopAsyncView],
      html: `<pop-async-view state="error"></pop-async-view>`,
    });
    const spy = vi.fn();
    page.root.addEventListener('popRetry', spy);
    (page.rootInstance as PopAsyncView)['onInnerRetry'](new CustomEvent('popRetry'));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
