"use client";
import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { scheduleSwrKey } from "@/components/utils/useMyList";
import Grid from "@/components/common/Grid";
import AnimeInfoGrid from "@/components/animev3/AnimeInfoGrid";
import { useNow } from "@/components/utils/useNow";
import type { Weekday } from "@/lib/anime/airing";
import type { ListEntry } from "@/lib/anime/types";
import { myListPath, searchPath } from "@/lib/routes";
import NotAiringList from "./NotAiringList";
import { DAY_LABELS, SCHEDULE_DAYS, buildSchedule, weekdayAt } from "./schedule";

type DayFilter = "all" | Weekday;

interface AiringScheduleProps {
  userId: string;
  initialEntries: ListEntry[];
  isOwner: boolean;
  ownerName: string;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(18,18,18)]";

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

/** Today's weekday in Pacific Time; null until hydrated so server and client HTML match. */
function useToday(): Weekday | null {
  const now = useNow();
  return now === null ? null : weekdayAt(now);
}

const showCount = (count: number) => `${count} ${count === 1 ? "show" : "shows"}`;

export default function AiringSchedule({
  userId,
  initialEntries,
  isOwner,
  ownerName,
}: AiringScheduleProps) {
  // useMyList() revalidates this key after add/remove.
  const { data, error } = useSWR(scheduleSwrKey(userId), () => fetchListEntries(userId), {
    fallbackData: initialEntries,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });
  const entries = data ?? initialEntries;
  const schedule = useMemo(() => buildSchedule(entries), [entries]);
  const [filter, setFilter] = useState<DayFilter>("all");

  const listName = isOwner ? "your list" : `${ownerName}'s list`;
  const visibleDays =
    filter === "all" ? SCHEDULE_DAYS.filter((day) => schedule.days[day].length > 0) : [filter];

  let body: ReactNode;
  if (entries.length === 0 && isOwner) {
    body = (
      <EmptyState title="Your list is empty">
        Add a few shows and their next episodes will line up here, day by day, with live
        countdowns.
      </EmptyState>
    );
  } else if (entries.length === 0) {
    body = (
      <EmptyState title={`${ownerName} hasn't added any anime yet`}>
        Check out what&apos;s airing this season instead.
      </EmptyState>
    );
  } else if (schedule.airingCount === 0) {
    body = (
      <EmptyState title={`Nothing on ${listName} is airing right now`}>
        {schedule.notAiring.length > 0 && "Finished and upcoming shows are listed below. "}
        Looking for something new to watch?
      </EmptyState>
    );
  } else {
    body = (
      <>
        <DayFilterBar
          filter={filter}
          onChange={setFilter}
          counts={schedule.days}
          total={schedule.airingCount}
        />
        {visibleDays.map((day) => (
          <DaySection key={day} day={day} entries={schedule.days[day]} listName={listName} />
        ))}
      </>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 text-white">
      <header className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-semibold sm:text-3xl">
            {`${ownerName}'s airing schedule`}
          </h1>
          <p className="mt-1 text-sm text-[rgb(164,164,164)]">
            <span className="text-[#95ccff]">{showCount(schedule.airingCount)} with an upcoming episode</span>
            {" · "}Times in Pacific Time
          </p>
          <div role="status" aria-live="polite">
            {error && (
              <p className="mt-2 rounded-md border border-yellow-700/60 bg-yellow-900/20 px-3 py-2 text-sm text-yellow-200">
                Couldn&apos;t refresh the schedule. Showing the last version that loaded; it will
                retry automatically.
              </p>
            )}
          </div>
        </div>
        {isOwner && (
          <Link
            href={myListPath(userId)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1 self-start rounded-md border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] px-3 py-2 text-sm text-[#95ccff] hover:border-blue-500 hover:text-white md:min-h-0 md:self-auto ${FOCUS_RING}`}
          >
            View full list
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </header>

      {body}

      {schedule.notAiring.length > 0 && (
        <details className="group rounded-lg border border-[rgb(53,53,53)] bg-[rgb(38,38,38)]">
          <summary
            className={`flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-4 py-3 font-semibold hover:text-[#95ccff] [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
          >
            <span className="min-w-0">
              Not airing right now{" "}
              <span className="font-normal text-[rgb(164,164,164)]">
                ({schedule.notAiring.length})
              </span>
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <div className="px-2 pb-2 sm:px-4 sm:pb-4">
            <p className="px-1 pb-2 text-sm text-[rgb(164,164,164)]">
              Finished, between seasons, not premiered yet, or marked completed.
            </p>
            <NotAiringList entries={schedule.notAiring} />
          </div>
        </details>
      )}
    </div>
  );
}

function DayFilterBar({
  filter,
  onChange,
  counts,
  total,
}: {
  filter: DayFilter;
  onChange: (filter: DayFilter) => void;
  counts: Record<Weekday, ListEntry[]>;
  total: number;
}) {
  const today = useToday();
  return (
    <div
      role="group"
      aria-label="Filter by day"
      className="-mx-3 flex min-w-0 max-w-[calc(100%+1.5rem)] gap-2 overflow-x-auto overscroll-x-contain px-3 py-1 md:mx-0 md:max-w-none md:flex-wrap md:px-0"
    >
      <DayButton pressed={filter === "all"} onClick={() => onChange("all")} count={total}>
        All
      </DayButton>
      {SCHEDULE_DAYS.map((day) => (
        <DayButton
          key={day}
          pressed={filter === day}
          onClick={() => onChange(day)}
          count={counts[day].length}
          isToday={day === today}
        >
          <span aria-hidden="true">{DAY_LABELS[day].short}</span>
          <span className="sr-only">{DAY_LABELS[day].long}</span>
        </DayButton>
      ))}
    </div>
  );
}

function DayButton({
  pressed,
  onClick,
  count,
  isToday = false,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  count: number;
  isToday?: boolean;
  children: ReactNode;
}) {
  const tone = pressed
    ? "border-blue-500 bg-blue-600 text-white"
    : isToday
      ? "border-[#95ccff]/70 bg-[rgb(38,38,38)] text-[#95ccff] hover:border-blue-500"
      : "border-[rgb(53,53,53)] bg-[rgb(38,38,38)] text-[rgb(164,164,164)] hover:border-blue-500 hover:text-white";
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors md:min-h-0 ${tone} ${
        count === 0 && !pressed ? "opacity-60" : ""
      } ${FOCUS_RING}`}
    >
      {isToday && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
      {isToday && <span className="sr-only">, today</span>}
      <span className="rounded-full bg-black/30 px-1.5 text-xs tabular-nums">
        {count}
        <span className="sr-only"> {count === 1 ? "show" : "shows"}</span>
      </span>
    </button>
  );
}

function DaySection({
  day,
  entries,
  listName,
}: {
  day: Weekday;
  entries: ListEntry[];
  listName: string;
}) {
  const headingId = `schedule-${day}`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <h2 id={headingId} className="flex flex-wrap items-baseline gap-x-2 text-xl font-semibold">
        {DAY_LABELS[day].long}
        <TodayBadge day={day} />
        <span className="text-sm font-normal text-[rgb(164,164,164)]">
          {showCount(entries.length)}
        </span>
      </h2>
      {entries.length > 0 ? (
        <Grid columnsClassName="grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {entries.map((entry) => (
            <AnimeInfoGrid key={entry.id} info={entry} />
          ))}
        </Grid>
      ) : (
        <p className="rounded-lg border border-dashed border-[rgb(53,53,53)] px-4 py-6 text-center text-sm text-[rgb(164,164,164)]">
          Nothing on {listName} airs on {DAY_LABELS[day].long}s.
        </p>
      )}
    </section>
  );
}

/** Its own component so only the badge re-renders with the 1s clock. */
function TodayBadge({ day }: { day: Weekday }) {
  const today = useToday();
  if (day !== today) return null;
  return (
    <span className="self-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
      Today
    </span>
  );
}

function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-4 py-10 text-center">
      <Image src="/rimuru.png" alt="" width={100} height={70} className="opacity-90" />
      <p className="max-w-full break-words text-lg font-semibold">{title}</p>
      <p className="max-w-md text-sm text-[rgb(164,164,164)]">{children}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-3">
        <Link
          href="/anime"
          className={`inline-flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 md:min-h-0 ${FOCUS_RING}`}
        >
          Browse this season
        </Link>
        <Link
          href={searchPath()}
          className={`inline-flex min-h-11 items-center justify-center rounded-md border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] px-4 py-2 text-sm text-white hover:border-blue-500 md:min-h-0 ${FOCUS_RING}`}
        >
          Search anime
        </Link>
      </div>
    </div>
  );
}
