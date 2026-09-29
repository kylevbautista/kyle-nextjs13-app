"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMyList } from "@/components/utils/useMyList";
import { displayTitle } from "@/lib/anime/types";
import type { AnimeMedia, ListStatus } from "@/lib/anime/types";
import { signInPath } from "@/lib/routes";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]";

const PILL = `inline-flex h-[24px] min-w-[108px] shrink-0 items-center justify-center rounded-full px-3 text-xs font-bold ${FOCUS_RING}`;

/** Full-width card button (the landing's cards); same states as the pill. */
const BLOCK = `inline-flex h-9 w-full items-center justify-center rounded-lg px-2 text-xs font-bold ${FOCUS_RING}`;

/**
 * The shared "+ Add to list" / "✓ On my list" toggle on every anime card.
 *
 * With only `info` it renders exactly what the season, search and schedule
 * cards always had. The landing adds: a status for the add (Plan to Watch),
 * a label, the full-width 'block' size, and `onSignedOutAdd`, which turns
 * the signed-out "Sign in to track" link into a button that opens its
 * sign-in intent dialog.
 */
export default function ListToggle({
  info,
  addStatus,
  addLabel,
  size = "pill",
  signInCallbackUrl,
  onSignedOutAdd,
  onAdd,
}: {
  info: AnimeMedia;
  /** List status the show is added with (default: the server's, Watching). */
  addStatus?: ListStatus;
  /** Replaces "+ Add to list". */
  addLabel?: string;
  size?: "pill" | "block";
  /** Where "Sign in to track" returns to (default: this page, query included). */
  signInCallbackUrl?: string;
  /** Signed out: called instead of rendering the "Sign in to track" link. */
  onSignedOutAdd?: (info: AnimeMedia, trigger: HTMLElement) => void;
  /** Called after a successful add (not on failure or remove). */
  onAdd?: (info: AnimeMedia) => void;
}) {
  const { sessionStatus, signedIn, loaded, isInList, add, remove } = useMyList();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // Removing deletes the show's progress, score and dates, so it takes a second
  // tap (touch screens never see the hover "✕ Remove" hint).
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const title = displayTitle(info);
  const shape = size === "block" ? BLOCK : PILL;
  const addText = addLabel ?? "+ Add to list";
  const addAction = addStatus === "planning" ? "Plan to watch" : "Add to list";

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    []
  );

  const cancelConfirm = () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = null;
    setConfirmingRemove(false);
  };

  if (sessionStatus === "loading") {
    // The landing's block buttons hide their placeholder without JavaScript (.js-only).
    const noScript = size === "block" ? " js-only" : "";
    return (
      <span aria-hidden="true" className={`${shape} animate-pulse bg-[rgb(53,53,53)]${noScript}`} />
    );
  }

  if (!signedIn) {
    if (onSignedOutAdd) {
      return (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${addAction}: ${title} (sign-in required)`}
          onClick={(event) => onSignedOutAdd(info, event.currentTarget)}
          className={`${shape} bg-blue-600 text-white hover:bg-blue-500`}
        >
          {addText}
        </button>
      );
    }
    return (
      <Link
        href={signInPath(signInCallbackUrl ?? pathname ?? undefined)}
        prefetch={false}
        onClick={(event) => {
          // Include the query string (e.g. /search?q=…), which usePathname() omits.
          if (signInCallbackUrl || event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          router.push(signInPath(window.location.pathname + window.location.search));
        }}
        className={`${shape} border border-[rgb(53,53,53)] text-[#95ccff] hover:border-[#95ccff]`}
      >
        Sign in to track
      </Link>
    );
  }

  if (!loaded) {
    return (
      <button
        type="button"
        disabled
        aria-label="Loading your list"
        className={`${shape} bg-[rgb(53,53,53)] text-[rgb(164,164,164)]`}
      >
        …
      </button>
    );
  }

  const inList = isInList(info.id);
  const toggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      if (inList) await remove(info);
      else if (await add(info, addStatus)) onAdd?.(info);
    } finally {
      setPending(false);
    }
  };
  // aria-disabled instead of `disabled`: a disabled button drops keyboard focus
  // mid-request, and the add → remove swap reuses this same <button>.
  const busy = pending || undefined;

  if (inList) {
    if (confirmingRemove) {
      return (
        <button
          type="button"
          onClick={() => {
            cancelConfirm();
            void toggle();
          }}
          onBlur={cancelConfirm}
          aria-disabled={busy}
          aria-label={`Confirm: remove ${title} and its progress from your list`}
          className={`${shape} border border-red-400 bg-red-500/15 text-red-300 aria-disabled:cursor-wait aria-disabled:opacity-60`}
        >
          Tap again to remove
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => {
          if (pending) return;
          setConfirmingRemove(true);
          confirmTimer.current = setTimeout(cancelConfirm, 4_000);
        }}
        aria-disabled={busy}
        aria-pressed={true}
        aria-label={`Remove ${title} from your list`}
        className={`group ${shape} border border-[#95ccff] text-[#95ccff] hover:border-red-400 hover:text-red-300 focus-visible:border-red-400 focus-visible:text-red-300 aria-disabled:cursor-wait aria-disabled:opacity-60`}
      >
        <span className="group-hover:hidden group-focus-visible:hidden">✓ On my list</span>
        <span className="hidden group-hover:inline group-focus-visible:inline">✕ Remove</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-disabled={busy}
      aria-label={`${addAction}: ${title}`}
      className={`${shape} bg-blue-600 text-white hover:bg-blue-500 aria-disabled:cursor-wait aria-disabled:opacity-60`}
    >
      {addText}
    </button>
  );
}
