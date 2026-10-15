import { newSpecPage } from '../../test-utils/spec-page';
import { ConfirmDialog } from './confirm-dialog';

describe('pop-confirm-dialog', () => {
  it('renders hidden by default', async () => {
    const page = await newSpecPage({
      components: [ConfirmDialog],
      html: `<pop-confirm-dialog confirm-title="Delete?" message="Are you sure?"></pop-confirm-dialog>`,
    });
    expect(page.root.querySelector('.cd-backdrop--open')).toBeNull();
  });

  it('displays title and message', async () => {
    const page = await newSpecPage({
      components: [ConfirmDialog],
      html: `<pop-confirm-dialog confirm-title="Delete?" message="This cannot be undone."></pop-confirm-dialog>`,
    });
    expect(page.root.querySelector('.cd-title').textContent).toBe('Delete?');
    expect(page.root.querySelector('.cd-message').textContent).toBe(
      'This cannot be undone.'
    );
  });

  it('applies danger class when danger prop is true', async () => {
    const page = await newSpecPage({
      components: [ConfirmDialog],
      html: `<pop-confirm-dialog danger></pop-confirm-dialog>`,
    });
    expect(page.root.querySelector('.cd-btn-danger')).not.toBeNull();
  });
});
