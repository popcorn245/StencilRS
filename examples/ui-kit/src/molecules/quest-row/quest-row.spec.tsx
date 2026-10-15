import { newSpecPage } from '../../test-utils/spec-page';
import { PopQuestRow } from './quest-row';

describe('pop-quest-row', () => {
  it('renders emoji, title, and progress', async () => {
    const page = await newSpecPage({
      components: [PopQuestRow],
      html: `<pop-quest-row quest-id="q1" emoji="🏠" heading="Home Reno" tasks-completed="3" tasks-total="7"></pop-quest-row>`,
    });
    expect(page.root.querySelector('.qr-emoji')!.textContent).toBe('🏠');
    expect(page.root.querySelector('.qr-title')!.textContent).toBe('Home Reno');
    expect(page.root.querySelector('.qr-count')!.textContent).toBe('3/7');
  });

  it('shows 100% progress when all tasks are done', async () => {
    const page = await newSpecPage({
      components: [PopQuestRow],
      html: `<pop-quest-row quest-id="q1" emoji="✅" heading="Done Quest" tasks-completed="5" tasks-total="5"></pop-quest-row>`,
    });
    const fill = page.root.querySelector('.qr-progress-fill--done');
    expect(fill).toBeTruthy();
  });

  it('emits questSelect on click', async () => {
    const page = await newSpecPage({
      components: [PopQuestRow],
      html: `<pop-quest-row quest-id="q1" emoji="🏠" heading="Home"></pop-quest-row>`,
    });
    const handler = vi.fn();
    page.root.addEventListener('questSelect', handler);
    const root = page.root.querySelector('.qr-root') as HTMLElement;
    root.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ questId: 'q1' });
  });

  it('shows 0% progress for empty quest', async () => {
    const page = await newSpecPage({
      components: [PopQuestRow],
      html: `<pop-quest-row quest-id="q1" emoji="📋" heading="Empty" tasks-completed="0" tasks-total="0"></pop-quest-row>`,
    });
    expect(page.root.querySelector('.qr-count')!.textContent).toBe('0/0');
  });
});
