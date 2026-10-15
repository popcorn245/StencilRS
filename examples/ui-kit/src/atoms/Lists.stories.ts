import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Lists',
  parameters: {
    docs: {
      description: {
        component: 'List elements (ordered, unordered, description) styled by Pico CSS.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-4);">Lists</h2>
      <p style="margin-bottom: var(--size-6); color: var(--pico-muted-color);">
        Various list types with consistent styling for organizing content.
      </p>
      
      <div style="display: grid; gap: var(--size-6);">
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Unordered List</h3>
          <ul>
            <li>First item</li>
            <li>Second item</li>
            <li>Third item with a longer description to show text wrapping</li>
            <li>
              Nested list:
              <ul>
                <li>Nested item 1</li>
                <li>Nested item 2</li>
              </ul>
            </li>
            <li>Fifth item</li>
          </ul>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Ordered List</h3>
          <ol>
            <li>First step</li>
            <li>Second step</li>
            <li>Third step with more details</li>
            <li>
              Sub-steps:
              <ol>
                <li>Sub-step A</li>
                <li>Sub-step B</li>
              </ol>
            </li>
            <li>Final step</li>
          </ol>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Description List</h3>
          <dl>
            <dt>HTML</dt>
            <dd>HyperText Markup Language</dd>
            
            <dt>CSS</dt>
            <dd>Cascading Style Sheets</dd>
            
            <dt>JavaScript</dt>
            <dd>Programming language for web interactivity</dd>
            <dd>Can be used on both client and server side</dd>
          </dl>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Mixed List Content</h3>
          <ul>
            <li>Text item</li>
            <li>
              <strong>Bold text</strong> in a list item
            </li>
            <li>
              Item with <a href="#">a link</a> inside
            </li>
            <li>
              <code>code snippet</code> in a list item
            </li>
          </ul>
        </div>
      </div>
      
      <div style="margin-top: var(--size-8); padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
        <h4 style="margin-bottom: var(--size-3);">Usage</h4>
        <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-sm); overflow-x: auto;"><code>&lt;ul&gt;
  &lt;li&gt;Unordered item&lt;/li&gt;
&lt;/ul&gt;

&lt;ol&gt;
  &lt;li&gt;Ordered item&lt;/li&gt;
&lt;/ol&gt;

&lt;dl&gt;
  &lt;dt&gt;Term&lt;/dt&gt;
  &lt;dd&gt;Description&lt;/dd&gt;
&lt;/dl&gt;</code></pre>
      </div>
    </div>
  `,
};
