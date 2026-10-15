import { newSpecPage } from '../../test-utils/spec-page';
import { ChipGroup } from './chip-group';
import { Chip } from '../../atoms/chip/chip';

describe('pop-chip-group', () => {
  it('renders with role radiogroup by default', async () => {
    const page = await newSpecPage({
      components: [ChipGroup, Chip],
      html: `<pop-chip-group value="a">
        <pop-chip value="a">A</pop-chip>
        <pop-chip value="b">B</pop-chip>
      </pop-chip-group>`,
    });
    expect(page.root.querySelector('[role="radiogroup"]')).not.toBeNull();
  });

  it('renders with role listbox when multiple', async () => {
    const page = await newSpecPage({
      components: [ChipGroup, Chip],
      html: `<pop-chip-group multiple value="a">
        <pop-chip value="a">A</pop-chip>
        <pop-chip value="b">B</pop-chip>
      </pop-chip-group>`,
    });
    expect(page.root.querySelector('[role="listbox"]')).not.toBeNull();
  });
});
