import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Code',
  parameters: {
    docs: {
      description: {
        component: 'Code and preformatted text elements styled by Pico CSS.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-4);">Code</h2>
      <p style="margin-bottom: var(--size-6); color: var(--pico-muted-color);">
        Inline code and code block styling for displaying code snippets.
      </p>
      
      <div style="display: grid; gap: var(--size-6);">
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Inline Code</h3>
          <p>
            Use <code>inline code</code> for short snippets like <code>const x = 5</code> or 
            <code>document.querySelector()</code> within text.
          </p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Code Block</h3>
          <pre><code>function greet(name) {
  return \`Hello, \${name}!\`;
}

const message = greet('World');
console.log(message);</code></pre>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Keyboard Input</h3>
          <p>
            Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy, or <kbd>Cmd</kbd> + <kbd>V</kbd> to paste.
          </p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Sample Output</h3>
          <p>
            The program will output: <samp>Process completed successfully</samp>
          </p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Variable</h3>
          <p>
            Set the <var>maxWidth</var> variable to control the container size.
          </p>
        </div>
      </div>
      
      <div style="margin-top: var(--size-8); padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
        <h4 style="margin-bottom: var(--size-3);">Usage</h4>
        <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-sm); overflow-x: auto;"><code>&lt;code&gt;inline code&lt;/code&gt;

&lt;pre&gt;&lt;code&gt;
// Code block
const example = true;
&lt;/code&gt;&lt;/pre&gt;

&lt;kbd&gt;Ctrl&lt;/kbd&gt; + &lt;kbd&gt;C&lt;/kbd&gt;
&lt;samp&gt;Sample output&lt;/samp&gt;
&lt;var&gt;variableName&lt;/var&gt;</code></pre>
      </div>
    </div>
  `,
};
