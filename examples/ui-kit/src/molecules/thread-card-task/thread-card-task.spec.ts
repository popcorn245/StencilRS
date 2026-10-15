import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadCardTask } from './thread-card-task';

/** Mount the card and assign the OBJECT payload as a property, then re-render. */
async function mount(payload: unknown, attrs = '') {
  const page = await newSpecPage<PopThreadCardTask>({
    components: [PopThreadCardTask],
    html: `<pop-thread-card-task ${attrs}></pop-thread-card-task>`,
  });
  page.rootInstance.payload = payload as any;
  await page.waitForChanges();
  return page;
}

const labels = (page: { root: Element }) =>
  Array.from(page.root.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));

const openTask = {
  title: 'Take the recycling out',
  data: { taskId: 't-1042', status: 'open', dueDate: '2026-08-05', priority: 'high' },
  assignees: [{ uid: 'uid-abc-123', displayName: 'Kat' }],
};

describe('pop-thread-card-task', () => {
  it('shows the title, priority chip and assignee NAME (never the uid)', async () => {
    const page = await mount(openTask);
    expect(page.root.textContent).toContain('Take the recycling out');
    expect(page.root.textContent).toContain('high');
    expect(page.root.textContent).toContain('Kat');
    expect(page.root.textContent).not.toContain('uid-abc-123');
  });

  it('renders complete / reassign / open when live', async () => {
    const page = await mount(openTask);
    expect(labels(page)).toEqual(['Complete', 'Reassign', 'Open in Tasks']);
  });

  it('emits popCardAction with the taskId param', async () => {
    const page = await mount(openTask);
    const seen: any[] = [];
    page.root.addEventListener('popCardAction', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelector('button[aria-label="Complete"]') as HTMLButtonElement).click();
    expect(seen).toEqual([{ actionId: 'complete', params: { taskId: 't-1042' } }]);
  });

  it('frozen: keeps the navigational "Open in Tasks", drops "Complete"', async () => {
    const page = await mount({ ...openTask, data: { ...openTask.data, status: 'done' } }, 'liveness="frozen"');
    expect(page.root.querySelector('.tcta--frozen')).toBeTruthy();
    expect(labels(page)).toEqual(['Open in Tasks']);
    expect(labels(page)).not.toContain('Complete');
  });

  it('readonly: renders no action buttons at all', async () => {
    const page = await mount(openTask, 'readonly');
    expect(labels(page)).toEqual([]);
  });

  it('falls back instead of throwing on a garbage payload', async () => {
    const page = await mount(null);
    expect(page.root.textContent).toContain("couldn't render this card");
  });
});
