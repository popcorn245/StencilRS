import { newSpecPage } from '../../test-utils/spec-page';
import { PopCommunityChat } from './community-chat';
import { PopMessageBubble } from '../message-bubble/message-bubble';
import { PopMessageBox } from '../message-box/message-box';
import { PopChatToolbar } from '../chat-toolbar/chat-toolbar';

const MSGS = JSON.stringify([
  { id: '1', text: 'Hello', userId: 'u1', userDisplayName: 'Alice', createdAt: 1000 },
  { id: '2', text: 'World', userId: 'u2', userDisplayName: 'Bob', createdAt: 2000 },
]);

describe('pop-community-chat', () => {
  it('renders channel name in header', async () => {
    const page = await newSpecPage({ components: [PopCommunityChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-community-chat channel-name="general"></pop-community-chat>` });
    expect(page.root.querySelector('.cc-channel-name')!.textContent).toBe('general');
  });

  it('renders message bubbles from prop', async () => {
    const page = await newSpecPage({ components: [PopCommunityChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-community-chat messages='${MSGS}' current-user-id="u1"></pop-community-chat>` });
    expect(page.root.querySelectorAll('pop-message-bubble').length).toBe(2);
  });

  it('shows empty state when no messages', async () => {
    const page = await newSpecPage({ components: [PopCommunityChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-community-chat></pop-community-chat>` });
    expect(page.root.querySelector('.cc-empty')).toBeTruthy();
  });

  it('shows login button when no currentUserId', async () => {
    const page = await newSpecPage({ components: [PopCommunityChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-community-chat></pop-community-chat>` });
    expect(page.root.querySelector('.cc-login-btn')).toBeTruthy();
    expect(page.root.querySelector('pop-message-box')).toBeFalsy();
  });

  it('shows message box when currentUserId is set', async () => {
    const page = await newSpecPage({ components: [PopCommunityChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-community-chat current-user-id="u1"></pop-community-chat>` });
    expect(page.root.querySelector('pop-message-box')).toBeTruthy();
    expect(page.root.querySelector('.cc-login-btn')).toBeFalsy();
  });

  it('emits popLoginRequested when login button is clicked', async () => {
    const page = await newSpecPage({ components: [PopCommunityChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-community-chat></pop-community-chat>` });
    const events: void[] = [];
    page.root.addEventListener('popLoginRequested', () => events.push(undefined as any));
    (page.root.querySelector('.cc-login-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(events.length).toBe(1);
  });

  it('shows sort menu when sort button is clicked', async () => {
    const page = await newSpecPage({ components: [PopCommunityChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-community-chat></pop-community-chat>` });
    (page.root.querySelector('.cc-icon-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(page.root.querySelector('.cc-sort-dropdown')).toBeTruthy();
  });

  it('renders full chat link when showFullChatLink is true', async () => {
    const page = await newSpecPage({ components: [PopCommunityChat, PopMessageBubble, PopMessageBox, PopChatToolbar], html: `<pop-community-chat show-full-chat-link="true" full-chat-link="/chat"></pop-community-chat>` });
    const link = page.root.querySelector('a.cc-icon-btn') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.href).toContain('/chat');
  });
});
