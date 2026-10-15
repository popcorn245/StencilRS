import { newSpecPage } from '../../test-utils/spec-page';
import { Editor } from './editor';

// Editor.js starts asynchronously and looks its holder up by id. Wait for it to draw itself
// (.codex-editor) before a test ends: otherwise the page is torn down first and Editor.js
// rejects with "element with ID … is missing", an unhandled error that fails the run.
const editorReady = (root: Element) =>
  vi.waitFor(() => expect(root.querySelector('.codex-editor')).toBeTruthy(), { timeout: 5000 });

describe('pop-editor', () => {
  it('renders with autosave status and editor div', async () => {
    const page = await newSpecPage({ components: [Editor], html: `<pop-editor></pop-editor>` });
    expect(page.root.querySelector('.autosave-status')).toBeTruthy();
    expect(page.root.querySelector('[id^="editor-js"]')).toBeTruthy();
    await editorReady(page.root);
  });

  it('renders with initial json value', async () => {
    const page = await newSpecPage({ components: [Editor], html: `<pop-editor value='{"blocks": [{"type": "paragraph", "data": {"text": "Hello World"}}]}'></pop-editor>` });
    expect(page.root.querySelector('[id^="editor-js"]')).not.toBeNull();
    await editorReady(page.root);
  });
});
