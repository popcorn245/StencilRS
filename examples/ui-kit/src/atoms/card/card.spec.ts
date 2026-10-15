import { newSpecPage } from '../../test-utils/spec-page';
import { Card } from './card';

describe('pop-card', () => {
  it('renders as div by default', async () => {
    const page = await newSpecPage({
      components: [Card],
      html: `<pop-card>Content</pop-card>`,
    });
    expect(page.root.querySelector('div.card')).not.toBeNull();
  });

  it('renders as anchor when href is set', async () => {
    const page = await newSpecPage({
      components: [Card],
      html: `<pop-card href="/test">Content</pop-card>`,
    });
    expect(page.root.querySelector('a.card')).not.toBeNull();
  });

  it('applies variant class', async () => {
    const page = await newSpecPage({
      components: [Card],
      html: `<pop-card variant="glass">Content</pop-card>`,
    });
    expect(page.root.querySelector('.card--glass')).not.toBeNull();
  });

  it('applies padding class', async () => {
    const page = await newSpecPage({
      components: [Card],
      html: `<pop-card padding="lg">Content</pop-card>`,
    });
    expect(page.root.querySelector('.card--lg')).not.toBeNull();
  });
});
