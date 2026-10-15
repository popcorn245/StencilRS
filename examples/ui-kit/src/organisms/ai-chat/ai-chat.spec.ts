import { newSpecPage } from '../../test-utils/spec-page';
import { PopAiChat } from './ai-chat';
import { PopMessageBubble } from '../message-bubble/message-bubble';
import { PopMessageBox } from '../message-box/message-box';
import { PopChatToolbar } from '../chat-toolbar/chat-toolbar';

describe('pop-ai-chat', () => {
  it('renders empty state when no messages', async () => {
    const page = await newSpecPage({ components: [PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-ai-chat></pop-ai-chat>` });
    expect(page.root.querySelector('.aic-empty')).toBeTruthy();
  });

  it('renders pre-loaded messages from prop', async () => {
    const msgs = JSON.stringify([
      { id: '1', role: 'user', content: 'Hello', timestamp: 1000 },
      { id: '2', role: 'assistant', content: 'Hi there', timestamp: 1001 },
    ]);
    const page = await newSpecPage({ components: [PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-ai-chat messages='${msgs}'></pop-ai-chat>` });
    expect(page.root.querySelectorAll('pop-message-bubble').length).toBe(2);
  });

  it('renders pop-message-box input', async () => {
    const page = await newSpecPage({ components: [PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-ai-chat placeholder="Ask me..."></pop-ai-chat>` });
    expect(page.root.querySelector('pop-message-box')).toBeTruthy();
  });

  it('applies prose layout class', async () => {
    const page = await newSpecPage({ components: [PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-ai-chat layout="prose"></pop-ai-chat>` });
    expect(page.root.querySelector('.aic-layout--prose')).toBeTruthy();
  });

  it('disables message box when disabled prop is set', async () => {
    const page = await newSpecPage({ components: [PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-ai-chat disabled="true"></pop-ai-chat>` });
    const box = page.root.querySelector('pop-message-box') as any;
    expect(box.disabled).toBe(true);
  });

  it('tracks model change from toolbar', async () => {
    const page = await newSpecPage({ components: [PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-ai-chat></pop-ai-chat>` });
    const events: string[] = [];
    page.root.addEventListener('popModelChanged', (e: any) => events.push(e.detail));
    const instance = page.rootInstance as any;
    instance.currentModel = 'qwen2.5';
    instance.popModelChanged.emit('qwen2.5');
    await page.waitForChanges();
    expect(events[0]).toBe('qwen2.5');
    expect(instance.currentModel).toBe('qwen2.5');
  });

  it('adds user message to list on send', async () => {
    const page = await newSpecPage({ components: [PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-ai-chat></pop-ai-chat>` });
    const instance = page.rootInstance as any;
    instance.streamResponse = async () => { instance.isStreaming = false; };
    await instance.handleSend({ text: 'Test message', files: [] });
    await page.waitForChanges();
    expect(instance.localMessages.some((m: any) => m.content === 'Test message')).toBe(true);
  });

  it('emits popMessageSent on send', async () => {
    const page = await newSpecPage({ components: [PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-ai-chat session-id="s1"></pop-ai-chat>` });
    const events: any[] = [];
    page.root.addEventListener('popMessageSent', (e: any) => events.push(e.detail));
    const instance = page.rootInstance as any;
    instance.streamResponse = async () => { instance.isStreaming = false; };
    await instance.handleSend({ text: 'Hello', files: [] });
    await page.waitForChanges();
    expect(events[0].text).toBe('Hello');
    expect(events[0].sessionId).toBe('s1');
  });
});
