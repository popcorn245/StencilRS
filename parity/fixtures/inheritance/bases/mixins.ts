import { Method, MixedInCtor, Prop, State, Watch } from '@stencil/core';

/** A mixin factory with a named class inside. */
export const withCount = <B extends MixedInCtor>(Base: B) => {
  class WithCount extends Base {
    @State() count = 0;
    @Prop() step = 1;

    @Method()
    async increment(): Promise<void> {
      this.count += this.step;
    }
  }
  return WithCount;
};

/** A mixin factory returning an anonymous class. */
export const withLabel = <B extends MixedInCtor>(Base: B) =>
  class extends Base {
    @Prop({ mutable: true }) label = 'Label';

    @Watch('label')
    labelChanged() {
      console.log(this.label);
    }
  };

/** A function declaration factory. */
export function withTheme<B extends MixedInCtor>(Base: B) {
  class WithTheme extends Base {
    @Prop() theme: 'light' | 'dark' = 'light';
  }
  return WithTheme;
}
