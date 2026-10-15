import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';

export interface ValheimShopTier {
  name: string;
  /** Flavor line, e.g. "Unlocked by felling Bonemass". */
  tag?: string;
}

export interface ValheimShopWare {
  name: string;
  desc?: string;
  price?: number;
  locked?: boolean;
  /** For locked rows: what unlocks it, e.g. "After Moder". */
  lockNote?: string;
}

export interface ValheimShopProposalLine {
  kind: 'add' | 'raise' | 'unlock';
  text: string;
  value?: string;
}

export interface ValheimShopProposal {
  title?: string;
  subtitle?: string;
  lines: ValheimShopProposalLine[];
  note?: string;
}

export type ValheimShopActionKind = 'approve' | 'tweak';

/**
 * `valheim-shop` — the curated-economy block of the Valheim raid-league
 * surfaces: current tier, Haldor's stock (locked rows show their unlock gate),
 * and the bot's weekly stock/unlock PROPOSAL awaiting the Jarl's word.
 * Theme-agnostic via the `--vlh-*` token layer.
 *
 * Admin approve/tweak render only when `isAdmin`; the component emits
 * `valheimShopAction` and the host performs the real action (a
 * `valheimCommands` outbox write the valheim-agent applies to the
 * TradersExtended/WAP configs).
 */
@Component({
  tag: 'valheim-shop',
  encapsulation: { type: 'scoped' },
  styleUrls: ['../valheim-base.css', 'valheim-shop.css'],
})
export class ValheimShop {
  /** JSON ValheimShopTier ('' = no tier yet). */
  @Prop() tier = '';
  /** JSON array of ValheimShopWare. */
  @Prop() items = '[]';
  /** JSON ValheimShopProposal ('' = no pending proposal). */
  @Prop() proposal = '';
  /** Admin surfaces get the approve/tweak actions on the proposal. */
  @Prop() isAdmin = false;
  @Prop() heading = "Haldor's shop";

  /** Approve/tweak tapped — the HOST performs it. */
  @Event() valheimShopAction!: EventEmitter<{ action: ValheimShopActionKind }>;

  private parse<T>(raw: string, fallback: T): T {
    if (!raw) return fallback;
    try {
      const v = JSON.parse(raw);
      return (v ?? fallback) as T;
    } catch {
      return fallback;
    }
  }

  private fmt(n?: number): string {
    return Number.isFinite(n) ? (n as number).toLocaleString('en-US') : '';
  }

  private renderWare(w: ValheimShopWare) {
    return (
      <div class={{ 'vsh-item': true, 'vsh-item--locked': !!w.locked }}>
        <div class="vsh-ic">
          <pop-icon name={w.locked ? 'lock-closed-outline' : 'pricetag-outline'} />
        </div>
        <div class="vsh-name">
          {w.name}
          {w.desc && <span class="vsh-desc"> — {w.desc}</span>}
        </div>
        {w.locked ? (
          <span class="vsh-lock">{w.lockNote || 'Locked'}</span>
        ) : (
          w.price != null && (
            <span class="vsh-price">
              {this.fmt(w.price)}
              <span class="vlh-cn">⬤</span>
            </span>
          )
        )}
      </div>
    );
  }

  private renderProposal(p: ValheimShopProposal | null) {
    if (!p || !p.lines?.length) return null;
    const iconFor = { add: 'add-circle-outline', raise: 'trending-up-outline', unlock: 'key-outline' } as const;
    return (
      <div class="vsh-proposal">
        <div class="vsh-pr-h">
          <div class="vsh-pr-bot">
            <pop-icon name="sparkles-outline" />
          </div>
          <div class="vsh-pr-t">
            {p.title || "Bot proposes next week's shop"}
            {p.subtitle && <small>{p.subtitle}</small>}
          </div>
        </div>
        {p.lines.map((line) => (
          <div class="vsh-pr-line">
            <pop-icon class={`vsh-pr-ic--${line.kind}`} name={iconFor[line.kind] ?? 'ellipse-outline'} />
            <span class="vsh-pr-text">{line.text}</span>
            {line.value && <span class="vsh-pr-val">{line.value}</span>}
          </div>
        ))}
        {this.isAdmin && (
          <div class="vsh-pr-actions">
            <button class="vlh-btn vlh-btn--primary" onClick={() => this.valheimShopAction.emit({ action: 'approve' })}>
              <pop-icon name="checkmark-circle-outline" /> Approve
            </button>
            <button class="vlh-btn" onClick={() => this.valheimShopAction.emit({ action: 'tweak' })}>
              <pop-icon name="create-outline" /> Tweak
            </button>
          </div>
        )}
        <div class="vsh-pr-note">{p.note || "Awaiting the Jarl's word · players are notified once approved."}</div>
      </div>
    );
  }

  render() {
    const tier = this.parse<ValheimShopTier | null>(this.tier, null);
    const items = this.parse<ValheimShopWare[]>(this.items, []);
    const proposal = this.parse<ValheimShopProposal | null>(this.proposal, null);
    const inStock = items.filter((w) => !w.locked);
    return (
      <section class="vlh-block valheim-shop">
        <div class="vlh-block-h">
          <div class="vlh-ic">
            <pop-icon name="cash-outline" />
          </div>
          <div class="vlh-grow">
            <h3>{this.heading}</h3>
          </div>
          {inStock.length > 0 && <span class="vlh-count">{inStock.length} wares</span>}
        </div>
        {tier && (
          <div class="vsh-tier">
            <pop-icon class="vsh-tier-ic" name="ribbon-outline" />
            <div>
              <div class="vsh-tier-name">Current tier: {tier.name}</div>
              {tier.tag && <div class="vsh-tier-tag">{tier.tag}</div>}
            </div>
          </div>
        )}
        {items.length ? (
          [<div class="vlh-group-head">In stock</div>, <div>{items.map((w) => this.renderWare(w))}</div>]
        ) : (
          <div class="vsh-empty">Haldor's cart is empty — the merchant awaits the first unlock.</div>
        )}
        {this.renderProposal(proposal)}
      </section>
    );
  }
}
