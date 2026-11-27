import { Component, h } from '@stencil/core';

const Row = (props: { n: number }) => <li>{props.n}</li>;

@Component({ tag: 'rf-fn', encapsulation: { type: 'shadow' } })
export class RfFn {
  render() {
    return (
      <ul>
        <Row n={1} />
      </ul>
    );
  }
}
