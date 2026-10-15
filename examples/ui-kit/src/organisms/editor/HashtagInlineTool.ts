/**
 * HashtagInlineTool – EditorJS Inline Tool
 * 
 * Provides `#tag` autocomplete in any block with inlineToolbar enabled.
 * When the user types `#` followed by characters, a dropdown appears
 * with matching tags. Selecting one inserts a styled <span> and syncs
 * with the block's TagTune instance.
 */

interface TagOption {
  id: string;
  name: string;
  color?: string;
}

interface HashtagConfig {
  availableTags?: TagOption[];
  onTagCreated?: (name: string) => void;
}

export default class HashtagInlineTool {
  private button: HTMLButtonElement | null = null;
  private config: HashtagConfig;
  private dropdown: HTMLElement | null = null;
  private activeQuery = '';
  private api: any;

  static get isInline() {
    return true;
  }

  static get title() {
    return 'Hashtag';
  }

  // This tool doesn't use the standard toolbar button — it's triggered by # in text
  static get sanitize() {
    return {
      span: {
        class: true,
        'data-tag': true,
        'data-tag-name': true,
        'data-block-id': true,
        'data-row-index': true,
        contenteditable: true,
        style: true,
      },
    };
  }

  constructor({ config, api }: { config?: HashtagConfig; api: any }) {
    this.config = config || {};
    this.api = api;

    // Attach global listeners once for # detection
    if (!(window as any).__hashtagInlineToolAttached) {
      (window as any).__hashtagInlineToolAttached = true;
      this.attachGlobalListeners();
    }
  }

  // EditorJS requires render() but we don't show a toolbar button
  render(): HTMLButtonElement {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '#';
    this.button.style.display = 'none'; // Hidden — we activate via # keystroke
    return this.button;
  }

  // Not used for selection wrapping
  surround(_range: Range) {}
  checkState() { return false; }

  private getAvailableTags(): TagOption[] {
    // Dynamically pull from config or from global __hashtagAvailableTags
    return (window as any).__hashtagAvailableTags || this.config.availableTags || [];
  }

