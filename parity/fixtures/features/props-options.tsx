import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'props-options' })
export class PropsOptions {
  @Prop({ reflect: true }) reflected: string;
  @Prop({ mutable: true }) mutated: number;
  @Prop({ reflect: true, mutable: true }) both: boolean;
  @Prop({ attribute: 'custom-attr' }) renamed: string;
  @Prop({ attribute: 'UPPER-Attr' }) upper: string;
  @Prop({ attribute: null }) noAttribute: string;
  @Prop() firstName: string;
  @Prop() value2: string;
  @Prop() required!: string;
  @Prop() optional?: string;
  @Prop() mode!: string;
  @Prop({ reflect: true }) complexReflect: string[];

  render() {
    return <div>{this.firstName}</div>;
  }
}
