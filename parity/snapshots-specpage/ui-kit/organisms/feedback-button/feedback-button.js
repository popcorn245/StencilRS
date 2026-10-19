import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
import { FEEDBACK_CATEGORY_FIELD, FEEDBACK_DESCRIPTION_FIELD, buildFeedbackSubmission, capturePageContext, isFeedbackSubmittable, isFloatingFeedbackPosition, normalizeFeedbackResult, toFeedbackCategory, } from './feedback-button-logic';
export const PopFeedbackButton = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popFeedbackSubmit = __stencil_createEvent(this, "popFeedbackSubmit", 7);
    }
    /** Which app is submitting. Defaults to the auto-captured page context
     *  (`<html data-app>` / `<meta name="app">` / hostname); set it to override. */
    app = '';
    /** Where the submission POSTs. A prop (not a constant) so the organism can be
     *  dropped into a non-bucket-hub shell later without a hardcoded target. */
    submitEndpoint = '/api/hub/feedback';
    /** Trigger label. Empty renders an icon-only square hit area. */
    label = 'Feedback';
    /** Trigger ionicon (pop-icon name). */
    icon = 'megaphone-outline';
    /** Presenter heading. */
    heading = 'Send feedback';
    /** Bearer token for the submission POST, sent as an `Authorization` header.
     *  Hosts that authenticate with cookies can leave this empty — `credentials`
     *  already carries them. Prefer this over a `?token=` on `submitEndpoint`:
     *  query strings land in server access logs and `Referer` headers, and a POST
     *  can set a header, unlike an `<img src>`. */
    authToken = '';
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
    submitter;
    /** Where the TRIGGER sits: one of the four viewport corners (fixed, floating,
     *  safe-area aware) or `'inline'` for an in-flow button in a toolbar / panel
     *  header. Nudge a floating trigger with `--pop-feedback-x` /
     *  `--pop-feedback-y` (gutters from the chosen corner, default `1rem`). */
    position = 'bottom-right';
    /** Fired after a successful submission, for hosts that want a toast. */
    popFeedbackSubmit;
    open = false;
    tier = 'dialog';
    category;
    description = '';
    screenshotDataUrl;
    capturing = false;
    captureNote = '';
    submitting = false;
    error = '';
    /** Owner-driven inline "Required" feedback — only after a blocked submit. */
    showInvalid = false;
    // ── open / close ────────────────────────────────────────────────────────────
    openForm = () => {
        this.resetForm();
        this.open = true;
    };
    resetForm() {
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
    close = (ev) => {
        ev?.stopPropagation();
        if (this.submitting)
            return; // don't drop a request the user can't see
        this.open = false;
    };
    onTierChange = (ev) => {
        ev.stopPropagation();
        this.tier = ev.detail;
    };
    // ── fields (pop-field relays `{ key, value }`) ──────────────────────────────
    onFieldChange = (ev) => {
        ev.stopPropagation();
        const { key, value } = ev.detail || {};
        if (key === FEEDBACK_CATEGORY_FIELD.key)
            this.category = toFeedbackCategory(value);
        else if (key === FEEDBACK_DESCRIPTION_FIELD.key)
            this.description = typeof value === 'string' ? value : '';
        if (this.showInvalid && this.submittable)
            this.showInvalid = false;
    };
    get submittable() {
        return isFeedbackSubmittable(this.category, this.description);
    }
    // ── screenshot capture (the one bespoke control) ────────────────────────────
    /** Grab a single frame from a getDisplayMedia stream as a PNG data URL, then
     *  stop the tracks (leaving them live keeps the browser's "sharing" bar up). */
    async captureFrame(stream) {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        try {
            await video.play();
            await new Promise((resolve) => {
                if (video.readyState >= 2)
                    return resolve();
                video.addEventListener('loadeddata', () => resolve(), { once: true });
            });
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/png');
        }
        finally {
            video.pause();
            video.srcObject = null;
            for (const track of stream.getTracks())
                track.stop();
        }
    }
    capture = async () => {
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
        }
        catch {
            // Dismissing the picker rejects — that is a skip, not a failure. The
            // screenshot is optional and must never block submission.
            this.captureNote = 'No screenshot captured.';
        }
        finally {
            this.capturing = false;
        }
    };
    clearShot = () => {
        this.screenshotDataUrl = undefined;
        this.captureNote = '';
    };
    // ── submit ──────────────────────────────────────────────────────────────────
    submit = async (ev) => {
        ev?.stopPropagation();
        if (this.submitting)
            return;
        if (!this.submittable) {
            this.showInvalid = true;
            return;
        }
        this.submitting = true;
        this.error = '';
        try {
            const body = buildFeedbackSubmission({
                category: this.category,
                description: this.description,
                screenshotDataUrl: this.screenshotDataUrl,
                pageContext: capturePageContext(this.app),
            });
            let result;
            if (this.submitter) {
                // Injected lane: the host owns transport. No result means "queued" —
                // the bot's drain will create the task and file the issue shortly, so
                // there is deliberately nothing to link yet.
                result = (await this.submitter(body)) || { queued: true };
            }
            else {
                const res = await fetch(this.submitEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify(body),
                });
                if (!res.ok)
                    throw new Error(`Submission failed (${res.status})`);
                const normalized = normalizeFeedbackResult(await res.json());
                if (!normalized)
                    throw new Error('Submission did not return a task and issue.');
                result = normalized;
            }
            this.popFeedbackSubmit.emit(result);
            this.open = false;
            this.resetForm();
        }
        catch (err) {
            this.error = err instanceof Error ? err.message : 'Submission failed.';
        }
        finally {
            this.submitting = false;
        }
    };
    // ── render ──────────────────────────────────────────────────────────────────
    viewState() {
        if (this.submitting)
            return 'loading';
        if (this.error)
            return 'error';
        return 'content';
    }
    renderScreenshot() {
        return (h("div", { class: "fb__shot" },
            h("span", { class: "fb__shot-label" }, "Screenshot (optional)"),
            this.screenshotDataUrl ? (h("div", { class: "fb__shot-preview" },
                h("img", { class: "fb__shot-img", src: this.screenshotDataUrl, alt: "Captured screenshot" }),
                h("button", { type: "button", class: "fb__icon-btn", "aria-label": "Remove screenshot", onClick: this.clearShot },
                    h("pop-icon", { name: "close" })))) : (h("button", { type: "button", class: "fb__shot-capture", disabled: this.capturing, "aria-busy": this.capturing ? 'true' : null, onClick: this.capture },
                h("pop-icon", { name: "camera-outline" }),
                h("span", null, this.capturing ? 'Capturing…' : 'Capture this tab'))),
            this.captureNote && h("span", { class: "fb__shot-note" }, this.captureNote)));
    }
    render() {
        const invalidCategory = this.showInvalid && !this.category;
        const invalidDescription = this.showInvalid && !this.description.trim();
        const floating = isFloatingFeedbackPosition(this.position);
        return (h(Host, { key: '0', class: { [`fb--${this.position}`]: true, 'fb--floating': floating } },
            h("button", { key: '1', type: "button", class: { fb__trigger: true, 'fb__trigger--icon-only': !this.label }, "aria-haspopup": "dialog", "aria-expanded": this.open ? 'true' : 'false', "aria-label": this.label || this.heading, onClick: this.openForm },
                h("pop-icon", { key: '2', name: this.icon }),
                this.label && h("span", { key: '3', class: "fb__trigger-label" }, this.label)),
            h("pop-presenter", { key: '4', open: this.open, heading: this.heading, onTierChange: this.onTierChange, onPopClose: this.close },
                h("pop-async-view", { key: '5', state: this.viewState(), errorLabel: this.error || 'Submission failed', retryLabel: "Try again", onPopRetry: this.submit },
                    h("div", { key: '6', slot: "loading" },
                        h("pop-loading-state", { key: '7', variant: "spinner", label: "Filing your feedback\u2026" })),
                    h("div", { key: '8', class: "fb__form" },
                        h("pop-field", { key: '9', spec: FEEDBACK_CATEGORY_FIELD, value: this.category || '', invalid: invalidCategory, disabled: this.submitting, onValueChange: this.onFieldChange }),
                        h("pop-field", { key: 'a', spec: FEEDBACK_DESCRIPTION_FIELD, value: this.description, invalid: invalidDescription, disabled: this.submitting, onValueChange: this.onFieldChange }),
                        this.renderScreenshot())),
                h("pop-actions-footer", { key: 'b', slot: "actions", tier: this.tier, submitLabel: "Send feedback", submitDisabled: !this.submittable, busy: this.submitting, onPopSubmit: this.submit, onPopCancel: this.close }))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-feedback-button",
        "componentClassName": "PopFeedbackButton",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "app",
                "type": "string",
                "attribute": "app",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Which app is submitting. Defaults to the auto-captured page context\n(`<html data-app>` / `<meta name=\"app\">` / hostname); set it to override."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "submitEndpoint",
                "type": "string",
                "attribute": "submit-endpoint",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'/api/hub/feedback'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Where the submission POSTs. A prop (not a constant) so the organism can be\ndropped into a non-bucket-hub shell later without a hardcoded target."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "label",
                "type": "string",
                "attribute": "label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Feedback'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Trigger label. Empty renders an icon-only square hit area."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "icon",
                "type": "string",
                "attribute": "icon",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'megaphone-outline'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Trigger ionicon (pop-icon name)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "heading",
                "type": "string",
                "attribute": "heading",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Send feedback'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Presenter heading."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "authToken",
                "type": "string",
                "attribute": "auth-token",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Bearer token for the submission POST, sent as an `Authorization` header.\nHosts that authenticate with cookies can leave this empty \u2014 `credentials`\nalready carries them. Prefer this over a `?token=` on `submitEndpoint`:\nquery strings land in server access logs and `Referer` headers, and a POST\ncan set a header, unlike an `<img src>`."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "submitter",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "(\n    body: FeedbackSubmission,\n  ) => Promise<FeedbackSubmitResult | void> | FeedbackSubmitResult | void",
                    "resolved": "((body: FeedbackSubmission) => any) | undefined",
                    "references": {
                        "FeedbackSubmission": {
                            "location": "global",
                            "id": "global::FeedbackSubmission"
                        },
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "FeedbackSubmitResult": {
                            "location": "global",
                            "id": "global::FeedbackSubmitResult"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Injected submit. When set it REPLACES the `fetch` entirely \u2014 the organism\nnever touches `submitEndpoint`/`authToken` \u2014 so a host can submit however it\nlikes (the Firestore `feedback` collection, an app-specific client, a test\ndouble) without ui-kit ever importing Firebase. Same injected-dependency\nshape as `pop-user-select`'s resolver.\n\nReturn a `FeedbackSubmitResult` when the task/issue are already known\n(synchronous filing); return nothing when the submission was merely QUEUED\nfor async intake \u2014 the organism then emits `{ queued: true }` so the host\ncan say \"sent\" instead of inventing an issue number.\n\nThrow to surface an error: the message is shown in the form and the report\nis NOT lost \u2014 the presenter stays open with the user's text intact."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "position",
                "type": "any",
                "attribute": "position",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'bottom-right'",
                "complexType": {
                    "original": "FeedbackPosition",
                    "resolved": "FeedbackPosition",
                    "references": {
                        "FeedbackPosition": {
                            "location": "global",
                            "id": "global::FeedbackPosition"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Where the TRIGGER sits: one of the four viewport corners (fixed, floating,\nsafe-area aware) or `'inline'` for an in-flow button in a toolbar / panel\nheader. Nudge a floating trigger with `--pop-feedback-x` /\n`--pop-feedback-y` (gutters from the chosen corner, default `1rem`)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "open"
            }, {
                "name": "tier"
            }, {
                "name": "category"
            }, {
                "name": "description"
            }, {
                "name": "screenshotDataUrl"
            }, {
                "name": "capturing"
            }, {
                "name": "captureNote"
            }, {
                "name": "submitting"
            }, {
                "name": "error"
            }, {
                "name": "showInvalid"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popFeedbackSubmit",
                "method": "popFeedbackSubmit",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fired after a successful submission, for hosts that want a toast."
                },
                "complexType": {
                    "original": "FeedbackSubmitResult",
                    "resolved": "FeedbackSubmitResult",
                    "references": {
                        "FeedbackSubmitResult": {
                            "location": "global",
                            "id": "global::FeedbackSubmitResult"
                        }
                    }
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-FEEDBACK-BUTTON",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/feedback-button/feedback-button.css",
                        "relativePath": "feedback-button.css",
                        "originalComponentPath": "feedback-button.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": false,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["class", "src", "alt", "type", "aria-label", "onClick", "name", "disabled", "aria-busy", "key", "aria-haspopup", "aria-expanded", "open", "heading", "onTierChange", "onPopClose", "state", "errorLabel", "retryLabel", "onPopRetry", "slot", "variant", "label", "spec", "value", "invalid", "onValueChange", "tier", "submitLabel", "submitDisabled", "busy", "onPopSubmit", "onPopCancel"],
        "htmlTagNames": ["video", "canvas", "div", "span", "img", "button", "pop-icon", "pop-presenter", "pop-async-view", "pop-loading-state", "pop-field", "pop-actions-footer"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
};
//# sourceMappingURL=feedback-button.js.map