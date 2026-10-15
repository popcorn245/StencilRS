import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Docs/CSS Variables',
  parameters: {
    docs: {
      description: {
        component:
          'Our design system uses Pollen CSS for foundational design tokens combined with Pico CSS for semantic component variables. This two-layer approach provides flexibility and consistency.',
      },
    },
  },
};

export default meta;

export const Overview: StoryObj = {
  name: 'System Overview',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="color: var(--color-text);">Two-Layer CSS Variable System</h2>
      
      <div style="display: grid; gap: var(--size-6); margin-top: var(--size-6);">
        <div style="padding: var(--size-5); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-lg); border-left: 4px solid var(--color-blue);">
          <h3 style="color: var(--color-text); margin-bottom: var(--size-3);">Layer 1: Pollen CSS (Foundation)</h3>
          <p style="color: var(--pico-muted-color); margin-bottom: var(--size-4);">
            Pollen provides foundational design tokens - the raw building blocks of your design system.
          </p>
          <ul style="margin: 0; padding-left: var(--size-5);">
            <li><strong>Colors:</strong> <code>--color-blue-500</code>, <code>--color-grey-700</code></li>
            <li><strong>Typography:</strong> <code>--scale-4</code>, <code>--font-sans</code>, <code>--weight-bold</code></li>
            <li><strong>Layout:</strong> <code>--size-4</code>, <code>--width-lg</code>, <code>--ratio-widescreen</code></li>
            <li><strong>UI:</strong> <code>--radius-md</code>, <code>--shadow-lg</code>, <code>--ease-out-cubic</code></li>
          </ul>
          <p style="margin-top: var(--size-4); color: var(--pico-muted-color);">
            <strong>Purpose:</strong> Style-agnostic primitives you can use anywhere
          </p>
        </div>

        <div style="padding: var(--size-5); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-lg); border-left: 4px solid var(--color-purple);">
          <h3 style="color: var(--color-text); margin-bottom: var(--size-3);">Layer 2: Pico CSS (Semantic)</h3>
          <p style="color: var(--pico-muted-color); margin-bottom: var(--size-4);">
            Pico provides semantic variables that reference Pollen tokens and adapt to context (light/dark mode).
          </p>
          <ul style="margin: 0; padding-left: var(--size-5);">
            <li><strong>Theme:</strong> <code>--pico-background-color</code>, <code>--pico-color</code></li>
            <li><strong>Actions:</strong> <code>--pico-primary</code>, <code>--pico-secondary</code></li>
            <li><strong>Components:</strong> <code>--pico-card-background-color</code>, <code>--pico-form-element-border-color</code></li>
          </ul>
          <p style="margin-top: var(--size-4); color: var(--pico-muted-color);">
            <strong>Purpose:</strong> Context-aware variables that automatically adapt to themes
          </p>
        </div>

        <div style="padding: var(--size-5); background: var(--pico-primary-background); border-radius: var(--radius-lg); color: var(--pico-primary-inverse);">
          <h3 style="margin-bottom: var(--size-3);">How They Work Together</h3>
          <p style="margin-bottom: var(--size-3); opacity: 0.9;">
            Pico CSS variables reference Pollen tokens in your <code>pollen.config.js</code>:
          </p>
          <pre style="background: rgba(0,0,0,0.2); padding: var(--size-3); border-radius: var(--radius-sm); overflow-x: auto;"><code style="color: var(--pico-primary-inverse);">modules: {
  pico: {
    // Pico variable → references Pollen token
    'primary': 'var(--color-blue)',           
    'background-color': 'var(--color-bg)',
    'border-radius': 'var(--radius-md)',
    'spacing': 'var(--size-4)',
  }
}</code></pre>
        </div>
      </div>

      <div style="margin-top: var(--size-8); padding: var(--size-5); background: var(--color-yellow-300); color: var(--color-grey-900); border-radius: var(--radius-lg);">
        <h3 style="margin-bottom: var(--size-3);">💡 Best Practices</h3>
        <ul style="margin: 0; padding-left: var(--size-5);">
          <li><strong>For one-off styles:</strong> Use Pollen tokens directly (<code>var(--color-blue)</code>)</li>
          <li><strong>For themed components:</strong> Use Pico variables (<code>var(--pico-primary)</code>)</li>
          <li><strong>For responsive spacing:</strong> Use Pollen sizes (<code>var(--size-4)</code>)</li>
          <li><strong>For dark mode:</strong> Rely on Pico semantic variables that adapt automatically</li>
        </ul>
      </div>
    </div>
  `,
};

export const PollenTokens: StoryObj = {
  name: 'Pollen Tokens Reference',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="color: var(--color-text); margin-bottom: var(--size-6);">Pollen CSS Tokens</h2>
      
      <div style="display: grid; gap: var(--size-6);">
        <section>
          <h3 style="color: var(--color-text);">Colors</h3>
          <table>
            <thead>
              <tr>
                <th>Token Pattern</th>
                <th>Example</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>--color-{name}-{shade}</code></td>
                <td><code>--color-blue-500</code></td>
                <td>Specific color shade (50-900)</td>
              </tr>
              <tr>
                <td><code>--color-{name}</code></td>
                <td><code>--color-blue</code></td>
                <td>Base color (alias to 500)</td>
              </tr>
              <tr>
                <td><code>--color-rgb-{name}-{shade}</code></td>
                <td><code>--color-rgb-blue-500</code></td>
                <td>RGB values for opacity: <code>rgba(var(...), 0.5)</code></td>
              </tr>
              <tr>
                <td><code>--color-bg</code></td>
                <td>-</td>
                <td>Theme background (adapts to dark mode)</td>
              </tr>
              <tr>
                <td><code>--color-text</code></td>
                <td>-</td>
                <td>Theme text color (adapts to dark mode)</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 style="color: var(--color-text);">Typography</h3>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Values</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>--scale-{n}</code></td>
                <td>000, 00, 0-10</td>
                <td>Font sizes (12px - 128px)</td>
              </tr>
              <tr>
                <td><code>--font-{family}</code></td>
                <td>sans, serif, mono</td>
                <td>Font family stacks</td>
              </tr>
              <tr>
                <td><code>--weight-{weight}</code></td>
                <td>light, regular, medium, bold, etc.</td>
                <td>Font weights (300-900)</td>
              </tr>
              <tr>
                <td><code>--line-{size}</code></td>
                <td>none, xs, sm, md, lg, xl</td>
                <td>Line heights (1.0 - 2.0)</td>
              </tr>
              <tr>
                <td><code>--letter-{size}</code></td>
                <td>xs, sm, none, lg, xl</td>
                <td>Letter spacing</td>
              </tr>
              <tr>
                <td><code>--prose-{size}</code></td>
                <td>xs, sm, md, lg, xl</td>
                <td>Max-width for readable text (45ch - 85ch)</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 style="color: var(--color-text);">Layout</h3>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Range</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>--size-{n}</code></td>
                <td>px, 1-96, full, screen, min, max</td>
                <td>Spacing scale (4px multiples)</td>
              </tr>
              <tr>
                <td><code>--width-{size}</code></td>
                <td>xs, sm, md, lg, xl</td>
                <td>Container max-widths (480px - 1280px)</td>
              </tr>
              <tr>
                <td><code>--ratio-{ratio}</code></td>
                <td>square, portrait, landscape, widescreen, etc.</td>
                <td>Aspect ratios</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 style="color: var(--color-text);">UI Elements</h3>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Values</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>--radius-{size}</code></td>
                <td>xs, sm, md, lg, xl, full</td>
                <td>Border radius (3px - 9999px)</td>
              </tr>
              <tr>
                <td><code>--shadow-{size}</code></td>
                <td>xs, sm, md, lg, xl</td>
                <td>Box shadows for elevation</td>
              </tr>
              <tr>
                <td><code>--blur-{size}</code></td>
                <td>xs, sm, md, lg, xl</td>
                <td>Backdrop blur effects</td>
              </tr>
              <tr>
                <td><code>--ease-{type}</code></td>
                <td>in/out/in-out + sine/quad/cubic/etc.</td>
                <td>Easing functions</td>
              </tr>
              <tr>
                <td><code>--layer-{n}</code></td>
                <td>below, 1-5, top</td>
                <td>Z-index layers</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  `,
};

