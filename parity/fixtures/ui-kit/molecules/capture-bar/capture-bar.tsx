import { Component, h, Prop, State, Event, EventEmitter, Element } from '@stencil/core';

/**
 * pop-capture-bar — zero-friction quick capture, pinned at the top of Home.
 *
 * "✎ Capture a thought… ↵". Pressing Enter (or the send button) emits
 * `capture` with the trimmed text and clears the field (the save-and-clear
 * loop). The page wires note creation via the NotesAdapter — the bar itself is
 * presentational, so it works in Storybook and stays reusable.
 *
 * Phase 2 keeps the input plain; inline `#tag` / `[[link]]` parsing
 * (pop-mention-input) is layered in by the Capture/Linking phases.
 *
 * See planned/notes-app-digital-brain/components.mdx §pop-capture-bar.
 */
@Component({
  tag: 'pop-capture-bar',
  encapsulation: { type: 'scoped' },
  styleUrl: 'capture-bar.css',
})
export class PopCaptureBar {
  @Element() el!: HTMLElement;

  /** Placeholder copy. */
  @Prop() placeholder = 'Capture a thought…';

  /** Autofocus the field on mount (Home does; the topbar variant may not). */
  @Prop() autofocus = false;

  /** Fired with the captured text when the user submits a non-empty thought. */
  @Event({ composed: true, bubbles: true }) capture!: EventEmitter<{ text: string }>;

  @State() private value = '';

  private input?: HTMLInputElement;

  componentDidLoad() {
    if (this.autofocus) this.input?.focus();
  }

  private submit = () => {
    const text = this.value.trim();
    if (!text) return;
    this.capture.emit({ text });
    this.value = '';
    // keep focus for the save-and-clear loop
    this.input?.focus();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.submit();
    }
  };

  private onInput = (e: Event) => {
    this.value = (e.target as HTMLInputElement).value;
  };

  render() {
    const hasText = this.value.trim().length > 0;
    return (
      <div class={{ 'cb': true, 'is-active': hasText }}>
        <span class="cb__lead" aria-hidden="true"><pop-brand-icon name="edit" /></span>
        <input
          ref={(el) => (this.input = el as HTMLInputElement)}
          class="cb__input"
          type="text"
          enterkeyhint="done"
          autocomplete="off"
          value={this.value}
          placeholder={this.placeholder}
          aria-label={this.placeholder}
          onInput={this.onInput}
          onKeyDown={this.onKeyDown}
        />
        <button
          type="button"
          class="cb__send"
          aria-label="Capture thought"
          title="Capture (Enter)"
          disabled={!hasText}
          onClick={this.submit}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    );
  }
}
