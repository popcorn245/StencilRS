/**
 * MentionInlineTool – EditorJS Inline Tool
 *
 * Provides `@user` autocomplete in any block with inlineToolbar enabled.
 * When the user types `@` followed by characters, a dropdown appears
 * with matching users. Selecting one inserts a styled <span> and syncs
 * with the block's MentionTune instance.
 */

interface MentionUser {
  id: string;
  displayName: string;
  photoURL?: string;
  icon?: string;
  isDate?: boolean;
  isCustomDate?: boolean;
  endDate?: string;
}

interface MentionInlineConfig {
  users?: MentionUser[];
}

export default class MentionInlineTool {
  private config: MentionInlineConfig;
  private dropdown: HTMLElement | null = null;

  static get isInline() {
    return true;
  }

  static get title() {
    return 'Mention';
  }

  static get sanitize() {
    return {
      span: {
        class: true,
        'data-user': true,
        'data-user-name': true,
        'data-date': true,
        'data-date-name': true,
        'data-end-date': true,
        'data-block-id': true,
        'data-row-index': true,
        contenteditable: true,
        style: true,
      },
    };
  }

  constructor({ config }: { config?: MentionInlineConfig; api: any }) {
    this.config = config || {};

    if (!(window as any).__mentionInlineToolAttached) {
      (window as any).__mentionInlineToolAttached = true;
      this.attachGlobalListeners();
    }
  }

  render(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '@';
    btn.style.display = 'none';
    return btn;
  }

  surround(_range: Range) {}
  checkState() { return false; }

  private getUsers(): MentionUser[] {
    return (window as any).__mentionAvailableUsers || this.config.users || [];
  }

