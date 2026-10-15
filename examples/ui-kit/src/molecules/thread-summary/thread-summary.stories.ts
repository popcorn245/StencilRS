import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/ThreadSummary',
  parameters: {
    docs: {
      description: {
        component:
          'Displays a thread summary indicator below a message, showing the last reply preview and avatar. Emits `popThreadOpened` on click.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default',
  render: () => `
    <div style="padding: 2rem; background: var(--pico-background-color); position: relative; padding-left: 40px;">
      <pop-thread-summary
        message-id="msg1"
        thread-count="3"
        thread-preview="Sounds good, let me check."
        thread-avatar-url="https://i.pravatar.cc/28?u=user1"
        thread-last-at="${Date.now() - 300000}"
      ></pop-thread-summary>
    </div>
  `,
};

export const NoAvatar: StoryObj = {
  name: 'No Avatar',
  render: () => `
    <div style="padding: 2rem; background: var(--pico-background-color); position: relative; padding-left: 40px;">
      <pop-thread-summary
        message-id="msg2"
        thread-count="1"
        thread-preview="Thread reply..."
        thread-last-at="${Date.now() - 7200000}"
      ></pop-thread-summary>
    </div>
  `,
};

export const OldThread: StoryObj = {
  name: 'Old Thread',
  render: () => `
    <div style="padding: 2rem; background: var(--pico-background-color); position: relative; padding-left: 40px;">
      <pop-thread-summary
        message-id="msg3"
        thread-count="12"
        thread-preview="We finished the design review."
        thread-avatar-url="https://i.pravatar.cc/28?u=user2"
        thread-last-at="${Date.now() - 259200000}"
      ></pop-thread-summary>
    </div>
  `,
};
