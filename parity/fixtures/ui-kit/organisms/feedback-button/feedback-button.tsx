import { Component, Prop, State, Event, EventEmitter, Host, h } from '@stencil/core';
import type { PresenterTier } from '../presenter/presenter-logic';
import {
  type FeedbackCategory,
  type FeedbackPosition,
  type FeedbackSubmission,
  type FeedbackSubmitResult,
  FEEDBACK_CATEGORY_FIELD,
  FEEDBACK_DESCRIPTION_FIELD,
  buildFeedbackSubmission,
  capturePageContext,
  isFeedbackSubmittable,
  isFloatingFeedbackPosition,
  normalizeFeedbackResult,
  toFeedbackCategory,
} from './feedback-button-logic';

/**
 * pop-feedback-button — the "report a bug / request a feature" trigger
 * (organism) for the feedback pipeline.
 *
 * It is a TRIGGER, not a form primitive: everything below the button is
 * composed from the feature-surface set, so this file adds no new form UI —
 *
 *   pop-presenter      → the sheet/dialog/dock tiering (used as-is: `open` +
 *                        `heading` in, `tierChange`/`popClose` out; the
 *                        resolved tier is forwarded to the footer's `tier`)
 *   pop-field   ×2     → `category` (required select) and `description`
 *                        (required text), one FieldSpec each
 *   pop-actions-footer → Cancel/Submit + the `busy` spinner, driven by
 *                        `popSubmit`/`popCancel` — NEVER a native form submit
 *   pop-async-view     → loading/error while the submission is in flight
 *
 * The only genuinely new UI is the trigger itself and the screenshot control
 * (`getDisplayMedia()` tab capture — no existing composable does that).
 *
 * Page context (url, app, version, viewport, userAgent) is captured silently at
 * submit time — zero user effort, per the submitter journey.
 *
 * Inner events from the composed children are stopped at this boundary and only
 * `popFeedbackSubmit` leaves the organism, so a host listening on the document
 * can't mistake the form's `popSubmit`/`popClose` for its own.
 *
 * PLACEMENT is the host's call (`position`): one of four fixed viewport corners
 * or `inline` for a toolbar / panel header. See feedback-button.css and the
 * readme for the two `--pop-feedback-x` / `--pop-feedback-y` gutter overrides.
 */
@Component({
  tag: 'pop-feedback-button',
  encapsulation: { type: 'scoped' },
  styleUrl: 'feedback-button.css',
})
export class PopFeedbackButton {
  /** Which app is submitting. Defaults to the auto-captured page context
   *  (`<html data-app>` / `<meta name="app">` / hostname); set it to override. */
  @Prop() app = '';
  /** Where the submission POSTs. A prop (not a constant) so the organism can be
   *  dropped into a non-bucket-hub shell later without a hardcoded target. */
  @Prop() submitEndpoint = '/api/hub/feedback';
  /** Trigger label. Empty renders an icon-only square hit area. */
  @Prop() label = 'Feedback';
  /** Trigger ionicon (pop-icon name). */
  @Prop() icon = 'megaphone-outline';
  /** Presenter heading. */
  @Prop() heading = 'Send feedback';
  /** Bearer token for the submission POST, sent as an `Authorization` header.
   *  Hosts that authenticate with cookies can leave this empty — `credentials`
   *  already carries them. Prefer this over a `?token=` on `submitEndpoint`:
   *  query strings land in server access logs and `Referer` headers, and a POST
   *  can set a header, unlike an `<img src>`. */
  @Prop() authToken = '';
  /**
   * Injected submit. When set it REPLACES the `fetch` entirely — the organism
   * never touches `submitEndpoint`/`authToken` — so a host can submit however it
   * likes (the Firestore `feedback` collection, an app-specific client, a test
   * double) without ui-kit ever importing Firebase. Same injected-dependency
   * shape as `pop-user-select`'s resolver.
   *
   * Return a `FeedbackSubmitResult` when the task/issue are already known
   * (synchronous filing); return nothing when the submission was merely QUEUED
   * for async intake — the organism then emits `{ queued: true }` so the host
   * can say "sent" instead of inventing an issue number.
   *
   * Throw to surface an error: the message is shown in the form and the report
   * is NOT lost — the presenter stays open with the user's text intact.
   */
  @Prop() submitter?: (
    body: FeedbackSubmission,
  ) => Promise<FeedbackSubmitResult | void> | FeedbackSubmitResult | void;
  /** Where the TRIGGER sits: one of the four viewport corners (fixed, floating,
   *  safe-area aware) or `'inline'` for an in-flow button in a toolbar / panel
   *  header. Nudge a floating trigger with `--pop-feedback-x` /
   *  `--pop-feedback-y` (gutters from the chosen corner, default `1rem`). */
  @Prop() position: FeedbackPosition = 'bottom-right';

