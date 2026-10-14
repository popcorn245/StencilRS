import { Component, h, Prop, State, Event, EventEmitter, Element, Method, Watch } from '@stencil/core';
import { MIC_DEVICE_KEY, TALKBACK_KEY } from './composer-keys';

/**
 * pop-composer
 *
 * A SLIM, purpose-built chat composer — a lighter alternative to pop-message-box
 * with minimal chrome. Built on the proven trigger-popover + pill mechanics of
 * pop-mention-input, extended so that:
 *   - `@` opens an inline popover of PEOPLE → selecting inserts a styled PILL
 *     carrying the person's uid.
 *   - `/` opens an inline popover of COMMANDS (name + short description) → selecting
 *     inserts the command TEXT (e.g. `/weather `), not a pill.
 * Both popovers anchor ABOVE the input (not a full-screen overlay), are arrow-key
 * navigable, and close on space / escape / selection.
 *
 * Slim chrome: a growing 1→N line input, optional compact attach + mic icons, and
 * a send button. Enter sends, Shift+Enter inserts a newline.
 *
 * Themed via the real theme-fabulous `--pico-*` tokens (no phantom variables).
 */

export interface ComposerCommand {
  name: string;
  description?: string;
}

export interface ComposerPerson {
  id: string;
  name: string;
  avatar?: string;
}

export interface ComposerMention {
  id: string;
  name: string;
}

export interface ComposerSendDetail {
  text: string;
  mentions: ComposerMention[];
  images?: File[];
}

/** A secondary send action shown in the split-send-button menu. */
export interface ComposerSendAction {
  id: string;
  label: string;
  /** Optional ion-icon name OR a single-char/emoji glyph shown before the label. */
  icon?: string;
}

/** Emitted when a SECONDARY (split-button menu) send action is chosen. */
export interface ComposerSendActionDetail {
  id: string;
  text: string;
  mentions: ComposerMention[];
  images?: File[];
}

/** An audio input device offered in the mic press-hold popover. */
export interface ComposerMicDevice {
  deviceId: string;
  label: string;
}

type Mode = 'command' | 'mention';

interface PopoverItem {
  /** command name or person id */
  key: string;
  label: string;
  detail?: string;
  avatar?: string;
}

@Component({
  tag: 'pop-composer',
  encapsulation: { type: 'scoped' },
  styleUrl: 'composer.css',
})
export class PopComposer {
  @Element() el: HTMLElement;

  @Prop() placeholder = 'Message…';
  @Prop() value = '';
  @Prop() disabled = false;
  /** Slash-commands offered by the `/` popover. Pass as a property (not stringified). */
  @Prop() commands: ComposerCommand[] = [];
  /** Family members offered by the `@` popover. Pass as a property. */
  @Prop() people: ComposerPerson[] = [];
  @Prop() showMic = false;
  @Prop() showAttach = true;
  /**
   * Submit-button glyph:
   *  - 'send' (default): the paper-plane arrow (a chat message).
   *  - 'add': a `+` (signals the submit CREATES something — e.g. a new thread).
   */
  @Prop() submitIcon: 'send' | 'add' = 'send';
  /**
   * SECONDARY send actions. When non-empty, a press-and-hold (~450ms, mouse + touch)
   * on the send button opens a small popover ABOVE the button listing these actions.
   * A normal tap (no hold) performs the DEFAULT send (`popSend`); selecting a popover
   * item emits `popSendAction { id, text, … }`. Pass as a PROPERTY (not stringified).
   */
  @Prop() sendActions: ComposerSendAction[] = [];

