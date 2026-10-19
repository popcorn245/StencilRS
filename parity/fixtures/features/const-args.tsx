import { Component, Event, EventEmitter, Listen, Prop, State, Watch, h } from '@stencil/core';

const VALUE = 'value';
const COUNT = `count`;
const ALIAS = VALUE;
const NAMED: 'named' = 'named';
const CHECKED = 'checked' satisfies string;
const PREFIX = 'sta';
const TEMPLATE = `${PREFIX}tus`;
const CLICK = 'click';
const KEYS = { open: 'open', nested: { size: 'size' } } as const;
const LOOSE = { label: 'label' as const };

enum Events {
  Focus = 'focusin',
  Blur = 'focusout',
  Out = Blur,
}

@Component({ tag: 'const-args' })
export class ConstArgs {
  @Prop() value: string;
  @Prop() open: boolean;
  @Prop() size: number;
  @Prop() named: string;
  @Prop() checked: boolean;
  @Prop() status: string;
  @Prop() label: string;
  @State() count = 0;
  @Event() changed: EventEmitter<string>;

  @Watch(VALUE)
  onValue() {}

  @Watch(COUNT)
  @Watch(ALIAS)
  onAny() {}

  @Watch(KEYS.open)
  @Watch(KEYS.nested.size)
  onOpen() {}

  @Watch(NAMED)
  @Watch(CHECKED)
  @Watch(TEMPLATE)
  @Watch(LOOSE.label)
  onMore() {}

  @Listen(CLICK)
  onClick() {}

  @Listen(Events.Focus, { target: 'document' })
  onFocus() {}

  @Listen(Events.Out)
  onBlur() {}

  render() {
    return <div>{this.value}</div>;
  }
}
