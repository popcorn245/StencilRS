import { newSpecPage } from '../../test-utils/spec-page';
import { PopShareSheet } from './share-sheet';
import type { AclEntry, Group, Member } from './share-sheet-types';

/** Mount the sheet and assign the OBJECT props, then re-render. */
async function mount(props: Partial<PopShareSheet> = {}) {
  const page = await newSpecPage<PopShareSheet>({
    components: [PopShareSheet],
    html: `<pop-share-sheet></pop-share-sheet>`,
  });
  page.rootInstance.subject = { kind: 'thread', id: 't1', title: 'Kitchen remodel' };
  Object.assign(page.rootInstance, props);
  await page.waitForChanges();
  return page;
}

const people: Member[] = [
  { uid: 'u-kat', displayName: 'Kat' },
  { uid: 'u-bobby', displayName: 'Bobby' },
  { uid: 'u-mia', displayName: 'Mia' },
];

const groups: Group[] = [{ id: 'g-house', name: 'Household', memberUids: ['u-kat', 'u-bobby'] }];

const acl: AclEntry[] = [
  { subjectType: 'user', subjectId: 'u-kat', level: 'participant' },
  { subjectType: 'user', subjectId: 'u-bobby', level: 'viewer' },
];

describe('pop-share-sheet', () => {
  it('is domain-free: it renders only the subject the host gave it', async () => {
    const page = await mount({ acl, people, canEdit: true });
    expect(page.root.textContent).toContain('Kitchen remodel');
    expect(page.root.textContent).toContain('People');
  });

  it('renders people by display NAME, never raw uids', async () => {
    const page = await mount({ acl, people, canEdit: true });
    expect(page.root.textContent).toContain('Kat');
    expect(page.root.textContent).toContain('Bobby');
    expect(page.root.textContent).not.toContain('u-kat');
  });

  it('changing a level emits the FULL replacement acl, not a patch', async () => {
    const page = await mount({ acl, people, canEdit: true });
    const seen: any[] = [];
    page.root.addEventListener('popAclChange', (e) => seen.push((e as CustomEvent).detail));

    const rows = Array.from(page.root.querySelectorAll('.shs__row'));
    const bobbyRow = rows.find((r) => r.textContent?.includes('Bobby'))!;
    const participant = Array.from(bobbyRow.querySelectorAll('button')).find(
      (b) => b.textContent === 'Participant',
    ) as HTMLButtonElement;
    participant.click();

    expect(seen).toHaveLength(1);
    expect(seen[0].acl).toEqual([
      { subjectType: 'user', subjectId: 'u-kat', level: 'participant' },
      { subjectType: 'user', subjectId: 'u-bobby', level: 'participant' },
    ]);
    // Stateless: the prop is untouched until the host feeds it back.
    expect(page.rootInstance.acl).toBe(acl);
  });

  it('removing a person emits the acl without that entry', async () => {
    const page = await mount({ acl, people, canEdit: true });
    const seen: any[] = [];
    page.root.addEventListener('popAclChange', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelector('button[aria-label="Remove Kat"]') as HTMLButtonElement).click();
    expect(seen[0].acl).toEqual([{ subjectType: 'user', subjectId: 'u-bobby', level: 'viewer' }]);
  });

  it('the add-person picker only offers people who are not already on the acl', async () => {
    const page = await mount({ acl, people, canEdit: true });
    const values = Array.from(page.root.querySelectorAll('.shs__picker option')).map((o) =>
      o.getAttribute('value'),
    );
    expect(values).toEqual(['', 'u-mia']);
  });

  it('adding a person appends a viewer entry to the full acl', async () => {
    const page = await mount({ acl, people, canEdit: true });
    const seen: any[] = [];
    page.root.addEventListener('popAclChange', (e) => seen.push((e as CustomEvent).detail));

    const picker = page.root.querySelector('.shs__picker') as HTMLSelectElement;
    picker.value = 'u-mia';
    picker.dispatchEvent(new Event('change'));
    await page.waitForChanges();
    (page.root.querySelector('.shs__add-btn') as HTMLButtonElement).click();

    expect(seen).toHaveLength(1);
    expect(seen[0].acl).toHaveLength(3);
    expect(seen[0].acl[2]).toMatchObject({ subjectType: 'user', subjectId: 'u-mia', level: 'viewer' });
  });

  it('groups show a member-count chip and an expander listing members', async () => {
    const page = await mount({
      acl: [...acl, { subjectType: 'group', subjectId: 'g-house', level: 'viewer' }],
      people,
      groups,
      canEdit: true,
    });
    expect(page.root.textContent).toContain('Household');
    expect(page.root.querySelector('.shs__count')!.textContent).toBe('2');
    expect(page.root.querySelector('.shs__members')).toBeNull();

    (page.root.querySelector('button[aria-label="Show members"]') as HTMLButtonElement).click();
    await page.waitForChanges();
    const list = page.root.querySelector('.shs__members')!;
    expect(list.textContent).toContain('Kat');
    expect(list.textContent).toContain('Bobby');
  });

  it('a group missing from `groups` renders as "deleted group" and stays removable', async () => {
    const page = await mount({
      acl: [{ subjectType: 'group', subjectId: 'g-gone', level: 'viewer' }],
      people,
      groups,
      canEdit: true,
    });
    expect(page.root.textContent).toContain('deleted group');
    const seen: any[] = [];
    page.root.addEventListener('popAclChange', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelector('button[aria-label="Remove deleted group"]') as HTMLButtonElement).click();
    expect(seen[0].acl).toEqual([]);
  });

  it('canEdit=false: everything is read-only — no remove, no picker, dead segments', async () => {
    const page = await mount({
      acl: [...acl, { subjectType: 'group', subjectId: 'g-house', level: 'viewer' }],
      people,
      groups,
      canEdit: false,
    });
    expect(page.root.querySelector('.shs__picker')).toBeNull();
    expect(page.root.querySelector('button[aria-label^="Remove"]')).toBeNull();
    const segs = Array.from(page.root.querySelectorAll('.shs__segbtn')) as HTMLButtonElement[];
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.every((b) => b.disabled)).toBe(true);

    const seen: any[] = [];
    page.root.addEventListener('popAclChange', (e) => seen.push(e));
    segs[0].click();
    expect(seen).toHaveLength(0);
  });

  it('the Link section renders disabled with a "Coming soon" badge (Phase 2)', async () => {
    const page = await mount({ acl, people, canEdit: true, linkUrl: 'https://example.test/s/abc' });
    expect(page.root.textContent).toContain('Coming soon');
    expect(page.root.textContent).toContain('Anyone with the link can view');
    const sw = page.root.querySelector('pop-switch') as HTMLElement & { disabled?: boolean };
    expect(sw).toBeTruthy();
    expect(sw.disabled).toBe(true);
  });
});
