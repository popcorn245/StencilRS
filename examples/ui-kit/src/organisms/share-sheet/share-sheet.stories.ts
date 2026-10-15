import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { AclEntry, Group, Member, ShareSubject } from './share-sheet-types';

const meta: Meta = {
  title: 'Organisms/ShareSheet',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A GENERIC sharing surface: it shares a `subject` (`{ kind, id, title }`) with ' +
          'people and groups, and knows nothing about any specific domain — the same ' +
          'component is meant to serve projects, notes and tasks later. Every mutation ' +
          'emits `popAclChange` with the FULL replacement array, never a patch. The Link ' +
          'section is Phase 2 and renders disabled so the layout will not shift.',
      },
    },
  },
};
export default meta;

const subject: ShareSubject = { kind: 'thread', id: 't-kitchen', title: 'Kitchen remodel' };

const people: Member[] = [
  { uid: 'u-kat', displayName: 'Kat' },
  { uid: 'u-bobby', displayName: 'Bobby' },
  { uid: 'u-mia', displayName: 'Mia' },
  { uid: 'u-leo', displayName: 'Leo' },
];

const groups: Group[] = [
  { id: 'g-house', name: 'Household', memberUids: ['u-kat', 'u-bobby', 'u-mia'] },
  { id: 'g-kids', name: 'Kids', memberUids: ['u-mia', 'u-leo'] },
];

const acl: AclEntry[] = [
  { subjectType: 'user', subjectId: 'u-kat', level: 'participant', grantedAt: Date.now() },
  { subjectType: 'user', subjectId: 'u-bobby', level: 'viewer', grantedAt: Date.now() },
];

interface SheetOpts {
  acl?: AclEntry[];
  groups?: Group[];
  canEdit?: boolean;
  linkEnabled?: boolean;
  linkUrl?: string;
}

function sheet(opts: SheetOpts = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width: 420px;';
  const el = document.createElement('pop-share-sheet') as unknown as HTMLElement & Record<string, unknown>;
  el.subject = subject;
  el.acl = opts.acl ?? acl;
  el.people = people;
  el.groups = opts.groups ?? groups;
  el.canEdit = opts.canEdit ?? true;
  el.linkEnabled = opts.linkEnabled ?? false;
  el.linkUrl = opts.linkUrl ?? '';
  wrap.appendChild(el);
  return wrap;
}

export const Owner: StoryObj = {
  name: 'Owner — editable',
  render: () => sheet(),
};

export const Participant: StoryObj = {
  name: 'Participant — read-only',
  render: () => sheet({ canEdit: false }),
};

export const Viewer: StoryObj = {
  name: 'Viewer — read-only, viewer-level only',
  render: () =>
    sheet({
      canEdit: false,
      acl: [{ subjectType: 'user', subjectId: 'u-kat', level: 'viewer' }],
    }),
};

export const WithGroups: StoryObj = {
  name: 'With groups',
  render: () =>
    sheet({
      acl: [
        ...acl,
        { subjectType: 'group', subjectId: 'g-house', level: 'participant' },
        { subjectType: 'group', subjectId: 'g-kids', level: 'viewer' },
      ],
    }),
};

export const DeletedGroup: StoryObj = {
  name: 'Deleted group — stays until removed',
  render: () =>
    sheet({
      acl: [
        ...acl,
        { subjectType: 'group', subjectId: 'g-house', level: 'participant' },
        { subjectType: 'group', subjectId: 'g-gone', level: 'viewer' },
      ],
    }),
};

export const LinkDisabled: StoryObj = {
  name: 'Link section — disabled, Coming soon',
  render: () => sheet({ linkUrl: 'https://bot.popcorn245.com/s/abc123' }),
};
