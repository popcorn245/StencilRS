import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Modal',
  parameters: {
    docs: {
      description: {
        component:
          'The classic modal component with graceful spacings across devices and viewports, using the semantic HTML tag `<dialog>`. <a href="https://picocss.com/docs/modal">Pico CSS Modal docs</a>',
      },
    },
  },
  argTypes: {
    open: { control: 'boolean' },
  },
};

export default meta;

type ModalArgs = {
  open: boolean;
};

export const Default: StoryObj<ModalArgs> = {
  name: 'Default Modal',
  render: (args: ModalArgs) => `
    <dialog open=${args.open}>
      <article>
        <header>
          <button autofocus aria-label="Close"></button>
          <p>
            <strong>🗓️ Thank You for Registering!</strong>
          </p>
        </header>
        <p>
          We're excited to have you join us for our upcoming event. Please arrive at the museum on time to check in
          and get started.
        </p>
        <ul>
          <li>Date: Saturday, April 15</li>
          <li>Time: 10:00am - 12:00pm</li>
        </ul>
      </article>
    </dialog>
  `,
  args: {
    open: true,
  },
  parameters: {
    docs: {
      source: {
        code: `<dialog open>
  <article>
    <header>
      <button aria-label="Close" rel="prev"></button>
      <p>
        <strong>🗓️ Thank You for Registering!</strong>
      </p>
    </header>
    <p>
      We're excited to have you join us for our
      upcoming event. Please arrive at the museum 
      on time to check in and get started.
    </p>
    <ul>
      <li>Date: Saturday, April 15</li>
      <li>Time: 10:00am - 12:00pm</li>
    </ul>
  </article>
</dialog>`,
      },
    },
  },
};

export const Confirm: StoryObj<ModalArgs> = {
  name: 'Confirm',
  render: (args: ModalArgs) => `
    <dialog open=${args.open}>
      <article>
        <h2>Confirm Your Membership</h2>
        <p>Thank you for signing up for a membership! Please review the membership details below:</p>
        <ul>
          <li>Membership: Individual</li>
          <li>Price: $10</li>
        </ul>
        <footer>
          <button class="secondary">Cancel</button>
          <button>Confirm</button>
        </footer>
      </article>
    </dialog>
  `,
  args: {
    open: true,
  },
  parameters: {
    docs: {
      source: {
        code: `<dialog open>
  <article>
    <h2>Confirm Your Membership</h2>
    <p>
      Thank you for signing up for a membership!
      Please review the membership details below:
    </p>
    <ul>
      <li>Membership: Individual</li>
      <li>Price: $10</li>
    </ul>
    <footer>
      <button class="secondary">
        Cancel
      </button>
      <button>Confirm</button>
    </footer>
  </article>
</dialog>`,
      },
    },
  },
};
