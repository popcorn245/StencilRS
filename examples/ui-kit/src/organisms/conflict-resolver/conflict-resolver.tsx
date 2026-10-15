import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

export type ConflictResolution = 'keep_local' | 'use_remote';

@Component({
  tag: 'pop-conflict-resolver',
  encapsulation: { type: 'scoped' },
  styleUrl: 'conflict-resolver.css',
})
export class PopConflictResolver {
  /** JSON string of the local version of the document */
  @Prop() local: string = '{}';

  /** JSON string of the remote version of the document */
  @Prop() remote: string = '{}';

  /** Human-readable label for the document (e.g. "Note · abc123…") */
  @Prop() label: string = 'Document';

  /** Emitted when user picks keep_local or use_remote */
  @Event({ composed: true, bubbles: true }) resolve: EventEmitter<ConflictResolution>;

  /** Emitted when user dismisses without resolving */
  @Event({ composed: true, bubbles: true }) dismissConflict: EventEmitter<void>;

  private get localObj(): Record<string, any> {
    try { return JSON.parse(this.local); } catch { return {}; }
  }

  private get remoteObj(): Record<string, any> {
    try { return JSON.parse(this.remote); } catch { return {}; }
  }

  /** Returns keys that differ between local and remote */
  private get diffKeys(): string[] {
    const l = this.localObj;
    const r = this.remoteObj;
    const allKeys = new Set([...Object.keys(l), ...Object.keys(r)]);
    // Ignore internal sync fields
    const ignore = new Set(['_syncedAt', '_localId', 'id']);
    return [...allKeys].filter((k) => !ignore.has(k) && JSON.stringify(l[k]) !== JSON.stringify(r[k]));
  }

  private renderValue(val: any): string {
    if (val === undefined) return '(missing)';
    if (val === null) return '(null)';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  render() {
    const diff = this.diffKeys;
    const local = this.localObj;
    const remote = this.remoteObj;

    return (
      <div class="cr-root">
        <div class="cr-header">
          <span class="cr-icon">⚡</span>
          <div>
            <div class="cr-title">Sync conflict</div>
            <div class="cr-label">{this.label}</div>
          </div>
          <button class="cr-dismiss" type="button" onClick={() => this.dismissConflict.emit()} title="Dismiss">✕</button>
        </div>

        {diff.length === 0 ? (
          <p class="cr-no-diff">No visible differences found.</p>
        ) : (
          <div class="cr-diff">
            <div class="cr-diff-header">
              <span></span>
              <span class="cr-col-label cr-mine">Mine</span>
              <span class="cr-col-label cr-incoming">Incoming</span>
            </div>
            {diff.map((key) => (
              <div class="cr-diff-row" key={key}>
                <span class="cr-field">{key}</span>
                <span class="cr-val cr-val--local">{this.renderValue(local[key])}</span>
                <span class="cr-val cr-val--remote">{this.renderValue(remote[key])}</span>
              </div>
            ))}
          </div>
        )}

        <div class="cr-actions">
          <button
            class="cr-btn cr-btn--local"
            type="button"
            onClick={() => this.resolve.emit('keep_local')}
          >
            Keep mine
          </button>
          <button
            class="cr-btn cr-btn--remote"
            type="button"
            onClick={() => this.resolve.emit('use_remote')}
          >
            Use incoming
          </button>
        </div>
      </div>
    );
  }
}
