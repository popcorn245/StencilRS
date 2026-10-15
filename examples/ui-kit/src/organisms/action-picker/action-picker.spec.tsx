import { newSpecPage } from '../../test-utils/spec-page';
import { PopActionPicker } from './action-picker';

const sampleActions = JSON.stringify([
  { type: 'storage', label: 'View Pantry', payload: { action: 'viewContainer', params: { containerId: 'pantry' } } },
  { type: 'shop', label: 'Add to Groceries', payload: { action: 'addItem', params: { category: 'dairy' } } },
  { type: 'custom', label: 'Open Link', payload: { action: 'openUrl', params: { url: 'https://example.com' } } },
]);

describe('pop-action-picker', () => {
  it('renders nothing when closed', async () => {
    const page = await newSpecPage({
      components: [PopActionPicker],
      html: `<pop-action-picker></pop-action-picker>`,
    });
    expect(page.root.querySelector('.ap-backdrop')).toBeFalsy();
  });

  it('renders the panel when open', async () => {
    const page = await newSpecPage({
      components: [PopActionPicker],
      html: `<pop-action-picker open="true" action-tag-name="Kitchen Shelf" actions='${sampleActions}'></pop-action-picker>`,
    });
    expect(page.root.querySelector('.ap-backdrop')).toBeTruthy();
    expect(page.root.querySelector('.ap-title')!.textContent).toBe('Kitchen Shelf');
  });

  it('renders an action button for each action', async () => {
    const page = await newSpecPage({
      components: [PopActionPicker],
      html: `<pop-action-picker open="true" actions='${sampleActions}'></pop-action-picker>`,
    });
    const btns = page.root.querySelectorAll('.ap-action-btn');
    expect(btns.length).toBe(3);
  });

  it('displays action labels', async () => {
    const page = await newSpecPage({
      components: [PopActionPicker],
      html: `<pop-action-picker open="true" actions='${sampleActions}'></pop-action-picker>`,
    });
    const labels = page.root.querySelectorAll('.ap-action-label');
    expect(labels[0].textContent).toBe('View Pantry');
    expect(labels[1].textContent).toBe('Add to Groceries');
    expect(labels[2].textContent).toBe('Open Link');
  });

  it('emits actionSelected when an action button is clicked', async () => {
    const page = await newSpecPage({
      components: [PopActionPicker],
      html: `<pop-action-picker open="true" actions='${sampleActions}'></pop-action-picker>`,
    });

    const spy = vi.fn();
    page.root.addEventListener('actionSelected', spy);

    const btn = page.root.querySelector('.ap-action-btn') as HTMLButtonElement;
    btn.click();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.label).toBe('View Pantry');
  });

  it('emits pickerDismiss when backdrop is clicked', async () => {
    const page = await newSpecPage({
      components: [PopActionPicker],
      html: `<pop-action-picker open="true" actions='${sampleActions}'></pop-action-picker>`,
    });

    const spy = vi.fn();
    page.root.addEventListener('pickerDismiss', spy);

    const backdrop = page.root.querySelector('.ap-backdrop') as HTMLElement;
    backdrop.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits pickerDismiss when cancel button is clicked', async () => {
    const page = await newSpecPage({
      components: [PopActionPicker],
      html: `<pop-action-picker open="true" actions='${sampleActions}'></pop-action-picker>`,
    });

    const spy = vi.fn();
    page.root.addEventListener('pickerDismiss', spy);

    const cancel = page.root.querySelector('.ap-cancel-btn') as HTMLButtonElement;
    cancel.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
