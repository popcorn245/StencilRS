export default {
  title: 'Components/Organisms/FileMention',
  component: 'pop-file-mention',
  parameters: { layout: 'centered' },
  argTypes: {
    files: { control: 'text' },
    value: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};

const FILES = JSON.stringify([
  'src/server/modelAdapters.ts',
  'src/server/ollama.ts',
  'src/server/modelRouter.ts',
  'src/pages/api/tasks/create.ts',
  'src/pages/board/index.astro',
  'src/components/Board.astro',
]);

export const Default = {
  args: { files: '[]', value: '', placeholder: 'Type @ to mention a file…', disabled: false },
};

export const WithFiles = {
  args: { files: FILES, value: '', placeholder: 'Try typing @src…', disabled: false },
};

export const MentionOpen = {
  args: { files: FILES, value: 'I need to update @', placeholder: '', disabled: false },
};

export const Disabled = {
  args: { files: FILES, value: 'Cannot edit', placeholder: '', disabled: true },
};
