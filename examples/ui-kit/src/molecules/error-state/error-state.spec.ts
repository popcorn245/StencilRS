import { newSpecPage } from '../../test-utils/spec-page';
import { ErrorState } from './error-state';

describe('pop-error-state', () => {
  it('renders as an alert with the default heading', async () => {
    const page = await newSpecPage({
      components: [ErrorState],
      html: `<pop-error-state></pop-error-state>`,
    });
    const alert = page.root.querySelector('[role="alert"]')!;
    expect(alert).not.toBeNull();
    expect(page.root.textContent).toContain('Something went wrong');
  });

  it('renders a retry button only when retryable', async () => {
    const page = await newSpecPage({
      components: [ErrorState],
      html: `<pop-error-state></pop-error-state>`,
    });
    expect(page.root.querySelector('.err-retry')).toBeNull();

    const page2 = await newSpecPage({
      components: [ErrorState],
      html: `<pop-error-state retryable="true"></pop-error-state>`,
    });
    expect(page2.root.querySelector('.err-retry')).not.toBeNull();
  });

  it('emits popRetry when the retry button is clicked', async () => {
    const page = await newSpecPage({
      components: [ErrorState],
      html: `<pop-error-state retryable="true"></pop-error-state>`,
    });
    let fired = false;
    page.root.addEventListener('popRetry', () => (fired = true));
    (page.root.querySelector('.err-retry') as HTMLButtonElement).click();
    expect(fired).toBe(true);
  });
});
