import type { BlockTool } from '@editorjs/editorjs';

interface DividerBlockData {
  style: 'solid' | 'dashed' | 'dotted';
  color?: string;
  width?: string;
  padding?: number;
}

/**
 * DividerBlock — EditorJS Block Tool for email dividers.
 *
 * Renders a horizontal rule in the editor that maps to
 * <mj-divider> via the popmail converter.
 */
export default class DividerBlock implements BlockTool {
  private data: DividerBlockData;
  private blockAPI: any;
  private wrapper: HTMLElement;

  static get toolbox() {
    return {
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/>
      </svg>`,
      title: 'Divider',
    };
  }

  static get isReadOnlySupported() { return true; }
  static get enableLineBreaks() { return false; }

  constructor({ data, readOnly: _readOnly, block }: any) {
    this.blockAPI = block;
    this.wrapper = document.createElement('div');

    this.data = {
      style: data.style || 'solid',
      color: data.color || '',
      width: data.width || '100%',
      padding: data.padding ?? 10,
    };
  }

  renderSettings(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '4px 0';

    // Style options
    const styles: Array<{ value: string; label: string }> = [
      { value: 'solid', label: 'Solid' },
      { value: 'dashed', label: 'Dashed' },
      { value: 'dotted', label: 'Dotted' },
    ];

    const styleRow = document.createElement('div');
    styleRow.style.display = 'flex';
    styleRow.style.gap = '4px';
    styleRow.style.marginBottom = '8px';

    for (const s of styles) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = s.label;
      btn.style.cssText = `padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid var(--pico-muted-border-color,#e2e8f0);background:${this.data.style === s.value ? 'var(--pico-primary-background)' : 'transparent'};font-family:inherit;`;
      btn.addEventListener('click', () => {
        this.data.style = s.value as any;
        this.refreshPreview();
        this.notifyChange();
      });
      styleRow.appendChild(btn);
    }
    wrapper.appendChild(styleRow);

    // Color
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Color';
    colorLabel.style.cssText = 'font-size:11px;font-weight:600;display:block;margin-bottom:4px;';
    wrapper.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = this.data.color || '#dddddd';
    colorInput.style.cssText = 'width:100%;min-height:28px;padding:0;';
    colorInput.addEventListener('change', () => {
      this.data.color = colorInput.value;
      this.refreshPreview();
      this.notifyChange();
    });
    wrapper.appendChild(colorInput);

    return wrapper;
  }

  render(): HTMLElement {
    this.wrapper.innerHTML = '';
    this.wrapper.style.padding = `${this.data.padding ?? 10}px 0`;

    const hr = document.createElement('hr');
    hr.style.cssText = `border:none;border-top:2px ${this.data.style} ${this.data.color || '#dddddd'};width:${this.data.width || '100%'};margin:0 auto;`;

    this.wrapper.appendChild(hr);
    return this.wrapper;
  }

  private refreshPreview() {
    const hr = this.wrapper.querySelector('hr');
    if (hr) {
      hr.style.borderTop = `2px ${this.data.style} ${this.data.color || '#dddddd'}`;
      hr.style.width = this.data.width || '100%';
    }
  }

  private notifyChange() {
    if (this.blockAPI && typeof this.blockAPI.dispatchChange === 'function') {
      this.blockAPI.dispatchChange();
    }
  }

  save(): DividerBlockData {
    return {
      style: this.data.style,
      color: this.data.color,
      width: this.data.width,
      padding: this.data.padding,
    };
  }
}
