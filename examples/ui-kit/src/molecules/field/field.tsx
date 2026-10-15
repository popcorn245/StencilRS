import { Component, Prop, Event, EventEmitter, Element, h } from '@stencil/core';
import {
  type FieldSpec,
  clampNumber,
  DEPTH_STOPS,
  DEPTH_PRESET_SOURCES,
  type DepthStop,
  depthStopFromValues,
  depthValuesForStop,
  clampCustomSources,
  normalizeDepthValue,
  persistToggles,
  persistFromToggles,
  isTruthyValue,
} from './field-logic';

/**
 * pop-field — ONE labeled form field: a `FieldSpec` → the right widget.
 *
 * Type → widget:
 *   text, select → pop-fillable-field   number → native input (CLAMPED to min/max)
 *   date → native date input            boolean → pop-switch
 *   location → pop-location             depth / persist → composites (below)
 *   anything else → default-slot fallback (label/hint/required chrome kept,
 *                   slotted widget's `valueChange` re-emitted as pop-field's own)
 *
 * Emits `valueChange` with `{ key, value }` for every edit.
 *
 * Composites:
 *   depth   — value is `{ depth, maxSources }` (see DepthValue): the Quick/
 *             Standard/Deep/Custom slider + source-count box. Presets set
 *             `depth` and clear `maxSources`; Custom clears `depth` and drives
 *             `maxSources` (the host emits --depth / --max-sources from it).
 *   persist — value is 'none'|'note'|'index'|'both' computed from the two
 *             checkboxes (Save as note / Add to knowledge base).
 *
 * Single-field only, by decision — schema-driven pop-form is deferred; hosts
 * keep their own form-assembly loop and render each field through this.
 */
@Component({
  tag: 'pop-field',
  encapsulation: { type: 'scoped' },
  styleUrl: 'field.css',
})
export class PopField {
  @Element() el!: HTMLElement;

  /** The field spec (object — set as a property, not an attribute). */
  @Prop() spec!: FieldSpec;
  /** Current value. string for most types; boolean for `boolean`;
   *  `{depth,maxSources}` for `depth`. */
  @Prop({ mutable: true }) value?: unknown;
  @Prop() disabled = false;
  /** Owner-driven inline "Required" feedback (shown under the widget). */
  @Prop() invalid = false;

  /** Emitted with `{ key, value }` on every edit (incl. re-emitted slot-fallback
   *  changes). */
  @Event() valueChange!: EventEmitter<{ key: string; value: unknown }>;

  private emit(value: unknown) {
    this.value = value;
    this.valueChange.emit({ key: this.spec.key, value });
  }

  /** Swallow an inner widget's own `valueChange` (pop-fillable-field, a slotted
   *  custom widget) and re-emit it normalized as pop-field's `{key, value}`. */
  private relay = (e: Event, map?: (detail: unknown) => unknown) => {
    e.stopPropagation();
    const detail = (e as CustomEvent).detail;
    this.emit(map ? map(detail) : detail);
  };

  private get str(): string {
    return typeof this.value === 'string' ? this.value : this.value == null ? '' : String(this.value);
  }

  // ── chrome ──────────────────────────────────────────────────────────────────

  private labelText(): string {
    return this.spec.label + (this.spec.required ? ' *' : '');
  }

  private chrome(control: unknown, opts: { ownLabel?: boolean } = {}) {
    return (
      <div
        class={{
          field: true,
          [`field--${this.spec.type}`]: true,
          'field--invalid': this.invalid,
          'field--disabled': this.disabled,
        }}
      >
        {!opts.ownLabel && (
          <span class="field__label">
            <span class="field__label-text">{this.labelText()}</span>
            {this.spec.hint && <span class="field__hint">{this.spec.hint}</span>}
          </span>
        )}
        {control}
        {this.invalid && (
          <span class="field__error" role="alert">
            Required
          </span>
        )}
      </div>
    );
  }

  // ── widgets per type ────────────────────────────────────────────────────────

  private renderFillable(inputType: 'text' | 'select') {
    const base =
      inputType === 'select' && this.spec.options ? this.spec.options.map((o) => ({ ...o })) : undefined;
    // An OPTIONAL select with no default starts unset, but a bare <select> shows
    // its first option anyway — prepend an explicit "—" so unset renders unset.
    const opts =
      base && this.spec.optional && !this.spec.defaultValue ? [{ value: '', label: '—' }, ...base] : base;
    return this.chrome(
      <pop-fillable-field
        label={this.labelText()}
        hint={this.spec.hint}
        value={this.str}
        placeholder={this.spec.placeholder}
        inputType="text"
        askable={false}
        {...(opts ? { options: opts } : {})}
        onValueChange={(e: CustomEvent<string>) => this.relay(e)}
      />,
      { ownLabel: true },
    );
  }

  private renderNumber() {
    const clampedNote =
      this.str.trim() !== '' && (this.spec.min != null || this.spec.max != null)
        ? this.spec.max != null && Number(this.str) === this.spec.max
          ? `Max ${this.spec.max}`
          : this.spec.min != null && Number(this.str) === this.spec.min
            ? `Min ${this.spec.min}`
            : ''
        : '';
    return this.chrome([
      <input
        class="field__input"
        type="number"
        value={this.str}
        placeholder={this.spec.placeholder}
        min={this.spec.min}
        max={this.spec.max}
        step={this.spec.step}
        disabled={this.disabled}
        aria-label={this.spec.label}
        onInput={(e: Event) => {
          const raw = (e.target as HTMLInputElement).value;
          const clamped = clampNumber(raw, this.spec.min, this.spec.max);
          this.emit(clamped != null ? String(clamped) : raw);
        }}
      />,
      clampedNote && (
        <span class="field__note" role="status">
          {clampedNote}
        </span>
      ),
    ]);
  }

