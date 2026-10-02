"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import CountdownText from "@/components/home/CountdownText";
import { SageLine, type SageKind } from "@/components/home/SageLine";
import AniListCover from "./AniListCover";
import type { AnimeCardAction, OpenDetails } from "./AnimeCard";
import { isBackdropEvent } from "./dialog";
import { FOCUS_RING_PANEL, GHOST_BUTTON_PANEL, LABEL_CLASS, SOFT_TEXT } from "./tokens";
import { nextAiring } from "@/lib/anime/airing";
import {
  NO_SYNOPSIS,
  cardStatusLabel,
  externalLinks,
  sheetActionText,
  sheetFacts,
  type AnimeActionResult,
} from "@/lib/anime/cardLabels";
import { sanitizeDescription } from "@/lib/anime/sanitize";
import { displayTitle, type AnimeMedia } from "@/lib/anime/types";

interface OpenSheet {
  media: AnimeMedia;
  continuing: boolean;
  /** The card's title button: focus returns to it on close. */
  triggerId: string;
}

/**
 * One details sheet per page: `openDetails` goes to every AnimeCard (stable),
 * and the page renders `sheet` once, outside its grid (a dialog inside a
 * re-sorted <li> would drop out of the top layer when React moves the node).
 * The sheet keeps the snapshot it opened with, so a re-sort, a later page or
 * a refresh never changes it under the reader. `fallbackFocusId` takes focus
 * on close when the card is gone.
 */
export function useAnimeDetails({
  Action,
  fallbackFocusId,
}: {
  Action: AnimeCardAction;
  fallbackFocusId: string;
}): { openDetails: OpenDetails; sheet: ReactNode } {
  const [open, setOpen] = useState<OpenSheet | null>(null);
  const openDetails = useCallback<OpenDetails>(
    (media, { continuing, triggerId }) => setOpen({ media, continuing, triggerId }),
    []
  );
  const close = useCallback(() => setOpen(null), []);
  const sheet = open ? (
    <AnimeDetailsDialog
      key={`${open.media.id}-${open.triggerId}`}
      {...open}
      Action={Action}
      fallbackFocusId={fallbackFocusId}
      onClose={close}
    />
  ) : null;
  return { openDetails, sheet };
}

/**
 * The 《Analyze》 sheet: cover, title, the next episode or release status, the
 * facts AniList has (and says plainly which it doesn't), the sanitized
 * synopsis, the page's add button and external links. A bottom sheet on
 * phones, centered from 640px. Rendered only while open.
 *
 * showModal() makes the rest of the page inert, so the page's status line and
 * the toasts can't speak while it's open: the sheet reports its own add/remove
 * results (an sr-only status plus a visible Great Sage line).
 */
function AnimeDetailsDialog({
  media,
  continuing,
  triggerId,
  Action,
  fallbackFocusId,
  onClose,
}: OpenSheet & { Action: AnimeCardAction; fallbackFocusId: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pressedOnBackdrop = useRef(false);
  const headingId = useId();
  const [result, setResult] = useState<{ kind: SageKind; text: string; count: number } | null>(null);
  const report = useCallback(
    (outcome: AnimeActionResult) =>
      setResult((previous) => ({ ...sheetActionText(outcome), count: (previous?.count ?? 0) + 1 })),
    []
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    headingRef.current?.focus();
    return () => {
      body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      const trigger = document.getElementById(triggerId);
      (trigger ?? document.getElementById(fallbackFocusId))?.focus();
    };
  }, [triggerId, fallbackFocusId]);

  const title = displayTitle(media);
  const romaji = media.title?.romaji && media.title.romaji !== title ? media.title.romaji : null;
  const next = nextAiring(media);
  const color = media.coverImage?.color ?? null;
  const synopsis = sanitizeDescription(media.description);

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        // Closed natively (e.g. a repeated Esc).
        if (!dialogRef.current?.open) onClose();
      }}
      onMouseDown={(event) => {
        pressedOnBackdrop.current = isBackdropEvent(event);
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && isBackdropEvent(event)) onClose();
        pressedOnBackdrop.current = false;
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-[#95ccff]/25 bg-[rgb(30,30,30)] p-0 pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-24px_60px_-24px_rgba(93,174,241,.45)] backdrop:bg-black/70 sm:m-auto sm:max-h-[min(46rem,calc(100dvh-2rem))] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-2xl"
    >
      {/* Mounted with the dialog, so every later result is announced. */}
      <p role="status" className="sr-only">
        {result?.text}
        {result && result.count % 2 ? "​" : ""}
      </p>
      <div className="animate-[rise-in_300ms_ease-out_both]">
        {/* Sticky only when there's room: on a short screen (or 400% zoom) it would cover the focused button. */}
        <header className="sticky top-0 z-10 flex gap-4 border-b border-[rgb(53,53,53)] bg-[rgb(30,30,30)] p-4 [@media(max-height:479px)]:static">
          <div
            className="relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-md bg-[rgb(38,38,38)]"
            style={color ? { backgroundColor: color } : undefined}
          >
            <AniListCover
              urls={[media.coverImage?.medium, media.coverImage?.large, media.coverImage?.extraLarge]}
              sizes="72px"
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p aria-hidden="true" className="font-mono text-[11px] text-[#95ccff]">
              《Analyze》
            </p>
            <h2
              ref={headingRef}
              id={headingId}
              tabIndex={-1}
              className="break-words text-lg font-bold leading-snug focus:outline-none"
            >
              {title}
            </h2>
            {romaji && <p className="break-words text-xs text-[rgb(164,164,164)]">{romaji}</p>}
            {next ? (
              <p className="text-xs font-semibold text-[#95ccff]">
                <CountdownText airingAt={next.airingAt} episode={next.episode} mode="row" />
              </p>
            ) : (
              <p className="text-xs text-[rgb(164,164,164)]">{cardStatusLabel(media)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className={`-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[rgb(200,206,218)] transition-colors hover:bg-white/10 hover:text-white md:h-9 md:w-9 ${FOCUS_RING_PANEL}`}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 p-4 text-sm">
          {sheetFacts(media, continuing).map((fact) => (
            <div key={fact.term} className="contents">
              <dt className={`${LABEL_CLASS} pt-0.5`}>{fact.term}</dt>
              <dd className="min-w-0 break-words text-[rgb(200,206,218)]">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby={`${headingId}-synopsis`} className="border-t border-[rgb(53,53,53)] p-4">
          <h3 id={`${headingId}-synopsis`} className={LABEL_CLASS}>
            Synopsis
          </h3>
          {synopsis ? (
            <div
              className={`mt-2 text-sm leading-6 ${SOFT_TEXT} [overflow-wrap:anywhere]`}
              dangerouslySetInnerHTML={{ __html: synopsis }}
            />
          ) : (
            <p className="mt-2 text-sm text-[rgb(164,164,164)]">{NO_SYNOPSIS}</p>
          )}
        </section>

        <footer className="flex flex-col gap-3 border-t border-[rgb(53,53,53)] p-4">
          <Action media={media} onResult={report} />
          {result && (
            <SageLine key={result.count} kind={result.kind} size="sm" scan="load">
              {result.text}
            </SageLine>
          )}
          <ul className="flex flex-wrap gap-2">
            {externalLinks(media).map((link) => (
              <li key={link.site}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className={GHOST_BUTTON_PANEL}>
                  {link.site} <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </dialog>
  );
}
