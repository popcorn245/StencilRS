import { newSpecPage, setProps } from '../../test-utils/spec-page';
import { PopComposer } from './composer';

const COMMANDS = [
  { name: 'ask', description: 'Ask a question' },
  { name: 'weather', description: 'Forecast' },
  { name: 'research', description: 'Deep research' },
];
const PEOPLE = [
  { id: 'uid-kat', name: 'Kat' },
  { id: 'uid-sam', name: 'Sam' },
];

async function mount() {
  const page = await newSpecPage({ components: [PopComposer], html: `<pop-composer></pop-composer>` });
  const inst = page.rootInstance as any;
  inst.commands = COMMANDS;
  inst.people = PEOPLE;
  const editor = page.root.querySelector('.pc__editor') as HTMLElement;
  inst.editor = editor; // bind the ref the component reads
  return { page, inst, editor };
}

describe('pop-composer', () => {
  it('renders the slim bar with placeholder + send button', async () => {
    const page = await newSpecPage({
      components: [PopComposer],
      html: `<pop-composer placeholder="Say something…"></pop-composer>`,
    });
    const editor = page.root.querySelector('.pc__editor') as HTMLElement;
    expect(editor.getAttribute('data-placeholder')).toBe('Say something…');
    expect(page.root.querySelector('.pc__send')).toBeTruthy();
  });

  it('shows attach by default and mic only when showMic', async () => {
    const page = await newSpecPage({ components: [PopComposer], html: `<pop-composer show-mic="true"></pop-composer>` });
    expect(page.root.querySelectorAll('.pc__icon').length).toBe(2); // attach + mic
  });

  it('trims to a plain text box (no attach/mic) when both are off', async () => {
    const page = await newSpecPage({
      components: [PopComposer],
      html: `<pop-composer></pop-composer>`,
    });
    await setProps(page, { showAttach: false, showMic: false });
    expect(page.root.querySelectorAll('.pc__icon').length).toBe(0); // no attach, no mic
    expect(page.root.querySelector('.pc__send')).toBeTruthy();      // submit remains
  });

  describe('submit icon', () => {
    it('defaults to the send (paper-plane) glyph', async () => {
      const page = await newSpecPage({ components: [PopComposer], html: `<pop-composer></pop-composer>` });
      const send = page.root.querySelector('.pc__send')!;
      expect(send.getAttribute('aria-label')).toBe('Send');
      // The send glyph is a centered pop-icon (paper-plane).
      expect((send.querySelector('pop-icon') as any).name).toBe('paper-plane');
    });

    it('renders a + glyph + "new thread" label when submit-icon="add"', async () => {
      const page = await newSpecPage({ components: [PopComposer], html: `<pop-composer submit-icon="add"></pop-composer>` });
      const send = page.root.querySelector('.pc__send')!;
      expect(send.getAttribute('aria-label')).toBe('Add to a new thread');
      // The add-mode glyph is a centered pop-icon (plus).
      expect((send.querySelector('pop-icon') as any).name).toBe('add');
    });
  });

  describe('trigger detection', () => {
    it('detects / and @ at start or after whitespace, not mid-word', async () => {
      const { inst } = await mount();
      expect(inst.triggerMatch('/we')).toEqual({ trigger: '/', query: 'we' });
      expect(inst.triggerMatch('hey @ka')).toEqual({ trigger: '@', query: 'ka' });
      expect(inst.triggerMatch('foo/bar')).toBeNull(); // mid-word slash
      expect(inst.triggerMatch('/weather now')).toBeNull(); // space closes the token
    });
  });

  describe('command filter (/)', () => {
    it('filters commands by query → {key,label,detail}', async () => {
      const { inst } = await mount();
      const items = inst.filterItems('/', 'we');
      expect(items.map((i: any) => i.key)).toEqual(['weather']);
      expect(items[0].label).toBe('/weather');
      expect(items[0].detail).toBe('Forecast');
    });
    it('empty query returns all commands', async () => {
      const { inst } = await mount();
      expect(inst.filterItems('/', '').map((i: any) => i.key)).toEqual(['ask', 'weather', 'research']);
    });
  });

  describe('people filter (@)', () => {
    it('filters people by query → {key=uid,label=name}', async () => {
      const { inst } = await mount();
      const items = inst.filterItems('@', 'ka');
      expect(items.map((i: any) => i.key)).toEqual(['uid-kat']);
      expect(items[0].label).toBe('Kat');
    });
  });

  describe('mention insert + serialize', () => {
    it('a pill carries the uid and serializes as @Name', async () => {
      const { inst, editor } = await mount();
      editor.appendChild(document.createTextNode('hi '));
      editor.appendChild(inst.buildPill('uid-kat', 'Kat'));
      const pill = editor.querySelector('[data-mention-id]') as HTMLElement;
      expect(pill.dataset.mentionId).toBe('uid-kat');
      expect(pill.dataset.mentionName).toBe('Kat');
      expect(inst.readText()).toBe('hi @Kat');
      expect(inst.readMentions()).toEqual([{ id: 'uid-kat', name: 'Kat' }]);
    });

    it('a command is plain text in the serialized value (no pill)', async () => {
      const { inst, editor } = await mount();
      editor.appendChild(document.createTextNode('/weather 63385'));
      expect(inst.readText()).toBe('/weather 63385');
      expect(editor.querySelector('[data-mention-id]')).toBeNull();
    });
  });

  describe('send payload', () => {
    // Stencil @Event() emitters aren't reassignable, so capture the real event.
    function capture(page: any): () => any {
      let detail: any = null;
      page.root.addEventListener('popSend', (e: CustomEvent) => (detail = e.detail));
      return () => detail;
    }

    it('emits popSend with text + structured mentions', async () => {
      const { page, inst, editor } = await mount();
      const got = capture(page);
      editor.appendChild(document.createTextNode('hey '));
      editor.appendChild(inst.buildPill('uid-kat', 'Kat'));
      editor.appendChild(document.createTextNode(' check the weather'));
      inst.send();
      const detail = got();
      expect(detail).toBeTruthy();
      expect(detail.text).toBe('hey @Kat check the weather');
      expect(detail.mentions).toEqual([{ id: 'uid-kat', name: 'Kat' }]);
      expect(detail.images).toBeUndefined();
    });

    it('includes attached images in the payload', async () => {
      const { page, inst, editor } = await mount();
      const got = capture(page);
      editor.appendChild(document.createTextNode('look'));
      inst.pendingImages = [new File(['x'], 'a.png', { type: 'image/png' })];
      inst.send();
      const detail = got();
      expect(detail.text).toBe('look');
      expect(detail.images?.length).toBe(1);
    });

    it('does not send when empty', async () => {
      const { page, inst } = await mount();
      const got = capture(page);
      inst.send();
      expect(got()).toBeNull();
    });
  });

  describe('press-and-hold send-actions popover (sendActions)', () => {
    const SEND_ACTIONS = [
      { id: 'addToThread', label: 'Add to Thread' },
      { id: 'createThread', label: 'Create Thread' },
    ];

    function captureSend(page: any): () => any {
      let detail: any = null;
      page.root.addEventListener('popSend', (e: CustomEvent) => (detail = e.detail));
      return () => detail;
    }
    function captureAction(page: any): () => any {
      let detail: any = null;
      page.root.addEventListener('popSendAction', (e: CustomEvent) => (detail = e.detail));
      return () => detail;
    }

    it('plain send (no hold wrapper, no popover) when sendActions is empty', async () => {
      const page = await newSpecPage({ components: [PopComposer], html: `<pop-composer></pop-composer>` });
      expect(page.root.querySelector('.pc__sendhold')).toBeNull();
      expect(page.root.querySelector('.pc__actions')).toBeNull();
      expect(page.root.querySelector('.pc__send')).toBeTruthy(); // plain send remains
    });

    it('renders a hold send button with aria-haspopup (popover closed) when sendActions is set', async () => {
      const page = await newSpecPage({ components: [PopComposer], html: `<pop-composer></pop-composer>` });
      page.rootInstance.sendActions = SEND_ACTIONS;
      await page.waitForChanges();
      expect(page.root.querySelector('.pc__sendhold')).toBeTruthy();
      const btn = page.root.querySelector('.pc__send--hold')!;
      expect(btn).toBeTruthy();
      expect(btn.getAttribute('aria-haspopup')).toBe('menu');
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      // Always the default paper-plane glyph (no icon swap).
      expect((btn.querySelector('pop-icon') as any).name).toBe('paper-plane');
      // Popover starts closed.
      expect(page.root.querySelector('.pc__actions')).toBeNull();
    });

    it('tap (no hold) → default popSend, not popSendAction', async () => {
      const { page, inst, editor } = await mount();
      inst.sendActions = SEND_ACTIONS;
      await page.waitForChanges();
      const sent = captureSend(page);
      const acted = captureAction(page);
      editor.appendChild(document.createTextNode('hello'));
      inst.onSendClick();
      expect(sent()?.text).toBe('hello');
      expect(acted()).toBeNull();
    });

    it('press-and-hold opens the popover (both items) and suppresses the trailing tap', async () => {
      vi.useFakeTimers();
      const { page, inst } = await mount();
      inst.sendActions = SEND_ACTIONS;
      await page.waitForChanges();
      const sent = captureSend(page);
      inst.onSendPointerDown();
      vi.advanceTimersByTime(500);
      await page.waitForChanges();
      expect(inst.actionsOpen).toBe(true);
      const items = page.root.querySelectorAll('.pc__act');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('Add to Thread');
      expect(items[1].textContent).toContain('Create Thread');
      expect(page.root.querySelector('.pc__send--hold')!.getAttribute('aria-expanded')).toBe('true');
      // The trailing tap after the hold is swallowed (does NOT send).
      inst.onSendClick();
      expect(sent()).toBeNull();
      vi.useRealTimers();
    });

    it('choosing a popover item emits popSendAction { id, text }, closes + clears', async () => {
      const { page, inst, editor } = await mount();
      inst.sendActions = SEND_ACTIONS;
      await page.waitForChanges();
      const acted = captureAction(page);
      editor.appendChild(document.createTextNode('chilly out'));
      inst.openActions();
      inst.runAction('createThread');
      const detail = acted();
      expect(detail?.id).toBe('createThread');
      expect(detail?.text).toBe('chilly out');
      expect(inst.actionsOpen).toBe(false);
    });

    it('Escape closes the open popover', async () => {
      const { inst } = await mount();
      inst.sendActions = SEND_ACTIONS;
      inst.openActions();
      expect(inst.actionsOpen).toBe(true);
      inst.onActionsKeyDown({ key: 'Escape', preventDefault() {} } as any);
      expect(inst.actionsOpen).toBe(false);
    });

    it('outside pointerdown closes the popover', async () => {
      const { inst } = await mount();
      inst.sendActions = SEND_ACTIONS;
      inst.openActions();
      expect(inst.actionsOpen).toBe(true);
      // composedPath() that does NOT include the host → outside.
      inst.onDocPointerDown({ composedPath: () => [document.body] } as any);
      expect(inst.actionsOpen).toBe(false);
    });
  });

  describe('mic press-hold popover (device select + talk-back)', () => {
    const setMediaDevices = (mics: { deviceId: string; label: string; kind?: string }[], opts: { grantLabels?: boolean } = {}) => {
      const enumerate = vi.fn(async () =>
        mics.map((m) => ({ kind: m.kind || 'audioinput', deviceId: m.deviceId, label: opts.grantLabels === false ? '' : m.label })),
      );
      const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] }));
      (navigator as any).mediaDevices = { enumerateDevices: enumerate, getUserMedia };
      return { enumerate, getUserMedia };
    };

    it('a plain TAP (no hold) fires popMicRequested, not the popover', async () => {
      const { page, inst } = await mount();
      inst.showMic = true;
      await page.waitForChanges();
      const spy = vi.fn();
      page.root.addEventListener('popMicRequested', spy);
      inst.onMicClick(); // no hold armed → tap
      expect(spy).toHaveBeenCalledTimes(1);
      expect(inst.micMenuOpen).toBe(false);
    });

    it('press-and-hold opens the popover + enumerates mics; the trailing tap is swallowed', async () => {
      vi.useFakeTimers();
      setMediaDevices([{ deviceId: 'a', label: 'Built-in Mic' }, { deviceId: 'b', label: 'USB Mic' }]);
      const { page, inst } = await mount();
      inst.showMic = true;
      await page.waitForChanges();
      const micSpy = vi.fn();
      page.root.addEventListener('popMicRequested', micSpy);
      inst.onMicPointerDown();
      vi.advanceTimersByTime(500);
      await Promise.resolve(); // let openMicMenu's await settle
      vi.useRealTimers();
      await inst.enumerateMics(); // deterministic enumerate
      await page.waitForChanges();
      expect(inst.micMenuOpen).toBe(true);
      expect(inst.micDevices.map((d: any) => d.label)).toEqual(['Built-in Mic', 'USB Mic']);
      // The trailing tap after a hold does NOT fire popMicRequested.
      inst.onMicClick();
      expect(micSpy).not.toHaveBeenCalled();
    });

    it('requests getUserMedia ONCE to populate labels when they are blank', async () => {
      const { getUserMedia } = setMediaDevices([{ deviceId: 'a', label: 'Mic A' }], { grantLabels: false });
      const { inst } = await mount();
      await inst.enumerateMics();
      expect(getUserMedia).toHaveBeenCalledTimes(1);
    });

    it('selecting a device persists hub:mic:deviceId + emits popMicDevice', async () => {
      const { page, inst } = await mount();
      const spy = vi.fn();
      page.root.addEventListener('popMicDevice', spy);
      inst.pickMicDevice('usb-123');
      expect(inst.micDeviceId).toBe('usb-123');
      expect(localStorage.getItem('hub:mic:deviceId')).toBe('usb-123');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail).toEqual({ deviceId: 'usb-123' });
    });

    it('getMicDeviceId returns the persisted device', async () => {
      const { inst } = await mount();
      localStorage.setItem('hub:mic:deviceId', 'stored-dev');
      inst.micDeviceId = '';
      expect(await inst.getMicDeviceId()).toBe('stored-dev');
    });

    it('talk-back toggle flips, persists hub:talkback, and emits popTalkBack', async () => {
      const { page, inst } = await mount();
      const spy = vi.fn();
      page.root.addEventListener('popTalkBack', spy);
      expect(inst.talkBack).toBe(false);
      inst.toggleTalkBack();
      expect(inst.talkBack).toBe(true);
      expect(localStorage.getItem('hub:talkback')).toBe('1');
      expect(spy.mock.calls[0][0].detail).toEqual({ on: true });
      inst.toggleTalkBack();
      expect(inst.talkBack).toBe(false);
      expect(localStorage.getItem('hub:talkback')).toBe('0');
    });

    it('sets a note (no crash) when there are no audio inputs', async () => {
      setMediaDevices([]);
      const { inst } = await mount();
      await inst.enumerateMics();
      expect(inst.micDevices).toEqual([]);
      expect(inst.micNote).toBeTruthy();
    });

    it('Escape + outside pointerdown close the mic popover', async () => {
      const { inst } = await mount();
      await inst.openMicMenu();
      expect(inst.micMenuOpen).toBe(true);
      inst.onMicMenuKeyDown({ key: 'Escape', preventDefault() {} } as any);
      expect(inst.micMenuOpen).toBe(false);
      await inst.openMicMenu();
      inst.onMicDocPointerDown({ composedPath: () => [document.body] } as any);
      expect(inst.micMenuOpen).toBe(false);
    });
  });
});
