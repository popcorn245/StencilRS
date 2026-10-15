import type { BlockTool } from '@editorjs/editorjs';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  assignedTo: string[];
  createdBy: string;
  activityId?: string;
  activityTitle?: string;
}

interface ChecklistActivity {
  id: string;
  title?: string;
  name?: string;
  type?: string;
  icon?: string;
}

interface ChecklistData {
  items: ChecklistItem[];
}

interface ChecklistUser {
  id: string;
  displayName: string;
  photoURL?: string;
  icon?: string;
}

interface ChecklistConfig {
  currentUser?: string;
  users?: ChecklistUser[];
  activities?: ChecklistActivity[];
  onCreateActivity?: (text: string, itemId: string) => void;
}

/**
 * Custom Checklist Block Tool for EditorJS.
 * Each item supports multiple assigned users shown as avatar chips.
 */
export default class Checklist implements BlockTool {
  private data: ChecklistData;
  private config: ChecklistConfig;
  private readOnly: boolean;
  private wrapper: HTMLElement;
  private blockAPI: any;
  static get toolbox() {
    return {
      icon: '<svg width="15" height="15" viewBox="0 0 15 15"><path d="M2 3.5l2.5 2.5L9 2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="0" y1="7.5" x2="15" y2="7.5" stroke="currentColor" stroke-width="1"/><line x1="0" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="1"/></svg>',
      title: 'Checklist',
    };
  }

  static get isReadOnlySupported() { return true; }
  static get enableLineBreaks() { return true; }

  // No sanitize getter — EditorJS's HTML sanitizer can corrupt our complex array data

  constructor({ data, api: _api, config, readOnly, block }: any) {
    this.config = config || {};
    this.readOnly = readOnly || false;
    this.wrapper = document.createElement('div');
    this.blockAPI = block;

    const rawItems = data.items && Array.isArray(data.items) ? data.items : [];
    this.data = {
      items: rawItems.length > 0
        ? rawItems.map((i: any) => this.normalizeItem(i))
        : [this.createEmptyItem()],
    };

    // Register globally so MentionInlineTool can assign users to items
    if (!(window as any).__checklistInstances) (window as any).__checklistInstances = {};
    if (block?.id) {
      (window as any).__checklistInstances[block.id] = this;
    }
  }

  /**
   * Public: called by MentionInlineTool to assign a user to a specific checklist item.
   * Finds the item by the row element, adds userId to assignedTo, re-renders avatars.
   */
  public assignUserToRow(rowElement: HTMLElement, userId: string) {
    const rows = Array.from(this.wrapper.querySelectorAll('.cl-row'));
    const rowIndex = rows.indexOf(rowElement);
    if (rowIndex === -1) return;
    const item = this.data.items[rowIndex];
    if (!item) return;
    if (!item.assignedTo.includes(userId)) {
      item.assignedTo.push(userId);
      const avatarWrap = rowElement.querySelector('.cl-avatars') as HTMLElement;
      if (avatarWrap) this.renderAvatars(avatarWrap, item, rowIndex);
      this.notifyChange();
    }
  }

  /**
   * Public: called by global observer when a mention chip is deleted from a checklist row.
   */
  public removeUserFromRow(rowIndex: number, userId: string) {
    const item = this.data.items[rowIndex];
    if (!item) return;
    const idx = item.assignedTo.indexOf(userId);
    if (idx >= 0) {
      item.assignedTo.splice(idx, 1);
      const rowElement = this.wrapper.children[rowIndex] as HTMLElement;
      if (rowElement) {
        const avatarWrap = rowElement.querySelector('.cl-avatars') as HTMLElement;
        if (avatarWrap) this.renderAvatars(avatarWrap, item, rowIndex);
      }
      this.notifyChange();
    }
  }

  private generateId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  /** Normalize an item from any format (legacy @editorjs/list string, {content}, or our {text}) */
  private normalizeItem(raw: any): ChecklistItem {
    const id = raw.id || this.generateId();
    // Handle plain string items from @editorjs/list
    if (typeof raw === 'string') {
      return { id, text: raw, checked: false, assignedTo: [], createdBy: '' };
    }
    const text = raw.text ?? raw.content ?? '';
    const checked = !!raw.checked;
    const assignedTo = Array.isArray(raw.assignedTo) ? raw.assignedTo : (raw.assignedTo ? [raw.assignedTo] : []);
    const createdBy = raw.createdBy || '';
    return { id, text: String(text), checked, assignedTo, createdBy, activityId: raw.activityId || undefined, activityTitle: raw.activityTitle || undefined };
  }

