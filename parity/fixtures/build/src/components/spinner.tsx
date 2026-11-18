import { Component, Method, Prop, h } from '@stencil/core';

const spinners = {
  bubbles: { dur: 1000, circles: 9 },
  circles: { dur: 1000, circles: 8 },
  'lines-small': { dur: 1000, lines: 8 },
};
type SpinnerTypes = keyof typeof spinners;
type Names = keyof { a: 1; b: 2 };

@Component({ tag: 'build-spinner' })
export class BuildSpinner {
  @Prop({ mutable: true }) spinner?: SpinnerTypes | null;
  @Prop() pulling?: SpinnerTypes | string | null;
  @Prop() name?: SpinnerTypes;
  @Prop() names?: Names;
  @Prop() list?: readonly string[];
  @Prop() pair?: readonly [string, number];
  @Method() async pick(which: SpinnerTypes): Promise<SpinnerTypes> {
    return which;
  }
  @Prop() literal?: keyof { 'a-b': 1; c(): void };
  @Prop() fromConst?: keyof typeof spinners;
  @Prop() fromAlias?: Names | null;
  @Prop() inArray?: SpinnerTypes[];
  @Method() async names2(): Promise<Names> {
    return 'a';
  }
  render() {
    return <div />;
  }
}
