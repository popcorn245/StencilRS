import { newSpecPage } from '../../test-utils/spec-page';
import { PopCelebration } from './celebration';

describe('pop-celebration', () => {
  it('renders nothing when inactive', async () => {
    const page = await newSpecPage({
      components: [PopCelebration],
      html: `<pop-celebration></pop-celebration>`,
    });
    expect(page.root.querySelector('.cel-overlay')).toBeFalsy();
  });

  it('renders overlay when active', async () => {
    const page = await newSpecPage({
      components: [PopCelebration],
      html: `<pop-celebration active="true" points="50" message="Well done!"></pop-celebration>`,
    });
    expect(page.root.querySelector('.cel-overlay')).toBeTruthy();
    expect(page.root.querySelector('.cel-message')!.textContent).toBe('Well done!');
  });

  it('renders confetti pieces', async () => {
    const page = await newSpecPage({
      components: [PopCelebration],
      html: `<pop-celebration active="true"></pop-celebration>`,
    });
    const pieces = page.root.querySelectorAll('.cel-piece');
    expect(pieces.length).toBe(40);
  });

  it('shows points counter when points > 0', async () => {
    const page = await newSpecPage({
      components: [PopCelebration],
      html: `<pop-celebration active="true" points="100"></pop-celebration>`,
    });
    expect(page.root.querySelector('.cel-points')).toBeTruthy();
  });

  it('hides points counter when points is 0', async () => {
    const page = await newSpecPage({
      components: [PopCelebration],
      html: `<pop-celebration active="true" points="0"></pop-celebration>`,
    });
    expect(page.root.querySelector('.cel-points')).toBeFalsy();
  });
});
