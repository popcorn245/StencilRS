import { Component, h, Prop, State, Element, Event, EventEmitter } from '@stencil/core';
import type { AclChangeDetail, AclEntry, Group, Member } from '../share-sheet/share-sheet-types';

/** Above this many posts in a week, binding a channel needs an explicit confirm. */
const NOISE_THRESHOLD = 20;

/** How loudly a thread notifies. NOT a delivery setting — see the mute note. */
export type NotifyLevel = 'all' | 'mentions' | 'muted';

const NOTIFY_LEVELS: { level: NotifyLevel; label: string }[] = [
  { level: 'all', label: 'All' },
  { level: 'mentions', label: 'Mentions' },
  { level: 'muted', label: 'Muted' },
];

/** A channel this thread is currently mirrored to. */
export interface BoundChannel {
  channel: string;
  address: string;
  boundAt?: number;
}

/** A channel the user COULD bind, with the addresses they own on it. */
export interface AvailableChannel {
  channel: string;
  addresses: string[];
}

/** Detail of `popNotifyChange`. */
export interface NotifyChangeDetail {
  level: NotifyLevel;
}

/** Detail of `popChannelToggle`. `force` = the user confirmed past the noise warning. */
export interface ChannelToggleDetail {
  channel: string;
  address: string;
  enabled: boolean;
  force: boolean;
}

/**
 * pop-thread-settings-sheet — the per-thread settings surface.
 *
 * Three sections in one `pop-bottom-sheet`: Notifications, Channels and Sharing
 * (which simply embeds the generic `pop-share-sheet`).
 *
 * Two things this component is deliberately loud about:
 *  1. **Muting is not un-mirroring.** Muting a thread changes NOTIFICATIONS
 *     only; a bound channel keeps delivering every post. The copy says so at
 *     the mute control, because getting this wrong means a "muted" thread that
 *     keeps buzzing the user's phone.
 *  2. **Noisy threads warn before binding.** Past ~20 posts a week, enabling a
 *     channel is a firehose, so the switch asks for an explicit confirm and the
 *     resulting `popChannelToggle` carries `force: true`.
 */
@Component({
  tag: 'pop-thread-settings-sheet',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-settings-sheet.css',
})
export class PopThreadSettingsSheet {
  @Element() el!: HTMLElement;

  @Prop() open = false;
  /** The thread being configured. Title only — no data is fetched here. */
  @Prop() thread!: { id: string; title: string };
  @Prop() notifyLevel: NotifyLevel = 'all';
  /** Channels this thread is already mirrored to. */
  @Prop() channels: BoundChannel[] = [];
  /** Channels the user could bind, with their addresses. */
  @Prop() available: AvailableChannel[] = [];
  /** Posts in the last week — drives the noise warning. */
  @Prop() recentPostCount = 0;
  /** False ⇒ the user may not bind or unbind channels. */
  @Prop() canBind = false;

  // ── pass-throughs to the embedded generic share sheet ──
  @Prop() acl: AclEntry[] = [];
  @Prop() people: Member[] = [];
  @Prop() groups: Group[] = [];
  @Prop() canEdit = false;

  @Event({ composed: true, bubbles: true }) popNotifyChange!: EventEmitter<NotifyChangeDetail>;
  @Event({ composed: true, bubbles: true }) popChannelToggle!: EventEmitter<ChannelToggleDetail>;
  @Event({ composed: true, bubbles: true }) popClose!: EventEmitter<void>;
  /** Re-emitted from the embedded `pop-share-sheet`. */
  @Event({ composed: true, bubbles: true }) popAclChange!: EventEmitter<AclChangeDetail>;

  /** Channel awaiting an explicit "enable anyway" past the noise warning. */
  @State() pendingChannel = '';

  componentDidLoad() {
    // The bottom sheet and the share sheet emit from their own elements; catch
    // both once at the root, stop them there, and re-emit from THIS component so
    // consumers only ever bind to `pop-thread-settings-sheet`.
    this.el.addEventListener('popClose', this.onInnerClose as EventListener);
    this.el.addEventListener('popAclChange', this.onInnerAcl as EventListener);
    this.el.addEventListener('popChange', this.onSwitchChange as EventListener);
  }

  disconnectedCallback() {
    this.el.removeEventListener('popClose', this.onInnerClose as EventListener);
    this.el.removeEventListener('popAclChange', this.onInnerAcl as EventListener);
    this.el.removeEventListener('popChange', this.onSwitchChange as EventListener);
  }

  /**
   * Channel switches are caught at the root and mapped back to their row via
   * `data-channel`, so the Link switch inside the embedded share sheet (which has
   * no `data-channel` ancestor) is ignored rather than mistaken for a channel.
   */
  private onSwitchChange = (ev: CustomEvent<boolean>) => {
    const row = (ev.target as HTMLElement | null)?.closest?.('[data-channel]') as HTMLElement | null;
    const channel = row?.getAttribute('data-channel');
    if (!channel) return;
    const entry = (this.available || []).find((c) => c && c.channel === channel);
    if (!entry) return;
    ev.stopImmediatePropagation();
    this.onChannelToggle(entry, !!ev.detail);
  };

