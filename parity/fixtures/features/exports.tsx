import { Component, h } from '@stencil/core';

export interface ExportedInterface {
  a: string;
}
export type ExportedAlias = string;
export enum ExportedEnum {
  A,
}
export const helper = () => 1;
export function otherHelper() {}

@Component({ tag: 'exports-cmp' })
export class ExportsCmp {
  render() {
    return <div />;
  }
}
