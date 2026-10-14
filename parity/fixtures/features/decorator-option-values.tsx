import { Component, Event, EventEmitter, Prop, h } from '@stencil/core';

const NAME = 'from-const';

@Component({ tag: 'decorator-option-values' })
export class DecoratorOptionValues {
  @Prop({ attribute: null }) nullAttribute: string;
  @Prop({ attribute: undefined }) undefinedAttribute: string;
  @Prop({ attribute: NAME }) identifierAttribute: string;
  @Prop({ attribute: `tpl-attr` }) templateAttribute: string;
  @Prop({ reflect: 1 as any }) numericReflect: string;
  @Event({ eventName: NAME }) identifierEvent: EventEmitter;

  render() {
    return <div />;
  }
}
