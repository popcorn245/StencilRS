import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Docs/Layout',
  parameters: {
    docs: {
      description: {
        component:
          'Pollen provides consistent spacing, container widths, and aspect ratios for layout.',
      },
    },
  },
};

export default meta;

export const SizeScale: StoryObj = {
  name: 'Size Scale',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Size Scale</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Proportional spacing scale where one unit equals 4px. Use for margins, padding, width, height, and other size-related properties.
      </p>
      
      <div style="display: grid; gap: var(--size-3);">
        ${[
          ['px', '1px'],
          ['1', '4px'],
          ['2', '8px'],
          ['3', '12px'],
          ['4', '16px'],
          ['5', '20px'],
          ['6', '24px'],
          ['7', '28px'],
          ['8', '32px'],
          ['9', '36px'],
          ['10', '40px'],
          ['12', '48px'],
          ['16', '64px'],
          ['20', '80px'],
          ['24', '96px'],
          ['32', '128px'],
        ]
          .map(
            ([size, value]) => `
          <div style="display: flex; align-items: center; gap: var(--size-4); padding: var(--size-3); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
            <div style="
              width: var(--size-${size}); 
              height: var(--size-${size}); 
              background: var(--pico-primary);
              border-radius: var(--radius-xs);
              flex-shrink: 0;
            "></div>
            <div style="flex: 1;">
              <code style="font-weight: var(--weight-medium); color: var(--color-text);">--size-${size}</code>
              <span style="margin-left: var(--size-2); color: var(--pico-muted-color);">${value}</span>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      
      <div style="margin-top: var(--size-8); padding: var(--size-4); background: var(--pico-primary-background); border-radius: var(--radius-md); border: 1px solid var(--pico-primary-border); color: var(--pico-primary-inverse);">
        <h4 style="margin-bottom: var(--size-2);">Special Values</h4>
        <div style="display: grid; gap: var(--size-2); font-size: var(--scale-00);">
          <div><code style="color: var(--pico-primary-inverse);">--size-full</code> = 100%</div>
          <div><code style="color: var(--pico-primary-inverse);">--size-screen</code> = 100vw</div>
          <div><code style="color: var(--pico-primary-inverse);">--size-min</code> = min-content</div>
          <div><code style="color: var(--pico-primary-inverse);">--size-max</code> = max-content</div>
        </div>
      </div>
    </div>
  `,
};

export const ContainerWidths: StoryObj = {
  name: 'Container Widths',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Container Widths</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Consistent max-widths for containers based on common device breakpoints.
      </p>
      
      <div style="display: grid; gap: var(--size-4);">
        ${[
          ['xs', '480px', 'Mobile'],
          ['sm', '640px', 'Tablet Portrait'],
          ['md', '768px', 'Tablet Landscape'],
          ['lg', '1024px', 'Laptop'],
          ['xl', '1280px', 'Desktop'],
        ]
          .map(
            ([size, value, device]) => `
          <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
            <div style="
              max-width: var(--width-${size}); 
              padding: var(--size-4); 
              background: var(--pico-primary-background);
              border-radius: var(--radius-sm);
              margin-bottom: var(--size-2);
            ">
              <code style="font-weight: var(--weight-medium); color: var(--pico-primary-inverse);">--width-${size}</code>
            </div>
            <div style="font-size: var(--scale-00); color: var(--pico-muted-color);">
              ${value} - ${device}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      
      <div style="margin-top: var(--size-6); padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
        <h4 style="margin-bottom: var(--size-3); color: var(--color-text);">Usage Example</h4>
        <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-sm); overflow-x: auto;"><code>.container {
  max-width: var(--width-lg);
  margin: 0 auto;
  padding: var(--size-6);
}</code></pre>
      </div>
    </div>
  `,
};

export const AspectRatios: StoryObj = {
  name: 'Aspect Ratios',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Aspect Ratios</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Common aspect ratios for images, videos, and containers.
      </p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--size-6);">
        ${[
          ['square', '1/1', 'Square'],
          ['portrait', '3/4', 'Portrait'],
          ['landscape', '4/3', 'Landscape'],
          ['tall', '2/3', 'Tall'],
          ['wide', '3/2', 'Wide'],
          ['widescreen', '16/9', 'Widescreen'],
          ['golden', '1.618/1', 'Golden Ratio'],
        ]
          .map(
            ([name, ratio, label]) => `
          <div>
            <div style="
              aspect-ratio: var(--ratio-${name});
              background: linear-gradient(135deg, var(--pico-primary), var(--color-purple));
              border-radius: var(--radius-md);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: var(--weight-medium);
              margin-bottom: var(--size-3);
            ">
              ${ratio}
            </div>
            <div style="text-align: center;">
              <div style="font-weight: var(--weight-medium); margin-bottom: var(--size-1); color: var(--color-text);">${label}</div>
              <code style="font-size: var(--scale-00);">--ratio-${name}</code>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `,
};

export const SpacingExamples: StoryObj = {
  name: 'Spacing Examples',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Spacing in Practice</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Examples of how to use the size scale for consistent spacing.
      </p>
      
      <div style="display: grid; gap: var(--size-8);">
        <div>
          <h3 style="margin-bottom: var(--size-4); font-size: var(--scale-3); color: var(--color-text);">Card Spacing</h3>
          <div style="
            padding: var(--size-6); 
            background: var(--pico-card-sectioning-background-color); 
            border-radius: var(--radius-lg);
            max-width: var(--width-sm);
          ">
            <h4 style="margin-bottom: var(--size-3); color: var(--color-text);">Card Title</h4>
            <p style="margin-bottom: var(--size-4); color: var(--pico-muted-color);">
              This card uses var(--size-6) padding and var(--size-3) and var(--size-4) margins between elements.
            </p>
            <button style="
              padding: var(--size-3) var(--size-5);
              background: var(--pico-primary);
              color: var(--pico-primary-inverse);
              border: none;
              border-radius: var(--radius-md);
              cursor: pointer;
            ">
              Action
            </button>
          </div>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-4); font-size: var(--scale-3); color: var(--color-text);">List Spacing</h3>
          <div style="max-width: var(--width-sm);">
            ${['Item One', 'Item Two', 'Item Three']
              .map(
                (item) => `
              <div style="
                padding: var(--size-4);
                background: var(--pico-card-sectioning-background-color);
                border-radius: var(--radius-md);
                margin-bottom: var(--size-2);
                color: var(--color-text);
              ">
                ${item}
              </div>
            `
              )
              .join('')}
          </div>
          <p style="margin-top: var(--size-4); font-size: var(--scale-00); color: var(--pico-muted-color);">
            Each item has var(--size-4) padding with var(--size-2) margin between items.
          </p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-4); font-size: var(--scale-3); color: var(--color-text);">Section Spacing</h3>
          <div style="background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-lg); overflow: hidden; max-width: var(--width-sm);">
            <div style="padding: var(--size-8); background: var(--pico-primary-background); border-bottom: 1px solid var(--pico-primary-border);">
              <h4 style="color: var(--pico-primary-inverse);">Section Header</h4>
            </div>
            <div style="padding: var(--size-8);">
              <p style="margin-bottom: var(--size-6); color: var(--color-text);">Large sections use var(--size-8) padding.</p>
              <p style="color: var(--pico-muted-color);">This creates comfortable breathing room.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};
