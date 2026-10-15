import { newSpecPage } from '../../test-utils/spec-page';
import { PopTaskQuickAdd } from './task-quick-add';

describe('pop-task-quick-add', () => {
  it('renders nothing when closed', async () => {
    const page = await newSpecPage({
      components: [PopTaskQuickAdd],
      html: `<pop-task-quick-add></pop-task-quick-add>`,
    });
    expect(page.root.querySelector('.tqa-backdrop')).toBeFalsy();
  });

  it('renders popover when open', async () => {
    const page = await newSpecPage({
      components: [PopTaskQuickAdd],
      html: `<pop-task-quick-add open="true"></pop-task-quick-add>`,
    });
    expect(page.root.querySelector('.tqa-backdrop')).toBeTruthy();
    expect(page.root.querySelector('.tqa-input')).toBeTruthy();
  });

  it('shows validation error on empty title submit', async () => {
    const page = await newSpecPage({
      components: [PopTaskQuickAdd],
      html: `<pop-task-quick-add open="true"></pop-task-quick-add>`,
    });
    const form = page.root.querySelector('.tqa-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await page.waitForChanges();
    expect(page.root.querySelector('.tqa-error')!.textContent).toBe('Title is required');
  });

  it('renders plain text input when no mentionSources provided (backward compat)', async () => {
    const page = await newSpecPage({
      components: [PopTaskQuickAdd],
      html: `<pop-task-quick-add open="true"></pop-task-quick-add>`,
    });
    expect(page.root.querySelector('input.tqa-input')).toBeTruthy();
    expect(page.root.querySelector('pop-mention-input')).toBeFalsy();
  });

  it('renders pop-mention-input when mentionSources is set', async () => {
    const page = await newSpecPage({
      components: [PopTaskQuickAdd],
      html: `<pop-task-quick-add open="true"></pop-task-quick-add>`,
    });
    (page.rootInstance as any).mentionSources = {
      people: [{ trigger: '@', label: 'People', resolve: () => [] }],
    };
    await page.waitForChanges();
    expect(page.root.querySelector('pop-mention-input')).toBeTruthy();
    expect(page.root.querySelector('input.tqa-input')).toBeFalsy();
  });

  it('renders quest dropdown options', async () => {
    const quests = JSON.stringify([
      { id: 'q1', emoji: '🏠', title: 'Home' },
      { id: 'q2', emoji: '💼', title: 'Work' },
    ]);
    const page = await newSpecPage({
      components: [PopTaskQuickAdd],
      html: `<pop-task-quick-add open="true" quests='${quests}'></pop-task-quick-add>`,
    });
    const select = page.root.querySelector('.tqa-quest-select') as HTMLSelectElement;
    // Inbox + Home + Work = 3 options
    expect(select.options.length).toBe(3);
  });
});
