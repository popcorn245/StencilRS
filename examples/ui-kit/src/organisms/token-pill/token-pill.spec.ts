import { newSpecPage } from '../../test-utils/spec-page';
import { PopTokenPill } from './token-pill';

describe('pop-token-pill', () => {
  it('renders with default 0 tokens', async () => {
    const page = await newSpecPage({
      components: [PopTokenPill],
      html: `<pop-token-pill></pop-token-pill>`,
    });
    expect(page.root.shadowRoot.textContent).toContain('0 / 8,192');
  });

  it('estimates tokens correctly from text (4 chars/token)', async () => {
    const page = await newSpecPage({
      components: [PopTokenPill],
      html: `<pop-token-pill text="Hello World"></pop-token-pill>`,
    });
    expect(page.root.shadowRoot.querySelector('.label')!.textContent!.trim()).toContain('3 / 8,192');
  });

  it('overrides estimation with explicit tokens prop', async () => {
    const page = await newSpecPage({
      components: [PopTokenPill],
      html: `<pop-token-pill text="Hello World" tokens="50"></pop-token-pill>`,
    });
    expect(page.root.shadowRoot.querySelector('.label')!.textContent!.trim()).toContain('50 / 8,192');
  });

  it('applies warning class at 85%', async () => {
    const page = await newSpecPage({
      components: [PopTokenPill],
      html: `<pop-token-pill tokens="7000" limit="8192"></pop-token-pill>`,
    });
    expect(page.root.shadowRoot.querySelector('.pill-container')!.classList.contains('warn')).toBe(true);
  });

  it('applies critical class at 98%', async () => {
    const page = await newSpecPage({
      components: [PopTokenPill],
      html: `<pop-token-pill tokens="8100" limit="8192"></pop-token-pill>`,
    });
    expect(page.root.shadowRoot.querySelector('.pill-container')!.classList.contains('crit')).toBe(true);
  });

  it('hides label when showLabel is false', async () => {
    const page = await newSpecPage({
      components: [PopTokenPill],
      html: `<pop-token-pill></pop-token-pill>`,
    });
    // v5: the attribute string "false" no longer turns a boolean prop off; set the property.
    page.root.showLabel = false;
    await page.waitForChanges();
    expect(page.root.shadowRoot.querySelector('.label')).toBeNull();
  });
});
