import { Component, h, Prop, State, Event, EventEmitter, Watch } from '@stencil/core';

interface TagAction {
  type: 'storage' | 'shop' | 'recipes' | 'routines' | 'inventory' | 'custom';
  label: string;
  payload: Record<string, unknown>;
}

const TYPE_ICONS: Record<string, string> = {
  storage: '\u{1F4E6}',     // package
  shop: '\u{1F6D2}',        // shopping cart
  recipes: '\u{1F373}',     // cooking
  routines: '\u{1F504}',    // cycle arrows
  inventory: '\u{1F4E6}',   // package (inventory)
  custom: '\u{26A1}',       // lightning
};

@Component({
  tag: 'pop-action-picker',
  encapsulation: { type: 'scoped' },
  styleUrl: 'action-picker.css',
})
export class PopActionPicker {
  /** JSON-encoded array of TagAction objects */
  @Prop() actions: string = '[]';

  /** Name of the scanned tag (displayed in the header) */
  @Prop() actionTagName: string = '';

  /** Whether the picker is open */
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  /** Emitted when the user selects an action */
  @Event({ composed: true, bubbles: true }) actionSelected: EventEmitter<TagAction>;

  /** Emitted when the user dismisses the picker */
  @Event({ composed: true, bubbles: true }) pickerDismiss: EventEmitter<void>;

  @State() parsedActions: TagAction[] = [];

  @Watch('actions')
  onActionsChange(val: string) {
    this.parseActions(val);
  }

  componentWillLoad() {
    this.parseActions(this.actions);
  }

  private parseActions(val: string) {
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      this.parsedActions = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.parsedActions = [];
    }
  }

  private onBackdropClick = () => {
    this.open = false;
    this.pickerDismiss.emit();
  };

  private onActionClick = (action: TagAction) => {
    this.open = false;
    this.actionSelected.emit(action);
  };

  render() {
    if (!this.open) return null;

    return (
      <div class="ap-backdrop" onClick={this.onBackdropClick}>
        <div class="ap-panel" onClick={(e: Event) => e.stopPropagation()}>
          <div class="ap-handle" />

          <h3 class="ap-title">{this.actionTagName || 'Select Action'}</h3>

          <ul class="ap-list">
            {this.parsedActions.map((action) => (
              <li>
                <button
                  class="ap-action-btn"
                  type="button"
                  onClick={() => this.onActionClick(action)}
                >
                  <span class="ap-action-icon">
                    {TYPE_ICONS[action.type] || TYPE_ICONS.custom}
                  </span>
                  <span class="ap-action-body">
                    <span class="ap-action-label">{action.label}</span>
                    <span class="ap-action-type">{action.type}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button class="ap-cancel-btn" type="button" onClick={this.onBackdropClick}>
            Cancel
          </button>
        </div>
      </div>
    );
  }
}