  private attachGlobalListeners() {
    // Use input event on document to catch # typing in any contenteditable
    document.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.isContentEditable) return;
      // Check if we're inside an EditorJS block
      if (!target.closest('.ce-block') && !target.closest('.cl-text')) return;
      this.checkForHashtag(target);
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.dropdown || this.dropdown.style.display === 'none') return;
      
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateDropdown(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        this.pickTag();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.closeDropdown();
      }
    }, true);

    // Handle backspace to delete the entire chip at once
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        const triggerBlockInput = (element: HTMLElement) => {
           const block = element.closest('.ce-block') as HTMLElement;
           if (block) {
              const editable = block.querySelector('[contenteditable="true"]');
              if (editable) editable.dispatchEvent(new Event('input', { bubbles: true }));
           }
        };

        if (e.key === 'Backspace') {
          const sel = window.getSelection();
          if (!sel || !sel.rangeCount) return;
          
          const range = sel.getRangeAt(0);
          
          // 1. If cursor is blinking immediately after a hashtag chip
          if (range.collapsed && range.startOffset === 0 && range.startContainer.nodeType === Node.TEXT_NODE) {
            const prevSibling = range.startContainer.previousSibling;
            if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE) {
              const el = prevSibling as HTMLElement;
              if (el.hasAttribute('data-tag')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                triggerBlockInput(el);
                el.remove();
                triggerBlockInput(el);
                return;
              }
            }
          }
          
          // 2. If a hashtag chip is partially or fully selected
          const container = range.commonAncestorContainer;
          if (container && container.nodeType === Node.ELEMENT_NODE) {
            const el = container as HTMLElement;
            // Upward check: is the selection inside the span?
            const chip = el.closest('span[data-tag]') as HTMLElement;
            if (chip) {
               e.preventDefault();
               e.stopImmediatePropagation();

               // Move caret out of the chip before removing
               const newRange = document.createRange();
               if (chip.nextSibling) {
                 newRange.setStart(chip.nextSibling, 0);
               } else if (chip.previousSibling) {
                 newRange.setStart(chip.previousSibling, chip.previousSibling.textContent?.length || 0);
               } else if (chip.parentNode) {
                 newRange.setStart(chip.parentNode, 0);
               }
               newRange.collapse(true);
               sel.removeAllRanges();
               sel.addRange(newRange);

               triggerBlockInput(chip);
               chip.remove();
               triggerBlockInput(chip);
               return;
            }
            
            // Downward check: does the selection contain the span?
            const selectedFrag = range.cloneContents();
            const internalChips = selectedFrag.querySelectorAll?.('span[data-tag]');
            if (internalChips && internalChips.length > 0) {
               e.preventDefault();
               e.stopImmediatePropagation();

               const realChips = el.querySelectorAll('span[data-tag]');
               realChips.forEach(c => {
                 if (sel.containsNode(c, true)) {
                    triggerBlockInput(c as HTMLElement);
                    c.remove();
                    triggerBlockInput(c as HTMLElement);
                 }
               });

               sel.collapseToStart();
            }
          }
        }
    }, true); // Use capture phase
  }

  private checkForHashtag(target: HTMLElement) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    
    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      this.closeDropdown();
      return;
    }

    const textNode = range.startContainer as Text;
    const text = textNode.textContent || '';
    const cursorPos = range.startOffset;
    const before = text.slice(0, cursorPos);

    // Find the last # that isn't inside a tag span already
    const hashIdx = before.lastIndexOf('#');
    if (hashIdx === -1) {
      this.closeDropdown();
      return;
    }

    // Make sure # is at start or preceded by a space/newline
    if (hashIdx > 0 && !/\s/.test(before[hashIdx - 1])) {
      this.closeDropdown();
      return;
    }

    // Check if the parent is already a tag span (editing an existing tag)
    if (textNode.parentElement?.hasAttribute('data-tag')) {
      this.closeDropdown();
      return;
    }

    const query = before.slice(hashIdx + 1).toLowerCase();
    this.activeQuery = query;
    this.showDropdown(target, query);
  }

  private showDropdown(_target: HTMLElement, query: string) {
    const tags = this.getAvailableTags();
    const filtered = query
      ? tags.filter(t => t.name.toLowerCase().includes(query))
      : tags;

    if (!this.dropdown) {
      this.dropdown = document.createElement('div');
      this.dropdown.classList.add('hashtag-dropdown');
      this.dropdown.style.cssText = `
        position: fixed;
        z-index: 10000;
        background: var(--pico-background-color, #fff);
        border: 1px solid var(--pico-muted-border-color, #ddd);
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        max-height: 200px;
        overflow-y: auto;
        min-width: 180px;
        padding: 4px;
      `;
      document.body.appendChild(this.dropdown);
    }

    this.dropdown.innerHTML = '';

    if (filtered.length === 0 && query) {
      // Show "Create tag" option
      const create = document.createElement('button');
      create.type = 'button';
      create.classList.add('hashtag-opt', 'hashtag-opt--active');
      create.style.cssText = this.optionStyle();
      create.innerHTML = `<span style="opacity:0.5">Create:</span> <strong>#${query}</strong>`;
      create.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.createAndInsertTag(query);
      });
      this.dropdown.appendChild(create);
    } else {
      filtered.forEach((tag, i) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.classList.add('hashtag-opt');
        if (i === 0) opt.classList.add('hashtag-opt--active');
        opt.style.cssText = this.optionStyle();
        opt.dataset.tagId = tag.id;
        opt.dataset.tagName = tag.name;
        
        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1;';
        contentDiv.innerHTML = `
            <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${tag.color || '#0077cc'}; border: 1px solid var(--pico-muted-border-color)"></div>
            <span>#${tag.name}</span>
        `;
        
        const editBtn = document.createElement('div');
        editBtn.innerHTML = '✎';
        editBtn.style.cssText = 'font-size: 14px; opacity: 0.5; padding: 0 4px; display: none;';
        
        opt.addEventListener('mouseenter', () => editBtn.style.display = 'block');
        opt.addEventListener('mouseleave', () => editBtn.style.display = 'none');
        
        editBtn.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            document.dispatchEvent(new CustomEvent('editTagRequested', { detail: { id: tag.id, name: tag.name, color: tag.color } }));
            this.closeDropdown();
        });

        opt.appendChild(contentDiv);
        opt.appendChild(editBtn);

        opt.addEventListener('mousedown', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this.insertTag(tag);
        });
        this.dropdown!.appendChild(opt);
      });

      // Add "Create" option at the bottom if query doesn't exactly match
      if (query && !filtered.find(t => t.name.toLowerCase() === query)) {
        const create = document.createElement('button');
        create.type = 'button';
        create.classList.add('hashtag-opt');
        create.style.cssText = this.optionStyle();
        create.innerHTML = `<span style="opacity:0.5">Create:</span> <strong>#${query}</strong>`;
        create.addEventListener('mousedown', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this.createAndInsertTag(query);
        });
        this.dropdown!.appendChild(create);
      }
    }

    // Position near cursor
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      this.dropdown.style.left = `${rect.left}px`;
      this.dropdown.style.top = `${rect.bottom + 4}px`;
    }
    this.dropdown.style.display = 'block';
  }

  private optionStyle(): string {
    return `
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 6px 10px;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      font-size: 14px;
      border-radius: 4px;
      color: inherit;
      font-family: inherit;
    `;
  }

  private navigateDropdown(dir: number) {
    if (!this.dropdown) return;
    const opts = Array.from(this.dropdown.querySelectorAll('.hashtag-opt'));
    if (!opts.length) return;
    const ai = opts.findIndex(o => o.classList.contains('hashtag-opt--active'));
    opts.forEach(o => o.classList.remove('hashtag-opt--active'));
    let ni = ai + dir;
    if (ni < 0) ni = opts.length - 1;
    if (ni >= opts.length) ni = 0;
    opts[ni].classList.add('hashtag-opt--active');
    (opts[ni] as HTMLElement).scrollIntoView({ block: 'nearest' });
  }

  private pickTag() {
    if (!this.dropdown) return;
    const active = this.dropdown.querySelector('.hashtag-opt--active') as HTMLElement;
    if (!active) return;

    const tagId = active.dataset.tagId;
    const tagName = active.dataset.tagName;

    if (tagId && tagName) {
      this.insertTag({ id: tagId, name: tagName });
    } else {
      // Create new tag option
      this.createAndInsertTag(this.activeQuery);
    }
  }

  private createAndInsertTag(name: string) {
    const tagId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Fire creation event
    if (this.config.onTagCreated) {
      this.config.onTagCreated(name);
    }
    document.dispatchEvent(new CustomEvent('tagCreated', { detail: { name } }));

    // Add to available tags for future autocompletes
    const available = (window as any).__hashtagAvailableTags || [];
    if (!available.find((t: TagOption) => t.id === tagId)) {
      available.push({ id: tagId, name });
      (window as any).__hashtagAvailableTags = available;
    }

    this.insertTag({ id: tagId, name });
  }

  private insertTag(tag: TagOption) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) { this.closeDropdown(); return; }

    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) { this.closeDropdown(); return; }

    const textNode = range.startContainer as Text;
    const text = textNode.textContent || '';
    const cursorPos = range.startOffset;
    const before = text.slice(0, cursorPos);
    const hashIdx = before.lastIndexOf('#');
    if (hashIdx === -1) { this.closeDropdown(); return; }

    // Split text: before the #, and after the cursor
    const prefix = text.slice(0, hashIdx);
    const suffix = text.slice(cursorPos);

    // Create the tag span
    const tagSpan = document.createElement('span');
    tagSpan.setAttribute('data-tag', tag.id);
    tagSpan.setAttribute('data-tag-name', tag.name);
    
    const block = textNode.parentElement?.closest('.ce-block');
    if (block) {
      const blockId = block.getAttribute('data-id');
      if (blockId) tagSpan.setAttribute('data-block-id', blockId);
      
      const clRow = textNode.parentElement?.closest('.cl-row');
      if (clRow) {
        const rows = Array.from(block.querySelectorAll('.cl-row'));
        const rowIndex = rows.indexOf(clRow);
        if (rowIndex !== -1) tagSpan.setAttribute('data-row-index', rowIndex.toString());
      }
    }

    tagSpan.contentEditable = 'false';
    tagSpan.style.cssText = `
      background: color-mix(in srgb, ${tag.color || '#1976d2'} 12%, transparent);
      color: ${tag.color || '#1976d2'};
      border: 1px solid color-mix(in srgb, ${tag.color || '#1976d2'} 30%, transparent);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.9em;
      margin: 0 2px;
      cursor: default;
      display: inline;
      white-space: nowrap;
    `;
    tagSpan.textContent = `#${tag.name}`;

    // Replace the text node with: prefix + span + space + suffix
    const parent = textNode.parentNode;
    if (!parent) { this.closeDropdown(); return; }

    const prefixNode = document.createTextNode(prefix);
    const spaceNode = document.createTextNode('\u00A0'); // non-breaking space after tag
    const suffixNode = document.createTextNode(suffix);

    parent.insertBefore(prefixNode, textNode);
    parent.insertBefore(tagSpan, textNode);
    parent.insertBefore(spaceNode, textNode);
    parent.insertBefore(suffixNode, textNode);
    parent.removeChild(textNode);

    // Move cursor after the space
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    // Sync with TagTune if available for this block
    const blockEl = tagSpan.closest('.ce-block');
    if (blockEl) {
      const blockId = blockEl.getAttribute('data-id');
      if (blockId && (window as any).__tagTunes?.[blockId]) {
        const tune = (window as any).__tagTunes[blockId];
        if (typeof tune.syncHashtags === 'function') {
          tune.syncHashtags([tag.name]);
        }
      }
    }

    // Force Editor.js to recognize the DOM mutation natively to trigger auto-save
    if (this.api && this.api.events && typeof this.api.events.emit === 'function') {
         // Editor.js internal event bus
         // This tells the core that a block was updated
         try {
            const currentBlockIndex = this.api.blocks.getCurrentBlockIndex();
            // A dirty hack but very reliable: emit block changed
            const blockApi = this.api.blocks.getBlockByIndex(currentBlockIndex);
            if (blockApi) {
                // Dispatch native input event on the block to let Editor.js MutationObserver catch it
                const editable = blockEl?.querySelector('[contenteditable="true"]');
                if (editable) {
                   editable.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
         } catch(e) {
            console.warn('Could not force native editor change', e);
         }
    } else {
        // Fallback: trigger custom event built into wrapper
        const popEditor = document.querySelector('pop-editor');
        if (popEditor) popEditor.dispatchEvent(new Event('change'));
    }

    this.closeDropdown();
  }

  private closeDropdown() {
    if (this.dropdown) {
      this.dropdown.style.display = 'none';
    }
    this.activeQuery = '';
  }
}
