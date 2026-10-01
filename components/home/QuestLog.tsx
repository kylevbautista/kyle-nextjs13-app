"use client";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import EvolutionCard from "@/components/theme/EvolutionCard";
import { useMyList } from "@/components/utils/useMyList";
import {
  LIST_STATUS_LABELS,
  displayTitle,
  type AnimeMedia,
  type ListStatus,
} from "@/lib/anime/types";
import {
  ADD_INTENT_KEY,
  QUEST_TARGET,
  TIER_LABELS,
  TIER_THRESHOLDS,
  evolutionTier,
  parseAddIntent,
  type EvolutionTier,
} from "@/lib/landing";
import { airingSchedulePath, myListPath, signInPath } from "@/lib/routes";
import { EpisodeCard } from "./AiringGrid";
import { trackLanding, trackOnce } from "./analytics";
import { useLanding, useVisibleAiring } from "./LandingProvider";
import { markQuest, useQuestFlags } from "./questStore";
import { SageLine, SageTag, type SageKind } from "./SageLine";
import { SessionCta } from "./SessionCta";
import Slime from "./Slime";
import { useLandingSession, type LandingSession } from "./useLandingSession";

/**
 * #quests. Signed out: the last sign-up pitch with a locked preview of the
 * quests. Signed in (where every landing OAuth returns): the Quest Log.
 * Quest 1 adds shows inline, Quest 2 opens the Airing Schedule, Quest 3
 * copies the list link. The Evolution card shows the viewer's tier. Every
 * state reflects real list data only.
 */

type SignedIn = Extract<LandingSession, { status: "signedIn" }>;
type StatusMessage = { kind: SageKind | null; text: string } | null;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(18,18,18)]";
const PRIMARY_BUTTON = `inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500 ${FOCUS_RING}`;
const GHOST_BUTTON = `inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[rgb(53,53,53)] px-4 text-sm font-semibold text-[#e6f3ff] transition-colors hover:border-[#95ccff]/60 hover:bg-white/5 ${FOCUS_RING}`;
const TEXT_LINK = `rounded text-[#95ccff] underline-offset-2 hover:underline ${FOCUS_RING}`;

const TIER_RANK: Record<EvolutionTier, number> = { slime: 0, named: 1, demon: 2, lord: 3 };

const QUESTS = [
  { n: 1, skill: "Predator", text: "Add 3 shows to your list" },
  { n: 2, skill: "Thought Acceleration", text: "Open your Airing Schedule" },
  { n: 3, skill: "Thought Communication", text: "Share your list's link" },
] as const;

