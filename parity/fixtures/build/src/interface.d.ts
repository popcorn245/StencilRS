// The shapes Ionic's `interface.d.ts` gives its components, written for this fixture project.
export type PredefinedColors = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'light' | 'medium' | 'dark';
export type LiteralUnion<T extends U, U = string> = T | (U & Record<never, never>);
export type Color = LiteralUnion<PredefinedColors, string>;
// `interface.d.ts` re-exports a module that imports it back, the way Ionic's does.
export type { NavComponent, NavComponentWithProps } from './nav-interface';
export type Mode = 'ios' | 'md';
export type ComponentRef = Function | HTMLElement | string | null;
export type ComponentProps<T = null> = { [key: string]: any };
export interface OverlayEventDetail<T = any> {
  data?: T;
  role?: string;
}
export type Callback = (ok: boolean) => void;
export interface Handlers {
  onDone?: Callback;
}
export interface Pair<A = string, B = A> {
  first: A;
  second: B;
}
export class Holder<T = number> {
  value!: T;
}
