export interface HookOptions {
  redirect: string;
}
export type HookResult = boolean | HookOptions;

export interface OptionalOptions {
  redirect?: string;
}
export type OptionalResult = boolean | OptionalOptions;

export interface SharedA {
  redirect: string;
  a: number;
}
export interface SharedB {
  redirect: string;
  b: number;
}
export type SharedResult = boolean | SharedA | SharedB;

export interface Row {
  id: string;
}
export interface Later {
  then(done: (value: number) => void): void;
}
