import { Component, Element, h } from '@stencil/core';

// Renders where it is: inside an isl-pane (and which side) or not, and then asks the pane a method, as Ionic's ion-menu asks its ion-split-pane.
// Without its ancestors an island cannot know; with stand-ins that are not components the call would throw.
@Component({ tag: 'isl-where', encapsulation: { type: 'shadow' } })
export class IslWhere {
  @Element() el!: HTMLElement;
  where = 'alone';

  componentWillLoad() {
    const pane = this.el.closest('isl-pane');
    if (pane) this.where = `in-pane:${pane.getAttribute('side')}`;
  }

  componentDidLoad() {
    const pane = this.el.closest('isl-pane') as any;
    if (pane) pane.getSide().then((side: string) => this.el.setAttribute('data-side', side));
  }

  render() {
    return <b class={this.where}>{this.where}</b>;
  }
}
