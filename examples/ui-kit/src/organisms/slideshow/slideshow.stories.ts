import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Slideshow',
  argTypes: {
    theme: {
      control: 'select',
      options: ['black', 'white', 'league', 'beige', 'moon', 'night', 'serif', 'simple', 'solarized', 'blood', 'sky', 'dracula'],
    },
    transition: {
      control: 'select',
      options: ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'],
    },
    autoSlide: { control: 'number' },
    loop: { control: 'boolean' },
    controls: { control: 'boolean' },
    progress: { control: 'boolean' },
    embedded: { control: 'boolean' },
    slideNumber: { control: 'boolean' },
    fullscreen: { control: 'boolean' },
  },
  parameters: {
    actions: {
      handles: ['popSlideChanged', 'popSlideshowReady'],
    },
  },
};

export default meta;

export const Basic: StoryObj = {
  name: 'Basic',
  render: (args) => `
    <div style="height: 500px; width: 800px; border: 1px solid #333;">
      <pop-slideshow
        theme="${args.theme || 'black'}"
        transition="${args.transition || 'slide'}"
        controls="${args.controls !== false}"
        progress="${args.progress !== false}"
        embedded="true"
      >
        <div><h1>Slide One</h1><p>Welcome to the presentation</p></div>
        <div><h2>Slide Two</h2><p>Here is some content</p></div>
        <div><h2>Slide Three</h2><p>The end!</p></div>
      </pop-slideshow>
    </div>
  `,
  args: {
    theme: 'black',
    transition: 'slide',
    controls: true,
    progress: true,
  },
};

export const VerticalSlides: StoryObj = {
  name: 'Vertical Slides',
  render: (args) => `
    <div style="height: 500px; width: 800px; border: 1px solid #333;">
      <pop-slideshow theme="${args.theme || 'moon'}" embedded="true">
        <div><h1>Horizontal 1</h1></div>
        <div data-vertical>
          <div><h2>Vertical 2a</h2><p>Navigate down</p></div>
          <div><h2>Vertical 2b</h2><p>Sub-section content</p></div>
          <div><h2>Vertical 2c</h2><p>More detail here</p></div>
        </div>
        <div><h1>Horizontal 3</h1></div>
      </pop-slideshow>
    </div>
  `,
  args: {
    theme: 'moon',
  },
};

export const Themed: StoryObj = {
  name: 'Themed',
  render: (args) => `
    <div style="height: 500px; width: 800px; border: 1px solid #333;">
      <pop-slideshow
        theme="${args.theme || 'dracula'}"
        transition="${args.transition || 'fade'}"
        embedded="true"
      >
        <div><h1>Theme Demo</h1><p>Switch themes in the controls panel</p></div>
        <div><h2>Code Example</h2><pre><code>const x = 42;</code></pre></div>
        <div><h2>Lists</h2><ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul></div>
      </pop-slideshow>
    </div>
  `,
  args: {
    theme: 'dracula',
    transition: 'fade',
  },
};

export const AutoPlaying: StoryObj = {
  name: 'Auto-playing',
  render: (args) => `
    <div style="height: 500px; width: 800px; border: 1px solid #333;">
      <pop-slideshow
        theme="night"
        auto-slide="${args.autoSlide || 3000}"
        loop="${args.loop !== false}"
        embedded="true"
      >
        <div><h1>Auto Slide 1</h1><p>Advances every 3 seconds</p></div>
        <div><h2>Auto Slide 2</h2><p>Loops continuously</p></div>
        <div><h2>Auto Slide 3</h2><p>Back to start...</p></div>
      </pop-slideshow>
    </div>
  `,
  args: {
    autoSlide: 3000,
    loop: true,
  },
};

export const WithPlugins: StoryObj = {
  name: 'With Plugins',
  render: (args) => `
    <div style="height: 500px; width: 800px; border: 1px solid #333;">
      <pop-slideshow
        theme="black"
        plugins='${JSON.stringify(args.plugins || ['Highlight'])}'
        embedded="true"
      >
        <div><h1>Plugin Demo</h1><p>Highlight.js enabled</p></div>
        <div>
          <h2>Syntax Highlighting</h2>
          <pre><code class="language-javascript">
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
          </code></pre>
        </div>
        <div><h2>The End</h2></div>
      </pop-slideshow>
    </div>
  `,
  args: {
    plugins: ['Highlight'],
  },
};

export const EventLogging: StoryObj = {
  name: 'Event Logging',
  render: () => `
    <div style="height: 500px; width: 800px; border: 1px solid #333;">
      <pop-slideshow theme="serif" embedded="true">
        <div><h1>Event Demo</h1><p>Navigate and check the Actions panel</p></div>
        <div><h2>Slide 2</h2><p>popSlideChanged fires on each transition</p></div>
        <div><h2>Slide 3</h2><p>Check the indexH and indexV values</p></div>
        <div data-vertical>
          <div><h2>Vertical 4a</h2></div>
          <div><h2>Vertical 4b</h2></div>
        </div>
      </pop-slideshow>
    </div>
  `,
};
