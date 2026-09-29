"use client";
import { useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { DAY_LABELS, SCHEDULE_DAYS, weekdayAt } from "@/components/mylist/schedule";
import { nextAiring, type Weekday } from "@/lib/anime/airing";
import { displayTitle, type AnimeMedia } from "@/lib/anime/types";
import { defaultScheduleDay, formatWeekdayTime, groupByWeekday } from "@/lib/landing";
import { myListPath } from "@/lib/routes";
import { trackLanding } from "./analytics";
import CountdownText from "./CountdownText";
import { useLanding, useVisibleAiring } from "./LandingProvider";
import { markQuest } from "./questStore";
import {
  CHAPTER_CLASS,
  CHAPTER_SUB_CLASS,
  CHAPTER_TITLE_CLASS,
  EYEBROW_CLASS,
  FOCUS_RING,
  SageLine,
} from "./SageLine";
import { SessionCta } from "./SessionCta";
import { useLandingSession } from "./useLandingSession";

const ROWS = 4;
/** Faint weekday tints along the panel's top edge (static decor). */
const DAY_TINTS = ["#95ccff", "#a5b4fc", "#c4b5fd", "#f0abfc", "#fda4af", "#fcd34d", "#86efac"];

/**
 * A per-minute clock for "which day is today" (null during SSR and
 * hydration, like useNow). Only the countdown leaves tick every second, so
 * the tabs and rows don't re-render with them.
 */
let minuteNow = 0;
let minuteTimer: ReturnType<typeof setInterval> | undefined;
const minuteListeners = new Set<() => void>();
function subscribeMinute(listener: () => void) {
  minuteListeners.add(listener);
  if (!minuteTimer) {
    minuteNow = Date.now();
    minuteTimer = setInterval(() => {
      minuteNow = Date.now();
      minuteListeners.forEach((notify) => notify());
    }, 60_000);
  }
  return () => {
    minuteListeners.delete(listener);
    if (!minuteListeners.size && minuteTimer) {
      clearInterval(minuteTimer);
      minuteTimer = undefined;
    }
  };
}
const getMinute = () => minuteNow || null;
const getServerMinute = () => null;

const subscribeHost = () => () => {};
const getHost = () => window.location.host;
const getServerHost = () => "kylevb.com";

const plural = (count: number) => `${count} ${count === 1 ? "show" : "shows"}`;

/**
 * Chapter 3 · Thought Acceleration: a weekday-tab preview of the Airing
 * Schedule built from this season's soonest episodes (never the viewer's real
 * schedule: that endpoint can trigger AniList refreshes), plus the shareable
 * list link.
 */
export default function ScheduleDemo({ airingIds }: { airingIds: number[] }) {
  const { generatedAt } = useLanding();
  const session = useLandingSession();
  const now = useSyncExternalStore(subscribeMinute, getMinute, getServerMinute);
  const shows = useVisibleAiring(airingIds, airingIds.length);
  const groups = useMemo(() => groupByWeekday(shows), [shows]);
  const [choice, setChoice] = useState<Weekday | null>(null);
  const tabRefs = useRef<Partial<Record<Weekday, HTMLButtonElement | null>>>({});
  const baseId = useId();

  // SSR and hydration use the server's fetch time; the live clock after.
  const today = weekdayAt(now ?? generatedAt);
  const selected = choice ?? defaultScheduleDay(groups, today);
  const tabId = (day: Weekday) => `${baseId}-tab-${day}`;
  const panelId = `${baseId}-panel`;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = SCHEDULE_DAYS.length - 1;
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
    const day = SCHEDULE_DAYS[target];
    setChoice(day);
    tabRefs.current[day]?.focus();
  };

  const dayShows = groups[selected] ?? [];

  return (
    <section id="schedule" aria-labelledby="schedule-title" className={CHAPTER_CLASS}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-10 -z-10 h-[40rem] w-[52rem] bg-[radial-gradient(closest-side,rgba(93,174,241,.09),rgba(93,174,241,.03)_60%,transparent)]"
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-x-12 lg:gap-y-8">
        <div data-reveal="" className="lg:col-start-1 lg:row-start-1">
          <p className={EYEBROW_CLASS}>Skill 03 · Thought Acceleration</p>
          <SageLine kind="Notice" scan="reveal" className="mt-4">
            Thought Acceleration: your week, computed in Pacific Time.
          </SageLine>
          <h2 id="schedule-title" className={`mt-5 ${CHAPTER_TITLE_CLASS}`}>
            Your week, already sorted.
          </h2>
          <p className={`mt-4 ${CHAPTER_SUB_CLASS}`}>
            Your Airing Schedule lines up every show on your list by the day it airs, each with its
            own countdown. Completed and dropped shows stay out of the way.
          </p>
        </div>

        <div className="mt-10 min-w-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0">
          <div className="relative overflow-hidden rounded-2xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] shadow-[0_24px_60px_-30px_rgba(93,174,241,.35)]">
            <div aria-hidden="true" className="absolute inset-x-0 top-1.5 flex justify-center gap-3">
              {DAY_TINTS.map((color) => (
                <span key={color} className="h-1 w-1 rounded-full opacity-60" style={{ backgroundColor: color }} />
              ))}
            </div>

            {shows.length ? (
              <>
                <div
                  role="tablist"
                  aria-label="Days of the week"
                  className="grid grid-cols-7 gap-px border-b border-[rgb(53,53,53)] px-0 pb-2 pt-4 sm:gap-1 sm:px-2"
                >
                  {SCHEDULE_DAYS.map((day, index) => {
                    const count = groups[day]?.length ?? 0;
                    const isSelected = day === selected;
                    const isToday = day === today;
                    return (
                      <button
                        key={day}
                        ref={(node) => {
                          tabRefs.current[day] = node;
                        }}
                        id={tabId(day)}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        aria-controls={panelId}
                        aria-label={`${DAY_LABELS[day].long}, ${plural(count)}${isToday ? ", today" : ""}`}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => setChoice(day)}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        className={`relative flex h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-inset ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "text-[rgb(200,206,218)] hover:bg-white/5"
                        } ${isToday ? "ring-1 ring-inset ring-[#95ccff]" : ""}`}
                      >
                        {isToday && (
                          <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-[#95ccff]" />
                        )}
                        <span aria-hidden="true">{DAY_LABELS[day].short}</span>
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
                  className="min-h-[296px] px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#95ccff] sm:px-4"
                >
                  <div key={selected} className="motion-safe:animate-[fade-in_150ms_ease-out]">
                    {dayShows.length ? (
                      <>
                        <ol className="flex flex-col divide-y divide-[rgb(53,53,53)]">
                          {dayShows.slice(0, ROWS).map((media) => (
                            <ScheduleRow key={media.id} media={media} />
                          ))}
                        </ol>
                        {dayShows.length > ROWS && (
                          <p className="px-1 pt-2 text-xs text-[rgb(164,164,164)]">
                            +{dayShows.length - ROWS} more
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="flex min-h-[260px] items-center justify-center px-6 text-center text-sm text-[rgb(164,164,164)]">
                        Nothing in this preview airs on {DAY_LABELS[selected].long}.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="flex min-h-[368px] items-center justify-center px-6 text-center text-sm text-[rgb(164,164,164)]">
                Your shows will appear here, by the day they air.
              </p>
            )}
          </div>
          {shows.length > 0 && (
            <p className="mt-3 text-xs text-[rgb(164,164,164)]">
              Preview built from this season&apos;s soonest episodes. Yours shows only what you track.
            </p>
          )}
        </div>

        <ShareStrip session={session} />

        <div className="mt-8 lg:col-start-1 lg:row-start-3 lg:mt-0">
          <SessionCta location="schedule" size="section" signedInAction="airing_schedule" />
        </div>
      </div>
    </section>
  );
}

function ScheduleRow({ media }: { media: AnimeMedia }) {
  const next = nextAiring(media);
  const title = displayTitle(media);
  const cover = media.coverImage.medium ?? media.coverImage.large;
  if (!next) return null;
  return (
    <li className="flex h-16 items-center gap-3 px-1">
      <div
        className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[rgb(53,53,53)]"
        style={media.coverImage.color ? { backgroundColor: media.coverImage.color } : undefined}
      >
        {cover && (
          <Image src={cover} alt="" width={40} height={56} loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex w-0 min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold text-white" title={title}>
          {title}
        </p>
        <p className="truncate text-xs text-[rgb(164,164,164)]">
          {next.episode === 1 ? "Premiere" : next.episode ? `EP ${next.episode}` : "Next EP"} ·{" "}
          {formatWeekdayTime(next.airingAt)} PT
        </p>
      </div>
      <span className="min-w-[5.5rem] shrink-0 text-right text-sm font-semibold text-[#95ccff]">
        <CountdownText airingAt={next.airingAt} episode={next.episode} mode="compact" className="justify-end" />
      </span>
    </li>
  );
}

function ShareStrip({ session }: { session: ReturnType<typeof useLandingSession> }) {
  const host = useSyncExternalStore(subscribeHost, getHost, getServerHost);
  const inputRef = useRef<HTMLInputElement>(null);
  const signedIn = session.status === "signedIn";

  const handleCopy = async () => {
    if (session.status !== "signedIn") return;
    const url = new URL(myListPath(session.userId), window.location.origin).href;
    trackLanding("cta_click", { cta: "copy_list_link", location: "schedule" });
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      toast.error("Couldn't copy. Select the link and copy it.");
    }
    markQuest(session.userId, "share");
  };

  return (
    <div className="mt-8 rounded-xl border border-dashed border-[#95ccff]/30 p-4 lg:col-start-1 lg:row-start-2 lg:mt-0">
      <SageLine kind="Notice" size="sm">
        Named monsters evolve. Named lists get shared.
      </SageLine>
      <p className="mt-3 text-sm leading-6 text-[rgb(200,206,218)]">
        Your list lives at its own link. Send it to a friend: anyone with the link can look, only you
        can edit.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="url-shimmer min-w-0 flex-1 rounded-lg border border-[rgb(53,53,53)] bg-[rgb(18,18,18)]">
          {signedIn ? (
            <input
              ref={inputRef}
              readOnly
              aria-label="Your list link"
              value={`${host}${myListPath(session.userId)}`}
              onFocus={(event) => event.currentTarget.select()}
              className="h-11 w-full truncate bg-transparent px-3 font-mono text-sm text-[#cfe8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
            />
          ) : (
            <p className="flex h-11 items-center truncate px-3 font-mono text-sm text-[rgb(164,164,164)]">
              kylevb.com/user/…
            </p>
          )}
        </div>
        {signedIn && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy the link to your list"
            className={`inline-flex h-11 shrink-0 items-center rounded-lg border border-[#95ccff]/40 bg-white/5 px-4 text-sm font-semibold text-[#e6f3ff] transition-colors hover:bg-white/10 ${FOCUS_RING}`}
          >
            Copy link
          </button>
        )}
      </div>
    </div>
  );
}
