"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SEASONS, SEASON_LABELS, isSeasonName } from "@/lib/season";
import { WEEKDAYS } from "@/lib/anime/airing";
import { LIST_STATUSES, LIST_STATUS_LABELS, displayTitle } from "@/lib/anime/types";
import type { ListEntry, UserAnimeData } from "@/lib/anime/types";
import { myListPath, searchPath } from "@/lib/routes";
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
  image: string | null;
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

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(18,18,18)]";
const controlClass =
  "w-full rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
const primaryLink = `inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 ${focusRing}`;
const secondaryButton = `inline-flex h-9 items-center justify-center rounded-md border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] px-3 text-sm font-medium text-white hover:bg-[rgb(53,53,53)] ${focusRing}`;

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
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-[rgb(164,164,164)]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
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

function OwnerAvatar({ owner, name }: { owner: ListOwner; name: string }) {
  if (owner.image) {
    return (
      <Image
        src={owner.image}
        alt={`${name}'s avatar`}
        width={56}
        height={56}
        unoptimized
        referrerPolicy="no-referrer"
        className="h-14 w-14 shrink-0 rounded-full border border-[rgb(53,53,53)] object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function MyList({ entries, isOwner, owner }: MyListProps) {
  const router = useRouter();
  const [items, setItems] = useState(entries);
  const [tab, setTab] = useState<StatusTab>("all");
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("next");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(() => new Set());

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
          toast.success(`Finished ${displayTitle(entry)}! Moved to Completed.`);
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
  const sections = useMemo(() => {
    const sorted = sortEntries(filtered, sort);
    if (tab === "all") return groupByStatus(sorted);
    const inTab = sorted.filter((entry) => entry.userData.listType === tab);
    return inTab.length ? [{ status: tab, entries: inTab }] : [];
  }, [filtered, sort, tab]);

  const filtersActive = hasActiveFilters(filters);
  const panelFilterCount = [filters.year, filters.season, filters.weekday, filters.release].filter(
    (value) => value !== null
  ).length;
  const editingEntry =
    editingId === null ? null : items.find((entry) => entry.id === editingId) ?? null;
  const name = owner.name?.trim() || "Anonymous";

  async function copyLink() {
    const url = `${window.location.origin}${myListPath(owner.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied! Anyone with the link can view your list.");
    } catch {
      toast.error(`Couldn't copy automatically. Your list's link is ${url}`);
    }
  }

  const header = (
    <header className="flex flex-wrap items-center gap-4 rounded-md border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] p-4">
      <OwnerAvatar owner={owner} name={name} />
      <div className="min-w-0 flex-1">
        <h1
          id={HEADING_ID}
          tabIndex={-1}
          className="truncate text-2xl font-bold focus:outline-none"
        >
          {name}&apos;s list
        </h1>
        <p className="text-sm text-[rgb(164,164,164)]">
          {items.length} {items.length === 1 ? "show" : "shows"}
          {isOwner && " · anyone with the link can view it, only you can edit it"}
        </p>
      </div>
      {isOwner && (
        <button type="button" onClick={copyLink} className={secondaryButton}>
          Copy link
        </button>
      )}
    </header>
  );

  if (items.length === 0) {
    return (
      <main className="flex flex-col gap-6 py-4 text-white">
        {header}
        <div className="rounded-md border border-dashed border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-6 py-12 text-center">
          {isOwner ? (
            <>
              <p className="text-lg font-semibold">Your list is empty… for now.</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[rgb(164,164,164)]">
                Find something to watch and add it with the list button on any anime card.
                It&apos;ll show up here with a countdown to its next episode.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/anime" className={primaryLink}>
                  Browse this season
                </Link>
                <Link href={searchPath()} className={`${secondaryButton} h-10 px-4`}>
                  Search anime
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">Nothing here yet</p>
              <p className="mt-2 text-sm text-[rgb(164,164,164)]">
                {name} hasn&apos;t added any anime to their list.
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 py-4 text-white">
      {header}

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <aside className="flex flex-col gap-5 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:w-56 md:shrink-0 md:overflow-y-auto md:pb-2">
          <nav aria-label="List status">
            <h2 className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-[rgb(164,164,164)] md:block">
              Lists
            </h2>
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 md:flex-col md:overflow-visible">
              {TABS.map((value) => {
                const selected = tab === value;
                return (
                  <li key={value} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTab(value)}
                      className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ${focusRing} ${
                        selected
                          ? "bg-blue-600 font-semibold text-white"
                          : "bg-[rgb(30,30,30)] text-[rgb(220,220,220)] hover:bg-[rgb(53,53,53)] md:bg-transparent"
                      }`}
                    >
                      {TAB_LABELS[value]}
                      <span
                        className={`rounded-full px-2 text-xs tabular-nums ${
                          selected ? "bg-black/25" : "bg-[rgb(53,53,53)]"
                        }`}
                      >
                        {counts[value]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section aria-labelledby="list-filters-heading" className="flex flex-col gap-3">
            <h2
              id="list-filters-heading"
              className="text-xs font-semibold uppercase tracking-wide text-[rgb(164,164,164)]"
            >
              <span className="hidden md:inline">Filters</span>
              <button
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="list-filters"
                onClick={() => setFiltersOpen((open) => !open)}
                className={`inline-flex items-center gap-2 rounded-md py-1 uppercase md:hidden ${focusRing}`}
              >
                Filters
                {panelFilterCount > 0 && (
                  <span className="rounded-full bg-blue-600 px-2 text-[11px] normal-case text-white">
                    {panelFilterCount} active
                  </span>
                )}
                <span aria-hidden="true">{filtersOpen ? "▴" : "▾"}</span>
              </button>
            </h2>
            <div
              id="list-filters"
              className={`${filtersOpen ? "flex" : "hidden"} flex-col gap-3 md:flex`}
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
                onChange={(value) =>
                  updateFilters({ release: isReleaseStatus(value) ? value : null })
                }
                options={[
                  { value: "", label: "Any status" },
                  ...RELEASE_STATUSES.map((status) => ({
                    value: status,
                    label: RELEASE_STATUS_LABELS[status],
                  })),
                ]}
              />
              {filtersActive && (
                <button type="button" onClick={clearFilters} className={secondaryButton}>
                  Clear filters
                </button>
              )}
            </div>
          </section>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="list-search" className="text-xs font-medium text-[rgb(164,164,164)]">
                Search this list
              </label>
              <input
                id="list-search"
                type="search"
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder="Title in English, romaji or Japanese"
                autoComplete="off"
                className={`${controlClass} placeholder:text-[rgb(110,110,110)]`}
              />
            </div>
            <div className="flex flex-col gap-1 sm:w-48">
              <label htmlFor="list-sort" className="text-xs font-medium text-[rgb(164,164,164)]">
                Sort by
              </label>
              <select
                id="list-sort"
                value={sort}
                onChange={(event) => {
                  if (isSortKey(event.target.value)) setSort(event.target.value);
                }}
                className={controlClass}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p aria-live="polite" className="text-sm text-[rgb(164,164,164)]">
            {filtersActive ? `${filtered.length} of ${items.length} shows match your filters.` : ""}
          </p>

          {sections.length === 0 ? (
            <div className="rounded-md border border-dashed border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-6 py-10 text-center">
              {filtersActive ? (
                <>
                  <p className="font-semibold">No shows match these filters.</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`${secondaryButton} mt-4`}
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <p className="font-semibold">Nothing in {TAB_LABELS[tab]} yet.</p>
              )}
            </div>
          ) : (
            sections.map((section) => (
              <section key={section.status} aria-labelledby={`section-${section.status}`}>
                <h2
                  id={`section-${section.status}`}
                  className="mb-3 flex items-baseline gap-2 border-b border-[rgb(53,53,53)] pb-1 text-lg font-semibold"
                >
                  {LIST_STATUS_LABELS[section.status]}
                  <span className="text-sm font-normal text-[rgb(164,164,164)]">
                    {section.entries.length}
                  </span>
                </h2>
                <ListGrid>
                  {section.entries.map((entry) => (
                    <ListCard
                      key={entry.id}
                      entry={entry}
                      isOwner={isOwner}
                      showStatus={tab === "all"}
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
