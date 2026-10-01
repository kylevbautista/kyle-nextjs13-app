"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SageTag, sageText } from "@/components/home/SageLine";
import EvolutionCard from "@/components/theme/EvolutionCard";
import { LiveTimersToggle } from "@/components/theme/LiveTimersToggle";
import PageBanner from "@/components/theme/PageBanner";
import SagePanel from "@/components/theme/SagePanel";
import { useCopyListLink } from "@/components/theme/ShareLink";
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
import { WEEKDAYS, nextAiring } from "@/lib/anime/airing";
import { STATUS_DOT_CLASS } from "@/lib/anime/statusBadge";
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
  groupByStatus,
  hasActiveFilters,
  isReleaseStatus,
  isSortKey,
  isWeekday,
  matchesFilters,
  sortEntries,
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

/** Shows on the schedule: an upcoming episode, not completed or dropped. */
const isAiringForList = (entry: MyListEntry) =>
  entry.userData.listType !== "completed" &&
  entry.userData.listType !== "dropped" &&
  nextAiring(entry) !== null;

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
    airing: items.filter(isAiringForList).length,
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#0a1428]/90 px-4 py-3">
      <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#95ccff]">{label}</dt>
      <dd className="mt-1 text-2xl font-black tabular-nums text-white">{value}</dd>
    </div>
  );
}

/**
 * My List, in the landing's Tempest theme (skill 02 · Predator): a night-sky
 * banner with the list's stats and its evolving slime, the demo's shelves,
 * a filter console, and the demo's tracker card for every show.
 */
export function MyList({ entries, isOwner, owner }: MyListProps) {
  const router = useRouter();
  const [items, setItems] = useState(entries);
  const [tab, setTab] = useState<StatusTab>("all");
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("next");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(() => new Set());
  const copyLink = useCopyListLink(owner.id);

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
        if (latestUserData.current.get(animeId) === optimistic) {
          const buttonId = incrementButtonId(animeId);
          const hadFocus = document.activeElement?.id === buttonId;
          // Auto-complete can move the card to another section (a remount) or out of
          // the current tab; keep keyboard focus from falling back to <body>.
          flushSync(() => setUserData(animeId, saved));
          if (hadFocus && document.activeElement?.id !== buttonId) {
            (document.getElementById(buttonId) ?? document.getElementById(HEADING_ID))?.focus();
          }
        }
        if (saved.listType === "completed" && previous.listType !== "completed") {
          toast.success(
            sageText("Notice", `Final episode reached. ${displayTitle(entry)} moved to Completed.`)
          );
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
    [scheduleRefresh, setUserData]
  );

  const openEditor = useCallback((entry: MyListEntry) => setEditingId(entry.id), []);
  const closeEditor = useCallback(() => setEditingId(null), []);

  const handleSaved = useCallback(
    (animeId: number, userData: UserAnimeData) => {
      setUserData(animeId, userData);
      setEditingId((current) => (current === animeId ? null : current));
      scheduleRefresh();
    },
    [scheduleRefresh, setUserData]
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
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  // Typing in the search box stays responsive on long lists.
  const deferredFilters = useDeferredValue(filters);
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
  const sections = useMemo(() => {
    const sorted = sortEntries(filtered, sort);
    if (tab === "all") return groupByStatus(sorted);
    const inTab = sorted.filter((entry) => entry.userData.listType === tab);
    return inTab.length ? [{ status: tab, entries: inTab }] : [];
  }, [filtered, sort, tab]);
  const hasCountdowns = useMemo(() => items.some((entry) => nextAiring(entry) !== null), [items]);

  const filtersActive = hasActiveFilters(filters);
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
          ? `Stomach contents: ${showsLabel(items.length)}. ${stats.airing} still airing.`
          : `Analysis complete: ${showsLabel(items.length)} on ${name}'s list, ${stats.airing} still airing.`,
      };

  const banner = (
    <PageBanner
      eyebrow="Skill 02 · Predator"
      sage={sage}
      title={`${name}'s list`}
      titleId={HEADING_ID}
      sub={
        isOwner
          ? "Tap +1 after each episode. Reach the finale and the show files itself under Completed. Anyone with the link can look; only you can edit."
          : `What ${name} is watching, planning and has finished. Only ${name} can edit it.`
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
        <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#95ccff]/25 bg-[#95ccff]/15 sm:grid-cols-4">
          <Stat label="Shows" value={items.length} />
          <Stat label="Watching" value={totals.watching} />
          <Stat label="Episodes seen" value={stats.episodes} />
          <Stat label="Mean score" value={stats.meanScore ?? "—"} />
        </dl>
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
              here with a countdown to its next episode.
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
          <nav aria-label="List status">
            <ul className="flex flex-wrap gap-1.5">
              {TABS.map((value) => {
                const selected = tab === value;
                return (
                  <li key={value}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTab(value)}
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
          </nav>

          <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-[rgb(53,53,53)] pt-3">
            <div className="flex min-w-0 basis-full flex-col gap-1.5 sm:basis-0 sm:flex-1">
              <label htmlFor="list-search" className={LABEL_CLASS}>
                Search this list
              </label>
              <input
                id="list-search"
                type="search"
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder="Title in English, romaji or Japanese"
                autoComplete="off"
                className={`${FIELD} font-mono`}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:w-48 sm:flex-none">
              <label htmlFor="list-sort" className={LABEL_CLASS}>
                Sort by
              </label>
              <select
                id="list-sort"
                value={sort}
                onChange={(event) => {
                  if (isSortKey(event.target.value)) setSort(event.target.value);
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
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="list-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className={`${GHOST_BUTTON_PANEL} shrink-0 md:h-10 lg:hidden`}
            >
              Filters
              {panelFilterCount > 0 && (
                <span className="rounded-full bg-blue-600 px-2 text-[11px] text-white">
                  {panelFilterCount}
                  <span className="sr-only"> active</span>
                </span>
              )}
              <span aria-hidden="true">{filtersOpen ? "▴" : "▾"}</span>
            </button>
          </div>

          <div
            id="list-filters"
            className={`${filtersOpen ? "grid" : "hidden"} mt-3 min-w-0 grid-cols-1 gap-3 min-[375px]:grid-cols-2 md:grid-cols-4 lg:grid`}
          >
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
            <p aria-live="polite" className="text-sm text-[#cfe8ff]">
              {filtersActive && (
                <>
                  <SageTag kind="Analyze" />
                  {filtered.length} of {showsLabel(items.length)} match.
                </>
              )}
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
          filtersActive ? (
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
              <h2 id={`section-${section.status}`} className={SECTION_TITLE_CLASS}>
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
