/**
 * /auth/signin's rules and lines (the owner's, moved out of the client file so they're tested).
 * NextAuth sends ?error=<code> and an absolute ?callbackUrl; nothing here touches window.
 */
export type SignInMessage = { kind: "Warning" | "Notice"; text: string };

// A Map, so codes like "__proto__" or "constructor" can't hit Object.prototype.
const SIGN_IN_ERRORS = new Map<string, SignInMessage>([
  ["OAuthAccountNotLinked", { kind: "Warning", text: "This email is already linked to another sign-in method." }],
  ["AccessDenied", { kind: "Warning", text: "Access was denied. You don't have permission to sign in." }],
  ["OAuthCallback", { kind: "Warning", text: "Sign-in was cancelled or failed, please try again." }],
  ["OAuthSignin", { kind: "Warning", text: "Sign-in was cancelled or failed, please try again." }],
  // Not a failure: you followed a link to a page that needs an account.
  ["SessionRequired", { kind: "Notice", text: "Please sign in to see that page." }],
]);

/** Any other code (unknown, "__proto__", NextAuth's provider id…). */
export const SIGN_IN_DEFAULT_ERROR: SignInMessage = {
  kind: "Warning",
  text: "Something went wrong while signing in. Please try again.",
};

/** Already signed in (shown with 《Notice》; the slime turns into a Named Slime). */
export const SIGNED_IN_LINE = "Naming complete. You're already signed in. Redirecting…";

/** Without JavaScript sign-in can't work: signIn() is a CSRF-protected POST (shown with 《Report》). */
export const SIGN_IN_NOSCRIPT = "Signing in needs JavaScript on this site.";

/** The message for a ?error= code; null when there is none (missing or empty). */
export function signInMessage(code: string | null): SignInMessage | null {
  if (!code) return null;
  return SIGN_IN_ERRORS.get(code) ?? SIGN_IN_DEFAULT_ERROR;
}

/**
 * Where to go after signing in. Only same-origin destinations are allowed (NextAuth sends absolute
 * URLs), and never the sign-in page itself. Call it with window.location.origin from effects and
 * handlers only.
 */
export function safeCallbackPath(raw: string | null, origin: string): string {
  if (!raw) return "/";
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return "/";
    if (url.pathname.startsWith("/auth/signin")) return "/";
    // A same-origin URL can still have a path like "//evil.com" (or "/\evil.com"),
    // which the browser treats as protocol-relative once it is used on its own.
    if (/^\/[/\\]/.test(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
