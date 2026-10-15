import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Grid',
  parameters: {
    docs: {
      description: {
        component:
          'Grid layout using Pico\'s .grid class to organize content. <a href="https://picocss.com/docs/grid">Pico CSS Grid docs</a>',
      },
    },
  },
};

export default meta;

export const TwoColumn: StoryObj = {
  name: 'Two Column Grid',
  render: () => `
    <div class="grid">
      <article>
        <header>Card 1</header>
        <p>Content for the first card</p>
      </article>
      <article>
        <header>Card 2</header>
        <p>Content for the second card</p>
      </article>
    </div>
  `,
  parameters: {
    docs: {
      source: {
        code: `<div class="grid">
  <article>
    <header>Card 1</header>
    <p>Content for the first card</p>
  </article>
  <article>
    <header>Card 2</header>
    <p>Content for the second card</p>
  </article>
</div>`,
      },
    },
  },
};

export const ThreeColumn: StoryObj = {
  name: 'Three Column Grid',
  render: () => `
    <div class="grid">
      <article>
        <header>Feature 1</header>
        <p>Description of feature one with some text content.</p>
        <footer>
          <button class="outline">Learn More</button>
        </footer>
      </article>
      <article>
        <header>Feature 2</header>
        <p>Description of feature two with some text content.</p>
        <footer>
          <button class="outline">Learn More</button>
        </footer>
      </article>
      <article>
        <header>Feature 3</header>
        <p>Description of feature three with some text content.</p>
        <footer>
          <button class="outline">Learn More</button>
        </footer>
      </article>
    </div>
  `,
  parameters: {
    docs: {
      source: {
        code: `<div class="grid">
  <article>
    <header>Feature 1</header>
    <p>Description of feature one</p>
    <footer><button class="outline">Learn More</button></footer>
  </article>
  <article>
    <header>Feature 2</header>
    <p>Description of feature two</p>
    <footer><button class="outline">Learn More</button></footer>
  </article>
  <article>
    <header>Feature 3</header>
    <p>Description of feature three</p>
    <footer><button class="outline">Learn More</button></footer>
  </article>
</div>`,
      },
    },
  },
};

export const FormGrid: StoryObj = {
  name: 'Form Grid Layout',
  render: () => `
    <form>
      <div class="grid">
        <label>
          First Name
          <input type="text" placeholder="John" />
        </label>
        <label>
          Last Name
          <input type="text" placeholder="Doe" />
        </label>
      </div>
      <label>
        Email
        <input type="email" placeholder="john.doe@example.com" />
      </label>
      <div class="grid">
        <label>
          City
          <input type="text" placeholder="San Francisco" />
        </label>
        <label>
          State
          <select>
            <option>Select...</option>
            <option>CA</option>
            <option>NY</option>
            <option>TX</option>
          </select>
        </label>
        <label>
          Zip Code
          <input type="text" placeholder="94102" />
        </label>
      </div>
      <button type="submit">Submit</button>
    </form>
  `,
  parameters: {
    docs: {
      source: {
        code: `<form>
  <div class="grid">
    <label>
      First Name
      <input type="text" placeholder="John">
    </label>
    <label>
      Last Name
      <input type="text" placeholder="Doe">
    </label>
  </div>
  <label>
    Email
    <input type="email" placeholder="john.doe@example.com">
  </label>
  <div class="grid">
    <label>
      City
      <input type="text" placeholder="San Francisco">
    </label>
    <label>
      State
      <select>
        <option>Select...</option>
        <option>CA</option>
      </select>
    </label>
    <label>
      Zip Code
      <input type="text" placeholder="94102">
    </label>
  </div>
  <button type="submit">Submit</button>
</form>`,
      },
    },
  },
};

export const MixedContent: StoryObj = {
  name: 'Mixed Content Grid',
  render: () => `
    <div class="grid">
      <div>
        <h3>Welcome</h3>
        <p>This is a simple grid layout that can contain any type of content, not just articles.</p>
        <button>Get Started</button>
      </div>
      <div>
        <h3>Features</h3>
        <ul>
          <li>Responsive by default</li>
          <li>Easy to implement</li>
          <li>Semantic markup</li>
        </ul>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      source: {
        code: `<div class="grid">
  <div>
    <h3>Welcome</h3>
    <p>Content goes here</p>
    <button>Get Started</button>
  </div>
  <div>
    <h3>Features</h3>
    <ul>
      <li>Responsive by default</li>
      <li>Easy to implement</li>
      <li>Semantic markup</li>
    </ul>
  </div>
</div>`,
      },
    },
  },
};
