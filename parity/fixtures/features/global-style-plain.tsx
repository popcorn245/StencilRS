import { Component } from '@stencil/core';

@Component({
  tag: 'global-style-plain-cmp',
  globalStyleUrl: './global-style-plain.scss',
  globalStyle: '  c { color: green }  ',
})
export class GlobalStylePlainCmp {}
