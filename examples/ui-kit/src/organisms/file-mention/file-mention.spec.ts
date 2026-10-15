import { newSpecPage } from '../../test-utils/spec-page';
import { PopFileMention } from './file-mention';

const FILES = JSON.stringify(['src/server/ollama.ts', 'src/server/modelRouter.ts', 'src/components/Board.astro']);

describe('pop-file-mention', () => {
  it('renders a textarea', async () => {
    const page = await newSpecPage({ components: [PopFileMention], html: `<pop-file-mention></pop-file-mention>` });
    expect(page.root.querySelector('textarea')).toBeTruthy();
  });

  it('dropdown is hidden when no files prop', async () => {
    const page = await newSpecPage({ components: [PopFileMention], html: `<pop-file-mention></pop-file-mention>` });
    expect(page.root.querySelector('.dropdown')).toBeFalsy();
  });

  it('applies disabled attribute to textarea', async () => {
    const page = await newSpecPage({ components: [PopFileMention], html: `<pop-file-mention disabled="true"></pop-file-mention>` });
    const ta = page.root.querySelector('textarea') as HTMLTextAreaElement;
    expect(ta.disabled).toBe(true);
  });

  it('sets placeholder on textarea', async () => {
    const page = await newSpecPage({ components: [PopFileMention], html: `<pop-file-mention placeholder="Type here"></pop-file-mention>` });
    const ta = page.root.querySelector('textarea') as HTMLTextAreaElement;
    expect(ta.placeholder).toBe('Type here');
  });

  it('parsedFiles returns array from files prop', async () => {
    const page = await newSpecPage({ components: [PopFileMention], html: `<pop-file-mention files='${FILES}'></pop-file-mention>` });
    expect((page.rootInstance as any).parsedFiles).toHaveLength(3);
  });
});
