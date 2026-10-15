import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/FilePreview',
  parameters: {
    docs: {
      description: {
        component:
          'Displays a row of file preview cards with remove buttons. Pass file data as a JSON string via the `files` prop. Emits `popFileRemove` with the index of the file to remove.',
      },
    },
  },
};

export default meta;

export const Empty: StoryObj = {
  name: 'Empty (no files)',
  render: () => `
    <div style="padding: 1rem; background: var(--pico-background-color);">
      <pop-file-preview files="[]"></pop-file-preview>
      <p style="color: var(--pico-muted-color); font-size: 0.8rem;">Nothing renders when files is empty.</p>
    </div>
  `,
};

export const WithFiles: StoryObj = {
  name: 'With Files',
  render: () => {
    const files = JSON.stringify([
      { name: 'photo1.png', url: 'https://picsum.photos/seed/a/200/200', type: 'image/png' },
      { name: 'photo2.jpg', url: 'https://picsum.photos/seed/b/200/200', type: 'image/jpeg' },
      { name: 'photo3.gif', url: 'https://picsum.photos/seed/c/200/200', type: 'image/gif' },
    ]);
    return `
    <div style="padding: 1rem; background: var(--pico-background-color);">
      <pop-file-preview files='${files}'></pop-file-preview>
    </div>
    `;
  },
};

export const Overflow: StoryObj = {
  name: 'Overflow (many images)',
  render: () => {
    const files = JSON.stringify(
      Array.from({ length: 10 }, (_, i) => ({
        name: `image-${i}.png`,
        url: `https://picsum.photos/seed/${i}/200/200`,
        type: 'image/png',
      }))
    );
    return `
    <div style="padding: 1rem; background: var(--pico-background-color); max-width: 500px;">
      <pop-file-preview files='${files}'></pop-file-preview>
    </div>
    `;
  },
};
