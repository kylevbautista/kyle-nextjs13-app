"use client";
import Image from "next/image";
import Luffy from "@/public/assets/Monkey_D_Luffy.png";
import { useNow } from "@/components/utils/useNow";
import {
  DISPLAY_TIME_ZONE,
  airingStatusLabel,
  formatAirDate,
  formatCountdown,
  nextAiring,
  premiereLabel,
  secondsUntil,
} from "@/lib/anime/airing";
import { sanitizeDescription } from "@/lib/anime/sanitize";
import { AnimeMedia, displayTitle } from "@/lib/anime/types";
import ListToggle from "./ListToggle";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]";

/**
 * Some ICU versions put U+202F / U+00A0 before "AM"/"PM" and others a plain
 * space; normalizing keeps server and browser text identical.
 */
const plainSpaces = (text: string) => text.replace(/[  ]/g, " ");

const weekdayTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "LIGHT_NOVEL" → "Light Novel" */
const formatSource = (source: string) =>
  source
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const isHttpUrl = (url: string | null | undefined): url is string =>
  !!url && /^https?:\/\//i.test(url);

function AiringStatus({ info }: { info: AnimeMedia }) {
  const next = nextAiring(info);
  if (next) return <Countdown airingAt={next.airingAt} episodeNumber={next.episode} />;

  const label = airingStatusLabel(info);
  return (
    <p className="truncate px-1" title={label}>
      {label}
    </p>
  );
}

/** Only cards with an upcoming episode subscribe to the shared clock. */
function Countdown({ airingAt, episodeNumber }: { airingAt: number; episodeNumber: number | null }) {
  const now = useNow();
  const episode = episodeNumber ? `EP${episodeNumber}` : "Next EP";
  const exactTime = plainSpaces(formatAirDate(airingAt));
  let text: string;
  if (now === null) {
    // Server render / hydration: a stable label instead of a ticking value.
    text = `${episode} · ${plainSpaces(weekdayTimeFormat.format(airingAt * 1000))}`;
  } else {
    const seconds = secondsUntil(airingAt, now);
    text = seconds > 0 ? `${episode}: ${formatCountdown(seconds)}` : `${episode}: Airing now`;
  }

  return (
    <p className="truncate px-1" title={`${episode} airs ${exactTime}`}>
      <time dateTime={new Date(airingAt * 1000).toISOString()}>{text}</time>
    </p>
  );
}

