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
/** The ring on a Great Sage console surface (#0a1528): the search console, its chips and doorways. */
export const FOCUS_RING_CONSOLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1528]";

/* ------------------------------------------------------------------------- */
/* Layout                                                                      */

/** Landing chapters (hero, Tempest and #quests are full-bleed). */
// contain:inline-size: a section's content never widens the page (the body is a
// grid with an auto column, so any min-content overflow would scroll sideways).
export const CHAPTER_CLASS =
  "relative isolate mx-auto max-w-6xl scroll-mt-20 px-4 py-20 [contain:inline-size] sm:px-6 sm:py-28";
/** App pages (lists, schedules): the content column under a PageBanner. */
export const APP_CONTAINER = "mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6";
/** The poster card grid (AnimeCard): an <ol> of card <li>s, 2 → 5 columns. */
export const ANIME_GRID = "grid min-w-0 list-none grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5";
/** Poster covers on the season grid and /search (ANIME_GRID in APP_CONTAINER): 5 × 234px from 1280, then 4 / 3 / 2 columns. */
export const SEASON_COVER_SIZES =
  "(min-width: 1280px) 234px, (min-width: 1024px) calc(25vw - 24px), (min-width: 640px) calc(33.33vw - 27px), calc(50vw - 22px)";
/** Poster covers on the landing's Magic Sense grid (4 columns from 640px, 2 below). */
export const LANDING_GRID_SIZES = "(min-width: 1152px) 262px, (min-width: 640px) 23vw, 46vw";

/* ------------------------------------------------------------------------- */
/* Classic anime card (AnimeInfoCard + its skeleton; the CSS half is the      */
/* "Classic anime card" section of styles/globals.css). Plain strings here,   */
/* never in the "use client" card file: the server-rendered /search pending   */
/* skeleton uses them too.                                                     */

/** Classic card grid (season page, /search): 1 → 2 (640) → 3 (1280) columns. */
export const INFO_GRID = "grid min-w-0 list-none grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";
/** Fixed-px covers: one sizes string for the season page, /search and the landing. */
export const INFO_COVER_SIZES = "(min-width: 820px) 175px, 135px";
export const INFO_SHELL = "relative isolate flex w-full min-w-0 flex-col overflow-hidden rounded-2xl";
/** Not positioned: the title's full-card tap target must reach the article. */
export const INFO_HEADER = "shrink-0 px-3 pb-2.5 pt-2.5 text-center";
/** The title box with a genre row under it… */
export const INFO_TITLE_BOX = "flex h-10 items-center justify-center";
/** …and without one (40 + 6 + 20): every header is 86px. */
export const INFO_TITLE_BOX_SOLO = "flex h-[66px] items-center justify-center";
export const INFO_CHIPS = "mt-1.5 flex h-5 flex-wrap justify-center gap-1 overflow-hidden";
export const INFO_HAIRLINE = "mx-4 h-px shrink-0";
export const INFO_BODY = "flex h-[201px] min-w-0 shrink-0 tablet:h-[250px]";
export const INFO_COVER = "relative w-[135px] shrink-0 overflow-hidden bg-[rgb(38,38,38)] tablet:w-[175px]";
export const INFO_FOOTER = "flex h-14 min-w-0 shrink-0 items-center gap-2 px-2.5 md:h-12";
export const INFO_ACTION_BOX = "min-w-0 max-w-[11rem] flex-1";
export const INFO_LINK_BOX = "h-11 w-11 md:h-9 md:w-9";
/** The Magic Sense HUD's mono label line (CountdownText mode="hud" and the card's status HUD). */
export const HUD_LABEL_CLASS =
  "font-mono text-[10px] font-semibold uppercase leading-3 tracking-[0.14em] text-[color:var(--hud-label,#95ccff)]";

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
/** The framed Great Sage console (the landing's search chapter, the /search home): ConsoleFrame. */
export const SAGE_CONSOLE =
  "relative overflow-hidden rounded-2xl border border-[#95ccff]/30 bg-[#0a1528]/80 shadow-[inset_0_0_60px_-20px_rgba(149,204,255,.35),0_30px_80px_-40px_rgba(93,174,241,.45)]";
/** CRT scanlines over a console (aria-hidden decor). */
export const SCANLINES =
  "pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.04)_0_1px,transparent_1px_3px)]";
/** Cards in a grid: lift and glow in the cover's color (set --card-glow). */
export const CARD =
  "rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#95ccff]/40 hover:shadow-[0_10px_30px_-12px_var(--card-glow)] focus-within:-translate-y-0.5 focus-within:border-[#95ccff]/40 focus-within:shadow-[0_10px_30px_-12px_var(--card-glow)]";
/** Dashed "nothing here" / "Report" box. */
export const EMPTY_PANEL = "rounded-2xl border border-dashed border-[#95ccff]/25 bg-[rgb(30,30,30)]/60";

/* ------------------------------------------------------------------------- */
/* Controls                                                                    */

