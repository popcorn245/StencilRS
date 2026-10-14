import { Component, Prop, h } from '@stencil/core';

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
@Component({
  tag: 'pop-app-shell',
  encapsulation: { type: 'scoped' },
  styleUrl: 'app-shell.css',
})
export class AppShell {
  /** Page title rendered in the header. */
  @Prop() heading?: string;

  /** Optional leading `pop-brand-icon` name shown before the title. */
  @Prop() iconName?: string;

  /** Heading level for the title (a11y). */
  @Prop() headingLevel: 1 | 2 = 1;

  /** Constrain the body to a readable column and center it (Settings). */
  @Prop() centered = false;

  /** Render no header chrome — just the flex/scroll frame. */
  @Prop() bare = false;

  render() {
    const Title = `h${this.headingLevel}` as any;
    return (
      <div class={{ 'shell': true, 'shell--centered': this.centered, 'shell--bare': this.bare }}>
        {!this.bare && (
          <header class="shell__head">
            <Title class="shell__title">
              {this.iconName && (
                <span class="shell__title-icon" aria-hidden="true">
                  <pop-brand-icon name={this.iconName} />
                </span>
              )}
              <span class="shell__title-text">{this.heading}</span>
              <span class="shell__context">
                <slot name="context"></slot>
              </span>
            </Title>
            <div class="shell__actions">
              <slot name="actions"></slot>
            </div>
          </header>
        )}
        <div class="shell__body">
          <slot></slot>
        </div>
      </div>
    );
  }
}
