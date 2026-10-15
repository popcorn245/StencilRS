import { Component, h, Prop, State, Event, EventEmitter } from '@stencil/core';

/**
 * pop-firebase-auth
 *
 * Auth UI extracted from the legacy app's page-login with family-claim logic stripped.
 *  - Google popup on desktop, redirect on mobile.
 *  - Email/password sign-in + sign-up fallback.
 *
 * Pure auth. No post-login user-doc bootstrap or custom-claim checks — consumers
 * handle that in their `authSuccess` handler.
 *
 * The `firebaseApp` prop is required and is consumed via dynamic import of
 * `firebase/auth` so this component does not statically depend on the SDK
 * (consumers wire it from their own initialized app).
 */
export type FirebaseAuthProvider = 'google' | 'email';

@Component({
  tag: 'pop-firebase-auth',
  encapsulation: { type: 'scoped' },
  styleUrl: 'firebase-auth.css',
})
export class PopFirebaseAuth {
  /**
   * The initialized FirebaseApp instance (`FirebaseApp` from `firebase/app`).
   * Required. Passed as a property (not an attribute).
   */
  @Prop() firebaseApp: any = null;

  /** Which auth providers to expose. Comma-separated or JSON array. */
  @Prop() providers: string = 'google,email';

  /** Where to navigate after successful auth (consumer may also override via authSuccess). */
  @Prop() redirectUrl: string = '/';

  /** App name used in the headline. */
  @Prop() appName: string = 'App';

  /** Fired with the signed-in user. Consumer typically routes to redirectUrl. */
  @Event({ composed: true, bubbles: true }) authSuccess: EventEmitter<{ user: any }>;

  /** Fired when sign-in/up fails. */
  @Event({ composed: true, bubbles: true }) authError: EventEmitter<{ error: Error }>;

  @State() isLoading = false;
  @State() errorMessage = '';
  @State() email = '';
  @State() password = '';
  @State() signUpMode = false;

  private get providerList(): FirebaseAuthProvider[] {
    const raw = (this.providers || '').trim();
    if (!raw) return ['google', 'email'];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as FirebaseAuthProvider[];
    } catch { /* fall through */ }
    return raw.split(',').map(s => s.trim()).filter(Boolean) as FirebaseAuthProvider[];
  }

  private isMobile(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  async connectedCallback() {
    // Handle returning from signInWithRedirect (mobile Google sign-in)
    if (!this.firebaseApp) return;
    try {
      const { getAuth, getRedirectResult } = await import('firebase/auth');
      const auth = getAuth(this.firebaseApp);
      const result = await getRedirectResult(auth);
      if (result?.user) {
        this.authSuccess.emit({ user: result.user });
      }
    } catch (err: any) {
      // getRedirectResult throws on transient issues — surface only if user-actionable
      if (err?.code && err.code !== 'auth/no-auth-event') {
        this.errorMessage = err?.message ?? 'Sign in failed after redirect.';
        this.authError.emit({ error: err });
      }
    }
  }

  private async handleGoogleSignIn() {
    if (!this.firebaseApp) {
      this.errorMessage = 'Firebase app not initialized.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
      const auth = getAuth(this.firebaseApp);
      const provider = new GoogleAuthProvider();
      if (this.isMobile()) {
        await signInWithRedirect(auth, provider);
        return; // Page will reload — getRedirectResult handles the rest
      }
      const result = await signInWithPopup(auth, provider);
      this.authSuccess.emit({ user: result.user });
    } catch (err: any) {
      this.errorMessage = err?.message ?? 'Sign in failed. Please try again.';
      this.authError.emit({ error: err });
    } finally {
      this.isLoading = false;
    }
  }

  private async handleEmailSubmit(e: Event) {
    e.preventDefault();
    if (!this.firebaseApp) {
      this.errorMessage = 'Firebase app not initialized.';
      return;
    }
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
      const auth = getAuth(this.firebaseApp);
      const fn = this.signUpMode ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      const result = await fn(auth, this.email, this.password);
      this.authSuccess.emit({ user: result.user });
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        this.errorMessage = 'Invalid email or password.';
      } else if (code === 'auth/email-already-in-use') {
        this.errorMessage = 'That email is already registered.';
      } else if (code === 'auth/weak-password') {
        this.errorMessage = 'Password must be at least 6 characters.';
      } else {
        this.errorMessage = err?.message ?? 'Sign in failed. Please try again.';
      }
      this.authError.emit({ error: err });
    } finally {
      this.isLoading = false;
    }
  }

  render() {
    const list = this.providerList;
    const showGoogle = list.includes('google');
    const showEmail = list.includes('email');
    return (
      <div class="pfa-card">
        <div class="pfa-logo">🍿</div>
        <h1 class="pfa-title">{this.appName}</h1>
        <p class="pfa-subtitle">Sign in to continue.</p>

        {showGoogle && (
          <button
            type="button"
            class="pfa-google-btn"
            onClick={() => this.handleGoogleSignIn()}
            disabled={this.isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z" />
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
            </svg>
            <span>{this.isLoading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>
        )}

        {showGoogle && showEmail && <div class="pfa-divider">or</div>}

        {showEmail && (
          <form class="pfa-form" onSubmit={(e) => this.handleEmailSubmit(e)}>
            <input
              type="email"
              placeholder="Email"
              autocomplete="email"
              value={this.email}
              onInput={(e) => (this.email = (e.target as HTMLInputElement).value)}
              disabled={this.isLoading}
            />
            <input
              type="password"
              placeholder="Password"
              autocomplete={this.signUpMode ? 'new-password' : 'current-password'}
              value={this.password}
              onInput={(e) => (this.password = (e.target as HTMLInputElement).value)}
              disabled={this.isLoading}
            />
            <button type="submit" class="pfa-submit" disabled={this.isLoading}>
              {this.isLoading
                ? (this.signUpMode ? 'Creating account...' : 'Signing in...')
                : (this.signUpMode ? 'Create account' : 'Sign in with Email')}
            </button>
            <button
              type="button"
              class="pfa-toggle-mode"
              onClick={() => { this.signUpMode = !this.signUpMode; this.errorMessage = ''; }}
              disabled={this.isLoading}
            >
              {this.signUpMode ? 'Have an account? Sign in' : 'New here? Create an account'}
            </button>
          </form>
        )}

        <p class={{ 'pfa-error': true, 'pfa-error--visible': !!this.errorMessage }}>
          {this.errorMessage}
        </p>
      </div>
    );
  }
}