// border-transparent: invisible normally, the button's edge in forced-colors mode (which drops
// backgrounds and shadows).
const PRIMARY_BASE =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(149,204,255,.35),0_10px_40px_-10px_rgba(59,130,246,.8)] transition-colors hover:bg-blue-500 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";
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
/** A console doorway's link ("See the rankings →", "Browse this season →"); full width below 400px. */
export const DOORWAY_LINK = `inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#95ccff]/40 bg-white/5 px-4 text-sm font-semibold text-[#e6f3ff] transition-colors hover:bg-white/10 max-[399px]:w-full ${FOCUS_RING_CONSOLE}`;
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
/* Tracker card (My List's ListCard and the landing's TrackerDemo)             */

/**
 * The +1 box (My List's PlusOneButton; the landing demo's +1 uses it too). Every state has a real
 * 1px border, so forced colors keeps the edge (a ring is a box-shadow and vanishes there).
 */
export const PLUS_ONE = `relative inline-flex h-11 w-16 shrink-0 touch-manipulation items-center justify-center rounded-lg border text-sm font-bold transition-colors md:h-10 ${FOCUS_RING_PANEL}`;
/** "+1": log the next episode. */
export const PLUS_ONE_READY = "border-transparent bg-blue-600 text-white hover:bg-blue-500";
/**
 * Caught up with what has aired: a dashed sage box (the site's "not yet", like the unknown-total
 * bar) around a clock, so it differs from ✓ by shape and glyph, not hue alone.
 */
export const PLUS_ONE_CAPPED =
  "cursor-default border-dashed border-[#95ccff]/60 bg-transparent text-[#95ccff] forced-colors:border-[color:GrayText] forced-colors:text-[color:GrayText]";
/** ✓: every episode watched. */
export const PLUS_ONE_DONE =
  "cursor-default border-emerald-400/40 bg-emerald-500/15 text-emerald-300 forced-colors:border-[color:GrayText] forced-colors:text-[color:GrayText]";
/** +1 while a save is in flight: a small aria-hidden dot (the button is never disabled or pulsing). */
export const PLUS_ONE_SAVING_DOT =
  "pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/90 animate-dot-flow forced-colors:bg-[color:CanvasText]";
/**
 * The owner's "Log N new" chip: the sage chip with a border (its edge in forced colors), 20px tall so
 * the row keeps its height, with a 44px hit area (32px from md: the ::after insets count from inside
 * the 1px border, hence 13px / 7px). z-[1]: the positioned bar track below would otherwise paint over
 * (and catch) the hit area's lower part.
 */
export const CATCH_UP_CHIP = `relative z-[1] inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border border-[#95ccff]/50 bg-[#95ccff]/10 px-2 text-[11px] font-semibold leading-none tabular-nums text-[#cfe8ff] transition-colors after:absolute after:-inset-x-[5px] after:-inset-y-[13px] after:content-[''] hover:bg-[linear-gradient(180deg,rgba(93,174,241,.34),rgba(42,127,212,.20))] hover:text-white md:after:-inset-y-[7px] ${FOCUS_RING_PANEL}`;
/** Undo on a tracker card (in place of the date · score line): console navy, Edit's height. */
export const UNDO_BUTTON = `relative inline-flex h-11 shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-lg border border-[#95ccff]/40 bg-[#0a1528] px-3 text-xs font-semibold text-[#e6f3ff] transition-colors animate-fade-in hover:bg-[#0e1d33] aria-disabled:cursor-default md:h-9 ${FOCUS_RING_PANEL}`;
/** Undo's time left: a 2px line that drains over 10 s (UNDO_MS); paused with data-paused. */
export const UNDO_DRAIN =
  "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#95ccff]/80 animate-undo-drain data-[paused]:[animation-play-state:paused] forced-colors:bg-[color:CanvasText]";
/** One sheen across the progress bar when a tap completes the show (parked off the bar before and after). */
export const BAR_SHEEN =
  "pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[130%] bg-gradient-to-r from-transparent via-white/50 to-transparent animate-sheen [animation-fill-mode:both]";

/* ------------------------------------------------------------------------- */
/* Decor                                                                       */

/** Horizontal glow divider between chapters. */
export const HAIRLINE = "h-px bg-gradient-to-r from-transparent via-[#95ccff]/30 to-transparent";
/** Faint weekday tints (Mon…Sun) along a schedule panel's top edge. */
export const DAY_TINTS = ["#95ccff", "#a5b4fc", "#c4b5fd", "#f0abfc", "#fda4af", "#fcd34d", "#86efac"];

/* ------------------------------------------------------------------------- */
/* Card pages: the 404, the error page, sign-in and account (CardPage). The    */
/* owner's centered card, themed: a Great Sage console (ConsoleFrame) on the   */
/* night sky. Server pages and app/error.tsx render these, so they live here   */
/* (CLAUDE.md §9.21).                                                          */
/*                                                                             */
/* The <main> is the body grid's 1fr row. -mt-2 cancels the nav's mb-2 (see    */
/* NAV_BAR's box comment); -mb-8 cancels FOOTER's mt-8, so the sky runs from   */
/* the nav to the footer's horizon. Change them together. Top-anchored, never  */
/* vertically centered: sign-in's ?error= box arrives after hydration, and a   */
/* centered card would move as a whole (slime and h1 included).                */

