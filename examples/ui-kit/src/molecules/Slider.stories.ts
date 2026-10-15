import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Slider',
  parameters: {
    docs: {
      description: {
        component:
          'A responsive slider/carousel component with gallery mode support. Built with vanilla JavaScript as a web component.',
      },
    },
  },
};

export default meta;

export const BasicSlider: StoryObj = {
  name: 'Basic Slider',
  render: () => `
    <ui-slider class="loading">
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=1" alt="Slide 1" />
      </div>
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=2" alt="Slide 2" />
      </div>
      <div class="slide">
        <img src="https://picsum.photos/800/400?random=3" alt="Slide 3" />
      </div>
    </ui-slider>
  `,
};

export const WithContent: StoryObj = {
  name: 'With Text Content',
  render: () => `
    <ui-slider class="loading">
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
    </ui-slider>
  `,
};

export const ProgrammaticControl: StoryObj = {
  name: 'Programmatic Control',
  render: () => `
    <ui-slider id="controlled-slider" class="loading">
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
    </ui-slider>
    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center;">
      <button onclick="(document.getElementById('controlled-slider')).slideTo(0)">Slide 1</button>
      <button onclick="(document.getElementById('controlled-slider')).slideTo(1)">Slide 2</button>
      <button onclick="(document.getElementById('controlled-slider')).slideTo(2)">Slide 3</button>
      <button onclick="(document.getElementById('controlled-slider')).slideTo(3)">Slide 4</button>
      <button class="secondary" onclick="(document.getElementById('controlled-slider')).viewGallery()">
        View Gallery
      </button>
    </div>
  `,
};

export const Usage: StoryObj = {
  name: 'Usage Guide',
  render: () => `
    <article>
      <h2>Slider Component</h2>
      <p>A fully-featured slider/carousel component built as a web component using vanilla JavaScript.</p>
      <h3>Features</h3>
      <ul>
        <li>✅ Responsive and accessible</li>
        <li>✅ Previous/Next navigation</li>
        <li>✅ Gallery mode (grid view)</li>
        <li>✅ Programmatic control</li>
        <li>✅ Auto-adjusts height</li>
        <li>✅ Smooth transitions</li>
      </ul>
      <h3>Basic Usage</h3>
      <pre>
        <code><ui-slider class="loading">
<div class="slide">
  <img src="image1.jpg" alt="Slide 1" />
</div>
<div class="slide">
  <img src="image2.jpg" alt="Slide 2" />
</div>
</ui-slider></code>
      </pre>
      <h3>In Astro</h3>
      <pre>
        <code>---
// Carousel.astro
import '@popcorn245/ui-kit/components/Slider.js';
import Icon from './Icon.astro';
---

<ui-slider class="loading">
  <div class="slide">
    <slot />
  </div>
</ui-slider></code>
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
              <code>slideTo(index: number)</code>
            </td>
            <td>Navigate to a specific slide by index</td>
          </tr>
          <tr>
            <td>
              <code>viewGallery()</code>
            </td>
            <td>Enable gallery mode (grid view of all slides)</td>
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
            <td>Height of the slider (auto-calculated)</td>
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
ui-slider::part(button) {
  background: var(--pico-primary);
  color: white;
}

/* Adjust grid in gallery mode */
ui-slider.gallery {
  --grid-columns: 4; /* Default is 3 */
}</code>
      </pre>
    </article>
  `,
};
