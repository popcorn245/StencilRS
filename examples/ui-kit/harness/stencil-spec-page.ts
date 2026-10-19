/**
 * `newSpecPage` for the ui-kit specs, from Stencil itself (`@stencil/core/testing`), instead of
 * `src/test-utils/spec-page.ts`. `vitest.spec-page.config.ts` aliases the one to this, so the
 * same spec files run on Stencil's mock-doc window with components compiled in `spec-page` mode.
 */
import type { SpecPage } from '@stencil/core/testing';

export { newSpecPage } from '@stencil/core/testing';
export type { SpecPage };

/** Set props as properties and flush the render queue. */
export async function setProps(page: SpecPage, props: Record<string, unknown>): Promise<void> {
  Object.assign(page.root as object, props);
  await page.waitForChanges();
}

/** Everything the element renders, as text. */
export const textOf = (el: Node | null | undefined): string => (el ? (el.textContent ?? '') : '');
