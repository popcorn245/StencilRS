import { newSpecPage } from '../../test-utils/spec-page';
import { PopTaskRow } from './task-row';

describe('pop-task-row', () => {
  it('renders with title and default status', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Buy groceries"></pop-task-row>`,
    });
    expect(page.root.querySelector('.tr-title')!.textContent).toBe('Buy groceries');
    expect(page.root.querySelector('.tr-done')).toBeFalsy();
  });

  it('renders done state with strikethrough', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Done task" status="done"></pop-task-row>`,
    });
    expect(page.root.querySelector('.tr-title--done')).toBeTruthy();
    expect(page.root.querySelector('.tr-check--done')).toBeTruthy();
  });

  it('treats skipped status as done', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Skipped task" status="skipped"></pop-task-row>`,
    });
    expect(page.root.querySelector('.tr-done')).toBeTruthy();
    expect(page.root.querySelector('.tr-title--done')).toBeTruthy();
    expect(page.root.querySelector('.tr-check--done')).toBeTruthy();
  });

  it('treats cancelled status as done', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Cancelled task" status="cancelled"></pop-task-row>`,
    });
    expect(page.root.querySelector('.tr-done')).toBeTruthy();
    expect(page.root.querySelector('.tr-title--done')).toBeTruthy();
  });

  it('shows overdue indicator when due date is in the past', async () => {
    const pastDate = '2020-01-01';
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Old task" due-date="${pastDate}"></pop-task-row>`,
    });
    expect(page.root.querySelector('.tr-due--overdue')).toBeTruthy();
  });

  it('renders quest chip when quest info is provided', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Task" quest-emoji="🏠" quest-title="Home"></pop-task-row>`,
    });
    const chip = page.root.querySelector('.tr-quest-chip');
    expect(chip).toBeTruthy();
    expect(chip!.textContent).toContain('Home');
  });

  it('emits taskToggle when checkbox is clicked', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Task" status="open"></pop-task-row>`,
    });
    const handler = vi.fn();
    page.root.addEventListener('taskToggle', handler);
    const checkBtn = page.root.querySelector('.tr-check') as HTMLButtonElement;
    checkBtn.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ taskId: 't1', newStatus: 'done' });
  });

  it('emits taskSelect when row is clicked', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Task"></pop-task-row>`,
    });
    const handler = vi.fn();
    page.root.addEventListener('taskSelect', handler);
    const row = page.root.querySelector('.tr-row') as HTMLElement;
    row.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ taskId: 't1' });
  });

  it('emits taskMenu when ellipsis button is clicked', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Task"></pop-task-row>`,
    });
    const handler = vi.fn();
    page.root.addEventListener('taskMenu', handler);
    const menuBtn = page.root.querySelector('.tr-menu-btn') as HTMLButtonElement;
    menuBtn.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ taskId: 't1' });
  });

  it('does not emit taskSelect when ellipsis button is clicked', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Task"></pop-task-row>`,
    });
    const selectHandler = vi.fn();
    page.root.addEventListener('taskSelect', selectHandler);
    const menuBtn = page.root.querySelector('.tr-menu-btn') as HTMLButtonElement;
    menuBtn.click();
    expect(selectHandler).not.toHaveBeenCalled();
  });

  it('shows error message when error prop is set', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Task" error="Save failed"></pop-task-row>`,
    });
    expect(page.root.querySelector('.tr-error-msg')!.textContent).toBe('Save failed');
    expect(page.root.querySelector('.tr-error')).toBeTruthy();
  });

  it('renders priority dot with correct color', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Task" priority="urgent"></pop-task-row>`,
    });
    const dot = page.root.querySelector('.tr-priority-dot') as HTMLElement;
    // jsdom normalizes hex to rgb
    expect(dot.style.background).toContain('239');
  });

  it('renders ellipsis menu button', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Task"></pop-task-row>`,
    });
    expect(page.root.querySelector('.tr-menu-btn')).toBeTruthy();
  });

  it('does not render accordion slot', async () => {
    const page = await newSpecPage({
      components: [PopTaskRow],
      html: `<pop-task-row task-id="t1" heading="Task"></pop-task-row>`,
    });
    expect(page.root.querySelector('.tr-accordion-slot')).toBeFalsy();
  });
});
