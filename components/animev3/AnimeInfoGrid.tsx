"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Luffy from "@/public/assets/Monkey_D_Luffy.png";
import { useMyList } from "@/components/utils/useMyList";
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
import { signInPath } from "@/lib/routes";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]";

const PILL = `inline-flex h-[24px] min-w-[108px] shrink-0 items-center justify-center rounded-full px-3 text-xs font-bold ${FOCUS_RING}`;

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

function ListToggle({ info }: { info: AnimeMedia }) {
  const { sessionStatus, signedIn, loaded, isInList, add, remove } = useMyList();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // Removing deletes the show's progress, score and dates, so it takes a second
  // tap (touch screens never see the hover "✕ Remove" hint).
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const title = displayTitle(info);

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
    return <span aria-hidden="true" className={`${PILL} animate-pulse bg-[rgb(53,53,53)]`} />;
  }

  if (!signedIn) {
    return (
      <Link
        href={signInPath(pathname ?? undefined)}
        prefetch={false}
        onClick={(event) => {
          // Include the query string (e.g. /search?q=…), which usePathname() omits.
          if (event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          router.push(signInPath(window.location.pathname + window.location.search));
        }}
        className={`${PILL} border border-[rgb(53,53,53)] text-[#95ccff] hover:border-[#95ccff]`}
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
        className={`${PILL} bg-[rgb(53,53,53)] text-[rgb(164,164,164)]`}
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
      await (inList ? remove(info) : add(info));
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
          className={`${PILL} border border-red-400 bg-red-500/15 text-red-300 aria-disabled:cursor-wait aria-disabled:opacity-60`}
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
        className={`group ${PILL} border border-[#95ccff] text-[#95ccff] hover:border-red-400 hover:text-red-300 focus-visible:border-red-400 focus-visible:text-red-300 aria-disabled:cursor-wait aria-disabled:opacity-60`}
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
      aria-label={`Add to list: ${title}`}
      className={`${PILL} bg-blue-600 text-white hover:bg-blue-500 aria-disabled:cursor-wait aria-disabled:opacity-60`}
    >
      + Add to list
    </button>
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

export default function AnimeInfoGrid({ info }: { info: AnimeMedia }) {
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
