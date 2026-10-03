"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import SagePanel from "@/components/theme/SagePanel";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/components/theme/tokens";
import { searchPath } from "@/lib/routes";
import TopAnimeBanner from "./TopAnimeBanner";
import TopAnimeShell from "./TopAnimeShell";

export default function TopAnimeError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // Next 16's retry() re-fetches the server render; reset() would only re-render the failed payload.
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <TopAnimeShell
      banner={
        <TopAnimeBanner sage={{ kind: "Warning", text: "Couldn't reach MyAnimeList's ranking." }} />
      }
    >
      <div role="alert" className="lg:col-span-2">
        <SagePanel
          kind="Warning"
          mood="worried"
          title="The ranking wandered off"
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  if (!pending) startTransition(() => retry());
                }}
                aria-disabled={pending || undefined}
                className={PRIMARY_BUTTON}
              >
                {pending ? "Retrying…" : "Retry"}
              </button>
              <Link href="/anime" className={GHOST_BUTTON}>
                Browse this season
              </Link>
              <Link href={searchPath()} prefetch={false} className={GHOST_BUTTON}>
                Search anime
              </Link>
            </>
          }
        >
          MyAnimeList may be busy or briefly down. Wait a few seconds, then retry.
        </SagePanel>
      </div>
    </TopAnimeShell>
  );
}
