import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadCard } from './thread-card';
import type { CardAction } from './thread-card-types';

/** Mount the wrapper and assign the OBJECT props (attributes can't carry
 *  objects), then re-render — mirrors how the timeline uses it. */
async function mount(
  payload: unknown,
  props: Partial<PopThreadCard> = {},
  attrs = '',
) {
  const page = await newSpecPage<PopThreadCard>({
    components: [PopThreadCard],
    html: `<pop-thread-card ${attrs}></pop-thread-card>`,
  });
  page.rootInstance.payload = payload as any;
  Object.assign(page.rootInstance, props);
  await page.waitForChanges();
  return page;
}

const payload = {
  title: 'Pizza in the oven',
  subtitle: 'Started from the kitchen',
  data: { fireAt: Date.now() + 20 * 60 * 1000, mode: 'timer' },
};

const actions: CardAction[] = [
  { actionId: 'complete', label: 'Complete', icon: 'checkmark-outline', mutating: true },
  { actionId: 'open', label: 'Open panel', icon: 'open-outline', mutating: false },
];

describe('pop-thread-card', () => {
  it('renders the chrome and mounts the injected renderer with the payload', async () => {
    const page = await mount(payload, { renderer: 'pop-thread-card-timer', cardType: 'timer' });
    expect(page.root.textContent).toContain('Pizza in the oven');
    expect(page.root.textContent).toContain('Started from the kitchen');
    const inner = page.root.querySelector('pop-thread-card-timer') as HTMLElement & {
      payload?: unknown;
      liveness?: string;
      readonly?: boolean;
    };
    expect(inner).toBeTruthy();
    expect(inner.payload).toBe(payload);
    expect(inner.liveness).toBe('live');
    expect(inner.readonly).toBe(false);
  });

  it('renders every action when live and emits popCardAction on tap', async () => {
    const page = await mount(payload, { renderer: 'pop-thread-card-timer', actions });
    const labels = Array.from(page.root.querySelectorAll('button')).map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['Complete', 'Open panel']);

    const seen: any[] = [];
    page.root.addEventListener('popCardAction', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelector('button[aria-label="Complete"]') as HTMLButtonElement).click();
    expect(seen).toHaveLength(1);
    expect(seen[0].actionId).toBe('complete');
  });

  it('frozen: mutes the chrome, keeps navigational actions, drops mutating ones', async () => {
    const page = await mount(payload, { renderer: 'pop-thread-card-timer', actions }, 'liveness="frozen"');
    expect(page.root.querySelector('.tcw--frozen')).toBeTruthy();
    const labels = Array.from(page.root.querySelectorAll('button')).map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['Open panel']);
    const inner = page.root.querySelector('pop-thread-card-timer') as HTMLElement & {
      liveness?: string;
    };
    expect(inner.liveness).toBe('frozen');
  });

  it('readonly: renders no action buttons at all and passes readonly down', async () => {
    const page = await mount(payload, { renderer: 'pop-thread-card-timer', actions }, 'readonly');
    expect(page.root.querySelectorAll('button')).toHaveLength(0);
    const inner = page.root.querySelector('pop-thread-card-timer') as HTMLElement & {
      readonly?: boolean;
    };
    expect(inner.readonly).toBe(true);
  });

  it('renders assignee display NAMES, never raw uids', async () => {
    const page = await mount(payload, {
      renderer: 'pop-thread-card-timer',
      assignees: [{ uid: 'oPXvS5EFIPRprYUC5U08OuU6vvg2', displayName: 'Kat' }],
    });
    expect(page.root.textContent).toContain('Kat');
    expect(page.root.textContent).not.toContain('oPXvS5EFIPRprYUC5U08OuU6vvg2');
  });

  it('falls back to payload.assignees when the prop is empty', async () => {
    const page = await mount(
      { ...payload, assignees: [{ uid: 'u2', displayName: 'Bobby' }] },
      { renderer: 'pop-thread-card-timer' },
    );
    expect(page.root.textContent).toContain('Bobby');
  });

  it('missing renderer: shows the fallback face with the title, never blank', async () => {
    const page = await mount(payload, { cardType: 'snout' });
    expect(page.root.querySelector('.tcw__fallback')).toBeTruthy();
    expect(page.root.textContent).toContain("couldn't render this card");
    expect(page.root.textContent).toContain('Pizza in the oven');
    expect(page.root.textContent).toContain('Started from the kitchen');
  });

  it('renderer outside the pop-* namespace also falls back', async () => {
    const page = await mount(payload, { renderer: 'totally-not-ours' });
    expect(page.root.querySelector('totally-not-ours')).toBeNull();
    expect(page.root.textContent).toContain("couldn't render this card");
  });

  it('falls back instead of throwing on a garbage payload', async () => {
    const page = await mount(undefined, { renderer: 'pop-thread-card-timer' });
    expect(page.root.textContent).toContain("couldn't render this card");
    const page2 = await mount({ title: '', data: null }, { renderer: 'pop-thread-card-timer' });
    expect(page2.root.textContent).toContain("couldn't render this card");
  });
});
