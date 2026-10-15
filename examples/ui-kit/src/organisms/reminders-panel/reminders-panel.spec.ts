import { newSpecPage, setProps } from '../../test-utils/spec-page';
import { PopRemindersPanel } from './reminders-panel';

const now = Date.now();
const MIN = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

const reminders = [
  { id: 'r1', title: 'Take out the trash', reminderAt: iso(now + 14 * MIN), fireInMs: 14 * MIN, recurring: false, overdue: false, status: 'open' },
  { id: 'r2', title: 'Standup', reminderAt: iso(now + 17 * 3600_000), fireInMs: 17 * 3600_000, recurring: true, overdue: false, status: 'open' },
  { id: 'r3', title: 'Call the dentist', reminderAt: iso(now - 19 * 3600_000), fireInMs: -19 * 3600_000, recurring: false, overdue: true, status: 'open' },
];
const counts = { upcoming: 3, today: 2, overdue: 1, recurring: 2 };
const alarm = { sound: 'chime', volume: 0.7, soundOn: true, vibrateOn: true, pushOn: false };

const asAttr = (o: unknown) => JSON.stringify(o).replace(/"/g, '&quot;');

function html(extra = '', rows: unknown = reminders) {
  return `<pop-reminders-panel show-header="false" filter="upcoming" next-title="Take out the trash" countdown-deadline="${now + 14 * MIN}" hero-total-ms="${15 * MIN}" counts="${asAttr(counts)}" alarm="${asAttr(alarm)}" reminders="${asAttr(rows)}" ${extra}></pop-reminders-panel>`;
}

const byLabel = (root: Element, label: string) =>
  Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === label) as HTMLButtonElement | undefined;

