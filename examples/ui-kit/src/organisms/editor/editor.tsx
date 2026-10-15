import { Component, Host, h, Prop, State, Element, Event, EventEmitter, Method } from '@stencil/core';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import ImageTool from '@editorjs/image';
import Embed from '@editorjs/embed';
import Paragraph from 'editorjs-paragraph-with-alignment';
import Table from '@editorjs/table';
import Undo from 'editorjs-undo';
import { StyleInlineTool } from 'editorjs-style';
import ChangeCase from 'editorjs-change-case';
import DragDrop from 'editorjs-drag-drop';
import MonacoCode from './MonacoCode';
import Checklist from './Checklist';
import AssistantLauncher from './AssistantLauncher';
import TagTune from './TagTune';
import TaskBlock from './TaskBlock';
import HashtagInlineTool from './HashtagInlineTool';
import MentionTune from './MentionTune';
import TimelineTune from './TimelineTune';
import MentionInlineTool from './MentionInlineTool';
import LinkInlineTool from './LinkInlineTool';
import CopyLinkTune from './CopyLinkTune';
import PollBlock from './PollBlock';
import ActivityTune from './ActivityTune';
import MultiBlockSelectionPlugin from 'editorjs-multiblock-selection-plugin';
import AiBlock from './AiBlock';
import AiInlineTool from './AiInlineTool';
import ButtonBlock from './ButtonBlock';
import DividerBlock from './DividerBlock';
import ColumnsBlock from './ColumnsBlock';
import RawMjml from './RawMjml';
import VisibilityConditionTune from './VisibilityConditionTune';

/**
 * @name pop-editor
 * @description A rich text editor built using Editor.js, natively supporting Code (via Monaco), Headers, Images, embeds, lists, and drag-and-drop mechanics.
 * 
 * Supports two-way binding with JSON stringified data and automatic debounced sync events.
 */
@Component({
  tag: 'pop-editor',
  styleUrl: 'editor.css',
})
export class Editor {
  @Element() el!: HTMLElement;

  /**
   * The current Editor.js document data representation (stringified JSON)
   */
  @Prop() value?: string = '{}';
  @Prop() currentUser?: string;
  @Prop() users?: string = '[]';
  @Prop() tags?: string = '[]';
  @Prop() recentNotes?: string = '[]';
  @Prop() activities?: string = '[]';

  /**
   * Quest ID for creating tasks linked to this quest (used by TaskBlock)
   */
  @Prop() questId?: string;

  /**
   * Default AI model for AiBlock (optional, defaults to Gemma 4)
   */
  @Prop() aiModel?: string;

  /**
   * Comma-separated feature flags to disable. Recognised values:
   *  - `ai`   — skip the Ollama probe, omit AiBlock + AiInlineTool tools.
   *  - `task` — omit TaskBlock + the `[ ]` paragraph→task auto-conversion.
   *
   * Use from tasks-app where the editor is a plain note pane (no AI, no
   * cross-collection task creation): `<pop-editor disable="ai,task" ... />`.
   */
  @Prop() disable: string = '';

  /**
   * Opt-in: enable the `[[wiki-link]]` inline tool (notes-app Phase 3). When on,
   * typing `[[` opens a note-title autocomplete and inserts an inline link chip
   * carrying the target noteId. The autocomplete + lazy-create resolve through
   * host-provided globals (`window.__notesLinkSearch` / `__notesLinkCreate` /
   * `__notesLinkNavigate`) so ui-kit stays decoupled from notes-app's data layer.
   * Off by default — the main app's editor is unaffected.
   */
  @Prop() wikilinks: boolean = false;

  /**
   * Opt-in: add an "Ask the Assistant" entry to the slash / block "+" menu
   * (notes-app WS3). Selecting it does NOT insert a block — it dispatches a
   * `notes-app:open-assistant` window event (verb `build`) that the host app's
   * unified Assistant (WS2) listens for, then removes its own placeholder block.
   * This reuses the SAME invocation path as the selection toolbar (no second
   * assistant). Off by default so other pop-editor hosts are unaffected.
   */
  @Prop() assistantSlash: boolean = false;

