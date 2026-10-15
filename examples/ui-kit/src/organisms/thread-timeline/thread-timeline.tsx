import { Component, h, Prop, State, Method, Element, Event, EventEmitter } from '@stencil/core';
import type {
  ThreadItem,
  ThreadItemActionDetail,
  ThreadItemRefDetail,
  ThreadItemStatusDetail,
  ThreadLoadOlderDetail,
} from './thread-timeline-types';

/** Distance (px) from the top that triggers an upward "load older" fetch. */
const LOAD_OLDER_THRESHOLD = 48;

/**
 * pop-thread-timeline — the Thread Model v2 timeline.
 *
 * Renders a pre-sorted list of thread items: messages as bubbles, cards through
 * the `pop-thread-card` wrapper with an INJECTED renderer tag. The component is
 * pure props-in / events-out — it never fetches, never touches Firebase, and
 * **never re-sorts `items`**; the server owns the order.
 *
 * The `renderers` map (cardType → `pop-*` tag) is injected too, so ui-kit depends
 * on no card registry. A cardType missing from the map falls through to the
 * wrapper's fallback face rather than blanking the row.
 */
@Component({
  tag: 'pop-thread-timeline',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-timeline.css',
})
export class PopThreadTimeline {
  @Element() el!: HTMLElement;

  /** Items in SERVER order — oldest first. Never re-sorted here. */
  @Prop() items: ThreadItem[] = [];
  /** The viewing user; drives own-vs-other bubble rendering. */
  @Prop() currentUid = '';
  /** False ⇒ viewer mode: no action buttons, no reply/check-off affordances. */
  @Prop() canParticipate = true;
  /** cardType → `pop-*` renderer tag. Injected; ui-kit holds no registry. */
  @Prop() renderers: Record<string, string> = {};
  /** Shows the top spinner while older items are being fetched. */
  @Prop() loadingOlder = false;

  /** Items appended live over SSE, kept out of `items` so no full re-render. */
  @State() appended: ThreadItem[] = [];

  /** A card action fired from inside an item. */
  @Event({ composed: true, bubbles: true }) popItemAction!: EventEmitter<ThreadItemActionDetail>;
  /** The user wants to reply to an item. */
  @Event({ composed: true, bubbles: true }) popItemReply!: EventEmitter<ThreadItemRefDetail>;
  /** Check-off: open → done → open, or dismissed. */
  @Event({ composed: true, bubbles: true }) popItemStatus!: EventEmitter<ThreadItemStatusDetail>;
  /** Promote a message into a card / task. */
  @Event({ composed: true, bubbles: true }) popItemPromote!: EventEmitter<ThreadItemRefDetail>;
  /** Infinite scroll upward — cursor is the oldest rendered item id. */
  @Event({ composed: true, bubbles: true }) popLoadOlder!: EventEmitter<ThreadLoadOlderDetail>;

  /** Guards the scroll handler so one scroll-to-top fires one request. */
  private olderRequested = false;

  componentDidLoad() {
    // Card actions bubble out of `pop-thread-card`; catch them once at the root
    // and re-emit as `popItemAction` tagged with the owning item's id. Doing it
    // here (rather than per-card) means live-appended cards are covered too.
    this.el.addEventListener('popCardAction', this.onCardAction as EventListener);
  }

  disconnectedCallback() {
    this.el.removeEventListener('popCardAction', this.onCardAction as EventListener);
  }

  private onCardAction = (ev: CustomEvent<{ actionId: string; params?: Record<string, unknown> }>) => {
    const host = (ev.target as HTMLElement | null)?.closest?.('[data-item-id]') as HTMLElement | null;
    const itemId = host?.getAttribute('data-item-id');
    if (!itemId) return;
    // stopImmediatePropagation, not stopPropagation: consumers bind to THIS
    // element, so the raw card event has to be swallowed here or every action
    // would surface twice (once raw, once as popItemAction).
    ev.stopImmediatePropagation();
    this.popItemAction.emit({ itemId, actionId: ev.detail?.actionId, params: ev.detail?.params });
  };

