import { newSpecPage } from '../../test-utils/spec-page';
import { FormDialog } from './form-dialog';

describe('pop-form-dialog', () => {
  it('renders hidden by default', async () => {
    const page = await newSpecPage({
      components: [FormDialog],
      html: `<pop-form-dialog dialog-title="Test"></pop-form-dialog>`,
    });
    expect(page.root.querySelector('.fd-backdrop--open')).toBeNull();
  });

  it('renders open state', async () => {
    const page = await newSpecPage({
      components: [FormDialog],
      html: `<pop-form-dialog dialog-title="Test" open></pop-form-dialog>`,
    });
    expect(page.root.querySelector('.fd-backdrop--open')).not.toBeNull();
  });

  it('displays title and description', async () => {
    const page = await newSpecPage({
      components: [FormDialog],
      html: `<pop-form-dialog dialog-title="Hello" description="World" open></pop-form-dialog>`,
    });
    expect(page.root.querySelector('.fd-title').textContent).toBe('Hello');
    expect(page.root.querySelector('.fd-description').textContent).toBe('World');
  });

  it('renders the footer (Cancel/Submit) by default', async () => {
    const page = await newSpecPage({
      components: [FormDialog],
      html: `<pop-form-dialog open></pop-form-dialog>`,
    });
    expect(page.root.querySelector('.fd-footer')).not.toBeNull();
  });

  it('omits the footer entirely when hide-footer is set', async () => {
    const page = await newSpecPage({
      components: [FormDialog],
      html: `<pop-form-dialog open hide-footer></pop-form-dialog>`,
    });
    expect(page.root.querySelector('.fd-footer')).toBeNull();
  });

  it('the × close button is type="button" (cannot submit the form)', async () => {
    const page = await newSpecPage({
      components: [FormDialog],
      html: `<pop-form-dialog open></pop-form-dialog>`,
    });
    expect(page.root.querySelector('.fd-close')!.getAttribute('type')).toBe('button');
  });

  it('a form submit with hideFooter does NOT emit popSubmit and does NOT close', async () => {
    const page = await newSpecPage({
      components: [FormDialog],
      html: `<pop-form-dialog open hide-footer></pop-form-dialog>`,
    });
    const emitted: any[] = [];
    page.root.addEventListener('popSubmit', () => emitted.push(true));
    const inst = page.rootInstance as any;
    let defaultPrevented = false;
    // Simulate a stray slotted button submitting the form.
    inst.handleSubmit({ preventDefault: () => { defaultPrevented = true; } } as any);
    expect(defaultPrevented).toBe(true);   // never navigates
    expect(emitted).toHaveLength(0);        // no submit semantics → no emit
    expect(inst.open).toBe(true);           // stays open
  });

  it('a form submit WITH a footer still emits popSubmit (Enter-to-submit preserved)', async () => {
    const page = await newSpecPage({
      components: [FormDialog],
      html: `<pop-form-dialog open></pop-form-dialog>`,
    });
    const emitted: any[] = [];
    page.root.addEventListener('popSubmit', () => emitted.push(true));
    const inst = page.rootInstance as any;
    inst.handleSubmit({ preventDefault: () => {} } as any);
    expect(emitted).toHaveLength(1);
  });
});
