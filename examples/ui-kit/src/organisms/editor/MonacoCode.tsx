import type { API, BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";

interface MonacoCodeData {
  code: string;
  language: string;
  viewMode?: "code" | "visual" | "split";
}

export default class MonacoCode implements BlockTool {
  api: API;
  data: MonacoCodeData;
  config: any;
  wrapper: HTMLElement;
  editor: any;
  monaco: any;
  previewWrapper: HTMLElement;
  container: HTMLElement;
  languageBadge: HTMLElement;
  placeholderEl: HTMLElement;
  private _monacoReady = false;
  private _monacoLoadingPromise: Promise<void> | null = null;

  static get toolbox() {
    return {
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/></svg>',
      title: "Code",
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  static get enableLineBreaks() {
    return true; // Allows Editor.js to handle Enter natively inside the contentEditable
  }

  /**
   * Tell Editor.js not to sanitize the saved data.
   * Without this, EditorJS encodes `>` to `&gt;` and strips HTML tags from code strings.
   */
  static get sanitize() {
    return {
      code: true,       // Allow raw HTML in code field (it's source code, not rendered content)
      language: false,   // Plain string, no HTML needed
      viewMode: false,   // Plain string, no HTML needed
    };
  }

  loader: any;
  readOnly: boolean; // Add readOnly property
  previewContent: HTMLElement; // Add previewContent property

  private _isSyncingFromVisual = false;
  private _isSyncingFromCode = false;

  constructor({ data, api, config, readOnly }: BlockToolConstructorOptions<MonacoCodeData, any>) {
    this.api = api;

    // Decode code from save format
    let code = data.code || "";
    if ((data as any)._encoded) {
      // New format: base64-encoded to bypass EditorJS sanitizer
      try {
        code = decodeURIComponent(escape(atob(code)));
      } catch (_e) {
        // If decode fails, use as-is
      }
    } else if (code.includes('&gt;') || code.includes('&lt;') || code.includes('&amp;')) {
      // Legacy data: undo EditorJS HTML entity encoding
      const temp = document.createElement('textarea');
      temp.innerHTML = code;
      code = temp.value;
    }

    this.data = {
      code,
      language: data.language || "html",
      viewMode: data.viewMode || "code",
    };
    this.config = config || {};
    this.readOnly = readOnly || false;
    this.wrapper = null as any;
    this.monaco = null as any;
    this.previewWrapper = null as any;
    this.previewContent = null as any;
    this.container = null as any;
    this.languageBadge = null as any;
    this.placeholderEl = null as any;
  }
  renderSettings(): any {
    return [
      {
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/></svg>',
        title: "Code",
        isActive: this.data.viewMode === "code",
        closeOnActivate: true,
        onActivate: () => this.setView("code"),
      },
      {
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>',
        title: "Visual",
        isActive: this.data.viewMode === "visual",
        closeOnActivate: true,
        onActivate: () => this.setView("visual"),
      },
      {
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10 4V20H4V4H10ZM20 4V20H14V4H20ZM4 2H10C11.1 2 12 2.9 12 4V20C12 21.1 11.1 22 10 22H4C2.9 22 2 21.1 2 20V4C2 2.9 2.9 2 4 2ZM14 2H20C21.1 2 22 2.9 22 4V20C22 21.1 21.1 22 20 22H14C12.9 22 12 21.1 12 20V4C12 2.9 12.9 2 14 2Z" fill="currentColor"/></svg>',
        title: "Split",
        isActive: this.data.viewMode === "split",
        closeOnActivate: true,
        onActivate: () => this.setView("split"),
      },
      {
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="currentColor"/></svg>',
        title: "Language",
        // @ts-ignore
        children: {
          items: ["html", "css", "javascript", "typescript", "json", "functional"].map((lang) => ({
            icon: " ",
            title: lang.toUpperCase(),
            isActive: this.data.language === lang,
            closeOnActivate: true,
            onActivate: () => {
              this.setLanguage(lang);
            },
          })),
        },
      },
    ];
  }

  private cycleViewMode() {
    const modes: ("code" | "visual" | "split")[] = ["code", "visual", "split"];
    const currentIndex = modes.indexOf(this.data.viewMode || "code");
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.setView(nextMode);
  }

  private cycleLanguage() {
    const langs = ["html", "css", "javascript", "typescript", "json", "functional"];
    const currentIndex = langs.indexOf(this.data.language || "html");
    const nextLang = langs[(currentIndex + 1) % langs.length];
    this.setLanguage(nextLang);
  }

  private setLanguage(lang: string) {
    this.data.language = lang;
    if (this.languageBadge) {
      this.languageBadge.textContent = lang;
    }
    if (this.container) {
      this.container.setAttribute("data-language", lang);
    }
    if (this.editor && this.monaco) {
      const model = this.editor.getModel();
      if (model) {
         // Functional uses TS syntax highlighting
         const monacoLang = lang === "functional" ? "typescript" : lang;
         this.monaco.editor.setModelLanguage(model, monacoLang);
      }
    }
  }

  private refreshPreview() {
    if (this._isSyncingFromVisual) return;
    const code = this.editor ? this.editor.getValue() : this.data.code;
    
    // Set contentEditable state
    const isEditingAllowed = !this.readOnly && this.data.language !== "functional";
    this.previewContent.contentEditable = isEditingAllowed ? "true" : "false";

    if (!code || !code.trim()) {
      this.previewContent.innerHTML =
        '<div style="padding:16px;color:#888;font-style:italic;">Empty — switch to Code mode to write</div>';
     } else if (this.data.language === "functional") {
       this.previewContent.innerHTML = `<div style="padding:16px;color:#888;font-style:italic;">Evaluating...</div>`;
       
       (async () => {
         try {
           // Create an execution context that returns the result
           const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
           const executor = new AsyncFunction("blocks", code);
           const result = await executor(this.config.blocksApi || {});
           
           if (result instanceof HTMLElement) {
             this.previewContent.innerHTML = "";
             this.previewContent.appendChild(result);
           } else if (typeof result === "string") {
             // Render as raw HTML — functional blocks return markup
             this.previewContent.innerHTML = result;
           } else if (typeof result === "object" && result !== null) {
              const displayStr = JSON.stringify(result, null, 2);
              this.previewContent.innerHTML = `<pre style="padding:16px;margin:0;white-space:pre-wrap;">${displayStr}</pre>`;
           } else if (result !== undefined) {
              this.previewContent.innerHTML = `<div style="padding:16px;">${String(result)}</div>`;
           } else {
              this.previewContent.innerHTML = `<div style="padding:16px;color:#888;font-style:italic;">No output returned</div>`;
           }
           
           // Re-execute <script> tags so they actually run after async injection
           this.previewContent.querySelectorAll("script").forEach((old) => {
             const s = document.createElement("script");
             Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
             s.textContent = old.textContent;
             old.parentNode!.replaceChild(s, old);
           });
           
         } catch (e: any) {
           this.previewContent.innerHTML = `<div style="padding:16px;color:#ff6b6b;font-family:monospace;white-space:pre-wrap;">Error:\n${e.message}</div>`;
         }
       })();
    } else {
      this.previewContent.innerHTML = code;
      // Re-execute <script> tags so they actually run
      this.previewContent.querySelectorAll("script").forEach((old) => {
        const s = document.createElement("script");
        Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
        s.textContent = old.textContent;
        old.parentNode!.replaceChild(s, old);
      });
    }
    (window as any).editorBlockApi = this.api;
  }

  setView(mode: "code" | "visual" | "split") {
    // Sync current content before switching
    if (this._monacoReady && this.editor) {
      this.data.code = this.editor.getValue();
    }

    this.data.viewMode = mode;

    // Reset default styles
    this.container.style.display = "block";
    if (this.languageBadge) {
        this.languageBadge.style.display = "none";
    }
    
    // Hide wrapper (Monaco)
    this.wrapper.style.position = "absolute";
    this.wrapper.style.opacity = "0";
    this.wrapper.style.pointerEvents = "none";
    this.wrapper.style.zIndex = "-1";
    this.wrapper.style.width = "100%";
    this.wrapper.style.height = "0"; // so it doesn't push layout
    
    // Hide preview
    this.previewWrapper.style.display = "none";
    this.previewWrapper.style.width = "100%";
    this.previewWrapper.style.borderLeft = "";
    this.previewWrapper.style.borderTop = "";
    this.container.style.border = "1px solid #555"; // Default border

    switch (mode) {
      case "code":
        this.wrapper.style.position = "static";
        this.wrapper.style.opacity = "1";
        this.wrapper.style.pointerEvents = "auto";
        this.wrapper.style.zIndex = "auto";
        this.wrapper.style.height = "auto"; 
        
        if (this.languageBadge) this.languageBadge.style.display = "block";
        
        this.wrapper.classList.add("cdx-input");
        this.previewContent.classList.remove("cdx-input");
        
        if (!this._monacoReady) {
            this.loadMonaco();
        } else if (this.editor) {
            this.editor.setValue(this.data.code);
            // Re-measure height
            const h = Math.min(500, Math.max(200, this.editor.getContentHeight()));
            this.wrapper.style.height = h + "px";
        }
        break;

      case "visual":
        this.refreshPreview();
        this.previewWrapper.style.display = "block";
        this.container.style.border = "none"; // No border in visual
        this.previewContent.classList.add("cdx-input");
        this.wrapper.classList.remove("cdx-input");
        this.previewWrapper.style.padding = "0"; // Remove padding, let Editor.js handle it
        break;

      case "split":
        this.container.style.display = "flex";
        
        this.wrapper.style.position = "static";
        this.wrapper.style.opacity = "1";
        this.wrapper.style.pointerEvents = "auto";
        this.wrapper.style.zIndex = "auto";
        this.wrapper.style.height = "auto";

        // Show language badge in split mode too since code is visible
        if (this.languageBadge) this.languageBadge.style.display = "block";

        this.refreshPreview();
        this.previewWrapper.style.display = "block";
        this.wrapper.classList.add("cdx-input");
        this.previewContent.classList.remove("cdx-input"); // Let it align to wrapper
        
        if (!this._monacoReady) {
            this.loadMonaco();
        } else if (this.editor) {
            this.editor.setValue(this.data.code);
            const h = Math.min(500, Math.max(200, this.editor.getContentHeight()));
            this.wrapper.style.height = h + "px";
        }

        if (window.innerWidth >= 768) {
          this.container.style.flexDirection = "row";
          this.wrapper.style.width = "50%";
          this.previewWrapper.style.width = "50%";
          this.previewWrapper.style.borderLeft = "1px solid #444";
        } else {
          this.container.style.flexDirection = "column";
          this.previewWrapper.style.borderTop = "1px solid #444";
        }
        break;
    }

    if (this._monacoReady && this.editor) this.editor.layout();
  }

  render() {
    this.container = document.createElement("div");
    this.container.classList.add("cdx-block");
    this.container.setAttribute("data-mutation-free", "true");
    // Initial style - border will be handled by setView or explicit check below
    this.container.style.cssText = "border-radius:4px;min-height:40px;";
    
    // Apply initial border based on mode
    if (this.data.viewMode !== "visual") {
        this.container.style.border = "1px solid #555";
    }

    // Stop Enter from creating new Editor.js blocks when inside Monaco
    this.container.addEventListener("keydown", (e) => {
      // Allow bubbling for regular shortcuts if needed, but intercept our custom toggles
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyM") {
        e.preventDefault();
        e.stopPropagation();
        this.cycleViewMode();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyL") {
        e.preventDefault();
        e.stopPropagation();
        this.cycleLanguage();
        return;
      }

      if (this.data.viewMode !== 'visual' && e.key === "Enter") {
        e.stopPropagation();
      }
    });

    // Monaco editor wrapper
    this.wrapper = document.createElement("div");
    this.wrapper.style.cssText = "min-height:200px;width:100%;background:#1e1e1e;position:relative;";
    this.container.appendChild(this.wrapper);
    
    // Placeholder Element (Monaco doesn't have native placeholders)
    this.placeholderEl = document.createElement("div");
    this.placeholderEl.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      padding: 16px;
      font-family: monospace;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.4);
      pointer-events: none;
      z-index: 5;
      display: none;
    `;
    this.placeholderEl.textContent = "Write some code here...";
    this.wrapper.appendChild(this.placeholderEl);

    // Language Badge
    this.languageBadge = document.createElement("div");
    // Stable hooks so host apps (e.g. notes-app's notebook Run affordance) can
    // reliably detect a code block's language without parsing the badge text.
    this.languageBadge.className = "monaco-language-badge";
    this.container.classList.add("monaco-code-block");
    this.container.setAttribute("data-language", this.data.language || "html");
    this.languageBadge.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      padding: 4px 8px;
      font-size: 10px;
      font-family: monospace;
      color: rgba(255,255,255,0.4);
      background: rgba(0,0,0,0.3);
      border-bottom-left-radius: 4px;
      z-index: 50;
      text-transform: uppercase;
      pointer-events: none;
    `;
    this.languageBadge.textContent = this.data.language || "html";
    this.container.appendChild(this.languageBadge);

    // AI Assistant button (only when Ollama is available)
    if ((window as any).__ollamaAvailable) {
      this._buildAiPanel();
    }

    // Visual preview wrapper
    this.previewWrapper = document.createElement("div");
    this.previewWrapper.style.cssText = "min-height:40px;width:100%;padding:12px;display:none;position:relative;";
    this.container.appendChild(this.previewWrapper);
    
    // Force focus on content when wrapper is clicked
    this.previewWrapper.addEventListener("click", (e) => {
        if (e.target !== this.previewContent && this.data.viewMode !== "code") {
           this.previewContent.focus();
        }
    });

    // Inner content container - Acts as the "Input" for Editor.js
    // We make it contentEditable="true" so users can edit and use block formatting tools
    this.previewContent = document.createElement("div");
    this.previewContent.classList.add("monaco-code-preview");
    this.previewContent.contentEditable = this.readOnly ? "false" : "true";
    this.previewContent.tabIndex = 0; // Make focusable so we can select the block
    this.previewContent.style.cssText = "width:100%;height:100%;outline:none;";
    this.previewWrapper.appendChild(this.previewContent);
    // Store instance reference so the editor can find functional blocks to re-render
    (this.previewContent as any).__monacoCodeInstance = this;
    
    // Sync Visual edits back to Code
    this.previewContent.addEventListener("input", () => {
       if (this.data.viewMode === "visual" || this.data.viewMode === "split") {
          // For HTML language, visual edits modify the rendered DOM so we read innerHTML
          // For other languages, visual editing shouldn't change the raw code
          if (this.data.language === "html") {
             this.data.code = this.previewContent.innerHTML;
             if (this.editor && !this._isSyncingFromCode) {
                this._isSyncingFromVisual = true;
                const model = this.editor.getModel();
                if (model) {
                   this.editor.executeEdits('visual-sync', [{
                      range: model.getFullModelRange(),
                      text: this.data.code
                   }]);
                } else {
                   this.editor.setValue(this.data.code);
                }
                this._isSyncingFromVisual = false;
             }
          }
       }
    });
    
    // Right-click opens the Block Settings menu (Language/Code switch)
    this.previewContent.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.api.toolbar.toggleBlockSettings(true);
    });
    
    // We don't need to prevent edits manually if contentEditable is false.
    // But we might want to capture some keys if we want specific behavior?
    // For now, let standard behavior apply (Arrow keys move selection, etc.)
    
    // Resize handler for split
    window.addEventListener("resize", () => {
      if (this.data.viewMode === "split") this.setView("split");
    });

    // Initialize the saved view mode — setView handles Monaco loading internally
    this.setView(this.data.viewMode || "code");

    return this.container;
  }

  private loadMonaco(): Promise<void> {
    if (this._monacoLoadingPromise) return this._monacoLoadingPromise;
    this.wrapper.innerHTML = "Loading Code Editor...";
    this.wrapper.style.padding = "16px";
    this.wrapper.style.color = "#888";

    this._monacoLoadingPromise = new Promise((resolve, reject) => {
        const initEditor = (monaco: any) => {
          this.monaco = monaco;

          (window as any).MonacoEnvironment = {
            getWorker(_: any, _label: string) {
              const blob = new Blob([
                 `self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/' };`,
                 `importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/base/worker/workerMain.js');`
              ], { type: 'application/javascript' });
              
              const blobUrl = URL.createObjectURL(blob);
              
              // Bypass Vite's dev-mode Worker constructor which injects { type: "module" } causing importScripts to crash
              let iframe = document.getElementById("monaco-worker-iframe") as HTMLIFrameElement;
              if (!iframe) {
                iframe = document.createElement("iframe");
                iframe.id = "monaco-worker-iframe";
                iframe.style.display = "none";
                document.body.appendChild(iframe);
              }
              const NativeWorker = (iframe.contentWindow as any).Worker;
              const worker = new NativeWorker(blobUrl);
              
              return worker;
            },
          };

          this.wrapper.innerHTML = "";
          this.wrapper.style.padding = "0";

          this.editor = monaco.editor.create(this.wrapper, {
            value: this.data.code,
            language: this.data.language === "functional" ? "typescript" : (this.data.language || "html"),
            theme: "vs-dark",
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          });

          // Configure TypeScript worker to allow loose globals and isolated environments
          monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            lib: ["es2020", "dom"],
            typeRoots: ["node_modules/@types"]
          });

          // Suppress top-level return and await errors since this code runs inside an AsyncFunction body
          monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
            diagnosticCodesToIgnore: [
               1108, // A 'return' statement can only be used within a function body.
               1308, // 'await' expressions are only allowed within async functions...
               1375, // 'await' expressions are only allowed at the top level of a file...
               1378  // Top-level 'await' expressions are only allowed when the 'module' option is set...
            ]
          });

          // Provide typings for the injected `blocks` API so functional code has autocomplete
          monaco.languages.typescript.typescriptDefaults.addExtraLib(`
            /**
             * The EditorJS output data structure representing a parsed document block.
             */
            interface EditorBlock {
              id: string;
              type: string;
              data: any;
            }

            /**
             * The full document payload consisting of EditorJS blocks.
             */
            interface OutputData {
              time?: number;
              version?: string;
              blocks: EditorBlock[];
            }

            /**
             * Options for filtering blocks from the backend collection.
             */
            interface BlockQueryOptions {
              /** 
               * Filter by block type (e.g., 'header', 'paragraph', 'code', 'image') 
               */
              type?: string;
              
              /** 
               * Limit the number of blocks returned from the query 
               */
              limit?: number;
              
              /** 
               * Additional filter criteria (key-value pairs)
               */
              where?: Record<string, any>;

              /**
               * Filter checklist blocks where items are assigned to this user ID
               */
              assignedTo?: string;

              /**
               * Filter checklist blocks where items were created by this user ID
               */
              createdBy?: string;
              
              /**
               * Allow any other arbitrary filter params
               */
              [key: string]: any;
            }

            /**
             * The Context API exposed natively to 'Functional' MonacoCode blocks.
             * Used to fetch page data or run backend database queries.
             */
            declare const blocks: {
              /**
               * Fetches the current live parsed state of all blocks on the active page.
               * Useful for conditionally rendering based on other content.
               */
              page: () => Promise<OutputData>;
              
              /**
               * Fetches blocks from the application's blocks database collection.
               * Defaults to returning an empty array if no results are found.
               */
              query: <T = any>(options?: BlockQueryOptions) => Promise<T[]>;
            };
          `, 'file:///blocks.d.ts');

          this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM, () => {
            this.cycleViewMode();
          });

          this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
            this.cycleLanguage();
          });

          this._monacoReady = true;

          // Handle Placeholder Visibility
          const updatePlaceholder = () => {
             if (!this.editor) return;
             const val = this.editor.getValue();
             const isFocused = this.editor.hasTextFocus();
             if (!val && !isFocused) {
               this.placeholderEl.style.display = "block";
             } else {
               this.placeholderEl.style.display = "none";
             }
          };

          this.editor.onDidFocusEditorWidget(updatePlaceholder);
          this.editor.onDidBlurEditorWidget(updatePlaceholder);
          
          // Initial placeholder check
          updatePlaceholder();

          // Sync Code edits back to Visual (if split mode is active or whenever code changes)
          this.editor.onDidChangeModelContent(() => {
            updatePlaceholder();
            if (this._isSyncingFromVisual) return;
            this.data.code = this.editor.getValue();
            if (this.data.viewMode === "split") {
               this._isSyncingFromCode = true;
               this.refreshPreview();
               this._isSyncingFromCode = false;
            }
          });

          const updateHeight = () => {
            if (!this.editor) return;
            const h = Math.min(500, Math.max(200, this.editor.getContentHeight()));
            this.wrapper.style.height = h + "px";
            this.editor.layout();
          };
          this.editor.onDidContentSizeChange(updateHeight);
          updateHeight();
          resolve();
        };

        const loadScript = () => {
          if ((window as any).monaco) {
             initEditor((window as any).monaco);
             return;
          }
          let script = document.getElementById('monaco-loader-script') as HTMLScriptElement;
          if (!script) {
             script = document.createElement('script');
             script.id = 'monaco-loader-script';
             script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';
             document.head.appendChild(script);
          }
          
          if ((window as any).require && (window as any).require.config) {
             // Script might be already loaded but not executed callback
             const amdRequire = (window as any).require;
             amdRequire.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
             amdRequire(['vs/editor/editor.main'], () => {
               initEditor((window as any).monaco);
             });
          } else {
             script.addEventListener('load', () => {
                const amdRequire = (window as any).require;
                amdRequire.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
                amdRequire(['vs/editor/editor.main'], () => {
                  initEditor((window as any).monaco);
                });
             });
             script.addEventListener('error', (e) => {
                console.error("MonacoCode: Failed to load Monaco Editor", e);
                const ta = document.createElement("textarea");
                ta.style.cssText =
                  "width:100%;min-height:200px;background:#1e1e1e;color:#d4d4d4;border:none;padding:12px;font-family:monospace;font-size:14px;resize:vertical;";
                ta.value = this.data.code;
                ta.addEventListener("input", () => {
                  this.data.code = ta.value;
                });
                this.wrapper.innerHTML = "";
                this.wrapper.appendChild(ta);
                reject();
             });
          }
        };

        try {
           loadScript();
        } catch (e) {
           reject(e);
        }
    });
    return this._monacoLoadingPromise;
  }

  save(_blockContent: HTMLElement) {
    // Always prefer Monaco's raw value
    const rawCode = this.editor ? this.editor.getValue() : this.data.code;
    // Base64-encode the code so EditorJS's innerHTML-based sanitizer can't mangle it
    const encoded = btoa(unescape(encodeURIComponent(rawCode)));
    return {
      code: encoded,
      language: this.data.language,
      viewMode: this.data.viewMode,
      _encoded: true,
    };
  }

  /**
   * Re-renders the functional preview if this block is in functional + visual/split mode.
   * Called externally when the editor saves so live widgets stay up-to-date.
   */
  refreshIfFunctional() {
    if (this.data.language === "functional" && this.data.viewMode !== "code") {
       this.refreshPreview();
    }
  }

  /**
   * Builds and appends the AI assistant button + collapsible panel to the container.
   * Only called when `window.__ollamaAvailable` is true.
   */
  private _buildAiPanel() {
    const OLLAMA_BASE = "https://ollama.popcorn245.com";
    const OLLAMA_MODEL = "llama3.1:8b";

    // AI button — top-left corner overlay on the Monaco wrapper
    const aiBtn = document.createElement("button");
    aiBtn.type = "button";
    aiBtn.textContent = "✨ AI";
    aiBtn.title = "AI Code Assistant";
    aiBtn.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      z-index: 50;
      background: rgba(124,58,237,0.85);
      color: #fff;
      border: none;
      border-bottom-right-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-family: monospace;
      cursor: pointer;
      letter-spacing: 0.03em;
    `;
    this.wrapper.appendChild(aiBtn);

    // AI panel — sits below the wrapper, hidden by default
    const aiPanel = document.createElement("div");
    aiPanel.style.cssText = `
      display: none;
      background: var(--pico-card-background-color, #1a1a2e);
      border: 1px solid rgba(124,58,237,0.4);
      border-top: none;
      border-radius: 0 0 6px 6px;
      padding: 12px;
      font-family: inherit;
    `;

    const panelLabel = document.createElement("div");
    panelLabel.textContent = "✨ AI Code Assistant";
    panelLabel.style.cssText = "font-size:12px;font-weight:600;color:#a78bfa;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;";
    aiPanel.appendChild(panelLabel);

    const promptTA = document.createElement("textarea");
    promptTA.rows = 2;
    promptTA.placeholder = "Describe what this code should do…";
    promptTA.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      resize: vertical;
      background: rgba(255,255,255,0.07);
      color: #e0e0e0;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px;
      padding: 8px;
      font-size: 13px;
      font-family: monospace;
      margin-bottom: 8px;
      display: block;
    `;
    promptTA.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        generateBtn.click();
      }
    });
    aiPanel.appendChild(promptTA);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;";

    const generateBtn = document.createElement("button");
    generateBtn.type = "button";
    generateBtn.textContent = "Generate";
    generateBtn.style.cssText = `
      background: #7c3aed;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 13px;
      cursor: pointer;
      flex: 1;
    `;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.style.cssText = `
      background: transparent;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
      color: #aaa;
    `;
    closeBtn.addEventListener("click", () => {
      aiPanel.style.display = "none";
    });

    generateBtn.addEventListener("click", async () => {
      const userPrompt = promptTA.value.trim();
      if (!userPrompt) return;

      generateBtn.disabled = true;
      generateBtn.textContent = "Generating…";

      const fullPrompt = `Write ${this.data.language} code that: ${userPrompt}\n\nRespond with ONLY the code, no explanations, no markdown fences.`;

      try {
        const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: OLLAMA_MODEL, prompt: fullPrompt, stream: false }),
        });
        if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
        const json = await resp.json();
        let code: string = json.response || "";

        // Strip markdown code fences if the model included them
        code = code.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();

        if (this.editor) {
          this.editor.setValue(code);
        } else {
          this.data.code = code;
        }
        aiPanel.style.display = "none";
      } catch (err) {
        generateBtn.textContent = "Error – Retry";
        promptTA.placeholder = (err as Error).message;
      } finally {
        generateBtn.disabled = false;
        if (generateBtn.textContent === "Generating…") {
          generateBtn.textContent = "Generate";
        }
      }
    });

    btnRow.appendChild(generateBtn);
    btnRow.appendChild(closeBtn);
    aiPanel.appendChild(btnRow);

    // Insert panel after wrapper in container
    this.container.appendChild(aiPanel);

    // Toggle panel on AI button click
    aiBtn.addEventListener("click", () => {
      const isVisible = aiPanel.style.display !== "none";
      aiPanel.style.display = isVisible ? "none" : "block";
      if (!isVisible) {
        requestAnimationFrame(() => promptTA.focus());
      }
    });
  }
}
