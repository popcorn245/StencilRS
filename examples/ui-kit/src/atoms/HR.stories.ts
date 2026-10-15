import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/HR',
  parameters: {
    docs: {
      description: {
        component: 'Horizontal rule elements for visual separation styled by Pico CSS.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-4);">Horizontal Rules</h2>
      <p style="margin-bottom: var(--size-6); color: var(--pico-muted-color);">
        Horizontal lines for content separation and visual breaks.
      </p>
      
      <div style="display: grid; gap: var(--size-6);">
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Default HR</h3>
          <p>Content before the horizontal rule.</p>
          <hr>
          <p>Content after the horizontal rule.</p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Section Dividers</h3>
          <section>
            <h4>Section 1</h4>
            <p>This is the first section of content that needs to be separated from other sections.</p>
          </section>
          <hr>
          <section>
            <h4>Section 2</h4>
            <p>This is the second section, visually separated by the horizontal rule above.</p>
          </section>
          <hr>
          <section>
            <h4>Section 3</h4>
            <p>This is the third section, also separated by a horizontal rule.</p>
          </section>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">In Articles</h3>
          <article>
            <h4>Article Title</h4>
            <p>Introduction paragraph with some content...</p>
            <hr>
            <h5>First Heading</h5>
            <p>Content for the first section...</p>
            <hr>
            <h5>Second Heading</h5>
            <p>Content for the second section...</p>
          </article>
        </div>
      </div>
      
      <div style="margin-top: var(--size-8); padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
        <h4 style="margin-bottom: var(--size-3);">Usage</h4>
        <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-sm); overflow-x: auto;"><code>&lt;p&gt;Content before&lt;/p&gt;
&lt;hr&gt;
&lt;p&gt;Content after&lt;/p&gt;

&lt;!-- Use for section breaks --&gt;
&lt;section&gt;...&lt;/section&gt;
&lt;hr&gt;
&lt;section&gt;...&lt;/section&gt;</code></pre>
      </div>
      
      <div style="margin-top: var(--size-4); padding: var(--size-4); background: var(--pico-primary-background); border-radius: var(--radius-md); border: 1px solid var(--pico-primary-border);">
        <p style="margin: 0; font-size: var(--scale-0); color: var(--pico-primary-inverse);">
          <strong>Note:</strong> The <code style="color: var(--pico-primary-inverse);">&lt;hr&gt;</code> element represents a thematic break between content. Use it to separate sections or topics, not just for visual styling.
        </p>
      </div>
    </div>
  `,
};
