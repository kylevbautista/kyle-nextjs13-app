"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

// NextAuth's ?error= codes. A Map, so codes like "__proto__" can't hit Object.prototype.
const ERROR_MESSAGES = new Map<string, string>([
  [
    "OAuthAccountNotLinked",
    "This email is already linked to another sign-in method.",
  ],
  ["AccessDenied", "Access was denied. You don't have permission to sign in."],
  ["OAuthCallback", "Sign-in was cancelled or failed, please try again."],
  ["OAuthSignin", "Sign-in was cancelled or failed, please try again."],
  ["SessionRequired", "Please sign in to see that page."],
]);
const DEFAULT_ERROR = "Something went wrong while signing in. Please try again.";

/**
 * Only same-origin destinations are allowed (NextAuth sends absolute URLs),
 * and never this page itself. Uses window: call it from effects and handlers only.
 */
function resolveCallbackUrl(raw: string | null): string {
  if (!raw) return "/";
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    if (url.pathname.startsWith("/auth/signin")) return "/";
    // A same-origin URL can still have a path like "//evil.com" (or "/\evil.com"),
    // which the browser treats as protocol-relative once it is used on its own.
    if (/^\/[/\\]/.test(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function SignInCard({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby="signin-title"
      className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] p-6 text-center text-white sm:p-8"
    >
      <Image src="/rimuru.png" alt="" width={100} height={70} />
      <div className="flex flex-col gap-2">
        <h1 id="signin-title" className="text-2xl font-bold">
          Sign in
        </h1>
        <p className="text-[rgb(164,164,164)]">
          Keep a list, track your episode progress and get your own airing
          schedule.
        </p>
      </div>
      {children}
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export default function PageBase() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const [pending, setPending] = useState(false);

  const rawCallbackUrl = searchParams.get("callbackUrl");
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode
    ? ERROR_MESSAGES.get(errorCode) ?? DEFAULT_ERROR
    : null;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(resolveCallbackUrl(rawCallbackUrl));
    }
  }, [status, rawCallbackUrl, router]);

  // Coming back with the browser's back button restores this page from the
  // bfcache with the button still disabled.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleGoogleSignIn = async () => {
    setPending(true);
    try {
      await signIn("google", {
        callbackUrl: resolveCallbackUrl(rawCallbackUrl),
      });
    } catch {
      setPending(false);
    }
  };

  if (status === "authenticated") {
    return (
      <SignInCard>
        <p role="status" className="text-[rgb(164,164,164)]">
          You&apos;re already signed in. Redirecting…
        </p>
        <Link
          href="/auth"
          className="rounded text-[#95ccff] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
        >
          Go to your account
        </Link>
      </SignInCard>
    );
  }

  return (
    <SignInCard>
      {errorMessage && (
        <p
          role="alert"
          className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {errorMessage}
        </p>
      )}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={pending || status === "loading"}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-medium text-[rgb(30,30,30)] transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(38,38,38)] disabled:cursor-wait disabled:opacity-60"
      >
        <GoogleIcon />
        {pending ? "Redirecting to Google…" : "Sign in with Google"}
      </button>
    </SignInCard>
  );
}
