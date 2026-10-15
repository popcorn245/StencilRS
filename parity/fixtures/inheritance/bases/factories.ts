import { MixedInCtor, Prop } from '@stencil/core';

class Existing {
  @Prop() fromExisting = true;
}

/** Returns an existing class by reference: Stencil can't see a class literal in it. */
export const byReference = <B extends MixedInCtor>(_Base: B) => Existing;

interface Thing {
  name: string;
}

/** Implements, but extends nothing. */
export class Implementer implements Thing {
  name = 'thing';
}
