import type { ComponentRef, ComponentProps } from './interface';

export type NavComponent = ComponentRef | number;
export interface NavComponentWithProps<T = any> {
  component: NavComponent;
  componentProps?: ComponentProps<T> | null;
}
