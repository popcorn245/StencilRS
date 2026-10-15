/**
 * Types for `pop-share-sheet` — a GENERIC sharing surface.
 *
 * Nothing in this file (or in the component) knows what a thread is. The sheet
 * shares a `subject` — `{ kind, id, title }` — so the same component can later
 * be pointed at projects, notes and tasks without a rewrite.
 */

/** What is being shared. `kind` is free-form (`thread`, `project`, `note`, …). */
export interface ShareSubject {
  kind: string;
  id: string;
  title: string;
}

/** Access levels the sheet can grant. */
export type AclLevel = 'viewer' | 'participant';

/**
 * One access-control entry.
 *
 * `subjectId` is null for the `public` (link) entry, which has no principal.
 */
export interface AclEntry {
  subjectType: 'user' | 'group' | 'public';
  subjectId: string | null;
  level: AclLevel;
  grantedAt?: number;
}

/** A person the host can resolve — the sheet shows names, never raw uids. */
export interface Member {
  uid: string;
  displayName: string;
  photoURL?: string;
}

/** A named group of people. */
export interface Group {
  id: string;
  name: string;
  memberUids: string[];
}

/** Detail of `popAclChange` — always the FULL replacement array, never a patch. */
export interface AclChangeDetail {
  acl: AclEntry[];
}

/** Detail of `popLinkToggle`. */
export interface LinkToggleDetail {
  enabled: boolean;
}

/** Detail of `popRedactionChange` — shape is owned by the host. */
export interface RedactionChangeDetail {
  redaction: Record<string, unknown>;
}