export default function QuestLog({ airingIds }: { airingIds: number[] }) {
  const session = useLandingSession();
  return (
    <div className="relative mx-auto min-h-[640px] max-w-4xl px-4 py-20">
      {session.status === "signedIn" ? (
        <SignedInQuestLog session={session} airingIds={airingIds} />
      ) : session.status === "signedOut" ? (
        <SignedOutPitch cta={<SessionCta location="quests" size="final" />} />
      ) : (
        <QuestLogLoading />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signed out
// ---------------------------------------------------------------------------

function SignedOutPitch({ cta, withIds = true }: { cta: ReactNode; withIds?: boolean }) {
  const { season } = useLanding();
  return (
    <div className="flex flex-col items-center text-center">
      {withIds && <Slime size={160} className="max-w-full" />}
      <SageLine kind="Answer" className="mt-6">
        Affirmative. You&apos;re ready to be named.
      </SageLine>
      <h2
        id={withIds ? "quests-title" : undefined}
        className="mt-5 max-w-[18ch] text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl"
      >
        Every legend starts as a slime.
      </h2>
      <p className="mt-4 max-w-xl text-lg leading-8 text-[#c9d6e6]">
        Sign in with Google, add what you&apos;re watching, and let the countdowns do the
        remembering.
      </p>
      <div
        id={withIds ? "quests-cta" : undefined}
        className="mt-8 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row"
      >
        {cta}
        <Link
          href={season?.browseHref ?? "/anime"}
          onClick={() => trackLanding("cta_click", { cta: "browse_season", location: "quests" })}
          className={`${TEXT_LINK} inline-flex min-h-11 items-center px-2`}
        >
          or browse this season
        </Link>
      </div>
      <p className="mt-3 text-sm text-[rgb(164,164,164)]">
        Free · No ads · Your list gets its own link.
      </p>
      <LockedQuests />
    </div>
  );
}

function LockedQuests() {
  return (
    <div className="mt-12 w-full max-w-xl text-left">
      <h3 className="text-lg font-bold text-white">Your first quests</h3>
      <ol className="mt-3 flex flex-col gap-2">
        {QUESTS.map((quest) => (
          <li
            key={quest.n}
            className="grid grid-cols-[32px_1fr] items-center gap-3 rounded-xl border border-dashed border-[#95ccff]/20 bg-[rgb(30,30,30)]/60 p-4"
          >
            <span className="opacity-60">
              <LockIcon />
            </span>
            <div>
              <p className="font-mono text-xs text-[#95ccff]">
                Quest {quest.n} · {quest.skill}
              </p>
              <p className="font-semibold text-[rgb(200,206,218)]">{quest.text}.</p>
              <p className="text-xs text-[rgb(164,164,164)]">Unlocks when you sign in</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Same min height as the other states; no-JS visitors get the signed-out pitch. */
function QuestLogLoading() {
  return (
    <>
      <h2 id="quests-title" className="sr-only">
        Your first quests
      </h2>
      {/* w-full + max-w: a fixed width here would be this column's min-content
          width and widen the page on phones (the body grid's column is auto). */}
      <div aria-hidden="true" className="js-only flex flex-col items-center gap-5">
        <div className="h-[136px] w-[160px] max-w-full rounded-full bg-white/5 animate-pulse" />
        <div className="h-10 w-full max-w-60 rounded-md bg-white/5" />
        <div className="h-12 w-full max-w-[26rem] rounded-lg bg-white/10" />
        <div className="h-6 w-full max-w-80 rounded bg-white/5" />
        <div className="mt-3 h-14 w-full rounded-2xl bg-white/10 sm:w-[16rem] lg:h-16" />
      </div>
      <noscript>
        <SignedOutPitch
          withIds={false}
          cta={
            <a
              href={signInPath("/#quests")}
              className={`${PRIMARY_BUTTON} h-14 w-full rounded-2xl px-6 text-base sm:w-[16rem]`}
            >
              Start my list
            </a>
          }
        />
      </noscript>
    </>
  );
}

// ---------------------------------------------------------------------------
// Signed in
// ---------------------------------------------------------------------------

function SignedInQuestLog({ session, airingIds }: { session: SignedIn; airingIds: number[] }) {
  const { userId, firstName: name, count, confirmedCount, tier } = session;
  const { isInList } = useMyList();
  const flags = useQuestFlags(userId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Visuals follow the optimistic count (in-flight adds included); the
  // announcements and analytics below wait for the server (confirmedCount),
  // so a failed add never reports a quest or an evolution it rolls back.
  const done1 = count !== null && count >= QUEST_TARGET;
  const allCleared = done1 && flags.schedule && flags.share;
  const confirmedDone1 = confirmedCount !== null && confirmedCount >= QUEST_TARGET;
  const confirmedTier = evolutionTier(true, confirmedCount);

  // Quest 1's cards exclude what was already on the list when it loaded, so a
  // show added here stays put (as "✓ On my list") instead of vanishing
  // from under the keyboard focus.
  const [onListAtLoad, setOnListAtLoad] = useState<ReadonlySet<number> | null>(null);
  if (onListAtLoad === null && count !== null) {
    setOnListAtLoad(new Set(airingIds.filter((id) => isInList(id))));
  }

  // The status line is derived from what changed since the last render.
  const [seen, setSeen] = useState<{
    count: number | null;
    schedule: boolean;
    share: boolean;
    message: StatusMessage;
  }>({ count: confirmedCount, schedule: flags.schedule, share: flags.share, message: null });
  if (
    seen.count !== confirmedCount ||
    seen.schedule !== flags.schedule ||
    seen.share !== flags.share
  ) {
    const count = confirmedCount;
    let message = seen.message;
    if (seen.count !== null && count !== null && count > seen.count) {
      if (seen.count < TIER_THRESHOLDS.lord && count >= TIER_THRESHOLDS.lord) {
        message = {
          kind: "Notice",
          text: `Your list reached ${TIER_THRESHOLDS.lord} shows. Evolution complete: ${TIER_LABELS.lord}.`,
        };
      } else if (seen.count < TIER_THRESHOLDS.demon && count >= TIER_THRESHOLDS.demon) {
        message = {
          kind: "Notice",
          text: `Your list reached ${TIER_THRESHOLDS.demon} shows. Evolution complete: ${TIER_LABELS.demon}.`,
        };
      }
    }
    if (
      message === seen.message &&
      ((flags.schedule && !seen.schedule) || (flags.share && !seen.share))
    ) {
      message = { kind: null, text: "Quest cleared." };
    }
    setSeen({ count, schedule: flags.schedule, share: flags.share, message });
  }
  const announce = useCallback(
    (message: StatusMessage) => setSeen((current) => ({ ...current, message })),
    []
  );

  // Analytics and focus, compared against the state when the list first loaded.
  const baseline = useRef<{
    done1: boolean;
    schedule: boolean;
    share: boolean;
    tier: EvolutionTier;
    cleared: boolean;
  } | null>(null);
  useEffect(() => {
    if (confirmedCount === null) return;
    const base = baseline.current;
    if (!base) {
      baseline.current = {
        done1: confirmedDone1,
        schedule: flags.schedule,
        share: flags.share,
        tier: confirmedTier,
        cleared: allCleared,
      };
      return;
    }
    if (confirmedDone1 && !base.done1) trackOnce("quest_complete", { quest: 1 });
    if (flags.schedule && !base.schedule) trackOnce("quest_complete", { quest: 2 });
    if (flags.share && !base.share) trackOnce("quest_complete", { quest: 3 });
    if (confirmedTier !== "slime" && TIER_RANK[confirmedTier] > TIER_RANK[base.tier]) {
      trackOnce("evolution", { tier: confirmedTier });
    }
    if (allCleared && !base.cleared) {
      baseline.current = { ...base, cleared: true };
      // The quest rows just turned into the routing panel: keep keyboard focus
      // in this section if it was here (or was lost with the removed button).
      const active = document.activeElement;
      if (active === document.body || containerRef.current?.contains(active)) {
        headingRef.current?.focus();
      }
    }
  }, [confirmedCount, confirmedDone1, flags.schedule, flags.share, confirmedTier, allCleared]);

  const header = allCleared ? (
    <>
      <SageLine kind="Notice">All quests cleared. Evolution continues as your list grows.</SageLine>
      <h2
        id="quests-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-3xl font-black tracking-tight text-white focus:outline-none sm:text-4xl"
      >
        {name ? `Quests cleared, ${name}.` : "Quests cleared."}
      </h2>
    </>
  ) : (
    <>
      <SageLine kind="Notice">Naming complete. Quest log updated.</SageLine>
      <h2
        id="quests-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-3xl font-black tracking-tight text-white focus:outline-none sm:text-4xl"
      >
        {name ? `Your first quests, ${name}.` : "Your first quests."}
      </h2>
    </>
  );

  return (
    <div ref={containerRef}>
      {header}
      <p role="status" className="mt-3 min-h-6 text-sm text-[#cfe8ff]">
        {seen.message && (
          <>
            {seen.message.kind && <SageTag kind={seen.message.kind} />}
            {seen.message.text}
          </>
        )}
      </p>
      <Suspense fallback={null}>
        <AddIntentHandler announce={announce} headingRef={headingRef} />
      </Suspense>
      <div className="mt-6 flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_280px]">
        {allCleared ? (
          <ClearedPanel userId={userId} />
        ) : (
          <ol className="flex flex-col gap-3">
            <PredatorQuest
              count={count}
              done={done1}
              airingIds={airingIds}
              onListAtLoad={onListAtLoad}
            />
            <ScheduleQuest userId={userId} done={flags.schedule} />
            <ShareQuest userId={userId} done={flags.share} />
          </ol>
        )}
        <EvolutionCard count={count} tier={tier} />
      </div>
    </div>
  );
}

function StateIcon({ done, n }: { done: boolean; n: number }) {
  if (done) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            pathLength={1}
            strokeDasharray="1"
            className="animate-draw-check"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#95ccff]/40 font-mono text-sm text-[#95ccff]"
    >
      {n}
    </span>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#95ccff"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function QuestRow({
  n,
  done,
  state,
  action,
  children,
}: {
  n: number;
  done: boolean;
  /** Textual state: "Done", "2 of 3", "To do". */
  state: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const quest = QUESTS[n - 1];
  return (
    <li
      className={`grid grid-cols-[32px_1fr] items-center gap-x-3 gap-y-3 rounded-xl border p-4 sm:grid-cols-[32px_1fr_auto] ${
        done
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-[rgb(53,53,53)] bg-[rgb(30,30,30)]/80"
      }`}
    >
      <StateIcon done={done} n={n} />
      <div className="min-w-0">
        <h3 className="font-semibold text-white">
          <span className="block font-mono text-xs font-normal text-[#95ccff]">
            Quest {quest.n} · {quest.skill}
            <span className="sr-only">:</span>
          </span>
          {quest.text}
        </h3>
        <p className={`text-sm tabular-nums ${done ? "text-emerald-300" : "text-[rgb(164,164,164)]"}`}>
          {state}
        </p>
      </div>
      {action && <div className="col-start-2 sm:col-start-3">{action}</div>}
      {children && <div className="col-span-2 sm:col-span-3">{children}</div>}
    </li>
  );
}

function PredatorQuest({
  count,
  done,
  airingIds,
  onListAtLoad,
}: {
  count: number | null;
  done: boolean;
  airingIds: number[];
  onListAtLoad: ReadonlySet<number> | null;
}) {
  const { season, isContinuing } = useLanding();
  const exclude = useCallback((id: number) => onListAtLoad?.has(id) ?? false, [onListAtLoad]);
  const cards = useVisibleAiring(airingIds, 4, exclude);
  const progress = Math.min(count ?? 0, QUEST_TARGET);
  const state = count === null ? "Checking your list…" : done ? "Done" : `${progress} of ${QUEST_TARGET}`;

  const browse = season && airingIds.length ? (
    <Link
      href={season.seasonHref}
      onClick={() => trackLanding("cta_click", { cta: "browse_season", location: "quests" })}
      className={`${TEXT_LINK} text-sm`}
    >
      Browse all of {season.label} →
    </Link>
  ) : (
    <Link
      href="/anime"
      onClick={() => trackLanding("cta_click", { cta: "browse_season", location: "quests" })}
      className={`${TEXT_LINK} text-sm`}
    >
      Browse this season →
    </Link>
  );

  return (
    <QuestRow n={1} done={done} state={state}>
      <div
        aria-hidden="true"
        className="-mt-1 mb-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-[#95ccff] transition-[width] duration-500"
          style={{ width: `${(progress / QUEST_TARGET) * 100}%` }}
        />
      </div>
      {season && airingIds.length > 0 && (onListAtLoad === null || cards.length > 0) && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {onListAtLoad === null
            ? Array.from({ length: Math.min(4, airingIds.length) }, (_, index) => (
                <li key={index} aria-hidden="true">
                  <CardPlaceholder />
                </li>
              ))
            : cards.map((item) => (
                <li key={item.id}>
                  <EpisodeCard
                    media={item}
                    variant="compact"
                    location="quests"
                    continuing={isContinuing(item.id)}
                  />
                </li>
              ))}
        </ul>
      )}
      <p className="mt-3">{browse}</p>
    </QuestRow>
  );
}

function CardPlaceholder() {
  return (
    <div className="overflow-hidden rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)]">
      <div className="aspect-[2/3] bg-white/5 animate-pulse" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-8 rounded bg-white/5" />
        <div className="h-9 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

function ScheduleQuest({ userId, done }: { userId: string; done: boolean }) {
  return (
    <QuestRow
      n={2}
      done={done}
      state={done ? "Done" : "To do"}
      action={
        <Link
          href={airingSchedulePath(userId)}
          prefetch={false}
          onClick={() => {
            markQuest(userId, "schedule");
            trackLanding("cta_click", { cta: "airing_schedule", location: "quests" });
          }}
          className={done ? GHOST_BUTTON : PRIMARY_BUTTON}
        >
          Open schedule
        </Link>
      }
    />
  );
}

const subscribeNothing = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "https://kylevb.com";

function ShareQuest({ userId, done }: { userId: string; done: boolean }) {
  const origin = useSyncExternalStore(subscribeNothing, getOrigin, getServerOrigin);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = `${origin}${myListPath(userId)}`;

  const copy = async () => {
    const href = new URL(myListPath(userId), window.location.origin).href;
    try {
      await navigator.clipboard.writeText(href);
      toast.success("Link copied");
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      toast.error("Couldn't copy. Select the link and copy it.");
    }
    markQuest(userId, "share");
    trackLanding("cta_click", { cta: "copy_list_link", location: "quests" });
  };

  return (
    <QuestRow
      n={3}
      done={done}
      state={done ? "Done" : "To do"}
      action={
        <button
          type="button"
          onClick={copy}
          aria-label="Copy my list link"
          className={done ? GHOST_BUTTON : PRIMARY_BUTTON}
        >
          Copy my list link
        </button>
      }
    >
      <input
        ref={inputRef}
        readOnly
        value={url}
        aria-label="Your list link"
        onFocus={(event) => event.currentTarget.select()}
        className="h-9 w-full truncate rounded-lg border border-dashed border-[#95ccff]/30 bg-[rgb(18,18,18)] px-3 font-mono text-xs text-[#cfe8ff] focus:border-[#95ccff] focus:outline-none"
      />
      <p className="mt-2 text-xs text-[rgb(164,164,164)]">
        Anyone with the link can look; only you can edit. Private lists aren&apos;t available yet.
      </p>
    </QuestRow>
  );
}

function ClearedPanel({ userId }: { userId: string }) {
  const { season } = useLanding();
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
      <p className="text-[rgb(200,206,218)]">
        Countdowns, progress and your weekly schedule are all waiting on your list.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={myListPath(userId)}
          prefetch={false}
          onClick={() => trackLanding("cta_click", { cta: "open_my_list", location: "quests" })}
          className={PRIMARY_BUTTON}
        >
          Open My List
        </Link>
        <Link
          href={airingSchedulePath(userId)}
          prefetch={false}
          onClick={() => trackLanding("cta_click", { cta: "airing_schedule", location: "quests" })}
          className={GHOST_BUTTON}
        >
          Airing Schedule
        </Link>
        <Link
          href={season?.browseHref ?? "/anime"}
          onClick={() => trackLanding("cta_click", { cta: "browse_season", location: "quests" })}
          className={GHOST_BUTTON}
        >
          {season?.browseLabel ?? "Browse this season"}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Returning from the sign-in intent dialog: /?add={id}&as={status}#quests
// ---------------------------------------------------------------------------

/** Ids already handled this page lifetime (Strict Mode, re-renders, remounts). */
const handledIntents = new Set<number>();

/** The "Add {title} to your list?" prompt for a bare ?add= link (no stored intent). */
type AddPrompt = { id: number; status?: ListStatus; title: string } | null;
let addPrompt: AddPrompt = null;
const promptListeners = new Set<() => void>();
function setAddPrompt(next: AddPrompt) {
  addPrompt = next;
  promptListeners.forEach((notify) => notify());
}
const subscribePrompt = (listener: () => void) => {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
};
const getPrompt = () => addPrompt;
const getServerPrompt = (): AddPrompt => null;

const parseAddParam = (value: string | null): number | null => {
  if (!value || !/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
};

const cleanUrl = () => window.history.replaceState(null, "", "/#quests");

/**
 * Finishes a signed-out "+ Add" after OAuth. Auto-adds only when the URL's id
 * matches a sessionStorage intent under 15 minutes old (written by a click
 * on this origin); a bare link only asks, and ids the page doesn't know are
 * ignored. The intent is consumed before the add, so a reload can't repeat it.
 */
function AddIntentHandler({
  announce,
  headingRef,
}: {
  announce: (message: StatusMessage) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const params = useSearchParams();
  const addId = parseAddParam(params.get("add"));
  const asParam = params.get("as");
  // Only the status the landing itself generates (Tempest "+ Plan to Watch"):
  // a shared link must not be able to file a show under Dropped or Completed.
  const urlStatus: ListStatus | undefined = asParam === "planning" ? "planning" : undefined;
  const { media } = useLanding();
  const { signedIn, loaded, add, isInList } = useMyList();
  const prompt = useSyncExternalStore(subscribePrompt, getPrompt, getServerPrompt);

  useEffect(() => {
    if (addId === null || !signedIn || !loaded || handledIntents.has(addId)) return;
    handledIntents.add(addId);

    // NextAuth normally keeps the fragment; if it was dropped, bring the log into view.
    if (window.location.hash !== "#quests") {
      document.getElementById("quests")?.scrollIntoView({ block: "start" });
    }

    let intent = null;
    try {
      intent = parseAddIntent(window.sessionStorage.getItem(ADD_INTENT_KEY), addId, Date.now());
    } catch {
      intent = null;
    }
    const known = media(addId);

    if (!intent) {
      // A bare link (or an expired intent) only asks, and only about shows on
      // this page that aren't on the list yet.
      if (known && !isInList(addId)) {
        setAddPrompt({ id: addId, status: urlStatus, title: displayTitle(known) });
      }
      return;
    }

    try {
      window.sessionStorage.removeItem(ADD_INTENT_KEY);
    } catch {
      // The handled set still prevents a second add in this page view.
    }
    cleanUrl();
    const snapshot: AnimeMedia = known ?? intent.media;
    const title = displayTitle(snapshot);
    if (isInList(addId)) {
      trackLanding("intent_resume", { ok: true });
      announce({ kind: "Notice", text: `${title} was already on your list.` });
      return;
    }
    void add(snapshot, intent.status).then((ok) => {
      trackLanding("intent_resume", { ok });
      announce(
        ok
          ? { kind: "Notice", text: `Predator successful. ${title} is on your list.` }
          : { kind: "Report", text: `${title} couldn't be added. Try its + button again.` }
      );
    });
  }, [addId, urlStatus, signedIn, loaded, media, add, isInList, announce]);

  if (!prompt || prompt.id !== addId) return null;

  const finish = () => {
    setAddPrompt(null);
    cleanUrl();
    headingRef.current?.focus();
  };
  const accept = async () => {
    const target = media(prompt.id);
    const { status, title } = prompt;
    finish();
    if (!target) return;
    const ok = await add(target, status);
    if (ok) trackLanding("list_add", { location: "quests", status: status ?? "watching" });
    announce(
      ok
        ? { kind: "Notice", text: `Predator successful. ${title} is on your list.` }
        : { kind: "Report", text: `${title} couldn't be added. Try its + button again.` }
    );
  };

  return (
    <div className="mt-4 rounded-xl border border-[#95ccff]/30 bg-[#0a1528]/80 p-4">
      <p className="text-[#e6f3ff]">
        <SageTag kind="Question" />
        Add {prompt.title} to your list
        {prompt.status ? ` as ${LIST_STATUS_LABELS[prompt.status]}` : ""}?
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={accept}
          aria-label={`Add ${prompt.title} to your list`}
          className={PRIMARY_BUTTON}
        >
          Add it
        </button>
        <button
          type="button"
          onClick={finish}
          aria-label={`Don't add ${prompt.title}`}
          className={GHOST_BUTTON}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
