import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { PopCommunityChat } from './community-chat';

const NOW = Date.now();

const MESSAGES = JSON.stringify([
  {
    id: 'm1',
    text: "Hey everyone! What's cooking tonight?",
    userId: 'user-alice',
    userDisplayName: 'Alice',
    userPhotoUrl: '',
    createdAt: NOW - 600000,
    replyCount: 2,
    lastReplyText: 'Sounds amazing!',
    lastReplyAt: NOW - 300000,
  },
  {
    id: 'm2',
    text: "I'm making pasta aglio e olio — super simple but delicious 🍝",
    userId: 'user-bob',
    userDisplayName: 'Bob',
    userPhotoUrl: '',
    createdAt: NOW - 480000,
    replyCount: 0,
  },
  {
    id: 'm3',
    text: 'That sounds great! Recipe?',
    userId: 'user-current',
    userDisplayName: 'You',
    userPhotoUrl: '',
    createdAt: NOW - 360000,
    replyCount: 0,
  },
  {
    id: 'm4',
    text: 'Garlic, olive oil, spaghetti, parsley, chili flakes. Done in 20 minutes.',
    userId: 'user-bob',
    userDisplayName: 'Bob',
    userPhotoUrl: '',
    createdAt: NOW - 240000,
    replyCount: 1,
    lastReplyText: 'Adding this to my list!',
    lastReplyAt: NOW - 120000,
  },
]);

const meta: Meta = {
  title: 'Components/Organisms/Chat/pop-community-chat',
  component: 'pop-community-chat',
  tags: ['autodocs'],
  argTypes: {
    mode:        { control: 'select', options: ['channel', 'thread'] },
    defaultSort: { control: 'select', options: ['oldest', 'newest', 'popular'] },
    showFullChatLink: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<PopCommunityChat>;

export const Default: Story = {
  args: {
    channelName: '#general',
    messages: MESSAGES,
    currentUserId: 'user-current',
    defaultSort: 'oldest',
  },
};

export const GuestView: Story = {
  args: {
    channelName: '#general',
    messages: MESSAGES,
    currentUserId: '',
    loginButtonText: 'Login to Chat',
    defaultSort: 'oldest',
  },
};

export const ThreadMode: Story = {
  args: {
    channelName: 'Thread: Recipe?',
    messages: JSON.stringify([
      {
        id: 't1',
        text: "Garlic, olive oil, spaghetti, parsley, chili flakes. Done in 20 minutes.",
        userId: 'user-bob',
        userDisplayName: 'Bob',
        createdAt: NOW - 240000,
        replyCount: 0,
      },
      {
        id: 't2',
        text: 'Adding this to my list!',
        userId: 'user-alice',
        userDisplayName: 'Alice',
        createdAt: NOW - 120000,
        replyCount: 0,
      },
    ]),
    currentUserId: 'user-current',
    mode: 'thread',
  },
};

export const Empty: Story = {
  args: {
    channelName: '#announcements',
    messages: '[]',
    currentUserId: 'user-current',
  },
};

export const WithFullChatLink: Story = {
  args: {
    channelName: '#general',
    messages: MESSAGES,
    currentUserId: 'user-current',
    showFullChatLink: true,
    fullChatLink: '/chat',
    defaultSort: 'oldest',
  },
};

export const SortedByNewest: Story = {
  args: {
    channelName: '#general',
    messages: MESSAGES,
    currentUserId: 'user-current',
    defaultSort: 'newest',
  },
};

export const WithHeaderSlot: Story = {
  render: () => html`
    <pop-community-chat
      channel-name="#recipes"
      messages=${MESSAGES}
      current-user-id="user-current"
      default-sort="oldest"
    >
      <span slot="header-prefix" style="font-size: 18px; margin-right: 4px;">🍳</span>
      <span slot="header-suffix" style="margin-left: auto; font-size: 11px; color: var(--pico-muted-color);">
        42 members online
      </span>
    </pop-community-chat>
  `,
};
