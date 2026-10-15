import { newSpecPage } from '../../test-utils/spec-page';
import { PopFeedbackButton } from './feedback-button';
import {
  type FeedbackSubmitResult,
  FEEDBACK_CATEGORY_FIELD,
  FEEDBACK_DESCRIPTION_FIELD,
  buildFeedbackSubmission,
  capturePageContext,
  detectApp,
  isFeedbackSubmittable,
  isFloatingFeedbackPosition,
  normalizeFeedbackResult,
  toFeedbackCategory,
} from './feedback-button-logic';

describe('feedback-button-logic', () => {
  it('exposes exactly the two spec-required FieldSpecs', () => {
    expect(FEEDBACK_CATEGORY_FIELD.key).toBe('category');
    expect(FEEDBACK_CATEGORY_FIELD.type).toBe('select');
    expect(FEEDBACK_CATEGORY_FIELD.required).toBe(true);
    expect(FEEDBACK_CATEGORY_FIELD.options?.map((o) => o.value)).toEqual(['bug', 'feature']);
    expect(FEEDBACK_DESCRIPTION_FIELD.key).toBe('description');
    expect(FEEDBACK_DESCRIPTION_FIELD.required).toBe(true);
  });

  it('narrows category values', () => {
    expect(toFeedbackCategory('bug')).toBe('bug');
    expect(toFeedbackCategory('feature')).toBe('feature');
    expect(toFeedbackCategory('chore')).toBeUndefined();
    expect(toFeedbackCategory(undefined)).toBeUndefined();
  });

  it('gates submission on both required fields', () => {
    expect(isFeedbackSubmittable('bug', 'it broke')).toBe(true);
    expect(isFeedbackSubmittable('bug', '   ')).toBe(false);
    expect(isFeedbackSubmittable(undefined, 'it broke')).toBe(false);
  });

  it('detects the app from data-app, then meta, then hostname', () => {
    document.documentElement.setAttribute('data-app', 'bucket-hub');
    expect(detectApp()).toBe('bucket-hub');
    document.documentElement.removeAttribute('data-app');

    const meta = document.createElement('meta');
    meta.setAttribute('name', 'app');
    meta.setAttribute('content', 'tasks-app');
    document.head.appendChild(meta);
    expect(detectApp()).toBe('tasks-app');
    meta.remove();

    // jsdom's default location is http://localhost/
    expect(detectApp()).toBe('localhost');
  });

  it('captures page context, with the app prop overriding detection', () => {
    document.documentElement.setAttribute('data-app', 'bucket-hub');
    document.documentElement.setAttribute('data-app-version', '1.2.3');
    const ctx = capturePageContext('notes-app');
    expect(ctx.app).toBe('notes-app');
    expect(ctx.version).toBe('1.2.3');
    expect(ctx.url).toBe(window.location.href);
    expect(ctx.viewport).toEqual({ width: window.innerWidth, height: window.innerHeight });
    expect(ctx.userAgent).toBe(navigator.userAgent);

    expect(capturePageContext('').app).toBe('bucket-hub');
    document.documentElement.removeAttribute('data-app');
    document.documentElement.removeAttribute('data-app-version');
  });

  it('builds a trimmed submission and omits an absent screenshot', () => {
    const pageContext = { url: 'u', app: 'a' };
    const body = buildFeedbackSubmission({ category: 'bug', description: '  broke  ', pageContext });
    expect(body).toEqual({ description: 'broke', category: 'bug', pageContext });
    expect('screenshotDataUrl' in body).toBe(false);
    expect(
      buildFeedbackSubmission({ category: 'bug', description: 'x', screenshotDataUrl: 'data:,', pageContext })
        .screenshotDataUrl,
    ).toBe('data:,');
  });

  it('treats every corner as floating and inline as not', () => {
    for (const p of ['bottom-right', 'bottom-left', 'top-right', 'top-left']) {
      expect(isFloatingFeedbackPosition(p)).toBe(true);
    }
    expect(isFloatingFeedbackPosition('inline')).toBe(false);
  });

  it('normalizes only responses carrying BOTH identifiers', () => {
    expect(normalizeFeedbackResult({ taskId: 'abc', forgejoIssueNumber: 12 })).toEqual({
      taskId: 'abc',
      forgejoIssueNumber: 12,
    });
    expect(normalizeFeedbackResult({ taskId: 7, forgejoIssueNumber: '12' })).toEqual({
      taskId: 7,
      forgejoIssueNumber: 12,
    });
    expect(normalizeFeedbackResult({ taskId: '', forgejoIssueNumber: 12 })).toBeNull();
    expect(normalizeFeedbackResult({ taskId: 'abc' })).toBeNull();
    expect(normalizeFeedbackResult(null)).toBeNull();
  });
});

