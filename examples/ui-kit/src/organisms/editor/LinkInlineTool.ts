/**
 * LinkInlineTool – EditorJS Inline Tool (notes-app Phase 3: Linking + Backlinks)
 *
 * Provides Obsidian-style `[[wiki-link]]` authoring inside any block with an
 * inlineToolbar. Typing `[[` opens an autocomplete of existing note titles; the
 * chosen note is inserted as an inline chip that stores the **target noteId**
 * (not the title) in a data attribute, so renames never break links. If no note
 * matches, an option lazy-creates a new note from the typed title and links it.
 *
 * Sibling of HashtagInlineTool / MentionInlineTool — same shape:
 *   - `static get isInline()` → true
 *   - hidden `render()` button (we trigger via the `[[` keystroke, not a toolbar
 *     button), so it registers cleanly via the editor's `inlineFor()` filter
 *     without ever introducing a dangling `sanitizeConfig` reference.
 *   - `static get sanitize()` whitelists the chip span attributes so EditorJS
 *     `save()` preserves them.
 *
 * Decoupling: this tool lives in ui-kit and must NOT import notes-app. The host
 * (page-editor) wires two globals it consumes:
 *   window.__notesLinkSearch(query) -> Promise<{ id, title }[]>   (Dexie autocomplete)
 *   window.__notesLinkCreate(title) -> Promise<{ id, title }>     (lazy-create + link)
 *   window.__notesLinkNavigate(id)                                (router push)
 *   window.__notesLinkTitle(id) -> string | undefined            (resolve display title)
 * All are optional; the tool degrades gracefully if absent.
 */

interface LinkTarget {
  id: string;
  title: string;
}

interface LinkSearchFn {
  (query: string): Promise<LinkTarget[]> | LinkTarget[];
}

declare global {
  interface Window {
    __notesLinkInlineToolAttached?: boolean;
    __notesLinkSearch?: LinkSearchFn;
    __notesLinkCreate?: (title: string) => Promise<LinkTarget> | LinkTarget;
    __notesLinkNavigate?: (id: string) => void;
    __notesLinkTitle?: (id: string) => string | undefined;
  }
}

export default class LinkInlineTool {
  private button: HTMLButtonElement | null = null;
  private dropdown: HTMLElement | null = null;
  private activeQuery = '';
  private results: LinkTarget[] = [];
  private activeIndex = 0;

  static get isInline() {
    return true;
  }

  static get title() {
    return 'Link';
  }

  /** Whitelist the wiki-link chip so EditorJS save() preserves the noteId. */
  static get sanitize() {
    return {
      a: {
        class: true,
        href: true,
        'data-note-link': true,
        'data-note-id': true,
        contenteditable: true,
      },
    };
  }

  constructor(_opts?: { api?: any }) {
    // Attach the global `[[` detector once across all blocks/instances.
    if (!window.__notesLinkInlineToolAttached) {
      window.__notesLinkInlineToolAttached = true;
      this.attachGlobalListeners();
      this.attachClickDelegation();
    }
  }

  // EditorJS requires render(); we don't expose a toolbar button (trigger is `[[`).
  render(): HTMLButtonElement {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '[[ ]]';
    this.button.style.display = 'none';
    return this.button;
  }

  surround(_range: Range) {}
  checkState() {
    return false;
  }

  // ── global listeners ───────────────────────────────────────────────────────

