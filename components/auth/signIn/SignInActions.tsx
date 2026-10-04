"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import GoogleButton from "@/components/auth/GoogleButton";
import { SageTag } from "@/components/home/SageLine";
import { CARD_TEXT, SIGN_IN_ACTIONS, SIGN_IN_ALERT, SIGN_IN_NOTICE, TEXT_LINK_CONSOLE } from "@/components/theme/tokens";
import { SIGNED_IN_LINE, safeCallbackPath, signInMessage } from "@/lib/signIn";

/**
 * Sign-in's only client island: the action slot under the server-rendered slime, h1 and subhead
 * (useSearchParams needs this Suspense boundary, CLAUDE.md §9.10).
 *
 * One spoken channel: the persistent role="status" (always the first child, empty until the session
 * says you're signed in, so filling it is announced) or the ?error= box's role="alert" (only while
 * not signed in). Never both on screen. data-slime on either tells SignInSlime which slime to show.
 */
export default function SignInActions() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const [pending, setPending] = useState(false);

  const rawCallbackUrl = searchParams.get("callbackUrl");
  const message = signInMessage(searchParams.get("error"));
  const signedIn = status === "authenticated";

  // Already signed in: on to the destination.
  useEffect(() => {
    if (signedIn) router.replace(safeCallbackPath(rawCallbackUrl, window.location.origin));
  }, [signedIn, rawCallbackUrl, router]);

  // Coming back with the browser's back button restores this page from the
  // bfcache with the button still pending.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleGoogleSignIn = async () => {
    // aria-disabled doesn't block clicks.
    if (pending || status === "loading") return;
    setPending(true);
    try {
      await signIn("google", { callbackUrl: safeCallbackPath(rawCallbackUrl, window.location.origin) });
    } catch {
      setPending(false);
    }
  };

  return (
    <div className={SIGN_IN_ACTIONS}>
      <div role="status" className="w-full">
        {signedIn && (
          <p data-slime="named" className={CARD_TEXT}>
            <SageTag kind="Notice" />
            {SIGNED_IN_LINE}
          </p>
        )}
      </div>
      {signedIn ? (
        <Link href="/auth" className={`${TEXT_LINK_CONSOLE} mt-2`}>
          Go to your account
        </Link>
      ) : (
        <>
          {message && (
            <p
              role="alert"
              data-slime={message.kind === "Warning" ? "worried" : undefined}
              className={message.kind === "Warning" ? SIGN_IN_ALERT : SIGN_IN_NOTICE}
            >
              <SageTag kind={message.kind} className={message.kind === "Warning" ? "text-rose-300" : undefined} />
              {message.text}
            </p>
          )}
          <GoogleButton
            label={pending ? "Redirecting to Google…" : "Sign in with Google"}
            busy={pending || status === "loading"}
            onClick={handleGoogleSignIn}
          />
        </>
      )}
    </div>
  );
}
