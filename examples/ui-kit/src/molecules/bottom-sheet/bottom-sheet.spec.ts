import { newSpecPage } from '../../test-utils/spec-page';
import { BottomSheet } from './bottom-sheet';

describe('pop-bottom-sheet', () => {
  it('renders hidden by default', async () => {
    const page = await newSpecPage({
      components: [BottomSheet],
      html: `<pop-bottom-sheet></pop-bottom-sheet>`,
    });
    expect(page.root.querySelector('.bs-sheet--open')).toBeNull();
  });

  it('renders open with title', async () => {
    const page = await newSpecPage({
      components: [BottomSheet],
      html: `<pop-bottom-sheet open sheet-title="Add Item"></pop-bottom-sheet>`,
    });
    expect(page.root.querySelector('.bs-sheet--open')).not.toBeNull();
    expect(page.root.querySelector('.bs-title').textContent).toBe('Add Item');
  });

  it('renders handle bar', async () => {
    const page = await newSpecPage({
      components: [BottomSheet],
      html: `<pop-bottom-sheet open></pop-bottom-sheet>`,
    });
    expect(page.root.querySelector('.bs-handle')).not.toBeNull();
  });

  // Regression: Escape during an active drag closes the sheet; the eventual
  // pointerup (onDragEnd) must NOT emit popClose a second time.
  it('emits popClose only once on Escape-then-pointerup during a drag', async () => {
    const page = await newSpecPage<BottomSheet>({
      components: [BottomSheet],
      html: `<pop-bottom-sheet open></pop-bottom-sheet>`,
    });
    const inst = page.rootInstance as any;
    const spy = vi.fn();
    page.root.addEventListener('popClose', spy);

    // Begin a drag and move well past the close threshold.
    inst.onDragStart({ pointerId: 1, button: 0, clientY: 0, timeStamp: 0, currentTarget: { setPointerCapture() {} } });
    inst.onDragMove({ pointerId: 1, clientY: 400, timeStamp: 16 });

    // Escape closes the sheet (first, and only, popClose).
    inst.handleKeydown({ key: 'Escape' } as KeyboardEvent);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(inst.open).toBe(false);

    // The finger lifts: onDragEnd runs but the sheet is already closed → no re-emit.
    inst.onDragEnd({ pointerId: 1, clientY: 400, timeStamp: 32 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // Regression: unmounting mid-drag must remove the three window pointer listeners
  // so the dead instance isn't held for the page lifetime.
  it('removes window pointer listeners on disconnect', async () => {
    const page = await newSpecPage<BottomSheet>({
      components: [BottomSheet],
      html: `<pop-bottom-sheet open></pop-bottom-sheet>`,
    });
    const inst = page.rootInstance as any;
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    inst.onDragStart({ pointerId: 2, button: 0, clientY: 0, timeStamp: 0, currentTarget: { setPointerCapture() {} } });
    inst.disconnectedCallback();

    const removed = removeSpy.mock.calls.map((c) => c[0]);
    expect(removed).toContain('pointermove');
    expect(removed).toContain('pointerup');
    expect(removed).toContain('pointercancel');
    expect(inst.pointerId).toBeNull();
    removeSpy.mockRestore();
  });
});