  private createEmptyItem(): ChecklistItem {
    return { id: this.generateId(), text: '', checked: false, assignedTo: [], createdBy: this.config.currentUser || '' };
  }

  /** Notify EditorJS that block data changed so it triggers a save */
  private notifyChange() {
    if (this.blockAPI && typeof this.blockAPI.dispatchChange === 'function') {
      this.blockAPI.dispatchChange();
    }
  }

  render(): HTMLElement {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('cl-block');
    this.injectStyles();
    this.data.items.forEach((_i, idx) => this.wrapper.appendChild(this.renderItem(idx)));
    // Close any open dropdown when clicking outside
    document.addEventListener('click', () => this.closeAllDropdowns());
    return this.wrapper;
  }

  private injectStyles() {
    if (document.getElementById('cl-styles')) return;
    const s = document.createElement('style');
    s.id = 'cl-styles';
    s.textContent = `
/* Brand token — adapts automatically to dark mode */
.cl-block {
  font-family: var(--font-sans);
  --cl-brand: var(--color-purple-700);
  --cl-brand-bg: rgba(var(--color-rgb-purple-300), 0.2);
}
@media (prefers-color-scheme: dark) {
  .cl-block { --cl-brand: var(--color-purple-300); }
}

.cl-row { display:flex; align-items:center; gap:var(--size-2); padding:var(--size-2) var(--size-1); border-radius:var(--radius-md); transition:background .15s; position:relative; }
.cl-row:hover { background:rgba(128,128,128,.06); }
.cl-cb { width:var(--size-5)!important; height:var(--size-5)!important; min-width:var(--size-5); border:2px solid var(--pico-muted-border-color)!important; border-radius:5px!important;
  cursor:pointer; flex-shrink:0; display:flex!important; align-items:center; justify-content:center;
  background:transparent!important; padding:0!important; margin:0!important; transition:all .15s; }
.cl-cb:hover { border-color:var(--cl-brand)!important; }
.cl-cb--on { background:var(--cl-brand)!important; border-color:var(--cl-brand)!important; }
.cl-cb--on svg { opacity:1!important; }
.cl-cb svg { width:12px; height:12px; opacity:0; transition:opacity .15s; }

/* Avatar stack */
.cl-avatars { display:flex; align-items:center; flex-shrink:0; cursor:pointer; position:relative; }
.cl-avatar { width:var(--size-6); height:var(--size-6); border-radius:var(--radius-100); border:2px solid var(--pico-background-color); background:var(--cl-brand);
  color:#fff; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:var(--weight-bold);
  overflow:hidden; flex-shrink:0; margin-left:-6px; transition:transform .15s; }
.cl-avatar:first-child { margin-left:0; }
.cl-avatar img { width:100%; height:100%; object-fit:cover; border-radius:var(--radius-100); }
.cl-avatar:hover { transform:scale(1.15); z-index:1; }
.cl-add-user { width:var(--size-6)!important; height:var(--size-6)!important; border-radius:var(--radius-100)!important; border:1.5px dashed var(--pico-muted-border-color)!important;
  background:transparent!important; color:var(--pico-muted-color)!important; display:flex!important; align-items:center; justify-content:center;
  font-size:14px; cursor:pointer; flex-shrink:0; padding:0!important; margin:0 0 0 var(--size-1)!important; transition:all .15s; }
.cl-add-user:hover { border-color:var(--cl-brand)!important; color:var(--cl-brand)!important; }

/* Text */
.cl-text { flex:1; outline:none; border:none; font-size:15px; line-height:var(--line-md); min-height:22px; color:inherit; background:transparent; padding:0; word-break:break-word; }
.cl-text--done { text-decoration:line-through; opacity:.45; }
.cl-text[contenteditable="true"]:empty::before { content:"New task..."; color:var(--pico-muted-color); pointer-events:none; }

/* User picker dropdown */
.cl-picker { position:absolute; left:var(--size-7); top:100%; z-index:10000; background:var(--pico-dropdown-background-color); border:1px solid var(--pico-dropdown-border-color);
  border-radius:var(--pico-border-radius); box-shadow:var(--shadow-md); min-width:200px; padding:var(--size-1); display:none; }
.cl-picker--open { display:block; }
.cl-pick-opt { display:flex!important; align-items:center!important; gap:10px!important; padding:var(--size-2) var(--size-3)!important;
  border-radius:var(--radius-md)!important; cursor:pointer!important; font-size:var(--scale-00)!important; color:var(--pico-dropdown-color)!important;
  border:none!important; background:transparent!important; width:100%!important; text-align:left!important; margin:0!important; transition:background .1s!important; }
.cl-pick-opt:hover { background:var(--pico-dropdown-hover-background-color)!important; }
.cl-pick-av { width:var(--size-7); height:var(--size-7); border-radius:var(--radius-100); background:var(--cl-brand); color:#fff;
  display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:var(--weight-bold); flex-shrink:0; overflow:hidden; }
.cl-pick-av img { width:100%; height:100%; object-fit:cover; border-radius:var(--radius-100); }
.cl-pick-name { flex:1; font-weight:var(--weight-medium); }
.cl-pick-check { width:18px; height:18px; border-radius:var(--radius-xs)!important; border:2px solid var(--pico-muted-border-color)!important;
  display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; }
.cl-pick-check--on { background:var(--cl-brand)!important; border-color:var(--cl-brand)!important; }
.cl-pick-check--on svg { opacity:1!important; }
.cl-pick-check svg { width:10px; height:10px; opacity:0; }

@media(max-width:480px) {
  .cl-row { gap:6px; padding:10px 2px; }
  .cl-avatar { width:22px; height:22px; font-size:9px; }
  .cl-add-user { width:22px!important; height:22px!important; }
  .cl-text { font-size:14px; }
}

/* Mention dropdown */
.cl-mention { position:fixed; z-index:10000; background:var(--pico-dropdown-background-color); border:1px solid var(--pico-dropdown-border-color); border-radius:var(--pico-border-radius);
  box-shadow:var(--shadow-md); min-width:200px; max-width:280px; padding:var(--size-1); }
.cl-mention-opt { display:flex!important; align-items:center!important; gap:10px!important; padding:var(--size-2) var(--size-3)!important;
  border-radius:var(--radius-md)!important; cursor:pointer!important; font-size:var(--scale-00)!important; color:var(--pico-dropdown-color)!important;
  border:none!important; background:transparent!important; width:100%!important; text-align:left!important; margin:0!important; }
.cl-mention-opt:hover,.cl-mention-opt--active { background:var(--pico-dropdown-hover-background-color)!important; }
.cl-mention-av { width:var(--size-6); height:var(--size-6); border-radius:var(--radius-100); background:var(--cl-brand); color:#fff;
  display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:var(--weight-bold); flex-shrink:0; overflow:hidden; }
.cl-mention-av img { width:100%; height:100%; object-fit:cover; border-radius:var(--radius-100); }
.cl-mention-empty { padding:var(--size-3); color:var(--pico-muted-color); font-size:13px; text-align:center; font-style:italic; }

/* Activity autocomplete dropdown */
.cl-activity-dropdown { position:fixed; z-index:10001; background:var(--pico-dropdown-background-color); border:1px solid var(--pico-dropdown-border-color); border-radius:var(--pico-border-radius);
  box-shadow:var(--shadow-md); min-width:220px; max-width:320px; padding:var(--size-1); }
.cl-activity-header { padding:6px var(--size-3) 4px; font-size:11px; font-weight:var(--weight-semibold); color:var(--pico-muted-color); text-transform:uppercase; letter-spacing:var(--letter-lg); }
.cl-activity-opt { display:flex!important; align-items:center!important; gap:10px!important; padding:var(--size-2) var(--size-3)!important;
  border-radius:var(--radius-md)!important; cursor:pointer!important; font-size:var(--scale-00)!important; color:var(--pico-dropdown-color)!important;
  border:none!important; background:transparent!important; width:100%!important; text-align:left!important; margin:0!important; transition:background .1s!important; }
.cl-activity-opt:hover,.cl-activity-opt--active { background:var(--cl-brand-bg)!important; color:var(--cl-brand)!important; }
.cl-activity-icon { width:var(--size-7); height:var(--size-7); border-radius:var(--radius-md); background:linear-gradient(135deg,var(--color-purple-700),var(--color-purple-500)); color:#fff;
  display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
.cl-activity-name { flex:1; font-weight:var(--weight-medium); }
.cl-activity-type { font-size:11px; color:var(--pico-muted-color); flex-shrink:0; }
.cl-activity-linked { display:inline-flex; align-items:center; gap:var(--size-1); background:var(--cl-brand-bg); color:var(--cl-brand);
  border-radius:var(--radius-xs); padding:1px 6px; font-size:11px; font-weight:var(--weight-semibold); margin-left:var(--size-1); vertical-align:middle; }

/* "Add Activity +" row at bottom of autocomplete */
.cl-activity-divider { border:none; border-top:1px solid var(--pico-dropdown-border-color); margin:var(--size-1) 0; }
.cl-activity-add-btn { color:var(--cl-brand)!important; }
.cl-activity-add-btn .cl-activity-icon { background:transparent!important; border:1.5px dashed var(--cl-brand); color:var(--cl-brand); font-size:18px; font-weight:var(--weight-bold); }
.cl-activity-add-btn:hover { background:var(--cl-brand-bg)!important; }

/* Info icon for linked activity */
.cl-activity-info { display:inline-flex; align-items:center; justify-content:center; padding:var(--size-1); color:var(--pico-muted-color);
  border-radius:var(--radius-sm); transition:color .15s; flex-shrink:0; text-decoration:none; }
.cl-activity-info:hover { color:var(--cl-brand); }
`;
    document.head.appendChild(s);
  }