  /** Fired after a successful submission, for hosts that want a toast. */
  @Event() popFeedbackSubmit!: EventEmitter<FeedbackSubmitResult>;

  @State() private open = false;
  @State() private tier: PresenterTier = 'dialog';
  @State() private category?: FeedbackCategory;
  @State() private description = '';
  @State() private screenshotDataUrl?: string;
  @State() private capturing = false;
  @State() private captureNote = '';
  @State() private submitting = false;
  @State() private error = '';
  /** Owner-driven inline "Required" feedback — only after a blocked submit. */
  @State() private showInvalid = false;

  // ── open / close ────────────────────────────────────────────────────────────

  private openForm = () => {
    this.resetForm();
    this.open = true;
  };

  private resetForm() {
    // Seed the category to match what the select actually RENDERS. pop-field
    // only prepends the empty "—" option for `optional` specs, and this one is
    // required — so a native select shows its first option ("🐞 Bug") as
    // selected. Leaving state `undefined` there made the UI say "Bug" while
    // submit-gating saw nothing chosen, disabling Send with no way out except
    // switching to Feature and back. Displayed value and state must agree.
    this.category = 'bug';
    this.description = '';
    this.screenshotDataUrl = undefined;
    this.captureNote = '';
    this.error = '';
    this.showInvalid = false;
    this.submitting = false;
  }

  /** Presenter/footer dismissal. Inner events bubble (Stencil default), so stop
   *  them here — only `popFeedbackSubmit` is this organism's public surface. */
  private close = (ev?: Event) => {
    ev?.stopPropagation();
    if (this.submitting) return; // don't drop a request the user can't see
    this.open = false;
  };

  private onTierChange = (ev: CustomEvent<PresenterTier>) => {
    ev.stopPropagation();
    this.tier = ev.detail;
  };

  // ── fields (pop-field relays `{ key, value }`) ──────────────────────────────

  private onFieldChange = (ev: CustomEvent<{ key: string; value: unknown }>) => {
    ev.stopPropagation();
    const { key, value } = ev.detail || ({} as { key: string; value: unknown });
    if (key === FEEDBACK_CATEGORY_FIELD.key) this.category = toFeedbackCategory(value);
    else if (key === FEEDBACK_DESCRIPTION_FIELD.key) this.description = typeof value === 'string' ? value : '';
    if (this.showInvalid && this.submittable) this.showInvalid = false;
  };

  private get submittable(): boolean {
    return isFeedbackSubmittable(this.category, this.description);
  }

  // ── screenshot capture (the one bespoke control) ────────────────────────────

