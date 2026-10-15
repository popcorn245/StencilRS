import { newSpecPage } from '../../test-utils/spec-page';
import { StatusBadge } from './status-badge';

describe('pop-status-badge', () => {
  it('renders chip variant by default', async () => {
    const page = await newSpecPage({
      components: [StatusBadge],
      html: `<pop-status-badge>Active</pop-status-badge>`,
    });
    expect(page.root.querySelector('.sb--chip')).not.toBeNull();
  });

  it('renders dot variant', async () => {
    const page = await newSpecPage({
      components: [StatusBadge],
      html: `<pop-status-badge variant="dot" color="#22c55e"></pop-status-badge>`,
    });
    expect(page.root.querySelector('.sb--dot')).not.toBeNull();
  });

  it('renders pill variant', async () => {
    const page = await newSpecPage({
      components: [StatusBadge],
      html: `<pop-status-badge variant="pill">Pending</pop-status-badge>`,
    });
    expect(page.root.querySelector('.sb--pill')).not.toBeNull();
  });

  it('applies size class', async () => {
    const page = await newSpecPage({
      components: [StatusBadge],
      html: `<pop-status-badge size="sm">Small</pop-status-badge>`,
    });
    expect(page.root.querySelector('.sb--sm')).not.toBeNull();
  });
});
