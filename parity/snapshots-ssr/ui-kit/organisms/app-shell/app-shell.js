import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopAppShellStyle0 from "./ui-kit/organisms/app-shell/app-shell.css?tag=pop-app-shell&encapsulation=scoped";
/**
 * pop-app-shell — the shared **page frame** for the notes-app "digital brain".
 *
 * Every `page-*` used to reinvent its own header markup (title + optional
 * controls). This organism gives them ONE consistent frame:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ [icon] Title   ‹context slot›     ‹actions slot›│  ← sticky header
 *   ├──────────────────────────────────────────────┤
 *   │ ‹default slot — the page body, scrolls›        │
 *   └──────────────────────────────────────────────┘
 *
 * Slots:
 *  - `context` — inline, after the title (e.g. a count badge, a subtitle,
 *    filter chips). Optional.
 *  - `actions` — right-aligned controls (buttons, selects, toggles). Optional.
 *  - default   — the page content; the shell makes it a scroll region so the
 *    header stays put.
 *
 * Props let a page set the title + optional leading `pop-brand-icon` without
 * markup. `bare` drops the header entirely (for pages that own a custom top bar,
 * like the split-pane Home/Editor) while still getting the frame's flex/scroll
 * plumbing.
 */
export class AppShell {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** Page title rendered in the header. */
    heading;
    /** Optional leading `pop-brand-icon` name shown before the title. */
    iconName;
    /** Heading level for the title (a11y). */
    headingLevel = 1;
    /** Constrain the body to a readable column and center it (Settings). */
    centered = false;
    /** Render no header chrome — just the flex/scroll frame. */
    bare = false;
    render() {
        const Title = `h${this.headingLevel}`;
        return (h("div", { key: '0', class: { 'shell': true, 'shell--centered': this.centered, 'shell--bare': this.bare } },
            !this.bare && (h("header", { key: '1', class: "shell__head" },
                h(Title, { key: '2', class: "shell__title" },
                    this.iconName && (h("span", { key: '3', class: "shell__title-icon", "aria-hidden": "true" },
                        h("pop-brand-icon", { key: '4', name: this.iconName }))),
                    h("span", { key: '5', class: "shell__title-text" }, this.heading),
                    h("span", { key: '6', class: "shell__context" },
                        h("slot", { key: '7', name: "context" }))),
                h("div", { key: '8', class: "shell__actions" },
                    h("slot", { key: '9', name: "actions" })))),
            h("div", { key: 'a', class: "shell__body" },
                h("slot", { key: 'b' }))));
    }
    static get style() { return PopAppShellStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-app-shell",
        "$members$": {
            "heading": [1],
            "iconName": [1, "icon-name"],
            "headingLevel": [2, "heading-level"],
            "centered": [4],
            "bare": [4]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=app-shell.js.map