  /** Emitted on send (Enter / tap / send button) — the default action. */
  @Event({ composed: true, bubbles: true }) popSend: EventEmitter<ComposerSendDetail>;
  /** Emitted when a SECONDARY action is chosen from the press-hold popover. */
  @Event({ composed: true, bubbles: true }) popSendAction: EventEmitter<ComposerSendActionDetail>;
  /** Emitted whenever the text changes. */
  @Event({ composed: true, bubbles: true }) popValueChange: EventEmitter<string>;
  /** Emitted when the mic button is pressed (consumer wires STT → setValue). */
  @Event({ composed: true, bubbles: true }) popMicRequested: EventEmitter<void>;
  /** Emitted when the active audio-input device changes (mic press-hold popover).
   *  Also persisted to localStorage[MIC_DEVICE_KEY] so the consumer's capture can
   *  read it. `deviceId === ''` means "System default". */
  @Event({ composed: true, bubbles: true }) popMicDevice: EventEmitter<{ deviceId: string }>;
  /** Emitted when the "Talk back" toggle flips (mic press-hold popover). Persisted
   *  to localStorage[TALKBACK_KEY]. Consumer speaks assistant replies when on. */
  @Event({ composed: true, bubbles: true }) popTalkBack: EventEmitter<{ on: boolean }>;
  /** Emitted when images are attached. */
  @Event({ composed: true, bubbles: true }) popAttach: EventEmitter<File[]>;

  @State() open = false;
  @State() mode: Mode = 'command';
  @State() items: PopoverItem[] = [];
  @State() activeIndex = 0;
  @State() hasContent = false;
  @State() pendingImages: File[] = [];
  /** Whether the press-and-hold send-actions popover is open. */
  @State() actionsOpen = false;
  /** Keyboard-highlighted action index while the popover is open (-1 = none). */
  @State() actionIndex = -1;

  // ── Mic press-hold popover state ──
  /** Whether the mic press-hold popover (device select + Talk back) is open. */
  @State() micMenuOpen = false;
  /** Enumerated audio-input devices (empty until enumerated). */
  @State() micDevices: ComposerMicDevice[] = [];
  /** The active input deviceId ('' = System default). Persisted. */
  @State() micDeviceId = '';
  /** The "Talk back" (speak replies) toggle state. Persisted. */
  @State() talkBack = false;
  /** A user-facing note when devices can't be listed (no perm / none). */
  @State() micNote = '';

  private editor?: HTMLDivElement;
  private fileInput?: HTMLInputElement;
  /** Press-and-hold timer for the send button (long-press → open the popover). */
  private holdTimer?: ReturnType<typeof setTimeout>;
  /** Set true when a long-press fired so the subsequent click is suppressed. */
  private holdFired = false;
  /** Bound outside-click listener (added only while the SEND popover is open). */
  private onDocPointerDown?: (e: Event) => void;
  /** Press-and-hold timer for the MIC button. */
  private micHoldTimer?: ReturnType<typeof setTimeout>;
  /** Set true when a mic long-press fired (swallow the trailing click). */
  private micHoldFired = false;
  /** Bound outside-click listener while the MIC popover is open. */
  private onMicDocPointerDown?: (e: Event) => void;
  /** The mic wrapper (button + popover). Outside-click is scoped to THIS, not the
   *  whole composer host, so taps elsewhere in the composer dismiss the popover. */
  private micHoldEl?: HTMLElement;

  componentDidLoad() {
    if (this.value) this.setEditorText(this.value);
    this.refreshHasContent();
    // Hydrate the persisted mic device + talk-back preferences.
    try {
      this.micDeviceId = localStorage.getItem(MIC_DEVICE_KEY) || '';
      this.talkBack = localStorage.getItem(TALKBACK_KEY) === '1';
    } catch { /* storage disabled — defaults are fine */ }
  }

  @Watch('value')
  onValueProp(next: string) {
    // Controlled-ish: only push when the editor's plain text differs.
    if (this.editor && this.readText() !== next) {
      this.setEditorText(next || '');
      this.refreshHasContent();
    }
  }

  // ─────────────── public methods ───────────────
  @Method()
  async clear(): Promise<void> {
    if (this.editor) this.editor.innerHTML = '';
    this.pendingImages = [];
    this.closePopover();
    this.refreshHasContent();
    this.popValueChange.emit('');
  }

