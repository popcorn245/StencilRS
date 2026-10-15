import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Table',
  parameters: {
    docs: {
      description: {
        component:
          'Complete data table with thead and tbody. <a href="https://picocss.com/docs/table">Pico CSS Table docs</a>',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default Table',
  render: () => `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>John Doe</td>
          <td>john@example.com</td>
          <td>Admin</td>
        </tr>
        <tr>
          <td>Jane Smith</td>
          <td>jane@example.com</td>
          <td>Editor</td>
        </tr>
        <tr>
          <td>Bob Johnson</td>
          <td>bob@example.com</td>
          <td>Viewer</td>
        </tr>
      </tbody>
    </table>
  `,
  parameters: {
    docs: {
      source: {
        code: `<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
      <td>Admin</td>
    </tr>
    <tr>
      <td>Jane Smith</td>
      <td>jane@example.com</td>
      <td>Editor</td>
    </tr>
    <tr>
      <td>Bob Johnson</td>
      <td>bob@example.com</td>
      <td>Viewer</td>
    </tr>
  </tbody>
</table>`,
      },
    },
  },
};

export const StripedTable: StoryObj = {
  name: 'Striped Table',
  render: () => `
    <table role="grid">
      <thead>
        <tr>
          <th>Product</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Laptop</td>
          <td>$999</td>
          <td>15</td>
          <td>Electronics</td>
        </tr>
        <tr>
          <td>Mouse</td>
          <td>$25</td>
          <td>50</td>
          <td>Accessories</td>
        </tr>
        <tr>
          <td>Keyboard</td>
          <td>$75</td>
          <td>30</td>
          <td>Accessories</td>
        </tr>
        <tr>
          <td>Monitor</td>
          <td>$350</td>
          <td>20</td>
          <td>Electronics</td>
        </tr>
      </tbody>
    </table>
  `,
  parameters: {
    docs: {
      source: {
        code: `<table role="grid">
  <thead>
    <tr>
      <th>Product</th>
      <th>Price</th>
      <th>Stock</th>
      <th>Category</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Laptop</td>
      <td>$999</td>
      <td>15</td>
      <td>Electronics</td>
    </tr>
    <!-- More rows... -->
  </tbody>
</table>`,
      },
    },
  },
};

export const WithFooter: StoryObj = {
  name: 'Table with Footer',
  render: () => `
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Product A</td>
          <td>2</td>
          <td>$50.00</td>
        </tr>
        <tr>
          <td>Product B</td>
          <td>1</td>
          <td>$30.00</td>
        </tr>
        <tr>
          <td>Product C</td>
          <td>3</td>
          <td>$45.00</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th>Total</th>
          <th>6</th>
          <th>$125.00</th>
        </tr>
      </tfoot>
    </table>
  `,
  parameters: {
    docs: {
      source: {
        code: `<table>
  <thead>
    <tr>
      <th>Item</th>
      <th>Quantity</th>
      <th>Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Product A</td>
      <td>2</td>
      <td>$50.00</td>
    </tr>
    <!-- More rows... -->
  </tbody>
  <tfoot>
    <tr>
      <th>Total</th>
      <th>6</th>
      <th>$125.00</th>
    </tr>
  </tfoot>
</table>`,
      },
    },
  },
};