function ExternalIcon({
  href,
  site,
  sprite,
  title,
}: {
  href: string;
  site: string;
  sprite: "mal" | "anilist" | "crunchyroll";
  title: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${title} on ${site} (opens in a new tab)`}
      title={site}
      className={`${sprite} shrink-0 rounded-full hover:bg-blue-500 focus-visible:bg-blue-500 ${FOCUS_RING}`}
    />
  );
}

/** "Spring 2026" from AniList's season fields, else the start year. */
function premiereSeason(info: AnimeMedia) {
  const season = info.season ? info.season.charAt(0) + info.season.slice(1).toLowerCase() : null;
  const year = info.seasonYear ?? info.startDate?.year;
  return [season, year].filter(Boolean).join(" ") || null;
}

export default function AnimeInfoGrid({
  info,
  continuing = false,
}: {
  info: AnimeMedia;
  /** Started in an earlier season and still airing in the one being browsed. */
  continuing?: boolean;
}) {
  const title = displayTitle(info);
  const anilistUrl = `https://anilist.co/anime/${info.id}`;
  const malUrl = info.idMal ? `https://myanimelist.net/anime/${info.idMal}` : null;
  const crunchyroll = info.externalLinks?.find(
    (link) => link?.site === "Crunchyroll" && isHttpUrl(link.url)
  )?.url;

  const cover =
    info.coverImage?.extraLarge || info.coverImage?.large || info.coverImage?.medium || Luffy;
  const studios =
    info.studios?.nodes
      ?.map((node) => node?.name)
      .filter(Boolean)
      .join(" x ") || "Studio TBA";
  const genres = info.genres?.filter(Boolean) ?? [];
  const premiere = plainSpaces(premiereLabel(info));
  const synopsis = sanitizeDescription(info.description);

  return (
    <article
      className="
      grid
      animate-grow
      grid-rows-[60px_201px_32px]
      rounded-sm
      border-[rgb(53,53,53)]
      bg-[rgb(38,38,38)]
      shadow-md
      dark:bg-[rgb(30,30,30)]
      sm:grid-rows-[60px_250px_32px]
      "
    >
      <div className="grid h-[60px] grid-rows-[38px_22px] place-items-center border-b border-inherit text-[#95ccff]">
        <h2 className="flex h-full w-full items-center justify-center px-1 text-center">
          <a
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-sm font-bold leading-4 hover:underline ${FOCUS_RING}`}
            href={malUrl ?? anilistUrl}
          >
            <span className="line-clamp-2">{title}</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </h2>
        <p
          className="w-full px-2 text-center text-xs leading-6 text-[rgb(164,164,164)] line-clamp-1"
          title={genres.join(", ")}
        >
          {genres.length ? genres.join(" · ") : "Genres TBA"}
        </p>
      </div>

      <div className="grid grid-cols-[auto_1fr]">
        <div
          className="relative h-[201px] w-[135px] border-b border-l border-r border-[rgb(53,53,53)] bg-[rgb(53,53,53)] sm:h-[250px] sm:w-[175px]"
          style={info.coverImage?.color ? { backgroundColor: info.coverImage.color } : undefined}
        >
          <Image
            src={cover}
            fill
            sizes="(min-width: 640px) 175px, 135px"
            alt={`${title} cover`}
            className="object-cover"
          />
          <div className="absolute inset-x-0 top-0 flex h-[24px] items-center justify-center bg-[rgba(0,0,0,0.6)] text-xs">
            <AiringStatus info={info} />
          </div>
          <div className="absolute bottom-[8px] left-[8px] flex h-[25px] w-[65px] items-center justify-center rounded-[35px] bg-[rgba(0,0,0,0.6)] p-1 text-xs">
            <div className="star" aria-hidden="true"></div>
            <p>
              <span className="sr-only">AniList score </span>
              {info.averageScore ? (info.averageScore / 10).toFixed(1) : "N/A"}
            </p>
          </div>
          {continuing && (
            <p
              className="absolute right-1 top-[28px] rounded-full bg-[rgba(37,99,235,0.9)] px-2 py-0.5 text-[11px] font-bold"
              title={premiereSeason(info) ? `Continuing from ${premiereSeason(info)}` : "Continuing"}
            >
              Continuing
              {premiereSeason(info) && <span className="sr-only">{` from ${premiereSeason(info)}`}</span>}
            </p>
          )}
        </div>

        <div className="grid grid-rows-[25px_25px_25px_126px] border-[rgb(53,53,53)] sm:grid-rows-[25px_48px_48px_129px] tablet:grid-rows-[27px_27px_27px_169px]">
          <div className="flex justify-center border-b border-inherit px-1 text-[#95ccff]">
            <p className="line-clamp-1" title={studios}>
              {studios}
            </p>
          </div>
          <div className="flex items-center justify-center border-b border-inherit px-1 text-[rgb(164,164,164)]">
            <p className="text-center text-sm line-clamp-2">
              <span className="sr-only">Premiere: </span>
              {premiere}
            </p>
          </div>
          <div className="flex items-center justify-around gap-[6px] border-b border-inherit pl-1 text-sm text-[rgb(164,164,164)]">
            <p className="p-[2px] line-clamp-2">
              {info.source ? formatSource(info.source) : "Source TBA"}
            </p>
            <p className="line-clamp-2">{`${info.episodes ?? "?"} eps x ${info.duration ?? "?"}m`}</p>
          </div>
          {/* Focusable so the synopsis can be scrolled from the keyboard. */}
          <div
            tabIndex={0}
            className="scrollbar border-b border-inherit pl-1 pr-1 focus:overflow-y-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#95ccff]"
          >
            {synopsis ? (
              <p className="text-xs leading-5" dangerouslySetInnerHTML={{ __html: synopsis }}></p>
            ) : (
              <p className="text-xs leading-5 text-[rgb(164,164,164)]">No synopsis yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[32px] items-center justify-between gap-2 px-2">
        <ListToggle info={info} />
        <div className="flex items-center gap-2">
          {malUrl && <ExternalIcon href={malUrl} site="MyAnimeList" sprite="mal" title={title} />}
          <ExternalIcon href={anilistUrl} site="AniList" sprite="anilist" title={title} />
          {crunchyroll && (
            <ExternalIcon href={crunchyroll} site="Crunchyroll" sprite="crunchyroll" title={title} />
          )}
        </div>
      </div>
    </article>
  );
}
