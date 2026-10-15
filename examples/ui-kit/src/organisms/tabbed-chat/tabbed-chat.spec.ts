import { newSpecPage } from '../../test-utils/spec-page';
import { PopTabbedChat } from './tabbed-chat';
import { PopAiChat } from '../ai-chat/ai-chat';
import { PopMessageBubble } from '../message-bubble/message-bubble';
import { PopMessageBox } from '../message-box/message-box';
import { PopChatToolbar } from '../chat-toolbar/chat-toolbar';

const SESSIONS = JSON.stringify([
  { id: 's1', label: 'Research', messages: '[]' },
  { id: 's2', label: 'Planning', messages: '[]' },
]);

describe('pop-tabbed-chat', () => {
  it('renders tab bar with session tabs', async () => {
    const page = await newSpecPage({ components: [PopTabbedChat, PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-tabbed-chat sessions='${SESSIONS}' active-session-id="s1"></pop-tabbed-chat>` });
    const tabs = page.root.querySelectorAll('.tc-tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('Research');
    expect(tabs[1].textContent).toContain('Planning');
  });

  it('first tab is active by default', async () => {
    const page = await newSpecPage({ components: [PopTabbedChat, PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-tabbed-chat sessions='${SESSIONS}'></pop-tabbed-chat>` });
    expect(page.root.querySelectorAll('.tc-tab')[0].classList.contains('tc-tab--active')).toBe(true);
  });

  it('emits popSessionSelected when tab is clicked', async () => {
    const page = await newSpecPage({ components: [PopTabbedChat, PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-tabbed-chat sessions='${SESSIONS}' active-session-id="s1"></pop-tabbed-chat>` });
    const events: string[] = [];
    page.root.addEventListener('popSessionSelected', (e: any) => events.push(e.detail));
    const tabs = page.root.querySelectorAll('.tc-tab') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    await page.waitForChanges();
    expect(events[0]).toBe('s2');
    expect(tabs[1].classList.contains('tc-tab--active')).toBe(true);
  });

  it('emits popSessionCreated when + button is clicked', async () => {
    const page = await newSpecPage({ components: [PopTabbedChat, PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-tabbed-chat sessions='${SESSIONS}'></pop-tabbed-chat>` });
    const events: void[] = [];
    page.root.addEventListener('popSessionCreated', () => events.push(undefined as any));
    (page.root.querySelector('.tc-new-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(events.length).toBe(1);
  });

  it('emits popSessionDeleted when close button is clicked', async () => {
    const page = await newSpecPage({ components: [PopTabbedChat, PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-tabbed-chat sessions='${SESSIONS}' active-session-id="s1"></pop-tabbed-chat>` });
    const events: string[] = [];
    page.root.addEventListener('popSessionDeleted', (e: any) => events.push(e.detail));
    (page.root.querySelector('.tc-tab-close') as HTMLElement).click();
    await page.waitForChanges();
    expect(events[0]).toBe('s1');
  });

  it('shows empty state when no sessions', async () => {
    const page = await newSpecPage({ components: [PopTabbedChat, PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-tabbed-chat sessions='[]'></pop-tabbed-chat>` });
    expect(page.root.querySelector('.tc-empty')).toBeTruthy();
  });

  it('renders pop-ai-chat for active session', async () => {
    const page = await newSpecPage({ components: [PopTabbedChat, PopAiChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-tabbed-chat sessions='${SESSIONS}' active-session-id="s1"></pop-tabbed-chat>` });
    expect(page.root.querySelector('pop-ai-chat')).toBeTruthy();
  });
});