/**
 * The stage (CardPage renders it with data-card-page). It paints the sky's gradient itself
 * (NightSky's forest-less sky, down to the horizon's #0e1d33), so the error page is themed before
 * its lazy sky arrives (or if it never does). On these pages the footer's horizon turns the same
 * navy (FOOTER_HORIZON), so the sky runs straight into the footer's treeline with no dark band.
 * Never focusable (§9.15).
 * pt: 32px on phones. From 640 it is 7svh, clamped to 48–136px: the owner's py-16 (64px) on a
 * 900px-tall laptop, ≈83px on a tall tablet, so the card never glues to the nav.
 */
export const CARD_PAGE =
  "relative isolate -mb-8 -mt-2 flex min-w-0 flex-col items-center overflow-hidden bg-[linear-gradient(180deg,#050915_0%,#0a1428_50%,#0e1d33_100%)] px-4 pb-6 pt-8 text-white [contain:inline-size] sm:pb-16 sm:pt-[clamp(3rem,7svh,8.5rem)]";
/** The sky slot's wrapper (NightSky inside). Decor: hidden in forced colors, like FOOTER_HORIZON. */
export const CARD_PAGE_SKY = "pointer-events-none absolute inset-0 -z-10 forced-colors:hidden";
/** The card's column; CardPage adds the owner's width (max-w-md: 404, error; max-w-sm: sign-in, account). */
export const CARD_PAGE_SLOT = "relative w-full";
/** One moonlit glow behind the card (a gradient, never a blur); the stage clips it on phones. */
export const CARD_PAGE_GLOW =
  "pointer-events-none absolute -inset-x-16 -inset-y-12 -z-10 bg-[radial-gradient(closest-side,rgba(93,174,241,.16),rgba(93,174,241,.05)_55%,transparent)]";
/**
 * ConsoleFrame's padding: the owner's p-6 sm:p-8 (it clears the 12px corner brackets). Below 640 the
 * stage's bottom padding is only 24px, so the console's 80px drop shadow (SAGE_CONSOLE) would be cut
 * flat at the footer seam: phones keep its inset glow and a short halo that fades out inside pb-6.
 */
export const CARD_PAGE_FRAME =
  "p-6 sm:p-8 max-sm:shadow-[inset_0_0_60px_-20px_rgba(149,204,255,.35),0_12px_32px_-20px_rgba(93,174,241,.45)]";
/**
 * The card's <section> (the owner's): a centered column; CardPage adds gap-5 (md) / gap-6 (sm), his
 * gaps. group/card: sign-in's server-rendered slime reacts to its island through :has() (SIGN_IN_SLIME_*).
 */
export const CARD_STACK = "group/card flex flex-col items-center text-center";
/** A card's h1: PAGE_TITLE_CLASS's moonlit gradient at card size (.hero-title = the solid fallback; forced colors repaints it). */
export const CARD_TITLE_CLASS =
  "hero-title max-w-full bg-gradient-to-b from-white to-[#cfe8ff] bg-clip-text pb-0.5 text-2xl font-black leading-tight tracking-tight text-transparent [overflow-wrap:anywhere] sm:text-3xl";
/** Body copy with an inline SageTag (SagePanel's sizing). */
export const CARD_TEXT =
  "max-w-full text-sm leading-6 text-[rgb(200,206,218)] [overflow-wrap:anywhere] sm:text-base sm:leading-7";
/** The worried slime perched on the 404's numeral (ERROR_SLIME_BOX is the error page's same box). */
export const STATUS_SLIME = "relative z-10 -mb-1";
/** "404": the owner's sage text-6xl, black weight, a moonlit glow (a text-shadow: forced colors drops it). */
export const STATUS_NUMERAL =
  "text-6xl font-black leading-none tracking-tight text-[#95ccff] [text-shadow:0_0_28px_rgba(149,204,255,.45)]";
/**
 * The error page's table flip (the owner's emblem, nowrap and size, in sage). Render it aria-hidden.
 * Below 320px (a 280px Fold cover leaves a 200px content box) it steps down to text-2xl (≈175px wide),
 * so it never reaches ConsoleFrame's clipped edge whatever the device's fallback glyph widths.
 */
export const STATUS_KAOMOJI = "whitespace-nowrap text-3xl text-[#95ccff] max-[319px]:text-2xl sm:text-4xl";
/**
 * The error page's lazy slime box (64 × 54, reserved so its arrival shifts nothing), perched like
 * STATUS_SLIME. The kaomoji has no flat top (its raised arm runs the full line height), so the slime
 * is lifted 8px (a transform: the card doesn't grow) to sit just clear of the arm.
 */
