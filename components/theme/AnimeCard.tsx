"use client";
import { memo, useId, type ComponentType, type CSSProperties } from "react";
import CountdownText from "@/components/home/CountdownText";
import Slime from "@/components/home/Slime";
import AniListCover from "./AniListCover";
import { StarIcon } from "./icons";
import { CARD, TEXT_LINK } from "./tokens";
import { isPremiereNext, nextAiring } from "@/lib/anime/airing";
import { cardMeta, cardStatusLabel, genresLine, type AnimeActionResult } from "@/lib/anime/cardLabels";
import { displayTitle, type AnimeMedia } from "@/lib/anime/types";
import { seasonLabel } from "@/lib/landing";

export interface AnimeCardActionProps {
  media: AnimeMedia;
  /** Passed only by the details sheet, which speaks the result itself. Cards never pass it. */
  onResult?: (result: AnimeActionResult) => void;
}
/**
 * A page's add control (ListToggleAction, the landing's AiringNextAdd /
 * QuestAdd). Define it at module level so it is stable: the card is memo'd.
 */
export type AnimeCardAction = ComponentType<AnimeCardActionProps>;

export type OpenDetails = (media: AnimeMedia, opts: { continuing: boolean; triggerId: string }) => void;

/**
 * What a grid card takes: the poster (this file) and the classic layout
 * (AnimeInfoCard) share it, so a page can switch between them
 * (components/theme/cardLayout.ts). Cover sizes live in tokens.ts.
 */
export interface AnimeGridCardProps {
  media: AnimeMedia;
  Action: AnimeCardAction;
  /** Started in an earlier season (the Continuing badge). */
  continuing?: boolean;
  /** Opens the page's details sheet (useAnimeDetails). Without it the title is plain text. Must be stable. */
  onOpenDetails?: OpenDetails;
  /** <img sizes> for the grid the card sits in. */
  coverSizes: string;
  /** loading="eager" (the first row). */
  eager?: boolean;
  /** fetchPriority="high" (the likely LCP image). */
  priority?: boolean;
  /** 3 by default; /search's cards are h2s, the Quest Log's h4s (inside h3 quest rows). */
  headingLevel?: 2 | 3 | 4;
}

type AnimeCardProps = AnimeGridCardProps & {
  /** "full": the poster layout's grids. "compact": the Quest Log (no meta lines, small plain title). */
  variant?: "full" | "compact";
};

/**
 * The poster layout: cover with a live countdown chip (or its release
 * status), the Premiere / Continuing badge, title, "★ 7.6 · TV · Studio",
 * genres and the page's add button. The Quest Log's compact card always; the
 * season page, /search and the landing's Magic Sense when
 * ANIME_CARD_LAYOUT is "poster" (components/theme/cardLayout.ts).
 *
 * The title is a button whose ::after covers the card, so a tap anywhere but
 * the add button opens the details sheet (synopsis, facts, links), with one
 * tab stop. Fields AniList doesn't have are left out, never "TBA".
 * Wrap it in an <li>; put any rise-in animation there, not on the card (a
 * fill-mode transform would cancel CARD's hover lift).
 */
