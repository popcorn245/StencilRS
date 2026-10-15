import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Gallery',
  parameters: {
    docs: {
      description: {
        component:
          'A slot-based image gallery with scroll-snap navigation, prev/next arrows, and dot indicators. Pass slides as children with the `.gallery-slide` class.',
      },
    },
  },
};

export default meta;

export const SingleImage: StoryObj = {
  name: 'Single Image',
  render: () => `
    <pop-gallery style="max-width: 500px;">
      <img src="https://picsum.photos/800/600?random=1" class="gallery-slide" alt="Slide 1" />
    </pop-gallery>
  `,
};

export const MultipleImages: StoryObj = {
  name: 'Multiple Images',
  render: () => `
    <pop-gallery style="max-width: 500px;">
      <img src="https://picsum.photos/800/600?random=1" class="gallery-slide" alt="Slide 1" />
      <img src="https://picsum.photos/800/600?random=2" class="gallery-slide" alt="Slide 2" />
      <img src="https://picsum.photos/800/600?random=3" class="gallery-slide" alt="Slide 3" />
    </pop-gallery>
  `,
};

export const ProgrammaticControl: StoryObj = {
  name: 'Programmatic Control',
  render: () => `
    <pop-gallery id="demo-gallery" style="max-width: 500px;">
      <img src="https://picsum.photos/800/600?random=4" class="gallery-slide" alt="Slide 1" />
      <img src="https://picsum.photos/800/600?random=5" class="gallery-slide" alt="Slide 2" />
      <img src="https://picsum.photos/800/600?random=6" class="gallery-slide" alt="Slide 3" />
      <img src="https://picsum.photos/800/600?random=7" class="gallery-slide" alt="Slide 4" />
    </pop-gallery>
    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
      <button onclick="document.getElementById('demo-gallery').prev()">← Prev</button>
      <button onclick="document.getElementById('demo-gallery').goTo(0)">Slide 1</button>
      <button onclick="document.getElementById('demo-gallery').goTo(1)">Slide 2</button>
      <button onclick="document.getElementById('demo-gallery').goTo(2)">Slide 3</button>
      <button onclick="document.getElementById('demo-gallery').goTo(3)">Slide 4</button>
      <button onclick="document.getElementById('demo-gallery').next()">Next →</button>
    </div>
  `,
};

export const Usage: StoryObj = {
  name: 'Usage Guide',
  render: () => `
    <article>
      <h2>PopGallery Component</h2>
      <p>A slot-based image gallery with touch/mouse swiping and keyboard-accessible navigation.</p>
      <h3>Basic Usage</h3>
      <pre><code>&lt;pop-gallery&gt;
  &lt;img src="a.jpg" class="gallery-slide" alt="Slide 1" /&gt;
  &lt;img src="b.jpg" class="gallery-slide" alt="Slide 2" /&gt;
&lt;/pop-gallery&gt;</code></pre>
      <h3>Methods</h3>
      <table>
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>goTo(index)</code></td><td>Navigate to a specific slide (0-based)</td></tr>
          <tr><td><code>next()</code></td><td>Navigate to the next slide</td></tr>
          <tr><td><code>prev()</code></td><td>Navigate to the previous slide</td></tr>
        </tbody>
      </table>
      <h3>CSS Custom Properties</h3>
      <p>The component inherits <code>--radius-lg</code> and <code>--pico-*</code> design tokens.</p>
    </article>
  `,
};
