import { Component, Prop, h, Host } from '@stencil/core';

@Component({
  tag: 'pop-sidebar',
  encapsulation: { type: 'scoped' },
  styleUrl: 'sidebar.css',
})
export class PopSidebar {
  /**
   * Whether the sidebar is open
   */
  @Prop({ reflect: true, mutable: true }) open: boolean = false;

  /**
   * Which side the sidebar should appear on
   */
  @Prop({ reflect: true }) side: 'left' | 'right' = 'left';

  private toggle = () => {
    this.open = !this.open;
  };

  render() {
    return (
      <Host class={{ 'sidebar-open': this.open, [`sidebar-${this.side}`]: true }}>
        {/* Hidden Checkbox for CSS state (optional, or we just use class) 
            User asked for "adds the checkbox", implying reusing the CSS hack.
            We can sync the prop with the checkbox. */}
        <input 
            type="checkbox" 
            class="sidebar-checkbox" 
            checked={this.open} 
            onChange={this.toggle}
            id="pop-sidebar-toggle" // ID might need uniqueness if multiple, but specific req was basic
        />
        
        {/* The Trigger (Hamburger) - can be placed by consumer or we provide a default slot/button */}
        {/* If we want a trigger area, maybe a slot? */}
        
        {/* Sidebar Content */}
        <aside class="sidebar-content">
            <slot name="sidebar" />
        </aside>

        {/* Overlay */}
        <label htmlFor="pop-sidebar-toggle" class="sidebar-overlay" onClick={() => this.open = false}></label>

        {/* Main Content */}
        <main class="main-content">
            {/* We might need a trigger here if the user wants it inside main */}
            <label htmlFor="pop-sidebar-toggle" class="sidebar-trigger">
                <slot name="trigger">☰</slot>
            </label>
            <slot />
        </main>
      </Host>
    );
  }
}