export const ERROR_SLIME_BOX = "relative z-10 -mb-1 block h-[54px] w-16 -translate-y-2";
/** "Error ID: <digest>": mono, wraps anywhere. */
export const ERROR_ID = "max-w-full font-mono text-xs leading-5 text-[rgb(164,164,164)] [overflow-wrap:anywhere]";
/** A card's button row: the owner's centered wrap (2 + 1 on phones, one row from 640). */
export const CARD_ACTIONS = "flex flex-wrap justify-center gap-3";
/** The two buttons on a Great Sage console (#0a1528): the ring offset matches the console. */
export const PRIMARY_BUTTON_CONSOLE = `${PRIMARY_BASE} ${FOCUS_RING_CONSOLE}`;
export const GHOST_BUTTON_CONSOLE = `${GHOST_BASE} ${FOCUS_RING_CONSOLE}`;
/** A standalone text link on a console with a 44px box ("Go to your account"). */
export const TEXT_LINK_CONSOLE = `inline-flex min-h-11 items-center rounded px-2 text-[#95ccff] underline-offset-2 hover:text-white hover:underline ${FOCUS_RING_CONSOLE}`;
/** Account: the owner's "Your lists" link cards. text-[#95ccff] colors LinkPendingGlyph's arrow; the border is the forced-colors edge. */
export const CARD_LINK = `flex min-h-11 w-full items-center gap-3 rounded-xl border border-[#95ccff]/20 bg-white/[.03] px-4 py-3 text-left text-[#95ccff] transition-colors hover:border-[#95ccff]/50 hover:bg-[#5daef1]/10 ${FOCUS_RING_CONSOLE}`;
export const CARD_LINK_TITLE = "font-semibold text-[#95ccff]";
export const CARD_LINK_TEXT = "text-sm leading-5 text-[rgb(164,164,164)]";
/**
 * Account avatar: the owner's 96px at every width. The initial is always rendered and the photo (if
 * any) covers it, so a broken photo (alt="") shows the initial with no JavaScript.
 */
export const ACCOUNT_AVATAR = "relative h-24 w-24 shrink-0";
/** The nav avatar's "Named" sage ring and glow, at 96px. */
const ACCOUNT_RING = "shadow-[0_0_0_2px_rgba(149,204,255,.5),0_0_28px_-4px_rgba(149,204,255,.6)]";
/**
 * The owner's white initial on blue, as darker slime gel (the theme's slime-600 → slime-800). The
 * highlight sits at the top-left, off the glyph, so the white letter keeps ≥ 3:1 under every stroke
 * without counting its text-shadow (modelled ≈ 3.6:1 at worst, ≈ 4.6:1 at the center; his blue-600
 * was 5.2:1). bg-[#2a7fd4] = the no-gradient fallback (4.1:1). border-transparent = its edge in
 * forced colors (which drops the gel); bg-origin-border spans the gel under it (the default
 * padding-box origin would tile the gradient into the border as flat seams).
 */
export const ACCOUNT_INITIAL = `flex h-full w-full items-center justify-center rounded-full border-2 border-transparent bg-[#2a7fd4] bg-[radial-gradient(circle_at_25%_15%,#7cc4f7,#2a7fd4_26%,#1b4f91)] bg-origin-border text-4xl font-black uppercase text-white [text-shadow:0_1px_2px_rgba(15,36,66,.5)] ${ACCOUNT_RING}`;
export const ACCOUNT_PHOTO = `absolute inset-0 h-full w-full rounded-full object-cover ${ACCOUNT_RING}`;
/** "《Notice》 Signed in as": the account menu's console voice. */
export const ACCOUNT_SIGNED_IN_AS = "font-mono text-xs leading-5 text-[#cfe8ff]";
/**
 * Sign-in's emblem (the owner's 100px image slot): three server-rendered slimes; CSS shows one,
 * picked by what the client island renders (data-slime on its message), so the slime reacts with no
 * client JS and no remount. Browsers without :has() keep the idle one.
 */
export const SIGN_IN_SLIME_BOX = "h-[85px] w-[100px]";
export const SIGN_IN_SLIME_IDLE = "block group-has-[[data-slime]]/card:hidden";
export const SIGN_IN_SLIME_WORRIED = "hidden group-has-[[data-slime=worried]]/card:block";
export const SIGN_IN_SLIME_NAMED = "hidden group-has-[[data-slime=named]]/card:block";
/**
 * The action slot: the static fallback and the client island share this box, so hydration moves
 * nothing. No gap: its first child is the persistent status line, empty in most states.
 */
export const SIGN_IN_ACTIONS = "flex w-full flex-col items-center";
/** The owner's red ?error= box as a rose 《Warning》, and a sage box for the 《Notice》 (SessionRequired). Borders = forced-colors edges. */
export const SIGN_IN_ALERT =
  "mb-4 w-full rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100 [overflow-wrap:anywhere]";
export const SIGN_IN_NOTICE =
  "mb-4 w-full rounded-xl border border-[#95ccff]/30 bg-[#95ccff]/10 px-4 py-3 text-sm leading-6 text-[#e6f3ff] [overflow-wrap:anywhere]";
/**
 * Google's light "Sign in with Google" button (developers.google.com/identity/branding-guidelines,
 * 2026): #FFFFFF fill, 1px #747775 stroke (also its edge in forced colors), #1F1F1F medium 14/20
 * (Google Sans where installed: not downloaded), 12px before the G, 10px after it, pill. 44px = our
 * touch target (Google's 40px, scaled); min-h + py so a huge font wraps instead of clipping.
 */
