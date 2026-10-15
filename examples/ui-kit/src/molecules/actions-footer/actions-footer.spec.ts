import { newSpecPage } from '../../test-utils/spec-page';
import { PopActionsFooter } from './actions-footer';

describe('pop-actions-footer', () => {
  it('renders Cancel/Send with type="button" (implicit-submit gotcha)', async () => {
    const page = await newSpecPage({
      components: [PopActionsFooter],
      html: `<pop-actions-footer></pop-actions-footer>`,
    });
    const buttons = page.root.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    for (const b of Array.from(buttons)) expect(b.getAttribute('type')).toBe('button');
    expect(page.root.querySelector('.af__cancel')?.textContent).toBe('Cancel');
    expect(page.root.querySelector('.af__submit')?.textContent).toBe('Send');
  });

  it('applies custom labels + tier class', async () => {
    const page = await newSpecPage({
      components: [PopActionsFooter],
      html: `<pop-actions-footer tier="sheet" submit-label="Create" cancel-label="Back"></pop-actions-footer>`,
    });
    expect(page.root.querySelector('.af--sheet')).not.toBeNull();
    expect(page.root.querySelector('.af__submit')?.textContent).toBe('Create');
    expect(page.root.querySelector('.af__cancel')?.textContent).toBe('Back');
  });

  it('emits popSubmit / popCancel', async () => {
    const page = await newSpecPage({
      components: [PopActionsFooter],
      html: `<pop-actions-footer></pop-actions-footer>`,
    });
    const submit = vi.fn();
    const cancel = vi.fn();
    page.root.addEventListener('popSubmit', submit);
    page.root.addEventListener('popCancel', cancel);
    (page.root.querySelector('.af__submit') as HTMLButtonElement).click();
    (page.root.querySelector('.af__cancel') as HTMLButtonElement).click();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('disables submit via submitDisabled', async () => {
    const page = await newSpecPage({
      components: [PopActionsFooter],
      html: `<pop-actions-footer submit-disabled></pop-actions-footer>`,
    });
    expect((page.root.querySelector('.af__submit') as HTMLButtonElement).disabled).toBe(true);
    expect((page.root.querySelector('.af__cancel') as HTMLButtonElement).disabled).toBe(false);
  });

  it('busy disables both and shows the spinner', async () => {
    const page = await newSpecPage({
      components: [PopActionsFooter],
      html: `<pop-actions-footer busy></pop-actions-footer>`,
    });
    expect((page.root.querySelector('.af__submit') as HTMLButtonElement).disabled).toBe(true);
    expect((page.root.querySelector('.af__cancel') as HTMLButtonElement).disabled).toBe(true);
    expect(page.root.querySelector('.af__spin')).not.toBeNull();
  });
});
