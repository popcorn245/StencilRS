const OLLAMA_BASE = "https://ollama.popcorn245.com";
const OLLAMA_MODEL = "llama3.1:8b";

/**
 * AiInlineTool – EditorJS Inline Tool
 *
 * Adds a ✨ button to the inline toolbar of any block.
 * When clicked, opens a floating popover where the user enters a prompt.
 * Generated text is inserted at the cursor (or replaces selected text).
 *
 * Hidden automatically when `window.__ollamaAvailable` is false.
 */
export default class AiInlineTool {
  private button: HTMLButtonElement | null = null;
  private popover: HTMLElement | null = null;
  private savedRange: Range | null = null;
  private selectedText: string = "";

  static get isInline() {
    return true;
  }

  static get title() {
    return "AI Generate";
  }

  static get sanitize() {
    // We only insert text nodes, no markup to allow
    return {};
  }

  constructor(_opts: { api: any }) {}

  render(): HTMLButtonElement {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.innerHTML = "✨";
    this.button.title = "AI Generate";
    this.button.style.cssText = "font-size:14px;padding:2px 4px;";

    if (!(window as any).__ollamaAvailable) {
      this.button.style.display = "none";
    }

    this.button.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this._openPopover();
    });

    return this.button;
  }

  surround(_range: Range) {
    // We handle insertion manually; nothing to do here
  }

  checkState(): boolean {
    // Save selection on every state check so we have it when the button is clicked
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
      this.selectedText = selection.toString();
    }
    return false;
  }

  private _openPopover() {
    this._closePopover();

    // Capture range/selection now in case focus shifts
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
      this.selectedText = selection.toString();
    }

    this.popover = document.createElement("div");
    this.popover.classList.add("ai-inline-popover");
    this.popover.style.cssText = `
      position: fixed;
      z-index: 99999;
      background: var(--pico-card-background-color, #fff);
      border: 1px solid var(--pico-muted-border-color, #ccc);
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      width: 320px;
      font-family: inherit;
    `;

    // Position near the inline toolbar button
    if (this.button) {
      const rect = this.button.getBoundingClientRect();
      this.popover.style.top = `${rect.bottom + 8}px`;
      this.popover.style.left = `${Math.max(8, rect.left - 100)}px`;
    }

    // Title
    const title = document.createElement("div");
    title.textContent = "✨ AI Generate";
    title.style.cssText = "font-size:12px;font-weight:600;color:var(--pico-primary,#7c3aed);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;";
    this.popover.appendChild(title);

    // Prompt textarea
    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.placeholder = "What should I write here?";
    if (this.selectedText) {
      textarea.value = `Rewrite: ${this.selectedText}`;
    }
    textarea.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      resize: vertical;
      border: 1px solid var(--pico-muted-border-color, #ccc);
      border-radius: 6px;
      padding: 8px;
      font-size: 13px;
      font-family: inherit;
      background: var(--pico-background-color, #fff);
      color: var(--pico-color, #333);
      margin-bottom: 8px;
      display: block;
    `;
    textarea.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") this._closePopover();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        generateBtn.click();
      }
    });
    this.popover.appendChild(textarea);

    // Button row
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;";

    const generateBtn = document.createElement("button");
    generateBtn.type = "button";
    generateBtn.textContent = "Generate";
    generateBtn.style.cssText = `
      background: var(--pico-primary, #7c3aed);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 13px;
      cursor: pointer;
      flex: 1;
    `;
    generateBtn.addEventListener("click", async () => {
      const prompt = textarea.value.trim();
      if (!prompt) return;

      generateBtn.disabled = true;
      generateBtn.textContent = "Generating…";

      try {
        const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
        });
        if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
        const json = await resp.json();
        const generated: string = json.response || "";

        this._insertText(generated);
        this._closePopover();
      } catch (err) {
        generateBtn.textContent = "Error – Retry";
        generateBtn.disabled = false;
        textarea.placeholder = (err as Error).message;
      }
    });

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Cancel";
    closeBtn.style.cssText = `
      background: transparent;
      border: 1px solid var(--pico-muted-border-color, #ccc);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
      color: var(--pico-color, #333);
    `;
    closeBtn.addEventListener("click", () => this._closePopover());

    btnRow.appendChild(generateBtn);
    btnRow.appendChild(closeBtn);
    this.popover.appendChild(btnRow);

    document.body.appendChild(this.popover);

    // Focus textarea
    requestAnimationFrame(() => textarea.focus());

    // Close on outside click
    setTimeout(() => {
      document.addEventListener("mousedown", this._onOutsideClick, { once: false });
    }, 100);
  }

  private _onOutsideClick = (e: MouseEvent) => {
    if (this.popover && !this.popover.contains(e.target as Node)) {
      this._closePopover();
    }
  };

  private _closePopover() {
    if (this.popover) {
      this.popover.remove();
      this.popover = null;
    }
    document.removeEventListener("mousedown", this._onOutsideClick);
  }

  private _insertText(text: string) {
    if (!this.savedRange) return;

    // Restore focus to editor
    const editorEl = document.querySelector(".codex-editor");
    if (editorEl) (editorEl as HTMLElement).focus();

    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(this.savedRange);

    // Delete selected content if any
    if (!this.savedRange.collapsed) {
      this.savedRange.deleteContents();
    }

    // Insert the generated text as a text node
    const textNode = document.createTextNode(text);
    this.savedRange.insertNode(textNode);

    // Move caret to end of inserted text
    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Notify editor of change
    const inputEvent = new InputEvent("input", { bubbles: true, cancelable: true });
    textNode.parentElement?.dispatchEvent(inputEvent);
  }
}
