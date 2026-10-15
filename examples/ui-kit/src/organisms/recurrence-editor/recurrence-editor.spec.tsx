import { newSpecPage } from '../../test-utils/spec-page';
import { PopRecurrenceEditor } from './recurrence-editor';

describe('pop-recurrence-editor', () => {
  it('renders the toggle off when value is null', async () => {
    const page = await newSpecPage({
      components: [PopRecurrenceEditor],
      html: `<pop-recurrence-editor></pop-recurrence-editor>`,
    });
    const toggle = page.root.querySelector('.pre__toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    expect(page.root.querySelector('.pre__body')).toBeFalsy();
  });

  it('emits null when toggled off', async () => {
    const page = await newSpecPage({
      components: [PopRecurrenceEditor],
      html: `<pop-recurrence-editor></pop-recurrence-editor>`,
    });
    (page.rootInstance as any).value = { frequency: 'daily' };
    (page.rootInstance as any).onValueChange({ frequency: 'daily' });
    await page.waitForChanges();

    const events: any[] = [];
    page.root.addEventListener('valueChange', (e: any) => events.push(e.detail));

    const toggle = page.root.querySelector('.pre__toggle') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    await page.waitForChanges();
    expect(events[events.length - 1]).toBe(null);
  });

  it('shows day-of-week toggles when weekly', async () => {
    const page = await newSpecPage({
      components: [PopRecurrenceEditor],
      html: `<pop-recurrence-editor></pop-recurrence-editor>`,
    });
    (page.rootInstance as any).onValueChange({ frequency: 'weekly', days: [1, 3] });
    await page.waitForChanges();
    const days = page.root.querySelectorAll('.pre__day');
    expect(days.length).toBe(7);
    expect(days[1].classList.contains('pre__day--active')).toBe(true);
    expect(days[3].classList.contains('pre__day--active')).toBe(true);
    expect(days[2].classList.contains('pre__day--active')).toBe(false);
  });

  it('toggles a weekday and emits updated value', async () => {
    const page = await newSpecPage({
      components: [PopRecurrenceEditor],
      html: `<pop-recurrence-editor></pop-recurrence-editor>`,
    });
    (page.rootInstance as any).onValueChange({ frequency: 'weekly', days: [] });
    await page.waitForChanges();

    const events: any[] = [];
    page.root.addEventListener('valueChange', (e: any) => events.push(e.detail));

    const monBtn = page.root.querySelectorAll('.pre__day')[1] as HTMLButtonElement;
    monBtn.click();
    await page.waitForChanges();

    const last = events[events.length - 1];
    expect(last.frequency).toBe('weekly');
    expect(last.days).toEqual([1]);
  });

  it('shows day-of-month input when monthly', async () => {
    const page = await newSpecPage({
      components: [PopRecurrenceEditor],
      html: `<pop-recurrence-editor></pop-recurrence-editor>`,
    });
    (page.rootInstance as any).onValueChange({ frequency: 'monthly', days: [15] });
    await page.waitForChanges();
    const input = page.root.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('15');
  });

  it('includes endDate when provided', async () => {
    const page = await newSpecPage({
      components: [PopRecurrenceEditor],
      html: `<pop-recurrence-editor></pop-recurrence-editor>`,
    });
    (page.rootInstance as any).onValueChange({ frequency: 'daily', endDate: '2030-01-01' });
    await page.waitForChanges();
    const dateInput = page.root.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput.value).toBe('2030-01-01');
  });
});