  /** Scroll a given item into view — used by search and back-reference stubs. */
  @Method()
  async scrollToItem(id: string): Promise<void> {
    // Match by attribute VALUE rather than building a selector — item ids come
    // from Firestore and must never have to survive CSS selector escaping.
    const target = Array.from(this.el.querySelectorAll('[data-item-id]')).find(
      (n) => n.getAttribute('data-item-id') === id,
    );
    if (!target) return;
    (target as HTMLElement).classList.add('ttl__item--flash');
    if (typeof (target as HTMLElement).scrollIntoView === 'function') {
      (target as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /** Append a live (SSE) item without asking the host to rebuild `items`. */
  @Method()
  async appendItem(item: ThreadItem): Promise<void> {
    if (!item || typeof item.id !== 'string') return;
    if (this.rows().some((i) => i.id === item.id)) return;
    this.appended = [...this.appended, item];
  }

  /** The rendered list: server items first, then anything appended live. */
  private rows(): ThreadItem[] {
    const base = Array.isArray(this.items) ? this.items : [];
    const seen = new Set(base.map((i) => i?.id));
    // NOTE: no sort. The server's order is the truth.
    return [...base, ...this.appended.filter((i) => i && !seen.has(i.id))];
  }

  private onScroll = (ev: Event) => {
    const box = ev.currentTarget as HTMLElement;
    if (box.scrollTop > LOAD_OLDER_THRESHOLD) {
      this.olderRequested = false;
      return;
    }
    if (this.olderRequested || this.loadingOlder) return;
    this.olderRequested = true;
    this.requestOlder();
  };

  private requestOlder = () => {
    const rows = this.rows();
    this.popLoadOlder.emit({ cursor: rows.length ? rows[0].id : null });
  };

  private label(item: ThreadItem): string {
    if (item.authorKind === 'bot') return 'Bucket';
    if (item.authorKind === 'system') return 'System';
    if (item.authorKind === 'panel') return item.sourcePanel || 'Panel';
    return item.authorUid === this.currentUid ? 'You' : item.authorUid || 'Someone';
  }

  /** A short preview of the item a reply points at, for the back-reference stub. */
  private replyPreview(item: ThreadItem): string {
    const target = this.rows().find((i) => i.id === item.replyToItemId);
    if (!target) return 'earlier in this thread';
    const text = (target.text || target.card?.title || target.cardType || '').trim();
    if (!text) return 'earlier in this thread';
    return text.length > 60 ? `${text.slice(0, 57)}…` : text;
  }

  private renderReplyStub(item: ThreadItem) {
    if (!item.replyToItemId) return null;
    return (
      <button
        type="button"
        class="ttl__replyref"
        title="Jump to the replied-to item"
        onClick={() => this.scrollToItem(item.replyToItemId!)}
      >
        <ion-icon name="return-up-back-outline" aria-hidden="true" />
        <span class="ttl__replyref-text">{this.replyPreview(item)}</span>
      </button>
    );
  }

  private renderAttribution(item: ThreadItem) {
    if (!item.sourcePanel) return null;
    return <span class="ttl__from">from {item.sourcePanel}</span>;
  }

  private renderControls(item: ThreadItem) {
    if (!this.canParticipate) return null;
    const done = item.itemStatus === 'done';
    return (
      <div class="ttl__controls">
        {item.checkable && (
          <button
            type="button"
            class="pop-iconbtn ttl__btn"
            title={done ? 'Reopen' : 'Mark done'}
            aria-label={done ? 'Reopen' : 'Mark done'}
            onClick={() => this.popItemStatus.emit({ itemId: item.id, status: done ? 'open' : 'done' })}
          >
            <ion-icon name={done ? 'refresh-outline' : 'checkmark-outline'} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          class="pop-iconbtn ttl__btn"
          title="Reply"
          aria-label="Reply"
          onClick={() => this.popItemReply.emit({ itemId: item.id })}
        >
          <ion-icon name="arrow-undo-outline" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="pop-iconbtn ttl__btn"
          title="Promote"
          aria-label="Promote"
          onClick={() => this.popItemPromote.emit({ itemId: item.id })}
        >
          <ion-icon name="arrow-up-circle-outline" aria-hidden="true" />
        </button>
      </div>
    );
  }

  /**
   * Resolve the renderer tag for an item: an explicit `item.renderer` wins,
   * otherwise the INJECTED map. A miss yields '' and `pop-thread-card` shows its
   * fallback face rather than a blank row.
   */
  private rendererFor(item: ThreadItem): string {
    return item.renderer || this.renderers?.[item.cardType || ''] || '';
  }

  private renderItem(item: ThreadItem) {
    const own = !!item.authorUid && item.authorUid === this.currentUid;
    const dismissed = item.itemStatus === 'dismissed';
    const done = item.itemStatus === 'done';

    if (dismissed) {
      // Collapsed: one muted line, still addressable by scrollToItem().
      return (
        <article key={item.id} class="ttl__item ttl__item--dismissed" data-item-id={item.id}>
          <ion-icon name="eye-off-outline" aria-hidden="true" />
          <span class="ttl__dismissed-text">Dismissed</span>
        </article>
      );
    }

    return (
      <article
        key={item.id}
        class={{
          ttl__item: true,
          'ttl__item--own': own,
          'ttl__item--other': !own,
          'ttl__item--done': done,
          'ttl__item--card': item.kind === 'card',
        }}
        data-item-id={item.id}
      >
        <div class="ttl__meta">
          <span class="ttl__author">{this.label(item)}</span>
          {this.renderAttribution(item)}
        </div>
        {this.renderReplyStub(item)}
        {item.kind === 'card' ? (
          <pop-thread-card
            class="ttl__card"
            cardType={item.cardType || ''}
            payload={item.card || undefined}
            liveness={item.liveness || 'live'}
            actions={this.canParticipate ? item.actions || [] : []}
            readonly={!this.canParticipate}
            renderer={this.rendererFor(item)}
          />
        ) : (
          <div class="ttl__bubble">{item.text || ''}</div>
        )}
        {this.renderControls(item)}
      </article>
    );
  }

  render() {
    const rows = this.rows();
    return (
      <div class="ttl" onScroll={this.onScroll}>
        {this.loadingOlder ? (
          <div class="ttl__spinner" role="status" aria-live="polite">
            <ion-icon name="hourglass-outline" aria-hidden="true" />
            Loading older…
          </div>
        ) : (
          rows.length > 0 && (
            <button type="button" class="ttl__older" onClick={this.requestOlder}>
              Load older
            </button>
          )
        )}

        {rows.length === 0 && !this.loadingOlder ? (
          <p class="ttl__empty">Nothing here yet.</p>
        ) : (
          rows.map((item) => this.renderItem(item))
        )}
      </div>
    );
  }
}
