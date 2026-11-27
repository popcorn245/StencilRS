import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'isl-counter', encapsulation: { type: 'shadow' }, styleUrl: 'isl-counter.css' })
export class IslCounter {
  @Prop() label = 'n';
  @Prop({ mutable: true }) count = 0;

  render() {
    return (
      <div class="box">
        <button type="button" onClick={() => this.count++}>{this.label}: {this.count}</button>
        <slot></slot>
      </div>
    );
  }
}
