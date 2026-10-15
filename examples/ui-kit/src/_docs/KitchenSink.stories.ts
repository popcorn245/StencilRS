import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Docs/Kitchen Sink',
  parameters: {
    docs: {
      description: {
        component:
          'A comprehensive example showcasing all Pico CSS components and elements in one page. Perfect for testing themes and CSS variable customizations.',
      },
    },
  },
};

export default meta;

export const FullExample: StoryObj = {
  name: 'Complete Kitchen Sink',
  render: (args) => {
    const style = Object.entries(args).reduce((acc, [key, value]) => {
      return `${acc} --pico-${key}: ${value};`;
    }, '');

    return `
      <div style="${style}">
        <main class="container">
          <nav>
            <ul>
              <li><strong>My Brand</strong></li>
            </ul>
            <ul>
              <li><a href="#">Nav 1</a></li>
              <li><a href="#">Nav 2</a></li>
              <li><a href="#" role="button">Nav Button</a></li>
            </ul>
          </nav>
          <header>
            <hgroup>
              <h1>HTML Kitchen Sink</h1>
              <h2>A test page for all semantic elements</h2>
            </hgroup>
          </header>
          <section>
            <h2>Typography</h2>
            <p>This is a paragraph. It can contain <strong>bold text</strong>, <em>italic text</em>, <mark>marked text</mark>, <del>deleted text</del>, <ins>inserted text</ins>, <sup>superscript</sup>, <sub>subscript</sub>, <code>inline code</code>, <kbd>Ctrl+S</kbd>, and <a href="#">a link</a>.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <blockquote>
              "This is a blockquote. It's great for pulling out quotes."
              <footer>
                <cite>- A famous person</cite>
              </footer>
            </blockquote>
            <pre><code><!-- This is a preformatted code block -->
      <main>
        <h1>Hello, World!</h1>
      </main></code></pre>
            <h3>Headings</h3>
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <h3>Heading 3</h3>
            <h4>Heading 4</h4>
            <h5>Heading 5</h5>
            <h6>Heading 6</h6>
            <h3>Lists</h3>
            <ul>
              <li>Unordered list item 1</li>
              <li>Unordered list item 2</li>
              <li>
                Nested list
                <ul>
                  <li>Item 1</li>
                  <li>Item 2</li>
                </ul>
              </li>
            </ul>
            <ol>
              <li>Ordered list item 1</li>
              <li>Ordered list item 2</li>
            </ol>
            <dl>
              <dt>Description Term</dt>
              <dd>Description Details</dd>
              <dt>Another Term</dt>
              <dd>More details</dd>
            </dl>
          </section>
          <hr />
          <section>
            <h2>Buttons</h2>
            <p>
              <button>Primary</button>
              <button class="secondary">Secondary</button>
              <button class="contrast">Contrast</button>
            </p>
            <p>
              <a href="#" role="button">Link as Primary</a>
              <a href="#" role="button" class="secondary">Link as Secondary</a>
              <a href="#" role="button" class="contrast">Link as Contrast</a>
            </p>
            <p>
              <a href="#" role="button" class="outline">Outline</a>
              <a href="#" role="button" class="secondary outline">Outline Sec.</a>
              <a href="#" role="button" class="contrast outline">Outline Con.</a>
            </p>
          </section>
          <hr />
          <section>
            <h2>Form Elements</h2>
            <form>
              <div class="grid">
                <label for="text-input">
                  Text Input
                  <input type="text" id="text-input" name="text-input" placeholder="Text Input" />
                </label>
                <label for="email-input">
                  Email Input
                  <input type="email" id="email-input" name="email-input" placeholder="Email Input" value="test@example.com" />
                </label>
              </div>
              <label for="password-input">Password</label>
              <input type="password" id="password-input" name="password-input" placeholder="Password" value="123456" />
              <label for="search-input">Search</label>
              <input type="search" id="search-input" name="search-input" placeholder="Search" />
              <label for="select-input">Select</label>
              <select id="select-input" name="select-input">
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
                <option value="3">Option 3</option>
              </select>
              <label for="textarea-input">Textarea</label>
              <textarea id="textarea-input" name="textarea-input" rows="5" placeholder="Textarea"></textarea>
              <fieldset>
                <legend>Checkboxes</legend>
                <label for="checkbox-1">
                  <input type="checkbox" id="checkbox-1" name="checkbox-1" checked />
                  Checkbox 1
                </label>
                <label for="checkbox-2">
                  <input type="checkbox" id="checkbox-2" name="checkbox-2" />
                  Checkbox 2
                </label>
              </fieldset>
              <fieldset>
                <legend>Radio Buttons</legend>
                <label for="radio-1">
                  <input type="radio" id="radio-1" name="radio-group" value="1" checked />
                  Radio 1
                </label>
                <label for="radio-2">
                  <input type="radio" id="radio-2" name="radio-group" value="2" />
                  Radio 2
                </label>
              </fieldset>
              <fieldset>
                <legend>Switches</legend>
                <label for="switch-1">
                  <input type="checkbox" id="switch-1" name="switch-1" role="switch" checked />
                  Switch 1
                </label>
                <label for="switch-2">
                  <input type="checkbox" id="switch-2" name="switch-2" role="switch" />
                  Switch 2
                </label>
              </fieldset>
              <label for="range-input">
                Range Input
                <input type="range" id="range-input" name="range-input" min="0" max="100" value="50" />
              </label>
              <div class="grid">
                <label for="date-input">
                  Date
                  <input type="date" id="date-input" name="date-input" />
                </label>
                <label for="time-input">
                  Time
                  <input type="time" id="time-input" name="time-input" />
                </label>
                <label for="color-input">
                  Color
                  <input type="color" id="color-input" name="color-input" value="#a7d129" />
                </label>
              </div>
              <label for="file-input">File input</label>
              <input type="file" id="file-input" name="file-input" />
              <hr />
              <input type="reset" value="Reset" class="secondary" />
              <input type="submit" value="Submit" />
            </form>
          </section>
          <hr />
          <section>
            <h2>Table</h2>
            <figure>
              <table>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Header</th>
                    <th scope="col">Header</th>
                    <th scope="col">Header</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">1</th>
                    <td>Cell</td>
                    <td>Cell</td>
                    <td>Cell</td>
                  </tr>
                  <tr>
                    <th scope="row">2</th>
                    <td>Cell</td>
                    <td>Cell</td>
                    <td>Cell</td>
                  </tr>
                  <tr>
                    <th scope="row">3</th>
                    <td>Cell</td>
                    <td>Cell</td>
                    <td>Cell</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                  </tr>
                </tfoot>
              </table>
            </figure>
          </section>
          <hr />
          <section>
            <h2>Interactive Elements</h2>
            <details>
              <summary>Accordion 1</summary>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque et lacus eget mauris reiiciendis.</p>
            </details>
            <details open>
              <summary>Accordion 2 (Open)</summary>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque et lacus eget mauris reiciendis.</p>
            </details>
            <article>
              <header>
                <hgroup>
                  <h3>Article Title</h3>
                  <p>Article subtitle</p>
                </hgroup>
              </header>
              <p>This is content within an <code><article></code> tag. It's often card-like.</p>
              <footer><small>Article footer</small></footer>
            </article>
            <progress value="25" max="100"></progress>
            <progress></progress>
            <dialog id="modal-example">
              <article>
                <header>
                  <a href="#close" aria-label="Close" class="close" data-target="modal-example" onclick="event.preventDefault(); document.getElementById('modal-example').open = false;"></a>
                  Modal Title
                </header>
                <p>This is a modal. You can put any content here.</p>
                <footer>
                  <button class="secondary" data-target="modal-example" onclick="event.preventDefault(); document.getElementById('modal-example').open = false;">Cancel</button>
                  <button data-target="modal-example" onclick="event.preventDefault(); document.getElementById('modal-example').open = false;">Confirm</button>
                </footer>
              </article>
            </dialog>
            <button data-target="modal-example" onclick="event.preventDefault(); document.getElementById('modal-example').open = true;">
              Open Modal
            </button>
          </section>
        </main>
        <footer class="container">
          <small>
            <a href="#">Footer Link</a> • <a href="#">Another Link</a>
          </small>
        </footer>
      </div>
    `;
  },
  args: {
    'font-family': 'system-ui, sans-serif',
    'line-height': '1.5',
    'font-weight': '400',
    'font-size': '100%',
    'border-radius': '0.25rem',
    'border-width': '0.0625rem',
    'outline-width': '0.125rem',
    'spacing': '1rem',
    'typography-spacing-vertical': '1rem',
    'primary': '#0172ad',
    'primary-background': '#0172ad',
    'primary-border': '#0172ad',
    'primary-hover': '#015887',
    'primary-hover-background': '#02659a',
    'primary-focus': 'rgba(2, 154, 232, 0.5)',
    'primary-inverse': '#fff',
    'secondary': '#5d6b89',
    'secondary-background': '#525f7a',
    'secondary-border': '#525f7a',
    'secondary-hover': '#48536b',
    'secondary-hover-background': '#48536b',
    'secondary-focus': 'rgba(93, 107, 137, 0.25)',
    'secondary-inverse': '#fff',
    'contrast': '#181c25',
    'contrast-background': '#181c25',
    'contrast-border': '#181c25',
    'contrast-hover': '#000',
    'contrast-hover-background': '#000',
    'contrast-focus': 'rgba(93, 107, 137, 0.25)',
    'contrast-inverse': '#fff',
    'background-color': '#fff',
    'color': '#373c44',
    'h1-color': '#2d3138',
    'h2-color': '#373c44',
    'h3-color': '#424751',
    'h4-color': '#4d535e',
    'h5-color': '#5c6370',
    'h6-color': '#646b79',
    'muted-color': '#646b79',
    'muted-border-color': 'rgb(231, 234, 239.5)',
    'table-border-color': 'rgb(231, 234, 239.5)',
    'table-row-stripped-background-color': 'rgba(111, 120, 135, 0.0375)',
    'form-element-background-color': 'rgb(251, 251.5, 252.25)',
    'form-element-border-color': '#cfd5e2',
    'form-element-color': '#23262c',
    'form-element-placeholder-color': '#646b79',
    'form-element-active-background-color': '#fff',
    'form-element-active-border-color': '#0172ad',
    'form-element-focus-color': '#0172ad',
    'form-element-invalid-border-color': 'rgb(183.5, 105.5, 106.5)',
    'form-element-invalid-active-border-color': 'rgb(200.25, 79.25, 72.25)',
    'form-element-invalid-focus-color': 'rgb(200.25, 79.25, 72.25)',
    'form-element-valid-border-color': 'rgb(76, 154.5, 137.5)',
    'form-element-valid-active-border-color': 'rgb(39, 152.75, 118.75)',
    'form-element-valid-focus-color': 'rgb(39, 152.75, 118.75)',
    'switch-background-color': '#bfc7d9',
    'switch-checked-background-color': '#0172ad',
    'switch-color': '#fff',
    'range-border-color': '#dfe3eb',
    'range-active-border-color': '#bfc7d9',
    'range-thumb-border-color': '#fff',
    'range-thumb-color': '#525f7a',
    'range-thumb-active-color': '#0172ad',
    'accordion-border-color': 'rgb(231, 234, 239.5)',
    'accordion-active-summary-color': '#015887',
    'accordion-close-summary-color': '#373c44',
    'accordion-open-summary-color': '#646b79',
    'card-background-color': '#fff',
    'card-border-color': 'rgb(231, 234, 239.5)',
    'card-sectioning-background-color': 'rgb(251, 251.5, 252.25)',
    'dropdown-background-color': '#fff',
    'dropdown-border-color': '#eff1f4',
    'dropdown-hover-background-color': '#eff1f4',
    'modal-overlay-background-color': 'rgba(232, 234, 237, 0.75)',
    'progress-background-color': '#dfe3eb',
    'progress-color': '#0172ad',
    'tooltip-background-color': '#181c25',
    'tooltip-color': '#fff',
  },
  argTypes: {
    'font-family': { control: 'text' },
    'line-height': { control: 'text' },
    'font-weight': { control: 'text' },
    'font-size': { control: 'text' },
    'border-radius': { control: 'text' },
    'border-width': { control: 'text' },
    'outline-width': { control: 'text' },
    'spacing': { control: 'text' },
    'typography-spacing-vertical': { control: 'text' },
    'primary': { control: 'color' },
    'primary-background': { control: 'color' },
    'primary-border': { control: 'color' },
    'primary-hover': { control: 'color' },
    'primary-hover-background': { control: 'color' },
    'primary-focus': { control: 'color' },
    'primary-inverse': { control: 'color' },
    'secondary': { control: 'color' },
    'secondary-background': { control: 'color' },
    'secondary-border': { control: 'color' },
    'secondary-hover': { control: 'color' },
    'secondary-hover-background': { control: 'color' },
    'secondary-focus': { control: 'color' },
    'secondary-inverse': { control: 'color' },
    'contrast': { control: 'color' },
    'contrast-background': { control: 'color' },
    'contrast-border': { control: 'color' },
    'contrast-hover': { control: 'color' },
    'contrast-hover-background': { control: 'color' },
    'contrast-focus': { control: 'color' },
    'contrast-inverse': { control: 'color' },
    'background-color': { control: 'color' },
    'color': { control: 'color' },
    'h1-color': { control: 'color' },
    'h2-color': { control: 'color' },
    'h3-color': { control: 'color' },
    'h4-color': { control: 'color' },
    'h5-color': { control: 'color' },
    'h6-color': { control: 'color' },
    'muted-color': { control: 'color' },
    'muted-border-color': { control: 'color' },
    'table-border-color': { control: 'color' },
    'table-row-stripped-background-color': { control: 'color' },
    'form-element-background-color': { control: 'color' },
    'form-element-border-color': { control: 'color' },
    'form-element-color': { control: 'color' },
    'form-element-placeholder-color': { control: 'color' },
    'form-element-active-background-color': { control: 'color' },
    'form-element-active-border-color': { control: 'color' },
    'form-element-focus-color': { control: 'color' },
    'form-element-invalid-border-color': { control: 'color' },
    'form-element-invalid-active-border-color': { control: 'color' },
    'form-element-invalid-focus-color': { control: 'color' },
    'form-element-valid-border-color': { control: 'color' },
    'form-element-valid-active-border-color': { control: 'color' },
    'form-element-valid-focus-color': { control: 'color' },
    'switch-background-color': { control: 'color' },
    'switch-checked-background-color': { control: 'color' },
    'switch-color': { control: 'color' },
    'range-border-color': { control: 'color' },
    'range-active-border-color': { control: 'color' },
    'range-thumb-border-color': { control: 'color' },
    'range-thumb-color': { control: 'color' },
    'range-thumb-active-color': { control: 'color' },
    'accordion-border-color': { control: 'color' },
    'accordion-active-summary-color': { control: 'color' },
    'accordion-close-summary-color': { control: 'color' },
    'accordion-open-summary-color': { control: 'color' },
    'card-background-color': { control: 'color' },
    'card-border-color': { control: 'color' },
    'card-sectioning-background-color': { control: 'color' },
    'dropdown-background-color': { control: 'color' },
    'dropdown-border-color': { control: 'color' },
    'dropdown-hover-background-color': { control: 'color' },
    'modal-overlay-background-color': { control: 'color' },
    'progress-background-color': { control: 'color' },
    'progress-color': { control: 'color' },
    'tooltip-background-color': { control: 'color' },
    'tooltip-color': { control: 'color' },
  },
};

