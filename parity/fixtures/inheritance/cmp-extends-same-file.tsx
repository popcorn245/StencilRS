import { Component, h, Prop, State } from '@stencil/core';

class LocalBase {
  @Prop() local: string = 'local';
  @State() ready = false;

  componentWillLoad() {
    this.ready = true;
  }
}

@Component({ tag: 'cmp-extends-same-file' })
export class CmpExtendsSameFile extends LocalBase {
  @Prop() own = 1;

  render() {
    return <p>{this.local} {this.own} {String(this.ready)}</p>;
  }
}
