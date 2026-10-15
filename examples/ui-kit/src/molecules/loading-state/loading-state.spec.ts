import { newSpecPage } from '../../test-utils/spec-page';
import { LoadingState } from './loading-state';

describe('pop-loading-state', () => {
  it('renders a spinner by default with role=status + aria-busy', async () => {
    const page = await newSpecPage({
      components: [LoadingState],
      html: `<pop-loading-state></pop-loading-state>`,
    });
    const region = page.root.querySelector('[role="status"]')!;
    expect(region).not.toBeNull();
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(page.root.querySelector('.ls-spinner')).not.toBeNull();
  });

  it('renders card-shaped skeletons for the card-skeleton variant', async () => {
    const page = await newSpecPage({
      components: [LoadingState],
      html: `<pop-loading-state variant="card-skeleton" count="3"></pop-loading-state>`,
    });
    expect(page.root.querySelectorAll('.ls-card').length).toBe(3);
    // Each skeleton mirrors the card silhouette: title + snippet + meta.
    expect(page.root.querySelector('.ls-bar--title')).not.toBeNull();
    expect(page.root.querySelector('.ls-bar--snippet')).not.toBeNull();
    expect(page.root.querySelector('.ls-card__meta')).not.toBeNull();
  });

  it('always renders at least one skeleton card', async () => {
    const page = await newSpecPage({
      components: [LoadingState],
      html: `<pop-loading-state variant="card-skeleton" count="0"></pop-loading-state>`,
    });
    expect(page.root.querySelectorAll('.ls-card').length).toBe(1);
  });
});
