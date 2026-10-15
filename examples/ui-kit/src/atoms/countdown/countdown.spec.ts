import { newSpecPage } from '../../test-utils/spec-page';
import { PopCountdown } from './countdown';

describe('pop-countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders idleText when there is no deadline', async () => {
    const page = await newSpecPage({
      components: [PopCountdown],
      html: `<pop-countdown idle-text="No upcoming reminders"></pop-countdown>`,
    });
    expect(page.root.textContent).toContain('No upcoming reminders');
  });

  it('renders the remaining time (h/m/s, zero-padded) with the label', async () => {
    const deadline = Date.now() + (1 * 3600 + 2 * 60 + 5) * 1000;
    const page = await newSpecPage({
      components: [PopCountdown],
      html: `<pop-countdown label="Call mom" deadline="${deadline}"></pop-countdown>`,
    });
    expect(page.root.textContent).toContain('Call mom');
    expect(page.root.textContent).toContain('in 1h 02m 05s');
  });

  // The spec harness (test-utils/spec-page) doesn't run connectedCallback or
  // @Watch — drive them explicitly, exactly like the harness's other lifecycle
  // hooks (componentWillLoad is invoked manually there too).

  it('ticks down each second once connected', async () => {
    const deadline = Date.now() + 65_000;
    const page = await newSpecPage<PopCountdown>({
      components: [PopCountdown],
      html: `<pop-countdown deadline="${deadline}"></pop-countdown>`,
    });
    page.rootInstance.connectedCallback();
    expect(page.root.textContent).toContain('in 1m 05s');
    vi.advanceTimersByTime(2000);
    await page.waitForChanges();
    expect(page.root.textContent).toContain('in 1m 03s');
    page.rootInstance.disconnectedCallback();
  });

  it('emits popCountdownDone ONCE on crossing zero, then shows the overdue face', async () => {
    const deadline = Date.now() + 2000;
    const page = await newSpecPage<PopCountdown>({
      components: [PopCountdown],
      html: `<pop-countdown deadline="${deadline}" overdue-text="due"></pop-countdown>`,
    });
    page.rootInstance.connectedCallback();
    const done = vi.fn();
    page.root.addEventListener('popCountdownDone', done);
    vi.advanceTimersByTime(5000);
    await page.waitForChanges();
    expect(done).toHaveBeenCalledTimes(1);
    expect(page.root.textContent).toContain('due');
    // Keeps ticking (counting up) but never re-fires.
    vi.advanceTimersByTime(3000);
    await page.waitForChanges();
    expect(done).toHaveBeenCalledTimes(1);
    page.rootInstance.disconnectedCallback();
  });

  it('re-arms the done latch when the deadline moves out (snooze)', async () => {
    const deadline = Date.now() + 1000;
    const page = await newSpecPage<PopCountdown>({
      components: [PopCountdown],
      html: `<pop-countdown deadline="${deadline}"></pop-countdown>`,
    });
    page.rootInstance.connectedCallback();
    const done = vi.fn();
    page.root.addEventListener('popCountdownDone', done);
    vi.advanceTimersByTime(2000);
    await page.waitForChanges();
    expect(done).toHaveBeenCalledTimes(1);
    // Snooze: push the deadline out (prop set + @Watch, driven manually here)
    // → counts down again → fires again on the next cross.
    page.rootInstance.deadline = Date.now() + 3000;
    page.rootInstance.onDeadlineChange();
    await page.waitForChanges();
    expect(page.root.textContent).toContain('in 3s');
    vi.advanceTimersByTime(4000);
    await page.waitForChanges();
    expect(done).toHaveBeenCalledTimes(2);
    page.rootInstance.disconnectedCallback();
  });
});
