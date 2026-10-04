import { describe, expect, it } from "vitest";
import { SIGN_IN_DEFAULT_ERROR, safeCallbackPath, signInMessage } from "./signIn";

const O = "https://kylevb.com";

describe("signInMessage", () => {
  it("shows nothing without a code", () => {
    expect(signInMessage(null)).toBeNull();
    expect(signInMessage("")).toBeNull();
  });

  it("explains NextAuth's codes in the owner's words", () => {
    expect(signInMessage("OAuthAccountNotLinked")).toEqual({
      kind: "Warning",
      text: "This email is already linked to another sign-in method.",
    });
    expect(signInMessage("AccessDenied")).toEqual({
      kind: "Warning",
      text: "Access was denied. You don't have permission to sign in.",
    });
    expect(signInMessage("OAuthCallback")).toEqual({
      kind: "Warning",
      text: "Sign-in was cancelled or failed, please try again.",
    });
    expect(signInMessage("OAuthSignin")).toEqual({
      kind: "Warning",
      text: "Sign-in was cancelled or failed, please try again.",
    });
  });

  it("treats SessionRequired as a notice, not a failure", () => {
    expect(signInMessage("SessionRequired")).toEqual({ kind: "Notice", text: "Please sign in to see that page." });
  });

  it("falls back to the default for unknown codes, prototype keys included", () => {
    for (const code of ["__proto__", "constructor", "toString", "hasOwnProperty", "Bogus", "google"]) {
      expect(signInMessage(code)).toEqual(SIGN_IN_DEFAULT_ERROR);
    }
  });
});

describe("safeCallbackPath", () => {
  it("defaults to the home page", () => {
    expect(safeCallbackPath(null, O)).toBe("/");
    expect(safeCallbackPath("", O)).toBe("/");
  });

  it("rejects other origins and schemes", () => {
    expect(safeCallbackPath("https://evil.com/x", O)).toBe("/");
    expect(safeCallbackPath("http://kylevb.com/topanime", O)).toBe("/");
    expect(safeCallbackPath("javascript:alert(1)", O)).toBe("/");
  });

  it("rejects protocol-relative paths", () => {
    expect(safeCallbackPath("//evil.com", O)).toBe("/");
    expect(safeCallbackPath("/\\evil.com", O)).toBe("/");
    // The URL parser strips the tab, leaving "//evil.com".
    expect(safeCallbackPath("/\t/evil.com", O)).toBe("/");
  });

  it("never returns to the sign-in page itself", () => {
    expect(safeCallbackPath("/auth/signin", O)).toBe("/");
    expect(safeCallbackPath("/auth/signin?callbackUrl=/x", O)).toBe("/");
    expect(safeCallbackPath(`${O}/auth/signin?error=OAuthSignin`, O)).toBe("/");
  });

  it("keeps same-origin paths with their query and hash", () => {
    expect(safeCallbackPath("/topanime?x=1#y", O)).toBe("/topanime?x=1#y");
    expect(safeCallbackPath(`${O}/user/abc?shelf=watching`, O)).toBe("/user/abc?shelf=watching");
    // Starts with "/", not "//": an encoded slash stays a same-origin path.
    expect(safeCallbackPath("/%2F%2Fevil.com", O)).toBe("/%2F%2Fevil.com");
  });
});
