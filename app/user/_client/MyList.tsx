"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { SageTag } from "@/components/home/SageLine";
import { consoleToast } from "@/components/theme/consoleToast";
import { revealInRow } from "@/components/theme/revealInRow";
import EvolutionCard from "@/components/theme/EvolutionCard";
import { LiveTimersToggle } from "@/components/theme/LiveTimersToggle";
import PageBanner from "@/components/theme/PageBanner";
import SagePanel from "@/components/theme/SagePanel";
import { useCopyListLink } from "@/components/theme/ShareLink";
import { Stat, StatGrid } from "@/components/theme/StatGrid";
import {
  APP_CONTAINER,
  FIELD,
  GHOST_BUTTON,
  GHOST_BUTTON_PANEL,
  LABEL_CLASS,
  PANEL,
  PRIMARY_BUTTON,
  QUIET_BUTTON,
  SECTION_TITLE_CLASS,
  SHELF,
  SHELF_OFF,
  SHELF_ON,
  FOCUS_RING_PANEL,
} from "@/components/theme/tokens";
import { SEASONS, SEASON_LABELS, isSeasonName } from "@/lib/season";
import { WEEKDAYS, nextAiring, unloggedAired } from "@/lib/anime/airing";
import { STATUS_DOT_CLASS } from "@/lib/anime/statusBadge";
import { plusOneMessage } from "@/lib/anime/trackerConsole";
import { LIST_STATUSES, LIST_STATUS_LABELS, displayTitle } from "@/lib/anime/types";
import type { ListEntry, UserAnimeData } from "@/lib/anime/types";
import { evolutionTier, showsLabel } from "@/lib/landing";
import { airingSchedulePath, searchPath } from "@/lib/routes";
import { errorMessage, saveUserData } from "./api";
import { EditEntryDialog } from "./EditEntryDialog";
import { ListCard, editButtonId, incrementButtonId } from "./ListCard";
import { ListGrid } from "./ListGrid";
import {
  EMPTY_FILTERS,
  RELEASE_STATUSES,
  RELEASE_STATUS_LABELS,
  SORT_OPTIONS,
  WEEKDAY_LABELS,
  countByStatus,
  formatRuntime,
  groupByStatus,
  hasActiveFilters,
  isReleaseStatus,
  isSortKey,
  isWeekday,
  listViewQuery,
  matchesFilters,
  parseListView,
  sortEntries,
  watchedRuntime,
  yearOptions,
} from "./listFilters";
import { toMyListEntry } from "./listFilters";
import type { ListFilters, MyListEntry, SortKey, StatusTab } from "./listFilters";

export interface ListOwner {
  id: string;
  name: string | null;
}

interface MyListProps {
  entries: MyListEntry[];
  isOwner: boolean;
  owner: ListOwner;
  /** Server render time: the reference for "N new" (banner, sort, chips) until the clock hydrates. */
  renderedAt: number;
}

const HEADING_ID = "my-list-heading";
const TABS: StatusTab[] = ["all", ...LIST_STATUSES];
const TAB_LABELS: Record<StatusTab, string> = { all: "All", ...LIST_STATUS_LABELS };

/**
 * After a successful edit, re-fetch the page's server data in the background
 * so the router cache (used by back/forward navigation) isn't stale. Local
 * state is the source of truth while the page is open.
 */
const REFRESH_DELAY_MS = 2_000;

/** Four narrow cells: every label reserves two lines so the numbers line up when one wraps. */
const STAT_LABEL = "min-h-[2.5em]";

