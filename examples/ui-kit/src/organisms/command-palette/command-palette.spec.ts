import { newSpecPage } from '../../test-utils/spec-page';
import { PopCommandPalette } from './command-palette';
import { BrandIcon } from '../../atoms/brand-icon/brand-icon';

const withRows = (items: unknown[]) =>
  JSON.stringify([{ heading: 'COMMANDS', items }]).replace(/"/g, '&quot;');

describe('pop-command-palette', () => {
  it('is aria-hidden and renders no panel when closed', async () => {
    const page = await newSpecPage({
      components: [PopCommandPalette],
      html: `<pop-command-palette></pop-command-palette>`,
    });
    expect(page.root.getAttribute('aria-hidden')).toBe('true');
    expect(page.root.querySelector('.cp-panel')).toBeNull();
  });

  it('renders the dialog panel + input when open', async () => {
    const page = await newSpecPage({
      components: [PopCommandPalette],
      html: `<pop-command-palette open></pop-command-palette>`,
    });
    expect(page.root.querySelector('.cp-panel')).not.toBeNull();
    expect(page.root.querySelector('.cp-input')).not.toBeNull();
  });

  it('renders a section heading + rows from `sections`', async () => {
    const page = await newSpecPage({
      components: [PopCommandPalette],
      html: `<pop-command-palette open sections="${withRows([
        { id: 'cmd:new', label: 'New note', icon: 'edit', kind: 'command' },
      ])}"></pop-command-palette>`,
    });
    expect(page.root.querySelector('.cp-heading')?.textContent).toContain('COMMANDS');
    expect(page.root.querySelector('.cp-row-label')?.textContent).toBe('New note');
  });

  it('renders a pop-brand-icon for each row from the `icon` name', async () => {
    const page = await newSpecPage({
      components: [PopCommandPalette, BrandIcon],
      html: `<pop-command-palette open sections="${withRows([
        { id: 'cmd:new', label: 'New note', icon: 'edit', kind: 'command' },
      ])}"></pop-command-palette>`,
    });
    const iconHost = page.root.querySelector('.cp-row-icon pop-brand-icon');
    expect(iconHost).not.toBeNull();
    expect((iconHost as any)?.name).toBe('edit');
  });

  it('falls back to the "dot-outline" brand-icon when a row has no `icon`', async () => {
    const page = await newSpecPage({
      components: [PopCommandPalette, BrandIcon],
      html: `<pop-command-palette open sections="${withRows([
        { id: 'n1', label: 'Untitled note', kind: 'note' },
      ])}"></pop-command-palette>`,
    });
    const iconHost = page.root.querySelector('.cp-row-icon pop-brand-icon');
    expect((iconHost as any)?.name).toBe('dot-outline');
  });
});
