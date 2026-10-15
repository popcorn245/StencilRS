import type { BlockTune } from '@editorjs/editorjs';

interface VisibilityConditionData {
  variable?: string;
}

/**
 * VisibilityConditionTune — Block-level tune that wraps a block's MJML
 * output in a Handlebars {{#if variable}} conditional.
 *
 * Used in email templates to conditionally show/hide blocks based on
 * merge variables at send time.
 */
export default class VisibilityConditionTune implements BlockTune {
  private data: VisibilityConditionData;
  private block: any;

  static get isTune() { return true; }

  constructor({ data, api: _api, block }: any) {
    this.data = data || {};
    this.block = block;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '8px';

    const label = document.createElement('div');
    label.style.cssText = 'font-size:11px;font-weight:600;color:var(--pico-muted-color,#64748b);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
    label.textContent = 'Visibility Condition';
    wrapper.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Variable name (e.g. showPromo)';
    input.value = this.data.variable || '';
    input.style.cssText = 'width:100%;padding:4px 8px;border:1px solid var(--pico-muted-border-color,#e2e8f0);border-radius:6px;font-size:13px;font-family:inherit;background:var(--pico-form-element-background-color,transparent);color:inherit;';

    input.addEventListener('change', () => {
      this.data.variable = input.value.trim() || undefined;
      // Dispatch block change
      if (this.block && typeof this.block.dispatchChange === 'function') {
        this.block.dispatchChange();
      }
    });

    wrapper.appendChild(input);

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:10px;color:var(--pico-muted-color,#999);margin-top:4px;';
    hint.textContent = 'Block shows only when this variable is truthy at send time.';
    wrapper.appendChild(hint);

    return wrapper;
  }

  save(): VisibilityConditionData {
    return {
      variable: this.data.variable || undefined,
    };
  }
}
