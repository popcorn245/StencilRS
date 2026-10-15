import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Image',
  parameters: {
    docs: {
      description: {
        component: 'Image elements with responsive styling by Pico CSS.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h2 style="margin-bottom: var(--size-4);">Images</h2>
      <p style="margin-bottom: var(--size-6); color: var(--pico-muted-color);">
        Responsive image styling with proper aspect ratios and accessibility.
      </p>
      
      <div style="display: grid; gap: var(--size-6);">
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Responsive Image</h3>
          <img 
            src="https://picsum.photos/800/400" 
            alt="Responsive image example"
            style="max-width: 100%; height: auto;"
          />
          <p style="margin-top: var(--size-2); font-size: var(--scale-00); color: var(--pico-muted-color);">
            Images are responsive by default and scale with their container.
          </p>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Image with Figure & Caption</h3>
          <figure>
            <img 
              src="https://picsum.photos/600/400" 
              alt="Figure with caption"
            />
            <figcaption>
              This is a caption explaining the image above. Use <code>&lt;figure&gt;</code> and <code>&lt;figcaption&gt;</code> for semantic image descriptions.
            </figcaption>
          </figure>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Images in Grid</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--size-4);">
            <img 
              src="https://picsum.photos/300/200?random=1" 
              alt="Grid image 1"
            />
            <img 
              src="https://picsum.photos/300/200?random=2" 
              alt="Grid image 2"
            />
            <img 
              src="https://picsum.photos/300/200?random=3" 
              alt="Grid image 3"
            />
          </div>
        </div>
        
        <div>
          <h3 style="margin-bottom: var(--size-3); font-size: var(--scale-2);">Rounded Images</h3>
          <div style="display: flex; gap: var(--size-4); flex-wrap: wrap; align-items: center;">
            <img 
              src="https://picsum.photos/150?random=4" 
              alt="Small rounded"
              style="border-radius: var(--radius-sm); width: 150px;"
            />
            <img 
              src="https://picsum.photos/150?random=5" 
              alt="Medium rounded"
              style="border-radius: var(--radius-md); width: 150px;"
            />
            <img 
              src="https://picsum.photos/150?random=6" 
              alt="Large rounded"
              style="border-radius: var(--radius-lg); width: 150px;"
            />
            <img 
              src="https://picsum.photos/150?random=7" 
              alt="Fully rounded"
              style="border-radius: var(--radius-full); width: 150px; height: 150px; object-fit: cover;"
            />
          </div>
        </div>
      </div>
      
      <div style="margin-top: var(--size-8); padding: var(--size-4); background: var(--pico-card-sectioning-background-color); border-radius: var(--radius-md);">
        <h4 style="margin-bottom: var(--size-3);">Usage</h4>
        <pre style="background: var(--pico-code-background-color); color: var(--pico-code-color); padding: var(--size-4); border-radius: var(--radius-sm); overflow-x: auto;"><code>&lt;img src="image.jpg" alt="Description"&gt;

&lt;figure&gt;
  &lt;img src="image.jpg" alt="Description"&gt;
  &lt;figcaption&gt;Caption text&lt;/figcaption&gt;
&lt;/figure&gt;

&lt;!-- Rounded corners --&gt;
&lt;img src="image.jpg" alt="Description" 
     style="border-radius: var(--radius-md);"&gt;</code></pre>
      </div>
    </div>
  `,
};
