import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Carousel',
  parameters: {
    docs: {
      description: {
        component:
          'A responsive carousel component with gallery mode support. Built with StencilJS for better TypeScript support and reactivity.',
      },
    },
  },
};

export default meta;

export const BasicCarousel: StoryObj = {
  name: 'Basic Carousel',
  render: () => `
    <pop-carousel class="loading">
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=1" alt="Slide 1" />
      </div>
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=2" alt="Slide 2" />
      </div>
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=3" alt="Slide 3" />
      </div>
    </pop-carousel>
  `,
};

export const WithContent: StoryObj = {
  name: 'With Text Content',
  render: () => `
    <pop-carousel class="loading">
      <div class="slide" style="background: var(--pico-color-blue-100); padding: 3rem; text-align: center;">
        <h2>Slide 1</h2>
        <p>This is the first slide with custom content.</p>
      </div>
      <div class="slide" style="background: var(--pico-color-purple-100); padding: 3rem; text-align: center;">
        <h2>Slide 2</h2>
        <p>This is the second slide with different styling.</p>
      </div>
      <div class="slide" style="background: var(--pico-color-cyan-100); padding: 3rem; text-align: center;">
        <h2>Slide 3</h2>
        <p>This is the third slide.</p>
      </div>
    </pop-carousel>
  `,
};

export const ProgrammaticControl: StoryObj = {
  name: 'Programmatic Control',
  render: () => `
    <pop-carousel id="controlled-carousel" class="loading">
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=4" alt="Slide 1" />
      </div>
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=5" alt="Slide 2" />
      </div>
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=6" alt="Slide 3" />
      </div>
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=7" alt="Slide 4" />
      </div>
    </pop-carousel>
    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center;">
      <button onclick="(document.getElementById('controlled-carousel')).slideTo(0)">Slide 1</button>
      <button onclick="(document.getElementById('controlled-carousel')).slideTo(1)">Slide 2</button>
      <button onclick="(document.getElementById('controlled-carousel')).slideTo(2)">Slide 3</button>
      <button onclick="(document.getElementById('controlled-carousel')).slideTo(3)">Slide 4</button>
      <button class="secondary" onclick="(document.getElementById('controlled-carousel')).viewGallery()">
        View Gallery
      </button>
    </div>
  `,
};

export const Usage: StoryObj = {
  name: 'Usage Guide',
  render: () => `
    <article>
      <h2>PopCarousel Component</h2>
      <p>
        A fully-featured carousel component built with StencilJS. Provides better TypeScript support and reactivity
        compared to vanilla web components.
      </p>
      <h3>Features</h3>
      <ul>
        <li>✅ Built with StencilJS</li>
        <li>✅ Full TypeScript support</li>
        <li>✅ Responsive and accessible</li>
        <li>✅ Previous/Next navigation</li>
        <li>✅ Gallery mode (grid view)</li>
        <li>✅ Programmatic control with async methods</li>
        <li>✅ Auto-adjusts height</li>
        <li>✅ Smooth transitions</li>
        <li>✅ Shadow DOM for style encapsulation</li>
      </ul>
      <h3>Basic Usage</h3>
      <pre>
        <code><pop-carousel class="loading">
  <div class="slide">
    <img src="image1.jpg" alt="Slide 1" />
  </div>
  <div class="slide">
    <img src="image2.jpg" alt="Slide 2" />
  </div>
</pop-carousel></code>
      </pre>
      <h3>In Astro</h3>
      <pre>
        <code>---
// Carousel.astro
import '@popcorn245/ui-kit';
---

<pop-carousel class="loading">
  <div class="slide">
    <slot />
  </div>
</pop-carousel></code>
      </pre>
      <h3>In React</h3>
      <pre>
        <code>import '@popcorn245/ui-kit';

function App() {
  const handleSlideChange = async () => {
    const carousel = document.getElementById('my-carousel');
    await carousel.slideTo(2);
  };

  return (
    <pop-carousel id="my-carousel" className="loading">
      <div className="slide">
        <img src="image.jpg" alt="Slide" />
      </div>
    </pop-carousel>
  );
}</code>
      </pre>
      <h3>Methods</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>slideTo(index: number): Promise&lt;void&gt;</code>
            </td>
            <td>Navigate to a specific slide by index (async method)</td>
          </tr>
          <tr>
            <td>
              <code>viewGallery(): Promise&lt;void&gt;</code>
            </td>
            <td>Enable gallery mode (grid view) (async method)</td>
          </tr>
        </tbody>
      </table>
      <h3>CSS Custom Properties</h3>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>--slide-height</code>
            </td>
            <td>auto</td>
            <td>Height of the carousel (auto-calculated)</td>
          </tr>
          <tr>
            <td>
              <code>--transition-delay-time</code>
            </td>
            <td>0.5s</td>
            <td>Button visibility transition delay</td>
          </tr>
        </tbody>
      </table>
      <h3>Styling</h3>
      <pre>
        <code>/* Customize button appearance */
pop-carousel::part(button) {
  background: var(--pico-primary);
  color: white;
}

/* Adjust grid in gallery mode */
pop-carousel.gallery {
  --grid-columns: 4; /* Default is 3 */
}</code>
      </pre>
      <h3>Why StencilJS?</h3>
      <ul>
        <li>
          <strong>Better TypeScript Support:</strong> Full type definitions and intellisense
        </li>
        <li>
          <strong>Reactive State:</strong> Automatic re-rendering with @State decorators
        </li>
        <li>
          <strong>Better Testing:</strong> Built-in testing utilities
        </li>
        <li>
          <strong>Framework Agnostic:</strong> Works with React, Vue, Angular, or vanilla JS
        </li>
        <li>
          <strong>Smaller Bundle:</strong> Optimized output with lazy loading
        </li>
      </ul>
    </article>
  `,
};
