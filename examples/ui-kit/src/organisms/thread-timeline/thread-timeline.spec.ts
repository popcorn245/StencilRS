import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadTimeline } from './thread-timeline';
import type { ThreadItem } from './thread-timeline-types';

/** Mount the timeline and assign the OBJECT props, then re-render. */
async function mount(props: Partial<PopThreadTimeline> = {}) {
  const page = await newSpecPage<PopThreadTimeline>({
    components: [PopThreadTimeline],
    html: `<pop-thread-timeline></pop-thread-timeline>`,
  });
  Object.assign(page.rootInstance, props);
  await page.waitForChanges();
  return page;
}

const RENDERERS = { timer: 'pop-thread-card-timer', task: 'pop-thread-card-task' };

const msg = (over: Partial<ThreadItem> = {}): ThreadItem => ({
  id: 'm1',
  threadId: 't1',
  kind: 'message',
  authorUid: 'u-kat',
  authorKind: 'human',
  text: 'hello there',
  createdAt: 1,
  ...over,
});

const card = (over: Partial<ThreadItem> = {}): ThreadItem => ({
  id: 'c1',
  threadId: 't1',
  kind: 'card',
  authorUid: null,
  authorKind: 'bot',
  cardType: 'timer',
  card: { title: 'Pizza', data: { fireAt: 2, mode: 'timer' } },
  liveness: 'live',
  createdAt: 2,
  actions: [{ actionId: 'dismiss', label: 'Dismiss', icon: 'close-outline', mutating: true }],
  ...over,
});