const GOOGLE_BUTTON_BASE =
  "inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-white px-3 py-[11px] font-['Google_Sans',Roboto,Arial,sans-serif] text-sm font-medium leading-5 text-[#1f1f1f] transition-colors hover:bg-[#f2f2f2] disabled:cursor-wait disabled:opacity-60 aria-disabled:cursor-wait aria-disabled:opacity-60";
/** On a console (the sign-in card). */
export const GOOGLE_BUTTON = `${GOOGLE_BUTTON_BASE} ${FOCUS_RING_CONSOLE}`;
/** On an rgb-30 panel (the landing's "Sign in to add" dialog). */
export const GOOGLE_BUTTON_PANEL = `${GOOGLE_BUTTON_BASE} ${FOCUS_RING_PANEL}`;

/* ------------------------------------------------------------------------- */
/* Site chrome: NavBar, AnimeBar, NavSearch, LogInBox and SiteFooter          */
/* (components/common). NavBar and SiteFooter are server components, so their */
/* classes must live here (CLAUDE.md §9.21); the client parts use them too.   */
/*                                                                             */
/* The nav's BOX is load-bearing and stays the owner's: h-16 + mb-2, sticky    */
/* top-0. PageBanner, Hero, CardPage (CARD_PAGE) and both list skeletons       */
/* cancel mb-2 with -mt-2,                                                     */
/* Hero's laptop min-height is calc(100svh-4rem), every scroll-mt-20 is        */
/* 64 + 16, AboutRanking is lg:top-20. Change them together.                   */
/* The nav is sticky over every page, so it is PAINT ONLY: static gradients,  */
/* stars and shadows; no infinite animation, filter, backdrop-filter or       */
/* scroll-linked effect. Gradient fills can't transition: they snap on, as    */
/* the owner's hover:bg-blue-500 did.                                         */
/*                                                                             */
/* Width budget (the body has ONE auto column: a wider nav widens the page),  */
/* in the widest fonts (DejaVu Sans + a full-width カイル):                     */
/*   320: nav 8 + Home 57 + カイル 58 + Top Anime 89 + gap 4 + search 44 +      */
/*        gap 4 + session slot 48 = 312 (8 spare)                              */
/*   360–639: + the brand slime (20 + 6) = 338                                 */
/*   640: 16 + (Home 71 + カイル 72 + Seasons 90 + Top Anime 107) + 16 +         */
/*        (176 + 8 + 63) = 620. No brand slime at 640–819: a desktop browser   */
/*        with a classic 15px scrollbar lays a 640–654px window out at 625–639 */
/*        while sm: still matches, and 620 still fits.                         */
/*   820+: the owner's px-4 and the slime = 694.                               */
/* Below 320 (a 280px Fold, page zoom) the links tighten to px-1.5; past      */
/* that, and with large default fonts, the link strip scrolls sideways        */
/* (NAV_LINK_STRIP) while the nav keeps the page's width (container-type).    */
/* Re-measure before adding anything to the bar.                              */

/**
 * The chrome's focus ring (nav links, Log in, the avatar, menu items): the inset sage ring, plus
 * an inset outline. Forced colors drops the ring (a box-shadow) and paints Tailwind's transparent
 * outline-none (2px, offset 2px) instead; -outline-offset-2 keeps that outline inside the box, so
 * the link strip's overflow (NAV_LINK_STRIP) can't clip its bottom edge (or Home's left, Top Anime's right).
 */
export const FOCUS_RING_NAV = `${FOCUS_RING_INSET} focus-visible:-outline-offset-2`;

/**
 * The skip link's shared target (WCAG 2.4.1): a span right after the nav in app/layout.tsx, before every page.
 * Without JavaScript the skip link is a native fragment link to it (the browser moves the sequential focus
 * starting point there, so the next Tab is the page's first control); with JavaScript SkipLink focuses the
 * page's <main> instead and never changes the URL.
 */
export const MAIN_CONTENT_ID = "main-content";
/** Out of flow (absolute), so it is never a grid item of the body; at the document's top, so the fragment scroll is y=0. */
export const SKIP_TARGET = "pointer-events-none absolute left-0 top-0 h-px w-px";
/**
 * "Skip to content": the nav's first child and first Tab stop, invisible until focused, then a Great Sage console chip
 * over the nav's left end (absolute: it never takes space in the bar's width budget). `peer`: the link strip fades
 * while it shows (NAV_LINK_STRIP), so no clipped labels peek out beside it. z-30: above the phone search circle (z-10)
 * and its icon (z-20) when large text widens the chip; still inside the nav (z-40). The border is its forced-colors edge.
 */
export const NAV_SKIP_LINK = `peer sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2.5 focus:z-30 focus:inline-flex focus:h-11 focus:items-center focus:whitespace-nowrap focus:rounded-xl focus:border focus:border-[#95ccff]/60 focus:bg-[#0a1528] focus:px-4 focus:text-sm focus:font-semibold focus:text-[#e6f3ff] focus:shadow-[0_0_24px_-6px_rgba(149,204,255,.65)] ${FOCUS_RING_NAV}`;

