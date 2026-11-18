import { Component, Prop, h } from '@stencil/core';
import { size, star } from 'fake-icons/icons';
import { version } from 'fake-icons';
import { config, getLabel, getMode } from '../config';

let ids = 0;

@Component({ tag: 'build-inferred-props' })
export class BuildInferredProps {
  private componentId = `build-${ids++}`;
  private counter: number = 3;
  private readonly fixed = 'abc';
  private flag = true;

  /** an imported `export declare var x: string` */
  @Prop() icon = star;
  /** an imported `export declare const x: number` */
  @Prop() iconSize = size;
  /** from the package root */
  @Prop() release = version;
  /** `this.field`, a template literal */
  @Prop() name = this.componentId;
  /** `this.field`, annotated */
  @Prop() total = this.counter;
  /** `this.field`, boolean */
  @Prop() enabled = this.flag;
  /** a method of an imported instance */
  @Prop() duration = config.getNumber('duration', 0);
  @Prop() caption = config.getString('caption');
  @Prop() loose = config.getBoolean('loose');
  @Prop() anything = config.get('anything');
  /** an imported function */
  @Prop() label = getLabel(this);
  /** a method of this class */
  @Prop() computed = this.compute();
  /** an imported arrow function, whose return type is an alias */
  @Prop({ mutable: true }) mode = getMode(this);

  private compute(): number {
    return this.counter * 2;
  }

  render() {
    return <div />;
  }
}
