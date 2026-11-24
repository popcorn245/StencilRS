// Types the stable-ordering components import: their order is the point.
export type Size = 'small' | 'large' | 'medium' | 'xlarge';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type HookResult = boolean | HookOptions;
export interface HookOptions {
  redirect: string;
}
export interface Item {
  id: string;
}
export interface Row {
  cells: number;
}
export type Entry = Item | string;
export interface Box<T = any> {
  value: T;
}
export interface Zed {
  z: string;
}
export enum Level {
  Low,
  Mid,
  High,
}
export enum Kind {
  B = 'b',
  A = 'a',
}
export type Callback = (value: string) => void;
