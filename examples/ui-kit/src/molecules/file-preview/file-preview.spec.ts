import { newSpecPage } from '../../test-utils/spec-page';
import { PopFilePreview } from './file-preview';

describe('pop-file-preview', () => {
  it('renders nothing when files is empty', async () => {
    const page = await newSpecPage({
      components: [PopFilePreview],
      html: `<pop-file-preview files="[]"></pop-file-preview>`,
    });
    expect(page.root.querySelector('.file-preview-area')).toBeNull();
  });

  it('renders preview cards for each file', async () => {
    const files = JSON.stringify([
      { name: 'img1.png', url: 'http://example.com/1.png', type: 'image/png' },
      { name: 'img2.jpg', url: 'http://example.com/2.jpg', type: 'image/jpeg' },
    ]);
    const page = await newSpecPage({
      components: [PopFilePreview],
      html: `<pop-file-preview files='${files}'></pop-file-preview>`,
    });
    const cards = page.root.querySelectorAll('.file-preview-card');
    expect(cards.length).toBe(2);
  });

  it('emits popFileRemove with index when remove button is clicked', async () => {
    const files = JSON.stringify([
      { name: 'img1.png', url: 'http://example.com/1.png', type: 'image/png' },
      { name: 'img2.jpg', url: 'http://example.com/2.jpg', type: 'image/jpeg' },
    ]);
    const page = await newSpecPage({
      components: [PopFilePreview],
      html: `<pop-file-preview files='${files}'></pop-file-preview>`,
    });
    const events: CustomEvent[] = [];
    page.root.addEventListener('popFileRemove', (e: Event) => events.push(e as CustomEvent));

    const removeButtons = page.root.querySelectorAll('.remove-file-btn');
    (removeButtons[1] as HTMLButtonElement).click();
    await page.waitForChanges();

    expect(events.length).toBe(1);
    expect(events[0].detail).toBe(1);
  });
});
