"use client";
import { memo, useId, type CSSProperties } from "react";
import CountdownText from "@/components/home/CountdownText";
import { SageTag } from "@/components/home/SageLine";
import Slime from "@/components/home/Slime";
import AniListCover from "./AniListCover";
import type { AnimeGridCardProps } from "./AnimeCard";
import { StarIcon } from "./icons";
import {
  FOCUS_RING_PANEL,
  HUD_LABEL_CLASS,
  INFO_ACTION_BOX,
  INFO_BODY,
  INFO_CHIPS,
  INFO_COVER,
  INFO_FOOTER,
  INFO_HAIRLINE,
  INFO_HEADER,
  INFO_LINK_BOX,
  INFO_SHELL,
  INFO_TITLE_BOX,
  INFO_TITLE_BOX_SOLO,
  TEXT_LINK,
} from "./tokens";
import { isPremiereNext, nextAiring } from "@/lib/anime/airing";
import {
  NO_SYNOPSIS,
  allGenres,
  cardStatusParts,
  coverTint,
  episodesFact,
  footerLinks,
  formatSource,
  numberingNote,
  premiereParts,
  scorePill,
  studioFact,
  type ExternalLink,
} from "@/lib/anime/cardLabels";
import { sanitizeDescription } from "@/lib/anime/sanitize";
import { displayTitle, type AnimeMedia } from "@/lib/anime/types";
import { seasonLabel } from "@/lib/landing";

/** The owner's MAL / AniList / Crunchyroll glyphs (masks in the "Classic anime card" CSS). */
const GLYPH: Record<ExternalLink["site"], string> = {
  MyAnimeList: "site-glyph-mal",
  AniList: "site-glyph-anilist",
  Crunchyroll: "site-glyph-crunchyroll",
};
/** Spoken names; a text glyph's letters ("MAL", "AL") come first (label-in-name). */
const LINK_NAME: Record<ExternalLink["site"], string> = {
  MyAnimeList: "MAL, MyAnimeList",
  AniList: "AL, AniList",
  Crunchyroll: "Crunchyroll",
};
const DT = "font-mono text-[10px] font-semibold uppercase leading-3 tracking-[0.14em] text-[#95ccff]/75";
const DD = "mt-px text-[13px] leading-4";
/** Readout rows after the first get a dashed rule (the dl is a 2-column grid, so no divide-y). */
const ROW = "col-span-2 py-1";
const RULE = "border-t border-dashed border-[#95ccff]/15";

/**
 * The classic card: the owner's original layout (title and genres; the cover
 * with its countdown band and score beside the facts and the synopsis; the
 * add button and site links), in the Tempest theme. A gel surface warmed by
 * the cover's color, the Magic Sense HUD (violet for a premiere, amber in the
 * last hour, emerald while airing), a Great Sage readout, a synopsis well
 * that scrolls on hover with a mouse, and a perched slime on shows on your
 * list that gulps when you add one. Fields AniList doesn't have are left out.
 *
 * The title is a button whose ::after covers the card (one tab stop), so a
 * tap anywhere but the footer opens the details sheet. With a mouse, the
 * synopsis sits above it and scrolls instead. Switch back to the poster card
 * with ANIME_CARD_LAYOUT (components/theme/cardLayout.ts). Wrap it in an <li>.
 */