function AnimeCard({
  media,
  Action,
  variant = "full",
  continuing = false,
  onOpenDetails,
  coverSizes,
  eager = false,
  priority = false,
  headingLevel = 3,
}: AnimeCardProps) {
  const titleId = useId();
  const buttonId = useId();
  const title = displayTitle(media);
  const next = nextAiring(media);
  const premiere = isPremiereNext(media);
  const color = media.coverImage?.color ?? null;
  const covers = [media.coverImage?.medium, media.coverImage?.large, media.coverImage?.extraLarge];
  const from = continuing && !premiere ? seasonLabel(media.season, media.seasonYear ?? media.startDate?.year) : null;
  const compact = variant === "compact";
  const Heading = headingLevel === 2 ? "h2" : headingLevel === 4 ? "h4" : "h3";

  return (
    <article
      aria-labelledby={titleId}
      style={{ "--card-glow": color ?? "rgba(93,174,241,.55)" } as CSSProperties}
      className={`relative flex w-full min-w-0 flex-col overflow-hidden ${CARD}`}
    >
      <div
        className="relative aspect-[2/3] w-full bg-[rgb(38,38,38)]"
        style={color ? { backgroundColor: color } : undefined}
      >
        {covers.some(Boolean) ? (
          <AniListCover
            urls={covers}
            sizes={coverSizes}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Slime size={48} animated={false} className="absolute inset-0 m-auto" />
        )}
        {/* Narrow cards wrap the chip onto two lines, where a pill would read as a
            blob: rounded-lg until the cards are wide enough for one line. A ticking
            countdown gets a min width so it doesn't jitter (capped: min-width beats
            max-width on ~120px cards); a static status hugs its text. */}
        <span
          className={`absolute left-2 top-2 max-w-[calc(100%-1rem)] rounded-lg bg-black/70 px-2 py-1 text-[11px] font-bold leading-tight text-white lg:rounded-full ${
            next ? "min-w-[min(7.5rem,calc(100%-1rem))]" : ""
          }`}
        >
          {next ? (
            <CountdownText airingAt={next.airingAt} episode={next.episode} mode="chip" />
          ) : (
            <span className="font-medium text-[rgb(200,206,218)]">{cardStatusLabel(media)}</span>
          )}
        </span>
        {(premiere || continuing) && (
          <span
            title={from ? `Continuing from ${from}` : undefined}
            className={`absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
              premiere ? "bg-violet-600/90" : "bg-blue-600/90"
            }`}
          >
            {premiere ? "Premiere" : "Continuing"}
            {from && <span className="sr-only"> from {from}</span>}
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? "p-2" : "p-2.5 sm:p-3"}`}>
        <Heading
          id={titleId}
          className={`font-semibold text-white ${compact ? "h-8 text-xs leading-4" : "h-10 text-sm leading-5"}`}
        >
          {onOpenDetails ? (
            <>
              <button
                id={buttonId}
                type="button"
                aria-haspopup="dialog"
                data-card-title=""
                onClick={() => onOpenDetails(media, { continuing, triggerId: buttonId })}
                className="js-only block w-full rounded-sm text-left transition-colors hover:text-[#95ccff] focus-visible:outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[#95ccff]"
              >
                {/* The clamp sits on the span: -webkit-box on a <button> is unreliable. */}
                <span className="line-clamp-2" title={title}>
                  {title}
                </span>
              </button>
              <noscript>
                <a
                  href={`https://anilist.co/anime/${media.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`line-clamp-2 ${TEXT_LINK}`}
                >
                  {title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </noscript>
            </>
          ) : (
            <span className="line-clamp-2" title={title}>
              {title}
            </span>
          )}
        </Heading>
        {!compact && <MetaLines media={media} />}
        {/* Above the title's full-card overlay, so taps reach the button. */}
        <div className="relative z-10 mt-auto pt-2">
          <Action media={media} />
        </div>
      </div>
    </article>
  );
}

function MetaLines({ media }: { media: AnimeMedia }) {
  const meta = cardMeta(media);
  const genres = genresLine(media);
  return (
    <>
      {/* Fixed line boxes: every card in a row stays the same height. */}
      <p className="mt-1 h-4 truncate text-xs leading-4 text-[rgb(164,164,164)]">
        {meta.score && (
          <>
            <StarIcon className="mr-0.5 inline h-3 w-3 align-[-1px] text-[#95ccff]" />
            <span className="sr-only">AniList score </span>
            <span className="font-semibold tabular-nums text-white">{meta.score}</span>
            {meta.rest && " · "}
          </>
        )}
        {meta.rest}
      </p>
      <p className="mt-0.5 h-4 truncate text-xs leading-4 text-[rgb(130,140,160)]" title={genres || undefined}>
        {genres}
      </p>
    </>
  );
}

export default memo(AnimeCard);
