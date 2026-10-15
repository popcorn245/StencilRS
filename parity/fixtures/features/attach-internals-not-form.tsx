import { AttachInternals, Component, h } from '@stencil/core';

/** Internals for ARIA only: not form-associated. */
@Component({ tag: 'attach-internals-not-form', encapsulation: { type: 'scoped' } })
export class AttachInternalsNotForm {
  @AttachInternals({ formAssociated: false }) internals: ElementInternals;

  componentWillLoad() {
    this.internals.role = 'status';
  }

  render() {
    return <span>ok</span>;
  }
}
