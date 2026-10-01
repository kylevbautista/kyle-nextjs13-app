"use client";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { showsLabel } from "@/lib/landing";
import { airingSchedulePath, myListPath, signInPath } from "@/lib/routes";
import { trackLanding, type LandingCta, type LandingLocation } from "./analytics";
import { SageTag } from "./SageLine";
import { useLandingSession } from "./useLandingSession";

/**
 * The landing's primary CTA slot and the status line under it, in every
 * session state. Each size is a fixed box, identical in every state, so the
 * session resolving never shifts the layout:
 * - loading:    an aria-hidden skeleton (plus a <noscript> sign-in link)
 * - signed out: "Start my list" → straight to Google (a real href for no-JS
 *               and modifier clicks; errors still land on /auth/signin)
 * - signed in:  "Add my first shows" (empty list) or My List / Airing Schedule
 */

/** Every landing sign-in returns to the Quest Log. */
const SIGN_IN_CALLBACK_URL = "/#quests";
const SIGN_IN_HREF = signInPath(SIGN_IN_CALLBACK_URL);

export type SessionCtaSize = "hero" | "section" | "final" | "sticky";

const BOX: Record<SessionCtaSize, string> = {
  hero: "h-14 w-full sm:w-[15.5rem]",
  section: "h-12 w-full sm:w-[14rem]",
  final: "h-14 w-full sm:w-[16rem] lg:h-16",
  sticky: "h-11 shrink-0",
};

const SHAPE: Record<SessionCtaSize, string> = {
  hero: "rounded-2xl px-6 text-base",
  section: "rounded-xl px-5 text-base",
  final: "rounded-2xl px-6 text-base lg:text-lg",
  sticky: "rounded-xl px-4 text-sm",
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(18,18,18)]";

const PRIMARY = `inline-flex items-center justify-center gap-3 whitespace-nowrap bg-blue-600 font-semibold text-white shadow-[0_0_0_1px_rgba(149,204,255,.35),0_10px_40px_-10px_rgba(59,130,246,.8)] transition-colors hover:bg-blue-500 aria-disabled:cursor-wait aria-disabled:opacity-80 ${FOCUS_RING}`;

function GoogleChip() {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white"
    >
      <GoogleIcon className="h-4 w-4" />
    </span>
  );
}

/** A plain left click that the page may take over (not cmd/ctrl/shift/alt or middle). */
const isPlainClick = (event: MouseEvent) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

export function SessionCta({
  location,
  size,
  signedInAction = "my_list",
}: {
  location: LandingLocation;
  size: SessionCtaSize;
  signedInAction?: "my_list" | "airing_schedule";
}) {
  const session = useLandingSession();
  const [pending, setPending] = useState(false);

  // Back from Google via the bfcache: the button comes back as "Opening Google…".
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const box = BOX[size];
  const button = `${PRIMARY} ${SHAPE[size]} ${box}`;

  if (session.status === "loading") {
    return (
      <div aria-busy="true" className={`relative ${box}`}>
        <span
          aria-hidden="true"
          className={`js-only block h-full bg-white/10 animate-pulse ${
            size === "sticky" ? "w-40 rounded-xl" : "w-full rounded-2xl"
          }`}
        />
        <noscript>
          <a href={SIGN_IN_HREF} className={`absolute inset-0 ${PRIMARY} ${SHAPE[size]}`}>
            Start my list
          </a>
        </noscript>
      </div>
    );
  }

  if (session.status === "signedOut") {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      if (pending) return;
      setPending(true);
      trackLanding("signin_start", { location, source: "cta" });
      signIn("google", { callbackUrl: SIGN_IN_CALLBACK_URL }).catch(() => setPending(false));
    };
    return (
      <a
        data-cta-primary=""
        href={SIGN_IN_HREF}
        onClick={handleClick}
        aria-label={pending ? undefined : "Start my list, sign in with Google"}
        aria-disabled={pending || undefined}
        className={button}
      >
        <GoogleChip />
        <span>{pending ? "Opening Google…" : "Start my list"}</span>
      </a>
    );
  }

  const click = (cta: LandingCta) => () => trackLanding("cta_click", { cta, location });

  if (session.count === 0) {
    return (
      <a data-cta-primary="" href="#quests" onClick={click("add_first_shows")} className={button}>
        Add my first shows
      </a>
    );
  }

  if (signedInAction === "airing_schedule") {
    return (
      <Link
        data-cta-primary=""
        href={airingSchedulePath(session.userId)}
        prefetch={false}
        onClick={click("airing_schedule")}
        className={button}
      >
        Open my Airing Schedule
      </Link>
    );
  }

  return (
    <Link
      data-cta-primary=""
      href={myListPath(session.userId)}
      prefetch={false}
      onClick={click("open_my_list")}
      className={button}
    >
      {size === "sticky" ? "My List" : "Open My List"}
      {size === "section" && <span aria-hidden="true">→</span>}
    </Link>
  );
}

const STATUS_LINK = `rounded text-[#95ccff] underline-offset-2 hover:underline ${FOCUS_RING}`;

const SIGNED_OUT_COPY: Record<"hero" | "tracker" | "final", string> = {
  hero: "Free · No ads · One tap with Google, no new password.",
  tracker: "Free · No new password",
  final: "Free · No ads · Your list gets its own link.",
};

/**
 * The line under a SessionCta (min-h-10 in every state). Signed-in copy is
 * only ever rendered in the browser, for its owner.
 */
export function SessionStatusLine({ variant }: { variant: "hero" | "tracker" | "final" }) {
  const session = useLandingSession();

  let content: ReactNode;
  if (session.status === "loading") {
    content = (
      <>
        <span
          aria-hidden="true"
          className="js-only block h-3 w-56 max-w-full rounded-full bg-white/10 animate-pulse"
        />
        <noscript>{SIGNED_OUT_COPY[variant]}</noscript>
      </>
    );
  } else if (session.status === "signedOut") {
    content = SIGNED_OUT_COPY[variant];
  } else if (variant === "tracker") {
    content = "Your real list keeps all of this.";
  } else {
    const name = session.firstName;
    if (session.count === null) {
      content = name ? `Welcome back, ${name}.` : "Welcome back.";
    } else if (session.count === 0) {
      content = (
        <span>
          <SageTag kind="Notice" />
          {name ? `Welcome, ${name}.` : "Welcome."} Your list is empty. Recommend: predation.
        </span>
      );
    } else {
      const userId = session.userId;
      content = (
        <span>
          {name ? `Welcome back, ${name}. ` : "Welcome back. "}
          {showsLabel(session.count)} on your list ·{" "}
          <Link
            href={airingSchedulePath(userId)}
            prefetch={false}
            onClick={() =>
              trackLanding("cta_click", { cta: "airing_schedule", location: variant === "hero" ? "hero" : "quests" })
            }
            className={STATUS_LINK}
          >
            Airing Schedule
          </Link>
        </span>
      );
    }
  }

  return (
    <p className="flex min-h-10 items-center text-sm leading-5 text-[rgb(164,164,164)]">{content}</p>
  );
}
