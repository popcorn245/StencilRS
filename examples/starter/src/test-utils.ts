/** Mount `html` into the document and wait for its first component to finish rendering. */
export async function mount<T extends HTMLElement>(html: string): Promise<T & { componentOnReady(): Promise<T> }> {
  document.body.innerHTML = html;
  const el = document.body.firstElementChild as T & { componentOnReady(): Promise<T> };
  await el.componentOnReady();
  return el;
}

/** Let Stencil's scheduled re-render run (it batches updates to the next frame). */
export const flush = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
