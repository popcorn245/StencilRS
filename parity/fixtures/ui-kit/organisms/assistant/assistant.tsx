import {
  Component,
  Prop,
  State,
  Event,
  EventEmitter,
  Element,
  Method,
  Watch,
  h,
} from '@stencil/core';

/**
 * pop-assistant — the unified in-app Assistant surface (notes-app WS2).
 *
 * ONE always-on component that collapses the three scattered AI touchpoints into
 * a single organism with three verbs — **Ask** / **Build** / **Link** — over a
 * `pop-ai-chat` conversation, a SINGLE Gemma/Claude model control, and the
 * locked **propose → approve** interaction model (assistant.mdx):
 *
 *   • Ask  — grounded, cited Q&A (read-only). The host drives streaming via the
 *     embedded `pop-ai-chat` (external-driver) and answers carry citation chips.
 *   • Build — proposes full-Notion-palette Editor.js blocks; rendered as an
 *     inline **block diff** with per-block accept toggles + Approve / Reject.
 *   • Link  — on-demand "Suggest links"; rendered as approvable link chips.
 *
 * This organism is **presentation + interaction only** — it never calls a model
 * or writes a note. The host (app-root / the editor) owns retrieval, the model,
 * the `/assistantThreads` persistence, and the approve-side writes. The
 * component emits intent events (`popAssistantSend`, `popAssistantSuggestLinks`,
 * `popAssistantApprove*`, …) and exposes imperative streaming methods that
 * proxy to the inner `pop-ai-chat`.
 */

/** A grounding citation chip on an Ask answer (mirrors pop-ai-chat's AiCitation). */
export interface AssistantCitation {
  index: number;
  refId: string;
  label: string;
  snippet?: string;
}

/** One proposed block in a Build diff. */
export interface AssistantBlock {
  /** Editor.js block type (header/paragraph/list/table/code/checklist/columns…). */
  type: string;
  data: Record<string, unknown>;
  change?: 'add' | 'rewrite';
  ofId?: string;
}

/** One proposed related-note link in a Link diff. */
export interface AssistantLink {
  noteId: string;
  title: string;
  reason: string;
}

type Verb = 'ask' | 'build' | 'link';
type Model = 'gemma' | 'claude';

@Component({
  tag: 'pop-assistant',
  encapsulation: { type: 'scoped' },
  styleUrl: 'assistant.css',
})
export class PopAssistant {
  @Element() el!: HTMLElement;

  /** Active verb (Ask default). Controlled by the host or the internal tabs. */
  @Prop({ mutable: true }) verb: Verb = 'ask';

  /** The single model control's value: Gemma (default) ↔ Claude (toggle). */
  @Prop({ mutable: true }) model: Model = 'gemma';

  /** Pre-loaded Ask conversation (JSON AiMessage[]) restored from the thread. */
  @Prop() messages = '[]';

  /** True when the Assistant is grounded in an open note (shows the context row). */
  @Prop() noteGrounded = false;

  /** Label of the grounding note (for the context row). */
  @Prop() noteTitle = '';

  /** Compact mode = the desktop dock; full = a page/sheet surface. */
  @Prop() layout: 'dock' | 'full' = 'dock';

  /** A pending Build proposal (JSON AssistantBlock[]) — renders the block diff. */
  @Prop() buildProposal = '';

  /** The Build sub-action label shown on the proposal ("Structure"/"Rewrite"…). */
  @Prop() buildAction = 'structure';

  /** A pending Link proposal (JSON AssistantLink[]) — renders the link chips. */
  @Prop() linkProposal = '';

  /** Show the busy state while the host fetches a Build/Link proposal. */
  @Prop() proposing = false;

  /** An honest error to surface (e.g. endpoint unreachable). */
  @Prop() errorMessage = '';

  // ── proposal selection state ──
  @State() acceptedBlocks: Record<number, boolean> = {};
  @State() acceptedLinks: Record<string, boolean> = {};

