import { Component, Method, h } from '@stencil/core';

@Component({ tag: 'gen-tabs' })
export class GenTabs {
  @Method() async select(tab: string | HTMLGenTabElement): Promise<boolean> {
    return true;
  }
  @Method() async getTab(tab: string | HTMLGenTabElement): Promise<HTMLGenTabElement | undefined> {
    return undefined;
  }
  @Method() async parent(): Promise<HTMLGenTabsElement | null> {
    return null;
  }
  @Method() async each(tabs: HTMLGenTabElement[], first: HTMLGenTabElement): Promise<void> {}
  /** Two element-like types in one union: ordered by the checker's type ids, left to Stencil. */
  @Method() async either(el: HTMLGenTabElement | HTMLElement): Promise<void> {}
  render() {
    return <slot />;
  }
}