describe('pop-thread-timeline', () => {
  it('renders items in the SERVER order and never re-sorts them', async () => {
    // Deliberately out of createdAt order — the component must not fix it.
    const page = await mount({
      items: [msg({ id: 'b', text: 'second', createdAt: 99 }), msg({ id: 'a', text: 'first', createdAt: 1 })],
      currentUid: 'u-kat',
    });
    const ids = Array.from(page.root.querySelectorAll('[data-item-id]')).map((n) =>
      n.getAttribute('data-item-id'),
    );
    expect(ids).toEqual(['b', 'a']);
  });

  it('renders messages as bubbles with own-vs-other alignment', async () => {
    const page = await mount({
      items: [msg({ id: 'a', authorUid: 'u-kat' }), msg({ id: 'b', authorUid: 'u-bobby', text: 'hi' })],
      currentUid: 'u-kat',
    });
    expect(page.root.querySelector('[data-item-id="a"]')!.className).toContain('ttl__item--own');
    expect(page.root.querySelector('[data-item-id="b"]')!.className).toContain('ttl__item--other');
    expect(page.root.textContent).toContain('hello there');
  });

  it('renders a card through pop-thread-card with the injected renderer tag', async () => {
    const page = await mount({ items: [card()], renderers: RENDERERS, currentUid: 'u-kat' });
    const wrapper = page.root.querySelector('pop-thread-card') as HTMLElement & Record<string, any>;
    expect(wrapper).toBeTruthy();
    expect(wrapper.renderer).toBe('pop-thread-card-timer');
    expect(wrapper.cardType).toBe('timer');
    expect(wrapper.readonly).toBeFalsy();
    expect(wrapper.actions).toHaveLength(1);
  });

  it('re-emits a card action as popItemAction tagged with the item id', async () => {
    const page = await mount({ items: [card()], renderers: RENDERERS, currentUid: 'u-kat' });
    const seen: any[] = [];
    page.root.addEventListener('popItemAction', (e) => seen.push((e as CustomEvent).detail));
    page.root.querySelector('pop-thread-card')!.dispatchEvent(
      new CustomEvent('popCardAction', {
        detail: { actionId: 'dismiss', params: { why: 'test' } },
        bubbles: true,
        composed: true,
      }),
    );
    expect(seen).toEqual([{ itemId: 'c1', actionId: 'dismiss', params: { why: 'test' } }]);
  });

  it('done items are struck through; dismissed items collapse', async () => {
    const page = await mount({
      items: [msg({ id: 'a', itemStatus: 'done' }), msg({ id: 'b', itemStatus: 'dismissed', text: 'gone' })],
      currentUid: 'u-kat',
    });
    expect(page.root.querySelector('[data-item-id="a"]')!.className).toContain('ttl__item--done');
    const dismissed = page.root.querySelector('[data-item-id="b"]')!;
    expect(dismissed.className).toContain('ttl__item--dismissed');
    expect(dismissed.textContent).toContain('Dismissed');
    expect(dismissed.textContent).not.toContain('gone');
  });

  it('a reply renders a tappable back-reference stub that only scrolls', async () => {
    const page = await mount({
      items: [msg({ id: 'a', text: 'buy basil' }), msg({ id: 'b', text: 'done', replyToItemId: 'a' })],
      currentUid: 'u-kat',
    });
    const stub = page.root.querySelector('[data-item-id="b"] .ttl__replyref') as HTMLButtonElement;
    expect(stub).toBeTruthy();
    expect(stub.textContent).toContain('buy basil');

    const seen: string[] = [];
    ['popItemAction', 'popItemReply', 'popItemPromote', 'popItemStatus'].forEach((n) =>
      page.root.addEventListener(n, () => seen.push(n)),
    );
    stub.click();
    expect(seen).toEqual([]);
    expect(page.root.querySelector('[data-item-id="a"]')!.className).toContain('ttl__item--flash');
  });

  it('panel-authored items show a "from <sourcePanel>" attribution', async () => {
    const page = await mount({
      items: [msg({ id: 'a', authorKind: 'panel', authorUid: null, sourcePanel: 'grocery' })],
      currentUid: 'u-kat',
    });
    expect(page.root.textContent).toContain('from grocery');
  });

  it('emits popItemReply / popItemPromote / popItemStatus from the controls', async () => {
    const page = await mount({ items: [msg({ checkable: true })], currentUid: 'u-kat' });
    const seen: any[] = [];
    ['popItemReply', 'popItemPromote', 'popItemStatus'].forEach((n) =>
      page.root.addEventListener(n, (e) => seen.push([n, (e as CustomEvent).detail])),
    );
    (page.root.querySelector('button[aria-label="Reply"]') as HTMLButtonElement).click();
    (page.root.querySelector('button[aria-label="Promote"]') as HTMLButtonElement).click();
    (page.root.querySelector('button[aria-label="Mark done"]') as HTMLButtonElement).click();
    expect(seen).toEqual([
      ['popItemReply', { itemId: 'm1' }],
      ['popItemPromote', { itemId: 'm1' }],
      ['popItemStatus', { itemId: 'm1', status: 'done' }],
    ]);
  });

  it('viewer mode: no action buttons and cards render readonly', async () => {
    const page = await mount({
      items: [msg({ id: 'a', checkable: true }), card({ id: 'c1' })],
      renderers: RENDERERS,
      currentUid: 'u-kat',
      canParticipate: false,
    });
    expect(page.root.querySelectorAll('.ttl__controls')).toHaveLength(0);
    const wrapper = page.root.querySelector('pop-thread-card') as HTMLElement & Record<string, any>;
    expect(wrapper.readonly).toBe(true);
    expect(wrapper.actions).toEqual([]);
  });

  it('empty state and the loadingOlder spinner', async () => {
    const empty = await mount({ items: [] });
    expect(empty.root.textContent).toContain('Nothing here yet.');

    const loading = await mount({ items: [msg()], loadingOlder: true });
    expect(loading.root.querySelector('.ttl__spinner')).toBeTruthy();
    expect(loading.root.querySelector('.ttl__older')).toBeNull();
  });

  it('popLoadOlder carries the oldest rendered item as the cursor', async () => {
    const page = await mount({ items: [msg({ id: 'a' }), msg({ id: 'b' })] });
    const seen: any[] = [];
    page.root.addEventListener('popLoadOlder', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelector('.ttl__older') as HTMLButtonElement).click();
    expect(seen).toEqual([{ cursor: 'a' }]);
  });

  it('appendItem() adds a live row without touching items, and dedupes', async () => {
    const page = await mount({ items: [msg({ id: 'a' })] });
    await page.rootInstance.appendItem(msg({ id: 'z', text: 'live one' }));
    await page.waitForChanges();
    expect(page.root.textContent).toContain('live one');
    expect(page.rootInstance.items).toHaveLength(1);

    await page.rootInstance.appendItem(msg({ id: 'z', text: 'live one' }));
    await page.waitForChanges();
    expect(page.root.querySelectorAll('[data-item-id="z"]')).toHaveLength(1);
  });

  it('scrollToItem() is a no-op for an unknown id', async () => {
    const page = await mount({ items: [msg({ id: 'a' })] });
    await expect(page.rootInstance.scrollToItem('nope')).resolves.toBeUndefined();
  });
});