  private attachGlobalListeners() {
    document.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.isContentEditable) return;
      if (!target.closest('.ce-block') && !target.closest('.cl-text')) return;
      this.checkForTrigger(target);
    });

    document.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (!this.dropdown || this.dropdown.style.display === 'none') return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigate(e.key === 'ArrowDown' ? 1 : -1);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          void this.pick();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.close();
        }
      },
      true,
    );

    // Backspace immediately after a link chip deletes the whole chip.
    document.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key !== 'Backspace') return;
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        if (
          range.collapsed &&
          range.startOffset === 0 &&
          range.startContainer.nodeType === Node.TEXT_NODE
        ) {
          const prev = range.startContainer.previousSibling;
          if (prev && prev.nodeType === Node.ELEMENT_NODE) {
            const el = prev as HTMLElement;
            if (el.hasAttribute('data-note-link')) {
              e.preventDefault();
              e.stopImmediatePropagation();
              const block = el.closest('.ce-block');
              el.remove();
              this.notifyChange(block);
            }
          }
        }
      },
      true,
    );

    // Close on outside click / scroll.
    document.addEventListener('click', (e) => {
      if (this.dropdown && !this.dropdown.contains(e.target as Node)) this.close();
    });
    window.addEventListener('scroll', () => this.close(), true);
  }

  /** Clicking a rendered link chip navigates to the target note. */
  private attachClickDelegation() {
    document.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement)?.closest?.('a[data-note-link]') as HTMLElement | null;
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      const id = a.getAttribute('data-note-id');
      if (!id) return;
      if (window.__notesLinkNavigate) window.__notesLinkNavigate(id);
      else if (typeof window !== 'undefined') window.location.assign(`/note/${id}`);
    });
  }

  // ── trigger detection ────────────────────────────────────────────────────

  private checkForTrigger(_target: HTMLElement) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      this.close();
      return;
    }
    const textNode = range.startContainer as Text;
    const text = textNode.textContent || '';
    const cursorPos = range.startOffset;
    const before = text.slice(0, cursorPos);

    // Find the last unclosed `[[`. If a `]]` appears after it, the link is done.
    const open = before.lastIndexOf('[[');
    if (open === -1) {
      this.close();
      return;
    }
    const afterOpen = before.slice(open + 2);
    if (afterOpen.includes(']]')) {
      this.close();
      return;
    }
    // Don't trigger inside an existing chip.
    if (textNode.parentElement?.closest('a[data-note-link]')) {
      this.close();
      return;
    }
    this.activeQuery = afterOpen;
    void this.openDropdown(afterOpen);
  }

  // ── dropdown ───────────────────────────────────────────────────────────────

  private async openDropdown(query: string) {
    let results: LinkTarget[] = [];
    try {
      if (window.__notesLinkSearch) results = (await window.__notesLinkSearch(query)) || [];
    } catch (err) {
      console.warn('[LinkInlineTool] search failed', err);
    }
    this.results = results;
    this.activeIndex = 0;

    if (!this.dropdown) {
      this.dropdown = document.createElement('div');
      this.dropdown.className = 'note-link-dropdown';
      this.dropdown.setAttribute('role', 'listbox');
      this.dropdown.setAttribute('aria-label', 'Link to a note');
      this.dropdown.style.cssText = `
        position: fixed;
        z-index: 10000;
        background: var(--surface-raised, var(--pico-background-color, #fff));
        color: var(--ink, var(--pico-color, #222));
        border: 1px solid var(--line, var(--pico-muted-border-color, #ddd));
        border-radius: var(--radius-sm, 10px);
        box-shadow: var(--shadow-pop, 0 8px 28px rgba(0,0,0,0.18));
        max-height: 240px;
        overflow-y: auto;
        min-width: 220px;
        padding: 4px;
        font-family: var(--font-sans, inherit);
      `;
      document.body.appendChild(this.dropdown);
    }
    this.renderOptions(query);

    const range = window.getSelection()?.getRangeAt(0);
    if (range) {
      const rect = range.getBoundingClientRect();
      this.dropdown.style.left = `${rect.left}px`;
      this.dropdown.style.top = `${rect.bottom + 4}px`;
    }
    this.dropdown.style.display = 'block';
  }

  private renderOptions(query: string) {
    if (!this.dropdown) return;
    this.dropdown.innerHTML = '';

    this.results.forEach((r, i) => {
      const opt = this.makeOption();
      opt.setAttribute('role', 'option');
      opt.setAttribute('aria-selected', i === this.activeIndex ? 'true' : 'false');
      if (i === this.activeIndex) opt.classList.add('note-link-opt--active');
      opt.dataset.kind = 'existing';
      opt.dataset.index = String(i);
      opt.innerHTML = `<span class="note-link-opt__icon" aria-hidden="true">🔗</span><span class="note-link-opt__label">${escapeHtml(
        r.title || 'Untitled',
      )}</span>`;
      opt.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        void this.insertExisting(r);
      });
      this.dropdown!.appendChild(opt);
    });

    // "Create" affordance when the query has no exact title match.
    const trimmed = query.trim();
    const exact = this.results.find((r) => (r.title || '').toLowerCase() === trimmed.toLowerCase());
    if (trimmed && !exact) {
      const idx = this.results.length;
      const create = this.makeOption();
      create.setAttribute('role', 'option');
      create.setAttribute('aria-selected', this.activeIndex === idx ? 'true' : 'false');
      if (this.activeIndex === idx) create.classList.add('note-link-opt--active');
      create.dataset.kind = 'create';
      create.dataset.index = String(idx);
      create.innerHTML = `<span class="note-link-opt__icon" aria-hidden="true">＋</span><span class="note-link-opt__label"><span style="opacity:.6">Create &amp; link:</span> <strong>${escapeHtml(
        trimmed,
      )}</strong></span>`;
      create.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        void this.createAndInsert(trimmed);
      });
      this.dropdown.appendChild(create);
    }

    if (!this.dropdown.children.length) {
      const empty = document.createElement('div');
      empty.className = 'note-link-empty';
      empty.style.cssText = 'padding:8px 10px;opacity:.6;font-size:14px;';
      empty.textContent = 'Type a note title…';
      this.dropdown.appendChild(empty);
    }
  }

  private makeOption(): HTMLButtonElement {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'note-link-opt';
    opt.style.cssText = `
      display:flex;align-items:center;gap:8px;width:100%;min-height:36px;
      padding:8px 10px;border:none;background:transparent;text-align:left;
      cursor:pointer;font-size:14px;border-radius:var(--radius-xs,6px);
      color:inherit;font-family:inherit;
    `;
    opt.addEventListener('mouseenter', () => {
      const idx = Number(opt.dataset.index);
      if (!Number.isNaN(idx)) {
        this.activeIndex = idx;
        this.highlight();
      }
    });
    return opt;
  }

  private highlight() {
    if (!this.dropdown) return;
    const opts = Array.from(this.dropdown.querySelectorAll('.note-link-opt'));
    opts.forEach((o, i) => {
      o.classList.toggle('note-link-opt--active', i === this.activeIndex);
      o.setAttribute('aria-selected', i === this.activeIndex ? 'true' : 'false');
      if (i === this.activeIndex)
        (o as HTMLElement).style.background = 'var(--brand-blue-soft, rgba(0,119,204,.12))';
      else (o as HTMLElement).style.background = 'transparent';
    });
  }

  private navigate(dir: number) {
    if (!this.dropdown) return;
    const count = this.dropdown.querySelectorAll('.note-link-opt').length;
    if (!count) return;
    this.activeIndex = (this.activeIndex + dir + count) % count;
    this.highlight();
    const active = this.dropdown.querySelector('.note-link-opt--active') as HTMLElement;
    active?.scrollIntoView({ block: 'nearest' });
  }

  private async pick() {
    if (!this.dropdown) return;
    const active = this.dropdown.querySelector('.note-link-opt--active') as HTMLElement | null;
    if (!active) return;
    if (active.dataset.kind === 'create') {
      await this.createAndInsert(this.activeQuery.trim());
    } else {
      const idx = Number(active.dataset.index);
      const target = this.results[idx];
      if (target) await this.insertExisting(target);
    }
  }

  // ── insertion ────────────────────────────────────────────────────────────

  private async createAndInsert(title: string) {
    if (!title) {
      this.close();
      return;
    }
    let target: LinkTarget | null = null;
    try {
      if (window.__notesLinkCreate) target = await window.__notesLinkCreate(title);
    } catch (err) {
      console.warn('[LinkInlineTool] create failed', err);
    }
    if (!target) {
      this.close();
      return;
    }
    this.insertChip(target);
  }

  private async insertExisting(target: LinkTarget) {
    this.insertChip(target);
  }

  /** Replace the `[[query` text with an inline anchor chip carrying the noteId. */
  private insertChip(target: LinkTarget) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      this.close();
      return;
    }
    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      this.close();
      return;
    }
    const textNode = range.startContainer as Text;
    const text = textNode.textContent || '';
    const cursorPos = range.startOffset;
    const before = text.slice(0, cursorPos);
    const open = before.lastIndexOf('[[');
    if (open === -1) {
      this.close();
      return;
    }
    const prefix = text.slice(0, open);
    const suffix = text.slice(cursorPos);

    const anchor = makeLinkChip(target);
    const parent = textNode.parentNode;
    if (!parent) {
      this.close();
      return;
    }
    const prefixNode = document.createTextNode(prefix);
    const spaceNode = document.createTextNode(' ');
    const suffixNode = document.createTextNode(suffix);
    parent.insertBefore(prefixNode, textNode);
    parent.insertBefore(anchor, textNode);
    parent.insertBefore(spaceNode, textNode);
    parent.insertBefore(suffixNode, textNode);
    parent.removeChild(textNode);

    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    const block = anchor.closest('.ce-block');
    this.notifyChange(block);
    this.close();
  }

  /** Force EditorJS to register the DOM mutation so autosave fires. */
  private notifyChange(block: Element | null) {
    try {
      const editable = block?.querySelector('[contenteditable="true"]');
      if (editable) {
        editable.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    } catch {
      /* fall through */
    }
    const popEditor = document.querySelector('pop-editor');
    if (popEditor) popEditor.dispatchEvent(new Event('change'));
  }

  private close() {
    if (this.dropdown) this.dropdown.style.display = 'none';
    this.activeQuery = '';
    this.results = [];
    this.activeIndex = 0;
  }
}

/** Build the inline link chip element. Exported markup shape is stable so the
 *  page-side extractor (page-editor) can parse `[data-note-id]` from saved HTML. */
export function makeLinkChip(target: LinkTarget): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.setAttribute('data-note-link', '');
  anchor.setAttribute('data-note-id', target.id);
  anchor.setAttribute('href', `/note/${target.id}`);
  anchor.setAttribute('contenteditable', 'false');
  anchor.className = 'note-link-chip';
  anchor.style.cssText = `
    color: var(--brand-blue, var(--pico-primary, #0077cc));
    background: var(--brand-blue-soft, color-mix(in oklab, var(--brand-blue, #0077cc) 12%, transparent));
    border: 1px solid color-mix(in oklab, var(--brand-blue, #0077cc) 30%, transparent);
    border-radius: var(--radius-xs, 6px);
    padding: 1px 6px;
    margin: 0 2px;
    text-decoration: none;
    font-size: 0.95em;
    white-space: nowrap;
    cursor: pointer;
  `;
  anchor.textContent = target.title || 'Untitled';
  return anchor;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
