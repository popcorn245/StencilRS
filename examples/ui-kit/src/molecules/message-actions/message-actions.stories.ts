import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/MessageActions',
  parameters: {
    docs: {
      description: {
        component:
          'Hover action buttons for chat messages: thread, edit, and delete. Shows/hides buttons based on ownership and admin status.',
      },
    },
  },
};

export default meta;

export const OwnMessage: StoryObj = {
  name: 'Own Message',
  render: () => `
    <div style="padding: 2rem; background: var(--pico-background-color); position: relative; min-height: 60px;">
      <pop-message-actions message-id="msg1" is-own="true" thread-count="0"></pop-message-actions>
    </div>
  `,
};

export const OtherMessage: StoryObj = {
  name: 'Other Message',
  render: () => `
    <div style="padding: 2rem; background: var(--pico-background-color); position: relative; min-height: 60px;">
      <pop-message-actions message-id="msg2" thread-count="3"></pop-message-actions>
    </div>
  `,
};

export const AdminView: StoryObj = {
  name: 'Admin View',
  render: () => `
    <div style="padding: 2rem; background: var(--pico-background-color); position: relative; min-height: 60px;">
      <pop-message-actions message-id="msg3" is-admin="true" thread-count="1"></pop-message-actions>
    </div>
  `,
};

export const InThread: StoryObj = {
  name: 'In Thread (no thread button)',
  render: () => `
    <div style="padding: 2rem; background: var(--pico-background-color); position: relative; min-height: 60px;">
      <pop-message-actions message-id="msg4" is-own="true" is-thread="true"></pop-message-actions>
    </div>
  `,
};
