import type { BlockTool } from '@editorjs/editorjs';

interface ButtonBlockData {
  text: string;
  url: string;
  alignment: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
}

/**
 * ButtonBlock — EditorJS Block Tool for email CTA buttons.
 *
 * Renders a styled button preview in the editor that maps to
 * <mj-button> via the popmail converter.
 */
export default class ButtonBlock implements BlockTool {
  private data: ButtonBlockData;
  private readOnly: boolean;
  private blockAPI: any;
  private wrapper: HTMLElement;

  static get toolbox() {
    return {
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="4" width="14" height="8" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="1.5"/>
      </svg>`,
      title: 'Button',
    };
  }

  static get isReadOnlySupported() { return true; }
  static get enableLineBreaks() { return false; }

  constructor({ data, readOnly, block }: any) {
    this.readOnly = readOnly || false;
    this.blockAPI = block;
    this.wrapper = document.createElement('div');

    this.data = {
      text: data.text || 'Click Here',
      url: data.url || '',
      alignment: data.alignment || 'center',
      backgroundColor: data.backgroundColor || '',
      textColor: data.textColor || '#ffffff',
      borderRadius: data.borderRadius ?? 4,
    };
  }

  renderSettings(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '4px 0';

    // Alignment options
    const alignments: Array<{ value: string; label: string }> = [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
    ];

    const alignRow = document.createElement('div');
    alignRow.style.display = 'flex';
    alignRow.style.gap = '4px';
    alignRow.style.marginBottom = '8px';

    for (const a of alignments) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = a.label;
      btn.style.cssText = `padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid var(--pico-muted-border-color,#e2e8f0);background:${this.data.alignment === a.value ? 'var(--pico-primary-background)' : 'transparent'};font-family:inherit;`;
      btn.addEventListener('click', () => {
        this.data.alignment = a.value as any;
        this.refreshPreview();
        this.notifyChange();
      });
      alignRow.appendChild(btn);
    }
    wrapper.appendChild(alignRow);

    // Background color
    const bgLabel = document.createElement('label');
    bgLabel.textContent = 'Background Color';
    bgLabel.style.cssText = 'font-size:11px;font-weight:600;display:block;margin-bottom:4px;';
    wrapper.appendChild(bgLabel);

    const bgInput = document.createElement('input');
    bgInput.type = 'color';
    bgInput.value = this.data.backgroundColor || '#7c3aed';
    bgInput.style.cssText = 'width:100%;min-height:28px;padding:0;margin-bottom:8px;';
    bgInput.addEventListener('change', () => {
      this.data.backgroundColor = bgInput.value;
      this.refreshPreview();
      this.notifyChange();
    });
    wrapper.appendChild(bgInput);

    // Border radius
    const brLabel = document.createElement('label');
    brLabel.textContent = 'Border Radius';
    brLabel.style.cssText = 'font-size:11px;font-weight:600;display:block;margin-bottom:4px;';
    wrapper.appendChild(brLabel);

    const brInput = document.createElement('input');
    brInput.type = 'range';
    brInput.min = '0';
    brInput.max = '24';
    brInput.value = String(this.data.borderRadius ?? 4);
    brInput.style.cssText = 'width:100%;';
    brInput.addEventListener('input', () => {
      this.data.borderRadius = Number(brInput.value);
      this.refreshPreview();
      this.notifyChange();
    });
    wrapper.appendChild(brInput);

    return wrapper;
  }

  render(): HTMLElement {
    this.wrapper.innerHTML = '';
    this.wrapper.style.textAlign = this.data.alignment;
    this.wrapper.style.padding = '8px 0';

    const btnEl = document.createElement('a');
    btnEl.contentEditable = this.readOnly ? 'false' : 'true';
    btnEl.textContent = this.data.text;
    btnEl.style.cssText = `display:inline-block;padding:10px 24px;background:${this.data.backgroundColor || '#7c3aed'};color:${this.data.textColor || '#ffffff'};border-radius:${this.data.borderRadius ?? 4}px;text-decoration:none;font-weight:600;cursor:text;min-width:100px;text-align:center;`;

    btnEl.addEventListener('blur', () => {
      this.data.text = btnEl.textContent || 'Click Here';
      this.notifyChange();
    });

    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.placeholder = 'Button URL...';
    urlInput.value = this.data.url;
    urlInput.style.cssText = `display:block;width:100%;margin-top:6px;padding:4px 8px;border:1px solid var(--pico-muted-border-color,#e2e8f0);border-radius:4px;font-size:12px;font-family:inherit;background:transparent;color:inherit;`;

    if (this.readOnly) {
      urlInput.readOnly = true;
    }

    urlInput.addEventListener('change', () => {
      this.data.url = urlInput.value;
      this.notifyChange();
    });

    this.wrapper.appendChild(btnEl);
    this.wrapper.appendChild(urlInput);
    return this.wrapper;
  }

  private refreshPreview() {
    const btnEl = this.wrapper.querySelector('a');
    if (btnEl) {
      btnEl.style.background = this.data.backgroundColor || '#7c3aed';
      btnEl.style.color = this.data.textColor || '#ffffff';
      btnEl.style.borderRadius = `${this.data.borderRadius ?? 4}px`;
    }
    this.wrapper.style.textAlign = this.data.alignment;
  }

  private notifyChange() {
    if (this.blockAPI && typeof this.blockAPI.dispatchChange === 'function') {
      this.blockAPI.dispatchChange();
    }
  }

  save(): ButtonBlockData {
    return {
      text: this.data.text,
      url: this.data.url,
      alignment: this.data.alignment,
      backgroundColor: this.data.backgroundColor,
      textColor: this.data.textColor,
      borderRadius: this.data.borderRadius,
    };
  }

  validate(data: ButtonBlockData): boolean {
    return !!data.text;
  }
}
