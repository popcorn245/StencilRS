import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';

interface TabItem {
  label: string;
  value: string;
  /** Optional count bubble rendered after the label (e.g. Items ⑨). Omit to hide. */
  count?: number;
  /** Optional ionicon name rendered before the label (required for `compact`
   *  to have something to collapse to, e.g. 'cube-outline'). */
  icon?: string;
}

/**
 * `pop-tab-bar` — the shared tab row with optional per-tab count bubbles and
 * icons.
 *
 * COMPACT variant (`compact`): when the bar's own width falls under 480px
 * (a container query — panel width, not viewport), inactive tabs collapse to
 * icon + count with the label visually hidden; the ACTIVE tab keeps its label.
 * This keeps five tabs visible on a phone without horizontal scroll. Tabs
 * without an `icon` keep their label (there'd be nothing left to show).
 * Browsers without container-query support just keep the full labels.
 */
@Component({
  tag: 'pop-tab-bar',
  encapsulation: { type: 'scoped' },
  styleUrl: 'tab-bar.css',
})
export class TabBar {
  @Prop() tabs = '[]';
  @Prop({ mutable: true, reflect: true }) activeTab: string;
  @Prop() scrollable = false;
  /** Collapse inactive tabs to icon + count when the bar is narrower than
   *  480px (needs per-tab `icon`s). */
  @Prop() compact = false;

  @Event() popTabChange: EventEmitter<{ value: string }>;

  private get parsedTabs(): TabItem[] {
    try { return JSON.parse(this.tabs); }
    catch { return []; }
  }

  private handleClick(value: string) {
    this.activeTab = value;
    this.popTabChange.emit({ value });
  }

  render() {
    const tabs = this.parsedTabs;
    return (
      <div class={{ 'tb-wrap': true, 'tb-wrap--compact': this.compact }}>
        <div class={{ 'tb-bar': true, 'tb-bar--scrollable': this.scrollable }} role="tablist">
          {tabs.map((tab) => (
            <button
              class={{
                'tb-tab': true,
                'tb-tab--active': this.activeTab === tab.value,
                'tb-tab--iconed': !!tab.icon,
              }}
              role="tab"
              aria-selected={String(this.activeTab === tab.value)}
              aria-label={tab.label}
              title={tab.label}
              onClick={() => this.handleClick(tab.value)}
            >
              {tab.icon && <pop-icon class="tb-tab-icon" name={tab.icon} />}
              <span class="tb-tab-label">{tab.label}</span>
              {typeof tab.count === 'number' && <span class="tb-tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }
}
