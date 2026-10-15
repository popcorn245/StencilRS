import { newSpecPage } from '../../test-utils/spec-page';
import { PopMessageBubble } from './message-bubble';

describe('pop-message-bubble', () => {
  it('renders in member role by default', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble content="Hello world" message-id="1"></pop-message-bubble>` });
    expect(page.root.querySelector('.mb-role--member')).toBeTruthy();
    expect(page.root.querySelector('.mb-text')!.textContent).toBe('Hello world');
  });

  it('renders assistant role with markdown class', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="assistant" content="**bold**"></pop-message-bubble>` });
    expect(page.root.querySelector('.mb-role--assistant')).toBeTruthy();
    expect(page.root.querySelector('.mb-markdown')).toBeTruthy();
  });

  it('renders user role right-aligned', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="user" content="Hi"></pop-message-bubble>` });
    expect(page.root.querySelector('.mb-role--user')).toBeTruthy();
    expect(page.root.querySelector('.mb-own')).toBeTruthy();
  });

  it('shows streaming cursor in inline mode', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="assistant" content="Loading" streaming="true" streaming-mode="inline"></pop-message-bubble>` });
    expect(page.root.querySelector('.mb-cursor')).toBeTruthy();
    expect(page.root.querySelector('.mb-dots')).toBeFalsy();
  });

  it('shows dots in dots streaming mode', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="assistant" content="" streaming="true" streaming-mode="dots"></pop-message-bubble>` });
    expect(page.root.querySelector('.mb-dots')).toBeTruthy();
    expect(page.root.querySelector('.mb-cursor')).toBeFalsy();
  });

  it('shows copy button on assistant when showCopyButton is true', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="assistant" content="Answer" show-copy-button="true"></pop-message-bubble>` });
    expect(page.root.querySelector('.mb-ai-actions')).toBeTruthy();
  });

  it('does not show AI actions while streaming', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="assistant" content="..." streaming="true" show-copy-button="true"></pop-message-bubble>` });
    expect(page.root.querySelector('.mb-ai-actions')).toBeFalsy();
  });

  it('renders intent chips from JSON prop', async () => {
    const intents = JSON.stringify([{ label: 'Buy milk', type: 'task' }]);
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="assistant" content="Done" intents='${intents}'></pop-message-bubble>` });
    const chip = page.root.querySelector('.mb-chip');
    expect(chip).toBeTruthy();
    expect(chip!.textContent).toContain('Buy milk');
  });

  it('renders pop-thread-summary when threadCount > 0 and not in thread', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="member" content="msg" thread-count="3" thread-preview="Nice!"></pop-message-bubble>` });
    const threadSummary = page.root.querySelector('pop-thread-summary');
    expect(threadSummary).toBeTruthy();
    expect((threadSummary as any).threadCount).toBe(3);
    expect((threadSummary as any).threadPreview).toBe('Nice!');
  });

  it('hides thread summary when isThread is true', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="member" content="msg" thread-count="2" is-thread="true"></pop-message-bubble>` });
    expect(page.root.querySelector('pop-thread-summary')).toBeFalsy();
  });

  it('renders pop-message-actions for member role', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="member" content="edit me" message-id="abc" is-own="true"></pop-message-bubble>` });
    const actions = page.root.querySelector('pop-message-actions');
    expect(actions).toBeTruthy();
    expect((actions as any).messageId).toBe('abc');
    expect((actions as any).isOwn).toBe(true);
  });

  it('emits popMessageEdited event on save', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="member" content="old" message-id="msg1" is-own="true"></pop-message-bubble>` });
    const editedEvents: any[] = [];
    page.root.addEventListener('popMessageEdited', (e: any) => editedEvents.push(e.detail));
    const instance = page.rootInstance as any;
    instance.editing = true;
    instance.editText = 'new text';
    await page.waitForChanges();
    (page.root.querySelector('.mb-btn-save') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(editedEvents).toHaveLength(1);
    expect(editedEvents[0]).toEqual({ id: 'msg1', text: 'new text' });
    expect(instance.editing).toBe(false);
  });

  it('applies prose layout class', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="assistant" content="Text" layout="prose"></pop-message-bubble>` });
    expect(page.root.querySelector('.mb-layout--prose')).toBeTruthy();
  });

  it('renders avatar when avatarUrl is provided', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="member" content="Hi" avatar-url="https://example.com/a.png"></pop-message-bubble>` });
    const img = page.root.querySelector('.mb-avatar-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('a.png');
  });

  it('renders fallback initials when no avatarUrl', async () => {
    const page = await newSpecPage({ components: [PopMessageBubble], html: `<pop-message-bubble role="member" content="Hi" avatar-initials="JD"></pop-message-bubble>` });
    expect(page.root.querySelector('.mb-avatar-fallback')!.textContent).toBe('JD');
  });
});
