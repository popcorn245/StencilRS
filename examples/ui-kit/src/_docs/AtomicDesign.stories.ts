import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Docs/Atomic Design',
};

export default meta;

export const AtomicDesign: StoryObj = {
  render: () => `
    <h1>Atomic Design</h1>
    <p>Atomic design is a methodology for creating design systems. It consists of five distinct stages working together to create interface design systems in a more deliberate and hierarchical manner.</p>
    <h2>Atoms</h2>
    <p>Atoms are the basic building blocks of matter. Applied to web interfaces, atoms are our HTML tags, such as a form label, an input or a button.</p>
    <h2>Molecules</h2>
    <p>Molecules are groups of atoms bonded together and are the smallest fundamental units of a compound. These molecules take on their own properties and serve as the backbone of our design systems.</p>
    <h2>Organisms</h2>
    <p>Organisms are groups of molecules joined together to form a relatively complex, distinct section of an interface.</p>
    <h2>Templates</h2>
    <p>Templates are page-level objects that place components into a layout and articulate the design's underlying content structure.</p>
    <h2>Pages</h2>
    <p>Pages are specific instances of templates. Here, placeholder content is replaced with real representative content to give an accurate depiction of what a user will ultimately see.</p>
  `,
};