/** The banner's status readout. Real list data only. */
function listStats(items: MyListEntry[]) {
  let episodes = 0;
  let scoreSum = 0;
  let scored = 0;
  for (const entry of items) {
    episodes += entry.userData.episodeProgressNumber;
    if (entry.userData.score !== null) {
      scoreSum += entry.userData.score;
      scored += 1;
    }
  }
  return {
    episodes,
    meanScore: scored ? (Math.round((scoreSum / scored) * 10) / 10).toFixed(1) : null,
    /** Literally "still airing": AniList says the show is releasing, whatever its list status. */
    releasing: items.filter((entry) => entry.status === "RELEASING").length,
  };
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SortSelect({
  id,
  value,
  onChange,
  className = "",
}: {
  id: string;
  value: SortKey;
  onChange: (sort: SortKey) => void;
  className?: string;
}) {
  return (
    <div className={`min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={LABEL_CLASS}>
        Sort by
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          if (isSortKey(event.target.value)) onChange(event.target.value);
        }}
        className={FIELD}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** "2 active" on the filters toggle. */
function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={`items-center rounded-full bg-blue-600 px-2 text-[11px] text-white ${className}`}>
      {count}
      <span className="sr-only"> active</span>
    </span>
  );
}

/**
 * My List, in the landing's Tempest theme (skill 02 · Predator): a night-sky
 * banner with the list's stats and its evolving slime, the demo's shelves,
 * a filter console, and the demo's tracker card for every show.
 */
export function MyList({ entries, isOwner, owner, renderedAt }: MyListProps) {
  const router = useRouter();
  const [items, setItems] = useState(entries);
  // The view lives in the URL (?shelf=&sort=&q=…), so Back and a reload come
  // back to it. Read once here; written below with replaceState.
  const searchParams = useSearchParams();
  const [initialView] = useState(() => parseListView(searchParams));
  const [tab, setTab] = useState<StatusTab>(initialView.tab);
  const [filters, setFilters] = useState<ListFilters>(initialView.filters);
  const [sort, setSort] = useState<SortKey>(initialView.sort);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(() => new Set());
  /**
   * The one spoken channel for tracker results (each +1 and each save): the
   * console toast mirrors it visually but is silent, so nothing is said twice.
   */
  const [announcement, setAnnouncement] = useState({ text: "", count: 0 });
  /** Re-announces identical lines too (two identical saves in a row). */
  const announce = useCallback(
    (text: string) => setAnnouncement((current) => ({ text, count: current.count + 1 })),
    []
  );
  const copyLink = useCopyListLink(owner.id);
  /** The selected shelf chip: kept in view in the phone's sideways row (e.g. restored from the URL). */
  const selectedShelfRef = useRef<HTMLButtonElement>(null);
  useEffect(() => revealInRow(selectedShelfRef.current), [tab]);

  /** userData written by this page, updated synchronously (state renders later). */
  const latestUserData = useRef(new Map<number, UserAnimeData>());
  /** Entries with a "+1" request in flight (one at a time per entry). */
  const inFlight = useRef(new Set<number>());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Entries removed on this page (so a late server read can't bring them back). */
  const removedIds = useRef(new Set<number>());

  // Back/forward navigation replays this page's original server data from the
  // router cache. Re-read the list once on mount so a later edit (e.g. "+1")
  // can't write stale values back. Anything edited here since mount wins.
  useEffect(() => {
    if (!isOwner) return;
    const controller = new AbortController();
    fetch(`/api/anime-list/user/${owner.id}`, { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { list?: ListEntry[] } | null) => {
        if (!Array.isArray(body?.list)) return;
        const fresh = body.list
          .filter((entry) => !removedIds.current.has(entry.id))
          .map(toMyListEntry);
        setItems((current) => {
          const local = new Map(current.map((entry) => [entry.id, entry]));
          return fresh.map((entry) =>
            latestUserData.current.has(entry.id) ? (local.get(entry.id) ?? entry) : entry
          );
        });
      })
      .catch(() => {
        // Offline/aborted: keep what the server rendered.
      });
    return () => controller.abort();
  }, [isOwner, owner.id]);

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    []
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      router.refresh();
    }, REFRESH_DELAY_MS);
  }, [router]);

  const setUserData = useCallback((animeId: number, userData: UserAnimeData) => {
    latestUserData.current.set(animeId, userData);
    setItems((current) =>
      current.map((entry) => (entry.id === animeId ? { ...entry, userData } : entry))
    );
  }, []);

  const incrementProgress = useCallback(
    async (entry: MyListEntry) => {
      const animeId = entry.id;
      if (inFlight.current.has(animeId)) return;
      const previous = latestUserData.current.get(animeId) ?? entry.userData;
      if (entry.episodes && previous.episodeProgressNumber >= entry.episodes) return;

      const optimistic: UserAnimeData = {
        ...previous,
        episodeProgressNumber: previous.episodeProgressNumber + 1,
      };
      inFlight.current.add(animeId);
      setPendingIds((current) => new Set(current).add(animeId));
      setUserData(animeId, optimistic);
      try {
        const saved = await saveUserData(animeId, {
          episodeProgressNumber: optimistic.episodeProgressNumber,
        });
        // Only apply if nothing else (the edit dialog, a removal) changed it meanwhile.
        const completed = saved.listType === "completed" && previous.listType !== "completed";
        const nowMs = Date.now();
        const message = plusOneMessage({
          prev: previous,
          next: saved,
          episodes: entry.episodes,
          title: displayTitle(entry),
          unlogged: {
            before: unloggedAired({ ...entry, userData: previous }, nowMs),
            after: unloggedAired({ ...entry, userData: saved }, nowMs),
          },
        });
        if (latestUserData.current.get(animeId) === optimistic) {
          // Auto-complete moves the card to the Completed section (or off this shelf).
          // Keyboard users keep their place in the section they were working through:
          // the next card's +1, else the section heading. Mouse and touch users are
          // left alone (no focus jump, no scroll).
          const buttonId = incrementButtonId(animeId);
          const active = document.activeElement;
          const keyboard =
            active instanceof HTMLElement && active.id === buttonId && active.matches(":focus-visible");
          const section = active?.closest("section")?.getAttribute("aria-labelledby") ?? null;
          const item = active?.closest("li");
          const neighbor = (item?.nextElementSibling ?? item?.previousElementSibling)?.querySelector<HTMLElement>(
            "[id^='increment-entry-']"
          )?.id;
          flushSync(() => setUserData(animeId, saved));
          if (keyboard) {
            const moved = document.getElementById(buttonId);
            const movedSection = moved?.closest("section")?.getAttribute("aria-labelledby");
            // Stay in the section being worked through; when it emptied out, follow
            // the card (All view) or return to the selected shelf, never the page top.
            const target =
              (movedSection === section ? moved : null) ??
              (neighbor ? document.getElementById(neighbor) : null) ??
              (section ? document.getElementById(section) : null) ??
              moved ??
              document.querySelector<HTMLElement>('[aria-label="List status"] [aria-pressed="true"]') ??
              document.getElementById(HEADING_ID);
            if (target && target !== document.activeElement) target.focus();
          }
          consoleToast(message, { celebrate: completed });
          announce(message.spoken);
        }
        scheduleRefresh();
      } catch (err) {
        if (latestUserData.current.get(animeId) === optimistic) setUserData(animeId, previous);
        toast.error(errorMessage(err));
      } finally {
        inFlight.current.delete(animeId);
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(animeId);
          return next;
        });
      }
    },
    [announce, scheduleRefresh, setUserData]
  );

  const openEditor = useCallback((entry: MyListEntry) => setEditingId(entry.id), []);
  const closeEditor = useCallback(() => setEditingId(null), []);

  const handleSaved = useCallback(
    (animeId: number, userData: UserAnimeData, spoken: string) => {
      setUserData(animeId, userData);
      announce(spoken);
      setEditingId((current) => (current === animeId ? null : current));
      scheduleRefresh();
    },
    [announce, scheduleRefresh, setUserData]
  );

  const handleRemoved = useCallback(
    (animeId: number) => {
      latestUserData.current.delete(animeId);
      removedIds.current.add(animeId);
      setItems((current) => current.filter((entry) => entry.id !== animeId));
      setEditingId((current) => (current === animeId ? null : current));
      scheduleRefresh();
    },
    [scheduleRefresh]
  );

  const updateFilters = (patch: Partial<ListFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    // The Clear button unmounts itself; give keyboard focus a sensible home.
    document.getElementById("list-search")?.focus();
  };

  // Typing in the search box stays responsive on long lists.
  const deferredFilters = useDeferredValue(filters);

  // Write the view back to the URL: replaceState (no history entry per keystroke),
  // which Next 16 syncs into its router. Defaults are left out of the query.
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const query = listViewQuery({ tab, sort, filters: deferredFilters });
    if (query !== search) window.history.replaceState(null, "", `${pathname}${query}${hash}`);
  }, [tab, sort, deferredFilters]);
  const years = useMemo(() => {
    const options = yearOptions(items);
    const selected = filters.year;
    return selected !== null && !options.includes(selected)
      ? [...options, selected].sort((a, b) => b - a)
      : options;
  }, [items, filters.year]);
  const filtered = useMemo(
    () => items.filter((entry) => matchesFilters(entry, deferredFilters)),
    [items, deferredFilters]
  );
  const counts = useMemo(() => countByStatus(filtered), [filtered]);
  const totals = useMemo(() => countByStatus(items), [items]);
  const stats = useMemo(() => listStats(items), [items]);
  // At the server's render time, so the banner's typed-in line matches the chips'
  // first render on the server and after hydration.
  const withNewEpisodes = useMemo(
    () => items.filter((entry) => (unloggedAired(entry, renderedAt) ?? 0) > 0).length,
    [items, renderedAt]
  );
  const runtime = useMemo(() => watchedRuntime(items), [items]);
  const sections = useMemo(() => {
    const sorted = sortEntries(filtered, sort, renderedAt);
    if (tab === "all") return groupByStatus(sorted);
    const inTab = sorted.filter((entry) => entry.userData.listType === tab);
    return inTab.length ? [{ status: tab, entries: inTab }] : [];
  }, [filtered, sort, tab, renderedAt]);
  const hasCountdowns = useMemo(() => items.some((entry) => nextAiring(entry) !== null), [items]);

  const filtersActive = hasActiveFilters(filters);
  // The readout and the "no match" panel describe what's on screen, which uses
  // the deferred filters (typing stays responsive on long lists).
  const shownActive = hasActiveFilters(deferredFilters);
  const shownCount = sections.reduce((sum, section) => sum + section.entries.length, 0);
  const scopeTotal = tab === "all" ? items.length : totals[tab];
  const readout = shownActive
    ? `${shownCount} of ${showsLabel(scopeTotal)}${tab !== "all" ? ` in ${TAB_LABELS[tab]}` : ""} match.`
    : "";
  // Spoken only when the filters or shelf change, not when a +1 or save moves a
  // card (that result is already announced). Adjusted during render, no effect.
  const readoutKey = `${tab}${listViewQuery({ tab: "all", sort: "next", filters: deferredFilters })}`;
  const [spokenReadout, setSpokenReadout] = useState({ key: readoutKey, text: "" });
  if (spokenReadout.key !== readoutKey) setSpokenReadout({ key: readoutKey, text: readout });
  const panelFilterCount = [filters.year, filters.season, filters.weekday, filters.release].filter(
    (value) => value !== null
  ).length;
  const editingEntry =
    editingId === null ? null : items.find((entry) => entry.id === editingId) ?? null;
  const name = owner.name?.trim() || "Anonymous";
  const listName = isOwner ? "your list" : `${name}'s list`;

  const sage = !items.length
    ? isOwner
      ? { kind: "Notice" as const, text: "Your list is empty. Recommend: predation." }
      : { kind: "Report" as const, text: `${name} hasn't stored any shows yet.` }
    : {
        kind: "Report" as const,
        text: isOwner
          ? `Stomach contents: ${showsLabel(items.length)}. ${stats.releasing} still airing${
              withNewEpisodes ? `, ${withNewEpisodes} with new episodes` : ""
            }.`
          : `Analysis complete: ${showsLabel(items.length)} on ${name}'s list, ${stats.releasing} still airing.`,
      };

  const banner = (
    <PageBanner
      eyebrow="Skill 02 · Predator"
      sage={sage}
      title={`${name}'s list`}
      titleId={HEADING_ID}
      sub={
        isOwner ? (
          <>
            {/* Phones keep only the visibility sentence, so the list starts sooner. */}
            <span className="hidden sm:inline">
              Tap +1 after each episode. Reach the finale and the show files itself under Completed.{" "}
            </span>
            Anyone with the link can look; only you can edit.
          </>
        ) : (
          `What ${name} is watching, planning and has finished. Only ${name} can edit it.`
        )
      }
      aside={
        <EvolutionCard
          layout="banner"
          headingLevel="h2"
          count={items.length}
          tier={evolutionTier(true, items.length)}
          listName={listName}
          gulpKey={totals.completed}
        />
      }
    >
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={airingSchedulePath(owner.id)} prefetch={false} className={GHOST_BUTTON}>
          {isOwner ? "My Airing Schedule" : `${name}'s Airing Schedule`}
          <span aria-hidden="true">→</span>
        </Link>
        {isOwner && (
          <button type="button" onClick={() => copyLink()} className={GHOST_BUTTON}>
            Copy link
          </button>
        )}
      </div>
      {items.length > 0 && (
        <StatGrid className="mt-6 max-w-2xl grid-cols-4">
          <Stat label="Shows" value={items.length} labelClassName={STAT_LABEL} />
          <Stat label="Watching" value={totals.watching} labelClassName={STAT_LABEL} />
          <Stat
            label="Episodes seen"
            labelClassName={STAT_LABEL}
            value={stats.episodes}
            // From 640px: a phone keeps its 4-across row short.
            noteClassName="max-sm:hidden"
            note={
              runtime.minutes > 0 ? (
                <>
                  <span aria-hidden="true">≈ {formatRuntime(runtime.minutes)} of runtime</span>
                  <span className="sr-only">
                    About {formatRuntime(runtime.minutes)} of runtime, estimated from AniList&apos;s typical
                    episode length
                  </span>
                </>
              ) : undefined
            }
            noteTitle={`AniList's typical episode length × episodes watched${
              runtime.skipped
                ? `; ${runtime.skipped} ${runtime.skipped === 1 ? "show" : "shows"} without a length left out`
                : ""
            }`}
          />
          <Stat label="Mean score" value={stats.meanScore ?? "—"} labelClassName={STAT_LABEL} />
        </StatGrid>
      )}
    </PageBanner>
  );

  if (items.length === 0) {
    return (
      <main className="min-w-0 pb-8 text-white">
        {banner}
        <div className={APP_CONTAINER}>
          {isOwner ? (
            <SagePanel
              kind="Notice"
              title="Every legend starts as a slime."
              actions={
                <>
                  <Link href="/anime" className={PRIMARY_BUTTON}>
                    Browse this season
                  </Link>
                  <Link href={searchPath()} prefetch={false} className={GHOST_BUTTON}>
                    Search anime
                  </Link>
                </>
              }
            >
              Find something to watch and tap + Add to list on any anime card. It&apos;ll show up
              here, with a countdown whenever an episode is scheduled.
            </SagePanel>
          ) : (
            <SagePanel
              kind="Report"
              mood="worried"
              title="Nothing here yet"
              actions={
                <Link href="/anime" className={GHOST_BUTTON}>
                  Browse this season
                </Link>
              }
            >
              {name} hasn&apos;t added any anime to their list.
            </SagePanel>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-w-0 pb-8 text-white">
      {banner}

      <div className={`${APP_CONTAINER} flex flex-col gap-8`}>
        <section aria-label="Shelves and filters" className={`${PANEL} p-3 sm:p-4`}>
          {/* Phones: one row that scrolls sideways (with a fade), instead of three wrapped rows. */}
          <div role="group" aria-label="List status" className="min-w-0">
            <ul className="flex gap-1.5 py-1 max-sm:-mx-1 max-sm:overflow-x-auto max-sm:scroll-pr-10 max-sm:px-1 max-sm:pr-8 max-sm:[mask-image:linear-gradient(to_right,#000_85%,transparent)] max-sm:[scrollbar-width:none] sm:flex-wrap">
              {TABS.map((value) => {
                const selected = tab === value;
                return (
                  <li key={value} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={selected}
                      ref={selected ? selectedShelfRef : undefined}
                      onClick={(event) => {
                        setTab(value);
                        revealInRow(event.currentTarget);
                      }}
                      onFocus={(event) => revealInRow(event.currentTarget)}
                      className={`${SHELF} ${selected ? SHELF_ON : SHELF_OFF} ${FOCUS_RING_PANEL}`}
                    >
                      {value !== "all" && (
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASS[value]}`}
                        />
                      )}
                      {TAB_LABELS[value]}
                      <span className="font-semibold tabular-nums">{counts[value]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Phones: Search beside "Sort & filter" (Sort lives in the panel). From 640px:
              Search, Sort and Filters in one row; from 1024px the filters are always shown.
              The two Sort selects share state; only one is ever displayed. */}
          <div className="mt-2 flex items-end gap-3 border-t border-[rgb(53,53,53)] pt-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor="list-search" className={LABEL_CLASS}>
                Search this list
              </label>
              <input
                id="list-search"
                type="search"
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder="Any title"
                autoComplete="off"
                className={`${FIELD} font-mono`}
              />
            </div>
            <SortSelect id="list-sort" value={sort} onChange={setSort} className="hidden w-48 shrink-0 sm:flex" />
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="list-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className={`${GHOST_BUTTON_PANEL} shrink-0 md:h-10 lg:hidden`}
            >
              {/* Below 375px an icon, so the search field keeps its width. */}
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-4 w-4 shrink-0 min-[375px]:hidden">
                <path d="M3 5h14M6 10h8M9 15h2" />
              </svg>
              <span className="max-[374px]:sr-only sm:hidden">Sort &amp; filter</span>
              <span className="hidden sm:inline">Filters</span>
              <CountBadge count={panelFilterCount + (sort !== "next" ? 1 : 0)} className="sm:hidden" />
              <CountBadge count={panelFilterCount} className="hidden sm:inline-flex" />
              <span aria-hidden="true">{filtersOpen ? "▴" : "▾"}</span>
            </button>
          </div>

          <div
            id="list-filters"
            className={`${filtersOpen ? "grid" : "hidden"} mt-3 min-w-0 grid-cols-1 gap-3 min-[375px]:grid-cols-2 md:grid-cols-4 lg:grid`}
          >
            <SortSelect
              id="list-sort-panel"
              value={sort}
              onChange={setSort}
              className="flex min-[375px]:col-span-2 sm:hidden"
            />
            <FilterSelect
              id="filter-year"
              label="Year"
              value={filters.year === null ? "" : String(filters.year)}
              onChange={(value) => updateFilters({ year: value ? Number(value) : null })}
              options={[
                { value: "", label: "All years" },
                ...years.map((year) => ({ value: String(year), label: String(year) })),
              ]}
            />
            <FilterSelect
              id="filter-season"
              label="Season"
              value={filters.season ?? ""}
              onChange={(value) => updateFilters({ season: isSeasonName(value) ? value : null })}
              options={[
                { value: "", label: "All seasons" },
                ...SEASONS.map((season) => ({ value: season, label: SEASON_LABELS[season] })),
              ]}
            />
            <FilterSelect
              id="filter-weekday"
              label="Airing day (PT)"
              value={filters.weekday ?? ""}
              onChange={(value) => updateFilters({ weekday: isWeekday(value) ? value : null })}
              options={[
                { value: "", label: "Any day" },
                ...WEEKDAYS.map((day) => ({ value: day, label: WEEKDAY_LABELS[day] })),
              ]}
            />
            <FilterSelect
              id="filter-release"
              label="Release status"
              value={filters.release ?? ""}
              onChange={(value) => updateFilters({ release: isReleaseStatus(value) ? value : null })}
              options={[
                { value: "", label: "Any status" },
                ...RELEASE_STATUSES.map((status) => ({
                  value: status,
                  label: RELEASE_STATUS_LABELS[status],
                })),
              ]}
            />
          </div>

          <div className="mt-2 flex min-h-11 flex-wrap items-center justify-between gap-x-4">
            <p className="text-sm text-[#cfe8ff]">
              {readout && (
                <>
                  <SageTag kind="Analyze" />
                  {readout}
                </>
              )}
            </p>
            <p role="status" className="sr-only">
              {spokenReadout.text}
            </p>
            <div className="-mr-2 flex flex-wrap items-center">
              {filtersActive && (
                <button type="button" onClick={clearFilters} className={QUIET_BUTTON}>
                  Clear filters
                </button>
              )}
              {hasCountdowns && <LiveTimersToggle />}
            </div>
          </div>
        </section>

        {sections.length === 0 ? (
          shownActive ? (
            <SagePanel
              kind="Report"
              mood="worried"
              actions={
                <button type="button" onClick={clearFilters} className={GHOST_BUTTON}>
                  Clear filters
                </button>
              }
            >
              No shows match these filters.
            </SagePanel>
          ) : (
            <SagePanel kind="Report" mood="sage">
              Nothing in {TAB_LABELS[tab]} yet.
            </SagePanel>
          )
        ) : (
          sections.map((section) => (
            <section
              key={section.status}
              aria-labelledby={`section-${section.status}`}
              className="flex min-w-0 flex-col gap-4"
            >
              <h2
                id={`section-${section.status}`}
                tabIndex={-1}
                className={`${SECTION_TITLE_CLASS} scroll-mt-20 focus:outline-none`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_CLASS[section.status]}`}
                />
                {LIST_STATUS_LABELS[section.status]}
                <span className="font-mono text-sm font-normal tabular-nums text-[rgb(164,164,164)]">
                  {section.entries.length}
                </span>
                <span
                  aria-hidden="true"
                  className="h-px min-w-8 flex-1 bg-gradient-to-r from-[#95ccff]/30 to-transparent"
                />
              </h2>
              <ListGrid>
                {section.entries.map((entry) => (
                  <ListCard
                    key={entry.id}
                    entry={entry}
                    isOwner={isOwner}
                    ownerName={isOwner ? null : name}
                    renderedAt={renderedAt}
                    pending={pendingIds.has(entry.id)}
                    onIncrement={incrementProgress}
                    onEdit={openEditor}
                  />
                ))}
              </ListGrid>
            </section>
          ))
        )}
      </div>

      <p role="status" className="sr-only">
        {announcement.text}
        {/* A zero-width space on alternate lines: identical text still counts as a change. */}
        {announcement.count % 2 ? "\u200B" : ""}
      </p>

      {isOwner && editingEntry && (
        <EditEntryDialog
          key={editingEntry.id}
          entry={editingEntry}
          onClose={closeEditor}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
          returnFocusId={editButtonId(editingEntry.id)}
          fallbackFocusId={HEADING_ID}
        />
      )}
    </main>
  );
}
