// Experimental: TC39 Signals (Stage 1) for Stencil components. See signals.js.
import { Signal as TC39 } from 'signal-polyfill';

export { TC39 as Signals };

/** A component field backed by a TC39 `Signal.State`; reading it in `render()` subscribes the component. */
export declare function Signal<T = any>(options?: TC39.Options<T>): PropertyDecorator;
/** A getter cached in a TC39 `Signal.Computed`, recomputed when a signal it read changes and after each render. */
export declare function Computed<T = any>(options?: TC39.Options<T>): MethodDecorator;
/** The `Signal.State` behind a `@Signal()` field, or the `Signal.Computed` behind a `@Computed()` getter. */
export declare function signalOf<T = unknown>(instanceOrElement: object, key: string): TC39.State<T> | TC39.Computed<T> | null;
/** A TC39 `Signal.State` from the same polyfill copy the decorators use. */
export declare function signal<T>(value: T, options?: TC39.Options<T>): TC39.State<T>;
/** A TC39 `Signal.Computed` from the same polyfill copy the decorators use. */
export declare function computed<T>(fn: () => T, options?: TC39.Options<T>): TC39.Computed<T>;
