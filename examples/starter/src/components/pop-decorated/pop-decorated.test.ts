import { describe, expect, it } from 'vitest';

import { log } from '../../shared/decorators';

type Decorated = HTMLElement & { label: string; n: number; twin: number; hello(): string };

describe('pop-decorated (decorators that are not Stencil\'s own)', () => {
  it('upgrades an element already in the page, reading a decorated field through its accessor', async () => {
    // As if server-rendered: the element exists before its class is defined.
    document.body.innerHTML = '<pop-decorated></pop-decorated>';
    const el = document.body.firstElementChild as Decorated;
    expect(el.label).toBeUndefined();
    log.length = 0;
    await import('./pop-decorated');
    await (el as Decorated & { componentOnReady(): Promise<unknown> }).componentOnReady();
    expect(Object.hasOwn(el, 'label')).toBe(false);
    const accessor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'label')!;
    expect([typeof accessor.get, typeof accessor.set]).toEqual(['function', 'function']);
    expect(el.label).toBe('init');
    expect(el.shadowRoot!.querySelector('p')!.textContent).toBe('init|HI INIT!|4');
  });

  it('runs a field initializer through the setter in the constructor, before connectedCallback', () => {
    expect(log.slice(0, 3)).toEqual(['set label=init', 'set n=2', 'connected']);
  });

  it('applies a method and an accessor decorator\'s replacement descriptor', () => {
    const el = document.body.firstElementChild as Decorated;
    expect(el.hello()).toBe('HI INIT!');
    el.n = 5;
    expect(el.twin).toBe(10);
  });
});