export const LightAndDarkMode: StoryObj = {
  name: 'Light and Dark Mode',
  render: () => `
    <article>
      <h2>Light and Dark Mode</h2>
      <p>
        Pico CSS supports light and dark mode out of the box. You can toggle between them by setting the
        <code>data-theme</code> attribute on the <code><html></code> element.
      </p>
      <h3>Light Mode</h3>
      <article data-theme="light">
        <header>Login</header>
        <form>
          <label for="username-light">Username</label>
          <input type="text" id="username-light" name="username-light" placeholder="Username" />
          <label for="password-light">Password</label>
          <input type="password" id="password-light" name="password-light" placeholder="Password" />
          <label for="remember-light">
            <input type="checkbox" id="remember-light" name="remember-light" />
            Remember me
          </label>
          <button type="submit">Login</button>
        </form>
      </article>
      <h3>Dark Mode</h3>
      <article data-theme="dark">
        <header>Login</header>
        <form>
          <label for="username-dark">Username</label>
          <input type="text" id="username-dark" name="username-dark" placeholder="Username" />
          <label for="password-dark">Password</label>
          <input type="password" id="password-dark" name="password-dark" placeholder="Password" />
          <label for="remember-dark">
            <input type="checkbox" id="remember-dark" name="remember-dark" />
            Remember me
          </label>
          <button type="submit">Login</button>
        </form>
      </article>
    </article>
  `,
};

