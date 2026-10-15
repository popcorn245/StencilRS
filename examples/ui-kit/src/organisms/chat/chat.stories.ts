import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Chat',
  argTypes: {
    channelName: { control: 'text' },
    currentUserId: { control: 'text' },
    // messages: { control: 'text' }, // Removing control to avoid clutter on complex stories
  },
  parameters: {
      actions: {
          handles: ['popMessageSent', 'popThreadOpened', 'popLoginRequested'],
      },
  },
};

export default meta;

const now = Date.now();
const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;

const richMessages = [
  { 
      id: '1', 
      text: 'Welcome to the new chat component! 🚀', 
      userDisplayName: 'Admin', 
      userId: 'admin', 
      userPhotoUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
      createdAt: now - 2 * oneHour 
  },
  { 
      id: '3', 
      text: 'Has anyone tested the threads feature?', 
      userDisplayName: 'Bob', 
      userId: 'user3', 
      userPhotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      createdAt: now - 45 * oneMinute,
      replyCount: 3,
      lastReplyAt: now - 5 * oneMinute,
      lastReplyText: 'Yes, it works beautifully!',
      lastReplyUserPhotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
  },
];

const threadMessages = [
    {
        id: '3', // Parent ID matches
        text: 'Has anyone tested the threads feature?',
        userDisplayName: 'Bob',
        userId: 'user3',
        userPhotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
        createdAt: now - 45 * oneMinute,
    },
    {
        id: 'reply1',
        text: 'I am checking it right now.',
        userDisplayName: 'Admin',
        userId: 'admin',
        userPhotoUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
        createdAt: now - 40 * oneMinute
    },
    {
        id: 'reply3',
        text: 'Yes, it works beautifully!',
        userDisplayName: 'Alice',
        userId: 'user2',
        userPhotoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
        createdAt: now - 5 * oneMinute
    }
];

export const MainChannel: StoryObj = {
  name: 'Main Channel',
  render: (args) => `
    <div style="height: 500px; width: 600px; border: 1px solid #333; display: flex;">
        <pop-chat
          channel-name="${args.channelName || '#general'}"
          messages='${JSON.stringify(richMessages)}'
          current-user-id="mine"
          style="flex: 1"
        >
             <!-- No Menu Button -->
        </pop-chat>
    </div>
  `,
  args: {
    channelName: '#general',
  },
};

export const ThreadView: StoryObj = {
  name: 'Thread View (Static)',
  render: () => `
    <div style="height: 500px; width: 350px; border: 1px solid #333; display: flex;">
        <pop-chat
          channel-name="Thread: Has anyone..."
          messages='${JSON.stringify(threadMessages)}'
          current-user-id="mine"
          mode="thread"
          style="flex: 1"
        >
           <button slot="header-suffix" style="margin-left: auto; background: none; border: none; color: #ccc; cursor: pointer;">✕</button>
        </pop-chat>
    </div>
  `,
};

export const NavigationSimulation: StoryObj = {
    name: 'App Navigation Flow (Interactive)',
    render: () => {
        // We use a small script to wire them up
        const containerId = `sim-${Math.random().toString(36).substr(2, 9)}`;
        
        setTimeout(() => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const mainChat = container.querySelector('#main-chat') as HTMLElement;
            const threadSidebar = container.querySelector('#thread-sidebar') as HTMLElement;
            const threadChat = container.querySelector('#thread-chat') as HTMLElement;
            const closeBtn = container.querySelector('#close-thread-btn') as HTMLElement;

            mainChat.addEventListener('popThreadOpened', (e: any) => {
                const threadMsg = e.detail;
                console.log("Opening thread for:", threadMsg);
                
                // Show sidebar
                threadSidebar.style.transform = 'translateX(0)';
                
                // Simulate loading thread data (using static data for demo)
                threadChat.setAttribute('messages', JSON.stringify(threadMessages));
                threadChat.setAttribute('channel-name', 'Thread');
            });

            closeBtn.addEventListener('click', () => {
                threadSidebar.style.transform = 'translateX(100%)';
            });

        }, 0);

        return `
        <div id="${containerId}" style="height: 600px; width: 100%; max-width: 900px; border: 1px solid #333; display: flex; position: relative; overflow: hidden; background: #1e1e1e;">
            
            <!-- Main Chat -->
            <pop-chat
              id="main-chat"
              channel-name="#general"
              messages='${JSON.stringify(richMessages)}'
              current-user-id="mine"
              style="flex: 1; min-width: 0;"
            >
                <div slot="header-suffix" style="margin-left: auto; color: #aaa; font-size: 0.9em;">
                    Try clicking "Reply in Thread" or the thread summary ↘️
                </div>
            </pop-chat>

            <!-- Thread Sidebar (Hidden by default) -->
            <div id="thread-sidebar" style="
                position: absolute; 
                top: 0; right: 0; bottom: 0; 
                width: 350px; 
                background: #1e1e1e; 
                border-left: 1px solid #333; 
                transform: translateX(100%); 
                transition: transform 0.3s ease;
                z-index: 10;
                display: flex;
                flex-direction: column;
                box-shadow: -4px 0 10px rgba(0,0,0,0.5);
            ">
                 <pop-chat
                    id="thread-chat"
                    channel-name="Thread"
                    messages='[]'
                    current-user-id="mine"
                    mode="thread"
                    style="flex: 1"
                 >
                    <button id="close-thread-btn" slot="header-suffix" style="margin-left: auto; background: none; border: none; color: #ccc; cursor: pointer; font-size: 1.2em;">✕</button>
                 </pop-chat>
            </div>
        </div>
        `;
    }
};

export const GuestAccess: StoryObj = {
    name: 'Guest Access (Not Logged In)',
    render: () => `
      <div style="height: 500px; width: 600px; border: 1px solid #333; display: flex;">
          <pop-chat
            channel-name="#public-lobby"
            messages='${JSON.stringify([richMessages[0]])}'
            current-user-id="" 
            guest-placeholder="Please login to join the discussion"
            login-button-text="Sign In"
            style="flex: 1"
          >
          </pop-chat>
      </div>
    `,
};
