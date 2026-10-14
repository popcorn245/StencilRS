import { Component, h, Prop, State, Event, EventEmitter, Element, Watch } from '@stencil/core';

/**
 * pop-split-pane
 *
 * Responsive layout primitive with three modes:
 *  - three-column: side-by-side panes (panes 1/2/3)
 *  - two-column: left list + right area (right may be tabbed)
 *  - stack: one screen at a time (mobile back-stack)
 *  - auto: picks one of the above based on container width vs `breakpoints`
 *
 * The component owns:
 *  - mode resolution from container width (when mode="auto")
 *  - resizable dividers in 2- and 3-column modes
 *  - persisted widths in localStorage when `persistKey` is set
 *  - active screen in stack mode
 *  - active tab in two-column tabbed mode
 *
 * The component does NOT own:
 *  - what content goes in each pane (use slots)
 *  - which screen is active in stack mode (driven by `activeScreen` prop)
 *  - URL routing (consumer drives stack screen + selection via router)
 */
export type SplitPaneMode = 'three-column' | 'two-column' | 'stack' | 'auto';

export interface SplitPaneBreakpoints {
  desktop: number;
  tablet: number;
}

@Component({
  tag: 'pop-split-pane',
  encapsulation: { type: 'scoped' },
  styleUrl: 'split-pane.css',
})
export class PopSplitPane {
  @Element() el: HTMLElement;

  /** Layout mode. `'auto'` switches based on container width. */
  @Prop() mode: SplitPaneMode = 'auto';

  /** JSON-encoded breakpoints object, e.g. `'{"desktop":1200,"tablet":768}'`. */
  @Prop() breakpoints: string = '{"desktop":1200,"tablet":768}';

  /** JSON-encoded default widths (percent per visible pane). */
  @Prop() defaultWidths: string = '';

  /** localStorage key for persisting widths. Empty disables persistence. */
  @Prop() persistKey: string = '';

  /** In two-column mode, render right pane as tabbed. */
  @Prop() tabsRight: boolean = false;

  /** Stack mode: which screen is visible (`'list-screen'` | `'detail-screen'`). */
  @Prop({ mutable: true }) activeScreen: string = 'list-screen';

  /** Tabs mode: which tab is visible (`'tab-details'` | `'tab-note'`). */
  @Prop({ mutable: true }) activeTab: string = 'tab-details';

  /** Widths actually changed by the user dragging a divider. */
  @Event({ composed: true, bubbles: true }) widthsChanged: EventEmitter<number[]>;

  /** Stack mode: which screen is showing. */
  @Event({ composed: true, bubbles: true }) activeScreenChanged: EventEmitter<string>;

  /** Tabs mode: which tab is showing. */
  @Event({ composed: true, bubbles: true }) activeTabChanged: EventEmitter<string>;

  @State() resolvedMode: SplitPaneMode = 'three-column';
  @State() widths: number[] = [];

  private resizeObserver?: ResizeObserver;
  private dragState: { idx: number; startX: number; startWidths: number[] } | null = null;

  componentWillLoad() {
    this.widths = this.computeInitialWidths();
    this.resolvedMode = this.resolveMode(this.currentWidth());
  }

