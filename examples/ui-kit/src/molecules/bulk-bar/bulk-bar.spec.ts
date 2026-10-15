import { newSpecPage } from '../../test-utils/spec-page';
import { PopBulkBar } from './bulk-bar';

describe('pop-bulk-bar', () => {
  it('renders the count + label and slotted actions', async () => {
    const page = await newSpecPage({
      components: [PopBulkBar],
      html: `<pop-bulk-bar count="3" label="cards">
        <button class="bulk__act" id="move">Move</button>
      </pop-bulk-bar>`,
    });
    expect(page.root.textContent).toContain('3');
    expect(page.root.textContent).toContain('cards');
    expect(page.root.querySelector('#move')).not.toBeNull();
    expect(page.root.getAttribute('role')).toBe('toolbar');
  });

  it('emits popBulkDone when Done is clicked', async () => {
    const page = await newSpecPage({
      components: [PopBulkBar],
      html: `<pop-bulk-bar count="1"></pop-bulk-bar>`,
    });
    let fired = 0;
    page.root.addEventListener('popBulkDone', () => fired++);
    (page.root.querySelector('.bulk__done') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(fired).toBe(1);
  });

  it('busy disables the Done button and marks the bar', async () => {
    const page = await newSpecPage({
      components: [PopBulkBar],
      html: `<pop-bulk-bar count="2" busy></pop-bulk-bar>`,
    });
    expect((page.root.querySelector('.bulk__done') as HTMLButtonElement).disabled).toBe(true);
    expect(page.root.querySelector('.bulk--busy')).not.toBeNull();
  });
});
