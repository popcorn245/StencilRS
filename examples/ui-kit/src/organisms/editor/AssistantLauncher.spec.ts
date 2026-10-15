import { vi, describe, it, expect } from 'vitest';
import AssistantLauncher from './AssistantLauncher';

/**
 * AssistantLauncher — the slash / "+" menu entry (WS3) that opens the host's
 * unified WS2 Assistant on Build instead of inserting a block. It reuses the
 * SAME `notes-app:open-assistant` event the selection toolbar uses (no second
 * assistant), then removes its own placeholder.
 */
describe('AssistantLauncher block tool', () => {
  it('advertises an "Ask the Assistant" toolbox entry', () => {
    expect(AssistantLauncher.toolbox.title).toBe('Ask the Assistant');
  });

  it('dispatches notes-app:open-assistant (verb build) and deletes its block', async () => {
    const events: CustomEvent[] = [];
    const listener = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('notes-app:open-assistant', listener);

    const del = vi.fn();
    const blocks = { getCurrentBlockIndex: () => 2, delete: del };
    new AssistantLauncher({ api: { blocks } });

    // Constructor defers to the next macrotask.
    await new Promise((r) => setTimeout(r, 0));
    window.removeEventListener('notes-app:open-assistant', listener);

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ verb: 'build' });
    expect(del).toHaveBeenCalledWith(2);
  });

  it('never crashes when the host lacks a blocks API', async () => {
    expect(() => new AssistantLauncher({ api: {} })).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});
