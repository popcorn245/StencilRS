import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Radio',
  parameters: {
    docs: {
      description: {
        component:
          'Radio button input with label. <a href="https://picocss.com/docs/radios">Pico CSS Radios docs</a>',
      },
    },
  },
};

export default meta;

export const RadioGroup: StoryObj = {
  name: 'Radio Group',
  render: () => `
    <fieldset>
      <legend>Select a size</legend>
      <label>
        <input type="radio" name="size" value="small" />
        Small
      </label>
      <label>
        <input type="radio" name="size" value="medium" checked />
        Medium
      </label>
      <label>
        <input type="radio" name="size" value="large" />
        Large
      </label>
    </fieldset>
  `,
};

export const DisabledRadios: StoryObj = {
  name: 'Disabled Radios',
  render: () => `
    <fieldset>
      <legend>Payment method</legend>
      <label>
        <input type="radio" name="payment" value="credit" checked />
        Credit Card
      </label>
      <label>
        <input type="radio" name="payment" value="paypal" disabled />
        PayPal (Unavailable)
      </label>
      <label>
        <input type="radio" name="payment" value="bank" />
        Bank Transfer
      </label>
    </fieldset>
  `,
};