  @Method()
  async setFocus(): Promise<void> {
    this.editor?.focus();
  }

  @Method()
  async setValue(text: string): Promise<void> {
    this.setEditorText(text || '');
    this.refreshHasContent();
    this.popValueChange.emit(this.readText());
    this.editor?.focus();
    this.placeCaretAtEnd();
  }

  /** The active mic deviceId ('' = System default) — the consumer's voice capture
   *  should pass it as getUserMedia({ audio: { deviceId: { exact } } }). Reads the
   *  persisted value so it's correct even before the popover is opened. */
  @Method()
  async getMicDeviceId(): Promise<string> {
    if (this.micDeviceId) return this.micDeviceId;
    try { return localStorage.getItem(MIC_DEVICE_KEY) || ''; } catch { return ''; }
  }

  // ─────────────── value <-> DOM ───────────────

  /** Plain text with mentions serialized as `@Name`. */
  private readText(): string {
    if (!this.editor) return '';
    let out = '';
    this.editor.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) out += node.textContent || '';
      else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset?.mentionId) out += `@${el.dataset.mentionName || el.textContent?.replace(/^@/, '') || ''}`;
        else if (el.tagName === 'BR') out += '\n';
        else out += el.textContent || '';
      }
    });
    return out.replace(/ /g, ' ');
  }

  private readMentions(): ComposerMention[] {
    if (!this.editor) return [];
    const out: ComposerMention[] = [];
    this.editor.querySelectorAll('[data-mention-id]').forEach((n) => {
      const el = n as HTMLElement;
      out.push({ id: el.dataset.mentionId!, name: el.dataset.mentionName || el.textContent?.replace(/^@/, '') || '' });
    });
    return out;
  }

  private setEditorText(text: string) {
    if (!this.editor) return;
    this.editor.textContent = text;
  }

  private refreshHasContent() {
    const hasText = this.readText().trim().length > 0;
    this.hasContent = hasText || this.pendingImages.length > 0;
  }

  // ─────────────── trigger detection ───────────────

  private cursorContext(): { node: Text; before: string; pos: number } | null {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!this.editor?.contains(range.startContainer)) return null;
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    const node = range.startContainer as Text;
    const pos = range.startOffset;
    return { node, before: (node.textContent || '').slice(0, pos), pos };
  }

  /** Find a trigger (`/` or `@`) at the start of the current token. */
  private triggerMatch(before: string): { trigger: '/' | '@'; query: string } | null {
    for (const trigger of ['/', '@'] as const) {
      const idx = before.lastIndexOf(trigger);
      if (idx === -1) continue;
      // must be at start or preceded by whitespace
      if (idx > 0 && !/\s/.test(before[idx - 1])) continue;
      const query = before.slice(idx + 1);
      if (/\s/.test(query)) continue; // a space closes the token
      return { trigger, query };
    }
    return null;
  }

  /** Pure: the popover items for a trigger + query (exported via instance for tests). */
  filterItems(trigger: '/' | '@', query: string): PopoverItem[] {
    const q = query.toLowerCase();
    if (trigger === '/') {
      return this.commands
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 50)
        .map((c) => ({ key: c.name, label: `/${c.name}`, detail: c.description }));
    }
    return this.people
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 50)
      .map((p) => ({ key: p.id, label: p.name, avatar: p.avatar }));
  }

  private refreshPopover() {
    const ctx = this.cursorContext();
    if (!ctx) return this.closePopover();
    const match = this.triggerMatch(ctx.before);
    if (!match) return this.closePopover();
    const items = this.filterItems(match.trigger, match.query);
    if (items.length === 0) return this.closePopover();
    this.openPopover(match.trigger === '/' ? 'command' : 'mention', items);
  }

  private openPopover(mode: Mode, items: PopoverItem[]) {
    this.mode = mode;
    this.items = items;
    this.activeIndex = 0;
    this.open = true;
  }

  private closePopover() {
    this.open = false;
    this.items = [];
  }

  // ─────────────── insert ───────────────

  private accept(item: PopoverItem) {
    const ctx = this.cursorContext();
    if (!ctx) return this.closePopover();
    const trigger = this.mode === 'command' ? '/' : '@';
    const idx = ctx.before.lastIndexOf(trigger);
    if (idx === -1) return this.closePopover();

    const full = ctx.node.textContent || '';
    const prefix = full.slice(0, idx);
    const suffix = full.slice(ctx.pos);
    const parent = ctx.node.parentNode;
    if (!parent) return this.closePopover();

    const prefixNode = document.createTextNode(prefix);
    const spaceNode = document.createTextNode(' ');
    const suffixNode = document.createTextNode(suffix);

    parent.insertBefore(prefixNode, ctx.node);
    if (this.mode === 'command') {
      // commands insert as plain TEXT: `/name `
      parent.insertBefore(document.createTextNode(`/${item.key}`), ctx.node);
    } else {
      // people insert as a styled PILL carrying the uid
      parent.insertBefore(this.buildPill(item.key, item.label), ctx.node);
    }
    parent.insertBefore(spaceNode, ctx.node);
    parent.insertBefore(suffixNode, ctx.node);
    parent.removeChild(ctx.node);

    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.setStartAfter(spaceNode);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    this.closePopover();
    this.refreshHasContent();
    this.popValueChange.emit(this.readText());
  }

  private buildPill(id: string, name: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'pc__pill';
    span.dataset.mentionId = id;
    span.dataset.mentionName = name;
    span.contentEditable = 'false';
    span.textContent = `@${name}`;
    return span;
  }

  // ─────────────── handlers ───────────────

  private onInput = () => {
    this.refreshHasContent();
    this.popValueChange.emit(this.readText());
    this.refreshPopover();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.open && this.items.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIndex = (this.activeIndex + 1) % this.items.length; return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIndex = (this.activeIndex - 1 + this.items.length) % this.items.length; return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); this.accept(this.items[this.activeIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); this.closePopover(); return; }
      if (e.key === ' ') { this.closePopover(); /* let the space type */ }
    }

    if (e.key === 'Enter' && !e.shiftKey && !this.open) {
      e.preventDefault();
      this.send();
      return;
    }

    if (e.key === 'Backspace') {
      // delete a pill when the caret sits right after it
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed && range.startOffset === 0 && range.startContainer.nodeType === Node.TEXT_NODE) {
        const prev = range.startContainer.previousSibling as HTMLElement | null;
        if (prev?.dataset?.mentionId) {
          e.preventDefault();
          prev.remove();
          this.refreshHasContent();
          this.popValueChange.emit(this.readText());
        }
      }
    }
  };

  private onPaste = (e: ClipboardEvent) => {
    // plain text only (keep the slim composer free of pasted rich markup)
    const txt = e.clipboardData?.getData('text/plain');
    if (txt != null) {
      e.preventDefault();
      document.execCommand('insertText', false, txt);
    }
  };

  private send = () => {
    if (this.disabled) return;
    const text = this.readText().trim();
    const images = this.pendingImages.slice();
    if (!text && images.length === 0) return;
    this.popSend.emit({ text, mentions: this.readMentions(), images: images.length ? images : undefined });
    void this.clear();
  };

  // ─────────────── press-and-hold send-actions popover ───────────────

  private get hasActions(): boolean {
    return Array.isArray(this.sendActions) && this.sendActions.length > 0;
  }

  /** Fire a SECONDARY action: emit popSendAction with the current text, then clear. */
  private runAction = (id: string) => {
    if (this.disabled) return;
    const text = this.readText().trim();
    const images = this.pendingImages.slice();
    this.closeActions();
    this.popSendAction.emit({ id, text, mentions: this.readMentions(), images: images.length ? images : undefined });
    void this.clear();
  };

  private openActions = () => {
    if (this.disabled || !this.hasActions) return;
    this.actionsOpen = true;
    this.actionIndex = -1;
    // Outside-click closes the popover (capture so it beats inner stopPropagation).
    this.onDocPointerDown = (e: Event) => {
      const path = (e as any).composedPath ? (e as any).composedPath() : [];
      if (!path.includes(this.el)) this.closeActions();
    };
    document.addEventListener('pointerdown', this.onDocPointerDown, true);
  };

  private closeActions = () => {
    if (!this.actionsOpen && this.actionIndex === -1) return;
    this.actionsOpen = false;
    this.actionIndex = -1;
    if (this.onDocPointerDown) {
      document.removeEventListener('pointerdown', this.onDocPointerDown, true);
      this.onDocPointerDown = undefined;
    }
  };

  /** Pointer-down on the send button arms the hold timer (mouse + touch). */
  private onSendPointerDown = () => {
    if (this.disabled || !this.hasActions) return;
    this.holdFired = false;
    this.clearHold();
    this.holdTimer = setTimeout(() => {
      this.holdFired = true;
      this.openActions();
    }, 450);
  };

  private clearHold = () => {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = undefined;
    }
  };

  /** Tap on the send button → DEFAULT send, UNLESS a press-and-hold just opened the
   *  popover (swallow that trailing click). */
  private onSendClick = () => {
    this.clearHold();
    if (this.holdFired) {
      this.holdFired = false;
      return;
    }
    this.send();
  };

  /** Arrow-key navigation + Esc inside the popover (anchored on the send button). */
  private onActionsKeyDown = (e: KeyboardEvent) => {
    const n = this.sendActions.length;
    if (!this.actionsOpen || n === 0) return;
    if (e.key === 'Escape') { e.preventDefault(); this.closeActions(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.actionIndex = (this.actionIndex + 1) % n; return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.actionIndex = (this.actionIndex - 1 + n) % n; return; }
    if (e.key === 'Enter' && this.actionIndex >= 0) { e.preventDefault(); this.runAction(this.sendActions[this.actionIndex].id); return; }
  };

  // ─────────────── press-and-hold MIC popover (device select + talk-back) ───────

  /** Pointer-down on the mic arms the hold timer (mouse + touch). A hold opens the
   *  popover; a plain tap keeps the existing voice-input behavior (popMicRequested). */
  private onMicPointerDown = () => {
    if (this.disabled) return;
    this.micHoldFired = false;
    this.clearMicHold();
    this.micHoldTimer = setTimeout(() => {
      this.micHoldFired = true;
      void this.openMicMenu();
    }, 450);
  };

  private clearMicHold = () => {
    if (this.micHoldTimer) {
      clearTimeout(this.micHoldTimer);
      this.micHoldTimer = undefined;
    }
  };

  /** Tap the mic → the existing voice input, UNLESS a hold just opened the popover. */
  private onMicClick = () => {
    this.clearMicHold();
    if (this.micHoldFired) {
      this.micHoldFired = false;
      return;
    }
    this.popMicRequested.emit();
  };

  private openMicMenu = async () => {
    this.micMenuOpen = true;
    this.micNote = '';
    this.onMicDocPointerDown = (e: Event) => {
      const path = (e as any).composedPath ? (e as any).composedPath() : [];
      // Scope the containment test to the mic wrapper (button + popover) rather
      // than the whole composer host, so a tap anywhere ELSE in the composer
      // (the text input, send button, empty gutter) dismisses the popover.
      const anchor = this.micHoldEl ?? this.el;
      if (!path.includes(anchor)) this.closeMicMenu();
    };
    document.addEventListener('pointerdown', this.onMicDocPointerDown, true);
    await this.enumerateMics();
  };

  private closeMicMenu = () => {
    if (!this.micMenuOpen) return;
    this.micMenuOpen = false;
    if (this.onMicDocPointerDown) {
      document.removeEventListener('pointerdown', this.onMicDocPointerDown, true);
      this.onMicDocPointerDown = undefined;
    }
  };

  /** Enumerate audio-input devices. Labels need mic permission — if they're blank,
   *  request getUserMedia once to populate them, then stop the tracks. Graceful on
   *  no-devices / permission-denied (sets a note). */
  private async enumerateMics() {
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!md?.enumerateDevices) {
      this.micNote = 'Audio device selection isn’t supported here.';
      this.micDevices = [];
      return;
    }
    try {
      let devices = await md.enumerateDevices();
      let inputs = devices.filter((d) => d.kind === 'audioinput');
      // Labels are empty until permission is granted → request once to populate.
      const needLabels = inputs.length === 0 || inputs.every((d) => !d.label);
      if (needLabels && md.getUserMedia) {
        try {
          const stream = await md.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          devices = await md.enumerateDevices();
          inputs = devices.filter((d) => d.kind === 'audioinput');
        } catch {
          this.micNote = 'Allow microphone access to choose a device.';
        }
      }
      this.micDevices = inputs.map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
      }));
      if (this.micDevices.length === 0 && !this.micNote) this.micNote = 'No microphones found.';
    } catch {
      this.micNote = 'Couldn’t list microphones.';
      this.micDevices = [];
    }
  }

  /** Select an input device: persist it, emit popMicDevice. '' = System default. */
  private pickMicDevice = (deviceId: string) => {
    this.micDeviceId = deviceId;
    try { localStorage.setItem(MIC_DEVICE_KEY, deviceId); } catch { /* ignore */ }
    this.popMicDevice.emit({ deviceId });
  };

  /** Flip the Talk-back toggle: persist + emit. */
  private toggleTalkBack = () => {
    this.talkBack = !this.talkBack;
    try { localStorage.setItem(TALKBACK_KEY, this.talkBack ? '1' : '0'); } catch { /* ignore */ }
    this.popTalkBack.emit({ on: this.talkBack });
  };

  /** Esc closes the mic popover (anchored on the mic button). */
  private onMicMenuKeyDown = (e: KeyboardEvent) => {
    if (this.micMenuOpen && e.key === 'Escape') { e.preventDefault(); this.closeMicMenu(); }
  };

  disconnectedCallback() {
    this.clearHold();
    this.clearMicHold();
    if (this.onDocPointerDown) {
      document.removeEventListener('pointerdown', this.onDocPointerDown, true);
      this.onDocPointerDown = undefined;
    }
    if (this.onMicDocPointerDown) {
      document.removeEventListener('pointerdown', this.onMicDocPointerDown, true);
      this.onMicDocPointerDown = undefined;
    }
  }

  private onAttachClick = () => this.fileInput?.click();

  private onFiles = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      this.pendingImages = [...this.pendingImages, ...files];
      this.refreshHasContent();
      this.popAttach.emit(files);
    }
    input.value = '';
  };

  private removeImage(i: number) {
    this.pendingImages = this.pendingImages.filter((_, idx) => idx !== i);
    this.refreshHasContent();
  }

  private placeCaretAtEnd() {
    if (!this.editor) return;
    const sel = window.getSelection();
    if (!sel) return;
    const r = document.createRange();
    r.selectNodeContents(this.editor);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  /** The default send glyph (paper-plane, or the `+` when submitIcon='add'). */
  private defaultSendGlyph() {
    // pop-icon centers the glyph perfectly (no baseline drift). `add` mode → a
    // plus; normal → the paper-plane send glyph.
    return this.submitIcon === 'add'
      ? <pop-icon class="pc__glyph" name="add" />
      : <pop-icon class="pc__glyph" name="paper-plane" />;
  }

  /** Plain (no sendActions) send button — the original behavior, unchanged. */
  private renderSend() {
    return (
      <button type="button" class="pc__send" aria-label={this.submitIcon === 'add' ? 'Add to a new thread' : 'Send'} disabled={this.disabled || !this.hasContent} onClick={this.send}>
        {this.defaultSendGlyph()}
      </button>
    );
  }

  /** A small inline glyph for a popover item: an ion-icon (named) OR a literal char/emoji. */
  private renderActionIcon(icon?: string) {
    if (!icon) return null;
    const isIonName = /^[a-z][a-z0-9-]+$/.test(icon) && icon.length > 1;
    return isIonName
      ? <pop-icon class="pc__act-icon" name={icon} />
      : <span class="pc__act-icon pc__act-glyph" aria-hidden="true">{icon}</span>;
  }

  /** Send button with a press-and-hold popover of secondary actions. A normal tap
   *  performs the DEFAULT send; a press-and-hold opens the popover ABOVE the button. */
  private renderHoldSend() {
    const disabled = this.disabled || !this.hasContent;
    return (
      <div class="pc__sendhold" onKeyDown={this.onActionsKeyDown}>
        {this.actionsOpen && (
          <div class="pc__actions" role="menu" aria-label="Send options">
            {this.sendActions.map((a, i) => (
              <button
                type="button"
                role="menuitem"
                key={a.id}
                class={{ 'pc__act': true, 'pc__act--active': i === this.actionIndex }}
                onMouseEnter={() => (this.actionIndex = i)}
                onClick={(ev) => { ev.stopPropagation(); this.runAction(a.id); }}
              >
                {this.renderActionIcon(a.icon)}
                <span class="pc__act-label">{a.label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          class="pc__send pc__send--hold"
          aria-label={this.submitIcon === 'add' ? 'Add to a new thread' : 'Send'}
          aria-haspopup="menu"
          aria-expanded={this.actionsOpen ? 'true' : 'false'}
          disabled={disabled}
          onClick={this.onSendClick}
          onMouseDown={this.onSendPointerDown}
          onMouseUp={this.clearHold}
          onMouseLeave={this.clearHold}
          onTouchStart={this.onSendPointerDown}
          onTouchEnd={this.clearHold}
          onTouchCancel={this.clearHold}
          onContextMenu={(e: Event) => e.preventDefault()}
        >
          {this.defaultSendGlyph()}
        </button>
      </div>
    );
  }

  /** Mic button with a press-and-hold popover: audio-input device select + a
   *  "Talk back" toggle. A normal tap = voice input (popMicRequested); a hold opens
   *  the popover ABOVE the button (same mechanics as the send-actions popover). */
  private renderMic() {
    return (
      <div class="pc__michold" ref={(el) => (this.micHoldEl = el as HTMLElement)} onKeyDown={this.onMicMenuKeyDown}>
        {this.micMenuOpen && (
          <div class="pc__micmenu" role="menu" aria-label="Microphone options">
            <div class="pc__micmenu-head">Microphone</div>
            {this.micDevices.length > 0 ? (
              <div class="pc__micmenu-list">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={this.micDeviceId === '' ? 'true' : 'false'}
                  class={{ 'pc__micitem': true, 'pc__micitem--active': this.micDeviceId === '' }}
                  onClick={(e) => { e.stopPropagation(); this.pickMicDevice(''); }}
                >
                  <span class="pc__micitem-label">System default</span>
                  {this.micDeviceId === '' && <pop-icon class="pc__micitem-check" name="checkmark" />}
                </button>
                {this.micDevices.map((d) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    key={d.deviceId}
                    aria-checked={this.micDeviceId === d.deviceId ? 'true' : 'false'}
                    class={{ 'pc__micitem': true, 'pc__micitem--active': this.micDeviceId === d.deviceId }}
                    onClick={(e) => { e.stopPropagation(); this.pickMicDevice(d.deviceId); }}
                  >
                    <span class="pc__micitem-label">{d.label}</span>
                    {this.micDeviceId === d.deviceId && <pop-icon class="pc__micitem-check" name="checkmark" />}
                  </button>
                ))}
              </div>
            ) : (
              <div class="pc__micmenu-note">{this.micNote || 'No microphones found.'}</div>
            )}

            {/* Talk-back toggle — an app-native switch (speak assistant replies). */}
            <button
              type="button"
              role="switch"
              aria-checked={this.talkBack ? 'true' : 'false'}
              class="pc__micitem pc__talkback"
              onClick={(e) => { e.stopPropagation(); this.toggleTalkBack(); }}
            >
              <pop-icon class="pc__micitem-lead" name={this.talkBack ? 'volume-high' : 'volume-mute-outline'} />
              <span class="pc__micitem-label">Talk back</span>
              <span class={{ 'pc__switch': true, 'pc__switch--on': this.talkBack }} aria-hidden="true">
                <span class="pc__switch-knob" />
              </span>
            </button>
          </div>
        )}
        <button
          type="button"
          class="pc__icon pc__icon--mic"
          aria-label="Record voice"
          aria-haspopup="menu"
          aria-expanded={this.micMenuOpen ? 'true' : 'false'}
          disabled={this.disabled}
          onClick={this.onMicClick}
          onMouseDown={this.onMicPointerDown}
          onMouseUp={this.clearMicHold}
          onMouseLeave={this.clearMicHold}
          onTouchStart={this.onMicPointerDown}
          onTouchEnd={this.clearMicHold}
          onTouchCancel={this.clearMicHold}
          onContextMenu={(e: Event) => e.preventDefault()}
        >
          <pop-icon class="pc__glyph" name="mic-outline" />
        </button>
      </div>
    );
  }

  render() {
    return (
      <div class="pc">
        {this.open && this.items.length > 0 && (
          <div class="pc__popover" role="listbox" aria-label={this.mode === 'command' ? 'Commands' : 'People'}>
            {this.items.map((it, i) => (
              <button
                type="button"
                role="option"
                aria-selected={i === this.activeIndex ? 'true' : 'false'}
                class={{ 'pc__opt': true, 'pc__opt--active': i === this.activeIndex }}
                onMouseDown={(ev) => { ev.preventDefault(); this.accept(it); }}
                onMouseEnter={() => (this.activeIndex = i)}
              >
                {this.mode === 'mention'
                  ? (it.avatar
                      ? <span class="pc__opt-avatar"><img src={it.avatar} alt="" /></span>
                      : <span class="pc__opt-avatar pc__opt-avatar--initial">{(it.label[0] || '@').toUpperCase()}</span>)
                  : <span class="pc__opt-icon">/</span>}
                <span class="pc__opt-text">
                  <span class="pc__opt-label">{it.label}</span>
                  {it.detail && <span class="pc__opt-detail">{it.detail}</span>}
                </span>
              </button>
            ))}
          </div>
        )}

        {this.pendingImages.length > 0 && (
          <div class="pc__attachments">
            {this.pendingImages.map((f, i) => (
              <span class="pc__chip">
                🖼️ {f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name}
                <button type="button" class="pc__chip-x" aria-label="Remove" onClick={() => this.removeImage(i)}>×</button>
              </span>
            ))}
          </div>
        )}

        <div class={{ 'pc__bar': true, 'pc__bar--disabled': this.disabled }}>
          {this.showAttach && (
            <button type="button" class="pc__icon" aria-label="Attach image" disabled={this.disabled} onClick={this.onAttachClick}>
              <pop-icon class="pc__glyph" name="attach-outline" />
            </button>
          )}
          <div
            class="pc__editor"
            contentEditable={!this.disabled}
            role="textbox"
            aria-multiline="true"
            data-placeholder={this.placeholder}
            ref={(el) => (this.editor = el as HTMLDivElement)}
            onInput={this.onInput}
            onKeyDown={this.onKeyDown}
            onPaste={this.onPaste}
            onBlur={() => setTimeout(() => this.closePopover(), 120)}
          />
          {this.showMic && this.renderMic()}
          {this.hasActions ? this.renderHoldSend() : this.renderSend()}
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          class="pc__file"
          ref={(el) => (this.fileInput = el as HTMLInputElement)}
          onChange={this.onFiles}
        />
      </div>
    );
  }
}
