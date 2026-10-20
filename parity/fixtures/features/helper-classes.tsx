import { Component, h } from '@stencil/core';

class Base {
  ready = true;
}

// Plain classes beside a component: no output touches them.
class Child extends Base {}

class WithConstructor extends Base {
  constructor(public readonly n = 1) {
    console.log(n);
  }
}

function make() {
  // Not top level.
  class Nested extends Base {}
  return new Nested();
}

@Component({ tag: 'helper-classes' })
export class HelperClasses {
  render() {
    return <div>{String(make().ready && new Child().ready && new WithConstructor().n)}</div>;
  }
}
