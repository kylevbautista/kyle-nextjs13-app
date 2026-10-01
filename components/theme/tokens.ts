/**
 * The "Tempest" theme's shared class strings: the landing's design language
 * (night sky, Great Sage console, slime) as reusable Tailwind tokens. Every
 * redesigned page builds from these; the guide is
 * .claude/skills/tempest-theme/SKILL.md.
 *
 * Plain strings, no "use client": server and client components can use them.
 * Tailwind sees them because components/ is in tailwind.config.js `content`.
 */

/* ------------------------------------------------------------------------- */
/* Focus                                                                       */

/** The page-wide focus ring (on the page background). */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(18,18,18)]";
/** The same ring on a card or panel surface (rgb 30). */
export const FOCUS_RING_PANEL =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(30,30,30)]";
/** Inset ring, for tabs and controls flush against a panel edge. */
export const FOCUS_RING_INSET =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#95ccff]";

/* ------------------------------------------------------------------------- */
/* Layout                                                                      */

/** Landing chapters (hero, Tempest and #quests are full-bleed). */
// contain:inline-size: a section's content never widens the page (the body is a
// grid with an auto column, so any min-content overflow would scroll sideways).
export const CHAPTER_CLASS =
  "relative isolate mx-auto max-w-6xl scroll-mt-20 px-4 py-20 [contain:inline-size] sm:px-6 sm:py-28";
/** App pages (lists, schedules): the content column under a PageBanner. */
export const APP_CONTAINER = "mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6";

/* ------------------------------------------------------------------------- */
/* Type                                                                        */

/** "Skill 01 · Magic Sense" */
export const EYEBROW_CLASS = "font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#95ccff]";
/** Chapter h2. */
export const CHAPTER_TITLE_CLASS =
  "text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl laptop:text-[2.75rem]";
/** Chapter subhead. */
export const CHAPTER_SUB_CLASS = "text-base leading-7 text-[#c9d6e6] sm:text-lg";
/** App-page h1: the hero's moonlit gradient (`.hero-title` adds a solid fallback). */
export const PAGE_TITLE_CLASS =
  "hero-title bg-gradient-to-b from-white to-[#cfe8ff] bg-clip-text pb-1 text-3xl font-black leading-[1.08] tracking-tight text-transparent sm:text-4xl laptop:text-5xl";
/** Small uppercase field/fact label ("Status", "Score", "Sort by"). */
export const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wider text-[rgb(164,164,164)]";
/** Section heading inside an app page ("Watching 6 ———"). */
export const SECTION_TITLE_CLASS = "flex items-center gap-3 text-lg font-bold text-white";
/** Muted body text. */
export const MUTED_TEXT = "text-[rgb(164,164,164)]";
/** Secondary body text (a step brighter than muted). */
export const SOFT_TEXT = "text-[rgb(200,206,218)]";

/* ------------------------------------------------------------------------- */
/* Surfaces                                                                    */

/** Shared console styling (also used by bubbles and panels that mimic it). */
export const SAGE_FRAME =
  "rounded-md border border-[#95ccff]/30 bg-[#0a1528]/70 font-mono text-[#cfe8ff] shadow-[0_0_24px_-8px_rgba(149,204,255,.5)]";
/** The standard content panel (schedule panel, list controls, dialogs). */
export const PANEL =
  "rounded-2xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] shadow-[0_24px_60px_-30px_rgba(93,174,241,.35)]";
/** A Great Sage console panel (Evolution card, stats, search console). */
export const CONSOLE_PANEL = "rounded-2xl border border-[#95ccff]/25 bg-[#0a1428]/80";
/** Cards in a grid: lift and glow in the cover's color (set --card-glow). */
export const CARD =
  "rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#95ccff]/40 hover:shadow-[0_10px_30px_-12px_var(--card-glow)] focus-within:-translate-y-0.5 focus-within:border-[#95ccff]/40 focus-within:shadow-[0_10px_30px_-12px_var(--card-glow)]";
/** Dashed "nothing here" / "Report" box. */
export const EMPTY_PANEL = "rounded-2xl border border-dashed border-[#95ccff]/25 bg-[rgb(30,30,30)]/60";

/* ------------------------------------------------------------------------- */
/* Controls                                                                    */

const PRIMARY_BASE =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(149,204,255,.35),0_10px_40px_-10px_rgba(59,130,246,.8)] transition-colors hover:bg-blue-500 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";
const GHOST_BASE =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#95ccff]/40 bg-white/5 px-4 text-sm font-semibold text-[#e6f3ff] transition-colors hover:bg-white/10 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

/** The one primary action per view (blue, with the moonlit glow). */
export const PRIMARY_BUTTON = `${PRIMARY_BASE} ${FOCUS_RING}`;
/** Secondary actions next to a primary one. */
export const GHOST_BUTTON = `${GHOST_BASE} ${FOCUS_RING}`;
/** The same two on a panel or dialog surface (rgb 30). */
export const PRIMARY_BUTTON_PANEL = `${PRIMARY_BASE} ${FOCUS_RING_PANEL}`;
export const GHOST_BUTTON_PANEL = `${GHOST_BASE} ${FOCUS_RING_PANEL}`;
/** Quiet text button ("Pause live timers", "Clear filters"). */
export const QUIET_BUTTON = `inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[rgb(200,206,218)] transition-colors hover:bg-white/5 hover:text-white ${FOCUS_RING}`;
/** Inline link in body copy. */
export const TEXT_LINK = `rounded text-[#95ccff] underline-offset-2 hover:text-white hover:underline ${FOCUS_RING}`;
/** Text input / select on a panel (rgb 30) or the page. */
export const FIELD =
  "h-11 w-full min-w-0 rounded-xl border border-[rgb(53,53,53)] bg-[rgb(18,18,18)] px-3 text-base text-white [color-scheme:dark] placeholder:text-[rgb(130,140,160)] focus:border-[#95ccff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]/40 aria-[invalid=true]:border-rose-400 md:h-10 md:text-sm";
/** A toggle chip (shelves, filters): pair with SHELF_ON / SHELF_OFF. */
export const SHELF =
  "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[rgb(53,53,53)] px-3 text-sm transition-colors md:h-9";
export const SHELF_ON = "bg-blue-600/20 font-semibold text-white ring-1 ring-blue-400/40";
export const SHELF_OFF = "text-[rgb(164,164,164)] hover:bg-white/5 hover:text-white";

/* ------------------------------------------------------------------------- */
/* Decor                                                                       */

/** Horizontal glow divider between chapters. */
export const HAIRLINE = "h-px bg-gradient-to-r from-transparent via-[#95ccff]/30 to-transparent";
/** Faint weekday tints (Mon…Sun) along a schedule panel's top edge. */
export const DAY_TINTS = ["#95ccff", "#a5b4fc", "#c4b5fd", "#f0abfc", "#fda4af", "#fcd34d", "#86efac"];
