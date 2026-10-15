import { newSpecPage } from '../../test-utils/spec-page';
import { PopFirebaseAuth } from './firebase-auth';

describe('pop-firebase-auth', () => {
  it('renders Google button + email form by default', async () => {
    const page = await newSpecPage({
      components: [PopFirebaseAuth],
      html: `<pop-firebase-auth app-name="Tasks"></pop-firebase-auth>`,
    });
    expect(page.root.querySelector('.pfa-google-btn')).toBeTruthy();
    expect(page.root.querySelector('.pfa-form')).toBeTruthy();
    expect(page.root.querySelector('.pfa-title')!.textContent).toBe('Tasks');
  });

  it('hides Google button when providers="email"', async () => {
    const page = await newSpecPage({
      components: [PopFirebaseAuth],
      html: `<pop-firebase-auth providers="email"></pop-firebase-auth>`,
    });
    expect(page.root.querySelector('.pfa-google-btn')).toBeFalsy();
    expect(page.root.querySelector('.pfa-form')).toBeTruthy();
  });

  it('hides email form when providers="google"', async () => {
    const page = await newSpecPage({
      components: [PopFirebaseAuth],
      html: `<pop-firebase-auth providers="google"></pop-firebase-auth>`,
    });
    expect(page.root.querySelector('.pfa-google-btn')).toBeTruthy();
    expect(page.root.querySelector('.pfa-form')).toBeFalsy();
  });

  it('toggles between sign-in and sign-up modes', async () => {
    const page = await newSpecPage({
      components: [PopFirebaseAuth],
      html: `<pop-firebase-auth></pop-firebase-auth>`,
    });
    const submit = () => page.root.querySelector('.pfa-submit')!;
    expect(submit().textContent).toContain('Sign in');
    (page.root.querySelector('.pfa-toggle-mode') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(submit().textContent).toContain('Create account');
  });

  it('shows validation error when email submitted without credentials', async () => {
    const page = await newSpecPage({
      components: [PopFirebaseAuth],
      html: `<pop-firebase-auth></pop-firebase-auth>`,
    });
    // Provide a stub firebaseApp so we get past the init guard and hit credential validation.
    (page.rootInstance as any).firebaseApp = { _stub: true };
    await page.waitForChanges();
    const form = page.root.querySelector('.pfa-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await page.waitForChanges();
    expect(page.root.querySelector('.pfa-error')!.textContent).toContain('email and password');
  });
});
