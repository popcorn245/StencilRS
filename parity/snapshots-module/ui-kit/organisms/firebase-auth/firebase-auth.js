import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopFirebaseAuthStyle0 from "./ui-kit/organisms/firebase-auth/firebase-auth.css?tag=pop-firebase-auth&encapsulation=scoped";
export const PopFirebaseAuth = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.authSuccess = __stencil_createEvent(this, "authSuccess", 7);
        this.authError = __stencil_createEvent(this, "authError", 7);
    }
    /**
     * The initialized FirebaseApp instance (`FirebaseApp` from `firebase/app`).
     * Required. Passed as a property (not an attribute).
     */
    firebaseApp = null;
    /** Which auth providers to expose. Comma-separated or JSON array. */
    providers = 'google,email';
    /** Where to navigate after successful auth (consumer may also override via authSuccess). */
    redirectUrl = '/';
    /** App name used in the headline. */
    appName = 'App';
    /** Fired with the signed-in user. Consumer typically routes to redirectUrl. */
    authSuccess;
    /** Fired when sign-in/up fails. */
    authError;
    isLoading = false;
    errorMessage = '';
    email = '';
    password = '';
    signUpMode = false;
    get providerList() {
        const raw = (this.providers || '').trim();
        if (!raw)
            return ['google', 'email'];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
                return parsed;
        }
        catch { /* fall through */ }
        return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    isMobile() {
        if (typeof navigator === 'undefined')
            return false;
        return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
    async connectedCallback() {
        // Handle returning from signInWithRedirect (mobile Google sign-in)
        if (!this.firebaseApp)
            return;
        try {
            const { getAuth, getRedirectResult } = await import('firebase/auth');
            const auth = getAuth(this.firebaseApp);
            const result = await getRedirectResult(auth);
            if (result?.user) {
                this.authSuccess.emit({ user: result.user });
            }
        }
        catch (err) {
            // getRedirectResult throws on transient issues — surface only if user-actionable
            if (err?.code && err.code !== 'auth/no-auth-event') {
                this.errorMessage = err?.message ?? 'Sign in failed after redirect.';
                this.authError.emit({ error: err });
            }
        }
    }
    async handleGoogleSignIn() {
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
        }
        catch (err) {
            this.errorMessage = err?.message ?? 'Sign in failed. Please try again.';
            this.authError.emit({ error: err });
        }
        finally {
            this.isLoading = false;
        }
    }
    async handleEmailSubmit(e) {
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
        }
        catch (err) {
            const code = err?.code;
            if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
                this.errorMessage = 'Invalid email or password.';
            }
            else if (code === 'auth/email-already-in-use') {
                this.errorMessage = 'That email is already registered.';
            }
            else if (code === 'auth/weak-password') {
                this.errorMessage = 'Password must be at least 6 characters.';
            }
            else {
                this.errorMessage = err?.message ?? 'Sign in failed. Please try again.';
            }
            this.authError.emit({ error: err });
        }
        finally {
            this.isLoading = false;
        }
    }
    render() {
        const list = this.providerList;
        const showGoogle = list.includes('google');
        const showEmail = list.includes('email');
        return (h("div", { key: '0', class: "pfa-card" },
            h("div", { key: '1', class: "pfa-logo" }, "\uD83C\uDF7F"),
            h("h1", { key: '2', class: "pfa-title" }, this.appName),
            h("p", { key: '3', class: "pfa-subtitle" }, "Sign in to continue."),
            showGoogle && (h("button", { key: '4', type: "button", class: "pfa-google-btn", onClick: () => this.handleGoogleSignIn(), disabled: this.isLoading },
                h("svg", { key: '5', width: "18", height: "18", viewBox: "0 0 18 18", "aria-hidden": "true" },
                    h("path", { key: '6', fill: "#4285F4", d: "M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" }),
                    h("path", { key: '7', fill: "#34A853", d: "M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" }),
                    h("path", { key: '8', fill: "#FBBC05", d: "M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z" }),
                    h("path", { key: '9', fill: "#EA4335", d: "M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" })),
                h("span", { key: 'a' }, this.isLoading ? 'Signing in...' : 'Continue with Google'))),
            showGoogle && showEmail && h("div", { key: 'b', class: "pfa-divider" }, "or"),
            showEmail && (h("form", { key: 'c', class: "pfa-form", onSubmit: (e) => this.handleEmailSubmit(e) },
                h("input", { key: 'd', type: "email", placeholder: "Email", autocomplete: "email", value: this.email, onInput: (e) => (this.email = e.target.value), disabled: this.isLoading }),
                h("input", { key: 'e', type: "password", placeholder: "Password", autocomplete: this.signUpMode ? 'new-password' : 'current-password', value: this.password, onInput: (e) => (this.password = e.target.value), disabled: this.isLoading }),
                h("button", { key: 'f', type: "submit", class: "pfa-submit", disabled: this.isLoading }, this.isLoading
                    ? (this.signUpMode ? 'Creating account...' : 'Signing in...')
                    : (this.signUpMode ? 'Create account' : 'Sign in with Email')),
                h("button", { key: 'g', type: "button", class: "pfa-toggle-mode", onClick: () => { this.signUpMode = !this.signUpMode; this.errorMessage = ''; }, disabled: this.isLoading }, this.signUpMode ? 'Have an account? Sign in' : 'New here? Create an account'))),
            h("p", { key: 'h', class: { 'pfa-error': true, 'pfa-error--visible': !!this.errorMessage } }, this.errorMessage)));
    }
    static get style() { return PopFirebaseAuthStyle0(); }
};
__stencil_proxyCustomElement(PopFirebaseAuth, [514, "pop-firebase-auth", {
        "firebaseApp": [8, "firebase-app"],
        "providers": [1],
        "redirectUrl": [1, "redirect-url"],
        "appName": [1, "app-name"],
        "isLoading": [32],
        "errorMessage": [32],
        "email": [32],
        "password": [32],
        "signUpMode": [32]
    }]);
//# sourceMappingURL=firebase-auth.js.map