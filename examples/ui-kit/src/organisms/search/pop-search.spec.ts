import { newSpecPage } from '../../test-utils/spec-page';
import { PopSearch } from './pop-search';

const RESULTS = JSON.stringify([
  { section: 'Pages', results: [{ id: 'p1', title: 'Home', url: '/' }, { id: 'p2', title: 'About', url: '/about' }] },
]);

describe('pop-search', () => {
  it('renders result groups when results provided', async () => {
    const page = await newSpecPage({ components: [PopSearch], html: `<pop-search results='${RESULTS}'></pop-search>` });
    (page.rootInstance as any)['viewMode'] = 'search';
    await page.waitForChanges();
    expect(page.root.querySelectorAll('.result-item').length).toBe(2);
  });

  it('emits queryChange on input', async () => {
    const page = await newSpecPage({ components: [PopSearch], html: `<pop-search></pop-search>` });
    const events: string[] = [];
    page.root.addEventListener('queryChange', (e: any) => events.push(e.detail));
    const input = page.root.querySelector('input') as HTMLInputElement;
    input.value = 'test query';
    input.dispatchEvent(new Event('input'));
    await page.waitForChanges();
    expect(events[0]).toBe('test query');
  });

  it('emits resultSelect when a result is clicked', async () => {
    const page = await newSpecPage({ components: [PopSearch], html: `<pop-search results='${RESULTS}'></pop-search>` });
    const events: any[] = [];
    page.root.addEventListener('resultSelect', (e: any) => events.push(e.detail));
    (page.rootInstance as any)['viewMode'] = 'search';
    await page.waitForChanges();
    (page.root.querySelector('.result-item') as HTMLElement).click();
    await page.waitForChanges();
    expect(events[0]?.id).toBe('p1');
  });

  it('shows chat panel when viewMode is chat', async () => {
    const page = await newSpecPage({ components: [PopSearch], html: `<pop-search endpoint="/api/ai/search"></pop-search>` });
    (page.rootInstance as any)['viewMode'] = 'chat';
    await page.waitForChanges();
    expect(page.root.querySelector('.chat-panel')).toBeTruthy();
  });

  it('does not enter chat mode when endpoint is absent', async () => {
    const page = await newSpecPage({ components: [PopSearch], html: `<pop-search></pop-search>` });
    const events: string[] = [];
    page.root.addEventListener('agentQuery', (e: any) => events.push(e.detail));
    (page.rootInstance as any)['query'] = 'hello';
    (page.rootInstance as any)['enterChatMode']();
    await page.waitForChanges();
    expect(events.length).toBe(1);
    expect((page.rootInstance as any)['viewMode']).not.toBe('chat');
  });

  it('shows AI sparkles button when endpoint is set', async () => {
    const page = await newSpecPage({ components: [PopSearch], html: `<pop-search endpoint="/api/ai/search"></pop-search>` });
    expect(page.root.querySelector('.sparkles-btn')).toBeTruthy();
  });

  it('hides AI sparkles button when no endpoint', async () => {
    const page = await newSpecPage({ components: [PopSearch], html: `<pop-search></pop-search>` });
    expect(page.root.querySelector('.sparkles-btn')).toBeNull();
  });

  it('shows sources section in chat panel when results provided', async () => {
    const page = await newSpecPage({ components: [PopSearch], html: `<pop-search endpoint="/api/ai/search"></pop-search>` });
    (page.rootInstance as any)['results'] = JSON.parse(RESULTS);
    (page.rootInstance as any)['viewMode'] = 'chat';
    (page.rootInstance as any)['chatInitialQuery'] = 'home page';
    await page.waitForChanges();
    expect(page.root.querySelector('.sources-section')).toBeTruthy();
  });

  it('close button in chat panel resets viewMode', async () => {
    const page = await newSpecPage({ components: [PopSearch], html: `<pop-search endpoint="/api/ai/search"></pop-search>` });
    (page.rootInstance as any)['viewMode'] = 'chat';
    await page.waitForChanges();
    (page.root.querySelector('.icon-btn.close-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect((page.rootInstance as any)['viewMode']).toBe('idle');
  });
});
