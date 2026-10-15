import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadSettingsSheet } from './thread-settings-sheet';

/** Mount the sheet and assign the OBJECT props, then re-render. */
async function mount(props: Partial<PopThreadSettingsSheet> = {}) {
  const page = await newSpecPage<PopThreadSettingsSheet>({
    components: [PopThreadSettingsSheet],
    html: `<pop-thread-settings-sheet></pop-thread-settings-sheet>`,
  });
  page.rootInstance.thread = { id: 't1', title: 'Kitchen remodel' };
  page.rootInstance.available = [{ channel: 'signal', addresses: ['+13203652454'] }];
  Object.assign(page.rootInstance, props);
  await page.waitForChanges();
  return page;
}

/** Fire what pop-switch fires: `popChange` carrying the NEW checked state. */
function flip(page: Awaited<ReturnType<typeof mount>>, checked: boolean) {
  page.root.querySelector('pop-switch')!.dispatchEvent(
    new CustomEvent('popChange', { detail: checked, bubbles: true, composed: true }),
  );
}

describe('pop-thread-settings-sheet', () => {
  it('hosts the three sections inside a pop-bottom-sheet', async () => {
    const page = await mount({ open: true });
    const bs = page.root.querySelector('pop-bottom-sheet') as HTMLElement & Record<string, any>;
    expect(bs).toBeTruthy();
    expect(bs.open).toBe(true);
    expect(bs.sheetTitle).toBe('Kitchen remodel · settings');
    expect(page.root.textContent).toContain('Notifications');
    expect(page.root.textContent).toContain('Channels');
    expect(page.root.textContent).toContain('Sharing');
    expect(page.root.querySelector('pop-share-sheet')).toBeTruthy();
  });

  it('passes the sharing props through to the generic share sheet', async () => {
    const acl = [{ subjectType: 'user' as const, subjectId: 'u-kat', level: 'viewer' as const }];
    const page = await mount({ acl, people: [{ uid: 'u-kat', displayName: 'Kat' }], canEdit: true });
    const share = page.root.querySelector('pop-share-sheet') as HTMLElement & Record<string, any>;
    expect(share.acl).toBe(acl);
    expect(share.canEdit).toBe(true);
    expect(share.subject).toEqual({ kind: 'thread', id: 't1', title: 'Kitchen remodel' });
  });

  it('the notification segments emit popNotifyChange', async () => {
    const page = await mount({ notifyLevel: 'all' });
    const seen: any[] = [];
    page.root.addEventListener('popNotifyChange', (e) => seen.push((e as CustomEvent).detail));
    const muted = Array.from(page.root.querySelectorAll('.tss__segbtn')).find(
      (b) => b.textContent === 'Muted',
    ) as HTMLButtonElement;
    muted.click();
    expect(seen).toEqual([{ level: 'muted' }]);
  });

  it('states explicitly that muting does NOT stop channel mirroring', async () => {
    const page = await mount({ notifyLevel: 'muted' });
    const note = page.root.querySelector('.tss__note')!.textContent!;
    expect(note).toContain('Muting stops notifications only');
    expect(note).toContain('does NOT stop channel mirroring');
  });

  it('a quiet thread binds a channel straight away with force=false', async () => {
    const page = await mount({ canBind: true, recentPostCount: 3 });
    const seen: any[] = [];
    page.root.addEventListener('popChannelToggle', (e) => seen.push((e as CustomEvent).detail));
    flip(page, true);
    expect(seen).toEqual([
      { channel: 'signal', address: '+13203652454', enabled: true, force: false },
    ]);
  });

  it('a noisy thread shows the warning and gates the bind behind a confirm', async () => {
    const page = await mount({ canBind: true, recentPostCount: 143 });
    expect(page.root.textContent).toContain('This thread got 143 posts this week.');
    expect(page.root.textContent).toContain('means all of them go to your phone.');

    const seen: any[] = [];
    page.root.addEventListener('popChannelToggle', (e) => seen.push((e as CustomEvent).detail));

    flip(page, true);
    expect(seen).toHaveLength(0); // gated — nothing emitted yet
    await page.waitForChanges();

    (page.root.querySelector('.tss__confirm-btn') as HTMLButtonElement).click();
    expect(seen).toEqual([
      { channel: 'signal', address: '+13203652454', enabled: true, force: true },
    ]);
  });

  it('cancelling the noise confirm emits nothing', async () => {
    const page = await mount({ canBind: true, recentPostCount: 143 });
    const seen: any[] = [];
    page.root.addEventListener('popChannelToggle', (e) => seen.push(e));
    flip(page, true);
    await page.waitForChanges();
    (page.root.querySelector('.tss__cancel-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(seen).toHaveLength(0);
    expect(page.root.querySelector('.tss__confirm-btn')).toBeNull();
  });

  it('unbinding a noisy thread is never gated', async () => {
    const page = await mount({
      canBind: true,
      recentPostCount: 143,
      channels: [{ channel: 'signal', address: '+13203652454' }],
    });
    // Already bound ⇒ no warning to show.
    expect(page.root.querySelector('.tss__warn')).toBeNull();
    const seen: any[] = [];
    page.root.addEventListener('popChannelToggle', (e) => seen.push((e as CustomEvent).detail));
    flip(page, false);
    expect(seen).toEqual([
      { channel: 'signal', address: '+13203652454', enabled: false, force: false },
    ]);
  });

  it('canBind=false: the switch is disabled and a flip is ignored', async () => {
    const page = await mount({ canBind: false, recentPostCount: 143 });
    const sw = page.root.querySelector('pop-switch') as HTMLElement & { disabled?: boolean };
    expect(sw.disabled).toBe(true);
    expect(page.root.querySelector('.tss__warn')).toBeNull();
    const seen: any[] = [];
    page.root.addEventListener('popChannelToggle', (e) => seen.push(e));
    flip(page, true);
    expect(seen).toHaveLength(0);
  });

  it('re-emits popClose from the bottom sheet without looping', async () => {
    const page = await mount({ open: true });
    const seen: Event[] = [];
    page.root.addEventListener('popClose', (e) => seen.push(e));
    page.root
      .querySelector('pop-bottom-sheet')!
      .dispatchEvent(new CustomEvent('popClose', { bubbles: true, composed: true }));
    expect(seen).toHaveLength(1);
    expect(seen[0].target).toBe(page.root);
  });

  it('re-emits popAclChange from the embedded share sheet', async () => {
    const page = await mount({ open: true });
    const seen: any[] = [];
    page.root.addEventListener('popAclChange', (e) => seen.push(e));
    const detail = { acl: [{ subjectType: 'user' as const, subjectId: 'u-kat', level: 'viewer' as const }] };
    page.root
      .querySelector('pop-share-sheet')!
      .dispatchEvent(new CustomEvent('popAclChange', { detail, bubbles: true, composed: true }));
    expect(seen).toHaveLength(1);
    expect((seen[0] as CustomEvent).detail).toEqual(detail);
    expect((seen[0] as Event).target).toBe(page.root);
  });
});
