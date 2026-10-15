import { MixedInCtor, Prop, Watch } from '@stencil/core';

export type Tone = 'red' | 'blue';

/** A mixin factory: components compose it with `extends Mixin(withTone, ...)`. */
export const withTone = <B extends MixedInCtor>(Base: B) => {
  class WithTone extends Base {
    /** Colour tone. */
    @Prop({ reflect: true, mutable: true }) tone: Tone = 'red';

    /** How many times the tone changed. */
    toneChanges = 0;

    @Watch('tone')
    toneChanged() {
      this.toneChanges++;
    }
  }
  return WithTone;
};
