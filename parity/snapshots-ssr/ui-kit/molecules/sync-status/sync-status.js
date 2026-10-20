import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopSyncStatusStyle0 from "./ui-kit/molecules/sync-status/sync-status.css?tag=pop-sync-status&encapsulation=scoped";
/**
 * pop-sync-status — a compact "Last synced <relative>" row + a refresh button,
 * for cache-first / stale-while-revalidate data panels. The relative label
 * auto-updates on an internal ~30s timer; the refresh icon spins while loading.
 *
 * Reusable: any panel that caches data can drop this in, pass its last-fetch
 * `syncedAt` + `loading`, and listen for `popRefresh` to force a revalidate.
 */
export class PopSyncStatus {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popRefresh = __stencil_createEvent(this, "popRefresh", 7);
    }
    /** Last successful fetch time — epoch ms or an ISO string. */
    syncedAt;
    /** True while a refresh is in flight (spins the icon, disables the button). */
    loading = false;
    /** Bare/inline variant: one chrome-less button — relative time as the label +
     *  the refresh icon, no background. For placing in a panel header top-right. */
    bare = false;
    /**
     * Render the STALENESS LABEL ONLY — no refresh button, nothing clickable.
     *
     * For surfaces that keep "Nm ago" visible in a header but have moved the
     * manual refresh action somewhere else (the bucket-hub panel contract puts it
     * in the panel's `…` overflow menu). Splitting them keeps ONE component
     * owning the ~30s auto-updating relative label, instead of a second
     * implementation of that timer next to a standalone refresh button.
     */
    labelOnly = false;
    /** Tick to re-render the relative label as time passes. */
    tick = 0;
    timer;
    connectedCallback() {
        // Re-render every 30s so "just now" → "1m ago" without a prop change.
        this.timer = setInterval(() => { this.tick++; }, 30_000);
    }
    disconnectedCallback() {
        if (this.timer)
            clearInterval(this.timer);
    }
    /** popRefresh fires when the user taps the refresh button. */
    popRefresh;
    /** Normalize syncedAt → epoch ms (or null). */
    get syncedMs() {
        const v = this.syncedAt;
        if (v == null)
            return null;
        if (typeof v === 'number')
            return Number.isFinite(v) ? v : null;
        const parsed = Date.parse(v);
        return Number.isNaN(parsed) ? null : parsed;
    }
    /** Short relative label: "just now", "Nm ago", "Nh ago", "Nd ago", "Never". */
    label() {
        void this.tick; // re-read on each timer tick
        const ms = this.syncedMs;
        if (ms == null)
            return 'Never';
        const diff = Math.max(0, Date.now() - ms);
        const sec = Math.floor(diff / 1000);
        if (sec < 45)
            return 'just now';
        const min = Math.floor(sec / 60);
        if (min < 60)
            return `${Math.max(1, min)}m ago`;
        const hr = Math.floor(min / 60);
        if (hr < 24)
            return `${hr}h ago`;
        return `${Math.floor(hr / 24)}d ago`;
    }
    render() {
        // Label only: a non-interactive staleness read-out. Not a <button>, so it
        // never lands in the tab order — the refresh action lives elsewhere and a
        // focusable element that does nothing would be a keyboard dead end.
        if (this.labelOnly) {
            return (h("span", { class: { 'ss-label-only': true, 'ss-label-only--spin': this.loading }, title: `Last synced ${this.label()}` },
                h("span", { class: "ss-bare__label" }, this.label()),
                this.loading && (h("ion-icon", { class: "ss-bare__icon", name: "refresh-outline", "aria-hidden": "true" }))));
        }
        // Bare/inline: a single chrome-less button — "<relative>" + spinning refresh
        // icon, no background. Tapping it forces a refresh; the label auto-updates.
        if (this.bare) {
            return (h("button", { class: { 'ss-bare': true, 'ss-bare--spin': this.loading }, type: "button", title: "Refresh", "aria-label": `Last synced ${this.label()} — refresh`, disabled: this.loading, onClick: () => this.popRefresh.emit() },
                h("span", { class: "ss-bare__label" }, this.label()),
                h("ion-icon", { class: "ss-bare__icon", name: "refresh-outline", "aria-hidden": "true" })));
        }
        return (h("div", { class: "ss" },
            h("span", { class: "ss__label" },
                h("ion-icon", { class: "ss__clock", name: "time-outline", "aria-hidden": "true" }),
                "Last synced ",
                this.label()),
            h("button", { class: { ss__refresh: true, 'ss__refresh--spin': this.loading }, type: "button", title: "Refresh", "aria-label": "Refresh", disabled: this.loading, onClick: () => this.popRefresh.emit() },
                h("ion-icon", { name: "refresh-outline", "aria-hidden": "true" }))));
    }
    static get style() { return PopSyncStatusStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-sync-status",
        "$members$": {
            "syncedAt": [8, "synced-at"],
            "loading": [4],
            "bare": [4],
            "labelOnly": [4, "label-only"],
            "tick": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=sync-status.js.map