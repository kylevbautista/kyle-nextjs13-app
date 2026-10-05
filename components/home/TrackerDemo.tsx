"use client";
import { useEffect, useId, useReducer, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import NewEpisodesChip from "@/components/theme/NewEpisodesChip";
import NextEpisodeLine from "@/components/theme/NextEpisodeLine";
import { revealInRow } from "@/components/theme/revealInRow";
import { BAR_SHEEN, PLUS_ONE, PLUS_ONE_READY } from "@/components/theme/tokens";
import UndoButton from "@/components/theme/UndoButton";
import { normalizeUserData } from "@/lib/anime/normalize";
import { STATUS_BADGE_CLASS, STATUS_DOT_CLASS } from "@/lib/anime/statusBadge";
import {
  SaveError,
  TrackQueue,
  type CardActivity,
  type SaveOutcome,
  type TrackMedia,
  type TrackTransport,
} from "@/lib/anime/trackQueue";
import {
  PROMPT_MESSAGE,
  scoreMessage,
  statusMessage,
  undoLabel,
  undoTitle,
  type ConsoleMessage,
} from "@/lib/anime/trackerConsole";
import {
  LIST_STATUSES,
  LIST_STATUS_LABELS,
  displayTitle,
  type ListStatus,
  type UserAnimeData,
} from "@/lib/anime/types";
import { applyProgressRequest, applyUserDataRequest, type ProgressRequest } from "@/lib/anime/userDataRequest";
import { DEMO_FALLBACK, DEMO_MEDIA_ID, demoTrackMedia } from "@/lib/landing";
import { trackOnce } from "./analytics";
import { useLanding } from "./LandingProvider";
import {
  CHAPTER_CLASS,
  CHAPTER_SUB_CLASS,
  CHAPTER_TITLE_CLASS,
  EYEBROW_CLASS,
  SageLine,
  Skill,
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
/** A +1 press this soon after the demo moved focus onto it (or reached the finale) is a double press. */
const GUARD_MS = 500;
/** The guard's clock (event handlers only). */
const clock = () => performance.now();

// Stored dates are UTC-midnight calendar days, so format them in UTC.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

interface DemoState {
  data: UserAnimeData;
  /** The console line: the prompt until something happens, then the engine's or a pill's line. */
  message: ConsoleMessage;
  touched: boolean;
  /** Transitions into Completed, to replay the console slime's gulp. */
  completions: number;
  activity: CardActivity | null;
}

type DemoAction =
  | { type: "view"; userData: UserAnimeData; prev: UserAnimeData }
  | { type: "message"; message: ConsoleMessage }
  | { type: "activity"; activity: CardActivity | null }
  | { type: "touch" };

function reducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "view": {
      const completed = action.userData.listType === "completed" && action.prev.listType !== "completed";
      return { ...state, data: action.userData, completions: state.completions + (completed ? 1 : 0) };
    }
    case "message":
      return { ...state, message: action.message };
    case "activity":
      return { ...state, activity: action.activity };
    case "touch":
      return state.touched ? state : { ...state, touched: true };
  }
}

/**
 * The demo's "server": My List's request rules (lib/anime/userDataRequest.ts)
 * applied in memory, so the demo runs the page's own engine (TrackQueue) with
 * nothing sent or saved.
 */