  componentDidLoad() {
    // Watch container width for auto-mode switching
    if (this.mode === 'auto' && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect?.width ?? this.currentWidth();
        const next = this.resolveMode(w);
        if (next !== this.resolvedMode) {
          this.resolvedMode = next;
          // Re-seed widths when mode flips (different pane counts)
          this.widths = this.computeInitialWidths();
        }
      });
      this.resizeObserver.observe(this.el);
    }
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.detachDrag();
  }

  @Watch('mode')
  onModeChange() {
    this.resolvedMode = this.mode === 'auto' ? this.resolveMode(this.currentWidth()) : this.mode;
    this.widths = this.computeInitialWidths();
  }

  private currentWidth(): number {
    return this.el?.getBoundingClientRect().width || (typeof window !== 'undefined' ? window.innerWidth : 1200);
  }

  private parseBreakpoints(): SplitPaneBreakpoints {
    try {
      const bp = JSON.parse(this.breakpoints);
      return { desktop: Number(bp.desktop) || 1200, tablet: Number(bp.tablet) || 768 };
    } catch {
      return { desktop: 1200, tablet: 768 };
    }
  }

  private resolveMode(width: number): SplitPaneMode {
    if (this.mode !== 'auto') return this.mode;
    const bp = this.parseBreakpoints();
    if (width >= bp.desktop) return 'three-column';
    if (width >= bp.tablet) return 'two-column';
    return 'stack';
  }

  private computeInitialWidths(): number[] {
    const mode = this.mode === 'auto' ? this.resolveMode(this.currentWidth()) : this.mode;
    // Try persisted first
    if (this.persistKey && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.persistKey + ':' + mode);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) {
            return parsed;
          }
        }
      } catch { /* ignore */ }
    }
    // Try caller-supplied defaults
    if (this.defaultWidths) {
      try {
        const parsed = JSON.parse(this.defaultWidths);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* ignore */ }
    }
    // Built-in defaults
    if (mode === 'three-column') return [35, 35, 30];
    if (mode === 'two-column') return [45, 55];
    return [];
  }

  private persistWidths() {
    if (!this.persistKey || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.persistKey + ':' + this.resolvedMode, JSON.stringify(this.widths));
    } catch { /* ignore quota */ }
  }

  private onDragStart = (idx: number) => (e: MouseEvent) => {
    e.preventDefault();
    this.dragState = { idx, startX: e.clientX, startWidths: [...this.widths] };
    document.addEventListener('mousemove', this.onDragMove);
    document.addEventListener('mouseup', this.onDragEnd);
  };

  private onDragMove = (e: MouseEvent) => {
    if (!this.dragState) return;
    const totalWidth = this.currentWidth();
    if (totalWidth <= 0) return;
    const deltaPct = ((e.clientX - this.dragState.startX) / totalWidth) * 100;
    const next = [...this.dragState.startWidths];
    const i = this.dragState.idx;
    // Move width between pane[i] and pane[i+1]
    const min = 10; // % floor per pane
    const proposedLeft = next[i] + deltaPct;
    const proposedRight = next[i + 1] - deltaPct;
    if (proposedLeft < min || proposedRight < min) return;
    next[i] = proposedLeft;
    next[i + 1] = proposedRight;
    this.widths = next;
  };

  private onDragEnd = () => {
    this.detachDrag();
    this.persistWidths();
    this.widthsChanged.emit([...this.widths]);
  };

  private detachDrag() {
    this.dragState = null;
    document.removeEventListener('mousemove', this.onDragMove);
    document.removeEventListener('mouseup', this.onDragEnd);
  }

  // Reserved for future external/manual screen switching.
  protected setActiveScreen = (name: string) => {
    if (this.activeScreen === name) return;
    this.activeScreen = name;
    this.activeScreenChanged.emit(name);
  };

  private setActiveTab = (name: string) => {
    if (this.activeTab === name) return;
    this.activeTab = name;
    this.activeTabChanged.emit(name);
  };

  render() {
    if (this.resolvedMode === 'stack') return this.renderStack();
    if (this.resolvedMode === 'two-column') return this.renderTwoColumn();
    return this.renderThreeColumn();
  }

  private renderThreeColumn() {
    const w = this.widths.length === 3 ? this.widths : [35, 35, 30];
    return (
      <div class="sp sp--three">
        <div class="sp__pane" style={{ flexBasis: w[0] + '%' }}>
          <slot name="pane-1" />
        </div>
        <div class="sp__divider" role="separator" aria-orientation="vertical" onMouseDown={this.onDragStart(0)} />
        <div class="sp__pane" style={{ flexBasis: w[1] + '%' }}>
          <slot name="pane-2" />
        </div>
        <div class="sp__divider" role="separator" aria-orientation="vertical" onMouseDown={this.onDragStart(1)} />
        <div class="sp__pane" style={{ flexBasis: w[2] + '%' }}>
          <slot name="pane-3" />
        </div>
      </div>
    );
  }

  private renderTwoColumn() {
    const w = this.widths.length === 2 ? this.widths : [45, 55];
    return (
      <div class="sp sp--two">
        <div class="sp__pane" style={{ flexBasis: w[0] + '%' }}>
          <slot name="pane-1" />
        </div>
        <div class="sp__divider" role="separator" aria-orientation="vertical" onMouseDown={this.onDragStart(0)} />
        <div class="sp__pane" style={{ flexBasis: w[1] + '%' }}>
          {this.tabsRight ? this.renderTabbedRight() : <slot name="pane-2" />}
        </div>
      </div>
    );
  }

  private renderTabbedRight() {
    const tabs = [
      { id: 'tab-details', label: 'Details' },
      { id: 'tab-note', label: 'Note' },
    ];
    return (
      <div class="sp__tabs">
        <div class="sp__tabstrip" role="tablist">
          {tabs.map(t => (
            <button
              type="button"
              role="tab"
              aria-selected={this.activeTab === t.id ? 'true' : 'false'}
              class={{ 'sp__tab': true, 'sp__tab--active': this.activeTab === t.id }}
              onClick={() => this.setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div class="sp__tabpanels">
          <div class={{ 'sp__tabpanel': true, 'sp__tabpanel--hidden': this.activeTab !== 'tab-details' }} role="tabpanel">
            <slot name="tab-details" />
          </div>
          <div class={{ 'sp__tabpanel': true, 'sp__tabpanel--hidden': this.activeTab !== 'tab-note' }} role="tabpanel">
            <slot name="tab-note" />
          </div>
        </div>
      </div>
    );
  }

  private renderStack() {
    return (
      <div class="sp sp--stack">
        <div class={{ 'sp__screen': true, 'sp__screen--hidden': this.activeScreen !== 'list-screen' }}>
          <slot name="list-screen" />
        </div>
        <div class={{ 'sp__screen': true, 'sp__screen--hidden': this.activeScreen !== 'detail-screen' }}>
          <slot name="detail-screen" />
        </div>
      </div>
    );
  }
}
