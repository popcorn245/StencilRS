import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { AvailableChannel, BoundChannel, NotifyLevel } from './thread-settings-sheet';
import type { AclEntry, Group, Member } from '../share-sheet/share-sheet-types';

const meta: Meta = {
  title: 'Organisms/ThreadSettingsSheet',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Per-thread settings in a `pop-bottom-sheet`: Notifications, Channels and ' +
          'Sharing (which embeds the generic `pop-share-sheet`). Two safety rails are ' +
          'baked into the copy: muting is a NOTIFICATION setting and does not stop ' +
          'channel mirroring, and a thread with more than 20 posts this week asks for ' +
          'an explicit confirm before a channel is bound.',
      },
    },
  },
};
export default meta;

const thread = { id: 't-kitchen', title: 'Kitchen remodel' };

const available: AvailableChannel[] = [
  { channel: 'signal', addresses: ['+13203652454'] },
  { channel: 'email', addresses: ['popcorn245@gmail.com'] },
];

const people: Member[] = [
  { uid: 'u-kat', displayName: 'Kat' },
  { uid: 'u-bobby', displayName: 'Bobby' },
  { uid: 'u-mia', displayName: 'Mia' },
];

const groups: Group[] = [{ id: 'g-house', name: 'Household', memberUids: ['u-kat', 'u-bobby'] }];

const acl: AclEntry[] = [
  { subjectType: 'user', subjectId: 'u-kat', level: 'participant' },
  { subjectType: 'user', subjectId: 'u-bobby', level: 'viewer' },
];

interface SheetOpts {
  notifyLevel?: NotifyLevel;
  channels?: BoundChannel[];
  recentPostCount?: number;
  canBind?: boolean;
  canEdit?: boolean;
}

function sheet(opts: SheetOpts = {}): HTMLElement {
  const el = document.createElement('pop-thread-settings-sheet') as unknown as HTMLElement &
    Record<string, unknown>;
  el.open = true;
  el.thread = thread;
  el.notifyLevel = opts.notifyLevel ?? 'all';
  el.channels = opts.channels ?? [];
  el.available = available;
  el.recentPostCount = opts.recentPostCount ?? 4;
  el.canBind = opts.canBind ?? true;
  el.acl = acl;
  el.people = people;
  el.groups = groups;
  el.canEdit = opts.canEdit ?? true;
  return el;
}

export const Default: StoryObj = {
  name: 'Default',
  render: () => sheet(),
};

export const MutedWithBoundChannel: StoryObj = {
  name: 'Muted with a bound channel — mirroring keeps running',
  render: () =>
    sheet({
      notifyLevel: 'muted',
      channels: [{ channel: 'signal', address: '+13203652454', boundAt: Date.now() }],
    }),
};

export const NoisyThread: StoryObj = {
  name: 'Noisy thread — binding warning visible',
  render: () => sheet({ recentPostCount: 143 }),
};

export const Viewer: StoryObj = {
  name: 'Viewer — canBind=false',
  render: () => sheet({ canBind: false, canEdit: false, recentPostCount: 143 }),
};
