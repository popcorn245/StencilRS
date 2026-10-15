export default class TagTune {
  private config: any;
  private tags: string[];
  private availableTags: any[];
  private api: any;

  static get isTune() {
    return true;
  }

  constructor({ data, config, block, api }) {
    this.config = config || {};
    this.tags = data || []; 
    // Clone available tags to allow optimistic additions
    this.availableTags = [...(this.config.availableTags || [])];
    this.api = api;
    
    // Safety check: Make sure already selected tags are always available in the UI dropdown
    for (const tag of this.tags) {
      if (!this.availableTags.find(t => t.id === tag || t.name === tag)) {
        this.availableTags.push({ id: tag, name: tag });
      }
    }
    
    // Register by block ID so editor onChange can sync hashtags inline
    if (!(window as any).__tagTunes) (window as any).__tagTunes = {};
    if (block?.id) {
       (window as any).__tagTunes[block.id] = this;
    }
    
    this.setupCreationListener();
  }

  private popoverItems: any[] = [];
  private readonly icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
  private readonly checkedIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  public handleCustomCreate(tagName: string) {
      if (!tagName) return;

      const exists = this.availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
      if (exists) {
         this.toggleTagSelection(exists.id || exists.name);
      } else if (this.config.onTagCreated) {
         this.config.onTagCreated(tagName);
         const tagId = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
         this.availableTags.push({ id: tagId, name: tagName });
         
         // Dynamically inject into EditorJS popup reference
         this.popoverItems.push({
            icon: `<div style="display: flex; align-items: center; gap: 8px;">${this.checkedIcon}<div style="width: 12px; height: 12px; border-radius: 50%; background-color: #0077cc; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1); margin-top: 1px;"></div></div>`,
            title: tagName,
            isActive: true,
            closeOnActivate: false,
            onActivate: (item: any, e: Event) => {
               if (e) e.preventDefault();
               this.toggleTagSelection(tagId);
               item.isActive = !item.isActive;
               const newCheckOrSpace = item.isActive ? this.checkedIcon : `<div style="width: 20px;"></div>`;
               const newDotHtml = `<div style="width: 12px; height: 12px; border-radius: 50%; background-color: #0077cc; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1); margin-top: 1px;"></div>`;
               item.icon = `<div style="display: flex; align-items: center; gap: 8px;">${newCheckOrSpace}${newDotHtml}</div>`;
            }
         });
         
         this.toggleTagSelection(tagId);
      }
  }

  public appendAvailableTag(tag: { id: string, name: string }) {
      const exists = this.availableTags.find(t => t.id === tag.id || t.name === tag.name);
      if (!exists) {
         this.availableTags.push(tag);
      }
  }

  private toggleTagSelection(idOrName: string) {
    if (this.tags.includes(idOrName)) {
        this.tags = this.tags.filter(t => t !== idOrName);
    } else {
        this.tags.push(idOrName);
    }
    
    this.updatePopoverTitle();
    
    this.updatePopoverTitle();

    // Force Editor.js to recognize the change natively to trigger auto-save
    if (this.api && this.api.events && typeof this.api.events.emit === 'function') {
         try {
            const currentBlockIndex = this.api.blocks.getCurrentBlockIndex();
            const blockApi = this.api.blocks.getBlockByIndex(currentBlockIndex);
            if (blockApi) {
                const blockEl = blockApi.holder;
                const editable = blockEl?.querySelector('[contenteditable="true"]');
                if (editable) {
                   editable.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
         } catch(e) {}
    } else {
        document.dispatchEvent(new CustomEvent('editorJS_tuneChanged'));
    }
  }

  public removeTag(tagNameOrId: string) {
    if (this.tags.includes(tagNameOrId)) {
        this.tags = this.tags.filter(t => t !== tagNameOrId);
        this.updatePopoverTitle();
        
        // Force Editor.js to recognize the change natively
        if (this.api && this.api.events && typeof this.api.events.emit === 'function') {
             try {
                const currentBlockIndex = this.api.blocks.getCurrentBlockIndex();
                const blockApi = this.api.blocks.getBlockByIndex(currentBlockIndex);
                if (blockApi) {
                    const blockEl = blockApi.holder;
                    const editable = blockEl?.querySelector('[contenteditable="true"]');
                    if (editable) {
                       editable.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
             } catch(e) {}
        } else {
            document.dispatchEvent(new CustomEvent('editorJS_tuneChanged'));
        }
    }
  }

  private updatePopoverTitle() {
      // Find the specific tune item title dynamically in the Editor DOM
      // We look for any element holding "Tag Selected" or "Select Tags" 
      // which corresponds to this tune, mostly in the nearest active popover
      const activeTitles = document.querySelectorAll('.ce-popover-item__title');
      const newTitle = this.tags.length === 0 ? 'Select Tags' : `${this.tags.length} Tag${this.tags.length === 1 ? '' : 's'} Selected`;
      
      activeTitles.forEach(t => {
          const txt = t.textContent || '';
          if (txt.includes('Tag Selected') || txt === 'Select Tags') {
              t.textContent = newTitle;
          }
      });
  }

  public syncHashtags(extractedNames: string[]) {
      let changed = false;
      
      // Add any newly typed hashtags to the tune's internal state
      for (const name of extractedNames) {
          const exists = this.availableTags.find(t => t.name.toLowerCase() === name.toLowerCase());
          const tagId = exists ? (exists.id || exists.name) : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          
          if (!this.tags.includes(tagId) && !this.tags.includes(name)) {
              this.tags.push(tagId);
              changed = true;
              
              // Optimistically auto-create the tag if it's completely new
              if (!exists && this.config.onTagCreated) {
                 this.config.onTagCreated(name);
                 this.availableTags.push({ id: tagId, name: name });
                 
                 this.popoverItems.push({
                    icon: this.checkedIcon,
                    title: name,
                    isActive: true,
                    closeOnActivate: false,
                    onActivate: (item: any, e: Event) => {
                       if (e) e.preventDefault();
                       this.toggleTagSelection(tagId);
                       item.isActive = !item.isActive;
                       const newCheckOrSpace = item.isActive ? this.checkedIcon : `<div style="width: 20px;"></div>`;
                       const newDotHtml = `<div style="width: 12px; height: 12px; border-radius: 50%; background-color: #0077cc; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1); margin-top: 1px;"></div>`;
                       item.icon = `<div style="display: flex; align-items: center; gap: 8px;">${newCheckOrSpace}${newDotHtml}</div>`;
                    }
                 });
              }
          }
      }
      
      if (changed) {
          this.updatePopoverTitle();
          document.dispatchEvent(new CustomEvent('editorJS_tuneChanged'));
      }
  }

  private isTagLocked(idOrName: string): boolean {
      if (!(this as any).block?.holder) return false;
      const html = (this as any).block.holder.innerHTML || '';
      // Quick check if the tag is hardcoded in the block text
      return html.includes(`data-tag="${idOrName}"`) || html.includes(`>#${idOrName}<`);
  }

  render() {
    // When the settings menu is rendered for this block, it becomes the active instance
    (window as any).__activeTagTuneInstance = this;

    // Sort available tags: selected first, then alphabetical
    const sortedTags = [...this.availableTags].sort((a, b) => {
      const aId = a.id || a;
      const bId = b.id || b;
      const aName = a.name || aId;
      const bName = b.name || bId;

      const aSelected = this.tags.includes(aId) || this.tags.includes(aName);
      const bSelected = this.tags.includes(bId) || this.tags.includes(bName);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return String(aName).localeCompare(String(bName));
    });

    this.popoverItems = sortedTags.map(tag => {
      const tagId = tag.id || tag;
      const tagName = tag.name || tagId;
      
      const isSelected = this.tags.includes(tagId) || this.tags.includes(tagName);
      const isLocked = this.isTagLocked(tagId) || this.isTagLocked(tagName);
      
      const checkOrSpace = isSelected ? this.checkedIcon : `<div style="width: 20px;"></div>`;
      const dotHtml = `<div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${tag.color || '#0077cc'}; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1); margin-top: 1px;"></div>`;
      
      return {
        icon: `<div style="display: flex; align-items: center; gap: 8px;">${checkOrSpace}${dotHtml}</div>`,
        title: tag.name + (isLocked ? ' (locked)' : ''),
        isActive: isSelected, // highlights the background slightly
        closeOnActivate: false,
        onActivate: (item: any, e: Event) => {
          if (e) e.preventDefault();
          if (isLocked) return; // Prevent toggling if it's in text
          
          this.toggleTagSelection(tag.id || tag.name);
          // Manually toggle internal state for visual feedback without closing
          item.isActive = !item.isActive;
          item.icon = `<div style="display: flex; align-items: center; gap: 8px;">${item.isActive ? this.checkedIcon : `<div style="width: 20px;"></div>`}${dotHtml}</div>`;
        }
      };
    });

    // In Editor.js ^2.29+, returning an object configures the main button and its popover children
    return {
      icon: this.icon,
      name: 'tagTune',
      title: this.tags.length === 0 ? 'Select Tags' : `${this.tags.length} Tag${this.tags.length === 1 ? '' : 's'} Selected`,
      children: {
        items: this.popoverItems.length > 0 ? this.popoverItems : [{
           icon: `<div style="width: 20px;"></div>`,
           title: 'No tags available',
           closeOnActivate: false,
           onActivate: () => {}
        }],
        searchable: true,
        onSearch: () => {
           // We keep onSearch just to ensure EditorJS filters correctly via the native mechanism
           // The creation logic is handled by setupCreationListener grabbing the value natively.
        }
      }
    };
  }

  // We can attach a global or bound listener once when the tune is constructed 
  // to intercept 'Enter' in the editor's tune search box
  private setupCreationListener() {
      if ((window as any).__tagTuneListenerAttached) return;
      (window as any).__tagTuneListenerAttached = true;

      document.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement;
              // Check if we are inside an EditorJS popover search robustly
              if (target && target.tagName === 'INPUT' && (target.closest('.ce-popover') || target.className.includes('search') || target.placeholder === 'Filter')) {
                 const query = target.value.trim();
                 
                 if (query) {
                     e.preventDefault();
                     e.stopPropagation();
                     
                     // Call handleCustomCreate on the actively opened block tune
                     const instance = (window as any).__activeTagTuneInstance;
                     if (instance && typeof instance.handleCustomCreate === 'function') {
                         instance.handleCustomCreate(query);
                     }
                     
                     // Clear the input and hide popover manually
                     target.value = '';
                     
                     // Try to close popover by blurring and simulating Escape
                     target.blur();
                     target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                 }
              }
          }
      }, true); // Use capture phase to ensure we intercept Enter before EditorJS does anything weird
  }

  save() {
    return this.tags;
  }
}
