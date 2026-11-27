import { Build, Component, h, Prop } from '@stencil/core';

/**
 * The slow island. `delay` stands in for a database or an API: the server render waits for it, the browser does not (the
 * client adopts the server's markup and skips the wait), so only the response is slow.
 */
@Component({ tag: 'ex-feed', encapsulation: { type: 'shadow' }, styles: ':host{display:block} li{padding:.3em 0}' })
export class ExFeed {
  @Prop() delay = 0;
  @Prop() items = 'first,second,third';

  async componentWillLoad() {
    if (Build.isServer && this.delay > 0) await new Promise((r) => setTimeout(r, this.delay));
  }

  render() {
    return (
      <ul>
        {this.items.split(',').map((i) => (
          <li>{i}</li>
        ))}
      </ul>
    );
  }
}
