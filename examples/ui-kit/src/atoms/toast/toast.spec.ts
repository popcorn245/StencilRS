import { newSpecPage } from '../../test-utils/spec-page';
import { Toast } from './toast';

describe('pop-toast', () => {
  it('renders empty container', async () => {
    const page = await newSpecPage({
      components: [Toast],
      html: `<pop-toast></pop-toast>`,
    });
    expect(page.root.querySelector('.toast-container')).not.toBeNull();
    expect(page.root.querySelectorAll('.toast').length).toBe(0);
  });

  it('uses aria-live assertive', async () => {
    const page = await newSpecPage({
      components: [Toast],
      html: `<pop-toast></pop-toast>`,
    });
    expect(page.root.querySelector('[aria-live="assertive"]')).not.toBeNull();
  });

  it('applies bottom-right class when position is set', async () => {
    const page = await newSpecPage({
      components: [Toast],
      html: `<pop-toast position="bottom-right"></pop-toast>`,
    });
    expect(page.root.querySelector('.toast-container--bottom-right')).not.toBeNull();
  });

  it('renders a link action when href is given', async () => {
    const page = await newSpecPage({
      components: [Toast],
      html: `<pop-toast></pop-toast>`,
    });
    await (page.rootInstance as Toast).show('Moved to Trash', 'default', {
      label: 'View',
      href: '/trash',
    });
    await page.waitForChanges();
    const a = page.root.querySelector('a.toast__action') as HTMLAnchorElement;
    expect(a).not.toBeNull();
    expect(a.getAttribute('href')).toBe('/trash');
  });

  it('renders a button action + fires onAction (Undo)', async () => {
    const page = await newSpecPage({
      components: [Toast],
      html: `<pop-toast></pop-toast>`,
    });
    let fired = 0;
    await (page.rootInstance as Toast).show('Moved to Trash', 'default', {
      label: 'Undo',
      onAction: () => (fired += 1),
    });
    await page.waitForChanges();
    const btn = page.root.querySelector('button.toast__action') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(page.root.querySelector('a.toast__action')).toBeNull();
    btn.click();
    expect(fired).toBe(1);
  });

  // dismiss() gates removal on the toast's `animationend`; jsdom never fires CSS
  // animations, so mimic it here so the removal path completes.
  const flushExitAnimations = (root: Element) => {
    root.querySelectorAll('.toast').forEach((el) => el.dispatchEvent(new Event('animationend')));
  };

  it('auto-dismisses a normal toast after the duration', async () => {
    vi.useFakeTimers();
    try {
      const page = await newSpecPage({
        components: [Toast],
        html: `<pop-toast duration="1000"></pop-toast>`,
      });
      const inst = page.rootInstance as Toast;
      await inst.show('Saved');
      await page.waitForChanges();
      expect(inst.toasts.length).toBe(1);
      vi.advanceTimersByTime(1000); // fires the auto-dismiss timer → starts exit anim
      flushExitAnimations(page.root);
      expect(inst.toasts.length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does NOT auto-dismiss a persistent toast', async () => {
    vi.useFakeTimers();
    try {
      const page = await newSpecPage({
        components: [Toast],
        html: `<pop-toast duration="1000"></pop-toast>`,
      });
      const inst = page.rootInstance as Toast;
      await inst.show('Reconnecting…', 'default', undefined, { persistent: true });
      await page.waitForChanges();
      expect(inst.toasts.length).toBe(1);
      vi.advanceTimersByTime(60000);
      flushExitAnimations(page.root);
      expect(inst.toasts.length).toBe(1); // still there — sticky
    } finally {
      vi.useRealTimers();
    }
  });

  it('treats duration <= 0 as persistent', async () => {
    vi.useFakeTimers();
    try {
      const page = await newSpecPage({
        components: [Toast],
        html: `<pop-toast></pop-toast>`,
      });
      const inst = page.rootInstance as Toast;
      await inst.show('Reconnecting…', 'default', undefined, { duration: 0 });
      await page.waitForChanges();
      vi.advanceTimersByTime(60000);
      flushExitAnimations(page.root);
      expect(inst.toasts.length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hide() dismisses a persistent toast', async () => {
    const page = await newSpecPage({
      components: [Toast],
      html: `<pop-toast></pop-toast>`,
    });
    const inst = page.rootInstance as Toast;
    await inst.show('Reconnecting…', 'default', undefined, { persistent: true });
    await page.waitForChanges();
    expect(inst.toasts.length).toBe(1);
    await inst.hide();
    flushExitAnimations(page.root);
    expect(inst.toasts.length).toBe(0);
  });
});