export const ComponentUsage: StoryObj = {
  name: 'Component Usage',
  render: () => `
    <article>
      <h2>Component Usage</h2>
      <p>This UI kit is a StencilJS component library. Here's how to use it in your projects.</p>
      <h3>1. Install the UI Kit</h3>
      <pre><code>npm install @popcorn245/ui-kit</code></pre>
      <h3>2. Import the CSS</h3>
      <p>You need to import the Pico.css base styles and the custom font styles.</p>
      <pre><code>
// In your global CSS file
@import '@popcorn245/ui-kit/dist/components/pico.css';
@import '@popcorn245/ui-kit/dist/assets/fonts.css';
      </code></pre>
      <h3>3. Import the Components</h3>
      <p>To use the web components, you need to import the loader script. This only needs to be done once in your application's entry point.</p>
      <pre><code>
// In your main JavaScript file
import '@popcorn245/ui-kit/loader';
      </code></pre>
      <h3>Example: Using in Astro</h3>
      <pre><code>
---
// src/layouts/Layout.astro
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My Astro App</title>
    <script type="module">
      import '@popcorn245/ui-kit/loader';
    </script>
  </head>
  <body>
    <pop-carousel>
      <div class="slide">Slide 1</div>
      <div class="slide">Slide 2</div>
    </pop-carousel>
  </body>
</html>
      </code></pre>
    </article>
  `,
};