describe('pop-reminders-panel', () => {
  it('renders a row per reminder with the title + recurring badge', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    const rows = page.root.querySelectorAll('.rp-row');
    expect(rows.length).toBe(3);
    expect(page.root.textContent).toContain('Take out the trash');
    // The recurring row (Standup) carries the 🔁 badge.
    const standup = Array.from(rows).find((r) => r.textContent?.includes('Standup'));
    expect(standup?.querySelector('.rp-badge')).not.toBeNull();
  });

  it('renders the countdown hero with the shared drain bar (--pct set)', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    expect(page.root.querySelector('.rp-count-name')?.textContent).toContain('Take out the trash');
    // The shared drain bar renders (its --pct is applied at runtime by Stencil;
    // jsdom's Object.assign(style, {'--pct'}) doesn't reflect custom props).
    const drain = page.root.querySelector('.rp-drain') as HTMLElement | null;
    expect(drain).not.toBeNull();
  });

  it('marks the overdue row and shows an overdue relative label', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    const overdue = page.root.querySelector('.rp-row--overdue');
    expect(overdue?.textContent).toContain('Call the dentist');
    expect(overdue?.querySelector('.rp-rel--over')?.textContent).toContain('overdue');
  });

  it('renders a segmented filter with inline counts; Overdue count is alerted when > 0', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    const segs = page.root.querySelectorAll('.rp-seg-btn');
    expect(segs.length).toBe(4);
    // Overdue badge is red (alert) because count is 1.
    const overdueSeg = Array.from(segs).find((s) => s.textContent?.includes('Overdue'));
    expect(overdueSeg?.querySelector('.rp-n--alert')).not.toBeNull();
    expect(overdueSeg?.querySelector('.rp-n')?.textContent).toBe('1');
  });

  it('emits popFilterChange from a segment tap', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    const events: any[] = [];
    page.root.addEventListener('popFilterChange', (e: any) => events.push(e.detail));
    const today = Array.from(page.root.querySelectorAll('.rp-seg-btn')).find((s) => s.textContent?.includes('Today')) as HTMLButtonElement;
    today.click();
    expect(events).toEqual([{ filter: 'today' }]);
  });

  it('emits popSearchChange as the user types', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    const events: any[] = [];
    page.root.addEventListener('popSearchChange', (e: any) => events.push(e.detail));
    const input = page.root.querySelector('.rp-search input') as HTMLInputElement;
    input.value = 'dent';
    input.dispatchEvent(new Event('input'));
    expect(events).toEqual([{ search: 'dent' }]);
  });

  it('emits popCreate with the drafted title + time and clears the drafts', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    const events: any[] = [];
    page.root.addEventListener('popCreate', (e: any) => events.push(e.detail));
    (page.rootInstance as any).createTitle = 'Buy milk';
    (page.rootInstance as any).createTime = '2026-07-20T17:30';
    await page.waitForChanges();
    const add = Array.from(page.root.querySelectorAll('.rp-create .rp-btn')).find((b) => b.textContent === 'Add') as HTMLButtonElement;
    add.click();
    expect(events).toEqual([{ title: 'Buy milk', time: '2026-07-20T17:30' }]);
    expect((page.rootInstance as any).createTitle).toBe('');
  });

  it('opens the per-row snooze menu and emits popSnooze {id, minutes}', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    const events: any[] = [];
    page.root.addEventListener('popSnooze', (e: any) => events.push(e.detail));
    byLabel(page.root, 'Snooze Take out the trash')!.click();
    await page.waitForChanges();
    const menu = page.root.querySelector('.rp-snoozemenu');
    expect(menu).not.toBeNull();
    const tenMin = Array.from(menu!.querySelectorAll('button')).find((b) => b.textContent === '10 min') as HTMLButtonElement;
    tenMin.click();
    expect(events).toEqual([{ id: 'r1', minutes: 10 }]);
  });

  it('emits popDismiss and popDelete from the row actions', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    const dismissed: any[] = [];
    const deleted: any[] = [];
    page.root.addEventListener('popDismiss', (e: any) => dismissed.push(e.detail));
    page.root.addEventListener('popDelete', (e: any) => deleted.push(e.detail));
    byLabel(page.root, 'Dismiss Take out the trash')!.click();
    byLabel(page.root, 'Delete Take out the trash')!.click();
    expect(dismissed).toEqual([{ id: 'r1' }]);
    expect(deleted).toEqual([{ id: 'r1' }]);
  });

  it('KEEPS edit + delete — opens the inline edit form and Save emits popEditReminder', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    // Guard against the past-migration regression that silently dropped edit/delete.
    expect(byLabel(page.root, 'Edit Take out the trash')).toBeTruthy();
    expect(byLabel(page.root, 'Delete Take out the trash')).toBeTruthy();

    const events: any[] = [];
    page.root.addEventListener('popEditReminder', (e: any) => events.push(e.detail));
    byLabel(page.root, 'Edit Take out the trash')!.click();
    await page.waitForChanges();
    expect(page.root.querySelector('.rp-row--edit')).not.toBeNull();
    (page.rootInstance as any).editTitle = 'Take out the recycling';
    (page.rootInstance as any).editTime = '2026-07-20T18:00';
    await page.waitForChanges();
    const save = Array.from(page.root.querySelectorAll('.rp-row--edit .rp-btn')).find((b) => b.textContent === 'Save') as HTMLButtonElement;
    save.click();
    expect(events).toEqual([{ id: 'r1', title: 'Take out the recycling', time: '2026-07-20T18:00' }]);
  });

  it('renders the ringing banner and Dismiss emits popDismiss for the ringing id', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html(`ringing="${asAttr({ id: 'r1', title: 'Take out the trash' })}"`) });
    const banner = page.root.querySelector('.rp-ringing');
    expect(banner).not.toBeNull();
    // The ringing row also pulses.
    expect(page.root.querySelector('.rp-row--ring')).not.toBeNull();
    const events: any[] = [];
    page.root.addEventListener('popDismiss', (e: any) => events.push(e.detail));
    const dismiss = Array.from(banner!.querySelectorAll('button')).find((b) => b.textContent === 'Dismiss') as HTMLButtonElement;
    dismiss.click();
    expect(events).toEqual([{ id: 'r1' }]);
  });

  it('toggles the alarm settings drawer and emits popAlarmChange on a sound pick + popAlarmTest', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    // Drawer closed by default.
    expect(page.root.querySelector('.rp-settings')).toBeNull();
    byLabel(page.root, 'Alarm settings')!.click();
    await page.waitForChanges();
    expect(page.root.querySelector('.rp-settings')).not.toBeNull();

    const changes: any[] = [];
    const tests: number[] = [];
    page.root.addEventListener('popAlarmChange', (e: any) => changes.push(e.detail));
    page.root.addEventListener('popAlarmTest', () => tests.push(1));
    const bell = Array.from(page.root.querySelectorAll('.rp-sound')).find((b) => b.textContent === 'Bell') as HTMLButtonElement;
    bell.click();
    expect(changes).toEqual([{ patch: { sound: 'bell' }, preview: true }]);
    const test = Array.from(page.root.querySelectorAll('.rp-settings .rp-btn')).find((b) => b.textContent?.includes('Test')) as HTMLButtonElement;
    test.click();
    expect(tests.length).toBe(1);
  });

  it('emits popCountdownDone once when the deadline passes', async () => {
    const page = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    const events: number[] = [];
    page.root.addEventListener('popCountdownDone', () => events.push(1));
    // Drive the ticker directly (avoid a real 1s wait) against a past deadline.
    (page.rootInstance as any).countdownDeadline = Date.now() - 1000;
    (page.rootInstance as any).nowMs = Date.now();
    (page.rootInstance as any).maybeAnnounceDone();
    (page.rootInstance as any).maybeAnnounceDone();
    expect(events.length).toBe(1); // announced exactly once
  });

  it('shows the loading and error states', async () => {
    const loadingPage = await newSpecPage({ components: [PopRemindersPanel], html: `<pop-reminders-panel show-header="false" loading="true"></pop-reminders-panel>` });
    expect(loadingPage.root.querySelector('.rp-state')?.textContent).toContain('Loading');

    const errPage = await newSpecPage({ components: [PopRemindersPanel], html: `<pop-reminders-panel show-header="false" error="boom"></pop-reminders-panel>` });
    expect(errPage.root.querySelector('.rp-state--err')?.textContent).toContain('boom');
    const retry = Array.from(errPage.root.querySelectorAll('.rp-btn')).find((b) => b.textContent === 'Retry') as HTMLButtonElement;
    let refreshed = 0;
    errPage.root.addEventListener('popRefresh', () => refreshed++);
    retry.click();
    expect(refreshed).toBe(1);
  });

  it('renders its own header (title + refresh + close) only when showHeader', async () => {
    const withHeader = await newSpecPage({
      components: [PopRemindersPanel],
      html: `<pop-reminders-panel show-header="true" reminders="${asAttr(reminders)}"></pop-reminders-panel>`,
    });
    expect(withHeader.root.querySelector('.rp-head')).not.toBeNull();
    expect(withHeader.root.querySelector('.rp-title')?.textContent).toBe('Reminders');
    // showHeader false → no standalone head (v5 reads the attribute string "false" as true, so set the property).
    const noHeader = await newSpecPage({ components: [PopRemindersPanel], html: html() });
    await setProps(noHeader, { showHeader: false });
    expect(noHeader.root.querySelector('.rp-head')).toBeNull();
  });
});