function AnimeInfoCard({
  media,
  Action,
  continuing = false,
  onOpenDetails,
  coverSizes,
  eager = false,
  priority = false,
  headingLevel = 3,
}: AnimeGridCardProps) {
  const titleId = useId();
  const buttonId = useId();
  const title = displayTitle(media);
  const next = nextAiring(media);
  const premiere = isPremiereNext(media);
  const color = media.coverImage?.color ?? null;
  const covers = [media.coverImage?.medium, media.coverImage?.large, media.coverImage?.extraLarge];
  const from = continuing && !premiere ? seasonLabel(media.season, media.seasonYear ?? media.startDate?.year) : null;
  const genres = allGenres(media);
  const studio = studioFact(media);
  const prem = premiereParts(media);
  const source = formatSource(media.source);
  const eps = episodesFact(media);
  const note = numberingNote(media);
  const pill = scorePill(media);
  const synopsis = sanitizeDescription(media.description);
  const Heading = headingLevel === 2 ? "h2" : headingLevel === 4 ? "h4" : "h3";
  // The HUD already says PREMIERE for an EP 1; the badge marks a premiere numbered on (EP 13).
  const badge = premiere ? (next?.episode !== 1 ? "premiere" : null) : continuing ? "continuing" : null;
  const firstRule = (shown: boolean) => (shown ? RULE : "");

  return (
    <article
      aria-labelledby={titleId}
      style={coverTint(color) as CSSProperties}
      // No unnamed `group` here (ListToggle's in-list button uses group-hover) and
      // no bg-*: .gel-card owns `background`.
      className={`gel-card ${INFO_SHELL} text-white`}
    >
      <header className={INFO_HEADER}>
        <Heading
          id={titleId}
          className={`${genres.length ? INFO_TITLE_BOX : INFO_TITLE_BOX_SOLO} text-[15px] font-bold leading-5`}
        >
          {onOpenDetails ? (
            <>
              <button
                id={buttonId}
                type="button"
                aria-haspopup="dialog"
                data-card-title=""
                // On the button: its ::after covers the card, so the full title shows wherever you hover.
                title={title}
                onClick={() => onOpenDetails(media, { continuing, triggerId: buttonId })}
                // ::after = the card-wide tap target (z-1, under the footer and, with a mouse, the
                // synopsis); ::before = the keyboard ring, drawn above both and never hit.
                className="js-only block w-full rounded-sm text-[#95ccff] transition-colors hover:text-white focus-visible:outline-none after:absolute after:inset-0 after:z-[1] after:rounded-2xl after:content-[''] focus-visible:before:pointer-events-none focus-visible:before:absolute focus-visible:before:inset-0 focus-visible:before:z-20 focus-visible:before:rounded-2xl focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-[#95ccff] focus-visible:before:content-['']"
              >
                {/* The clamp sits on the span: -webkit-box on a <button> is unreliable. */}
                <span className="line-clamp-2">{title}</span>
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
            <span className="line-clamp-2 text-[#95ccff]" title={title}>
              {title}
            </span>
          )}
        </Heading>
        {genres.length > 0 && (
          <p className={INFO_CHIPS}>
            <span className="sr-only">Genres: </span>
            {genres.map((genre, index) => (
              <span
                key={genre}
                className="rounded-full bg-[#95ccff]/[.07] px-2 text-[11px] leading-5 text-[#c9d6e6] ring-1 ring-inset ring-[#95ccff]/15"
              >
                {index > 0 && <span className="sr-only">, </span>}
                {genre}
              </span>
            ))}
          </p>
        )}
      </header>
      <div
        aria-hidden="true"
        className={`${INFO_HAIRLINE} bg-gradient-to-r from-transparent via-[#95ccff]/35 to-transparent`}
      />

      <div className={INFO_BODY}>
        <div className={`gel-cover ${INFO_COVER}`} style={color ? { backgroundColor: color } : undefined}>
          {covers.some(Boolean) ? (
            <AniListCover
              urls={covers}
              sizes={coverSizes}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Slime size={40} animated={false} className="absolute inset-0 m-auto" />
          )}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#050915]/70 to-transparent"
          />
          <p
            data-tone={premiere ? "premiere" : undefined}
            className="gel-hud absolute inset-x-0 top-0 flex h-[34px] flex-col items-center justify-center px-1.5 text-center text-white"
          >
            {next ? (
              <CountdownText airingAt={next.airingAt} episode={next.episode} mode="hud" />
            ) : (
              <StatusHud media={media} />
            )}
          </p>
          {badge && (
            <span
              className={`absolute right-1.5 top-10 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4 tracking-wide text-white shadow-[0_2px_8px_rgba(0,0,0,.45)] ${
                badge === "premiere" ? "bg-violet-600/90" : "bg-blue-600/90"
              }`}
            >
              {badge === "premiere" ? "Premiere" : "Continuing"}
              {from && <span className="sr-only"> from {from}</span>}
            </span>
          )}
          {pill && (
            // One line; narrower only when the perched slime takes the corner (.gel-pill in globals.css).
            <p className="gel-pill absolute bottom-2 left-2 inline-flex h-6 max-w-[calc(100%-1rem)] items-center gap-1 whitespace-nowrap rounded-full bg-[#050915]/75 px-2 text-[11px] font-semibold text-white ring-1 ring-inset ring-[#95ccff]/20">
              {pill.score && (
                <>
                  <StarIcon className="h-3 w-3 shrink-0 text-[#95ccff]" />
                  <span className="sr-only">AniList score </span>
                  <span className="shrink-0 tabular-nums">{pill.score}</span>
                </>
              )}
              {pill.score && pill.format && (
                <>
                  <span aria-hidden="true" className="text-[rgb(164,164,164)]">
                    ·
                  </span>
                  <span className="sr-only">, </span>
                </>
              )}
              {pill.format && (
                <span className={`min-w-0 truncate ${pill.score ? "font-medium text-[rgb(200,206,218)]" : ""}`}>
                  {pill.format}
                </span>
              )}
            </p>
          )}
          {/* Decor: a slime perched on shows on your list (the button says "On my list"). */}
          <span aria-hidden="true" className="gel-perch" />
        </div>

        <div className="gel-readout flex min-w-0 flex-1 flex-col">
          {(studio || prem || source || eps) && (
            <dl className="grid shrink-0 grid-cols-2 gap-x-2 px-2.5">
              {studio && (
                <div className={ROW}>
                  <dt className={DT}>{studio.term}</dt>
                  <dd className={`${DD} line-clamp-2 break-words font-semibold text-[#cfe8ff]`}>{studio.value}</dd>
                </div>
              )}
              {prem && (
                <div className={`${ROW} ${firstRule(!!studio)}`}>
                  <dt className={DT}>Premiere</dt>
                  <dd className={`${DD} text-[rgb(200,206,218)]`}>
                    <span className="whitespace-nowrap">{prem.date}</span>
                    {prem.time && (
                      <>
                        , <span className="whitespace-nowrap">{prem.time}</span>
                      </>
                    )}
                  </dd>
                </div>
              )}
              {source && (
                <div className={`min-w-0 py-1 ${eps ? "" : "col-span-2"} ${firstRule(!!(studio || prem))}`}>
                  <dt className={DT}>Source</dt>
                  <dd className={`${DD} line-clamp-2 break-words hyphens-auto text-[rgb(200,206,218)]`}>{source}</dd>
                </div>
              )}
              {eps && (
                <div className={`min-w-0 py-1 ${source ? "" : "col-span-2"} ${firstRule(!!(studio || prem))}`}>
                  <dt className={DT}>{eps.term}</dt>
                  <dd className={`${DD} line-clamp-2 break-words tabular-nums text-[rgb(200,206,218)]`}>{eps.value}</dd>
                </div>
              )}
            </dl>
          )}
          {note && <p className="shrink-0 px-2.5 pb-1.5 font-mono text-[10px] leading-3 text-[#95ccff]/75">{note}</p>}
          {synopsis ? (
            <div
              // Never a tab stop (Chrome makes hover-scrollable boxes focusable): keyboards read it in the sheet.
              tabIndex={-1}
              className="gel-well min-h-0 flex-1 px-2.5 py-2 text-xs leading-[18px] text-[rgb(200,206,218)] [overflow-wrap:anywhere] focus:outline-none"
              dangerouslySetInnerHTML={{ __html: synopsis }}
            />
          ) : (
            <div tabIndex={-1} className="gel-well min-h-0 flex-1 px-2.5 py-2 text-xs leading-[18px] focus:outline-none">
              <p className="text-[rgb(164,164,164)]">
                <SageTag kind="Report" />
                {NO_SYNOPSIS}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* The whole row sits above the title's tap target: taps between the controls never open the sheet. */}
      <div className={`relative z-10 ${INFO_FOOTER} shadow-[inset_0_1px_0_rgba(149,204,255,.12)]`}>
        <div className={INFO_ACTION_BOX}>
          <Action media={media} />
        </div>
        <ul className="ml-auto flex shrink-0 items-center gap-0.5">
          {footerLinks(media).map((link) => (
            <li key={link.site}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.site}
                className={`inline-flex ${INFO_LINK_BOX} items-center justify-center rounded-full text-[#cfe8ff] transition-colors hover:bg-[#95ccff]/10 hover:text-white ${FOCUS_RING_PANEL}`}
              >
                <span aria-hidden="true" className={`site-glyph ${GLYPH[link.site]}`} />
                <span className="sr-only">{`${LINK_NAME[link.site]}: ${title} (opens in a new tab)`}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** No episode scheduled: the release status as kind / detail ("FINISHED" / "28 eps"). */
function StatusHud({ media }: { media: AnimeMedia }) {
  const { kind, detail } = cardStatusParts(media);
  return (
    <>
      <span className={HUD_LABEL_CLASS}>{kind}</span>
      {detail && (
        <span className="mt-0.5 max-w-full truncate text-xs font-medium leading-4 text-[rgb(200,206,218)]">
          <span className="sr-only">: </span>
          {detail}
        </span>
      )}
    </>
  );
}

export default memo(AnimeInfoCard);