  @Event() popAssistantVerbChange!: EventEmitter<Verb>;
  @Event() popAssistantModelChange!: EventEmitter<Model>;
  /** Ask: a question was submitted (host drives the streamed answer). */
  @Event() popAssistantSend!: EventEmitter<{ text: string; model: Model }>;
  /** Build: run a sub-action against the current text/selection. */
  @Event() popAssistantBuild!: EventEmitter<{ action: string; model: Model }>;
  /** Link: on-demand "Suggest links" was invoked. */
  @Event() popAssistantSuggestLinks!: EventEmitter<{ model: Model }>;
  /** A citation chip was clicked → host navigates to the ref. */
  @Event() popAssistantCitationClick!: EventEmitter<{ refId: string; index: number }>;
  /** Approve a Build proposal → host writes the accepted blocks. */
  @Event() popAssistantApproveBuild!: EventEmitter<{ blocks: AssistantBlock[] }>;
  /** Reject a Build proposal → discard (nothing written). */
  @Event() popAssistantRejectBuild!: EventEmitter<void>;
  /** Approve a Link proposal → host appends the accepted links. */
  @Event() popAssistantApproveLinks!: EventEmitter<{ noteIds: string[] }>;
  /** Reject a Link proposal → discard. */
  @Event() popAssistantRejectLinks!: EventEmitter<void>;

  private chatEl?: HTMLElement & {
    beginAssistant(): Promise<void>;
    appendAssistantToken(t: string): Promise<void>;
    endAssistant(content?: string, citations?: AssistantCitation[]): Promise<void>;
    setInputValue(t: string): Promise<void>;
  };

  // ── imperative streaming (proxied to the inner pop-ai-chat) ────────────────
  /** Host: begin an Ask assistant turn (typing bubble). */
  @Method() async beginAssistant(): Promise<any> {
    await this.chatEl?.beginAssistant();
  }
  /** Host: append a token to the streaming answer. */
  @Method() async appendAssistantToken(token: string): Promise<any> {
    await this.chatEl?.appendAssistantToken(token);
  }
  /** Host: finalize the answer with optional citations. */
  @Method() async endAssistant(content?: string, citations?: AssistantCitation[]): Promise<any> {
    await this.chatEl?.endAssistant(content, citations);
  }
  /** Host: seed the Ask input (e.g. from Cmd-K / a selection). */
  @Method() async setAskInput(text: string): Promise<any> {
    this.verb = 'ask';
    await this.chatEl?.setInputValue(text);
  }

  @Watch('buildProposal')
  resetBuildSelection() {
    // New proposal → accept everything by default (user can toggle off).
    const blocks = this.parseBlocks();
    const next: Record<number, boolean> = {};
    blocks.forEach((_, i) => (next[i] = true));
    this.acceptedBlocks = next;
  }

  @Watch('linkProposal')
  resetLinkSelection() {
    const links = this.parseLinks();
    const next: Record<string, boolean> = {};
    links.forEach((l) => (next[l.noteId] = true));
    this.acceptedLinks = next;
  }

  componentWillLoad() {
    this.resetBuildSelection();
    this.resetLinkSelection();
  }

