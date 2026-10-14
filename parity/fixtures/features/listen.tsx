import { Component, Listen, h } from '@stencil/core';

@Component({ tag: 'listen-cmp' })
export class ListenCmp {
  @Listen('click')
  onClick() {}

  @Listen('scroll', { target: 'window' })
  onScroll() {}

  @Listen('keydown', { target: 'document', capture: true })
  onKey() {}

  @Listen('touchstart', { passive: false })
  onTouch() {}

  @Listen('resize', { target: 'body' })
  onResize() {}

  @Listen('valueChanged')
  @Listen('Wheel')
  onMany() {}

  render() {
    return <div />;
  }
}