  private attachGlobalListeners() {
    document.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.isContentEditable) return;
      if (!target.closest('.ce-block') && !target.closest('.cl-text')) return;
      this.checkForMention();
    });

    // Handle clicking on existing date chips to edit them
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'SPAN' && target.hasAttribute('data-date')) {
         e.preventDefault();
         const startDate = target.getAttribute('data-date') || '';
         const endDate = target.getAttribute('data-end-date') || '';
         this.openCustomDatePopup(target, startDate, endDate);
      }
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.dropdown || this.dropdown.style.display === 'none') return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateDropdown(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        this.pickUser();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.closeDropdown();
      }
    }, true);

    // Handle backspace to delete the entire chip at once
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        
        const range = sel.getRangeAt(0);
        
        // 1. If cursor is blinking immediately after a mention chip
        if (range.collapsed && range.startOffset === 0 && range.startContainer.nodeType === Node.TEXT_NODE) {
          const prevSibling = range.startContainer.previousSibling;
          if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE) {
            const el = prevSibling as HTMLElement;
            if (el.hasAttribute('data-user') || el.hasAttribute('data-date')) {
              e.preventDefault();
              e.stopImmediatePropagation();
              
              // Move caret to the end of the preceding text node (if any) or stay put
              // but we MUST remove the node and stop EditorJS from touching it.
              el.remove();
              return;
            }
          }
        }
        
        // 2. If a mention chip is partially or fully selected
        const container = range.commonAncestorContainer;
        if (container && container.nodeType === Node.ELEMENT_NODE) {
          const el = container as HTMLElement;
          // Upward check: is the selection inside the span?
          const chip = el.closest('span[data-user], span[data-date]');
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

             chip.remove();
             return;
          }
          
          // Downward check: does the selection contain the span?
          const selectedFrag = range.cloneContents();
          const internalChips = selectedFrag.querySelectorAll?.('span[data-user], span[data-date]');
          if (internalChips && internalChips.length > 0) {
             e.preventDefault();
             e.stopImmediatePropagation();
             
             const realChips = el.querySelectorAll('span[data-user], span[data-date]');
             realChips.forEach(c => {
               if (sel.containsNode(c, true)) c.remove();
             });
             
             // After removing elements, the selection might be broken.
             // We'll collapse it to start to be safe.
             sel.collapseToStart();
          }
        }
      }
    }, true); // Use capture phase to catch event before EditorJS
  }

  private checkForMention() {
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

    const atIdx = before.lastIndexOf('@');
    if (atIdx === -1) { this.closeDropdown(); return; }

    // @ must be at start or preceded by whitespace
    if (atIdx > 0 && !/\s/.test(before[atIdx - 1])) {
      this.closeDropdown();
      return;
    }

    // Don't activate inside an existing mention span
    if (textNode.parentElement?.hasAttribute('data-user')) {
      this.closeDropdown();
      return;
    }

    const query = before.slice(atIdx + 1).toLowerCase();
    this.showDropdown(query);
  }
  private showDropdown(query: string) {
    const users = this.getUsers();
    
    // Add dynamic dates
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
    
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    
    const dateOptions: MentionUser[] = [
      { id: fmt(today), displayName: 'Today', icon: '📅', isDate: true },
      { id: fmt(tomorrow), displayName: 'Tomorrow', icon: '📆', isDate: true },
      { id: fmt(nextWeek), displayName: 'Next Week', icon: '🗓️', isDate: true },
      { id: 'custom', displayName: 'Custom Date/Time...', icon: '⏱️', isDate: true, isCustomDate: true }
    ];

    const allOptions = [...users, ...dateOptions];

    const filtered = query
      ? allOptions.filter(u => u.displayName.toLowerCase().includes(query))
      : allOptions;

    if (filtered.length === 0) { this.closeDropdown(); return; }

    if (!this.dropdown) {
      this.dropdown = document.createElement('div');
      this.dropdown.classList.add('mention-inline-dropdown');
      this.dropdown.style.cssText = `
        position: fixed;
        z-index: 10000;
        background: var(--pico-background-color, #fff);
        border: 1px solid var(--pico-muted-border-color, #ddd);
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        max-height: 200px;
        overflow-y: auto;
        min-width: 200px;
        padding: 4px;
      `;
      document.body.appendChild(this.dropdown);
    }

    this.dropdown.innerHTML = '';

    filtered.forEach((user, i) => {
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.classList.add('mention-opt');
      if (i === 0) opt.classList.add('mention-opt--active');
      opt.dataset.userId = user.id;
      opt.dataset.userName = user.displayName;
      if (user.isDate) opt.dataset.isDate = 'true';
      if (user.isCustomDate) opt.dataset.isCustomDate = 'true';
      opt.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
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

      // Avatar
      const av = document.createElement('span');
      av.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
        overflow: hidden;
        background: var(--pico-primary-background, #e3f2fd);
        color: var(--pico-primary, #1976d2);
        font-size: 11px;
        font-weight: 600;
      `;
      if (user.photoURL) {
        av.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" style="width:100%;height:100%;object-fit:cover;" />`;
      } else if (user.icon) {
        av.textContent = user.icon;
      } else {
        av.textContent = user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }

      const nm = document.createElement('span');
      nm.textContent = user.displayName;

      opt.appendChild(av);
      opt.appendChild(nm);

      opt.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.insertMention(user);
      });

      this.dropdown!.appendChild(opt);
    });

    // Add hover effect
    this.dropdown.querySelectorAll('.mention-opt').forEach(opt => {
      (opt as HTMLElement).addEventListener('mouseenter', () => {
        this.dropdown!.querySelectorAll('.mention-opt').forEach(o => o.classList.remove('mention-opt--active'));
        opt.classList.add('mention-opt--active');
      });
    });

    // Position near cursor
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      this.dropdown.style.left = `${rect.left}px`;
      this.dropdown.style.top = `${rect.bottom + 4}px`;
    }
    this.dropdown.style.display = 'block';
  }

  private navigateDropdown(dir: number) {
    if (!this.dropdown) return;
    const opts = Array.from(this.dropdown.querySelectorAll('.mention-opt'));
    if (!opts.length) return;
    const ai = opts.findIndex(o => o.classList.contains('mention-opt--active'));
    opts.forEach(o => o.classList.remove('mention-opt--active'));
    let ni = ai + dir;
    if (ni < 0) ni = opts.length - 1;
    if (ni >= opts.length) ni = 0;
    opts[ni].classList.add('mention-opt--active');
    (opts[ni] as HTMLElement).scrollIntoView({ block: 'nearest' });
  }

  private pickUser() {
    if (!this.dropdown) return;
    const active = this.dropdown.querySelector('.mention-opt--active') as HTMLElement;
    if (!active) return;
    const uid = active.dataset.userId || '';
    const uname = active.dataset.userName || '';
    const isDate = active.dataset.isDate === 'true';
    const isCustomDate = active.dataset.isCustomDate === 'true';

    if (isCustomDate) {
      // Save selection before losing focus
      const sel = window.getSelection();
      let range: Range | null = null;
      if (sel && sel.rangeCount) {
         range = sel.getRangeAt(0);
      }
      this.closeDropdown();
      if (range) {
         this.openCustomDatePopup(null, '', '', range);
      }
      return;
    }

    if (isDate) {
      this.insertMention({ id: uid, displayName: uname, isDate: true });
      return;
    }

    const users = this.getUsers();
    const user = users.find(u => u.id === uid);
    if (user) this.insertMention(user);
    else if (uid) this.insertMention({ id: uid, displayName: uname });
  }

  private insertMention(user: MentionUser) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) { this.closeDropdown(); return; }

    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) { this.closeDropdown(); return; }

    const textNode = range.startContainer as Text;
    const text = textNode.textContent || '';
    const cursorPos = range.startOffset;
    const before = text.slice(0, cursorPos);
    const atIdx = before.lastIndexOf('@');
    if (atIdx === -1) { this.closeDropdown(); return; }

    const prefix = text.slice(0, atIdx);
    const suffix = text.slice(cursorPos);

    // Create mention chip
    const mentionSpan = document.createElement('span');
    if (user.isDate) {
      mentionSpan.setAttribute('data-date', user.id);
      if (user.endDate) mentionSpan.setAttribute('data-end-date', user.endDate);
      mentionSpan.setAttribute('data-date-name', user.displayName);
    } else {
      mentionSpan.setAttribute('data-user', user.id);
      mentionSpan.setAttribute('data-user-name', user.displayName);
    }
    
    const block = textNode.parentElement?.closest('.ce-block');
    if (block) {
      const blockId = block.getAttribute('data-id');
      if (blockId) mentionSpan.setAttribute('data-block-id', blockId);
      
      const clRow = textNode.parentElement?.closest('.cl-row');
      if (clRow) {
        const rows = Array.from(block.querySelectorAll('.cl-row'));
        const rowIndex = rows.indexOf(clRow);
        if (rowIndex !== -1) mentionSpan.setAttribute('data-row-index', rowIndex.toString());
      }
    }

    mentionSpan.contentEditable = 'false';
    mentionSpan.style.cssText = `
      background: ${user.isDate ? 'var(--pico-secondary-background, #f5f5f5)' : 'var(--pico-primary-background, #e3f2fd)'};
      color: ${user.isDate ? 'var(--pico-secondary, #666)' : 'var(--pico-primary, #1976d2)'};
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.9em;
      margin: 0 2px;
      cursor: default;
      display: inline;
      white-space: nowrap;
      font-weight: 500;
    `;
    
    // Formatter logic same as TimelineTune
    if (user.isDate) {
      const fmt = (d: string) => {
        try {
          const isDateTime = d.includes('T');
          const dateObj = isDateTime ? new Date(d) : new Date(d + 'T00:00:00');
          const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
          if (isDateTime) {
             opts.hour = 'numeric';
             opts.minute = '2-digit';
          }
          return dateObj.toLocaleDateString('en-US', opts);
        } catch { return d; }
      };
      
      let textContent = `📅 ${fmt(user.id)}`;
      if (user.endDate && user.endDate !== user.id) {
         textContent += ` → ${fmt(user.endDate)}`;
      }
      mentionSpan.textContent = textContent;
    } else {
      mentionSpan.textContent = `@${user.displayName}`;
    }

    const parent = textNode.parentNode;
    if (!parent) { this.closeDropdown(); return; }

    const prefixNode = document.createTextNode(prefix);
    const spaceNode = document.createTextNode('\u00A0');
    const suffixNode = document.createTextNode(suffix);

    parent.insertBefore(prefixNode, textNode);
    parent.insertBefore(mentionSpan, textNode);
    parent.insertBefore(spaceNode, textNode);
    parent.insertBefore(suffixNode, textNode);
    parent.removeChild(textNode);

    // Move cursor after space
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    // Sync with Tunes for this block
    const blockEl = mentionSpan.closest('.ce-block');
    if (blockEl) {
      const blockId = blockEl.getAttribute('data-id');
      if (blockId) {
        if (user.isDate) {
          // Sync with TimelineTune
          if ((window as any).__timelineTunes?.[blockId]) {
            const tune = (window as any).__timelineTunes[blockId];
            tune.setDates(user.id, null); // Set start date
          }
        } else {
          // Sync with MentionTune
          if ((window as any).__mentionTunes?.[blockId]) {
            const tune = (window as any).__mentionTunes[blockId];
            const data = tune.getData();
            if (!data.assignedTo.includes(user.id)) {
              data.assignedTo.push(user.id);
              document.dispatchEvent(new CustomEvent('editorJS_tuneChanged'));
            }
          }
          
          // Sync with Checklist item if inside a checklist row
          const clRow = mentionSpan.closest('.cl-row') as HTMLElement;
          if (clRow && (window as any).__checklistInstances?.[blockId]) {
            const checklist = (window as any).__checklistInstances[blockId];
            checklist.assignUserToRow(clRow, user.id);
          }
        }
      }
    }

    this.closeDropdown();
  }

  private closeDropdown() {
    if (this.dropdown) {
      this.dropdown.style.display = 'none';
    }
  }

  private openCustomDatePopup(targetChip?: HTMLElement | null, initialStart?: string, initialEnd?: string, savedRange?: Range) {
    const existing = document.querySelector('.inline-date-picker');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.classList.add('inline-date-picker');
    overlay.style.cssText = `
      position: fixed;
      z-index: 10001;
      background: var(--pico-background-color, #fff);
      border: 1px solid var(--pico-muted-border-color, #ddd);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      padding: 16px;
      min-width: 260px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: inherit;
    `;

    overlay.innerHTML = `
      <div style="margin-bottom:12px;font-weight:600;font-size:14px;">Custom Date/Time</div>
      <label style="display:block;margin-bottom:8px;font-size:13px;color:var(--pico-muted-color,#666);">Start</label>
      <input type="datetime-local" id="idp-start" value="${initialStart || ''}" style="
        width:100%;padding:8px 10px;border:1px solid var(--pico-muted-border-color,#ddd);border-radius:6px;
        font-size:14px;background:var(--pico-form-element-background-color,#fff);color:inherit;margin-bottom:12px;
      " />
      <label style="display:block;margin-bottom:8px;font-size:13px;color:var(--pico-muted-color,#666);">End</label>
      <input type="datetime-local" id="idp-end" value="${initialEnd || ''}" style="
        width:100%;padding:8px 10px;border:1px solid var(--pico-muted-border-color,#ddd);border-radius:6px;
        font-size:14px;background:var(--pico-form-element-background-color,#fff);color:inherit;margin-bottom:16px;
      " />
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" id="idp-cancel" style="
          padding:6px 14px;border:1px solid var(--pico-muted-border-color,#ddd);border-radius:6px;
          background:transparent;cursor:pointer;font-size:13px;color:inherit;
        ">Cancel</button>
        <button type="button" id="idp-save" style="
          padding:6px 14px;border:none;border-radius:6px;
          background:var(--pico-primary,#1976d2);color:#fff;cursor:pointer;font-size:13px;font-weight:600;
        ">Save</button>
      </div>
    `;

    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed; top:0; left:0; right:0; bottom:0;
      background: rgba(0,0,0,0.3); z-index: 10000;
    `;
    
    const closeAll = () => {
      overlay.remove();
      backdrop.remove();
    };
    
    backdrop.addEventListener('click', closeAll);

    document.body.appendChild(backdrop);
    document.body.appendChild(overlay);

    const startInput = overlay.querySelector('#idp-start') as HTMLInputElement;
    const endInput = overlay.querySelector('#idp-end') as HTMLInputElement;

    overlay.querySelector('#idp-cancel')!.addEventListener('click', closeAll);
    
    // Auto-focus start input
    startInput.focus();
    try {
       if (typeof startInput.showPicker === 'function') {
          startInput.showPicker();
       }
    } catch (e) {
       // Ignore if browser doesn't support or blocks it
    }

    overlay.querySelector('#idp-save')!.addEventListener('click', () => {
       const sVal = startInput.value;
       const eVal = endInput.value;
       if (!sVal) {
          closeAll();
          return;
       }
       
       const fmt = (d: string) => {
          try {
            const isDateTime = d.includes('T');
            const dateObj = isDateTime ? new Date(d) : new Date(d + 'T00:00:00');
            const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
            if (isDateTime) {
               opts.hour = 'numeric';
               opts.minute = '2-digit';
            }
            return dateObj.toLocaleDateString('en-US', opts);
          } catch { return d; }
       };
       
       const dName = `Custom`; // Generic internal name for custom timelines
       
       if (targetChip) {
          // Edit existing
          targetChip.setAttribute('data-date', sVal);
          targetChip.setAttribute('data-date-name', dName);
          if (eVal) targetChip.setAttribute('data-end-date', eVal);
          else targetChip.removeAttribute('data-end-date');
          
          let textContent = `📅 ${fmt(sVal)}`;
          if (eVal && eVal !== sVal) {
             textContent += ` → ${fmt(eVal)}`;
          }
          targetChip.textContent = textContent;
          
          // Trigger mutation via editor data input to ensure autosave picks it up
          targetChip.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
       } else if (savedRange) {
          // Insert new
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(savedRange);
            this.insertMention({
               id: sVal,
               displayName: dName,
               isDate: true,
               endDate: eVal || undefined
            });
          }
       }
       
       closeAll();
    });
  }
}
