import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Blockquote',
  parameters: {
    docs: {
      description: {
        component: 'Blockquote elements for displaying quotations styled by Pico CSS.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-4);">Blockquotes</h2>
      <p style="margin-bottom: var(--size-6); color: var(--pico-muted-color);">
        Styled quotation blocks for highlighting important text or citations.
      </p>
      
      <div style="display: grid; gap: var(--size-6);">
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Simple Blockquote</h3>
          <blockquote>
            The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.
          </blockquote>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Blockquote with Citation</h3>
          <blockquote>
            <p>
              Design is not just what it looks like and feels like. Design is how it works.
            </p>
            <footer>
              <cite>— Steve Jobs</cite>
            </footer>
          </blockquote>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Multi-paragraph Blockquote</h3>
          <blockquote>
            <p>
              The greatest glory in living lies not in never falling, but in rising every time we fall.
            </p>
            <p>
              It is during our darkest moments that we must focus to see the light.
            </p>
            <footer>
              <cite>— Aristotle Onassis</cite>
            </footer>
          </blockquote>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Nested Blockquote</h3>
          <blockquote>
            <p>Original quote here.</p>
            <blockquote>
              <p>A quote within a quote.</p>
            </blockquote>
            <p>Continuation of original quote.</p>
          </blockquote>
        </div>
      </div>
      
      <div style="margin-top: var(--size-8); padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
        <h4 style="margin-bottom: var(--size-3);">Usage</h4>
        <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-sm); overflow-x: auto;"><code>&lt;blockquote&gt;
  Quote text here.
&lt;/blockquote&gt;

&lt;blockquote&gt;
  &lt;p&gt;Quote text here.&lt;/p&gt;
  &lt;footer&gt;
    &lt;cite&gt;— Author Name&lt;/cite&gt;
  &lt;/footer&gt;
&lt;/blockquote&gt;</code></pre>
      </div>
    </div>
  `,
};
