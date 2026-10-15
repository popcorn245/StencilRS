import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { PopMessageBubble } from './message-bubble';

const meta: Meta = {
  title: 'Components/Organisms/Chat/pop-message-bubble',
  component: 'pop-message-bubble',
  tags: ['autodocs'],
  argTypes: {
    role:           { control: 'select', options: ['user', 'assistant', 'member'] },
    layout:         { control: 'select', options: ['bubble', 'prose'] },
    streamingMode:  { control: 'select', options: ['inline', 'dots'] },
    content:        { control: 'text' },
    streaming:      { control: 'boolean' },
    isOwn:          { control: 'boolean' },
    isAdmin:        { control: 'boolean' },
    showCopyButton: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<PopMessageBubble>;

const MARKDOWN_CONTENT = `## Hello from the assistant

Here's some formatted content:
- **Bold** and *italic* text
- \`inline code\`

\`\`\`js
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

> A blockquote for good measure.`;

export const UserBubble: Story = {
  args: {
    role: 'user',
    content: 'What should we do this weekend?',
    layout: 'bubble',
    avatarInitials: 'JP',
    isOwn: true,
  },
};

export const AssistantBubble: Story = {
  args: {
    role: 'assistant',
    content: MARKDOWN_CONTENT,
    layout: 'bubble',
    userName: 'Popcorn AI',
    avatarInitials: 'P',
    showCopyButton: true,
  },
};

export const AssistantProse: Story = {
  args: {
    role: 'assistant',
    content: MARKDOWN_CONTENT,
    layout: 'prose',
    userName: 'Popcorn AI',
    showCopyButton: true,
  },
};

export const Streaming: Story = {
  args: {
    role: 'assistant',
    content: 'Thinking about your question',
    layout: 'bubble',
    streaming: true,
    streamingMode: 'inline',
    userName: 'Popcorn AI',
  },
};

export const StreamingDots: Story = {
  args: {
    role: 'assistant',
    content: '',
    layout: 'bubble',
    streaming: true,
    streamingMode: 'dots',
    userName: 'Popcorn AI',
  },
};

export const MemberMessage: Story = {
  args: {
    role: 'member',
    content: 'Hey everyone, what are we doing this weekend?',
    layout: 'bubble',
    userName: 'Alice',
    avatarInitials: 'AL',
    timestamp: Date.now() - 120000,
  },
};

export const MemberWithThread: Story = {
  args: {
    role: 'member',
    content: 'Check out this recipe I found!',
    layout: 'bubble',
    userName: 'Bob',
    avatarInitials: 'BO',
    timestamp: Date.now() - 300000,
    threadCount: 3,
    threadPreview: 'Looks delicious!',
  },
};

export const WithIntents: Story = {
  args: {
    role: 'assistant',
    content: "I've identified some actions from our conversation.",
    layout: 'bubble',
    userName: 'Popcorn AI',
    intents: JSON.stringify([
      { label: 'Schedule dentist appointment', type: 'event' },
      { label: 'Buy groceries', type: 'task' },
    ]),
  },
};

export const Conversation: Story = {
  render: () => html`
    <div style="display:flex; flex-direction:column; gap:8px; padding:16px; max-width:600px;">
      <pop-message-bubble
        role="user"
        content="What's a good recipe for pasta?"
        layout="bubble"
        avatar-initials="JP"
        is-own="true"
      ></pop-message-bubble>
      <pop-message-bubble
        role="assistant"
        content="Here's a simple **aglio e olio**: garlic, olive oil, pasta, and parsley. Ready in 15 minutes!"
        layout="bubble"
        user-name="Popcorn AI"
        avatar-initials="P"
        show-copy-button="true"
      ></pop-message-bubble>
      <pop-message-bubble
        role="user"
        content="How much garlic?"
        layout="bubble"
        avatar-initials="JP"
        is-own="true"
      ></pop-message-bubble>
      <pop-message-bubble
        role="assistant"
        content=""
        layout="bubble"
        user-name="Popcorn AI"
        avatar-initials="P"
        streaming="true"
        streaming-mode="dots"
      ></pop-message-bubble>
    </div>
  `,
};
