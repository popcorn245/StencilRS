import type { BlockTool } from '@editorjs/editorjs';

/**
 * AssistantLauncher — a slash / block-"+" menu entry that opens the host app's
 * unified Assistant instead of inserting a persistent block (notes-app WS3).
 *
 * Editor.js block tools appear in the "+"/slash palette by their `toolbox`
 * entry. This tool is a launcher: when it's inserted (i.e. the user picks
 * "Ask the Assistant" from the menu) its constructor fires a
 * `notes-app:open-assistant` window event (verb `build`) — the SAME event the
 * WS2 selection toolbar uses — and then removes its own placeholder block so
 * nothing is written into the note. It never persists (save() returns nothing
 * renderable and the block is deleted on the next tick).
 *
 * Registered only when pop-editor is mounted with `assistant-slash` (opt-in), so
 * other editor hosts (tasks-app, templates) never see it.
 */
export default class AssistantLauncher implements BlockTool {
  private api: any;

  static get toolbox() {
    return {
      // Sparkle glyph — mirrors the Assistant's brand-icon `sparkles`.
      icon:
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2z"/>' +
        '<path d="M18 13l.9 2.4L21 16l-2.1.6L18 19l-.9-2.4L15 16l2.1-.6L18 13z"/>' +
        '</svg>',
      title: 'Ask the Assistant',
    };
  }

  constructor({ api }: any) {
    this.api = api;
    // Defer to the next tick so Editor.js has finished inserting the block (and
    // knows its index) before we open the Assistant and delete the placeholder.
    setTimeout(() => this.launch(), 0);
  }

  private launch() {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('notes-app:open-assistant', { detail: { verb: 'build' } }),
        );
      }
    } catch {
      /* host without the WS2 Assistant listener — no-op, no crash */
    }
    // Remove our own placeholder so the launcher never leaves a block behind.
    try {
      const idx = this.api?.blocks?.getCurrentBlockIndex?.();
      if (typeof idx === 'number' && idx >= 0) this.api.blocks.delete(idx);
    } catch {
      /* best-effort cleanup */
    }
  }

  render(): HTMLElement {
    // Transient placeholder — removed on the next tick by launch().
    const el = document.createElement('div');
    el.style.display = 'none';
    return el;
  }

  save() {
    return {};
  }
}
