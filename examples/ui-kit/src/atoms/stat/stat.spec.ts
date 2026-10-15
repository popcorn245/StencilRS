import { newSpecPage } from '../../test-utils/spec-page';
import { Stat } from './stat';

describe('pop-stat', () => {
  it('renders value and label', async () => {
    const page = await newSpecPage({
      components: [Stat],
      html: `<pop-stat value="142" label="Points"></pop-stat>`,
    });
    expect(page.root.querySelector('.stat-value').textContent).toBe('142');
    expect(page.root.querySelector('.stat-label').textContent).toBe('Points');
  });

  it('applies size class', async () => {
    const page = await newSpecPage({
      components: [Stat],
      html: `<pop-stat value="42" size="lg"></pop-stat>`,
    });
    expect(page.root.querySelector('.stat-value--lg')).not.toBeNull();
  });

  it('defaults to md size', async () => {
    const page = await newSpecPage({
      components: [Stat],
      html: `<pop-stat value="10"></pop-stat>`,
    });
    expect(page.root.querySelector('.stat-value--md')).not.toBeNull();
  });

  it('renders without label', async () => {
    const page = await newSpecPage({
      components: [Stat],
      html: `<pop-stat value="99"></pop-stat>`,
    });
    expect(page.root.querySelector('.stat-label')).toBeNull();
  });
});
