import type { ComponentType } from "react";
import { ListToggleAction, ListToggleFillAction } from "@/components/animev3/ListToggle";
import AnimeCard, { type AnimeCardAction, type AnimeGridCardProps } from "./AnimeCard";
import AnimeCardSkeleton from "./AnimeCardSkeleton";
import AnimeInfoCard from "./AnimeInfoCard";
import AnimeInfoCardSkeleton from "./AnimeInfoCardSkeleton";
import {
  ANIME_GRID,
  INFO_COVER_SIZES,
  INFO_GRID,
  LANDING_GRID_SIZES,
  SEASON_COVER_SIZES,
} from "./tokens";

/*
 * Which anime card the season page, /search and the landing's Magic Sense
 * use, in one place. "classic": the owner's original layout in the Tempest
 * theme (AnimeInfoCard). "poster": the Oct 2026 redesign (AnimeCard). The
 * Quest Log always uses the compact poster card (a 4-up picker inside quest
 * rows, not a demo of the season page).
 *
 * No "use client": the server-rendered /search pending skeleton imports it
 * (every class string here comes from tokens.ts, never from a client file).
 */

export type CardLayoutName = "classic" | "poster";

/**
 * A grid's column count per breakpoint, with the literal show/hide classes
 * for it (written out in full so Tailwind emits them).
 */
type Columns = readonly { cols: number; show: string; hide: string }[];
const CLASSIC_COLUMNS: Columns = [
  { cols: 1, show: "flex", hide: "hidden" },
  { cols: 2, show: "sm:flex", hide: "sm:hidden" },
  { cols: 3, show: "xl:flex", hide: "xl:hidden" },
];
const POSTER_COLUMNS: Columns = [
  { cols: 2, show: "flex", hide: "hidden" },
  { cols: 3, show: "sm:flex", hide: "sm:hidden" },
  { cols: 4, show: "lg:flex", hide: "lg:hidden" },
  { cols: 5, show: "xl:flex", hide: "xl:hidden" },
];

/**
 * The skeletons that fill the rest of the sentinel's row at every
 * breakpoint, given the grid cells before the sentinel (counted from the
 * last full-width row, e.g. the re-sort divider). Skeleton i shows where the
 * row still has more than i free cells.
 */
export function rowFill(columns: Columns, cellsBefore: number): string[] {
  const free = columns.map(({ cols }) => (cols - ((cellsBefore + 1) % cols)) % cols);
  const count = Math.max(0, ...free);
  return Array.from({ length: count }, (_, i) =>
    columns.map((bp, index) => (free[index] > i ? bp.show : bp.hide)).join(" ")
  );
}

/** ← The switch. */
export const ANIME_CARD_LAYOUT: CardLayoutName = "classic";

export interface CardLayout {
  Card: ComponentType<AnimeGridCardProps>;
  Skeleton: ComponentType;
  /** The season page's and /search's add control (cards and their details sheets). */
  Action: AnimeCardAction;
  /** The <ol>'s grid classes. */
  grid: string;
  seasonCoverSizes: string;
  searchCoverSizes: string;
  /** Cards (by index) whose covers load eagerly / with high priority. */
  eager: number;
  priority: number;
  /** "Waiting" skeleton <li> classes after the sentinel: the rest of its row at each breakpoint. */
  waitingSkeletons: (cellsBefore: number) => string[];
  /** The season end card's span; `fillsRow` = the phones' 2-column poster grid has a free cell. */
  endCardSpan: (fillsRow: boolean) => string;
  /** /search's pending skeletons. */
  searchSkeletons: number;
  /** The landing's Magic Sense grid (components/home/AiringGrid.tsx). */
  landing: {
    grid: string;
    /** Cards shown (the end card follows). */
    visible: number;
    /** Cards from this index on are hidden below 640px. */
    phoneLimit: number;
    coverSizes: string;
    actionSize: "block" | "fill";
  };
}

export const LAYOUTS: Record<CardLayoutName, CardLayout> = {
  classic: {
    Card: AnimeInfoCard,
    Skeleton: AnimeInfoCardSkeleton,
    Action: ListToggleFillAction,
    grid: INFO_GRID,
    seasonCoverSizes: INFO_COVER_SIZES,
    searchCoverSizes: INFO_COVER_SIZES,
    eager: 3,
    priority: 2,
    waitingSkeletons: (cellsBefore) => rowFill(CLASSIC_COLUMNS, cellsBefore),
    // Never col-span-2: in the 1-column phone grid that adds an implicit column (sideways scroll).
    endCardSpan: () => "col-span-1",
    searchSkeletons: 6,
    landing: {
      grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
      visible: 5,
      phoneLimit: 3,
      coverSizes: INFO_COVER_SIZES,
      actionSize: "fill",
    },
  },
  poster: {
    Card: AnimeCard,
    Skeleton: AnimeCardSkeleton,
    Action: ListToggleAction,
    grid: ANIME_GRID,
    seasonCoverSizes: SEASON_COVER_SIZES,
    // /search's grid sits in APP_CONTAINER, like the season grid.
    searchCoverSizes: SEASON_COVER_SIZES,
    eager: 5,
    priority: 2,
    waitingSkeletons: (cellsBefore) => rowFill(POSTER_COLUMNS, cellsBefore),
    endCardSpan: (fillsRow) => `sm:col-span-1 ${fillsRow ? "col-span-1" : "col-span-2"}`,
    searchSkeletons: 8,
    landing: {
      grid: "grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4",
      visible: 7,
      phoneLimit: 5,
      coverSizes: LANDING_GRID_SIZES,
      actionSize: "block",
    },
  },
};

export const CARD_LAYOUT: CardLayout = LAYOUTS[ANIME_CARD_LAYOUT];
