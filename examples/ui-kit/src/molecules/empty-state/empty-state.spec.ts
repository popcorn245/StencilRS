import { newSpecPage } from '../../test-utils/spec-page';
import { EmptyState } from './empty-state';

describe('pop-empty-state', () => {
  it('renders with icon, heading, and message', async () => {
    const page = await newSpecPage({
      components: [EmptyState],
      html: `<pop-empty-state icon="\u{1F4E6}" heading="No items" message="Add some items to get started."></pop-empty-state>`,
    });
    expect(page.root.querySelector('.es-icon').textContent).toBe('\u{1F4E6}');
    expect(page.root.querySelector('.es-heading').textContent).toBe('No items');
    expect(page.root.querySelector('.es-message').textContent).toBe('Add some items to get started.');
  });

  it('defaults to inline size', async () => {
    const page = await newSpecPage({
      components: [EmptyState],
      html: `<pop-empty-state heading="Empty"></pop-empty-state>`,
    });
    expect(page.root.querySelector('.es--inline')).not.toBeNull();
  });

  it('applies full size class', async () => {
    const page = await newSpecPage({
      components: [EmptyState],
      html: `<pop-empty-state size="full" heading="Empty"></pop-empty-state>`,
    });
    expect(page.root.querySelector('.es--full')).not.toBeNull();
  });

  it('has role status', async () => {
    const page = await newSpecPage({
      components: [EmptyState],
      html: `<pop-empty-state heading="Empty"></pop-empty-state>`,
    });
    expect(page.root.querySelector('[role="status"]')).not.toBeNull();
  });
});
