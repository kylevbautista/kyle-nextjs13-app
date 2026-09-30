"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { LIST_STATUS_LABELS, displayTitle } from "@/lib/anime/types";
import type { AnimeMedia, ListStatus } from "@/lib/anime/types";
import {
  ADD_INTENT_KEY,
  addIntentCallbackUrl,
  serializeAddIntent,
  visibleAiring,
  type LandingClientData,
  type LandingSeasonMeta,
} from "@/lib/landing";
import { trackLanding, type LandingLocation } from "./analytics";
import { SageLine } from "./SageLine";
import Slime from "./Slime";

/**
 * The landing's client-side hub: media lookup by id (the server sends every
 * addable show once), the visible-airing selection shared by the hero, the
 * Magic Sense grid and the quests, and the one sign-in intent dialog.
 */

export interface SignInIntentRequest {
  id: number;
  status?: ListStatus;
  location: LandingLocation;
  /** Focus returns here when the dialog closes. */
  trigger: HTMLElement | null;
}

export interface LandingContextValue {
  media(id: number): AnimeMedia | null;
  isContinuing(id: number): boolean;
  /** When the server fetched the season (epoch ms): the SSR/hydration "now". */
  generatedAt: number;
  season: LandingSeasonMeta | null;
  openSignInIntent(request: SignInIntentRequest): void;
}

const LandingContext = createContext<LandingContextValue | null>(null);

export function useLanding(): LandingContextValue {
  const value = useContext(LandingContext);
  if (!value) throw new Error("useLanding() must be used inside <LandingProvider>");
  return value;
}

// A coarse clock for "has this episode aired yet": candidates only drop out
// 30 min after air time, so a 30 s tick is plenty and the islands using it
// don't re-render every second (countdown text has its own 1 s clock).
// Null during SSR and hydration, like useNow().
const CLOCK_INTERVAL_MS = 30_000;
let clockNow = 0;
let clockTimer: ReturnType<typeof setInterval> | undefined;
const clockListeners = new Set<() => void>();

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (!clockTimer) {
    clockNow = Date.now();
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((notify) => notify());
    }, CLOCK_INTERVAL_MS);
  }
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}
const getClock = () => clockNow || null;
const getServerClock = () => null;

/**
 * The first `count` of `ids` (in order) that haven't aired more than 30 min
 * ago, skipping `exclude`d ids. Uses the server's fetch time until hydrated,
 * so SSR and hydration render the same rows; later rows backfill in place.
 */
export function useVisibleAiring(
  ids: number[],
  count: number,
  exclude?: (id: number) => boolean
): AnimeMedia[] {
  const { media, generatedAt } = useLanding();
  const now = useSyncExternalStore(subscribeClock, getClock, getServerClock) ?? generatedAt;
  return useMemo(() => {
    const candidates = ids
      .map((id) => media(id))
      .filter((item): item is AnimeMedia => item !== null);
    return visibleAiring(candidates, now, count, exclude);
  }, [ids, media, now, count, exclude]);
}

interface OpenIntent {
  id: number;
  status?: ListStatus;
  location: LandingLocation;
}

export default function LandingProvider({
  value,
  children,
}: {
  value: LandingClientData;
  children: ReactNode;
}) {
  const { generatedAt, season, mediaById, continuingIds } = value;
  const [intent, setIntent] = useState<OpenIntent | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const media = useCallback((id: number): AnimeMedia | null => mediaById[id] ?? null, [mediaById]);
  const continuing = useMemo(() => new Set(continuingIds), [continuingIds]);
  const isContinuing = useCallback((id: number) => continuing.has(id), [continuing]);

  const openSignInIntent = useCallback(
    ({ id, status, location, trigger }: SignInIntentRequest) => {
      if (!mediaById[id]) return;
      triggerRef.current = trigger;
      setIntent({ id, status, location });
      trackLanding("signin_intent_open", { location });
    },
    [mediaById]
  );

  const closeIntent = useCallback(() => setIntent(null), []);

  const context = useMemo<LandingContextValue>(
    () => ({ media, isContinuing, generatedAt, season, openSignInIntent }),
    [media, isContinuing, generatedAt, season, openSignInIntent]
  );

  return (
    <LandingContext.Provider value={context}>
      {children}
      <SignInIntentDialog
        intent={intent}
        media={intent ? (mediaById[intent.id] ?? null) : null}
        triggerRef={triggerRef}
        onClosed={closeIntent}
      />
    </LandingContext.Provider>
  );
}

