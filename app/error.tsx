"use client";
import { Suspense, lazy, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { SageTag } from "@/components/home/SageLine";
import CardPage from "@/components/theme/CardPage";
import RetryButton from "@/components/theme/RetryButton";
import {
  CARD_ACTIONS,
  CARD_TEXT,
  CARD_TITLE_CLASS,
  ERROR_ID,
  ERROR_SLIME_BOX,
  GHOST_BUTTON_CONSOLE,
  PRIMARY_BUTTON_CONSOLE,
  STATUS_KAOMOJI,
} from "@/components/theme/tokens";

/*
 * This file ships on every page (its chunk is in every page's script list), so the sky and the
 * slime load only when it renders. A failed import (offline, a deploy's stale chunk: the error may
 * be exactly that) renders nothing instead of escalating to global-error.
 */
function Nothing() {
  return null;
}
const loadDecor = () => import("@/components/theme/ErrorDecor");
// lazy<…>: TypeScript can't infer the success | fallback union of .then(ok, fail) by itself (TS2322).
const ErrorSky = lazy<() => ReactNode>(() =>
  loadDecor().then((m) => ({ default: m.ErrorSky }), () => ({ default: Nothing })),
);
const ErrorSlime = lazy<() => ReactNode>(() =>
  loadDecor().then((m) => ({ default: m.ErrorSlime }), () => ({ default: Nothing })),
);

/**
 * Everything under the root layout failed (the nav and footer stay). Rendered by the browser only:
 * a server render error above every Suspense boundary ships Next's empty __next_error__ shell.
 * Try again is Next 16.3's retry() (refetch + re-render; reset() alone re-shows the error).
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // React hoists every <title> in front of the current first one, so the newest wins. On a full load
  // or a failed retry that is ours; after a client navigation into a failing route, Next's metadata
  // title mounts a few ms after this page and would win. Keep our own node first while mounted.
  // Never set document.title (it would rewrite the route's React-owned title). A layout effect: its
  // cleanup (and the ref's detach) runs in the commit that removes the page, so a successful retry
  // never sees our title moved back in.
  const titleRef = useRef<HTMLTitleElement>(null);
  useLayoutEffect(() => {
    const keepFirst = () => {
      const own = titleRef.current;
      if (!own?.isConnected) return;
      const first = document.head.querySelector("title");
      if (first && first !== own) document.head.insertBefore(own, first);
    };
    keepFirst();
    const observer = new MutationObserver(keepFirst);
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* The error render has no document title otherwise (F3). React hoists it; it goes away on a successful retry. */}
      <title ref={titleRef}>Something went wrong · kylevb</title>
      <CardPage
        titleId="error-title"
        sky={
          <Suspense fallback={null}>
            <ErrorSky />
          </Suspense>
        }
      >
        <div aria-hidden="true" className="flex flex-col items-center">
          <span className={ERROR_SLIME_BOX}>
            <Suspense fallback={null}>
              <ErrorSlime />
            </Suspense>
          </span>
          <p className={STATUS_KAOMOJI}>(╯°□°)╯︵ ┻━┻</p>
        </div>
        {/* The page's one spoken channel: the heading and message only (never the buttons or the ID). */}
        <div role="alert" className="flex flex-col items-center gap-5">
          <h1 id="error-title" className={CARD_TITLE_CLASS}>
            Something went wrong
          </h1>
          <p className={CARD_TEXT}>
            <SageTag kind="Warning" />
            This page hit an unexpected error. It might be a hiccup on our side or with the anime data
            source — try again in a moment.
          </p>
        </div>
        {error.digest && (
          <p className={ERROR_ID}>
            Error ID: <code className="select-all text-[#cfe8ff]">{error.digest}</code>
          </p>
        )}
        <div className={CARD_ACTIONS}>
          <RetryButton retry={retry} label="Try again" pendingLabel="Trying again…" className={PRIMARY_BUTTON_CONSOLE} />
          <Link href="/" className={GHOST_BUTTON_CONSOLE}>
            Home
          </Link>
        </div>
      </CardPage>
    </>
  );
}
