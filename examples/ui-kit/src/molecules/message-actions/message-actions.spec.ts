import { newSpecPage } from '../../test-utils/spec-page';
import { PopMessageActions } from './message-actions';

describe('pop-message-actions', () => {
  it('renders the thread button by default', async () => {
    const page = await newSpecPage({
      components: [PopMessageActions],
      html: `<pop-message-actions message-id="msg1"></pop-message-actions>`,
    });
    const threadBtn = page.root.querySelector('.mb-act-thread');
    expect(threadBtn).toBeTruthy();
  });

  it('hides thread button when isThread is true', async () => {
    const page = await newSpecPage({
      components: [PopMessageActions],
      html: `<pop-message-actions message-id="msg1" is-thread="true"></pop-message-actions>`,
    });
    const threadBtn = page.root.querySelector('.mb-act-thread');
    expect(threadBtn).toBeNull();
  });

  it('shows edit button only when isOwn', async () => {
    const page = await newSpecPage({
      components: [PopMessageActions],
      html: `<pop-message-actions message-id="msg1" is-own="true"></pop-message-actions>`,
    });
    expect(page.root.querySelector('.mb-act-edit')).toBeTruthy();
  });

  it('hides edit button when not own', async () => {
    const page = await newSpecPage({
      components: [PopMessageActions],
      html: `<pop-message-actions message-id="msg1"></pop-message-actions>`,
    });
    expect(page.root.querySelector('.mb-act-edit')).toBeNull();
  });

  it('shows delete button for admin', async () => {
    const page = await newSpecPage({
      components: [PopMessageActions],
      html: `<pop-message-actions message-id="msg1" is-admin="true"></pop-message-actions>`,
    });
    expect(page.root.querySelector('.mb-act-delete')).toBeTruthy();
  });

  it('emits popThreadOpened when thread button clicked', async () => {
    const page = await newSpecPage({
      components: [PopMessageActions],
      html: `<pop-message-actions message-id="msg1"></pop-message-actions>`,
    });
    const events: CustomEvent[] = [];
    page.root.addEventListener('popThreadOpened', (e: Event) => events.push(e as CustomEvent));
    (page.root.querySelector('.mb-act-thread') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(events.length).toBe(1);
    expect(events[0].detail).toEqual({ id: 'msg1' });
  });

  it('emits popEditRequested when edit button clicked', async () => {
    const page = await newSpecPage({
      components: [PopMessageActions],
      html: `<pop-message-actions message-id="msg1" is-own="true"></pop-message-actions>`,
    });
    const events: CustomEvent[] = [];
    page.root.addEventListener('popEditRequested', (e: Event) => events.push(e as CustomEvent));
    (page.root.querySelector('.mb-act-edit') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(events.length).toBe(1);
    expect(events[0].detail).toBe('msg1');
  });

  it('emits popDeleteRequested when delete button clicked', async () => {
    const page = await newSpecPage({
      components: [PopMessageActions],
      html: `<pop-message-actions message-id="msg1" is-own="true"></pop-message-actions>`,
    });
    const events: CustomEvent[] = [];
    page.root.addEventListener('popDeleteRequested', (e: Event) => events.push(e as CustomEvent));
    (page.root.querySelector('.mb-act-delete') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(events.length).toBe(1);
    expect(events[0].detail).toBe('msg1');
  });
});
