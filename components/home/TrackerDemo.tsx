"use client";
import { useId, useReducer, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { normalizeUserData } from "@/lib/anime/normalize";
import { STATUS_BADGE_CLASS } from "@/lib/anime/statusBadge";
import {
  LIST_STATUSES,
  LIST_STATUS_LABELS,
  displayTitle,
  type ListStatus,
  type UserAnimeData,
} from "@/lib/anime/types";
import { DEMO_FALLBACK, DEMO_MEDIA_ID } from "@/lib/landing";
import { trackOnce } from "./analytics";
import { useLanding } from "./LandingProvider";
import {
  CHAPTER_CLASS,
  CHAPTER_SUB_CLASS,
  CHAPTER_TITLE_CLASS,
  EYEBROW_CLASS,
  SageLine,
  Skill,
  type SageKind,
} from "./SageLine";
import { SessionCta, SessionStatusLine } from "./SessionCta";
import Slime from "./Slime";

const EPISODES = 24;
const INITIAL: UserAnimeData = {
  listType: "watching",
  episodeProgressNumber: 22,
  startDate: Date.UTC(2026, 3, 3),
  finishDate: null,
  score: null,
};
const SCORES = Array.from({ length: 20 }, (_, index) => 10 - index * 0.5);

// Stored dates are UTC-midnight calendar days, so format them in UTC.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Kind = "plus_one" | "status" | "score";
type LastAction =
  | { kind: "start" | "reset" }
  | { kind: Kind; prev: UserAnimeData; next: UserAnimeData };

interface DemoState {
  data: UserAnimeData;
  last: LastAction;
  touched: boolean;
  /** Transitions into Completed, to replay the console slime's gulp. */
  completions: number;
}

type DemoAction = { type: "apply"; kind: Kind; value: UserAnimeData } | { type: "reset" };

function reducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "reset") {
    return { ...state, data: INITIAL, last: { kind: "reset" }, touched: true };
  }
  const prev = state.data;
  const next = action.value;
  const completed = next.listType === "completed" && prev.listType !== "completed";
  return {
    data: next,
    last: { kind: action.kind, prev, next },
    touched: true,
    completions: state.completions + (completed ? 1 : 0),
  };
}

/** The console line, derived from the last action and its result. */
function consoleMessage(last: LastAction): { kind: SageKind; text: string } {
  switch (last.kind) {
    case "start":
    case "reset":
      return { kind: "Question", text: "Watched the next one? Tap +1." };
    case "plus_one": {
      if (last.next.listType === "completed" && last.prev.listType !== "completed") {
        return {
          kind: "Notice",
          text: "Final episode reached. Moved to Completed. Finish date set to today.",
        };
      }
      const progress = last.next.episodeProgressNumber;
      return { kind: "Notice", text: `Episode ${progress} logged. ${EPISODES - progress} to go.` };
    }
    case "status":
      if (last.prev.listType === "completed" && last.next.listType === "watching") {
        return {
          kind: "Answer",
          text: `Status set to Watching. Rewatching? Progress stays at ${last.next.episodeProgressNumber}.`,
        };
      }
      return { kind: "Answer", text: `Status set to ${LIST_STATUS_LABELS[last.next.listType]}.` };
    case "score":
      return last.next.score === null
        ? { kind: "Notice", text: "Score cleared." }
        : { kind: "Notice", text: `Score recorded: ${last.next.score} / 10.` };
  }
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <svg aria-hidden="true" viewBox="0 0 14 14" className="mt-1.5 h-3.5 w-3.5 shrink-0">
        <path d="M7.6 1C8 3.4 12.6 5.6 12.6 9.1C12.6 11.6 10.4 13 7 13S1.4 11.6 1.4 9.1C1.4 6.3 5.4 4.3 6.6 2.7C7 2.2 7.4 1.7 7.6 1Z" fill="#5daef1" />
        <ellipse cx="5" cy="7.4" rx="1.6" ry="0.9" transform="rotate(-30 5 7.4)" fill="#fff" fillOpacity={0.7} />
      </svg>
      <span>{children}</span>
    </li>
  );
}

/**
 * Chapter 2 · Predator: a hands-on My List card that runs the server's real
 * tracker rules (normalizeUserData) locally. Nothing is saved or sent.
 */