  private parseBlocks(): AssistantBlock[] {
    try {
      const p = JSON.parse(this.buildProposal || '[]');
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }

  private parseLinks(): AssistantLink[] {
    try {
      const p = JSON.parse(this.linkProposal || '[]');
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }

  private setVerb(v: Verb) {
    if (this.verb === v) return;
    this.verb = v;
    this.popAssistantVerbChange.emit(v);
  }

  private setModel(m: Model) {
    if (this.model === m) return;
    this.model = m;
    this.popAssistantModelChange.emit(m);
  }

  // ── render: header (verb tabs + the ONE model control) ─────────────────────
  private renderHeader() {
    const verbs: { id: Verb; label: string; icon: string }[] = [
      { id: 'ask', label: 'Ask', icon: 'sparkles' },
      { id: 'build', label: 'Build', icon: 'notebook' },
      { id: 'link', label: 'Link', icon: 'link' },
    ];
    return (
      <header class="asst-head">
        <div class="asst-verbs" role="tablist" aria-label="Assistant mode">
          {verbs.map((v) => (
            <button
              type="button"
              role="tab"
              aria-selected={this.verb === v.id ? 'true' : 'false'}
              class={{ 'asst-verb': true, 'is-active': this.verb === v.id }}
              onClick={() => this.setVerb(v.id)}
            >
              <pop-brand-icon name={v.icon} /> <span>{v.label}</span>
            </button>
          ))}
        </div>
        {/* The ONE model control — Gemma default / Claude toggle. */}
        <div class="asst-model" role="radiogroup" aria-label="Answer model">
          {(['gemma', 'claude'] as Model[]).map((m) => (
            <button
              type="button"
              role="radio"
              aria-checked={this.model === m ? 'true' : 'false'}
              class={{ 'asst-model-opt': true, 'is-active': this.model === m }}
              onClick={() => this.setModel(m)}
            >
              {m === 'gemma' ? 'Gemma' : 'Claude'}
            </button>
          ))}
        </div>
      </header>
    );
  }

  private renderContext() {
    if (!this.noteGrounded) return null;
    return (
      <div class="asst-context" aria-label="Grounded in the open note">
        <pop-brand-icon name="sparkles" />
        <span>Grounded in {this.noteTitle ? `“${this.noteTitle}”` : 'this note'}</span>
      </div>
    );
  }

  private renderError() {
    if (!this.errorMessage) return null;
    return (
      <div class="asst-error" role="alert">
        <pop-brand-icon name="warning" /> <span>{this.errorMessage}</span>
      </div>
    );
  }

  // ── render: Ask (the pop-ai-chat conversation) ─────────────────────────────
  private renderAsk() {
    return (
      <pop-ai-chat
        class="asst-chat"
        ref={(el) => (this.chatEl = el as any)}
        external-driver
        ai-name="Brain"
        layout="bubble"
        placeholder="Ask about your notes…"
        messages={this.messages}
        selected-model={this.model}
        onPopMessageSent={(e: CustomEvent) =>
          this.popAssistantSend.emit({ text: e.detail.text, model: this.model })
        }
        onPopCitationClick={(e: CustomEvent) => this.popAssistantCitationClick.emit(e.detail)}
      />
    );
  }

  // ── render: Build (sub-actions + block-diff proposal) ──────────────────────
  private renderBuild() {
    const blocks = this.parseBlocks();
    const hasProposal = blocks.length > 0;
    const actions: { id: string; label: string }[] = [
      { id: 'structure', label: 'Structure' },
      { id: 'expand', label: 'Expand' },
      { id: 'summarize', label: 'Summarize' },
      { id: 'rewrite', label: 'Rewrite' },
    ];
    return (
      <div class="asst-build">
        <div class="asst-actions" role="group" aria-label="Build actions">
          {actions.map((a) => (
            <button
              type="button"
              class="asst-action"
              disabled={this.proposing}
              onClick={() => this.popAssistantBuild.emit({ action: a.id, model: this.model })}
            >
              {a.label}
            </button>
          ))}
        </div>

        {this.proposing && (
          <pop-loading-state variant="spinner" show-label="true" label="Building a proposal…" />
        )}

        {!this.proposing && !hasProposal && (
          <pop-empty-state
            iconName="notebook"
            heading="Build structured blocks"
            message="Turn a raw capture into headers, lists, tables, code, checklists and columns — or rewrite a selection. You approve before anything is written."
            size="full"
          />
        )}

        {!this.proposing && hasProposal && this.renderBuildProposal(blocks)}
      </div>
    );
  }

  private renderBuildProposal(blocks: AssistantBlock[]) {
    const acceptedCount = blocks.filter((_, i) => this.acceptedBlocks[i]).length;
    return (
      <div class="asst-proposal" aria-label="Proposed blocks">
        <div class="asst-proposal-head">
          <span class="asst-proposal-title">
            Proposed {blocks.length} block{blocks.length === 1 ? '' : 's'} · {this.buildAction}
          </span>
          <span class="asst-proposal-note">Nothing is written until you Approve</span>
        </div>
        <ul class="asst-diff">
          {blocks.map((b, i) => (
            <li class={{ 'asst-diff-block': true, 'is-off': !this.acceptedBlocks[i] }}>
              <label class="asst-diff-toggle">
                <input
                  type="checkbox"
                  checked={!!this.acceptedBlocks[i]}
                  onChange={(e) =>
                    (this.acceptedBlocks = {
                      ...this.acceptedBlocks,
                      [i]: (e.target as HTMLInputElement).checked,
                    })
                  }
                  aria-label={`Include block ${i + 1}`}
                />
              </label>
              <div class="asst-diff-body">
                <span class="asst-diff-kind">
                  {b.change === 'rewrite' ? 'rewrite' : 'add'} · {b.type}
                </span>
                {this.renderBlockPreview(b)}
              </div>
            </li>
          ))}
        </ul>
        <div class="asst-approve-row">
          <button
            type="button"
            class="asst-approve"
            disabled={acceptedCount === 0}
            onClick={() =>
              this.popAssistantApproveBuild.emit({
                blocks: blocks.filter((_, i) => this.acceptedBlocks[i]),
              })
            }
          >
            <pop-brand-icon name="check" /> Approve ({acceptedCount})
          </button>
          <button type="button" class="asst-reject" onClick={() => this.popAssistantRejectBuild.emit()}>
            <pop-brand-icon name="close" /> Reject
          </button>
        </div>
      </div>
    );
  }

  /** Render a small, faithful preview of each palette block type. */
  private renderBlockPreview(b: AssistantBlock) {
    const d = (b.data ?? {}) as any;
    switch (b.type) {
      case 'header':
        return <div class={`asst-bp asst-bp-h${d.level ?? 2}`} innerHTML={sanitize(d.text)} />;
      case 'paragraph':
        return <p class="asst-bp" innerHTML={sanitize(d.text)} />;
      case 'list':
      case 'checklist': {
        const items: any[] = Array.isArray(d.items) ? d.items : [];
        const ordered = d.style === 'ordered';
        return (
          <ul class={{ 'asst-bp': true, 'asst-bp-list': true, 'is-check': b.type === 'checklist' }}>
            {items.map((it) => {
              const text = typeof it === 'string' ? it : it?.content ?? it?.text ?? '';
              const checked = typeof it === 'object' && (it?.meta?.checked || it?.checked);
              return (
                <li>
                  {b.type === 'checklist' && (
                    <span class={{ 'asst-check': true, 'is-on': !!checked }} aria-hidden="true" />
                  )}
                  {ordered && b.type === 'list' ? '• ' : ''}
                  <span innerHTML={sanitize(text)} />
                </li>
              );
            })}
          </ul>
        );
      }
      case 'table': {
        const rows: any[][] = Array.isArray(d.content) ? d.content : [];
        return (
          <table class="asst-bp asst-bp-table">
            <tbody>
              {rows.slice(0, 4).map((row) => (
                <tr>{(row || []).slice(0, 4).map((cell) => <td innerHTML={sanitize(cell)} />)}</tr>
              ))}
            </tbody>
          </table>
        );
      }
      case 'code':
        return (
          <pre class="asst-bp asst-bp-code">
            <code>{String(d.code ?? '')}</code>
          </pre>
        );
      case 'columns': {
        const cols: any[] = Array.isArray(d.columns) ? d.columns : [];
        return (
          <div class="asst-bp asst-bp-cols">
            {cols.map((c) => (
              <div class="asst-bp-col">
                {(c?.blocks ?? []).map((cb: any) => (
                  <div innerHTML={sanitize(cb?.data?.text ?? '')} />
                ))}
              </div>
            ))}
          </div>
        );
      }
      default:
        return <p class="asst-bp asst-bp-muted">{b.type}</p>;
    }
  }

  // ── render: Link (on-demand Suggest links + approvable chips) ──────────────
  private renderLink() {
    const links = this.parseLinks();
    const hasProposal = links.length > 0;
    return (
      <div class="asst-link">
        <button
          type="button"
          class="asst-suggest"
          disabled={this.proposing}
          onClick={() => this.popAssistantSuggestLinks.emit({ model: this.model })}
        >
          <pop-brand-icon name="link" /> Suggest links
        </button>

        {this.proposing && (
          <pop-loading-state variant="spinner" show-label="true" label="Finding related notes…" />
        )}

        {!this.proposing && !hasProposal && (
          <pop-empty-state
            iconName="link"
            heading="Related notes, on demand"
            message="Ask for NotebookLM-style connections. Suggestions never appear on their own — and you approve each link before it's added."
            size="full"
          />
        )}

        {!this.proposing && hasProposal && this.renderLinkProposal(links)}
      </div>
    );
  }

  private renderLinkProposal(links: AssistantLink[]) {
    const acceptedIds = links.filter((l) => this.acceptedLinks[l.noteId]).map((l) => l.noteId);
    return (
      <div class="asst-proposal" aria-label="Suggested links">
        <div class="asst-proposal-head">
          <span class="asst-proposal-title">
            {links.length} suggested link{links.length === 1 ? '' : 's'}
          </span>
          <span class="asst-proposal-note">Approve to insert [[links]]</span>
        </div>
        <ul class="asst-linklist">
          {links.map((l) => (
            <li class={{ 'asst-linkrow': true, 'is-off': !this.acceptedLinks[l.noteId] }}>
              <label class="asst-diff-toggle">
                <input
                  type="checkbox"
                  checked={!!this.acceptedLinks[l.noteId]}
                  onChange={(e) =>
                    (this.acceptedLinks = {
                      ...this.acceptedLinks,
                      [l.noteId]: (e.target as HTMLInputElement).checked,
                    })
                  }
                  aria-label={`Include link to ${l.title}`}
                />
              </label>
              <div class="asst-linkrow-body">
                <span class="asst-linkrow-title">{l.title}</span>
                <span class="asst-linkrow-reason">{l.reason}</span>
              </div>
            </li>
          ))}
        </ul>
        <div class="asst-approve-row">
          <button
            type="button"
            class="asst-approve"
            disabled={acceptedIds.length === 0}
            onClick={() => this.popAssistantApproveLinks.emit({ noteIds: acceptedIds })}
          >
            <pop-brand-icon name="check" /> Approve ({acceptedIds.length})
          </button>
          <button type="button" class="asst-reject" onClick={() => this.popAssistantRejectLinks.emit()}>
            <pop-brand-icon name="close" /> Reject
          </button>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div class={{ 'asst-root': true, [`asst-root--${this.layout}`]: true }}>
        {this.renderHeader()}
        {this.renderContext()}
        {this.renderError()}
        <div class="asst-body">
          {/* Ask is always mounted (keeps the chat + its streaming ref alive
              across verb switches); Build/Link mount on demand. */}
          <div class="asst-pane" hidden={this.verb !== 'ask'}>
            {this.renderAsk()}
          </div>
          {this.verb === 'build' && <div class="asst-pane">{this.renderBuild()}</div>}
          {this.verb === 'link' && <div class="asst-pane">{this.renderLink()}</div>}
        </div>
      </div>
    );
  }
}

/**
 * Minimal inline-HTML sanitizer for proposal previews. Editor.js block text may
 * carry inline markup (<b>/<i>/<a>/wikilink anchors); we keep a safe subset and
 * drop everything else so a proposal can't inject script into the preview.
 */
function sanitize(html: unknown): string {
  const s = String(html ?? '');
  if (typeof document === 'undefined') return s.replace(/<[^>]*>/g, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = s;
  tmp.querySelectorAll('script,style,iframe,object,embed').forEach((n) => n.remove());
  tmp.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if (name === 'href' && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    }
  });
  return tmp.innerHTML;
}
