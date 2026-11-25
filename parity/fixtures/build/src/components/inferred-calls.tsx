import { Component, Element, Method, h } from '@stencil/core';
import type { HookResult, Later, OptionalResult, Row, SharedResult } from '../hooks';

@Component({ tag: 'build-inferred-calls' })
export class BuildInferredCalls {
  @Element() el!: HTMLElement;
  private pending: any;

  private async guards(from?: string): Promise<HookResult> {
    return true;
  }
  private async optionalGuards(): Promise<OptionalResult> {
    return true;
  }
  private async sharedGuards(): Promise<SharedResult> {
    return true;
  }
  private async write(path: string): Promise<boolean> {
    return true;
  }
  private async generic<T>(x: T): Promise<HookResult> {
    return true;
  }
  private async overloaded(x: string): Promise<HookResult>;
  private async overloaded(x: number): Promise<HookResult>;
  private async overloaded(x: any): Promise<HookResult> {
    return true;
  }
  private scroll() {}
  private never(): never {
    throw new Error('never');
  }

  /** `x as T` has the type T. */
  @Method()
  async getTabs() {
    return Array.from(this.el.querySelectorAll(':scope > gen-tab')) as HTMLGenTabElement[];
  }
  /** The property exists on one member of the union only. */
  @Method()
  async canTransition() {
    const canProceed = await this.guards();
    if (canProceed !== true) {
      if (typeof canProceed === 'object') {
        return canProceed.redirect;
      } else {
        return false;
      }
    }
    return true;
  }
  /** A boolean read in a plain `if` that does not jump. */
  @Method()
  async push(path: string) {
    if (path === '') {
      return false;
    }
    const canProceed = await this.guards(path);
    if (canProceed !== true) {
      if (typeof canProceed === 'object') {
        path = canProceed.redirect;
      } else {
        return false;
      }
    }
    const result = await this.write(path);
    if (result) {
      this.scroll();
    }
    return result;
  }

  /** `string | true` keeps the literal: left to Stencil. */
  @Method()
  async redirectOrTrue() {
    const canProceed = await this.guards();
    if (typeof canProceed === 'object') {
      return canProceed.redirect;
    }
    return true;
  }
  /** The guard narrows the variable where it is returned: left to Stencil. */
  @Method()
  async narrowedBoolean(path: string) {
    const result = await this.write(path);
    if (!result) {
      return false;
    }
    return result;
  }
  /** The `if` returns, so the variable is narrowed after it: left to Stencil. */
  @Method()
  async jumping(path: string) {
    const result = await this.write(path);
    if (result) {
      throw new Error('x');
    }
    return result;
  }
  /** A call that never returns narrows too: left to Stencil. */
  @Method()
  async neverCall(path: string) {
    const result = await this.write(path);
    if (result) {
      this.never();
    }
    return result;
  }
  /** The union returned itself, after branches: left to Stencil. */
  @Method()
  async aliased() {
    const canProceed = await this.guards();
    if (canProceed === true) {
      return false;
    }
    return canProceed;
  }
  /** The variable is handed to something else: left to Stencil. */
  @Method()
  async handed() {
    const canProceed = await this.guards();
    Object.freeze(canProceed);
    if (typeof canProceed === 'object') {
      return canProceed.redirect;
    }
    return false;
  }
  /** An optional property is `string | undefined`: left to Stencil. */
  @Method()
  async optionalRedirect() {
    const canProceed = await this.optionalGuards();
    if (typeof canProceed === 'object') {
      return canProceed.redirect;
    }
    return false;
  }
  /** Two members have the property: left to Stencil. */
  @Method()
  async sharedRedirect() {
    const canProceed = await this.sharedGuards();
    if (typeof canProceed === 'object') {
      return canProceed.redirect;
    }
    return false;
  }
  /** A generic callee: left to Stencil. */
  @Method()
  async genericCallee() {
    const canProceed = await this.generic(1);
    if (typeof canProceed === 'object') {
      return canProceed.redirect;
    }
    return false;
  }
  /** An overloaded callee: left to Stencil. */
  @Method()
  async overloadedCallee() {
    const canProceed = await this.overloaded('x');
    if (typeof canProceed === 'object') {
      return canProceed.redirect;
    }
    return false;
  }
  /** A callee without a written return type: left to Stencil. */
  @Method()
  async unannotatedCallee() {
    const canProceed = await this.scroll();
    return canProceed;
  }
  /** `as const` is not `as T`: left to Stencil. */
  @Method()
  async constant() {
    return ['a', 'b'] as const;
  }
  /** Two assertions: left to Stencil. */
  @Method()
  async twice() {
    return Array.from(this.el.querySelectorAll('gen-tab')) as unknown as HTMLGenTabElement[];
  }
  /** An assertion to a literal: left to Stencil. */
  @Method()
  async literal() {
    return 'a' as 'a';
  }
  /** The property compared to a literal is that literal where it is returned: left to Stencil. */
  @Method()
  async equalityNarrowed() {
    const canProceed = await this.guards();
    if (typeof canProceed === 'object') {
      if (canProceed.redirect === '/home') {
        return canProceed.redirect;
      }
      return false;
    }
    return true;
  }
  /** The property read twice, the first time in a test that narrows nothing. */
  @Method()
  async readTwice() {
    const canProceed = await this.guards();
    if (typeof canProceed === 'object') {
      if (canProceed.redirect) {
        return canProceed.redirect;
      }
      return false;
    }
    return true;
  }
  /** An assertion to a plain interface. */
  @Method()
  async asRow() {
    return this.pending as Row;
  }
  /** An assertion to a promise is awaited. */
  @Method()
  async asPromise() {
    return this.pending as Promise<Row>;
  }
  /** An assertion to something with a `then` is awaited: left to Stencil. */
  @Method()
  async asThenable() {
    return this.pending as Later;
  }
  /** A promise of a promise is awaited all the way: left to Stencil. */
  @Method()
  async asNestedPromise() {
    return this.pending as Promise<Promise<Row>>;
  }
  /** `PromiseLike` is awaited too: left to Stencil. */
  @Method()
  async asPromiseLike() {
    return this.pending as PromiseLike<Row>;
  }
  /** An array of promises is not awaited. */
  @Method()
  async asPromises() {
    return this.pending as Promise<Row>[];
  }
  render() {
    return <div />;
  }
}