/**
 * The bar: the night sky's top edge, ending in #050915 (NightSky's first stop), so a banner
 * continues it. z-40: the account menu sits above the landing's StickyCta (z-30).
 * container-type: the phone search's open width is measured against the bar (100cqw), not the
 * viewport (100vw counts a classic scrollbar), and inline-size containment means the bar's content
 * can never widen the body's one auto column (large fonts scroll the link strip instead).
 */
export const NAV_BAR =
  "sticky top-0 z-40 mb-2 flex [container-type:inline-size] h-16 items-center justify-between gap-1 bg-[#0a1428] bg-[radial-gradient(42%_170%_at_6%_0%,rgba(139,92,246,.16),transparent_70%),radial-gradient(38%_170%_at_94%_0%,rgba(93,174,241,.13),transparent_70%),linear-gradient(180deg,#0a1428,#050915)] px-1 text-[#e6f3ff] shadow-[0_12px_28px_-20px_rgba(0,0,0,.95)] sm:gap-4 sm:px-2";
/** The moonlit bottom edge, inside the 64px (render it as the nav's LAST child). A real border in forced colors. */
export const NAV_HAIRLINE =
  "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-[#95ccff]/10 via-[#95ccff]/45 to-[#95ccff]/10 forced-colors:h-0 forced-colors:border-t forced-colors:border-[color:CanvasText]";
/**
 * One 1px span carrying NAV_STARS as box-shadows (inline style), from 1024px only. It starts at
 * 42% of the bar and its stars reach +21.5vw (≈ 64%): the band between the links (≤ 40% at 1024)
 * and the search (≥ 66%). Adding a nav link or widening the search means re-checking it. Static,
 * never animated. Hidden in forced colors (which drops box-shadows anyway).
 */
export const NAV_STAR_FIELD =
  "pointer-events-none absolute left-[42%] top-0 hidden h-px w-px laptop:block forced-colors:hidden";
export const NAV_STARS =
  "0.5vw 14px 0 0 rgba(223,241,255,.5),3.5vw 44px 0 0 rgba(255,255,255,.3),6.5vw 24px 0 0 rgba(255,255,255,.42),9.5vw 50px 0 0 rgba(223,241,255,.35),12.5vw 11px 0 0 rgba(255,255,255,.32),15vw 36px 0 0 rgba(223,241,255,.55),18vw 19px 0 0 rgba(255,255,255,.36),21.5vw 46px 0 0 rgba(255,255,255,.4)";
/**
 * The left group (Home · カイル · Seasons · Top Anime). Normally everything fits; when it can't
 * (large default fonts, zoom, a 280px screen) it scrolls sideways instead of hiding Top Anime
 * (swipe, or NavLink scrolls a focused link into view), with no visible scrollbar. It fades out while the skip
 * link (NAV_SKIP_LINK, its earlier sibling) has focus: opacity, not visibility, so Home stays the next Tab stop.
 */
export const NAV_LINK_STRIP =
  "flex min-w-0 items-center overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden peer-focus:opacity-0";
/** The gel pill (nav links, Log in), filled with slime gel on hover and keyboard focus. No height, shape or padding. */
const NAV_PILL = `relative flex shrink-0 items-center text-sm text-[#e6f3ff] hover:bg-[linear-gradient(180deg,rgba(93,174,241,.34),rgba(42,127,212,.20))] hover:text-white hover:shadow-[inset_0_1px_0_rgba(191,230,255,.35),inset_0_0_0_1px_rgba(149,204,255,.28)] focus-visible:bg-[linear-gradient(180deg,rgba(93,174,241,.34),rgba(42,127,212,.20))] aria-[current=page]:text-[#95ccff] aria-[current=page]:hover:text-white sm:text-base ${FOCUS_RING_NAV}`;
/** Nav links: the owner's full-height rounded-2xl pill; px-2 on phones (the 320 budget; px-1.5 below 320), px-3 at 640–819 (the 640 budget), his px-4 from 820. */
export const NAV_LINK = `${NAV_PILL} h-16 rounded-2xl px-2 max-[319px]:px-1.5 sm:px-3 tablet:px-4`;
/** Under the current page's link: a moonlit underline as wide as the label (insets = NAV_LINK's padding). A border, so forced colors keeps it. */
export const NAV_CURRENT_MARK =
  "pointer-events-none absolute inset-x-2 bottom-3 rounded-full border-t-2 border-[#95ccff] shadow-[0_0_8px_rgba(149,204,255,.75)] max-[319px]:inset-x-1.5 sm:inset-x-3 tablet:inset-x-4";
/** The static slime before カイル: 360–639px and from 820px (no room at 320, nor at 640–819: see the budget above). */
export const NAV_BRAND_MARK = "mr-1.5 hidden shrink-0 min-[360px]:block sm:hidden tablet:block";

/**
 * The session slot: the loading placeholder, "Log in" and the avatar are ONE box (48×48, 63×63
 * from 640), so nothing in the bar moves when the session resolves.
 * Coupled: the phone search's open width calc(100cqw-3.5rem). 100cqw is the bar's content box
 * (the layout width − NAV_BAR's px-1 on both sides); the field ends at the form's right edge
 * (layout − 4 − this slot 48 − NavBar's gap-1 4), so 3.5rem (56 = 48 + 4 + 4) puts its left edge
 * 8px from the page edge, with or without a classic scrollbar. Change NAV_BAR's px-1, NavBar's
 * gap-1, this slot and NAV_SEARCH_INPUT's focus:w-[…] together.
 */
