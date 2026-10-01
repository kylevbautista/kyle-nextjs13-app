"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import ListToggle from "@/components/animev3/ListToggle";
import CountdownText from "@/components/home/CountdownText";
import { SageTag } from "@/components/home/SageLine";
import Slime from "@/components/home/Slime";
import { markQuest } from "@/components/home/questStore";
import { LiveTimersToggle } from "@/components/theme/LiveTimersToggle";
import PageBanner from "@/components/theme/PageBanner";
import SagePanel from "@/components/theme/SagePanel";
import ShareLink from "@/components/theme/ShareLink";
import {
  APP_CONTAINER,
  DAY_TINTS,
  FOCUS_RING_INSET,
  GHOST_BUTTON,
  PANEL,
  PRIMARY_BUTTON,
} from "@/components/theme/tokens";
import { scheduleSwrKey } from "@/components/utils/useMyList";
import { useNow } from "@/components/utils/useNow";
import { compareByNextAiring, nextAiring, type Weekday } from "@/lib/anime/airing";
import { STATUS_DOT_CLASS } from "@/lib/anime/statusBadge";
import { LIST_STATUS_LABELS, displayTitle, type ListEntry } from "@/lib/anime/types";
import { defaultScheduleDay, formatWeekdayTime, showsLabel } from "@/lib/landing";
import { myListPath, searchPath } from "@/lib/routes";
import NextEpisodes from "./NextEpisodes";
import NotAiringList from "./NotAiringList";
import { DAY_LABELS, SCHEDULE_DAYS, buildSchedule, weekdayAt } from "./schedule";

type DayTab = "all" | Weekday;
const TABS: readonly DayTab[] = ["all", ...SCHEDULE_DAYS];

interface AiringScheduleProps {
  userId: string;
  initialEntries: ListEntry[];
  isOwner: boolean;
  ownerName: string;
  /** Server render time: "today" for SSR and hydration (the live clock after). */
  renderedAt: number;
}

/** Throws on any non-OK response so SWR keeps showing the last good list. */
async function fetchListEntries(userId: string): Promise<ListEntry[]> {
  const res = await fetch(`/api/anime-list/user/${encodeURIComponent(userId)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Could not refresh the schedule (${res.status})`);
  const body = await res.json();
  if (!Array.isArray(body?.list)) throw new Error("Could not refresh the schedule");
  return body.list;
}

/**
 * The Airing Schedule, in the landing's Tempest theme (skill 03 · Thought
 * Acceleration). It is the landing's schedule demo (components/home/
 * ScheduleDemo.tsx) made real: the same weekday panel and countdown rows,
 * built from the list, plus a whole-week tab, the hero's Next-episodes card,
 * the share strip and the shows that aren't airing.
 */
