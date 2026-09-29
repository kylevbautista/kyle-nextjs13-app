import { track } from "@vercel/analytics";
import type { ListStatus } from "@/lib/anime/types";

/**
 * Typed Vercel Analytics events for the landing page. At most 2 flat
 * properties per event (Vercel's limit), never search text or user data.
 * Call from event handlers and effects only.
 */

export type LandingLocation =
  | "hero"
  | "hero_next_up"
  | "airing_next"
  | "tracker"
  | "schedule"
  | "sage_search"
  | "tempest"
  | "faq"
  | "quests"
  | "sticky"
  | "dialog";

export type LandingCta =
  | "open_my_list"
  | "add_first_shows"
  | "browse_season"
  | "airing_schedule"
  | "top_anime"
  | "search"
  | "copy_list_link";

export type FaqQuestion = "free" | "google" | "visibility" | "countdowns" | "import" | "phone";

export interface LandingEvents {
  /** Every non-sign-in CTA. */
  cta_click: { cta: LandingCta; location: LandingLocation };
  /** Right before signIn('google') from a landing CTA or the intent dialog. */
  signin_start: { location: LandingLocation; source: "cta" | "add_intent" };
  /** A signed-out add button opened the sign-in intent dialog. */
  signin_intent_open: { location: LandingLocation };
  /** The add-intent auto-add after returning from OAuth. */
  intent_resume: { ok: boolean };
  /** A successful add through LandingAddButton. */
  list_add: { location: LandingLocation; status: ListStatus };
  /** Tracker demo, once per action per page view. */
  demo_action: { action: "plus_one" | "complete" | "status" | "score" | "reset" };
  search_submit: { location: "sage_search" };
  search_chip: { chip: string };
  /** Once per page view. */
  slime_poke: Record<string, never>;
  /** Once per quest per page view. */
  quest_complete: { quest: 1 | 2 | 3 };
  /** Once per question per page view. */
  faq_open: { q: FaqQuestion };
  /** The viewer's tier rose during the page view. */
  evolution: { tier: "named" | "demon" | "lord" };
  /** The Pause/Resume live timers toggle. */
  live_timers: { on: boolean };
}

export type LandingEvent = keyof LandingEvents;

/** Events without properties may omit them. */
type PropsArg<E extends LandingEvent> = Record<never, never> extends LandingEvents[E]
  ? [props?: LandingEvents[E]]
  : [props: LandingEvents[E]];

export function trackLanding<E extends LandingEvent>(event: E, ...[props]: PropsArg<E>): void {
  try {
    track(event, props ?? {});
  } catch {
    // Analytics must never break the page.
  }
}

/** Keys already sent during this page view. */
const sentOnce = new Set<string>();

/**
 * trackLanding, at most once per page view per key. With no explicit key,
 * the key is the event plus its properties (so faq_open fires once per
 * question, quest_complete once per quest, and so on).
 */
export function trackOnce<E extends LandingEvent>(event: E, ...rest: PropsArg<E>): void;
export function trackOnce<E extends LandingEvent>(key: string, event: E, ...rest: PropsArg<E>): void;
export function trackOnce(...args: unknown[]): void {
  const explicitKey = typeof args[1] === "string";
  const event = (explicitKey ? args[1] : args[0]) as LandingEvent;
  const props = (explicitKey ? args[2] : args[1]) as Record<string, unknown> | undefined;
  const key = explicitKey ? String(args[0]) : `${event}:${JSON.stringify(props ?? {})}`;
  if (sentOnce.has(key)) return;
  sentOnce.add(key);
  try {
    track(event, (props ?? {}) as Parameters<typeof track>[1]);
  } catch {
    // Analytics must never break the page.
  }
}
