import { Component, h, Prop, State, Event, EventEmitter } from '@stencil/core';
import type {
  AclChangeDetail,
  AclEntry,
  AclLevel,
  Group,
  LinkToggleDetail,
  Member,
  RedactionChangeDetail,
  ShareSubject,
} from './share-sheet-types';

const LEVELS: AclLevel[] = ['viewer', 'participant'];

/**
 * pop-share-sheet — a GENERIC sharing surface.
 *
 * Deliberately domain-free: it shares a `subject` (`{ kind, id, title }`) with
 * people and groups. Nothing in here knows the word "thread" — the same
 * component is meant to serve projects, notes and tasks later.
 *
 * The sheet is STATELESS with respect to the ACL: every mutation emits
 * `popAclChange` with a **full replacement array**, never a patch, and waits for
 * the host to feed the new `acl` back down. That makes the host the single
 * writer and keeps optimistic-UI drift impossible.
 *
 * The Link section is Phase 2. It renders DISABLED with a "Coming soon" badge in
 * V1 on purpose, so the layout does not shift when it lands.
 */
@Component({
  tag: 'pop-share-sheet',
  encapsulation: { type: 'scoped' },
  styleUrl: 'share-sheet.css',
})
export class PopShareSheet {
  /** What is being shared. Free-form `kind` — this component stays domain-free. */
  @Prop() subject?: ShareSubject;
  /** The current access-control list. */
  @Prop() acl: AclEntry[] = [];
  /** People the host can resolve, for names and the add-person picker. */
  @Prop() people: Member[] = [];
  /** Groups the host can resolve. An acl group missing here renders as deleted. */
  @Prop() groups: Group[] = [];
  /** False ⇒ the whole sheet is read-only. */
  @Prop() canEdit = false;
  /** Phase 2 — public link. Rendered disabled in V1. */
  @Prop() linkEnabled = false;
  /** Phase 2 — the public link URL. */
  @Prop() linkUrl = '';
  /** Host-owned redaction settings, passed through untouched. */
  @Prop() redaction?: Record<string, unknown>;

  /** The FULL replacement acl. Never a patch. */
  @Event({ composed: true, bubbles: true }) popAclChange!: EventEmitter<AclChangeDetail>;
  /** Phase 2 — emitted when the public link switch flips. */
  @Event({ composed: true, bubbles: true }) popLinkToggle!: EventEmitter<LinkToggleDetail>;
  /** Emitted when the host-owned redaction settings change. */
  @Event({ composed: true, bubbles: true }) popRedactionChange!: EventEmitter<RedactionChangeDetail>;

  /** Which group rows have their member list expanded (view-only UI state). */
  @State() expanded: string[] = [];
  /** Selection of the add-person picker (view-only UI state). */
  @State() pendingUid = '';

  private entries(): AclEntry[] {
    return Array.isArray(this.acl) ? this.acl.filter((e) => e && e.subjectType) : [];
  }

  private emit(next: AclEntry[]) {
    this.popAclChange.emit({ acl: next });
  }

  private setLevel(entry: AclEntry, level: AclLevel) {
    if (!this.canEdit || entry.level === level) return;
    this.emit(this.entries().map((e) => (e === entry ? { ...e, level } : e)));
  }

  private remove(entry: AclEntry) {
    if (!this.canEdit) return;
    this.emit(this.entries().filter((e) => e !== entry));
  }

  private addPerson = () => {
    const uid = this.pendingUid;
    if (!this.canEdit || !uid) return;
    this.pendingUid = '';
    this.emit([
      ...this.entries(),
      { subjectType: 'user', subjectId: uid, level: 'viewer', grantedAt: Date.now() },
    ]);
  };

  private toggleExpanded(groupId: string) {
    this.expanded = this.expanded.includes(groupId)
      ? this.expanded.filter((id) => id !== groupId)
      : [...this.expanded, groupId];
  }

  private personName(uid: string | null): string {
    const found = (this.people || []).find((p) => p && p.uid === uid);
    return found?.displayName || 'Unknown person';
  }

