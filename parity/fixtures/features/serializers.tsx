import { AttrDeserialize, Component, h, Prop, PropSerialize } from '@stencil/core';

/** Custom prop ↔ attribute translation. */
@Component({ tag: 'serializers-cmp' })
export class SerializersCmp {
  @Prop({ reflect: true }) when: Date = new Date(0);
  @Prop({ reflect: true }) tags: string[] = [];
  @Prop() get label(): string {
    return this._label;
  }
  private _label = '';

  @PropSerialize('when')
  whenToAttr(value: Date) {
    return value?.toISOString();
  }

  @AttrDeserialize('when')
  whenFromAttr(value: string) {
    return new Date(value);
  }

  @PropSerialize('tags')
  @AttrDeserialize('tags')
  tagsTranslate(value: string[] | string) {
    return Array.isArray(value) ? value.join(',') : value.split(',');
  }

  @PropSerialize('label')
  labelToAttr(value: string) {
    return value.toUpperCase();
  }

  /** No @Prop named `missing`: ignored. */
  @AttrDeserialize('missing')
  missingFromAttr(value: string) {
    return value;
  }

  render() {
    return <p>{this.when.toISOString()} {this.tags.join(' ')} {this.label}</p>;
  }
}