  // stopImmediatePropagation (not stopPropagation): consumers bind their
  // listeners to THIS element too, so the raw inner event has to be swallowed
  // before it reaches them or every close/acl change would fire twice.
  private onInnerClose = (ev: Event) => {
    if (ev.target === this.el) return; // our own re-emit — do not loop
    ev.stopImmediatePropagation();
    this.popClose.emit();
  };

  private onInnerAcl = (ev: CustomEvent<AclChangeDetail>) => {
    if (ev.target === this.el) return; // our own re-emit — do not loop
    ev.stopImmediatePropagation();
    this.popAclChange.emit(ev.detail);
  };

  private isBound(channel: string): BoundChannel | undefined {
    return (this.channels || []).find((c) => c && c.channel === channel);
  }

  private addressFor(entry: AvailableChannel): string {
    return this.isBound(entry.channel)?.address || entry.addresses?.[0] || '';
  }

  private noisy(): boolean {
    return this.recentPostCount > NOISE_THRESHOLD;
  }

  private onChannelToggle(entry: AvailableChannel, enabling: boolean) {
    if (!this.canBind) return;
    // Enabling a channel on a firehose thread needs a deliberate second tap.
    if (enabling && this.noisy() && this.pendingChannel !== entry.channel) {
      this.pendingChannel = entry.channel;
      return;
    }
    const force = enabling && this.pendingChannel === entry.channel;
    this.pendingChannel = '';
    this.popChannelToggle.emit({
      channel: entry.channel,
      address: this.addressFor(entry),
      enabled: enabling,
      force,
    });
  }

  private renderNotifications() {
    return (
      <section class="tss__section">
        <h3 class="tss__heading">Notifications</h3>
        <div class="tss__seg" role="group" aria-label="Notification level">
          {NOTIFY_LEVELS.map(({ level, label }) => (
            <button
              key={level}
              type="button"
              class={{ tss__segbtn: true, 'tss__segbtn--on': this.notifyLevel === level }}
              aria-pressed={this.notifyLevel === level ? 'true' : 'false'}
              onClick={() => this.popNotifyChange.emit({ level })}
            >
              {label}
            </button>
          ))}
        </div>
        <p class="tss__note">
          Muting stops notifications only — it does NOT stop channel mirroring. A bound
          channel keeps delivering every post.
        </p>
      </section>
    );
  }

  private renderChannels() {
    const entries = (this.available || []).filter((c) => c && c.channel);
    return (
      <section class="tss__section">
        <h3 class="tss__heading">Channels</h3>
        {entries.length === 0 && <p class="tss__empty">No channels available to bind.</p>}
        {entries.map((entry) => {
          const bound = this.isBound(entry.channel);
          const address = this.addressFor(entry);
          const warn = this.noisy() && !bound;
          const pending = this.pendingChannel === entry.channel;
          return (
            <div key={entry.channel} class="tss__channel" data-channel={entry.channel}>
              <div class="tss__rowline">
                <div class="tss__chan-labels">
                  <span class="tss__chan">{entry.channel}</span>
                  <span class="tss__addr">{address || 'no address'}</span>
                </div>
                <pop-switch
                  checked={!!bound}
                  disabled={!this.canBind}
                  label={`Mirror to ${entry.channel}`}
                />
              </div>
              {warn && this.canBind && (
                <p class="tss__warn">
                  This thread got {this.recentPostCount} posts this week. Enabling{' '}
                  {entry.channel} means all of them go to your phone.
                </p>
              )}
              {pending && (
                <div class="tss__confirm">
                  <button
                    type="button"
                    class="tss__confirm-btn"
                    onClick={() => this.onChannelToggle(entry, true)}
                  >
                    Enable anyway
                  </button>
                  <button
                    type="button"
                    class="tss__cancel-btn"
                    onClick={() => (this.pendingChannel = '')}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
  }

  render() {
    return (
      <pop-bottom-sheet
        open={this.open}
        sheetTitle={this.thread?.title ? `${this.thread.title} · settings` : 'Thread settings'}
      >
        <div class="tss">
          {this.renderNotifications()}
          {this.renderChannels()}
          <section class="tss__section">
            <h3 class="tss__heading">Sharing</h3>
            <pop-share-sheet
              subject={{
                kind: 'thread',
                id: this.thread?.id || '',
                title: this.thread?.title || '',
              }}
              acl={this.acl}
              people={this.people}
              groups={this.groups}
              canEdit={this.canEdit}
            />
          </section>
        </div>
      </pop-bottom-sheet>
    );
  }
}