const DIALOG_BUTTON =
  "flex h-12 w-full items-center justify-center gap-3 rounded-xl px-4 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(30,30,30)]";

/**
 * "Sign in to add {title}": one native modal <dialog> for the whole page
 * (focus trap, Escape and inert background come from the browser). Continue
 * stores the intent in sessionStorage and goes straight to Google; the Quest
 * Log finishes the add on return (see QuestLog's AddIntentHandler).
 */
function SignInIntentDialog({
  intent,
  media,
  triggerRef,
  onClosed,
}: {
  intent: OpenIntent | null;
  media: AnimeMedia | null;
  triggerRef: RefObject<HTMLElement | null>;
  onClosed: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const titleId = useId();
  const bodyId = useId();

  // Open once the new intent has rendered, with focus on "Continue with Google".
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!intent || !dialog) return;
    if (!dialog.open) dialog.showModal();
    continueRef.current?.focus();
  }, [intent]);

  // Back from Google via the bfcache: the page comes back with "Opening Google…".
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Escape, "Not now" and backdrop clicks all end up here (the dialog's close event).
  const handleClose = () => {
    setPending(false);
    onClosed();
    const trigger = triggerRef.current;
    if (trigger?.isConnected) trigger.focus();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    // The content wrapper fills the dialog, so only a backdrop click targets it.
    if (event.target === event.currentTarget) event.currentTarget.close();
  };

  const handleContinue = async () => {
    if (!intent || !media || pending) return;
    try {
      window.sessionStorage.setItem(
        ADD_INTENT_KEY,
        serializeAddIntent({ id: intent.id, status: intent.status, at: Date.now(), media })
      );
    } catch {
      // Storage blocked: the return still lands on the Quest Log, it just can't auto-add.
    }
    trackLanding("signin_start", { location: intent.location, source: "add_intent" });
    setPending(true);
    try {
      await signIn("google", { callbackUrl: addIntentCallbackUrl(intent.id, intent.status) });
    } catch {
      setPending(false);
    }
  };

  const title = media ? displayTitle(media) : "";
  const coverUrl = media?.coverImage.medium ?? media?.coverImage.large ?? null;
  const statusNote = intent?.status ? `, as ${LIST_STATUS_LABELS[intent.status]}` : "";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={handleClose}
      onClick={handleBackdropClick}
      className="w-[min(92vw,400px)] max-w-none rounded-2xl border border-[#95ccff]/25 bg-[rgb(30,30,30)] p-0 text-white shadow-2xl shadow-black/60 backdrop:bg-black/60 open:animate-[grow_150ms_ease-out,fadeOut_150ms_ease-out]"
    >
      {intent && media && (
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-end gap-3">
            <Slime size={64} mood="happy" />
            <div
              className="relative h-[68px] w-12 shrink-0 overflow-hidden rounded-md bg-[rgb(53,53,53)]"
              style={media.coverImage.color ? { backgroundColor: media.coverImage.color } : undefined}
            >
              {coverUrl && (
                <Image src={coverUrl} alt="" width={48} height={68} className="h-full w-full object-cover" />
              )}
            </div>
          </div>
          <SageLine kind="Answer" size="sm">
            Predator needs a Name.
          </SageLine>
          <div className="flex flex-col gap-2">
            <h2 id={titleId} className="text-xl font-bold leading-snug">
              Sign in to add {title}
            </h2>
            <p id={bodyId} className="text-sm leading-6 text-[rgb(200,206,218)]">
              One tap with Google and it&apos;ll be on your list when you get back{statusNote},
              countdown and all.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              ref={continueRef}
              type="button"
              onClick={handleContinue}
              aria-disabled={pending || undefined}
              className={`${DIALOG_BUTTON} bg-white text-[rgb(30,30,30)] hover:bg-gray-200 aria-disabled:cursor-wait aria-disabled:opacity-70`}
            >
              <GoogleIcon />
              {pending ? "Opening Google…" : "Continue with Google"}
            </button>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={`${DIALOG_BUTTON} text-[#95ccff] hover:bg-white/5`}
            >
              Not now
            </button>
          </div>
          <p className="text-center text-xs text-[rgb(164,164,164)]">
            Free · No ads · Your email is never shown
          </p>
        </div>
      )}
    </dialog>
  );
}
