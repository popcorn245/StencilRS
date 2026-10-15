import { Element, Event, EventEmitter, Listen, Method, Prop, State, Watch } from '@stencil/core';

/** A decorated base class: every member decorator, plus lifecycle. */
export class BaseProps {
  @Element() el: HTMLElement;

  /** Shown before the name. */
  @Prop() greeting: string = 'Hello';
  @Prop({ reflect: true }) size: 'small' | 'large' = 'small';
  @Prop() disabled = false;

  @State() clicks = 0;

  @Event() baseClicked: EventEmitter<number>;

  @Watch('greeting')
  greetingChanged(next: string) {
    console.log('greeting', next);
  }

  @Listen('click')
  onClick() {
    this.clicks++;
    this.baseClicked.emit(this.clicks);
  }

  @Method()
  async reset(): Promise<void> {
    this.clicks = 0;
  }

  componentDidLoad() {
    console.log('base loaded');
  }

  protected label() {
    return `${this.greeting} (${this.clicks})`;
  }
}