class DemoServer implements TrackTransport {
  private stored: UserAnimeData;
  constructor(stored: UserAnimeData) {
    this.stored = stored;
  }
  put(value: UserAnimeData) {
    this.stored = value;
  }
  /** A status pill or the score: an absolute write against the stored value, as the route does. */
  set(patch: Partial<UserAnimeData>) {
    const result = normalizeUserData(patch, { episodes: EPISODES, previous: this.stored, now: Date.now() });
    if (result.ok) this.stored = result.value;
    return result;
  }
  async log(_id: number, op: ProgressRequest, media: TrackMedia): Promise<SaveOutcome> {
    const previous = this.stored;
    const result = applyProgressRequest({ ...media, userData: previous }, op, Date.now());
    if (!result.ok) throw new SaveError(result.error, "rejected", "invalid");
    this.stored = result.value;
    return { userData: result.value, previous };
  }
  async undo(_id: number, restore: UserAnimeData, expect: UserAnimeData, media: TrackMedia): Promise<SaveOutcome> {
    const previous = this.stored;
    const result = applyUserDataRequest({ kind: "set", userData: restore, expect }, { ...media, userData: previous }, Date.now());
    if (!result.ok) {
      throw result.code === "changed"
        ? new SaveError(result.error, "changed", "changed", previous)
        : new SaveError(result.error, "rejected", "invalid");
    }
    this.stored = result.value;
    return { userData: result.value, previous };
  }
  async read() {
    return this.stored;
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
  // 72px wide: the ~230px file stays sharp up to 3× screens (the 100px one didn't at 2×).
  const coverUrl = live ? (live.coverImage.large ?? live.coverImage.medium) : DEMO_FALLBACK.coverUrl;
  const color = (live ? live.coverImage.color : DEMO_FALLBACK.color) ?? DEMO_FALLBACK.color;

  const [state, dispatch] = useReducer(reducer, {
    data: INITIAL,
    message: PROMPT_MESSAGE,
    touched: false,
    completions: 0,
    activity: null,
  });
  const [coverFailed, setCoverFailed] = useState(false);
  const plusRef = useRef<HTMLButtonElement>(null);
  const radioName = useId();
  const scoreId = useId();
  const [server] = useState(() => new DemoServer(INITIAL));
  const [queue] = useState(() => new TrackQueue(server));
  /**
   * When focus was last moved onto +1 by the demo, or +1 last logged an episode: a press
   * that soon after is a double press (My List's guard), and never resets the demo.
   */
  const guardAt = useRef(0);

  const { data, activity } = state;
  const progress = data.episodeProgressNumber;
  const atLast = progress >= EPISODES;
  // The number rolls up only when it goes up (My List's card).
  const [shown, setShown] = useState({ progress, up: false });
  if (shown.progress !== progress) setShown({ progress, up: progress > shown.progress });
  const completed = data.listType === "completed";
  const message = state.message;
  // The engine, the chip and the lines all read this, so the chip never promises more than the demo logs.
  const demoMedia: TrackMedia = demoTrackMedia(live);

  useEffect(
    () =>
      queue.connect({
        view: (_id, userData, prev) => {
          dispatch({ type: "view", userData, prev });
          if (userData.listType === "completed" && prev.listType !== "completed") {
            trackOnce("demo_action", { action: "complete" });
          }
        },
        activity: (_id, next) => {
          // Undo unmounting under keyboard focus: hand focus to +1 (My List's rule).
          const active = document.activeElement;
          const undoFocused =
            active instanceof HTMLElement && active.matches(`[data-track-card="${DEMO_MEDIA_ID}"] [data-undo]`);
          if (!next?.undo && undoFocused) {
            flushSync(() => dispatch({ type: "activity", activity: next }));
            guardAt.current = clock();
            plusRef.current?.focus();
          } else {
            dispatch({ type: "activity", activity: next });
          }
        },
        say: (_id, line) => dispatch({ type: "message", message: line }),
        settled: () => {},
      }),
    [queue]
  );

  /** A pill or the score: the server's absolute rules, then the engine adopts the result. */
  const apply = (kind: "status" | "score", patch: Partial<UserAnimeData>) => {
    const result = server.set(patch);
    if (!result.ok) return;
    dispatch({ type: "touch" });
    queue.adopt(DEMO_MEDIA_ID, result.value, demoMedia);
    dispatch({ type: "message", message: kind === "status" ? statusMessage(data, result.value) : scoreMessage(result.value) });
    trackOnce("demo_action", { action: kind });
  };

  const handlePlusOne = () => {
    if (clock() - guardAt.current < GUARD_MS) return;
    dispatch({ type: "touch" });
    if (atLast) {
      server.put(INITIAL);
      queue.adopt(DEMO_MEDIA_ID, INITIAL, demoMedia);
      dispatch({ type: "message", message: PROMPT_MESSAGE });
      trackOnce("demo_action", { action: "reset" });
    } else {
      queue.tap(demoMedia, data);
      // The finale turns this button into Reset demo: a fast extra press must not reset it.
      if (progress + 1 >= EPISODES) guardAt.current = clock();
      trackOnce("demo_action", { action: "plus_one" });
    }
    // Same element either way ("+1" ⇄ "Reset demo"): keep focus on it.
    plusRef.current?.focus();
  };

  const handleCatchUp = (count: number, button: HTMLButtonElement) => {
    const hadFocus = document.activeElement === button;
    dispatch({ type: "touch" });
    flushSync(() => queue.catchUp(demoMedia, data, count));
    if (hadFocus && !button.isConnected) {
      guardAt.current = clock();
      plusRef.current?.focus();
    }
    trackOnce("demo_action", { action: "catch_up" });
  };

  const handleUndo = () => {
    dispatch({ type: "touch" });
    queue.undo(DEMO_MEDIA_ID);
    trackOnce("demo_action", { action: "undo" });
  };

  // The same shelves as My List: "All", then each status with its dot.
  const shelves: [ListStatus | null, string, number, boolean][] = [
    [null, "All", 1, false],
    ...LIST_STATUSES.map(
      (status): [ListStatus, string, number, boolean] => [
        status,
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
              <strong className="font-semibold text-white">Behind on logging?</strong> Log N new marks every
              aired episode you haven&apos;t logged. Undo puts it back.
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
            // My List's shelf row: one row that scrolls sideways (with a fade) on phones.
            className="flex gap-1.5 py-1 max-sm:-mx-1 max-sm:overflow-x-auto max-sm:px-1 max-sm:pr-8 max-sm:[mask-image:linear-gradient(to_right,#000_85%,transparent)] max-sm:[scrollbar-width:none] sm:flex-wrap"
          >
            {shelves.map(([status, label, count, current]) => (
              <li
                key={label}
                // Keeps the shelf the show just moved to in view in the phone's sideways row.
                ref={current ? (node) => revealInRow(node) : undefined}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[rgb(53,53,53)] px-2.5 text-xs ${
                  current ? "bg-blue-600/20 text-white ring-1 ring-blue-400/40" : "text-[rgb(164,164,164)]"
                }`}
              >
                {status && (
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASS[status]}`} />
                )}
                {label}
                <span className="tabular-nums font-semibold">{count}</span>
              </li>
            ))}
          </ul>

          <div
            data-track-card={DEMO_MEDIA_ID}
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
                  // A held Enter logs one episode, not an auto-repeat stream (My List's +1).
                  onKeyDown={(event) => {
                    if (event.repeat) event.preventDefault();
                  }}
                  // A fixed name, like My List's: screen readers hear only the console's line.
                  aria-label={atLast ? undefined : "+1: log the next episode (demo)"}
                  // My List's +1 box (PlusOneButton's tokens); "Reset demo" takes its text's width.
                  className={`${
                    atLast
                      ? "relative inline-flex h-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-[#95ccff]/40 bg-white/5 px-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(30,30,30)] md:h-10"
                      : `${PLUS_ONE} ${PLUS_ONE_READY}`
                  } ${activity && activity.taps > 0 ? (activity.taps % 2 ? "animate-slime-poke" : "animate-slime-poke-2") : ""}`}
                >
                  {atLast ? "Reset demo" : "+1"}
                </button>
              </div>

              {/* My List's countdown line, from the live show (none for the fallback). */}
              {live && <NextEpisodeLine media={live} />}

              <div className="flex flex-col gap-1.5">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <p className="min-w-0 text-xs text-[rgb(164,164,164)]">
                    Ep{" "}
                    <span
                      key={progress}
                      className={`font-semibold tabular-nums text-white ${activity && shown.up ? "inline-block animate-tick" : ""}`}
                    >
                      {progress}
                    </span>{" "}
                    / {EPISODES}
                  </p>
                  {/* My List's "Log N new" chip, from the live show's real schedule (none for the fallback). */}
                  {live && <NewEpisodesChip media={{ ...demoMedia, userData: data }} demo onCatchUp={handleCatchUp} />}
                </div>
                <div
                  role="progressbar"
                  aria-label="Episodes watched"
                  aria-valuemin={0}
                  aria-valuemax={EPISODES}
                  aria-valuenow={progress}
                  aria-valuetext={`Episode ${progress} of ${EPISODES}`}
                  className="relative h-1.5 w-full overflow-hidden rounded-full bg-[rgb(53,53,53)]"
                >
                  <div
                    className={`h-full rounded-full transition-[width,background-color] duration-300 ${
                      completed ? "bg-emerald-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.round((progress / EPISODES) * 100)}%` }}
                  />
                  {activity?.justCompleted && <span aria-hidden="true" className={BAR_SHEEN} />}
                </div>
              </div>

