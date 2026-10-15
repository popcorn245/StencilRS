import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Docs/Typography',
  parameters: {
    docs: {
      description: {
        component:
          'Pollen provides a robust typographic system including modular scales, font families, weights, line heights, letter spacing, and prose widths.',
      },
    },
  },
};

export default meta;

export const ModularScale: StoryObj = {
  name: 'Modular Scale',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Modular Typography Scale</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        A consistent scale from <code>--scale-000</code> (12px) to <code>--scale-10</code> (128px).
        All sizes are in rem units for proper scaling.
      </p>
      
      <div style="display: grid; gap: var(--size-4);">
        ${[
          ['000', '12px'],
          ['00', '14px'],
          ['0', '16px'],
          ['1', '18px'],
          ['2', '20px'],
          ['3', '24px'],
          ['4', '30px'],
          ['5', '36px'],
          ['6', '48px'],
          ['7', '60px'],
          ['8', '72px'],
        ]
          .map(
            ([scale, size]) => `
        <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <div style="font-size: var(--scale-${scale}); color: var(--color-text);">Scale ${scale} (${size}) - The quick brown fox</div>
          <code style="font-size: var(--scale-000); color: var(--pico-muted-color);">--scale-${scale}</code>
        </div>
        `
          )
          .join('')}
      </div>
    </div>
  `,
};

export const FontFamilies: StoryObj = {
  name: 'Font Families',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Font Families</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        System font stacks optimized for performance and consistency across platforms.
      </p>
      
      <div style="display: grid; gap: var(--size-6);">
        <div style="padding: var(--size-5); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <h3 style="font-family: var(--font-sans); font-size: var(--scale-4); margin-bottom: var(--size-3); color: var(--color-text);">
            Sans Serif - The quick brown fox jumps over the lazy dog
          </h3>
          <code style="font-size: var(--scale-00);">--font-sans</code>
          <p style="margin-top: var(--size-2); font-size: var(--scale-00); color: var(--pico-muted-color);">
            ui-sans-serif, system-ui, sans-serif
          </p>
        </div>
        
        <div style="padding: var(--size-5); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <h3 style="font-family: var(--font-serif); font-size: var(--scale-4); margin-bottom: var(--size-3); color: var(--color-text);">
            Serif - The quick brown fox jumps over the lazy dog
          </h3>
          <code style="font-size: var(--scale-00);">--font-serif</code>
          <p style="margin-top: var(--size-2); font-size: var(--scale-00); color: var(--pico-muted-color);">
            ui-serif, Georgia, Cambria, Times New Roman
          </p>
        </div>
        
        <div style="padding: var(--size-5); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <h3 style="font-family: var(--font-mono); font-size: var(--scale-4); margin-bottom: var(--size-3); color: var(--color-text);">
            Monospace - The quick brown fox jumps
          </h3>
          <code style="font-size: var(--scale-00);">--font-mono</code>
          <p style="margin-top: var(--size-2); font-size: var(--scale-00); color: var(--pico-muted-color);">
            ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas
          </p>
        </div>
      </div>
    </div>
  `,
};

export const FontWeights: StoryObj = {
  name: 'Font Weights',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Font Weights</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Consistent font weights from light (300) to black (900).
      </p>
      
      <div style="display: grid; gap: var(--size-3);">
        ${[
          ['light', '300'],
          ['regular', '400'],
          ['medium', '500'],
          ['semibold', '600'],
          ['bold', '700'],
          ['extrabold', '800'],
          ['black', '900'],
        ]
          .map(
            ([weight, value]) => `
        <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <div style="font-weight: var(--weight-${weight}); font-size: var(--scale-3); color: var(--color-text);">${weight.charAt(0).toUpperCase() + weight.slice(1)} (${value}) - The quick brown fox</div>
          <code style="font-size: var(--scale-00);">--weight-${weight}</code>
        </div>
        `
          )
          .join('')}
      </div>
    </div>
  `,
};

export const LineHeight: StoryObj = {
  name: 'Line Height',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Line Heights</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Unitless line height values that scale with font size.
      </p>
      
      <div style="display: grid; gap: var(--size-6);">
        ${[
          ['none', '1.0'],
          ['xs', '1.25'],
          ['sm', '1.375'],
          ['md', '1.5'],
          ['lg', '1.625'],
          ['xl', '2.0'],
        ]
          .map(
            ([line, value]) => `
        <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <p style="line-height: var(--line-${line}); font-size: var(--scale-2); margin-bottom: var(--size-2); color: var(--color-text);">
            Line ${line.toUpperCase()} (${value}) - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <code style="font-size: var(--scale-00);">--line-${line}</code>
        </div>
        `
          )
          .join('')}
      </div>
    </div>
  `,
};

export const LetterSpacing: StoryObj = {
  name: 'Letter Spacing',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Letter Spacing</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Letter spacing values in em units that scale with font size.
      </p>
      
      <div style="display: grid; gap: var(--size-4);">
        ${[
          ['xs', '-0.05em'],
          ['sm', '-0.025em'],
          ['none', '0'],
          ['lg', '0.025em'],
          ['xl', '0.05em'],
        ]
          .map(
            ([spacing, value]) => `
        <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <div style="letter-spacing: var(--letter-${spacing}); font-size: var(--scale-3); color: var(--color-text);">${spacing.toUpperCase()} (${value}) - THE QUICK BROWN FOX</div>
          <code style="font-size: var(--scale-00);">--letter-${spacing}</code>
        </div>
        `
          )
          .join('')}
      </div>
    </div>
  `,
};

export const ProseWidth: StoryObj = {
  name: 'Prose Width',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Prose Widths</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Optimal max-widths for readable text, measured in character width (ch units).
      </p>
      
      <div style="display: grid; gap: var(--size-6);">
        ${[
          ['xs', '45ch', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'],
          ['sm', '55ch', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.'],
          ['md', '65ch', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.'],
          ['lg', '75ch', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.'],
          ['xl', '85ch', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'],
        ]
          .map(
            ([size, value, text]) => `
        <div>
          <div style="max-width: var(--prose-${size}); padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
            <p style="margin-bottom: var(--size-2); color: var(--color-text);">
              ${size.toUpperCase()} (${value}) - ${text}
            </p>
            <code style="font-size: var(--scale-00);">--prose-${size}</code>
          </div>
        </div>
        `
          )
          .join('')}
      </div>
    </div>
  `,
};