export const NAV_SESSION_SLOT = "h-12 w-12 sm:h-[63px] sm:w-[63px]";
export const NAV_SESSION_PLACEHOLDER = `${NAV_SESSION_SLOT} flex shrink-0 items-center justify-center`;
/** Static (no pulse): without JavaScript the session never resolves. */
export const NAV_SESSION_RING = "h-8 w-8 rounded-full border border-[#95ccff]/25 bg-[#95ccff]/5";
/** "Log in": the owner's plain link in a round gel pill, the slot's box (min-w: a huge font grows it instead of clipping). */
export const NAV_LOG_IN = `${NAV_PILL} h-12 min-w-12 justify-center rounded-full px-0.5 sm:h-[63px] sm:min-w-[63px] sm:px-1`;
/** The owner's round avatar button: gel on hover, keyboard focus and while open (aria-expanded). */
export const NAV_AVATAR_BUTTON = `${NAV_SESSION_SLOT} relative flex items-center justify-center rounded-full hover:bg-[linear-gradient(180deg,rgba(93,174,241,.34),rgba(42,127,212,.20))] hover:shadow-[inset_0_1px_0_rgba(191,230,255,.35),inset_0_0_0_1px_rgba(149,204,255,.28)] focus-visible:bg-[linear-gradient(180deg,rgba(93,174,241,.34),rgba(42,127,212,.20))] aria-expanded:bg-[linear-gradient(180deg,rgba(93,174,241,.34),rgba(42,127,212,.20))] aria-expanded:shadow-[inset_0_1px_0_rgba(191,230,255,.35),inset_0_0_0_1px_rgba(149,204,255,.45)] ${FOCUS_RING_NAV}`;
/** The Google photo: a faint, static "Named" glow. (The /rimuru.png fallback stays h-8 w-auto, no ring.) */
export const NAV_AVATAR_PHOTO =
  "h-8 w-8 rounded-full object-cover shadow-[0_0_14px_-2px_rgba(149,204,255,.55)] ring-1 ring-[#95ccff]/50";

/** NavSearch: phones, a 44×44 circle (the input itself) that opens leftwards while focused. */
export const NAV_SEARCH_FORM = "relative h-11 w-11 shrink-0 sm:h-10 sm:w-44 tablet:w-48 lg:w-64";
/**
 * The input: 16px text below 1024px (iOS zooms smaller inputs, landscape phones included). Closed
 * on phones it has NO padding: border-box can't shrink below padding + border, so pl-9 pr-3 would
 * make the 44px circle 50 wide (the old 40px circle was 50 wide for the same reason). Open on
 * phones: calc(100cqw-3.5rem), see NAV_SESSION_SLOT (no cqw support, e.g. iOS 15: it stays a
 * 44px field while focused, still usable). sm:pr-2: the 16px mono placeholder
 * "Search anime…" (125px) fits the 176px field. The edge is /55: ≈ 3.9:1 against the bar, 3.2:1
 * at worst (under the sage aurora, the desktop field's top right); /45 was 2.5–3.1:1.
 * indent-12 pushes the closed circle's text (a prefilled query, the placeholder) past its edge:
 * forced colors repaints text-transparent in the system color, which would print "Searc" over
 * the magnifier.
 */
export const NAV_SEARCH_INPUT =
  "peer absolute right-0 top-0 z-10 h-11 w-11 rounded-full border border-[#95ccff]/55 bg-[#050915] px-0 indent-12 font-mono text-base text-transparent shadow-[inset_0_1px_8px_rgba(0,0,0,.55)] transition-[width] duration-200 [color-scheme:dark] placeholder:text-transparent hover:border-[#95ccff]/80 focus:w-[calc(100cqw-3.5rem)] focus:border-[#95ccff] focus:pl-4 focus:indent-0 focus:pr-10 focus:text-[#e6f3ff] focus:shadow-[inset_0_1px_8px_rgba(0,0,0,.55),0_0_22px_-6px_rgba(149,204,255,.65)] focus:placeholder:text-[rgb(130,140,160)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]/40 sm:static sm:h-10 sm:w-full sm:pl-9 sm:indent-0 sm:pr-2 sm:text-[#e6f3ff] sm:placeholder:text-[rgb(130,140,160)] sm:focus:w-full sm:focus:pl-9 sm:focus:pr-2 laptop:text-sm [&::-webkit-search-cancel-button]:hidden";
/** The magnifier: must come AFTER the input (peer-focus). Centered in the phone circle, at the open field's right end. */
export const NAV_SEARCH_ICON =
  "pointer-events-none absolute left-3.5 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-[#95ccff]/75 peer-focus:text-[#95ccff] sm:left-3 forced-colors:text-[color:CanvasText] forced-colors:peer-focus:text-[color:CanvasText]";

/**
 * The account menu: a small, opaque Great Sage console (it floats over cards: no glass, no blur).
 * One fade per open. The scanlines are its own background (bg-local: they scroll with the content),
 * not a SCANLINES span, which would cover only the first screenful when max-h makes it scroll.
 */