export default function TrackerDemo() {
  const { media } = useLanding();
  const live = media(DEMO_MEDIA_ID);
  const title = live ? displayTitle(live) : DEMO_FALLBACK.title;
  const coverUrl = live ? (live.coverImage.medium ?? live.coverImage.large) : DEMO_FALLBACK.coverUrl;
  const color = (live ? live.coverImage.color : DEMO_FALLBACK.color) ?? DEMO_FALLBACK.color;

  const [state, dispatch] = useReducer(reducer, {
    data: INITIAL,
    last: { kind: "start" },
    touched: false,
    completions: 0,
  });
  const [coverFailed, setCoverFailed] = useState(false);
  const plusRef = useRef<HTMLButtonElement>(null);
  const radioName = useId();
  const scoreId = useId();

  const { data } = state;
  const progress = data.episodeProgressNumber;
  const atLast = progress >= EPISODES;
  const completed = data.listType === "completed";
  const message = consoleMessage(state.last);

  const apply = (kind: Kind, patch: Partial<UserAnimeData>) => {
    const result = normalizeUserData(patch, { episodes: EPISODES, previous: data, now: Date.now() });
    if (!result.ok) return null;
    dispatch({ type: "apply", kind, value: result.value });
    trackOnce("demo_action", { action: kind });
    if (result.value.listType === "completed" && data.listType !== "completed") {
      trackOnce("demo_action", { action: "complete" });
    }
    return result.value;
  };

  const handlePlusOne = () => {
    if (atLast) {
      dispatch({ type: "reset" });
      trackOnce("demo_action", { action: "reset" });
    } else {
      apply("plus_one", { episodeProgressNumber: progress + 1 });
    }
    // Same element either way ("+1" ⇄ "Reset demo"): keep focus on it.
    plusRef.current?.focus();
  };

  const shelves: [string, number, boolean][] = [
    ["All", 1, false],
    ...LIST_STATUSES.map(
      (status): [string, number, boolean] => [
        LIST_STATUS_LABELS[status],
        status === data.listType ? 1 : 0,
        status === data.listType,
      ]
    ),
  ];

  const dateLine = data.finishDate
    ? `Finished ${dateFormat.format(data.finishDate)}`
    : data.startDate
      ? `Started ${dateFormat.format(data.startDate)}`
      : "Not started";

  return (
    <section id="tracker" aria-labelledby="tracker-title" className={CHAPTER_CLASS}>
      {/* Predator's violet haze behind the demo (a gradient; main clips the overhang). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/2 -z-10 h-[40rem] w-[48rem] -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(139,92,246,.11),rgba(93,174,241,.04)_60%,transparent)]"
      />
      <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-12 lg:gap-y-8">
        <div data-reveal="" className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className={EYEBROW_CLASS}>Skill 02 · Predator</p>
          <SageLine kind="Notice" scan="reveal" className="mt-4">
            Unique skill <Skill>Predator</Skill> acquired. Everything you add is stored in your list.
          </SageLine>
          <h2 id="tracker-title" className={`mt-5 ${CHAPTER_TITLE_CLASS}`}>
            Devour the season. We&apos;ll remember every episode.
          </h2>
          <ul className={`mt-6 flex flex-col gap-3 ${CHAPTER_SUB_CLASS} sm:text-base`}>
            <Bullet>
              <strong className="font-semibold text-white">One tap to add:</strong> + Add to list works
              on every show, on every page.
            </Bullet>
            <Bullet>
              <strong className="font-semibold text-white">Five shelves:</strong> Watching, Plan to
              Watch, Completed, Paused and Dropped.
            </Bullet>
            <Bullet>
              Tap <strong className="font-semibold text-white">+1</strong> after each episode. Reach
              the finale and the show files itself under Completed.
            </Bullet>
            <Bullet>
              Scores out of 10, start and finish dates filled in for you, and filters by status, year,
              season and airing day.
            </Bullet>
          </ul>
        </div>

        <figure className="mx-auto mt-10 w-full min-w-0 max-w-md lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <figcaption className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#95ccff]">
            Demo · nothing is saved
          </figcaption>

          <ul
            aria-label="Shelves"
            className="flex flex-wrap gap-1.5 max-[359px]:flex-nowrap max-[359px]:overflow-x-auto max-[359px]:pb-1"
          >
            {shelves.map(([label, count, current]) => (
              <li
                key={label}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[rgb(53,53,53)] px-2.5 text-xs ${
                  current ? "bg-blue-600/20 text-white ring-1 ring-blue-400/40" : "text-[rgb(164,164,164)]"
                }`}
              >
                {label}
                <span className="tabular-nums font-semibold">{count}</span>
              </li>
            ))}
          </ul>

          <div
            className={`relative mt-3 grid grid-cols-1 gap-4 rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] p-4 min-[360px]:grid-cols-[72px_1fr] ${
              state.touched ? "ring-1 ring-[#95ccff]/20" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className="absolute -top-2.5 right-3 rounded-full bg-[#95ccff] px-2 py-0.5 text-[10px] font-black tracking-wider text-[#0a1428]"
            >
              DEMO
            </span>

            <div
              className="relative flex h-[104px] w-[72px] items-center justify-center overflow-hidden rounded-md"
              style={{ backgroundColor: color }}
            >
              {coverUrl && !coverFailed ? (
                <Image
                  src={coverUrl}
                  alt=""
                  width={72}
                  height={104}
                  loading="lazy"
                  onError={() => setCoverFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Slime size={40} animated={false} />
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-white">{title}</p>
                  <span
                    key={data.listType}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset animate-fade-in ${STATUS_BADGE_CLASS[data.listType]}`}
                  >
                    {LIST_STATUS_LABELS[data.listType]}
                  </span>
                </div>
                <button
                  ref={plusRef}
                  type="button"
                  onClick={handlePlusOne}
                  aria-label={atLast ? undefined : `Log episode ${progress + 1} (demo)`}
                  className={`inline-flex h-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(30,30,30)] ${
                    atLast
                      ? "border border-[#95ccff]/40 bg-white/5 px-3 hover:bg-white/10"
                      : "w-16 bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {atLast ? "Reset demo" : "+1"}
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-[rgb(164,164,164)]">
                  Ep <span className="font-semibold tabular-nums text-white">{progress}</span> / {EPISODES}
                </p>
                <div
                  role="progressbar"
                  aria-label="Episodes watched"
                  aria-valuemin={0}
                  aria-valuemax={EPISODES}
                  aria-valuenow={progress}
                  aria-valuetext={`Episode ${progress} of ${EPISODES}`}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(53,53,53)]"
                >
                  <div
                    className={`h-full rounded-full transition-[width,background-color] duration-300 ${
                      completed ? "bg-emerald-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.round((progress / EPISODES) * 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-[rgb(164,164,164)]">
                {dateLine} · Score{" "}
                <span className="font-semibold tabular-nums text-white">{data.score ?? "—"}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <fieldset className="min-w-0">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[rgb(164,164,164)]">
                Status
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {LIST_STATUSES.map((status: ListStatus) => (
                  <label key={status} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name={radioName}
                      value={status}
                      checked={data.listType === status}
                      onChange={() => apply("status", { listType: status })}
                      className="peer sr-only"
                    />
                    <span className="inline-flex h-9 items-center rounded-full border border-[rgb(53,53,53)] px-3 text-xs font-medium text-[rgb(200,206,218)] transition-colors hover:bg-white/5 peer-checked:border-blue-500 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#95ccff] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[rgb(18,18,18)]">
                      {LIST_STATUS_LABELS[status]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center gap-3">
              <label htmlFor={scoreId} className="text-xs font-semibold uppercase tracking-wider text-[rgb(164,164,164)]">
                Score
              </label>
              <select
                id={scoreId}
                value={data.score === null ? "" : String(data.score)}
                onChange={(event) =>
                  apply("score", { score: event.target.value === "" ? null : Number(event.target.value) })
                }
                className="h-9 rounded-lg border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
              >
                <option value="">—</option>
                {SCORES.map((score) => (
                  <option key={score} value={String(score)}>
                    {score}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex min-h-[56px] items-center gap-3 rounded-xl border border-[#95ccff]/20 bg-[#0a1528]/70 px-3 py-2">
            <Slime
              size={28}
              mood={completed ? "happy" : "idle"}
              gulpKey={state.completions}
              className="shrink-0"
            />
            <p role="status" aria-live="polite" className="min-w-0 font-mono text-xs leading-5 text-[#cfe8ff] sm:text-[13px]">
              <span className="sr-only">{`Great Sage ${message.kind.toLowerCase()}: `}</span>
              <span aria-hidden="true" className="mr-1.5 text-[#95ccff]">
                《{message.kind}》
              </span>
              {message.text}
            </p>
          </div>
        </figure>

        <div className="mt-10 flex flex-col gap-2 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:self-start">
          <SessionCta location="tracker" size="section" />
          <SessionStatusLine variant="tracker" />
        </div>
      </div>
    </section>
  );
}
