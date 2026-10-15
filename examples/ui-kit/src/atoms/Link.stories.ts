import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Link',
  parameters: {
    docs: {
      description: {
        component: 'Link elements styled by Pico CSS with various states and modifiers.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-4);">Links</h2>
      <p style="margin-bottom: var(--size-6); color: var(--pico-muted-color);">
        Standard link styling with hover, focus, and visited states.
      </p>
      
      <div style="display: grid; gap: var(--size-4);">
        <div>
          <h3 style="margin-bottom: var(--size-2); font-size: var(--scale-1);">Default Link</h3>
          <p>This is a <a href="#default">default link</a> in a paragraph.</p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-2); font-size: var(--scale-1);">Secondary Link</h3>
          <p>This is a <a href="#secondary" class="secondary">secondary link</a> with reduced prominence.</p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-2); font-size: var(--scale-1);">Contrast Link</h3>
          <p>This is a <a href="#contrast" class="contrast">contrast link</a> for better visibility.</p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-2); font-size: var(--scale-1);">External Link</h3>
          <p>Visit <a href="https://example.com" target="_blank" rel="noopener noreferrer">external site</a> (opens in new tab).</p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-2); font-size: var(--scale-1);">Link States</h3>
          <div style="display: flex; gap: var(--size-4); flex-wrap: wrap;">
            <a href="#normal">Normal</a>
            <a href="#visited" style="color: var(--pico-primary-visited);">Visited</a>
            <a href="#hover" style="color: var(--pico-primary-hover);">Hover</a>
            <a href="#focus" style="outline: 2px solid var(--pico-primary-focus);">Focus</a>
          </div>
        </div>
      </div>
      
      <div style="margin-top: var(--size-8); padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
        <h4 style="margin-bottom: var(--size-3);">Usage</h4>
        <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-sm); overflow-x: auto;"><code>&lt;a href="#"&gt;Default link&lt;/a&gt;
&lt;a href="#" class="secondary"&gt;Secondary link&lt;/a&gt;
&lt;a href="#" class="contrast"&gt;Contrast link&lt;/a&gt;</code></pre>
      </div>
    </div>
  `,
};
