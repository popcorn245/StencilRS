import { newSpecPage } from '../../test-utils/spec-page';
import { Editor } from './editor';

describe('pop-editor', () => {
  it('renders with autosave status and editor div', async () => {
    const page = await newSpecPage({ components: [Editor], html: `<pop-editor></pop-editor>` });
    expect(page.root.querySelector('.autosave-status')).toBeTruthy();
    expect(page.root.querySelector('[id^="editor-js"]')).toBeTruthy();
  });

  it('renders with initial json value', async () => {
    const page = await newSpecPage({ components: [Editor], html: `<pop-editor value='{"blocks": [{"type": "paragraph", "data": {"text": "Hello World"}}]}'></pop-editor>` });
    expect(page.root.querySelector('[id^="editor-js"]')).not.toBeNull();
  });
});
