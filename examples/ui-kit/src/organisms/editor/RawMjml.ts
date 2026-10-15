import type { BlockTool } from '@editorjs/editorjs';

interface RawMjmlData {
  mjml: string;
}

/**
 * RawMjml — EditorJS Block Tool for raw MJML / HTML fragments.
 *
 * Lets an author paste or hand-edit raw MJML markup (or an HTML fragment)
 * for advanced layouts the standard block types can't express. The block
 * carries its markup in `data.mjml` (a string), which is consumed verbatim
 * by popmail's `mjmlBlockConverter` (it reads `block.data.mjml`). A bare
 * fragment is wrapped in an `<mj-section>` by that converter, so authors can
 * paste either a full `<mj-section>`/`<mj-wrapper>` or just a couple of
 * `<mj-column>`s.
 */
export default class RawMjml implements BlockTool {
  private data: RawMjmlData;
  private readOnly: boolean;
  private blockAPI: any;
  private wrapper: HTMLElement;
  private textarea?: HTMLTextAreaElement;

  static get toolbox() {
    return {
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      title: 'MJML / HTML',
    };
  }

  static get isReadOnlySupported() { return true; }
  static get enableLineBreaks() { return true; }

  constructor({ data, readOnly, block }: any) {
    this.readOnly = readOnly || false;
    this.blockAPI = block;
    this.wrapper = document.createElement('div');

    this.data = {
      mjml: typeof data?.mjml === 'string' ? data.mjml : '',
    };
  }

  render(): HTMLElement {
    this.wrapper.innerHTML = '';
    this.wrapper.className = 'raw-mjml-block-root';
    this.wrapper.style.cssText =
      'border:1px solid var(--pico-muted-border-color,#e2e8f0);border-radius:6px;padding:8px;background:var(--pico-card-background-color,#f8fafc);';

    // Header label
    const label = document.createElement('div');
    label.textContent = 'MJML / HTML';
    label.style.cssText =
      'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;opacity:0.7;margin-bottom:6px;font-family:inherit;';
    this.wrapper.appendChild(label);

    const textarea = document.createElement('textarea');
    textarea.value = this.data.mjml;
    textarea.readOnly = this.readOnly;
    textarea.spellcheck = false;
    textarea.placeholder = '<mj-section>\n  <mj-column>...</mj-column>\n</mj-section>';
    textarea.style.cssText =
      'width:100%;min-height:80px;box-sizing:border-box;resize:vertical;border:1px solid var(--pico-muted-border-color,#e2e8f0);border-radius:4px;padding:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;background:var(--pico-background-color,#fff);color:var(--pico-color,inherit);outline:none;overflow:hidden;';

    const autoGrow = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 80)}px`;
    };

    textarea.addEventListener('input', () => {
      this.data.mjml = textarea.value;
      autoGrow();
      this.notifyChange();
    });

    // Grow to fit hydrated content once attached to the DOM.
    requestAnimationFrame(autoGrow);

    this.textarea = textarea;
    this.wrapper.appendChild(textarea);
    return this.wrapper;
  }

  private notifyChange() {
    if (this.blockAPI && typeof this.blockAPI.dispatchChange === 'function') {
      this.blockAPI.dispatchChange();
    }
  }

  save(): RawMjmlData {
    return {
      mjml: this.textarea ? this.textarea.value : this.data.mjml,
    };
  }
}
