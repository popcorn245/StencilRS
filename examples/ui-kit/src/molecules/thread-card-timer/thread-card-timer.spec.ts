import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadCardTimer } from './thread-card-timer';

/** Mount the card and assign the OBJECT payload as a property (attributes can't
 *  carry objects), then re-render — mirrors how the timeline uses it. */
async function mount(payload: unknown, attrs = '') {
  const page = await newSpecPage<PopThreadCardTimer>({
    components: [PopThreadCardTimer],
    html: `<pop-thread-card-timer ${attrs}></pop-thread-card-timer>`,
  });
  page.rootInstance.payload = payload as any;
  await page.waitForChanges();
  return page;
}

const livePayload = {
  title: 'Pizza in the oven',
  data: { fireAt: Date.now() + 20 * 60 * 1000, mode: 'timer', durationMs: 20 * 60 * 1000 },
};

describe('pop-thread-card-timer', () => {
  it('composes pop-countdown for a live timer and shows the title', async () => {
    const page = await mount(livePayload);
    expect(page.root.textContent).toContain('Pizza in the oven');
    const cd = page.root.querySelector('pop-countdown') as HTMLElement & { deadline?: number };
    expect(cd).toBeTruthy();
    expect(cd.deadline).toBe(livePayload.data.fireAt);
  });

  it('renders the three mutating actions when live', async () => {
    const page = await mount(livePayload);
    const labels = Array.from(page.root.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Snooze', 'Add 5 minutes', 'Dismiss']);
  });

  it('emits popCardAction with the actionId when an action is tapped', async () => {
    const page = await mount(livePayload);
    const seen: any[] = [];
    page.root.addEventListener('popCardAction', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelector('button[aria-label="Snooze"]') as HTMLButtonElement).click();
    expect(seen).toHaveLength(1);
    expect(seen[0].actionId).toBe('snooze');
  });

  it('frozen: shows the fired face with the duration, no countdown, no mutating actions', async () => {
    const page = await mount(
      { title: 'Pizza in the oven', data: { fireAt: Date.now() - 1000, mode: 'timer', durationMs: 20 * 60 * 1000 } },
      'liveness="frozen"',
    );
    expect(page.root.querySelector('.tct--frozen')).toBeTruthy();
    expect(page.root.querySelector('pop-countdown')).toBeNull();
    expect(page.root.textContent).toContain('Timer fired');
    expect(page.root.textContent).toContain('20m');
    expect(page.root.querySelectorAll('button')).toHaveLength(0);
  });

  it('readonly: renders no action buttons at all', async () => {
    const page = await mount(livePayload, 'readonly');
    expect(page.root.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders assignee display NAMES, never raw uids', async () => {
    const page = await mount({
      ...livePayload,
      assignees: [{ uid: 'oPXvS5EFIPRprYUC5U08OuU6vvg2', displayName: 'Kat' }],
    });
    expect(page.root.textContent).toContain('Kat');
    expect(page.root.textContent).not.toContain('oPXvS5EFIPRprYUC5U08OuU6vvg2');
  });

  it('falls back instead of throwing on a garbage payload', async () => {
    const page = await mount(undefined);
    expect(page.root.textContent).toContain("couldn't render this card");
    const page2 = await mount({ title: '', data: null });
    expect(page2.root.textContent).toContain("couldn't render this card");
  });
});
