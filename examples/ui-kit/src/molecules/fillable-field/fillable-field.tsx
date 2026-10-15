import { Component, h, Prop, Event, EventEmitter, Host } from '@stencil/core';

/**
 * pop-fillable-field — a labelled form control with a right-aligned "auto-fill"
 * toggle, styled like a browser password-reveal field.
 *
 * The toggle flips a field between two modes:
 *   - **baked**      (flash-off icon) — the value is fixed into whatever is
 *                    being built (e.g. an NFC tag).
 *   - **ask-on-tap** (flash icon)     — the value is collected later (when the
 *                    tag is tapped). A typed value still acts as the default.
 *
 * The input stays editable in both modes; the icon only reflects/sets the mode.
 *
 * Use the built-in text input:
 *   <pop-fillable-field
 *     label="Title"
 *     value={title}
 *     placeholder="e.g. Microwave"
 *     askOnTap={titleAsk}
 *     onValueChange={e => (title = e.detail)}
 *     onAskChange={e => (titleAsk = e.detail)}
 *   />
 *
 * …or slot a custom control (<select>, value+unit row, etc.) — set `useSlot`:
 *   <pop-fillable-field label="Priority" askOnTap={ask} useSlot onAskChange={…}>
 *     <select>…</select>
 *   </pop-fillable-field>
 */
@Component({
  tag: 'pop-fillable-field',
  encapsulation: { type: 'scoped' },
  styleUrl: 'fillable-field.css',
})
export class PopFillableField {
  /** Field label shown above the control. */
  @Prop() label!: string;

  /** Optional secondary text shown next to the label (e.g. a unit hint). */
  @Prop() hint?: string;

  /** Value for the built-in text input (ignored when `useSlot` is set). */
  @Prop({ mutable: true }) value = '';

  /** Placeholder for the built-in text input. */
  @Prop() placeholder?: string;

  /** Input type for the built-in text input (text, number, datetime-local…). */
  @Prop() inputType = 'text';

  /** When set, render a <select> of these options instead of a text input.
   *  The selected option is whichever matches `value`. */
  @Prop() options?: { value: string; label: string }[];

  /** Whether the field auto-fills on tap (true) or is baked (false). */
  @Prop({ mutable: true }) askOnTap = false;

  /** Whether to show the auto-fill toggle at all. */
  @Prop() askable = true;

  /** Render a slotted control instead of the built-in text input. */
  @Prop() useSlot = false;

  /** Emitted when the built-in input value changes. */
  @Event() valueChange!: EventEmitter<string>;

  /** Emitted when the auto-fill toggle flips. Detail is the new askOnTap. */
  @Event() askChange!: EventEmitter<boolean>;

  private onInput = (e: Event) => {
    this.value = (e.target as HTMLInputElement | HTMLSelectElement).value;
    this.valueChange.emit(this.value);
  };

  private toggle = () => {
    this.askOnTap = !this.askOnTap;
    this.askChange.emit(this.askOnTap);
  };

  render() {
    const on = this.askOnTap;
    return (
      <Host>
        <label class="ff">
          <span class="ff__label">
            <span class="ff__label-text">{this.label}</span>
            {this.hint && <span class="ff__hint">{this.hint}</span>}
          </span>
          <div class={{ ff__row: true, 'ff__row--ask': on }}>
            {this.options ? (
              <select class="ff__input" onInput={this.onInput}>
                {this.options.map((o) => (
                  <option value={o.value} selected={o.value === this.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : this.useSlot ? (
              <span class="ff__control">
                <slot />
              </span>
            ) : (
              <input
                class="ff__input"
                type={this.inputType}
                value={this.value}
                placeholder={this.placeholder}
                onInput={this.onInput}
              />
            )}
            {this.askable && (
              <button
                type="button"
                class={{ ff__toggle: true, 'ff__toggle--on': on }}
                aria-pressed={on ? 'true' : 'false'}
                aria-label={on ? 'Auto-fill on tap: on' : 'Auto-fill on tap: off'}
                title={on ? 'Asks you when the tag is tapped' : 'Baked into the tag'}
                onClick={this.toggle}
              >
                {on ? (
                  // ionicons-style "flash" (filled)
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z" />
                  </svg>
                ) : (
                  // ionicons-style "flash-off"
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M3.27 3 2 4.27l5 5V13h3v9l3.58-6.14L17.73 20 19 18.73 3.27 3zM17 10h-4l4-8H7v2.18l8.46 8.46L17 10z"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </label>
      </Host>
    );
  }
}
