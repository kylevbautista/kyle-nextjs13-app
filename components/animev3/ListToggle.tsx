"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMyList } from "@/components/utils/useMyList";
import { displayTitle } from "@/lib/anime/types";
import type { AnimeActionResult } from "@/lib/anime/cardLabels";
import type { AnimeMedia, ListStatus } from "@/lib/anime/types";
import type { AnimeCardActionProps } from "@/components/theme/AnimeCard";
import { signInPath } from "@/lib/routes";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]";

const PILL = `inline-flex h-11 min-w-[108px] shrink-0 items-center justify-center rounded-full px-3 text-xs font-bold md:h-[24px] ${FOCUS_RING}`;

/** Full-width card button (AnimeCard); same states as the pill. Fixed height, so a long label wraps inside it. */
const BLOCK = `inline-flex h-11 w-full items-center justify-center rounded-lg px-2 text-center text-xs font-bold leading-tight md:h-9 ${FOCUS_RING}`;

/** The classic card's footer pill (AnimeInfoCard): fills its slot, 44px on phones. */
const FILL = `inline-flex h-11 w-full items-center justify-center rounded-full px-3 text-center text-xs font-bold leading-tight md:h-9 ${FOCUS_RING}`;

/** How long the classic card's perched slime gulps after this toggle's own add (data-just-added). */
const JUST_ADDED_MS = 900;

/**
 * The shared "+ Add to list" / "✓ On my list" toggle on every anime card.
 *
 * Cards use the full-width 'block' size (ListToggleAction below) or the
 * classic card's 'fill' pill (ListToggleFillAction). In-list buttons carry
 * `data-in-list`, and `data-just-added` for a moment after this toggle's own
 * add (the classic card's perched slime reads both; nothing else does). The
 * landing adds: a status for the add (Plan to Watch), a label, and
 * `onSignedOutAdd`, which turns the signed-out "Sign in to track" link into a
 * button that opens its sign-in intent dialog. `onResult` reports each add or
 * remove (the details sheet speaks it: its modal makes the page's status and
 * the toasts inert).
 */
export default function ListToggle({
  info,
  addStatus,
  addLabel,
  size = "pill",
  signInCallbackUrl,
  onSignedOutAdd,
  onAdd,
  onResult,
}: {
  info: AnimeMedia;
  /** List status the show is added with (default: the server's, Watching). */
  addStatus?: ListStatus;
  /** Replaces "+ Add to list". */
  addLabel?: string;
  size?: "pill" | "block" | "fill";
  /** Where "Sign in to track" returns to (default: this page, query included). */
  signInCallbackUrl?: string;
  /** Signed out: called instead of rendering the "Sign in to track" link. */
  onSignedOutAdd?: (info: AnimeMedia, trigger: HTMLElement) => void;
  /** Called after a successful add (not on failure or remove). */
  onAdd?: (info: AnimeMedia) => void;
  /** Called after every add or remove, with whether it worked. */
  onResult?: (result: AnimeActionResult) => void;
}) {
  const { sessionStatus, signedIn, loaded, isInList, add, remove } = useMyList();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // Removing deletes the show's progress, score and dates, so it takes a second
  // tap (touch screens never see the hover "✕ Remove" hint).
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const justAddedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const title = displayTitle(info);
  const shape = size === "block" ? BLOCK : size === "fill" ? FILL : PILL;
  const addText = addLabel ?? "+ Add to list";
  const addAction = addStatus === "planning" ? "Plan to watch" : "Add to list";

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      if (justAddedTimer.current) clearTimeout(justAddedTimer.current);
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
    const noScript = size === "block" || size === "fill" ? " js-only" : "";
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
    const op = inList ? "remove" : "add";
    if (op === "add") {
      // Set before the request: the optimistic overlay flips the button to "On my list" right away.
      if (justAddedTimer.current) clearTimeout(justAddedTimer.current);
      setJustAdded(true);
      justAddedTimer.current = setTimeout(() => setJustAdded(false), JUST_ADDED_MS);
    }
    try {
      const ok = op === "remove" ? await remove(info) : await add(info, addStatus);
      if (ok && op === "add") onAdd?.(info);
      if (!ok && op === "add") {
        if (justAddedTimer.current) clearTimeout(justAddedTimer.current);
        setJustAdded(false);
      }
      onResult?.({ op, ok });
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
          data-in-list=""
          aria-label={`Tap again to remove ${title} and its progress`}
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
        data-in-list=""
        data-just-added={justAdded || undefined}
        aria-label={`On my list. Remove ${title}`}
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

/** The season page's and /search's card action (AnimeCard's `Action`): the toggle, full width. */
export function ListToggleAction({ media, onResult }: AnimeCardActionProps) {
  return <ListToggle info={media} size="block" onResult={onResult} />;
}

/** The classic card's action (AnimeInfoCard's `Action`): the toggle as its footer pill. */
export function ListToggleFillAction({ media, onResult }: AnimeCardActionProps) {
  return <ListToggle info={media} size="fill" onResult={onResult} />;
}
