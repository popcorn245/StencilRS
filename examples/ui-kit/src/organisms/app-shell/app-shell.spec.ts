import { newSpecPage } from '../../test-utils/spec-page';
import { AppShell } from './app-shell';

describe('pop-app-shell', () => {
  it('renders the heading in a header', async () => {
    const page = await newSpecPage({
      components: [AppShell],
      html: `<pop-app-shell heading="Settings"></pop-app-shell>`,
    });
    const head = page.root.querySelector('.shell__head')!;
    expect(head).not.toBeNull();
    expect(page.root.textContent).toContain('Settings');
  });

  it('honours the headingLevel prop', async () => {
    const page = await newSpecPage({
      components: [AppShell],
      html: `<pop-app-shell heading="Home" heading-level="2"></pop-app-shell>`,
    });
    expect(page.root.querySelector('h2.shell__title')).not.toBeNull();
    expect(page.root.querySelector('h1.shell__title')).toBeNull();
  });

  it('drops the header when bare', async () => {
    const page = await newSpecPage({
      components: [AppShell],
      html: `<pop-app-shell bare="true"></pop-app-shell>`,
    });
    expect(page.root.querySelector('.shell__head')).toBeNull();
    expect(page.root.querySelector('.shell__body')).not.toBeNull();
  });

  it('renders a leading icon when iconName is set', async () => {
    const page = await newSpecPage({
      components: [AppShell],
      html: `<pop-app-shell heading="Trash" icon-name="trash"></pop-app-shell>`,
    });
    expect(page.root.querySelector('.shell__title-icon')).not.toBeNull();
  });
});
