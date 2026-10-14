import { Component, Host, h, Prop, State, Event, EventEmitter, Element, Watch } from '@stencil/core';

export interface FileMentionChangeDetail { value: string; }
export interface FileMentionSubmitDetail { value: string; mentionedFiles: string[]; }

/** Extract all @path references from a string. */
function extractMentioned(text: string): string[] {
  const matches = [...text.matchAll(/@([\w./\-]+)/g)];
  return [...new Set(matches.map(m => m[1]))];
}

/** Fuzzy-match: does `path` contain all characters of `query` in order? */
function fuzzyMatch(path: string, query: string): boolean {
  const lp = path.toLowerCase();
  const lq = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lp.length && qi < lq.length; i++) {
    if (lp[i] === lq[qi]) qi++;
  }
  return qi === lq.length;
}

/** Return the last 2 path segments as a label. */
function shortLabel(path: string): string {
  const parts = path.split('/');
  return parts.slice(-2).join('/');
}

@Component({
  tag: 'pop-file-mention',
  encapsulation: { type: 'shadow' },
  styleUrl: 'file-mention.css',
})
export class PopFileMention {
  @Element() el!: HTMLElement;

  private textareaEl?: HTMLTextAreaElement;

  /** JSON-encoded string array OR raw string array of file paths */
  @Prop() files: string | string[] = '[]';
  @Prop({ mutable: true }) value: string = '';
  @Prop() placeholder: string = 'Type @ to mention a file…';
  @Prop() disabled: boolean = false;

  @Event() mentionChange: EventEmitter<FileMentionChangeDetail>;
  @Event() mentionSubmit: EventEmitter<FileMentionSubmitDetail>;
  /** Fires whenever the set of @-mentioned files in the current value changes */
  @Event() filesReferenced: EventEmitter<string[]>;

  @State() private dropdownOpen: boolean = false;
  @State() private query: string = '';
  @State() private filteredPaths: string[] = [];
  @State() private focusedIndex: number = 0;
  /** Cursor position where the current @ mention started */
  private mentionStart: number = -1;

  private get parsedFiles(): string[] {
    if (Array.isArray(this.files)) return this.files;
    try { return JSON.parse(this.files) as string[]; } catch { return []; }
  }

  @Watch('files')
  filesChanged() {
    // Re-filter if dropdown is open
    if (this.dropdownOpen) this.updateFilter(this.query);
  }

  private updateFilter(q: string) {
    const all = this.parsedFiles;
    this.filteredPaths = all.filter(p => fuzzyMatch(p, q)).slice(0, 20);
    this.focusedIndex = 0;
  }

  private handleInput = (e: Event) => {
    const ta = e.target as HTMLTextAreaElement;
    this.value = ta.value;
    this.mentionChange.emit({ value: this.value });
    this.filesReferenced.emit(extractMentioned(this.value));

    // Detect if we're inside an @... token
    const cursor = ta.selectionStart ?? 0;
    const before = this.value.slice(0, cursor);
    const atIdx = before.lastIndexOf('@');

    if (atIdx !== -1) {
      const fragment = before.slice(atIdx + 1);
      // Only activate if no space/newline since @
      if (!/[\s]/.test(fragment)) {
        this.mentionStart = atIdx;
        this.query = fragment;
        this.updateFilter(fragment);
        this.dropdownOpen = this.filteredPaths.length > 0;
        return;
      }
    }
    this.dropdownOpen = false;
    this.mentionStart = -1;
  };

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Shift') return; // don't interfere with Shift+Enter

    if (this.dropdownOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.focusedIndex = Math.min(this.focusedIndex + 1, this.filteredPaths.length - 1); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); this.focusedIndex = Math.max(this.focusedIndex - 1, 0); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.selectPath(this.filteredPaths[this.focusedIndex]);
        return;
      }
      if (e.key === 'Escape') { this.dropdownOpen = false; return; }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.mentionSubmit.emit({ value: this.value, mentionedFiles: extractMentioned(this.value) });
    }
    // Shift+Enter → let browser insert newline (default behavior)
  };

  private selectPath(path: string) {
    if (!path) return;
    const ta = this.textareaEl;
    if (!ta) return;
    const before = this.value.slice(0, this.mentionStart);
    const after = this.value.slice(ta.selectionStart ?? 0);
    this.value = `${before}@${path} ${after}`;
    this.dropdownOpen = false;
    this.mentionStart = -1;
    this.mentionChange.emit({ value: this.value });
    this.filesReferenced.emit(extractMentioned(this.value));
    // Restore focus + cursor after path
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.value = this.value;
      const pos = before.length + path.length + 2; // @ + path + space
      ta.setSelectionRange(pos, pos);
      ta.focus();
    });
  }

  render() {
    return (
      <Host>
        <div class="wrap">
          <textarea
            class="textarea"
            part="textarea"
            value={this.value}
            placeholder={this.placeholder}
            disabled={this.disabled}
            onInput={this.handleInput}
            onKeyDown={this.handleKeydown}
            ref={el => (this.textareaEl = el)}
            rows={2}
          />
          {this.dropdownOpen && this.filteredPaths.length > 0 && (
            <div class="dropdown" role="listbox">
              {this.filteredPaths.map((path, i) => (
                <div
                  key={path}
                  class={{ 'dropdown-item': true, 'is-focused': i === this.focusedIndex }}
                  role="option"
                  aria-selected={String(i === this.focusedIndex)}
                  title={path}
                  onMouseDown={(e) => { e.preventDefault(); this.selectPath(path); }}
                  onMouseEnter={() => { this.focusedIndex = i; }}
                >
                  <span class="item-label">{shortLabel(path)}</span>
                  <span class="item-full">{path}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Host>
    );
  }
}
