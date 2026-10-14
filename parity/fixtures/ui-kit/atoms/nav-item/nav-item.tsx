import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'pop-nav-item',
  encapsulation: { type: 'scoped' },
  styleUrl: 'nav-item.css',
})
export class NavItem {
  @Prop() href: string;
  @Prop() icon: string;
  @Prop() label: string;
  @Prop() active = false;

  render() {
    return (
      <a href={this.href} class={{ 'ni': true, 'ni--active': this.active }}>
        {this.icon && <span class="ni-icon">{this.icon}</span>}
        {this.label && <span class="ni-label">{this.label}</span>}
      </a>
    );
  }
}
