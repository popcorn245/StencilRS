import { newSpecPage } from '../../test-utils/spec-page';
import { PopTaskList } from './task-list';

const today = new Date();
today.setHours(0, 0, 0, 0);
/** The bucket key the component gives a droppable day bucket: `date:<local YYYY-MM-DD>`. */
const dayKey = (offset: number) => {
  const d = new Date(today.getTime());
  d.setDate(d.getDate() + offset);
  return `date:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isoDay = (offset: number) => {
  const d = new Date(today.getTime());
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

describe('pop-task-list', () => {
  describe('flat mode (legacy / additive backward-compat)', () => {
    it('renders the legacy filter bar by default', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list tasks='[]'></pop-task-list>`,
      });
      expect(page.root.querySelector('.task-list__bar')).toBeTruthy();
      expect(page.root.querySelector('.task-list--timeline')).toBeFalsy();
    });

    it('shows empty state with no tasks', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list tasks='[]'></pop-task-list>`,
      });
      expect(page.root.querySelector('.task-list__empty')).toBeTruthy();
    });

    it('emits taskClick on row click', async () => {
      const tasks = JSON.stringify([
        { id: 't1', title: 'A', status: 'open', priority: 'medium', dueDate: null, assignedTo: [] },
      ]);
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list tasks='${tasks}'></pop-task-list>`,
      });
      const events: any[] = [];
      page.root.addEventListener('taskClick', (e: any) => events.push(e.detail));
      (page.root.querySelector('.task-list__item-wrap') as HTMLElement).click();
      expect(events).toEqual([{ taskId: 't1' }]);
    });
  });

  describe('timeline mode', () => {
    it('renders timeline container with anchor divider', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" tasks='[]'></pop-task-list>`,
      });
      expect(page.root.querySelector('.task-list--timeline')).toBeTruthy();
      // The anchor pill reads "Today" + the date (upper-cased by CSS, not in the DOM).
      expect(page.root.querySelector('.task-list__anchor')!.textContent).toMatch(/today/i);
    });

    it('buckets tasks into Overdue / Today / Tomorrow / Later', async () => {
      const tasks = JSON.stringify([
        { id: 'o', title: 'overdue', status: 'open', priority: 'medium', dueDate: isoDay(-3), assignedTo: [] },
        { id: 't', title: 'today', status: 'open', priority: 'medium', dueDate: isoDay(0), assignedTo: [] },
        { id: 'tm', title: 'tomorrow', status: 'open', priority: 'medium', dueDate: isoDay(1), assignedTo: [] },
        { id: 'i', title: 'inbox', status: 'open', priority: 'medium', dueDate: null, assignedTo: [] },
      ]);
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" tasks='${tasks}'></pop-task-list>`,
      });
      const bucketKeys = Array.from(page.root.querySelectorAll('[data-bucket]'))
        .map(el => (el as HTMLElement).dataset.bucket);
      // Droppable day buckets carry the drop key the host applies (date:<day> / date:none).
      expect(bucketKeys).toContain('overdue');
      expect(bucketKeys).toContain(dayKey(0));
      expect(bucketKeys).toContain(dayKey(1));
      expect(bucketKeys).toContain('date:none');
    });

    it('hides done tasks by default but surfaces today-completed in today bucket', async () => {
      const tasks = JSON.stringify([
        { id: 'd1', title: 'done today', status: 'done', priority: 'medium', dueDate: isoDay(0), assignedTo: [], completedAt: isoDay(0) },
        { id: 'd2', title: 'done yesterday', status: 'done', priority: 'medium', dueDate: isoDay(-1), assignedTo: [], completedAt: isoDay(-1) },
        { id: 'd3', title: 'done old', status: 'done', priority: 'medium', dueDate: isoDay(-30), assignedTo: [], completedAt: isoDay(-30) },
        { id: 'o', title: 'open today', status: 'open', priority: 'medium', dueDate: isoDay(0), assignedTo: [] },
      ]);
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" tasks='${tasks}'></pop-task-list>`,
      });
      const todayBucket = page.root.querySelector(`[data-bucket="${dayKey(0)}"]`)!;
      const todayIds = Array.from(todayBucket.querySelectorAll('[data-task-id]'))
        .map(el => (el as HTMLElement).dataset.taskId);
      expect(todayIds).toContain('o');
      expect(todayIds).toContain('d1');
      expect(todayIds).not.toContain('d2');

      // Archive buckets surface past completions
      const archiveIds = Array.from(page.root.querySelectorAll('.task-list__bucket--archive [data-task-id]'))
        .map(el => (el as HTMLElement).dataset.taskId);
      expect(archiveIds).toContain('d2');
      expect(archiveIds).toContain('d3');
    });

    it('pins selected task above the list', async () => {
      const tasks = JSON.stringify([
        { id: 'a', title: 'aaa', status: 'open', priority: 'medium', dueDate: isoDay(0), assignedTo: [] },
        { id: 'b', title: 'bbb', status: 'open', priority: 'medium', dueDate: isoDay(0), assignedTo: [] },
      ]);
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" tasks='${tasks}' selected-task-id="b"></pop-task-list>`,
      });
      const pinned = page.root.querySelector('.task-list__pinned');
      expect(pinned).toBeTruthy();
      expect(pinned!.querySelector('[data-task-id="b"]')).toBeTruthy();
    });

    it('emits bucketExpand on header click', async () => {
      const tasks = JSON.stringify([
        { id: 'o', title: 'overdue', status: 'open', priority: 'medium', dueDate: isoDay(-1), assignedTo: [] },
      ]);
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" tasks='${tasks}'></pop-task-list>`,
      });
      const events: any[] = [];
      page.root.addEventListener('bucketExpand', (e: any) => events.push(e.detail));
      const header = page.root.querySelector('.task-list__bucket-header') as HTMLButtonElement;
      header.click();
      expect(events.length).toBe(1);
      expect(events[0].bucket).toBe('overdue');
    });
  });

  describe('groupBy = status', () => {
    const statusTasks = JSON.stringify([
      { id: 'op', title: 'open one', status: 'open', priority: 'medium', dueDate: null, assignedTo: [] },
      { id: 'ip', title: 'in progress', status: 'in_progress', priority: 'medium', dueDate: null, assignedTo: [] },
      { id: 'bl', title: 'blocked', status: 'blocked', priority: 'medium', dueDate: null, assignedTo: [] },
      { id: 'dn', title: 'done', status: 'done', priority: 'medium', dueDate: null, assignedTo: [], completedAt: isoDay(-2) },
    ]);

    it('buckets tasks by status with human labels in Open→In progress→Blocked→Done order', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="status" tasks='${statusTasks}'></pop-task-list>`,
      });
      const labels = Array.from(page.root.querySelectorAll('.task-list__bucket-label')).map(el => el.textContent);
      expect(labels).toEqual(['Open', 'In progress', 'Blocked', 'Done']);
    });

    it('uses stable status:<value> bucket keys and marks Done as an archive bucket', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="status" tasks='${statusTasks}'></pop-task-list>`,
      });
      const keys = Array.from(page.root.querySelectorAll('[data-bucket]')).map(el => (el as HTMLElement).dataset.bucket);
      expect(keys).toEqual(['status:open', 'status:in_progress', 'status:blocked', 'status:done']);
      const doneSection = page.root.querySelector('[data-bucket="status:done"]');
      expect(doneSection!.classList.contains('task-list__bucket--archive')).toBe(true);
      // Field-backed grouping → buckets are drag droppable.
      expect((page.root.querySelector('[data-bucket="status:open"]') as HTMLElement).hasAttribute('data-bucket-droppable')).toBe(true);
    });

    it('emits taskMoved with groupBy=status and the target bucket key on drag-drop', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="status" tasks='${statusTasks}'></pop-task-list>`,
      });
      const events: any[] = [];
      page.root.addEventListener('taskMoved', (e: any) => events.push(e.detail));
      const inst = page.rootInstance as any;
      inst.draggingTaskId = 'op';
      inst.dragMoved = true;
      inst.dropBucketKey = 'status:blocked';
      inst.onDragEnd({ pointerId: inst.dragPointerId } as any);
      expect(events).toEqual([{ taskId: 'op', groupBy: 'status', toBucketKey: 'status:blocked' }]);
    });
  });

  describe('groupBy = priority', () => {
    const prioTasks = JSON.stringify([
      { id: 'u', title: 'urgent', status: 'open', priority: 'urgent', dueDate: null, assignedTo: [] },
      { id: 'h', title: 'high', status: 'open', priority: 'high', dueDate: null, assignedTo: [] },
      { id: 'm', title: 'medium', status: 'open', priority: 'medium', dueDate: null, assignedTo: [] },
      { id: 'l', title: 'low', status: 'open', priority: 'low', dueDate: null, assignedTo: [] },
      { id: 'n', title: 'none', status: 'open', priority: '', dueDate: null, assignedTo: [] },
    ]);

    it('buckets by priority Urgent→High→Medium→Low with a trailing No priority bucket', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="priority" tasks='${prioTasks}'></pop-task-list>`,
      });
      const labels = Array.from(page.root.querySelectorAll('.task-list__bucket-label')).map(el => el.textContent);
      expect(labels).toEqual(['Urgent', 'High', 'Medium', 'Low', 'No priority']);
    });

    it('uses stable priority:<value> bucket keys and drops the No priority bucket when unused', async () => {
      const noneTasks = JSON.stringify([
        { id: 'h', title: 'high', status: 'open', priority: 'high', dueDate: null, assignedTo: [] },
        { id: 'l', title: 'low', status: 'open', priority: 'low', dueDate: null, assignedTo: [] },
      ]);
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="priority" tasks='${noneTasks}'></pop-task-list>`,
      });
      const keys = Array.from(page.root.querySelectorAll('[data-bucket]')).map(el => (el as HTMLElement).dataset.bucket);
      expect(keys).toEqual(['priority:high', 'priority:low']);
    });
  });

  describe('sortBy within field-grouped buckets', () => {
    const bucketTasks = JSON.stringify([
      { id: 'c', title: 'Cherry', status: 'open', priority: 'high', dueDate: null, assignedTo: [] },
      { id: 'a', title: 'Apple', status: 'open', priority: 'high', dueDate: null, assignedTo: [] },
      { id: 'b', title: 'Banana', status: 'open', priority: 'high', dueDate: null, assignedTo: [] },
    ]);

    it('orders a status/priority bucket alphabetically when sort-by=title', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="priority" sort-by="title" tasks='${bucketTasks}'></pop-task-list>`,
      });
      const ids = Array.from(page.root.querySelectorAll('[data-bucket="priority:high"] [data-task-id]'))
        .map(el => (el as HTMLElement).dataset.taskId);
      expect(ids).toEqual(['a', 'b', 'c']); // Apple, Banana, Cherry
    });

    it('keeps insertion order for sort-by=createdAt (no-op sort)', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="priority" sort-by="createdAt" tasks='${bucketTasks}'></pop-task-list>`,
      });
      const ids = Array.from(page.root.querySelectorAll('[data-bucket="priority:high"] [data-task-id]'))
        .map(el => (el as HTMLElement).dataset.taskId);
      expect(ids).toEqual(['c', 'a', 'b']);
    });
  });

  describe('groupBy = none (flat, ungrouped, sorted)', () => {
    const flatTasks = JSON.stringify([
      { id: 'c', title: 'Cherry', status: 'open', priority: 'high', dueDate: null, assignedTo: [] },
      { id: 'a', title: 'Apple', status: 'open', priority: 'high', dueDate: null, assignedTo: [] },
      { id: 'b', title: 'Banana', status: 'open', priority: 'high', dueDate: null, assignedTo: [] },
    ]);

    it('renders a flat sorted list with no date dividers or bucket headers', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="none" sort-by="title" tasks='${flatTasks}'></pop-task-list>`,
      });
      // No date anchor divider and no bucket headers — just a flat list.
      expect(page.root.querySelector('.task-list__anchor')).toBeFalsy();
      expect(page.root.querySelector('.task-list__bucket-header')).toBeFalsy();
      const ids = Array.from(page.root.querySelectorAll('[data-task-id]'))
        .map(el => (el as HTMLElement).dataset.taskId);
      expect(ids).toEqual(['a', 'b', 'c']); // Apple, Banana, Cherry (sort-by=title)
    });
  });

  describe('quest grouping labels (parameterized)', () => {
    const questTasks = JSON.stringify([
      { id: 'q', title: 'In quest', status: 'open', priority: 'medium', dueDate: null, assignedTo: [], questId: 'q1', questTitle: 'Reno' },
      { id: 'n', title: 'No quest', status: 'open', priority: 'medium', dueDate: null, assignedTo: [], questId: null },
    ]);

    it('defaults the empty bucket to "No quest"', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="quest" tasks='${questTasks}'></pop-task-list>`,
      });
      const labels = Array.from(page.root.querySelectorAll('.task-list__bucket-label')).map(el => el.textContent);
      expect(labels).toContain('No quest');
    });

    it('honours questGroupEmptyLabel override ("No project")', async () => {
      const page = await newSpecPage({
        components: [PopTaskList],
        html: `<pop-task-list mode="timeline" group-by="quest" quest-group-empty-label="No project" tasks='${questTasks}'></pop-task-list>`,
      });
      const labels = Array.from(page.root.querySelectorAll('.task-list__bucket-label')).map(el => el.textContent);
      expect(labels).toContain('No project');
      expect(labels).not.toContain('No quest');
    });
  });
});