              {/* My List's row: Undo takes the date line's place (the demo has no Edit). */}
              <div className="mt-auto flex min-h-11 items-center gap-2 md:min-h-9">
                {activity?.undo ? (
                  <UndoButton
                    undo={activity.undo}
                    label={undoLabel({
                      n: activity.undo.n,
                      restore: activity.undo.restore,
                      current: data,
                      episodes: EPISODES,
                      demo: true,
                    })}
                    title={undoTitle({ restore: activity.undo.restore, current: data, episodes: EPISODES })}
                    onUndo={handleUndo}
                    onExpire={() => queue.expireUndo(DEMO_MEDIA_ID)}
                  />
                ) : (
                  <p className="min-w-0 text-xs text-[rgb(164,164,164)]">
                    {dateLine} · Score{" "}
                    <span className="font-semibold tabular-nums text-white">{data.score ?? "—"}</span>
                  </p>
                )}
              </div>
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

          {/* Room for its tallest line (3 lines below 390px, 2 above): a line that lands ~700 ms after a
              tap never resizes the box and moves the call to action below it. */}
          <div className="mt-4 flex min-h-[78px] items-center gap-3 rounded-xl border border-[#95ccff]/20 bg-[#0a1528]/70 px-3 py-2 min-[390px]:min-h-[58px]">
            <Slime
              size={28}
              mood={completed ? "happy" : "idle"}
              gulpKey={state.completions}
              className="shrink-0"
            />
            <p role="status" aria-live="polite" className="min-w-0 font-mono text-xs leading-5 text-[#cfe8ff] sm:text-[13px]">
              <span className="sr-only">{`Great Sage ${message.kind.toLowerCase()}: ${message.spoken}`}</span>
              <span aria-hidden="true" className="mr-1.5 text-[#95ccff]">
                《{message.kind}》
              </span>
              <span aria-hidden="true">{message.text}</span>
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
