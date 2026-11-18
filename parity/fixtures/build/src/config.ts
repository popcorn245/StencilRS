import type { Mode } from './interface';

// Ionic's `global/config.ts` and `ionic-global.ts`: a class whose methods declare their return types,
// an instance exported as a const, and an arrow function that declares its return type.
export class Config {
  get(key: string, fallback?: any): any {
    return fallback ?? key;
  }
  getNumber(key: string, fallback?: number): number {
    return fallback ?? key.length;
  }
  getString(key: string, fallback?: string): string {
    return fallback ?? key;
  }
  getBoolean(key: string, fallback = false): boolean {
    return fallback || !key;
  }
}

export const config = /*@__PURE__*/ new Config();

export const getMode = (ref?: any): Mode => {
  return ref ? 'ios' : 'md';
};

export function getLabel(ref?: any): string {
  return ref ? 'a' : 'b';
}
