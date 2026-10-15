/**
 * Pure logic for pop-feedback-button — the two `FieldSpec`s it renders through
 * pop-field, page-context capture, submit-gating and response normalization.
 * No Stencil imports; unit-tested directly (same split as presenter-logic /
 * field-logic).
 */

import type { FieldSpec } from '../../molecules/field/field-logic';

// ── submission shapes ────────────────────────────────────────────────────────

/** The two categories the pipeline triages on (spec: required, no third value). */
export type FeedbackCategory = 'bug' | 'feature';

// ── placement ────────────────────────────────────────────────────────────────

/**
 * Where the TRIGGER sits. The four corners float it over the page (fixed to the
 * viewport, safe-area aware); `inline` renders an ordinary in-flow button for a
 * toolbar or a panel header. Placement is the HOST's decision, not the
 * organism's — a chat shell that floated it over its own transcript is exactly
 * the complaint that turned this into a prop.
 */
export type FeedbackPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'inline';

/** Whether `position` is one of the four FLOATING corners (i.e. not `inline`). */
export function isFloatingFeedbackPosition(position: string): boolean {
  return position !== 'inline';
}

/**
 * Silently-captured context about WHERE the feedback came from — the submitter
 * never types any of this. Mirrors `FeedbackToolArgs['pageContext']` in
 * `packages/bucket-bot/src/tools/feedback.ts` field-for-field.
 */
export interface FeedbackPageContext {
  url: string;
  app: string;
  version?: string;
  viewport?: { width: number; height: number };
  userAgent?: string;
}

/** The JSON body POSTed to `submitEndpoint`. */
export interface FeedbackSubmission {
  description: string;
  category: FeedbackCategory;
  /** Data URL of the optional tab capture — the endpoint uploads it to GCS. */
  screenshotDataUrl?: string;
  pageContext: FeedbackPageContext;
}

/** What the endpoint answers with, and what `popFeedbackSubmit` carries. */
export interface FeedbackSubmitResult {
  /** Absent on the QUEUED lane — the task doesn't exist yet. */
  taskId?: number | string;
  /** Absent on the QUEUED lane — the issue hasn't been filed yet. */
  forgejoIssueNumber?: number;
  /**
   * True when the submission was accepted for ASYNC intake rather than filed
   * outright: the app wrote to the `feedback` collection and the bot drains it
   * into a task + issue within a tick. There is nothing to link yet, so a host
   * should say "sent" rather than "filed as #N".
   *
   * Why this lane exists: the bot's hub API sits behind the tailnet / a
   * route-restricted Funnel, so apps whose users are off it (yugioh-app) can't
   * POST at all. A Firestore write needs no ingress.
   */
  queued?: boolean;
}

// ── field specs (rendered by pop-field — no new form primitives) ─────────────

/** `category` — required select; the only two values the pipeline triages on. */
export const FEEDBACK_CATEGORY_FIELD: FieldSpec = {
  key: 'category',
  label: 'Category',
  type: 'select',
  required: true,
  options: [
    { value: 'bug', label: '🐞 Bug' },
    { value: 'feature', label: '✨ Feature request' },
  ],
};

/** `description` — required free text ("what happened / what do you want"). */
export const FEEDBACK_DESCRIPTION_FIELD: FieldSpec = {
  key: 'description',
  label: 'What happened?',
  type: 'text',
  required: true,
  placeholder: 'Describe the bug or the feature you want…',
  hint: 'Repro steps and expected vs actual help a lot — the bot may ask follow-ups.',
};

/** Narrow an arbitrary field value to a category (anything else → undefined). */
export function toFeedbackCategory(value: unknown): FeedbackCategory | undefined {
  return value === 'bug' || value === 'feature' ? value : undefined;
}

// ── page context ─────────────────────────────────────────────────────────────

/**
 * Best-effort "which app am I in" when the host didn't set the `app` prop.
 * Order: `<html data-app>` → `<meta name="app">` → the hostname's first label
 * (`tasks.popcorn245.com` → `tasks`) → 'unknown'. Never throws in SSR/jsdom.
 */
export function detectApp(win?: Window & typeof globalThis): string {
  const w = win ?? (typeof window !== 'undefined' ? window : undefined);
  const doc = w?.document;
  const fromData = doc?.documentElement?.getAttribute('data-app');
  if (fromData) return fromData;
  const fromMeta = doc?.querySelector('meta[name="app"]')?.getAttribute('content');
  if (fromMeta) return fromMeta;
  const host = w?.location?.hostname || '';
  return host.split('.')[0] || 'unknown';
}

/** App version, if the shell advertises one (`<html data-app-version>` /
 *  `<meta name="app-version">`). Absent is fine — the field is optional. */
export function detectVersion(win?: Window & typeof globalThis): string | undefined {
  const w = win ?? (typeof window !== 'undefined' ? window : undefined);
  const doc = w?.document;
  return (
    doc?.documentElement?.getAttribute('data-app-version') ||
    doc?.querySelector('meta[name="app-version"]')?.getAttribute('content') ||
    undefined
  );
}

/**
 * Snapshot the page context at submit time. `appOverride` is the `app` prop —
 * when the host set it, it wins over detection (that is the whole point of the
 * prop); otherwise `detectApp` fills it in.
 */
export function capturePageContext(appOverride?: string, win?: Window & typeof globalThis): FeedbackPageContext {
  const w = win ?? (typeof window !== 'undefined' ? window : undefined);
  const ctx: FeedbackPageContext = {
    url: w?.location?.href || '',
    app: (appOverride || '').trim() || detectApp(w),
  };
  const version = detectVersion(w);
  if (version) ctx.version = version;
  if (w?.innerWidth != null && w?.innerHeight != null) {
    ctx.viewport = { width: w.innerWidth, height: w.innerHeight };
  }
  if (w?.navigator?.userAgent) ctx.userAgent = w.navigator.userAgent;
  return ctx;
}

// ── gating + response normalization ──────────────────────────────────────────

/** Both spec-required fields present → Submit enables. */
export function isFeedbackSubmittable(category: unknown, description: string): boolean {
  return !!toFeedbackCategory(category) && description.trim().length > 0;
}

/** Assemble the POST body (description trimmed, screenshot omitted when absent). */
export function buildFeedbackSubmission(input: {
  category: FeedbackCategory;
  description: string;
  screenshotDataUrl?: string;
  pageContext: FeedbackPageContext;
}): FeedbackSubmission {
  const body: FeedbackSubmission = {
    description: input.description.trim(),
    category: input.category,
    pageContext: input.pageContext,
  };
  if (input.screenshotDataUrl) body.screenshotDataUrl = input.screenshotDataUrl;
  return body;
}

/**
 * Normalize the endpoint's answer into the `popFeedbackSubmit` detail. Returns
 * null when the response doesn't carry both identifiers — the organism then
 * shows the error state rather than emitting a half-filled success event.
 * `taskId` stays `number | string` (Firestore ids are strings, the bot's
 * numeric ids are numbers); `forgejoIssueNumber` must be a real number.
 */
export function normalizeFeedbackResult(raw: unknown): FeedbackSubmitResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const taskId = r.taskId;
  const issue = Number(r.forgejoIssueNumber);
  const idOk = (typeof taskId === 'string' && taskId !== '') || (typeof taskId === 'number' && Number.isFinite(taskId));
  if (!idOk || !Number.isFinite(issue)) return null;
  return { taskId: taskId as number | string, forgejoIssueNumber: issue };
}
