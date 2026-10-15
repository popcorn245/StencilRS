import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'pop-list-item',
  encapsulation: { type: 'scoped' },
  styleUrl: 'list-item.css',
})
export class ListItem {
  @Prop() href: string;
  @Prop() icon: string;
  @Prop() selected = false;

  render() {
    const Tag = this.href ? 'a' : 'div';
    const attrs = this.href ? { href: this.href } : {};

    return (
      <Tag class={{ 'li': true, 'li--selected': this.selected }} {...attrs}>
        <div class="li-thumb">
          <slot name="thumbnail">
            {this.icon && <span>{this.icon}</span>}
          </slot>
        </div>
        <div class="li-content">
          <div class="li-title"><slot></slot></div>
          <div class="li-subtitle"><slot name="subtitle"></slot></div>
        </div>
        <div class="li-trailing">
          <slot name="trailing"></slot>
        </div>
      </Tag>
    );
  }
}