  private get disableList(): string[] {
    return (this.disable || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  /**
   * Build a block's inlineToolbar, dropping tools that aren't registered for the
   * current `disable` config. Without this, referencing e.g. `aiInline` in a
   * block's inlineToolbar while `disable="ai"` left it unregistered makes
   * Editor.js throw `Cannot read properties of undefined (reading 'sanitizeConfig')`
   * during save(). (notes-app mounts the editor with disable="ai,task".)
   */
  private inlineFor(tools: string[]): string[] {
    const off = this.disableList;
    const blocked = new Set<string>();
    if (off.includes('ai')) blocked.add('aiInline');
    // `link` (the [[wiki-link]] tool) is opt-in; drop it from inlineToolbars
    // unless enabled so we never reference an unregistered tool (which would
    // crash save() with the sanitizeConfig error).
    if (!this.wikilinks) blocked.add('link');
    return tools.filter((t) => !blocked.has(t));
  }

  @State() selectedBlockIds: string[] = [];
  @State() isMenuOpen: boolean = false;
  @State() menuX: number = 0;
  @State() menuY: number = 0;
  @State() actionState: 'none' | 'tag' | 'assign' | 'move' = 'none';

  /**
   * Emitted roughly every time Editor's internal content changes.
   * Event `detail` will contain the EditorJS DocumentData `OutputData`.
   */
  @Event() editorChange: EventEmitter<OutputData>;

  /**
   * Called when a Functional block executes `blocks.query()`.
   * Can be listened to via `onQueryData={}` natively or `document.addEventListener('queryData')`.
   */
  @Event() queryData: EventEmitter<any>;

  /**
   * A promise-returning function allowing Astro to resolve deep queries 
   * (e.g., from Firestore) when requested by a Functional block.
   */
  @Prop() resolveQuery?: (options: any) => Promise<any>;

  @State() saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  private editorInstance: EditorJS;
  private timer: any;
  private blockSelection: any;
  private editorId: string = 'editorjs-' + Math.random().toString(36).substring(2, 10);

  componentWillLoad() {
    this.editorId = 'editor-js-' + Math.random().toString(36).substr(2, 9);
    document.addEventListener('bulkAssignBlocks', this.handleBulkAssign as EventListener);
    document.addEventListener('bulkMoveBlocks', this.handleBulkMove as EventListener);
    document.addEventListener('bulkTagBlocks', this.handleBulkTag as EventListener);
  }

  async componentDidLoad() {
    // Probe Ollama availability so AI tools can conditionally show themselves
    // via `window.__ollamaAvailable`. Skipped when ai is disabled (e.g.,
    // tasks-app) so we don't fire a cross-origin request that always trips
    // CORS in the console even though the catch handles it.
    if (!this.disableList.includes('ai')) {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 3000);
        const r = await fetch('https://ollama.popcorn245.com/api/version', { signal: ctrl.signal });
        clearTimeout(timeout);
        (window as any).__ollamaAvailable = r.ok;
      } catch {
        // CORS may block browser-side check; fall back to true so the AI
        // block is still available (generation routes through the server API).
        (window as any).__ollamaAvailable = true;
      }
    } else {
      (window as any).__ollamaAvailable = false;
    }
    this.initEditor();
  }

  disconnectedCallback() {
      window.removeEventListener('editorjs-block-selection-changed', this.handleSelectionChange);
      document.removeEventListener('bulkAssignBlocks', this.handleBulkAssign as EventListener);
      document.removeEventListener('bulkMoveBlocks', this.handleBulkMove as EventListener);
      document.removeEventListener('bulkTagBlocks', this.handleBulkTag as EventListener);
      if (this.blockSelection) {
          this.blockSelection.unlisten();
      }
      if (this.editorInstance && typeof this.editorInstance.destroy === 'function') {
         try { this.editorInstance.destroy(); } catch (e) { console.error(e); }
      }
  }
  /**
   * Retrieves the raw JSON structure of all blocks currently inside the editor.
   * Useful for querying functional blocks or parsing data externally before submission.
   */
  @Method()
  async getEditorBlocks(): Promise<OutputData | null> {
    if (!this.editorInstance) return null;
    try {
      await this.editorInstance.isReady;
      return await this.editorInstance.save();
    } catch (e) {
      console.error('pop-editor: Failed to extract blocks', e);
      return null;
    }
  }