export const MENU_PANEL =
  "absolute right-0 top-full z-30 mt-2 max-h-[calc(100svh-5rem)] w-60 max-w-[calc(100vw-1rem)] animate-[fade-in_150ms_ease-out_both] overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-[#95ccff]/30 bg-[#0a1528] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.04)_0_1px,transparent_1px_3px)] bg-local shadow-[inset_0_0_40px_-20px_rgba(149,204,255,.35),0_24px_60px_-20px_rgba(0,0,0,.9),0_0_32px_-12px_rgba(93,174,241,.5)]";
/** The header box (padding lives here, not on the clamped line, so a third line can't peek into it). */
export const MENU_HEADER = "border-b border-[#95ccff]/15 px-4 pb-2.5 pt-3";
/** "《Notice》 Signed in as <full name>.": two lines at most, typed in once per open. */
export const MENU_NOTICE =
  "line-clamp-2 animate-sage-scan font-mono text-xs leading-5 text-[#cfe8ff] [overflow-wrap:anywhere]";
export const MENU_ITEM = `flex h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[#e6f3ff] transition-colors hover:bg-[#5daef1]/15 hover:text-white focus-visible:bg-[#5daef1]/15 focus-visible:text-white aria-[current=page]:text-[#95ccff] md:h-10 ${FOCUS_RING_NAV}`;
/** The current page's item: a trailing ● (a glyph, so forced colors keeps it). aria-hidden. */
export const MENU_CURRENT_DOT = "ml-auto text-[10px] leading-none text-[#95ccff]";
/** Lift Tracker's trailing ↗ (it leaves the site). aria-hidden; its aria-label adds ", external site". */
export const MENU_EXTERNAL_GLYPH = "ml-auto text-[#95ccff]/70";
/** Sign out's row: a hairline above it (a border, so forced colors keeps it). */
export const MENU_SIGN_OUT_ROW = "mt-1.5 border-t border-[#95ccff]/15 pt-1.5";

/** The ring on the footer's forest floor (#081020). */
export const FOCUS_RING_FOOTER =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#081020]";
/**
 * <footer>: must stay a direct child of <body> (the landing's StickyCta observes `body > footer`).
 * CARD_PAGE's -mb-8 cancels this mt-8 (the card pages' sky runs to the horizon); change them together.
 */
export const FOOTER = "relative mt-8 min-w-0 [contain:inline-size]";
/**
 * The navy horizon behind the treeline (the banner sky's last stop, reversed). Decor: hidden in forced
 * colors. Under a card page's sky (CARD_PAGE: `main[data-card-page]`) it is that sky's flat navy, so
 * the sky reaches the trees without dipping to the page color (browsers without :has() keep the dip).
 */
export const FOOTER_HORIZON =
  "pointer-events-none relative h-14 bg-[linear-gradient(180deg,rgb(18,18,18)_0%,#0e1d33_100%)] sm:h-20 forced-colors:hidden [body:has(main[data-card-page])_&]:bg-[#0e1d33] [body:has(main[data-card-page])_&]:bg-none";
/**
 * NightSky's Treeline, at the banners' forest height, on the horizon's floor. Mirrored: a banner band is the same
 * height, and a different viewBox width only slides the whole picture, so unmirrored the footer would be the banner's
 * forest moved sideways, tree for tree, on a short page. The pines and hills are symmetric; the slime is a sibling.
 */
export const FOOTER_TREELINE = "absolute inset-x-0 bottom-0 h-11 -scale-x-100 sm:h-16";
/** The content column (FOOTER_ROW's box) at the horizon's floor, so the slime stands above the links' end. */
export const FOOTER_SLIME_TRACK = "absolute inset-x-4 bottom-0 mx-auto max-w-screen-2xl sm:inset-x-6";
export const FOOTER_SLIME = "absolute bottom-0 right-0";
/** The forest floor: the near ridge's color, so trees and ground are one shape. border-transparent = its edge in forced colors. */
export const FOOTER_BODY =
  "border-t border-transparent bg-[#081020] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 text-sm text-[rgb(164,164,164)] sm:px-6";
export const FOOTER_ROW =
  "mx-auto flex max-w-screen-2xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4";
export const FOOTER_CREDITS = "min-w-0 leading-6";
/** AniList / MyAnimeList inside the credit sentence (inline links: exempt from target size). */
export const FOOTER_CREDIT_LINK = `rounded text-[#95ccff] underline-offset-2 hover:text-white hover:underline ${FOCUS_RING_FOOTER}`;
/** "Top anime", "Search": 44px targets on phones; -mx-2 on the list lines their text up with the credits. */
/** shrink-0: at 640–735px the credits wrap, never the links. */
export const FOOTER_NAV = "shrink-0";
export const FOOTER_LINKS = "-mx-2 flex gap-1";
export const FOOTER_LINK = `inline-flex h-11 items-center whitespace-nowrap rounded-lg px-2 text-[rgb(200,206,218)] underline-offset-2 hover:text-white hover:underline md:h-9 ${FOCUS_RING_FOOTER}`;