  /** Grab a single frame from a getDisplayMedia stream as a PNG data URL, then
   *  stop the tracks (leaving them live keeps the browser's "sharing" bar up). */
  private async captureFrame(stream: MediaStream): Promise<string> {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    try {
      await video.play();
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) return resolve();
        video.addEventListener('loadeddata', () => resolve(), { once: true });
      });
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } finally {
      video.pause();
      video.srcObject = null;
      for (const track of stream.getTracks()) track.stop();
    }
  }

  private capture = async () => {
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!media?.getDisplayMedia) {
      this.captureNote = 'Screen capture is not available in this browser.';
      return;
    }
    this.capturing = true;
    this.captureNote = '';
    try {
      const stream = await media.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false });
      this.screenshotDataUrl = await this.captureFrame(stream);
    } catch {
      // Dismissing the picker rejects — that is a skip, not a failure. The
      // screenshot is optional and must never block submission.
      this.captureNote = 'No screenshot captured.';
    } finally {
      this.capturing = false;
    }
  };

  private clearShot = () => {
    this.screenshotDataUrl = undefined;
    this.captureNote = '';
  };

  // ── submit ──────────────────────────────────────────────────────────────────

  private submit = async (ev?: Event) => {
    ev?.stopPropagation();
    if (this.submitting) return;
    if (!this.submittable) {
      this.showInvalid = true;
      return;
    }
    this.submitting = true;
    this.error = '';
    try {
      const body = buildFeedbackSubmission({
        category: this.category as FeedbackCategory,
        description: this.description,
        screenshotDataUrl: this.screenshotDataUrl,
        pageContext: capturePageContext(this.app),
      });
      let result: FeedbackSubmitResult;
      if (this.submitter) {
        // Injected lane: the host owns transport. No result means "queued" —
        // the bot's drain will create the task and file the issue shortly, so
        // there is deliberately nothing to link yet.
        result = (await this.submitter(body)) || { queued: true };
      } else {
        const res = await fetch(this.submitEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
          },
          credentials: 'same-origin',
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Submission failed (${res.status})`);
        const normalized = normalizeFeedbackResult(await res.json());
        if (!normalized) throw new Error('Submission did not return a task and issue.');
        result = normalized;
      }
      this.popFeedbackSubmit.emit(result);
      this.open = false;
      this.resetForm();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Submission failed.';
    } finally {
      this.submitting = false;
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  private viewState(): 'loading' | 'error' | 'content' {
    if (this.submitting) return 'loading';
    if (this.error) return 'error';
    return 'content';
  }

  private renderScreenshot() {
    return (
      <div class="fb__shot">
        <span class="fb__shot-label">Screenshot (optional)</span>
        {this.screenshotDataUrl ? (
          <div class="fb__shot-preview">
            <img class="fb__shot-img" src={this.screenshotDataUrl} alt="Captured screenshot" />
            <button type="button" class="fb__icon-btn" aria-label="Remove screenshot" onClick={this.clearShot}>
              <pop-icon name="close" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            class="fb__shot-capture"
            disabled={this.capturing}
            aria-busy={this.capturing ? 'true' : null}
            onClick={this.capture}
          >
            <pop-icon name="camera-outline" />
            <span>{this.capturing ? 'Capturing…' : 'Capture this tab'}</span>
          </button>
        )}
        {this.captureNote && <span class="fb__shot-note">{this.captureNote}</span>}
      </div>
    );
  }

  render() {
    const invalidCategory = this.showInvalid && !this.category;
    const invalidDescription = this.showInvalid && !this.description.trim();
    const floating = isFloatingFeedbackPosition(this.position);
    return (
      // The placement class rides the HOST: floating corners take the host out
      // of flow entirely (display: contents) so dropping the organism into a
      // layout can never shove its neighbours around, which is what the chat
      // shell's zero-height dock hack used to work around.
      <Host class={{ [`fb--${this.position}`]: true, 'fb--floating': floating }}>
        <button
          type="button"
          class={{ fb__trigger: true, 'fb__trigger--icon-only': !this.label }}
          aria-haspopup="dialog"
          aria-expanded={this.open ? 'true' : 'false'}
          aria-label={this.label || this.heading}
          onClick={this.openForm}
        >
          <pop-icon name={this.icon} />
          {this.label && <span class="fb__trigger-label">{this.label}</span>}
        </button>

        <pop-presenter
          open={this.open}
          heading={this.heading}
          onTierChange={this.onTierChange}
          onPopClose={this.close}
        >
          <pop-async-view
            state={this.viewState()}
            errorLabel={this.error || 'Submission failed'}
            retryLabel="Try again"
            onPopRetry={this.submit}
          >
            <div slot="loading">
              <pop-loading-state variant="spinner" label="Filing your feedback…" />
            </div>
            <div class="fb__form">
              <pop-field
                spec={FEEDBACK_CATEGORY_FIELD}
                value={this.category || ''}
                invalid={invalidCategory}
                disabled={this.submitting}
                onValueChange={this.onFieldChange}
              />
              <pop-field
                spec={FEEDBACK_DESCRIPTION_FIELD}
                value={this.description}
                invalid={invalidDescription}
                disabled={this.submitting}
                onValueChange={this.onFieldChange}
              />
              {this.renderScreenshot()}
            </div>
          </pop-async-view>

          <pop-actions-footer
            slot="actions"
            tier={this.tier}
            submitLabel="Send feedback"
            submitDisabled={!this.submittable}
            busy={this.submitting}
            onPopSubmit={this.submit}
            onPopCancel={this.close}
          />
        </pop-presenter>
      </Host>
    );
  }
}
