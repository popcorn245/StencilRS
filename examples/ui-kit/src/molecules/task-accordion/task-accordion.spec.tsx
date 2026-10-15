import { newSpecPage } from '../../test-utils/spec-page';
import { PopTaskAccordion } from './task-accordion';

describe('pop-task-accordion', () => {
  it('renders title input with current value', async () => {
    const page = await newSpecPage({
      components: [PopTaskAccordion],
      html: `<pop-task-accordion task-id="t1" heading="My Task"></pop-task-accordion>`,
    });
    const input = page.root.querySelector('.ta-input') as HTMLInputElement;
    expect(input.value).toBe('My Task');
  });

  it('renders status chips with active state', async () => {
    const page = await newSpecPage({
      components: [PopTaskAccordion],
      html: `<pop-task-accordion task-id="t1" heading="Task" status="in_progress"></pop-task-accordion>`,
    });
    const chips = page.root.querySelectorAll('.ta-chip');
    const activeChip = page.root.querySelector('.ta-chip--active');
    expect(chips.length).toBeGreaterThan(0);
    expect(activeChip).toBeTruthy();
    expect(activeChip!.textContent).toBe('In Progress');
  });

  it('renders priority chips with active state', async () => {
    const page = await newSpecPage({
      components: [PopTaskAccordion],
      html: `<pop-task-accordion task-id="t1" heading="Task" priority="high"></pop-task-accordion>`,
    });
    const activeChips = page.root.querySelectorAll('.ta-chip--active');
    // One for status (open by default) and one for priority (high)
    const priorityActive = Array.from(activeChips).find(c => c.textContent === 'High');
    expect(priorityActive).toBeTruthy();
  });

  it('emits taskUpdate when status chip is clicked', async () => {
    const page = await newSpecPage({
      components: [PopTaskAccordion],
      html: `<pop-task-accordion task-id="t1" heading="Task" status="open"></pop-task-accordion>`,
    });
    const handler = vi.fn();
    page.root.addEventListener('taskUpdate', handler);
    // Find the "Done" chip and click it
    const chips = page.root.querySelectorAll('.ta-chip');
    const doneChip = Array.from(chips).find(c => c.textContent === 'Done') as HTMLButtonElement;
    doneChip?.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      taskId: 't1',
      field: 'status',
      value: 'done',
    });
  });

  it('emits taskDelete when delete button is clicked', async () => {
    const page = await newSpecPage({
      components: [PopTaskAccordion],
      html: `<pop-task-accordion task-id="t1" heading="Task"></pop-task-accordion>`,
    });
    const handler = vi.fn();
    page.root.addEventListener('taskDelete', handler);
    const deleteBtn = page.root.querySelector('.ta-delete-btn') as HTMLButtonElement;
    deleteBtn.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ taskId: 't1' });
  });

  it('renders quest picker when quests are provided', async () => {
    const quests = JSON.stringify([{ id: 'q1', emoji: '🏠', title: 'Home' }]);
    const page = await newSpecPage({
      components: [PopTaskAccordion],
      html: `<pop-task-accordion task-id="t1" heading="Task" quests='${quests}'></pop-task-accordion>`,
    });
    const select = page.root.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2); // Inbox + Home
  });
});
