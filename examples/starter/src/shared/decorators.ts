// Legacy decorators (`experimentalDecorators`) of a third party: what stencilrs applies after the
// class, before the element is registered. See docs/decorators.md.

/** Everything the decorators below did, in order; `pop-decorated` adds its `connectedCallback`. */
export const log: string[] = [];

const boxes = new WeakMap<object, Record<string, unknown>>();

/** A field decorator: an accessor on the prototype, so the initializer reaches the setter. */
export function boxed(proto: object, key: string) {
  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: true,
    get(this: object) {
      return boxes.get(this)?.[key];
    },
    set(this: object, value: unknown) {
      log.push(`set ${key}=${value}`);
      const box = boxes.get(this) ?? {};
      box[key] = value;
      boxes.set(this, box);
    },
  });
}

/** A method decorator that returns a replacement descriptor. */
export const shout = (suffix: string) => (_proto: object, _key: string, d: PropertyDescriptor) => ({
  ...d,
  value(this: unknown) {
    return String(d.value.call(this)).toUpperCase() + suffix;
  },
});

/** An accessor decorator that returns a replacement descriptor. */
export const twice = (_proto: object, _key: string, d: PropertyDescriptor) => ({
  ...d,
  get(this: unknown) {
    return d.get!.call(this) * 2;
  },
});
