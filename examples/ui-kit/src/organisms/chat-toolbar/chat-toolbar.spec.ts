import { newSpecPage } from '../../test-utils/spec-page';
import { PopChatToolbar } from './chat-toolbar';

const MODELS = JSON.stringify([
  { group: 'Anthropic', models: [{ value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' }] },
  { group: 'Local', models: [{ value: 'qwen2.5', label: 'Qwen 2.5' }] },
]);
const TOOLS = JSON.stringify([
  { id: 'web', label: 'Web search', icon: '🌐' },
  { id: 'rag', label: 'Memory', icon: '🔍' },
]);

describe('pop-chat-toolbar', () => {
  it('renders pop-model-selector child', async () => {
    const page = await newSpecPage({ components: [PopChatToolbar], html: `<pop-chat-toolbar models='${MODELS}' selected-model="claude-sonnet-4-6"></pop-chat-toolbar>` });
    const selector = page.root.querySelector('pop-model-selector');
    expect(selector).toBeTruthy();
  });

  it('passes models and selected props to model selector', async () => {
    const page = await newSpecPage({ components: [PopChatToolbar], html: `<pop-chat-toolbar models='${MODELS}' selected-model="claude-sonnet-4-6" selected-mode="plan"></pop-chat-toolbar>` });
    const selector = page.root.querySelector('pop-model-selector') as HTMLElement;
    expect(selector).toBeTruthy();
    expect((selector as any).selectedModel).toBe('claude-sonnet-4-6');
    expect((selector as any).selectedMode).toBe('plan');
  });

  it('renders tools button', async () => {
    const page = await newSpecPage({ components: [PopChatToolbar], html: `<pop-chat-toolbar tools='${TOOLS}'></pop-chat-toolbar>` });
    expect(page.root.querySelector('.ct-tools-btn')).toBeTruthy();
    expect(page.root.querySelector('.ct-tools-label')!.textContent).toBe('Tools');
  });

  it('replaces tools label with active tool icons', async () => {
    const page = await newSpecPage({ components: [PopChatToolbar], html: `<pop-chat-toolbar tools='${TOOLS}' active-tools='["web"]'></pop-chat-toolbar>` });
    expect(page.root.querySelector('.ct-active-tool-icon')).toBeTruthy();
    expect(page.root.querySelector('.ct-tools-label')).toBeFalsy();
  });

  it('shows tools popover when tools button is clicked', async () => {
    const page = await newSpecPage({ components: [PopChatToolbar], html: `<pop-chat-toolbar tools='${TOOLS}'></pop-chat-toolbar>` });
    (page.root.querySelector('.ct-tools-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(page.root.querySelector('.ct-tools-panel')).toBeTruthy();
    expect(page.root.querySelectorAll('.ct-tool-item').length).toBe(2);
  });

  it('emits popToolToggled when tool is toggled', async () => {
    const page = await newSpecPage({ components: [PopChatToolbar], html: `<pop-chat-toolbar tools='${TOOLS}'></pop-chat-toolbar>` });
    const events: any[] = [];
    page.root.addEventListener('popToolToggled', (e: any) => events.push(e.detail));
    (page.root.querySelector('.ct-tools-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    (page.root.querySelector('.ct-tool-item') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(events[0]).toEqual({ id: 'web', enabled: true });
  });

  it('shows mic button when showMicButton is true', async () => {
    const page = await newSpecPage({ components: [PopChatToolbar], html: `<pop-chat-toolbar show-mic-button="true"></pop-chat-toolbar>` });
    expect(page.root.querySelector('.ct-mic-btn')).toBeTruthy();
  });

  it('does not show mic button by default', async () => {
    const page = await newSpecPage({ components: [PopChatToolbar], html: `<pop-chat-toolbar></pop-chat-toolbar>` });
    expect(page.root.querySelector('.ct-mic-btn')).toBeFalsy();
  });
});
