import { Component, Prop, h } from '@stencil/core';

type FormatOptions =
  | {
      date: Intl.DateTimeFormatOptions;
      time?: Intl.DateTimeFormatOptions;
    }
  | {
      date?: Intl.DateTimeFormatOptions;
      time: Intl.DateTimeFormatOptions;
    };

@Component({ tag: 'build-intl' })
export class BuildIntl {
  @Prop() options?: Intl.DateTimeFormatOptions;
  @Prop() formatOptions?: FormatOptions;
  @Prop() numbers?: Intl.NumberFormatOptions[];
  render() {
    return <div />;
  }
}
