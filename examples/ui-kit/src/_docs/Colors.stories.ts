import type { Meta, StoryObj } from '@storybook/web-components';
import pollenData from '../../styles/pollen.json';

const meta: Meta = {
  title: 'Docs/Colors',
  parameters: {
    docs: {
      description: {
        component:
          'Pollen includes a comprehensive color palette based on Tailwind colors. Each color has shades from 50 (lightest) to 950 (darkest), with the base color aliasing to the 500 shade.',
      },
    },
  },
};

export default meta;

// Extract color families from JSON
function getColorFamilies() {
  const colors = pollenData.color;
  const families = new Map<string, { name: string; base: string; shades: Map<string, string> }>();

  Object.entries(colors).forEach(([key, value]) => {
    // Skip rgb and var() values
    if (key.startsWith('rgb') || typeof value === 'string' && value.startsWith('var(')) return;
    
    // Parse color-shade pattern (e.g., "grey-500")
    const match = key.match(/^([a-z]+)-(\d+)$/);
    if (match) {
      const [, colorName, shade] = match;
      if (!families.has(colorName)) {
        families.set(colorName, {
          name: colorName.charAt(0).toUpperCase() + colorName.slice(1),
          base: colorName,
          shades: new Map(),
        });
      }
      families.get(colorName)!.shades.set(shade, value as string);
    }
  });

  return Array.from(families.values());
}

const colorFamilies = getColorFamilies();