/** Open the presenter by clicking the trigger. */
async function openForm() {
  const page = await newSpecPage({
    components: [PopFeedbackButton],
    html: `<pop-feedback-button submit-endpoint="/api/hub/feedback"></pop-feedback-button>`,
  });
  (page.root.querySelector('.fb__trigger') as HTMLButtonElement).click();
  await page.waitForChanges();
  return page;
}

/** Fill both required fields through pop-field's `{key,value}` relay. */
async function fill(page: Awaited<ReturnType<typeof openForm>>) {
  const inst = page.rootInstance as PopFeedbackButton;
  inst['onFieldChange'](new CustomEvent('valueChange', { detail: { key: 'category', value: 'bug' } }));
  inst['onFieldChange'](new CustomEvent('valueChange', { detail: { key: 'description', value: 'calendar sync broke' } }));
  await page.waitForChanges();
}

describe('pop-feedback-button', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders an icon trigger and keeps the presenter closed until tapped', async () => {
    const page = await newSpecPage({
      components: [PopFeedbackButton],
      html: `<pop-feedback-button></pop-feedback-button>`,
    });
    const trigger = page.root.querySelector('.fb__trigger') as HTMLButtonElement;
    expect(trigger.getAttribute('type')).toBe('button');
    expect(trigger.querySelector('pop-icon')).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // (the harness skips false-valued vnode props, so `open` is simply not set)
    expect((page.root.querySelector('pop-presenter') as HTMLElement & { open?: boolean }).open).toBeFalsy();
  });

  it('composes presenter + two pop-fields + actions footer + async-view (no new form primitives)', async () => {
    const page = await openForm();
    const presenter = page.root.querySelector('pop-presenter') as HTMLElement & { open?: boolean; heading?: string };
    expect(presenter.open).toBe(true);
    expect(presenter.heading).toBe('Send feedback');
    const fields = page.root.querySelectorAll('pop-field');
    expect(fields).toHaveLength(2);
    expect(page.root.querySelector('pop-async-view')).not.toBeNull();
    const footer = page.root.querySelector('pop-actions-footer') as HTMLElement & { submitDisabled?: boolean };
    expect(footer.getAttribute('slot')).toBe('actions');
    // No native <form> — submission flows through popSubmit only.
    expect(page.root.querySelector('form')).toBeNull();
    // Both required fields empty → Submit disabled.
    expect(footer.submitDisabled).toBe(true);
  });

  it('enables Submit once category + description are set', async () => {
    const page = await openForm();
    const inst = page.rootInstance as PopFeedbackButton;
    expect(inst['submittable']).toBe(false);
    await fill(page);
    // (asserted on the gate itself — the harness never writes a false-valued
    // prop back onto the footer element)
    expect(inst['submittable']).toBe(true);
  });

  it('is submittable from a description alone — the select renders "Bug", so state must agree', async () => {
    // Regression: pop-field only prepends the empty "—" option for `optional`
    // specs. category is required, so the native select shows its first option
    // ("🐞 Bug") as selected. When state stayed `undefined` the form claimed a
    // category was chosen but Send stayed disabled forever, unless the user
    // happened to switch to Feature and back. Reported from a real phone.
    const page = await openForm();
    const inst = page.rootInstance as PopFeedbackButton;
    expect(inst['category']).toBe('bug');
    // Type ONLY a description — never touch the category, as the reporter did.
    inst['onFieldChange'](
      new CustomEvent('valueChange', {
        detail: { key: 'description', value: 'the feedback button floats over the middle' },
      }),
    );
    await page.waitForChanges();
    expect(inst['submittable']).toBe(true);
  });

  it('blocks an empty submit with inline Required marking instead of POSTing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const page = await openForm();
    await (page.rootInstance as PopFeedbackButton)['submit']();
    await page.waitForChanges();
    expect(fetchMock).not.toHaveBeenCalled();
    const invalid = Array.from(page.root.querySelectorAll('pop-field')).filter(
      (f) => (f as HTMLElement & { invalid?: boolean }).invalid,
    );
    // Only `description` — `category` is pre-seeded to the 'bug' the select
    // already displays, so marking it Required would contradict the UI.
    expect(invalid).toHaveLength(1);
  });

  it('POSTs the payload with page context and emits popFeedbackSubmit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ taskId: 'task-1', forgejoIssueNumber: 42 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const page = await openForm();
    const emitted: unknown[] = [];
    page.root.addEventListener('popFeedbackSubmit', (e) => emitted.push((e as CustomEvent).detail));

    await fill(page);
    await (page.rootInstance as PopFeedbackButton)['submit']();
    await page.waitForChanges();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/hub/feedback');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.category).toBe('bug');
    expect(body.description).toBe('calendar sync broke');
    expect(body.pageContext.url).toBe(window.location.href);
    expect(body.pageContext.app).toBeTruthy();
    expect(emitted).toEqual([{ taskId: 'task-1', forgejoIssueNumber: 42 }]);
    // Closes + resets on success.
    const inst = page.rootInstance as PopFeedbackButton;
    expect(inst['open']).toBe(false);
    expect(inst['description']).toBe('');
    // Reset returns category to the displayed default, not to unset.
    expect(inst['category']).toBe('bug');
  });

  it('surfaces a failed submission through pop-async-view and emits nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    const page = await openForm();
    const emitted: unknown[] = [];
    page.root.addEventListener('popFeedbackSubmit', (e) => emitted.push(e));

    await fill(page);
    await (page.rootInstance as PopFeedbackButton)['submit']();
    await page.waitForChanges();

    const view = page.root.querySelector('pop-async-view') as HTMLElement & { state?: string; errorLabel?: string };
    expect(view.state).toBe('error');
    expect(view.errorLabel).toContain('500');
    expect(emitted).toHaveLength(0);
    // The form stays open so the user can retry without retyping.
    const inst = page.rootInstance as PopFeedbackButton;
    expect(inst['open']).toBe(true);
    expect(inst['description']).toBe('calendar sync broke');
  });

  it('rejects a 200 response missing the issue number (no half-filled success event)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ taskId: 'task-1' }) }));
    const page = await openForm();
    const emitted: unknown[] = [];
    page.root.addEventListener('popFeedbackSubmit', (e) => emitted.push(e));
    await fill(page);
    await (page.rootInstance as PopFeedbackButton)['submit']();
    await page.waitForChanges();
    expect(emitted).toHaveLength(0);
    expect((page.root.querySelector('pop-async-view') as HTMLElement & { state?: string }).state).toBe('error');
  });

  it('offers screenshot capture and stays submittable when capture is unavailable', async () => {
    const page = await openForm();
    expect(page.root.querySelector('.fb__shot-capture')).not.toBeNull();
    // jsdom has no navigator.mediaDevices → the control notes it and skips.
    await (page.rootInstance as PopFeedbackButton)['capture']();
    await page.waitForChanges();
    expect(page.root.querySelector('.fb__shot-note')?.textContent).toContain('not available');
    await fill(page);
    expect((page.rootInstance as PopFeedbackButton)['submittable']).toBe(true);
  });

  it('floats in the bottom-right corner by DEFAULT', async () => {
    const page = await newSpecPage({
      components: [PopFeedbackButton],
      html: `<pop-feedback-button></pop-feedback-button>`,
    });
    expect((page.rootInstance as PopFeedbackButton).position).toBe('bottom-right');
    // The placement classes ride the host; `--floating` is what the CSS hangs
    // `position: fixed` + `display: contents` off.
    expect(page.root.classList.contains('fb--bottom-right')).toBe(true);
    expect(page.root.classList.contains('fb--floating')).toBe(true);
  });

  it('accepts each of the four corners', async () => {
    for (const corner of ['bottom-right', 'bottom-left', 'top-right', 'top-left']) {
      const page = await newSpecPage({
        components: [PopFeedbackButton],
        html: `<pop-feedback-button position="${corner}"></pop-feedback-button>`,
      });
      expect(page.root.classList.contains(`fb--${corner}`)).toBe(true);
      expect(page.root.classList.contains('fb--floating')).toBe(true);
    }
  });

  it('renders position="inline" WITHOUT the fixed-positioning hook', async () => {
    // The whole point of the prop: an inline trigger sits in the flow of a
    // toolbar / panel header and never overlays what's behind it (bucket-hub's
    // floating dock covered the chat transcript on phones).
    const page = await newSpecPage({
      components: [PopFeedbackButton],
      html: `<pop-feedback-button position="inline" label="New feedback"></pop-feedback-button>`,
    });
    expect(page.root.classList.contains('fb--inline')).toBe(true);
    expect(page.root.classList.contains('fb--floating')).toBe(false);
    // …and it's still the same trigger, opening the same composed form.
    (page.root.querySelector('.fb__trigger') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect((page.root.querySelector('pop-presenter') as HTMLElement & { open?: boolean }).open).toBe(true);
  });

  it('forwards the presenter tier to the actions footer', async () => {
    const page = await openForm();
    (page.rootInstance as PopFeedbackButton)['onTierChange'](new CustomEvent('tierChange', { detail: 'sheet' }));
    await page.waitForChanges();
    expect((page.root.querySelector('pop-actions-footer') as HTMLElement & { tier?: string }).tier).toBe('sheet');
  });

  // ── injected submitter (the Firestore lane) ────────────────────────────────
  // Apps whose users are off the tailnet cannot POST to the bot at all, so they
  // inject their own submit. These pin that the organism never falls back to
  // fetch when one is supplied.
  describe('submitter', () => {
    async function openWith(submitter: PopFeedbackButton['submitter']) {
      const page = await newSpecPage({
        components: [PopFeedbackButton],
        html: `<pop-feedback-button></pop-feedback-button>`,
      });
      (page.rootInstance as PopFeedbackButton).submitter = submitter;
      (page.root.querySelector('.fb__trigger') as HTMLButtonElement).click();
      await page.waitForChanges();
      await fill(page);
      return page;
    }

    it('uses the injected submitter and never touches fetch', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const calls: unknown[] = [];
      const page = await openWith(async (body) => {
        calls.push(body);
      });

      await (page.rootInstance as PopFeedbackButton)['submit']();
      await page.waitForChanges();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ category: 'bug', description: 'calendar sync broke' });
    });

    it('emits queued:true when the submitter returns nothing', async () => {
      const events: FeedbackSubmitResult[] = [];
      const page = await openWith(async () => {});
      page.root.addEventListener('popFeedbackSubmit', (e: Event) =>
        events.push((e as CustomEvent<FeedbackSubmitResult>).detail),
      );

      await (page.rootInstance as PopFeedbackButton)['submit']();
      await page.waitForChanges();

      expect(events).toEqual([{ queued: true }]);
      // Queued still counts as sent: the form closes so the user isn't left
      // staring at their text wondering whether it went.
      expect((page.rootInstance as PopFeedbackButton)['open']).toBe(false);
    });

    it('passes a returned result straight through', async () => {
      const events: FeedbackSubmitResult[] = [];
      const page = await openWith(async () => ({ taskId: 't1', forgejoIssueNumber: 9 }));
      page.root.addEventListener('popFeedbackSubmit', (e: Event) =>
        events.push((e as CustomEvent<FeedbackSubmitResult>).detail),
      );

      await (page.rootInstance as PopFeedbackButton)['submit']();
      await page.waitForChanges();

      expect(events).toEqual([{ taskId: 't1', forgejoIssueNumber: 9 }]);
    });

    it('keeps the form open with the text intact when the submitter throws', async () => {
      const page = await openWith(async () => {
        throw new Error('offline');
      });

      await (page.rootInstance as PopFeedbackButton)['submit']();
      await page.waitForChanges();

      const inst = page.rootInstance as PopFeedbackButton;
      expect(inst['error']).toBe('offline');
      expect(inst['open']).toBe(true);
      expect(inst['description']).toBe('calendar sync broke'); // never lost
    });
  });
});
