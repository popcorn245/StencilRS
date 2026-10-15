import { Component, Prop, Element, Watch, h } from '@stencil/core';

@Component({
  tag: 'pop-nav-bar',
  encapsulation: { type: 'scoped' },
  styleUrl: 'nav-bar.css',
})
export class NavBar {
  @Element() el: HTMLElement;

  @Prop() direction: 'horizontal' | 'vertical' = 'horizontal';
  @Prop() position: 'top' | 'bottom' | 'side' | 'none' = 'none';
  @Prop() activeHref: string;

  @Watch('activeHref')
  updateActiveItems() {
    const items = this.el.querySelectorAll('pop-nav-item');
    items.forEach((item: any) => {
      item.active = item.href === this.activeHref;
    });
  }

  componentDidLoad() {
    if (this.direction === 'vertical') {
      const items = this.el.querySelectorAll('pop-nav-item');
      items.forEach(item => item.classList.add('ni--vertical'));
    }
    this.updateActiveItems();
  }

  render() {
    return (
      <nav
        class={{
          'nb': true,
          [`nb--${this.direction}`]: true,
          [`nb--${this.position}`]: this.position !== 'none',
        }}
      >
        <slot></slot>
      </nav>
    );
  }
}
