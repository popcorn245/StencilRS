import { newSpecPage } from '../../test-utils/spec-page';
import { Chip } from './chip';

describe('pop-chip', () => {
  it('renders with label', async () => {
    const page = await newSpecPage({
      components: [Chip],
      html: `<pop-chip value="test">Test</pop-chip>`,
    });
    expect(page.root.querySelector('.chip')).not.toBeNull();
    expect(page.root.textContent).toContain('Test');
  });

  it('applies selected class', async () => {
    const page = await newSpecPage({
      components: [Chip],
      html: `<pop-chip value="test" selected>Test</pop-chip>`,
    });
    expect(page.root.querySelector('.chip--selected')).not.toBeNull();
  });

  it('shows remove button when removable', async () => {
    const page = await newSpecPage({
      components: [Chip],
      html: `<pop-chip value="test" removable>Test</pop-chip>`,
    });
    expect(page.root.querySelector('.chip-remove')).not.toBeNull();
  });
});
