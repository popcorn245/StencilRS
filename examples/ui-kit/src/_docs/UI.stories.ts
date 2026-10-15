import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Docs/UI',
  parameters: {
    docs: {
      description: {
        component:
          'Pollen provides UI utilities including border radius, shadows, blur effects, easing functions, and z-index layers.',
      },
    },
  },
};

export default meta;

export const BorderRadius: StoryObj = {
  name: 'Border Radius',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Border Radius</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Consistent edge radiuses for creating rounded corners.
      </p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--size-6);">
        ${[
          ['xs', '3px'],
          ['sm', '6px'],
          ['md', '8px'],
          ['lg', '12px'],
          ['xl', '16px'],
          ['full', '9999px'],
        ]
          .map(
            ([size, value]) => `
          <div>
            <div style="
              width: 120px;
              height: 120px;
              background: var(--pico-primary);
              border-radius: var(--radius-${size});
              margin: 0 auto var(--size-3);
            "></div>
            <div style="text-align: center;">
              <div style="font-weight: var(--weight-medium); margin-bottom: var(--size-1); color: var(--color-text);">${size.toUpperCase()}</div>
              <code style="font-size: var(--scale-00);">--radius-${size}</code>
              <div style="font-size: var(--scale-00); color: var(--pico-muted-color); margin-top: var(--size-1);">${value}</div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      
      <div style="margin-top: var(--size-8);">
        <h3 style="margin-bottom: var(--size-4); font-size: var(--scale-3); color: var(--color-text);">Usage Examples</h3>
        <div style="display: grid; gap: var(--size-4);">
          <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
            <code>--radius-sm</code> - Small elements like badges, tags
          </div>
          <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
            <code>--radius-md</code> - Standard buttons, inputs, cards
          </div>
          <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
            <code>--radius-lg</code> - Large cards, modals
          </div>
          <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
            <code>--radius-full</code> - Pill buttons, avatars, circular icons
          </div>
        </div>
      </div>
    </div>
  `,
};

export const Shadows: StoryObj = {
  name: 'Shadows',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Box Shadows</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Elevation shadows for creating depth and visual hierarchy.
      </p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--size-8);">
        ${['xs', 'sm', 'md', 'lg', 'xl']
          .map(
            (size) => `
          <div>
            <div style="
              padding: var(--size-6);
              background: var(--pico-card-background-color);
              border-radius: var(--radius-lg);
              box-shadow: var(--shadow-${size});
              margin-bottom: var(--size-4);
            ">
              <div style="text-align: center; color: var(--color-text);">
                Shadow ${size.toUpperCase()}
              </div>
            </div>
            <div style="text-align: center;">
              <code style="font-size: var(--scale-00);">--shadow-${size}</code>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      
      <div style="margin-top: var(--size-8); padding: var(--size-6); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-lg);">
        <h3 style="margin-bottom: var(--size-4); font-size: var(--scale-3); color: var(--color-text);">When to Use</h3>
        <div style="display: grid; gap: var(--size-3); font-size: var(--scale-0);">
          <div><strong>XS/SM:</strong> Subtle elevation for cards and panels</div>
          <div><strong>MD:</strong> Standard dropdowns and floating elements</div>
          <div><strong>LG:</strong> Modals and prominent overlays</div>
          <div><strong>XL:</strong> High-emphasis elements like notifications</div>
        </div>
      </div>
    </div>
  `,
};

export const Blur: StoryObj = {
  name: 'Blur Effects',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Backdrop Blur</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Backdrop blur effects for creating frosted glass appearances.
      </p>
      
      <div style="
        background: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%234299e1%22 width=%2250%22 height=%2250%22/><rect fill=%22%239f7aea%22 x=%2250%22 width=%2250%22 height=%2250%22/><rect fill=%22%2348bb78%22 y=%2250%22 width=%2250%22 height=%2250%22/><rect fill=%22%23ed8936%22 x=%2250%22 y=%2250%22 width=%2250%22 height=%2250%22/></svg>') repeat;
        background-size: 100px 100px;
        padding: var(--size-8);
        border-radius: var(--radius-lg);
      ">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--size-4);">
          ${['xs', 'sm', 'md', 'lg', 'xl']
            .map(
              (size) => `
            <div style="
              padding: var(--size-5);
              background: rgba(255, 255, 255, 0.7);
              backdrop-filter: var(--blur-${size});
              border-radius: var(--radius-md);
              text-align: center;
            ">
              <div style="font-weight: var(--weight-medium); margin-bottom: var(--size-2);">Blur ${size.toUpperCase()}</div>
              <code style="font-size: var(--scale-00);">--blur-${size}</code>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      
      <div style="margin-top: var(--size-6); padding: var(--size-4); background: var(--pico-primary-background); border-radius: var(--radius-md); border: 1px solid var(--pico-primary-border);">
        <p style="margin: 0; font-size: var(--scale-0); color: var(--pico-primary-inverse);">
          <strong>Note:</strong> Backdrop blur effects work best with semi-transparent backgrounds. 
          Use <code style="color: var(--pico-primary-inverse);">rgba()</code> colors with opacity for best results.
        </p>
      </div>
    </div>
  `,
};

export const Easing: StoryObj = {
  name: 'Easing Functions',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Easing Functions</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Cubic bezier easing functions for smooth, natural animations and transitions. Hover over each box to see the easing curve in action.
      </p>
      
      <div style="display: grid; gap: var(--size-6);">
        ${[
          ['Sine', ['in-sine', 'out-sine', 'in-out-sine']],
          ['Quad', ['in-quad', 'out-quad', 'in-out-quad']],
          ['Cubic', ['in-cubic', 'out-cubic', 'in-out-cubic']],
          ['Quart', ['in-quart', 'out-quart', 'in-out-quart']],
          ['Back', ['in-back', 'out-back', 'in-out-back']],
        ]
          .map(
            ([family, easings], familyIdx) => `
          <div>
            <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2); color: var(--color-text);">${family}</h3>
            <div style="display: grid; gap: var(--size-3);">
              ${(easings as string[])
                .map(
                  (easing, idx) => {
                    const boxId = familyIdx * 3 + idx;
                    return `
                <div 
                  style="
                    padding: var(--size-3);
                    background: var(--pico-card-sectioning-background-color);
                    border-radius: var(--radius-md);
                    position: relative;
                    overflow: hidden;
                  "
                >
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--size-2);">
                    <code style="font-size: var(--scale-00);">--ease-${easing}</code>
                    <span style="font-size: var(--scale-00); color: var(--pico-muted-color);">Hover to demo</span>
                  </div>
                  <div 
                    class="demo-box-${boxId}"
                    style="
                      width: 40px;
                      height: 8px;
                      background: var(--pico-primary);
                      border-radius: var(--radius-full);
                    "
                  ></div>
                </div>
              `}
                )
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      
      <div style="margin-top: var(--size-8); padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
        <h4 style="margin-bottom: var(--size-3); color: var(--color-text);">Usage Example</h4>
        <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-sm); overflow-x: auto;"><code>.button {
  transition: all 200ms var(--ease-out-cubic);
}

.modal {
  animation: slideIn 300ms var(--ease-out-back);
}</code></pre>
      </div>
    </div>
  `,
};

export const Layers: StoryObj = {
  name: 'Z-Index Layers',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Z-Index Layers</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Consistent layering system for managing stacking contexts.
      </p>
      
      <div style="position: relative; height: 400px; background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-lg); padding: var(--size-4);">
        ${[
          ['below', '-1', 'Behind other elements', '10%', '60%'],
          ['1', '10', 'Base layer', '20%', '50%'],
          ['2', '20', 'Dropdowns', '30%', '40%'],
          ['3', '30', 'Sticky headers', '40%', '30%'],
          ['4', '40', 'Overlays', '50%', '20%'],
          ['5', '50', 'Modals', '60%', '10%'],
          ['top', '2147483647', 'Always on top', '70%', '5%'],
        ]
          .map(
            ([name, value, description, top, left]) => `
          <div style="
            position: absolute;
            top: ${top};
            left: ${left};
            padding: var(--size-4);
            background: var(--pico-card-background-color);
            border: 2px solid var(--pico-primary);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            z-index: var(--layer-${name});
            min-width: 200px;
          ">
            <div style="font-weight: var(--weight-bold); margin-bottom: var(--size-1); color: var(--color-text);">
              --layer-${name}
            </div>
            <div style="font-size: var(--scale-00); color: var(--pico-muted-color); margin-bottom: var(--size-2);">
              z-index: ${value}
            </div>
            <div style="font-size: var(--scale-00); color: var(--color-text);">
              ${description}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      
      <div style="margin-top: var(--size-8); display: grid; gap: var(--size-4);">
        <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <strong>--layer-below (-1):</strong> For elements that should appear behind others
        </div>
        <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <strong>--layer-1 to --layer-5 (10-50):</strong> Progressive layering for different UI elements
        </div>
        <div style="padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
          <strong>--layer-top:</strong> Maximum z-index for elements that must always be on top
        </div>
      </div>
    </div>
  `,
};