  /**
   * Instantly replaces the entire document's content with new data.
   * This is destructive to strict cursor positions, use with caution.
   */
  @Method()
  async dangerouslyUpdateEditor(newData: OutputData): Promise<void> {
    if (!this.editorInstance) return;
    try {
      await this.editorInstance.isReady;
      await this.editorInstance.render(newData);
    } catch (e) {
      console.error('pop-editor: Failed to dynamically update editor', e);
    }
  }

  /**
   * Gets the block ID of the currently focused/active block if any.
   */
  @Method()
  async getActiveBlockId(): Promise<string | null> {
    if (!this.editorInstance) return null;
    try {
      const index = this.editorInstance.blocks.getCurrentBlockIndex();
      if (index >= 0) {
        const block = this.editorInstance.blocks.getBlockByIndex(index);
        return block?.id || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Focuses the editor caret at the end of the very last block.
   */
  @Method()
  async focusLastBlock(): Promise<void> {
    if (!this.editorInstance) return;
    try {
      await this.editorInstance.isReady;
      const count = this.editorInstance.blocks.getBlocksCount();
      if (count > 0) {
        this.editorInstance.caret.setToBlock(count - 1, 'end');
      } else {
        this.editorInstance.focus();
      }
    } catch (e) {
      console.warn('pop-editor: Failed to focus last block', e);
    }
  }

  /**
   * Retrieves the block IDs of all currently selected blocks.
   */
  @Method()
  async getSelectedBlocks(): Promise<string[]> {
      if (!this.editorInstance) return [];
      try {
          const count = this.editorInstance.blocks.getBlocksCount();
          const selectedIds: string[] = [];
          for (let i = 0; i < count; i++) {
              const blockApi = this.editorInstance.blocks.getBlockByIndex(i);
              if (!blockApi) continue;

              let isSelected = false;
              // Method 1: Check undocumented .selected property
              if ((blockApi as any).selected) {
                  isSelected = true;
              }
              // Method 2: Check the holder DOM element for the selection class
              if (!isSelected && blockApi.holder) {
                  if (blockApi.holder.classList.contains('ce-block--selected')) {
                      isSelected = true;
                  }
              }
              
              if (isSelected) {
                  selectedIds.push(blockApi.id);
              }
          }
          console.log('[pop-editor] Decoded selected block IDs:', selectedIds);
          return selectedIds;
      } catch (e) {
          console.error('pop-editor: Failed to get selected blocks', e);
          return [];
      }
  }

  private handleBulkAssign = () => {
      this.selectedBlockIds = [];
      this.isMenuOpen = false;
      this.actionState = 'none';
  };

  private handleBulkMove = () => {
      this.selectedBlockIds = [];
      this.isMenuOpen = false;
      this.actionState = 'none';
  };

  private handleBulkTag = () => {
      this.selectedBlockIds = [];
      this.isMenuOpen = false;
      this.actionState = 'none';
  };

  private handleSelectionChange = (event: CustomEvent) => {
    console.log('[pop-editor] SELECTION CHANGE EVENT FIRED:', event.detail);
    if (event.detail && Array.isArray(event.detail.selectedBlocks)) {
        const blocks = event.detail.selectedBlocks;
        console.log('[pop-editor] Selected blocks array length:', blocks.length);
        if (blocks.length > 1) {
            const ids = blocks.map((b: any) => b.blockId).filter(Boolean);
            this.selectedBlockIds = ids.length === blocks.length ? ids : this.resolveIdsFromIndexes(blocks);
            console.log('[pop-editor] Resolved IDs:', this.selectedBlockIds);
            this.positionMenu();
        } else {
            console.log('[pop-editor] Less than 2 blocks selected, hiding menu.');
            this.selectedBlockIds = [];
            this.actionState = 'none';
            this.isMenuOpen = false;
        }
    }
  };

  private resolveIdsFromIndexes(blocks: any[]): string[] {
      const ids: string[] = [];
      for(const b of blocks) {
          const blockApi = this.editorInstance.blocks.getBlockByIndex(b.index);
          if (blockApi) ids.push(blockApi.id);
      }
      return ids;
  }

  private positionMenu = () => {
      // Find the first selected block by its ID from the DOM
      if (this.selectedBlockIds.length > 0) {
          const firstId = this.selectedBlockIds[0];
          const firstSelected = this.el.querySelector(`.ce-block[data-id="${firstId}"]`) as HTMLElement;
          
          if (firstSelected) {
              const rect = firstSelected.getBoundingClientRect();
              
              // Use viewport coordinates directly so the menu works even inside
              // overflow:auto containers (e.g. sticky note cards)
              this.menuX = Math.max(8, rect.left);
              // Position slightly above the first block
              this.menuY = Math.max(8, rect.top - 50);
              console.log(`[pop-editor] Setting menu position to X: ${this.menuX}, Y: ${this.menuY}`);
              this.isMenuOpen = true;
              this.actionState = 'none';
          } else {
              console.warn('[pop-editor] positionMenu: Could not find block element for ID', firstId);
          }
      }
  };

  private initEditor() {
    let initialData: OutputData = { blocks: [] };
    try {
      if (this.value) {
        const parsed = JSON.parse(this.value);
        if (parsed && typeof parsed === 'object') {
           initialData = { ...initialData, ...parsed };
        }
      }
    } catch (e) {
      console.warn('pop-editor: Failed to parse initial value', e);
    }

    // Populate global available tags for inline # autocomplete
    try {
      (window as any).__hashtagAvailableTags = JSON.parse(this.tags || '[]');
    } catch { (window as any).__hashtagAvailableTags = []; }

    // Populate global available users for inline @ autocomplete
    try {
      (window as any).__mentionAvailableUsers = JSON.parse(this.users || '[]');
    } catch { (window as any).__mentionAvailableUsers = []; }

    // Populate global available activities for checklist autocomplete
    try {
      (window as any).__checklistAvailableActivities = JSON.parse(this.activities || '[]');
    } catch { (window as any).__checklistAvailableActivities = []; }

    // Store on window so TaskBlock can access for block deletion
    this.editorInstance = new EditorJS({
      holder: this.editorId,
      data: initialData,
      placeholder: "Let's Write Something!",
      tunes: ['tagTune', 'mentionTune', 'timelineTune', 'activityTune', 'copyLinkTune', 'visibilityCondition'],
      tools: {
        image: {
          class: ImageTool as any,
          config: {
            uploader: {
              uploadByFile: async (file: File) => {
                const event = new CustomEvent('uploadFile', {
                  detail: { file, path: 'uploads/notes/' },
                  bubbles: true,
                  composed: true,
                  cancelable: true
                });
                this.el.dispatchEvent(event);
                
                // We need to wait for the app to handle the upload and return a URL
                // The app will dispatch 'fileUploaded' back
                return new Promise((resolve) => {
                  const onUploaded = (e: any) => {
                    if (e.detail.file.name === file.name) {
                      this.el.removeEventListener('fileUploaded', onUploaded);
                      resolve({
                        success: 1,
                        file: {
                          url: e.detail.url,
                        }
                      });
                    }
                  };
                  this.el.addEventListener('fileUploaded', onUploaded);
                });
              },
              uploadByUrl: async (url: string) => {
                return {
                  success: 1,
                  file: {
                    url: url,
                  }
                };
              }
            }
          }
        },
        embed: {
          class: Embed as any,
          config: {
            services: {
              youtube: true,
              vimeo: true,
              codepen: true
            }
          }
        },
        copyLinkTune: {
          class: CopyLinkTune as any
        },
        activityTune: {
          class: ActivityTune as any,
          config: {
            activities: (() => { try { return JSON.parse(this.activities || '[]'); } catch { return []; } })(),
            baseUrl: '/activities'
          }
        },
        tagTune: {
          class: TagTune as any,
          config: {
            availableTags: (() => { try { return JSON.parse(this.tags || "[]"); } catch { return []; } })(),
            onTagCreated: (name: string) => document.dispatchEvent(new CustomEvent('tagCreated', { detail: { name } }))
          }
        },
        mentionTune: {
          class: MentionTune as any,
          config: {
            users: (() => { try { return JSON.parse(this.users || "[]"); } catch { return []; } })(),
            currentUser: this.currentUser
          }
        },
        timelineTune: {
          class: TimelineTune as any
        },
        ...(this.disableList.includes('task') ? {} : {
          task: {
            class: TaskBlock as any,
            inlineToolbar: this.inlineFor(['style', 'changeCase', 'hashtag', 'mention', 'aiInline']),
            config: {
              questId: this.questId,
              currentUser: this.currentUser,
              users: (() => { try { return JSON.parse(this.users || "[]"); } catch { return []; } })(),
            }
          }
        }),
        list: {
          class: List as any,
          inlineToolbar: this.inlineFor(['style', 'changeCase', 'hashtag', 'mention', 'link', 'aiInline']),
        },
        // Checklist (custom block tool — `{ items: [{ text, checked }] }`). It was
        // previously unregistered, so checklist blocks (e.g. proposed by the
        // notes-app Assistant "Build") rendered as "can not be displayed
        // correctly". Registering it here makes them render + edit + round-trip.
        checklist: {
          class: Checklist as any,
          inlineToolbar: this.inlineFor(['style', 'changeCase', 'hashtag', 'mention', 'link', 'aiInline']),
          config: {
            currentUser: this.currentUser,
            users: (() => { try { return JSON.parse(this.users || '[]'); } catch { return []; } })(),
            activities: (() => { try { return JSON.parse(this.activities || '[]'); } catch { return []; } })(),
          },
        },
        paragraph: {
          class: Paragraph as any,
          inlineToolbar: this.inlineFor(['style', 'changeCase', 'hashtag', 'mention', 'link', 'aiInline']),
        },
        header: {
          class: Header as any,
          inlineToolbar: this.inlineFor(['style', 'changeCase', 'hashtag', 'mention', 'link', 'aiInline']),
        },
        table: {
          class: Table as any,
        },
        code: {
          class: MonacoCode as any,
          inlineToolbar: this.inlineFor(['aiInline']),
          config: {
             blocksApi: {
                page: async () => await this.getEditorBlocks() || { blocks: [] },
                query: async (opts: any) => {
                   this.queryData.emit(opts); // Dispatch for native listeners
                   if (this.resolveQuery) {
                      return await this.resolveQuery(opts) || [];
                   }
                   return [];
                }
             }
          }
        },
        style: StyleInlineTool as any,
        changeCase: {
          class: ChangeCase as any,
          config: {
            showLocaleOption: true,
            locale: 'en',
          },
        },
        hashtag: {
          class: HashtagInlineTool as any,
          config: {
            availableTags: (() => { try { return JSON.parse(this.tags || '[]'); } catch { return []; } })(),
            onTagCreated: (name: string) => document.dispatchEvent(new CustomEvent('tagCreated', { detail: { name } }))
          }
        },
        mention: {
          class: MentionInlineTool as any,
          config: {
            users: (() => { try { return JSON.parse(this.users || '[]'); } catch { return []; } })()
          }
        },
        // [[wiki-link]] inline tool — opt-in via the `wikilinks` prop (notes-app).
        // Only registered when enabled so the inlineFor() filter never leaves a
        // dangling reference. Autocomplete/lazy-create resolve via host globals.
        ...(this.wikilinks ? {
          link: {
            class: LinkInlineTool as any,
          },
        } : {}),
        // Slash / "+" menu → open the host's unified Assistant (WS2) on Build.
        // Opt-in (notes-app) so other editor hosts never see the entry.
        ...(this.assistantSlash ? {
          assistantLauncher: {
            class: AssistantLauncher as any,
          },
        } : {}),
        poll: {
          class: PollBlock as any,
          config: {
            getPollUrl: (pollId: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/polls/${pollId}`,
          }
        },
        ...(this.disableList.includes('ai') ? {} : {
          aiBlock: {
            class: AiBlock as any,
          },
          aiInline: {
            class: AiInlineTool as any,
          },
        }),
        button: {
          class: ButtonBlock as any,
        },
        divider: {
          class: DividerBlock as any,
        },
        columns: {
          class: ColumnsBlock as any,
        },
        mjml: {
          class: RawMjml as any,
        },
        visibilityCondition: {
          class: VisibilityConditionTune as any,
        },
      },
      onReady: () => {
        new Undo({ editor: this.editorInstance });
        new DragDrop(this.editorInstance);
        (window as any).__editorInstance = this.editorInstance;
      },
      onChange: async () => {
        // ─── Auto-convert [] or - [ ] at paragraph start to TaskBlock ───
        // Skip when TaskBlock isn't registered (disable="task") to avoid
        // EditorJS throwing on insert of an unknown tool.
        if (!this.disableList.includes('task')) {
          try {
            const currentIndex = this.editorInstance.blocks.getCurrentBlockIndex();
            if (currentIndex >= 0) {
              const currentBlock = this.editorInstance.blocks.getBlockByIndex(currentIndex);
              if (currentBlock && currentBlock.name === 'paragraph') {
                const blockEl = currentBlock.holder?.querySelector('[contenteditable]');
                const text = blockEl?.textContent || '';
                const match = text.match(/^(?:\[\]\s|[-*]\s\[\s?\]\s)(.*)$/);
                if (match) {
                  const title = match[1].trim();
                  this.editorInstance.blocks.delete(currentIndex);
                  this.editorInstance.blocks.insert('task', { title, status: 'open', priority: 'medium', assignedTo: [], checked: false }, {}, currentIndex, true);
                }
              }
            }
          } catch (e) {
            console.warn('[pop-editor] Auto-conversion check failed:', e);
          }
        }

        this.saveStatus = 'saving';
        clearTimeout(this.timer);

        this.timer = setTimeout(async () => {
           try {
              const data = await this.editorInstance.save();
              console.log("[pop-editor] Raw EditorJS save() output:", data);
              this.editorChange.emit(data);
               
              // Re-render any functional code blocks so live widgets stay current
              this.el.querySelectorAll('.monaco-code-preview').forEach((previewEl) => {
                const block = (previewEl as any).__monacoCodeInstance;
                if (block && typeof block.refreshIfFunctional === 'function') {
                  block.refreshIfFunctional();
                }
              });
               
              this.saveStatus = 'saved';
              setTimeout(() => {
                  if (this.saveStatus === 'saved') this.saveStatus = 'idle';
              }, 2000);
           } catch (e) {
              console.error("Editor compilation error:", e);
              this.saveStatus = 'error';
           }
        }, 1000);
      }
    });

    // Initialize MultiBlockSelectionPlugin after EditorJS is ready
    setTimeout(() => {
        if (!this.editorInstance) return;

        // Inject a style to ensure popovers are on top
        const e1 = document.createElement("style");
        e1.innerText = '.ce-popover { z-index: 100 !important; }';
        document.head.appendChild(e1);

        this.blockSelection = new MultiBlockSelectionPlugin({ editor: this.editorInstance, version: '2.30.7' });
        
        this.editorInstance.isReady.then(() => {
            this.blockSelection.listen();
            window.addEventListener('editorjs-block-selection-changed', this.handleSelectionChange);
        });
    }, 0);
  }

  /**
   * Utility renders
   */
  private renderActionMenu() {
     if (this.selectedBlockIds.length < 2 || !this.isMenuOpen) return null;

     const parsedTags = (() => { try { return JSON.parse(this.tags || "[]"); } catch { return []; } })();
     const parsedUsers = (() => { try { return JSON.parse(this.users || "[]"); } catch { return []; } })();
     const parsedNotes = (() => { try { return JSON.parse(this.recentNotes || "[]"); } catch { return []; } })();

     const tagSvg = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.34001 20.24L11.33 13.929H5.5L6.09001 11.92H11.95L13.56 6.81001H15.65L14.04 11.92H19.95L19.34 13.929H13.41L11.41 20.24H9.34001Z" fill="currentColor"/></svg>;
     const userSvg = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
     const moveSvg = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
     const chevronSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;

     const stopAll = (e: Event) => {
         e.preventDefault();
         e.stopPropagation();
         e.stopImmediatePropagation();
     };

     return (
         <div class="pop-block-actionbar" style={{ top: `${this.menuY}px`, left: `${this.menuX}px` }}
              onMouseDown={(e) => e.preventDefault()}
              onMouseLeave={() => { this.actionState = 'none'; }}>
            <div class="pop-actionbar-header">
               <span>{this.selectedBlockIds.length} blocks selected</span>
            </div>

            <div class="pop-actionbar-item has-submenu">
               <div class="pop-actionbar-icon">{tagSvg}</div>
               <div>Select Tags</div>
               <div class="pop-actionbar-chevron">{chevronSvg}</div>
               <div class="pop-submenu">
                   <div class="pop-submenu-content">
                       {parsedTags.map(t => (
                          <div class="pop-actionbar-item" 
                              onClick={(e) => { 
                                  stopAll(e);
                                  const ids = [...this.selectedBlockIds];
                                  this.selectedBlockIds = [];
                                  this.isMenuOpen = false;
                                  try { window.getSelection()?.removeAllRanges(); } catch(e){}
                                  
                                  // Optimistically update memory for all selected blocks
                                  ids.forEach(id => {
                                      if ((window as any).__tagTunes?.[id]) {
                                          (window as any).__tagTunes[id].syncHashtags([t.name]);
                                      }
                                  });
                                  
                                  setTimeout(() => {
                                      document.dispatchEvent(new CustomEvent('bulkTagBlocks', { detail: { blockIds: ids, tag: t.name } }));
                                  }, 10);
                              }}>
                              <div class="pop-actionbar-icon">{tagSvg}</div>
                              <div>{t.name}</div>
                          </div>
                       ))}
                   </div>
               </div>
            </div>

            <div class="pop-actionbar-item has-submenu">
               <div class="pop-actionbar-icon">{userSvg}</div>
               <div>Assign Users</div>
               <div class="pop-actionbar-chevron">{chevronSvg}</div>
               <div class="pop-submenu">
                   <div class="pop-submenu-content">
                       {parsedUsers.map(u => (
                          <div class="pop-actionbar-item" 
                              onClick={(e) => { 
                                  stopAll(e);
                                  const ids = [...this.selectedBlockIds];
                                  this.selectedBlockIds = [];
                                  this.isMenuOpen = false;
                                  try { window.getSelection()?.removeAllRanges(); } catch(e){}
                                  
                                  // Optimistically update memory for all selected blocks
                                  ids.forEach(id => {
                                      if ((window as any).__mentionTunes?.[id]) {
                                          const tune = (window as any).__mentionTunes[id];
                                          if (!tune.data.assignedTo.includes(u.id)) {
                                              tune.data.assignedTo.push(u.id);
                                          }
                                      }
                                  });
                                  // Force a save to update Editor.js internal block data
                                  if (this.editorInstance) this.editorInstance.save();

                                  setTimeout(() => {
                                      document.dispatchEvent(new CustomEvent('bulkAssignBlocks', { detail: { blockIds: ids, uid: u.id } }));
                                  }, 10);
                              }}>
                              <div class="pop-actionbar-icon" style={{ borderRadius: '50%', overflow: 'hidden', padding: '0' }}>
                                  <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=7c3aed&color=fff`} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' as any }} />
                              </div>
                              <div>{u.displayName}</div>
                          </div>
                       ))}
                   </div>
               </div>
            </div>

            <div class="pop-actionbar-item has-submenu">
               <div class="pop-actionbar-icon">{moveSvg}</div>
               <div>Move blocks</div>
               <div class="pop-actionbar-chevron">{chevronSvg}</div>
               <div class="pop-submenu">
                   <div class="pop-submenu-content">
                       {parsedNotes.map(n => (
                          <div class="pop-actionbar-item" 
                              onClick={(e) => { 
                                  stopAll(e);
                                  const ids = [...this.selectedBlockIds];
                                  this.selectedBlockIds = [];
                                  this.isMenuOpen = false;
                                  try { window.getSelection()?.removeAllRanges(); } catch(e){}
                                  setTimeout(() => {
                                      document.dispatchEvent(new CustomEvent('bulkMoveBlocks', { detail: { blockIds: ids, targetNoteId: n.id } }));
                                  }, 10);
                              }}>
                              <div class="pop-actionbar-icon">📝</div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                                  <div>{n.title || n.question || 'Untitled Note'}</div>
                                  <div style={{ fontSize: '9px', color: 'var(--pico-muted-color)' }}>/notes/{n.id}</div>
                              </div>
                          </div>
                       ))}
                   </div>
               </div>
            </div>

         </div>
     );
  }

  render() {
    return (
      <Host>
        <div class="autosave-status" style={{ opacity: this.saveStatus === 'idle' ? '0' : '1' }}>
           {this.saveStatus === 'saving' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="pop-spinner"><path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>}
           {this.saveStatus === 'saved' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>}
           {this.saveStatus === 'error' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>}
        </div>
        <div id={this.editorId}></div>
        {this.renderActionMenu()}
        <slot></slot>
      </Host>
    );
  }
}
