import { newSpecPage } from '../../test-utils/spec-page';
import { PopTile } from './tile';

describe('pop-tile', () => {
  it('renders a square face with emoji + label', async () => {
    const page = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile emoji="🌤️" label="Weather"></pop-tile>`,
    });
    const btn = page.root.querySelector('button.tile') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.classList.contains('tile--square')).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(page.root.querySelector('.tile__emoji')?.textContent).toBe('🌤️');
    expect(page.root.querySelector('.tile__label')?.textContent).toBe('Weather');
  });

  it('renders the chip variant', async () => {
    const page = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Ask" variant="chip"></pop-tile>`,
    });
    expect(page.root.querySelector('.tile--chip')).not.toBeNull();
    expect(page.root.querySelector('.tile--square')).toBeNull();
  });

  it('renders an ionicon face when icon is set (no emoji)', async () => {
    const page = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Add" icon="add"></pop-tile>`,
    });
    const icon = page.root.querySelector('pop-icon.tile__icon');
    expect(icon).not.toBeNull();
    expect((icon as any)?.name).toBe('add');
  });

  it('reflects pressed via class + aria-pressed', async () => {
    const page = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Lights" pressed></pop-tile>`,
    });
    const btn = page.root.querySelector('button.tile') as HTMLButtonElement;
    expect(btn.classList.contains('tile--pressed')).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('emits popTap on face click', async () => {
    const page = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Go"></pop-tile>`,
    });
    const spy = vi.fn();
    page.root.addEventListener('popTap', spy);
    (page.root.querySelector('button.tile') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('shows the delete button only when editing and emits popDelete', async () => {
    const noEdit = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Go"></pop-tile>`,
    });
    expect(noEdit.root.querySelector('.tile__delete')).toBeNull();

    const page = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Go" editing></pop-tile>`,
    });
    const del = page.root.querySelector('.tile__delete') as HTMLButtonElement;
    expect(del).not.toBeNull();
    expect((del.querySelector('pop-icon') as any)?.name).toBe('close');
    const tap = vi.fn();
    const remove = vi.fn();
    page.root.addEventListener('popTap', tap);
    page.root.addEventListener('popDelete', remove);
    del.click();
    expect(remove).toHaveBeenCalledTimes(1);
    // delete must not also fire the face tap
    expect(tap).not.toHaveBeenCalled();
  });

  it('honours deletable=false and a custom delete icon/label', async () => {
    const none = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Settings" editing></pop-tile>`,
    });
    // v5: the attribute string "false" no longer turns a boolean prop off; set the property.
    none.root.deletable = false;
    await none.waitForChanges();
    expect(none.root.querySelector('.tile__delete')).toBeNull();

    const custom = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Weather" editing delete-icon="eye-off-outline" delete-label="Hide"></pop-tile>`,
    });
    const del = custom.root.querySelector('.tile__delete') as HTMLButtonElement;
    expect(del.getAttribute('aria-label')).toBe('Hide');
    expect((del.querySelector('pop-icon') as any)?.name).toBe('eye-off-outline');
  });

  it('uses tileTitle for the face tooltip when provided', async () => {
    const page = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Research" tile-title="/research {{topic}}"></pop-tile>`,
    });
    expect((page.root.querySelector('button.tile') as HTMLButtonElement).getAttribute('title')).toBe(
      '/research {{topic}}',
    );
  });

  it('disables the face button', async () => {
    const page = await newSpecPage({
      components: [PopTile],
      html: `<pop-tile label="Go" disabled></pop-tile>`,
    });
    expect((page.root.querySelector('button.tile') as HTMLButtonElement).disabled).toBe(true);
  });
});
