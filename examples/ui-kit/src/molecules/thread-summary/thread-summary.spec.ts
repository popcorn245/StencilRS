import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadSummary } from './thread-summary';

describe('pop-thread-summary', () => {
  it('renders nothing when threadCount is 0', async () => {
    const page = await newSpecPage({
      components: [PopThreadSummary],
      html: `<pop-thread-summary message-id="msg1" thread-count="0"></pop-thread-summary>`,
    });
    expect(page.root.querySelector('.mb-thread-summary')).toBeNull();
  });

  it('renders thread summary when threadCount > 0', async () => {
    const page = await newSpecPage({
      components: [PopThreadSummary],
      html: `<pop-thread-summary message-id="msg1" thread-count="3" thread-preview="Latest reply"></pop-thread-summary>`,
    });
    expect(page.root.querySelector('.mb-thread-summary')).toBeTruthy();
    expect(page.root.querySelector('.mb-thread-preview').textContent).toBe('Latest reply');
  });

  it('shows avatar when threadAvatarUrl is provided', async () => {
    const page = await newSpecPage({
      components: [PopThreadSummary],
      html: `<pop-thread-summary message-id="msg1" thread-count="1" thread-avatar-url="http://example.com/avatar.png"></pop-thread-summary>`,
    });
    const img = page.root.querySelector('.mb-thread-avatar') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toBe('http://example.com/avatar.png');
  });

  it('emits popThreadOpened when clicked', async () => {
    const page = await newSpecPage({
      components: [PopThreadSummary],
      html: `<pop-thread-summary message-id="msg1" thread-count="2"></pop-thread-summary>`,
    });
    const events: CustomEvent[] = [];
    page.root.addEventListener('popThreadOpened', (e: Event) => events.push(e as CustomEvent));
    (page.root.querySelector('.mb-thread-summary') as HTMLElement).click();
    await page.waitForChanges();
    expect(events.length).toBe(1);
    expect(events[0].detail).toEqual({ id: 'msg1' });
  });

  it('shows default text when no preview provided', async () => {
    const page = await newSpecPage({
      components: [PopThreadSummary],
      html: `<pop-thread-summary message-id="msg1" thread-count="1"></pop-thread-summary>`,
    });
    expect(page.root.querySelector('.mb-thread-preview').textContent).toBe('Thread reply...');
  });
});