export default function AiringSchedule({
  userId,
  initialEntries,
  isOwner,
  ownerName,
  renderedAt,
}: AiringScheduleProps) {
  // useMyList() revalidates this key after add/remove.
  const { data, error } = useSWR(scheduleSwrKey(userId), () => fetchListEntries(userId), {
    fallbackData: initialEntries,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });
  const entries = data ?? initialEntries;
  const schedule = useMemo(() => buildSchedule(entries), [entries]);
  const upcoming = useMemo(
    () => SCHEDULE_DAYS.flatMap((day) => schedule.days[day]).sort(compareByNextAiring),
    [schedule]
  );

  // The landing's Quest 2 is "Open your Airing Schedule": opening it counts.
  useEffect(() => {
    if (isOwner) markQuest(userId, "schedule");
  }, [isOwner, userId]);

  const listName = isOwner ? "your list" : `${ownerName}'s list`;
  const hasEntries = entries.length > 0;
  const airing = schedule.airingCount > 0;

  return (
    <div className="flex min-w-0 flex-col text-white">
      <PageBanner
        eyebrow="Skill 03 · Thought Acceleration"
        sage={{
          kind: "Notice",
          text: `Thought Acceleration: ${isOwner ? "your" : `${ownerName}'s`} week, computed in Pacific Time.`,
        }}
        title={`${ownerName}'s airing schedule`}
        sub={
          airing
            ? `${showsLabel(schedule.airingCount)} with an upcoming episode, lined up by the day it airs. Completed and dropped shows stay out of the way.`
            : "Every show on the list with an upcoming episode, lined up by the day it airs."
        }
        aside={airing ? <NextEpisodes entries={upcoming} /> : undefined}
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={myListPath(userId)} prefetch={false} className={GHOST_BUTTON}>
            {isOwner ? "Open My List" : `${ownerName}'s list`}
            <span aria-hidden="true">→</span>
          </Link>
          {airing && <LiveTimersToggle />}
        </div>
        <div role="status" aria-live="polite">
          {error && (
            <p className="mt-4 max-w-2xl rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              <SageTag kind="Warning" />
              Couldn&apos;t refresh the schedule. Showing the last version that loaded; it will retry
              automatically.
            </p>
          )}
        </div>
      </PageBanner>

      <div
        className={`${APP_CONTAINER} grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start`}
      >
        <div className="min-w-0">
          {airing ? (
            <WeekPanel
              days={schedule.days}
              total={schedule.airingCount}
              listName={listName}
              isOwner={isOwner}
              renderedAt={renderedAt}
            />
          ) : (
            <EmptySchedule isOwner={isOwner} hasEntries={hasEntries} ownerName={ownerName} listName={listName} />
          )}
        </div>

        {(isOwner || schedule.notAiring.length > 0) && (
          <div className="flex min-w-0 flex-col gap-6">
            {isOwner && <ShareLink userId={userId} />}
            {schedule.notAiring.length > 0 && <NotAiringPanel entries={schedule.notAiring} />}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptySchedule({
  isOwner,
  hasEntries,
  ownerName,
  listName,
}: {
  isOwner: boolean;
  hasEntries: boolean;
  ownerName: string;
  listName: string;
}) {
  const actions = (
    <>
      <Link href="/anime" className={PRIMARY_BUTTON}>
        Browse this season
      </Link>
      <Link href={searchPath()} prefetch={false} className={GHOST_BUTTON}>
        Search anime
      </Link>
    </>
  );
  if (!hasEntries && isOwner) {
    return (
      <SagePanel kind="Notice" title="Your list is empty" actions={actions}>
        Recommend: predation. Add a few shows and their next episodes will line up here, day by
        day, with live countdowns.
      </SagePanel>
    );
  }
  if (!hasEntries) {
    return (
      <SagePanel kind="Report" mood="worried" title={`${ownerName} hasn't added any anime yet`} actions={actions}>
        Check out what&apos;s airing this season instead.
      </SagePanel>
    );
  }
  return (
    <SagePanel kind="Report" mood="sage" title={`Nothing on ${listName} is airing right now`} actions={actions}>
      Finished and upcoming shows are listed under &ldquo;Not airing right now&rdquo;. Looking for
      something new to watch?
    </SagePanel>
  );
}

/**
 * The landing demo's weekday panel: tint dots, a tab per day (dots = shows,
 * ringed = today) plus "All", and countdown rows. Opens on today, or the next
 * day with shows (the demo's rule).
 */
function WeekPanel({
  days,
  total,
  listName,
  isOwner,
  renderedAt,
}: {
  days: Record<Weekday, ListEntry[]>;
  total: number;
  listName: string;
  isOwner: boolean;
  renderedAt: number;
}) {
  const now = useNow();
  const [choice, setChoice] = useState<DayTab | null>(null);
  const tabRefs = useRef<Partial<Record<DayTab, HTMLButtonElement | null>>>({});
  const baseId = useId();

  // SSR and hydration use the server's render time; the live clock after.
  const today = weekdayAt(now ?? renderedAt);
  const selected = choice ?? defaultScheduleDay(days, today);
  const tabId = (tab: DayTab) => `${baseId}-tab-${tab}`;
  const panelId = `${baseId}-panel`;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const target =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    const tab = TABS[target];
    setChoice(tab);
    tabRefs.current[tab]?.focus();
  };

  const visibleDays = selected === "all" ? SCHEDULE_DAYS.filter((day) => days[day].length > 0) : [];

  return (
    <section
      id="schedule-panel"
      aria-labelledby="schedule-panel-title"
      className={`relative scroll-mt-20 overflow-hidden ${PANEL}`}
    >
      <h2 id="schedule-panel-title" className="sr-only">
        This week
      </h2>
      <div aria-hidden="true" className="absolute inset-x-0 top-1.5 flex justify-center gap-3">
        {DAY_TINTS.map((color) => (
          <span key={color} className="h-1 w-1 rounded-full opacity-60" style={{ backgroundColor: color }} />
        ))}
      </div>

      <div
        role="tablist"
        aria-label="Days of the week"
        className="grid grid-cols-8 gap-px border-b border-[rgb(53,53,53)] px-0 pb-2 pt-4 sm:gap-1 sm:px-2"
      >
        {TABS.map((tab, index) => {
          const count = tab === "all" ? total : days[tab].length;
          const isSelected = tab === selected;
          const isToday = tab === today;
          const label =
            tab === "all"
              ? `Whole week, ${showsLabel(count)}`
              : `${DAY_LABELS[tab].long}, ${showsLabel(count)}${isToday ? ", today" : ""}`;
          return (
            <button
              key={tab}
              ref={(node) => {
                tabRefs.current[tab] = node;
              }}
              id={tabId(tab)}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              aria-label={label}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setChoice(tab)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`relative flex h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${FOCUS_RING_INSET} ${
                isSelected ? "bg-blue-600 text-white" : "text-[rgb(200,206,218)] hover:bg-white/5"
              } ${isToday ? "ring-1 ring-inset ring-[#95ccff]" : ""}`}
            >
              {isToday && (
                <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-[#95ccff]" />
              )}
              <span aria-hidden="true">{tab === "all" ? "All" : DAY_LABELS[tab].short}</span>
              <span aria-hidden="true" className="flex h-1.5 gap-0.5">
                {Array.from({ length: Math.min(count, 3) }, (_, dot) => (
                  <span
                    key={dot}
                    className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#95ccff]"}`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(selected)}
        tabIndex={0}
        className={`min-h-[296px] px-3 py-3 sm:px-4 ${FOCUS_RING_INSET}`}
      >
        <div key={selected} className="animate-[fade-in_150ms_ease-out]">
          {selected === "all" ? (
            visibleDays.map((day) => (
              <section key={day} aria-labelledby={`${baseId}-${day}`} className="pb-2">
                <h3
                  id={`${baseId}-${day}`}
                  className="flex items-center gap-2 px-1 pb-1 pt-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#95ccff]"
                >
                  {DAY_LABELS[day].long}
                  {day === today && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 font-sans text-[10px] normal-case tracking-normal text-white">
                      Today
                    </span>
                  )}
                  <span className="font-normal normal-case tracking-normal text-[rgb(164,164,164)]">
                    · {showsLabel(days[day].length)}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-[#95ccff]/25 to-transparent" />
                </h3>
                <ScheduleRows entries={days[day]} isOwner={isOwner} />
              </section>
            ))
          ) : days[selected].length ? (
            <ScheduleRows entries={days[selected]} isOwner={isOwner} />
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
              <Slime size={44} mood="sage" />
              <p className="text-sm text-[rgb(164,164,164)]">
                Nothing on {listName} airs on {DAY_LABELS[selected].long}s.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ScheduleRows({ entries, isOwner }: { entries: ListEntry[]; isOwner: boolean }) {
  return (
    <ol className="flex flex-col divide-y divide-[rgb(53,53,53)]">
      {entries.map((entry) => (
        <ScheduleRow key={entry.id} entry={entry} isOwner={isOwner} />
      ))}
    </ol>
  );
}

/** The demo's row, plus where the list stands on the show (and an add button for visitors). */
function ScheduleRow({ entry, isOwner }: { entry: ListEntry; isOwner: boolean }) {
  const next = nextAiring(entry);
  const title = displayTitle(entry);
  const cover = entry.coverImage?.medium ?? entry.coverImage?.large;
  const { listType, episodeProgressNumber } = entry.userData;
  if (!next) return null;
  return (
    <li className="flex min-h-16 items-center gap-3 px-1 py-2">
      <div
        className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[rgb(53,53,53)]"
        style={entry.coverImage?.color ? { backgroundColor: entry.coverImage.color } : undefined}
      >
        {cover && (
          <Image src={cover} alt="" width={40} height={56} loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex w-0 min-w-0 flex-1 flex-col gap-0.5">
        <a
          href={`https://anilist.co/anime/${entry.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title={title}
          className="truncate rounded-sm text-sm font-semibold text-white hover:text-[#95ccff] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
        >
          {title}
          <span className="sr-only"> (AniList, opens in a new tab)</span>
        </a>
        <p className="truncate text-xs text-[rgb(164,164,164)]">
          {next.episode === 1 ? "Premiere" : next.episode ? `EP ${next.episode}` : "Next EP"} ·{" "}
          {formatWeekdayTime(next.airingAt)} PT
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-[rgb(164,164,164)]">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT_CLASS[listType]}`} />
          <span className="truncate">
            {LIST_STATUS_LABELS[listType]} · seen {episodeProgressNumber} / {entry.episodes ?? "?"}
          </span>
        </p>
        {!isOwner && (
          <div className="pt-1.5">
            <ListToggle info={entry} />
          </div>
        )}
      </div>
      <span className="min-w-[5.5rem] shrink-0 self-center text-right text-sm font-semibold text-[#95ccff]">
        <CountdownText airingAt={next.airingAt} episode={next.episode} mode="compact" className="justify-end" />
      </span>
    </li>
  );
}

function NotAiringPanel({ entries }: { entries: ListEntry[] }) {
  return (
    <details className={`group ${PANEL}`}>
      <summary
        className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 [&::-webkit-details-marker]:hidden ${FOCUS_RING_INSET}`}
      >
        <span className="min-w-0">
          <span aria-hidden="true" className="block font-mono text-xs text-[#95ccff] group-open:[text-shadow:0_0_12px_rgba(149,204,255,.8)]">
            《Report》
          </span>
          <span className="font-semibold text-white">Not airing right now</span>{" "}
          <span className="font-mono text-sm text-[rgb(164,164,164)]">({entries.length})</span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-4 w-4 shrink-0 text-[rgb(164,164,164)] transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>
      <div className="border-t border-[rgb(53,53,53)] px-3 pb-3 pt-2 animate-[fade-in_150ms_ease-out]">
        <p className="px-1 pb-1 text-sm text-[rgb(164,164,164)]">
          Finished, between seasons, not premiered yet, or marked completed.
        </p>
        <NotAiringList entries={entries} />
      </div>
    </details>
  );
}
