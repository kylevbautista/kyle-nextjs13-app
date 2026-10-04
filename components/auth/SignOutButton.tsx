"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { GHOST_BUTTON_CONSOLE } from "@/components/theme/tokens";

/** The account card's Sign out. Without JavaScript: NextAuth's own sign-out page (a CSRF form that works without JS). */
export default function SignOutButton() {
  const [pending, setPending] = useState(false);

  // Back after signing out can restore this page from the bfcache with the button still
  // pending, and the guard below would then ignore every click (sign-in does the same).
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleSignOut = async () => {
    if (pending) return; // aria-disabled doesn't block clicks
    setPending(true);
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      setPending(false);
    }
  };

  return (
    // A block wrapper: the card's centered flex column would shrink the no-JS <noscript> (and its w-full link) to fit.
    <div className="w-full">
      <button
        type="button"
        onClick={handleSignOut}
        aria-disabled={pending || undefined}
        className={`js-only w-full ${GHOST_BUTTON_CONSOLE}`}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- NextAuth's own sign-out page (not a Next page), the no-JS way out */}
        <a href="/api/auth/signout" className={`w-full ${GHOST_BUTTON_CONSOLE}`}>
          Sign out
        </a>
      </noscript>
    </div>
  );
}
