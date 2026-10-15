import { AttachInternals, Component, h } from '@stencil/core';

@Component({ tag: 'diag-attach-internals-twice' })
export class DiagAttachInternalsTwice {
  @AttachInternals() first: ElementInternals;
  @AttachInternals() second: ElementInternals;

  render() {
    return <p />;
  }
}
