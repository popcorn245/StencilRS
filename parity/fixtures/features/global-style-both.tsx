import { Component, Prop, Watch, h } from '@stencil/core';

@Component({
  tag: 'global-style-both-cmp',
  styleUrl: 'global-style-both.css',
  globalStyle: 'b { color: blue }',
  globalStyleUrl: 'global-style-both-global.css',
  encapsulation: { type: 'shadow' },
})
export class GlobalStyleBothCmp {
  @Prop() name: string;

  @Watch('name')
  onName() {}

  render() {
    return <div>both</div>;
  }
}