  // ─── Render a single checklist row ──────────────────────────

  private renderItem(index: number): HTMLElement {
    const item = this.data.items[index];
    const row = document.createElement('div');
    row.classList.add('cl-row');
    row.dataset.index = String(index);

    // 1) Checkbox
    const cb = document.createElement('button');
    cb.type = 'button';
    cb.classList.add('cl-cb');
    if (item.checked) cb.classList.add('cl-cb--on');
    cb.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    cb.addEventListener('click', () => {
      item.checked = !item.checked;
      cb.classList.toggle('cl-cb--on');
      txt.classList.toggle('cl-text--done');
      this.notifyChange();
    });

    // 2) Avatar stack + add button
    const avatarWrap = document.createElement('div');
    avatarWrap.classList.add('cl-avatars');
    this.renderAvatars(avatarWrap, item, index);

    // 3) Text
    const txt = document.createElement('div');
    txt.classList.add('cl-text');
    if (item.checked) txt.classList.add('cl-text--done');
    txt.contentEditable = this.readOnly ? 'false' : 'true';
    txt.innerHTML = item.text;

    // Show activity badge if already linked
    if (item.activityId && item.activityTitle) {
      txt.dataset.activityId = item.activityId;
      txt.title = `Linked to activity: ${item.activityTitle}`;
    }

    txt.addEventListener('input', () => {
      item.text = txt.innerHTML;
      // Don't show autocomplete if already linked to an activity
      if (!this.readOnly && !item.activityId) this.showActivityAutocomplete(txt, item, index);
    });

    // Capture-phase listener so we intercept backspace before EditorJS can handle it
    txt.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && item.activityId) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (window.confirm(`Untie "${item.activityTitle || 'this activity'}" from this task?`)) {
          this.unlinkActivity(txt, item);
          this.rerender();
          const focusRow = this.wrapper.children[index];
          if (focusRow) (focusRow.querySelector('.cl-text') as HTMLElement)?.focus();
        }
      }
    }, { capture: true });

    txt.addEventListener('keydown', (e) => {
      // Let the autocomplete dropdown handle arrow keys / enter — only when it's actually visible
      const dropdown = document.getElementById('cl-activity-dropdown') as HTMLElement;
      const dropdownOpen = dropdown && dropdown.style.display !== 'none';
      if (dropdownOpen) {
        if (e.key === 'ArrowDown') { e.preventDefault(); this.moveActivitySelection(dropdown, 1); return; }
        if (e.key === 'ArrowUp')   { e.preventDefault(); this.moveActivitySelection(dropdown, -1); return; }
        if (e.key === 'Enter') {
          const active = dropdown.querySelector('.cl-activity-opt--active') as HTMLElement;
          if (active) { e.preventDefault(); active.click(); return; }
        }
        if (e.key === 'Escape') { e.preventDefault(); this.closeActivityDropdown(); return; }
      }
      if (e.key === 'Enter') { e.preventDefault(); this.addItemAfter(index); }
      if (e.key === 'Backspace') {
        if (!txt.textContent?.trim() && this.data.items.length > 1) { e.preventDefault(); this.removeItem(index); }
      }
    });

    txt.addEventListener('blur', () => {
      // Delay close so click on dropdown option still fires
      setTimeout(() => this.closeActivityDropdown(), 150);
    });

    row.appendChild(cb);
    row.appendChild(avatarWrap);
    row.appendChild(txt);

    // Info icon — only shown when this item is linked to an activity
    if (item.activityId) {
      row.appendChild(this.buildInfoButton(item.activityId, item.activityTitle || item.activityId));
    }

    return row;
  }

  private readonly infoIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="none" stroke="currentColor" stroke-width="32"><path d="M248,64C146.39,64,64,146.39,64,248s82.39,184,184,184,184-82.39,184-184S349.61,64,248,64Z" stroke-miterlimit="10"/><polyline points="220 220 252 220 252 336" stroke-linecap="round" stroke-linejoin="round"/><line x1="208" y1="340" x2="296" y2="340" stroke-linecap="round" stroke-miterlimit="10"/><path d="M248,130a26,26,0,1,0,26,26A26,26,0,0,0,248,130Z" fill="currentColor" stroke="none"/></svg>`;

  private buildInfoButton(activityId: string, label: string): HTMLElement {
    const a = document.createElement('a');
    a.href = `/activities/${activityId}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.classList.add('cl-activity-info');
    a.title = `View activity: ${label}`;
    a.innerHTML = this.infoIconSvg;
    // Prevent EditorJS from intercepting the click
    a.addEventListener('mousedown', e => e.stopPropagation());
    return a;
  }

  // ─── Avatar rendering ──────────────────────────────────────

  private renderAvatars(wrap: HTMLElement, item: ChecklistItem, index: number) {
    wrap.innerHTML = '';
    const users = this.config.users || [];

    // Show assigned user avatars
    item.assignedTo.forEach(uid => {
      const user = users.find(u => u.id === uid);
      const av = document.createElement('span');
      av.classList.add('cl-avatar');
      av.title = user ? user.displayName : uid;
      if (user?.photoURL) {
        av.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" />`;
      } else if (user?.icon) {
        av.textContent = user.icon;
      } else {
        av.textContent = (user ? user.displayName : uid).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }
      wrap.appendChild(av);
    });

    // "+" button to open user picker
    if (!this.readOnly && users.length > 0) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.classList.add('cl-add-user');
      addBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      addBtn.title = 'Assign user';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePicker(wrap, item, index);
      });
      wrap.appendChild(addBtn);
    }
  }

  // ─── User picker dropdown ──────────────────────────────────

  private togglePicker(avatarWrap: HTMLElement, item: ChecklistItem, index: number) {
    // Close other open pickers
    this.closeAllDropdowns();

    let picker = avatarWrap.querySelector('.cl-picker') as HTMLElement;
    if (!picker) {
      picker = document.createElement('div');
      picker.classList.add('cl-picker');
      avatarWrap.appendChild(picker);
    }

    this.buildPickerOptions(picker, item, avatarWrap, index);
    picker.classList.add('cl-picker--open');
  }

  private buildPickerOptions(picker: HTMLElement, item: ChecklistItem, avatarWrap: HTMLElement, index: number) {
    picker.innerHTML = '';
    const users = this.config.users || [];

    users.forEach(user => {
      const isAssigned = item.assignedTo.includes(user.id);
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.classList.add('cl-pick-opt');

      // Avatar
      const av = document.createElement('span');
      av.classList.add('cl-pick-av');
      if (user.photoURL) {
        av.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" />`;
      } else if (user.icon) {
        av.textContent = user.icon;
      } else {
        av.textContent = user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }

      // Name
      const name = document.createElement('span');
      name.classList.add('cl-pick-name');
      name.textContent = user.displayName;

      // Checkbox indicator
      const chk = document.createElement('span');
      chk.classList.add('cl-pick-check');
      if (isAssigned) chk.classList.add('cl-pick-check--on');
      chk.innerHTML = '<svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      opt.appendChild(av);
      opt.appendChild(name);
      opt.appendChild(chk);

      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isAssigned) {
          item.assignedTo = item.assignedTo.filter(id => id !== user.id);
        } else {
          item.assignedTo.push(user.id);
        }
        this.notifyChange();
        this.renderAvatars(avatarWrap, item, index);
        // Reopen picker after re-render
        const newPicker = avatarWrap.querySelector('.cl-picker') as HTMLElement;
        if (newPicker) {
          this.buildPickerOptions(newPicker, item, avatarWrap, index);
          newPicker.classList.add('cl-picker--open');
        }
      });

      picker.appendChild(opt);
    });
  }

  // ─── Activity autocomplete ──────────────────────────────────

  private showActivityAutocomplete(txtEl: HTMLElement, item: ChecklistItem, index: number) {
    const activities: ChecklistActivity[] = this.config.activities ||
      (window as any).__checklistAvailableActivities || [];

    if (!activities.length) return;

    const query = (txtEl.textContent || '').trim().toLowerCase();

    // Filter by query (show top matches, all if query is empty)
    const matches = query.length === 0
      ? activities.slice(0, 8)
      : activities.filter(a => (a.title || a.name || '').toLowerCase().includes(query)).slice(0, 8);

    if (!matches.length) { this.closeActivityDropdown(); return; }

    // Reuse existing dropdown or create one
    let dropdown = document.getElementById('cl-activity-dropdown') as HTMLElement;
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'cl-activity-dropdown';
      dropdown.classList.add('cl-activity-dropdown');
      document.body.appendChild(dropdown);
    }

    dropdown.innerHTML = `<div class="cl-activity-header">Activities</div>`;

    matches.forEach((activity, i) => {
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.classList.add('cl-activity-opt');
      if (i === 0) opt.classList.add('cl-activity-opt--active');

      const iconEl = document.createElement('span');
      iconEl.classList.add('cl-activity-icon');
      iconEl.textContent = activity.icon || (activity.type === 'habit' ? '⚡' : '✓');

      const nameEl = document.createElement('span');
      nameEl.classList.add('cl-activity-name');
      // Use activity.name if available, fallback to activity.title
      nameEl.textContent = activity.name || activity.title || 'Unnamed Activity';

      const typeEl = document.createElement('span');
      typeEl.classList.add('cl-activity-type');
      typeEl.textContent = activity.type || '';

      opt.appendChild(iconEl);
      opt.appendChild(nameEl);
      opt.appendChild(typeEl);

      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.selectActivity(txtEl, item, index, activity);
      });

      dropdown.appendChild(opt);
    });

    // "Add Activity +" button
    const divider = document.createElement('hr');
    divider.classList.add('cl-activity-divider');
    dropdown.appendChild(divider);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.classList.add('cl-activity-opt', 'cl-activity-add-btn');

    const addIcon = document.createElement('span');
    addIcon.classList.add('cl-activity-icon');
    addIcon.textContent = '+';

    const addLabel = document.createElement('span');
    addLabel.classList.add('cl-activity-name');
    addLabel.textContent = 'Add Activity';

    addBtn.appendChild(addIcon);
    addBtn.appendChild(addLabel);

    addBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const text = (txtEl.textContent || '').trim();
      this.closeActivityDropdown();
      if (this.config.onCreateActivity) {
        this.config.onCreateActivity(text, item.id);
      } else {
        document.dispatchEvent(new CustomEvent('cl-create-activity', { detail: { text, itemId: item.id } }));
      }
    });
    dropdown.appendChild(addBtn);

    // Position dropdown below the text element
    const rect = txtEl.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.display = 'block';
  }

  private selectActivity(txtEl: HTMLElement, item: ChecklistItem, index: number, activity: ChecklistActivity) {
    const activityName = activity.title || activity.name || 'Unnamed Activity';
    // Fill in the text with the activity title (plain text, not HTML)
    txtEl.textContent = activityName;
    item.text = activityName;
    item.activityId = activity.id;
    item.activityTitle = activityName;

    this.closeActivityDropdown();
    this.notifyChange();

    // Update the ActivityTune for this block so the tune reflects the linked activity
    const blockId = this.blockAPI?.id;
    if (blockId && (window as any).__activityTunes?.[blockId]) {
      (window as any).__activityTunes[blockId].setActivity(activity.id, activity.title || activity.name);
    }

    // Rerender to show the info icon on this row
    this.rerender();
    const focusRow = this.wrapper.children[index];
    if (focusRow) (focusRow.querySelector('.cl-text') as HTMLElement)?.focus();
  }

  private moveActivitySelection(dropdown: HTMLElement, direction: number) {
    const opts = Array.from(dropdown.querySelectorAll('.cl-activity-opt')) as HTMLElement[];
    if (!opts.length) return;
    const activeIdx = opts.findIndex(o => o.classList.contains('cl-activity-opt--active'));
    opts[activeIdx]?.classList.remove('cl-activity-opt--active');
    const nextIdx = (activeIdx + direction + opts.length) % opts.length;
    opts[nextIdx]?.classList.add('cl-activity-opt--active');
    opts[nextIdx]?.scrollIntoView({ block: 'nearest' });
  }

  private closeActivityDropdown() {
    const dropdown = document.getElementById('cl-activity-dropdown');
    if (dropdown) dropdown.style.display = 'none';
  }

  private unlinkActivity(txtEl: HTMLElement, item: ChecklistItem) {
    item.activityId = undefined;
    item.activityTitle = undefined;
    delete txtEl.dataset.activityId;
    txtEl.title = '';
    // Also clear the block-level ActivityTune
    const blockId = this.blockAPI?.id;
    if (blockId && (window as any).__activityTunes?.[blockId]) {
      (window as any).__activityTunes[blockId].setActivity(null, null);
    }
    this.notifyChange();
  }

  private closeAllDropdowns() {
    document.querySelectorAll('.cl-picker--open').forEach(p => p.classList.remove('cl-picker--open'));
  }


  // ─── Item management ───────────────────────────────────────

  private addItemAfter(index: number) {
    this.data.items.splice(index + 1, 0, this.createEmptyItem());
    this.rerender();
    const row = this.wrapper.children[index + 1];
    if (row) (row.querySelector('.cl-text') as HTMLElement)?.focus();
  }

  private removeItem(index: number) {
    this.data.items.splice(index, 1);
    this.rerender();
    const prev = Math.max(0, index - 1);
    const row = this.wrapper.children[prev];
    if (row) {
      const t = row.querySelector('.cl-text') as HTMLElement;
      if (t) {
        t.focus();
        const r = document.createRange(); r.selectNodeContents(t); r.collapse(false);
        const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r);
      }
    }
  }

  private rerender() {
    this.wrapper.innerHTML = '';
    this.data.items.forEach((_i, idx) => this.wrapper.appendChild(this.renderItem(idx)));
  }

  save(_blockContent: HTMLElement) {
    // Re-read text from the live DOM to avoid stale closure references
    const rows = this.wrapper.querySelectorAll('.cl-row');
    rows.forEach((row, idx) => {
      if (this.data.items[idx]) {
        const textEl = row.querySelector('.cl-text') as HTMLElement;
        if (textEl) {
          this.data.items[idx].text = textEl.innerHTML;
        }
      }
    });

    const output = {
      items: this.data.items.map(item => ({
        id: item.id,
        text: item.text,
        checked: item.checked,
        assignedTo: item.assignedTo,
        createdBy: item.createdBy,
        ...(item.activityId ? { activityId: item.activityId, activityTitle: item.activityTitle } : {}),
      })),
    };
    console.log('[Checklist] save() =>', JSON.stringify(output));
    return output;
  }
}
