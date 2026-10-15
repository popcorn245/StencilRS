import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

/**
 * pop-radio-group — pill-button single-select for short option sets.
 *
 *   <pop-radio-group
 *     value={visibility}
 *     options={[{ id: 'private', label: 'Private' }, { id: 'family', label: 'Family' }]}
 *     onValueChanged={ev => save(ev.detail)}
 *   />
 *
 * Renders as a row of buttons; selected one carries `--selected`. Use for
 * 2–6 mutually exclusive values (visibility, priority, status). Bigger sets
 * should use a select or dropdown.
 */

export interface RadioOption {
  id: string;
  label: string;
  /** Optional small icon prefix (emoji or short string). */
  icon?: string;
}

@Component({
  tag: 'pop-radio-group',
  encapsulation: { type: 'scoped' },
  styleUrl: 'radio-group.css',
})
export class PopRadioGroup {
  @Prop({ mutable: true }) value: string = '';
  @Prop() options: RadioOption[] = [];
  @Prop() ariaLabel: string = '';
  @Prop() disabled: boolean = false;

  @Event({ composed: true, bubbles: true }) valueChanged!: EventEmitter<string>;

  private select(id: string) {
    if (this.disabled || this.value === id) return;
    this.value = id;
    this.valueChanged.emit(id);
  }

  render() {
    return (
      <div class="prg" role="radiogroup" aria-label={this.ariaLabel || undefined}>
        {(this.options || []).map((opt) => {
          const selected = this.value === opt.id;
          return (
            <button
              type="button"
              key={opt.id}
              class={{ prg__opt: true, 'prg__opt--selected': selected }}
              role="radio"
              aria-checked={selected ? 'true' : 'false'}
              disabled={this.disabled}
              onClick={(e) => {
                e.preventDefault();
                this.select(opt.id);
              }}
            >
              {opt.icon && <span class="prg__icon" aria-hidden="true">{opt.icon}</span>}
              <span class="prg__label">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }
}
