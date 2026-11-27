import { Component, Element, h } from '@stencil/core';

// Like `ion-tabs`: sets `active` on its `isl-tab` children in componentWillLoad. A child that is not defined yet takes the value as an own property
// that its constructor's `this.active = false` then overwrites, so the client loader must define parent and children in one synchronous pass.
@Component({ tag: 'isl-tabs', encapsulation: { type: 'shadow' } })
export class IslTabs {
  @Element() el!: HTMLElement;

  componentWillLoad() {
    this.el.querySelectorAll('isl-tab').forEach((tab: any, i) => {
      tab.active = i === 0;
    });
  }

  render() {
    return <slot></slot>;
  }
}