  private renderLevel(entry: AclEntry) {
    return (
      <div class="shs__seg" role="group" aria-label="Access level">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            class={{ shs__segbtn: true, 'shs__segbtn--on': entry.level === level }}
            disabled={!this.canEdit}
            aria-pressed={entry.level === level ? 'true' : 'false'}
            onClick={() => this.setLevel(entry, level)}
          >
            {level === 'viewer' ? 'Viewer' : 'Participant'}
          </button>
        ))}
      </div>
    );
  }

  private renderRemove(entry: AclEntry, what: string) {
    if (!this.canEdit) return null;
    return (
      <button
        type="button"
        class="pop-iconbtn shs__btn"
        title={`Remove ${what}`}
        aria-label={`Remove ${what}`}
        onClick={() => this.remove(entry)}
      >
        <ion-icon name="close-outline" aria-hidden="true" />
      </button>
    );
  }

  private renderPeople() {
    const rows = this.entries().filter((e) => e.subjectType === 'user');
    const takenUids = new Set(rows.map((e) => e.subjectId));
    const addable = (this.people || []).filter((p) => p && !takenUids.has(p.uid));

    return (
      <section class="shs__section">
        <h3 class="shs__heading">People</h3>
        {rows.length === 0 && <p class="shs__empty">Nobody else has access yet.</p>}
        {rows.map((entry) => (
          <div key={`u:${entry.subjectId}`} class="shs__row">
            <span class="shs__name">{this.personName(entry.subjectId)}</span>
            {this.renderLevel(entry)}
            {this.renderRemove(entry, this.personName(entry.subjectId))}
          </div>
        ))}

        {this.canEdit && addable.length > 0 && (
          <div class="shs__add">
            <select
              class="shs__picker"
              aria-label="Add a person"
              onChange={(ev) => (this.pendingUid = (ev.target as HTMLSelectElement).value)}
            >
              <option value="">Add a person…</option>
              {addable.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.displayName}
                </option>
              ))}
            </select>
            <button
              type="button"
              class={{ 'shs__add-btn': true, 'shs__add-btn--off': !this.pendingUid }}
              aria-disabled={this.pendingUid ? 'false' : 'true'}
              onClick={this.addPerson}
            >
              Add
            </button>
          </div>
        )}
      </section>
    );
  }

  private renderGroups() {
    const rows = this.entries().filter((e) => e.subjectType === 'group');
    if (rows.length === 0) return null;

    return (
      <section class="shs__section">
        <h3 class="shs__heading">Groups</h3>
        {rows.map((entry) => {
          const group = (this.groups || []).find((g) => g && g.id === entry.subjectId);
          const open = this.expanded.includes(entry.subjectId || '');
          const members = group?.memberUids || [];
          return (
            <div key={`g:${entry.subjectId}`} class={{ shs__row: true, 'shs__row--stack': true }}>
              <div class="shs__rowline">
                <span class={{ shs__name: true, 'shs__name--gone': !group }}>
                  {group ? group.name : 'deleted group'}
                </span>
                {group && <span class="shs__count">{members.length}</span>}
                {group && (
                  <button
                    type="button"
                    class="pop-iconbtn shs__btn"
                    title={open ? 'Hide members' : 'Show members'}
                    aria-label={open ? 'Hide members' : 'Show members'}
                    aria-expanded={open ? 'true' : 'false'}
                    onClick={() => this.toggleExpanded(entry.subjectId || '')}
                  >
                    <ion-icon name={open ? 'chevron-up-outline' : 'chevron-down-outline'} aria-hidden="true" />
                  </button>
                )}
                {this.renderLevel(entry)}
                {this.renderRemove(entry, group ? group.name : 'deleted group')}
              </div>
              {open && (
                <ul class="shs__members">
                  {members.map((uid) => (
                    <li key={uid}>{this.personName(uid)}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    );
  }

  private renderLink() {
    // Phase 2. Rendered now — disabled, with a "Coming soon" badge — so the
    // layout does not shift when public links actually ship.
    return (
      <section class="shs__section shs__section--soon">
        <h3 class="shs__heading">
          Link
          <span class="shs__soon">Coming soon</span>
        </h3>
        <div class="shs__row">
          <span class="shs__name">Anyone with the link can view</span>
          <pop-switch checked={this.linkEnabled} disabled label="Anyone with the link can view" />
        </div>
        {this.linkUrl && <p class="shs__url">{this.linkUrl}</p>}
      </section>
    );
  }

  render() {
    const title = this.subject?.title || '';
    return (
      <div class={{ shs: true, 'shs--readonly': !this.canEdit }}>
        <header class="shs__head">
          <span class="shs__subject">{title}</span>
          {this.subject?.kind && <span class="shs__kind">{this.subject.kind}</span>}
        </header>
        {!this.canEdit && <p class="shs__note">You can see who has access, but not change it.</p>}
        {this.renderPeople()}
        {this.renderGroups()}
        {this.renderLink()}
      </div>
    );
  }
}