function renderColorFamily(family: { name: string; base: string; shades: Map<string, string> }) {
  const shadeEntries = Array.from(family.shades.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  
  return `
    <div style="margin-bottom: var(--size-8);">
      <h3 style="margin-bottom: var(--size-4); font-size: var(--scale-3); color: var(--color-text);">${family.name}</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--size-4);">
        ${shadeEntries
          .map(
            ([shade, color]) => `
          <div style="text-align: center;">
            <div style="
              background: ${color}; 
              height: 80px; 
              border-radius: var(--radius-md);
              border: 1px solid var(--pico-muted-border-color);
              margin-bottom: var(--size-2);
            "></div>
            <div style="font-size: var(--scale-00); color: var(--pico-muted-color);">
              <div style="font-weight: var(--weight-medium); color: var(--color-text);">${shade}</div>
              <code style="font-size: var(--scale-000);">--color-${family.base}-${shade}</code>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

export const ColorPalette: StoryObj = {
  name: 'Color Palette',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Pollen Color Palette</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Each color family includes multiple shades. Use <code>var(--color-{name}-{shade})</code> to apply colors.
        The base color (e.g. <code>var(--color-blue)</code>) aliases to the 500 shade.
      </p>
      ${colorFamilies.map(family => renderColorFamily(family)).join('')}
    </div>
  `,
};

export const SemanticColors: StoryObj = {
  name: 'Semantic Colors',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">Semantic Colors</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Theme colors that adapt to light and dark modes.
      </p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--size-6);">
        <div>
          <div style="
            background: var(--color-bg); 
            height: 100px; 
            border-radius: var(--radius-md);
            border: 1px solid var(--pico-muted-border-color);
            margin-bottom: var(--size-3);
          "></div>
          <h4 style="margin-bottom: var(--size-2); color: var(--color-text);">Background</h4>
          <code style="font-size: var(--scale-00);">--color-bg</code>
          <p style="font-size: var(--scale-00); color: var(--pico-muted-color); margin-top: var(--size-2);">
            Primary background color
          </p>
        </div>
        
        <div>
          <div style="
            background: var(--color-text); 
            height: 100px; 
            border-radius: var(--radius-md);
            margin-bottom: var(--size-3);
          "></div>
          <h4 style="margin-bottom: var(--size-2); color: var(--color-text);">Text</h4>
          <code style="font-size: var(--scale-00);">--color-text</code>
          <p style="font-size: var(--scale-00); color: var(--pico-muted-color); margin-top: var(--size-2);">
            Primary text color
          </p>
        </div>
        
        <div>
          <div style="
            background: var(--pico-primary); 
            height: 100px; 
            border-radius: var(--radius-md);
            margin-bottom: var(--size-3);
          "></div>
          <h4 style="margin-bottom: var(--size-2); color: var(--color-text);">Primary</h4>
          <code style="font-size: var(--scale-00);">--color-blue</code>
          <p style="font-size: var(--scale-00); color: var(--pico-muted-color); margin-top: var(--size-2);">
            Primary action color
          </p>
        </div>
        
        <div>
          <div style="
            background: var(--color-red); 
            height: 100px; 
            border-radius: var(--radius-md);
            margin-bottom: var(--size-3);
          "></div>
          <h4 style="margin-bottom: var(--size-2); color: var(--color-text);">Error</h4>
          <code style="font-size: var(--scale-00);">--color-red</code>
          <p style="font-size: var(--scale-00); color: var(--pico-muted-color); margin-top: var(--size-2);">
            Error and danger states
          </p>
        </div>
        
        <div>
          <div style="
            background: var(--color-green); 
            height: 100px; 
            border-radius: var(--radius-md);
            margin-bottom: var(--size-3);
          "></div>
          <h4 style="margin-bottom: var(--size-2); color: var(--color-text);">Success</h4>
          <code style="font-size: var(--scale-00);">--color-green</code>
          <p style="font-size: var(--scale-00); color: var(--pico-muted-color); margin-top: var(--size-2);">
            Success states
          </p>
        </div>
        
        <div>
          <div style="
            background: var(--color-yellow); 
            height: 100px; 
            border-radius: var(--radius-md);
            margin-bottom: var(--size-3);
          "></div>
          <h4 style="margin-bottom: var(--size-2); color: var(--color-text);">Warning</h4>
          <code style="font-size: var(--scale-00);">--color-yellow</code>
          <p style="font-size: var(--scale-00); color: var(--pico-muted-color); margin-top: var(--size-2);">
            Warning states
          </p>
        </div>
      </div>
    </div>
  `,
};

export const RGBColors: StoryObj = {
  name: 'RGB Values',
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-6); font-size: var(--scale-5); color: var(--color-text);">RGB Color Values</h2>
      <p style="margin-bottom: var(--size-8); max-width: var(--prose-lg); color: var(--pico-muted-color);">
        Each color also has an RGB variant (without the <code>rgb()</code> wrapper) for use with opacity.
        Use these with <code>rgba(var(--color-rgb-{name}), opacity)</code>.
      </p>
      
      <div style="display: grid; gap: var(--size-4); max-width: 600px;">
        <div style="
          background: rgba(${pollenData.color['rgb-blue-500']}, 0.1); 
          padding: var(--size-4); 
          border-radius: var(--radius-md);
          border: 1px solid rgba(${pollenData.color['rgb-blue-500']}, 0.3);
        ">
          <code>rgba(var(--color-rgb-blue), 0.1)</code>
          <p style="margin-top: var(--size-2); font-size: var(--scale-00);">10% opacity</p>
        </div>
        
        <div style="
          background: rgba(${pollenData.color['rgb-blue-500']}, 0.25); 
          padding: var(--size-4); 
          border-radius: var(--radius-md);
          border: 1px solid rgba(${pollenData.color['rgb-blue-500']}, 0.5);
        ">
          <code>rgba(var(--color-rgb-blue), 0.25)</code>
          <p style="margin-top: var(--size-2); font-size: var(--scale-00);">25% opacity</p>
        </div>
        
        <div style="
          background: rgba(${pollenData.color['rgb-blue-500']}, 0.5); 
          padding: var(--size-4); 
          border-radius: var(--radius-md);
          border: 1px solid rgba(${pollenData.color['rgb-blue-500']}, 0.7);
          color: white;
        ">
          <code style="color: white;">rgba(var(--color-rgb-blue), 0.5)</code>
          <p style="margin-top: var(--size-2); font-size: var(--scale-00);">50% opacity</p>
        </div>
        
        <div style="
          background: rgba(${pollenData.color['rgb-blue-500']}, 1); 
          padding: var(--size-4); 
          border-radius: var(--radius-md);
          color: white;
        ">
          <code style="color: white;">rgba(var(--color-rgb-blue), 1)</code>
          <p style="margin-top: var(--size-2); font-size: var(--scale-00); color: rgba(255,255,255,0.9);">100% opacity</p>
        </div>
      </div>
    </div>
  `,
};