  private renderDate() {
    return this.chrome(
      <input
        class="field__input"
        type="date"
        value={this.str}
        disabled={this.disabled}
        aria-label={this.spec.label}
        onInput={(e: Event) => this.emit((e.target as HTMLInputElement).value)}
      />,
    );
  }

  private renderBoolean() {
    const on = isTruthyValue(this.value);
    return (
      <div
        class={{ field: true, 'field--boolean': true, 'field--invalid': this.invalid, 'field--disabled': this.disabled }}
      >
        <span class="field__switchrow">
          <span class="field__label">
            <span class="field__label-text">{this.labelText()}</span>
            {this.spec.hint && <span class="field__hint">{this.spec.hint}</span>}
          </span>
          <pop-switch
            checked={on}
            disabled={this.disabled}
            label={this.spec.label}
            onPopChange={(e: CustomEvent<boolean>) => {
              e.stopPropagation();
              this.emit(e.detail);
            }}
          />
        </span>
      </div>
    );
  }

  private renderLocation() {
    return this.chrome(
      <pop-location
        value={this.str}
        default={this.spec.defaultValue || ''}
        onPopLocationChange={(e: CustomEvent<{ label: string; zip: string }>) => {
          e.stopPropagation();
          const d = e.detail || ({} as { label: string; zip: string });
          this.emit((d.zip && d.zip.trim()) || (d.label && d.label.trim()) || '');
        }}
      />,
    );
  }

  /** Depth slider (Quick/Standard/Deep/Custom) + source-count box. */
  private renderDepth() {
    const dv = normalizeDepthValue(this.value);
    const stop = depthStopFromValues(dv.depth, dv.maxSources);
    const idx = DEPTH_STOPS.indexOf(stop);
    const isCustom = stop === 'custom';
    const customCount = clampCustomSources(parseInt(dv.maxSources || '8', 10));
    const count = isCustom ? customCount : DEPTH_PRESET_SOURCES[stop as 'quick' | 'standard' | 'deep'];
    const applyStop = (s: DepthStop) => this.emit(depthValuesForStop(s, customCount));
    return this.chrome(
      <div class="field__depth">
        <div class="field__depth-head">
          <div class="field__depth-count">
            <input
              type="number"
              min="1"
              max="10"
              value={String(count)}
              disabled={!isCustom || this.disabled}
              aria-label="Sources to read"
              onInput={(e: Event) =>
                this.emit({
                  depth: '',
                  maxSources: String(clampCustomSources(parseInt((e.target as HTMLInputElement).value, 10))),
                })
              }
            />
            <span class="field__depth-unit">sources</span>
          </div>
        </div>
        <input
          class="field__depth-slider"
          type="range"
          min="0"
          max={String(DEPTH_STOPS.length - 1)}
          step="1"
          value={String(idx)}
          disabled={this.disabled}
          aria-label={this.spec.label}
          onInput={(e: Event) => applyStop(DEPTH_STOPS[parseInt((e.target as HTMLInputElement).value, 10)])}
        />
        <div class="field__depth-ticks">
          {DEPTH_STOPS.map((s) => (
            <button
              type="button"
              class={{ 'field__depth-tick': true, 'field__depth-tick--on': s === stop }}
              disabled={this.disabled}
              onClick={() => applyStop(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>,
    );
  }

  /** Persist as two checkboxes → one 'none'|'note'|'index'|'both' value. */
  private renderPersist() {
    const { note, index } = persistToggles(this.str);
    const set = (nextNote: boolean, nextIndex: boolean) => this.emit(persistFromToggles(nextNote, nextIndex));
    const row = (checked: boolean, text: string, onToggle: () => void) => (
      <label class="field__check-row">
        <input type="checkbox" checked={checked} disabled={this.disabled} onChange={onToggle} />
        <span>{text}</span>
      </label>
    );
    return this.chrome(
      <div class="field__check-group">
        {row(note, 'Save as note', () => set(!note, index))}
        {row(index, 'Add to knowledge base', () => set(note, !index))}
      </div>,
    );
  }

  /** Unknown type → the app slots the widget; chrome + valueChange relay kept. */
  private renderSlotFallback() {
    return this.chrome(
      // `valueChange` is a custom event (not in HTMLAttributes) — spread-cast the
      // listener so the slotted widget's emissions reach the relay.
      <span class="field__slot" {...({ onValueChange: (e: Event) => this.relay(e) } as Record<string, unknown>)}>
        <slot></slot>
      </span>,
    );
  }

  render() {
    if (!this.spec) return null;
    switch (this.spec.type) {
      case 'text':
      case 'select':
        return this.renderFillable(this.spec.type);
      case 'number':
        return this.renderNumber();
      case 'date':
        return this.renderDate();
      case 'boolean':
        return this.renderBoolean();
      case 'location':
        return this.renderLocation();
      case 'depth':
        return this.renderDepth();
      case 'persist':
        return this.renderPersist();
      default:
        return this.renderSlotFallback();
    }
  }
}