export const PicoSemanticVars: StoryObj = {
  name: 'Pico Semantic Variables',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="color: var(--color-text); margin-bottom: var(--size-6);">Pico CSS Semantic Variables</h2>
      
      <p style="color: var(--pico-muted-color); margin-bottom: var(--size-8); max-width: var(--prose-lg);">
        These variables automatically adapt between light and dark modes. They reference Pollen tokens but provide semantic meaning.
      </p>

      <div style="display: grid; gap: var(--size-6);">
        <section>
          <h3 style="color: var(--color-text);">Theme Colors</h3>
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Maps to (Light)</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>--pico-background-color</code></td>
                <td><code>var(--color-bg)</code></td>
                <td>Main background color</td>
              </tr>
              <tr>
                <td><code>--pico-color</code></td>
                <td><code>var(--color-text)</code></td>
                <td>Main text color</td>
              </tr>
              <tr>
                <td><code>--pico-muted-color</code></td>
                <td><code>var(--color-grey-500)</code></td>
                <td>Secondary/muted text</td>
              </tr>
              <tr>
                <td><code>--pico-muted-border-color</code></td>
                <td><code>var(--color-grey-200)</code></td>
                <td>Subtle borders</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 style="color: var(--color-text);">Action Colors</h3>
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Maps to</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>--pico-primary</code></td>
                <td><code>var(--color-blue)</code></td>
                <td>Primary actions</td>
              </tr>
              <tr>
                <td><code>--pico-primary-hover</code></td>
                <td><code>var(--color-blue-700)</code></td>
                <td>Primary hover state</td>
              </tr>
              <tr>
                <td><code>--pico-primary-inverse</code></td>
                <td><code>var(--color-bg)</code></td>
                <td>Text on primary background</td>
              </tr>
              <tr>
                <td><code>--pico-secondary</code></td>
                <td><code>var(--color-grey-600)</code></td>
                <td>Secondary actions</td>
              </tr>
              <tr>
                <td><code>--pico-secondary-hover</code></td>
                <td><code>var(--color-grey-700)</code></td>
                <td>Secondary hover state</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 style="color: var(--color-text);">Component-Specific</h3>
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Component</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>--pico-card-background-color</code></td>
                <td>Card backgrounds</td>
              </tr>
              <tr>
                <td><code>--pico-card-sectioning-background-color</code></td>
                <td>Card sections/nested backgrounds</td>
              </tr>
              <tr>
                <td><code>--pico-form-element-background-color</code></td>
                <td>Input fields</td>
              </tr>
              <tr>
                <td><code>--pico-form-element-border-color</code></td>
                <td>Input borders</td>
              </tr>
              <tr>
                <td><code>--pico-code-background-color</code></td>
                <td>Code blocks</td>
              </tr>
              <tr>
                <td><code>--pico-code-color</code></td>
                <td>Code text</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 style="color: var(--color-text);">Typography & Layout (Pico references Pollen)</h3>
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Maps to</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>--pico-font-family</code></td>
                <td><code>var(--font-sans)</code></td>
              </tr>
              <tr>
                <td><code>--pico-border-radius</code></td>
                <td><code>var(--radius-md)</code></td>
              </tr>
              <tr>
                <td><code>--pico-spacing</code></td>
                <td><code>var(--size-4)</code></td>
              </tr>
              <tr>
                <td><code>--pico-box-shadow</code></td>
                <td><code>var(--shadow-md)</code></td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  `,
};

export const PracticalExamples: StoryObj = {
  name: 'Practical Examples',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="color: var(--color-text); margin-bottom: var(--size-6);">Practical Usage Examples</h2>

      <div style="display: grid; gap: var(--size-8);">
        <section>
          <h3 style="color: var(--color-text); margin-bottom: var(--size-4);">Example 1: Custom Button</h3>
          <div style="padding: var(--size-5); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-lg);">
            <p style="color: var(--pico-muted-color); margin-bottom: var(--size-4);">
              Using both Pollen and Pico variables for a flexible, theme-aware button:
            </p>
            <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-md); overflow-x: auto;"><code>.custom-button {
  /* Pico for semantic theming */
  background: var(--pico-primary);
  color: var(--pico-primary-inverse);
  
  /* Pollen for precise design control */
  padding: var(--size-3) var(--size-6);
  font-size: var(--scale-1);
  font-weight: var(--weight-semibold);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all 200ms var(--ease-out-cubic);
}

.custom-button:hover {
  background: var(--pico-primary-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}</code></pre>
            <button style="
              background: var(--pico-primary);
              color: var(--pico-primary-inverse);
              padding: var(--size-3) var(--size-6);
              font-size: var(--scale-1);
              font-weight: var(--weight-semibold);
              border-radius: var(--radius-lg);
              box-shadow: var(--shadow-sm);
              border: none;
              cursor: pointer;
              margin-top: var(--size-4);
            ">
              Example Button
            </button>
          </div>
        </section>

        <section>
          <h3 style="color: var(--color-text); margin-bottom: var(--size-4);">Example 2: Card Component</h3>
          <div style="padding: var(--size-5); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-lg);">
            <p style="color: var(--pico-muted-color); margin-bottom: var(--size-4);">
              Creating a card that adapts to dark mode:
            </p>
            <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-md); overflow-x: auto;"><code>.card {
  /* Pico for theming */
  background: var(--pico-card-background-color);
  color: var(--color-text);
  border: 1px solid var(--pico-muted-border-color);
  
  /* Pollen for layout */
  padding: var(--size-6);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  max-width: var(--width-md);
}

.card-header {
  background: var(--pico-card-sectioning-background-color);
  padding: var(--size-4);
  margin: calc(var(--size-6) * -1);
  margin-bottom: var(--size-4);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}</code></pre>
            <div style="
              background: var(--pico-card-background-color);
              border: 1px solid var(--pico-muted-border-color);
              padding: var(--size-6);
              border-radius: var(--radius-xl);
              box-shadow: var(--shadow-lg);
              max-width: var(--width-sm);
              margin-top: var(--size-4);
            ">
              <div style="
                background: var(--pico-card-sectioning-background-color);
                padding: var(--size-4);
                margin: calc(var(--size-6) * -1);
                margin-bottom: var(--size-4);
                border-radius: var(--radius-xl) var(--radius-xl) 0 0;
              ">
                <h4 style="margin: 0; color: var(--color-text);">Card Header</h4>
              </div>
              <p style="color: var(--pico-muted-color);">This card uses Pico variables for colors that adapt to dark mode, and Pollen tokens for precise spacing and sizing.</p>
            </div>
          </div>
        </section>

        <section>
          <h3 style="color: var(--color-text); margin-bottom: var(--size-4);">Example 3: Status Badges</h3>
          <div style="padding: var(--size-5); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-lg);">
            <p style="color: var(--pico-muted-color); margin-bottom: var(--size-4);">
              Using Pollen colors directly for status indicators:
            </p>
            <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-md); overflow-x: auto;"><code>.badge {
  display: inline-block;
  padding: var(--size-1) var(--size-3);
  font-size: var(--scale-00);
  font-weight: var(--weight-semibold);
  border-radius: var(--radius-full);
}

.badge-success {
  background: var(--color-green);
  color: white;
}

.badge-warning {
  background: var(--color-yellow);
  color: var(--color-grey-900);
}

.badge-error {
  background: var(--color-red);
  color: white;
}</code></pre>
            <div style="display: flex; gap: var(--size-3); margin-top: var(--size-4); flex-wrap: wrap;">
              <span style="padding: var(--size-1) var(--size-3); font-size: var(--scale-00); font-weight: var(--weight-semibold); border-radius: var(--radius-full); background: var(--color-green); color: white;">
                Success
              </span>
              <span style="padding: var(--size-1) var(--size-3); font-size: var(--scale-00); font-weight: var(--weight-semibold); border-radius: var(--radius-full); background: var(--color-yellow); color: var(--color-grey-900);">
                Warning
              </span>
              <span style="padding: var(--size-1) var(--size-3); font-size: var(--scale-00); font-weight: var(--weight-semibold); border-radius: var(--radius-full); background: var(--color-red); color: white;">
                Error
              </span>
              <span style="padding: var(--size-1) var(--size-3); font-size: var(--scale-00); font-weight: var(--weight-semibold); border-radius: var(--radius-full); background: var(--color-blue); color: white;">
                Info
              </span>
            </div>
          </div>
        </section>

        <section style="padding: var(--size-6); background: var(--color-blue-100); border-radius: var(--radius-lg); border-left: 4px solid var(--color-blue);">
          <h3 style="color: var(--color-grey-900); margin-bottom: var(--size-4);">🎯 Decision Guide</h3>
          <div style="display: grid; gap: var(--size-4); color: var(--color-grey-900);">
            <div>
              <strong>Use Pollen tokens when:</strong>
              <ul style="margin-top: var(--size-2); padding-left: var(--size-5);">
                <li>You need a specific color shade</li>
                <li>Creating status indicators or data visualizations</li>
                <li>Building one-off styles</li>
                <li>You want precise control over spacing/sizing</li>
              </ul>
            </div>
            <div>
              <strong>Use Pico variables when:</strong>
              <ul style="margin-top: var(--size-2); padding-left: var(--size-5);">
                <li>Building components that should adapt to themes</li>
                <li>You want automatic dark mode support</li>
                <li>Creating reusable component libraries</li>
                <li>Following semantic naming conventions</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
};
