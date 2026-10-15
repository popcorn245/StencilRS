import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Sidebar',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    open: { control: 'boolean' },
    side: { control: 'radio', options: ['left', 'right'] },
  },
};

export default meta;

export const LeftSidebar: StoryObj = {
  name: 'Left Sidebar',
  render: (args) => `
    <div style="height: 100vh;">
        <pop-sidebar side="${args.side || 'left'}" open="${args.open || false}">
            <!-- Sidebar Content -->
            <div slot="sidebar" style="padding: 20px;">
                <h3>Menu</h3>
                <nav>
                    <a href="#" style="display:block; padding: 10px; color: inherit;">Home</a>
                    <a href="#" style="display:block; padding: 10px; color: inherit;">Settings</a>
                    <a href="#" style="display:block; padding: 10px; color: inherit;">Profile</a>
                </nav>
            </div>

            <!-- Main Content -->
            <div style="background: var(--pico-background-color); color: var(--pico-color); height: 100%; display: flex; flex-direction: column;">
                <header style="padding: 10px; background: var(--pico-card-background-color); border-bottom: 1px solid var(--pico-border-color); display: flex; align-items: center; gap: 1rem;">
                    <!-- Trigger inside header -->
                    <!-- The component renders a trigger inside slot 'trigger', or we can place one ourselves controlled by open prop if we used external state. 
                         But the component's internal checkbox handles the click on the trigger label. -->
                    <h1 style="margin: 0; font-size: 1.2rem;">My App</h1>
                </header>
                <div style="padding: 20px; flex: 1;">
                    <p>Main content goes here.</p>
                    <p>Resize window to mobile to see sidebar collapse.</p>
                </div>
            </div>
        </pop-sidebar>
    </div>
  `,
  args: {
    open: false,
    side: 'left',
  },
};

export const RightSidebar: StoryObj = {
    ...LeftSidebar,
    name: 'Right Sidebar',
    args: {
        open: false,
        side: 'right',
    }
};
